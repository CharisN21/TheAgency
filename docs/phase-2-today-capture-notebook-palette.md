# Phase 2 — Quick Capture, Notebook, Ctrl K, and a sharper Today

Status: started 7 Oct 2026. Charis chose to start it before Phase 1 had been used on a real project (the rule in `CLAUDE.md` says to wait), so each slice below is small and can be reverted on its own.

Four pieces, built in this order because each one feeds the next.

## 1. Notebook and Quick Capture (first slice)

**What it is.** A private notebook, and a way to get a thought into it in two seconds from anywhere.

- **Quick Capture:** a pencil button in the top bar, or Alt N. A box opens, you type, press Ctrl Enter (or Save), and it is kept. "Save as a task" makes a task for you instead. Nothing else to fill in.
- **Notebook** (`/notebook`): your notes, newest first, pinned ones on top, with a search box. Each note can have a title. From any note: pin it, edit it, make it a task, post it onto an organisation, person or deal timeline, or delete it.
- **Whiteboards**, in the same notebook: "New whiteboard" opens a board to scribble on with a mouse, finger or pen, in ink or maroon, thin or thick, with an eraser, undo and clear, plus a title and an optional caption. Stored as lines (not a picture), so it stays sharp at any size and follows dark mode. Private like notes.

**Privacy (the rule that does not bend).** A note is visible only to the person who wrote it. Not owners, not admins. It becomes visible to others only when you choose "Post to a timeline", which copies the words onto a record's timeline as an ordinary note; the private original stays yours. The page says so in plain words.

**Data.** `notes`: id, workspace_id, author_id, title (optional, up to 120), kind (text or board), body (up to 10,000 characters; a board's caption), drawing (a board's strokes, checked by the server, `lib/notes/drawing.ts`), pinned, created_at, updated_at. Row-Level Security: author only, and a member of the workspace. At most 2,000 notes per person per workspace.

**Not in this slice:** attachments, folders, tags, voice notes, shared notes or shared whiteboards (everyone in the workspace drawing on one board). Notes link to records only by being posted to their timeline.

## 2. Ctrl K palette

One box to find anything and jump or act. Searches organisations, people, deals, projects, tasks and your own notes in the workspace you are in; also pages ("Settings") and actions ("New task", "New note", "Switch workspace"). Server-side search with the same permission checks as the lists, so nobody finds what they cannot open. Chat messages stay in the chat's own search.

## 3. Today, sharpened

Today already shows your numbers, tasks, check-ins due, people to speak to and deals closing soon. Add: a **Captured** band (your newest notes, one tap to turn into a task), and a plain "what matters first" line at the top that picks from what is overdue. The AI gives paths, not answers, and assigns nobody (rule 8).

## 4. Capture from the phone

Add to Home Screen already works. Add a Share target so sharing text or a link from another app on the phone drops it into Quick Capture.

## Order and checks

1. Notebook and Quick Capture, with a privacy test (another member, an owner and another workspace cannot read a note).
2. Ctrl K.
3. Today.
4. Share target.

Each is its own branch and pull request.
