// Test-only source fixture. Production never imports this module.
export const manifest = {
  title: "Orbit painter",
  description: "A test of source execution and input",
  instructions: "Press Space three times to paint the orbit.",
  controls: [{ label: "Paint", key: "Space" }],
  notes: "Automated test fixture",
};
export const code = `function createGame({ctx,input,api}) {
let count=0; const color='#d8ed83';
return { update(dt) { if(input.pressed.Space) count++; api.setHud({status:'Paint the orbit',stats:[{label:'Paint',value:count}]}); if(count>=3) api.finish('won','Orbit painted'); },
render() { ctx.fillStyle='#202c27';ctx.fillRect(0,0,800,450);ctx.fillStyle=color;ctx.beginPath();ctx.arc(400,225,70+count*15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='24px sans-serif';ctx.fillText('Paint the orbit',290,80); } };
}`;
export const game = { ...manifest, format: "justplay-code-v1" as const, code };
export const source = "/*JUSTPLAY " + JSON.stringify(manifest) + " */\n" + code;
export const patch = {
  ...manifest,
  patches: [
    { find: "const color='#d8ed83';", replace: "const color='#ff8800';" },
  ],
};
