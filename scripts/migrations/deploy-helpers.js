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
  await contract.deployed();

  if (isPublicNetwork) {
    await contract.deployTransaction.wait(5);
  }

  console.log(`Deployed contract at ${contract.address}`);
}

async function tryVerifyContract(contract, constructorArgs) {
  const explorer = [56, 97].includes(contract.deployTransaction.chainId) ? "BscScan" : "Etherscan";

  try {
    console.log(`Verifying the contract ${contract.address} on ${explorer} ...`);

    await hre.ethers.provider.waitForTransaction(contract.deployTransaction.hash, 5, 180000);
    await hre.run("verify:verify", {
      address: contract.address,
      constructorArguments: constructorArgs,
    });

    return true;
  } catch (err) {
    console.error(`An error has occurred during verifying on ${explorer}:\n`, err);

    const network = hre.network.name;
    const quotedConstructorArgs = constructorArgs.map(
      (x) =>
        `"${
          x.toString().includes("[object Object]")
            ? JSON.stringify(x).replace(/"/g, '\\"')
            : x.toString().replace(/"/g, '\\"')
        }"`
    );
    const verifyCommand = `npx hardhat verify --network ${network} ${contract.address} ${quotedConstructorArgs.join(
      " "
    )}`;

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
