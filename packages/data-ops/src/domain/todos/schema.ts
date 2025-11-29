import { createInsertSchema } from "drizzle-zod";
import { todosTable } from "../../db";
import z from "zod/v4";

export const TodoTableSchema = createInsertSchema(todosTable);
export type TodoTable = z.infer<typeof TodoTableSchema>;

export const TodoSchema = TodoTableSchema;

export type Todo = z.infer<typeof TodoSchema>;

