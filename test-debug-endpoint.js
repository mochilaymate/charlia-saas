#!/usr/bin/env node

const crypto = require("node:crypto");
const https = require("node:https");

const secret = "whsec_a15ae422faf6459eb90e22156fef5242";

const payload = {
  type: "whatsapp.inbound_message.received",
  createTime: "2026-07-19T10:00:00Z",
  whatsappInboundMessage: {
    wamid: "debug-test-001",
    from: "34611028477",
    to: "34644003816",
    type: "text",
    text: {
      body: "Debug test",
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

console.log("Sending to DEBUG endpoint...\n");
console.log("Payload bytes:", Buffer.from(rawBody).length);
console.log("Payload hash:", crypto.createHash("sha256").update(rawBody).digest("hex"));
console.log("Header:", header);
console.log("\n");

const options = {
  hostname: "whatsapp-saas-mocha.vercel.app",
  port: 443,
  path: "/api/webhooks/ycloud/debug",
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
    console.log("Status:", res.statusCode);
    console.log("\nDebug Response:");
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.log(data);
    }
  });
});

req.on("error", (error) => {
  console.error("Error:", error);
});

req.write(rawBody);
req.end();
