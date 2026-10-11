#!/bin/bash
# Long-running loop: once a day, pg_dump the stack's database (custom format,
# compressed) and upload it to the OCI bucket under volunteerhub/. Each run
# logs "backup ok: ..." or "backup failed: exit N"; Alloy ships these to Loki,
# and the staleness alert (VM repo, alloy/alerts.py) watches for "backup ok".
# Nothing is pruned here: the bucket's lifecycle rule expires dumps after 7 days.
# No `set -e`: a failed run must not stop the loop.
set -uo pipefail

# rclone's s3 backend reads its options from RCLONE_S3_*; .env.backup uses OCI_S3_*.
# Server modtime: listing by age would otherwise HEAD every object.
export RCLONE_S3_PROVIDER=Other RCLONE_S3_NO_CHECK_BUCKET=true RCLONE_USE_SERVER_MODTIME=true \
  RCLONE_S3_ENDPOINT="$OCI_S3_ENDPOINT" RCLONE_S3_REGION="$OCI_S3_REGION" \
  RCLONE_S3_ACCESS_KEY_ID="$OCI_S3_ACCESS_KEY_ID" RCLONE_S3_SECRET_ACCESS_KEY="$OCI_S3_SECRET_ACCESS_KEY"
DEST=":s3:$OCI_S3_BUCKET/volunteerhub"
# 03:00 in Vietnam, and clear of the VM's 02:00-05:00 UTC CPU reclaim guard.
HOUR_UTC=20

backup() {
  local name file status
  name="volunteerhub-$(date -u +%Y%m%dT%H%M%SZ).dump"
  file="/tmp/$name"
  # To a file first, not piped into rclone: a dump that dies halfway must
  # never land in the bucket looking like a backup.
  pg_dump -Fc -d "$DATABASE_URL" -f "$file" && rclone copyto "$file" "$DEST/$name"
  status=$?
  if ((status == 0)); then
    echo "backup ok: $DEST/$name ($(stat -c %s "$file") bytes)"
  else
    echo "backup failed: exit $status"
  fi
  rm -f "$file"
}

# Every deploy recreates this container, so a start only catches up when no
# dump landed in the last day (e.g. the VM was down at HOUR_UTC).
[[ -n $(rclone lsf --max-age 24h "$DEST") ]] || backup
while :; do
  sleep $((86400 - ($(date +%s) - HOUR_UTC * 3600) % 86400))
  backup
done
