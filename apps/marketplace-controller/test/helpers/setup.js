const TokenManager = artifacts.require('TokenManager')
const MiniMeToken = artifacts.require('MiniMeToken')
const Controller = artifacts.require('MarketplaceController')
const Presale = artifacts.require('PresaleMock')
const MarketMaker = artifacts.require('BancorMarketMaker')
const Formula = artifacts.require('BancorFormula')
const Agent = artifacts.require('Agent')
const Vault = artifacts.require('Vault')
const TokenMock = artifacts.require('TokenMock')

const {
  ZERO_ADDRESS,
  ETH,
  INITIAL_COLLATERAL_BALANCE,
  PRESALE_GOAL,
  PRESALE_PERIOD,
  PRESALE_EXCHANGE_RATE,
  VESTING_CLIFF_PERIOD,
  VESTING_COMPLETE_PERIOD,
  PERCENT_SUPPLY_OFFERED,
  PERCENT_FUNDING_FOR_BENEFICIARY,
  VIRTUAL_SUPPLIES,
  VIRTUAL_BALANCES,
  RESERVE_RATIOS,
  BUY_FEE_PCT,
  SELL_FEE_PCT,
} = require('@1hive/apps-marketplace-shared-test-helpers/constants')

const { newDao, installNewApp } = require('@aragon/contract-helpers-test/src/aragon-os')

const { hash } = require('eth-ens-namehash')

