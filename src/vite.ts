import { renderPreviewBookHtml, renderPreviewClientModule } from './browser.js';
import { discoverFrontierPreviews, generatePreviewEntryModule, type FrontierPreviewDiscoveryOptions } from './node.js';
import { resolvePreviewIntegrationFlags, type FrontierPreviewIntegrationFlags } from './index.js';

export interface FrontierComponentPreviewViteOptions extends FrontierPreviewDiscoveryOptions {
  routePrefix?: string;
  jsxImportSource?: string | false;
  hmr?: boolean;
  virtualPrefix?: string;
  integrations?: FrontierPreviewIntegrationFlags;
}

export interface FrontierComponentPreviewVitePlugin {
  name: string;
  enforce: 'pre';
  config?(): Record<string, unknown> | undefined;
  configureServer?(server: FrontierComponentPreviewViteServer): void;
  resolveId?(id: string): string | null;
  load?(id: string): Promise<string | null>;
  handleHotUpdate?(context: FrontierComponentPreviewHotUpdateContext): Promise<unknown[] | void> | unknown[] | void;
}

export interface FrontierComponentPreviewViteServer {
  middlewares?: {
    use(route: string, handler: (request: FrontierComponentPreviewRequest, response: FrontierComponentPreviewResponse, next: () => void) => void | Promise<void>): void;
  };
  ws?: {
    send(payload: unknown): void;
  };
}

export interface FrontierComponentPreviewRequest {
  url?: string;
}

export interface FrontierComponentPreviewResponse {
  statusCode?: number;
  setHeader?(name: string, value: string): void;
  end(body?: string): void;
}

export interface FrontierComponentPreviewHotUpdateContext {
  file: string;
  server?: FrontierComponentPreviewViteServer;
  modules?: unknown[];
}

const DEFAULT_VIRTUAL_PREFIX = 'virtual:frontier-component-preview/';
const RESOLVED_PREFIX = '\0frontier-component-preview:';

export function frontierComponentPreviewVite(
  options: FrontierComponentPreviewViteOptions = {}
): FrontierComponentPreviewVitePlugin {
  const integrations = resolvePreviewIntegrationFlags(options.integrations);
  const virtualPrefix = options.virtualPrefix ?? DEFAULT_VIRTUAL_PREFIX;
  const routePrefix = normalizeRoutePrefix(options.routePrefix ?? '/__frontier_preview');
  const hmr = options.hmr ?? true;
  return {
    name: 'frontier-component-preview',
    enforce: 'pre',
    config() {
      if (!integrations.vite) return undefined;
      if (options.jsxImportSource === false) return undefined;
      return {
        esbuild: {
          jsx: 'automatic',
          jsxImportSource: options.jsxImportSource ?? '@shapeshift-labs/frontier-dom'
        }
      };
    },
    configureServer(server) {
      if (!integrations.browserBook) return;
      server.middlewares?.use(routePrefix, async (_request, response) => {
        const result = await discoverFrontierPreviews({ ...options, integrations });
        response.statusCode = 200;
        response.setHeader?.('content-type', 'text/html; charset=utf-8');
        response.end(renderPreviewBookHtml(result.manifest, { routePrefix, integrations }));
      });
    },
    resolveId(id) {
      return id.startsWith(virtualPrefix) ? RESOLVED_PREFIX + id.slice(virtualPrefix.length) : null;
    },
    async load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return null;
      const name = id.slice(RESOLVED_PREFIX.length);
      const result = await discoverFrontierPreviews({ ...options, integrations });
      if (name === 'manifest') {
        return `export default ${JSON.stringify(result.manifest, null, 2)};\nexport const manifest = ${JSON.stringify(result.manifest, null, 2)};\n`;
      }
      if (name === 'book') {
        return `export default ${JSON.stringify(renderPreviewBookHtml(result.manifest, { routePrefix, integrations }))};\n`;
      }
      if (name === 'client') {
        return renderPreviewClientModule(result.manifest, { routePrefix, integrations });
      }
      if (name === 'module') {
        return generatePreviewEntryModule(result.manifest, { rootDir: result.rootDir });
      }
      return null;
    },
    handleHotUpdate(context) {
      if (!hmr || integrations.vite === false) return context.modules;
      if (!/\.[jt]sx?$/.test(context.file)) return context.modules;
      context.server?.ws?.send({ type: 'full-reload', path: routePrefix });
      return [];
    }
  };
}

export const createFrontierComponentPreviewVitePlugin = frontierComponentPreviewVite;

export function previewVirtualSpecifier(name: 'manifest' | 'book' | 'client' | 'module', prefix = DEFAULT_VIRTUAL_PREFIX): string {
  return prefix + name;
}

function normalizeRoutePrefix(prefix: string): string {
  const trimmed = prefix.trim() || '/__frontier_preview';
  return trimmed.startsWith('/') ? trimmed.replace(/\/+$/, '') : '/' + trimmed.replace(/\/+$/, '');
}
