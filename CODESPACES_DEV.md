# Desenvolvimento no GitHub Codespaces

## 🚨 Problema Comum: "Não Funciona"

### Checklist de Verificação:

1. **✅ PocketBase está rodando?**
   ```bash
   ps aux | grep pocketbase
   ```
   Se NÃO aparecer processo, iniciar:
   ```bash
   npm run dev:pb
   ```

2. **✅ Vite está rodando?**
   ```bash
   ps aux | grep vite
   ```
   Se NÃO aparecer processo, iniciar:
   ```bash
   npm run dev
   ```

3. **✅ Verificar logs do console do navegador**
   - Abra as DevTools (F12)
   - Aba Console
   - Procure por: "🔌 PocketBase URL:"
   - Deve mostrar: `http://localhost:8090`

4. **✅ Testar conexão direta com backend**
   Abra em uma nova aba do navegador:
   ```
   http://localhost:8090/_/
   ```
   Se funcionar, o backend está OK!

5. **✅ Página de diagnóstico**
   Acesse: `http://localhost:5174/diagnostico.html`
   (ou a porta que o Vite mostrou)

## 🔧 Configuração Correta

### Arquivo `.env`
```
VITE_BACKEND_URL=http://localhost:8090
```
**IMPORTANTE**: SEM barra no final!

### No Codespaces
- Use SEMPRE `localhost` (não URLs do Codespaces)
- O port forwarding é feito automaticamente
- Certifique-se que as portas 8090 e 5174 estão com visibilidade "Public" na aba PORTS

## 🐛 Soluções para Problemas Comuns

### "404 ao carregar dados"
**Causa**: PocketBase não está rodando
**Solução**:
```bash
pkill -f pocketbase
npm run dev:pb
```

### "CORS error" ou "Failed to fetch"
**Causa**: Configuração de porta no Codespaces
**Solução**:
1. Abra a aba "PORTS" no VS Code
2. Encontre a porta 8090
3. Clique com botão direito → "Port Visibility" → "Public"
4. Faça o mesmo para porta 5174

### "Nenhum dado aparece"
**Causa**: Banco de dados vazio
**Solução**:
1. Acesse: http://localhost:8090/_/
2. Faça login (admin@admin.com / adminadmin123)
3. Crie um grupo de teste manualmente
4. Recarregue a aplicação

### "import.meta.env.VITE_BACKEND_URL é undefined"
**Causa**: Servidor não reiniciado após mudar .env
**Solução**:
```bash
# Parar o Vite (Ctrl+C no terminal)
# Reiniciar
npm run dev
```

## 📝 Notas Importantes

- **NUNCA** use URLs do Codespaces (*.github.dev) no `.env`
- **SEMPRE** use `localhost` para desenvolvimento local
- O Codespaces faz port forwarding automaticamente
- Reinicie o Vite após qualquer mudança no `.env`
