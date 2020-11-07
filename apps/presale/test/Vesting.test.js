const { VESTING_CLIFF_PERIOD, VESTING_COMPLETE_PERIOD } = require('@1hive/apps-marketplace-shared-test-helpers/constants')
const { prepareDefaultSetup, defaultDeployParams, initializePresale } = require('./common/deploy')
const { contributionToProjectTokens, now } = require('./common/utils')
const { assertBn } = require('@aragon/contract-helpers-test/src/asserts')
const { bn } = require('@aragon/contract-helpers-test/src/numbers')

const BUYER_BALANCE = 20000

contract('Presale, vesting functionality', ([anyone, appManager, buyer]) => {
  const itVestsTokensCorrectly = startDate => {
    describe('When a purchase produces vested tokens', () => {
      let vestedAmount, vestingStartDate, vestingCliffDate, vestingCompleteDate, vestingRevokable

      before(async () => {
        await prepareDefaultSetup(this, appManager)
        const _now = now()
        await initializePresale(this, { ...defaultDeployParams(this, appManager), startDate })

        await this.contributionToken.generateTokens(buyer, BUYER_BALANCE)
        await this.contributionToken.approve(this.presale.address, BUYER_BALANCE, { from: buyer })

        if (startDate == 0) {
          startDate = _now
          await this.presale.open({ from: appManager })
        }
        this.presale.mockSetTimestamp(startDate + 1)

        await this.presale.contribute(buyer, BUYER_BALANCE, { from: buyer })

        const vestingData = await this.tokenManager.getVesting(buyer, 0)
        vestedAmount = vestingData[0]
        vestingStartDate = vestingData[1]
        vestingCliffDate = vestingData[2]
        vestingCompleteDate = vestingData[3]
        vestingRevokable = vestingData[4]
      })

      it('Token manager registers the correct vested amount', async () => {
        const expectedAmount = contributionToProjectTokens(bn(BUYER_BALANCE))
        assertBn(vestedAmount, expectedAmount)
      })

      it('Token manager registers the correct vesting start date', async () => {
        assert.equal(vestingStartDate.toNumber(), startDate)
      })

      it('Token manager registers the correct vesting cliff date', async () => {
        const cliffDate = startDate + VESTING_CLIFF_PERIOD
        assert.equal(vestingCliffDate.toNumber(), cliffDate)
      })

      it('Token manager registers the correct vesting complete date', async () => {
        const completeDate = startDate + VESTING_COMPLETE_PERIOD
        assert.equal(vestingCompleteDate.toNumber(), completeDate)
      })

      it('Token manager registers the vestings as revokable', async () => {
        assert.isTrue(vestingRevokable)
      })
    })
  }

  describe('When no startDate is specified upon initialization', () => {
    itVestsTokensCorrectly(0)
  })

  describe('When a startDate is specified upon initialization', () => {
    itVestsTokensCorrectly(now() + 3600)
  })
})
