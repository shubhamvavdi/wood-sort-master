// main.js — UI layer: wires DOM to the game engine/services. Kept framework-free
// on purpose so the core logic stays portable; swap this file for a React/Vue
// view layer later without touching game/, services/, or adapters/.
import './style.css';

import { CAPACITY, BALL_COLORS, cloneTubes, isValidMove, applyMove, getValidMoves, isWon } from './game/engine.js';
import { solvePuzzle } from './game/solver.js';
import { getLevel, invalidateLevel } from './game/generator.js';
import { player, savePlayer, resetPlayer } from './game/player.js';
import { storage } from './services/storage.js';
import { AudioManager, vibrate } from './services/audio.js';
import { analytics } from './services/analytics.js';
import { ads, initializeAds } from './adapters/ads.js';
import { GamePortalAdapter } from './adapters/gamePortalAdapter.js';
import { applyLanguage } from './i18n/translations.js';

'use strict';

/* ===================== GAME STATE ===================== */
let game = null; // {level, tubes, selectedTube, moves, undoStack, hintsUsed, extraTubeUsed, gameStatus, par}

function startLevel(n){
  const lvl = getLevel(n);
  game = { level:n, tubes: cloneTubes(lvl.tubes), selectedTube:null, moves:0, undoStack:[], hintsUsed:0, extraTubeUsed:false, gameStatus:'playing', par:lvl.par };
  renderGame();
  analytics.track('level_started', {level:n, colors:lvl.colors, tubes:lvl.tubeCount, par:lvl.par});
  GamePortalAdapter.gameplayStart();
}

/* ===================== UI HELPERS ===================== */
const $ = id=>document.getElementById(id);
function showScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); $(id).classList.add('active'); }
function showModal(id){ $(id).classList.remove('hidden'); }
function hideModal(id){ $(id).classList.add('hidden'); }
function toast(msg){ const d=document.createElement('div'); d.className='toast'; d.textContent=msg; document.body.appendChild(d); setTimeout(()=>d.remove(),1800); }
function updateCoinDisplays(){ ['menu-coins','lv-coins','g-coins'].forEach(id=>{ if($(id)) $(id).textContent=player.coins; }); }

/* ===================== RENDER: BOARD ===================== */
function gridColsFor(n){
  if(n<=4) return 2; if(n<=6) return 3; return 4;
}
function renderGame(){
  $('g-level').textContent = game.level;
  $('g-moves').textContent = game.moves;
  updateCoinDisplays();
  const board = $('board');
  board.innerHTML='';
  const cols = gridColsFor(game.tubes.length);
  board.style.gridTemplateColumns = `repeat(${cols}, min(18vw,70px))`;
  game.tubes.forEach((tube, idx)=>{
    const slot = document.createElement('div'); slot.className='tube-slot';
    const el = document.createElement('div'); el.className='tube'; el.dataset.idx=idx;
    if(game.selectedTube===idx) el.classList.add('selected');
    tube.forEach(color=>{
      const b=document.createElement('div'); b.className='ball';
      b.style.background = `radial-gradient(circle at 32% 28%, #fff8, ${BALL_COLORS[color]} 60%, #0002)`;
      b.style.background = `radial-gradient(circle at 32% 28%, ${lighten(BALL_COLORS[color])}, ${BALL_COLORS[color]} 65%)`;
      el.appendChild(b);
    });
    el.addEventListener('click', ()=>onTubeClick(idx));
    slot.appendChild(el);
    board.appendChild(slot);
  });
  $('btn-undo').disabled = game.undoStack.length===0;
  const hintsLeft = Math.max(0, 3-game.hintsUsed);
  $('hint-label').textContent = hintsLeft>0 ? `Hint (${hintsLeft})` : 'Hint (50🪙)';
  $('btn-extra').style.opacity = game.extraTubeUsed ? .5 : 1;
}
function lighten(hex){
  const n=parseInt(hex.slice(1),16); const r=Math.min(255,((n>>16)&255)+90), g=Math.min(255,((n>>8)&255)+90), b=Math.min(255,(n&255)+90);
  return `rgb(${r},${g},${b})`;
}

