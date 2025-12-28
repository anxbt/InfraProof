// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ExecutionRegistry
 * @notice Minimal on-chain registry for DePIN execution receipts
 * @dev This contract is a pure data anchor. It does NOT:
 *      - Coordinate execution
 *      - Validate results
 *      - Manage payments
 *      - Enforce access control
 *      Blockchain is the source of truth for WHAT was requested and WHAT was claimed.
 *      Verification happens off-chain.
 */
contract ExecutionRegistry {
    /// @notice Task specification recorded on-chain
    struct Task {
        address requester;
        bytes32 specHash;
        uint256 createdAt;
    }

    /// @notice Execution receipt proving work completion
    struct Receipt {
        address operator;
        bytes32 artifactHash;
        bytes32 resultHash;
        uint256 completedAt;
    }

    /// @notice Auto-incrementing task counter
    uint256 public nextTaskId;

    /// @notice Task registry: taskId => Task
    mapping(uint256 => Task) public tasks;

    /// @notice Receipt registry: taskId => Receipt
    mapping(uint256 => Receipt) public receipts;

    /// @notice Emitted when a new task is created
    event TaskCreated(
        uint256 indexed taskId,
        address indexed requester,
        bytes32 specHash
    );

    /// @notice Emitted when an execution receipt is submitted
    event ReceiptSubmitted(
        uint256 indexed taskId,
        address indexed operator,
        bytes32 artifactHash,
        bytes32 resultHash
    );

    /**
     * @notice Create a new execution task
     * @param specHash keccak256 hash of task specification
     * @return taskId Unique identifier for the created task
     */
    function createTask(bytes32 specHash) external returns (uint256) {
        require(specHash != bytes32(0), "Spec hash cannot be zero");

        uint256 taskId = nextTaskId++;

        tasks[taskId] = Task({
            requester: msg.sender,
            specHash: specHash,
            createdAt: block.timestamp
        });

        emit TaskCreated(taskId, msg.sender, specHash);

        return taskId;
    }

    /**
     * @notice Submit execution receipt for a task
     * @dev Permissionless - any operator can submit receipt for any task
     * @param taskId Task identifier
     * @param artifactHash keccak256 hash of execution artifacts
     * @param resultHash keccak256 hash of execution result
     */
    function submitReceipt(
        uint256 taskId,
        bytes32 artifactHash,
        bytes32 resultHash
    ) external {
        require(tasks[taskId].requester != address(0), "Task does not exist");
        require(receipts[taskId].operator == address(0), "Receipt already submitted");
        require(artifactHash != bytes32(0), "Artifact hash cannot be zero");
        require(resultHash != bytes32(0), "Result hash cannot be zero");

        receipts[taskId] = Receipt({
            operator: msg.sender,
            artifactHash: artifactHash,
            resultHash: resultHash,
            completedAt: block.timestamp
        });

        emit ReceiptSubmitted(taskId, msg.sender, artifactHash, resultHash);
    }
}
