const crypto = require("node:crypto");
const https = require("node:https");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://gubcsmubxbpimoejlhgf.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1YmNzbXVieGJwaW1vZWpsaGdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY1MzgyMiwiZXhwIjoyMDk4MjI5ODIyfQ.sSoSdYGkl4ksv4qrwLk-LOdO9U7vQIIODeXpjXMWMo0";

async function test() {
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: integration } = await supabase.from("integrations").select("credentials").eq("workspace_id", "5f4f8d53-c1ff-41e9-b5f0-1ceec3261366").eq("provider", "ycloud").single();
  const secret = integration.credentials?.webhook_signing_secret?.trim();

  const payload = {
    type: "whatsapp.inbound_message.received",
    createTime: new Date().toISOString(),
    whatsappInboundMessage: {
      wamid: `test-${Date.now()}`,
      from: "34611028477",
      to: "34611028477",
      type: "text",
      text: { body: "Test" },
    },
  };

  const rawBody = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000);
  const message = `${ts}.${rawBody}`;
  const signature = crypto.createHmac("sha256", secret).update(message).digest("hex");
  const header = `t=${ts},s=${signature}`;

  console.log("Testing WITHOUT wsid parameter (phone-based lookup)...\n");

  const req = https.request({
    hostname: "whatsapp-saas-mocha.vercel.app",
    path: "/api/webhooks/ycloud",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(rawBody),
      "YCloud-Signature": header,
    },
  }, (res) => {
    let data = "";
    res.on("data", (chunk) => { data += chunk; });
    res.on("end", () => {
      console.log("Status:", res.statusCode);
      console.log("Body:", data);
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log("\n? SUCCESS!");
      }
    });
  });

  req.on("error", (err) => console.error("Error:", err.message));
  req.write(Buffer.from(rawBody, "utf8"));
  req.end();
}

test();
