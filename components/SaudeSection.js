import { useState, useEffect, useCallback } from 'react'

// ─── DADOS CIENTÍFICOS ──────────────────────────────────────────────────────
// Fontes: NIAAA, WHO, Hepatology, Alcohol and Alcoholism, New England Journal
// of Medicine, British Medical Journal.
// Os benefícios listados refletem o que a literatura científica descreve como
// efeitos esperados em populações de adultos que interrompem o consumo de
// álcool. Resultados individuais podem variar.

const MARCOS = [
  {
    dias: 1,
    label: '24 horas',
    icone: '💧',
    cor: '#3d6eaa',
    titulo: 'Álcool eliminado do organismo',
    beneficios: [
      'O álcool é completamente eliminado da corrente sanguínea.',
      'O fígado começa a metabolizar a gordura acumulada pelo consumo.',
      'Os rins passam a excretar líquidos normalmente, melhorando a hidratação.',
      'A pressão arterial inicia uma queda gradual.',
    ],
    fonte: 'NIAAA; Neuropharmacology, 2018',
  },
  {
    dias: 2,
    label: '48 horas',
    icone: '😴',
    cor: '#6b5cf6',
    titulo: 'Sono e sistema nervoso',
    beneficios: [
      'O sono REM começa a se normalizar (o álcool suprime essa fase).',
      'A ansiedade induzida pela abstinência começa a recuar.',
      'Paladar e olfato iniciam a recuperação gradual.',
      'Os neurônios passam a receber menos interferência química.',
    ],
    fonte: 'Alcohol and Alcoholism, 2015; Sleep Medicine Reviews, 2019',
  },
  {
    dias: 3,
    label: '3 dias',
    icone: '🧠',
    cor: '#8b5cf6',
    titulo: 'Clareza mental',
    beneficios: [
      'A névoa mental ("brain fog") causada pelo álcool começa a dissipar.',
      'Menos fadiga ao acordar.',
      'A hidratação celular se normaliza.',
      'Primeiras melhoras no humor relatadas por grande parte das pessoas.',
    ],
    fonte: 'Alcoholism: Clinical and Experimental Research, 2017',
  },
  {
    dias: 7,
    label: '1 semana',
    icone: '⚡',
    cor: '#f59e0b',
    titulo: 'Energia e digestão',
    beneficios: [
      'Melhora evidente na digestão — o álcool irrita a mucosa gástrica.',
      'Níveis de energia mais estáveis ao longo do dia.',
      'Melhora da concentração e da memória de curto prazo.',
      'A pele começa a parecer mais hidratada e saudável.',
      'O sistema imunológico começa a se fortalecer.',
    ],
    fonte: 'BMJ, 2018; Alcohol Research & Health, 2010',
  },
  {
    dias: 14,
    label: '2 semanas',
    icone: '❤️',
    cor: '#ef4444',
    titulo: 'Coração e circulação',
    beneficios: [
      'Redução mensurável da pressão arterial em estudos clínicos.',
      'Melhora da circulação sanguínea periférica.',
      'Sono mais profundo e restaurador.',
      'Redução de inflamações sistêmicas.',
      'O risco de arritmias cardíacas começa a diminuir.',
    ],
    fonte: 'Hypertension, 2016; Journal of the American Heart Association, 2019',
  },
  {
    dias: 21,
    label: '3 semanas',
    icone: '🔬',
    cor: '#10b981',
    titulo: 'Recuperação hepática acelerada',
    beneficios: [
      'Melhora significativa na função do fígado detectada em exames.',
      'Redução da esteatose hepática (gordura no fígado) já observada em imagens.',
      'Capacidade cognitiva notavelmente melhorada.',
      'Redução de marcadores inflamatórios no sangue.',
    ],
    fonte: 'Hepatology, 2014; Gut, 2020',
  },
  {
    dias: 30,
    label: '1 mês',
    icone: '🌿',
    cor: '#2d9252',
    titulo: 'Renovação orgânica',
    beneficios: [
      'Recuperação progressiva e mensurável do fígado.',
      'Pele mais hidratada, luminosa e com menos vermelhidão.',
      'Sistema imunológico significativamente mais eficiente.',
      'Melhor qualidade do sono sustentada.',
      'Redução do risco de infecções oportunistas.',
      'Estabilidade emocional mais consistente.',
    ],
    fonte: 'NIAAA; Journal of Hepatology, 2016; Alcohol Research, 2020',
  },
  {
    dias: 60,
    label: '2 meses',
    icone: '😊',
    cor: '#f97316',
    titulo: 'Saúde mental e emocional',
    beneficios: [
      'Melhor regulação emocional sem a interferência do álcool.',
      'Redução mensurável de sintomas de ansiedade e depressão.',
      'A memória de curto prazo melhora substancialmente.',
      'Relações interpessoais tendem a melhorar.',
      'O cérebro começa a restaurar conexões neuronais perdidas.',
    ],
    fonte: 'JAMA Psychiatry, 2017; Neuropsychopharmacology, 2018',
  },
  {
    dias: 90,
    label: '3 meses',
    icone: '🏃',
    cor: '#0ea5e9',
    titulo: 'Capacidade física e cognitiva',
    beneficios: [
      'Maior capacidade aeróbica e cardiovascular.',
      'Melhor memória de longo prazo e aprendizado.',
      'Mais estabilidade emocional consolidada.',
      'Melhora da função pancreática.',
      'Risco de infarto reduzido em relação ao pico de consumo.',
      'Volume cerebral começa a se recuperar (neuroplasticidade).',
    ],
    fonte: 'Alcoholism: Clinical and Experimental Research, 2019; Radiology, 2012',
  },
  {
    dias: 180,
    label: '6 meses',
    icone: '🛡️',
    cor: '#8b5cf6',
    titulo: 'Proteção contra doenças',
    beneficios: [
      'Redução significativa do risco de cancro relacionado ao álcool.',
      'Melhor funcionamento hepático com enzimas próximas do normal.',
      'Mais qualidade de vida geral reportada pelos pacientes.',
      'Melhora da saúde óssea (álcool reduz absorção de cálcio).',
      'Redução do risco de pancreatite.',
    ],
    fonte: 'WHO; International Journal of Cancer, 2018; Gut, 2017',
  },
  {
    dias: 270,
    label: '9 meses',
    icone: '✨',
    cor: '#c9a96e',
    titulo: 'Transformação profunda',
    beneficios: [
      'O fígado se recuperou substancialmente em casos de dano moderado.',
      'O sistema nervoso central apresenta remodelação neuronal consistente.',
      'Melhora da função sexual e hormonal.',
      'Sono profundo e restaurador de forma sistemática.',
      'Risco cardiovascular reduzido de forma expressiva.',
    ],
    fonte: 'Hepatology, 2019; Addiction Biology, 2020',
  },
  {
    dias: 365,
    label: '1 ano',
    icone: '🏆',
    cor: '#f59e0b',
    titulo: 'Um ano de conquista',
    beneficios: [
      'Grande redução do risco de doenças cardiovasculares.',
      'O fígado pode ter se recuperado completamente em casos de cirrose inicial.',
      'Risco de AVC aproxima-se do de não-bebedores.',
      'Saúde mental robusta e estável.',
      'Sistema imunológico funcionando plenamente.',
      'Redução do risco de diversos tipos de câncer.',
    ],
    fonte: 'NEJM, 2018; BMJ, 2018; NIAAA Annual Review, 2021',
  },
  {
    dias: 730,
    label: '2 anos',
    icone: '🌟',
    cor: '#10b981',
    titulo: 'Saúde próxima à de não-bebedores',
    beneficios: [
      'Risco de acidente vascular cerebral aproxima-se de não-bebedores.',
      'Saúde mental consolidada e estável.',
      'Melhora da densidade óssea.',
      'Risco de doenças hepáticas drasticamente reduzido.',
    ],
    fonte: 'Stroke Journal, 2019; JAMA Internal Medicine, 2020',
  },
  {
    dias: 1825,
    label: '5 anos',
    icone: '🎯',
    cor: '#2d9252',
    titulo: 'Prevenção oncológica',
    beneficios: [
      'Risco de câncer de boca, faringe e esôfago equipara-se ao de não-bebedores.',
      'Risco de câncer de fígado reduzido em até 55%.',
      'Saúde geral equiparada à de quem nunca bebeu de forma excessiva.',
    ],
    fonte: 'International Journal of Cancer, 2018; WHO IARC, 2020',
  },
  {
    dias: 3650,
    label: '10 anos',
    icone: '💎',
    cor: '#6b5cf6',
    titulo: 'Décimo ano — proteção máxima',
    beneficios: [
      'Risco de câncer de mama reduz para aproximadamente metade do pico.',
      'Risco de doenças do fígado reduz drasticamente.',
      'Saúde cardiovascular, hepática e neurológica amplamente recuperada.',
      'Expectativa de vida significativamente maior.',
    ],
    fonte: 'Lancet, 2018; WHO Global Status Report on Alcohol and Health, 2022',
  },
]

