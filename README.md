# N7 Board

Team task management PWA for NOSH7. Single static page, no build step.

Live at https://hii2023.github.io/mastertodo/

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app: markup, styles, and logic |
| `n7-sw.js` | Service worker (offline shell + installable PWA) |

## Backend

Firebase Firestore, project `nosh7-2f0a3`. Collections:

- **`tasks`** — one doc per task. `subtasks` and `logs` are arrays.
- **`activity`** — append-only feed powering the Dashboard's Recent Activity.
- **`config`** — two docs, `users` and `categories`, each `{ list: [...] }`. This is what
  the Settings panel edits.
- **`recurring`** — one doc per repeating schedule.
- **`recurringRuns`** — ledger of occurrences already created, keyed
  `<scheduleId>__<YYYY-MM-DD>`. Kept separate from `tasks` on purpose, so deleting a
  generated task does **not** bring it back.

Firestore streams changes to every open board, so edits appear on other devices without
a refresh.

## Recurring tasks

The **R** button opens the schedules page. A schedule holds what repeats, **who it is
assigned to**, a category, optional subtasks, and a rule:

| Repeats | You set |
|---|---|
| Daily | nothing else |
| Weekly | any combination of weekdays |
| Monthly | a day of the month, 1 to 31 |

A "31st" schedule falls back to the last day in shorter months, so it fires in February
and never skips a month. Schedules also take a start date, an optional end date, and a
toggle to pause without deleting.

You can also make a task repeat straight from the New Task sheet: tap the **R** toggle
near the bottom and the repeat options replace the due date.

On each of its dates a schedule creates a **real task on the board**, owned by the person
you assigned. Those show in **cyan** with a `↻ Recurring` badge. Ticking one off, editing
or deleting it does not affect the schedule.

### How generation works

There is no server cron. Generation runs from the page whenever someone opens the board,
and again if a board is left open across midnight. Each occurrence is created inside a
Firestore **transaction** that first checks for its run-ledger document, so several people
opening the board at once cannot produce duplicates.

Missed days are backfilled up to **14 days** and land as overdue. Older gaps are not, which
stops a schedule with an old start date dumping months of history onto the board.

## Using the board

The top bar uses single letters so everything fits on a phone: **R** recurring,
**D** dashboard, **C** compact/detailed, plus the settings gear.

| Action | How |
|---|---|
| New task | `+` button, or press `N` |
| Edit a task | Double-click (double-tap on mobile) the card |
| Mark done / reopen | Click the circle on the left |
| Comments & history | Speech-bubble icon on the card |
| Reorder | Drag a card (long-press first on mobile) |
| Filter | Overdue / This Wk chips, plus **☰ Filter** for date and category |
| Stats | **D** button |
| Users & categories | Settings (gear) |
| Theme / sound / install | Settings → Appearance |

Reordering is filter-safe: dragging inside a filtered view only reshuffles the visible
cards within their existing slots, so hidden tasks never move.

## Filtering on a phone

The chip bar keeps only **Overdue** and **This Wk** inline, with names on their own row
underneath. Everything else lives behind **☰ Filter**: Next Week, This Month, No Due Date,
and every category with a count of active tasks.

There is no "All" chip. Tapping the person already selected clears the filter again, and
the red **✕ Clear** chip appears whenever any filter is on. Every filter button works this
way: tap to select, tap again to clear.

## Completing a task

Ticking a task off plays a soft three-note chime, a short buzz on phones, and a
ring-and-tick animation while the card settles out of the list. The write to Firestore
happens after the animation.

The chime is generated with WebAudio rather than shipped as a file. Turn it off in
**Settings → Appearance → Sound**; the choice is remembered per device.

## Compliments

Filter to someone with nothing active left and the board says so by name, drawing from
twenty messages so it does not get stale.

## Running it locally

```bash
python3 -m http.server 4466 --directory .
```

## Layout notes

The board fits a phone without sideways scrolling and without the action buttons being
pushed off the right edge.

**When editing the CSS:** the responsive rules live in one block at the very end of the
`<style>` tag and must stay there. Media queries add no specificity, so a phone rule
placed before the base rule it overrides is silently ignored.

## Desktop column order

The two-column task list on desktop reads **down the left column, then continues down the
right** (1 to n on the left, n+1 onward on the right), rather than zig-zagging left-right
across each row.

That is why it uses CSS multi-column rather than a grid: a grid fills row-major, which puts
2 next to 1 instead of under it. Multi-column also balances the two column heights on its
own. Full-width rows (the Done separator, the compliment, the empty state) use
`column-span: all` to break out and start a fresh pair of columns below.

## Assigning several people

A task can be assigned to more than one person. In the New Task, Edit and Schedule forms,
**Assign To** is a set of chips: tap to add someone, tap again to remove them.

There is deliberately **no combined filter chip**. A task assigned to two people appears
under each of their names separately, and counts once for each of them. The filter row
only ever lists individual people.

The first name selected is also written to the old single `owner` field, so nothing that
still reads it breaks.

## Phone numbers and sending a task

Settings lists each person with a phone field next to their name. Numbers save when you
leave the field or press Enter.

Once someone has a number saved, a **send button** appears on the task, next to the
comment button in the card's action column. It only shows when somebody on that task
actually has a number, so cards stay clean otherwise.

- one reachable assignee: tapping it goes straight to WhatsApp
- several: it asks which of them first
- **Send On WhatsApp** at the bottom of the Edit sheet does the same thing

Either opens WhatsApp with the task already written out — name, description, due date,
category, subtasks and link. You still press send yourself; nothing is sent automatically.

Numbers can be typed however you like. `98765 43210`, `098765 43210` and `+91 98765 43210`
all resolve to the same number; a bare ten-digit number is assumed to be Indian.
