import { useMemo, useState } from 'react'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const CATEGORIAS_RECEITA = ['Salário', 'Freelance', 'Projeto', 'Aluguel', 'Investimento', 'Outro']
const CATEGORIAS_DESPESA = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Roupas', 'Assinaturas', 'Cartão', 'Outro']
const CARTOES = ['Nubank', 'Inter', 'Itaú', 'Santander', 'Caixa', 'Banco do Brasil', 'Outro']
const TIPOS_INVESTIMENTO = ['Reserva', 'Renda fixa', 'Tesouro Direto', 'CDB/LCI/LCA', 'Fundo', 'Ações', 'FIIs', 'ETF', 'Cripto', 'Previdência', 'Outro']

const EMPTY_FORM = {
  mes: '',
  tipo: 'Despesa',
  categoria: '',
  descricao: '',
  valor: '',
  pago: false,
  observacao: '',
  parcela: '',
  vencimento: '',
  recorrente: false,
  cartao: '',
}

const EMPTY_INVESTIMENTO = {
  nome: '',
  tipo: 'Renda fixa',
  instituicao: '',
  valorInvestido: '',
  valorAtual: '',
  aporteMensal: '',
  objetivo: '',
  liquidez: '',
  observacao: '',
}

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function sum(items, tipo) {
  return items.filter(l => l.tipo === tipo).reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)
}

function mesIndex(nome) {
  return MESES.findIndex(m => m.toLowerCase() === (nome || '').toLowerCase())
}

function moneyNumber(v) {
  return parseFloat(v) || 0
}

