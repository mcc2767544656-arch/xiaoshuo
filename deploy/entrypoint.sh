#!/bin/sh
set -eu
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$QIDU_DATA_DIR"
  chown node:node "$QIDU_DATA_DIR"
  chmod 700 "$QIDU_DATA_DIR"
  exec su -s /bin/sh node -c 'exec "$@"' -- qidu "$@"
fi
exec "$@"
