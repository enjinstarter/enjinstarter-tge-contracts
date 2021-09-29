const hre = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");

const BIGNUMBER_ZERO = BigNumber.from("0");
const BN = web3.utils.BN;
const BN_ZERO = new BN("0");
const BN_ONE = new BN("1");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function ether(ether) {
  return new BN(web3.utils.toWei(ether, "ether"));
}

function wei(wei) {
  return new BN(web3.utils.fromWei(wei, "wei"));
}

async function getBlockTimestamp(blockHashOrBlockNumber) {
  const block = await web3.eth.getBlock(blockHashOrBlockNumber);
  return new BN(block.timestamp);
}

function bnAbsDiff(bn1, bn2) {
  return bn1.gt(bn2) ? bn1.sub(bn2) : bn2.sub(bn1);
}

function bnAbsDiffLte(bn1, bn2, bnMaxDiff) {
  const absDiff = bnAbsDiff(bn1, bn2);
  return absDiff.lte(bnMaxDiff);
}

async function newEjsToken(tokenName, tokenSymbol, tokenCap) {
  const accounts = await web3.eth.getAccounts();

  const defaults = {
    tokenName: "EnjinStarter",
    tokenSymbol: "EJS",
    tokenCap: ether("5000000000"),
  };

  const tokenNameValue = await getValueOrDefault(tokenName, () => defaults.tokenName);
  const tokenSymbolValue = await getValueOrDefault(tokenSymbol, () => defaults.tokenSymbol);
  const tokenCapValue = await getValueOrDefault(tokenCap, () => defaults.tokenCap);

  const EjsToken = artifacts.require("EjsToken");
  return await EjsToken.new(tokenNameValue, tokenSymbolValue, tokenCapValue);
}

async function newVesting(
  tokenAddress,
  cliffDurationDays,
  percentReleaseAtScheduleStart,
  percentReleaseForEachInterval,
  intervalDays,
  gapDays,
  numberOfIntervals,
  releaseMethod,
  allowAccumulate
) {
  const defaults = {
    cliffDurationDays: new BN("30"),
    percentReleaseAtScheduleStart: BN_ZERO,
    percentReleaseForEachInterval: ether("10"),
    intervalDays: new BN("30"),
    gapDays: new BN("0"),
    numberOfIntervals: new BN("10"),
    releaseMethod: new BN("1"), // LinearlyPerSecond
    allowAccumulate: false,
  };

  const cliffDurationDaysValue = await getValueOrDefault(cliffDurationDays, () => defaults.cliffDurationDays);
  const percentReleaseAtScheduleStartValue = await getValueOrDefault(
    percentReleaseAtScheduleStart,
    () => defaults.percentReleaseAtScheduleStart
  );
  const percentReleaseForEachIntervalValue = await getValueOrDefault(
    percentReleaseForEachInterval,
    () => defaults.percentReleaseForEachInterval
  );
  const intervalDaysValue = await getValueOrDefault(intervalDays, () => defaults.intervalDays);
  const gapDaysValue = await getValueOrDefault(gapDays, () => defaults.gapDays);
  const numberOfIntervalsValue = await getValueOrDefault(numberOfIntervals, () => defaults.numberOfIntervals);
  const releaseMethodValue = await getValueOrDefault(releaseMethod, () => defaults.releaseMethod);
  const allowAccumulateValue = await getValueOrDefault(allowAccumulate, () => defaults.allowAccumulate);

  const Vesting = artifacts.require("Vesting");
  return await Vesting.new(
    tokenAddress,
    cliffDurationDaysValue,
    percentReleaseAtScheduleStartValue,
    percentReleaseForEachIntervalValue,
    intervalDaysValue,
    gapDaysValue,
    numberOfIntervalsValue,
    releaseMethodValue,
    allowAccumulateValue
  );
}

async function newWhitelist() {
  const Whitelist = artifacts.require("Whitelist");
  return await Whitelist.new();
}

