import { useMemo, useState } from 'react'
import {
  TIPOS_INVESTIMENTO, INSTITUICOES_INVESTIMENTO, RENTABILIDADE_TIPOS, LIQUIDEZ_OPCOES,
  fmt, moneyNumber, calcularValorAtualInvestimento, buscarCDIAnualAtual, hojeISO,
} from '../lib/finance'

const EMPTY_FORM = {
  nome: '',
  tipo: 'CDI',
  instituicao: 'Mercado Pago',
  instituicaoCustom: '',
  valorInvestido: '',
  dataInvestimento: '',
  rentabilidadeTipo: '% CDI',
  rentabilidadeValor: '120',
  valorAtual: '',
  liquidez: 'Imediata (D+0)',
  liquidezCustom: '',
  aporteMensal: '',
  observacao: '',
}

export default function FinanceiroInvestimentos({ data, update }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [buscandoCDI, setBuscandoCDI] = useState(false)

  const investimentos = data.investimentos || []
  const configCDI = data.configCDI || { taxaAnual: 0, atualizadoEm: '', manual: true }
  const hoje = new Date()

  const showFeedback = (msg) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 2600)
  }

  const linhas = useMemo(() => investimentos.map(item => ({
    item,
    calc: calcularValorAtualInvestimento(item, configCDI.taxaAnual, hoje),
  })), [investimentos, configCDI.taxaAnual])

  const carteira = useMemo(() => {
    const totalInvestido = investimentos.reduce((s, i) => s + moneyNumber(i.valorInvestido), 0)
    const valorAtual = linhas.reduce((s, { calc }) => s + calc.valorAtual, 0)
    const aporteMensalPlanejado = investimentos.reduce((s, i) => s + moneyNumber(i.aporteMensal), 0)
    const rendimento = valorAtual - totalInvestido
    const rendimentoPct = totalInvestido > 0 ? (rendimento / totalInvestido) * 100 : 0
    const porTipo = linhas.reduce((acc, { item, calc }) => {
      const tipo = item.tipo || 'Outros'
      acc[tipo] = (acc[tipo] || 0) + calc.valorAtual
      return acc
    }, {})
    return {
      totalInvestido, valorAtual, aporteMensalPlanejado, rendimento, rendimentoPct,
      porTipo: Object.entries(porTipo).map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total),
    }
  }, [investimentos, linhas])

  const maxInvestTipo = Math.max(1, ...carteira.porTipo.map(i => i.total))

  const handleField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(false)
  }

  const handleSave = () => {
    if (!form.nome.trim() || !form.valorInvestido) {
      showFeedback('Preencha nome e valor investido.')
      return
    }
    const instituicaoFinal = form.instituicao === 'Outros' && form.instituicaoCustom.trim() ? form.instituicaoCustom.trim() : form.instituicao
    const liquidezFinal = form.liquidez === 'Personalizada' && form.liquidezCustom.trim() ? form.liquidezCustom.trim() : form.liquidez

    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      instituicao: instituicaoFinal,
      valorInvestido: form.valorInvestido,
      dataInvestimento: form.dataInvestimento,
      rentabilidadeTipo: form.rentabilidadeTipo,
      rentabilidadeValor: form.rentabilidadeValor,
      valorAtual: form.rentabilidadeTipo === 'Manual' ? (form.valorAtual || form.valorInvestido) : '',
      liquidez: liquidezFinal,
      aporteMensal: form.aporteMensal,
      observacao: form.observacao,
    }

    if ((payload.rentabilidadeTipo === '% CDI' || payload.rentabilidadeTipo === 'Prefixado') && !payload.dataInvestimento) {
      showFeedback('Informe a data do investimento para calcular o rendimento automaticamente.')
      return
    }

    if (editId !== null) {
      update('investimentos', investimentos.map(i => i.id === editId ? { ...payload, id: editId } : i))
      showFeedback('Investimento atualizado.')
    } else {
      update('investimentos', [...investimentos, { ...payload, id: Date.now() }])
      showFeedback('Investimento salvo.')
    }
    resetForm()
  }

  const handleEdit = (item) => {
    setForm({
      ...EMPTY_FORM,
      ...item,
      instituicao: INSTITUICOES_INVESTIMENTO.includes(item.instituicao) ? item.instituicao : 'Outros',
      instituicaoCustom: INSTITUICOES_INVESTIMENTO.includes(item.instituicao) ? '' : item.instituicao,
      liquidez: LIQUIDEZ_OPCOES.includes(item.liquidez) ? item.liquidez : (item.liquidez ? 'Personalizada' : 'Imediata (D+0)'),
      liquidezCustom: LIQUIDEZ_OPCOES.includes(item.liquidez) ? '' : (item.liquidez || ''),
    })
    setEditId(item.id)
    setShowForm(true)
  }

  const handleDelete = (id) => {
    update('investimentos', investimentos.filter(i => i.id !== id))
    showFeedback('Investimento excluído.')
  }

  const atualizarCDI = async () => {
    setBuscandoCDI(true)
    try {
      const { taxaAnual, dataReferencia } = await buscarCDIAnualAtual()
      update('configCDI', { taxaAnual, atualizadoEm: new Date().toISOString(), manual: false, dataReferencia })
      showFeedback(`Taxa CDI atualizada: ${taxaAnual.toFixed(2)}% a.a. (ref. BCB ${dataReferencia})`)
    } catch (e) {
      showFeedback('Não foi possível buscar o CDI agora. Mantendo a taxa atual.')
    } finally {
      setBuscandoCDI(false)
    }
  }

  const setTaxaManual = (valor) => {
    update('configCDI', { ...configCDI, taxaAnual: valor, manual: true })
  }

  return (
    <>
      <div className="page-header page-header-actions">
        <div>
          <h2>Investimentos</h2>
          <p>Carteira pessoal — valor investido, rendimento automático e aportes planejados</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM) }}>
          {showForm ? 'Fechar' : '+ Investimento'}
        </button>
      </div>

      {feedback && <div className="toast-inline">{feedback}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Taxa CDI anual usada nos cálculos</div>
        <div className="form-row" style={{ alignItems: 'center' }}>
          <div className="form-group" style={{ maxWidth: 140 }}>
            <label>CDI anual (%)</label>
            <input type="number" step="0.01" value={configCDI.taxaAnual || ''} onChange={e => setTaxaManual(e.target.value)} />
          </div>
          <button className="btn btn-ghost" onClick={atualizarCDI} disabled={buscandoCDI}>
            {buscandoCDI ? 'Buscando...' : 'Atualizar via Banco Central'}
          </button>
          <span className="muted-small">
            {configCDI.manual ? 'Definida manualmente.' : `Atualizada automaticamente${configCDI.dataReferencia ? ` (ref. ${configCDI.dataReferencia})` : ''}.`}
          </span>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Investido</div>
          <div className="stat-value" style={{ fontSize: 19 }}>{fmt(carteira.totalInvestido)}</div>
        </div>
        <div className="card">
          <div className="card-title">Valor atual</div>
          <div className="stat-value" style={{ color: 'var(--blue)', fontSize: 19 }}>{fmt(carteira.valorAtual)}</div>
        </div>
        <div className="card">
          <div className="card-title">Rendimento</div>
          <div className="stat-value" style={{ color: carteira.rendimento >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 19 }}>{fmt(carteira.rendimento)}</div>
          <div className={`trend ${carteira.rendimento >= 0 ? 'positive' : 'negative'}`}>{carteira.rendimentoPct.toFixed(2)}%</div>
        </div>
        <div className="card">
          <div className="card-title">Aporte mensal planejado</div>
          <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 19 }}>{fmt(carteira.aporteMensalPlanejado)}</div>
          <div className="muted-small">planejamento futuro — não soma ao valor investido</div>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">{editId ? 'Editar investimento' : 'Novo investimento'}</div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-group">
              <label>Nome *</label>
              <input type="text" value={form.nome} onChange={e => handleField('nome', e.target.value)} placeholder="Ex: Reserva de emergência" />
            </div>
            <div className="form-group" style={{ maxWidth: 160 }}>
              <label>Tipo</label>
              <select value={form.tipo} onChange={e => handleField('tipo', e.target.value)}>
                {TIPOS_INVESTIMENTO.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ maxWidth: 160 }}>
              <label>Instituição</label>
              <select value={form.instituicao} onChange={e => handleField('instituicao', e.target.value)}>
                {INSTITUICOES_INVESTIMENTO.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            {form.instituicao === 'Outros' && (
              <div className="form-group">
                <label>Qual instituição?</label>
                <input type="text" value={form.instituicaoCustom} onChange={e => handleField('instituicaoCustom', e.target.value)} />
              </div>
            )}
          </div>

          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-group" style={{ maxWidth: 140 }}>
              <label>Valor investido *</label>
              <input type="number" value={form.valorInvestido} onChange={e => handleField('valorInvestido', e.target.value)} min="0" step="0.01" />
            </div>
            <div className="form-group" style={{ maxWidth: 150 }}>
              <label>Data do investimento</label>
              <input type="date" value={form.dataInvestimento} onChange={e => handleField('dataInvestimento', e.target.value)} />
            </div>
            <div className="form-group" style={{ maxWidth: 140 }}>
              <label>Rentabilidade</label>
              <select value={form.rentabilidadeTipo} onChange={e => handleField('rentabilidadeTipo', e.target.value)}>
                {RENTABILIDADE_TIPOS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            {form.rentabilidadeTipo === '% CDI' && (
              <div className="form-group" style={{ maxWidth: 130 }}>
                <label>% do CDI</label>
                <input type="number" value={form.rentabilidadeValor} onChange={e => handleField('rentabilidadeValor', e.target.value)} placeholder="ex: 120" />
              </div>
            )}
            {form.rentabilidadeTipo === 'Prefixado' && (
              <div className="form-group" style={{ maxWidth: 130 }}>
                <label>Taxa anual (%)</label>
                <input type="number" value={form.rentabilidadeValor} onChange={e => handleField('rentabilidadeValor', e.target.value)} placeholder="ex: 12" />
              </div>
            )}
            {form.rentabilidadeTipo === 'Manual' && (
              <div className="form-group" style={{ maxWidth: 140 }}>
                <label>Valor atual</label>
                <input type="number" value={form.valorAtual} onChange={e => handleField('valorAtual', e.target.value)} min="0" step="0.01" />
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group" style={{ maxWidth: 160 }}>
              <label>Liquidez</label>
              <select value={form.liquidez} onChange={e => handleField('liquidez', e.target.value)}>
                {LIQUIDEZ_OPCOES.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            {form.liquidez === 'Personalizada' && (
              <div className="form-group" style={{ maxWidth: 140 }}>
                <label>Qual prazo?</label>
                <input type="text" value={form.liquidezCustom} onChange={e => handleField('liquidezCustom', e.target.value)} placeholder="ex: D+90" />
              </div>
            )}
            <div className="form-group" style={{ maxWidth: 150 }}>
              <label>Aporte mensal planejado</label>
              <input type="number" value={form.aporteMensal} onChange={e => handleField('aporteMensal', e.target.value)} min="0" step="0.01" placeholder="opcional" />
            </div>
            <div className="form-group">
              <label>Observação</label>
              <input type="text" value={form.observacao} onChange={e => handleField('observacao', e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
              <button className="btn btn-ghost" onClick={resetForm}>Cancelar</button>
            </div>
          </div>
          <p className="muted-small" style={{ marginTop: 10 }}>
            Aporte mensal planejado é só um plano de quanto você pretende investir por mês — não é somado ao valor já investido.
          </p>
        </div>
      )}

      <div className="grid-2 investment-content" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Distribuição da carteira</div>
          {carteira.porTipo.length === 0 ? (
            <p className="muted-small">Nenhum investimento cadastrado ainda.</p>
          ) : carteira.porTipo.map(item => (
            <div key={item.tipo} className="bar-row">
              <div className="bar-row-label"><span>{item.tipo}</span><strong>{fmt(item.total)}</strong></div>
              <div className="chart-track"><div className="chart-fill green" style={{ width: `${(item.total / maxInvestTipo) * 100}%` }} /></div>
            </div>
          ))}
        </div>

        <div className="card table-wrap">
          <div className="card-title">Carteira detalhada</div>
          <table>
            <thead>
              <tr>
                <th>Ativo</th>
                <th>Rentabilidade</th>
                <th>Dias</th>
                <th>Atual</th>
                <th>Resultado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr><td colSpan="6" className="muted-cell">Cadastre seus investimentos para acompanhar a carteira.</td></tr>
              ) : linhas.map(({ item, calc }) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.nome}</strong>
                    <div className="muted-small">{item.tipo} · {item.instituicao}</div>
                  </td>
                  <td className="muted-cell">
                    {item.rentabilidadeTipo === '% CDI' ? `${item.rentabilidadeValor}% CDI` : item.rentabilidadeTipo === 'Prefixado' ? `${item.rentabilidadeValor}% a.a.` : 'Manual'}
                  </td>
                  <td className="muted-cell">{calc.diasCorridos ?? '-'}</td>
                  <td>{fmt(calc.valorAtual)}</td>
                  <td style={{ color: calc.rendimentoAcumulado >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{fmt(calc.rendimentoAcumulado)}</td>
                  <td className="table-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(item)}>Editar</button>
                    <button className="btn btn-danger" onClick={() => handleDelete(item.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
