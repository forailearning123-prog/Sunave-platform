# Sunave Engineering Constitution

## 1) API-First Architecture
All product capabilities must be defined as explicit API contracts before UI or worker implementation.

## 2) Plugin-Based Design
Domain features must be implemented as plugins or modules behind stable extension points.

## 3) Multi-Tenancy by Default
Every service, storage operation, and background task must be tenant-aware and tenant-isolated.

## 4) Configuration-Driven Development
Behavior must be controlled through configuration and environment variables, never hardcoded runtime assumptions.

## 5) Docker-First Deployment
Every service must run in Docker for local, staging, and production parity.

## 6) Coolify Compatibility
Deployment manifests must remain compatible with Coolify and Traefik labels/routing.

## 7) No Hardcoded AI Model Names
Application code must not bind directly to specific models.

## 8) Capability-Based AI Requests
Workers and APIs request capabilities (e.g., summarization, extraction), and the AI gateway resolves provider/model.

## 9) Environment Variable Configuration
External integrations and operational settings must be configured via environment variables.

## 10) Documentation Standards
Every module must maintain updated docs for purpose, contracts, configuration, and operational behavior.

## 11) Testing Expectations
All production code requires unit/integration tests proportionate to risk, plus regression coverage for defects.

## 12) Security Baseline
Secure-by-default configurations, strict input validation, least-privilege access, and secret-free source control are mandatory.

## 13) Versioning Policy
Public APIs and plugin contracts follow semantic versioning with documented compatibility notes.