async function newEjsCrowdsale(
  wallet,
  tokenSelling,
  crowdsaleInfo, // { tokenCap, vestingContract, whitelistContract }
  timeframe, // { openingTime, closingTime }
  paymentTokensInfo, // { paymentToken, paymentDecimal, rate }
  lotsInfo // { lotSize, maxLots }
) {
  const defaults = {
    lotSize: BigNumber.from("25000"), // USD200 worth of tokens being sold
    maxLots: BigNumber.from("10"),
  };

  const lotsInfoValue = await getValueOrDefault(lotsInfo, () => {
    return {
      lotSize: defaults.lotSize,
      maxLots: defaults.maxLots,
    };
  });

  const EjsCrowdsale = artifacts.require("EjsCrowdsale");
  return await EjsCrowdsale.new(wallet, tokenSelling, crowdsaleInfo, lotsInfoValue, timeframe, paymentTokensInfo);
}

async function newIndividuallyCappedCrowdsaleHelper(tokenCap) {
  const defaults = {
    tokenCap: BigNumber.from("250000"), // max 10 lots (USD2000 worth of tokens being sold equivalent to 250000 tokens)
  };

  const tokenCapValue = await getValueOrDefault(tokenCap, () => defaults.tokenCap);

  const IndividuallyCappedCrowdsaleHelper = artifacts.require("IndividuallyCappedCrowdsaleHelper");
  return await IndividuallyCappedCrowdsaleHelper.new(tokenCapValue);
}

async function newUsdcMock(
  newMasterMinter,
  newPauser,
  newBlacklister,
  newOwner,
  lostAndFound,
  newName,
  tokenDecimals,
  tokenName,
  tokenSymbol,
  tokenCurrency
) {
  const defaults = {
    newName: "USD Coin",
    tokenCurrency: "USD",
    tokenDecimals: new BN("6"),
    tokenName: "USD Coin",
    tokenSymbol: "USDC",
  };

  const FiatTokenV2_1 = artifacts.require("FiatTokenV2_1");
  const newNameValue = await getValueOrDefault(newName, () => defaults.newName);
  const tokenCurrencyValue = await getValueOrDefault(tokenCurrency, () => defaults.tokenCurrency);
  const tokenDecimalsValue = await getValueOrDefault(tokenDecimals, () => defaults.tokenDecimals);
  const tokenNameValue = await getValueOrDefault(tokenName, () => defaults.tokenName);
  const tokenSymbolValue = await getValueOrDefault(tokenSymbol, () => defaults.tokenSymbol);

  return await FiatTokenV2_1.new(
    tokenNameValue,
    tokenSymbolValue,
    tokenCurrencyValue,
    tokenDecimalsValue,
    newMasterMinter,
    newPauser,
    newBlacklister,
    newOwner,
    newNameValue,
    lostAndFound
  );
}

async function newUsdtMock(initialSupply, decimals, tokenName, tokenSymbol) {
  const defaults = {
    decimals: new BN("6"),
    initialSupply: new BN("30912401959975130"),
    tokenName: "Tether USD",
    tokenSymbol: "USDT",
  };

  const TetherToken = artifacts.require("TetherToken");
  const decimalsValue = await getValueOrDefault(decimals, () => defaults.decimals);
  const initialSupplyValue = await getValueOrDefault(initialSupply, () => defaults.initialSupply);
  const tokenNameValue = await getValueOrDefault(tokenName, () => defaults.tokenName);
  const tokenSymbolValue = await getValueOrDefault(tokenSymbol, () => defaults.tokenSymbol);

  return await TetherToken.new(initialSupplyValue, tokenNameValue, tokenSymbolValue, decimalsValue);
}

async function getValueOrDefault(value, defaultAsyncFn) {
  if (value !== undefined) {
    return value;
  } else {
    return await defaultAsyncFn();
  }
}

module.exports = {
  BIGNUMBER_ZERO,
  BN,
  BN_ZERO,
  BN_ONE,
  ZERO_ADDRESS,
  ether,
  wei,
  getBlockTimestamp,
  bnAbsDiff,
  bnAbsDiffLte,
  newEjsToken,
  newVesting,
  newWhitelist,
  newEjsCrowdsale,
  newIndividuallyCappedCrowdsaleHelper,
  newUsdcMock,
  newUsdtMock,
};
