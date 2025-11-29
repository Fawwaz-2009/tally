import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import fg from "fast-glob";
import ignore from "ignore";

/**
 * Find all .gitignore files in a directory tree
 */
export async function findGitignoreFiles(rootDir: string): Promise<string[]> {
  const gitignoreFiles = await fg("**/.gitignore", {
    cwd: rootDir,
    absolute: true,
    dot: true,
    followSymbolicLinks: false,
  });

  return gitignoreFiles;
}

/**
 * Parse a .gitignore file and return its patterns
 */
export function parseGitignoreFile(filePath: string): string[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  return lines.map((line) => line.trim()).filter((line) => line && !line.startsWith("#")); // Remove empty lines and comments
}

/**
 * Collect all gitignore patterns from a directory and its subdirectories
 */
export async function collectGitignorePatterns(rootDir: string): Promise<string[]> {
  const gitignoreFiles = await findGitignoreFiles(rootDir);
  const allPatterns: string[] = [];

  for (const gitignoreFile of gitignoreFiles) {
    const patterns = parseGitignoreFile(gitignoreFile);
    allPatterns.push(...patterns);
  }

  // Remove duplicates
  return [...new Set(allPatterns)];
}

/**
 * Convert gitignore patterns to rsync exclude patterns
 */
export function gitignoreToRsyncExcludes(patterns: string[]): string[] {
  // Only add minimal essentials that must always be excluded
  const essentialExcludes = [
    ".git", // Never copy git repository
    "packages/cli/dist", // Don't copy the CLI's own build output
  ];

  // Combine with gitignore patterns (which should cover everything else)
  const allPatterns = [...essentialExcludes, ...patterns];

  // Convert to rsync format and remove duplicates
  return [...new Set(allPatterns)];
}

/**
 * Main utility function to get all exclude patterns from gitignore files
 */
export async function getExcludesFromGitignore(rootDir: string): Promise<string[]> {
  const patterns = await collectGitignorePatterns(rootDir);
  return gitignoreToRsyncExcludes(patterns);
}
