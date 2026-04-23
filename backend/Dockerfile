# iHomeNerd Brain — local AI backend with built-in Command Center UI
#
# Build from repo root:
#   docker build -f backend/Dockerfile -t ihomenerd .
#
# The docker-compose.yml bundles this with Ollama for a one-command start.

FROM node:20-slim AS frontend-builder

WORKDIR /src

# Install frontend dependencies before copying source for better layer reuse.
COPY frontend/package.json frontend/package.json
RUN cd frontend && npm install

COPY frontend/ frontend/
RUN mkdir -p backend/app && cd frontend && npm run build

FROM python:3.12-slim

# avahi-utils for mDNS advertisement, openssl for TLS cert generation,
# iproute2/iputils-ping for the Investigate network tools.
RUN apt-get update && \
    apt-get install -y --no-install-recommends avahi-utils openssl iproute2 iputils-ping && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend code and install Python dependencies.
COPY backend/pyproject.toml .
COPY backend/app/ app/
RUN pip install --no-cache-dir .

# Bundle the built Command Center UI.
COPY --from=frontend-builder /src/backend/app/static/ app/static/

# /setup/extension serves this path in the container.
COPY browser-extension/ /browser-extension/

# Data directory for SQLite DBs, certs, etc.
VOLUME /data
ENV IHN_DATA_DIR=/data

# LAN mode by default in Docker
ENV IHN_LAN_MODE=true

EXPOSE 17777 17778

# Use the main() entry point which handles TLS cert generation
CMD ["python", "-m", "app.main"]
