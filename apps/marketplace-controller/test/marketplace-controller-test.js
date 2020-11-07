const { injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')
injectWeb3(web3)
injectArtifacts(artifacts)

const Controller = artifacts.require('MarketplaceController')
const BancorFormula = artifacts.require('BancorFormula')
const {
  ETH,
  INITIAL_COLLATERAL_BALANCE,
  PRESALE_GOAL,
  PRESALE_PERIOD,
  PRESALE_STATE,
} = require('@1hive/apps-marketplace-shared-test-helpers/constants')
const setup = require('./helpers/setup')
const { now } = require('./helpers/utils')
const assertExternalEvent = require('@1hive/apps-marketplace-shared-test-helpers/assertExternalEvent')
const forceSendETH = require('@1hive/apps-marketplace-shared-test-helpers/forceSendETH')
const random = require('@1hive/apps-marketplace-shared-test-helpers/random')
const { assertRevert, assertBn } = require('@aragon/contract-helpers-test/src/asserts')
const { installNewApp } = require('@aragon/contract-helpers-test/src/aragon-os')
const { bn } = require('@aragon/contract-helpers-test/src/numbers')

contract('MarketplaceController app', ([root, authorized, unauthorized]) => {
  before(async () => {
    await setup.deploy.infrastructure(this)
  })

  beforeEach(async () => {
    await setup.deploy.organization(this, root, authorized)
  })

  context('> #initialize', () => {
    context('> initialization parameters are valid', () => {
      it('it should initialize controller', async () => {
        assert.equal(await this.controller.presale(), this.presale.address)
        assert.equal(await this.controller.marketMaker(), this.marketMaker.address)
        assert.equal(await this.controller.reserve(), this.reserve.address)
      })
    })

    context('> initialization parameters are not valid', () => {
      let uninitialized

      beforeEach(async () => {
        uninitialized = await Controller.at(await installNewApp(this.dao, setup.ids.controller, this.base.controller.address, root))
      })

      it('it should revert [presale is not a contract]', async () => {
        await assertRevert(() =>
          uninitialized.initialize(root, this.marketMaker.address, this.reserve.address, { from: root })
        )
      })

      it('it should revert [market maker is not a contract]', async () => {
        await assertRevert(() =>
          uninitialized.initialize(this.presale.address, root, this.reserve.address, { from: root })
        )
      })

      it('it should revert [reserve is not a contract]', async () => {
        await assertRevert(() =>
          uninitialized.initialize(this.presale.address, this.marketMaker.address, root, { from: root })
        )
      })
    })

    it('it should revert on re-initialization', async () => {
      await assertRevert(() => setup.initialize.controller(this, root))
    })
  })
  

  context('> #updateFormula', () => {
    context('> sender has UPDATE_FORMULA_ROLE', () => {
      it('it should update the formula', async () => {
        const newFormula = await BancorFormula.new()
        const receipt = await this.controller.updateFormula(newFormula.address, { from: authorized })

        assertExternalEvent(receipt, 'UpdateFormula(address)', 1)
        // double checked that the transaction has been dispatched in the marketMaker
        assert.equal(await this.marketMaker.formula(), newFormula.address)
      })
    })

    context('> sender does not have UPDATE_FORMULA_ROLE', () => {
      it('it should revert', async () => {
        const newFormula = await BancorFormula.new()
        await assertRevert(() => this.controller.updateFormula(newFormula.address, { from: unauthorized }))
      })
    })
  })

  context('> #updateBeneficiary', () => {
    context('> sender has UPDATE_BENEFICIARY_ROLE', () => {
      it('it should update beneficiary', async () => {
        const receipt = await this.controller.updateBeneficiary(root, { from: authorized })

        assertExternalEvent(receipt, 'UpdateBeneficiary(address)', 1)
        // double checked that the transaction has been dispatched in the marketMaker
        assert.equal(await this.marketMaker.beneficiary(), root)
      })
    })

    context('> sender does not have UPDATE_BENEFICIARY_ROLE', () => {
      it('it should revert', async () => {
        await assertRevert(() => this.controller.updateBeneficiary(root, { from: unauthorized }))
      })
    })
  })

  context('> #updateFees', () => {
    context('> sender has UPDATE_FEES_ROLE', () => {
      it('it should update fees', async () => {
        const receipt = await this.controller.updateFees(random.fee(), random.fee(), { from: authorized })

        assertExternalEvent(receipt, 'UpdateFees(uint256,uint256)')
      })
    })

    context('> sender does not have UPDATE_FEES_ROLE', () => {
      it('it should revert', async () => {
        await assertRevert(() => this.controller.updateFees(random.fee(), random.fee(), { from: unauthorized }))
      })
    })
  })

  context('> #openPresale', () => {
    context('> sender has OPEN_PRESALE_ROLE', () => {
      it('it should open presale', async () => {
        await this.controller.openPresale({ from: authorized })

        assert.equal((await this.presale.state()).toNumber(), PRESALE_STATE.FUNDING)
      })
    })

    context('> sender does not have OPEN_PRESALE_ROLE', () => {
      it('it should revert', async () => {
        await assertRevert(() => this.controller.openPresale({ from: unauthorized }))
      })
    })
  })
  

  context('> #closePresale', () => {
    beforeEach(async () => {
      await this.controller.openPresale({ from: authorized })
      await this.controller.contribute(PRESALE_GOAL, { from: authorized })
    })

    it('it should close presale', async () => {
      await this.controller.closePresale({ from: authorized })

      assert.equal((await this.presale.state()).toNumber(), PRESALE_STATE.CLOSED)
    })
  })

  context('> #contribute', () => {
    beforeEach(async () => {
      await this.controller.openPresale({ from: authorized })
    })

    context('> sender has CONTRIBUTE_ROLE', () => {
      it('it should forward contribution', async () => {
        const receipt = await this.controller.contribute(PRESALE_GOAL.div(bn(2)), { from: authorized })

        assertExternalEvent(receipt, 'Contribute(address,uint256,uint256,uint256)')
      })
    })

    context('> sender does not have CONTRIBUTE_ROLE', () => {
      it('it should revert', async () => {
        await assertRevert(() => this.controller.contribute(PRESALE_GOAL.div(bn(2)), { from: unauthorized }))
      })
    })
  })

  context('> #refund', () => {
    beforeEach(async () => {
      this.presale.mockSetTimestamp(now())
      await this.controller.openPresale({ from: authorized })
      await this.controller.contribute(PRESALE_GOAL.div(bn(2)), { from: authorized })
      this.presale.mockSetTimestamp(now() + PRESALE_PERIOD)
    })

    it('it should refund buyer', async () => {
      const receipt = await this.controller.refund(authorized, 0, { from: authorized })

      assertExternalEvent(receipt, 'Refund(address,uint256,uint256,uint256)')
    })
  })

  context('> #openTrading', () => {
    context('> sender has OPEN_TRADING_ROLE', () => {
      it('it should open trading', async () => {
        const receipt = await this.controller.openTrading({ from: authorized })

        assertExternalEvent(receipt, 'Open()')
      })

    })

    context('> sender does not have OPEN_TRADING_ROLE', () => {
      it('it should revert', async () => {
        await assertRevert(() => this.controller.openTrading({ from: unauthorized }))
      })
    })
  })

  context('> #makeBuyOrder', () => {
    beforeEach(async () => {
      await this.controller.openTrading({ from: authorized })
    })

    context('> sender has MAKE_BUY_ORDER_ROLE', () => {
      it('it should make buy order [ETH]', async () => {
        const amount = random.amount()
        const receipt = await this.controller.makeBuyOrder(ETH, amount, 0, { from: authorized, value: amount })

        assertExternalEvent(receipt, 'MakeBuyOrder(address,address,uint256,uint256,uint256,uint256)')
      })

      it('it should make buy order [ERC20]', async () => {
        const receipt = await this.controller.makeBuyOrder(this.collaterals.dai.address, random.amount(), 0, { from: authorized })

        assertExternalEvent(receipt, 'MakeBuyOrder(address,address,uint256,uint256,uint256,uint256)')
      })
    })

    context('> sender does not have MAKE_BUY_ORDER_ROLE', () => {
      it('it should revert [ETH]', async () => {
        const amount = random.amount()

        await assertRevert(() => this.controller.makeBuyOrder(ETH, amount, 0, { from: unauthorized, value: amount }))
      })

      it('it should revert [ERC20]', async () => {
        await assertRevert(() => this.controller.makeBuyOrder(this.collaterals.dai.address, random.amount(), 0, { from: unauthorized }))
      })
    })
  })

  context('> #makeSellOrder', () => {
    beforeEach(async () => {
      await this.controller.openTrading({ from: authorized })
    })

    context('> sender has MAKE_SELL_ORDER_ROLE', () => {
      it('it should open sell order [ETH]', async () => {
        const amount = random.amount()
        await this.controller.makeBuyOrder(ETH, amount, 0, { from: authorized, value: amount })
        const balance = await this.token.balanceOf(authorized)

        const receipt = await this.controller.makeSellOrder(ETH, balance, 0, { from: authorized })

        assertExternalEvent(receipt, 'MakeSellOrder(address,address,uint256,uint256,uint256,uint256)')
      })

      it('it should open sell order [ERC20]', async () => {
        await this.controller.makeBuyOrder(this.collaterals.dai.address, random.amount(), 0, { from: authorized })
        const balance = await this.token.balanceOf(authorized)

        const receipt = await this.controller.makeSellOrder(this.collaterals.dai.address, balance, 0, { from: authorized })

        assertExternalEvent(receipt, 'MakeSellOrder(address,address,uint256,uint256,uint256,uint256)')
      })
    })

    context('> sender does not have MAKE_SELL_ORDER_ROLE', () => {
      it('it should revert [ETH]', async () => {
        const amount = random.amount()
        await this.controller.makeBuyOrder(ETH, amount, 0, { from: authorized, value: amount })
        const balance = await this.token.balanceOf(authorized)
        await this.token.transfer(unauthorized, balance, { from: authorized })

        await assertRevert(() => this.controller.makeSellOrder(ETH, balance, 0, { from: unauthorized }))
      })

      it('it should revert [ERC20]', async () => {
        await this.controller.makeBuyOrder(this.collaterals.dai.address, random.amount(), 0, { from: authorized })
        const balance = await this.token.balanceOf(authorized)
        await this.token.transfer(unauthorized, balance, { from: authorized })

        await assertRevert(() => this.controller.makeSellOrder(this.collaterals.dai.address, balance, 0,
          { from: unauthorized }))
      })
    })
  })

  context('> #receiveApproval', () => {
    beforeEach(async () => {
      await this.controller.openTrading({ from: authorized })
    })

    it('should make buy order [ERC20]', async () => {
      const amount = random.amount()
      const makeBuyOrderData = this.marketMaker.contract.methods.makeBuyOrder(authorized, this.collaterals.dai.address, amount, 0).encodeABI()
      await this.collaterals.dai.approve(this.marketMaker.address, 0, { from: authorized })

      const receipt = await this.collaterals.dai.approveAndCall(this.controller.address, amount, makeBuyOrderData, { from: authorized })

      assertExternalEvent(receipt, 'MakeBuyOrder(address,address,uint256,uint256,uint256,uint256)')
    })

    it('should revert if sender does not have permission', async () => {
      await this.acl.revokePermission(authorized, this.controller.address, this.roles.controller.MAKE_BUY_ORDER_ROLE)

      const amount = random.amount()
      const makeBuyOrderData = this.marketMaker.contract.methods.makeBuyOrder(authorized, this.collaterals.dai.address, amount, 0).encodeABI()

      await assertRevert(this.collaterals.dai.approveAndCall(this.controller.address, amount, makeBuyOrderData, { from: authorized }), "MARKETPLACE_NO_PERMISSION")
    })
  })

  context('> #addCollateralToken', () => {
    context('> sender has ADD_COLLATERAL_TOKEN_ROLE', () => {
      context('> and rate is superior to zero', () => {
        it('it should add collateral token, protect it and tap it', async () => {
          const receipt = await this.controller.addCollateralToken(
            this.collaterals.ant.address,
            random.virtualSupply(),
            random.virtualBalance(),
            random.reserveRatio(),
            {
              from: authorized,
            }
          )

          assertExternalEvent(receipt, 'AddCollateralToken(address,uint256,uint256,uint32)') // market maker
        })
      })

      context('> and rate is zero', () => {
        it('it should add collateral token, protect it, but not tap it', async () => {
          const receipt = await this.controller.addCollateralToken(
            this.collaterals.ant.address,
            random.virtualSupply(),
            random.virtualBalance(),
            random.reserveRatio(),
            {
              from: authorized,
            }
          )

          assertExternalEvent(receipt, 'AddCollateralToken(address,uint256,uint256,uint32)') // market maker
        })
      })
    })

    context('> sender does not have ADD_COLLATERAL_TOKEN_ROLE', () => {
      it('it should revert', async () => {
        await assertRevert(() =>
          this.controller.addCollateralToken(
            this.collaterals.ant.address,
            random.virtualSupply(),
            random.virtualBalance(),
            random.reserveRatio(),
            {
              from: unauthorized,
            }
          )
        )
      })
    })
  })

  context('> #reAddCollateralToken', () => {
    beforeEach(async () => {
      await this.controller.removeCollateralToken(this.collaterals.dai.address, { from: authorized })
    })

    context('> sender has ADD_COLLATERAL_TOKEN_ROLE', () => {
      it('it should re-add collateral token', async () => {
        const receipt = await this.controller.reAddCollateralToken(
          this.collaterals.dai.address,
          random.virtualSupply(),
          random.virtualBalance(),
          random.reserveRatio(),
          {
            from: authorized,
          }
        )

        assertExternalEvent(receipt, 'AddCollateralToken(address,uint256,uint256,uint32)') // market maker
      })
    })

    context('> sender does not have ADD_COLLATERAL_TOKEN_ROLE', () => {
      it('it should revert', async () => {
        await assertRevert(() =>
          this.controller.reAddCollateralToken(
            this.collaterals.dai.address,
            random.virtualSupply(),
            random.virtualBalance(),
            random.reserveRatio(),
            {
              from: unauthorized,
            }
          )
        )
      })
    })
  })

  context('> #removeCollateralToken', () => {
    context('> sender has REMOVE_COLLATERAL_TOKEN_ROLE', () => {
      it('it should remove collateral token', async () => {
        const receipt1 = await this.controller.removeCollateralToken(this.collaterals.dai.address, { from: authorized })

        assertExternalEvent(receipt1, 'RemoveCollateralToken(address)')
      })
    })

    context('> sender does not have REMOVE_COLLATERAL_TOKEN_ROLE', () => {
      it('it should revert', async () => {
        await assertRevert(() => this.controller.removeCollateralToken(this.collaterals.dai.address, { from: unauthorized }))
      })
    })
  })

  context('> #updateCollateralToken', () => {
    context('> sender has UPDATE_COLLATERAL_TOKEN_ROLE', () => {
      it('it should update collateral token', async () => {
        const receipt = await this.controller.updateCollateralToken(
          this.collaterals.dai.address,
          random.virtualSupply(),
          random.virtualBalance(),
          random.reserveRatio(),
          { from: authorized }
        )

        assertExternalEvent(receipt, 'UpdateCollateralToken(address,uint256,uint256,uint32)')
      })
    })

    context('> sender does not have UPDATE_COLLATERAL_TOKEN_ROLE', () => {
      it('it should revert', async () => {
        await assertRevert(() =>
          this.controller.updateCollateralToken(
            this.collaterals.dai.address,
            random.virtualSupply(),
            random.virtualBalance(),
            random.reserveRatio(),
            { from: unauthorized }
          )
        )
      })
    })
  })

  context('> #token', () => {
    it('it should return bonded token address', async () => {
      assert.equal(await this.controller.token(), this.token.address)
    })
  })

  context('> #contributionToken', () => {
    it('it should return contribution token address', async () => {
      assert.equal(await this.controller.contributionToken(), this.collaterals.dai.address)
    })
  })

  context('> #balanceOf', () => {
    context('> reserve', () => {
      it('it should return available reserve balance [ETH] [@skip-on-coverage]', async () => {
        // note requires running devchain/testrpc with account values more than INITIAL_COLLATERAL_BALANCE / 2
        // using -e <Account Balances>
        await forceSendETH(this.reserve.address, INITIAL_COLLATERAL_BALANCE.div(bn(2)))

        assertBn(await this.controller.balanceOf(this.reserve.address, ETH), INITIAL_COLLATERAL_BALANCE.div(bn(2)))
      })

      it('it should return available reserve balance [ERC20]', async () => {
        await this.collaterals.dai.transfer(this.reserve.address, INITIAL_COLLATERAL_BALANCE, { from: authorized })

        assertBn(await this.controller.balanceOf(this.reserve.address, this.collaterals.dai.address), INITIAL_COLLATERAL_BALANCE)
      })
    })
    context('> others', () => {
      it('it should return balance [ETH]', async () => {
        assertBn(await this.controller.balanceOf(authorized, ETH), await web3.eth.getBalance(authorized))
      })

      it('it should return balance [ETH]', async () => {
        assertBn(
          await this.controller.balanceOf(authorized, this.collaterals.dai.address),
          await this.collaterals.dai.balanceOf(authorized)
        )
      })
    })
  })
})