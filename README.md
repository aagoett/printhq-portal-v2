# PrintHQ Portal v2

## Estimator & Quote Builder

This repository now includes a lightweight estimating engine and admin rate manager.

### Database
- SQL migration: `sql/estimator.sql`
- Run with service role credentials:

```bash
SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... psql "$NEXT_PUBLIC_SUPABASE_URL" -f sql/estimator.sql
# or use Supabase SQL editor and paste the file contents
```

Tables created: `presses`, `stocks`, `finishing_ops`, `markups`, `product_templates`, `quotes`, `quote_line_items`. The migration seeds a couple of presses, stocks, finishing ops, markups, and templates.

### Admin rate management
- Path: `/dashboard/pricing/estimator`
- Admins/staff can CRUD presses, stocks, finishing ops, markups, and product templates directly from the UI.
- Service-role Supabase client is only used inside server actions; the client/browser uses the anon key for reads.

### Quote builder
- Path: `/dashboard/pricing/estimator`
- Pick template/press/stock/markup/finishing and enter comma-separated quantities.
- The estimator applies waste/setup, press time, finishing time, and markup to produce per-quantity totals plus a breakdown.
- Save quotes to Supabase; line items are stored in `quote_line_items`, and the full breakdown is attached to `quotes.breakdown`.

### Dev commands
- `npm run dev`
- `npm run build`

Ensure environment contains `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for server actions.
