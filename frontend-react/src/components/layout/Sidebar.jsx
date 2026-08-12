import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

export default function Sidebar({ isOpen, onClose }) {
  const [expandedMenus, setExpandedMenus] = useState([]);
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
        localStorage.setItem('userEmail', user.email);
      }
    });
  }, []);

  const toggleMenu = (menu) => {
    setExpandedMenus(prev =>
      prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]
    );
  };

  return (
    <>
      <nav id="sidebar" className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Menu</h3>
          <button id="sidebar-close" className="sidebar-close" onClick={onClose}>&times;</button>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-user-info">
            <p className="user-email-display">Usuário: <span id="userDisplaySidebar">{userEmail || 'Carregando...'}</span></p>
            <p className="company-display">Empresa: <span id="empresaDisplaySidebar">{localStorage.getItem('empresaSelecionadaNome') || 'Nenhuma empresa ativa'}</span></p>
          </div>
          <ul className="sidebar-menu">
            {/* Contratos */}
            <li className={`menu-item has-submenu ${expandedMenus.includes('contratos') ? 'expanded' : ''}`}>
              <a href="#" className="menu-link" onClick={(e) => { e.preventDefault(); toggleMenu('contratos'); }}>
                <i className="icon-contract" style={{ marginRight: '10px' }}></i>
                <span className="menu-text">Contratos</span>
                <i className="arrow-icon"></i>
              </a>
              <ul className="submenu">
                <li><NavLink to="/contratos/ativos">Gestão de Contratos</NavLink></li>
              </ul>
            </li>

            {/* Financeiro */}
            <li className={`menu-item has-submenu ${expandedMenus.includes('financeiro') ? 'expanded' : ''}`}>
              <a href="#" className="menu-link" onClick={(e) => { e.preventDefault(); toggleMenu('financeiro'); }}>
                <i className="icon-money" style={{ marginRight: '10px' }}></i>
                <span className="menu-text">Financeiro</span>
                <i className="arrow-icon"></i>
              </a>
              <ul className="submenu">
                <li><NavLink to="/financeiro/movimentacoes">Minhas movimentações</NavLink></li>
                <li><NavLink to="/inadimplentes">Inadimplentes</NavLink></li>
              </ul>
            </li>

            {/* Famílias */}
            <li className={`menu-item has-submenu ${expandedMenus.includes('familias') ? 'expanded' : ''}`}>
              <a href="#" className="menu-link" onClick={(e) => { e.preventDefault(); toggleMenu('familias'); }}>
                <i className="icon-family" style={{ marginRight: '10px' }}></i>
                <span className="menu-text">Famílias</span>
                <i className="arrow-icon"></i>
              </a>
              <ul className="submenu">
                <li><NavLink to="/familias/nova">Nova família</NavLink></li>
                <li><NavLink to="/familias/pesquisar">Pesquisar famílias</NavLink></li>
                <li><NavLink to="/familias/associados">Pesquisar associados</NavLink></li>
                <li><NavLink to="/familias/pets">Pesquisar pet's</NavLink></li>
                <li><NavLink to="/familias/aniversariantes">Aniversariantes</NavLink></li>
                <li><NavLink to="/perfil">Perfil</NavLink></li>
              </ul>
            </li>

            {/* Planos */}
            <li className={`menu-item has-submenu ${expandedMenus.includes('planos') ? 'expanded' : ''}`}>
              <a href="#" className="menu-link" onClick={(e) => { e.preventDefault(); toggleMenu('planos'); }}>
                <i className="fas fa-box-open" style={{ marginRight: '10px' }}></i>
                <span className="menu-text">Planos</span>
                <i className="arrow-icon"></i>
              </a>
              <ul className="submenu">
                <li><NavLink to="/planos/novo">Novo plano</NavLink></li>
                <li><NavLink to="/planos/pesquisa">Pesquisa de Planos</NavLink></li>
                <li><NavLink to="/produtos">Produtos</NavLink></li>
              </ul>
            </li>
          </ul>
        </div>
      </nav>
      {/* Overlay para dispositivos móveis */}
      {isOpen && <div id="sidebar-overlay" className="sidebar-overlay show" onClick={onClose}></div>}
    </>
  );
}
