import { useMemo, useState } from 'react'
import { t } from '../lib/i18n'
import {
  MESES, CATEGORIAS_RECEITA, CATEGORIAS_DESPESA, FORMAS_PAGAMENTO, TIPOS_RECORRENCIA,
  fmt, moneyNumber, sugerirCategoria, hojeISO, mesDeISO, fmtDataBR, gerarParcelas,
} from '../lib/finance'

const CARTOES_PADRAO = ['Nubank', 'Inter', 'Itaú', 'Santander', 'Caixa', 'Banco do Brasil', 'Outro']

const EMPTY_FORM = {
  mes: '', tipo: 'Despesa', categoria: '', descricao: '', valor: '',
  status: 'Pendente', observacao: '', parcela: '', vencimento: '',
  formaPagamento: 'Dinheiro', cartao: '',
  recorrente: false, recorrenciaTipo: 'Mensal', recorrenciaIntervaloDias: '',
  parcelado: false, qtdParcelas: '', pagamentoAutomatico: false,
}

const STATUS_DESPESA = ['Pendente', 'Pago', 'Vencido', 'Pago automaticamente']
const STATUS_RECEITA = ['Prevista', 'Recebida']

function sum(items, tipo) { return items.filter(l => l.tipo === tipo).reduce((s, l) => s + (parseFloat(l.valor) || 0), 0) }
function mesIndex(nome) { return MESES.findIndex(m => m.toLowerCase() === (nome || '').toLowerCase()) }

function statusBadgeClass(status) {
  if (status === 'Pago' || status === 'Recebida' || status === 'Pago automaticamente') return 'badge-green'
  if (status === 'Vencido') return 'badge-red'
  if (status === 'Prevista') return 'badge-blue'
  return 'badge-yellow'
}

