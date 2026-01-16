# Tela de Saldos (Passa a régua) - Notas de Desenvolvimento

## Descrição

Esta funcionalidade adiciona a tela de "Saldos" (visível como "Passa a régua") ao aplicativo, permitindo aos usuários visualizar os saldos de cada membro do grupo, as transações sugeridas para acerto de contas, e registrar pagamentos entre membros.

## Arquivos Criados/Modificados

### Novos Arquivos

1. **src/views/BalancesView.vue**
   - Tela principal de Saldos
   - Exibe três seções principais:
     - **Totais**: Saldos de cada membro (positivo = credor, negativo = devedor)
     - **Transações sugeridas**: Lista de pagamentos mínimos necessários para acertar as contas
     - **Total gasto pelo grupo**: Soma de todas as despesas do grupo
   - Inclui FAB (Floating Action Button) para "Realizar pagamento"
   - Integrada com o sistema de navegação (bottom tabs)

2. **src/components/NewPaymentModal.vue**
   - Drawer (não modal) para registrar novos pagamentos
   - Campos:
     - Data (datepicker, padrão: data atual)
     - Valor (número decimal)
     - Pago por (select de membros)
     - Para (select de membros)
   - Validações:
     - Todos os campos são obrigatórios
     - Valor deve ser maior que 0
     - Pagador e recebedor devem ser diferentes

3. **src/composables/useBalances.ts**
   - Hook Vue para calcular saldos e transações sugeridas
   - Funcionalidades:
     - Calcula saldos baseado em transações do tipo 'despesa' e 'pagamento'
     - Implementa algoritmo de minimização de transações (greedy)
     - Atualiza automaticamente quando o grupo ativo muda
     - Fornece função `refresh()` para atualização manual

### Arquivos Modificados

1. **src/App.vue**
   - Adicionado import de `BalancesView`
   - Adicionado renderização condicional para `activeNav === 'totals'`

## Funcionamento

### Cálculo de Saldos

O cálculo de saldos é feito da seguinte forma:

1. Para cada transação do tipo `'despesa'`:
   - O pagador ganha crédito (+valor)
   - Os devedores (splits) perdem crédito (-valor_devido)

2. Para cada transação do tipo `'pagamento'`:
   - O pagador perde crédito (-valor)
   - O recebedor ganha crédito (+valor)

3. O saldo final de cada membro indica:
   - **Positivo**: Tem a receber (credor)
   - **Negativo**: Deve pagar (devedor)
   - **Zero**: Está quite

### Algoritmo de Transações Mínimas

Implementado no método `calculateMinimumTransactions`:

1. Encontra o maior devedor (saldo mais negativo)
2. Encontra o maior credor (saldo mais positivo)
3. Calcula a transferência máxima possível entre eles
4. Registra a transação e atualiza os saldos
5. Repete até que todos os saldos sejam zero

Este algoritmo garante o número mínimo de transações para acertar as contas.

## Como Testar Localmente

### Pré-requisitos
```bash
npm install
```

### Executar em modo desenvolvimento
```bash
npm run dev
```

### Acessar a tela

1. Abra o navegador em `http://localhost:5173/`
2. Vá para a aba "Grupos" e crie/ative um grupo
3. Adicione membros ao grupo
4. Vá para a aba "Despesas" e adicione algumas despesas
5. Vá para a aba "Saldos" para ver:
   - Saldos de cada membro
   - Transações sugeridas
   - Total gasto pelo grupo
6. Clique em "Realizar pagamento" para registrar um pagamento entre membros

### Build para produção
```bash
npm run build
```

## Padrões Utilizados

- **Vue 3 Composition API**: Uso de `<script setup>` e composables
- **TypeScript**: Tipagem forte em todos os componentes
- **Tailwind CSS**: Estilização consistente com o resto do projeto
- **Drawer Pattern**: Seguindo o padrão do projeto (não modais)
- **Reactive State**: Uso de `ref()` e `watch()` para reatividade
- **LocalStorage**: Persistência de dados via `storage.ts`

## Estrutura de Dados

Os dados são armazenados no localStorage através dos seguintes tipos:

- `TransactionRecord`: Transações de despesa ou pagamento
  - `tipo`: `'despesa'` ou `'pagamento'`
  - `valor_total`: Valor em centavos
  - `pagador_id`: UUID do membro que pagou
  
- `Split`: Divisão de despesas/pagamentos
  - `devedor_id`: UUID do membro devedor
  - `valor_devido`: Valor devido em centavos

## Acessibilidade

- Labels apropriados em todos os campos de formulário
- Botões com roles corretos
- Foco automático no drawer quando aberto
- Cores contrastantes para melhor legibilidade

## Responsividade

- Layout mobile-first
- Máximo de largura de 640px para conteúdo principal
- FAB posicionado de forma adequada
- Bottom navigation sempre visível

## Notas Importantes

1. O componente usa o padrão de Drawer (não modal), seguindo o padrão existente no projeto
2. Os valores são armazenados em centavos internamente mas exibidos em reais
3. O algoritmo de minimização de transações é o mesmo usado no arquivo `algorithm.ts` do projeto
4. A tela se integra perfeitamente com o sistema de navegação existente
5. Todos os dados são persistidos no localStorage
