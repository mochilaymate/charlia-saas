#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://gubcsmubxbpimoejlhgf.supabase.co";
const serviceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1YmNzbXVieGJwaW1vZWpsaGdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY1MzgyMiwiZXhwIjoyMDk4MjI5ODIyfQ.sSoSdYGkl4ksv4qrwLk-LOdO9U7vQIIODeXpjXMWMo0";

const supabase = createClient(supabaseUrl, serviceKey);

async function checkIntegration() {
  const wsid = "5f4f8d53-c1ff-41e9-b5f0-1ceec3261366";

  console.log("Checking for YCloud integration...\n");

  try {
    const { data, error } = await supabase
      .from("integrations")
      .select("workspace_id, provider, enabled, credentials, config")
      .eq("workspace_id", wsid)
      .eq("provider", "ycloud");

    if (error) {
      console.error("Error:", error);
      return;
    }

    if (data && data.length > 0) {
      const integration = data[0];
      console.log("✓ Integration found!");
      console.log("  Workspace ID:", integration.workspace_id);
      console.log("  Provider:", integration.provider);
      console.log("  Enabled:", integration.enabled);

      if (integration.credentials) {
        const creds = integration.credentials;
        console.log("  Webhook Secret:", creds.webhook_signing_secret ? "✓ Present" : "✗ Missing");
        if (creds.webhook_signing_secret) {
          console.log(
            "    Value:",
            creds.webhook_signing_secret.substring(0, 20) + "...",
          );
        }
      }

      if (integration.config) {
        console.log("  Config:", JSON.stringify(integration.config, null, 2));
      }
    } else {
      console.log(
        "✗ No YCloud integration found for workspace",
        wsid,
      );
      console.log("\nSearching for ALL integrations in workspace...");

      const { data: allIntegrations } = await supabase
        .from("integrations")
        .select("workspace_id, provider, enabled")
        .eq("workspace_id", wsid);

      if (allIntegrations && allIntegrations.length > 0) {
        console.log("Found integrations:");
        allIntegrations.forEach((i) => {
          console.log(`  - ${i.provider} (enabled: ${i.enabled})`);
        });
      } else {
        console.log("No integrations found for this workspace");
      }
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

checkIntegration();
