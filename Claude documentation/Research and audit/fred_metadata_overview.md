# FRED Releases - Metadata Overview

## Sources
- fred-release-dates-sample.json (collection_timestamp: 2025-08-10T09:50:15.000Z)
- fred-latest-5-releases.json (collection_timestamp: 2025-08-10T09:49:45.000Z)
- debug logs (selected excerpts) for context

## Top-level Schema
- **collection_timestamp**: ISO datetime string
- **release_publication_data**: array of objects with publication cadence
  - release_id: integer
  - name: string
  - total_publications: integer
  - recent_dates: array of YYYY-MM-DD strings (most recent first)
  - frequency: string (e.g., daily, monthly)
- **observations**: array of strings (analyst notes)
- **latest_5_releases** (from second file): array of objects with meta
  - id: integer
  - name: string
  - press_release: boolean
  - link: URL
  - notes: optional string
- **total_releases_available**: integer (from second file)

## Combined Release Index
- 769 — Fujita, Moscarini, and Postel-Vinay Employer-to-Employer Transition Probability
  - press_release: true
  - frequency: monthly
  - total_publications: 9
  - recent_dates: [2025-08-08, 2025-07-11, 2025-06-13]
  - link: (not provided in first file)
- 739 — Kansas City Fed Policy Rate Uncertainty
  - press_release: true
  - frequency: daily
  - total_publications: 36
  - recent_dates: [2025-08-08, 2025-08-07, 2025-08-06]
  - link: https://www.kansascityfed.org/data-and-trends/kansas-city-fed-policy-rate-uncertainty/
  - notes: Daily market-based uncertainty measure of expected short-term U.S. rates one year ahead
- 738 — Quits and Layoffs to Nonemployment Based on CPS
  - press_release: true
  - frequency: monthly
  - total_publications: 4
  - recent_dates: [2025-07-13, 2025-06-17, 2025-05-19]
  - link: https://sites.google.com/qlmonthly.com/home/data
  - notes: Monthly CPS-based quits/layoffs series as timely labor indicators
- 737 — National Housing Survey
  - press_release: true
  - frequency: monthly
  - total_publications: 5
  - recent_dates: [2025-08-07, 2025-07-07, 2025-06-09]
  - link: https://www.fanniemae.com/research-and-insights/surveys-indices/national-housing-survey
  - notes: Monthly survey (1,000 respondents) aggregated into HPSI® indicator
- 736 — Visa Spending Momentum Index
  - press_release: true
  - frequency: monthly
  - total_publications: 15
  - recent_dates: [2025-08-07, 2025-07-10, 2025-06-12]
  - link: https://usa.visa.com/partner-with-us/visa-consulting-analytics/spending-momentum-index.html

## Aggregates
- Unique frequencies: { monthly: 4, daily: 1 }
- total_publications: min 4, max 36, sum 69, avg 13.8
- Per-release recent_dates count: 3 (consistent across sample)
- Overall recent_dates range: 2025-05-19 → 2025-08-08
- total_releases_available (global): 318

## Visual Design Notes
- Timeline view per release: plot `recent_dates` points with color per `frequency` and size by `total_publications`.
- Frequency distribution: bar chart of counts per `frequency`.
- Top 5 table: name, id, press_release badge, frequency, link, total_publications, latest date.
- Tooltip content: include `notes` when present, else name + frequency + latest date.

## Data Gaps & Follow-ups
- Links and notes missing for some releases in the first file; enrich via FRED API.
- Confirm whether `press_release` is universally true for this subset or a selection artifact.
- Extend `recent_dates` length beyond 3 for richer trend lines.

## Appendix: Observations
- All 5 releases are press_release: true
- Publication frequencies vary: daily (Policy Rate) vs monthly (others)
- Recent activity: All published within last month
- Range of publication counts: 4–36 total publications per release
