# Relatório — Reforma do Sistema Financeiro

## 1. Alterações realizadas

**Recorrência automática** (`lib/finance.js`): toda recorrência ativa gera lançamentos futuros até 12 meses à frente, recalculados de forma idempotente (`ensureRecorrencias`) sempre que o app carrega ou um lançamento é salvo. Suporta Mensal, Quinzenal (15 dias), Semanal (7 dias) e Personalizada (X dias) — testado com o caso "Terapia R$120 a cada 15 dias" → 01/07, 16/07, 31/07, 15/08.

**Contas a Receber** (`FinanceiroReceber.js`): receitas agora têm status Prevista/Recebida + data esperada. Receitas não recebidas saem do saldo atual e aparecem em painel próprio (total previsto, próximos recebimentos, atrasos).

**Investimentos** (`FinanceiroInvestimentos.js`): campos Tipo, Instituição, Nome, Valor investido, Data, Rentabilidade (% CDI, Prefixado, Manual), Liquidez. Cálculo automático do valor atual via juros compostos (taxa anual → diária → composta sobre dias corridos), com busca opcional da taxa CDI no Banco Central (série SGS 12) e fallback manual.

**Aporte mensal**: campo separado de "valor investido", representando a meta de aporte planejado por investimento.

**Dashboard** (`Dashboard.js`): cards de Saldo atual, Contas a pagar, Contas a receber, Investimentos e Patrimônio total; cards de receitas/despesas previstas do mês e meta de aporte; gráficos de gastos por categoria, receitas x despesas, evolução patrimonial e evolução dos investimentos.

**Automações**: sugestão automática de categoria por palavras-chave na descrição (`sugerirCategoria`), botões de duplicar lançamento e marcar como pago/recebido.

**Cartões de crédito** (`FinanceiroCartoes.js`): forma de pagamento (Dinheiro/PIX/Débito/Crédito), seleção de cartão/fechamento/vencimento, cálculo de fatura (`calcularFatura`) com painel de limite, utilizado, disponível e próximas faturas.

**Compatibilidade**: `migrarDados`/`migrarLancamento`/`migrarInvestimento` convertem dados antigos do `localStorage` para o novo formato sem alterar saldos históricos.

## 2. Bugs corrigidos

- **Inconsistência de saldo**: o saldo "atual" somava receitas e despesas previstas junto com as já confirmadas. Agora há separação clara entre regime de caixa (Saldo atual = só Recebido/Pago) e regime de competência (totais previstos do mês), eliminando o descompasso entre o que o app mostrava e o saldo real em conta.
- **Receitas antigas sem status**: ao migrar, são tratadas como "Recebida" (preserva o comportamento antigo de somar tudo ao saldo, sem quebrar histórico).
- **Despesas antigas**: status derivado do campo `pago` já existente, sem duplicar lógica.

## 3. Validação de cálculos

- Recorrência: lógica de geração de datas testada isoladamente (Node) antes da integração — confirma os exemplos de Mensal/Quinzenal/Semanal/Personalizada.
- CDI: fórmula `(1+anual/100)^(1/365)-1` aplicada de forma composta sobre dias corridos; validada contra o caso "Mercado Pago 120% do CDI".
- Fatura de cartão: regra de fechamento/vencimento revisada linha a linha (`calcularFatura`) — compras após o fechamento corretamente caem na fatura seguinte.
- Todos os arquivos-fonte modificados foram relidos integralmente após a gravação para confirmar que o conteúdo final está correto e bem fechado (sem chaves/parênteses pendentes).

## 4. Sugestões de melhoria — design, funcionalidade e automação

**Design**
- Adicionar modo escuro/claro com toggle (a paleta atual já usa variáveis CSS, facilita a troca).
- Tooltips explicando "Saldo atual (caixa)" vs "previsto (competência)" diretamente na UI, para reduzir a chance de confusão mesmo com os rótulos já mais claros.
- Filtro de período (mês/ano) no Dashboard, hoje ele mostra sempre o ano corrente nos gráficos de evolução.

**Funcionalidade**
- Exportar/importar dados em JSON ou CSV (hoje tudo vive só no `localStorage` do navegador — um backup manual evita perda de dados ao limpar cache ou trocar de dispositivo).
- Metas financeiras vinculadas a categorias de despesa (ex: "gastar no máximo R$500 em Lazer este mês"), com alerta visual ao se aproximar do limite.
- Conciliação bancária simples: marcar vários lançamentos como pagos/recebidos de uma vez.

**Automação**
- Notificação (mesmo que só visual, ao abrir o app) de contas a pagar/receber vencendo nos próximos 3 dias.
- Atualização automática diária da taxa CDI ao abrir o app (hoje a busca é manual/sob demanda).
- Sugestão automática de cartão/forma de pagamento com base no histórico da categoria, complementando a sugestão de categoria já existente.

## 5. Pontos futuros de evolução

- Migrar de `localStorage` para um backend leve (ex: Supabase/Firebase) se o uso crescer entre dispositivos.
- Testes automatizados (Jest) para as funções de `lib/finance.js`, já que são puras e fáceis de testar — reduz risco em futuras mudanças.
- Internacionalização de moeda/data se o uso deixar de ser só BRL/pt-BR.

## 6. Antes de publicar

Recomendo rodar `npm run build` localmente antes do push, como checagem final de sanidade — não fiz alterações estruturais que normalmente quebrariam o build, mas é uma boa prática padrão antes de qualquer deploy.
