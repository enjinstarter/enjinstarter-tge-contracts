# enjinstarter-tge-contracts

## Environment Variables

-   `COINMARKETCAP_API_KEY`: CoinMarketCap API Key to fetch gas price
-   `ETHERSCAN_API_KEY`: Etherscan API Key to verify contracts
-   `INFURA_PROJECT_ID`: Infura Project ID to deploy contracts
-   `MAINNET_CROWDSALE_ADMIN`: Mainnet Crowdsale Admin address
-   `MAINNET_CROWDSALE_WALLET`: Mainnet Crowdsale Wallet address
-   `MAINNET_PRIVATE_KEY`: Private Key to deploy contracts to Mainnet
-   `MAINNET_VESTING_ADMIN`: Mainnet Vesting Admin address
-   `MAINNET_WHITELIST_ADMIN`: Mainnet Whitelist Admin address
-   `ROPSTEN_CROWDSALE_ADMIN`: Ropsten Crowdsale Admin address
-   `ROPSTEN_CROWDSALE_WALLET`: Ropsten Crowdsale Wallet address
-   `ROPSTEN_PRIVATE_KEY`: Private Key to deploy contracts to Ropsten
-   `ROPSTEN_VESTING_ADMIN`: Ropsten Vesting Admin address
-   `ROPSTEN_WHITELIST_ADMIN`: Ropsten Whitelist Admin address

## Testing

```console
$ npm test
```

## Deployment

### Localhost

```console
$ npm run migrate-local
```

### Ropsten

```console
$ npm run migrate-ropsten-all
```

### Mainnet

```console
$ npm run migrate-mainnet-all
```
