"""Banco isolado para a suíte local; nunca acessa os dados do PostgreSQL."""

from .settings import *  # noqa: F401,F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
