#!/usr/bin/env node

const crypto = require("node:crypto");
const https = require("node:https");

const secret = "whsec_a15ae422faf6459eb90e22156fef5242";

const payload = {
  type: "whatsapp.inbound_message.received",
  createTime: "2026-07-19T10:00:00Z",
  whatsappInboundMessage: {
    wamid: "test-debug-001",
    from: "34611028477",
    to: "34644003816",
    type: "text",
    text: {
      body: "Test",
    },
  },
};

const rawBody = JSON.stringify(payload);
const ts = Math.floor(Date.now() / 1000);
const message = `${ts}.${rawBody}`;
const hmac = crypto.createHmac("sha256", secret);
hmac.update(message);
const signature = hmac.digest("hex");
const header = `t=${ts},s=${signature}`;

console.log("Testing /api/ycloud-debug endpoint\n");
console.log("Sending:");
console.log("  Body length:", rawBody.length);
console.log("  Header:", header.substring(0, 50) + "...");

const options = {
  hostname: "whatsapp-saas-mocha.vercel.app",
  port: 443,
  path: "/api/ycloud-debug",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(rawBody),
    "YCloud-Signature": header,
  },
};

const req = https.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("\nReceived:");
    console.log("  Status:", res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log("  Body length:", parsed.debug.bodyLength);
      console.log("  Body hash:", parsed.debug.bodyHash);
      console.log("  Sig header:", parsed.debug.sigHeader);
      console.log("\n✓ Compare:");
      const sentHash = crypto.createHash("sha256").update(rawBody).digest("hex");
      console.log("  Sent hash:    ", sentHash);
      console.log("  Received hash:", parsed.debug.bodyHash);
      console.log("  Match:", sentHash === parsed.debug.bodyHash ? "YES ✓" : "NO ✗");
    } catch (err) {
      console.log("  Error parsing response:", err.message);
      console.log("  Raw:", data.substring(0, 200));
    }
  });
});

req.on("error", (error) => {
  console.error("Request error:", error);
});

req.write(rawBody);
req.end();
