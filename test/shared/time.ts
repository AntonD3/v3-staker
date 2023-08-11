import { log } from './logging'
import { getTimeSimulator } from './zkSyncUtils'

type TimeSetterFunction = (timestamp: number) => Promise<void>

type TimeSetters = {
  set: TimeSetterFunction
  step: TimeSetterFunction
}

export const createTimeMachine = (): TimeSetters => {
  return {
    set: async (timestamp: number) => {
      log.debug(`🕒 setTime(${timestamp})`)
      // Not sure if I need both of those
      await (await (await getTimeSimulator()).setTimestamp(timestamp)).wait()
    },

    step: async (interval: number) => {
      log.debug(`🕒 increaseTime(${interval})`)
      await (await (await getTimeSimulator()).increaseTime(interval)).wait()
    },
  }
}
