require('dotenv').config();
const { Client, VisibilityType, RedundancyType, Long, bytesFromBase64 } = require('@bnb-chain/greenfield-js-sdk');

/**
 * Greenfield configuration for BNB Greenfield Testnet
 * Centralizes all decentralized storage settings
 */

// Greenfield Testnet RPC endpoint
const GREENFIELD_RPC = process.env.GREENFIELD_RPC || 'https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org';
const GREENFIELD_CHAIN_ID = process.env.GREENFIELD_CHAIN_ID || '5600';
const GREENFIELD_BUCKET = process.env.GREENFIELD_BUCKET;
const GREENFIELD_SP_ADDRESS = process.env.GREENFIELD_SP_ADDRESS;

// Use the same private key as BSC for simplicity
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;

if (!GREENFIELD_BUCKET) {
    console.warn('WARNING: GREENFIELD_BUCKET not set. Greenfield uploads will fail.');
}

if (!PRIVATE_KEY) {
    console.warn('WARNING: PRIVATE_KEY not set. Greenfield uploads will fail.');
}

// Create Greenfield client (lazy initialization)
let client = null;

function getClient() {
    if (!client) {
        client = Client.create(GREENFIELD_RPC, GREENFIELD_CHAIN_ID);
    }
    return client;
}

module.exports = {
    rpc: GREENFIELD_RPC,
    chainId: GREENFIELD_CHAIN_ID,
    bucket: GREENFIELD_BUCKET,
    spAddress: GREENFIELD_SP_ADDRESS,
    privateKey: PRIVATE_KEY,
    accountAddress: ACCOUNT_ADDRESS,
    getClient,
    // Re-export SDK types for convenience
    VisibilityType,
    RedundancyType,
    Long,
    bytesFromBase64
};
