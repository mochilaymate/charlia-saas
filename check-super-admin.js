#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://gubcsmubxbpimoejlhgf.supabase.co";
const serviceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1YmNzbXVieGJwaW1vZWpsaGdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY1MzgyMiwiZXhwIjoyMDk4MjI5ODIyfQ.sSoSdYGkl4ksv4qrwLk-LOdO9U7vQIIODeXpjXMWMo0";

const supabase = createClient(supabaseUrl, serviceKey);

async function checkSuperAdmins() {
  console.log("Buscando super admins en la base de datos...\n");

  try {
    const { data: superAdmins, error } = await supabase
      .from("users")
      .select("id, email, is_super_admin")
      .eq("is_super_admin", true);

    if (error) {
      console.error("Error:", error);
      return;
    }

    if (!superAdmins || superAdmins.length === 0) {
      console.log("❌ NO HAY SUPER ADMINS EN LA BASE DE DATOS");
      console.log("\nPuedes crear uno ejecutando este SQL en Supabase:");
      console.log("UPDATE users SET is_super_admin = true WHERE email = 'tu@email.com';");
      return;
    }

    console.log("✓ Super admins encontrados:\n");
    superAdmins.forEach((user) => {
      console.log(`  Email: ${user.email}`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Super Admin: ${user.is_super_admin}\n`);
    });

    console.log("Intenta entrar con uno de estos emails para acceder a Workspaces.");
  } catch (err) {
    console.error("Exception:", err);
  }
}

checkSuperAdmins();
