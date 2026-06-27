# Plugin SDK & Integration Platform
## Epic 5 - Complete

## Overview

The Plugin SDK & Integration Platform provides a complete extension mechanism for Sunave AI OS. All business modules, AI capabilities, workers, agents, dashboard widgets, integrations, and automations can now be implemented as plugins without modifying the core application.

## Architecture

```
Sunave Core
    ↓
Plugin Manager
    ↓
Plugin SDK
    ↓
Plugin Registry
    ↓
Marketplace
    ↓
Installed Plugins
    ↓
Business Modules / Integrations / Agents / Workers
```

## Database Schema (Migration 013)

### Core Tables

1. **plugins** - Plugin registry with full manifest
2. **plugin_versions** - Version history and management
3. **plugin_installations** - Organization-specific installations
4. **plugin_permissions** - Granular permission control
5. **plugin_configurations** - Encrypted configuration storage
6. **plugin_dependencies** - Dependency management
7. **plugin_health** - Health monitoring and metrics
8. **plugin_events** - Event logging and audit trail

### Marketplace Tables

9. **marketplace_items** - Public marketplace listings
10. **marketplace_reviews** - User reviews and ratings

### Integration Tables

11. **integrations** - External service integrations
12. **integration_credentials** - Encrypted credential storage
13. **integration_health** - Integration health monitoring

**Total: 13 new tables with comprehensive indexing**

## Plugin Manifest

Every plugin must contain:

- **id** - Unique identifier
- **name** - Internal name (lowercase, no spaces)
- **displayName** - Human-readable name
- **description** - Plugin description
- **author** - Plugin author
- **organization** - Authoring organization
- **version** - Semantic version
- **category** - One of 16 categories
- **license** - License type
- **homepage** - Project homepage
- **repository** - Source repository
- **documentation** - Documentation URL
- **icon** - Emoji or icon identifier
- **banner** - Banner image URL
- **status** - draft/testing/published/deprecated/archived
- **compatibility** - Platform compatibility matrix
- **minimumPlatformVersion** - Minimum required version
- **permissions** - Required permissions array
- **dependencies** - Plugin dependencies
- **peerDependencies** - Peer dependencies
- **requiredCapabilities** - Required AI capabilities
- **requiredWorkers** - Required worker types
- **requiredAgents** - Required agent types
- **requiredSettings** - Required settings
- **configurationSchema** - JSON schema for configuration
- **entryPoint** - Plugin entry point file
- **createdAt** / **updatedAt** - Timestamps

## Plugin Categories

1. **business** - Business logic modules
2. **ai** - AI capabilities and models
3. **worker** - Worker definitions
4. **agent** - Agent configurations
5. **dashboard** - Dashboard widgets
6. **integration** - External integrations
7. **automation** - Automation workflows
8. **knowledge** - Knowledge management
9. **document** - Document processing
10. **analytics** - Analytics and reporting
11. **voice** - Voice processing
12. **communication** - Communication tools
13. **developer** - Developer tools
14. **security** - Security modules
15. **marketplace** - Marketplace extensions
16. **custom** - Custom plugins

## Plugin Lifecycle

1. **Install** - Install plugin to organization
2. **Enable** - Enable plugin for use
3. **Disable** - Disable without uninstalling
4. **Configure** - Update plugin configuration
5. **Upgrade** - Upgrade to newer version
6. **Downgrade** - Rollback to previous version
7. **Reload** - Hot reload configuration
8. **Restart** - Restart plugin instance
9. **Uninstall** - Remove from organization
10. **Archive** - Archive without deletion
11. **Delete** - Permanent deletion
12. **Rollback** - Rollback failed upgrade
13. **Health Check** - Verify plugin health

## Plugin SDK

The SDK provides 17 public APIs for plugins:

### 1. Configuration API
```javascript
sdk.config.get(key, defaultValue)
sdk.config.set(key, value)
sdk.config.getAll()
sdk.config.delete(key)
```

### 2. Storage API
```javascript
sdk.storage.get(key)
sdk.storage.set(key, value, ttl)
sdk.storage.delete(key)
sdk.storage.list(prefix)
```