export default function FinanceiroLancamentos({ data, update, lang = 'pt' }) {
  const hoje = new Date()
  const mesAtualIdx = hoje.getMonth()
  const [mesFiltro, setMesFiltro] = useState(MESES[mesAtualIdx])
  const [cartaoFiltro, setCartaoFiltro] = useState('')
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState({ ...EMPTY_FORM, mes: MESES[mesAtualIdx] })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showOrcamento, setShowOrcamento] = useState(false)
  const [feedback, setFeedback] = useState('')

  const lancamentos = data.financeiro || []
  const orcamentos = data.orcamentoCategoria || {}
  const cartoesCadastrados = (data.cartoes || []).map(c => c.nome)

  const cartoesUsados = useMemo(() => {
    const usados = lancamentos.map(l => l.cartao).filter(Boolean)
    return Array.from(new Set([...CARTOES_PADRAO, ...cartoesCadastrados, ...usados]))
  }, [lancamentos, cartoesCadastrados])

  const lancMesBase = lancamentos.filter(l => (l.mes || '').toLowerCase() === mesFiltro.toLowerCase())
  const lancMesCartao = cartaoFiltro === '' ? lancMesBase : cartaoFiltro === '__nocard__' ? lancMesBase.filter(l => !l.cartao) : lancMesBase.filter(l => l.cartao === cartaoFiltro)
  const lancMes = busca ? lancMesCartao.filter(l => l.descricao?.toLowerCase().includes(busca.toLowerCase()) || l.categoria?.toLowerCase().includes(busca.toLowerCase())) : lancMesCartao

  const receitas = sum(lancMes, 'Receita'), despesas = sum(lancMes, 'Despesa'), saldoPrevisto = receitas - despesas
  const receitasRecebidas = lancMes.filter(l => l.tipo === 'Receita' && l.status === 'Recebida').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const despesasPagas = lancMes.filter(l => l.tipo === 'Despesa' && (l.status === 'Pago' || l.status === 'Pago automaticamente')).reduce((s, l) => s + moneyNumber(l.valor), 0)
  const saldoAtual = receitasRecebidas - despesasPagas
  const pendentes = lancMes.filter(l => (l.status === 'Pendente' || l.status === 'Vencido') && l.tipo === 'Despesa').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const aReceber = lancMes.filter(l => l.status === 'Prevista' && l.tipo === 'Receita').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const vencidos = lancMes.filter(l => l.status === 'Vencido').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const mesAnterior = MESES[(mesIndex(mesFiltro) + 11) % 12]
  const lancMesAnt = lancamentos.filter(l => (l.mes || '').toLowerCase() === mesAnterior.toLowerCase())
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

  const evolucaoMensal = useMemo(() => MESES.map(mes => { const itens = lancamentos.filter(l => (l.mes || '').toLowerCase() === mes.toLowerCase()); return { mes, receitas: sum(itens, 'Receita'), despesas: sum(itens, 'Despesa') } }), [lancamentos])
  const maxCategoria = Math.max(1, ...despesasPorCategoria.map(i => i.total))
  const maxEvolucao = Math.max(1, ...evolucaoMensal.flatMap(i => [i.receitas, i.despesas]))
  const cats = form.tipo === 'Receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA

  const showFeedback = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(''), 2400) }

  const handleField = (k, v) => setForm(f => {
    const next = { ...f, [k]: v }
    if (k === 'tipo') { next.cartao = ''; next.formaPagamento = v === 'Receita' ? '' : 'Dinheiro'; next.status = v === 'Receita' ? 'Prevista' : 'Pendente'; next.parcelado = false; next.pagamentoAutomatico = false }
    if (k === 'formaPagamento' && v !== 'Crédito') next.cartao = ''
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

    const payload = {
      ...form,
      descricao: form.descricao.trim(),
      cartao: form.tipo === 'Despesa' && form.formaPagamento === 'Crédito' ? form.cartao : '',
      formaPagamento: form.tipo === 'Despesa' ? form.formaPagamento : '',
    }

    if (editId !== null) {
      const original = lancamentos.find(l => l.id === editId)
      let aplicarFuturos = false
      if (original?.recorrenciaGrupoId) aplicarFuturos = window.confirm(t(lang, 'lanc.confirmRecurEdit'))
      update('financeiro', lancamentos.map(l => {
        if (l.id === editId) return { ...payload, id: editId }
        if (aplicarFuturos && l.recorrenciaGrupoId === original.recorrenciaGrupoId && l.vencimento > original.vencimento)
          return { ...l, valor: payload.valor, categoria: payload.categoria, descricao: payload.descricao, formaPagamento: payload.formaPagamento, cartao: payload.cartao, observacao: payload.observacao }
        return l
      }))
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
  const handleDelete = (l) => {
    // Se pertence a um grupo de parcelas, perguntar se quer excluir todas
    if (l._parcelaGrupoId) {
      const todas = window.confirm(`Excluir somente esta parcela (${l.parcela}) ou TODAS as parcelas do grupo?\n\nOK = Todas | Cancelar = Somente esta`)
      if (todas) {
        update('financeiro', lancamentos.filter(x => x._parcelaGrupoId !== l._parcelaGrupoId))
        showFeedback('Todas as parcelas excluídas.')
        return
      }
    } else if (l.recorrenciaGrupoId) {
      const futuros = window.confirm(t(lang, 'lanc.confirmRecurDelete'))
      if (futuros) { update('financeiro', lancamentos.filter(x => !(x.recorrenciaGrupoId === l.recorrenciaGrupoId && x.vencimento >= l.vencimento))); showFeedback(t(lang, 'lanc.deletedFuture')); return }
    } else {
      if (!window.confirm(`Excluir "${l.descricao}" (${fmt(moneyNumber(l.valor))})?`)) return
    }
    update('financeiro', lancamentos.filter(x => x.id !== l.id)); showFeedback(t(lang, 'lanc.deleted'))
  }
  const handleDuplicate = (l) => { update('financeiro', [...lancamentos, { ...l, id: Date.now(), status: l.tipo === 'Receita' ? 'Prevista' : 'Pendente', pago: false, recorrente: false, recorrenciaGrupoId: '' }]); showFeedback(t(lang, 'lanc.duplicated')) }

  const toggleStatus = (l) => {
    if (l.tipo === 'Despesa') {
      const ns = (l.status === 'Pago' || l.status === 'Pago automaticamente') ? 'Pendente' : 'Pago'
      update('financeiro', lancamentos.map(x => x.id === l.id ? { ...x, status: ns, pago: ns === 'Pago' } : x))
    } else {
      const ns = l.status === 'Recebida' ? 'Prevista' : 'Recebida'
      update('financeiro', lancamentos.map(x => x.id === l.id ? { ...x, status: ns, dataRecebimento: ns === 'Recebida' ? hojeISO() : '' } : x))
    }
  }
  const pararRecorrencia = (l) => { update('financeiro', lancamentos.map(x => x.recorrenciaGrupoId === l.recorrenciaGrupoId ? { ...x, recorrenciaAtiva: false } : x)); showFeedback(t(lang, 'lanc.recurrStopped')) }

  const exportCSV = () => {
    const header = ['Tipo', 'Mês', 'Categoria', 'Descrição', 'Valor', 'Vencimento', 'Parcela', 'Forma Pagamento', 'Cartão', 'Status']
    const rows = lancMesBase.map(l => [l.tipo, l.mes, l.categoria, l.descricao, moneyNumber(l.valor).toFixed(2).replace('.', ','), fmtDataBR(l.vencimento), l.parcela || '', l.formaPagamento || '', l.cartao || '', l.status])
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
            <div className="form-group" style={{ maxWidth: 140 }}><label>{t(lang, 'lanc.month')}</label><select value={form.mes} onChange={e => handleField('mes', e.target.value)}>{MESES.map(m => <option key={m}>{m}</option>)}</select></div>
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
            {form.tipo === 'Despesa' && <div className="form-group" style={{ maxWidth: 160 }}><label>{t(lang, 'lanc.payMethod')}</label><select value={form.formaPagamento} onChange={e => handleField('formaPagamento', e.target.value)}>{FORMAS_PAGAMENTO.map(f => <option key={f}>{f}</option>)}</select></div>}
            {form.tipo === 'Despesa' && form.formaPagamento === 'Crédito' && <div className="form-group" style={{ maxWidth: 160 }}><label>{t(lang, 'lanc.card')}</label><select value={form.cartao} onChange={e => handleField('cartao', e.target.value)}><option value="">{t(lang, 'lanc.selectCard')}</option>{cartoesUsados.map(c => <option key={c}>{c}</option>)}</select></div>}
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
            <tbody>{lancMes.sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || '')).map(l => {
              const isSettled = (l.tipo === 'Despesa' && (l.status === 'Pago' || l.status === 'Pago automaticamente')) || (l.tipo === 'Receita' && l.status === 'Recebida')
              const isVencido = l.status === 'Vencido'
              const valorColor = l.tipo === 'Receita'
                ? (l.status === 'Recebida' ? 'var(--green)' : 'var(--blue)')
                : (isSettled ? 'var(--text-muted)' : isVencido ? 'var(--red)' : 'var(--red)')
              return (
                <tr key={l.id} className={isSettled ? 'row-settled' : isVencido ? 'row-overdue' : 'row-pending'}>
                  <td><span className={`badge ${l.tipo === 'Receita' ? 'badge-green' : 'badge-red'}`}>{l.tipo}</span></td>
                  <td className="muted-cell">{l.categoria}</td>
                  <td className="muted-cell">{l.tipo === 'Despesa' ? (l.formaPagamento || '-') + (l.cartao ? ` · ${l.cartao}` : '') : '-'}</td>
                  <td style={{ fontWeight: 500 }}>
                    {l.descricao}
                    {l.recorrenciaGrupoId && <span className="badge badge-gray" style={{ marginLeft: 6 }} title="Recorrente">↻</span>}
                    {l.pagamentoAutomatico && <span className="badge badge-blue" style={{ marginLeft: 4 }} title="Pagamento automático">⚡</span>}
                    {l._parcelaGrupoId && <span className="badge badge-gray" style={{ marginLeft: 4 }} title="Parcelado">🔢</span>}
                  </td>
                  <td style={{ fontWeight: 600, color: valorColor }}>{fmt(l.valor)}</td>
                  <td className="muted-cell">{fmtDataBR(l.vencimento)}</td>
                  <td className="muted-cell" style={{ whiteSpace: 'nowrap' }}>{l.parcela || '—'}</td>
                  <td>
                    <label className="checkbox-label" style={{ marginBottom: 0 }}>
                      <input type="checkbox" checked={isSettled} onChange={() => toggleStatus(l)} style={{ accentColor: 'var(--green)', cursor: 'pointer' }} />
                      <span className={`badge ${statusBadgeClass(l.status)}`}>{l.status}</span>
                    </label>
                  </td>
                  <td className="table-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(l)}>{t(lang, 'lanc.edit')}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDuplicate(l)}>{t(lang, 'lanc.duplicate')}</button>
                    {l.recorrenciaGrupoId && l.recorrenciaAtiva !== false && <button className="btn btn-ghost btn-sm" onClick={() => pararRecorrencia(l)}>{t(lang, 'lanc.stopRec')}</button>}
                    <button className="btn btn-danger" onClick={() => handleDelete(l)}>{t(lang, 'lanc.delete')}</button>
                  </td>
                </tr>
              )
            })}</tbody>
          </table></div>
        )}
      </div>
    </>
  )
}
