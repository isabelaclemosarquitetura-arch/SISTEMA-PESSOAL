import { useMemo } from 'react'
import { MESES, fmt, moneyNumber, calcularValorAtualInvestimento } from '../lib/finance'
import { t } from '../lib/i18n'

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

// Calcula taxa mensal composta a partir da taxa anual (%)
function taxaMensal(taxaAnualPct) {
  return Math.pow(1 + (Number(taxaAnualPct) || 0) / 100, 1 / 12) - 1
}

// Projeção com juros compostos + aportes mensais recorrentes
function projetarPatrimonio(valorAtual, aporteMensal, taxaAnualPct, meses) {
  const i = taxaMensal(taxaAnualPct)
  if (i === 0) return valorAtual + aporteMensal * meses
  const fator = Math.pow(1 + i, meses)
  return valorAtual * fator + aporteMensal * (fator - 1) / i
}

// Retorna segunda-feira da semana atual
function getMondayOfWeek(date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

export default function Dashboard({ data, update, setTab, lang = 'pt' }) {
  const today = new Date()
  const todayKey = fmtKey(today)
  const mesAtual = MESES[today.getMonth()]

  const habitosLista = Array.isArray(data.habitosLista) && data.habitosLista.length
    ? data.habitosLista
    : HABITOS_DEFAULT

  const agendaHoje = data.agenda[todayKey] || { tasks: [], checks: [], notas: '' }
  const tarefasHoje = (agendaHoje.tasks || []).filter(t => t.trim()).length
  const feitas = (agendaHoje.checks || []).filter(Boolean).length

  // ── Resumo semanal (seg → hoje) ──
  const resumoSemana = useMemo(() => {
    const seg = getMondayOfWeek(today)
    let tarefasTotais = 0, tarefasFeitas = 0
    let habitosDias = 0, habitosTotaisDias = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(seg); d.setDate(d.getDate() + i)
      if (d > today) break
      const key = fmtKey(d)
      const dia = data.agenda[key]
      if (dia?.tasks) {
        const tasks = Array.isArray(dia.tasks) ? dia.tasks : []
        const checks = Array.isArray(dia.checks) ? dia.checks : []
        tasks.forEach((t, idx) => { if (t.trim()) { tarefasTotais++; if (checks[idx]) tarefasFeitas++ } })
      }
      const hab = data.habitos[key] || {}
      habitosDias += habitosLista.filter(h => hab[h]).length
      habitosTotaisDias += habitosLista.length
    }
    const pctHabitos = habitosTotaisDias > 0 ? Math.round((habitosDias / habitosTotaisDias) * 100) : 0
    const diasSemana = Math.round((today - seg) / 86400000) + 1
    return { tarefasTotais, tarefasFeitas, pctHabitos, diasSemana }
  }, [data.agenda, data.habitos, habitosLista])

  // Melhor streak de hábito
  const melhorStreak = useMemo(() => {
    let max = 0
    habitosLista.forEach(h => {
      let count = 0
      const cursor = new Date(today)
      for (let i = 0; i < 366; i++) {
        if (data.habitos[fmtKey(cursor)]?.[h]) count++
        else if (i > 0) break
        cursor.setDate(cursor.getDate() - 1)
      }
      if (count > max) max = count
    })
    return max
  }, [data.habitos, habitosLista])

  const lancamentos = data.financeiro || []
  const investimentos = data.investimentos || []
  const configCDI = data.configCDI || { taxaAnual: 0 }

  const lancMes = lancamentos.filter(l => (l.mes || '').toLowerCase() === mesAtual.toLowerCase())
  const receitasPrevistasMes = lancMes.filter(l => l.tipo === 'Receita').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const despesasPrevistasMes = lancMes.filter(l => l.tipo === 'Despesa').reduce((s, l) => s + moneyNumber(l.valor), 0)

  // ── visão financeira global ──
  const recebidoTotal = lancamentos.filter(l => l.tipo === 'Receita' && l.status === 'Recebida').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const pagoTotal = lancamentos.filter(l => l.tipo === 'Despesa' && l.status === 'Pago').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const saldoAtual = recebidoTotal - pagoTotal
  const contasAPagar = lancamentos.filter(l => l.tipo === 'Despesa' && l.status === 'Pendente').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const contasAReceber = lancamentos.filter(l => l.tipo === 'Receita' && l.status === 'Prevista').reduce((s, l) => s + moneyNumber(l.valor), 0)

  const investimentosCalc = useMemo(() => investimentos.map(item => calcularValorAtualInvestimento(item, configCDI.taxaAnual, today)), [investimentos, configCDI.taxaAnual])
  const investimentosValorAtual = investimentosCalc.reduce((s, c) => s + c.valorAtual, 0)
  const totalInvestido = investimentos.reduce((s, i) => s + moneyNumber(i.valorInvestido), 0)
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
        (dia.tasks || []).forEach((t, idx) => {
          if (t.trim() && !(dia.checks || [])[idx]) {
            res.push({ label: t, data: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) })
          }
        })
      }
    }
    return res.slice(0, 8)
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

  // ── Evolução de investimentos: a partir do primeiro aporte real ──
  const evolucaoInvestimentos = useMemo(() => {
    const anoAtual = today.getFullYear()

    // Encontrar o índice do primeiro mês com aporte no ano atual
    const primeiraMesIdx = (() => {
      let minIdx = 12
      investimentos.forEach(i => {
        if (!i.dataInvestimento) return
        const d = new Date(i.dataInvestimento)
        if (d.getFullYear() === anoAtual) {
          minIdx = Math.min(minIdx, d.getMonth())
        }
      })
      return minIdx === 12 ? null : minIdx
    })()

    if (primeiraMesIdx === null) return []

    let acumulado = 0
    const resultado = []
    for (let idx = primeiraMesIdx; idx < 12; idx++) {
      const mes = MESES[idx]
      const aportesDoMes = investimentos.filter(i => {
        if (!i.dataInvestimento) return false
        const d = new Date(i.dataInvestimento)
        return d.getFullYear() === anoAtual && d.getMonth() === idx
      }).reduce((s, i) => s + moneyNumber(i.valorInvestido), 0)
      acumulado += aportesDoMes
      resultado.push({ mes, valor: acumulado, aporte: aportesDoMes })
    }
    return resultado
  }, [investimentos])

  // ── Projeção futura (12 meses) com CDI + aportes mensais ──
  const projecaoFutura = useMemo(() => {
    const MESES_PROJECAO = 12
    const meses = []
    let valorAcumulado = investimentosValorAtual
    for (let i = 1; i <= MESES_PROJECAO; i++) {
      const d = new Date(today)
      d.setMonth(d.getMonth() + i)
      const label = `${d.toLocaleString('pt-BR', { month: 'short' })}/${d.getFullYear().toString().slice(2)}`
      // Aplica rendimento composto do mês + aporte
      const i_mensal = taxaMensal(configCDI.taxaAnual)
      valorAcumulado = valorAcumulado * (1 + i_mensal) + aporteMensalPlanejado
      meses.push({ label, valor: valorAcumulado })
    }
    return meses
  }, [investimentosValorAtual, aporteMensalPlanejado, configCDI.taxaAnual])

  const valorProjetado12m = projecaoFutura.length > 0 ? projecaoFutura[projecaoFutura.length - 1].valor : investimentosValorAtual
  const ganhoEstimado = valorProjetado12m - investimentosValorAtual - (aporteMensalPlanejado * 12)
  const totalAportadoProjetado = totalInvestido + (aporteMensalPlanejado * 12)

  const maxCategoria = Math.max(1, ...gastosPorCategoria.map(i => i.total))
  const maxEvolucaoFin = Math.max(1, ...evolucaoFinanceira.flatMap(i => [i.receitas, i.despesas]))
  const maxInvestEvol = evolucaoInvestimentos.length > 0 ? Math.max(1, ...evolucaoInvestimentos.map(i => i.valor)) : 1
  const maxProjecao = projecaoFutura.length > 0 ? Math.max(1, ...projecaoFutura.map(i => i.valor)) : 1

  // ── Próximas contas a vencer (despesas pendentes com data) ──
  const proximasContas = useMemo(() => {
    const hoje = new Date(today)
    hoje.setHours(0, 0, 0, 0)
    const limite = new Date(hoje)
    limite.setDate(limite.getDate() + 30) // mostra até 30 dias à frente

    return lancamentos
      .filter(l => l.tipo === 'Despesa' && l.status === 'Pendente' && l.vencimento)
      .map(l => {
        const venc = new Date(l.vencimento + 'T00:00:00')
        const diffDias = Math.round((venc - hoje) / 86400000)
        let urgencia = 'upcoming'
        let urgenciaLabel = ''
        if (diffDias < 0) { urgencia = 'overdue'; urgenciaLabel = `${Math.abs(diffDias)}${t(lang, 'dash.overdueBadge')}` }
        else if (diffDias === 0) { urgencia = 'today'; urgenciaLabel = t(lang, 'dash.dueToday') }
        else if (diffDias <= 3) { urgencia = 'soon'; urgenciaLabel = t(lang, 'dash.inDays', diffDias) }
        else { urgenciaLabel = t(lang, 'dash.inDays', diffDias) }
        return { ...l, venc, diffDias, urgencia, urgenciaLabel }
      })
      .filter(l => l.diffDias <= 30)
      .sort((a, b) => a.diffDias - b.diffDias)
      .slice(0, 8)
  }, [lancamentos])

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>{today.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* ── RESUMO SEMANAL ── */}
      <div className="weekly-summary" style={{ marginBottom: 24 }}>
        <div className="weekly-summary-item">
          <div className="weekly-summary-label">{t(lang, 'dash.weekTasks')}</div>
          <div className="weekly-summary-value" style={{ color: resumoSemana.tarefasTotais > 0 && resumoSemana.tarefasFeitas === resumoSemana.tarefasTotais ? 'var(--green)' : 'var(--text)' }}>
            {resumoSemana.tarefasFeitas}/{resumoSemana.tarefasTotais}
          </div>
          <div className="weekly-summary-sub">{t(lang, 'dash.doneWeek')}</div>
        </div>
        <div className="weekly-summary-item">
          <div className="weekly-summary-label">{t(lang, 'dash.weekHabits')}</div>
          <div className="weekly-summary-value" style={{ color: resumoSemana.pctHabitos >= 80 ? 'var(--green)' : resumoSemana.pctHabitos >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
            {resumoSemana.pctHabitos}%
          </div>
          <div className="weekly-summary-sub">{t(lang, 'dash.avgLast')} {resumoSemana.diasSemana}d</div>
        </div>
        <div className="weekly-summary-item">
          <div className="weekly-summary-label">{t(lang, 'dash.bestStreak')}</div>
          <div className="weekly-summary-value" style={{ color: melhorStreak >= 7 ? 'var(--green)' : melhorStreak >= 3 ? 'var(--accent)' : 'var(--text)' }}>
            {melhorStreak > 0 ? `${melhorStreak}d 🔥` : '—'}
          </div>
          <div className="weekly-summary-sub">{t(lang, 'dash.daysStreak')}</div>
        </div>
        <div className="weekly-summary-item">
          <div className="weekly-summary-label">{t(lang, 'dash.netWorth')}</div>
          <div className="weekly-summary-value" style={{ fontSize: 16, color: patrimonioTotal >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {fmt(patrimonioTotal)}
          </div>
          <div className="weekly-summary-sub">{t(lang, 'dash.netWorthSub')}</div>
        </div>
      </div>

      {/* ── SEÇÃO 1: TAREFAS (prioridade máxima) ── */}
      <div className="dashboard-section-label">{t(lang, 'dash.upcomingTasks')}</div>
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card dash-tasks-card" onClick={() => setTab('agenda')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="card-title" style={{ margin: 0 }}>{t(lang, 'dash.todayCompleted', feitas, tarefasHoje)}</div>
            <span className={`badge ${feitas === tarefasHoje && tarefasHoje > 0 ? 'badge-green' : feitas > 0 ? 'badge-yellow' : 'badge-gray'}`}>
              {pct(feitas, tarefasHoje)}%
            </span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 14 }}>
            <div className="progress-fill" style={{ width: `${pct(feitas, tarefasHoje)}%` }} />
          </div>
          {agendaHoje.tasks.filter(t => t.trim()).length === 0 ? (
            <p className="muted-small">{t(lang, 'dash.noTasksToday')}</p>
          ) : agendaHoje.tasks.map((t, i) => t.trim() ? (
            <div key={i} className="dash-task-row">
              <span className={`dash-task-dot ${agendaHoje.checks[i] ? 'done' : ''}`} />
              <span style={{ fontSize: 13, textDecoration: agendaHoje.checks[i] ? 'line-through' : 'none', color: agendaHoje.checks[i] ? 'var(--text-muted)' : 'var(--text)' }}>{t}</span>
            </div>
          ) : null)}
        </div>

        <div className="card" onClick={() => setTab('agenda')} style={{ cursor: 'pointer' }}>
          <div className="card-title">{t(lang, 'dash.next7')}</div>
          {proximasTarefas.length === 0 ? (
            <p className="muted-small">{t(lang, 'dash.noNext')}</p>
          ) : (
            proximasTarefas.map((t, i) => (
              <div key={i} className="list-row" style={{ padding: '7px 0' }}>
                <span className="row-kicker">{t.data}</span>
                <span style={{ fontSize: 13 }}>{t.label}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── SEÇÃO 2: HÁBITOS ── */}
      <div className="dashboard-section-label">{t(lang, 'dash.habitsSection')}</div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="card-title" style={{ margin: 0 }}>
            {t(lang, 'dash.completedOf', habitosFeitos, habitosLista.length)}
          </div>
          <span className={`badge ${percentualHabitos === 100 ? 'badge-green' : percentualHabitos >= 50 ? 'badge-yellow' : 'badge-gray'}`}>
            {percentualHabitos}%
          </span>
        </div>
        <div className="progress-bar" style={{ marginBottom: 14 }}>
          <div className="progress-fill" style={{ width: `${percentualHabitos}%` }} />
        </div>
        <div className="dash-habitos-grid">
          {habitosLista.map(h => (
            <label key={h} className={`dash-habito-item ${habitosHoje[h] ? 'done' : ''}`}>
              <input type="checkbox" checked={!!habitosHoje[h]} onChange={() => toggleHabitoHoje(h)} />
              <span>{h}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── SEÇÃO 3: INDICADORES RÁPIDOS ── */}
      <div className="dashboard-section-label">{t(lang, 'dash.overview')}</div>
      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="card card-clickable" onClick={() => setTab('agenda')}>
          <div className="card-title">{t(lang, 'dash.agendaToday')}</div>
          <div className="stat-value">{feitas}/{tarefasHoje}</div>
          <div className="stat-label">{t(lang, 'dash.tasksDone')}</div>
        </div>

        <div className="card card-clickable" onClick={() => setTab('habitos')}>
          <div className="card-title">{t(lang, 'dash.habitsCard')}</div>
          <div className="stat-value">{percentualHabitos}%</div>
          <div className="stat-label">{t(lang, 'dash.habitsDoneOf', habitosFeitos, habitosLista.length)}</div>
        </div>

        <div className="card card-clickable" onClick={() => setTab('metas')}>
          <div className="card-title">{t(lang, 'dash.activeGoals')}</div>
          <div className="stat-value">{metasAtivas}</div>
          <div className="stat-label">{t(lang, 'dash.inProgress')}</div>
          {metasConcluidas > 0 && (
            <div style={{ marginTop: 8 }}><span className="badge badge-green">{metasConcluidas} {metasConcluidas > 1 ? t(lang, 'dash.concluidasPlural') : t(lang, 'dash.concluidas')}</span></div>
          )}
        </div>

        <div className="card card-clickable" onClick={() => setTab('financeiro')}>
          <div className="card-title">{t(lang, 'dash.netWorthCard')}</div>
          <div className="stat-value" style={{ color: patrimonioTotal >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>{fmt(patrimonioTotal)}</div>
          <div className="stat-label">{t(lang, 'dash.netWorthCardSub')}</div>
        </div>
      </div>

      {/* ── SEÇÃO 4: FINANCEIRO ── */}
      <div className="dashboard-section-label">{t(lang, 'dash.financeSec', mesAtual)}</div>
      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="card card-clickable" onClick={() => setTab('financeiro')}>
          <div className="card-title">{t(lang, 'dash.currentBalance')}</div>
          <div className="stat-value" style={{ color: saldoAtual >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 19 }}>{fmt(saldoAtual)}</div>
          <div className="muted-small">{t(lang, 'dash.receivedMinusPaid')}</div>
        </div>
        <div className="card card-clickable" onClick={() => setTab('financeiro')}>
          <div className="card-title">{t(lang, 'dash.payable')}</div>
          <div className="stat-value" style={{ color: 'var(--yellow)', fontSize: 19 }}>{fmt(contasAPagar)}</div>
          <div className="muted-small">{t(lang, 'dash.pendingExpenses')}</div>
        </div>
        <div className="card card-clickable" onClick={() => setTab('financeiro')}>
          <div className="card-title">{t(lang, 'dash.toReceive')}</div>
          <div className="stat-value" style={{ color: 'var(--blue)', fontSize: 19 }}>{fmt(contasAReceber)}</div>
          <div className="muted-small">{t(lang, 'dash.projectedIncSub')}</div>
        </div>
        <div className="card card-clickable" onClick={() => setTab('financeiro')}>
          <div className="card-title">{t(lang, 'dash.investments')}</div>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 19 }}>{fmt(investimentosValorAtual)}</div>
          <div className="muted-small">{t(lang, 'dash.portfolioValue')}</div>
        </div>
      </div>

      {/* ── PRÓXIMAS CONTAS A VENCER ── */}
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card" onClick={() => setTab('financeiro')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="card-title" style={{ margin: 0 }}>{t(lang, 'dash.upcomingBills')}</div>
            {proximasContas.some(c => c.urgencia === 'overdue' || c.urgencia === 'today') && (
              <span className="badge badge-red" style={{ fontSize: 10 }}>{t(lang, 'dash.attention')}</span>
            )}
          </div>
          {proximasContas.length === 0 ? (
            <p className="muted-small">{t(lang, 'dash.noBills')}</p>
          ) : (
            <div className="bill-list">
              {proximasContas.map(c => (
                <div key={c.id} className={`bill-row ${c.urgencia}`}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.descricao}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {c.categoria && <span>{c.categoria} · </span>}
                      {c.venc.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{fmt(c.valor)}</div>
                  <span className={`bill-urgency-badge bill-urgency-${c.urgencia === 'upcoming' ? 'ok' : c.urgencia}`}>
                    {c.urgenciaLabel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card de resumo do mês — segunda coluna do grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-title">{t(lang, 'dash.projectedIncomeMes', mesAtual)}</div>
            <div className="stat-value" style={{ fontSize: 18, color: 'var(--green)' }}>{fmt(receitasPrevistasMes)}</div>
          </div>
          <div className="card">
            <div className="card-title">{t(lang, 'dash.projectedExpMes', mesAtual)}</div>
            <div className="stat-value" style={{ fontSize: 18, color: 'var(--red)' }}>{fmt(despesasPrevistasMes)}</div>
          </div>
          <div className="card">
            <div className="card-title">{t(lang, 'dash.monthlyContrib')}</div>
            <div className="stat-value" style={{ fontSize: 18, color: 'var(--accent)' }}>{fmt(aporteMensalPlanejado)}</div>
          </div>
        </div>
      </div>


      {/* ── SEÇÃO 5: GRÁFICOS FINANCEIROS ── */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">{t(lang, 'dash.expByCat', mesAtual)}</div>
          {gastosPorCategoria.length === 0 ? (
            <p className="muted-small">{t(lang, 'dash.noExpenses')}</p>
          ) : gastosPorCategoria.map(item => (
            <div key={item.categoria} className="bar-row">
              <div className="bar-row-label"><span>{item.categoria}</span><strong>{fmt(item.total)}</strong></div>
              <div className="chart-track"><div className="chart-fill neutral" style={{ width: `${(item.total / maxCategoria) * 100}%` }} /></div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">{t(lang, 'dash.incomeVsExp')}</div>
          <div className="monthly-chart" style={{ minHeight: 140 }}>
            {evolucaoFinanceira.map(item => (
              <div key={item.mes} className="monthly-group">
                <div className="monthly-bars" style={{ height: 100 }}>
                  <span className="income" style={{ height: `${Math.max(4, (item.receitas / maxEvolucaoFin) * 100)}%` }} title={`${t(lang,'dash.income')}: ${fmt(item.receitas)}`} />
                  <span className="expense" style={{ height: `${Math.max(4, (item.despesas / maxEvolucaoFin) * 100)}%` }} title={`${t(lang,'dash.expenses')}: ${fmt(item.despesas)}`} />
                </div>
                <div className="monthly-label">{item.mes.slice(0, 3)}</div>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span><i className="legend-income" /> {t(lang, 'dash.income')}</span>
            <span><i className="legend-expense" /> {t(lang, 'dash.expenses')}</span>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 6: INVESTIMENTOS ── */}
      <div className="dashboard-section-label">{t(lang, 'dash.investSection')}</div>

      {/* Evolução histórica (só a partir do 1º investimento) */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">{t(lang, 'dash.portfolioEvol', today.getFullYear())}</div>
          {evolucaoInvestimentos.length === 0 ? (
            <p className="muted-small">{t(lang, 'dash.noInvestments')}</p>
          ) : evolucaoInvestimentos.map(item => (
            <div key={item.mes} className="bar-row">
              <div className="bar-row-label">
                <span>{item.mes.slice(0, 3)}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {item.aporte > 0 && <span className="badge badge-green" style={{ fontSize: 10 }}>+{fmt(item.aporte)}</span>}
                  <strong>{fmt(item.valor)}</strong>
                </div>
              </div>
              <div className="chart-track"><div className="chart-fill accent" style={{ width: `${(item.valor / maxInvestEvol) * 100}%` }} /></div>
            </div>
          ))}
        </div>

        {/* Projeção futura */}
        <div className="card">
          <div className="card-title">{t(lang, 'dash.projection12m')}</div>
          {aporteMensalPlanejado === 0 && investimentosValorAtual === 0 ? (
            <p className="muted-small">{t(lang, 'dash.noInvestments')}</p>
          ) : (
            <>
              <div className="grid-2" style={{ marginBottom: 14, gap: 10 }}>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t(lang, 'dash.investments')}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, color: 'var(--text)' }}>{fmt(investimentosValorAtual)}</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t(lang, 'dash.projectedValue')}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, color: 'var(--accent)' }}>{fmt(valorProjetado12m)}</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t(lang, 'dash.estimatedGain')}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, color: 'var(--green)' }}>{fmt(Math.max(0, ganhoEstimado))}</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t(lang, 'dash.totalContrib12')}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, color: 'var(--text)' }}>{fmt(totalAportadoProjetado)}</div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${projecaoFutura.length}, minmax(38px, 1fr))`, gap: 4, alignItems: 'flex-end', minHeight: 80, paddingBottom: 4 }}>
                  {projecaoFutura.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.max(8, (item.valor / maxProjecao) * 72)}px`,
                          background: 'var(--accent)',
                          borderRadius: '3px 3px 0 0',
                          opacity: 0.65 + (idx / projecaoFutura.length) * 0.35,
                        }}
                        title={`${item.label}: ${fmt(item.valor)}`}
                      />
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="muted-small" style={{ marginTop: 8 }}>
                {t(lang, 'dash.projectionNote', Number(configCDI.taxaAnual || 0).toFixed(2), fmt(aporteMensalPlanejado))}
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── SEÇÃO 7: METAS ── */}
      <div className="dashboard-section-label">🎯 {t(lang, 'tab.metas')}</div>
      <div className="card">
        <div className="card-title">{t(lang, 'dash.goalsOverview')}</div>
        <div className="dashboard-goals">
          {(data.metas || []).map(m => (
            <div key={m.id} className="goal-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                <div>
                  <div className="meta-area-label">{m.area}</div>
                  <div style={{ fontSize: 13 }}>{m.meta || <span style={{ color: 'var(--text-muted)' }}>{t(lang, 'dash.notDefined')}</span>}</div>
                </div>
                <span className={`badge ${m.status === 'Concluída' ? 'badge-green' : m.status === 'Em andamento' ? 'badge-blue' : 'badge-gray'}`}>{t(lang, `met.status.${m.status}`) || m.status}</span>
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
