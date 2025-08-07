"""
Flask application factory and Socket.IO initialization
"""
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
import os

# Initialize Socket.IO globally
socketio = SocketIO(cors_allowed_origins="*", async_mode='gevent')

def create_app(config_name=None):
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Enable CORS
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Import and register blueprints
    from app.controllers.websocket_controller import ws_bp
    from app.controllers.fix_controller import fix_bp
    
    app.register_blueprint(ws_bp)
    app.register_blueprint(fix_bp, url_prefix='/api/fix')
    
    # Initialize Socket.IO with the app
    socketio.init_app(app)
    
    # Add a simple health check endpoint
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'service': 'fx-websocket-backend'}
    
    return app