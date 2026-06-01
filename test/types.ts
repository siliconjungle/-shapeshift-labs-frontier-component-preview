import {
  createPreviewManifest,
  defineFrontierPreview,
  resolvePreviewIntegrationFlags,
  type FrontierPreviewManifest
} from '../dist/index.js';
import { renderPreviewBookHtml } from '../dist/browser.js';
import { discoverFrontierPreviews } from '../dist/node.js';
import { createPreviewHarnessManifest } from '../dist/harness.js';
import { frontierComponentPreviewVite } from '../dist/vite.js';

const preview = defineFrontierPreview({
  component: 'TodoCard',
  source: { file: 'src/components/TodoCard.tsx', exportName: 'TodoCard' },
  variants: [{ id: 'default', title: 'Default' }]
});

const manifest: FrontierPreviewManifest = createPreviewManifest({
  entries: [preview]
});

renderPreviewBookHtml(manifest);
createPreviewHarnessManifest(manifest);
frontierComponentPreviewVite({ integrations: { inspector: false } });
resolvePreviewIntegrationFlags({ telemetry: false });
void discoverFrontierPreviews({ rootDir: '.', integrations: { autoDiscovery: true } });
