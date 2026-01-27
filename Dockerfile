# Stage 1: Build aplicação Vue.js
FROM node:20.19-alpine3.23 AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY src ./src
COPY public ./public
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json tailwind.config.js postcss.config.js ./

# Build da aplicação (usa window.location.origin em produção)
RUN npm run build

# Stage 2: Runtime com PocketBase
FROM alpine:3.23

RUN apk add --no-cache ca-certificates tzdata wget

WORKDIR /app

COPY pocketbase/pocketbase ./pocketbase
RUN chmod +x ./pocketbase

COPY pocketbase/pb_migrations ./pb_migrations
COPY --from=builder /app/dist ./pb_public

# Criar diretório de dados e definir permissões
RUN mkdir -p ./pb_data
RUN chown -R 1000:1000 ./pb_data

EXPOSE 8090

# Volume para persistir dados
VOLUME ["/app/pb_data"]

ENTRYPOINT ["./pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090", "--dir=/app/pb_data", "--publicDir=/app/pb_public"]