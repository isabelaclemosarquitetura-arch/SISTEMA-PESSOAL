import { useState, useMemo } from 'react'
import { t, DIAS_LABEL_EN, DIAS_CAL_EN, MESES_EN_FULL } from '../lib/i18n'

const DIAS_LABEL_PT  = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const DIAS_CAL_PT    = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MESES_PT       = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function fmtKey(date)   { return date.toISOString().split('T')[0] }
function fmtLabel(date, locale = 'pt-BR') { return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }) }

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

export default function Agenda({ data, update, lang = 'pt' }) {
  const DIAS_LABEL     = lang === 'en' ? DIAS_LABEL_EN  : DIAS_LABEL_PT
  const DIAS_LABEL_CAL = lang === 'en' ? DIAS_CAL_EN    : DIAS_CAL_PT
  const MESES_DISP     = lang === 'en' ? MESES_EN_FULL  : MESES_PT
  const locale         = lang === 'en' ? 'en-US'        : 'pt-BR'

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [view, setView]             = useState('semana') // 'semana' | 'mes'
  const [weekStart, setWeekStart]   = useState(getMondayOf(today))
  const [calYear,  setCalYear]      = useState(today.getFullYear())
  const [calMonth, setCalMonth]     = useState(today.getMonth())
  const [calSelected, setCalSelected] = useState(null) // key do dia selecionado no calendário
  const [showBacklog, setShowBacklog] = useState(true)

  const days = DIAS_LABEL.map((label, i) => {  // depends on lang
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
  const weekLabel = `${fmtLabel(weekStart, locale)} – ${fmtLabel(addDays(weekStart, 6), locale)}`

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
            dataLabel: d.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }),
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

  // ── Calendário mensal ──
  const calDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1)
    const startDow = firstDay.getDay() // 0=Dom
    const offset = startDow === 0 ? 6 : startDow - 1 // alinha na segunda
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(calYear, calMonth, d))
    return cells
  }, [calYear, calMonth])

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }

  const selectedDay = calSelected ? normDay(data.agenda[calSelected]) : null

  return (
    <>
      <div className="page-header page-header-actions">
        <div>
          <h2>{view === 'mes' ? t(lang, 'agenda.titleMonth') : t(lang, 'agenda.titleWeek')}</h2>
          <p>{t(lang, 'agenda.sub')}</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`btn btn-sm ${view === 'semana' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('semana')}>{t(lang, 'agenda.week')}</button>
          <button className={`btn btn-sm ${view === 'mes' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('mes')}>{t(lang, 'agenda.month')}</button>
        </div>
      </div>

      {/* Painel de backlog */}
      {backlog.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--red)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showBacklog ? 12 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="card-title" style={{ margin: 0 }}>{t(lang, 'agenda.overdue')}</div>
              <span className="badge badge-red">{backlog.length}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowBacklog(s => !s)}>
              {showBacklog ? t(lang, 'agenda.hide') : t(lang, 'agenda.show')}
            </button>
          </div>
          {showBacklog && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {backlog.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, minWidth: 90 }}>{item.dataLabel}</span>
                  <span style={{ fontSize: 13, flex: 1 }}>{item.label}</span>
                  <span className="muted-small">{item.diasAtras}{t(lang, 'agenda.dAgo')}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => concludeBacklog(item.key, item.taskIdx)}>{t(lang, 'agenda.complete')}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'mes' ? (
        /* ── VISÃO MENSAL ── */
        <>
          <div className="week-nav">
            <button onClick={prevMonth}>‹</button>
            <span>{MESES_DISP[calMonth]} {calYear}</span>
            <button onClick={nextMonth}>›</button>
            <button onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()) }}
              style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent)', borderColor: 'var(--accent)' }}>
              {t(lang, 'agenda.today')}
            </button>
          </div>

          <div className="cal-grid">
            {DIAS_LABEL_CAL.map(d => (
              <div key={d} className="cal-header-cell">{d}</div>
            ))}
            {calDays.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} className="cal-cell cal-cell-empty" />
              const key = fmtKey(date)
              const dia = normDay(data.agenda[key])
              const total  = dia.tasks.filter(t => t.trim()).length
              const feitas = dia.checks.filter(Boolean).length
              const isToday = key === fmtKey(today)
              const isSelected = key === calSelected
              return (
                <div
                  key={key}
                  className={`cal-cell ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected' : ''}`}
                  onClick={() => setCalSelected(isSelected ? null : key)}
                >
                  <div className="cal-day-num">{date.getDate()}</div>
                  {total > 0 && (
                    <div className="cal-task-dots">
                      {Array.from({ length: Math.min(total, 5) }).map((_, j) => (
                        <span key={j} className={`cal-dot ${j < feitas ? 'done' : ''}`} />
                      ))}
                    </div>
                  )}
                  {total > 0 && (
                    <div className="cal-task-count">{feitas}/{total}</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Painel do dia selecionado */}
          {calSelected && selectedDay && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title">
                {new Date(calSelected + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long' })}
              </div>
              {selectedDay.tasks.map((task, i) => (
                <div key={i} className="task-input">
                  <input type="checkbox" checked={selectedDay.checks[i]}
                    onChange={() => toggleCheck(calSelected, i)}
                    style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }} />
                  <input type="text" value={task}
                    placeholder={`${t(lang, 'agenda.task')} ${i + 1}`}
                    onChange={e => updateTask(calSelected, i, e.target.value)}
                    style={{ textDecoration: selectedDay.checks[i] ? 'line-through' : 'none', color: selectedDay.checks[i] ? 'var(--text-muted)' : 'var(--text)' }} />
                  {(i >= 5 || !task.trim()) && (
                    <button className="task-remove-btn" onClick={() => removeTask(calSelected, i)}>×</button>
                  )}
                </div>
              ))}
              <button className="task-add-btn" onClick={() => addTask(calSelected)}>{t(lang, 'agenda.addTask')}</button>
              <textarea value={selectedDay.notas} placeholder={t(lang, 'agenda.notesPlaceholder')}
                onChange={e => updateNotas(calSelected, e.target.value)}
                style={{ marginTop: 8, fontSize: 12, minHeight: 50, color: 'var(--text-muted)' }} />
            </div>
          )}
        </>
      ) : (
        /* ── VISÃO SEMANAL ── */
        <>
      {/* Navegação de semana */}
      <div className="week-nav">
        <button onClick={prevWeek}>‹</button>
        <span>{weekLabel}</span>
        <button onClick={nextWeek}>›</button>
        <button onClick={goToday} style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent)', borderColor: 'var(--accent)' }}>
          {t(lang, 'agenda.today')}
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
                    placeholder={`${t(lang, 'agenda.task')} ${i + 1}`}
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
                {t(lang, 'agenda.addTask')}
              </button>

              <textarea
                value={day.notas}
                placeholder={t(lang, 'agenda.notesPlaceholder')}
                onChange={e => updateNotas(key, e.target.value)}
                style={{ marginTop: 8, fontSize: 12, minHeight: 50, color: 'var(--text-muted)' }}
              />
            </div>
          )
        })}
      </div>
        </>
      )}
    </>
  )
}
