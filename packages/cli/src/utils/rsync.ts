import { spawn } from "node:child_process";
import { resolve } from "node:path";

export interface RsyncOptions {
  source: string;
  destination: string;
  excludes?: string[];
  dryRun?: boolean;
  verbose?: boolean;
}

export interface RsyncResult {
  success: boolean;
  code: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
}

/**
 * Execute rsync command with the provided options
 */
export async function executeRsync(options: RsyncOptions): Promise<RsyncResult> {
  const { source, destination, excludes = [], dryRun = false, verbose = true } = options;

  // Build rsync arguments
  const args: string[] = [];

  // Basic options
  args.push("-a"); // Archive mode (recursive, preserve permissions, etc.)

  if (verbose) {
    args.push("-v"); // Verbose
    args.push("--progress"); // Show progress
  }

  if (dryRun) {
    args.push("--dry-run"); // Dry run mode
  }

  // Add excludes
  for (const exclude of excludes) {
    args.push("--exclude", exclude);
  }

  // Ensure source ends with / to copy contents, not the directory itself
  const sourcePath = source.endsWith("/") ? source : `${source}/`;
  args.push(sourcePath, destination);

  return new Promise((resolvePromise, reject) => {
    const rsync = spawn("rsync", args);

    let stdout = "";
    let stderr = "";

    rsync.stdout?.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      if (verbose) {
        process.stdout.write(text);
      }
    });

    rsync.stderr?.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      if (verbose) {
        process.stderr.write(text);
      }
    });

    rsync.on("close", (code, signal) => {
      resolvePromise({
        success: code === 0,
        code,
        signal,
        stdout,
        stderr,
      });
    });

    rsync.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Check if rsync is available on the system
 */
export async function checkRsyncAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const check = spawn("which", ["rsync"]);
    check.on("close", (code) => {
      resolve(code === 0);
    });
    check.on("error", () => {
      resolve(false);
    });
  });
}
