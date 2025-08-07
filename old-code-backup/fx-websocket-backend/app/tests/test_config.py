import os
from pathlib import Path

class TestConfig:
    # Base paths
    PROJECT_ROOT = Path(__file__).parent.parent.parent
    TEST_DIR = PROJECT_ROOT / 'app' / 'tests'
    REPORTS_DIR = TEST_DIR / 'reports'
    LOGS_DIR = TEST_DIR / 'logs'

    # Create necessary directories
    REPORTS_DIR.mkdir(exist_ok=True)
    LOGS_DIR.mkdir(exist_ok=True)

    # FIX connection settings
    FIX_SETTINGS = {
        'simulator': {
            'host': 'fixapi-nysim1.fxspotstream.com',
            'port': 9110,  # Changed from trading_port to port
            'sender_comp_id': 'TRD.NY.SIM.GZC.1',
            'target_comp_id': 'FSS'
        },
        'uat': {
            'host': os.getenv('FSS_UAT_HOST', 'fixapi-uat1.fxspotstream.com'),
            'port': int(os.getenv('FSS_UAT_PORT', 9110)),
            'sender_comp_id': os.getenv('FSS_UAT_SENDER_COMP_ID', ''),
            'target_comp_id': os.getenv('FSS_UAT_TARGET_COMP_ID', 'FSS')
        },
        'production': {
            'host': os.getenv('FSS_PROD_HOST', ''),
            'port': int(os.getenv('FSS_PROD_PORT', 9110)),
            'sender_comp_id': os.getenv('FSS_PROD_SENDER_COMP_ID', ''),
            'target_comp_id': os.getenv('FSS_PROD_TARGET_COMP_ID', 'FSS')
        }
    }

    # Market Data settings
    MARKET_DATA_SETTINGS = {
        'full_amount': {
            'requested_sizes': [1000000, 2000000, 5000000],
            'entry_types': ['0', '1'],  # Bid and Offer
            'update_type': 1  # Incremental
        },
        'passthrough': {
            'market_depth': 10,
            'entry_types': ['0', '1'],
            'update_type': 1
        },
        'limit_order': {
            'market_depth': 5,
            'entry_types': ['0', '1'],
            'update_type': 1
        }
    }

    # Test data
    TEST_SYMBOLS = [
        'EUR/USD',
        'GBP/USD',
        'USD/JPY',
        'USD/INR'  # For NDF testing
    ]

    TEST_QUANTITIES = [
        1000000,
        2000000,
        5000000
    ]

    TEST_PRICES = {
        'EUR/USD': 1.2345,
        'GBP/USD': 1.5678,
        'USD/JPY': 123.45,
        'USD/INR': 74.50
    }

    # Test timeouts (in seconds)
    TIMEOUTS = {
        'connection': 5,
        'market_data': 2,
        'order_response': 3,
        'integration_test': 10
    }

    # Test categories
    TEST_CATEGORIES = {
        'unit': [
            'TestFIXConnection',
            'TestFIXMessageParser',
            'TestMarketDataHandler',
            'TestOrderManagement',
            'TestAdvancedTrading'
        ],
        'integration': [
            'TestIntegration'
        ],
        'performance': [
            'TestMarketDataPerformance',
            'TestOrderPerformance'
        ]
    }

    # Reporting settings
    REPORT_SETTINGS = {
        'html': {
            'enabled': True,
            'template': TEST_DIR / 'templates' / 'report_template.html'
        },
        'junit': {
            'enabled': True,
            'output': REPORTS_DIR / 'junit_report.xml'
        },
        'logging': {
            'level': 'INFO',
            'format': '%(asctime)s - %(levelname)s - %(message)s',
            'file': LOGS_DIR / 'test_execution.log'
        }
    }

    # Performance thresholds
    PERFORMANCE_THRESHOLDS = {
        'market_data_latency': 0.1,  # seconds
        'order_submission_latency': 0.2,  # seconds
        'message_parsing': 0.001  # seconds
    }

    @classmethod
    def get_fix_settings(cls, environment='simulator'):
        """Get FIX connection settings for specified environment"""
        if environment not in cls.FIX_SETTINGS:
            raise ValueError(f"Unknown environment: {environment}")
        return cls.FIX_SETTINGS[environment]

    @classmethod
    def get_market_data_settings(cls, protocol):
        """Get market data settings for specified protocol"""
        if protocol not in cls.MARKET_DATA_SETTINGS:
            raise ValueError(f"Unknown protocol: {protocol}")
        return cls.MARKET_DATA_SETTINGS[protocol]

    @classmethod
    def get_test_symbol(cls):
        """Get a test symbol for basic testing"""
        return cls.TEST_SYMBOLS[0]

    @classmethod
    def get_test_quantity(cls):
        """Get a test quantity for basic testing"""
        return cls.TEST_QUANTITIES[0]

    @classmethod
    def get_test_price(cls, symbol):
        """Get a test price for the specified symbol"""
        return cls.TEST_PRICES.get(symbol, 1.0000)

    @classmethod
    def get_timeout(cls, operation):
        """Get timeout value for specified operation"""
        return cls.TIMEOUTS.get(operation, 5)

    @classmethod
    def get_test_categories(cls, category):
        """Get test classes for specified category"""
        return cls.TEST_CATEGORIES.get(category, [])

    @classmethod
    def get_performance_threshold(cls, operation):
        """Get performance threshold for specified operation"""
        return cls.PERFORMANCE_THRESHOLDS.get(operation, 1.0)

# Example usage
if __name__ == '__main__':
    # Print configuration for verification
    import json
    
    print("\nFIX Settings:")
    print(json.dumps(TestConfig.FIX_SETTINGS, indent=2))
    
    print("\nMarket Data Settings:")
    print(json.dumps(TestConfig.MARKET_DATA_SETTINGS, indent=2))
    
    print("\nTest Categories:")
    print(json.dumps(TestConfig.TEST_CATEGORIES, indent=2))
