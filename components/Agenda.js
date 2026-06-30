import { useState, useMemo } from 'react'

const DIAS_LABEL = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function fmtKey(date)   { return date.toISOString().split('T')[0] }
function fmtLabel(date) { return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }

// Compatibilidade: se tasks/checks não existir ou for tamanho menor, expande
function normDay(day) {
  const tasks  = Array.isArray(day?.tasks)  ? [...day.tasks]  : []
  const checks = Array.isArray(day?.checks) ? [...day.checks] : []
  // Garante que tasks e checks têm o mesmo tamanho mínimo de 5
  const len = Math.max(5, tasks.length, checks.length)
  while (tasks.length  < len) tasks.push('')
  while (checks.length < len) checks.push(false)
  return { tasks, checks, notas: day?.notas || '' }
}

const EMPTY_DAY = () => normDay(null)

export default function Agenda({ data, update }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [weekStart, setWeekStart]   = useState(getMondayOf(today))
  const [showBacklog, setShowBacklog] = useState(true)

  const days = DIAS_LABEL.map((label, i) => {
    const date = addDays(weekStart, i)
    return { label, date, key: fmtKey(date) }
  })

  const getDay = (key) => normDay(data.agenda[key])

  // Atualiza texto de uma tarefa
  const updateTask = (key, idx, value) => {
    const day = getDay(key)
    const tasks = [...day.tasks]; tasks[idx] = value
    update('agenda', { ...data.agenda, [key]: { ...day, tasks } })
  }

  // Alterna check de uma tarefa
  const toggleCheck = (key, idx) => {
    const day = getDay(key)
    const checks = [...day.checks]; checks[idx] = !checks[idx]
    update('agenda', { ...data.agenda, [key]: { ...day, checks } })
  }

  // Adiciona nova tarefa vazia ao dia
  const addTask = (key) => {
    const day = getDay(key)
    update('agenda', {
      ...data.agenda,
      [key]: { ...day, tasks: [...day.tasks, ''], checks: [...day.checks, false] }
    })
  }

  // Remove tarefa pelo índice
  const removeTask = (key, idx) => {
    const day = getDay(key)
    const tasks  = day.tasks.filter((_, i) => i !== idx)
    const checks = day.checks.filter((_, i) => i !== idx)
    // Mantém mínimo de 1 linha vazia
    if (tasks.length === 0) { tasks.push(''); checks.push(false) }
    update('agenda', { ...data.agenda, [key]: { ...day, tasks, checks } })
  }

  const updateNotas = (key, value) => {
    const day = getDay(key)
    update('agenda', { ...data.agenda, [key]: { ...day, notas: value } })
  }

  const prevWeek  = () => setWeekStart(addDays(weekStart, -7))
  const nextWeek  = () => setWeekStart(addDays(weekStart,  7))
  const goToday   = () => setWeekStart(getMondayOf(today))
  const weekLabel = `${fmtLabel(weekStart)} – ${fmtLabel(addDays(weekStart, 6))}`

  // Backlog: tarefas não concluídas de dias anteriores a hoje
  const backlog = useMemo(() => {
    const todayISO = fmtKey(today)
    const res = []
    Object.entries(data.agenda).forEach(([key, dia]) => {
      if (key >= todayISO || !dia?.tasks) return
      const norm = normDay(dia)
      norm.tasks.forEach((t, idx) => {
        if (t.trim() && !norm.checks[idx]) {
          const d = new Date(key + 'T00:00:00')
          res.push({
            key, taskIdx: idx, label: t,
            dataLabel: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
            diasAtras: Math.round((today - d) / 86400000),
          })
        }
      })
    })
    return res.sort((a, b) => b.key.localeCompare(a.key))
  }, [data.agenda])

  const concludeBacklog = (key, taskIdx) => {
    const day = getDay(key)
    const checks = [...day.checks]; checks[taskIdx] = true
    update('agenda', { ...data.agenda, [key]: { ...day, checks } })
  }

  return (
    <>
      <div className="page-header">
        <h2>Agenda Semanal</h2>
        <p>Adicione quantas tarefas precisar · marque as concluídas</p>
      </div>

      {/* Painel de backlog */}
      {backlog.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--red)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showBacklog ? 12 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="card-title" style={{ margin: 0 }}>⚠ Tarefas em atraso</div>
              <span className="badge badge-red">{backlog.length}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowBacklog(s => !s)}>
              {showBacklog ? 'Ocultar ▲' : 'Ver ▼'}
            </button>
          </div>
          {showBacklog && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {backlog.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, minWidth: 90 }}>{item.dataLabel}</span>
                  <span style={{ fontSize: 13, flex: 1 }}>{item.label}</span>
                  <span className="muted-small">{item.diasAtras}d atrás</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => concludeBacklog(item.key, item.taskIdx)}>✓ Concluir</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navegação de semana */}
      <div className="week-nav">
        <button onClick={prevWeek}>‹</button>
        <span>{weekLabel}</span>
        <button onClick={nextWeek}>›</button>
        <button onClick={goToday} style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent)', borderColor: 'var(--accent)' }}>
          Hoje
        </button>
      </div>

      {/* Grade semanal */}
      <div className="week-grid">
        {days.map(({ label, date, key }) => {
          const day = getDay(key)
          const isToday = fmtKey(date) === fmtKey(today)
          const feitas = day.checks.filter(Boolean).length
          const total  = day.tasks.filter(t => t.trim()).length
          return (
            <div key={key} className={`day-col ${isToday ? 'today' : ''}`}>
              <div className="day-name">{label}</div>
              <div className="day-date">{date.getDate()}</div>
              {total > 0 && (
                <div style={{ fontSize: 10, color: feitas === total ? 'var(--green)' : 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                  {feitas}/{total} ✓
                </div>
              )}

              {/* Linhas de tarefas — dinâmicas */}
              {day.tasks.map((task, i) => (
                <div key={i} className="task-input">
                  <input
                    type="checkbox"
                    checked={day.checks[i]}
                    onChange={() => toggleCheck(key, i)}
                    style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <input
                    type="text"
                    value={task}
                    placeholder={i < 5 ? `Tarefa ${i + 1}` : 'Nova tarefa...'}
                    onChange={e => updateTask(key, i, e.target.value)}
                    style={{
                      textDecoration: day.checks[i] ? 'line-through' : 'none',
                      color: day.checks[i] ? 'var(--text-muted)' : 'var(--text)',
                    }}
                  />
                  {/* Botão remover — só mostra se linha está vazia OU no hover (via CSS não é possível aqui, então mostra sempre em linhas além da 5ª ou se vazia) */}
                  {(i >= 5 || !task.trim()) && (
                    <button
                      className="task-remove-btn"
                      onClick={() => removeTask(key, i)}
                      title="Remover linha"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              {/* Botão adicionar tarefa */}
              <button className="task-add-btn" onClick={() => addTask(key)}>
                + tarefa
              </button>

              <textarea
                value={day.notas}
                placeholder="Notas do dia..."
                onChange={e => updateNotas(key, e.target.value)}
                style={{ marginTop: 8, fontSize: 12, minHeight: 50, color: 'var(--text-muted)' }}
              />
            </div>
          )
        })}
      </div>
    </>
  )
}
