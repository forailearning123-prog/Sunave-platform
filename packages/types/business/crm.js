export const CrmSchemas = {
  lead: {
    type: 'object',
    properties: {
      expected_revenue: { type: 'number' },
      lead_score: { type: 'number' },
      source: { type: 'string' },
      industry: { type: 'string' }
    }
  },
  opportunity: {
    type: 'object',
    properties: {
      probability: { type: 'number' },
      expected_close: { type: 'string', format: 'date-time' },
      stage: { type: 'string' }
    }
  },
  account: {
    type: 'object',
    properties: {
      website: { type: 'string' },
      annual_revenue: { type: 'number' },
      employee_count: { type: 'number' }
    }
  }
};
