import { validateSpec, type GameSpec } from './spec';
export const examples: {prompt:string; spec:GameSpec; label:string}[] = [
 { label:'Crystalwood', prompt:'A fox collecting crystals in a lush magical forest platformer with enemies.', spec:validateSpec({schemaVersion:1,title:'Crystalwood',description:'Follow the fireflies. Gather crystals and find the ancient forest gate.',genre:'platformer',theme:'forest',hero:'fox',seed:8291,difficulty:2,speed:175,health:5,goal:10,mechanics:{doubleJump:true,dash:false,shooting:false},enemies:['slime'],night:false}) },
 { label:'Neon Drift', prompt:'A neon cyberpunk endless runner with obstacles and increasing speed.', spec:validateSpec({schemaVersion:1,title:'Neon Drift',description:'A rooftop escape above a city that never sleeps. Jump the barriers and collect energy.',genre:'runner',theme:'neon',hero:'robot',seed:4142,difficulty:2,speed:185,health:3,goal:15,mechanics:{doubleJump:true,dash:true,shooting:false},enemies:['bat'],night:true}) },
 { label:'The Last Lantern', prompt:'A top-down dungeon survival game with enemies, health and a win objective.', spec:validateSpec({schemaVersion:1,title:'The Last Lantern',description:'Keep your lantern burning. Defeat the creatures to open the dungeon seal.',genre:'survival',theme:'dungeon',hero:'knight',seed:1837,difficulty:2,speed:150,health:6,goal:12,mechanics:{doubleJump:false,dash:true,shooting:true},enemies:['slime','bat'],night:true}) },
];
// Explicit developer/test fixtures only. Never used as a silent network fallback.
export function editFixture(current:GameSpec,instruction:string):GameSpec {
 const spec = structuredClone(current);const text=instruction.toLowerCase();
 if(text.includes('harder'))spec.difficulty=Math.min(5,spec.difficulty+1);
 else if(text.includes('flying'))spec.enemies=Array.from(new Set([...spec.enemies,'bat']));
 else if(text.includes('night'))spec.night=true;
 else if(text.includes('double jump'))spec.mechanics.doubleJump=true;
 else throw new Error('Offline edits support: make it harder, add flying enemies, change to nighttime, give me a double jump. Configure AI for other edits.');
 return validateSpec(spec);
}
