import type { JsonObject, JsonValue } from '@shapeshift-labs/frontier';
import { cloneJson } from '@shapeshift-labs/frontier/clone';
import {
  createFrontierRegistryGraph,
  normalizeFrontierRegistryPath,
  type FrontierRegistryEdge,
  type FrontierRegistryEntry,
  type FrontierRegistryGraph,
  type FrontierRegistryPath,
  type FrontierRegistrySource
} from '@shapeshift-labs/frontier/registry';

export const FRONTIER_COMPONENT_PREVIEW_MANIFEST_KIND = 'frontier.component-preview.manifest';
export const FRONTIER_COMPONENT_PREVIEW_MANIFEST_VERSION = 1;
export const FRONTIER_COMPONENT_PREVIEW_HARNESS_KIND = 'frontier.component-preview.harness-plan';
export const FRONTIER_COMPONENT_PREVIEW_HARNESS_VERSION = 1;
export const FRONTIER_COMPONENT_PREVIEW_PROOF_KIND = 'frontier.component-preview.proof';
export const FRONTIER_COMPONENT_PREVIEW_PROOF_VERSION = 1;
export const FRONTIER_COMPONENT_PREVIEW_PACKAGE_NAME = '@shapeshift-labs/frontier-component-preview';

export type FrontierPreviewRenderer =
  | 'frontier-dom'
  | 'react'
  | 'preact'
  | 'solid'
  | 'vue'
  | 'svelte'
  | 'web-component'
  | 'custom'
  | string;

export type FrontierPreviewControlKind =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'radio'
  | 'color'
  | 'date'
  | 'json'
  | 'object'
  | 'array'
  | 'action'
  | string;

export type FrontierPreviewStateSourceKind =
  | 'frontier-state'
  | 'state-cache'
  | 'crdt'
  | 'event-log'
  | 'fixture'
  | 'url'
  | 'custom'
  | string;

export type FrontierPreviewEvidenceKind =
  | 'smoke'
  | 'browser'
  | 'fuzz'
  | 'benchmark'
  | 'trace'
  | 'telemetry'
  | 'visual'
  | 'accessibility'
  | 'state'
  | string;

export type FrontierPreviewDiagnosticSeverity = 'info' | 'warning' | 'error';

export interface FrontierPreviewSource {
  file: string;
  exportName?: string;
  symbol?: string;
  package?: string;
  line?: number;
  column?: number;
}

export interface FrontierPreviewArgControlInput {
  name: string;
  type?: FrontierPreviewControlKind;
  label?: string;
  description?: string;
  required?: boolean;
  defaultValue?: JsonValue;
  options?: readonly JsonValue[];
  path?: FrontierRegistryPath;
  metadata?: JsonObject;
}

export interface FrontierPreviewArgControl {
  name: string;
  type: FrontierPreviewControlKind;
  label?: string;
  description?: string;
  required: boolean;
  defaultValue?: JsonValue;
  options: JsonValue[];
  path?: string;
  metadata?: JsonObject;
}

export interface FrontierPreviewStateSourceInput {
  id?: string;
  kind?: FrontierPreviewStateSourceKind;
  path?: FrontierRegistryPath;
  initial?: JsonValue;
  snapshots?: readonly JsonValue[];
  transport?: string;
  migrations?: readonly string[];
  crdt?: boolean;
  readonly?: boolean;
  metadata?: JsonObject;
}

export interface FrontierPreviewStateSource {
  id: string;
  kind: FrontierPreviewStateSourceKind;
  path?: string;
  initial?: JsonValue;
  snapshots: JsonValue[];
  transport?: string;
  migrations: string[];
  crdt: boolean;
  readonly: boolean;
  metadata?: JsonObject;
}

export interface FrontierPreviewInteractionInput {
  id?: string;
  title?: string;
  event: string;
  target?: string;
  args?: JsonObject;
  reads?: readonly FrontierRegistryPath[];
  writes?: readonly FrontierRegistryPath[];
  effects?: readonly string[];
  telemetry?: readonly string[];
  metadata?: JsonObject;
}

export interface FrontierPreviewInteraction {
  id: string;
  title?: string;
  event: string;
  target?: string;
  args?: JsonObject;
  reads: string[];
  writes: string[];
  effects: string[];
  telemetry: string[];
  metadata?: JsonObject;
}

export interface FrontierPreviewEvidenceInput {
  id?: string;
  kind?: FrontierPreviewEvidenceKind;
  title?: string;
  command?: string;
  files?: readonly string[];
  routes?: readonly string[];
  states?: readonly FrontierRegistryPath[];
  assertions?: readonly string[];
  traces?: readonly string[];
  telemetry?: readonly string[];
  metadata?: JsonObject;
}

export interface FrontierPreviewEvidence {
  id: string;
  kind: FrontierPreviewEvidenceKind;
  title?: string;
  command?: string;
  files: string[];
  routes: string[];
  states: string[];
  assertions: string[];
  traces: string[];
  telemetry: string[];
  metadata?: JsonObject;
}

export interface FrontierPreviewVariantInput {
  id?: string;
  title?: string;
  args?: JsonObject;
  state?: JsonValue;
  viewport?: string;
  theme?: string;
  designTokens?: readonly string[];
  interactions?: readonly FrontierPreviewInteractionInput[];
  tags?: readonly string[];
  metadata?: JsonObject;
}

