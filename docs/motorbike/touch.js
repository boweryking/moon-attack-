// On-screen touch controls: they fire the same key events the keyboard does.
(function () {
  var coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches || /[?&]touch=1/.test(location.search);
  if (!coarse) return;
  var css = document.createElement('style');
  css.textContent = '#tc{position:fixed;inset:0;pointer-events:none;z-index:5;-webkit-user-select:none;user-select:none;touch-action:none}' +
    '#tc .b{position:absolute;pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center;border-radius:20px;border:2px solid rgba(255,255,255,.55);background:rgba(20,28,50,.55);color:#fff;font:700 15px system-ui,sans-serif;text-align:center;-webkit-tap-highlight-color:transparent;backdrop-filter:blur(2px)}' +
    '#tc .b.on{background:rgba(255,194,51,.6);border-color:#ffc233}' +
    '#tc .arr{width:max(64px,15vmin);height:max(64px,15vmin);font-size:max(30px,7vmin)}' +
    '#tc .gas,#tc .brk{width:max(74px,17vmin);height:max(56px,12vmin);right:calc(14px + env(safe-area-inset-right))}' +
    '#tc .del{right:calc(14px + env(safe-area-inset-right));width:max(120px,26vmin);height:max(64px,13vmin);background:rgba(60,180,90,.65);border-color:#7dff9a;font-size:max(17px,3.4vmin)}' +
    '#msg{white-space:normal!important;width:86vw;text-align:center;font-size:20px!important}#hud .card{min-width:80px;padding:5px 8px}#hud .val{font-size:17px}';
  document.head.appendChild(css);
  var vp = document.querySelector('meta[name=viewport]'); if (vp) vp.content = 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
  var root = document.createElement('div'); root.id = 'tc'; document.body.appendChild(root);
  var pad = 'calc(14px + env(safe-area-inset-bottom))';
  function key(type, code) { window.dispatchEvent(new KeyboardEvent(type, { code: code, key: code, bubbles: true })); }
  function btn(cls, label, style, code, tap) {
    var b = document.createElement('div'); b.className = 'b ' + cls; b.textContent = label; b.style.cssText = style; root.appendChild(b);
    var held = new Set();
    function down(e) { e.preventDefault(); held.add(e.pointerId); try { b.setPointerCapture(e.pointerId); } catch (x) {} b.classList.add('on'); if (navigator.vibrate) try { navigator.vibrate(8); } catch (x) {} key('keydown', code); if (tap) key('keyup', code); }
    function up(e) { held.delete(e.pointerId); if (!held.size) { b.classList.remove('on'); key('keyup', code); } }
    b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  btn('arr', '◀', 'left:calc(14px + env(safe-area-inset-left));bottom:' + pad, 'ArrowLeft');
  btn('arr', '▶', 'left:calc(28px + max(64px,15vmin) + env(safe-area-inset-left));bottom:' + pad, 'ArrowRight');
  btn('brk', 'BRAKE', 'bottom:' + pad, 'ArrowDown');
  btn('gas', 'GAS', 'bottom:calc(' + pad + ' + max(56px,12vmin) + 12px)', 'ArrowUp');
  btn('del', 'DELIVER', 'bottom:calc(' + pad + ' + 2*max(56px,12vmin) + 28px)', 'Space', true);
  // the start / retry panel is a normal tap target; make taps anywhere on it start the shift
  document.getElementById('overlay').addEventListener('pointerdown', function (e) { if (e.target.closest && e.target.closest('#go')) return; key('keydown', 'Enter'); key('keyup', 'Enter'); });
  // phone text for the intro panel
  var mo = new MutationObserver(function () { var p = document.getElementById('panel'); if (p && !p.dataset.t) { p.dataset.t = 1; p.innerHTML = p.innerHTML.replace(/press <b>SPACE<\/b>/, 'tap <b>DELIVER</b>').replace(/<p>Arrows[^<]*<\/p>/, '<p>◀ ▶ to steer, GAS to speed up, BRAKE to slow down.</p>'); } });
  mo.observe(document.getElementById('panel'), { childList: true });
  var p0 = document.getElementById('panel'); if (p0) p0.innerHTML = p0.innerHTML.replace(/press <b>SPACE<\/b>/, 'tap <b>DELIVER</b>').replace(/<p>Arrows[^<]*<\/p>/, '<p>◀ ▶ to steer, GAS to speed up, BRAKE to slow down.</p>');
})();
