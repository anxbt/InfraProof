# InfraProof Smart Contracts

Minimal on-chain registry for DePIN execution receipts using Foundry.

**The contract is a receipt registry, not a coordinator.**

## What This Contract Does

`ExecutionRegistry.sol` anchors two things on-chain:

1. **Task Intent** - What work was requested (`createTask`)
2. **Execution Receipt** - What work was claimed to be completed (`submitReceipt`)

That's it. Nothing more.

## What This Contract Does NOT Do

❌ **No Coordination** - Does not assign tasks or manage operators  
❌ **No Verification** - Does not validate execution results  
❌ **No Payments** - Does not handle staking, rewards, or incentives  
❌ **No Access Control** - No owner, no roles, no allowlists  
❌ **No External Calls** - Pure data storage

This is **not a protocol economy**. It's a **verification primitive**.

## Architecture

### Permissionless Operators

**Anyone can submit a receipt for any task.** There is no operator registry or allowlist.

This enables a permissionless DePIN network where:
- Nodes can join freely
- Execution is cryptographically proven via artifact hashes
- Verification happens off-chain (via Greenfield artifacts)

### Blockchain as Source of Truth

The contract stores:
```solidity
struct Task {
    address requester;      // Who requested the work
    bytes32 specHash;       // keccak256 hash of task specification
    uint256 createdAt;      // Block timestamp
}

struct Receipt {
    address operator;       // Who executed the work
    bytes32 artifactHash;   // keccak256 hash of execution artifacts
    bytes32 resultHash;     // keccak256 hash of execution results
    uint256 completedAt;    // Block timestamp
}
```

All other data (task specs, artifacts, results) lives:
- **Task specifications** - Hashed and stored as `specHash`
- **Execution artifacts** - Uploaded to Greenfield, hashed as `artifactHash`
- **Execution results** - Uploaded to Greenfield, hashed as `resultHash`

## Contract Interface

### createTask

```solidity
function createTask(bytes32 specHash) external returns (uint256)
```

Creates a new task:
- Increments `nextTaskId`
- Stores task with requester address and spec hash
- Emits `TaskCreated` event
- Returns new task ID

**No validation** beyond non-zero hash.

### submitReceipt

```solidity
function submitReceipt(
    uint256 taskId,
    bytes32 artifactHash,
    bytes32 resultHash
) external
```

Submits execution receipt:
- Validates task exists
- Validates receipt doesn't already exist (one receipt per task)
- Stores receipt with operator address and hashes
- Emits `ReceiptSubmitted` event

**Permissionless** - any address can call this for any task.

## Events

```solidity
event TaskCreated(
    uint256 indexed taskId,
    address indexed requester,
    bytes32 specHash
);

event ReceiptSubmitted(
    uint256 indexed taskId,
    address indexed operator,
    bytes32 artifactHash,
    bytes32 resultHash
);
```

## How It Fits InfraProof

```
┌─────────────┐
│  Requester  │
└──────┬──────┘
       │ 1. createTask(specHash)
       v
┌─────────────────────┐
│ ExecutionRegistry   │ ◄── On-Chain (BSC/opBNB)
│ (Smart Contract)    │
└─────────────────────┘
       │ TaskCreated event
       v
┌─────────────┐
│  Operator   │ (Off-Chain Backend)
└──────┬──────┘
       │ 2. Listens to event
       │ 3. Executes benchmark
       │ 4. Uploads to Greenfield
       v
┌─────────────────────┐
│    Greenfield       │ ◄── Decentralized Storage
│  (BNB Greenfield)   │
└─────────────────────┘
       │ Returns artifact URL + hashes
       v
┌─────────────┐
│  Operator   │
└──────┬──────┘
       │ 5. submitReceipt(taskId, artifactHash, resultHash)
       v
┌─────────────────────┐
│ ExecutionRegistry   │
│ (Receipt stored)    │
└─────────────────────┘
```

**Verification**: Anyone can download artifacts from Greenfield and verify hashes match on-chain receipts.

## Development

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Install Dependencies

```bash
cd smart-contracts
forge install
```

### Compile

```bash
forge build
```

### Test

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test testCreateTask

# Gas report
forge test --gas-report
```

### Test Coverage

```bash
forge coverage
```

## Deployment

### BSC Testnet

```bash
# Set environment variables
export RPC_URL=https://bsc-testnet.public.blastapi.io
export PRIVATE_KEY=your_private_key_here

# Deploy
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast

# Verify (optional)
forge verify-contract <ADDRESS> src/ExecutionRegistry.sol:ExecutionRegistry --chain-id 97
```

### opBNB Testnet

```bash
# Set environment variables
export RPC_URL=https://opbnb-testnet-rpc.bnbchain.org
export PRIVATE_KEY=your_private_key_here

# Deploy
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast

# Verify (optional)
forge verify-contract <ADDRESS> src/ExecutionRegistry.sol:ExecutionRegistry --chain-id 5611
```

## Security

### Minimal Attack Surface

- **No owner** - Cannot be rug-pulled or censored
- **No external calls** - No reentrancy risks
- **No access control** - No privilege escalation
- **Pure storage** - Predictable gas costs

### Audit Readiness

The entire contract logic can be audited in **under 5 minutes**:
- 2 structs
- 3 storage variables
- 2 functions
- ~100 lines of code

### Known Design Decisions

1. **Permissionless Receipt Submission**
   - Trade-off: Anyone can spam receipts
   - Mitigation: One receipt per task (first-come-first-served)
   - Rationale: Enables permissionless operators

2. **No Result Validation**
   - Trade-off: Contract doesn't verify execution correctness
   - Mitigation: Off-chain verification via artifact hashes
   - Rationale: On-chain verification is prohibitively expensive

3. **No Operator Incentives**
   - Trade-off: No built-in payment mechanism
   - Mitigation: Handle payments separately (if needed)
   - Rationale: Keep contract minimal and composable

## Tests

All tests pass with 100% coverage:

```
✅ testCreateTask - Task creation, storage, and events
✅ testCreateMultipleTasks - Task ID incrementing
✅ testRejectZeroSpecHash - Invalid spec hash validation
✅ testSubmitReceipt - Receipt submission, storage, and events
✅ testPermissionlessReceipt - Any operator can submit
✅ testRejectDuplicateReceipt - Duplicate receipt prevention
✅ testRejectInvalidTask - Non-existent task validation
✅ testRejectZeroArtifactHash - Invalid artifact hash validation
✅ testRejectZeroResultHash - Invalid result hash validation
✅ testFullFlow - End-to-end task creation + receipt submission
```

## Contract Addresses

| Network | Address | Explorer |
|---------|---------|----------|
| BSC Testnet | TBD | [BscScan](https://testnet.bscscan.com) |
| opBNB Testnet | TBD | [opBNB Explorer](https://opbnb-testnet.bscscan.com) |

## Integration

### Backend Integration

The backend uses `ethers.js` to interact with this contract:

```javascript
// Create task
const specHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(taskSpec)));
const tx = await contract.createTask(specHash);
const receipt = await tx.wait();
const taskId = parseTaskCreatedEvent(receipt);

// Submit receipt
const artifactHash = ethers.keccak256(artifactData);
const resultHash = ethers.keccak256(resultData);
await contract.submitReceipt(taskId, artifactHash, resultHash);
```

See `../backend/contracts/executionRegistry.js` for full implementation.

## License

MIT