### 3. AI Runtime API
```javascript
sdk.ai.execute(capability, params)
sdk.ai.chat(messages, options)
sdk.ai.embed(text)
```

### 4. Worker API
```javascript
sdk.workers.execute(workerId, inputs)
sdk.workers.getWorker(workerId)
sdk.workers.listWorkers(filter)
```

### 5. Agent API
```javascript
sdk.agents.execute(agentId, inputs)
sdk.agents.getAgent(agentId)
sdk.agents.listAgents(filter)
```

### 6. Workflow API
```javascript
sdk.workflows.execute(workflowId, inputs)
sdk.workflows.getWorkflow(workflowId)
sdk.workflows.listWorkflows(filter)
```

### 7. Dashboard API
```javascript
sdk.dashboard.registerWidget(widget)
sdk.dashboard.unregisterWidget(widgetId)
sdk.dashboard.getWidgets()
```

### 8. Event API
```javascript
sdk.events.emit(eventType, data)
sdk.events.on(eventType, callback)
sdk.events.off(eventType, callback)
```

### 9. Search API
```javascript
sdk.search.query(query, options)
```

### 10. Knowledge API
```javascript
sdk.knowledge.index(sourceId, content)
sdk.knowledge.retrieve(query, options)
```

### 11. Document API
```javascript
sdk.documents.process(documentId, options)
sdk.documents.chunk(documentId, strategy)
```

### 12. Notification API
```javascript
sdk.notifications.send(userId, message, channel)
sdk.notifications.broadcast(message, audience)
```

### 13. Logging API
```javascript
sdk.logging.debug(message, data)
sdk.logging.info(message, data)
sdk.logging.warn(message, data)
sdk.logging.error(message, data)
sdk.logging.critical(message, data)
```

### 14. Settings API
```javascript
sdk.settings.get(key, defaultValue)
sdk.settings.set(key, value)
```

### 15. Authentication API
```javascript
sdk.auth.getCurrentUser()
sdk.auth.getOrganization()
```

### 16. RBAC API
```javascript
sdk.rbac.hasPermission(permission)
sdk.rbac.requirePermission(permission)
```

### 17. Organization API
```javascript
sdk.organization.getMembers()
sdk.organization.getTeams()
```

## Plugin Permissions

Plugins can request the following permissions:

- **read_settings** - Read system settings
- **write_settings** - Modify system settings
- **read_ai** - Access AI capabilities
- **execute_ai** - Execute AI operations
- **read_workers** - View worker definitions
- **execute_workers** - Execute workers
- **read_agents** - View agent definitions
- **execute_agents** - Execute agents
- **read_files** - Read file system
- **write_files** - Write to file system
- **read_knowledge** - Access knowledge base
- **write_knowledge** - Modify knowledge base
- **read_crm** - Access CRM data
- **write_crm** - Modify CRM data
- **external_network** - Make external network calls
- **webhooks** - Register webhooks
- **secrets** - Access encrypted secrets
- **marketplace** - Access marketplace

**All permissions must be approved during installation.**

## Event Bus

Global event system for plugin communication:

### System Events
- `plugin.installed` - Plugin installed
- `plugin.updated` - Plugin updated
- `plugin.removed` - Plugin removed
- `plugin.enabled` - Plugin enabled
- `plugin.disabled` - Plugin disabled
- `plugin.error` - Plugin error occurred
- `plugin.health_check` - Health check completed

### Worker Events
- `worker.executed` - Worker execution completed
- `worker.failed` - Worker execution failed

### Workflow Events
- `workflow.completed` - Workflow completed
- `workflow.failed` - Workflow failed

### Agent Events
- `agent.started` - Agent started
- `agent.finished` - Agent finished
- `agent.error` - Agent error

### Knowledge Events
- `knowledge.updated` - Knowledge base updated
- `knowledge.indexed` - Content indexed

### Custom Events
Plugins can emit and subscribe to custom events.

## Integration Framework

Provider abstraction supporting multiple integration types:

