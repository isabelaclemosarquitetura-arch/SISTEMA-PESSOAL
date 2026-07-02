import { useMemo, useState } from 'react'
import { t } from '../lib/i18n'
import { fmt, moneyNumber, hojeISO } from '../lib/finance'

export default function FinanceiroReceber({ data, update, lang = 'pt' }) {
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
        <h2>{t(lang,'rec.title')}</h2>
        <p>{t(lang,'rec.sub')}</p>
      </div>

      {feedback && <div className="toast-inline">{feedback}</div>}

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">{t(lang,'rec.totalExp')}</div>
          <div className="stat-value" style={{ color: 'var(--blue)', fontSize: 20 }}>{fmt(totalPrevisto)}</div>
        </div>
        <div className="card">
          <div className="card-title">{t(lang,'rec.late')}</div>
          <div className="stat-value" style={{ color: totalAtrasado > 0 ? 'var(--red)' : 'var(--text)', fontSize: 20 }}>{fmt(totalAtrasado)}</div>
          <div className="muted-small">{atrasadas.length} {atrasadas.length !== 1 ? t(lang,'rec.payments') : t(lang,'rec.payment')}</div>
        </div>
        <div className="card">
          <div className="card-title">{t(lang,'rec.next7')}</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(proximos7dias.reduce((s, l) => s + moneyNumber(l.valor), 0))}</div>
          <div className="muted-small">{proximos7dias.length} {proximos7dias.length !== 1 ? t(lang,'rec.payments') : t(lang,'rec.payment')}</div>
        </div>
        <div className="card">
          <div className="card-title">{t(lang,'rec.receivedMonth')}</div>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 20 }}>{fmt(totalRecebidoMes)}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">{t(lang,'rec.upcomingTitle',previstas.length)}</div>
        {previstas.length === 0 ? (
          <p className="muted-small">{t(lang,'rec.none')}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t(lang,'rec.desc')}</th>
                  <th>{t(lang,'rec.cat')}</th>
                  <th>{t(lang,'rec.value')}</th>
                  <th>{t(lang,'rec.expectedDate')}</th>
                  <th>{t(lang,'rec.situation')}</th>
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
                      <td><span className={`badge ${atrasada ? 'badge-red' : 'badge-blue'}`}>{atrasada ? t(lang,'rec.lateBadge') : t(lang,'rec.onTime')}</span></td>
                      <td className="table-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => marcarRecebida(l)}>{t(lang,'rec.markReceived')}</button>
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
        <div className="card-title">{t(lang,'rec.recentTitle')}</div>
        {recebidas.length === 0 ? (
          <p className="muted-small">{t(lang,'rec.noneReceived')}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t(lang,'rec.desc')}</th>
                  <th>{t(lang,'rec.cat')}</th>
                  <th>{t(lang,'rec.value')}</th>
                  <th>{t(lang,'rec.receivedOn')}</th>
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
                      <button className="btn btn-ghost btn-sm" onClick={() => reabrir(l)}>{t(lang,'rec.reopen')}</button>
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
