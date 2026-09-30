(function(){
  var FIXED_TABS = [
    { id: 'learn',  label: 'How to learn', hidden: true },  // hidden for MVP — enable in V2.0
    { id: 'lesson', label: 'Lesson',       hidden: true },  // hidden for MVP — enable in V2.0
    { id: 'quiz',   label: 'Quiz' },
    { id: 'tip',    label: 'Tip',          hidden: true }   // hidden for MVP — enable in V2.0
  ];

  var VISIBLE_TABS = FIXED_TABS.filter(function(t){ return !t.hidden; });
  window.certTabVisible = function(id){
    return VISIBLE_TABS.some(function(t){ return t.id === id; });
  };
  window.certDefaultTab = VISIBLE_TABS.length ? VISIBLE_TABS[0].id : 'quiz';

  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5"/><path d="M19 10.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9.5"/><path d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.473 7.5 7.5 0 0 0 9.473 9.473Z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
  };

  function render(){
    var nav = window.CERT_NAV;
    var host = document.getElementById('siteNav');
    if (!nav || !host) return;

    var indexPath = window.CERT_INDEX_PATH || '';
    var homePath = indexPath + '../../index.html';
    var activeOverride = window.CERT_ACTIVE_TAB || null;
    var tabs = VISIBLE_TABS;

    var initialLabel = '';
    var tabsHtml = tabs.map(function(tab){
      var isLocal = !!document.getElementById('tab-' + tab.id);
      var label = tab.dataLabel || tab.label;
      var isActive = activeOverride ? tab.id === activeOverride : false;
      if (isActive) initialLabel = label;
      var activeClass = isActive ? ' active' : '';

      if (isLocal) {
        return '<button type="button" class="tab-btn' + activeClass + '" data-tab="' + tab.id + '" data-label="' + label + '">' + tab.label + '</button>';
      }
      return '<a class="tab-btn' + activeClass + '" data-tab="' + tab.id + '" data-label="' + label + '" href="' + indexPath + 'index.html#' + tab.id + '">' + tab.label + '</a>';
    }).join('');

    if (!initialLabel && tabs.length) initialLabel = tabs[0].dataLabel || tabs[0].label;

    host.innerHTML =
      '<div class="inner">' +
        '<div class="nav-title">' +
          '<div class="nav-title-row">' +
            '<a class="home-link" href="' + homePath + '" title="Back to Cert Prep home">' + ICONS.home + '</a>' +
            '<h1>' + nav.title + '</h1>' +
          '</div>' +
          '<div class="sub">' + nav.subtitle + '</div>' +
        '</div>' +
        '<div class="nav-toggle-group">' +
          '<span class="current-tab-label" id="navToggleLabel">' + initialLabel + '</span>' +
          '<button type="button" class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="tocNav">' +
            '<span class="hamburger">' + ICONS.menu + '</span> Menu' +
          '</button>' +
        '</div>' +
        '<nav class="toc" id="tocNav">' +
          tabsHtml +
          '<label class="theme-switch" title="Toggle dark mode">' +
            '<span class="switch">' +
              '<input type="checkbox" class="theme-toggle-input">' +
              '<span class="slider">' +
                '<span class="knob">' +
                  '<span class="icon icon-sun">' + ICONS.sun + '</span>' +
                  '<span class="icon icon-moon">' + ICONS.moon + '</span>' +
                '</span>' +
              '</span>' +
            '</span>' +
          '</label>' +
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
