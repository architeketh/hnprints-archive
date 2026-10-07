/*
 * hnPrints one-button form filler.
 * Runs on the seller "add product" page when you click the bookmark.
 * It fills in the form for the piece you pick. It never clicks Save or Submit.
 */
(function () {
  'use strict';
  if (window.__hnFiller) { window.__hnFiller.toggle(); return; }

  var scriptEl = document.currentScript;
  var BASE = (scriptEl && scriptEl.src) ? scriptEl.src.replace(/filler\.js.*$/, '') : 'https://architeketh.github.io/hnprints-archive/';
  var V = Date.now();

  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var DEFAULT_COLLECTIONS = ['$25-50', 'Art Prints', 'Art for your Walls', 'Printmaking'];

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }

  /* ---------- small helpers ---------- */
  function norm(s) { return (s || '').toLowerCase().replace(/&amp;/g, '&').replace(/[^a-z0-9$]+/g, ' ').trim(); }
  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function usable(e) { return !e.disabled && e.type !== 'hidden' && !(e.closest && e.closest('#hn-filler-host')); }

  function ownLabel(el) {
    var parts = [];
    if (el.id) { try { document.querySelectorAll('label[for="' + CSS.escape(el.id) + '"]').forEach(function (l) { parts.push(l.textContent); }); } catch (e) {} }
    var wrap = el.closest('label'); if (wrap) parts.push(wrap.textContent);
    if (!parts.length) {
      var n = el.nextSibling; while (n && n.nodeType === 3 && !n.textContent.trim()) n = n.nextSibling;
      if (n && n.nodeType === 3) parts.push(n.textContent);
      else if (el.nextElementSibling && /^(LABEL|SPAN)$/.test(el.nextElementSibling.tagName)) parts.push(el.nextElementSibling.textContent);
    }
    return parts.join(' ');
  }
  function ownKeys(el) {
    var parts = [ownLabel(el)];
    ['aria-label', 'placeholder', 'name', 'id', 'title'].forEach(function (a) { var v = el.getAttribute(a); if (v) parts.push(v); });
    return norm(parts.join(' '));
  }
  function groupLabel(el) {
    var g = el.closest('.form-group,.mb-3,.field,.form-field,.input-group,fieldset,tr,.row,[class*="col-"]');
    if (g) { var lab = g.querySelector('label,legend,.control-label,.form-label'); if (lab && !lab.contains(el)) return norm(lab.textContent); }
    return '';
  }
  function labelOf(el) { return (ownKeys(el) + ' ' + groupLabel(el)).trim(); }

  // Find a text-like control by label words. Own label first, group label second.
  function findControl(patterns, exclude, selector) {
    var els = Array.prototype.slice.call(document.querySelectorAll(selector || 'input,textarea,select')).filter(function (e) {
      return usable(e) && ['checkbox', 'radio', 'file', 'submit', 'button', 'image', 'reset'].indexOf(e.type) < 0;
    });
    var passes = [ownKeys, labelOf];
    for (var k = 0; k < passes.length; k++) {
      for (var i = 0; i < patterns.length; i++) {
        for (var j = 0; j < els.length; j++) {
          var lab = passes[k](els[j]);
          if (patterns[i].test(lab) && !(exclude && exclude.test(lab))) return els[j];
        }
      }
    }
    return null;
  }

  function setValue(el, val) {
    if (el.tagName === 'SELECT') {
      var o = Array.prototype.slice.call(el.options).find(function (x) { return norm(x.text) === norm(val) || x.value === val; });
      if (!o) return false; el.value = o.value; fire(el); return true;
    }
    var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, 'value');
    if (setter && setter.set) setter.set.call(el, val); else el.value = val;
    fire(el);
    return true;
  }

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function htmlDesc(l) { return l.description.split(/\n{2,}/).map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('\n'); }

  /* ---------- field fillers ---------- */
  function fillTitle(l) {
    var el = findControl([/\btitle\b/, /product name/, /\bname\b/], /meta|seo|seller|shop|brand|collection|file|image|alt|option|variant|tag/);
    if (!el) return null; setValue(el, l.title); return 'filled';
  }

  function findEditable() {
    var c = Array.prototype.slice.call(document.querySelectorAll('[contenteditable="true"],.ql-editor,.note-editable')).filter(function (e) { return !(e.closest('#hn-filler-host')); });
    if (!c.length) return null;
    var byLabel = c.find(function (e) { var g = groupLabel(e); return /description/.test(g) && !/meta|short|seo/.test(g); });
    return byLabel || c[0];
  }

  function fillDescription(l) {
    var html = htmlDesc(l);
    var ta = findControl([/description/], /meta|short|seo|alt|image/, 'textarea,input');
    if (window.tinymce && tinymce.editors && tinymce.editors.length) {
      var ed = (ta && ta.id && tinymce.get(ta.id)) || tinymce.editors.find(function (e) { return /description|body/i.test((e.id || '') + ((e.targetElm && e.targetElm.name) || '')); }) || tinymce.editors[0];
      if (ed) { ed.setContent(html); if (ed.save) ed.save(); return 'filled (rich editor)'; }
    }
    if (window.CKEDITOR && CKEDITOR.instances) {
      var keys = Object.keys(CKEDITOR.instances);
      if (keys.length) { var inst = (ta && CKEDITOR.instances[ta.id]) || CKEDITOR.instances[keys[0]]; inst.setData(html); return 'filled (rich editor)'; }
    }
    var ce = findEditable();
    if (ce) { ce.focus(); ce.innerHTML = html; ce.dispatchEvent(new Event('input', { bubbles: true })); return 'filled (rich text box)'; }
    if (ta) { setValue(ta, l.description); return 'filled'; }
    return null;
  }

  function fillPrice(l) {
    var el = findControl([/\bprice\b/], /compare|cost|tax|meta|discount|special|shipping/);
    if (!el || l.price == null) return null; setValue(el, String(l.price)); return 'filled';
  }
  function fillQuantity(l) {
    var el = findControl([/quantity/, /inventory/, /\bstock\b/, /\bqty\b/], /threshold|alert|low|min|max/);
    if (!el || l.quantity == null) return null; setValue(el, String(l.quantity)); return 'filled';
  }
  function fillSku(l) {
    if (!l.sku) return 'skipped (no SKU in your data)';
    var el = findControl([/\bsku\b/], null); if (!el) return null; setValue(el, l.sku); return 'filled';
  }
  function fillTags(l) {
    var el = findControl([/\btags?\b/], /meta|seo|alt/, 'input,textarea');
    if (!el) return null;
    var box = el.closest('.form-group,.mb-3,.field,div');
    var ui = box && box.querySelector('.bootstrap-tagsinput input,.tagify__input,.ti-new-tag-input');
    if (ui) {
      l.tags.forEach(function (t) {
        ui.focus(); setValue(ui, t);
        ['keydown', 'keyup'].forEach(function (ev) { ui.dispatchEvent(new KeyboardEvent(ev, { key: 'Enter', keyCode: 13, which: 13, bubbles: true })); });
      });
      return 'filled (' + l.tags.length + ' tags typed in)';
    }
    setValue(el, l.tags.join(', ')); return 'filled (' + l.tags.length + ' tags, comma separated)';
  }
  function fillMeta(l) {
    var out = [];
    var mt = findControl([/meta title/, /seo title/, /page title/], null);
    if (mt) { setValue(mt, l.title.slice(0, 70)); out.push('meta title'); }
    var md = findControl([/meta description/, /seo description/], null);
    if (md) { setValue(md, l.description.replace(/\s+/g, ' ').slice(0, 155)); out.push('meta description'); }
    return out.length ? 'filled (' + out.join(', ') + ')' : null;
  }

  function tickCollections(names) {
    var res = { ticked: [], already: [], missing: [] };
    var boxes = Array.prototype.slice.call(document.querySelectorAll('input[type=checkbox],input[type=radio]')).filter(usable);
    var multis = Array.prototype.slice.call(document.querySelectorAll('select[multiple]')).filter(usable);
    names.forEach(function (n) {
      var w = norm(n); if (!w) return;
      var hit = boxes.find(function (b) { return norm(ownLabel(b)) === w; }) ||
        (w.length > 3 && boxes.find(function (b) { var o = norm(ownLabel(b)); return o && o.length < 60 && o.indexOf(w) >= 0; }));
      if (hit) {
        if (hit.checked) { res.already.push(n); return; }
        hit.click();
        if (!hit.checked) { hit.checked = true; fire(hit); }
        res.ticked.push(n); return;
      }
      for (var i = 0; i < multis.length; i++) {
        var o = Array.prototype.slice.call(multis[i].options).find(function (x) { return norm(x.text) === w; });
        if (o) { o.selected = true; fire(multis[i]); res.ticked.push(n); return; }
      }
      res.missing.push(n);
    });
    return res;
  }

  function setShipping(word) {
    var w = norm(word); if (!w) return null;
    var sels = Array.prototype.slice.call(document.querySelectorAll('select')).filter(usable);
    for (var i = 0; i < sels.length; i++) {
      var o = Array.prototype.slice.call(sels[i].options).find(function (x) { return norm(x.text).indexOf(w) >= 0; });
      if (o) { sels[i].value = o.value; fire(sels[i]); return 'selected "' + o.text.trim() + '"'; }
    }
    var ctl = Array.prototype.slice.call(document.querySelectorAll('input[type=radio],input[type=checkbox]')).filter(usable)
      .find(function (b) { return norm(ownLabel(b)).indexOf(w) >= 0; });
    if (ctl) { if (!ctl.checked) { ctl.click(); if (!ctl.checked) { ctl.checked = true; fire(ctl); } } return 'selected'; }
    return null;
  }

  var imgNext = 0; // for forms with one upload box per image
  async function attachImages(l, restart) {
    if (restart) imgNext = 0;
    var items = l.images.slice(0, 10);
    var files = [], failed = [];
    for (var i = 0; i < items.length; i++) {
      var name = items[i].local.split('/').pop();
      try {
        var r = await fetch(items[i].supabase || items[i].url);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var b = await r.blob();
        files.push(new File([b], name, { type: b.type || 'image/jpeg' }));
      } catch (e) { failed.push(name); }
    }
    if (!files.length) return { note: 'could not download the images (' + failed.join(', ') + ')', ok: false };
    var dt = function (arr) { var d = new DataTransfer(); arr.forEach(function (f) { d.items.add(f); }); return d; };

    var dz = document.querySelector('.dropzone');
    if (dz && dz.dropzone) { files.forEach(function (f) { dz.dropzone.addFile(f); }); return { note: files.length + ' attached' + (failed.length ? ', ' + failed.length + ' failed' : ''), ok: !failed.length }; }

    var inputs = Array.prototype.slice.call(document.querySelectorAll('input[type=file]')).filter(function (e) { return !e.disabled && (!e.accept || /image|jpe?g|png/i.test(e.accept)); });
    if (!inputs.length) return { note: 'no image upload box found on the page', ok: false };
    var multi = inputs.find(function (x) { return x.multiple; });
    if (multi) { multi.files = dt(files).files; fire(multi); return { note: files.length + ' attached' + (failed.length ? ', ' + failed.length + ' failed' : ''), ok: !failed.length }; }
    var n = 0;
    for (var k = 0; k < inputs.length && imgNext < files.length; k++) {
      if (inputs[k].files && inputs[k].files.length) continue;
      inputs[k].files = dt([files[imgNext]]).files; fire(inputs[k]); imgNext++; n++;
    }
    var left = files.length - imgNext;
    return { note: n + ' attached' + (left > 0 ? '. The form had room for only ' + n + '. Add more upload boxes on the form, then press "Attach remaining images" (' + left + ' left)' : ''), ok: left <= 0 && !failed.length, more: left > 0 };
  }

  /* ---------- fill everything ---------- */
  async function fillAll(l, settings, log) {
    var rows = [];
    function add(label, note, ok) { rows.push({ label: label, note: note || 'not found on this form', ok: ok !== undefined ? ok : !!note }); }
    add('Title', fillTitle(l));
    add('Description', fillDescription(l));
    add('Price', fillPrice(l));
    add('Quantity', fillQuantity(l));
    var sku = fillSku(l); add('SKU', sku, sku === null ? false : true);
    add('Tags', fillTags(l));
    var meta = fillMeta(l); if (meta) add('Meta', meta);

    var cats = (C().assignments[l.id] || []).map(function (id) { var c = C().categories.find(function (x) { return x.id === id; }); return c && c.name; }).filter(Boolean);
    var wanted = settings.collections;
    var r = tickCollections(wanted);
    rows.push({ label: 'Collections', ok: !r.missing.length, note: (r.ticked.length ? 'ticked: ' + r.ticked.join(', ') + '. ' : '') + (r.already.length ? 'already ticked: ' + r.already.join(', ') + '. ' : '') + (r.missing.length ? 'NOT FOUND on the form: ' + r.missing.join(', ') : '') });
    if (cats.length) {
      var r2 = tickCollections(cats);
      rows.push({ label: 'Your categories', ok: true, note: (r2.ticked.length ? 'ticked: ' + r2.ticked.join(', ') + '. ' : '') + (r2.missing.length ? 'no matching collection on the form: ' + r2.missing.join(', ') : '') || 'already ticked' });
    }
    add('Shipping method', setShipping(settings.shipping));
    log(rows);
    var im = await attachImages(l, true);
    rows.push({ label: 'Images', note: im.note, ok: im.ok, more: im.more });
    log(rows);
    return rows;
  }

  /* ---------- diagnostics ---------- */
  function capture() {
    var q = new URLSearchParams(location.search).get('p');
    var out = {
      page: location.origin + location.pathname + (q ? '?p=' + q : ''), title: document.title,
      libs: { tinymce: !!window.tinymce, ckeditor: !!window.CKEDITOR, dropzone: !!window.Dropzone, jquery: !!window.jQuery, select2: !!document.querySelector('.select2'), quill: !!document.querySelector('.ql-editor'), contenteditable: document.querySelectorAll('[contenteditable=true]').length },
      iframes: document.querySelectorAll('iframe').length, controls: []
    };
    document.querySelectorAll('input,select,textarea,button').forEach(function (e) {
      if (e.closest('#hn-filler-host')) return;
      var c = { tag: e.tagName.toLowerCase(), type: e.type || '', name: e.name || '', id: e.id || '', cls: String(e.className || '').slice(0, 80), placeholder: e.placeholder || '', label: labelOf(e), own: norm(ownLabel(e)), required: !!e.required, hidden: e.type === 'hidden' || !e.offsetParent };
      if (e.tagName === 'SELECT') { c.multiple = e.multiple; c.options = Array.prototype.slice.call(e.options).map(function (o) { return o.text.trim(); }).slice(0, 80); }
      if (e.type === 'file') { c.accept = e.accept; c.multiple = e.multiple; }
      if (e.tagName === 'BUTTON' || e.type === 'submit') c.text = (e.textContent || e.value || '').trim().slice(0, 40);
      out.controls.push(c);
    });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
    a.download = 'hnprints-form-structure.json'; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- panel ---------- */
  function C() { return window.CATEGORIES_DATA || { categories: [], assignments: {} }; }

  function build() {
    var L = window.LISTINGS_DATA || [];
    var done = new Set(LS.get('hnprints-filled', []));
    var host = document.createElement('div'); host.id = 'hn-filler-host';
    host.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;';
    var root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>' +
      ':host{all:initial}*{box-sizing:border-box;font:14px/1.4 system-ui,Segoe UI,sans-serif}' +
      '.box{width:340px;max-height:92vh;overflow:auto;background:#fff;color:#222;border:2px solid #8a3b12;border-radius:12px;box-shadow:0 8px 30px #0005;padding:12px}' +
      'h3{margin:0;font-size:15px;color:#8a3b12;font-weight:700}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}' +
      'input[type=text],textarea{width:100%;padding:7px 9px;border:1px solid #ccc;border-radius:8px;background:#fff;color:#222}' +
      'textarea{height:84px;resize:vertical}label{display:block;font-size:12px;color:#555;margin:8px 0 2px}' +
      'button{padding:6px 10px;border:1px solid #ccc;border-radius:8px;background:#f6f6f6;color:#222;cursor:pointer}' +
      'button.p{background:#8a3b12;color:#fff;border-color:#8a3b12;font-weight:600}' +
      '.res{border:1px solid #ddd;border-radius:8px;margin-top:4px;max-height:200px;overflow:auto}.res div{padding:5px 8px;cursor:pointer;border-bottom:1px solid #eee}' +
      '.res div.sel,.res div:hover{background:#f3e6dd}.res .d{color:#1e7a3c}' +
      '.sum{margin:8px 0;padding:8px;background:#faf3ee;border-radius:8px;font-size:13px}' +
      '.warn{color:#b3261e;font-size:12px;margin-top:4px}.row{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}' +
      '.rep div{padding:3px 0;border-bottom:1px solid #eee;font-size:13px}.ok{color:#1e7a3c}.bad{color:#b3261e}.hint{font-size:12px;color:#666;margin-top:6px}' +
      'details{margin-top:8px}summary{cursor:pointer;color:#555;font-size:12px}' +
      '</style><div class="box"><div class="top"><h3>hnPrints &rarr; form</h3><button id="min">Hide</button></div>' +
      '<input type="text" id="q" placeholder="Type a piece name or number, press Enter" autocomplete="off">' +
      '<div class="res" id="res"></div><div class="sum" id="sum">No piece selected.</div><div class="warn" id="warn"></div>' +
      '<div class="row"><button class="p" id="fill">Fill form</button><button id="mark">Mark as added</button><button id="more" style="display:none">Attach remaining images</button></div>' +
      '<div class="rep" id="rep"></div><div class="hint">Nothing is saved or submitted for you. Check the form, then click your own Save button.</div>' +
      '<details><summary>Settings</summary><label>Collections to tick (one per line)</label><textarea id="cols"></textarea>' +
      '<label>Shipping method (word to look for)</label><input type="text" id="ship">' +
      '<label><input type="checkbox" id="evo"> Evanston Made pieces only</label>' +
      '<div class="row"><button id="cap">Save form structure file</button></div>' +
      '<div class="hint">The structure file lists the names of the form\'s boxes only. It does not include anything you typed.</div></details></div>';
    document.body.appendChild(host);
    var $ = function (s) { return root.querySelector(s); };

    var settings = LS.get('hnprints-settings', { collections: DEFAULT_COLLECTIONS, shipping: 'USPS', evo: true });
    $('#cols').value = settings.collections.join('\n'); $('#ship').value = settings.shipping; $('#evo').checked = settings.evo;
    function readSettings() {
      settings = { collections: $('#cols').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean), shipping: $('#ship').value.trim(), evo: $('#evo').checked };
      LS.set('hnprints-settings', settings); return settings;
    }

    var results = [], idx = 0, current = null;
    function matches() {
      var q = $('#q').value.trim().toLowerCase();
      return L.filter(function (l) { return (!$('#evo').checked || l.evanstonMade) && (!q || String(l.id) === q || l.title.toLowerCase().indexOf(q) >= 0); }).slice(0, 8);
    }
    function renderRes() {
      results = matches(); if (idx >= results.length) idx = 0;
      var r = $('#res'); r.innerHTML = '';
      results.forEach(function (l, i) {
        var d = document.createElement('div'); d.className = i === idx ? 'sel' : '';
        d.innerHTML = (done.has(l.id) ? '<span class="d">&#10003;</span> ' : '') + '#' + l.id + ' ';
        d.appendChild(document.createTextNode(l.title.split('|')[0].trim()));
        d.onclick = function () { idx = i; choose(l); renderRes(); };
        r.appendChild(d);
      });
      if (!results.length) r.innerHTML = '<div>No match</div>';
    }
    function choose(l) {
      current = l; $('#rep').innerHTML = ''; $('#more').style.display = 'none';
      $('#sum').textContent = '#' + l.id + '  ' + l.title.split('|')[0].trim() + '  ·  $' + l.price + '  ·  ' + l.images.length + ' images';
      var s = readSettings();
      var low = s.collections.some(function (c) { return norm(c) === norm('$25-50'); });
      $('#warn').textContent = (low && l.price > 50) ? 'Heads up: this piece costs $' + l.price + ', but "$25-50" is in your collections list.' : '';
    }
    function showRows(rows) {
      var rep = $('#rep'); rep.innerHTML = '';
      rows.forEach(function (r) {
        var d = document.createElement('div'); d.className = r.ok ? 'ok' : 'bad';
        d.textContent = (r.ok ? '✓ ' : '✗ ') + r.label + ': ' + r.note; rep.appendChild(d);
        if (r.more) $('#more').style.display = '';
      });
    }
    async function doFill() {
      if (!current) { if (results[idx]) choose(results[idx]); }
      if (!current) return;
      var s = readSettings(); choose(current);
      $('#rep').textContent = 'Filling in…';
      try { showRows(await fillAll(current, s, showRows)); } catch (e) { $('#rep').textContent = 'Something went wrong: ' + e.message; }
    }

    $('#q').addEventListener('input', function () { idx = 0; current = null; renderRes(); });
    $('#q').addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'ArrowDown') { idx = Math.min(idx + 1, results.length - 1); renderRes(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { idx = Math.max(idx - 1, 0); renderRes(); e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (results[idx]) { choose(results[idx]); doFill(); } }
    });
    ['keyup', 'keypress'].forEach(function (t) { $('#q').addEventListener(t, function (e) { e.stopPropagation(); }); });
    $('#fill').onclick = doFill;
    $('#mark').onclick = function () { if (!current) return; done.add(current.id); LS.set('hnprints-filled', Array.from(done)); renderRes(); $('#rep').textContent = 'Marked #' + current.id + ' as added.'; };
    $('#more').onclick = async function () {
      if (!current) { $('#rep').textContent = 'Pick a piece first.'; return; }
      var d = document.createElement('div');
      try {
        var im = await attachImages(current, false);
        d.className = im.ok ? 'ok' : 'bad'; d.textContent = 'Images: ' + im.note;
        if (!im.more) $('#more').style.display = 'none';
      } catch (e) { d.className = 'bad'; d.textContent = 'Images: something went wrong (' + e.message + ')'; }
      $('#rep').appendChild(d);
    };
    $('#cap').onclick = capture;
    $('#evo').addEventListener('change', function () { readSettings(); renderRes(); });
    $('#min').onclick = function () { var b = $('.box'); var hide = b.style.display !== 'none'; b.style.display = hide ? 'none' : ''; $('#min').textContent = hide ? 'Show' : 'Hide'; };

    renderRes(); $('#q').focus();
    window.__hnFiller = { toggle: function () { host.style.display = host.style.display === 'none' ? '' : 'none'; if (host.style.display !== 'none') $('#q').focus(); } };
  }

  (async function init() {
    try {
      if (!window.LISTINGS_DATA) await loadScript(BASE + 'listings.js?v=' + V);
      if (!window.CATEGORIES_DATA) await loadScript(BASE + 'categories.js?v=' + V);
      build();
    } catch (e) {
      alert('hnPrints filler could not start: ' + e.message + '\nIf the page blocks outside scripts, tell Claude and we will use another method.');
    }
  })();
})();
