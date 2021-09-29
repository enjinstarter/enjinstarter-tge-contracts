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

  const seedTokenAmount = hre.ethers.utils.parseEther("500000000");
  const strategicTokenAmount = hre.ethers.utils.parseEther("512500000");
  const private1TokenAmount = hre.ethers.utils.parseEther("625000000");
  const private2TokenAmount = hre.ethers.utils.parseEther("166666667");
  const teamTokenAmount = hre.ethers.utils.parseEther("750000000");
  const companyReservesTokenAmount = hre.ethers.utils.parseEther("983333333");
  const communityRewardsTokenAmount = hre.ethers.utils.parseEther("1000000000");
  const ecosystemFundTokenAmount = hre.ethers.utils.parseEther("400000000");

  let seedVestingSchedule;
  let strategicVestingSchedule;
  let private1VestingSchedule;
  let private2VestingSchedule;
  let teamVestingSchedule;
  let companyReservesVestingSchedule;
  let communityRewardsVestingSchedule;
  let ecosystemFundVestingSchedule;
  let ejsTokenAddress;
  let vestingAdmin;
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
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("50"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 90,
      gapDays: 0,
      numberOfIntervals: 1,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    communityRewardsVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("4"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("4"),
      intervalDays: 30,
      gapDays: 0,
      numberOfIntervals: 24,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    ecosystemFundVestingSchedule = {
      cliffDurationDays: 30,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 30,
      gapDays: 0,
      numberOfIntervals: 2,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    ejsTokenAddress = process.env.MAINNET_EJS_TOKEN_ADDRESS;
    vestingAdmin = process.env.MAINNET_VESTING_ADMIN;
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
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("50"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 3,
      gapDays: 0,
      numberOfIntervals: 1,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    communityRewardsVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("4"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("4"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 24,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    ecosystemFundVestingSchedule = {
      cliffDurationDays: 1,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 2,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    ejsTokenAddress = process.env.ROPSTEN_EJS_TOKEN_ADDRESS;
    vestingAdmin = process.env.ROPSTEN_VESTING_ADMIN;
  } else if (network === "kovan") {
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
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("50"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 3,
      gapDays: 0,
      numberOfIntervals: 1,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    communityRewardsVestingSchedule = {
      cliffDurationDays: 0,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("4"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("4"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 24,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    ecosystemFundVestingSchedule = {
      cliffDurationDays: 1,
      percentReleaseAtScheduleStart: hre.ethers.utils.parseEther("0"),
      percentReleaseForEachInterval: hre.ethers.utils.parseEther("50"),
      intervalDays: 1,
      gapDays: 0,
      numberOfIntervals: 2,
      releaseMethod: 1, // LinearlyPerSecond
      allowAccumulate: false,
    };

    vestingAdmin = accounts[1].address;
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
  } else if (teamVestingSchedule === undefined) {
    throw new Error("Unknown team vesting schedule");
  } else if (companyReservesVestingSchedule === undefined) {
    throw new Error("Unknown company reserves vesting schedule");
  } else if (communityRewardsVestingSchedule === undefined) {
    throw new Error("Unknown community rewards vesting schedule");
  } else if (ecosystemFundVestingSchedule === undefined) {
    throw new Error("Unknown ecosystem fund vesting schedule");
  } else if (ejsTokenAddress === undefined) {
    throw new Error("Unknown EJS token address");
  } else if (vestingAdmin === undefined) {
    throw new Error("Unknown vesting admin");
  }

  const EjsToken = await hre.ethers.getContractFactory("EjsToken");
  const ejsTokenContract = EjsToken.attach(ejsTokenAddress);

  // We get the contract to deploy
  const Vesting = await hre.ethers.getContractFactory("Vesting");

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

  await deployHelper.contractDeployed(seedVestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(strategicVestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(private1VestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(private2VestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(teamVestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(companyReservesVestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(communityRewardsVestingContract, isPublicNetwork);
  await deployHelper.contractDeployed(ecosystemFundVestingContract, isPublicNetwork);

  console.log("Seed Vesting:", seedVestingContract.address);
  console.log("Strategic Vesting:", strategicVestingContract.address);
  console.log("Private 1 Vesting:", private1VestingContract.address);
  console.log("Private 2 Vesting:", private2VestingContract.address);
  console.log("Team Vesting:", teamVestingContract.address);
  console.log("Company Reserves Vesting:", companyReservesVestingContract.address);
  console.log("Community Rewards Vesting:", communityRewardsVestingContract.address);
  console.log("Ecosystem Fund Vesting:", ecosystemFundVestingContract.address);

  // Verify contract source code if deployed to public network
  if (isPublicNetwork) {
    console.log("Verify Contracts");

    await deployHelper.tryVerifyContract(seedVestingContract, seedVestingArgs);
    await deployHelper.tryVerifyContract(strategicVestingContract, strategicVestingArgs);
    await deployHelper.tryVerifyContract(private1VestingContract, private1VestingArgs);
    await deployHelper.tryVerifyContract(private2VestingContract, private2VestingArgs);
    await deployHelper.tryVerifyContract(teamVestingContract, teamVestingArgs);
    await deployHelper.tryVerifyContract(companyReservesVestingContract, companyReservesVestingArgs);
    await deployHelper.tryVerifyContract(communityRewardsVestingContract, communityRewardsVestingArgs);
    await deployHelper.tryVerifyContract(ecosystemFundVestingContract, ecosystemFundVestingArgs);
  }

  // Post Deployment Setup
  console.log("Post Deployment Setup");
  await ejsTokenContract.mint(seedVestingContract.address, seedTokenAmount);
  await ejsTokenContract.mint(strategicVestingContract.address, strategicTokenAmount);
  await ejsTokenContract.mint(private1VestingContract.address, private1TokenAmount);
  await ejsTokenContract.mint(private2VestingContract.address, private2TokenAmount);
  await ejsTokenContract.mint(teamVestingContract.address, teamTokenAmount);
  await ejsTokenContract.mint(companyReservesVestingContract.address, companyReservesTokenAmount);
  await ejsTokenContract.mint(communityRewardsVestingContract.address, communityRewardsTokenAmount);
  await ejsTokenContract.mint(ecosystemFundVestingContract.address, ecosystemFundTokenAmount);

  await seedVestingContract.setVestingAdmin(vestingAdmin);
  await strategicVestingContract.setVestingAdmin(vestingAdmin);
  await private1VestingContract.setVestingAdmin(vestingAdmin);
  await private2VestingContract.setVestingAdmin(vestingAdmin);
  await teamVestingContract.setVestingAdmin(vestingAdmin);
  await companyReservesVestingContract.setVestingAdmin(vestingAdmin);
  await communityRewardsVestingContract.setVestingAdmin(vestingAdmin);
  await ecosystemFundVestingContract.setVestingAdmin(vestingAdmin);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
