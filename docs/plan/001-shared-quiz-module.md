# Plan: một module Quiz dùng chung, mỗi cert chỉ còn dữ liệu JSON

## Context

Hiện mỗi cert có 3 trang quiz HTML riêng (`certs/<id>/quizzes/quiz1.html`, `quiz2.html`, `exam.html`, tổng 6 trang + 1 ở `_template`). Chúng giống nhau khoảng 95%, chỉ khác tiêu đề, file data được nạp, tên biến bản dịch và vài con số (`randomSubsetSize`, `pageSize`, tên domain). Dữ liệu nằm trong file `.js` gán vào biến global (`window.CERT_QUESTIONS`, `window.VI_TRANSLATIONS_A`...), còn bản dịch tiếng Việt nằm ở file riêng, ghép theo số thứ tự câu.

**Mục tiêu:** toàn site chỉ có **1 trang quiz** do core quản lý. Mỗi cert chỉ khai báo danh sách quiz (manifest) và mỗi quiz là **đúng 1 file JSON**, bản dịch VN gộp luôn vào từng câu. Muốn thêm quiz thì thêm 1 file JSON và 1 dòng trong manifest, không phải viết HTML.

**Các quyết định đã chốt với user:**
1. Chỉ còn 1 trang `core/quiz.html?cert=<id>&quiz=<quizId>`.
2. Bản dịch VN gộp vào từng câu hỏi.
3. Các thẻ quiz ở tab Quiz tự sinh từ manifest.
4. Xóa hẳn các URL cũ, không để file redirect.

## Hiện trạng đã khảo sát

- `core/js/quiz-engine.js` (876 dòng) đã generic. Nó tự chạy lúc load, đọc `window.QUIZ_CONFIG`, `window.CERT_QUESTIONS` và `window[config.viTranslations]`. Có 2 chế độ: `runPractice` và `runExam`. Deep-link `?focus=N` đang hoạt động ở cả hai.
- Markup của 2 chế độ khác nhau: practice dùng `.app` với các id `start-screen/quiz-screen/results-screen`, exam dùng `header.top` + `.wrap` với các id `quizContainer/pagebarTop...`. CSS nằm trong `core/css/quiz.css`, scope theo `body.quiz-practice` / `body.quiz-exam` (engine tự gắn class).
- **Nơi đọc thứ hai:** `certs/cca-f/question-links.js` (panel "Related questions" ở tab Lesson) đọc `data/questions.js`. File này chứa 224 câu, mỗi câu có `principles` + `quizFile` (`quizzes/exam.html` hoặc `quizzes/quiz2.html`), kèm `VI_TRANSLATIONS_A/B`. Đã kiểm tra: 77 câu nguồn exam khớp đúng `exam` theo `number`, 147 câu nguồn quiz2 khớp đúng `quiz2` theo `number`, nên chuyển đổi không mất dữ liệu.
- **Bug có sẵn** ở `question-links.js:143`: `isSetA = q.quizFile.indexOf('practice-exam') > -1` không bao giờ đúng, nên 77 câu nguồn exam tra nhầm setB và không hiện bản dịch VN. Thiết kế mới sửa bug này luôn, không cần xử lý riêng.
- Link cứng tới `quizzes/*.html`: `certs/cca-f/index.html` (dòng 48, 58, 68, 965-977, 993-1009), `certs/itil4-f/index.html` (41, 49-50, 189-205), `certs/_template/index.html:56`.
- `site-nav.js` tính link Home = `CERT_INDEX_PATH + '../../index.html'` và link tab = `CERT_INDEX_PATH + 'index.html#tab'`. Trên `core/quiz.html` chỉ cần đặt `CERT_INDEX_PATH = '../certs/<id>/'` là cả hai link ra đúng, **không phải sửa site-nav**.
- Site vốn đã cần HTTP server vì dashboard dùng `fetch(meta.json)`, nên dùng `fetch` JSON không thêm ràng buộc mới.
- Dead code (chỉ báo cáo, không xóa): `certs/cca-f/data/principles.js`, `certs/_template/data/principles.js` không được file nào nạp.

## Thiết kế

### Cấu trúc dữ liệu mỗi cert

```
certs/<id>/quiz/
  quizzes.json     # manifest
  quiz1.json       # 1 file / quiz, gồm cả bản dịch VN
  quiz2.json
  exam.json
  related.json     # chỉ cca-f: map principle → câu hỏi (thay data/questions.js)
```

