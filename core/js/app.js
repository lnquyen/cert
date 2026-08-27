(function(){
  var GLOSSARY = window.CERT_GLOSSARY || {};

  var terms = Object.keys(GLOSSARY).sort(function(a,b){ return b.length - a.length; });
  var escaped = terms.map(function(t){ return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
  var GLOSSARY_RE = terms.length ? new RegExp('\\b(' + escaped.join('|') + ')\\b', 'gi') : null;

  function shouldSkip(el){
    if(!el) return false;
    return !!el.closest('.term, .vi-icon, script, style');
  }

  function wrapTerms(root){
    if(!GLOSSARY_RE) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node){
        if(!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if(shouldSkip(node.parentElement)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    var n;
    while((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(function(node){
      var text = node.nodeValue;
      GLOSSARY_RE.lastIndex = 0;
      if(!GLOSSARY_RE.test(text)) return;
      GLOSSARY_RE.lastIndex = 0;

      var frag = document.createDocumentFragment();
      var lastIndex = 0;
      var m;
      while((m = GLOSSARY_RE.exec(text))){
        var word = m[0];
        var key = word.toLowerCase();
        if(m.index > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
        var span = document.createElement('span');
        span.className = 'term';
        span.textContent = word;
        span.setAttribute('data-vi', GLOSSARY[key] || '');
        frag.appendChild(span);
        lastIndex = m.index + word.length;
        if(GLOSSARY_RE.lastIndex === m.index) GLOSSARY_RE.lastIndex++;
      }
      if(lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function findViUnit(icon){
    var next = icon.nextElementSibling;
    if(next && next.classList && next.classList.contains('glossary-zone')) return next;
    return icon.closest('.glossary-zone') || icon.parentElement;
  }

  function wireViIcons(){
    document.querySelectorAll('.vi-icon[data-vi]').forEach(function(icon){
      if(icon._viWired) return;
      icon._viWired = true;
      icon.setAttribute('role','button');
      icon.setAttribute('tabindex','0');
      icon.setAttribute('aria-label','Toggle Vietnamese translation');
      icon.title = 'Click to show/hide Vietnamese translation';
      function toggleVi(){
        var box = icon._viBox;
        if(!box){
          var unit = findViUnit(icon);
          box = document.createElement('div');
          box.className = 'vi-inline';
          box.textContent = icon.getAttribute('data-vi');
          unit.appendChild(box);
          icon._viBox = box;
        }
        var showing = box.classList.toggle('show');
        icon.classList.toggle('active', showing);
      }
      icon.addEventListener('click', toggleVi);
      icon.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggleVi(); }
      });
    });
  }

  function ensureTermTooltip(){
    var el = document.getElementById('viTooltip');
    if(!el){
      el = document.createElement('div');
      el.id = 'viTooltip';
      el.setAttribute('role', 'tooltip');
      document.body.appendChild(el);
    }
    return el;
  }

  var termTooltipShownAt = 0;

  function hideTermTooltip(){
    var el = document.getElementById('viTooltip');
    if(el) el.classList.remove('show');
    document.querySelectorAll('.term.term-open').forEach(function(t){ t.classList.remove('term-open'); });
  }

  function hideTermTooltipIfSettled(){
    // ignore scroll/resize events fired as a side effect of just opening the tooltip
    // (e.g. the browser auto-scrolling a focused element into view, which can
    // dispatch its 'scroll' event ~200ms after the fact)
    if(Date.now() - termTooltipShownAt < 500) return;
    hideTermTooltip();
  }

  function showTermTooltip(termEl){
    var text = termEl.getAttribute('data-vi');
    if(!text) return;
    var el = ensureTermTooltip();
    el.textContent = text;
    el.classList.add('show');
    termTooltipShownAt = Date.now();

    document.querySelectorAll('.term.term-open').forEach(function(t){ if(t !== termEl) t.classList.remove('term-open'); });
    termEl.classList.add('term-open');

    var margin = 10;
    var rect = termEl.getBoundingClientRect();
    var tw = el.offsetWidth, th = el.offsetHeight;
    var left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));
    var top = rect.top - th - 10;
    if(top < margin){ top = rect.bottom + 10; }
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }

  function wireTermTooltips(){
    document.querySelectorAll('.term[data-vi]').forEach(function(term){
      if(term._termWired) return;
      term._termWired = true;
      term.setAttribute('role', 'button');
      term.setAttribute('tabindex', '0');
      term.setAttribute('aria-label', 'Show Vietnamese translation');
      term.addEventListener('click', function(e){
        e.stopPropagation();
        if(term.classList.contains('term-open')) hideTermTooltip();
        else showTermTooltip(term);
      });
      term.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          if(term.classList.contains('term-open')) hideTermTooltip();
          else showTermTooltip(term);
        } else if(e.key === 'Escape'){
          hideTermTooltip();
        }
      });
    });
  }

  document.addEventListener('click', hideTermTooltip);
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') hideTermTooltip(); });
  window.addEventListener('scroll', hideTermTooltipIfSettled, true);
  window.addEventListener('resize', hideTermTooltipIfSettled);

  function activeTabStorageKey(){
    return 'cert-active-tab:' + (window.CERT_ID || 'default');
  }

  function activateTab(id, opts){
    opts = opts || {};
    var panel = document.getElementById('tab-' + id);
    if(!panel) return;
    hideTermTooltip();
    document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.toggle('active', p.id === 'tab-' + id); });
    var activeBtn = null;
    document.querySelectorAll('.tab-btn').forEach(function(b){
      var isActive = b.getAttribute('data-tab') === id;
      b.classList.toggle('active', isActive);
      if(isActive) activeBtn = b;
    });
    try{ localStorage.setItem(activeTabStorageKey(), id); }catch(e){}

    var navToggleLabel = document.getElementById('navToggleLabel');
    var navToggle = document.getElementById('navToggle');
    var tocNav = document.getElementById('tocNav');
    if(navToggleLabel && activeBtn) navToggleLabel.textContent = activeBtn.getAttribute('data-label') || activeBtn.textContent;
    if(tocNav) tocNav.classList.remove('open');
    if(navToggle) navToggle.setAttribute('aria-expanded', 'false');

    if(!opts.silent){
      var wrap = document.querySelector('.wrap');
      if(wrap) wrap.scrollIntoView({behavior:'smooth', block:'start'});
    }
  }
  window.certActivateTab = activateTab;

  // Nav buttons and the mobile menu toggle are rendered and wired by
  // core/js/site-nav.js (which must run before this script); initTabs()
  // only decides which tab-panel to show first.
  function initTabs(){
    var initial = 'plan';
    var hash = location.hash.replace('#', '');
    if(hash){
      if(document.getElementById('tab-' + hash)){
        initial = hash;
      } else {
        var m = hash.match(/^(d[1-5])-p/);
        if(m) initial = m[1];
      }
    } else {
      try{ var saved = localStorage.getItem(activeTabStorageKey()); if(saved && document.getElementById('tab-' + saved)) initial = saved; }catch(e){}
    }
    activateTab(initial, {silent:true});
    if(hash){
      setTimeout(function(){
        var el = document.getElementById(hash);
        if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
      }, 60);
    }
  }

  // badges/links that point at #dN-pM must switch to that domain's tab first
  document.addEventListener('click', function(e){
    var a = e.target.closest('a[href^="#d"]');
    if(!a) return;
    var hash = a.getAttribute('href').replace('#', '');
    var m = hash.match(/^(d[1-5])/);
    if(m) activateTab(m[1], {silent:true});
  }, true);

  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.glossary-zone').forEach(function(el){ wrapTerms(el); });

    wireViIcons();
    wireTermTooltips();
    initTabs();
  });
})();
