/**
 * Post-build script that patches the main process bundle to fix a
 * Rollup bundling bug with sql.js.
 *
 * PROBLEM:
 * sql.js uses the pattern:
 *   var M = { exports: {} };
 *   (function(t, e) {
 *     ...
 *     t = void 0;
 *     ...
 *     t.exports = <value>;
 *   })(M);
 *
 * In CJS `t` starts as the exports object but gets set to `void 0`.
 * Then `t.exports = <value>` crashes because t is undefined.
 * In ESM context, Rollup bundles this as-is, causing the crash.
 *
 * FIX:
 * Find the sql.js IIFE by its distinctive structure:
 *   var <name> = { exports: {} };
 *   (function(<param>, ...) {
 * and its closing:
 *   })(<name>);
 *
 * Then replace ALL `<param>.exports = <value>` inside it with:
 *   (typeof <param> !== 'undefined' ? <param> : globalThis).exports = <value>
 * so that when the variable is undefined, it falls back to globalThis.exports
 * (polyfilled in src/main/index.ts).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.join(__dirname, 'dist/main/index.js');

if (!fs.existsSync(bundlePath)) {
  console.error(`[fix-sqljs] ERROR: No se encuentra ${bundlePath}`);
  process.exit(1);
}

let code = fs.readFileSync(bundlePath, 'utf8');
let modified = false;
let count = 0;

// Step 1: Find ALL var <name> = { exports: {} }; followed by (function(<param>, ...) {
// We need to find the sql.js IIFE, which has <param> = void 0 inside it.
const iifeStartRegex = /var (\w+) = \{ exports: \{\} \};\n\(function\((\w+),\s*(\w+)\)\s*\{/g;
let startMatch;

while ((startMatch = iifeStartRegex.exec(code)) !== null) {
  const moduleName = startMatch[1];
  const exportsParam = startMatch[2];
  const iifeStart = startMatch.index;

  // Look for the closing: })(<moduleName>);
  const closeRegex = new RegExp(`\\}\\)\\(${moduleName}\\);`);
  const endMatch = closeRegex.exec(code);

  if (!endMatch) continue;

  const iifeEnd = endMatch.index + endMatch[0].length;
  const bodyStart = startMatch.index + startMatch[0].length;
  const body = code.substring(bodyStart, endMatch.index);

  // Step 2: Check if this IIFE has the sql.js pattern: <param> = void 0
  const voidRegex = new RegExp(`${exportsParam}\\s*=\\s*void\\s*0`);
  if (!voidRegex.test(body)) continue;

  // This IS the sql.js IIFE! Patch all <exportsParam>.exports[.<prop>] = <value> within it.
  // Matches both:
  //   t.exports = r
  //   t.exports.default = r
  const exportsRegex = new RegExp(`${exportsParam}\\.exports(\\.[a-zA-Z_$][\\w]*)?\\s*=\\s*([^;,]+)`, 'g');
  let bodyMatch;
  const patches = [];

  while ((bodyMatch = exportsRegex.exec(body)) !== null) {
    const fullMatch = bodyMatch[0];
    const propPath = bodyMatch[1] || '';
    const value = bodyMatch[2].trim();

    if (fullMatch.includes('typeof')) continue;

    const patched = `(typeof ${exportsParam} !== 'undefined' ? ${exportsParam} : globalThis).exports${propPath} = ${value}`;
    patches.push({ fullMatch, patched });
    console.log(`[fix-sqljs] ✅ Patron ${++count}: ${fullMatch} → ${patched}`);
  }

  // Apply patches to the full code (iterate backwards to preserve positions)
  for (const { fullMatch, patched } of patches) {
    code = code.replace(fullMatch, patched);
  }

  console.log(`[fix-sqljs] 🎯 sql.js IIFE detectada: var ${moduleName} = { exports: {} } / param: ${exportsParam}`);
}

if (count > 0) {
  fs.writeFileSync(bundlePath, code, 'utf8');
  modified = true;
  console.log(`[fix-sqljs] ✅ Parcheados ${count} patron(es) .exports =`);
} else {
  console.log('[fix-sqljs] ⚠️  No se encontraron patrones de sql.js para parchear. El build podria fallar.');
}

console.log('[fix-sqljs] ✅ Script completado');
