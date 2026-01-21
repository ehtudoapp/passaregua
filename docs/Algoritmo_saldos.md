# Algoritmo de Cálculo de Saldos - `useBalances.ts`

## 📌 Visão Geral

O algoritmo calcula automaticamente quanto cada membro do grupo deve pagar ou receber com base em despesas compartilhadas e pagamentos realizados.

---

## 🎯 Conceitos Fundamentais

### Tipos de Transação

O sistema trabalha com **dois tipos** de transação:

| Tipo | Propósito | Exemplo |
|------|-----------|---------|
| **`despesa`** | Registra uma despesa compartilhada | Pizza dividida entre amigos |
| **`pagamento`** | Registra um acerto/liquidação de dívida | Maria paga João |

### Significado do Saldo

```
✅ Saldo POSITIVO (+)  → Pessoa é CREDORA (deve RECEBER dinheiro)
❌ Saldo NEGATIVO (-)  → Pessoa é DEADORA (deve PAGAR dinheiro)
⚪ Saldo ZERO (0)      → Pessoa está QUITADA (sem débito ou crédito)

Fórmula Básica:
Saldo = (Valor que pagou) - (Valor que deve pagar)
```

---

## 🔄 Processamento de Transações

### 1️⃣ Processamento de Despesas (`tipo === 'despesa'`)

Uma despesa envolve **3 etapas**:

#### **Passo A:  Inicializar Saldos**
```typescript
// Cada membro começa com saldo = 0
const memberBalances:  Map<UUID, MemberBalance> = new Map();
members.forEach(member => {
  memberBalances.set(member. id, {
    memberId: member.id,
    memberName: member.nome,
    balance: 0
  });
});
```

#### **Passo B: Creditar o Pagador**
```typescript
// Quem pagou faz um favor - deve RECEBER dinheiro
const payerBalance = memberBalances.get(transaction.pagador_id);
if (payerBalance) {
  payerBalance.balance += transaction. valor_total;
}
```

**Por quê?** Quem pagou a despesa está **emprestando dinheiro** aos outros membros.

#### **Passo C: Debitar os Devedores**
```typescript
// Quem deve pagar tem uma DÍVIDA
const splits = getTransactionSplits(transaction. id);
splits.forEach(split => {
  const debtorBalance = memberBalances.get(split.devedor_id);
  if (debtorBalance) {
    debtorBalance.balance -= split.valor_devido;
  }
});
```

**Por quê?** Cada participante na divisão tem uma dívida proporcional.

#### **Exemplo Completo:**

```
Transação: João paga R$ 100 de pizza
Divisão: 3 pessoas iguais

Splits:
  - João deve R$ 33,33
  - Maria deve R$ 33,33
  - Pedro deve R$ 33,34

Cálculo de Saldos: 

| Pessoa | Crédito | Débito | Saldo |
|--------|---------|--------|-------|
| João   | +100    | -33,33 | +66,67 |
| Maria  | 0       | -33,33 | -33,33 |
| Pedro  | 0       | -33,34 | -33,34 |

Interpretação: 
✅ João vai RECEBER R$ 66,67 (ele pagou mais que sua parte)
❌ Maria deve PAGAR R$ 33,33 (sua parte da pizza)
❌ Pedro deve PAGAR R$ 33,34 (sua parte da pizza)
```

---

### 2️⃣ Processamento de Pagamentos (`tipo === 'pagamento'`)

Um pagamento **liquida uma dívida** e envolve **2 etapas**:

#### **Passo A: Aumentar Saldo do Pagador**
```typescript
// Quem pagou está quitando sua dívida
const payerBalance = memberBalances.get(transaction.pagador_id);
if (payerBalance) {
  payerBalance.balance += transaction. valor_total;
}
```

**Por quê?** A dívida do pagador diminui (saldo melhora).

#### **Passo B: Diminuir Saldo do Receptor**
```typescript
// Quem recebeu está diminuindo seu crédito
const splits = getTransactionSplits(transaction.id);
splits.forEach(split => {
  const receiverBalance = memberBalances.get(split.devedor_id);
  if (receiverBalance) {
    receiverBalance.balance -= split.valor_devido;
  }
});
```

**Por quê?** O crédito do receptor diminui (ele recebeu parte do dinheiro que era devido).

#### **Exemplo Completo:**

```
Situação Anterior:
  João:    +66,67 (deve receber)
  Maria:  -33,33 (deve pagar)
  Pedro:  -33,34 (deve pagar)

Transação: Maria paga R$ 33,33 para João
Split: 
  - João recebe R$ 33,33

Cálculo: 

| Pessoa | Antes  | Pagador | Receptor | Depois |
|--------|--------|---------|----------|--------|
| João   | +66,67 | -       | -33,33   | +33,34 |
| Maria  | -33,33 | +33,33  | -        | 0      |
| Pedro  | -33,34 | -       | -        | -33,34 |

Interpretação:
✅ João vai RECEBER R$ 33,34 (ainda tem crédito)
⚪ Maria está QUITADA (saldo zerado)
❌ Pedro ainda deve R$ 33,34 para João
```

---

## ⚠️ Ponto Importante:  O Pagador na Divisão

