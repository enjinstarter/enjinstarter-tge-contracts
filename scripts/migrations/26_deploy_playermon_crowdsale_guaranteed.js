// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const deployHelper = require("./deploy-helpers");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const network = hre.network.name;
  const accounts = await hre.ethers.getSigners();

  const publicTokenAmount = hre.ethers.utils.parseEther("236.84210526"); // USD9 worth of sale tokens at USD0.038 each for guaranteed round

  const crowdsaleRate = hre.ethers.utils.parseEther("0.038");
  const crowdsaleLotSize = BigNumber.from("1"); // dummy value for max lot size
  const crowdsaleMaxLots = BigNumber.from("1"); // max 1 lot
  const crowdsaleTokenCap = publicTokenAmount;

  let launchpadWhitelistAddress;
  let crowdsaleAdmin;
  let crowdsaleWallet;
  let crowdsalePaymentTokensInfo;
  let crowdsaleOpeningTime;
  let crowdsaleClosingTime;
  let isPublicNetwork = true;

  console.log(`Network: ${network}`);

  if (network === "bsc-mainnet") {
    launchpadWhitelistAddress = process.env.BSC_MAINNET_LAUNCHPAD_WHITELIST_ADDRESS;
    crowdsaleAdmin = process.env.BSC_MAINNET_LAUNCHPAD_CROWDSALE_ADMIN;
    crowdsaleWallet = process.env.BSC_MAINNET_LAUNCHPAD_CROWDSALE_WALLET;

    crowdsalePaymentTokensInfo = [
      {
        // BUSD
        paymentToken: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
        paymentDecimal: 18,
        rate: crowdsaleRate,
      },
    ];

    crowdsaleOpeningTime = 1637305200; // 19 Nov 2021 03:00 PM GMT+8
    crowdsaleClosingTime = 1637319600; // 19 Nov 2021 07:00 PM GMT+8
  } else if (network === "bsc-testnet") {
    launchpadWhitelistAddress = process.env.BSC_TESTNET_LAUNCHPAD_WHITELIST_ADDRESS;
    crowdsaleAdmin = process.env.BSC_TESTNET_LAUNCHPAD_CROWDSALE_ADMIN;
    crowdsaleWallet = process.env.BSC_TESTNET_LAUNCHPAD_CROWDSALE_WALLET;

    crowdsalePaymentTokensInfo = [
      {
        // BUSD
        paymentToken: "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee",
        paymentDecimal: 18,
        rate: crowdsaleRate,
      },
    ];

    crowdsaleOpeningTime = Math.floor((Date.now() + 30 * 60 * 1000) / 1000); // open 30 mins later
    crowdsaleClosingTime = crowdsaleOpeningTime + 2 * 24 * 60 * 60; // close 2 days after open
  } else if (network === "mainnet") {
    launchpadWhitelistAddress = process.env.MAINNET_LAUNCHPAD_WHITELIST_ADDRESS;
    crowdsaleAdmin = process.env.MAINNET_LAUNCHPAD_CROWDSALE_ADMIN;
    crowdsaleWallet = process.env.MAINNET_LAUNCHPAD_CROWDSALE_WALLET;

    crowdsalePaymentTokensInfo = [
      {
        // USDC
        paymentToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        paymentDecimal: 6,
        rate: crowdsaleRate,
      },
      {
        // USDT
        paymentToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        paymentDecimal: 6,
        rate: crowdsaleRate,
      },
    ];

    crowdsaleOpeningTime = 1637305200; // 19 Nov 2021 03:00 PM GMT+8
    crowdsaleClosingTime = 1637319600; // 19 Nov 2021 07:00 PM GMT+8
  } else if (network === "ropsten") {
    launchpadWhitelistAddress = process.env.ROPSTEN_LAUNCHPAD_WHITELIST_ADDRESS;
    crowdsaleAdmin = process.env.ROPSTEN_LAUNCHPAD_CROWDSALE_ADMIN;
    crowdsaleWallet = process.env.ROPSTEN_LAUNCHPAD_CROWDSALE_WALLET;

    crowdsalePaymentTokensInfo = [
      {
        // USDC
        paymentToken: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
        paymentDecimal: 6,
        rate: crowdsaleRate,
      },
      {
        // USDT
        paymentToken: "0x110a13FC3efE6A245B50102D2d79B3E76125Ae83",
        paymentDecimal: 6,
        rate: crowdsaleRate,
      },
    ];

    crowdsaleOpeningTime = Math.floor((Date.now() + 30 * 60 * 1000) / 1000); // open 30 mins later
    crowdsaleClosingTime = crowdsaleOpeningTime + 2 * 24 * 60 * 60; // close 2 days after open
  } else if (network === "kovan") {
    crowdsaleWallet = process.env.KOVAN_LAUNCHPAD_CROWDSALE_WALLET;
  } else if (network === "localhost") {
    isPublicNetwork = false;

    crowdsaleAdmin = accounts[3].address;
    crowdsaleWallet = accounts[4].address;

    const usdcMockTokenName = "USD Coin";
    const usdcMockTokenSymbol = "USDC";
    const usdcMockCurrency = "USD";
    const usdcMockDecimals = 6;
    const usdcMockMasterMinter = accounts[0].address;
    const usdcMockPauser = accounts[0].address;
    const usdcMockBlacklister = accounts[0].address;
    const usdcMockOwner = accounts[0].address;
    const usdcMockLostAndFound = accounts[0].address;
    const UsdcMock = await hre.ethers.getContractFactory("FiatTokenV2_1");
    const usdcMockArguments = [
      usdcMockTokenName,
      usdcMockTokenSymbol,
      usdcMockCurrency,
      usdcMockDecimals,
      usdcMockMasterMinter,
      usdcMockPauser,
      usdcMockBlacklister,
      usdcMockOwner,
      usdcMockTokenName,
      usdcMockLostAndFound,
    ];
    const usdcMockContract = await deployHelper.deployContract(UsdcMock, usdcMockArguments, false);
    await usdcMockContract.deployed();

    const usdtMockInitialSupply = hre.ethers.utils.parseEther("30912401959975130");
    const usdtMockTokenName = "Tether USD";
    const usdtMockTokenSymbol = "USDT";
    const usdtMockDecimals = 6;
    const UsdtMock = await hre.ethers.getContractFactory("TetherToken");
    const usdtMockArguments = [usdtMockInitialSupply, usdtMockTokenName, usdtMockTokenSymbol, usdtMockDecimals];
    const usdtMockContract = await deployHelper.deployContract(UsdtMock, usdtMockArguments, false);
    await usdtMockContract.deployed();

    crowdsalePaymentTokensInfo = [
      {
        paymentToken: usdcMockContract.address,
        paymentDecimal: usdcMockDecimals,
        rate: crowdsaleRate,
      },
      {
        paymentToken: usdtMockContract.address,
        paymentDecimal: usdtMockDecimals,
        rate: crowdsaleRate,
      },
    ];

    crowdsaleOpeningTime = Math.floor((Date.now() + 10 * 60 * 1000) / 1000); // open 10 mins later
    crowdsaleClosingTime = crowdsaleOpeningTime + 60 * 60; // close 1 hour after open
  } else {
    throw new Error(`Unknown network: ${network}`);
  }

  if (launchpadWhitelistAddress === undefined) {
    throw new Error("Unknown whitelist address");
  } else if (crowdsaleAdmin === undefined) {
    throw new Error("Unknown crowdsale admin");
  } else if (crowdsaleWallet === undefined) {
    throw new Error("Unknown crowdsale wallet");
  } else if (crowdsalePaymentTokensInfo === undefined) {
    throw new Error("Unknown payment tokens info");
  } else if (crowdsaleOpeningTime === undefined) {
    throw new Error("Unknown crowdsale opening time");
  } else if (crowdsaleClosingTime === undefined) {
    throw new Error("Unknown crowdsale closing time");
  }

  const LaunchpadWhitelist = await hre.ethers.getContractFactory("LaunchpadWhitelist");
  const launchpadWhitelistContract = LaunchpadWhitelist.attach(launchpadWhitelistAddress);

  // We get the contract to deploy
  const LaunchpadCrowdsale = await hre.ethers.getContractFactory("LaunchpadCrowdsale");

  const crowdsaleInfo = {
    tokenCap: crowdsaleTokenCap,
    whitelistContract: launchpadWhitelistContract.address,
  };

  const crowdsaleLotsInfo = {
    lotSize: crowdsaleLotSize,
    maxLots: crowdsaleMaxLots,
  };

  const crowdsaleTimeframe = {
    openingTime: crowdsaleOpeningTime,
    closingTime: crowdsaleClosingTime,
  };

  const launchpadCrowdsaleArgs = [
    crowdsaleWallet,
    crowdsaleInfo,
    crowdsaleLotsInfo,
    crowdsaleTimeframe,
    crowdsalePaymentTokensInfo,
  ];
  const launchpadCrowdsaleContract = await deployHelper.deployContract(
    LaunchpadCrowdsale,
    launchpadCrowdsaleArgs,
    true
  );

  await deployHelper.contractDeployed(launchpadCrowdsaleContract, isPublicNetwork);

  console.log("Crowdsale (Guaranteed):", launchpadCrowdsaleContract.address);

  // Post Deployment Setup
  console.log("Post Deployment Setup");
  await launchpadCrowdsaleContract.setCrowdsaleAdmin(crowdsaleAdmin);

  // Verify contract source code if deployed to public network
  if (isPublicNetwork) {
    console.log("Verify Contracts");

    await deployHelper.tryVerifyContract(launchpadCrowdsaleContract, launchpadCrowdsaleArgs);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