export interface FrontierPreviewVariant {
  id: string;
  title: string;
  args?: JsonObject;
  state?: JsonValue;
  viewport?: string;
  theme?: string;
  designTokens: string[];
  interactions: FrontierPreviewInteraction[];
  tags: string[];
  metadata?: JsonObject;
}

export interface FrontierPreviewEntryInput {
  id?: string;
  title?: string;
  component?: string;
  exportName?: string;
  module?: string;
  source?: string | FrontierPreviewSource;
  package?: string;
  feature?: string;
  owner?: string;
  renderer?: FrontierPreviewRenderer;
  args?: readonly FrontierPreviewArgControlInput[];
  state?: readonly FrontierPreviewStateSourceInput[];
  variants?: readonly FrontierPreviewVariantInput[];
  evidence?: readonly FrontierPreviewEvidenceInput[];
  docs?: readonly string[];
  tests?: readonly string[];
  benchmarks?: readonly string[];
  dependencies?: readonly string[];
  tags?: readonly string[];
  metadata?: JsonObject;
}

export interface FrontierPreviewEntry {
  id: string;
  title: string;
  component: string;
  exportName?: string;
  module?: string;
  source?: FrontierPreviewSource;
  package?: string;
  feature?: string;
  owner?: string;
  renderer: FrontierPreviewRenderer;
  args: FrontierPreviewArgControl[];
  state: FrontierPreviewStateSource[];
  variants: FrontierPreviewVariant[];
  evidence: FrontierPreviewEvidence[];
  docs: string[];
  tests: string[];
  benchmarks: string[];
  dependencies: string[];
  tags: string[];
  metadata?: JsonObject;
}

export interface FrontierPreviewManifestInput {
  id?: string;
  generatedAt?: number;
  package?: string;
  renderer?: FrontierPreviewRenderer;
  entries?: readonly FrontierPreviewEntryInput[];
  sources?: readonly FrontierPreviewSource[];
  evidence?: readonly FrontierPreviewEvidenceInput[];
  tags?: readonly string[];
  metadata?: JsonObject;
}

export interface FrontierPreviewManifest {
  kind: typeof FRONTIER_COMPONENT_PREVIEW_MANIFEST_KIND;
  version: typeof FRONTIER_COMPONENT_PREVIEW_MANIFEST_VERSION;
  id: string;
  generatedAt: number;
  package?: string;
  renderer: FrontierPreviewRenderer;
  entries: FrontierPreviewEntry[];
  sources: FrontierPreviewSource[];
  evidence: FrontierPreviewEvidence[];
  tags: string[];
  metadata?: JsonObject;
}

export interface FrontierPreviewFilter {
  ids?: readonly string[];
  features?: readonly string[];
  owners?: readonly string[];
  packages?: readonly string[];
  renderers?: readonly FrontierPreviewRenderer[];
  tags?: readonly string[];
  sourceFiles?: readonly string[];
  query?: string;
}

export interface FrontierPreviewSearchRecord {
  id: string;
  title: string;
  component: string;
  source?: string;
  package?: string;
  feature?: string;
  owner?: string;
  renderer: FrontierPreviewRenderer;
  variants: string[];
  tags: string[];
  text: string;
}

export interface FrontierPreviewHarnessTarget {
  id: string;
  entryId: string;
  variantId: string;
  route: string;
  source?: FrontierPreviewSource;
  assertions: string[];
  statePaths: string[];
  telemetry: string[];
  interactions: FrontierPreviewInteraction[];
  metadata?: JsonObject;
}

export interface FrontierPreviewHarnessPlan {
  kind: typeof FRONTIER_COMPONENT_PREVIEW_HARNESS_KIND;
  version: typeof FRONTIER_COMPONENT_PREVIEW_HARNESS_VERSION;
  id: string;
  generatedAt: number;
  manifestId: string;
  targets: FrontierPreviewHarnessTarget[];
  commands: FrontierPreviewEvidence[];
  packages: string[];
  metadata?: JsonObject;
}

export interface FrontierPreviewHarnessPlanOptions {
  id?: string;
  generatedAt?: number;
  routePrefix?: string;
  includeFuzz?: boolean;
  includeBenchmarks?: boolean;
  includeBrowserEvidence?: boolean;
  includeTelemetry?: boolean;
  metadata?: JsonObject;
}

export interface FrontierPreviewIntegrationFlags {
  autoDiscovery?: boolean;
  vite?: boolean;
  browserBook?: boolean;
  inspector?: boolean;
  stateBridge?: boolean;
  crdtTimeline?: boolean;
  eventLogReplay?: boolean;
  telemetry?: boolean;
  browserEvidence?: boolean;
  fuzz?: boolean;
  benchmarks?: boolean;
}

export const FRONTIER_COMPONENT_PREVIEW_DEFAULT_INTEGRATIONS: Required<FrontierPreviewIntegrationFlags> = {
  autoDiscovery: true,
  vite: true,
  browserBook: true,
  inspector: true,
  stateBridge: true,
  crdtTimeline: true,
  eventLogReplay: true,
  telemetry: true,
  browserEvidence: true,
  fuzz: true,
  benchmarks: true
};

