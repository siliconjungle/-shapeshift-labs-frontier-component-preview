#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { renderPreviewBookHtml } from './browser.js';
import {
  discoverFrontierPreviews,
  writePreviewArtifacts
} from './node.js';
import {
  createPreviewAgentRunbook,
  createPreviewBenchmarkPlan,
  createPreviewBrowserEvidencePlan,
  createPreviewFuzzCases,
  createPreviewHarnessManifest
} from './harness.js';
import {
  createPreviewProof,
  formatPreviewJsonl,
  resolvePreviewIntegrationFlags,
  validatePreviewManifest,
  type FrontierPreviewIntegrationFlags
} from './index.js';

interface CliArgs {
  command: string;
  cwd: string;
  out?: string;
  json: boolean;
  cases?: number;
  integrations: FrontierPreviewIntegrationFlags;
}

if (isCliEntrypoint()) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

function isCliEntrypoint(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const modulePath = fileURLToPath(import.meta.url);
  let entryPath = entry;
  try {
    entryPath = realpathSync(entry);
  } catch {
    entryPath = path.resolve(entry);
  }
  return path.resolve(entryPath) === path.resolve(modulePath);
}

export async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  if (args.command === 'help' || args.command === '--help' || args.command === '-h') {
    printHelp();
    return;
  }
  if (args.command === 'build' || args.command === 'dev') {
    const result = await writePreviewArtifacts({
      rootDir: args.cwd,
      outDir: args.out,
      integrations: args.integrations
    });
    print(args, {
      ok: true,
      command: args.command,
      manifestId: result.manifest.id,
      entries: result.manifest.entries.length,
      outDir: result.outDir,
      artifacts: result.artifacts
    });
    return;
  }
  const result = await discoverFrontierPreviews({ rootDir: args.cwd, integrations: args.integrations });
  if (args.command === 'discover' || args.command === 'inspect') {
    const diagnostics = validatePreviewManifest(result.manifest);
    print(args, {
      ok: diagnostics.every((diagnostic) => diagnostic.severity !== 'error'),
      manifest: result.manifest,
      diagnostics,
      proof: createPreviewProof(result.manifest)
    });
    return;
  }
  if (args.command === 'test') {
    print(args, {
      ok: true,
      manifest: createPreviewHarnessManifest(result.manifest, { integrations: args.integrations }),
      browserEvidence: createPreviewBrowserEvidencePlan(result.manifest, { integrations: args.integrations }),
      runbook: createPreviewAgentRunbook(result.manifest, { integrations: args.integrations })
    });
    return;
  }
  if (args.command === 'fuzz') {
    const cases = createPreviewFuzzCases(result.manifest, {
      casesPerVariant: args.cases,
      integrations: args.integrations
    });
    print(args, { ok: true, cases });
    return;
  }
  if (args.command === 'bench') {
    const start = performance.now();
    const html = renderPreviewBookHtml(result.manifest, { integrations: args.integrations });
    const renderMs = performance.now() - start;
    print(args, {
      ok: true,
      plan: createPreviewBenchmarkPlan(result.manifest, { integrations: args.integrations }),
      measures: {
        entries: result.manifest.entries.length,
        htmlBytes: Buffer.byteLength(html),
        renderMs
      }
    });
    return;
  }
  if (args.command === 'jsonl') {
    await writeStdout(formatPreviewJsonl(result.manifest));
    return;
  }
  throw new Error(`unknown command: ${args.command}`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    command: argv[0] ?? 'help',
    cwd: process.cwd(),
    json: false,
    integrations: {}
  };
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cwd') args.cwd = path.resolve(readNext(argv, ++i, arg));
    else if (arg === '--out') args.out = readNext(argv, ++i, arg);
    else if (arg === '--json') args.json = true;
    else if (arg === '--cases') args.cases = Number(readNext(argv, ++i, arg));
    else if (arg === '--disable') disableFlags(args.integrations, readNext(argv, ++i, arg));
    else if (arg.startsWith('--no-')) setFlag(args.integrations, arg.slice('--no-'.length), false);
    else throw new Error(`unknown argument: ${arg}`);
  }
  args.integrations = resolvePreviewIntegrationFlags(args.integrations);
  return args;
}

function disableFlags(flags: FrontierPreviewIntegrationFlags, value: string): void {
  for (const part of value.split(',')) setFlag(flags, part.trim(), false);
}

function setFlag(flags: FrontierPreviewIntegrationFlags, name: string, value: boolean): void {
  const key = name.replace(/-([a-z])/g, (_match, char: string) => char.toUpperCase()) as keyof FrontierPreviewIntegrationFlags;
  if (key in resolvePreviewIntegrationFlags()) {
    flags[key] = value;
    return;
  }
  throw new Error(`unknown integration flag: ${name}`);
}

function readNext(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function print(args: CliArgs, value: unknown): void {
  if (args.json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  if (typeof value === 'object' && value && 'manifest' in value) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  console.log(JSON.stringify(value, null, 2));
}

async function writeStdout(value: string): Promise<void> {
  await fs.writeFile('/dev/stdout', value);
}

function printHelp(): void {
  console.log(`frontier-preview

Commands:
  discover   discover TSX/JSX component previews and print a manifest
  build      write .frontier/preview manifest, module, and standalone HTML
  dev        same generated artifacts as build, intended for framework dev mode
  test       print Frontier test/browser evidence plans
  fuzz       print generated preview fuzz cases
  bench      print preview benchmark plan and render timing
  jsonl      print preview manifest and harness rows as JSONL

Options:
  --cwd <dir>             project root
  --out <dir>             output directory for build/dev
  --json                  print JSON
  --cases <n>             fuzz cases per variant
  --disable <a,b>         disable integration flags
  --no-inspector          disable the floating inspector bridge
  --no-telemetry          disable telemetry requirements
  --no-fuzz               disable generated fuzz plans
  --no-benchmarks         disable benchmark plans
`);
}
