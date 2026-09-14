FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY index.mjs queries.mjs ./
USER node
ENV HOST=0.0.0.0
EXPOSE 8788
CMD ["node","index.mjs"]
