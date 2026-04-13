# =============================================================
# STAGE 1: Build Frontend (React + Vite)
# =============================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./
RUN npm ci --include=dev

# Copy source and build
COPY . .
RUN npm run build

# =============================================================
# STAGE 2: Production Server
# =============================================================
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install native build tools for better-sqlite3, then clean up
RUN apk add --no-cache python3 make g++ && \
    npm install -g npm@latest --quiet

# Copy package files and install ONLY production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && \
    apk del python3 make g++ && \
    npm cache clean --force

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy backend
COPY server/ ./server/

# Create persistent data dir and set ownership
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Health check — Komodo will use this to monitor container health
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/ping || exit 1

EXPOSE 3000

CMD ["node", "server/index.js"]
