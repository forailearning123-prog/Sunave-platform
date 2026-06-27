# AI Provider & Model Registry Platform — Test Plan

## Test Coverage

### Provider Registry Tests
- `GET /api/ai/providers` — List all providers
- `GET /api/ai/providers/:id` — Get provider with models and capabilities
- `POST /api/ai/providers` — Create provider (name, type validation)
- `PUT /api/ai/providers/:id` — Update provider
- `DELETE /api/ai/providers/:id` — Delete provider (block default sunave_local)
- `POST /api/ai/providers/test` — Test provider connection
- `POST /api/ai/providers/sync` — Sync models from provider

### Model Registry Tests
- `GET /api/ai/models` — List models (with filters)
- `GET /api/ai/models/:id` — Get model with capabilities
- `POST /api/ai/models` — Create model
- `PUT /api/ai/models/:id` — Update model
- `DELETE /api/ai/models/:id` — Delete model
- `POST /api/ai/models/refresh` — Refresh all models
- `PUT /api/ai/models/:id/capabilities` — Update model capabilities

### Capability Registry Tests
- `GET /api/ai/capabilities` — List capabilities with categories and provider map
- `PUT /api/ai/capabilities` — Bulk update capabilities
- `POST /api/ai/capabilities` — Create capability

### Policy Tests
- `GET /api/ai/policies` — List routing policies
- `PUT /api/ai/policies` — Update routing policies

### Health Monitoring Tests
- `GET /api/ai/health` — Gateway health check
- `GET /api/ai/health/summary` — Detailed health summary
- `GET /api/ai/providers/:id/health` — Provider health history

### Usage & Statistics Tests
- `GET /api/ai/statistics` — Full statistics dashboard
- `GET /api/ai/usage` — Token usage logs
- `GET /api/ai/costs` — Cost tracking data

### Budget Tests
- `GET /api/ai/budgets` — List budgets
- `POST /api/ai/budgets` — Create budget
- `PUT /api/ai/budgets/:id` — Update budget
- `DELETE /api/ai/budgets/:id` — Delete budget

### Security Tests
- API credentials encrypted at rest (AES-256-GCM)
- Keys masked in API responses
- System capabilities cannot be deleted
- Default sunave_local provider cannot be deleted

## Running Tests

```bash
npm test -- --grep "AI"
# or run specific test file
node --experimental-vm-modules node_modules/.bin/jest tests/ai.api.test.js
```

All Provider Management APIs: `GET/POST/PUT/DELETE /api/ai/providers*`
All Model Management APIs: `GET/POST/PUT/DELETE /api/ai/models*`
All Capability APIs: `GET/POST/PUT /api/ai/capabilities*`
All Health APIs: `GET /api/ai/health*`
All Usage APIs: `GET /api/ai/usage*`
All Cost APIs: `GET /api/ai/costs*`
All Budget APIs: `GET/POST/PUT/DELETE /api/ai/budgets*`