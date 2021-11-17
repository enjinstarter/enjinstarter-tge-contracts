const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { BN, BN_ZERO, BN_ONE, ZERO_ADDRESS, ether, ...testHelpers } = require("./test-helpers");

describe("FinaWhitelist", () => {
  const BATCH_MAX_NUM = 200;
  const TEST_MAX_EVENTS = 9;

  let accounts;
  let defaultGovernanceAccount;
  let defaultWhitelistAdmin;
  let finaWhitelist;

  before(async () => {
    accounts = await web3.eth.getAccounts();
    defaultGovernanceAccount = accounts[0];
    defaultWhitelistAdmin = accounts[1];
  });

  beforeEach(async () => {
    finaWhitelist = await testHelpers.newFinaWhitelist();

    await finaWhitelist.setWhitelistAdmin(defaultWhitelistAdmin, { from: defaultGovernanceAccount });
  });

  it("should be initialized correctly", async () => {
    const expectWhitelistAdmin = defaultWhitelistAdmin;
    const whitelistAdmin = await finaWhitelist.whitelistAdmin();

    assert.strictEqual(
      whitelistAdmin,
      expectWhitelistAdmin,
      `Whitelist admin is ${whitelistAdmin} instead of ${expectWhitelistAdmin}`
    );
  });

  it("should allow governance account to change governance account", async () => {
    const nonGovernanceAccount = accounts[9];

    const expectNewGovernanceAccount = nonGovernanceAccount;
    await finaWhitelist.setGovernanceAccount(nonGovernanceAccount, { from: defaultGovernanceAccount });
    const newGovernanceAccount = await finaWhitelist.governanceAccount();

    assert.strictEqual(
      newGovernanceAccount,
      expectNewGovernanceAccount,
      `New governance account is ${newGovernanceAccount} instead of ${expectNewGovernanceAccount}`
    );

    await expectRevert(
      finaWhitelist.setGovernanceAccount(defaultGovernanceAccount, { from: defaultGovernanceAccount }),
      "FinaWhitelist: sender unauthorized"
    );

    const expectGovernanceAccount = defaultGovernanceAccount;
    await finaWhitelist.setGovernanceAccount(defaultGovernanceAccount, { from: expectNewGovernanceAccount });
    const governanceAccount = await finaWhitelist.governanceAccount();

    assert.strictEqual(
      governanceAccount,
      expectGovernanceAccount,
      `Governance account is ${governanceAccount} instead of ${expectGovernanceAccount}`
    );
  });

  it("should not allow non governance account to change governance account", async () => {
    const nonGovernanceAccount = accounts[9];

    await expectRevert(
      finaWhitelist.setGovernanceAccount(nonGovernanceAccount, { from: nonGovernanceAccount }),
      "FinaWhitelist: sender unauthorized"
    );

    await expectRevert(
      finaWhitelist.setGovernanceAccount(defaultWhitelistAdmin, { from: defaultWhitelistAdmin }),
      "FinaWhitelist: sender unauthorized"
    );
  });

  it("should not allow set governance account to zero address", async () => {
    await expectRevert(
      finaWhitelist.setGovernanceAccount(ZERO_ADDRESS, { from: defaultGovernanceAccount }),
      "FinaWhitelist: zero account"
    );
  });

  it("should allow governance account to change whitelist admin", async () => {
    const nonWhitelistAdmin = accounts[9];

    const expectNewWhitelistAdmin = nonWhitelistAdmin;
    await finaWhitelist.setWhitelistAdmin(nonWhitelistAdmin, { from: defaultGovernanceAccount });
    const newWhitelistAdmin = await finaWhitelist.whitelistAdmin();

    assert.strictEqual(
      newWhitelistAdmin,
      expectNewWhitelistAdmin,
      `New whitelist admin is ${newWhitelistAdmin} instead of ${expectNewWhitelistAdmin}`
    );

    const expectWhitelistAdmin = defaultWhitelistAdmin;
    await finaWhitelist.setWhitelistAdmin(defaultWhitelistAdmin, { from: defaultGovernanceAccount });
    const whitelistAdmin = await finaWhitelist.whitelistAdmin();

    assert.strictEqual(
      whitelistAdmin,
      expectWhitelistAdmin,
      `Whitelist admin is ${whitelistAdmin} instead of ${expectWhitelistAdmin}`
    );
  });

  it("should not allow non governance account to change whitelist admin", async () => {
    const nonGovernanceAccount = accounts[9];

    await expectRevert(
      finaWhitelist.setWhitelistAdmin(nonGovernanceAccount, { from: nonGovernanceAccount }),
      "FinaWhitelist: sender unauthorized"
    );

    await expectRevert(
      finaWhitelist.setWhitelistAdmin(defaultWhitelistAdmin, { from: defaultWhitelistAdmin }),
      "FinaWhitelist: sender unauthorized"
    );
  });

  it("should not allow set whitelist admin to zero address", async () => {
    await expectRevert(
      finaWhitelist.setWhitelistAdmin(ZERO_ADDRESS, { from: defaultGovernanceAccount }),
      "FinaWhitelist: zero account"
    );
  });

  it("should only allow whitelist admin to add and remove whitelisted", async () => {
    const nonWhitelistAdmin = accounts[9];
    const expectWhitelistAdmin = defaultWhitelistAdmin;

    const expectAddWhitelistedAccount = accounts[5];
    const expectAddWhitelistedAmount = ether("4741931.14347985404160500");
    const expectIsWhitelistedBeforeAdd = false;
    const isWhitelistedBeforeAdd = await finaWhitelist.isWhitelisted(expectAddWhitelistedAccount);

    assert.strictEqual(
      isWhitelistedBeforeAdd,
      expectIsWhitelistedBeforeAdd,
      `Is whitelisted for ${expectAddWhitelistedAccount} is ${isWhitelistedBeforeAdd} instead of ${expectIsWhitelistedBeforeAdd}`
    );

    const addWhitelisted = await finaWhitelist.addWhitelisted(expectAddWhitelistedAccount, expectAddWhitelistedAmount, {
      from: expectWhitelistAdmin,
    });

    expectEvent(addWhitelisted, "WhitelistedAdded", {
      account: expectAddWhitelistedAccount,
      amount: expectAddWhitelistedAmount,
    });

    const expectIsWhitelistedAfterAdd = true;
    const isWhitelistedAfterAdd = await finaWhitelist.isWhitelisted(expectAddWhitelistedAccount);

    assert.strictEqual(
      isWhitelistedAfterAdd,
      expectIsWhitelistedAfterAdd,
      `Is whitelisted for ${expectAddWhitelistedAccount} is ${isWhitelistedAfterAdd} instead of ${expectIsWhitelistedAfterAdd}`
    );

    await expectRevert(
      finaWhitelist.addWhitelisted(expectAddWhitelistedAccount, expectAddWhitelistedAmount, {
        from: nonWhitelistAdmin,
      }),
      "Whitelist: sender unauthorized"
    );

    await expectRevert(
      finaWhitelist.addWhitelisted(expectAddWhitelistedAccount, expectAddWhitelistedAmount, {
        from: expectWhitelistAdmin,
      }),
      "Whitelist: already whitelisted"
    );

    const expectRemoveWhitelistedAccount = expectAddWhitelistedAccount;
    const removeWhitelisted = await finaWhitelist.removeWhitelisted(expectRemoveWhitelistedAccount, {
      from: expectWhitelistAdmin,
    });

    expectEvent(removeWhitelisted, "WhitelistedRemoved", {
      account: expectRemoveWhitelistedAccount,
    });

    const expectIsWhitelistedAfterRemove = false;
    const isWhitelistedAfterRemove = await finaWhitelist.isWhitelisted(expectRemoveWhitelistedAccount);

    assert.strictEqual(
      isWhitelistedAfterRemove,
      expectIsWhitelistedAfterRemove,
      `Is whitelisted for ${expectRemoveWhitelistedAccount} is ${isWhitelistedAfterRemove} instead of ${expectIsWhitelistedAfterRemove}`
    );

    await expectRevert(
      finaWhitelist.removeWhitelisted(expectRemoveWhitelistedAccount, { from: nonWhitelistAdmin }),
      "Whitelist: sender unauthorized"
    );

    await expectRevert(
      finaWhitelist.removeWhitelisted(expectRemoveWhitelistedAccount, { from: expectWhitelistAdmin }),
      "Whitelist: not whitelisted"
    );
  });

  it("should not allow add whitelisted of zero address", async () => {
    await expectRevert(
      finaWhitelist.addWhitelisted(ZERO_ADDRESS, ether("8560129.698603423880171000"), { from: defaultWhitelistAdmin }),
      "FinaWhitelist: zero account"
    );
  });

  it("should not allow add whitelisted of zero amount", async () => {
    const expectAddWhitelistedAccount = accounts[5];

    await expectRevert(
      finaWhitelist.addWhitelisted(expectAddWhitelistedAccount, ether("0"), { from: defaultWhitelistAdmin }),
      "FinaWhitelist: zero amount"
    );
  });

  it("should not allow remove whitelisted of zero address", async () => {
    await expectRevert(
      finaWhitelist.removeWhitelisted(ZERO_ADDRESS, { from: defaultWhitelistAdmin }),
      "FinaWhitelist: zero account"
    );
  });

  it("should not allow is whitelisted of zero address", async () => {
    await expectRevert(finaWhitelist.isWhitelisted(ZERO_ADDRESS), "Whitelist: zero account");
  });

  it("should only allow whitelist admin to add and remove whitelisted batch", async () => {
    const nonWhitelistAdmin = accounts[9];
    const expectWhitelistAdmin = defaultWhitelistAdmin;

    const expectAddWhitelistedAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );
    const expectAddWhitelistedAmounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => new BN((Math.random() * 1000000).toString())
    );

    const expectIsWhitelistedBeforeAdd = false;

    for (let i = 0; i < expectAddWhitelistedAccounts.length; i++) {
      // console.log(`${i}: beforeAddAccount: ${expectAddWhitelistedAccounts[i]}`);

      const isWhitelistedBeforeAdd = await finaWhitelist.isWhitelisted(expectAddWhitelistedAccounts[i]);

      assert.strictEqual(
        isWhitelistedBeforeAdd,
        expectIsWhitelistedBeforeAdd,
        `Is whitelisted for ${expectAddWhitelistedAccounts[i]} is ${isWhitelistedBeforeAdd} instead of ${expectIsWhitelistedBeforeAdd}`
      );
    }

    const addWhitelistedBatch = await finaWhitelist.addWhitelistedBatch(
      expectAddWhitelistedAccounts,
      expectAddWhitelistedAmounts,
      {
        from: expectWhitelistAdmin,
      }
    );

    // seems like can only check max 9 events as event 9 (zero-based) seems to be matched to event 0 likely due to wraparound
    for (let i = 0; i < TEST_MAX_EVENTS; i++) {
      // console.log(`${i}: addAccountEvent: ${expectAddWhitelistedAccounts[i]}`);

      expectEvent(addWhitelistedBatch, "WhitelistedAdded", {
        account: expectAddWhitelistedAccounts[i],
        amount: expectAddWhitelistedAmounts[i],
      });
    }

    const expectIsWhitelistedAfterAdd = true;

    for (let i = 0; i < expectAddWhitelistedAccounts.length; i++) {
      // console.log(`${i}: afterAddAccount: ${expectAddWhitelistedAccounts[i]}`);

      const isWhitelistedAfterAdd = await finaWhitelist.isWhitelisted(expectAddWhitelistedAccounts[i]);

      assert.strictEqual(
        isWhitelistedAfterAdd,
        expectIsWhitelistedAfterAdd,
        `Is whitelisted for ${expectAddWhitelistedAccounts[i]} is ${isWhitelistedAfterAdd} instead of ${expectIsWhitelistedAfterAdd}`
      );
    }

    await expectRevert(
      finaWhitelist.addWhitelistedBatch(expectAddWhitelistedAccounts, expectAddWhitelistedAmounts, {
        from: nonWhitelistAdmin,
      }),
      "FinaWhitelist: sender unauthorized"
    );

    await expectRevert(
      finaWhitelist.addWhitelistedBatch(expectAddWhitelistedAccounts, expectAddWhitelistedAmounts, {
        from: expectWhitelistAdmin,
      }),
      "FinaWhitelist: already whitelisted"
    );

    const expectRemoveWhitelistedAccounts = expectAddWhitelistedAccounts;
    const removeWhitelistedBatch = await finaWhitelist.removeWhitelistedBatch(expectRemoveWhitelistedAccounts, {
      from: expectWhitelistAdmin,
    });

    // seems like can only check max 9 events as event 9 (zero-based) seems to be matched to event 0 likely due to wraparound
    for (let i = 0; i < TEST_MAX_EVENTS; i++) {
      // console.log(`${i}: removeAccountEvent: ${expectRemoveWhitelistedAccounts[i]}`);

      expectEvent(removeWhitelistedBatch, "WhitelistedRemoved", {
        account: expectRemoveWhitelistedAccounts[i],
      });
    }

    const expectIsWhitelistedAfterRemove = false;

    for (let i = 0; i < expectRemoveWhitelistedAccounts.length; i++) {
      // console.log(`${i}: afterRemoveAccount: ${expectRemoveWhitelistedAccounts[i]}`);

      const isWhitelistedAfterRemove = await finaWhitelist.isWhitelisted(expectRemoveWhitelistedAccounts[i]);

      assert.strictEqual(
        isWhitelistedAfterRemove,
        expectIsWhitelistedAfterRemove,
        `Is whitelisted for ${expectRemoveWhitelistedAccounts[i]} is ${isWhitelistedAfterRemove} instead of ${expectIsWhitelistedAfterRemove}`
      );
    }

    await expectRevert(
      finaWhitelist.removeWhitelistedBatch(expectRemoveWhitelistedAccounts, { from: nonWhitelistAdmin }),
      "FinaWhitelist: sender unauthorized"
    );

    await expectRevert(
      finaWhitelist.removeWhitelistedBatch(expectRemoveWhitelistedAccounts, { from: expectWhitelistAdmin }),
      "FinaWhitelist: not whitelisted"
    );
  });

  it("should not allow add whitelisted batch with no accounts and amounts", async () => {
    await expectRevert(
      finaWhitelist.addWhitelistedBatch([], [], { from: defaultWhitelistAdmin }),
      "FinaWhitelist: empty"
    );
  });

  it("should not allow add whitelisted batch with no accounts", async () => {
    const addWhitelistedAmounts = new Array(BATCH_MAX_NUM - 1).fill(ZERO_ADDRESS);

    await expectRevert(
      finaWhitelist.addWhitelistedBatch([], addWhitelistedAmounts, { from: defaultWhitelistAdmin }),
      "FinaWhitelist: empty"
    );
  });

  it("should not allow add whitelisted batch with no amounts", async () => {
    const addWhitelistedAccounts = new Array(BATCH_MAX_NUM).fill(ZERO_ADDRESS);

    await expectRevert(
      finaWhitelist.addWhitelistedBatch(addWhitelistedAccounts, [], { from: defaultWhitelistAdmin }),
      "FinaWhitelist: different length"
    );
  });

  it("should not allow add whitelisted batch with different length for accounts and amounts", async () => {
    const addWhitelistedAccounts = new Array(BATCH_MAX_NUM).fill(ZERO_ADDRESS);
    const addWhitelistedAmounts = new Array(BATCH_MAX_NUM - 1).fill(ZERO_ADDRESS);

    await expectRevert(
      finaWhitelist.addWhitelistedBatch(addWhitelistedAccounts, addWhitelistedAmounts, { from: defaultWhitelistAdmin }),
      "FinaWhitelist: different length"
    );
  });

  it("should not allow add whitelisted batch with more than max number of accounts", async () => {
    const addWhitelistedAccounts = new Array(BATCH_MAX_NUM + 1).fill(ZERO_ADDRESS);
    const addWhitelistedAmounts = new Array(BATCH_MAX_NUM).fill(BN_ZERO);

    await expectRevert(
      finaWhitelist.addWhitelistedBatch(addWhitelistedAccounts, addWhitelistedAmounts, { from: defaultWhitelistAdmin }),
      "FinaWhitelist: exceed max"
    );
  });

  it("should not allow add whitelisted batch with zero address", async () => {
    const expectAddWhitelistedAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );
    const expectAddWhitelistedAmounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => new BN((Math.random() * 1000000).toString())
    );

    expectAddWhitelistedAccounts[BATCH_MAX_NUM - 1] = ZERO_ADDRESS;

    await expectRevert(
      finaWhitelist.addWhitelistedBatch(expectAddWhitelistedAccounts, expectAddWhitelistedAmounts, {
        from: defaultWhitelistAdmin,
      }),
      "FinaWhitelist: zero account"
    );
  });

  it("should not allow add whitelisted batch with duplicate address", async () => {
    const expectAddWhitelistedAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );
    const expectAddWhitelistedAmounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => new BN((Math.random() * 1000000).toString())
    );

    expectAddWhitelistedAccounts[BATCH_MAX_NUM - 1] = expectAddWhitelistedAccounts[BATCH_MAX_NUM - 2];

    await expectRevert(
      finaWhitelist.addWhitelistedBatch(expectAddWhitelistedAccounts, expectAddWhitelistedAmounts, {
        from: defaultWhitelistAdmin,
      }),
      "FinaWhitelist: already whitelisted"
    );
  });

  it("should not allow add whitelisted batch with zero amount", async () => {
    const expectAddWhitelistedAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );
    const expectAddWhitelistedAmounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => new BN((Math.random() * 1000000).toString())
    );

    expectAddWhitelistedAmounts[BATCH_MAX_NUM - 1] = BN_ZERO;

    await expectRevert(
      finaWhitelist.addWhitelistedBatch(expectAddWhitelistedAccounts, expectAddWhitelistedAmounts, {
        from: defaultWhitelistAdmin,
      }),
      "FinaWhitelist: zero amount"
    );
  });

  it("should not allow remove whitelisted batch with no accounts", async () => {
    await expectRevert(
      finaWhitelist.removeWhitelistedBatch([], { from: defaultWhitelistAdmin }),
      "FinaWhitelist: empty"
    );
  });

  it("should not allow remove whitelisted batch with more than 500 accounts", async () => {
    const removeWhitelistedAccounts = new Array(BATCH_MAX_NUM + 1).fill(ZERO_ADDRESS);

    await expectRevert(
      finaWhitelist.removeWhitelistedBatch(removeWhitelistedAccounts, { from: defaultWhitelistAdmin }),
      "FinaWhitelist: exceed max"
    );
  });

  it("should not allow remove whitelisted batch with zero address", async () => {
    const expectRemoveWhitelistedAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );
    const expectRemoveWhitelistedAmounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => new BN((Math.random() * 1000000).toString())
    );

    const addWhitelistedBatch = await finaWhitelist.addWhitelistedBatch(
      expectRemoveWhitelistedAccounts,
      expectRemoveWhitelistedAmounts,
      {
        from: defaultWhitelistAdmin,
      }
    );

    expectRemoveWhitelistedAccounts[BATCH_MAX_NUM - 1] = ZERO_ADDRESS;

    await expectRevert(
      finaWhitelist.removeWhitelistedBatch(expectRemoveWhitelistedAccounts, { from: defaultWhitelistAdmin }),
      "FinaWhitelist: zero account"
    );
  });

  it("should not allow remove whitelisted batch with duplicate address", async () => {
    const expectRemoveWhitelistedAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );
    const expectRemoveWhitelistedAmounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => new BN((Math.random() * 1000000).toString())
    );

    const addWhitelistedBatch = await finaWhitelist.addWhitelistedBatch(
      expectRemoveWhitelistedAccounts,
      expectRemoveWhitelistedAmounts,
      {
        from: defaultWhitelistAdmin,
      }
    );

    expectRemoveWhitelistedAccounts[BATCH_MAX_NUM - 1] = expectRemoveWhitelistedAccounts[BATCH_MAX_NUM - 2];

    await expectRevert(
      finaWhitelist.removeWhitelistedBatch(expectRemoveWhitelistedAccounts, { from: defaultWhitelistAdmin }),
      "FinaWhitelist: not whitelisted"
    );
  });
});
