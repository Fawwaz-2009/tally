import { Effect } from "effect";
import { todosTable } from "../../db";
import { DbClient } from "../../layers";
import { Todo } from "./schema";
import { withDbTryPromise } from "../shared/utils";

export class TodoRepo extends Effect.Service<TodoRepo>()("TodoRepo", {
  effect: Effect.gen(function* () {
    const db = yield* DbClient;
    return {
      createTodo: Effect.fn("todoRepo.createTodo")(
        function* (todo: Todo) {
          return yield* withDbTryPromise(db.insert(todosTable).values(todo).returning().get());
        },
        Effect.tap((r) => {
          return Effect.annotateCurrentSpan("io.output", r);
        })
      ),
      getTodos: Effect.fn("todoRepo.getTodos")(
        function* () {
          return yield* withDbTryPromise(db.select().from(todosTable).all());
        },
        Effect.tap((r) => {
          return Effect.annotateCurrentSpan("io.output", r);
        })
      ),
    } as const;
  }),
  accessors: true,
  dependencies: [DbClient.Default],
}) {}
