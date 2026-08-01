#!/usr/bin/env bash
# Railway: Postgres holds app data; volume at /data holds uploaded images only.
set -euo pipefail

VOLUME_ROOT="${RAILWAY_VOLUME_MOUNT_PATH:-/data}"

mkdir -p "${VOLUME_ROOT}/uploads"

mkdir -p public
if [ -e public/uploads ] && [ ! -L public/uploads ]; then
  rm -rf public/uploads
fi
ln -sfn "${VOLUME_ROOT}/uploads" public/uploads

echo "Uploads volume ready at ${VOLUME_ROOT}/uploads"
exec npm run start -- --hostname 0.0.0.0 --port "${PORT:-3000}"
