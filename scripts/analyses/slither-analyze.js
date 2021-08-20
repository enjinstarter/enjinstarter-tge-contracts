#!/usr/bin/env node

const shell = require("shelljs");

shell.config.fatal = true;

// https://github.com/crytic/solc-select#usage
shell.exec("solc --version");

// Ensure analyze all contracts
shell.exec("npm run clean");

// https://github.com/crytic/slither#detectors
// Excluded false warning fow the following detectors:
//    - missing-inheritance: https://github.com/crytic/slither/wiki/Detector-Documentation#missing-inheritance
//    - unimplemented-functions: https://github.com/crytic/slither/wiki/Detector-Documentation#unimplemented-functions
shell.exec(`
  slither \
      --exclude timestamp,missing-inheritance,unimplemented-functions \
      .
`);
