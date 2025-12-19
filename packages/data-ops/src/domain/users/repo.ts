import { Effect } from 'effect'
import { eq, sql } from 'drizzle-orm'
import { usersTable } from '../../db'
import { DbClient } from '../../layers'
import { CreateUser } from './schema'
import { withDbTryPromise } from '../shared/utils'

export class UserRepo extends Effect.Service<UserRepo>()('UserRepo', {
  effect: Effect.gen(function* () {
    const db = yield* DbClient

    return {
      create: Effect.fn('userRepo.create')(function* (data: CreateUser) {
        return yield* withDbTryPromise(db.insert(usersTable).values(data).returning().get())
      }),

      getById: Effect.fn('userRepo.getById')(function* (id: string) {
        return yield* withDbTryPromise(db.select().from(usersTable).where(eq(usersTable.id, id)).get())
      }),

      getByName: Effect.fn('userRepo.getByName')(function* (name: string) {
        // Case-insensitive name lookup using SQLite LOWER()
        return yield* withDbTryPromise(
          db.select().from(usersTable).where(sql`LOWER(${usersTable.name}) = ${name.toLowerCase()}`).get()
        )
      }),

      getAll: Effect.fn('userRepo.getAll')(function* () {
        return yield* withDbTryPromise(db.select().from(usersTable).all())
      }),

      count: Effect.fn('userRepo.count')(function* () {
        const result = yield* withDbTryPromise(db.select().from(usersTable).all())
        return result.length
      }),

      update: Effect.fn('userRepo.update')(function* (id: string, data: { name: string }) {
        return yield* withDbTryPromise(db.update(usersTable).set(data).where(eq(usersTable.id, id)).returning().get())
      }),
    } as const
  }),
  accessors: true,
  dependencies: [DbClient.Default],
}) {}
