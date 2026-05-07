export type FinancialSettings = {
  interest_rate_monthly: number;
  max_installment_salary_percentage: number;
  min_loan_amount: number;
  max_loan_amount: number;
  max_term_months: number;
};

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  interest_rate_monthly: 3,
  max_installment_salary_percentage: 30,
  min_loan_amount: 100,
  max_loan_amount: 5000,
  max_term_months: 12,
};

export function calculateLoanSimulation(amount: number, termMonths: number, monthlyInterestRate: number) {
  const principal = Math.max(Number(amount || 0), 0);
  const term = Math.max(Number(termMonths || 1), 1);
  const rate = Math.max(Number(monthlyInterestRate || 0), 0);
  const totalInterest = Number((principal * (rate / 100) * term).toFixed(2));
  const totalAmount = Number((principal + totalInterest).toFixed(2));
  const installmentAmount = Number((totalAmount / term).toFixed(2));
  const capitalPerInstallment = Number((principal / term).toFixed(2));
  const interestPerInstallment = Number((totalInterest / term).toFixed(2));

  return { principal, term, rate, totalInterest, totalAmount, installmentAmount, capitalPerInstallment, interestPerInstallment };
}

export function generateSchedule(amount: number, termMonths: number, monthlyInterestRate = 0) {
  const simulation = calculateLoanSimulation(amount, termMonths, monthlyInterestRate);
  const today = new Date();

  return Array.from({ length: simulation.term }).map((_, index) => {
    const dueDate = new Date(today);
    dueDate.setMonth(today.getMonth() + index + 1);

    const isLast = index === simulation.term - 1;
    const previousCapital = simulation.capitalPerInstallment * index;
    const previousInterest = simulation.interestPerInstallment * index;
    const capitalAmount = isLast ? Number((simulation.principal - previousCapital).toFixed(2)) : simulation.capitalPerInstallment;
    const interestAmount = isLast ? Number((simulation.totalInterest - previousInterest).toFixed(2)) : simulation.interestPerInstallment;
    const rowAmount = Number((capitalAmount + interestAmount).toFixed(2));

    return {
      installment_number: index + 1,
      amount: rowAmount,
      capital_amount: capitalAmount,
      interest_amount: interestAmount,
      paid_amount: 0,
      due_date: dueDate.toISOString().slice(0, 10),
      status: 'PENDING',
      is_late: false,
    };
  });
}

export function pendingBalance(payments: Array<{ amount: number; paid_amount?: number | null; status: string }>) {
  return payments.reduce((total, payment) => {
    if (payment.status === 'PAID') return total;
    return total + Number(payment.amount || 0) - Number(payment.paid_amount || 0);
  }, 0);
}

export function nextPendingPayment<T extends { status: string; due_date: string; installment_number?: number | null }>(payments: T[]) {
  return [...payments]
    .filter((payment) => payment.status !== 'PAID')
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0];
}

export function isInstallmentWithinCapacity(installment: number, salary: number, maxPercentage: number) {
  if (!salary) return false;
  return Number(installment || 0) <= Number(salary || 0) * (Number(maxPercentage || 0) / 100);
}
