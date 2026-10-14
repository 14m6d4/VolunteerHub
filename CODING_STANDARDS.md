# Coding standards

Judgement calls a reviewer checks by reading the diff. Anything a script can check lives in CI instead (`backend` `smoke:security` and `check:*`, frontend `lint`).

## Logs leave the machine

On prod, Alloy ships every container's stdout and stderr to Grafana Cloud (Loki). Treat each log line, `console.*` call and script output as published.

- Log identifiers and messages: a request ID, a user ID, an error's `message` and `stack`.
- Keep passwords, tokens, keys, OTP codes, connection strings, and whole `err`, `req` or `body` objects out of every log. A script that has to hand a secret to a human takes it as input (an env var) and never prints it.

## Authorization fails closed

Every ownership or role check denies when its lookup errors, returns nothing or meets a value it didn't expect. A missing row, a `null` owner or a caught exception ends in 403/404, never in falling through to the action. `check:authz` covers the routes it lists; a new protected route gets a case there.

## Backups carry data, not keys

The backup bucket is readable by a key stored in GitHub secrets (the restore check). A backup copies database contents only: app config, private keys and `.env` files stay on the VM. A backup that genuinely needs one of them encrypts it before upload.
