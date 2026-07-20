import { createHmac, timingSafeEqual } from "node:crypto";
import { performance } from "node:perf_hooks";
import { z } from "zod";

/**
 * Verifies a YCloud webhook signature.
 *
 * Header format: "t={unixSeconds},s={hmacSha256Hex}"
 * Signed material: HMAC-SHA256(secret, timestamp + "." + rawBody)
 * Anti-replay window: 300 seconds.
 */
export function verifyYCloudSignature(
  rawBody: string,
  header: string | null,
  secret: string,
): boolean {
  try {
    if (!header || !secret) return false;

    // Parse "t=1234567890,s=abcdef..."
    const tMatch = header.match(/t=(\d+)/);
    const sMatch = header.match(/s=([0-9a-fA-F]+)/);
    if (!tMatch || !sMatch) return false;

    const ts = tMatch[1];
    const receivedSig = sMatch[1].toLowerCase();

    // Anti-replay: reject if timestamp is more than 300s from now
    const nowSec = Math.floor(
      (performance.timeOrigin + performance.now()) / 1000,
    );
    if (Math.abs(nowSec - parseInt(ts, 10)) > 300) return false;

    // Compute expected HMAC
    const message = `${ts}.${rawBody}`;
    const expectedHex = createHmac("sha256", secret)
      .update(message)
      .digest("hex")
      .toLowerCase();

    // Length must match before comparing
    if (expectedHex.length !== receivedSig.length) return false;

    // Constant-time comparison using timingSafeEqual
    try {
      const expectedBuf = Buffer.from(expectedHex, "hex");
      const receivedBuf = Buffer.from(receivedSig, "hex");
      return timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
      return false;
    }
  } catch (error) {
    console.error("[verifyYCloudSignature] Error:", error);
    return false;
  }
}

export interface NormalizedInbound {
  /** The workspace phone number (E.164) that received the message */
  workspacePhone: string;
  /** Sender phone number (E.164) */
  from: string;
  /** Message type as reported by YCloud */
  type: string;
  /** Text content, the media caption, or "[Multimedia]" when neither exists */
  text: string | null;
  /** YCloud WhatsApp message ID */
  wamid: string;
  /** Display name from customer profile, if available */
  customerName: string | null;
  /** ISO creation timestamp from the event root */
  createTime: string;
  /** YCloud media download URL (api.ycloud.com) for media messages */
  mediaLink: string | null;
  /** YCloud media id, when present */
  mediaId: string | null;
  /** Declared MIME type of the media */
  mediaMime: string | null;
  /** Original filename (document messages) */
  mediaFilename: string | null;
}

/** Inbound message types that carry a downloadable media payload. */
const MEDIA_TYPES = ["image", "audio", "voice", "video", "document", "sticker"];

/** Valid public.message_type enum values — the DB rejects anything else. */
const MESSAGE_TYPE_ENUM = new Set([
  "text",
  "audio",
  "image",
  "document",
  "video",
  "sticker",
  "location",
  "template",
  "system",
]);

/**
 * Clamp YCloud's raw message type to a valid message_type enum value so the
 * INSERT never fails — an out-of-enum value (e.g. WhatsApp voice notes arriving
 * as 'voice', or the 'unknown' fallback) would otherwise raise 22P02 and the
 * inbound message would be silently dropped. Voice notes → 'audio'
 * (consolidateBatch handles both); anything unrecognized → 'text'. The RAW type
 * is still used above for media extraction (wimObj[msgType]).
 */
function toMessageType(raw: string): string {
  if (raw === "voice") return "audio";
  return MESSAGE_TYPE_ENUM.has(raw) ? raw : "text";
}

