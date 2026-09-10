# Jumpinto IELTS Answer Reset

![Manifest V3](https://img.shields.io/badge/manifest-v3-4285F4)
![No build step](https://img.shields.io/badge/build-none-success)
![License](https://img.shields.io/badge/license-MIT-blue)

A Chrome/Edge/Brave extension that adds **Clear** and **Randomize** buttons to
[jumpinto.com](https://www.jumpinto.com/ielts/practice/academic/) IELTS practice tests.

Jumpinto keeps your answers on its own server, so reopening a test you already did shows
the old attempt filled in. There is no built in reset. This puts one on the page.

```
┌──────────────────────────────┐
│ Answer reset               – │
│ academic 13 · test 1 · reading 1
│ ┌──────────────────────────┐ │
│ │ Clear part 1             │ │
│ │ Clear all reading        │ │
│ │ Randomize part 1         │ │
│ │ Randomize all reading    │ │
│ ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ │
│ │ Undo last                │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

## Features

| Button | What it does |
| --- | --- |
| **Clear part N** | Empties every answer in the part you are looking at |
| **Clear all reading / listening** | Same, across the whole section (reading 1-3, listening 1-4) |
| **Randomize part N** | Fills every question with a valid random value for its type |
| **Randomize all …** | Same, across the whole section |
| **Undo last** | Puts back the answers as they were before the last action |

Every action asks for confirmation, snapshots your current answers to
`chrome.storage.local`, writes the change, then reloads the page so the site picks up the
new state.

Clearing genuinely works. An empty string is a value the server accepts and stores, so
Randomize is only there if you would rather sit down to a filled in but wrong answer sheet.

## Install

No build step, no dependencies. Load the folder as is.

1. Clone or download this repository.
2. Open `brave://extensions`, `chrome://extensions` or `edge://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the repository folder.
5. Open a practice page, for example
   `https://www.jumpinto.com/ielts/practice/academic/13/1/reading/1`.

The panel appears in the bottom right. It only injects on
`https://www.jumpinto.com/ielts/practice/*`.

## How it works

Answers live server side, not in the DOM or in local storage, so wiping the inputs on the
page would achieve nothing. The extension talks to the site's own API from inside your
already authenticated tab.

| Endpoint (`/api/v1/assessment/ielts/practice/`) | Used for |
| --- | --- |
| `comprehension/get-my-answer-by-task` | read the current answers for a part |
| `question/get-test-question` | read the question blocks, to know each question's type |
| `comprehension/submit-answer-by-task` | write the new answers |

All three are GET requests carrying `series_type`, `series_id`, `test_id`, `test_part` and
`task_part`, authenticated by your normal session cookie.

> **`submit-answer-by-task` is a full replace, not a patch.** Send a map with two questions
> in it and every other question in that part is wiped. The extension always reads the
> existing answers and merges before writing. If you script against this API yourself,
> do the same.

Values are encoded per question type:

| Question type | Stored value |
| --- | --- |
| `input-table`, `input-summary` | free text, e.g. `focus` |
| `option-true-false` | `TRUE` / `FALSE` / `NOT GIVEN` |
| `option-yes-no` | `YES` / `NO` / `NOT GIVEN` |
| `option-abc` | letter, index into that question's options |
| `select-given-list`, `select-given-diagram` | letter, index into the shared list |
| `select-section-given-list` | lowercase roman numeral, e.g. `vii` |

Unknown types are skipped rather than filled with something the UI cannot render.

## Project structure

```
manifest.json            MV3 manifest and content script registration
src/
  lib/api.js             endpoint wrappers and practice URL parsing
  lib/randomize.js       per question type value generator
  content/index.js       panel UI, confirmation, snapshot, undo
  content/panel.css      panel styles
tools/recon/             one off console scripts used to map the site
```

`src/lib/*` is pure logic with no DOM access. `src/content/index.js` owns everything that
touches the page.

## Development

Edit a file, hit reload on the extension card, refresh the practice tab. There is nothing
to compile.

Syntax check before committing:

```bash
node --check src/lib/api.js && node --check src/lib/randomize.js && node --check src/content/index.js
```

## Verified behaviour

Tested against IELTS 13 / Test 1 / Reading on a live logged in account:

* **Randomize part** wrote all 13 answers server side, each in the right format for its
  question type, and they rendered correctly after the reload
* **Clear all reading** emptied parts 1, 2 and 3 in a single action
* **Undo last** restored the previous answers exactly in both cases, including roman
  numerals and letter choices

## Limitations

* Listening and Reading only. Writing and Speaking use different endpoints.
* Undo keeps one snapshot, and only for the section it was taken from.
* Unofficial. Nothing here is endorsed by jumpinto.com, and the API could change without
  warning.

## Security

Never paste session cookies anywhere, for this project or any other. The `SID`, `HSID`,
`SSID`, `APISID`, `SAPISID` and `__Secure-*PSID` cookies are Google account credentials and
are equivalent to a full account takeover, bypassing both password and 2FA.

They are also unnecessary here. The extension runs inside your own authenticated tab and
inherits your session, so it never sees or handles a cookie value. Its permissions are
`storage` plus host access limited to `https://www.jumpinto.com/*`. It sends nothing to any
third party.

## License

[MIT](LICENSE)
