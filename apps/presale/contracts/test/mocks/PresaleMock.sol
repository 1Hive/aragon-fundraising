pragma solidity ^0.4.24;

import "../../Presale.sol";

import "@aragon/contract-helpers-test/contracts/0.4/aragonOS/TimeHelpersMock.sol";


contract PresaleMock is Presale, TimeHelpersMock {}
