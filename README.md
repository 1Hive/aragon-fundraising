# Marketplace [![Build Status](https://travis-ci.org/1Hive/marketplace-app.svg?branch=master)](https://travis-ci.org/1Hive/marketplace-app) [![Coverage](https://coveralls.io/repos/github/1Hive/marketplace-app/badge.svg?branch=master)](https://coveralls.io/github/1Hive/marketplace-app?branch=master) [![License](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)


## Disclaimer

Marketplace is an open source suite of apps. None of the people or institutions involved in its development may be held accountable for how it is used. If you do use it please make sure you comply to the jurisdictions you may be jubjected to.

## Overview

Marketplace is a suite of Aragon apps providing Aragon organizations continuous fundraising capabilities. It implements the following features.

### Presale

This module allows organizations to set a presale target that must be reached during a given period of time for the continous fundraising campaign to actually start.

### Automatic Market Making

This module provides market liquidity to the marketplacee by automatically matching all the buy and sell orders according to a bonding curve tied to the Bancor formula.


## Packages


### NPM Packages

| Package                                                                                | Version | Description                                                                                                   |
| -------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| [`@1hive/apps-marketplace-bancor-formula`](/apps/bancor-formula)                           |         | `BancorFormula` computation contract                                                                          |
| [`@1hive/apps-marketplace-bancor-market-maker`](/apps/bancor-market-maker) |         | Automated market-maker batching orders filled through the `BancorFormula`                                     |
| [`@1hive/apps-marketplace-presale`](/apps/presale)                                                 |         | Initial fundraising to hatch the bonding curve                                             |
| [`@1hive/apps-marketplace-controller`](/apps/marketplace-controller)                   |         | `API` contract providing a single entry-point to interact consistently with all marketplace-related contracts |


## Contributing

We are highly open to the community helping use improve and shape the future of `Marketplace`.
