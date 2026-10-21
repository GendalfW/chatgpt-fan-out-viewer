// Run: node tests/smoke.test.cjs. No dependencies or network access required.
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { TextDecoder, TextEncoder } = require('node:util');

const source = fs.readFileSync(path.join(__dirname, '..', 'ChatGPT-Fan-Out-Viewer.user.js'), 'utf8');
assert.match(source, /@version\s+1\.1\.1/);
assert.match(source, /#cgpt-fanout\.minimized \[data-copy\], #cgpt-fanout\.minimized \[data-clear\] \{ display: none; \}/);
assert.match(source, /right: 16px; top: 16px;/);

const storage = new Map();
const listeners = new Map();
const headerListeners = new Map();
const styles = [];
const reply = { headers: { get: () => 'application/octet-stream' } };
let fetchArgs;
const context = {
  TextDecoder, Uint8Array, console,
  innerWidth: 800, innerHeight: 600,
  GM_addStyle: css => styles.push(css),
  GM_setClipboard() {},
  // Skip DOM mounting: these checks do not test visual layout.
  document: { readyState: 'loading', getElementById: () => ({}), addEventListener() {} },
  localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value)
  },
  window: {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); }
  },
  unsafeWindow: { fetch: async (...args) => { fetchArgs = args; return reply; } }
};

// Expose closure locals only in this VM's copy; the distributed script is unmodified.
assert.ok(source.trimEnd().endsWith('})();'));
vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, '\n globalThis.testAPI = { inspect, scan, watch, add, queries, place, makeDraggable };\n})();'), context);
const api = context.testAPI;

api.inspect({ search_queries: [{ q: 'Amsterdam museum' }, { query: 'Kyiv tours' }] });
api.inspect({ web_search: { query: 'Berlin tour' } });
api.inspect({ arguments: '{"search_query":[{"q":"Paris walks"}]}' });
api.scan('data: {"search_query":[{"q":"Amsterdam museum"}]}\n\ndata: [DONE]');
api.inspect({ query: 'not a search field' });
api.add('   ');
api.add('x'.repeat(501));
assert.deepEqual(Array.from(api.queries), ['Amsterdam museum', 'Kyiv tours', 'Berlin tour', 'Paris walks']);

const panel = {
  style: {},
  getBoundingClientRect() {
    return { left: Number.parseFloat(this.style.left) || 16, top: Number.parseFloat(this.style.top) || 16, width: 300, height: 200 };
  },
  querySelector: () => ({ addEventListener: (name, fn) => headerListeners.set(name, fn) })
};
api.place(panel, 900, -10);
assert.equal(panel.style.left, '500px');
assert.equal(panel.style.top, '0px');
api.place(panel, 16, 16);
api.makeDraggable(panel);
headerListeners.get('pointerdown')({ target: { closest: () => false }, preventDefault() {}, clientX: 26, clientY: 26 });
listeners.get('pointermove')({ clientX: 210, clientY: 230 });
listeners.get('pointerup')();
assert.deepEqual(JSON.parse(storage.get('cgpt-fanout-position')), { left: 200, top: 220 });
api.place(panel, 16, 16);
api.makeDraggable(panel);
assert.equal(panel.style.left, '200px');
assert.equal(panel.style.top, '220px');
assert.ok(styles.length === 1);

(async () => {
  const bytes = new TextEncoder().encode('data: {"web_search_queries":[{"query":"Київ екскурсії"}]}\n\ndata: [DONE]');
  let index = 0;
  await api.watch({ body: { getReader: () => ({ read: async () => index < bytes.length
    ? { value: bytes.slice(index, ++index), done: false }
    : { done: true } }) } });
  assert.ok(api.queries.includes('Київ екскурсії'));
  const options = { method: 'GET' };
  assert.equal(await context.unsafeWindow.fetch('/example', options), reply);
  assert.equal(fetchArgs[0], '/example');
  assert.equal(fetchArgs[1], options);
  console.log('PASS: extraction, deduplication, UTF-8 stream chunks, fetch pass-through, position bounds, drag and saved-position restoration.');
  console.log('Not covered: real browser rendering, extension execution worlds, live ChatGPT payloads or server-side search completeness.');
})().catch(error => { console.error(error); process.exitCode = 1; });
