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

  const tokenName = "EnjinStarter";
  const tokenSymbol = "EJS";
  const tokenCap = hre.ethers.utils.parseEther("5000000000");

  const seedTokenAmount = hre.ethers.utils.parseEther("500000000");
  const strategicTokenAmount = hre.ethers.utils.parseEther("250000000");
  const private1TokenAmount = hre.ethers.utils.parseEther("250000000");
  const private2TokenAmount = hre.ethers.utils.parseEther("250000000");
  const publicTokenAmount = hre.ethers.utils.parseEther("100000000");
  const teamTokenAmount = hre.ethers.utils.parseEther("750000000");
  const companyReservesTokenAmount = hre.ethers.utils.parseEther("1000000000");
  const communityRewardsTokenAmount = hre.ethers.utils.parseEther("1500000000");
  const ecosystemFundTokenAmount = hre.ethers.utils.parseEther("400000000");

  const crowdsalePaymentDecimal = 6;
  const crowdsaleRate = hre.ethers.utils.parseEther("0.008");
  const crowdsaleLotSize = BigNumber.from("25000"); // USD200 worth of tokens being sold
  const crowdsaleMaxLots = BigNumber.from("20"); // max 20 lots (USD4000 worth of tokens being sold equivalent to 500000 tokens)
  const crowdsaleTokenCap = publicTokenAmount;

  let seedVestingSchedule;
  let strategicVestingSchedule;
  let private1VestingSchedule;
  let private2VestingSchedule;
  let publicVestingSchedule;
  let teamVestingSchedule;
  let companyReservesVestingSchedule;
  let communityRewardsVestingSchedule;
  let ecosystemFundVestingSchedule;
  let vestingAdmin;
  let whitelistAdmin;
  let crowdsaleAdmin;
  let crowdsaleWallet;
  let crowdsalePaymentTokensInfo;
  let crowdsaleOpeningTime;
  let crowdsaleClosingTime;
  let isPublicNetwork = true;

  console.log(`Network: ${network}`);

  if (network === "mainnet") {
    seedVestingSchedule = {
      cliffDurationDays: 30,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("10"),
      intervalDays: 30,
      gapDays: 0,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    strategicVestingSchedule = {
      cliffDurationDays: 30,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("10"),
      intervalDays: 30,
      gapDays: 0,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    private1VestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("5"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("9.5"),
      intervalDays: 30,
      gapDays: 0,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    private2VestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("10"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("9"),
      intervalDays: 30,
      gapDays: 0,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

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

    teamVestingSchedule = {
      cliffDurationDays: 180,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("20"),
      intervalDays: 30,
      gapDays: 60,
      numberOfIntervals: 5,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    companyReservesVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("10"),
      intervalDays: 30,
      gapDays: 60,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    communityRewardsVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("4"),
      intervalDays: 30,
      gapDays: 0,
      numberOfIntervals: 25,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    ecosystemFundVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("4"),
      intervalDays: 30,
      gapDays: 0,
      numberOfIntervals: 25,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    vestingAdmin = process.env.MAINNET_VESTING_ADMIN;
    whitelistAdmin = process.env.MAINNET_WHITELIST_ADMIN;
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
  } else if (network === "ropsten") {
    seedVestingSchedule = {
      cliffDurationDays: 1,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("10"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    strategicVestingSchedule = {
      cliffDurationDays: 1,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("10"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    private1VestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("5"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("9.5"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    private2VestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("10"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("9"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

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

    teamVestingSchedule = {
      cliffDurationDays: 6,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("20"),
      intervalDays: 1,
      gapDays: 2,
      numberOfIntervals: 5,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    companyReservesVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("10"),
      intervalDays: 1,
      gapDays: 2,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    communityRewardsVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("4"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 25,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    ecosystemFundVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("4"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 25,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    vestingAdmin = process.env.ROPSTEN_VESTING_ADMIN;
    whitelistAdmin = process.env.ROPSTEN_WHITELIST_ADMIN;
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

    seedVestingSchedule = {
      cliffDurationDays: 1,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("10"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    strategicVestingSchedule = {
      cliffDurationDays: 1,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("10"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    private1VestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("5"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("9.5"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    private2VestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("10"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("9"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

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

    teamVestingSchedule = {
      cliffDurationDays: 6,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("20"),
      intervalDays: 1,
      gapDays: 2,
      numberOfIntervals: 5,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    companyReservesVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("10"),
      intervalDays: 1,
      gapDays: 2,
      numberOfIntervals: 10,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    communityRewardsVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("4"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 25,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    ecosystemFundVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("4"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 25,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    vestingAdmin = accounts[1].address;
    whitelistAdmin = accounts[2].address;
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

  if (seedVestingSchedule === undefined) {
    throw new Error("Unknown seed vesting schedule");
  } else if (strategicVestingSchedule === undefined) {
    throw new Error("Unknown strategic vesting schedule");
  } else if (private1VestingSchedule === undefined) {
    throw new Error("Unknown private 1 vesting schedule");
  } else if (private2VestingSchedule === undefined) {
    throw new Error("Unknown private 2 vesting schedule");
  } else if (publicVestingSchedule === undefined) {
    throw new Error("Unknown public vesting schedule");
  } else if (teamVestingSchedule === undefined) {
    throw new Error("Unknown team vesting schedule");
  } else if (companyReservesVestingSchedule === undefined) {
    throw new Error("Unknown company reserves vesting schedule");
  } else if (communityRewardsVestingSchedule === undefined) {
    throw new Error("Unknown community rewards vesting schedule");
  } else if (ecosystemFundVestingSchedule === undefined) {
    throw new Error("Unknown ecosystem fund vesting schedule");
  } else if (vestingAdmin == undefined) {
    throw new Error("Unknown vesting admin");
  } else if (whitelistAdmin == undefined) {
    throw new Error("Unknown whitelist admin");
  } else if (crowdsaleAdmin == undefined) {
    throw new Error("Unknown crowdsale admin");
  } else if (crowdsaleWallet == undefined) {
    throw new Error("Unknown crowdsale wallet");
  } else if (crowdsalePaymentTokensInfo === undefined) {
    throw new Error("Unknown payment tokens info");
  } else if (crowdsaleOpeningTime === undefined) {
    throw new Error("Unknown crowdsale opening time");
  } else if (crowdsaleClosingTime === undefined) {
    throw new Error("Unknown crowdsale closing time");
  }

  // We get the contract to deploy
  const EjsToken = await hre.ethers.getContractFactory("EjsToken");
  const Vesting = await hre.ethers.getContractFactory("Vesting");
  const Whitelist = await hre.ethers.getContractFactory("Whitelist");
  const EjsCrowdsale = await hre.ethers.getContractFactory("EjsCrowdsale");

  const ejsTokenArgs = [tokenName, tokenSymbol, tokenCap];
  const ejsTokenContract = await deployHelper.deployContract(EjsToken, ejsTokenArgs, true);

  const seedVestingArgs = [
    ejsTokenContract.address,
    seedVestingSchedule.cliffDurationDays,
    seedVestingSchedule.percentReleaseAtScheduleStart,
    seedVestingSchedule.percentReleaseForEachInterval,
    seedVestingSchedule.intervalDays,
    seedVestingSchedule.gapDays,
    seedVestingSchedule.numberOfIntervals,
    seedVestingSchedule.releaseMethod,
    seedVestingSchedule.allowAccumulate,
  ];
  const seedVestingContract = await deployHelper.deployContract(Vesting, seedVestingArgs, true);

  const strategicVestingArgs = [
    ejsTokenContract.address,
    strategicVestingSchedule.cliffDurationDays,
    strategicVestingSchedule.percentReleaseAtScheduleStart,
    strategicVestingSchedule.percentReleaseForEachInterval,
    strategicVestingSchedule.intervalDays,
    strategicVestingSchedule.gapDays,
    strategicVestingSchedule.numberOfIntervals,
    strategicVestingSchedule.releaseMethod,
    strategicVestingSchedule.allowAccumulate,
  ];
  const strategicVestingContract = await deployHelper.deployContract(Vesting, strategicVestingArgs, true);

  const private1VestingArgs = [
    ejsTokenContract.address,
    private1VestingSchedule.cliffDurationDays,
    private1VestingSchedule.percentReleaseAtScheduleStart,
    private1VestingSchedule.percentReleaseForEachInterval,
    private1VestingSchedule.intervalDays,
    private1VestingSchedule.gapDays,
    private1VestingSchedule.numberOfIntervals,
    private1VestingSchedule.releaseMethod,
    private1VestingSchedule.allowAccumulate,
  ];
  const private1VestingContract = await deployHelper.deployContract(Vesting, private1VestingArgs, true);

  const private2VestingArgs = [
    ejsTokenContract.address,
    private2VestingSchedule.cliffDurationDays,
    private2VestingSchedule.percentReleaseAtScheduleStart,
    private2VestingSchedule.percentReleaseForEachInterval,
    private2VestingSchedule.intervalDays,
    private2VestingSchedule.gapDays,
    private2VestingSchedule.numberOfIntervals,
    private2VestingSchedule.releaseMethod,
    private2VestingSchedule.allowAccumulate,
  ];
  const private2VestingContract = await deployHelper.deployContract(Vesting, private2VestingArgs, true);

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

  const teamVestingArgs = [
    ejsTokenContract.address,
    teamVestingSchedule.cliffDurationDays,
    teamVestingSchedule.percentReleaseAtScheduleStart,
    teamVestingSchedule.percentReleaseForEachInterval,
    teamVestingSchedule.intervalDays,
    teamVestingSchedule.gapDays,
    teamVestingSchedule.numberOfIntervals,
    teamVestingSchedule.releaseMethod,
    teamVestingSchedule.allowAccumulate,
  ];
  const teamVestingContract = await deployHelper.deployContract(Vesting, teamVestingArgs, true);

  const companyReservesVestingArgs = [
    ejsTokenContract.address,
    companyReservesVestingSchedule.cliffDurationDays,
    companyReservesVestingSchedule.percentReleaseAtScheduleStart,
    companyReservesVestingSchedule.percentReleaseForEachInterval,
    companyReservesVestingSchedule.intervalDays,
    companyReservesVestingSchedule.gapDays,
    companyReservesVestingSchedule.numberOfIntervals,
    companyReservesVestingSchedule.releaseMethod,
    companyReservesVestingSchedule.allowAccumulate,
  ];
  const companyReservesVestingContract = await deployHelper.deployContract(Vesting, companyReservesVestingArgs, true);

  const communityRewardsVestingArgs = [
    ejsTokenContract.address,
    communityRewardsVestingSchedule.cliffDurationDays,
    communityRewardsVestingSchedule.percentReleaseAtScheduleStart,
    communityRewardsVestingSchedule.percentReleaseForEachInterval,
    communityRewardsVestingSchedule.intervalDays,
    communityRewardsVestingSchedule.gapDays,
    communityRewardsVestingSchedule.numberOfIntervals,
    communityRewardsVestingSchedule.releaseMethod,
    communityRewardsVestingSchedule.allowAccumulate,
  ];
  const communityRewardsVestingContract = await deployHelper.deployContract(Vesting, communityRewardsVestingArgs, true);

  const ecosystemFundVestingArgs = [
    ejsTokenContract.address,
    ecosystemFundVestingSchedule.cliffDurationDays,
    ecosystemFundVestingSchedule.percentReleaseAtScheduleStart,
    ecosystemFundVestingSchedule.percentReleaseForEachInterval,
    ecosystemFundVestingSchedule.intervalDays,
    ecosystemFundVestingSchedule.gapDays,
    ecosystemFundVestingSchedule.numberOfIntervals,
    ecosystemFundVestingSchedule.releaseMethod,
    ecosystemFundVestingSchedule.allowAccumulate,
  ];
  const ecosystemFundVestingContract = await deployHelper.deployContract(Vesting, ecosystemFundVestingArgs, true);

  const whitelistArgs = [];
  const whitelistContract = await deployHelper.deployContract(Whitelist, whitelistArgs, true);

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

  await deployHelper.contractDeployed(ejsTokenContract, isPublicNetwork);
  await deployHelper.contractDeployed(seedVestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(strategicVestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(private1VestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(private2VestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(publicVestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(teamVestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(companyReservesVestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(communityRewardsVestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(ecosystemFundVestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(whitelistContract, isPublicNetwork);
  await deployHelper.contractDeployed(ejsCrowdsaleContract, isPublicNetwork);

  console.log("EJS Token:", ejsTokenContract.address);
  console.log("Seed Vesting:", seedVestingContract.address);
  console.log("Strategic Vesting:", strategicVestingContract.address);
  console.log("Private 1 Vesting:", private1VestingContract.address);
  console.log("Private 2 Vesting:", private2VestingContract.address);
  console.log("Public Vesting:", publicVestingContract.address);
  console.log("Team Vesting:", teamVestingContract.address);
  console.log("Company Reserves Vesting:", companyReservesVestingContract.address);
  console.log("Community Rewards Vesting:", communityRewardsVestingContract.address);
  console.log("Ecosystem Fund Vesting:", ecosystemFundVestingContract.address);
  console.log("Whitelist:", whitelistContract.address);
  console.log("EJS Crowdsale:", ejsCrowdsaleContract.address);

  // Post Deployment Setup
  console.log("Post Deployment Setup");
  await ejsTokenContract.mint(seedVestingContract.address, seedTokenAmount);
  await ejsTokenContract.mint(strategicVestingContract.address, strategicTokenAmount);
  await ejsTokenContract.mint(private1VestingContract.address, private1TokenAmount);
  await ejsTokenContract.mint(private2VestingContract.address, private2TokenAmount);
  await ejsTokenContract.mint(publicVestingContract.address, publicTokenAmount);
  await ejsTokenContract.mint(teamVestingContract.address, teamTokenAmount);
  await ejsTokenContract.mint(companyReservesVestingContract.address, companyReservesTokenAmount);
  await ejsTokenContract.mint(communityRewardsVestingContract.address, communityRewardsTokenAmount);
  await ejsTokenContract.mint(ecosystemFundVestingContract.address, ecosystemFundTokenAmount);
  await ejsTokenContract.setMinterAccount(ejsCrowdsaleContract.address);

  await seedVestingContract.setVestingAdmin(vestingAdmin);
  await strategicVestingContract.setVestingAdmin(vestingAdmin);
  await private1VestingContract.setVestingAdmin(vestingAdmin);
  await private2VestingContract.setVestingAdmin(vestingAdmin);
  await publicVestingContract.setVestingAdmin(ejsCrowdsaleContract.address);
  await teamVestingContract.setVestingAdmin(vestingAdmin);
  await companyReservesVestingContract.setVestingAdmin(vestingAdmin);
  await communityRewardsVestingContract.setVestingAdmin(vestingAdmin);
  await ecosystemFundVestingContract.setVestingAdmin(vestingAdmin);

  await whitelistContract.setWhitelistAdmin(whitelistAdmin);
  await ejsCrowdsaleContract.setCrowdsaleAdmin(crowdsaleAdmin);

  // Verify contract source code if deployed to public network
  if (isPublicNetwork) {
    console.log("Verify Contracts");

    await deployHelper.tryVerifyContract(ejsTokenContract, ejsTokenArgs);
    await deployHelper.tryVerifyContract(seedVestingContract, seedVestingArgs);
    await deployHelper.tryVerifyContract(strategicVestingContract, strategicVestingArgs);
    await deployHelper.tryVerifyContract(private1VestingContract, private1VestingArgs);
    await deployHelper.tryVerifyContract(private2VestingContract, private2VestingArgs);
    await deployHelper.tryVerifyContract(publicVestingContract, publicVestingArgs);
    await deployHelper.tryVerifyContract(teamVestingContract, teamVestingArgs);
    await deployHelper.tryVerifyContract(companyReservesVestingContract, companyReservesVestingArgs);
    await deployHelper.tryVerifyContract(communityRewardsVestingContract, communityRewardsVestingArgs);
    await deployHelper.tryVerifyContract(ecosystemFundVestingContract, ecosystemFundVestingArgs);
    await deployHelper.tryVerifyContract(whitelistContract, whitelistArgs);
    await deployHelper.tryVerifyContract(ejsCrowdsaleContract, ejsCrowdsaleArgs);
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
