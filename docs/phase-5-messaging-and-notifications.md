# Phase 5 — Team messaging and the notification centre

Status: designed, not built. Written 24 Sep 2026.

Two things were asked for: a **chat box** for the people in a workspace, and a **notification centre**. Both are possible. They are separate systems with different rules, and mixing them up is the usual way this goes wrong, so they are specified separately.

This reverses a decision in the original build plan ("no in-app chat, use WhatsApp"). That decision was right for **clients**, and stays: nothing here tries to replace WhatsApp for talking to suppliers and customers. This is internal-only messaging between people who are members of the same workspace.

---

## Part A — Notification centre (no encryption needed)

A bell in the top bar with an unread count, a popover of the last 20, and a `/notifications` page with filters. One row per thing that happened to **you**: a deal you own moved, someone tagged you in a note, an invite was accepted, a check-in fell due, a person you own is overdue for contact.

**Data**

```
notifications        id, workspace_id, user_id, type, title, body, entity_type,
                     entity_id, actor_id, read_at, created_at
notification_prefs   user_id, workspace_id, channel (in_app|email|whatsapp|push),
                     types text[], quiet_from time, quiet_to time, quiet_days int[]
```

**Rules**

- Written server-side when an action happens, in the same transaction as the change. Never a background scan.
- The **body is always safe to read on a lock screen**: "Wanjiru moved PPE batch 2 to Negotiating". No money figures, no client names in push payloads (see the metadata rule below — this is the same discipline).
- Quiet hours hold delivery, never drop it. Anything held arrives at the next open window, batched into a digest.
- Email through Resend, WhatsApp as a click-to-chat link, web push only after Add to Home Screen on iPhone (iOS 16.4+).
- Read state is per person. Marking read in one place marks it everywhere.

This part is a week of work and has no cryptography in it. It should ship **before** the chat, because most of what people want from "chat" is actually "tell me when something happened".

---

## Part B — Messaging, end-to-end encrypted

### What "fully encrypted" will and will not mean

Being straight about this now saves an argument later.

**The server cannot read:** message text, attachment contents, file names, channel topics, draft messages.

**The server still sees (metadata, unavoidable in any system of this shape):** who sent a message, to which channel, at what time, how big it was, who read it, and who is in which channel. Hiding that needs a different architecture (mixnets, sealed sender) and is not worth the cost here.

**What E2EE costs you, honestly:**

| You lose | Because | What we do about it |
| --- | --- | --- |
| Server-side search | The server holds ciphertext | Search runs on the device, over messages that device has decrypted and cached |
| Message content in push notifications | The push service would see it | Push says "New message in #operations". Content appears when the app opens |
| AI over messages | Claude runs server-side | Per-thread, explicit "Summarise this for me" that sends the decrypted text once, with a visible notice. Never automatic |
| History on a new device | Old keys were on the old device | A 24-word **recovery key** at setup, and re-invitation to channels by any current member |
| Admin access to history | There is no backdoor | An optional, **visible** workspace archive key (below) — off by default |

If any of those costs are unacceptable for a given channel, the honest answer is to make that channel unencrypted and label it, not to pretend.

### The cryptography

Everything uses WebCrypto in the browser. No libraries to audit beyond the platform.

**Identity.** Each *device* generates an ECDH P-256 keypair on first sign-in. The private key is a non-extractable `CryptoKey` in IndexedDB — it cannot be read by JavaScript, exported, or sent anywhere. The public key goes to the server with a device name.

```
devices    id, user_id, name, public_key jsonb, created_at, last_seen_at, revoked_at
```

**Trust.** Trust on first use, plus a **safety number**: a short hash of two people's public keys, shown on both profiles. Compare it out loud once and you know nobody is in the middle. This is how Signal does it and it is the only honest way without a certificate authority.

**Channel keys.** Each channel has a symmetric AES-GCM 256 key per *epoch*. For every member device, that key is wrapped: ECDH(my device private, their device public) → HKDF → AES-KW wrap. One row per device.

```
channels        id, workspace_id, name, kind (channel|dm), created_by, created_at,
                archive_enabled bool, created_epoch
channel_members channel_id, user_id, added_by, added_at, removed_at
channel_keys    channel_id, epoch, device_id, wrapped_by_device_id, wrapped_key, created_at
```

**Rotation.** A new epoch is generated when someone joins, someone leaves, or a device is revoked. New messages use the new epoch; old messages stay readable only by devices that held the old one. So:

