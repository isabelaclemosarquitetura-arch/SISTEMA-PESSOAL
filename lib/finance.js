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
  'Roupas', 'Assinaturas', 'Cartão', 'Pagamento de cartão', 'Empréstimo', 'Telefonia',
  'Renegociação', 'Trabalho', 'MEI', 'Outro'
]

// Formas de pagamento completas (sem duplicações)
// Nota: "Cartão X" opções são geradas automaticamente a partir da lista de cartões
export const FORMAS_PAGAMENTO = [
  'Dinheiro', 'Pix', 'Débito', 'Crédito', 'Boleto', 'Transferência',
  'Débito automático'
]

export const PERIODOS_DIA = ['Manhã', 'Tarde', 'Noite']

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

/**
 * Mês (nome, ex.: "Agosto") a que um lançamento pertence.
 *
 * FONTE DA VERDADE = o campo `vencimento` (data ISO local, sem timezone).
 * O campo `mes` armazenado é apenas um cache — pode ficar desatualizado
 * quando o vencimento é editado, duplicado ou importado de versões antigas,
 * causando lançamentos de setembro a aparecerem em agosto (e vice-versa).
 *
 * Esta função deriva o mês do `vencimento` e usa `l.mes` apenas como
 * fallback para lançamentos que ainda não possuem vencimento.
 */
export function mesLancamento(l) {
  if (!l) return ''
  if (l.vencimento && /^\d{4}-\d{2}-\d{2}$/.test(l.vencimento)) {
    const nome = mesDeISO(l.vencimento)
    if (nome) return nome
  }
  return l.mes || ''
}

/** Sempre que possível, alinha `mes` com `vencimento` (imutável). */
export function normalizarMesLancamento(l) {
  if (!l) return l
  const derivado = mesLancamento(l)
  return derivado && derivado !== l.mes ? { ...l, mes: derivado } : l
}

/**
 * Adiciona dias a uma data ISO usando aritmética LOCAL.
 * Evita a armadilha de `toISOString()` que converte para UTC e pode
 * deslocar o dia em fusos com offset positivo.
 */
