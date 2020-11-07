const {
  PRESALE_GOAL,
  PRESALE_STATE,
  PERCENT_FUNDING_FOR_BENEFICIARY,
  PERCENT_SUPPLY_OFFERED,
  PPM,
} = require('@1hive/apps-marketplace-shared-test-helpers/constants')
const { prepareDefaultSetup, defaultDeployParams, initializePresale } = require('./common/deploy')
const { getEvent, now } = require('./common/utils')
const { assertRevert } = require('@aragon/contract-helpers-test/src/asserts')

const assertExternalEvent = require('@1hive/apps-marketplace-shared-test-helpers/assertExternalEvent')

const BUYER_BALANCE = 2 * PRESALE_GOAL

contract('Presale, close() functionality', ([anyone, appManager, buyer1]) => {
  const itAllowsTheSaleToBeClosed = startDate => {
    describe('When enough purchases have been made to close the sale', () => {
      before(async () => {
        await prepareDefaultSetup(this, appManager)
        await initializePresale(this, { ...defaultDeployParams(this, appManager), startDate })

        await this.contributionToken.generateTokens(buyer1, BUYER_BALANCE)
        await this.contributionToken.approve(this.presale.address, BUYER_BALANCE, { from: buyer1 })

        if (startDate == 0) {
          startDate = now()
          await this.presale.open({ from: appManager })
        }
        this.presale.mockSetTimestamp(startDate + 1)

        // Make a single purchase that reaches the funding goal
        await this.presale.contribute(buyer1, PRESALE_GOAL)
      })

      it('Sale state is GoalReached', async () => {
        assert.equal((await this.presale.state()).toNumber(), PRESALE_STATE.GOAL_REACHED)
      })

      describe('When the sale is closed', () => {
        let closeReceipt

        before(async () => {
          closeReceipt = await this.presale.close()
        })

        it('Sale state is Closed', async () => {
          assert.equal((await this.presale.state()).toNumber(), PRESALE_STATE.CLOSED)
        })

        it('Raised funds are transferred to the fundraising reserve and the beneficiary address', async () => {
          assert.equal((await this.contributionToken.balanceOf(this.presale.address)).toNumber(), 0)

          const totalRaised = (await this.presale.totalRaised()).toNumber()
          const tokensForBeneficiary = Math.floor((totalRaised * PERCENT_FUNDING_FOR_BENEFICIARY) / PPM)
          const tokensForReserve = totalRaised - tokensForBeneficiary
          const reserve = await this.presale.reserve()
          assert.equal((await this.contributionToken.balanceOf(appManager)).toNumber(), tokensForBeneficiary)
          assert.equal((await this.contributionToken.balanceOf(reserve)).toNumber(), tokensForReserve)
        })

        it('Tokens are minted to the beneficiary address', async () => {
          const supply = await this.projectToken.totalSupply()
          const balanceOfBeneficiary = await this.projectToken.balanceOf(appManager)

          assert.equal(parseInt(balanceOfBeneficiary.toNumber()), parseInt(Math.floor(supply.toNumber() * (1 - PERCENT_SUPPLY_OFFERED / PPM))))
        })

        it('Continuous fundraising campaign is started', async () => {
          assertExternalEvent(closeReceipt, 'OpenTrading()')
        })

        it('Sale cannot be closed again', async () => {
          await assertRevert(this.presale.close(), 'PRESALE_INVALID_STATE')
        })

        it('Emitted a Close event', async () => {
          assert.isTrue(!!getEvent(closeReceipt, 'Close'))
        })
      })
    })
  }

  describe('When no startDate is specified upon initialization', () => {
    itAllowsTheSaleToBeClosed(0)
  })

  describe('When a startDate is specified upon initialization', () => {
    itAllowsTheSaleToBeClosed(now() + 3600)
  })
})
