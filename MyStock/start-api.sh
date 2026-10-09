#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/distribuidora_lima"
../.venv/bin/python manage.py calcular_nivel_vencimento
exec ../.venv/bin/python manage.py runserver 0.0.0.0:8000
