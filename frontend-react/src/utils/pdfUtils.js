import { jsPDF } from 'jspdf';

export async function gerarPdfCarteirinhaBuffer(contrato, family, forceDownload = true) {
  return new Promise((resolve, reject) => {
    try {
      // ConfiguraÃ§Ã£o CR80 (CartÃ£o de CrÃ©dito) em milÃ­metros
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [53.98, 85.6]
      });

      // Extrai dados seguros
      let meta = {};
      if (contrato?.metadata) {
        try { meta = typeof contrato.metadata === 'string' ? JSON.parse(contrato.metadata) : contrato.metadata; } catch(e){}
      }
      let famMeta = {};
      if (family?.metadata) {
        try { famMeta = typeof family.metadata === 'string' ? JSON.parse(family.metadata) : family.metadata; } catch(e){}
      }

      const rawTit = family?.titular || contrato?.titular;
      const titularNome = (rawTit && typeof rawTit === 'object') 
        ? (rawTit.nome || rawTit.name || meta.titular) 
        : (rawTit || meta.titular || contrato?.cliente || 'CLIENTE NÃƒO IDENTIFICADO');
      
      const titularCpf = (() => {
        if (rawTit && typeof rawTit === 'object' && (rawTit.cpf || rawTit.documento)) return rawTit.cpf || rawTit.documento;
        if (meta.cpf) return meta.cpf;
        if (famMeta.titular && typeof famMeta.titular === 'object' && famMeta.titular.cpf) return famMeta.titular.cpf;
        if (family?.cpf) return family.cpf;
        if (contrato?.cpf) return contrato.cpf;
        if (contrato?.cpf_titular) return contrato.cpf_titular;
        return '000.000.000-00';
      })();

      const planoNome = contrato?.plano || meta.plano || 'Plano PadrÃ£o';
      const numeroContrato = contrato?.numero || contrato?.id || '0000';
      const validade = 'VÃ¡lido enquanto o contrato estiver ativo';

      // Cores
      const corFundo = '#1e293b'; // Slate 800
      const corFundoEscuro = '#0f172a'; // Slate 900
      const corTexto = '#ffffff';
      const corDestaque = '#38bdf8'; // Light blue
      const corMutada = '#94a3b8'; // Slate 400

      // ==========================================
      // FRENTE DO CARTÃƒO (PÃ¡gina 1)
      // ==========================================
      
      // Background
      doc.setFillColor(corFundo);
      doc.rect(0, 0, 85.6, 53.98, 'F');

      // Faixa Superior (Destaque) - Aumentada para dar espaÃ§o
      doc.setFillColor(corFundoEscuro);
      doc.rect(0, 0, 85.6, 14, 'F');

      // CabeÃ§alho / Logo Textual
      doc.setTextColor(corDestaque);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('QUALIFY', 6, 9);
      
      doc.setTextColor(corMutada);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CLUBE DE BENEFÃCIOS', 26, 9);

      // TÃ­tulo do CartÃ£o (movido um pouco para a direita e reduzido se necessÃ¡rio)
      doc.setTextColor(corTexto);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('CARTÃƒO DO ASSOCIADO', 80, 9, { align: 'right' });

      // Separador visual
      doc.setDrawColor('#334155');
      doc.setLineWidth(0.2);
      doc.line(6, 17, 80, 17);

      // Dados do Associado
      doc.setTextColor(corMutada);
      doc.setFontSize(6);
      doc.text('NOME DO TITULAR', 6, 23);
      doc.setTextColor(corTexto);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      // Trunca o nome se for muito longo
      const nomeCurto = String(titularNome).length > 30 ? String(titularNome).substring(0, 30) + '...' : String(titularNome);
      doc.text(nomeCurto.toUpperCase(), 6, 28);

      // CPF e Contrato (Lado a lado, mais espaÃ§ados)
      doc.setTextColor(corMutada);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CPF', 6, 35);
      doc.text('NÂº DO CONTRATO', 42, 35);

      doc.setTextColor(corTexto);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(String(titularCpf), 6, 39);
      doc.text(String(numeroContrato), 42, 39);

      // Plano
      doc.setTextColor(corMutada);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('PLANO CONTRATADO', 6, 46);
      
      doc.setTextColor(corDestaque);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(String(planoNome).toUpperCase(), 6, 50);

      // ==========================================
      // VERSO DO CARTÃƒO (PÃ¡gina 2)
      // ==========================================
      doc.addPage([53.98, 85.6], 'landscape');
      
      // Background do Verso
      doc.setFillColor(corFundoEscuro);
      doc.rect(0, 0, 85.6, 53.98, 'F');

      // Faixa MagnÃ©tica (Apenas visual)
      doc.setFillColor('#000000');
      doc.rect(0, 6, 85.6, 10, 'F');

      // Ãrea de assinatura (Tarja branca)
      doc.setFillColor('#ffffff');
      doc.rect(6, 20, 50, 7, 'F');
      
      doc.setTextColor(corMutada);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'italic');
      doc.text('Assinatura do Titular', 31, 25, { align: 'center' });

      // Textos Legais
      doc.setTextColor(corTexto);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      
      const textoLegal = [
        'Este cartÃ£o Ã© de uso pessoal e intransferÃ­vel.',
        'Sua validade estÃ¡ condicionada ao pagamento em dia',
        'das mensalidades e vigÃªncia do contrato.',
        'Em caso de perda ou roubo, comunique imediatamente a central.',
        '',
        'Central de Atendimento: (00) 0000-0000',
        'contato@qualify.com.br'
      ];
      
      doc.text(textoLegal, 6, 32);

      // RodapÃ© / Validade no verso
      doc.setFillColor(corFundo);
      doc.rect(0, 48, 85.6, 6, 'F');
      
      doc.setTextColor(corDestaque);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.text(validade.toUpperCase(), 42.8, 52, { align: 'center' });


      if (forceDownload) {
        doc.save(`Carteirinha_${String(titularNome).replace(/\s+/g, '_')}.pdf`);
        resolve(true);
      } else {
        const buffer = doc.output('arraybuffer');
        resolve(buffer);
      }
    } catch (err) {
      reject(err);
    }
  });
}
import { supabase } from '../services/supabase';
import jsPDFAutoTable from 'jspdf-autotable';

