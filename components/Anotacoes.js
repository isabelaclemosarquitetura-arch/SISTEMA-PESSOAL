import { useState } from 'react'
import { t } from '../lib/i18n'

const CORES = [
  { hex: '#ffffff', label: 'Branco'  },
  { hex: '#fff9e6', label: 'Amarelo' },
  { hex: '#e8f5e9', label: 'Verde'   },
  { hex: '#e3f2fd', label: 'Azul'    },
  { hex: '#fce4ec', label: 'Rosa'    },
  { hex: '#f3e5f5', label: 'Lilás'   },
]

const TAGS_SUGERIDAS = ['📌 Importante', '💡 Ideia', '📚 Aprendizado', '✅ Ação', '🔖 Referência', '💬 Reflexão']

export default function Anotacoes({ data, update, lang = 'pt' }) {
  const anotacoes = data.anotacoes || []
  const [busca, setBusca]       = useState('')
  const [tagFiltro, setTagFiltro] = useState('')
  const locale = lang === 'en' ? 'en-US' : 'pt-BR'

  const addNota = () => update('anotacoes', [{
    id: Date.now(),
    titulo: '',
    conteudo: '',
    cor: '#ffffff',
    tag: '',
    criada: new Date().toLocaleDateString(locale),
  }, ...anotacoes])

  const updateNota = (id, field, value) =>
    update('anotacoes', anotacoes.map(n => n.id === id ? { ...n, [field]: value } : n))

  const deleteNota = (id) =>
    update('anotacoes', anotacoes.filter(n => n.id !== id))

  const tagsUsadas = Array.from(new Set(anotacoes.map(n => n.tag).filter(Boolean)))

  const filtradas = anotacoes.filter(n => {
    const matchBusca = !busca || n.titulo?.toLowerCase().includes(busca.toLowerCase()) || n.conteudo?.toLowerCase().includes(busca.toLowerCase())
    const matchTag   = !tagFiltro || n.tag === tagFiltro
    return matchBusca && matchTag
  })

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>{t(lang,'nota.title')}</h2>
          <p>{t(lang,'nota.sub')}</p>
        </div>
        <button className="btn btn-primary" onClick={addNota}>{t(lang,'nota.new')}</button>
      </div>

      {/* Busca e filtros por tag */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder={t(lang,'nota.searchPh')}
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className={`pill ${tagFiltro === '' ? 'active' : ''}`} onClick={() => setTagFiltro('')}>{t(lang,'nota.all')}</button>
          {tagsUsadas.map(tag => (
            <button key={tag} className={`pill ${tagFiltro === tag ? 'active' : ''}`} onClick={() => setTagFiltro(tagFiltro === tag ? '' : tag)}>
              {tag}
            </button>
          ))}
        </div>
        <span className="muted-small">{filtradas.length} nota{filtradas.length !== 1 ? 's' : ''}</span>
      </div>

      {filtradas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
          <p style={{ fontSize: 14 }}>
            {busca || tagFiltro ? t(lang,'nota.noneFound') : t(lang,'nota.none')}
          </p>
          {!busca && !tagFiltro && (
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={addNota}>
              {t(lang,'nota.createFirst')}
            </button>
          )}
        </div>
      ) : (
        <div className="notes-container">
          {filtradas.map(n => {
            const chars = (n.conteudo || '').length
            return (
              <div key={n.id} className="note-card" style={{ background: n.cor }}>
                {/* Tag selector */}
                <div style={{ marginBottom: 6 }}>
                  <select
                    value={n.tag || ''}
                    onChange={e => updateNota(n.id, 'tag', e.target.value)}
                    style={{ fontSize: 11, padding: '2px 6px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, background: 'rgba(0,0,0,0.05)', color: 'inherit', width: 'auto' }}
                  >
                    <option value="">{t(lang,'nota.noTag')}</option>
                    {TAGS_SUGERIDAS.map(tg => <option key={tg} value={tg}>{tg}</option>)}
                    {n.tag && !TAGS_SUGERIDAS.includes(n.tag) && <option value={n.tag}>{n.tag}</option>}
                  </select>
                </div>
                <input
                  type="text"
                  value={n.titulo}
                  onChange={e => updateNota(n.id, 'titulo', e.target.value)}
                  placeholder={t(lang,'nota.titlePh')}
                  style={{ fontWeight: 700, fontSize: 14, border: 'none', background: 'transparent', padding: 0, color: 'var(--text)' }}
                />
                <textarea
                  value={n.conteudo}
                  onChange={e => updateNota(n.id, 'conteudo', e.target.value)}
                  placeholder={t(lang,'nota.contentPh')}
                  style={{ background: 'transparent', border: 'none', padding: 0, minHeight: 90, fontSize: 13 }}
                />
                <div className="note-footer">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 10 }}>{n.criada}</span>
                    <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)' }}>{chars} char{chars !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {CORES.map(c => (
                      <div
                        key={c.hex}
                        onClick={() => updateNota(n.id, 'cor', c.hex)}
                        title={c.label}
                        style={{
                          width: 13, height: 13, borderRadius: '50%', background: c.hex,
                          border: n.cor === c.hex ? '2px solid var(--accent)' : '1px solid rgba(0,0,0,0.15)',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                    <button
                      onClick={() => deleteNota(n.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 13, padding: '0 2px' }}
                      title={t(lang,'nota.delete')}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
