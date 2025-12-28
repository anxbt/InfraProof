const fs = require('fs-extra');
const path = require('path');
const mimeTypes = require('mime-types');
const { NodeAdapterReedSolomon } = require('@bnb-chain/reed-solomon/node.adapter');
const { hashArtifactFolder } = require('../utils/hash');
const greenfieldConfig = require('../config/greenfield');
const logger = require('../utils/logger');

/**
 * Artifact management and Greenfield upload
 * Creates folder structure and uploads to decentralized storage
 */

// Reed-Solomon encoder for Greenfield
let rsEncoder = null;

function getReedSolomon() {
    if (!rsEncoder) {
        rsEncoder = new NodeAdapterReedSolomon();
    }
    return rsEncoder;
}

/**
 * Create artifact folder with execution results
 * @param {number} taskId - Task ID
 * @param {Object} benchmarkResults - Results from benchmark service
 * @param {Array} logs - Execution logs
 * @returns {Promise<string>} - Path to artifact folder
 */
async function createArtifactFolder(taskId, benchmarkResults, logs = []) {
    const artifactPath = path.join(process.cwd(), `artifacts/task-${taskId}`);

    logger.info(`Creating artifact folder: ${artifactPath}`);

    // Ensure clean folder
    await fs.remove(artifactPath);
    await fs.ensureDir(artifactPath);

    // Create execution.log
    const logContent = logs.join('\n') + '\n';
    await fs.writeFile(
        path.join(artifactPath, 'execution.log'),
        logContent
    );

    // Create metrics.json
    const metrics = {
        totalDurationMs: benchmarkResults.totalDurationMs,
        timestamp: benchmarkResults.timestamp,
        systemInfo: benchmarkResults.systemInfo,
        summary: {
            cpuOpsPerSecond: benchmarkResults.tests.cpu.opsPerSecond,
            memoryWriteMBps: benchmarkResults.tests.memory.writeMBps,
            memoryReadMBps: benchmarkResults.tests.memory.readMBps,
            diskWriteMBps: benchmarkResults.tests.disk.writeMBps,
            diskReadMBps: benchmarkResults.tests.disk.readMBps
        }
    };

    await fs.writeFile(
        path.join(artifactPath, 'metrics.json'),
        JSON.stringify(metrics, null, 2)
    );

    // Create result.json (complete benchmark results)
    await fs.writeFile(
        path.join(artifactPath, 'result.json'),
        JSON.stringify(benchmarkResults, null, 2)
    );

    logger.info('Artifact folder created successfully');

    return artifactPath;
}

/**
 * Create receipt metadata
 * @param {number} taskId - Task ID
 * @param {string} artifactHash - Hash of artifact folder
 * @param {string} resultHash - Hash of result.json
 * @param {string} artifactUrl - Greenfield URL
 * @returns {Promise<void>}
 */
async function createReceipt(taskId, artifactHash, resultHash, artifactUrl) {
    const artifactPath = path.join(process.cwd(), `artifacts/task-${taskId}`);

    const receipt = {
        taskId,
        artifactHash,
        resultHash,
        artifactUrl,
        createdAt: new Date().toISOString(),
        operator: 'infraproof-backend'
    };

    await fs.writeFile(
        path.join(artifactPath, 'receipt.json'),
        JSON.stringify(receipt, null, 2)
    );

    logger.info('Receipt created');
}

/**
 * Upload a single file to Greenfield
 * @param {Object} client - Greenfield client
 * @param {string} bucketName - Bucket name
 * @param {string} objectName - Object name (file name in bucket)
 * @param {Buffer} fileBuffer - File content
 * @param {string} contentType - MIME type
 * @param {string} privateKey - Account private key
 * @param {string} accountAddress - Account address
 * @returns {Promise<Object>} - Upload result
 */
async function uploadFileToGreenfield(client, bucketName, objectName, fileBuffer, contentType, privateKey, accountAddress) {
    const rs = getReedSolomon();
    const { VisibilityType, RedundancyType, Long, bytesFromBase64 } = greenfieldConfig;

    logger.info(`Creating object on Greenfield: ${objectName}`);

    // Compute checksums using Reed-Solomon
    const expectCheckSums = await rs.encodeInSubWorker(Uint8Array.from(fileBuffer));

    // Create object transaction
    const createObjectTx = await client.object.createObject({
        bucketName: bucketName,
        objectName: objectName,
        creator: accountAddress,
        visibility: VisibilityType.VISIBILITY_TYPE_PUBLIC_READ,
        contentType: contentType || 'application/octet-stream',
        redundancyType: RedundancyType.REDUNDANCY_EC_TYPE,
        payloadSize: Long.fromInt(fileBuffer.byteLength),
        expectChecksums: expectCheckSums.map((x) => bytesFromBase64(x)),
    });

    // Simulate to get gas estimate
    const simulateInfo = await createObjectTx.simulate({
        denom: 'BNB',
    });

    // Broadcast create object transaction
    const createObjectTxRes = await createObjectTx.broadcast({
        denom: 'BNB',
        gasLimit: Number(simulateInfo?.gasLimit),
        gasPrice: simulateInfo?.gasPrice || '5000000000',
        payer: accountAddress,
        granter: '',
        privateKey: privateKey,
    });

    if (createObjectTxRes.code !== 0) {
        throw new Error(`Failed to create object on Greenfield: ${createObjectTxRes.rawLog}`);
    }

    logger.info(`Object created on-chain: ${createObjectTxRes.transactionHash}`);

    // Upload the actual file content
    const uploadRes = await client.object.uploadObject(
        {
            bucketName: bucketName,
            objectName: objectName,
            body: {
                name: objectName,
                type: contentType || 'application/octet-stream',
                size: fileBuffer.byteLength,
                content: fileBuffer,
            },
            txnHash: createObjectTxRes.transactionHash,
        },
        {
            type: 'ECDSA',
            privateKey: privateKey,
        }
    );

    if (uploadRes.code !== 0) {
        throw new Error(`Failed to upload object to Greenfield: ${uploadRes.message}`);
    }

    logger.info(`File uploaded successfully: ${objectName}`);
    return uploadRes;
}

