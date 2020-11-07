const { PRESALE_STATE, PRESALE_PERIOD, PRESALE_GOAL, ZERO_ADDRESS } = require('@1hive/apps-marketplace-shared-test-helpers/constants')
const { sendTransaction, contributionToProjectTokens, getEvent, now } = require('./common/utils')
const { prepareDefaultSetup, defaultDeployParams, initializePresale, deployDefaultSetup } = require('./common/deploy')
const { assertRevert, assertBn } = require('@aragon/contract-helpers-test/src/asserts')
const { bn } = require('@aragon/contract-helpers-test/src/numbers')

contract('Presale, contribute() functionality', ([anyone, appManager, buyer1, buyer2]) => {
  const initializePresaleWithERC20 = async startDate => {
    await this.contributionToken.generateTokens(buyer1, bn('100e18'))
    await this.contributionToken.generateTokens(buyer2, bn('100000e18'))
    await this.contributionToken.approve(this.presale.address, bn('100e18'), { from: buyer1 })
    await this.contributionToken.approve(this.presale.address, bn('100000e18'), { from: buyer2 })

    await initializePresale(this, { ...defaultDeployParams(this, appManager), startDate })
  }

  const initializePresaleWithETH = async startDate => {
    this.contributionToken = {
      balanceOf: async address => new Promise(resolve => resolve(web3.eth.getBalance(address))),
    }

    await initializePresale(this, { ...defaultDeployParams(this, appManager), startDate, contributionToken: ZERO_ADDRESS })
  }

  const contribute = (sender, amount, useETH) => {
    return this.presale.contribute(sender, amount, { from: sender, value: useETH ? amount : 0 })
  }

  const itAllowsUsersToContribute = (useETH, startDate) => {
    before('Prepare app', async () => {
      await prepareDefaultSetup(this, appManager)
    })

    before('Initialize token and app', async () => {
      if (useETH) {
        await initializePresaleWithETH(startDate)
      } else {
        await initializePresaleWithERC20(startDate)
      }
    })

    it('Reverts if the user attempts to buy tokens before the sale has started', async () => {
      await assertRevert(contribute(buyer1, 1, useETH), 'PRESALE_INVALID_STATE')
    })

    describe('When the sale has started', () => {
      const contributionAmount = bn('100e18')
      const acceptableGasDiff = bn(web3.utils.toWei('0.01', 'ether'))

      before('Open the sale if necessary, and set the date to the open date', async () => {
        if (startDate == 0) {
          startDate = now()
          await this.presale.open({ from: appManager })
        }
        this.presale.mockSetTimestamp(startDate + 1)
      })

      it('App state should be Funding', async () => {
        assert.equal((await this.presale.state()).toNumber(), PRESALE_STATE.FUNDING)
      })

      it('A user can query how many project tokens would be obtained for a given amount of contribution tokens', async () => {
        const reportedAmount = await this.presale.contributionToTokens(contributionAmount)
        const expectedAmount = contributionToProjectTokens(contributionAmount)
        assertBn(reportedAmount, expectedAmount)
      })

      describe('When a user buys project tokens', () => {
        let purchaseTx
        let buyer1_initialBalance

        before('Record initial token balances and make a contribution', async () => {
          buyer1_initialBalance = bn(await this.contributionToken.balanceOf(buyer1))

          purchaseTx = await contribute(buyer1, contributionAmount, useETH)
        })

        it('Mints the correct amount of project tokens', async () => {
          const totalSupply = await this.projectToken.totalSupply()
          const expectedAmount = contributionToProjectTokens(contributionAmount)
          assertBn(totalSupply, expectedAmount)
        })

        it('Reduces user contribution token balance', async () => {
          const userBalance = bn(await this.contributionToken.balanceOf(buyer1))
          const expectedBalance = buyer1_initialBalance.sub(contributionAmount)
          assert.isTrue(userBalance.lt(expectedBalance.add(acceptableGasDiff)))
        })

        it('Increases presale contribution token balance', async () => {
          const appBalance = await this.contributionToken.balanceOf(this.presale.address)
          assertBn(appBalance, contributionAmount)
        })

        it('Vested tokens are assigned to the buyer', async () => {
          const userBalance = await this.projectToken.balanceOf(buyer1)
          const expectedAmount = contributionToProjectTokens(contributionAmount)
          assertBn(userBalance, expectedAmount)
        })

        it('A Contribute event is emitted', async () => {
          const expectedAmount = contributionToProjectTokens(contributionAmount)
          const event = getEvent(purchaseTx, 'Contribute')
          assert.isTrue(!!event)
          assert.equal(event.args.contributor, buyer1)
          assertBn(bn(event.args.value), contributionAmount)
          assertBn(bn(event.args.amount), expectedAmount)
          assert.equal(event.args.vestedPurchaseId.toNumber(), 0)
        })

        it('The purchase produces a valid purchase id for the buyer', async () => {
          await contribute(buyer2, 1, useETH)
          await contribute(buyer2, 2, useETH)
          const tx = await contribute(buyer2, 3, useETH)
          const event = getEvent(tx, 'Contribute')
          assert.equal(event.args.vestedPurchaseId.toNumber(), 2)
        })

        it('Keeps track of total tokens raised', async () => {
          const raised = await this.presale.totalRaised()
          assertBn(raised, contributionAmount.add(bn(6)))
        })

        it('Keeps track of independent purchases', async () => {
          assertBn(await this.presale.contributions(buyer1, 0), contributionAmount)
          assert.equal((await this.presale.contributions(buyer2, 0)).toNumber(), 1)
          assert.equal((await this.presale.contributions(buyer2, 1)).toNumber(), 2)
          assert.equal((await this.presale.contributions(buyer2, 2)).toNumber(), 3)
        })

        if (!useETH) {
          it("Reverts when sending ETH in a contribution that's supposed to use ERC20 tokens", async () => {
            await assertRevert(contribute(buyer1, bn('10e18'), true), 'PRESALE_INVALID_CONTRIBUTE_VALUE')
          })
        } else {
          it('Reverts if the ETH amount sent does not match the specified amount', async () => {
            const amount = 2
            await assertRevert(this.presale.contribute(buyer1, amount, { value: amount - 1 }), 'PRESALE_INVALID_CONTRIBUTE_VALUE')
            await assertRevert(this.presale.contribute(buyer1, amount, { value: amount + 1 }), 'PRESALE_INVALID_CONTRIBUTE_VALUE')
          })
        }

        describe('When the sale is Refunding', () => {
          before(async () => {
            this.presale.mockSetTimestamp(startDate + PRESALE_PERIOD)
          })

          it('Sale state is Refunding', async () => {
            assert.equal((await this.presale.state()).toNumber(), PRESALE_STATE.REFUNDING)
          })

          it('Reverts if a user attempts to buy tokens', async () => {
            await assertRevert(contribute(buyer2, 1, useETH), 'PRESALE_INVALID_STATE')
          })
        })

        describe('When the sale state is GoalReached', () => {
          before(async () => {
            this.presale.mockSetTimestamp(startDate + PRESALE_PERIOD / 2)
          })

          it('A purchase cannot cause totalRaised to be greater than the presaleGoal', async () => {
            const raised = bn(await this.presale.totalRaised())
            const remainingToFundingGoal = PRESALE_GOAL.sub(raised)
            const userBalanceBeforePurchase = bn(await this.contributionToken.balanceOf(buyer2))

            const amount = PRESALE_GOAL * 2
            await contribute(buyer2, amount, useETH)
            const userBalanceAfterPurchase = bn(await this.contributionToken.balanceOf(buyer2))

            const tokensUsedInPurchase = userBalanceBeforePurchase.sub(userBalanceAfterPurchase)

            assert.isTrue(tokensUsedInPurchase.lt(remainingToFundingGoal.add(acceptableGasDiff)))
          })

          it('Sale state is GoalReached', async () => {
            assert.equal((await this.presale.state()).toNumber(), PRESALE_STATE.GOAL_REACHED)
          })

          it('Reverts if a user attempts to buy tokens', async () => {
            await assertRevert(contribute(buyer2, 1, useETH), 'PRESALE_INVALID_STATE')
          })
        })
      })
    })
  }

  describe('When sending ETH directly to the Presale contract', () => {
    before(async () => {
      await deployDefaultSetup(this, appManager)
    })

    it('Reverts [@skip-on-coverage]', async () => {
      await assertRevert(sendTransaction({ from: anyone, to: this.presale.address, value: web3.utils.toWei('1', 'ether') }))
    })
  })

  describe('When using ERC20 tokens as contribution tokens', () => {
    describe('When no startDate is specified upon initialization', () => {
      itAllowsUsersToContribute(false, 0)
    })

    describe('When a startDate is specified upon initialization', () => {
      itAllowsUsersToContribute(false, now() + 3600)
    })
  })

  describe('When using ETH as contribution tokens', () => {
    describe('When no startDate is specified upon initialization', () => {
      itAllowsUsersToContribute(true, 0)
    })

    describe('When a startDate is specified upon initialization', () => {
      itAllowsUsersToContribute(true, now() + 3600)
    })
  })
})
