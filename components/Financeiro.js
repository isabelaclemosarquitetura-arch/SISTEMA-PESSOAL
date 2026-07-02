import { useState } from 'react'
import { t } from '../lib/i18n'
import FinanceiroLancamentos from './FinanceiroLancamentos'
import FinanceiroReceber from './FinanceiroReceber'
import FinanceiroInvestimentos from './FinanceiroInvestimentos'
import FinanceiroCartoes from './FinanceiroCartoes'
import FinanceiroRelatorio from './FinanceiroRelatorio'

const SUBTAB_IDS = [
  { id: 'lancamentos',   key: 'fin.transactions'  },
  { id: 'receber',       key: 'fin.toReceive'      },
  { id: 'investimentos', key: 'fin.investments'    },
  { id: 'cartoes',       key: 'fin.cards'          },
  { id: 'relatorio',     key: 'fin.report'         },
]

export default function Financeiro({ data, update, lang = 'pt' }) {
  const [sub, setSub] = useState('lancamentos')
  const SUBTABS = SUBTAB_IDS.map(s => ({ ...s, label: t(lang, s.key) }))
  return (
    <>
      <div className="subtab-nav">
        {SUBTABS.map(st => (
          <button key={st.id} className={`subtab ${sub === st.id ? 'active' : ''}`} onClick={() => setSub(st.id)}>
            {st.label}
          </button>
        ))}
      </div>
      {sub === 'lancamentos'   && <FinanceiroLancamentos   data={data} update={update} lang={lang} />}
      {sub === 'receber'       && <FinanceiroReceber        data={data} update={update} lang={lang} />}
      {sub === 'investimentos' && <FinanceiroInvestimentos  data={data} update={update} lang={lang} />}
      {sub === 'cartoes'       && <FinanceiroCartoes        data={data} update={update} lang={lang} />}
      {sub === 'relatorio'     && <FinanceiroRelatorio      data={data} lang={lang} />}
    </>
  )
}
