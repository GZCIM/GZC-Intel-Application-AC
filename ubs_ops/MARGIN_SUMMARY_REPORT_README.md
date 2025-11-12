# Margin Summary Report Generator

## Overview
This tool reproduces the Margin Summary report (Page 4 of the PDF) from the CSV data file.

## Generated Files

1. **margin_summary_report.html** - Formatted HTML report (similar to PDF page 4)
2. **margin_summary_report.xlsx** - Excel workbook with formatted table
3. **margin_summary_report.csv** - CSV format for data import
4. **margin_summary_output.csv** - Raw calculation output

## Scripts

### 1. `calculate_margin_summary.py`
- Calculates margin summary values from CSV
- Compares results with expected PDF values
- Shows detailed breakdown and differences

### 2. `generate_margin_report.py`
- Generates formatted reports in multiple formats
- Creates HTML, Excel, and CSV outputs
- Includes account information and formatting

## Results Comparison

The calculated values match the PDF report with minimal differences (< $1):

| Category | Expected (PDF) | Calculated | Difference |
|----------|---------------|------------|------------|
| OTC MTM | $943,874.00 | $943,874.45 | $0.45 |
| Money Market Funds | $114,526,406.00 | $114,526,405.81 | -$0.19 |
| Net Cash | $15,717,387.00 | $15,717,387.20 | $0.20 |
| OTC Cross-Netted Requirement | $15,777,738.00 | $15,777,737.93 | -$0.07 |
| TOTAL Market Value | $131,187,667.00 | $131,187,667.46 | $0.46 |
| TOTAL Margin | $15,777,738.00 | $15,777,737.93 | -$0.07 |
| Excess | $115,409,930.00 | $115,409,929.53 | -$0.47 |

## Calculation Logic

### Market Value Components:
- **Long Positions**: Sum of long position market values (currently 0)
- **Short Positions**: Sum of short position market values (currently 0)
- **OTC MTM**: Sum of MV_Rollup for OTC positions (Forward, Option, Swap)
- **Money Market Funds**: Sum of MV_Rollup for CrossMarginPosition with Product='MMS'
- **Net Cash**: Sum of MV_Rollup for Cash Balances

### Margin Components:
- **Cross-Margined Requirement**: Sum of Margin_Rollup for CrossMarginPosition
- **OTC Cross-Netted Requirement**: Sum of Margin_Rollup for CrossNetOTC
- **Money Market Funds Margin Requirement**: Sum of Margin_Rollup for Money Market positions
- **Long Short Benefit**: Benefit from long/short offsetting (currently 0)

### Totals:
- **TOTAL Market Value**: Sum of all market value components
- **TOTAL Margin**: Sum of all margin requirements
- **Excess**: Total Market Value - Total Margin

## Usage

### Run the calculation script:
```bash
python calculate_margin_summary.py
```

### Generate formatted reports:
```bash
python generate_margin_report.py
```

### View the HTML report:
Open `margin_summary_report.html` in a web browser

### Open the Excel report:
Open `margin_summary_report.xlsx` in Microsoft Excel or compatible spreadsheet application

## Data Source

Input file: `c:\tmp\20251110.MFXCMDRCSV.I0004255.CSV`

The script processes:
- Account: I0004255
- Account Name: GZC GLOBAL CURRENCIES FUND LTD
- Date: 11/10/2025

## Notes

- All calculations use Decimal precision to avoid floating-point errors
- Values are rounded to 2 decimal places
- The small differences (< $1) are likely due to rounding in the original PDF generation
- The script correctly identifies and categorizes all position types from the CSV

