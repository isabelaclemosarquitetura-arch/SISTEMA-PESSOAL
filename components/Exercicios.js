import { useState, useEffect, useRef } from 'react'

// ── Constantes ──
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
const DIAS_LABELS = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo' }

// Rotina pré-definida
const ROTINA_PADRAO = {
  seg: {
    nome: 'Inferior A — Foco em Glúteos',
    exercicios: [
      { id: 'inf-a-1', nome: 'Elevação Pélvica no Solo', grupo: 'Glúteos', series: 3, reps: '15', descanso: 30, descricao: 'Deite de costas, joelhos dobrados, pés no chão. Eleve o quadril contraindo os glúteos. Segure 2s no topo e desça controlado.', gif: 'https://i.pinimg.com/originals/d9/3e/2c/d93e2c19b1b9e78c6a5f4e7d1c8b2a45.gif', concluido: false },
      { id: 'inf-a-2', nome: 'Elevação Pélvica Unilateral', grupo: 'Glúteos', series: 3, reps: '12 cada', descanso: 30, descricao: 'Igual à elevação pélvica, mas com uma perna estendida. Foca em um lado de cada vez.', gif: '', concluido: false },
      { id: 'inf-a-3', nome: 'Hidrante', grupo: 'Glúteos / Abdutores', series: 3, reps: '15 cada', descanso: 20, descricao: 'Em quatro apoios, eleve o joelho lateralmente até a altura do quadril, mantendo o joelho dobrado a 90°.', gif: '', concluido: false },
      { id: 'inf-a-4', nome: 'Concha', grupo: 'Glúteos / Abdutores', series: 3, reps: '15 cada', descanso: 20, descricao: 'Deitada de lado com joelhos dobrados e pés juntos. Abra o joelho de cima como uma concha, sem mover o quadril.', gif: '', concluido: false },
      { id: 'inf-a-5', nome: 'Elevação Lateral de Perna', grupo: 'Abdutores / Glúteos', series: 3, reps: '20 cada', descanso: 20, descricao: 'Deitada de lado, eleve a perna de cima de forma controlada. Mantenha o pé em flexão.', gif: '', concluido: false },
    ]
  },
  ter: {
    nome: 'Superior A',
    exercicios: [
      { id: 'sup-a-1', nome: 'Flexão com Joelhos Apoiados', grupo: 'Peito / Tríceps', series: 3, reps: '10', descanso: 45, descricao: 'Posição de flexão modificada com joelhos no chão. Desça o peito até quase tocar o chão e suba.', gif: '', concluido: false },
      { id: 'sup-a-2', nome: 'Tríceps na Cadeira', grupo: 'Tríceps', series: 3, reps: '12', descanso: 30, descricao: 'Sente na beira de uma cadeira, mãos na borda. Desça o corpo dobrando os cotovelos e suba.', gif: '', concluido: false },
      { id: 'sup-a-3', nome: 'Superman', grupo: 'Lombar / Glúteos', series: 3, reps: '15', descanso: 20, descricao: 'Deite de barriga para baixo. Eleve braços e pernas simultaneamente como se estivesse voando.', gif: '', concluido: false },
      { id: 'sup-a-4', nome: 'Remada com Mochila', grupo: 'Costas / Bíceps', series: 3, reps: '12 cada', descanso: 30, descricao: 'Incline o tronco, segure uma mochila (ou objeto pesado) e puxe em direção ao quadril, cotovelo para trás.', gif: '', concluido: false },
      { id: 'sup-a-5', nome: 'Elevação Lateral', grupo: 'Ombros', series: 3, reps: '12', descanso: 30, descricao: 'Com halteres ou garrafinhas d\'água, eleve os braços lateralmente até a altura dos ombros.', gif: '', concluido: false },
      { id: 'sup-a-6', nome: 'Hidrante', grupo: 'Glúteos / Abdutores', series: 2, reps: '15 cada', descanso: 20, descricao: 'Em quatro apoios, eleve o joelho lateralmente até a altura do quadril.', gif: '', concluido: false },
      { id: 'sup-a-7', nome: 'Concha', grupo: 'Glúteos / Abdutores', series: 2, reps: '15 cada', descanso: 20, descricao: 'Deitada de lado, abra o joelho de cima como uma concha.', gif: '', concluido: false },
    ]
  },
  qua: {
    nome: 'Inferior B',
    exercicios: [
      { id: 'inf-b-1', nome: 'Agachamento Sumô', grupo: 'Quadríceps / Glúteos', series: 3, reps: '15', descanso: 40, descricao: 'Pés afastados além dos ombros, pontas dos pés viradas para fora. Agache mantendo o tronco ereto.', gif: '', concluido: false },
      { id: 'inf-b-2', nome: 'Afundo', grupo: 'Quadríceps / Glúteos', series: 3, reps: '12 cada', descanso: 40, descricao: 'Dê um passo à frente e desça o joelho de trás próximo ao chão. Mantenha o tronco ereto.', gif: '', concluido: false },
      { id: 'inf-b-3', nome: 'Cadeira Invisível', grupo: 'Quadríceps', series: 3, reps: '40s', descanso: 30, descricao: 'Apoie as costas na parede, desça até 90° e segure a posição pelo tempo determinado.', gif: '', concluido: false },
      { id: 'inf-b-4', nome: 'Elevação de Panturrilha', grupo: 'Panturrilha', series: 3, reps: '20', descanso: 20, descricao: 'Em pé, suba na ponta dos pés e desça controlado. Pode fazer em um degrau para maior amplitude.', gif: '', concluido: false },
      { id: 'inf-b-5', nome: 'Prancha', grupo: 'Core', series: 3, reps: '30s', descanso: 30, descricao: 'Apoie nos antebraços e pontas dos pés. Mantenha o corpo reto como uma tábua.', gif: '', concluido: false },
    ]
  },
  qui: {
    nome: 'Superior B',
    exercicios: [
      { id: 'sup-b-1', nome: 'Flexão Fechada', grupo: 'Tríceps / Peito', series: 3, reps: '10', descanso: 45, descricao: 'Flexão com mãos próximas, abaixo do peito. Foca mais no tríceps.', gif: '', concluido: false },
      { id: 'sup-b-2', nome: 'Desenvolvimento de Ombro', grupo: 'Ombros', series: 3, reps: '12', descanso: 30, descricao: 'Com garrafinhas ou halteres, sente e empurre acima da cabeça. Desça controlado.', gif: '', concluido: false },
      { id: 'sup-b-3', nome: 'Crucifixo com Garrafa', grupo: 'Peito', series: 3, reps: '12', descanso: 30, descricao: 'Deitada, segure garrafinhas com braços levemente dobrados. Abra os braços e feche como um abraço.', gif: '', concluido: false },
      { id: 'sup-b-4', nome: 'Superman com Alternância', grupo: 'Lombar / Glúteos', series: 3, reps: '12 cada', descanso: 20, descricao: 'Deite de barriga para baixo. Eleve o braço direito e perna esquerda juntos, alterne.', gif: '', concluido: false },
      { id: 'sup-b-5', nome: 'Bíceps com Garrafa', grupo: 'Bíceps', series: 3, reps: '12', descanso: 30, descricao: 'Segure garrafinhas com a palma para cima. Dobre o cotovelo trazendo a garrafa ao ombro.', gif: '', concluido: false },
    ]
  },
  sex: {
    nome: 'Inferior C',
    exercicios: [
      { id: 'inf-c-1', nome: 'Agachamento Búlgaro', grupo: 'Quadríceps / Glúteos', series: 3, reps: '10 cada', descanso: 45, descricao: 'Pé traseiro apoiado em cadeira. Desça em afundo profundo. Mantém tronco ereto.', gif: '', concluido: false },
      { id: 'inf-c-2', nome: 'Stiff', grupo: 'Posterior / Glúteos', series: 3, reps: '15', descanso: 40, descricao: 'Com ou sem carga, incline o tronco à frente mantendo as pernas quase estendidas. Sinta o alongamento.', gif: '', concluido: false },
      { id: 'inf-c-3', nome: 'Agachamento Isométrico', grupo: 'Quadríceps', series: 3, reps: '45s', descanso: 30, descricao: 'Agache até 90° e segure a posição. Também chamado de cadeira na parede.', gif: '', concluido: false },
      { id: 'inf-c-4', nome: 'Abdução em Pé', grupo: 'Abdutores / Glúteos', series: 3, reps: '20 cada', descanso: 20, descricao: 'Em pé, apoie em uma parede. Eleve a perna lateralmente de forma controlada.', gif: '', concluido: false },
      { id: 'inf-c-5', nome: 'Abdução Deitada', grupo: 'Abdutores', series: 3, reps: '20 cada', descanso: 20, descricao: 'Deitada de lado, eleve a perna superior sem dobrar o joelho.', gif: '', concluido: false },
    ]
  },
  sab: {
    nome: 'Dança / Atividade Aeróbica',
    exercicios: [
      { id: 'aerob-1', nome: 'Dança Livre', grupo: 'Cardio / Corpo todo', series: 1, reps: '30 min', descanso: 0, descricao: 'Dance ao som das suas músicas favoritas! Mova todo o corpo, divirta-se e sue bastante.', gif: '', concluido: false },
      { id: 'aerob-2', nome: 'Caminhada Rápida', grupo: 'Cardio', series: 1, reps: '20-30 min', descanso: 0, descricao: 'Caminhe em ritmo acelerado, mantendo o coração elevado. Pode ser ao ar livre ou em casa.', gif: '', concluido: false },
    ]
  },
  dom: {
    nome: 'Yoga / Mobilidade / Recuperação',
    exercicios: [
      { id: 'yoga-1', nome: 'Alongamento de Quadril', grupo: 'Mobilidade', series: 2, reps: '30s cada', descanso: 0, descricao: 'Posição de pombo ou borboleta. Respire profundamente e relaxe na posição.', gif: '', concluido: false },
      { id: 'yoga-2', nome: 'Gato-Vaca', grupo: 'Coluna / Mobilidade', series: 2, reps: '10', descanso: 0, descricao: 'Em quatro apoios, alterne entre arqueiar e curvar a coluna no ritmo da respiração.', gif: '', concluido: false },
      { id: 'yoga-3', nome: 'Torção Deitada', grupo: 'Coluna / Mobilidade', series: 2, reps: '30s cada', descanso: 0, descricao: 'Deitada de costas, abra os braços em T e leve os joelhos para um lado. Alterne.', gif: '', concluido: false },
      { id: 'yoga-4', nome: 'Relaxamento (Savasana)', grupo: 'Recuperação', series: 1, reps: '5-10 min', descanso: 0, descricao: 'Deite de costas, olhos fechados, respire profundamente. Deixe o corpo relaxar completamente.', gif: '', concluido: false },
    ]
  },
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDiaSemana(date = new Date()) {
  return DIAS_SEMANA[date.getDay()]
}

function getDiasDoMes(year, month) {
  const dias = []
  const primeiro = new Date(year, month, 1)
  const ultimo = new Date(year, month + 1, 0)
  for (let d = 1; d <= ultimo.getDate(); d++) {
    dias.push(new Date(year, month, d))
  }
  return dias
}

// Cronômetro
function Cronometro({ segundos, onReset }) {
  const [restante, setRestante] = useState(segundos)
  const [rodando, setRodando] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => { setRestante(segundos); setRodando(false) }, [segundos])

  useEffect(() => {
    if (rodando && restante > 0) {
      intervalRef.current = setInterval(() => setRestante(r => {
        if (r <= 1) { clearInterval(intervalRef.current); setRodando(false); return 0 }
        return r - 1
      }), 1000)
    } else clearInterval(intervalRef.current)
    return () => clearInterval(intervalRef.current)
  }, [rodando])

  const pct = Math.round(((segundos - restante) / segundos) * 100)
  const cor = restante === 0 ? 'var(--green)' : restante <= 10 ? 'var(--red)' : 'var(--accent)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px 20px', background: 'var(--bg)', borderRadius: 14, minWidth: 180 }}>
      <div style={{ fontSize: 36, fontWeight: 800, color: cor, fontFamily: 'monospace' }}>
        {String(Math.floor(restante / 60)).padStart(2, '0')}:{String(restante % 60).padStart(2, '0')}
      </div>
      <div className="chart-track" style={{ height: 6, width: '100%' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 4, transition: 'width 0.5s, background 0.5s' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setRodando(r => !r)}>
          {rodando ? '⏸ Pausar' : restante === 0 ? '✓ Fim!' : '▶ Iniciar'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setRestante(segundos); setRodando(false) }}>↺</button>
      </div>
      {restante === 0 && <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>🎉 Descansou!</div>}
    </div>
  )
}

