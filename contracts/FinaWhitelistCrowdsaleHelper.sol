// SPDX-License-Identifier: Apache-2.0
// Copyright 2021 Enjinstarter
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IFinaWhitelist.sol";

/**
 * @title FinaWhitelistCrowdsaleHelper
 * @author Enjinstarter
 * @dev Helper for crowdsale in which only whitelisted users can contribute.
 */
contract FinaWhitelistCrowdsaleHelper {
    using SafeMath for uint256;

    address public whitelistContract;

    mapping(address => uint256) private _tokensPurchased;

    /**
     * @param whitelistContract_ whitelist contract address
     */
    constructor(address whitelistContract_) {
        require(
            whitelistContract_ != address(0),
            "FinaWhitelistCrowdsaleHelper: zero whitelist address"
        );

        whitelistContract = whitelistContract_;
    }

    // TODO: Investigate why modifier and require() don't work consistently for beneficiaryCapNotExceeded()
    /*
    modifier beneficiaryCapNotExceeded(
        address beneficiary,
        uint256 tokenAmount
    ) {
        require(
            _tokensPurchased[beneficiary].add(tokenAmount) <=
                IFinaWhitelist(whitelistContract).whitelistedAmountFor(
                    beneficiary
                ),
            "FinaWhitelistCrowdsaleHelper: beneficiary cap exceeded"
        );
        _;
    }
    */

    modifier isWhitelisted(address account) {
        require(
            IFinaWhitelist(whitelistContract).isWhitelisted(account),
            "FinaWhitelistCrowdsaleHelper: account not whitelisted"
        );
        _;
    }

    /**
     * @return tokenCap Cap for beneficiary in wei
     */
    function getBeneficiaryCap(address beneficiary)
        public
        view
        returns (uint256 tokenCap)
    {
        require(
            beneficiary != address(0),
            "FinaWhitelistCrowdsaleHelper: zero beneficiary address"
        );

        tokenCap = IFinaWhitelist(whitelistContract).whitelistedAmountFor(
            beneficiary
        );
    }

    /**
     * @dev Returns the amount of tokens purchased so far by specific beneficiary.
     * @param beneficiary Address of contributor
     * @return tokensPurchased Tokens purchased by beneficiary so far in wei
     */
    function getTokensPurchasedBy(address beneficiary)
        public
        view
        returns (uint256 tokensPurchased)
    {
        require(
            beneficiary != address(0),
            "FinaWhitelistCrowdsaleHelper: zero beneficiary address"
        );

        tokensPurchased = _tokensPurchased[beneficiary];
    }

    function whitelisted(address account)
        public
        view
        returns (bool whitelisted_)
    {
        require(
            account != address(0),
            "FinaWhitelistCrowdsaleHelper: zero account"
        );

        whitelisted_ = IFinaWhitelist(whitelistContract).isWhitelisted(account);
    }

    /**
     * @param beneficiary Address of contributor
     * @param tokenAmount Amount in wei of token being purchased
     */
    function _updateBeneficiaryTokensPurchased(
        address beneficiary,
        uint256 tokenAmount
    ) internal {
        _tokensPurchased[beneficiary] = _tokensPurchased[beneficiary].add(
            tokenAmount
        );
    }

    /**
     * @return availableTokens Available number of tokens for purchase by beneficiary
     */
    function _getAvailableTokensFor(address beneficiary)
        internal
        view
        returns (uint256 availableTokens)
    {
        availableTokens = getBeneficiaryCap(beneficiary).sub(
            getTokensPurchasedBy(beneficiary)
        );
    }
}
