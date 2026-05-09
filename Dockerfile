# syntax=docker/dockerfile:1

FROM node:22-alpine AS client-build
WORKDIR /src/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

FROM golang:1.25.10-alpine AS server-build
WORKDIR /src/server

RUN apk add --no-cache build-base

COPY server/go.mod server/go.sum ./
COPY server/third_party ./third_party
RUN go mod download

COPY server/ ./
RUN CGO_ENABLED=1 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/nexusvault ./cmd/server

FROM alpine:3.22
RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S nexusvault \
    && adduser -S -G nexusvault nexusvault

WORKDIR /app
COPY --from=server-build /out/nexusvault /app/nexusvault
COPY --from=client-build /src/client/dist /app/client/dist

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000
USER nexusvault

ENTRYPOINT ["/app/nexusvault"]
