# Level 3 Supabase setup (optional — demo mode works without this)

## 1. Create a free Supabase project

## 2. Run this SQL in the SQL editor

```sql
create table if not exists level3_notes (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) <= 1000),
  created_at timestamptz not null default now()
);

alter table level3_notes enable row level security;

create policy "Public read level3 notes"
  on level3_notes for select
  using (true);

create policy "Public insert level3 notes"
  on level3_notes for insert
  with check (true);
```

## 3. Add Vercel environment variables

- `SUPABASE_URL` — Project URL from Supabase Settings → API
- `SUPABASE_ANON_KEY` — anon/public key from the same page

Redeploy after adding env vars. The guestbook switches from demo to live mode automatically.
