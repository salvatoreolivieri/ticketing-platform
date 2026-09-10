# Orders service image.
#
# NOTE: build context is the REPO ROOT, not this folder — the compose file sets
# `context: .` so the workspace lockfile and the shared package are reachable.
# Build standalone with:  docker build -f services/orders/Dockerfile -t orders .
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/catalog/package.json ./services/catalog/
COPY services/inventory/package.json ./services/inventory/
COPY services/orders/package.json ./services/orders/
COPY services/gateway/package.json ./services/gateway/
COPY services/docs/package.json ./services/docs/
RUN npm ci

COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY services/orders ./services/orders

EXPOSE 4003
CMD ["npm", "run", "start:orders"]
