import {
  createPreviewHarnessPlan,
  resolvePreviewIntegrationFlags,
  type FrontierPreviewHarnessPlan,
  type FrontierPreviewIntegrationFlags,
  type FrontierPreviewManifest
} from './index.js';

export interface FrontierPreviewHarnessManifestOptions {
  id?: string;
  generatedAt?: number;
  routePrefix?: string;
  integrations?: FrontierPreviewIntegrationFlags;
}

export interface FrontierPreviewTestManifest {
  kind: 'frontier.test.manifest';
  version: 1;
  id: string;
  generatedAt: number;
  previewManifestId: string;
  harness: FrontierPreviewHarnessPlan;
  fixtures: Array<{ id: string; route: string; entryId: string; variantId: string }>;
  expected: Array<{ id: string; assertions: string[]; statePaths: string[]; telemetry: string[] }>;
  coverage: string[];
}

export interface FrontierPreviewFuzzCase {
  id: string;
  entryId: string;
  variantId: string;
  args: Record<string, unknown>;
  state: unknown;
  steps: Array<{ event: string; target?: string; args?: Record<string, unknown> }>;
  assertions: string[];
}

export interface FrontierPreviewFuzzOptions {
  casesPerVariant?: number;
  seed?: number;
  integrations?: FrontierPreviewIntegrationFlags;
}

export interface FrontierPreviewBenchmarkPlan {
  kind: 'frontier.component-preview.benchmark-plan';
  version: 1;
  id: string;
  generatedAt: number;
  manifestId: string;
  benchmarks: Array<{ id: string; target: string; iterations: number; budgetMs: number; metadata?: Record<string, unknown> }>;
}

export interface FrontierPreviewBrowserEvidencePlan {
  kind: 'frontier.component-preview.browser-evidence-plan';
  version: 1;
  id: string;
  generatedAt: number;
  manifestId: string;
  pages: Array<{ id: string; url: string; probes: string[]; assertions: string[] }>;
}

export interface FrontierPreviewAgentRunbook {
  kind: 'frontier.component-preview.agent-runbook';
  version: 1;
  id: string;
  generatedAt: number;
  manifestId: string;
  steps: Array<{ id: string; title: string; command: string; evidence: string[] }>;
}

export function createPreviewHarnessManifest(
  manifest: FrontierPreviewManifest,
  options: FrontierPreviewHarnessManifestOptions = {}
): FrontierPreviewTestManifest {
  const integrations = resolvePreviewIntegrationFlags(options.integrations);
  const harness = createPreviewHarnessPlan(manifest, {
    id: options.id ? `${options.id}.harness` : undefined,
    generatedAt: options.generatedAt,
    routePrefix: options.routePrefix,
    includeBrowserEvidence: integrations.browserEvidence,
    includeFuzz: integrations.fuzz,
    includeBenchmarks: integrations.benchmarks,
    includeTelemetry: integrations.telemetry
  });
  return {
    kind: 'frontier.test.manifest',
    version: 1,
    id: options.id ?? `${manifest.id}.preview-tests`,
    generatedAt: options.generatedAt ?? manifest.generatedAt,
    previewManifestId: manifest.id,
    harness,
    fixtures: harness.targets.map((target) => ({
      id: target.id,
      route: target.route,
      entryId: target.entryId,
      variantId: target.variantId
    })),
    expected: harness.targets.map((target) => ({
      id: target.id,
      assertions: target.assertions,
      statePaths: target.statePaths,
      telemetry: target.telemetry
    })),
    coverage: [
      'dom',
      'state',
      'route',
      ...(integrations.telemetry ? ['telemetry'] : []),
      ...(integrations.fuzz ? ['fuzz'] : []),
      ...(integrations.benchmarks ? ['benchmark'] : []),
      ...(integrations.browserEvidence ? ['browser-evidence'] : [])
    ]
  };
}

export function createPreviewFuzzCases(
  manifest: FrontierPreviewManifest,
  options: FrontierPreviewFuzzOptions = {}
): FrontierPreviewFuzzCase[] {
  const integrations = resolvePreviewIntegrationFlags(options.integrations);
  if (!integrations.fuzz) return [];
  const casesPerVariant = options.casesPerVariant ?? 3;
  let seed = options.seed ?? 0x71c0ffee;
  const cases: FrontierPreviewFuzzCase[] = [];
  for (const entry of manifest.entries) {
    for (const variant of entry.variants) {
      for (let i = 0; i < casesPerVariant; i++) {
        const args: Record<string, unknown> = {};
        for (const control of entry.args) args[control.name] = fuzzValue(control.type, i, () => rand());
        cases.push({
          id: `${entry.id}#${variant.id}.case.${i + 1}`,
          entryId: entry.id,
          variantId: variant.id,
          args: { ...(variant.args ?? {}), ...args },
          state: variant.state ?? entry.state[0]?.initial ?? null,
          steps: variant.interactions.map((interaction) => ({
            event: interaction.event,
            target: interaction.target,
            args: interaction.args
          })),
          assertions: [
            'serializable',
            'deterministic-replay',
            ...(entry.state.length ? ['state-paths-stable'] : []),
            ...(variant.interactions.length ? ['interaction-order-stable'] : [])
          ]
        });
      }
    }
  }
  return cases;

  function rand(): number {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 0xffffffff;
  }
}

