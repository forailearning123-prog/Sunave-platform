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
