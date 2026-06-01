import {
  FRONTIER_COMPONENT_PREVIEW_DEFAULT_INTEGRATIONS,
  createPreviewHarnessPlan,
  createPreviewSearchRecords,
  resolvePreviewIntegrationFlags,
  type FrontierPreviewHarnessPlan,
  type FrontierPreviewIntegrationFlags,
  type FrontierPreviewManifest,
  type FrontierPreviewSearchRecord
} from './index.js';

export interface FrontierPreviewBookOptions {
  title?: string;
  basePath?: string;
  routePrefix?: string;
  selectedEntryId?: string;
  selectedVariantId?: string;
  inspector?: boolean;
  includeHarness?: boolean;
  integrations?: FrontierPreviewIntegrationFlags;
}

export interface FrontierPreviewBookSelection {
  entryId?: string;
  variantId?: string;
}

export interface FrontierPreviewInspectorBridge {
  kind: 'frontier.component-preview.inspector-bridge';
  version: 1;
  manifestId: string;
  capabilities: {
    inspect: boolean;
    rewind: boolean;
    state: boolean;
    crdt: boolean;
    eventLog: boolean;
    patches: boolean;
    traces: boolean;
    telemetry: boolean;
  };
  globals: {
    bridge: string;
    book: string;
  };
  timeline: Array<{ id: string; entryId: string; variantId: string; type: string; at: number }>;
}

export interface FrontierPreviewBookState {
  kind: 'frontier.component-preview.book';
  version: 1;
  title: string;
  basePath: string;
  routePrefix: string;
  selected: FrontierPreviewBookSelection;
  integrations: Required<FrontierPreviewIntegrationFlags>;
  manifest: FrontierPreviewManifest;
  search: FrontierPreviewSearchRecord[];
  harness?: FrontierPreviewHarnessPlan;
  inspector?: FrontierPreviewInspectorBridge;
}

export function createPreviewBookState(
  manifest: FrontierPreviewManifest,
  options: FrontierPreviewBookOptions = {}
): FrontierPreviewBookState {
  const integrations = resolvePreviewIntegrationFlags(options.integrations);
  const firstEntry = manifest.entries[0];
  const firstVariant = firstEntry?.variants[0];
  const inspectorEnabled = options.inspector ?? integrations.inspector;
  return {
    kind: 'frontier.component-preview.book',
    version: 1,
    title: options.title ?? 'Frontier Component Preview',
    basePath: options.basePath ?? '/',
    routePrefix: normalizeRoutePrefix(options.routePrefix ?? '/__frontier_preview'),
    selected: {
      entryId: options.selectedEntryId ?? firstEntry?.id,
      variantId: options.selectedVariantId ?? firstVariant?.id
    },
    integrations,
    manifest,
    search: createPreviewSearchRecords(manifest),
    harness: options.includeHarness === false ? undefined : createPreviewHarnessPlan(manifest, {
      routePrefix: options.routePrefix,
      includeBrowserEvidence: integrations.browserEvidence,
      includeFuzz: integrations.fuzz,
      includeBenchmarks: integrations.benchmarks,
      includeTelemetry: integrations.telemetry
    }),
    inspector: inspectorEnabled ? createPreviewInspectorBridge(manifest, { integrations }) : undefined
  };
}

export function createPreviewInspectorBridge(
  manifest: FrontierPreviewManifest,
  options: { integrations?: FrontierPreviewIntegrationFlags; bridgeGlobalName?: string; bookGlobalName?: string } = {}
): FrontierPreviewInspectorBridge {
  const integrations = resolvePreviewIntegrationFlags(options.integrations);
  return {
    kind: 'frontier.component-preview.inspector-bridge',
    version: 1,
    manifestId: manifest.id,
    capabilities: {
      inspect: integrations.inspector,
      rewind: integrations.eventLogReplay || integrations.crdtTimeline,
      state: integrations.stateBridge,
      crdt: integrations.crdtTimeline,
      eventLog: integrations.eventLogReplay,
      patches: integrations.stateBridge,
      traces: integrations.telemetry,
      telemetry: integrations.telemetry
    },
    globals: {
      bridge: options.bridgeGlobalName ?? '__FRONTIER_PREVIEW_BRIDGE__',
      book: options.bookGlobalName ?? '__FRONTIER_PREVIEW_BOOK__'
    },
    timeline: manifest.entries.flatMap((entry) => entry.variants.map((variant, index) => ({
      id: `${entry.id}#${variant.id}`,
      entryId: entry.id,
      variantId: variant.id,
      type: 'preview.variant',
      at: manifest.generatedAt + index
    })))
  };
}

export function renderPreviewBookHtml(
  manifest: FrontierPreviewManifest,
  options: FrontierPreviewBookOptions = {}
): string {
  const state = createPreviewBookState(manifest, options);
  const stateJson = serializePreviewBookState(state);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(state.title)}</title>
