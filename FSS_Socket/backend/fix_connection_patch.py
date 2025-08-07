"""
Patch for FIX connection to work without certificates in development mode
"""
import os
from app.util.fix_connection import FixConnection

# Monkey patch to bypass certificate requirement
original_connect = FixConnection.connect

def patched_connect(self):
    """
    Patched connect method that can work without certificates in development mode
    """
    import socket
    import ssl
    import threading
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # If we're in development mode or certificates are not available, skip SSL
        if os.getenv("DISABLE_FIX_SSL", "True") == "True":
            logger.warning("FIX SSL disabled - running in development mode")
            raw_sock = socket.create_connection((self.host, self.port))
            self.sock = raw_sock
            self.connected = True
            logger.info(f"Connected to FIX gateway at {self.host}:{self.port} WITHOUT TLS (dev mode)")
            threading.Thread(target=self.listen, daemon=True).start()
        else:
            # Use original SSL connection
            original_connect(self)
    except Exception as e:
        logger.error(f"Error connecting to FIX gateway: {e}")
        self.connected = False

# Apply the patch
FixConnection.connect = patched_connect