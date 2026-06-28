const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(file));
      } else if (file.endsWith('.js')) {
        results.push(file);
      }
    });
  } catch(e) {}
  return results;
}

const files = [...walk('apps/api/src'), ...walk('packages/business'), ...walk('packages/types')];
let fixedCount = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // UUID
  content = content.replace(/const\s+\{\s*v4\s*:\s*uuidv4\s*\}\s*=\s*require\('uuid'\);/g, "import { v4 as uuidv4 } from 'uuid';");
  
  // Express
  content = content.replace(/const\s+express\s*=\s*require\('express'\);/g, "import express from 'express';");

  // `const router = require('express').Router();` inside functions
  content = content.replace(/require\('express'\)\.Router\(\)/g, "Router()");
  
  // router export default
  content = content.replace(/module\.exports\s*=\s*router;/g, "export default router;");

  // router export named
  content = content.replace(/module\.exports\s*=\s*\{\s*([a-zA-Z0-9_]+)\s*\};/g, "export { $1 };");
  
  // module.exports multiple named exports
  content = content.replace(/module\.exports\s*=\s*\{\s*([^}]+)\s*\};/g, "export { $1 };");
  
  // exports
  content = content.replace(/module\.exports\s*=\s*([a-zA-Z0-9_]+);/g, "export default $1;");
  
  // module.exports = (dependencies) => {
  content = content.replace(/module\.exports\s*=\s*\(([^)]*)\)\s*=>\s*\{/g, "export default ($1) => {");

  // Other requires
  content = content.replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*require\('([^']+)'\);/g, "import $1 from '$2';");

  if (original !== content) {
    // Check if we need to add `import { Router } from 'express';`
    if (content.includes('Router()') && !content.includes('import { Router }') && !content.includes('import express')) {
      content = "import { Router } from 'express';\n" + content;
    }
    fs.writeFileSync(file, content);
    fixedCount++;
  }
});
console.log('Fixed ' + fixedCount + ' files');
