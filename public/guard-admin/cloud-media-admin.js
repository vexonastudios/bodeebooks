import {initMusicAdmin} from './media-music.js';
import {setupVideoTab,loadVideoTab} from './media-video.js';
import {setupAudiobookTab,loadAudiobookTab} from './media-audiobooks.js';
import {setupLearningVideosTab,loadLearningVideosTab} from './media-learning-videos.js';
import {setupFamilyWatchTab,loadFamilyWatch} from './media-family-watch.js';
import {setupYouTubeSearch} from './media-youtube-search.js';
window.refreshIcons=()=>window.lucide?.createIcons();
window.showToast||=(message,error=false)=>{const el=document.getElementById('cloud-feedback');if(el){el.textContent=message;el.dataset.error=String(error);}};
// The original dynamic cards use a small fixed set of click handlers. Dispatch
// them without eval or relaxing the dashboard's script CSP.
const calls=new Set(['toggleScreened','deleteMusicTrack','toggleAssign','dismissMusicRequest','_videoToggleScreened','_videoToggleGlobal','_videoDelete','_channelToggleGlobal','_channelToggleShorts','_channelSync','_channelManageExclusions','_channelDelete','_youtubePlaylistToggleGlobal','_youtubePlaylistManageExclusions','_youtubePlaylistDelete','_removeExclusion','_videoUnassign','_videoAssign','_videoSourceAssignment']);
function argumentsFor(raw,element){
  const args=[],token=/\s*(?:'((?:\\.|[^'\\])*)'|(this\.checked|this)|(-?\d+)|(true|false))\s*(,|$)/y;let index=0;
  while(index<raw.length){token.lastIndex=index;const match=token.exec(raw);if(!match)throw Error('Invalid media action');args.push(match[1]!==undefined?match[1].replace(/\\(['\\])/g,'$1'):match[2]?match[2]==='this'?element:element.checked:match[3]?Number(match[3]):match[4]==='true');index=token.lastIndex;}
  return args;
}
for(const type of ['click','change'])document.addEventListener(type,event=>{
  const element=event.target.closest(`[on${type}], [data-media-${type}]`);if(!element||!element.closest('#tab-music,#tab-videos'))return;
  const raw=element.getAttribute(`on${type}`)||element.getAttribute(`data-media-${type}`);element.removeAttribute(`on${type}`);element.setAttribute(`data-media-${type}`,raw);
  const match=/^(?:window\.)?(\w+)\((.*)\)$/.exec(raw);if(!match||!calls.has(match[1]))return;
  try{Promise.resolve(window[match[1]](...argumentsFor(match[2],element))).catch(error=>window.showToast(error.message,true));}catch(error){window.showToast(error.message,true);}
},true);
setupVideoTab();setupAudiobookTab();setupLearningVideosTab();setupFamilyWatchTab();setupYouTubeSearch();
document.addEventListener('click',event=>{
  const link=event.target.closest('#tab-music a[href*="youtube.com/watch"],#tab-videos a[href*="youtube.com/watch"],#tab-audiobooks a[href*="youtube.com/watch"],#tab-learning-videos a[href*="youtube.com/watch"]');
  if(!link)return;event.preventDefault();const id=new URL(link.href).searchParams.get('v');if(!/^[A-Za-z0-9_-]{11}$/.test(id||''))return;
  const dialog=document.createElement('dialog');dialog.style.cssText='width:min(1100px,94vw);padding:18px;background:#111123;color:white;border:1px solid #514568;border-radius:18px';
  const close=document.createElement('button');close.className='btn btn-secondary';close.textContent='Close preview';close.onclick=()=>dialog.close();
  const player=document.createElement('iframe');player.title='Media preview';player.src='/guard-admin/cloud-learning-player.html#'+new URLSearchParams({video:id,start:'0'});player.allow='autoplay; encrypted-media; fullscreen';player.style.cssText='border:0;width:100%;height:min(70vh,650px);display:block;margin-top:14px';
  dialog.append(close,player);dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
});
let active='';
function refresh(){const next=document.querySelector('.tab-content.active')?.id;if(next===active)return;active=next;
  ({'tab-music':initMusicAdmin,'tab-videos':loadVideoTab,'tab-audiobooks':loadAudiobookTab,'tab-learning-videos':loadLearningVideosTab,'tab-family-watch':loadFamilyWatch}[next])?.();window.refreshIcons();
}
new MutationObserver(refresh).observe(document.querySelector('.main-content'),{attributes:true,attributeFilter:['class'],subtree:true});refresh();
