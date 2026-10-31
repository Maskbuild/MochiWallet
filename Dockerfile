# Stage 1: Build Frontend
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
RUN mkdir -p /app/data /app/uploads/accounts /app/uploads/categories /app/uploads/slips /app/uploads/attachments
EXPOSE 3001
CMD ["node", "server/index.js"]
