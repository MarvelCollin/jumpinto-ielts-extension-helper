# Jumpinto IELTS — recon findings

Captured 2026-09-10 from a logged-in browser on
`https://www.jumpinto.com/ielts/practice/academic/13/1/reading/1`.

## Stack

React + shadcn/Radix (`data-slot="input"`, `role="radiogroup"` made of `<button role="radio">`).
No Next.js, no iframes, no IndexedDB. Answers are **not** kept in localStorage — they live
server-side and are re-fetched on every page load.

## URL shape

```
/ielts/practice/{series_type}/{series_id}/{test_id}/{test_part}/{task_part}
/ielts/practice/academic/13/1/reading/1
```

`test_part` is `listening` (task_part 1-4), `reading` (1-3), `writing`, `speaking`.

## API

Base: `https://www.jumpinto.com/api/v1/assessment/ielts/practice/`
All calls are **GET** with query params, authenticated by the normal session cookie.

Shared params: `series_type`, `series_id`, `test_id`, `test_part`, `task_part`.

| Endpoint | Purpose |
| --- | --- |
| `question/get-test-question` | question blocks for the part |
| `comprehension/get-my-answer-by-task` | `{ "1": "choose", "2": "private", ... }` |
| `comprehension/get-my-answer-detail-by-task` | same plus `update_time_utc` |
| `comprehension/submit-answer-by-task` | save — extra param `user_answer` = URL-encoded JSON map |

### submit-answer-by-task is a FULL REPLACE

Sending `user_answer={"1":"","2":""}` did not patch those two questions — every other
question in the part came back with `user_answer: null`. **Always merge into the full
existing map before submitting.**

`""` is an accepted stored value, so **clearing is possible** — no need to fall back to
randomizing.

### It also returns the answer key

The response to `submit-answer-by-task` includes `correct_answer` for every question in the
part. Not needed for this extension, but worth knowing it is exposed.

## Question types and answer encoding

| `type` | UI | Stored value |
| --- | --- | --- |
| `input-table`, `input-summary` | text box | free text (`"focus"`) |
| `option-true-false` | radio | `TRUE` / `FALSE` / `NOT GIVEN` |
| `option-yes-no` | radio | `YES` / `NO` / `NOT GIVEN` |
| `option-abc` | radio | letter `A`..`D`, index into `items[i].options` |
| `select-given-list`, `select-given-diagram` | dropdown | letter `A`.., index into `body.list` |
| `select-section-given-list` | dropdown (headings) | lowercase roman `i`..`viii`, index into `body.list` |

Block shape: `{ start, end, type, body }` where `body.items` is per-question and
`body.list` is the shared option pool.

Unanswered questions are simply absent from the answer map.

## Writing / speaking

Not covered — they do not use the `comprehension/*` endpoints. Out of scope for now.
