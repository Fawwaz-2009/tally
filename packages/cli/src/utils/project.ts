import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Get the template source directory (the root of the starter project)
 * This assumes the CLI is running from packages/cli/dist after build
 */
export function getTemplateSourceDir(): string {
  // When running from dist, we need to go up to the project root
  // dist/bin.js -> dist -> packages/cli -> packages -> root
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // From dist/ go up 3 levels to reach project root
  const sourceDir = resolve(__dirname, "..", "..", "..");

  return sourceDir;
}

/**
 * Get the destination directory based on project name and current working directory
 */
export function getDestinationDir(projectName: string): string {
  return resolve(process.cwd(), projectName);
}

/**
 * Validate that the source directory exists and looks like our starter project
 */
export function validateSourceDir(sourceDir: string): { valid: boolean; error?: string } {
  if (!existsSync(sourceDir)) {
    return {
      valid: false,
      error: `Source directory does not exist: ${sourceDir}`,
    };
  }

  // Check for some expected files/directories
  const expectedPaths = ["package.json", "packages", "apps"];
  const missing = expectedPaths.filter((path) => !existsSync(join(sourceDir, path)));

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Source directory does not appear to be a valid starter project. Missing: ${missing.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Validate destination directory (should not exist)
 */
export function validateDestinationDir(destDir: string): { valid: boolean; error?: string } {
  if (existsSync(destDir)) {
    return {
      valid: false,
      error: `Destination directory already exists: ${destDir}`,
    };
  }

  return { valid: true };
}
