const timeMachine = require("ganache-time-traveler");
const { expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");
const { BN, BN_ZERO, BN_ONE, ZERO_ADDRESS, ether, ...testHelpers } = require("./test-helpers");

const BN_SECONDS_IN_HOUR = new BN("3600");
const BN_SECONDS_IN_DAY = new BN("86400");
const BN_PERCENT_100_WEI = ether("100");

describe("Vesting", () => {
  const BATCH_MAX_NUM = 200;
  const TEST_MAX_EVENTS = 9;

  let accounts;
  let defaultGovernanceAccount;
  let defaultGovernanceMintAmount;
  let defaultVestingAdmin;
  let ejsToken;
  let snapshotId;
  let vesting;

  before(async () => {
    const snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];

    accounts = await web3.eth.getAccounts();
    defaultGovernanceAccount = accounts[0];
    defaultVestingAdmin = accounts[1];

    defaultGovernanceMintAmount = ether("1000000");
  });

  after(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  beforeEach(async () => {
    ejsToken = await testHelpers.newEjsToken();
    vesting = await testHelpers.newVesting(ejsToken.address);

    await ejsToken.mint(vesting.address, defaultGovernanceMintAmount, { from: defaultGovernanceAccount });
    await vesting.setVestingAdmin(defaultVestingAdmin, { from: defaultGovernanceAccount });
  });

  it("should be initialized correctly", async () => {
    const expectGovernanceAccount = defaultGovernanceAccount;
    const expectVestingAdmin = defaultVestingAdmin;
    const expectTokenAddress = ejsToken.address;
    const expectTotalGrantAmount = BN_ZERO;
    const expectTotalReleasedAmount = BN_ZERO;
    const expectScheduleStartTimestamp = BN_ZERO;
    const expectVestingSchedule = {
      cliffDurationDays: new BN("30"),
      percentReleaseAtScheduleStart: BN_ZERO,
      percentReleaseForEachInterval: ether("10"),
      intervalDays: new BN("30"),
      gapDays: BN_ZERO,
      numberOfIntervals: new BN("10"),
      releaseMethod: new BN("1"),
    };

    const governanceAccount = await vesting.governanceAccount();
    const vestingAdmin = await vesting.vestingAdmin();
    const tokenAddress = await vesting.tokenAddress();
    const totalGrantAmount = await vesting.totalGrantAmount();
    const totalReleasedAmount = await vesting.totalReleasedAmount();
    const scheduleStartTimestamp = await vesting.scheduleStartTimestamp();
    const vestingSchedule = await vesting.getVestingSchedule();

    assert.strictEqual(
      governanceAccount,
      expectGovernanceAccount,
      `Governance account is ${governanceAccount} instead of ${expectGovernanceAccount}`
    );

    assert.strictEqual(
      vestingAdmin,
      expectVestingAdmin,
      `Vesting admin is ${vestingAdmin} instead of ${expectVestingAdmin}`
    );

    assert.strictEqual(
      tokenAddress,
      expectTokenAddress,
      `Governance account is ${tokenAddress} instead of ${expectTokenAddress}`
    );

    assert.ok(
      totalGrantAmount.eq(expectTotalGrantAmount),
      `Total grant amount is ${totalGrantAmount} instead of ${expectTotalGrantAmount}`
    );

    assert.ok(
      totalReleasedAmount.eq(expectTotalReleasedAmount),
      `Total released amount is ${totalReleasedAmount} instead of ${expectTotalReleasedAmount}`
    );

    assert.ok(
      scheduleStartTimestamp.eq(expectScheduleStartTimestamp),
      `Schedule start timestamp is ${scheduleStartTimestamp} instead of ${expectScheduleStartTimestamp}`
    );

    assert.ok(
      vestingSchedule[0].eq(expectVestingSchedule.cliffDurationDays),
      `Cliff duration days is ${vestingSchedule[0]} instead of ${expectVestingSchedule.cliffDurationDays}`
    );

    assert.ok(
      vestingSchedule[1].eq(expectVestingSchedule.percentReleaseAtScheduleStart),
      `Percent release at schedule start is ${vestingSchedule[1]} instead of ${expectVestingSchedule.percentReleaseAtScheduleStart}`
    );

    assert.ok(
      vestingSchedule[2].eq(expectVestingSchedule.percentReleaseForEachInterval),
      `Percent release for each interval ${vestingSchedule[2]} instead of ${expectVestingSchedule.percentReleaseForEachInterval}`
    );

    assert.ok(
      vestingSchedule[3].eq(expectVestingSchedule.intervalDays),
      `Interval days is ${vestingSchedule[3]} instead of ${expectVestingSchedule.intervalDays}`
    );

    assert.ok(
      vestingSchedule[4].eq(expectVestingSchedule.gapDays),
      `Gap days is ${vestingSchedule[4]} instead of ${expectVestingSchedule.gapDays}`
    );

    assert.ok(
      vestingSchedule[5].eq(expectVestingSchedule.numberOfIntervals),
      `Number of intervals is ${vestingSchedule[5]} instead of ${expectVestingSchedule.numberOfIntervals}`
    );

    assert.ok(
      vestingSchedule[6].eq(expectVestingSchedule.releaseMethod),
      `Release method is ${vestingSchedule[6]} instead of ${expectVestingSchedule.releaseMethod}`
    );
  });

  it("should not allow initialization of zero address token", async () => {
    await expectRevert(testHelpers.newVesting(ZERO_ADDRESS), "Vesting: zero token address");
  });

  it("should not allow initialization of release percentage at schedule start to be greater than 100%", async () => {
    await expectRevert(
      testHelpers.newVesting(ejsToken.address, new BN("30"), ether("100.000000000000000001")),
      "Vesting: percent release at grant start > 100%"
    );
  });

  it("should not allow initialization of release percentage for each interval to be greater than 100%", async () => {
    await expectRevert(
      testHelpers.newVesting(ejsToken.address, new BN("30"), ether("10"), ether("100.000000000000000001")),
      "Vesting: percent release for each interval > 100%"
    );
  });

  it("should not allow initialization for zero interval", async () => {
    await expectRevert(
      testHelpers.newVesting(ejsToken.address, new BN("30"), ether("100"), ether("100"), BN_ZERO),
      "Vesting: zero interval"
    );
  });

  it("should not allow initialization of total release percentage to be greater than 100%", async () => {
    await expectRevert(
      testHelpers.newVesting(ejsToken.address, new BN("30"), ether("10"), ether("9.000000000000000001")),
      "Vesting: total percent release > 100%"
    );
  });

  it("should not allow initialization for invalid release method", async () => {
    await expectRevert(
      testHelpers.newVesting(
        ejsToken.address,
        new BN("30"),
        ether("10"),
        ether("9"),
        new BN("30"),
        BN_ZERO,
        new BN("10"),
        new BN("2")
      ),
      "invalid opcode"
    );
  });

  it("should allow governance account to change governance account", async () => {
    const nonGovernanceAccount = accounts[9];

    const expectNewGovernanceAccount = nonGovernanceAccount;
    await vesting.setGovernanceAccount(nonGovernanceAccount, { from: defaultGovernanceAccount });
    const newGovernanceAccount = await vesting.governanceAccount();

    assert.strictEqual(
      newGovernanceAccount,
      expectNewGovernanceAccount,
      `New governance account is ${newGovernanceAccount} instead of ${expectNewGovernanceAccount}`
    );

    await expectRevert(
      vesting.setGovernanceAccount(defaultGovernanceAccount, { from: defaultGovernanceAccount }),
      "Vesting: sender unauthorized"
    );

    const expectGovernanceAccount = defaultGovernanceAccount;
    await vesting.setGovernanceAccount(defaultGovernanceAccount, { from: expectNewGovernanceAccount });
    const governanceAccount = await vesting.governanceAccount();

    assert.strictEqual(
      governanceAccount,
      expectGovernanceAccount,
      `Governance account is ${governanceAccount} instead of ${expectGovernanceAccount}`
    );
  });

  it("should not allow non governance account to change governance account", async () => {
    const nonGovernanceAccount = accounts[9];

    await expectRevert(
      vesting.setGovernanceAccount(nonGovernanceAccount, { from: nonGovernanceAccount }),
      "Vesting: sender unauthorized"
    );

    await expectRevert(
      vesting.setGovernanceAccount(defaultVestingAdmin, { from: defaultVestingAdmin }),
      "Vesting: sender unauthorized"
    );
  });

  it("should not allow set governance account to zero address", async () => {
    await expectRevert(
      vesting.setGovernanceAccount(ZERO_ADDRESS, { from: defaultGovernanceAccount }),
      "Vesting: zero account"
    );
  });

  it("should allow governance account to change vesting admin", async () => {
    const nonVestingAdmin = accounts[9];

    const expectNewVestingAdmin = nonVestingAdmin;
    await vesting.setVestingAdmin(nonVestingAdmin, { from: defaultGovernanceAccount });
    const newVestingAdmin = await vesting.vestingAdmin();

    assert.strictEqual(
      newVestingAdmin,
      expectNewVestingAdmin,
      `New vesting admin is ${newVestingAdmin} instead of ${expectNewVestingAdmin}`
    );

    const expectVestingAdmin = defaultVestingAdmin;
    await vesting.setVestingAdmin(defaultVestingAdmin, { from: defaultGovernanceAccount });
    const vestingAdmin = await vesting.vestingAdmin();

    assert.strictEqual(
      vestingAdmin,
      expectVestingAdmin,
      `Vesting admin is ${vestingAdmin} instead of ${expectVestingAdmin}`
    );
  });

  it("should not allow non governance account to change vesting admin", async () => {
    const nonGovernanceAccount = accounts[9];

    await expectRevert(
      vesting.setVestingAdmin(nonGovernanceAccount, { from: nonGovernanceAccount }),
      "Vesting: sender unauthorized"
    );

    await expectRevert(
      vesting.setVestingAdmin(defaultVestingAdmin, { from: defaultVestingAdmin }),
      "Vesting: sender unauthorized"
    );
  });

  it("should not allow set vesting admin to zero address", async () => {
    await expectRevert(
      vesting.setVestingAdmin(ZERO_ADDRESS, { from: defaultGovernanceAccount }),
      "Vesting: zero account"
    );
  });

  it("should only allow governance account to set schedule start", async () => {
    const nonVestingAdmin = accounts[9];

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await expectRevert(
      vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: nonVestingAdmin }),
      "Vesting: sender unauthorized"
    );

    await expectRevert(
      vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultGovernanceAccount }),
      "Vesting: sender unauthorized"
    );

    const setSchedulerStartTimestamp = await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, {
      from: defaultVestingAdmin,
    });
    const scheduleStartTimestamp = await vesting.scheduleStartTimestamp();

    expectEvent(setSchedulerStartTimestamp, "ScheduleStartTimestampSet", {
      account: defaultVestingAdmin,
      newScheduleStartTimestamp: expectScheduleStartTimestamp,
      oldScheduleStartTimestamp: BN_ZERO,
    });

    assert.ok(
      scheduleStartTimestamp.eq(expectScheduleStartTimestamp),
      `Schedule start timestamp is ${scheduleStartTimestamp} instead of ${expectScheduleStartTimestamp}`
    );

    // advance to before schedule start
    await time.increaseTo(expectScheduleStartTimestamp.sub(time.duration.seconds(10)));

    const expectNewScheduleStartTimestamp = expectScheduleStartTimestamp.add(BN_SECONDS_IN_HOUR);

    const setNewSchedulerStartTimestamp = await vesting.setScheduleStartTimestamp(expectNewScheduleStartTimestamp, {
      from: defaultVestingAdmin,
    });
    const newScheduleStartTimestamp = await vesting.scheduleStartTimestamp();

    expectEvent(setNewSchedulerStartTimestamp, "ScheduleStartTimestampSet", {
      account: defaultVestingAdmin,
      newScheduleStartTimestamp: expectNewScheduleStartTimestamp,
      oldScheduleStartTimestamp: expectScheduleStartTimestamp,
    });

    assert.ok(
      newScheduleStartTimestamp.eq(expectNewScheduleStartTimestamp),
      `New schedule start timestamp is ${newScheduleStartTimestamp} instead of ${expectNewScheduleStartTimestamp}`
    );

    // advance to just after schedule start
    const timestampAfterScheduleStart = expectNewScheduleStartTimestamp.add(time.duration.seconds(1));
    await time.increaseTo(timestampAfterScheduleStart);

    const expectNewScheduleStartTimestampAfterStarted = expectNewScheduleStartTimestamp.add(BN_SECONDS_IN_HOUR);
    await expectRevert(
      vesting.setScheduleStartTimestamp(expectNewScheduleStartTimestampAfterStarted, {
        from: defaultVestingAdmin,
      }),
      "Vesting: already started"
    );
  });

  it("should not allow set schedule start to zero", async () => {
    await expectRevert(
      vesting.setScheduleStartTimestamp(BN_ZERO, { from: defaultVestingAdmin }),
      "Vesting: start before current timestamp"
    );
  });

  it("should not allow set schedule start before current time", async () => {
    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.sub(BN_SECONDS_IN_HOUR);

    await expectRevert(
      vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin }),
      "Vesting: start before current timestamp"
    );
  });

  it("should allow vesting admin to add vesting grant", async () => {
    const expectVestingAdmin = defaultVestingAdmin;
    const expectAddVestingGrantAccount = accounts[5];

    const expectGrantAmountBeforeAdd = BN_ZERO;
    const expectIsRevocableBeforeAdd = false;
    const expectIsRevokedBeforeAdd = false;
    const expectIsActiveBeforeAdd = false;
    const expectTotalGrantAmountBeforeAdd = BN_ZERO;
    const expectTotalReleasedAmountBeforeAdd = BN_ZERO;

    const vestingGrantAccountBeforeAdd = await vesting.vestingGrantFor(expectAddVestingGrantAccount);
    const totalGrantAmountBeforeAdd = await vesting.totalGrantAmount();
    const totalReleasedAmountBeforeAdd = await vesting.totalReleasedAmount();

    assert.ok(
      vestingGrantAccountBeforeAdd[0].eq(expectGrantAmountBeforeAdd),
      `Grant amount before add for ${expectAddVestingGrantAccount} is ${vestingGrantAccountBeforeAdd[0]} instead of ${expectGrantAmountBeforeAdd}`
    );

    assert.strictEqual(
      vestingGrantAccountBeforeAdd[1],
      expectIsRevocableBeforeAdd,
      `Grant is revocable before add for ${expectAddVestingGrantAccount} is ${vestingGrantAccountBeforeAdd[1]} instead of ${expectIsRevocableBeforeAdd}`
    );

    assert.strictEqual(
      vestingGrantAccountBeforeAdd[2],
      expectIsRevokedBeforeAdd,
      `Grant is revoked before add for ${expectAddVestingGrantAccount} is ${vestingGrantAccountBeforeAdd[2]} instead of ${expectIsRevokedBeforeAdd}`
    );

    assert.strictEqual(
      vestingGrantAccountBeforeAdd[3],
      expectIsActiveBeforeAdd,
      `Grant is active before add for ${expectAddVestingGrantAccount} is ${vestingGrantAccountBeforeAdd[3]} instead of ${expectIsActiveBeforeAdd}`
    );

    assert.ok(
      totalGrantAmountBeforeAdd.eq(expectTotalGrantAmountBeforeAdd),
      `Total grant amount before add is ${totalGrantAmountBeforeAdd} instead of ${expectTotalGrantAmountBeforeAdd}`
    );

    assert.ok(
      totalReleasedAmountBeforeAdd.eq(expectTotalReleasedAmountBeforeAdd),
      `Total released amount before add is ${totalReleasedAmountBeforeAdd} instead of ${expectTotalReleasedAmountBeforeAdd}`
    );

    const expectGrantAmountAfterAdd = ether("889054.74546856406126800");
    const expectIsRevocableAfterAdd = false;
    const expectIsRevokedAfterAdd = false;
    const expectIsActiveAfterAdd = true;
    const expectTotalGrantAmountAfterAdd = expectGrantAmountAfterAdd;
    const expectTotalReleasedAmountAfterAdd = BN_ZERO;

    const addVestingGrant = await vesting.addVestingGrant(
      expectAddVestingGrantAccount,
      expectGrantAmountAfterAdd,
      expectIsRevocableAfterAdd,
      { from: expectVestingAdmin }
    );

    expectEvent(addVestingGrant, "VestingGrantAdded", {
      account: expectAddVestingGrantAccount,
      grantAmount: expectGrantAmountAfterAdd,
      isRevocable: expectIsRevocableAfterAdd,
    });

    const vestingGrantAccountAfterAdd = await vesting.vestingGrantFor(expectAddVestingGrantAccount);
    const totalGrantAmountAfterAdd = await vesting.totalGrantAmount();
    const totalReleasedAmountAfterAdd = await vesting.totalReleasedAmount();

    assert.ok(
      vestingGrantAccountAfterAdd[0].eq(expectGrantAmountAfterAdd),
      `Grant amount after add for ${expectAddVestingGrantAccount} is ${vestingGrantAccountAfterAdd[0]} instead of ${expectGrantAmountAfterAdd}`
    );

    assert.strictEqual(
      vestingGrantAccountAfterAdd[1],
      expectIsRevocableAfterAdd,
      `Grant is revocable after add for ${expectAddVestingGrantAccount} is ${vestingGrantAccountAfterAdd[1]} instead of ${expectIsRevocableAfterAdd}`
    );

    assert.strictEqual(
      vestingGrantAccountAfterAdd[2],
      expectIsRevokedAfterAdd,
      `Grant is revoked after add for ${expectAddVestingGrantAccount} is ${vestingGrantAccountAfterAdd[2]} instead of ${expectIsRevokedAfterAdd}`
    );

    assert.strictEqual(
      vestingGrantAccountAfterAdd[3],
      expectIsActiveAfterAdd,
      `Grant is active after add for ${expectAddVestingGrantAccount} is ${vestingGrantAccountAfterAdd[3]} instead of ${expectIsActiveAfterAdd}`
    );

    assert.ok(
      totalGrantAmountAfterAdd.eq(expectTotalGrantAmountAfterAdd),
      `Total grant amount after add is ${totalGrantAmountAfterAdd} instead of ${expectTotalGrantAmountAfterAdd}`
    );

    assert.ok(
      totalReleasedAmountAfterAdd.eq(expectTotalReleasedAmountAfterAdd),
      `Total released amount after add is ${totalReleasedAmountAfterAdd} instead of ${expectTotalReleasedAmountAfterAdd}`
    );
  });

  it("should not allow non vesting admin to add vesting grant", async () => {
    const nonVestingAdmin = accounts[9];

    await expectRevert(
      vesting.addVestingGrant(defaultGovernanceAccount, BN_ONE, false, { from: nonVestingAdmin }),
      "Vesting: sender unauthorized"
    );

    await expectRevert(
      vesting.addVestingGrant(defaultGovernanceAccount, BN_ONE, false, { from: defaultGovernanceAccount }),
      "Vesting: sender unauthorized"
    );
  });

  it("should not allow add vesting grant for zero address", async () => {
    await expectRevert(
      vesting.addVestingGrant(ZERO_ADDRESS, BN_ONE, false, { from: defaultVestingAdmin }),
      "Vesting: zero account"
    );
  });

  it("should not allow add vesting grant for zero amount", async () => {
    await expectRevert(
      vesting.addVestingGrant(defaultGovernanceAccount, BN_ZERO, false, { from: defaultVestingAdmin }),
      "Vesting: zero grant amount"
    );
  });

  it("should not allow add vesting grant if schedule already started", async () => {
    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    // advance to just after schedule start
    await time.increaseTo(expectScheduleStartTimestamp.add(time.duration.seconds(1)));

    await expectRevert(
      vesting.addVestingGrant(defaultGovernanceAccount, BN_ONE, false, { from: defaultVestingAdmin }),
      "Vesting: already started"
    );
  });

  it("should not allow add vesting grant if already added", async () => {
    const beneficiary = accounts[5];

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });
    await vesting.addVestingGrant(beneficiary, BN_ONE, false, { from: defaultVestingAdmin });

    await expectRevert(
      vesting.addVestingGrant(beneficiary, BN_ONE, false, { from: defaultVestingAdmin }),
      "Vesting: already added"
    );

    await expectRevert(
      vesting.addVestingGrant(beneficiary, ether("1"), true, { from: defaultVestingAdmin }),
      "Vesting: already added"
    );
  });

  it("should not allow add vesting grant if total grant amount exceed balance", async () => {
    const beneficiary = accounts[5];

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });
    await vesting.addVestingGrant(defaultGovernanceAccount, ether("950000"), false, { from: defaultVestingAdmin });

    await expectRevert(
      vesting.addVestingGrant(beneficiary, ether("50000.000000000000000001"), false, {
        from: defaultVestingAdmin,
      }),
      "Vesting: total grant amount exceed balance"
    );
  });

  it("should not allow add vesting grant if revoked", async () => {
    const beneficiary = accounts[5];

    const cliffDurationDays = BN_ZERO;
    const percentReleaseAtScheduleStart = ether("50");
    const percentReleaseForEachInterval = ether("50");
    const intervalDays = new BN("30");
    const gapDays = BN_ZERO;
    const numberOfIntervals = new BN("1");
    const releaseMethod = new BN("0"); // IntervalEnd
    const allowAccumulate = true;

    const releaseAtStartAndLinearlyEveryMonthVesting = await testHelpers.newVesting(
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
    await ejsToken.mint(releaseAtStartAndLinearlyEveryMonthVesting.address, ether("1000000"), {
      from: defaultGovernanceAccount,
    });
    await releaseAtStartAndLinearlyEveryMonthVesting.setVestingAdmin(defaultVestingAdmin, {
      from: defaultGovernanceAccount,
    });

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await releaseAtStartAndLinearlyEveryMonthVesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, {
      from: defaultVestingAdmin,
    });
    await releaseAtStartAndLinearlyEveryMonthVesting.addVestingGrant(beneficiary, ether("950000"), true, {
      from: defaultVestingAdmin,
    });
    await releaseAtStartAndLinearlyEveryMonthVesting.revokeVestingGrant(beneficiary, { from: defaultVestingAdmin });

    await expectRevert(
      releaseAtStartAndLinearlyEveryMonthVesting.addVestingGrant(beneficiary, ether("50000.000000000000000001"), true, {
        from: defaultVestingAdmin,
      }),
      "Vesting: already revoked"
    );
  });

  it("should allow vesting admin to revoke vesting grant before schedule start", async () => {
    const expectVestingAdmin = defaultVestingAdmin;
    const expectRevokeVestingGrantAccount = accounts[5];
    const addGrantAmount = ether("516289.860093980725991000");

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });
    await vesting.addVestingGrant(expectRevokeVestingGrantAccount, addGrantAmount, true, { from: defaultVestingAdmin });

    const expectGrantAmountBeforeRevoke = addGrantAmount;
    const expectIsRevocableBeforeRevoke = true;
    const expectIsRevokedBeforeRevoke = false;
    const expectIsActiveBeforeRevoke = true;
    const expectTotalGrantAmountBeforeRevoke = addGrantAmount;
    const expectTotalReleasedAmountBeforeRevoke = BN_ZERO;
    const expectRevokedBeforeRevoked = false;
    const expectReleasedAmountBeforeRevoked = BN_ZERO;

    const vestingGrantAccountBeforeRevoke = await vesting.vestingGrantFor(expectRevokeVestingGrantAccount);
    const totalGrantAmountBeforeRevoke = await vesting.totalGrantAmount();
    const totalReleasedAmountBeforeRevoke = await vesting.totalReleasedAmount();
    const revokedBeforeRevoke = await vesting.revoked(expectRevokeVestingGrantAccount);
    const releasedAmountBeforeRevoke = await vesting.releasedAmountFor(expectRevokeVestingGrantAccount);

    assert.ok(
      vestingGrantAccountBeforeRevoke[0].eq(expectGrantAmountBeforeRevoke),
      `Grant amount before revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountBeforeRevoke[0]} instead of ${expectGrantAmountBeforeRevoke}`
    );

    assert.strictEqual(
      vestingGrantAccountBeforeRevoke[1],
      expectIsRevocableBeforeRevoke,
      `Grant is revocable before revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountBeforeRevoke[1]} instead of ${expectIsRevocableBeforeRevoke}`
    );

    assert.strictEqual(
      vestingGrantAccountBeforeRevoke[2],
      expectIsRevokedBeforeRevoke,
      `Grant is revoked before revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountBeforeRevoke[2]} instead of ${expectIsRevokedBeforeRevoke}`
    );

    assert.strictEqual(
      vestingGrantAccountBeforeRevoke[3],
      expectIsActiveBeforeRevoke,
      `Grant is active before revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountBeforeRevoke[3]} instead of ${expectIsActiveBeforeRevoke}`
    );

    assert.ok(
      totalGrantAmountBeforeRevoke.eq(expectTotalGrantAmountBeforeRevoke),
      `Total grant amount before revoke is ${totalGrantAmountBeforeRevoke} instead of ${expectTotalGrantAmountBeforeRevoke}`
    );

    assert.ok(
      totalReleasedAmountBeforeRevoke.eq(expectTotalReleasedAmountBeforeRevoke),
      `Total released amount before revoke is ${totalReleasedAmountBeforeRevoke} instead of ${expectTotalReleasedAmountBeforeRevoke}`
    );

    assert.strictEqual(
      revokedBeforeRevoke,
      expectRevokedBeforeRevoked,
      `Revoked before revoke for ${expectRevokeVestingGrantAccount} is ${revokedBeforeRevoke} instead of ${expectRevokedBeforeRevoked}`
    );

    assert.ok(
      releasedAmountBeforeRevoke.eq(expectReleasedAmountBeforeRevoked),
      `Released amount before revoke for ${expectRevokeVestingGrantAccount} is ${releasedAmountBeforeRevoke} instead of ${expectReleasedAmountBeforeRevoked}`
    );

    const expectRemainderAmountAfterRevoke = addGrantAmount;
    const expectReleasedAmountAfterRevoke = BN_ZERO;
    const expectGrantAmountAfterRevoke = addGrantAmount;
    const expectIsRevocableAfterRevoke = true;
    const expectIsRevokedAfterRevoke = true;
    const expectIsActiveAfterRevoke = true;
    const expectTotalGrantAmountAfterRevoke = BN_ZERO;
    const expectTotalReleasedAmountAfterRevoke = BN_ZERO;
    const expectRevokedAfterRevoked = true;
    const expectReleasedAmountAfterRevoked = BN_ZERO;

    const revokeVestingGrant = await vesting.revokeVestingGrant(expectRevokeVestingGrantAccount, {
      from: expectVestingAdmin,
    });

    expectEvent(revokeVestingGrant, "VestingGrantRevoked", {
      account: expectRevokeVestingGrantAccount,
      remainderAmount: expectRemainderAmountAfterRevoke,
      grantAmount: expectGrantAmountAfterRevoke,
      releasedAmount: expectReleasedAmountAfterRevoke,
    });

    const vestingGrantAccountAfterRevoke = await vesting.vestingGrantFor(expectRevokeVestingGrantAccount);
    const totalGrantAmountAfterRevoke = await vesting.totalGrantAmount();
    const totalReleasedAmountAfterRevoke = await vesting.totalReleasedAmount();
    const revokedAfterRevoke = await vesting.revoked(expectRevokeVestingGrantAccount);
    const releasedAmountAfterRevoke = await vesting.releasedAmountFor(expectRevokeVestingGrantAccount);

    assert.ok(
      vestingGrantAccountAfterRevoke[0].eq(expectGrantAmountAfterRevoke),
      `Grant amount after revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountAfterRevoke[0]} instead of ${expectGrantAmountAfterRevoke}`
    );

    assert.strictEqual(
      vestingGrantAccountAfterRevoke[1],
      expectIsRevocableAfterRevoke,
      `Grant is revocable after revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountAfterRevoke[1]} instead of ${expectIsRevocableAfterRevoke}`
    );

    assert.strictEqual(
      vestingGrantAccountAfterRevoke[2],
      expectIsRevokedAfterRevoke,
      `Grant is revoked after revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountAfterRevoke[2]} instead of ${expectIsRevokedAfterRevoke}`
    );

    assert.strictEqual(
      vestingGrantAccountAfterRevoke[3],
      expectIsActiveAfterRevoke,
      `Grant is active after revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountAfterRevoke[3]} instead of ${expectIsActiveAfterRevoke}`
    );

    assert.ok(
      totalGrantAmountAfterRevoke.eq(expectTotalGrantAmountAfterRevoke),
      `Total grant amount after revoke is ${totalGrantAmountAfterRevoke} instead of ${expectTotalGrantAmountAfterRevoke}`
    );

    assert.ok(
      totalReleasedAmountAfterRevoke.eq(expectTotalReleasedAmountAfterRevoke),
      `Total released amount after revoke is ${totalReleasedAmountAfterRevoke} instead of ${expectTotalReleasedAmountAfterRevoke}`
    );

    assert.strictEqual(
      revokedAfterRevoke,
      expectRevokedAfterRevoked,
      `Revoked after revoke for ${expectRevokeVestingGrantAccount} is ${revokedAfterRevoke} instead of ${expectRevokedAfterRevoked}`
    );

    assert.ok(
      releasedAmountAfterRevoke.eq(expectReleasedAmountAfterRevoked),
      `Released amount after revoke for ${expectRevokeVestingGrantAccount} is ${releasedAmountAfterRevoke} instead of ${expectReleasedAmountAfterRevoked}`
    );
  });

  it("should allow vesting admin to revoke vesting grant after schedule start", async () => {
    const expectVestingAdmin = defaultVestingAdmin;
    const expectRevokeVestingGrantAccount = accounts[5];
    const addGrantAmount = ether("516289.860093980725991000");

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });
    await vesting.addVestingGrant(expectRevokeVestingGrantAccount, addGrantAmount, true, { from: defaultVestingAdmin });

    // advance to just after schedule start
    await time.increaseTo(expectScheduleStartTimestamp.add(time.duration.seconds(1)));

    const expectGrantAmountBeforeRevoke = addGrantAmount;
    const expectIsRevocableBeforeRevoke = true;
    const expectIsRevokedBeforeRevoke = false;
    const expectIsActiveBeforeRevoke = true;
    const expectTotalGrantAmountBeforeRevoke = addGrantAmount;
    const expectTotalReleasedAmountBeforeRevoke = BN_ZERO;
    const expectRevokedBeforeRevoked = false;
    const expectReleasedAmountBeforeRevoked = BN_ZERO;

    const vestingGrantAccountBeforeRevoke = await vesting.vestingGrantFor(expectRevokeVestingGrantAccount);
    const totalGrantAmountBeforeRevoke = await vesting.totalGrantAmount();
    const totalReleasedAmountBeforeRevoke = await vesting.totalReleasedAmount();
    const revokedBeforeRevoke = await vesting.revoked(expectRevokeVestingGrantAccount);
    const releasedAmountBeforeRevoke = await vesting.releasedAmountFor(expectRevokeVestingGrantAccount);

    assert.ok(
      vestingGrantAccountBeforeRevoke[0].eq(expectGrantAmountBeforeRevoke),
      `Grant amount before revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountBeforeRevoke[0]} instead of ${expectGrantAmountBeforeRevoke}`
    );

    assert.strictEqual(
      vestingGrantAccountBeforeRevoke[1],
      expectIsRevocableBeforeRevoke,
      `Grant is revocable before revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountBeforeRevoke[1]} instead of ${expectIsRevocableBeforeRevoke}`
    );

    assert.strictEqual(
      vestingGrantAccountBeforeRevoke[2],
      expectIsRevokedBeforeRevoke,
      `Grant is revoked before revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountBeforeRevoke[2]} instead of ${expectIsRevokedBeforeRevoke}`
    );

    assert.strictEqual(
      vestingGrantAccountBeforeRevoke[3],
      expectIsActiveBeforeRevoke,
      `Grant is active before revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountBeforeRevoke[3]} instead of ${expectIsActiveBeforeRevoke}`
    );

    assert.ok(
      totalGrantAmountBeforeRevoke.eq(expectTotalGrantAmountBeforeRevoke),
      `Total grant amount before revoke is ${totalGrantAmountBeforeRevoke} instead of ${expectTotalGrantAmountBeforeRevoke}`
    );

    assert.ok(
      totalReleasedAmountBeforeRevoke.eq(expectTotalReleasedAmountBeforeRevoke),
      `Total released amount before revoke is ${totalReleasedAmountBeforeRevoke} instead of ${expectTotalReleasedAmountBeforeRevoke}`
    );

    assert.strictEqual(
      revokedBeforeRevoke,
      expectRevokedBeforeRevoked,
      `Revoked before revoke for ${expectRevokeVestingGrantAccount} is ${revokedBeforeRevoke} instead of ${expectRevokedBeforeRevoked}`
    );

    assert.ok(
      releasedAmountBeforeRevoke.eq(expectReleasedAmountBeforeRevoked),
      `Released amount before revoke for ${expectRevokeVestingGrantAccount} is ${releasedAmountBeforeRevoke} instead of ${expectReleasedAmountBeforeRevoked}`
    );

    const expectRemainderAmountAfterRevoke = addGrantAmount;
    const expectReleasedAmountAfterRevoke = BN_ZERO;
    const expectGrantAmountAfterRevoke = addGrantAmount;
    const expectIsRevocableAfterRevoke = true;
    const expectIsRevokedAfterRevoke = true;
    const expectIsActiveAfterRevoke = true;
    const expectTotalGrantAmountAfterRevoke = BN_ZERO;
    const expectTotalReleasedAmountAfterRevoke = BN_ZERO;
    const expectRevokedAfterRevoked = true;
    const expectReleasedAmountAfterRevoked = BN_ZERO;

    const revokeVestingGrant = await vesting.revokeVestingGrant(expectRevokeVestingGrantAccount, {
      from: expectVestingAdmin,
    });

    expectEvent(revokeVestingGrant, "VestingGrantRevoked", {
      account: expectRevokeVestingGrantAccount,
      remainderAmount: expectRemainderAmountAfterRevoke,
      grantAmount: expectGrantAmountAfterRevoke,
      releasedAmount: expectReleasedAmountAfterRevoke,
    });

    const vestingGrantAccountAfterRevoke = await vesting.vestingGrantFor(expectRevokeVestingGrantAccount);
    const totalGrantAmountAfterRevoke = await vesting.totalGrantAmount();
    const totalReleasedAmountAfterRevoke = await vesting.totalReleasedAmount();
    const revokedAfterRevoke = await vesting.revoked(expectRevokeVestingGrantAccount);
    const releasedAmountAfterRevoke = await vesting.releasedAmountFor(expectRevokeVestingGrantAccount);

    assert.ok(
      vestingGrantAccountAfterRevoke[0].eq(expectGrantAmountAfterRevoke),
      `Grant amount after revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountAfterRevoke[0]} instead of ${expectGrantAmountAfterRevoke}`
    );

    assert.strictEqual(
      vestingGrantAccountAfterRevoke[1],
      expectIsRevocableAfterRevoke,
      `Grant is revocable after revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountAfterRevoke[1]} instead of ${expectIsRevocableAfterRevoke}`
    );

    assert.strictEqual(
      vestingGrantAccountAfterRevoke[2],
      expectIsRevokedAfterRevoke,
      `Grant is revoked after revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountAfterRevoke[2]} instead of ${expectIsRevokedAfterRevoke}`
    );

    assert.strictEqual(
      vestingGrantAccountAfterRevoke[3],
      expectIsActiveAfterRevoke,
      `Grant is active after revoke for ${expectRevokeVestingGrantAccount} is ${vestingGrantAccountAfterRevoke[3]} instead of ${expectIsActiveAfterRevoke}`
    );

    assert.ok(
      totalGrantAmountAfterRevoke.eq(expectTotalGrantAmountAfterRevoke),
      `Total grant amount after revoke is ${totalGrantAmountAfterRevoke} instead of ${expectTotalGrantAmountAfterRevoke}`
    );

    assert.ok(
      totalReleasedAmountAfterRevoke.eq(expectTotalReleasedAmountAfterRevoke),
      `Total released amount after revoke is ${totalReleasedAmountAfterRevoke} instead of ${expectTotalReleasedAmountAfterRevoke}`
    );

    assert.strictEqual(
      revokedAfterRevoke,
      expectRevokedAfterRevoked,
      `Revoked after revoke for ${expectRevokeVestingGrantAccount} is ${revokedAfterRevoke} instead of ${expectRevokedAfterRevoked}`
    );

    assert.ok(
      releasedAmountAfterRevoke.eq(expectReleasedAmountAfterRevoked),
      `Released amount after revoke for ${expectRevokeVestingGrantAccount} is ${releasedAmountAfterRevoke} instead of ${expectReleasedAmountAfterRevoked}`
    );
  });

  it("should not allow non vesting admin to revoke vesting grant", async () => {
    const nonVestingAdmin = accounts[9];

    await expectRevert(
      vesting.revokeVestingGrant(defaultGovernanceAccount, { from: nonVestingAdmin }),
      "Vesting: sender unauthorized"
    );

    await expectRevert(
      vesting.revokeVestingGrant(defaultGovernanceAccount, { from: defaultGovernanceAccount }),
      "Vesting: sender unauthorized"
    );
  });

  it("should not allow revoke vesting grant for zero address", async () => {
    await expectRevert(
      vesting.revokeVestingGrant(ZERO_ADDRESS, { from: defaultVestingAdmin }),
      "Vesting: zero account"
    );
  });

  it("should not allow revoke vesting grant for inactive vesting grant", async () => {
    await expectRevert(
      vesting.revokeVestingGrant(defaultGovernanceAccount, { from: defaultVestingAdmin }),
      "Vesting: inactive"
    );
  });

  it("should not allow revoke vesting grant for not revocable vesting grant", async () => {
    const beneficiary = accounts[5];

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });
    await vesting.addVestingGrant(beneficiary, BN_ONE, false, { from: defaultVestingAdmin });

    await expectRevert(
      vesting.revokeVestingGrant(beneficiary, { from: defaultVestingAdmin }),
      "Vesting: not revocable"
    );
  });

  it("should not allow revoke vesting grant for already revoked vesting grant", async () => {
    const beneficiary = accounts[5];

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });
    await vesting.addVestingGrant(beneficiary, BN_ONE, true, { from: defaultVestingAdmin });
    await vesting.revokeVestingGrant(beneficiary, { from: defaultVestingAdmin });

    await expectRevert(
      vesting.revokeVestingGrant(beneficiary, { from: defaultVestingAdmin }),
      "Vesting: already revoked"
    );
  });

  it("should return correct vested amount for undefined schedule start", async () => {
    const beneficiary = accounts[5];

    const expectedGrantAmount = ether("609303.499455517800769000");
    await vesting.addVestingGrant(beneficiary, expectedGrantAmount, false, { from: defaultVestingAdmin });

    const expectVestedAmount = BN_ZERO;

    const vestedAmount = await vesting.vestedAmountFor(beneficiary);

    assert.ok(vestedAmount.eq(expectVestedAmount), `Vested amount is ${vestedAmount} instead of ${expectVestedAmount}`);
  });

  it("should return correct vested amount for before schedule start", async () => {
    const beneficiary = accounts[5];

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    const expectedGrantAmount = ether("609303.499455517800769000");
    await vesting.addVestingGrant(beneficiary, expectedGrantAmount, false, { from: defaultVestingAdmin });

    const expectVestedAmount = BN_ZERO;

    const vestedAmount = await vesting.vestedAmountFor(beneficiary);

    assert.ok(vestedAmount.eq(expectVestedAmount), `Vested amount is ${vestedAmount} instead of ${expectVestedAmount}`);
  });

  it("should return correct vested amount for before cliff", async () => {
    const beneficiary = accounts[5];

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    const expectedGrantAmount = ether("609303.499455517800769000");
    await vesting.addVestingGrant(beneficiary, expectedGrantAmount, false, { from: defaultVestingAdmin });

    const vestingSchedule = await vesting.getVestingSchedule();

    // advance to just before cliff
    await time.increaseTo(
      expectScheduleStartTimestamp
        .add(vestingSchedule.cliffDurationDays.mul(BN_SECONDS_IN_DAY))
        .sub(time.duration.seconds(10))
    );

    const expectVestedAmount = BN_ZERO;

    const vestedAmount = await vesting.vestedAmountFor(beneficiary);

    assert.ok(vestedAmount.eq(expectVestedAmount), `Vested amount is ${vestedAmount} instead of ${expectVestedAmount}`);
  });

  it("should return zero vested/unvested amount for revoked grant with no tokens released", async () => {
    const beneficiary = accounts[5];

    const expectedGrantAmount = ether("563590.266799561336397000");
    await vesting.addVestingGrant(beneficiary, expectedGrantAmount, true, { from: defaultVestingAdmin });

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    // advance to after first interval end
    const vestingSchedule = await vesting.getVestingSchedule();
    const firstIntervalEndTimestamp = expectScheduleStartTimestamp.add(
      vestingSchedule.cliffDurationDays.add(vestingSchedule.intervalDays).mul(BN_SECONDS_IN_DAY)
    );
    await time.increaseTo(firstIntervalEndTimestamp.add(time.duration.seconds(10)));

    await vesting.revokeVestingGrant(beneficiary, { from: defaultVestingAdmin });

    const expectVestedAmount = BN_ZERO;
    const expectUnvestedAmount = BN_ZERO;

    const vestedAmount = await vesting.vestedAmountFor(beneficiary);
    const unvestedAmount = await vesting.unvestedAmountFor(beneficiary);

    assert.ok(vestedAmount.eq(expectVestedAmount), `Vested amount is ${vestedAmount} instead of ${expectVestedAmount}`);
    assert.ok(
      unvestedAmount.eq(expectUnvestedAmount),
      `Unvested amount is ${unvestedAmount} instead of ${expectUnvestedAmount}`
    );
  });

  it("should return correct vested/unvested amount for revoked grant with some tokens released", async () => {
    const beneficiary = accounts[5];

    const expectedGrantAmount = ether("391830.986711729034829000");
    await vesting.addVestingGrant(beneficiary, expectedGrantAmount, true, { from: defaultVestingAdmin });

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    // advance to after first interval end
    const vestingSchedule = await vesting.getVestingSchedule();
    const firstIntervalEndTimestamp = expectScheduleStartTimestamp.add(
      vestingSchedule.cliffDurationDays.add(vestingSchedule.intervalDays).mul(BN_SECONDS_IN_DAY)
    );
    await time.increaseTo(firstIntervalEndTimestamp.add(time.duration.seconds(10)));

    const release = await vesting.release({ from: beneficiary });

    await time.increase(time.duration.minutes(60));

    await vesting.revokeVestingGrant(beneficiary, { from: defaultVestingAdmin });

    const expectVestedAmount = release.receipt.logs[0].args.amount;
    const expectUnvestedAmount = await vesting.unvestedAmountFor(beneficiary);

    const vestedAmount = await vesting.vestedAmountFor(beneficiary);
    const unvestedAmount = await vesting.unvestedAmountFor(beneficiary);

    assert.ok(vestedAmount.eq(expectVestedAmount), `Vested amount is ${vestedAmount} instead of ${expectVestedAmount}`);
    assert.ok(
      unvestedAmount.eq(expectUnvestedAmount),
      `Unvested amount is ${unvestedAmount} instead of ${expectUnvestedAmount}`
    );
  });

  it("should return correct vested amount for each interval with one month cliff and 10% linear release every month", async () => {
    const beneficiary = accounts[5];
    const expectGrantAmount = ether("524938.48979784803814700");

    // assumes percent release for each interval is 10% and number of intervals is 10
    const expectVestedPercents = [
      [
        {
          secondsIn: new BN("473320"),
        }, // near start of interval
        {
          secondsIn: new BN("880552"),
        }, // near mid of interval
        {
          secondsIn: new BN("2363272"),
        }, // near end of interval
      ], // interval 0
      [
        {
          secondsIn: new BN("53488"),
        }, // near start of interval
        {
          secondsIn: new BN("933275"),
        }, // near mid of interval
        {
          secondsIn: new BN("2298549"),
        }, // near end of interval
      ], // interval 1
      [
        {
          secondsIn: new BN("515263"),
        }, // near start of interval
        {
          secondsIn: new BN("1242777"),
        }, // near mid of interval
        {
          secondsIn: new BN("2395160"),
        }, // near end of interval
      ], // interval 2
      [
        {
          secondsIn: new BN("98105"),
        }, // near start of interval
        {
          secondsIn: new BN("1303434"),
        }, // near mid of interval
        {
          secondsIn: new BN("1987087"),
        }, // near end of interval
      ], // interval 3
      [
        {
          secondsIn: new BN("505089"),
        }, // near start of interval
        {
          secondsIn: new BN("1116192"),
        }, // near mid of interval
        {
          secondsIn: new BN("2026353"),
        }, // near end of interval
      ], // interval 4
      [
        {
          secondsIn: new BN("596629"),
        }, // near start of interval
        {
          secondsIn: new BN("1266309"),
        }, // near mid of interval
        {
          secondsIn: new BN("2177426"),
        }, // near end of interval
      ], // interval 5
      [
        {
          secondsIn: new BN("846276"),
        }, // near start of interval
        {
          secondsIn: new BN("1256252"),
        }, // near mid of interval
        {
          secondsIn: new BN("2443417"),
        }, // near end of interval
      ], // interval 6
      [
        {
          secondsIn: new BN("84673"),
        }, // near start of interval
        {
          secondsIn: new BN("1103510"),
        }, // near mid of interval
        {
          secondsIn: new BN("2212667"),
        }, // near end of interval
      ], // interval 7
      [
        {
          secondsIn: new BN("660321"),
        }, // near start of interval
        {
          secondsIn: new BN("1212305"),
        }, // near mid of interval
        {
          secondsIn: new BN("2209321"),
        }, // near end of interval
      ], // interval 8
      [
        {
          secondsIn: new BN("852961"),
        }, // near start of interval
        {
          secondsIn: new BN("1594278"),
        }, // near mid of interval
        {
          secondsIn: new BN("2117008"),
        }, // near end of interval
      ], // interval 9
    ];

    await testVestedAmountForEachInterval(
      vesting,
      beneficiary,
      expectGrantAmount,
      expectVestedPercents,
      (blockTimestamp, startIntervalTimestamp, eachIntervalPercentRelease, intervalSecs) => {
        return blockTimestamp.sub(startIntervalTimestamp).mul(eachIntervalPercentRelease).div(intervalSecs);
      }
    );
  });

  it("should return correct vested amount for each interval with 5% release on start and 9.5% linear release every month", async () => {
    const beneficiary = accounts[5];
    const expectGrantAmount = ether("616613.242086613351322000");

    const cliffDurationDays = BN_ZERO;
    const percentReleaseAtScheduleStart = ether("5");
    const percentReleaseForEachInterval = ether("9.5");
    const intervalDays = new BN("30");
    const gapDays = BN_ZERO;
    const numberOfIntervals = new BN("10");
    const releaseMethod = new BN("1"); // LinearlyPerSecond

    const releaseAtStartAndLinearlyEveryMonthVesting = await testHelpers.newVesting(
      ejsToken.address,
      cliffDurationDays,
      percentReleaseAtScheduleStart,
      percentReleaseForEachInterval,
      intervalDays,
      gapDays,
      numberOfIntervals,
      releaseMethod
    );
    await ejsToken.mint(releaseAtStartAndLinearlyEveryMonthVesting.address, ether("1000000"), {
      from: defaultGovernanceAccount,
    });
    await releaseAtStartAndLinearlyEveryMonthVesting.setVestingAdmin(defaultVestingAdmin, {
      from: defaultGovernanceAccount,
    });

    // assumes percent release for each interval is 10% and number of intervals is 10
    const expectVestedPercents = [
      [
        {
          secondsIn: new BN("624854"),
        }, // near start of interval
        {
          secondsIn: new BN("1369441"),
        }, // near mid of interval
        {
          secondsIn: new BN("1974048"),
        }, // near end of interval
      ], // interval 0
      [
        {
          secondsIn: new BN("13666"),
        }, // near start of interval
        {
          secondsIn: new BN("1051363"),
        }, // near mid of interval
        {
          secondsIn: new BN("2054238"),
        }, // near end of interval
      ], // interval 1
      [
        {
          secondsIn: new BN("41124"),
        }, // near start of interval
        {
          secondsIn: new BN("931169"),
        }, // near mid of interval
        {
          secondsIn: new BN("2012335"),
        }, // near end of interval
      ], // interval 2
      [
        {
          secondsIn: new BN("834722"),
        }, // near start of interval
        {
          secondsIn: new BN("1463789"),
        }, // near mid of interval
        {
          secondsIn: new BN("2016789"),
        }, // near end of interval
      ], // interval 3
      [
        {
          secondsIn: new BN("615576"),
        }, // near start of interval
        {
          secondsIn: new BN("1505339"),
        }, // near mid of interval
        {
          secondsIn: new BN("1848635"),
        }, // near end of interval
      ], // interval 4
      [
        {
          secondsIn: new BN("542857"),
        }, // near start of interval
        {
          secondsIn: new BN("1556894"),
        }, // near mid of interval
        {
          secondsIn: new BN("2470014"),
        }, // near end of interval
      ], // interval 5
      [
        {
          secondsIn: new BN("430065"),
        }, // near start of interval
        {
          secondsIn: new BN("1193235"),
        }, // near mid of interval
        {
          secondsIn: new BN("2552506"),
        }, // near end of interval
      ], // interval 6
      [
        {
          secondsIn: new BN("600258"),
        }, // near start of interval
        {
          secondsIn: new BN("1379946"),
        }, // near mid of interval
        {
          secondsIn: new BN("2205321"),
        }, // near end of interval
      ], // interval 7
      [
        {
          secondsIn: new BN("286710"),
        }, // near start of interval
        {
          secondsIn: new BN("1135661"),
        }, // near mid of interval
        {
          secondsIn: new BN("1736282"),
        }, // near end of interval
      ], // interval 8
      [
        {
          secondsIn: new BN("243042"),
        }, // near start of interval
        {
          secondsIn: new BN("1419211"),
        }, // near mid of interval
        {
          secondsIn: new BN("2547357"),
        }, // near end of interval
      ], // interval 9
    ];

    await testVestedAmountForEachInterval(
      releaseAtStartAndLinearlyEveryMonthVesting,
      beneficiary,
      expectGrantAmount,
      expectVestedPercents,
      (blockTimestamp, startIntervalTimestamp, eachIntervalPercentRelease, intervalSecs) => {
        return blockTimestamp.sub(startIntervalTimestamp).mul(eachIntervalPercentRelease).div(intervalSecs);
      }
    );
  });

  it("should return correct vested amount for each interval with 50% release on start and 50% after one month", async () => {
    const beneficiary = accounts[5];
    const expectGrantAmount = ether("412806.985178859091285000");

    const cliffDurationDays = BN_ZERO;
    const percentReleaseAtScheduleStart = ether("50");
    const percentReleaseForEachInterval = ether("50");
    const intervalDays = new BN("30");
    const gapDays = BN_ZERO;
    const numberOfIntervals = new BN("1");
    const releaseMethod = new BN("0"); // IntervalEnd

    const releaseAtStartAndLinearlyEveryMonthVesting = await testHelpers.newVesting(
      ejsToken.address,
      cliffDurationDays,
      percentReleaseAtScheduleStart,
      percentReleaseForEachInterval,
      intervalDays,
      gapDays,
      numberOfIntervals,
      releaseMethod
    );
    await ejsToken.mint(releaseAtStartAndLinearlyEveryMonthVesting.address, ether("1000000"), {
      from: defaultGovernanceAccount,
    });
    await releaseAtStartAndLinearlyEveryMonthVesting.setVestingAdmin(defaultVestingAdmin, {
      from: defaultGovernanceAccount,
    });

    // assumes percent release for each interval is 10% and number of intervals is 10
    const expectVestedPercents = [
      [
        {
          secondsIn: new BN("786335"),
        }, // near start of interval
        {
          secondsIn: new BN("1681702"),
        }, // near mid of interval
        {
          secondsIn: new BN("1788013"),
        }, // near end of interval
      ], // interval 0
    ];

    await testVestedAmountForEachInterval(
      releaseAtStartAndLinearlyEveryMonthVesting,
      beneficiary,
      expectGrantAmount,
      expectVestedPercents,
      (blockTimestamp, startIntervalTimestamp, eachIntervalPercentRelease, intervalSecs) => {
        return BN_ZERO;
      }
    );
  });

  it("should return correct vested amount for each interval with six months cliff and 20% linear release over 1 month every 3 months", async () => {
    const beneficiary = accounts[5];
    const expectGrantAmount = ether("107603.639895431633702000");

    const cliffDurationDays = new BN("180");
    const percentReleaseAtScheduleStart = BN_ZERO;
    const percentReleaseForEachInterval = ether("20");
    const intervalDays = new BN("30");
    const gapDays = new BN("60");
    const numberOfIntervals = new BN("5");
    const releaseMethod = new BN("1"); // LinearlyPerSecond

    const sixMonthsCliffAndLinearlyOverMonthWithThreeMonthsGapVesting = await testHelpers.newVesting(
      ejsToken.address,
      cliffDurationDays,
      percentReleaseAtScheduleStart,
      percentReleaseForEachInterval,
      intervalDays,
      gapDays,
      numberOfIntervals,
      releaseMethod
    );
    await ejsToken.mint(sixMonthsCliffAndLinearlyOverMonthWithThreeMonthsGapVesting.address, ether("1000000"), {
      from: defaultGovernanceAccount,
    });
    await sixMonthsCliffAndLinearlyOverMonthWithThreeMonthsGapVesting.setVestingAdmin(defaultVestingAdmin, {
      from: defaultGovernanceAccount,
    });

    // assumes percent release for each interval is 20% and number of intervals is 5
    const expectVestedPercents = [
      [
        {
          secondsIn: new BN("254720"),
        }, // near start of interval
        {
          secondsIn: new BN("1502149"),
        }, // near mid of interval
        {
          secondsIn: new BN("1902200"),
        }, // near end of interval
        {
          secondsIn: new BN("3529475"),
        }, // near start of gap
        {
          secondsIn: new BN("4972615"),
        }, // near mid of gap
        {
          secondsIn: new BN("6796985"),
        }, // near end of gap
      ], // interval 0
      [
        {
          secondsIn: new BN("473402"),
        }, // near start of interval
        {
          secondsIn: new BN("1324537"),
        }, // near mid of interval
        {
          secondsIn: new BN("2223826"),
        }, // near end of interval
        {
          secondsIn: new BN("3609928"),
        }, // near start of gap
        {
          secondsIn: new BN("5932961"),
        }, // near mid of gap
        {
          secondsIn: new BN("7572620"),
        }, // near end of gap
      ], // interval 1
      [
        {
          secondsIn: new BN("818553"),
        }, // near start of interval
        {
          secondsIn: new BN("1663245"),
        }, // near mid of interval
        {
          secondsIn: new BN("2552210"),
        }, // near end of interval
        {
          secondsIn: new BN("4295644"),
        }, // near start of gap
        {
          secondsIn: new BN("4700008"),
        }, // near mid of gap
        {
          secondsIn: new BN("6295829"),
        }, // near end of gap
      ], // interval 2
      [
        {
          secondsIn: new BN("701723"),
        }, // near start of interval
        {
          secondsIn: new BN("1670513"),
        }, // near mid of interval
        {
          secondsIn: new BN("2433007"),
        }, // near end of interval
        {
          secondsIn: new BN("3916447"),
        }, // near start of gap
        {
          secondsIn: new BN("4798468"),
        }, // near mid of gap
        {
          secondsIn: new BN("6940973"),
        }, // near end of gap
      ], // interval 3
      [
        {
          secondsIn: new BN("78280"),
        }, // near start of interval
        {
          secondsIn: new BN("1099319"),
        }, // near mid of interval
        {
          secondsIn: new BN("2258814"),
        }, // near end of interval
        {
          secondsIn: new BN("3710275"),
        }, // near start of gap
        {
          secondsIn: new BN("4707817"),
        }, // near mid of gap
        {
          secondsIn: new BN("7732542"),
        }, // near end of gap
      ], // interval 4
    ];

    await testVestedAmountForEachInterval(
      sixMonthsCliffAndLinearlyOverMonthWithThreeMonthsGapVesting,
      beneficiary,
      expectGrantAmount,
      expectVestedPercents,
      (blockTimestamp, startIntervalTimestamp, eachIntervalPercentRelease, intervalSecs) => {
        const secondsIn = blockTimestamp.sub(startIntervalTimestamp);
        return secondsIn.gte(intervalSecs)
          ? eachIntervalPercentRelease
          : secondsIn.mul(eachIntervalPercentRelease).div(intervalSecs);
      }
    );
  });

  it("should return correct vested amount for each interval with 10% linear release over 1 month every 3 months", async () => {
    const beneficiary = accounts[5];
    const expectGrantAmount = ether("955862.15357568937725600");

    const cliffDurationDays = BN_ZERO;
    const percentReleaseAtScheduleStart = BN_ZERO;
    const percentReleaseForEachInterval = ether("10");
    const intervalDays = new BN("30");
    const gapDays = new BN("60");
    const numberOfIntervals = new BN("10");
    const releaseMethod = new BN("1"); // LinearlyPerSecond

    const linearlyOverMonthWithThreeMonthsGapVesting = await testHelpers.newVesting(
      ejsToken.address,
      cliffDurationDays,
      percentReleaseAtScheduleStart,
      percentReleaseForEachInterval,
      intervalDays,
      gapDays,
      numberOfIntervals,
      releaseMethod
    );
    await ejsToken.mint(linearlyOverMonthWithThreeMonthsGapVesting.address, ether("1000000"), {
      from: defaultGovernanceAccount,
    });
    await linearlyOverMonthWithThreeMonthsGapVesting.setVestingAdmin(defaultVestingAdmin, {
      from: defaultGovernanceAccount,
    });

    // assumes percent release for each interval is 20% and number of intervals is 5
    const expectVestedPercents = [
      [
        {
          secondsIn: new BN("454379"),
        }, // near start of interval
        {
          secondsIn: new BN("1062110"),
        }, // near mid of interval
        {
          secondsIn: new BN("2149043"),
        }, // near end of interval
        {
          secondsIn: new BN("4158836"),
        }, // near start of gap
        {
          secondsIn: new BN("5771308"),
        }, // near mid of gap
        {
          secondsIn: new BN("6425600"),
        }, // near end of gap
      ], // interval 0
      [
        {
          secondsIn: new BN("795857"),
        }, // near start of interval
        {
          secondsIn: new BN("973354"),
        }, // near mid of interval
        {
          secondsIn: new BN("2465287"),
        }, // near end of interval
        {
          secondsIn: new BN("4173136"),
        }, // near start of gap
        {
          secondsIn: new BN("4865754"),
        }, // near mid of gap
        {
          secondsIn: new BN("6339957"),
        }, // near end of gap
      ], // interval 1
      [
        {
          secondsIn: new BN("302796"),
        }, // near start of interval
        {
          secondsIn: new BN("1693468"),
        }, // near mid of interval
        {
          secondsIn: new BN("2235294"),
        }, // near end of interval
        {
          secondsIn: new BN("3578361"),
        }, // near start of gap
        {
          secondsIn: new BN("5919160"),
        }, // near mid of gap
        {
          secondsIn: new BN("7651987"),
        }, // near end of gap
      ], // interval 2
      [
        {
          secondsIn: new BN("674668"),
        }, // near start of interval
        {
          secondsIn: new BN("1678002"),
        }, // near mid of interval
        {
          secondsIn: new BN("2339723"),
        }, // near end of interval
        {
          secondsIn: new BN("4274699"),
        }, // near start of gap
        {
          secondsIn: new BN("4584033"),
        }, // near mid of gap
        {
          secondsIn: new BN("6979043"),
        }, // near end of gap
      ], // interval 3
      [
        {
          secondsIn: new BN("313113"),
        }, // near start of interval
        {
          secondsIn: new BN("1008276"),
        }, // near mid of interval
        {
          secondsIn: new BN("2240152"),
        }, // near end of interval
        {
          secondsIn: new BN("4105637"),
        }, // near start of gap
        {
          secondsIn: new BN("5496897"),
        }, // near mid of gap
        {
          secondsIn: new BN("6851823"),
        }, // near end of gap
      ], // interval 4
      [
        {
          secondsIn: new BN("670511"),
        }, // near start of interval
        {
          secondsIn: new BN("1616571"),
        }, // near mid of interval
        {
          secondsIn: new BN("1947224"),
        }, // near end of interval
        {
          secondsIn: new BN("2648296"),
        }, // near start of gap
        {
          secondsIn: new BN("5340949"),
        }, // near mid of gap
        {
          secondsIn: new BN("7031720"),
        }, // near end of gap
      ], // interval 5
      [
        {
          secondsIn: new BN("225309"),
        }, // near start of interval
        {
          secondsIn: new BN("1210021"),
        }, // near mid of interval
        {
          secondsIn: new BN("1961498"),
        }, // near end of interval
        {
          secondsIn: new BN("3376433"),
        }, // near start of gap
        {
          secondsIn: new BN("4338237"),
        }, // near mid of gap
        {
          secondsIn: new BN("6698522"),
        }, // near end of gap
      ], // interval 6
      [
        {
          secondsIn: new BN("334006"),
        }, // near start of interval
        {
          secondsIn: new BN("877635"),
        }, // near mid of interval
        {
          secondsIn: new BN("2001955"),
        }, // near end of interval
        {
          secondsIn: new BN("3590635"),
        }, // near start of gap
        {
          secondsIn: new BN("5004012"),
        }, // near mid of gap
        {
          secondsIn: new BN("7138003"),
        }, // near end of gap
      ], // interval 7
      [
        {
          secondsIn: new BN("100784"),
        }, // near start of interval
        {
          secondsIn: new BN("925497"),
        }, // near mid of interval
        {
          secondsIn: new BN("1784382"),
        }, // near end of interval
        {
          secondsIn: new BN("3790959"),
        }, // near start of gap
        {
          secondsIn: new BN("5889810"),
        }, // near mid of gap
        {
          secondsIn: new BN("6486156"),
        }, // near end of gap
      ], // interval 8
      [
        {
          secondsIn: new BN("152807"),
        }, // near start of interval
        {
          secondsIn: new BN("1185251"),
        }, // near mid of interval
        {
          secondsIn: new BN("2139780"),
        }, // near end of interval
        {
          secondsIn: new BN("2923099"),
        }, // near start of gap
        {
          secondsIn: new BN("4516071"),
        }, // near mid of gap
        {
          secondsIn: new BN("6236149"),
        }, // near end of gap
      ], // interval 9
    ];

    await testVestedAmountForEachInterval(
      linearlyOverMonthWithThreeMonthsGapVesting,
      beneficiary,
      expectGrantAmount,
      expectVestedPercents,
      (blockTimestamp, startIntervalTimestamp, eachIntervalPercentRelease, intervalSecs) => {
        const secondsIn = blockTimestamp.sub(startIntervalTimestamp);
        return secondsIn.gte(intervalSecs)
          ? eachIntervalPercentRelease
          : secondsIn.mul(eachIntervalPercentRelease).div(intervalSecs);
      }
    );
  });

  it("should not allow get vesting grant for zero account", async () => {
    await expectRevert(vesting.vestingGrantFor(ZERO_ADDRESS), "Vesting: zero account");
  });

  it("should not allow get revoked for zero account", async () => {
    await expectRevert(vesting.revoked(ZERO_ADDRESS), "Vesting: zero account");
  });

  it("should not allow get released amount for zero account", async () => {
    await expectRevert(vesting.releasedAmountFor(ZERO_ADDRESS), "Vesting: zero account");
  });

  it("should not allow get releasable amount for zero account", async () => {
    await expectRevert(vesting.releasableAmountFor(ZERO_ADDRESS), "Vesting: zero account");
  });

  it("should not allow get releasable amount for undefined schedule start time", async () => {
    const beneficiary = accounts[5];

    await expectRevert(vesting.releasableAmountFor(beneficiary), "Vesting: undefined start time");
  });

  it("should not allow get releasable amount for before schedule start", async () => {
    const beneficiary = accounts[5];

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    await expectRevert(vesting.releasableAmountFor(beneficiary), "Vesting: not started");
  });

  it("should not allow get releasable amount for revoked grant", async () => {
    const beneficiary = accounts[5];

    const expectedGrantAmount = ether("839796.463179758290329000");
    await vesting.addVestingGrant(beneficiary, expectedGrantAmount, true, { from: defaultVestingAdmin });

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    // advance to just after schedule start
    await time.increaseTo(expectScheduleStartTimestamp.add(time.duration.seconds(1)));

    await vesting.revokeVestingGrant(beneficiary, { from: defaultVestingAdmin });
    await expectRevert(vesting.releasableAmountFor(beneficiary), "Vesting: revoked");
  });

  it("should not allow get releasable amount for inactive grant", async () => {
    const beneficiary = accounts[5];

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    // advance to just after schedule start
    await time.increaseTo(expectScheduleStartTimestamp.add(time.duration.seconds(1)));

    await expectRevert(vesting.releasableAmountFor(beneficiary), "Vesting: inactive");
  });

  it("should not allow get vested amount for zero account", async () => {
    await expectRevert(vesting.vestedAmountFor(ZERO_ADDRESS), "Vesting: zero account");
  });

  it("should not allow get vested amount for inactive grant", async () => {
    const beneficiary = accounts[5];

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    // advance to just after schedule start
    await time.increaseTo(expectScheduleStartTimestamp.add(time.duration.seconds(1)));

    await expectRevert(vesting.vestedAmountFor(beneficiary), "Vesting: inactive");
  });

  it("should not allow get unvested amount for zero account", async () => {
    await expectRevert(vesting.unvestedAmountFor(ZERO_ADDRESS), "Vesting: zero account");
  });

  it("should not allow get unvested amount for inactive grant", async () => {
    const beneficiary = accounts[5];

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    // advance to just after schedule start
    await time.increaseTo(expectScheduleStartTimestamp.add(time.duration.seconds(1)));

    await expectRevert(vesting.unvestedAmountFor(beneficiary), "Vesting: inactive");
  });

  it("should not allow release for undefined schedule start time", async () => {
    const beneficiary = accounts[5];

    await expectRevert(vesting.release({ from: beneficiary }), "Vesting: undefined start time");
  });

  it("should not allow release for before schedule start", async () => {
    const beneficiary = accounts[5];

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    await expectRevert(vesting.release({ from: beneficiary }), "Vesting: not started");
  });

  it("should not allow release for revoked grant", async () => {
    const beneficiary = accounts[5];

    const expectedGrantAmount = ether("808159.507452528583682000");
    await vesting.addVestingGrant(beneficiary, expectedGrantAmount, true, { from: defaultVestingAdmin });

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    // advance to just after schedule start
    await time.increaseTo(expectScheduleStartTimestamp.add(time.duration.seconds(1)));

    await vesting.revokeVestingGrant(beneficiary, { from: defaultVestingAdmin });
    await expectRevert(vesting.release({ from: beneficiary }), "Vesting: revoked");
  });

  it("should not allow release for inactive grant", async () => {
    const beneficiary = accounts[5];

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    // advance to just after schedule start
    await time.increaseTo(expectScheduleStartTimestamp.add(time.duration.seconds(1)));

    await expectRevert(vesting.release({ from: beneficiary }), "Vesting: inactive");
  });

  it("should not allow release before cliff", async () => {
    const beneficiary = accounts[5];

    const expectedGrantAmount = ether("29280.238321524364729000");
    await vesting.addVestingGrant(beneficiary, expectedGrantAmount, false, { from: defaultVestingAdmin });

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    const vestingSchedule = await vesting.getVestingSchedule();

    // advance to just before cliff
    const cliffEndTimestamp = expectScheduleStartTimestamp.add(
      vestingSchedule.cliffDurationDays.mul(BN_SECONDS_IN_DAY)
    );
    await time.increaseTo(cliffEndTimestamp.sub(time.duration.seconds(10)));

    await expectRevert(vesting.release({ from: beneficiary }), "Vesting: zero amount");
  });

  it("should allow governance account to transfer unused tokens", async () => {
    const expectTransferAmount = defaultGovernanceMintAmount;

    const balanceOfVestingContractBeforeTransfer = await ejsToken.balanceOf(vesting.address);
    const balanceOfGovernanceAccountBeforeTransfer = await ejsToken.balanceOf(defaultGovernanceAccount);

    const transferUnusedTokens = await vesting.transferUnusedTokens({ from: defaultGovernanceAccount });

    await expectEvent.inTransaction(transferUnusedTokens.tx, ejsToken, "Transfer", {
      from: vesting.address,
      to: defaultGovernanceAccount,
      value: expectTransferAmount,
    });

    const balanceOfVestingContractAfterTransfer = await ejsToken.balanceOf(vesting.address);
    const balanceOfGovernanceAccountAfterTransfer = await ejsToken.balanceOf(defaultGovernanceAccount);

    const vestingContractDeductedAmount = balanceOfVestingContractBeforeTransfer.sub(
      balanceOfVestingContractAfterTransfer
    );
    const governanceAccountReceiveAmount = balanceOfGovernanceAccountAfterTransfer.sub(
      balanceOfGovernanceAccountBeforeTransfer
    );

    assert.ok(
      vestingContractDeductedAmount.eq(expectTransferAmount),
      `Vesting contract deducted amount is ${vestingContractDeductedAmount} instead of ${expectTransferAmount}`
    );

    assert.ok(
      governanceAccountReceiveAmount.eq(expectTransferAmount),
      `Governance account received amount is ${governanceAccountReceiveAmount} instead of ${expectTransferAmount}`
    );
  });

  it("should allow governance account to transfer unused tokens with some tokens already released", async () => {
    const beneficiary = accounts[5];

    const expectedGrantAmount = ether("558172.956967211364830000");
    await vesting.addVestingGrant(beneficiary, expectedGrantAmount, true, { from: defaultVestingAdmin });

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    // advance to after first interval end
    const vestingSchedule = await vesting.getVestingSchedule();
    const firstIntervalEndTimestamp = expectScheduleStartTimestamp.add(
      vestingSchedule.cliffDurationDays.add(vestingSchedule.intervalDays).mul(BN_SECONDS_IN_DAY)
    );
    await time.increaseTo(firstIntervalEndTimestamp.add(time.duration.seconds(10)));

    const release = await vesting.release({ from: beneficiary });

    await time.increase(time.duration.minutes(60));

    const totalReleasedAmount = await vesting.totalReleasedAmount();

    const expectReleaseAmount = release.receipt.logs[0].args.amount;
    const expectTotalReleasedAmount = expectReleaseAmount;
    const expectTransferAmount = defaultGovernanceMintAmount.sub(expectedGrantAmount);

    const balanceOfVestingContractBeforeTransfer = await ejsToken.balanceOf(vesting.address);
    const balanceOfGovernanceAccountBeforeTransfer = await ejsToken.balanceOf(defaultGovernanceAccount);

    const transferUnusedTokens = await vesting.transferUnusedTokens({ from: defaultGovernanceAccount });

    await expectEvent.inTransaction(transferUnusedTokens.tx, ejsToken, "Transfer", {
      from: vesting.address,
      to: defaultGovernanceAccount,
      value: expectTransferAmount,
    });

    const balanceOfVestingContractAfterTransfer = await ejsToken.balanceOf(vesting.address);
    const balanceOfGovernanceAccountAfterTransfer = await ejsToken.balanceOf(defaultGovernanceAccount);

    const vestingContractDeductedAmount = balanceOfVestingContractBeforeTransfer.sub(
      balanceOfVestingContractAfterTransfer
    );
    const governanceAccountReceiveAmount = balanceOfGovernanceAccountAfterTransfer.sub(
      balanceOfGovernanceAccountBeforeTransfer
    );

    assert.ok(
      totalReleasedAmount.eq(expectTotalReleasedAmount),
      `Total released amount is ${totalReleasedAmount} instead of ${expectTotalReleasedAmount}`
    );

    assert.ok(
      vestingContractDeductedAmount.eq(expectTransferAmount),
      `Vesting contract deducted amount is ${vestingContractDeductedAmount} instead of ${expectTransferAmount}`
    );

    assert.ok(
      governanceAccountReceiveAmount.eq(expectTransferAmount),
      `Governance account received amount is ${governanceAccountReceiveAmount} instead of ${expectTransferAmount}`
    );
  });

  it("should allow governance account to transfer unused tokens with one grant revoked and some tokens already released", async () => {
    const beneficiary = accounts[5];

    const expectedGrantAmount = ether("444699.758591481534168000");
    await vesting.addVestingGrant(beneficiary, expectedGrantAmount, true, { from: defaultVestingAdmin });

    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vesting.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });

    // advance to after first interval end
    const vestingSchedule = await vesting.getVestingSchedule();
    const firstIntervalEndTimestamp = expectScheduleStartTimestamp.add(
      vestingSchedule.cliffDurationDays.add(vestingSchedule.intervalDays).mul(BN_SECONDS_IN_DAY)
    );
    await time.increaseTo(firstIntervalEndTimestamp.add(time.duration.seconds(10)));

    const release = await vesting.release({ from: beneficiary });

    await time.increase(time.duration.minutes(60));

    const totalReleasedAmount = await vesting.totalReleasedAmount();

    const expectReleaseAmount = release.receipt.logs[0].args.amount;
    const expectTotalReleasedAmount = expectReleaseAmount;
    const expectRemainderAmountAfterRevoke = expectedGrantAmount.sub(expectReleaseAmount);

    const revokeVestingGrant = await vesting.revokeVestingGrant(beneficiary, { from: defaultVestingAdmin });

    expectEvent(revokeVestingGrant, "VestingGrantRevoked", {
      account: beneficiary,
      remainderAmount: expectRemainderAmountAfterRevoke,
      grantAmount: expectedGrantAmount,
      releasedAmount: expectReleaseAmount,
    });

    const expectTransferAmount = defaultGovernanceMintAmount
      .add(expectRemainderAmountAfterRevoke)
      .sub(expectedGrantAmount);

    const balanceOfVestingContractBeforeTransfer = await ejsToken.balanceOf(vesting.address);
    const balanceOfGovernanceAccountBeforeTransfer = await ejsToken.balanceOf(defaultGovernanceAccount);

    const transferUnusedTokens = await vesting.transferUnusedTokens({ from: defaultGovernanceAccount });

    await expectEvent.inTransaction(transferUnusedTokens.tx, ejsToken, "Transfer", {
      from: vesting.address,
      to: defaultGovernanceAccount,
      value: expectTransferAmount,
    });

    const balanceOfVestingContractAfterTransfer = await ejsToken.balanceOf(vesting.address);
    const balanceOfGovernanceAccountAfterTransfer = await ejsToken.balanceOf(defaultGovernanceAccount);

    assert.ok(
      totalReleasedAmount.eq(expectTotalReleasedAmount),
      `Total released amount is ${totalReleasedAmount} instead of ${expectTotalReleasedAmount}`
    );

    const vestingContractDeductedAmount = balanceOfVestingContractBeforeTransfer.sub(
      balanceOfVestingContractAfterTransfer
    );
    const governanceAccountReceiveAmount = balanceOfGovernanceAccountAfterTransfer.sub(
      balanceOfGovernanceAccountBeforeTransfer
    );

    assert.ok(
      vestingContractDeductedAmount.eq(expectTransferAmount),
      `Vesting contract deducted amount is ${vestingContractDeductedAmount} instead of ${expectTransferAmount}`
    );

    assert.ok(
      governanceAccountReceiveAmount.eq(expectTransferAmount),
      `Governance account received amount is ${governanceAccountReceiveAmount} instead of ${expectTransferAmount}`
    );
  });

  it("should not allow non governance account to transfer unused tokens", async () => {
    const nonGovernanceAccount = accounts[9];

    await expectRevert(vesting.transferUnusedTokens({ from: nonGovernanceAccount }), "Vesting: sender unauthorized");

    await expectRevert(vesting.transferUnusedTokens({ from: defaultVestingAdmin }), "Vesting: sender unauthorized");
  });

  it("should not allow transfer if no unused tokens", async () => {
    const beneficiary = accounts[5];

    const expectedGrantAmount = defaultGovernanceMintAmount;
    await vesting.addVestingGrant(beneficiary, expectedGrantAmount, false, { from: defaultVestingAdmin });

    await expectRevert(
      vesting.transferUnusedTokens({ from: defaultGovernanceAccount }),
      "Vesting: nothing to transfer"
    );
  });

  it("should only allow vesting admin to add vesting grants batch", async () => {
    const nonVestingAdmin = accounts[9];
    const expectVestingAdmin = defaultVestingAdmin;

    const expectAddVestingGrantAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );
    const expectAddVestingGrantAmounts = Array.from({ length: BATCH_MAX_NUM }, (v, i) => new BN((i + 1).toString()));
    const expectAddVestingGrantIfRevocables = new Array(BATCH_MAX_NUM).fill(false);

    const expectGrantAmountBeforeAdd = BN_ZERO;
    const expectIsRevocableBeforeAdd = false;
    const expectIsRevokedBeforeAdd = false;
    const expectIsActiveBeforeAdd = false;
    const expectTotalGrantAmountBeforeAdd = BN_ZERO;
    const expectTotalReleasedAmountBeforeAdd = BN_ZERO;

    for (let i = 0; i < expectAddVestingGrantAccounts.length; i++) {
      // console.log(
      //   `${i}: beforeAddGrant: expectAddVestingGrantAccount=${expectAddVestingGrantAccounts[i]}, expectAddVestingGrantAmount=${expectAddVestingGrantAmounts[i]}`
      // );

      const vestingGrantAccountBeforeAdd = await vesting.vestingGrantFor(expectAddVestingGrantAccounts[i]);
      const totalGrantAmountBeforeAdd = await vesting.totalGrantAmount();
      const totalReleasedAmountBeforeAdd = await vesting.totalReleasedAmount();

      assert.ok(
        vestingGrantAccountBeforeAdd[0].eq(expectGrantAmountBeforeAdd),
        `${i}: Grant amount before add for ${expectAddVestingGrantAccounts[i]} is ${vestingGrantAccountBeforeAdd[0]} instead of ${expectGrantAmountBeforeAdd}`
      );

      assert.strictEqual(
        vestingGrantAccountBeforeAdd[1],
        expectIsRevocableBeforeAdd,
        `${i}: Grant is revocable before add for ${expectAddVestingGrantAccounts[i]} is ${vestingGrantAccountBeforeAdd[1]} instead of ${expectIsRevocableBeforeAdd}`
      );

      assert.strictEqual(
        vestingGrantAccountBeforeAdd[2],
        expectIsRevokedBeforeAdd,
        `${i}: Grant is revoked before add for ${expectAddVestingGrantAccounts[i]} is ${vestingGrantAccountBeforeAdd[2]} instead of ${expectIsRevokedBeforeAdd}`
      );

      assert.strictEqual(
        vestingGrantAccountBeforeAdd[3],
        expectIsActiveBeforeAdd,
        `${i}: Grant is active before add for ${expectAddVestingGrantAccounts[i]} is ${vestingGrantAccountBeforeAdd[3]} instead of ${expectIsActiveBeforeAdd}`
      );

      assert.ok(
        totalGrantAmountBeforeAdd.eq(expectTotalGrantAmountBeforeAdd),
        `${i}: Total grant amount before add is ${totalGrantAmountBeforeAdd} instead of ${expectTotalGrantAmountBeforeAdd}`
      );

      assert.ok(
        totalReleasedAmountBeforeAdd.eq(expectTotalReleasedAmountBeforeAdd),
        `${i}: Total released amount before add is ${totalReleasedAmountBeforeAdd} instead of ${expectTotalReleasedAmountBeforeAdd}`
      );
    }

    const addVestingGrantsBatch = await vesting.addVestingGrantsBatch(
      expectAddVestingGrantAccounts,
      expectAddVestingGrantAmounts,
      expectAddVestingGrantIfRevocables,
      {
        from: expectVestingAdmin,
      }
    );

    // seems like can only check max 9 events as event 9 (zero-based) seems to be matched to event 0 likely due to wraparound
    for (let i = 0; i < TEST_MAX_EVENTS; i++) {
      // console.log(`${i}: addGrantEvent: ${expectAddVestingGrantAccounts[i]}`);

      expectEvent(addVestingGrantsBatch, "VestingGrantAdded", {
        account: expectAddVestingGrantAccounts[i],
        grantAmount: expectAddVestingGrantAmounts[i],
        isRevocable: expectAddVestingGrantIfRevocables[i],
      });
    }

    const expectIsRevocableAfterAdd = false;
    const expectIsRevokedAfterAdd = false;
    const expectIsActiveAfterAdd = true;

    for (let i = 0; i < expectAddVestingGrantAccounts.length; i++) {
      // console.log(
      //   `${i}: afterAddGrant: expectAddVestingGrantAccount=${expectAddVestingGrantAccounts[i]}, expectAddVestingGrantAmount=${expectAddVestingGrantAmounts[i]}`
      // );

      const expectGrantAmountAfterAdd = expectAddVestingGrantAmounts[i];

      const vestingGrantAccountAfterAdd = await vesting.vestingGrantFor(expectAddVestingGrantAccounts[i]);

      assert.ok(
        vestingGrantAccountAfterAdd[0].eq(expectGrantAmountAfterAdd),
        `${i}: Grant amount after add for ${expectAddVestingGrantAccounts[i]} is ${vestingGrantAccountAfterAdd[0]} instead of ${expectGrantAmountAfterAdd}`
      );

      assert.strictEqual(
        vestingGrantAccountAfterAdd[1],
        expectIsRevocableAfterAdd,
        `${i}: Grant is revocable after add for ${expectAddVestingGrantAccounts[i]} is ${vestingGrantAccountAfterAdd[1]} instead of ${expectIsRevocableAfterAdd}`
      );

      assert.strictEqual(
        vestingGrantAccountAfterAdd[2],
        expectIsRevokedAfterAdd,
        `${i}: Grant is revoked after add for ${expectAddVestingGrantAccounts[i]} is ${vestingGrantAccountAfterAdd[2]} instead of ${expectIsRevokedAfterAdd}`
      );

      assert.strictEqual(
        vestingGrantAccountAfterAdd[3],
        expectIsActiveAfterAdd,
        `${i}: Grant is active after add for ${expectAddVestingGrantAccounts[i]} is ${vestingGrantAccountAfterAdd[3]} instead of ${expectIsActiveAfterAdd}`
      );
    }

    const expectTotalGrantAmountAfterAdd = expectAddVestingGrantAmounts.reduce((accumulator, currentValue) =>
      accumulator.add(currentValue)
    );
    const expectTotalReleasedAmountAfterAdd = BN_ZERO;
    const totalGrantAmountAfterAdd = await vesting.totalGrantAmount();
    const totalReleasedAmountAfterAdd = await vesting.totalReleasedAmount();

    assert.ok(
      totalGrantAmountAfterAdd.eq(expectTotalGrantAmountAfterAdd),
      `Total grant amount after add is ${totalGrantAmountAfterAdd} instead of ${expectTotalGrantAmountAfterAdd}`
    );

    assert.ok(
      totalReleasedAmountAfterAdd.eq(expectTotalReleasedAmountAfterAdd),
      `Total released amount after add is ${totalReleasedAmountAfterAdd} instead of ${expectTotalReleasedAmountAfterAdd}`
    );

    await expectRevert(
      vesting.addVestingGrantsBatch(
        expectAddVestingGrantAccounts,
        expectAddVestingGrantAmounts,
        expectAddVestingGrantIfRevocables,
        { from: nonVestingAdmin }
      ),
      "Vesting: sender unauthorized"
    );
  });

  it("should not allow add vesting grants batch with no accounts", async () => {
    await expectRevert(vesting.addVestingGrantsBatch([], [], [], { from: defaultVestingAdmin }), "Vesting: empty");
  });

  it("should not allow add vesting grants batch with more than 250 accounts", async () => {
    const expectAddVestingGrantAccounts = new Array(BATCH_MAX_NUM + 1).fill(ZERO_ADDRESS);
    const expectAddVestingGrantAmounts = new Array(BATCH_MAX_NUM + 1).fill(BN_ZERO);
    const expectAddVestingGrantIfRevocables = new Array(BATCH_MAX_NUM + 1).fill(false);

    await expectRevert(
      vesting.addVestingGrantsBatch(
        expectAddVestingGrantAccounts,
        expectAddVestingGrantAmounts,
        expectAddVestingGrantIfRevocables,
        {
          from: defaultVestingAdmin,
        }
      ),
      "Vesting: exceed max"
    );
  });

  it("should not allow add vesting grants batch with different number of accounts and grant amounts", async () => {
    const expectAddVestingGrantAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );
    const expectAddVestingGrantAmounts = Array.from({ length: BATCH_MAX_NUM + 1 }, (v, i) => i + 1);
    const expectAddVestingGrantIfRevocables = new Array(BATCH_MAX_NUM).fill(false);

    await expectRevert(
      vesting.addVestingGrantsBatch(
        expectAddVestingGrantAccounts,
        expectAddVestingGrantAmounts,
        expectAddVestingGrantIfRevocables,
        { from: defaultVestingAdmin }
      ),
      "Vesting: grant amounts length different"
    );
  });

  it("should not allow add vesting grants batch with different number of accounts and if revocables", async () => {
    const expectAddVestingGrantAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );
    const expectAddVestingGrantAmounts = Array.from({ length: BATCH_MAX_NUM }, (v, i) => i + 1);
    const expectAddVestingGrantIfRevocables = new Array(BATCH_MAX_NUM + 1).fill(false);

    await expectRevert(
      vesting.addVestingGrantsBatch(
        expectAddVestingGrantAccounts,
        expectAddVestingGrantAmounts,
        expectAddVestingGrantIfRevocables,
        { from: defaultVestingAdmin }
      ),
      "Vesting: is revocables length different"
    );
  });

  it("should not allow add vesting grants batch with zero address", async () => {
    const expectAddVestingGrantAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );
    const expectAddVestingGrantAmounts = Array.from({ length: BATCH_MAX_NUM }, (v, i) => i + 1);
    const expectAddVestingGrantIfRevocables = new Array(BATCH_MAX_NUM).fill(false);

    expectAddVestingGrantAccounts[BATCH_MAX_NUM - 1] = ZERO_ADDRESS;

    await expectRevert(
      vesting.addVestingGrantsBatch(
        expectAddVestingGrantAccounts,
        expectAddVestingGrantAmounts,
        expectAddVestingGrantIfRevocables,
        { from: defaultVestingAdmin }
      ),
      "Vesting: zero account"
    );
  });

  it("should not allow add vesting grants batch with duplicate address", async () => {
    const expectAddVestingGrantAccounts = Array.from(
      { length: BATCH_MAX_NUM },
      (v, i) => "0x" + (i + 1).toString(16).padStart(40, "0")
    );
    const expectAddVestingGrantAmounts = Array.from({ length: BATCH_MAX_NUM }, (v, i) => i + 1);
    const expectAddVestingGrantIfRevocables = new Array(BATCH_MAX_NUM).fill(false);

    expectAddVestingGrantAccounts[BATCH_MAX_NUM - 1] = expectAddVestingGrantAccounts[BATCH_MAX_NUM - 2];

    await expectRevert(
      vesting.addVestingGrantsBatch(
        expectAddVestingGrantAccounts,
        expectAddVestingGrantAmounts,
        expectAddVestingGrantIfRevocables,
        { from: defaultVestingAdmin }
      ),
      "Vesting: already added"
    );
  });

  async function testVestedAmountForEachInterval(
    vestingContract,
    beneficiary,
    expectGrantAmount,
    expectVestedPercents,
    calculateExpectVestedPercentCallback
  ) {
    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
    const expectScheduleStartTimestamp = currentBlockTimestamp.add(BN_SECONDS_IN_HOUR);

    await vestingContract.setScheduleStartTimestamp(expectScheduleStartTimestamp, { from: defaultVestingAdmin });
    await vestingContract.addVestingGrant(beneficiary, expectGrantAmount, false, { from: defaultVestingAdmin });

    const vestingSchedule = await vestingContract.getVestingSchedule();

    // advance to end of cliff
    const cliffEndTimestamp = expectScheduleStartTimestamp.add(
      vestingSchedule.cliffDurationDays.mul(BN_SECONDS_IN_DAY)
    );
    await time.increaseTo(cliffEndTimestamp);

    const intervalSeconds = vestingSchedule.intervalDays.mul(BN_SECONDS_IN_DAY);
    const gapSeconds = vestingSchedule.gapDays.mul(BN_SECONDS_IN_DAY);
    let currentIntervalStartPercent = vestingSchedule.percentReleaseAtScheduleStart;

    for (let i = 0; i < expectVestedPercents.length; i++) {
      const expectVestedPercentsForInterval = expectVestedPercents[i];
      const intervalStartTimestamp = cliffEndTimestamp.add(intervalSeconds.add(gapSeconds).mul(new BN(i.toString())));

      for (let j = 0; j < expectVestedPercentsForInterval.length; j++) {
        // console.log(
        //   `${i}, ${j}: currentIntervalStartPercent=${currentIntervalStartPercent}, intervalStartTimestamp=${intervalStartTimestamp}`
        // );

        const expectVestedPercentForInterval = expectVestedPercentsForInterval[j];
        await time.increaseTo(intervalStartTimestamp.add(expectVestedPercentForInterval.secondsIn));

        const currentBlockNumber = await web3.eth.getBlockNumber();
        const currentBlockTimestamp = await testHelpers.getBlockTimestamp(currentBlockNumber);
        const intervalNumber = currentBlockTimestamp.sub(cliffEndTimestamp).div(intervalSeconds.add(gapSeconds));
        const totalPercentage = vestingSchedule.percentReleaseForEachInterval.mul(intervalNumber);
        // console.log(
        //   `${i}, ${j}: currentBlockTimestamp=${currentBlockTimestamp}, cliffEndTimestamp=${cliffEndTimestamp}, intervalSeconds=${intervalSeconds}, gapSeconds=${gapSeconds}, intervalNumber=${intervalNumber}, totalPercentage=${totalPercentage}`
        // );

        const expectVestedPercent = calculateExpectVestedPercentCallback(
          currentBlockTimestamp,
          intervalStartTimestamp,
          vestingSchedule.percentReleaseForEachInterval,
          intervalSeconds
        );
        const expectVestedAmount = expectVestedPercent
          .add(currentIntervalStartPercent)
          .mul(expectGrantAmount)
          .div(BN_PERCENT_100_WEI);
        const expectUnvestedAmount = expectGrantAmount.sub(expectVestedAmount);
        const expectReleasedAmount = BN_ZERO;
        const expectReleasableAmount = expectVestedAmount;
        // console.log(
        //   `${i}, ${j}: expectVestedPercent=${expectVestedPercent}, expectVestedAmount=${expectVestedAmount}, expectUnvestedAmount=${expectUnvestedAmount}`
        // );

        const vestedAmount = await vestingContract.vestedAmountFor(beneficiary);
        const unvestedAmount = await vestingContract.unvestedAmountFor(beneficiary);
        const releasedAmount = await vestingContract.releasedAmountFor(beneficiary);
        const releasableAmount = await vestingContract.releasableAmountFor(beneficiary);

        // console.log(`${i}, ${j}: vestedAmount=${vestedAmount}, expectVestedAmount=${expectVestedAmount}`);

        assert.ok(
          vestedAmount.eq(expectVestedAmount),
          `${i}, ${j}: Vested amount is ${vestedAmount} instead of ${expectVestedAmount}`
        );

        assert.ok(
          unvestedAmount.eq(expectUnvestedAmount),
          `${i}, ${j}: Unvested amount is ${unvestedAmount} instead of ${expectUnvestedAmount}`
        );

        assert.ok(
          releasedAmount.eq(expectReleasedAmount),
          `${i}, ${j}: Released amount is ${releasedAmount} instead of ${expectReleasedAmount}`
        );

        assert.ok(
          releasableAmount.eq(expectReleasableAmount),
          `${i}, ${j}: Releasable amount is ${releasableAmount} instead of ${expectReleasableAmount}`
        );
      }

      currentIntervalStartPercent = currentIntervalStartPercent.add(vestingSchedule.percentReleaseForEachInterval);
    }

    // advance to after end of all intervals and gaps
    const intervalEndTimestamp = cliffEndTimestamp
      .add(intervalSeconds.add(gapSeconds).mul(vestingSchedule.numberOfIntervals))
      .add(BN_ONE);
    await time.increaseTo(intervalEndTimestamp);

    const expectVestedAmountAfterEnd = expectGrantAmount;
    const expectUnvestedAmountAfterEnd = BN_ZERO;
    const expectReleasedAmountAfterEnd = BN_ZERO;
    const expectReleasableAmountAfterEnd = expectGrantAmount;
    const expectTokensReleasedEventAccount = beneficiary;
    const expectTokensReleasedEventAmount = expectVestedAmountAfterEnd;

    const vestedAmountAfterEnd = await vestingContract.vestedAmountFor(beneficiary);
    const unvestedAmountAfterEnd = await vestingContract.unvestedAmountFor(beneficiary);
    const releasedAmountAfterEnd = await vestingContract.releasedAmountFor(beneficiary);
    const releasableAmountAfterEnd = await vestingContract.releasableAmountFor(beneficiary);
    const balanceOfBeneficiaryBeforeRelease = await ejsToken.balanceOf(beneficiary);
    const releaseAfterEnd = await vestingContract.release({ from: beneficiary });
    const balanceOfBeneficiaryAfterRelease = await ejsToken.balanceOf(beneficiary);
    const tokensReceivedAfterRelease = balanceOfBeneficiaryAfterRelease.sub(balanceOfBeneficiaryBeforeRelease);

    expectEvent(releaseAfterEnd, "TokensReleased", {
      account: expectTokensReleasedEventAccount,
      amount: expectTokensReleasedEventAmount,
    });

    assert.ok(
      tokensReceivedAfterRelease.eq(expectTokensReleasedEventAmount),
      `Tokens received after end of all intervals is ${tokensReceivedAfterRelease} instead of ${expectTokensReleasedEventAmount}`
    );

    assert.ok(
      vestedAmountAfterEnd.eq(expectVestedAmountAfterEnd),
      `Vested amount after end of all intervals is ${vestedAmountAfterEnd} instead of ${expectVestedAmountAfterEnd}`
    );

    assert.ok(
      unvestedAmountAfterEnd.eq(expectUnvestedAmountAfterEnd),
      `Unvested amount after end of all intervals is ${unvestedAmountAfterEnd} instead of ${expectUnvestedAmountAfterEnd}`
    );

    assert.ok(
      releasedAmountAfterEnd.eq(expectReleasedAmountAfterEnd),
      `Released amount after end of all intervals is ${releasedAmountAfterEnd} instead of ${expectReleasedAmountAfterEnd}`
    );

    assert.ok(
      releasableAmountAfterEnd.eq(expectReleasableAmountAfterEnd),
      `Releasable amount after end of all intervals is ${releasableAmountAfterEnd} instead of ${expectReleasableAmountAfterEnd}`
    );

    await expectRevert(vestingContract.release({ from: beneficiary }), "Vesting: zero amount");
  }
});
