import { UniswapV3Staker } from '../../typechain'
import { uniswapFixture, UniswapFixtureType } from '../shared/fixtures'
import { expect } from '../shared'
import { provider } from '../shared/provider'
import { deployContract, getWallets } from '../shared/zkSyncUtils'

describe('unit/Deployment', () => {
  let context: UniswapFixtureType

  beforeEach('create fixture loader', async () => {
    context = await uniswapFixture(getWallets(), provider)
  })

  it('deploys and has an address', async () => {
    const staker = (await deployContract(getWallets()[0], 'UniswapV3Staker', [
      context.factory.address,
      context.nft.address,
      2 ** 32,
      2 ** 32
    ])) as UniswapV3Staker
    expect(staker.address).to.be.a.string
  })

  it('sets immutable variables', async () => {
    const staker = (await deployContract(getWallets()[0], 'UniswapV3Staker', [
      context.factory.address,
      context.nft.address,
      2 ** 32,
      2 ** 32
    ])) as UniswapV3Staker

    expect(await staker.factory()).to.equal(context.factory.address)
    expect(await staker.nonfungiblePositionManager()).to.equal(context.nft.address)
    expect(await staker.maxIncentiveDuration()).to.equal(2 ** 32)
    expect(await staker.maxIncentiveStartLeadTime()).to.equal(2 ** 32)
  })
})
