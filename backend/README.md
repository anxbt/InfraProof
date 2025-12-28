# InfraProof Backend

Stateless backend for the **InfraProof DePIN Execution Protocol**.

The backend coordinates task creation, runs deterministic benchmarks, uploads artifacts to Greenfield, and submits receipts on-chain. **Blockchain is the source of truth.**

## What This Backend Does

1. **Task Creation** - Generates task specifications, computes spec hashes, and creates tasks on-chain via `ExecutionRegistry` contract
2. **Benchmark Execution** - Runs deterministic `SERVER_BENCHMARK` tests (CPU, memory, disk I/O)
3. **Artifact Management** - Creates structured artifact folders with execution logs, metrics, and results
4. **Greenfield Upload** - Uploads complete artifact folders to BNB Greenfield decentralized storage
5. **Receipt Submission** - Computes artifact/result hashes and submits execution receipts on-chain

## What This Backend Does NOT Do

❌ **No persistent storage** - No database, no Redis, no long-term state  
❌ **No authentication** - No user accounts or API keys  
❌ **No business logic authority** - Smart contracts are the authority  
❌ **No autonomous operation** - Manual execution trigger for demo (production would use event listeners)  
❌ **No queues or workers** - Simple request-response flow only

## Architecture Principles

### Stateless Design
The backend is completely stateless. All state lives:
- **On-chain**: Task registry, receipts, verification results
- **In Greenfield**: Artifact folders containing execution logs and results
- **Nowhere else**: No database, no files (except temporary benchmark artifacts)

### Blockchain-First
- Smart contracts are the source of truth
- Backend only coordinates and reports
- All critical data is cryptographically verifiable (keccak256 hashes)

### Deterministic Execution
- Benchmarks produce consistent results for same inputs
- No randomness in tests
- Reproducible artifact generation

## Folder Structure

```
backend/
├── package.json
├── server.js                    # Express initialization
├── config/
│   ├── chain.js                 # Blockchain provider/wallet
│   └── greenfield.js            # Greenfield configuration
├── contracts/
│   └── executionRegistry.js     # Smart contract wrapper
├── routes/
│   └── tasks.js                 # API endpoints
├── services/
│   ├── benchmark.js             # SERVER_BENCHMARK implementation
│   ├── artifacts.js             # Artifact creation & upload
│   └── receipt.js               # On-chain receipt submission
└── utils/
    ├── hash.js                  # keccak256 hashing
    └── logger.js                # Timestamped logging
```

## Prerequisites

1. **Node.js** v18 or higher
2. **Deployed ExecutionRegistry Contract** with functions:
   - `createTask(bytes32 specHash) returns (uint256 taskId)`
   - `submitReceipt(uint256 taskId, bytes32 artifactHash, bytes32 resultHash)`
3. **BNB Chain Access** - RPC endpoint and private key
4. **Greenfield Access** - Bucket and credentials (optional for demo)

## Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

## Configuration

Edit `.env` file:

```bash
# Blockchain Configuration
CHAIN_RPC_URL=https://bsc-testnet.public.blastapi.io
CHAIN_ID=97
PRIVATE_KEY=your_private_key_here

# ExecutionRegistry Contract
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Greenfield Configuration
GREENFIELD_ENDPOINT=https://greenfield-sp.bnbchain.org
GREENFIELD_BUCKET=infraproof-artifacts
GREENFIELD_ACCESS_KEY=your_access_key_here
GREENFIELD_SECRET_KEY=your_secret_key_here

# Server Configuration
PORT=4000
```

**Important**: Replace placeholder values with actual credentials.

## Running the Server

```bash
# Start server
npm start

# Or use dev script
npm run dev
```

Server will start on `http://localhost:4000`

## API Endpoints

### Health Check
```bash
GET /tasks/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Create Task
```bash
POST /tasks/create
Content-Type: application/json