// Schema validation for YCloud webhook payload — prevents injection & oversized payloads
const YCloudWebhookSchema = z.object({
  type: z.string(),
  createTime: z.string().datetime().optional(),
  whatsappInboundMessage: z.object({
    wamid: z.string().max(50),
    from: z.string().max(20),
    to: z.string().max(20),
    type: z.string().max(20),
    text: z
      .object({
        body: z.string().max(4096),
      })
      .optional(),
    customerProfile: z
      .object({
        name: z.string().max(256),
      })
      .optional(),
    image: z
      .object({
        id: z.string().max(100),
        link: z.string().url().max(2048),
        mimeType: z.string().max(50).optional(),
        mime_type: z.string().max(50).optional(),
        caption: z.string().max(4096).optional(),
      })
      .optional(),
    audio: z
      .object({
        id: z.string().max(100),
        link: z.string().url().max(2048),
        mimeType: z.string().max(50).optional(),
        mime_type: z.string().max(50).optional(),
      })
      .optional(),
    voice: z
      .object({
        id: z.string().max(100),
        link: z.string().url().max(2048),
        mimeType: z.string().max(50).optional(),
        mime_type: z.string().max(50).optional(),
      })
      .optional(),
    video: z
      .object({
        id: z.string().max(100),
        link: z.string().url().max(2048),
        mimeType: z.string().max(50).optional(),
        mime_type: z.string().max(50).optional(),
        caption: z.string().max(4096).optional(),
      })
      .optional(),
    document: z
      .object({
        id: z.string().max(100),
        link: z.string().url().max(2048),
        filename: z.string().max(256).optional(),
        mimeType: z.string().max(50).optional(),
        mime_type: z.string().max(50).optional(),
      })
      .optional(),
    sticker: z
      .object({
        id: z.string().max(100),
        link: z.string().url().max(2048),
        mimeType: z.string().max(50).optional(),
        mime_type: z.string().max(50).optional(),
      })
      .optional(),
  }),
});

/**
 * Parses and normalises a raw YCloud webhook body.
 * Returns null if the event is not an inbound message or is malformed.
 * Validates payload size and structure with Zod schema.
 */
export function parseInbound(body: unknown): NormalizedInbound | null {
  try {
    // Validate against schema first — rejects oversized/malformed payloads
    const validated = YCloudWebhookSchema.safeParse(body);
    if (!validated.success) return null;

    const event = validated.data as Record<string, unknown>;

    // Only process inbound message events
    if (event.type !== "whatsapp.inbound_message.received") return null;

    // Guard against echo messages
    if (typeof event.type === "string" && event.type.includes("echo"))
      return null;

    const wim = event.whatsappInboundMessage;
    if (typeof wim !== "object" || wim === null) return null;

    const wimObj = wim as Record<string, unknown>;

    const wamid = wimObj.wamid;
    if (typeof wamid !== "string" || !wamid) return null;

    const from = wimObj.from;
    if (typeof from !== "string" || !from) return null;

    const to = wimObj.to;
    if (typeof to !== "string" || !to) return null;

    const msgType = typeof wimObj.type === "string" ? wimObj.type : "unknown";

    const createTime =
      typeof event.createTime === "string"
        ? event.createTime
        : new Date().toISOString();

    let customerName: string | null = null;
    const profile = wimObj.customerProfile;
    if (typeof profile === "object" && profile !== null) {
      const profileObj = profile as Record<string, unknown>;
      customerName =
        typeof profileObj.name === "string" ? profileObj.name : null;
    }

    let text: string | null = null;
    let mediaLink: string | null = null;
    let mediaId: string | null = null;
    let mediaMime: string | null = null;
    let mediaFilename: string | null = null;

    if (msgType === "text") {
      const textObj = wimObj.text;
      if (typeof textObj === "object" && textObj !== null) {
        const t = (textObj as Record<string, unknown>).body;
        text = typeof t === "string" ? t : null;
      }
    } else if (MEDIA_TYPES.includes(msgType)) {
      // YCloud nests the media object under the message type, e.g.
      // whatsappInboundMessage.image = { id, link, mimeType, caption, ... }.
      // Field casing varies (mimeType vs mime_type), so read both.
      const mediaObj = wimObj[msgType];
      if (typeof mediaObj === "object" && mediaObj !== null) {
        const m = mediaObj as Record<string, unknown>;
        mediaLink = typeof m.link === "string" ? m.link : null;
        mediaId = typeof m.id === "string" ? m.id : null;
        mediaMime =
          typeof m.mimeType === "string"
            ? m.mimeType
            : typeof m.mime_type === "string"
              ? m.mime_type
              : null;
        mediaFilename = typeof m.filename === "string" ? m.filename : null;
        // Prefer the caption as the message body when present
        if (typeof m.caption === "string" && m.caption.trim()) {
          text = m.caption;
        }
      }
      if (text === null) text = "[Multimedia]";
    } else {
      text = "[Multimedia]";
    }

    return {
      workspacePhone: to,
      from,
      type: toMessageType(msgType),
      text,
      wamid,
      customerName,
      createTime,
      mediaLink,
      mediaId,
      mediaMime,
      mediaFilename,
    };
  } catch {
    return null;
  }
}
