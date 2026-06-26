# Coding Standards

## Architecture
- API-first contracts before implementation
- Plugin-based extension points for domain features
- Capability-based AI requests; never hardcode model names
- Tenant-safe boundaries for every module

## Engineering
- Configuration via environment variables and typed config layers
- Keep modules small and independently testable
- Document interfaces and decisions under `/knowledge`

## Quality
- Add tests with each feature module
- Require lint, build, and test checks in CI before merge
- Apply secure defaults and validate all external inputs
