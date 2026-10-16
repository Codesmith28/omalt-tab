// tests/helpers.js: Shared test helpers and QML JS module loader
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadModule(filePath, customContext = {}) {
  let code = fs
    .readFileSync(filePath, "utf8")
    .replace(/^\s*\.pragma\s+library\s*;?/gm, "");

  const dir = path.dirname(filePath);
  const context = { console, Math, parseInt, parseFloat, Array, Object, String, Boolean, ...customContext };

  // Parse and resolve QML JS library imports: .import "file.js" as Qualifier
  const importRegex = /^\s*\.import\s+["']([^"']+)["']\s+as\s+([A-Za-z0-9_$]+)\s*;?/gm;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const importRelative = match[1];
    const qualifier = match[2];
    const targetPath = path.resolve(dir, importRelative);
    context[qualifier] = loadModule(targetPath, customContext);
  }
  code = code.replace(importRegex, "");

  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

module.exports = {
  loadModule,
};
