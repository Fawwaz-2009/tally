import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

export interface ResourceNames {
  projectName?: string
  databaseName?: string
  bucketName?: string
}

/**
 * Update resource names in wrangler.jsonc files
 */
export function updateWranglerConfig(filePath: string, resourceNames: ResourceNames, isDataOps: boolean = false): void {
  let content = readFileSync(filePath, "utf-8")
  let updated = false

  // Update worker name
  if (resourceNames.projectName) {
    const workerName = isDataOps ? `${resourceNames.projectName}-data-ops` : `${resourceNames.projectName}-web`

    const nameRegex = /"name":\s*"[^"]+"/
    if (nameRegex.test(content)) {
      content = content.replace(nameRegex, `"name": "${workerName}"`)
      updated = true
    }
  }

  // Replace database_id with a clear placeholder
  const dbIdRegex = /"database_id":\s*"[^"]+"/g
  if (dbIdRegex.test(content)) {
    content = content.replace(dbIdRegex, `"database_id": "REPLACE_WITH_YOUR_D1_DATABASE_ID"`)
    updated = true
  }

  if (resourceNames.databaseName) {
    // Replace database_name: "orange-starter" with the new name
    const dbRegex = /"database_name":\s*"orange-starter"/g
    if (dbRegex.test(content)) {
      content = content.replace(dbRegex, `"database_name": "${resourceNames.databaseName}"`)
      updated = true
    }
  }

  if (resourceNames.bucketName) {
    // Replace bucket_name: "orange-starter" with the new name
    const bucketRegex = /"bucket_name":\s*"orange-starter"/g
    if (bucketRegex.test(content)) {
      content = content.replace(bucketRegex, `"bucket_name": "${resourceNames.bucketName}"`)
      updated = true
    }
  }

  if (updated) {
    writeFileSync(filePath, content)
  }
}

/**
 * Update database name in migration scripts in package.json
 */
export function updateMigrationScripts(filePath: string, databaseName: string): void {
  const content = readFileSync(filePath, "utf-8")
  const packageJson = JSON.parse(content)

  let updated = false

  // Update db:migrate:local script
  if (packageJson.scripts?.["db:migrate:local"]) {
    packageJson.scripts["db:migrate:local"] = packageJson.scripts["db:migrate:local"].replace(
      /wrangler d1 migrations apply orange-starter/g,
      `wrangler d1 migrations apply ${databaseName}`
    )
    updated = true
  }

  // Update db:migrate:production script
  if (packageJson.scripts?.["db:migrate:production"]) {
    packageJson.scripts["db:migrate:production"] = packageJson.scripts["db:migrate:production"].replace(
      /wrangler d1 migrations apply orange-starter/g,
      `wrangler d1 migrations apply ${databaseName}`
    )
    updated = true
  }

  if (updated) {
    writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + "\n")
  }
}

/**
 * Update the root package.json with the project name
 */
export function updateRootPackageJson(filePath: string, projectName: string): void {
  const content = readFileSync(filePath, "utf-8")
  const packageJson = JSON.parse(content)

  // Update the name field
  packageJson.name = projectName

  writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + "\n")
}

/**
 * Update all resource configurations in the project
 */
export function updateResourceConfigurations(projectDir: string, resourceNames: ResourceNames): void {
  const updates: Array<{ file: string; action: string }> = []

  // Update root package.json with project name
  if (resourceNames.projectName) {
    const rootPackagePath = join(projectDir, "package.json")
    updateRootPackageJson(rootPackagePath, resourceNames.projectName)
    updates.push({ file: "package.json", action: "updated project name" })
  }

  // Update apps/web/wrangler.jsonc
  const webWranglerPath = join(projectDir, "apps", "web", "wrangler.jsonc")
  updateWranglerConfig(webWranglerPath, resourceNames, false)
  updates.push({ file: "apps/web/wrangler.jsonc", action: "updated worker name and database_id placeholder" })

  // Update packages/data-ops/wrangler.jsonc
  const dataOpsWranglerPath = join(projectDir, "packages", "data-ops", "wrangler.jsonc")
  updateWranglerConfig(dataOpsWranglerPath, resourceNames, true)
  updates.push({ file: "packages/data-ops/wrangler.jsonc", action: "updated worker name and database_id placeholder" })

  // Update packages/data-ops/package.json migration scripts
  if (resourceNames.databaseName) {
    const dataOpsPackagePath = join(projectDir, "packages", "data-ops", "package.json")
    updateMigrationScripts(dataOpsPackagePath, resourceNames.databaseName)
    updates.push({ file: "packages/data-ops/package.json", action: "updated migration scripts" })
  }

  // Log updates
  if (updates.length > 0) {
    console.log("\n📝 Updated project configurations:")
    updates.forEach(({ action, file }) => {
      console.log(`   • ${file}: ${action}`)
    })
  }
}
