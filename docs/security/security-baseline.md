# Security Baseline

## Authentication
Use a managed identity provider for production authentication. Tokens must be validated server-side and secrets must never be committed to Git.

## Authorization
Every protected API operation must enforce role and tenant authorization server-side.

## Tenant isolation
Cross-community data access is denied by default. Automated tests must include negative cross-tenant authorization cases.

## Data protection
- Encrypt data in transit using TLS.
- Encrypt managed data stores and object storage at rest.
- Keep secrets in a secret manager rather than environment files committed to Git.
- Apply least privilege to cloud IAM.

## Application security
CI should progressively include:
- dependency/SCA scanning
- secret scanning
- SAST
- container image scanning
- IaC scanning
- API/security tests

## Auditability
Security-sensitive actions should produce structured audit events containing actor, action, resource, tenant context and timestamp without unnecessarily storing sensitive personal data.
