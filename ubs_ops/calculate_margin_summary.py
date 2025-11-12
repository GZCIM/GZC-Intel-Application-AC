import csv
from decimal import Decimal, ROUND_HALF_UP

def parse_number(value):
    """Parse a string number, handling empty strings and spaces"""
    if not value or value.strip() == '':
        return Decimal('0')
    try:
        return Decimal(str(value).strip().replace(',', ''))
    except:
        return Decimal('0')

def calculate_margin_summary(csv_file):
    """Calculate margin summary from CSV data"""

    # Initialize totals
    long_positions_mv = Decimal('0')
    short_positions_mv = Decimal('0')
    otc_mtm_mv = Decimal('0')
    money_market_mv = Decimal('0')
    net_cash_mv = Decimal('0')

    cross_margined_req = Decimal('0')
    otc_cross_netted_req = Decimal('0')
    money_market_margin_req = Decimal('0')
    long_short_benefit = Decimal('0')

    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            margin_type = row.get('Margin_Type', '').strip()
            product = row.get('Product', '').strip()
            reporting_group = row.get('Reporting_Group', '').strip()
            sec_type = row.get('Sec_Type', '').strip()

            mv_rollup = parse_number(row.get('MV_Rollup', '0'))
            margin_rollup = parse_number(row.get('Margin_Rollup', '0'))
            quantity = parse_number(row.get('Quantity', '0'))

            # Money Market Funds
            if margin_type == 'CrossMarginPosition' and product == 'MMS':
                money_market_mv += mv_rollup
                money_market_margin_req += margin_rollup

            # Cross-Margined Requirement (from CrossMarginPosition)
            elif margin_type == 'CrossMarginPosition':
                cross_margined_req += margin_rollup

            # OTC MTM (Forward, Option, Swap - but not FX Margin Requirement)
            elif margin_type == 'CrossNetOTC':
                if reporting_group in ['Forward', 'Option', 'Swap']:
                    otc_mtm_mv += mv_rollup
                # OTC Cross-Netted Requirement (all OTC margin requirements)
                otc_cross_netted_req += margin_rollup

            # Net Cash (Cash Balances)
            elif margin_type == 'Cash Balances':
                net_cash_mv += mv_rollup

            # Long/Short positions (if there are any in the data)
            # Note: Based on the data, there don't appear to be traditional long/short positions
            # These would typically be in different margin types

    # Calculate totals
    total_market_value = long_positions_mv + short_positions_mv + otc_mtm_mv + money_market_mv + net_cash_mv
    total_margin = cross_margined_req + otc_cross_netted_req + money_market_margin_req + long_short_benefit
    excess = total_market_value - total_margin

    # Round to 2 decimal places
    def round_decimal(d):
        return d.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    return {
        'Long Positions': {
            'Market Value': round_decimal(long_positions_mv),
            'Margin': None
        },
        'Short Positions': {
            'Market Value': round_decimal(short_positions_mv),
            'Margin': None
        },
        'OTC MTM': {
            'Market Value': round_decimal(otc_mtm_mv),
            'Margin': None
        },
        'Money Market Funds': {
            'Market Value': round_decimal(money_market_mv),
            'Margin': None
        },
        'Net Cash': {
            'Market Value': round_decimal(net_cash_mv),
            'Margin': None
        },
        'Cross-Margined Requirement': {
            'Market Value': None,
            'Margin': round_decimal(cross_margined_req)
        },
        'OTC Cross-Netted Requirement': {
            'Market Value': None,
            'Margin': round_decimal(otc_cross_netted_req)
        },
        'Money Market Funds Margin Requirement': {
            'Market Value': None,
            'Margin': round_decimal(money_market_margin_req)
        },
        'Long Short Benefit': {
            'Market Value': None,
            'Margin': round_decimal(long_short_benefit)
        },
        'TOTAL': {
            'Market Value': round_decimal(total_market_value),
            'Margin': round_decimal(total_margin)
        },
        'Excess': {
            'Market Value': None,
            'Margin': round_decimal(excess)
        }
    }

def print_margin_summary(summary):
    """Print margin summary in a formatted table"""
    print("\n" + "="*80)
    print("MARGIN SUMMARY IN USD".center(80))
    print("="*80)
    print(f"{'Category':<45} {'Market Value':>15} {'Margin':>15}")
    print("-"*80)

    for category, values in summary.items():
        mv_str = f"{values['Market Value']:>15,.2f}" if values['Market Value'] is not None else " " * 15
        margin_str = f"{values['Margin']:>15,.2f}" if values['Margin'] is not None else " " * 15
        print(f"{category:<45} {mv_str} {margin_str}")

    print("="*80)

def export_to_csv(summary, output_file):
    """Export margin summary to CSV"""
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Category', 'Market Value', 'Margin'])

        for category, values in summary.items():
            mv = values['Market Value'] if values['Market Value'] is not None else ''
            margin = values['Margin'] if values['Margin'] is not None else ''
            writer.writerow([category, mv, margin])

    print(f"\nMargin summary exported to: {output_file}")

if __name__ == '__main__':
    csv_file = r'c:\tmp\20251110.MFXCMDRCSV.I0004255.CSV'

    print("Calculating Margin Summary from CSV data...")
    summary = calculate_margin_summary(csv_file)

    print_margin_summary(summary)

    # Export to CSV
    export_to_csv(summary, 'margin_summary_output.csv')

    # Print comparison with expected values
    print("\n" + "="*80)
    print("COMPARISON WITH EXPECTED VALUES (from PDF Page 4)")
    print("="*80)
    expected = {
        'OTC MTM': {'Market Value': 943874},
        'Money Market Funds': {'Market Value': 114526406},
        'Net Cash': {'Market Value': 15717387},
        'OTC Cross-Netted Requirement': {'Margin': 15777738},
        'TOTAL': {'Market Value': 131187667, 'Margin': 15777738},
        'Excess': {'Margin': 115409930}
    }

    for category, expected_values in expected.items():
        if category in summary:
            print(f"\n{category}:")
            if 'Market Value' in expected_values:
                actual = summary[category]['Market Value']
                expected_val = Decimal(str(expected_values['Market Value']))
                diff = actual - expected_val
                print(f"  Market Value - Expected: {expected_val:,.2f}, Actual: {actual:,.2f}, Diff: {diff:,.2f}")
            if 'Margin' in expected_values:
                actual = summary[category]['Margin']
                expected_val = Decimal(str(expected_values['Margin']))
                diff = actual - expected_val
                print(f"  Margin - Expected: {expected_val:,.2f}, Actual: {actual:,.2f}, Diff: {diff:,.2f}")

