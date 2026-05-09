FROM node:24-bookworm AS base
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci && npx playwright install --with-deps chromium

# Target: dev
FROM base AS development
ENV NODE_ENV=development
COPY src ./src
# Source code is injected via compose watch
CMD ["npx", "tsx", "--watch", "src/main.ts"]

# Target: prod
FROM base AS production
ENV NODE_ENV=production
COPY . .
RUN npm run build
CMD ["node", "dist/main.js"]