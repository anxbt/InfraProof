/**
 * Simple timestamped logger
 * Infrastructure-grade logging without colors or emojis
 */

function timestamp() {
    return new Date().toISOString();
}

function info(message, ...args) {
    console.log(`[${timestamp()}] INFO: ${message}`, ...args);
}

function error(message, ...args) {
    console.error(`[${timestamp()}] ERROR: ${message}`, ...args);
}

function warn(message, ...args) {
    console.warn(`[${timestamp()}] WARN: ${message}`, ...args);
}

module.exports = {
    info,
    error,
    warn
};
