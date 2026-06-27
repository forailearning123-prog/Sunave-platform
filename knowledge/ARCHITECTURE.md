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
