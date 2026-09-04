#!/usr/bin/env node
// Classify a red run and write the verdict to triage.md.
//
//   node .azure/scripts/triage-failures.mjs
//
// Reads results.xml through the existing failures.mjs summariser, attaches the
// failure screenshots, and asks Claude to classify each failure using the
// debug-failure skill as the rubric. Interprets a red run; never changes one —
// it does not run the suite, touch a spec, or influence the build result.
//
// Skips quietly when ANTHROPIC_API_KEY is unset or nothing failed. Always exits
// 0: a triage problem must not turn a red build into a differently-red build.

import Anthropic from '@anthropic-ai/sdk'
import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

const SUMMARISER = '.claude/skills/debug-failure/scripts/failures.mjs'
const RUBRIC = '.claude/skills/debug-failure/SKILL.md'
const CONVENTIONS = 'CLAUDE.md'
const OUTPUT = 'triage.md'
const MAX_SCREENSHOTS = 3
const MAX_SCREENSHOT_BYTES = 3_500_000

function skip(reason) {
    console.log(`triage skipped: ${reason}`)
    process.exit(0)
}

function read(file) {
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
}

// failures.mjs exits 1 when anything failed, so a non-zero status is the signal
// we want rather than an error. Only a missing report is fatal to us.
function summariseRun() {
    try {
        return { text: execFileSync('node', [SUMMARISER], { encoding: 'utf8' }), failed: false }
    } catch (error) {
        if (error.status === 1 && error.stdout) return { text: error.stdout, failed: true }
        return null
    }
}

function findScreenshots() {
    const root = 'test-results'
    if (!fs.existsSync(root)) return []

    const found = []
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) walk(full)
            else if (entry.name.endsWith('.png')) found.push(full)
        }
    }
    walk(root)

    return found.filter((file) => fs.statSync(file).size <= MAX_SCREENSHOT_BYTES).slice(0, MAX_SCREENSHOTS)
}

const key = process.env.ANTHROPIC_API_KEY
if (!key) skip('ANTHROPIC_API_KEY is not set')

const run = summariseRun()
if (!run) skip(`could not read results.xml via ${SUMMARISER}`)
if (!run.failed) skip('nothing failed')

const rubric = read(RUBRIC)
if (!rubric) skip(`${RUBRIC} is missing`)

const screenshots = findScreenshots()

const content = [
    {
        type: 'text',
        text: [
            'A CI run went red. Classify each failure.',
            '',
            '## Run summary (results.xml)',
            '',
            '```text',
            run.text.trim(),
            '```',
            '',
            screenshots.length > 0
                ? `${screenshots.length} failure screenshot(s) attached below, in this order: ${screenshots.join(', ')}`
                : 'No failure screenshots were produced.',
        ].join('\n'),
    },
    ...screenshots.map((file) => ({
        type: 'image',
        source: {
            type: 'base64',
            media_type: 'image/png',
            data: fs.readFileSync(file).toString('base64'),
        },
    })),
]

const system = [
    'You are triaging a failed Playwright CI run for the repository described below.',
    'Apply the debug-failure rubric: classify every failure as exactly one of',
    'REAL BUG, STALE TEST, FLAKE, or INFRA, and say why.',
    '',
    'You cannot run the suite, open a trace, or edit a file — you are reading a',
    'finished run. Recommend; do not instruct anyone to weaken a test. If the',
    'evidence does not support a classification, say so and name the artifact',
    'someone should open.',
    '',
    'Output GitHub-flavored Markdown for a CI build summary: a one-line verdict,',
    'then one short section per failure (classification, evidence, recommended',
    'next step). No preamble.',
    '',
    '# Rubric',
    '',
    rubric,
    '',
    '# Repository conventions',
    '',
    read(CONVENTIONS),
].join('\n')

const client = new Anthropic({ apiKey: key })

let report
try {
    const response = await client.messages.create({
        model: 'claude-opus-5',
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high' },
        system,
        messages: [{ role: 'user', content }],
    })

    if (response.stop_reason === 'refusal') skip('the model declined to classify this run')

    report = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim()
} catch (error) {
    if (error instanceof Anthropic.RateLimitError) skip('rate limited')
    if (error instanceof Anthropic.AuthenticationError) skip('ANTHROPIC_API_KEY was rejected')
    if (error instanceof Anthropic.APIConnectionError) skip(`could not reach the API: ${error.message}`)
    if (error instanceof Anthropic.APIError) skip(`API error ${error.status}: ${error.message}`)
    throw error
}

if (!report) skip('the model returned no text')

fs.writeFileSync(OUTPUT, `${report}\n`, 'utf8')
console.log(report)

// Attaches the markdown to the Azure DevOps build summary page. Harmless noise
// when this runs anywhere else.
console.log(`##vso[task.uploadsummary]${path.resolve(OUTPUT)}`)