// Modal "Como fazer"
function ModalComoFazer({ exercicio, onFechar }) {
  const [cronometroAtivo, setCronometroAtivo] = useState(false)

  if (!exercicio) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onFechar}>
      <div style={{ background: 'var(--card)', borderRadius: 20, padding: '28px 32px', maxWidth: 540, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 20 }}>{exercicio.nome}</h3>
            <span className="muted-small">{exercicio.grupo}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onFechar}>✕ Fechar</button>
        </div>

        {/* GIF / demonstração */}
        {exercicio.gif && (
          <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', background: 'var(--bg)', display: 'flex', justifyContent: 'center' }}>
            <img src={exercicio.gif} alt={exercicio.nome} style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 12 }}
              onError={e => { e.target.style.display = 'none' }} />
          </div>
        )}
        {!exercicio.gif && (
          <div style={{ marginBottom: 16, borderRadius: 12, background: 'var(--bg)', padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 4 }}>🏋️</div>
            <div style={{ fontSize: 12 }}>Sem demonstração visual</div>
          </div>
        )}

        {/* Instrução */}
        <div style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
          {exercicio.descricao}
        </div>

        {/* Séries × Repetições */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg)', borderRadius: 10, padding: '10px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{exercicio.series}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Séries</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg)', borderRadius: 10, padding: '10px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{exercicio.reps}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Repetições</div>
          </div>
          {exercicio.descanso > 0 && (
            <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg)', borderRadius: 10, padding: '10px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--yellow)' }}>{exercicio.descanso}s</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Descanso</div>
            </div>
          )}
        </div>

        {/* Cronômetro */}
        {exercicio.descanso > 0 && (
          <div>
            {!cronometroAtivo ? (
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setCronometroAtivo(true)}>
                ⏱ Iniciar descanso ({exercicio.descanso}s)
              </button>
            ) : (
              <Cronometro segundos={exercicio.descanso} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Exercicios({ data, update, lang = 'pt' }) {
  const hoje = new Date()
  const hojeISO = toISO(hoje)
  const diaSemanaHoje = getDiaSemana(hoje)

  const exerciciosData = data.exercicios || {}
  const historico = exerciciosData.historico || []

  // Rotina: usa a pré-definida se não houver personalizada
  const rotina = exerciciosData.rotina || ROTINA_PADRAO

  const [diaAtivo, setDiaAtivo] = useState(diaSemanaHoje)
  const [modalExercicio, setModalExercicio] = useState(null)
  const [subView, setSubView] = useState('treino') // 'treino' | 'historico' | 'stats' | 'calendario'
  const [feedback, setFeedback] = useState('')
  const [anoCalendario, setAnoCalendario] = useState(hoje.getFullYear())
  const [mesCalendario, setMesCalendario] = useState(hoje.getMonth())

  const showFeedback = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(''), 2000) }

  const treinoDia = rotina[diaAtivo] || { nome: 'Descanso', exercicios: [] }

  // Exercícios do dia com estado de concluído (do historico de hoje)
  const treinoHoje = historico.find(h => h.data === hojeISO && h.dia === diaSemanaHoje)
  const exerciciosConcluidos = treinoHoje?.exerciciosConcluidos || []

  const isExercicioConcluido = (exId) => exerciciosConcluidos.includes(exId)

  const toggleExercicio = (exId) => {
    const novosConcluidos = exerciciosConcluidos.includes(exId)
      ? exerciciosConcluidos.filter(id => id !== exId)
      : [...exerciciosConcluidos, exId]

    const totalExercicios = treinoDia.exercicios.length
    const todosFeitos = novosConcluidos.length === totalExercicios && totalExercicios > 0

    const novoHistorico = historico.filter(h => !(h.data === hojeISO && h.dia === diaSemanaHoje))
    if (novosConcluidos.length > 0) {
      novoHistorico.push({
        id: `${hojeISO}-${diaSemanaHoje}`,
        data: hojeISO,
        dia: diaSemanaHoje,
        treino: treinoDia.nome,
        exerciciosConcluidos: novosConcluidos,
        totalExercicios,
        completo: todosFeitos,
      })
    }
    update('exercicios', { ...exerciciosData, historico: novoHistorico })
    if (todosFeitos) showFeedback('🎉 Treino completo!')
  }

  const marcarTreinoCompleto = () => {
    const totalExercicios = treinoDia.exercicios.length
    if (totalExercicios === 0) return
    const todosIds = treinoDia.exercicios.map(e => e.id)
    const novoHistorico = historico.filter(h => !(h.data === hojeISO && h.dia === diaSemanaHoje))
    novoHistorico.push({
      id: `${hojeISO}-${diaSemanaHoje}`,
      data: hojeISO,
      dia: diaSemanaHoje,
      treino: treinoDia.nome,
      exerciciosConcluidos: todosIds,
      totalExercicios,
      completo: true,
    })
    update('exercicios', { ...exerciciosData, historico: novoHistorico })
    showFeedback('🔥 Treino marcado como completo!')
  }

  // ── Estatísticas ──
  const streakAtual = (() => {
    let count = 0
    const cursor = new Date(hoje); cursor.setHours(0, 0, 0, 0)
    for (let i = 0; i < 90; i++) {
      const isoC = toISO(cursor)
      const diaC = getDiaSemana(cursor)
      const temTreino = rotina[diaC]?.exercicios?.length > 0
      if (!temTreino) { cursor.setDate(cursor.getDate() - 1); continue }
      const fez = historico.some(h => h.data === isoC && (h.completo || h.exerciciosConcluidos?.length > 0))
      if (fez) count++
      else if (i > 0) break
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  })()

  const maiorStreak = (() => {
    if (historico.length === 0) return 0
    const datas = [...new Set(historico.filter(h => h.exerciciosConcluidos?.length > 0).map(h => h.data))].sort()
    let max = 0, atual = 1
    for (let i = 1; i < datas.length; i++) {
      const prev = new Date(datas[i - 1] + 'T00:00:00')
      const cur = new Date(datas[i] + 'T00:00:00')
      const diff = Math.round((cur - prev) / 86400000)
      if (diff === 1) { atual++; max = Math.max(max, atual) } else atual = 1
    }
    return Math.max(max, datas.length > 0 ? 1 : 0)
  })()

  const treinosMes = historico.filter(h => {
    return h.data?.startsWith(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`) && h.exerciciosConcluidos?.length > 0
  }).length

  const treinosSemana = (() => {
    const seg = new Date(hoje); seg.setHours(0, 0, 0, 0)
    const day = seg.getDay()
    seg.setDate(seg.getDate() + (day === 0 ? -6 : 1 - day))
    return historico.filter(h => {
      if (!h.data || !h.exerciciosConcluidos?.length) return false
      const d = new Date(h.data + 'T00:00:00')
      const fim = new Date(seg); fim.setDate(fim.getDate() + 6); fim.setHours(23, 59, 59)
      return d >= seg && d <= fim
    }).length
  })()

  // ── Calendário ──
  const diasMes = getDiasDoMes(anoCalendario, mesCalendario)
  const primeiroDia = diasMes[0].getDay()

  const statusDia = (dateISO) => {
    const diaS = getDiaSemana(new Date(dateISO + 'T00:00:00'))
    const temRotina = rotina[diaS]?.exercicios?.length > 0
    if (!temRotina) return 'rest'
    const h = historico.find(x => x.data === dateISO)
    if (!h || !h.exerciciosConcluidos?.length) return 'none'
    if (h.completo) return 'full'
    return 'partial'
  }

  const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const diasSemanaHeader = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const progressoDia = treinoDia.exercicios.length > 0
    ? Math.round((exerciciosConcluidos.length / treinoDia.exercicios.length) * 100)
    : null

  const SUBTABS_EX = [
    { id: 'treino', label: '🏋️ Treino do Dia' },
    { id: 'historico', label: '📋 Histórico' },
    { id: 'stats', label: '📊 Estatísticas' },
    { id: 'calendario', label: '📅 Calendário' },
  ]

  return (
    <>
      {modalExercicio && <ModalComoFazer exercicio={modalExercicio} onFechar={() => setModalExercicio(null)} />}
      {feedback && <div className="toast-inline" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>{feedback}</div>}

      <div className="page-header">
        <h2>🏋️ Exercícios</h2>
        <p>Sua rotina de treino semanal</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: streakAtual >= 3 ? 'var(--accent)' : 'var(--text)', fontSize: 28 }}>
            {streakAtual > 0 ? `🔥 ${streakAtual}` : '0'}
          </div>
          <div className="stat-label">dias seguidos</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 28 }}>{maiorStreak}</div>
          <div className="stat-label">maior sequência</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--blue)', fontSize: 28 }}>{treinosSemana}</div>
          <div className="stat-label">treinos esta semana</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 28 }}>{treinosMes}</div>
          <div className="stat-label">treinos este mês</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="subtab-nav" style={{ marginBottom: 20 }}>
        {SUBTABS_EX.map(st => (
          <button key={st.id} className={`subtab ${subView === st.id ? 'active' : ''}`} onClick={() => setSubView(st.id)}>
            {st.label}
          </button>
        ))}
      </div>

      {/* ── TREINO DO DIA ── */}
      {subView === 'treino' && (
        <>
          {/* Seletor de dia */}
          <div className="month-pills" style={{ marginBottom: 16 }}>
            {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map(dia => {
              const isHoje = dia === diaSemanaHoje
              const temTreino = rotina[dia]?.exercicios?.length > 0
              const histo = historico.find(h => h.data === hojeISO && h.dia === dia)
              return (
                <button
                  key={dia}
                  className={`pill ${diaAtivo === dia ? 'active' : ''}`}
                  onClick={() => setDiaAtivo(dia)}
                  style={{ position: 'relative' }}
                  title={DIAS_LABELS[dia]}
                >
                  {isHoje && <span style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
                  {DIAS_LABELS[dia].slice(0, 3)}
                  {!temTreino && <span style={{ fontSize: 8, display: 'block', color: 'var(--text-muted)' }}>descanso</span>}
                </button>
              )
            })}
          </div>

          {/* Banner do treino */}
          <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark, #8a6a3e) 100%)', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {diaAtivo === diaSemanaHoje ? '🔥 TREINO DE HOJE' : DIAS_LABELS[diaAtivo]}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{treinoDia.nome}</div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{treinoDia.exercicios.length} exercícios</div>
              </div>
              {progressoDia !== null && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{progressoDia}%</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{exerciciosConcluidos.length}/{treinoDia.exercicios.length} feitos</div>
                </div>
              )}
            </div>
            {progressoDia !== null && (
              <div style={{ marginTop: 12, height: 6, background: 'rgba(255,255,255,0.3)', borderRadius: 4 }}>
                <div style={{ height: '100%', width: `${progressoDia}%`, background: 'white', borderRadius: 4, transition: 'width 0.4s' }} />
              </div>
            )}
          </div>

          {treinoDia.exercicios.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 40 }}>😴</div>
              <h3>Dia de descanso</h3>
              <p className="muted-small">Aproveite para recuperar. O descanso é parte do treino!</p>
            </div>
          ) : (
            <>
              {/* Lista de exercícios */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {treinoDia.exercicios.map((ex, idx) => {
                  const concluido = isExercicioConcluido(ex.id)
                  return (
                    <div key={ex.id} className="card" style={{ padding: '14px 18px', opacity: concluido ? 0.7 : 1, transition: 'opacity 0.3s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600, minWidth: 22, textAlign: 'center' }}>{idx + 1}</span>
                        <input
                          type="checkbox"
                          checked={concluido}
                          onChange={() => toggleExercicio(ex.id)}
                          style={{ width: 20, height: 20, accentColor: 'var(--green)', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, textDecoration: concluido ? 'line-through' : 'none', fontSize: 14 }}>{ex.nome}</span>
                            {concluido && <span style={{ color: 'var(--green)', fontSize: 16 }}>✓</span>}
                            <span className="badge badge-gray" style={{ fontSize: 10 }}>{ex.grupo}</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 14 }}>
                            <span>🔁 {ex.series}×{ex.reps}</span>
                            {ex.descanso > 0 && <span>⏱ {ex.descanso}s descanso</span>}
                          </div>
                        </div>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setModalExercicio(ex)}
                          style={{ flexShrink: 0 }}
                        >
                          Como fazer
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Botão concluir treino */}
              {progressoDia < 100 && (
                <button className="btn btn-primary" style={{ width: '100%', marginBottom: 8 }} onClick={marcarTreinoCompleto}>
                  ✓ Concluir treino completo
                </button>
              )}
              {progressoDia === 100 && (
                <div className="card" style={{ textAlign: 'center', background: 'var(--green)22', borderColor: 'var(--green)' }}>
                  <div style={{ fontSize: 32, marginBottom: 4 }}>🎉</div>
                  <div style={{ fontWeight: 700, color: 'var(--green)' }}>Treino completo!</div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── HISTÓRICO ── */}
      {subView === 'historico' && (
        <div className="card">
          <div className="card-title">Histórico de treinos</div>
          {historico.length === 0 ? (
            <p className="muted-small">Nenhum treino registrado ainda.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Dia</th>
                    <th>Treino</th>
                    <th>Exercícios</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...historico]
                    .filter(h => h.exerciciosConcluidos?.length > 0)
                    .sort((a, b) => b.data.localeCompare(a.data))
                    .map(h => (
                      <tr key={h.id}>
                        <td style={{ fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                          {new Date(h.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="muted-cell">{DIAS_LABELS[h.dia] || h.dia}</td>
                        <td style={{ fontWeight: 500 }}>{h.treino}</td>
                        <td className="muted-cell">{h.exerciciosConcluidos?.length}/{h.totalExercicios}</td>
                        <td>
                          <span className={`badge ${h.completo ? 'badge-green' : 'badge-yellow'}`}>
                            {h.completo ? '✓ Completo' : '• Parcial'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ESTATÍSTICAS ── */}
      {subView === 'stats' && (
        <div className="grid-3">
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>🔥</div>
            <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 32 }}>{streakAtual}</div>
            <div className="stat-label">Sequência atual (dias)</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>🏆</div>
            <div className="stat-value" style={{ fontSize: 32 }}>{maiorStreak}</div>
            <div className="stat-label">Maior sequência</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>📅</div>
            <div className="stat-value" style={{ color: 'var(--blue)', fontSize: 32 }}>{treinosMes}</div>
            <div className="stat-label">Treinos este mês</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>💪</div>
            <div className="stat-value" style={{ color: 'var(--green)', fontSize: 32 }}>
              {historico.filter(h => h.completo).length}
            </div>
            <div className="stat-label">Treinos completos</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>✅</div>
            <div className="stat-value" style={{ fontSize: 32 }}>
              {historico.reduce((s, h) => s + (h.exerciciosConcluidos?.length || 0), 0)}
            </div>
            <div className="stat-label">Exercícios concluídos (total)</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>📊</div>
            <div className="stat-value" style={{ color: 'var(--yellow)', fontSize: 32 }}>
              {historico.length > 0 ? Math.round((historico.filter(h => h.completo).length / historico.length) * 100) : 0}%
            </div>
            <div className="stat-label">Taxa de conclusão</div>
          </div>
        </div>
      )}

      {/* ── CALENDÁRIO ── */}
      {subView === 'calendario' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { if (mesCalendario === 0) { setMesCalendario(11); setAnoCalendario(a => a - 1) } else setMesCalendario(m => m - 1) }}>←</button>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{MESES_PT[mesCalendario]} {anoCalendario}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => { if (mesCalendario === 11) { setMesCalendario(0); setAnoCalendario(a => a + 1) } else setMesCalendario(m => m + 1) }}>→</button>
          </div>

          {/* Legenda */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 12, flexWrap: 'wrap' }}>
            <span>✓ Completo</span>
            <span>• Parcial</span>
            <span style={{ color: 'var(--text-muted)' }}>○ Não realizado</span>
            <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>— Descanso</span>
          </div>

          {/* Grid dos dias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {diasSemanaHeader.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
            ))}
            {/* Células vazias */}
            {Array.from({ length: primeiroDia }).map((_, i) => <div key={`empty-${i}`} />)}
            {/* Dias */}
            {diasMes.map(dia => {
              const iso = toISO(dia)
              const st = statusDia(iso)
              const isHoje = iso === hojeISO
              const futuro = iso > hojeISO
              const cor = st === 'full' ? 'var(--green)' : st === 'partial' ? 'var(--yellow)' : st === 'rest' ? 'transparent' : 'transparent'
              const emoji = st === 'full' ? '✓' : st === 'partial' ? '•' : st === 'rest' ? '—' : futuro ? '' : '○'
              return (
                <div
                  key={iso}
                  style={{
                    textAlign: 'center', padding: '6px 4px', borderRadius: 8, fontSize: 12,
                    background: isHoje ? 'var(--accent)22' : st === 'full' ? 'var(--green)15' : 'transparent',
                    border: isHoje ? '2px solid var(--accent)' : '1px solid transparent',
                    cursor: st !== 'rest' ? 'pointer' : 'default',
                    opacity: futuro ? 0.4 : 1,
                  }}
                  title={`${dia.getDate()}/${mesCalendario + 1}: ${st === 'full' ? 'Completo' : st === 'partial' ? 'Parcial' : st === 'rest' ? 'Descanso' : 'Não realizado'}`}
                >
                  <div style={{ fontWeight: isHoje ? 700 : 500, color: isHoje ? 'var(--accent)' : 'var(--text)' }}>{dia.getDate()}</div>
                  <div style={{ color: cor || 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>{emoji}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
