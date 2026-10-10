// Runs every migration in supabase/migrations, in order, on a throwaway
// Postgres (PGlite, in memory), with stand-ins for the parts Supabase provides
// (auth.users, auth.uid(), auth.jwt()). Catches mistakes in the SQL before a
// real database exists. Run: npm run check:migrations
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { PGlite } from "@electric-sql/pglite"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"

const dir = path.join(process.cwd(), "supabase", "migrations")
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()

const db = new PGlite({ extensions: { pgcrypto } })

// What Supabase gives every project, reduced to what our migrations touch.
await db.exec(`
  create extension pgcrypto;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
`)

let failed = false
for (const file of files) {
  const sql = readFileSync(path.join(dir, file), "utf8")
  try {
    await db.exec(sql)
    console.log(`ok    ${file}`)
  } catch (e) {
    failed = true
    console.log(`FAIL  ${file}\n      ${e.message}`)
    break
  }
}

if (!failed) {
  const { rows } = await db.query(
    "select count(*)::int as tables, count(*) filter (where rowsecurity)::int as protected from pg_tables where schemaname = 'public'"
  )
  console.log(`\n${rows[0].tables} tables, ${rows[0].protected} with row-level security on.`)
  if (rows[0].tables !== rows[0].protected) {
    const { rows: open } = await db.query("select tablename from pg_tables where schemaname = 'public' and not rowsecurity")
    console.log(`Without it: ${open.map((r) => r.tablename).join(", ")}`)
    failed = true
  }
}
process.exit(failed ? 1 : 0)
