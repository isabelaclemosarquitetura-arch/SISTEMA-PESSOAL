import { useMemo } from 'react'

const HABITOS_LIST = ['Beber 2L de água', 'Exercício físico', 'Leitura 30 min', 'Meditação', 'Dormir até 23h', 'Comer saudável']

export default function Dashboard({ data, setTab }) {
  const today = new Date()
  const todayKey = today.toISOString().split('T')[0]
  const month = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const mesAtual = today.toLocaleDateString('pt-BR', { month: 'long' })

  // Agenda hoje
  const agendaHoje = data.agenda[todayKey] || { tasks: ['','','','',''], checks: [false,false,false,false,false], notas: '' }
  const tarefasHoje = agendaHoje.tasks.filter(t => t.trim()).length
  const feitas = agendaHoje.checks.filter(Boolean).length

  // Financeiro mês atual
  const lancamentos = data.financeiro || []
  const mesLower = mesAtual.toLowerCase()
  const lancMes = lancamentos.filter(l => (l.mes || '').toLowerCase() === mesLower)
  const receitas = lancMes.filter(l => l.tipo === 'Receita').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)
  const despesas = lancMes.filter(l => l.tipo === 'Despesa').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)
  const saldo = receitas - despesas
  const pendentes = lancMes.filter(l => !l.pago && l.tipo === 'Despesa').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)

  // Hábitos hoje
  const habitosHoje = data.habitos[todayKey] || {}
  const habitosFeitos = HABITOS_LIST.filter(h => habitosHoje[h]).length

  // Metas em andamento
  const metasAtivas = (data.metas || []).filter(m => m.meta && m.status !== 'Concluída').length
  const metasConcluidas = (data.metas || []).filter(m => m.status === 'Concluída').length

  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Próximas tarefas não feitas da semana
  const proximasTarefas = useMemo(() => {
    const res = []
    for (let i = 0; i <= 6; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().split('T')[0]
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

      {/* Estatísticas principais */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setTab('agenda')}>
          <div className="card-title">Hoje</div>
          <div className="stat-value">{feitas}/{tarefasHoje}</div>
          <div className="stat-label">tarefas concluídas</div>
          {tarefasHoje > 0 && (
            <div className="progress-bar" style={{ marginTop: 10 }}>
              <div className="progress-fill" style={{ width: `${tarefasHoje ? (feitas/tarefasHoje)*100 : 0}%` }} />
            </div>
          )}
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setTab('financeiro')}>
          <div className="card-title">Saldo — {mesAtual}</div>
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

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setTab('habitos')}>
          <div className="card-title">Hábitos hoje</div>
          <div className="stat-value">{habitosFeitos}/{HABITOS_LIST.length}</div>
          <div className="stat-label">hábitos completos</div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${(habitosFeitos/HABITOS_LIST.length)*100}%` }} />
          </div>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setTab('metas')}>
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
        {/* Próximas tarefas */}
        <div className="card">
          <div className="card-title">Próximas tarefas</div>
          {proximasTarefas.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhuma tarefa pendente nos próximos dias.</p>
          ) : (
            proximasTarefas.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, minWidth: 80 }}>{t.data}</span>
                <span style={{ fontSize: 13 }}>{t.label}</span>
              </div>
            ))
          )}
        </div>

        {/* Hábitos de hoje */}
        <div className="card">
          <div className="card-title">Hábitos de hoje</div>
          {HABITOS_LIST.map(h => (
            <div key={h} className={`check-item ${habitosHoje[h] ? 'done' : ''}`}>
              <input type="checkbox" checked={!!habitosHoje[h]} readOnly />
              <span style={{ fontSize: 13 }}>{h}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            Clique em <strong>Hábitos</strong> no menu para registrar.
          </div>
        </div>
      </div>

      {/* Metas com progresso */}
      <div className="card">
        <div className="card-title">Visão geral das metas</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {(data.metas || []).map(m => (
            <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
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
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{m.progresso || 0}%</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
