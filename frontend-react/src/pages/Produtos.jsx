import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export default function Produtos() {
  const [activeTab, setActiveTab] = useState('produtos'); // 'produtos' | 'servicos'
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [planosDisponiveis, setPlanosDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const loadedProds = [];
    const loadedServs = [];

    // 1. Supabase Fetch
    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');

      let { data: prodData } = await supabase.from('produtos').select('*');
      if (companyId && prodData) {
        const filteredComp = prodData.filter(p => !p.company_id || String(p.company_id) === String(companyId));
        if (filteredComp.length > 0) prodData = filteredComp;
      }

      if (Array.isArray(prodData)) {
        prodData.forEach(p => {
          let meta = {};
          if (p.metadata) {
            try { meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata; } catch(e){}
          }
          loadedProds.push({
            id: p.id,
            nome: p.nome || p.name || p.title || meta.name || 'Produto',
            quantidade: p.quantidade || p.quantity || meta.quantity || '1',
            valor: p.valor || p.preco || p.value || meta.value || '0,00',
            agePricingEnabled: p.age_pricing_enabled || p.agePricingEnabled || meta.agePricingEnabled || false,
            agePrices: p.age_prices || p.agePrices || meta.agePrices || [],
            planoVinculado: p.plano_vinculado || p.planoVinculado || meta.planoVinculado || ''
          });
        });
      }

      let { data: servData } = await supabase.from('servicos').select('*');
      if (companyId && servData) {
        const filteredCompServ = servData.filter(s => !s.company_id || String(s.company_id) === String(companyId));
        if (filteredCompServ.length > 0) servData = filteredCompServ;
      }

      if (Array.isArray(servData)) {
        servData.forEach(s => {
          let meta = {};
          if (s.metadata) {
            try { meta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata; } catch(e){}
          }
          loadedServs.push({
            id: s.id,
            nome: s.nome || s.name || s.title || meta.name || 'Serviço',
            valor: s.valor || s.preco || s.value || meta.value || '0,00',
            descricao: s.descricao || s.description || meta.description || ''
          });
        });
      }

      // Buscar planos
      try {
        let { data: plans } = await supabase.from('planos').select('*');
        if (companyId && plans) {
          const filtered = plans.filter(p => !p.company_id || String(p.company_id) === String(companyId));
          if (filtered.length > 0) plans = filtered;
        }
        if (Array.isArray(plans)) setPlanosDisponiveis(plans);
      } catch (err) {}

    } catch (err) {
      console.warn("Aviso ao carregar produtos do Supabase:", err);
    }

    // 2. LocalStorage Fallback
    try {
      const storedProds = JSON.parse(localStorage.getItem('catalogoProdutos') || '[]');
      if (Array.isArray(storedProds)) {
        storedProds.forEach(sp => {
          const nome = sp.nome || sp.name;
          if (nome && !loadedProds.some(p => String(p.nome).toLowerCase() === String(nome).toLowerCase())) {
            loadedProds.push({
              id: sp.id || Date.now() + Math.random(),
              nome: nome,
              quantidade: sp.quantidade || sp.quantity || '1',
              valor: sp.valor || sp.value || '0,00',
              agePricingEnabled: sp.agePricingEnabled || false,
              agePrices: sp.agePrices || [],
              planoVinculado: sp.planoVinculado || ''
            });
          }
        });
      }

      const storedServs = JSON.parse(localStorage.getItem('catalogoServicos') || '[]');
      if (Array.isArray(storedServs)) {
        storedServs.forEach(ss => {
          const nome = ss.nome || ss.name;
          if (nome && !loadedServs.some(s => String(s.nome).toLowerCase() === String(nome).toLowerCase())) {
            loadedServs.push({
              id: ss.id || Date.now() + Math.random(),
              nome: nome,
              valor: ss.valor || ss.value || '0,00',
              descricao: ss.descricao || ss.description || ''
            });
          }
        });
      }
    } catch (e) {}

    setProducts(loadedProds);
    setServices(loadedServs);
    setLoading(false);
  }

  // Handlers para Produtos
  const addProduct = () => {
    setProducts(prev => [
      ...prev,
      { id: Date.now(), nome: '', quantidade: '1', valor: '', agePricingEnabled: false, agePrices: [], planoVinculado: '' }
    ]);
  };

  const removeProduct = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const updateProduct = (id, field, value) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addAgePriceRow = (productId) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, agePrices: [...(p.agePrices || []), { start: '', end: '', value: '' }] };
      }
      return p;
    }));
  };

  const removeAgePriceRow = (productId, index) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const updated = [...(p.agePrices || [])];
        updated.splice(index, 1);
        return { ...p, agePrices: updated };
      }
      return p;
    }));
  };

  const updateAgePriceRow = (productId, index, field, value) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const updated = [...(p.agePrices || [])];
        updated[index] = { ...updated[index], [field]: value };
        return { ...p, agePrices: updated };
      }
      return p;
    }));
  };

  // Handlers para Serviços
  const addService = () => {
    setServices(prev => [
      ...prev,
      { id: Date.now(), nome: '', valor: '', descricao: '' }
    ]);
  };

  const removeService = (id) => {
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const updateService = (id, field, value) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // Salvar tudo no Supabase e LocalStorage
  const handleSaveAll = async () => {
    setLoading(true);
    setMsg(null);

    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');

      // Salva no LocalStorage para compatibilidade total
      localStorage.setItem('catalogoProdutos', JSON.stringify(products));
      localStorage.setItem('catalogoServicos', JSON.stringify(services));

      // Tenta persistir no Supabase se as tabelas existirem
      try {
        for (const p of products) {
          const payload = {
            nome: p.nome,
            quantidade: p.quantidade,
            valor: p.valor,
            age_pricing_enabled: p.agePricingEnabled,
            age_prices: p.agePrices,
            plano_vinculado: p.planoVinculado,
            company_id: companyId
          };
          if (typeof p.id === 'string' && p.id.includes('-')) {
            await supabase.from('produtos').update(payload).eq('id', p.id);
          } else if (typeof p.id === 'number' && p.id < 1000000000000) {
            await supabase.from('produtos').update(payload).eq('id', p.id);
          } else {
            await supabase.from('produtos').insert([payload]);
          }
        }
      } catch (err) {
        console.error("Erro ao salvar no supabase: ", err);
      }

      setMsg({ type: 'success', text: 'Catálogo de Produtos e Serviços salvo com sucesso!' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Erro ao salvar: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '10px 0' }}>
      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Catálogo</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>Produtos & Serviços</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>Gestão de Produtos & Serviços</h1>
        <button onClick={handleSaveAll} disabled={loading} style={{ background: 'linear-gradient(135deg, #28a745, #20c997)', color: 'white', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(32, 201, 151, 0.25)' }}>
          <i className="fas fa-save"></i> {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {msg && (
        <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', background: msg.type === 'error' ? '#fee2e2' : '#dcfce7', color: msg.type === 'error' ? '#991b1b' : '#166534' }}>
          {msg.text}
        </div>
      )}

      {/* Abas */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button onClick={() => setActiveTab('produtos')} style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'produtos' ? '3px solid #1565C0' : 'none', color: activeTab === 'produtos' ? '#1565C0' : '#64748b', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
          <i className="fas fa-box" style={{ marginRight: '8px' }}></i> Produtos ({products.length})
        </button>
        <button onClick={() => setActiveTab('servicos')} style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'servicos' ? '3px solid #1565C0' : 'none', color: activeTab === 'servicos' ? '#1565C0' : '#64748b', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
          <i className="fas fa-concierge-bell" style={{ marginRight: '8px' }}></i> Serviços ({services.length})
        </button>
      </div>

      {/* Conteúdo da Aba Produtos */}
      {activeTab === 'produtos' && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#1e293b' }}>Catálogo de Produtos</h3>
            <button onClick={addProduct} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-plus"></i> Adicionar Produto
            </button>
          </div>

          {products.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
              <i className="fas fa-box-open" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
              <p style={{ margin: 0, fontWeight: 500 }}>Nenhum produto cadastrado. Clique em "Adicionar Produto" acima.</p>
            </div>
          ) : (
            products.map((p, idx) => (
              <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.2rem', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <strong style={{ color: '#1e293b' }}>Produto #{idx + 1}</strong>
                  <button onClick={() => removeProduct(p.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Nome do Produto</label>
                    <input type="text" value={p.nome} onChange={e => updateProduct(p.id, 'nome', e.target.value)} placeholder="Ex: Cesta Básica / Cartão Multi" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Quantidade</label>
                    <input type="number" min="1" value={p.quantidade} onChange={e => updateProduct(p.id, 'quantidade', e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Valor (R$)</label>
                    <input type="text" placeholder="0,00" value={p.valor} onChange={e => updateProduct(p.id, 'valor', e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="checkbox" id={`age_${p.id}`} checked={p.agePricingEnabled} onChange={e => updateProduct(p.id, 'agePricingEnabled', e.target.checked)} />
                      <label htmlFor={`age_${p.id}`} style={{ fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>Valores por Faixa de Idade</label>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Plano Vinculado (Opcional - Adiciona a todos se o contrato for desse plano)</label>
                      <select value={p.planoVinculado || ''} onChange={e => updateProduct(p.id, 'planoVinculado', e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}>
                        <option value="">Nenhum (seleção manual)</option>
                        {planosDisponiveis.map(pl => (
                          <option key={pl.id} value={pl.nome || pl.name || pl.title}>{pl.nome || pl.name || pl.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Faixas de Idade */}
                {p.agePricingEnabled && (
                  <div style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Faixas de Idade Configurada:</span>
                      <button onClick={() => addAgePriceRow(p.id)} style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                        + Adicionar Faixa
                      </button>
                    </div>
                    {p.agePrices?.map((row, rIdx) => (
                      <div key={rIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                        <input type="number" placeholder="Início (Ex: 18)" value={row.start} onChange={e => updateAgePriceRow(p.id, rIdx, 'start', e.target.value)} style={{ width: '110px', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                        <span>até</span>
                        <input type="number" placeholder="Fim (Ex: 59)" value={row.end} onChange={e => updateAgePriceRow(p.id, rIdx, 'end', e.target.value)} style={{ width: '110px', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                        <span>anos: R$</span>
                        <input type="text" placeholder="Valor" value={row.value} onChange={e => updateAgePriceRow(p.id, rIdx, 'value', e.target.value)} style={{ width: '120px', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                        <button onClick={() => removeAgePriceRow(p.id, rIdx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><i className="fas fa-trash"></i></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Conteúdo da Aba Serviços */}
      {activeTab === 'servicos' && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#1e293b' }}>Catálogo de Serviços</h3>
            <button onClick={addService} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-plus"></i> Adicionar Serviço
            </button>
          </div>

          {services.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
              <i className="fas fa-concierge-bell" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
              <p style={{ margin: 0, fontWeight: 500 }}>Nenhum serviço cadastrado. Clique em "Adicionar Serviço" acima.</p>
            </div>
          ) : (
            services.map((s, idx) => (
              <div key={s.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.2rem', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <strong style={{ color: '#1e293b' }}>Serviço #{idx + 1}</strong>
                  <button onClick={() => removeService(s.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Nome do Serviço</label>
                    <input type="text" value={s.nome} onChange={e => updateService(s.id, 'nome', e.target.value)} placeholder="Ex: Telemedicina / Assistência Residencial" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Valor (R$)</label>
                    <input type="text" placeholder="0,00" value={s.valor} onChange={e => updateService(s.id, 'valor', e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Descrição do Serviço</label>
                  <textarea rows="2" value={s.descricao} onChange={e => updateService(s.id, 'descricao', e.target.value)} placeholder="Descreva os detalhes do serviço prestado..." style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}></textarea>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
