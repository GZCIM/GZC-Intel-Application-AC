# Use official Python image
FROM python:3.12

# Set the working directory
WORKDIR /app

# Copy the project files into the container
COPY . .

# Install system dependencies for pyodbc (MS SQL Server)
RUN apt-get update && apt-get install -y \
    gcc g++ unixodbc-dev curl && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Expose Flask's default port
EXPOSE 5000

# Command to run the FastAPI app using Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5000"]