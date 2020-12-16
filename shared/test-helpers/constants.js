const { bn, bigExp } = require('@aragon/contract-helpers-test/src/numbers')

/* time */
const DAYS = 24 * 3600

/* constants */
const PPM = 1e6
const PCT_BASE = 1e18

/* addresses */
const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ETH = '0x0000000000000000000000000000000000000000'

/* balances */
const INITIAL_COLLATERAL_BALANCE = bigExp(1, 23)

/* hatch */
const HATCH_STATE = {
  PENDING: 0,
  FUNDING: 1,
  REFUNDING: 2,
  GOAL_REACHED: 3,
  CLOSED: 4,
}
const HATCH_MAX_GOAL = bn('20000e18')
const HATCH_MIN_GOAL = bn(HATCH_MAX_GOAL * 0.4)
const HATCH_PERIOD = 14 * DAYS
const HATCH_EXCHANGE_RATE = 1 * PPM
const VESTING_CLIFF_PERIOD = 90 * DAYS
const VESTING_COMPLETE_PERIOD = 360 * DAYS
const PERCENT_SUPPLY_OFFERED = 0.9 * PPM // 90%
const PERCENT_FUNDING_FOR_BENEFICIARY = 0.25 * PPM // 25%

/* market maker */
const VIRTUAL_SUPPLIES = [bigExp(1, 23), bigExp(1, 22)]
const VIRTUAL_BALANCES = [bigExp(1, 22), bigExp(1, 20)]
const RESERVE_RATIOS = [(PPM * 10) / 100, (PPM * 1) / 100]
const BUY_FEE_PCT = bn('100000000000000000') // 1%
const SELL_FEE_PCT = bn('100000000000000000')

module.exports = {
  PPM,
  PCT_BASE,
  ANY_ADDRESS,
  ZERO_ADDRESS,
  ETH,
  INITIAL_COLLATERAL_BALANCE,
  HATCH_STATE,
  HATCH_MAX_GOAL,
  HATCH_MIN_GOAL,
  HATCH_PERIOD,
  HATCH_EXCHANGE_RATE,
  VESTING_CLIFF_PERIOD,
  VESTING_COMPLETE_PERIOD,
  PERCENT_SUPPLY_OFFERED,
  PERCENT_FUNDING_FOR_BENEFICIARY,
  VIRTUAL_SUPPLIES,
  VIRTUAL_BALANCES,
  RESERVE_RATIOS,
  BUY_FEE_PCT,
  SELL_FEE_PCT,
}
