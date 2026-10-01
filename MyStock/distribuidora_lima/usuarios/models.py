from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):

    class TipoFuncionario(models.TextChoices):
        CAIXA = "CAIXA", "Caixa"
        GERENTE = "GERENTE", "Gerente"
        ESTOQUISTA = "ESTOQUISTA", "Estoquista"
        ADMIN = "ADMIN", "Administrador"

    cpf = models.CharField(
        max_length=11,
        unique=True,
        help_text="Apenas números, sem pontuação (validação fica na camada de serializer/form).",
    )
    tipo_funcionario = models.CharField(
        max_length=20,
        choices=TipoFuncionario.choices,
    )

    class Meta:
        db_table = "usuarios"
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"

    def save(self, *args, **kwargs):
        if self.tipo_funcionario == self.TipoFuncionario.ADMIN:
            self.is_staff = True
            self.is_superuser = True
        super().save(*args, **kwargs)

    def __str__(self):
        return self.get_full_name() or self.username