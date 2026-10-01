from django import forms
from django.contrib.auth.forms import AuthenticationForm

from produtos.models import Categoria, Lote, Produto, RegraDesconto


class LoginForm(AuthenticationForm):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].widget.attrs.update({"class": "form-control", "autofocus": True})
        self.fields["password"].widget.attrs.update({"class": "form-control"})


class BootstrapFormMixin:

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for campo in self.fields.values():
            if isinstance(campo.widget, forms.CheckboxInput):
                campo.widget.attrs.setdefault("class", "form-check-input")
            elif isinstance(campo.widget, (forms.Select, forms.SelectMultiple)):
                campo.widget.attrs.setdefault("class", "form-select")
            else:
                campo.widget.attrs.setdefault("class", "form-control")


class CategoriaForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = Categoria
        fields = ["nome", "dias_atencao", "dias_critico"]


class ProdutoForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = Produto
        fields = ["nome", "categoria", "preco_venda"]


class LoteForm(BootstrapFormMixin, forms.ModelForm):

    class Meta:
        model = Lote
        fields = [
            "produto",
            "quantidade",
            "custo_unitario_compra",
            "data_validade",
            "tempo_vencimento",
        ]
        widgets = {
            "data_validade": forms.DateTimeInput(
                attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M"
            ),
        }


class PrejuizoFiltroForm(BootstrapFormMixin, forms.Form):
    data_inicio = forms.DateField(
        required=False, widget=forms.DateInput(attrs={"type": "date"})
    )
    data_fim = forms.DateField(
        required=False, widget=forms.DateInput(attrs={"type": "date"})
    )

    def clean(self):
        cleaned_data = super().clean()
        inicio = cleaned_data.get("data_inicio")
        fim = cleaned_data.get("data_fim")
        if inicio and fim and inicio > fim:
            raise forms.ValidationError(
                "A data inicial não pode ser depois da data final."
            )
        return cleaned_data


class RegraDescontoForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = RegraDesconto
        fields = ["categoria", "percentual", "dias_para_vencimento"]

    def clean(self):
        cleaned_data = super().clean()
        categoria = cleaned_data.get("categoria")
        percentual = cleaned_data.get("percentual")
        dias = cleaned_data.get("dias_para_vencimento")

        if categoria and percentual is not None and dias is not None:
            existe = RegraDesconto.objects.filter(
                categoria=categoria,
                percentual=percentual,
                dias_para_vencimento=dias,
            ).exists()
            if existe:
                raise forms.ValidationError(
                    "Essa regra já existe (mesma categoria, percentual e dias)."
                )
        return cleaned_data


class SugestaoDescontoFiltroForm(BootstrapFormMixin, forms.Form):
    categoria = forms.ModelChoiceField(
        queryset=Categoria.objects.all(),
        required=False,
        empty_label="Todas as categorias",
    )


class LoteFiltroForm(BootstrapFormMixin, forms.Form):

    categoria = forms.ModelChoiceField(
        queryset=Categoria.objects.all(),
        required=False,
        empty_label="Todas as categorias",
    )
    nivel_vencimento = forms.ChoiceField(
        choices=[("", "Todos os níveis")] + list(Lote.NivelVencimento.choices),
        required=False,
    )
    esgotado = forms.ChoiceField(
        choices=[
            ("", "Todos"),
            ("1", "Somente esgotados"),
            ("0", "Somente não esgotados"),
        ],
        required=False,
    )
    mes = forms.ChoiceField(
        choices=[("", "Qualquer mês")] + [(f"{m:02d}", f"{m:02d}") for m in range(1, 13)],
        required=False,
    )
    ano = forms.ChoiceField(required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        anos_disponiveis = (
            Lote.objects.dates("data_cadastro", "year", order="DESC")
        )
        self.fields["ano"].choices = [("", "Qualquer ano")] + [
            (str(d.year), str(d.year)) for d in anos_disponiveis
        ]