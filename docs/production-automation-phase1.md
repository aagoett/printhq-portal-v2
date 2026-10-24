# PrintHQ production automation — Phase 1

Branch: `feature/production-automation-foundation`

## Current integration
- Existing CSR upload paths: `app/jobs/new/page.tsx` writes `job_files` and Supabase Storage `art-files`.
- Other upload paths use `uploads` and `job_assets`; these are **not yet integrated** with the initial trigger.
- Additive SQL migration: `sql/production_automation_foundation.sql`.
- Read-only internal dashboard: `/dashboard/production`.

## Before applying migration
1. Confirm `jobs.id` and `job_files.id` are UUIDs and `job_files.job_id` references jobs.
2. Confirm `job_files.bucket` and either `path` or `storage_path` hold the actual storage location.
3. Confirm role values and Supabase RLS against deployed schema; staff read-only policies are included.
4. Test in staging with one CSR upload and a second file revision. Verify revision invalidation.
5. Review storage bucket access, file sizes, antivirus handling, and signed download strategy.

## Planned worker architecture
- Central API creates preflight tasks with leases, retries and idempotency keys.
- San Jose and Dallas agents authenticate with unique per-agent identities and poll for work assigned to their plant.
- Agent downloads signed, expiring file URLs, validates SHA-256 and PDF content, executes preflight in isolated workspace, uploads reports.
- Gang planner considers only validated jobs with explicit quantity, stock, finishing, due date and plant assignment.
- Approval binds a specific plan revision and hashes of all input files and final output.
- RIP release requires separate human approval and is executed only by an allowlisted local agent.
- Every transition is auditable. Fail closed on stale revisions or agent mismatch.

## Known limitations
- No database migration has been executed.
- No background preflight worker, live realtime subscription, automatic repair, optimization worker or RIP integration has been deployed.
- No press profile has been certified; Phoenix-style perfecting and plate geometry require calibration.
- Existing job intake paths use inconsistent file tables and buckets; unify them before enabling automatic production.
