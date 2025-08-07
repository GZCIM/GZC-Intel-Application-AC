import websocket
import threading
import time
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class WebSocketClient:
    def __init__(self, url):
        self.url = url
        self.ws = None

    def on_message(self, message):
        logging.info(f"Received message: {message}")

    def on_error(self, error):
        logging.error(f"Error: {error}")

    def on_close(self):
        logging.info("WebSocket closed")

    def on_open(self):
        def run():
            for i in range(3):
                time.sleep(1)
                self.ws.send(f"Hello {i}")
            time.sleep(1)
            self.ws.close()
            logging.info("Thread terminating...")
        threading.Thread(target=run).start()

    def connect(self):
        try:
            self.ws = websocket.WebSocketApp(self.url,
                                             on_message=self.on_message,
                                             on_error=self.on_error,
                                             on_close=self.on_close)
            self.ws.on_open = self.on_open
            self.ws.run_forever()
        except Exception as e:
            logging.error(f"Failed to connect to WebSocket server: {e}")

# Example usage
if __name__ == "__main__":
    ws_client = WebSocketClient(os.getenv('WEBSOCKET_URL', 'ws://echo.websocket.org/'))
    ws_client.connect()
