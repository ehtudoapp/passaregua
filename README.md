# Passaregua

Aplicação SPA para divisão inteligente de despesas entre amigos. Com sincronia de grupos entre dispositivos.

## 🎯 Sobre

O Passaregua é uma aplicação web que calcula automaticamente o acerto de contas entre amigos, utilizando um algoritmo inteligente que **minimiza o número de transações necessárias**.

## 🚀 Tecnologias

- **pocketbase** - Backend num unico binario escrito em GO, com possibilidade de extensões
- **Vue 3** - Framework JavaScript progressivo
- **TypeScript** - Tipagem estática para JavaScript
- **Vite** - Build tool rápido e moderno
- **Tailwind CSS** - Framework CSS utilitário
- **Vitest** - Framework de testes unitários

## 📊 Como Funciona

O algoritmo implementado segue a seguinte lógica:

1. **Calcula os saldos líquidos**: Para cada pessoa, calcula-se o saldo = (quanto pagou) - (quanto deveria pagar)
   - Saldo positivo (+) = credor (pagou mais que deveria)
   - Saldo negativo (-) = devedor (pagou menos que deveria)

2. **Simplificação**: O algoritmo cruza o maior devedor com o maior credor, realizando a maior transferência possível entre eles

3. **Repete o ciclo** até zerar todos os saldos

Isso garante o **número mínimo de transações**, evitando voltas desnecessárias do dinheiro e facilitando o acerto entre amigos de forma inteligente e direta.

## 💻 Uso

1. **Adicione as pessoas** que participaram das despesas
2. **Registre as despesas** informando quem pagou e o valor
3. **Calcule o acerto** e veja exatamente quem deve pagar para quem

## 🛠️ Desenvolvimento

### Pré-requisitos

- Node.js 18+
- npm

### Instalação

```bash
npm install
```

### Executar em modo desenvolvimento

```bash
npm run dev
```

### Build para produção

```bash
npm run build
```

### Executar testes

```bash
npm test
```

## 📝 Exemplo

**Situação:**
- Alice pagou R$ 150,00
- Bob pagou R$ 90,00
- Carol não pagou nada
- Total: R$ 240,00 (R$ 80,00 por pessoa)

**Saldos:**
- Alice: +R$ 70,00 (credor)
- Bob: +R$ 10,00 (credor)
- Carol: -R$ 80,00 (devedor)

**Acerto (2 transações):**
1. Carol → Alice: R$ 70,00
2. Carol → Bob: R$ 10,00

## 📄 Licença

Este projeto está sob a licença especificada no arquivo LICENSE.

