require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-truffle5");
require("hardhat-gas-reporter");
require("solidity-coverage");

const blockchainPlatform = process.env.BLOCKCHAIN_PLATFORM;

const bscScanApiKey = process.env.BSCSCAN_API_KEY;
const coinmarketcapApiKey = process.env.COINMARKETCAP_API_KEY;
const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
const infuraProjectId = process.env.INFURA_PROJECT_ID;
const polygonscanApiKey = process.env.POLYGONSCAN_API_KEY;

const bscTestnetPrivateKey = process.env.BSC_TESTNET_PRIVATE_KEY;
const bscMainnetPrivateKey = process.env.BSC_MAINNET_PRIVATE_KEY;
const kovanPrivateKey = process.env.KOVAN_PRIVATE_KEY;
const ropstenPrivateKey = process.env.ROPSTEN_PRIVATE_KEY;
const mainnetPrivateKey = process.env.MAINNET_PRIVATE_KEY;
const polygonMumbaiPrivateKey = process.env.POLYGON_MUMBAI_PRIVATE_KEY;
const polygonMainnetPrivateKey = process.env.POLYGON_MAINNET_PRIVATE_KEY;

let verifyContractApiKey;

if (blockchainPlatform === "BSC") {
  verifyContractApiKey = bscScanApiKey;
} else if (blockchainPlatform === "ETH") {
  verifyContractApiKey = etherscanApiKey;
} else if (blockchainPlatform === "MATIC") {
  verifyContractApiKey = polygonscanApiKey;
} else {
  throw new Error(`Unknown Blockchain Platform: ${blockchainPlatform}`);
}

if (verifyContractApiKey === undefined) {
  throw new Error("Unknown Verify Contract API Key");
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const config = {
  solidity: {
    version: "0.7.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  mocha: {
    timeout: 120000,
  },
  etherscan: {
    apiKey: verifyContractApiKey,
  },
  gasReporter: {
    currency: "USD",
    coinmarketcap: coinmarketcapApiKey,
    outputFile: "gas-usage.txt",
    noColors: true,
  },
};

if (!config.networks) {
  config.networks = {};
}

config.networks["hardhat"] = {
  initialBaseFeePerGas: 0,
  accounts: {
    count: 210,
  },
};

if (blockchainPlatform === "BSC" && bscTestnetPrivateKey) {
  config.networks["bsc-testnet"] = {
    url: "https://data-seed-prebsc-1-s1.binance.org:8545",
    accounts: [`0x${bscTestnetPrivateKey}`],
    gasMultiplier: 2, // For testnet only
  };
}

if (blockchainPlatform === "BSC" && bscMainnetPrivateKey) {
  config.networks["bsc-mainnet"] = {
    url: "https://bsc-dataseed.binance.org",
    accounts: [`0x${bscMainnetPrivateKey}`],
    gasMultiplier: 1.02,
  };
}

if (blockchainPlatform === "ETH" && kovanPrivateKey) {
  config.networks["kovan"] = {
    url: `https://kovan.infura.io/v3/${infuraProjectId}`,
    accounts: [`0x${kovanPrivateKey}`],
    // gasPrice: 2000000000, // For testnet only, 2 Gwei
  };
}

if (blockchainPlatform === "ETH" && ropstenPrivateKey) {
  // const alchemyApiKey = process.env.ROPSTEN_ALCHEMY_API_KEY;

  config.networks["ropsten"] = {
    url: `https://ropsten.infura.io/v3/${infuraProjectId}`, // https://eth-ropsten.alchemyapi.io/v2/${alchemyApiKey}
    accounts: [`0x${ropstenPrivateKey}`],
    // gasPrice: 2000000000, // For testnet only, 2 Gwei
  };
}

if (blockchainPlatform === "ETH" && mainnetPrivateKey) {
  // const alchemyApiKey = process.env.MAINNET_ALCHEMY_API_KEY;

  config.networks["mainnet"] = {
    url: `https://mainnet.infura.io/v3/${infuraProjectId}`, // https://eth-mainnet.alchemyapi.io/v2/${alchemyApiKey}
    accounts: [`0x${mainnetPrivateKey}`],
    // gasPrice: 60000000000, // 60 Gwei
  };
}

if (blockchainPlatform === "MATIC" && polygonMumbaiPrivateKey) {
  const alchemyApiKey = process.env.POLYGON_MUMBAI_ALCHEMY_API_KEY;

  config.networks["polygon-mumbai"] = {
    url: `https://polygon-mumbai.g.alchemy.com/v2/${alchemyApiKey}`,
    accounts: [`0x${polygonMumbaiPrivateKey}`],
    gasMultiplier: 2, // For testnet only
  };
}

if (blockchainPlatform === "MATIC" && polygonMainnetPrivateKey) {
  config.networks["polygon-mainnet"] = {
    url: "https://polygon-rpc.com",
    accounts: [`0x${polygonMainnetPrivateKey}`],
    gasMultiplier: 1.02,
  };
}

module.exports = config;
