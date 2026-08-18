import { useState } from 'react'
import TrabalhoDashboard from './TrabalhoDashboard'
import TrabalhoProjetos from './TrabalhoProjetos'

const SUBTABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'projetos',  label: '📁 Projetos'  },
]

export default function Trabalho({ data, update, lang = 'pt' }) {
  const [sub, setSub] = useState('dashboard')
  const [projetoSelecionado, setProjetoSelecionado] = useState(null)

  return (
    <>
      <div className="subtab-nav">
        {SUBTABS.map(st => (
          <button
            key={st.id}
            className={`subtab ${sub === st.id ? 'active' : ''}`}
            onClick={() => { setSub(st.id); setProjetoSelecionado(null) }}
          >
            {st.label}
          </button>
        ))}
      </div>
      {sub === 'dashboard' && (
        <TrabalhoDashboard
          data={data}
          onAbrirProjeto={(proj) => { setSub('projetos'); setProjetoSelecionado(proj.id) }}
        />
      )}
      {sub === 'projetos' && (
        <TrabalhoProjetos
          data={data}
          update={update}
          lang={lang}
          projetoSelecionadoId={projetoSelecionado}
          onVoltar={() => setProjetoSelecionado(null)}
        />
      )}
    </>
  )
}
