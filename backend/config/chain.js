const { ethers } = require('ethers');
require('dotenv').config();

/**
 * Blockchain configuration and provider setup
 * Centralizes all chain-related initialization
 */

const RPC_URL = process.env.CHAIN_RPC_URL;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '97');
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!RPC_URL || !PRIVATE_KEY) {
  throw new Error('Missing required environment variables: CHAIN_RPC_URL, PRIVATE_KEY');
}

// Initialize provider
const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);

// Initialize wallet (signer)
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

module.exports = {
  provider,
  wallet,
  chainId: CHAIN_ID,
  rpcUrl: RPC_URL
};
