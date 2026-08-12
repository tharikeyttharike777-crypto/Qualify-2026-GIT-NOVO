import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function NovoPlano() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const [activeTab, setActiveTab] = useState('geral'); // 'geral' | 'carencia' | 'valores' | 'clausula'

  // Form State
  const [form, setForm] = useState({
    name: '',
    status: 'ativo',
    description: '',
    maxPeople: '5',
    publicPage: 'sim',
    
    // Carência
    gracePeriod: '30',
    graceType: 'geral',
    graceDescription: '',

    // Valores
    adhesionValue: '',
    monthlyValue: '',
    annualValue: '',
    dependentAdditional: '',
    discountPercentage: '',

    // Cláusula
    planClause: ''
  });

  // Preço por Faixa Etária
  const [agePrices, setAgePrices] = useState([
    { minAge: '0', maxAge: '17', value: '' },
    { minAge: '18', maxAge: '59', value: '' },
    { minAge: '60', maxAge: '100', value: '' }
  ]);

  const [existingPlans, setExistingPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchExistingPlans();
    if (editId) {
      loadPlanToEdit();
    }
  }, [editId]);

  async function fetchExistingPlans() {
    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      let query = supabase.from('planos').select('*');
      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;
      if (!error && data) {
        setExistingPlans(data);
      }
    } catch (e) {}
  }

  async function loadPlanToEdit() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('planos').select('*').eq('id', editId).single();
      if (!error && data) {
        let meta = {};
        if (data.metadata) {
          try { meta = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata; } catch(e){}
        }

        setForm({
          name: data.name || data.nome || data.title || '',
          status: data.status || 'ativo',
          description: data.description || data.descricao || meta.description || '',
          maxPeople: String(data.max_people || data.maxPeople || meta.max_people || meta.maxPeople || '5'),
          publicPage: data.public_page || data.publicPage || meta.public_page || meta.publicPage || 'sim',

          gracePeriod: String(data.grace_period || data.gracePeriod || meta.grace_period || meta.gracePeriod || '30'),
          graceType: data.grace_type || data.graceType || meta.grace_type || meta.graceType || 'geral',
          graceDescription: data.grace_description || data.graceDescription || meta.grace_description || meta.graceDescription || '',

          adhesionValue: data.adhesion_value || data.adhesionValue || data.adesao || meta.adhesion_value || meta.adhesionValue || '',
          monthlyValue: data.monthly_value || data.monthlyValue || data.mensalidade || data.valor || meta.monthly_value || meta.monthlyValue || '',
          annualValue: data.annual_value || data.annualValue || data.anual || meta.annual_value || meta.annualValue || '',
          dependentAdditional: data.dependent_additional || data.dependentAdditional || meta.dependent_additional || meta.dependentAdditional || '',
          discountPercentage: data.discount_percentage || data.discountPercentage || meta.discount_percentage || meta.discountPercentage || '',

          planClause: data.plan_clause || data.planClause || meta.plan_clause || meta.planClause || meta.clausulas || ''
        });

        if (Array.isArray(data.age_prices || data.agePrices || meta.age_prices || meta.agePrices)) {
          setAgePrices(data.age_prices || data.agePrices || meta.age_prices || meta.agePrices);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar plano para edição:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const addAgeRange = () => {
    setAgePrices(prev => [...prev, { minAge: '', maxAge: '', value: '' }]);
  };

  const removeAgeRange = (index) => {
    setAgePrices(prev => prev.filter((_, i) => i !== index));
  };

  const updateAgeRange = (index, field, value) => {
    setAgePrices(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.monthlyValue) {
      setMsg({ type: 'error', text: 'Preencha o Nome do Plano e o Valor da Mensalidade.' });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');

      const payload = {
        name: form.name,
        status: form.status,
        company_id: companyId,
        metadata: {
          description: form.description,
          max_people: parseInt(form.maxPeople, 10) || 1,
          public_page: form.publicPage,
          grace_period: parseInt(form.gracePeriod, 10) || 0,
          grace_type: form.graceType,
          grace_description: form.graceDescription,
          adhesion_value: form.adhesionValue,
          monthly_value: form.monthlyValue,
          annual_value: form.annualValue,
          dependent_additional: form.dependentAdditional,
          discount_percentage: form.discountPercentage,
          plan_clause: form.planClause,
          clausulas: form.planClause, // Para compatibilidade com a geração de PDF
          age_prices: agePrices
        }
      };

      let result;
      if (editId) {
        result = await supabase.from('planos').update(payload).eq('id', editId);
      } else {
        result = await supabase.from('planos').insert([payload]).select();
      }

      if (result.error) throw result.error;

      // Salva no local storage para fallback
      try {
        const localPlans = JSON.parse(localStorage.getItem('planos') || '[]');
        localPlans.push(payload);
        localStorage.setItem('planos', JSON.stringify(localPlans));
      } catch (e) {}

      setMsg({ type: 'success', text: 'Plano salvo com sucesso!' });
      
      // Se era um plano novo, atualiza a URL para modo edição silenciosamente
      if (!editId && result.data && result.data.length > 0) {
          navigate(`?id=${result.data[0].id}`, { replace: true });
      }
      
      // Atualiza a lista de planos existentes
      fetchExistingPlans();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erro ao salvar plano: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '10px 0' }}>
      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Planos</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>{editId ? 'Editar Plano' : 'Novo Plano'}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>{editId ? 'Editar Plano' : 'Novo Plano'}</h1>
        <button onClick={handleSave} disabled={loading} style={{ background: 'linear-gradient(135deg, #28a745, #20c997)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(32,201,151,0.25)' }}>
          <i className="fas fa-save"></i> {loading ? 'Salvando...' : 'Salvar Plano'}
        </button>
      </div>

      {msg && (
        <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', background: msg.type === 'error' ? '#fee2e2' : '#dcfce7', color: msg.type === 'error' ? '#991b1b' : '#166534' }}>
          {msg.text}
        </div>
      )}

      {/* Navegação por 4 Abas */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <button onClick={() => setActiveTab('geral')} style={{ padding: '10px 16px', border: 'none', background: 'none', borderBottom: activeTab === 'geral' ? '3px solid #1565C0' : 'none', color: activeTab === 'geral' ? '#1565C0' : '#64748b', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
            <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i> Geral
          </button>
          <button onClick={() => setActiveTab('carencia')} style={{ padding: '10px 16px', border: 'none', background: 'none', borderBottom: activeTab === 'carencia' ? '3px solid #1565C0' : 'none', color: activeTab === 'carencia' ? '#1565C0' : '#64748b', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
            <i className="fas fa-clock" style={{ marginRight: '6px' }}></i> Carência
          </button>
          <button onClick={() => setActiveTab('valores')} style={{ padding: '10px 16px', border: 'none', background: 'none', borderBottom: activeTab === 'valores' ? '3px solid #1565C0' : 'none', color: activeTab === 'valores' ? '#1565C0' : '#64748b', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
            <i className="fas fa-dollar-sign" style={{ marginRight: '6px' }}></i> Valores
          </button>
          <button onClick={() => setActiveTab('clausula')} style={{ padding: '10px 16px', border: 'none', background: 'none', borderBottom: activeTab === 'clausula' ? '3px solid #1565C0' : 'none', color: activeTab === 'clausula' ? '#1565C0' : '#64748b', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
            <i className="fas fa-file-alt" style={{ marginRight: '6px' }}></i> Cláusula Contratual
          </button>
        </div>

        <form onSubmit={handleSave}>
          {/* Aba 1: Geral */}
          {activeTab === 'geral' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Nome do Plano *</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Ex: Plano Familiar Ouro" style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Status</label>
                  <select name="status" value={form.status} onChange={handleChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Descrição</label>
                <textarea name="description" rows="3" value={form.description} onChange={handleChange} placeholder="Descrição comercial e detalhes gerais..." style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}></textarea>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Número Máximo de Pessoas</label>
                  <input type="number" name="maxPeople" min="1" value={form.maxPeople} onChange={handleChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Exibir na Página Pública</label>
                  <select name="publicPage" value={form.publicPage} onChange={handleChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Aba 2: Carência */}
          {activeTab === 'carencia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Período de Carência (Dias)</label>
                  <input type="number" name="gracePeriod" min="0" value={form.gracePeriod} onChange={handleChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Tipo de Carência</label>
                  <select name="graceType" value={form.graceType} onChange={handleChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="geral">Geral</option>
                    <option value="parcial">Parcial</option>
                    <option value="sem-carencia">Sem Carência</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Descrição da Carência</label>
                <textarea name="graceDescription" rows="4" value={form.graceDescription} onChange={handleChange} placeholder="Regras específicas sobre prazos de carência..." style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}></textarea>
              </div>
            </div>
          )}

          {/* Aba 3: Valores */}
          {activeTab === 'valores' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Valor de Adesão (R$)</label>
                  <input type="text" name="adhesionValue" placeholder="0,00" value={form.adhesionValue} onChange={handleChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Valor da Mensalidade (R$) *</label>
                  <input type="text" name="monthlyValue" placeholder="0,00" value={form.monthlyValue} onChange={handleChange} required style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Valor Anual (R$)</label>
                  <input type="text" name="annualValue" placeholder="0,00" value={form.annualValue} onChange={handleChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Adicional por Dependente (R$)</label>
                  <input type="text" name="dependentAdditional" placeholder="0,00" value={form.dependentAdditional} onChange={handleChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Desconto (%)</label>
                  <input type="number" name="discountPercentage" min="0" max="100" step="0.01" value={form.discountPercentage} onChange={handleChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              {/* Tabela de Preço por Faixa Etária */}
              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '1rem' }}>Preço por Faixa Etária (Plano Funerário)</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '1rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                      <th style={{ padding: '10px' }}>Idade Mínima</th>
                      <th style={{ padding: '10px' }}>Idade Máxima</th>
                      <th style={{ padding: '10px' }}>Valor (R$)</th>
                      <th style={{ padding: '10px', width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {agePrices.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px' }}>
                          <input type="number" min="0" value={row.minAge} onChange={e => updateAgeRange(idx, 'minAge', e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }} />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input type="number" min="0" value={row.maxAge} onChange={e => updateAgeRange(idx, 'maxAge', e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }} />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input type="text" placeholder="0,00" value={row.value} onChange={e => updateAgeRange(idx, 'value', e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }} />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button type="button" onClick={() => removeAgeRange(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" onClick={addAgeRange} style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                  <i className="fas fa-plus" style={{ marginRight: '6px' }}></i> Adicionar Faixa
                </button>
              </div>
            </div>
          )}

          {/* Aba 4: Cláusula */}
          {activeTab === 'clausula' && (
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Texto da Cláusula Contratual</label>
              <textarea name="planClause" rows="8" value={form.planClause} onChange={handleChange} placeholder="Digite aqui o texto da cláusula específica que será incluído no PDF do contrato..." style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}></textarea>
              <span style={{ display: 'block', marginTop: '6px', fontSize: '0.85rem', color: '#64748b' }}>Esta cláusula será utilizada automaticamente na geração do contrato impresso ou PDF.</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <button type="button" onClick={() => navigate('/planos/pesquisa')} style={{ padding: '0.7rem 1.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{ padding: '0.7rem 2rem', borderRadius: '6px', border: 'none', background: 'linear-gradient(135deg, #28a745, #20c997)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
              <i className="fas fa-save" style={{ marginRight: '8px' }}></i> {loading ? 'Salvando...' : 'Salvar Plano'}
            </button>
          </div>
        </form>
      </div>

      {/* Seção: Planos Existentes desta Empresa */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '1rem' }}>Planos Existentes desta Empresa</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px' }}>Nome</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Carência</th>
              <th style={{ padding: '12px' }}>Mensalidade</th>
              <th style={{ padding: '12px' }}>Nº Pessoas</th>
            </tr>
          </thead>
          <tbody>
            {existingPlans.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>Carregando ou nenhum plano encontrado.</td>
              </tr>
            ) : (
              existingPlans.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>{p.name || p.nome || p.title}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>{p.status || 'Ativo'}</span>
                  </td>
                  <td style={{ padding: '12px', color: '#475569' }}>{p.grace_period || p.gracePeriod || '30'} dias</td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#10b981' }}>R$ {p.monthly_value || p.monthlyValue || p.mensalidade || p.valor || '0,00'}</td>
                  <td style={{ padding: '12px', color: '#475569' }}>{p.max_people || p.maxPeople || '5'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
