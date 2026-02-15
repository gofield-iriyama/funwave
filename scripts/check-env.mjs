#!/usr/bin/env node

import { existsSync } from "node:fs";
import { config } from "dotenv";

if (existsSync(".env.local")) {
  config({ path: ".env.local" });
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("Missing env vars:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

console.log("All required env vars are set.");
