const { PCT_BASE } = require('./constants')

const { bn, bigExp } = require('@aragon/contract-helpers-test/src/numbers')

module.exports = {
  amount: () => {
    return bn(Math.floor(Math.random() * 10 + 1) * Math.pow(10, 18))
  },

  virtualSupply: () => {
    return bigExp(Math.floor(Math.random() * Math.pow(10, 9)) + 1, 9)
  },

  virtualBalance: () => {
    return bigExp(Math.floor(Math.random() * Math.pow(10, 9)) + 1, 9)
  },

  reserveRatio: () => {
    return Math.floor(Math.random() * 999999) + 1
  },

  fee: () => {
    return bigExp(Math.floor(Math.random() * Math.pow(10, 8)) + 1, 9)
  },
}
