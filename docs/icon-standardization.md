# Padronização de Ícones (Font Awesome)

Este documento resume as mudanças realizadas para substituir emojis por ícones do Font Awesome e melhorar a acessibilidade.

## Objetivos
- Remover emojis usados em botões/menus e adotar `<i class="fa*">` do Font Awesome.
- Assegurar acessibilidade via `aria-label` nos botões e `aria-hidden="true"` nos ícones decorativos.
- Evitar itálico acidental em ícones tipográficos.

## Alterações Principais
- HTML: ícones de seta dos submenus passaram de `?` para `<i class="arrow-icon" aria-hidden="true"></i>` e são estilizados via CSS.
- JS: substituição de emojis em botões de ação por ícones FA
  - `assets/js/contratos-mensalidades.js`: `fa-eye`, `fa-money-bill`, `fa-pen-to-square`, `fa-trash`.
  - `assets/js/contratos-ativos.js`: `fa-pen-to-square`, `fa-eye`, `fa-info-circle`.
  - `assets/js/pesquisar-associados.js`: `fa-pen-to-square`, `fa-eye`.
  - `assets/js/renovacoes-pendentes.js`: `fa-pen-to-square`, `fa-eye`, `fa-rotate-right`.
  - `assets/js/contratos-adimplentes.js`: `fa-eye`.
  - `assets/js/contas-pagar.js`: `fa-eye`.
- CSS: regra global anti-itálico adicionada em `assets/css/styles.css`:

```css
.fa, .fas, .far, .fab, i.fa, i.fas, i.far, i.fab { font-style: normal; }
[class^="icon-"]::before, [class*=" icon-"]::before { font-style: normal; }
```

## Teste de Regressão Leve
- Arquivo: `assets/js/icon-regression-test.js`.
- Ativação: adicionar `?iconTest=1` (ou `?icon-test=1`) à URL.
- Exibe um overlay com contagem de:
  - Nós com emojis em texto.
  - `arrow-icon` com texto residual.
  - Botões `.action-btn` sem `<i class="fa*">`.

## Próximos Passos
- Gradualmente incluir o script de teste nas páginas principais (defer, sem impacto quando não ativado).
- Ampliar verificação para classes específicas de botões conforme surgirem novas telas.