**`quizzes.json`:**
```json
{
  "domains": { "D1": "Key Concepts of Service Management", "D2": "..." },
  "quizzes": [
    { "id": "quiz1", "mode": "practice", "title": "Quiz 1", "badge": "Practice",
      "description": "Key Concepts, Four Dimensions & Guiding Principles (D1-D3).",
      "file": "quiz1.json", "randomSubsetSize": 10 },
    { "id": "exam", "mode": "exam", "title": "Practice Exam", "badge": "Exam",
      "description": "All questions combined, exam mode with per-domain stats.",
      "file": "exam.json", "pageSize": 20 }
  ]
}
```
`domains` khai báo ở cấp cert vì mọi quiz của một cert dùng chung. Thứ tự các key chính là `domainList`.

**File quiz (`quiz1.json`):** mảng câu hỏi
`{ number, domain?, question, options:{A..D}, correct, explanation, vi?: { q, o:{A..D}, e } }`.
Bỏ `uid`, vì engine không dùng và `number` đã là id cho deep-link.

**`related.json` (cca-f):** `[{ "principles": ["d1-p1"], "quiz": "exam", "number": 1 }, ...]`, chỉ còn tham chiếu, không chép lại nội dung câu. `question-links.js` fetch manifest cùng các file quiz được tham chiếu rồi lấy câu hỏi, đáp án và bản dịch từ đó. Như vậy bỏ được 224 câu bị chép trùng, và bug setA/setB biến mất.

### Trang dùng chung `core/quiz.html` (mới)

- **Script inline trong `<head>`:** đọc `cert` từ query, validate bằng `/^[a-z0-9-]+$/` (chặn path traversal và injection vào URL). Sau đó set `CERT_ID`, `CERT_INDEX_PATH = '../certs/<id>/'`, `CERT_ACTIVE_TAB = 'quiz'`, rồi dùng `document.write` để chèn `<link href="../certs/<id>/theme.css">` và `<script src="../certs/<id>/data/nav.js">`.
  - Lý do chọn cách này: theme và nav nạp đồng bộ trước khi render, nên không bị nháy màu và **giữ nguyên `site-nav.js` / `theme-toggle.js`** (cả hai đang tự chạy lúc DOMContentLoaded). File cùng origin nên không bị Chrome chặn `document.write`.
- **Body:** `#siteNav`, `#quizRoot`, cùng 2 `<template id="tpl-practice">` và `<template id="tpl-exam">` chứa đúng markup hiện tại, chuyển nguyên từ `quiz1.html` và `exam.html`. Header practice (kicker/h1/mô tả/footer) để trống, điền bằng `textContent` từ `CERT_NAV.title` và manifest. `<title>` = `<quiz.title> — <nav.title>`.
- **Nạp script:** `core/js/site-nav.js`, `theme-toggle.js`, `quiz-engine.js`, rồi `core/js/quiz-page.js` (mới).

### `core/js/quiz-page.js` (mới, nhỏ)

Fetch `../certs/<id>/quiz/quizzes.json` → tìm quiz theo `quiz` param (phải có trong manifest) → fetch file quiz → clone template theo `mode` vào `#quizRoot` → điền header → gọi `QuizEngine.run(config, questions)`.

Nếu cert hoặc quiz không hợp lệ, hay fetch lỗi, hiện card "Quiz not found" kèm link về dashboard. Chỉ dùng `textContent`, không nhét chuỗi từ URL vào HTML.

### Sửa `core/js/quiz-engine.js`

- Bỏ đoạn tự khởi động (`start()` cùng các global `QUIZ_CONFIG` / `CERT_QUESTIONS`), thay bằng `window.QuizEngine = { run: function(config, questions){...} }`. Hàm `run` gắn class `quiz-<mode>` vào body.
- Bản dịch: đổi `viMap[q.number]` (dòng 72, 416, 431) thành `q.vi || {}`, bỏ `config.viTranslations`.
- Exam: `domainNames` và `domainList` lấy từ `manifest.domains`, do `quiz-page.js` truyền vào config.
- Logic render, chấm điểm, shuffle, deep-link giữ nguyên.

### Tab Quiz tự sinh: `core/js/quiz-cards.js` (mới)

Nạp ở `index.html` của mỗi cert. Fetch `quiz/quizzes.json` rồi render vào `<div class="quiz-grid" id="quizCards"></div>`, dùng lại đúng các class `.quiz-card`, `.quiz-card-head`, `.quiz-badge`, `.quiz-start` (đã có style trong `content.css` của từng cert). Link: `../../core/quiz.html?cert=<CERT_ID>&quiz=<id>`. Thay khối quiz-card viết tay trong tab Quiz của cca-f, itil4-f và `_template`.

### Chuyển đổi dữ liệu (script 1 lần, để trong scratchpad, không commit)

