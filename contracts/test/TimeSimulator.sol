// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;

contract TimeSimulator {
    uint256 public blockTimestamp;

    function increaseTime(uint256 interval) external {
        blockTimestamp += interval;
    }

    function setTimestamp(uint256 timestamp) external {
        blockTimestamp = timestamp;
    }
}
