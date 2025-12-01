import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "../../db";
import z from "zod/v4";

export const UserInsertSchema = createInsertSchema(usersTable);
export type UserInsert = z.infer<typeof UserInsertSchema>;

export const UserSelectSchema = createSelectSchema(usersTable);
export type User = z.infer<typeof UserSelectSchema>;

export const CreateUserSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
});
export type CreateUser = z.infer<typeof CreateUserSchema>;
