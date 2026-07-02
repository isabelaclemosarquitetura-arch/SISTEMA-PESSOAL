import { useState } from 'react'
import { t, MESES_EN } from '../lib/i18n'

const HABITOS_DEFAULT = [
  'Beber 2L de água',
  'Exercício físico',
  'Leitura 30 min',
  'Meditação',
  'Dormir até 23h',
  'Comer saudável',
]

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function fmtKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function todayKey(date) {
  return fmtKey(date.getFullYear(), date.getMonth(), date.getDate())
}

export default function Habitos({ data, update, lang = 'pt' }) {
  const MESES_DISP = lang === 'en' ? MESES_EN : MESES
  const hoje = new Date()
  const [viewYear, setViewYear] = useState(hoje.getFullYear())
  const [viewMonth, setViewMonth] = useState(hoje.getMonth())
  const [novoHabito, setNovoHabito] = useState('')
  const [editando, setEditando] = useState(null)
  const [textoEdicao, setTextoEdicao] = useState('')

  const habitos = Array.isArray(data.habitosLista) && data.habitosLista.length
    ? data.habitosLista
    : HABITOS_DEFAULT
  const keyHoje = todayKey(hoje)
  const habitosHoje = data.habitos[keyHoje] || {}
  const feitosHoje = habitos.filter(h => habitosHoje[h]).length
  const pctHoje = habitos.length ? Math.round((feitosHoje / habitos.length) * 100) : 0

  const updateLista = (lista) => update('habitosLista', lista)

  const toggleDia = (key, h) => {
    const cur = data.habitos[key] || {}
    update('habitos', { ...data.habitos, [key]: { ...cur, [h]: !cur[h] } })
  }

  const addHabito = () => {
    const nome = novoHabito.trim()
    if (nome && !habitos.some(h => h.toLowerCase() === nome.toLowerCase())) {
      updateLista([...habitos, nome])
      setNovoHabito('')
    }
  }

  const startEdit = (h) => {
    setEditando(h)
    setTextoEdicao(h)
  }

  const saveEdit = () => {
    const novoNome = textoEdicao.trim()
    if (!editando || !novoNome) return

    const lista = habitos.map(h => h === editando ? novoNome : h)
    const habitosAtualizados = Object.fromEntries(
      Object.entries(data.habitos || {}).map(([dia, valores]) => {
        if (!Object.prototype.hasOwnProperty.call(valores, editando)) return [dia, valores]
        const { [editando]: valorAntigo, ...resto } = valores
        return [dia, { ...resto, [novoNome]: valorAntigo }]
      })
    )

    update({ habitosLista: lista, habitos: habitosAtualizados })
    setEditando(null)
    setTextoEdicao('')
  }

  const removeHabito = (h) => {
    const lista = habitos.filter(x => x !== h)
    const habitosAtualizados = Object.fromEntries(
      Object.entries(data.habitos || {}).map(([dia, valores]) => {
        const { [h]: _removido, ...resto } = valores
        return [dia, resto]
      })
    )
    update({ habitosLista: lista, habitos: habitosAtualizados })
  }

  const consistencia = (h) => {
    let total = 0
    let done = 0
    for (let d = 1; d <= daysInMonth(viewYear, viewMonth); d++) {
      const k = fmtKey(viewYear, viewMonth, d)
      const dayData = new Date(viewYear, viewMonth, d)
      if (dayData <= hoje) {
        total++
        if (data.habitos[k]?.[h]) done++
      }
    }
    return total > 0 ? Math.round((done / total) * 100) : 0
  }

  const streak = (h) => {
    let count = 0
    const cursor = new Date(hoje)
    while (count < 366) {
      const k = todayKey(cursor)
      if (!data.habitos[k]?.[h]) break
      count++
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const totalDias = daysInMonth(viewYear, viewMonth)
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1)

  return (
    <>
      <div className="page-header">
        <h2>{t(lang,'hab.title')}</h2>
        <p>{t(lang,'hab.sub')}</p>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">{t(lang,'hab.completionToday')}</div>
          <div className="stat-value" style={{ color: pctHoje === 100 ? 'var(--green)' : 'var(--accent)' }}>{pctHoje}%</div>
          <div className="stat-label">{t(lang,'hab.completedOf',feitosHoje,habitos.length)}</div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${pctHoje}%` }} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">{t(lang,'hab.bestStreak')}</div>
          <div className="stat-value" style={{ color: 'var(--blue)' }}>{Math.max(0, ...habitos.map(streak))}{t(lang,'hab.daysInRow')}</div>
          <div className="stat-label">{t(lang,'hab.daysLabel')}</div>
        </div>
        <div className="card">
          <div className="card-title">{t(lang,'hab.activeHabits')}</div>
          <div className="stat-value">{habitos.length}</div>
          <div className="stat-label">{t(lang,'hab.tracking')}</div>
        </div>
      </div>

      {/* ── RANKING DE HÁBITOS ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">{t(lang,'hab.ranking',MESES_DISP[viewMonth])}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...habitos]
            .map(h => ({ h, pct: consistencia(h), streak: streak(h) }))
            .sort((a, b) => b.pct - a.pct)
            .map(({ h, pct, streak: s }, idx) => (
              <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', background: idx === 0 ? 'var(--accent)' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: idx < 3 ? 'white' : 'var(--text-muted)', flexShrink: 0
                }}>{idx + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
                    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</span>
                    <span style={{ fontWeight: 700, color: pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)', flexShrink: 0, marginLeft: 8 }}>{pct}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 5 }}>
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {s > 0 && <span className="badge badge-blue" style={{ flexShrink: 0 }}>{s}d 🔥</span>}
              </div>
            ))
          }
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">{t(lang,'hab.todayLabel')} - {hoje.toLocaleDateString(lang==='en'?'en-US':'pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
        <div className="habit-progress-dots">
          {habitos.map(h => <span key={h} className={habitosHoje[h] ? 'done' : ''} />)}
        </div>
        <div className="habit-list">
          {habitos.map(h => (
            <div key={h} className={`habit-manage-row ${habitosHoje[h] ? 'done' : ''}`}>
              {editando === h ? (
                <>
                  <input
                    type="text"
                    value={textoEdicao}
                    onChange={e => setTextoEdicao(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  />
                  <button className="btn btn-primary" onClick={saveEdit}>{t(lang,'hab.save')}</button>
                  <button className="btn btn-ghost" onClick={() => setEditando(null)}>{t(lang,'hab.cancel')}</button>
                </>
              ) : (
                <>
                  <label className="check-item" style={{ flex: 1 }}>
                    <input type="checkbox" checked={!!habitosHoje[h]} onChange={() => toggleDia(keyHoje, h)} />
                    <span>{h}</span>
                  </label>
                  <span className="badge badge-blue">{streak(h)}d</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(h)}>{t(lang,'hab.edit')}</button>
                  <button className="btn btn-danger" onClick={() => removeHabito(h)}>{t(lang,'hab.delete')}</button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="inline-form">
          <input
            type="text"
            placeholder={t(lang,'hab.addPh')}
            value={novoHabito}
            onChange={e => setNovoHabito(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHabito()}
          />
          <button className="btn btn-primary" onClick={addHabito}>{t(lang,'hab.add')}</button>
        </div>
      </div>

      <div className="card">
        <div className="section-header-row">
          <div className="card-title" style={{ margin: 0 }}>{t(lang,'hab.history')} - {MESES_DISP[viewMonth]} {viewYear}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹</button>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}>›</button>
          </div>
        </div>

        <div className="table-wrap">
          <table style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 170 }}>{t(lang,'hab.habitCol')}</th>
                {dias.map(d => <th key={d} style={{ width: 28, textAlign: 'center', padding: '6px 2px' }}>{d}</th>)}
                <th style={{ textAlign: 'center' }}>%</th>
                <th style={{ textAlign: 'center' }}>{t(lang,'hab.streakCol')}</th>
              </tr>
            </thead>
            <tbody>
              {habitos.map(h => {
                const pct = consistencia(h)
                return (
                  <tr key={h}>
                    <td>{h}</td>
                    {dias.map(d => {
                      const k = fmtKey(viewYear, viewMonth, d)
                      const isFuture = new Date(viewYear, viewMonth, d) > hoje
                      const done = data.habitos[k]?.[h]
                      const isToday = k === keyHoje
                      return (
                        <td key={d} style={{ textAlign: 'center', padding: '4px 2px' }}>
                          <button
                            className={`habit-day-button ${done ? 'done' : ''} ${isToday ? 'today' : ''}`}
                            onClick={() => !isFuture && toggleDia(k, h)}
                            disabled={isFuture}
                            title={isFuture ? t(lang,'hab.futureDay') : t(lang,'hab.toggle')}
                          />
                        </td>
                      )
                    })}
                    <td className="pct-cell" style={{ color: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)' }}>
                      {pct}%
                    </td>
                    <td className="pct-cell">{streak(h)}d</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="muted-small" style={{ marginTop: 12 }}>
          {t(lang,'hab.legend')}
        </div>
      </div>
    </>
  )
}
