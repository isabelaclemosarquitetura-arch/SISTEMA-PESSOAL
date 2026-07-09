import { useState } from 'react'
import { t } from '../lib/i18n'

export default function FinanceiroListaCompras({ data, update, lang = 'pt' }) {
  const items = Array.isArray(data.financeiroListaCompras) ? data.financeiroListaCompras : []

  const [nome, setNome] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [precoEstimado, setPrecoEstimado] = useState('')
  const [categoria, setCategoria] = useState('Alimentação')

  const categorias = lang === 'en' 
    ? ['Food', 'Hygiene', 'Cleaning', 'Electronics', 'Clothing', 'Others']
    : ['Alimentação', 'Higiene', 'Limpeza', 'Eletrônicos', 'Vestuário', 'Outros']

  const handleAddItem = (e) => {
    e.preventDefault()
    const desc = nome.trim()
    if (!desc) return

    const preco = parseFloat(precoEstimado) || 0
    const newItem = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      nome: desc,
      quantidade: Math.max(1, parseInt(quantidade) || 1),
      precoEstimado: preco,
      categoria: categoria,
      comprado: false,
      timestamp: new Date().toISOString()
    }

    const updatedItems = [...items, newItem]
    update('financeiroListaCompras', updatedItems)

    // Reset form
    setNome('')
    setQuantidade(1)
    setPrecoEstimado('')
    setCategoria(categorias[0])
  }

  const toggleItem = (id) => {
    const updatedItems = items.map(item => 
      item.id === id ? { ...item, comprado: !item.comprado } : item
    )
    update('financeiroListaCompras', updatedItems)
  }

  const deleteItem = (id) => {
    const updatedItems = items.filter(item => item.id !== id)
    update('financeiroListaCompras', updatedItems)
  }

  const clearBought = () => {
    const updatedItems = items.filter(item => !item.comprado)
    update('financeiroListaCompras', updatedItems)
  }

  const clearAll = () => {
    if (confirm(lang === 'en' ? 'Are you sure you want to clear the entire list?' : 'Tem certeza que deseja limpar toda a lista?')) {
      update('financeiroListaCompras', [])
    }
  }

  // Totais
  const formatCurrency = (val) => {
    return val.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', {
      style: 'currency',
      currency: lang === 'en' ? 'USD' : 'BRL'
    })
  }

  const totalEstimado = items.reduce((acc, curr) => acc + (curr.quantidade * (curr.precoEstimado || 0)), 0)
  const totalComprado = items.reduce((acc, curr) => acc + (curr.comprado ? (curr.quantidade * (curr.precoEstimado || 0)) : 0), 0)
  const totalRestante = totalEstimado - totalComprado

  const aComprar = items.filter(item => !item.comprado)
  const comprados = items.filter(item => item.comprado)

  return (
    <div className="compras-container">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h2>{t(lang, 'compras.title')}</h2>
        <p>{t(lang, 'compras.sub')}</p>
      </div>

      {/* Grid de Resumos Orçamentários */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="card budget-card estimativa">
          <div className="card-title">{t(lang, 'compras.totalEstimated')}</div>
          <div className="stat-value text-blue" style={{ fontSize: 24 }}>{formatCurrency(totalEstimado)}</div>
          <div className="stat-label">
            {items.length} {items.length === 1 ? (lang === 'en' ? 'item' : 'item') : (lang === 'en' ? 'items' : 'itens')}
          </div>
        </div>

        <div className="card budget-card comprado">
          <div className="card-title">{t(lang, 'compras.totalBought')}</div>
          <div className="stat-value text-green" style={{ fontSize: 24 }}>{formatCurrency(totalComprado)}</div>
          <div className="stat-label">
            {comprados.length} {lang === 'en' ? 'checked' : 'marcados'}
          </div>
        </div>

        <div className="card budget-card restante">
          <div className="card-title">{t(lang, 'compras.totalRemaining')}</div>
          <div className="stat-value text-orange" style={{ fontSize: 24 }}>{formatCurrency(totalRestante)}</div>
          <div className="stat-label">
            {aComprar.length} {lang === 'en' ? 'left' : 'restantes'}
          </div>
        </div>
      </div>

      {/* Formulário de Adição */}
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleAddItem} className="compras-form">
          <div className="form-group flex-3">
            <label className="saude-label">{lang === 'en' ? 'Item Name' : 'Nome do Item'}</label>
            <input
              type="text"
              required
              placeholder={t(lang, 'compras.addPlaceholder')}
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="compras-input"
            />
          </div>

          <div className="form-group flex-1">
            <label className="saude-label">{t(lang, 'compras.qty')}</label>
            <input
              type="number"
              min="1"
              required
              value={quantidade}
              onChange={e => setQuantidade(e.target.value)}
              className="compras-input"
            />
          </div>

          <div className="form-group flex-1">
            <label className="saude-label">{lang === 'en' ? 'Est. Price' : 'Preço Est. (Un.)'}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={precoEstimado}
              onChange={e => setPrecoEstimado(e.target.value)}
              className="compras-input"
            />
          </div>

          <div className="form-group flex-1">
            <label className="saude-label">{t(lang, 'compras.category')}</label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="compras-select"
            >
              {categorias.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group flex-1 form-btn-container" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-add-compras" style={{ width: '100%', height: 38 }}>
              ➕ {t(lang, 'compras.add')}
            </button>
          </div>
        </form>
      </div>

      {/* Ações de Limpeza de Lista */}
      {items.length > 0 && (
        <div className="compras-actions" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button className="btn btn-ghost btn-sm" onClick={clearBought} disabled={comprados.length === 0}>
            🧹 {t(lang, 'compras.clearBought')}
          </button>
          <button className="btn btn-danger btn-sm" onClick={clearAll}>
            🗑️ {t(lang, 'compras.clearAll')}
          </button>
        </div>
      )}

      {/* Exibição dos Itens */}
      {items.length === 0 ? (
        <div className="card empty-compras-state">
          <div className="empty-compras-icon">🛒</div>
          <p>{t(lang, 'compras.empty')}</p>
        </div>
      ) : (
        <div className="compras-lists-wrapper">
          {/* Seção: A Comprar */}
          <div className="compras-list-section" style={{ marginBottom: 25 }}>
            <h3 className="compras-section-title">📌 {t(lang, 'compras.toBuy')} ({aComprar.length})</h3>
            <div className="compras-items-grid">
              {aComprar.map(item => (
                <div key={item.id} className="compras-item-card">
                  <label className="compras-check-label">
                    <input
                      type="checkbox"
                      checked={item.comprado}
                      onChange={() => toggleItem(item.id)}
                    />
                    <span className="compras-custom-check"></span>
                    <div className="compras-item-details">
                      <div className="compras-item-name">{item.nome}</div>
                      <div className="compras-item-meta">
                        <span className="compras-meta-badge qty">{item.quantidade}x</span>
                        <span className="compras-meta-badge cat">{item.categoria}</span>
                        {item.precoEstimado > 0 && (
                          <span className="compras-meta-badge price">
                            {formatCurrency(item.precoEstimado * item.quantidade)}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                  <button className="btn-compras-delete" onClick={() => deleteItem(item.id)} title={lang === 'en' ? 'Delete' : 'Excluir'}>
                    ❌
                  </button>
                </div>
              ))}
              {aComprar.length === 0 && (
                <div className="compras-list-empty-msg">
                  🎉 {lang === 'en' ? 'All items checked!' : 'Tudo comprado!'}
                </div>
              )}
            </div>
          </div>

          {/* Seção: Comprados */}
          {comprados.length > 0 && (
            <div className="compras-list-section bought-section">
              <h3 className="compras-section-title">✓ {t(lang, 'compras.bought')} ({comprados.length})</h3>
              <div className="compras-items-grid">
                {comprados.map(item => (
                  <div key={item.id} className="compras-item-card bought">
                    <label className="compras-check-label">
                      <input
                        type="checkbox"
                        checked={item.comprado}
                        onChange={() => toggleItem(item.id)}
                      />
                      <span className="compras-custom-check"></span>
                      <div className="compras-item-details">
                        <div className="compras-item-name">{item.nome}</div>
                        <div className="compras-item-meta">
                          <span className="compras-meta-badge qty">{item.quantidade}x</span>
                          <span className="compras-meta-badge cat">{item.categoria}</span>
                          {item.precoEstimado > 0 && (
                            <span className="compras-meta-badge price">
                              {formatCurrency(item.precoEstimado * item.quantidade)}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                    <button className="btn-compras-delete" onClick={() => deleteItem(item.id)} title={lang === 'en' ? 'Delete' : 'Excluir'}>
                      ❌
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
