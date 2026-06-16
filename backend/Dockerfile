# Build Stage
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
# Copy the generated Prisma client so the runtime has the compiled bindings
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

# Create logs directory
RUN mkdir -p logs

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "dist/app.js"]
