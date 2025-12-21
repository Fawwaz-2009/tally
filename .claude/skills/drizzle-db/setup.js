#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt, defaultValue) {
  return new Promise((resolve) => {
    const displayPrompt = defaultValue
      ? `${prompt} [${defaultValue}]: `
      : `${prompt}: `;

    rl.question(displayPrompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function confirm(prompt, defaultValue = true) {
  return new Promise((resolve) => {
    const defaultStr = defaultValue ? 'Y/n' : 'y/N';
    rl.question(`${prompt} [${defaultStr}]: `, (answer) => {
      answer = answer.trim().toLowerCase();
      if (answer === '') {
        resolve(defaultValue);
      } else {
        resolve(answer === 'y' || answer === 'yes');
      }
    });
  });
}

async function setup() {
  console.log('\nDrizzle DB Skill Setup\n');
  console.log('This skill allows Claude to query your database using Drizzle ORM.\n');

  // Check for existing configuration
  const configFilePath = path.join(__dirname, '.config.json');
  let existingConfig = null;

  if (fs.existsSync(configFilePath)) {
    try {
      existingConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
      console.log('Found existing configuration. Press Enter to keep current values.\n');
    } catch (err) {
      console.log('Warning: Could not read existing config, starting fresh.\n');
    }
  }

  // Ask for drizzle config path (use existing as default)
  const defaultConfigPath = existingConfig?.drizzleConfigPath || './drizzle.config.ts';
  const configPath = await question(
    'Path to your drizzle.config.ts (or .js)',
    defaultConfigPath
  );

  // Verify the file exists (4 levels up: setup.js -> drizzle-db -> skills -> .claude -> project)
  const fullPath = path.resolve(process.cwd(), '../../../..', configPath);
  if (fs.existsSync(fullPath)) {
    console.log(`\n✓ Config found: ${fullPath}`);
  } else {
    console.log(`\n⚠️  Warning: ${configPath} not found at ${fullPath}`);
    console.log('Make sure this path is correct relative to your project root.');
  }

  // Ask for read-only mode (use existing as default)
  const defaultReadOnly = existingConfig?.readOnly !== undefined ? existingConfig.readOnly : true;
  const readOnly = await confirm(
    '\nEnable read-only mode? (prevents INSERT/UPDATE/DELETE)',
    defaultReadOnly
  );

  // Save configuration
  const config = {
    drizzleConfigPath: configPath,
    readOnly: readOnly
  };

  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));

  console.log('\n✓ Configuration saved!');
  console.log(`  - Drizzle config: ${config.drizzleConfigPath}`);
  console.log(`  - Read-only mode: ${readOnly ? 'enabled' : 'disabled'}`);
  console.log(`\nNote: tsx is required to load TypeScript configs.`);
  console.log(`Install it in your project: npm install -D tsx\n`);

  rl.close();
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  rl.close();
  process.exit(1);
});
