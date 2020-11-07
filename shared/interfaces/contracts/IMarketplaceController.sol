pragma solidity 0.4.24;


contract IMarketplaceController {
    function openTrading() external;
    function balanceOf(address _who, address _token) public view returns (uint256);
}
