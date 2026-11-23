// Hardhat configuration for the TokenizeArt42 project.
//
// The Solidity sources and the tests live in ../code (as required by the
// subject), while everything needed to deploy (this config, scripts, npm
// dependencies, secrets) lives here in ./deployment.

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Secrets are read from deployment/.env (never committed, see .env.example).
const DEPLOYER_PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const BSC_TESTNET_RPC_URL =
  process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  // The project root is the repository root so that Hardhat accepts sources
  // located in ../code; build output still stays inside ./deployment.
  paths: {
    root: "..",
    sources: "code/contracts",
    tests: "code/test",
    cache: "deployment/cache",
    artifacts: "deployment/artifacts",
  },

  networks: {
    // BNB Smart Chain Testnet (chainId 97) - free test BNB from the faucet.
    bscTestnet: {
      url: BSC_TESTNET_RPC_URL,
      chainId: 97,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },

  // Contract verification on testnet.bscscan.com (Etherscan API v2 key).
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },

  sourcify: { enabled: false },
};
