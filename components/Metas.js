import { useState } from 'react'
import { t } from '../lib/i18n'

const STATUS_OPTIONS = ['Pendente', 'Em andamento', 'Concluída', 'Pausada']
const STATUS_T_KEY = { 'Pendente': 'met.statusPendente', 'Em andamento': 'met.statusAndamento', 'Concluída': 'met.statusConcluida', 'Pausada': 'met.statusPausada' }
const BADGE_MAP = {
  'Pendente':      'badge-gray',
  'Em andamento':  'badge-blue',
  'Concluída':     'badge-green',
  'Pausada':       'badge-yellow',
}

function getSemestreLabel(lang) {
  const now = new Date()
  const mes = now.getMonth()
  const ano = now.getFullYear()
  return mes < 6 ? t(lang, 'met.sem1', ano) : t(lang, 'met.sem2', ano)
}

function diasRestantes(prazo) {
  if (!prazo) return null
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  return Math.round((new Date(prazo + 'T00:00:00') - hoje) / 86400000)
}

function PrazoLabel({ prazo, lang = 'pt' }) {
  if (!prazo) return null
  const dias = diasRestantes(prazo)
  const locale = lang === 'en' ? 'en-US' : 'pt-BR'
  const data = new Date(prazo + 'T00:00:00').toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
  if (dias < 0)  return <span style={{ fontSize: 11, color: 'var(--red)',   fontWeight: 600 }}>{t(lang,'met.overdueLabel',Math.abs(dias),data)}</span>
  if (dias === 0) return <span style={{ fontSize: 11, color: 'var(--yellow)', fontWeight: 600 }}>{t(lang,'met.todayDue')}</span>
  if (dias <= 7)  return <span style={{ fontSize: 11, color: 'var(--yellow)', fontWeight: 600 }}>{t(lang,'met.daysLeftFew',dias,dias!==1?'s':'',dias!==1?'s':'',data)}</span>
  if (dias <= 30) return <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{t(lang,'met.daysLeftMany',dias,data)}</span>
  return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t(lang,'met.dateOnly',data,dias)}</span>
}

