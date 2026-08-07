#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

export const VERSION_FILES = [
  'package.json',
  'src-tauri/tauri.conf.json',
  'src-tauri/Cargo.toml',
]

const RELEASE_TYPES = new Set(['patch', 'minor', 'major'])
const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/

export function bumpVersion(currentVersion, releaseType) {
  const match = SEMVER_RE.exec(currentVersion)
  if (!match) throw new Error(`Invalid version: ${currentVersion}`)
  if (!RELEASE_TYPES.has(releaseType)) {
    throw new Error(`Invalid release type: ${releaseType}`)
  }

  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])

  if (releaseType === 'patch') return `${major}.${minor}.${patch + 1}`
  if (releaseType === 'minor') return `${major}.${minor + 1}.0`
  return `${major + 1}.0.0`
}

export function validateVersion(version) {
  if (!SEMVER_RE.test(version)) throw new Error(`Invalid version: ${version}`)
  return version
}

export function resolveTargetVersion(currentVersion, releaseArg) {
  if (RELEASE_TYPES.has(releaseArg)) return bumpVersion(currentVersion, releaseArg)
  return validateVersion(releaseArg)
}

export function updateCargoPackageVersion(content, version) {
  const packageMatch = /(^\[package\]\r?\n[\s\S]*?)(?=^\[|(?![\s\S]))/m.exec(content)
  if (!packageMatch) throw new Error('Cargo.toml does not contain a [package] section')

  const packageSection = packageMatch[1]
  if (!/^version\s*=\s*"[^"]*"/m.test(packageSection)) {
    throw new Error('Cargo.toml [package] section does not contain version')
  }

  const updatedPackageSection = packageSection.replace(
    /^version\s*=\s*"[^"]*"/m,
    `version = "${version}"`,
  )

  return (
    content.slice(0, packageMatch.index) +
    updatedPackageSection +
    content.slice(packageMatch.index + packageSection.length)
  )
}

export function syncVersionFiles(rootDir, version, { dryRun = false } = {}) {
  validateVersion(version)

  const packagePath = resolve(rootDir, 'package.json')
  const tauriConfigPath = resolve(rootDir, 'src-tauri/tauri.conf.json')
  const cargoPath = resolve(rootDir, 'src-tauri/Cargo.toml')

  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
  const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, 'utf8'))
  const cargoToml = readFileSync(cargoPath, 'utf8')

  packageJson.version = version
  tauriConfig.version = version

  const updates = [
    [packagePath, `${JSON.stringify(packageJson, null, 2)}\n`],
    [tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`],
    [cargoPath, updateCargoPackageVersion(cargoToml, version)],
  ]

  const changed = updates
    .filter(([filePath, nextContent]) => readFileSync(filePath, 'utf8') !== nextContent)
    .map(([filePath]) => filePath)

  if (!dryRun) {
    for (const [filePath, nextContent] of updates) {
      writeFileSync(filePath, nextContent, 'utf8')
    }
  }

  return changed
}

export function ensureCleanGitStatus(status) {
  const dirty = status.trim()
  if (dirty) {
    throw new Error(`Working tree is not clean:\n${dirty}`)
  }
}

export function ensureOnlyVersionFilesChanged(status) {
  const allowed = new Set(VERSION_FILES.map((filePath) => filePath.replaceAll('\\', '/')))
  const unexpected = status
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .filter((line) => {
      const filePath = line.slice(3).replace(/^"|"$/g, '').replaceAll('\\', '/')
      return !allowed.has(filePath)
    })

  if (unexpected.length > 0) {
    throw new Error(`Unexpected non-version changes detected:\n${unexpected.join('\n')}`)
  }
}

export function parseArgs(argv) {
  const options = {
    releaseArg: null,
    build: true,
    tauriBuild: false,
    push: false,
    dryRun: false,
    yes: false,
    help: false,
  }

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true
    else if (arg === '--no-build') options.build = false
    else if (arg === '--tauri-build') options.tauriBuild = true
    else if (arg === '--push') options.push = true
    else if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--yes' || arg === '-y') options.yes = true
    else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`)
    else if (!options.releaseArg) options.releaseArg = arg
    else throw new Error(`Unexpected argument: ${arg}`)
  }

  if (!options.build && options.tauriBuild) {
    throw new Error('--no-build cannot be used with --tauri-build')
  }

  return options
}

function helpText() {
  return `Usage:
  pnpm release [patch|minor|major|x.y.z] [options]

Options:
  --no-build     Skip local build verification
  --tauri-build  Run pnpm tauri build instead of pnpm build
  --push         Push HEAD and the release tag after creating them
  --dry-run      Print the planned release without writing files or running git
  -y, --yes      Skip interactive confirmation
  -h, --help     Show this help

Examples:
  pnpm release patch
  pnpm release minor --tauri-build
  pnpm release 0.3.0 --no-build
`
}

