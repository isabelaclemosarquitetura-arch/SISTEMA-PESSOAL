import { useMemo, useState } from 'react'
import { t } from '../lib/i18n'
import {
  MESES, CATEGORIAS_RECEITA, CATEGORIAS_DESPESA, FORMAS_PAGAMENTO, TIPOS_RECORRENCIA,
  fmt, moneyNumber, sugerirCategoria, hojeISO, mesDeISO, mesLancamento, fmtDataBR, gerarParcelas,
  isDespesaPaga, isReceitaRecebida, isReceitaParcial, valorRecebidoLancamento,
  valorPendenteLancamento, isDespesaVencida, origemLancamento,
} from '../lib/finance'

const CARTOES_PADRAO = ['Nubank', 'Inter', 'Itaú', 'Santander', 'Caixa', 'Banco do Brasil', 'Mercado Pago', 'Outro']

const EMPTY_FORM = {
  mes: '', tipo: 'Despesa', categoria: '', descricao: '', valor: '',
  status: 'Pendente', observacao: '', parcela: '', vencimento: '',
  formaPagamento: 'Dinheiro', cartao: '',
  recorrente: false, recorrenciaTipo: 'Mensal', recorrenciaIntervaloDias: '',
  parcelado: false, qtdParcelas: '', pagamentoAutomatico: false, projeto: ''
}

const STATUS_DESPESA = ['Pendente', 'Pago', 'Vencido', 'Pago automaticamente']
const STATUS_RECEITA = ['Prevista', 'Parcial', 'Recebida']

function sum(items, tipo) { return items.filter(l => l.tipo === tipo).reduce((s, l) => s + (parseFloat(l.valor) || 0), 0) }
function mesIndex(nome) { return MESES.findIndex(m => m.toLowerCase() === (nome || '').toLowerCase()) }

function statusBadgeClass(status) {
  if (status === 'Pago' || status === 'Recebida' || status === 'Pago automaticamente') return 'badge-green'
  if (status === 'Parcial') return 'badge-blue'
  if (status === 'Vencido') return 'badge-red'
  if (status === 'Prevista') return 'badge-blue'
  return 'badge-yellow'
}