**Sim! ** Se o pagador está nos splits (participou da divisão), ele é **automaticamente debitado**: 

```
Cenário: João paga R$ 100 de pizza e também come
Divisão: 3 pessoas iguais (João, Maria, Pedro)

Resultado:
João: +100 (pagou) - 33,33 (sua parte) = +66,67 ✅
Maria: 0 - 33,33 (sua parte) = -33,33 ❌
Pedro: 0 - 33,34 (sua parte) = -33,34 ❌

O algoritmo não faz distinção entre pagador e participantes. 
Quem pagou também PAGA sua parte! 
```

---

## 🔧 Como Estruturar um Acerto (Pagamento)

Para acertar uma dívida, crie uma transação com: 

```typescript
{
  tipo: 'pagamento',
  pagador_id:  'uuid-de-quem-paga',
  valor_total:  33.33,
  splits: [
    {
      devedor_id: 'uuid-de-quem-recebe',  // ⚠️ use "devedor_id"! 
      valor_devido: 33.33
    }
  ]
}
```

**Nota:** Na função `getTransactionSplits()`, o campo é sempre **`devedor_id`**, mesmo em pagamentos (onde é na verdade o receptor).

---

## 📊 Algoritmo de Transações Mínimas

Após calcular os saldos, o sistema gera **sugestões de transações mínimas** para liquidar todas as dívidas com o menor número de transferências. 

### Lógica: 

```typescript
function calculateMinimumTransactions(memberBalances: MemberBalance[]): SuggestedTransaction[] {
  // 1. Encontra a pessoa que MAIS DEVE (maior dívida negativa)
  // 2. Encontra a pessoa que MAIS DEVE RECEBER (maior crédito positivo)
  // 3. Uma paga para a outra quanto possível
  // 4. Repete até não haver mais débitos ou créditos
}
```

### Exemplo: 

```
Saldos Finais:
  João:    +100 (deve receber)
  Maria:  -50  (deve pagar)
  Pedro:  -50  (deve pagar)

Transações Mínimas Sugeridas:
  1. Maria → João: R$ 50
  2. Pedro → João: R$ 50

Resultado Final:  Todos quitados! 
```

---

## 🎯 Fluxo Completo

```
1.  DESPESA REGISTRADA
   ├─ Pagador + Crédito
   └─ Devedores - Débito

2. PAGAMENTO REGISTRADO
   ├─ Pagador + Crédito (reduz dívida)
   └─ Receptor - Débito (reduz crédito)

3. SALDOS CALCULADOS
   ├─ Positivo (+) = Credor
   ├─ Negativo (-) = Devedor
   └─ Zero (0) = Quitado

4. TRANSAÇÕES MÍNIMAS SUGERIDAS
   └─ Menor número de transferências para acertar tudo
```

---

## 🔄 Fórmulas Resumidas

```
DESPESA: 
Saldo = (Valor Pago) - (Sua Parte na Divisão)

PAGAMENTO:
Saldo do Pagador = Saldo Anterior + Valor Pago
Saldo do Receptor = Saldo Anterior - Valor Recebido

SALDO FINAL: 
✅ Positivo = Credor (deve receber)
❌ Negativo = Devedor (deve pagar)
⚪ Zero = Quitado
```

---

## 📋 Estrutura de Dados

```typescript
interface MemberBalance {
  memberId:  UUID;
  memberName: string;
  balance:  Cents;  // Positivo = credor, Negativo = devedor
}

interface SuggestedTransaction {
  from: string;       // Nome de quem paga
  fromId: UUID;       // UUID de quem paga
  to:  string;         // Nome de quem recebe
  toId: UUID;         // UUID de quem recebe
  amount: Cents;      // Valor da transferência
}
```

---

## ✨ Exemplo Passo a Passo Completo

```
CENÁRIO INICIAL:  3 amigos fazem uma janta

TRANSAÇÃO 1: Despesa - Pizza
  Pagador: João (R$ 90)
  Divisão: João (R$ 30), Maria (R$ 30), Pedro (R$ 30)
  
  Cálculo: 
  João:   +90 - 30 = +60
  Maria: 0 - 30 = -30
  Pedro: 0 - 30 = -30

TRANSAÇÃO 2: Despesa - Bebida
  Pagador: Maria (R$ 60)
  Divisão: João (R$ 20), Maria (R$ 20), Pedro (R$ 20)
  
  Cálculo: 
  João:  +60 + 0 - 20 = +40
  Maria: -30 + 60 - 20 = +10
  Pedro: -30 + 0 - 20 = -50

TRANSAÇÃO 3: Pagamento - João recebe
  Pagador: Pedro (R$ 50)
  Receptor: João (R$ 50)
  
  Cálculo:
  João:  +40 - 50 = -10 ❌
  Maria: +10 (sem mudanças) ✅
  Pedro: -50 + 50 = 0 ⚪

SALDOS FINAIS:
  ✅ Maria: +10 (deve receber R$ 10)
  ⚪ Pedro: 0 (quitado)
  ❌ João: -10 (deve pagar R$ 10)

TRANSAÇÃO MÍNIMA SUGERIDA:
  João → Maria: R$ 10
```
