(function(){
  function showNotFound(message){
    var root = document.getElementById('quizRoot');
    root.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'wrap';
    var card = document.createElement('div');
    card.className = 'card';
    card.style.margin = '60px auto';
    card.style.maxWidth = '440px';
    card.style.textAlign = 'center';
    var h = document.createElement('h2');
    h.textContent = 'Quiz not found';
    var p = document.createElement('p');
    p.style.color = 'var(--muted)';
    p.textContent = message;
    var a = document.createElement('a');
    a.href = '../index.html';
    a.textContent = '← Back to Cert Prep';
    a.style.display = 'inline-block';
    a.style.marginTop = '12px';
    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(a);
    wrap.appendChild(card);
    root.appendChild(wrap);
  }

  function renderQuiz(manifest, quiz, questions){
    var certTitle = window.CERT_NAV ? window.CERT_NAV.title : 'Cert Prep';
    document.title = quiz.title + ' — ' + certTitle;

    var tplId = quiz.mode === 'exam' ? 'tpl-exam' : 'tpl-practice';
    var tpl = document.getElementById(tplId);
    var root = document.getElementById('quizRoot');
    root.innerHTML = '';
    root.appendChild(tpl.content.cloneNode(true));

    var titleEl = root.querySelector('[data-field="title"]');
    if (titleEl) titleEl.textContent = quiz.title;

    if (quiz.mode !== 'exam') {
      var kicker = root.querySelector('[data-field="kicker"]');
      if (kicker) kicker.textContent = certTitle;
      var desc = root.querySelector('[data-field="description"]');
      if (desc) desc.textContent = quiz.description || '';
      var footer = root.querySelector('[data-field="footer"]');
      if (footer) footer.textContent = certTitle + ' Practice Quiz · For self-study purposes only';
    }

    var config = {
      mode: quiz.mode,
      title: quiz.title,
      randomSubsetSize: quiz.randomSubsetSize,
      pageSize: quiz.pageSize,
      domainList: Object.keys(manifest.domains || {}),
      domainNames: manifest.domains || {}
    };

    window.QuizEngine.run(config, questions);
  }

  function start(){
    var params = new URLSearchParams(location.search);
    var certId = window.CERT_ID;
    var quizId = params.get('quiz') || '';

    if (!certId) { showNotFound('No certification specified.'); return; }
    if (!/^[a-z0-9-]+$/.test(quizId)) { showNotFound('No quiz specified.'); return; }

    fetch('../certs/' + certId + '/quiz/quizzes.json')
      .then(function(res){ if (!res.ok) throw new Error('manifest'); return res.json(); })
      .then(function(manifest){
        var quiz = null;
        (manifest.quizzes || []).forEach(function(q){ if (q.id === quizId) quiz = q; });
        if (!quiz) { showNotFound('No quiz named "' + quizId + '" for this certification.'); return null; }
        return fetch('../certs/' + certId + '/quiz/' + quiz.file)
          .then(function(res){ if (!res.ok) throw new Error('quiz file'); return res.json(); })
          .then(function(questions){ renderQuiz(manifest, quiz, questions); });
      })
      .catch(function(){ showNotFound('Could not load this quiz.'); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
