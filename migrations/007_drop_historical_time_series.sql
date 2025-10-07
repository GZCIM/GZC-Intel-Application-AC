-- Drop public.historical_time_series as it is no longer needed.
-- This migration is safe to run multiple times due to IF EXISTS.

DROP TABLE IF EXISTS public.historical_time_series CASCADE;
