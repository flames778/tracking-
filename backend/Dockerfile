FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV API_PREFIX=api/v1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
RUN mkdir -p /app/storage/reports
EXPOSE 4000
# `api` overrides this to ["node", "dist/main"]; the worker runs dist/worker.
CMD ["sh", "-c", "node dist/main"]
