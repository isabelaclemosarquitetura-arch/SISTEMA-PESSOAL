# Relatorio de auditoria - Sistema Pessoal

Data: 18/08/2026

## 1. BUGS ENCONTRADOS

### CRITICA - Exclusao do Financeiro podia voltar apos recarregar
- Problema: o salvamento em `localStorage` era atrasado em 350ms. Se a pagina fosse recarregada logo apos excluir, a exclusao podia nao ser gravada.
- Onde acontece: `pages/index.js`, funcao `save`.
- Causa provavel: persistencia assíncrona por debounce.
- Solucao aplicada: gravar `sp_data` imediatamente a cada `update`.

### CRITICA - Seed financeiro poderia recriar dados padrao
- Problema: a existencia de `aplicarSeedFinanceiro` em `lib/finance.js` representa risco de recriar Conta Vivo, Amazon, Google One etc. quando chamada.
- Onde acontece: funcao exportada em `lib/finance.js`.
- Causa provavel: seed antigo pensado para primeira carga.
- Estado atual: nao ha chamada ativa em `pages/index.js`; lista vazia permanece vazia.
- Solucao recomendada: manter seed desativado ou transformar em importacao manual explicita.

### ALTA - Edicao/exclusao de projeto nao remove automaticamente lancamentos financeiros
- Problema: excluir um projeto apaga o projeto, mas pode deixar lancamentos financeiros ligados a `_projetoId`.
- Onde acontece: `components/TrabalhoProjetos.js`, `handleDeleteProjeto`.
- Causa provavel: exclusao nao sincroniza entidades relacionadas.
- Solucao recomendada: ao excluir projeto, perguntar se remove ou desvincula lancamentos financeiros.

### ALTA - Confirmacoes por `window.confirm` sao ambiguas para parcelas/recorrencias
- Problema: "OK = Todas | Cancelar = Somente esta" pode causar acao errada.
- Onde acontece: `components/FinanceiroLancamentos.js`.
- Solucao recomendada: modal com botoes claros: "Somente esta", "Todas futuras", "Cancelar".

### MEDIA - Cartoes e investimentos excluem sem confirmacao
- Onde acontece: `FinanceiroCartoes.js`, `FinanceiroInvestimentos.js`.
- Impacto: exclusao acidental.
- Solucao recomendada: confirmar antes de excluir.

## 2. PROBLEMAS DE UX/UI

- ALTA: fluxo de recebimento parcial usa `window.prompt`, visualmente diferente do sistema e sujeito a data invalida.
- MEDIA: Financeiro tem muitos controles no topo e pode ficar denso no celular.
- MEDIA: botoes de tabela ainda misturam texto longo com acoes criticas; icones padronizados ajudariam.
- MEDIA: alguns textos usam emoji como parte da navegacao, o que pode reduzir consistencia visual.
- BAIXA: feedbacks somem automaticamente e nao ficam em historico de erro.

## 3. AUTOMACOES POSSIVEIS

- Criar recebimentos de projeto automaticamente ao salvar valor/data/parcelamento.
- Atualizar Financeiro ao editar valor, data ou status de recebimento no projeto.
- Gerar gastos de trabalho como despesas vinculadas.
- Calcular data fim de projeto pela duracao.
- Calcular recebido, pendente, lucro previsto e lucro realizado sem campos manuais.
- Detectar vencidos por data e status, nao por preenchimento manual.

## 4. ETAPAS QUE PODEM SER ELIMINADAS

- Nao exigir cadastro duplicado em "Recebimentos" se o projeto ja tem valor, forma de pagamento e vencimento.
- Substituir prompts de recebimento parcial por campos no proprio recebimento.
- Ao criar gasto de trabalho, preencher projeto/codigo/cliente automaticamente.
- Ao cadastrar receita vinculada a projeto pelo Financeiro, buscar dados do projeto e evitar redigitacao.

## 5. MELHORIAS NO FINANCEIRO

