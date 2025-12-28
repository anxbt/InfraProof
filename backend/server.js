const express = require('express');
const cors = require('cors');
const taskRoutes = require('./routes/tasks');
const logger = require('./utils/logger');
require('dotenv').config();

/**
 * InfraProof Backend Server
 * Stateless coordinator for DePIN execution protocol
 */

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// Mount routes
app.use('/tasks', taskRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'InfraProof Backend',
        version: '1.0.0',
        description: 'Stateless backend for DePIN execution protocol',
        endpoints: {
            createTask: 'POST /tasks/create',
            executeTask: 'POST /tasks/execute/:taskId',
            health: 'GET /tasks/health'
        }
    });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err.message);
    logger.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    logger.info('='.repeat(50));
    logger.info('InfraProof Backend Starting...');
    logger.info(`Server listening on port ${PORT}`);
    logger.info('Blockchain is the source of truth');
    logger.info('='.repeat(50));
});

module.exports = app;
