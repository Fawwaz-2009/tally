import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { settingsTable } from "../../db";
import z from "zod/v4";

export const SettingsInsertSchema = createInsertSchema(settingsTable);
export type SettingsInsert = z.infer<typeof SettingsInsertSchema>;

export const SettingsSelectSchema = createSelectSchema(settingsTable);
export type Settings = z.infer<typeof SettingsSelectSchema>;
