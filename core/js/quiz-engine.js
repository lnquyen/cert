(function(){
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

  function shuffle(arr){
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function escapeHtml(str){
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function wireCopyAndViDelegation(container){
    container.addEventListener('click', function(e){
      var copyBtn = e.target.closest('.copy-btn');
      if (copyBtn && copyBtn.dataset.copy !== undefined) {
        copyTextToClipboard(copyBtn.dataset.copy, function(ok){
          copyBtn.textContent = ok ? '✓ Copied' : '✗ Failed';
          setTimeout(function(){ copyBtn.textContent = '📋 Copy'; }, 1300);
        });
        return;
      }
      var viBtn = e.target.closest('.vi-btn');
      if (!viBtn || !viBtn.dataset.target) return;
      var box = document.getElementById(viBtn.dataset.target);
      if (!box) return;
      var showing = box.classList.toggle('show');
      viBtn.classList.toggle('active', showing);
      if (viBtn.dataset.scope === 'question') {
        var card = viBtn.closest('.qcard');
        if (card) card.querySelectorAll('.opt-vi').forEach(function(el){ el.classList.toggle('show', showing); });
      }
    });
  }

  function runPractice(config, questions){
    var randomSubsetSize = config.randomSubsetSize || 50;

    var ALL_QUESTIONS = questions.map(function(q){
      var vi = q.vi || {};
      return {
        number: q.number,
        question: q.question,
        options: q.options,
        answer: q.correct,
        explanation: q.explanation || '',
        question_vi: vi.q || '',
        explanation_vi: vi.e || '',
        options_vi: vi.o || {}
      };
    });

    document.getElementById('total-q-count').textContent = ALL_QUESTIONS.length;

    var activeSet = [];
    var currentIndex = 0;
    var answers = {};
    var selectedMode = 'all';

    var startScreen = document.getElementById('start-screen');
    var quizScreen = document.getElementById('quiz-screen');
    var resultsScreen = document.getElementById('results-screen');

    var modeBtns = document.querySelectorAll('.mode-btn');
    var customRow = document.getElementById('custom-range-row');
    var rangeStart = document.getElementById('range-start');
    var rangeEnd = document.getElementById('range-end');
    rangeEnd.value = ALL_QUESTIONS.length;
    rangeEnd.max = ALL_QUESTIONS.length;
    rangeStart.max = ALL_QUESTIONS.length;

    var randomBtn = document.querySelector('.mode-btn[data-mode="random50"]');
    if (randomBtn) randomBtn.textContent = 'Random ' + randomSubsetSize;

    modeBtns.forEach(function(btn){
      btn.addEventListener('click', function(){
        modeBtns.forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        selectedMode = btn.dataset.mode;
        customRow.style.display = selectedMode === 'custom' ? 'flex' : 'none';
      });
    });

    document.getElementById('start-btn').addEventListener('click', function(){
      if (selectedMode === 'all') {
        activeSet = ALL_QUESTIONS.slice();
      } else if (selectedMode === 'random20') {
        activeSet = shuffle(ALL_QUESTIONS).slice(0, Math.min(20, ALL_QUESTIONS.length));
      } else if (selectedMode === 'random50') {
        activeSet = shuffle(ALL_QUESTIONS).slice(0, Math.min(randomSubsetSize, ALL_QUESTIONS.length));
      } else if (selectedMode === 'custom') {
        var s = parseInt(rangeStart.value, 10) || 1;
        var e = parseInt(rangeEnd.value, 10) || ALL_QUESTIONS.length;
        if (s > e) { var tmp = s; s = e; e = tmp; }
        s = Math.max(1, s);
        e = Math.min(ALL_QUESTIONS.length, e);
        activeSet = ALL_QUESTIONS.filter(function(q){ return q.number >= s && q.number <= e; });
        if (activeSet.length === 0) activeSet = ALL_QUESTIONS.slice();
      }
      currentIndex = 0;
      answers = {};
      startScreen.style.display = 'none';
      resultsScreen.style.display = 'none';
      quizScreen.style.display = 'block';
      renderQuestion();
    });

    var qnumBadge = document.getElementById('qnum-badge');
    var questionText = document.getElementById('question-text');
    var optionsContainer = document.getElementById('options-container');
    var feedbackBanner = document.getElementById('feedback-banner');
    var hintBlock = document.getElementById('hint-block');
    var hintLabel = document.getElementById('hint-label');
    var hintText = document.getElementById('hint-text');
    var qViBtn = document.getElementById('q-vi-btn');
    var qViBox = document.getElementById('q-vi-box');
    var qCopyBtn = document.getElementById('q-copy-btn');
    var hintViBtn = document.getElementById('hint-vi-btn');
    var hintViBox = document.getElementById('hint-vi-box');
    var prevBtn = document.getElementById('prev-btn');
    var nextBtn = document.getElementById('next-btn');
    var progressText = document.getElementById('progress-text');
    var progressPct = document.getElementById('progress-pct');
    var progressFill = document.getElementById('progress-fill');
    var scoreCorrect = document.getElementById('score-correct');
    var scoreWrong = document.getElementById('score-wrong');

    function renderQuestion(){
      var q = activeSet[currentIndex];
      qnumBadge.textContent = 'QUESTION ' + q.number;
      questionText.textContent = q.question;
      optionsContainer.innerHTML = '';
      feedbackBanner.className = 'feedback-banner';
      feedbackBanner.textContent = '';
      if (hintBlock) {
        hintBlock.className = 'hint-block';
        hintText.textContent = '';
        hintLabel.textContent = '';
      }

      qViBox.textContent = q.question_vi || '';
      qViBox.classList.remove('show');
      qViBtn.classList.remove('active');
      qViBtn.style.display = q.question_vi ? '' : 'none';

      if (hintViBtn) {
        hintViBox.textContent = q.explanation_vi || '';
        hintViBox.classList.remove('show');
        hintViBtn.classList.remove('active');
        hintViBtn.style.display = q.explanation_vi ? '' : 'none';
      }

      var existing = answers[currentIndex];

      Object.keys(q.options).sort().forEach(function(letter){
        var optText = q.options[letter];
        var btn = document.createElement('button');
        btn.className = 'option';
        btn.dataset.letter = letter;

        var letterSpan = document.createElement('span');
        letterSpan.className = 'letter';
        letterSpan.textContent = letter;

        var textSpan = document.createElement('span');
        textSpan.className = 'otext';
        textSpan.textContent = optText;

        btn.appendChild(letterSpan);
        btn.appendChild(textSpan);

        if (existing) {
          btn.classList.add('disabled');
          if (letter === q.answer) {
            btn.classList.add('correct-answer');
          } else if (letter === existing.selected && letter !== q.answer) {
            btn.classList.add('wrong-answer');
          } else {
            btn.classList.add('faded');
          }
        } else {
          btn.addEventListener('click', function(){ selectOption(letter); });
        }

        optionsContainer.appendChild(btn);

        var optVi = (q.options_vi || {})[letter];
        if (optVi) {
          var optViBox = document.createElement('div');
          optViBox.className = 'opt-vi';
          optViBox.textContent = optVi;
          optionsContainer.appendChild(optViBox);
        }
      });

      if (existing) {
        feedbackBanner.classList.add('show');
        if (existing.correct) {
          feedbackBanner.classList.add('correct');
          feedbackBanner.textContent = '✓ Correct! The answer is ' + q.answer + '.';
        } else {
          feedbackBanner.classList.add('wrong');
          feedbackBanner.textContent = '✗ Incorrect. You chose ' + existing.selected + '. The correct answer is ' + q.answer + '.';
        }

        if (hintBlock && q.explanation) {
          hintBlock.classList.add('show');
          hintBlock.classList.add(existing.correct ? 'correct-hint' : 'wrong-hint');
          hintLabel.textContent = existing.correct ? 'Why this is right' : 'Explanation';
          hintText.textContent = q.explanation;
        }

        nextBtn.disabled = false;
      } else {
        nextBtn.disabled = true;
      }

      prevBtn.disabled = currentIndex === 0;
      nextBtn.textContent = currentIndex === activeSet.length - 1 ? 'Finish →' : 'Next →';

      updateProgress();
    }

    function selectOption(letter){
      var q = activeSet[currentIndex];
      var isCorrect = letter === q.answer;
      answers[currentIndex] = { selected: letter, correct: isCorrect };
      renderQuestion();
    }

    function updateProgress(){
      var total = activeSet.length;
      progressText.textContent = 'Question ' + (currentIndex + 1) + ' of ' + total;
      var pct = Math.round(((currentIndex + 1) / total) * 100);
      progressPct.textContent = pct + '%';
      progressFill.style.width = pct + '%';

      var correctCount = 0, wrongCount = 0;
      Object.keys(answers).forEach(function(k){ if (answers[k].correct) correctCount++; else wrongCount++; });
      scoreCorrect.textContent = correctCount;
      scoreWrong.textContent = wrongCount;
    }

    qViBtn.addEventListener('click', function(){
      var showing = qViBox.classList.toggle('show');
      qViBtn.classList.toggle('active', showing);
      optionsContainer.querySelectorAll('.opt-vi').forEach(function(el){ el.classList.toggle('show', showing); });
    });

    qCopyBtn.addEventListener('click', function(){
      var q = activeSet[currentIndex];
      var copyText = q.question + '\n\n' + Object.keys(q.options).sort().map(function(letter){ return letter + '. ' + q.options[letter]; }).join('\n');
      copyTextToClipboard(copyText, function(ok){
        qCopyBtn.textContent = ok ? '✓ Copied' : '✗ Failed';
        setTimeout(function(){ qCopyBtn.textContent = '📋 Copy'; }, 1300);
      });
    });

    if (hintViBtn) {
      hintViBtn.addEventListener('click', function(){
        var showing = hintViBox.classList.toggle('show');
        hintViBtn.classList.toggle('active', showing);
      });
    }

    prevBtn.addEventListener('click', function(){
      if (currentIndex > 0) { currentIndex--; renderQuestion(); }
    });

    nextBtn.addEventListener('click', function(){
      if (currentIndex < activeSet.length - 1) { currentIndex++; renderQuestion(); }
      else { showResults(); }
    });

    function showResults(){
      quizScreen.style.display = 'none';
      resultsScreen.style.display = 'block';

      var correctCount = 0, wrongCount = 0;
      Object.keys(answers).forEach(function(k){ if (answers[k].correct) correctCount++; else wrongCount++; });
      var total = activeSet.length;

      document.getElementById('final-score').textContent = correctCount + ' / ' + total;
      var pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      document.getElementById('final-pct').textContent = pct + '% correct';
      document.getElementById('final-correct').textContent = correctCount;
      document.getElementById('final-wrong').textContent = wrongCount;

      var reviewList = document.getElementById('review-list');
      reviewList.innerHTML = '';
      activeSet.forEach(function(q, idx){
        var a = answers[idx];
        var item = document.createElement('div');
        item.className = 'review-item ' + (a && a.correct ? 'correct' : 'wrong');
        var dot = document.createElement('div');
        dot.className = 'dot';
        var textWrap = document.createElement('div');
        var rq = document.createElement('div');
        rq.className = 'rq';
        rq.textContent = 'Q' + q.number + '. ' + q.question;
        var rmeta = document.createElement('div');
        rmeta.className = 'rmeta';
        if (a) {
          rmeta.textContent = a.correct ? 'Your answer: ' + a.selected + ' (correct)' : 'Your answer: ' + a.selected + ' — Correct answer: ' + q.answer;
        } else {
          rmeta.textContent = 'Not answered — Correct answer: ' + q.answer;
        }
        textWrap.appendChild(rq);
        textWrap.appendChild(rmeta);
        item.appendChild(dot);
        item.appendChild(textWrap);
        reviewList.appendChild(item);
      });
    }

    document.getElementById('restart-btn').addEventListener('click', function(){
      resultsScreen.style.display = 'none';
      startScreen.style.display = 'block';
    });

    document.getElementById('review-toggle-btn').addEventListener('click', function(){
      var list = document.getElementById('review-list');
      var isHidden = list.style.display === 'none';
      list.style.display = isHidden ? 'flex' : 'none';
      list.style.flexDirection = 'column';
      this.textContent = isHidden ? 'Hide Question Review' : 'Show Question Review';
    });

    // Deep link from the dashboard's "Related questions" panel: ?focus=<number> jumps straight to that question.
    (function handleDeepLink(){
      var params = new URLSearchParams(location.search);
      var focusNum = params.get('focus');
      if (!focusNum) return;
      var idx = ALL_QUESTIONS.findIndex(function(q){ return String(q.number) === String(focusNum); });
      if (idx === -1) return;
      activeSet = ALL_QUESTIONS.slice();
      currentIndex = idx;
      answers = {};
      startScreen.style.display = 'none';
      resultsScreen.style.display = 'none';
      quizScreen.style.display = 'block';
      renderQuestion();
    })();
  }

  function runExam(config, questions){
    var PAGE_SIZE = config.pageSize || 25;
    var GRAND_TOTAL = questions.length;
    var domainNames = config.domainNames || {};
    var DOMAIN_LIST = config.domainList || Array.from(new Set(questions.map(function(q){ return q.domain; }))).sort();

    var QUESTIONS_RAW = questions.map(function(q){
      return { id: q.number, domain: q.domain, question: q.question, options: q.options, correct: q.correct, explanation: q.explanation || '', vi: q.vi || {} };
    });

    var DOMAIN_COUNTS = {};
    DOMAIN_LIST.forEach(function(d){
      DOMAIN_COUNTS[d] = QUESTIONS_RAW.filter(function(q){ return q.domain === d; }).length;
    });

    var state = {
      selectedDomains: new Set(DOMAIN_LIST),
      shuffleEnabled: true,
      fullOrder: [],
      order: [],
      selections: {},
      answers: {},
      submitted: false,
      currentPage: 1
    };

    function buildShuffledSet(){
      var qShuffled = shuffle(QUESTIONS_RAW);
      return qShuffled.map(function(q){
        var letters = Object.keys(q.options);
        var shuffledLetters = shuffle(letters);
        var newOptions = [];
        var newLetterLabels = ['A', 'B', 'C', 'D'];
        shuffledLetters.forEach(function(origLetter, idx){
          var newLetter = newLetterLabels[idx];
          newOptions.push({ display: newLetter, text: q.options[origLetter], isCorrect: origLetter === q.correct, orig: origLetter });
        });
        var vi = q.vi || {};
        return {
          id: q.id, domain: q.domain, question: q.question, explanation: q.explanation,
          question_vi: vi.q || '', explanation_vi: vi.e || '', options_vi: vi.o || {},
          options: newOptions
        };
      });
    }

    function buildOrderedSet(){
      return QUESTIONS_RAW.map(function(q){
        var letters = Object.keys(q.options);
        var newOptions = letters.map(function(origLetter){
          return { display: origLetter, text: q.options[origLetter], isCorrect: origLetter === q.correct, orig: origLetter };
        });
        var vi = q.vi || {};
        return {
          id: q.id, domain: q.domain, question: q.question, explanation: q.explanation,
          question_vi: vi.q || '', explanation_vi: vi.e || '', options_vi: vi.o || {},
          options: newOptions
        };
      });
    }

    function buildQuestionSet(){
      return state.shuffleEnabled ? buildShuffledSet() : buildOrderedSet();
    }

    function filterOrder(){
      return state.fullOrder.filter(function(q){ return state.selectedDomains.has(q.domain); });
    }

    function currentTotal(){ return state.order.length; }

    function initExam(){
      state.selectedDomains = new Set(DOMAIN_LIST);
      state.fullOrder = buildQuestionSet();
      state.order = filterOrder();
      state.selections = {};
      state.answers = {};
      state.submitted = false;
      state.currentPage = 1;
      render();
    }

    function applyDomainFilter(){
      state.order = filterOrder();
      state.currentPage = 1;
      render();
    }

    function totalPages(){ return Math.max(1, Math.ceil(currentTotal() / PAGE_SIZE)); }

    function renderFilterChips(){
      var el = document.getElementById('filterChips');
      el.innerHTML = '';

      var allChip = document.createElement('div');
      allChip.className = 'chip allchip' + (state.selectedDomains.size === DOMAIN_LIST.length ? ' active' : '');
      allChip.innerHTML = '<span class="count">All domains</span>';
      if (!state.submitted) {
        allChip.onclick = function(){ state.selectedDomains = new Set(DOMAIN_LIST); applyDomainFilter(); };
      } else {
        allChip.style.opacity = '0.5';
        allChip.style.cursor = 'default';
      }
      el.appendChild(allChip);

      var noneChip = document.createElement('div');
      noneChip.className = 'chip nonechip';
      noneChip.innerHTML = '<span class="count">Deselect all</span>';
      if (!state.submitted) {
        noneChip.onclick = function(){ state.selectedDomains = new Set(); applyDomainFilter(); };
      } else {
        noneChip.style.opacity = '0.5';
        noneChip.style.cursor = 'default';
      }
      el.appendChild(noneChip);

      DOMAIN_LIST.forEach(function(d){
        var chip = document.createElement('div');
        var isActive = state.selectedDomains.has(d);
        chip.className = 'chip ' + d + (isActive ? ' active' : '');
        chip.innerHTML =
          '<span class="dot" style="background:var(--' + d.toLowerCase() + ')"></span>' +
          '<span>' + d + '</span>' +
          '<span class="count">(' + DOMAIN_COUNTS[d] + ')</span>';
        chip.title = domainNames[d] || d;
        if (!state.submitted) {
          chip.onclick = function(){
            if (state.selectedDomains.has(d)) state.selectedDomains.delete(d);
            else state.selectedDomains.add(d);
            applyDomainFilter();
          };
        } else {
          chip.style.opacity = '0.5';
          chip.style.cursor = 'default';
        }
        el.appendChild(chip);
      });
    }

    function renderDomainStats(){
      var el = document.getElementById('domainStatsBody');
      var title = document.getElementById('domainStatsTitle');
      el.innerHTML = '';

      var activeDomains = DOMAIN_LIST.filter(function(d){ return state.selectedDomains.has(d); });
      title.textContent = state.submitted ? 'Accuracy by domain' : 'Progress by domain';

      activeDomains.forEach(function(d){
        var domainQs = state.order.filter(function(q){ return q.domain === d; });
        var total = domainQs.length;
        var barColor = 'var(--' + d.toLowerCase() + ')';
        var row = document.createElement('div');
        row.className = 'dstat-row';

        var trackInner, pctLabel;

        if (!state.submitted) {
          var selectedCount = domainQs.filter(function(q){ return state.selections[q.id]; }).length;
          var pctSelected = total > 0 ? Math.round((selectedCount / total) * 100) : 0;
          trackInner = '<div class="dstat-fill" style="width:' + pctSelected + '%;background:' + barColor + ';"></div>';
          pctLabel = selectedCount + '/' + total + ' selected';
        } else {
          var correct = 0, incorrect = 0;
          domainQs.forEach(function(q){
            var a = state.answers[q.id];
            if (a) { if (a.correct) correct++; else incorrect++; }
          });
          var pctCorrect = total > 0 ? Math.round((correct / total) * 100) : 0;
          var pctIncorrect = total > 0 ? Math.round((incorrect / total) * 100) : 0;
          trackInner =
            '<div class="dstat-fill" style="width:' + pctCorrect + '%;background:var(--green);position:absolute;left:0;top:0;"></div>' +
            '<div class="dstat-fill" style="width:' + pctIncorrect + '%;background:var(--red);position:absolute;left:' + pctCorrect + '%;top:0;"></div>';
          pctLabel = pctCorrect + '% correct';
        }

        row.innerHTML =
          '<span class="dlabel" style="color:' + barColor + '">' + d + '</span>' +
          '<span class="dname">' + escapeHtml(domainNames[d] || d) + '</span>' +
          '<span class="dstat-track">' + trackInner + '</span>' +
          '<span class="dstat-pct">' + pctLabel + '</span>';
        el.appendChild(row);
      });
    }

    function renderPagebar(targetId){
      var el = document.getElementById(targetId);
      el.innerHTML = '';
      var tp = totalPages();
      var tot = currentTotal();

      var prevBtn = document.createElement('button');
      prevBtn.textContent = '‹ Prev';
      prevBtn.className = 'navbtn';
      prevBtn.disabled = state.currentPage === 1;
      prevBtn.onclick = function(){ state.currentPage--; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      el.appendChild(prevBtn);

      for (var p = 1; p <= tp; p++) {
        (function(p){
          var b = document.createElement('button');
          var startQ = (p - 1) * PAGE_SIZE + 1;
          var endQ = Math.min(p * PAGE_SIZE, tot);
          b.textContent = 'Page ' + p;
          b.title = 'Questions ' + startQ + '-' + endQ;
          if (p === state.currentPage) b.classList.add('active');
          b.onclick = function(){ state.currentPage = p; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
          el.appendChild(b);
        })(p);
      }

      var nextBtn = document.createElement('button');
      nextBtn.textContent = 'Next ›';
      nextBtn.className = 'navbtn';
      nextBtn.disabled = state.currentPage === tp;
      nextBtn.onclick = function(){ state.currentPage++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      el.appendChild(nextBtn);
    }

    function renderQuestions(){
      var container = document.getElementById('quizContainer');
      container.innerHTML = '';

      if (currentTotal() === 0) {
        container.innerHTML = '<div class="nomatch">No questions match the selected domain filter. Select at least one domain above.</div>';
        return;
      }

      var startIdx = (state.currentPage - 1) * PAGE_SIZE;
      var endIdx = Math.min(startIdx + PAGE_SIZE, currentTotal());
      var pageItems = state.order.slice(startIdx, endIdx);

      pageItems.forEach(function(q, localIdx){
        var globalNum = startIdx + localIdx + 1;
        var card = document.createElement('div');
        card.className = 'qcard';
        card.dataset.qid = q.id;

        var pendingPick = state.selections[q.id];
        var answer = state.submitted ? state.answers[q.id] : null;

        if (state.submitted) card.classList.add('answered');

        var statusClass, statusText;
        if (state.submitted) {
          if (answer && answer.picked) {
            statusClass = answer.correct ? 'submitted-correct' : 'submitted-incorrect';
            statusText = answer.correct ? '✓ Correct' : '✗ Incorrect';
          } else {
            statusClass = 'submitted-incorrect';
            statusText = '— Not answered';
          }
        } else if (pendingPick) {
          statusClass = 'pending';
          statusText = 'Selected: ' + pendingPick;
        } else {
          statusClass = 'unanswered';
          statusText = 'Unanswered';
        }

        var qhead = document.createElement('div');
        qhead.className = 'qhead';
        qhead.innerHTML =
          '<div class="qmeta">' +
            '<span class="qnum">Q' + globalNum + '</span>' +
            '<span class="domain-tag ' + q.domain + '">' + q.domain + '</span>' +
            '<span class="domain-fullname">' + escapeHtml(domainNames[q.domain] || q.domain) + '</span>' +
            '<span class="qstatus ' + statusClass + '">' + statusText + '</span>' +
          '</div>' +
          '<span class="qtext">' + escapeHtml(q.question) + '</span>';
        // Built as a real element (not string-concatenated innerHTML) because
        // escapeHtml() only escapes text-node entities, not quotes — unsafe to
        // use for an HTML attribute value like data-copy.
        var qCopyBtn = document.createElement('button');
        qCopyBtn.type = 'button';
        qCopyBtn.className = 'copy-btn';
        qCopyBtn.setAttribute('data-copy', q.question + '\n\n' + q.options.map(function(o){ return o.display + '. ' + o.text; }).join('\n'));
        qCopyBtn.textContent = '📋 Copy';
        qhead.appendChild(qCopyBtn);
        card.appendChild(qhead);

        if (q.question_vi) {
          var qViWrap = document.createElement('div');
          qViWrap.className = 'vi-wrap';
          qViWrap.innerHTML =
            '<button type="button" class="vi-btn" data-scope="question" data-target="vi-q-' + q.id + '"><svg class="flag-vn" viewBox="0 0 30 20" width="16" height="11" aria-hidden="true"><rect width="30" height="20" fill="#da251d"/><polygon points="15,4 16.76,9.53 22.57,9.53 17.9,13 19.66,18.53 15,15.06 10.34,18.53 12.1,13 7.43,9.53 13.24,9.53" fill="#ffcd00"/></svg> VN</button>' +
            '<div class="vi-box" id="vi-q-' + q.id + '">' + escapeHtml(q.question_vi) + '</div>';
          card.appendChild(qViWrap);
        }

        var optsWrap = document.createElement('div');
        optsWrap.className = 'options';

        q.options.forEach(function(opt){
          var optBtn = document.createElement('button');
          optBtn.className = 'opt';
          optBtn.type = 'button';

          if (state.submitted) {
            var pickedLetter = answer ? answer.picked : null;
            if (opt.display === pickedLetter && opt.isCorrect) {
              optBtn.classList.add('correct-pick');
            } else if (opt.display === pickedLetter && !opt.isCorrect) {
              optBtn.classList.add('wrong-pick');
            } else if (opt.isCorrect) {
              optBtn.classList.add('reveal-correct');
            }
          } else if (pendingPick === opt.display) {
            optBtn.classList.add('selected-pending');
          }

          optBtn.innerHTML =
            '<span class="letter">' + opt.display + '</span>' +
            '<span class="otext">' + escapeHtml(opt.text) + '</span>';

          if (!state.submitted) {
            optBtn.onclick = function(){ handleSelect(q.id, opt.display); };
          }
          optsWrap.appendChild(optBtn);

          var optVi = (q.options_vi || {})[opt.orig];
          if (optVi) {
            var optViBox = document.createElement('div');
            optViBox.className = 'opt-vi';
            optViBox.textContent = optVi;
            optsWrap.appendChild(optViBox);
          }
        });

        card.appendChild(optsWrap);

        if (state.submitted) {
          var fb = document.createElement('div');
          fb.className = 'feedback show ' + (answer && answer.correct ? 'correct' : 'incorrect');
          var verdictText = (answer && answer.picked)
            ? (answer.correct ? '✓ Correct' : '✗ Not quite')
            : '✗ Not answered';
          fb.innerHTML =
            '<div class="verdict">' + verdictText + '</div>' +
            '<div class="explain">' + escapeHtml(q.explanation) + '</div>' +
            (q.explanation_vi
              ? '<button type="button" class="vi-btn" data-target="vi-e-' + q.id + '"><svg class="flag-vn" viewBox="0 0 30 20" width="16" height="11" aria-hidden="true"><rect width="30" height="20" fill="#da251d"/><polygon points="15,4 16.76,9.53 22.57,9.53 17.9,13 19.66,18.53 15,15.06 10.34,18.53 12.1,13 7.43,9.53 13.24,9.53" fill="#ffcd00"/></svg> VN</button><div class="vi-box" id="vi-e-' + q.id + '">' + escapeHtml(q.explanation_vi) + '</div>'
              : '');
          card.appendChild(fb);
        }

        container.appendChild(card);
      });
    }

    function handleSelect(qid, pickedDisplay){
      if (state.selections[qid] === pickedDisplay) {
        delete state.selections[qid];
      } else {
        state.selections[qid] = pickedDisplay;
      }
      render();
    }

    function submitExam(){
      var tot = currentTotal();
      var unansweredCount = state.order.filter(function(q){ return !state.selections[q.id]; }).length;
      if (unansweredCount > 0) {
        var proceed = window.confirm(
          'You have ' + unansweredCount + ' unanswered question(s) out of ' + tot + '. ' +
          'Submit anyway? Unanswered questions will be marked incorrect.'
        );
        if (!proceed) return;
      }

      var answers = {};
      state.order.forEach(function(q){
        var picked = state.selections[q.id] || null;
        var correct = picked ? q.options.filter(function(o){ return o.display === picked; })[0].isCorrect : false;
        answers[q.id] = { picked: picked, correct: correct };
      });

      state.answers = answers;
      state.submitted = true;
      state.currentPage = 1;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateScorebar(){
      var tot = currentTotal();
      var selectedCount = Object.keys(state.selections).length;
      var values = Object.keys(state.answers).map(function(k){ return state.answers[k]; });
      var correctCount = values.filter(function(a){ return a.correct; }).length;

      document.getElementById('totalCount').textContent = tot;
      document.getElementById('totalCountScore').textContent = tot;
      document.getElementById('answeredCount').textContent = selectedCount;
      document.getElementById('correctCount').textContent = correctCount;

      var statSelected = document.getElementById('statSelected');
      var statScore = document.getElementById('statScore');
      var submitBtn = document.getElementById('submitExamBtn');
      var subText = document.getElementById('subText');
      var reportSummary = document.getElementById('reportSummary');

      if (!state.submitted) {
        statSelected.style.display = '';
        statScore.style.display = 'none';
        submitBtn.style.display = '';
        submitBtn.disabled = tot === 0;
        subText.textContent = 'Practice Exam · ' + GRAND_TOTAL + ' questions · ' + DOMAIN_LIST.length + ' domains — select your answers, then submit the whole exam to see your report.';
        reportSummary.style.display = 'none';

        var pct = tot > 0 ? Math.round((selectedCount / tot) * 100) : 0;
        document.getElementById('progressFill').style.width = pct + '%';
      } else {
        statSelected.style.display = 'none';
        statScore.style.display = '';
        submitBtn.style.display = 'none';
        var finalPct = tot > 0 ? Math.round((correctCount / tot) * 100) : 0;
        document.getElementById('scorePct').textContent = finalPct;
        subText.textContent = 'Final Report — review every question, your answer, the correct answer, and the explanation below.';

        document.getElementById('progressFill').style.width = '100%';

        reportSummary.style.display = 'block';
        var msg;
        if (finalPct >= 85) msg = "Excellent — you're exam-ready.";
        else if (finalPct >= 70) msg = 'Solid result — review the missed questions below before your attempt.';
        else msg = 'Keep practicing — review the explanations for missed questions below, then reset and try again.';
        reportSummary.innerHTML =
          '<h2>Exam Complete</h2>' +
          '<div class="scoreline">' + correctCount + ' / ' + tot + ' correct (' + finalPct + '%)</div>' +
          '<p>' + msg + '</p>';
      }
    }

    function render(){
      renderFilterChips();
      renderDomainStats();
      renderPagebar('pagebarTop');
      renderQuestions();
      renderPagebar('pagebarBottom');
      updateScorebar();
    }

    wireCopyAndViDelegation(document.getElementById('quizContainer'));

    document.getElementById('submitExamBtn').addEventListener('click', submitExam);

    document.getElementById('shuffleToggle').addEventListener('change', function(e){
      state.shuffleEnabled = e.target.checked;
    });

    document.getElementById('resetBtn').addEventListener('click', function(){
      initExam();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('detailsToggle').addEventListener('click', function(e){
      var panel = document.getElementById('headerDetails');
      var btn = e.currentTarget;
      var open = panel.hasAttribute('hidden');
      if (open) {
        panel.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
      } else {
        panel.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    document.getElementById('totalCount').textContent = GRAND_TOTAL;
    document.getElementById('totalCountScore').textContent = GRAND_TOTAL;
    var subTextEl = document.getElementById('subText');
    if (subTextEl) subTextEl.textContent = 'Practice Exam · ' + GRAND_TOTAL + ' questions · ' + DOMAIN_LIST.length + ' domains — select your answers, then submit the whole exam to see your report.';

    initExam();

    // Deep link from the dashboard's "Related questions" panel: ?focus=<number> jumps to the right page and highlights it.
    (function handleDeepLink(){
      var params = new URLSearchParams(location.search);
      var focusId = params.get('focus');
      if (!focusId) return;
      var idx = state.order.findIndex(function(q){ return String(q.id) === String(focusId); });
      if (idx === -1) return;
      state.currentPage = Math.floor(idx / PAGE_SIZE) + 1;
      render();
      setTimeout(function(){
        var el = document.querySelector('[data-qid="' + focusId + '"]');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('deep-link-highlight');
          setTimeout(function(){ el.classList.remove('deep-link-highlight'); }, 2500);
        }
      }, 80);
    })();
  }

  function run(config, questions){
    var mode = config.mode === 'exam' ? 'exam' : 'practice';
    document.body.classList.add('quiz-' + mode);
    if (mode === 'exam') runExam(config, questions);
    else runPractice(config, questions);
  }

  window.QuizEngine = { run: run };
})();