export interface FrontierPreviewDiagnostic {
  severity: FrontierPreviewDiagnosticSeverity;
  code: string;
  message: string;
  path?: string;
  suggestedFix?: string;
  entryId?: string;
  variantId?: string;
}

export interface FrontierPreviewProof {
  kind: typeof FRONTIER_COMPONENT_PREVIEW_PROOF_KIND;
  version: typeof FRONTIER_COMPONENT_PREVIEW_PROOF_VERSION;
  id: string;
  generatedAt: number;
  manifestId: string;
  digest: string;
  entries: number;
  variants: number;
  evidence: number;
}

export function defineFrontierPreview(entry: FrontierPreviewEntryInput): FrontierPreviewEntryInput {
  return entry;
}

export function defineFrontierPreviewManifest(input: FrontierPreviewManifestInput): FrontierPreviewManifestInput {
  return input;
}

export function definePreviewVariant(variant: FrontierPreviewVariantInput): FrontierPreviewVariantInput {
  return variant;
}

export function resolvePreviewIntegrationFlags(
  flags: FrontierPreviewIntegrationFlags = {}
): Required<FrontierPreviewIntegrationFlags> {
  return {
    ...FRONTIER_COMPONENT_PREVIEW_DEFAULT_INTEGRATIONS,
    ...flags
  };
}

export function createPreviewId(
  input: string | { file?: string; exportName?: string; component?: string; title?: string; package?: string },
  exportName?: string
): string {
  if (typeof input === 'string') {
    return 'preview:' + slugify([input, exportName].filter(Boolean).join(':'));
  }
  const seed = [
    input.package,
    input.file,
    input.exportName ?? input.component,
    input.title
  ].filter(Boolean).join(':');
  return 'preview:' + slugify(seed || 'component');
}

export function createPreviewManifest(input: FrontierPreviewManifestInput = {}): FrontierPreviewManifest {
  const entries = mergeEntries((input.entries ?? []).map((entry, index) => normalizeEntry(entry, input, index)));
  const entrySources = entries.map((entry) => entry.source).filter((source): source is FrontierPreviewSource => source !== undefined);
  const evidence = mergeEvidence([
    ...(input.evidence ?? []).map((item, index) => normalizeEvidence(item, 'manifest', index)),
    ...entries.flatMap((entry) => entry.evidence)
  ]);
  return {
    kind: FRONTIER_COMPONENT_PREVIEW_MANIFEST_KIND,
    version: FRONTIER_COMPONENT_PREVIEW_MANIFEST_VERSION,
    id: normalizeId(input.id ?? 'frontier.preview'),
    generatedAt: input.generatedAt ?? Date.now(),
    package: input.package,
    renderer: input.renderer ?? 'frontier-dom',
    entries,
    sources: mergeSources([...(input.sources ?? []).map(normalizeSource), ...entrySources]),
    evidence,
    tags: sortUnique(input.tags ?? entries.flatMap((entry) => entry.tags)),
    metadata: cloneOptionalJsonObject(input.metadata)
  };
}

export function mergePreviewManifests(
  manifests: readonly (FrontierPreviewManifest | FrontierPreviewManifestInput)[],
  input: Omit<FrontierPreviewManifestInput, 'entries' | 'sources' | 'evidence' | 'tags'> = {}
): FrontierPreviewManifest {
  const normalized = manifests.map((manifest) => isPreviewManifest(manifest) ? manifest : createPreviewManifest(manifest));
  return createPreviewManifest({
    ...input,
    entries: normalized.flatMap((manifest) => manifest.entries),
    sources: normalized.flatMap((manifest) => manifest.sources),
    evidence: normalized.flatMap((manifest) => manifest.evidence),
    tags: normalized.flatMap((manifest) => manifest.tags),
    metadata: mergeMetadata(normalized.map((manifest) => manifest.metadata).concat(input.metadata ? [input.metadata] : []))
  });
}

export function isPreviewManifest(value: unknown): value is FrontierPreviewManifest {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as FrontierPreviewManifest).kind === FRONTIER_COMPONENT_PREVIEW_MANIFEST_KIND &&
    (value as FrontierPreviewManifest).version === FRONTIER_COMPONENT_PREVIEW_MANIFEST_VERSION
  );
}

export function selectPreviewEntries(
  manifest: FrontierPreviewManifest,
  filter: FrontierPreviewFilter = {}
): FrontierPreviewEntry[] {
  const query = filter.query?.trim().toLowerCase();
  return manifest.entries.filter((entry) => {
    if (filter.ids?.length && !filter.ids.includes(entry.id)) return false;
    if (filter.features?.length && (!entry.feature || !filter.features.includes(entry.feature))) return false;
    if (filter.owners?.length && (!entry.owner || !filter.owners.includes(entry.owner))) return false;
    if (filter.packages?.length && (!entry.package || !filter.packages.includes(entry.package))) return false;
    if (filter.renderers?.length && !filter.renderers.includes(entry.renderer)) return false;
    if (filter.tags?.length && !filter.tags.some((tag) => entry.tags.includes(tag))) return false;
    if (filter.sourceFiles?.length && (!entry.source?.file || !filter.sourceFiles.includes(entry.source.file))) return false;
    if (query && !previewSearchText(entry).includes(query)) return false;
    return true;
  }).map(cloneEntry);
}