/* ===================== GAMEPLAY ===================== */
function onTubeClick(idx){
  if(!game || game.gameStatus!=='playing') return;
  AudioManager.play('click');
  if(game.selectedTube===null){
    if(game.tubes[idx].length===0) return;
    game.selectedTube = idx;
    AudioManager.play('select'); vibrate(10);
    renderGame();
    return;
  }
  if(game.selectedTube===idx){ game.selectedTube=null; renderGame(); return; }
  const from=game.selectedTube, to=idx;
  if(isValidMove(game.tubes, from, to)){
    game.undoStack.push({tubes:cloneTubes(game.tubes), moves:game.moves});
    applyMove(game.tubes, from, to);
    game.moves++; game.selectedTube=null;
    AudioManager.play('move'); vibrate(15);
    renderGame();
    animatePop(to);
    if(isWon(game.tubes)){ setTimeout(onWin, 280); }
    else if(getValidMoves(game.tubes).length===0){ setTimeout(()=>showModal('modal-nomoves'), 300); }
  } else {
    const el = document.querySelector(`.tube[data-idx="${to}"]`);
    if(el){ el.classList.add('shake'); setTimeout(()=>el.classList.remove('shake'),350); }
    AudioManager.play('invalid'); vibrate([10,20,10]);
    setTimeout(()=>{ game.selectedTube=null; renderGame(); }, 220);
  }
}
function animatePop(tubeIdx){
  const el = document.querySelector(`.tube[data-idx="${tubeIdx}"]`);
  if(el && el.lastElementChild) el.lastElementChild.classList.add('pop');
}
function undo(){
  if(!game || !game.undoStack.length) return;
  const snap = game.undoStack.pop();
  game.tubes = snap.tubes; game.moves = snap.moves; game.selectedTube=null;
  AudioManager.play('click'); renderGame();
  hideModal('modal-nomoves');
  analytics.track('undo_used', {level:game.level});
}
function doRestart(){
  startLevel(game.level);
  hideModal('modal-nomoves'); hideModal('modal-pause');
}
function useHint(){
  if(!game || game.gameStatus!=='playing') return;
  const hintsLeft = 3-game.hintsUsed;
  if(hintsLeft<=0){
    if(player.coins<50){ toast('Not enough coins for a hint'); return; }
    player.coins-=50; savePlayer(); updateCoinDisplays();
  }
  const path = solvePuzzle(game.tubes, 25000);
  if(!path || !path.length){ toast('No hint found right now — try Undo'); return; }
  game.hintsUsed++; player.hintsUsedTotal++; savePlayer();
  const {from,to} = path[0];
  AudioManager.play('hint');
  document.querySelectorAll('.tube').forEach(el=>el.classList.remove('hint-from','hint-to'));
  const fromEl=document.querySelector(`.tube[data-idx="${from}"]`), toEl=document.querySelector(`.tube[data-idx="${to}"]`);
  if(fromEl) fromEl.classList.add('hint-from'); if(toEl) toEl.classList.add('hint-to');
  setTimeout(()=>{ if(fromEl) fromEl.classList.remove('hint-from'); if(toEl) toEl.classList.remove('hint-to'); }, 1800);
  renderGame();
  analytics.track('hint_used', {level:game.level, hintsUsed:game.hintsUsed});
}
function useExtraTube(){
  if(!game || game.extraTubeUsed) return;
  if(player.coins<100){ toast('Not enough coins (100 needed)'); return; }
  player.coins-=100; savePlayer(); updateCoinDisplays();
  game.tubes.push([]); game.extraTubeUsed=true;
  AudioManager.play('booster'); renderGame();
  analytics.track('booster_used', {level:game.level, type:'extra_tube'});
}
async function watchAdForReward(){
  if(!game || game.gameStatus!=='playing') return;
  toast('Requesting rewarded ad…');
  const result = await ads.showRewarded({placement:'bonus-coins', level:game.level});
  if(result.success){
    player.coins += 30; savePlayer(); updateCoinDisplays();
    AudioManager.play('star'); toast('+30 coins from ad reward!');
    analytics.track('rewarded_ad_completed', {level:game.level});
  } else {
    toast('No ad available right now ('+result.reason+')');
    analytics.track('rewarded_ad_unavailable', {reason:result.reason});
  }
}
async function onWin(){
  game.gameStatus='won';
  AudioManager.play('win'); vibrate([20,40,20,40,60]);
  let stars = 1;
  if(game.moves<=game.par) stars=3; else if(game.moves<=game.par*1.6) stars=2;
  const coinsEarned = 20 + (stars===3?10:0);
  player.coins += coinsEarned;
  player.stars[game.level] = Math.max(player.stars[game.level]||0, stars);
  player.unlockedLevels = Math.max(player.unlockedLevels, game.level+1);
  player.currentLevel = game.level+1;
  savePlayer();
  $('win-stars').innerHTML = [1,2,3].map(i=>`<span class="${i<=stars?'':'star-off'}">⭐</span>`).join('');
  $('win-moves').textContent = game.moves;
  $('win-coins').textContent = '+'+coinsEarned;
  spawnConfetti();
  showModal('modal-win');
  GamePortalAdapter.gameplayStop();
  analytics.track('level_completed', {level:game.level, moves:game.moves, stars, hintsUsed:game.hintsUsed, coinsEarned});
  await ads.showInterstitial({placement:'level_complete', level:game.level});
}
function spawnConfetti(){
  const colors = Object.values(BALL_COLORS);
  for(let i=0;i<40;i++){
    const d=document.createElement('div'); d.className='confetti';
    d.style.left = Math.random()*100+'vw';
    d.style.background = colors[Math.floor(Math.random()*colors.length)];
    d.style.animationDuration = (1.6+Math.random()*1.2)+'s';
    d.style.animationDelay = (Math.random()*.4)+'s';
    document.body.appendChild(d);
    setTimeout(()=>d.remove(), 3200);
  }
}

