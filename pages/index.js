import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Dashboard from '../components/Dashboard'
import Agenda from '../components/Agenda'
import Financeiro from '../components/Financeiro'
import Habitos from '../components/Habitos'
import Metas from '../components/Metas'
import Exercicios from '../components/Exercicios'
import Anotacoes from '../components/Anotacoes'
import { migrarDados, ensureRecorrencias, DEFAULT_CDI_ANUAL, buscarCDIAnualAtual } from '../lib/finance'

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',   icon: '🏠' },
  { id: 'agenda',     label: 'Agenda',       icon: '📅' },
  { id: 'financeiro', label: 'Financeiro',   icon: '💰' },
  { id: 'habitos',    label: 'Hábitos',      icon: '🔁' },
  { id: 'metas',      label: 'Metas',        icon: '🎯' },
  { id: 'exercicios', label: 'Exercícios',   icon: '🏋️' },
  { id: 'anotacoes',  label: 'Anotações',    icon: '📝' },
]

const INITIAL_DATA = {
  agenda: {},
  financeiro: [],
  investimentos: [],
  cartoes: [],
  configCDI: { taxaAnual: DEFAULT_CDI_ANUAL, atualizadoEm: '', manual: true, dataReferencia: '' },
  habitosLista: [
    'Beber 2L de água',
    'Exercício físico',
    'Leitura 30 min',
    'Meditação',
    'Dormir até 23h',
    'Comer saudável',
  ],
  habitos: {},
  metas: [
    { id: 1, area: 'Carreira/Estudo',    meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
    { id: 2, area: 'Saúde/Bem-estar',    meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
    { id: 3, area: 'Financeiro',         meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
    { id: 4, area: 'Relacionamentos',    meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
    { id: 5, area: 'Pessoal/Hobby',      meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
    { id: 6, area: 'Casa/Organização',   meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
    { id: 7, area: 'Espiritual',         meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
    { id: 8, area: 'Lazer/Viagem',       meta: '', porque: '', prazo: '', progresso: 0, status: 'Pendente', acoes: '', resultado: '' },
  ],
  exercicios: {
    plano: {
      'Flexão de braço': { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' },
      'Agachamento':     { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' },
      'Abdominal Crunch':{ seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' },
      'Prancha (Plank)': { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' },
      'Burpee':          { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' },
      'Polichinelo':     { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' },
      'Afundo (Lunge)':  { seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false, series: '', reps: '', obs: '' },
    },
    historico: []
  },
  anotacoes: [],
  orcamentoCategoria: {},
}

export default function Home() {
  const [tab, setTab] = useState('dashboard')
  const [data, setData] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsFeedback, setSettingsFeedback] = useState('')
  const [savedIndicator, setSavedIndicator] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notifAsked, setNotifAsked] = useState(false)
  const savedTimerRef = useRef(null)
  const cdiCheckedRef = useRef(false)

  // Carregamento inicial
  useEffect(() => {
    const savedTheme = localStorage.getItem('sp_theme')
    if (savedTheme === 'dark') {
      setDarkMode(true)
      document.documentElement.setAttribute('data-theme', 'dark')
    }
    const savedCollapsed = localStorage.getItem('sp_sidebar_collapsed')
    if (savedCollapsed === 'true') setSidebarCollapsed(true)

    const saved = localStorage.getItem('sp_data')
    let nextData
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        nextData = { ...INITIAL_DATA, ...parsed }
        if (!Array.isArray(nextData.habitosLista)) nextData.habitosLista = INITIAL_DATA.habitosLista
        if (!nextData.orcamentoCategoria) nextData.orcamentoCategoria = {}
      } catch {
        nextData = INITIAL_DATA
      }
    } else {
      nextData = INITIAL_DATA
    }
    nextData = migrarDados(nextData)
    nextData.financeiro = ensureRecorrencias(nextData.financeiro)
    setData(nextData)
    localStorage.setItem('sp_data', JSON.stringify(nextData))
  }, [])

  // CDI automático: busca uma vez por dia ao carregar
  useEffect(() => {
    if (!data || cdiCheckedRef.current) return
    cdiCheckedRef.current = true
    const hoje = new Date().toISOString().split('T')[0]
    const configCDI = data.configCDI || {}
    if (configCDI.atualizadoEm === hoje) return // já buscou hoje
    buscarCDIAnualAtual()
      .then(({ taxaAnual, dataReferencia }) => {
        const newConfig = { taxaAnual, atualizadoEm: hoje, manual: false, dataReferencia }
        setData(d => {
          const next = { ...d, configCDI: newConfig }
          localStorage.setItem('sp_data', JSON.stringify(next))
          return next
        })
      })
      .catch(() => {}) // silencioso — mantém o valor salvo
  }, [data])

  // Notificações de contas a vencer (solicita permissão uma vez)
  useEffect(() => {
    if (!data || notifAsked || typeof window === 'undefined') return
    if (!('Notification' in window)) return
    setNotifAsked(true)

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const em3dias = new Date(hoje); em3dias.setDate(em3dias.getDate() + 3)
    const urgentes = (data.financeiro || []).filter(l => {
      if (l.tipo !== 'Despesa' || l.status !== 'Pendente' || !l.vencimento) return false
      const venc = new Date(l.vencimento + 'T00:00:00')
      return venc >= hoje && venc <= em3dias
    })
    if (urgentes.length === 0) return

    const hojeStr = hoje.toISOString().split('T')[0]
    const lastNotif = localStorage.getItem('sp_last_notif')
    if (lastNotif === hojeStr) return // já notificou hoje

    Notification.requestPermission().then(perm => {
      if (perm !== 'granted') return
      localStorage.setItem('sp_last_notif', hojeStr)
      urgentes.slice(0, 5).forEach(l => {
        const venc = new Date(l.vencimento + 'T00:00:00')
        const diffDias = Math.round((venc - hoje) / 86400000)
        const bodyText = diffDias === 0 ? 'Vence hoje!' : `Vence em ${diffDias} dia${diffDias > 1 ? 's' : ''}`
        new Notification(`💰 ${l.descricao}`, {
          body: `${bodyText} · ${Number(l.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
          tag: `conta-${l.id}`,
        })
      })
    })
  }, [data, notifAsked])

  // Atalhos de teclado: 1–7 trocam de aba
  useEffect(() => {
    const handler = (e) => {
      const active = document.activeElement
      const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')
      if (isInput) return
      const map = { '1': 'dashboard', '2': 'agenda', '3': 'financeiro', '4': 'habitos', '5': 'metas', '6': 'exercicios', '7': 'anotacoes' }
      if (map[e.key]) setTab(map[e.key])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const toggleDark = () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('sp_theme', next ? 'dark' : 'light')
  }

  const toggleSidebar = () => {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    localStorage.setItem('sp_sidebar_collapsed', String(next))
  }

  const save = (newData) => {
    setData(newData)
    localStorage.setItem('sp_data', JSON.stringify(newData))
    // Indicador de salvo
    clearTimeout(savedTimerRef.current)
    setSavedIndicator(true)
    savedTimerRef.current = setTimeout(() => setSavedIndicator(false), 1500)
  }

  const update = (section, value) => {
    let newData = typeof section === 'object'
      ? { ...data, ...section }
      : { ...data, [section]: value }
    if (typeof section === 'string' && section === 'financeiro') {
      newData = { ...newData, financeiro: ensureRecorrencias(newData.financeiro) }
    }
    save(newData)
  }

  const exportBackup = () => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-sistema-pessoal-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    setSettingsFeedback('Backup exportado! ✅')
    setTimeout(() => setSettingsFeedback(''), 3000)
  }

  const importBackup = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        const restored = migrarDados({ ...INITIAL_DATA, ...parsed })
        restored.financeiro = ensureRecorrencias(restored.financeiro)
        save(restored)
        setSettingsFeedback('Dados restaurados! ✅')
        setTimeout(() => setSettingsFeedback(''), 4000)
      } catch {
        setSettingsFeedback('Arquivo inválido. Verifique o JSON.')
        setTimeout(() => setSettingsFeedback(''), 3000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const today = new Date()
  const todayStr = today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  if (!data) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⚡</div>
          <div style={{ fontSize: 14 }}>Carregando...</div>
        </div>
      </div>
    )
  }

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':  return <Dashboard  data={data} update={update} setTab={setTab} />
      case 'agenda':     return <Agenda     data={data} update={update} />
      case 'financeiro': return <Financeiro data={data} update={update} />
      case 'habitos':    return <Habitos    data={data} update={update} />
      case 'metas':      return <Metas      data={data} update={update} />
      case 'exercicios': return <Exercicios data={data} update={update} />
      case 'anotacoes':  return <Anotacoes  data={data} update={update} />
      default:           return <Dashboard  data={data} update={update} setTab={setTab} />
    }
  }

  return (
    <>
      <Head>
        <title>Centro de Comando</title>
        <meta name="description" content="Sistema de organização pessoal" />
      </Head>

      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Botão colapsar */}
        <button
          className="sidebar-collapse-btn"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {sidebarCollapsed ? '›' : '‹'}
        </button>

        <div className="sidebar-header">
          <h1>Centro de Comando</h1>
          <p>Organização pessoal</p>
        </div>

        <nav className="sidebar-nav">
          {TABS.map((t, idx) => (
            <div
              key={t.id}
              className={`nav-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
              title={sidebarCollapsed ? `${t.label} (tecla ${idx + 1})` : `Tecla ${idx + 1}`}
            >
              <span className="nav-icon">{t.icon}</span>
              <span className="nav-label">{t.label}</span>
            </div>
          ))}
        </nav>

        {/* Painel de configurações */}
        <div className="sidebar-settings">
          <button className="settings-btn" onClick={() => setShowSettings(s => !s)}>
            ⚙️ Configurações
          </button>
          {showSettings && (
            <div className="settings-panel">
              {settingsFeedback && <div className="settings-feedback">{settingsFeedback}</div>}

              <div className="settings-section">
                <div className="settings-label">Aparência</div>
                <button className="settings-action-btn" onClick={toggleDark}>
                  {darkMode ? '☀️ Modo claro' : '🌙 Modo escuro'}
                </button>
              </div>

              <div className="settings-section">
                <div className="settings-label">Dados</div>
                <button className="settings-action-btn" onClick={exportBackup}>
                  📤 Exportar backup
                </button>
                <label className="settings-action-btn" style={{ cursor: 'pointer', textAlign: 'center' }}>
                  📥 Importar backup
                  <input type="file" accept=".json" onChange={importBackup} style={{ display: 'none' }} />
                </label>
              </div>

              <div className="settings-section">
                <div className="settings-label">CDI atual</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', padding: '4px 0' }}>
                  {Number(data.configCDI?.taxaAnual || 0).toFixed(2)}% a.a.
                  {data.configCDI?.atualizadoEm && (
                    <span style={{ fontSize: 10, display: 'block', marginTop: 2, opacity: 0.6 }}>
                      Atualizado: {data.configCDI.atualizadoEm}
                    </span>
                  )}
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-label">Atalhos de teclado</div>
                <div className="settings-shortcuts">
                  {TABS.map((t, i) => (
                    <div key={t.id} className="shortcut-row">
                      <kbd>{i + 1}</kbd> {t.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-date">{todayStr}</div>
      </div>

      <main className="main">
        <div className="page-fade-in" key={tab}>
          {renderTab()}
        </div>
      </main>

      {/* Toast de salvo */}
      {savedIndicator && (
        <div className="save-indicator">✓ Salvo</div>
      )}
    </>
  )
}
