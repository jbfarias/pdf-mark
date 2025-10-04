# PDF Cite

Aplicação web simples para abrir PDFs, selecionar trechos de texto e exportar/importar seleções em TXT. Focada em compatibilidade e uso direto no navegador sem build.

## Visão Geral
- Abre arquivos PDF via `<input type="file">` usando PDF.js.
- Reconstrói o texto das páginas preservando espaços entre palavras para evitar “palavras coladas”.
- Exporta cada seleção em blocos de duas linhas: `Página N` e o texto. Blocos separados por uma linha em branco.
- Importa TXT tanto no formato novo (duas linhas por seleção) quanto no formato antigo (TSV).
- Destaques visuais no PDF estão desativados por simplicidade; seleções são listadas no painel lateral.

## Estrutura do Projeto
- `index.html`: HTML principal, inclui PDF.js via CDN, define `base href` relativo e chama `app.js`.
- `styles.css`: estilos básicos da interface e da lista de seleções.
- `app.js`: lógica de abertura do PDF, extração de texto, seleção, exportação/importação e renderização da lista.

## Como Usar (Local)
1. Inicie um servidor estático na pasta do projeto:
   - `python3 -m http.server 8000`
2. Abra `http://localhost:8000/` no navegador.
3. Clique em “Abrir PDF” e selecione um arquivo.
4. Selecione trechos de texto com o mouse.
5. Use “Exportar TXT” para baixar as seleções.
6. Use “Importar TXT” para carregar seleções previamente exportadas.

## Formato de Exportação
- Novo formato (recomendado): para cada seleção
  - Linha 1: `Página <número>`
  - Linha 2: `<texto selecionado>`
  - Bloco separado dos demais por uma linha em branco.
- Formato antigo (compatível): linhas TSV com chaves `p`, `q`, `s`, `e` etc. (detectado automaticamente no import).

## Configurações de Compatibilidade
- PDF.js via CDN:
  - `index.html` referencia a versão 3.11.174.
  - `app.js` define `GlobalWorkerOptions.workerSrc` para o worker do PDF.js.
- Fallbacks automáticos (em `openPdfFile`):
  - Tenta abrir com worker (padrão).
  - Se falhar, desativa worker e tenta novamente.
  - Se ainda falhar, lê o arquivo como `ArrayBuffer` e abre pelo conteúdo.
- `base href="./"` no `index.html` para funcionar em subpaths (ex.: GitHub Pages).

## Atualizações Comuns
- Atualizar versão do PDF.js:
  - Troque as URLs de `pdf.min.js` e `pdf_viewer.min.css/js` no `index.html` para a nova versão.
  - Atualize `workerSrc` no topo de `app.js` para a versão correspondente.
  - Teste a abertura de PDFs e seleção/exportação.
- Ajustar formato de exportação:
  - Edite `exportTxt()` em `app.js` para mudar a estrutura das linhas/blocos conforme necessidade.
- Reativar destaques visuais (opcional):
  - As funções de highlight estão desativadas; seria preciso restaurar a criação de elementos `.highlight` na `textLayer` e atualização em `renderHighlightsForPage`.

## Limitações e Notas
- PDFs remotos requerem CORS adequado no servidor de origem.
- Seleções baseiam-se na `textLayer`; documentos com texto não extraível (apenas imagem) não funcionarão.
- Navegadores modernos recomendados; testado com Chromium/Firefox.

## Licença
Sem licença explícita definida. Use conforme necessário ou adicione uma licença de sua preferência.