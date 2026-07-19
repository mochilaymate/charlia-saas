#!/usr/bin/env node

const crypto = require("node:crypto");

// El payload EXACTO que se enviará
const payload = {
  type: "whatsapp.inbound_message.received",
  createTime: "2026-07-19T10:00:00Z",
  whatsappInboundMessage: {
    wamid: "test-msg-xyz",
    from: "34611028477",
    to: "34644003816",
    type: "text",
    text: {
      body: "Hello World",
    },
  },
};

const secret = "whsec_a15ae422faf6459eb90e22156fef5242";

// Usar JSON.stringify EXACTAMENTE como lo haría Node.js para un POST body
const rawBody = JSON.stringify(payload);
const ts = "1784455400"; // Timestamp fijo para reproducibilidad

// Calcular el mensaje exactamente como lo hace el código
const message = `${ts}.${rawBody}`;

console.log("HMAC Calculation Test\n");
console.log("Raw Body:");
console.log(rawBody);
console.log("\nRaw Body Length:", rawBody.length);

console.log("\nTimestamp:", ts);
console.log("\nMessage to HMAC:");
console.log(message);
console.log("\nMessage Length:", message.length);

// Calcular HMAC
const hmac = crypto.createHmac("sha256", secret);
hmac.update(message);
const expectedHex = hmac.digest("hex");

console.log("\nCalculated Signature (hex):");
console.log(expectedHex);
console.log("\nSignature Length:", expectedHex.length);

// Convertir a Buffer y verificar
const expectedBuf = Buffer.from(expectedHex, "hex");
console.log("Buffer from hex:");
console.log("  Length:", expectedBuf.length);
console.log("  Hex:", expectedBuf.toString("hex"));

// Verificar con la firma recalculada
const receivedSig = expectedHex;
const receivedBuf = Buffer.from(receivedSig, "hex");

console.log("\nVerification:");
try {
  const match = crypto.timingSafeEqual(expectedBuf, receivedBuf);
  console.log("  timingSafeEqual result:", match);
} catch (err) {
  console.error("  timingSafeEqual error:", err.message);
}

// Probar con la firma fija del test anterior
const fixedTs = "1784455363";
const fixedSig = "708f18a512e23ecac37054f152718135bd649ef498ad7248a067a88d4ea5ddae";
const fixedMessage = `${fixedTs}.${rawBody}`;

console.log("\n\nTest with fixed timestamp and signature:");
console.log("Timestamp:", fixedTs);
console.log("Expected signature:", fixedSig);

const testHmac = crypto.createHmac("sha256", secret);
testHmac.update(fixedMessage);
const calculatedSig = testHmac.digest("hex");

console.log("Calculated signature:", calculatedSig);
console.log("Match:", fixedSig === calculatedSig);
