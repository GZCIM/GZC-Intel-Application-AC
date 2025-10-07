-- Migration: Create portfolio tables and allocations to lineage

-- Portfolios table
CREATE TABLE IF NOT EXISTS public.gzc_portfolio (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(128) NOT NULL,
    description   TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    mod_user      VARCHAR(64) NOT NULL DEFAULT 'GZC',
    mod_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allocation tables: many-to-many between portfolios and lineage entries
CREATE TABLE IF NOT EXISTS public.gzc_portfolio_fx_allocation (
    portfolio_id   BIGINT NOT NULL,
    lineage_id     BIGINT NOT NULL,
    allocation_pct NUMERIC(9,6) CHECK (allocation_pct >= 0 AND allocation_pct <= 1),
    mod_user       VARCHAR(64) NOT NULL DEFAULT 'GZC',
    mod_timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (portfolio_id, lineage_id),
    CONSTRAINT fk_alloc_portfolio
        FOREIGN KEY (portfolio_id) REFERENCES public.gzc_portfolio(id) ON DELETE CASCADE,
    CONSTRAINT fk_alloc_fx_lineage
        FOREIGN KEY (lineage_id) REFERENCES public.gzc_fx_trade_lineage(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fx_alloc_portfolio ON public.gzc_portfolio_fx_allocation(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_fx_alloc_lineage ON public.gzc_portfolio_fx_allocation(lineage_id);

CREATE TABLE IF NOT EXISTS public.gzc_portfolio_fxopt_allocation (
    portfolio_id   BIGINT NOT NULL,
    lineage_id     BIGINT NOT NULL,
    allocation_pct NUMERIC(9,6) CHECK (allocation_pct >= 0 AND allocation_pct <= 1),
    mod_user       VARCHAR(64) NOT NULL DEFAULT 'GZC',
    mod_timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (portfolio_id, lineage_id),
    CONSTRAINT fk_alloc_portfolio2
        FOREIGN KEY (portfolio_id) REFERENCES public.gzc_portfolio(id) ON DELETE CASCADE,
    CONSTRAINT fk_alloc_fxopt_lineage
        FOREIGN KEY (lineage_id) REFERENCES public.gzc_fx_option_trade_lineage(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fxopt_alloc_portfolio ON public.gzc_portfolio_fxopt_allocation(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_fxopt_alloc_lineage ON public.gzc_portfolio_fxopt_allocation(lineage_id);



