import socket
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class AdvancedTrading:
    def __init__(self, host, port, sender_comp_id, target_comp_id):
        self.host = host
        self.port = port
        self.sender_comp_id = sender_comp_id
        self.target_comp_id = target_comp_id
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    def connect(self):
        try:
            self.sock.connect((self.host, self.port))
            logging.info("Connected to FIX server for advanced trading")
        except Exception as e:
            logging.error(f"Failed to connect to FIX server: {e}")

    def disconnect(self):
        try:
            self.sock.close()
            logging.info("Disconnected from FIX server")
        except Exception as e:
            logging.error(f"Failed to disconnect from FIX server: {e}")

    def send_message(self, message):
        try:
            self.sock.sendall(message.encode())
            logging.info(f"Sent: {message}")
        except Exception as e:
            logging.error(f"Failed to send message: {e}")

    def trade_broken_date(self, cl_ord_id, symbol, side, order_qty, price, settl_date):
        broken_date_order = (
            f"8=FIX.4.4|9=178|35=D|49={self.sender_comp_id}|56={self.target_comp_id}|"
            f"11={cl_ord_id}|55={symbol}|54={side}|38={order_qty}|44={price}|63=B|64={settl_date}|10=000|"
        )
        self.send_message(broken_date_order)

    def trade_ndf(self, cl_ord_id, symbol, side, order_qty, price, fixing_date):
        ndf_order = (
            f"8=FIX.4.4|9=178|35=D|49={self.sender_comp_id}|56={self.target_comp_id}|"
            f"11={cl_ord_id}|55={symbol}|54={side}|38={order_qty}|44={price}|167=FXNDF|6203={fixing_date}|10=000|"
        )
        self.send_message(ndf_order)

# Example usage
if __name__ == "__main__":
    adv_trading = AdvancedTrading(
        host=os.getenv('FIX_SOCKET_HOST', 'fixapi-nysim1.fxspotstream.com'),
        port=int(os.getenv('FIX_TRADING_PORT', 9110)),
        sender_comp_id=os.getenv('FIX_SENDER_COMP_ID', 'TRD.NY.SIM.GZC.1'),
        target_comp_id=os.getenv('FIX_TARGET_COMP_ID', 'FSS')
    )
    adv_trading.connect()
    adv_trading.trade_broken_date(cl_ord_id='12347', symbol='EUR/USD', side='1', order_qty='1000', price='1.2345', settl_date='20240220')
    adv_trading.trade_ndf(cl_ord_id='12348', symbol='USD/INR', side='2', order_qty='1000', price='74.50', fixing_date='20240225')
    adv_trading.disconnect()
