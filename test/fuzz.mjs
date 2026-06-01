import assert from 'node:assert';
import {
  createPreviewHarnessPlan,
  createPreviewManifest,
  createPreviewProof,
  createPreviewSearchRecords,
  validatePreviewManifest
} from '../dist/index.js';
import {
  createPreviewFuzzCases,
  minimizePreviewFuzzCase
} from '../dist/harness.js';
import { renderPreviewBookHtml } from '../dist/browser.js';

const args = process.argv.slice(2);
const cases = Number(readArg('--cases') ?? 300);
let seed = Number(readArg('--seed') ?? 0x9e3779b9);
let entries = 0;
let variants = 0;

for (let i = 0; i < cases; i++) {
  const manifest = randomManifest(i);
  const diagnostics = validatePreviewManifest(manifest);
  assert.strictEqual(diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length, 0);
  const proofA = createPreviewProof(manifest);
  const proofB = createPreviewProof(manifest);
  assert.strictEqual(proofA.digest, proofB.digest, 'proof digest must be deterministic');
  const search = createPreviewSearchRecords(manifest);
  assert.strictEqual(search.length, manifest.entries.length);
  const harness = createPreviewHarnessPlan(manifest);
  const expectedTargets = manifest.entries.reduce((sum, entry) => sum + entry.variants.length, 0);
  assert.strictEqual(harness.targets.length, expectedTargets);
  const fuzzCases = createPreviewFuzzCases(manifest, { casesPerVariant: 2, seed: i + 1 });
  assert.strictEqual(fuzzCases.length, expectedTargets * 2);
  if (fuzzCases.length) assert.ok(minimizePreviewFuzzCase(fuzzCases[0]).steps.length <= fuzzCases[0].steps.length);
  assert.ok(renderPreviewBookHtml(manifest).includes('frontier-component-preview-root'));
  entries += manifest.entries.length;
  variants += expectedTargets;
}

console.log(`frontier-component-preview fuzz ok cases=${cases} entries=${entries} variants=${variants}`);

function randomManifest(index) {
  const entryCount = 1 + randInt(8);
  const entries = [];
  for (let i = 0; i < entryCount; i++) {
    const component = pick(['TodoCard', 'UserBadge', 'MetricTile', 'CanvasTool', 'RoutePanel']) + i;
    const variantCount = 1 + randInt(5);
    entries.push({
      component,
      source: { file: `src/components/${component}.tsx`, exportName: component },
      feature: pick(['todos', 'users', 'metrics', 'canvas']),
      owner: `@team/${randInt(4)}`,
      args: [
        { name: 'title', type: 'text', defaultValue: `case-${index}-${i}` },
        { name: 'enabled', type: 'boolean', defaultValue: randInt(2) === 0 },
        { name: 'count', type: 'number', defaultValue: randInt(100) }
      ],
      state: maybe(0.7) ? [
        {
          kind: pick(['frontier-state', 'state-cache', 'crdt', 'event-log']),
          path: `/entities/${component}/${i}`,
          initial: { id: i, value: randInt(100) },
          crdt: maybe(0.3)
        }
      ] : [],
      variants: Array.from({ length: variantCount }, (_, variantIndex) => ({
        id: variantIndex === 0 ? 'default' : `variant-${variantIndex}`,
        title: variantIndex === 0 ? 'Default' : `Variant ${variantIndex}`,
        args: { count: randInt(1000), enabled: maybe(0.5) },
        interactions: maybe(0.4) ? [
          { event: 'click', target: `[data-case="${variantIndex}"]`, telemetry: [`telemetry.${variantIndex}`] }
        ] : []
      })),
      tags: maybe(0.5) ? ['agent'] : []
    });
  }
  return createPreviewManifest({
    id: `preview.fuzz.${index}`,
    generatedAt: index + 1,
    package: '@example/fuzz',
    entries
  });
}

function rand() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 0xffffffff;
}

function randInt(max) {
  return Math.floor(rand() * max);
}

function maybe(chance) {
  return rand() < chance;
}

function pick(values) {
  return values[randInt(values.length)];
}

function readArg(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
