import { Command } from "commander";
import prompts from "prompts";
import { getExcludesFromGitignore } from "./utils/gitignore.js";
import { executeRsync, checkRsyncAvailable } from "./utils/rsync.js";
import { getTemplateSourceDir, getDestinationDir, validateSourceDir, validateDestinationDir } from "./utils/project.js";
import { updateResourceConfigurations } from "./utils/resource-config.js";
import { initializeGitRepository, checkGitAvailable } from "./utils/git.js";

export interface CreateProjectOptions {
  dryRun?: boolean;
  databaseName?: string;
  bucketName?: string;
}

export interface ProjectConfig {
  projectName: string;
  databaseName?: string;
  bucketName?: string;
  dryRun?: boolean;
}

/**
 * Prompt user interactively for project configuration
 */
async function promptForConfig(): Promise<ProjectConfig | null> {
  console.log("\n🎨 Welcome to Orange Starter CLI!\n");
  console.log("Let's set up your new project.\n");

  const response = await prompts(
    [
      {
        type: "text",
        name: "projectName",
        message: "What's your project name? (will be used as Cloudflare Worker name)",
        validate: (value: string) => {
          if (!value) return "Project name is required";
          if (!/^[a-z0-9-_]+$/.test(value)) {
            return "Project name must contain only lowercase letters, numbers, hyphens, and underscores";
          }
          return true;
        },
      },
      {
        type: "confirm",
        name: "configureResources",
        message: "Would you like to configure Cloudflare resources now?",
        initial: false,
      },
      {
        type: (prev: boolean) => (prev ? "text" : null),
        name: "databaseName",
        message: "D1 Database name (leave empty for default: orange-starter):",
        initial: "",
      },
      {
        type: (prev: any, values: any) => (values.configureResources ? "text" : null),
        name: "bucketName",
        message: "R2 Bucket name (leave empty for default: orange-starter):",
        initial: "",
      },
    ],
    {
      onCancel: () => {
        console.log("\n❌ Setup cancelled by user.");
        return false;
      },
    }
  );

  // User cancelled
  if (!response.projectName) {
    return null;
  }

  return {
    projectName: response.projectName,
    databaseName: response.databaseName || undefined,
    bucketName: response.bucketName || undefined,
    dryRun: false,
  };
}

/**
 * Main CLI logic for creating a new project
 */
