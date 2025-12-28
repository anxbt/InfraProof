const express = require('express');
const router = express.Router();
const { hashJSON } = require('../utils/hash');
const { createTask, getTask, getReceipt } = require('../contracts/executionRegistry');
const { runBenchmark } = require('../services/benchmark');
const { processArtifacts } = require('../services/artifacts');
const { submitReceipt } = require('../services/receipt');
const logger = require('../utils/logger');

/**
 * Task routes
 * Minimal API surface: create and execute tasks
 */

/**
 * POST /tasks/create
 * Creates a SERVER_BENCHMARK task on-chain
 * 
 * Request body:
 * {
 *   "type": "SERVER_BENCHMARK",
 *   "duration": 30,  // optional, in seconds
 *   "config": {}     // optional benchmark config
 * }
 * 
 * Response:
 * {
 *   "taskId": 1,
 *   "specHash": "0x...",
 *   "txHash": "0x...",
 *   "taskSpec": {...}
 * }
 */
router.post('/create', async (req, res) => {
    try {
        logger.info('POST /tasks/create - Request received');

        const { type = 'SERVER_BENCHMARK', duration = 30, config = {} } = req.body;

        // Create task specification
        const taskSpec = {
            type,
            duration,
            config: {
                cpuDurationMs: (duration / 3) * 1000, // 1/3 of time for CPU
                memorySizeMB: config.memorySizeMB || 100,
                diskSizeMB: config.diskSizeMB || 10
            },
            createdAt: new Date().toISOString()
        };

        logger.info('Task specification:', JSON.stringify(taskSpec));

        // Compute specHash
        const specHash = hashJSON(taskSpec);
        logger.info('Spec hash:', specHash);

        // Create task on-chain
        const { taskId, txHash } = await createTask(specHash);

        logger.info(`Task created successfully: ID=${taskId}, TX=${txHash}`);

        res.json({
            success: true,
            taskId,
            specHash,
            txHash,
            taskSpec
        });

    } catch (error) {
        logger.error('Error creating task:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /tasks/execute/:taskId
 * Triggers benchmark execution and submits receipt on-chain
 * This endpoint simulates the operator for demo purposes
 * 
 * Request params:
 * - taskId: Task ID to execute
 * 
 * Request body (optional):
 * {
 *   "config": {}  // benchmark config overrides
 * }
 * 
 * Response:
 * {
 *   "taskId": 1,
 *   "artifactHash": "0x...",
 *   "resultHash": "0x...",
 *   "artifactUrl": "https://...",
 *   "receiptTxHash": "0x..."
 * }
 */
router.post('/execute/:taskId', async (req, res) => {
    try {
        const taskId = parseInt(req.params.taskId);
        logger.info(`POST /tasks/execute/${taskId} - Request received`);

        if (isNaN(taskId) || taskId < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid task ID'
            });
        }

        const { config = {} } = req.body;

        // Capture logs for artifact
        const logs = [];
        const originalLog = logger.info;
        logger.info = (msg, ...args) => {
            const logLine = `[${new Date().toISOString()}] ${msg} ${args.map(a =>
                typeof a === 'object' ? JSON.stringify(a) : a
            ).join(' ')}`;
            logs.push(logLine);
            originalLog(msg, ...args);
        };

        logger.info(`Starting execution for task ${taskId}`);

        // Run benchmark
        logger.info('Running SERVER_BENCHMARK...');
        const benchmarkResults = await runBenchmark(config);

        // Process artifacts (create folder, upload to Greenfield, compute hashes)
        logger.info('Processing artifacts...');
        const { artifactUrl, artifactHash, resultHash } = await processArtifacts(
            taskId,
            benchmarkResults,
            logs
        );

        // Restore original logger
        logger.info = originalLog;

        // Submit receipt on-chain
        logger.info('Submitting receipt on-chain...');
        const receipt = await submitReceipt(taskId, artifactHash, resultHash);

        logger.info(`Task ${taskId} execution completed successfully`);

        res.json({
            success: true,
            taskId,
            artifactHash,
            resultHash,
            artifactUrl,
            receiptTxHash: receipt.txHash,
            benchmarkSummary: {
                duration: benchmarkResults.totalDurationMs,
                cpuOpsPerSec: benchmarkResults.tests.cpu.opsPerSecond,
                memoryWriteMBps: benchmarkResults.tests.memory.writeMBps,
                diskWriteMBps: benchmarkResults.tests.disk.writeMBps
            }
        });

    } catch (error) {
        logger.error('Error executing task:', error.message);
        logger.error(error.stack);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /tasks/:taskId
 * Get task status (on-chain + local artifacts)
 * 
 * Response:
 * {
 *   \"task\": {
 *     \"taskId\": 1,
 *     \"requester\": \"0x...\",
 *     \"specHash\": \"0x...\",
 *     \"createdAt\": 1234567890,
 *     \"status\": \"COMPLETED\" | \"PENDING\"
 *   },
 *   \"receipt\": {
 *     \"operator\": \"0x...\",
 *     \"artifactHash\": \"0x...\",
 *     \"resultHash\": \"0x...\",
 *     \"completedAt\": 1234567890
 *   } | null
 * }
 */
router.get('/:taskId', async (req, res) => {
    try {
        const taskId = parseInt(req.params.taskId);
        logger.info(`GET /tasks/${taskId} - Request received`);

        if (isNaN(taskId) || taskId < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid task ID'
            });
        }

        // Get task from blockchain
        const task = await getTask(taskId);

        // Check if task exists
        if (task.requester === '0x0000000000000000000000000000000000000000') {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        // Get receipt from blockchain (if exists)
        const receipt = await getReceipt(taskId);

        // Determine status
        const status = receipt ? 'COMPLETED' : 'PENDING';

        res.json({
            success: true,
            task: {
                taskId,
                requester: task.requester,
                specHash: task.specHash,
                createdAt: task.createdAt,
                status
            },
            receipt: receipt ? {
                operator: receipt.operator,
                artifactHash: receipt.artifactHash,
                resultHash: receipt.resultHash,
                completedAt: receipt.completedAt
            } : null
        });

    } catch (error) {
        logger.error('Error fetching task:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /tasks/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
