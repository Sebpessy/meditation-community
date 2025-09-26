# Use Node.js 20
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
# Don't set NODE_ENV=production yet so devDependencies are installed
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for build (skip Replit plugins)
ENV REPL_ID=

# Build the application with production config (vite and esbuild now available)
RUN npx vite build --config vite.config.production.ts && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Now set production for runtime
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]