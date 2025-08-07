import logging
from datetime import datetime
from app.util.fix_connection import FIXConnection

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class MarketDataHandler:
    def __init__(self, fix_connection: FIXConnection):
        self.fix_conn = fix_connection
        self.active_subscriptions = {}

    def subscribe_market_data(self, symbol, subscription_type='1', market_depth=0, update_type=1, 
                            entry_types=None, parties=None, settl_type=None, settl_date=None,
                            requested_sizes=None):
        """
        Subscribe to market data for a specific symbol
        subscription_type: 1=SnapshotAndUpdates, 2=Unsubscribe, Z=NoMarketFeedback
        update_type: 0=FullRefresh, 1=IncrementalRefresh
        """
        try:
            md_req_id = f"MDR_{symbol}_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}"
            
            fields = {
                '262': md_req_id,  # MDReqID
                '263': subscription_type,  # SubscriptionRequestType
                '264': str(market_depth),  # MarketDepth
                '265': str(update_type),  # MDUpdateType
                '146': '1',  # NoRelatedSym
                '55': symbol,  # Symbol
            }

            # Add settlement type and date if provided
            if settl_type:
                fields['63'] = settl_type  # SettlType
            if settl_date:
                fields['64'] = settl_date  # SettlDate

            # Add entry types if provided
            if entry_types:
                fields['267'] = str(len(entry_types))  # NoMDEntryTypes
                for i, entry_type in enumerate(entry_types):
                    fields[f'269_{i}'] = entry_type  # MDEntryType

            # Add party information if provided
            if parties:
                fields['453'] = str(len(parties))  # NoPartyIDs
                for i, party in enumerate(parties):
                    fields[f'448_{i}'] = party['id']  # PartyID
                    fields[f'447_{i}'] = party['source']  # PartyIDSource
                    fields[f'452_{i}'] = party['role']  # PartyRole

            # Add requested sizes if provided (for full amount subscriptions)
            if requested_sizes:
                fields['9000'] = str(len(requested_sizes))  # NoRequestedSize
                for i, size in enumerate(requested_sizes):
                    fields[f'9001_{i}'] = str(size)  # RequestedSize

            self.fix_conn.send_message('V', fields)  # MarketDataRequest
            self.active_subscriptions[md_req_id] = {
                'symbol': symbol,
                'subscription_type': subscription_type
            }
            logging.info(f"Market data subscription request sent for {symbol}")
            return md_req_id

        except Exception as e:
            logging.error(f"Failed to subscribe to market data: {e}")
            raise

    def unsubscribe_market_data(self, md_req_id):
        """Unsubscribe from market data for a specific subscription"""
        try:
            if md_req_id in self.active_subscriptions:
                symbol = self.active_subscriptions[md_req_id]['symbol']
                fields = {
                    '262': md_req_id,  # MDReqID
                    '263': '2',  # SubscriptionRequestType = Unsubscribe
                    '146': '1',  # NoRelatedSym
                    '55': symbol,  # Symbol
                }
                self.fix_conn.send_message('V', fields)  # MarketDataRequest
                del self.active_subscriptions[md_req_id]
                logging.info(f"Market data unsubscribe request sent for {symbol}")
            else:
                logging.warning(f"No active subscription found for MDReqID: {md_req_id}")

        except Exception as e:
            logging.error(f"Failed to unsubscribe from market data: {e}")
            raise

    def subscribe_full_amount(self, symbol, quantities, settl_type=None, settl_date=None):
        """Subscribe to full amount market data with specific quantities"""
        try:
            return self.subscribe_market_data(
                symbol=symbol,
                subscription_type='1',
                settl_type=settl_type,
                settl_date=settl_date,
                requested_sizes=quantities
            )

        except Exception as e:
            logging.error(f"Failed to subscribe to full amount market data: {e}")
            raise

    def subscribe_passthrough(self, symbol, market_depth=5, settl_type=None, settl_date=None):
        """Subscribe to passthrough market data with specified depth"""
        try:
            return self.subscribe_market_data(
                symbol=symbol,
                subscription_type='1',
                market_depth=market_depth,
                settl_type=settl_type,
                settl_date=settl_date
            )

        except Exception as e:
            logging.error(f"Failed to subscribe to passthrough market data: {e}")
            raise

    def subscribe_limit_order(self, symbol, market_depth=5, settl_type=None, settl_date=None):
        """Subscribe to limit order market data"""
        try:
            fields = {
                '40': '2',  # OrdType = Limit
            }
            return self.subscribe_market_data(
                symbol=symbol,
                subscription_type='1',
                market_depth=market_depth,
                settl_type=settl_type,
                settl_date=settl_date,
                **fields
            )

        except Exception as e:
            logging.error(f"Failed to subscribe to limit order market data: {e}")
            raise

# Example usage
if __name__ == "__main__":
    fix_conn = FIXConnection(
        host='fixapi-nysim1.fxspotstream.com',
        port=9110,
        sender_comp_id='TRD.NY.SIM.GZC.1',
        target_comp_id='FSS'
    )
    
    md_handler = MarketDataHandler(fix_conn)
    fix_conn.connect()
    
    # Subscribe to different types of market data
    md_handler.subscribe_full_amount('EUR/USD', [1000000, 2000000])
    md_handler.subscribe_passthrough('GBP/USD', market_depth=10)
    md_handler.subscribe_limit_order('USD/JPY', market_depth=5)
    
    fix_conn.disconnect()
