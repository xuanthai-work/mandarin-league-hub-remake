#!/usr/bin/env bash
# Copies drizzle/migrations/*.sql into Supabase CLI format (supabase-export/migrations)
# so they can be applied to any independent Supabase project with `supabase db push`.
set -euo pipefail
OUT="${1:-supabase-export/migrations}"
mkdir -p "$OUT"
i=0
for f in $(ls drizzle/migrations/*.sql | sort); do
  ts=$(printf "20260101%06d" "$i")
  name=$(basename "$f" .sql | sed 's/^[0-9]*_//')
  cp "$f" "$OUT/${ts}_${name}.sql"
  i=$((i+1))
done
echo "Exported $i migrations to $OUT"
