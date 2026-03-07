# Keg Monitor – web app
# Build: docker build -t keg-monitor .
# Run:   docker run -p 3000:3000 -v keg-data:/app/data -e SESSION_SECRET=xxx keg-monitor

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY client/package.json client/package-lock.json* client/
RUN cd client && (npm ci --omit=dev 2>/dev/null || npm install --omit=dev)

COPY client ./client
RUN cd client && npm run build

FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server ./server
COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3000

VOLUME /app/data
ENV DB_PATH=/app/data/keg.db

EXPOSE 3000

ENTRYPOINT ["node", "server/docker-entrypoint.js"]
