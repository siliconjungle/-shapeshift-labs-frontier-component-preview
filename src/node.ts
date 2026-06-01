import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderPreviewBookHtml } from './browser.js';
import {
  createPreviewManifest,
  resolvePreviewIntegrationFlags,
  type FrontierPreviewEntryInput,
  type FrontierPreviewIntegrationFlags,
  type FrontierPreviewManifest,
  type FrontierPreviewManifestInput,
  type FrontierPreviewRenderer,
  type FrontierPreviewSource,
  type FrontierPreviewVariantInput
} from './index.js';

export interface FrontierPreviewDiscoveryOptions {
  rootDir?: string;
  include?: readonly string[];
  exclude?: readonly string[];
  extensions?: readonly string[];
  packageName?: string;
  renderer?: FrontierPreviewRenderer;
  generatedAt?: number;
  defaultVariants?: readonly FrontierPreviewVariantInput[];
  integrations?: FrontierPreviewIntegrationFlags;
  maxFiles?: number;
}

export interface FrontierPreviewDiscoveredFile {
  file: string;
  absolutePath: string;
  previewFile: boolean;
  exports: string[];
}

export interface FrontierPreviewDiscoveryDiagnostic {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  file?: string;
}

export interface FrontierPreviewDiscoveryResult {
  rootDir: string;
  manifest: FrontierPreviewManifest;
  files: FrontierPreviewDiscoveredFile[];
  diagnostics: FrontierPreviewDiscoveryDiagnostic[];
}

export interface FrontierPreviewWriteArtifactsOptions extends FrontierPreviewDiscoveryOptions {
  outDir?: string;
  manifestFileName?: string;
  moduleFileName?: string;
  htmlFileName?: string;
  title?: string;
}

export interface FrontierPreviewWrittenArtifact {
  kind: 'manifest' | 'module' | 'html';
  file: string;
}

export interface FrontierPreviewWriteArtifactsResult extends FrontierPreviewDiscoveryResult {
  outDir: string;
  artifacts: FrontierPreviewWrittenArtifact[];
}

export interface FrontierPreviewGenerateModuleOptions {
  rootDir?: string;
  packageName?: string;
  manifestImport?: string;
}

export async function loadFrontierPreviewConfig(cwd = process.cwd()): Promise<FrontierPreviewDiscoveryOptions> {
  const rootDir = path.resolve(cwd);
  for (const file of ['frontier.preview.mjs', 'frontier.preview.js', 'frontier.config.mjs', 'frontier.config.js']) {
    const full = path.join(rootDir, file);
    if (!await exists(full)) continue;
    const mod = await import(pathToFileURL(full).href + '?t=' + Date.now());
    const value = mod.componentPreview ?? mod.preview ?? mod.default?.componentPreview ?? mod.default?.preview ?? mod.default;
    return value && typeof value === 'object' ? { rootDir, ...value } : { rootDir };
  }
  return { rootDir };
}

export async function discoverFrontierPreviews(
  options: FrontierPreviewDiscoveryOptions = {}
): Promise<FrontierPreviewDiscoveryResult> {
  const loaded = options.rootDir ? options : { ...await loadFrontierPreviewConfig(process.cwd()), ...options };
  const rootDir = path.resolve(loaded.rootDir ?? process.cwd());
  const integrations = resolvePreviewIntegrationFlags(loaded.integrations);
  const files = integrations.autoDiscovery === false
    ? []
    : await collectSourceFiles(rootDir, loaded);
  const packageName = loaded.packageName ?? await readPackageName(rootDir);
  const diagnostics: FrontierPreviewDiscoveryDiagnostic[] = [];
  const entries: FrontierPreviewEntryInput[] = [];
  const discovered: FrontierPreviewDiscoveredFile[] = [];
  for (const absolutePath of files) {
    const file = slash(path.relative(rootDir, absolutePath));
    const source = await fs.readFile(absolutePath, 'utf8');
    const exports = extractComponentExports(source, absolutePath);
    const previewFile = isPreviewFile(absolutePath);
    discovered.push({ file, absolutePath, previewFile, exports });
    if (exports.length === 0 && !previewFile) {
      diagnostics.push({
        severity: 'info',
        code: 'frontier-preview/no-component-exports',
        message: 'No component exports were discovered in source file.',
        file
      });
      continue;
    }
    for (const exportName of exports) {
      const title = titleFromExport(exportName, file);
      entries.push({
        id: previewIdForFile(file, exportName),
        title,
        component: exportName === 'default' ? titleFromFile(file) : exportName,
        exportName,
        module: './' + file,
        source: { file, exportName, package: packageName },
        package: packageName,
        renderer: loaded.renderer ?? 'frontier-dom',
        variants: loaded.defaultVariants ?? defaultVariantsForSource(file, exportName),
        tags: previewFile ? ['manual-preview'] : ['auto-generated']
      });
    }
  }
  const manifest = createPreviewManifest({
    id: packageName ? `${packageName}.component-preview` : 'frontier.component-preview',
    package: packageName,
    renderer: loaded.renderer ?? 'frontier-dom',
    generatedAt: loaded.generatedAt,
    entries,
    sources: discovered.flatMap((file) => file.exports.map((exportName): FrontierPreviewSource => ({
      file: file.file,
      exportName,
      package: packageName
    }))),
    tags: ['frontier-component-preview', integrations.autoDiscovery ? 'auto-discovery' : 'manual-only'],
    metadata: {
      integrations,
      files: discovered.length
    }
  } satisfies FrontierPreviewManifestInput);
  return { rootDir, manifest, files: discovered, diagnostics };
}

