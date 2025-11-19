FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY client/package*.json client/

RUN npm install && cd client && npm install

COPY . .

RUN npm run build:client

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=postgres://postgres:postgres@postgres:5432/web_client \
    REDIS_URL=redis://redis:6379

EXPOSE 3000

CMD ["npm", "start"]
