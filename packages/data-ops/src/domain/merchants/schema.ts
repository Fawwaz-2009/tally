import { createSelectSchema } from '@handfish/drizzle-effect'
import { Schema } from 'effect'
import { merchantsTable } from '../../db/schema'

// Drizzle-generated schema for database operations
export const MerchantSelectSchema = createSelectSchema(merchantsTable)
export type Merchant = Schema.Schema.Type<typeof MerchantSelectSchema>

// Input schema for updating merchant category
export const UpdateMerchantCategorySchema = Schema.Struct({
  id: Schema.String,
  category: Schema.NullOr(Schema.String),
})
export type UpdateMerchantCategory = Schema.Schema.Type<typeof UpdateMerchantCategorySchema>
