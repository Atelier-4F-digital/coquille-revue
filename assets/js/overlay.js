/* Coquille Revue — interface publique. Configuration et textes : window.coquilleRevueConfig, écrit par PHP. */
(function () {
  'use strict';

  // Fichier en cache plus récent ou plus ancien que la page : on ne fait rien plutôt que de casser la page.
  const cfg = window.coquilleRevueConfig;
  if (!cfg || !document.getElementById('coquille-fab')) return;
  const t = cfg.i18n;

  const PAGE_URL   = window.location.origin + window.location.pathname;
  const PAGE_TITLE = document.title;

  // Remplace %s ou %1$s, %2$s… par les valeurs données (textes traduisibles côté PHP).
  function fmt(str, ...args) {
    let i = 0;
    return str.replace(/%(?:(\d+)\$)?s/g, (m, n) => String(args[n ? n - 1 : i++] ?? ''));
  }

  const fab          = document.getElementById('coquille-fab');
  const infoPop      = document.getElementById('coquille-info-popover');
  const infoStartBtn = document.getElementById('coquille-info-start');
  const stopBtn      = document.getElementById('coquille-stop-btn');
  const bubble       = document.getElementById('coquille-bubble');
  const bubbleTitle  = document.getElementById('coquille-bubble-title');
  const textarea     = document.getElementById('coquille-textarea');
  const reviewerName = document.getElementById('coquille-reviewer-name');
  const reviewerEmail = document.getElementById('coquille-reviewer-email');
  const honeypot     = document.getElementById('coquille-hp');
  const origText     = document.getElementById('coquille-original-text');
  const sendBtn      = document.getElementById('coquille-send-btn');
  const cancelBtn    = document.getElementById('coquille-cancel-btn');
  const toast        = document.getElementById('coquille-toast');
  const zoneRect     = document.getElementById('coquille-zone-rect');
  const zoneHL       = document.getElementById('coquille-zone-highlight');

  let reviewModeActive = false;
  let currentAnnotation = null;
  let activeType = 'correction';
  let smartDrag = null;     // { x, y, isDrag } : clic-glisser en cours sur une zone sans texte
  let lastOverText = null;  // null = pas encore détecté
  let cursorThrottle = 0;

  // Helpers pour le détecteur "sur du texte ou pas"
  function isPluginEl(el) {
    return !!(el && el.closest && el.closest('#coquille-revue-root'));
  }
  function isTyping(el) {
    return !!(el && (el.isContentEditable || (el.closest && el.closest('input, textarea, select'))));
  }
  function isOverText(x, y) {
    let range = null, offset = 0;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
      if (range) offset = range.startOffset;
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) { range = { startContainer: pos.offsetNode }; offset = pos.offset; }
    }
    if (!range || !range.startContainer) return false;
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return false;
    if (!node.textContent || !node.textContent.trim()) return false;

    // Vérifie que le point est vraiment SUR un glyphe (pas sur un padding adjacent).
    // On mesure le rect du caractère le plus proche et exige une proximité < 6 px.
    try {
      const r = document.createRange();
      const safeOffset = Math.min(Math.max(offset, 0), node.textContent.length - 1);
      r.setStart(node, safeOffset);
      r.setEnd(node, safeOffset + 1);
      const rect = r.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) return false;
      const dx = Math.max(rect.left - x, x - rect.right, 0);
      const dy = Math.max(rect.top - y, y - rect.bottom, 0);
      return dx < 6 && dy < 6;
    } catch (e) {
      return true; // fallback prudent : on suppose qu'on est sur du texte
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  function getXPath(node) {
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!node || node === document.body) return '/html/body';
    const parts = [];
    while (node && node !== document.documentElement) {
      let idx = 1, sib = node.previousElementSibling;
      while (sib) { if (sib.tagName === node.tagName) idx++; sib = sib.previousElementSibling; }
      parts.unshift(node.tagName.toLowerCase() + '[' + idx + ']');
      node = node.parentElement;
    }
    return '/html/' + parts.join('/');
  }

  function getCssSelector(node) {
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!node) return '';
    const parts = [];
    while (node && node !== document.body) {
      let sel = node.tagName.toLowerCase();
      if (node.id) { parts.unshift('#' + node.id); break; }
      if (node.className && typeof node.className === 'string') {
        const cls = [...node.classList].filter(c => !c.startsWith('coquille-')).slice(0, 2).join('.');
        if (cls) sel += '.' + cls;
      }
      parts.unshift(sel);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  function positionBubble(clientX) {
    const bw = 340, vw = window.innerWidth;
    let left = clientX + window.scrollX - bw / 2;
    left = Math.max(16, Math.min(left, vw + window.scrollX - bw - 16));
    bubble.style.left = left + 'px';
    bubble.style.right = 'auto';
  }

  function showToast(msg, type) {
    toast.textContent = msg;
    toast.className = 'coquille-show coquille-' + type;
    setTimeout(() => { toast.className = ''; }, 3000);
  }

  function closeBubble() {
    bubble.classList.remove('coquille-visible');
    zoneHL.classList.remove('coquille-visible');
    currentAnnotation = null;
    textarea.value = '';
    reviewerEmail?.classList.remove('coquille-invalid');
  }

  function enterReviewMode() {
    reviewModeActive = true;
    lastOverText = null;
    document.body.classList.add('coquille-mode-active', 'coquille-cursor-text');
    fab.classList.add('coquille-active');
    infoPop.classList.remove('coquille-visible');
  }

  function exitReviewMode() {
    reviewModeActive = false;
    document.body.classList.remove('coquille-mode-active', 'coquille-cursor-text', 'coquille-cursor-zone');
    fab.classList.remove('coquille-active');
    zoneRect.classList.remove('coquille-drawing');
    smartDrag = null;
    closeBubble();
  }

  // ── FAB : popover au hover, click lance la relecture ────────────────
  let popoverHideTimer = null;
  function showPopover() {
    clearTimeout(popoverHideTimer);
    if (!reviewModeActive) infoPop.classList.add('coquille-visible');
  }
  function hidePopoverDelayed() {
    clearTimeout(popoverHideTimer);
    popoverHideTimer = setTimeout(() => infoPop.classList.remove('coquille-visible'), 220);
  }
  fab.addEventListener('mouseenter', showPopover);
  fab.addEventListener('mouseleave', hidePopoverDelayed);
  infoPop.addEventListener('mouseenter', showPopover);
  infoPop.addEventListener('mouseleave', hidePopoverDelayed);

  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    clearTimeout(popoverHideTimer);
    infoPop.classList.remove('coquille-visible');
    reviewModeActive ? exitReviewMode() : enterReviewMode();
  });

  infoStartBtn.addEventListener('click', () => {
    clearTimeout(popoverHideTimer);
    infoPop.classList.remove('coquille-visible');
    enterReviewMode();
  });
  stopBtn.addEventListener('click', exitReviewMode);

  // ── Capture sélection texte ──────────────────────────────────────────
  function captureTextSelection(clientX) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim().length < 2) return false;

    const range = sel.getRangeAt(0);
    const text  = sel.toString().trim();

    currentAnnotation = {
      mode: 'text',
      url: PAGE_URL, pageTitle: PAGE_TITLE,
      xpath: getXPath(range.startContainer),
      cssSelector: getCssSelector(range.startContainer),
      charOffsetStart: range.startOffset,
      charOffsetEnd: range.endOffset,
      originalText: text,
    };

    bubbleTitle.textContent = t.textSelected;
    origText.classList.remove('coquille-zone-preview');
    const preview = text.slice(0, 150) + (text.length > 150 ? '…' : '');
    origText.textContent = fmt(t.quoted, preview);
    textarea.value = '';

    positionBubble(clientX);
    bubble.classList.add('coquille-visible');
    setTimeout(() => textarea.focus(), 60);
    return true;
  }

  // ── Capture d'une zone (rectangle drag) ──────────────────────────────
  function captureZone(x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2;
    // Trouve l'élément sous le centre (on est sûr qu'aucun overlay plein écran ne masque)
    const elBehind = document.elementFromPoint(cx, cy) || document.body;

    zoneHL.style.left = (x + window.scrollX) + 'px';
    zoneHL.style.top  = (y + window.scrollY) + 'px';
    zoneHL.style.width = w + 'px';
    zoneHL.style.height = h + 'px';
    zoneHL.classList.add('coquille-visible');

    const elText = (elBehind.innerText || '').trim().slice(0, 120);

    currentAnnotation = {
      mode: 'zone',
      url: PAGE_URL, pageTitle: PAGE_TITLE,
      xpath: getXPath(elBehind),
      cssSelector: getCssSelector(elBehind),
      charOffsetStart: 0, charOffsetEnd: 0,
      originalText: elText || '(zone sans texte direct)',
      zoneData: {
        x: Math.round(x + window.scrollX), y: Math.round(y + window.scrollY),
        w: Math.round(w), h: Math.round(h),
        viewport_w: window.innerWidth, viewport_h: window.innerHeight,
        element_tag: elBehind.tagName?.toLowerCase() || 'body',
      },
    };

    bubbleTitle.textContent = fmt(t.zoneSelected, Math.round(w), Math.round(h));
    origText.classList.add('coquille-zone-preview');
    origText.textContent = elText
      ? fmt(t.zonePreview, currentAnnotation.cssSelector, elText + (elText.length >= 120 ? '…' : ''))
      : currentAnnotation.cssSelector;
    textarea.value = '';

    positionBubble(cx);
    bubble.classList.add('coquille-visible');
    setTimeout(() => textarea.focus(), 60);
  }

  // ── Logique unifiée : curseur intelligent + capture auto ─────────────
  function updateCursorAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (isPluginEl(el)) return; // ne pas toucher au curseur dans notre UI
    const onText = isOverText(x, y);
    if (onText !== lastOverText) {
      document.body.classList.toggle('coquille-cursor-text', onText);
      document.body.classList.toggle('coquille-cursor-zone', !onText);
      lastOverText = onText;
    }
  }

  document.addEventListener('mousemove', (e) => {
    if (!reviewModeActive) return;
    if (smartDrag) {
      const dx = Math.abs(e.clientX - smartDrag.x);
      const dy = Math.abs(e.clientY - smartDrag.y);
      if (smartDrag.isDrag || dx > 5 || dy > 5) {
        smartDrag.isDrag = true;
        const x = Math.min(smartDrag.x, e.clientX);
        const y = Math.min(smartDrag.y, e.clientY);
        zoneRect.style.left = x + 'px'; zoneRect.style.top = y + 'px';
        zoneRect.style.width = Math.abs(e.clientX - smartDrag.x) + 'px';
        zoneRect.style.height = Math.abs(e.clientY - smartDrag.y) + 'px';
        zoneRect.classList.add('coquille-drawing');
      }
      return;
    }
    // Throttle à ~30 Hz
    const now = performance.now();
    if (now - cursorThrottle < 33) return;
    cursorThrottle = now;
    updateCursorAt(e.clientX, e.clientY);
  });

  document.addEventListener('mousedown', (e) => {
    // Clic hors de la bulle ouverte : envoi automatique si une remarque est saisie, sinon fermeture.
    // Aucune nouvelle zone ne démarre : la remarque en cours n'est jamais perdue.
    if (bubble.classList.contains('coquille-visible') && !isPluginEl(e.target)) {
      autoSendOrClose();
      return;
    }
    if (!reviewModeActive) return;
    if (isPluginEl(e.target)) return;
    // Si on clique sur du texte, on laisse le navigateur faire la sélection
    if (isOverText(e.clientX, e.clientY)) return;
    // Sinon, on amorce un drag potentiel pour capture de zone
    smartDrag = { x: e.clientX, y: e.clientY, isDrag: false };
    e.preventDefault(); // empêche les drag images / sélections parasites
  });

  document.addEventListener('mouseup', (e) => {
    if (!reviewModeActive) return;
    if (isPluginEl(e.target)) { smartDrag = null; return; }

    // Cas 1 : on a fait un drag de zone
    if (smartDrag && smartDrag.isDrag) {
      const x = Math.min(smartDrag.x, e.clientX);
      const y = Math.min(smartDrag.y, e.clientY);
      const w = Math.abs(e.clientX - smartDrag.x);
      const h = Math.abs(e.clientY - smartDrag.y);
      zoneRect.classList.remove('coquille-drawing');
      smartDrag = null;
      if (w >= 8 && h >= 8) captureZone(x, y, w, h);
      return;
    }
    smartDrag = null;

    // Cas 2 : pas de drag → on regarde si une sélection texte existe
    captureTextSelection(e.clientX);
  });

  // Intercepte tous les clics en mode revue pour bloquer la navigation
  document.addEventListener('click', (e) => {
    if (!reviewModeActive) return;
    if (isPluginEl(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // Tactile : on supporte uniquement la sélection texte
  document.addEventListener('touchend', (e) => {
    if (!reviewModeActive) return;
    if (isPluginEl(e.target)) return;
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      captureTextSelection(rect.left + rect.width / 2);
    }, 100);
  });

  // ── Type d'annotation ────────────────────────────────────────────────
  document.querySelectorAll('.coquille-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.coquille-type-btn').forEach(b => b.classList.remove('coquille-active'));
      btn.classList.add('coquille-active');
      activeType = btn.dataset.type;
    });
  });

  // ── Envoi ────────────────────────────────────────────────────────────
  let sending = false;
  async function sendAnnotation() {
    if (sending) return false;
    if (!currentAnnotation || textarea.value.trim().length < 2) { textarea.focus(); return false; }
    sending = true;

    // Mêmes longueurs maximales que le serveur
    const max = cfg.maxLengths;
    const cut = (s, n) => (s || '').slice(0, n);
    const payload = {
      url: cut(currentAnnotation.url, max.url), pageTitle: cut(currentAnnotation.pageTitle, max.pageTitle),
      xpath: cut(currentAnnotation.xpath, max.xpath), cssSelector: cut(currentAnnotation.cssSelector, max.cssSelector),
      charOffsetStart: currentAnnotation.charOffsetStart, charOffsetEnd: currentAnnotation.charOffsetEnd,
      originalText: cut(currentAnnotation.originalText, max.originalText), suggestion: textarea.value.trim(),
      type: activeType,
      annotationMode: currentAnnotation.mode, zoneData: currentAnnotation.zoneData || null,
      // Champs vides omis : le serveur n'a rien à nettoyer
      reviewerName: reviewerName?.value.trim() || undefined,
      reviewerEmail: reviewerEmail?.value.trim() || undefined,
      hp: honeypot.value, // doit rester vide
    };

    // Validation email côté client (si renseigné)
    if (payload.reviewerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.reviewerEmail)) {
      reviewerEmail.classList.add('coquille-invalid');
      reviewerEmail.focus();
      sending = false;
      return false;
    }
    reviewerEmail?.classList.remove('coquille-invalid');

    sendBtn.disabled = true;
    sendBtn.textContent = t.sending;

    try {
      const res = await fetch(cfg.restUrl, {
        method: 'POST',
        headers: cfg.nonce ? { 'Content-Type': 'application/json', 'X-WP-Nonce': cfg.nonce } : { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const messages = { 413: t.errorTooLong, 429: t.errorRateLimited, 401: t.errorLoginRequired, 403: t.errorForbidden };
        throw new Error(messages[res.status] || err.message || fmt(t.errorGeneric, res.status));
      }
      showToast('✓ ' + t.sent, 'success');
      exitReviewMode(); // sortie automatique du mode après envoi réussi
      return true;
    } catch (err) {
      showToast('✗ ' + err.message, 'error');
      return false;
    } finally {
      sending = false;
      sendBtn.disabled = false;
      sendBtn.textContent = t.send;
    }
  }
  sendBtn.addEventListener('click', sendAnnotation);

  // Auto-envoi sur Enter (Shift+Enter = saut de ligne classique)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAnnotation();
    }
  });

  cancelBtn.addEventListener('click', closeBubble);
  document.getElementById('coquille-bubble-close').addEventListener('click', closeBubble);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (bubble.classList.contains('coquille-visible')) closeBubble();
      else if (reviewModeActive) exitReviewMode();
      else if (infoPop.classList.contains('coquille-visible')) infoPop.classList.remove('coquille-visible');
    }
    // Alt+Maj+C (Option+Maj+C sur Mac, d'où e.code) : personnes connectées seulement, jamais pendant une saisie.
    if (cfg.shortcut && e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyC' && !isTyping(e.target)) {
      e.preventDefault();
      reviewModeActive ? exitReviewMode() : enterReviewMode();
    }
  });

  // Auto-envoi sur fermeture si du texte est saisi (sinon, on ferme juste)
  function autoSendOrClose() {
    if (currentAnnotation && textarea.value.trim().length >= 2) {
      sendAnnotation(); // ferme automatiquement après succès
    } else {
      closeBubble();
    }
  }

})();
