const { ethers } = require('ethers');
const fs = require('fs-extra');
const path = require('path');

/**
 * Deterministic hashing utilities using keccak256
 * Compatible with on-chain verification
 */

/**
 * Hash JSON object with deterministic key ordering
 * @param {Object} obj - Object to hash
 * @returns {string} - Hex-encoded keccak256 hash
 */
function hashJSON(obj) {
    // Sort keys deterministically
    const sortedJSON = JSON.stringify(obj, Object.keys(obj).sort());
    const encoded = ethers.toUtf8Bytes(sortedJSON);
    return ethers.keccak256(encoded);
}

/**
 * Hash entire artifact folder deterministically
 * Recursively hashes all files in alphabetical order
 * @param {string} folderPath - Path to folder
 * @returns {string} - Hex-encoded keccak256 hash
 */
async function hashArtifactFolder(folderPath) {
    const files = await fs.readdir(folderPath);
    const sortedFiles = files.sort();

    let combinedHash = '';

    for (const file of sortedFiles) {
        const filePath = path.join(folderPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
            const content = await fs.readFile(filePath);
            const fileHash = ethers.keccak256(content);
            combinedHash += fileHash.slice(2); // Remove 0x prefix
        }
    }

    // Hash the concatenated hashes
    if (combinedHash) {
        return ethers.keccak256('0x' + combinedHash);
    }

    // Empty folder
    return ethers.keccak256('0x');
}

module.exports = {
    hashJSON,
    hashArtifactFolder
};
