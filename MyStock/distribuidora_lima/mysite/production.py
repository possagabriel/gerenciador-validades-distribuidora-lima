"""Configuração para Gunicorn atrás de um proxy HTTPS confiável no mesmo servidor."""

import os

from django.core.exceptions import ImproperlyConfigured

from .settings import *  # noqa: F403,F401

DEBUG = False
if not SECRET_KEY or len(SECRET_KEY) < 50 or SECRET_KEY == "development-only-key-change-before-deployment":
    raise ImproperlyConfigured("Defina uma SECRET_KEY aleatória com pelo menos 50 caracteres.")

ALLOWED_HOSTS = [host.strip() for host in os.environ.get("ALLOWED_HOSTS", "").split(",") if host.strip()]
if not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS:
    raise ImproperlyConfigured("Defina ALLOWED_HOSTS com o domínio real, sem curinga.")

CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if origin.strip()]
if not CSRF_TRUSTED_ORIGINS or any(not origin.startswith("https://") for origin in CSRF_TRUSTED_ORIGINS):
    raise ImproperlyConfigured("Defina CSRF_TRUSTED_ORIGINS com a origem HTTPS real.")

SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
STATIC_ROOT = BASE_DIR / "staticfiles"  # noqa: F405
