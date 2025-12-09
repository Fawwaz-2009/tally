import { createInsertSchema, createSelectSchema } from "@handfish/drizzle-effect";
import { Schema } from "effect";
// Import from db/schema directly to avoid pulling in better-sqlite3 runtime
import { settingsTable } from "../../db/schema";

export const SettingsInsertSchema = createInsertSchema(settingsTable);
export type SettingsInsert = Schema.Schema.Type<typeof SettingsInsertSchema>;

export const SettingsSelectSchema = createSelectSchema(settingsTable);
export type Settings = Schema.Schema.Type<typeof SettingsSelectSchema>;
