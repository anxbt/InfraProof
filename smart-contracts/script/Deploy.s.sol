// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/ExecutionRegistry.sol";

/**
 * @title Deploy Script
 * @notice Deploys ExecutionRegistry contract and exports deployment JSON
 * @dev Compatible with local Anvil, BSC testnet, and opBNB testnet
 *
 * Usage:
 * Local:  forge script script/Deploy.s.sol --broadcast --rpc-url http://127.0.0.1:8545
 * Testnet: forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify
 */
contract DeployScript is Script {
    function run() public {
        // Get deployer private key from environment or use Anvil default
        uint256 deployerPrivateKey;
        try vm.envUint("PRIVATE_KEY") returns (uint256 key) {
            deployerPrivateKey = key;
        } catch {
            // Use Anvil's first default account
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        }
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy ExecutionRegistry
        ExecutionRegistry registry = new ExecutionRegistry();

        // Stop broadcasting
        vm.stopBroadcast();

        // Log deployed address
        console.log("==================================================");
        console.log("ExecutionRegistry deployed to:", address(registry));
        console.log("==================================================");
        console.log("");
        console.log("Contract details:");
        console.log("- Initial nextTaskId:", registry.nextTaskId());
        console.log("- Deployer:", vm.addr(deployerPrivateKey));
        console.log("- Chain ID:", block.chainid);
        console.log("");

        // Export deployment JSON
        string memory json = string.concat(
            "{\n",
            '  "ExecutionRegistry": {\n',
            '    "address": "',
            vm.toString(address(registry)),
            '",\n',
            '    "deployer": "',
            vm.toString(vm.addr(deployerPrivateKey)),
            '",\n',
            '    "chainId": ',
            vm.toString(block.chainid),
            ",\n",
            '    "abi": ',
            _getABI(),
            "\n",
            "  }\n",
            "}"
        );

        // Write to deployments directory
        string memory deploymentsDir = string.concat(
            vm.projectRoot(),
            "/deployments"
        );

        // Create directory if it doesn't exist (will fail silently if exists)
        string[] memory mkdirCmd = new string[](3);
        mkdirCmd[0] = "mkdir";
        mkdirCmd[1] = "-p";
        mkdirCmd[2] = deploymentsDir;
        vm.ffi(mkdirCmd);

        // Write deployment JSON
        string memory outputFile;
        if (block.chainid == 31337) {
            outputFile = string.concat(deploymentsDir, "/local.json");
        } else if (block.chainid == 97) {
            outputFile = string.concat(deploymentsDir, "/bsc-testnet.json");
        } else if (block.chainid == 5611) {
            outputFile = string.concat(deploymentsDir, "/opbnb-testnet.json");
        } else {
            outputFile = string.concat(
                deploymentsDir,
                "/deployment-",
                vm.toString(block.chainid),
                ".json"
            );
        }

        vm.writeFile(outputFile, json);

        console.log("Deployment JSON written to:", outputFile);
        console.log("");
        console.log("Next steps:");
        console.log(
            "1. Update backend .env with CONTRACT_ADDRESS=",
            vm.toString(address(registry))
        );
        console.log("2. Start backend: cd backend && npm start");
        console.log("3. Open frontend: http://localhost:8080");
    }

    function _getABI() internal pure returns (string memory) {
        return
            '[{"type":"function","name":"createTask","inputs":[{"name":"specHash","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"nonpayable"},{"type":"function","name":"nextTaskId","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"receipts","inputs":[{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"operator","type":"address","internalType":"address"},{"name":"artifactHash","type":"bytes32","internalType":"bytes32"},{"name":"resultHash","type":"bytes32","internalType":"bytes32"},{"name":"completedAt","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"submitReceipt","inputs":[{"name":"taskId","type":"uint256","internalType":"uint256"},{"name":"artifactHash","type":"bytes32","internalType":"bytes32"},{"name":"resultHash","type":"bytes32","internalType":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"tasks","inputs":[{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"requester","type":"address","internalType":"address"},{"name":"specHash","type":"bytes32","internalType":"bytes32"},{"name":"createdAt","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"event","name":"ReceiptSubmitted","inputs":[{"name":"taskId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"operator","type":"address","indexed":true,"internalType":"address"},{"name":"artifactHash","type":"bytes32","indexed":false,"internalType":"bytes32"},{"name":"resultHash","type":"bytes32","indexed":false,"internalType":"bytes32"}],"anonymous":false},{"type":"event","name":"TaskCreated","inputs":[{"name":"taskId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"requester","type":"address","indexed":true,"internalType":"address"},{"name":"specHash","type":"bytes32","indexed":false,"internalType":"bytes32"}],"anonymous":false}]';
    }
}
