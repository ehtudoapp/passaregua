# Stage 1: Build aplicação Vue.js
FROM node:20.19-alpine3.23 AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY src ./src
COPY public ./public
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json tailwind.config.js postcss.config.js ./

# Build da aplicação
RUN npm run build

# Stage 2: Runtime com PocketBase
FROM alpine:3.23

# Instalar dependências necessárias
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    libc6-compat \
    wget

# Configurar timezone
ENV TZ=America/Sao_Paulo
RUN cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime && \
    echo "America/Sao_Paulo" > /etc/timezone

WORKDIR /app

# Copiar binário PocketBase diretamente para /app
COPY pocketbase/pocketbase ./pocketbase
RUN chmod +x ./pocketbase

# Copiar migrations para a pasta correta
COPY pocketbase/pb_migrations ./pb_migrations

# Copiar arquivos compilados do Vue.js para pb_public
COPY --from=builder /app/dist ./pb_public

# Criar diretório para dados persistentes
RUN mkdir -p ./pb_data

# Expor porta padrão PocketBase
EXPOSE 8090

# Volume para dados persistentes
VOLUME ["/app/pb_data"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8090/api/health || exit 1

# Executar PocketBase
ENTRYPOINT ["./pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090"]