import { Effect } from 'effect'
import { eq } from 'drizzle-orm'
import { settingsTable } from '../../db'
import { DbClient } from '../../layers'
import { withDbTryPromise } from '../shared/utils'

const SETTINGS_ID = 1 // Singleton row ID

export class SettingsRepo extends Effect.Service<SettingsRepo>()('SettingsRepo', {
  effect: Effect.gen(function* () {
    const db = yield* DbClient

    return {
      // Get the settings row, creating it if it doesn't exist
      get: Effect.fn('settingsRepo.get')(function* () {
        const result = yield* withDbTryPromise(db.select().from(settingsTable).where(eq(settingsTable.id, SETTINGS_ID)).get())

        if (result) {
          return result
        }

        // Create default settings if not exists
        return yield* withDbTryPromise(db.insert(settingsTable).values({ id: SETTINGS_ID }).returning().get())
      }),

      // Update settings
      update: Effect.fn('settingsRepo.update')(function* (values: Partial<{ baseCurrency: string }>) {
        // Ensure settings row exists first
        const existing = yield* withDbTryPromise(db.select().from(settingsTable).where(eq(settingsTable.id, SETTINGS_ID)).get())

        if (!existing) {
          yield* withDbTryPromise(db.insert(settingsTable).values({ id: SETTINGS_ID }).returning().get())
        }

        return yield* withDbTryPromise(
          db
            .update(settingsTable)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(settingsTable.id, SETTINGS_ID))
            .returning()
            .get(),
        )
      }),
    } as const
  }),
  accessors: true,
  dependencies: [DbClient.Default],
}) {}