export const discoverPreviewSources = discoverFrontierPreviews;

export async function writePreviewArtifacts(
  options: FrontierPreviewWriteArtifactsOptions = {}
): Promise<FrontierPreviewWriteArtifactsResult> {
  const result = await discoverFrontierPreviews(options);
  const outDir = path.resolve(result.rootDir, options.outDir ?? '.frontier/preview');
  await fs.mkdir(outDir, { recursive: true });
  const manifestFile = path.join(outDir, options.manifestFileName ?? 'manifest.json');
  const moduleFile = path.join(outDir, options.moduleFileName ?? 'preview-module.mjs');
  const htmlFile = path.join(outDir, options.htmlFileName ?? 'index.html');
  await fs.writeFile(manifestFile, JSON.stringify(result.manifest, null, 2) + '\n');
  await fs.writeFile(moduleFile, generatePreviewEntryModule(result.manifest, { rootDir: result.rootDir }));
  await fs.writeFile(htmlFile, renderPreviewBookHtml(result.manifest, { title: options.title }));
  return {
    ...result,
    outDir,
    artifacts: [
      { kind: 'manifest', file: manifestFile },
      { kind: 'module', file: moduleFile },
      { kind: 'html', file: htmlFile }
    ]
  };
}

export function generatePreviewEntryModule(
  manifest: FrontierPreviewManifest,
  options: FrontierPreviewGenerateModuleOptions = {}
): string {
  const rootDir = options.rootDir ? path.resolve(options.rootDir) : process.cwd();
  const importRows: string[] = [];
  const componentRows: string[] = [];
  manifest.entries.forEach((entry, index) => {
    if (!entry.module) return;
    const localName = `previewModule${index}`;
    const specifier = normalizeModuleSpecifier(entry.module, rootDir);
    importRows.push(`import * as ${localName} from ${JSON.stringify(specifier)};`);
    const exportName = entry.exportName ?? entry.component;
    componentRows.push(`${JSON.stringify(entry.id)}: ${localName}[${JSON.stringify(exportName)}] ?? ${localName}.default`);
  });
  return [
    `import { createPreviewManifest } from ${JSON.stringify(options.manifestImport ?? '@shapeshift-labs/frontier-component-preview')};`,
    ...importRows,
    '',
    `export const frontierPreviewManifest = createPreviewManifest(${JSON.stringify(manifest, null, 2)});`,
    `export const frontierPreviewComponents = {${componentRows.length ? '\n  ' + componentRows.join(',\n  ') + '\n' : ''}};`,
    'export function getFrontierPreviewComponent(id) {',
    '  return frontierPreviewComponents[id];',
    '}',
    'export default frontierPreviewManifest;',
    ''
  ].join('\n');
}

export function extractComponentExports(source: string, file = 'component.tsx'): string[] {
  const names = new Set<string>();
  const patterns = [
    /export\s+(?:async\s+)?function\s+([A-Z][A-Za-z0-9_]*)\s*\(/g,
    /export\s+const\s+([A-Z][A-Za-z0-9_]*)\s*(?::[^=]+)?=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g,
    /export\s+let\s+([A-Z][A-Za-z0-9_]*)\s*(?::[^=]+)?=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g,
    /export\s+var\s+([A-Z][A-Za-z0-9_]*)\s*(?::[^=]+)?=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g,
    /export\s*\{\s*([^}]+)\s*\}/g
  ];
  for (let i = 0; i < patterns.length - 1; i++) {
    let match;
    while ((match = patterns[i].exec(source)) !== null) names.add(match[1]);
  }
  let match;
  const namedExportPattern = patterns[patterns.length - 1];
  while ((match = namedExportPattern.exec(source)) !== null) {
    for (const part of match[1].split(',')) {
      const exported = part.trim().split(/\s+as\s+/i).pop()?.trim();
      if (exported && /^[A-Z][A-Za-z0-9_]*$/.test(exported)) names.add(exported);
    }
  }
  if (/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)?\s*\(/.test(source)) {
    const defaultName = source.match(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/)?.[1];
    names.add(defaultName ?? 'default');
  } else if (/export\s+default\s+/.test(source) && looksLikeJsxSource(source, file)) {
    names.add('default');
  }
  return Array.from(names).sort();
}

