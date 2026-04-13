# Stage 1: Build Frontend React App
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including devDependencies for Vite)
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine
WORKDIR /app

# Install native build tools required for better-sqlite3
RUN apk add --no-cache python3 make g++ 

# Install only production dependencies
COPY package*.json ./
RUN npm install --production

# Copy built frontend assets
COPY --from=frontend-builder /app/dist ./dist

# Copy backend server files
COPY server/ ./server/

# Create a persistent volume directory for SQLite
RUN mkdir -p data

EXPOSE 3000

# Start Express server which serves both API and static UI
CMD ["npm", "run", "server"]
