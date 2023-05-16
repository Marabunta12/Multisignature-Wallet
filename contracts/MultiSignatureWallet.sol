// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract MultiSignatureWallet {
    struct Transaction {
        address to;
        uint value;
        bool executed;
    }

    address[] public i_owners;
    uint public i_approvalsNeeded;
    Transaction[] public s_transactions;
    mapping(uint => mapping(address => bool)) s_approvedTransactions;

    event DepositFunds(address indexed sender, uint amount);
    event SubmitTransaction(uint indexed transactionId);
    event ApproveTransaction(address indexed owner, uint indexed transactionId);
    event RevokeApproval(address indexed owner, uint indexed transactionId);
    event ExecuteTransaction(uint indexed transactionId);

    constructor(address[] memory _owners) {
        i_owners = _owners;
        i_approvalsNeeded = _owners.length;
    }
}
