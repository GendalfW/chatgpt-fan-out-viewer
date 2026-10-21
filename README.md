# ChatGPT Fan-Out Viewer

[Українською](README.uk.md) 

A dependency-free Tampermonkey userscript that displays search-query strings found in ChatGPT's browser-visible `fetch` responses. Useful for exploring query rewriting and observable search fan-out.

**Experimental, unofficial diagnostic tool.** This is not an OpenAI API or a complete record of server-side searches. The counter measures unique detected strings, not search calls. A zero count does not prove that no search happened.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your desktop browser.
2. [Open the userscript](https://raw.githubusercontent.com/GendalfW/chatgpt-fan-out-viewer/main/ChatGPT-Fan-Out-Viewer.user.js) and confirm installation in Tampermonkey.
3. If you see plain code instead, copy the complete file into Tampermonkey → Create a new script, replacing the starter template, then save.
4. Reload [ChatGPT](https://chatgpt.com/) **before** sending a new prompt. Enable web search for your test if it is available.

The installation link will work after the maintainer publishes the repository at the address above. For another owner, repository name or branch, update links and the userscript metadata first.

Updating a manually installed copy? Replace the existing script in Tampermonkey rather than running two copies. The name and namespace are unchanged.

## Use

- The panel starts in the top-right corner.
- Drag the header to move it within the browser viewport. The last dragged position is saved locally for that origin.
- Click `−` to collapse or `+` to expand. Copy and Clear are hidden when collapsed.
- `Копіювати` (Copy) copies one detected query per line.
- `Очистити` (Clear) resets the list and counter; an active stream may add further items.

Panel labels are currently Ukrainian. Queries retain their original language. The list accumulates during the current page lifetime, including in-app navigation; reload or Clear to reset. The collapsed state is not persisted.

## How detection works

The script wraps the page's `fetch`, passes requests through unchanged, and inspects cloned responses advertised as JSON, text or event streams. It parses JSON lines/SSE `data:` lines and recursively checks these field names:

- `search_query`, `search_queries`, `searches`, `web_search_queries`;
- `q` or `query` under keys containing `search`, `browse` or `web`.

It also attempts to parse complete JSON strings nested in those responses. Matching strings are trimmed and deduplicated; empty strings and strings over 500 characters are ignored. Query text is inserted into the UI with `textContent`, not executed as code.

## Limits and compatibility

- Server-only operations cannot be observed. WebSocket, XHR and workers are not instrumented; a `fetch` reference captured before script startup may also be missed.
- Internal fields and transports can change without notice. Unsupported formats, fragmented inner JSON and schema changes can cause missed queries.
- Detection is heuristic, not authenticated provenance. Matching fields can occur in other payloads or examples inside chat content, producing false positives.
- Duplicate query strings count once, even if used repeatedly. The total is not a ranking signal, a billable-call count or an exhaustive fan-out metric.
- Already completed conversations are not deliberately fetched or replayed. Data may appear if ChatGPT happens to load a matching payload after startup; historical completeness is not guaranteed.
- Copying a response stream adds some local processing and memory overhead.
- The userscript targets desktop Tampermonkey on `chatgpt.com` and legacy `chat.openai.com`. Browser execution-world restrictions and other intercepting extensions can prevent interception. There is no validated cross-browser compatibility matrix.

## Privacy and permissions

No API key, analytics, telemetry, external runtime dependency or query-upload endpoint is included. Query strings stay in page-lifetime memory unless you copy them. The panel position is stored in the site's `localStorage`, not a private vault. See [PRIVACY.md](PRIVACY.md) for scope and permissions.

The GitHub distribution includes `@updateURL` and `@downloadURL`. Tampermonkey can contact GitHub to check/download updates according to its own settings; this does not upload detected queries. Review the code and update policy before installing.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No panel | Enable the script and Tampermonkey's permission to run on ChatGPT; reload the tab. |
| Panel but no queries | Send a fresh web-search prompt. Unsupported transports or unexposed query fields can leave the list empty. |
| Unexpected entries | Field-name matching is heuristic; examples or unrelated payloads can match. Do not treat the list as verified tool-call logs. |
| Duplicate panels or errors | Disable older copies and other request-intercepting scripts, then reload. |
| Panel position needs resetting | On ChatGPT, run `localStorage.removeItem('cgpt-fanout-position')` in the browser console, then reload. This removes only the saved position. |

When reporting a bug, include browser and Tampermonkey versions, userscript version and a reproducible non-sensitive prompt. Do not post full conversation exports, HAR files, session tokens or private query data.

## Checks

With Node.js installed, from the repository root:

```sh
node --check ChatGPT-Fan-Out-Viewer.user.js
node tests/smoke.test.cjs
```

These dependency-free synthetic checks cover extraction, deduplication, streamed UTF-8 chunks, positioning and drag-position persistence using a simulated environment. They do **not** establish current live ChatGPT compatibility or visual correctness. Before a release, manually verify install, a fresh search, copying, clearing, collapse/expand, dragging, resizing and restoration after reload.

## Project files

| File | Purpose |
| --- | --- |
| `ChatGPT-Fan-Out-Viewer.user.js` | Installable script |
| `README.md`, `README.uk.md` | English and Ukrainian documentation |
| `GITHUB_SETUP.uk.md` | Publishing and update instructions |
| `PRIVACY.md` | Data handling and permissions |
| `CHANGELOG.md` | Release history |
| `LICENSE` | MIT license |
| `tests/smoke.test.cjs` | Dependency-free synthetic checks |

No build, package manager, server or GitHub Pages deployment is required.

## License and attribution

[MIT](LICENSE) © 2026 Roman Piliuta. Independent project; not affiliated with or endorsed by OpenAI or Tampermonkey. Product names belong to their respective owners.
