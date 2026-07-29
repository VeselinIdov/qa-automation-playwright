#!/usr/bin/env node
// Summarise a Playwright JUnit run: totals, then each failure with its message
// and the artifacts on disk for it.
//
//   node .claude/skills/debug-failure/scripts/failures.mjs [results.xml]
//
// Reads results.xml (the junit reporter output configured in
// playwright.config.ts). No dependencies — the repo has no XML parser and this
// must not need one.

import * as fs from 'node:fs'
import * as path from 'node:path'

const file = process.argv[2] ?? 'results.xml'

if (!fs.existsSync(file)) {
    console.error(`No ${file}. Run the suite first (npx playwright test --project=api).`)
    process.exit(1)
}

const xml = fs.readFileSync(file, 'utf8')

function unescapeXml(value) {
    return value
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#10;/g, '\n')
        .replace(/&#13;/g, '')
        .replace(/&#9;/g, '\t')
        .replace(/&amp;/g, '&')
}

function attr(tag, name) {
    const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`))
    return match ? unescapeXml(match[1]) : ''
}

// <testcase ...>body</testcase> or the self-closing <testcase ... />
const CASE = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g

const cases = []
for (const match of xml.matchAll(CASE)) {
    const tag = match[1]
    const body = match[3] ?? ''
    const failure = body.match(/<(failure|error)\b([^>]*)>([\s\S]*?)<\/\1>/)

    cases.push({
        name: attr(tag, 'name'),
        file: attr(tag, 'classname'),
        time: Number(attr(tag, 'time') || 0),
        skipped: /<skipped\b/.test(body),
        failed: Boolean(failure),
        message: failure ? unescapeXml(attr(failure[2], 'message')) : '',
        detail: failure
            ? failure[3]
                  .replace(/<!\[CDATA\[|\]\]>/g, '')
                  .split('\n')
                  .map((line) => line.replace(/\[[0-9;]*m/g, '').trimEnd())
                  .filter((line) => line.trim() !== '')
            : [],
    })
}

if (cases.length === 0) {
    console.error(`Parsed no test cases out of ${file}. Is it a JUnit report?`)
    process.exit(1)
}

const failed = cases.filter((c) => c.failed)
const skipped = cases.filter((c) => c.skipped && !c.failed)
const passed = cases.length - failed.length - skipped.length

console.log(`${cases.length} tests — ${passed} passed, ${failed.length} failed, ${skipped.length} skipped`)

// test-results/ holds a directory per failing test; Playwright slugifies the
// title, so match loosely rather than trying to reproduce the exact rule.
function artifactsFor(name) {
    const root = 'test-results'
    if (!fs.existsSync(root)) return []
    const words = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(' ')
        .filter((word) => word.length > 3)

    return fs
        .readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .filter((entry) => {
            const slug = entry.name.toLowerCase()
            return words.length > 0 && words.every((word) => slug.includes(word))
        })
        .flatMap((entry) =>
            fs.readdirSync(path.join(root, entry.name)).map((f) => path.join(root, entry.name, f))
        )
}

for (const test of failed) {
    console.log(`\n${'-'.repeat(72)}`)
    console.log(`FAIL  ${test.file}`)
    console.log(`      ${test.name}  (${test.time.toFixed(1)}s)`)
    if (test.message) {
        console.log('')
        for (const line of test.message.split('\n').slice(0, 4)) {
            console.log(`  ${line}`)
        }
    }

    for (const line of test.detail.slice(0, 12)) {
        console.log(`  ${line}`)
    }
    if (test.detail.length > 12) {
        console.log(`  ... ${test.detail.length - 12} more lines`)
    }

    const artifacts = artifactsFor(test.name)
    if (artifacts.length > 0) {
        console.log('\n  artifacts:')
        for (const artifact of artifacts) {
            const hint = artifact.endsWith('.zip') ? `   ->  npx playwright show-trace ${artifact}` : ''
            console.log(`    ${artifact}${hint}`)
        }
    }
}

if (skipped.length > 0) {
    console.log(`\nskipped: ${skipped.map((s) => s.name).join(', ')}`)
}

process.exit(failed.length > 0 ? 1 : 0)
