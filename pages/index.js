import { useState, useEffect, useRef } from 'react'
import { t } from '../lib/i18n'
import Head from 'next/head'
import Dashboard from '../components/Dashboard'
import Agenda from '../components/Agenda'
import Financeiro from '../components/Financeiro'
import Habitos from '../components/Habitos'
import Metas from '../components/Metas'
import Exercicios from '../components/Exercicios'
import Anotacoes from '../components/Anotacoes'
import { migrarDados, ensureRecorrencias, DEFAULT_CDI_ANUAL, buscarCDIAnualAtual } from '../lib/finance'

const TAB_IDS = [
  { id: 'dashboard',  key: 'tab.dashboard',  icon: '🏠' },
  { id: 'agenda',     key: 'tab.agenda',     icon: '📅' },
  { id: 'financeiro', key: 'tab.financeiro', icon: '💰' },
  { id: 'habitos',    key: 'tab.habitos',    icon: '🔁' },
  { id: 'metas',      key: 'tab.metas',      icon: '🎯' },
  { id: 'exercicios', key: 'tab.exercicios', icon: '🏋️' },
  { id: 'anotacoes',  key: 'tab.anotacoes',  icon: '📝' },
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
  const [lang, setLang] = useState('pt')
  const [showSettings, setShowSettings] = useState(false)
  const [settingsFeedback, setSettingsFeedback] = useState('')
  const [savedIndicator, setSavedIndicator] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notifAsked, setNotifAsked] = useState(false)
  const savedTimerRef = useRef(null)
  const cdiCheckedRef = useRef(false)
  const saveDebounceRef = useRef(null)

  // Carregamento inicial
  useEffect(() => {
    const savedTheme = localStorage.getItem('sp_theme')
    if (savedTheme === 'dark') {
      setDarkMode(true)
      document.documentElement.setAttribute('data-theme', 'dark')
    }
    const savedLang = localStorage.getItem('sp_lang')
    if (savedLang === 'en') setLang('en')
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

  const toggleLang = () => {
    const next = lang === 'pt' ? 'en' : 'pt'
    setLang(next)
    localStorage.setItem('sp_lang', next)
  }

  const toggleSidebar = () => {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    localStorage.setItem('sp_sidebar_collapsed', String(next))
  }

  const save = (newData) => {
    setData(newData)
    // Debounce: persiste no localStorage após 350ms de inatividade
    clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = setTimeout(() => {
      localStorage.setItem('sp_data', JSON.stringify(newData))
    }, 350)
    // Indicador visual
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
    setSettingsFeedback(t(lang, 'backupOk'))
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
        setSettingsFeedback(t(lang, 'backupRestored'))
        setTimeout(() => setSettingsFeedback(''), 4000)
      } catch {
        setSettingsFeedback(t(lang, 'backupInvalid'))
        setTimeout(() => setSettingsFeedback(''), 3000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const TABS = TAB_IDS.map(t2 => ({ ...t2, label: t(lang, t2.key) }))

  const today = new Date()
  const locale = lang === 'en' ? 'en-US' : 'pt-BR'
  const todayDia = today.getDate()
  const todayMes = today.toLocaleDateString(locale, { month: 'short' }).replace('.', '')
  const todayWeekday = today.toLocaleDateString(locale, { weekday: 'long' })

  if (!data) {
    return (
      <div style={{
        display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #f9f7f4 0%, #f0ebe3 100%)',
        flexDirection: 'column', gap: 20,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'linear-gradient(135deg, #c9a96e, #a8803e)',
          boxShadow: '0 8px 24px rgba(201,169,110,0.4)',
          animation: 'splashPulse 1.4s ease-in-out infinite',
        }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 15, fontWeight: 600, color: '#2a2520', letterSpacing: '-0.2px' }}>
            {t(lang, 'appName')}
          </div>
          <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, color: '#9a8f85', marginTop: 4 }}>
            {t(lang, 'loading')}
          </div>
        </div>
        <style>{`
          @keyframes splashPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(0.9); opacity: 0.7; }
          }
        `}</style>
      </div>
    )
  }

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':  return <Dashboard  data={data} update={update} setTab={setTab} lang={lang} />
      case 'agenda':     return <Agenda     data={data} update={update} lang={lang} />
      case 'financeiro': return <Financeiro data={data} update={update} lang={lang} />
      case 'habitos':    return <Habitos    data={data} update={update} lang={lang} />
      case 'metas':      return <Metas      data={data} update={update} lang={lang} />
      case 'exercicios': return <Exercicios data={data} update={update} lang={lang} />
      case 'anotacoes':  return <Anotacoes  data={data} update={update} lang={lang} />
      default:           return <Dashboard  data={data} update={update} setTab={setTab} lang={lang} />
    }
  }

  return (
    <>
      <Head>
        <title>{t(lang, 'appName')}</title>
        <meta name="description" content="Sistema de organização pessoal" />
      </Head>

      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Botão colapsar */}
        <button
          className="sidebar-collapse-btn"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? t(lang, 'expandSidebar') : t(lang, 'collapseSidebar')}
        >
          {sidebarCollapsed ? '›' : '‹'}
        </button>

        <div className="sidebar-header">
          <h1>{t(lang, 'appName')}</h1>
          <p>{t(lang, 'appSub')}</p>
        </div>

        <nav className="sidebar-nav">
          {TABS.map((t, idx) => (
            <div
              key={t.id}
              className={`nav-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
              title={sidebarCollapsed ? `${t.label} (${t(lang, 'keyHint')} ${idx + 1})` : `${t(lang, 'keyHint')} ${idx + 1}`}
            >
              <span className="nav-icon">{t.icon}</span>
              <span className="nav-label">{t.label}</span>
            </div>
          ))}
        </nav>

        {/* Ícones rápidos no modo colapsado */}
        {sidebarCollapsed && (
          <div className="sidebar-collapsed-actions">
            <button
              className="sidebar-collapsed-btn"
              onClick={toggleDark}
              title={darkMode ? t(lang, 'lightMode') : t(lang, 'darkMode')}
            >
              {darkMode ? '☀' : '☽'}
            </button>
            <button
              className="sidebar-collapsed-btn"
              onClick={() => { setSidebarCollapsed(false); setShowSettings(true) }}
              title="Configurações"
            >
              ⚙
            </button>
          </div>
        )}

        {/* Painel de configurações */}
        <div className="sidebar-settings">
          <button className="settings-btn" onClick={() => setShowSettings(s => !s)}>
            {t(lang, 'settings')}
          </button>
          {showSettings && (
            <div className="settings-panel">
              {settingsFeedback && <div className="settings-feedback">{settingsFeedback}</div>}

              <div className="settings-section">
                <div className="settings-label">{t(lang, 'appearance')}</div>
                <button className="settings-action-btn" onClick={toggleDark}>
                  {darkMode ? t(lang, 'lightMode') : t(lang, 'darkMode')}
                </button>
              </div>

              <div className="settings-section">
                <div className="settings-label">{t(lang, 'language')}</div>
                <button className="settings-action-btn" onClick={toggleLang}>
                  {lang === 'pt' ? '🇺🇸 English' : '🇧🇷 Português'}
                </button>
              </div>

              <div className="settings-section">
                <div className="settings-label">{t(lang, 'dataSection')}</div>
                <button className="settings-action-btn" onClick={exportBackup}>
                  {t(lang, 'exportBackup')}
                </button>
                <label className="settings-action-btn" style={{ cursor: 'pointer', textAlign: 'center' }}>
                  {t(lang, 'importBackup')}
                  <input type="file" accept=".json" onChange={importBackup} style={{ display: 'none' }} />
                </label>
              </div>

              <div className="settings-section">
                <div className="settings-label">{t(lang, 'currentCDI')}</div>
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
                <div className="settings-label">{t(lang, 'keyHint')}s</div>
                <div className="settings-shortcuts">
                  {TABS.map((tab2, i) => (
                    <div key={tab2.id} className="shortcut-row">
                      <kbd>{i + 1}</kbd> {tab2.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-date">
          <div className="sidebar-date-number">{todayDia}</div>
          <div className="sidebar-date-info">
            <span className="sidebar-date-month">{todayMes}</span>
            <span className="sidebar-date-weekday">{todayWeekday}</span>
          </div>
        </div>
      </div>

      <main className="main" data-section={tab}>
        <div className="page-fade-in" key={tab}>
          {renderTab()}
        </div>
      </main>

      {/* Toast de salvo */}
      {savedIndicator && (
        <div className="save-indicator">
          <span className="save-indicator-icon">✓</span>
          {t(lang, 'saved')}
        </div>
      )}
    </>
  )
}
