import { useState } from 'react'
import { fmt, moneyNumber, hojeISO, fmtDataBR, calcularSaldoDivida } from '../lib/finance'

const EMPTY_DIVIDA = {
  nome: '', credor: '', valorOriginal: '', dataCadastro: '', observacoes: '', status: 'Em aberto',
}

const EMPTY_PAGAMENTO = { data: '', valor: '', observacao: '' }

export default function FinanceiroDividas({ data, update }) {
  const dividas = data.dividas || []
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_DIVIDA })
  const [editId, setEditId] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [expandida, setExpandida] = useState(null)
  const [pagForm, setPagForm] = useState({ ...EMPTY_PAGAMENTO })
  const [showPagForm, setShowPagForm] = useState(null) // id da dívida que está com form de pagamento aberto

  const showFeedback = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(''), 2500) }

  // ── Totalizadores ──
  const abertas = dividas.filter(d => d.status === 'Em aberto')
  const quitadas = dividas.filter(d => d.status === 'Quitada')
  const totalOriginal = abertas.reduce((s, d) => s + moneyNumber(d.valorOriginal), 0)
  const totalPago = abertas.reduce((s, d) => s + calcularSaldoDivida(d).totalPago, 0)
  const totalSaldo = abertas.reduce((s, d) => s + calcularSaldoDivida(d).saldo, 0)

  const handleSave = () => {
    if (!form.nome.trim() || !form.valorOriginal) { showFeedback('Preencha nome e valor original.'); return }
    if (editId) {
      update('dividas', dividas.map(d => d.id === editId ? { ...d, ...form, valorOriginal: Number(form.valorOriginal) } : d))
      showFeedback('Dívida atualizada!')
    } else {
      const nova = { ...form, id: String(Date.now()), valorOriginal: Number(form.valorOriginal), dataCadastro: form.dataCadastro || hojeISO(), pagamentos: [] }
      update('dividas', [...dividas, nova])
      showFeedback('Dívida cadastrada!')
    }
    setForm({ ...EMPTY_DIVIDA }); setEditId(null); setShowForm(false)
  }

  const handleEdit = (d) => { setForm({ nome: d.nome, credor: d.credor, valorOriginal: String(d.valorOriginal), dataCadastro: d.dataCadastro, observacoes: d.observacoes, status: d.status }); setEditId(d.id); setShowForm(true) }

  const handleDelete = (d) => {
    if (!window.confirm(`Excluir dívida "${d.nome}"?`)) return
    update('dividas', dividas.filter(x => x.id !== d.id))
    showFeedback('Dívida excluída.')
  }

  const handleAddPagamento = (divida) => {
    if (!pagForm.data || !pagForm.valor) { showFeedback('Informe data e valor do pagamento.'); return }
    const novoPag = { ...pagForm, id: String(Date.now()), valor: Number(pagForm.valor) }
    const novosPagamentos = [...(divida.pagamentos || []), novoPag]
    const { saldo } = calcularSaldoDivida({ ...divida, pagamentos: novosPagamentos })
    const novoStatus = saldo <= 0 ? 'Quitada' : divida.status
    update('dividas', dividas.map(d => d.id === divida.id ? { ...d, pagamentos: novosPagamentos, status: novoStatus } : d))
    setPagForm({ ...EMPTY_PAGAMENTO }); setShowPagForm(null)
    showFeedback(saldo <= 0 ? '🎉 Dívida quitada!' : `Pagamento registrado! Saldo: ${fmt(saldo)}`)
  }

  const handleDeletePagamento = (divida, pagId) => {
    if (!window.confirm('Excluir este pagamento?')) return
    const novosPags = (divida.pagamentos || []).filter(p => p.id !== pagId)
    const { saldo } = calcularSaldoDivida({ ...divida, pagamentos: novosPags })
    const novoStatus = saldo <= 0 ? 'Quitada' : 'Em aberto'
    update('dividas', dividas.map(d => d.id === divida.id ? { ...d, pagamentos: novosPags, status: novoStatus } : d))
    showFeedback('Pagamento removido.')
  }

  const pctQuitado = (divida) => {
    const { original, totalPago } = calcularSaldoDivida(divida)
    if (!original) return 0
    return Math.min(100, Math.round((totalPago / original) * 100))
  }

  return (
    <>
      <div className="page-header page-header-actions">
        <div><h2>💳 Dívidas</h2><p>Controle de dívidas e pagamentos irregulares</p></div>
        <button className="btn btn-primary" onClick={() => { setShowForm(s => !s); setEditId(null); setForm({ ...EMPTY_DIVIDA }) }}>
          {showForm ? 'Fechar' : '+ Nova dívida'}
        </button>
      </div>

      {feedback && <div className="toast-inline">{feedback}</div>}

      {/* Dashboard de dívidas */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Dívidas abertas</div>
          <div className="stat-value" style={{ color: 'var(--red)', fontSize: 22 }}>{abertas.length}</div>
          <div className="muted-small">{quitadas.length} quitada{quitadas.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="card">
          <div className="card-title">Valor original (abertas)</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{fmt(totalOriginal)}</div>
        </div>
        <div className="card">
          <div className="card-title">Total pago</div>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 18 }}>{fmt(totalPago)}</div>
        </div>
        <div className="card">
          <div className="card-title">Saldo devedor</div>
          <div className="stat-value" style={{ color: 'var(--red)', fontSize: 18 }}>{fmt(totalSaldo)}</div>
          {totalOriginal > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                {Math.round((totalPago / totalOriginal) * 100)}% pago
              </div>
              <div className="chart-track">
                <div className="chart-fill" style={{ width: `${Math.round((totalPago / totalOriginal) * 100)}%`, background: 'var(--green)', borderRadius: 4 }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Formulário de nova/editar dívida */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">{editId ? 'Editar dívida' : 'Nova dívida'}</div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Nome *</label>
              <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Dívida do cartão, Empréstimo..." />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Credor</label>
              <input type="text" value={form.credor} onChange={e => setForm(f => ({ ...f, credor: e.target.value }))} placeholder="Ex: Banco, pessoa..." />
            </div>
            <div className="form-group" style={{ maxWidth: 140 }}>
              <label>Valor original *</label>
              <input type="number" min="0" step="0.01" value={form.valorOriginal} onChange={e => setForm(f => ({ ...f, valorOriginal: e.target.value }))} placeholder="0,00" />
            </div>
            <div className="form-group" style={{ maxWidth: 150 }}>
              <label>Data cadastro</label>
              <input type="date" value={form.dataCadastro} onChange={e => setForm(f => ({ ...f, dataCadastro: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Observações</label>
              <input type="text" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Condições, informações extras..." />
            </div>
            <div className="form-group" style={{ maxWidth: 140 }}>
              <label>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option>Em aberto</option>
                <option>Quitada</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
              <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditId(null); setForm({ ...EMPTY_DIVIDA }) }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de dívidas */}
      {dividas.length === 0 && (
        <div className="card"><p className="muted-small">Nenhuma dívida cadastrada. Clique em "+ Nova dívida" para adicionar.</p></div>
      )}

      {/* Abertas primeiro, depois quitadas */}
      {[...abertas, ...quitadas].map(divida => {
        const { original, totalPago: pago, saldo } = calcularSaldoDivida(divida)
        const pct = pctQuitado(divida)
        const isQuitada = divida.status === 'Quitada'
        const isExpanded = expandida === divida.id

        return (
          <div key={divida.id} className="card" style={{ marginBottom: 14, opacity: isQuitada ? 0.75 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{divida.nome}</span>
                  <span className={`badge ${isQuitada ? 'badge-green' : 'badge-red'}`}>{divida.status}</span>
                  {divida.credor && <span className="muted-small">— {divida.credor}</span>}
                </div>
                {/* Barra de progresso */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 24, fontSize: 13, marginBottom: 6 }}>
                    <span>Original: <strong>{fmt(original)}</strong></span>
                    <span style={{ color: 'var(--green)' }}>Pago: <strong>{fmt(pago)}</strong></span>
                    <span style={{ color: isQuitada ? 'var(--green)' : 'var(--red)' }}>Saldo: <strong>{fmt(saldo)}</strong></span>
                    <span className="muted-small">{pct}% quitado</span>
                  </div>
                  <div className="chart-track" style={{ height: 8 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: isQuitada ? 'var(--green)' : 'var(--accent)', borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                </div>
                {divida.dataCadastro && <div className="muted-small">Cadastrado em {fmtDataBR(divida.dataCadastro)}</div>}
                {divida.observacoes && <div className="muted-small" style={{ marginTop: 2 }}>{divida.observacoes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setExpandida(isExpanded ? null : divida.id)}>
                  {isExpanded ? '▲ Fechar' : '▼ Pagamentos'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(divida)}>Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(divida)}>Excluir</button>
              </div>
            </div>

            {/* Seção de pagamentos expandida */}
            {isExpanded && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Pagamentos registrados</div>
                  {!isQuitada && (
                    <button className="btn btn-primary btn-sm" onClick={() => setShowPagForm(showPagForm === divida.id ? null : divida.id)}>
                      + Registrar pagamento
                    </button>
                  )}
                </div>

                {/* Form de novo pagamento */}
                {showPagForm === divida.id && (
                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                    <div className="form-row" style={{ gap: 10 }}>
                      <div className="form-group" style={{ maxWidth: 150 }}>
                        <label>Data *</label>
                        <input type="date" value={pagForm.data} onChange={e => setPagForm(f => ({ ...f, data: e.target.value }))} />
                      </div>
                      <div className="form-group" style={{ maxWidth: 140 }}>
                        <label>Valor *</label>
                        <input type="number" min="0.01" step="0.01" value={pagForm.valor} onChange={e => setPagForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Observação</label>
                        <input type="text" value={pagForm.observacao} onChange={e => setPagForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Opcional..." />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                        <button className="btn btn-primary" onClick={() => handleAddPagamento(divida)}>Salvar</button>
                        <button className="btn btn-ghost" onClick={() => { setShowPagForm(null); setPagForm({ ...EMPTY_PAGAMENTO }) }}>Cancelar</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tabela de pagamentos */}
                {(divida.pagamentos || []).length === 0 ? (
                  <p className="muted-small">Nenhum pagamento registrado ainda.</p>
                ) : (
                  <div className="table-wrap">
                    <table style={{ fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Valor</th>
                          <th>Observação</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...(divida.pagamentos || [])].sort((a, b) => (b.data || '').localeCompare(a.data || '')).map(pag => (
                          <tr key={pag.id}>
                            <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{fmtDataBR(pag.data)}</td>
                            <td style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(pag.valor)}</td>
                            <td className="muted-cell">{pag.observacao || '—'}</td>
                            <td>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeletePagamento(divida, pag.id)}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
