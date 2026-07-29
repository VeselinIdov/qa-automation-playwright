#!/usr/bin/env node
// PreToolUse guard for CLAUDE.md rule 1: never run `playwright test`.
// Blocks the runner and the npm scripts that wrap it; `--list` is allowed
// because it enumerates without executing. Fails closed.
import { readFileSync } from 'node:fs'

// `playwright test`, with or without a package-runner prefix
const RUNNER =
    /(?:^|[;&|]|\s)(?:npx\s+|pnpm\s+(?:dlx\s+)?|yarn\s+(?:dlx\s+)?|bunx\s+)?playwright(?:\.cmd)?\s+test\b/i
// `npm test`, `npm run test`, `npm run test:ui` ... which all shell out to it
const SCRIPT = /(?:^|[;&|]|\s)(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test(?::[a-z-]+)?\b/i
// enumerate-only, safe to let through
const LIST = /(?:^|\s)--list(?:\s|=|$)/

function decide(decision, reason) {
    process.stdout.write(
        JSON.stringify({
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: decision,
                permissionDecisionReason: reason,
            },
        })
    )
    process.exit(0)
}

let input
try {
    input = JSON.parse(readFileSync(0, 'utf8'))
} catch {
    decide('deny', 'guard-tests.mjs could not parse its hook input — failing closed.')
}

const command = input?.tool_input?.command
if (typeof command !== 'string' || !command.trim()) process.exit(0)

if ((RUNNER.test(command) || SCRIPT.test(command)) && !LIST.test(command)) {
    decide(
        'deny',
        'Blocked by CLAUDE.md rule 1: executing the suite hits live services and drives a real browser. ' +
            'Verify with `npm run typecheck`, `npm run lint`, and `npx playwright test --list`, then report what ' +
            'is unverified and let the user run the suite themselves.'
    )
}

process.exit(0)
