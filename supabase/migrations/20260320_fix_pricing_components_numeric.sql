-- Ensure pricing_components uses numeric columns so decimals (.02, .05, .125) persist
-- Safe-guard each column check to avoid errors if the schema drifts

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pricing_components' AND column_name = 'cost_amount'
  ) THEN
    ALTER TABLE public.pricing_components
      ALTER COLUMN cost_amount TYPE numeric USING cost_amount::numeric,
      ALTER COLUMN cost_amount SET DEFAULT 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pricing_components' AND column_name = 'price_amount'
  ) THEN
    ALTER TABLE public.pricing_components
      ALTER COLUMN price_amount TYPE numeric USING price_amount::numeric,
      ALTER COLUMN price_amount SET DEFAULT 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pricing_components' AND column_name = 'price_override'
  ) THEN
    ALTER TABLE public.pricing_components
      ALTER COLUMN price_override TYPE numeric USING price_override::numeric;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pricing_components' AND column_name = 'parent_sheet_width'
  ) THEN
    ALTER TABLE public.pricing_components
      ALTER COLUMN parent_sheet_width TYPE numeric USING parent_sheet_width::numeric;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pricing_components' AND column_name = 'parent_sheet_height'
  ) THEN
    ALTER TABLE public.pricing_components
      ALTER COLUMN parent_sheet_height TYPE numeric USING parent_sheet_height::numeric;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pricing_components' AND column_name = 'weight'
  ) THEN
    ALTER TABLE public.pricing_components
      ALTER COLUMN weight TYPE numeric USING weight::numeric;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pricing_components' AND column_name = 'caliper'
  ) THEN
    ALTER TABLE public.pricing_components
      ALTER COLUMN caliper TYPE numeric USING caliper::numeric;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pricing_components' AND column_name = 'run_speed_per_hour'
  ) THEN
    ALTER TABLE public.pricing_components
      ALTER COLUMN run_speed_per_hour TYPE numeric USING run_speed_per_hour::numeric;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pricing_components' AND column_name = 'setup_minutes'
  ) THEN
    ALTER TABLE public.pricing_components
      ALTER COLUMN setup_minutes TYPE numeric USING setup_minutes::numeric;
  END IF;

  -- Align units to text to avoid implicit casting surprises
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pricing_components' AND column_name = 'cost_unit'
  ) THEN
    ALTER TABLE public.pricing_components ALTER COLUMN cost_unit TYPE text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pricing_components' AND column_name = 'price_unit'
  ) THEN
    ALTER TABLE public.pricing_components ALTER COLUMN price_unit TYPE text;
  END IF;
END $$;
