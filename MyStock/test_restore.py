#!/usr/bin/env python3
"""Restaura um backup em banco descartável com nome aleatório e verifica tabelas."""

import argparse
import os
from pathlib import Path
import subprocess
import uuid

from backup_db import ROOT, database_environment


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("backup", type=Path)
    parser.add_argument("--env-file", type=Path, default=ROOT / "distribuidora_lima" / ".env")
    parser.add_argument("--docker-container", help="Contêiner PostgreSQL local onde postgres pode criar o banco temporário")
    args = parser.parse_args()
    if not args.backup.is_file():
        raise SystemExit("Arquivo de backup não encontrado.")
    environment, connection = database_environment(args.env_file)
    database_name = f"validades_restore_{uuid.uuid4().hex[:12]}"
    options = connection[:-1]
    created = False
    try:
        if args.docker_container:
            subprocess.run(["docker", "exec", args.docker_container, "createdb", "--username", "postgres", "--owner", os.environ["DB_USER"], database_name], check=True)
        else:
            subprocess.run(["createdb", *options, database_name], env=environment, check=True)
        created = True
        subprocess.run(["pg_restore", "--no-owner", "--no-privileges", "--exit-on-error", *options, "--dbname", database_name, str(args.backup)], env=environment, check=True)
        resultado = subprocess.run(["psql", *options, "--dbname", database_name, "--tuples-only", "--no-align", "--command", "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"], env=environment, check=True, capture_output=True, text=True)
        if int(resultado.stdout.strip()) == 0:
            raise SystemExit("A restauração terminou sem tabelas públicas.")
        print(f"Restauração verificada em banco temporário: {resultado.stdout.strip()} tabelas.")
    finally:
        if created:
            if args.docker_container:
                subprocess.run(["docker", "exec", args.docker_container, "dropdb", "--username", "postgres", database_name], check=True)
            else:
                subprocess.run(["dropdb", *options, database_name], env=environment, check=True)


if __name__ == "__main__":
    main()
