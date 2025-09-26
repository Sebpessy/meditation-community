# Use Node.js 20
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for build (skip Replit plugins)
ENV NODE_ENV=production
ENV REPL_ID=

# Build the application with production config
RUN npx vite build --config vite.config.production.ts && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]