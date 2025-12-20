import { Effect } from 'effect'
import { MerchantRepo } from './repo'

export class MerchantService extends Effect.Service<MerchantService>()('MerchantService', {
  effect: Effect.gen(function* () {
    const repo = yield* MerchantRepo

    return {
      getById: (id: string) => repo.getById(id),
      getByName: (name: string) => repo.getByName(name),
      getOrCreate: (displayName: string) => repo.getOrCreate(displayName),
      getAllByRecentUsage: repo.getAllByRecentUsage,
      getAll: repo.getAll,
      updateCategory: (id: string, category: string | null) => repo.updateCategory(id, category),
    } as const
  }),
  dependencies: [MerchantRepo.Default],
  accessors: true,
}) {}
