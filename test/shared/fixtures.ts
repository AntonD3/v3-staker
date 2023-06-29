import { constants } from 'ethers'

import UniswapV3Pool from '@uniswap/v3-core/artifacts-zk/contracts/UniswapV3Pool.sol/UniswapV3Pool.json'
import WETH9 from './external/WETH9.json'
import { ISwapRouter } from '../../types/ISwapRouter'
import { IWETH9 } from '../../types/IWETH9'
import {
  MockTimeUniswapV3Staker,
  TestERC20,
  INonfungiblePositionManager,
  IUniswapV3Factory,
  IUniswapV3Pool,
  TestIncentiveId
} from '../../typechain'
import { NFTDescriptor } from '../../types/NFTDescriptor'
import { FeeAmount, BigNumber, encodePriceSqrt, MAX_GAS_LIMIT } from '../shared'
import { ActorFixture } from './actors'
import { deployContract, deployContractWithArtifact, getTimeSimulator } from './zkSyncUtils'
import { Contract } from 'zksync-web3'
import hre from "hardhat";

type WETH9Fixture = { weth9: IWETH9 }

export const wethFixture = async ([wallet]): Promise<WETH9Fixture> => {
  const weth9 = (await deployContractWithArtifact(wallet, WETH9 as any)) as IWETH9

  return { weth9 }
}

const v3CoreFactoryFixture = async ([wallet]): Promise<IUniswapV3Factory> => {
  return (await deployContract(wallet, 'MockTimeUniswapV3Factory', [(await getTimeSimulator()).address])) as IUniswapV3Factory
}

export const v3RouterFixture = async ([wallet]): Promise<{
  weth9: IWETH9
  factory: IUniswapV3Factory
  router: ISwapRouter
}> => {
  const { weth9 } = await wethFixture([wallet])
  const factory = await v3CoreFactoryFixture([wallet])
  const router = (await deployContract(wallet, 'MockTimeSwapRouter', [
    factory.address,
    weth9.address,
    (await getTimeSimulator()).address
  ])) as ISwapRouter

  return { factory, weth9, router }
}

const nftDescriptorLibraryFixture = async ([wallet]): Promise<NFTDescriptor> => {
  return (await deployContract(wallet, 'NFTDescriptor')) as NFTDescriptor
}

type UniswapFactoryFixture = {
  weth9: IWETH9
  factory: IUniswapV3Factory
  router: ISwapRouter
  nft: INonfungiblePositionManager
  tokens: [TestERC20, TestERC20, TestERC20]
}

let nftDescriptorLibrary: NFTDescriptor | undefined

export const uniswapFactoryFixture = async (wallets): Promise<UniswapFactoryFixture> => {
  const { weth9, factory, router } = await v3RouterFixture(wallets)
  const tokens = [
    await deployContract(wallets[0], 'TestERC20', [constants.MaxUint256.div(2)]), // do not use maxu256 to avoid overflowing
    await deployContract(wallets[0], 'TestERC20', [constants.MaxUint256.div(2)]),
    await deployContract(wallets[0], 'TestERC20', [constants.MaxUint256.div(2)]),
  ] as [TestERC20, TestERC20, TestERC20]

  if (nftDescriptorLibrary === undefined) {
    nftDescriptorLibrary = await nftDescriptorLibraryFixture(wallets)

    const hre = require('hardhat')
    hre.config.zksolc.settings.libraries = {
      'contracts/test/v3-periphery/libraries/NFTDescriptor.sol': {
        NFTDescriptor: nftDescriptorLibrary.address,
      },
    }
    await hre.run('compile')
  }

  const positionDescriptor = await deployContract(wallets[0], 'NonfungibleTokenPositionDescriptor', [tokens[0].address])

  const nft = (await deployContract(
    wallets[0],
    'MockTimeNonfungiblePositionManager', [
    factory.address,
    weth9.address,
    positionDescriptor.address,
    (await getTimeSimulator()).address
  ])) as INonfungiblePositionManager

  tokens.sort((a, b) => (a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1))

  return {
    weth9,
    factory,
    router,
    tokens,
    nft,
  }
}

