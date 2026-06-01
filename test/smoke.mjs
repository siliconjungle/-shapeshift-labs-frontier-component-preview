import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  assertPreviewManifest,
  createPreviewHarnessPlan,
  createPreviewManifest,
  createPreviewProof,
  createPreviewRegistryGraph,
  createPreviewSearchRecords,
  formatPreviewJsonl,
  resolvePreviewIntegrationFlags,
  validatePreviewManifest
} from '../dist/index.js';
import {
  createPreviewBookState,
  renderPreviewBookHtml
} from '../dist/browser.js';
import {
  discoverFrontierPreviews,
  generatePreviewEntryModule,
  writePreviewArtifacts
} from '../dist/node.js';
import {
  createPreviewAgentRunbook,
  createPreviewBenchmarkPlan,
  createPreviewBrowserEvidencePlan,
  createPreviewFuzzCases,
  createPreviewHarnessManifest,
  minimizePreviewFuzzCase
} from '../dist/harness.js';
import {
  frontierComponentPreviewVite,
  previewVirtualSpecifier
} from '../dist/vite.js';

const manifest = createPreviewManifest({
  id: 'preview.smoke',
  generatedAt: 1,
  package: '@example/app',
  entries: [
    {
      title: 'Todo Card',
      component: 'TodoCard',
      source: { file: 'src/components/TodoCard.tsx', exportName: 'TodoCard' },
      args: [
        { name: 'title', type: 'text', defaultValue: 'Write preview tests' },
        { name: 'done', type: 'boolean', defaultValue: false }
      ],
      state: [
        { id: 'todo-state', kind: 'frontier-state', path: '/entities/todos/t1', initial: { title: 'Write preview tests', done: false } }
      ],
      variants: [
        {
          id: 'default',
          title: 'Default',
          interactions: [
            { event: 'click', target: '[data-action="toggle"]', writes: ['/entities/todos/t1/done'], telemetry: ['todo.toggle'] }
          ]
        },
        { id: 'done', title: 'Done', args: { done: true }, tags: ['state'] }
      ],
      evidence: [
        { id: 'todo-card.browser', kind: 'browser', assertions: ['dom-mounted'], telemetry: ['preview.mount'] }
      ],
      tags: ['todo']
    }
  ]
});

assertPreviewManifest(manifest);
assert.strictEqual(validatePreviewManifest(manifest).filter((item) => item.severity === 'error').length, 0);
assert.strictEqual(resolvePreviewIntegrationFlags().inspector, true);
assert.strictEqual(resolvePreviewIntegrationFlags({ telemetry: false }).telemetry, false);

const search = createPreviewSearchRecords(manifest);
assert.strictEqual(search.length, 1);
assert.ok(search[0].text.includes('todo card'));

const harness = createPreviewHarnessPlan(manifest);
assert.strictEqual(harness.targets.length, 2);
assert.ok(harness.targets[0].assertions.includes('dom-mounted'));
assert.ok(harness.commands.some((command) => command.kind === 'fuzz'));

const graph = createPreviewRegistryGraph(manifest);
assert.ok(graph.entries.some((entry) => entry.kind === 'component'));

const proof = createPreviewProof(manifest);
assert.ok(proof.digest.startsWith('fnv1a64:'));
assert.strictEqual(createPreviewProof(manifest).digest, proof.digest);
assert.ok(formatPreviewJsonl(manifest).includes('frontier.component-preview.entry'));

const book = createPreviewBookState(manifest);
assert.strictEqual(book.integrations.browserBook, true);
assert.ok(book.inspector?.capabilities.rewind);
const html = renderPreviewBookHtml(manifest);
assert.ok(html.includes('frontier-component-preview-root'));
assert.ok(html.includes('Inspect'));

const fuzzCases = createPreviewFuzzCases(manifest, { casesPerVariant: 2 });
assert.strictEqual(fuzzCases.length, 4);
assert.ok(minimizePreviewFuzzCase(fuzzCases[0]).steps.length <= 1);
assert.strictEqual(createPreviewHarnessManifest(manifest).fixtures.length, 2);
assert.strictEqual(createPreviewBrowserEvidencePlan(manifest).pages.length, 2);
assert.ok(createPreviewBenchmarkPlan(manifest).benchmarks.length >= 3);
assert.ok(createPreviewAgentRunbook(manifest).steps.some((step) => step.id === 'preview.build'));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frontier-preview-'));
try {
  fs.mkdirSync(path.join(tmp, 'src', 'components'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: '@example/preview-app', type: 'module' }));
  fs.writeFileSync(
    path.join(tmp, 'src', 'components', 'TodoCard.tsx'),
    'export function TodoCard(props: { title: string }) { return <article>{props.title}</article>; }\n'
  );
  fs.writeFileSync(
    path.join(tmp, 'src', 'components', 'UserBadge.tsx'),
    'export const UserBadge = (props: { name: string }) => <strong>{props.name}</strong>;\n'
  );
  const discovered = await discoverFrontierPreviews({ rootDir: tmp, generatedAt: 2 });
  assert.strictEqual(discovered.manifest.entries.length, 2);
  assert.ok(discovered.manifest.entries.every((entry) => entry.tags.includes('auto-generated')));
  const moduleSource = generatePreviewEntryModule(discovered.manifest, { rootDir: tmp });
  assert.ok(moduleSource.includes('frontierPreviewComponents'));
  const written = await writePreviewArtifacts({ rootDir: tmp, outDir: '.frontier/preview' });
  assert.ok(fs.existsSync(path.join(written.outDir, 'manifest.json')));
  assert.ok(fs.existsSync(path.join(written.outDir, 'index.html')));

  const plugin = frontierComponentPreviewVite({ rootDir: tmp });
  assert.strictEqual(plugin.name, 'frontier-component-preview');
  assert.strictEqual(previewVirtualSpecifier('manifest'), 'virtual:frontier-component-preview/manifest');
  assert.strictEqual(plugin.resolveId?.('virtual:frontier-component-preview/manifest'), '\0frontier-component-preview:manifest');
  const loadedManifest = await plugin.load?.('\0frontier-component-preview:manifest');
  assert.ok(String(loadedManifest).includes('@example/preview-app.component-preview'));

  const cliPath = path.resolve('dist/cli.js');
  const cliOutput = execFileSync(process.execPath, [cliPath, 'discover', '--cwd', tmp, '--json'], { encoding: 'utf8' });
  assert.ok(JSON.parse(cliOutput).manifest.entries.length >= 2);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('frontier-component-preview smoke ok');
