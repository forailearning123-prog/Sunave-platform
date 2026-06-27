export const HrSchemas = {
  employee: {
    type: 'object',
    properties: {
      hire_date: { type: 'string', format: 'date' },
      department_id: { type: 'string', format: 'uuid' },
      job_title: { type: 'string' },
      salary: { type: 'number' }
    }
  },
  department: {
    type: 'object',
    properties: {
      head_id: { type: 'string', format: 'uuid' },
      cost_center: { type: 'string' }
    }
  },
  applicant: {
    type: 'object',
    properties: {
      applied_date: { type: 'string', format: 'date' },
      status: { type: 'string' },
      source: { type: 'string' }
    }
  }
};

  position: { type: 'object', properties: { headcount: { type: 'number' } } },
  attendance: { type: 'object', properties: { date: { type: 'string', format: 'date' }, hours_worked: { type: 'number' } } },
  performance_review: { type: 'object', properties: { rating: { type: 'number' }, review_period: { type: 'string' } } },
  learning: { type: 'object' }

