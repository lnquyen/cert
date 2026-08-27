(function(){
  function getStored(){
    try{ return localStorage.getItem('cert-theme'); }catch(e){ return null; }
  }
  function systemPrefersDark(){
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function isDark(){
    var t = getStored();
    if(t === 'dark') return true;
    if(t === 'light') return false;
    return systemPrefersDark();
  }
  function syncCheckboxes(dark){
    document.querySelectorAll('.theme-toggle-input').forEach(function(cb){ cb.checked = dark; });
  }
  function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    try{ localStorage.setItem('cert-theme', theme); }catch(e){}
    syncCheckboxes(theme === 'dark');
  }

  document.addEventListener('DOMContentLoaded', function(){
    syncCheckboxes(isDark());
    document.querySelectorAll('.theme-toggle-input').forEach(function(cb){
      cb.addEventListener('change', function(){
        applyTheme(cb.checked ? 'dark' : 'light');
      });
    });
  });
})();
