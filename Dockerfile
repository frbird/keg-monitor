# Keg Monitor – web app
# Build: npm run build  (then)  docker build -t keg-monitor .
# Run:   docker run -p 3000:3000 -v keg-data:/app/data -e SESSION_SECRET=xxx keg-monitor

FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server ./server
# Pre-built client (run "npm run build" in project root before docker build)
COPY client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3000

VOLUME /app/data
ENV DB_PATH=/app/data/keg.db

EXPOSE 3000

ENTRYPOINT ["node", "server/docker-entrypoint.js"]
