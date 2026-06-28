const fs = require('fs');
const files = [
  'apps/web/public/auth/organization.html',
  'apps/web/public/auth/login.html',
  'apps/web/public/auth/register.html'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/'\/dashboard'/g, 'data.needsOrganization ? \'/auth/organization\' : \'/onboarding/wizard.html\'');
    fs.writeFileSync(f, c);
  }
});