// ─── HELPER: calcular tempo decorrido ────────────────────────────────────────
function calcularTempo(dataInicio) {
  if (!dataInicio) return null
  const inicio = new Date(dataInicio + 'T00:00:00')
  const agora = new Date()
  const diffMs = agora - inicio
  if (diffMs < 0) return null

  const totalSegundos = Math.floor(diffMs / 1000)
  const totalMinutos = Math.floor(totalSegundos / 60)
  const totalHoras = Math.floor(totalMinutos / 60)
  const totalDias = Math.floor(totalHoras / 24)
  const totalSemanas = Math.floor(totalDias / 7)
  const totalMeses = Math.floor(totalDias / 30.44)
  const totalAnos = Math.floor(totalDias / 365.25)

  return {
    totalDias,
    totalSemanas,
    totalMeses,
    totalAnos,
    diasRestantesMes: totalDias % 30,
    mesesRestantesAno: totalMeses % 12,
    horas: totalHoras % 24,
    minutos: totalMinutos % 60,
  }
}

function formatarTextoTempo(tempo) {
  if (!tempo) return ''
  const { totalDias, totalAnos, totalMeses, mesesRestantesAno, diasRestantesMes } = tempo

  if (totalDias === 0) return 'menos de 1 dia'
  if (totalAnos >= 1) {
    const mRestantes = mesesRestantesAno
    return mRestantes > 0
      ? `${totalAnos} ano${totalAnos > 1 ? 's' : ''} e ${mRestantes} mês${mRestantes > 1 ? 'es' : ''}`
      : `${totalAnos} ano${totalAnos > 1 ? 's' : ''}`
  }
  if (totalMeses >= 3) {
    const dRestantes = diasRestantesMes
    return dRestantes > 0
      ? `${totalMeses} meses e ${dRestantes} dia${dRestantes > 1 ? 's' : ''}`
      : `${totalMeses} meses`
  }
  if (totalDias >= 14) {
    return `${Math.floor(totalDias / 7)} semana${Math.floor(totalDias / 7) > 1 ? 's' : ''} e ${totalDias % 7} dia${totalDias % 7 !== 1 ? 's' : ''}`
  }
  return `${totalDias} dia${totalDias !== 1 ? 's' : ''}`
}

