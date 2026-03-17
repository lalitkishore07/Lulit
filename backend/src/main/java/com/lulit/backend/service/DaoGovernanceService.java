package com.lulit.backend.service;

import com.lulit.backend.dto.dao.DaoAuthVerifyRequestDto;
import com.lulit.backend.dto.dao.DaoAuthVerifyResponseDto;
import com.lulit.backend.dto.dao.DaoCastVoteRequestDto;
import com.lulit.backend.dto.dao.DaoCreateProposalRequestDto;
import com.lulit.backend.dto.dao.DaoEligibilityDto;
import com.lulit.backend.dto.dao.DaoMetadataRequestDto;
import com.lulit.backend.dto.dao.DaoMetadataResponseDto;
import com.lulit.backend.dto.dao.DaoNonceRequestDto;
import com.lulit.backend.dto.dao.DaoNonceResponseDto;
import com.lulit.backend.dto.dao.DaoProposalDto;
import com.lulit.backend.dto.dao.DaoVoteResultsDto;
import com.lulit.backend.entity.dao.DaoExecutionStatus;
import com.lulit.backend.entity.dao.DaoNoncePurpose;
import com.lulit.backend.entity.dao.DaoProposal;
import com.lulit.backend.entity.dao.DaoProposalState;
import com.lulit.backend.entity.dao.DaoSignatureNonce;
import com.lulit.backend.entity.dao.DaoVote;
import com.lulit.backend.entity.dao.DaoVoteChoice;
import com.lulit.backend.entity.dao.DaoVotingStrategy;
import com.lulit.backend.entity.dao.DaoWalletProfile;
import com.lulit.backend.exception.ApiException;
import com.lulit.backend.repository.dao.DaoProposalRepository;
import com.lulit.backend.repository.dao.DaoSignatureNonceRepository;
import com.lulit.backend.repository.dao.DaoVoteRepository;
import com.lulit.backend.repository.dao.DaoWalletProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.EthCall;
import org.web3j.protocol.http.HttpService;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DaoGovernanceService {

    private static final MathContext MC = new MathContext(20, RoundingMode.HALF_UP);
    private static final BigDecimal ONE_ETHER = new BigDecimal("1000000000000000000");

    private final PinataService pinataService;
    private final WalletSignatureService walletSignatureService;
    private final DaoProposalRepository proposalRepository;
    private final DaoVoteRepository voteRepository;
    private final DaoSignatureNonceRepository nonceRepository;
    private final DaoWalletProfileRepository walletProfileRepository;
    private final DaoRealtimeGateway realtimeGateway;

    @Value("${app.dao.enabled:false}")
    private boolean daoEnabled;

    @Value("${app.dao.rpc-url:}")
    private String daoRpcUrl;

    @Value("${app.dao.token-address:}")
    private String tokenAddress;

    @Value("${app.dao.ipfs-gateway:https://gateway.pinata.cloud/ipfs}")
    private String daoIpfsGateway;

    @Value("${app.dao.nonce-ttl-seconds:300}")
    private long nonceTtlSeconds;

    @Value("${app.dao.default-quorum-bps:2000}")
    private int defaultQuorumBps;

    public DaoMetadataResponseDto createProposalMetadata(DaoMetadataRequestDto requestDto) {
        ensureDaoEnabled();
        Map<String, Object> payload = new HashMap<>();
        payload.put("title", requestDto.title().trim());
        payload.put("description", requestDto.description().trim());
        payload.put("proposalType", requestDto.proposalType().trim());
        payload.put("payload", requestDto.payload());
        payload.put("createdAt", Instant.now().toString());

        String hash = pinataService.uploadJsonToIpfs(payload);
        return new DaoMetadataResponseDto(hash, daoIpfsGateway + "/" + hash);
    }

    @Transactional
    public DaoNonceResponseDto createNonceChallenge(DaoNonceRequestDto request) {
        ensureDaoEnabled();
        String wallet = walletSignatureService.normalizeWallet(request.wallet());
        String nonce = UUID.randomUUID().toString().replace("-", "");
        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(nonceTtlSeconds);
        long expiresEpoch = expiresAt.toEpochSecond(ZoneOffset.UTC);
        long proposalId = request.proposalId() == null ? -1 : request.proposalId();
        String choice = request.choice() == null ? "-" : request.choice().trim().toUpperCase();

        String message = String.format(
                "LULIT DAO %s%nWallet: %s%nNonce: %s%nExpiresAt: %d%nProposalId: %d%nChoice: %s",
                request.purpose().name(),
                wallet,
                nonce,
                expiresEpoch,
                proposalId,
                choice
        );

        DaoSignatureNonce model = new DaoSignatureNonce();
        model.setWallet(wallet);
        model.setPurpose(request.purpose());
        model.setNonceValue(nonce);
        model.setMessage(message);
        model.setExpiresAt(expiresAt);
        nonceRepository.save(model);

        return new DaoNonceResponseDto(nonce, message, expiresEpoch);
    }

    @Transactional
    public DaoAuthVerifyResponseDto verifyAuth(DaoAuthVerifyRequestDto requestDto) {
        ensureDaoEnabled();
        String wallet = walletSignatureService.normalizeWallet(requestDto.wallet());
        verifyAndConsumeNonce(wallet, DaoNoncePurpose.AUTH, requestDto.nonce(), requestDto.signature());
        walletProfile(wallet);
        return new DaoAuthVerifyResponseDto(wallet, true);
    }

    @Transactional
    public DaoProposalDto createProposal(DaoCreateProposalRequestDto requestDto) {
        ensureDaoEnabled();
        String wallet = walletSignatureService.normalizeWallet(requestDto.wallet());
        verifyAndConsumeNonce(wallet, DaoNoncePurpose.CREATE_PROPOSAL, requestDto.nonce(), requestDto.signature());

        if (requestDto.endTimeEpochSecond() <= requestDto.startTimeEpochSecond()) {
            throw new ApiException("Proposal end time must be after start time");
        }

        LocalDateTime startTime = LocalDateTime.ofEpochSecond(requestDto.startTimeEpochSecond(), 0, ZoneOffset.UTC);
        LocalDateTime endTime = LocalDateTime.ofEpochSecond(requestDto.endTimeEpochSecond(), 0, ZoneOffset.UTC);

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("title", requestDto.title().trim());
        metadata.put("description", requestDto.description().trim());
        metadata.put("proposalType", requestDto.proposalType().name());
        metadata.put("votingStrategy", requestDto.votingStrategy().name());
        metadata.put("creatorWallet", wallet);
        metadata.put("startTimeEpoch", requestDto.startTimeEpochSecond());
        metadata.put("endTimeEpoch", requestDto.endTimeEpochSecond());
        metadata.put("snapshotBlock", requestDto.snapshotBlock());
        metadata.put("createdAt", Instant.now().toString());

        String metadataHash = pinataService.uploadJsonToIpfs(metadata);

        DaoProposal proposal = new DaoProposal();
        proposal.setTitle(requestDto.title().trim());
        proposal.setDescription(requestDto.description().trim());
        proposal.setCreatorWallet(wallet);
        proposal.setProposalType(requestDto.proposalType());
        proposal.setVotingStrategy(requestDto.votingStrategy());
        proposal.setMetadataHash(metadataHash);
        proposal.setMetadataUrl(daoIpfsGateway + "/" + metadataHash);
        proposal.setSnapshotBlock(requestDto.snapshotBlock());
        proposal.setStartTime(startTime);
        proposal.setEndTime(endTime);
        proposal.setQuorumBps(requestDto.quorumBps() == null ? defaultQuorumBps : requestDto.quorumBps());
        proposal.setState(resolveStateByTime(startTime, endTime, LocalDateTime.now()));
        proposal.setExecutionStatus(DaoExecutionStatus.NONE);

        DaoProposal saved = proposalRepository.save(proposal);
        realtimeGateway.publish("proposal_created", saved.getId());
        return toDto(saved);
    }

    @Transactional
    public DaoProposalDto castVote(Long proposalId, DaoCastVoteRequestDto requestDto) {
        ensureDaoEnabled();
        DaoProposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new ApiException("Proposal not found"));

        updateStateIfNeeded(proposal);
        if (proposal.getState() != DaoProposalState.ACTIVE) {
            throw new ApiException("Voting is closed for this proposal");
        }

        String wallet = walletSignatureService.normalizeWallet(requestDto.wallet());
        verifyAndConsumeNonce(wallet, DaoNoncePurpose.CAST_VOTE, requestDto.nonce(), requestDto.signature());

        DaoWalletProfile profile = walletProfile(wallet);
        if (profile.isSybilBlocked()) {
            throw new ApiException("Wallet is blocked by anti-sybil policy");
        }

        if (voteRepository.findByProposalAndVoterWallet(proposal, wallet).isPresent()) {
            throw new ApiException("Wallet has already voted on this proposal");
        }

        BigDecimal weight = calculateVotingPower(wallet, profile, proposal);
        if (weight.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException("Voting power is zero");
        }

        DaoVote vote = new DaoVote();
        vote.setProposal(proposal);
        vote.setVoterWallet(wallet);
        vote.setChoice(requestDto.choice());
        vote.setVotingPower(weight);
        vote.setSignature(requestDto.signature());
        voteRepository.save(vote);

        if (requestDto.choice() == DaoVoteChoice.FOR) {
            proposal.setForVotes(proposal.getForVotes().add(weight));
        } else if (requestDto.choice() == DaoVoteChoice.AGAINST) {
            proposal.setAgainstVotes(proposal.getAgainstVotes().add(weight));
        } else {
            proposal.setAbstainVotes(proposal.getAbstainVotes().add(weight));
        }

        proposalRepository.save(proposal);
        updateStateIfNeeded(proposal);
        realtimeGateway.publish("vote_cast", proposalId);
        return toDto(proposal);
    }

    @Transactional
    public List<DaoProposalDto> getActiveProposals() {
        ensureDaoEnabled();
        List<DaoProposal> candidates = proposalRepository.findByStateInOrderByIdDesc(
                List.of(DaoProposalState.PENDING, DaoProposalState.ACTIVE)
        );
        candidates.forEach(this::updateStateIfNeeded);
        return candidates.stream()
                .filter(p -> p.getState() == DaoProposalState.PENDING || p.getState() == DaoProposalState.ACTIVE)
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public DaoProposalDto getProposalById(Long proposalId) {
        ensureDaoEnabled();
        DaoProposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new ApiException("Proposal not found"));
        updateStateIfNeeded(proposal);
        return toDto(proposal);
    }

    @Transactional
    public DaoVoteResultsDto getVotingResults(Long proposalId) {
        DaoProposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new ApiException("Proposal not found"));
        updateStateIfNeeded(proposal);

        BigDecimal totalVotes = proposal.getForVotes().add(proposal.getAgainstVotes()).add(proposal.getAbstainVotes());
        BigDecimal quorumRequired = getQuorumRequired(proposal);

        return new DaoVoteResultsDto(
                proposal.getId(),
                proposal.getForVotes(),
                proposal.getAgainstVotes(),
                proposal.getAbstainVotes(),
                totalVotes,
                quorumRequired,
                proposal.getState()
        );
    }

    public DaoEligibilityDto getVotingEligibility(String walletAddress) {
        ensureDaoEnabled();
        String wallet = walletSignatureService.normalizeWallet(walletAddress);
        DaoWalletProfile profile = walletProfile(wallet);
        BigDecimal tokenBalance = fetchTokenBalance(wallet, null);
        BigDecimal reputation = BigDecimal.valueOf(profile.getReputationScore());
        BigDecimal staking = profile.getStakingWeight();
        BigDecimal votingPower = reputation.multiply(staking, MC).add(tokenBalance);

        return new DaoEligibilityDto(
                wallet,
                tokenBalance,
                reputation,
                staking,
                votingPower.max(BigDecimal.ONE),
                !profile.isSybilBlocked()
        );
    }

    private void verifyAndConsumeNonce(String wallet, DaoNoncePurpose purpose, String nonceValue, String signature) {
        DaoSignatureNonce nonce = nonceRepository.findByWalletAndNonceValue(wallet, nonceValue)
                .orElseThrow(() -> new ApiException("Nonce not found"));

        if (nonce.isUsed()) {
            throw new ApiException("Nonce already used");
        }
        if (nonce.getPurpose() != purpose) {
            throw new ApiException("Nonce purpose mismatch");
        }
        if (nonce.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException("Nonce expired");
        }

        walletSignatureService.verifyPersonalSignature(wallet, nonce.getMessage(), signature);
        nonce.setUsed(true);
        nonceRepository.save(nonce);
    }

    private DaoProposalState resolveStateByTime(LocalDateTime startTime, LocalDateTime endTime, LocalDateTime now) {
        if (now.isBefore(startTime)) {
            return DaoProposalState.PENDING;
        }
        if (now.isAfter(endTime)) {
            return DaoProposalState.REJECTED;
        }
        return DaoProposalState.ACTIVE;
    }

    private void updateStateIfNeeded(DaoProposal proposal) {
        LocalDateTime now = LocalDateTime.now();
        DaoProposalState original = proposal.getState();
        if (now.isBefore(proposal.getStartTime())) {
            proposal.setState(DaoProposalState.PENDING);
        } else if (!now.isAfter(proposal.getEndTime())) {
            proposal.setState(DaoProposalState.ACTIVE);
        } else {
            BigDecimal totalVotes = proposal.getForVotes().add(proposal.getAgainstVotes()).add(proposal.getAbstainVotes());
            BigDecimal quorumRequired = getQuorumRequired(proposal);
            boolean quorumMet = totalVotes.compareTo(quorumRequired) >= 0;
            boolean majorityMet = proposal.getForVotes().compareTo(proposal.getAgainstVotes()) > 0;
            if (quorumMet && majorityMet) {
                proposal.setState(DaoProposalState.PASSED);
                if (proposal.getExecutionStatus() == DaoExecutionStatus.NONE) {
                    proposal.setExecutionStatus(DaoExecutionStatus.PENDING_ACTION);
                }
            } else {
                proposal.setState(DaoProposalState.REJECTED);
            }
        }

        if (proposal.getState() != original) {
            proposalRepository.save(proposal);
            realtimeGateway.publish("proposal_state_changed", proposal.getId());
        }
    }

    private BigDecimal getQuorumRequired(DaoProposal proposal) {
        BigDecimal totalPotential = estimatedTotalVotingPower(proposal);
        return totalPotential.multiply(BigDecimal.valueOf(proposal.getQuorumBps()), MC)
                .divide(BigDecimal.valueOf(10_000), MC);
    }

    private BigDecimal estimatedTotalVotingPower(DaoProposal proposal) {
        long profiles = walletProfileRepository.count();
        if (profiles <= 0) {
            profiles = 1;
        }
        if (proposal.getVotingStrategy() == DaoVotingStrategy.REPUTATION_BASED) {
            return walletProfileRepository.findAll().stream()
                    .map(p -> BigDecimal.valueOf(p.getReputationScore()).multiply(p.getStakingWeight(), MC))
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .max(BigDecimal.ONE);
        }
        return BigDecimal.valueOf(profiles);
    }

    private BigDecimal calculateVotingPower(String wallet, DaoWalletProfile profile, DaoProposal proposal) {
        BigDecimal reputation = BigDecimal.valueOf(profile.getReputationScore());
        BigDecimal stake = profile.getStakingWeight();
        BigDecimal token = fetchTokenBalance(wallet, proposal.getSnapshotBlock());

        return switch (proposal.getVotingStrategy()) {
            case ONE_WALLET_ONE_VOTE -> BigDecimal.ONE;
            case TOKEN_WEIGHTED -> token.max(BigDecimal.ONE);
            case REPUTATION_BASED -> reputation.multiply(stake, MC).max(BigDecimal.ONE);
            case QUADRATIC -> sqrt(token.add(reputation.multiply(BigDecimal.TEN, MC), MC)).max(BigDecimal.ONE);
        };
    }

    private BigDecimal fetchTokenBalance(String wallet, Long snapshotBlock) {
        String rpc = daoRpcUrl == null ? "" : daoRpcUrl.trim();
        String token = tokenAddress == null ? "" : tokenAddress.trim();
        if (rpc.isBlank() || token.isBlank()) {
            return BigDecimal.ZERO;
        }

        if (!token.matches("^0x[0-9a-fA-F]{40}$")) {
            throw new ApiException("Invalid DAO token address format");
        }

        Web3j web3j = Web3j.build(new HttpService(rpc));
        try {
            Function fn = new Function(
                    "balanceOf",
                    List.of(new Address(wallet)),
                    List.of(new TypeReference<Uint256>() {})
            );
            String encoded = FunctionEncoder.encode(fn);
            EthCall response = web3j.ethCall(
                    Transaction.createEthCallTransaction(null, token, encoded),
                    snapshotBlock == null ? DefaultBlockParameter.valueOf("latest") : DefaultBlockParameter.valueOf(BigInteger.valueOf(snapshotBlock))
            ).send();

            if (response.hasError()) {
                return BigDecimal.ZERO;
            }
            List<Type> decoded = FunctionReturnDecoder.decode(response.getValue(), fn.getOutputParameters());
            if (decoded.isEmpty()) {
                return BigDecimal.ZERO;
            }
            BigInteger wei = (BigInteger) decoded.get(0).getValue();
            return new BigDecimal(wei).divide(ONE_ETHER, 6, RoundingMode.DOWN);
        } catch (Exception ex) {
            return BigDecimal.ZERO;
        } finally {
            web3j.shutdown();
        }
    }

    private DaoWalletProfile walletProfile(String wallet) {
        return walletProfileRepository.findByWallet(wallet)
                .orElseGet(() -> {
                    DaoWalletProfile profile = new DaoWalletProfile();
                    profile.setWallet(wallet);
                    return walletProfileRepository.save(profile);
                });
    }

    private DaoProposalDto toDto(DaoProposal proposal) {
        BigDecimal totalVotes = proposal.getForVotes().add(proposal.getAgainstVotes()).add(proposal.getAbstainVotes());
        return new DaoProposalDto(
                proposal.getId(),
                proposal.getTitle(),
                proposal.getDescription(),
                proposal.getCreatorWallet(),
                proposal.getProposalType(),
                proposal.getVotingStrategy(),
                proposal.getMetadataHash(),
                proposal.getMetadataUrl(),
                proposal.getStartTime().toEpochSecond(ZoneOffset.UTC),
                proposal.getEndTime().toEpochSecond(ZoneOffset.UTC),
                proposal.getState(),
                proposal.getQuorumBps(),
                proposal.getForVotes(),
                proposal.getAgainstVotes(),
                proposal.getAbstainVotes(),
                totalVotes,
                proposal.getExecutionStatus()
        );
    }

    private BigDecimal sqrt(BigDecimal value) {
        if (value.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal x = new BigDecimal(Math.sqrt(value.doubleValue()));
        return x.setScale(6, RoundingMode.DOWN);
    }

    private void ensureDaoEnabled() {
        if (!daoEnabled) {
            throw new ApiException("DAO module is disabled");
        }
    }
}
