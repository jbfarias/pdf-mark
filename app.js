// Config PDF.js worker
if (window['pdfjsLib']) {
  const pdfjsLib = window['pdfjsLib'];
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  // Preferir usar worker; em ambientes com CSP/CORS restritos, faremos fallback
  pdfjsLib.disableWorker = false;
}

const state = {
  pdfDoc: null,
  pagesText: new Map(), // pageNumber -> concatenated text
  selections: [],
  activeSelectionId: null,
  autoSaveKey: 'pdf-cite-selections',
  currentPdfUrl: null,
};

const els = {
  viewer: document.getElementById('viewer'),
  viewerContainer: document.getElementById('viewerContainer'),
  pdfFileInput: document.getElementById('pdfFileInput'),
  txtImportInput: document.getElementById('txtImportInput'),
  exportBtn: document.getElementById('exportBtn'),
  clearBtn: document.getElementById('clearBtn'),
  selectionCount: document.getElementById('selectionCount'),
  selectionList: document.getElementById('selectionList'),
  toast: document.getElementById('toast'),
};

function showToast(msg) {
  els.toast.textContent = msg;
  setTimeout(() => { els.toast.textContent = ''; }, 2000);
}

function updateCounter() {
  els.selectionCount.textContent = `${state.selections.length} seleções`;
}

function saveDraft() {
  try {
    localStorage.setItem(state.autoSaveKey, JSON.stringify(state.selections));
  } catch (e) {
    console.warn('Falha ao salvar rascunho', e);
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(state.autoSaveKey);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        state.selections = list;
      }
    }
  } catch (e) {
    console.warn('Falha ao carregar rascunho', e);
  }
}

function clearAll(confirmFirst = true) {
  if (confirmFirst) {
    const ok = confirm('Tem certeza que deseja limpar todas as seleções?');
    if (!ok) return;
  }
  state.selections = [];
  state.activeSelectionId = null;
  renderSelectionList();
  saveDraft();
}

function exportTxt() {
  // Novo formato: dois linhas por seleção: "Página N" e o texto
  const blocks = state.selections.map((s) => {
    const pageLine = `Página ${s.pageNumber}`;
    const textLine = (s.quote || '').replace(/[\r\t]+/g, ' ').trim();
    return `${pageLine}\n${textLine}`;
  });
  const blob = new Blob([blocks.join('\n\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'selecao.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('TXT exportado');
}

function parseImportedTxt(text) {
  const sels = [];
  const isOld = /\t/.test(text) && /(\bp=|\bpage=)/.test(text);
  if (isOld) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const parts = line.split('\t');
      const obj = {};
      for (const p of parts) {
        const [k, ...rest] = p.split('=');
        obj[k] = rest.join('=');
      }
      const sel = {
        pageNumber: parseInt(obj.p || obj.page, 10) || 1,
        quote: obj.q || obj.quote || '',
        prefix: obj.pre || obj.prefix || '',
        suffix: obj.suf || obj.suffix || '',
        textPosition: {
          start: parseInt(obj.s || obj.start, 10) || 0,
          end: parseInt(obj.e || obj.end, 10) || 0,
        },
        createdAt: parseInt(obj.ts || obj.createdAt, 10) || Date.now(),
        id: crypto.randomUUID(),
      };
      sels.push(sel);
    }
  } else {
    const blocks = text.split(/\n\s*\n/).filter((b) => /\S/.test(b));
    for (const block of blocks) {
      const lines = block.split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) continue;
      const m = lines[0].match(/Página\s+(\d+)/i);
      const pageNumber = m ? parseInt(m[1], 10) : 1;
      const quote = lines.slice(1).join('\n').trim();
      const sel = {
        pageNumber,
        quote,
        prefix: '',
        suffix: '',
        textPosition: { start: 0, end: 0 },
        createdAt: Date.now(),
        id: crypto.randomUUID(),
      };
      sels.push(sel);
    }
  }
  return sels;
}

function importTxtFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '');
    const imported = parseImportedTxt(text);
    state.selections = imported;
    renderSelectionList();
    saveDraft();
    showToast('TXT importado');
  };
  reader.readAsText(file);
}

