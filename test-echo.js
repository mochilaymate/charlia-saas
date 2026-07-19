#!/usr/bin/env node

const crypto = require("node:crypto");
const https = require("node:https");

const payload = {
  type: "whatsapp.inbound_message.received",
  createTime: new Date().toISOString(),
  whatsappInboundMessage: {
    wamid: `test-${Date.now()}`,
    from: "34611028477",
    to: "34644003816",
    type: "text",
    text: { body: "Prueba" },
  },
};

const rawBody = JSON.stringify(payload);
const ts = Math.floor(Date.now() / 1000);
const secret = "whsec_a15ae422faf6459eb90e22156fef5242";
const message = `${ts}.${rawBody}`;

const hmac = crypto.createHmac("sha256", secret);
hmac.update(message);
const signature = hmac.digest("hex");

const header = `t=${ts},s=${signature}`;
const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");

console.log("ECHO WEBHOOK TEST\n");
console.log("Body SHA256:", bodyHash);
console.log("Message to sign:", message.substring(0, 50) + "...");
console.log("Signature:", signature);
console.log("Header:", header);
console.log("");

const url = new URL(
  "https://whatsapp-saas-mocha.vercel.app/api/webhooks/echo"
);
const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(rawBody),
    "YCloud-Signature": header,
  },
};

console.log("Sending to:", url.href);

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    console.log("\n✓ Status:", res.statusCode);
    const parsed = JSON.parse(data);
    console.log("\nServer received:");
    console.log("  Body length:", parsed.bodyLength);
    console.log("  Body hash:", parsed.bodyHash);
    console.log("  Body preview:", parsed.bodyPreview);
    console.log("  Signature header:", parsed.headers["ycloud-signature"]?.substring(0, 50) + "...");

    if (parsed.bodyHash === bodyHash) {
      console.log("\n✅  BODY HASHES MATCH!");
    } else {
      console.log("\n❌  BODY HASHES DO NOT MATCH!");
      console.log("   Client sent:  " + bodyHash);
      console.log("   Server got:   " + parsed.bodyHash);
    }
  });
});

req.on("error", (err) => {
  console.error("Error:", err.message);
});

const bodyBuffer = Buffer.from(rawBody, "utf8");
req.write(bodyBuffer);
req.end();
