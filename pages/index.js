import { useState, useEffect } from 'react'
import Dashboard from '../components/Dashboard'
import Agenda from '../components/Agenda'
import Financeiro from '../components/Financeiro'
import Habitos from '../components/Habitos'
import Metas from '../components/Metas'
import Exercicios from '../components/Exercicios'
import Anotacoes from '../components/Anotacoes'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'agenda', label: 'Agenda', icon: '📅' },
  { id: 'financeiro', label: 'Financeiro', icon: '💰' },
  { id: 'habitos', label: 'Hábitos', icon: '✅' },
  { id: 'metas', label: 'Metas', icon: '🎯' },
  { id: 'exercicios', label: 'Exercícios', icon: '💪' },
  { id: 'anotacoes', label: 'Anotações', icon: '📝' },
]

const INITIAL_DATA = {
  agenda: {},
  financeiro: [],
  habitos: {},
  metas: [
    { id: 1, area: 'Carreira/Estudo', meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
    { id: 2, area: 'Saúde/Bem-estar', meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
    { id: 3, area: 'Financeiro', meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
    { id: 4, area: 'Relacionamentos', meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
    { id: 5, area: 'Pessoal/Hobby', meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
    { id: 6, area: 'Casa/Organização', meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
    { id: 7, area: 'Espiritual', meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
    { id: 8, area: 'Lazer/Viagem', meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
  ],
  exercicios: {
    plano: {
      'Flexão de braço':    { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' },
      'Agachamento':        { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' },
      'Abdominal Crunch':   { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' },
      'Prancha (Plank)':    { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' },
      'Burpee':             { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' },
      'Polichinelo':        { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' },
      'Afundo (Lunge)':     { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' },
    },
    historico: []
  },
  anotacoes: [],
}

export default function Home() {
  const [tab, setTab] = useState('dashboard')
  const [data, setData] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('sp_data')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // merge with initial to add new keys if needed
        setData({ ...INITIAL_DATA, ...parsed })
      } catch {
        setData(INITIAL_DATA)
      }
    } else {
      setData(INITIAL_DATA)
    }
  }, [])

  const save = (newData) => {
    setData(newData)
    localStorage.setItem('sp_data', JSON.stringify(newData))
  }

  const update = (section, value) => {
    const newData = { ...data, [section]: value }
    save(newData)
  }

  const today = new Date()
  const todayStr = today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  if (!data) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
      Carregando...
    </div>
  )

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':   return <Dashboard data={data} setTab={setTab} />
      case 'agenda':      return <Agenda data={data} update={update} />
      case 'financeiro':  return <Financeiro data={data} update={update} />
      case 'habitos':     return <Habitos data={data} update={update} />
      case 'metas':       return <Metas data={data} update={update} />
      case 'exercicios':  return <Exercicios data={data} update={update} />
      case 'anotacoes':   return <Anotacoes data={data} update={update} />
    }
  }

  return (
    <>
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>Centro de Comando</h1>
          <p>Organização pessoal</p>
        </div>
        <nav className="sidebar-nav">
          {TABS.map(t => (
            <div
              key={t.id}
              className={`nav-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="nav-icon">{t.icon}</span>
              {t.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-date">{todayStr}</div>
      </div>

      <main className="main">
        {renderTab()}
      </main>
    </>
  )
}
