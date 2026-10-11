# Daily database backup: pg_dump from the postgres image (keep its major
# version in step with the postgres service in docker-compose.prod.yml and
# .github/workflows/restore-check.yml) plus rclone's static binary (same tag
# there) to upload over OCI's S3-compatible API.
FROM rclone/rclone:1.68.2 AS rclone

FROM postgres:17-alpine AS prod
COPY --from=rclone /usr/local/bin/rclone /usr/local/bin/rclone
COPY --chmod=755 backup.sh /usr/local/bin/backup.sh
USER postgres
# The postgres image stops with SIGINT, which bash defers until `sleep` ends.
STOPSIGNAL SIGTERM
ENTRYPOINT ["backup.sh"]
