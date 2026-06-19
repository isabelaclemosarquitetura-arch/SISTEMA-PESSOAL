import { useMemo, useState } from 'react'
import {
  MESES, CATEGORIAS_RECEITA, CATEGORIAS_DESPESA, FORMAS_PAGAMENTO, TIPOS_RECORRENCIA,
  fmt, moneyNumber, sugerirCategoria, hojeISO, mesDeISO,
} from '../lib/finance'

const CARTOES_PADRAO = ['Nubank', 'Inter', 'Itaú', 'Santander', 'Caixa', 'Banco do Brasil', 'Outro']

const EMPTY_FORM = {
  mes: '',
  tipo: 'Despesa',
  categoria: '',
  descricao: '',
  valor: '',
  status: 'Pendente',
  observacao: '',
  parcela: '',
  vencimento: '',
  formaPagamento: 'Dinheiro',
  cartao: '',
  recorrente: false,
  recorrenciaTipo: 'Mensal',
  recorrenciaIntervaloDias: '',
}

function sum(items, tipo) {
  return items.filter(l => l.tipo === tipo).reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)
}

function mesIndex(nome) {
  return MESES.findIndex(m => m.toLowerCase() === (nome || '').toLowerCase())
}

export default function FinanceiroLancamentos({ data, update }) {
  const hoje = new Date()
  const mesAtualIdx = hoje.getMonth()
  const [mesFiltro, setMesFiltro] = useState(MESES[mesAtualIdx])
  const [cartaoFiltro, setCartaoFiltro] = useState('Todos')
  const [form, setForm] = useState({ ...EMPTY_FORM, mes: MESES[mesAtualIdx] })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [feedback, setFeedback] = useState('')

  const lancamentos = data.financeiro || []
  const cartoesCadastrados = (data.cartoes || []).map(c => c.nome)

  const cartoesUsados = useMemo(() => {
    const usados = lancamentos.map(l => l.cartao).filter(Boolean)
    return Array.from(new Set([...CARTOES_PADRAO, ...cartoesCadastrados, ...usados]))
  }, [lancamentos, cartoesCadastrados])

  const lancMesBase = lancamentos.filter(l => (l.mes || '').toLowerCase() === mesFiltro.toLowerCase())
  const lancMes = cartaoFiltro === 'Todos'
    ? lancMesBase
    : lancMesBase.filter(l => (l.cartao || 'Sem cartão') === cartaoFiltro)

  const receitas = sum(lancMes, 'Receita')
  const despesas = sum(lancMes, 'Despesa')
  const saldoPrevisto = receitas - despesas
  const receitasRecebidas = lancMes.filter(l => l.tipo === 'Receita' && l.status === 'Recebida').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const despesasPagas = lancMes.filter(l => l.tipo === 'Despesa' && l.status === 'Pago').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const saldoAtual = receitasRecebidas - despesasPagas
  const pendentes = lancMes.filter(l => l.status === 'Pendente' && l.tipo === 'Despesa').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const aReceber = lancMes.filter(l => l.status === 'Prevista' && l.tipo === 'Receita').reduce((s, l) => s + moneyNumber(l.valor), 0)

  const mesAnterior = MESES[(mesIndex(mesFiltro) + 11) % 12]
  const lancMesAnterior = lancamentos.filter(l => (l.mes || '').toLowerCase() === mesAnterior.toLowerCase())
  const saldoAnterior = sum(lancMesAnterior, 'Receita') - sum(lancMesAnterior, 'Despesa')
  const deltaSaldo = saldoPrevisto - saldoAnterior
  const deltaDespesas = despesas - sum(lancMesAnterior, 'Despesa')

  const despesasPorCategoria = useMemo(() => {
    const totals = {}
    lancMes.filter(l => l.tipo === 'Despesa').forEach(l => {
      const key = l.categoria || 'Sem categoria'
      totals[key] = (totals[key] || 0) + moneyNumber(l.valor)
    })
    return Object.entries(totals).map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total)
  }, [lancMes])

  const resumoCartoes = useMemo(() => {
    const totals = {}
    lancMesBase.filter(l => l.tipo === 'Despesa' && l.formaPagamento === 'Crédito').forEach(l => {
      const key = l.cartao || 'Sem cartão'
      totals[key] = (totals[key] || 0) + moneyNumber(l.valor)
    })
    return Object.entries(totals).map(([cartao, total]) => ({ cartao, total })).sort((a, b) => b.total - a.total)
  }, [lancMesBase])

  const evolucaoMensal = useMemo(() => MESES.map(mes => {
    const itens = lancamentos.filter(l => (l.mes || '').toLowerCase() === mes.toLowerCase())
    return { mes, receitas: sum(itens, 'Receita'), despesas: sum(itens, 'Despesa') }
  }), [lancamentos])

  const maxCategoria = Math.max(1, ...despesasPorCategoria.map(i => i.total))
  const maxEvolucao = Math.max(1, ...evolucaoMensal.flatMap(i => [i.receitas, i.despesas]))
  const cats = form.tipo === 'Receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA

  const showFeedback = (msg) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 2400)
  }

  const handleField = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'tipo') {
        next.cartao = ''
        next.formaPagamento = v === 'Receita' ? '' : 'Dinheiro'
        next.status = v === 'Receita' ? 'Prevista' : 'Pendente'
      }
      if (k === 'formaPagamento' && v !== 'Crédito') next.cartao = ''
      if (k === 'descricao' && !f.categoria) {
        const sugestao = sugerirCategoria(v)
        if (sugestao && (cats.includes(sugestao))) next.categoria = sugestao
      }
      return next
    })
  }

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, mes: mesFiltro })
    setEditId(null)
    setShowForm(false)
  }

  const handleSave = () => {
    if (!form.descricao.trim() || !form.valor) {
      showFeedback('Preencha descrição e valor.')
      return
    }
    if (form.tipo === 'Despesa' && form.formaPagamento === 'Crédito' && !form.cartao) {
      showFeedback('Selecione o cartão usado.')
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
      if (original?.recorrenciaGrupoId) {
        aplicarFuturos = window.confirm('Esta é uma recorrência. Aplicar a mesma alteração (valor/categoria/descrição/forma de pagamento) às ocorrências futuras desta série também?')
      }
      update('financeiro', lancamentos.map(l => {
        if (l.id === editId) return { ...payload, id: editId }
        if (aplicarFuturos && l.recorrenciaGrupoId === original.recorrenciaGrupoId && l.vencimento > original.vencimento) {
          return { ...l, valor: payload.valor, categoria: payload.categoria, descricao: payload.descricao, formaPagamento: payload.formaPagamento, cartao: payload.cartao, observacao: payload.observacao }
        }
        return l
      }))
      showFeedback('Lançamento atualizado.')
    } else {
      const novoId = Date.now()
      let novo = { ...payload, id: novoId }
      if (novo.recorrente) {
        novo.recorrenciaGrupoId = String(novoId)
        novo.recorrenciaAtiva = true
      } else {
        novo.recorrenciaGrupoId = ''
      }
      update('financeiro', [...lancamentos, novo])
      showFeedback(novo.recorrente ? 'Lançamento salvo. Próximas ocorrências geradas automaticamente.' : 'Lançamento salvo.')
    }
    resetForm()
  }

  const handleEdit = (l) => {
    setForm({ ...EMPTY_FORM, ...l })
    setEditId(l.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = (l) => {
    if (l.recorrenciaGrupoId) {
      const futuros = window.confirm('Este lançamento faz parte de uma recorrência. Excluir também todas as ocorrências futuras desta série?')
      if (futuros) {
        update('financeiro', lancamentos.filter(x => !(x.recorrenciaGrupoId === l.recorrenciaGrupoId && x.vencimento >= l.vencimento)))
        showFeedback('Lançamento e ocorrências futuras excluídos.')
        return
      }
    }
    update('financeiro', lancamentos.filter(x => x.id !== l.id))
    showFeedback('Lançamento excluído.')
  }

  const handleDuplicate = (l) => {
    const copia = { ...l, id: Date.now(), status: l.tipo === 'Receita' ? 'Prevista' : 'Pendente', pago: false, recorrente: false, recorrenciaGrupoId: '' }
    update('financeiro', [...lancamentos, copia])
    showFeedback('Lançamento duplicado.')
  }

  const toggleStatus = (l) => {
    if (l.tipo === 'Despesa') {
      const novoStatus = l.status === 'Pago' ? 'Pendente' : 'Pago'
      update('financeiro', lancamentos.map(x => x.id === l.id ? { ...x, status: novoStatus, pago: novoStatus === 'Pago' } : x))
    } else {
      const novoStatus = l.status === 'Recebida' ? 'Prevista' : 'Recebida'
      update('financeiro', lancamentos.map(x => x.id === l.id ? { ...x, status: novoStatus, dataRecebimento: novoStatus === 'Recebida' ? hojeISO() : '' } : x))
    }
  }

  const pararRecorrencia = (l) => {
    update('financeiro', lancamentos.map(x => x.recorrenciaGrupoId === l.recorrenciaGrupoId ? { ...x, recorrenciaAtiva: false } : x))
    showFeedback('Recorrência interrompida — nenhuma nova ocorrência futura será gerada.')
  }

  return (
    <>
      <div className="page-header page-header-actions">
        <div>
          <h2>Lançamentos</h2>
          <p>Receitas e despesas, recorrência automática e forma de pagamento</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...EMPTY_FORM, mes: mesFiltro }) }}>
          {showForm ? 'Fechar' : '+ Lançamento'}
        </button>
      </div>

      {feedback && <div className="toast-inline">{feedback}</div>}

      <div className="filter-row">
        <div className="month-pills">
          {MESES.map(m => (
            <button key={m} className={`pill ${mesFiltro === m ? 'active' : ''}`} onClick={() => setMesFiltro(m)}>
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
        <div className="form-group filter-card-select">
          <label>Cartão</label>
          <select value={cartaoFiltro} onChange={e => setCartaoFiltro(e.target.value)}>
            <option>Todos</option>
            <option>Sem cartão</option>
            {cartoesUsados.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Saldo atual</div>
          <div className="stat-value" style={{ color: saldoAtual >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>{fmt(saldoAtual)}</div>
          <div className="muted-small">recebido − pago, só o que já entrou/saiu</div>
        </div>
        <div className="card">
          <div className="card-title">Saldo previsto</div>
          <div className="stat-value" style={{ color: saldoPrevisto >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>{fmt(saldoPrevisto)}</div>
          <div className={`trend ${deltaSaldo >= 0 ? 'positive' : 'negative'}`}>
            {deltaSaldo >= 0 ? '↑' : '↓'} {fmt(Math.abs(deltaSaldo))} vs. {mesAnterior}
          </div>
        </div>
        <div className="card">
          <div className="card-title">A pagar</div>
          <div className="stat-value" style={{ color: 'var(--yellow)', fontSize: 20 }}>{fmt(pendentes)}</div>
        </div>
        <div className="card">
          <div className="card-title">A receber</div>
          <div className="stat-value" style={{ color: 'var(--blue)', fontSize: 20 }}>{fmt(aReceber)}</div>
        </div>
      </div>

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
              <input type="text" value={form.descricao} onChange={e => handleField('descricao', e.target.value)} placeholder="Ex: Aluguel, mercado, freelance..." />
            </div>
            <div className="form-group" style={{ maxWidth: 120 }}>
              <label>Valor *</label>
              <input type="number" value={form.valor} onChange={e => handleField('valor', e.target.value)} placeholder="0,00" min="0" step="0.01" />
            </div>
          </div>

          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-group" style={{ maxWidth: 150 }}>
              <label>{form.tipo === 'Receita' ? 'Data prevista' : 'Vencimento'}</label>
              <input type="date" value={form.vencimento} onChange={e => handleField('vencimento', e.target.value)} />
            </div>
            {form.tipo === 'Despesa' && (
              <div className="form-group" style={{ maxWidth: 150 }}>
                <label>Forma de pagamento</label>
                <select value={form.formaPagamento} onChange={e => handleField('formaPagamento', e.target.value)}>
                  {FORMAS_PAGAMENTO.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            )}
            {form.tipo === 'Despesa' && form.formaPagamento === 'Crédito' && (
              <div className="form-group" style={{ maxWidth: 160 }}>
                <label>Cartão *</label>
                <select value={form.cartao} onChange={e => handleField('cartao', e.target.value)}>
                  <option value="">Selecione...</option>
                  {cartoesUsados.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div className="form-group" style={{ maxWidth: 100 }}>
              <label>Parcela</label>
              <input type="text" value={form.parcela} onChange={e => handleField('parcela', e.target.value)} placeholder="ex: 2/12" />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Observação</label>
              <input type="text" value={form.observacao} onChange={e => handleField('observacao', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ maxWidth: 130, justifyContent: 'flex-end' }}>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.tipo === 'Despesa' ? form.status === 'Pago' : form.status === 'Recebida'}
                  onChange={e => handleField('status', form.tipo === 'Despesa' ? (e.target.checked ? 'Pago' : 'Pendente') : (e.target.checked ? 'Recebida' : 'Prevista'))} />
                {form.tipo === 'Despesa' ? 'Pago' : 'Recebida'}
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.recorrente} onChange={e => handleField('recorrente', e.target.checked)} /> Recorrente
              </label>
            </div>
            {form.recorrente && (
              <>
                <div className="form-group" style={{ maxWidth: 150 }}>
                  <label>Frequência</label>
                  <select value={form.recorrenciaTipo} onChange={e => handleField('recorrenciaTipo', e.target.value)}>
                    {TIPOS_RECORRENCIA.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {form.recorrenciaTipo === 'Personalizada' && (
                  <div className="form-group" style={{ maxWidth: 130 }}>
                    <label>A cada (dias)</label>
                    <input type="number" min="1" value={form.recorrenciaIntervaloDias} onChange={e => handleField('recorrenciaIntervaloDias', e.target.value)} placeholder="ex: 10" />
                  </div>
                )}
              </>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginLeft: 'auto' }}>
              <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
              <button className="btn btn-ghost" onClick={resetForm}>Cancelar</button>
            </div>
          </div>
          {form.recorrente && (
            <p className="muted-small" style={{ marginTop: 10 }}>
              Ao salvar, o sistema gera automaticamente as próximas ocorrências (até 12 meses à frente) mantendo valor, categoria, descrição e forma de pagamento.
            </p>
          )}
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Gastos por categoria - {mesFiltro}</div>
          {despesasPorCategoria.length === 0 ? (
            <p className="muted-small">Nenhuma despesa no período selecionado.</p>
          ) : despesasPorCategoria.map(item => (
            <div key={item.categoria} className="bar-row">
              <div className="bar-row-label"><span>{item.categoria}</span><strong>{fmt(item.total)}</strong></div>
              <div className="chart-track"><div className="chart-fill red" style={{ width: `${(item.total / maxCategoria) * 100}%` }} /></div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">Despesas por cartão (crédito) - {mesFiltro}</div>
          {resumoCartoes.length === 0 ? (
            <p className="muted-small">Nenhuma despesa de crédito neste mês.</p>
          ) : resumoCartoes.map(item => (
            <div key={item.cartao} className="bar-row">
              <div className="bar-row-label"><span>{item.cartao}</span><strong>{fmt(item.total)}</strong></div>
              <div className="chart-track"><div className="chart-fill blue" style={{ width: `${(item.total / Math.max(1, resumoCartoes[0].total)) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Evolução financeira mensal</div>
        <div className="monthly-chart">
          {evolucaoMensal.map(item => (
            <div key={item.mes} className={`monthly-group ${item.mes === mesFiltro ? 'active' : ''}`} onClick={() => setMesFiltro(item.mes)}>
              <div className="monthly-bars">
                <span className="income" style={{ height: `${Math.max(4, (item.receitas / maxEvolucao) * 100)}%` }} title={`Receitas: ${fmt(item.receitas)}`} />
                <span className="expense" style={{ height: `${Math.max(4, (item.despesas / maxEvolucao) * 100)}%` }} title={`Despesas: ${fmt(item.despesas)}`} />
              </div>
              <div className="monthly-label">{item.mes.slice(0, 3)}</div>
            </div>
          ))}
        </div>
        <div className="chart-legend">
          <span><i className="legend-income" /> Receitas</span>
          <span><i className="legend-expense" /> Despesas</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">{mesFiltro} - {lancMes.length} lançamento{lancMes.length !== 1 ? 's' : ''}</div>
        {lancMes.length === 0 ? (
          <p className="muted-small">Nenhum lançamento em {mesFiltro} com os filtros atuais.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th>Pagamento</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Data</th>
                  <th>Parcela</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lancMes.map(l => (
                  <tr key={l.id}>
                    <td><span className={`badge ${l.tipo === 'Receita' ? 'badge-green' : 'badge-red'}`}>{l.tipo}</span></td>
                    <td className="muted-cell">{l.categoria}</td>
                    <td className="muted-cell">{l.tipo === 'Despesa' ? (l.formaPagamento || '-') + (l.cartao ? ` · ${l.cartao}` : '') : '-'}</td>
                    <td style={{ fontWeight: 500 }}>
                      {l.descricao}
                      {l.recorrenciaGrupoId && <span className="badge badge-gray" style={{ marginLeft: 6 }} title="Lançamento recorrente">↻</span>}
                    </td>
                    <td style={{ fontWeight: 600, color: l.tipo === 'Receita' ? 'var(--green)' : 'var(--red)' }}>{fmt(l.valor)}</td>
                    <td className="muted-cell">{l.vencimento}</td>
                    <td className="muted-cell">{l.parcela}</td>
                    <td>
                      <label className="checkbox-label" style={{ marginBottom: 0 }}>
                        <input type="checkbox" checked={l.tipo === 'Despesa' ? l.status === 'Pago' : l.status === 'Recebida'} onChange={() => toggleStatus(l)} style={{ accentColor: 'var(--green)', cursor: 'pointer' }} />
                        <span className={`badge ${l.status === 'Pago' || l.status === 'Recebida' ? 'badge-green' : l.tipo === 'Receita' ? 'badge-blue' : 'badge-yellow'}`}>{l.status}</span>
                      </label>
                    </td>
                    <td className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(l)}>Editar</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDuplicate(l)}>Duplicar</button>
                      {l.recorrenciaGrupoId && l.recorrenciaAtiva !== false && (
                        <button className="btn btn-ghost btn-sm" onClick={() => pararRecorrencia(l)}>Parar recorrência</button>
                      )}
                      <button className="btn btn-danger" onClick={() => handleDelete(l)}>Excluir</button>
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
