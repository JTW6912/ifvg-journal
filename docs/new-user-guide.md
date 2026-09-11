# New Account Guide: Default Fields & What's Safe to Change

*(简体中文版: [new-user-guide.zh-CN.md](new-user-guide.zh-CN.md))*

## Why this guide exists

When you sign up, IFVG Journal seeds your account with one default field schema (see the
**Settings** page). Every field is yours to edit — that's the whole point of this app. But a
handful of the default fields are read directly by the statistics engine using **exact value
matching**, not just by name. Editing the wrong part doesn't throw an error — it just makes
future trades silently drop out of your stats, and the numbers quietly stop making sense.

This guide explains what each default field is for, and draws the line between "customize
freely" and "leave alone, just use it as given."

## The default fields

| Field (English label) | Type | Default options | Role | What it's for |
| --- | --- | --- | --- | --- |
| Date | date | — | `date` | Trade date. Drives the calendar/monthly pages and sorting. |
| Session | select | London / NYAM / Asia / Other | none | Which trading session the trade happened in. |
| Entry Time | time | — | none | Time of entry. |
| Direction | select | Long / Short | none | Trade direction. |
| Model | select | ifvg | `model` | Which trading model/strategy was used. Drives the per-model breakdown and filter. |
| Entry Type | multiselect | displacement / IFVG / CISD | none | What confirmed the entry. |
| Taken / Faded | select | Taken / Faded | `taken` | Whether you actually took the trade or just watched it. Drives the "count only trades I took" scope. |
| Result | select | W / L / BE / BE -> L / BE -> W | `result` | Trade outcome. Required for essentially all analytics. |
| RR | number | — | `r_multiple` | R multiple / realized R. Drives total R, EV, profit factor. |
| Human Error | select | yes / no | `human_error` | Whether execution deviated from your plan. Drives the "exclude human error" scope. |
| Self Grade | select | A+ / A / B+ / B / C / D | none | Your own quality grade for the setup. |
| Target Type | multiselect | 5M ITH/L, 15M ITH/L, 30M+ ITH/L, BSL/SSL, PDH/L, ... | none | What liquidity/level the trade targeted. |
| Notes | textarea | — | none | Free-form notes at entry. |
| Review Notes | textarea | — | none | Post-trade review. |
| Screenshot | url | — | `screenshot` | Link to a chart screenshot. Powers card thumbnails and the lightbox. |

If you signed up with Chinese selected, the same fourteen fields exist with Chinese labels
(日期, 交易时段, 入场时间, 方向, 模型, 入场方式, 做了还是避免, 结果, RR, 人为错误, 自评等级,
目标类型, 笔记, 复盘笔记, 截图) — same ids, same option values, same roles underneath. Only the
display label is localized; the data itself is language-independent (see the "Language" section
of the main [README](../README.md)).

## The one thing you actually need to understand: roles

Settings lets you assign an **analysis role** to at most one field each: `date`, `model`,
`taken`, `result`, `r_multiple`, `max_rr`, `human_error`, `screenshot`. The statistics engine
never looks at a field's name or label — only at which field carries which role.

That part is safe. The trap is one level deeper: for the three "logic" roles, the engine also
matches against the **exact original option strings**, hardcoded in the app itself:

| Role | Field it's on by default | Exact value(s) the code checks for |
| --- | --- | --- |
| `taken` | Taken / Faded | `"Taken"` (only trades with exactly this value count toward the "Taken-only" scope) |
| `result` | Result | `"W"`, `"L"`, `"BE"`, `"BE -> W"`, `"BE -> L"` |
| `human_error` | Human Error | `"yes"` (only this exact value counts as an error; anything else, including blank, counts as "no") |

## Safe to change

- Renaming a field's **display label** — e.g. change "Taken / Faded" to "进场/观望" or anything
  else. The engine identifies fields by internal id and role, never by label, so relabeling
  never breaks anything.
- Reordering fields, hiding fields from the record card, changing the type of any field that has
  **no role** assigned.
- Adding brand-new fields, or new option values on non-role fields (Session, Direction, Entry
  Type, Self Grade, Target Type, Notes, Review Notes...) — add as many as you like.
- Adding a `max_rr` (number) field yourself and assigning it that role. It's not in the default
  schema, but the "R capture" metric is fully supported once you add it.

## Do NOT do this — it silently breaks statistics

- **Editing the option list of a role-carrying field** — Taken/Faded, Result, or Human Error. If
  you go into Settings and rename the option "Taken" to anything else (even a translation like
  "已入场"), every trade you log *after that change* is stored with the new value — but the
  stats engine is still looking for the literal string `"Taken"`. Those new trades silently stop
  counting in the "Taken-only" scope, win rate, EV, and profit factor. No error message, the
  numbers just stop making sense.
- Same for Result: rename option "W" to "赢" or "Win" and every future win stops being recognized
  as a win, because the engine still checks for `"W"` exactly.
- Same for Human Error: renaming "yes" / "no" breaks the "exclude human error" scope.
- **Removing the role from a field** (setting it back to "none"), or moving that role onto a
  different field with a different option set — disables or corrupts the metric, depending on
  the new field's values.
- **Reassigning a role while experimenting in Settings** — if you give a role to a field that
  isn't currently holding it, the field that *used* to hold that role has it silently stripped
  back to "none", with no warning dialog. Easy to do by accident while poking around; double-check
  which field holds each role afterward.
- **Deleting the field that carries the `result` role** — per the app's own design this field is
  required for any analytics at all; deleting it turns off the whole Analytics page.
- **Changing a role field's type** — e.g. turning Result from `select` into free `text`. Free
  text can never exactly equal `"W"` / `"L"` / `"BE"`, so nothing matches anymore.

**If you already did one of these:** go back into Settings and restore the exact original option
strings (`Taken`, `Faded`, `W`, `L`, `BE`, `BE -> L`, `BE -> W`, `yes`, `no`) as the actual stored
option values. You're still free to reorder them or rename the *field label* around them — just
don't touch the option text itself on these three fields.

**Bottom line:** don't redesign the logic fields (Taken/Faded, Result, Human Error, and whichever
field carries `date` / `model` / `r_multiple` / `screenshot`) — learn to use them as given.
Everything else in your schema is yours to customize freely.

## Getting a screenshot link (TradingView / fx platform)

The `Screenshot` field expects a **URL** pointing to an image, not an uploaded file. The fastest
way to get one:

1. Open your chart on TradingView (or your fx broker's charting page).
2. Press **Alt+S** ("take a snapshot" / share chart image). This uploads the current chart as an
   image and copies a public link to your clipboard.
3. Paste that link straight into the Screenshot field on your trade.

The card thumbnails and lightbox just render whatever URL you paste in — any publicly reachable
image link works, Alt+S is simply the fastest way to produce one from a chart.

One requirement: the link must resolve directly to the image itself (something a plain
`<img>` tag can load), not a webpage that merely *displays* the image. Paste a share/webpage
link by mistake and the field retries twice, then falls back to a placeholder icon with a
manual "retry" button instead of a thumbnail.
