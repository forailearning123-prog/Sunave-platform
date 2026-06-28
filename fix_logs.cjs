const fs = require('fs');
const files = [
  'apps/api/src/routes/ai.js',
  'apps/api/src/routes/conversations.js',
  'apps/api/src/routes/dashboard.js',
  'apps/api/src/routes/prompts.js',
  'apps/api/src/routes/runtime.js',
  'apps/api/src/services/agentRuntime.js',
  'apps/api/src/services/integrationService.js',
  'apps/api/src/services/integrationServiceEnhanced.js',
  'apps/api/src/server.js',
  'apps/web/src/server.js'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    let o = c;
    c = c.replace(/console\.error\(\s*(?:['\\"].*?['\\"],\s*)?(err|error|e)\s*\);?/g, 'console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: \"error\", message: .message, stack: .stack }));');
    c = c.replace(/console\.log\(\s*(['\"])(.*?)(['\"])\s*\);?/g, 'console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: \"info\", message:  }));');
    if (c !== o) { fs.writeFileSync(f, c); console.log('Updated ' + f); }
  }
});