export default function Financeiro({ data, update }) {
  const hoje = new Date()
  const mesAtualIdx = hoje.getMonth()
  const [mesFiltro, setMesFiltro] = useState(MESES[mesAtualIdx])
  const [cartaoFiltro, setCartaoFiltro] = useState('Todos')
  const [form, setForm] = useState({ ...EMPTY_FORM, mes: MESES[mesAtualIdx] })
  const [investForm, setInvestForm] = useState(EMPTY_INVESTIMENTO)
  const [editId, setEditId] = useState(null)
  const [editInvestId, setEditInvestId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showInvestForm, setShowInvestForm] = useState(false)
  const [feedback, setFeedback] = useState('')

  const lancamentos = data.financeiro || []
  const investimentos = data.investimentos || []

  const cartoesUsados = useMemo(() => {
    const usados = lancamentos.map(l => l.cartao).filter(Boolean)
    return Array.from(new Set([...CARTOES, ...usados]))
  }, [lancamentos])

  const lancMesBase = lancamentos.filter(l => (l.mes || '').toLowerCase() === mesFiltro.toLowerCase())
  const lancMes = cartaoFiltro === 'Todos'
    ? lancMesBase
    : lancMesBase.filter(l => (l.cartao || 'Sem cartão') === cartaoFiltro)

  const receitas = sum(lancMes, 'Receita')
  const despesas = sum(lancMes, 'Despesa')
  const saldo = receitas - despesas
  const pendentes = lancMes.filter(l => !l.pago && l.tipo === 'Despesa').reduce((s, l) => s + moneyNumber(l.valor), 0)

  const mesAnterior = MESES[(mesIndex(mesFiltro) + 11) % 12]
  const lancMesAnterior = lancamentos.filter(l => (l.mes || '').toLowerCase() === mesAnterior.toLowerCase())
  const receitasAnterior = sum(lancMesAnterior, 'Receita')
  const despesasAnterior = sum(lancMesAnterior, 'Despesa')
  const saldoAnterior = receitasAnterior - despesasAnterior
  const deltaSaldo = saldo - saldoAnterior
  const deltaDespesas = despesas - despesasAnterior

  const despesasPorCategoria = useMemo(() => {
    const totals = {}
    lancMes
      .filter(l => l.tipo === 'Despesa')
      .forEach(l => {
        const key = l.categoria || 'Sem categoria'
        totals[key] = (totals[key] || 0) + moneyNumber(l.valor)
      })
    return Object.entries(totals)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
  }, [lancMes])

  const resumoCartoes = useMemo(() => {
    const totals = {}
    lancMesBase
      .filter(l => l.tipo === 'Despesa')
      .forEach(l => {
        const key = l.cartao || 'Sem cartão'
        totals[key] = (totals[key] || 0) + moneyNumber(l.valor)
      })
    return Object.entries(totals)
      .map(([cartao, total]) => ({ cartao, total }))
      .sort((a, b) => b.total - a.total)
  }, [lancMesBase])

  const evolucaoMensal = useMemo(() => {
    return MESES.map(mes => {
      const itens = lancamentos.filter(l => (l.mes || '').toLowerCase() === mes.toLowerCase())
      return { mes, receitas: sum(itens, 'Receita'), despesas: sum(itens, 'Despesa') }
    })
  }, [lancamentos])

  const carteira = useMemo(() => {
    const totalInvestido = investimentos.reduce((s, i) => s + moneyNumber(i.valorInvestido), 0)
    const valorAtual = investimentos.reduce((s, i) => s + moneyNumber(i.valorAtual || i.valorInvestido), 0)
    const aporteMensal = investimentos.reduce((s, i) => s + moneyNumber(i.aporteMensal), 0)
    const rentabilidade = valorAtual - totalInvestido
    const rentabilidadePct = totalInvestido > 0 ? (rentabilidade / totalInvestido) * 100 : 0
    const porTipo = investimentos.reduce((acc, i) => {
      const tipo = i.tipo || 'Outro'
      acc[tipo] = (acc[tipo] || 0) + moneyNumber(i.valorAtual || i.valorInvestido)
      return acc
    }, {})
    return {
      totalInvestido,
      valorAtual,
      aporteMensal,
      rentabilidade,
      rentabilidadePct,
      porTipo: Object.entries(porTipo).map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total)
    }
  }, [investimentos])

  const maxCategoria = Math.max(1, ...despesasPorCategoria.map(i => i.total))
  const maxEvolucao = Math.max(1, ...evolucaoMensal.flatMap(i => [i.receitas, i.despesas]))
  const maxInvestTipo = Math.max(1, ...carteira.porTipo.map(i => i.total))
  const cats = form.tipo === 'Receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA

  const handleField = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'tipo' && v === 'Receita') next.cartao = ''
      return next
    })
  }

  const showFeedback = (msg) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 2200)
  }

  const handleSave = () => {
    if (!form.descricao.trim() || !form.valor) {
      showFeedback('Preencha descrição e valor.')
      return
    }

    const payload = {
      ...form,
      descricao: form.descricao.trim(),
      cartao: form.tipo === 'Despesa' ? form.cartao : '',
    }

    if (editId !== null) {
      update('financeiro', lancamentos.map(l => l.id === editId ? { ...payload, id: editId } : l))
      setEditId(null)
      showFeedback('Lançamento atualizado.')
    } else {
      update('financeiro', [...lancamentos, { ...payload, id: Date.now() }])
      showFeedback('Lançamento salvo.')
    }
    setForm({ ...EMPTY_FORM, mes: mesFiltro })
    setShowForm(false)
  }

  const handleEdit = (l) => {
    setForm({ ...EMPTY_FORM, ...l })
    setEditId(l.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = (id) => {
    update('financeiro', lancamentos.filter(l => l.id !== id))
    showFeedback('Lançamento excluído.')
  }

  const togglePago = (id) => {
    update('financeiro', lancamentos.map(l => l.id === id ? { ...l, pago: !l.pago } : l))
  }

  const handleInvestField = (k, v) => setInvestForm(f => ({ ...f, [k]: v }))

  const resetInvestForm = () => {
    setInvestForm(EMPTY_INVESTIMENTO)
    setEditInvestId(null)
    setShowInvestForm(false)
  }

  const handleSaveInvest = () => {
    if (!investForm.nome.trim() || !investForm.valorInvestido) {
      showFeedback('Preencha nome e valor investido.')
      return
    }

    const payload = {
      ...investForm,
      nome: investForm.nome.trim(),
      valorAtual: investForm.valorAtual || investForm.valorInvestido,
    }

    if (editInvestId !== null) {
      update('investimentos', investimentos.map(i => i.id === editInvestId ? { ...payload, id: editInvestId } : i))
      showFeedback('Investimento atualizado.')
    } else {
      update('investimentos', [...investimentos, { ...payload, id: Date.now() }])
      showFeedback('Investimento salvo.')
    }
    resetInvestForm()
  }

  const handleEditInvest = (item) => {
    setInvestForm({ ...EMPTY_INVESTIMENTO, ...item })
    setEditInvestId(item.id)
    setShowInvestForm(true)
  }

  const handleDeleteInvest = (id) => {
    update('investimentos', investimentos.filter(i => i.id !== id))
    showFeedback('Investimento excluído.')
  }

  return (
    <>
      <div className="page-header page-header-actions">
        <div>
          <h2>Financeiro</h2>
          <p>Controle de receitas, despesas, cartões, investimentos e evolução mensal</p>
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
          <div className="card-title">Receitas</div>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 20 }}>{fmt(receitas)}</div>
        </div>
        <div className="card">
          <div className="card-title">Despesas</div>
          <div className="stat-value" style={{ color: 'var(--red)', fontSize: 20 }}>{fmt(despesas)}</div>
          <div className={`trend ${deltaDespesas <= 0 ? 'positive' : 'negative'}`}>
            {deltaDespesas <= 0 ? '↓' : '↑'} {fmt(Math.abs(deltaDespesas))} vs. {mesAnterior}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Saldo</div>
          <div className="stat-value" style={{ color: saldo >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>{fmt(saldo)}</div>
          <div className={`trend ${deltaSaldo >= 0 ? 'positive' : 'negative'}`}>
            {deltaSaldo >= 0 ? '↑' : '↓'} {fmt(Math.abs(deltaSaldo))} vs. {mesAnterior}
          </div>
        </div>
        <div className="card">
          <div className="card-title">A pagar</div>
          <div className="stat-value" style={{ color: 'var(--yellow)', fontSize: 20 }}>{fmt(pendentes)}</div>
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
            {form.tipo === 'Despesa' && (
              <div className="form-group" style={{ maxWidth: 160 }}>
                <label>Cartão</label>
                <select value={form.cartao} onChange={e => handleField('cartao', e.target.value)}>
                  <option value="">Sem cartão</option>
                  {cartoesUsados.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div className="form-group" style={{ flex: 2 }}>
              <label>Descrição *</label>
              <input type="text" value={form.descricao} onChange={e => handleField('descricao', e.target.value)} placeholder="Ex: Aluguel, mercado, freelance..." />
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
            <div className="form-group" style={{ maxWidth: 115, justifyContent: 'flex-end' }}>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.pago} onChange={e => handleField('pago', e.target.checked)} /> Pago
              </label>
              <label className="checkbox-label">
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

      <div className="card investment-panel">
        <div className="section-header-row">
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>Investimentos</div>
            <p className="muted-small">Carteira pessoal para acompanhar aportes, valor atual e objetivos.</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowInvestForm(!showInvestForm); setEditInvestId(null); setInvestForm(EMPTY_INVESTIMENTO) }}>
            {showInvestForm ? 'Fechar' : '+ Investimento'}
          </button>
        </div>

        <div className="grid-4 investment-summary">
          <div>
            <div className="card-title">Investido</div>
            <div className="stat-value" style={{ fontSize: 19 }}>{fmt(carteira.totalInvestido)}</div>
          </div>
          <div>
            <div className="card-title">Valor atual</div>
            <div className="stat-value" style={{ color: 'var(--blue)', fontSize: 19 }}>{fmt(carteira.valorAtual)}</div>
          </div>
          <div>
            <div className="card-title">Resultado</div>
            <div className="stat-value" style={{ color: carteira.rentabilidade >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 19 }}>
              {fmt(carteira.rentabilidade)}
            </div>
            <div className={`trend ${carteira.rentabilidade >= 0 ? 'positive' : 'negative'}`}>
              {carteira.rentabilidadePct.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="card-title">Aporte mensal</div>
            <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 19 }}>{fmt(carteira.aporteMensal)}</div>
          </div>
        </div>

        {showInvestForm && (
          <div className="investment-form">
            <div className="form-row">
              <div className="form-group">
                <label>Nome *</label>
                <input type="text" value={investForm.nome} onChange={e => handleInvestField('nome', e.target.value)} placeholder="Ex: Reserva de emergência, Tesouro Selic..." />
              </div>
              <div className="form-group" style={{ maxWidth: 180 }}>
                <label>Tipo</label>
                <select value={investForm.tipo} onChange={e => handleInvestField('tipo', e.target.value)}>
                  {TIPOS_INVESTIMENTO.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Instituição</label>
                <input type="text" value={investForm.instituicao} onChange={e => handleInvestField('instituicao', e.target.value)} placeholder="Banco/corretora" />
              </div>
              <div className="form-group" style={{ maxWidth: 140 }}>
                <label>Investido *</label>
                <input type="number" value={investForm.valorInvestido} onChange={e => handleInvestField('valorInvestido', e.target.value)} min="0" step="0.01" />
              </div>
              <div className="form-group" style={{ maxWidth: 140 }}>
                <label>Valor atual</label>
                <input type="number" value={investForm.valorAtual} onChange={e => handleInvestField('valorAtual', e.target.value)} min="0" step="0.01" />
              </div>
            </div>
            <div className="form-row" style={{ marginTop: 10 }}>
              <div className="form-group" style={{ maxWidth: 140 }}>
                <label>Aporte mensal</label>
                <input type="number" value={investForm.aporteMensal} onChange={e => handleInvestField('aporteMensal', e.target.value)} min="0" step="0.01" />
              </div>
              <div className="form-group">
                <label>Objetivo</label>
                <input type="text" value={investForm.objetivo} onChange={e => handleInvestField('objetivo', e.target.value)} placeholder="Ex: viagem, aposentadoria, reserva..." />
              </div>
              <div className="form-group" style={{ maxWidth: 160 }}>
                <label>Liquidez</label>
                <input type="text" value={investForm.liquidez} onChange={e => handleInvestField('liquidez', e.target.value)} placeholder="Ex: D+0, D+1" />
              </div>
              <div className="form-group">
                <label>Observação</label>
                <input type="text" value={investForm.observacao} onChange={e => handleInvestField('observacao', e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleSaveInvest}>Salvar</button>
                <button className="btn btn-ghost" onClick={resetInvestForm}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid-2 investment-content">
          <div>
            <div className="card-title">Distribuição da carteira</div>
            {carteira.porTipo.length === 0 ? (
              <p className="muted-small">Nenhum investimento cadastrado ainda.</p>
            ) : carteira.porTipo.map(item => (
              <div key={item.tipo} className="bar-row">
                <div className="bar-row-label">
                  <span>{item.tipo}</span>
                  <strong>{fmt(item.total)}</strong>
                </div>
                <div className="chart-track">
                  <div className="chart-fill green" style={{ width: `${(item.total / maxInvestTipo) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ativo</th>
                  <th>Tipo</th>
                  <th>Atual</th>
                  <th>Resultado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {investimentos.length === 0 ? (
                  <tr><td colSpan="5" className="muted-cell">Cadastre seus investimentos para acompanhar a carteira.</td></tr>
                ) : investimentos.map(item => {
                  const investido = moneyNumber(item.valorInvestido)
                  const atual = moneyNumber(item.valorAtual || item.valorInvestido)
                  const resultado = atual - investido
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.nome}</strong>
                        <div className="muted-small">{item.instituicao || item.objetivo || ''}</div>
                      </td>
                      <td className="muted-cell">{item.tipo}</td>
                      <td>{fmt(atual)}</td>
                      <td style={{ color: resultado >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{fmt(resultado)}</td>
                      <td className="table-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => handleEditInvest(item)}>Editar</button>
                        <button className="btn btn-danger" onClick={() => handleDeleteInvest(item.id)}>Excluir</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Gastos por categoria - {mesFiltro}</div>
          {despesasPorCategoria.length === 0 ? (
            <p className="muted-small">Nenhuma despesa no período selecionado.</p>
          ) : despesasPorCategoria.map(item => (
            <div key={item.categoria} className="bar-row">
              <div className="bar-row-label">
                <span>{item.categoria}</span>
                <strong>{fmt(item.total)}</strong>
              </div>
              <div className="chart-track">
                <div className="chart-fill red" style={{ width: `${(item.total / maxCategoria) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">Despesas por cartão - {mesFiltro}</div>
          {resumoCartoes.length === 0 ? (
            <p className="muted-small">Nenhuma despesa por cartão neste mês.</p>
          ) : resumoCartoes.map(item => (
            <div key={item.cartao} className="bar-row">
              <div className="bar-row-label">
                <span>{item.cartao}</span>
                <strong>{fmt(item.total)}</strong>
              </div>
              <div className="chart-track">
                <div className="chart-fill blue" style={{ width: `${(item.total / Math.max(1, resumoCartoes[0].total)) * 100}%` }} />
              </div>
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
                  <th>Cartão</th>
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
                    <td><span className={`badge ${l.tipo === 'Receita' ? 'badge-green' : 'badge-red'}`}>{l.tipo}</span></td>
                    <td className="muted-cell">{l.categoria}</td>
                    <td className="muted-cell">{l.tipo === 'Despesa' ? (l.cartao || 'Sem cartão') : '-'}</td>
                    <td style={{ fontWeight: 500 }}>{l.descricao}</td>
                    <td style={{ fontWeight: 600, color: l.tipo === 'Receita' ? 'var(--green)' : 'var(--red)' }}>{fmt(l.valor)}</td>
                    <td className="muted-cell">{l.vencimento}</td>
                    <td className="muted-cell">{l.parcela}</td>
                    <td>
                      <input type="checkbox" checked={!!l.pago} onChange={() => togglePago(l.id)} style={{ accentColor: 'var(--green)', cursor: 'pointer' }} />
                    </td>
                    <td className="muted-cell">{l.observacao}</td>
                    <td className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(l)}>Editar</button>
                      <button className="btn btn-danger" onClick={() => handleDelete(l.id)}>Excluir</button>
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
