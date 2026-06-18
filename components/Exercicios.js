import { useState } from 'react'

const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
const DIAS_LABEL = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' }

const EMPTY_REGISTRO = { data: '', destaque: '', repeticoes: '', observacoes: '' }

export default function Exercicios({ data, update }) {
  const plano = data.exercicios?.plano || {}
  const historico = data.exercicios?.historico || []
  const [registro, setRegistro] = useState({ ...EMPTY_REGISTRO })
  const [novoExercicio, setNovoExercicio] = useState('')

  const exercicios = Object.keys(plano)

  const updatePlano = (ex, field, value) => {
    const newPlano = { ...plano, [ex]: { ...plano[ex], [field]: value } }
    update('exercicios', { ...data.exercicios, plano: newPlano })
  }

  const addExercicio = () => {
    if (!novoExercicio.trim() || plano[novoExercicio.trim()]) return
    const newPlano = {
      ...plano,
      [novoExercicio.trim()]: { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' }
    }
    update('exercicios', { ...data.exercicios, plano: newPlano })
    setNovoExercicio('')
  }

  const removeExercicio = (ex) => {
    const { [ex]: _, ...rest } = plano
    update('exercicios', { ...data.exercicios, plano: rest })
  }

  const salvarRegistro = () => {
    if (!registro.data) return
    const novo = { ...registro, id: Date.now() }
    update('exercicios', { ...data.exercicios, historico: [novo, ...historico] })
    setRegistro({ ...EMPTY_REGISTRO })
  }

  const deleteRegistro = (id) => {
    update('exercicios', { ...data.exercicios, historico: historico.filter(r => r.id !== id) })
  }

  // Contagem de dias ativos por exercício
  const diasAtivos = (ex) => DIAS.filter(d => plano[ex]?.[d]).length

  return (
    <>
      <div className="page-header">
        <h2>Treino em Casa</h2>
        <p>Plano semanal e histórico de evolução</p>
      </div>

      {/* Plano semanal */}
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

      {/* Registrar treino */}
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
                  <th>Destaque</th>
                  <th>Reps/Tempo</th>
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
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.observacoes}</td>
                    <td><button className="btn btn-danger" onClick={() => deleteRegistro(r.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
