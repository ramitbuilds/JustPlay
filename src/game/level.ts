import type { GameSpec } from '../spec';
export const WORLD_HEIGHT = 360;
export function random(seed:number) { let v=seed>>>0;return ()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296;}; }
export type Level = {width:number; platforms:{x:number;y:number;w:number}[]; coins:{x:number;y:number}[]; enemies:{x:number;y:number;kind:'slime'|'bat'}[]; obstacles:{x:number;y:number}[]; exit:{x:number;y:number}};
export function compose(spec:GameSpec):Level {
 const rng=random(spec.seed), runner=spec.genre==='runner';
 const width=spec.genre==='survival'?640:Math.max(2300,spec.goal*160+400);
 const platforms:Level['platforms']=spec.genre==='survival'?[]:[{x:width/2,y:328,w:width}];
 const coins:Level['coins']=[],enemies:Level['enemies']=[],obstacles:Level['obstacles']=[];
 if(spec.genre==='survival'){
  for(let i=0;i<8+spec.difficulty*2;i++){const a=i/(8+spec.difficulty*2)*Math.PI*2;enemies.push({x:320+Math.cos(a)*250,y:180+Math.sin(a)*125,kind:spec.enemies[i%spec.enemies.length]});}
 }else{
  for(let i=0;i<spec.goal+4;i++)coins.push({x:160+i*140,y:runner?258:285});
  for(let x=400;x<width-200;x+=340){
   if(runner)obstacles.push({x,y:300});
   else {platforms.push({x,y:238-Math.floor(rng()*2)*32,w:100});if(rng()<.8)enemies.push({x:x+100,y:spec.enemies.includes('bat')&&rng()>.5?220:295,kind:spec.enemies.includes('bat')&&rng()>.5?'bat':'slime'});}
  }
 }
 return {width,platforms,coins,enemies,obstacles,exit:{x:width-100,y:280}};
}
