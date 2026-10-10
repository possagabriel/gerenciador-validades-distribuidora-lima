#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/distribuidora_lima"
export DJANGO_SETTINGS_MODULE=mysite.production
exec ../.venv/bin/gunicorn mysite.wsgi:application --bind 127.0.0.1:8000 --workers "${GUNICORN_WORKERS:-3}" --access-logfile -
