import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import ConfirmModal from '../components/common/ConfirmModal';
import './TrocarEmpresa.css';

export default function TrocarEmpresa() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Modal Nova Empresa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoCnpj, setNovoCnpj] = useState('');
  const [novaCidade, setNovaCidade] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [modalErro, setModalErro] = useState(null);

  // Modal Confirmar Exclusão
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const activeCompanyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);
      fetchEmpresas(session.user.id);
    };

    checkAuthAndFetch();
  }, [navigate]);

  const fetchEmpresas = async (userId) => {
    try {
      const { data, error } = await supabase.from('empresas').select('*');
      if (error) throw error;
      
      const userEmpresas = (data || []).filter(e => 
        e.owner_id === userId || (Array.isArray(e.members) && e.members.includes(userId))
      ).map(e => ({
        ...e,
        tipo: e.owner_id === userId ? 'owner' : 'membro'
      }));

      setEmpresas(userEmpresas);
    } catch (err) {
      console.error('Erro ao buscar empresas', err);
    } finally {
      setLoading(false);
    }
  };

  const formatarCNPJ = (val) => {
    let v = val.replace(/\D/g, '').slice(0, 14);
    if (v.length <= 2) return v;
    if (v.length <= 5) return v.replace(/(\d{2})(\d+)/, '$1.$2');
    if (v.length <= 8) return v.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
    if (v.length <= 12) return v.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
    return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, '$1.$2.$3/$4-$5');
  };

  const handleCnpjChange = (e) => {
    setNovoCnpj(formatarCNPJ(e.target.value));
  };

  const abrirModalNovaEmpresa = () => {
    setNovoNome('');
    setNovoCnpj('');
    setNovaCidade('');
    setModalErro(null);
    setIsModalOpen(true);
  };

  const fecharModalNovaEmpresa = () => {
    setIsModalOpen(false);
    setModalErro(null);
  };

  const handleSalvarNovaEmpresa = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Você não está autenticado!');
      return;
    }

    const nome = novoNome.trim();
    const cnpj = novoCnpj.trim();
    const cidade = novaCidade.trim();

    if (!nome || !cnpj || !cidade) {
      setModalErro('Por favor, preencha todos os campos.');
      return;
    }

    setSalvando(true);
    setModalErro(null);

    try {
      const payload = {
        name: nome,
        cnpj: cnpj,
        city: cidade,
        owner_id: user.id,
        members: [user.id]
      };

      const { data, error } = await supabase.from('empresas').insert([payload]).select();
      if (error) throw error;

      fecharModalNovaEmpresa();
      await fetchEmpresas(user.id);

      // Se for a primeira empresa criada, já seleciona automaticamente
      if (data?.[0]) {
        acessarEmpresa(data[0]);
      }
    } catch (err) {
      console.error('Erro ao salvar empresa:', err);
      setModalErro(err.message || 'Erro ao salvar a empresa no banco de dados.');
    } finally {
      setSalvando(false);
    }
  };

  const handleDeleteEmpresa = (empresa) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Empresa',
      message: `Tem certeza que deseja excluir permanentemente a empresa "${empresa.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('empresas').delete().eq('id', empresa.id);
          if (error) throw error;

          if (activeCompanyId === empresa.id) {
            localStorage.removeItem('empresaSelecionadaId');
            localStorage.removeItem('empresaSelecionadaNome');
            localStorage.removeItem('activeCompanyId');
            localStorage.removeItem('companyId');
            localStorage.removeItem('activeCompany');
            localStorage.removeItem('familias');
            localStorage.removeItem('contratos');
            localStorage.removeItem('planos');
            localStorage.removeItem('catalogoProdutos');
            localStorage.removeItem('catalogoServicos');
            localStorage.removeItem('cobrancas');
          }

          await fetchEmpresas(user.id);
        } catch (err) {
          alert('Erro ao excluir empresa: ' + (err.message || String(err)));
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const acessarEmpresa = (empresa) => {
    // 1. Limpa caches residuais sem escopo de empresa para evitar contaminação cruzada
    localStorage.removeItem('familias');
    localStorage.removeItem('contratos');
    localStorage.removeItem('planos');
    localStorage.removeItem('catalogoProdutos');
    localStorage.removeItem('catalogoServicos');
    localStorage.removeItem('cobrancas');

    // 2. Define o contexto da empresa selecionada
    localStorage.setItem('empresaSelecionadaId', empresa.id);
    localStorage.setItem('empresaSelecionadaNome', empresa.name || 'Empresa sem nome');
    localStorage.setItem('activeCompanyId', empresa.id);
    localStorage.setItem('companyId', empresa.id);
    localStorage.setItem('activeCompany', JSON.stringify({
      id: empresa.id, 
      name: empresa.name || '', 
      cnpj: empresa.cnpj || null, 
      city: empresa.city || null
    }));
    // Recarga completa: descarta qualquer estado em memória da empresa anterior
    window.location.assign('/dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      <header className="header" style={{ position: 'relative' }}>
        <div className="header-left" style={{ display: 'flex', gap: '8px' }}>
          {activeCompanyId && (
            <button className="btn-voltar" onClick={() => navigate('/dashboard')} title="Voltar ao Painel">
              <i className="fas fa-arrow-left"></i> Painel
            </button>
          )}
          <button className="btn-voltar" onClick={handleLogout} title="Sair da conta">
            <i className="fas fa-sign-out-alt"></i> Sair
          </button>
        </div>
        <div className="header-center">
          <h1>Trocar Empresa</h1>
        </div>
        <div className="header-right">
          <span className="user-email">{user?.email || 'Carregando...'}</span>
        </div>
      </header>

      <main className="main-content" style={{ marginLeft: 0, padding: '2rem' }}>
        <div className="content-area" style={{ maxWidth: '1200px', margin: '0 auto', background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', padding: '2rem' }}>
          
          <div className="nova-empresa-section" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1e293b', fontWeight: 700 }}>Suas Empresas</h2>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Selecione qual empresa deseja gerenciar ou cadastre uma nova.</p>
            </div>
            <button 
              type="button"
              className="btn-nova-empresa" 
              onClick={abrirModalNovaEmpresa}
              style={{ padding: '0.8rem 1.6rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
            >
              <i className="fas fa-plus"></i> Nova Empresa
            </button>
          </div>

          {loading ? (
            <div className="loading-container" style={{ textAlign: 'center', padding: '3rem', display: 'block' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: '#64748b' }}>Carregando empresas cadastradas...</p>
            </div>
          ) : (
            <div className="empresas-section" style={{ padding: 0 }}>
              {empresas.length === 0 ? (
                <div className="nenhuma-empresa" style={{ background: '#f8fafc', padding: '3.5rem 2rem', borderRadius: '12px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                  <i className="fas fa-building" style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: '1rem', display: 'block' }}></i>
                  <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Nenhuma empresa encontrada</h3>
                  <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Cadastre a sua primeira empresa para começar a gerenciar o sistema.</p>
                  <button 
                    type="button"
                    onClick={abrirModalNovaEmpresa}
                    style={{ padding: '0.75rem 1.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    + Criar Primeira Empresa
                  </button>
                </div>
              ) : (
                <div className="empresas-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  {empresas.map(emp => {
                    const isAtiva = activeCompanyId === emp.id;
                    return (
                      <div 
                        key={emp.id} 
                        className={`empresa-card ${isAtiva ? 'ativa' : ''}`} 
                        style={{ 
                          background: 'white', 
                          padding: '1.5rem', 
                          borderRadius: '12px', 
                          boxShadow: '0 4px 10px rgba(0,0,0,0.04)',
                          border: isAtiva ? '2px solid #10b981' : '1px solid #e2e8f0',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div className="empresa-info" style={{ marginBottom: '1.2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.15rem', fontWeight: 700 }}>{emp.name || 'Sem nome'}</h3>
                            {isAtiva && (
                              <span style={{ background: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                                ATIVA
                              </span>
                            )}
                          </div>
                          <p style={{ margin: '0 0 0.3rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                            <i className="fas fa-id-card" style={{ marginRight: '6px', color: '#94a3b8' }}></i>
                            {emp.cnpj || 'Sem CNPJ'}
                          </p>
                          <p style={{ margin: '0 0 0.8rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                            <i className="fas fa-map-marker-alt" style={{ marginRight: '6px', color: '#94a3b8' }}></i>
                            {emp.city || 'Sem cidade'}
                          </p>
                          <span style={{ background: emp.tipo === 'owner' ? '#e0e7ff' : '#f1f5f9', color: emp.tipo === 'owner' ? '#4361ee' : '#475569', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            {emp.tipo === 'owner' ? 'Proprietário' : 'Membro'}
                          </span>
                        </div>

                        <div className="empresa-actions" style={{ display: 'flex', gap: '0.6rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                          <button 
                            type="button"
                            onClick={() => acessarEmpresa(emp)}
                            style={{ 
                              flex: 1, 
                              padding: '0.75rem', 
                              background: isAtiva ? '#10b981' : '#2563eb', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '8px', 
                              cursor: 'pointer', 
                              fontWeight: '600',
                              fontSize: '0.9rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            {isAtiva ? 'Acessando (Ativa)' : 'Acessar'}
                          </button>

                          {emp.tipo === 'owner' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteEmpresa(emp)}
                              style={{ 
                                padding: '0.75rem 1rem', 
                                background: '#fee2e2', 
                                color: '#dc2626', 
                                border: '1px solid #fca5a5', 
                                borderRadius: '8px', 
                                cursor: 'pointer', 
                                fontWeight: '600' 
                              }}
                              title="Excluir Empresa"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal Nova Empresa */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="modal-container" style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: 700 }}>
                <i className="fas fa-building" style={{ color: '#2563eb', marginRight: '8px' }}></i>
                Cadastrar Nova Empresa
              </h3>
              <button 
                type="button"
                className="btn-fechar-modal" 
                onClick={fecharModalNovaEmpresa}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSalvarNovaEmpresa}>
              <div className="modal-body" style={{ padding: '1.5rem' }}>
                {modalErro && (
                  <div style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.85rem' }}>
                    <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                    {modalErro}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                  <label htmlFor="input-nome-empresa" style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    id="input-nome-empresa"
                    placeholder="Ex: Minha Empresa LTDA"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    required
                    autoFocus
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                  <label htmlFor="input-cnpj" style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                    CNPJ *
                  </label>
                  <input
                    type="text"
                    id="input-cnpj"
                    placeholder="00.000.000/0000-00"
                    value={novoCnpj}
                    onChange={handleCnpjChange}
                    maxLength={18}
                    required
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label htmlFor="input-cidade" style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                    Cidade / UF *
                  </label>
                  <input
                    type="text"
                    id="input-cidade"
                    placeholder="Ex: Rio de Janeiro"
                    value={novaCidade}
                    onChange={(e) => setNovaCidade(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={fecharModalNovaEmpresa}
                  disabled={salvando}
                  style={{ padding: '0.7rem 1.3rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-salvar"
                  disabled={salvando}
                  style={{ padding: '0.7rem 1.5rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {salvando ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Salvando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i> Salvar Empresa
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
