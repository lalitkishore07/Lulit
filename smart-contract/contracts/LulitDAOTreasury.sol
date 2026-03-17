// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LulitDAOTreasury is Ownable, ReentrancyGuard {
    struct TreasuryTx {
        address to;
        uint256 amount;
        uint256 timestamp;
    }

    TreasuryTx[] private _transactions;

    event DonationReceived(address indexed from, uint256 amount);
    event TreasuryReleased(address indexed to, uint256 amount);

    constructor(address governanceOwner) Ownable(governanceOwner) {}

    receive() external payable {
        emit DonationReceived(msg.sender, msg.value);
    }

    function release(address payable to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount required");
        require(address(this).balance >= amount, "Insufficient treasury balance");

        _transactions.push(TreasuryTx({
            to: to,
            amount: amount,
            timestamp: block.timestamp
        }));

        (bool ok,) = to.call{value: amount}("");
        require(ok, "Transfer failed");

        emit TreasuryReleased(to, amount);
    }

    function getTransactionsCount() external view returns (uint256) {
        return _transactions.length;
    }

    function getTransaction(uint256 index) external view returns (TreasuryTx memory) {
        require(index < _transactions.length, "Invalid tx index");
        return _transactions[index];
    }
}