export function addDaysISO(iso, dias) {
  const d = parseISO(iso)
  if (!d) return ''
  d.setDate(d.getDate() + Number(dias) || 0)
  return toISO(d)
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
 * 
 * REGRA CRÍTICA: Nunca gera ocorrências ANTERIORES à dataBaseISO.
 * Se um recorrente é criado em 15/08/2026, as ocorrências começam a partir
 * dessa data, nunca antes (15/06/2026, 15/07/2026, etc. não são gerados).
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
    // CRÍTICO: Não gera datas anteriores à data-base (data de criação/início do recorrente)
    if (next < base) {
      i++
      continue
    }
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
 * 
 * CRÍTICO: Usa a data de criação (dataBaseISO) como ponto de partida.
 * Nunca gera ocorrências anteriores à data de criação do recorrente.
 * O ID inclui a data completa (YYYY-MM-DD) para evitar colisão entre anos.
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
    // Usa o vencimento mais antigo como data-base (data de criação do recorrente)
    if (!atual || l.vencimento < atual.vencimento) porGrupo.set(l.recorrenciaGrupoId, l)
  })

  const novos = []
  porGrupo.forEach((primeiro) => {
    if (primeiro.recorrenciaAtiva === false) return
    const datas = gerarDatasRecorrencia({
      dataBaseISO: primeiro.vencimento,
      tipo: primeiro.recorrenciaTipo || 'Mensal',
      intervaloDias: primeiro.recorrenciaIntervaloDias,
      ateISO: ate,
    })
    datas.forEach((dataISO) => {
      // ID usa data completa YYYY-MM-DD para evitar colisão entre anos
      // Ex: grupo-2026-08-15 vs grupo-2027-08-15 são IDs diferentes
      const newId = `${primeiro.recorrenciaGrupoId}-${dataISO}`
      if (existingIds.has(newId)) return // já existe, não duplicar
      novos.push({
        ...primeiro,
        id: newId,
        vencimento: dataISO,
        mes: mesDeISO(dataISO),
        pago: false,
        status: primeiro.tipo === 'Receita' ? 'Prevista' : 'Pendente',
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
 * Marca despesas como Vencido se o vencimento passou (estritamente menor que hoje)
 * e ainda estão Pendente. Despesas futuras NÃO ficam vencidas.
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

export function isDespesaPaga(l) {
  return l?.tipo === 'Despesa' && (l.status === 'Pago' || l.status === 'Pago automaticamente' || l.pago)
}

export function isDespesaParcial(l) {
  return l?.tipo === 'Despesa' && l.status === 'Parcial'
}

export function valorPagoLancamento(l) {
  if (isDespesaPaga(l)) return moneyNumber(l.valor)
  if (isDespesaParcial(l)) return moneyNumber(l.valorPago)
  return 0
}

export function valorRestanteLancamento(l) {
  if (l?.tipo !== 'Despesa') return 0
  const total = moneyNumber(l.valor)
  const pago = valorPagoLancamento(l)
  return Math.max(0, total - pago)
}

export function isReceitaRecebida(l) {
  return l?.tipo === 'Receita' && l.status === 'Recebida'
}

export function isReceitaParcial(l) {
  return l?.tipo === 'Receita' && l.status === 'Parcial'
}

export function valorRecebidoLancamento(l) {
  if (isReceitaRecebida(l)) return moneyNumber(l.valor)
  if (isReceitaParcial(l)) return moneyNumber(l.valorRecebido)
  return 0
}

export function valorPendenteLancamento(l) {
  if (l?.tipo !== 'Receita') return 0
  if (isReceitaRecebida(l)) return 0
  const total = moneyNumber(l.valorOriginal || l.valor)
  return Math.max(0, total - moneyNumber(l.valorRecebido))
}

export function isDespesaVencida(l, hojeRef = new Date()) {
  return l?.tipo === 'Despesa' && !isDespesaPaga(l) && l.vencimento && l.vencimento < toISO(hojeRef)
}

export function origemLancamento(l) {
  if (!l) return 'Pessoal'
  if (l.origem) return l.origem
  if (l._projetoId || l._projetoCodigo || l.categoria === 'Recebimento Projeto' || l.categoria === 'Trabalho') {
    return 'Trabalho'
  }
  return 'Pessoal'
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
  const lancamentos = []

  // Helper para ID único
  const id = (suf) => `seed-${suf}`

  // 1. VIVO — Telefonia, recorrente mensal, dia 17, Pix
  const gId_vivo = id('vivo')
  lancamentos.push({
    id: gId_vivo,
    tipo: 'Despesa', categoria: 'Telefonia', descricao: 'Vivo',
    valor: '80.00', status: 'Pendente', pago: false, observacao: '',
    parcela: '', vencimento: '2026-08-17', mes: 'Agosto',
    formaPagamento: 'Pix', cartao: '',
    recorrente: true, recorrenciaTipo: 'Mensal', recorrenciaAtiva: true,
    recorrenciaGrupoId: gId_vivo, recorrenciaIntervaloDias: '',
    pagamentoAutomatico: false, _seedId: 'vivo',
  })

  // 2. AMAZON — Assinatura anual, R$166,80 total, R$13,90 mensal, agosto/2026, dia 8, Pix
  const gId_amazon = id('amazon')
  lancamentos.push({
    id: gId_amazon,
    tipo: 'Despesa', categoria: 'Assinaturas', descricao: 'Amazon',
    valor: '13.90', equivalenteMensal: '13.90', status: 'Pendente', pago: false,
    observacao: 'Pagar mãe - Assinatura anual R$166,80',
    parcela: '', vencimento: '2026-08-08', mes: 'Agosto',
    formaPagamento: 'Pix', cartao: '',
    recorrente: true, recorrenciaTipo: 'Mensal', recorrenciaAtiva: true,
    recorrenciaGrupoId: gId_amazon, recorrenciaIntervaloDias: '',
    pagamentoAutomatico: false, _seedId: 'amazon',
  })

  // 3. GOOGLE ONE — Assinatura mensal, R$9,99, dia 15, Cartão Mercado Pago
  const gId_google = id('google')
  lancamentos.push({
    id: gId_google,
    tipo: 'Despesa', categoria: 'Assinaturas', descricao: 'Google One',
    valor: '9.99', status: 'Pendente', pago: false, observacao: '',
    parcela: '', vencimento: '2026-08-15', mes: 'Agosto',
    formaPagamento: 'Cartão Mercado Pago', cartao: 'Mercado Pago',
    recorrente: true, recorrenciaTipo: 'Mensal', recorrenciaAtiva: true,
    recorrenciaGrupoId: gId_google, recorrenciaIntervaloDias: '',
    pagamentoAutomatico: false, _seedId: 'google-one',
  })

  // 4. MELI MAIS — R$9,90, mensal, dia 21, Cartão Mercado Pago
  const gId_meli = id('meli')
  lancamentos.push({
    id: gId_meli,
    tipo: 'Despesa', categoria: 'Assinaturas', descricao: 'Meli +',
    valor: '9.90', status: 'Pendente', pago: false, observacao: '',
    parcela: '', vencimento: '2026-08-21', mes: 'Agosto',
    formaPagamento: 'Cartão Mercado Pago', cartao: 'Mercado Pago',
    recorrente: true, recorrenciaTipo: 'Mensal', recorrenciaAtiva: true,
    recorrenciaGrupoId: gId_meli, recorrenciaIntervaloDias: '',
    pagamentoAutomatico: false, _seedId: 'meli',
  })

  // 5. PAGAMENTO CARTÃO MERCADO PAGO — R$392,68, 17/08/2026, Pix
  lancamentos.push({
    id: id('pagamento-cartao-mp'),
    tipo: 'Despesa', categoria: 'Pagamento de cartão', descricao: 'Pagamento Cartão Mercado Pago',
    valor: '392.68', status: 'Pendente', pago: false, observacao: '',
    parcela: '', vencimento: '2026-08-17', mes: 'Agosto',
    formaPagamento: 'Pix', cartao: '',
    recorrente: false, recorrenciaGrupoId: '',
    pagamentoAutomatico: false, _seedId: 'pagamento-cartao-mp',
  })

  // 6. RENEGOCIAÇÃO NUBANK — 5 parcelas de R$104,85, início 03/08/2026, Pix
  const grupoNubank = id('nubank-renego')
  const datasNubank = ['2026-08-03', '2026-09-03', '2026-10-03', '2026-11-03', '2026-12-03']
  datasNubank.forEach((data, i) => {
    const eVencida = data < '2026-08-19'
    lancamentos.push({
      id: `${grupoNubank}-p${i+1}`,
      tipo: 'Despesa', categoria: 'Renegociação', descricao: 'Renegociação Nubank',
      valor: '104.85', parcela: `${i+1}/5`,
      status: eVencida ? 'Vencido' : 'Pendente', pago: false, observacao: '',
      vencimento: data, mes: mesDeISO(data),
      formaPagamento: 'Pix', cartao: '',
      recorrente: false, recorrenciaGrupoId: '',
      pagamentoAutomatico: false, _seedId: `nubank-renego-p${i+1}`,
      _parcelaGrupoId: grupoNubank, _valorTotalOriginal: 524.25,
    })
  })

  // 7. EMPRÉSTIMO MERCADO PAGO 1 (2 Parcelas) — R$23,62 × 2, Pix
  const grupoMp2P = id('mp-2p')
  ;[['2026-08-28','Agosto'],['2026-09-28','Setembro']].forEach(([data, mes], i) => {
    lancamentos.push({
      id: `${grupoMp2P}-p${i+1}`,
      tipo: 'Despesa', categoria: 'Empréstimo', descricao: 'Empréstimo Mercado Pago',
      valor: '23.62', parcela: `${i+1}/2`, status: 'Pendente', pago: false, observacao: '',
      vencimento: data, mes,
      formaPagamento: 'Pix', cartao: '',
      recorrente: false, recorrenciaGrupoId: '',
      pagamentoAutomatico: false, _seedId: `mp-2p-p${i+1}`,
      _parcelaGrupoId: grupoMp2P, _valorTotalOriginal: 47.24,
    })
  })

  // 8. EMPRÉSTIMO MERCADO PAGO 2 (3 Parcelas) — R$60,63 × 3, Pix
  const grupoMp3P = id('mp-3p')
  ;[['2026-08-28','Agosto'],['2026-09-28','Setembro'],['2026-10-28','Outubro']].forEach(([data, mes], i) => {
    lancamentos.push({
      id: `${grupoMp3P}-p${i+1}`,
      tipo: 'Despesa', categoria: 'Empréstimo', descricao: 'Empréstimo Mercado Pago',
      valor: '60.63', parcela: `${i+1}/3`, status: 'Pendente', pago: false, observacao: '',
      vencimento: data, mes,
      formaPagamento: 'Pix', cartao: '',
      recorrente: false, recorrenciaGrupoId: '',
      pagamentoAutomatico: false, _seedId: `mp-3p-p${i+1}`,
      _parcelaGrupoId: grupoMp3P, _valorTotalOriginal: 181.89,
    })
  })

  // 9. EMPRÉSTIMO DINHEIRO EXPRESS — R$125,00, 27/08/2026, Pix
  lancamentos.push({
    id: id('emprestimo-dinheiro-express'),
    tipo: 'Despesa', categoria: 'Empréstimo', descricao: 'Empréstimo Mercado Pago - Dinheiro Express',
    valor: '125.00', status: 'Pendente', pago: false, observacao: '',
    parcela: '', vencimento: '2026-08-27', mes: 'Agosto',
    formaPagamento: 'Pix', cartao: '',
    recorrente: false, recorrenciaGrupoId: '',
    pagamentoAutomatico: false, _seedId: 'emprestimo-dinheiro-express',
  })

  // 10. EMPRÉSTIMO JEITO — R$80,00, 15/08/2026, Pix, Vencido
  lancamentos.push({
    id: id('emprestimo-jeito'),
    tipo: 'Despesa', categoria: 'Empréstimo', descricao: 'Empréstimo Jeito',
    valor: '80.00', status: 'Vencido', pago: false, observacao: '',
    parcela: '', vencimento: '2026-08-15', mes: 'Agosto',
    formaPagamento: 'Pix', cartao: '',
    recorrente: false, recorrenciaGrupoId: '',
    pagamentoAutomatico: false, _seedId: 'emprestimo-jeito',
  })

  // 11. EMPRÉSTIMO JOÃO VITOR — R$50,00, 24/08/2026, Pix
  lancamentos.push({
    id: id('emprestimo-joao-vitor'),
    tipo: 'Despesa', categoria: 'Empréstimo', descricao: 'Empréstimo João Vitor',
    valor: '50.00', status: 'Pendente', pago: false, observacao: '',
    parcela: '', vencimento: '2026-08-24', mes: 'Agosto',
    formaPagamento: 'Pix', cartao: '',
    recorrente: false, recorrenciaGrupoId: '',
    pagamentoAutomatico: false, _seedId: 'emprestimo-joao-vitor',
  })

  // 12. PARCELAS FIXAS — 6 parcelas de R$31,00, início 08/09/2026, Pix
  const grupoParcelasFixas = id('parcelas-fixas')
  const datasParcelasFixas = ['2026-09-08','2026-10-08','2026-11-08','2026-12-08','2027-01-08','2027-02-08']
  datasParcelasFixas.forEach((data, i) => {
    lancamentos.push({
      id: `${grupoParcelasFixas}-p${i+1}`,
      tipo: 'Despesa', categoria: 'Empréstimo', descricao: 'Parcelas Fixas',
      valor: '31.00', parcela: `${i+1}/6`, status: 'Pendente', pago: false, observacao: '',
      vencimento: data, mes: mesDeISO(data),
      formaPagamento: 'Pix', cartao: '',
      recorrente: false, recorrenciaGrupoId: '',
      pagamentoAutomatico: false, _seedId: `parcelas-fixas-p${i+1}`,
      _parcelaGrupoId: grupoParcelasFixas, _valorTotalOriginal: 186.00,
    })
  })

  // 13. PAGAMENTO MEI — R$86,50, recorrente mensal a partir de 21/09/2026, Pix
  const gId_mei = id('mei')
  lancamentos.push({
    id: gId_mei,
    tipo: 'Despesa', categoria: 'Trabalho', descricao: 'Pagamento MEI',
    valor: '86.50', status: 'Pendente', pago: false, observacao: '',
    parcela: '', vencimento: '2026-09-21', mes: 'Setembro',
    formaPagamento: 'Pix', cartao: '',
    recorrente: true, recorrenciaTipo: 'Mensal', recorrenciaAtiva: true,
    recorrenciaGrupoId: gId_mei, recorrenciaIntervaloDias: '',
    pagamentoAutomatico: false, _seedId: 'mei',
  })

  return lancamentos
}

/**
 * Aplica o seed de dados financeiros se ainda não foram inseridos.
 */
export function aplicarSeedFinanceiro(lancamentosExistentes) {
  const seedsExistentes = new Set(
    (lancamentosExistentes || []).map(l => l._seedId).filter(Boolean)
  )
  const novos = gerarDadosSeed().filter(l => !seedsExistentes.has(l._seedId))
  if (novos.length === 0) return lancamentosExistentes
  return [...lancamentosExistentes, ...novos]
}

// ── TERAPIA QUINZENAL ──────────────────────────────────────────────────

/**
 * Garante que as sessões de terapia quinzenal estejam presentes no array
 * de lançamentos. Nunca duplica — verifica pelo _seedId de cada sessão.
 *
 * Lógica:
 * - A terapia é uma despesa recorrente quinzenal (R$ 120,00/sessão)
 * - O lançamento raiz tem recorrenciaAtiva: true e recorrenciaTipo: 'Quinzenal'
 * - ensureRecorrencias() cuida de gerar futuras ocorrências automaticamente
 * - Para agosto/2026: 03/08 (vencida), 17/08 (vencida), 31/08 (pendente)
 */
export function garantirTerapiaQuinzenal(lancamentos, hojeRef = new Date()) {
  const hoje = toISO(hojeRef)
  const grupoId = 'seed-terapia-quinzenal'

  // Sessões explícitas de agosto/2026 que servem como âncoras iniciais
  const sessoesAgosto = [
    { data: '2026-08-03', seedId: 'terapia-2026-08-03' },
    { data: '2026-08-17', seedId: 'terapia-2026-08-17' },
    { data: '2026-08-31', seedId: 'terapia-2026-08-31' },
  ]

  // IDs de _seedId já existentes
  const seedsExistentes = new Set(lancamentos.map(l => l._seedId).filter(Boolean))
  // IDs de vencimento+grupoId já existentes (para evitar duplicar via recorrência também)
  const idsExistentes = new Set(lancamentos.map(l => l.id))

  const novos = []

  sessoesAgosto.forEach(({ data, seedId }) => {
    if (seedsExistentes.has(seedId)) return // já existe, não duplicar

    // Verifica se existe algum lançamento do grupo com esse vencimento (gerado por ensureRecorrencias)
    const jaExiste = lancamentos.some(l =>
      l.recorrenciaGrupoId === grupoId && l.vencimento === data
    )
    if (jaExiste) return

    const eVencida = data < hoje
    novos.push({
      id: `${grupoId}-${data}`,
      tipo: 'Despesa',
      categoria: 'Saúde',
      descricao: 'Terapia',
      valor: '120.00',
      status: eVencida ? 'Vencido' : 'Pendente',
      pago: false,
      observacao: 'Sessão quinzenal — segunda-feira',
      parcela: '',
      vencimento: data,
      mes: mesDeISO(data),
      formaPagamento: 'PIX',
      cartao: '',
      recorrente: true,
      recorrenciaTipo: 'Quinzenal',
      recorrenciaAtiva: true,
      recorrenciaGrupoId: grupoId,
      recorrenciaIntervaloDias: '',
      pagamentoAutomatico: false,
      _seedId: seedId,
      origem: 'Pessoal',
    })
  })

  return novos.length ? [...lancamentos, ...novos] : lancamentos
}

// ── migração / normalização de dados salvos ────────────────────────────

/**
 * Garante que lançamentos e investimentos salvos em versões antigas do app
 * tenham os novos campos, sem alterar o comportamento/saldo histórico.
 */
export function migrarLancamento(l) {
  const out = { ...l }
  
  if (out.descricao) {
    // Remove emojis e símbolos usando regex unicode
    out.descricao = out.descricao.replace(/[\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23F3}\u{24C2}\u{23E9}-\u{23EF}\u{25B6}\u{23F8}-\u{23FA}]/gu, '').trim()
    
    // Fix para "Amelie Mais" já existente -> Meli Mais
    if (out.descricao === 'Amelie Mais') {
      out.descricao = 'Meli Mais'
    }
  }

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
  if (!out.origem) out.origem = origemLancamento(out)

  // Correção de mês: o `mes` guardado pode estar desatualizado em relação ao
  // vencimento. Ao carregar, sempre que houver vencimento, o `mes` é realinhado.
  if (out.vencimento && /^\d{4}-\d{2}-\d{2}$/.test(out.vencimento)) {
    const derivado = mesDeISO(out.vencimento)
    if (derivado && (!out.mes || out.mes !== derivado)) out.mes = derivado
  }
  
  // Garantir que a Amazon antiga ganhe equivalenteMensal
  if (out.descricao === 'Amazon' && out.recorrenciaTipo === 'Anual' && !out.equivalenteMensal) {
    out.equivalenteMensal = '13.90'
  }

  // Fix: Amazon, Meli Mais, Google One não são do Nubank
  if (['Amazon', 'Meli Mais', 'Google One'].includes(out.descricao) && out.cartao === 'Nubank') {
    out.cartao = 'Mercado Pago'
  }
  
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
  // Garante a terapia quinzenal
  out.financeiro = garantirTerapiaQuinzenal(out.financeiro)
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

// ── integração Agenda ──────────────────────────────────────────────────

/**
 * Converte uma tarefa de projeto em um evento de agenda estruturado.
 * Usado pela integração Trabalho → Agenda.
 */
export function tarefaParaEventoAgenda(tarefa, projeto) {
  return {
    id: `proj-task-${tarefa.id}`,
    texto: tarefa.nome,
    descricao: tarefa.descricao || '',
    concluida: tarefa.status === 'Concluída',
    tipo: 'projeto',
    horario: tarefa.horario || '',
    horarioFim: tarefa.horarioFim || '',
    periododia: tarefa.periododia || '',
    prioridade: tarefa.prioridade || 'Média',
    _projetoId: projeto.id,
    _projetoNome: projeto.nome,
    _projetoCodigo: projeto.codigo || '',
    _tarefaId: tarefa.id,
    dataInicio: tarefa.dataInicio || '',
    dataFim: tarefa.dataFim || '',
    status: tarefa.status || 'A fazer',
  }
}

/**
 * Sincroniza as tarefas de um projeto na agenda.
 * Para cada tarefa com dataInicio: grava no dia correspondente.
 * Para tarefas com intervalo (dataInicio + dataFim): grava em cada dia do intervalo.
 * Máximo de 30 dias de span para evitar poluição da agenda.
 *
 * @param {object} agenda - objeto de agenda atual (chave = YYYY-MM-DD)
 * @param {object} projeto - projeto com suas tarefas
 * @param {string|null} tarefaIdRemovida - se fornecido, apenas remove essa tarefa da agenda
 * @returns {object} nova agenda
 */
export function sincronizarTarefasNaAgenda(agenda, projeto, tarefaIdRemovida = null) {
  let novaAgenda = { ...agenda }

  // Se for remoção de uma tarefa específica
  if (tarefaIdRemovida) {
    Object.keys(novaAgenda).forEach(key => {
      const dia = novaAgenda[key]
      if (!dia || !Array.isArray(dia.eventos)) return
      const eventosFiltrados = dia.eventos.filter(ev =>
        !(ev._tarefaId === tarefaIdRemovida && ev._projetoId === projeto.id)
      )
      if (eventosFiltrados.length !== dia.eventos.length) {
        novaAgenda[key] = { ...dia, eventos: eventosFiltrados }
      }
    })
    return novaAgenda
  }

  // Remove todas as entradas do projeto desta agenda para re-sincronizar
  Object.keys(novaAgenda).forEach(key => {
    const dia = novaAgenda[key]
    if (!dia || !Array.isArray(dia.eventos)) return
    const eventosFiltrados = dia.eventos.filter(ev => ev._projetoId !== projeto.id)
    if (eventosFiltrados.length !== dia.eventos.length) {
      novaAgenda[key] = { ...dia, eventos: eventosFiltrados }
    }
  })

  // Re-insere tarefas com datas
  const tarefas = projeto.tarefas || []
  tarefas.forEach(tarefa => {
    if (!tarefa.dataInicio) return
    const evento = tarefaParaEventoAgenda(tarefa, projeto)
    const inicio = parseISO(tarefa.dataInicio)
    const fim = tarefa.dataFim ? parseISO(tarefa.dataFim) : inicio
    if (!inicio) return

    // Máximo 30 dias de span
    const diffDias = Math.min(30, Math.max(0, Math.round((fim - inicio) / 86400000)))

    for (let d = 0; d <= diffDias; d++) {
      const dataEvento = new Date(inicio)
      dataEvento.setDate(dataEvento.getDate() + d)
      const key = toISO(dataEvento)

      const diaAtual = novaAgenda[key] || { tasks: [], checks: [], notas: '', eventos: [] }
      const eventosExistentes = Array.isArray(diaAtual.eventos) ? diaAtual.eventos : []

      // Filtra eventos antigos deste projeto nesta data e adiciona o novo
      const eventosFiltrados = eventosExistentes.filter(ev =>
        !(ev._tarefaId === tarefa.id && ev._projetoId === projeto.id)
      )

      novaAgenda[key] = {
        ...diaAtual,
        eventos: [...eventosFiltrados, { ...evento, _diaIndex: d, _totalDias: diffDias + 1 }]
      }
    }
  })

  return novaAgenda
}