function renderSelectionList() {
  updateCounter();
  els.selectionList.innerHTML = '';
  const frag = document.createDocumentFragment();
  state.selections.forEach((s, idx) => {
    const li = document.createElement('li');
    li.className = 'selectionItem';
    li.dataset.id = s.id;
    const title = document.createElement('h3');
    title.textContent = `Página ${s.pageNumber}`;
    const p = document.createElement('p');
    const preview = (s.quote || '').slice(0, 160);
    p.textContent = preview;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const goBtn = document.createElement('button');
    goBtn.className = 'btn';
    goBtn.textContent = 'Ir';
    goBtn.addEventListener('click', () => {
      scrollToSelection(s);
    });
    const rmBtn = document.createElement('button');
    rmBtn.className = 'btn btn-danger';
    rmBtn.textContent = 'Remover';
    rmBtn.addEventListener('click', () => {
      removeSelectionById(s.id);
    });
    li.addEventListener('mouseenter', () => highlightHover(s, true));
    li.addEventListener('mouseleave', () => highlightHover(s, false));
    actions.appendChild(goBtn);
    actions.appendChild(rmBtn);
    li.appendChild(title);
    li.appendChild(p);
    li.appendChild(actions);
    frag.appendChild(li);
  });
  els.selectionList.appendChild(frag);
}

function removeSelectionById(id) {
  const idx = state.selections.findIndex((s) => s.id === id);
  if (idx !== -1) {
    const [removed] = state.selections.splice(idx, 1);
    renderSelectionList();
    saveDraft();
  }
}

