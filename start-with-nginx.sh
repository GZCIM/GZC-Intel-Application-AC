#\!/bin/bash

# Kill any existing processes
echo "Stopping existing services..."
lsof -ti:5100 | xargs kill -9 2>/dev/null
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Start backend
echo "Starting backend on port 5100..."
cd app/backend
source venv/bin/activate
python3.12 run.py > ../../backend-server.log 2>&1 &
BACKEND_PID=$\!
cd ../..

# Wait for backend to start
sleep 3

# Start nginx to serve frontend and proxy WebSocket
echo "Starting nginx on port 8080..."
cat > nginx-temp.conf << 'NGINX'
events {
    worker_connections 1024;
}

http {
    include /usr/local/etc/nginx/mime.types;
    
    upstream backend {
        server localhost:5100;
    }
    
    server {
        listen 8080;
        
        location / {
            root /Users/mikaeleage/Projects Container/GZC Intel Application AC/frontend;
            try_files \$uri \$uri/ /index.html;
        }
        
        location ~ ^/ws_(esp|rfs|execution)$ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_read_timeout 86400;
        }
        
        location /api/ {
            proxy_pass http://backend;
        }
    }
}
NGINX

nginx -c "$(pwd)/nginx-temp.conf" -p "$(pwd)"

echo "Services started\!"
echo "Frontend: http://localhost:8080"
echo "Backend WebSocket: ws://localhost:8080/ws_esp"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo 'Stopping services...'; kill $BACKEND_PID; nginx -s quit; exit" INT
wait
