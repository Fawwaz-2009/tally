import { createTRPCRouter } from '../init'

import { expensesRouter } from './expenses'
import { settingsRouter } from './settings'
import { usersRouter } from './users'

export const trpcRouter = createTRPCRouter({
  expenses: expensesRouter,
  settings: settingsRouter,
  users: usersRouter,
})

export type TRPCRouter = typeof trpcRouter
