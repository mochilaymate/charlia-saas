#!/usr/bin/env node

const crypto = require("node:crypto");

const secret = "whsec_a15ae422faf6459eb90e22156fef5242";

// El payload EXACTO de test-detailed.js
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

const rawBody = JSON.stringify(payload);
const ts = "1784455325"; // El timestamp exacto que se usó en test-detailed.js
const expectedSigFromTest = "be96406a4826a7b84680c28862610262cf0b374882823b2b10864b5ec73206cc";

console.log("Verify exact signature from test-detailed.js\n");
console.log("Raw body (copy from test):");
console.log(rawBody);
console.log("\nLengths match?");
console.log('  Test payload length: 209, This payload length:', rawBody.length);

const message = `${ts}.${rawBody}`;
const hmac = crypto.createHmac("sha256", secret);
hmac.update(message);
const calculatedSig = hmac.digest("hex");

console.log("\nSignature comparison:");
console.log("  From test-detailed.js:", expectedSigFromTest);
console.log("  Calculated here:", calculatedSig);
console.log("  Match:", expectedSigFromTest === calculatedSig);

// Debug: check individual bytes
if (expectedSigFromTest !== calculatedSig) {
  console.log("\nDebug differences:");
  for (let i = 0; i < Math.max(expectedSigFromTest.length, calculatedSig.length); i += 8) {
    const exp = expectedSigFromTest.substring(i, i + 8) || "(none)";
    const calc = calculatedSig.substring(i, i + 8) || "(none)";
    if (exp !== calc) {
      console.log(`  [${i}-${i + 7}]: exp=${exp}, calc=${calc}`);
    }
  }
}
