import { useMemo } from 'react'
import { MESES, fmt, moneyNumber, calcularValorAtualInvestimento } from '../lib/finance'

const HABITOS_DEFAULT = [
  'Beber 2L de água',
  'Exercício físico',
  'Leitura 30 min',
  'Meditação',
  'Dormir até 23h',
  'Comer saudável',
]

function fmtKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function pct(done, total) {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

export default function Dashboard({ data, update, setTab }) {
  const today = new Date()
  const todayKey = fmtKey(today)
  const mesAtual = MESES[today.getMonth()]

  const habitosLista = Array.isArray(data.habitosLista) && data.habitosLista.length
    ? data.habitosLista
    : HABITOS_DEFAULT

  const agendaHoje = data.agenda[todayKey] || { tasks: ['', '', '', '', ''], checks: [false, false, false, false, false], notas: '' }
  const tarefasHoje = agendaHoje.tasks.filter(t => t.trim()).length
  const feitas = agendaHoje.checks.filter(Boolean).length

  const lancamentos = data.financeiro || []
  const investimentos = data.investimentos || []
  const configCDI = data.configCDI || { taxaAnual: 0 }

  const lancMes = lancamentos.filter(l => (l.mes || '').toLowerCase() === mesAtual.toLowerCase())
  const receitasPrevistasMes = lancMes.filter(l => l.tipo === 'Receita').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const despesasPrevistasMes = lancMes.filter(l => l.tipo === 'Despesa').reduce((s, l) => s + moneyNumber(l.valor), 0)

  // ── visão financeira global (todas as competências, não só o mês atual) ──
  const recebidoTotal = lancamentos.filter(l => l.tipo === 'Receita' && l.status === 'Recebida').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const pagoTotal = lancamentos.filter(l => l.tipo === 'Despesa' && l.status === 'Pago').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const saldoAtual = recebidoTotal - pagoTotal
  const contasAPagar = lancamentos.filter(l => l.tipo === 'Despesa' && l.status === 'Pendente').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const contasAReceber = lancamentos.filter(l => l.tipo === 'Receita' && l.status === 'Prevista').reduce((s, l) => s + moneyNumber(l.valor), 0)

  const investimentosCalc = useMemo(() => investimentos.map(item => calcularValorAtualInvestimento(item, configCDI.taxaAnual, today)), [investimentos, configCDI.taxaAnual])
  const investimentosValorAtual = investimentosCalc.reduce((s, c) => s + c.valorAtual, 0)
  const aporteMensalPlanejado = investimentos.reduce((s, i) => s + moneyNumber(i.aporteMensal), 0)
  const patrimonioTotal = saldoAtual + investimentosValorAtual - contasAPagar

  const habitosHoje = data.habitos[todayKey] || {}
  const habitosFeitos = habitosLista.filter(h => habitosHoje[h]).length
  const percentualHabitos = pct(habitosFeitos, habitosLista.length)

  const metasAtivas = (data.metas || []).filter(m => m.meta && m.status !== 'Concluída').length
  const metasConcluidas = (data.metas || []).filter(m => m.status === 'Concluída').length

  const toggleHabitoHoje = (habito) => {
    const cur = data.habitos[todayKey] || {}
    update('habitos', { ...data.habitos, [todayKey]: { ...cur, [habito]: !cur[habito] } })
  }

  const proximasTarefas = useMemo(() => {
    const res = []
    for (let i = 0; i <= 6; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const key = fmtKey(d)
      const dia = data.agenda[key]
      if (dia) {
        dia.tasks.forEach((t, idx) => {
          if (t.trim() && !dia.checks[idx]) {
            res.push({ label: t, data: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) })
          }
        })
      }
    }
    return res.slice(0, 5)
  }, [data.agenda])

  const gastosPorCategoria = useMemo(() => {
    const totals = {}
    lancMes.filter(l => l.tipo === 'Despesa').forEach(l => {
      const key = l.categoria || 'Sem categoria'
      totals[key] = (totals[key] || 0) + moneyNumber(l.valor)
    })
    return Object.entries(totals).map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total).slice(0, 6)
  }, [lancMes])

  const evolucaoFinanceira = useMemo(() => MESES.map(mes => {
    const itens = lancamentos.filter(l => (l.mes || '').toLowerCase() === mes.toLowerCase())
    const receitas = itens.filter(l => l.tipo === 'Receita').reduce((s, l) => s + moneyNumber(l.valor), 0)
    const despesas = itens.filter(l => l.tipo === 'Despesa').reduce((s, l) => s + moneyNumber(l.valor), 0)
    return { mes, receitas, despesas }
  }), [lancamentos])

  const evolucaoPatrimonial = useMemo(() => {
    let acumulado = 0
    return evolucaoFinanceira.map(({ mes, receitas, despesas }) => {
      acumulado += receitas - despesas
      return { mes, valor: acumulado + investimentosValorAtual }
    })
  }, [evolucaoFinanceira, investimentosValorAtual])

  const evolucaoInvestimentos = useMemo(() => {
    const anoAtual = today.getFullYear()
    let acumulado = 0
    return MESES.map((mes, idx) => {
      const aportesDoMes = investimentos.filter(i => {
        if (!i.dataInvestimento) return false
        const d = new Date(i.dataInvestimento)
        return d.getFullYear() === anoAtual && d.getMonth() === idx
      }).reduce((s, i) => s + moneyNumber(i.valorInvestido), 0)
      acumulado += aportesDoMes
      return { mes, valor: acumulado }
    })
  }, [investimentos])

  const maxCategoria = Math.max(1, ...gastosPorCategoria.map(i => i.total))
  const maxEvolucaoFin = Math.max(1, ...evolucaoFinanceira.flatMap(i => [i.receitas, i.despesas]))
  const maxPatrimonial = Math.max(1, ...evolucaoPatrimonial.map(i => Math.abs(i.valor)))
  const maxInvestEvol = Math.max(1, ...evolucaoInvestimentos.map(i => i.valor))

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>{today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card card-clickable" onClick={() => setTab('agenda')}>
          <div className="card-title">Hoje</div>
          <div className="stat-value">{feitas}/{tarefasHoje}</div>
          <div className="stat-label">tarefas concluídas</div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${pct(feitas, tarefasHoje)}%` }} />
          </div>
        </div>

        <div className="card card-clickable" onClick={() => setTab('financeiro')}>
          <div className="card-title">Patrimônio total</div>
          <div className="stat-value" style={{ color: patrimonioTotal >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>{fmt(patrimonioTotal)}</div>
          <div className="stat-label">saldo + investimentos − a pagar</div>
        </div>

        <div className="card card-clickable" onClick={() => setTab('habitos')}>
          <div className="card-title">Hábitos hoje</div>
          <div className="stat-value">{percentualHabitos}%</div>
          <div className="stat-label">{habitosFeitos}/{habitosLista.length} concluídos</div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${percentualHabitos}%` }} />
          </div>
        </div>

        <div className="card card-clickable" onClick={() => setTab('metas')}>
          <div className="card-title">Metas</div>
          <div className="stat-value">{metasAtivas}</div>
          <div className="stat-label">em andamento</div>
          {metasConcluidas > 0 && (
            <div style={{ marginTop: 8 }}><span className="badge badge-green">{metasConcluidas} concluída{metasConcluidas > 1 ? 's' : ''}</span></div>
          )}
        </div>
      </div>

      <div className="page-header" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 16 }}>Visão financeira</h2>
      </div>

      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="card card-clickable" onClick={() => setTab('financeiro')}>
          <div className="card-title">Saldo atual</div>
          <div className="stat-value" style={{ color: saldoAtual >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 19 }}>{fmt(saldoAtual)}</div>
          <div className="muted-small">recebido − pago (todo o histórico)</div>
        </div>
        <div className="card card-clickable" onClick={() => setTab('financeiro')}>
          <div className="card-title">Contas a pagar</div>
          <div className="stat-value" style={{ color: 'var(--yellow)', fontSize: 19 }}>{fmt(contasAPagar)}</div>
        </div>
        <div className="card card-clickable" onClick={() => setTab('financeiro')}>
          <div className="card-title">Contas a receber</div>
          <div className="stat-value" style={{ color: 'var(--blue)', fontSize: 19 }}>{fmt(contasAReceber)}</div>
        </div>
        <div className="card card-clickable" onClick={() => setTab('financeiro')}>
          <div className="card-title">Investimentos</div>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 19 }}>{fmt(investimentosValorAtual)}</div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Receitas previstas - {mesAtual}</div>
          <div className="stat-value" style={{ fontSize: 18, color: 'var(--green)' }}>{fmt(receitasPrevistasMes)}</div>
        </div>
        <div className="card">
          <div className="card-title">Despesas previstas - {mesAtual}</div>
          <div className="stat-value" style={{ fontSize: 18, color: 'var(--red)' }}>{fmt(despesasPrevistasMes)}</div>
        </div>
        <div className="card">
          <div className="card-title">Meta mensal de aporte</div>
          <div className="stat-value" style={{ fontSize: 18, color: 'var(--accent)' }}>{fmt(aporteMensalPlanejado)}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Gastos por categoria - {mesAtual}</div>
          {gastosPorCategoria.length === 0 ? (
            <p className="muted-small">Nenhuma despesa registrada neste mês.</p>
          ) : gastosPorCategoria.map(item => (
            <div key={item.categoria} className="bar-row">
              <div className="bar-row-label"><span>{item.categoria}</span><strong>{fmt(item.total)}</strong></div>
              <div className="chart-track"><div className="chart-fill red" style={{ width: `${(item.total / maxCategoria) * 100}%` }} /></div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">Receitas x despesas</div>
          <div className="monthly-chart" style={{ minHeight: 140 }}>
            {evolucaoFinanceira.map(item => (
              <div key={item.mes} className="monthly-group">
                <div className="monthly-bars" style={{ height: 100 }}>
                  <span className="income" style={{ height: `${Math.max(4, (item.receitas / maxEvolucaoFin) * 100)}%` }} title={`Receitas: ${fmt(item.receitas)}`} />
                  <span className="expense" style={{ height: `${Math.max(4, (item.despesas / maxEvolucaoFin) * 100)}%` }} title={`Despesas: ${fmt(item.despesas)}`} />
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
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Evolução patrimonial (aproximada)</div>
          {evolucaoPatrimonial.map(item => (
            <div key={item.mes} className="bar-row">
              <div className="bar-row-label"><span>{item.mes.slice(0, 3)}</span><strong>{fmt(item.valor)}</strong></div>
              <div className="chart-track"><div className="chart-fill blue" style={{ width: `${Math.min(100, (Math.abs(item.valor) / maxPatrimonial) * 100)}%` }} /></div>
            </div>
          ))}
          <p className="muted-small">Saldo acumulado do ano + valor atual da carteira de investimentos.</p>
        </div>

        <div className="card">
          <div className="card-title">Evolução dos investimentos (aportes no ano)</div>
          {evolucaoInvestimentos.every(i => i.valor === 0) ? (
            <p className="muted-small">Nenhum investimento com data registrada neste ano.</p>
          ) : evolucaoInvestimentos.map(item => (
            <div key={item.mes} className="bar-row">
              <div className="bar-row-label"><span>{item.mes.slice(0, 3)}</span><strong>{fmt(item.valor)}</strong></div>
              <div className="chart-track"><div className="chart-fill green" style={{ width: `${(item.valor / maxInvestEvol) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Próximas tarefas</div>
          {proximasTarefas.length === 0 ? (
            <p className="muted-small">Nenhuma tarefa pendente nos próximos dias.</p>
          ) : (
            proximasTarefas.map((t, i) => (
              <div key={i} className="list-row">
                <span className="row-kicker">{t.data}</span>
                <span style={{ fontSize: 13 }}>{t.label}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}>Hábitos de hoje</div>
            <span className={`badge ${percentualHabitos === 100 ? 'badge-green' : percentualHabitos >= 50 ? 'badge-yellow' : 'badge-gray'}`}>{percentualHabitos}%</span>
          </div>
          <div className="habit-progress-dots" aria-label="Progresso diário dos hábitos">
            {habitosLista.map(h => <span key={h} className={habitosHoje[h] ? 'done' : ''} />)}
          </div>
          {habitosLista.map(h => (
            <label key={h} className={`check-item ${habitosHoje[h] ? 'done' : ''}`}>
              <input type="checkbox" checked={!!habitosHoje[h]} onChange={() => toggleHabitoHoje(h)} />
              <span style={{ fontSize: 13 }}>{h}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Visão geral das metas</div>
        <div className="dashboard-goals">
          {(data.metas || []).map(m => (
            <div key={m.id} className="goal-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                <div>
                  <div className="meta-area-label">{m.area}</div>
                  <div style={{ fontSize: 13 }}>{m.meta || <span style={{ color: 'var(--text-muted)' }}>Não definida</span>}</div>
                </div>
                <span className={`badge ${m.status === 'Concluída' ? 'badge-green' : m.status === 'Em andamento' ? 'badge-blue' : 'badge-gray'}`}>{m.status}</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${m.progresso || 0}%` }} /></div>
              <div className="muted-small" style={{ marginTop: 3 }}>{m.progresso || 0}%</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
