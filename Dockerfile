FROM python:3.12-slim

# Create non-root user with UID/GID 1000
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g 1000 -m -s /bin/bash appuser

WORKDIR /app

# Install dependencies as root first
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create directories and set ownership
RUN mkdir -p /files /db && \
    chown -R appuser:appuser /files /db /app

# Switch to non-root user
USER appuser

# Set umask so files are created 644, directories 755
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
