# Jumpinto IELTS Answer Reset

![Manifest V3](https://img.shields.io/badge/manifest-v3-4285F4)
![No build step](https://img.shields.io/badge/build-none-success)
![License](https://img.shields.io/badge/license-MIT-blue)

A Chrome/Edge/Brave extension that wipes your saved answers on
[jumpinto.com](https://www.jumpinto.com/ielts/practice/academic/) IELTS practice tests.

Jumpinto keeps your answers on its own server, so reopening a test you already did shows
the old attempt filled in. There is no built in reset. This puts one on the page.

## Features

### On the test list

One button per test card, with a dropdown, so you can reset a test without opening it.

```
┌──────────────────┐
│ Test 2           │
│ Listening        │      ┌──────────────────┐
│ Reading          │      │ Clear Listening  │
│ Writing          │      │ Clear Reading    │
│ Speaking         │      ├──────────────────┤
│ [ Clear answers ]│─────▶│ Clear whole test │
└──────────────────┘      └──────────────────┘
```

| Item | What it clears |
| --- | --- |
| **Clear Listening** | All 4 listening parts of that test |
| **Clear Reading** | All 3 reading parts of that test |
| **Clear whole test** | Both sections, 7 parts |

Writing and Speaking are left alone, they use different endpoints.

### Inside a test

```
┌──────────────────────────────┐
│ Answer reset               – │
│ academic 13 · test 1 · reading 1
│ ┌──────────────────────────┐ │
│ │ Clear part 1             │ │
│ │ Clear all reading        │ │
│ ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ │
│ │ Undo last                │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

**Undo last** puts back the answers as they were before the last clear, wherever that clear
was triggered from.

Every action asks for confirmation, snapshots your current answers to
`chrome.storage.local`, writes the change, then reloads the page so the site picks up the
new state.

Clearing genuinely works for every question type on the site: an empty string, or an empty
array for the multi select ones, is a value the server accepts and stores. There is no need
to fall back on filling questions with junk.

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
| `input-answer`, `input-diagram`, `input-flowchart`, `input-form`, `input-note`, `input-sentence`, `input-summary`, `input-table` | free text, e.g. `focus` |
| `option-true-false` | `TRUE` / `FALSE` / `NOT GIVEN` |
| `option-yes-no` | `YES` / `NO` / `NOT GIVEN` |
| `option-abc` | a single letter |
| `select-given-list`, `select-given-diagram`, `select-summary-given-list`, `select-flowchart-given-list`, `select-section` | a single letter |
| `select-section-given-list` | lowercase roman numeral, e.g. `vii` |
| `checkbox` | an **array** of letters, e.g. `["A","D"]`, repeated on every question number the block covers |

Two details that are easy to get wrong:

* A `checkbox` block covers more than one question number, because "choose TWO letters"
  is scored as two answers. The same array is stored under each of them, and its empty
  value is `[]`, not `""`.
* `desc.optionRange` is usually letters like `["A","G"]`, but it is sometimes roman, as in
  `["i","vi"]`, even for a `select-given-list`. The range decides the alphabet, not the
  question type.

Unknown types are skipped rather than filled with something the UI cannot render.

## Project structure

```
manifest.json            MV3 manifest and content script registration
src/
  lib/api.js             endpoint wrappers and practice URL parsing
  lib/answers.js         per question type empty value builder
  lib/actions.js         read, merge, write and undo across a set of parts
  content/index.js       in test panel
  content/catalogue.js   per test dropdown on the test list
  content/panel.css      styles for both
tools/recon/             one off console scripts used to map the site
```

`src/lib/*` is pure logic with no DOM access. `src/content/index.js` owns everything that
touches the page.

## Development

Edit a file, hit reload on the extension card, refresh the practice tab. There is nothing
to compile.

Syntax check before committing:

```bash
node --check src/lib/api.js && node --check src/lib/answers.js && node --check src/lib/actions.js && node --check src/content/index.js && node --check src/content/catalogue.js
```

## Verified behaviour

Against a live logged in account, IELTS 13 / Test 1:

* **Clear all reading** emptied parts 1, 2 and 3 in one action
* **Undo last** restored the previous answers byte for byte, including roman numerals and
  letter choices
* On a listening part with multi select questions, cleared answers round tripped correctly
  and the reloaded page showed nothing ticked

Across the whole catalogue, 23 books, 672 parts, 7,688 questions:

* every question in every part produces a valid empty value
* all 18 question types are handled, none skipped

On the list page, checked against a local fixture: one button per card, contained inside the
card, dropdown listing only the sections that card actually has, and answers outside the
question blocks preserved by the merge.

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
