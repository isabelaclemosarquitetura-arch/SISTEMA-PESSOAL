import { useState } from 'react'

const STATUS_OPTIONS = ['Pendente', 'Em andamento', 'Concluída', 'Pausada']

const BADGE_MAP = {
  'Pendente': 'badge-gray',
  'Em andamento': 'badge-blue',
  'Concluída': 'badge-green',
  'Pausada': 'badge-yellow',
}

export default function Metas({ data, update }) {
  const metas = data.metas || []
  const [expanded, setExpanded] = useState(null)

  const updateMeta = (id, field, value) => {
    const updated = metas.map(m => m.id === id ? { ...m, [field]: value } : m)
    update('metas', updated)
  }

  const concluidas = metas.filter(m => m.status === 'Concluída').length
  const andamento = metas.filter(m => m.status === 'Em andamento').length
  const progressoGeral = metas.length > 0
    ? Math.round(metas.reduce((s, m) => s + (parseInt(m.progresso) || 0), 0) / metas.length)
    : 0

  return (
    <>
      <div className="page-header">
        <h2>Metas — 2º Semestre 2026</h2>
        <p>Acompanhe o progresso das suas metas por área</p>
      </div>

      {/* Resumo */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{progressoGeral}%</div>
          <div className="stat-label">progresso geral</div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${progressoGeral}%` }} />
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{concluidas}</div>
          <div className="stat-label">metas concluídas</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--blue)' }}>{andamento}</div>
          <div className="stat-label">em andamento</div>
        </div>
      </div>

      {/* Cards de metas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {metas.map(m => {
          const isOpen = expanded === m.id
          const pct = parseInt(m.progresso) || 0

          return (
            <div key={m.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header clicável */}
              <div
                onClick={() => setExpanded(isOpen ? null : m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                  cursor: 'pointer', background: isOpen ? '#fffdf9' : 'white',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div className="meta-area-label">{m.area}</div>
                  <div style={{ fontSize: 14, fontWeight: m.meta ? 600 : 400, color: m.meta ? 'var(--text)' : 'var(--text-muted)' }}>
                    {m.meta || 'Clique para definir esta meta...'}
                  </div>
                </div>
                <div style={{ minWidth: 200 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Progresso</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className={`badge ${BADGE_MAP[m.status] || 'badge-gray'}`}>{m.status}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {/* Corpo expandido */}
              {isOpen && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                  <div className="grid-2" style={{ marginTop: 16, gap: 12 }}>
                    <div className="form-group">
                      <label>Meta</label>
                      <input type="text" value={m.meta} onChange={e => updateMeta(m.id, 'meta', e.target.value)} placeholder="O que você quer alcançar?" />
                    </div>
                    <div className="form-group">
                      <label>Por que é importante?</label>
                      <input type="text" value={m.porque} onChange={e => updateMeta(m.id, 'porque', e.target.value)} placeholder="Sua motivação..." />
                    </div>
                    <div className="form-group">
                      <label>Prazo</label>
                      <input type="date" value={m.prazo} onChange={e => updateMeta(m.id, 'prazo', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select value={m.status} onChange={e => updateMeta(m.id, 'status', e.target.value)}>
                        {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>% Progresso ({pct}%)</label>
                      <input
                        type="range" min="0" max="100" value={pct}
                        onChange={e => updateMeta(m.id, 'progresso', parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent)' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Ações planejadas</label>
                      <input type="text" value={m.acoes} onChange={e => updateMeta(m.id, 'acoes', e.target.value)} placeholder="Próximos passos..." />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                      <label>Resultado / Reflexão</label>
                      <textarea value={m.resultado} onChange={e => updateMeta(m.id, 'resultado', e.target.value)} placeholder="O que você conquistou até agora?" style={{ minHeight: 60 }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Reflexão do semestre */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Reflexão — Fim do Semestre</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            ['reflexao_conquistei', 'O que você conquistou?'],
            ['reflexao_diferente', 'O que poderia ter feito diferente?'],
            ['reflexao_desafio', 'Qual foi o maior desafio?'],
            ['reflexao_proximo', 'O que você leva para o próximo semestre?'],
          ].map(([key, label]) => (
            <div key={key} className="form-group">
              <label>{label}</label>
              <textarea
                value={data[key] || ''}
                onChange={e => update(key, e.target.value)}
                style={{ minHeight: 60 }}
                placeholder="..."
              />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
