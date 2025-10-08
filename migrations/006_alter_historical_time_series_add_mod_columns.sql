-- Migration: Add mod_user and mod_timestamp to public.historical_time_series

DO $$
BEGIN
    -- mod_user
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='historical_time_series' AND column_name='mod_user'
    ) THEN
        EXECUTE 'ALTER TABLE public.historical_time_series ADD COLUMN mod_user VARCHAR NULL DEFAULT ''GZC''';
    END IF;

    -- mod_timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='historical_time_series' AND column_name='mod_timestamp'
    ) THEN
        EXECUTE 'ALTER TABLE public.historical_time_series ADD COLUMN mod_timestamp TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP';
    END IF;
END$$;