export function createPreviewSearchRecords(manifest: FrontierPreviewManifest): FrontierPreviewSearchRecord[] {
  return manifest.entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    component: entry.component,
    source: entry.source?.file,
    package: entry.package,
    feature: entry.feature,
    owner: entry.owner,
    renderer: entry.renderer,
    variants: entry.variants.map((variant) => variant.id),
    tags: entry.tags.slice(),
    text: previewSearchText(entry)
  }));
}

export function createPreviewRegistryGraph(manifest: FrontierPreviewManifest): FrontierRegistryGraph {
  const entries: FrontierRegistryEntry[] = [];
  const edges: FrontierRegistryEdge[] = [];
  entries.push({
    id: manifest.id,
    kind: 'module',
    description: 'Frontier component preview manifest',
    package: manifest.package,
    tags: ['frontier-preview', ...manifest.tags],
    metadata: { renderer: manifest.renderer, entries: manifest.entries.length }
  });

  for (const entry of manifest.entries) {
    const entryNode = entry.id;
    entries.push({
      id: entryNode,
      kind: 'component',
      description: entry.title,
      package: entry.package,
      feature: entry.feature,
      owner: entry.owner,
      source: sourceToRegistrySource(entry.source),
      reads: entry.state.map((state) => state.path).filter((path): path is string => Boolean(path)),
      consumes: entry.dependencies,
      covers: entry.tests,
      docs: entry.docs,
      tags: ['preview', ...entry.tags],
      metadata: { component: entry.component, renderer: entry.renderer, variants: entry.variants.length }
    });
    edges.push({ from: manifest.id, to: entryNode, kind: 'declared-in' });
    for (const dependency of entry.dependencies) edges.push({ from: entryNode, to: dependency, kind: 'depends-on' });
    for (const variant of entry.variants) {
      const variantNode = `${entry.id}#${variant.id}`;
      entries.push({
        id: variantNode,
        kind: 'fixture',
        description: variant.title,
        package: entry.package,
        feature: entry.feature,
        owner: entry.owner,
        source: sourceToRegistrySource(entry.source),
        tags: ['preview-variant', ...variant.tags],
        metadata: {
          entryId: entry.id,
          ...(variant.viewport === undefined ? {} : { viewport: variant.viewport }),
          ...(variant.theme === undefined ? {} : { theme: variant.theme }),
          interactions: variant.interactions.length
        }
      });
      edges.push({ from: entryNode, to: variantNode, kind: 'owns' });
    }
    for (const evidence of entry.evidence) {
      entries.push({
        id: evidence.id,
        kind: evidence.kind,
        description: evidence.title,
        package: entry.package,
        feature: entry.feature,
        owner: entry.owner,
        source: evidence.files.map((file) => ({ file })),
        reads: evidence.states,
        tags: ['preview-evidence', evidence.kind],
        metadata: evidence.metadata
      });
      edges.push({ from: evidence.id, to: entryNode, kind: 'covers' });
    }
  }
  return createFrontierRegistryGraph({ generatedAt: manifest.generatedAt, entries, edges });
}

export function createPreviewHarnessPlan(
  manifest: FrontierPreviewManifest,
  options: FrontierPreviewHarnessPlanOptions = {}
): FrontierPreviewHarnessPlan {
  const routePrefix = normalizeRoutePrefix(options.routePrefix ?? '/__frontier_preview');
  const targets: FrontierPreviewHarnessTarget[] = [];
  for (const entry of manifest.entries) {
    for (const variant of entry.variants) {
      const telemetry = sortUnique([
        ...(options.includeTelemetry === false ? [] : ['preview.mount', 'preview.variant', 'preview.state']),
        ...variant.interactions.flatMap((interaction) => interaction.telemetry)
      ]);
      targets.push({
        id: `${entry.id}#${variant.id}`,
        entryId: entry.id,
        variantId: variant.id,
        route: `${routePrefix}/${encodeURIComponent(entry.id)}/${encodeURIComponent(variant.id)}`,
        source: entry.source ? cloneSource(entry.source) : undefined,
        assertions: sortUnique([
          'dom-mounted',
          'component-export-resolves',
          'variant-args-serializable',
          ...(entry.state.length ? ['state-source-loads'] : []),
          ...(telemetry.length ? ['telemetry-recorded'] : []),
          ...(variant.interactions.length ? ['interaction-replay'] : [])
        ]),
        statePaths: sortUnique(entry.state.map((state) => state.path).filter((path): path is string => Boolean(path))),
        telemetry,
        interactions: variant.interactions.map(cloneInteraction),
        metadata: mergeMetadata([entry.metadata, variant.metadata])
      });
    }
  }

  const commands: FrontierPreviewEvidence[] = [];
  if (options.includeBrowserEvidence !== false) {
    commands.push(normalizeEvidence({
      id: 'preview.browser-evidence',
      kind: 'browser',
      title: 'Browser evidence run',
      command: 'frontier-preview test --browser --json',
      assertions: ['dom-mounted', 'route-loads', 'state-source-loads', 'telemetry-recorded'],
      telemetry: ['frontier.playwright', 'frontier.trace', 'frontier.logging']
    }, 'command', 0));
  }
  if (options.includeFuzz !== false) {
    commands.push(normalizeEvidence({
      id: 'preview.fuzz',
      kind: 'fuzz',
      title: 'Preview args and state model fuzzing',
      command: 'frontier-preview fuzz --cases 500 --json',
      assertions: ['variant-args-serializable', 'state-replay-deterministic', 'control-schema-valid']
    }, 'command', 1));
  }
  if (options.includeBenchmarks !== false) {
    commands.push(normalizeEvidence({
      id: 'preview.benchmark',
      kind: 'benchmark',
      title: 'Preview build and render benchmark',
      command: 'frontier-preview bench --json',
      assertions: ['manifest-discovery-budget', 'book-render-budget', 'preview-route-startup-budget']
    }, 'command', 2));
  }

  return {
    kind: FRONTIER_COMPONENT_PREVIEW_HARNESS_KIND,
    version: FRONTIER_COMPONENT_PREVIEW_HARNESS_VERSION,
    id: normalizeId(options.id ?? `${manifest.id}.harness`),
    generatedAt: options.generatedAt ?? manifest.generatedAt,
    manifestId: manifest.id,
    targets,
    commands,
    packages: [
      FRONTIER_COMPONENT_PREVIEW_PACKAGE_NAME,
      '@shapeshift-labs/frontier-test',
      '@shapeshift-labs/frontier-playwright',
      '@shapeshift-labs/frontier-inspect',
      '@shapeshift-labs/frontier-trace',
      '@shapeshift-labs/frontier-logging'
    ],
    metadata: cloneOptionalJsonObject(options.metadata)
  };
}

