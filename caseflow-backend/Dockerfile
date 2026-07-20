FROM node:20-alpine AS base
WORKDIR /app

# Alpine ships neither OpenSSL (Prisma's query/schema engine binaries link
# against it at runtime — without it you get a garbled non-JSON response
# from the engine, e.g. "Could not parse schema engine response") nor a C
# toolchain (needed to compile bcrypt's native binding during npm install).
RUN apk add --no-cache openssl python3 make g++

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
