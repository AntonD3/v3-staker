import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import 'hardhat-contract-sizer'
import '@matterlabs/hardhat-zksync-deploy'
import '@matterlabs/hardhat-zksync-solc'
import '@matterlabs/hardhat-zksync-verify'

import { subtask } from 'hardhat/config'
import * as path from 'path'
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from 'hardhat/builtin-tasks/task-names'

const NFT_DESCRIPTOR_PATH = 'contracts/test/v3-periphery/libraries/NFTDescriptor.sol'
const NFT_DESCRIPTOR_NAME = 'NFTDescriptor'
const CONTRACTS_USES_NFT_DESCRIPTOR = ['test/v3-periphery/NonfungibleTokenPositionDescriptor.sol']

subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS, async (_, { config }, runSuper) => {
  const paths = await runSuper()

  if (config.zksolc.settings.libraries !== undefined) {
    if (config.zksolc.settings.libraries[NFT_DESCRIPTOR_PATH] !== undefined) {
      if (config.zksolc.settings.libraries[NFT_DESCRIPTOR_PATH][NFT_DESCRIPTOR_NAME] !== undefined) {
        return paths
      }
    }
  }
  return paths.filter((solidityFilePath: any) => {
    const relativePath = path.relative(config.paths.sources, solidityFilePath)
    return !CONTRACTS_USES_NFT_DESCRIPTOR.includes(relativePath)
  })
})

const config: any = {
  networks: {
    zkSyncTestNode: {
      url: 'http://localhost:8011',
      ethNetwork: '',
      zksync: true,
    },
    zkSyncTestnet: {
      url: 'https://testnet.era.zksync.dev',
      ethNetwork: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      zksync: true,
      verifyURL: 'https://zksync2-testnet-explorer.zksync.dev/contract_verification',
    },
    zkSyncMainnet: {
      url: 'https://mainnet.era.zksync.io',
      ethNetwork: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      zksync: true,
      verifyURL: 'https://zksync2-mainnet-explorer.zksync.io/contract_verification',
    },
  },
  defaultNetwork: 'zkSyncTestNode',
  solidity: {
    version: '0.7.6',
  },
  zksolc: {
    version: '1.3.13',
    compilerSource: 'binary',
    settings: {
      metadata: {
        bytecodeHash: 'none',
      },
    },
  },
  contractSizer: {
    alphaSort: false,
    disambiguatePaths: true,
    runOnCompile: false,
  },
  mocha: {
    timeout: 100000000,
  },
}

export default config
