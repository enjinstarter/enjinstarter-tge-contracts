const assert = require("assert");
const hre = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const timeMachine = require("ganache-time-traveler");
const { expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");
const { BIGNUMBER_ZERO, BN, BN_ZERO, BN_ONE, ZERO_ADDRESS, ether, ...testHelpers } = require("./test-helpers");

describe("EjsCrowdsale", () => {
  const TOKEN_SELLING_SCALE = ether("1");
  const MAX_NUM_PAYMENT_TOKENS = 10;
  const MAX_LOTS = 20;

  const publicTokenAmount = ether("100000000");
  const crowdsalePaymentDecimal = BigNumber.from("6");
  const crowdsaleRate = hre.ethers.utils.parseEther("0.008");
  const crowdsaleLotSize = BigNumber.from("25000"); // USD200 worth of tokens being sold
  const crowdsaleMaxLots = BigNumber.from(MAX_LOTS);

  let accounts;
  let defaultBuyAccount;
  let defaultCrowdsaleInfo;
  let defaultCrowdsaleClosingTime;
  let defaultCrowdsaleOpeningTime;
  let defaultScheduleStartTimestamp;
  let defaultGovernanceAccount;
  let defaultCrowdsaleAdmin;
  let defaultPaymentTokensInfo;
  let defaultTimeframe;
  let defaultWallet;
  let ejsCrowdsale;
  let ejsToken;
  let snapshotId;
  let usdtMock;
  let vesting;
  let whitelist;

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

    const cliffDurationDays = BN_ZERO;
    const percentReleaseAtScheduleStart = ether("50");
    const percentReleaseForEachInterval = ether("50");
    const intervalDays = new BN("30");
    const gapDays = new BN("0");
    const numberOfIntervals = new BN("1");
    const releaseMethod = new BN("0"); // IntervalEnd
    const allowAccumulate = true;

    vesting = await testHelpers.newVesting(
      ejsToken.address,
      cliffDurationDays,
      percentReleaseAtScheduleStart,
      percentReleaseForEachInterval,
      intervalDays,
      gapDays,
      numberOfIntervals,
      releaseMethod,
      allowAccumulate
    );

    usdcMock = await testHelpers.newUsdcMock(
      defaultGovernanceAccount,
      defaultGovernanceAccount,
      defaultGovernanceAccount,
      defaultGovernanceAccount,
      defaultGovernanceAccount
    );
    usdtMock = await testHelpers.newUsdtMock();
    whitelist = await testHelpers.newWhitelist();
    defaultCrowdsaleInfo = {
      tokenCap: hre.ethers.utils.parseEther("100000000"),
      vestingContract: vesting.address,
      whitelistContract: whitelist.address,
    };
    const latestBlockTimestamp = await time.latest();
    defaultCrowdsaleOpeningTime = latestBlockTimestamp.add(time.duration.minutes(30));
    defaultCrowdsaleClosingTime = defaultCrowdsaleOpeningTime.add(time.duration.hours(1));
    defaultTimeframe = {
      openingTime: BigNumber.from(defaultCrowdsaleOpeningTime.toString(10)),
      closingTime: BigNumber.from(defaultCrowdsaleClosingTime.toString(10)),
    };
    defaultScheduleStartTimestamp = defaultCrowdsaleClosingTime.add(time.duration.hours(1));
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
    ejsCrowdsale = await testHelpers.newEjsCrowdsale(
      defaultWallet,
      ejsToken.address,
      defaultCrowdsaleInfo,
      defaultTimeframe,
      defaultPaymentTokensInfo
    );

    const minterAccount = defaultGovernanceAccount;
    const minterAllowedAmount = new BN("800000000000"); // max 200 accounts multiply by max 20 lots (USD4000 worth of tokens being sold equivalent to 500000 tokens)
    const configureMinterSuccess = await usdcMock.configureMinter(minterAccount, minterAllowedAmount, {
      from: defaultGovernanceAccount,
    });
    if (!configureMinterSuccess) {
      throw new Error(`Failed to configure minter: account=${minterAccount}, amount=${minterAllowedAmount}`);
    }

    await ejsToken.mint(vesting.address, publicTokenAmount, { from: defaultGovernanceAccount });
    await ejsToken.setMinterAccount(ejsCrowdsale.address, { from: defaultGovernanceAccount });
    await vesting.setVestingAdmin(ejsCrowdsale.address, { from: defaultGovernanceAccount });
    await whitelist.addWhitelisted(defaultBuyAccount, { from: defaultGovernanceAccount });
    await ejsCrowdsale.setCrowdsaleAdmin(defaultCrowdsaleAdmin, { from: defaultGovernanceAccount });
  });

  it("should be initialized correctly", async () => {
    const expectTokenSelling = ejsToken.address;
    const expectWallet = defaultWallet;
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];
    const expectRate = ether("0.008");
    const expectRates = [expectRate, expectRate];
    const expectLotSize = new BN(crowdsaleLotSize.toString());
    const expectMaxLots = new BN(crowdsaleMaxLots.toString());
    const expectWeiRaised = [BN_ZERO, BN_ZERO];
    const expectTokensSold = BN_ZERO;
    const expectIsPaymentToken = [true, true];
    const expectTokenCap = ether("100000000");
    const expectTokenCapReached = false;
    const expectBeneficiaryCap = ether("500000");
    const expectTokensPurchasedBy = BN_ZERO;
    const expectMaxLotsPerBeneficiary = new BN("20");
    const expectAvailableLotsForWhitelistedBeneficiary = expectMaxLotsPerBeneficiary;
    const expectAvailableLotsForNonWhitelistedBeneficiary = BN_ZERO;
    const expectPaused = false;
    const expectOpeningTime = defaultCrowdsaleOpeningTime;
    const expectClosingTime = defaultCrowdsaleClosingTime;
    const expectIsOpen = false;
    const expectHasClosed = false;

    const tokenSelling = await ejsCrowdsale.tokenSelling();
    const wallet = await ejsCrowdsale.wallet();
    const paymentTokens = await ejsCrowdsale.paymentTokens();
    const lotSize = await ejsCrowdsale.lotSize();
    const maxLots = await ejsCrowdsale.maxLots();
    const tokensSold = await ejsCrowdsale.tokensSold();
    const tokenCap = await ejsCrowdsale.tokenCap();
    const tokenCapReached = await ejsCrowdsale.tokenCapReached(expectTokensSold);
    const beneficiaryCap = await ejsCrowdsale.getBeneficiaryCap();
    const tokensPurchasedBy = await ejsCrowdsale.getTokensPurchasedBy(defaultGovernanceAccount);
    const paused = await ejsCrowdsale.paused();
    const openingTime = await ejsCrowdsale.openingTime();
    const closingTime = await ejsCrowdsale.closingTime();
    const isOpen = await ejsCrowdsale.isOpen();
    const hasClosed = await ejsCrowdsale.hasClosed();

    assert.strictEqual(
      tokenSelling,
      expectTokenSelling,
      `Token selling is ${tokenSelling} instead of ${expectTokenSelling}`
    );
    assert.strictEqual(wallet, expectWallet, `Wallet is ${wallet} instead of ${expectWallet}`);
    assert.ok(lotSize.eq(expectLotSize), `Lot size is ${lotSize} instead of ${expectLotSize}`);
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
      beneficiaryCap.eq(expectBeneficiaryCap),
      `Beneficiary cap is ${beneficiaryCap} instead of ${expectBeneficiaryCap}`
    );

    assert.ok(
      tokensPurchasedBy.eq(expectTokensPurchasedBy),
      `Beneficiary contribution is ${tokensPurchasedBy} instead of ${expectTokensPurchasedBy}`
    );

    assert.strictEqual(paused, expectPaused, `Paused is ${paused} instead of ${expectPaused}`);

    assert.ok(openingTime.eq(expectOpeningTime), `Opening time is ${openingTime} instead of ${expectOpeningTime}`);
    assert.ok(closingTime.eq(expectClosingTime), `Closing time is ${closingTime} instead of ${expectClosingTime}`);
    assert.strictEqual(isOpen, expectIsOpen, `Is open is ${isOpen} instead of ${expectIsOpen}`);
    assert.strictEqual(hasClosed, expectHasClosed, `Has closed is ${hasClosed} instead of ${expectHasClosed}`);

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      const rate = await ejsCrowdsale.rate(expectPaymentTokens[i]);
      const weiRaisedFor = await ejsCrowdsale.weiRaisedFor(expectPaymentTokens[i]);
      const isPaymentToken = await ejsCrowdsale.isPaymentToken(expectPaymentTokens[i]);
      const availableLotsForWhitelistedBeneficiary = await ejsCrowdsale.getAvailableLotsFor(defaultBuyAccount);
      const availableLotsForNonWhitelistedBeneficiary = await ejsCrowdsale.getAvailableLotsFor(
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
    const lotSize = new BN(crowdsaleLotSize.toString());

    for (let i = 0; i < MAX_LOTS; i++) {
      const expectGetTokenAmount = calculateTokenAmount(lotSize, new BN(i + 1));

      const getTokenAmount = await ejsCrowdsale.getTokenAmount(new BN(i + 1));

      assert.ok(
        getTokenAmount.eq(expectGetTokenAmount),
        `${i}: Get token amount for ${i + 1} lot(s) is ${getTokenAmount} instead of ${expectGetTokenAmount}`
      );
    }
  });

  it("should return correct wei amount", async () => {
    const lotSize = new BN(crowdsaleLotSize.toString());
    const rate = new BN(crowdsaleRate.toString());
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      for (let j = 0; j < MAX_LOTS; j++) {
        const expectGetWeiAmount = calculateWeiAmount(lotSize, new BN(j + 1), rate);

        // console.log(`${i}, ${j}: lotSize=${lotSize}, rate=${rate}, expectGetWeiAmount=${expectGetWeiAmount}`);

        const getWeiAmount = await ejsCrowdsale.getWeiAmount(expectPaymentTokens[i], j + 1);

        assert.ok(
          getWeiAmount.eq(expectGetWeiAmount),
          `${i}: Get wei amount for ${j + 1} is ${getWeiAmount} instead of ${expectGetWeiAmount}`
        );
      }
    }
  });

  it("should buy correct token amount", async () => {
    const lotSize = new BN(crowdsaleLotSize.toString());
    const rate = new BN(crowdsaleRate.toString());
    const expectSellAccount = await ejsCrowdsale.wallet();

    const expectPaymentTokens = [usdcMock.address, usdtMock.address];
    const expectPaymentDecimal = new BN(crowdsalePaymentDecimal.toString());
    const expectPaymentDecimals = [expectPaymentDecimal, expectPaymentDecimal];
    const expectTokenCapReached = false;
    const expectGrantIsRevocable = false;
    const expectMaxLots = new BN(crowdsaleMaxLots.toString());

    // advance to opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.add(time.duration.seconds(1)));

    const expectBuyerEjsBalanceAfterBuy = BN_ZERO;
    const expectEjsTotalSupplyAfterBuy = publicTokenAmount;

    let expectTokensSoldAfterBuy = new BN("0");

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      const scale = new BN("10").pow(new BN("18").sub(expectPaymentDecimals[i]));

      const halfMaxLots = MAX_LOTS / 2;
      for (let j = 0; j < halfMaxLots; j++) {
        let expectBeneficiaryTotalLotsAfterBuy = new BN("0");
        let expectTokensPurchasedByAfterBuy = new BN("0");
        let expectGrantAmountAfterBuy = new BN("0");

        const expectBuyAccount = accounts[10 + i * halfMaxLots + j]; // assumes max 10 accounts
        await addCapital(expectPaymentTokens[i], expectBuyAccount, ether("4000"), scale);
        await whitelist.addWhitelisted(expectBuyAccount, { from: defaultGovernanceAccount });

        for (let k = 0; k < 2; k++) {
          const expectBuyLots = k == 0 ? new BN(j + 1) : new BN(MAX_LOTS - j - 1);
          const expectBuyTokenAmount = calculateTokenAmount(lotSize, expectBuyLots);
          const expectBuyWeiAmount = calculateWeiAmount(lotSize, expectBuyLots, rate);

          expectBeneficiaryTotalLotsAfterBuy = expectBeneficiaryTotalLotsAfterBuy.add(expectBuyLots);
          expectTokensPurchasedByAfterBuy = expectTokensPurchasedByAfterBuy.add(expectBuyTokenAmount);
          expectTokensSoldAfterBuy = expectTokensSoldAfterBuy.add(expectBuyTokenAmount);
          expectGrantAmountAfterBuy = expectGrantAmountAfterBuy.add(expectBuyTokenAmount);
          const expectAvailableLotsForBeneficiaryAfterBuy = expectMaxLots.sub(expectBeneficiaryTotalLotsAfterBuy);

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

          const buyToken = await ejsCrowdsale.buyTokens(expectPaymentTokens[i], expectBuyLots, {
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

          await expectEvent.inTransaction(buyToken.tx, vesting, "VestingGrantAdded", {
            account: expectBuyAccount,
            grantAmount: expectBuyTokenAmount,
            isRevocable: expectGrantIsRevocable,
          });

          const tokenCapReached = await ejsCrowdsale.tokenCapReached(expectTokensSoldAfterBuy);
          const tokensPurchasedByAfterBuy = await ejsCrowdsale.getTokensPurchasedBy(expectBuyAccount);
          const tokensSoldAfterBuy = await ejsCrowdsale.tokensSold();
          const buyerEjsBalanceAfterBuy = await ejsToken.balanceOf(expectBuyAccount);
          const ejsTotalSupplyAfterBuy = await ejsToken.totalSupply();
          const vestingGrantAfterBuy = await vesting.vestingGrantFor(expectBuyAccount);
          const maxLots = await ejsCrowdsale.maxLots();
          const availableLotsForBeneficiary = await ejsCrowdsale.getAvailableLotsFor(expectBuyAccount);

          assert.strictEqual(
            tokenCapReached,
            expectTokenCapReached,
            `${i}, ${j}, ${k}: Token cap reached is ${tokenCapReached} instead of ${expectTokenCapReached}`
          );

          assert.ok(
            tokensPurchasedByAfterBuy.eq(expectTokensPurchasedByAfterBuy),
            `${i}, ${j}, ${k}: Tokens purchased by beneficiary after buy ${expectBuyLots} lots for ${expectBuyWeiAmount} is ${tokensPurchasedByAfterBuy} instead of ${expectTokensPurchasedByAfterBuy}`
          );

          assert.ok(
            tokensSoldAfterBuy.eq(expectTokensSoldAfterBuy),
            `${i}, ${j}, ${k}: Tokens sold after buy ${expectBuyLots} tokens for ${expectBuyWeiAmount} is ${tokensSoldAfterBuy} instead of ${expectTokensSoldAfterBuy}`
          );

          assert.ok(
            buyerEjsBalanceAfterBuy.eq(expectBuyerEjsBalanceAfterBuy),
            `${i}, ${j}, ${k}: Buyer EJS balance after buy ${expectBuyLots} tokens for ${expectBuyWeiAmount} is ${buyerEjsBalanceAfterBuy} instead of ${expectBuyerEjsBalanceAfterBuy}`
          );

          assert.ok(
            ejsTotalSupplyAfterBuy.eq(expectEjsTotalSupplyAfterBuy),
            `${i}, ${j}, ${k}: Total supply after buy ${expectBuyLots} tokens for ${expectBuyWeiAmount} is ${ejsTotalSupplyAfterBuy} instead of ${expectEjsTotalSupplyAfterBuy}`
          );

          assert.ok(
            vestingGrantAfterBuy[0].eq(expectGrantAmountAfterBuy),
            `${i}, ${j}, ${k}: Grant amount after buy ${expectBuyLots} tokens for ${expectBuyWeiAmount} is ${vestingGrantAfterBuy[0]} instead of ${expectGrantAmountAfterBuy}`
          );

          assert.ok(
            maxLots.eq(expectMaxLots),
            `${i}, ${j}, ${k}: Max lots per beneficiary is ${maxLots} instead of ${expectMaxLots}`
          );

          assert.ok(
            availableLotsForBeneficiary.eq(expectAvailableLotsForBeneficiaryAfterBuy),
            `${i}, ${j}, ${k}: Available lots for beneficiary is ${availableLotsForBeneficiary} instead of ${expectAvailableLotsForBeneficiaryAfterBuy}`
          );

          const expectSellerUsdBalanceAfterBuy = sellerUsdBalanceBeforeBuy.add(expectBuyWeiAmount.div(scale));

          switch (expectPaymentTokens[i]) {
            case usdcMock.address:
              const sellerUsdcBalanceAfterBuy = await usdcMock.balanceOf(expectSellAccount);

              assert.ok(
                sellerUsdcBalanceAfterBuy.eq(expectSellerUsdBalanceAfterBuy),
                `${i}, ${j}, ${k}: Seller USDC balance after buy tokens for ${expectBuyWeiAmount} is ${sellerUsdcBalanceAfterBuy} instead of ${expectSellerUsdBalanceAfterBuy}`
              );

              break;
            case usdtMock.address:
              const sellerUsdtBalanceAfterBuy = await usdtMock.balanceOf(expectSellAccount);

              assert.ok(
                sellerUsdtBalanceAfterBuy.eq(expectSellerUsdBalanceAfterBuy),
                `${i}, ${j}, ${k}: Seller USDT balance after buy tokens for ${expectBuyWeiAmount} is ${sellerUsdtBalanceAfterBuy} instead of ${expectSellerUsdBalanceAfterBuy}`
              );

              break;
            default:
              throw new Error(`${i}, ${j}, ${k}: Unknown payment token after buy: ${expectPaymentTokens[i]}`);
          }
        }
      }
    }
  });

  it("should not allow to exceed beneficiary cap for buy tokens", async () => {
    const lotSize = new BN(crowdsaleLotSize.toString());
    const rate = new BN(crowdsaleRate.toString());
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];
    const expectPaymentDecimal = new BN(crowdsalePaymentDecimal.toString());
    const expectPaymentDecimals = [expectPaymentDecimal, expectPaymentDecimal];
    const expectSellAccount = await ejsCrowdsale.wallet();
    const notWhitelistedBuyAccount = accounts[6];
    const expectGrantIsRevocable = false;

    // advance to opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.add(time.duration.seconds(1)));

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      const expectBuyAccount = accounts[10 + i]; // assumes max 10 accounts
      const scale = new BN("10").pow(new BN("18").sub(expectPaymentDecimals[i]));
      await whitelist.addWhitelisted(expectBuyAccount, { from: defaultGovernanceAccount });
      await addCapital(expectPaymentTokens[i], expectBuyAccount, ether("3000"), scale);

      for (let j = 0; j < MAX_LOTS; j++) {
        const expectBuyLots = new BN(j + 1);
        const expectBuyTokenAmount = calculateTokenAmount(lotSize, expectBuyLots);
        const expectBuyWeiAmount = calculateWeiAmount(lotSize, expectBuyLots, rate);

        // console.log(`${i}, ${j}: expectBuyLots=${expectBuyLots}, expectBuyWeiAmount=${expectBuyWeiAmount}`);

        if (j < 5) {
          const sellerUsdBalanceBeforeBuy = await approveCrowdsale(
            expectPaymentTokens[i],
            expectBuyAccount,
            expectBuyWeiAmount,
            scale,
            expectSellAccount
          );

          const buyToken = await ejsCrowdsale.buyTokens(expectPaymentTokens[i], expectBuyLots, {
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

          await expectEvent.inTransaction(buyToken.tx, vesting, "VestingGrantAdded", {
            account: expectBuyAccount,
            grantAmount: expectBuyTokenAmount,
            isRevocable: expectGrantIsRevocable,
          });
        } else {
          const getTokensPurchasedBy = await ejsCrowdsale.getTokensPurchasedBy(expectBuyAccount);
          const getWeiAmount = await ejsCrowdsale.getWeiAmount(expectPaymentTokens[i], expectBuyLots);
          // console.log(
          //   `${i}, ${j}: getTokensPurchasedBy=${getTokensPurchasedBy}, expectBuyLots=${expectBuyLots}, getWeiAmount=${getWeiAmount}`
          // );

          await expectRevert(
            ejsCrowdsale.buyTokens(expectPaymentTokens[i], expectBuyLots, {
              from: expectBuyAccount,
            }),
            "IndividuallyCappedCrowdsaleHelper: beneficiary cap exceeded"
          );

          await expectRevert(
            ejsCrowdsale.buyTokensFor(expectBuyAccount, expectPaymentTokens[i], expectBuyLots, {
              from: notWhitelistedBuyAccount,
            }),
            "IndividuallyCappedCrowdsaleHelper: beneficiary cap exceeded"
          );
        }
      }
    }
  });

  it("should not allow to exceed token cap for buy tokens", async () => {
    const maxNumBuysAtMaxLots = 100;
    const lotSize = new BN(crowdsaleLotSize.toString());
    const rate = new BN(crowdsaleRate.toString());
    const notWhitelistedBuyAccount = accounts[6];
    const exceedBuyAccount = accounts[7];
    const expectSellAccount = await ejsCrowdsale.wallet();
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];
    const expectPaymentDecimal = new BN(crowdsalePaymentDecimal.toString());
    const expectPaymentDecimals = [expectPaymentDecimal, expectPaymentDecimal];

    // advance to opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.add(time.duration.seconds(1)));

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      const scale = new BN("10").pow(new BN("18").sub(expectPaymentDecimals[i]));
      const expectBuyLots = new BN(MAX_LOTS);
      const expectBuyWeiAmount = calculateWeiAmount(lotSize, expectBuyLots, rate);

      for (let j = 0; j < maxNumBuysAtMaxLots; j++) {
        const expectBuyAccount = accounts[10 + i * maxNumBuysAtMaxLots + j];
        await whitelist.addWhitelisted(expectBuyAccount, { from: defaultGovernanceAccount });
        await addCapital(expectPaymentTokens[i], expectBuyAccount, expectBuyWeiAmount, scale);
        const sellerUsdBalanceBeforeBuy = await approveCrowdsale(
          expectPaymentTokens[i],
          expectBuyAccount,
          expectBuyWeiAmount,
          scale,
          expectSellAccount
        );

        const buyToken = await ejsCrowdsale.buyTokens(expectPaymentTokens[i], expectBuyLots, {
          from: expectBuyAccount,
        });
      }
    }

    const tokensSold = await ejsCrowdsale.tokensSold();
    // console.log(`tokensSold=${tokensSold}`);

    const expectBuyOneLot = BN_ONE;
    const expectOneLotWeiAmount = calculateWeiAmount(lotSize, expectBuyOneLot, rate);
    await whitelist.addWhitelisted(exceedBuyAccount, { from: defaultGovernanceAccount });

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
        ejsCrowdsale.buyTokens(expectPaymentTokens[i], expectBuyOneLot, {
          from: exceedBuyAccount,
        }),
        "CappedTokenSoldHelper: cap exceeded"
      );

      await expectRevert(
        ejsCrowdsale.buyTokensFor(exceedBuyAccount, expectPaymentTokens[i], expectBuyOneLot, {
          from: notWhitelistedBuyAccount,
        }),
        "CappedTokenSoldHelper: cap exceeded"
      );
    }
  });

  it("should not allow zero wallet address", async () => {
    await expectRevert(
      testHelpers.newEjsCrowdsale(
        ZERO_ADDRESS,
        ejsToken.address,
        defaultCrowdsaleInfo,
        defaultTimeframe,
        defaultPaymentTokensInfo
      ),
      "Crowdsale: zero wallet address"
    );
  });

  it("should not allow zero token selling address", async () => {
    await expectRevert(
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ZERO_ADDRESS,
        defaultCrowdsaleInfo,
        defaultTimeframe,
        defaultPaymentTokensInfo
      ),
      "Crowdsale: zero token selling address"
    );
  });

  it("should not allow zero payment tokens", async () => {
    const paymentTokensInfo = [];

    await expectRevert(
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
        defaultCrowdsaleInfo,
        defaultTimeframe,
        paymentTokensInfo
      ),
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
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
        defaultCrowdsaleInfo,
        defaultTimeframe,
        paymentTokensInfo
      ),
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
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
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
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
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
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
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
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
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
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
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
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
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
      vestingContract: vesting.address,
      whitelistContract: whitelist.address,
    };

    await expectRevert(
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
        crowdsaleInfo,
        defaultTimeframe,
        defaultPaymentTokensInfo
      ),
      "CappedTokenSoldHelper: zero cap"
    );
  });

  it("should not allow zero lot size", async () => {
    const lotsInfo = {
      lotSize: BIGNUMBER_ZERO,
      maxLots: crowdsaleMaxLots,
    };

    await expectRevert(
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
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
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
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
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
        defaultCrowdsaleInfo,
        timeframe,
        defaultPaymentTokensInfo
      ),
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
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
        defaultCrowdsaleInfo,
        timeframe,
        defaultPaymentTokensInfo
      ),
      "TimedCrowdsaleHelper: closing time is before opening time"
    );
  });

  it("should not allow zero vesting contract address", async () => {
    const crowdsaleInfo = {
      tokenCap: hre.ethers.utils.parseEther("100000000"),
      vestingContract: ZERO_ADDRESS,
      whitelistContract: whitelist.address,
    };

    await expectRevert(
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
        crowdsaleInfo,
        defaultTimeframe,
        defaultPaymentTokensInfo
      ),
      "VestedCrowdsale: zero vesting address"
    );
  });

  it("should not allow zero whitelist contract address", async () => {
    const crowdsaleInfo = {
      tokenCap: hre.ethers.utils.parseEther("100000000"),
      vestingContract: vesting.address,
      whitelistContract: ZERO_ADDRESS,
    };

    await expectRevert(
      testHelpers.newEjsCrowdsale(
        defaultWallet,
        ejsToken.address,
        crowdsaleInfo,
        defaultTimeframe,
        defaultPaymentTokensInfo
      ),
      "WhitelistCrowdsaleHelper: zero whitelist address"
    );
  });

  it("should not allow zero token cap for IndividuallyCappedCrowdsaleHelper", async () => {
    await expectRevert(
      testHelpers.newIndividuallyCappedCrowdsaleHelper(BN_ZERO),
      "IndividuallyCappedCrowdsaleHelper: zero cap"
    );
  });

  it("should not allow to get rate for zero payment token address", async () => {
    await expectRevert(ejsCrowdsale.rate(ZERO_ADDRESS), "Crowdsale: zero payment token address");
  });

  it("should not allow to get rate for unaccepted payment token address", async () => {
    await expectRevert(ejsCrowdsale.rate(ejsToken.address), "Crowdsale: payment token unaccepted");
  });

  it("should not allow to get wei raised for zero payment token address", async () => {
    await expectRevert(ejsCrowdsale.weiRaisedFor(ZERO_ADDRESS), "Crowdsale: zero payment token address");
  });

  it("should not allow to get wei raised for unaccepted payment token address", async () => {
    await expectRevert(ejsCrowdsale.weiRaisedFor(ejsToken.address), "Crowdsale: payment token unaccepted");
  });

  it("should not allow to check is payment token for zero payment token address", async () => {
    await expectRevert(ejsCrowdsale.isPaymentToken(ZERO_ADDRESS), "Crowdsale: zero payment token address");
  });

  it("should not allow to get token amount for zero lots", async () => {
    await expectRevert(ejsCrowdsale.getTokenAmount(BN_ZERO), "Crowdsale: zero lots");
  });

  it("should not allow to get wei amount for zero payment token address", async () => {
    await expectRevert(ejsCrowdsale.getWeiAmount(ZERO_ADDRESS, BN_ZERO), "Crowdsale: zero payment token address");
  });

  it("should not allow to get wei amount for unaccepted payment token address", async () => {
    await expectRevert(ejsCrowdsale.getWeiAmount(ejsToken.address, BN_ONE), "Crowdsale: payment token unaccepted");
  });

  it("should not allow to get wei amount for zero lots", async () => {
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      await expectRevert(ejsCrowdsale.getWeiAmount(expectPaymentTokens[i], BN_ZERO), "Crowdsale: zero lots");
    }
  });

  it("should not allow to buy for zero beneficiary address", async () => {
    const notWhitelistedBuyAccount = accounts[6];
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      await expectRevert(
        ejsCrowdsale.buyTokensFor(ZERO_ADDRESS, expectPaymentTokens[i], BN_ONE, {
          from: notWhitelistedBuyAccount,
        }),
        "Crowdsale: zero beneficiary address"
      );
    }
  });

  it("should not allow to buy for zero payment token address", async () => {
    const notWhitelistedBuyAccount = accounts[6];

    await expectRevert(
      ejsCrowdsale.buyTokens(ZERO_ADDRESS, BN_ONE, {
        from: defaultBuyAccount,
      }),
      "Crowdsale: zero payment token address"
    );

    await expectRevert(
      ejsCrowdsale.buyTokensFor(defaultBuyAccount, ZERO_ADDRESS, BN_ONE, {
        from: notWhitelistedBuyAccount,
      }),
      "Crowdsale: zero payment token address"
    );
  });

  it("should not allow to buy for unaccepted payment token address", async () => {
    const notWhitelistedBuyAccount = accounts[6];

    await expectRevert(
      ejsCrowdsale.buyTokens(ejsToken.address, BN_ONE, {
        from: defaultBuyAccount,
      }),
      "Crowdsale: payment token unaccepted"
    );

    await expectRevert(
      ejsCrowdsale.buyTokensFor(defaultBuyAccount, ejsToken.address, BN_ONE, {
        from: notWhitelistedBuyAccount,
      }),
      "Crowdsale: payment token unaccepted"
    );
  });

  it("should not allow to buy for zero lots", async () => {
    const notWhitelistedBuyAccount = accounts[6];
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      await expectRevert(
        ejsCrowdsale.buyTokens(expectPaymentTokens[i], BN_ZERO, {
          from: defaultBuyAccount,
        }),
        "Crowdsale: zero lots"
      );

      await expectRevert(
        ejsCrowdsale.buyTokensFor(defaultBuyAccount, expectPaymentTokens[i], BN_ZERO, {
          from: notWhitelistedBuyAccount,
        }),
        "Crowdsale: zero lots"
      );
    }
  });

  it("should not allow to buy while paused", async () => {
    const lotSize = new BN(crowdsaleLotSize.toString());
    const rate = new BN(crowdsaleRate.toString());
    const expectBuyAccount = accounts[6];
    const expectSellAccount = await ejsCrowdsale.wallet();
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];
    const expectPaymentDecimal = new BN(crowdsalePaymentDecimal.toString());
    const expectPaymentDecimals = [expectPaymentDecimal, expectPaymentDecimal];

    // advance to opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.add(time.duration.seconds(1)));

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      const scale = new BN("10").pow(new BN("18").sub(expectPaymentDecimals[i]));

      await addCapital(expectPaymentTokens[i], defaultBuyAccount, ether("200"), scale);
      await addCapital(expectPaymentTokens[i], expectBuyAccount, ether("200"), scale);

      await ejsCrowdsale.pause({ from: defaultCrowdsaleAdmin });

      await expectRevert(
        ejsCrowdsale.buyTokens(expectPaymentTokens[i], BN_ONE, { from: defaultBuyAccount }),
        "Pausable: paused"
      );
      await expectRevert(
        ejsCrowdsale.buyTokensFor(defaultBuyAccount, expectPaymentTokens[i], BN_ONE, {
          from: expectBuyAccount,
        }),
        "Pausable: paused"
      );

      await ejsCrowdsale.unpause({ from: defaultCrowdsaleAdmin });

      const expectBuyWeiAmount = calculateWeiAmount(lotSize, BN_ONE, rate);

      const sellerUsdBalanceBeforeBuy01 = await approveCrowdsale(
        expectPaymentTokens[i],
        defaultBuyAccount,
        expectBuyWeiAmount,
        scale,
        expectSellAccount
      );

      await assert.doesNotReject(
        async () => await ejsCrowdsale.buyTokens(expectPaymentTokens[i], BN_ONE, { from: defaultBuyAccount })
      );

      const sellerUsdBalanceBeforeBuy02 = await approveCrowdsale(
        expectPaymentTokens[i],
        expectBuyAccount,
        expectBuyWeiAmount,
        scale,
        expectSellAccount
      );

      await assert.doesNotReject(
        async () =>
          await ejsCrowdsale.buyTokensFor(defaultBuyAccount, expectPaymentTokens[i], BN_ONE, {
            from: expectBuyAccount,
          })
      );
    }
  });

  it("should not allow to buy tokens when closed", async () => {
    const expectBuyAccount = accounts[6];
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];

    // advance to just before opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.sub(time.duration.seconds(15)));

    // console.log("before opening time");

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      await expectRevert(
        ejsCrowdsale.buyTokens(expectPaymentTokens[i], BN_ONE, {
          from: expectBuyAccount,
        }),
        "TimedCrowdsaleHelper: not open"
      );

      await expectRevert(
        ejsCrowdsale.buyTokensFor(defaultBuyAccount, expectPaymentTokens[i], BN_ONE, {
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
        ejsCrowdsale.buyTokens(expectPaymentTokens[i], BN_ONE, {
          from: expectBuyAccount,
        }),
        "TimedCrowdsaleHelper: not open"
      );

      await expectRevert(
        ejsCrowdsale.buyTokensFor(expectBuyAccount, expectPaymentTokens[i], BN_ONE, {
          from: defaultBuyAccount,
        }),
        "TimedCrowdsaleHelper: not open"
      );
    }
  });

  it("should not allow not whitelisted address to buy tokens", async () => {
    const expectBuyAccount = accounts[6];
    const expectPaymentTokens = [usdcMock.address, usdtMock.address];

    // advance to opening time
    await time.increaseTo(defaultCrowdsaleOpeningTime.add(time.duration.seconds(1)));

    for (let i = 0; i < expectPaymentTokens.length; i++) {
      // console.log(`${i}: expectPaymentToken: ${expectPaymentTokens[i]}`);

      await expectRevert(
        ejsCrowdsale.buyTokens(expectPaymentTokens[i], BN_ONE, {
          from: expectBuyAccount,
        }),
        "WhitelistCrowdsaleHelper: account not whitelisted"
      );

      await expectRevert(
        ejsCrowdsale.buyTokensFor(expectBuyAccount, expectPaymentTokens[i], BN_ONE, {
          from: defaultBuyAccount,
        }),
        "WhitelistCrowdsaleHelper: account not whitelisted"
      );
    }
  });

  it("should not allow get tokens purchased by beneficiary for zero address", async () => {
    await expectRevert(
      ejsCrowdsale.getTokensPurchasedBy(ZERO_ADDRESS),
      "IndividuallyCappedCrowdsale: zero beneficiary address"
    );
  });

  it("should allow governance account to change governance account", async () => {
    const nonGovernanceAccount = accounts[9];

    const expectNewGovernanceAccount = nonGovernanceAccount;
    await ejsCrowdsale.setGovernanceAccount(nonGovernanceAccount, { from: defaultGovernanceAccount });
    const newGovernanceAccount = await ejsCrowdsale.governanceAccount();

    assert.strictEqual(
      newGovernanceAccount,
      expectNewGovernanceAccount,
      `New governance account is ${newGovernanceAccount} instead of ${expectNewGovernanceAccount}`
    );

    await expectRevert(
      ejsCrowdsale.setGovernanceAccount(defaultGovernanceAccount, { from: defaultGovernanceAccount }),
      "EjsCrowdsale: sender unauthorized"
    );

    const expectGovernanceAccount = defaultGovernanceAccount;
    await ejsCrowdsale.setGovernanceAccount(defaultGovernanceAccount, { from: expectNewGovernanceAccount });
    const governanceAccount = await ejsCrowdsale.governanceAccount();

    assert.strictEqual(
      governanceAccount,
      expectGovernanceAccount,
      `Governance account is ${governanceAccount} instead of ${expectGovernanceAccount}`
    );
  });

  it("should not allow non governance account to change governance account", async () => {
    const nonGovernanceAccount = accounts[9];

    await expectRevert(
      ejsCrowdsale.setGovernanceAccount(nonGovernanceAccount, { from: nonGovernanceAccount }),
      "EjsCrowdsale: sender unauthorized"
    );

    await expectRevert(
      ejsCrowdsale.setGovernanceAccount(defaultCrowdsaleAdmin, { from: defaultCrowdsaleAdmin }),
      "EjsCrowdsale: sender unauthorized"
    );
  });

  it("should not allow set governance account to zero address", async () => {
    await expectRevert(
      ejsCrowdsale.setGovernanceAccount(ZERO_ADDRESS, { from: defaultGovernanceAccount }),
      "EjsCrowdsale: zero account"
    );
  });

  it("should allow governance account to change crowdsale admin", async () => {
    const nonCrowdsaleAdmin = accounts[9];

    const expectNewCrowdsaleAdmin = nonCrowdsaleAdmin;
    await ejsCrowdsale.setCrowdsaleAdmin(nonCrowdsaleAdmin, { from: defaultGovernanceAccount });
    const newCrowdsaleAdmin = await ejsCrowdsale.crowdsaleAdmin();

    assert.strictEqual(
      newCrowdsaleAdmin,
      expectNewCrowdsaleAdmin,
      `New crowdsale admin is ${newCrowdsaleAdmin} instead of ${expectNewCrowdsaleAdmin}`
    );

    const expectCrowdsaleAdmin = defaultCrowdsaleAdmin;
    await ejsCrowdsale.setCrowdsaleAdmin(defaultCrowdsaleAdmin, { from: defaultGovernanceAccount });
    const crowdsaleAdmin = await ejsCrowdsale.crowdsaleAdmin();

    assert.strictEqual(
      crowdsaleAdmin,
      expectCrowdsaleAdmin,
      `Crowdsale admin is ${crowdsaleAdmin} instead of ${expectCrowdsaleAdmin}`
    );
  });

  it("should not allow non governance account to change crowdsale admin", async () => {
    const nonGovernanceAccount = accounts[9];

    await expectRevert(
      ejsCrowdsale.setCrowdsaleAdmin(nonGovernanceAccount, { from: nonGovernanceAccount }),
      "EjsCrowdsale: sender unauthorized"
    );

    await expectRevert(
      ejsCrowdsale.setCrowdsaleAdmin(defaultCrowdsaleAdmin, { from: defaultCrowdsaleAdmin }),
      "EjsCrowdsale: sender unauthorized"
    );
  });

  it("should not allow set crowdsale admin to zero address", async () => {
    await expectRevert(
      ejsCrowdsale.setCrowdsaleAdmin(ZERO_ADDRESS, { from: defaultGovernanceAccount }),
      "EjsCrowdsale: zero account"
    );
  });

  it("should only allow crowdsale admin to pause and unpause", async () => {
    const nonCrowdsaleAdmin = accounts[9];
    const expectCrowdsaleAdmin = defaultCrowdsaleAdmin;

    const expectPausedBeforePause = false;
    const paused = await ejsCrowdsale.paused();

    assert.strictEqual(
      paused,
      expectPausedBeforePause,
      `Paused before pause is ${paused} instead of ${expectPausedBeforePause}`
    );

    const pause = await ejsCrowdsale.pause({ from: expectCrowdsaleAdmin });

    expectEvent(pause, "Paused", {
      account: expectCrowdsaleAdmin,
    });

    const expectPausedAfterPause = true;
    const pausedAfterPause = await ejsCrowdsale.paused();

    assert.strictEqual(
      pausedAfterPause,
      expectPausedAfterPause,
      `Paused after pause is ${pausedAfterPause} instead of ${expectPausedAfterPause}`
    );

    await expectRevert(ejsCrowdsale.pause({ from: nonCrowdsaleAdmin }), "EjsCrowdsale: sender unauthorized");

    await expectRevert(ejsCrowdsale.pause({ from: expectCrowdsaleAdmin }), "Pausable: paused");

    const unpause = await ejsCrowdsale.unpause({ from: expectCrowdsaleAdmin });

    expectEvent(unpause, "Unpaused", {
      account: expectCrowdsaleAdmin,
    });

    const expectPausedAfterUnpause = false;
    const pausedAfterUnpause = await ejsCrowdsale.paused();

    assert.strictEqual(
      pausedAfterUnpause,
      expectPausedAfterUnpause,
      `Paused after unpause is ${pausedAfterUnpause} instead of ${expectPausedAfterUnpause}`
    );

    await expectRevert(ejsCrowdsale.unpause({ from: nonCrowdsaleAdmin }), "EjsCrowdsale: sender unauthorized");

    await expectRevert(ejsCrowdsale.unpause({ from: expectCrowdsaleAdmin }), "Pausable: not paused");
  });

  it("should only allow crowdsale admin to extend closing time", async () => {
    const nonCrowdsaleAdmin = accounts[9];

    const expectClosingTimeBeforeExtend = defaultCrowdsaleClosingTime;
    const expectHasClosedBeforeExtend = false;

    const closingTimeBeforeExtend = await ejsCrowdsale.closingTime();
    const hasClosedBeforeExtend = await ejsCrowdsale.hasClosed();

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

    const extendTime = await ejsCrowdsale.extendTime(expectClosingTimeAfterExtend, { from: defaultCrowdsaleAdmin });

    expectEvent(extendTime, "TimedCrowdsaleExtended", {
      prevClosingTime: expectClosingTimeBeforeExtend,
      newClosingTime: expectClosingTimeAfterExtend,
    });

    const closingTimeAfterExtend = await ejsCrowdsale.closingTime();
    const hasClosedAfterExtend = await ejsCrowdsale.hasClosed();

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
      ejsCrowdsale.extendTime(expectClosingTimeAfterExtend, { from: nonCrowdsaleAdmin }),
      "EjsCrowdsale: sender unauthorized"
    );

    await expectRevert(
      ejsCrowdsale.extendTime(expectClosingTimeAfterExtend, { from: defaultCrowdsaleAdmin }),
      "TimedCrowdsaleHelper: before current closing time"
    );

    await time.increaseTo(expectClosingTimeAfterExtend.add(time.duration.seconds(1)));

    const expectIsOpen = false;
    const expectHasClosed = true;

    const isOpen = await ejsCrowdsale.isOpen();
    const hasClosed = await ejsCrowdsale.hasClosed();

    assert.strictEqual(isOpen, expectIsOpen, `Is open is ${isOpen} instead of ${expectIsOpen}`);

    assert.strictEqual(hasClosed, expectHasClosed, `Has closed is ${hasClosed} instead of ${expectHasClosed}`);

    await expectRevert(
      ejsCrowdsale.extendTime(expectClosingTimeAfterExtend, { from: defaultCrowdsaleAdmin }),
      "TimedCrowdsaleHelper: already closed"
    );
  });

  it("should only allow crowdsale admin to start distribution", async () => {
    const nonCrowdsaleAdmin = accounts[9];

    const expectStartDistributionAccount = ejsCrowdsale.address;
    const expectScheduleStartTimestampBeforeStartDistribution = BN_ZERO;
    const expectScheduleStartTimestampAfterStartDistribution = defaultScheduleStartTimestamp;

    const scheduleStartTimestampBeforeStartDistribution = await vesting.scheduleStartTimestamp();

    assert.ok(
      scheduleStartTimestampBeforeStartDistribution.eq(expectScheduleStartTimestampBeforeStartDistribution),
      `Schedule start timestamp before start distribution is ${scheduleStartTimestampBeforeStartDistribution} instead of ${expectScheduleStartTimestampBeforeStartDistribution}`
    );

    const startDistribution = await ejsCrowdsale.startDistribution(defaultScheduleStartTimestamp, {
      from: defaultCrowdsaleAdmin,
    });

    await expectEvent.inTransaction(startDistribution.tx, vesting, "ScheduleStartTimestampSet", {
      account: expectStartDistributionAccount,
      newScheduleStartTimestamp: expectScheduleStartTimestampAfterStartDistribution,
      oldScheduleStartTimestamp: expectScheduleStartTimestampBeforeStartDistribution,
    });

    const scheduleStartTimestampAfterStartDistribution = await vesting.scheduleStartTimestamp();

    assert.ok(
      scheduleStartTimestampAfterStartDistribution.eq(expectScheduleStartTimestampAfterStartDistribution),
      `Schedule start timestamp after start distribution is ${scheduleStartTimestampAfterStartDistribution} instead of ${expectScheduleStartTimestampAfterStartDistribution}`
    );

    await expectRevert(
      ejsCrowdsale.startDistribution(expectScheduleStartTimestampAfterStartDistribution, { from: nonCrowdsaleAdmin }),
      "EjsCrowdsale: sender unauthorized"
    );

    await expectRevert(
      ejsCrowdsale.startDistribution(defaultCrowdsaleClosingTime.sub(time.duration.seconds(1)), {
        from: defaultCrowdsaleAdmin,
      }),
      "EjsCrowdsale: must be after closing time"
    );

    await time.increaseTo(expectScheduleStartTimestampAfterStartDistribution.add(time.duration.seconds(1)));

    await expectRevert(
      ejsCrowdsale.startDistribution(expectScheduleStartTimestampAfterStartDistribution, {
        from: defaultCrowdsaleAdmin,
      }),
      "Vesting: start before current timestamp"
    );

    await expectRevert(
      ejsCrowdsale.startDistribution(expectScheduleStartTimestampAfterStartDistribution.add(time.duration.hours(1)), {
        from: defaultCrowdsaleAdmin,
      }),
      "Vesting: already started"
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

  async function approveCrowdsale(tokenAddress, buyerAddress, weiAmount, scale, sellerAddress) {
    const expectAllowance = weiAmount.div(scale);

    let approve;
    let allowance;
    let sellerUsdBalanceBeforeBuy;

    switch (tokenAddress) {
      case usdcMock.address:
        // console.log(`USDC mock`);

        approve = await usdcMock.approve(ejsCrowdsale.address, weiAmount.div(scale), {
          from: buyerAddress,
        });
        allowance = await usdcMock.allowance(buyerAddress, ejsCrowdsale.address);
        sellerUsdBalanceBeforeBuy = await usdcMock.balanceOf(sellerAddress);
        break;
      case usdtMock.address:
        // console.log(`USDT mock`);

        approve = await usdtMock.approve(ejsCrowdsale.address, weiAmount.div(scale), {
          from: buyerAddress,
        });
        allowance = await usdtMock.allowance(buyerAddress, ejsCrowdsale.address);
        sellerUsdBalanceBeforeBuy = await usdtMock.balanceOf(sellerAddress);
        break;
      default:
        throw new Error(`Unknown payment token before buy: ${tokenAddress}`);
    }

    assert.ok(allowance.eq(expectAllowance), `Allowance is ${allowance} instead of ${expectAllowance}`);

    return sellerUsdBalanceBeforeBuy;
  }

  function calculateTokenAmount(lotSize, lots) {
    return lots.mul(lotSize).mul(TOKEN_SELLING_SCALE);
  }

  function calculateWeiAmount(lotSize, lots, rate) {
    const tokenAmount = calculateTokenAmount(lotSize, lots);
    return tokenAmount.mul(rate).div(TOKEN_SELLING_SCALE);
  }
});
