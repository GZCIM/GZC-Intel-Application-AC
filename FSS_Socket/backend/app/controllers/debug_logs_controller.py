import os
import json
from datetime import datetime
from flask import Blueprint, request, jsonify

debug_logs_bp = Blueprint('debug_logs', __name__)

# Create debug-logs directory in app writable location
LOG_DIR = os.path.join('/app', 'logs', 'debug-logs-live')
os.makedirs(LOG_DIR, exist_ok=True)

@debug_logs_bp.route('/api/debug-logs', methods=['POST'])
def save_debug_logs():
    """Save debug logs to workspace files"""
    try:
        data = request.json
        session_id = data.get('sessionId', 'unknown')
        logs = data.get('logs', [])
        timestamp = data.get('timestamp', datetime.now().isoformat())
        
        # Create filename with timestamp
        filename = f"debug-{session_id}-{timestamp.replace(':', '-').replace('.', '-')}.json"
        filepath = os.path.join(LOG_DIR, filename)
        
        # Write logs to file
        with open(filepath, 'w') as f:
            json.dump({
                'sessionId': session_id,
                'timestamp': timestamp,
                'logs': logs
            }, f, indent=2)
        
        # Also append to a daily log file
        daily_file = os.path.join(LOG_DIR, f"daily-{datetime.now().strftime('%Y-%m-%d')}.jsonl")
        with open(daily_file, 'a') as f:
            for log in logs:
                f.write(json.dumps({**log, 'sessionId': session_id}) + '\n')
        
        return jsonify({'status': 'success', 'file': filename}), 200
        
    except Exception as e:
        print(f"Error saving debug logs: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500