function scrollToSelection(sel) {
  const pageDiv = document.querySelector(`.page[data-page-number="${sel.pageNumber}"]`);
  if (!pageDiv) return;
  pageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function highlightHover(sel, on) {
  // Destaques visuais desativados
}

async function openPdfFile(file) {
  // Revogar URL anterior se existir
  if (state.currentPdfUrl) {
    try { URL.revokeObjectURL(state.currentPdfUrl); } catch {}
    state.currentPdfUrl = null;
  }
  const pdfjsLib = window['pdfjsLib'];
  if (!pdfjsLib || !pdfjsLib.getDocument) {
    showToast('PDF.js não carregado');
    return;
  }
  const url = URL.createObjectURL(file);
  state.currentPdfUrl = url;
  try {
    const task = pdfjsLib.getDocument({ url });
    state.pdfDoc = await task.promise;
    await renderDocument(task);
    loadDraft();
    renderSelectionList();
  } catch (e) {
    console.error('Falha ao abrir PDF (URL):', e);
    // Fallback 1: desabilitar worker e tentar novamente com a mesma URL
    try {
      pdfjsLib.disableWorker = true;
      const taskNoWorker = pdfjsLib.getDocument({ url });
      state.pdfDoc = await taskNoWorker.promise;
      await renderDocument(taskNoWorker);
      loadDraft();
      renderSelectionList();
      showToast('PDF carregado sem worker (modo compatibilidade)');
      return;
    } catch (eNoWorker) {
      console.warn('Tentativa sem worker falhou, tentando ArrayBuffer...', eNoWorker);
    }
    // Fallback: tentar via ArrayBuffer
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const data = new Uint8Array(reader.result);
          const task2 = pdfjsLib.getDocument({ data });
          state.pdfDoc = await task2.promise;
          await renderDocument(task2);
          loadDraft();
          renderSelectionList();
        } catch (e2) {
          console.error('Falha ao abrir PDF (ArrayBuffer):', e2);
          showToast('Erro ao abrir PDF (detalhes no console)');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (e3) {
      console.error('Fallback falhou:', e3);
      showToast('Erro ao abrir PDF');
    }
  }
}

async function renderDocument(loadingTask) {
  els.viewer.innerHTML = '';
  const pdfjsViewer = window['pdfjsViewer'];
  const eventBus = new pdfjsViewer.EventBus();
  const textLayerMode = 2; // enable textLayer
  const linkService = new pdfjsViewer.PDFLinkService({ eventBus });
  const findController = new pdfjsViewer.PDFFindController({ eventBus, linkService });
  const pdfViewer = new pdfjsViewer.PDFViewer({
    container: els.viewerContainer,
    viewer: els.viewer,
    eventBus,
    textLayerMode,
    linkService,
    findController,
    useOnlyCssZoom: true,
    removePageBorders: false,
    maxCanvasPixels: 16777216,
  });
  linkService.setViewer(pdfViewer);
  // Se disponível, usar loadingTask
  if (loadingTask) {
    pdfViewer.setDocument(await loadingTask.promise);
    linkService.setDocument(await loadingTask.promise);
  } else {
    pdfViewer.setDocument(state.pdfDoc);
    linkService.setDocument(state.pdfDoc);
  }

  // Ajuste de escala inicial para melhorar leitura
  try { pdfViewer.currentScaleValue = 'page-width'; } catch (e) { /* ignore */ }

  eventBus.on('pagesloaded', () => {
    showToast('PDF carregado');
  });
  eventBus.on('documenterror', (e) => {
    console.error('PDFViewer documenterror:', e);
    showToast('Erro no documento PDF');
  });

  // Pre-extrair textos por página para mapear ranges
  for (let pageNumber = 1; pageNumber <= state.pdfDoc.numPages; pageNumber++) {
    const page = await state.pdfDoc.getPage(pageNumber);
    const txt = await page.getTextContent();
    const full = buildPageTextWithSpaces(txt);
    state.pagesText.set(pageNumber, full);
  }

  // Listen seleção
  els.viewerContainer.addEventListener('mouseup', onMouseUpSelection);
}

function normalizeWhitespace(s) {
  return (s || '').replace(/[\s\u00A0]+/g, ' ').trim();
}

// Reconstrói texto por página com espaços/quebras de linha conforme posições
function buildPageTextWithSpaces(textContent) {
  const items = textContent.items || [];
  let out = '';
  let prev = null;
  for (const item of items) {
    const curX = (item.transform && item.transform[4]) || 0;
    const curY = (item.transform && item.transform[5]) || 0;
    if (prev) {
      const prevX = (prev.transform && prev.transform[4]) || 0;
      const prevY = (prev.transform && prev.transform[5]) || 0;
      const prevRight = prevX + (prev.width || 0);
      const gapX = curX - prevRight;
      const gapY = Math.abs(curY - prevY);
      const sameLine = gapY < 1.0;
      if (!sameLine) {
        out += '\n';
      } else if (gapX > 0.8) {
        out += ' ';
      }
    }
    out += item.str || '';
    if (item.hasEOL) out += '\n';
    prev = item;
  }
  return out.replace(/[\s\u00A0]+/g, ' ').trim();
}

// Mapa do índice colapsado (sem espaços) para o original com espaços
function buildCollapsedIndexMap(str) {
  const map = [];
  let collapsed = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (/\s|\u00A0/.test(ch)) continue;
    map.push(i);
    collapsed += ch;
  }
  return { map, collapsed };
}

function getPageDivFromNode(node) {
  let cur = node;
  // Se for text node, subir um nível
  if (cur && cur.nodeType === 3) cur = cur.parentNode;
  while (cur) {
    if (cur.nodeType === 1 && cur.classList && cur.classList.contains('page')) {
      return cur;
    }
    cur = cur.parentNode;
  }
  return null;
}

