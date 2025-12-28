const { submitReceipt: submitReceiptOnChain } = require('../contracts/executionRegistry');
const logger = require('../utils/logger');

/**
 * Receipt submission service
 * Handles on-chain receipt submission with artifact and result hashes
 */

/**
 * Submit execution receipt to blockchain
 * @param {number} taskId - Task ID
 * @param {string} artifactHash - Keccak256 hash of artifact folder
 * @param {string} resultHash - Keccak256 hash of result.json
 * @returns {Promise<Object>} - Transaction details
 */
async function submitReceipt(taskId, artifactHash, resultHash) {
    logger.info(`Submitting receipt for task ${taskId}`);
    logger.info(`Artifact hash: ${artifactHash}`);
    logger.info(`Result hash: ${resultHash}`);

    // Submit to blockchain via contract wrapper
    const result = await submitReceiptOnChain(taskId, artifactHash, resultHash);

    logger.info(`Receipt submitted successfully. TX: ${result.txHash}`);

    return {
        taskId,
        artifactHash,
        resultHash,
        txHash: result.txHash,
        submittedAt: new Date().toISOString()
    };
}

module.exports = {
    submitReceipt
};
