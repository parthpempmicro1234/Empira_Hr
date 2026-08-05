import { readFileSync } from 'node:fs'

const reportPath = process.argv[2]

if (!reportPath) {
  console.error('::error::An ESLint JSON report path is required')
  process.exit(2)
}

// Existing application source is intentionally unchanged. Keep its current
// findings visible while preventing additional violations from being shipped.
const acceptedFindings = new Map([
  ['@typescript-eslint/no-explicit-any', 15],
  ['@typescript-eslint/no-unused-vars', 4],
  ['react-hooks/exhaustive-deps', 7],
  ['react-hooks/immutability', 1],
  ['react-hooks/set-state-in-effect', 3],
])

let report

try {
  report = JSON.parse(readFileSync(reportPath, 'utf8'))
} catch (error) {
  console.error(`::error::Could not read the ESLint report: ${error.message}`)
  process.exit(2)
}

const observedFindings = new Map()

for (const file of report) {
  for (const finding of file.messages) {
    const rule = finding.ruleId ?? 'eslint-configuration-or-parse-error'
    observedFindings.set(rule, (observedFindings.get(rule) ?? 0) + 1)
  }
}

const regressions = []

for (const [rule, count] of observedFindings) {
  const acceptedCount = acceptedFindings.get(rule) ?? 0

  if (count > acceptedCount) {
    regressions.push(`${rule}: ${count} finding(s), baseline ${acceptedCount}`)
  }
}

if (regressions.length > 0) {
  for (const regression of regressions) {
    console.error(`::error::New frontend lint violation: ${regression}`)
  }

  process.exit(1)
}

const total = [...observedFindings.values()].reduce((sum, count) => sum + count, 0)

if (total > 0) {
  console.warn(`::warning::Accepted ${total} existing frontend lint findings; new findings fail CI`)
} else {
  console.log('Frontend ESLint passed without findings')
}
