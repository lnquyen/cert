(function(){
  function render(){
    var nav = window.CERT_NAV;
    var host = document.getElementById('siteNav');
    if (!nav || !host) return;

    var indexPath = window.CERT_INDEX_PATH || '';
    var activeOverride = window.CERT_ACTIVE_TAB || null;
    var tabs = nav.tabs || [];

    var initialLabel = '';
    var tabsHtml = tabs.map(function(tab){
      var isLocal = !!document.getElementById('tab-' + tab.id);
      var label = tab.dataLabel || tab.label;
      var isActive = activeOverride ? tab.id === activeOverride : false;
      if (isActive) initialLabel = label;
      var style = tab.colorVar ? ' style="--tab-c:var(--' + tab.colorVar + ')"' : '';
      var activeClass = isActive ? ' active' : '';

      if (isLocal) {
        return '<button type="button" class="tab-btn' + activeClass + '" data-tab="' + tab.id + '" data-label="' + label + '"' + style + '>' + tab.label + '</button>';
      }
      return '<a class="tab-btn' + activeClass + '" data-tab="' + tab.id + '" data-label="' + label + '" href="' + indexPath + 'index.html#' + tab.id + '"' + style + '>' + tab.label + '</a>';
    }).join('');

    if (!initialLabel && tabs.length) initialLabel = tabs[0].dataLabel || tabs[0].label;

    host.innerHTML =
      '<div class="inner">' +
        '<div>' +
          '<h1>' + nav.title + '</h1>' +
          '<div class="sub">' + nav.subtitle + '</div>' +
        '</div>' +
        '<div class="nav-toggle-group">' +
          '<span class="current-tab-label" id="navToggleLabel">' + initialLabel + '</span>' +
          '<button type="button" class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="tocNav">' +
            '<span class="hamburger">☰</span> Menu' +
          '</button>' +
        '</div>' +
        '<nav class="toc" id="tocNav">' +
          tabsHtml +
          '<label class="hint-toggle"><input type="checkbox" class="theme-toggle-input"> 🌙 Dark</label>' +
        '</nav>' +
      '</div>';

    var navToggle = document.getElementById('navToggle');
    var tocNav = document.getElementById('tocNav');
    if (navToggle && tocNav) {
      navToggle.addEventListener('click', function(){
        var open = tocNav.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    host.querySelectorAll('button.tab-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (window.certActivateTab) window.certActivateTab(btn.getAttribute('data-tab'));
      });
    });

    document.documentElement.style.setProperty('--site-nav-h', host.offsetHeight + 'px');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
