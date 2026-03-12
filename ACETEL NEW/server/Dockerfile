# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Install all dependencies (including devDependencies for build)
RUN npm ci

COPY . .
# Build TypeScript code
RUN npm run build


# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production
# Hardcode NODE_ENV to production for the runtime stage to enable performance optimizations
ENV NODE_ENV=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create a non-root user and switch to it (Node image comes with a 'node' user)
USER node

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start command
CMD ["node", "dist/index.js"]
