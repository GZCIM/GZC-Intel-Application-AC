# Use official Python slim image as base
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install required dependencies for PostgreSQL and general development
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    g++ \
    libpq-dev \
    postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy project files into container
COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port for Flask
EXPOSE 5000

# Set environment variables for Flask
ENV FLASK_APP=run.py
ENV FLASK_ENV=production

# Run the application
CMD ["python", "run.py"]
