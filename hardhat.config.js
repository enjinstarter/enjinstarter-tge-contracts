require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-truffle5");
require("hardhat-gas-reporter");
require("solidity-coverage");

const coinmarketcapApiKey = process.env.COINMARKETCAP_API_KEY;
const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
const infuraProjectId = process.env.INFURA_PROJECT_ID;

const kovanPrivateKey = process.env.KOVAN_PRIVATE_KEY;
const ropstenPrivateKey = process.env.ROPSTEN_PRIVATE_KEY;
const mainnetPrivateKey = process.env.MAINNET_PRIVATE_KEY;

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
    apiKey: etherscanApiKey,
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
  accounts: {
    count: 210,
  },
};

if (kovanPrivateKey) {
  config.networks["kovan"] = {
    url: `https://kovan.infura.io/v3/${infuraProjectId}`,
    accounts: [`0x${kovanPrivateKey}`],
    gasMultiplier: 2, // For testnet only
  };
}

if (ropstenPrivateKey) {
  config.networks["ropsten"] = {
    url: `https://ropsten.infura.io/v3/${infuraProjectId}`,
    accounts: [`0x${ropstenPrivateKey}`],
    gasMultiplier: 2, // For testnet only
  };
}

if (mainnetPrivateKey) {
  config.networks["mainnet"] = {
    url: `https://mainnet.infura.io/v3/${infuraProjectId}`,
    accounts: [`0x${mainnetPrivateKey}`],
    gasMultiplier: 1.05,
  };
}

module.exports = config;
