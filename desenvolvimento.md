# Passa a régua - Guia de Desenvolvimento

> Aplicação mobile-first para divisão de despesas em grupo.

---

## 1. Design System

### Paleta de Cores

| Uso               | Cor Tailwind   | Hex       |
|-------------------|----------------|-----------|
| Primária (escura) | `emerald-700`  | `#047857` |
| Primária (clara)  | `emerald-300`  | `#6ee7b7` |
| Texto principal   | `gray-900`     | `#111827` |
| Texto secundário  | `gray-500`     | `#6b7280` |
| Erro / Negativo   | `rose-400`     | `#ff637e` |
| Info / Link       | `sky-500`      | `#0ea5e9` |
| Alerta            | `yellow-500`   | `#eab308` |

### Diretrizes de UI

- **Mobile-first**: viewport base de máx. 640px
- Usar FAB (Floating Action Button) para ações principais
- Gavetas (drawers) para formulários rápidos

---

## 2. Estrutura de Dados (Local Storage)

### `groups`
| Campo  | Tipo     | Descrição              |
|--------|----------|------------------------|
| `id`   | UUID v4  | Identificador único    |
| `nome` | string   | Nome do grupo          |

### `members`
| Campo      | Tipo    | Descrição                    |
|------------|---------|------------------------------|
| `id`       | UUID v4 | Identificador único          |
| `group_id` | UUID v4 | FK para `groups.id`          |
| `nome`     | string  | Nome do participante         |
| `deleted`  | bool    | Se participante foi deletado |


### `transactions`
| Campo        | Tipo                       | Descrição                     |
|--------------|----------------------------|-------------------------------|
| `id`         | UUID v4                    | Identificador único           |
| `group_id`   | UUID v4                    | FK para `groups.id`           |
| `tipo`       | `'despesa'` \| `'pagamento'` | Tipo da transação           |
| `valor_total`| number                     | Valor total em centavos       |
| `descricao`  | string                     | Descrição da transação        |
| `data`       | ISO 8601                   | Data da transação             |
| `pagador_id` | UUID v4                    | FK para `members.id`          |
| `deleted`    | bool                       | Se transação foi deletado     |


### `splits`
| Campo          | Tipo    | Descrição                        |
|----------------|---------|----------------------------------|
| `id`           | UUID v4 | Identificador único              |
| `transaction_id` | UUID v4 | FK para `transactions.id`      |
| `devedor_id`   | UUID v4 | FK para `members.id`             |
| `valor_pago`   | number  | Quanto o devedor já pagou        |
| `valor_devido` | number  | Quanto o devedor deve            |
| `deleted`      | bool    | Se dicisão foi ou não deletada   |


---

## 3. Páginas e Funcionalidades

### 3.1 Onboarding / Grupos

**Rota:** `/` ou `/grupos`

| Condição                          | Ação                              |
|-----------------------------------|-----------------------------------|
| Sem grupos no Local Storage       | Redirecionar para criação         |
| Com grupos                        | Listar grupos e permitir seleção  |

**Funcionalidades:**
- [x] Criar novo grupo (gera UUID v4)
- [x] Adicionar participantes ao grupo
- [x] Selecionar grupo ativo
- [x] apagar grupo localmente
- [x] FIX: ao criar o primeiro grupo deixar ele com grupo ativo
- [x] ao importar grupo se for o primeiro ele já deve ser o grupo ativo
- [x] ao clicar no card do grupo se for o grupo ativo aparece o drawer de edição, se não for o ativo tornar esse grupo ativo e redirecionar para aba de lançamentos

---

### 3.2 Despesas

**Rota:** `/despesas`

**FAB:** ➕ Adicionar despesa

**Drawer de nova despesa:**
- [x] Campo: Data (default: hoje)
- [x] Campo: Valor total
- [x] Campo: Quem pagou (select de membros)
- [x] Campo: Descrição
- [x] Lista: Divisão por participante
- [x] fix: detalhes da despesa mostrando NAN no dia
- [ ] comando de edição da descrição da despesa, igual ao de edição do nome em /config

---

### 3.3 Saldos

**Rota:** `/saldos`

**FAB:** 💸 Registrar pagamento

**Funcionalidades:**
- [x] Exibir saldo de cada participante
  - Positivo (verde): tem a receber
  - Negativo (vermelho): deve
- [x] Registrar pagamento entre membros
- [x] Criar um botão com icone("document-currency-dollar") para criar uma transferencia conforme a sugestão mostrada para quitar a conta

---

### 3.4 Configurações

**Rota:** `/config`

**Funcionalidades:**
- [x] Adicionar/remover participantes do grupo
- [x] Definir usuário ativo (facilita lançamentos)
- [x] Permitir alterar o nome do membro do grupo

---

## 4. Fluxo de Navegação

```
┌─────────────┐
│  Sem grupo? │──sim──▶ /grupos (criar)
└──────┬──────┘
       │ não
       ▼
┌─────────────┐
│  /despesas  │◀──────────────────┐
└──────┬──────┘                   │
       │ Tab bar                  │
       ▼                          │
┌─────────────┐   ┌─────────────┐ │
│  /saldos    │   │  /config    │─┘
└─────────────┘   └─────────────┘
```

---

## 5. Checklist de Implementação

- [x] Setup do projeto (Vite + React + Tailwind)
- [x] Helpers de Local Storage (CRUD genérico)
- [x] Gerador de UUID v4
- [x] Contexto de grupo ativo
- [x] Componente FAB reutilizável
- [x] Componente Drawer reutilizável
- [x] Página de Grupos
- [x] Página de Despesas
- [x] Página de Saldos
- [x] Página de Configurações
- [x] Cálculo de saldos (algoritmo de liquidação)

## 6. Detalhes
- [x] Data ao lançar despesa já pegar a data atual
- [x] Mostrar o valor da divisão entre parenteses ao inserir despesa
- [x] Divisão por porcentagem
- [x] Divisão por valor
- [x] Divisão por partes
- [x] Não deletar nada do banco de dados criar uma propriedade deleted 'true|false' no banco de dados
- [x] animar botão de sincronizar
- [x] snackbar inferior para mensagens
- [x] mensagem de sicronia concluida
- [x] sempre deixar os participantes selecionados, dividindo igualmente em todas os tipos de divisões
