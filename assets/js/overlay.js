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
  const bar          = document.getElementById('coquille-bar');
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
  let lastPointerType = 'mouse'; // 'touch' : la sélection se fait au doigt (appui long, poignées)

  // Helpers pour le détecteur "sur du texte ou pas"
  function isPluginEl(el) {
    return !!(el && el.closest && el.closest('#coquille-revue-root'));
  }
  function nodeEl(node) {
    return node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
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

  // Bulle fixée en bas de l'écran, au-dessus de la barre, centrée sur ce qui est annoté (rect : coordonnées
  // à l'écran) ; en haut si elle le cacherait et qu'il y a la place au-dessus. À droite, le crayon reste visible.
  function positionBubble(rect) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    const maxLeft = vw - bw - (vw > 600 ? 84 : 16);
    bubble.style.left = Math.max(16, Math.min(rect.left + rect.width / 2 - bw / 2, maxLeft)) + 'px';
    bubble.style.right = 'auto';
    bubble.classList.toggle('coquille-bubble-top', rect.bottom > vh - 56 - bh - 8 && rect.top > bh + 24);
  }

  // Clavier virtuel ouvert : la zone visible rétrécit sans que la page bouge ; la bulle se place juste au-dessus.
  function fitBubbleToViewport() {
    const vv = window.visualViewport;
    if (!vv || !bubble.classList.contains('coquille-visible')) return;
    const keyboard = Math.round(window.innerHeight - vv.height - vv.offsetTop);
    if (keyboard > 80 && Math.abs(vv.scale - 1) < 0.01) {
      bubble.classList.remove('coquille-bubble-top');
      bubble.style.bottom = (keyboard + 8) + 'px';
      bubble.style.maxHeight = (vv.height - 16) + 'px';
    } else {
      bubble.style.bottom = '';
      bubble.style.maxHeight = '';
    }
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitBubbleToViewport);
    window.visualViewport.addEventListener('scroll', fitBubbleToViewport);
  }

  // Au toucher, le champ ne prend pas le focus tout seul : le clavier cacherait la page et, sur iOS, effacerait la sélection.
  function showBubble(rect, focusField) {
    bubble.classList.add('coquille-visible');
    positionBubble(rect);
    fitBubbleToViewport();
    if (focusField) setTimeout(() => textarea.focus({ preventScroll: true }), 60);
  }

  // Message annoncé par la zone role="status" ; le texte est vidé une fois le message masqué.
  let toastTimer = null;
  function showToast(msg, type) {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.className = 'coquille-show coquille-' + type;
    toastTimer = setTimeout(() => {
      toast.className = '';
      toastTimer = setTimeout(() => { toast.textContent = ''; }, 300);
    }, type === 'error' ? 6000 : 3000);
  }

  // Le focus qui était dans la bulle ou la barre revient au crayon quand elles disparaissent ;
  // après un clic ailleurs dans la page, il reste là où la personne a cliqué.
  function focusIsIn(...els) {
    return els.some(el => el.contains(document.activeElement));
  }
  let restoringFocus = false; // focus rendu par le script : n'ouvre pas la fenêtre d'information
  function focusFab() {
    restoringFocus = true;
    fab.focus({ preventScroll: true });
    restoringFocus = false;
  }

  function closeBubble() {
    const hadFocus = focusIsIn(bubble);
    bubble.classList.remove('coquille-visible');
    zoneHL.classList.remove('coquille-visible');
    currentAnnotation = null;
    textarea.value = '';
    reviewerEmail?.removeAttribute('aria-invalid');
    if (hadFocus) focusFab();
  }

  function enterReviewMode() {
    reviewModeActive = true;
    lastOverText = null;
    document.body.classList.add('coquille-mode-active', 'coquille-cursor-text');
    fab.setAttribute('aria-pressed', 'true');
    infoPop.classList.remove('coquille-visible');
  }

  function exitReviewMode() {
    const hadFocus = focusIsIn(bubble, bar);
    reviewModeActive = false;
    document.body.classList.remove('coquille-mode-active', 'coquille-cursor-text', 'coquille-cursor-zone');
    fab.setAttribute('aria-pressed', 'false');
    zoneRect.classList.remove('coquille-drawing');
    smartDrag = null;
    closeBubble();
    if (hadFocus) focusFab();
  }

  // ── FAB : popover au survol ou au focus, clic lance la relecture ─────
  let popoverHideTimer = null;
  function showPopover() {
    clearTimeout(popoverHideTimer);
    if (!reviewModeActive) infoPop.classList.add('coquille-visible');
  }
  // Ouverte au clavier, la fenêtre reste affichée tant que le focus est sur le crayon ou dans la fenêtre.
  function keyboardFocusOnFab() {
    try { return fab.matches(':focus-visible'); } catch (e) { return false; }
  }
  function hidePopoverDelayed() {
    clearTimeout(popoverHideTimer);
    popoverHideTimer = setTimeout(() => {
      if (!focusIsIn(infoPop) && !keyboardFocusOnFab()) infoPop.classList.remove('coquille-visible');
    }, 220);
  }
  fab.addEventListener('mouseenter', showPopover);
  fab.addEventListener('mouseleave', hidePopoverDelayed);
  infoPop.addEventListener('mouseenter', showPopover);
  infoPop.addEventListener('mouseleave', hidePopoverDelayed);
  fab.addEventListener('focus', () => { if (!restoringFocus) showPopover(); });
  // Le focus peut passer du crayon à la fenêtre (Tab) sans la fermer.
  [fab, infoPop].forEach(el => el.addEventListener('focusout', (e) => {
    if (!infoPop.contains(e.relatedTarget) && e.relatedTarget !== fab) infoPop.classList.remove('coquille-visible');
  }));

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
    focusFab(); // le bouton disparaît avec la fenêtre : le focus revient au crayon
  });
  stopBtn.addEventListener('click', () => exitReviewMode());

  // ── Capture sélection texte ──────────────────────────────────────────
  function captureTextSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim().length < 2) return false;

    const range = sel.getRangeAt(0);
    const text  = sel.toString().trim();
    const touch = lastPointerType === 'touch';
    // Au toucher, ajuster les poignées met à jour la bulle déjà ouverte sans effacer la remarque.
    const updating = touch && bubble.classList.contains('coquille-visible');

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
    if (!updating) textarea.value = '';

    showBubble(range.getBoundingClientRect(), !touch);
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
      originalText: elText || '(zone without text)', // valeur enregistrée : marqueur fixe, jamais traduit
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

    showBubble({ left: x, top: y, width: w, height: h, bottom: y + h }, true);
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
    if (!reviewModeActive || lastPointerType === 'touch') return;
    if (isPluginEl(e.target)) return;
    // Si on clique sur du texte, on laisse le navigateur faire la sélection
    if (isOverText(e.clientX, e.clientY)) return;
    // Sinon, on amorce un drag potentiel pour capture de zone
    smartDrag = { x: e.clientX, y: e.clientY, isDrag: false };
    e.preventDefault(); // empêche les drag images / sélections parasites
  });

  document.addEventListener('mouseup', (e) => {
    if (!reviewModeActive || lastPointerType === 'touch') return;
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
    captureTextSelection();
  });

  // Intercepte tous les clics en mode revue pour bloquer la navigation
  document.addEventListener('click', (e) => {
    if (!reviewModeActive) return;
    if (isPluginEl(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // Tactile : sélection de texte seulement (appui long, puis poignées). La bulle s'ouvre ou se met à jour
  // une fois la sélection stable ; les événements souris simulés après un toucher sont ignorés.
  let selectionTimer = null;
  document.addEventListener('pointerdown', (e) => { lastPointerType = e.pointerType || 'mouse'; }, true);
  document.addEventListener('selectionchange', () => {
    if (!reviewModeActive || lastPointerType !== 'touch') return;
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => {
      const sel = window.getSelection();
      if (reviewModeActive && sel && sel.rangeCount && !isPluginEl(nodeEl(sel.anchorNode))) captureTextSelection();
    }, 600);
  });

  // ── Type d'annotation ────────────────────────────────────────────────
  const typeButtons = document.querySelectorAll('.coquille-type-btn');
  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      typeButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
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
      reviewerEmail.setAttribute('aria-invalid', 'true');
      reviewerEmail.focus();
      showToast(t.errorEmail, 'error');
      sending = false;
      return false;
    }
    reviewerEmail?.removeAttribute('aria-invalid');

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
      showToast(t.sent, 'success');
      exitReviewMode(); // sortie automatique du mode après envoi réussi
      return true;
    } catch (err) {
      showToast(err.message, 'error');
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

  cancelBtn.addEventListener('click', () => closeBubble());
  document.getElementById('coquille-bubble-close').addEventListener('click', () => closeBubble());

  document.addEventListener('keydown', (e) => {
    // Échap déjà utilisé par le thème (menu, fenêtre) : on n'y touche pas.
    if (e.key === 'Escape' && !e.defaultPrevented) {
      if (bubble.classList.contains('coquille-visible')) closeBubble();
      else if (reviewModeActive) exitReviewMode();
      else if (infoPop.classList.contains('coquille-visible')) {
        const hadFocus = focusIsIn(infoPop);
        infoPop.classList.remove('coquille-visible');
        if (hadFocus) focusFab();
      }
    }
    // Annotation au clavier : en mode relecture, une sélection faite au clavier (navigation au curseur, F7) puis Entrée.
    if (e.key === 'Enter' && reviewModeActive && !bubble.classList.contains('coquille-visible') && !isPluginEl(e.target) && !isTyping(e.target)) {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && !isPluginEl(nodeEl(sel.anchorNode)) && captureTextSelection()) e.preventDefault();
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
