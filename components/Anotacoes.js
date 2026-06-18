import { useState } from 'react'

const CORES = ['#fff9e6', '#e8f5e9', '#e3f2fd', '#fce4ec', '#f3e5f5', '#ffffff']

export default function Anotacoes({ data, update }) {
  const anotacoes = data.anotacoes || []
  const [busca, setBusca] = useState('')

  const addNota = () => {
    const nova = {
      id: Date.now(),
      titulo: '',
      conteudo: '',
      cor: '#ffffff',
      criada: new Date().toLocaleDateString('pt-BR'),
    }
    update('anotacoes', [nova, ...anotacoes])
  }

  const updateNota = (id, field, value) => {
    update('anotacoes', anotacoes.map(n => n.id === id ? { ...n, [field]: value } : n))
  }

  const deleteNota = (id) => {
    update('anotacoes', anotacoes.filter(n => n.id !== id))
  }

  const filtradas = anotacoes.filter(n =>
    !busca || n.titulo?.toLowerCase().includes(busca.toLowerCase()) || n.conteudo?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Anotações e Ideias</h2>
          <p>Suas notas livres, ideias e organização geral</p>
        </div>
        <button className="btn btn-primary" onClick={addNota}>+ Nova nota</button>
      </div>

      {anotacoes.length > 3 && (
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Buscar nas anotações..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ maxWidth: 320 }}
          />
        </div>
      )}

      {filtradas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
          <p style={{ fontSize: 14 }}>Nenhuma anotação ainda.</p>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={addNota}>Criar primeira nota</button>
        </div>
      ) : (
        <div className="notes-container">
          {filtradas.map(n => (
            <div key={n.id} className="note-card" style={{ background: n.cor }}>
              {/* Título */}
              <input
                type="text"
                value={n.titulo}
                onChange={e => updateNota(n.id, 'titulo', e.target.value)}
                placeholder="Título..."
                style={{ fontWeight: 700, fontSize: 14, border: 'none', background: 'transparent', padding: 0, color: 'var(--text)' }}
              />

              {/* Conteúdo */}
              <textarea
                value={n.conteudo}
                onChange={e => updateNota(n.id, 'conteudo', e.target.value)}
                placeholder="Escreva aqui..."
                style={{ background: 'transparent', border: 'none', padding: 0, minHeight: 90, fontSize: 13 }}
              />

              {/* Rodapé */}
              <div className="note-footer">
                <span>{n.criada}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {/* Seletor de cor */}
                  {CORES.map(c => (
                    <div
                      key={c}
                      onClick={() => updateNota(n.id, 'cor', c)}
                      style={{
                        width: 14, height: 14, borderRadius: '50%', background: c,
                        border: n.cor === c ? '2px solid var(--accent)' : '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                  <button
                    onClick={() => deleteNota(n.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 13, padding: '0 2px' }}
                    title="Excluir nota"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
