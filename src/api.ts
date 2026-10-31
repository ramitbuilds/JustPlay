import { validateSpec, type GameSpec } from './spec';
export async function requestGame(prompt:string,current?:GameSpec):Promise<GameSpec>{
 const response=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,current}),signal:AbortSignal.timeout(45000)});
 const data=await response.json().catch(()=>({error:'The AI proxy is unavailable. Deploy with the documented server bindings, or play a local example.'}));
 if(!response.ok)throw new Error(data.error||'Could not generate this game. Try again.');
 return validateSpec(data.spec);
}
