import HardhatIgnitionEthersPlugin from "@nomicfoundation/hardhat-ignition-ethers";
import { defineConfig } from "hardhat/config";
import "dotenv/config";

const SEPOLIA_RPC_URL = process.env.SEPOLIA_URL || "";
const SEPOLIA_PRIVATE_KEY = process.env.PRIVATE_KEY || "";

export default defineConfig({
  plugins: [HardhatIgnitionEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: SEPOLIA_RPC_URL,
      accounts: SEPOLIA_PRIVATE_KEY ? [SEPOLIA_PRIVATE_KEY] : [],
    },
  },
});
