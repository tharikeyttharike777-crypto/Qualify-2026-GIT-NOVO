import { jsPDF } from 'jspdf';

export async function gerarPdfCarteirinhaBuffer(contrato, family, forceDownload = true) {
  return new Promise((resolve, reject) => {
    try {
      // Configuração CR80 (Cartão de Crédito) em milímetros
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
      
      const titularNome = contrato?.titular || contrato?.cliente || meta.titular || 'CLIENTE NÃO IDENTIFICADO';
      const titularCpf = contrato?.cpf || contrato?.documento || meta.cpf || '000.000.000-00';
      const planoNome = contrato?.plano || meta.plano || 'Plano Padrão';
      const numeroContrato = contrato?.numero || contrato?.id || '0000';
      const validade = 'Válido enquanto o contrato estiver ativo';

      // Cores
      const corFundo = '#1e293b'; // Slate 800 (Azul muito escuro)
      const corTexto = '#ffffff';
      const corDestaque = '#38bdf8'; // Light blue

      // Background
      doc.setFillColor(corFundo);
      doc.rect(0, 0, 85.6, 53.98, 'F');

      // Faixa Superior (Destaque)
      doc.setFillColor('#0f172a');
      doc.rect(0, 0, 85.6, 12, 'F');

      // Cabeçalho / Logo Textual
      doc.setTextColor(corDestaque);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('QUALIFY', 5, 8);
      
      doc.setTextColor('#94a3b8');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CLUBE DE BENEFÍCIOS', 22, 8);

      // Título do Cartão
      doc.setTextColor(corTexto);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('CARTEIRINHA DO ASSOCIADO', 80, 8, { align: 'right' });

      // Dados do Associado
      doc.setTextColor('#94a3b8');
      doc.setFontSize(6);
      doc.text('NOME DO TITULAR', 5, 20);
      doc.setTextColor(corTexto);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(String(titularNome).toUpperCase(), 5, 24);

      // CPF e Contrato (Lado a lado)
      doc.setTextColor('#94a3b8');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CPF', 5, 30);
      doc.text('CONTRATO', 40, 30);

      doc.setTextColor(corTexto);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(String(titularCpf), 5, 34);
      doc.text(String(numeroContrato), 40, 34);

      // Plano
      doc.setTextColor('#94a3b8');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('PLANO', 5, 40);
      
      doc.setTextColor(corDestaque);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(String(planoNome).toUpperCase(), 5, 44);

      // Rodapé / Validade
      doc.setFillColor('#0f172a');
      doc.rect(0, 48, 85.6, 6, 'F');
      
      doc.setTextColor('#64748b');
      doc.setFontSize(5);
      doc.setFont('helvetica', 'italic');
      doc.text(validade, 42.8, 52, { align: 'center' });

      if (forceDownload) {
        doc.save(`Carteirinha_${titularNome.replace(/\s+/g, '_')}.pdf`);
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
