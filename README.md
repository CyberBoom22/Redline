# Redline

The honest build planner for forced-induction platforms — BMW B58 and Infiniti
VQ/VR. Build path calculation, parts catalog, tiered risk warnings, dyno
tracking, exhaust sound reference and a vetted tuner list.

```bash
bun install
bun run dev      # http://localhost:3000
bun run lint     # tsc --noEmit
bun run build
```

**The public app needs no account and no Supabase configuration.** The planner,
catalog, warnings, sound hub, dyno tracker and tuner list all work signed out.

## Admin scrape report

There is exactly one administrator account, and only that account can see the
scraper's run history at `/admin`.

The guarantee lives in Postgres, not in React. `claim_admin()` inserts into an
empty `admins` table and raises otherwise, a unique index on a constant
expression makes a second row physically impossible, and Row Level Security on
`scrape_runs` / `scrape_events` allows `select` only when `is_admin()` is true.
The route guard is a convenience on top of that — if it were deleted, the anon
key would still return zero rows.

### 1. Configure the project

Copy the example file and fill in the two values from your Supabase dashboard
(**Settings → API**):

```bash
cp .env.example .env.local
```

| Variable | Where it comes from |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | `anon` `public` key |

Never add the service role key here. The `VITE_` prefix is what tells Vite to
inline a variable into the browser bundle, and the service role key bypasses
RLS entirely — it belongs only in GitHub Actions secrets.

### 2. Run the migrations

With the Supabase CLI, from the repo root:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste each file into the dashboard's **SQL Editor** and run it, in order:

1. `supabase/migrations/20260909000001_admin.sql`
2. `supabase/migrations/20260909000002_scrape_report.sql`

### 3. Register the one administrator

Email signups must be enabled for this step, and **"Confirm email" must be off**
(Authentication → Providers → Email). `claim_admin()` needs an authenticated
caller, and with confirmation on, `signUp` returns no session — there is nobody
to claim as. The registration screen detects this and says so.

Then visit `/admin/register`, enter an email and password, and submit. The page
calls `signUp` and immediately calls `claim_admin()`.

**After it succeeds, disable email signups in the Supabase dashboard.** A second
signup would only ever create a powerless account — `claim_admin()` guarantees
that, and RLS shows such an account nothing — but closing the door is still the
right end state. Visiting `/admin/register` again shows "Registration is
closed".

### 4. Verify the gate

Insert a test row through the SQL Editor first, so an empty result proves RLS is
filtering rather than proving the table is empty:

```sql
insert into scrape_runs (started_at, trigger, request_limit) values (now(), 'manual', 200);
```

Then query as an anonymous client:

```bash
curl "$VITE_SUPABASE_URL/rest/v1/scrape_runs?select=*" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY"
# expected: []

curl "$VITE_SUPABASE_URL/rest/v1/scrape_events?select=*" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY"
# expected: []
```

Signed in as the administrator, `/admin` shows the same rows.

### Deploying

`/admin` and `/admin/login` are client-side routes, so the host must serve
`index.html` for unmatched paths. Without that SPA fallback a hard refresh on
`/admin` returns 404 from the static host before React ever loads.

### What writes the report tables

Nothing in the browser — there are no insert, update or delete policies. Rows
will come from a GitHub Actions job using the service role key, which bypasses
RLS. That sync job is a separate piece of work; until it exists the report
renders an empty state.
