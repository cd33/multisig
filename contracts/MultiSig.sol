// SPDX-License-Identifier: MIT
pragma solidity 0.8.17; // 0.8.9

contract MultiSig {
    struct Transaction {
        address to;
        uint value;
        uint nbConfirmations;
        bytes data;
        bool executed;
    }

    address[] owners;
    uint public nbConfirmationsRequired;
    Transaction[] public transactions;
    mapping(address => bool) public isOwner;
    mapping(uint => mapping(address => bool)) public isApproved;

    event Deposit(address indexed sender, uint amount);
    event Submit(uint indexed txId);
    event Approve(address indexed owner, uint txId);
    event Revoke(address indexed owner, uint txId);
    event Execute(uint indexed txId);

    constructor(address[] memory _owners, uint _nbConfirmationsRequired) {
        require(_owners.length > 0, "Owners required");
        require(_nbConfirmationsRequired > 0 && _nbConfirmationsRequired <= _owners.length, "Wrong number");

        for(uint i; i < _owners.length; ++i) {
            require(_owners[i] != address(0), "Address Zero");
            require(!isOwner[_owners[i]], "Duplicated address");
            isOwner[_owners[i]] = true;
            owners.push(_owners[i]);
        }
        nbConfirmationsRequired = _nbConfirmationsRequired;
    }

    modifier onlyOwner {
        require(isOwner[msg.sender], "Not Owner");
        _;
    }

    modifier txExists(uint _txId) {
        require(_txId < transactions.length, "Tx doesn't exist");
        _;
    }
    
    modifier notApproved(uint _txId) {
        require(!isApproved[_txId][msg.sender], "Tx already approved");
        _;
    }

    modifier notExecuted(uint _txId) {
        require(!transactions[_txId].executed, "Tx already executed");
        _;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function submit(address _to, uint _value, bytes calldata _data) external onlyOwner {
        require(address(this).balance >= _value, "Not enough funds");
        transactions.push(Transaction({
            to: _to,
            value: _value,
            nbConfirmations: 0,
            data: _data,
            executed: false
        }));
        emit Submit(transactions.length - 1);
    }

    function approve(uint _txId) external onlyOwner txExists(_txId) notApproved(_txId) notExecuted(_txId) {
        transactions[_txId].nbConfirmations += 1;
        isApproved[_txId][msg.sender] = true;
        emit Approve(msg.sender, _txId);
    }

    function revoke(uint _txId) external onlyOwner txExists(_txId) notExecuted(_txId) {
        require(isApproved[_txId][msg.sender], "Tx not approved");
        transactions[_txId].nbConfirmations -= 1;
        isApproved[_txId][msg.sender] = false;
        emit Revoke(msg.sender, _txId);
    }

    function execute(uint _txId) external txExists(_txId) notExecuted(_txId) {
        Transaction storage transaction = transactions[_txId];
        require(
            transaction.nbConfirmations >= nbConfirmationsRequired,
            "Not enough approvals"
        );
        transaction.executed = true;
        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "Tx failed");
        emit Execute(_txId);
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function getTransaction(
        uint _txIndex
    )
        external
        view
        returns (
            address to,
            uint value,
            uint nbConfirmations,
            bytes memory data,
            bool executed
        )
    {
        Transaction memory transaction = transactions[_txIndex];
        return (
            transaction.to,
            transaction.value,
            transaction.nbConfirmations,
            transaction.data,
            transaction.executed
        );
    }

    function getTransactionCount() external view returns (uint) {
        return transactions.length;
    }
}
