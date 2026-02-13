// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library PricingLib {
    function dynamicPrice(
        uint256 basePrice,
        uint256 supply,
        uint256 priceIncrement
    ) external pure returns (uint256) {
        return basePrice + (supply * priceIncrement);
    }
}
