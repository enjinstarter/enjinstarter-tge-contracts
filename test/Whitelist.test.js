const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { BN, BN_ZERO, BN_ONE, ZERO_ADDRESS, ether, ...testHelpers } = require("./test-helpers");

describe("Whitelist", () => {
  const BATCH_MAX_NUM = 500;
  const TEST_MAX_EVENTS = 9;

  let accounts;
  let defaultGovernanceAccount;
  let defaultWhitelistAdmin;
  let whitelist;

  before(async () => {
    accounts = await web3.eth.getAccounts();
    defaultGovernanceAccount = accounts[0];
    defaultWhitelistAdmin = accounts[1];
  });

  beforeEach(async () => {
    whitelist = await testHelpers.newWhitelist();

    await whitelist.setWhitelistAdmin(defaultWhitelistAdmin, { from: defaultGovernanceAccount });
  });

  it("should be initialized correctly", async () => {
    const expectWhitelistAdmin = defaultWhitelistAdmin;
    const whitelistAdmin = await whitelist.whitelistAdmin();

    assert.strictEqual(
      whitelistAdmin,
      expectWhitelistAdmin,
      `Whitelist admin is ${whitelistAdmin} instead of ${expectWhitelistAdmin}`
    );
  });

  it("should allow governance account to change governance account", async () => {
    const nonGovernanceAccount = accounts[9];

    const expectNewGovernanceAccount = nonGovernanceAccount;
    await whitelist.setGovernanceAccount(nonGovernanceAccount, { from: defaultGovernanceAccount });
    const newGovernanceAccount = await whitelist.governanceAccount();

    assert.strictEqual(
      newGovernanceAccount,
      expectNewGovernanceAccount,
      `New governance account is ${newGovernanceAccount} instead of ${expectNewGovernanceAccount}`
    );

    await expectRevert(
      whitelist.setGovernanceAccount(defaultGovernanceAccount, { from: defaultGovernanceAccount }),
      "Whitelist: sender unauthorized"
    );

    const expectGovernanceAccount = defaultGovernanceAccount;
    await whitelist.setGovernanceAccount(defaultGovernanceAccount, { from: expectNewGovernanceAccount });
    const governanceAccount = await whitelist.governanceAccount();

    assert.strictEqual(
      governanceAccount,
      expectGovernanceAccount,
      `Governance account is ${governanceAccount} instead of ${expectGovernanceAccount}`
    );
  });

  it("should not allow non governance account to change governance account", async () => {
    const nonGovernanceAccount = accounts[9];

    await expectRevert(
      whitelist.setGovernanceAccount(nonGovernanceAccount, { from: nonGovernanceAccount }),
      "Whitelist: sender unauthorized"
    );

    await expectRevert(
      whitelist.setGovernanceAccount(defaultWhitelistAdmin, { from: defaultWhitelistAdmin }),
      "Whitelist: sender unauthorized"
    );
  });

  it("should not allow set governance account to zero address", async () => {
    await expectRevert(
      whitelist.setGovernanceAccount(ZERO_ADDRESS, { from: defaultGovernanceAccount }),
      "Whitelist: zero account"
    );
  });

  it("should allow governance account to change whitelist admin", async () => {
    const nonWhitelistAdmin = accounts[9];

    const expectNewWhitelistAdmin = nonWhitelistAdmin;
    await whitelist.setWhitelistAdmin(nonWhitelistAdmin, { from: defaultGovernanceAccount });
    const newWhitelistAdmin = await whitelist.whitelistAdmin();

    assert.strictEqual(
      newWhitelistAdmin,
      expectNewWhitelistAdmin,
      `New whitelist admin is ${newWhitelistAdmin} instead of ${expectNewWhitelistAdmin}`
    );

    const expectWhitelistAdmin = defaultWhitelistAdmin;
    await whitelist.setWhitelistAdmin(defaultWhitelistAdmin, { from: defaultGovernanceAccount });
    const whitelistAdmin = await whitelist.whitelistAdmin();

    assert.strictEqual(
      whitelistAdmin,
      expectWhitelistAdmin,
      `Whitelist admin is ${whitelistAdmin} instead of ${expectWhitelistAdmin}`
    );
  });

  it("should not allow non governance account to change whitelist admin", async () => {
    const nonGovernanceAccount = accounts[9];

    await expectRevert(
      whitelist.setWhitelistAdmin(nonGovernanceAccount, { from: nonGovernanceAccount }),
      "Whitelist: sender unauthorized"
    );

    await expectRevert(
      whitelist.setWhitelistAdmin(defaultWhitelistAdmin, { from: defaultWhitelistAdmin }),
      "Whitelist: sender unauthorized"
    );
  });

  it("should not allow set whitelist admin to zero address", async () => {
    await expectRevert(
      whitelist.setWhitelistAdmin(ZERO_ADDRESS, { from: defaultGovernanceAccount }),
      "Whitelist: zero account"
    );
  });

  it("should only allow whitelist admin to add and remove whitelisted", async () => {
    const nonWhitelistAdmin = accounts[9];
    const expectWhitelistAdmin = defaultWhitelistAdmin;

    const expectAddWhitelisted = accounts[5];
    const expectIsWhitelistedBeforeAdd = false;
    const isWhitelistedBeforeAdd = await whitelist.isWhitelisted(expectAddWhitelisted);

    assert.strictEqual(
      isWhitelistedBeforeAdd,
      expectIsWhitelistedBeforeAdd,
      `Is whitelisted for ${expectAddWhitelisted} is ${isWhitelistedBeforeAdd} instead of ${expectIsWhitelistedBeforeAdd}`
    );

    const addWhitelisted = await whitelist.addWhitelisted(expectAddWhitelisted, { from: expectWhitelistAdmin });

    expectEvent(addWhitelisted, "WhitelistedAdded", {
      account: expectAddWhitelisted,
    });

    const expectIsWhitelistedAfterAdd = true;
    const isWhitelistedAfterAdd = await whitelist.isWhitelisted(expectAddWhitelisted);

    assert.strictEqual(
      isWhitelistedAfterAdd,
      expectIsWhitelistedAfterAdd,
      `Is whitelisted for ${expectAddWhitelisted} is ${isWhitelistedAfterAdd} instead of ${expectIsWhitelistedAfterAdd}`
    );

    await expectRevert(
      whitelist.addWhitelisted(expectAddWhitelisted, { from: nonWhitelistAdmin }),
      "Whitelist: sender unauthorized"
    );

    await expectRevert(
      whitelist.addWhitelisted(expectAddWhitelisted, { from: expectWhitelistAdmin }),
      "Whitelist: already whitelisted"
    );

    const expectRemoveWhitelisted = expectAddWhitelisted;
    const removeWhitelisted = await whitelist.removeWhitelisted(expectRemoveWhitelisted, {
      from: expectWhitelistAdmin,
    });

    expectEvent(removeWhitelisted, "WhitelistedRemoved", {
      account: expectRemoveWhitelisted,
    });

    const expectIsWhitelistedAfterRemove = false;
    const isWhitelistedAfterRemove = await whitelist.isWhitelisted(expectRemoveWhitelisted);

    assert.strictEqual(
      isWhitelistedAfterRemove,
      expectIsWhitelistedAfterRemove,
      `Is whitelisted for ${expectRemoveWhitelisted} is ${isWhitelistedAfterRemove} instead of ${expectIsWhitelistedAfterRemove}`
    );

    await expectRevert(
      whitelist.removeWhitelisted(expectRemoveWhitelisted, { from: nonWhitelistAdmin }),
      "Whitelist: sender unauthorized"
    );

    await expectRevert(
      whitelist.removeWhitelisted(expectRemoveWhitelisted, { from: expectWhitelistAdmin }),
      "Whitelist: not whitelisted"
    );
  });

  it("should not allow add whitelisted of zero address", async () => {
    await expectRevert(
      whitelist.addWhitelisted(ZERO_ADDRESS, { from: defaultWhitelistAdmin }),
      "Whitelist: zero account"
    );
  });

  it("should not allow remove whitelisted of zero address", async () => {
    await expectRevert(
      whitelist.removeWhitelisted(ZERO_ADDRESS, { from: defaultWhitelistAdmin }),
      "Whitelist: zero account"
    );
  });

  it("should not allow is whitelisted of zero address", async () => {
    await expectRevert(whitelist.isWhitelisted(ZERO_ADDRESS), "Whitelist: zero account");
  });

  it("should only allow whitelist admin to add and remove whitelisted batch", async () => {
    const nonWhitelistAdmin = accounts[9];
    const expectWhitelistAdmin = defaultWhitelistAdmin;

    const expectAddWhitelistedAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );

    const expectIsWhitelistedBeforeAdd = false;

    for (let i = 0; i < expectAddWhitelistedAccounts.length; i++) {
      // console.log(`${i}: beforeAddAccount: ${expectAddWhitelistedAccounts[i]}`);

      const isWhitelistedBeforeAdd = await whitelist.isWhitelisted(expectAddWhitelistedAccounts[i]);

      assert.strictEqual(
        isWhitelistedBeforeAdd,
        expectIsWhitelistedBeforeAdd,
        `Is whitelisted for ${expectAddWhitelistedAccounts[i]} is ${isWhitelistedBeforeAdd} instead of ${expectIsWhitelistedBeforeAdd}`
      );
    }

    const addWhitelistedBatch = await whitelist.addWhitelistedBatch(expectAddWhitelistedAccounts, {
      from: expectWhitelistAdmin,
    });

    // seems like can only check max 9 events as event 9 (zero-based) seems to be matched to event 0 likely due to wraparound
    for (let i = 0; i < TEST_MAX_EVENTS; i++) {
      // console.log(`${i}: addAccountEvent: ${expectAddWhitelistedAccounts[i]}`);

      expectEvent(addWhitelistedBatch, "WhitelistedAdded", {
        account: expectAddWhitelistedAccounts[i],
      });
    }

    const expectIsWhitelistedAfterAdd = true;

    for (let i = 0; i < expectAddWhitelistedAccounts.length; i++) {
      // console.log(`${i}: afterAddAccount: ${expectAddWhitelistedAccounts[i]}`);

      const isWhitelistedAfterAdd = await whitelist.isWhitelisted(expectAddWhitelistedAccounts[i]);

      assert.strictEqual(
        isWhitelistedAfterAdd,
        expectIsWhitelistedAfterAdd,
        `Is whitelisted for ${expectAddWhitelistedAccounts[i]} is ${isWhitelistedAfterAdd} instead of ${expectIsWhitelistedAfterAdd}`
      );
    }

    await expectRevert(
      whitelist.addWhitelistedBatch(expectAddWhitelistedAccounts, { from: nonWhitelistAdmin }),
      "Whitelist: sender unauthorized"
    );

    await expectRevert(
      whitelist.addWhitelistedBatch(expectAddWhitelistedAccounts, { from: expectWhitelistAdmin }),
      "Whitelist: already whitelisted"
    );

    const expectRemoveWhitelistedAccounts = expectAddWhitelistedAccounts;
    const removeWhitelistedBatch = await whitelist.removeWhitelistedBatch(expectRemoveWhitelistedAccounts, {
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

      const isWhitelistedAfterRemove = await whitelist.isWhitelisted(expectRemoveWhitelistedAccounts[i]);

      assert.strictEqual(
        isWhitelistedAfterRemove,
        expectIsWhitelistedAfterRemove,
        `Is whitelisted for ${expectRemoveWhitelistedAccounts[i]} is ${isWhitelistedAfterRemove} instead of ${expectIsWhitelistedAfterRemove}`
      );
    }

    await expectRevert(
      whitelist.removeWhitelistedBatch(expectRemoveWhitelistedAccounts, { from: nonWhitelistAdmin }),
      "Whitelist: sender unauthorized"
    );

    await expectRevert(
      whitelist.removeWhitelistedBatch(expectRemoveWhitelistedAccounts, { from: expectWhitelistAdmin }),
      "Whitelist: not whitelisted"
    );
  });

  it("should not allow add whitelisted batch with no accounts", async () => {
    await expectRevert(whitelist.addWhitelistedBatch([], { from: defaultWhitelistAdmin }), "Whitelist: empty");
  });

  it("should not allow add whitelisted batch with more than 500 accounts", async () => {
    const addWhitelistedAccounts = new Array(BATCH_MAX_NUM + 1).fill(ZERO_ADDRESS);

    await expectRevert(
      whitelist.addWhitelistedBatch(addWhitelistedAccounts, { from: defaultWhitelistAdmin }),
      "Whitelist: exceed max"
    );
  });

  it("should not allow add whitelisted batch with zero address", async () => {
    const expectAddWhitelistedAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );

    expectAddWhitelistedAccounts[BATCH_MAX_NUM - 1] = ZERO_ADDRESS;

    await expectRevert(
      whitelist.addWhitelistedBatch(expectAddWhitelistedAccounts, { from: defaultWhitelistAdmin }),
      "Whitelist: zero account"
    );
  });

  it("should not allow add whitelisted batch with duplicate address", async () => {
    const expectAddWhitelistedAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );

    expectAddWhitelistedAccounts[BATCH_MAX_NUM - 1] = expectAddWhitelistedAccounts[BATCH_MAX_NUM - 2];

    await expectRevert(
      whitelist.addWhitelistedBatch(expectAddWhitelistedAccounts, { from: defaultWhitelistAdmin }),
      "Whitelist: already whitelisted"
    );
  });

  it("should not allow remove whitelisted batch with no accounts", async () => {
    await expectRevert(whitelist.removeWhitelistedBatch([], { from: defaultWhitelistAdmin }), "Whitelist: empty");
  });

  it("should not allow remove whitelisted batch with more than 500 accounts", async () => {
    const removeWhitelistedAccounts = new Array(BATCH_MAX_NUM + 1).fill(ZERO_ADDRESS);

    await expectRevert(
      whitelist.removeWhitelistedBatch(removeWhitelistedAccounts, { from: defaultWhitelistAdmin }),
      "Whitelist: exceed max"
    );
  });

  it("should not allow remove whitelisted batch with zero address", async () => {
    const expectRemoveWhitelistedAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );

    const addWhitelistedBatch = await whitelist.addWhitelistedBatch(expectRemoveWhitelistedAccounts, {
      from: defaultWhitelistAdmin,
    });

    expectRemoveWhitelistedAccounts[BATCH_MAX_NUM - 1] = ZERO_ADDRESS;

    await expectRevert(
      whitelist.removeWhitelistedBatch(expectRemoveWhitelistedAccounts, { from: defaultWhitelistAdmin }),
      "Whitelist: zero account"
    );
  });

  it("should not allow remove whitelisted batch with duplicate address", async () => {
    const expectRemoveWhitelistedAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );

    const addWhitelistedBatch = await whitelist.addWhitelistedBatch(expectRemoveWhitelistedAccounts, {
      from: defaultWhitelistAdmin,
    });

    expectRemoveWhitelistedAccounts[BATCH_MAX_NUM - 1] = expectRemoveWhitelistedAccounts[BATCH_MAX_NUM - 2];

    await expectRevert(
      whitelist.removeWhitelistedBatch(expectRemoveWhitelistedAccounts, { from: defaultWhitelistAdmin }),
      "Whitelist: not whitelisted"
    );
  });
});
