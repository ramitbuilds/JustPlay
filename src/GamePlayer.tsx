import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Maximize, Volume2, VolumeX, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Heart, Gem } from 'lucide-react';
import type { GameSpec } from './spec';
import type { GameStatus, RuntimeControls, createRuntime } from './game/runtime';
const controls=():RuntimeControls=>({left:false,right:false,up:false,down:false,jump:false,dash:false,shoot:false});
export default function GamePlayer({spec}:{spec:GameSpec}){
 const host=useRef<HTMLDivElement>(null),shell=useRef<HTMLDivElement>(null),runtime=useRef<ReturnType<typeof createRuntime>|null>(null),input=useRef(controls());
 const [status,setStatus]=useState<GameStatus>({health:spec.health,score:0,state:'ready',progress:0}),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[sound,setSound]=useState(false),[restart,setRestart]=useState(0);
 useEffect(()=>{
  let canceled=false;setLoaded(false);setError('');input.current=controls();
  import('./game/runtime').then(({createRuntime})=>{if(canceled||!host.current)return;const r=createRuntime(host.current,spec,input.current,setStatus);runtime.current=r;r.scene.events.once('create',()=>{if(!canceled)setLoaded(true);});r.scene.load.on('loaderror',()=>setError('A game asset could not load. Reload to try again.'));}).catch(()=>setError('The game engine could not load. Reload to try again.'));
  return ()=>{canceled=true;runtime.current?.game.destroy(true);runtime.current=null;};
 },[spec,restart]);
 useEffect(()=>{if(runtime.current)runtime.current.scene.soundEnabled=sound;},[sound,loaded]);
 useEffect(()=>{const blur=()=>{Object.assign(input.current,controls());if(runtime.current?.scene.status.state==='playing')runtime.current.scene.pause();};window.addEventListener('blur',blur);const hidden=()=>{if(document.hidden)blur();};document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);};},[]);
 function start(){runtime.current?.scene.start();runtime.current?.game.canvas.focus();}
 function togglePause(){runtime.current?.scene.pause();runtime.current?.game.canvas.focus();}
 const press=(key:keyof RuntimeControls)=>(<button className="touch-button" aria-label={key} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);input.current[key]=true;}} onPointerUp={()=>input.current[key]=false} onPointerCancel={()=>input.current[key]=false} onKeyDown={e=>{if(e.key===' '||e.key==='Enter')input.current[key]=true;}} onKeyUp={()=>input.current[key]=false} onBlur={()=>input.current[key]=false}>{key==='left'?<ArrowLeft/>:key==='right'?<ArrowRight/>:key==='up'?<ArrowUp/>:key==='down'?<ArrowDown/>:key==='jump'?'Jump':'Dash'}</button>);
 return <div className="player-shell" ref={shell}>
  <div className="player-hud"><span><Heart size={15}/> <b data-testid="health">{status.health}</b> / {spec.health}</span><span><Gem size={15}/><b data-testid="score">{status.score}</b>{spec.genre==='survival'||spec.genre==='platformer'?` / ${spec.goal}`:' crystals'}</span><span className="hud-goal">{spec.genre==='survival'?'Defeat the creatures':spec.genre==='runner'?'Reach the end of the rooftops':'Collect crystals & reach the gate'}</span></div>
  <div className="game-stage"><div className="game-host" ref={host} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();if(e.key==='p')togglePause();}}/>
   {(!loaded||error||status.state!=='playing')&&<div className="game-overlay"><div>
    <span className={`sprite ${spec.hero}`} aria-hidden="true"/>
    <h3>{error?'Let’s reload':!loaded?'Loading your world…':status.state==='ready'?spec.title:status.state==='paused'?'Take a breather':status.state==='won'?'Beautifully played.':'One more try?'}</h3>
    <p>{error||(!loaded?'Loading the local engine and artwork.':status.state==='ready'?spec.description:status.state==='won'?'Your world, conquered. Change a rule and play again.':status.state==='lost'?'Every great run starts with another attempt.':'Your game is paused.')}</p>
    {loaded&&!error&&(status.state==='ready'?<button className="accent" onClick={start}><Play size={16}/>Play game</button>:status.state==='paused'?<button className="accent" onClick={togglePause}><Play size={16}/>Resume</button>:<button className="accent" onClick={()=>setRestart(v=>v+1)}><RotateCcw size={16}/>Play again</button>)}
   </div></div>}
  </div>
  <div className="player-toolbar"><div className="toolbar-actions"><button onClick={togglePause} disabled={!loaded||!['playing','paused'].includes(status.state)} aria-label={status.state==='paused'?'Resume game':'Pause game'}>{status.state==='paused'?<Play size={16}/>:<Pause size={16}/>}</button><button onClick={()=>setRestart(v=>v+1)} aria-label="Restart game"><RotateCcw size={16}/></button><button onClick={()=>setSound(v=>!v)} aria-label={sound?'Mute sound':'Enable sound'} aria-pressed={sound}>{sound?<Volume2 size={16}/>:<VolumeX size={16}/>}</button></div><span className="control-hint">{spec.genre==='survival'?'WASD / arrows to move · auto-fire':'Arrows to move · Space to jump'}{spec.mechanics.dash?' · Shift to dash':''}</span><button onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void shell.current?.requestFullscreen().catch(()=>setError('Fullscreen is unavailable in this browser. Play in the embedded view.'));}} aria-label="Toggle fullscreen"><Maximize size={16}/></button></div>
  <div className="touch-controls"><div>{press('left')}{spec.genre==='survival'&&press('up')}{spec.genre==='survival'&&press('down')}{press('right')}</div><div>{spec.mechanics.dash&&press('dash')}{spec.genre!=='survival'&&press('jump')}</div></div>
  <p className="sr-only" aria-live="polite">Game {status.state}. {status.health} health. {status.score} collected.</p>
 </div>;
}
