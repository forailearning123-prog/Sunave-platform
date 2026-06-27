# System Architecture

## Core Principles
- Multi-tenant, API-first, plugin-oriented.
- Docker-based, configuration-driven deployments.
- RBAC and Organization isolation enforced at the API layer.

## Major Components
1. **Core / Platform**
   - IAM, RBAC, Organizations, Dashboard.

2. **AI & Intelligence**
   - AI Gateway, Model Registry, Embedding Services, Context Builder.
   - RAG and Semantic Search capabilities.

3. **Worker & Agent Platform**
   - Asynchronous job execution, automated workflows, and Agent-based decision making.

4. **Integration Platform**
   - Connecting external services via standard webhook and generic APIs.

5. **Business Operating Platform (BOP)**
   - A shared foundation for all business modules (CRM, HR, Finance, etc.).
   - Provides generic implementations for Objects, Relationships, Activities, Comments, Approvals, Notifications, Custom Fields, and Audits.

## Tech Stack
- Node.js, Express, PostgreSQL (with schema migrations).
- RESTful endpoints, pure JavaScript implementations, Dockerized.

6. **Enterprise Business Applications (CRM, HR, Finance)**
   - Built entirely on top of the Business Operating Platform.
   - Domain-specific logic resides in `packages/business/`.
   - UI frontends are completely isolated under `apps/web/crm`, `apps/web/hr`, and `apps/web/finance`.
   - Uses dynamically composed metadata rather than isolated physical tables.


7. **Enterprise Extension Platforms (Epics 10-15)**
   - Collaboration, Supply Chain (SCM), Support, BI, Operations, and Cloud management platforms.
   - Designed to rely natively on the Business Operating Platform (`business_objects` framework and migrations).
   - Separated into their respective packages (`packages/business/[module]`) and frontend workspaces (`apps/web/[module]`).

