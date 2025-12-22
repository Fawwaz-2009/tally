import { createTRPCRouter } from '../init'

import { expensesRouter } from './expenses'
import { merchantsRouter } from './merchants'
import { settingsRouter } from './settings'
import { shortcutRouter } from './shortcut'
import { usersRouter } from './users'

export const trpcRouter = createTRPCRouter({
  expenses: expensesRouter,
  merchants: merchantsRouter,
  settings: settingsRouter,
  shortcut: shortcutRouter,
  users: usersRouter,
})

export type TRPCRouter = typeof trpcRouter
