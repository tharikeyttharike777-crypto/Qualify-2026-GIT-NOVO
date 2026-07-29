
    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    // ESTADO GLOBAL
    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    const ITEMS_PER_PAGE = 15;
    let allData = [];          // dados brutos deduplicados
    let filteredData = [];     // apÃƒÂ³s busca
    let currentPage = 1;
    let totalPages = 1;
    const selectedRows = new Set(); // chaves selecionadas (numero)
    let _deletionInProgress = false; // Flag de supressÃ£Â£o Ã¢â‚¬â€ bloqueia re-renders durante exclusÃ£Â£o
    let currentFilterTab = 'all';    // Aba de filtro ativa no seletor de status

    // DOM helpers
    const $body = () => document.getElementById('contractsBody');
    const $empty = () => document.getElementById('emptyState');
    const $info = () => document.getElementById('recordsInfo');
    const $search = () => document.getElementById('searchInput');
    const $pagCtrl = () => document.getElementById('paginationControls');
    const $bulkBar = () => document.getElementById('bulkBar');
    const $selCount = () => document.getElementById('selectedCount');
    const $masterCb = () => document.getElementById('masterCheckbox');

    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    // UTILIDADES
    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    function normalizeStatus(s) { const v = String(s || '').trim().toLowerCase(); return v || 'ativo'; }
    function statusClass(s) {
      const v = normalizeStatus(s);
      if (['cancelado'].includes(v)) return 'cancelado';
      if (['inadimplente', 'atrasado'].includes(v)) return 'inadimplente';
      if (['encerrado', 'inativo'].includes(v)) return 'encerrado';
      return 'ativo';
    }

    let familiasCache = null;
    function getTitularByFamilyIdCached(familyId) {
      try {
        if (!familyId) return null;
        if (!familiasCache) {
          const raw = localStorage.getItem('familias');
          familiasCache = raw ? JSON.parse(raw) : [];
        }
        return (familiasCache || []).find(f => String(f.id) === String(familyId))?.titular?.nome || null;
      } catch (_) { return null; }
    }

    function toContract(data, fam) {
      let meta = {};
      if (typeof data.metadata === 'string') {
        try { meta = JSON.parse(data.metadata); } catch(e) {}
      } else {
        meta = data.metadata || {};
      }
      const numeroRaw = data.numero || data.id || meta.numero || '';
      const numeroLimpo = String(numeroRaw).replace(/\D/g, '');
      const numeroNumerico = numeroLimpo ? parseInt(numeroLimpo, 10) : (numeroRaw || Date.now());
      
      let titularName = meta.titular || data.titular || data.cliente || fam?.titular?.nome || fam?.titular;
      if (!titularName || titularName === '-' || titularName === 'â€”') {
        if (fam && Array.isArray(fam.dependentes)) {
          const titDep = fam.dependentes.find(d => d && String(d.parentesco||'').toLowerCase() === 'titular') || fam.dependentes[0];
          if (titDep && titDep.nome) titularName = titDep.nome;
        }
        if (!titularName && fam && fam.nome) titularName = fam.nome;
        if (!titularName && data.familyId) {
          const cached = getTitularByFamilyIdCached(data.familyId);
          if (cached) titularName = cached;
        }
      }
      if (!titularName || titularName === '-' || titularName === 'â€”') titularName = 'Em Cadastramento';

      let planoName = meta.plano || data.plano || data.planoNome || fam?.plano || 'Plano QUALIFY';

      return {
        id: numeroNumerico,
        numero: String(numeroRaw || numeroNumerico),
        date: meta.date || data.date || data.dataInicio || new Date().toLocaleDateString('pt-BR'),
        titular: titularName,
        plano: planoName,
        status: normalizeStatus(meta.status || data.status || 'ativo'),
        vendedor: (meta.vendedor || data.vendedor && String(data.vendedor).trim()) ? (meta.vendedor || data.vendedor) : 'nenhum',
        firestoreId: data.firestoreId || data.id || null,
        firestoreSource: data.firestoreSource || null,
        familyId: data.familyId || (fam ? fam.id : null)
      };
    }

    function updateKPICards() {
      const elTotal = document.getElementById('kpiTotal');
      const elAtivos = document.getElementById('kpiAtivos');
      const elPendentes = document.getElementById('kpiPendentes');
      const elInadim = document.getElementById('kpiInadimplentes');

      let ativos = 0, pendentes = 0, inadimCancel = 0;
      allData.forEach(c => {
        const st = normalizeStatus(c.status);
        if (['ativo', 'adimplente'].includes(st)) ativos++;
        else if (['pendente', 'renovacao', 'renovaÃ§Ã£o', 'renegociacao', 'renegociaÃ§Ã£o', 'inadimplente', 'atrasada', 'em atraso'].includes(st)) pendentes++;
        else if (['cancelado', 'encerrado', 'inativo'].includes(st)) inadimCancel++;
        else inadimCancel++;
      });

      if (elTotal) elTotal.textContent = allData.length;
      if (elAtivos) elAtivos.textContent = ativos;
      if (elPendentes) elPendentes.textContent = pendentes;
      if (elInadim) elInadim.textContent = inadimCancel;
    }

    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    // PAGINAÃƒâ€¡ÃƒÆ’O
    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    function getPageData() {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }

    function renderPagination() {
      totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
      if (currentPage > totalPages) currentPage = totalPages;

      const ctrl = $pagCtrl();
      if (totalPages <= 1) { ctrl.innerHTML = ''; return; }

      let html = '';
      // Anterior
      html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i> Anterior</button>`;

      // NÃºmeros de pÃ¡gina com elipsis
      const pages = buildPageNumbers(currentPage, totalPages);
      pages.forEach(p => {
        if (p === '...') {
          html += '<span class="page-ellipsis">â€¦</span>';
        } else {
          html += `<button class="${p === currentPage ? 'active' : ''}" onclick="goToPage(${p})">${p}</button>`;
        }
      });

      // PrÃ³xima
      html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
        PrÃ³xima <i class="fas fa-chevron-right"></i></button>`;

      ctrl.innerHTML = html;
    }

    function buildPageNumbers(current, total) {
      if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
      const pages = [1];
      if (current > 3) pages.push('...');
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
      if (current < total - 2) pages.push('...');
      pages.push(total);
      return pages;
    }

    function goToPage(page) {
      if (page < 1 || page > totalPages) return;
      currentPage = page;
      renderTable();
      renderPagination();
      syncMasterCheckbox();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
    // RENDERIZAÃ‡ÃƒO DA TABELA
    // â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
    function renderTable() {
      if (_deletionInProgress) { console.log('ðŸ›‘ renderTable bloqueado â€” exclusÃ£o em andamento'); return; }
      const pageData = getPageData();
      const body = $body();

      if (filteredData.length === 0) {
        body.innerHTML = '';
        $empty().style.display = 'block';
      } else {
        $empty().style.display = 'none';
        body.innerHTML = pageData.map(c => {
          const isSelected = selectedRows.has(c.numero);
          return `<tr class="${isSelected ? 'selected' : ''}" data-numero="${c.numero}">
            <td class="col-check"><input type="checkbox" ${isSelected ? 'checked' : ''}
              onchange="toggleRow('${c.numero}', this.checked)" /></td>
            <td>${c.numero}</td>
            <td>${c.date}</td>
            <td>${c.titular}</td>
            <td>${c.plano}</td>
            <td><span class="badge ${statusClass(c.status)}">${c.status}</span></td>
            <td>${c.vendedor}</td>
            <td><a class="btn btn-outline-primary btn-sm" href="../pages/edicao-contrato.html?numero=${encodeURIComponent(c.numero)}" onclick="sessionStorage.setItem('currentContractNumero', '${c.numero}')">
              <i class="fas fa-edit" style="margin-right:6px;"></i>Gerir</a></td>
          </tr>`;
        }).join('');
      }

      // Info: "Mostrando 1-15 de 23 registros"
      const start = filteredData.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
      const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length);
      const searchActive = String($search().value || '').trim().length > 0;
      $info().textContent = filteredData.length === 0
        ? 'Nenhum registro encontrado'
        : `Mostrando ${start}-${end} de ${filteredData.length} registros${searchActive ? ' (filtrados)' : ''}`;
    }

    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    // SELEÃƒâ€¡ÃƒÆ’O / BULK ACTIONS
    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    function toggleRow(numero, checked) {
      if (checked) selectedRows.add(numero); else selectedRows.delete(numero);
      // Highlight visual
      const row = document.querySelector(`tr[data-numero="${numero}"]`);
      if (row) row.classList.toggle('selected', checked);
      updateBulkBar();
      syncMasterCheckbox();
    }

    function syncMasterCheckbox() {
      const pageData = getPageData();
      const mc = $masterCb();
      if (pageData.length === 0) { mc.checked = false; mc.indeterminate = false; return; }
      const checkedOnPage = pageData.filter(c => selectedRows.has(c.numero)).length;
      mc.checked = checkedOnPage === pageData.length;
      mc.indeterminate = checkedOnPage > 0 && checkedOnPage < pageData.length;
    }

    function masterToggle() {
      const pageData = getPageData();
      const mc = $masterCb();
      if (mc.checked) {
        pageData.forEach(c => selectedRows.add(c.numero));
      } else {
        pageData.forEach(c => selectedRows.delete(c.numero));
      }
      renderTable();
      updateBulkBar();
    }

    function updateBulkBar() {
      const bar = $bulkBar();
      $selCount().textContent = selectedRows.size;
      bar.classList.toggle('visible', selectedRows.size > 0);
    }

    function clearSelection() {
      selectedRows.clear();
      renderTable();
      updateBulkBar();
      syncMasterCheckbox();
    }

    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    // MODAL DE CONFIRMAÃƒâ€¡ÃƒÆ’O + EXCLUSÃƒÆ’O CASCATA
    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

    function openDeleteModal() {
      const count = selectedRows.size;
      if (count === 0) return;
      document.getElementById('deleteCount').textContent = count;
      document.getElementById('deleteCountBtn').textContent = count;
      document.getElementById('deleteModal').classList.add('open');
    }

    function closeDeleteModal() {
      document.getElementById('deleteModal').classList.remove('open');
      // Reset button state
      const btn = document.getElementById('btnConfirmDelete');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-trash"></i> Sim, excluir contratos';
    }

    function showToast(message, type = 'success') {
      const container = document.getElementById('toastContainer');
      const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)'; toast.style.transition = 'all .3s'; }, 3700);
      setTimeout(() => toast.remove(), 4000);
    }

    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    // EXCLUSÃƒÆ’O ATÃƒâ€MICA Ã¢â‚¬â€ SINGLE WRITEBATCH
    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    async function confirmBulkDelete() {
      const btn = document.getElementById('btnConfirmDelete');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner"></i> Excluindo...';

      const frozenIds = [...selectedRows];
      const totalToDelete = frozenIds.length;

      console.log(`Ã°Å¸â€â€™ EXCLUSÃƒÆ’O INICIADA Ã¢â‚¬â€ ${totalToDelete} itens congelados:`, frozenIds);

      const mt = window.multitenantConfig;
      if (!mt || !mt.getActiveCompany()) {
        closeDeleteModal();
        showToast('Erro: empresa ativa nÃƒÂ£o disponÃƒÂ­vel.', 'error');
        return;
      }

      _deletionInProgress = true;

      try {
        const contractsCol = mt.getCompanyCollection('contratos');
        const familiasCol = mt.getCompanyCollection('familias');

        let successCount = 0;
        let failCount = 0;

        // Processamento sequencial/Promise.all para simular batch
        // Nota: A abstraÃƒÂ§ÃƒÂ£o multitenant nÃƒÂ£o suporta batch, entÃƒÂ£o usamos operaÃƒÂ§ÃƒÂµes individuais
        const tasks = frozenIds.map(async (numero) => {
          const contract = allData.find(c => c.numero === numero);
          if (!contract) return;
          try {
            // Exclui de ambas as fontes (contratos individuais e array em famílias, sem 'else if')
            try {
              if (contract.firestoreId && contractsCol) await contractsCol.doc(contract.firestoreId).delete().catch(()=>{});
              if (window.supabase) await window.supabase.from('contratos').delete().eq('numero', String(numero)).catch(()=>{});
            } catch(e) {}

            try {
              if (contract.familyId && familiasCol) {
                const famSnap = await familiasCol.doc(contract.familyId).get();
                if (famSnap.exists) {
                  const famData = famSnap.data();
                  const updatedContratos = (famData.contratos || []).filter(ct =>
                    String(ct.numero || ct.id || '').trim() !== String(numero).trim() &&
                    String(ct.numero || ct.id || '').trim().replace(/^0+/, '') !== String(numero).trim().replace(/^0+/, '')
                  );
                  await familiasCol.doc(contract.familyId).update({ contratos: updatedContratos });
                }
              }
            } catch(e) {}

            try {
              localStorage.removeItem(`CONTRACT_EDIT_${numero}`);
              const ctsLocal = JSON.parse(localStorage.getItem('contratos') || '[]');
              localStorage.setItem('contratos', JSON.stringify(ctsLocal.filter(c => String(c.numero||c.id)!==String(numero))));
              const famsLocal = JSON.parse(localStorage.getItem('familias') || '[]');
              let famsModified = false;
              famsLocal.forEach(f => {
                if (Array.isArray(f.contratos)) {
                  const ant = f.contratos.length;
                  f.contratos = f.contratos.filter(c => String(c.numero||c.id)!==String(numero));
                  if (f.contratos.length !== ant) famsModified = true;
                }
              });
              if (famsModified) localStorage.setItem('familias', JSON.stringify(famsLocal));
            } catch(e) {}

            successCount++;
          } catch (err) {
            console.error(`Erro ao excluir contrato ${numero}:`, err);
            failCount++;
          }
        });

        await Promise.all(tasks);

        const frozenSet = new Set(frozenIds);
        allData = allData.filter(c => !frozenSet.has(c.numero));
        selectedRows.clear();

        _deletionInProgress = false;
        applySearchAndRender();
        updateBulkBar();
        syncMasterCheckbox();
        closeDeleteModal();

        if (failCount > 0) {
          showToast(`${successCount} excluÃ­dos, ${failCount} falharam.`, 'warning');
        } else {
          showToast(`${totalToDelete} contrato(s) excluÃ­do(s) com sucesso!`, 'success');
        }

      } catch (error) {
        console.error('âŒ Erro na exclusÃ£o:', error);
        _deletionInProgress = false;
        closeDeleteModal();
        showToast('Erro ao excluir: ' + error.message, 'error');
      }
    }

    // â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
    // BUSCA + ATUALIZAÃ‡ÃƒO COMPLETA
    // â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
    function applySearch(data) {
      let result = data;
      if (typeof currentFilterTab !== 'undefined' && currentFilterTab && currentFilterTab !== 'all') {
        result = result.filter(c => {
          const st = normalizeStatus(c.status);
          if (currentFilterTab === 'ativo') return ['ativo', 'adimplente'].includes(st);
          if (currentFilterTab === 'inadimplente') return ['pendente', 'renovacao', 'renovaÃ§Ã£o', 'renegociacao', 'renegociaÃ§Ã£o', 'inadimplente', 'atrasado', 'em atraso', 'pendente'].includes(st);
          if (currentFilterTab === 'cancelado') return ['cancelado', 'encerrado', 'inativo'].includes(st);
          return true;
        });
      }
      const q = String($search()?.value || '').trim().toLowerCase();
      if (!q) return result;
      return result.filter(c => `${c.numero} ${c.titular} ${c.vendedor} ${c.plano} ${c.status}`.toLowerCase().includes(q));
    }

    function applySearchAndRender() {
      if (_deletionInProgress) { console.log('â³ applySearchAndRender bloqueado â€” exclusÃ£o em andamento'); return; }
      filteredData = applySearch(allData);
      currentPage = 1;
      renderTable();
      renderPagination();
    }

    // â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
    // LOADING DE DADOS (7 FONTES COMPLETAS)
    // â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
    async function loadFromContratosFirestore() {
      try {
        const mt = window.multitenantConfig;
        if (!mt || !mt.getCompanyCollection || !mt.getActiveCompany()) return null;
        const snap = await mt.getCompanyCollection('contratos').get();
        return snap.docs.map(d => toContract({ id: d.id, firestoreId: d.id, firestoreSource: 'contratos', ...d.data() }));
      } catch (e) { return null; }
    }

    async function loadFromFamiliasFirestore() {
      try {
        const mt = window.multitenantConfig;
        if (!mt || !mt.getCompanyCollection || !mt.getActiveCompany()) return null;
        const snap = await mt.getCompanyCollection('familias').get();
        const list = [];
        snap.forEach(doc => {
          const fam = { id: doc.id, ...(doc.data() || {}) };
          const contratos = Array.isArray(fam.contratos) ? fam.contratos : [];
          contratos.forEach(ct => list.push(toContract({ ...ct, firestoreSource: 'familia', familyId: doc.id }, fam)));
        });
        return list;
      } catch (e) { return null; }
    }

    function loadFromLocalFamilias() {
      try {
        const raw = localStorage.getItem('familias'); if (!raw) return null;
        const familias = JSON.parse(raw || '[]') || [];
        const list = [];
        familias.forEach(fam => {
          (Array.isArray(fam.contratos) ? fam.contratos : []).forEach(ct => list.push(toContract(ct, fam)));
        });
        return list;
      } catch (e) { return null; }
    }

    function loadFromLocalContractEdits() {
      try {
        const list = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || '';
          if (k.startsWith('CONTRACT_EDIT_')) {
            try {
              const data = JSON.parse(localStorage.getItem(k) || '{}');
              if (data && (data.numero || data.id)) {
                list.push(toContract({
                  numero: data.numero || data.id,
                  date: data.dataContrato ? new Date(data.dataContrato).toLocaleDateString('pt-BR') : undefined,
                  plano: data.plano, status: data.situacao, vendedor: data.vendedor
                }));
              }
            } catch (_) { }
          }
        }
        return list;
      } catch (e) { return null; }
    }

    async function loadFromGlobalContratos() {
      try {
        const mt = window.multitenantConfig;
        if (!mt || !mt.initialized) return null;
        // No Supabase, 'contratos' sem empresa_id nÃƒÂ£o existe estruturalmente na ponte multitenant
        // mas podemos tentar simular se houver uma tabela global.
        // Por enquanto, mantemos vazio se nÃƒÂ£o houver contexto.
        return null;
      } catch (e) { return null; }
    }

    async function loadFromGlobalFamilias() {
      try {
        const mt = window.multitenantConfig;
        if (!mt || !mt.initialized) return null;
        return null;
      } catch (e) { return null; }
    }

    async function loadAll() {
      console.log('Ã°Å¸â€Â Iniciando carregamento de contratos...');
      try {
        const [a, b, e, f] = await Promise.all([
          loadFromContratosFirestore(),
          loadFromFamiliasFirestore(),
          loadFromGlobalContratos(),
          loadFromGlobalFamilias()
        ]);
        const c = loadFromLocalFamilias();
        const d = loadFromLocalContractEdits();

        // SUPABASE: carregar contratos e familias direto do banco
        let supaContratos = [];
        let supaFamilias = [];
        try {
          if (window.supabase) {
            const companyId = resolveCompanyId();
            if (companyId) {
              try {
                const { data: cData } = await window.supabase.from('contratos').select('*').eq('company_id', companyId);
                if (cData && cData.length) {
                  supaContratos = cData.map(ct => {
                    let meta = {};
                    if (ct.metadata) { try { meta = typeof ct.metadata === 'string' ? JSON.parse(ct.metadata) : ct.metadata; } catch(e){} }
                    return toContract({ ...ct, ...meta, firestoreSource: 'supabase_contratos' });
                  });
                }
              } catch(e) {}
              try {
                const { data: fData } = await window.supabase.from('familias').select('*').eq('company_id', companyId);
                if (fData && fData.length) {
                  fData.forEach(fam => {
                    let meta = {};
                    if (fam.metadata) { try { meta = typeof fam.metadata === 'string' ? JSON.parse(fam.metadata) : fam.metadata; } catch(e){} }
                    const famObj = { ...fam, ...meta };
                    const contratos = Array.isArray(famObj.contratos) ? famObj.contratos : [];
                    contratos.forEach(ct => supaFamilias.push(toContract({ ...ct, firestoreSource: 'supabase_familia', familyId: fam.id }, famObj)));
                  });
                }
              } catch(e) {}
            }
          }
        } catch(e) { console.warn('Falha Supabase contratos:', e); }

        console.log('contratos:', a?.length || 0, '| familias:', b?.length || 0,
          '| local:', c?.length || 0, '| edits:', d?.length || 0,
          '| supabase-c:', supaContratos.length, '| supabase-f:', supaFamilias.length);

        const combined = [...(a || []), ...(b || []), ...(c || []), ...(d || []), ...(e || []), ...(f || []), ...supaContratos, ...supaFamilias];
        const dedup = new Map();
        combined.forEach(cn => {
          const key = String(cn.numero || cn.id || '').trim();
          if (key && !dedup.has(key)) dedup.set(key, cn);
        });

        allData = Array.from(dedup.values()).filter(c => c && (c.numero || c.id));
        console.log('âœ… Total de contratos consolidados na central:', allData.length);

        updateKPICards();
        applySearchAndRender();

        // Busca reativa
        $search().addEventListener('input', () => applySearchAndRender());
      } catch (err) {
        console.error('Ã¢ÂÅ’ Erro de carregamento:', err);
        allData = []; applySearchAndRender();
      }
    }

    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    // INICIALIZAÃƒâ€¡ÃƒÆ’O AUTOSSUFICIENTE
    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    let _loadAllExecuted = false;

    function resolveCompanyId() {
      return localStorage.getItem('activeCompanyId')
        || localStorage.getItem('empresaSelecionadaId') || null;
    }

    function patchMultitenant(companyId) {
      const mt = window.multitenantConfig;
      if (!mt) return;
      if (mt.activeCompany && mt.activeCompany.id) return;
      if (companyId) {
        mt.activeCompany = mt.activeCompany || { id: companyId };
        mt.initialized = true;
      }
    }

    async function safeLoadAll() {
      if (_loadAllExecuted) return;
      _loadAllExecuted = true;
      const cid = resolveCompanyId();
      if (cid) patchMultitenant(cid);
      await loadAll();
    }

    document.addEventListener('DOMContentLoaded', () => {
      // Master checkbox
      $masterCb().addEventListener('change', masterToggle);

      // Vincular abas de filtro
      document.querySelectorAll('.contract-tab').forEach(btn => {
        btn.addEventListener('click', function() {
          document.querySelectorAll('.contract-tab').forEach(b => {
            b.classList.remove('active');
            b.style.background = 'white';
            b.style.color = '#475569';
            b.style.border = '1px solid #cbd5e1';
            b.style.boxShadow = 'none';
          });
          this.classList.add('active');
          this.style.background = '#3b82f6';
          this.style.color = 'white';
          this.style.border = 'none';
          this.style.boxShadow = '0 4px 10px rgba(59,130,246,0.3)';
          currentFilterTab = this.getAttribute('data-filter') || 'all';
          applySearchAndRender();
        });
      });

      // Auth
      if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
        window.auth.onAuthStateChanged(user => {
          if (user && user.uid) setTimeout(() => safeLoadAll(), 300);
          else setTimeout(() => safeLoadAll(), 500);
        });
      }
      window.addEventListener('multitenantReady', () => safeLoadAll(), { once: true });
      setTimeout(() => { if (!_loadAllExecuted) safeLoadAll(); }, 4000);
    });
  