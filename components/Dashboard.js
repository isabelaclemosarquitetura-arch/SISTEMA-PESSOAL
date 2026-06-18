import { useMemo } from 'react'

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
  const mesAtual = today.toLocaleDateString('pt-BR', { month: 'long' })

  const habitosLista = Array.isArray(data.habitosLista) && data.habitosLista.length
    ? data.habitosLista
    : HABITOS_DEFAULT

  const agendaHoje = data.agenda[todayKey] || { tasks: ['', '', '', '', ''], checks: [false, false, false, false, false], notas: '' }
  const tarefasHoje = agendaHoje.tasks.filter(t => t.trim()).length
  const feitas = agendaHoje.checks.filter(Boolean).length

  const lancamentos = data.financeiro || []
  const lancMes = lancamentos.filter(l => (l.mes || '').toLowerCase() === mesAtual.toLowerCase())
  const receitas = lancMes.filter(l => l.tipo === 'Receita').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)
  const despesas = lancMes.filter(l => l.tipo === 'Despesa').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)
  const saldo = receitas - despesas
  const pendentes = lancMes.filter(l => !l.pago && l.tipo === 'Despesa').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)

  const habitosHoje = data.habitos[todayKey] || {}
  const habitosFeitos = habitosLista.filter(h => habitosHoje[h]).length
  const percentualHabitos = pct(habitosFeitos, habitosLista.length)

  const metasAtivas = (data.metas || []).filter(m => m.meta && m.status !== 'Concluída').length
  const metasConcluidas = (data.metas || []).filter(m => m.status === 'Concluída').length

  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

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
            res.push({
              label: t,
              data: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
            })
          }
        })
      }
    }
    return res.slice(0, 5)
  }, [data.agenda])

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
          <div className="card-title">Saldo - {mesAtual}</div>
          <div className="stat-value" style={{ color: saldo >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>
            {fmt(saldo)}
          </div>
          <div className="stat-label">{fmt(receitas)} entrada · {fmt(despesas)} saída</div>
          {pendentes > 0 && (
            <div style={{ marginTop: 8 }}>
              <span className="badge badge-yellow">{fmt(pendentes)} a pagar</span>
            </div>
          )}
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
            <div style={{ marginTop: 8 }}>
              <span className="badge badge-green">{metasConcluidas} concluída{metasConcluidas > 1 ? 's' : ''}</span>
            </div>
          )}
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
            <span className={`badge ${percentualHabitos === 100 ? 'badge-green' : percentualHabitos >= 50 ? 'badge-yellow' : 'badge-gray'}`}>
              {percentualHabitos}%
            </span>
          </div>
          <div className="habit-progress-dots" aria-label="Progresso diário dos hábitos">
            {habitosLista.map(h => (
              <span key={h} className={habitosHoje[h] ? 'done' : ''} />
            ))}
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
                <span className={`badge ${m.status === 'Concluída' ? 'badge-green' : m.status === 'Em andamento' ? 'badge-blue' : 'badge-gray'}`}>
                  {m.status}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${m.progresso || 0}%` }} />
              </div>
              <div className="muted-small" style={{ marginTop: 3 }}>{m.progresso || 0}%</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
