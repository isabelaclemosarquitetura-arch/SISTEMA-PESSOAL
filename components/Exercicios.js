import { useState, useMemo } from 'react'

const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
const DIAS_LABEL = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' }
const EMPTY_REGISTRO = { data: '', destaque: '', repeticoes: '', carga: '', observacoes: '' }

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekBounds() {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const day = hoje.getDay()
  const seg = new Date(hoje); seg.setDate(seg.getDate() + (day === 0 ? -6 : 1 - day))
  const dom = new Date(seg); dom.setDate(dom.getDate() + 6); dom.setHours(23, 59, 59, 999)
  return { seg, dom }
}

export default function Exercicios({ data, update }) {
  const plano    = data.exercicios?.plano    || {}
  const historico = data.exercicios?.historico || []
  const [registro, setRegistro] = useState({ ...EMPTY_REGISTRO })
  const [novoExercicio, setNovoExercicio] = useState('')
  const [progressaoEx, setProgressaoEx] = useState('')

  const exercicios = Object.keys(plano)
  const { seg, dom } = getWeekBounds()
  const hoje = new Date()

  const treinosSemana = historico.filter(r => {
    if (!r.data) return false
    const d = new Date(r.data + 'T00:00:00')
    return d >= seg && d <= dom
  }).length

  const treinosMes = historico.filter(r => {
    if (!r.data) return false
    const d = new Date(r.data + 'T00:00:00')
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear()
  }).length

  const streakAtual = (() => {
    let count = 0
    const cursor = new Date(); cursor.setHours(0, 0, 0, 0)
    for (let i = 0; i < 90; i++) {
      if (historico.some(r => r.data === toISO(cursor))) { count++ }
      else if (i > 0) break
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  })()

  const updatePlano = (ex, field, value) =>
    update('exercicios', { ...data.exercicios, plano: { ...plano, [ex]: { ...plano[ex], [field]: value } } })

  const addExercicio = () => {
    if (!novoExercicio.trim() || plano[novoExercicio.trim()]) return
    update('exercicios', {
      ...data.exercicios,
      plano: { ...plano, [novoExercicio.trim()]: { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' } }
    })
    setNovoExercicio('')
  }

  const removeExercicio = (ex) => {
    const { [ex]: _, ...rest } = plano
    update('exercicios', { ...data.exercicios, plano: rest })
  }

  const salvarRegistro = () => {
    if (!registro.data) return
    update('exercicios', {
      ...data.exercicios,
      historico: [{ ...registro, id: Date.now() }, ...historico]
    })
    setRegistro({ ...EMPTY_REGISTRO })
  }

  const deleteRegistro = (id) =>
    update('exercicios', { ...data.exercicios, historico: historico.filter(r => r.id !== id) })

  const diasAtivos = (ex) => DIAS.filter(d => plano[ex]?.[d]).length

  // Nomes únicos de exercícios que aparecem no histórico
  const exerciciosHistorico = useMemo(() => {
    const nomes = [...new Set(historico.map(r => r.destaque).filter(Boolean))]
    return nomes.sort()
  }, [historico])

  // Entradas do exercício selecionado, ordenadas por data asc
  const progressaoData = useMemo(() => {
    if (!progressaoEx) return []
    return historico
      .filter(r => r.destaque === progressaoEx && r.data)
      .sort((a, b) => a.data.localeCompare(b.data))
  }, [historico, progressaoEx])

  return (
    <>
      <div className="page-header">
        <h2>Treino em Casa</h2>
        <p>Plano semanal e histórico de evolução</p>
      </div>

      {/* Cards de resumo semanal */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: treinosSemana >= 3 ? 'var(--green)' : 'var(--accent)' }}>
            {treinosSemana}
          </div>
          <div className="stat-label">treinos esta semana</div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${Math.min(100, (treinosSemana / 5) * 100)}%` }} />
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: streakAtual >= 3 ? 'var(--green)' : 'var(--text)' }}>
            {streakAtual}
          </div>
          <div className="stat-label">dias seguidos 🔥</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--blue)' }}>{treinosMes}</div>
          <div className="stat-label">treinos este mês</div>
        </div>
      </div>

      {/* Tabela do plano */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Plano Semanal</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}>Exercício</th>
                {DIAS.map(d => <th key={d} style={{ textAlign: 'center', width: 48 }}>{DIAS_LABEL[d]}</th>)}
                <th style={{ width: 70 }}>Séries</th>
                <th style={{ width: 90 }}>Reps/Tempo</th>
                <th>Obs.</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {exercicios.map(ex => (
                <tr key={ex}>
                  <td style={{ fontWeight: 500 }}>
                    {ex}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                      ({diasAtivos(ex)}×/sem)
                    </span>
                  </td>
                  {DIAS.map(d => (
                    <td key={d} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!plano[ex]?.[d]}
                        onChange={e => updatePlano(ex, d, e.target.checked)}
                        style={{ accentColor: 'var(--accent)', width: 16, height: 16, cursor: 'pointer' }}
                      />
                    </td>
                  ))}
                  <td>
                    <input type="text" value={plano[ex]?.series || ''} onChange={e => updatePlano(ex, 'series', e.target.value)} placeholder="3" style={{ padding: '4px 6px', fontSize: 12 }} />
                  </td>
                  <td>
                    <input type="text" value={plano[ex]?.reps || ''} onChange={e => updatePlano(ex, 'reps', e.target.value)} placeholder="15 / 30s" style={{ padding: '4px 6px', fontSize: 12 }} />
                  </td>
                  <td>
                    <input type="text" value={plano[ex]?.obs || ''} onChange={e => updatePlano(ex, 'obs', e.target.value)} placeholder="..." style={{ padding: '4px 6px', fontSize: 12 }} />
                  </td>
                  <td>
                    <button className="btn btn-danger" onClick={() => removeExercicio(ex)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <input
            type="text"
            placeholder="Adicionar exercício..."
            value={novoExercicio}
            onChange={e => setNovoExercicio(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addExercicio()}
            style={{ flex: 1, maxWidth: 280 }}
          />
          <button className="btn btn-primary" onClick={addExercicio}>+ Adicionar</button>
        </div>
      </div>

      {/* Registro de treino */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Registrar treino de hoje</div>
        <div className="form-row">
          <div className="form-group" style={{ maxWidth: 160 }}>
            <label>Data</label>
            <input type="date" value={registro.data} onChange={e => setRegistro(r => ({ ...r, data: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Exercício destaque</label>
            <input type="text" value={registro.destaque} onChange={e => setRegistro(r => ({ ...r, destaque: e.target.value }))} placeholder="Ex: Agachamento" />
          </div>
          <div className="form-group" style={{ maxWidth: 160 }}>
            <label>Repetições/Tempo</label>
            <input type="text" value={registro.repeticoes} onChange={e => setRegistro(r => ({ ...r, repeticoes: e.target.value }))} placeholder="Ex: 3x20 / 45min" />
          </div>
          <div className="form-group" style={{ maxWidth: 120 }}>
            <label>Carga (kg)</label>
            <input type="text" value={registro.carga} onChange={e => setRegistro(r => ({ ...r, carga: e.target.value }))} placeholder="Ex: 20kg" />
          </div>
          <div className="form-group">
            <label>Observações</label>
            <input type="text" value={registro.observacoes} onChange={e => setRegistro(r => ({ ...r, observacoes: e.target.value }))} placeholder="Como foi o treino?" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={salvarRegistro}>Salvar</button>
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div className="card">
        <div className="card-title">Histórico de treinos ({historico.length})</div>
        {historico.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhum treino registrado ainda.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Exercício</th>
                  <th>Reps/Tempo</th>
                  <th>Carga</th>
                  <th>Observações</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {historico.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>
                      {r.data ? new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td>{r.destaque}</td>
                    <td>{r.repeticoes}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: 12 }}>{r.carga || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.observacoes}</td>
                    <td><button className="btn btn-danger" onClick={() => deleteRegistro(r.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Progressão por exercício */}
      {exerciciosHistorico.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="section-header-row" style={{ marginBottom: 14 }}>
            <div className="card-title" style={{ margin: 0 }}>Evolução por exercício</div>
            <select
              value={progressaoEx}
              onChange={e => setProgressaoEx(e.target.value)}
              style={{ fontSize: 13, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', cursor: 'pointer', minWidth: 180 }}
            >
              <option value="">Selecionar exercício...</option>
              {exerciciosHistorico.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {progressaoEx && progressaoData.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhum registro para este exercício ainda.</p>
          )}

          {progressaoData.length > 0 && (
            <>
              {/* Mini sparkline de carga */}
              {progressaoData.some(r => r.carga) && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Evolução de carga
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48 }}>
                    {(() => {
                      const comCarga = progressaoData.filter(r => r.carga && parseFloat(r.carga) > 0)
                      if (comCarga.length === 0) return null
                      const vals = comCarga.map(r => parseFloat(r.carga) || 0)
                      const max = Math.max(...vals)
                      const min = Math.min(...vals)
                      const range = max - min || 1
                      return comCarga.map((r, i) => {
                        const v = parseFloat(r.carga) || 0
                        const h = Math.max(8, Math.round(((v - min) / range) * 36) + 8)
                        const isLast = i === comCarga.length - 1
                        return (
                          <div key={r.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1, maxWidth: 40 }} title={`${r.data ? new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}: ${r.carga}kg`}>
                            <div style={{ width: '100%', height: h, background: isLast ? 'var(--accent)' : 'var(--border)', borderRadius: 4, transition: 'height 0.3s' }} />
                            {isLast && <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700 }}>{r.carga}</span>}
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              )}

              <div className="table-wrap">
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Reps/Tempo</th>
                      <th>Carga</th>
                      <th>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...progressaoData].reverse().map((r, idx) => {
                      const prev = progressaoData[progressaoData.length - 2 - idx]
                      const cargaNum = parseFloat(r.carga) || 0
                      const prevNum = parseFloat(prev?.carga) || 0
                      const delta = cargaNum && prevNum ? cargaNum - prevNum : null
                      return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                            {r.data ? new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                          </td>
                          <td>{r.repeticoes || '—'}</td>
                          <td style={{ fontWeight: 600 }}>
                            {r.carga || '—'}
                            {delta !== null && (
                              <span style={{ fontSize: 10, marginLeft: 4, color: delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text-muted)', fontWeight: 700 }}>
                                {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : '='}
                              </span>
                            )}
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{r.observacoes || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
