from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import Usuario


def cargo(usuario):
    if not usuario or not usuario.is_authenticated or not usuario.is_active:
        return None
    if usuario.is_superuser:
        return Usuario.TipoFuncionario.ADMIN
    return usuario.tipo_funcionario


class SomenteAdmin(BasePermission):
    def has_permission(self, request, view):
        return cargo(request.user) == Usuario.TipoFuncionario.ADMIN


class SomenteGerencia(BasePermission):
    def has_permission(self, request, view):
        return cargo(request.user) in (Usuario.TipoFuncionario.GERENTE, Usuario.TipoFuncionario.ADMIN)


class PermissaoPorCargo(BasePermission):
    """Permissão explícita por ação; os papéis permitidos ficam em cada ViewSet."""

    def has_permission(self, request, view):
        papel = cargo(request.user)
        if papel is None:
            return False
        if request.method in SAFE_METHODS:
            permitidos = getattr(view, "cargos_leitura", ())
        elif getattr(view, "action", None) == "destroy":
            permitidos = getattr(view, "cargos_exclusao", ())
        else:
            permitidos = getattr(view, "cargos_escrita", ())
        return papel in permitidos


class PermissaoMovimento(BasePermission):
    def has_permission(self, request, view):
        papel = cargo(request.user)
        if papel is None:
            return False
        if request.method in SAFE_METHODS:
            return True
        if papel == Usuario.TipoFuncionario.CAIXA:
            return request.data.get("tipo") == "SAIDA"
        return papel in (Usuario.TipoFuncionario.ESTOQUISTA, Usuario.TipoFuncionario.GERENTE, Usuario.TipoFuncionario.ADMIN)
