import socket
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class FIXSession:
    def __init__(self, host, port, sender_comp_id, target_comp_id):
        self.host = host
        self.port = port
        self.sender_comp_id = sender_comp_id
        self.target_comp_id = target_comp_id
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    def connect(self):
        try:
            self.sock.connect((self.host, self.port))
            logging.info("Connected to FIX server")
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

    def logon(self, heartbeat_interval=30, reset_seq_num_flag='Y'):
        logon_message = (
            f"8=FIX.4.4|9=93|35=A|34=1|49={self.sender_comp_id}|56={self.target_comp_id}|"
            f"98=0|108={heartbeat_interval}|141={reset_seq_num_flag}|10=000|"
        )
        self.send_message(logon_message)

    def logout(self):
        logout_message = f"8=FIX.4.4|9=57|35=5|49={self.sender_comp_id}|56={self.target_comp_id}|10=000|"
        self.send_message(logout_message)

# Example usage
if __name__ == "__main__":
    fix_session = FIXSession(
        host=os.getenv('FIX_SOCKET_HOST', 'fixapi-nysim1.fxspotstream.com'),
        port=int(os.getenv('FIX_TRADING_PORT', 9110)),
        sender_comp_id=os.getenv('FIX_SENDER_COMP_ID', 'TRD.NY.SIM.GZC.1'),
        target_comp_id=os.getenv('FIX_TARGET_COMP_ID', 'FSS')
    )
    fix_session.connect()
    fix_session.logon()
    # Perform trading operations here
    fix_session.logout()
    fix_session.disconnect()