- CRITICA: manter persistencia imediata para qualquer criar/editar/excluir.
- ALTA: diferenciar valores previstos, realizados e parciais em todos os cards.
- ALTA: melhorar modal de exclusao de parcelas/recorrencias.
- MEDIA: filtro por origem existe, mas poderia usar um campo `origem` explicito em vez de inferir por categoria.
- MEDIA: duplicar lancamento vinculado a Trabalho deveria remover o vinculo ou perguntar se e copia pessoal.

## 6. MELHORIAS NO TRABALHO/PROJETOS

- CRITICA: exclusao de projeto deve tratar os lancamentos vinculados.
- ALTA: editar valor/parcelamento de um projeto existente deveria recalcular recebimentos com confirmacao.
- ALTA: recebimento parcial deve ser formulario nativo, nao prompt.
- MEDIA: gastos deveriam permitir pendente/pago; hoje gasto nasce como pago.
- MEDIA: aba "Recebimentos" ainda existe, mas deve funcionar como lista operacional gerada pelo projeto, nao recadastro manual.

## 7. MELHORIAS NO DASHBOARD

- ALTA: separar "receita prevista", "recebido", "a receber", "despesa prevista" e "pago".
- MEDIA: dashboard geral e dashboard trabalho usam conceitos parecidos; padronizar nomes.
- MEDIA: exibir alertas de lancamentos de Trabalho sem correspondencia no Financeiro.

## 8. MELHORIAS DE DESIGN

- ALTA: substituir confirm/prompt nativos por modais consistentes.
- MEDIA: padronizar acoes de tabela em largura fixa, com labels ou icones consistentes.
- MEDIA: reduzir densidade visual de formularios longos com secoes.
- BAIXA: revisar hierarquia de badges para reduzir excesso de cores simultaneas.

## 9. MELHORIAS MOBILE

- ALTA: tabelas financeiras precisam de versao em cards ou linhas empilhadas no celular.
- MEDIA: filtros e meses ocupam muito espaco horizontal.
- MEDIA: formularios de projeto/financeiro tem muitos campos na mesma linha.

## 10. PROBLEMAS DE DADOS/PERSISTENCIA

- CRITICA: dados estao apenas em `localStorage`; limpar cache ou trocar navegador pode perder tudo.
- ALTA: nao ha historico/auditoria de alteracoes.
- ALTA: relacionamento Trabalho-Financeiro depende de IDs convencionais (`_projetoId`, ids iguais em recebimento/lancamento).
- MEDIA: nao ha validacao forte de datas digitadas em prompt.
- MEDIA: seed financeiro deve continuar sem chamada automatica.

## 11. PRIORIDADE

- CRITICA: persistencia imediata; impedir seed automatico; tratar exclusao de projeto com vinculos.
- ALTA: formularios nativos para parcial; origem explicita; dashboards com previsto/realizado/parcial.
- MEDIA: modais melhores; responsividade de tabelas; confirmacao em cartoes/investimentos.
- BAIXA: refinamentos visuais de badges, emojis e microcopy.

## 12. PLANO DE MELHORIA

1. Consolidar modelo de dados: `origem`, `projectId`, `workTransactionId`, `valorOriginal`, `valorRecebido`.
2. Criar modais seguros para excluir parcela, recorrencia e projeto com vinculos.
3. Trocar recebimento parcial por formulario nativo.
4. Recalcular dashboards com previsto/realizado/parcial em todos os modulos.
5. Criar visual mobile em cards para tabelas grandes.
6. Avaliar backend/backup automatico quando o uso em mais de um dispositivo for necessario.

## TESTES REALIZADOS

- `npm run build`: sucesso.
- Teste programatico de lista financeira vazia: permaneceu vazia, sem seed.
- Teste programatico de recorrencia ativa: continua gerando proximas ocorrencias.
- Teste programatico de vencimento: despesa pendente vencida retorna vencida; despesa paga nao retorna vencida.
- Teste programatico de parcial: R$ 3.000 total, R$ 1.000 recebido, R$ 2.000 pendente.
- Teste visual por navegador: iniciado, mas a ponte do navegador ficou bloqueada pelo sandbox na continuacao; por isso nao concluí cliques completos via UI nesta etapa.
