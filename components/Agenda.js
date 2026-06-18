import { useState } from 'react'

const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
const DIAS_LABEL = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0,0,0,0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function fmtKey(date) {
  return date.toISOString().split('T')[0]
}

function fmtLabel(date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const EMPTY_DAY = () => ({ tasks: ['','','','',''], checks: [false,false,false,false,false], notas: '' })

export default function Agenda({ data, update }) {
  const today = new Date()
  today.setHours(0,0,0,0)
  const [weekStart, setWeekStart] = useState(getMondayOf(today))

  const days = DIAS_LABEL.map((label, i) => {
    const date = addDays(weekStart, i)
    return { label, date, key: fmtKey(date), short: DIAS[i] }
  })

  const getDay = (key) => data.agenda[key] || EMPTY_DAY()

  const updateTask = (key, taskIdx, value) => {
    const day = getDay(key)
    const tasks = [...day.tasks]
    tasks[taskIdx] = value
    const newAgenda = { ...data.agenda, [key]: { ...day, tasks } }
    update('agenda', newAgenda)
  }

  const toggleCheck = (key, taskIdx) => {
    const day = getDay(key)
    const checks = [...day.checks]
    checks[taskIdx] = !checks[taskIdx]
    const newAgenda = { ...data.agenda, [key]: { ...day, checks } }
    update('agenda', newAgenda)
  }

  const updateNotas = (key, value) => {
    const day = getDay(key)
    const newAgenda = { ...data.agenda, [key]: { ...day, notas: value } }
    update('agenda', newAgenda)
  }

  const prevWeek = () => setWeekStart(addDays(weekStart, -7))
  const nextWeek = () => setWeekStart(addDays(weekStart, 7))
  const goToday  = () => setWeekStart(getMondayOf(today))

  const weekLabel = `${fmtLabel(weekStart)} – ${fmtLabel(addDays(weekStart, 6))}`

  return (
    <>
      <div className="page-header">
        <h2>Agenda Semanal</h2>
        <p>5 compromissos por dia · marque os concluídos</p>
      </div>

      <div className="week-nav">
        <button onClick={prevWeek}>‹</button>
        <span>{weekLabel}</span>
        <button onClick={nextWeek}>›</button>
        <button onClick={goToday} style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent)', borderColor: 'var(--accent)' }}>Hoje</button>
      </div>

      <div className="week-grid">
        {days.map(({ label, date, key }) => {
          const day = getDay(key)
          const isToday = fmtKey(date) === fmtKey(today)
          return (
            <div key={key} className={`day-col ${isToday ? 'today' : ''}`}>
              <div className="day-name">{label}</div>
              <div className="day-date">{date.getDate()}</div>

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
                    placeholder={`Tarefa ${i+1}`}
                    onChange={e => updateTask(key, i, e.target.value)}
                    style={{ textDecoration: day.checks[i] ? 'line-through' : 'none', color: day.checks[i] ? 'var(--text-muted)' : 'var(--text)' }}
                  />
                </div>
              ))}

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
