# 0002. Store uploaded images on the VM, without backup

Status: accepted

## Context

Avatars, event cover images and post images were uploaded to ImgBB, a free third-party image host. The images lived outside our backups, could not be deleted when their post or event was, went up with their EXIF metadata (phone photos carry GPS coordinates), and the API key travelled in the query string. Production held no ImgBB images when this was decided, so nothing needed migrating.

## Decision

Uploaded images are stored in a Docker volume on the VM and served by the backend at `/uploads`, behind Cloudflare's cache. Each upload is capped at 2 MB, re-encoded to WebP with its long edge at most 1600 px and its metadata stripped, and the backend refuses new uploads once the volume holds 5 GB. Replacing or deleting an image's owner deletes the file. ImgBB is removed entirely.

The images are **not** backed up. The project is a portfolio piece; losing the VM loses the images, while the database still restores from its daily dump.

## Considered Options

- **Cloudflare R2**: free 10 GB and no egress fees, but another account, key and SDK for a small project.
- **OCI Object Storage** (where the database backups live): every public image view counts against the PAYG account's 50k requests per month, and going over costs money.
- **Backing the images up to the backup bucket**: that bucket expires objects after 7 days and is free only up to 10 GB, so daily full copies of up to 5 GB would not fit; an incremental sync under a non-expiring prefix would, but the maintainer judged it not worth it for this project.

## Consequences

- The 5 GB cap is enforced in the app, not by the volume, so the VM's disk stays safe even if someone uploads repeatedly.
- A lost VM means broken image links until users upload again.
