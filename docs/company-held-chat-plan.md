# Switching chat to company-held keys (decided 7 Oct 2026)

Charis chose: team members sign in with email and nothing else. No keys, devices, recovery words or safety numbers. History survives a lost phone. Chats stay private inside the app (only members open them; owners and admins cannot open chats they are not in), are stored encrypted with a server-held key, and are NOT end-to-end: whoever runs the hosting and database could technically read them. Say so plainly in the app.

The end-to-end version is kept at the git tag `chat-e2ee-last` (main at PR #11). To go back, branch from it.

## Done on branch `feature/company-held-chat`
- `lib/chat/at-rest.ts` + `tests/at-rest.test.ts`: messages sealed with AES-256-GCM, a key per workspace made from `CHAT_ENCRYPTION_KEY` (env; on a laptop a key file is made in `.data/`; production without the variable refuses), tied to workspace, chat and sender so a copied message will not open.

## Still to do (in this order, one pull request)
1. `lib/data/types.ts`: drop `Device`, `ChannelKey`, `Channel.epoch`/`rekey_epoch`; `Message` becomes `{ id, workspace_id, channel_id, sender_id, body, created_at }` (`body` = sealed string). Remove `devices`, `channel_keys` from `Database`.
2. `lib/data/store.ts`: stop creating `devices`/`channel_keys`; on load delete them and drop old messages that have no `body` (the sealed demo messages cannot be read by the server).
3. `lib/data/actions.ts` chat section: delete `registerDevice`, `revokeDevice`, `rotateChannel`, `reportUnreadableKey`, key and device helpers. `loadChannels()` and `loadChannel(id)` take no device; `loadChannel` returns decrypted messages `{ id, sender_id, created_at, text, mentions, card }`. `postMessage(channelId, { text, mentions?, card? })` validates: text 1 to 4000 characters, at most 20 tags and all of them members of the chat, a card only if its task exists in this workspace and its `href` is an in-app path (`/` not `//` or `/\`), then `sealBody`. Keep groups, DMs, announcements rights, project chat, read markers, `loadChatRecordOptions`.
4. `components/app/chat.tsx`: remove all crypto, device refs, rotation, `DeviceRemoved`, safety number UI; poll `loadChannel`. Change copy: lock line becomes "Private to the people in this chat. Stored encrypted." and add an "About chat privacy" note saying chats are not end-to-end. Adding someone to a group now lets them read earlier messages: say so.
5. Delete `lib/crypto/*`, `components/app/devices.tsx`, `components/app/safety-number.tsx`, `tests/e2ee.test.ts`, `tests/safety.test.ts`, `tests/verified.test.ts`; remove "Your devices" from Settings and `listMyDevices` from queries.
6. Rewrite `tests/channels.test.ts` without devices (announcement rights, group and DM membership, leaving and removal, other workspaces, viewers, unread, project chat, task made from a message, card validation, stored data holds no readable text). Keep `mentions.test.ts`, `privacy.test.ts`.
7. Rewrite `supabase/migrations/0010_channels.sql` (never run): channels, channel_members, `in_channel()`, messages(body text), channel_reads; no devices or channel_keys; reads and writes through the server.
8. Docs: mark the cryptography in `docs/phase-5-messaging-and-notifications.md` Part B as superseded; update `CLAUDE.md` phase 5b line to "team chat: Announcements, groups and direct messages, encrypted at rest"; update `HANDOFF.md`.
9. Try it in the browser, then open the pull request.
