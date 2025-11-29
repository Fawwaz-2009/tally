import { spawn } from "node:child_process";

export interface GitInitResult {
  success: boolean;
  message: string;
}

/**
 * Initialize a git repository in the project directory
 */
export async function initializeGitRepository(projectDir: string): Promise<GitInitResult> {
  try {
    // Initialize git repository
    await runGitCommand(projectDir, ["init"]);

    // Add all files
    await runGitCommand(projectDir, ["add", "."]);

    // Create initial commit
    await runGitCommand(projectDir, ["commit", "-m", "Initial commit from Orange Starter"]);

    return {
      success: true,
      message: "Git repository initialized with initial commit",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to initialize git repository",
    };
  }
}

/**
 * Run a git command in the specified directory
 */
function runGitCommand(cwd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const git = spawn("git", args, { cwd });

    let stderr = "";

    git.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    git.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Git command failed: ${stderr}`));
      }
    });

    git.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Check if git is available on the system
 */
export async function checkGitAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const check = spawn("which", ["git"]);
    check.on("close", (code) => {
      resolve(code === 0);
    });
    check.on("error", () => {
      resolve(false);
    });
  });
}
