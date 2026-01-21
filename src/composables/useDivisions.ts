import type { UUID, Cents } from '../types';

export type DivisionType = 'equal' | 'percentage' | 'amount' | 'shares';

export interface DivisionResult {
  memberId: UUID;
  amount: Cents;
}

/**
 * Divide o valor igualmente entre os membros
 * O último participante recebe o remainder de centavos
 */
export function divideEqually(
  totalAmount: Cents,
  memberIds: UUID[]
): DivisionResult[] {
  if (memberIds.length === 0) return [];

  const amountPerPerson = Math.floor(totalAmount / memberIds.length);
  let distributed = 0;

  return memberIds.map((memberId, index) => {
    // Último participante recebe o que sobrou
    if (index === memberIds.length - 1) {
      return {
        memberId,
        amount: totalAmount - distributed
      };
    }

    distributed += amountPerPerson;
    return {
      memberId,
      amount: amountPerPerson
    };
  });
}

/**
 * Divide o valor por percentual
 * @param totalAmount - Valor total em centavos
 * @param splits - Array com memberId e percentual (0-100)
 * O último participante com percentual > 0 recebe o remainder para garantir soma exata
 */
export function divideByPercentage(
  totalAmount: Cents,
  splits: Array<{ memberId: UUID; percentage: number }>
): DivisionResult[] {
  if (splits.length === 0) return [];

  // Encontra o índice do último participante com percentual > 0
  let lastWithPercentageIndex = -1;
  for (let i = splits.length - 1; i >= 0; i--) {
    if (splits[i].percentage > 0) {
      lastWithPercentageIndex = i;
      break;
    }
  }

  let distributed = 0;

  return splits.map((split, index) => {
    // Último participante com percentual > 0 recebe o que sobrou
    if (index === lastWithPercentageIndex) {
      return {
        memberId: split.memberId,
        amount: totalAmount - distributed
      };
    }

    const amount = Math.round(totalAmount * (split.percentage / 100));
    distributed += amount;
    return {
      memberId: split.memberId,
      amount
    };
  });
}

/**
 * Divide o valor em valores fixos por membro
 * @param splits - Array com memberId e amount em centavos
 */
export function divideByAmount(
  splits: Array<{ memberId: UUID; amount: Cents }>
): DivisionResult[] {
  return splits.map(split => ({
    memberId: split.memberId,
    amount: split.amount
  }));
}

/**
 * Divide o valor por partes/shares
 * @param totalAmount - Valor total em centavos
 * @param splits - Array com memberId e quantidade de partes
 * O último participante com shares > 0 recebe o remainder para garantir soma exata
 */
export function divideByShares(
  totalAmount: Cents,
  splits: Array<{ memberId: UUID; shares: number }>
): DivisionResult[] {
  if (splits.length === 0) return [];

  const totalShares = splits.reduce((sum, s) => sum + s.shares, 0);
  if (totalShares === 0) return [];

  // Encontra o índice do último participante com shares > 0
  let lastWithSharesIndex = -1;
  for (let i = splits.length - 1; i >= 0; i--) {
    if (splits[i].shares > 0) {
      lastWithSharesIndex = i;
      break;
    }
  }

  let distributed = 0;

  return splits.map((split, index) => {
    // Último participante com shares > 0 recebe o que sobrou
    if (index === lastWithSharesIndex) {
      return {
        memberId: split.memberId,
        amount: totalAmount - distributed
      };
    }

    const amount = Math.floor((totalAmount * split.shares) / totalShares);
    distributed += amount;
    return {
      memberId: split.memberId,
      amount
    };
  });
}
