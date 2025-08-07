# Use official Python slim image as base
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install required dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    apt-transport-https \
    unixodbc \
    unixodbc-dev \
    libsqlite3-dev \
    gcc \
    g++ \
    && apt-get remove -y --purge libodbc2 unixodbc-common libodbcinst2 \
    && curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
    && curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql17 libodbc1 odbcinst1debian2 odbcinst unixodbc unixodbc-dev \
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