// ─── HELPER: encontrar marcos atingidos e próximo ────────────────────────────
function calcularMarcos(totalDias) {
  const concluidos = MARCOS.filter(m => totalDias >= m.dias)
  const proximo = MARCOS.find(m => totalDias < m.dias)
  const atual = concluidos[concluidos.length - 1] || null
  return { concluidos, proximo, atual }
}

// ─── COMPONENTE: Card Sem Álcool ─────────────────────────────────────────────
function SemAlcoolCard({ data, update }) {
  const abstinencia = data.saudeAbstinencia?.semAlcool || {}
  const { dataInicio, ativo } = abstinencia

  const [tempo, setTempo] = useState(() => calcularTempo(dataInicio))
  const [dataInput, setDataInput] = useState(dataInicio || new Date().toISOString().split('T')[0])
  const [confirmandoReinicio, setConfirmandoReinicio] = useState(false)
  const [mostrarTimeline, setMostrarTimeline] = useState(false)
  const [activeMarco, setActiveMarco] = useState(null)

  // Atualiza contador a cada minuto
  useEffect(() => {
    if (!dataInicio || !ativo) return
    setTempo(calcularTempo(dataInicio))
    const interval = setInterval(() => {
      setTempo(calcularTempo(dataInicio))
    }, 60000)
    return () => clearInterval(interval)
  }, [dataInicio, ativo])

  const iniciar = useCallback(() => {
    if (!dataInput) return
    update('saudeAbstinencia', {
      ...(data.saudeAbstinencia || {}),
      semAlcool: { dataInicio: dataInput, ativo: true }
    })
  }, [dataInput, data, update])

  const reiniciar = useCallback(() => {
    const hoje = new Date().toISOString().split('T')[0]
    update('saudeAbstinencia', {
      ...(data.saudeAbstinencia || {}),
      semAlcool: { dataInicio: hoje, ativo: true }
    })
    setConfirmandoReinicio(false)
  }, [data, update])

  const { concluidos, proximo, atual } = tempo
    ? calcularMarcos(tempo.totalDias)
    : { concluidos: [], proximo: MARCOS[0], atual: null }

  const progresso = proximo && atual
    ? Math.min(100, Math.round(((tempo?.totalDias - atual.dias) / (proximo.dias - atual.dias)) * 100))
    : proximo && !atual
    ? Math.min(100, Math.round((tempo?.totalDias / proximo.dias) * 100))
    : 100

  const textoTempo = tempo ? formatarTextoTempo(tempo) : ''

  // ── Painel "O que está acontecendo hoje" ──
  const painelHoje = atual ? atual.beneficios : null
  const painelTitulo = atual ? atual.titulo : null

  // ── UI: não iniciado ──
  if (!ativo || !dataInicio) {
    return (
      <div className="saude-card saude-sem-alcool-card">
        <div className="saude-card-header">
          <div className="saude-card-icon">🍺</div>
          <div>
            <div className="saude-card-title">Sem Álcool</div>
            <div className="saude-card-sub">Acompanhamento de abstinência</div>
          </div>
        </div>

        <div className="saude-nao-iniciado">
          <div className="saude-nao-iniciado-icon">🌱</div>
          <p>Inicie o acompanhamento para visualizar sua evolução e a linha do tempo de recuperação do seu organismo.</p>
          <div className="saude-iniciar-form">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="saude-label">Data em que parei de beber</label>
              <input
                type="date"
                value={dataInput}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setDataInput(e.target.value)}
                style={{ maxWidth: 200 }}
              />
            </div>
            <button className="btn btn-primary" onClick={iniciar}>
              🚀 Iniciar acompanhamento
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── UI: ativo ──
  return (
    <div className="saude-card saude-sem-alcool-card saude-ativo">

      {/* Header */}
      <div className="saude-card-header">
        <div className="saude-card-icon">🍺</div>
        <div style={{ flex: 1 }}>
          <div className="saude-card-title">Sem Álcool</div>
          <div className="saude-card-sub">
            Desde {new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
        {confirmandoReinicio ? (
          <div className="saude-confirm-reinicio">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Reiniciar contagem?</span>
            <button className="btn btn-danger btn-sm" onClick={reiniciar}>Confirmar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmandoReinicio(false)}>Cancelar</button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmandoReinicio(true)}>
            🔄 Reiniciar
          </button>
        )}
      </div>

      {/* Contador principal */}
      <div className="saude-counter-hero">
        <div className="saude-counter-numero">{tempo?.totalDias ?? 0}</div>
        <div className="saude-counter-label">dias sem álcool</div>
        <div className="saude-counter-sub">{textoTempo}</div>
        {tempo && (
          <div className="saude-counter-detail">
            {tempo.totalAnos > 0 && <span>{tempo.totalAnos}a</span>}
            {tempo.totalMeses > 0 && <span>{tempo.totalMeses % 12}m</span>}
            <span>{tempo.totalDias % 30}d</span>
            <span>{tempo.horas}h</span>
          </div>
        )}
      </div>

      {/* Progresso até próximo marco */}
      {proximo && (
        <div className="saude-progresso-marco">
          <div className="saude-progresso-label">
            <span>
              {atual ? `${atual.label} ✓` : 'Início'}
            </span>
            <span style={{ color: proximo.cor, fontWeight: 600 }}>
              → {proximo.label}
            </span>
          </div>
          <div className="progress-bar" style={{ height: 8 }}>
            <div
              className="progress-fill"
              style={{
                width: `${progresso}%`,
                background: `linear-gradient(90deg, ${proximo.cor}99, ${proximo.cor})`,
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {proximo.dias - (tempo?.totalDias ?? 0)} dias restantes
          </div>
        </div>
      )}
      {!proximo && (
        <div className="saude-progresso-marco" style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: 14 }}>
            🏆 Todos os marcos atingidos! Incrível conquista!
          </div>
        </div>
      )}

      {/* Grid de estatísticas */}
      <div className="saude-stats-grid">
        <div className="saude-stat">
          <div className="saude-stat-valor">{tempo?.totalSemanas ?? 0}</div>
          <div className="saude-stat-label">Semanas</div>
        </div>
        <div className="saude-stat">
          <div className="saude-stat-valor">{tempo?.totalMeses ?? 0}</div>
          <div className="saude-stat-label">Meses</div>
        </div>
        <div className="saude-stat">
          <div className="saude-stat-valor">{tempo?.totalAnos ?? 0}</div>
          <div className="saude-stat-label">Anos</div>
        </div>
        <div className="saude-stat">
          <div className="saude-stat-valor">{concluidos.length}</div>
          <div className="saude-stat-label">Marcos</div>
        </div>
      </div>

      {/* Painel "O que está acontecendo hoje" */}
      {painelHoje && (
        <div className="saude-hoje-panel">
          <div className="saude-hoje-titulo">
            <span className="saude-hoje-icone">🔍</span>
            O que está acontecendo no seu corpo hoje
          </div>
          <div className="saude-hoje-marco">
            <span style={{ marginRight: 6 }}>{atual.icone}</span>
            {atual.titulo}
          </div>
          <ul className="saude-hoje-lista">
            {painelHoje.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <div className="saude-fonte">📚 {atual.fonte}</div>
        </div>
      )}
      {!painelHoje && tempo && tempo.totalDias === 0 && (
        <div className="saude-hoje-panel">
          <div className="saude-hoje-titulo">
            <span className="saude-hoje-icone">🔍</span>
            Primeiras horas
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Sua jornada começa agora. Em 24h o álcool terá sido eliminado do seu organismo e os primeiros benefícios já serão sentidos.
          </p>
        </div>
      )}

      {/* Próxima conquista */}
      {proximo && (
        <div className="saude-next-card" style={{ borderLeftColor: proximo.cor }}>
          <div className="saude-next-titulo">
            <span>🎯 Próxima conquista</span>
            <span className="saude-next-badge" style={{ background: proximo.cor + '22', color: proximo.cor }}>
              Em {proximo.dias - (tempo?.totalDias ?? 0)} dias
            </span>
          </div>
          <div className="saude-next-marco">
            <span style={{ marginRight: 8, fontSize: 20 }}>{proximo.icone}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{proximo.label} — {proximo.titulo}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {proximo.beneficios[0]}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão timeline */}
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button
          className="btn btn-ghost"
          style={{ width: '100%' }}
          onClick={() => setMostrarTimeline(v => !v)}
        >
          {mostrarTimeline ? '▲ Ocultar linha do tempo' : '▼ Ver linha do tempo completa'}
        </button>
      </div>

      {/* Timeline */}
      {mostrarTimeline && (
        <TimelineRecuperacao
          totalDias={tempo?.totalDias ?? 0}
          activeMarco={activeMarco}
          setActiveMarco={setActiveMarco}
        />
      )}
    </div>
  )
}

// ─── COMPONENTE: Timeline ─────────────────────────────────────────────────────
function TimelineRecuperacao({ totalDias, activeMarco, setActiveMarco }) {
  return (
    <div className="saude-timeline">
      <div className="saude-timeline-titulo">
        📈 Linha do Tempo da Recuperação
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
          Baseado em literatura científica internacional
        </span>
      </div>

      <div className="saude-timeline-lista">
        {MARCOS.map((marco, idx) => {
          const concluido = totalDias >= marco.dias
          const isProximo = !concluido && (idx === 0 || totalDias >= MARCOS[idx - 1]?.dias)
          const isActive = activeMarco === marco.dias

          return (
            <div
              key={marco.dias}
              className={`saude-tl-item ${concluido ? 'tl-done' : isProximo ? 'tl-proximo' : 'tl-futuro'} ${isActive ? 'tl-expandido' : ''}`}
              onClick={() => setActiveMarco(isActive ? null : marco.dias)}
            >
              {/* Linha vertical */}
              <div className="saude-tl-linha" style={{ background: concluido ? marco.cor : 'var(--border)' }} />

              {/* Dot */}
              <div
                className="saude-tl-dot"
                style={{
                  background: concluido ? marco.cor : isProximo ? marco.cor + '44' : 'var(--border)',
                  border: `2px solid ${concluido ? marco.cor : isProximo ? marco.cor : 'var(--border)'}`,
                  boxShadow: concluido ? `0 0 0 3px ${marco.cor}33` : isProximo ? `0 0 8px ${marco.cor}44` : 'none',
                }}
              >
                {concluido && <span className="saude-tl-check">✓</span>}
              </div>

              {/* Conteúdo */}
              <div className="saude-tl-conteudo">
                <div className="saude-tl-header">
                  <span className="saude-tl-icone">{marco.icone}</span>
                  <div>
                    <div className="saude-tl-label" style={{ color: concluido ? marco.cor : isProximo ? marco.cor : 'var(--text-muted)' }}>
                      {marco.label}
                      {concluido && <span className="saude-tl-badge-done">✓ Concluído</span>}
                      {isProximo && <span className="saude-tl-badge-proximo">→ Próximo</span>}
                    </div>
                    <div className="saude-tl-titulo-marco">{marco.titulo}</div>
                  </div>
                </div>

                {/* Benefícios expandidos */}
                {isActive && (
                  <div className="saude-tl-beneficios">
                    <ul>
                      {marco.beneficios.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                    <div className="saude-fonte" style={{ marginTop: 8 }}>📚 {marco.fonte}</div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL: Seção Saúde ───────────────────────────────────────
export default function SaudeSection({ data, update }) {
  return (
    <div className="saude-section">
      {/* Header da seção */}
      <div className="saude-section-header">
        <div className="saude-section-header-icon">🏥</div>
        <div>
          <div className="saude-section-titulo">Saúde &amp; Qualidade de Vida</div>
          <div className="saude-section-sub">
            Acompanhe hábitos essenciais para o seu bem-estar
          </div>
        </div>
      </div>

      {/* Grid de cards de saúde — extensível */}
      <div className="saude-grid">
        <SemAlcoolCard data={data} update={update} />

        {/* Espaços reservados para futuros rastreadores */}
        <div className="saude-card saude-em-breve">
          <div className="saude-card-icon">🚬</div>
          <div className="saude-card-title">Sem Cigarro</div>
          <div className="saude-card-sub">Em breve</div>
        </div>

        <div className="saude-card saude-em-breve">
          <div className="saude-card-icon">🏃</div>
          <div className="saude-card-title">Exercícios Físicos</div>
          <div className="saude-card-sub">Em breve</div>
        </div>

        <div className="saude-card saude-em-breve">
          <div className="saude-card-icon">💧</div>
          <div className="saude-card-title">Consumo de Água</div>
          <div className="saude-card-sub">Em breve</div>
        </div>
      </div>
    </div>
  )
}
