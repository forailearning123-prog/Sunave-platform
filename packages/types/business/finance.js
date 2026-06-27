export const FinanceSchemas = {
  invoice: {
    type: 'object',
    properties: {
      due_date: { type: 'string', format: 'date' },
      total_amount: { type: 'number' },
      tax_amount: { type: 'number' },
      status: { type: 'string' }
    }
  },
  expense: {
    type: 'object',
    properties: {
      date: { type: 'string', format: 'date' },
      amount: { type: 'number' },
      category: { type: 'string' }
    }
  },
  journal_entry: {
    type: 'object',
    properties: {
      date: { type: 'string', format: 'date' },
      description: { type: 'string' },
      reference: { type: 'string' }
    }
  }
};

  budget: { type: 'object', properties: { fiscal_year: { type: 'string' }, allocated_amount: { type: 'number' } } },
  tax: { type: 'object', properties: { tax_rate: { type: 'number' } } },
  recurring_billing: { type: 'object', properties: { frequency: { type: 'string' } } },
  general_ledger: { type: 'object' }

