import { createElement } from 'react'
import type { Domain } from '../prahari/types'
import BankApp, { meta as bankMeta } from './domains/bank/index'
import { scenarios as bankScenarios } from './domains/bank/scenarios'
import FoodApp, { meta as foodMeta } from './domains/food/index'
import { scenarios as foodScenarios } from './domains/food/scenarios'
import HiringApp, { meta as hiringMeta } from './domains/hiring/index'
import { scenarios as hiringScenarios } from './domains/hiring/scenarios'
import { HdfcTabLogo, HiringTabLogo, SwiggyTabLogo } from './shell/logos'
import type { DomainConfig } from './shell/types'

export type { DomainAppProps, DomainConfig, Run } from './shell/types'

/** Every live demo. The shell renders tabs in DOMAIN_ORDER. */
export const DOMAINS: Record<Domain, DomainConfig> = {
  food: {
    id: 'food',
    name: 'Swiggy',
    tab: 'Swiggy',
    logo: createElement(SwiggyTabLogo),
    scenarios: foodScenarios,
    App: FoodApp,
    ...foodMeta,
  },
  bank: {
    id: 'bank',
    name: 'HDFC Bank',
    tab: 'HDFC Bank',
    logo: createElement(HdfcTabLogo),
    scenarios: bankScenarios,
    App: BankApp,
    ...bankMeta,
  },
  hiring: {
    id: 'hiring',
    name: 'Hiring',
    tab: 'Hiring',
    logo: createElement(HiringTabLogo),
    scenarios: hiringScenarios,
    App: HiringApp,
    ...hiringMeta,
  },
}

export const DOMAIN_ORDER: Domain[] = ['food', 'bank', 'hiring']

export const isDomain = (s: string | undefined): s is Domain => s === 'food' || s === 'bank' || s === 'hiring'
