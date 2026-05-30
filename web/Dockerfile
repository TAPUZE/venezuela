# Web app (Next.js 16) — built from the repo root so it can COPY web/.
FROM node:22-slim AS base
WORKDIR /app

# Install dependencies first for better layer caching.
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm install

# Build the app.
COPY web ./web
RUN cd web && npm run build

ENV NODE_ENV=production
# Next.js `next start` binds to the PORT env var Railway injects.
CMD ["sh", "-c", "cd web && npm run start"]
