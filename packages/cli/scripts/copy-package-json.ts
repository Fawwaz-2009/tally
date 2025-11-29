import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

console.log("[Build] Copying package.json ...");

// Read the package.json
const packageJsonPath = join(process.cwd(), "package.json");
const json = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

// Create a minimal package.json for distribution
const pkg = {
  name: json.name,
  version: json.version,
  type: json.type,
  description: json.description,
  main: "bin.js",
  bin: "bin.js",
  engines: json.engines,
  dependencies: json.dependencies,
  peerDependencies: json.peerDependencies,
  repository: json.repository,
  author: json.author,
  license: json.license,
  bugs: json.bugs,
  homepage: json.homepage,
  tags: json.tags,
  keywords: json.keywords,
};

// Write to dist
const distPackageJsonPath = join(process.cwd(), "dist", "package.json");
writeFileSync(distPackageJsonPath, JSON.stringify(pkg, null, 2));

console.log("[Build] Build completed.");