async function collectSourceFiles(rootDir: string, options: FrontierPreviewDiscoveryOptions): Promise<string[]> {
  const include = options.include?.length ? options.include : ['src', 'app', 'apps', 'packages', 'components'];
  const exclude = new Set([...(options.exclude ?? []), 'node_modules', 'dist', 'coverage', '.git', '.next', '.turbo', 'benchmarks/results']);
  const extensions = new Set(options.extensions ?? ['.tsx', '.jsx']);
  const maxFiles = options.maxFiles ?? 5000;
  const out: string[] = [];
  for (const entry of include) {
    const start = path.resolve(rootDir, entry);
    if (!await exists(start)) continue;
    await visit(start);
    if (out.length >= maxFiles) break;
  }
  return out.slice(0, maxFiles).sort();

  async function visit(dir: string): Promise<void> {
    const relative = slash(path.relative(rootDir, dir));
    if (relative && shouldExclude(relative, exclude)) return;
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
      const full = path.join(dir, dirent.name);
      const childRelative = slash(path.relative(rootDir, full));
      if (shouldExclude(childRelative, exclude)) continue;
      if (dirent.isDirectory()) {
        await visit(full);
      } else if (extensions.has(path.extname(dirent.name)) && !dirent.name.endsWith('.d.tsx')) {
        out.push(full);
      }
      if (out.length >= maxFiles) return;
    }
  }
}

function shouldExclude(relative: string, exclude: Set<string>): boolean {
  const normalized = slash(relative);
  for (const item of exclude) {
    const value = slash(item);
    if (normalized === value || normalized.startsWith(value + '/')) return true;
    if (normalized.split('/').includes(value)) return true;
  }
  return false;
}

async function readPackageName(rootDir: string): Promise<string | undefined> {
  const file = path.join(rootDir, 'package.json');
  if (!await exists(file)) return undefined;
  try {
    const packageJson = JSON.parse(await fs.readFile(file, 'utf8'));
    return typeof packageJson.name === 'string' ? packageJson.name : undefined;
  } catch {
    return undefined;
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.stat(file);
    return true;
  } catch {
    return false;
  }
}

function defaultVariantsForSource(file: string, exportName: string): FrontierPreviewVariantInput[] {
  return [
    { id: 'default', title: 'Default', tags: ['auto-generated'] },
    { id: 'agent-evidence', title: 'Agent Evidence', tags: ['agent', 'evidence'], metadata: { source: file, exportName } }
  ];
}

function previewIdForFile(file: string, exportName: string): string {
  return `preview:${slugify(file.replace(/\.[^.]+$/, ''))}:${slugify(exportName)}`;
}

function titleFromExport(exportName: string, file: string): string {
  return exportName === 'default' ? titleFromFile(file) : humanize(exportName);
}

function titleFromFile(file: string): string {
  return humanize(path.basename(file).replace(/\.[^.]+$/, ''));
}

function isPreviewFile(file: string): boolean {
  const base = path.basename(file);
  return /\.preview\.[jt]sx?$/.test(base) || /\.frontier\.preview\.[jt]sx?$/.test(base) || file.includes(`${path.sep}__previews__${path.sep}`);
}

function looksLikeJsxSource(source: string, file: string): boolean {
  return /\.(tsx|jsx)$/.test(file) || /<[A-Z][A-Za-z0-9_.]*(\s|>|\/>)/.test(source);
}

function normalizeModuleSpecifier(specifier: string, rootDir: string): string {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return specifier;
  const absolute = path.resolve(rootDir, specifier);
  return './' + slash(path.relative(rootDir, absolute));
}

function slugify(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'component';
}

function humanize(value: string): string {
  return value
    .replace(/[-_.:/]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || value;
}

function slash(value: string): string {
  return value.split(path.sep).join('/');
}
