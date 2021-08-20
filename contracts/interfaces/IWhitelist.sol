// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.7.6;

interface IWhitelist {
    function addWhitelisted(address account) external;

    function removeWhitelisted(address account) external;

    function addWhitelistedBatch(address[] memory accounts) external;

    function removeWhitelistedBatch(address[] memory accounts) external;

    function setGovernanceAccount(address account) external;

    function setWhitelistAdmin(address account) external;

    function isWhitelisted(address account)
        external
        view
        returns (bool isWhitelisted_);

    event WhitelistedAdded(address indexed account);
    event WhitelistedRemoved(address indexed account);
}