### Supported Providers (Framework Only)

**Development:**
- GitHub
- GitLab
- Azure DevOps

**Project Management:**
- Jira
- Confluence

**Communication:**
- Slack
- Microsoft Teams
- Google Workspace
- Microsoft 365
- Outlook
- Gmail

**CRM & Sales:**
- Salesforce
- HubSpot

**Enterprise:**
- SAP
- ServiceNow

**Messaging:**
- Twilio
- WhatsApp
- Telegram
- Discord

**Custom:**
- Custom REST/GraphQL/gRPC/SOAP

### Integration Types
- **REST** - REST API integrations
- **GraphQL** - GraphQL API integrations
- **Webhook** - Webhook receivers
- **gRPC** - gRPC services
- **SOAP** - SOAP services

### Authentication Types
- **OAuth2** - OAuth 2.0 flows
- **API Key** - API key authentication
- **JWT** - JSON Web Token
- **Basic** - Basic authentication
- **None** - No authentication

## Marketplace Framework

Internal marketplace for plugin distribution:

### Features
- Browse and search plugins
- Category filtering
- Featured plugins
- Install counts
- Ratings and reviews
- Version history
- Dependency information
- Compatibility checking
- One-click installation

### Marketplace Data
- Plugin metadata
- Installation statistics
- User reviews (1-5 stars)
- Rating aggregation
- Version changelog
- Dependency tree
- Platform compatibility

## Plugin Health & Monitoring

### Health Statuses
- **healthy** - Operating normally
- **degraded** - Performance degraded
- **unhealthy** - Not functioning
- **error** - Error state
- **unknown** - Not checked

### Health Metrics
- Uptime percentage
- Check count
- Error count
- Last success/error timestamps
- Custom metrics (JSONB)
- Response times (integrations)

### Monitoring Features
- Automatic health checks
- Health score calculation
- Error tracking
- Performance metrics
- Event logging
- Audit trail

## API Endpoints

### Plugin Management
```
GET    /api/plugins                    - List plugins
GET    /api/plugins/:id                - Get plugin details
POST   /api/plugins                    - Create plugin
PUT    /api/plugins/:id                - Update plugin
DELETE /api/plugins/:id                - Delete plugin
POST   /api/plugins/:id/publish        - Publish plugin
GET    /api/plugins/:id/versions       - List versions
```

### Plugin Installation
```
POST   /api/plugins/install            - Install plugin
POST   /api/plugins/:id/enable         - Enable plugin
POST   /api/plugins/:id/disable        - Disable plugin
DELETE /api/plugins/:id/uninstall      - Uninstall plugin
POST   /api/plugins/:id/upgrade        - Upgrade plugin
```

### Plugin Configuration
```
GET    /api/plugins/:id/configuration  - Get configuration
PUT    /api/plugins/:id/configuration  - Update configuration
```

### Plugin Permissions
```
GET    /api/plugins/:id/permissions    - List permissions
PUT    /api/plugins/permissions/:id    - Update permission
```

### Plugin Health
```
GET    /api/plugins/health             - Organization health
POST   /api/plugins/:id/health/check   - Check health
```

### Plugin Events
```
GET    /api/plugins/events             - Organization events
GET    /api/plugins/:id/events         - Plugin events
```

### SDK Information
```
GET    /api/plugins/sdk                - SDK documentation
```

### Integration Management
```
GET    /api/integrations               - List integrations
GET    /api/integrations/:id           - Get integration
POST   /api/integrations               - Create integration
PUT    /api/integrations/:id           - Update integration
DELETE /api/integrations/:id           - Delete integration
POST   /api/integrations/:id/test      - Test connection
POST   /api/integrations/:id/connect   - Connect
POST   /api/integrations/:id/disconnect - Disconnect
POST   /api/integrations/:id/sync      - Sync data
```

### Integration Credentials
```
POST   /api/integrations/:id/credentials       - Create credential
PUT    /api/integrations/credentials/:id       - Update credential
DELETE /api/integrations/credentials/:id       - Delete credential
```

