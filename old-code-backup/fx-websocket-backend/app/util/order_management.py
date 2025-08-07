import logging
from datetime import datetime
from app.util.fix_connection import FIXConnection

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class OrderManagement:
    def __init__(self, fix_connection: FIXConnection):
        """Initialize OrderManagement with a FIX connection"""
        self.fix_conn = fix_connection
        self.active_orders = {}

    def submit_order(self, symbol, side, order_type, quantity, price=None, settl_type=None, 
                    settl_date=None, time_in_force='1', exec_inst=None):
        """Submit a new order"""
        try:
            cl_ord_id = f"ORD_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}"
            
            fields = {
                '11': cl_ord_id,  # ClOrdID
                '55': symbol,  # Symbol
                '54': side,  # Side
                '38': str(quantity),  # OrderQty
                '40': order_type,  # OrdType
                '59': time_in_force,  # TimeInForce
            }

            # Add optional fields if provided
            if price is not None:
                fields['44'] = str(price)  # Price
            
            if settl_type:
                fields['63'] = settl_type  # SettlType
            
            if settl_date:
                fields['64'] = settl_date  # SettlDate
            
            if exec_inst:
                fields['18'] = exec_inst  # ExecInst

            # Send the order
            self.fix_conn.send_message('D', fields)  # NewOrderSingle
            
            # Store order details
            self.active_orders[cl_ord_id] = {
                'symbol': symbol,
                'side': side,
                'quantity': quantity,
                'order_type': order_type,
                'price': price,
                'status': 'PENDING_NEW'
            }
            
            logging.info(f"Order submitted - ID: {cl_ord_id}, Symbol: {symbol}, Side: {side}, Quantity: {quantity}")
            return cl_ord_id

        except Exception as e:
            logging.error(f"Failed to submit order: {e}")
            raise

    def cancel_order(self, cl_ord_id):
        """Cancel an existing order"""
        try:
            if cl_ord_id not in self.active_orders:
                raise ValueError(f"Order not found: {cl_ord_id}")

            order = self.active_orders[cl_ord_id]
            fields = {
                '11': f"CXLR_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",  # ClOrdID
                '41': cl_ord_id,  # OrigClOrdID
                '55': order['symbol'],  # Symbol
                '54': order['side'],  # Side
                '38': str(order['quantity']),  # OrderQty
            }

            self.fix_conn.send_message('F', fields)  # OrderCancelRequest
            logging.info(f"Cancel request sent for order: {cl_ord_id}")

        except Exception as e:
            logging.error(f"Failed to cancel order: {e}")
            raise

    def handle_execution_report(self, exec_report):
        """Handle execution report messages"""
        try:
            cl_ord_id = exec_report.get('11')  # ClOrdID
            if cl_ord_id in self.active_orders:
                order = self.active_orders[cl_ord_id]
                
                # Update order status
                order['status'] = exec_report.get('39')  # OrdStatus
                
                # Handle fills
                if exec_report.get('150') in ['1', '2']:  # ExecType: Partial Fill or Fill
                    order['filled_quantity'] = exec_report.get('14')  # CumQty
                    order['average_price'] = exec_report.get('6')  # AvgPx
                
                logging.info(f"Order {cl_ord_id} status updated: {order['status']}")
                
                # Remove completed orders from active orders
                if order['status'] in ['2', '4', '8', 'C']:  # Filled, Canceled, Rejected, Expired
                    del self.active_orders[cl_ord_id]

        except Exception as e:
            logging.error(f"Failed to handle execution report: {e}")
            raise

    def get_order_status(self, cl_ord_id):
        """Get current status of an order"""
        return self.active_orders.get(cl_ord_id, {}).get('status')

# Example usage
if __name__ == "__main__":
    # Create FIX connection
    fix_conn = FIXConnection(
        host='fixapi-nysim1.fxspotstream.com',
        port=9110,
        sender_comp_id='TRD.NY.SIM.GZC.1',
        target_comp_id='FSS'
    )
    
    # Create order manager
    order_mgmt = OrderManagement(fix_conn)
    
    try:
        # Connect to FIX server
        fix_conn.connect()
        
        # Submit a market order
        order_id = order_mgmt.submit_order(
            symbol='EUR/USD',
            side='1',  # Buy
            order_type='1',  # Market
            quantity=1000000
        )
        
        # Submit a limit order
        limit_order_id = order_mgmt.submit_order(
            symbol='GBP/USD',
            side='2',  # Sell
            order_type='2',  # Limit
            quantity=1000000,
            price=1.2500
        )
        
        # Cleanup
        fix_conn.disconnect()
        
    except Exception as e:
        logging.error(f"Error in order management test: {e}")
        fix_conn.reset()
