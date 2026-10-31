// Input and asset regression fixture, never a production game template.
import type { CodeGame } from "../src/code-game";
export const engineGame: CodeGame = {
  format: "justplay-code-v1",
  runtimeVersion: 2,
  renderer: "canvas2d",
  assets: ["car", "tree"],
  title: "2D control regression",
  description: "Engine test",
  instructions: "Hold Drive and steer left. Reach the marker.",
  controls: [
    { label: "Drive", key: "KeyW" },
    { label: "Steer left", key: "KeyA" },
  ],
  notes: "Automated fixture",
  verification: [
    {
      name: "Driving moves the sprite",
      control: "KeyW",
      metric: "distance",
      steps: [{ frames: 60, keys: ["KeyW"] }],
    },
    {
      name: "Steering works while driving",
      control: "KeyA",
      metric: "lane",
      steps: [{ frames: 60, keys: ["KeyW", "KeyA"] }],
    },
  ],
  code: `function createGame({ctx,input,api,assets}) {
let distance=0,lane=0;const car=assets.image('car'),tree=assets.image('tree');
api.setHud({status:'Drive to the marker',stats:[{label:'Distance',value:0},{label:'Lane',value:0}]});
return {update(dt){if(input.keys.KeyW)distance+=dt*100;if(input.keys.KeyA&&input.keys.KeyW)lane-=dt*100;api.setHud({status:'Drive to the marker',stats:[{label:'Distance',value:distance.toFixed(1)},{label:'Lane',value:lane.toFixed(1)}]});},render(){ctx.fillStyle='#78a76c';ctx.fillRect(0,0,800,450);ctx.fillStyle='#47565c';ctx.fillRect(180,0,440,450);ctx.fillStyle='#fff4ce';for(let i=0;i<8;i++)ctx.fillRect(396,(i*80+distance)%500-50,8,35);ctx.drawImage(tree,25,180,128,160);ctx.drawImage(car,370+lane,280,64,96);},inspect(){return {phase:'playing',metrics:{distance,lane}};}};
}`,
};
