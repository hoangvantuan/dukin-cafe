# Giai đoạn 1: dựng web (Vite)
FROM node:26-slim AS webbuild
WORKDIR /build/web
COPY web/package*.json ./
RUN npm ci
COPY web ./
RUN npm run build

# Giai đoạn 2: dựng server (TypeScript)
FROM node:26-slim AS serverbuild
WORKDIR /build/server
COPY server/package*.json ./
RUN npm ci
COPY server ./
RUN npm run build

# Giai đoạn chạy: một dịch vụ Node + SQLite (node:sqlite, không cần module biên dịch)
FROM node:26-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV STATIC_DIR=/app/web-dist
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY --from=serverbuild /build/server/dist ./dist
COPY --from=webbuild /build/web/dist ./web-dist
EXPOSE 8080
CMD ["node", "dist/index.js"]
