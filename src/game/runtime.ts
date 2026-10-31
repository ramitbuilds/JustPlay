import Phaser from 'phaser';
import type { GameSpec } from '../spec';
import { compose, random } from './level';
export type GameStatus={health:number;score:number;state:'ready'|'playing'|'paused'|'won'|'lost';progress:number};
export type RuntimeControls={left:boolean;right:boolean;up:boolean;down:boolean;jump:boolean;dash:boolean;shoot:boolean};
export const makeControls=():RuntimeControls=>({left:false,right:false,up:false,down:false,jump:false,dash:false,shoot:false});
type Enemy=Phaser.Physics.Arcade.Sprite & {kind?:string;home?:number};
export class PlayScene extends Phaser.Scene {
 spec:GameSpec;onStatus:(s:GameStatus)=>void;controls:RuntimeControls;
 player!:Phaser.Physics.Arcade.Sprite;enemies!:Phaser.Physics.Arcade.Group;coins!:Phaser.Physics.Arcade.Group;bullets!:Phaser.Physics.Arcade.Group;
 keys!:Record<string,Phaser.Input.Keyboard.Key>;status:GameStatus;worldWidth=640;lastDamage=-2000;lastShot=0;lastDash=-2000;jumps=0;oldJump=false;elapsed=0;distance=0;soundEnabled=false;audio?:AudioContext;background!:Phaser.GameObjects.TileSprite;
 reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(spec:GameSpec,controls:RuntimeControls,onStatus:(s:GameStatus)=>void){super('play');this.spec=spec;this.controls=controls;this.onStatus=onStatus;this.status={health:spec.health,score:0,state:'ready',progress:0};}
 preload(){
  for(const id of ['fox','robot','knight','slime','bat','crystal'])this.load.spritesheet(id,`/assets/${id}.png`,{frameWidth:16,frameHeight:16});
  this.load.image('background',`/assets/${this.spec.theme}.svg`);
 }
 create(){
  const s=this.spec,level=compose(s);this.worldWidth=level.width;this.elapsed=0;this.distance=0;this.lastDamage=-2000;this.lastShot=0;this.jumps=0;this.oldJump=false;
  this.status={health:s.health,score:0,state:'ready',progress:0};this.onStatus({...this.status});
  this.physics.world.setBounds(0,0,level.width,360);this.cameras.main.setBounds(0,0,level.width,360);
  this.background=this.add.tileSprite(0,0,640,360,'background').setOrigin(0).setScrollFactor(0);
  if(s.night&&s.theme==='forest')this.background.setTint(0x7897b1);
  const rng=random(s.seed),g=this.add.graphics();
  const floor=s.theme==='forest'?0x34533d:s.theme==='neon'?0x34324a:0x454054;
  if(s.genre==='survival'){
   for(let y=0;y<360;y+=32)for(let x=0;x<640;x+=32){g.fillStyle(floor,.3+rng()*.2);g.fillRect(x+1,y+1,30,30);}
  }else{
   g.fillStyle(floor);g.fillRect(0,312,level.width,48);
   for(let x=0;x<level.width;x+=16){g.fillStyle(s.theme==='forest'?0x73a45b:s.theme==='neon'?0x77d6c9:0x7c748a);g.fillRect(x,312,16,4);g.fillStyle(0x182e29,.4);g.fillRect(x+3,323+(x%3)*4,6,3);}
   for(let x=100;x<level.width;x+=120){if(s.theme==='forest'){
    g.fillStyle(0x50855b);g.fillRect(x,296,6,14);g.fillRect(x-7,302,20,5);g.fillStyle(0xc5e59c);g.fillRect(x+2,294,3,3);
   }else {g.fillStyle(0x8e6488);g.fillRect(x,294,24,18);g.fillStyle(0xcc8db4);g.fillRect(x+4,298,16,2);}}
  }
  const platforms=this.physics.add.staticGroup();
  if(s.genre!=='survival')for(const p of level.platforms){const top=p.y-16;
   const block=this.add.rectangle(p.x,p.y,p.w,32,floor);this.physics.add.existing(block,true);platforms.add(block);
   if(p.w<200){g.fillStyle(floor);g.fillRect(p.x-p.w/2,top,p.w,16);g.fillStyle(0x8ab873);g.fillRect(p.x-p.w/2,top,p.w,4);}
  }
  this.player=this.physics.add.sprite(s.genre==='survival'?320:70,s.genre==='survival'?180:280,s.hero).setScale(2).setCollideWorldBounds(true).setDepth(8);
  this.player.body!.setSize(10,13).setOffset(3,2);this.player.setGravityY(s.genre==='survival'?0:680);
  if(s.genre!=='survival')this.physics.add.collider(this.player,platforms);
  for(const id of [s.hero,'slime','bat','crystal'])if(!this.anims.exists(id+'-move'))this.anims.create({key:id+'-move',frames:this.anims.generateFrameNumbers(id,{start:0,end:3}),frameRate:id==='bat'?10:7,repeat:-1});
  this.player.play(s.hero+'-move');this.coins=this.physics.add.group({allowGravity:false,immovable:true});
  for(const p of level.coins){const c=this.coins.create(p.x,p.y,'crystal') as Phaser.Physics.Arcade.Sprite;c.setScale(1.7).setDepth(4);c.body!.setSize(10,12);if(!this.reduced)this.tweens.add({targets:c,y:p.y-6,duration:800,yoyo:true,repeat:-1});}
  this.physics.add.overlap(this.player,this.coins,(_p,c)=>{(c as Phaser.Physics.Arcade.Sprite).disableBody(true,true);this.status.score++;this.tone(740,.08);this.spark(this.player.x,this.player.y,0xb5edc0);this.emit();});
  this.enemies=this.physics.add.group({allowGravity:false});for(const e of level.enemies)this.spawnEnemy(e.x,e.y,e.kind);
  const obstacles=this.physics.add.staticGroup();for(const o of level.obstacles){const box=this.add.rectangle(o.x,o.y,22,24,0xed8b96);this.physics.add.existing(box,true);obstacles.add(box);g.lineStyle(2,0xffd9a3);g.strokeRect(o.x-11,o.y-12,22,24);}
  this.physics.add.overlap(this.player,obstacles,()=>this.damage());
  this.physics.add.overlap(this.player,this.enemies,(_p,e)=>{const enemy=e as Enemy;
   if(s.genre!=='survival'&&this.player.body!.velocity.y>100&&this.player.y<enemy.y-14){this.killEnemy(enemy);this.player.setVelocityY(-250);}else this.damage();});
  this.bullets=this.physics.add.group({allowGravity:false});this.physics.add.overlap(this.bullets,this.enemies,(b,e)=>{(b as Phaser.Physics.Arcade.Sprite).destroy();this.killEnemy(e as Enemy);});
  this.cameras.main.startFollow(this.player,true,1,1,0,30);
  if(s.genre!=='survival'){g.fillStyle(0xa5ddaf,.35);g.fillRect(level.exit.x-18,252,36,60);g.lineStyle(3,0xb4ecc0);g.strokeRect(level.exit.x-18,252,36,60);g.fillStyle(0xb4ecc0);g.fillRect(level.exit.x-24,246,48,8);}
  if(this.input.keyboard){this.input.keyboard.disableGlobalCapture();this.keys=this.input.keyboard.addKeys({left:'LEFT',right:'RIGHT',up:'UP',down:'DOWN',a:'A',d:'D',w:'W',s:'S',jump:'SPACE',dash:'SHIFT',shoot:'J'}) as Record<string,Phaser.Input.Keyboard.Key>;}
  this.events.once('shutdown',()=>{void this.audio?.close();this.audio=undefined;});
 }
 spawnEnemy(x:number,y:number,kind:string){const e=this.enemies.create(x,y,kind) as Enemy;e.setScale(2).setDepth(6).play(kind+'-move');e.kind=kind;e.home=x;e.body!.setSize(11,9).setOffset(2,5);e.setCollideWorldBounds(true);return e;}
 emit(){this.onStatus({...this.status});}
 start(){if(this.status.state==='ready'){this.status.state='playing';this.emit();}void this.audio?.resume();}
 pause(){if(this.status.state==='playing'){this.status.state='paused';this.emit();}else if(this.status.state==='paused'){this.status.state='playing';this.emit();}}
 tone(freq:number,duration:number){if(!this.soundEnabled)return;try{this.audio??=new AudioContext();const osc=this.audio.createOscillator(),gain=this.audio.createGain();osc.type='triangle';osc.frequency.value=freq;gain.gain.setValueAtTime(.035,this.audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+duration);osc.connect(gain).connect(this.audio.destination);osc.start();osc.stop(this.audio.currentTime+duration);}catch{/* Sound is optional on unsupported browsers. */}}
 spark(x:number,y:number,color:number){if(this.reduced)return;for(let i=0;i<7;i++){const p=this.add.rectangle(x,y,3,3,color).setDepth(10);this.tweens.add({targets:p,x:x+Math.cos(i)*25,y:y+Math.sin(i)*25,alpha:0,duration:350,onComplete:()=>p.destroy()});}}
 killEnemy(e:Enemy){if(!e.active)return;const x=e.x,y=e.y;e.destroy();this.spark(x,y,0xf3bc85);this.tone(290,.08);if(this.spec.genre==='survival'){this.status.score++;if(this.enemies.countActive()<5){const rng=random(this.spec.seed+this.status.score);this.spawnEnemy(rng()>.5?40:600,40+rng()*270,this.spec.enemies[this.status.score%this.spec.enemies.length]);}if(this.status.score>=this.spec.goal)this.finish('won');this.emit();}}
 damage(){if(this.time.now-this.lastDamage<1200||this.status.state!=='playing')return;this.lastDamage=this.time.now;this.status.health--;this.tone(120,.15);this.spark(this.player.x,this.player.y,0xed8b96);if(!this.reduced)this.cameras.main.shake(120,.004);if(this.status.health<=0)this.finish('lost');this.emit();}
 finish(state:'won'|'lost'){this.status.state=state;this.player.setVelocity(0);this.tone(state==='won'?960:110,.25);this.emit();}
 update(_time:number,delta:number){
  if(!this.player)return;
  if(this.status.state!=='playing'){this.physics.world.pause();return;}this.physics.world.resume();
  const dt=Math.min(delta,40)/1000,s=this.spec,k=this.keys??{},c=this.controls;this.elapsed+=dt;
  const focused=this.game.canvas===document.activeElement;const down=(name:string)=>focused&&k[name]?.isDown;
  const left=c.left||down('left')||down('a'),right=c.right||down('right')||down('d'),up=c.up||down('up')||down('w'),bottom=c.down||down('down')||down('s');
  const jump=c.jump||down('jump')||(s.genre!=='survival'&&up),dash=c.dash||down('dash');const body=this.player.body as Phaser.Physics.Arcade.Body;
  if(s.genre==='survival'){const vec=new Phaser.Math.Vector2(Number(right)-Number(left),Number(bottom)-Number(up)).normalize().scale(s.speed);this.player.setVelocity(vec.x,vec.y);}
  else{
   const velocity=s.genre==='runner'?Math.min(s.speed+this.elapsed*(3+s.difficulty),330):(Number(right)-Number(left))*s.speed;this.player.setVelocityX(velocity);
   if(body.blocked.down)this.jumps=0;
   if(jump&&!this.oldJump&&(body.blocked.down||(s.mechanics.doubleJump&&this.jumps<2))){this.player.setVelocityY(-325);this.jumps++;this.tone(420,.09);this.spark(this.player.x,this.player.y+12,0xb5edc0);}
   if(s.genre==='runner')this.distance+=dt*velocity;
  }
  if(body.velocity.x)this.player.setFlipX(body.velocity.x<0);
  if(dash&&s.mechanics.dash&&this.time.now-this.lastDash>1100){this.lastDash=this.time.now;this.player.setVelocityX((this.player.flipX?-1:1)*s.speed*2.5);this.spark(this.player.x,this.player.y,0xb5edc0);}
  if(s.mechanics.shooting&&(s.genre==='survival'||c.shoot||down('shoot'))&&this.time.now-this.lastShot>420){
   this.lastShot=this.time.now;let target:Enemy|undefined;let dist=Infinity;
   for(const e of this.enemies.getChildren() as Enemy[]){const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,e.x,e.y);if(d<dist){dist=d;target=e;}}
   if(target){const b=this.bullets.create(this.player.x,this.player.y,'crystal') as Phaser.Physics.Arcade.Sprite;b.setScale(.6).setTint(0xffd583);this.physics.moveToObject(b,target,340);this.time.delayedCall(1800,()=>{if(b.active)b.destroy();});this.tone(560,.035);}
  }
  this.oldJump=!!jump;
  for(const e of this.enemies.getChildren() as Enemy[]){if(s.genre==='survival')this.physics.moveToObject(e,this.player,22+s.difficulty*8);else {e.setVelocityX(Math.sin(this.elapsed*1.6+(e.home??0))*(25+s.difficulty*5));if(e.kind==='bat')e.setVelocityY(Math.cos(this.elapsed*2)*22);}}
  this.player.setAlpha(this.time.now-this.lastDamage<1200&&Math.floor(this.elapsed*12)%2===0?.45:1);this.background.tilePositionX=this.cameras.main.scrollX*.25;
  this.status.progress=s.genre==='survival'?this.status.score/s.goal:this.player.x/(this.worldWidth-100);
  if(s.genre!=='survival'&&this.player.x>=this.worldWidth-120){if(this.status.score>=s.goal)this.finish('won');else if(s.genre==='runner')this.finish('lost');}
  if(Math.floor(this.elapsed*5)!==Math.floor((this.elapsed-dt)*5))this.emit();
 }
}
export function createRuntime(parent:HTMLElement,spec:GameSpec,controls:RuntimeControls,onStatus:(s:GameStatus)=>void){
 const scene=new PlayScene(spec,controls,onStatus);
 const game=new Phaser.Game({type:Phaser.AUTO,parent,width:640,height:360,backgroundColor:'#172e2b',pixelArt:true,roundPixels:true,scene:[scene],physics:{default:'arcade',arcade:{gravity:{x:0,y:0},debug:false}},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true},banner:false});
 game.canvas.tabIndex=0;game.canvas.setAttribute('aria-label',`${spec.title} game. Arrow keys or WASD to move, space to jump, shift to dash. Survival fires automatically. Tab leaves the canvas.`);
 return {game,scene};
}