/**
 * Upload artifact folder to Greenfield
 * @param {string} folderPath - Path to artifact folder
 * @param {number} taskId - Task ID
 * @returns {Promise<string>} - Artifact URL
 */
async function uploadToGreenfield(folderPath, taskId) {
    logger.info('Uploading artifacts to Greenfield...');

    const { bucket, privateKey, accountAddress, getClient } = greenfieldConfig;

    // Check if we have all required config
    if (!bucket || !privateKey || !accountAddress) {
        logger.warn('Greenfield not fully configured. Using mock upload.');
        logger.warn('Set GREENFIELD_BUCKET, PRIVATE_KEY, and ACCOUNT_ADDRESS in .env');

        // Fallback to mock for development
        await new Promise(resolve => setTimeout(resolve, 500));
        // Greenfield Scan URL to view all artifacts for this task
        const mockUrl = `https://testnet.greenfieldscan.com/bucket/0x0000000000000000000000000000000000000000000000000000000000005863?tab=object&keyword=task-${taskId}`;
        logger.info(`Mock artifacts URL: ${mockUrl}`);
        return mockUrl;
    }

    try {
        const client = getClient();

        // Get list of files in artifact folder
        const files = await fs.readdir(folderPath);

        // Upload each file
        for (const fileName of files) {
            const filePath = path.join(folderPath, fileName);
            const stats = await fs.stat(filePath);

            if (!stats.isFile()) continue;

            const fileBuffer = await fs.readFile(filePath);
            const extname = path.extname(fileName);
            const contentType = mimeTypes.lookup(extname) || 'application/octet-stream';
            const objectName = `task-${taskId}/${fileName}`;

            await uploadFileToGreenfield(
                client,
                bucket,
                objectName,
                fileBuffer,
                contentType,
                privateKey,
                accountAddress
            );
        }

        // Greenfield Scan URL to view all artifacts for this task in one page
        const artifactUrl = `https://testnet.greenfieldscan.com/bucket/0x0000000000000000000000000000000000000000000000000000000000005863?tab=object&keyword=task-${taskId}`;
        logger.info(`All artifacts uploaded to: ${artifactUrl}`);

        return artifactUrl;

    } catch (error) {
        logger.error('Greenfield upload failed:', error.message);
        logger.warn('Falling back to mock URL');

        // Fallback to mock URL if upload fails
        // Greenfield Scan URL to view all artifacts for this task
        const mockUrl = `https://testnet.greenfieldscan.com/bucket/0x0000000000000000000000000000000000000000000000000000000000005863?tab=object&keyword=task-${taskId}`;
        return mockUrl;
    }
}

/**
 * Process and upload artifacts
 * Creates folder, uploads to Greenfield, computes hashes
 * @param {number} taskId - Task ID
 * @param {Object} benchmarkResults - Benchmark results
 * @param {Array} logs - Execution logs
 * @returns {Promise<Object>} - Artifact metadata
 */
async function processArtifacts(taskId, benchmarkResults, logs) {
    // Create artifact folder
    const artifactPath = await createArtifactFolder(taskId, benchmarkResults, logs);

    // Upload to Greenfield
    const artifactUrl = await uploadToGreenfield(artifactPath, taskId);

    // Compute hashes (before adding receipt to avoid circular dependency)
    const artifactHash = await hashArtifactFolder(artifactPath);

    // Read result.json for result hash
    const resultPath = path.join(artifactPath, 'result.json');
    const resultContent = await fs.readFile(resultPath);
    const { ethers } = require('ethers');
    const resultHash = ethers.keccak256(resultContent);

    // Create receipt with hash info
    await createReceipt(taskId, artifactHash, resultHash, artifactUrl);

    logger.info('Artifact processing complete');

    return {
        artifactPath,
        artifactUrl,
        artifactHash,
        resultHash
    };
}

module.exports = {
    processArtifacts,
    createArtifactFolder,
    uploadToGreenfield,
    uploadFileToGreenfield
};
