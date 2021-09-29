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
  initialBaseFeePerGas: 0,
  accounts: {
    count: 210,
  },
};

if (kovanPrivateKey) {
  config.networks["kovan"] = {
    url: `https://kovan.infura.io/v3/${infuraProjectId}`,
    accounts: [`0x${kovanPrivateKey}`],
    gasPrice: 2000000000, // For testnet only, 2 Gwei
  };
}

if (ropstenPrivateKey) {
  // const alchemyApiKey = process.env.ROPSTEN_ALCHEMY_API_KEY;

  config.networks["ropsten"] = {
    url: `https://ropsten.infura.io/v3/${infuraProjectId}`, // https://eth-ropsten.alchemyapi.io/v2/${alchemyApiKey}
    accounts: [`0x${ropstenPrivateKey}`],
    gasPrice: 2000000000, // For testnet only, 2 Gwei
  };
}

if (mainnetPrivateKey) {
  // const alchemyApiKey = process.env.MAINNET_ALCHEMY_API_KEY;

  config.networks["mainnet"] = {
    url: `https://mainnet.infura.io/v3/${infuraProjectId}`, // https://eth-mainnet.alchemyapi.io/v2/${alchemyApiKey}
    accounts: [`0x${mainnetPrivateKey}`],
    gasPrice: 60000000000, // 60 Gwei
  };
}

module.exports = config;
