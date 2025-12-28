const { ethers } = require('ethers');
const { wallet, chainId } = require('../config/chain');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * ExecutionRegistry contract wrapper
 * Loads contract address and ABI from deployment JSON based on network
 * Exposes only createTask and submitReceipt functions
 */

// Determine deployment file based on chain ID
const getDeploymentFile = () => {
    const chainIdNum = parseInt(chainId);
    switch (chainIdNum) {
        case 97:
            return 'bsc-testnet.json';
        case 5611:
            return 'opbnb-testnet.json';
        case 31337:
        default:
            return 'local.json';
    }
};

const deploymentFile = getDeploymentFile();
const deploymentPath = path.join(__dirname, `../../smart-contracts/deployments/${deploymentFile}`);
let deployment;

try {
    const deploymentData = fs.readFileSync(deploymentPath, 'utf8');
    deployment = JSON.parse(deploymentData);
    logger.info('Loaded deployment from:', deploymentFile);
} catch (error) {
    logger.error('Failed to load deployment JSON:', error.message);
    logger.error('Make sure contracts are deployed for chain ID:', chainId);
    process.exit(1);
}

const CONTRACT_ADDRESS = deployment.ExecutionRegistry.address;
const ABI = deployment.ExecutionRegistry.abi;

logger.info('ExecutionRegistry address:', CONTRACT_ADDRESS);
logger.info('Chain ID:', deployment.ExecutionRegistry.chainId);

// Initialize contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

/**
 * Create a new task on-chain
 * @param {string} specHash - Keccak256 hash of task specification
 * @returns {Promise<{taskId: number, txHash: string}>}
 */
async function createTask(specHash) {
    logger.info('Creating task with specHash:', specHash);

    const tx = await contract.createTask(specHash);
    logger.info('Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    logger.info('Transaction confirmed in block:', receipt.blockNumber);

    // Parse TaskCreated event to get taskId
    const event = receipt.logs.find(log => {
        try {
            const parsed = contract.interface.parseLog(log);
            return parsed && parsed.name === 'TaskCreated';
        } catch (e) {
            return false;
        }
    });

    if (!event) {
        throw new Error('TaskCreated event not found in transaction receipt');
    }

    const parsed = contract.interface.parseLog(event);
    const taskId = Number(parsed.args.taskId);

    logger.info('Task created with ID:', taskId);

    return {
        taskId,
        txHash: tx.hash
    };
}

/**
 * Submit execution receipt on-chain
 * @param {number} taskId - Task ID
 * @param {string} artifactHash - Hash of artifact folder
 * @param {string} resultHash - Hash of result.json
 * @returns {Promise<{txHash: string}>}
 */
async function submitReceipt(taskId, artifactHash, resultHash) {
    logger.info('Submitting receipt for task:', taskId);
    logger.info('Artifact hash:', artifactHash);
    logger.info('Result hash:', resultHash);

    const tx = await contract.submitReceipt(taskId, artifactHash, resultHash);
    logger.info('Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    logger.info('Transaction confirmed in block:', receipt.blockNumber);

    return {
        txHash: tx.hash
    };
}

/**
 * Get task details from blockchain
 * @param {number} taskId - Task ID
 * @returns {Promise<Object>} Task details
 */
async function getTask(taskId) {
    const task = await contract.tasks(taskId);
    return {
        requester: task.requester,
        specHash: task.specHash,
        createdAt: Number(task.createdAt)
    };
}

/**
 * Get receipt details from blockchain
 * @param {number} taskId - Task ID
 * @returns {Promise<Object|null>} Receipt details or null if not submitted
 */
async function getReceipt(taskId) {
    const receipt = await contract.receipts(taskId);
    if (receipt.operator === ethers.ZeroAddress) {
        return null; // No receipt submitted yet
    }
    return {
        operator: receipt.operator,
        artifactHash: receipt.artifactHash,
        resultHash: receipt.resultHash,
        completedAt: Number(receipt.completedAt)
    };
}

module.exports = {
    createTask,
    submitReceipt,
    getTask,
    getReceipt,
    contract
};
