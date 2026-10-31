# Stage 1: Build Frontend
FROM node:24-alpine AS builder
WORKDIR /build
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:24-alpine
WORKDIR /opt/mochiwallet
ENV NODE_ENV=production
ENV PORT=3002
COPY --from=builder /build/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/public ./public
COPY --from=builder /build/server ./server
COPY --from=builder /build/index.html ./index.html
WORKDIR /app
EXPOSE 3001 3002
CMD ["sh", "-c", "mkdir -p /app/data /app/uploads/accounts /app/uploads/categories /app/uploads/slips /app/uploads/attachments && cp -rf /opt/mochiwallet/package.json /opt/mochiwallet/dist /opt/mochiwallet/public /opt/mochiwallet/server /opt/mochiwallet/index.html /app/ && if [ ! -d /app/node_modules ]; then cp -rf /opt/mochiwallet/node_modules /app/; fi && node /app/server/index.js"]
