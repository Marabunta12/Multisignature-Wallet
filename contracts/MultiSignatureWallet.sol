// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

error MultiSignatureWallet__OwnersRequired();
error MultiSignatureWallet__InvalidOwner();
error MultiSignatureWallet__NotUnigueOwner();
error MultiSignatureWallet__NotOwner();

contract MultiSignatureWallet {
    struct Transaction {
        address to;
        uint value;
        bool executed;
        uint numConfirmations;
    }

    address[] public i_owners;
    uint public i_approvalsNeeded;
    mapping(address => bool) s_isOwner;
    Transaction[] public s_transactions;
    mapping(uint => mapping(address => bool)) s_approvedTransactions;

    event DepositFunds(address indexed sender, uint amount);
    event SubmitTransaction(uint indexed transactionId);
    event ApproveTransaction(address indexed owner, uint indexed transactionId);
    event RevokeApproval(address indexed owner, uint indexed transactionId);
    event ExecuteTransaction(uint indexed transactionId);

    modifier onlyOwner() {
        if (s_isOwner[msg.sender] == false)
            revert MultiSignatureWallet__NotOwner();
        _;
    }

    modifier transactionExists(uint _transactionId) {
        _;
    }
    modifier notApproved(uint _transactionId) {
        _;
    }
    modifier notExecuted(uint _transactionId) {
        _;
    }

    constructor(address[] memory _owners) {
        if (_owners.length < 1) revert MultiSignatureWallet__OwnersRequired();

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            if (owner == address(0))
                revert MultiSignatureWallet__InvalidOwner();
            if (s_isOwner[owner]) revert MultiSignatureWallet__NotUnigueOwner();

            s_isOwner[owner] = true;
            i_owners.push(owner);
        }

        i_approvalsNeeded = _owners.length;
    }

    receive() external payable {
        emit DepositFunds(msg.sender, msg.value);
    }

    function submitTransaction(address _to, uint _value) external onlyOwner {
        s_transactions.push(
            Transaction({
                to: _to,
                value: _value,
                executed: false,
                numConfirmations: 0
            })
        );
        emit SubmitTransaction(s_transactions.length - 1);
    }

    function approveTransaction(
        uint _transactionId
    )
        external
        onlyOwner
        transactionExists(_transactionId)
        notApproved(_transactionId)
        notExecuted(_transactionId)
    {}
}
