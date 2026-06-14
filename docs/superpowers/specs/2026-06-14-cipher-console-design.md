# Cipher Console — Design Spec

**Date:** 2026-06-14
**Status:** Approved design, pre-implementation
**Project:** andraewilliams.com portfolio — first Python-on-Vercel tool

## Goal

Ship a tactical "Cipher Console" tool that runs reversible encoding transforms
**in Python on Vercel serverless functions**. Purpose is twofold: prove a real
Python deploy (not browser JS), and add an operator-grade tool to the portfolio
arsenal. Pairs with a Build Log documenting the AI-codegen process.

Success = the tool is live at andraewilliams.com, EXECUTE round-trips to a
Python function and returns correct results, errors are handled gracefully, and
a Build Log writeup explains how it was built with AI.

## Architecture

Two units with a clean HTTP boundary:

1. **Front-end** (`src/cipher-console.html` + small JS) — tactical UI card.
   Knows nothing about the transforms; just collects input and renders output.
2. **Python serverless function** (`/api/cipher.py`) — does all transform
   logic. Standard library only. Stateless. Knows nothing about the UI.

Data flow:
```
[textarea + op selector + mode toggle] --EXECUTE--> POST /api/cipher
   { "op": "base64", "mode": "encode", "text": "..." }
        --> Python dispatch --> { "result": "..." }  (200)
                            or  { "error": "..." }   (400)
   <-- render in output panel (or red "ERROR //" line)
```

## API contract — `/api/cipher.py`

- **Method:** POST, JSON body `{ op, mode, text }`.
  - `op`: one of `base64 | hex | rot13 | url`
  - `mode`: `encode | decode`
  - `text`: string (the payload)
- **Success:** `200` `{ "result": "<string>" }`
- **Failure:** `400` `{ "error": "<human-readable reason>" }` for unknown op,
  missing field, or a transform that can't process the input (e.g. invalid
  Base64 on decode). Never returns a 500 for user input.
- **Runtime:** Vercel Python serverless using the documented
  `BaseHTTPRequestHandler` pattern (`class handler(BaseHTTPRequestHandler)`).
  No `requirements.txt` — stdlib only (`base64`, `binascii`, `codecs`,
  `urllib.parse`).
- **Implementation shape:** a dispatch dict `{op: (encode_fn, decode_fn)}` so
  adding an op later is one entry. ROT13 ignores `mode` (self-inverse).

## Operations (Core 4)

| op | encode | decode |
|----|--------|--------|
| `base64` | text → Base64 | Base64 → text (error on bad input) |
| `hex` | text → hex | hex → text (error on bad input) |
| `rot13` | ROT13 | ROT13 (same) |
| `url` | percent-encode | percent-decode |

All operate on UTF-8. Decode errors are caught and returned as `{error}`.

## Front-end UI

- Matches existing tactical card styling (reuse `css/style.css` tokens —
  mono labels, bordered panel, accent button). No new design system.
- Controls: operation selector (4 ops), encode/decode toggle (hidden/disabled
  for ROT13), input `<textarea>`, **EXECUTE** button, output panel with a
  copy-to-clipboard affordance.
- States: idle, running (button shows pending), success (result in panel),
  error (red `ERROR // <reason>` line). Empty input → inline hint, no request.
- `prefers-reduced-motion` respected for any transition (consistent with site).

## Build Log

- `src/writeups/cipher-console.html` — same template as
  `src/writeups/smoke-playground.html`. Sections: the prompt(s) given to the
  AI, what it generated, what was wrong / what was fixed, what was learned.
- Linked from the tool card and from the tools page.

## Site integration

- Add a 4th entry to `src/data/tools.manifest.json` (id `cipher-console`,
  status `live`, href `cipher-console.html`, tags e.g. `python`, `vercel`,
  `crypto`, `writeup` → the new writeup path).
- Bump the `// N live builds` comment in `src/tools.html` from 3 → 4
  (`verify-site.sh` fails the build if manifest count ≠ this number).
- Check other tool-count references (home hero `tools:` stat, status panel) and
  update if they are static rather than manifest-driven.
- `assemble-site.sh` copies `src/` into `_site/`, so the new HTML/JS ships
  automatically. The `/api/` function lives at repo root (not in `src/`) and is
  picked up by Vercel independently of `outputDirectory: _site`.

## Vercel notes / risks

- **Verify Python functions deploy** alongside the custom build
  (`framework: null`, `outputDirectory: _site`). `/api/*.py` should deploy
  regardless, but this is the one integration to confirm on first deploy.
- If the Python runtime needs pinning, add it via `vercel.json` `functions` or
  a runtime config — only if the default fails.

## Testing

- Python: known-answer checks — Base64 round-trip, `hex` of "abc" = `616263`,
  ROT13 of "abc" = "nop", URL-encode of a space → `%20`, and a bad-Base64
  decode returns `{error}` not a crash.
- End-to-end: load the page, EXECUTE each op, confirm output and the error path.

## Out of scope (YAGNI for v1)

- Hashing (SHA/MD5), JWT, AES, or any non-reversible/keyed crypto.
- Live/keystroke transforms (explicit EXECUTE only).
- File upload, history, saved sessions, auth.
- These are candidates for v2 or separate tools, not this spec.