export function validatePreviewManifest(manifest: FrontierPreviewManifest): FrontierPreviewDiagnostic[] {
  const diagnostics: FrontierPreviewDiagnostic[] = [];
  if (manifest.entries.length === 0) {
    diagnostics.push({
      severity: 'warning',
      code: 'frontier-preview/no-entries',
      message: 'Preview manifest has no entries.',
      path: '/entries',
      suggestedFix: 'Add a preview entry or enable filesystem discovery for TSX/JSX component exports.'
    });
  }
  const entryIds = new Set<string>();
  for (const [entryIndex, entry] of manifest.entries.entries()) {
    if (entryIds.has(entry.id)) {
      diagnostics.push({
        severity: 'error',
        code: 'frontier-preview/duplicate-entry-id',
        message: `Duplicate preview entry id: ${entry.id}`,
        path: `/entries/${entryIndex}/id`,
        entryId: entry.id,
        suggestedFix: 'Provide a stable explicit id or rename one component export.'
      });
    }
    entryIds.add(entry.id);
    if (!entry.component) {
      diagnostics.push({
        severity: 'error',
        code: 'frontier-preview/missing-component',
        message: 'Preview entry is missing a component export name.',
        path: `/entries/${entryIndex}/component`,
        entryId: entry.id,
        suggestedFix: 'Set component, exportName, or source.exportName.'
      });
    }
    if (entry.variants.length === 0) {
      diagnostics.push({
        severity: 'error',
        code: 'frontier-preview/no-variants',
        message: `Preview entry ${entry.id} has no variants.`,
        path: `/entries/${entryIndex}/variants`,
        entryId: entry.id,
        suggestedFix: 'Add at least a default variant.'
      });
    }
    const controlNames = new Set<string>();
    for (const [controlIndex, control] of entry.args.entries()) {
      if (controlNames.has(control.name)) {
        diagnostics.push({
          severity: 'error',
          code: 'frontier-preview/duplicate-control',
          message: `Duplicate control ${control.name} in ${entry.id}.`,
          path: `/entries/${entryIndex}/args/${controlIndex}/name`,
          entryId: entry.id,
          suggestedFix: 'Controls should have one stable name per component prop.'
        });
      }
      controlNames.add(control.name);
    }
    for (const state of entry.state) {
      if (state.path && !state.path.startsWith('/')) {
        diagnostics.push({
          severity: 'warning',
          code: 'frontier-preview/state-path-shape',
          message: `State source ${state.id} uses a non-JSON-pointer path.`,
          path: `/entries/${entryIndex}/state`,
          entryId: entry.id,
          suggestedFix: 'Use a JSON Pointer path such as /entities/todos.'
        });
      }
    }
  }
  return diagnostics;
}

export function assertPreviewManifest(manifest: FrontierPreviewManifest): FrontierPreviewManifest {
  const errors = validatePreviewManifest(manifest).filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length) {
    throw new Error(errors.map((error) => `${error.code}: ${error.message}`).join('\n'));
  }
  return manifest;
}

export function formatPreviewJsonl(manifest: FrontierPreviewManifest): string {
  const lines = [
    { kind: manifest.kind, id: manifest.id, generatedAt: manifest.generatedAt, entries: manifest.entries.length },
    ...manifest.entries.map((entry) => ({
      kind: 'frontier.component-preview.entry',
      id: entry.id,
      title: entry.title,
      component: entry.component,
      source: entry.source,
      variants: entry.variants.length
    })),
    ...createPreviewHarnessPlan(manifest).targets.map((target) => ({
      kind: 'frontier.component-preview.target',
      id: target.id,
      route: target.route,
      assertions: target.assertions
    }))
  ];
  return lines.map((line) => JSON.stringify(line)).join('\n') + '\n';
}

