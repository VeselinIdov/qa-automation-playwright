#!/usr/bin/env node
// PreToolUse guard for CLAUDE.md rule 5: never touch profiles/.env.* or
// playwright/.auth/ — real credentials and generated session state.
// Checks file paths and raw shell commands. profiles/.env.example is a
// committed template and stays readable. Fails closed.
import { readFileSync } from 'node:fs'

const PROTECTED = [
    {
        pattern: /(?:^|[/\\"'\s])profiles[/\\]\.env\.(?!example)/i,
        what: 'profiles/.env.* holds real credentials',
    },
    {
        pattern: /(?:^|[/\\"'\s])playwright[/\\]\.auth(?:[/\\]|$|["'\s])/i,
        what: 'playwright/.auth/ is generated session state',
    },
]

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
    decide('deny', 'guard-paths.mjs could not parse its hook input — failing closed.')
}

const t = input?.tool_input ?? {}
const haystack = [t.file_path, t.path, t.notebook_path, t.command, t.pattern, t.glob]
    .filter((v) => typeof v === 'string')
    .join('\n')

const hit = PROTECTED.find((p) => p.pattern.test(haystack))
if (hit) {
    decide(
        'deny',
        `Blocked by CLAUDE.md rule 5: ${hit.what}. Read the variable names from ` +
            '`playwright.config.ts` or the CLAUDE.md environment table instead, and ask the user to change ' +
            'the file themselves if a value is wrong.'
    )
}

process.exit(0)
