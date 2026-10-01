from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Usuario

@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):

    list_display = (
        "username",
        "first_name",
        "last_name",
        "cpf",
        "tipo_funcionario",
        "is_staff",
        "is_active",
    )
    list_filter = ("tipo_funcionario", "is_staff", "is_active")
    search_fields = ("username", "first_name", "last_name", "cpf")
    ordering = ("username",)

    fieldsets = UserAdmin.fieldsets + (
        ("Dados profissionais", {"fields": ("cpf", "tipo_funcionario")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Dados profissionais", {"fields": ("cpf", "tipo_funcionario")}),
    )