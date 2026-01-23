# Build stage - compile native dependencies
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:20-bookworm-slim

WORKDIR /app

# Install runtime dependencies: LaTeX, Poppler, Ghostscript
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-extra \
    poppler-utils \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Minify JS for production
RUN node scripts/minify.js

# Create data directory
RUN mkdir -p /app/data

# Expose the application port
EXPOSE 3000

# Run as non-root user for security
RUN useradd -r -s /bin/false appuser && chown -R appuser:appuser /app
USER appuser

CMD ["node", "server.js"]