/* ===================== LEVEL SELECT ===================== */
function renderLevelGrid(){
  const grid = $('level-grid'); grid.innerHTML='';
  const maxShow = Math.max(150, player.unlockedLevels+30);
  for(let i=1;i<=maxShow;i++){
    const card=document.createElement('div');
    const locked = i>player.unlockedLevels;
    card.className='level-card'+(locked?' locked':'');
    const stars = player.stars[i]||0;
    card.innerHTML = locked ? `🔒<div style="font-size:9px">${i}</div>` : `${i}<div class="stars">${'⭐'.repeat(stars)||'☆'}</div>`;
    if(!locked) card.addEventListener('click', ()=>{ startLevel(i); showScreen('screen-game'); });
    grid.appendChild(card);
  }
  $('lv-coins').textContent = player.coins;
}

/* ===================== DAILY REWARD ===================== */
const DAILY_AMOUNTS=[100,150,200,250,300,400,750];
function todayStr(){ return new Date().toDateString(); }
function openDaily(){
  const last = player.daily.lastClaim;
  const claimedToday = last===todayStr();
  let day = player.daily.day;
  if(!claimedToday){
    const y=new Date(); y.setDate(y.getDate()-1);
    day = (last===y.toDateString()) ? (day%7)+1 : 1;
  }
  $('daily-text').textContent = `Day ${day} of 7`+(claimedToday?' — Already claimed today':'');
  $('daily-amount').textContent = `+${DAILY_AMOUNTS[day-1]} 🪙`;
  $('daily-claim').disabled = claimedToday;
  $('daily-claim').onclick = ()=>{
    if(player.daily.lastClaim===todayStr()) return;
    player.coins += DAILY_AMOUNTS[day-1];
    player.daily = {lastClaim: todayStr(), day};
    savePlayer(); updateCoinDisplays(); AudioManager.play('star');
    toast(`+${DAILY_AMOUNTS[day-1]} coins claimed!`);
    hideModal('modal-daily');
    analytics.track('daily_reward_claimed', {day, amount:DAILY_AMOUNTS[day-1]});
  };
  showModal('modal-daily');
}

/* ===================== TUTORIAL ===================== */
const TUT_STEPS=['Tap a tube to pick up the top balls.','Tap another tube to move them there.','You can only pour onto empty tubes or matching top colors.','Sort every tube to a single color to win. Have fun!'];
let tutStep=0;
function openTutorial(){ tutStep=0; $('tut-text').textContent=TUT_STEPS[0]; showModal('modal-tutorial'); }

/* ===================== SETTINGS ===================== */
function syncSettingsUI(){
  $('s-sound').classList.toggle('on', player.settings.sound);
  $('s-music').classList.toggle('on', player.settings.music);
  $('s-vibe').classList.toggle('on', player.settings.vibration);
}

/* ===================== EVENT WIRING ===================== */
$('btn-play').onclick = ()=>{ startLevel(player.currentLevel||1); showScreen('screen-game'); };
$('btn-levels').onclick = ()=>{ renderLevelGrid(); showScreen('screen-levels'); };
$('lv-back').onclick = ()=> showScreen('screen-menu');
$('btn-daily').onclick = openDaily;
$('daily-close').onclick = ()=> hideModal('modal-daily');
$('btn-settings').onclick = ()=>{ syncSettingsUI(); showModal('modal-settings'); };
$('s-close').onclick = ()=> hideModal('modal-settings');
$('btn-howto').onclick = openTutorial;
$('tut-skip').onclick = ()=>{ player.tutorialCompleted=true; savePlayer(); hideModal('modal-tutorial'); analytics.track('tutorial_completed', {skipped:true}); };
$('tut-next').onclick = ()=>{
  tutStep++;
  if(tutStep>=TUT_STEPS.length){ player.tutorialCompleted=true; savePlayer(); hideModal('modal-tutorial'); analytics.track('tutorial_completed', {skipped:false}); return; }
  $('tut-text').textContent = TUT_STEPS[tutStep];
};

