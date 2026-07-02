import { useMemo, useState } from 'react'
import { t } from '../lib/i18n'
import { fmt, moneyNumber, calcularFatura } from '../lib/finance'

const EMPTY_FORM = { nome: '', limite: '', fechamento: '10', vencimento: '17' }

export default function FinanceiroCartoes({ data, update, lang = 'pt' }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [feedback, setFeedback] = useState('')

  const cartoes = data.cartoes || []
  const lancamentos = data.financeiro || []

  const showFeedback = (msg) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 2400)
  }

  const resumo = useMemo(() => cartoes.map(cartao => {
    const despesasCartao = lancamentos.filter(l => l.tipo === 'Despesa' && l.formaPagamento === 'Crédito' && l.cartao === cartao.nome)
    const naoPagas = despesasCartao.filter(l => l.status !== 'Pago')
    const utilizado = naoPagas.reduce((s, l) => s + moneyNumber(l.valor), 0)
    const disponivel = Math.max(0, moneyNumber(cartao.limite) - utilizado)

    const faturas = {}
    naoPagas.forEach(l => {
      if (!l.vencimento) return
      const fatura = calcularFatura({ dataCompraISO: l.vencimento, fechamentoDia: Number(cartao.fechamento) || 1, vencimentoDia: Number(cartao.vencimento) || 1 })
      if (!fatura) return
      const key = fatura.vencimentoISO
      if (!faturas[key]) faturas[key] = { label: fatura.label, vencimentoISO: fatura.vencimentoISO, total: 0 }
      faturas[key].total += moneyNumber(l.valor)
    })
    const proximasFaturas = Object.values(faturas).sort((a, b) => a.vencimentoISO.localeCompare(b.vencimentoISO)).slice(0, 3)

    return { cartao, utilizado, disponivel, proximasFaturas }
  }), [cartoes, lancamentos])

  const handleField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(false)
  }

  const handleSave = () => {
    if (!form.nome.trim() || !form.limite) {
      showFeedback('Preencha nome e limite do cartão.')
      return
    }
    const payload = { nome: form.nome.trim(), limite: form.limite, fechamento: form.fechamento, vencimento: form.vencimento }
    if (editId !== null) {
      update('cartoes', cartoes.map(c => c.id === editId ? { ...payload, id: editId } : c))
      showFeedback('Cartão atualizado.')
    } else {
      update('cartoes', [...cartoes, { ...payload, id: Date.now() }])
      showFeedback('Cartão cadastrado.')
    }
    resetForm()
  }

  const handleEdit = (c) => {
    setForm({ nome: c.nome, limite: c.limite, fechamento: c.fechamento, vencimento: c.vencimento })
    setEditId(c.id)
    setShowForm(true)
  }

  const handleDelete = (id) => {
    update('cartoes', cartoes.filter(c => c.id !== id))
    showFeedback('Cartão removido.')
  }

  return (
    <>
      <div className="page-header page-header-actions">
        <div>
          <h2>{t(lang,'car.title')}</h2>
          <p>{t(lang,'car.sub')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM) }}>
          {showForm ? t(lang,'car.close') : t(lang,'car.new')}
        </button>
      </div>

      {feedback && <div className="toast-inline">{feedback}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">{editId ? t(lang,'car.editTitle') : t(lang,'car.newTitle')}</div>
          <div className="form-row">
            <div className="form-group">
              <label>{t(lang,'car.name')}</label>
              <input type="text" value={form.nome} onChange={e => handleField('nome', e.target.value)} placeholder="Ex: Nubank" />
            </div>
            <div className="form-group" style={{ maxWidth: 140 }}>
              <label>{t(lang,'car.limit')}</label>
              <input type="number" value={form.limite} onChange={e => handleField('limite', e.target.value)} min="0" step="0.01" />
            </div>
            <div className="form-group" style={{ maxWidth: 140 }}>
              <label>{t(lang,'car.closingDay')}</label>
              <input type="number" min="1" max="31" value={form.fechamento} onChange={e => handleField('fechamento', e.target.value)} />
            </div>
            <div className="form-group" style={{ maxWidth: 140 }}>
              <label>{t(lang,'car.dueDay')}</label>
              <input type="number" min="1" max="31" value={form.vencimento} onChange={e => handleField('vencimento', e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSave}>{t(lang,'car.save')}</button>
              <button className="btn btn-ghost" onClick={resetForm}>{t(lang,'car.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {resumo.length === 0 ? (
        <div className="card"><p className="muted-small">{t(lang,'car.none')}</p></div>
      ) : (
        <div className="grid-2">
          {resumo.map(({ cartao, utilizado, disponivel, proximasFaturas }) => (
            <div className="card" key={cartao.id}>
              <div className="section-header-row" style={{ marginBottom: 14 }}>
                <div className="card-title" style={{ margin: 0 }}>{cartao.nome}</div>
                <div className="table-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(cartao)}>{t(lang,'car.edit')}</button>
                  <button className="btn btn-danger" onClick={() => handleDelete(cartao.id)}>{t(lang,'car.delete')}</button>
                </div>
              </div>
              <div className="grid-3" style={{ marginBottom: 14 }}>
                <div>
                  <div className="card-title">{t(lang,'car.limitLabel')}</div>
                  <div className="stat-value" style={{ fontSize: 17 }}>{fmt(cartao.limite)}</div>
                </div>
                <div>
                  <div className="card-title">{t(lang,'car.used')}</div>
                  <div className="stat-value" style={{ fontSize: 17, color: 'var(--red)' }}>{fmt(utilizado)}</div>
                </div>
                <div>
                  <div className="card-title">{t(lang,'car.available')}</div>
                  <div className="stat-value" style={{ fontSize: 17, color: 'var(--green)' }}>{fmt(disponivel)}</div>
                </div>
              </div>
              <div className="progress-bar" style={{ marginBottom: 14 }}>
                <div className="progress-fill" style={{ width: `${Math.min(100, (utilizado / Math.max(1, moneyNumber(cartao.limite))) * 100)}%` }} />
              </div>
              <div className="muted-small" style={{ marginBottom: 6 }}>{t(lang,'car.closingDue',cartao.fechamento,cartao.vencimento)}</div>
              <div className="card-title" style={{ marginTop: 10 }}>{t(lang,'car.nextBills')}</div>
              {proximasFaturas.length === 0 ? (
                <p className="muted-small">{t(lang,'car.noBills')}</p>
              ) : proximasFaturas.map(f => (
                <div key={f.vencimentoISO} className="list-row">
                  <span className="row-kicker">{f.label}</span>
                  <span style={{ fontSize: 13 }}>{t(lang,'car.due')} {f.vencimentoISO ? new Date(f.vencimentoISO + 'T00:00:00').toLocaleDateString(lang==='en'?'en-US':'pt-BR') : ''} · {fmt(f.total)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
