// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/ExecutionRegistry.sol";

/**
 * @title ExecutionRegistry Tests
 * @notice Comprehensive test suite for ExecutionRegistry contract
 */
contract ExecutionRegistryTest is Test {
    ExecutionRegistry public registry;

    address public requester = address(0x1);
    address public operator = address(0x2);

    bytes32 public specHash = keccak256("SERVER_BENCHMARK");
    bytes32 public artifactHash = keccak256("artifact_data");
    bytes32 public resultHash = keccak256("result_data");

    // Events for testing (must match ExecutionRegistry events)
    event TaskCreated(
        uint256 indexed taskId,
        address indexed requester,
        bytes32 specHash
    );

    event ReceiptSubmitted(
        uint256 indexed taskId,
        address indexed operator,
        bytes32 artifactHash,
        bytes32 resultHash
    );

    function setUp() public {
        registry = new ExecutionRegistry();
    }

    /**
     * Test: Create Task
     * Verifies:
     * - Task is created with correct data
     * - taskId increments properly
     * - TaskCreated event is emitted
     * - Task is stored correctly
     */
    function testCreateTask() public {
        vm.startPrank(requester);

        // Expect TaskCreated event
        vm.expectEmit(true, true, false, true);
        emit TaskCreated(0, requester, specHash);

        uint256 taskId = registry.createTask(specHash);

        // Verify taskId
        assertEq(taskId, 0, "First task should have ID 0");

        // Verify task data
        (
            address storedRequester,
            bytes32 storedSpecHash,
            uint256 createdAt
        ) = registry.tasks(taskId);
        assertEq(storedRequester, requester, "Requester should match");
        assertEq(storedSpecHash, specHash, "Spec hash should match");
        assertGt(createdAt, 0, "Created timestamp should be set");

        // Verify nextTaskId incremented
        assertEq(registry.nextTaskId(), 1, "Next task ID should be 1");

        vm.stopPrank();
    }

    /**
     * Test: Create Multiple Tasks
     * Verifies task ID increments correctly
     */
    function testCreateMultipleTasks() public {
        vm.startPrank(requester);

        uint256 taskId1 = registry.createTask(keccak256("task1"));
        uint256 taskId2 = registry.createTask(keccak256("task2"));
        uint256 taskId3 = registry.createTask(keccak256("task3"));

        assertEq(taskId1, 0, "First task ID should be 0");
        assertEq(taskId2, 1, "Second task ID should be 1");
        assertEq(taskId3, 2, "Third task ID should be 2");
        assertEq(registry.nextTaskId(), 3, "Next task ID should be 3");

        vm.stopPrank();
    }

    /**
     * Test: Reject Zero Spec Hash
     * Verifies that createTask reverts for zero hash
     */
    function testRejectZeroSpecHash() public {
        vm.startPrank(requester);

        vm.expectRevert("Spec hash cannot be zero");
        registry.createTask(bytes32(0));

        vm.stopPrank();
    }

    /**
     * Test: Submit Receipt
     * Verifies:
     * - Receipt is submitted successfully
     * - Receipt data is stored correctly
     * - ReceiptSubmitted event is emitted
     */
    function testSubmitReceipt() public {
        // Create task first
        vm.prank(requester);
        uint256 taskId = registry.createTask(specHash);

        // Submit receipt
        vm.startPrank(operator);

        // Expect ReceiptSubmitted event
        vm.expectEmit(true, true, false, true);
        emit ReceiptSubmitted(taskId, operator, artifactHash, resultHash);

        registry.submitReceipt(taskId, artifactHash, resultHash);

        // Verify receipt data
        (
            address storedOperator,
            bytes32 storedArtifactHash,
            bytes32 storedResultHash,
            uint256 completedAt
        ) = registry.receipts(taskId);

        assertEq(storedOperator, operator, "Operator should match");
        assertEq(
            storedArtifactHash,
            artifactHash,
            "Artifact hash should match"
        );
        assertEq(storedResultHash, resultHash, "Result hash should match");
        assertGt(completedAt, 0, "Completed timestamp should be set");

        vm.stopPrank();
    }

    /**
     * Test: Permissionless Receipt Submission
     * Verifies that ANY address can submit receipt for ANY task
     */
    function testPermissionlessReceipt() public {
        vm.prank(requester);
        uint256 taskId = registry.createTask(specHash);

        // Different operator submits receipt (not the requester)
        address randomOperator = address(0x999);
        vm.prank(randomOperator);
        registry.submitReceipt(taskId, artifactHash, resultHash);

        // Verify receipt was accepted
        (address storedOperator, , , ) = registry.receipts(taskId);
        assertEq(
            storedOperator,
            randomOperator,
            "Any operator should be able to submit"
        );
    }

    /**
     * Test: Reject Duplicate Receipt
     * Verifies that submitting receipt twice for same task reverts
     */
    function testRejectDuplicateReceipt() public {
        // Create task
        vm.prank(requester);
        uint256 taskId = registry.createTask(specHash);

        // Submit receipt first time
        vm.prank(operator);
        registry.submitReceipt(taskId, artifactHash, resultHash);

        // Try to submit again (should revert)
        vm.prank(operator);
        vm.expectRevert("Receipt already submitted");
        registry.submitReceipt(taskId, artifactHash, resultHash);

        // Try from different operator (should also revert)
        vm.prank(address(0x999));
        vm.expectRevert("Receipt already submitted");
        registry.submitReceipt(taskId, artifactHash, resultHash);
    }

    /**
     * Test: Reject Invalid Task
     * Verifies that submitting receipt for non-existent task reverts
     */
    function testRejectInvalidTask() public {
        uint256 nonExistentTaskId = 999;

        vm.prank(operator);
        vm.expectRevert("Task does not exist");
        registry.submitReceipt(nonExistentTaskId, artifactHash, resultHash);
    }

    /**
     * Test: Reject Zero Artifact Hash
     * Verifies that submitReceipt reverts for zero artifact hash
     */
    function testRejectZeroArtifactHash() public {
        vm.prank(requester);
        uint256 taskId = registry.createTask(specHash);

        vm.prank(operator);
        vm.expectRevert("Artifact hash cannot be zero");
        registry.submitReceipt(taskId, bytes32(0), resultHash);
    }

    /**
     * Test: Reject Zero Result Hash
     * Verifies that submitReceipt reverts for zero result hash
     */
    function testRejectZeroResultHash() public {
        vm.prank(requester);
        uint256 taskId = registry.createTask(specHash);

        vm.prank(operator);
        vm.expectRevert("Result hash cannot be zero");
        registry.submitReceipt(taskId, artifactHash, bytes32(0));
    }

    /**
     * Test: Full Flow
     * End-to-end test of create task + submit receipt
     */
    function testFullFlow() public {
        // Step 1: Requester creates task
        vm.prank(requester);
        uint256 taskId = registry.createTask(specHash);

        // Verify task exists
        (address storedRequester, , ) = registry.tasks(taskId);
        assertEq(storedRequester, requester);

        // Step 2: Operator submits receipt
        vm.prank(operator);
        registry.submitReceipt(taskId, artifactHash, resultHash);

        // Verify receipt exists
        (address storedOperator, , , ) = registry.receipts(taskId);
        assertEq(storedOperator, operator);

        // Step 3: Verify both task and receipt are stored
        assertEq(registry.nextTaskId(), taskId + 1);
    }
}
