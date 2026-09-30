(function(){
  var GROUPS = [
    { mode: 'practice', title: 'Quiz', description: 'Pick an answer and see whether it’s right, plus the explanation, right away.' },
    { mode: 'exam', title: 'Mock Test', description: 'Answer every question, then submit the whole thing to see your final score and a breakdown by domain.' }
  ];

  function buildCard(quiz){
    var card = document.createElement('div');
    card.className = 'quiz-card';

    var head = document.createElement('div');
    head.className = 'quiz-card-head';
    var h3 = document.createElement('h3');
    h3.textContent = quiz.title;
    var badge = document.createElement('span');
    badge.className = 'quiz-badge';
    badge.textContent = quiz.badge || '';
    head.appendChild(h3);
    head.appendChild(badge);

    var p = document.createElement('p');
    p.textContent = quiz.description || '';

    var a = document.createElement('a');
    a.className = 'quiz-start';
    a.href = '../../core/quiz.html?cert=' + encodeURIComponent(window.CERT_ID || '') + '&quiz=' + encodeURIComponent(quiz.id);
    a.textContent = 'Start ' + quiz.title + ' →';

    card.appendChild(head);
    card.appendChild(p);
    card.appendChild(a);
    return card;
  }

  function renderGroup(group, quizzes, host){
    if (!quizzes.length) return;
    var section = document.createElement('div');
    section.className = 'quiz-group';

    var h3 = document.createElement('h3');
    h3.className = 'quiz-group-title';
    h3.textContent = group.title;
    var desc = document.createElement('p');
    desc.className = 'quiz-group-desc';
    desc.textContent = group.description;

    var grid = document.createElement('div');
    grid.className = 'quiz-grid';
    quizzes.forEach(function(quiz){ grid.appendChild(buildCard(quiz)); });

    section.appendChild(h3);
    section.appendChild(desc);
    section.appendChild(grid);
    host.appendChild(section);
  }

  function render(manifest, host){
    host.innerHTML = '';
    var quizzes = manifest.quizzes || [];
    GROUPS.forEach(function(group){
      var matching = quizzes.filter(function(q){ return (q.mode === 'exam') === (group.mode === 'exam'); });
      renderGroup(group, matching, host);
    });
  }

  function start(){
    var host = document.getElementById('quizCards');
    if (!host || !window.CERT_ID) return;
    fetch('quiz/quizzes.json')
      .then(function(res){ if (!res.ok) throw new Error('manifest'); return res.json(); })
      .then(function(manifest){ render(manifest, host); })
      .catch(function(){
        host.innerHTML = '';
        var p = document.createElement('p');
        p.style.color = 'var(--muted)';
        p.textContent = 'Quizzes could not be loaded.';
        host.appendChild(p);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
