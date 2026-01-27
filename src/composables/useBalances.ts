import { ref, watch } from 'vue';
import type { UUID, Cents } from '../types';
import { 
  getGroupMembers, 
  getGroupTransactions, 
  getTransactionSplits
} from '../lib/storage';
import { useActiveGroup } from './useActiveGroup';
import { useDataRefresh } from './useDataRefresh';

export interface MemberBalance {
  memberId: UUID;
  memberName: string;
  balance: Cents; // positive = creditor (has to receive), negative = debtor (has to pay)
}

export interface SuggestedTransaction {
  from: string;
  fromId: UUID;
  to: string;
  toId: UUID;
  amount: Cents;
}

export function useBalances() {
  const { activeGroupId } = useActiveGroup();
  const { refreshTrigger } = useDataRefresh();
  const balances = ref<MemberBalance[]>([]);
  const suggestedTransactions = ref<SuggestedTransaction[]>([]);
  const totalExpenses = ref<Cents>(0);

  function calculateBalances() {
    if (!activeGroupId.value) {
      balances.value = [];
      suggestedTransactions.value = [];
      totalExpenses.value = 0;
      return;
    }

    const members = getGroupMembers(activeGroupId.value);
    const transactions = getGroupTransactions(activeGroupId.value);

    // Initialize balances for all members
    const memberBalances: Map<UUID, MemberBalance> = new Map();
    members.forEach(member => {
      memberBalances.set(member.id, {
        memberId: member.id,
        memberName: member.nome,
        balance: 0
      });
    });

    let total = 0;

    // Process each transaction
    transactions.forEach(transaction => {
      // Only process expenses, not payments
      if (transaction.tipo === 'despesa') {
        // Add to total expenses (only despesas count)
        total += transaction.valor_total;

        // Add to payer's balance (they paid, so they are owed)
        const payerBalance = memberBalances.get(transaction.pagador_id);
        if (payerBalance) {
          payerBalance.balance += transaction.valor_total;
        }

        // Get splits for this transaction
        const splits = getTransactionSplits(transaction.id);
        
        // Subtract from each debtor's balance
        splits.forEach(split => {
          const debtorBalance = memberBalances.get(split.devedor_id);
          if (debtorBalance) {
            debtorBalance.balance -= split.valor_devido;
          }
        });
      } else if (transaction.tipo === 'pagamento') {
        // For payments, we need to adjust balances
        // The payer's balance increases (they settled debt, reducing what they owe)
        // The receiver's balance decreases (they got paid, reducing what they're owed)
        const splits = getTransactionSplits(transaction.id);
        
        // Payment: payer paid their debt (balance increases - less debt)
        const payerBalance = memberBalances.get(transaction.pagador_id);
        if (payerBalance) {
          payerBalance.balance += transaction.valor_total;
        }

        // Payment: receiver got paid (balance decreases - less credit)
        splits.forEach(split => {
          const receiverBalance = memberBalances.get(split.devedor_id);
          if (receiverBalance) {
            receiverBalance.balance -= split.valor_devido;
          }
        });
      }
    });

    balances.value = Array.from(memberBalances.values())
      .sort((a, b) => b.balance - a.balance); // Sort descending by balance

    totalExpenses.value = total;

    // Calculate suggested transactions (minimum transactions to settle debts)
    suggestedTransactions.value = calculateMinimumTransactions(balances.value);
  }

  function calculateMinimumTransactions(memberBalances: MemberBalance[]): SuggestedTransaction[] {
    // Create a copy to manipulate
    const balancesCopy = memberBalances.map(b => ({ ...b }));
    const transactions: SuggestedTransaction[] = [];

    const EPSILON = 1; // 1 cent tolerance (values are stored as cents)

    while (true) {
      // Find the person who owes the most (most negative balance)
      let maxDebtor: MemberBalance | null = null;
      let maxDebtorIndex = -1;
      
      for (let i = 0; i < balancesCopy.length; i++) {
        if (balancesCopy[i].balance < -EPSILON) {
          if (maxDebtor === null || balancesCopy[i].balance < maxDebtor.balance) {
            maxDebtor = balancesCopy[i];
            maxDebtorIndex = i;
          }
        }
      }

      // Find the person who is owed the most (most positive balance)
      let maxCreditor: MemberBalance | null = null;
      let maxCreditorIndex = -1;
      
      for (let i = 0; i < balancesCopy.length; i++) {
        if (balancesCopy[i].balance > EPSILON) {
          if (maxCreditor === null || balancesCopy[i].balance > maxCreditor.balance) {
            maxCreditor = balancesCopy[i];
            maxCreditorIndex = i;
          }
        }
      }

      // If no more debtors or creditors, we're done
      if (maxDebtor === null || maxCreditor === null) {
        break;
      }

      // Calculate the transfer amount
      const transferAmount = Math.min(
        Math.abs(maxDebtor.balance),
        maxCreditor.balance
      );

      // Record the transaction
      transactions.push({
        from: maxDebtor.memberName,
        fromId: maxDebtor.memberId,
        to: maxCreditor.memberName,
        toId: maxCreditor.memberId,
        amount: Math.round(transferAmount)
      });

      // Update balances
      balancesCopy[maxDebtorIndex].balance += transferAmount;
      balancesCopy[maxCreditorIndex].balance -= transferAmount;
    }

    return transactions;
  }

  // Recalculate when active group changes or refresh is triggered
  watch([activeGroupId, refreshTrigger], calculateBalances, { immediate: true });

  // Function to manually refresh balances
  function refresh() {
    calculateBalances();
  }

  return {
    balances,
    suggestedTransactions,
    totalExpenses,
    refresh
  };
}
