import { useState, useMemo } from 'react'
import { fmt, moneyNumber, fmtDataBR, hojeISO, gerarParcelas, mesDeISO } from '../lib/finance'

// ── Constantes ──
const TIPOS_PROJETO = ['Residencial', 'Comercial', 'Hotelaria', 'Varejo', 'Escritório', 'Paisagismo', 'Design de Interiores', 'Detalhamentos', '3D']
const STATUS_PROJETO = ['Planejamento', 'Em andamento', 'Aguardando cliente', 'Pausado', 'Concluído', 'Cancelado']
const STATUS_TAREFA = ['A fazer', 'Em andamento', 'Concluída', 'Aguardando cliente', 'Bloqueada']
const PRIORIDADE_TAREFA = ['Baixa', 'Média', 'Alta', 'Urgente']
const FORMAS_PAGAMENTO_PROJ = ['À vista', 'Pix', 'Cartão', 'Boleto', 'Transferência', 'Dinheiro', 'Parcelado']
const CATS_GASTO = ['Impressão', 'Deslocamento', 'Material', 'Renderização', 'Software', 'Terceirização', 'Plotagem', 'Outros']
const STATUS_RECEBIMENTO = ['Pendente', 'Recebido', 'Vencido']

const EMPTY_PROJETO = {
  nome: '', cliente: '', tipo: 'Residencial', dataInicio: '', duracaoDias: '',
  dataFim: '', status: 'Planejamento', observacoes: '', valorContratado: '',
  formaPagamento: 'À vista', tarefas: [], recebimentos: [], gastos: [],
  vencimento: '', parcelado: false, qtdParcelas: '',
}

const EMPTY_TAREFA = {
  nome: '', descricao: '', status: 'A fazer', prioridade: 'Média',
  dataInicio: '', dataFim: '', dependeDe: '',
}

const EMPTY_RECEBIMENTO = {
  valor: '', vencimento: '', dataPagamento: '', status: 'Pendente',
  formaPagamento: 'Pix', observacao: '', vincularFinanceiro: false,
}

const EMPTY_GASTO = {
  descricao: '', valor: '', data: '', categoria: 'Impressão',
  formaPagamento: 'Pix', observacao: '', vincularFinanceiro: false,
}

// ── Helpers ──
function addDias(isoDate, dias) {
  if (!isoDate || !dias) return ''
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + Number(dias))
  return d.toISOString().slice(0, 10)
}

function calcProgresso(tarefas) {
  if (!tarefas || tarefas.length === 0) return null
  return Math.round((tarefas.filter(t => t.status === 'Concluída').length / tarefas.length) * 100)
}

function statusAtualProjeto(proj) {
  if (proj.status === 'Concluído' || proj.status === 'Cancelado') return proj.status
  if (proj.dataFim && proj.dataFim < hojeISO() && proj.status !== 'Concluído') return 'Atrasado'
  return proj.status
}

function corStatus(s) {
  return { 'Planejamento': 'var(--blue)', 'Em andamento': 'var(--accent)', 'Aguardando cliente': 'var(--yellow)', 'Pausado': 'var(--text-muted)', 'Concluído': 'var(--green)', 'Cancelado': 'var(--red)', 'Atrasado': 'var(--red)' }[s] || 'var(--text-muted)'
}

function corPrioridade(p) {
  return { 'Baixa': 'var(--text-muted)', 'Média': 'var(--blue)', 'Alta': 'var(--yellow)', 'Urgente': 'var(--red)' }[p] || 'var(--text-muted)'
}

function gerarCodigo(contador) {
  return `PROJ-${String(contador + 1).padStart(3, '0')}`
}