$('game-back').onclick = ()=>{ showScreen('screen-menu'); refreshMenu(); };
$('game-pause').onclick = ()=>{ if(game && game.gameStatus==='playing') showModal('modal-pause'); };
$('p-resume').onclick = ()=> hideModal('modal-pause');
$('p-restart').onclick = ()=>{ hideModal('modal-pause'); showModal('modal-restart'); };
$('p-settings').onclick = ()=>{ syncSettingsUI(); showModal('modal-settings'); };
$('p-exit').onclick = ()=>{ hideModal('modal-pause'); showScreen('screen-menu'); refreshMenu(); };

$('btn-undo').onclick = undo;
$('btn-restart').onclick = ()=> showModal('modal-restart');
$('restart-cancel').onclick = ()=> hideModal('modal-restart');
$('restart-confirm').onclick = ()=>{ hideModal('modal-restart'); doRestart(); };
$('btn-hint').onclick = useHint;
$('btn-extra').onclick = useExtraTube;
$('btn-watchad').onclick = watchAdForReward;
document.querySelectorAll('.lang-btn').forEach(btn=>{
  btn.onclick = ()=>{ player.language = btn.dataset.lang; savePlayer(); applyLanguage(player.language); };
});
$('nm-undo').onclick = undo;
$('nm-restart').onclick = doRestart;

$('win-next').onclick = ()=>{ hideModal('modal-win'); startLevel(game.level+1); };
$('win-replay').onclick = ()=>{ hideModal('modal-win'); startLevel(game.level); };
$('win-levels').onclick = ()=>{ hideModal('modal-win'); renderLevelGrid(); showScreen('screen-levels'); };

function bindSwitch(id, key){
  $(id).onclick = ()=>{
    player.settings[key] = !player.settings[key];
    savePlayer(); syncSettingsUI(); AudioManager.play('button');
    if(key==='music') AudioManager.setMusic(player.settings.music);
  };
}
bindSwitch('s-sound','sound'); bindSwitch('s-music','music'); bindSwitch('s-vibe','vibration');
$('s-reset').onclick = ()=>{
  if(confirm('Reset all progress? This cannot be undone.')){
    resetPlayer();
    hideModal('modal-settings'); refreshMenu(); toast('Progress reset');
  }
};

function refreshMenu(){ $('menu-coins').textContent=player.coins; $('menu-level').textContent=player.currentLevel||1; }

/* Keyboard shortcuts (desktop) */
document.addEventListener('keydown', e=>{
  if(!document.getElementById('screen-game').classList.contains('active')) return;
  if(e.key==='r'||e.key==='R') showModal('modal-restart');
  if(e.key==='u'||e.key==='U') undo();
  if(e.key==='h'||e.key==='H') useHint();
  if(e.key==='p'||e.key==='P'||e.key==='Escape') $('game-pause').click();
});
document.addEventListener('click', ()=>{ AudioManager.setMusic(player.settings.music); }, {once:true});

GamePortalAdapter.initialize();
initializeAds().then((ready)=>{
  if(ready) ads.showBanner();
});

/* ===================== DEBUG MODE (only via ?debug=1, never shown otherwise) ===================== */
function initDebugMode(){
  if(!/[?&]debug=1/.test(location.search)) return;
  const panel = document.createElement('div'); panel.className='debug-panel';
  panel.innerHTML = `<b>DEBUG</b><div id="dbg-info">level: -</div>
    <button id="dbg-solve">Solve current level</button>
    <button id="dbg-regen">Regenerate level</button>
    <button id="dbg-reset">Reset progress</button>`;
  document.body.appendChild(panel);
  function refreshInfo(){ $('dbg-info').textContent = game ? `L${game.level} moves:${game.moves} tubes:${game.tubes.length} par:${game.par}` : 'no active level'; }
  document.getElementById('dbg-solve').onclick = ()=>{ if(!game) return; const p = solvePuzzle(game.tubes, 60000); alert(p ? `Solvable in ${p.length} moves` : 'Not found within search cap'); };
  document.getElementById('dbg-regen').onclick = ()=>{ if(!game) return; invalidateLevel(game.level); startLevel(game.level); };
  document.getElementById('dbg-reset').onclick = ()=>{ storage.reset(); location.reload(); };
  setInterval(refreshInfo, 500);
}

/* ===================== INIT ===================== */
refreshMenu();
applyLanguage(player.language||'en');
if(!player.tutorialCompleted){ analytics.track('tutorial_started', {}); setTimeout(openTutorial, 400); }
analytics.track('game_loaded', {});
analytics.track('session_started', {});
window.addEventListener('beforeunload', ()=> analytics.track('session_ended', {}));
initDebugMode();
