# AlexandreBOT – application web (Node.js, Azure Container Apps)
# Build: docker build -t alexandrebot-web .

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
COPY package.json package-lock.json .npmrc ./
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
RUN npx vinext build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/dist/standalone ./
USER node
EXPOSE 3000
CMD ["node", "server.js"]