const setup = {
  ids: {
    controller: hash('marketplace-controller.aragonpm.eth'),
    tokenManager: hash('token-manager.aragonpm.eth'),
    presale: hash('presale.aragonpm.eth'),
    marketMaker: hash('bancor-market-maker.aragonpm.eth'),
    agent: hash('agent.aragonpm.eth'),
    vault: hash('vault.aragonpm.eth'),
  },
  deploy: {
    base: async ctx => {
      ctx.base = ctx.base || {}

      ctx.base.controller = await Controller.new()
      ctx.base.tokenManager = await TokenManager.new()
      ctx.base.presale = await Presale.new()
      ctx.base.marketMaker = await MarketMaker.new()
      ctx.base.reserve = await Agent.new()
      ctx.base.vault = await Vault.new()
    },
    formula: async ctx => {
      ctx.formula = await Formula.new()
    },
    token: async (ctx, root) => {
      ctx.token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'Bond', 18, 'BON', false, { from: root })
    },
    collaterals: async (ctx, user) => {
      ctx.collaterals = ctx.collaterals || {}
      ctx.collaterals.dai = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'Test', 0, 'TST', true)
      ctx.collaterals.dai.generateTokens(user, INITIAL_COLLATERAL_BALANCE)
      ctx.collaterals.ant = await TokenMock.new(user, INITIAL_COLLATERAL_BALANCE)
    },
    dao: async (ctx, root) => {
      const { dao, acl } = await newDao(root)

      ctx.dao = dao
      ctx.acl = acl
    },
    infrastructure: async ctx => {
      ctx.roles = ctx.roles || {}

      await setup.deploy.base(ctx)
      await setup.deploy.formula(ctx)
    },
    organization: async (ctx, root, user) => {
      await setup.deploy.token(ctx, root)
      await setup.deploy.collaterals(ctx, user)
      await setup.deploy.dao(ctx, root)
      await setup.install.all(ctx, root)
      await setup.initialize.all(ctx, root, user)
      await setup.setPermissions.all(ctx, root, user)
      await setup.setCollaterals(ctx, root, user)
    },
  },
  install: {
    controller: async (ctx, root) => {
      ctx.controller = await Controller.at(await installNewApp(ctx.dao, setup.ids.controller, ctx.base.controller.address, root))
    },
    tokenManager: async (ctx, root) => {
      ctx.tokenManager = await TokenManager.at(await installNewApp(ctx.dao, setup.ids.tokenManager, ctx.base.tokenManager.address, root))
    },
    presale: async (ctx, root) => {
      ctx.presale = await Presale.at(await installNewApp(ctx.dao, setup.ids.presale, ctx.base.presale.address, root))
    },
    marketMaker: async (ctx, root) => {
      ctx.marketMaker = await MarketMaker.at(await installNewApp(ctx.dao, setup.ids.marketMaker, ctx.base.marketMaker.address, root))
    },
    reserve: async (ctx, root) => {
      ctx.reserve = await Agent.at(await installNewApp(ctx.dao, setup.ids.agent, ctx.base.reserve.address, root))
    },
    vault: async (ctx, root) => {
      ctx.vault = await Vault.at(await installNewApp(ctx.dao, setup.ids.vault, ctx.base.vault.address, root))
    },

    all: async (ctx, root) => {
      await setup.install.controller(ctx, root)
      await setup.install.tokenManager(ctx, root)
      await setup.install.presale(ctx, root)
      await setup.install.marketMaker(ctx, root)
      await setup.install.reserve(ctx, root)
      await setup.install.vault(ctx, root)
    },
  },
  initialize: {
    controller: async (ctx, root) => {
      await ctx.controller.initialize(ctx.presale.address, ctx.marketMaker.address, ctx.reserve.address, {
        from: root,
      })
    },
    tokenManager: async (ctx, root) => {
      await ctx.token.changeController(ctx.tokenManager.address, { from: root })
      await ctx.tokenManager.initialize(ctx.token.address, true, 0, { from: root })
    },
    presale: async (ctx, root) => {
      await ctx.presale.initialize(
        ctx.controller.address,
        ctx.tokenManager.address,
        ctx.reserve.address,
        ctx.vault.address,
        ctx.collaterals.dai.address,
        PRESALE_GOAL,
        PRESALE_PERIOD,
        PRESALE_EXCHANGE_RATE,
        VESTING_CLIFF_PERIOD,
        VESTING_COMPLETE_PERIOD,
        PERCENT_SUPPLY_OFFERED,
        PERCENT_FUNDING_FOR_BENEFICIARY,
        0,
        { from: root }
      )
    },
    marketMaker: async (ctx, root) => {
      await ctx.marketMaker.initialize(
        ctx.controller.address,
        ctx.tokenManager.address,
        ctx.formula.address,
        ctx.reserve.address,
        ctx.vault.address,
        BUY_FEE_PCT,
        SELL_FEE_PCT,
        { from: root }
      )
    },
    reserve: async (ctx, root) => {
      await ctx.reserve.initialize({ from: root })
    },
    vault: async (ctx, root) => {
      await ctx.vault.initialize({ from: root })
    },
    all: async (ctx, root, user) => {
      await setup.initialize.tokenManager(ctx, root)
      await setup.initialize.vault(ctx, root)
      await setup.initialize.reserve(ctx, root)
      await setup.initialize.presale(ctx, root)
      await setup.initialize.marketMaker(ctx, root)
      await setup.initialize.controller(ctx, root)
    },
  },
  setPermissions: {
    controller: async (ctx, root, user) => {
      ctx.roles.controller = ctx.roles.controller || {}
      ctx.roles.controller.UPDATE_FORMULA_ROLE = await ctx.base.controller.UPDATE_FORMULA_ROLE()
      ctx.roles.controller.UPDATE_BENEFICIARY_ROLE = await ctx.base.controller.UPDATE_BENEFICIARY_ROLE()
      ctx.roles.controller.UPDATE_FEES_ROLE = await ctx.base.controller.UPDATE_FEES_ROLE()
      ctx.roles.controller.ADD_COLLATERAL_TOKEN_ROLE = await ctx.base.controller.ADD_COLLATERAL_TOKEN_ROLE()
      ctx.roles.controller.REMOVE_COLLATERAL_TOKEN_ROLE = await ctx.base.controller.REMOVE_COLLATERAL_TOKEN_ROLE()
      ctx.roles.controller.UPDATE_COLLATERAL_TOKEN_ROLE = await ctx.base.controller.UPDATE_COLLATERAL_TOKEN_ROLE()
      ctx.roles.controller.OPEN_PRESALE_ROLE = await ctx.base.controller.OPEN_PRESALE_ROLE()
      ctx.roles.controller.OPEN_TRADING_ROLE = await ctx.base.controller.OPEN_TRADING_ROLE()
      ctx.roles.controller.CONTRIBUTE_ROLE = await ctx.base.controller.CONTRIBUTE_ROLE()
      ctx.roles.controller.MAKE_BUY_ORDER_ROLE = await ctx.base.controller.MAKE_BUY_ORDER_ROLE()
      ctx.roles.controller.MAKE_SELL_ORDER_ROLE = await ctx.base.controller.MAKE_SELL_ORDER_ROLE()

      await ctx.acl.createPermission(user, ctx.controller.address, ctx.roles.controller.UPDATE_FORMULA_ROLE, root, { from: root })
      await ctx.acl.createPermission(user, ctx.controller.address, ctx.roles.controller.UPDATE_BENEFICIARY_ROLE, root, { from: root })
      await ctx.acl.createPermission(user, ctx.controller.address, ctx.roles.controller.UPDATE_FEES_ROLE, root, { from: root })
      await ctx.acl.createPermission(user, ctx.controller.address, ctx.roles.controller.ADD_COLLATERAL_TOKEN_ROLE, root, { from: root })
      await ctx.acl.createPermission(user, ctx.controller.address, ctx.roles.controller.REMOVE_COLLATERAL_TOKEN_ROLE, root, { from: root })
      await ctx.acl.createPermission(user, ctx.controller.address, ctx.roles.controller.UPDATE_COLLATERAL_TOKEN_ROLE, root, { from: root })
      await ctx.acl.createPermission(user, ctx.controller.address, ctx.roles.controller.OPEN_PRESALE_ROLE, root, { from: root })
      await ctx.acl.createPermission(ctx.presale.address, ctx.controller.address, ctx.roles.controller.OPEN_TRADING_ROLE, root, { from: root })
      await ctx.acl.createPermission(user, ctx.controller.address, ctx.roles.controller.CONTRIBUTE_ROLE, root, { from: root })
      await ctx.acl.createPermission(user, ctx.controller.address, ctx.roles.controller.MAKE_BUY_ORDER_ROLE, root, { from: root })
      await ctx.acl.createPermission(user, ctx.controller.address, ctx.roles.controller.MAKE_SELL_ORDER_ROLE, root, { from: root })

      // for tests purposes only
      await ctx.acl.grantPermission(root, ctx.controller.address, ctx.roles.controller.ADD_COLLATERAL_TOKEN_ROLE, { from: root })
      await ctx.acl.grantPermission(user, ctx.controller.address, ctx.roles.controller.OPEN_TRADING_ROLE, { from: root })
    },
    tokenManager: async (ctx, root) => {
      ctx.roles.tokenManager = ctx.roles.tokenManager || {}
      ctx.roles.tokenManager.MINT_ROLE = await ctx.base.tokenManager.MINT_ROLE()
      ctx.roles.tokenManager.BURN_ROLE = await ctx.base.tokenManager.BURN_ROLE()
      ctx.roles.tokenManager.ISSUE_ROLE = await ctx.base.tokenManager.ISSUE_ROLE()
      ctx.roles.tokenManager.ASSIGN_ROLE = await ctx.base.tokenManager.ASSIGN_ROLE()
      ctx.roles.tokenManager.REVOKE_VESTINGS_ROLE = await ctx.base.tokenManager.REVOKE_VESTINGS_ROLE()

      await ctx.acl.createPermission(ctx.marketMaker.address, ctx.tokenManager.address, ctx.roles.tokenManager.MINT_ROLE, root, { from: root })
      await ctx.acl.createPermission(ctx.marketMaker.address, ctx.tokenManager.address, ctx.roles.tokenManager.BURN_ROLE, root, { from: root })
      await ctx.acl.grantPermission(ctx.presale.address, ctx.tokenManager.address, ctx.roles.tokenManager.BURN_ROLE, { from: root })
      await ctx.acl.createPermission(ctx.presale.address, ctx.tokenManager.address, ctx.roles.tokenManager.ISSUE_ROLE, root, { from: root })
      await ctx.acl.createPermission(ctx.presale.address, ctx.tokenManager.address, ctx.roles.tokenManager.ASSIGN_ROLE, root, { from: root })
      await ctx.acl.createPermission(ctx.presale.address, ctx.tokenManager.address, ctx.roles.tokenManager.REVOKE_VESTINGS_ROLE, root, { from: root })
    },
    presale: async (ctx, root) => {
      ctx.roles.presale = ctx.roles.presale || {}
      ctx.roles.presale.OPEN_ROLE = await ctx.base.presale.OPEN_ROLE()
      ctx.roles.presale.CONTRIBUTE_ROLE = await ctx.base.presale.CONTRIBUTE_ROLE()

      await ctx.acl.createPermission(ctx.controller.address, ctx.presale.address, ctx.roles.presale.OPEN_ROLE, root, { from: root })
      await ctx.acl.createPermission(ctx.controller.address, ctx.presale.address, ctx.roles.presale.CONTRIBUTE_ROLE, root, { from: root })
    },
    marketMaker: async (ctx, root) => {
      ctx.roles.marketMaker = ctx.roles.marketMaker || {}
      ctx.roles.marketMaker.CONTROLLER_ROLE = await ctx.base.marketMaker.CONTROLLER_ROLE()
      await ctx.acl.createPermission(ctx.controller.address, ctx.marketMaker.address, ctx.roles.marketMaker.CONTROLLER_ROLE, root, { from: root })
    },
    reserve: async (ctx, root) => {
      ctx.roles.reserve = ctx.roles.reserve || {}
      ctx.roles.reserve.ADD_PROTECTED_TOKEN_ROLE = await ctx.base.reserve.ADD_PROTECTED_TOKEN_ROLE()
      ctx.roles.reserve.TRANSFER_ROLE = await ctx.base.reserve.TRANSFER_ROLE()

      await ctx.acl.createPermission(ctx.marketMaker.address, ctx.reserve.address, ctx.roles.reserve.TRANSFER_ROLE, root, { from: root })
      await ctx.acl.createPermission(ctx.controller.address, ctx.reserve.address, ctx.roles.reserve.ADD_PROTECTED_TOKEN_ROLE, root, { from: root })
    },
    vault: async (ctx, root) => {},
    all: async (ctx, root, user) => {
      await setup.setPermissions.controller(ctx, root, user)
      await setup.setPermissions.tokenManager(ctx, root)
      await setup.setPermissions.presale(ctx, root)
      await setup.setPermissions.marketMaker(ctx, root)
      await setup.setPermissions.reserve(ctx, root)
      await setup.setPermissions.vault(ctx, root)
    },
  },
  setCollaterals: async (ctx, root, user) => {
    await ctx.collaterals.dai.approve(ctx.presale.address, INITIAL_COLLATERAL_BALANCE, { from: user })
    await ctx.collaterals.dai.approve(ctx.marketMaker.address, INITIAL_COLLATERAL_BALANCE, { from: user })
    await ctx.collaterals.ant.approve(ctx.presale.address, INITIAL_COLLATERAL_BALANCE, { from: user })
    await ctx.collaterals.ant.approve(ctx.marketMaker.address, INITIAL_COLLATERAL_BALANCE, { from: user })

    await ctx.controller.addCollateralToken(ETH, VIRTUAL_SUPPLIES[0], VIRTUAL_BALANCES[0], RESERVE_RATIOS[0], {
      from: root,
    })
    await ctx.controller.addCollateralToken(
      ctx.collaterals.dai.address,
      VIRTUAL_SUPPLIES[1],
      VIRTUAL_BALANCES[1],
      RESERVE_RATIOS[1],
      {
        from: root,
      }
    )
  },
}

module.exports = setup