export function createPreviewProof(
  manifest: FrontierPreviewManifest,
  options: { id?: string; generatedAt?: number } = {}
): FrontierPreviewProof {
  return {
    kind: FRONTIER_COMPONENT_PREVIEW_PROOF_KIND,
    version: FRONTIER_COMPONENT_PREVIEW_PROOF_VERSION,
    id: normalizeId(options.id ?? `${manifest.id}.proof`),
    generatedAt: options.generatedAt ?? manifest.generatedAt,
    manifestId: manifest.id,
    digest: fnv1a64(stableStringify(manifest)),
    entries: manifest.entries.length,
    variants: manifest.entries.reduce((sum, entry) => sum + entry.variants.length, 0),
    evidence: manifest.evidence.length
  };
}

function normalizeEntry(
  input: FrontierPreviewEntryInput | FrontierPreviewEntry,
  manifest: FrontierPreviewManifestInput,
  index: number
): FrontierPreviewEntry {
  const source = input.source ? normalizeSource(input.source) : input.module ? normalizeSource({ file: input.module, exportName: input.exportName }) : undefined;
  const component = input.component ?? input.exportName ?? source?.exportName ?? source?.symbol ?? `Component${index + 1}`;
  const id = normalizeId(input.id ?? createPreviewId({
    package: input.package ?? manifest.package,
    file: source?.file ?? input.module,
    exportName: input.exportName ?? component,
    title: input.title
  }));
  const args = (input.args ?? []).map(normalizeControl).sort((left, right) => left.name.localeCompare(right.name));
  const state = (input.state ?? []).map((item, stateIndex) => normalizeStateSource(item, id, stateIndex));
  const variants = (input.variants?.length ? input.variants : [{ id: 'default', title: 'Default' }]).map((variant, variantIndex) => normalizeVariant(variant, id, variantIndex));
  return {
    id,
    title: input.title ?? humanize(component),
    component,
    exportName: input.exportName ?? source?.exportName,
    module: input.module ?? source?.file,
    source,
    package: input.package ?? manifest.package,
    feature: input.feature,
    owner: input.owner,
    renderer: input.renderer ?? manifest.renderer ?? 'frontier-dom',
    args,
    state,
    variants,
    evidence: (input.evidence ?? []).map((item, evidenceIndex) => normalizeEvidence(item, id, evidenceIndex)),
    docs: sortUnique(input.docs ?? []),
    tests: sortUnique(input.tests ?? []),
    benchmarks: sortUnique(input.benchmarks ?? []),
    dependencies: sortUnique(input.dependencies ?? []),
    tags: sortUnique(input.tags ?? []),
    metadata: cloneOptionalJsonObject(input.metadata)
  };
}

function normalizeControl(input: FrontierPreviewArgControlInput | FrontierPreviewArgControl): FrontierPreviewArgControl {
  return {
    name: normalizeName(input.name, 'control name'),
    type: input.type ?? inferControlType(input.defaultValue),
    label: input.label,
    description: input.description,
    required: Boolean(input.required),
    defaultValue: cloneOptionalJson(input.defaultValue),
    options: (input.options ?? []).map((option) => cloneJson(option)),
    path: input.path ? normalizeFrontierRegistryPath(input.path) : undefined,
    metadata: cloneOptionalJsonObject(input.metadata)
  };
}

function normalizeStateSource(
  input: FrontierPreviewStateSourceInput | FrontierPreviewStateSource,
  entryId: string,
  index: number
): FrontierPreviewStateSource {
  const path = input.path ? normalizeFrontierRegistryPath(input.path) : undefined;
  return {
    id: normalizeId(input.id ?? `${entryId}.state.${index + 1}`),
    kind: input.kind ?? 'fixture',
    path,
    initial: cloneOptionalJson(input.initial),
    snapshots: (input.snapshots ?? []).map((snapshot) => cloneJson(snapshot)),
    transport: input.transport,
    migrations: sortUnique(input.migrations ?? []),
    crdt: Boolean(input.crdt),
    readonly: Boolean(input.readonly),
    metadata: cloneOptionalJsonObject(input.metadata)
  };
}

function normalizeVariant(
  input: FrontierPreviewVariantInput | FrontierPreviewVariant,
  entryId: string,
  index: number
): FrontierPreviewVariant {
  const id = normalizeId(input.id ?? (index === 0 ? 'default' : `variant-${index + 1}`));
  return {
    id,
    title: input.title ?? humanize(id),
    args: cloneOptionalJsonObject(input.args),
    state: cloneOptionalJson(input.state),
    viewport: input.viewport,
    theme: input.theme,
    designTokens: sortUnique(input.designTokens ?? []),
    interactions: (input.interactions ?? []).map((interaction, interactionIndex) => normalizeInteraction(interaction, `${entryId}.${id}`, interactionIndex)),
    tags: sortUnique(input.tags ?? []),
    metadata: cloneOptionalJsonObject(input.metadata)
  };
}

