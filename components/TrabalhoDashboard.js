import { useMemo } from 'react'
import { fmt, moneyNumber, fmtDataBR } from '../lib/finance'

const TIPOS_PROJETO = ['Residencial', 'Comercial', 'Hotelaria', 'Varejo', 'Escritório', 'Paisagismo', 'Design de Interiores', 'Detalhamentos', '3D']

function calcProgresso(tarefas) {
  if (!tarefas || tarefas.length === 0) return null
  const concluidas = tarefas.filter(t => t.status === 'Concluída').length
  return Math.round((concluidas / tarefas.length) * 100)
}

function statusProjeto(proj) {
  if (proj.status === 'Concluído' || proj.status === 'Cancelado') return proj.status
  if (proj.dataFim && proj.dataFim < new Date().toISOString().slice(0, 10) && proj.status !== 'Concluído') return 'Atrasado'
  return proj.status
}

function corStatus(status) {
  const map = {
    'Planejamento': 'var(--blue)',
    'Em andamento': 'var(--accent)',
    'Aguardando cliente': 'var(--yellow)',
    'Pausado': 'var(--text-muted)',
    'Concluído': 'var(--green)',
    'Cancelado': 'var(--red)',
    'Atrasado': 'var(--red)',
  }
  return map[status] || 'var(--text-muted)'
}

function calcFinanceiroProjeto(proj) {
  const contratado = moneyNumber(proj.valorContratado)
  const recebimentos = proj.recebimentos || []
  const gastos = proj.gastos || []
  const totalRecebido = recebimentos.reduce((s, r) => s + (r.status === 'Recebido' ? moneyNumber(r.valor) : r.status === 'Parcial' ? moneyNumber(r.valorRecebido) : 0), 0)
  const totalPendente = recebimentos.reduce((s, r) => s + (r.status === 'Recebido' ? 0 : Math.max(0, moneyNumber(r.valor) - moneyNumber(r.valorRecebido))), 0)
  const totalGasto = gastos.reduce((s, g) => s + moneyNumber(g.valor), 0)
  const lucroRealizado = totalRecebido - totalGasto
  const lucroPrevisto = contratado - totalGasto
  return { contratado, totalRecebido, totalPendente, totalGasto, lucroRealizado, lucroPrevisto }
}

