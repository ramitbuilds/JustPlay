// Trusted host only. Generated JavaScript is never evaluated in this document.
(() => {
  const canvas = document.querySelector("canvas");
  let worker = null,
    workerUrl = null,
    channel = null,
    lastBeat = 0,
    playing = false,
    sound = false,
    audio = null,
    lastSound = 0;
  const send = (type, data = {}) => {
    if (channel) parent.postMessage({ channel, type, ...data }, "*");
  };
  const stop = () => {
    worker?.terminate();
    worker = null;
    if (workerUrl) URL.revokeObjectURL(workerUrl);
    workerUrl = null;
    playing = false;
  };
  const workerHost = `
"use strict";
(() => {
 const post=self.postMessage.bind(self);
 const nativeSetInterval=self.setInterval.bind(self);
 const now=performance.now.bind(performance);
 // Remove ambient capabilities before running untrusted source. CSP independently blocks network.
 for(const name of ['Worker','SharedWorker','fetch','WebSocket','WebTransport','EventSource','XMLHttpRequest','importScripts','indexedDB','caches','BroadcastChannel']){
   for(let object=self;object;object=Object.getPrototypeOf(object)){
     if(Object.prototype.hasOwnProperty.call(object,name)){try{Object.defineProperty(object,name,{value:undefined,writable:false,configurable:false});}catch{}}
   }
 }
 const input={keys:Object.create(null),pressed:Object.create(null),pointer:{x:400,y:225,down:false,pressed:false,released:false}};
 let game=null,canvas=null,ctx=null,paused=true,last=0,frames=0,lastHud=-Infinity,lastSound=0;
 const api=Object.freeze({
   setHud(value){if(!value||typeof value!=='object'||now()-lastHud<40)return;lastHud=now();post({type:'hud',status:String(value.status??'').slice(0,220),stats:Array.isArray(value.stats)?value.stats.slice(0,6).map(x=>({label:String(x?.label??'').slice(0,24),value:String(x?.value??'').slice(0,40)})):[]});},
   finish(outcome,message){if(outcome!=='won'&&outcome!=='lost')return;paused=true;post({type:'finish',outcome,message:String(message??'').slice(0,240)});},
   sound(frequency=440,duration=.08){if(now()-lastSound<100)return;lastSound=now();post({type:'sound',frequency:Math.max(60,Math.min(1800,Number(frequency)||440)),duration:Math.max(.02,Math.min(.25,Number(duration)||.08))});}
 });
 self.onmessage=event=>{
  const value=event.data;
  if(value.type==='init'){
   canvas=value.canvas;ctx=canvas.getContext('2d');
   try{game=__JUSTPLAY_FACTORY__({canvas,ctx,input,api});if(!game||typeof game.update!=='function'||typeof game.render!=='function')throw new Error('createGame must return update(dt) and render().');game.render();post({type:'ready'});last=now();}
   catch(error){post({type:'error',message:String(error?.message??error).slice(0,700)});}
  }
  if(value.type==='playing'){paused=!value.playing;last=now();input.keys=Object.create(null);input.pressed=Object.create(null);input.pointer.down=false;post({type:'playing',playing:!paused});}
  if(value.type==='release'){input.keys=Object.create(null);input.pressed=Object.create(null);input.pointer.down=false;}
  if(value.type==='key'){if(value.down&&!input.keys[value.key])input.pressed[value.key]=true;input.keys[value.key]=!!value.down;}
  if(value.type==='pointer'){const pressed=input.pointer.pressed||value.pointer.pressed,released=input.pointer.released||value.pointer.released;Object.assign(input.pointer,value.pointer,{pressed,released});}
 };
 nativeSetInterval(()=>{
  if(!game)return;
  const time=now(),dt=Math.max(0,Math.min(.05,(time-last)/1000));last=time;
  try{
   if(!paused){game.update(dt);game.render();input.pressed=Object.create(null);input.pointer.pressed=false;input.pointer.released=false;frames++;}
   post({type:'beat',frames});
   if(frames===12&&canvas){
    frames++;const thumb=new OffscreenCanvas(320,180);thumb.getContext('2d').drawImage(canvas,0,0,320,180);
    thumb.convertToBlob({type:'image/png'}).then(blob=>{const data=new FileReaderSync().readAsDataURL(blob);if(data.length<180000)post({type:'thumbnail',data});}).catch(()=>{});
   }
  }catch(error){paused=true;game=null;post({type:'error',message:String(error?.message??error).slice(0,700)});}
 },16);
})();
`;
  function start(code) {
    stop();
    if (typeof code !== "string" || code.length > 40000) {
      send("error", {
        message: "The generated source is outside the size budget.",
      });
      return;
    }
    // Source is appended as a function expression only inside the isolated Worker blob.
    const source = workerHost.replace(
      "__JUSTPLAY_FACTORY__",
      () => "(() => {\n" + code + "\n; return createGame; })()",
    );
    const blob = new Blob([source], { type: "text/javascript" });
    workerUrl = URL.createObjectURL(blob);
    try {
      worker = new Worker(workerUrl);
      lastBeat = performance.now();
      let messageWindow = performance.now(),
        messageCount = 0;
      worker.onmessage = (event) => {
        if (performance.now() - messageWindow > 1000) {
          messageWindow = performance.now();
          messageCount = 0;
        }
        if (++messageCount > 240) {
          send("error", {
            message:
              "Generated code exceeded its message budget. Ask AI to repair it.",
          });
          stop();
          return;
        }
        const data = event.data;
        if (!data || typeof data.type !== "string") return;
        if (data.type === "beat") {
          lastBeat = performance.now();
          send("beat", { frames: Number(data.frames) || 0 });
          return;
        }
        if (data.type === "playing") {
          send("playing", { playing: !!data.playing });
          return;
        }
        if (data.type === "ready") {
          lastBeat = performance.now();
          send("ready");
          return;
        }
        if (data.type === "error") {
          send("error", {
            message: String(data.message ?? "Game code failed.").slice(0, 700),
          });
          stop();
          return;
        }
        if (data.type === "hud") {
          send("hud", {
            status: String(data.status ?? "").slice(0, 220),
            stats: Array.isArray(data.stats)
              ? data.stats.slice(0, 6).map((x) => ({
                  label: String(x?.label ?? "").slice(0, 24),
                  value: String(x?.value ?? "").slice(0, 40),
                }))
              : [],
          });
          return;
        }
        if (data.type === "finish" && ["won", "lost"].includes(data.outcome)) {
          playing = false;
          send("finish", {
            outcome: data.outcome,
            message: String(data.message ?? "").slice(0, 240),
          });
          return;
        }
        if (
          data.type === "thumbnail" &&
          typeof data.data === "string" &&
          data.data.length < 180000 &&
          /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data.data)
        )
          send("thumbnail", { data: data.data });
        if (
          data.type === "sound" &&
          sound &&
          performance.now() - lastSound > 100
        ) {
          lastSound = performance.now();
          try {
            audio ??= new AudioContext();
            const oscillator = audio.createOscillator(),
              gain = audio.createGain(),
              duration = Math.max(
                0.02,
                Math.min(0.25, Number(data.duration) || 0.08),
              );
            oscillator.type = "triangle";
            oscillator.frequency.value = Math.max(
              60,
              Math.min(1800, Number(data.frequency) || 440),
            );
            gain.gain.setValueAtTime(0.025, audio.currentTime);
            gain.gain.exponentialRampToValueAtTime(
              0.001,
              audio.currentTime + duration,
            );
            oscillator.connect(gain).connect(audio.destination);
            oscillator.start();
            oscillator.stop(audio.currentTime + duration);
          } catch {
            /* Audio is optional; keep gameplay running. */
          }
        }
      };
      worker.onerror = () => {
        send("error", {
          message:
            "The generated worker could not start. Ask AI to repair its source.",
        });
        stop();
      };
      const offscreen = canvas.transferControlToOffscreen();
      worker.postMessage({ type: "init", canvas: offscreen }, [offscreen]);
    } catch (error) {
      send("error", { message: String(error?.message ?? error).slice(0, 700) });
      stop();
    }
  }
  window.addEventListener("message", (event) => {
    if (
      event.source !== parent ||
      !event.data ||
      typeof event.data.channel !== "string"
    )
      return;
    const data = event.data;
    if (data.type === "init" && !channel) {
      channel = data.channel;
      start(data.code);
      return;
    }
    if (data.channel !== channel) return;
    if (data.type === "playing") {
      playing = !!data.playing;
      worker?.postMessage({ type: "playing", playing });
      if (playing && !data.probe) canvas.focus();
    }
    if (
      data.type === "key" &&
      typeof data.key === "string" &&
      data.key.length < 25
    )
      worker?.postMessage({ type: "key", key: data.key, down: !!data.down });
    if (data.type === "sound") {
      sound = !!data.enabled;
      if (sound) audio?.resume();
    }
    if (data.type === "stop") stop();
  });
  function key(event, down) {
    if (["Tab", "Escape"].includes(event.code)) return;
    event.preventDefault();
    if (sound) audio?.resume();
    worker?.postMessage({ type: "key", key: event.code, down });
  }
  canvas.addEventListener("keydown", (e) => key(e, true));
  canvas.addEventListener("keyup", (e) => key(e, false));
  const pointer = {
    x: 400,
    y: 225,
    down: false,
    pressed: false,
    released: false,
  };
  function point(event, type) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = Math.max(
      0,
      Math.min(800, ((event.clientX - rect.left) / rect.width) * 800),
    );
    pointer.y = Math.max(
      0,
      Math.min(450, ((event.clientY - rect.top) / rect.height) * 450),
    );
    pointer.pressed = type === "down";
    pointer.released = type === "up";
    if (type === "down") {
      pointer.down = true;
      canvas.focus();
      canvas.setPointerCapture(event.pointerId);
      audio?.resume();
    }
    if (type === "up") pointer.down = false;
    worker?.postMessage({ type: "pointer", pointer: { ...pointer } });
  }
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    point(e, "down");
  });
  canvas.addEventListener("pointermove", (e) => point(e, "move"));
  canvas.addEventListener("pointerup", (e) => point(e, "up"));
  canvas.addEventListener("pointercancel", (e) => point(e, "up"));
  window.addEventListener("blur", () => {
    worker?.postMessage({ type: "release" });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && playing) {
      playing = false;
      worker?.postMessage({ type: "playing", playing: false });
      send("blur");
    }
  });
  setInterval(() => {
    if (worker && performance.now() - lastBeat > 2600) {
      send("error", {
        message:
          "The generated game stopped responding. Its worker was terminated; ask AI to repair it.",
      });
      stop();
    }
  }, 500);
  window.addEventListener("pagehide", stop);
})();
