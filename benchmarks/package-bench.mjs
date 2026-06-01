import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  createPreviewHarnessPlan,
  createPreviewManifest,
  createPreviewProof,
  createPreviewSearchRecords
} from '../dist/index.js';
import { renderPreviewBookHtml } from '../dist/browser.js';
import {
  createPreviewBenchmarkPlan,
  createPreviewFuzzCases,
  createPreviewHarnessManifest
} from '../dist/harness.js';

const args = process.argv.slice(2);
const out = readArg('--out');
const entries = Number(readArg('--entries') ?? 500);
const runs = Number(readArg('--runs') ?? 9);
const input = buildInput(entries);

const measures = {
  createManifest: measure(() => createPreviewManifest(input), runs, (manifest) => manifest.entries.length),
  searchRecords: measure(() => createPreviewSearchRecords(createPreviewManifest(input)), runs, (records) => records.length),
  harnessPlan: measure(() => createPreviewHarnessPlan(createPreviewManifest(input)), runs, (plan) => plan.targets.length),
  harnessManifest: measure(() => createPreviewHarnessManifest(createPreviewManifest(input)), runs, (manifest) => manifest.fixtures.length),
  browserBookHtml: measure(() => renderPreviewBookHtml(createPreviewManifest(input)), Math.max(3, Math.ceil(runs / 3)), (html) => html.length),
  fuzzCases: measure(() => createPreviewFuzzCases(createPreviewManifest(input), { casesPerVariant: 1 }), Math.max(3, Math.ceil(runs / 3)), (cases) => cases.length),
  benchmarkPlan: measure(() => createPreviewBenchmarkPlan(createPreviewManifest(input)), runs, (plan) => plan.benchmarks.length),
  proof: measure(() => createPreviewProof(createPreviewManifest(input)), runs, (proof) => proof.digest.length)
};

const result = {
  generatedAt: new Date().toISOString(),
  package: '@shapeshift-labs/frontier-component-preview',
  entries,
  runs,
  measures
};

if (out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result, null, 2));

function buildInput(count) {
  return {
    id: 'bench.component-preview',
    generatedAt: 1,
    package: '@example/bench',
    entries: Array.from({ length: count }, (_, index) => ({
      component: `Component${index}`,
      source: { file: `src/components/Component${index}.tsx`, exportName: `Component${index}` },
      feature: `feature-${index % 20}`,
      owner: `@team/${index % 8}`,
      args: [
        { name: 'title', type: 'text', defaultValue: `Component ${index}` },
        { name: 'enabled', type: 'boolean', defaultValue: index % 2 === 0 },
        { name: 'count', type: 'number', defaultValue: index }
      ],
      state: [
        { kind: index % 3 === 0 ? 'crdt' : 'frontier-state', path: `/entities/components/${index}`, initial: { id: index, count: index } }
      ],
      variants: [
        { id: 'default', title: 'Default' },
        { id: 'loading', title: 'Loading', args: { loading: true } },
        { id: 'selected', title: 'Selected', interactions: [{ event: 'click', target: '[data-action="select"]', telemetry: ['component.select'] }] }
      ],
      evidence: [
        { kind: 'browser', assertions: ['dom-mounted', 'telemetry-recorded'] }
      ],
      tags: ['bench']
    }))
  };
}

function measure(fn, count, summarize) {
  if (global.gc) global.gc();
  const samples = [];
  let last;
  for (let i = 0; i < count; i++) {
    const start = performance.now();
    last = fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return {
    minMs: samples[0],
    medianMs: samples[Math.floor(samples.length / 2)],
    maxMs: samples[samples.length - 1],
    p95Ms: samples[Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1)],
    output: summarize(last)
  };
}

function readArg(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
