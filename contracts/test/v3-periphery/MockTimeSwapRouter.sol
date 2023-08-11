// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;
pragma abicoder v2;

import './SwapRouter.sol';
import '../TimeSimulator.sol';

contract MockTimeSwapRouter is SwapRouter {
    TimeSimulator immutable timeSimulator;

    constructor(
        address _factory,
        address _WETH9,
        TimeSimulator _timeSimulator
    ) SwapRouter(_factory, _WETH9) {
        timeSimulator = _timeSimulator;
    }

    function _blockTimestamp() internal view override returns (uint256) {
        return timeSimulator.blockTimestamp();
    }
}
