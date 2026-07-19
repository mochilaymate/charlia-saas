#!/usr/bin/env node

const crypto = require("node:crypto");
const https = require("node:https");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://gubcsmubxbpimoejlhgf.supabase.co";
const serviceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1YmNzbXVieGJwaW1vZWpsaGdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY1MzgyMiwiZXhwIjoyMDk4MjI5ODIyfQ.sSoSdYGkl4ksv4qrwLk-LOdO9U7vQIIODeXpjXMWMo0";

async function testWebhook() {
  const supabase = createClient(supabaseUrl, serviceKey);
  const wsid = "5f4f8d53-c1ff-41e9-b5f0-1ceec3261366";

  // Get the REAL secret from database
  console.log("Fetching YCloud secret from database...\n");
  const { data: integration, error } = await supabase
    .from("integrations")
    .select("credentials")
    .eq("workspace_id", wsid)
    .eq("provider", "ycloud")
    .single();

  if (error || !integration) {
    console.error("❌ Failed to fetch integration:", error?.message);
    process.exit(1);
  }

  const secret = integration.credentials?.webhook_signing_secret?.trim();
  if (!secret) {
    console.error("❌ No webhook_signing_secret found");
    process.exit(1);
  }

  console.log("✓ Secret retrieved from database\n");

  // Create test payload
  const payload = {
    type: "whatsapp.inbound_message.received",
    createTime: new Date().toISOString(),
    whatsappInboundMessage: {
      wamid: `test-msg-${Date.now()}`,
      from: "34611028477",
      to: "34644003816",
      type: "text",
      text: {
        body: `Test message from webhook test: ${new Date().toISOString()}`,
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000);
  const message = `${ts}.${rawBody}`;

  // Calculate HMAC with the REAL secret
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(message);
  const signature = hmac.digest("hex");

  const header = `t=${ts},s=${signature}`;
  const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");

  console.log("═══════════════════════════════════════════════════════════");
  console.log("WEBHOOK TEST WITH LIVE SECRET");
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("Secret (from DB):", secret.substring(0, 20) + "...");
  console.log("Timestamp:", ts);
  console.log("Raw Body Length:", rawBody.length);
  console.log("Body SHA256:", bodyHash);
  console.log("Message Length:", message.length);
  console.log("Signature:", signature);
  console.log("Header:", header + "\n");

  // Send webhook
  const url = new URL(
    `https://whatsapp-saas-mocha.vercel.app/api/webhooks/ycloud?wsid=${wsid}`
  );
  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname + url.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(rawBody),
      "YCloud-Signature": header,
    },
  };

  console.log("⏳  Sending webhook to:", url.href);

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        console.log("\n✅  Response received:");
        console.log("   Status:", res.statusCode);
        console.log("   Body:", data);

        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log("\n✅  WEBHOOK ACCEPTED!");
        } else if (res.statusCode === 401) {
          console.log("\n❌  WEBHOOK REJECTED (401 Unauthorized)");
          console.log("\n   This means:");
          console.log("   - Integration not found, OR");
          console.log("   - Webhook secret missing, OR");
          console.log("   - YCloud-Signature header missing, OR");
          console.log("   - Signature verification FAILED");
        } else {
          console.log("\n⚠️  Unexpected status code");
        }

        resolve();
      });
    });

    req.on("error", (error) => {
      console.error("❌  Request error:", error.message);
      resolve();
    });

    // Write body as Buffer to ensure exact encoding
    const bodyBuffer = Buffer.from(rawBody, "utf8");
    req.write(bodyBuffer);
    req.end();
  });
}

testWebhook().catch(console.error);