<style>
:root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
body { margin: 0; background: #f6f7f9; color: #14161a; }
@media (prefers-color-scheme: dark) { body { background: #111318; color: #f7f8fa; } }
.fp-shell { min-height: 100vh; display: grid; grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); }
.fp-sidebar { border-right: 1px solid rgba(120, 130, 150, 0.28); padding: 16px; overflow: auto; background: rgba(255, 255, 255, 0.7); }
.fp-main { min-width: 0; padding: 18px; }
.fp-title { margin: 0 0 14px; font-size: 18px; line-height: 1.25; }
.fp-search { box-sizing: border-box; width: 100%; min-height: 34px; padding: 6px 9px; border: 1px solid rgba(120, 130, 150, 0.35); border-radius: 6px; background: transparent; color: inherit; }
.fp-list { display: grid; gap: 6px; margin-top: 12px; }
.fp-list button, .fp-variant { width: 100%; text-align: left; border: 1px solid rgba(120, 130, 150, 0.3); border-radius: 6px; background: rgba(255, 255, 255, 0.72); color: inherit; padding: 8px 9px; cursor: pointer; }
.fp-list button[data-active="true"], .fp-variant[data-active="true"] { border-color: #2563eb; box-shadow: inset 3px 0 0 #2563eb; }
.fp-stage { min-height: 320px; border: 1px solid rgba(120, 130, 150, 0.28); border-radius: 8px; background: rgba(255, 255, 255, 0.86); overflow: hidden; }
.fp-preview-header { padding: 14px 16px; border-bottom: 1px solid rgba(120, 130, 150, 0.22); display: flex; gap: 10px; align-items: center; justify-content: space-between; }
.fp-preview-title { margin: 0; font-size: 16px; line-height: 1.3; }
.fp-preview-body { min-height: 220px; padding: 18px; display: grid; place-items: center; }
.fp-panel { margin-top: 14px; display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.fp-panel section { border: 1px solid rgba(120, 130, 150, 0.24); border-radius: 8px; padding: 12px; background: rgba(255, 255, 255, 0.62); }
.fp-panel h3 { margin: 0 0 8px; font-size: 13px; line-height: 1.25; }
.fp-panel pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12px; line-height: 1.45; }
.fp-inspector-button { position: fixed; right: 18px; bottom: 18px; z-index: 50; border: 1px solid rgba(30, 64, 175, 0.55); border-radius: 999px; background: #2563eb; color: white; padding: 10px 13px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22); cursor: pointer; }
.fp-inspector { position: fixed; right: 18px; bottom: 68px; width: min(420px, calc(100vw - 36px)); max-height: min(620px, calc(100vh - 96px)); overflow: auto; z-index: 49; border: 1px solid rgba(120, 130, 150, 0.32); border-radius: 8px; background: #111827; color: #f9fafb; padding: 12px; display: none; }
.fp-inspector[data-open="true"] { display: block; }
.fp-muted { color: #667085; }
@media (max-width: 780px) { .fp-shell { grid-template-columns: 1fr; } .fp-sidebar { border-right: 0; border-bottom: 1px solid rgba(120, 130, 150, 0.28); } }
</style>
</head>
<body>
<div id="frontier-component-preview-root"></div>
<script type="application/json" id="frontier-component-preview-state">${stateJson}</script>
<script>${renderPreviewBookInlineScript()}</script>
</body>
</html>`;
}

export function renderPreviewClientModule(
  manifest: FrontierPreviewManifest,
  options: FrontierPreviewBookOptions = {}
): string {
  const state = createPreviewBookState(manifest, options);
  return [
    'export const frontierPreviewBookState = ' + serializePreviewBookState(state) + ';',
    'export function mountFrontierPreviewBook(target = document.getElementById("frontier-component-preview-root") || document.body) {',
    '  window.__FRONTIER_PREVIEW_BOOK__ = frontierPreviewBookState;',
    '  target.innerHTML = "";',
    '  const root = document.createElement("div");',
    '  root.id = "frontier-component-preview-root";',
    '  target.appendChild(root);',
    '  renderFrontierPreviewBook(root, frontierPreviewBookState);',
    '}',
    'export function renderFrontierPreviewBook(root, state) {',
    renderPreviewBookRuntimeFunctionBody(),
    '}',
    'if (typeof window !== "undefined") window.__FRONTIER_PREVIEW_BOOK__ = frontierPreviewBookState;'
  ].join('\n');
}

export function serializePreviewBookState(state: FrontierPreviewBookState): string {
  return JSON.stringify(state).replace(/</g, '\\u003c');
}

function renderPreviewBookInlineScript(): string {
  return [
    'const state = JSON.parse(document.getElementById("frontier-component-preview-state").textContent);',
    'window.__FRONTIER_PREVIEW_BOOK__ = state;',
    'renderFrontierPreviewBook(document.getElementById("frontier-component-preview-root"), state);',
    'function renderFrontierPreviewBook(root, state) {',
    renderPreviewBookRuntimeFunctionBody(),
    '}'
  ].join('\n');
}

function renderPreviewBookRuntimeFunctionBody(): string {
  return `
  let selectedEntryId = state.selected.entryId;
  let selectedVariantId = state.selected.variantId;
  const entries = state.manifest.entries;
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  function selectedEntry() { return byId.get(selectedEntryId) || entries[0]; }
  function selectedVariant(entry) { return (entry && entry.variants.find((variant) => variant.id === selectedVariantId)) || entry?.variants[0]; }
  function render() {
    const entry = selectedEntry();
    const variant = selectedVariant(entry);
    root.innerHTML = '<div class="fp-shell"><aside class="fp-sidebar"><h1 class="fp-title"></h1><input class="fp-search" type="search" placeholder="Search previews"><div class="fp-list"></div></aside><main class="fp-main"><div class="fp-stage"></div><div class="fp-panel"></div></main></div>';
    root.querySelector(".fp-title").textContent = state.title;
    const list = root.querySelector(".fp-list");
    const search = root.querySelector(".fp-search");
    function renderList(query = "") {
      list.innerHTML = "";
      for (const item of state.search.filter((record) => !query || record.text.includes(query.toLowerCase()))) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.active = String(item.id === entry?.id);
        button.textContent = item.title;
        button.onclick = () => { selectedEntryId = item.id; selectedVariantId = byId.get(item.id)?.variants[0]?.id; render(); };
        list.appendChild(button);
      }
    }
    search.oninput = () => renderList(search.value);
    renderList();
    const stage = root.querySelector(".fp-stage");
    stage.innerHTML = '<div class="fp-preview-header"><h2 class="fp-preview-title"></h2><span class="fp-muted"></span></div><div class="fp-preview-body"></div>';
    stage.querySelector(".fp-preview-title").textContent = entry ? entry.title : "No previews";
    stage.querySelector(".fp-muted").textContent = variant ? variant.title : "";
    const body = stage.querySelector(".fp-preview-body");
    body.innerHTML = "";
    const placeholder = document.createElement("div");
    placeholder.textContent = entry ? entry.component + " / " + (variant?.id || "default") : "No preview entries discovered";
    body.appendChild(placeholder);
    const panel = root.querySelector(".fp-panel");
    panel.innerHTML = "";
    const variantSection = document.createElement("section");
    variantSection.innerHTML = '<h3>Variants</h3>';
    for (const option of entry?.variants || []) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fp-variant";
      button.dataset.active = String(option.id === variant?.id);
      button.textContent = option.title;
      button.onclick = () => { selectedVariantId = option.id; render(); };
      variantSection.appendChild(button);
    }
    panel.appendChild(variantSection);
    panel.appendChild(renderJsonPanel("State", variant?.state ?? entry?.state ?? []));
    panel.appendChild(renderJsonPanel("Harness", state.harness?.targets?.filter((target) => target.entryId === entry?.id) ?? []));
    if (state.inspector) mountInspector(state, entry, variant);
  }
  function renderJsonPanel(title, value) {
    const section = document.createElement("section");
    const heading = document.createElement("h3");
    const pre = document.createElement("pre");
    heading.textContent = title;
    pre.textContent = JSON.stringify(value, null, 2);
    section.appendChild(heading);
    section.appendChild(pre);
    return section;
  }
  function mountInspector(state, entry, variant) {
    if (!document.querySelector(".fp-inspector-button")) {
      const panel = document.createElement("div");
      panel.className = "fp-inspector";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fp-inspector-button";
      button.textContent = "Inspect";
      button.onclick = () => {
        panel.dataset.open = panel.dataset.open === "true" ? "false" : "true";
      };
      document.body.appendChild(panel);
      document.body.appendChild(button);
    }
    const inspector = document.querySelector(".fp-inspector");
    inspector.innerHTML = "";
    inspector.appendChild(renderJsonPanel("Preview", { entry, variant, capabilities: state.inspector.capabilities, timeline: state.inspector.timeline }).lastChild);
    window[state.inspector.globals.bridge] = { state, selected: { entry, variant }, rewind(index = 0) { return state.inspector.timeline[index] || null; } };
  }
  render();`;
}

function normalizeRoutePrefix(prefix: string): string {
  const trimmed = prefix.trim() || '/__frontier_preview';
  return trimmed.startsWith('/') ? trimmed.replace(/\/+$/, '') : '/' + trimmed.replace(/\/+$/, '');
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char] || char);
}

export const DEFAULT_PREVIEW_BOOK_INTEGRATIONS = FRONTIER_COMPONENT_PREVIEW_DEFAULT_INTEGRATIONS;
