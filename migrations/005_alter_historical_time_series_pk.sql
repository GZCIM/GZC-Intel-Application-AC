-- Migration: Add primary key and sequence to public.historical_time_series(Id)

DO $$
BEGIN
    -- Create sequence if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'S' AND c.relname = 'historical_time_series_id_seq' AND n.nspname = 'public'
    ) THEN
        EXECUTE 'CREATE SEQUENCE public.historical_time_series_id_seq CACHE 1';
    END IF;

    -- Attach default nextval to Id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='historical_time_series' AND column_name='Id' AND column_default LIKE 'nextval%'
    ) THEN
        EXECUTE 'ALTER TABLE public.historical_time_series ALTER COLUMN "Id" SET DEFAULT nextval(''public.historical_time_series_id_seq''::regclass)';
    END IF;

    -- Set sequence to max(Id)+1 to avoid collisions
    PERFORM setval('public.historical_time_series_id_seq', COALESCE((SELECT MAX("Id") FROM public.historical_time_series), 0) + 1, false);

    -- Add primary key constraint if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema='public' AND table_name='historical_time_series' AND constraint_type='PRIMARY KEY'
    ) THEN
        EXECUTE 'ALTER TABLE public.historical_time_series ADD CONSTRAINT historical_time_series_pkey PRIMARY KEY ("Id")';
    END IF;
END$$;