### Integration Health
```
GET    /api/integrations/health                - Organization health
POST   /api/integrations/:id/health/check      - Check health
GET    /api/integrations/providers             - List providers
```

## Frontend

### Plugin Manager (`/plugins`)
- **Installed Tab** - View and manage installed plugins
- **My Plugins Tab** - Manage plugin development
- **Marketplace Tab** - Browse and install plugins
- Plugin creation modal
- Plugin details modal
- Enable/disable/uninstall actions
- Publish to marketplace

### Integration Manager (`/integrations`)
- Integration listing with filters
- Provider selection
- Connection testing
- Credential management
- Health monitoring
- Sync operations

### Shared Components
- Plugin/integration cards
- Status indicators
- Filter system
- Modal system
- Action buttons

## Security

### Sandboxing
- No direct database access
- No filesystem access outside SDK
- Encrypted credentials (AES-256-GCM)
- Organization isolation
- Permission-based access control

### Credential Encryption
- All integration credentials encrypted at rest
- AES-256-GCM authenticated encryption
- Unique IV per credential
- Auth tag for tamper detection
- Environment-based encryption keys

### Audit Trail
- All plugin operations logged
- Event sourcing for actions
- User attribution
- Timestamp tracking
- Organization isolation

## Performance

### Caching
- Plugin manifest cache
- Marketplace cache
- Configuration cache
- Health status cache

### Optimization
- Lazy loading of plugins
- Background health checks
- Streaming logs
- Pagination support
- Debounced search

## Type System

Complete TypeScript-style type definitions in `packages/types/plugins/index.js`:

- 8 enums for statuses and types
- 15 core domain classes
- 17 SDK API classes
- Event bus implementation
- Integration provider abstraction
- Marketplace types

## Files Created

### Backend
- `apps/api/src/db/migrations/013_plugin_platform.sql` - Database schema
- `packages/types/plugins/index.js` - Type definitions
- `apps/api/src/repositories/pluginRepository.js` - Plugin data access
- `apps/api/src/repositories/integrationRepository.js` - Integration data access
- `apps/api/src/services/pluginService.js` - Plugin business logic
- `apps/api/src/services/integrationService.js` - Integration business logic
- `apps/api/src/routes/plugins.js` - Plugin API routes
- `apps/api/src/routes/integrations.js` - Integration API routes
- `apps/api/src/app.js` - Updated with plugin platform

### Frontend
- `apps/web/public/plugins/index.html` - Plugin manager UI
- `apps/web/public/app/plugins.js` - Plugin frontend logic
- `apps/web/public/styles/plugins.css` - Plugin styling
- `apps/web/public/integrations/index.html` - Integration manager UI
- `apps/web/public/app/integrations.js` - Integration frontend logic

## Integration with Existing Modules

The plugin platform integrates seamlessly with:

- **Authentication** - User context and sessions
- **Organizations** - Multi-tenant isolation
- **RBAC** - Permission checking
- **Settings** - Configuration management
- **AI Gateway** - AI capability access
- **Worker Platform** - Worker execution
- **Agent Platform** - Agent orchestration
- **Intelligence Platform** - Knowledge and memory

## Next Steps

The Plugin Platform is now ready to support:

1. **Business Applications** (Epic 6+) - All future business modules will be implemented as plugins
2. **Custom Plugins** - Organizations can create custom plugins
3. **Marketplace Growth** - Expand available plugins
4. **Integration Expansion** - Add more integration providers
5. **Plugin Development Kit** - CLI tools for plugin development

## Acceptance Criteria

✅ Plugin SDK with 17 public APIs
✅ Plugin Runtime with load/unload/health check
✅ Plugin Registry with full CRUD
✅ Plugin Permissions system
✅ Event Bus for inter-plugin communication
✅ Integration Framework with provider abstraction
✅ Marketplace Framework
✅ Plugin Health and Monitoring
✅ Complete API endpoints
✅ Frontend UI for plugin and integration management
✅ Documentation complete

**Epic 5: Plugin SDK & Integration Platform is COMPLETE.**