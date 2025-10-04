# Manutenção do PDF Cite

Este documento orienta a manutenção, arquitetura e pontos de extensão do sistema.

## Arquitetura
- **PDF.js**: uso do viewer básico via CDN com `EventBus`, `PDFLinkService` e `PDFFindController`.
- **Text Layer**: habilitada (`textLayerMode=2`). O texto por página é reconstruído em `buildPageTextWithSpaces` para preservar espaços.
- **Estado (`state`)**:
  - `pdfDoc`: documento carregado pelo PDF.js.
  - `pagesText`: `Map` com texto de cada página reconstruído.
  - `selections`: lista de seleções (página, texto, metadados).
  - `activeSelectionId`, `autoSaveKey`, `currentPdfUrl`.
- **DOM (`els`)**: referências aos elementos do viewer, inputs e lista.

## Fluxo Principal
1. `openPdfFile(file)`: cria URL e tenta abrir com PDF.js. Se falhar, fallback sem worker e/ou via `ArrayBuffer`.
2. `renderDocument(loadingTask)`: inicializa `PDFViewer`, configura escala, listeners e extrai `pagesText`.
3. Seleção: `onMouseUpSelection` interpreta o `Range` do navegador; `getSelectionInfoFromRange` mapeia para texto com espaços usando `buildCollapsedIndexMap`.
4. Persistência: `saveDraft`/`loadDraft` armazenam seleções em `localStorage`.
5. Exportação/Importação: `exportTxt` (formato novo) e `parseImportedTxt` (suporta novo e antigo).

## Pontos de Extensão
- Processamento de texto:
  - `buildPageTextWithSpaces(textContent)`: ajustar heurísticas de espaço e quebra de linha (ex.: hífens em fim de linha, ligaduras).
  - `normalizeWhitespace(s)`: aplicar limpezas adicionais.
- Seleção e mapeamento:
  - `buildCollapsedIndexMap(str)`: manter alinhamento entre string original e colapsada.
  - `getSelectionInfoFromRange(range)`: refinar captura de prefix/suffix e posição.
- UI/Viewer:
  - Destaques visuais estão desativados; reativar exigiria recriar overlays na `textLayer` e coordenar com scroll/zoom.

## Procedimentos de Atualização
- **Upgrade do PDF.js**:
  1. Atualize `index.html` para a nova versão de `pdf.min.js` e `pdf_viewer.min.css/js`.
  2. Atualize `GlobalWorkerOptions.workerSrc` em `app.js`.
  3. Teste com PDFs variados (texto corrido, colunas, fórmulas) e verifique export.
- **Mudança de formato de TXT**:
  1. Modifique `exportTxt()` para novo layout.
  2. Ajuste `parseImportedTxt()` para aceitar os formatos desejados (preferir retrocompatibilidade).
- **Comportamento de seleção**:
  1. Ajuste funções `getSelectionInfoFromRange`, `buildCollapsedIndexMap`, `buildPageTextWithSpaces`.
  2. Valide com seleções na borda entre palavras e quebras de linha.

## Troubleshooting
- PDF não abre:
  - Verifique se o worker está acessível; o fallback sem worker está implementado.
  - Cheque console por `documenterror` ou problemas de CORS.
- Export mostra palavras coladas:
  - Revise a heurística de inserção de `space` em `buildPageTextWithSpaces`.
- Import não reconhece formato:
  - Valide regex dos blocos e chaves TSV em `parseImportedTxt`.

## Testes Manuais
- Abrir PDF, selecionar trechos, exportar e reimportar no formato novo e antigo.
- Verificar preservação de espaços e ausência de destaques visuais.
- Publicar em subpath (GitHub Pages) e validar carregamento com `base href`.