import { runChecks } from './index'

const results = runChecks()

let failed = 0
for (const r of results) {
  const status = r.ok ? 'PASS' : 'FAIL'
  if (!r.ok) failed++
  console.log(`[${status}] ${r.id}. ${r.name}`)
  console.log(`         ${r.detail}`)
}

console.log(`\n${results.length - failed}/${results.length} checks passed`)
if (failed > 0) {
  process.exit(1)
}
