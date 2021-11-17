const assert = require("assert");
const hre = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const timeMachine = require("ganache-time-traveler");
const { expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");
const { BIGNUMBER_ZERO, BN, BN_ZERO, BN_ONE, ZERO_ADDRESS, ether, ...testHelpers } = require("./test-helpers");

describe("LaunchpadCrowdsale", () => {
  const BN_TEN_POW_EIGHTEEN = new BN("10").pow(new BN("18"));
  const TOKEN_SELLING_SCALE = ether("1");
  const MAX_NUM_PAYMENT_TOKENS = 10;
  const LOT_SIZE = 25000;
  const MAX_LOTS = 1;
  const MIN_TOKEN_HOLD_AMOUNT = "1";
  const PUBLIC_TOKEN_AMOUNT = "18750000";
  const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

  const publicTokenAmount = ether(PUBLIC_TOKEN_AMOUNT);
  const crowdsalePaymentDecimal = BigNumber.from("6");
  const crowdsaleRate = hre.ethers.utils.parseEther("0.008");
  const crowdsaleLotSize = BigNumber.from(LOT_SIZE); // USD200 worth of tokens being sold
  const crowdsaleMaxLots = BigNumber.from(MAX_LOTS);
  const defaultBuyWhitelistAmount = ether("244902.109484826044317000");

  let accounts;
  let defaultBuyAccount;
  let defaultCrowdsaleInfo;
  let defaultCrowdsaleClosingTime;
  let defaultCrowdsaleOpeningTime;
  let defaultGovernanceAccount;
  let defaultCrowdsaleAdmin;
  let defaultPaymentTokensInfo;
  let defaultTimeframe;
  let defaultWallet;
  let launchpadCrowdsale;
  let ejsToken;
  let snapshotId;
  let usdtMock;
  let launchpadWhitelist;

  before(async () => {
    const snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];

    accounts = await web3.eth.getAccounts();

    // console.log(`accounts.length=${accounts.length}`);

    defaultGovernanceAccount = accounts[0];
    defaultCrowdsaleAdmin = accounts[1];
    defaultWallet = accounts[2];
    defaultBuyAccount = accounts[5];
  });

  after(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  beforeEach(async () => {
    ejsToken = await testHelpers.newEjsToken();

    usdcMock = await testHelpers.newUsdcMock(
      defaultGovernanceAccount,
      defaultGovernanceAccount,
      defaultGovernanceAccount,
      defaultGovernanceAccount,
      defaultGovernanceAccount
    );
    usdtMock = await testHelpers.newUsdtMock();
    launchpadWhitelist = await testHelpers.newLaunchpadWhitelist();
    defaultCrowdsaleInfo = {
      tokenCap: hre.ethers.utils.parseEther(PUBLIC_TOKEN_AMOUNT),
      whitelistContract: launchpadWhitelist.address,
      // tokenHold: ejsToken.address,
      // minTokenHoldAmount: hre.ethers.utils.parseEther(MIN_TOKEN_HOLD_AMOUNT),
    };
    const latestBlockTimestamp = await time.latest();
    defaultCrowdsaleOpeningTime = latestBlockTimestamp.add(time.duration.minutes(30));
    defaultCrowdsaleClosingTime = defaultCrowdsaleOpeningTime.add(time.duration.hours(1));
    defaultTimeframe = {
      openingTime: BigNumber.from(defaultCrowdsaleOpeningTime.toString(10)),
      closingTime: BigNumber.from(defaultCrowdsaleClosingTime.toString(10)),
    };
    defaultPaymentTokensInfo = [
      {
        paymentToken: usdcMock.address,
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
      {
        paymentToken: usdtMock.address,
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
    ];
    launchpadCrowdsale = await testHelpers.newLaunchpadCrowdsale(
      defaultWallet,
      defaultCrowdsaleInfo,
      defaultTimeframe,
      defaultPaymentTokensInfo
    );

    const minterAccount = defaultGovernanceAccount;
    const minterAllowedAmount = new BN("800000000000"); // max 200 accounts multiply by max 20 lots (USD4000 worth of tokens being sold equivalent to 500000 tokens) in 6 decimal places
    const configureMinterSuccess = await usdcMock.configureMinter(minterAccount, minterAllowedAmount, {
      from: defaultGovernanceAccount,
    });
    if (!configureMinterSuccess) {
      throw new Error(`Failed to configure minter: account=${minterAccount}, amount=${minterAllowedAmount}`);
    }

    await launchpadWhitelist.addWhitelisted(defaultBuyAccount, defaultBuyWhitelistAmount, {
      from: defaultGovernanceAccount,
    });
    await launchpadCrowdsale.setCrowdsaleAdmin(defaultCrowdsaleAdmin, { from: defaultGovernanceAccount });
  });

  it("should be initialized correctly", async () => {
    const expectTokenSelling = DEAD_ADDRESS;
    const expectWallet = defaultWallet;
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];
    const expectRate = ether("0.008");
    const expectRates = [expectRate, expectRate];
    const expectLotSizeForDefaultBuyAccount = defaultBuyWhitelistAmount;
    const expectMaxLots = new BN(crowdsaleMaxLots.toString());
    const expectWeiRaised = [BN_ZERO, BN_ZERO];
    const expectTokensSold = BN_ZERO;
    const expectIsPaymentToken = [true, true];
    const expectTokenCap = ether(PUBLIC_TOKEN_AMOUNT);
    const expectTokenCapReached = false;
    const expectBeneficiaryCapForDefaultBuyAccount = defaultBuyWhitelistAmount;
    const expectTokensPurchasedBy = BN_ZERO;
    const expectRemainingTokens = ether(PUBLIC_TOKEN_AMOUNT);
    const expectMaxLotsPerBeneficiary = new BN(MAX_LOTS);
    const expectAvailableLotsForWhitelistedBeneficiary = expectMaxLotsPerBeneficiary;
    const expectAvailableLotsForNonWhitelistedBeneficiary = BN_ZERO;
    const expectPaused = false;
    const expectOpeningTime = defaultCrowdsaleOpeningTime;
    const expectClosingTime = defaultCrowdsaleClosingTime;
    const expectIsOpen = false;
    const expectHasClosed = false;
    // const expectTokenHoldContract = ejsToken.address;
    // const expectMinTokenHoldAmount = ether(MIN_TOKEN_HOLD_AMOUNT);

    const tokenSelling = await launchpadCrowdsale.tokenSelling();
    const wallet = await launchpadCrowdsale.wallet();
    const paymentTokens = await launchpadCrowdsale.paymentTokens();
    const lotSizeForDefaultBuyAccount = await launchpadCrowdsale.lotSize(defaultBuyAccount);
    const maxLots = await launchpadCrowdsale.maxLots();
    const tokensSold = await launchpadCrowdsale.tokensSold();
    const tokenCap = await launchpadCrowdsale.tokenCap();
    const tokenCapReached = await launchpadCrowdsale.tokenCapReached(expectTokensSold);
    const beneficiaryCapForDefaultBuyAccount = await launchpadCrowdsale.getBeneficiaryCap(defaultBuyAccount);
    const tokensPurchasedBy = await launchpadCrowdsale.getTokensPurchasedBy(defaultGovernanceAccount);
    const remainingTokens = await launchpadCrowdsale.getRemainingTokens();
    const paused = await launchpadCrowdsale.paused();
    const openingTime = await launchpadCrowdsale.openingTime();
    const closingTime = await launchpadCrowdsale.closingTime();
    const isOpen = await launchpadCrowdsale.isOpen();
    const hasClosed = await launchpadCrowdsale.hasClosed();
    // const tokenHoldContract = await launchpadCrowdsale.tokenHoldContract();
    // const minTokenHoldAmount = await launchpadCrowdsale.minTokenHoldAmount();

    assert.strictEqual(
      tokenSelling,
      expectTokenSelling,
      `Token selling is ${tokenSelling} instead of ${expectTokenSelling}`
    );
    assert.strictEqual(wallet, expectWallet, `Wallet is ${wallet} instead of ${expectWallet}`);
    assert.ok(
      lotSizeForDefaultBuyAccount.eq(expectLotSizeForDefaultBuyAccount),
      `Lot size is ${lotSizeForDefaultBuyAccount} instead of ${expectLotSizeForDefaultBuyAccount}`
    );
    assert.ok(maxLots.eq(expectMaxLots), `Max lots is ${maxLots} instead of ${expectMaxLots}`);

    assert.strictEqual(
      paymentTokens.length,
      expectPaymentTokens.length,
      `Length of payment tokens is ${paymentTokens.length} instead of ${expectPaymentTokens.length}`
    );
    assert.deepStrictEqual(
      paymentTokens,
      expectPaymentTokens,
      `Payment tokens are ${paymentTokens} instead of ${expectPaymentTokens}`
    );

    assert.ok(tokensSold.eq(expectTokensSold), `Tokens sold is ${tokensSold} instead of ${expectTokensSold}`);
    assert.ok(tokenCap.eq(expectTokenCap), `Token cap is ${tokenCap} instead of ${expectTokenCap}`);

    assert.strictEqual(
      tokenCapReached,
      expectTokenCapReached,
      `Token cap reached is ${tokenCapReached} instead of ${expectTokenCapReached}`
    );

    assert.ok(
      beneficiaryCapForDefaultBuyAccount.eq(expectBeneficiaryCapForDefaultBuyAccount),
      `Beneficiary cap is ${beneficiaryCapForDefaultBuyAccount} instead of ${expectBeneficiaryCapForDefaultBuyAccount}`
    );

    assert.ok(
      tokensPurchasedBy.eq(expectTokensPurchasedBy),
      `Beneficiary contribution is ${tokensPurchasedBy} instead of ${expectTokensPurchasedBy}`
    );

    assert.ok(
      remainingTokens.eq(expectRemainingTokens),
      `Remaining tokens is ${remainingTokens} instead of ${expectRemainingTokens}`
    );

    assert.strictEqual(paused, expectPaused, `Paused is ${paused} instead of ${expectPaused}`);

    assert.ok(openingTime.eq(expectOpeningTime), `Opening time is ${openingTime} instead of ${expectOpeningTime}`);
    assert.ok(closingTime.eq(expectClosingTime), `Closing time is ${closingTime} instead of ${expectClosingTime}`);
    assert.strictEqual(isOpen, expectIsOpen, `Is open is ${isOpen} instead of ${expectIsOpen}`);
    assert.strictEqual(hasClosed, expectHasClosed, `Has closed is ${hasClosed} instead of ${expectHasClosed}`);

    /*
    assert.strictEqual(
      tokenHoldContract,
      expectTokenHoldContract,
      `Token hold contract address is ${tokenHoldContract} instead of ${expectTokenHoldContract}`
    );
    assert.ok(
      minTokenHoldAmount.eq(expectMinTokenHoldAmount),
      `Minimum token hold amount is ${minTokenHoldAmount} instead of ${expectMinTokenHoldAmount}`
    );
    */

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      const rate = await launchpadCrowdsale.rate(expectPaymentTokens[i]);
      const weiRaisedFor = await launchpadCrowdsale.weiRaisedFor(expectPaymentTokens[i]);
      const isPaymentToken = await launchpadCrowdsale.isPaymentToken(expectPaymentTokens[i]);
      const availableLotsForWhitelistedBeneficiary = await launchpadCrowdsale.getAvailableLotsFor(defaultBuyAccount);
      const availableLotsForNonWhitelistedBeneficiary = await launchpadCrowdsale.getAvailableLotsFor(
        defaultGovernanceAccount
      );

      assert.ok(rate.eq(expectRates[i]), `${i}: Rate is ${rate} instead of ${expectRates[i]}`);

      assert.ok(
        weiRaisedFor.eq(expectWeiRaised[i]),
        `${i}: Wei raised is ${weiRaisedFor} instead of ${expectWeiRaised[i]}`
      );

      assert.strictEqual(
        isPaymentToken,
        expectIsPaymentToken[i],
        `${i}: Is payment token is ${isPaymentToken} instead of ${expectIsPaymentToken[i]}`
      );

      assert.ok(
        availableLotsForWhitelistedBeneficiary.eq(expectAvailableLotsForWhitelistedBeneficiary),
        `${i}: Available lots for whitelisted beneficiary is ${availableLotsForWhitelistedBeneficiary} instead of ${expectAvailableLotsForWhitelistedBeneficiary}`
      );

      assert.ok(
        availableLotsForNonWhitelistedBeneficiary.eq(expectAvailableLotsForNonWhitelistedBeneficiary),
        `${i}: Available lots for non-whitelisted beneficiary is ${availableLotsForNonWhitelistedBeneficiary} instead of ${expectAvailableLotsForNonWhitelistedBeneficiary}`
      );
    }
  });

  it("should return correct token amount", async () => {
    const lotSize = defaultBuyWhitelistAmount;

    for (let i = 0; i < MAX_LOTS; i++) {
      const expectGetTokenAmount = calculateTokenAmount(lotSize, new BN(i + 1));

      const getTokenAmount = await launchpadCrowdsale.getTokenAmount(new BN(i + 1), defaultBuyAccount);

      assert.ok(
        getTokenAmount.eq(expectGetTokenAmount),
        `${i}: Get token amount for ${i + 1} lot(s) is ${getTokenAmount} instead of ${expectGetTokenAmount}`
      );
    }
  });

  it("should return correct wei amount", async () => {
    const lotSize = defaultBuyWhitelistAmount;
    const rate = new BN(crowdsaleRate.toString());
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      for (let j = 0; j < MAX_LOTS; j++) {
        const expectGetWeiAmount = calculateWeiAmount(lotSize, new BN(j + 1), rate);

        // console.log(`${i}, ${j}: lotSize=${lotSize}, rate=${rate}, expectGetWeiAmount=${expectGetWeiAmount}`);

        const getWeiAmount = await launchpadCrowdsale.getWeiAmount(expectPaymentTokens[i], j + 1, defaultBuyAccount);

        assert.ok(
          getWeiAmount.eq(expectGetWeiAmount),
          `${i}: Get wei amount for ${j + 1} is ${getWeiAmount} instead of ${expectGetWeiAmount}`
        );
      }
    }
  });

  it("should buy correct token amount", async () => {
    const lotSize = defaultBuyWhitelistAmount;
    const rate = new BN(crowdsaleRate.toString());
    const expectSellAccount = await launchpadCrowdsale.wallet();

    const expectPaymentTokens = [usdcMock.address, usdtMock.address];
    const expectPaymentDecimal = new BN(crowdsalePaymentDecimal.toString());
    const expectPaymentDecimals = [expectPaymentDecimal, expectPaymentDecimal];
    const expectTokenCapReached = false;
    const expectMaxLots = new BN(crowdsaleMaxLots.toString());

    // advance to opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.add(time.duration.seconds(1)));

    const expectBuyerEjsBalanceAfterBuy = ether(MIN_TOKEN_HOLD_AMOUNT);
    const expectBuyLots = new BN(MAX_LOTS);
    const expectBuyTokenAmount = calculateTokenAmount(lotSize, expectBuyLots);
    const expectBuyWeiAmount = calculateWeiAmount(lotSize, expectBuyLots, rate);

    let expectTokensSoldAfterBuy = new BN("0");
    let expectRemainingTokensAfterBuy = publicTokenAmount;
    let expectEjsTotalSupplyAfterBuy = new BN("0");

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      const scale = new BN("10").pow(new BN("18").sub(expectPaymentDecimals[i]));

      let expectBeneficiaryTotalLotsAfterBuy = new BN("0");
      let expectTokensPurchasedByAfterBuy = new BN("0");
      let expectGrantAmountAfterBuy = new BN("0");

      const expectBuyAccount = accounts[10 + i];
      expectEjsTotalSupplyAfterBuy = expectEjsTotalSupplyAfterBuy.add(ether(MIN_TOKEN_HOLD_AMOUNT));
      await addEjsToken(expectBuyAccount, ether(MIN_TOKEN_HOLD_AMOUNT));
      await addCapital(expectPaymentTokens[i], expectBuyAccount, expectBuyWeiAmount, scale);
      await launchpadWhitelist.addWhitelisted(expectBuyAccount, defaultBuyWhitelistAmount, {
        from: defaultGovernanceAccount,
      });

      expectBeneficiaryTotalLotsAfterBuy = expectBeneficiaryTotalLotsAfterBuy.add(expectBuyLots);
      expectTokensPurchasedByAfterBuy = expectTokensPurchasedByAfterBuy.add(expectBuyTokenAmount);
      expectTokensSoldAfterBuy = expectTokensSoldAfterBuy.add(expectBuyTokenAmount);
      expectGrantAmountAfterBuy = expectGrantAmountAfterBuy.add(expectBuyTokenAmount);
      expectRemainingTokensAfterBuy = expectRemainingTokensAfterBuy.sub(expectBuyTokenAmount);
      const expectAvailableLotsForBeneficiaryAfterBuy = expectMaxLots.sub(expectBeneficiaryTotalLotsAfterBuy);

      // console.log(
      //   `${i}, ${j}, ${k}: expectRemainingTokensAfterBuy=${expectRemainingTokensAfterBuy}, expectBuyTokenAmount=${expectBuyTokenAmount}`
      // );

      // console.log(`${i}, ${j}, ${k}: expectTokenPurchasedByAfterBuy=${expectTokensPurchasedByAfterBuy}`);
      // console.log(`${i}, ${j}, ${k}: expectTokensSoldAfterBuy=${expectTokensSoldAfterBuy}`);
      // console.log(`${i}, ${j}, ${k}: expectGrantAmountAfterBuy=${expectGrantAmountAfterBuy}`);

      const sellerUsdBalanceBeforeBuy = await approveCrowdsale(
        expectPaymentTokens[i],
        expectBuyAccount,
        expectBuyWeiAmount,
        scale,
        expectSellAccount
      );

      // const ejsTokenBalanceOf = await ejsToken.balanceOf(expectBuyAccount);
      // const tokenHoldContract = await launchpadCrowdsale.tokenHoldContract();
      // const minTokenHoldAmount = await launchpadCrowdsale.minTokenHoldAmount();
      // console.log(
      //   `${i}: ejsTokenAddress=${ejsToken.address}, expectBuyAccount=${expectBuyAccount}, ejsTokenBalanceOf=${ejsTokenBalanceOf}, tokenHoldContract=${tokenHoldContract}, minTokenHoldAmount=${minTokenHoldAmount}}, expectBuyLots=${expectBuyLots}`
      // );

      const buyToken = await launchpadCrowdsale.buyTokens(expectPaymentTokens[i], expectBuyLots, {
        from: expectBuyAccount,
      });

      expectEvent(buyToken, "TokensPurchased", {
        purchaser: expectBuyAccount,
        beneficiary: expectBuyAccount,
        paymentToken: expectPaymentTokens[i],
        lots: expectBuyLots,
        weiAmount: expectBuyWeiAmount,
        tokenAmount: expectBuyTokenAmount,
      });

      const tokenCapReached = await launchpadCrowdsale.tokenCapReached(expectTokensSoldAfterBuy);
      const tokensPurchasedByAfterBuy = await launchpadCrowdsale.getTokensPurchasedBy(expectBuyAccount);
      const tokensSoldAfterBuy = await launchpadCrowdsale.tokensSold();
      const buyerEjsBalanceAfterBuy = await ejsToken.balanceOf(expectBuyAccount);
      const ejsTotalSupplyAfterBuy = await ejsToken.totalSupply();
      const maxLots = await launchpadCrowdsale.maxLots();
      const availableLotsForBeneficiary = await launchpadCrowdsale.getAvailableLotsFor(expectBuyAccount);
      const remainingTokensAfterBuy = await launchpadCrowdsale.getRemainingTokens();

      assert.strictEqual(
        tokenCapReached,
        expectTokenCapReached,
        `${i}: Token cap reached is ${tokenCapReached} instead of ${expectTokenCapReached}`
      );

      assert.ok(
        tokensPurchasedByAfterBuy.eq(expectTokensPurchasedByAfterBuy),
        `${i}: Tokens purchased by beneficiary after buy ${expectBuyLots} lots for ${expectBuyWeiAmount} is ${tokensPurchasedByAfterBuy} instead of ${expectTokensPurchasedByAfterBuy}`
      );

      assert.ok(
        tokensSoldAfterBuy.eq(expectTokensSoldAfterBuy),
        `${i}: Tokens sold after buy ${expectBuyLots} tokens for ${expectBuyWeiAmount} is ${tokensSoldAfterBuy} instead of ${expectTokensSoldAfterBuy}`
      );

      assert.ok(
        buyerEjsBalanceAfterBuy.eq(expectBuyerEjsBalanceAfterBuy),
        `${i}: Buyer EJS balance after buy ${expectBuyLots} lot(s) for ${expectBuyWeiAmount} is ${buyerEjsBalanceAfterBuy} instead of ${expectBuyerEjsBalanceAfterBuy}`
      );

      assert.ok(
        ejsTotalSupplyAfterBuy.eq(expectEjsTotalSupplyAfterBuy),
        `${i}: Total supply after buy ${expectBuyLots} lot(s) for ${expectBuyWeiAmount} is ${ejsTotalSupplyAfterBuy} instead of ${expectEjsTotalSupplyAfterBuy}`
      );

      assert.ok(maxLots.eq(expectMaxLots), `${i}: Max lots per beneficiary is ${maxLots} instead of ${expectMaxLots}`);

      assert.ok(
        availableLotsForBeneficiary.eq(expectAvailableLotsForBeneficiaryAfterBuy),
        `${i}: Available lots for beneficiary is ${availableLotsForBeneficiary} instead of ${expectAvailableLotsForBeneficiaryAfterBuy}`
      );

      assert.ok(
        remainingTokensAfterBuy.eq(expectRemainingTokensAfterBuy),
        `${i}: Remaining tokens is ${remainingTokensAfterBuy} instead of ${expectRemainingTokensAfterBuy}`
      );

      const expectSellerUsdBalanceAfterBuy = sellerUsdBalanceBeforeBuy.add(expectBuyWeiAmount.div(scale));

      switch (expectPaymentTokens[i]) {
        case usdcMock.address:
          const sellerUsdcBalanceAfterBuy = await usdcMock.balanceOf(expectSellAccount);

          assert.ok(
            sellerUsdcBalanceAfterBuy.eq(expectSellerUsdBalanceAfterBuy),
            `${i}: Seller USDC balance after buy tokens for ${expectBuyWeiAmount} is ${sellerUsdcBalanceAfterBuy} instead of ${expectSellerUsdBalanceAfterBuy}`
          );

          break;
        case usdtMock.address:
          const sellerUsdtBalanceAfterBuy = await usdtMock.balanceOf(expectSellAccount);

          assert.ok(
            sellerUsdtBalanceAfterBuy.eq(expectSellerUsdBalanceAfterBuy),
            `${i}: Seller USDT balance after buy tokens for ${expectBuyWeiAmount} is ${sellerUsdtBalanceAfterBuy} instead of ${expectSellerUsdBalanceAfterBuy}`
          );

          break;
        default:
          throw new Error(`${i}: Unknown payment token after buy: ${expectPaymentTokens[i]}`);
      }
    }
  });

  it("should not allow to exceed beneficiary cap for buy tokens", async () => {
    const lotSize = defaultBuyWhitelistAmount;
    const rate = new BN(crowdsaleRate.toString());
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];
    const expectPaymentDecimal = new BN(crowdsalePaymentDecimal.toString());
    const expectPaymentDecimals = [expectPaymentDecimal, expectPaymentDecimal];
    const expectSellAccount = await launchpadCrowdsale.wallet();
    const notWhitelistedBuyAccount = accounts[8];

    // advance to opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.add(time.duration.seconds(1)));

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      const expectBuyLots = new BN(MAX_LOTS);
      const expectBuyAccount = accounts[10 + i]; // assumes max 10 accounts
      const scale = new BN("10").pow(new BN("18").sub(expectPaymentDecimals[i]));
      await launchpadWhitelist.addWhitelisted(expectBuyAccount, defaultBuyWhitelistAmount, {
        from: defaultGovernanceAccount,
      });

      const expectBuyTokenAmount = calculateTokenAmount(lotSize, expectBuyLots);
      const expectBuyWeiAmount = calculateWeiAmount(lotSize, expectBuyLots, rate);

      await addEjsToken(expectBuyAccount, ether(MIN_TOKEN_HOLD_AMOUNT));
      await addCapital(expectPaymentTokens[i], expectBuyAccount, expectBuyWeiAmount, scale);

      for (let j = 0; j < MAX_LOTS + 1; j++) {
        // console.log(`${i}, ${j}: expectBuyLots=${expectBuyLots}, expectBuyWeiAmount=${expectBuyWeiAmount}`);

        if (j < MAX_LOTS) {
          const sellerUsdBalanceBeforeBuy = await approveCrowdsale(
            expectPaymentTokens[i],
            expectBuyAccount,
            expectBuyWeiAmount,
            scale,
            expectSellAccount
          );

          const buyToken = await launchpadCrowdsale.buyTokens(expectPaymentTokens[i], expectBuyLots, {
            from: expectBuyAccount,
          });

          expectEvent(buyToken, "TokensPurchased", {
            purchaser: expectBuyAccount,
            beneficiary: expectBuyAccount,
            paymentToken: expectPaymentTokens[i],
            lots: expectBuyLots,
            weiAmount: expectBuyWeiAmount,
            tokenAmount: expectBuyTokenAmount,
          });
        } else {
          const getTokensPurchasedBy = await launchpadCrowdsale.getTokensPurchasedBy(expectBuyAccount);
          const getWeiAmount = await launchpadCrowdsale.getWeiAmount(
            expectPaymentTokens[i],
            expectBuyLots,
            expectBuyAccount
          );
          // console.log(
          //   `${i}, ${j}: getTokensPurchasedBy=${getTokensPurchasedBy}, expectBuyLots=${expectBuyLots}, getWeiAmount=${getWeiAmount}`
          // );

          await expectRevert(
            launchpadCrowdsale.buyTokens(expectPaymentTokens[i], expectBuyLots, {
              from: expectBuyAccount,
            }),
            "LaunchpadCrowdsale: beneficiary cap exceeded"
          );

          await expectRevert(
            launchpadCrowdsale.buyTokensFor(expectBuyAccount, expectPaymentTokens[i], expectBuyLots, {
              from: notWhitelistedBuyAccount,
            }),
            "LaunchpadCrowdsale: beneficiary cap exceeded"
          );
        }
      }
    }
  });

  it("should not allow to exceed token cap for buy tokens", async () => {
    const lotSize = defaultBuyWhitelistAmount;
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];
    const maxNumBuysAtMaxLotForAllPaymentTokens = publicTokenAmount
      .mul(BN_TEN_POW_EIGHTEEN)
      .div(new BN(MAX_LOTS).mul(lotSize));
    const maxNumBuysAtMaxLotForEachPaymentToken = maxNumBuysAtMaxLotForAllPaymentTokens
      .div(new BN(expectPaymentTokens.length))
      .div(BN_TEN_POW_EIGHTEEN);
    const maxNumBuysAtMaxLotForEachPaymentTokenInt = parseInt(maxNumBuysAtMaxLotForEachPaymentToken.toString(10), 10);
    const maxNumBuysAtMaxLotForAllPaymentTokensInt = parseInt(
      maxNumBuysAtMaxLotForAllPaymentTokens.div(BN_TEN_POW_EIGHTEEN).toString(10),
      10
    );
    const maxNumBuysAtMaxLots = [
      maxNumBuysAtMaxLotForEachPaymentTokenInt,
      maxNumBuysAtMaxLotForAllPaymentTokensInt - maxNumBuysAtMaxLotForEachPaymentTokenInt,
    ]; // assumes only 2 payment tokens
    // console.log(
    //   `maxNumBuysAtMaxLots[0]=${maxNumBuysAtMaxLots[0]}, maxNumBuysAtMaxLots[1]=${maxNumBuysAtMaxLots[1]}, PUBLIC_TOKEN_AMOUNT=${PUBLIC_TOKEN_AMOUNT}, MAX_LOTS=${MAX_LOTS}, lotSize=${lotSize}`
    // );
    const rate = new BN(crowdsaleRate.toString());
    const notWhitelistedBuyAccount = accounts[8];
    const exceedBuyAccount = accounts[7];
    const expectSellAccount = await launchpadCrowdsale.wallet();
    const expectPaymentDecimal = new BN(crowdsalePaymentDecimal.toString());
    const expectPaymentDecimals = [expectPaymentDecimal, expectPaymentDecimal];

    // advance to opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.add(time.duration.seconds(1)));

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      const scale = new BN("10").pow(new BN("18").sub(expectPaymentDecimals[i]));
      const expectBuyLots = new BN(MAX_LOTS);
      const expectBuyWeiAmount = calculateWeiAmount(lotSize, expectBuyLots, rate);
      const totalMaxNumBuysAtMaxLots = Math.max(...maxNumBuysAtMaxLots);

      // console.log(
      //   `${i}: expectBuyWeiAmount=${expectBuyWeiAmount}, lotSize=${lotSize}, expectBuyLots=${expectBuyLots}, rate=${rate}, totalMaxNumBuysAtMaxLots=${totalMaxNumBuysAtMaxLots}`
      // );

      for (let j = 0; j < maxNumBuysAtMaxLots[i]; j++) {
        const expectBuyAccount = accounts[10 + i * totalMaxNumBuysAtMaxLots + j];
        await launchpadWhitelist.addWhitelisted(expectBuyAccount, defaultBuyWhitelistAmount, {
          from: defaultGovernanceAccount,
        });
        await addEjsToken(expectBuyAccount, ether(MIN_TOKEN_HOLD_AMOUNT));
        // console.log(
        //   `${i}, ${j}: expectBuyAccount=${expectBuyAccount}, defaultBuyWhitelistAmount=${defaultBuyWhitelistAmount}`
        // );
        await addCapital(expectPaymentTokens[i], expectBuyAccount, expectBuyWeiAmount, scale);
        const sellerUsdBalanceBeforeBuy = await approveCrowdsale(
          expectPaymentTokens[i],
          expectBuyAccount,
          expectBuyWeiAmount,
          scale,
          expectSellAccount
        );

        const buyToken = await launchpadCrowdsale.buyTokens(expectPaymentTokens[i], expectBuyLots, {
          from: expectBuyAccount,
        });
      }
    }

    const tokensSold = await launchpadCrowdsale.tokensSold();
    // console.log(`tokensSold=${tokensSold}`);

    const expectBuyOneLot = BN_ONE;
    const expectOneLotWeiAmount = calculateWeiAmount(lotSize, expectBuyOneLot, rate);
    await launchpadWhitelist.addWhitelisted(exceedBuyAccount, defaultBuyWhitelistAmount, {
      from: defaultGovernanceAccount,
    });

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      const scale = new BN("10").pow(new BN("18").sub(expectPaymentDecimals[i]));
      await addCapital(expectPaymentTokens[i], exceedBuyAccount, expectOneLotWeiAmount, scale);
      const sellerUsdBalanceBeforeBuy = await approveCrowdsale(
        expectPaymentTokens[i],
        exceedBuyAccount,
        expectOneLotWeiAmount,
        scale,
        expectSellAccount
      );

      await expectRevert(
        launchpadCrowdsale.buyTokens(expectPaymentTokens[i], expectBuyOneLot, {
          from: exceedBuyAccount,
        }),
        "CappedTokenSoldHelper: cap exceeded"
      );

      await expectRevert(
        launchpadCrowdsale.buyTokensFor(exceedBuyAccount, expectPaymentTokens[i], expectBuyOneLot, {
          from: notWhitelistedBuyAccount,
        }),
        "CappedTokenSoldHelper: cap exceeded"
      );
    }
  });

  it("should not allow zero wallet address", async () => {
    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(ZERO_ADDRESS, defaultCrowdsaleInfo, defaultTimeframe, defaultPaymentTokensInfo),
      "Crowdsale: zero wallet address"
    );
  });

  it("should not allow zero payment tokens", async () => {
    const paymentTokensInfo = [];

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(defaultWallet, defaultCrowdsaleInfo, defaultTimeframe, paymentTokensInfo),
      "Crowdsale: zero payment tokens"
    );
  });

  it("should not allow exceed max payment tokens", async () => {
    const paymentTokens = Array.from(
      { length: MAX_NUM_PAYMENT_TOKENS + 1 },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );

    const paymentTokensInfo = [];
    for (let i = 0; i < MAX_NUM_PAYMENT_TOKENS + 1; i++) {
      paymentTokensInfo[i] = {
        paymentToken: paymentTokens[i],
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      };
    }

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(defaultWallet, defaultCrowdsaleInfo, defaultTimeframe, paymentTokensInfo),
      "Crowdsale: exceed max payment tokens"
    );
  });

  it("should not allow payment token decimals to exceed 18", async () => {
    const paymentDecimalExceed = BigNumber.from("19");

    const paymentTokensInfoFirstExceed = [
      {
        paymentToken: usdcMock.address,
        paymentDecimal: paymentDecimalExceed,
        rate: crowdsaleRate,
      },
      {
        paymentToken: usdtMock.address,
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
    ];

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(
        defaultWallet,
        defaultCrowdsaleInfo,
        defaultTimeframe,
        paymentTokensInfoFirstExceed
      ),
      "Crowdsale: decimals exceed 18"
    );

    const paymentTokensInfoLastExceed = [
      {
        paymentToken: usdcMock.address,
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
      {
        paymentToken: usdtMock.address,
        paymentDecimal: paymentDecimalExceed,
        rate: crowdsaleRate,
      },
    ];

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(
        defaultWallet,
        defaultCrowdsaleInfo,
        defaultTimeframe,
        paymentTokensInfoLastExceed
      ),
      "Crowdsale: decimals exceed 18"
    );
  });

  it("should not allow zero payment token address", async () => {
    const paymentTokensInfoFirstZero = [
      {
        paymentToken: ZERO_ADDRESS,
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
      {
        paymentToken: usdtMock.address,
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
    ];

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(
        defaultWallet,
        defaultCrowdsaleInfo,
        defaultTimeframe,
        paymentTokensInfoFirstZero
      ),
      "Crowdsale: zero payment token address"
    );

    const paymentTokensInfoLastZero = [
      {
        paymentToken: usdcMock.address,
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
      {
        paymentToken: ZERO_ADDRESS,
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
    ];

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(
        defaultWallet,
        defaultCrowdsaleInfo,
        defaultTimeframe,
        paymentTokensInfoLastZero
      ),
      "Crowdsale: zero payment token address"
    );
  });

  it("should not allow zero rate", async () => {
    const paymentTokensInfoFirstZeroRate = [
      {
        paymentToken: usdcMock.address,
        paymentDecimal: crowdsalePaymentDecimal,
        rate: BIGNUMBER_ZERO,
      },
      {
        paymentToken: usdtMock.address,
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
    ];

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(
        defaultWallet,
        defaultCrowdsaleInfo,
        defaultTimeframe,
        paymentTokensInfoFirstZeroRate
      ),
      "Crowdsale: zero rate"
    );

    const paymentTokensInfoLastZeroRate = [
      {
        paymentToken: usdcMock.address,
        paymentDecimal: crowdsalePaymentDecimal,
        rate: crowdsaleRate,
      },
      {
        paymentToken: usdtMock.address,
        paymentDecimal: crowdsalePaymentDecimal,
        rate: BIGNUMBER_ZERO,
      },
    ];

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(
        defaultWallet,
        defaultCrowdsaleInfo,
        defaultTimeframe,
        paymentTokensInfoLastZeroRate
      ),
      "Crowdsale: zero rate"
    );
  });

  it("should not allow zero token cap", async () => {
    const crowdsaleInfo = {
      tokenCap: BIGNUMBER_ZERO,
      whitelistContract: launchpadWhitelist.address,
      // tokenHold: ejsToken.address,
      // minTokenHoldAmount: hre.ethers.utils.parseEther(MIN_TOKEN_HOLD_AMOUNT),
    };

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(defaultWallet, crowdsaleInfo, defaultTimeframe, defaultPaymentTokensInfo),
      "CappedTokenSoldHelper: zero cap"
    );
  });

  it("should not allow zero lot size", async () => {
    const lotsInfo = {
      lotSize: BIGNUMBER_ZERO,
      maxLots: crowdsaleMaxLots,
    };

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(
        defaultWallet,
        defaultCrowdsaleInfo,
        defaultTimeframe,
        defaultPaymentTokensInfo,
        lotsInfo
      ),
      "Crowdsale: zero lot size"
    );
  });

  it("should not allow zero max lots", async () => {
    const lotsInfo = {
      lotSize: crowdsaleLotSize,
      maxLots: BIGNUMBER_ZERO,
    };

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(
        defaultWallet,
        defaultCrowdsaleInfo,
        defaultTimeframe,
        defaultPaymentTokensInfo,
        lotsInfo
      ),
      "Crowdsale: zero max lots"
    );
  });

  it("should not allow opening time to be before current time", async () => {
    const latestBlockTimestamp = await time.latest();
    const openingTimeBeforeNow = latestBlockTimestamp.sub(time.duration.seconds(10));
    const closingTimeAfterOpeningTime = openingTimeBeforeNow.add(time.duration.hours(1));
    const timeframe = {
      openingTime: BigNumber.from(openingTimeBeforeNow.toString(10)),
      closingTime: BigNumber.from(closingTimeAfterOpeningTime.toString(10)),
    };

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(defaultWallet, defaultCrowdsaleInfo, timeframe, defaultPaymentTokensInfo),
      "TimedCrowdsaleHelper: opening time is before current time"
    );
  });

  it("should not allow closing time to be before opening time", async () => {
    const latestBlockTimestamp = await time.latest();
    const openingTimeAfterNow = latestBlockTimestamp.add(time.duration.seconds(1));
    const closingTimeBeforeOpeningTime = openingTimeAfterNow.sub(time.duration.seconds(10));
    const timeframe = {
      openingTime: BigNumber.from(openingTimeAfterNow.toString(10)),
      closingTime: BigNumber.from(closingTimeBeforeOpeningTime.toString(10)),
    };

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(defaultWallet, defaultCrowdsaleInfo, timeframe, defaultPaymentTokensInfo),
      "TimedCrowdsaleHelper: closing time is before opening time"
    );
  });

  it("should not allow zero whitelist contract address", async () => {
    const crowdsaleInfo = {
      tokenCap: hre.ethers.utils.parseEther(PUBLIC_TOKEN_AMOUNT),
      whitelistContract: ZERO_ADDRESS,
      // tokenHold: ejsToken.address,
      // minTokenHoldAmount: hre.ethers.utils.parseEther(MIN_TOKEN_HOLD_AMOUNT),
    };

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(defaultWallet, crowdsaleInfo, defaultTimeframe, defaultPaymentTokensInfo),
      "WhitelistCrowdsaleHelper: zero whitelist address"
    );
  });

  /*
  it("should not allow zero token hold contract address", async () => {
    const crowdsaleInfo = {
      tokenCap: hre.ethers.utils.parseEther(PUBLIC_TOKEN_AMOUNT),
      whitelistContract: launchpadWhitelist.address,
      tokenHold: ZERO_ADDRESS,
      minTokenHoldAmount: hre.ethers.utils.parseEther(MIN_TOKEN_HOLD_AMOUNT),
    };

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(defaultWallet, crowdsaleInfo, defaultTimeframe, defaultPaymentTokensInfo),
      "HoldErc20TokenCrowdsaleHelper: zero token hold address"
    );
  });

  it("should not allow zero min token amount", async () => {
    const crowdsaleInfo = {
      tokenCap: hre.ethers.utils.parseEther(PUBLIC_TOKEN_AMOUNT),
      whitelistContract: launchpadWhitelist.address,
      tokenHold: ejsToken.address,
      minTokenHoldAmount: hre.ethers.utils.parseEther("0"),
    };

    await expectRevert(
      testHelpers.newLaunchpadCrowdsale(defaultWallet, crowdsaleInfo, defaultTimeframe, defaultPaymentTokensInfo),
      "HoldErc20TokenCrowdsaleHelper: zero min token hold amount"
    );
  });
  */

  it("should not allow zero token cap for IndividuallyCappedCrowdsaleHelper", async () => {
    await expectRevert(
      testHelpers.newIndividuallyCappedCrowdsaleHelper(BN_ZERO),
      "IndividuallyCappedCrowdsaleHelper: zero cap"
    );
  });

  it("should not allow to get rate for zero payment token address", async () => {
    await expectRevert(launchpadCrowdsale.rate(ZERO_ADDRESS), "Crowdsale: zero payment token address");
  });

  it("should not allow to get rate for unaccepted payment token address", async () => {
    await expectRevert(launchpadCrowdsale.rate(ejsToken.address), "Crowdsale: payment token unaccepted");
  });

  it("should not allow to get wei raised for zero payment token address", async () => {
    await expectRevert(launchpadCrowdsale.weiRaisedFor(ZERO_ADDRESS), "Crowdsale: zero payment token address");
  });

  it("should not allow to get wei raised for unaccepted payment token address", async () => {
    await expectRevert(launchpadCrowdsale.weiRaisedFor(ejsToken.address), "Crowdsale: payment token unaccepted");
  });

  it("should not allow to check is payment token for zero payment token address", async () => {
    await expectRevert(launchpadCrowdsale.isPaymentToken(ZERO_ADDRESS), "Crowdsale: zero payment token address");
  });

  it("should not allow to get token amount for zero lots", async () => {
    await expectRevert(launchpadCrowdsale.getTokenAmount(BN_ZERO, defaultBuyAccount), "Crowdsale: zero lots");
  });

  it("should not allow to get token amount for zero beneficiary address", async () => {
    await expectRevert(launchpadCrowdsale.getTokenAmount(BN_ONE, ZERO_ADDRESS), "Crowdsale: zero beneficiary address");
  });

  it("should not allow to get wei amount for zero payment token address", async () => {
    await expectRevert(
      launchpadCrowdsale.getWeiAmount(ZERO_ADDRESS, BN_ZERO, defaultBuyAccount),
      "Crowdsale: zero payment token address"
    );
  });

  it("should not allow to get wei amount for unaccepted payment token address", async () => {
    await expectRevert(
      launchpadCrowdsale.getWeiAmount(ejsToken.address, BN_ONE, defaultBuyAccount),
      "Crowdsale: payment token unaccepted"
    );
  });

  it("should not allow to get wei amount for zero lots", async () => {
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      await expectRevert(
        launchpadCrowdsale.getWeiAmount(expectPaymentTokens[i], BN_ZERO, defaultBuyAccount),
        "Crowdsale: zero lots"
      );
    }
  });

  it("should not allow to buy for zero beneficiary address", async () => {
    const notWhitelistedBuyAccount = accounts[8];
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      await expectRevert(
        launchpadCrowdsale.buyTokensFor(ZERO_ADDRESS, expectPaymentTokens[i], BN_ONE, {
          from: notWhitelistedBuyAccount,
        }),
        "Crowdsale: zero beneficiary address"
      );
    }
  });

  it("should not allow to buy for zero payment token address", async () => {
    const notWhitelistedBuyAccount = accounts[8];

    await expectRevert(
      launchpadCrowdsale.buyTokens(ZERO_ADDRESS, BN_ONE, {
        from: defaultBuyAccount,
      }),
      "Crowdsale: zero payment token address"
    );

    await expectRevert(
      launchpadCrowdsale.buyTokensFor(defaultBuyAccount, ZERO_ADDRESS, BN_ONE, {
        from: notWhitelistedBuyAccount,
      }),
      "Crowdsale: zero payment token address"
    );
  });

  it("should not allow to buy for unaccepted payment token address", async () => {
    const notWhitelistedBuyAccount = accounts[8];

    await expectRevert(
      launchpadCrowdsale.buyTokens(ejsToken.address, BN_ONE, {
        from: defaultBuyAccount,
      }),
      "Crowdsale: payment token unaccepted"
    );

    await expectRevert(
      launchpadCrowdsale.buyTokensFor(defaultBuyAccount, ejsToken.address, BN_ONE, {
        from: notWhitelistedBuyAccount,
      }),
      "Crowdsale: payment token unaccepted"
    );
  });

  it("should not allow to buy for zero lots", async () => {
    const notWhitelistedBuyAccount = accounts[8];
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      await expectRevert(
        launchpadCrowdsale.buyTokens(expectPaymentTokens[i], BN_ZERO, {
          from: defaultBuyAccount,
        }),
        "Crowdsale: zero lots"
      );

      await expectRevert(
        launchpadCrowdsale.buyTokensFor(defaultBuyAccount, expectPaymentTokens[i], BN_ZERO, {
          from: notWhitelistedBuyAccount,
        }),
        "Crowdsale: zero lots"
      );
    }
  });

  it("should not allow to buy while paused", async () => {
    const lotSize = defaultBuyWhitelistAmount;
    const rate = new BN(crowdsaleRate.toString());
    const expectSellAccount = await launchpadCrowdsale.wallet();
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];
    const expectPaymentDecimal = new BN(crowdsalePaymentDecimal.toString());
    const expectPaymentDecimals = [expectPaymentDecimal, expectPaymentDecimal];

    // advance to opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.add(time.duration.seconds(1)));

    const expectBuyWeiAmount = calculateWeiAmount(lotSize, BN_ONE, rate);

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      const scale = new BN("10").pow(new BN("18").sub(expectPaymentDecimals[i]));

      const expectBuyAccount0 = accounts[10 + i * 2];
      const expectBuyAccount1 = accounts[10 + i * 2 + 1];

      await addEjsToken(expectBuyAccount0, ether(MIN_TOKEN_HOLD_AMOUNT));
      await launchpadWhitelist.addWhitelisted(expectBuyAccount0, defaultBuyWhitelistAmount, {
        from: defaultGovernanceAccount,
      });

      await addEjsToken(expectBuyAccount1, ether(MIN_TOKEN_HOLD_AMOUNT));
      await launchpadWhitelist.addWhitelisted(expectBuyAccount1, defaultBuyWhitelistAmount, {
        from: defaultGovernanceAccount,
      });

      const expectTotalBuyWeiAmount = expectBuyWeiAmount.mul(new BN("2"));
      await addCapital(expectPaymentTokens[i], expectBuyAccount0, expectTotalBuyWeiAmount, scale);

      await launchpadCrowdsale.pause({ from: defaultCrowdsaleAdmin });

      await expectRevert(
        launchpadCrowdsale.buyTokens(expectPaymentTokens[i], BN_ONE, { from: expectBuyAccount0 }),
        "Pausable: paused"
      );
      await expectRevert(
        launchpadCrowdsale.buyTokensFor(expectBuyAccount1, expectPaymentTokens[i], BN_ONE, {
          from: expectBuyAccount0,
        }),
        "Pausable: paused"
      );

      await launchpadCrowdsale.unpause({ from: defaultCrowdsaleAdmin });

      const sellerUsdBalanceBeforeBuy01 = await approveCrowdsale(
        expectPaymentTokens[i],
        expectBuyAccount0,
        expectTotalBuyWeiAmount,
        scale,
        expectSellAccount
      );

      await assert.doesNotReject(
        async () => await launchpadCrowdsale.buyTokens(expectPaymentTokens[i], BN_ONE, { from: expectBuyAccount0 })
      );

      await assert.doesNotReject(
        async () =>
          await launchpadCrowdsale.buyTokensFor(expectBuyAccount1, expectPaymentTokens[i], BN_ONE, {
            from: expectBuyAccount0,
          })
      );
    }
  });

  it("should not allow to buy tokens when closed", async () => {
    const expectBuyAccount = accounts[8];
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];

    // advance to just before opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.sub(time.duration.seconds(15)));

    // console.log("before opening time");

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      await expectRevert(
        launchpadCrowdsale.buyTokens(expectPaymentTokens[i], BN_ONE, {
          from: expectBuyAccount,
        }),
        "TimedCrowdsaleHelper: not open"
      );

      await expectRevert(
        launchpadCrowdsale.buyTokensFor(defaultBuyAccount, expectPaymentTokens[i], BN_ONE, {
          from: expectBuyAccount,
        }),
        "TimedCrowdsaleHelper: not open"
      );
    }

    // advance to just after closing time
    await time.increaseTo(defaultCrowdsaleClosingTime.add(time.duration.seconds(1)));

    // console.log("after closing time");

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      await expectRevert(
        launchpadCrowdsale.buyTokens(expectPaymentTokens[i], BN_ONE, {
          from: expectBuyAccount,
        }),
        "TimedCrowdsaleHelper: not open"
      );

      await expectRevert(
        launchpadCrowdsale.buyTokensFor(expectBuyAccount, expectPaymentTokens[i], BN_ONE, {
          from: defaultBuyAccount,
        }),
        "TimedCrowdsaleHelper: not open"
      );
    }
  });

  /*
  it("should not allow non EJS token holders to buy tokens", async () => {
    const expectBuyAccount = accounts[8];
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];

    // advance to opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.add(time.duration.seconds(1)));

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      await expectRevert(
        launchpadCrowdsale.buyTokens(expectPaymentTokens[i], BN_ONE, {
          from: expectBuyAccount,
        }),
        "HoldErc20TokenCrowdsaleHelper: account hold less than min'"
      );

      await expectRevert(
        launchpadCrowdsale.buyTokensFor(expectBuyAccount, expectPaymentTokens[i], BN_ONE, {
          from: defaultBuyAccount,
        }),
        "HoldErc20TokenCrowdsaleHelper: account hold less than min'"
      );
    }
  });

  it("should not allow insufficient EJS token holders to buy tokens", async () => {
    const expectBuyAccount = accounts[8];
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];

    // advance to opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.add(time.duration.seconds(1)));

    await addEjsToken(expectBuyAccount, ether(MIN_TOKEN_HOLD_AMOUNT).sub(BN_ONE));

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      await expectRevert(
        launchpadCrowdsale.buyTokens(expectPaymentTokens[i], BN_ONE, {
          from: expectBuyAccount,
        }),
        "HoldErc20TokenCrowdsaleHelper: account hold less than min'"
      );

      await expectRevert(
        launchpadCrowdsale.buyTokensFor(expectBuyAccount, expectPaymentTokens[i], BN_ONE, {
          from: defaultBuyAccount,
        }),
        "HoldErc20TokenCrowdsaleHelper: account hold less than min'"
      );
    }
  });
  */

  it("should not allow not whitelisted address to buy tokens", async () => {
    const expectBuyAccount = accounts[8];
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];

    // advance to opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.add(time.duration.seconds(1)));

    await addEjsToken(expectBuyAccount, ether(MIN_TOKEN_HOLD_AMOUNT));

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      await expectRevert(
        launchpadCrowdsale.buyTokens(expectPaymentTokens[i], BN_ONE, {
          from: expectBuyAccount,
        }),
        "WhitelistCrowdsaleHelper: account not whitelisted"
      );

      await expectRevert(
        launchpadCrowdsale.buyTokensFor(expectBuyAccount, expectPaymentTokens[i], BN_ONE, {
          from: defaultBuyAccount,
        }),
        "WhitelistCrowdsaleHelper: account not whitelisted"
      );
    }
  });

  it("should not allow user to buy more tokens than allocated", async () => {
    const expectBuyAccount = accounts[8];
    const expectPaymentDecimal = new BN(crowdsalePaymentDecimal.toString());
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];
    const expectPaymentDecimals = [expectPaymentDecimal, expectPaymentDecimal];
    const lotSize = defaultBuyWhitelistAmount;
    const rate = new BN(crowdsaleRate.toString());
    const expectBuyLots = new BN(MAX_LOTS + 1);

    // advance to opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.add(time.duration.seconds(1)));

    await addEjsToken(expectBuyAccount, ether(MIN_TOKEN_HOLD_AMOUNT));
    await launchpadWhitelist.addWhitelisted(expectBuyAccount, defaultBuyWhitelistAmount, {
      from: defaultGovernanceAccount,
    });

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      const expectSellAccount = await launchpadCrowdsale.wallet();
      const scale = new BN("10").pow(new BN("18").sub(expectPaymentDecimals[i]));
      const expectBuyWeiAmount = calculateWeiAmount(lotSize, expectBuyLots, rate);

      await addCapital(expectPaymentTokens[i], expectBuyAccount, expectBuyWeiAmount, scale);
      const sellerUsdBalanceBeforeBuy = await approveCrowdsale(
        expectPaymentTokens[i],
        expectBuyAccount,
        expectBuyWeiAmount,
        scale,
        expectSellAccount
      );

      // const tokensPurchasedByBeneficiary = await launchpadCrowdsale.getTokensPurchasedBy(expectBuyAccount);
      // const beneficiaryBalanceAfterBuy = tokensPurchasedByBeneficiary.add(expectBuyTokenAmount);
      // const beneficiaryCap = await launchpadCrowdsale.getBeneficiaryCap(expectBuyAccount);
      // const beneficiaryNotExceedCap = beneficiaryBalanceAfterBuy <= beneficiaryCap;
      // console.log(
      //   `${i}: beneficiaryBalanceAfterBuy=${beneficiaryBalanceAfterBuy}, beneficiaryCap=${beneficiaryCap}, beneficiaryNotExceedCap=${beneficiaryNotExceedCap}`
      // );

      await expectRevert(
        launchpadCrowdsale.buyTokens(expectPaymentTokens[i], expectBuyLots, {
          from: expectBuyAccount,
        }),
        "LaunchpadCrowdsale: beneficiary cap exceeded"
      );

      await expectRevert(
        launchpadCrowdsale.buyTokensFor(expectBuyAccount, expectPaymentTokens[i], expectBuyLots, {
          from: defaultBuyAccount,
        }),
        "LaunchpadCrowdsale: beneficiary cap exceeded"
      );
    }
  });

  it("should not allow get tokens purchased by beneficiary for zero address", async () => {
    await expectRevert(
      launchpadCrowdsale.getTokensPurchasedBy(ZERO_ADDRESS),
      "LaunchpadWhitelistCrowdsaleHelper: zero beneficiary address"
    );
  });

  it("should allow governance account to change governance account", async () => {
    const nonGovernanceAccount = accounts[9];

    const expectNewGovernanceAccount = nonGovernanceAccount;
    await launchpadCrowdsale.setGovernanceAccount(nonGovernanceAccount, { from: defaultGovernanceAccount });
    const newGovernanceAccount = await launchpadCrowdsale.governanceAccount();

    assert.strictEqual(
      newGovernanceAccount,
      expectNewGovernanceAccount,
      `New governance account is ${newGovernanceAccount} instead of ${expectNewGovernanceAccount}`
    );

    await expectRevert(
      launchpadCrowdsale.setGovernanceAccount(defaultGovernanceAccount, { from: defaultGovernanceAccount }),
      "LaunchpadCrowdsale: sender unauthorized"
    );

    const expectGovernanceAccount = defaultGovernanceAccount;
    await launchpadCrowdsale.setGovernanceAccount(defaultGovernanceAccount, { from: expectNewGovernanceAccount });
    const governanceAccount = await launchpadCrowdsale.governanceAccount();

    assert.strictEqual(
      governanceAccount,
      expectGovernanceAccount,
      `Governance account is ${governanceAccount} instead of ${expectGovernanceAccount}`
    );
  });

  it("should not allow non governance account to change governance account", async () => {
    const nonGovernanceAccount = accounts[9];

    await expectRevert(
      launchpadCrowdsale.setGovernanceAccount(nonGovernanceAccount, { from: nonGovernanceAccount }),
      "LaunchpadCrowdsale: sender unauthorized"
    );

    await expectRevert(
      launchpadCrowdsale.setGovernanceAccount(defaultCrowdsaleAdmin, { from: defaultCrowdsaleAdmin }),
      "LaunchpadCrowdsale: sender unauthorized"
    );
  });

  it("should not allow set governance account to zero address", async () => {
    await expectRevert(
      launchpadCrowdsale.setGovernanceAccount(ZERO_ADDRESS, { from: defaultGovernanceAccount }),
      "LaunchpadCrowdsale: zero account"
    );
  });

  it("should allow governance account to change crowdsale admin", async () => {
    const nonCrowdsaleAdmin = accounts[9];

    const expectNewCrowdsaleAdmin = nonCrowdsaleAdmin;
    await launchpadCrowdsale.setCrowdsaleAdmin(nonCrowdsaleAdmin, { from: defaultGovernanceAccount });
    const newCrowdsaleAdmin = await launchpadCrowdsale.crowdsaleAdmin();

    assert.strictEqual(
      newCrowdsaleAdmin,
      expectNewCrowdsaleAdmin,
      `New crowdsale admin is ${newCrowdsaleAdmin} instead of ${expectNewCrowdsaleAdmin}`
    );

    const expectCrowdsaleAdmin = defaultCrowdsaleAdmin;
    await launchpadCrowdsale.setCrowdsaleAdmin(defaultCrowdsaleAdmin, { from: defaultGovernanceAccount });
    const crowdsaleAdmin = await launchpadCrowdsale.crowdsaleAdmin();

    assert.strictEqual(
      crowdsaleAdmin,
      expectCrowdsaleAdmin,
      `Crowdsale admin is ${crowdsaleAdmin} instead of ${expectCrowdsaleAdmin}`
    );
  });

  it("should not allow non governance account to change crowdsale admin", async () => {
    const nonGovernanceAccount = accounts[9];

    await expectRevert(
      launchpadCrowdsale.setCrowdsaleAdmin(nonGovernanceAccount, { from: nonGovernanceAccount }),
      "LaunchpadCrowdsale: sender unauthorized"
    );

    await expectRevert(
      launchpadCrowdsale.setCrowdsaleAdmin(defaultCrowdsaleAdmin, { from: defaultCrowdsaleAdmin }),
      "LaunchpadCrowdsale: sender unauthorized"
    );
  });

  it("should not allow set crowdsale admin to zero address", async () => {
    await expectRevert(
      launchpadCrowdsale.setCrowdsaleAdmin(ZERO_ADDRESS, { from: defaultGovernanceAccount }),
      "LaunchpadCrowdsale: zero account"
    );
  });

  it("should only allow crowdsale admin to pause and unpause", async () => {
    const nonCrowdsaleAdmin = accounts[9];
    const expectCrowdsaleAdmin = defaultCrowdsaleAdmin;

    const expectPausedBeforePause = false;
    const paused = await launchpadCrowdsale.paused();

    assert.strictEqual(
      paused,
      expectPausedBeforePause,
      `Paused before pause is ${paused} instead of ${expectPausedBeforePause}`
    );

    const pause = await launchpadCrowdsale.pause({ from: expectCrowdsaleAdmin });

    expectEvent(pause, "Paused", {
      account: expectCrowdsaleAdmin,
    });

    const expectPausedAfterPause = true;
    const pausedAfterPause = await launchpadCrowdsale.paused();

    assert.strictEqual(
      pausedAfterPause,
      expectPausedAfterPause,
      `Paused after pause is ${pausedAfterPause} instead of ${expectPausedAfterPause}`
    );

    await expectRevert(
      launchpadCrowdsale.pause({ from: nonCrowdsaleAdmin }),
      "LaunchpadCrowdsale: sender unauthorized"
    );

    await expectRevert(launchpadCrowdsale.pause({ from: expectCrowdsaleAdmin }), "Pausable: paused");

    const unpause = await launchpadCrowdsale.unpause({ from: expectCrowdsaleAdmin });

    expectEvent(unpause, "Unpaused", {
      account: expectCrowdsaleAdmin,
    });

    const expectPausedAfterUnpause = false;
    const pausedAfterUnpause = await launchpadCrowdsale.paused();

    assert.strictEqual(
      pausedAfterUnpause,
      expectPausedAfterUnpause,
      `Paused after unpause is ${pausedAfterUnpause} instead of ${expectPausedAfterUnpause}`
    );

    await expectRevert(
      launchpadCrowdsale.unpause({ from: nonCrowdsaleAdmin }),
      "LaunchpadCrowdsale: sender unauthorized"
    );

    await expectRevert(launchpadCrowdsale.unpause({ from: expectCrowdsaleAdmin }), "Pausable: not paused");
  });

  it("should only allow crowdsale admin to extend closing time", async () => {
    const nonCrowdsaleAdmin = accounts[9];

    const expectClosingTimeBeforeExtend = defaultCrowdsaleClosingTime;
    const expectHasClosedBeforeExtend = false;

    const closingTimeBeforeExtend = await launchpadCrowdsale.closingTime();
    const hasClosedBeforeExtend = await launchpadCrowdsale.hasClosed();

    assert.ok(
      closingTimeBeforeExtend.eq(expectClosingTimeBeforeExtend),
      `Closing time before extend is ${closingTimeBeforeExtend} instead of ${expectClosingTimeBeforeExtend}`
    );

    assert.strictEqual(
      hasClosedBeforeExtend,
      expectHasClosedBeforeExtend,
      `Has closed before extend is ${hasClosedBeforeExtend} instead of ${expectHasClosedBeforeExtend}`
    );

    const expectClosingTimeAfterExtend = defaultCrowdsaleClosingTime.add(time.duration.minutes(30));
    const expectHasClosedAfterExtend = false;

    const extendTime = await launchpadCrowdsale.extendTime(expectClosingTimeAfterExtend, {
      from: defaultCrowdsaleAdmin,
    });

    expectEvent(extendTime, "TimedCrowdsaleExtended", {
      prevClosingTime: expectClosingTimeBeforeExtend,
      newClosingTime: expectClosingTimeAfterExtend,
    });

    const closingTimeAfterExtend = await launchpadCrowdsale.closingTime();
    const hasClosedAfterExtend = await launchpadCrowdsale.hasClosed();

    assert.ok(
      closingTimeAfterExtend.eq(expectClosingTimeAfterExtend),
      `Closing time after extend is ${closingTimeAfterExtend} instead of ${expectClosingTimeAfterExtend}`
    );

    assert.strictEqual(
      hasClosedAfterExtend,
      expectHasClosedAfterExtend,
      `Has closed after extend is ${hasClosedAfterExtend} instead of ${expectHasClosedAfterExtend}`
    );

    await expectRevert(
      launchpadCrowdsale.extendTime(expectClosingTimeAfterExtend, { from: nonCrowdsaleAdmin }),
      "LaunchpadCrowdsale: sender unauthorized"
    );

    await expectRevert(
      launchpadCrowdsale.extendTime(expectClosingTimeAfterExtend, { from: defaultCrowdsaleAdmin }),
      "TimedCrowdsaleHelper: before current closing time"
    );

    await time.increaseTo(expectClosingTimeAfterExtend.add(time.duration.seconds(1)));

    const expectIsOpen = false;
    const expectHasClosed = true;

    const isOpen = await launchpadCrowdsale.isOpen();
    const hasClosed = await launchpadCrowdsale.hasClosed();

    assert.strictEqual(isOpen, expectIsOpen, `Is open is ${isOpen} instead of ${expectIsOpen}`);

    assert.strictEqual(hasClosed, expectHasClosed, `Has closed is ${hasClosed} instead of ${expectHasClosed}`);

    await expectRevert(
      launchpadCrowdsale.extendTime(expectClosingTimeAfterExtend, { from: defaultCrowdsaleAdmin }),
      "TimedCrowdsaleHelper: already closed"
    );
  });

  async function addCapital(tokenAddress, account, weiAmount, scale) {
    const amount = weiAmount.div(scale);

    switch (tokenAddress) {
      case usdcMock.address:
        // console.log(`USDC mock`);

        await usdcMock.mint(account, amount, { from: defaultGovernanceAccount });
        break;
      case usdtMock.address:
        // console.log(`USDT mock`);

        await usdtMock.issue(amount, { from: defaultGovernanceAccount });
        await usdtMock.transfer(account, amount, { from: defaultGovernanceAccount });
        break;
      default:
        throw new Error(`Unknown token: ${tokenAddress}`);
    }
  }

  async function addEjsToken(account, weiAmount) {
    await ejsToken.mint(account, weiAmount, { from: defaultGovernanceAccount });
  }

  async function approveCrowdsale(tokenAddress, buyerAddress, weiAmount, scale, sellerAddress) {
    const expectAllowance = weiAmount.div(scale);

    let approve;
    let allowance;
    let sellerUsdBalanceBeforeBuy;

    switch (tokenAddress) {
      case usdcMock.address:
        // console.log(`USDC mock`);

        approve = await usdcMock.approve(launchpadCrowdsale.address, weiAmount.div(scale), {
          from: buyerAddress,
        });
        allowance = await usdcMock.allowance(buyerAddress, launchpadCrowdsale.address);
        sellerUsdBalanceBeforeBuy = await usdcMock.balanceOf(sellerAddress);
        break;
      case usdtMock.address:
        // console.log(`USDT mock`);

        approve = await usdtMock.approve(launchpadCrowdsale.address, weiAmount.div(scale), {
          from: buyerAddress,
        });
        allowance = await usdtMock.allowance(buyerAddress, launchpadCrowdsale.address);
        sellerUsdBalanceBeforeBuy = await usdtMock.balanceOf(sellerAddress);
        break;
      default:
        throw new Error(`Unknown payment token before buy: ${tokenAddress}`);
    }

    assert.ok(allowance.eq(expectAllowance), `Allowance is ${allowance} instead of ${expectAllowance}`);

    return sellerUsdBalanceBeforeBuy;
  }

  function calculateTokenAmount(lotSize, lots) {
    return lots.mul(lotSize);
  }

  function calculateWeiAmount(lotSize, lots, rate) {
    const tokenAmount = calculateTokenAmount(lotSize, lots);
    return tokenAmount.mul(rate).div(TOKEN_SELLING_SCALE);
  }
});
