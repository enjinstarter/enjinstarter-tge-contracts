// SPDX-License-Identifier: Apache-2.0
// Copyright 2021 Enjinstarter
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20Capped.sol";

/**
 * @title SaleTokenMock
 * @author Enjinstarter
 */
contract SaleTokenMock is ERC20Capped {
    uint256 public constant TOKEN_CAP = 10e9 * (10**18);

    constructor() ERC20("SaleTokenMock", "STM") ERC20Capped(TOKEN_CAP) {
        _mint(msg.sender, TOKEN_CAP);
    }
}
