// runtime/db-client.ts
import { Effect } from "effect";
import { drizzle as drizzleBetterSqlite, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as appSchemas from "../db/schema";
import { BlobStorageError } from "../errors";
import * as fs from "node:fs";
import * as path from "node:path";

const schema = { ...appSchemas };
type DrizzleDB = BetterSQLite3Database<typeof schema>;

let db: DrizzleDB | undefined;
let sqliteDb: Database.Database | undefined;

export function initDatabase(dbPath: string) {
  if (!dbPath) {
    throw new Error("initDatabase requires a database path");
  }

  // Ensure the directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  sqliteDb = new Database(dbPath);
  db = drizzleBetterSqlite(sqliteDb, { schema });
}

export function getDb(): DrizzleDB {
  if (!db) throw new Error("Database not initialized");
  return db;
}

export function getSqliteDb(): Database.Database {
  if (!sqliteDb) throw new Error("SQLite database not initialized");
  return sqliteDb;
}

export class DbClient extends Effect.Service<DbClient>()("DbClient", {
  effect: Effect.gen(function* () {
    return getDb();
  }),
  accessors: true,
}) {}

// CACHE - Filesystem-based KV store for Node.js
let kvPath: string | undefined;

export function initKv(storagePath: string) {
  if (!storagePath) {
    throw new Error("initKv requires a storage path");
  }
  kvPath = storagePath;
  if (!fs.existsSync(kvPath)) {
    fs.mkdirSync(kvPath, { recursive: true });
  }
}

function getKvPath(): string {
  if (!kvPath) throw new Error("KV not initialized");
  return kvPath;
}

// Simple filesystem-based KV interface
interface KvStore {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

function createKvStore(): KvStore {
  const basePath = getKvPath();
  return {
    get: async (key: string) => {
      const filePath = path.join(basePath, encodeURIComponent(key));
      try {
        return fs.readFileSync(filePath, "utf-8");
      } catch {
        return null;
      }
    },
    put: async (key: string, value: string) => {
      const filePath = path.join(basePath, encodeURIComponent(key));
      fs.writeFileSync(filePath, value, "utf-8");
    },
    delete: async (key: string) => {
      const filePath = path.join(basePath, encodeURIComponent(key));
      try {
        fs.unlinkSync(filePath);
      } catch {
        // Ignore if file doesn't exist
      }
    },
  };
}

export class KvClient extends Effect.Service<KvClient>()("KvClient", {
  effect: Effect.gen(function* () {
    return createKvStore();
  }),
  accessors: true,
}) {}

// Bucket - Filesystem-based blob storage
let bucketPath: string | undefined;

export function initBucket(storagePath: string) {
  if (!storagePath) {
    throw new Error("initBucket requires a storage path");
  }
  bucketPath = storagePath;
  if (!fs.existsSync(bucketPath)) {
    fs.mkdirSync(bucketPath, { recursive: true });
  }
}

function getBucketPath(): string {
  if (!bucketPath) throw new Error("Bucket not initialized");
  return bucketPath;
}

// Object metadata stored alongside files
interface FileMetadata {
  contentType?: string;
  contentLength?: number;
  etag?: string;
  uploaded: string;
  customMetadata?: Record<string, string>;
}

// Simplified bucket object interface for Node.js
interface BucketObject {
  key: string;
  body: ReadableStream<Uint8Array> | null;
  bodyUsed: boolean;
  arrayBuffer: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
  writeHttpMetadata: (headers: Headers) => void;
  httpMetadata?: { contentType?: string };
}

export class BucketClient extends Effect.Service<BucketClient>()("BucketClient", {
  effect: Effect.gen(function* () {
    const basePath = getBucketPath();

    const getFilePath = (key: string) => path.join(basePath, key);
    const getMetaPath = (key: string) => path.join(basePath, `${key}.meta.json`);

    const get = (key: string) =>
      Effect.try({
        try: (): BucketObject | null => {
          const filePath = getFilePath(key);
          if (!fs.existsSync(filePath)) return null;

          const buffer = fs.readFileSync(filePath);
          let metadata: FileMetadata = { uploaded: new Date().toISOString() };
          try {
            const metaContent = fs.readFileSync(getMetaPath(key), "utf-8");
            metadata = JSON.parse(metaContent);
          } catch {
            // No metadata file
          }

          return {
            key,
            body: null,
            bodyUsed: false,
            arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
            text: async () => buffer.toString("utf-8"),
            writeHttpMetadata: (headers: Headers) => {
              if (metadata.contentType) {
                headers.set("content-type", metadata.contentType);
              }
            },
            httpMetadata: { contentType: metadata.contentType },
          };
        },
        catch: (e) => new BlobStorageError({ message: e instanceof Error ? e.message : "Unknown error" }),
      });

    const put = (key: string, value: ArrayBuffer | Buffer | Uint8Array | string, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }) =>
      Effect.try({
        try: () => {
          const filePath = getFilePath(key);
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          let buffer: Buffer;
          if (typeof value === "string") {
            buffer = Buffer.from(value);
          } else if (Buffer.isBuffer(value)) {
            buffer = value;
          } else if (value instanceof Uint8Array) {
            buffer = Buffer.from(value);
          } else {
            // ArrayBuffer
            buffer = Buffer.from(new Uint8Array(value));
          }
          fs.writeFileSync(filePath, buffer);

          // Store metadata
          const metadata: FileMetadata = {
            contentType: options?.httpMetadata?.contentType,
            contentLength: buffer.length,
            etag: `"${Date.now()}"`,
            uploaded: new Date().toISOString(),
            customMetadata: options?.customMetadata,
          };
          fs.writeFileSync(getMetaPath(key), JSON.stringify(metadata));

          return { key, etag: metadata.etag };
        },
        catch: (e) => new BlobStorageError({ message: e instanceof Error ? e.message : "Unknown error" }),
      });

    const delete_ = (key: string) =>
      Effect.try({
        try: () => {
          const filePath = getFilePath(key);
          const metaPath = getMetaPath(key);
          try {
            fs.unlinkSync(filePath);
          } catch {
            // Ignore
          }
          try {
            fs.unlinkSync(metaPath);
          } catch {
            // Ignore
          }
        },
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
  // Ollama config for AI extraction
  OLLAMA_HOST: string;
  OLLAMA_MODEL: string;
  // Telemetry
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

// Full App Env - used for tRPC SSR calls via unstable_localLink
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
