import { Provider, Contract, Wallet, utils } from 'zksync-web3'
import { ethers } from 'ethers'
import { Deployer } from '@matterlabs/hardhat-zksync-deploy'
import { ZkSyncArtifact } from '@matterlabs/hardhat-zksync-deploy/dist/types'
import * as hre from 'hardhat'
import * as fs from 'fs'
import * as path from 'path'
import { TimeSimulator } from "../../typechain";

const RICH_WALLET_PRIVATE_KEYS = JSON.parse(fs.readFileSync(path.join(__dirname, `../../local-setup/rich-wallets.json`), 'utf8'))

export const provider = Provider.getDefaultProvider()

const wallet = new Wallet(RICH_WALLET_PRIVATE_KEYS[0].privateKey, provider)
const deployer = new Deployer(hre, wallet)

let timeSimulator: TimeSimulator

export const getTimeSimulator = async (): Promise<TimeSimulator> => {
    if (timeSimulator === undefined) {
        timeSimulator = await deployContract(wallet, 'TimeSimulator') as TimeSimulator
    }
    return timeSimulator
}

export function getWallets(): Wallet[] {
    let wallets: Wallet[] = []
    for (let i = 0; i < RICH_WALLET_PRIVATE_KEYS.length; i++) {
        wallets[i] = new Wallet(RICH_WALLET_PRIVATE_KEYS[i].privateKey, provider)
    }
    return wallets
}

export async function loadArtifact(name: string) {
    return await deployer.loadArtifact(name)
}

export async function deployContract(wallet: Wallet, name: string, constructorArguments?: any[] | undefined): Promise<Contract> {
    const artifact = await loadArtifact(name);
    return await deployContractWithArtifact(wallet, artifact, constructorArguments)
}

export async function deployContractWithArtifact(wallet: Wallet, artifact: ZkSyncArtifact, constructorArguments?: any[] | undefined): Promise<Contract> {
    const deployer = new Deployer(hre, wallet)
    return await deployer.deploy(artifact, constructorArguments);
}

export function extractFactoryDeps(artifact: ZkSyncArtifact, knownArtifacts: ZkSyncArtifact[], visited = new Set<string>()): string[] {
    const factoryDeps: string[] = []

    for (const dependencyHash in artifact.factoryDeps) {
        const dependencyContract = artifact.factoryDeps[dependencyHash]

        if (!visited.has(dependencyContract)) {
            const dependencyArtifact = knownArtifacts.find(dependencyArtifact => {
                return dependencyArtifact.sourceName + ':' + dependencyArtifact.contractName === dependencyContract &&
                    ethers.utils.hexlify(utils.hashBytecode(dependencyArtifact.bytecode)) === dependencyHash
            })
            if (dependencyArtifact === undefined) {
                throw new Error('Dependency: `' + dependencyContract + '` is not found')
            }

            factoryDeps.push(dependencyArtifact.bytecode)
            visited.add(dependencyContract)
            const transitiveDeps = extractFactoryDeps(dependencyArtifact, knownArtifacts, visited)
            factoryDeps.push(...transitiveDeps)
        }
    }

    return factoryDeps
}