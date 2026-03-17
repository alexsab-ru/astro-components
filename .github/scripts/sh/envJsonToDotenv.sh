#!/usr/bin/env bash
# -----------------------------------------------------------
# envJsonToDotenv.sh
#
# Reads src/data/env.json and merges its keys into .env.
# Keys already present in .env are overwritten; new keys are appended.
# Keys that are JSON objects (e.g. *_KEY_MAPPING) are serialised
# to a single-line JSON string.
#
# Requires: node (used for reliable JSON parsing).
#
# Usage:
#   bash .github/scripts/sh/envJsonToDotenv.sh
#   ENV_JSON_PATH=path/to/env.json bash .github/scripts/sh/envJsonToDotenv.sh
# -----------------------------------------------------------
set -euo pipefail

ENV_JSON="${ENV_JSON_PATH:-src/data/env.json}"

if [ ! -f "$ENV_JSON" ]; then
  echo "⚠ env.json not found at $ENV_JSON — skipping merge"
  exit 0
fi

DOTENV="${DOTENV_PATH:-.env}"

# Ensure .env exists
touch "$DOTENV"

# --- Generate KEY=VALUE pairs from env.json via Node.js ------
PAIRS=$(node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
for (const [key, value] of Object.entries(data)) {
  if (key === "DOMAIN") continue;                // DOMAIN lives in .env only
  if (typeof value === "object") {
    // JSON objects (_KEY_MAPPING etc.) — write as-is, no outer quotes
    // so shell scripts and GSheetFetcher receive valid JSON
    process.stdout.write(key + "=" + JSON.stringify(value) + "\n");
  } else {
    const str = String(value);
    // Wrap in double quotes; escape inner double-quotes and backslashes
    const escaped = str.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    process.stdout.write(key + "=\"" + escaped + "\"\n");
  }
}
' "$ENV_JSON")

if [ -z "$PAIRS" ]; then
  echo "▶ env.json is empty — nothing to merge"
  exit 0
fi

# --- Merge into .env -----------------------------------------
while IFS='=' read -r key rest; do
  [ -z "$key" ] && continue
  # Remove existing line (if any) and append new one
  # Use a temp file for portability (BSD sed -i requires extension arg)
  grep -v "^${key}=" "$DOTENV" > "$DOTENV.tmp" || true
  mv "$DOTENV.tmp" "$DOTENV"
  echo "${key}=${rest}" >> "$DOTENV"
done <<< "$PAIRS"

echo "✅ Merged env.json → .env ($(echo "$PAIRS" | wc -l | tr -d ' ') keys)"
