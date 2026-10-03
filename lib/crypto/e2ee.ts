/**
 * End-to-end encryption for channels (Phase 5b). Runs in the browser, using
 * only WebCrypto; the server never sees a private key, a channel key or a
 * message in the clear. Design: docs/phase-5-messaging-and-notifications.md.
 *
 * - Each device has an ECDH P-256 keypair. The private half is created
 *   non-extractable, so no script can read it or send it anywhere.
 * - Each channel has an AES-GCM 256 key per epoch. For every member device it
 *   is wrapped: ECDH(wrapping device, receiving device) → HKDF → AES-KW.
 * - Messages are AES-GCM with the epoch key. The channel, epoch and sending
 *   device are bound in as additional data, so a message cannot be moved to
 *   another channel or epoch without failing to open.
 */

const subtle = () => globalThis.crypto.subtle

export type PublicKeyJwk = { kty: "EC"; crv: "P-256"; x: string; y: string }

export type Sealed = { iv: string; ciphertext: string }

/** Where a wrapped key or a message belongs. Mixed into every key and every message. */
export type KeyContext = { channelId: string; epoch: number }

const enc = new TextEncoder()
const dec = new TextDecoder()

export function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ""
  for (const b of u8) s += String.fromCharCode(b)
  return btoa(s)
}

export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const s = atob(text)
  const u8 = new Uint8Array(new ArrayBuffer(s.length))
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i)
  return u8
}

/* ------------------------------------------------------------- devices */

/** A new device identity. The private key cannot be exported, by design. */
export async function createDeviceKeys(): Promise<CryptoKeyPair> {
  return subtle().generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"])
}

export async function exportPublicKey(key: CryptoKey): Promise<PublicKeyJwk> {
  const { kty, crv, x, y } = await subtle().exportKey("jwk", key)
  return { kty: kty as "EC", crv: crv as "P-256", x: x!, y: y! }
}

/** A public key exactly as the server accepts it: P-256, and nothing private in it. */
export function isPublicKeyJwk(value: unknown): value is PublicKeyJwk {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  const b64url = /^[A-Za-z0-9_-]{43}$/
  return (
    v.kty === "EC" &&
    v.crv === "P-256" &&
    typeof v.x === "string" &&
    typeof v.y === "string" &&
    b64url.test(v.x) &&
    b64url.test(v.y) &&
    !("d" in v) &&
    Object.keys(v).every((k) => ["kty", "crv", "x", "y", "ext", "key_ops"].includes(k))
  )
}

/**
 * The shape check plus the real test: the key must load as a point on the
 * P-256 curve. A key that passes the shape check but is not a real point
 * would make every key-wrap for its owner fail, freezing their chats.
 */
export async function isUsablePublicKey(value: unknown): Promise<boolean> {
  if (!isPublicKeyJwk(value)) return false
  try {
    await importPublicKey(value)
    return true
  } catch {
    return false
  }
}

function importPublicKey(jwk: PublicKeyJwk): Promise<CryptoKey> {
  return subtle().importKey("jwk", { ...jwk, ext: true }, { name: "ECDH", namedCurve: "P-256" }, false, [])
}

/* -------------------------------------------------------- channel keys */

/** A fresh key for a new epoch. Extractable only so it can be wrapped for each device. */
export async function createChannelKey(): Promise<CryptoKey> {
  return subtle().generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
}

/**
 * The key-wrapping key between two devices for one channel epoch. Both sides
 * derive the same one: ECDH is symmetric, and the context names the receiver,
 * so a key wrapped for one device never opens on another.
 */
async function wrappingKey(
  myPrivate: CryptoKey,
  theirPublic: PublicKeyJwk,
  ctx: KeyContext & { forDeviceId: string },
  usage: "wrapKey" | "unwrapKey",
): Promise<CryptoKey> {
  const shared = await subtle().deriveBits(
    { name: "ECDH", public: await importPublicKey(theirPublic) },
    myPrivate,
    256,
  )
  const hkdf = await subtle().importKey("raw", shared, "HKDF", false, ["deriveKey"])
  return subtle().deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode("the-agency/channel-key/v1"),
      info: enc.encode(`${ctx.channelId}|${ctx.epoch}|${ctx.forDeviceId}`),
    },
    hkdf,
    { name: "AES-KW", length: 256 },
    false,
    [usage],
  )
}

/** Wrap a channel key so only one device can open it. */
export async function wrapChannelKey(
  channelKey: CryptoKey,
  myPrivate: CryptoKey,
  recipient: { deviceId: string; publicKey: PublicKeyJwk },
  ctx: KeyContext,
): Promise<string> {
  const kw = await wrappingKey(myPrivate, recipient.publicKey, { ...ctx, forDeviceId: recipient.deviceId }, "wrapKey")
  return toBase64(await subtle().wrapKey("raw", channelKey, kw, "AES-KW"))
}

/** Open a channel key wrapped for this device. Fails if it was meant for another device or epoch. */
export async function unwrapChannelKey(
  wrapped: string,
  myPrivate: CryptoKey,
  myDeviceId: string,
  wrapper: PublicKeyJwk,
  ctx: KeyContext,
): Promise<CryptoKey> {
  const kw = await wrappingKey(myPrivate, wrapper, { ...ctx, forDeviceId: myDeviceId }, "unwrapKey")
  return subtle().unwrapKey("raw", fromBase64(wrapped), kw, "AES-KW", { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ])
}

/* ------------------------------------------------------------ messages */

/** A task made from a message, shown in the chat as a card that links to it. */
export type TaskCard = { kind: "task"; taskId: string; title: string; assignee: string; href: string }

/** What a message holds once opened. Mentions and cards live inside, so the server never sees them. */
export type MessageBody = { text: string; mentions?: string[]; card?: TaskCard }

const isTaskCard = (c: unknown): c is TaskCard => {
  const v = c as Record<string, unknown> | null
  return (
    !!v &&
    v.kind === "task" &&
    ["taskId", "title", "assignee", "href"].every((k) => typeof v[k] === "string") &&
    // An in-app path only: "/..." but never "//..." or "/\..." (which browsers treat as another site).
    /^\/(?![/\\])/.test(String(v.href))
  )
}

const aad = (ctx: KeyContext & { senderDeviceId: string }) =>
  enc.encode(`${ctx.channelId}|${ctx.epoch}|${ctx.senderDeviceId}`)

export async function sealMessage(
  channelKey: CryptoKey,
  body: MessageBody,
  ctx: KeyContext & { senderDeviceId: string },
): Promise<Sealed> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await subtle().encrypt(
    { name: "AES-GCM", iv, additionalData: aad(ctx) },
    channelKey,
    enc.encode(JSON.stringify(body)),
  )
  return { iv: toBase64(iv), ciphertext: toBase64(ciphertext) }
}

/** Opens a message, or throws if it was changed, moved, or sealed with another key. */
export async function openMessage(
  channelKey: CryptoKey,
  sealed: Sealed,
  ctx: KeyContext & { senderDeviceId: string },
): Promise<MessageBody> {
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: fromBase64(sealed.iv), additionalData: aad(ctx) },
    channelKey,
    fromBase64(sealed.ciphertext),
  )
  const body = JSON.parse(dec.decode(plain)) as MessageBody
  if (typeof body?.text !== "string") throw new Error("Not a message")
  // A card that is not exactly the expected shape (or links off-site) is dropped, keeping the text.
  if (body.card !== undefined && !isTaskCard(body.card)) delete body.card
  return body
}
