#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://gubcsmubxbpimoejlhgf.supabase.co";
const serviceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1YmNzbXVieGJwaW1vZWpsaGdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY1MzgyMiwiZXhwIjoyMDk4MjI5ODIyfQ.sSoSdYGkl4ksv4qrwLk-LOdO9U7vQIIODeXpjXMWMo0";

const supabase = createClient(supabaseUrl, serviceKey);

async function verifySecret() {
  const wsid = "5f4f8d53-c1ff-41e9-b5f0-1ceec3261366";

  console.log("Checking webhook secret in database...\n");

  try {
    const { data, error } = await supabase
      .from("integrations")
      .select("credentials")
      .eq("workspace_id", wsid)
      .eq("provider", "ycloud")
      .single();

    if (error) {
      console.error("Error:", error);
      return;
    }

    if (data && data.credentials) {
      const secret = data.credentials.webhook_signing_secret;

      if (!secret) {
        console.log("✗ No webhook_signing_secret in credentials");
        return;
      }

      console.log("Secret from database:");
      console.log('  Value: "' + secret + '"');
      console.log("  Length:", secret.length);
      console.log("  Bytes:", Buffer.from(secret).toString("hex"));
      console.log("\nSecret characteristics:");
      console.log("  Starts with 'whsec_':", secret.startsWith("whsec_"));
      console.log("  Contains spaces:", secret.includes(" "));
      console.log("  Contains newlines:", secret.includes("\n"));
      console.log("  Trimmed length:", secret.trim().length);
      console.log("  Is trimmed:", secret === secret.trim());

      console.log("\nCompare with test secret:");
      const testSecret = "whsec_a15ae422faf6459eb90e22156fef5242";
      console.log("  Match:", secret === testSecret);
      if (secret !== testSecret) {
        console.log("  Difference:");
        for (let i = 0; i < Math.max(secret.length, testSecret.length); i++) {
          if (secret[i] !== testSecret[i]) {
            console.log(
              `    Position ${i}: DB='${secret[i]}' (${secret.charCodeAt(i)}) vs Test='${testSecret[i]}' (${testSecret.charCodeAt(i)})`,
            );
          }
        }
      }
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

verifySecret();
