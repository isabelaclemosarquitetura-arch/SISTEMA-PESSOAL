// ─────────────────────────────────────────────────────────────────────────
// Núcleo de cálculo financeiro: recorrência, rendimento CDI/prefixado,
// faturas de cartão, sugestão automática de categoria e migração de dados
// salvos no localStorage para o novo formato (sem perder dados antigos).
// Funções puras (sem side-effects), fáceis de testar isoladamente.
// ─────────────────────────────────────────────────────────────────────────

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export const CATEGORIAS_RECEITA = ['Salário', 'Freelance', 'Projeto', 'Aluguel', 'Investimento', 'Outro']
export const CATEGORIAS_DESPESA = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Roupas', 'Assinaturas', 'Cartão', 'Outro']

export const FORMAS_PAGAMENTO = ['Dinheiro', 'PIX', 'Débito', 'Crédito']

export const TIPOS_RECORRENCIA = ['Mensal', 'Quinzenal', 'Semanal', 'Personalizada']

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
      novos.push({
        ...ultimo,
        id: `${ultimo.recorrenciaGrupoId}-${dataISO}-${idx}`,
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
 * fatura vence. Regra: compras após o fechamento entram na fatura do mês
 * seguinte; o vencimento da fatura cai no mês seguinte ao fechamento se o
 * dia de vencimento for menor ou igual ao dia de fechamento.
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
  { palavras: ['luz', 'energia', 'água', 'agua', 'gás', 'gas', 'internet', 'telefone'], categoria: 'Moradia' },
  { palavras: ['mercado', 'supermercado', 'ifood', 'restaurante', 'padaria', 'feira'], categoria: 'Alimentação' },
  { palavras: ['uber', '99', 'combustível', 'combustivel', 'gasolina', 'estacionamento', 'transporte'], categoria: 'Transporte' },
  { palavras: ['farmácia', 'farmacia', 'drogaria', 'médico', 'medico', 'plano de saúde', 'plano de saude', 'terapia', 'psicólogo', 'psicologo'], categoria: 'Saúde' },
  { palavras: ['curso', 'faculdade', 'escola', 'livro'], categoria: 'Educação' },
  { palavras: ['cinema', 'show', 'viagem', 'passeio', 'bar'], categoria: 'Lazer' },
  { palavras: ['netflix', 'spotify', 'amazon prime', 'assinatura', 'mensalidade'], categoria: 'Assinaturas' },
  { palavras: ['salário', 'salario', 'pagamento mensal'], categoria: 'Salário' },
  { palavras: ['freelance', 'projeto'], categoria: 'Freelance' },
  { palavras: ['mercado pago', 'pix recebido', 'transferência recebida', 'transferencia recebida'], categoria: 'Outro' },
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

// ── migração / normalização de dados salvos ────────────────────────────

/**
 * Garante que lançamentos e investimentos salvos em versões antigas do app
 * tenham os novos campos, sem alterar o comportamento/saldo histórico:
 *  - despesas antigas: status derivado do campo `pago` já existente.
 *  - receitas antigas (sem `status`): tratadas como 'Recebida', porque o
 *    sistema antigo já somava todas as receitas ao saldo.
 *  - investimentos antigos: rentabilidadeTipo = 'Manual' (preserva o
 *    valorAtual digitado manualmente, sem recalcular nada de novo).
 */
export function migrarLancamento(l) {
  const out = { ...l }
  if (out.tipo === 'Despesa') {
    if (!out.status) out.status = out.pago ? 'Pago' : 'Pendente'
    out.pago = out.status === 'Pago'
  } else {
    if (!out.status) out.status = 'Recebida'
    if (out.status === 'Recebida' && !out.dataRecebimento) out.dataRecebimento = out.vencimento || ''
  }
  if (!out.formaPagamento) out.formaPagamento = out.cartao ? 'Crédito' : (out.tipo === 'Despesa' ? 'Dinheiro' : '')
  if (out.recorrente && !out.recorrenciaTipo) out.recorrenciaTipo = 'Mensal'
  if (out.recorrente && out.recorrenciaAtiva === undefined) out.recorrenciaAtiva = true
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

export function migrarDados(data) {
  const out = { ...data }
  out.financeiro = (out.financeiro || []).map(migrarLancamento)
  out.investimentos = (out.investimentos || []).map(migrarInvestimento)
  out.cartoes = Array.isArray(out.cartoes) ? out.cartoes : []
  out.configCDI = out.configCDI && typeof out.configCDI === 'object'
    ? out.configCDI
    : { taxaAnual: DEFAULT_CDI_ANUAL, atualizadoEm: '', manual: true, dataReferencia: '' }
  return out
}

// ── formatação ──────────────────────────────────────────────────────────

export function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function moneyNumber(v) {
  return parseFloat(v) || 0
}
