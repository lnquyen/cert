// Client-side access-code gate (MVP). Deters casual visitors only: the site is
// static, so anyone reading the repo/JS can bypass it. Not real security.
//
// To change the code:  printf 'NEW-CODE' | sha256sum   -> paste into CODE_HASH.
(function(){
  var CODE_HASH = '7caf195ee161d8c61185ea4764f62320e5bd0c7d065bd22b53f46c30a83f23ee';
  var STORE_KEY = 'cert-access:' + CODE_HASH.slice(0, 12);

  function unlocked(){
    try{ return localStorage.getItem(STORE_KEY) === '1'; }catch(e){ return false; }
  }
  if (unlocked()) return;

  // hide everything until the code is accepted (no flash of protected content)
  var hide = document.createElement('style');
  hide.textContent = 'body>*:not(#accessGate){display:none !important;}';
  document.head.appendChild(hide);

  function sha256Hex(text){
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function(buf){
      return Array.prototype.map.call(new Uint8Array(buf), function(b){
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    });
  }

  function mount(){
    var gate = document.createElement('div');
    gate.id = 'accessGate';
    gate.setAttribute('style', 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:18px;background:#fafafa;color:#18181b;font-family:Inter,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;');
    gate.innerHTML =
      '<form style="width:100%;max-width:360px;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,.06);">' +
        '<h1 style="margin:0 0 6px;font-size:1.25rem;">Enter access code</h1>' +
        '<p style="margin:0 0 16px;color:#71717a;font-size:.9rem;">This site is limited to invited learners.</p>' +
        '<input id="accessInput" type="text" autocomplete="off" autofocus placeholder="Access code" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d4d4d8;border-radius:8px;font:inherit;">' +
        '<p id="accessErr" role="alert" style="min-height:1.2em;margin:8px 0;color:#dc2626;font-size:.85rem;"></p>' +
        '<button type="submit" style="width:100%;padding:10px;border:0;border-radius:8px;background:#d97757;color:#fff;font:inherit;font-weight:600;cursor:pointer;">Unlock</button>' +
      '</form>';
    document.body.appendChild(gate);

    var input = gate.querySelector('#accessInput');
    var err = gate.querySelector('#accessErr');
    gate.querySelector('form').addEventListener('submit', function(e){
      e.preventDefault();
      if (!window.crypto || !crypto.subtle) { err.textContent = 'Open this site over HTTPS to unlock.'; return; }
      sha256Hex(input.value.trim()).then(function(hex){
        if (hex === CODE_HASH) {
          try{ localStorage.setItem(STORE_KEY, '1'); }catch(e){}
          hide.remove();
          gate.remove();
        } else {
          err.textContent = 'Incorrect access code.';
          input.select();
        }
      });
    });
    input.focus();
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
