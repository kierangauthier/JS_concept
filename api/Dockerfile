FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma/
RUN npx prisma generate
COPY tsconfig*.json nest-cli.json ./
COPY src ./src/
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

# Ghostscript is required to produce Factur-X hybrid PDF/A-3. Licensed under
# AGPL v3 — we use it as an unmodified command-line tool from a backend
# service, which does not trigger AGPL distribution obligations. See
# docs/legal/FACTUR-X-roadmap.md for the licensing note.
RUN apk add --no-cache ghostscript

# Copy build output with ownership set to the non-root `node` user that ships with
# the base image. Running as non-root is a baseline hardening requirement.
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/prisma ./prisma/

USER node

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
