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

  const publicTokenAmount = hre.ethers.utils.parseEther("31250000"); // for Enjinstarter Lottery Guaranteed Crowdsale

  const crowdsalePaymentDecimal = 6;
  const crowdsaleRate = hre.ethers.utils.parseEther("0.008");
  const crowdsaleLotSize = BigNumber.from("50000"); // USD400 worth of tokens being sold
  const crowdsaleMaxLots = BigNumber.from("1"); // max 1 lot (USD400 worth of tokens being sold equivalent to 50000 tokens)
  const crowdsaleTokenCap = publicTokenAmount;

  let publicVestingSchedule;
  let ejsTokenAddress;
  let whitelistAddress;
  let vestingAdmin;
  let crowdsaleAdmin;
  let crowdsaleWallet;
  let crowdsalePaymentTokensInfo;
  let crowdsaleOpeningTime;
  let crowdsaleClosingTime;
  let isPublicNetwork = true;

  console.log(`Network: ${network}`);

  if (network === "mainnet") {
    publicVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("50"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 30,
      gapDays: 0,
      numberOfIntervals: 1,
      releaseMethod: 0, // IntervalEnd
      allowAccumulate: true,
    };

    ejsTokenAddress = process.env.MAINNET_EJS_TOKEN_ADDRESS;
    whitelistAddress = process.env.MAINNET_WHITELIST_ADDRESS;
    vestingAdmin = process.env.MAINNET_VESTING_ADMIN;
    crowdsaleAdmin = process.env.MAINNET_CROWDSALE_ADMIN;
    crowdsaleWallet = process.env.MAINNET_CROWDSALE_WALLET;

    crowdsalePaymentTokensInfo = [
      {
        // USDC
        paymentToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
      {
        // USDT
        paymentToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
    ];

    crowdsaleOpeningTime = 1632974400; // 30 Sep 2021 12:00 PM GMT+8
    crowdsaleClosingTime = 1633060800; // 1 Oct 2021 12:00 PM GMT+8
  } else if (network === "ropsten") {
    publicVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("50"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 1,
      releaseMethod: 0, // IntervalEnd
      allowAccumulate: true,
    };

    ejsTokenAddress = process.env.ROPSTEN_EJS_TOKEN_ADDRESS;
    whitelistAddress = process.env.ROPSTEN_WHITELIST_ADDRESS;
    vestingAdmin = process.env.ROPSTEN_VESTING_ADMIN;
    crowdsaleAdmin = process.env.ROPSTEN_CROWDSALE_ADMIN;
    crowdsaleWallet = process.env.ROPSTEN_CROWDSALE_WALLET;

    crowdsalePaymentTokensInfo = [
      {
        // USDC
        paymentToken: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
      {
        // USDT
        paymentToken: "0x110a13FC3efE6A245B50102D2d79B3E76125Ae83",
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
    ];

    crowdsaleOpeningTime = Math.floor((Date.now() + 30 * 60 * 1000) / 1000); // open 30 mins later
    crowdsaleClosingTime = crowdsaleOpeningTime + 5 * 24 * 60 * 60; // close 5 days after open
  } else if (network === "kovan") {
    crowdsaleWallet = process.env.KOVAN_CROWDSALE_WALLET;
  } else if (network === "localhost") {
    isPublicNetwork = false;

    publicVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("50"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 1,
      releaseMethod: 0, // IntervalEnd
      allowAccumulate: true,
    };

    vestingAdmin = accounts[1].address;
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
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
      {
        paymentToken: usdtMockContract.address,
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
    ];

    crowdsaleOpeningTime = Math.floor((Date.now() + 10 * 60 * 1000) / 1000); // open 10 mins later
    crowdsaleClosingTime = crowdsaleOpeningTime + 60 * 60; // close 1 hour after open
  } else {
    throw new Error(`Unknown network: ${network}`);
  }

  if (publicVestingSchedule === undefined) {
    throw new Error("Unknown public vesting schedule");
  } else if (ejsTokenAddress === undefined) {
    throw new Error("Unknown EJS token address");
  } else if (whitelistAddress === undefined) {
    throw new Error("Unknown whitelist address");
  } else if (vestingAdmin === undefined) {
    throw new Error("Unknown vesting admin");
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

  const EjsToken = await hre.ethers.getContractFactory("EjsToken");
  const ejsTokenContract = EjsToken.attach(ejsTokenAddress);

  const Whitelist = await hre.ethers.getContractFactory("Whitelist");
  const whitelistContract = Whitelist.attach(whitelistAddress);

  // We get the contract to deploy
  const Vesting = await hre.ethers.getContractFactory("Vesting");
  const EjsCrowdsale = await hre.ethers.getContractFactory("EjsCrowdsale");

  const publicVestingArgs = [
    ejsTokenContract.address,
    publicVestingSchedule.cliffDurationDays,
    publicVestingSchedule.percentReleaseAtScheduleStart,
    publicVestingSchedule.percentReleaseForEachInterval,
    publicVestingSchedule.intervalDays,
    publicVestingSchedule.gapDays,
    publicVestingSchedule.numberOfIntervals,
    publicVestingSchedule.releaseMethod,
    publicVestingSchedule.allowAccumulate,
  ];
  const publicVestingContract = await deployHelper.deployContract(Vesting, publicVestingArgs, true);

  const crowdsaleInfo = {
    tokenCap: crowdsaleTokenCap,
    vestingContract: publicVestingContract.address,
    whitelistContract: whitelistContract.address,
  };

  const crowdsaleLotsInfo = {
    lotSize: crowdsaleLotSize,
    maxLots: crowdsaleMaxLots,
  };

  const crowdsaleTimeframe = {
    openingTime: crowdsaleOpeningTime,
    closingTime: crowdsaleClosingTime,
  };

  const ejsCrowdsaleArgs = [
    crowdsaleWallet,
    ejsTokenContract.address,
    crowdsaleInfo,
    crowdsaleLotsInfo,
    crowdsaleTimeframe,
    crowdsalePaymentTokensInfo,
  ];
  const ejsCrowdsaleContract = await deployHelper.deployContract(EjsCrowdsale, ejsCrowdsaleArgs, true);

  await deployHelper.contractDeployed(publicVestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(ejsCrowdsaleContract, isPublicNetwork);

  console.log("Public Vesting:", publicVestingContract.address);
  console.log("EJS Crowdsale:", ejsCrowdsaleContract.address);

  // Verify contract source code if deployed to public network
  if (isPublicNetwork) {
    console.log("Verify Contracts");

    await deployHelper.tryVerifyContract(publicVestingContract, publicVestingArgs);
    await deployHelper.tryVerifyContract(ejsCrowdsaleContract, ejsCrowdsaleArgs);
  }

  // Post Deployment Setup
  console.log("Post Deployment Setup");
  await ejsTokenContract.mint(publicVestingContract.address, publicTokenAmount);
  await ejsTokenContract.setMinterAccount(ejsCrowdsaleContract.address);

  await publicVestingContract.setVestingAdmin(ejsCrowdsaleContract.address);

  await ejsCrowdsaleContract.setCrowdsaleAdmin(crowdsaleAdmin);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
