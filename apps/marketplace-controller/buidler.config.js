const { usePlugin } = require('@nomiclabs/buidler/config')

usePlugin('@aragon/buidler-aragon')
usePlugin('@nomiclabs/buidler-solhint')
usePlugin('buidler-gas-reporter')
usePlugin('solidity-coverage')

const ACCOUNTS = (process.env.ETH_KEYS ? process.env.ETH_KEYS.split(',') : [])
  .map(key => key.trim())

module.exports = {
  defaultNetwork: 'localhost',
  networks: {
    localhost: {
      url: 'http://localhost:8545',
      accounts: {
        mnemonic: "explain tackle mirror kit van hammer degree position ginger unfair soup bonus"
      }
    },
    buidlerevm: {
      accounts: [
        { privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", balance: "100000000000000000000000" },
        { privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", balance: "100000000000000000000000" },
        { privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", balance: "100000000000000000000000" },
        { privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", balance: "100000000000000000000000" },
        { privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", balance: "100000000000000000000000" },
        { privateKey: "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba", balance: "100000000000000000000000" },
        { privateKey: "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e", balance: "100000000000000000000000" },
      ]
    },
    mainnet: {
      url: 'https://mainnet.eth.aragon.network',
      accounts: ACCOUNTS,
    },
    // Rinkeby network configured with Aragon node.
    rinkeby: {
      url: 'https://rinkeby.eth.aragon.network',
      accounts: ACCOUNTS,
    },
    // Network configured to interact with Frame wallet. Requires
    // to have Frame running on your machine. Download it from:
    // https://frame.sh
    frame: {
      httpHeaders: { origin: 'buidler' },
      url: 'http://localhost:1248',
    },
    xdai:{
      url: 'https://xdai.poanetwork.dev',
      accounts: ACCOUNTS,
      gasPrice: 20,
      gas: 12000000,
    },
    coverage: {
      url: 'http://localhost:8555',
    },
  },
  solc: {
    version: '0.4.24',
    optimizer: {
      enabled: true,
      runs: 10000,
    },
  },
  gasReporter: {
    enabled: process.env.GAS_REPORTER ? true : false,
  },
}