export function minimizePreviewFuzzCase(failure: FrontierPreviewFuzzCase): FrontierPreviewFuzzCase {
  return {
    ...failure,
    args: Object.fromEntries(Object.entries(failure.args).slice(0, 1)),
    steps: failure.steps.slice(0, 1)
  };
}

export function createPreviewBenchmarkPlan(
  manifest: FrontierPreviewManifest,
  options: { id?: string; generatedAt?: number; integrations?: FrontierPreviewIntegrationFlags } = {}
): FrontierPreviewBenchmarkPlan {
  const integrations = resolvePreviewIntegrationFlags(options.integrations);
  return {
    kind: 'frontier.component-preview.benchmark-plan',
    version: 1,
    id: options.id ?? `${manifest.id}.benchmarks`,
    generatedAt: options.generatedAt ?? manifest.generatedAt,
    manifestId: manifest.id,
    benchmarks: integrations.benchmarks ? [
      { id: 'preview.discovery', target: 'discoverFrontierPreviews', iterations: 20, budgetMs: 50, metadata: { entries: manifest.entries.length } },
      { id: 'preview.book-render', target: 'renderPreviewBookHtml', iterations: 20, budgetMs: 35, metadata: { entries: manifest.entries.length } },
      { id: 'preview.harness-plan', target: 'createPreviewHarnessPlan', iterations: 20, budgetMs: 20, metadata: { targets: createPreviewHarnessPlan(manifest).targets.length } }
    ] : []
  };
}

export function createPreviewBrowserEvidencePlan(
  manifest: FrontierPreviewManifest,
  options: { routePrefix?: string; integrations?: FrontierPreviewIntegrationFlags; generatedAt?: number } = {}
): FrontierPreviewBrowserEvidencePlan {
  const integrations = resolvePreviewIntegrationFlags(options.integrations);
  const harness = createPreviewHarnessPlan(manifest, {
    routePrefix: options.routePrefix,
    includeBrowserEvidence: integrations.browserEvidence,
    includeFuzz: integrations.fuzz,
    includeBenchmarks: integrations.benchmarks,
    includeTelemetry: integrations.telemetry
  });
  return {
    kind: 'frontier.component-preview.browser-evidence-plan',
    version: 1,
    id: `${manifest.id}.browser-evidence`,
    generatedAt: options.generatedAt ?? manifest.generatedAt,
    manifestId: manifest.id,
    pages: integrations.browserEvidence ? harness.targets.map((target) => ({
      id: target.id,
      url: target.route,
      probes: [
        'dom',
        'state',
        'route',
        ...(integrations.telemetry ? ['telemetry'] : []),
        ...(integrations.inspector ? ['inspector'] : [])
      ],
      assertions: target.assertions
    })) : []
  };
}

export function createPreviewAgentRunbook(
  manifest: FrontierPreviewManifest,
  options: { integrations?: FrontierPreviewIntegrationFlags } = {}
): FrontierPreviewAgentRunbook {
  const integrations = resolvePreviewIntegrationFlags(options.integrations);
  return {
    kind: 'frontier.component-preview.agent-runbook',
    version: 1,
    id: `${manifest.id}.agent-runbook`,
    generatedAt: manifest.generatedAt,
    manifestId: manifest.id,
    steps: [
      { id: 'preview.discover', title: 'Discover preview graph', command: 'frontier-preview discover --json', evidence: ['manifest', 'diagnostics'] },
      { id: 'preview.build', title: 'Build standalone preview book', command: 'frontier-preview build --json', evidence: ['html', 'manifest', 'module'] },
      ...(integrations.fuzz ? [{ id: 'preview.fuzz', title: 'Run preview model fuzzing', command: 'frontier-preview fuzz --json', evidence: ['fuzz-cases', 'minimal-replay'] }] : []),
      ...(integrations.browserEvidence ? [{ id: 'preview.browser', title: 'Capture browser evidence', command: 'frontier-preview test --browser --json', evidence: ['dom', 'state', 'route', 'telemetry'] }] : []),
      ...(integrations.benchmarks ? [{ id: 'preview.bench', title: 'Measure preview build and render cost', command: 'frontier-preview bench --json', evidence: ['benchmark-plan', 'timings'] }] : [])
    ]
  };
}

function fuzzValue(type: string, index: number, rand: () => number): unknown {
  if (type === 'boolean') return index % 2 === 0;
  if (type === 'number') return Math.round(rand() * 1000) / 10;
  if (type === 'color') return ['#2563eb', '#16a34a', '#f59e0b'][index % 3];
  if (type === 'array') return [index, Math.round(rand() * 10)];
  if (type === 'object' || type === 'json') return { index, value: Math.round(rand() * 100) };
  if (type === 'select' || type === 'radio') return `option-${index % 3}`;
  return `case-${index}`;
}
