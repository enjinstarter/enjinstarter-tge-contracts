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

  let isPublicNetwork = true;

  console.log(`Network: ${network}`);

  if (network === "bsc-testnet") {
  } else if (network === "ropsten") {
  } else if (network === "kovan") {
  } else if (network === "polygon-mumbai") {
  } else if (network === "localhost") {
    isPublicNetwork = false;
  } else {
    throw new Error(`Unknown network: ${network}`);
  }

  // We get the contract to deploy
  const SaleTokenMock = await hre.ethers.getContractFactory("SaleTokenMock");

  const saleTokenMockArgs = [];
  const saleTokenMockContract = await deployHelper.deployContract(SaleTokenMock, saleTokenMockArgs, true);

  await deployHelper.contractDeployed(saleTokenMockContract, isPublicNetwork);

  console.log("Sale Token Mock:", saleTokenMockContract.address);

  // Verify contract source code if deployed to public network
  if (isPublicNetwork) {
    console.log("Verify Contracts");

    await deployHelper.tryVerifyContract(saleTokenMockContract, saleTokenMockArgs);
  }

  // Post Deployment Setup
  console.log("Post Deployment Setup");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
