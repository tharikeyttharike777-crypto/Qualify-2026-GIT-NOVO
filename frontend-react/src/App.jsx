import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './services/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TrocarEmpresa from './pages/TrocarEmpresa';
import NovaFamilia from './pages/NovaFamilia';
import PesquisarFamilias from './pages/PesquisarFamilias';
import PesquisarAssociados from './pages/PesquisarAssociados';
import PesquisarPets from './pages/PesquisarPets';
import Aniversariantes from './pages/Aniversariantes';
import Contratos from './pages/Contratos';
import EdicaoContrato from './pages/EdicaoContrato';
import PesquisaPlanos from './pages/PesquisaPlanos';
import NovoPlano from './pages/NovoPlano';
import Produtos from './pages/Produtos';
import ListaCobranca from './pages/ListaCobranca';
import ContasReceber from './pages/ContasReceber';
import ContasPagar from './pages/ContasPagar';
import Transferencias from './pages/Transferencias';
import VendasProdutos from './pages/VendasProdutos';
import AreaAssociadoLogin from './pages/AreaAssociadoLogin';
import AreaAssociado from './pages/AreaAssociado';
import CatalogoPlanos from './pages/CatalogoPlanos';
import Perfil from './pages/Perfil';
import MinhaConta from './pages/MinhaConta';
import ConfiguracoesBancarias from './pages/ConfiguracoesBancarias';
import Layout from './components/layout/Layout';

// Guard para proteger rotas privadas
const PrivateRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        localStorage.setItem('userEmail', session.user.email);
      }
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        localStorage.setItem('userEmail', session.user.email);
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div>Carregando...</div>;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PagePlaceholder = () => {
  const location = useLocation();
  const rawName = location.pathname.split('/').filter(Boolean).pop() || 'Página';
  const pageTitle = rawName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div style={{ padding: '1rem 0' }}>
      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Sistema</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>{pageTitle}</span>
      </div>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>{pageTitle}</h1>
      </div>
      <div className="dashboard-content" style={{ background: '#fff', padding: '3.5rem 2rem', borderRadius: '14px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #eaeaea' }}>
        <div style={{ width: '64px', height: '64px', background: 'rgba(33, 150, 243, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
          <i className="fas fa-tools" style={{ fontSize: '1.8rem', color: '#1565C0' }}></i>
        </div>
        <h2 style={{ color: '#2c3e50', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Página em Migração</h2>
        <p style={{ color: '#64748b', maxWidth: '480px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
          A rota <code style={{ background: '#f1f5f9', color: '#0f172a', padding: '2px 8px', borderRadius: '4px', fontSize: '0.9rem' }}>{location.pathname}</code> já está estruturada dentro do novo modelo React.
        </p>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Rotas Públicas Externas */}
        <Route path="/area-associado/login" element={<AreaAssociadoLogin />} />
        <Route path="/catalogo" element={<CatalogoPlanos />} />
        
        {/* Rota Privada SEM o Layout (Menu Lateral) */}
        <Route path="/trocar-empresa" element={<PrivateRoute><TrocarEmpresa /></PrivateRoute>} />
        <Route path="/area-associado" element={<PrivateRoute><AreaAssociado /></PrivateRoute>} />
        
        {/* Rotas Privadas COM o Layout (Menu Lateral) */}
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Famílias */}
          <Route path="/familias/nova" element={<NovaFamilia />} />
          <Route path="/familias/pesquisar" element={<PesquisarFamilias />} />
          <Route path="/familias/associados" element={<PesquisarAssociados />} />
          <Route path="/familias/pets" element={<PesquisarPets />} />
          <Route path="/familias/aniversariantes" element={<Aniversariantes />} />

          {/* Contratos (Todos os sub-links) */}
          <Route path="/contratos/ativos" element={<Contratos />} />
          <Route path="/inadimplentes" element={<Contratos />} />
          <Route path="/contratos/mensalidades" element={<Contratos />} />
          <Route path="/contratos/renovacoes" element={<Contratos />} />
          <Route path="/renegociacao" element={<Contratos />} />
          <Route path="/contratos/adimplentes" element={<Contratos />} />
          <Route path="/contratos/cancelados" element={<Contratos />} />
          <Route path="/contratos/editar" element={<EdicaoContrato />} />

          {/* Planos & Produtos */}
          <Route path="/planos/pesquisa" element={<PesquisaPlanos />} />
          <Route path="/planos/novo" element={<NovoPlano />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/vendas/produtos" element={<VendasProdutos />} />

          {/* Financeiro (Todos os sub-links) */}
          <Route path="/financeiro/movimentacoes" element={<ContasReceber />} />
          <Route path="/financeiro/cobranca" element={<ListaCobranca />} />
          <Route path="/financeiro/contas-pagar" element={<ContasPagar />} />
          <Route path="/financeiro/contas-receber" element={<ContasReceber />} />
          <Route path="/financeiro/ordens-servico" element={<ListaCobranca />} />
          <Route path="/financeiro/transferencias" element={<Transferencias />} />

          {/* Perfil & Minha Conta */}
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/minha-conta" element={<MinhaConta />} />
          
          {/* Configurações */}
          <Route path="/configuracoes/bancarias" element={<ConfiguracoesBancarias />} />
          <Route path="/config/bancaria" element={<ConfiguracoesBancarias />} />

          {/* Qualquer outra aba clicada permanece dentro do Layout sem deslogar ou redirecionar */}
          <Route path="*" element={<PagePlaceholder />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
