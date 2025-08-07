import unittest
import asyncio
import logging
import pytest
from datetime import datetime
from unittest.mock import Mock, patch

from app.util.fix_connection import FIXConnection
from app.util.fix_message_parser import FIXMessageParser
from app.util.market_data_handler import MarketDataHandler
from app.util.order_management import OrderManagement
from app.tests.test_config import TestConfig

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class TestFIXConnection(unittest.TestCase):
    def setUp(self):
        settings = TestConfig.get_fix_settings()
        self.fix_conn = FIXConnection(
            host=settings['host'],
            port=settings['port'],
            sender_comp_id=settings['sender_comp_id'],
            target_comp_id=settings['target_comp_id']
        )

    def test_message_construction(self):
        """Test FIX message construction"""
        message_type = 'D'  # NewOrderSingle
        fields = {
            '11': '12345',  # ClOrdID
            '55': 'EUR/USD',  # Symbol
            '54': '1',  # Side (Buy)
            '38': '1000000'  # OrderQty
        }
        message = self.fix_conn.construct_message(message_type, fields)
        
        # Verify message format
        self.assertIn('8=FIX.4.4', message)  # BeginString
        self.assertIn('35=D', message)  # MsgType
        self.assertIn('55=EUR/USD', message)  # Symbol

    @patch('socket.socket')
    def test_connection(self, mock_socket):
        """Test connection establishment"""
        self.fix_conn.connect()
        mock_socket.return_value.connect.assert_called_once()

class TestFIXMessageParser(unittest.TestCase):
    def setUp(self):
        self.parser = FIXMessageParser()

    def test_market_data_snapshot_parsing(self):
        """Test parsing market data snapshot messages"""
        message = (
            "8=FIX.4.4\x01" +
            "9=123\x01" +
            "35=W\x01" +
            "55=EUR/USD\x01" +
            "268=2\x01" +
            "269_0=0\x01" +
            "270_0=1.0750\x01" +
            "271_0=1000000\x01"
        )
        result = self.parser.parse_message(message)
        self.assertEqual(result['type'], 'market_data_snapshot')
        self.assertEqual(result['symbol'], 'EUR/USD')

    def test_execution_report_parsing(self):
        """Test parsing execution report messages"""
        message = (
            "8=FIX.4.4\x01" +
            "9=123\x01" +
            "35=8\x01" +
            "37=ORDER123\x01" +
            "17=EXEC123\x01" +
            "150=0\x01" +  # ExecType = New
            "39=0\x01"     # OrdStatus = New
        )
        result = self.parser.parse_message(message)
        self.assertEqual(result['type'], 'execution_report')
        self.assertEqual(result['order_id'], 'ORDER123')

class TestMarketDataHandler(unittest.TestCase):
    def setUp(self):
        settings = TestConfig.get_fix_settings()
        self.fix_conn = FIXConnection(
            host=settings['host'],
            port=settings['port'],
            sender_comp_id=settings['sender_comp_id'],
            target_comp_id=settings['target_comp_id']
        )
        self.md_handler = MarketDataHandler(self.fix_conn)

    def test_full_amount_subscription(self):
        """Test full amount market data subscription"""
        with patch.object(self.fix_conn, 'send_message') as mock_send:
            self.md_handler.subscribe_full_amount('EUR/USD', [1000000, 2000000])
            mock_send.assert_called_once()
            args = mock_send.call_args[0]
            self.assertEqual(args[0], 'V')  # MarketDataRequest

    def test_passthrough_subscription(self):
        """Test passthrough market data subscription"""
        with patch.object(self.fix_conn, 'send_message') as mock_send:
            self.md_handler.subscribe_passthrough('GBP/USD', market_depth=10)
            mock_send.assert_called_once()
            args = mock_send.call_args[0]
            self.assertEqual(args[0], 'V')  # MarketDataRequest

class TestOrderManagement(unittest.TestCase):
    def setUp(self):
        settings = TestConfig.get_fix_settings()
        self.fix_conn = FIXConnection(
            host=settings['host'],
            port=settings['port'],
            sender_comp_id=settings['sender_comp_id'],
            target_comp_id=settings['target_comp_id']
        )
        self.order_mgmt = OrderManagement(self.fix_conn)

    def test_market_order_submission(self):
        """Test market order submission"""
        with patch.object(self.fix_conn, 'send_message') as mock_send:
            self.order_mgmt.submit_order(
                symbol='EUR/USD',
                side='1',
                order_type='1',
                quantity=1000000
            )
            mock_send.assert_called_once()
            args = mock_send.call_args[0]
            self.assertEqual(args[0], 'D')  # NewOrderSingle

    def test_limit_order_submission(self):
        """Test limit order submission"""
        with patch.object(self.fix_conn, 'send_message') as mock_send:
            self.order_mgmt.submit_order(
                symbol='GBP/USD',
                side='2',
                order_type='2',
                quantity=1000000,
                price=1.2500
            )
            mock_send.assert_called_once()
            args = mock_send.call_args[0]
            self.assertEqual(args[0], 'D')  # NewOrderSingle

class TestIntegration:
    @pytest.fixture
    def fix_conn(self):
        settings = TestConfig.get_fix_settings()
        return FIXConnection(
            host=settings['host'],
            port=settings['port'],
            sender_comp_id=settings['sender_comp_id'],
            target_comp_id=settings['target_comp_id']
        )

    @pytest.mark.asyncio
    async def test_full_trading_flow(self, fix_conn):
        """Test complete trading flow"""
        with patch('socket.socket'):
            # Connect and logon
            fix_conn.connect()

            # Subscribe to market data
            md_handler = MarketDataHandler(fix_conn)
            md_req_id = md_handler.subscribe_full_amount('EUR/USD', [1000000])
            await asyncio.sleep(1)

            # Submit order
            order_mgmt = OrderManagement(fix_conn)
            order_id = order_mgmt.submit_order(
                symbol='EUR/USD',
                side='1',
                order_type='1',
                quantity=1000000
            )
            await asyncio.sleep(1)

            # Cleanup
            fix_conn.disconnect()

def run_tests():
    """Run all test cases"""
    pytest.main(['-v', 'app/tests/test_framework.py'])

if __name__ == '__main__':
    run_tests()
