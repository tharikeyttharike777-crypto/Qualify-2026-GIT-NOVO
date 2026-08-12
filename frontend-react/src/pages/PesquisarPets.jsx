import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import ConfirmModal from '../components/common/ConfirmModal';

export default function PesquisarPets() {
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    fetchPets();
  }, []);

  async function fetchPets() {
    setLoading(true);
    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      let query = supabase.from('familias').select('*');
      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const list = [];
        data.forEach(fam => {
          if (Array.isArray(fam.pets)) {
            fam.pets.forEach((pet, idx) => {
              list.push({
                id: `${fam.id}-pet-${idx}`,
                petIndex: idx,
                nome: pet.nome,
                especie: pet.especie,
                raca: pet.raca,
                idade: pet.idade,
                titular: fam.titular?.nome || fam.nome || 'Família',
                familiaId: fam.id
              });
            });
          }
        });
        setPets(list);
      }
    } catch (err) {
      console.error("Erro ao pesquisar pets:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDeletePet = (petItem) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Excluir Pet',
      message: `Deseja realmente remover o pet "${petItem.nome}"?`,
      onConfirm: async () => {
        try {
          const { data: famData } = await supabase.from('familias').select('*').eq('id', petItem.familiaId).single();
          if (famData && Array.isArray(famData.pets)) {
            const updatedPets = famData.pets.filter((_, idx) => idx !== petItem.petIndex);
            await supabase.from('familias').update({ pets: updatedPets }).eq('id', petItem.familiaId);
            setPets(prev => prev.filter(p => p.id !== petItem.id));
          }
        } catch (e) {
          alert("Erro ao excluir pet: " + e.message);
        }
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const filtered = pets.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return String(p.nome || '').toLowerCase().includes(q) || String(p.especie || '').toLowerCase().includes(q) || String(p.titular || '').toLowerCase().includes(q);
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
        <span>Famílias</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>Pesquisar Pets</span>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>Pesquisar Pets</h1>
      </div>

      <div style={{ background: 'white', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <i className="fas fa-search" style={{ color: '#94a3b8' }}></i>
        <input
          type="text"
          placeholder="Pesquisar por nome do pet, espécie ou titular da família..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem', color: '#334155' }}
        />
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 16px' }}>Nome do Pet</th>
              <th style={{ padding: '14px 16px' }}>Espécie</th>
              <th style={{ padding: '14px 16px' }}>Raça</th>
              <th style={{ padding: '14px 16px' }}>Idade</th>
              <th style={{ padding: '14px 16px' }}>Titular Responsável</th>
              <th style={{ padding: '14px 16px', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Carregando pets...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  Nenhum pet encontrado.
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                    <i className="fas fa-paw" style={{ marginRight: '8px', color: '#1565C0' }}></i> {p.nome}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{p.especie}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{p.raca || '-'}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{p.idade || '-'}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>{p.titular}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button onClick={() => navigate(`/familias/nova?id=${p.familiaId}`)} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#1565C0', cursor: 'pointer', fontWeight: 600 }} title="Editar / Acessar Família">
                        <i className="fas fa-edit"></i> Acessar
                      </button>
                      <button onClick={() => handleDeletePet(p)} style={{ background: '#fee2e2', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }} title="Excluir Pet">
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