export async function gerarPdfContratoBuffer(contract, family, supabaseInstance) {
    const sb = supabaseInstance || supabase;
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    
    const numeroContrato = contract?.numero || contract?.id || 'S/N';
    
    let cMeta = {};
    if (contract?.metadata) {
      try { cMeta = typeof contract.metadata === 'string' ? JSON.parse(contract.metadata) : contract.metadata; } catch(e){}
    }
    
    const nomePlano = contract?.plano || cMeta.plano || 'Plano QUALIFY';
    
    const titularNome = (family?.titular && typeof family.titular === 'object') 
      ? (family.titular.nome || family.titular.name)
      : (contract?.titular || contract?.cliente || cMeta.titular || 'CLIENTE NÃO IDENTIFICADO');
      
    const titularCpf = (family?.titular && typeof family.titular === 'object')
      ? (family.titular.cpf || family.titular.documento)
      : (contract?.cpf || cMeta.cpf || family?.cpf || '');
      
    let dependentes = [];
    if (family?.dependentes && Array.isArray(family.dependentes)) {
      dependentes = family.dependentes;
    } else if (cMeta.dependentes && Array.isArray(cMeta.dependentes)) {
      dependentes = cMeta.dependentes;
    }
    
    let clausulasTexto = [
      '1. O presente contrato tem vigência conforme período estipulado, podendo ser renovado automaticamente.',
      '2. O CONTRATANTE se compromete a manter os pagamentos em dia conforme modalidade escolhida.',
      '3. Os serviços serão prestados conforme especificações do plano contratado.',
      '4. O cancelamento deve ser solicitado com no mínimo 30 (trinta) dias de antecedência.',
      '5. Em caso de inadimplência superior a 60 dias, o contrato poderá ser suspenso.',
      '6. Ambas as partes concordam com as condições aqui estabelecidas, firmando o presente instrumento.'
    ].join('\n\n');

    let planoId = contract?.plano_id || cMeta.plano_id || cMeta.planoId;
    let planoName = contract?.plano || cMeta.plano;

    if (planoId || planoName) {
      let query = sb.from('planos').select('id, metadata, name');
      if (planoId) {
          query = query.eq('id', planoId);
      } else if (planoName) {
          query = query.ilike('name', `%${planoName}%`);
      }
      
      const { data: planosList } = await query;
      if (planosList && planosList.length > 0) {
        const planos = planosList[0];
        let pMeta = {};
        try { pMeta = typeof planos.metadata === 'string' ? JSON.parse(planos.metadata) : (planos.metadata || {}); } catch(e){}
        
        const source = pMeta.clausulas || pMeta.contrato || pMeta.descricao || pMeta.plan_clause || pMeta.planClause;
        if (source) clausulasTexto = source;
      }
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30);
    doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    doc.setFontSize(11);
    doc.text(`Contrato nº ${numeroContrato} — Plano ${nomePlano}`, pageWidth / 2, y, { align: 'center' });
    y += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const companyName = window.localStorage.getItem('empresaSelecionadaNome') || 'VITAPLAN CLUBE DE BENEFÍCIOS LTDA';
    const valorStr = parseFloat(contract?.valor || cMeta.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const textoObjeto = `O presente contrato tem por objeto a prestação de serviços de ${nomePlano}, celebrado entre ${companyName} ("CONTRATADA"), e ${titularNome} ("CONTRATANTE"), CPF/CNPJ ${titularCpf || 'não informado'}, sob o valor mensal de ${valorStr}, com cobrança via ${contract?.forma_pagamento || cMeta.forma_pagamento || 'Pix'}, conforme condições abaixo estabelecidas.`;
    
    const objLines = doc.splitTextToSize(textoObjeto, pageWidth - 40);
    doc.text(objLines, 20, y);
    y += objLines.length * 6 + 10;
    
    if (dependentes && dependentes.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Lista de Dependentes:', 20, y);
      y += 5;
      const depData = dependentes.map(d => [d.nome || '—', d.parentesco || '—', d.cpf || d.documento || '—']);
      autoTable(doc, {
        startY: y,
        head: [['Nome', 'Parentesco', 'CPF']],
        body: depData,
        theme: 'striped',
        styles: { fontSize: 9 },
        margin: { left: 20, right: 20 }
      });
      y = doc.lastAutoTable.finalY + 15;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Cláusulas do Contrato:', 20, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const clauseLines = doc.splitTextToSize(clausulasTexto, pageWidth - 40);
    
    for (let i = 0; i < clauseLines.length; i++) {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }
      doc.text(clauseLines[i], 20, y);
      y += 5;
    }
    
    y += 20;
    if (y > pageHeight - 40) {
       doc.addPage();
       y = 30;
    }
    
    doc.line(30, y, pageWidth / 2 - 10, y);
    doc.line(pageWidth / 2 + 10, y, pageWidth - 30, y);
    y += 5;
    doc.setFontSize(8);
    doc.text('Assinatura da CONTRATADA', 30, y);
    doc.text('Assinatura do CONTRATANTE', pageWidth / 2 + 10, y);
    
    doc.save(`Contrato_${numeroContrato}.pdf`);
}


function calcMod10Febraban(numStr) {
  let sum = 0;
  let weight = 2;
  for (let i = numStr.length - 1; i >= 0; i--) {
    let prod = parseInt(numStr[i], 10) * weight;
    if (prod > 9) prod = Math.floor(prod / 10) + (prod % 10);
    sum += prod;
    weight = weight === 2 ? 1 : 2;
  }
  const rem = sum % 10;
  return rem === 0 ? 0 : 10 - rem;
}

function calcMod11Febraban(num43) {
  let sum = 0;
  let weight = 2;
  for (let i = num43.length - 1; i >= 0; i--) {
    sum += parseInt(num43[i], 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rem = sum % 11;
  const dv = 11 - rem;
  if (dv === 0 || dv === 10 || dv === 11) return 1;
  return dv;
}

export function gerarDadosFebrabanBoleto(valor, vencimentoStr, nossoNumeroRaw) {
  const banco = '237';
  const moeda = '9';

  const cleanDate = String(vencimentoStr || new Date().toISOString().split('T')[0]).slice(0, 10);
  const dtVenc = new Date(`${cleanDate}T12:00:00Z`);
  const dtBase = new Date('1997-10-07T12:00:00Z');
  let diffDays = Math.round((dtVenc.getTime() - dtBase.getTime()) / 86400000);
  if (isNaN(diffDays) || diffDays < 1000) diffDays = 1000;
  if (diffDays >= 10000) diffDays = ((diffDays - 10000) % 9000) + 1000;
  const fatorVencimento = String(diffDays).padStart(4, '0');

  const valorNum = Math.max(0, parseFloat(valor) || 0);
  const valorCentavos = String(Math.round(valorNum * 100)).padStart(10, '0').slice(-10);

  const agencia = '2379';
  const carteira = '09';
  const nossoNumero = String(nossoNumeroRaw || '1').replace(/\D/g, '').padStart(11, '0').slice(-11);
  const conta = '0053199';
  const campoLivre = `${agencia}${carteira}${nossoNumero}${conta}0`; // 25 dígitos exatos

  const codigoSemDv = `${banco}${moeda}${fatorVencimento}${valorCentavos}${campoLivre}`; // 43 dígitos
  const dvGeral = String(calcMod11Febraban(codigoSemDv));
  const codigoBarras = `${banco}${moeda}${dvGeral}${fatorVencimento}${valorCentavos}${campoLivre}`; // 44 dígitos

  const campo1Raw = `${banco}${moeda}${campoLivre.slice(0, 5)}`;
  const dv1 = calcMod10Febraban(campo1Raw);
  const campo1 = `${campo1Raw.slice(0, 5)}.${campo1Raw.slice(5)}${dv1}`;

  const campo2Raw = campoLivre.slice(5, 15);
  const dv2 = calcMod10Febraban(campo2Raw);
  const campo2 = `${campo2Raw.slice(0, 5)}.${campo2Raw.slice(5)}${dv2}`;

  const campo3Raw = campoLivre.slice(15, 25);
  const dv3 = calcMod10Febraban(campo3Raw);
  const campo3 = `${campo3Raw.slice(0, 5)}.${campo3Raw.slice(5)}${dv3}`;

  const campo5 = `${fatorVencimento}${valorCentavos}`;
  const linhaDigitavel = `${campo1} ${campo2} ${campo3} ${dvGeral} ${campo5}`;

  return {
    banco: '237-2',
    agenciaConta: `${agencia}-0 / ${conta}-8`,
    nossoNumero,
    codigoBarras,
    linhaDigitavel
  };
}

function drawItf25Barcode(doc, code44, startX, startY, height = 13) {
  const patterns = [
    '00110', // 0
    '10001', // 1
    '01001', // 2
    '11000', // 3
    '00101', // 4
    '10100', // 5
    '01100', // 6
    '00011', // 7
    '10010', // 8
    '01010'  // 9
  ];
  const digits = String(code44 || '').replace(/\D/g, '').padStart(44, '0').slice(0, 44);
  const narrow = 0.31;
  const wide = 0.78;
  let x = startX;

  doc.setFillColor(0, 0, 0);
  // Start pattern (nnnn: narrow bar, narrow space, narrow bar, narrow space)
  doc.rect(x, startY, narrow, height, 'F');
  x += narrow + narrow;
  doc.rect(x, startY, narrow, height, 'F');
  x += narrow + narrow;

  for (let i = 0; i < digits.length; i += 2) {
    const pBar = patterns[parseInt(digits[i], 10)] || patterns[0];
    const pSpace = patterns[parseInt(digits[i + 1], 10)] || patterns[0];
    for (let j = 0; j < 5; j++) {
      const wBar = pBar[j] === '1' ? wide : narrow;
      const wSpace = pSpace[j] === '1' ? wide : narrow;
      doc.rect(x, startY, wBar, height, 'F');
      x += wBar + wSpace;
    }
  }

  // Stop pattern (wnn: wide bar, narrow space, narrow bar)
  doc.rect(x, startY, wide, height, 'F');
  x += wide + narrow;
  doc.rect(x, startY, narrow, height, 'F');
}

async function fetchQrImageBase64(url) {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarPdfBoletoBuffer(cobranca, contract, family) {
  let jsPDF;
  try {
    const jspdfModule = await import('jspdf');
    jsPDF = jspdfModule.jsPDF || jspdfModule.default;
  } catch (err) {
    throw new Error('Falha ao carregar biblioteca de PDF: ' + err.message);
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let cMeta = {};
  if (contract?.metadata) {
    try { cMeta = typeof contract.metadata === 'string' ? JSON.parse(contract.metadata) : contract.metadata; } catch (e) {}
  }
  let famMeta = {};
  if (family?.metadata) {
    try { famMeta = typeof family.metadata === 'string' ? JSON.parse(family.metadata) : family.metadata; } catch (e) {}
  }
  let cobMeta = {};
  if (cobranca?.metadata) {
    try { cobMeta = typeof cobranca.metadata === 'string' ? JSON.parse(cobranca.metadata) : cobranca.metadata; } catch (e) {}
  }

  const companyName = localStorage.getItem('empresaSelecionadaNome') || 'QUALIFY SERVICOS E BENEFICIOS';
  const numeroContrato = contract?.numero || contract?.id || cobranca?.contrato_numero || '0000';

  const famTit = (typeof family?.titular === 'object' && family?.titular) ? family.titular : (famMeta.titular || {});
  const pagadorNome = cobranca?.pagador_nome || famTit.nome || contract?.titular || cMeta.titular || 'Cliente Associado';
  const pagadorDoc = cobranca?.pagador_documento || famTit.cpf || famTit.documento || family?.cpf || cMeta.cpf || '';

  const endObj = cobMeta?.endereco || family?.endereco || famMeta?.endereco || cMeta?.endereco || {};
  const logradouro = endObj.logradouro || endObj.rua || '';
  const numeroEnd = endObj.numero || endObj.numero_end || '';
  const bairro = endObj.bairro || '';
  const cidade = endObj.cidade || endObj.localidade || '';
  const uf = endObj.uf || endObj.estado || '';
  const cep = endObj.cep || '';
  const enderecoLinha = [
    logradouro ? `${logradouro}${numeroEnd ? `, ${numeroEnd}` : ''}` : '',
    bairro,
    cidade ? `${cidade}${uf ? `/${uf}` : ''}` : '',
    cep ? `CEP: ${cep}` : ''
  ].filter(Boolean).join(' - ') || 'Endereco conforme cadastro';

  const valorNum = parseFloat(cobranca?.valor || contract?.valor || cMeta.valor || 0) || 0;
  const valorFormatado = valorNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const vencStr = cobranca?.vencimento || new Date().toISOString().split('T')[0];
  const [vy, vm, vd] = String(vencStr).slice(0, 10).split('-');
  const vencFormatado = (vy && vm && vd) ? `${vd}/${vm}/${vy}` : vencStr;
  const emissaoFormatada = new Date().toLocaleDateString('pt-BR');

  const seedId = cobMeta?.nosso_numero || String(cobranca?.id || numeroContrato).replace(/\D/g, '') || String(numeroContrato);
  const febraban = gerarDadosFebrabanBoleto(valorNum, vencStr, seedId);
  const nossoNumero = febraban.nossoNumero;
  const linhaDigitavel = febraban.linhaDigitavel;
  const codigoBarras = febraban.codigoBarras;

  const pixCopiaECola = cobranca?.pix_copia_e_cola || cobMeta?.pix_copia_e_cola || '';
  const qrUrl = cobranca?.qrcode || cobMeta?.qrcode || '';
  const linkPagamento = cobranca?.link_pagamento || cobranca?.invoice_url || cobMeta?.paymentLink || '';
  const qrBase64 = await fetchQrImageBase64(qrUrl);

  // Cabecalho Recibo do Pagador
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(200, 16, 46); // Vermelho Bradesco tradicional
  doc.text('Banco Bradesco S.A.', 15, 18);
  doc.setTextColor(20);
  doc.text('|  237-2  |', 65, 18);
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text('RECIBO DO PAGADOR', 195, 18, { align: 'right' });

  doc.line(15, 21, 195, 21);

  // Quadro Recibo
  doc.rect(15, 24, 180, 42);
  doc.line(15, 38, 195, 38);
  doc.line(15, 52, 195, 52);
  doc.line(130, 24, 130, 66);
  doc.line(162, 24, 162, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Beneficiario / Cedente', 17, 28);
  doc.text('No Contrato / Doc', 132, 28);
  doc.text('Vencimento', 164, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20);
  doc.text(companyName.slice(0, 45), 17, 35);
  doc.text(String(numeroContrato), 132, 35);
  doc.text(vencFormatado, 164, 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Pagador / Sacado', 17, 42);
  doc.text('Nosso Numero', 132, 42);
  doc.text('(=) Valor do Documento', 164, 42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20);
  doc.text(`${pagadorNome}${pagadorDoc ? ` - CPF/CNPJ: ${pagadorDoc}` : ''}`.slice(0, 65), 17, 49);
  doc.text(nossoNumero, 132, 49);
  doc.text(valorFormatado, 164, 49);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Descricao / Demonstrativo', 17, 56);
  doc.text('Data de Emissao', 132, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(20);
  doc.text(String(cobranca?.descricao || `Mensalidade do Contrato #${numeroContrato}`).slice(0, 65), 17, 63);
  doc.text(emissaoFormatada, 132, 63);

  // Linha pontilhada de corte
  doc.setLineDashPattern([2, 2], 0);
  doc.line(15, 73, 195, 73);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(6.5);
  doc.setTextColor(130);
  doc.text('Corte na linha pontilhada', 195, 71, { align: 'right' });

  // Ficha de Compensacao Tradicional
  let y = 82;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(200, 16, 46);
  doc.text('Bradesco', 15, y);
  doc.setTextColor(20);
  doc.text('| 237-2 |', 38, y);
  doc.line(55, y - 5, 55, y + 1);
  doc.setFontSize(9.5);
  doc.text(linhaDigitavel, 195, y, { align: 'right' });

  y += 3;
  doc.setLineWidth(0.4);
  doc.line(15, y, 195, y);

  y += 2;
  doc.setLineWidth(0.25);
  doc.rect(15, y, 180, 108);

  // Linhas horizontais da Ficha
  doc.line(15, y + 14, 195, y + 14);
  doc.line(15, y + 28, 195, y + 28);
  doc.line(15, y + 42, 195, y + 42);
  doc.line(15, y + 84, 195, y + 84);

  // Colunas direita (Vencimento / Valores)
  doc.line(145, y, 145, y + 84);

  // Campos Topo: Local de pagamento + Vencimento
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('Local de Pagamento', 17, y + 4);
  doc.text('Vencimento', 147, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20);
  doc.text('PAGAVEL PREFERENCIALMENTE NA REDE BRADESCO OU EM QUALQUER BANCO ATE O VENCIMENTO', 17, y + 11);
  doc.setFontSize(10);
  doc.text(vencFormatado, 147, y + 11);

  // Linha 2: Beneficiario + Agencia/Codigo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('Beneficiario', 17, y + 18);
  doc.text('Agencia / Codigo Beneficiario', 147, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20);
  doc.text(companyName.slice(0, 65), 17, y + 25);
  doc.text(febraban.agenciaConta, 147, y + 25);

  // Linha 3: Data doc, No doc, Especie, Aceite, Nosso Numero, Valor
  doc.line(45, y + 28, 45, y + 42);
  doc.line(82, y + 28, 82, y + 42);
  doc.line(102, y + 28, 102, y + 42);
  doc.line(115, y + 28, 115, y + 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('Data do Doc.', 17, y + 32);
  doc.text('No do Documento', 47, y + 32);
  doc.text('Especie Doc.', 84, y + 32);
  doc.text('Aceite', 104, y + 32);
  doc.text('Nosso Numero', 117, y + 32);
  doc.text('(=) Valor do Documento', 147, y + 32);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20);
  doc.text(emissaoFormatada, 17, y + 39);
  doc.text(`CONT-${numeroContrato}`, 47, y + 39);
  doc.text('DM', 84, y + 39);
  doc.text('N', 104, y + 39);
  doc.text(nossoNumero, 117, y + 39);
  doc.setFontSize(10);
  doc.text(valorFormatado, 147, y + 39);

  // Linha 4: Instrucoes Oficiais de Boleto Bancario
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('Instrucoes (Texto de responsabilidade do beneficiario)', 17, y + 46);
  doc.text('(-) Desconto / Abatimento', 147, y + 46);
  doc.line(145, y + 55, 195, y + 55);
  doc.text('(+) Juros / Multa', 147, y + 59);
  doc.line(145, y + 68, 195, y + 68);
  doc.text('(=) Valor Cobrado', 147, y + 72);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20);
  doc.text(String(cobranca?.descricao || `Referente ao Contrato #${numeroContrato}`).slice(0, 75), 17, y + 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(40);
  doc.text('Sr. Caixa, nao receber apos o vencimento.', 17, y + 58);
  doc.text('Apos o vencimento cobrar juros de 1% ao mes e multa de 2%.', 17, y + 63);
  doc.text('Nao receber pagamento parcial ou com cheque.', 17, y + 68);
  doc.text('Em caso de duvidas sobre este documento, entre em contato com o beneficiario.', 17, y + 73);
  if (cobMeta?.mensagem) {
    doc.text(String(cobMeta.mensagem).slice(0, 75), 17, y + 78);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text(valorFormatado, 147, y + 79);

  // Linha 5: Pagador / Sacado + Endereco Completo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('Pagador / Sacado', 17, y + 88);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20);
  doc.text(`${pagadorNome}${pagadorDoc ? `   -   CPF/CNPJ: ${pagadorDoc}` : ''}`, 17, y + 94);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(50);
  doc.text(enderecoLinha.slice(0, 95), 17, y + 100);
  doc.setFontSize(6.5);
  doc.setTextColor(120);
  doc.text('Autenticacao Mecanica - Ficha de Compensacao', 193, y + 106, { align: 'right' });

  // Codigo de Barras padrao FEBRABAN ITF-25 (44 digitos)
  drawItf25Barcode(doc, codigoBarras, 15, y + 112, 14);

  doc.save(`Boleto_Contrato_${numeroContrato}_${vencStr}.pdf`);
}
