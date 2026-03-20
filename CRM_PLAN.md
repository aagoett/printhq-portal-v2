# PrintHQ CRM / Organizations Plan

## Goal
Turn PrintHQ from a quoting/production tool into a relationship intelligence system.

## Core entities

### 1. organizations
One row per company/account.

Fields:
- id (uuid)
- name
- website
- industry
- employee_count
- revenue_band
- hq_city
- hq_state
- status (prospect|active|inactive|partner|vendor)
- account_owner_id (profiles.id)
- strategic_priority (low|medium|high)
- print_profile
- pain_points
- notes
- created_at
- updated_at

### 2. contacts
One row per person.

Fields:
- id (uuid)
- organization_id
- first_name
- last_name
- full_name
- title
- email
- phone
- linkedin_url
- buyer_role (decision_maker|influencer|end_user|procurement|finance|operations|marketing|unknown)
- relationship_strength (cold|warm|strong)
- status (active|inactive)
- source
- notes
- last_contact_at
- next_follow_up_at
- created_at
- updated_at

### 3. organization_plans
One strategic plan per org (or versioned later).

Fields:
- id (uuid)
- organization_id
- target_products
- likely_needs
- seasonality
- competitor_notes
- current_strategy
- next_best_action
- warm_intro_paths
- created_at
- updated_at

### 4. organization_activities
Every interaction/event.

Fields:
- id (uuid)
- organization_id
- contact_id (nullable)
- type (call|email|meeting|quote|sample|note|task)
- subject
- detail
- occurred_at
- owner_id
- created_at

### 5. organization_card_imports
Track imported business cards / OCR intake.

Fields:
- id (uuid)
- organization_id (nullable)
- contact_id (nullable)
- source_filename
- raw_text
- parsed_json
- review_status (pending|approved|rejected)
- created_at

## UI phases

### Phase 1
- Replace customer list with dual model:
  - Accounts / Organizations
  - Contacts
- Add organization detail page
- Add contact detail card/list on org page
- Add activity timeline

### Phase 2
- Add buyer mapping badges and missing-role warnings
- Add organization plan editor
- Add business card import review queue

### Phase 3
- Add AI-generated marketing plan per organization
- Add opportunity tracking + next-best-action suggestions

## UX principles
- One organization page should answer:
  - who are they?
  - who buys?
  - who are we missing?
  - what do they likely need?
  - what should we do next?

## First implementation target
- migrations
- `/dashboard/organizations`
- `/dashboard/organizations/[id]`
- quick-create contact modal / form
- activity timeline
