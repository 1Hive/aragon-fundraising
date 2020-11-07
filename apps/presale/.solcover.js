module.exports = {
  norpc: true,
  copyPackages: [
    '@aragon/os',
    '@aragon/contract-helpers-test',
    '@aragon/minime',
    '@aragon/apps-token-manager',
    '@aragon/apps-vault',
    '@1hive/apps-marketplace-shared-interfaces',
    '@1hive/apps-marketplace-shared-test-helpers',
  ],
  skipFiles: [
    'test',
    '@aragon/os',
    '@aragon/contract-helpers-test',
    '@aragon/minime',
    '@aragon/apps-token-manager',
    '@aragon/apps-vault',
    '@1hive/apps-marketplace-shared-interfaces',
    '@1hive/apps-marketplace-shared-test-helpers',
  ],
  // https://github.com/sc-forks/solidity-coverage/blob/master/docs/advanced.md#skipping-tests
  mocha: {
    grep: "@skip-on-coverage", // Find everything with this tag
    invert: true               // Run the grep's inverse set.
  }
}
