# Operations

## Monitoring

The backend logs structured JSON with a request ID on every line, and exposes request rate, error rate and latency per route as Prometheus metrics at `/metrics`. A Grafana Alloy agent on the VM sends host metrics, per-container metrics, container logs and the app's metrics to Grafana Cloud, so an outage can be traced to a host-level cause such as an OOM kill or a full disk. Alloy forwards only the container metrics the dashboard reads.

A Grafana dashboard shows the VM, the containers and VolunteerHub's request rate, 5xx ratio, latency and logs on one screen.

Uptime Kuma polls the public site and `/api/health` through Cloudflare, the same path users take, and posts to Discord when either goes down.

## Alerts

Alerts fire on symptoms and go to Discord:

| Alert | Fires when |
| --- | --- |
| Disk full | Root disk above 85% for 5 min |
| Memory high | Memory above 90% for 5 min |
| 5xx rate | More than 5% of VolunteerHub requests fail with 5xx for 2 min |
| Backup stale | No successful backup in 36 h |

Each of the first three was fired once on purpose to confirm it reaches Discord.

## Backups

The `backup` container ([`backup/`](../backup/)) runs `pg_dump` once a day and uploads the compressed dump to OCI Object Storage with rclone. A dump that fails halfway is never uploaded. A lifecycle rule on the bucket deletes dumps after 7 days and cleans up incomplete uploads, so retention holds even if the job breaks.

Uploaded images are not backed up; [ADR 0002](adr/0002-store-uploads-on-the-vm.md) explains the decision.

## Restore check

Once a month, [`restore-check.yml`](../.github/workflows/restore-check.yml) downloads the newest dump with a read-only key, restores it into a throwaway Postgres, checks that users and an admin exist, and records how long the restore took. A failure posts to Discord, and the restore badge at the top of the README shows the result of the latest run.
