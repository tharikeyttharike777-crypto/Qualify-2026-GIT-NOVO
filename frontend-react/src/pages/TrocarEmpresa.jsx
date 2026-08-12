import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import './TrocarEmpresa.css';

export default function TrocarEmpresa() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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

  const acessarEmpresa = (empresa) => {
    localStorage.setItem('empresaSelecionadaId', empresa.id);
    localStorage.setItem('empresaSelecionadaNome', empresa.name || 'Empresa sem nome');
    localStorage.setItem('activeCompanyId', empresa.id);
    localStorage.setItem('activeCompany', JSON.stringify({
        id: empresa.id, 
        name: empresa.name || '', 
        cnpj: empresa.cnpj || null, 
        city: empresa.city || null
    }));
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <header className="header" style={{ position: 'relative' }}>
        <div className="header-left">
          <button className="btn-voltar" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> Sair</button>
        </div>
        <div className="header-center">
          <h1>Trocar Empresa</h1>
        </div>
        <div className="header-right">
          <span className="user-email">{user?.email || 'Carregando...'}</span>
        </div>
      </header>

      <main className="main-content" style={{ marginLeft: 0, padding: '2rem' }}>
        <div className="content-area" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div className="nova-empresa-section" style={{ marginBottom: '2rem', textAlign: 'right' }}>
            <button className="btn-nova-empresa" style={{ padding: '0.8rem 1.5rem', background: '#4361ee', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              + Nova Empresa
            </button>
          </div>

          {loading ? (
            <div className="loading-container" style={{ textAlign: 'center', padding: '3rem' }}>
              <p>Carregando empresas...</p>
            </div>
          ) : (
            <div className="empresas-section">
              <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Empresas Existentes</h2>
              
              {empresas.length === 0 ? (
                <div className="nenhuma-empresa" style={{ background: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
                  <p>Nenhuma empresa encontrada. Crie sua primeira empresa!</p>
                </div>
              ) : (
                <div className="empresas-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {empresas.map(emp => (
                    <div key={emp.id} className="empresa-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                      <div className="empresa-info" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>{emp.name || 'Sem nome'}</h3>
                        <p style={{ margin: '0 0 0.3rem 0', color: '#64748b', fontSize: '0.9rem' }}>{emp.cnpj}</p>
                        <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.9rem' }}>{emp.city}</p>
                        <span style={{ background: '#e0e7ff', color: '#4361ee', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          {emp.tipo === 'owner' ? 'Proprietário' : 'Membro'}
                        </span>
                      </div>
                      <div className="empresa-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => acessarEmpresa(emp)}
                          style={{ flex: 1, padding: '0.8rem', background: '#4361ee', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                        >
                          Acessar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
