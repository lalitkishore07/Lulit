// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/Checkpoints.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface ILulitGovernanceToken {
    function getPastVotes(address account, uint256 timepoint) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract LulitDAO is Ownable, ReentrancyGuard {
    using Checkpoints for Checkpoints.Trace224;

    uint256 public constant BPS_DENOMINATOR = 10_000;

    enum ProposalType {
        FEATURE_UPDATE,
        CONTENT_MODERATION,
        TREASURY_SPENDING,
        ADMIN_ELECTION
    }

    enum VoteChoice {
        AGAINST,
        FOR,
        ABSTAIN
    }

    enum ProposalState {
        PENDING,
        ACTIVE,
        PASSED,
        REJECTED,
        EXECUTED
    }

    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        address proposer;
        address target;
        uint256 value;
        bytes callData;
        bytes32 metadataHash;
        uint64 startTime;
        uint64 endTime;
        uint64 snapshotBlock;
        uint64 executionTime;
        uint64 quorumBps;
        uint256 totalVotingPowerSnapshot;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
    }

    struct VoteReceipt {
        bool hasVoted;
        VoteChoice choice;
        uint256 weight;
    }

    ILulitGovernanceToken public immutable token;
    address public treasury;

    uint64 public votingDelay;
    uint64 public votingDuration;
    uint64 public executionTimelock;
    uint64 public minQuorumBps;
    uint64 public proposalThresholdBps;
    uint64 public maxVoterShareBps;
    uint64 public minStakeLockDuration;

    uint256 public proposalCount;

    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => mapping(address => VoteReceipt)) private _receipts;
    mapping(address => uint256) public stakedBalance;
    mapping(address => address) public delegatedTo;
    mapping(address => uint256) public stakeLockedUntil;
    mapping(address => uint256) public reputation;

    Checkpoints.Trace224 private _totalStakedCheckpoints;
    mapping(address => Checkpoints.Trace224) private _delegatedStakedCheckpoints;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType indexed proposalType,
        bytes32 metadataHash,
        uint64 startTime,
        uint64 endTime
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter, VoteChoice choice, uint256 weight);
    event ProposalFinalized(uint256 indexed proposalId, bool passed, uint64 executionTime);
    event ProposalExecuted(uint256 indexed proposalId, bytes executionResult);
    event Staked(address indexed account, uint256 amount);
    event Unstaked(address indexed account, uint256 amount);
    event Delegated(address indexed delegator, address indexed delegatee);
    event TreasuryUpdated(address indexed treasuryAddress);
    event GovernanceConfigUpdated();

    modifier validProposal(uint256 proposalId) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal id");
        _;
    }

    constructor(
        address tokenAddress,
        address treasuryAddress,
        address initialOwner
    ) Ownable(initialOwner) {
        require(tokenAddress != address(0), "Token required");
        require(treasuryAddress != address(0), "Treasury required");
        token = ILulitGovernanceToken(tokenAddress);
        treasury = treasuryAddress;
        votingDelay = 30 minutes;
        votingDuration = 3 days;
        executionTimelock = 12 hours;
        minQuorumBps = 2_000;
        proposalThresholdBps = 100;
        maxVoterShareBps = 2_500;
        minStakeLockDuration = 1 days;
    }

    function setConfig(
        uint64 votingDelaySeconds,
        uint64 votingDurationSeconds,
        uint64 executionTimelockSeconds,
        uint64 quorumBps,
        uint64 thresholdBps,
        uint64 voterCapBps,
        uint64 stakeLockSeconds
    ) external onlyOwner {
        require(votingDelaySeconds > 0, "Invalid delay");
        require(votingDurationSeconds >= 1 hours, "Voting too short");
        require(executionTimelockSeconds >= 5 minutes, "Timelock too short");
        require(quorumBps > 0 && quorumBps <= BPS_DENOMINATOR, "Invalid quorum");
        require(thresholdBps <= BPS_DENOMINATOR, "Invalid threshold");
        require(voterCapBps > 0 && voterCapBps <= BPS_DENOMINATOR, "Invalid cap");
        require(stakeLockSeconds >= 10 minutes, "Stake lock too short");

        votingDelay = votingDelaySeconds;
        votingDuration = votingDurationSeconds;
        executionTimelock = executionTimelockSeconds;
        minQuorumBps = quorumBps;
        proposalThresholdBps = thresholdBps;
        maxVoterShareBps = voterCapBps;
        minStakeLockDuration = stakeLockSeconds;

        emit GovernanceConfigUpdated();
    }

    function updateTreasury(address treasuryAddress) external onlyOwner {
        require(treasuryAddress != address(0), "Treasury required");
        treasury = treasuryAddress;
        emit TreasuryUpdated(treasuryAddress);
    }

    function delegate(address delegatee) external {
        address current = _effectiveDelegate(msg.sender);
        address target = delegatee == address(0) ? msg.sender : delegatee;
        if (current == target) return;

        delegatedTo[msg.sender] = target;
        _moveDelegatedStakedVotes(current, target, stakedBalance[msg.sender]);
        emit Delegated(msg.sender, target);
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount required");
        require(token.transferFrom(msg.sender, address(this), amount), "Stake transfer failed");

        stakedBalance[msg.sender] += amount;
        uint256 lockTo = block.timestamp + minStakeLockDuration;
        if (stakeLockedUntil[msg.sender] < lockTo) {
            stakeLockedUntil[msg.sender] = lockTo;
        }

        _writeCheckpoint(_totalStakedCheckpoints, _checkpointPlus(_totalStakedCheckpoints, amount));
        _moveDelegatedStakedVotes(address(0), _effectiveDelegate(msg.sender), amount);

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount required");
        require(stakedBalance[msg.sender] >= amount, "Insufficient stake");
        require(block.timestamp >= stakeLockedUntil[msg.sender], "Stake locked");

        stakedBalance[msg.sender] -= amount;
        _writeCheckpoint(_totalStakedCheckpoints, _checkpointMinus(_totalStakedCheckpoints, amount));
        _moveDelegatedStakedVotes(_effectiveDelegate(msg.sender), address(0), amount);

        require(token.transfer(msg.sender, amount), "Unstake transfer failed");
        emit Unstaked(msg.sender, amount);
    }

    function createProposal(
        ProposalType proposalType,
        bytes32 metadataHash,
        address target,
        uint256 value,
        bytes calldata callData
    ) external returns (uint256 proposalId) {
        require(metadataHash != bytes32(0), "Metadata hash required");
        require(target != address(0), "Target required");

        uint64 snapshotBlock = uint64(block.number > 0 ? block.number - 1 : block.number);
        uint256 proposerVotes = getVotingPowerAt(msg.sender, snapshotBlock);
        uint256 totalVotingPower = getTotalVotingPowerAt(snapshotBlock);
        require(totalVotingPower > 0, "No voting power");

        uint256 proposalThreshold = (totalVotingPower * proposalThresholdBps) / BPS_DENOMINATOR;
        require(proposerVotes >= proposalThreshold, "Proposer voting power too low");

        proposalCount++;
        proposalId = proposalCount;

        uint64 startTime = uint64(block.timestamp + votingDelay);
        uint64 endTime = startTime + votingDuration;

        _proposals[proposalId] = Proposal({
            id: proposalId,
            proposalType: proposalType,
            proposer: msg.sender,
            target: target,
            value: value,
            callData: callData,
            metadataHash: metadataHash,
            startTime: startTime,
            endTime: endTime,
            snapshotBlock: snapshotBlock,
            executionTime: 0,
            quorumBps: minQuorumBps,
            totalVotingPowerSnapshot: totalVotingPower,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            executed: false
        });

        reputation[msg.sender] += 2;
        emit ProposalCreated(proposalId, msg.sender, proposalType, metadataHash, startTime, endTime);
    }

    function castVote(uint256 proposalId, VoteChoice choice) external validProposal(proposalId) {
        Proposal storage proposal = _proposals[proposalId];
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp < proposal.endTime, "Voting ended");

        VoteReceipt storage receipt = _receipts[proposalId][msg.sender];
        require(!receipt.hasVoted, "Already voted");

        uint256 weight = getVotingPowerAt(msg.sender, proposal.snapshotBlock);
        require(weight > 0, "No voting power");

        uint256 voterCap = (proposal.totalVotingPowerSnapshot * maxVoterShareBps) / BPS_DENOMINATOR;
        if (weight > voterCap && voterCap > 0) {
            weight = voterCap;
        }

        receipt.hasVoted = true;
        receipt.choice = choice;
        receipt.weight = weight;

        if (choice == VoteChoice.FOR) {
            proposal.forVotes += weight;
            reputation[msg.sender] += 1;
        } else if (choice == VoteChoice.AGAINST) {
            proposal.againstVotes += weight;
        } else {
            proposal.abstainVotes += weight;
        }

        if (stakeLockedUntil[msg.sender] < proposal.endTime) {
            stakeLockedUntil[msg.sender] = proposal.endTime;
        }

        emit VoteCast(proposalId, msg.sender, choice, weight);
        _autoFinalizeAndExecuteIfPossible(proposalId);
    }

    function finalizeProposal(uint256 proposalId) external validProposal(proposalId) {
        _finalizeProposal(proposalId);
        _autoExecuteIfPossible(proposalId);
    }

    function executeProposal(uint256 proposalId) external nonReentrant validProposal(proposalId) {
        _executeProposal(proposalId);
    }

    function getProposal(uint256 proposalId) external view validProposal(proposalId) returns (Proposal memory) {
        return _proposals[proposalId];
    }

    function getProposalSummary(uint256 proposalId)
        external
        view
        validProposal(proposalId)
        returns (
            uint8 proposalType,
            address proposer,
            bytes32 metadataHash,
            uint64 startTime,
            uint64 endTime,
            uint64 snapshotBlock,
            uint64 executionTime,
            uint64 quorumBps,
            uint8 state,
            uint256 totalVotingPowerSnapshot,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 abstainVotes,
            bool executed
        )
    {
        Proposal storage p = _proposals[proposalId];
        return (
            uint8(p.proposalType),
            p.proposer,
            p.metadataHash,
            p.startTime,
            p.endTime,
            p.snapshotBlock,
            p.executionTime,
            p.quorumBps,
            uint8(getProposalState(proposalId)),
            p.totalVotingPowerSnapshot,
            p.forVotes,
            p.againstVotes,
            p.abstainVotes,
            p.executed
        );
    }

    function getVoteReceipt(uint256 proposalId, address voter)
        external
        view
        validProposal(proposalId)
        returns (VoteReceipt memory)
    {
        return _receipts[proposalId][voter];
    }

    function getProposalState(uint256 proposalId) public view validProposal(proposalId) returns (ProposalState) {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.executed) return ProposalState.EXECUTED;
        if (block.timestamp < proposal.startTime) return ProposalState.PENDING;
        if (block.timestamp < proposal.endTime) return ProposalState.ACTIVE;

        uint256 totalVotesCast = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 quorumVotes = (proposal.totalVotingPowerSnapshot * proposal.quorumBps) / BPS_DENOMINATOR;

        if (totalVotesCast < quorumVotes) return ProposalState.REJECTED;
        if (proposal.forVotes <= proposal.againstVotes) return ProposalState.REJECTED;
        return ProposalState.PASSED;
    }

    function getVotingPower(address account) external view returns (uint256) {
        uint256 blockRef = block.number > 0 ? block.number - 1 : block.number;
        return getVotingPowerAt(account, blockRef);
    }

    function getVotingPowerAt(address account, uint256 blockNumber) public view returns (uint256) {
        return token.getPastVotes(account, blockNumber) + _delegatedStakedCheckpoints[account].upperLookupRecent(uint32(blockNumber));
    }

    function getTotalVotingPower() external view returns (uint256) {
        uint256 blockRef = block.number > 0 ? block.number - 1 : block.number;
        return getTotalVotingPowerAt(blockRef);
    }

    function getTotalVotingPowerAt(uint256 blockNumber) public view returns (uint256) {
        // totalSupply() already includes staked tokens (held by this contract).
        // Staked tokens are NOT counted in anyone's ERC20Votes.getPastVotes,
        // but ARE tracked via _delegatedStakedCheckpoints (added in getVotingPowerAt).
        // So the total potential voting power is simply totalsupply.
        return token.totalSupply();
    }

    function _finalizeProposal(uint256 proposalId) internal {
        Proposal storage proposal = _proposals[proposalId];
        require(block.timestamp >= proposal.endTime, "Voting still active");
        require(proposal.executionTime == 0, "Proposal finalized");

        ProposalState state = getProposalState(proposalId);
        if (state == ProposalState.PASSED) {
            proposal.executionTime = uint64(block.timestamp + executionTimelock);
            emit ProposalFinalized(proposalId, true, proposal.executionTime);
        } else {
            emit ProposalFinalized(proposalId, false, 0);
        }
    }

    function _executeProposal(uint256 proposalId) internal {
        Proposal storage proposal = _proposals[proposalId];
        ProposalState state = getProposalState(proposalId);
        require(state == ProposalState.PASSED, "Proposal not passed");
        if (proposal.executionTime == 0) {
            _finalizeProposal(proposalId);
        }
        require(block.timestamp >= proposal.executionTime, "Timelock not elapsed");
        require(!proposal.executed, "Already executed");

        proposal.executed = true;
        (bool ok, bytes memory result) = proposal.target.call{value: proposal.value}(proposal.callData);
        require(ok, "Execution failed");
        emit ProposalExecuted(proposalId, result);
    }

    function _autoFinalizeAndExecuteIfPossible(uint256 proposalId) internal {
        Proposal storage proposal = _proposals[proposalId];
        if (block.timestamp >= proposal.endTime && proposal.executionTime == 0) {
            _finalizeProposal(proposalId);
        }
        _autoExecuteIfPossible(proposalId);
    }

    function _autoExecuteIfPossible(uint256 proposalId) internal {
        Proposal storage proposal = _proposals[proposalId];
        if (
            !proposal.executed &&
            proposal.executionTime > 0 &&
            block.timestamp >= proposal.executionTime &&
            getProposalState(proposalId) == ProposalState.PASSED
        ) {
            _executeProposal(proposalId);
        }
    }

    function _effectiveDelegate(address account) internal view returns (address) {
        address target = delegatedTo[account];
        return target == address(0) ? account : target;
    }

    function _moveDelegatedStakedVotes(address from, address to, uint256 amount) internal {
        if (amount == 0 || from == to) return;
        if (from != address(0)) {
            Checkpoints.Trace224 storage fromCkpt = _delegatedStakedCheckpoints[from];
            _writeCheckpoint(fromCkpt, _checkpointMinus(fromCkpt, amount));
        }
        if (to != address(0)) {
            Checkpoints.Trace224 storage toCkpt = _delegatedStakedCheckpoints[to];
            _writeCheckpoint(toCkpt, _checkpointPlus(toCkpt, amount));
        }
    }

    function _checkpointPlus(Checkpoints.Trace224 storage ckpt, uint256 amount) internal view returns (uint224) {
        return uint224(ckpt.latest() + amount);
    }

    function _checkpointMinus(Checkpoints.Trace224 storage ckpt, uint256 amount) internal view returns (uint224) {
        return uint224(ckpt.latest() - amount);
    }

    function _writeCheckpoint(Checkpoints.Trace224 storage ckpt, uint224 value) internal {
        ckpt.push(uint32(block.number), value);
    }
}
