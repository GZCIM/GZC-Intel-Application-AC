import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class FIXMessageParser:
    def __init__(self):
        self.message_handlers = {
            'W': self.handle_market_data_snapshot,
            'X': self.handle_market_data_incremental,
            'Y': self.handle_market_data_request_reject,
            '8': self.handle_execution_report,
            '3': self.handle_reject,
            '0': self.handle_heartbeat,
            '1': self.handle_test_request,
            '2': self.handle_resend_request,
            '4': self.handle_sequence_reset,
            '5': self.handle_logout
        }

    def parse_message(self, raw_message):
        """Parse a raw FIX message into a dictionary of fields"""
        try:
            fields = {}
            pairs = raw_message.split('\x01')
            
            for pair in pairs:
                if '=' not in pair:
                    continue
                tag, value = pair.split('=', 1)
                fields[tag] = value

            # Get message type
            msg_type = fields.get('35')
            if msg_type in self.message_handlers:
                return self.message_handlers[msg_type](fields)
            else:
                logging.warning(f"Unhandled message type: {msg_type}")
                return fields

        except Exception as e:
            logging.error(f"Error parsing FIX message: {e}")
            raise

    def handle_market_data_snapshot(self, fields):
        """Handle MarketDataSnapshotFullRefresh (35=W) messages"""
        try:
            entries = []
            num_entries = int(fields.get('268', 0))  # NoMDEntries
            
            # Extract repeating group entries
            for i in range(num_entries):
                entry = {
                    'entry_type': fields.get(f'269_{i}'),  # MDEntryType
                    'price': fields.get(f'270_{i}'),       # MDEntryPx
                    'size': fields.get(f'271_{i}'),        # MDEntrySize
                    'entry_id': fields.get(f'278_{i}'),    # MDEntryID
                    'entry_time': fields.get(f'273_{i}'),  # MDEntryTime
                    'entry_originator': fields.get(f'282_{i}')  # MDEntryOriginator
                }
                entries.append(entry)

            return {
                'type': 'market_data_snapshot',
                'symbol': fields.get('55'),
                'req_id': fields.get('262'),
                'entries': entries,
                'settl_type': fields.get('63'),
                'settl_date': fields.get('64'),
                'raw_fields': fields
            }

        except Exception as e:
            logging.error(f"Error handling market data snapshot: {e}")
            raise

    def handle_market_data_incremental(self, fields):
        """Handle MarketDataIncrementalRefresh (35=X) messages"""
        try:
            updates = []
            num_entries = int(fields.get('268', 0))  # NoMDEntries
            
            # Extract repeating group entries
            for i in range(num_entries):
                update = {
                    'entry_type': fields.get(f'269_{i}'),     # MDEntryType
                    'update_action': fields.get(f'279_{i}'),  # MDUpdateAction
                    'entry_ref_id': fields.get(f'280_{i}'),   # MDEntryRefID
                    'price': fields.get(f'270_{i}'),          # MDEntryPx
                    'size': fields.get(f'271_{i}'),           # MDEntrySize
                    'entry_time': fields.get(f'273_{i}')      # MDEntryTime
                }
                updates.append(update)

            return {
                'type': 'market_data_incremental',
                'symbol': fields.get('55'),
                'req_id': fields.get('262'),
                'updates': updates,
                'raw_fields': fields
            }

        except Exception as e:
            logging.error(f"Error handling incremental market data: {e}")
            raise

    def handle_market_data_request_reject(self, fields):
        """Handle MarketDataRequestReject (35=Y) messages"""
        return {
            'type': 'market_data_reject',
            'req_id': fields.get('262'),
            'reject_reason': fields.get('281'),
            'raw_fields': fields
        }

    def handle_execution_report(self, fields):
        """Handle ExecutionReport (35=8) messages"""
        return {
            'type': 'execution_report',
            'order_id': fields.get('37'),
            'exec_id': fields.get('17'),
            'exec_type': fields.get('150'),
            'ord_status': fields.get('39'),
            'symbol': fields.get('55'),
            'side': fields.get('54'),
            'leaves_qty': fields.get('151'),
            'cum_qty': fields.get('14'),
            'avg_px': fields.get('6'),
            'raw_fields': fields
        }

    def handle_reject(self, fields):
        """Handle Reject (35=3) messages"""
        return {
            'type': 'reject',
            'ref_seq_num': fields.get('45'),
            'ref_tag_id': fields.get('371'),
            'ref_msg_type': fields.get('372'),
            'reject_reason': fields.get('373'),
            'raw_fields': fields
        }

    def handle_heartbeat(self, fields):
        """Handle Heartbeat (35=0) messages"""
        return {
            'type': 'heartbeat',
            'test_req_id': fields.get('112'),
            'raw_fields': fields
        }

    def handle_test_request(self, fields):
        """Handle TestRequest (35=1) messages"""
        return {
            'type': 'test_request',
            'test_req_id': fields.get('112'),
            'raw_fields': fields
        }

    def handle_resend_request(self, fields):
        """Handle ResendRequest (35=2) messages"""
        return {
            'type': 'resend_request',
            'begin_seq_no': fields.get('7'),
            'end_seq_no': fields.get('16'),
            'raw_fields': fields
        }

    def handle_sequence_reset(self, fields):
        """Handle SequenceReset (35=4) messages"""
        return {
            'type': 'sequence_reset',
            'gap_fill_flag': fields.get('123'),
            'new_seq_no': fields.get('36'),
            'raw_fields': fields
        }

    def handle_logout(self, fields):
        """Handle Logout (35=5) messages"""
        return {
            'type': 'logout',
            'text': fields.get('58'),
            'raw_fields': fields
        }

# Example usage
if __name__ == "__main__":
    parser = FIXMessageParser()
    
    # Example market data snapshot message
    sample_message = (
        "8=FIX.4.4\x01" +
        "9=123\x01" +
        "35=W\x01" +  # MarketDataSnapshotFullRefresh
        "49=FSS\x01" +
        "56=CLIENT\x01" +
        "34=2\x01" +
        "52=20240220-12:00:00\x01" +
        "55=EUR/USD\x01" +
        "262=REQ123\x01" +
        "268=2\x01" +  # NoMDEntries
        "269_0=0\x01" +  # MDEntryType (Bid)
        "270_0=1.0750\x01" +  # MDEntryPx
        "271_0=1000000\x01" +  # MDEntrySize
        "269_1=1\x01" +  # MDEntryType (Offer)
        "270_1=1.0752\x01" +  # MDEntryPx
        "271_1=1000000\x01" +  # MDEntrySize
        "10=000\x01"
    )
    
    parsed = parser.parse_message(sample_message)
    logging.info(f"Parsed message: {parsed}")
