const { execSync, spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

const standaloneModules = path.join(__dirname, '.next/standalone/node_modules')
if (!fs.existsSync(standaloneModules)) {
  console.error('.next/standalone/node_modules not found — run `npm run build` first.')
  process.exit(1)
}

const libvipsDir = execSync(
  `find "${standaloneModules}" -type d -iname '*sharp-libvips-*' -path '*/node_modules/@img/*'`,
)
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean)[0]

console.log('sharp-libvips package dir:', libvipsDir || '(not found)')
if (libvipsDir) {
  console.log('contents of lib/:')
  console.log(execSync(`ls -la "${path.join(libvipsDir, 'lib')}"`).toString())
}

console.log('\nBooting standalone server and hitting /api/sharp-test ...\n')
const server = spawn('node', ['.next/standalone/server.js'], {
  cwd: __dirname,
  env: { ...process.env, PORT: '3999' },
})

let output = ''
server.stdout.on('data', (d) => (output += d.toString()))
server.stderr.on('data', (d) => (output += d.toString()))

setTimeout(async () => {
  try {
    const res = await fetch('http://localhost:3999/api/sharp-test')
    const body = await res.text()
    console.log(`Response: ${res.status} ${body}`)
  } catch (err) {
    console.log('Request failed:', err.message)
  }
  console.log('\n--- server output ---\n' + output)
  server.kill()
  process.exit(0)
}, 2000)
