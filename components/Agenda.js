import { useState, useMemo } from 'react'
import { t, DIAS_LABEL_EN, DIAS_CAL_EN, MESES_EN_FULL } from '../lib/i18n'
import { sincronizarTarefasNaAgenda, PERIODOS_DIA } from '../lib/finance'

const DIAS_LABEL_PT  = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const DIAS_CAL_PT    = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MESES_PT       = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Urgente']

function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function pad2(n) { return String(n).padStart(2, '0') }
function fmtKey(date)   { return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` }
function fmtLabel(date, locale = 'pt-BR') { return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }) }

function normAgendaDay(dayData) {
  if (!dayData) return { eventos: [], notas: '' }
  let eventos = Array.isArray(dayData.eventos) ? [...dayData.eventos] : []
  
  if (Array.isArray(dayData.tasks)) {
    dayData.tasks.forEach((t, i) => {
      let txt = ''
      if (typeof t === 'string') txt = t.trim()
      else if (t && typeof t === 'object') txt = (t.nome || t.texto || '').trim()
      
      if (txt) {
        eventos.push({
          id: `mig-${Date.now()}-${i}`,
          texto: txt,
          concluida: !!dayData.checks?.[i],
          tipo: 'tarefa',
          prioridade: (typeof t === 'object' && t.priority) ? t.priority : 'Média',
          horario: '', periododia: ''
        })
      }
    })
  }
  
  return { eventos, notas: dayData.notas || '' }
}

const EMPTY_EVENTO = { texto: '', horario: '', periododia: '', prioridade: 'Média' }

export default function Agenda({ data, update, lang = 'pt' }) {
  const DIAS_LABEL     = lang === 'en' ? DIAS_LABEL_EN  : DIAS_LABEL_PT
  const DIAS_LABEL_CAL = lang === 'en' ? DIAS_CAL_EN    : DIAS_CAL_PT
  const MESES_DISP     = lang === 'en' ? MESES_EN_FULL  : MESES_PT
  const locale         = lang === 'en' ? 'en-US'        : 'pt-BR'

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [view, setView] = useState('semana')
  const [weekStart, setWeekStart] = useState(getMondayOf(today))
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [calSelected, setCalSelected] = useState(null)
  const [showBacklog, setShowBacklog] = useState(true)

  const [formKey, setFormKey] = useState(null)
  const [eventoForm, setEventoForm] = useState({ ...EMPTY_EVENTO })
  const [editId, setEditId] = useState(null)

  const days = DIAS_LABEL.map((label, i) => {
    const date = addDays(weekStart, i)
    return { label, date, key: fmtKey(date) }
  })

  const prevWeek  = () => setWeekStart(addDays(weekStart, -7))
  const nextWeek  = () => setWeekStart(addDays(weekStart,  7))
  const goToday   = () => setWeekStart(getMondayOf(today))
  const weekLabel = `${fmtLabel(weekStart, locale)} – ${fmtLabel(addDays(weekStart, 6), locale)}`

  // Backlog: atrasados até ontem
  const backlog = useMemo(() => {
    const todayISO = fmtKey(today)
    const res = []
    Object.entries(data.agenda || {}).forEach(([key, dia]) => {
      if (key >= todayISO) return
      const norm = normAgendaDay(dia)
      norm.eventos.forEach(ev => {
        if (!ev.concluida && ev.tipo !== 'projeto') {
          const d = new Date(key + 'T00:00:00')
          res.push({
            key, evento: ev,
            dataLabel: d.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }),
            diasAtras: Math.round((today - d) / 86400000),
          })
        }
      })
    })
    return res.sort((a, b) => b.key.localeCompare(a.key))
  }, [data.agenda, today, locale])

  const toggleConcluida = (key, evento) => {
    if (evento._projetoId) {
      const projetos = [...(data.projetos || [])]
      const proj = projetos.find(p => p.id === evento._projetoId)
      if (proj) {
        const tarefas = [...(proj.tarefas || [])]
        const tIdx = tarefas.findIndex(t => t.id === evento._tarefaId)
        if (tIdx >= 0) {
          const novoStatus = tarefas[tIdx].status === 'Concluída' ? 'A fazer' : 'Concluída'
          tarefas[tIdx] = { ...tarefas[tIdx], status: novoStatus }
          const novoProj = { ...proj, tarefas }
          const novosProjetos = projetos.map(p => p.id === proj.id ? novoProj : p)
          const novaAgenda = sincronizarTarefasNaAgenda(data.agenda, novoProj)
          update({ projetos: novosProjetos, agenda: novaAgenda })
          return
        }
      }
    }
    const day = normAgendaDay(data.agenda[key])
    const eventos = day.eventos.map(e => e.id === evento.id ? { ...e, concluida: !e.concluida } : e)
    update('agenda', { ...data.agenda, [key]: { ...day, eventos, tasks: [], checks: [] } })
  }

  const handleSaveEvento = () => {
    if (!eventoForm.texto.trim()) return
    const day = normAgendaDay(data.agenda[formKey])
    let novosEventos = [...day.eventos]
    if (editId) {
      novosEventos = novosEventos.map(e => e.id === editId ? { ...e, ...eventoForm } : e)
    } else {
      novosEventos.push({ ...eventoForm, id: `ev-${Date.now()}`, concluida: false, tipo: 'tarefa' })
    }
    update('agenda', { ...data.agenda, [formKey]: { ...day, eventos: novosEventos, tasks: [], checks: [] } })
    setFormKey(null); setEditId(null); setEventoForm({ ...EMPTY_EVENTO })
  }

  const removeEvento = (key, id) => {
    const day = normAgendaDay(data.agenda[key])
    const eventos = day.eventos.filter(e => e.id !== id)
    update('agenda', { ...data.agenda, [key]: { ...day, eventos, tasks: [], checks: [] } })
  }

  const updateNotas = (key, value) => {
    const day = normAgendaDay(data.agenda[key])
    update('agenda', { ...data.agenda, [key]: { ...day, notas: value, tasks: [], checks: [] } })
  }

  const abrirForm = (key, ev = null) => {
    setFormKey(key)
    if (ev) { setEditId(ev.id); setEventoForm({ ...ev }) }
    else { setEditId(null); setEventoForm({ ...EMPTY_EVENTO }) }
  }

  const calDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1)
    const startDow = firstDay.getDay()
    const offset = startDow === 0 ? 6 : startDow - 1
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(calYear, calMonth, d))
    return cells
  }, [calYear, calMonth])

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }
  const selectedDay = calSelected ? normAgendaDay(data.agenda[calSelected]) : null

  const renderEvento = (key, ev) => {
    const isProj = ev.tipo === 'projeto'
    const atrs = ev.dataFim && ev.dataFim < fmtKey(today) && !ev.concluida
    return (
      <div key={ev.id} className={`agenda-event ${isProj ? 'from-project' : ''}`} style={{ opacity: ev.concluida ? 0.6 : 1 }}>
        <input type="checkbox" checked={ev.concluida} onChange={() => toggleConcluida(key, ev)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 500, fontSize: 13, textDecoration: ev.concluida ? 'line-through' : 'none' }}>
              {ev.texto}
            </span>
            <span className={`priority-badge prio-${ev.prioridade?.toLowerCase()}`}>{ev.prioridade}</span>
            {isProj && <span className="badge badge-blue" style={{ fontSize: 9 }}>{ev._projetoCodigo}</span>}
            {atrs && <span className="badge badge-red" style={{ fontSize: 9 }}>Atrasada</span>}
          </div>
          {(ev.horario || ev.periododia) && (
            <div className="muted-small" style={{ fontSize: 11, display: 'flex', gap: 6 }}>
              {ev.horario && <span>🕒 {ev.horario}{ev.horarioFim ? ` - ${ev.horarioFim}` : ''}</span>}
              {ev.periododia && <span className="periodo-badge">{ev.periododia}</span>}
            </div>
          )}
        </div>
        {!isProj && (
          <div className="table-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => abrirForm(key, ev)} style={{ minWidth: 0, padding: 4 }}>✏️</button>
            <button className="btn btn-ghost btn-sm" onClick={() => removeEvento(key, ev.id)} style={{ minWidth: 0, padding: 4, color: 'var(--red)' }}>✕</button>
          </div>
        )}
      </div>
    )
  }

  const renderForm = (key) => (
    <div className="card" style={{ padding: 12, marginBottom: 8, background: '#faf9f7', border: '1px solid var(--accent)' }}>
      <div className="form-row" style={{ gap: 8, marginBottom: 8 }}>
        <div className="form-group" style={{ flex: 2, minWidth: '100%' }}>
          <input type="text" autoFocus value={eventoForm.texto} onChange={e => setEventoForm(f => ({ ...f, texto: e.target.value }))} placeholder="Ex: Dentista, Reunião..." style={{ fontSize: 13, padding: '6px 10px' }} />
        </div>
        <div className="form-group" style={{ maxWidth: 90 }}>
          <input type="time" value={eventoForm.horario} onChange={e => setEventoForm(f => ({ ...f, horario: e.target.value }))} style={{ fontSize: 12, padding: '6px' }} />
        </div>
        <div className="form-group" style={{ maxWidth: 110 }}>
          <select value={eventoForm.periododia} onChange={e => setEventoForm(f => ({ ...f, periododia: e.target.value }))} style={{ fontSize: 12, padding: '6px' }}>
            <option value="">Período...</option>
            {PERIODOS_DIA.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ maxWidth: 100 }}>
          <select value={eventoForm.prioridade} onChange={e => setEventoForm(f => ({ ...f, prioridade: e.target.value }))} style={{ fontSize: 12, padding: '6px' }}>
            {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setFormKey(null)}>Cancelar</button>
        <button className="btn btn-primary btn-sm" onClick={handleSaveEvento}>Salvar</button>
      </div>
    </div>
  )

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
                  <span style={{ fontSize: 13, flex: 1 }}>{item.evento.texto}</span>
                  <span className="priority-badge">{item.evento.prioridade}</span>
                  <span className="muted-small">{item.diasAtras}{t(lang, 'agenda.dAgo')}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleConcluida(item.key, item.evento)}>{t(lang, 'agenda.complete')}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'mes' ? (
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
            {DIAS_LABEL_CAL.map(d => <div key={d} className="cal-header-cell">{d}</div>)}
            {calDays.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} className="cal-cell cal-cell-empty" />
              const key = fmtKey(date)
              const dia = normAgendaDay(data.agenda[key])
              const total = dia.eventos.length
              const feitas = dia.eventos.filter(e => e.concluida).length
              const isToday = key === fmtKey(today)
              const isSelected = key === calSelected
              return (
                <div key={key} className={`cal-cell ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected' : ''}`} onClick={() => setCalSelected(isSelected ? null : key)}>
                  <div className="cal-day-num">{date.getDate()}</div>
                  {total > 0 && (
                    <div className="cal-task-dots">
                      {Array.from({ length: Math.min(total, 5) }).map((_, j) => (
                        <span key={j} className={`cal-dot ${j < feitas ? 'done' : ''}`} />
                      ))}
                    </div>
                  )}
                  {total > 0 && <div className="cal-task-count">{feitas}/{total}</div>}
                </div>
              )
            })}
          </div>

          {calSelected && selectedDay && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title" style={{ marginBottom: 16 }}>
                {new Date(calSelected + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long' })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedDay.eventos.map(ev => renderEvento(calSelected, ev))}
              </div>
              {formKey === calSelected ? renderForm(calSelected) : (
                <button className="task-add-btn" onClick={() => abrirForm(calSelected)} style={{ marginTop: 12 }}>+ Novo evento</button>
              )}
              <textarea value={selectedDay.notas} placeholder={t(lang, 'agenda.notesPlaceholder')}
                onChange={e => updateNotas(calSelected, e.target.value)}
                style={{ marginTop: 16, fontSize: 12, minHeight: 50, color: 'var(--text-muted)' }} />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="week-nav">
            <button onClick={prevWeek}>‹</button>
            <span>{weekLabel}</span>
            <button onClick={nextWeek}>›</button>
            <button onClick={goToday} style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent)', borderColor: 'var(--accent)' }}>{t(lang, 'agenda.today')}</button>
          </div>

          <div className="week-grid">
            {days.map(({ label, date, key }) => {
              const day = normAgendaDay(data.agenda[key])
              const isToday = fmtKey(date) === fmtKey(today)
              const total = day.eventos.length
              const feitas = day.eventos.filter(e => e.concluida).length
              return (
                <div key={key} className={`day-col ${isToday ? 'today' : ''}`}>
                  <div className="day-name">{label}</div>
                  <div className="day-date">{date.getDate()}</div>
                  {total > 0 && (
                    <div style={{ fontSize: 10, color: feitas === total ? 'var(--green)' : 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
                      {feitas}/{total} ✓
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {day.eventos.map(ev => renderEvento(key, ev))}
                  </div>
                  {formKey === key ? renderForm(key) : (
                    <button className="task-add-btn" onClick={() => abrirForm(key)}>+ Novo</button>
                  )}
                  <textarea value={day.notas} placeholder={t(lang, 'agenda.notesPlaceholder')}
                    onChange={e => updateNotas(key, e.target.value)}
                    style={{ marginTop: 12, fontSize: 12, minHeight: 50, color: 'var(--text-muted)' }} />
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