- Someone who joins today **cannot** read yesterday's messages. This is correct and must be said in the UI when you add them.
- Someone removed today cannot read tomorrow's.

**Messages.**

```
messages   id, channel_id, sender_id, sender_device_id, epoch,
           ciphertext bytea, iv bytea, created_at, edited_at, deleted_at,
           reply_to_id, reaction_summary jsonb
receipts   message_id, user_id, delivered_at, read_at
```

The client encrypts `{ text, mentions, attachments[] }` as one JSON blob with the channel key. Mentions are inside the ciphertext, so the server cannot see who was tagged — the client raises the notification locally and asks the server to send a **contentless** push to those users.

**Attachments.** Each file gets its own random AES-GCM key, is encrypted in the browser, and the ciphertext goes to Supabase Storage. The per-file key travels inside the encrypted message body. The server sees a blob of bytes and its size.

**Recovery.** At setup the person is offered a 24-word recovery key (BIP-39 wordlist). It wraps their identity key in escrow so a new device can restore itself. If they decline and lose every device, their history is gone — say so in that sentence, at that moment, not in a settings page.

**Archive key (optional, off by default).** Some businesses need owners to be able to read workspace channels. If it is switched on **at channel creation**, channel keys are also wrapped to a workspace archive key held by the owners. The channel header then permanently reads "Owners can read this channel's history", and it cannot be switched off later. A channel that starts private stays private. Never make this silent.

### Row-Level Security

The same discipline as everywhere else: `workspace_id` on every table, members read their own channels, and `channel_keys` rows are readable only by the device they were wrapped for.

```sql
create policy "device reads its own wrapped keys" on public.channel_keys
  for select using (
    exists (select 1 from public.devices d
            where d.id = channel_keys.device_id and d.user_id = (select auth.uid()))
  );
```

### The interface

- **Chat box**: a right-hand drawer, opened with `Ctrl J` or the bubble in the top bar, so you never leave what you were doing. Channel list, then the thread. On iPhone it is a full sheet from the tab bar's More.
- **Channels**: `#general` created with the workspace, plus one per project when Phase 1 lands. DMs between any two members.
- **A lock line under every channel name**: "Encrypted. Only the 5 people in this channel can read it." Or, when archiving is on: "Owners can also read this."
- **Composer**: text, @mentions, attachments, and a "quote a record" button that drops a link card for a deal, organisation or person — the card renders from the local copy, so the preview is encrypted too.
- **Unread**: per channel, per person, restored from receipts.
- **Safety numbers** on the member profile, with a "we have verified each other" tick that is stored locally, not on the server.

### Build order

1. **5a — Notification centre.** Bell, page, preferences, quiet hours, email digest. No crypto. About a week.
2. **5b — Channels, encrypted.** Devices, keys, epochs, the drawer, `#general`, unread state. Two to three weeks, most of it key handling and the edge cases around joining and leaving.
   **Built (first cut, on local data):** `lib/crypto/e2ee.ts` (keys, wrapping, sealing), `lib/crypto/device-store.ts` (the device key in IndexedDB), the actions at the end of `lib/data/actions.ts`, the drawer in `components/app/chat.tsx`, devices in Settings, migration `0010_channels.sql`, and tests in `tests/e2ee.test.ts` and `tests/channels.test.ts`. A key is re-made whenever the set of member devices changes (join, leave, new or removed device); the server refuses a new key that does not cover exactly those devices, and refuses messages while the key is out of date. Still to do in 5b: channels beyond `#general` (one per project), and moving to Supabase Realtime instead of checking every few seconds.
3. **5c — DMs, attachments, recovery key, safety numbers.** About two weeks.
4. **5d — Optional archive key**, only if a real need appears. Do not build it speculatively.

### The risks worth stating before starting

- **iOS eats storage.** Safari can evict IndexedDB for a PWA that has not been opened in seven days. Losing the key means losing history. The recovery key is not optional for anyone who cares about their history — push it hard at setup, and re-prompt if it was skipped.
- **Multi-device is where the bugs live.** Every device is a separate key holder. A phone that has not synced in a month has to be re-wrapped into every epoch it missed.
- **No server-side search** means search quality depends on what the device has. Plan for "search the last 90 days on this device" rather than pretending otherwise.
- **This is the one part of the app where a mistake is not recoverable.** A bug that loses keys loses conversations permanently. It deserves tests that simulate join, leave, revoke and restore before anyone relies on it.
