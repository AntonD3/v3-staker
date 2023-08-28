# uniswap-v3-staker

This is the canonical staking contract designed for [Uniswap V3](https://github.com/uniswap-zksync/era-uniswap-v3-core) forked for zkSync Era.

## Links:

- [Contract Design](docs/Design.md)

## Development and Testing

The tests are running against the [test node](https://github.com/matter-labs/era-test-node).

```sh
$ yarn
$ yarn compile
$ yarn test
```

## Gas Snapshots

```sh
# if gas snapshots need to be updated
$ UPDATE_SNAPSHOT=1 yarn test
```

## Contract Sizing

```sh
$ yarn size-contracts
```
