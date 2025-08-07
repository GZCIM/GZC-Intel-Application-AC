import os
from dotenv import load_dotenv

# import sys
from app import create_app
from app.util.logging_util import setup_logging

# sys.path.append(os.path.abspath(os.path.dirname(__file__)))
# Create the Flask application
setup_logging("log.cfg")
app, sock = create_app()
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)
if __name__ == "__main__":
    # Get configurations from environment variables
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", 5000))
    ssl_cert_path = os.getenv("SSL_CERT_PATH")
    ssl_key_path = os.getenv("SSL_KEY_PATH")

    # Print registered routes for verification
    # print("Registered routes:")
    # print(app.url_map)

    # Use SSL if certificates are provided
    if ssl_cert_path and ssl_key_path:
        print(f"Starting server with SSL on {host}:{port}")
        app.run(
            host=host,
            port=port,
            ssl_context=(ssl_cert_path, ssl_key_path),
        )
    else:
        print(f"Starting server without SSL on {host}:{port}")
        app.run(host=host, port=port)
