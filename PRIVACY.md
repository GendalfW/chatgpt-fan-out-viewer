# Privacy and permissions

Applies to the bundled source version 1.1.1. Review later versions before installing them.

## Data processed locally

- The script inspects clones of the page's text, JSON and event-stream `fetch` responses, not only one dedicated search endpoint. Those responses may contain conversation content.
- Only detected query strings are added to the panel's in-memory list. The script does not deliberately persist full response bodies or query history.
- A detected string is copied to the system clipboard only when Copy is clicked. Clipboard history, sync and other software may retain it independently.
- The last dragged panel coordinates are saved under `cgpt-fanout-position` in the current site's `localStorage`. The site and other same-origin scripts may read that value. Clearing that key removes the saved position.
- Closing/reloading the page discards this script's in-memory list. This does not delete any data retained by ChatGPT, the browser, clipboard tools or Tampermonkey.

## Network and updates

The script adds no query-upload endpoint, analytics or runtime library download. It passes the page's existing fetch calls through; normal ChatGPT traffic continues.

Tampermonkey may independently contact the configured GitHub raw URLs to check and download updates according to its settings. GitHub receives ordinary request information for those downloads, not the detected query list. Automatic updates can change future behavior; inspect the source and manage updates in Tampermonkey as appropriate.

## Requested permissions

| Item | Use |
| --- | --- |
| `@match https://chatgpt.com/*` | Run on ChatGPT pages. |
| `@match https://chat.openai.com/*` | Legacy ChatGPT address. |
| `unsafeWindow` | Access and wrap the page's `fetch`. |
| `GM_addStyle` | Style the floating panel. |
| `GM_setClipboard` | Copy the detected strings on request. |
| `@run-at document-start` | Try to install the wrapper before page requests. |

No API key, cookies export, credential collection, remote query storage or telemetry is implemented. This describes the bundled script, not the privacy policies of ChatGPT, GitHub, the browser or Tampermonkey.

## Safe bug reports

Use a synthetic prompt and redact personal information. Do not upload full HAR captures, authorization headers, cookies, session tokens or conversation exports to public issues.
