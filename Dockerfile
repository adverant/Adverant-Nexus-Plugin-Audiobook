# ============================================================================
# Multi-Stage Dockerfile for NexusProseCreator-Audiobook
# Includes FFmpeg for audio processing
# ============================================================================

# Stage 1: Build TypeScript application
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk update && apk add --no-cache python3 make g++

# Copy package files
COPY services/nexus-prosecreator-audiobook/package*.json ./
COPY services/nexus-prosecreator-audiobook/tsconfig.json ./

# Install ALL dependencies (including TypeScript for build)
RUN npm install && \
    npm cache clean --force

# Copy source code
COPY services/nexus-prosecreator-audiobook/src ./src

# Build TypeScript
RUN npm run build

# ============================================================================
# Stage 2: Production runtime with FFmpeg
FROM node:20-alpine

WORKDIR /app

# Install FFmpeg and runtime dependencies
RUN apk update && \
    apk add --no-cache \
    ffmpeg \
    ca-certificates \
    tzdata

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files and install production dependencies only
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create directories for audio processing
RUN mkdir -p /app/temp /app/output && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose HTTP and WebSocket ports
EXPOSE 9101 9102

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9101/audiobook/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start application
CMD ["node", "dist/index.js"]