export default function FinanceiroLancamentos({ data, update, lang = 'pt' }) {
  const hoje = new Date()
  const mesAtualIdx = hoje.getMonth()
  const [mesFiltro, setMesFiltro] = useState(MESES[mesAtualIdx])
  const [cartaoFiltro, setCartaoFiltro] = useState('')
  const [origemFiltro, setOrigemFiltro] = useState('Todos')
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState({ ...EMPTY_FORM, mes: MESES[mesAtualIdx] })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showOrcamento, setShowOrcamento] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const lancamentos = data.financeiro || []
  const orcamentos = data.orcamentoCategoria || {}
  const cartoesCadastrados = (data.cartoes || []).map(c => c.nome)

  const cartoesUsados = useMemo(() => {
    const usados = lancamentos.map(l => l.cartao).filter(Boolean)
    return Array.from(new Set([...CARTOES_PADRAO, ...cartoesCadastrados, ...usados]))
  }, [lancamentos, cartoesCadastrados])

  // Opções de "forma de pagamento": além das formas fixas, oferece cada
  // cartão cadastrado/em uso como atalho direto (ex.: "Cartão Mercado Pago").
  // Escolher um cartão define automaticamente formaPagamento=Crédito. Isso
  // permite adicionar novos cartões futuramente sem tocar no código.
  const formasPagamentoOptions = useMemo(() => {
    const opcoes = [...FORMAS_PAGAMENTO]
    cartoesUsados.forEach(c => {
      if (c && !opcoes.includes(c)) opcoes.push(`Cartão ${c}`)
    })
    return opcoes
  }, [cartoesUsados])

  const lancMesBase = lancamentos.filter(l => mesLancamento(l).toLowerCase() === mesFiltro.toLowerCase())
  const lancMesCartao = cartaoFiltro === '' ? lancMesBase : cartaoFiltro === '__nocard__' ? lancMesBase.filter(l => !l.cartao) : lancMesBase.filter(l => l.cartao === cartaoFiltro)
  
  const lancMesOrigem = origemFiltro === 'Todos'
    ? lancMesCartao
    : lancMesCartao.filter(l => origemLancamento(l) === origemFiltro)
                        
  const lancMes = busca ? lancMesOrigem.filter(l => l.descricao?.toLowerCase().includes(busca.toLowerCase()) || l.categoria?.toLowerCase().includes(busca.toLowerCase())) : lancMesOrigem

  const receitas = sum(lancMes, 'Receita'), despesas = sum(lancMes, 'Despesa'), saldoPrevisto = receitas - despesas
  const receitasRecebidas = lancMes.reduce((s, l) => s + valorRecebidoLancamento(l), 0)
  const despesasPagas = lancMes.filter(isDespesaPaga).reduce((s, l) => s + moneyNumber(l.valor), 0)
  const saldoAtual = receitasRecebidas - despesasPagas
  const pendentes = lancMes.filter(l => (l.status === 'Pendente' || l.status === 'Vencido') && l.tipo === 'Despesa').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const aReceber = lancMes.reduce((s, l) => s + valorPendenteLancamento(l), 0)
  const vencidos = lancMes.filter(l => isDespesaVencida(l)).reduce((s, l) => s + moneyNumber(l.valor), 0)
  const mesAnterior = MESES[(mesIndex(mesFiltro) + 11) % 12]
  const lancMesAnt = lancamentos.filter(l => mesLancamento(l).toLowerCase() === mesAnterior.toLowerCase())
  const deltaSaldo = saldoPrevisto - (sum(lancMesAnt, 'Receita') - sum(lancMesAnt, 'Despesa'))

  const despesasPorCategoria = useMemo(() => {
    const totals = {}
    lancMes.filter(l => l.tipo === 'Despesa').forEach(l => { const k = l.categoria || 'Sem categoria'; totals[k] = (totals[k] || 0) + moneyNumber(l.valor) })
    return Object.entries(totals).map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total)
  }, [lancMes])

  const resumoCartoes = useMemo(() => {
    const totals = {}
    lancMesBase.filter(l => l.tipo === 'Despesa' && l.formaPagamento === 'Crédito').forEach(l => { const k = l.cartao || 'Sem cartão'; totals[k] = (totals[k] || 0) + moneyNumber(l.valor) })
    return Object.entries(totals).map(([cartao, total]) => ({ cartao, total })).sort((a, b) => b.total - a.total)
  }, [lancMesBase])

  const evolucaoMensal = useMemo(() => MESES.map(mes => { const itens = lancamentos.filter(l => mesLancamento(l).toLowerCase() === mes.toLowerCase()); return { mes, receitas: sum(itens, 'Receita'), despesas: sum(itens, 'Despesa') } }), [lancamentos])
  const maxCategoria = Math.max(1, ...despesasPorCategoria.map(i => i.total))
  const maxEvolucao = Math.max(1, ...evolucaoMensal.flatMap(i => [i.receitas, i.despesas]))
  const cats = form.tipo === 'Receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA

  const showFeedback = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(''), 2400) }

  const handleField = (k, v) => setForm(f => {
    const next = { ...f, [k]: v }
    if (k === 'tipo') { next.cartao = ''; next.formaPagamento = v === 'Receita' ? '' : 'Dinheiro'; next.status = v === 'Receita' ? 'Prevista' : 'Pendente'; next.parcelado = false; next.pagamentoAutomatico = false; next.projeto = '' }
    if (k === 'vencimento') { next.mes = mesDeISO(v) || f.mes }
    if (k === 'formaPagamento') {
      // Atalho direto "Cartão X" → Crédito + cartao automaticamente
      if (v && !FORMAS_PAGAMENTO.includes(v)) {
        const nomeCartao = v.replace(/^Cartão\s+/, '')
        next.formaPagamento = 'Crédito'
        next.cartao = nomeCartao
      } else if (v !== 'Crédito') {
        next.cartao = ''
      }
    }
    if (k === 'parcelado' && v) { next.recorrente = false }
    if (k === 'recorrente' && v) { next.parcelado = false }
    if (k === 'descricao' && !f.categoria) { const s = sugerirCategoria(v); if (s && cats.includes(s)) next.categoria = s }
    return next
  })

  const resetForm = () => { setForm({ ...EMPTY_FORM, mes: mesFiltro }); setEditId(null); setShowForm(false) }

  const handleSave = () => {
    if (!form.descricao.trim() || !form.valor) { showFeedback(t(lang, 'lanc.fillRequired')); return }
    if (form.tipo === 'Despesa' && form.formaPagamento === 'Crédito' && !form.cartao) { showFeedback(t(lang, 'lanc.selectCardReq')); return }

    // ── PARCELADO ──
    if (form.parcelado && form.qtdParcelas && Number(form.qtdParcelas) > 1 && !editId) {
      const grupoId = String(Date.now())
      const baseItem = {
        grupoId,
        tipo: form.tipo, categoria: form.categoria, descricao: form.descricao.trim(),
        formaPagamento: form.formaPagamento, cartao: form.tipo === 'Despesa' && form.formaPagamento === 'Crédito' ? form.cartao : '',
        observacao: form.observacao, recorrente: false, recorrenciaGrupoId: '',
        pagamentoAutomatico: false,
      }
      const novasParcelas = gerarParcelas({
        valorTotal: Number(form.valor),
        qtdParcelas: Number(form.qtdParcelas),
        dataInicioISO: form.vencimento || hojeISO(),
        baseItem,
      })
      update('financeiro', [...lancamentos, ...novasParcelas])
      showFeedback(`✓ ${form.qtdParcelas} parcelas criadas! (${fmt(Number(form.valor))} total)`)
      resetForm()
      return
    }

    const projetoRelacionado = form.tipo === 'Receita' && form.projeto
      ? (data.projetos || []).find(p => p.codigo === form.projeto)
      : null

    const payload = {
      ...form,
      descricao: form.descricao.trim(),
      mes: mesDeISO(form.vencimento) || form.mes, // mês sempre derivado do vencimento
      cartao: form.tipo === 'Despesa' && form.formaPagamento === 'Crédito' ? form.cartao : '',
      formaPagamento: form.tipo === 'Despesa' ? form.formaPagamento : '',
      origem: projetoRelacionado ? 'Trabalho' : (form.origem || 'Pessoal'),
      _projetoId: projetoRelacionado?.id || form._projetoId || '',
      _projetoCodigo: projetoRelacionado?.codigo || form._projetoCodigo || '',
      _projetoNome: projetoRelacionado?.nome || form._projetoNome || '',
      _cliente: projetoRelacionado?.cliente || form._cliente || '',
      _tipoProjeto: projetoRelacionado?.tipo || form._tipoProjeto || '',
    }

    if (editId !== null) {
      const original = lancamentos.find(l => l.id === editId)
      let aplicarFuturos = false
      if (original?.recorrenciaGrupoId) aplicarFuturos = window.confirm(t(lang, 'lanc.confirmRecurEdit'))
      const financeiroAtualizado = lancamentos.map(l => {
        if (l.id === editId) return { ...payload, id: editId }
        if (aplicarFuturos && l.recorrenciaGrupoId === original.recorrenciaGrupoId && l.vencimento > original.vencimento)
          return { ...l, valor: payload.valor, categoria: payload.categoria, descricao: payload.descricao, formaPagamento: payload.formaPagamento, cartao: payload.cartao, observacao: payload.observacao }
        return l
      })
      if (original?._projetoId) {
        update({
          financeiro: financeiroAtualizado,
          projetos: (data.projetos || []).map(p => p.id === original._projetoId ? {
            ...p,
            recebimentos: (p.recebimentos || []).map(r => r.id === editId ? {
              ...r,
              valor: moneyNumber(payload.valor),
              vencimento: payload.vencimento,
              status: payload.status === 'Recebida' ? 'Recebido' : payload.status === 'Parcial' ? 'Parcial' : 'Pendente',
              dataPagamento: payload.dataRecebimento || '',
              formaPagamento: payload.formaPagamento || r.formaPagamento,
              valorRecebido: moneyNumber(payload.valorRecebido),
            } : r),
            gastos: (p.gastos || []).map(g => g.id === editId ? {
              ...g,
              descricao: payload.descricao,
              valor: moneyNumber(payload.valor),
              data: payload.vencimento,
              categoria: payload.categoria === 'Trabalho' ? g.categoria : payload.categoria,
              formaPagamento: payload.formaPagamento || g.formaPagamento,
            } : g)
          } : p)
        })
      } else {
        update('financeiro', financeiroAtualizado)
      }
      showFeedback(t(lang, 'lanc.updated'))
    } else {
      const novoId = Date.now()
      let novo = { ...payload, id: novoId }
      if (novo.recorrente) { novo.recorrenciaGrupoId = String(novoId); novo.recorrenciaAtiva = true } else { novo.recorrenciaGrupoId = '' }
      update('financeiro', [...lancamentos, novo])
      showFeedback(novo.recorrente ? t(lang, 'lanc.savedRec') : t(lang, 'lanc.saved'))
    }
    resetForm()
  }

  const handleEdit = (l) => { setForm({ ...EMPTY_FORM, ...l, parcelado: false, qtdParcelas: '' }); setEditId(l.id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const handleDelete = (l, scope = 'single') => {
    let idsToDelete = [l.id]
    
    if (scope === 'parcel-group' && l._parcelaGrupoId) {
      idsToDelete = lancamentos.filter(x => x._parcelaGrupoId === l._parcelaGrupoId).map(x => x.id)
    } else if (scope === 'recurrence-future' && l.recorrenciaGrupoId) {
      idsToDelete = lancamentos.filter(x => x.recorrenciaGrupoId === l.recorrenciaGrupoId && x.vencimento >= l.vencimento).map(x => x.id)
    }

    const novosLancamentos = lancamentos.filter(x => !idsToDelete.includes(x.id))
    let payloadUpdate = { financeiro: novosLancamentos }
    
    // Se o lançamento estiver vinculado a um projeto, apaga também no projeto para não dar dessincronia
    if (l._projetoId) {
       const projetos = data.projetos || []
       payloadUpdate.projetos = projetos.map(p => {
          if (p.id === l._projetoId) {
             return {
                ...p,
                recebimentos: (p.recebimentos || []).filter(r => !idsToDelete.includes(r.id)),
                gastos: (p.gastos || []).filter(g => !idsToDelete.includes(g.id))
             }
          }
          return p
       })
    }
    
    update(payloadUpdate)
    setDeleteTarget(null)
    showFeedback(idsToDelete.length > 1 ? 'Múltiplos lançamentos excluídos.' : t(lang, 'lanc.deleted'))
  }
  const handleDuplicate = (l) => {
    const {
      _projetoId, _projetoCodigo, _projetoNome, _cliente, _tipoProjeto,
      valorRecebido, dataRecebimento, ...base
    } = l
    // Duplicar um lançamento de Trabalho vira uma cópia pessoal sem vínculo,
    // evitando que receitas duplicadas alimentem o projeto por engano.
    update('financeiro', [...lancamentos, {
      ...base,
      id: Date.now(),
      origem: base.origem === 'Trabalho' ? 'Pessoal' : base.origem,
      projeto: '',
      status: l.tipo === 'Receita' ? 'Prevista' : 'Pendente',
      pago: false,
      recorrente: false,
      recorrenciaGrupoId: '',
      origem: 'Pessoal',
      projeto: '',
    }])
    showFeedback(t(lang, 'lanc.duplicated'))
  }

  const toggleStatus = (l) => {
    if (l.tipo === 'Despesa') {
      const ns = (l.status === 'Pago' || l.status === 'Pago automaticamente') ? 'Pendente' : 'Pago'
      update('financeiro', lancamentos.map(x => x.id === l.id ? { ...x, status: ns, pago: ns === 'Pago' } : x))
    } else {
      const ns = isReceitaRecebida(l) ? 'Prevista' : 'Recebida'
      const dataRecebimento = ns === 'Recebida' ? hojeISO() : ''
      const financeiroAtualizado = lancamentos.map(x => x.id === l.id ? { ...x, status: ns, dataRecebimento, valorRecebido: ns === 'Recebida' ? moneyNumber(x.valorOriginal || x.valor) : 0 } : x)
      if (l._projetoId) {
        update({
          financeiro: financeiroAtualizado,
          projetos: (data.projetos || []).map(p => p.id === l._projetoId ? {
            ...p,
            recebimentos: (p.recebimentos || []).map(r => r.id === l.id ? {
              ...r,
              status: ns === 'Recebida' ? 'Recebido' : 'Pendente',
              dataPagamento: dataRecebimento,
              valorRecebido: ns === 'Recebida' ? moneyNumber(r.valor) : 0,
            } : r)
          } : p)
        })
      } else {
        update('financeiro', financeiroAtualizado)
      }
    }
  }
  const pararRecorrencia = (l) => { update('financeiro', lancamentos.map(x => x.recorrenciaGrupoId === l.recorrenciaGrupoId ? { ...x, recorrenciaAtiva: false } : x)); showFeedback(t(lang, 'lanc.recurrStopped')) }

  const exportCSV = () => {
    const header = ['Tipo', 'Mês', 'Categoria', 'Descrição', 'Valor', 'Vencimento', 'Parcela', 'Forma Pagamento', 'Cartão', 'Status']
    const rows = lancMesBase.map(l => [l.tipo, mesLancamento(l), l.categoria, l.descricao, moneyNumber(l.valor).toFixed(2).replace('.', ','), fmtDataBR(l.vencimento), l.parcela || '', l.formaPagamento || '', l.cartao || '', l.status])
    const csv = [header, ...rows].map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `lancamentos-${mesFiltro}-${new Date().getFullYear()}.csv`; a.click(); URL.revokeObjectURL(url)
    showFeedback(t(lang, 'lanc.csvExported', lancMesBase.length, mesFiltro))
  }

  const statusOptions = form.tipo === 'Receita' ? STATUS_RECEITA : STATUS_DESPESA

  // valor da parcela calculado em tempo real para mostrar no formulário
  const valorParcela = form.parcelado && form.qtdParcelas && Number(form.qtdParcelas) > 0 && Number(form.valor) > 0
    ? (Number(form.valor) / Number(form.qtdParcelas)).toFixed(2)
    : null

  const renderLancRow = (l) => {
    const isVencido = isDespesaVencida(l)
    const isEntrada = l.tipo === 'Receita'
    const isSettled = isEntrada ? isReceitaRecebida(l) : isDespesaPaga(l)
    const rowClass = isEntrada ? 'row-income' : isVencido ? 'row-overdue' : ''
    const valorColor = isEntrada ? 'var(--green)' : (isVencido ? 'var(--red)' : 'inherit')
    const valorPrincipal = isReceitaParcial(l) ? valorPendenteLancamento(l) : moneyNumber(l.valor)
    return (
      <tr key={l.id} className={rowClass}>
        <td><span className={`badge ${l.tipo === 'Receita' ? 'badge-green' : 'badge-red'}`}>{l.tipo}</span></td>
        <td className="muted-cell">{l.categoria}</td>
        <td className="muted-cell">{l.tipo === 'Despesa' ? (l.formaPagamento || '-') + (l.cartao ? ` · ${l.cartao}` : '') : '-'}</td>
        <td className="td-desc">
          <div className="td-desc-main">{l.descricao}</div>
          {/* Lançamento de projeto (Trabalho): mostra só código · nome · cliente */}
          {(l._projetoId || l._projetoCodigo) && (
            <div className="muted-small td-desc-sub">
              {[l._projetoCodigo, l._projetoNome, l._cliente].filter(Boolean).join(' · ')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {l.recorrenciaGrupoId && l.recorrenciaAtiva !== false && <span className="badge badge-blue">Recorrente</span>}
            {l.pagamentoAutomatico && <span className="badge badge-blue">Auto</span>}
            {(l.parcelado || l._parcelaGrupoId) && <span className="badge badge-gray">Parcelado</span>}
            {origemLancamento(l) === 'Trabalho' && <span className="badge badge-gray badge-trabalho">💼 Trabalho</span>}
          </div>
        </td>
        <td style={{ fontWeight: 600, color: valorColor, whiteSpace: 'nowrap' }}>
          {fmt(valorPrincipal)}
          {isReceitaParcial(l) && <div className="muted-small">Recebido: {fmt(valorRecebidoLancamento(l))}</div>}
        </td>
        <td className="muted-cell" style={{ whiteSpace: 'nowrap' }}>{fmtDataBR(l.vencimento)}</td>
        <td className="muted-cell" style={{ whiteSpace: 'nowrap' }}>{l.parcela || '—'}</td>
        <td style={{ whiteSpace: 'nowrap' }}>
          <label className="checkbox-label" style={{ marginBottom: 0 }}>
            <input type="checkbox" checked={isSettled} onChange={() => toggleStatus(l)} style={{ accentColor: 'var(--green)', cursor: 'pointer' }} />
            <span className={`badge ${statusBadgeClass(l.status)}`}>{l.status}</span>
          </label>
        </td>
        <td className="table-actions">
          <button className="btn btn-ghost btn-sm btn-act" title={t(lang, 'lanc.edit')} onClick={() => handleEdit(l)}>{t(lang, 'lanc.edit')}</button>
          <button className="btn btn-ghost btn-sm btn-act" title={t(lang, 'lanc.duplicate')} onClick={() => handleDuplicate(l)}>{t(lang, 'lanc.duplicate')}</button>
          {l.recorrenciaGrupoId && l.recorrenciaAtiva !== false && <button className="btn btn-ghost btn-sm btn-act" onClick={() => pararRecorrencia(l)}>{t(lang, 'lanc.stopRec')}</button>}
          <button className="btn btn-danger btn-sm btn-act" title={t(lang, 'lanc.delete')} onClick={() => setDeleteTarget(l)}>{t(lang, 'lanc.delete')}</button>
        </td>
      </tr>
    )
  }

  return (
    <>
      <div className="page-header page-header-actions">
        <div><h2>{t(lang, 'lanc.title')}</h2><p>{t(lang, 'lanc.sub')}</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={exportCSV} title="Export CSV">↓ CSV</button>
          <button className="btn btn-ghost" onClick={() => setShowOrcamento(s => !s)}>{t(lang, 'lanc.budget')}</button>
          <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...EMPTY_FORM, mes: mesFiltro }) }}>{showForm ? t(lang, 'lanc.close') : t(lang, 'lanc.new')}</button>
        </div>
      </div>
      {feedback && <div className="toast-inline">{feedback}</div>}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="card-title">Excluir lançamento</div>
            <h3 style={{ margin: '0 0 8px' }}>{deleteTarget.descricao}</h3>
            <p className="muted-small" style={{ marginBottom: 16 }}>{fmt(moneyNumber(deleteTarget.valor))} · {fmtDataBR(deleteTarget.vencimento)}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteTarget, 'single')}>Excluir somente este</button>
              {deleteTarget._parcelaGrupoId && (
                <button className="btn btn-danger" onClick={() => handleDelete(deleteTarget, 'parcel-group')}>Excluir todas as parcelas</button>
              )}
              {deleteTarget.recorrenciaGrupoId && (
                <button className="btn btn-danger" onClick={() => handleDelete(deleteTarget, 'recurrence-future')}>Excluir esta e futuras</button>
              )}
            </div>
          </div>
        </div>
      )}
      {showOrcamento && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">{t(lang, 'lanc.budgetTitle')}</div>
          <div className="form-row" style={{ flexWrap: 'wrap' }}>
            {CATEGORIAS_DESPESA.map(cat => (
              <div key={cat} className="form-group" style={{ minWidth: 130, maxWidth: 160 }}>
                <label>{cat}</label>
                <input type="number" value={orcamentos[cat] || ''} onChange={e => update('orcamentoCategoria', { ...orcamentos, [cat]: e.target.value })} placeholder={t(lang, 'lanc.noLimit')} min="0" step="0.01" />
              </div>
            ))}
          </div>
          <p className="muted-small" style={{ marginTop: 8 }}>{t(lang, 'lanc.budgetSub')}</p>
        </div>
      )}
      <div className="filter-row">
        <div className="month-pills">{MESES.map(m => <button key={m} className={`pill ${mesFiltro === m ? 'active' : ''}`} onClick={() => setMesFiltro(m)}>{m.slice(0, 3)}</button>)}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" placeholder={t(lang, 'lanc.searchPh')} value={busca} onChange={e => setBusca(e.target.value)} style={{ minWidth: 220 }} />
          <div className="form-group filter-card-select">
            <label>Origem</label>
            <select value={origemFiltro} onChange={e => setOrigemFiltro(e.target.value)}>
              <option value="Todos">Todas origens</option>
              <option value="Pessoal">Pessoal</option>
              <option value="Trabalho">Trabalho</option>
            </select>
          </div>
          <div className="form-group filter-card-select"><label>{t(lang, 'lanc.card').replace(' *', '')}</label><select value={cartaoFiltro} onChange={e => setCartaoFiltro(e.target.value)}><option value="">{t(lang, 'lanc.allCards')}</option><option value="__nocard__">{t(lang, 'lanc.noCard')}</option>{cartoesUsados.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
      </div>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card"><div className="card-title">{t(lang, 'lanc.currentBalance')}</div><div className="stat-value" style={{ color: saldoAtual >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>{fmt(saldoAtual)}</div><div className="muted-small">{t(lang, 'lanc.recMinusPaid')}</div></div>
        <div className="card"><div className="card-title">{t(lang, 'lanc.projectedBalance')}</div><div className="stat-value" style={{ color: saldoPrevisto >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>{fmt(saldoPrevisto)}</div><div className={`trend ${deltaSaldo >= 0 ? 'positive' : 'negative'}`}>{deltaSaldo >= 0 ? '↑' : '↓'} {fmt(Math.abs(deltaSaldo))} vs. {mesAnterior}</div></div>
        <div className="card">
          <div className="card-title">{t(lang, 'lanc.payable')}</div>
          <div className="stat-value" style={{ color: 'var(--yellow)', fontSize: 20 }}>{fmt(pendentes)}</div>
          {vencidos > 0 && <div className="muted-small" style={{ color: 'var(--red)', marginTop: 4 }}>⚠ {fmt(vencidos)} vencidos</div>}
        </div>
        <div className="card"><div className="card-title">{t(lang, 'lanc.toReceive')}</div><div className="stat-value" style={{ color: 'var(--blue)', fontSize: 20 }}>{fmt(aReceber)}</div></div>
      </div>
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">{editId ? t(lang, 'lanc.editTitle') : t(lang, 'lanc.newTitle')}</div>
          {/* Linha 1: Mês, Tipo, Categoria, Descrição, Valor */}
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-group" style={{ maxWidth: 150 }}><label>{t(lang, 'lanc.month')}</label><select value={form.vencimento ? mesDeISO(form.vencimento) : form.mes} disabled={!!form.vencimento} onChange={e => handleField('mes', e.target.value)}>{MESES.map(m => <option key={m}>{m}</option>)}</select></div>
            <div className="form-group" style={{ maxWidth: 130 }}><label>{t(lang, 'lanc.type')}</label><select value={form.tipo} onChange={e => handleField('tipo', e.target.value)}><option>Receita</option><option>Despesa</option></select></div>
            <div className="form-group" style={{ maxWidth: 180 }}><label>{t(lang, 'lanc.category')}</label><select value={form.categoria} onChange={e => handleField('categoria', e.target.value)}><option value="">{t(lang, 'lanc.selectCat')}</option>{cats.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="form-group" style={{ flex: 2 }}><label>{t(lang, 'lanc.description')}</label><input type="text" value={form.descricao} onChange={e => handleField('descricao', e.target.value)} placeholder={t(lang, 'lanc.descPh')} /></div>
            <div className="form-group" style={{ maxWidth: 130 }}>
              <label>{form.parcelado ? 'Valor Total' : t(lang, 'lanc.value')}</label>
              <input type="number" value={form.valor} onChange={e => handleField('valor', e.target.value)} placeholder="0,00" min="0" step="0.01" />
            </div>
          </div>
          {/* Linha 2: Data, Forma pagamento, Cartão, Parcelas */}
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-group" style={{ maxWidth: 150 }}><label>{form.tipo === 'Receita' ? t(lang, 'lanc.expectedDate') : t(lang, 'lanc.dueDate')}</label><input type="date" value={form.vencimento} onChange={e => handleField('vencimento', e.target.value)} /></div>
            {form.tipo === 'Despesa' && <div className="form-group" style={{ maxWidth: 160 }}><label>{t(lang, 'lanc.payMethod')}</label><select value={form.formaPagamento} onChange={e => handleField('formaPagamento', e.target.value)}>{formasPagamentoOptions.map(f => <option key={f}>{f}</option>)}</select></div>}
            {form.tipo === 'Despesa' && form.formaPagamento === 'Crédito' && <div className="form-group" style={{ maxWidth: 160 }}><label>{t(lang, 'lanc.card')}</label><select value={form.cartao} onChange={e => handleField('cartao', e.target.value)}><option value="">{t(lang, 'lanc.selectCard')}</option>{cartoesUsados.map(c => <option key={c}>{c}</option>)}</select></div>}
            
            {form.tipo === 'Receita' && (
              <div className="form-group" style={{ maxWidth: 200 }}>
                <label>Projeto Relacionado</label>
                <select value={form.projeto || ''} onChange={e => handleField('projeto', e.target.value)}>
                  <option value="">Nenhum</option>
                  {(data.projetos || []).map(p => <option key={p.codigo} value={p.codigo}>{p.codigo} - {p.nome}</option>)}
                </select>
              </div>
            )}

            {!form.parcelado && !form.recorrente && (
              <div className="form-group" style={{ maxWidth: 110 }}>
                <label>Status</label>
                <select value={form.status} onChange={e => handleField('status', e.target.value)}>
                  {statusOptions.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="form-group" style={{ flex: 2 }}><label>{t(lang, 'lanc.obs')}</label><input type="text" value={form.observacao} onChange={e => handleField('observacao', e.target.value)} /></div>
          </div>
          
          {form.tipo === 'Receita' && form.projeto && (
            (() => {
              const proj = (data.projetos || []).find(p => p.codigo === form.projeto)
              if (!proj) return null
              return (
                <div style={{ background: 'var(--bg-card-alt)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                  <strong style={{ display: 'block', marginBottom: 4 }}>Detalhes do Projeto Vinculado:</strong>
                  <div style={{ display: 'flex', gap: 16, color: 'var(--text-muted)' }}>
                    <span><strong>Código:</strong> {proj.codigo}</span>
                    <span><strong>Nome:</strong> {proj.nome}</span>
                    <span><strong>Cliente:</strong> {proj.cliente || 'Não informado'}</span>
                    <span><strong>Tipo:</strong> {proj.tipoProjeto || 'Não informado'}</span>
                  </div>
                </div>
              )
            })()
          )}
          {/* Linha 3: Opções de recorrência / parcelamento */}
          <div className="form-row" style={{ alignItems: 'flex-start', gap: 16, marginBottom: 4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.recorrente} onChange={e => handleField('recorrente', e.target.checked)} />
                {t(lang, 'lanc.recurring')}
              </label>
              {form.tipo === 'Despesa' && (
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.parcelado} onChange={e => handleField('parcelado', e.target.checked)} disabled={!!editId} />
                  Parcelado
                </label>
              )}
              {form.tipo === 'Despesa' && (
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.pagamentoAutomatico} onChange={e => handleField('pagamentoAutomatico', e.target.checked)} />
                  Pagamento automático
                </label>
              )}
            </div>
            {form.recorrente && <>
              <div className="form-group" style={{ maxWidth: 150 }}>
                <label>{t(lang, 'lanc.frequency')}</label>
                <select value={form.recorrenciaTipo} onChange={e => handleField('recorrenciaTipo', e.target.value)}>
                  {TIPOS_RECORRENCIA.map(tp => <option key={tp}>{tp}</option>)}
                </select>
              </div>
              {form.recorrenciaTipo === 'Personalizada' && (
                <div className="form-group" style={{ maxWidth: 130 }}>
                  <label>{t(lang, 'lanc.everyDays')}</label>
                  <input type="number" min="1" value={form.recorrenciaIntervaloDias} onChange={e => handleField('recorrenciaIntervaloDias', e.target.value)} placeholder={t(lang, 'lanc.everyDaysPh')} />
                </div>
              )}
            </>}
            {form.parcelado && !form.recorrente && (
              <div className="form-group" style={{ maxWidth: 140 }}>
                <label>Quantidade de parcelas</label>
                <input type="number" min="2" max="120" value={form.qtdParcelas} onChange={e => handleField('qtdParcelas', e.target.value)} placeholder="Ex: 10" />
              </div>
            )}
            {/* Preview de parcelas */}
            {valorParcela && (
              <div style={{ padding: '8px 14px', background: 'var(--accent-soft)', borderRadius: 10, fontSize: 13, color: 'var(--accent)', fontWeight: 600, alignSelf: 'flex-end', marginBottom: 2 }}>
                {form.qtdParcelas}× de {fmt(Number(valorParcela))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginLeft: 'auto' }}>
              <button className="btn btn-primary" onClick={handleSave}>{t(lang, 'lanc.save')}</button>
              <button className="btn btn-ghost" onClick={resetForm}>{t(lang, 'lanc.cancel')}</button>
            </div>
          </div>
        </div>
      )}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">{t(lang, 'lanc.expByCat', mesFiltro)}</div>
          {despesasPorCategoria.length === 0 ? <p className="muted-small">{t(lang, 'lanc.noneInPeriod')}</p> : despesasPorCategoria.map(item => {
            const orcLimite = moneyNumber(orcamentos[item.categoria]); const pctOrc = orcLimite > 0 ? Math.min(100, (item.total / orcLimite) * 100) : null; const fc = pctOrc === null ? '' : pctOrc >= 90 ? 'danger' : pctOrc >= 70 ? 'warn' : 'ok'
            return (<div key={item.categoria} className="bar-row">
              <div className="bar-row-label"><span>{item.categoria}</span><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{pctOrc !== null && <span className={`budget-pct-badge ${fc}`}>{Math.round(pctOrc)}%</span>}<strong>{fmt(item.total)}</strong>{orcLimite > 0 && <span className="muted-small">/ {fmt(orcLimite)}</span>}</div></div>
              <div className="chart-track"><div className="chart-fill neutral" style={{ width: `${(item.total / maxCategoria) * 100}%` }} /></div>
              {pctOrc !== null && <div className="budget-bar-wrap"><div className="budget-bar-track"><div className={`budget-bar-fill ${fc}`} style={{ width: `${pctOrc}%` }} /></div></div>}
            </div>)
          })}
        </div>
        <div className="card">
          <div className="card-title">{t(lang, 'lanc.byCard', mesFiltro)}</div>
          {resumoCartoes.length === 0 ? <p className="muted-small">{t(lang, 'lanc.noCredit')}</p> : resumoCartoes.map(item => (<div key={item.cartao} className="bar-row"><div className="bar-row-label"><span>{item.cartao}</span><strong>{fmt(item.total)}</strong></div><div className="chart-track"><div className="chart-fill blue" style={{ width: `${(item.total / Math.max(1, resumoCartoes[0].total)) * 100}%` }} /></div></div>))}
        </div>
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">{t(lang, 'lanc.monthEvol')}</div>
        <div className="monthly-chart">{evolucaoMensal.map(item => (<div key={item.mes} className={`monthly-group ${item.mes === mesFiltro ? 'active' : ''}`} onClick={() => setMesFiltro(item.mes)}><div className="monthly-bars"><span className="income" style={{ height: `${Math.max(4, (item.receitas / maxEvolucao) * 100)}%` }} title={`Receitas: ${fmt(item.receitas)}`} /><span className="expense" style={{ height: `${Math.max(4, (item.despesas / maxEvolucao) * 100)}%` }} title={`Despesas: ${fmt(item.despesas)}`} /></div><div className="monthly-label">{item.mes.slice(0, 3)}</div></div>))}</div>
        <div className="chart-legend"><span><i className="legend-income" /> {t(lang, 'dash.income')}</span><span><i className="legend-expense" /> {t(lang, 'dash.expenses')}</span></div>
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="card-title" style={{ margin: 0 }}>{mesFiltro} — {lancMes.length} {lancMes.length !== 1 ? t(lang, 'lanc.countLabelPl') : t(lang, 'lanc.countLabel')}{busca && <span className="muted-small" style={{ marginLeft: 8 }}>({t(lang, 'lanc.searchLabel')} "{busca}")</span>}</div>
          {busca && <button className="btn btn-ghost btn-sm" onClick={() => setBusca('')}>{t(lang, 'lanc.clearSearch')}</button>}
        </div>
        {lancMes.length === 0 ? <p className="muted-small">{t(lang, 'lanc.noneFiltered')}</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>{t(lang, 'lanc.typeCol')}</th><th>{t(lang, 'lanc.catCol')}</th><th>{t(lang, 'lanc.payCol')}</th><th>{t(lang, 'lanc.descCol')}</th><th>{t(lang, 'lanc.valueCol')}</th><th>{t(lang, 'lanc.dateCol')}</th><th>Parcela</th><th>{t(lang, 'lanc.statusCol')}</th><th></th></tr></thead>
            <tbody>{(() => {
              const agrupado = g => lancMes.filter(l => l.tipo === g).sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))
              const despesas = agrupado('Despesa')
              const receitas = agrupado('Receita')
              return (
                <>
                  {despesas.length > 0 && (
                    <>
                      <tr className="table-section-row"><td colSpan={9}><span className="table-section-label table-section-expense">💸 Despesas <small>{despesas.length}</small></span></td></tr>
                      {despesas.map(renderLancRow)}
                    </>
                  )}
                  {receitas.length > 0 && (
                    <>
                      <tr className="table-section-row"><td colSpan={9}><span className="table-section-label table-section-income">💰 Receitas <small>{receitas.length}</small></span></td></tr>
                      {receitas.map(renderLancRow)}
                    </>
                  )}
                </>
              )
            })()}</tbody>
          </table></div>
        )}
      </div>
    </>
  )
}
