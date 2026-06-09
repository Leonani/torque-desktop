/**
 * Post-build script that patches the main process bundle to fix a
 * Rollup bundling bug with sql.js.
 *
 * PROBLEM:
 * sql.js (and other CJS modules) use the pattern:
 *   var <name> = { exports: {} };
 *   ...
 *   (function(a, l) {
 *     ...
 *     a = void 0;
 *     ...
 *     a.exports = <value>;
 *   })()
 *
 * With Rollup/Vite 6, the IIFE is called with NO arguments (vs old Rollup
 * which passed the module object). So parameter `a` is undefined, and
 * `a.exports = <value>` crashes with:
 *   TypeError: Cannot set properties of undefined (setting 'exports')
 *
 * FIX:
 * Find all single-letter-variable `.exports =` assignments in the bundle
 * that are likely affected by this CJS wrapping issue, and guard them with
 * a typeof check that falls back to globalThis.exports
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
let count = 0;

// Step 1: Find all single-letter variables used with .exports = inside
// CJS module wrappers where the variable might be undefined.
//
// Pattern: <singleLetter>.exports[.<prop>] = <value>
// We look for single-letter vars (a-z, A-Z) used with .exports assignment.
// For each match, verify the variable is indeed undefined in its scope
// by checking if it's a parameter of an IIFE called with no args.
//
// The distinctive sql.js pattern is:
//   <param> = void 0;
// followed later by:
//   <param>.exports = <value>;
//
// But we also patch any single-letter .exports assignment that appears
// to be in a CJS wrapper (preceded by `function(a,` or `(function(a,`).

const exportsAssignRegex = /(\b[a-z]\b)\.exports(\.[a-zA-Z_$][\w]*)?\s*=\s*/g;
let match;

while ((match = exportsAssignRegex.exec(code)) !== null) {
  const varName = match[1];
  const propPath = match[2] || '';
  const fullStart = match.index;
  const fullLen = match[0].length;
  
  // Skip if preceded by $ (e.g. $n.exports — $n is a valid multi-char var).
  // The word boundary \b incorrectly matches between $ and a-z because
  // $ is not a \w character, so we need this extra guard.
  if (fullStart > 0 && code[fullStart - 1] === '$') continue;
  
  // Find the end of the value expression
  // Look for the value by finding the next meaningful token
  const afterMatch = code.substring(fullStart + fullLen);
  const valueMatch = afterMatch.match(/^[^;,)]+/);
  if (!valueMatch) continue;
  const valueStr = valueMatch[0].trim();
  
  // Check if this variable is likely to be a CJS module param
  // by scanning backward to see if it's in an IIFE or function
  const before = code.substring(Math.max(0, fullStart - 500), fullStart);
  
  // Look for the pattern: function(<varName>, ...) or (function(<varName>, ...
  const funcParamRegex = new RegExp(
    `(?:function|=>)\\s*\\([^)]*\\b${varName}\\b[^)]*\\)`,
    'g'
  );
  const paramMatches = [...before.matchAll(funcParamRegex)];
  
  if (paramMatches.length === 0) continue;
  
  const lastParamMatch = paramMatches[paramMatches.length - 1];
  
  // Check if this function has a `= void 0` or similar undefined pattern
  const betweenFuncAndAssign = code.substring(
    lastParamMatch.index + lastParamMatch[0].length,
    fullStart
  );
  
  // Check the argument list of the function call
  // Look for: )() or )(... any call with no args or with args
  const callSite = before.substring(lastParamMatch.index);
  const callParen = callSite.indexOf(')');
  if (callParen === -1) continue;
  
  const afterCallParen = callSite.substring(callParen + 1);
  // If immediately followed by () or (;), this is an IIFE with no args
  // which means the param is undefined
  const isNoArgsCall = /^\s*\(\s*\)/.test(afterCallParen) || 
                       /^\s*;\s*\}\).*\(\)/.test(afterCallParen);
  
  if (!isNoArgsCall) {
    // Check if the variable is explicitly set to void 0 inside the function
    const voidPattern = new RegExp(`${varName}\\s*=\\s*void\\s*0`);
    if (!voidPattern.test(betweenFuncAndAssign)) continue;
  }
  
  // Found a problematic pattern - guard it!
  const fullAssign = code.substring(fullStart, fullStart + fullLen + valueStr.length);
  const guarded = `(typeof ${varName} !== 'undefined' ? ${varName} : globalThis).exports${propPath} = ${valueStr}`;
  
  // Make sure we're not double-patching
  if (fullAssign.includes('typeof')) continue;
  
  code = code.replace(fullAssign, guarded);
  count++;
  
  console.log(`[fix-sqljs] ✅ Parche ${count}: ${fullAssign.substring(0, 60)}... → ${guarded.substring(0, 60)}...`);
}

if (count > 0) {
  // Verify the patch was applied correctly
  const verifyCode = fs.readFileSync(bundlePath, 'utf8');
  const patchedCount = (verifyCode.match(/typeof \w+ !== 'undefined' \? \w+ : globalThis\)\.exports/g) || []).length;
  
  fs.writeFileSync(bundlePath, code, 'utf8');
  console.log(`[fix-sqljs] ✅ Parcheados ${count} patron(es) .exports =`);
  console.log(`[fix-sqljs] ✅ Verificación: ${patchedCount} patrones parchados en total`);
} else {
  // Fallback: try a broader approach - find any .exports = that might fail
  console.log('[fix-sqljs] ⚠️  No se encontraron patrones específicos. Intentando enfoque alternativo...');
  
  // Fallback: find all `a.exports =` patterns where the variable is a
  // single letter and just guard them all. This is broader but safer.
  const broadRegex = /\b([a-z])\b\.exports(\.[a-zA-Z_$][\w]*)?\s*=\s*([^;,)]+)/g;
  let broadMatch;
  let broadCount = 0;
  
  while ((broadMatch = broadRegex.exec(code)) !== null) {
    const varName = broadMatch[1];
    const propPath = broadMatch[2] || '';
    const valueStr = broadMatch[3].trim();
    const fullAssign = broadMatch[0];
    
    if (fullAssign.includes('typeof')) continue;
    if (broadMatch.index > 0 && code[broadMatch.index - 1] === '$') continue;
    
    const guarded = `(typeof ${varName} !== 'undefined' ? ${varName} : globalThis).exports${propPath} = ${valueStr}`;
    code = code.replace(fullAssign, guarded);
    broadCount++;
    console.log(`[fix-sqljs] ✅ (fallback) Parche ${broadCount}: ${fullAssign.substring(0, 60)}...`);
  }
  
  if (broadCount > 0) {
    fs.writeFileSync(bundlePath, code, 'utf8');
    console.log(`[fix-sqljs] ✅ Parcheados ${broadCount} patron(es) .exports = (fallback)`);
  } else {
    console.log('[fix-sqljs] ⚠️  No se encontraron patrones. El build podria fallar.');
  }
}

console.log('[fix-sqljs] ✅ Script completado');