export const mintPosition = async (
  nft: INonfungiblePositionManager,
  mintParams: {
    token0: string
    token1: string
    fee: FeeAmount
    tickLower: number
    tickUpper: number
    recipient: string
    amount0Desired: any
    amount1Desired: any
    amount0Min: number
    amount1Min: number
    deadline: number
  }
): Promise<string> => {
  const transferFilter = nft.filters.Transfer(null, null, null)
  const transferTopic = nft.interface.getEventTopic('Transfer')

  let tokenId: BigNumber | undefined

  const receipt = await (
    await nft.mint(
      {
        token0: mintParams.token0,
        token1: mintParams.token1,
        fee: mintParams.fee,
        tickLower: mintParams.tickLower,
        tickUpper: mintParams.tickUpper,
        recipient: mintParams.recipient,
        amount0Desired: mintParams.amount0Desired,
        amount1Desired: mintParams.amount1Desired,
        amount0Min: mintParams.amount0Min,
        amount1Min: mintParams.amount1Min,
        deadline: mintParams.deadline,
      },
      {
        gasLimit: MAX_GAS_LIMIT,
      }
    )
  ).wait()

  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i]
    if (log.address === nft.address && log.topics.includes(transferTopic)) {
      // for some reason log.data is 0x so this hack just re-fetches it
      const events = await nft.queryFilter(transferFilter, log.blockNumber, log.blockNumber)
      if (events.length === 1) {
        tokenId = events[0].args?.tokenId
      }
      break
    }
  }

  if (tokenId === undefined) {
    throw 'could not find tokenId after mint'
  } else {
    return tokenId.toString()
  }
}

export type UniswapFixtureType = {
  factory: IUniswapV3Factory
  fee: FeeAmount
  nft: INonfungiblePositionManager
  pool01: string
  pool12: string
  poolObj: IUniswapV3Pool
  router: ISwapRouter
  staker: MockTimeUniswapV3Staker
  testIncentiveId: TestIncentiveId
  tokens: [TestERC20, TestERC20, TestERC20]
  token0: TestERC20
  token1: TestERC20
  rewardToken: TestERC20
}
export const uniswapFixture = async (wallets, provider): Promise<UniswapFixtureType> => {
  const { tokens, nft, factory, router } = await uniswapFactoryFixture(wallets)
  const signer = new ActorFixture(wallets, provider).stakerDeployer()
  const staker = (await deployContract(signer, 'MockTimeUniswapV3Staker', [
    factory.address,
    nft.address, 2 ** 32, 2 ** 32,
    (await getTimeSimulator()).address
  ])) as MockTimeUniswapV3Staker

  const testIncentiveId = (await deployContract(signer, 'TestIncentiveId')) as TestIncentiveId

  for (const token of tokens) {
    await(await token.approve(nft.address, constants.MaxUint256)).wait()
  }

  const fee = FeeAmount.MEDIUM
  await(await nft.createAndInitializePoolIfNecessary(tokens[0].address, tokens[1].address, fee, encodePriceSqrt(1, 1))).wait()

  await(await nft.createAndInitializePoolIfNecessary(tokens[1].address, tokens[2].address, fee, encodePriceSqrt(1, 1))).wait()

  const pool01 = await factory.getPool(tokens[0].address, tokens[1].address, fee)

  const pool12 = await factory.getPool(tokens[1].address, tokens[2].address, fee)

  const poolObj = new Contract(pool01, UniswapV3Pool.abi, wallets[0]) as IUniswapV3Pool

  return {
    nft,
    router,
    tokens,
    staker,
    testIncentiveId,
    factory,
    pool01,
    pool12,
    fee,
    poolObj,
    token0: tokens[0],
    token1: tokens[1],
    rewardToken: tokens[2],
  }
}
