# Stage0

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
3. `supabase/migrations/20260909000003_vehicles.sql`
4. `supabase/migrations/20260909000004_revoke_trigger_function_execute.sql`
5. `supabase/migrations/20260909000005_append_only_truncate_guard.sql`

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
filtering rather than proving the tables are empty. Then, with only the anon key
and no session:

```bash
for t in scrape_runs scrape_events vehicles vehicle_ownerships vehicle_events title_reports; do
  echo -n "$t: "
  curl -s "$VITE_SUPABASE_URL/rest/v1/$t?select=*" -H "apikey: $VITE_SUPABASE_ANON_KEY"
  echo
done
# every line must return []
```

Two further checks, in the SQL Editor:

```sql
-- every table must report rowsecurity = true
select tablename, rowsecurity from pg_tables where schemaname = 'public';

-- every security definer function must show search_path=""
select proname, proconfig from pg_proc
 where prosecdef and pronamespace = 'public'::regnamespace;
```

Signed in as the administrator, `/admin` shows the same rows.

## Vehicle data model

Schema only in this build — no UI, no claim or transfer flows.

The vehicle is the root entity and ownership is a time-bounded edge:
`vehicle_ownerships` carries `started_on` / `ended_on`, and records attach to
`vehicle_id` while being attributed to an ownership period. That is what lets
history follow a car through a sale without a later migration. Events marked
`transferable` follow the car; `private` ones stay with the ownership period
that wrote them.

`vehicle_events` is append-only. There is no UPDATE or DELETE policy, and
triggers raise on UPDATE, DELETE **and TRUNCATE** — the last one matters because
TRUNCATE does not fire row-level triggers, so without a statement-level guard
the table could be emptied by a single statement. Corrections are new rows
referencing `supersedes_id`.

That also means test fixtures cannot be deleted normally. If you need to clear
the table during development, drop `vehicle_events_no_truncate` deliberately,
truncate, and recreate it — the point is that discarding history is a visible
act rather than an accident.

An odometer reading lower than the previous one is **stored and flagged**
(`vehicle_events.odometer_rollback`), never refused. A rollback is a typo, a
cluster swap, or fraud, and all three are worth keeping.

`title_reports` is deliberately a separate table: official attestations and
self-reported records must never share one.

### VIN handling

A VIN ties to registration, title and insurance records, so it is treated as
personal data. Nothing logs a VIN, no error message echoes one back, and there
is no lookup-by-VIN path for anyone but a verified current owner — including no
existence check, which would leak enumeration. The unique index on
`vehicles.vin` is for integrity, not lookup.

`src/lib/vin.ts` normalises, rejects anything that is not 17 characters or that
contains I, O or Q, and computes the ISO 3779 check digit. **A failed check
digit is a warning, not a rejection** — some grey-market and non-US-market
vehicles legitimately fail it, and refusing those would lock real owners out of
their own cars. The result is stored on `vehicles.vin_check_ok`.

```bash
bun test        # VIN validator tests
```

### Deploying

The root `wrangler.toml` deploys the built SPA to **stage0.us** as an
assets-only Worker:

```bash
bun run build
npx wrangler deploy
```

`not_found_handling = "single-page-application"` is what makes `/admin` and
`/admin/login` survive a hard refresh — without it the static host returns 404
before React ever loads. `public/_headers` carries the CSP and the other
response headers, and Vite copies it into `dist/` on build.

### Signing in as the operator

The public app links to `/admin/login` from the footer. Hiding that URL would
not be a control, so it is not treated as one — the gate is Row Level Security,
which returns nothing to anyone who is not the administrator.

The login page links on to `/admin/register` **only while the admin slot is
unclaimed**. Once `claim_admin()` has run the link disappears permanently, and
the registration page itself renders "Registration is closed".

### What writes the report tables

Nothing in the browser — there are no insert, update or delete policies. Rows
will come from a GitHub Actions job using the service role key, which bypasses
RLS. That sync job is a separate piece of work; until it exists the report
renders an empty state.