export default function TrabalhoDashboard({ data, onAbrirProjeto }) {
  const projetos = data.projetos || []
  const hoje = new Date().toISOString().slice(0, 10)
  const mesAtual = new Date().getMonth()
  const anoAtual = new Date().getFullYear()

  // Status calculado
  const projetosComStatus = useMemo(() => projetos.map(p => ({ ...p, _status: statusProjeto(p) })), [projetos])

  const ativos = projetosComStatus.filter(p => !['Concluído', 'Cancelado'].includes(p._status))
  const concluidos = projetosComStatus.filter(p => p._status === 'Concluído')
  const atrasados = projetosComStatus.filter(p => p._status === 'Atrasado')
  const aguardando = projetosComStatus.filter(p => p._status === 'Aguardando cliente')

  // Financeiro do mês
  const receitaMes = useMemo(() => {
    return projetos.reduce((s, p) => {
      const recs = (p.recebimentos || []).filter(r => {
        const d = r.dataPagamento || r.vencimento || ''
        return (r.status === 'Recebido' || r.status === 'Parcial') && d.startsWith(`${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`)
      })
      return s + recs.reduce((a, r) => a + (r.status === 'Recebido' ? moneyNumber(r.valor) : moneyNumber(r.valorRecebido)), 0)
    }, 0)
  }, [projetos, mesAtual, anoAtual])

  const receitaPrevistaMes = useMemo(() => {
    return projetos.reduce((s, p) => {
      const recs = (p.recebimentos || []).filter(r => {
        const d = r.vencimento || ''
        return d.startsWith(`${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`)
      })
      return s + recs.reduce((a, r) => a + (r.status === 'Recebido' ? 0 : Math.max(0, moneyNumber(r.valor) - moneyNumber(r.valorRecebido))), 0)
    }, 0)
  }, [projetos, mesAtual, anoAtual])

  const gastosMes = useMemo(() => {
    return projetos.reduce((s, p) => {
      const gs = (p.gastos || []).filter(g => {
        const d = g.data || ''
        return d.startsWith(`${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`)
      })
      return s + gs.reduce((a, g) => a + moneyNumber(g.valor), 0)
    }, 0)
  }, [projetos, mesAtual, anoAtual])

  const lucroMes = receitaMes - gastosMes

  // Por tipo de projeto
  const porTipo = useMemo(() => {
    const counts = {}
    projetos.forEach(p => { const k = p.tipo || 'Outros'; counts[k] = (counts[k] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [projetos])

  // Próximos prazos (tarefas)
  const proximosPrazos = useMemo(() => {
    const tarefas = []
    projetos.forEach(p => {
      (p.tarefas || []).forEach(t => {
        if (t.status !== 'Concluída' && t.dataFim) {
          tarefas.push({ ...t, _projeto: p.nome, _projetoId: p.id, _cliente: p.cliente, _atrasada: t.dataFim < hoje })
        }
      })
    })
    return tarefas.sort((a, b) => (a.dataFim || '').localeCompare(b.dataFim || '')).slice(0, 8)
  }, [projetos, hoje])

  // Próximos recebimentos
  const proximosRecebimentos = useMemo(() => {
    const recs = []
    projetos.forEach(p => {
      (p.recebimentos || []).filter(r => r.status !== 'Recebido').forEach(r => {
        recs.push({ ...r, _projeto: p.nome, _projetoId: p.id, _cliente: p.cliente })
      })
    })
    return recs.sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || '')).slice(0, 8)
  }, [projetos])

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  if (projetos.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>💼</div>
        <h3 style={{ margin: '0 0 8px' }}>Nenhum projeto ainda</h3>
        <p className="muted-small">Vá para a aba <strong>Projetos</strong> e crie seu primeiro projeto.</p>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <h2>📊 Dashboard — Trabalho</h2>
        <p>Visão geral dos seus projetos de arquitetura</p>
      </div>

      {/* Cards de status */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 28 }}>{ativos.length}</div>
          <div className="stat-label">Projetos ativos</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 28 }}>{concluidos.length}</div>
          <div className="stat-label">Concluídos</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--red)', fontSize: 28 }}>{atrasados.length}</div>
          <div className="stat-label">Atrasados</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--yellow)', fontSize: 28 }}>{aguardando.length}</div>
          <div className="stat-label">Aguardando cliente</div>
        </div>
      </div>

      {/* Financeiro do mês */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Receita do mês</div>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 20 }}>{fmt(receitaMes)}</div>
          <div className="muted-small">recebido em {meses[mesAtual]}/{anoAtual}</div>
        </div>
        <div className="card">
          <div className="card-title">Receita prevista</div>
          <div className="stat-value" style={{ color: 'var(--blue)', fontSize: 20 }}>{fmt(receitaPrevistaMes)}</div>
          <div className="muted-small">vencimentos em {meses[mesAtual]}</div>
        </div>
        <div className="card">
          <div className="card-title">Gastos do mês</div>
          <div className="stat-value" style={{ color: 'var(--red)', fontSize: 20 }}>{fmt(gastosMes)}</div>
          <div className="muted-small">despesas em {meses[mesAtual]}</div>
        </div>
        <div className="card">
          <div className="card-title">Lucro do mês</div>
          <div className="stat-value" style={{ color: lucroMes >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>{fmt(lucroMes)}</div>
          <div className="muted-small">recebido − gastos</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Por tipo de projeto */}
        <div className="card">
          <div className="card-title">Projetos por tipo</div>
          {porTipo.length === 0 ? (
            <p className="muted-small">Nenhum projeto cadastrado.</p>
          ) : (
            porTipo.map(([tipo, qtd]) => (
              <div key={tipo} className="bar-row">
                <div className="bar-row-label">
                  <span>{tipo}</span>
                  <strong>{qtd} projeto{qtd !== 1 ? 's' : ''}</strong>
                </div>
                <div className="chart-track">
                  <div className="chart-fill neutral" style={{ width: `${(qtd / porTipo[0][1]) * 100}%` }} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Próximos prazos */}
        <div className="card">
          <div className="card-title">⏰ Próximos prazos</div>
          {proximosPrazos.length === 0 ? (
            <p className="muted-small">Nenhuma tarefa com prazo pendente.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {proximosPrazos.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{t.nome}</div>
                    <div className="muted-small">{t._projeto} {t._cliente ? `· ${t._cliente}` : ''}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: t._atrasada ? 'var(--red)' : 'var(--text)', whiteSpace: 'nowrap' }}>
                    {t._atrasada && '⚠ '}{fmtDataBR(t.dataFim)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Próximos recebimentos */}
      <div className="card">
        <div className="card-title">💰 Próximos recebimentos</div>
        {proximosRecebimentos.length === 0 ? (
          <p className="muted-small">Nenhum recebimento pendente.</p>
        ) : (
          <div className="table-wrap">
            <table style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Cliente</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {proximosRecebimentos.map(r => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => onAbrirProjeto && onAbrirProjeto({ id: r._projetoId })}>
                    <td style={{ fontWeight: 500 }}>{r._projeto}</td>
                    <td className="muted-cell">{r._cliente || '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(r.status === 'Parcial' ? Math.max(0, moneyNumber(r.valor) - moneyNumber(r.valorRecebido)) : r.valor)}</td>
                    <td className="muted-cell">{fmtDataBR(r.vencimento)}</td>
                    <td>
                      <span className={`badge ${r.status === 'Parcial' ? 'badge-blue' : r.status === 'Vencido' ? 'badge-red' : 'badge-yellow'}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
