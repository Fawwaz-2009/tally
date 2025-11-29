import { Effect } from "effect";
import { TodoRepo } from "./repo";
import { Todo } from "./schema";

export class TodoService extends Effect.Service<TodoService>()("TodoService", {
  effect: Effect.gen(function* () {
    const repo = yield* TodoRepo;

    return {
      getTodos: repo.getTodos,
      createTodo: (data: Todo) => repo.createTodo(data),
    } as const;
  }),
  dependencies: [TodoRepo.Default],
  accessors: true,
}) {}
