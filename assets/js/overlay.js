/* Coquille Revue — public interface. Configuration and texts: JSON block #coquille-revue-config, written by PHP. */
(function () {
  'use strict';

  // Data block that is never run: it works under a strict CSP without nonce. File in cache newer or older
  // than the page (block missing or unreadable): do nothing rather than break the page.
  let cfg = null;
  try {
    cfg = JSON.parse(document.getElementById('coquille-revue-config').textContent);
  } catch (e) {
    return;
  }
  if (!cfg || !cfg.i18n || !document.getElementById('coquille-fab')) return;
  const t = cfg.i18n;

  const PAGE_URL   = window.location.origin + window.location.pathname;
  const PAGE_TITLE = document.title;

  // Replaces %s or %1$s, %2$s… with the given values (translatable texts on the PHP side).
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
  const typeButtons  = document.querySelectorAll('.coquille-type-btn');

  let reviewModeActive = false;
  let currentAnnotation = null;
  let activeType = 'correction';
  let smartDrag = null;     // { x, y, isDrag }: click-and-drag in progress over an area without text
  let lastOverText = null;  // null = not detected yet
  let cursorThrottle = 0;
  let lastPointerType = 'mouse'; // 'touch': text is selected with a finger (long press, handles)

  // Helpers for the "over text or not" detector
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

    // Checks that the point is really ON a glyph (not on adjacent padding).
    // Measures the rect of the nearest character and requires a distance below 6 px.
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
      return true; // careful fallback: assume the pointer is over text
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

  // Bubble fixed at the bottom of the screen, above the bar, centered on what is annotated (rect: coordinates
  // on the screen); at the top when it would hide it and there is room above. On the right, the pencil stays visible.
  // When the whole bubble fits on neither side (selection in the middle of the screen), it takes the larger side,
  // its height limited to the room there (it scrolls inside): it never hides the selection.
  let bubbleRoom = '', bubbleTop = false;
  function positionBubble(rect) {
    const vw = window.innerWidth, vh = window.innerHeight;
    bubble.style.maxHeight = '';
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    const maxLeft = vw - bw - (vw > 600 ? 84 : 16);
    bubble.style.left = Math.max(16, Math.min(rect.left + rect.width / 2 - bw / 2, maxLeft)) + 'px';
    bubble.style.right = 'auto';
    const below = vh - 56 - 8 - rect.bottom; // room between the selection and the bottom position
    const above = rect.top - 8 - 16;         // room between the top position and the selection
    const squeeze = below < bh && above <= bh && Math.max(below, above) >= 160;
    bubbleRoom = squeeze ? Math.floor(Math.max(below, above)) + 'px' : '';
    bubbleTop = squeeze ? above > below : below < bh && above > bh;
    bubble.style.maxHeight = bubbleRoom;
    bubble.classList.toggle('coquille-bubble-top', bubbleTop);
  }

  // Virtual keyboard open: the visible area shrinks without the page moving; the bubble sits just above it.
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
      bubble.style.maxHeight = bubbleRoom;
      bubble.classList.toggle('coquille-bubble-top', bubbleTop);
    }
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitBubbleToViewport);
    window.visualViewport.addEventListener('scroll', fitBubbleToViewport);
  }

  // On touch, the field does not take the focus by itself: the keyboard would hide the page and, on iOS, erase the selection.
  function showBubble(rect, focusField) {
    bubble.classList.add('coquille-visible');
    positionBubble(rect);
    fitBubbleToViewport();
    if (focusField) setTimeout(() => textarea.focus({ preventScroll: true }), 60);
  }

  // Message announced by the live region (role="status", or "alert" for an error, read at once);
  // the text is emptied once the message is hidden.
  let toastTimer = null;
  function showToast(msg, type) {
    clearTimeout(toastTimer);
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    toast.textContent = msg;
    toast.className = 'coquille-show coquille-' + type;
    toastTimer = setTimeout(() => {
      toast.className = '';
      toastTimer = setTimeout(() => { toast.textContent = ''; }, 300);
    }, type === 'error' ? 6000 : 3000);
  }

  // Focus that was in the bubble or the bar comes back to the pencil when they disappear;
  // after a click elsewhere in the page, it stays where the person clicked.
  function focusIsIn(...els) {
    return els.some(el => el.contains(document.activeElement));
  }
  let restoringFocus = false; // focus given back by the script: does not open the information popover
  function focusFab() {
    restoringFocus = true;
    fab.focus({ preventScroll: true });
    restoringFocus = false;
  }

  // The plugin's own highlight (CSS Custom Highlight API): the chosen passage stays marked in the page when
  // the field takes the focus, which clears the browser selection. Without this API, the bubble quotes the passage.
  const canHighlight = !!(window.CSS && CSS.highlights && window.Highlight);
  function highlightSelection(range) {
    if (canHighlight) CSS.highlights.set('coquille-selection', new Highlight(range.cloneRange()));
  }
  function clearHighlight() {
    if (canHighlight) CSS.highlights.delete('coquille-selection');
  }

  function closeBubble() {
    const hadFocus = focusIsIn(bubble);
    clearHighlight();
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

  // ── FAB: popover on hover or focus, click starts the review ──────────
  let popoverHideTimer = null;
  function showPopover() {
    clearTimeout(popoverHideTimer);
    if (!reviewModeActive) infoPop.classList.add('coquille-visible');
  }
  // Opened with the keyboard, the popover stays shown while the focus is on the pencil or in the popover.
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
  // Focus can move from the pencil to the popover (Tab) without closing it.
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
    focusFab(); // the button disappears with the popover: focus goes back to the pencil
  });
  stopBtn.addEventListener('click', () => exitReviewMode());

  // ── Text selection capture ───────────────────────────────────────────
  function captureTextSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim().length < 2) return false;

    const range = sel.getRangeAt(0);
    const text  = sel.toString().trim();
    const touch = lastPointerType === 'touch';
    // On touch, adjusting the handles updates the bubble already open without erasing the remark.
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
    if (!updating) {
      textarea.value = '';
      setType('correction');
    }

    highlightSelection(range);
    showBubble(range.getBoundingClientRect(), !touch);
    return true;
  }

  // ── Area capture (dragged rectangle) ─────────────────────────────────
  function captureZone(x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2;
    // Finds the element under the center (no full-screen overlay can hide it)
    const elBehind = document.elementFromPoint(cx, cy) || document.body;

    zoneHL.style.left = (x + window.scrollX) + 'px';
    zoneHL.style.top  = (y + window.scrollY) + 'px';
    zoneHL.style.width = w + 'px';
    zoneHL.style.height = h + 'px';
    zoneHL.classList.add('coquille-visible');
    clearHighlight();

    const elText = (elBehind.innerText || '').trim().slice(0, 120);

    currentAnnotation = {
      mode: 'zone',
      url: PAGE_URL, pageTitle: PAGE_TITLE,
      xpath: getXPath(elBehind),
      cssSelector: getCssSelector(elBehind),
      charOffsetStart: 0, charOffsetEnd: 0,
      originalText: elText || '(zone without text)', // stored value: fixed marker, never translated
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
    setType('correction');

    showBubble({ left: x, top: y, width: w, height: h, bottom: y + h }, true);
  }

  // ── Unified logic: smart cursor + automatic capture ──────────────────
  function updateCursorAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (isPluginEl(el)) return; // leave the cursor alone in our own UI
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
    // Throttle at about 30 Hz
    const now = performance.now();
    if (now - cursorThrottle < 33) return;
    cursorThrottle = now;
    updateCursorAt(e.clientX, e.clientY);
  });

  document.addEventListener('mousedown', (e) => {
    // Click outside the open bubble: automatic sending when a remark is typed, otherwise closing.
    // No new area starts: the remark in progress is never lost.
    if (bubble.classList.contains('coquille-visible') && !isPluginEl(e.target)) {
      autoSendOrClose();
      return;
    }
    if (!reviewModeActive || lastPointerType === 'touch') return;
    if (isPluginEl(e.target)) return;
    // Click on text: the browser makes the selection
    if (isOverText(e.clientX, e.clientY)) return;
    // Otherwise, start a possible drag to capture an area
    smartDrag = { x: e.clientX, y: e.clientY, isDrag: false };
    e.preventDefault(); // prevents drag images and stray selections
  });

  document.addEventListener('mouseup', (e) => {
    if (!reviewModeActive || lastPointerType === 'touch') return;
    if (isPluginEl(e.target)) { smartDrag = null; return; }

    // Case 1: an area was dragged
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

    // Case 2: no drag → check whether a text selection exists
    captureTextSelection();
  });

  // Catches every click in review mode to block navigation
  document.addEventListener('click', (e) => {
    if (!reviewModeActive) return;
    if (isPluginEl(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // Touch: text selection only (long press, then handles). The bubble opens or is updated
  // once the selection is stable; mouse events simulated after a touch are ignored.
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

  // ── Type of remark: "Correction" for each new bubble ─────────────────
  function setType(type) {
    activeType = type;
    typeButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.type === type)));
  }
  typeButtons.forEach(btn => btn.addEventListener('click', () => setType(btn.dataset.type)));

  // ── Sending ──────────────────────────────────────────────────────────
  let sending = false;
  async function sendAnnotation() {
    if (sending) return false;
    if (!currentAnnotation || textarea.value.trim().length < 2) { textarea.focus(); return false; }
    sending = true;

    // Same maximum lengths as the server
    const max = cfg.maxLengths;
    const cut = (s, n) => (s || '').slice(0, n);
    const payload = {
      url: cut(currentAnnotation.url, max.url), pageTitle: cut(currentAnnotation.pageTitle, max.pageTitle),
      xpath: cut(currentAnnotation.xpath, max.xpath), cssSelector: cut(currentAnnotation.cssSelector, max.cssSelector),
      charOffsetStart: currentAnnotation.charOffsetStart, charOffsetEnd: currentAnnotation.charOffsetEnd,
      originalText: cut(currentAnnotation.originalText, max.originalText), suggestion: textarea.value.trim(),
      type: activeType,
      annotationMode: currentAnnotation.mode, zoneData: currentAnnotation.zoneData || null,
      // Empty fields left out: the server has nothing to sanitize
      reviewerName: reviewerName?.value.trim() || undefined,
      reviewerEmail: reviewerEmail?.value.trim() || undefined,
      hp: honeypot.value, // must stay empty
    };

    // Email check on the client side (when given)
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
        // Field too long: 400 rest_invalid_param, with the rest_too_long code in the details of the field.
        const tooLong = res.status === 400 && err.code === 'rest_invalid_param'
          && Object.values((err.data && err.data.details) || {}).some(d => d && d.code === 'rest_too_long');
        const messages = { 429: t.errorRateLimited, 401: t.errorLoginRequired, 403: t.errorForbidden };
        throw new Error((tooLong && t.errorTooLong) || messages[res.status] || err.message || fmt(t.errorGeneric, res.status));
      }
      showToast(t.sent, 'success');
      exitReviewMode(); // review mode ends automatically after a successful sending
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

  // Automatic sending on Enter (Shift+Enter = ordinary line break)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAnnotation();
    }
  });

  cancelBtn.addEventListener('click', () => closeBubble());
  document.getElementById('coquille-bubble-close').addEventListener('click', () => closeBubble());

  document.addEventListener('keydown', (e) => {
    // Escape already used by the theme (menu, dialog): left alone.
    if (e.key === 'Escape' && !e.defaultPrevented) {
      if (bubble.classList.contains('coquille-visible')) closeBubble();
      else if (reviewModeActive) exitReviewMode();
      else if (infoPop.classList.contains('coquille-visible')) {
        const hadFocus = focusIsIn(infoPop);
        infoPop.classList.remove('coquille-visible');
        if (hadFocus) focusFab();
      }
    }
    // Annotation with the keyboard: in review mode, a selection made with the keyboard (caret browsing, F7) then Enter.
    if (e.key === 'Enter' && reviewModeActive && !bubble.classList.contains('coquille-visible') && !isPluginEl(e.target) && !isTyping(e.target)) {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && !isPluginEl(nodeEl(sel.anchorNode)) && captureTextSelection()) e.preventDefault();
    }
    // Alt+Shift+C (Option+Shift+C on Mac, hence e.code): logged-in users only, never while typing.
    if (cfg.shortcut && e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyC' && !isTyping(e.target)) {
      e.preventDefault();
      reviewModeActive ? exitReviewMode() : enterReviewMode();
    }
  });

  // Automatic sending on closing when some text is typed (otherwise, just close)
  function autoSendOrClose() {
    if (currentAnnotation && textarea.value.trim().length >= 2) {
      sendAnnotation(); // closes automatically after success
    } else {
      closeBubble();
    }
  }

  // Everything is ready: the pencil can be shown. If the script does not run (strict CSP, script delayed
  // or broken by an optimization tool), no inert button is shown.
  document.getElementById('coquille-revue-root').classList.add('coquille-ready');
})();
