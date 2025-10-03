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

# Accept Firebase build args from Railway
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID

# Set them as ENV for the build process
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

# Build the application with production config (vite and esbuild now available)
RUN npx vite build --config vite.config.production.ts && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Now set production for runtime
ENV NODE_ENV=production

# Expose port (Railway will override with PORT env var)
EXPOSE 3000

# Railway will inject DATABASE_URL and other env vars at runtime
# Start command with explicit environment variable check (using JSON exec form)
CMD ["/bin/sh", "-c", "echo 'Starting app with NODE_ENV='$NODE_ENV && echo 'DATABASE_URL present:' $([ -n \"$DATABASE_URL\" ] && echo 'YES' || echo 'NO') && npm start"]