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

  let whitelistAdmin;
  let isPublicNetwork = true;

  console.log(`Network: ${network}`);

  if (network === "bsc-mainnet") {
    whitelistAdmin = process.env.BSC_MAINNET_LAUNCHPAD_WHITELIST_ADMIN;
  } else if (network === "bsc-testnet") {
    whitelistAdmin = process.env.BSC_TESTNET_LAUNCHPAD_WHITELIST_ADMIN;
  } else if (network === "mainnet") {
    whitelistAdmin = process.env.MAINNET_LAUNCHPAD_WHITELIST_ADMIN;
  } else if (network === "ropsten") {
    whitelistAdmin = process.env.ROPSTEN_LAUNCHPAD_WHITELIST_ADMIN;
  } else if (network === "kovan") {
  } else if (network === "polygon-mainnet") {
    whitelistAdmin = process.env.POLYGON_MAINNET_LAUNCHPAD_WHITELIST_ADMIN;
  } else if (network === "polygon-mumbai") {
    whitelistAdmin = process.env.POLYGON_MUMBAI_LAUNCHPAD_WHITELIST_ADMIN;
  } else if (network === "localhost") {
    isPublicNetwork = false;

    whitelistAdmin = accounts[2].address;
  } else {
    throw new Error(`Unknown network: ${network}`);
  }

  if (whitelistAdmin === undefined) {
    throw new Error("Unknown whitelist admin");
  }

  // We get the contract to deploy
  const LaunchpadWhitelist = await hre.ethers.getContractFactory("LaunchpadWhitelist");

  const launchpadWhitelistArgs = [];
  const launchpadWhitelistContract = await deployHelper.deployContract(
    LaunchpadWhitelist,
    launchpadWhitelistArgs,
    true
  );

  await deployHelper.contractDeployed(launchpadWhitelistContract, isPublicNetwork);

  console.log("LaunchpadWhitelist:", launchpadWhitelistContract.address);

  // Verify contract source code if deployed to public network
  if (isPublicNetwork) {
    console.log("Verify Contracts");

    await deployHelper.tryVerifyContract(launchpadWhitelistContract, launchpadWhitelistArgs);
  }

  // Post Deployment Setup
  console.log("Post Deployment Setup");
  await launchpadWhitelistContract.setWhitelistAdmin(whitelistAdmin);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
