import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export default function Perfil() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        setEmail(data.user.email || '');
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  return (
    <div style={{ padding: '10px 0' }}>
      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Conta</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>Perfil do Usuário</span>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>Meu Perfil</h1>
      </div>

      <div style={{ background: 'white', padding: '2rem', borderRadius: '14px', border: '1px solid #e2e8f0', maxWidth: '600px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#1565C0', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
            <i className="fas fa-user"></i>
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#1e293b' }}>{email || 'Usuário'}</h3>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Administrador</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>E-mail cadastrado</label>
            <input type="text" value={email} disabled style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>ID do Usuário</label>
            <input type="text" value={user?.id || ''} disabled style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
