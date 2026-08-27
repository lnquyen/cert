(function(){
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function groupByPrinciple(questions){
    var byPid = {};
    questions.forEach(function(q){
      (q.principles || []).forEach(function(pid){
        (byPid[pid] = byPid[pid] || []).push(q);
      });
    });
    return byPid;
  }

  // The practice-exam (77-question) bank and the interactive-quiz (147-question)
  // bank share a lot of the same underlying questions with shuffled option order
  // and light rewording. Compare normalized bigrams so near-identical questions
  // cluster together instead of showing up twice under "Related questions".
  function normalizeForCompare(text){
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function bigrams(text){
    var s = normalizeForCompare(text);
    var grams = [];
    for (var i = 0; i < s.length - 1; i++) grams.push(s.substr(i, 2));
    return grams;
  }

  function diceSimilarity(a, b){
    var ga = bigrams(a), gb = bigrams(b);
    if (!ga.length || !gb.length) return ga.length === gb.length ? 1 : 0;
    var counts = {};
    ga.forEach(function(g){ counts[g] = (counts[g] || 0) + 1; });
    var intersection = 0;
    gb.forEach(function(g){ if (counts[g] > 0) { intersection++; counts[g]--; } });
    return (2 * intersection) / (ga.length + gb.length);
  }

  var DUPLICATE_SIMILARITY_THRESHOLD = 0.85;

  function clusterDuplicates(qs){
    var parent = qs.map(function(_, i){ return i; });
    function find(i){ return parent[i] === i ? i : (parent[i] = find(parent[i])); }
    function union(i, j){ parent[find(i)] = find(j); }

    for (var i = 0; i < qs.length; i++){
      for (var j = i + 1; j < qs.length; j++){
        if (diceSimilarity(qs[i].question, qs[j].question) >= DUPLICATE_SIMILARITY_THRESHOLD) union(i, j);
      }
    }

    var groups = {};
    qs.forEach(function(q, i){
      var root = find(i);
      (groups[root] = groups[root] || []).push(q);
    });

    return Object.keys(groups).map(function(root){
      var members = groups[root];
      var primary = members.filter(function(q){ return q.quizFile.indexOf('practice-exam') > -1; })[0] || members[0];
      var sources = members.slice().sort(function(a, b){
        var aExam = a.quizFile.indexOf('practice-exam') > -1;
        var bExam = b.quizFile.indexOf('practice-exam') > -1;
        if (aExam !== bExam) return aExam ? -1 : 1;
        var aNum = parseInt((a.quizLabel.match(/(\d+)$/) || [0, 0])[1], 10);
        var bNum = parseInt((b.quizLabel.match(/(\d+)$/) || [0, 0])[1], 10);
        return aNum - bNum;
      });
      return { primary: primary, sources: sources };
    });
  }

  function copyTextToClipboard(text, onDone){
    function legacyCopy(){
      var ok = false;
      try{
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch(e){ ok = false; }
      onDone(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function(){ onDone(true); }, legacyCopy);
    } else {
      legacyCopy();
    }
  }

  function makeCopyButton(text){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rq-copy-btn';
    btn.textContent = '📋 Copy';
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      copyTextToClipboard(text, function(ok){
        btn.textContent = ok ? '✓ Copied' : '✗ Failed';
        setTimeout(function(){ btn.textContent = '📋 Copy'; }, 1300);
      });
    });
    return btn;
  }

  function makeViButton(text, onToggle){
    var wrap = document.createElement('span');
    wrap.className = 'rq-vi-wrap';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rq-vi-btn';
    btn.innerHTML = '<svg class="flag-vn" viewBox="0 0 30 20" width="16" height="11" aria-hidden="true"><rect width="30" height="20" fill="#da251d"/><polygon points="15,4 16.76,9.53 22.57,9.53 17.9,13 19.66,18.53 15,15.06 10.34,18.53 12.1,13 7.43,9.53 13.24,9.53" fill="#ffcd00"/></svg> VN';

    var box = document.createElement('div');
    box.className = 'rq-vi-box';
    box.textContent = text;

    btn.addEventListener('click', function(){
      var showing = box.classList.toggle('show');
      btn.classList.toggle('active', showing);
      if (onToggle) onToggle(showing);
    });

    wrap.appendChild(btn);
    wrap.appendChild(box);
    return wrap;
  }

  function renderQuestionItem(cluster){
    var q = cluster.primary;
    var sources = cluster.sources;
    var letters = Object.keys(q.options).sort();
    var isSetA = q.quizFile.indexOf('practice-exam') > -1;
    var focusId = q.uid.replace(/^b\d+-/, '');

    var viSetA = isSetA ? (window.VI_TRANSLATIONS_A || {})[focusId] : null;
    var viSetB = !isSetA ? (window.VI_TRANSLATIONS_B || {})[focusId] : null;
    var questionVi = isSetA ? (viSetA ? viSetA.q : '') : (viSetB ? viSetB.q : '');
    var explanationVi = viSetA ? viSetA.e : '';
    var optionsVi = isSetA ? (viSetA ? viSetA.o : null) : (viSetB ? viSetB.o : null);

    var explainText = q.explanation ? q.explanation : ('Correct answer: ' + q.correct + '.');

    var optsHtml = letters.map(function(letter){
      var optVi = optionsVi && optionsVi[letter];
      var optViHtml = optVi ? '<div class="rq-opt-vi">' + escapeHtml(optVi) + '</div>' : '';
      return '<li data-letter="' + letter + '">' + escapeHtml(letter) + '. ' + escapeHtml(q.options[letter]) + optViHtml + '</li>';
    }).join('');

    var item = document.createElement('div');
    item.className = 'related-q-item';
    item.dataset.correct = q.correct;

    var qp = document.createElement('p');
    qp.className = 'rq-q';
    qp.textContent = q.question;
    var srcSpan = document.createElement('span');
    srcSpan.className = 'rq-src';
    srcSpan.textContent = sources.map(function(s){ return s.quizLabel; }).join(', ');
    qp.appendChild(srcSpan);
    if (questionVi) {
      qp.appendChild(makeViButton(questionVi, function(showing){
        item.querySelectorAll('.rq-opt-vi').forEach(function(el){ el.classList.toggle('show', showing); });
      }));
    }
    var copyText = q.question + '\n\n' + letters.map(function(letter){
      return letter + '. ' + q.options[letter];
    }).join('\n');
    qp.appendChild(makeCopyButton(copyText));
    item.appendChild(qp);

    var ul = document.createElement('ul');
    ul.className = 'rq-opts';
    ul.innerHTML = optsHtml;
    item.appendChild(ul);

    var explainP = document.createElement('p');
    explainP.className = 'rq-explain';
    explainP.textContent = explainText;
    if (explanationVi) explainP.appendChild(makeViButton(explanationVi));
    item.appendChild(explainP);

    var revealBtn = document.createElement('button');
    revealBtn.type = 'button';
    revealBtn.className = 'rq-reveal';
    revealBtn.textContent = 'Show answer';
    revealBtn.addEventListener('click', function(){
      var li = ul.querySelector('li[data-letter="' + q.correct + '"]');
      if (li) li.classList.add('correct');
      explainP.classList.add('show');
      revealBtn.disabled = true;
      revealBtn.textContent = 'Answer shown';
    });
    item.appendChild(revealBtn);

    sources.forEach(function(src, idx){
      var srcFocusId = src.uid.replace(/^b\d+-/, '');
      if (idx > 0) {
        var sep = document.createElement('span');
        sep.style.fontSize = '0.78rem';
        sep.style.margin = '0 4px';
        sep.textContent = '·';
        item.appendChild(sep);
      }
      var openLink = document.createElement('a');
      openLink.href = src.quizFile + '?focus=' + encodeURIComponent(srcFocusId);
      openLink.target = '_blank';
      openLink.rel = 'noopener';
      // include the quiz label (not just the quiz name) so multiple sources
      // from the same quiz file — e.g. two Interactive Quiz duplicates — are
      // still distinguishable from one another
      openLink.textContent = 'Open in ' + src.quizLabel + ' ↗';
      if (idx === 0) openLink.style.marginLeft = '8px';
      openLink.style.fontSize = '0.78rem';
      item.appendChild(openLink);
    });

    return item;
  }

  function renderAll(){
    var questions = window.CERT_QUESTIONS || [];
    if (!questions.length) return;
    var byPid = groupByPrinciple(questions);

    document.querySelectorAll('.principle[id]').forEach(function(principleEl){
      var pid = principleEl.id;
      var qs = byPid[pid] || [];

      if (!qs.length) {
        var empty = document.createElement('div');
        empty.className = 'related-q-empty';
        empty.textContent = 'No linked practice questions yet.';
        principleEl.appendChild(empty);
        return;
      }

      var clusters = clusterDuplicates(qs);

      var details = document.createElement('details');
      details.className = 'related-q';

      var summary = document.createElement('summary');
      summary.innerHTML = 'Related questions <span class="count">' + clusters.length + '</span>';
      details.appendChild(summary);

      var body = document.createElement('div');
      body.className = 'related-q-body';
      details.appendChild(body);

      var built = false;
      details.addEventListener('toggle', function(){
        if (details.open && !built) {
          clusters.forEach(function(c){ body.appendChild(renderQuestionItem(c)); });
          built = true;
        }
      });

      principleEl.appendChild(details);
    });
  }

  document.addEventListener('DOMContentLoaded', renderAll);
})();