function getSelectionInfoFromRange(range) {
  // Garantir que Range esteja dentro de uma .textLayer de uma .page
  let pageDiv = getPageDivFromNode(range.commonAncestorContainer);
  if (!pageDiv) pageDiv = getPageDivFromNode(range.startContainer);
  if (!pageDiv) pageDiv = getPageDivFromNode(range.endContainer);
  if (!pageDiv || !pageDiv.dataset.pageNumber) return null;
  const pageNumber = parseInt(pageDiv.dataset.pageNumber, 10);

  const quote = normalizeWhitespace(range.toString());
  if (!quote) return null;

  const fullText = state.pagesText.get(pageNumber) || '';
  // Mapear para índices via posição aproximada usando TextQuoteSelector
  // Tentativa primária: usar Selection.getRangeAt + textLayer offsets
  // Simplesmente busca primeira ocorrência do quote normalizado no fullText
  let start = fullText.indexOf(quote);
  let end = start !== -1 ? start + quote.length : -1;

  // Se não achar, tentar heurística com colapsar múltiplos espaços
  if (start === -1) {
    const { map, collapsed } = buildCollapsedIndexMap(fullText);
    const q2 = quote.replace(/[\s\u00A0]+/g, '');
    const cStart = collapsed.indexOf(q2);
    if (cStart !== -1) {
      const cEnd = cStart + q2.length;
      start = map[cStart] ?? -1;
      const endIdx = map[cEnd - 1];
      end = typeof endIdx === 'number' ? endIdx + 1 : -1;
    }
  }

  // Capturar prefix/suffix
  const ctxRadius = 60;
  let prefix = '';
  let suffix = '';
  if (start !== -1) {
    prefix = fullText.slice(Math.max(0, start - ctxRadius), start);
    suffix = fullText.slice(end, Math.min(fullText.length, end + ctxRadius));
  } else {
    // fallback: pegar um pouco ao redor do texto selecionado por range
    prefix = '';
    suffix = '';
  }

  const finalQuote = (start !== -1 && end !== -1) ? fullText.slice(start, end) : quote;
  return {
    pageNumber,
    quote: normalizeWhitespace(finalQuote),
    prefix,
    suffix,
    textPosition: { start: Math.max(0, start), end: Math.max(0, end) },
  };
}

function onMouseUpSelection(e) {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  if (sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const info = getSelectionInfoFromRange(range);
  sel.removeAllRanges();
  if (!info) return;

  const record = {
    id: crypto.randomUUID(),
    pageNumber: info.pageNumber,
    quote: info.quote,
    prefix: info.prefix,
    suffix: info.suffix,
    textPosition: info.textPosition,
    createdAt: Date.now(),
  };
  state.selections.push(record);
  renderSelectionList();
  saveDraft();
  showToast('Seleção salva');
}

function renderAllHighlights(reanchor = false) {
  // Destaques visuais desativados: apenas remover overlays existentes
  document.querySelectorAll('.highlight').forEach((el) => el.remove());
}

function renderHighlightsForPage(pageNumber, reanchor = false) {
  const pageDiv = document.querySelector(`.page[data-page-number="${pageNumber}"]`);
  if (!pageDiv) return;
  // Destaques visuais desativados: apenas remover overlays existentes
  pageDiv.querySelectorAll('.highlight').forEach((el) => el.remove());
}

// Atalhos de teclado
document.addEventListener('keydown', (e) => {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const mod = isMac ? e.metaKey : e.ctrlKey;
  if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault();
    exportTxt();
  } else if (e.key === 'Delete') {
    if (state.activeSelectionId) {
      removeSelectionById(state.activeSelectionId);
      state.activeSelectionId = null;
    }
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    if (!state.selections.length) return;
    const idx = state.selections.findIndex((s) => s.id === state.activeSelectionId);
    let nextIdx = idx;
    if (e.key === 'ArrowRight') nextIdx = Math.min(state.selections.length - 1, (idx + 1 + state.selections.length) % state.selections.length);
    else nextIdx = Math.max(0, (idx - 1 + state.selections.length) % state.selections.length);
    const next = state.selections[nextIdx] || state.selections[0];
    state.activeSelectionId = next.id;
    scrollToSelection(next);
  }
});

// Eventos UI
els.pdfFileInput.addEventListener('change', (e) => {
  const files = e.target.files;
  const file = files && files[0];
  if (file) openPdfFile(file);
});
els.txtImportInput.addEventListener('change', (e) => {
  const files = e.target.files;
  const file = files && files[0];
  if (file) importTxtFile(file);
});
els.exportBtn.addEventListener('click', exportTxt);
els.clearBtn.addEventListener('click', () => clearAll(true));

// Inicialização: nada é renderizado até abrir PDF