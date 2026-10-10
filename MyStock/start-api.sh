#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/distribuidora_lima"
export DJANGO_DEBUG=1
VENV_PYTHON="$(cd .. && pwd)/.venv/bin/python"
"$VENV_PYTHON" manage.py calcular_nivel_vencimento
exec "$VENV_PYTHON" manage.py runserver 0.0.0.0:8000