function run(command, args, { cwd, stdio = 'inherit' } = {}) {
  return execFileSync(command, args, {
    cwd,
    encoding: stdio === 'pipe' ? 'utf8' : undefined,
    stdio,
  })
}

function git(args, options) {
  return run('git', args, options)
}

function pnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
}

function pnpm(args, options) {
  return run(pnpmCommand(), args, options)
}

function readPackageVersion(rootDir) {
  const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))
  return validateVersion(packageJson.version)
}

function tagExists(rootDir, tagName) {
  try {
    git(['rev-parse', '--verify', '--quiet', `refs/tags/${tagName}`], {
      cwd: rootDir,
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

function hasVersionFileDiff(rootDir) {
  try {
    git(['diff', '--quiet', '--', ...VERSION_FILES], { cwd: rootDir, stdio: 'ignore' })
    return false
  } catch {
    return true
  }
}

async function chooseReleaseArg(currentVersion) {
  if (!process.stdin.isTTY) {
    throw new Error('Missing release argument in non-interactive mode')
  }

  const choices = [
    ['patch', bumpVersion(currentVersion, 'patch')],
    ['minor', bumpVersion(currentVersion, 'minor')],
    ['major', bumpVersion(currentVersion, 'major')],
  ]

  console.log(`Current version: ${currentVersion}`)
  choices.forEach(([type, version], index) => {
    console.log(`  ${index + 1}. ${type} -> ${version}`)
  })

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = (await rl.question('Select release type [1-3]: ')).trim()
    const selected = choices[Number(answer) - 1]
    if (!selected) throw new Error('Release cancelled')
    return selected[0]
  } finally {
    rl.close()
  }
}

async function confirmRelease({ currentVersion, targetVersion, tagName, options }) {
  if (options.yes || options.dryRun || !process.stdin.isTTY) return

  const buildStep = options.tauriBuild
    ? 'pnpm tauri build'
    : options.build
      ? 'pnpm build'
      : 'skipped'

  console.log('')
  console.log(`Release: ${currentVersion} -> ${targetVersion}`)
  console.log(`Tag: ${tagName}`)
  console.log(`Build: ${buildStep}`)
  console.log(`Push: ${options.push ? 'yes' : 'no'}`)

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = (await rl.question('Continue? [y/N]: ')).trim().toLowerCase()
    if (answer !== 'y' && answer !== 'yes') throw new Error('Release cancelled')
  } finally {
    rl.close()
  }
}

export async function main(argv = process.argv.slice(2), rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  const options = parseArgs(argv)
  if (options.help) {
    console.log(helpText())
    return
  }

  const currentVersion = readPackageVersion(rootDir)
  const releaseArg = options.releaseArg ?? (await chooseReleaseArg(currentVersion))
  const targetVersion = resolveTargetVersion(currentVersion, releaseArg)
  const tagName = `v${targetVersion}`

  if (tagExists(rootDir, tagName)) {
    throw new Error(`Tag already exists: ${tagName}`)
  }

  if (!options.dryRun) {
    ensureCleanGitStatus(git(['status', '--porcelain'], { cwd: rootDir, stdio: 'pipe' }))
  }

  await confirmRelease({ currentVersion, targetVersion, tagName, options })

  const changedFiles = syncVersionFiles(rootDir, targetVersion, { dryRun: options.dryRun })
  if (options.dryRun) {
    console.log(`Would release ${tagName}`)
    console.log(`Would update ${changedFiles.length || 0} version file(s)`)
    return
  }

  if (options.tauriBuild) {
    pnpm(['tauri', 'build'], { cwd: rootDir })
  } else if (options.build) {
    pnpm(['build'], { cwd: rootDir })
  }

  const postBuildStatus = git(['status', '--porcelain'], { cwd: rootDir, stdio: 'pipe' })

  if (hasVersionFileDiff(rootDir)) {
    ensureOnlyVersionFilesChanged(postBuildStatus)
    git(['add', ...VERSION_FILES], { cwd: rootDir })
    git(['commit', '-m', `chore(release): ${tagName}`], { cwd: rootDir })
  } else {
    ensureCleanGitStatus(postBuildStatus)
    console.log('Version files were already up to date; creating tag on HEAD.')
  }

  git(['tag', tagName], { cwd: rootDir })

  if (options.push) {
    git(['push', 'origin', 'HEAD'], { cwd: rootDir })
    git(['push', 'origin', tagName], { cwd: rootDir })
  }

  console.log(`Release tag ready: ${tagName}`)
  if (!options.push) {
    console.log(`Push with: git push origin HEAD && git push origin ${tagName}`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
