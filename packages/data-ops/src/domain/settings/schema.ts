import { createInsertSchema, createSelectSchema } from '@handfish/drizzle-effect'
import { Schema } from 'effect'
// Import from db/schema directly to avoid pulling in better-sqlite3 runtime
import { settingsTable } from '../../db/schema'

export const SettingsInsertSchema = createInsertSchema(settingsTable)
export type SettingsInsert = Schema.Schema.Type<typeof SettingsInsertSchema>

export const SettingsSelectSchema = createSelectSchema(settingsTable)
export type Settings = Schema.Schema.Type<typeof SettingsSelectSchema>

// ============================================================================
// Operation Inputs
// ============================================================================

/**
 * Input for setting the base currency.
 */
export const SetBaseCurrencyInput = Schema.Struct({
  currency: Schema.String.pipe(Schema.length(3)),
})
export type SetBaseCurrencyInput = Schema.Schema.Type<typeof SetBaseCurrencyInput>

/**
 * Input for completing initial setup.
 */
export const CompleteSetupInput = Schema.Struct({
  userName: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  currency: Schema.String.pipe(Schema.length(3)),
})
export type CompleteSetupInput = Schema.Schema.Type<typeof CompleteSetupInput>
