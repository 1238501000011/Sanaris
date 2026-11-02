const [major, minor] = process.versions.node.split('.').map(Number);

if (major < 22 || (major === 22 && minor < 13)) {
  console.error('SANARIS needs Node.js 22.13 or newer for its shared report database.');
  console.error('Install Node.js 24 or newer, reopen your IDE or terminal, and run npm run dev.');
  console.error('Current Node.js version: ' + process.versions.node);
  process.exitCode = 1;
}
