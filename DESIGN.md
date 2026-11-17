# Redesenho mobile — Distribuidora Lima

## Diagnóstico

- O resumo ficava escondido dentro da pilha de Produtos, e Relatórios e Descontos ocupavam abas permanentes apesar de serem consultas secundárias.
- Símbolos de texto diferentes faziam o papel de ícones. Cards, botões e campos tinham pesos visuais parecidos, reduzindo a hierarquia.
- A ação de cadastrar produto dividia o topo da lista com o leitor. A busca e o estado vazio competiam por atenção.

## Navegação

| Aba fixa | Tela inicial | Destinos |
| --- | --- | --- |
| Início | Visão geral, lotes críticos e atalho de cadastro | Lote, Novo produto |
| Produtos | Lista e busca | Novo produto, detalhe, códigos, lotes do produto, leitor |
| Lotes | Lista com filtros | Detalhe do lote |
| Descontos (gerência) | Sugestões por lote e categoria | Consulta dos preços sugeridos |
| Mais | Menu | Relatórios, Categorias, Lixeira, sair |

A navegação principal usa quatro abas, mais a aba Descontos para a gerência. As telas internas usam a pilha nativa para voltar. O leitor de QR e código de barras fica visível em Produtos e nos campos de cadastro de códigos; o botão de adicionar fica perto do polegar. Listas e análises aceitam puxar para atualizar.

## Tema

Os valores ficam em `src/components/theme.ts`: verde `#176B50` como cor primária, fundo `#F6F7F4`, texto `#17251E`, além de escalas de espaçamento, tipo, raio e sombra. O app usa a fonte do sistema e Ionicons. Campos, botões, cards e chips têm raios próprios.

## Objetivo de cada tela

- Início: mostrar a prioridade do dia e abrir o cadastro.
- Produtos: encontrar ou cadastrar um produto.
- Novo produto: salvar os dados necessários, com categoria e código de barras opcionais no mesmo fluxo já existente.
- Produto: consultar preço, códigos e lotes.
- Lotes: filtrar e abrir um lote.
- Lote: consultar validade, estoque e custo.
- Leitor: localizar ou iniciar o cadastro de um produto pelo QR ou código de barras.
- Relatórios: consultar prejuízo no período.
- Descontos: consultar sugestões calculadas pela API e explicar quando ainda não há regras configuradas.
- Mais: reunir consultas secundárias e saída da conta.