Script Node đọc các file `.js` cũ (dùng `global.window = {}` + `require`), gộp bản dịch theo `number` và ghi ra JSON:
- cca-f: quiz1 ← `quiz1-questions.js` + setA; quiz2 ← `quiz2-questions.js` + setB; exam ← `exam-questions.js` + setA; `related.json` ← `data/questions.js`, chuyển `quizFile` + `uid` thành `{quiz, number}`.
- itil4-f: quiz1/quiz2/exam + `vi-translations-quiz1/quiz2/exam`.
- `_template`: `data/questions.js` → `quiz/quiz1.json` + manifest mẫu.
- **Script tự kiểm tra rồi mới ghi:** số câu khớp; `question/options/correct/explanation` khớp 100% với file cũ; `vi` khớp với map cũ theo `number`; mọi entry trong `related.json` trỏ tới câu có tồn tại và có `question` trùng với bank cũ. Có sai lệch là dừng, không ghi file.
- Giá trị manifest (title, description, `randomSubsetSize` 50/60/10/10, `pageSize` 25/20, domain names) lấy từ các `QUIZ_CONFIG` và quiz-card hiện có.

### Dọn dẹp và sửa link

- **Xóa:** `certs/{cca-f,itil4-f,_template}/quizzes/`, `certs/*/data/*-questions.js`, `certs/*/data/vi-translations-*.js`, `certs/cca-f/data/questions.js`, `certs/_template/data/questions.js`.
- **Sửa các link `quizzes/*.html`** còn lại trong phần văn bản của `certs/cca-f/index.html` (plan, checklist, files-list) và `certs/itil4-f/index.html` (plan) thành `../../core/quiz.html?cert=<id>&quiz=<id>`. Ở cca-f, khối files-list đang ghi tên file cũ thì đổi chữ cho khớp.
- **`certs/cca-f/index.html`:** bỏ 3 thẻ `<script>` (`data/questions.js`, `vi-translations-setA.js`, `vi-translations-setB.js`); `question-links.js` chuyển sang tự fetch. Link "Open in …" thành `../../core/quiz.html?cert=cca-f&quiz=<quiz>&focus=<number>`.

## Các file chính

- **Mới:** `core/quiz.html`, `core/js/quiz-page.js`, `core/js/quiz-cards.js`, `certs/*/quiz/*.json`
- **Sửa:** `core/js/quiz-engine.js`, `certs/cca-f/question-links.js`, `certs/{cca-f,itil4-f,_template}/index.html`
- **Giữ nguyên:** `core/js/site-nav.js`, `core/js/theme-toggle.js`, `core/js/app.js`, `core/css/quiz.css`, các file `theme.css` / `content.css`

## Kiểm tra

1. **Chuyển đổi:** script tự đối chiếu (ở trên) phải chạy xong không lỗi. Sau đó `grep -rn "quizzes/\|CERT_QUESTIONS\|VI_TRANSLATIONS\|QUIZ_CONFIG" certs core index.html` không còn kết quả nào ngoài `docs/`.
2. **Chạy thử:** `python -m http.server 5500` tại `D:\Source\cert-prep` (không dùng `npx serve`, vì nó redirect bỏ đuôi `.html`). Test cho **cả cca-f và itil4-f**:
   - Tab Quiz hiện đủ thẻ lấy từ manifest (cca-f 3, itil4-f 3), bấm vào mở đúng quiz.
   - Practice: 4 mode (All / Random 20 / Random N / Custom), chọn đáp án, xem giải thích, nút VN (câu hỏi + đáp án + giải thích), Copy, màn kết quả, review.
   - Exam: chip lọc domain đúng tên, phân trang, Submit / Reset, bật tắt shuffle, thống kê theo domain, nút VN sau khi submit.
   - Deep-link: `core/quiz.html?cert=cca-f&quiz=exam&focus=10` nhảy đúng trang và highlight; `&quiz=quiz2&focus=5` mở thẳng câu 5.
   - Nav trên trang quiz: tab Quiz active; các tab khác và Home dẫn đúng; bật tắt dark mode hoạt động và giữ theme khi quay lại trang cert.
   - `?cert=../x`, `?cert=nope`, `?quiz=nope` đều hiện "Quiz not found", không lỗi console.
   - cca-f tab Lesson: mở "Related questions" ở vài principle; câu nguồn **Practice Exam** giờ đã có nút VN (bằng chứng bug setA/setB đã hết); link "Open in …" mở đúng câu.
3. Chạy **Technical Architect audit** và **spec-vs-implementation audit** theo quy trình trong CLAUDE.md trước khi báo xong.

## Ghi chú quy trình

- Sau khi thoát plan mode, lưu bản plan này vào `docs/plan/` của repo (theo CLAUDE.md).
- Không tự commit; user commit tay.
