import { useState } from 'react'

const HABITOS_DEFAULT = [
  'Beber 2L de água',
  'Exercício físico',
  'Leitura 30 min',
  'Meditação',
  'Dormir até 23h',
  'Comer saudável',
]

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function fmtKey(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

export default function Habitos({ data, update }) {
  const hoje = new Date()
  const [viewYear, setViewYear] = useState(hoje.getFullYear())
  const [viewMonth, setViewMonth] = useState(hoje.getMonth())
  const [habitos, setHabitos] = useState(HABITOS_DEFAULT)
  const [novoHabito, setNovoHabito] = useState('')

  const todayKey = fmtKey(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const habitosHoje = data.habitos[todayKey] || {}

  const toggleHoje = (h) => {
    const cur = data.habitos[todayKey] || {}
    const newH = { ...data.habitos, [todayKey]: { ...cur, [h]: !cur[h] } }
    update('habitos', newH)
  }

  const toggleDia = (key, h) => {
    const cur = data.habitos[key] || {}
    const newH = { ...data.habitos, [key]: { ...cur, [h]: !cur[h] } }
    update('habitos', newH)
  }

  const totalDias = daysInMonth(viewYear, viewMonth)
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1)

  const addHabito = () => {
    if (novoHabito.trim() && !habitos.includes(novoHabito.trim())) {
      setHabitos([...habitos, novoHabito.trim()])
      setNovoHabito('')
    }
  }

  const removeHabito = (h) => {
    setHabitos(habitos.filter(x => x !== h))
  }

  const consistencia = (h) => {
    let total = 0
    let done = 0
    for (let d = 1; d <= totalDias; d++) {
      const k = fmtKey(viewYear, viewMonth, d)
      const dayData = new Date(viewYear, viewMonth, d)
      if (dayData <= hoje) {
        total++
        if (data.habitos[k]?.[h]) done++
      }
    }
    return total > 0 ? Math.round((done/total)*100) : 0
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11) }
    else setViewMonth(m => m-1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0) }
    else setViewMonth(m => m+1)
  }

  return (
    <>
      <div className="page-header">
        <h2>Rastreador de Hábitos</h2>
        <p>Marque o que você completou hoje</p>
      </div>

      {/* Hábitos de hoje */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Hoje — {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {habitos.map(h => (
            <div key={h} className={`check-item ${habitosHoje[h] ? 'done' : ''}`} style={{ padding: '8px 4px' }}>
              <input type="checkbox" checked={!!habitosHoje[h]} onChange={() => toggleHoje(h)} />
              <span style={{ fontSize: 14 }}>{h}</span>
            </div>
          ))}
        </div>

        {/* Adicionar hábito */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <input
            type="text"
            placeholder="Adicionar novo hábito..."
            value={novoHabito}
            onChange={e => setNovoHabito(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHabito()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={addHabito}>+ Adicionar</button>
        </div>
      </div>

      {/* Grid mensal */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}>Histórico — {MESES[viewMonth]} {viewYear}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost" style={{ padding: '5px 10px' }} onClick={prevMonth}>‹</button>
            <button className="btn btn-ghost" style={{ padding: '5px 10px' }} onClick={nextMonth}>›</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}>Hábito</th>
                {dias.map(d => <th key={d} style={{ width: 28, textAlign: 'center', padding: '6px 2px' }}>{d}</th>)}
                <th style={{ textAlign: 'center' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {habitos.map(h => {
                const pct = consistencia(h)
                return (
                  <tr key={h}>
                    <td style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span>{h}</span>
                      <button onClick={() => removeHabito(h)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 11, flexShrink: 0 }}>✕</button>
                    </td>
                    {dias.map(d => {
                      const k = fmtKey(viewYear, viewMonth, d)
                      const isFuture = new Date(viewYear, viewMonth, d) > hoje
                      const done = data.habitos[k]?.[h]
                      const isToday = k === todayKey
                      return (
                        <td key={d} style={{ textAlign: 'center', padding: '4px 2px' }}>
                          <div
                            onClick={() => !isFuture && toggleDia(k, h)}
                            style={{
                              width: 22, height: 22, borderRadius: 4, margin: '0 auto',
                              background: done ? 'var(--accent)' : isFuture ? '#f0f0f0' : 'var(--border)',
                              border: isToday ? '2px solid var(--accent)' : '2px solid transparent',
                              cursor: isFuture ? 'default' : 'pointer',
                              opacity: isFuture ? 0.4 : 1,
                            }}
                          />
                        </td>
                      )
                    })}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)' }}>
                      {pct}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          🟨 = dourado preenchido: hábito feito · clique para marcar/desmarcar
        </div>
      </div>
    </>
  )
}
