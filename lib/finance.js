// ─────────────────────────────────────────────────────────────────────────
// Núcleo de cálculo financeiro: recorrência, rendimento CDI/prefixado,
// faturas de cartão, sugestão automática de categoria e migração de dados
// salvos no localStorage para o novo formato (sem perder dados antigos).
// Funções puras (sem side-effects), fáceis de testar isoladamente.
// ─────────────────────────────────────────────────────────────────────────

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export const CATEGORIAS_RECEITA = ['Salário', 'Freelance', 'Projeto', 'Aluguel', 'Investimento', 'Recebimento Projeto', 'Outro']
export const CATEGORIAS_DESPESA = [
  'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer',
  'Roupas', 'Assinaturas', 'Cartão', 'Empréstimo', 'Telefonia',
  'Renegociação', 'Trabalho', 'MEI', 'Outro'
]

export const FORMAS_PAGAMENTO = ['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Boleto', 'Transferência']

export const TIPOS_RECORRENCIA = ['Mensal', 'Quinzenal', 'Semanal', 'Anual', 'Personalizada']

export const TIPOS_INVESTIMENTO = ['Renda Fixa', 'Renda Variável', 'CDB', 'Tesouro Direto', 'CDI', 'Outros']
export const INSTITUICOES_INVESTIMENTO = ['Mercado Pago', 'Nubank', 'Inter', 'Itaú', 'Outros']
export const RENTABILIDADE_TIPOS = ['% CDI', 'Prefixado', 'Manual']
export const LIQUIDEZ_OPCOES = ['Imediata (D+0)', 'D+1', 'D+30', 'No vencimento', 'Personalizada']

export const DEFAULT_CDI_ANUAL = 14.65 // usado só até a 1ª busca/edição manual

// ── datas ──────────────────────────────────────────────────────────────

function pad2(n) { return String(n).padStart(2, '0') }

