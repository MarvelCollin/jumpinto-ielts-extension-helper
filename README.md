# jumpinto-ielts-extension-helper

A Chrome/Edge/Brave MV3 extension that adds **Clear** and **Randomize** buttons to
jumpinto.com IELTS academic practice tests, so you can wipe a previous attempt and redo it.

## Install (unpacked)

1. Open `brave://extensions` (or `chrome://extensions`).
2. Turn on **Developer mode**.
3. **Load unpacked** → pick this folder.
4. Open any practice page, e.g.
   `https://www.jumpinto.com/ielts/practice/academic/13/1/reading/1`.

A small panel appears bottom-right.

## What the buttons do

| Button | Effect |
| --- | --- |
| Clear part N | Sets every answer in the current part to empty |
| Clear all reading/listening | Same, across all parts of the section (reading 1-3, listening 1-4) |
| Randomize part N | Fills every question with a type-appropriate random value |
| Randomize all … | Same, across the whole section |
| Undo last | Restores the answers snapshotted before the last Clear/Randomize |

Every action asks for confirmation first, snapshots the current answers to
`chrome.storage.local`, then reloads the page so the site re-reads its state.

Clearing works — `""` is a value the server accepts and stores, so Randomize is only there
if you'd rather have a filled-in-but-wrong sheet.

## Project layout

```
manifest.json          MV3 manifest, content script registration
src/lib/api.js         endpoint wrappers, practice URL parsing
src/lib/randomize.js   per question type value generator
src/content/index.js   panel UI, confirm, snapshot, undo
src/content/panel.css  panel styles
docs/api-findings.md   endpoints, parameters, answer encoding
tools/recon/           one off console scripts used to map the site
```

## Scope

Listening and Reading only. Writing and Speaking use different endpoints and are not
handled.

## How it works

The site stores answers server-side. Everything runs through its own API from inside your
already-authenticated tab — see [docs/api-findings.md](docs/api-findings.md) for endpoints,
parameter shapes and answer encoding per question type.

One thing to be careful about: `submit-answer-by-task` **replaces the entire answer map for
a part**, so the extension always reads the existing answers and merges before saving.

## Verified behaviour

Tested against IELTS 13 / Test 1 / Reading on a live account:

* Randomize part → all 13 answers written server-side, correct format per question type
* Clear all reading → parts 1-3 emptied in one action
* Undo last → restored the pre-change answers byte for byte, in both cases

## Security note

Do **not** paste session cookies anywhere. The `SID` / `HSID` / `SSID` / `APISID` /
`SAPISID` / `__Secure-*PSID` family are Google account cookies and are equivalent to a full
account takeover — they bypass both password and 2FA. They are also useless for this
project: the extension runs inside your own already-authenticated browser tab, so it
inherits your session automatically and never needs to handle a cookie value.

## License

MIT
