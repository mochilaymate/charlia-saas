#!/usr/bin/env node

const crypto = require("node:crypto");
const https = require("node:https");

const secret = "whsec_a15ae422faf6459eb90e22156fef5242";

// Crear payload exacto
const payload = {
  type: "whatsapp.inbound_message.received",
  createTime: "2026-07-19T10:00:00Z",
  whatsappInboundMessage: {
    wamid: "test-msg-789",
    from: "34611028477",
    to: "34644003816",
    type: "text",
    text: {
      body: "Prueba",
    },
  },
};

// Usar JSON.stringify SIN espacios (compact)
const rawBody = JSON.stringify(payload);
const ts = Math.floor(Date.now() / 1000);
const message = `${ts}.${rawBody}`;

// Calcular HMAC
const hmac = crypto.createHmac("sha256", secret);
hmac.update(message);
const signature = hmac.digest("hex");

const header = `t=${ts},s=${signature}`;

console.log("Webhook Test Details\n");
console.log("Secret:", secret);
console.log("Timestamp:", ts);
console.log("Raw Body:", rawBody);
console.log("Raw Body Length:", rawBody.length);
console.log("Message:", message);
console.log("Message Length:", message.length);
console.log("Signature:", signature);
console.log("Header:", header);
console.log("\n\nSending to webhook...\n");

// Enviar con HTTPS
const options = {
  hostname: "whatsapp-saas-mocha.vercel.app",
  port: 443,
  path: "/api/webhooks/ycloud?wsid=5f4f8d53-c1ff-41e9-b5f0-1ceec3261366",
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
    console.log("Status Code:", res.statusCode);
    console.log("Response:", data);
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
});

req.on("error", (error) => {
  console.error("Error:", error);
  process.exit(1);
});

req.write(rawBody);
req.end();