{
  "type": "SERVER_BENCHMARK",
  "duration": 30,
  "config": {
    "memorySizeMB": 100,
    "diskSizeMB": 10
  }
}
```

Response:
```json
{
  "success": true,
  "taskId": 1,
  "specHash": "0x1234...",
  "txHash": "0xabcd...",
  "taskSpec": {
    "type": "SERVER_BENCHMARK",
    "duration": 30,
    "config": {...},
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**What happens**:
1. Task spec generated
2. Spec hash computed (keccak256)
3. `createTask(specHash)` called on-chain
4. Task ID and transaction hash returned

### Execute Task (Demo)
```bash
POST /tasks/execute/1
Content-Type: application/json

{
  "config": {
    "cpuDurationMs": 5000,
    "memorySizeMB": 100,
    "diskSizeMB": 10
  }
}
```

Response:
```json
{
  "success": true,
  "taskId": 1,
  "artifactHash": "0x5678...",
  "resultHash": "0xef01...",
  "artifactUrl": "https://greenfield-sp.bnbchain.org/infraproof-artifacts/task-1",
  "receiptTxHash": "0x9abc...",
  "benchmarkSummary": {
    "duration": 15234,
    "cpuOpsPerSec": 123456,
    "memoryWriteMBps": 1234.56,
    "diskWriteMBps": 234.56
  }
}
```

**What happens**:
1. `SERVER_BENCHMARK` executed (CPU, memory, disk tests)
2. Artifact folder created: `task-{id}/`
   - `execution.log` - Logs from benchmark
   - `metrics.json` - Performance metrics
   - `result.json` - Complete results
   - `receipt.json` - Receipt metadata
3. Folder uploaded to Greenfield
4. Artifact hash and result hash computed
5. `submitReceipt(taskId, artifactHash, resultHash)` called on-chain
6. Transaction hash returned

## Benchmark Details

### CPU Test
- Prime number calculation (deterministic)
- Time-bound computation
- Reports operations per second

### Memory Test
- Allocates configurable memory size (default 100MB)
- Sequential write then read
- Reports MB/s for both operations

### Disk Test
- Creates temporary test file
- Sequential write in 1MB chunks
- Full file read
- Cleanup after test
- Reports MB/s for both operations

All tests are **deterministic** - same config produces consistent results.

## Artifact Structure

Each task execution creates:

```
task-{id}/
├── execution.log      # Timestamped logs from benchmark
├── metrics.json       # Summary metrics
├── result.json        # Complete benchmark results
└── receipt.json       # Receipt metadata
```

The entire folder is:
1. Uploaded to Greenfield
2. Hashed (keccak256 of all files)
3. Recorded on-chain via receipt

## On-Chain Integration

### createTask Flow
```
Backend → ExecutionRegistry.createTask(specHash)
       ← TaskCreated event (taskId, specHash, creator)
```

### submitReceipt Flow
```
Backend → ExecutionRegistry.submitReceipt(taskId, artifactHash, resultHash)
       ← ReceiptSubmitted event (taskId, artifactHash, resultHash, operator)
```

All hashes use `keccak256` for on-chain verification.

## Demo Workflow

```bash
# 1. Start the backend
npm start

# 2. Create a task
curl -X POST http://localhost:4000/tasks/create \
  -H "Content-Type: application/json" \
  -d '{"type":"SERVER_BENCHMARK","duration":30}'

# Response: { "taskId": 1, "txHash": "0x..." }

# 3. Verify on-chain (check block explorer with txHash)

# 4. Execute the task
curl -X POST http://localhost:4000/tasks/execute/1

# Response: { "artifactHash": "0x...", "receiptTxHash": "0x..." }

# 5. Verify receipt on-chain

# 6. Download artifacts from Greenfield (optional)
```

## Production Considerations

For production deployment:

1. **Replace Manual Execution** - Implement event listener for on-chain task creation
2. **Integrate Real Greenfield SDK** - Replace mock upload with actual BNB Greenfield client
3. **Add Error Recovery** - Retry logic for blockchain transactions
4. **Secure Private Keys** - Use hardware wallets or key management service
5. **Monitor Gas Costs** - Implement gas price strategies
6. **Scale Horizontally** - Deploy multiple backend instances (stateless design enables this)

## Troubleshooting

### Contract Address Not Set
```
Error: CONTRACT_ADDRESS not set or is zero address
```
Solution: Update `CONTRACT_ADDRESS` in `.env`

### RPC Connection Failed
```
Error: could not detect network
```
Solution: Check `CHAIN_RPC_URL` is accessible

### Transaction Failed
Check:
- Wallet has sufficient BNB for gas
- Contract is deployed and ABI matches
- Network ID matches contract deployment

## License

MIT
