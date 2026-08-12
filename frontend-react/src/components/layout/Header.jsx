import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';

export default function Header({ toggleSidebar }) {
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const empresaNome = localStorage.getItem('empresaSelecionadaNome') || 'Nenhuma empresa selec...';

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="hamburger-menu" id="menu-toggle" onClick={toggleSidebar} aria-label="Abrir menu">
          <i className="fas fa-bars"></i>
        </button>
        <Link to="/dashboard" className="logo" style={{ textDecoration: 'none' }}>
          <span className="logo-text">QUALIFY - Sistema de gestão</span>
        </Link>
      </div>

      <div className="header-center">
        <div className="search-container">
          <input type="text" className="search-input" placeholder="Pesquisar páginas..." id="page-search" />
          <i className="fas fa-search search-icon"></i>
        </div>
      </div>

      <div className="header-right">
        <div className="company-info">
          <i className="fas fa-building"></i>
          <span id="headerEmpresaDisplay">{empresaNome}</span>
        </div>

        {/* Menu de Usuário */}
        <div className="user-menu-container" ref={dropdownRef}>
          <button
            className="user-menu-trigger"
            id="userMenuTrigger"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            aria-label="Menu do Usuário"
            aria-expanded={isUserMenuOpen}
          >
            <i className="fas fa-user-circle"></i>
          </button>

          {/* Dropdown Menu */}
          <div className={`user-dropdown ${isUserMenuOpen ? 'show' : ''}`} id="userDropdown" role="menu" style={{ display: isUserMenuOpen ? 'block' : 'none' }}>
            <div className="dropdown-content">
              <Link to="/perfil" className="dropdown-item" role="menuitem" data-action="profile">
                <i className="fas fa-user"></i>
                <span>Perfil</span>
              </Link>

              <Link to="/trocar-empresa" className="dropdown-item" role="menuitem" data-action="switch-company">
                <i className="fas fa-building"></i>
                <span>Trocar de Empresa</span>
              </Link>

              <Link to="/minha-conta" className="dropdown-item" role="menuitem" data-action="account">
                <i className="fas fa-wallet"></i>
                <span>Minha Conta</span>
              </Link>

              <Link to="/configuracoes-bancarias" className="dropdown-item" role="menuitem" data-action="banking">
                <i className="fas fa-university"></i>
                <span>Integrações</span>
              </Link>

              <a href="/area-associado-login" className="dropdown-item" role="menuitem" data-action="associate-area" target="_blank">
                <i className="fas fa-external-link-alt"></i>
                <span>Área do Associado</span>
              </a>

              <Link to="/catalogo-planos" className="dropdown-item" role="menuitem" data-action="catalog">
                <i className="fas fa-book"></i>
                <span>Catálogo de Planos</span>
              </Link>

              {/* Separador */}
              <div className="dropdown-separator"></div>

              {/* Sair */}
              <button className="dropdown-item logout-item" id="logoutBtn" role="menuitem" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i>
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
