import { useState } from 'react'
import FinanceiroLancamentos from './FinanceiroLancamentos'
import FinanceiroReceber from './FinanceiroReceber'
import FinanceiroInvestimentos from './FinanceiroInvestimentos'
import FinanceiroCartoes from './FinanceiroCartoes'

const SUBTABS = [
  { id: 'lancamentos', label: 'Lançamentos' },
  { id: 'receber', label: 'A Receber' },
  { id: 'investimentos', label: 'Investimentos' },
  { id: 'cartoes', label: 'Cartões' },
]

export default function Financeiro({ data, update }) {
  const [sub, setSub] = useState('lancamentos')

  return (
    <>
      <div className="subtab-nav">
        {SUBTABS.map(t => (
          <button key={t.id} className={`subtab ${sub === t.id ? 'active' : ''}`} onClick={() => setSub(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'lancamentos' && <FinanceiroLancamentos data={data} update={update} />}
      {sub === 'receber' && <FinanceiroReceber data={data} update={update} />}
      {sub === 'investimentos' && <FinanceiroInvestimentos data={data} update={update} />}
      {sub === 'cartoes' && <FinanceiroCartoes data={data} update={update} />}
    </>
  )
}
