import { useMemo, useState } from 'react'
import { fmt, moneyNumber, hojeISO } from '../lib/finance'

export default function FinanceiroReceber({ data, update }) {
  const [feedback, setFeedback] = useState('')
  const lancamentos = data.financeiro || []
  const hoje = hojeISO()

  const receitas = useMemo(() => lancamentos.filter(l => l.tipo === 'Receita'), [lancamentos])
  const previstas = useMemo(() => receitas.filter(l => l.status === 'Prevista').sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || '')), [receitas])
  const recebidas = useMemo(() => receitas.filter(l => l.status === 'Recebida'), [receitas])

  const totalPrevisto = previstas.reduce((s, l) => s + moneyNumber(l.valor), 0)
  const atrasadas = previstas.filter(l => l.vencimento && l.vencimento < hoje)
  const totalAtrasado = atrasadas.reduce((s, l) => s + moneyNumber(l.valor), 0)
  const proximos7dias = previstas.filter(l => l.vencimento && l.vencimento >= hoje && l.vencimento <= addDaysISO(hoje, 7))
  const totalRecebidoMes = recebidas
    .filter(l => (l.dataRecebimento || '').slice(0, 7) === hoje.slice(0, 7))
    .reduce((s, l) => s + moneyNumber(l.valor), 0)

  function addDaysISO(iso, dias) {
    const d = new Date(iso)
    d.setDate(d.getDate() + dias)
    return d.toISOString().slice(0, 10)
  }

  const showFeedback = (msg) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 2400)
  }

  const marcarRecebida = (l) => {
    update('financeiro', lancamentos.map(x => x.id === l.id ? { ...x, status: 'Recebida', dataRecebimento: hoje } : x))
    showFeedback('Recebimento confirmado — saldo e relatórios atualizados.')
  }

  const reabrir = (l) => {
    update('financeiro', lancamentos.map(x => x.id === l.id ? { ...x, status: 'Prevista', dataRecebimento: '' } : x))
  }

  return (
    <>
      <div className="page-header">
        <h2>Valores a Receber</h2>
        <p>Receitas previstas que ainda não entraram no saldo, e recebimentos confirmados</p>
      </div>

      {feedback && <div className="toast-inline">{feedback}</div>}

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Total previsto</div>
          <div className="stat-value" style={{ color: 'var(--blue)', fontSize: 20 }}>{fmt(totalPrevisto)}</div>
        </div>
        <div className="card">
          <div className="card-title">Em atraso</div>
          <div className="stat-value" style={{ color: totalAtrasado > 0 ? 'var(--red)' : 'var(--text)', fontSize: 20 }}>{fmt(totalAtrasado)}</div>
          <div className="muted-small">{atrasadas.length} recebimento{atrasadas.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="card">
          <div className="card-title">Próximos 7 dias</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(proximos7dias.reduce((s, l) => s + moneyNumber(l.valor), 0))}</div>
          <div className="muted-small">{proximos7dias.length} recebimento{proximos7dias.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="card">
          <div className="card-title">Recebido este mês</div>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 20 }}>{fmt(totalRecebidoMes)}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Próximos recebimentos ({previstas.length})</div>
        {previstas.length === 0 ? (
          <p className="muted-small">Nenhuma receita prevista pendente. Tudo recebido!</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th>Data prevista</th>
                  <th>Situação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {previstas.map(l => {
                  const atrasada = l.vencimento && l.vencimento < hoje
                  return (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 500 }}>{l.descricao}</td>
                      <td className="muted-cell">{l.categoria}</td>
                      <td style={{ fontWeight: 600, color: 'var(--green)' }}>{fmt(l.valor)}</td>
                      <td className="muted-cell">{l.vencimento}</td>
                      <td><span className={`badge ${atrasada ? 'badge-red' : 'badge-blue'}`}>{atrasada ? 'Atrasada' : 'No prazo'}</span></td>
                      <td className="table-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => marcarRecebida(l)}>Marcar como recebido</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Recebidas recentemente</div>
        {recebidas.length === 0 ? (
          <p className="muted-small">Nenhuma receita recebida ainda.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th>Recebida em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...recebidas].sort((a, b) => (b.dataRecebimento || '').localeCompare(a.dataRecebimento || '')).slice(0, 15).map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 500 }}>{l.descricao}</td>
                    <td className="muted-cell">{l.categoria}</td>
                    <td style={{ fontWeight: 600, color: 'var(--green)' }}>{fmt(l.valor)}</td>
                    <td className="muted-cell">{l.dataRecebimento}</td>
                    <td className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => reabrir(l)}>Reabrir como prevista</button>
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
