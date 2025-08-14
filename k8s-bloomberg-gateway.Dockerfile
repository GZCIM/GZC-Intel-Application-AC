FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn==0.24.0 \
    httpx==0.25.1 \
    redis==5.0.1 \
    pydantic==2.5.2

# Copy the updated gateway script
COPY k8s-bloomberg-gateway-update.py /app/bloomberg_gateway.py

# Copy the ticker repository file
COPY central_bloomberg_ticker_repository_v3.json /app/central_bloomberg_ticker_repository_v3.json

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; exit(0 if requests.get('http://localhost:8000/health').status_code == 200 else 1)" || exit 1

# Run the application
CMD ["uvicorn", "bloomberg_gateway:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]