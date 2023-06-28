// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;
pragma abicoder v2;

import './NonfungiblePositionManager.sol';
import '../TimeSimulator.sol';

contract MockTimeNonfungiblePositionManager is NonfungiblePositionManager {
    TimeSimulator immutable timeSimulator;

    constructor(
        address _factory,
        address _WETH9,
        address _tokenDescriptor,
        TimeSimulator _timeSimulator
    ) NonfungiblePositionManager(_factory, _WETH9, _tokenDescriptor) {
        timeSimulator = _timeSimulator;
    }

    function _blockTimestamp() internal view override returns (uint256) {
        return timeSimulator.blockTimestamp();
    }
}
