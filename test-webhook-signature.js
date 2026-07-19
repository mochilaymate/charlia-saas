#!/usr/bin/env node

const crypto = require("node:crypto");

// Simular exactamente lo que hace YCloud
const secret = "whsec_a15ae422faf6459eb90e22156fef5242";

// Simular un webhook payload
const payload = {
  type: "whatsapp.inbound_message.received",
  createTime: "2026-07-19T10:00:00Z",
  whatsappInboundMessage: {
    wamid: "test-msg-123",
    from: "34611028477",
    to: "34644003816",
    type: "text",
    text: {
      body: "Test message",
    },
  },
};

const rawBody = JSON.stringify(payload);
const ts = Math.floor(Date.now() / 1000);

// Calcular firma (esto es lo que YCloud hace)
const message = `${ts}.${rawBody}`;
const hmac = crypto.createHmac("sha256", secret);
hmac.update(message);
const signature = hmac.digest("hex");

const header = `t=${ts},s=${signature}`;

console.log("Test webhook signature verification\n");
console.log("Secret:", secret);
console.log("Timestamp:", ts);
console.log("Raw body length:", rawBody.length);
console.log("Signature:", signature);
console.log("Header:", header);
console.log("\nURL to test:");
console.log(
  `POST https://whatsapp-saas-mocha.vercel.app/api/webhooks/ycloud?wsid=5f4f8d53-c1ff-41e9-b5f0-1ceec3261366`,
);
console.log("Header: YCloud-Signature:", header);
console.log("Body:", rawBody);
