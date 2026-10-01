from django.core.management.base import BaseCommand
from django.utils import timezone

from produtos.models import Lote


class Command(BaseCommand):
    """
    Recalcula o nivel_vencimento de todos os lotes, usando os thresholds
    (dias_atencao / dias_critico) definidos na categoria do produto de cada
    lote.
    """

    help = (
        "Recalcula o nivel_vencimento de todos os lotes (exceto os marcados como "
        "esgotados) com base nos thresholds da categoria do produto."
    )

    def handle(self, *args, **options):
        hoje = timezone.now().date()

        lotes = list(
            Lote.objects.select_related("produto", "produto__categoria")
            .exclude(data_validade__isnull=True)
            .exclude(esgotado=True)
        )
        para_atualizar = []

        for lote in lotes:
            dias_restantes = (lote.data_validade.date() - hoje).days
            categoria = lote.produto.categoria

            if dias_restantes < 0:
                novo_nivel = Lote.NivelVencimento.VENCIDO
            elif dias_restantes <= categoria.dias_critico:
                novo_nivel = Lote.NivelVencimento.CRITICO
            elif dias_restantes <= categoria.dias_atencao:
                novo_nivel = Lote.NivelVencimento.ATENCAO
            else:
                novo_nivel = Lote.NivelVencimento.OK

            if lote.nivel_vencimento != novo_nivel:
                lote.nivel_vencimento = novo_nivel
                para_atualizar.append(lote)

        if para_atualizar:
            Lote.objects.bulk_update(para_atualizar, ["nivel_vencimento"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Concluído: {len(lotes)} lotes verificados, "
                f"{len(para_atualizar)} atualizados."
            )
        )