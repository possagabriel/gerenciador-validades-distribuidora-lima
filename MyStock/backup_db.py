#!/usr/bin/env python3
"""Cria arquivo pg_dump em formato custom, confere o arquivo e publica de forma atômica."""

import argparse
import os
from pathlib import Path
import subprocess
import tempfile
from datetime import datetime, timezone

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parent


def database_environment(env_file: Path) -> tuple[dict[str, str], list[str]]:
    load_dotenv(env_file, override=False)
    name = os.environ.get("DB_NAME")
    user = os.environ.get("DB_USER")
    password = os.environ.get("DB_PASSWORD")
    if not all((name, user, password)):
        raise SystemExit("Configure DB_NAME, DB_USER e DB_PASSWORD antes do backup.")
    environment = os.environ.copy()
    environment["PGPASSWORD"] = password
    connection = ["--host", os.environ.get("DB_HOST", "localhost"), "--port", os.environ.get("DB_PORT", "5432"), "--username", user, "--no-password"]
    return environment, connection + [name]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", type=Path, default=ROOT / "distribuidora_lima" / ".env")
    parser.add_argument("--destination", type=Path, default=None)
    args = parser.parse_args()
    environment, connection = database_environment(args.env_file)
    destination = args.destination or Path(os.environ.get("BACKUP_DIR", ROOT / "backups"))
    destination.mkdir(parents=True, exist_ok=True, mode=0o700)
    destination.chmod(0o700)
    fd, temporary = tempfile.mkstemp(prefix=".incompleto-", suffix=".dump", dir=destination)
    os.close(fd)
    try:
        subprocess.run(["pg_dump", "--format=custom", "--no-owner", "--file", temporary, *connection], env=environment, check=True)
        subprocess.run(["pg_restore", "--list", temporary], stdout=subprocess.DEVNULL, check=True)
        filename = f"validades-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}.dump"
        final = destination / filename
        if final.exists():
            raise SystemExit(f"O backup {final} já existe; tente novamente em um segundo.")
        os.replace(temporary, final)
        print(final)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


if __name__ == "__main__":
    main()
