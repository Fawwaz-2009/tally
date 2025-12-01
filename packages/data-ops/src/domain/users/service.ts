import { Effect } from "effect";
import { UserRepo } from "./repo";
import { CreateUser } from "./schema";

export class UserService extends Effect.Service<UserService>()("UserService", {
  effect: Effect.gen(function* () {
    const repo = yield* UserRepo;

    return {
      createUser: (data: CreateUser) => repo.create(data),
      getUserById: (id: string) => repo.getById(id),
      getAllUsers: repo.getAll,
      getUserCount: repo.count,
      updateUser: (id: string, data: { name: string }) => repo.update(id, data),
    } as const;
  }),
  dependencies: [UserRepo.Default],
  accessors: true,
}) {}
