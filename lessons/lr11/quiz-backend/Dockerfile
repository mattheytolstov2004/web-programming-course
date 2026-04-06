# ---- Builder stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npx tsc -p tsconfig.json

# Отдельно устанавливаем prod-зависимости
RUN npm ci --omit=dev

# ---- Runner stage ----
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl

# Копируем prod node_modules из builder (уже чистые)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Копируем собранный код и Prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./dist/src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

CMD ["node", "dist/src/server.js"]