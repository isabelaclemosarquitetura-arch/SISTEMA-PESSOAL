import { useState } from 'react'
import { t } from '../lib/i18n'
import FinanceiroLancamentos from './FinanceiroLancamentos'
import FinanceiroReceber from './FinanceiroReceber'
import FinanceiroInvestimentos from './FinanceiroInvestimentos'
import FinanceiroCartoes from './FinanceiroCartoes'
import FinanceiroRelatorio from './FinanceiroRelatorio'
import FinanceiroListaCompras from './FinanceiroListaCompras'
import FinanceiroDividas from './FinanceiroDividas'

const SUBTAB_IDS = [
  { id: 'lancamentos',   label: '💰 Lançamentos'   },
  { id: 'dividas',       label: '💳 Dívidas'        },
  { id: 'receber',       label: '📥 A receber'      },
  { id: 'investimentos', label: '📈 Investimentos'  },
  { id: 'cartoes',       label: '💳 Cartões'        },
  { id: 'compras',       label: '🛒 Lista compras'  },
  { id: 'relatorio',     label: '📊 Relatório'      },
]

export default function Financeiro({ data, update, lang = 'pt' }) {
  const [sub, setSub] = useState('lancamentos')
  return (
    <>
      <div className="subtab-nav">
        {SUBTAB_IDS.map(st => (
          <button key={st.id} className={`subtab ${sub === st.id ? 'active' : ''}`} onClick={() => setSub(st.id)}>
            {st.label}
          </button>
        ))}
      </div>
      {sub === 'lancamentos'   && <FinanceiroLancamentos   data={data} update={update} lang={lang} />}
      {sub === 'dividas'       && <FinanceiroDividas        data={data} update={update} lang={lang} />}
      {sub === 'receber'       && <FinanceiroReceber        data={data} update={update} lang={lang} />}
      {sub === 'investimentos' && <FinanceiroInvestimentos  data={data} update={update} lang={lang} />}
      {sub === 'cartoes'       && <FinanceiroCartoes        data={data} update={update} lang={lang} />}
      {sub === 'compras'       && <FinanceiroListaCompras    data={data} update={update} lang={lang} />}
      {sub === 'relatorio'     && <FinanceiroRelatorio      data={data} lang={lang} />}
    </>
  )
}
