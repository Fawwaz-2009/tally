import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";   // NOTE: zod/v4 is needed with drizzle‑zod 0.8.x
import { getAuth } from "../lib/auth";
import { InferUser } from "better-auth/types";


export type User = InferUser<ReturnType<typeof getAuth>["options"]>;
