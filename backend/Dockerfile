# iHomeNerd Brain — local AI backend with built-in Command Center UI
#
# Build:  docker build -t ihomenerd .
# Run:    docker run --gpus all -p 17777:17777 --network host ihomenerd
#
# The docker-compose.yml bundles this with Ollama for a one-command start.

FROM python:3.12-slim

# avahi-utils for mDNS advertisement, openssl for TLS cert generation
RUN apt-get update && \
    apt-get install -y --no-install-recommends avahi-utils openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir .

# Copy backend code
COPY app/ app/

# Copy pre-built frontend (built by: cd frontend && npm run build)
# The build output goes to backend/app/static/
COPY app/static/ app/static/

# Data directory for SQLite DBs, certs, etc.
VOLUME /data
ENV IHN_DATA_DIR=/data

# LAN mode by default in Docker
ENV IHN_LAN_MODE=true

EXPOSE 17777

# Use the main() entry point which handles TLS cert generation
CMD ["python", "-m", "app.main"]
