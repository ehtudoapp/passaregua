# Desenvolvimento no GitHub Codespaces

## ✅ Ambiente Configurado

### Backend (PocketBase)
- **Status**: ✅ Rodando na porta 8090
- **URL Local**: `http://localhost:8090`
- **URL Codespaces**: `https://silver-space-trout-5x7p4gw9gvhpvx6-8090.app.github.dev/`

### Frontend (Vite/Vue)
- **Porta**: 5173 (ou 5174 se 5173 estiver ocupada)
- **Configuração**: Proxy configurado para `/api` → Backend
- **Status Atual**: ✅ Rodando em http://localhost:5174/

## 🚀 Como Iniciar o Desenvolvimento

### 1. Verificar se o Backend está rodando
```bash
ps aux | grep pocketbase
```

Se não estiver rodando:
```bash
npm run dev:pb
```

### 2. Iniciar o Frontend
Em um novo terminal:
```bash
npm run dev
```

### 3. Acessar a aplicação
- O Codespaces vai automaticamente fazer o port forwarding
- Acesse a URL que aparecer no terminal (porta 5173)
- O VS Code vai mostrar uma notificação com o link

## 🔧 Variáveis de Ambiente

O arquivo `.env` está configurado com:
```
VITE_BACKEND_URL=https://silver-space-trout-5x7p4gw9gvhpvx6-8090.app.github.dev/
```

**Importante**: No Codespaces, use sempre a URL completa do backend (com HTTPS) para evitar problemas de CORS.

## 🛠️ Comandos Úteis

```bash
# Build do projeto
npm run build

# Preview do build
npm run preview

# Testes
npm test

# Verificar status dos processos
ps aux | grep -E 'pocketbase|vite'

# Verificar portas abertas
netstat -tulpn | grep LISTEN
```

## 🐛 Troubleshooting

### Problema: Backend não responde
**Solução**: Reiniciar o PocketBase
```bash
# Matar processo
pkill -f pocketbase

# Iniciar novamente
npm run dev:pb
```

### Problema: Erro de CORS
**Solução**: Verificar se está usando a URL correta do Codespaces no `.env`

### Problema: Porta já em uso
**Solução**: 
```bash
# Encontrar processo usando a porta
lsof -i :5173
lsof -i :8090

# Matar processo específico
kill -9 <PID>
```

## 📝 Notas do Codespaces

- As URLs do Codespaces mudam a cada sessão
- Configure o port forwarding como público se precisar compartilhar
- O Codespaces hiberna após inatividade - os processos precisam ser reiniciados