function normalizeInteraction(
  input: FrontierPreviewInteractionInput | FrontierPreviewInteraction,
  parentId: string,
  index: number
): FrontierPreviewInteraction {
  return {
    id: normalizeId(input.id ?? `${parentId}.interaction.${index + 1}`),
    title: input.title,
    event: normalizeName(input.event, 'interaction event'),
    target: input.target,
    args: cloneOptionalJsonObject(input.args),
    reads: normalizePaths(input.reads ?? []),
    writes: normalizePaths(input.writes ?? []),
    effects: sortUnique(input.effects ?? []),
    telemetry: sortUnique(input.telemetry ?? []),
    metadata: cloneOptionalJsonObject(input.metadata)
  };
}

function normalizeEvidence(
  input: FrontierPreviewEvidenceInput | FrontierPreviewEvidence,
  parentId: string,
  index: number
): FrontierPreviewEvidence {
  const kind = input.kind ?? 'smoke';
  return {
    id: normalizeId(input.id ?? `${parentId}.${kind}.${index + 1}`),
    kind,
    title: input.title,
    command: input.command,
    files: sortUnique(input.files ?? []),
    routes: sortUnique(input.routes ?? []),
    states: normalizePaths(input.states ?? []),
    assertions: sortUnique(input.assertions ?? []),
    traces: sortUnique(input.traces ?? []),
    telemetry: sortUnique(input.telemetry ?? []),
    metadata: cloneOptionalJsonObject(input.metadata)
  };
}

function normalizeSource(input: string | FrontierPreviewSource): FrontierPreviewSource {
  if (typeof input === 'string') return { file: input };
  return {
    file: normalizeName(input.file, 'source file'),
    exportName: input.exportName,
    symbol: input.symbol,
    package: input.package,
    line: input.line,
    column: input.column
  };
}

function mergeEntries(entries: FrontierPreviewEntry[]): FrontierPreviewEntry[] {
  const byId = new Map<string, FrontierPreviewEntry>();
  for (const entry of entries) {
    const current = byId.get(entry.id);
    if (!current) {
      byId.set(entry.id, cloneEntry(entry));
      continue;
    }
    byId.set(entry.id, {
      ...current,
      ...entry,
      args: mergeControls([...current.args, ...entry.args]),
      state: mergeState([...current.state, ...entry.state]),
      variants: mergeVariants([...current.variants, ...entry.variants]),
      evidence: mergeEvidence([...current.evidence, ...entry.evidence]),
      docs: sortUnique([...current.docs, ...entry.docs]),
      tests: sortUnique([...current.tests, ...entry.tests]),
      benchmarks: sortUnique([...current.benchmarks, ...entry.benchmarks]),
      dependencies: sortUnique([...current.dependencies, ...entry.dependencies]),
      tags: sortUnique([...current.tags, ...entry.tags]),
      metadata: mergeMetadata([current.metadata, entry.metadata])
    });
  }
  return Array.from(byId.values()).sort(compareEntries);
}

function mergeControls(controls: FrontierPreviewArgControl[]): FrontierPreviewArgControl[] {
  return mergeBy(controls, (control) => control.name, cloneControl).sort((left, right) => left.name.localeCompare(right.name));
}

function mergeState(state: FrontierPreviewStateSource[]): FrontierPreviewStateSource[] {
  return mergeBy(state, (item) => item.id, cloneStateSource).sort((left, right) => left.id.localeCompare(right.id));
}

function mergeVariants(variants: FrontierPreviewVariant[]): FrontierPreviewVariant[] {
  return mergeBy(variants, (variant) => variant.id, cloneVariant).sort((left, right) => left.id.localeCompare(right.id));
}

function mergeEvidence(evidence: readonly (FrontierPreviewEvidence | FrontierPreviewEvidenceInput)[]): FrontierPreviewEvidence[] {
  return mergeBy(
    evidence.map((item, index) => 'assertions' in item && Array.isArray(item.assertions) && 'files' in item && Array.isArray(item.files)
      ? normalizeEvidence(item, 'evidence', index)
      : normalizeEvidence(item as FrontierPreviewEvidenceInput, 'evidence', index)),
    (item) => item.id,
    cloneEvidence
  ).sort((left, right) => left.id.localeCompare(right.id));
}

function mergeSources(sources: FrontierPreviewSource[]): FrontierPreviewSource[] {
  return mergeBy(sources, (source) => `${source.package ?? ''}:${source.file}:${source.exportName ?? ''}`, cloneSource)
    .sort((left, right) => left.file.localeCompare(right.file) || (left.exportName ?? '').localeCompare(right.exportName ?? ''));
}

function mergeBy<T>(items: readonly T[], key: (item: T) => string, clone: (item: T) => T): T[] {
  const byId = new Map<string, T>();
  for (const item of items) byId.set(key(item), clone(item));
  return Array.from(byId.values());
}

