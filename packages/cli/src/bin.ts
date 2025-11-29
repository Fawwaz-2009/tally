#!/usr/bin/env node

import { createCliProgram } from "./Cli.js";

// Create and run the CLI program
const program = createCliProgram();
program.parse(process.argv);
