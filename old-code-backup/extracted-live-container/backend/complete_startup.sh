#!/bin/bash
echo "=== COMPLETE FSS FIX DEPLOYMENT ==="
echo "Verifying ESP controllers:"
echo "1. /app/app/controllers/esp_controller.py:"
grep -n "FSS FIX VERSION" /app/app/controllers/esp_controller.py | head -1
echo "2. /app/backend/app/controllers/esp_controller.py:"
grep -n "FSS FIX VERSION" /app/backend/app/controllers/esp_controller.py | head -1
echo "Verifying RFS controllers:"
echo "3. /app/app/controllers/rfs_controller.py:"
grep -n "RFS FIX VERSION" /app/app/controllers/rfs_controller.py | head -1
echo "4. /app/backend/app/controllers/rfs_controller.py:"
grep -n "RFS FIX VERSION" /app/backend/app/controllers/rfs_controller.py | head -1
echo "Checking for old code:"
grep -r "Connected to.*price feed" /app/backend/app/controllers/ && echo "ERROR: Old code found!" || echo "✅ All old code removed"
echo "====================================="
exec "$@"
