// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

error MultiSignatureWallet__OwnersRequired();
error MultiSignatureWallet__InvalidOwner();
error MultiSignatureWallet__NotUnigueOwner();
error MultiSignatureWallet__NotOwner();
error MultiSignatureWallet__TransactionDoesNotExist();
error MultiSignatureWallet__AlreadtApproved();
error MultiSignatureWallet__NotApproved();
error MultiSignatureWallet__AlreadyExecuted();
error MultiSignatureWallet__NotEnoughApprovals();
error MultiSignatureWallet__FailedToSendETH();

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
        if (_transactionId >= s_transactions.length)
            revert MultiSignatureWallet__TransactionDoesNotExist();
        _;
    }
    modifier notApproved(uint _transactionId) {
        if (s_approvedTransactions[_transactionId][msg.sender] == true)
            revert MultiSignatureWallet__AlreadtApproved();
        _;
    }

    modifier approved(uint _transactionId) {
        if (s_approvedTransactions[_transactionId][msg.sender] == false)
            revert MultiSignatureWallet__NotApproved();
        _;
    }

    modifier notExecuted(uint _transactionId) {
        if (s_transactions[_transactionId].executed == true)
            revert MultiSignatureWallet__AlreadyExecuted();
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
    {
        s_approvedTransactions[_transactionId][msg.sender] = true;
        s_transactions[_transactionId].numConfirmations++;
        emit ApproveTransaction(msg.sender, _transactionId);
    }

    function revokeApproval(
        uint _transactionId
    )
        external
        onlyOwner
        transactionExists(_transactionId)
        approved(_transactionId)
        notExecuted(_transactionId)
    {
        s_approvedTransactions[_transactionId][msg.sender] = false;
        s_transactions[_transactionId].numConfirmations--;
        emit RevokeApproval(msg.sender, _transactionId);
    }

    function executeTransaction(
        uint _transactionId
    )
        external
        onlyOwner
        transactionExists(_transactionId)
        notExecuted(_transactionId)
    {
        if (s_transactions[_transactionId].numConfirmations < i_approvalsNeeded)
            revert MultiSignatureWallet__NotEnoughApprovals();
        s_transactions[_transactionId].executed = true;
        (bool success, ) = s_transactions[_transactionId].to.call{
            value: s_transactions[_transactionId].value
        }("");
        if (success == false) revert MultiSignatureWallet__FailedToSendETH();
        emit ExecuteTransaction(_transactionId);
    }

    function isOwner(address _address) external view returns (bool) {
        return s_isOwner[_address];
    }

    function getOwners() external view returns (address[] memory) {
        return i_owners;
    }

    function getTransaction(
        uint _transactionId
    ) external view returns (Transaction memory) {
        return s_transactions[_transactionId];
    }
}
