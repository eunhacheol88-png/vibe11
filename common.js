/* mt-html-lesson 공통 스크립트
 * 원본: 구글 대학생 연수 module2·module3.html 의 인라인 스크립트를 한곳에 모은 것.
 * 페이지 맨 아래에서 <script src="common.js"></script> 로 불러오고,
 * 페이지마다 다른 값은 <body data-page-key="m2"> 처럼 HTML 속성으로 넘깁니다.
 *
 * 들어 있는 기능
 *  1. copyPrompt(btn)      — 프롬프트 복사 (clipboard 실패 시 execCommand 예비 방식)
 *  2. 접기/펼치기 + 완료 체크 — #hands .stepcard 자동 처리, 완료 상태는 localStorage
 *  3. URL 슬롯 주입         — .urlbox[data-slot] 입력값을 프롬프트 속 #슬롯에 넣기
 *  4. 발표 모드 모달        — MTL.presenter({...}) 로 슬라이드형 설명 열기
 *  5. 예시 갤러리           — MTL.gallery({...}) 이미지 없으면 자동으로 건너뜀
 *  6. 통합 뷰 연동          — 홈 카드 mt-goto, 상단 번호 정렬 mt-navalign
 */
(function (global) {
  'use strict';
  var MTL = global.MTL = global.MTL || {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ── 1. 복사 ─────────────────────────────────────────── */
  function copyText(text) {
    if (navigator.clipboard && global.isSecureContext !== false) {
      return navigator.clipboard.writeText(text).catch(function () { return fallback(text); });
    }
    return fallback(text);
  }
  function fallback(text) {
    return new Promise(function (ok, fail) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var done = false; try { done = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      done ? ok() : fail(new Error('copy failed'));
    });
  }
  MTL.copyText = copyText;
  /* 버튼과 같은 .codewrap 안의 <pre> 내용을 복사 (onclick="copyPrompt(this)") */
  global.copyPrompt = function (btn) {
    var pre = btn.parentElement.querySelector('pre');
    if (!pre) return;
    var o = btn.innerHTML;
    copyText(pre.innerText).then(function () {
      btn.innerHTML = '✅ 복사됨!';
      setTimeout(function () { btn.innerHTML = o; }, 1600);
    }, function () {
      btn.innerHTML = '⚠️ 복사 실패 — 직접 선택해 복사하세요';
      setTimeout(function () { btn.innerHTML = o; }, 2400);
    });
  };

  /* ── 2. 단계 카드 접기/펼치기 + 완료 체크 ───────────── */
  function initSteps() {
    var key = 'mission_done_' + (document.body.getAttribute('data-page-key') || 'page');
    var done = {}; try { done = JSON.parse(store(key) || '{}') || {}; } catch (e) {}
    $all('#hands .stepcard').forEach(function (card, idx) {
      var head = $('.head', card); if (!head || card.classList.contains('collapsible')) return;
      card.classList.add('collapsible');
      var body = document.createElement('div'); body.className = 'm-body';
      while (head.nextSibling) body.appendChild(head.nextSibling);
      card.appendChild(body);
      var db = document.createElement('button'); db.type = 'button'; db.className = 'donebtn'; db.textContent = '완료';
      var ch = document.createElement('span'); ch.className = 'chev'; ch.textContent = '▾';
      head.appendChild(db); head.appendChild(ch);
      head.addEventListener('click', function () { card.classList.toggle('collapsed'); });
      db.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var on = card.classList.toggle('done');
        db.textContent = on ? '✓ 완료' : '완료';
        done[idx] = on; store(key, JSON.stringify(done));
      });
      if (done[idx]) { card.classList.add('done'); db.textContent = '✓ 완료'; }
      if (!card.hasAttribute('data-open')) card.classList.add('collapsed');
    });
    /* 상단 번호 링크로 이동하면 그 단계를 펼침 */
    $all('nav .nav-links a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function () {
        var t = document.getElementById(a.getAttribute('href').slice(1));
        if (t) t.classList.remove('collapsed');
      });
    });
  }

  /* ── 3. URL 슬롯 주입 ─────────────────────────────────
   * <div class="urlbox" data-slot="formUrlSlot" data-store="m2_form_url">
   *   <input> <button>📎 프롬프트에 넣기</button> <div class="ok">…</div></div>
   * 같은 data-store 를 가진 칸끼리는 값이 동기화됩니다. */
  function initUrlBoxes() {
    $all('.urlbox[data-slot]').forEach(function (box) {
      var inp = $('input', box), btn = $('button', box), slot = document.getElementById(box.getAttribute('data-slot'));
      var key = box.getAttribute('data-store');
      if (!inp) return;
      var saved = key && store(key); if (saved) inp.value = saved;
      function apply() {
        var v = (inp.value || '').trim(); if (!v) { inp.focus(); return; }
        if (slot) { slot.textContent = v; slot.classList.add('slot-filled'); }
        box.classList.add('filled');
        if (key) {
          store(key, v);
          $all('.urlbox[data-store="' + key + '"] input').forEach(function (i) { if (i !== inp) i.value = v; });
        }
        if (btn) { var o = btn.textContent; btn.textContent = '✅ 넣었어요!'; setTimeout(function () { btn.textContent = o; }, 1600); }
      }
      if (btn) btn.addEventListener('click', apply);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
      if (saved && slot) apply();
    });
  }

  /* ── 4. 발표 모드 ─────────────────────────────────────
   * MTL.presenter({ trigger:'#rvBig', kicker:'🔁 리버스 프롬프팅',
   *   slides:[{t:'제목', h:'<div>본문 HTML</div>', m:'아래 한 줄 메시지'}, …] });
   * 모달 마크업은 자동으로 만들어지고 CSS는 common.css 의 .dxm-* 를 씁니다. */
  function fit(card) {
    if (!card || !card.offsetParent) return;
    var base = Math.min(innerWidth / 100, innerHeight * 0.0175), lo = 0.6, hi = 2.2, k = 1;
    function ok(v) { card.style.setProperty('--u', (base * v).toFixed(2) + 'px'); return card.scrollHeight <= card.clientHeight + 1 && card.scrollHeight <= innerHeight * 0.96; }
    for (var i = 0; i < 14; i++) { var m = (lo + hi) / 2; if (ok(m)) { k = m; lo = m; } else { hi = m; } }
    card.style.setProperty('--u', (base * k * 0.97).toFixed(2) + 'px');
  }
  MTL.fit = fit;
  MTL.presenter = function (o) {
    var trig = typeof o.trigger === 'string' ? $(o.trigger) : o.trigger; if (!trig || !o.slides || !o.slides.length) return;
    var modal = document.createElement('div');
    modal.className = 'dxm'; modal.hidden = true; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', (o.kicker || '') + ' 발표 화면');
    modal.innerHTML = '<div class="dxm-card"><div class="dxm-top"><span class="dxm-kicker"></span><button type="button" class="dxm-x" aria-label="닫기">✕</button></div>' +
      '<h2 class="dxm-title"></h2><div class="dxm-stage"></div><p class="dxm-msg"></p>' +
      '<div class="dxm-foot"><button type="button" class="dxm-nav" data-go="-1" aria-label="이전">‹</button><button type="button" class="dxm-nav" data-go="1" aria-label="다음">›</button>' +
      '<div class="dxm-bar"><i></i></div><span class="dxm-page"></span></div></div>';
    document.body.appendChild(modal);
    var card = $('.dxm-card', modal), st = $('.dxm-stage', modal), n = 0, N = o.slides.length, last = null;
    $('.dxm-kicker', modal).textContent = o.kicker || '';
    function show(k) {
      n = Math.max(0, Math.min(N - 1, k)); var s = o.slides[n];
      $('.dxm-title', modal).textContent = s.t || ''; st.innerHTML = s.h || ''; $('.dxm-msg', modal).innerHTML = s.m || '';
      $('.dxm-page', modal).textContent = (n + 1) + ' / ' + N; $('.dxm-bar i', modal).style.width = ((n + 1) / N * 100) + '%';
      $all('.dxm-nav', modal)[0].disabled = n === 0; $all('.dxm-nav', modal)[1].disabled = n === N - 1;
      st.classList.remove('flip'); void st.offsetWidth; st.classList.add('flip');
      if (o.onShow) o.onShow(n, modal);
      fit(card);
    }
    function open() { last = document.activeElement; modal.hidden = false; document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(function () { modal.classList.add('open'); }); show(0); $('.dxm-x', modal).focus(); }
    function close() { modal.classList.remove('open'); document.documentElement.style.overflow = '';
      setTimeout(function () { modal.hidden = true; }, 220); if (last) try { last.focus(); } catch (e) {} }
    trig.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(); });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) return close();
      if (e.target.closest('.dxm-x')) return close();
      var g = e.target.closest('[data-go]'); if (g) return show(n + (+g.getAttribute('data-go')));
      if (e.target.closest('.dxm-foot') || e.target.closest('.dxm-top')) return;
      var rc = card.getBoundingClientRect(); show(e.clientX < rc.left + rc.width * 0.25 ? n - 1 : n + 1);
    });
    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') { e.preventDefault(); show(n + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(n - 1); }
      else if (e.key === 'Home') { e.preventDefault(); show(0); }
    }, true);
    global.addEventListener('resize', function () { if (!modal.hidden) fit(card); });
    return { open: open, close: close, show: show };
  };

  /* ── 5. 예시 갤러리 ───────────────────────────────────
   * MTL.gallery({ root:'#galA', samples:[{src:'a.jpg', cap:'설명'}, …] })
   * root 안에 img / .gal-cap / .gal-dots / .gal-nav 두 개가 있어야 합니다.
   * 파일이 없으면 그 항목을 빼고, 하나도 없으면 갤러리를 숨깁니다. */
  MTL.gallery = function (o) {
    var gal = typeof o.root === 'string' ? $(o.root) : o.root; if (!gal) return;
    var S = (o.samples || []).slice(), img = $('img', gal), cap = $('.gal-cap', gal), dots = $('.gal-dots', gal), nav = $all('.gal-nav', gal), i = 0;
    if (!S.length || !img) { gal.style.display = 'none'; return; }
    function show(k) {
      i = (k + S.length) % S.length;
      img.onerror = function () { img.onerror = null; S.splice(i, 1); if (S.length) show(i); else gal.style.display = 'none'; };
      img.src = S[i].src; img.alt = S[i].cap || '예시 이미지';
      if (cap) cap.textContent = (S.length > 1 ? (i + 1) + ' / ' + S.length + '  ·  ' : '') + (S[i].cap || '');
      if (dots) { dots.innerHTML = ''; if (S.length > 1) S.forEach(function (_, k2) {
        var d = document.createElement('button'); d.type = 'button'; d.className = 'gal-dot' + (k2 === i ? ' on' : '');
        d.setAttribute('aria-label', (k2 + 1) + '번 예시'); d.addEventListener('click', function () { show(k2); }); dots.appendChild(d); }); }
      nav.forEach(function (b) { b.style.visibility = S.length > 1 ? 'visible' : 'hidden'; });
    }
    if (nav[0]) nav[0].addEventListener('click', function () { show(i - 1); });
    if (nav[1]) nav[1].addEventListener('click', function () { show(i + 1); });
    show(0);
  };

  /* ── 6. 통합 뷰(index.html) 연동 ────────────────────── */
  var framed = false; try { framed = global.parent && global.parent !== global; } catch (e) { framed = true; }
  /* 홈 카드: <button data-goto-module="2"> → 부모 탭 전환, 단독 실행이면 data-href 로 이동 */
  function initGoto() {
    $all('[data-goto-module]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var n = b.getAttribute('data-goto-module');
        if (framed) { try { global.parent.postMessage({ type: 'mt-goto', module: n }, '*'); return; } catch (x) {} }
        var href = b.getAttribute('data-href'); if (href) location.href = href;
      });
    });
  }
  /* 상단 번호 버튼을 부모의 '🏠 홈' 탭 왼쪽 끝선에 맞춤 (폭 620px 이하는 해제) */
  function initNavAlign() {
    var links = $('nav .nav-links'), brand = $('nav .brand'), L = null; if (!links) return;
    function reset() { links.style.position = links.style.left = links.style.top = links.style.transform = links.style.marginLeft = ''; }
    function align() {
      if (!framed || L === null || innerWidth <= 620) return reset();
      var br = brand ? brand.getBoundingClientRect().right : 0;
      if (L < br + 16 || L + links.offsetWidth > innerWidth - 8) return reset();
      links.style.position = 'absolute'; links.style.left = L + 'px'; links.style.top = '50%'; links.style.transform = 'translateY(-50%)'; links.style.marginLeft = '0';
    }
    global.addEventListener('message', function (ev) { if (ev.data && ev.data.type === 'mt-navalign') { L = ev.data.left; align(); } });
    global.addEventListener('resize', align);
    if (framed) try { global.parent.postMessage({ type: 'mt-navalign-req' }, '*'); } catch (e) {}
  }
  /* 홈 카드 뒤집기: .flip 클릭 → 뒤집기 (data-goto-module 버튼은 제외) */
  function initFlip() {
    $all('.flip').forEach(function (c) {
      c.addEventListener('click', function (e) { if (e.target.closest('[data-goto-module]')) return; c.classList.toggle('flipped'); });
    });
  }

  function init() { initSteps(); initUrlBoxes(); initGoto(); initNavAlign(); initFlip(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