export function toISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function parseISO(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function hojeISO() {
  return toISO(new Date())
}

function lastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function addMonthsClamped(date, months) {
  const day = date.getDate()
  const targetMonthIndex = date.getMonth() + months
  const year = date.getFullYear() + Math.floor(targetMonthIndex / 12)
  const monthIndex = ((targetMonthIndex % 12) + 12) % 12
  const lastDay = lastDayOfMonth(year, monthIndex)
  return new Date(year, monthIndex, Math.min(day, lastDay))
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function mesDeISO(iso) {
  const d = parseISO(iso)
  return d ? MESES[d.getMonth()] : ''
}

/** Converte data ISO (YYYY-MM-DD) para o padrão brasileiro DD/MM/AAAA. */
export function fmtDataBR(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

// ── parcelamento (CORRIGIDO) ────────────────────────────────────────────

/**
 * Gera lançamentos individuais para uma compra parcelada.
 * O `valorTotal` é o VALOR TOTAL DA COMPRA — dividido pela quantidade de parcelas.
 * O arredondamento garante que a soma das parcelas seja exatamente o valor total.
 *
 * @param {object} params
 * @param {number}  params.valorTotal    — valor total da compra/dívida
 * @param {number}  params.qtdParcelas   — número de parcelas
 * @param {string}  params.dataInicioISO — data da primeira parcela (ISO)
 * @param {object}  params.baseItem      — campos base do lançamento (exceto valor, parcela, vencimento, mes, id)
 * @returns {Array} array de lançamentos, um por parcela
 */
export function gerarParcelas({ valorTotal, qtdParcelas, dataInicioISO, baseItem }) {
  const total = Math.round(Number(valorTotal) * 100) // em centavos, para evitar floating point
  const qtd = Math.max(1, Math.floor(Number(qtdParcelas)))
  const valorBase = Math.floor(total / qtd)     // centavos por parcela (arredondado pra baixo)
  const resto = total - valorBase * qtd          // centavos restantes → vão para a última parcela

  const inicio = parseISO(dataInicioISO) || new Date()
  const lancamentos = []

  for (let i = 0; i < qtd; i++) {
    const isUltima = i === qtd - 1
    const valorCentavos = isUltima ? valorBase + resto : valorBase
    const valorFinal = valorCentavos / 100

    const dataVenc = addMonthsClamped(inicio, i)
    const dataISO = toISO(dataVenc)

    lancamentos.push({
      ...baseItem,
      id: `${baseItem.grupoId || Date.now()}-p${i + 1}`,
      valor: String(valorFinal.toFixed(2)),
      parcela: `${i + 1}/${qtd}`,
      vencimento: dataISO,
      mes: mesDeISO(dataISO),
      status: 'Pendente',
      pago: false,
      recorrente: false,
      recorrenciaGrupoId: '',
      _parcelaGrupoId: baseItem.grupoId || String(Date.now()),
      _valorTotalOriginal: valorTotal,
    })
  }
  return lancamentos
}

// ── recorrência ────────────────────────────────────────────────────────

/**
 * Gera as datas (ISO) das próximas ocorrências de uma recorrência, a partir
 * (exclusive) da data-base, até o horizonte `ateISO` (exclusive).
 */
export function gerarDatasRecorrencia({ dataBaseISO, tipo, intervaloDias, ateISO }) {
  if (!dataBaseISO) return []
  const base = parseISO(dataBaseISO)
  const limite = parseISO(ateISO)
  if (!base || !limite) return []
  const datas = []
  let i = 1
  while (i < 2000) {
    let next
    if (tipo === 'Mensal') next = addMonthsClamped(base, i)
    else if (tipo === 'Anual') next = addMonthsClamped(base, 12 * i)
    else if (tipo === 'Quinzenal') next = addDays(base, 15 * i)
    else if (tipo === 'Semanal') next = addDays(base, 7 * i)
    else next = addDays(base, Math.max(1, Number(intervaloDias) || 1) * i)

    if (next > limite) break
    datas.push(toISO(next))
    i++
  }
  return datas
}

/** Horizonte padrão: 12 meses a partir de hoje. */
export function horizonte12Meses(hojeRef = new Date()) {
  return toISO(addMonthsClamped(hojeRef, 12))
}

/**
 * Garante que toda recorrência ativa tenha lançamentos futuros gerados até
 * o horizonte de 12 meses. Chamada ao carregar o app e após salvar um
 * lançamento recorrente — cobre tanto "gerar 12 meses de uma vez" quanto
 * "completar dinamicamente conforme o tempo passa".
 * Retorna um novo array de lançamentos (imutável).
 */
export function ensureRecorrencias(lancamentos, hojeRef = new Date()) {
  const ate = horizonte12Meses(hojeRef)
  // Índice de IDs existentes para evitar duplicatas em chamadas repetidas
  const existingIds = new Set(lancamentos.map(l => String(l.id)))
  const porGrupo = new Map()
  lancamentos.forEach(l => {
    if (!l.recorrente || !l.recorrenciaGrupoId) return
    const atual = porGrupo.get(l.recorrenciaGrupoId)
    if (!atual || l.vencimento > atual.vencimento) porGrupo.set(l.recorrenciaGrupoId, l)
  })

  const novos = []
  porGrupo.forEach((ultimo) => {
    if (ultimo.recorrenciaAtiva === false) return
    const datas = gerarDatasRecorrencia({
      dataBaseISO: ultimo.vencimento,
      tipo: ultimo.recorrenciaTipo || 'Mensal',
      intervaloDias: ultimo.recorrenciaIntervaloDias,
      ateISO: ate,
    })
    datas.forEach((dataISO, idx) => {
      const newId = `${ultimo.recorrenciaGrupoId}-${dataISO}-${idx}`
      if (existingIds.has(newId)) return // já existe, não duplicar
      novos.push({
        ...ultimo,
        id: newId,
        vencimento: dataISO,
        mes: mesDeISO(dataISO),
        pago: false,
        status: ultimo.tipo === 'Receita' ? 'Prevista' : 'Pendente',
        dataRecebimento: '',
      })
    })
  })

  return novos.length ? [...lancamentos, ...novos] : lancamentos
}

// ── verificar pagamentos automáticos (Amelie Mais e similares) ────────

/**
 * Atualiza automaticamente lançamentos com pagamento automático quando a
 * data de vencimento já passou ou é hoje.
 */
export function aplicarPagamentosAutomaticos(lancamentos, hojeRef = new Date()) {
  const hoje = toISO(hojeRef)
  return lancamentos.map(l => {
    if (l.pagamentoAutomatico && l.status === 'Pendente' && l.vencimento && l.vencimento <= hoje) {
      return { ...l, status: 'Pago automaticamente', pago: true }
    }
    return l
  })
}

/**
 * Marca despesas como Vencido se o vencimento passou e ainda estão Pendente.
 */
export function aplicarVencidos(lancamentos, hojeRef = new Date()) {
  const hoje = toISO(hojeRef)
  return lancamentos.map(l => {
    if (l.tipo === 'Despesa' && l.status === 'Pendente' && l.vencimento && l.vencimento < hoje) {
      return { ...l, status: 'Vencido' }
    }
    return l
  })
}

// ── rendimento de investimentos ───────────────────────────────────────

function diasCorridosEntre(dataInicioISO, hojeRef) {
  const inicio = parseISO(dataInicioISO)
  if (!inicio) return 0
  return Math.max(0, Math.round((hojeRef - inicio) / 86400000))
}

/**
 * Rendimento por % do CDI: converte a taxa CDI anual em diária e aplica,
 * composta, sobre os dias corridos desde a data do investimento.
 */
export function calcularRendimentoCDI({ valorInvestido, dataInvestimentoISO, percentualCDI, taxaCDIAnualPct, hojeRef = new Date() }) {
  const valor = Number(valorInvestido) || 0
  const diasCorridos = diasCorridosEntre(dataInvestimentoISO, hojeRef)
  const taxaDiariaCDI = Math.pow(1 + (Number(taxaCDIAnualPct) || 0) / 100, 1 / 365) - 1
  const taxaDiariaContratada = taxaDiariaCDI * ((Number(percentualCDI) || 100) / 100)
  const valorAtual = valor * Math.pow(1 + taxaDiariaContratada, diasCorridos)
  return {
    diasCorridos,
    taxaDiariaPct: taxaDiariaContratada * 100,
    rendimentoAcumulado: valorAtual - valor,
    valorAtual,
  }
}

/** Rendimento prefixado: taxa anual fixa, convertida para diária, composta sobre dias corridos. */
export function calcularRendimentoPrefixado({ valorInvestido, dataInvestimentoISO, taxaAnualPct, hojeRef = new Date() }) {
  const valor = Number(valorInvestido) || 0
  const diasCorridos = diasCorridosEntre(dataInvestimentoISO, hojeRef)
  const taxaDiaria = Math.pow(1 + (Number(taxaAnualPct) || 0) / 100, 1 / 365) - 1
  const valorAtual = valor * Math.pow(1 + taxaDiaria, diasCorridos)
  return {
    diasCorridos,
    taxaDiariaPct: taxaDiaria * 100,
    rendimentoAcumulado: valorAtual - valor,
    valorAtual,
  }
}

/**
 * Calcula o valor atual de um investimento de acordo com o tipo de
 * rentabilidade cadastrado. Para "Manual", apenas retorna o valor atual
 * informado manualmente (comportamento antigo, preservado).
 */
export function calcularValorAtualInvestimento(item, taxaCDIAnualPct, hojeRef = new Date()) {
  const valorInvestido = Number(item.valorInvestido) || 0
  if (item.rentabilidadeTipo === '% CDI' && item.dataInvestimento) {
    const r = calcularRendimentoCDI({
      valorInvestido,
      dataInvestimentoISO: item.dataInvestimento,
      percentualCDI: item.rentabilidadeValor,
      taxaCDIAnualPct,
      hojeRef,
    })
    return { ...r, automatico: true }
  }
  if (item.rentabilidadeTipo === 'Prefixado' && item.dataInvestimento) {
    const r = calcularRendimentoPrefixado({
      valorInvestido,
      dataInvestimentoISO: item.dataInvestimento,
      taxaAnualPct: item.rentabilidadeValor,
      hojeRef,
    })
    return { ...r, automatico: true }
  }
  const valorAtual = Number(item.valorAtual || item.valorInvestido) || 0
  return {
    diasCorridos: item.dataInvestimento ? diasCorridosEntre(item.dataInvestimento, hojeRef) : null,
    taxaDiariaPct: null,
    rendimentoAcumulado: valorAtual - valorInvestido,
    valorAtual,
    automatico: false,
  }
}

/**
 * Busca a taxa CDI anual atual (Banco Central do Brasil, série SGS 12 =
 * CDI diário). Converte o fator diário em taxa anual (base 252 dias úteis,
 * convenção de mercado). Lança erro se a busca falhar — quem chamar deve
 * manter o último valor salvo (manual ou cacheado) como fallback.
 */
export async function buscarCDIAnualAtual() {
  const resp = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json')
  if (!resp.ok) throw new Error('Falha ao buscar CDI no Banco Central')
  const data = await resp.json()
  const diario = parseFloat(data?.[0]?.valor)
  if (!Number.isFinite(diario)) throw new Error('Resposta inválida da API do CDI')
  const anual = (Math.pow(1 + diario / 100, 252) - 1) * 100
  return { taxaAnual: anual, dataReferencia: data[0].data }
}

// ── faturas de cartão ──────────────────────────────────────────────────

/**
 * Dado a data de uma compra no crédito e o dia de fechamento/vencimento do
 * cartão, calcula a qual fatura (mês/ano) a compra pertence e quando essa
 * fatura vence.
 */
export function calcularFatura({ dataCompraISO, fechamentoDia, vencimentoDia }) {
  const d = parseISO(dataCompraISO)
  if (!d) return null
  let mes = d.getMonth()
  let ano = d.getFullYear()
  if (d.getDate() > fechamentoDia) {
    mes += 1
    if (mes > 11) { mes = 0; ano += 1 }
  }
  let dueMes = mes
  let dueAno = ano
  if (vencimentoDia <= fechamentoDia) {
    dueMes += 1
    if (dueMes > 11) { dueMes = 0; dueAno += 1 }
  }
  const lastDay = lastDayOfMonth(dueAno, dueMes)
  const dueDate = new Date(dueAno, dueMes, Math.min(vencimentoDia, lastDay))
  return { mes, ano, label: `${MESES[mes]}/${ano}`, vencimentoISO: toISO(dueDate) }
}

// ── categorização automática ───────────────────────────────────────────

const REGRAS_CATEGORIA = [
  { palavras: ['aluguel', 'condomínio', 'condominio', 'iptu'], categoria: 'Moradia' },
  { palavras: ['luz', 'energia', 'água', 'agua', 'gás', 'gas', 'internet'], categoria: 'Moradia' },
  { palavras: ['vivo', 'claro', 'tim', 'oi ', 'telefonia', 'celular'], categoria: 'Telefonia' },
  { palavras: ['mercado', 'supermercado', 'ifood', 'restaurante', 'padaria', 'feira'], categoria: 'Alimentação' },
  { palavras: ['uber', '99', 'combustível', 'combustivel', 'gasolina', 'estacionamento', 'transporte'], categoria: 'Transporte' },
  { palavras: ['farmácia', 'farmacia', 'drogaria', 'médico', 'medico', 'plano de saúde', 'plano de saude', 'terapia', 'psicólogo', 'psicologo'], categoria: 'Saúde' },
  { palavras: ['curso', 'faculdade', 'escola', 'livro'], categoria: 'Educação' },
  { palavras: ['cinema', 'show', 'viagem', 'passeio', 'bar'], categoria: 'Lazer' },
  { palavras: ['netflix', 'spotify', 'amazon', 'google one', 'amelie', 'assinatura', 'mensalidade'], categoria: 'Assinaturas' },
  { palavras: ['empréstimo', 'emprestimo', 'mercado pago'], categoria: 'Empréstimo' },
  { palavras: ['renegociação', 'renegociacao', 'nubank renego'], categoria: 'Renegociação' },
  { palavras: ['salário', 'salario', 'pagamento mensal'], categoria: 'Salário' },
  { palavras: ['freelance', 'projeto'], categoria: 'Freelance' },
  { palavras: ['mei', 'das mei'], categoria: 'MEI' },
]

/** Sugere uma categoria com base em palavras-chave na descrição (não sobrescreve escolha manual). */
export function sugerirCategoria(descricao) {
  const texto = (descricao || '').toLowerCase()
  if (!texto.trim()) return ''
  for (const regra of REGRAS_CATEGORIA) {
    if (regra.palavras.some(p => texto.includes(p))) return regra.categoria
  }
  return ''
}

// ── seed de dados financeiros ──────────────────────────────────────────

/**
 * Dados financeiros iniciais da Isabel.
 * Só são inseridos uma vez (verificação por _seedId).
 */
export function gerarDadosSeed() {
  const base = Date.now()
  const lancamentos = []

  // Helper para ID único
  const id = (suf) => `seed-${suf}`

  // 1. VIVO — Telefonia, recorrente mensal, dia 17
  // Primeiro lançamento em agosto/2026 (dia 17)
  const gId_vivo = id('vivo')
  lancamentos.push({
    id: gId_vivo,
    tipo: 'Despesa', categoria: 'Telefonia', descricao: 'Conta Vivo',
    valor: '80.00', status: 'Pendente', pago: false, observacao: '',
    parcela: '', vencimento: '2026-08-17', mes: 'Agosto',
    formaPagamento: 'Débito', cartao: '',
    recorrente: true, recorrenciaTipo: 'Mensal', recorrenciaAtiva: true,
    recorrenciaGrupoId: gId_vivo, recorrenciaIntervaloDias: '',
    pagamentoAutomatico: false, _seedId: 'vivo',
  })

  // 2. AMAZON — Assinatura anual, R$166,80, agosto/2026, dia 8
  // (anual — gera como lançamento único com recorrência anual)
  const gId_amazon = id('amazon')
  lancamentos.push({
    id: gId_amazon,
    tipo: 'Despesa', categoria: 'Assinaturas', descricao: 'Amazon',
    valor: '166.80', status: 'Pendente', pago: false,
    observacao: 'Assinatura anual — equivale R$13,90/mês',
    parcela: '', vencimento: '2026-08-08', mes: 'Agosto',
    formaPagamento: 'Crédito', cartao: 'Nubank',
    recorrente: true, recorrenciaTipo: 'Anual', recorrenciaAtiva: true,
    recorrenciaGrupoId: gId_amazon, recorrenciaIntervaloDias: '',
    pagamentoAutomatico: false, _seedId: 'amazon',
  })

  // 3. GOOGLE ONE — Assinatura mensal, R$9,99, dia 15
  const gId_google = id('google')
  lancamentos.push({
    id: gId_google,
    tipo: 'Despesa', categoria: 'Assinaturas', descricao: 'Google One',
    valor: '9.99', status: 'Pendente', pago: false, observacao: '',
    parcela: '', vencimento: '2026-08-15', mes: 'Agosto',
    formaPagamento: 'Crédito', cartao: 'Nubank',
    recorrente: true, recorrenciaTipo: 'Mensal', recorrenciaAtiva: true,
    recorrenciaGrupoId: gId_google, recorrenciaIntervaloDias: '',
    pagamentoAutomatico: false, _seedId: 'google-one',
  })

  // 4. AMELIE MAIS — R$9,90, mensal, dia 21, pagamento automático
  const gId_amelie = id('amelie')
  lancamentos.push({
    id: gId_amelie,
    tipo: 'Despesa', categoria: 'Assinaturas', descricao: 'Amelie Mais',
    valor: '9.90', status: 'Pendente', pago: false, observacao: 'Pagamento automático',
    parcela: '', vencimento: '2026-08-21', mes: 'Agosto',
    formaPagamento: 'Débito', cartao: '',
    recorrente: true, recorrenciaTipo: 'Mensal', recorrenciaAtiva: true,
    recorrenciaGrupoId: gId_amelie, recorrenciaIntervaloDias: '',
    pagamentoAutomatico: true, _seedId: 'amelie',
  })

  // 5. RENEGOCIAÇÃO NUBANK — 5 parcelas de R$104,85, início 03/08/2026
  // 1ª parcela: vencida (03/08/2026), demais: pendentes
  const grupoNubank = id('nubank-renego')
  const datasNubank = ['2026-08-03', '2026-09-03', '2026-10-03', '2026-11-03', '2026-12-03']
  datasNubank.forEach((data, i) => {
    const eVencida = data < '2026-08-18' // já passou
    lancamentos.push({
      id: `${grupoNubank}-p${i+1}`,
      tipo: 'Despesa', categoria: 'Renegociação', descricao: 'Renegociação Nubank',
      valor: '104.85', parcela: `${i+1}/5`,
      status: eVencida ? 'Vencido' : 'Pendente', pago: false, observacao: '',
      vencimento: data, mes: mesDeISO(data),
      formaPagamento: 'Boleto', cartao: '',
      recorrente: false, recorrenciaGrupoId: '',
      pagamentoAutomatico: false, _seedId: `nubank-renego-p${i+1}`,
      _parcelaGrupoId: grupoNubank, _valorTotalOriginal: 524.25,
    })
  })

  // 6. EMPRÉSTIMO MP 1 — R$8,68 × 2 (28/08 e 28/09)
  const grupoMp1 = id('mp1')
  ;[['2026-08-28','Agosto'],['2026-09-28','Setembro']].forEach(([data, mes], i) => {
    lancamentos.push({
      id: `${grupoMp1}-p${i+1}`,
      tipo: 'Despesa', categoria: 'Empréstimo', descricao: 'Empréstimo Mercado Pago 1',
      valor: '8.68', parcela: `${i+1}/2`, status: 'Pendente', pago: false, observacao: '',
      vencimento: data, mes,
      formaPagamento: 'Débito', cartao: '',
      recorrente: false, recorrenciaGrupoId: '',
      pagamentoAutomatico: false, _seedId: `mp1-p${i+1}`,
      _parcelaGrupoId: grupoMp1, _valorTotalOriginal: 17.36,
    })
  })

  // 7. EMPRÉSTIMO MP 2 — R$14,94 × 2
  const grupoMp2 = id('mp2')
  ;[['2026-08-28','Agosto'],['2026-09-28','Setembro']].forEach(([data, mes], i) => {
    lancamentos.push({
      id: `${grupoMp2}-p${i+1}`,
      tipo: 'Despesa', categoria: 'Empréstimo', descricao: 'Empréstimo Mercado Pago 2',
      valor: '14.94', parcela: `${i+1}/2`, status: 'Pendente', pago: false, observacao: '',
      vencimento: data, mes,
      formaPagamento: 'Débito', cartao: '',
      recorrente: false, recorrenciaGrupoId: '',
      pagamentoAutomatico: false, _seedId: `mp2-p${i+1}`,
      _parcelaGrupoId: grupoMp2, _valorTotalOriginal: 29.88,
    })
  })

  // 8. EMPRÉSTIMO MP 3 — R$54,53 × 3
  const grupoMp3 = id('mp3')
  ;[['2026-08-28','Agosto'],['2026-09-28','Setembro'],['2026-10-28','Outubro']].forEach(([data, mes], i) => {
    lancamentos.push({
      id: `${grupoMp3}-p${i+1}`,
      tipo: 'Despesa', categoria: 'Empréstimo', descricao: 'Empréstimo Mercado Pago 3',
      valor: '54.53', parcela: `${i+1}/3`, status: 'Pendente', pago: false, observacao: '',
      vencimento: data, mes,
      formaPagamento: 'Débito', cartao: '',
      recorrente: false, recorrenciaGrupoId: '',
      pagamentoAutomatico: false, _seedId: `mp3-p${i+1}`,
      _parcelaGrupoId: grupoMp3, _valorTotalOriginal: 163.59,
    })
  })

  // 9. EMPRÉSTIMO MP 4 — R$6,10 × 3
  const grupoMp4 = id('mp4')
  ;[['2026-08-28','Agosto'],['2026-09-28','Setembro'],['2026-10-28','Outubro']].forEach(([data, mes], i) => {
    lancamentos.push({
      id: `${grupoMp4}-p${i+1}`,
      tipo: 'Despesa', categoria: 'Empréstimo', descricao: 'Empréstimo Mercado Pago 4',
      valor: '6.10', parcela: `${i+1}/3`, status: 'Pendente', pago: false, observacao: '',
      vencimento: data, mes,
      formaPagamento: 'Débito', cartao: '',
      recorrente: false, recorrenciaGrupoId: '',
      pagamentoAutomatico: false, _seedId: `mp4-p${i+1}`,
      _parcelaGrupoId: grupoMp4, _valorTotalOriginal: 18.30,
    })
  })

  // 10. PAGAMENTO MEI — R$86,50, datas específicas (21/09 e 20/10)
  ;[['2026-09-21','Setembro'],['2026-10-20','Outubro']].forEach(([data, mes], i) => {
    lancamentos.push({
      id: id(`mei-${i+1}`),
      tipo: 'Despesa', categoria: 'MEI', descricao: 'Pagamento MEI',
      valor: '86.50', parcela: `${i+1}/2`, status: 'Pendente', pago: false,
      observacao: 'DAS MEI',
      vencimento: data, mes,
      formaPagamento: 'Boleto', cartao: '',
      recorrente: false, recorrenciaGrupoId: '',
      pagamentoAutomatico: false, _seedId: `mei-${i+1}`,
    })
  })

  return lancamentos
}

/**
 * Aplica o seed de dados financeiros se ainda não foram inseridos.
 * Verifica pela presença do campo _seedId nos lançamentos existentes.
 */
export function aplicarSeedFinanceiro(lancamentosExistentes) {
  const seedsExistentes = new Set(
    (lancamentosExistentes || []).map(l => l._seedId).filter(Boolean)
  )
  const novos = gerarDadosSeed().filter(l => !seedsExistentes.has(l._seedId))
  if (novos.length === 0) return lancamentosExistentes
  return [...lancamentosExistentes, ...novos]
}

// ── migração / normalização de dados salvos ────────────────────────────

/**
 * Garante que lançamentos e investimentos salvos em versões antigas do app
 * tenham os novos campos, sem alterar o comportamento/saldo histórico.
 */
export function migrarLancamento(l) {
  const out = { ...l }
  if (out.tipo === 'Despesa') {
    if (!out.status) out.status = out.pago ? 'Pago' : 'Pendente'
    out.pago = out.status === 'Pago' || out.status === 'Pago automaticamente'
  } else {
    if (!out.status) out.status = 'Recebida'
    if (out.status === 'Recebida' && !out.dataRecebimento) out.dataRecebimento = out.vencimento || ''
  }
  if (!out.formaPagamento) out.formaPagamento = out.cartao ? 'Crédito' : (out.tipo === 'Despesa' ? 'Dinheiro' : '')
  if (out.recorrente && !out.recorrenciaTipo) out.recorrenciaTipo = 'Mensal'
  if (out.recorrente && out.recorrenciaAtiva === undefined) out.recorrenciaAtiva = true
  if (out.pagamentoAutomatico === undefined) out.pagamentoAutomatico = false
  return out
}

export function migrarInvestimento(i) {
  const out = { ...i }
  if (!out.rentabilidadeTipo) {
    out.rentabilidadeTipo = 'Manual'
    out.rentabilidadeValor = ''
  }
  if (!out.dataInvestimento) out.dataInvestimento = ''
  if (!out.liquidez) out.liquidez = ''
  return out
}

export function migrarDivida(d) {
  return {
    id: d.id || String(Date.now()),
    nome: d.nome || '',
    credor: d.credor || '',
    valorOriginal: d.valorOriginal || 0,
    dataCadastro: d.dataCadastro || '',
    observacoes: d.observacoes || '',
    status: d.status || 'Em aberto',
    pagamentos: Array.isArray(d.pagamentos) ? d.pagamentos : [],
  }
}

export function migrarDados(data) {
  const out = { ...data }
  out.financeiro = (out.financeiro || []).map(migrarLancamento)
  out.investimentos = (out.investimentos || []).map(migrarInvestimento)
  out.cartoes = Array.isArray(out.cartoes) ? out.cartoes : []
  out.dividas = Array.isArray(out.dividas) ? out.dividas.map(migrarDivida) : []
  out.projetos = Array.isArray(out.projetos) ? out.projetos : []
  out.projetoContador = out.projetoContador || 0
  out.configCDI = out.configCDI && typeof out.configCDI === 'object'
    ? out.configCDI
    : { taxaAnual: DEFAULT_CDI_ANUAL, atualizadoEm: '', manual: true, dataReferencia: '' }
  return out
}

// ── cálculo de saldo de dívida ─────────────────────────────────────────

export function calcularSaldoDivida(divida) {
  const original = Number(divida.valorOriginal) || 0
  const totalPago = (divida.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0)
  const saldo = Math.max(0, original - totalPago)
  return { original, totalPago, saldo, quitada: saldo === 0 }
}

// ── formatação ──────────────────────────────────────────────────────────

export function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function moneyNumber(v) {
  return parseFloat(v) || 0
}
