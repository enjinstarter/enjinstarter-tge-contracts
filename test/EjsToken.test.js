const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { BN, BN_ZERO, BN_ONE, ZERO_ADDRESS, ether, ...testHelpers } = require("./test-helpers");

describe("EjsToken", () => {
  let accounts;
  let defaultGovernanceAccount;
  let ejsToken;

  before(async () => {
    accounts = await web3.eth.getAccounts();
    defaultGovernanceAccount = accounts[0];
  });

  beforeEach(async () => {
    ejsToken = await testHelpers.newEjsToken();
  });

  it("should be initialized correctly", async () => {
    const expectTokenName = "EnjinStarter";
    const expectTokenSymbol = "EJS";
    const expectTokenDecimals = new BN("18");
    const expectTokenCap = ether("5000000000");
    const expectGovernanceAccount = defaultGovernanceAccount;
    const expectMinterAccount = defaultGovernanceAccount;
    const expectInitialTokenTotalSupply = BN_ZERO;

    const tokenName = await ejsToken.name();
    const tokenSymbol = await ejsToken.symbol();
    const tokenDecimals = await ejsToken.decimals();
    const tokenCap = await ejsToken.cap();
    const initialTokenTotalSupply = await ejsToken.totalSupply();
    const governanceAccount = await ejsToken.governanceAccount();
    const minterAccount = await ejsToken.minterAccount();

    assert.strictEqual(tokenName, expectTokenName, `Token name is ${tokenName} instead of ${expectTokenName}`);
    assert.strictEqual(
      tokenSymbol,
      expectTokenSymbol,
      `Token symbol is ${tokenSymbol} instead of ${expectTokenSymbol}`
    );

    assert.ok(tokenDecimals.eq(expectTokenDecimals), `Decimals is ${tokenDecimals} instead of ${expectTokenDecimals}`);

    assert.ok(tokenCap.eq(expectTokenCap), `Token cap is ${tokenCap} instead of ${expectTokenCap}`);

    assert.ok(
      initialTokenTotalSupply.eq(expectInitialTokenTotalSupply),
      `Initial token total supply is ${initialTokenTotalSupply} instead of ${expectInitialTokenTotalSupply}`
    );

    assert.strictEqual(
      governanceAccount,
      expectGovernanceAccount,
      `Governance account is ${governanceAccount} instead of ${expectGovernanceAccount}`
    );

    assert.strictEqual(
      minterAccount,
      expectMinterAccount,
      `Minter account is ${minterAccount} instead of ${expectMinterAccount}`
    );

    await expectRevert(testHelpers.newEjsToken(undefined, undefined, 0), "ERC20Capped: cap is 0");
  });

  it("should only allow governance account to change governance account", async () => {
    const nonGovernanceAccount = accounts[9];

    await expectRevert(
      ejsToken.setGovernanceAccount(nonGovernanceAccount, { from: nonGovernanceAccount }),
      "EjsToken: sender unauthorized"
    );

    await expectRevert(
      ejsToken.setGovernanceAccount(ZERO_ADDRESS, { from: defaultGovernanceAccount }),
      "EjsToken: zero governance account"
    );

    const expectNewGovernanceAccount = nonGovernanceAccount;

    await ejsToken.setGovernanceAccount(nonGovernanceAccount, { from: defaultGovernanceAccount });
    const newGovernanceAccount = await ejsToken.governanceAccount();

    assert.strictEqual(
      newGovernanceAccount,
      expectNewGovernanceAccount,
      `New governance account is ${newGovernanceAccount} instead of ${expectNewGovernanceAccount}`
    );

    await expectRevert(
      ejsToken.setGovernanceAccount(defaultGovernanceAccount, { from: defaultGovernanceAccount }),
      "EjsToken: sender unauthorized"
    );

    const expectGovernanceAccount = defaultGovernanceAccount;

    await ejsToken.setGovernanceAccount(defaultGovernanceAccount, { from: expectNewGovernanceAccount });
    const governanceAccount = await ejsToken.governanceAccount();

    assert.strictEqual(
      governanceAccount,
      expectGovernanceAccount,
      `Governance account is ${governanceAccount} instead of ${expectGovernanceAccount}`
    );
  });

  it("should only allow governance account to change minter account", async () => {
    const defaultMinterAccount = defaultGovernanceAccount;
    const nonGovernanceAccount = accounts[9];
    const expectNewMinterAccount = accounts[8];

    await expectRevert(
      ejsToken.setMinterAccount(expectNewMinterAccount, { from: nonGovernanceAccount }),
      "EjsToken: sender unauthorized"
    );

    await expectRevert(
      ejsToken.setMinterAccount(ZERO_ADDRESS, { from: defaultGovernanceAccount }),
      "EjsToken: zero minter account"
    );

    await ejsToken.setMinterAccount(expectNewMinterAccount, { from: defaultGovernanceAccount });
    const newMinterAccount = await ejsToken.minterAccount();

    assert.strictEqual(
      newMinterAccount,
      expectNewMinterAccount,
      `New minter account is ${newMinterAccount} instead of ${expectNewMinterAccount}`
    );

    await expectRevert(
      ejsToken.setMinterAccount(defaultMinterAccount, { from: nonGovernanceAccount }),
      "EjsToken: sender unauthorized"
    );

    await ejsToken.setMinterAccount(defaultMinterAccount, { from: defaultGovernanceAccount });
    const minterAccount = await ejsToken.minterAccount();
    assert.strictEqual(
      minterAccount,
      defaultMinterAccount,
      `Minter account is ${minterAccount} instead of ${defaultMinterAccount}`
    );
  });

  it("should only allow minter account to mint", async () => {
    const minterAccount = accounts[5];
    const nonMinterAccount = accounts[6];

    await ejsToken.setMinterAccount(minterAccount, { from: defaultGovernanceAccount });

    const expectMintAmount = ether("123456789.987654321");
    const expectTokenSupply = expectMintAmount;

    const tokenMint = await ejsToken.mint(nonMinterAccount, expectMintAmount, { from: minterAccount });

    expectEvent(tokenMint, "Transfer", {
      from: ZERO_ADDRESS,
      to: nonMinterAccount,
      value: expectMintAmount,
    });

    const mintAmount = await ejsToken.balanceOf(nonMinterAccount);
    const tokenSupply = await ejsToken.totalSupply();

    assert.ok(mintAmount.eq(expectMintAmount), `Mint amount is ${mintAmount} instead of ${expectMintAmount}`);
    assert.ok(tokenSupply.eq(expectTokenSupply), `Token supply is ${tokenSupply} instead of ${expectTokenSupply}`);

    await expectRevert(
      ejsToken.mint(nonMinterAccount, expectMintAmount, { from: nonMinterAccount }),
      "EjsToken: sender unauthorized"
    );
  });

  it("should allow minter account to mint upto cap", async () => {
    const mintAccount01 = accounts[5];
    const mintAccount02 = accounts[6];
    const expectTokenCap = ether("5000000000");

    const expectMintAmount01 = ether("123456789.987654321");
    const expectMintAmount02 = expectTokenCap.sub(expectMintAmount01);
    const expectTokenSupply01 = expectMintAmount01;
    const expectTokenSupply02 = expectMintAmount01.add(expectMintAmount02);

    const tokenMint01 = await ejsToken.mint(mintAccount01, expectMintAmount01, { from: defaultGovernanceAccount });

    expectEvent(tokenMint01, "Transfer", {
      from: ZERO_ADDRESS,
      to: mintAccount01,
      value: expectMintAmount01,
    });

    const balanceOf01 = await ejsToken.balanceOf(mintAccount01);
    const tokenSupply01 = await ejsToken.totalSupply();

    assert.ok(
      balanceOf01.eq(expectMintAmount01),
      `Balance after first mint is ${balanceOf01} instead of ${expectMintAmount01}`
    );
    assert.ok(
      tokenSupply01.eq(expectTokenSupply01),
      `Token supply after first mint is ${tokenSupply01} instead of ${expectTokenSupply01}`
    );

    const tokenMint02 = await ejsToken.mint(mintAccount02, expectMintAmount02, { from: defaultGovernanceAccount });

    expectEvent(tokenMint02, "Transfer", {
      from: ZERO_ADDRESS,
      to: mintAccount02,
      value: expectMintAmount02,
    });

    const balanceOf02 = await ejsToken.balanceOf(mintAccount02);
    const tokenSupply02 = await ejsToken.totalSupply();
    const tokenCap = await ejsToken.cap();

    assert.ok(
      balanceOf02.eq(expectMintAmount02),
      `Balance after second mint is ${balanceOf02} instead of ${expectMintAmount02}`
    );
    assert.ok(
      tokenSupply02.eq(expectTokenSupply02),
      `Token supply after second mint is ${tokenSupply02} instead of ${expectTokenSupply02}`
    );
    assert.ok(
      tokenSupply02.eq(expectTokenCap),
      `Token supply after second mint is ${tokenSupply02} instead of ${expectTokenCap}`
    );
    assert.ok(tokenCap.eq(expectTokenCap), `Token cap is ${tokenCap} instead of ${expectTokenCap}`);
  });

  it("should not allow minting 0 amount", async () => {
    const minterAccount = accounts[5];

    await ejsToken.setMinterAccount(minterAccount, { from: defaultGovernanceAccount });

    const expectMintAmount = new BN("0");
    await expectRevert(
      ejsToken.mint(minterAccount, expectMintAmount, { from: minterAccount }),
      "EjsToken: zero amount"
    );
  });

  it("should not allow minting of amount exceeding cap", async function () {
    const mintAccount01 = accounts[5];
    const mintAccount02 = accounts[6];
    const tokenCap = await ejsToken.cap();

    await ejsToken.mint(mintAccount01, tokenCap.sub(BN_ONE), { from: defaultGovernanceAccount });

    await expectRevert(
      ejsToken.mint(mintAccount02, new BN("2"), { from: defaultGovernanceAccount }),
      "ERC20Capped: cap exceeded"
    );
  });

  it("should not allow minting after cap is reached", async function () {
    const mintAccount01 = accounts[5];
    const mintAccount02 = accounts[6];
    const tokenCap = await ejsToken.cap();

    await ejsToken.mint(mintAccount01, tokenCap, { from: defaultGovernanceAccount });

    await expectRevert(
      ejsToken.mint(mintAccount02, BN_ONE, { from: defaultGovernanceAccount }),
      "ERC20Capped: cap exceeded"
    );
  });

  it("should allow message sender to burn some tokens owned", async () => {
    const burnAccount = accounts[5];
    const mintAmount = ether("679689.992171904168419000");
    const expectBurnAmount = ether("262928.850363451867962000");
    const expectBalanceAfterBurn = mintAmount.sub(expectBurnAmount);
    const expectTokenSupplyAfterBurn = mintAmount.sub(expectBurnAmount);

    const tokenMint = await ejsToken.mint(burnAccount, mintAmount, { from: defaultGovernanceAccount });

    const tokenBurn = await ejsToken.burn(expectBurnAmount, { from: burnAccount });

    expectEvent.inTransaction(tokenBurn.tx, ejsToken, "Transfer", {
      from: burnAccount,
      to: ZERO_ADDRESS,
      value: expectBurnAmount,
    });

    const balanceAfterBurn = await ejsToken.balanceOf(burnAccount);
    const tokenSupplyAfterBurn = await ejsToken.totalSupply();

    assert.ok(
      balanceAfterBurn.eq(expectBalanceAfterBurn),
      `Balance after burn is ${balanceAfterBurn} instead of ${expectBalanceAfterBurn}`
    );

    assert.ok(
      tokenSupplyAfterBurn.eq(expectTokenSupplyAfterBurn),
      `Token supply after burn is ${tokenSupplyAfterBurn} instead of ${expectTokenSupplyAfterBurn}`
    );
  });

  it("should allow message sender to burn all tokens owned", async () => {
    const burnAccount = accounts[5];
    const mintAmount = ether("977539.63058060240524600");
    const expectBurnAmount = mintAmount;
    const expectBalanceAfterBurn = BN_ZERO;
    const expectTokenSupplyAfterBurn = BN_ZERO;

    const tokenMint = await ejsToken.mint(burnAccount, mintAmount, { from: defaultGovernanceAccount });

    const tokenBurn = await ejsToken.burn(expectBurnAmount, { from: burnAccount });

    expectEvent.inTransaction(tokenBurn.tx, ejsToken, "Transfer", {
      from: burnAccount,
      to: ZERO_ADDRESS,
      value: expectBurnAmount,
    });

    const balanceAfterBurn = await ejsToken.balanceOf(burnAccount);
    const tokenSupplyAfterBurn = await ejsToken.totalSupply();

    assert.ok(
      balanceAfterBurn.eq(expectBalanceAfterBurn),
      `Balance after burn is ${balanceAfterBurn} instead of ${expectBalanceAfterBurn}`
    );

    assert.ok(
      tokenSupplyAfterBurn.eq(expectTokenSupplyAfterBurn),
      `Token supply after burn is ${tokenSupplyAfterBurn} instead of ${expectTokenSupplyAfterBurn}`
    );
  });

  it("should revert when message sender burns more than tokens owned", async () => {
    const burnAccount = accounts[5];
    const mintAmount = ether("160548.446626651963814000");
    const expectBurnAmount = mintAmount.add(BN_ONE);

    const tokenMint = await ejsToken.mint(burnAccount, mintAmount, { from: defaultGovernanceAccount });

    await expectRevert(ejsToken.burn(expectBurnAmount, { from: burnAccount }), "ERC20: burn amount exceeds balance");
  });

  it("should allow message sender to burn some token allowance", async () => {
    const burnAccount = accounts[5];
    const spenderAccount = accounts[6];
    const mintAmount = ether("662197.887538916778729000");
    const expectAllowedAmount = ether("488764.831764237247149000");
    const expectBurnAmount = ether("480066.91761522757988800");
    const expectAllowanceOfSpenderAccountAfterBurn = expectAllowedAmount.sub(expectBurnAmount);
    const expectBalanceOfBurnAccountAfterBurn = mintAmount.sub(expectBurnAmount);
    const expectBalanceOfSpenderAccountAfterBurn = BN_ZERO;
    const expectTokenSupplyAfterBurn = mintAmount.sub(expectBurnAmount);

    const tokenMint = await ejsToken.mint(burnAccount, mintAmount, { from: defaultGovernanceAccount });
    await ejsToken.approve(spenderAccount, expectAllowedAmount, { from: burnAccount });

    const tokenBurn = await ejsToken.burnFrom(burnAccount, expectBurnAmount, { from: spenderAccount });

    expectEvent.inTransaction(tokenBurn.tx, ejsToken, "Transfer", {
      from: burnAccount,
      to: ZERO_ADDRESS,
      value: expectBurnAmount,
    });

    const balanceOfBurnAccountAfterBurn = await ejsToken.balanceOf(burnAccount);
    const balanceOfSpenderAccountAfterBurn = await ejsToken.balanceOf(spenderAccount);
    const allowanceOfSpenderAccountAfterBurn = await ejsToken.allowance(burnAccount, spenderAccount);
    const tokenSupplyAfterBurn = await ejsToken.totalSupply();

    assert.ok(
      allowanceOfSpenderAccountAfterBurn.eq(expectAllowanceOfSpenderAccountAfterBurn),
      `Allowance of spender account after burn is ${allowanceOfSpenderAccountAfterBurn} instead of ${expectAllowanceOfSpenderAccountAfterBurn}`
    );

    assert.ok(
      balanceOfBurnAccountAfterBurn.eq(expectBalanceOfBurnAccountAfterBurn),
      `Balance of burn account after burn is ${balanceOfBurnAccountAfterBurn} instead of ${expectBalanceOfBurnAccountAfterBurn}`
    );

    assert.ok(
      balanceOfSpenderAccountAfterBurn.eq(expectBalanceOfSpenderAccountAfterBurn),
      `Balance of spender account after burn is ${balanceOfSpenderAccountAfterBurn} instead of ${expectBalanceOfSpenderAccountAfterBurn}`
    );

    assert.ok(
      tokenSupplyAfterBurn.eq(expectTokenSupplyAfterBurn),
      `Token supply after burn is ${tokenSupplyAfterBurn} instead of ${expectTokenSupplyAfterBurn}`
    );
  });

  it("should allow message sender to burn all token allowance", async () => {
    const burnAccount = accounts[5];
    const spenderAccount = accounts[6];
    const mintAmount = ether("977539.63058060240524600");
    const expectAllowedAmount = ether("177596.266945987128513000");
    const expectBurnAmount = expectAllowedAmount;
    const expectAllowanceOfSpenderAccountAfterBurn = BN_ZERO;
    const expectBalanceOfBurnAccountAfterBurn = mintAmount.sub(expectBurnAmount);
    const expectBalanceOfSpenderAccountAfterBurn = BN_ZERO;
    const expectTokenSupplyAfterBurn = mintAmount.sub(expectBurnAmount);

    const tokenMint = await ejsToken.mint(burnAccount, mintAmount, { from: defaultGovernanceAccount });
    await ejsToken.approve(spenderAccount, expectAllowedAmount, { from: burnAccount });

    const tokenBurn = await ejsToken.burnFrom(burnAccount, expectBurnAmount, { from: spenderAccount });

    expectEvent.inTransaction(tokenBurn.tx, ejsToken, "Transfer", {
      from: burnAccount,
      to: ZERO_ADDRESS,
      value: expectBurnAmount,
    });

    const balanceOfBurnAccountAfterBurn = await ejsToken.balanceOf(burnAccount);
    const balanceOfSpenderAccountAfterBurn = await ejsToken.balanceOf(spenderAccount);
    const allowanceOfSpenderAccountAfterBurn = await ejsToken.allowance(burnAccount, spenderAccount);
    const tokenSupplyAfterBurn = await ejsToken.totalSupply();

    assert.ok(
      allowanceOfSpenderAccountAfterBurn.eq(expectAllowanceOfSpenderAccountAfterBurn),
      `Allowance of spender account after burn is ${allowanceOfSpenderAccountAfterBurn} instead of ${expectAllowanceOfSpenderAccountAfterBurn}`
    );

    assert.ok(
      balanceOfBurnAccountAfterBurn.eq(expectBalanceOfBurnAccountAfterBurn),
      `Balance of burn account after burn is ${balanceOfBurnAccountAfterBurn} instead of ${expectBalanceOfBurnAccountAfterBurn}`
    );

    assert.ok(
      balanceOfSpenderAccountAfterBurn.eq(expectBalanceOfSpenderAccountAfterBurn),
      `Balance of spender account after burn is ${balanceOfSpenderAccountAfterBurn} instead of ${expectBalanceOfSpenderAccountAfterBurn}`
    );

    assert.ok(
      tokenSupplyAfterBurn.eq(expectTokenSupplyAfterBurn),
      `Token supply after burn is ${tokenSupplyAfterBurn} instead of ${expectTokenSupplyAfterBurn}`
    );
  });

  it("should allow message sender to burn all owner balance", async () => {
    const burnAccount = accounts[5];
    const spenderAccount = accounts[6];
    const mintAmount = ether("792888.500350613979106000");
    const expectAllowedAmount = mintAmount;
    const expectBurnAmount = expectAllowedAmount;
    const expectAllowanceOfSpenderAccountAfterBurn = BN_ZERO;
    const expectBalanceOfBurnAccountAfterBurn = BN_ZERO;
    const expectBalanceOfSpenderAccountAfterBurn = BN_ZERO;
    const expectTokenSupplyAfterBurn = BN_ZERO;

    const tokenMint = await ejsToken.mint(burnAccount, mintAmount, { from: defaultGovernanceAccount });
    await ejsToken.approve(spenderAccount, expectAllowedAmount, { from: burnAccount });

    const tokenBurn = await ejsToken.burnFrom(burnAccount, expectBurnAmount, { from: spenderAccount });

    expectEvent.inTransaction(tokenBurn.tx, ejsToken, "Transfer", {
      from: burnAccount,
      to: ZERO_ADDRESS,
      value: expectBurnAmount,
    });

    const balanceOfBurnAccountAfterBurn = await ejsToken.balanceOf(burnAccount);
    const balanceOfSpenderAccountAfterBurn = await ejsToken.balanceOf(spenderAccount);
    const allowanceOfSpenderAccountAfterBurn = await ejsToken.allowance(burnAccount, spenderAccount);
    const tokenSupplyAfterBurn = await ejsToken.totalSupply();

    assert.ok(
      allowanceOfSpenderAccountAfterBurn.eq(expectAllowanceOfSpenderAccountAfterBurn),
      `Allowance of spender account after burn is ${allowanceOfSpenderAccountAfterBurn} instead of ${expectAllowanceOfSpenderAccountAfterBurn}`
    );

    assert.ok(
      balanceOfBurnAccountAfterBurn.eq(expectBalanceOfBurnAccountAfterBurn),
      `Balance of burn account after burn is ${balanceOfBurnAccountAfterBurn} instead of ${expectBalanceOfBurnAccountAfterBurn}`
    );

    assert.ok(
      balanceOfSpenderAccountAfterBurn.eq(expectBalanceOfSpenderAccountAfterBurn),
      `Balance of spender account after burn is ${balanceOfSpenderAccountAfterBurn} instead of ${expectBalanceOfSpenderAccountAfterBurn}`
    );

    assert.ok(
      tokenSupplyAfterBurn.eq(expectTokenSupplyAfterBurn),
      `Token supply after burn is ${tokenSupplyAfterBurn} instead of ${expectTokenSupplyAfterBurn}`
    );
  });

  it("should revert when message sender burns more than token allowance", async () => {
    const burnAccount = accounts[5];
    const spenderAccount = accounts[6];
    const mintAmount = ether("160548.446626651963814000");
    const expectAllowedAmount = ether("43830.928894863274474000");
    const expectBurnAmount = expectAllowedAmount.add(BN_ONE);

    const tokenMint = await ejsToken.mint(burnAccount, mintAmount, { from: defaultGovernanceAccount });
    await ejsToken.approve(spenderAccount, expectAllowedAmount, { from: burnAccount });

    await expectRevert(
      ejsToken.burnFrom(burnAccount, expectBurnAmount, { from: spenderAccount }),
      "EjsToken: burn amount exceeds allowance"
    );
  });

  it("should revert when message sender burns more than token balance of owner account", async () => {
    const burnAccount = accounts[5];
    const spenderAccount = accounts[6];
    const mintAmount = ether("160548.446626651963814000");
    const expectAllowedAmount = mintAmount.add(BN_ONE);
    const expectBurnAmount = expectAllowedAmount;

    const tokenMint = await ejsToken.mint(burnAccount, mintAmount, { from: defaultGovernanceAccount });
    await ejsToken.approve(spenderAccount, expectAllowedAmount, { from: burnAccount });

    await expectRevert(
      ejsToken.burnFrom(burnAccount, expectBurnAmount, { from: spenderAccount }),
      "ERC20: burn amount exceeds balance"
    );
  });

  it("should not allow burning 0 amount", async () => {
    const burnAccount = accounts[5];

    await expectRevert(ejsToken.burn(BN_ZERO, { from: burnAccount }), "EjsToken: zero amount");

    await expectRevert(
      ejsToken.burnFrom(burnAccount, BN_ZERO, { from: defaultGovernanceAccount }),
      "EjsToken: zero amount"
    );
  });
});
