#!/usr/bin/env tsx
/**
 * Run the global setup manually before tests
 * This is a workaround for Playwright not running globalSetup before webServer
 */
import globalSetup from './global-setup.js'

await globalSetup()