function cloneEntry(entry: FrontierPreviewEntry): FrontierPreviewEntry {
  return {
    ...entry,
    source: entry.source ? cloneSource(entry.source) : undefined,
    args: entry.args.map(cloneControl),
    state: entry.state.map(cloneStateSource),
    variants: entry.variants.map(cloneVariant),
    evidence: entry.evidence.map(cloneEvidence),
    docs: entry.docs.slice(),
    tests: entry.tests.slice(),
    benchmarks: entry.benchmarks.slice(),
    dependencies: entry.dependencies.slice(),
    tags: entry.tags.slice(),
    metadata: cloneOptionalJsonObject(entry.metadata)
  };
}

function cloneControl(control: FrontierPreviewArgControl): FrontierPreviewArgControl {
  return {
    ...control,
    defaultValue: cloneOptionalJson(control.defaultValue),
    options: control.options.map((option) => cloneJson(option)),
    metadata: cloneOptionalJsonObject(control.metadata)
  };
}

function cloneStateSource(state: FrontierPreviewStateSource): FrontierPreviewStateSource {
  return {
    ...state,
    initial: cloneOptionalJson(state.initial),
    snapshots: state.snapshots.map((snapshot) => cloneJson(snapshot)),
    migrations: state.migrations.slice(),
    metadata: cloneOptionalJsonObject(state.metadata)
  };
}

function cloneVariant(variant: FrontierPreviewVariant): FrontierPreviewVariant {
  return {
    ...variant,
    args: cloneOptionalJsonObject(variant.args),
    state: cloneOptionalJson(variant.state),
    designTokens: variant.designTokens.slice(),
    interactions: variant.interactions.map(cloneInteraction),
    tags: variant.tags.slice(),
    metadata: cloneOptionalJsonObject(variant.metadata)
  };
}

function cloneInteraction(interaction: FrontierPreviewInteraction): FrontierPreviewInteraction {
  return {
    ...interaction,
    args: cloneOptionalJsonObject(interaction.args),
    reads: interaction.reads.slice(),
    writes: interaction.writes.slice(),
    effects: interaction.effects.slice(),
    telemetry: interaction.telemetry.slice(),
    metadata: cloneOptionalJsonObject(interaction.metadata)
  };
}

function cloneEvidence(evidence: FrontierPreviewEvidence): FrontierPreviewEvidence {
  return {
    ...evidence,
    files: evidence.files.slice(),
    routes: evidence.routes.slice(),
    states: evidence.states.slice(),
    assertions: evidence.assertions.slice(),
    traces: evidence.traces.slice(),
    telemetry: evidence.telemetry.slice(),
    metadata: cloneOptionalJsonObject(evidence.metadata)
  };
}

function cloneSource(source: FrontierPreviewSource): FrontierPreviewSource {
  return { ...source };
}

function cloneOptionalJson<T extends JsonValue | undefined>(value: T): T {
  return value === undefined ? value : cloneJson(value) as T;
}

function cloneOptionalJsonObject<T extends JsonObject | undefined>(value: T): T {
  return value === undefined ? value : cloneJson(value) as T;
}

function normalizePaths(paths: readonly FrontierRegistryPath[]): string[] {
  return sortUnique(paths.map((item) => normalizeFrontierRegistryPath(item)));
}

function sortUnique(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => typeof value === 'string' && value.length > 0))).sort();
}

function normalizeName(value: string, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function normalizeId(value: string): string {
  return normalizeName(value, 'preview id');
}

function inferControlType(value: JsonValue | undefined): FrontierPreviewControlKind {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'array';
  if (value && typeof value === 'object') return 'object';
  return 'text';
}

function compareEntries(left: FrontierPreviewEntry, right: FrontierPreviewEntry): number {
  return left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
}

function previewSearchText(entry: FrontierPreviewEntry): string {
  return [
    entry.id,
    entry.title,
    entry.component,
    entry.source?.file,
    entry.package,
    entry.feature,
    entry.owner,
    entry.renderer,
    ...entry.tags,
    ...entry.variants.flatMap((variant) => [variant.id, variant.title, ...variant.tags])
  ].filter(Boolean).join(' ').toLowerCase();
}

function sourceToRegistrySource(source: FrontierPreviewSource | undefined): FrontierRegistrySource | undefined {
  return source ? { file: source.file, exportName: source.exportName, symbol: source.symbol, package: source.package, line: source.line, column: source.column } : undefined;
}

function normalizeRoutePrefix(prefix: string): string {
  const trimmed = prefix.trim() || '/__frontier_preview';
  return trimmed.startsWith('/') ? trimmed.replace(/\/+$/, '') : '/' + trimmed.replace(/\/+$/, '');
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return slug || 'component';
}

function humanize(value: string): string {
  return value
    .replace(/^preview:/, '')
    .replace(/[-_.:/]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || value;
}

function mergeMetadata(values: readonly (JsonObject | undefined)[]): JsonObject | undefined {
  const out: JsonObject = {};
  let used = false;
  for (const value of values) {
    if (!value) continue;
    Object.assign(out, cloneJson(value));
    used = true;
  }
  return used ? out : undefined;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const object = value as Record<string, unknown>;
  return '{' + Object.keys(object).sort().map((key) => JSON.stringify(key) + ':' + stableStringify(object[key])).join(',') + '}';
}

function fnv1a64(value: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < value.length; i++) {
    hash ^= BigInt(value.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return 'fnv1a64:' + hash.toString(16).padStart(16, '0');
}
