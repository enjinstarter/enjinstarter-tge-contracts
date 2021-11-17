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

  let airdropVestingSchedule;
  let ejsTokenAddress;
  let vestingAdmin;
  let isPublicNetwork = true;

  console.log(`Network: ${network}`);

  if (network === "bsc-mainnet") {
    airdropVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("100"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("0"),
      intervalDays: 0,
      gapDays: 1,
      numberOfIntervals: 0,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    ejsTokenAddress = process.env.BSC_MAINNET_EJS_TOKEN_ADDRESS;
    vestingAdmin = process.env.BSC_MAINNET_VESTING_ADMIN;
  } else if (network === "bsc-testnet") {
    airdropVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("100"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("0"),
      intervalDays: 0,
      gapDays: 1,
      numberOfIntervals: 0,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    ejsTokenAddress = process.env.BSC_TESTNET_EJS_TOKEN_ADDRESS;
    vestingAdmin = process.env.BSC_TESTNET_VESTING_ADMIN;
  } else if (network === "mainnet") {
    airdropVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("100"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("0"),
      intervalDays: 0,
      gapDays: 1,
      numberOfIntervals: 0,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    ejsTokenAddress = process.env.MAINNET_EJS_TOKEN_ADDRESS;
    vestingAdmin = process.env.MAINNET_VESTING_ADMIN;
  } else if (network === "ropsten") {
    airdropVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("100"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("0"),
      intervalDays: 0,
      gapDays: 1,
      numberOfIntervals: 0,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    ejsTokenAddress = process.env.ROPSTEN_EJS_TOKEN_ADDRESS;
    vestingAdmin = process.env.ROPSTEN_VESTING_ADMIN;
  } else if (network === "kovan") {
  } else if (network === "localhost") {
    isPublicNetwork = false;

    airdropVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("100"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("0"),
      intervalDays: 0,
      gapDays: 1,
      numberOfIntervals: 0,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    vestingAdmin = accounts[1].address;
  } else {
    throw new Error(`Unknown network: ${network}`);
  }

  if (airdropVestingSchedule === undefined) {
    throw new Error("Unknown airdrop vesting schedule");
  } else if (ejsTokenAddress === undefined) {
    throw new Error("Unknown EJS token address");
  } else if (vestingAdmin === undefined) {
    throw new Error("Unknown vesting admin");
  }

  const EjsToken = await hre.ethers.getContractFactory("EjsToken");
  const ejsTokenContract = EjsToken.attach(ejsTokenAddress);

  // We get the contract to deploy
  const Vesting = await hre.ethers.getContractFactory("Vesting");

  const airdropVestingArgs = [
    ejsTokenContract.address,
    airdropVestingSchedule.cliffDurationDays,
    airdropVestingSchedule.percentReleaseAtScheduleStart,
    airdropVestingSchedule.percentReleaseForEachInterval,
    airdropVestingSchedule.intervalDays,
    airdropVestingSchedule.gapDays,
    airdropVestingSchedule.numberOfIntervals,
    airdropVestingSchedule.releaseMethod,
    airdropVestingSchedule.allowAccumulate,
  ];
  const airdropVestingContract = await deployHelper.deployContract(Vesting, airdropVestingArgs, true);

  await deployHelper.contractDeployed(airdropVestingContract, isPublicNetwork);

  console.log("Airdrop Vesting:", airdropVestingContract.address);

  // Verify contract source code if deployed to public network
  if (isPublicNetwork) {
    console.log("Verify Contracts");

    await deployHelper.tryVerifyContract(airdropVestingContract, airdropVestingArgs);
  }

  // Post Deployment Setup
  console.log("Post Deployment Setup");
  await airdropVestingContract.setVestingAdmin(vestingAdmin);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