// ── Componente Principal ──
export default function TrabalhoProjetos({ data, update, lang, projetoSelecionadoId, onVoltar }) {
  const projetos = data.projetos || []
  const projetoContador = data.projetoContador || 0

  const [view, setView] = useState(projetoSelecionadoId ? 'detail' : 'list') // 'list' | 'form' | 'detail'
  const [projetoId, setProjetoId] = useState(projetoSelecionadoId || null)
  const [form, setForm] = useState({ ...EMPTY_PROJETO })
  const [editId, setEditId] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busca, setBusca] = useState('')

  const showFeedback = (msg) => { setFeedback(msg); setTimeout(() => setFeedback(''), 2500) }

  const projetoAtual = projetos.find(p => p.id === projetoId)

  // ── Filtros ──
  const projetosFiltrados = useMemo(() => {
    return projetos.filter(p => {
      const st = statusAtualProjeto(p)
      if (filtroStatus && st !== filtroStatus) return false
      if (filtroTipo && p.tipo !== filtroTipo) return false
      if (busca) {
        const q = busca.toLowerCase()
        return p.codigo?.toLowerCase().includes(q) || p.nome?.toLowerCase().includes(q) || p.cliente?.toLowerCase().includes(q)
      }
      return true
    })
  }, [projetos, filtroStatus, filtroTipo, busca])

  // ── CRUD Projeto ──
  const handleFieldProjeto = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'dataInicio' || k === 'duracaoDias') {
        next.dataFim = addDias(k === 'dataInicio' ? v : next.dataInicio, k === 'duracaoDias' ? v : next.duracaoDias)
      }
      return next
    })
  }

  const handleSaveProjeto = () => {
    if (!form.nome.trim()) { showFeedback('Nome do projeto é obrigatório.'); return }
    if (editId) {
      update('projetos', projetos.map(p => p.id === editId ? { ...p, ...form } : p))
      showFeedback('Projeto atualizado!')
    } else {
      const projId = String(Date.now())
      const novoProj = {
        ...form, id: projId, codigo: gerarCodigo(projetoContador),
        criadoEm: hojeISO(), tarefas: [], recebimentos: [], gastos: [],
      }
      
      let financeiroUpdates = []
      let novosRecebimentos = []
      
      if (form.valorContratado && form.vencimento) {
         if (form.parcelado && Number(form.qtdParcelas) > 1) {
            const baseItem = {
              grupoId: `proj-rec-${projId}`,
              tipo: 'Receita', categoria: 'Recebimento Projeto',
              descricao: `${form.nome}${form.cliente ? ` (${form.cliente})` : ''}`,
              formaPagamento: form.formaPagamento, cartao: '',
              observacao: '', recorrente: false, recorrenciaGrupoId: '',
              pagamentoAutomatico: false, _projetoId: projId,
            }
            const parcelas = gerarParcelas({
               valorTotal: Number(form.valorContratado),
               qtdParcelas: Number(form.qtdParcelas),
               dataInicioISO: form.vencimento,
               baseItem
            })
            // Ajustar o status das parcelas
            const financeiroParcelas = parcelas.map(p => ({ ...p, status: 'Prevista' }))
            financeiroUpdates = financeiroParcelas
            
            novosRecebimentos = financeiroParcelas.map(p => ({
               id: p.id, // o id do recebimento no projeto é o mesmo id do financeiro para fácil sync
               valor: p.valor,
               vencimento: p.vencimento,
               dataPagamento: '',
               status: 'Pendente',
               formaPagamento: p.formaPagamento,
               observacao: `Parcela ${p.parcela}`,
            }))
         } else {
            const finId = `proj-rec-${projId}-av`
            const novaReceita = {
              id: finId, tipo: 'Receita', categoria: 'Recebimento Projeto',
              descricao: `${form.nome}${form.cliente ? ` (${form.cliente})` : ''}`,
              valor: String(Number(form.valorContratado).toFixed(2)), status: 'Prevista', pago: false,
              vencimento: form.vencimento,
              mes: mesDeISO(form.vencimento),
              dataRecebimento: '',
              recorrente: false, recorrenciaGrupoId: '', formaPagamento: form.formaPagamento,
              _projetoId: projId,
            }
            financeiroUpdates = [novaReceita]
            novosRecebimentos = [{
               id: finId,
               valor: Number(form.valorContratado),
               vencimento: form.vencimento,
               dataPagamento: '',
               status: 'Pendente',
               formaPagamento: form.formaPagamento,
               observacao: 'À vista',
            }]
         }
      }
      novoProj.recebimentos = novosRecebimentos

      if (financeiroUpdates.length > 0) {
        update({ 
           projetos: [...projetos, novoProj], 
           projetoContador: projetoContador + 1,
           financeiro: [...(data.financeiro || []), ...financeiroUpdates] 
        })
      } else {
        update({ projetos: [...projetos, novoProj], projetoContador: projetoContador + 1 })
      }
      showFeedback('Projeto criado e financeiro atualizado! 🎉')
    }
    setForm({ ...EMPTY_PROJETO }); setEditId(null); setView('list')
  }

  const handleDeleteProjeto = (proj) => {
    if (!window.confirm(`Excluir projeto "${proj.nome}" (${proj.codigo})?`)) return
    update('projetos', projetos.filter(p => p.id !== proj.id))
    showFeedback('Projeto excluído.')
    if (projetoId === proj.id) { setProjetoId(null); setView('list') }
  }

  const abrirDetalhe = (proj) => { setProjetoId(proj.id); setView('detail') }
  const abrirForm = (proj = null) => {
    if (proj) { setForm({ ...EMPTY_PROJETO, ...proj }); setEditId(proj.id) } else { setForm({ ...EMPTY_PROJETO }); setEditId(null) }
    setView('form')
  }

  // ── Atualizar subseções do projeto ──
  const updateProjeto = (id, campo, valor) => {
    update('projetos', projetos.map(p => p.id === id ? { ...p, [campo]: valor } : p))
  }

  // ── LISTAGEM ──
  if (view === 'list') {
    return (
      <>
        <div className="page-header page-header-actions">
          <div><h2>📁 Projetos</h2><p>Gerencie seus projetos de arquitetura</p></div>
          <button className="btn btn-primary" onClick={() => abrirForm()}>+ Novo Projeto</button>
        </div>
        {feedback && <div className="toast-inline">{feedback}</div>}

        {/* Filtros */}
        <div className="filter-row" style={{ marginBottom: 16 }}>
          <input type="text" placeholder="Buscar por código, nome ou cliente..." value={busca} onChange={e => setBusca(e.target.value)} style={{ minWidth: 260 }} />
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">Todos os status</option>
            {[...STATUS_PROJETO, 'Atrasado'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">Todos os tipos</option>
            {TIPOS_PROJETO.map(t => <option key={t}>{t}</option>)}
          </select>
          {(busca || filtroStatus || filtroTipo) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroTipo('') }}>✕ Limpar</button>
          )}
        </div>

        {projetosFiltrados.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📁</div>
            <p className="muted-small">{projetos.length === 0 ? 'Nenhum projeto criado ainda.' : 'Nenhum projeto encontrado com os filtros selecionados.'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {projetosFiltrados.map(proj => {
              const st = statusAtualProjeto(proj)
              const progresso = calcProgresso(proj.tarefas)
              const { totalRecebido, lucroRealizado } = calcFinanceiro(proj)
              return (
                <div key={proj.id} className="card projeto-card" style={{ cursor: 'pointer' }} onClick={() => abrirDetalhe(proj)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 6 }}>{proj.codigo}</span>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{proj.nome}</span>
                        <span className="badge" style={{ background: corStatus(st) + '22', color: corStatus(st), border: `1px solid ${corStatus(st)}40` }}>{st}</span>
                        <span className="badge badge-gray">{proj.tipo}</span>
                      </div>
                      {proj.cliente && <div className="muted-small">👤 {proj.cliente}</div>}
                      <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 13 }}>
                        {proj.dataInicio && <span>📅 Início: {fmtDataBR(proj.dataInicio)}</span>}
                        {proj.dataFim && <span style={{ color: st === 'Atrasado' ? 'var(--red)' : 'inherit' }}>🏁 Entrega: {fmtDataBR(proj.dataFim)}</span>}
                        {proj.valorContratado && <span>💰 {fmt(proj.valorContratado)}</span>}
                      </div>
                      {progresso !== null && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Progresso: {progresso}%</div>
                          <div className="chart-track" style={{ height: 6 }}>
                            <div style={{ height: '100%', width: `${progresso}%`, background: progresso >= 100 ? 'var(--green)' : 'var(--accent)', borderRadius: 4 }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginLeft: 16 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { abrirForm(proj) }}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProjeto(proj)}>Excluir</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </>
    )
  }

  // ── FORMULÁRIO ──
  if (view === 'form') {
    return (
      <>
        <div className="page-header page-header-actions">
          <div>
            <h2>{editId ? `Editar: ${form.nome || 'Projeto'}` : 'Novo Projeto'}</h2>
            <p>{editId ? '' : `Código: ${gerarCodigo(projetoContador)}`}</p>
          </div>
          <button className="btn btn-ghost" onClick={() => { setView('list'); setEditId(null); setForm({ ...EMPTY_PROJETO }) }}>← Voltar</button>
        </div>
        {feedback && <div className="toast-inline">{feedback}</div>}

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Informações do Projeto</div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Nome do projeto *</label>
              <input type="text" value={form.nome} onChange={e => handleFieldProjeto('nome', e.target.value)} placeholder="Ex: Residência Silva, Loja Centro..." />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Cliente</label>
              <input type="text" value={form.cliente} onChange={e => handleFieldProjeto('cliente', e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="form-group" style={{ maxWidth: 180 }}>
              <label>Tipo</label>
              <select value={form.tipo} onChange={e => handleFieldProjeto('tipo', e.target.value)}>
                {TIPOS_PROJETO.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ maxWidth: 170 }}>
              <label>Status</label>
              <select value={form.status} onChange={e => handleFieldProjeto('status', e.target.value)}>
                {STATUS_PROJETO.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-group" style={{ maxWidth: 160 }}>
              <label>Data de início</label>
              <input type="date" value={form.dataInicio} onChange={e => handleFieldProjeto('dataInicio', e.target.value)} />
            </div>
            <div className="form-group" style={{ maxWidth: 140 }}>
              <label>Duração (dias)</label>
              <input type="number" min="1" value={form.duracaoDias} onChange={e => handleFieldProjeto('duracaoDias', e.target.value)} placeholder="Ex: 30" />
            </div>
            <div className="form-group" style={{ maxWidth: 160 }}>
              <label>Data de término</label>
              <input type="date" value={form.dataFim} onChange={e => handleFieldProjeto('dataFim', e.target.value)} />
            </div>
            <div className="form-group" style={{ maxWidth: 160 }}>
              <label>Valor contratado</label>
              <input type="number" min="0" step="0.01" value={form.valorContratado} onChange={e => handleFieldProjeto('valorContratado', e.target.value)} placeholder="0,00" />
            </div>
            <div className="form-group" style={{ maxWidth: 180 }}>
              <label>Forma de pagamento</label>
              <select value={form.formaPagamento} onChange={e => handleFieldProjeto('formaPagamento', e.target.value)}>
                {FORMAS_PAGAMENTO_PROJ.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            {!editId && (
              <>
                <div className="form-group" style={{ maxWidth: 155 }}>
                  <label>Vencimento</label>
                  <input type="date" value={form.vencimento} onChange={e => handleFieldProjeto('vencimento', e.target.value)} />
                </div>
                <div className="form-group" style={{ maxWidth: 140, display: 'flex', alignItems: 'center', marginTop: 24 }}>
                  <label className="checkbox-label" style={{ marginBottom: 0 }}>
                    <input type="checkbox" checked={form.parcelado} onChange={e => handleFieldProjeto('parcelado', e.target.checked)} />
                    Parcelado
                  </label>
                </div>
                {form.parcelado && (
                  <div className="form-group" style={{ maxWidth: 120 }}>
                    <label>Qtd parcelas</label>
                    <input type="number" min="2" max="120" value={form.qtdParcelas} onChange={e => handleFieldProjeto('qtdParcelas', e.target.value)} placeholder="Ex: 3" />
                  </div>
                )}
              </>
            )}
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Observações</label>
              <textarea value={form.observacoes} onChange={e => handleFieldProjeto('observacoes', e.target.value)} rows={2} placeholder="Escopo, briefing, informações relevantes..." style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleSaveProjeto}>
            {editId ? 'Salvar alterações' : 'Criar projeto'}
          </button>
          <button className="btn btn-ghost" onClick={() => { setView('list'); setEditId(null); setForm({ ...EMPTY_PROJETO }) }}>Cancelar</button>
        </div>
      </>
    )
  }

  // ── DETALHE ──
  if (view === 'detail' && projetoAtual) {
    return (
      <ProjetoDetalhe
        projeto={projetoAtual}
        projetos={projetos}
        data={data}
        update={update}
        updateProjeto={updateProjeto}
        onVoltar={() => { setView('list'); setProjetoId(null) }}
        onEditar={() => abrirForm(projetoAtual)}
        showFeedback={showFeedback}
        feedback={feedback}
      />
    )
  }

  return null
}

// ── Helper financeiro para listagem ──
function calcFinanceiro(proj) {
  const totalRecebido = (proj.recebimentos || []).filter(r => r.status === 'Recebido').reduce((s, r) => s + moneyNumber(r.valor), 0)
  const totalGasto = (proj.gastos || []).reduce((s, g) => s + moneyNumber(g.valor), 0)
  return { totalRecebido, lucroRealizado: totalRecebido - totalGasto }
}

// ── Componente de Detalhe do Projeto ──
function ProjetoDetalhe({ projeto, projetos, data, update, updateProjeto, onVoltar, onEditar, showFeedback, feedback }) {
  const [activeTab, setActiveTab] = useState('tarefas')
  const [tarefaForm, setTarefaForm] = useState({ ...EMPTY_TAREFA })
  const [editTarefaId, setEditTarefaId] = useState(null)
  const [showTarefaForm, setShowTarefaForm] = useState(false)
  const [recForm, setRecForm] = useState({ ...EMPTY_RECEBIMENTO })
  const [showRecForm, setShowRecForm] = useState(false)
  const [editRecId, setEditRecId] = useState(null)
  const [gastoForm, setGastoForm] = useState({ ...EMPTY_GASTO })
  const [showGastoForm, setShowGastoForm] = useState(false)
  const [editGastoId, setEditGastoId] = useState(null)

  const progresso = calcProgresso(projeto.tarefas)
  const st = statusAtualProjeto(projeto)
  const { totalRecebido, totalPendente, totalGasto, lucroRealizado, lucroPrevisto } = calcFinanceiroDetalhe(projeto)

  // ── Tarefas ──
  const handleSaveTarefa = () => {
    if (!tarefaForm.nome.trim()) { showFeedback('Nome da tarefa é obrigatório.'); return }
    const tarefas = projeto.tarefas || []
    if (editTarefaId) {
      updateProjeto(projeto.id, 'tarefas', tarefas.map(t => t.id === editTarefaId ? { ...t, ...tarefaForm } : t))
    } else {
      updateProjeto(projeto.id, 'tarefas', [...tarefas, { ...tarefaForm, id: String(Date.now()) }])
    }
    setTarefaForm({ ...EMPTY_TAREFA }); setEditTarefaId(null); setShowTarefaForm(false)
    showFeedback('Tarefa salva!')
  }

  const toggleTarefa = (tarefa) => {
    const novoStatus = tarefa.status === 'Concluída' ? 'A fazer' : 'Concluída'
    updateProjeto(projeto.id, 'tarefas', (projeto.tarefas || []).map(t => t.id === tarefa.id ? { ...t, status: novoStatus } : t))
  }

  // ── Recebimentos ──
  const handleSaveRec = () => {
    if (!recForm.valor) { showFeedback('Informe o valor.'); return }
    const recs = projeto.recebimentos || []
    const isEdit = !!editRecId
    const recId = isEdit ? editRecId : `proj-rec-${Date.now()}`
    
    const recEditado = { ...recForm, id: recId, valor: Number(recForm.valor) }
    const novoRecs = isEdit ? recs.map(r => r.id === recId ? recEditado : r) : [...recs, recEditado]

    const payloadFinanceiro = {
      id: recId, tipo: 'Receita', categoria: 'Recebimento Projeto',
      descricao: `${projeto.nome}${projeto.cliente ? ` (${projeto.cliente})` : ''} - ${recEditado.observacao || 'Recebimento'}`,
      valor: String(recEditado.valor),
      status: recEditado.status === 'Recebido' ? 'Recebida' : 'Prevista',
      pago: false,
      vencimento: recEditado.vencimento || hojeISO(),
      mes: mesDeISO(recEditado.vencimento || hojeISO()),
      dataRecebimento: recEditado.status === 'Recebido' ? (recEditado.dataPagamento || hojeISO()) : '',
      recorrente: false, recorrenciaGrupoId: '', formaPagamento: recEditado.formaPagamento,
      _projetoId: projeto.id
    }

    let novoFinanceiro = data.financeiro || []
    if (isEdit && novoFinanceiro.find(f => f.id === recId)) {
      novoFinanceiro = novoFinanceiro.map(f => f.id === recId ? { ...f, ...payloadFinanceiro } : f)
    } else {
      novoFinanceiro = [...novoFinanceiro, payloadFinanceiro]
    }

    update({ 
      projetos: projetos.map(p => p.id === projeto.id ? { ...p, recebimentos: novoRecs } : p), 
      financeiro: novoFinanceiro 
    })

    setRecForm({ ...EMPTY_RECEBIMENTO }); setEditRecId(null); setShowRecForm(false)
    showFeedback('Recebimento salvo!')
  }

  const marcarComoRecebido = (rec) => {
    const recId = rec.id
    const dataHj = hojeISO()
    const recs = (projeto.recebimentos || []).map(r => r.id === recId ? { ...r, status: 'Recebido', dataPagamento: dataHj } : r)
    
    let novoFinanceiro = data.financeiro || []
    if (novoFinanceiro.find(f => f.id === recId)) {
      novoFinanceiro = novoFinanceiro.map(f => f.id === recId ? { ...f, status: 'Recebida', dataRecebimento: dataHj } : f)
    }

    update({
      projetos: projetos.map(p => p.id === projeto.id ? { ...p, recebimentos: recs } : p),
      financeiro: novoFinanceiro
    })
    showFeedback('Marcado como recebido!')
  }

  const excluirRecebimento = (r) => {
    if (!window.confirm('Excluir este recebimento? O lançamento também será apagado do Financeiro Pessoal.')) return
    const recs = (projeto.recebimentos || []).filter(x => x.id !== r.id)
    const novoFinanceiro = (data.financeiro || []).filter(f => f.id !== r.id)
    update({
      projetos: projetos.map(p => p.id === projeto.id ? { ...p, recebimentos: recs } : p),
      financeiro: novoFinanceiro
    })
    showFeedback('Recebimento excluído!')
  }

  // ── Gastos ──
  const handleSaveGasto = () => {
    if (!gastoForm.descricao || !gastoForm.valor) { showFeedback('Preencha descrição e valor.'); return }
    const gastos = projeto.gastos || []
    const isEdit = !!editGastoId
    const gastoId = isEdit ? editGastoId : `proj-gasto-${Date.now()}`
    
    const gastoEditado = { ...gastoForm, id: gastoId, valor: Number(gastoForm.valor) }
    const novoGastos = isEdit ? gastos.map(g => g.id === gastoId ? gastoEditado : g) : [...gastos, gastoEditado]

    const payloadFinanceiro = {
      id: gastoId, tipo: 'Despesa', categoria: 'Trabalho',
      descricao: `${gastoEditado.descricao} — ${projeto.nome}`,
      valor: String(gastoEditado.valor), status: 'Pago', pago: true,
      vencimento: gastoEditado.data || hojeISO(), mes: mesDeISO(gastoEditado.data || hojeISO()),
      formaPagamento: gastoEditado.formaPagamento, cartao: '',
      recorrente: false, recorrenciaGrupoId: '', observacao: gastoEditado.observacao,
      _projetoId: projeto.id
    }

    let novoFinanceiro = data.financeiro || []
    if (isEdit && novoFinanceiro.find(f => f.id === gastoId)) {
      novoFinanceiro = novoFinanceiro.map(f => f.id === gastoId ? { ...f, ...payloadFinanceiro } : f)
    } else {
      novoFinanceiro = [...novoFinanceiro, payloadFinanceiro]
    }

    update({ 
      projetos: projetos.map(p => p.id === projeto.id ? { ...p, gastos: novoGastos } : p), 
      financeiro: novoFinanceiro 
    })

    setGastoForm({ ...EMPTY_GASTO }); setEditGastoId(null); setShowGastoForm(false)
    showFeedback('Gasto salvo!')
  }

  const excluirGasto = (g) => {
    if (!window.confirm('Excluir este gasto? O lançamento também será apagado do Financeiro Pessoal.')) return
    const gastos = (projeto.gastos || []).filter(x => x.id !== g.id)
    const novoFinanceiro = (data.financeiro || []).filter(f => f.id !== g.id)
    update({
      projetos: projetos.map(p => p.id === projeto.id ? { ...p, gastos: gastos } : p),
      financeiro: novoFinanceiro
    })
    showFeedback('Gasto excluído!')
  }

  const SUBTABS_DETALHE = [
    { id: 'tarefas', label: '✅ Tarefas' },
    { id: 'financeiro', label: '💰 Financeiro' },
    { id: 'recebimentos', label: '📥 Recebimentos' },
    { id: 'gastos', label: '💸 Gastos' },
  ]

  return (
    <>
      {feedback && <div className="toast-inline">{feedback}</div>}

      {/* Header do projeto */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={onVoltar}>← Projetos</button>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{projeto.codigo}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>{projeto.nome}</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge" style={{ background: corStatus(st) + '22', color: corStatus(st) }}>{st}</span>
              <span className="badge badge-gray">{projeto.tipo}</span>
              {projeto.cliente && <span className="muted-small">👤 {projeto.cliente}</span>}
              {projeto.dataInicio && <span className="muted-small">📅 {fmtDataBR(projeto.dataInicio)}</span>}
              {projeto.dataFim && <span className="muted-small" style={{ color: st === 'Atrasado' ? 'var(--red)' : 'inherit' }}>🏁 {fmtDataBR(projeto.dataFim)}</span>}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onEditar}>✏️ Editar</button>
        </div>

        {/* Progresso */}
        {progresso !== null && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, marginBottom: 6, display: 'flex', gap: 12 }}>
              <span>Progresso: <strong>{progresso}%</strong></span>
              <span className="muted-small">({(projeto.tarefas || []).filter(t => t.status === 'Concluída').length}/{(projeto.tarefas || []).length} tarefas)</span>
            </div>
            <div className="chart-track" style={{ height: 10 }}>
              <div style={{ height: '100%', width: `${progresso}%`, background: progresso >= 100 ? 'var(--green)' : 'var(--accent)', borderRadius: 6, transition: 'width 0.4s' }} />
            </div>
          </div>
        )}
        {progresso === null && <p className="muted-small" style={{ marginTop: 8 }}>Sem tarefas — progresso não definido.</p>}
        {projeto.observacoes && <p className="muted-small" style={{ marginTop: 8 }}>{projeto.observacoes}</p>}
      </div>

      {/* Sub-tabs */}
      <div className="subtab-nav" style={{ marginBottom: 16 }}>
        {SUBTABS_DETALHE.map(st => (
          <button key={st.id} className={`subtab ${activeTab === st.id ? 'active' : ''}`} onClick={() => setActiveTab(st.id)}>
            {st.label}
          </button>
        ))}
      </div>

      {/* ── TAREFAS ── */}
      {activeTab === 'tarefas' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => { setTarefaForm({ ...EMPTY_TAREFA }); setEditTarefaId(null); setShowTarefaForm(s => !s) }}>
              {showTarefaForm ? 'Fechar' : '+ Nova tarefa'}
            </button>
          </div>
          {showTarefaForm && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">{editTarefaId ? 'Editar tarefa' : 'Nova tarefa'}</div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Nome *</label>
                  <input type="text" value={tarefaForm.nome} onChange={e => setTarefaForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Levantamento, Projeto Executivo..." />
                </div>
                <div className="form-group" style={{ maxWidth: 160 }}>
                  <label>Status</label>
                  <select value={tarefaForm.status} onChange={e => setTarefaForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_TAREFA.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ maxWidth: 130 }}>
                  <label>Prioridade</label>
                  <select value={tarefaForm.prioridade} onChange={e => setTarefaForm(f => ({ ...f, prioridade: e.target.value }))}>
                    {PRIORIDADE_TAREFA.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-group" style={{ maxWidth: 155 }}>
                  <label>Data início</label>
                  <input type="date" value={tarefaForm.dataInicio} onChange={e => setTarefaForm(f => ({ ...f, dataInicio: e.target.value }))} />
                </div>
                <div className="form-group" style={{ maxWidth: 155 }}>
                  <label>Data término</label>
                  <input type="date" value={tarefaForm.dataFim} onChange={e => setTarefaForm(f => ({ ...f, dataFim: e.target.value }))} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Descrição</label>
                  <input type="text" value={tarefaForm.descricao} onChange={e => setTarefaForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhes da tarefa..." />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleSaveTarefa}>Salvar</button>
                <button className="btn btn-ghost" onClick={() => { setShowTarefaForm(false); setEditTarefaId(null) }}>Cancelar</button>
              </div>
            </div>
          )}
          {(projeto.tarefas || []).length === 0 ? (
            <div className="card"><p className="muted-small">Nenhuma tarefa cadastrada. Clique em "+ Nova tarefa".</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(projeto.tarefas || []).map(tarefa => {
                const concluida = tarefa.status === 'Concluída'
                const atrasada = tarefa.dataFim && tarefa.dataFim < hojeISO() && !concluida
                return (
                  <div key={tarefa.id} className="card" style={{ padding: '12px 16px', opacity: concluida ? 0.7 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <input type="checkbox" checked={concluida} onChange={() => toggleTarefa(tarefa)} style={{ accentColor: 'var(--green)', width: 18, height: 18, marginTop: 2, cursor: 'pointer', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, textDecoration: concluida ? 'line-through' : 'none' }}>{tarefa.nome}</span>
                          <span className="badge badge-gray" style={{ fontSize: 11 }}>{tarefa.status}</span>
                          <span style={{ fontSize: 11, color: corPrioridade(tarefa.prioridade), fontWeight: 600 }}>{tarefa.prioridade}</span>
                          {atrasada && <span className="badge badge-red" style={{ fontSize: 11 }}>⚠ Atrasada</span>}
                        </div>
                        {tarefa.descricao && <div className="muted-small" style={{ marginTop: 2 }}>{tarefa.descricao}</div>}
                        {(tarefa.dataInicio || tarefa.dataFim) && (
                          <div className="muted-small" style={{ marginTop: 2 }}>
                            {tarefa.dataInicio && `Início: ${fmtDataBR(tarefa.dataInicio)}`}
                            {tarefa.dataInicio && tarefa.dataFim && ' → '}
                            {tarefa.dataFim && `Término: ${fmtDataBR(tarefa.dataFim)}`}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setTarefaForm({ ...EMPTY_TAREFA, ...tarefa }); setEditTarefaId(tarefa.id); setShowTarefaForm(true) }}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => updateProjeto(projeto.id, 'tarefas', (projeto.tarefas || []).filter(t => t.id !== tarefa.id))}>✕</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── FINANCEIRO (RESUMO) ── */}
      {activeTab === 'financeiro' && (
        <div className="grid-3">
          <div className="card">
            <div className="card-title">Valor contratado</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{fmt(projeto.valorContratado || 0)}</div>
            <div className="muted-small">{projeto.formaPagamento}</div>
          </div>
          <div className="card">
            <div className="card-title">Total recebido</div>
            <div className="stat-value" style={{ color: 'var(--green)', fontSize: 20 }}>{fmt(totalRecebido)}</div>
            <div className="muted-small">{fmt(totalPendente)} pendente</div>
          </div>
          <div className="card">
            <div className="card-title">Total gasto</div>
            <div className="stat-value" style={{ color: 'var(--red)', fontSize: 20 }}>{fmt(totalGasto)}</div>
          </div>
          <div className="card">
            <div className="card-title">Lucro realizado</div>
            <div className="stat-value" style={{ color: lucroRealizado >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>{fmt(lucroRealizado)}</div>
            <div className="muted-small">recebido − gasto</div>
          </div>
          <div className="card">
            <div className="card-title">Lucro previsto</div>
            <div className="stat-value" style={{ color: lucroPrevisto >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 20 }}>{fmt(lucroPrevisto)}</div>
            <div className="muted-small">contratado − gasto</div>
          </div>
          {projeto.valorContratado > 0 && (
            <div className="card">
              <div className="card-title">% Recebido</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                {Math.round((totalRecebido / moneyNumber(projeto.valorContratado)) * 100)}%
              </div>
              <div className="chart-track" style={{ marginTop: 8 }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.round((totalRecebido / moneyNumber(projeto.valorContratado)) * 100))}%`, background: 'var(--green)', borderRadius: 4 }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RECEBIMENTOS ── */}
      {activeTab === 'recebimentos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => { setRecForm({ ...EMPTY_RECEBIMENTO }); setEditRecId(null); setShowRecForm(s => !s) }}>
              {showRecForm ? 'Fechar' : '+ Novo recebimento'}
            </button>
          </div>
          {showRecForm && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Novo recebimento</div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-group" style={{ maxWidth: 140 }}>
                  <label>Valor *</label>
                  <input type="number" min="0" step="0.01" value={recForm.valor} onChange={e => setRecForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
                </div>
                <div className="form-group" style={{ maxWidth: 155 }}>
                  <label>Vencimento</label>
                  <input type="date" value={recForm.vencimento} onChange={e => setRecForm(f => ({ ...f, vencimento: e.target.value }))} />
                </div>
                <div className="form-group" style={{ maxWidth: 160 }}>
                  <label>Status</label>
                  <select value={recForm.status} onChange={e => setRecForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_RECEBIMENTO.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {recForm.status === 'Recebido' && (
                  <div className="form-group" style={{ maxWidth: 155 }}>
                    <label>Data recebimento</label>
                    <input type="date" value={recForm.dataPagamento} onChange={e => setRecForm(f => ({ ...f, dataPagamento: e.target.value }))} />
                  </div>
                )}
                <div className="form-group" style={{ maxWidth: 160 }}>
                  <label>Forma pagamento</label>
                  <select value={recForm.formaPagamento} onChange={e => setRecForm(f => ({ ...f, formaPagamento: e.target.value }))}>
                    {FORMAS_PAGAMENTO_PROJ.filter(f => f !== 'Parcelado').map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Observação</label>
                  <input type="text" value={recForm.observacao} onChange={e => setRecForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Ex: Sinal, 1ª parcela..." />
                </div>
                <div className="form-group" style={{ maxWidth: 220 }}>
                  {/* Vinculação é sempre automática agora */}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  <button className="btn btn-primary" onClick={handleSaveRec}>Salvar</button>
                  <button className="btn btn-ghost" onClick={() => setShowRecForm(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}
          {(projeto.recebimentos || []).length === 0 ? (
            <div className="card"><p className="muted-small">Nenhum recebimento registrado ainda.</p></div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Valor</th><th>Vencimento</th><th>Recebido em</th><th>Forma</th><th>Status</th><th>Obs.</th><th></th></tr></thead>
                  <tbody>
                    {(projeto.recebimentos || []).sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || '')).map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(r.valor)}</td>
                        <td className="muted-cell">{fmtDataBR(r.vencimento)}</td>
                        <td className="muted-cell">{fmtDataBR(r.dataPagamento)}</td>
                        <td className="muted-cell">{r.formaPagamento}</td>
                        <td>
                          <span className={`badge ${r.status === 'Recebido' ? 'badge-green' : r.status === 'Vencido' ? 'badge-red' : 'badge-yellow'}`}>{r.status}</span>
                        </td>
                        <td className="muted-cell">{r.observacao || '—'}</td>
                        <td className="table-actions">
                          {r.status !== 'Recebido' && (
                            <button className="btn btn-primary btn-sm" onClick={() => marcarComoRecebido(r)}>
                              Recebido ✓
                            </button>
                          )}
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            setRecForm({ ...EMPTY_RECEBIMENTO, ...r, valor: String(r.valor) })
                            setEditRecId(r.id); setShowRecForm(true)
                          }}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => excluirRecebimento(r)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── GASTOS ── */}
      {activeTab === 'gastos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => { setGastoForm({ ...EMPTY_GASTO }); setEditGastoId(null); setShowGastoForm(s => !s) }}>
              {showGastoForm ? 'Fechar' : '+ Novo gasto'}
            </button>
          </div>
          {showGastoForm && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Novo gasto</div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Descrição *</label>
                  <input type="text" value={gastoForm.descricao} onChange={e => setGastoForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Impressão plantas, Uber para obra..." />
                </div>
                <div className="form-group" style={{ maxWidth: 130 }}>
                  <label>Valor *</label>
                  <input type="number" min="0" step="0.01" value={gastoForm.valor} onChange={e => setGastoForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
                </div>
                <div className="form-group" style={{ maxWidth: 155 }}>
                  <label>Data</label>
                  <input type="date" value={gastoForm.data} onChange={e => setGastoForm(f => ({ ...f, data: e.target.value }))} />
                </div>
                <div className="form-group" style={{ maxWidth: 160 }}>
                  <label>Categoria</label>
                  <select value={gastoForm.categoria} onChange={e => setGastoForm(f => ({ ...f, categoria: e.target.value }))}>
                    {CATS_GASTO.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ maxWidth: 140 }}>
                  <label>Forma pgto.</label>
                  <select value={gastoForm.formaPagamento} onChange={e => setGastoForm(f => ({ ...f, formaPagamento: e.target.value }))}>
                    {FORMAS_PAGAMENTO_PROJ.filter(f => f !== 'Parcelado').map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Observação</label>
                  <input type="text" value={gastoForm.observacao} onChange={e => setGastoForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Opcional..." />
                </div>
                <div className="form-group" style={{ maxWidth: 220 }}>
                  {/* Vinculação é sempre automática agora */}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  <button className="btn btn-primary" onClick={handleSaveGasto}>Salvar</button>
                  <button className="btn btn-ghost" onClick={() => setShowGastoForm(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}
          {(projeto.gastos || []).length === 0 ? (
            <div className="card"><p className="muted-small">Nenhum gasto registrado ainda.</p></div>
          ) : (
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
                Total: <span style={{ color: 'var(--red)' }}>{fmt((projeto.gastos || []).reduce((s, g) => s + moneyNumber(g.valor), 0))}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Data</th><th>Forma</th><th>Obs.</th><th></th></tr></thead>
                  <tbody>
                    {(projeto.gastos || []).sort((a, b) => (b.data || '').localeCompare(a.data || '')).map(g => (
                      <tr key={g.id}>
                        <td style={{ fontWeight: 500 }}>{g.descricao}</td>
                        <td className="muted-cell">{g.categoria}</td>
                        <td style={{ fontWeight: 700, color: 'var(--red)' }}>{fmt(g.valor)}</td>
                        <td className="muted-cell">{fmtDataBR(g.data)}</td>
                        <td className="muted-cell">{g.formaPagamento}</td>
                        <td className="muted-cell">{g.observacao || '—'}</td>
                        <td className="table-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            setGastoForm({ ...EMPTY_GASTO, ...g, valor: String(g.valor) })
                            setEditGastoId(g.id); setShowGastoForm(true)
                          }}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => excluirGasto(g)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

function calcFinanceiroDetalhe(proj) {
  const contratado = moneyNumber(proj.valorContratado)
  const recs = proj.recebimentos || []
  const gastos = proj.gastos || []
  const totalRecebido = recs.filter(r => r.status === 'Recebido').reduce((s, r) => s + moneyNumber(r.valor), 0)
  const totalPendente = recs.filter(r => r.status !== 'Recebido').reduce((s, r) => s + moneyNumber(r.valor), 0)
  const totalGasto = gastos.reduce((s, g) => s + moneyNumber(g.valor), 0)
  return { contratado, totalRecebido, totalPendente, totalGasto, lucroRealizado: totalRecebido - totalGasto, lucroPrevisto: contratado - totalGasto }
}
