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

  if (network === "mainnet") {
    whitelistAdmin = process.env.MAINNET_WHITELIST_ADMIN;
  } else if (network === "ropsten") {
    whitelistAdmin = process.env.ROPSTEN_WHITELIST_ADMIN;
  } else if (network === "kovan") {
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
  const Whitelist = await hre.ethers.getContractFactory("Whitelist");

  const whitelistArgs = [];
  const whitelistContract = await deployHelper.deployContract(Whitelist, whitelistArgs, true);

  await deployHelper.contractDeployed(whitelistContract, isPublicNetwork);

  console.log("Whitelist:", whitelistContract.address);

  // Verify contract source code if deployed to public network
  if (isPublicNetwork) {
    console.log("Verify Contracts");

    await deployHelper.tryVerifyContract(whitelistContract, whitelistArgs);
  }

  // Post Deployment Setup
  console.log("Post Deployment Setup");
  await whitelistContract.setWhitelistAdmin(whitelistAdmin);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
