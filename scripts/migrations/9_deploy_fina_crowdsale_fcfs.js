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

  const publicTokenAmount = hre.ethers.utils.parseEther("62500"); // 25% of USD100k worth of FINA tokens at USD0.4 each plus remainder from guaranteed round for FCFS round

  const crowdsalePaymentDecimal = 6;
  const crowdsaleRate = hre.ethers.utils.parseEther("0.4");
  const crowdsaleLotSize = BigNumber.from("1"); // dummy value for max lot size
  const crowdsaleMaxLots = BigNumber.from("1"); // max 1 lot
  const crowdsaleTokenCap = publicTokenAmount;

  const minTokenHoldAmount = hre.ethers.utils.parseEther("1");

  let ejsTokenAddress;
  let finaWhitelistAddress;
  let crowdsaleAdmin;
  let crowdsaleWallet;
  let crowdsalePaymentTokensInfo;
  let crowdsaleOpeningTime;
  let crowdsaleClosingTime;
  let isPublicNetwork = true;

  console.log(`Network: ${network}`);

  if (network === "mainnet") {
    ejsTokenAddress = process.env.MAINNET_EJS_TOKEN_ADDRESS;
    finaWhitelistAddress = process.env.MAINNET_FINA_WHITELIST_ADDRESS;
    crowdsaleAdmin = process.env.MAINNET_FINA_CROWDSALE_ADMIN;
    crowdsaleWallet = process.env.MAINNET_FINA_CROWDSALE_WALLET;

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

    crowdsaleOpeningTime = 1633939200; // 11 Oct 2021 04:00 PM GMT+8
    crowdsaleClosingTime = 1633942800; // 11 Oct 2021 05:00 PM GMT+8
  } else if (network === "ropsten") {
    ejsTokenAddress = process.env.ROPSTEN_EJS_TOKEN_ADDRESS;
    finaWhitelistAddress = process.env.ROPSTEN_FINA_WHITELIST_ADDRESS;
    crowdsaleAdmin = process.env.ROPSTEN_FINA_CROWDSALE_ADMIN;
    crowdsaleWallet = process.env.ROPSTEN_FINA_CROWDSALE_WALLET;

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
    crowdsaleWallet = process.env.KOVAN_FINA_CROWDSALE_WALLET;
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

  if (ejsTokenAddress === undefined) {
    throw new Error("Unknown EJS token address");
  } else if (finaWhitelistAddress === undefined) {
    throw new Error("Unknown FINA whitelist address");
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

  const FinaWhitelist = await hre.ethers.getContractFactory("FinaWhitelist");
  const finaWhitelistContract = FinaWhitelist.attach(finaWhitelistAddress);

  // We get the contract to deploy
  const FinaCrowdsale = await hre.ethers.getContractFactory("FinaCrowdsale");

  const crowdsaleInfo = {
    tokenCap: crowdsaleTokenCap,
    whitelistContract: finaWhitelistContract.address,
    tokenHold: ejsTokenContract.address,
    minTokenHoldAmount: minTokenHoldAmount,
  };

  const crowdsaleLotsInfo = {
    lotSize: crowdsaleLotSize,
    maxLots: crowdsaleMaxLots,
  };

  const crowdsaleTimeframe = {
    openingTime: crowdsaleOpeningTime,
    closingTime: crowdsaleClosingTime,
  };

  const finaCrowdsaleArgs = [
    crowdsaleWallet,
    crowdsaleInfo,
    crowdsaleLotsInfo,
    crowdsaleTimeframe,
    crowdsalePaymentTokensInfo,
  ];
  const finaCrowdsaleContract = await deployHelper.deployContract(FinaCrowdsale, finaCrowdsaleArgs, true);

  await deployHelper.contractDeployed(finaCrowdsaleContract, isPublicNetwork);

  console.log("FINA Crowdsale (FCFS):", finaCrowdsaleContract.address);

  // Verify contract source code if deployed to public network
  if (isPublicNetwork) {
    console.log("Verify Contracts");

    await deployHelper.tryVerifyContract(finaCrowdsaleContract, finaCrowdsaleArgs);
  }

  // Post Deployment Setup
  console.log("Post Deployment Setup");
  await finaCrowdsaleContract.setCrowdsaleAdmin(crowdsaleAdmin);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
