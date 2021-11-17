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

  let saleTokenAddress;
  let vestingSchedule;
  let vestingAdmin;
  let isPublicNetwork = true;

  console.log(`Network: ${network}`);

  if (network === "bsc-mainnet") {
    vestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("50"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 30,
      gapDays: 0,
      numberOfIntervals: 1,
      releaseMethod: 0, // IntervalEnd
      allowAccumulate: true,
    };

    saleTokenAddress = process.env.BSC_MAINNET_SALE_TOKEN_ADDRESS;
    vestingAdmin = process.env.BSC_MAINNET_VESTING_ADMIN;
  } else if (network === "bsc-testnet") {
    vestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("50"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 1,
      releaseMethod: 0, // IntervalEnd
      allowAccumulate: true,
    };

    saleTokenAddress = process.env.BSC_TESTNET_SALE_TOKEN_ADDRESS;
    vestingAdmin = process.env.BSC_TESTNET_VESTING_ADMIN;
  } else if (network === "mainnet") {
    vestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("50"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 30,
      gapDays: 0,
      numberOfIntervals: 1,
      releaseMethod: 0, // IntervalEnd
      allowAccumulate: true,
    };

    saleTokenAddress = process.env.MAINNET_SALE_TOKEN_ADDRESS;
    vestingAdmin = process.env.MAINNET_VESTING_ADMIN;
  } else if (network === "ropsten") {
    vestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("50"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 1,
      releaseMethod: 0, // IntervalEnd
      allowAccumulate: true,
    };

    saleTokenAddress = process.env.ROPSTEN_SALE_TOKEN_ADDRESS;
    vestingAdmin = process.env.ROPSTEN_VESTING_ADMIN;
  } else if (network === "kovan") {
  } else if (network === "polygon-mainnet") {
    vestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("50"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 30,
      gapDays: 0,
      numberOfIntervals: 1,
      releaseMethod: 0, // IntervalEnd
      allowAccumulate: true,
    };

    saleTokenAddress = process.env.POLYGON_MAINNET_SALE_TOKEN_ADDRESS;
    vestingAdmin = process.env.POLYGON_MAINNET_VESTING_ADMIN;
  } else if (network === "polygon-mumbai") {
    vestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("50"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 1,
      releaseMethod: 0, // IntervalEnd
      allowAccumulate: true,
    };

    saleTokenAddress = process.env.POLYGON_MUMBAI_SALE_TOKEN_ADDRESS;
    vestingAdmin = process.env.POLYGON_MUMBAI_VESTING_ADMIN;
  } else if (network === "localhost") {
    isPublicNetwork = false;

    vestingSchedule = {
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
  } else {
    throw new Error(`Unknown network: ${network}`);
  }

  if (vestingSchedule === undefined) {
    throw new Error("Unknown vesting schedule");
  } else if (saleTokenAddress === undefined) {
    throw new Error("Unknown sale token address");
  } else if (vestingAdmin === undefined) {
    throw new Error("Unknown vesting admin");
  }

  // We get the contract to deploy
  const Vesting = await hre.ethers.getContractFactory("Vesting");

  const vestingArgs = [
    saleTokenAddress,
    vestingSchedule.cliffDurationDays,
    vestingSchedule.percentReleaseAtScheduleStart,
    vestingSchedule.percentReleaseForEachInterval,
    vestingSchedule.intervalDays,
    vestingSchedule.gapDays,
    vestingSchedule.numberOfIntervals,
    vestingSchedule.releaseMethod,
    vestingSchedule.allowAccumulate,
  ];
  const vestingContract = await deployHelper.deployContract(Vesting, vestingArgs, true);

  await deployHelper.contractDeployed(vestingContract, isPublicNetwork);

  console.log("Vesting (Guaranteed & FCFS):", vestingContract.address);

  // Post Deployment Setup
  console.log("Post Deployment Setup");
  await vestingContract.setVestingAdmin(vestingAdmin);

  // Verify contract source code if deployed to public network
  if (isPublicNetwork) {
    console.log("Verify Contracts");

    await deployHelper.tryVerifyContract(vestingContract, vestingArgs);
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
