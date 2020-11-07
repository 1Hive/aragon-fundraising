pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/SafeERC20.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@1hive/apps-marketplace-shared-interfaces/contracts/IMarketplaceController.sol";


contract MarketplaceControllerMock is IMarketplaceController, AragonApp {
    using SafeERC20 for ERC20;

    event OpenTrading();
    event ResetTokenTap();
    event UpdateTappedAmount();

    function initialize() external onlyInit {
        initialized();
    }

    function openTrading() external {
        emit OpenTrading();
    }

    function balanceOf(address _who, address _token) public view returns (uint256) {
        if (_token == ETH) {
            return _who.balance;
        } else {
            return ERC20(_token).staticBalanceOf(_who);
        }
    }
}
