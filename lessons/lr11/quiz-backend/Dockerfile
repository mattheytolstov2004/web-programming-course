FROM node:20-alpine

# Устанавливаем libssl для Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь проект
COPY . .

# Генерируем Prisma клиент
RUN npx prisma generate

# Собираем TypeScript
RUN npx tsc --skipLibCheck

EXPOSE 3000

CMD ["node", "dist/index.js"]