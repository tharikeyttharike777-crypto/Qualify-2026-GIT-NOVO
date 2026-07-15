/**
 * Excel Import Manager - Módulo para importação de dados Excel/CSV
 * Sistema Qualify - Versão 4.3
 */

class ExcelImportManager {
    constructor() {
        this.supportedFormats = ['.xlsx', '.xls', '.csv'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.currentData = null;
        this.fieldMappings = {};
        this.validationRules = {};
        this.importCallbacks = {};
        
        this.initializeLibraries();
    }

    /**
     * Inicializa as bibliotecas necessárias para leitura de Excel
     */
    initializeLibraries() {
        // Carrega SheetJS se não estiver disponível
        if (typeof XLSX === 'undefined') {
            this.loadSheetJS();
        }
    }

    /**
     * Carrega a biblioteca SheetJS dinamicamente
     */
    loadSheetJS() {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = () => {
            console.log('SheetJS carregado com sucesso');
        };
        script.onerror = () => {
            console.error('Erro ao carregar SheetJS');
            this.showError('Erro ao carregar biblioteca de Excel. Verifique sua conexão.');
        };
        document.head.appendChild(script);
    }

    /**
     * Cria interface de importação
     */
    createImportInterface(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container não encontrado:', containerId);
            return;
        }

        const interfaceHTML = `
            <div class="excel-import-container">
                <div class="import-header">
                    <h4><i class="fas fa-file-excel"></i> Importar Dados</h4>
                    <button class="btn-close" onclick="this.closest('.excel-import-container').style.display='none'">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="import-steps">
                    <div class="step active" data-step="1">
                        <span class="step-number">1</span>
                        <span class="step-title">Selecionar Arquivo</span>
                    </div>
                    <div class="step" data-step="2">
                        <span class="step-number">2</span>
                        <span class="step-title">Mapear Campos</span>
                    </div>
                    <div class="step" data-step="3">
                        <span class="step-number">3</span>
                        <span class="step-title">Validar e Importar</span>
                    </div>
                </div>

                <div class="import-content">
                    <!-- Passo 1: Seleção de arquivo -->
                    <div class="step-content active" data-step="1">
                        <div class="file-upload-area" id="fileUploadArea">
                            <div class="upload-icon">
                                <i class="fas fa-cloud-upload-alt"></i>
                            </div>
                            <div class="upload-text">
                                <p>Arraste e solte seu arquivo aqui ou <span class="upload-link">clique para selecionar</span></p>
                                <small>Formatos suportados: Excel (.xlsx, .xls) e CSV (.csv) - Máximo 10MB</small>
                            </div>
                            <input type="file" id="fileInput" accept=".xlsx,.xls,.csv" style="display: none;">
                        </div>
                        
                        <div class="file-info" id="fileInfo" style="display: none;">
                            <div class="file-details">
                                <i class="fas fa-file-excel"></i>
                                <div class="file-text">
                                    <span class="file-name" id="fileName"></span>
                                    <span class="file-size" id="fileSize"></span>
                                </div>
                                <button class="btn-remove" id="removeFile">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Passo 2: Mapeamento de campos -->
                    <div class="step-content" data-step="2">
                        <div class="mapping-container">
                            <div class="mapping-header">
                                <h5>Mapear Colunas do Arquivo</h5>
                                <p>Associe as colunas do seu arquivo aos campos do sistema:</p>
                            </div>
                            <div class="mapping-fields" id="mappingFields">
                                <!-- Campos de mapeamento serão inseridos dinamicamente -->
                            </div>
                            <div class="preview-data" id="previewData">
                                <!-- Preview dos dados será mostrado aqui -->
                            </div>
                        </div>
                    </div>

                    <!-- Passo 3: Validação e importação -->
                    <div class="step-content" data-step="3">
                        <div class="validation-container">
                            <div class="validation-summary" id="validationSummary">
                                <!-- Resumo da validação -->
                            </div>
                            <div class="validation-errors" id="validationErrors">
                                <!-- Erros de validação -->
                            </div>
                            <div class="import-progress" id="importProgress" style="display: none;">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="progressFill"></div>
                                </div>
                                <div class="progress-text" id="progressText">Preparando importação...</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="import-actions">
                    <button class="btn btn-secondary" id="prevStep" style="display: none;">
                        <i class="fas fa-arrow-left"></i> Anterior
                    </button>
                    <button class="btn btn-primary" id="nextStep">
                        Próximo <i class="fas fa-arrow-right"></i>
                    </button>
                    <button class="btn btn-success" id="importData" style="display: none;">
                        <i class="fas fa-upload"></i> Importar Dados
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = interfaceHTML;
        this.initializeEventListeners(container);
        this.applyStyles();
    }

    /**
     * Inicializa os event listeners da interface
     */
    initializeEventListeners(container) {
        const fileInput = container.querySelector('#fileInput');
        const fileUploadArea = container.querySelector('#fileUploadArea');
        const nextStep = container.querySelector('#nextStep');
        const prevStep = container.querySelector('#prevStep');
        const importData = container.querySelector('#importData');
        const removeFile = container.querySelector('#removeFile');

        // Upload de arquivo
        fileUploadArea.addEventListener('click', () => fileInput.click());
        fileUploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        fileUploadArea.addEventListener('drop', this.handleFileDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        removeFile.addEventListener('click', this.removeFile.bind(this));

        // Navegação entre passos
        nextStep.addEventListener('click', this.nextStep.bind(this));
        prevStep.addEventListener('click', this.prevStep.bind(this));
        importData.addEventListener('click', this.executeImport.bind(this));

        this.currentStep = 1;
    }

    /**
     * Manipula o evento de arrastar arquivo
     */
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    /**
     * Manipula o evento de soltar arquivo
     */
    handleFileDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    /**
     * Manipula a seleção de arquivo
     */
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    /**
     * Processa o arquivo selecionado
     */
    processFile(file) {
        // Validar formato
        if (!this.validateFileFormat(file)) {
            this.showError('Formato de arquivo não suportado. Use Excel (.xlsx, .xls) ou CSV (.csv)');
            return;
        }

        // Validar tamanho
        if (!this.validateFileSize(file)) {
            this.showError('Arquivo muito grande. Tamanho máximo: 10MB');
            return;
        }

        this.currentFile = file;
        this.showFileInfo(file);
        this.readFileData(file);
    }

    /**
     * Valida o formato do arquivo
     */
    validateFileFormat(file) {
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        return this.supportedFormats.includes(extension);
    }

    /**
     * Valida o tamanho do arquivo
     */
    validateFileSize(file) {
        return file.size <= this.maxFileSize;
    }

    /**
     * Mostra informações do arquivo selecionado
     */
    showFileInfo(file) {
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const fileUploadArea = document.getElementById('fileUploadArea');

        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);
        
        fileUploadArea.style.display = 'none';
        fileInfo.style.display = 'block';
        
        document.getElementById('nextStep').disabled = false;
    }

    /**
     * Remove o arquivo selecionado
     */
    removeFile() {
        this.currentFile = null;
        this.currentData = null;
        
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('fileUploadArea').style.display = 'block';
        document.getElementById('fileInput').value = '';
        document.getElementById('nextStep').disabled = true;
    }

    /**
     * Lê os dados do arquivo
     */
    readFileData(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                if (file.name.toLowerCase().endsWith('.csv')) {
                    this.parseCSVData(e.target.result);
                } else {
                    this.parseExcelData(e.target.result);
                }
            } catch (error) {
                console.error('Erro ao ler arquivo:', error);
                this.showError('Erro ao ler o arquivo. Verifique se o formato está correto.');
            }
        };

        reader.onerror = () => {
            this.showError('Erro ao ler o arquivo.');
        };

        if (file.name.toLowerCase().endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    }

    /**
     * Analisa dados CSV
     */
    parseCSVData(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }
        }

        this.currentData = {
            headers: headers,
            data: data,
            totalRows: data.length
        };

        console.log('Dados CSV processados:', this.currentData);
    }

    /**
     * Analisa dados Excel
     */
    parseExcelData(arrayBuffer) {
        if (typeof XLSX === 'undefined') {
            this.showError('Biblioteca Excel não carregada. Recarregue a página e tente novamente.');
            return;
        }

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
            this.showError('Arquivo Excel vazio ou sem dados válidos.');
            return;
        }

        const headers = jsonData[0];
        const data = [];

        for (let i = 1; i < jsonData.length; i++) {
            if (jsonData[i].some(cell => cell !== undefined && cell !== '')) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = jsonData[i][index] || '';
                });
                data.push(row);
            }
        }

        this.currentData = {
            headers: headers,
            data: data,
            totalRows: data.length,
            sheetName: firstSheetName
        };

        console.log('Dados Excel processados:', this.currentData);
    }

    /**
     * Avança para o próximo passo
     */
    nextStep() {
        if (this.currentStep < 3) {
            this.currentStep++;
            this.updateStepDisplay();
            
            if (this.currentStep === 2) {
                this.setupFieldMapping();
            } else if (this.currentStep === 3) {
                this.validateData();
            }
        }
    }

    /**
     * Volta para o passo anterior
     */
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }

    /**
     * Atualiza a exibição dos passos
     */
    updateStepDisplay() {
        // Atualizar indicadores de passo
        document.querySelectorAll('.step').forEach((step, index) => {
            step.classList.toggle('active', index + 1 === this.currentStep);
            step.classList.toggle('completed', index + 1 < this.currentStep);
        });

        // Atualizar conteúdo dos passos
        document.querySelectorAll('.step-content').forEach((content, index) => {
            content.classList.toggle('active', index + 1 === this.currentStep);
        });

        // Atualizar botões
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        const importBtn = document.getElementById('importData');

        prevBtn.style.display = this.currentStep > 1 ? 'inline-block' : 'none';
        nextBtn.style.display = this.currentStep < 3 ? 'inline-block' : 'none';
        importBtn.style.display = this.currentStep === 3 ? 'inline-block' : 'none';
    }

    /**
     * Configura o mapeamento de campos
     */
    setupFieldMapping() {
        if (!this.currentData) return;

        const mappingFields = document.getElementById('mappingFields');
        const previewData = document.getElementById('previewData');

        // Criar campos de mapeamento
        let mappingHTML = '';
        if (this.fieldMappings && Object.keys(this.fieldMappings).length > 0) {
            Object.keys(this.fieldMappings).forEach(systemField => {
                mappingHTML += this.createMappingField(systemField, this.fieldMappings[systemField]);
            });
        } else {
            // Mapeamento automático baseado nos headers
            this.currentData.headers.forEach(header => {
                mappingHTML += this.createMappingField(header, { required: false, type: 'text' });
            });
        }

        mappingFields.innerHTML = mappingHTML;

        // Mostrar preview dos dados
        this.showDataPreview(previewData);
    }

    /**
     * Cria um campo de mapeamento
     */
    createMappingField(fieldName, fieldConfig) {
        const options = this.currentData.headers.map(header => 
            `<option value="${header}">${header}</option>`
        ).join('');

        return `
            <div class="mapping-field">
                <label class="field-label">
                    ${fieldName}
                    ${fieldConfig.required ? '<span class="required">*</span>' : ''}
                </label>
                <select class="field-select" data-field="${fieldName}">
                    <option value="">-- Selecionar coluna --</option>
                    ${options}
                </select>
                <small class="field-hint">${fieldConfig.description || ''}</small>
            </div>
        `;
    }

    /**
     * Mostra preview dos dados
     */
    showDataPreview(container) {
        const previewRows = this.currentData.data.slice(0, 5);
        
        let previewHTML = `
            <div class="preview-header">
                <h6>Preview dos Dados (${this.currentData.totalRows} registros total)</h6>
            </div>
            <div class="preview-table">
                <table>
                    <thead>
                        <tr>
                            ${this.currentData.headers.map(header => `<th>${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        previewRows.forEach(row => {
            previewHTML += '<tr>';
            this.currentData.headers.forEach(header => {
                previewHTML += `<td>${row[header] || ''}</td>`;
            });
            previewHTML += '</tr>';
        });

        previewHTML += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = previewHTML;
    }

    /**
     * Valida os dados antes da importação
     */
    validateData() {
        const validationSummary = document.getElementById('validationSummary');
        const validationErrors = document.getElementById('validationErrors');

        // Coletar mapeamentos
        const mappings = {};
        document.querySelectorAll('.field-select').forEach(select => {
            if (select.value) {
                mappings[select.dataset.field] = select.value;
            }
        });

        // Validar dados
        const validation = this.performValidation(mappings);
        
        // Mostrar resumo
        validationSummary.innerHTML = `
            <div class="validation-stats">
                <div class="stat-item">
                    <span class="stat-number">${this.currentData.totalRows}</span>
                    <span class="stat-label">Total de registros</span>
                </div>
                <div class="stat-item ${validation.valid > 0 ? 'success' : ''}">
                    <span class="stat-number">${validation.valid}</span>
                    <span class="stat-label">Registros válidos</span>
                </div>
                <div class="stat-item ${validation.errors.length > 0 ? 'error' : ''}">
                    <span class="stat-number">${validation.errors.length}</span>
                    <span class="stat-label">Registros com erro</span>
                </div>
            </div>
        `;

        // Mostrar erros se houver
        if (validation.errors.length > 0) {
            let errorsHTML = '<div class="errors-list"><h6>Erros encontrados:</h6>';
            validation.errors.forEach(error => {
                errorsHTML += `<div class="error-item">Linha ${error.row}: ${error.message}</div>`;
            });
            errorsHTML += '</div>';
            validationErrors.innerHTML = errorsHTML;
        } else {
            validationErrors.innerHTML = '<div class="success-message">Todos os dados estão válidos!</div>';
        }

        // Habilitar/desabilitar botão de importação
        document.getElementById('importData').disabled = validation.valid === 0;
    }

    /**
     * Executa a validação dos dados
     */
    performValidation(mappings) {
        const errors = [];
        let validCount = 0;

        this.currentData.data.forEach((row, index) => {
            let rowValid = true;
            
            // Validar campos obrigatórios
            Object.keys(mappings).forEach(field => {
                const columnName = mappings[field];
                const value = row[columnName];
                
                if (this.fieldMappings[field]?.required && (!value || value.toString().trim() === '')) {
                    errors.push({
                        row: index + 2, // +2 porque começamos da linha 1 e pulamos o header
                        message: `Campo obrigatório '${field}' está vazio`
                    });
                    rowValid = false;
                }
            });

            if (rowValid) validCount++;
        });

        return {
            valid: validCount,
            errors: errors
        };
    }

    /**
     * Executa a importação dos dados
     */
    async executeImport() {
        const progressContainer = document.getElementById('importProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressContainer.style.display = 'block';
        document.getElementById('importData').disabled = true;

        try {
            // Coletar mapeamentos finais
            const mappings = {};
            document.querySelectorAll('.field-select').forEach(select => {
                if (select.value) {
                    mappings[select.dataset.field] = select.value;
                }
            });

            // Processar dados em lotes
            const batchSize = 50;
            const totalBatches = Math.ceil(this.currentData.data.length / batchSize);
            let processedCount = 0;

            for (let i = 0; i < totalBatches; i++) {
                const start = i * batchSize;
                const end = Math.min(start + batchSize, this.currentData.data.length);
                const batch = this.currentData.data.slice(start, end);

                // Processar lote
                await this.processBatch(batch, mappings);
                
                processedCount += batch.length;
                const progress = (processedCount / this.currentData.data.length) * 100;
                
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `Processando: ${processedCount}/${this.currentData.data.length} registros`;

                // Pequena pausa para não travar a interface
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Importação concluída
            progressText.textContent = 'Importação concluída com sucesso!';
            this.showSuccess(`${processedCount} registros importados com sucesso!`);
            
            // Chamar callback se definido
            if (this.importCallbacks.onSuccess) {
                this.importCallbacks.onSuccess(processedCount);
            }

            // Fechar interface após 2 segundos
            setTimeout(() => {
                document.querySelector('.excel-import-container').style.display = 'none';
            }, 2000);

        } catch (error) {
            console.error('Erro na importação:', error);
            progressText.textContent = 'Erro na importação!';
            this.showError('Erro durante a importação: ' + error.message);
            
            if (this.importCallbacks.onError) {
                this.importCallbacks.onError(error);
            }
        } finally {
            document.getElementById('importData').disabled = false;
        }
    }

    /**
     * Processa um lote de dados
     */
    async processBatch(batch, mappings) {
        // Simular processamento - substituir pela lógica real de importação
        return new Promise(resolve => {
            setTimeout(() => {
                console.log('Lote processado:', batch.length, 'registros');
                resolve();
            }, 200);
        });
    }

    /**
     * Define mapeamentos de campos do sistema
     */
    setFieldMappings(mappings) {
        this.fieldMappings = mappings;
    }

    /**
     * Define regras de validação
     */
    setValidationRules(rules) {
        this.validationRules = rules;
    }

    /**
     * Define callbacks de importação
     */
    setImportCallbacks(callbacks) {
        this.importCallbacks = callbacks;
    }

    /**
     * Utilitários
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        // Implementar notificação de erro
        console.error(message);
        if (typeof showAlert === 'function') {
            showAlert(message, 'error');
        } else {
            alert('Erro: ' + message);
        }
    }

    showSuccess(message) {
        // Implementar notificação de sucesso
        console.log(message);
        if (typeof showAlert === 'function') {
            showAlert(message, 'success');
        } else {
            alert('Sucesso: ' + message);
        }
    }

    /**
     * Aplica estilos CSS para a interface
     */
    applyStyles() {
        if (document.getElementById('excel-import-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'excel-import-styles';
        styles.textContent = `
            .excel-import-container {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                max-width: 800px;
                margin: 20px auto;
                overflow: hidden;
            }

            .import-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .import-header h4 {
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .btn-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 5px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }

            .btn-close:hover {
                background-color: rgba(255,255,255,0.2);
            }

            .import-steps {
                display: flex;
                background: #f8f9fa;
                padding: 0;
                margin: 0;
            }

            .step {
                flex: 1;
                display: flex;
                align-items: center;
                padding: 15px;
                background: #e9ecef;
                border-right: 1px solid #dee2e6;
                transition: all 0.3s ease;
            }

            .step:last-child {
                border-right: none;
            }

            .step.active {
                background: #007bff;
                color: white;
            }

            .step.completed {
                background: #28a745;
                color: white;
            }

            .step-number {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: rgba(255,255,255,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 10px;
                font-weight: bold;
                font-size: 12px;
            }

            .step.active .step-number,
            .step.completed .step-number {
                background: rgba(255,255,255,0.9);
                color: #333;
            }

            .import-content {
                padding: 30px;
                min-height: 400px;
            }

            .step-content {
                display: none;
            }

            .step-content.active {
                display: block;
            }

            .file-upload-area {
                border: 2px dashed #dee2e6;
                border-radius: 8px;
                padding: 40px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
                background: #f8f9fa;
            }

            .file-upload-area:hover,
            .file-upload-area.drag-over {
                border-color: #007bff;
                background: #e3f2fd;
            }

            .upload-icon {
                font-size: 48px;
                color: #6c757d;
                margin-bottom: 15px;
            }

            .upload-link {
                color: #007bff;
                text-decoration: underline;
                cursor: pointer;
            }

            .file-info {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 20px;
            }

            .file-details {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .file-details i {
                font-size: 24px;
                color: #28a745;
            }

            .file-text {
                flex: 1;
            }

            .file-name {
                display: block;
                font-weight: bold;
                margin-bottom: 5px;
            }

            .file-size {
                color: #6c757d;
                font-size: 14px;
            }

            .btn-remove {
                background: #dc3545;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s;
            }

            .btn-remove:hover {
                background: #c82333;
            }

            .mapping-container {
                max-height: 500px;
                overflow-y: auto;
            }

            .mapping-header {
                margin-bottom: 20px;
            }

            .mapping-header h5 {
                margin: 0 0 10px 0;
                color: #333;
            }

            .mapping-fields {
                display: grid;
                gap: 15px;
                margin-bottom: 30px;
            }

            .mapping-field {
                display: grid;
                grid-template-columns: 200px 1fr;
                gap: 15px;
                align-items: start;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 6px;
                border: 1px solid #dee2e6;
            }

            .field-label {
                font-weight: bold;
                color: #333;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .required {
                color: #dc3545;
            }

            .field-select {
                padding: 8px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                background: white;
                font-size: 14px;
            }

            .field-hint {
                grid-column: 2;
                color: #6c757d;
                font-size: 12px;
                margin-top: 5px;
            }

            .preview-data {
                margin-top: 30px;
                border-top: 1px solid #dee2e6;
                padding-top: 20px;
            }

            .preview-header h6 {
                margin: 0 0 15px 0;
                color: #333;
            }

            .preview-table {
                overflow-x: auto;
                border: 1px solid #dee2e6;
                border-radius: 6px;
            }

            .preview-table table {
                width: 100%;
                border-collapse: collapse;
                font-size: 14px;
            }

            .preview-table th,
            .preview-table td {
                padding: 10px;
                text-align: left;
                border-bottom: 1px solid #dee2e6;
            }

            .preview-table th {
                background: #f8f9fa;
                font-weight: bold;
                color: #333;
            }

            .validation-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }

            .stat-item {
                text-align: center;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #dee2e6;
            }

            .stat-item.success {
                background: #d4edda;
                border-color: #c3e6cb;
            }

            .stat-item.error {
                background: #f8d7da;
                border-color: #f5c6cb;
            }

            .stat-number {
                display: block;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 5px;
            }

            .stat-label {
                color: #6c757d;
                font-size: 14px;
            }

            .errors-list {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 6px;
                padding: 15px;
                margin-top: 15px;
            }

            .errors-list h6 {
                margin: 0 0 10px 0;
                color: #721c24;
            }

            .error-item {
                padding: 5px 0;
                color: #721c24;
                font-size: 14px;
            }

            .success-message {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
                padding: 15px;
                border-radius: 6px;
                text-align: center;
                margin-top: 15px;
            }

            .import-progress {
                margin-top: 20px;
            }

            .progress-bar {
                width: 100%;
                height: 20px;
                background: #e9ecef;
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 10px;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #28a745, #20c997);
                width: 0%;
                transition: width 0.3s ease;
            }

            .progress-text {
                text-align: center;
                color: #6c757d;
                font-size: 14px;
            }

            .import-actions {
                padding: 20px 30px;
                background: #f8f9fa;
                border-top: 1px solid #dee2e6;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .import-actions .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            .btn-primary {
                background: #007bff;
                color: white;
            }

            .btn-primary:hover {
                background: #0056b3;
            }

            .btn-secondary {
                background: #6c757d;
                color: white;
            }

            .btn-secondary:hover {
                background: #545b62;
            }

            .btn-success {
                background: #28a745;
                color: white;
            }

            .btn-success:hover {
                background: #1e7e34;
            }

            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            @media (max-width: 768px) {
                .excel-import-container {
                    margin: 10px;
                    max-width: none;
                }

                .import-steps {
                    flex-direction: column;
                }

                .step {
                    border-right: none;
                    border-bottom: 1px solid #dee2e6;
                }

                .mapping-field {
                    grid-template-columns: 1fr;
                    gap: 10px;
                }

                .field-hint {
                    grid-column: 1;
                }

                .validation-stats {
                    grid-template-columns: 1fr;
                }

                .import-actions {
                    flex-direction: column;
                    gap: 10px;
                }
            }
        `;

        document.head.appendChild(styles);
    }
}

// Exportar para uso global
window.ExcelImportManager = ExcelImportManager;

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExcelImportManager;
}