export default function Metas({ data, update, lang = 'pt' }) {
  const metas = data.metas || []
  const [expanded, setExpanded] = useState(null)
  const [novaArea, setNovaArea] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const updateMeta = (id, field, value) =>
    update('metas', metas.map(m => m.id === id ? { ...m, [field]: value } : m))

  const [novoEtapaTexto, setNovoEtapaTexto] = useState({})

  const addEtapa = (goalId, textoEtapa) => {
    const txt = textoEtapa.trim()
    if (!txt) return
    const goal = metas.find(g => g.id === goalId)
    if (!goal) return
    const etapas = Array.isArray(goal.etapas) ? goal.etapas : []
    const newEtapa = { id: Date.now() + Math.random().toString(), texto: txt, concluida: false }
    const novasEtapas = [...etapas, newEtapa]
    
    const concluidaCount = novasEtapas.filter(e => e.concluida).length
    const novoProgresso = Math.round((concluidaCount / novasEtapas.length) * 100)
    const newStatus = novoProgresso === 100 ? 'Concluída' : (goal.status === 'Concluída' ? 'Em andamento' : goal.status)
    
    update('metas', metas.map(g => g.id === goalId ? { ...g, etapas: novasEtapas, progresso: novoProgresso, status: newStatus } : g))
    setNovoEtapaTexto({ ...novoEtapaTexto, [goalId]: '' })
  }

  const toggleEtapa = (goalId, etapaId) => {
    const goal = metas.find(g => g.id === goalId)
    if (!goal) return
    const etapas = Array.isArray(goal.etapas) ? goal.etapas : []
    const novasEtapas = etapas.map(e => e.id === etapaId ? { ...e, concluida: !e.concluida } : e)
    
    const concluidaCount = novasEtapas.filter(e => e.concluida).length
    const novoProgresso = Math.round((concluidaCount / novasEtapas.length) * 100)
    const newStatus = novoProgresso === 100 ? 'Concluída' : (goal.status === 'Concluída' ? 'Em andamento' : goal.status)
    
    update('metas', metas.map(g => g.id === goalId ? { ...g, etapas: novasEtapas, progresso: novoProgresso, status: newStatus } : g))
  }

  const deleteEtapa = (goalId, etapaId) => {
    const goal = metas.find(g => g.id === goalId)
    if (!goal) return
    const etapas = Array.isArray(goal.etapas) ? goal.etapas : []
    const novasEtapas = etapas.filter(e => e.id !== etapaId)
    
    const novoProgresso = novasEtapas.length > 0
      ? Math.round((novasEtapas.filter(e => e.concluida).length / novasEtapas.length) * 100)
      : 0
    const newStatus = novasEtapas.length > 0 && novoProgresso === 100 ? 'Concluída' : (goal.status === 'Concluída' ? 'Em andamento' : goal.status)
    
    update('metas', metas.map(g => g.id === goalId ? { ...g, etapas: novasEtapas, progresso: novasEtapas.length > 0 ? novoProgresso : 0, status: newStatus } : g))
  }

  const addMeta = () => {
    const area = novaArea.trim()
    if (!area) return
    const newId = Date.now()
    const newMeta = {
      id: newId,
      area,
      meta: '', porque: '', prazo: '', progresso: 0,
      status: 'Pendente', acoes: '', resultado: '',
    }
    update('metas', [...metas, newMeta])
    setNovaArea('')
    setShowAddForm(false)
    setTimeout(() => setExpanded(newId), 50)
  }

  const deleteMeta = (id, area) => {
    if (!window.confirm(`Excluir a meta "${area}"?`)) return
    update('metas', metas.filter(m => m.id !== id))
    if (expanded === id) setExpanded(null)
  }

  const concluidas  = metas.filter(m => m.status === 'Concluída').length
  const andamento   = metas.filter(m => m.status === 'Em andamento').length
  const atrasadas   = metas.filter(m => m.prazo && m.status !== 'Concluída' && diasRestantes(m.prazo) < 0).length
  const progressoGeral = metas.length > 0
    ? Math.round(metas.reduce((s, m) => s + (parseInt(m.progresso) || 0), 0) / metas.length)
    : 0

  return (
    <>
      <div className="page-header page-header-actions">
        <div>
          <h2>{t(lang,'met.title')} — {getSemestreLabel(lang)}</h2>
          <p>{t(lang,'met.sub')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(s => !s)}>
          {t(lang,'met.newGoal')}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{progressoGeral}%</div>
          <div className="stat-label">{t(lang,'met.overallProgress')}</div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${progressoGeral}%` }} />
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{concluidas}</div>
          <div className="stat-label">{t(lang,'met.completed')}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--blue)' }}>{andamento}</div>
          <div className="stat-label">{t(lang,'met.inProgress')}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: atrasadas > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{atrasadas}</div>
          <div className="stat-label">{t(lang,'met.overdue')}</div>
        </div>
      </div>

      {/* Formulário nova meta */}
      {showAddForm && (
        <div className="meta-add-form" style={{ marginBottom: 16 }}>
          <div className="form-group" style={{ flex: 1, margin: 0 }}>
            <label>{t(lang,'met.areaLabel')}</label>
            <input
              type="text"
              value={novaArea}
              onChange={e => setNovaArea(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMeta()}
              placeholder={t(lang,'met.areaPh')}
              autoFocus
            />
          </div>
          <button className="btn btn-primary" onClick={addMeta} style={{ alignSelf: 'flex-end' }}>{t(lang,'met.create')}</button>
          <button className="btn btn-ghost" onClick={() => setShowAddForm(false)} style={{ alignSelf: 'flex-end' }}>{t(lang,'met.cancel')}</button>
        </div>
      )}

      {/* Lista de metas com accordion */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {metas.map(m => {
          const isOpen = expanded === m.id
          const pct = parseInt(m.progresso) || 0
          return (
            <div key={m.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Cabeçalho clicável */}
              <div
                onClick={() => setExpanded(isOpen ? null : m.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer' }}
              >
                <div style={{ flex: 1 }}>
                  <div className="meta-area-label">{m.area}</div>
                  <div style={{ fontSize: 14, fontWeight: m.meta ? 600 : 400, color: m.meta ? 'var(--text)' : 'var(--text-muted)', marginBottom: 4 }}>
                    {m.meta || t(lang,'met.clickToDefine')}
                  </div>
                  <PrazoLabel prazo={m.prazo} lang={lang} />
                </div>
                <div style={{ minWidth: 180 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t(lang,'met.progress')}</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className={`badge ${BADGE_MAP[m.status] || 'badge-gray'}`}>{t(lang,STATUS_T_KEY[m.status]||m.status)}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {/* Detalhes expandidos */}
              {isOpen && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                  <div className="grid-2" style={{ marginTop: 16, gap: 12 }}>
                    <div className="form-group">
                      <label>{t(lang,'met.goalField')}</label>
                      <input type="text" value={m.meta} onChange={e => updateMeta(m.id, 'meta', e.target.value)} placeholder={t(lang,'met.goalPh')} />
                    </div>
                    <div className="form-group">
                      <label>{t(lang,'met.whyField')}</label>
                      <input type="text" value={m.porque} onChange={e => updateMeta(m.id, 'porque', e.target.value)} placeholder={t(lang,'met.whyPh')} />
                    </div>
                    <div className="form-group">
                      <label>{t(lang,'met.deadline')}</label>
                      <input type="date" value={m.prazo} onChange={e => updateMeta(m.id, 'prazo', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>{t(lang,'met.status')}</label>
                      <select value={m.status} onChange={e => updateMeta(m.id, 'status', e.target.value)}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{t(lang,STATUS_T_KEY[s]||s)}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{t(lang,'met.progress')} ({pct}%)</label>
                      {(() => {
                        const temEtapas = Array.isArray(m.etapas) && m.etapas.length > 0
                        return (
                          <>
                            <input
                              type="range" min="0" max="100" value={pct}
                              onChange={e => !temEtapas && updateMeta(m.id, 'progresso', parseInt(e.target.value))}
                              disabled={temEtapas}
                              style={{ width: '100%', accentColor: 'var(--accent)', cursor: temEtapas ? 'not-allowed' : 'pointer' }}
                            />
                            {temEtapas && (
                              <span style={{ fontSize: 11, color: 'var(--green)', display: 'block', marginTop: 4 }}>
                                ✓ {t(lang, 'met.etapasAuto')}
                              </span>
                            )}
                          </>
                        )
                      })()}
                    </div>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                      <label>{t(lang, 'met.etapas')}</label>
                      <div className="meta-etapas-box" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                        {/* Checklist de Etapas */}
                        {(!m.etapas || m.etapas.length === 0) ? (
                          <div className="muted-small" style={{ marginBottom: 12 }}>
                            {t(lang, 'met.etapasEmpty')}
                          </div>
                        ) : (
                          <div className="meta-etapas-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                            {m.etapas.map(etapa => (
                              <div key={etapa.id} className="meta-etapa-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '4px 0' }}>
                                <label className="check-item" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1, minWidth: 0 }}>
                                  <input
                                    type="checkbox"
                                    checked={!!etapa.concluida}
                                    onChange={() => toggleEtapa(m.id, etapa.id)}
                                  />
                                  <span style={{
                                    fontSize: 13,
                                    textDecoration: etapa.concluida ? 'line-through' : 'none',
                                    color: etapa.concluida ? 'var(--text-muted)' : 'var(--text)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {etapa.texto}
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  className="btn-compras-delete"
                                  onClick={() => deleteEtapa(m.id, etapa.id)}
                                  title={lang === 'en' ? 'Delete' : 'Excluir'}
                                  style={{ opacity: 0.5, border: 'none', background: 'transparent', cursor: 'pointer' }}
                                >
                                  ❌
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Formulário para adicionar nova etapa */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="text"
                            placeholder={t(lang, 'met.etapasPh')}
                            value={novoEtapaTexto[m.id] || ''}
                            onChange={e => setNovoEtapaTexto({ ...novoEtapaTexto, [m.id]: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addEtapa(m.id, novoEtapaTexto[m.id] || '')
                              }
                            }}
                            style={{ flex: 1, height: 32, padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)' }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => addEtapa(m.id, novoEtapaTexto[m.id] || '')}
                            style={{ height: 32, fontSize: 11 }}
                          >
                            {t(lang, 'met.etapasAdd')}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                      <label>{t(lang,'met.result')}</label>
                      <textarea value={m.resultado} onChange={e => updateMeta(m.id, 'resultado', e.target.value)} placeholder={t(lang,'met.resultPh')} style={{ minHeight: 60 }} />
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-danger"
                      onClick={e => { e.stopPropagation(); deleteMeta(m.id, m.area) }}
                      style={{ fontSize: 12 }}
                    >
                      {t(lang,'met.deleteGoal')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Reflexão de fim de semestre */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">{t(lang,'met.reflection')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            ['reflexao_conquistei',  t(lang,'met.r1')],
            ['reflexao_diferente',   t(lang,'met.r2')],
            ['reflexao_desafio',     t(lang,'met.r3')],
            ['reflexao_proximo',     t(lang,'met.r4')],
          ].map(([key, label]) => (
            <div key={key} className="form-group">
              <label>{label}</label>
              <textarea value={data[key] || ''} onChange={e => update(key, e.target.value)} style={{ minHeight: 60 }} placeholder="..." />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
