FROM node:22-alpine AS builder
WORKDIR /app

RUN apk update && apk upgrade && apk add --no-cache dumb-init

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build
RUN npx tsc --project tsconfig.server.json

FROM node:22-alpine
WORKDIR /app
RUN apk update && apk upgrade && apk add --no-cache dumb-init
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/build/server.js ./server.js
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

EXPOSE 3000
CMD ["dumb-init", "node", "server.js"]
