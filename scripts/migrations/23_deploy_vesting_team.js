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

  let teamVestingSchedule;
  let ejsTokenAddress;
  let vestingAdmin;
  let isPublicNetwork = true;

  console.log(`Network: ${network}`);

  if (network === "mainnet") {
    teamVestingSchedule = {
      cliffDurationDays: 141, // only for scheduleStartTimestamp = 1636621500
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("20"),
      intervalDays: 30,
      gapDays: 60,
      numberOfIntervals: 5,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    ejsTokenAddress = process.env.MAINNET_EJS_TOKEN_ADDRESS;
    vestingAdmin = process.env.MAINNET_VESTING_ADMIN;
  } else if (network === "ropsten") {
    teamVestingSchedule = {
      cliffDurationDays: 5,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("20"),
      intervalDays: 1,
      gapDays: 2,
      numberOfIntervals: 5,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    ejsTokenAddress = process.env.ROPSTEN_EJS_TOKEN_ADDRESS;
    vestingAdmin = process.env.ROPSTEN_VESTING_ADMIN;
  } else if (network === "kovan") {
  } else if (network === "localhost") {
    isPublicNetwork = false;

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

    vestingAdmin = accounts[1].address;
  } else {
    throw new Error(`Unknown network: ${network}`);
  }

  if (teamVestingSchedule === undefined) {
    throw new Error("Unknown team vesting schedule");
  } else if (ejsTokenAddress === undefined) {
    throw new Error("Unknown EJS token address");
  } else if (vestingAdmin === undefined) {
    throw new Error("Unknown vesting admin");
  }

  const EjsToken = await hre.ethers.getContractFactory("EjsToken");
  const ejsTokenContract = EjsToken.attach(ejsTokenAddress);

  // We get the contract to deploy
  const Vesting = await hre.ethers.getContractFactory("Vesting");

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

  await deployHelper.contractDeployed(teamVestingContract, isPublicNetwork);

  console.log("Team Vesting:", teamVestingContract.address);

  // Post Deployment Setup
  console.log("Post Deployment Setup");
  await teamVestingContract.setVestingAdmin(vestingAdmin);

  // Verify contract source code if deployed to public network
  if (isPublicNetwork) {
    console.log("Verify Contracts");

    await deployHelper.tryVerifyContract(teamVestingContract, teamVestingArgs);
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
