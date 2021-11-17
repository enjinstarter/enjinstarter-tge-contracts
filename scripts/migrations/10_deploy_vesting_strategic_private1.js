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

  let strategicVestingSchedule;
  let private1VestingSchedule;
  let ejsTokenAddress;
  let vestingAdmin;
  let isPublicNetwork = true;

  console.log(`Network: ${network}`);

  if (network === "mainnet") {
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

    ejsTokenAddress = process.env.MAINNET_EJS_TOKEN_ADDRESS;
    vestingAdmin = process.env.MAINNET_VESTING_ADMIN;
  } else if (network === "ropsten") {
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

    ejsTokenAddress = process.env.ROPSTEN_EJS_TOKEN_ADDRESS;
    vestingAdmin = process.env.ROPSTEN_VESTING_ADMIN;
  } else if (network === "kovan") {
  } else if (network === "localhost") {
    isPublicNetwork = false;

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

    vestingAdmin = accounts[1].address;
  } else {
    throw new Error(`Unknown network: ${network}`);
  }

  if (strategicVestingSchedule === undefined) {
    throw new Error("Unknown strategic vesting schedule");
  } else if (private1VestingSchedule === undefined) {
    throw new Error("Unknown private 1 vesting schedule");
  } else if (ejsTokenAddress === undefined) {
    throw new Error("Unknown EJS token address");
  } else if (vestingAdmin === undefined) {
    throw new Error("Unknown vesting admin");
  }

  const EjsToken = await hre.ethers.getContractFactory("EjsToken");
  const ejsTokenContract = EjsToken.attach(ejsTokenAddress);

  // We get the contract to deploy
  const Vesting = await hre.ethers.getContractFactory("Vesting");

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

  await deployHelper.contractDeployed(strategicVestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(private1VestingContract, isPublicNetwork);

  console.log("Strategic Vesting:", strategicVestingContract.address);
  console.log("Private 1 Vesting:", private1VestingContract.address);

  // Verify contract source code if deployed to public network
  if (isPublicNetwork) {
    console.log("Verify Contracts");

    await deployHelper.tryVerifyContract(strategicVestingContract, strategicVestingArgs);
    await deployHelper.tryVerifyContract(private1VestingContract, private1VestingArgs);
  }

  // Post Deployment Setup
  console.log("Post Deployment Setup");
  await strategicVestingContract.setVestingAdmin(vestingAdmin);
  await private1VestingContract.setVestingAdmin(vestingAdmin);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
