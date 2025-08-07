import socket
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class MarketDataSubscription:
    def __init__(self, host, port, sender_comp_id, target_comp_id):
        self.host = host
        self.port = port
        self.sender_comp_id = sender_comp_id
        self.target_comp_id = target_comp_id
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    def connect(self):
        try:
            self.sock.connect((self.host, self.port))
            logging.info("Connected to FIX server for market data")
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

    def subscribe_market_data(self, symbol, market_depth=1):
        md_request = (
            f"8=FIX.4.4|9=112|35=V|49={self.sender_comp_id}|56={self.target_comp_id}|"
            f"262=MDReqID|263=1|264={market_depth}|146=1|55={symbol}|10=000|"
        )
        self.send_message(md_request)

    def receive_market_data(self):
        try:
            while True:
                response = self.sock.recv(4096).decode()
                if response:
                    logging.info(f"Received: {response}")
                else:
                    break
        except Exception as e:
            logging.error(f"Failed to receive market data: {e}")

# Example usage
if __name__ == "__main__":
    md_subscription = MarketDataSubscription(
        host=os.getenv('FIX_SOCKET_HOST', 'fixapi-nysim1.fxspotstream.com'),
        port=int(os.getenv('FIX_STREAMING_PORT', 9100)),
        sender_comp_id=os.getenv('FIX_SENDER_COMP_ID', 'TRD.NY.SIM.GZC.1'),
        target_comp_id=os.getenv('FIX_TARGET_COMP_ID', 'FSS')
    )
    md_subscription.connect()
    md_subscription.subscribe_market_data(symbol='EUR/USD')
    md_subscription.receive_market_data()
    md_subscription.disconnect()
