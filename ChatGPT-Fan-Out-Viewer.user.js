// ==UserScript==
// @name         ChatGPT Fan-Out Viewer
// @namespace    https://roman-piliuta.pp.ua/
// @version      1.1.1
// @description  Shows web-search queries exposed in ChatGPT's browser stream.
// @author       Roman Piliuta (GendalfW)
// @license      MIT
// @homepageURL  https://github.com/GendalfW/chatgpt-fan-out-viewer
// @supportURL   https://github.com/GendalfW/chatgpt-fan-out-viewer/issues
// @updateURL    https://raw.githubusercontent.com/GendalfW/chatgpt-fan-out-viewer/main/ChatGPT-Fan-Out-Viewer.user.js
// @downloadURL  https://raw.githubusercontent.com/GendalfW/chatgpt-fan-out-viewer/main/ChatGPT-Fan-Out-Viewer.user.js
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(() => {
  'use strict';

  const page = unsafeWindow;
  const positionKey = 'cgpt-fanout-position';
  const queries = [];
  const seen = new Set();
  let list;
  let empty;
  let count;

  GM_addStyle(`
    #cgpt-fanout { position: fixed; right: 16px; top: 16px; z-index: 2147483647;
      width: min(380px, calc(100vw - 32px)); max-height: 55vh; overflow: hidden;
      color: #ececf1; background: #202123; border: 1px solid #4d4d4f; border-radius: 12px;
      box-shadow: 0 12px 38px #0008; font: 13px/1.4 system-ui, sans-serif; }
    #cgpt-fanout header { display: flex; align-items: center; gap: 8px; padding: 10px 12px;
      border-bottom: 1px solid #444; font-weight: 650; cursor: grab; user-select: none; touch-action: none; }
    #cgpt-fanout header:active { cursor: grabbing; }
    #cgpt-fanout header span { flex: 1; }
    #cgpt-fanout button { border: 0; border-radius: 6px; padding: 4px 7px; cursor: pointer;
      color: #ddd; background: #343541; font: inherit; }
    #cgpt-fanout button:hover { background: #4a4b57; }
    #cgpt-fanout ol { margin: 0; padding: 8px 8px 8px 34px; max-height: 38vh; overflow: auto; }
    #cgpt-fanout li { padding: 5px 6px; border-bottom: 1px solid #ffffff12; overflow-wrap: anywhere; }
    #cgpt-fanout .empty, #cgpt-fanout footer { padding: 10px 12px; color: #aaa; }
    #cgpt-fanout footer { padding-top: 4px; font-size: 11px; }
    #cgpt-fanout.minimized ol, #cgpt-fanout.minimized .empty, #cgpt-fanout.minimized footer { display: none; }
    #cgpt-fanout.minimized { width: auto; }
    #cgpt-fanout.minimized header { border-bottom: 0; }
    #cgpt-fanout.minimized [data-copy], #cgpt-fanout.minimized [data-clear] { display: none; }
    @media (prefers-color-scheme: light) {
      #cgpt-fanout { color: #222; background: #fff; border-color: #ccc; box-shadow: 0 12px 38px #0003; }
      #cgpt-fanout header { border-color: #ddd; }
      #cgpt-fanout button { color: #333; background: #eee; }
      #cgpt-fanout button:hover { background: #ddd; }
    }
  `);

  function place(panel, x, y) {
    const rect = panel.getBoundingClientRect();
    panel.style.right = panel.style.bottom = 'auto';
    panel.style.left = `${Math.max(0, Math.min(x, innerWidth - rect.width))}px`;
    panel.style.top = `${Math.max(0, Math.min(y, innerHeight - rect.height))}px`;
  }

  function makeDraggable(panel) {
    const header = panel.querySelector('header');
    header.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      event.preventDefault();
      const rect = panel.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      const move = event => place(panel, event.clientX - offsetX, event.clientY - offsetY);
      const stop = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
        const { left, top } = panel.getBoundingClientRect();
        localStorage.setItem(positionKey, JSON.stringify({ left, top }));
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop, { once: true });
    });

    try {
      const { left, top } = JSON.parse(localStorage.getItem(positionKey));
      if (Number.isFinite(left) && Number.isFinite(top)) place(panel, left, top);
    } catch { /* use the default top-right position */ }
    window.addEventListener('resize', () => {
      const { left, top } = panel.getBoundingClientRect();
      place(panel, left, top);
    });
  }

  function mount() {
    if (document.getElementById('cgpt-fanout')) return;
    const panel = document.createElement('aside');
    panel.id = 'cgpt-fanout';
    panel.innerHTML = `
      <header><span>Fan-out запити <b>0</b></span><button data-copy>Копіювати</button><button data-clear>Очистити</button><button data-min title="Згорнути">−</button></header>
      <div class="empty">Очікую пошукові запити…</div><ol></ol>
      <footer>Показуються лише запити, які ChatGPT передав у браузерному потоці.</footer>`;
    (document.body || document.documentElement).append(panel);
    list = panel.querySelector('ol');
    empty = panel.querySelector('.empty');
    count = panel.querySelector('b');
    makeDraggable(panel);
    panel.querySelector('[data-copy]').onclick = () => GM_setClipboard(queries.join('\n'));
    panel.querySelector('[data-clear]').onclick = () => {
      queries.length = 0;
      seen.clear();
      render();
    };
    panel.querySelector('[data-min]').onclick = event => {
      panel.classList.toggle('minimized');
      event.currentTarget.textContent = panel.classList.contains('minimized') ? '+' : '−';
      requestAnimationFrame(() => {
        const { left, top } = panel.getBoundingClientRect();
        place(panel, left, top);
      });
    };
    render();
  }

  function render() {
    if (!list) return;
    count.textContent = String(queries.length);
    empty.hidden = queries.length > 0;
    list.replaceChildren(...queries.map(query => {
      const item = document.createElement('li');
      item.textContent = query;
      return item;
    }));
  }

  function add(value) {
    const query = String(value ?? '').trim();
    if (!query || query.length > 500 || seen.has(query)) return;
    seen.add(query);
    queries.push(query);
    mount();
    render();
  }

  function collect(value, emit = add) {
    if (typeof value === 'string') return emit(value);
    if (Array.isArray(value)) return value.forEach(item => collect(item, emit));
    if (!value || typeof value !== 'object') return;
    if (typeof value.q === 'string') emit(value.q);
    else if (typeof value.query === 'string') emit(value.query);
  }

  function inspect(value, trail = [], emit = add) {
    if (typeof value === 'string') {
      const text = value.trim();
      if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
        try { inspect(JSON.parse(text), trail, emit); } catch { /* ordinary text */ }
      }
      return;
    }
    if (Array.isArray(value)) return value.forEach(item => inspect(item, trail, emit));
    if (!value || typeof value !== 'object') return;

    for (const [key, child] of Object.entries(value)) {
      const name = key.toLowerCase();
      const path = [...trail, name];
      if (['search_query', 'search_queries', 'searches', 'web_search_queries'].includes(name)) collect(child, emit);
      else if ((name === 'query' || name === 'q') && trail.some(part => /search|browse|web/.test(part))) collect(child, emit);
      inspect(child, path, emit);
    }
  }

  function scan(text) {
    for (const line of text.split(/\r?\n/)) {
      const payload = line.startsWith('data:') ? line.slice(5).trim() : line.trim();
      if (!payload || payload === '[DONE]') continue;
      try { inspect(JSON.parse(payload)); } catch { /* incomplete/non-JSON stream line */ }
    }
  }

  async function watch(response) {
    try {
      const reader = response.body?.getReader();
      if (!reader) return scan(await response.text());
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split(/\r?\n/);
        buffer = done ? '' : lines.pop();
        scan(lines.join('\n'));
        if (done) {
          scan(buffer);
          break;
        }
      }
    } catch (error) {
      console.debug('[Fan-Out Viewer] Could not inspect response:', error);
    }
  }

  const nativeFetch = page.fetch;
  page.fetch = async function (...args) {
    const response = await nativeFetch.apply(this, args);
    const type = response.headers.get('content-type') || '';
    if (/json|text|event-stream/.test(type)) watch(response.clone());
    return response;
  };

  // Small parser self-check; logs only if a future edit breaks extraction.
  const selfTest = [];
  inspect({ tool: 'web_search', search_query: [{ q: 'test query' }] }, [], query => selfTest.push(query));
  console.assert(selfTest[0] === 'test query', 'Fan-Out Viewer parser self-check failed');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
