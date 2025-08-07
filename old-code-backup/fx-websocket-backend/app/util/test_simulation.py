import logging
import asyncio
from datetime import datetime
from fix_connection import FIXConnection
from fix_message_parser import FIXMessageParser
from market_data_handler import MarketDataHandler
from order_management import OrderManagement
from advanced_trading import AdvancedTrading

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class FSSSimulation:
    def __init__(self):
        # Initialize FIX connection
        self.fix_conn = FIXConnection(
            host='fixapi-nysim1.fxspotstream.com',
            port=9110,
            sender_comp_id='TRD.NY.SIM.GZC.1',
            target_comp_id='FSS'
        )
        
        # Initialize components
        self.parser = FIXMessageParser()
        self.md_handler = MarketDataHandler(self.fix_conn)
        self.order_mgmt = OrderManagement(self.fix_conn)
        self.adv_trading = AdvancedTrading(
            host='fixapi-nysim1.fxspotstream.com',
            port=9110,
            sender_comp_id='TRD.NY.SIM.GZC.1',
            target_comp_id='FSS'
        )

    async def test_market_data_subscription(self):
        """Test market data subscription functionality"""
        logging.info("Testing Market Data Subscription")
        
        # Test Full Amount subscription
        md_req_id = self.md_handler.subscribe_full_amount(
            symbol='EUR/USD',
            quantities=[1000000, 2000000]
        )
        logging.info(f"Full Amount subscription request ID: {md_req_id}")
        await asyncio.sleep(2)  # Wait for market data

        # Test Passthrough subscription
        md_req_id = self.md_handler.subscribe_passthrough(
            symbol='GBP/USD',
            market_depth=10
        )
        logging.info(f"Passthrough subscription request ID: {md_req_id}")
        await asyncio.sleep(2)

        # Test Limit Order subscription
        md_req_id = self.md_handler.subscribe_limit_order(
            symbol='USD/JPY',
            market_depth=5
        )
        logging.info(f"Limit Order subscription request ID: {md_req_id}")
        await asyncio.sleep(2)

    async def test_order_management(self):
        """Test order management functionality"""
        logging.info("Testing Order Management")
        
        # Test market order
        order_id = self.order_mgmt.submit_order(
            symbol='EUR/USD',
            side='1',  # Buy
            order_type='1',  # Market
            quantity=1000000
        )
        logging.info(f"Market order submitted: {order_id}")
        await asyncio.sleep(2)

        # Test limit order
        order_id = self.order_mgmt.submit_order(
            symbol='GBP/USD',
            side='2',  # Sell
            order_type='2',  # Limit
            quantity=1000000,
            price=1.2500
        )
        logging.info(f"Limit order submitted: {order_id}")
        await asyncio.sleep(2)

    async def test_advanced_trading(self):
        """Test advanced trading functionality"""
        logging.info("Testing Advanced Trading")
        
        # Test broken date trading
        self.adv_trading.trade_broken_date(
            cl_ord_id='12347',
            symbol='EUR/USD',
            side='1',
            order_qty='1000000',
            price='1.2345',
            settl_date='20240220'
        )
        await asyncio.sleep(2)

        # Test NDF trading
        self.adv_trading.trade_ndf(
            cl_ord_id='12348',
            symbol='USD/INR',
            side='2',
            order_qty='1000000',
            price='74.50',
            fixing_date='20240225'
        )
        await asyncio.sleep(2)

    async def run_simulation(self):
        """Run the complete simulation"""
        try:
            # Connect to FIX server
            self.fix_conn.connect()
            logging.info("Connected to FIX server")

            # Run tests
            await self.test_market_data_subscription()
            await self.test_order_management()
            await self.test_advanced_trading()

            # Cleanup
            self.fix_conn.disconnect()
            logging.info("Disconnected from FIX server")

        except Exception as e:
            logging.error(f"Simulation failed: {e}")
            raise

async def main():
    simulation = FSSSimulation()
    await simulation.run_simulation()

if __name__ == "__main__":
    # Run the simulation
    asyncio.run(main())
