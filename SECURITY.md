# Security policy

## Supported versions

This repository is under active development. Security fixes are applied to the current default branch; older snapshots and forks are not supported.

## Reporting a vulnerability

Do not disclose a suspected vulnerability, credential, token, personal data, or exploit details in a public issue, discussion, pull request, or chat.

Use GitHub's **Security → Advisories → Report a vulnerability** flow. If private vulnerability reporting is not available, contact a maintainer and request a private reporting channel without including sensitive details in the initial public message.

Include only what is needed to reproduce and assess the issue:

- affected component and revision;
- impact and required preconditions;
- minimal reproduction steps;
- redacted request/response evidence;
- suggested mitigation, if known.

Maintainers will acknowledge the report privately, assess severity and affected versions, coordinate remediation and rotation, and agree on disclosure timing with the reporter. Do not test against production data or accounts without explicit authorization.

## Suspected secret exposure

Treat a committed or logged secret as compromised even if it is later deleted. Revoke or rotate it first, preserve evidence privately, check dependent credentials and sessions, and only then coordinate repository-history cleanup. See [Environment and secrets](docs/security/environment-and-secrets.md#유출-대응) for the response checklist.
