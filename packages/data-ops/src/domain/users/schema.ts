import { createInsertSchema, createSelectSchema } from '@handfish/drizzle-effect'
import { Schema } from 'effect'
// Import from db/schema directly to avoid pulling in better-sqlite3 runtime
import { usersTable } from '../../db/schema'

export const UserInsertSchema = createInsertSchema(usersTable)
export type UserInsert = Schema.Schema.Type<typeof UserInsertSchema>

export const UserSelectSchema = createSelectSchema(usersTable)
export type User = Schema.Schema.Type<typeof UserSelectSchema>

export const CreateUserSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50), Schema.pattern(/^[a-z0-9-]+$/, { message: () => 'ID must be lowercase alphanumeric with hyphens' })),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
})
export type CreateUser = Schema.Schema.Type<typeof CreateUserSchema>
