const fs = require("fs").promises;
const path = require("path");
const hre = require("hardhat");

async function deployContract(contractFactory, constructorArgs, logConstructorArgs) {
  const contract = await contractFactory.deploy(...constructorArgs);

  if (logConstructorArgs) {
    console.log(`Constructor arguments for contract at ${contract.address}:`);
    constructorArgs.forEach((x) =>
      console.log(`  - ${x.toString().includes("[object Object]") ? JSON.stringify(x) : x.toString()}`)
    );
  }

  return contract;
}

async function contractDeployed(contract, isPublicNetwork) {
  console.log(`Waiting for contract deployment at ${contract.address}`);
  await contract.deployed();

  if (isPublicNetwork) {
    console.log(`Waiting for 5 confirmations of contract at ${contract.address}`);
    await contract.deployTransaction.wait(5);
  }

  console.log(`Deployed contract at ${contract.address}`);
}

async function tryVerifyContract(contract, constructorArgs) {
  let explorer;
  let numberOfConfirmations;

  switch (contract.deployTransaction.chainId) {
    case 56:
      explorer = "BscScan";
      numberOfConfirmations = 300;
      break;
    case 97:
      explorer = "BscScan";
      numberOfConfirmations = 5;
      break;
    case 137:
      explorer = "Polygonscan";
      numberOfConfirmations = 60;
      break;
    case 80001:
      explorer = "Polygonscan";
      numberOfConfirmations = 5;
      break;
    default:
      explorer = "Etherscan";
      numberOfConfirmations = 5;
      break;
  }

  try {
    console.log(
      `Verifying the contract ${contract.address} on ${explorer} after ${numberOfConfirmations} confirmations ...`
    );

    await hre.ethers.provider.waitForTransaction(contract.deployTransaction.hash, numberOfConfirmations, 1800000); // 30 mins timeout for 300 confirmations in BSC mainnet at 3s block time
    await hre.run("verify:verify", {
      address: contract.address,
      constructorArguments: constructorArgs,
    });

    return true;
  } catch (err) {
    const REASON_ALREADY_VERIFIED = "Reason: Already Verified";
    if (err.toString().includes(REASON_ALREADY_VERIFIED)) {
      console.log(REASON_ALREADY_VERIFIED);
      return true;
    }

    console.error(`An error has occurred during verifying on ${explorer}:\n`, err);

    const network = hre.network.name;

    let verifyCommand;

    if (constructorArgs.toString().includes("[object Object]")) {
      const projectArtifactsDirPath = hre.config.paths.artifacts;
      const projectConstructorArgsDirPath = path.join(projectArtifactsDirPath, "constructorArgs");
      const projectConstructorArgsFilePath = path.join(projectConstructorArgsDirPath, `${contract.address}.js`);

      try {
        await fs.mkdir(projectConstructorArgsDirPath);
      } catch (err) {
        if (err.errno === -17 && err.code === "EEXIST") {
          console.log(`${projectConstructorArgsDirPath} exists`);
        } else {
          console.error(`Error while creating directory ${projectConstructorArgsDirPath}:\n`, err);
        }
      }

      await fs.writeFile(
        projectConstructorArgsFilePath,
        `module.exports = ${JSON.stringify(constructorArgs, null, 4)};`,
        "utf8"
      );

      verifyCommand = `npx hardhat verify --network ${network} --constructor-args ${projectConstructorArgsFilePath} ${contract.address}`;
    } else {
      const quotedConstructorArgs = constructorArgs.map((x) => `"${x.toString().replace(/"/g, '\\"')}"`);
      verifyCommand = `npx hardhat verify --network ${network} ${contract.address} ${quotedConstructorArgs.join(" ")}`;
    }

    console.log(
      [
        `Failed to verify on ${explorer}, please run the following command to verify manually:`,
        "--------------------",
        verifyCommand,
        "--------------------",
      ].join("\n")
    );

    return false;
  }
}

module.exports = {
  deployContract,
  contractDeployed,
  tryVerifyContract,
};
