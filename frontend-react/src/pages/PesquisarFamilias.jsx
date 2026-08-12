import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import ConfirmModal from '../components/common/ConfirmModal';

export default function PesquisarFamilias() {
  const navigate = useNavigate();
  const [familias, setFamilias] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Confirm Modal state
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: 'Confirmar Exclusão',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    fetchFamilias();
  }, []);

  async function fetchFamilias() {
    setLoading(true);
    const familyList = [];

    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      let { data, error } = await supabase.from('familias').select('*');
      if (companyId && data) {
        const filteredComp = data.filter(f => !f.company_id || String(f.company_id) === String(companyId));
        if (filteredComp.length > 0) data = filteredComp;
      }

      if (!error && Array.isArray(data)) {
        data.forEach(f => {
          let meta = {};
          if (f.metadata) {
            try { meta = typeof f.metadata === 'string' ? JSON.parse(f.metadata) : f.metadata; } catch(e){}
          }
          const titularData = f.titular || meta.titular || {};
          const endData = f.endereco || meta.endereco || {};

          familyList.push({
            id: f.id,
            displayId: String(f.id || '').length > 10 ? String(f.id).slice(0, 8) : f.id,
            nome: titularData.nome || f.nome || meta.nome || 'Titular',
            cpf: titularData.cpf || f.cpf || meta.cpf || '-',
            celular: titularData.celular || f.celular || meta.celular || '-',
            cidade: endData.cidade || f.cidade || '-',
            rua: endData.rua || f.rua || ''
          });
        });
      }
    } catch (err) {
      console.warn("Aviso ao carregar famílias Supabase:", err);
    }

    // Fallback localStorage
    try {
      const localFam = localStorage.getItem('familias');
      if (localFam) {
        const parsed = JSON.parse(localFam);
        if (Array.isArray(parsed)) {
          parsed.forEach(f => {
            if (!familyList.some(item => String(item.id) === String(f.id))) {
              familyList.push({
                id: f.id || Date.now(),
                displayId: String(f.id || '').length > 10 ? String(f.id).slice(0, 8) : (f.id || '1001'),
                nome: f.titular?.nome || f.nome || 'Titular',
                cpf: f.titular?.cpf || f.cpf || '-',
                celular: f.titular?.celular || f.celular || '-',
                cidade: f.endereco?.cidade || f.cidade || '-',
                rua: f.endereco?.rua || f.rua || ''
              });
            }
          });
        }
      }
    } catch (e) {}

    setFamilias(familyList);
    setLoading(false);
  }

  const handleDeleteFamily = (id, nome) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Excluir Família',
      message: `Tem certeza que deseja excluir permanentemente a família do titular "${nome}"?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          await supabase.from('familias').delete().eq('id', id);
          setFamilias(prev => prev.filter(f => f.id !== id));
          
          // Limpa do localStorage se houver
          try {
            const local = JSON.parse(localStorage.getItem('familias') || '[]');
            const updated = local.filter(f => String(f.id) !== String(id));
            localStorage.setItem('familias', JSON.stringify(updated));
          } catch (e) {}
        } catch (err) {
          alert("Erro ao excluir família: " + err.message);
        } finally {
          setLoading(false);
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filtered = familias.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    const nome = String(f.nome || '').toLowerCase();
    const cpf = String(f.cpf || '').toLowerCase();
    const id = String(f.displayId || f.id || '').toLowerCase();
    return nome.includes(q) || cpf.includes(q) || id.includes(q);
  });

  return (
    <div style={{ padding: '10px 0' }}>
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        onConfirm={confirmModalState.onConfirm}
        onCancel={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Famílias</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>Pesquisar Famílias</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>Pesquisar Famílias</h1>
        <button onClick={() => navigate('/familias/nova')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-plus"></i> Nova Família
        </button>
      </div>

      <div style={{ background: 'white', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <i className="fas fa-search" style={{ color: '#94a3b8' }}></i>
        <input
          type="text"
          placeholder="Pesquisar por nome do titular, CPF ou ID da família..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem', color: '#334155' }}
        />
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 16px' }}>ID</th>
              <th style={{ padding: '14px 16px' }}>Titular</th>
              <th style={{ padding: '14px 16px' }}>CPF</th>
              <th style={{ padding: '14px 16px' }}>Celular</th>
              <th style={{ padding: '14px 16px' }}>Cidade/Rua</th>
              <th style={{ padding: '14px 16px', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Carregando famílias...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  Nenhuma família encontrada.
                </td>
              </tr>
            ) : (
              filtered.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1565C0' }}>#{f.displayId}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>{f.nome}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{f.cpf}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{f.celular}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{f.cidade} {f.rua ? `- ${f.rua}` : ''}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button onClick={() => navigate(`/familias/nova?id=${f.id}`)} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#1565C0', cursor: 'pointer', fontWeight: 600 }} title="Editar Família">
                        <i className="fas fa-edit"></i> Editar
                      </button>
                      <button onClick={() => handleDeleteFamily(f.id, f.nome)} style={{ background: '#fee2e2', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }} title="Excluir Família">
                        <i className="fas fa-trash"></i> Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
