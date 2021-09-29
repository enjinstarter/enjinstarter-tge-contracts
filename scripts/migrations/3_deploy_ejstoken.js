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

  const tokenName = "Enjinstarter";
  const tokenSymbol = "EJS";
  const tokenCap = hre.ethers.utils.parseEther("5000000000");

  const genesisShardsTokenAmount = hre.ethers.utils.parseEther("6250000");

  let genesisShardsWallet;
  let isPublicNetwork = true;

  console.log(`Network: ${network}`);

  if (network === "mainnet") {
    genesisShardsWallet = process.env.MAINNET_GENESIS_SHARDS_WALLET;
  } else if (network === "ropsten") {
    genesisShardsWallet = process.env.ROPSTEN_GENESIS_SHARDS_WALLET;
  } else if (network === "kovan") {
  } else if (network === "localhost") {
    isPublicNetwork = false;
    genesisShardsWallet = accounts[5].address;
  } else {
    throw new Error(`Unknown network: ${network}`);
  }

  if (genesisShardsWallet === undefined) {
    throw new Error("Unknown Genesis Shards wallet");
  }

  // We get the contract to deploy
  const EjsToken = await hre.ethers.getContractFactory("EjsToken");

  const ejsTokenArgs = [tokenName, tokenSymbol, tokenCap];
  const ejsTokenContract = await deployHelper.deployContract(EjsToken, ejsTokenArgs, true);

  await deployHelper.contractDeployed(ejsTokenContract, isPublicNetwork);

  console.log("EJS Token:", ejsTokenContract.address);

  // Verify contract source code if deployed to public network
  if (isPublicNetwork) {
    console.log("Verify Contracts");

    await deployHelper.tryVerifyContract(ejsTokenContract, ejsTokenArgs);
  }

  // Post Deployment Setup
  console.log("Post Deployment Setup");
  await ejsTokenContract.mint(genesisShardsWallet, genesisShardsTokenAmount);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
