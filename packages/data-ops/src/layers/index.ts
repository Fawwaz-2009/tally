// runtime/db-client.ts
import { Effect } from "effect";
import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import * as appSchemas from "../db/schema";
import * as authSchemas from "../db/auth-schema";
import { BlobStorageError } from "../errors";

const schema = { ...appSchemas, ...authSchemas };
type DrizzleDB = DrizzleD1Database<typeof schema>;

let db: DrizzleDB | undefined;

export function initDatabase(bindingDb: D1Database) {
  db = drizzle(bindingDb);
}

export function getDb(): DrizzleDB {
  if (!db) throw new Error("Database not initialized");
  return db;
}

export class DbClient extends Effect.Service<DbClient>()("DbClient", {
  effect: Effect.gen(function* () {
    return getDb();
  }),
  accessors: true,
}) {}

// CACHE
let kv: KVNamespace | undefined;

export function initKv(bindingKv: KVNamespace) {
  kv = bindingKv;
}

function getKv(): KVNamespace {
  if (!kv) throw new Error("KV not initialized");
  return kv;
}

export class KvClient extends Effect.Service<KvClient>()("KvClient", {
  effect: Effect.gen(function* () {
    return getKv();
  }),
  accessors: true,
}) {}

// Bucket
let bucket: R2Bucket | undefined;

export function initBucket(bindingKv: R2Bucket) {
  bucket = bindingKv;
}

function getBucket(): R2Bucket {
  if (!bucket) throw new Error("bucket not initialized");
  return bucket;
}

export class BucketClient extends Effect.Service<BucketClient>()("BucketClient", {
  effect: Effect.gen(function* () {
    const bucket = getBucket();

    const get = (key: Parameters<R2Bucket["get"]>[0], options?: Parameters<R2Bucket["get"]>[1]) =>
      Effect.tryPromise({
        try: () => bucket.get(key, options),
        catch: (e) => new BlobStorageError({ message: e instanceof Error ? e.message : "Unknown error" }),
      });

    const put = (key: Parameters<R2Bucket["put"]>[0], value: Parameters<R2Bucket["put"]>[1], options?: Parameters<R2Bucket["put"]>[2]) =>
      Effect.tryPromise({
        try: () => bucket.put(key, value, options),
        catch: (e) => new BlobStorageError({ message: e instanceof Error ? e.message : "Unknown error" }),
      });

    const delete_ = (key: string) =>
      Effect.tryPromise({
        try: () => bucket.delete(key),
        catch: (e) => new BlobStorageError({ message: e instanceof Error ? e.message : "Unknown error" }),
      });

    return {
      get,
      put,
      delete: delete_,
    };
  }),
  accessors: true,
}) {}

export type RUNTIME_ENVS = {
  BASE_FRONTEND_URL: string;
  NODE_ENV: string;
  ENABLE_TELEMETRY?: string;
  SIGNOZ_ACCESS_TOKEN?: string;
  SIGNOZ_ENDPOINT?: string;
};

let RUNTIME_ENVS: RUNTIME_ENVS | undefined;

export const initRuntimeEnvs = (envs: RUNTIME_ENVS) => {
  RUNTIME_ENVS = envs;
};

export const getRuntimeEnvs = (): RUNTIME_ENVS => {
  if (!RUNTIME_ENVS) throw new Error("RUNTIME_ENVS not initialized");
  return RUNTIME_ENVS;
};

export class RuntimeEnvs extends Effect.Service<RuntimeEnvs>()("RuntimeEnvs", {
  effect: Effect.gen(function* () {
    return getRuntimeEnvs();
  }),
  accessors: true,
}) {}

// Full Cloudflare Env - used for tRPC SSR calls via unstable_localLink
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fullEnv: any | undefined;

export const initFullEnv = <T>(env: T) => {
  fullEnv = env;
};

export const getFullEnv = <T>(): T => {
  if (!fullEnv) throw new Error("Full env not initialized");
  return fullEnv as T;
};

// Export telemetry layers
export { TelemetryLayer, WorkerObservability, FrontendObservability, SchedulerObservability } from "./telemetry";
