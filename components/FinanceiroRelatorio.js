import { useMemo, useState } from 'react'
import { MESES, fmt, moneyNumber } from '../lib/finance'

export default function FinanceiroRelatorio({ data }) {
  const [mesIdx, setMesIdx] = useState(new Date().getMonth())
  const mes       = MESES[mesIdx]
  const mesAnt    = MESES[(mesIdx + 11) % 12]
  const lancamentos = data.financeiro  || []
  const orcamentos  = data.orcamentoCategoria || {}

  const lancMes    = lancamentos.filter(l => (l.mes || '').toLowerCase() === mes.toLowerCase())
  const lancMesAnt = lancamentos.filter(l => (l.mes || '').toLowerCase() === mesAnt.toLowerCase())

  const receitas   = lancMes.filter(l => l.tipo === 'Receita').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const despesas   = lancMes.filter(l => l.tipo === 'Despesa').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const saldo      = receitas - despesas
  const recebido   = lancMes.filter(l => l.tipo === 'Receita' && l.status === 'Recebida').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const pago       = lancMes.filter(l => l.tipo === 'Despesa' && l.status === 'Pago').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const pendente   = lancMes.filter(l => l.tipo === 'Despesa' && l.status === 'Pendente').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const aReceber   = lancMes.filter(l => l.tipo === 'Receita' && l.status === 'Prevista').reduce((s, l) => s + moneyNumber(l.valor), 0)

  const receitasAnt = lancMesAnt.filter(l => l.tipo === 'Receita').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const despesasAnt = lancMesAnt.filter(l => l.tipo === 'Despesa').reduce((s, l) => s + moneyNumber(l.valor), 0)
  const taxaEconomia = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0

  const categorias = useMemo(() => {
    const totals = {}
    lancMes.filter(l => l.tipo === 'Despesa').forEach(l => {
      const k = l.categoria || 'Sem categoria'
      totals[k] = (totals[k] || 0) + moneyNumber(l.valor)
    })
    return Object.entries(totals)
      .map(([cat, total]) => {
        const orcamento = moneyNumber(orcamentos[cat])
        const pct = orcamento > 0 ? Math.min(100, (total / orcamento) * 100) : null
        return { cat, total, orcamento, pct }
      })
      .sort((a, b) => b.total - a.total)
  }, [lancMes, orcamentos])

  const receitasPorCat = useMemo(() => {
    const totals = {}
    lancMes.filter(l => l.tipo === 'Receita').forEach(l => {
      const k = l.categoria || 'Sem categoria'
      totals[k] = (totals[k] || 0) + moneyNumber(l.valor)
    })
    return Object.entries(totals).map(([cat, total]) => ({ cat, total })).sort((a, b) => b.total - a.total)
  }, [lancMes])

  const top5 = lancMes.filter(l => l.tipo === 'Despesa')
    .sort((a, b) => moneyNumber(b.valor) - moneyNumber(a.valor))
    .slice(0, 5)

  const maxCat = Math.max(1, ...categorias.map(c => c.total))
  const maxRec = Math.max(1, ...receitasPorCat.map(c => c.total))

  return (
    <>
      <div className="page-header page-header-actions">
        <div>
          <h2>Relatório Mensal</h2>
          <p>Resumo consolidado do fechamento do mês</p>
        </div>
        <div className="month-pills" style={{ flex: 'none' }}>
          {MESES.map((m, i) => (
            <button key={m} className={`pill ${mesIdx === i ? 'active' : ''}`} onClick={() => setMesIdx(i)}>
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Receitas</div>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 20 }}>{fmt(receitas)}</div>
          {receitasAnt > 0 && (
            <div className={`trend ${receitas >= receitasAnt ? 'positive' : 'negative'}`}>
              {receitas >= receitasAnt ? '↑' : '↓'} {fmt(Math.abs(receitas - receitasAnt))} vs. {mesAnt}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-title">Despesas</div>
          <div className="stat-value" style={{ color: 'var(--red)', fontSize: 20 }}>{fmt(despesas)}</div>
          {despesasAnt > 0 && (
            <div className={`trend ${despesas <= despesasAnt ? 'positive' : 'negative'}`}>
              {despesas <= despesasAnt ? '↓' : '↑'} {fmt(Math.abs(despesas - despesasAnt))} vs. {mesAnt}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-title">Saldo previsto</div>
          <div className="stat-value" style={{ color: saldo >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>{fmt(saldo)}</div>
          <div className="muted-small">receitas − despesas</div>
        </div>
        <div className="card">
          <div className="card-title">Taxa de poupança</div>
          <div className="stat-value" style={{ color: taxaEconomia >= 20 ? 'var(--green)' : taxaEconomia >= 10 ? 'var(--yellow)' : 'var(--red)', fontSize: 20 }}>
            {taxaEconomia.toFixed(1)}%
          </div>
          <div className="muted-small">do que entrou foi poupado</div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card"><div className="card-title">Recebido</div><div className="stat-value" style={{ fontSize: 18, color: 'var(--green)' }}>{fmt(recebido)}</div></div>
        <div className="card"><div className="card-title">Pago</div><div className="stat-value" style={{ fontSize: 18 }}>{fmt(pago)}</div></div>
        <div className="card"><div className="card-title">Ainda a pagar</div><div className="stat-value" style={{ fontSize: 18, color: pendente > 0 ? 'var(--yellow)' : 'var(--green)' }}>{fmt(pendente)}</div></div>
        <div className="card"><div className="card-title">Ainda a receber</div><div className="stat-value" style={{ fontSize: 18, color: aReceber > 0 ? 'var(--blue)' : 'var(--text-muted)' }}>{fmt(aReceber)}</div></div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Despesas por categoria</div>
          {categorias.length === 0
            ? <p className="muted-small">Sem despesas em {mes}.</p>
            : categorias.map(({ cat, total, orcamento, pct }) => {
                const fc = pct === null ? '' : pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : 'ok'
                return (
                  <div key={cat} className="bar-row">
                    <div className="bar-row-label">
                      <span>{cat}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {pct !== null && <span className={`budget-pct-badge ${fc}`}>{Math.round(pct)}%</span>}
                        <strong>{fmt(total)}</strong>
                        {orcamento > 0 && <span className="muted-small">/ {fmt(orcamento)}</span>}
                      </div>
                    </div>
                    <div className="chart-track"><div className="chart-fill neutral" style={{ width: `${(total / maxCat) * 100}%` }} /></div>
                    {pct !== null && (
                      <div className="budget-bar-wrap">
                        <div className="budget-bar-track">
                          <div className={`budget-bar-fill ${fc}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
        </div>

        <div className="card">
          <div className="card-title">Receitas por categoria</div>
          {receitasPorCat.length === 0
            ? <p className="muted-small">Sem receitas em {mes}.</p>
            : receitasPorCat.map(({ cat, total }) => (
                <div key={cat} className="bar-row">
                  <div className="bar-row-label"><span>{cat}</span><strong>{fmt(total)}</strong></div>
                  <div className="chart-track"><div className="chart-fill green" style={{ width: `${(total / maxRec) * 100}%` }} /></div>
                </div>
              ))
          }
          <div className="card-title" style={{ marginTop: 20 }}>Top 5 gastos do mês</div>
          {top5.length === 0
            ? <p className="muted-small">Sem despesas em {mes}.</p>
            : top5.map(l => (
                <div key={l.id} className="list-row" style={{ justifyContent: 'flex-start', gap: 12 }}>
                  <span className="muted-small" style={{ minWidth: 100 }}>{l.categoria || '—'}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{l.descricao}</span>
                  <strong style={{ color: 'var(--red)', fontSize: 13 }}>{fmt(l.valor)}</strong>
                </div>
              ))
          }
        </div>
      </div>
    </>
  )
}
