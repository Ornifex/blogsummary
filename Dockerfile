# Build step
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN apk update && apk upgrade && apk add --no-cache dumb-init
RUN npm ci
RUN npm run build
RUN npx tsc --project tsconfig.server.json

# Runtime image
FROM node:22-alpine
WORKDIR /app
RUN apk update && apk upgrade && apk add --no-cache dumb-init
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/build/server.js ./server.js
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

EXPOSE 3000
CMD ["dumb-init", "node", "server.js"]
