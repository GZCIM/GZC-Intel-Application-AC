import unittest
import asyncio
import time
import statistics
from datetime import datetime
from unittest.mock import Mock, patch

from app.tests.test_config import TestConfig
from app.util.fix_connection import FIXConnection
from app.util.market_data_handler import MarketDataHandler
from app.util.order_management import OrderManagement
from app.util.fix_message_parser import FIXMessageParser

class TestMarketDataPerformance(unittest.TestCase):
    def setUp(self):
        self.fix_conn = FIXConnection(**TestConfig.get_fix_settings())
        self.md_handler = MarketDataHandler(self.fix_conn)
        self.parser = FIXMessageParser()
        self.latencies = []

    def measure_latency(self, operation, *args, **kwargs):
        """Measure operation latency"""
        start_time = time.perf_counter()
        result = operation(*args, **kwargs)
        end_time = time.perf_counter()
        latency = end_time - start_time
        self.latencies.append(latency)
        return result, latency

    @patch('socket.socket')
    def test_market_data_subscription_latency(self, mock_socket):
        """Test market data subscription latency"""
        threshold = TestConfig.get_performance_threshold('market_data_latency')
        symbol = TestConfig.get_test_symbol()
        
        # Perform multiple subscription tests
        for _ in range(100):
            _, latency = self.measure_latency(
                self.md_handler.subscribe_full_amount,
                symbol,
                TestConfig.TEST_QUANTITIES
            )
            self.assertLess(latency, threshold)

        # Calculate statistics
        avg_latency = statistics.mean(self.latencies)
        p95_latency = statistics.quantiles(self.latencies, n=20)[18]  # 95th percentile
        
        print(f"\nMarket Data Subscription Performance:")
        print(f"Average Latency: {avg_latency:.6f} seconds")
        print(f"95th Percentile Latency: {p95_latency:.6f} seconds")
        print(f"Threshold: {threshold:.6f} seconds")

class TestOrderPerformance(unittest.TestCase):
    def setUp(self):
        self.fix_conn = FIXConnection(**TestConfig.get_fix_settings())
        self.order_mgmt = OrderManagement(self.fix_conn)
        self.latencies = []

    def measure_latency(self, operation, *args, **kwargs):
        """Measure operation latency"""
        start_time = time.perf_counter()
        result = operation(*args, **kwargs)
        end_time = time.perf_counter()
        latency = end_time - start_time
        self.latencies.append(latency)
        return result, latency

    @patch('socket.socket')
    def test_order_submission_latency(self, mock_socket):
        """Test order submission latency"""
        threshold = TestConfig.get_performance_threshold('order_submission_latency')
        symbol = TestConfig.get_test_symbol()
        
        # Perform multiple order submissions
        for _ in range(100):
            _, latency = self.measure_latency(
                self.order_mgmt.submit_order,
                symbol=symbol,
                side='1',
                order_type='1',
                quantity=TestConfig.get_test_quantity()
            )
            self.assertLess(latency, threshold)

        # Calculate statistics
        avg_latency = statistics.mean(self.latencies)
        p95_latency = statistics.quantiles(self.latencies, n=20)[18]  # 95th percentile
        
        print(f"\nOrder Submission Performance:")
        print(f"Average Latency: {avg_latency:.6f} seconds")
        print(f"95th Percentile Latency: {p95_latency:.6f} seconds")
        print(f"Threshold: {threshold:.6f} seconds")

class TestMessageParsingPerformance(unittest.TestCase):
    def setUp(self):
        self.parser = FIXMessageParser()
        self.latencies = []

    def measure_latency(self, operation, *args, **kwargs):
        """Measure operation latency"""
        start_time = time.perf_counter()
        result = operation(*args, **kwargs)
        end_time = time.perf_counter()
        latency = end_time - start_time
        self.latencies.append(latency)
        return result, latency

    def test_message_parsing_latency(self):
        """Test message parsing latency"""
        threshold = TestConfig.get_performance_threshold('message_parsing')
        
        # Sample market data message
        message = (
            "8=FIX.4.4\x01" +
            "9=123\x01" +
            "35=W\x01" +
            "49=FSS\x01" +
            "56=CLIENT\x01" +
            "34=2\x01" +
            "52=20240220-12:00:00\x01" +
            "55=EUR/USD\x01" +
            "262=REQ123\x01" +
            "268=2\x01" +
            "269_0=0\x01" +
            "270_0=1.0750\x01" +
            "271_0=1000000\x01" +
            "269_1=1\x01" +
            "270_1=1.0752\x01" +
            "271_1=1000000\x01" +
            "10=000\x01"
        )
        
        # Perform multiple parsing tests
        for _ in range(1000):
            _, latency = self.measure_latency(
                self.parser.parse_message,
                message
            )
            self.assertLess(latency, threshold)

        # Calculate statistics
        avg_latency = statistics.mean(self.latencies)
        p95_latency = statistics.quantiles(self.latencies, n=20)[18]  # 95th percentile
        
        print(f"\nMessage Parsing Performance:")
        print(f"Average Latency: {avg_latency:.6f} seconds")
        print(f"95th Percentile Latency: {p95_latency:.6f} seconds")
        print(f"Threshold: {threshold:.6f} seconds")

def run_performance_tests():
    """Run all performance tests"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add performance test cases
    suite.addTests(loader.loadTestsFromTestCase(TestMarketDataPerformance))
    suite.addTests(loader.loadTestsFromTestCase(TestOrderPerformance))
    suite.addTests(loader.loadTestsFromTestCase(TestMessageParsingPerformance))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    return runner.run(suite)

if __name__ == '__main__':
    run_performance_tests()