export async function createProject(projectName: string, options: CreateProjectOptions) {
  console.log(`\n🚀 Creating new project: ${projectName}\n`);

  // Check if rsync is available
  const rsyncAvailable = await checkRsyncAvailable();
  if (!rsyncAvailable) {
    console.error("❌ Error: rsync is not available on your system.");
    console.error("Please install rsync and try again.");
    process.exit(1);
  }

  // Get source and destination paths
  const sourceDir = getTemplateSourceDir();
  const destDir = getDestinationDir(projectName);

  console.log(`📁 Source: ${sourceDir}`);
  console.log(`📁 Destination: ${destDir}\n`);

  // Validate source directory
  const sourceValidation = validateSourceDir(sourceDir);
  if (!sourceValidation.valid) {
    console.error(`❌ ${sourceValidation.error}`);
    process.exit(1);
  }

  // Validate destination directory
  const destValidation = validateDestinationDir(destDir);
  if (!destValidation.valid) {
    console.error(`❌ ${destValidation.error}`);
    process.exit(1);
  }

  // Get exclude patterns from .gitignore files
  console.log("📋 Collecting exclude patterns from .gitignore files...");
  const excludes = await getExcludesFromGitignore(sourceDir);
  console.log(`   Found ${excludes.length} patterns to exclude\n`);

  if (options.dryRun) {
    console.log("🔍 Dry run mode - no files will be copied\n");
  }

  // Execute rsync
  console.log("📦 Copying project files...\n");
  const result = await executeRsync({
    source: sourceDir,
    destination: destDir,
    excludes,
    dryRun: options.dryRun ?? false,
    verbose: true,
  });

  if (result.success) {
    if (!options.dryRun) {
      // Always update configurations (at minimum: worker names and database_id placeholder)
      console.log("\n🔧 Configuring project resources...");
      const resourceNames: { projectName: string; databaseName?: string; bucketName?: string } = {
        projectName,
      };
      if (options.databaseName) resourceNames.databaseName = options.databaseName;
      if (options.bucketName) resourceNames.bucketName = options.bucketName;
      updateResourceConfigurations(destDir, resourceNames);

      // Initialize git repository
      console.log("\n📦 Initializing git repository...");
      const gitAvailable = await checkGitAvailable();
      if (gitAvailable) {
        const gitResult = await initializeGitRepository(destDir);
        if (gitResult.success) {
          console.log(`   ✓ ${gitResult.message}`);
          console.log(`   ✓ All files staged and ready for your first commit`);
        } else {
          console.log(`   ⚠️  ${gitResult.message}`);
          console.log(`   You can initialize git manually with: git init`);
        }
      } else {
        console.log(`   ⚠️  Git not found on your system`);
        console.log(`   You can initialize git later after installing it`);
      }
    }

    console.log("\n✅ Success! Project created successfully.");
    if (!options.dryRun) {
      console.log(`\nNext steps:`);
      console.log(`  cd ${projectName}`);
      console.log(`  pnpm install`);
      console.log(`  pnpm --filter=@repo/data-ops build`);
      console.log(`  pnpm --filter=@repo/data-ops db:migrate:local`);
      console.log(`  pnpm dev`);
      console.log(`\n💡 Important notes:`);
      console.log(`  • Git repository initialized - all files are staged and committed`);
      console.log(`  • Configure your .env file (review .env.example for reference).`);
      console.log(`  • The database migrations must be applied before starting the web app.`);
      console.log(`  • Worker names have been set to: ${projectName}-web and ${projectName}-data-ops`);

      console.log(`\n📦 Cloudflare Resources Setup:`);
      const dbName = options.databaseName || "orange-starter";
      const bucketNameValue = options.bucketName || "orange-starter";

      console.log(`  1. Create your D1 database:`);
      console.log(`     wrangler d1 create ${dbName}`);
      console.log(`  2. Copy the database_id from the output and update it in:`);
      console.log(`     • apps/web/wrangler.jsonc`);
      console.log(`     • packages/data-ops/wrangler.jsonc`);
      console.log(`     (Look for: "database_id": "REPLACE_WITH_YOUR_D1_DATABASE_ID")`);
      console.log(`  3. Create your R2 bucket:`);
      console.log(`     wrangler r2 bucket create ${bucketNameValue}`);
      console.log(`\n  💡 Note: The data-ops wrangler config is only for managing migrations,`);
      console.log(`     not for deploying a worker.`);
    }
  } else {
    console.error("\n❌ Error: Failed to copy project files.");
    if (result.stderr) {
      console.error(result.stderr);
    }
    process.exit(1);
  }
}

/**
 * Create and configure the CLI program
 */
export function createCliProgram(): Command {
  const program = new Command();

  program
    .name("orange-starter")
    .description("Create a new project from the Orange Starter template")
    .version("0.0.0")
    .argument("[project-name]", "Name of the project to create (optional, will prompt if not provided)")
    .option("--dry-run", "Run without actually copying files")
    .option("--database-name <name>", "Custom name for the D1 database (default: orange-starter)")
    .option("--bucket-name <name>", "Custom name for the R2 bucket (default: orange-starter)")
    .action(async (projectName: string | undefined, options: CreateProjectOptions) => {
      try {
        // If no project name provided, use interactive mode
        if (!projectName) {
          const config = await promptForConfig();
          if (!config) {
            process.exit(0); // User cancelled
          }
          const projectOptions: CreateProjectOptions = {};
          if (options.dryRun !== undefined) projectOptions.dryRun = options.dryRun;
          if (config.dryRun !== undefined) projectOptions.dryRun = config.dryRun;
          const dbName = options.databaseName || config.databaseName;
          if (dbName) projectOptions.databaseName = dbName;
          const bucketName = options.bucketName || config.bucketName;
          if (bucketName) projectOptions.bucketName = bucketName;
          await createProject(config.projectName, projectOptions);
        } else {
          // Use command line arguments
          await createProject(projectName, options);
        }
      } catch (error) {
        console.error("\n❌ An unexpected error occurred:");
        console.error(error);
        process.exit(1);
      }
    });

  return program;
}
