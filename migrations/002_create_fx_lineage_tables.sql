-- Migration: Create FX and FX Option lineage tables
-- Purpose: Track lineage of trades (rolls, liquidation, partial sells, etc.) and original trade linkage

-- Safe create enum for trade operations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'gzc_trade_operation' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.gzc_trade_operation AS ENUM (
            'NEW',
            'AMEND',
            'ROLL',
            'PARTIAL_SELL',
            'LIQUIDATION'
        );
    END IF;
END$$;

-- FX Trade Lineage
CREATE TABLE IF NOT EXISTS public.gzc_fx_trade_lineage (
    id                  BIGSERIAL PRIMARY KEY,
    original_trade_id   BIGINT NOT NULL, -- references the trade in gzc_fx_trade that this lineage belongs to (original)
    current_trade_id    BIGINT,          -- optional reference to a derivative/replacement trade
    parent_lineage_id   BIGINT,          -- optional parent lineage for chained operations
    operation           public.gzc_trade_operation NOT NULL,
    operation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    quantity_delta      NUMERIC(20,6),   -- change in notional/quantity due to the operation (can be negative)
    fund_id             INTEGER,         -- captured for convenience when split across funds
    notes               TEXT,
    mod_user            VARCHAR(64) NOT NULL DEFAULT 'GZC',
    mod_timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_fx_lineage_original_trade
        FOREIGN KEY (original_trade_id) REFERENCES public.gzc_fx_trade(trade_id) ON DELETE CASCADE,
    CONSTRAINT fk_fx_lineage_current_trade
        FOREIGN KEY (current_trade_id) REFERENCES public.gzc_fx_trade(trade_id) ON DELETE SET NULL,
    CONSTRAINT fk_fx_lineage_parent
        FOREIGN KEY (parent_lineage_id) REFERENCES public.gzc_fx_trade_lineage(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_fx_lineage_original_trade ON public.gzc_fx_trade_lineage(original_trade_id);
CREATE INDEX IF NOT EXISTS idx_fx_lineage_current_trade ON public.gzc_fx_trade_lineage(current_trade_id);
CREATE INDEX IF NOT EXISTS idx_fx_lineage_parent ON public.gzc_fx_trade_lineage(parent_lineage_id);
CREATE INDEX IF NOT EXISTS idx_fx_lineage_operation_time ON public.gzc_fx_trade_lineage(operation_timestamp);
CREATE INDEX IF NOT EXISTS idx_fx_lineage_fund ON public.gzc_fx_trade_lineage(fund_id);

-- FX Option Trade Lineage
CREATE TABLE IF NOT EXISTS public.gzc_fx_option_trade_lineage (
    id                  BIGSERIAL PRIMARY KEY,
    original_trade_id   BIGINT NOT NULL, -- references the trade in gzc_fx_option_trade that this lineage belongs to (original)
    current_trade_id    BIGINT,          -- optional reference to a derivative/replacement option trade
    parent_lineage_id   BIGINT,          -- optional parent lineage for chained operations
    operation           public.gzc_trade_operation NOT NULL,
    operation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    quantity_delta      NUMERIC(20,6),   -- change in notional/quantity due to the operation (can be negative)
    fund_id             INTEGER,
    notes               TEXT,
    mod_user            VARCHAR(64) NOT NULL DEFAULT 'GZC',
    mod_timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_fxopt_lineage_original_trade
        FOREIGN KEY (original_trade_id) REFERENCES public.gzc_fx_option_trade(trade_id) ON DELETE CASCADE,
    CONSTRAINT fk_fxopt_lineage_current_trade
        FOREIGN KEY (current_trade_id) REFERENCES public.gzc_fx_option_trade(trade_id) ON DELETE SET NULL,
    CONSTRAINT fk_fxopt_lineage_parent
        FOREIGN KEY (parent_lineage_id) REFERENCES public.gzc_fx_option_trade_lineage(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_fxopt_lineage_original_trade ON public.gzc_fx_option_trade_lineage(original_trade_id);
CREATE INDEX IF NOT EXISTS idx_fxopt_lineage_current_trade ON public.gzc_fx_option_trade_lineage(current_trade_id);
CREATE INDEX IF NOT EXISTS idx_fxopt_lineage_parent ON public.gzc_fx_option_trade_lineage(parent_lineage_id);
CREATE INDEX IF NOT EXISTS idx_fxopt_lineage_operation_time ON public.gzc_fx_option_trade_lineage(operation_timestamp);
CREATE INDEX IF NOT EXISTS idx_fxopt_lineage_fund ON public.gzc_fx_option_trade_lineage(fund_id);



