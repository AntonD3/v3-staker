/// <reference path="./matchers/beWithin.ts"/>

import { UniswapFixtureType } from './shared/fixtures'

export type TestContext = UniswapFixtureType & {
  subject?: Function
}
