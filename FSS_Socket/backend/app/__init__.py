from flask import Flask
from flask_sock import Sock
from dotenv import load_dotenv
from flask_cors import CORS


def create_app():
    # Load environment variables
    load_dotenv()
    # Create Flask app
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "your-secret-key"
    CORS(app)

    # Initialize Sock
    sock = Sock(app)

    # Register Blueprints
    from .controllers.rfs_controller import fix_bp
    from .controllers.esp_controller import ws_bp
    from .controllers.trade_result_controller import tr_bp
    from .controllers.preferences_controller import preferences_bp
    from .controllers.debug_logs_controller import debug_logs_bp
    from .controllers.health_controller import health_bp

    app.register_blueprint(fix_bp)
    app.register_blueprint(ws_bp)
    app.register_blueprint(tr_bp)
    app.register_blueprint(preferences_bp)
    app.register_blueprint(debug_logs_bp)
    app.register_blueprint(health_bp)
    # app.register_blueprint(trade_esp)
    # app.register_blueprint(trade_rsf)

    return app, sock
