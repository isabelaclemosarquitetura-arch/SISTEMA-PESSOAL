import { useState } from 'react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const CATEGORIAS_RECEITA = ['Salário', 'Freelance', 'Projeto', 'Aluguel', 'Investimento', 'Outro']
const CATEGORIAS_DESPESA = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Roupas', 'Assinaturas', 'Outro']

const EMPTY_FORM = { mes: '', tipo: 'Despesa', categoria: '', descricao: '', valor: '', pago: false, observacao: '', parcela: '', vencimento: '', recorrente: false }

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Financeiro({ data, update }) {
  const hoje = new Date()
  const mesAtualIdx = hoje.getMonth()
  const [mesFiltro, setMesFiltro] = useState(MESES[mesAtualIdx])
  const [form, setForm] = useState({ ...EMPTY_FORM, mes: MESES[mesAtualIdx] })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const lancamentos = data.financeiro || []

  const lancMes = lancamentos.filter(l => (l.mes || '').toLowerCase() === mesFiltro.toLowerCase())
  const receitas = lancMes.filter(l => l.tipo === 'Receita').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)
  const despesas = lancMes.filter(l => l.tipo === 'Despesa').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)
  const saldo = receitas - despesas
  const pendentes = lancMes.filter(l => !l.pago && l.tipo === 'Despesa').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)

  const handleField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.descricao || !form.valor) return
    if (editId !== null) {
      const updated = lancamentos.map(l => l.id === editId ? { ...form, id: editId } : l)
      update('financeiro', updated)
      setEditId(null)
    } else {
      const newItem = { ...form, id: Date.now() }
      update('financeiro', [...lancamentos, newItem])
    }
    setForm({ ...EMPTY_FORM, mes: mesFiltro })
    setShowForm(false)
  }

  const handleEdit = (l) => {
    setForm({ ...l })
    setEditId(l.id)
    setShowForm(true)
    window.scrollTo(0, 0)
  }

  const handleDelete = (id) => {
    update('financeiro', lancamentos.filter(l => l.id !== id))
  }

  const togglePago = (id) => {
    update('financeiro', lancamentos.map(l => l.id === id ? { ...l, pago: !l.pago } : l))
  }

  const cats = form.tipo === 'Receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Financeiro</h2>
          <p>Controle de receitas e despesas</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...EMPTY_FORM, mes: mesFiltro }) }}>
          {showForm ? 'Fechar' : '+ Lançamento'}
        </button>
      </div>

      {/* Filtro de mês */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {MESES.map(m => (
          <button
            key={m}
            onClick={() => setMesFiltro(m)}
            style={{
              padding: '5px 12px', borderRadius: 20, border: '1px solid', fontSize: 12, cursor: 'pointer',
              borderColor: mesFiltro === m ? 'var(--accent)' : 'var(--border)',
              background: mesFiltro === m ? 'var(--accent)' : 'white',
              color: mesFiltro === m ? 'white' : 'var(--text-muted)',
              fontWeight: mesFiltro === m ? 600 : 400
            }}
          >
            {m.slice(0,3)}
          </button>
        ))}
      </div>

      {/* Resumo */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Receitas</div>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 20 }}>{fmt(receitas)}</div>
        </div>
        <div className="card">
          <div className="card-title">Despesas</div>
          <div className="stat-value" style={{ color: 'var(--red)', fontSize: 20 }}>{fmt(despesas)}</div>
        </div>
        <div className="card">
          <div className="card-title">Saldo</div>
          <div className="stat-value" style={{ color: saldo >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>{fmt(saldo)}</div>
        </div>
        <div className="card">
          <div className="card-title">A pagar</div>
          <div className="stat-value" style={{ color: 'var(--yellow)', fontSize: 20 }}>{fmt(pendentes)}</div>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">{editId ? 'Editar lançamento' : 'Novo lançamento'}</div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-group" style={{ maxWidth: 140 }}>
              <label>Mês</label>
              <select value={form.mes} onChange={e => handleField('mes', e.target.value)}>
                {MESES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ maxWidth: 130 }}>
              <label>Tipo</label>
              <select value={form.tipo} onChange={e => handleField('tipo', e.target.value)}>
                <option>Receita</option>
                <option>Despesa</option>
              </select>
            </div>
            <div className="form-group" style={{ maxWidth: 160 }}>
              <label>Categoria</label>
              <select value={form.categoria} onChange={e => handleField('categoria', e.target.value)}>
                <option value="">Selecione...</option>
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Descrição *</label>
              <input type="text" value={form.descricao} onChange={e => handleField('descricao', e.target.value)} placeholder="Ex: Aluguel, Freelance..." />
            </div>
            <div className="form-group" style={{ maxWidth: 120 }}>
              <label>Valor *</label>
              <input type="number" value={form.valor} onChange={e => handleField('valor', e.target.value)} placeholder="0,00" min="0" step="0.01" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ maxWidth: 140 }}>
              <label>Vencimento</label>
              <input type="date" value={form.vencimento} onChange={e => handleField('vencimento', e.target.value)} />
            </div>
            <div className="form-group" style={{ maxWidth: 100 }}>
              <label>Parcela</label>
              <input type="text" value={form.parcela} onChange={e => handleField('parcela', e.target.value)} placeholder="ex: 2/12" />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Observação</label>
              <input type="text" value={form.observacao} onChange={e => handleField('observacao', e.target.value)} />
            </div>
            <div className="form-group" style={{ maxWidth: 100, justifyContent: 'flex-end' }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', marginBottom: 6 }}>
                <input type="checkbox" checked={form.pago} onChange={e => handleField('pago', e.target.checked)} /> Pago
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.recorrente} onChange={e => handleField('recorrente', e.target.checked)} /> Recorrente
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
              <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditId(null) }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="card">
        <div className="card-title">{mesFiltro} — {lancMes.length} lançamento{lancMes.length !== 1 ? 's' : ''}</div>
        {lancMes.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhum lançamento em {mesFiltro}.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Parcela</th>
                  <th>Pago</th>
                  <th>Obs</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lancMes.map(l => (
                  <tr key={l.id}>
                    <td>
                      <span className={`badge ${l.tipo === 'Receita' ? 'badge-green' : 'badge-red'}`}>{l.tipo}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{l.categoria}</td>
                    <td style={{ fontWeight: 500 }}>{l.descricao}</td>
                    <td style={{ fontWeight: 600, color: l.tipo === 'Receita' ? 'var(--green)' : 'var(--red)' }}>
                      {fmt(l.valor)}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.vencimento}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.parcela}</td>
                    <td>
                      <input type="checkbox" checked={!!l.pago} onChange={() => togglePago(l.id)} style={{ accentColor: 'var(--green)', cursor: 'pointer' }} />
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.observacao}</td>
                    <td>
                      <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleEdit(l)}>✏️</button>
                      <button className="btn btn-danger" onClick={() => handleDelete(l.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
