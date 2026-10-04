var mf={family:'"Modesto Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif',weight:700,max:66,min:34,maxLines:3,lineHeight:1.04,tracking:.04,upper:!0},gf={family:'Signika, "Helvetica Neue", Arial, sans-serif',weight:700,max:32,min:28,maxLines:3,lineHeight:1.16,tracking:.01,upper:!1},$0={...mf,max:48,min:26,maxLines:3},q0={...gf,max:28,min:22,maxLines:2},pf='600 34px "Helvetica Neue", Arial, sans-serif';function Xr(n,t,e,i,s,r){n.beginPath(),n.roundRect(t,e,i,s,r)}var xf={id:"paper",name:"Paper",size:{w:280,h:468},thickness:9,fonts:["700 40px 'Modesto Condensed'","700 28px Signika"],stick:{length:134,collar:12170148,wood:13081186},materials:{body:{color:15196109,metalness:0,roughness:.9},face:{metalness:0,roughness:.85,clearcoat:.15},back:{metalness:0,roughness:.9}},async face(n,{loadImage:t,titleBlock:e}={}){let r=document.createElement("canvas");r.width=560,r.height=936;let o=r.getContext("2d");Xr(o,0,0,560,936,28),o.fillStyle="#f3ecdc",o.fill(),o.lineWidth=6,o.strokeStyle="#3b3226",Xr(o,6,6,548,924,24),o.stroke();let a=36,l=36,c=488,h=e?.fit(n,{width:c-56,maxHeight:236,gap:14,name:mf,text:gf})??null,u=h?Math.min(300,Math.max(104,Math.ceil(h.height)+44)):98,d=936-l-36-34-u;o.save(),Xr(o,a,l,c,d,14),o.clip(),o.fillStyle="#cfc6b0",o.fillRect(a,l,c,d);let f=n.portrait&&t?await t(n.portrait):null;if(f){let g=Math.max(c/f.width,d/f.height);o.drawImage(f,a+(c-f.width*g)/2,l+(d-f.height*g)*.15,f.width*g,f.height*g)}else o.fillStyle="#3b3226",o.font=`700 ${Math.round(Math.min(c,d)*.5)}px sans-serif`,o.textAlign="center",o.textBaseline="middle",o.fillText((n.name??"?").slice(0,1).toUpperCase(),a+c/2,l+d/2);o.restore(),n.colour&&(o.fillStyle=n.colour,o.fillRect(a,l+d+14,c,8));let x=l+d+34;return h?e.draw(o,h,{x:a,y:x,w:c,h:u},{ink:"#2b241a",textInk:"#4a3f2f",rule:"rgba(59,50,38,0.4)"}):(o.fillStyle="#3b3226",o.font=pf,o.textAlign="center",o.textBaseline="middle",o.fillText((n.name??n.id).toUpperCase(),560/2,x+(936-x-36)/2)),r},async back(n,{titleBlock:t}={}){let s=document.createElement("canvas");s.width=560,s.height=936;let r=s.getContext("2d");Xr(r,0,0,560,936,28),r.fillStyle="#b9966a",r.fill();let o=t?.fit(n,{width:372,maxHeight:200,gap:12,name:$0,text:q0})??null,a=o?Math.min(250,Math.max(88,Math.ceil(o.height)+40)):88;return r.fillStyle="#f3ecdc",Xr(r,560/2-206,936/2-a/2,412,a,6),r.fill(),o?t.draw(r,o,{x:560/2-206,y:936/2-a/2,w:412,h:a},{ink:"#2b241a",textInk:"#4a3f2f",rule:"rgba(59,50,38,0.4)"}):(r.fillStyle="#3b3226",r.font=pf,r.textAlign="center",r.textBaseline="middle",r.fillText(n.name??n.id,560/2,936/2+2)),s}};var Y0=["id","size","face","back"],ya=class{constructor(){this.skins=new Map,this.register(xf),this.current="paper"}register(t){for(let e of Y0)if(!t?.[e])throw new Error(`a skin needs "${e}"`);if(typeof t.face!="function"||typeof t.back!="function")throw new Error("a skin's face and back are functions");if(!(t.size?.w>0&&t.size?.h>0))throw new Error("a skin's size is { w, h } in pixels");return this.skins.set(t.id,{thickness:9,fonts:[],stick:{length:134,collar:12170148,wood:13081186},materials:{},...t}),t.id}get(t){return this.skins.get(t)??this.skins.get(this.current)??this.skins.get("paper")}use(t){if(!this.skins.has(t))throw new Error(`no skin "${t}" is registered`);this.current=t}list(){return[...this.skins.keys()]}};var Zr=Object.freeze(["off","zones","anywhere"]),j0=.15,vf=Object.freeze(["door","spot","area","exit","track","chalk","podium","photo","quiet","music","shelter","shot","trigger"]),Cs=n=>typeof n=="number"&&Number.isFinite(n),yf=(n,t=-.25,e=1.25)=>Cs(n)&&n>=t&&n<=e,As=n=>Array.isArray(n)&&n.length===2&&yf(n[0])&&yf(n[1]),Ae=(n,t)=>Cs(n)?n:t,qe=(n,t="")=>typeof n=="string"?n:t;function Hh(n,t,e,i=0){if(!Array.isArray(n))return e.push(`${t}: expected a list of [x, y] points`),[];let s=[];return n.forEach((r,o)=>As(r)?s.push([r[0],r[1]]):e.push(`${t}[${o}]: not a point on the painting`)),s.length<i&&e.push(`${t}: needs at least ${i} points`),s}function _f(n,t,e){let i=new Set;return n.filter(s=>s.id?i.has(s.id)?(e.push(`${t}: id "${s.id}" is used twice`),!1):(i.add(s.id),!0):(e.push(`${t}: an entry has no id`),!1))}function _a(n){let t=[],e=n&&typeof n=="object"?n:{};(!n||typeof n!="object")&&t.push("the scene carries no stage description");let i={src:qe(e.painting?.src),size:Array.isArray(e.painting?.size)&&e.painting.size.length===2&&e.painting.size.every(g=>Cs(g)&&g>0)?[e.painting.size[0],e.painting.size[1]]:null};i.src||t.push("painting.src: the stage needs a painting"),i.size||t.push("painting.size: give the painting's size in pixels, [width, height]");let s={horizon:Ae(e.rig?.horizon,null),floorFront:Ae(e.rig?.floorFront,null),depth:Ae(e.rig?.depth,null),vanish:Ae(e.rig?.vanish,.5),lift:Ae(e.rig?.lift,0)};for(let g of["horizon","floorFront","depth"])s[g]===null&&t.push(`rig.${g}: the rig needs a number here`);s.horizon!==null&&s.floorFront!==null&&s.floorFront<=s.horizon&&t.push("rig: the floor must meet the front of the picture below the horizon"),s.depth!==null&&s.depth<=0&&t.push("rig.depth: must be above zero");let r=(Array.isArray(e.lights)?e.lights:[]).flatMap((g,p)=>{if(!As(g?.at))return t.push(`lights[${p}].at: not a point on the painting`),[];let m=Array.isArray(g.colour)&&g.colour.length===3&&g.colour.every(Cs)?g.colour.map(v=>Math.max(0,Math.min(255,v))):[255,172,96];return[{id:qe(g.id,`light-${p+1}`),at:[g.at[0],g.at[1]],below:Ae(g.below,.9),colour:m,intensity:Math.max(0,Ae(g.intensity,1)),flicker:Math.max(0,Math.min(.5,Ae(g.flicker,.05))),flickerHz:Math.max(.5,Ae(g.flickerHz,7)),pool:Cs(g.pool)&&g.pool>0?g.pool:0,shadow:g.shadow===!0}]}),o=(Array.isArray(e.occluders)?e.occluders:[]).flatMap((g,p)=>{let m=Hh(g?.poly,`occluders[${p}].poly`,t,3);return m.length<3?[]:[{id:qe(g.id,`occluder-${p+1}`),poly:m,base:Ae(g.base,.86),x:Ae(g.x,.5),riser:g.riser!==!1,hideAtMost:Math.max(.05,Math.min(1,Ae(g.hideAtMost,j0)))}]}),a=(Array.isArray(e.zones)?e.zones:[]).flatMap((g,p)=>{let m=Hh(g?.shape,`zones[${p}].shape`,t,3);if(m.length<3)return[];let v=g.floor===void 0?null:Hh(g.floor,`zones[${p}].floor`,t,3),E=Array.isArray(g.tags)?g.tags.filter(w=>typeof w=="string"&&w.trim()).map(w=>w.trim()):[],M=Array.isArray(g.near)?g.near.filter(w=>typeof w=="string"):[],T=Array.isArray(g.colour)&&g.colour.length===3&&g.colour.every(Cs)?g.colour.map(w=>Math.max(0,Math.min(255,w))):null;return[{id:qe(g.id),kind:qe(g.kind,"trigger")||"trigger",name:qe(g.name),hint:qe(g.hint),shape:m,floor:v&&v.length>=3?v:null,quiet:g.quiet===!0,gate:["open","ask","locked","hidden"].includes(g.gate)?g.gate:"open",to:qe(g.to),tags:E,near:M,colour:T}]}),l=_f(a,"zones",t);for(let g of l)for(let p of g.near)l.some(m=>m.id===p)||t.push(`zones: "${g.id}" is near "${p}", which is not in this scene`);let c=(Array.isArray(e.marks)?e.marks:[]).flatMap((g,p)=>{if(!As(g?.at))return t.push(`marks[${p}].at: not a point on the painting`),[];let m=g.faces&&typeof g.faces=="object"?As(g.faces.point)?{point:[g.faces.point[0],g.faces.point[1]]}:qe(g.faces.zone)?{zone:qe(g.faces.zone)}:qe(g.faces.card)?{card:qe(g.faces.card)}:null:null;return[{id:qe(g.id),at:[g.at[0],g.at[1]],yaw:Ae(g.yaw,0),lean:Ae(g.lean,0),pitch:Ae(g.pitch,0),lift:Math.max(0,Ae(g.lift,0)),capacity:Math.max(1,Math.round(Ae(g.capacity,1))),label:qe(g.label),group:qe(g.group),zone:qe(g.zone),faces:m}]}),h=_f(c,"marks",t);for(let g of h)g.zone&&!l.some(p=>p.id===g.zone)&&t.push(`marks: "${g.id}" belongs to zone "${g.zone}", which is not in this scene`);for(let g of h)g.faces?.zone&&!l.some(p=>p.id===g.faces.zone)&&t.push(`marks: "${g.id}" faces zone "${g.faces.zone}", which is not in this scene`);let u=Zr.includes(e.chalk?.mode)?e.chalk.mode:"off";e.chalk?.mode!==void 0&&!Zr.includes(e.chalk.mode)&&t.push(`chalk.mode: "${e.chalk.mode}" is not one of ${Zr.join(", ")}`);let d={mode:u,lock:e.chalk?.lock===!0,weather:e.chalk?.weather===!0,box:As(e.chalk?.box)?[e.chalk.box[0],e.chalk.box[1]]:null};d.mode==="zones"&&!l.some(g=>g.kind==="chalk")&&t.push("chalk: the mode is zones but the scene has no zone of kind chalk");let f={version:1,painting:i,rig:s,skin:qe(e.skin),cardScale:Math.max(.2,Math.min(2,Ae(e.cardScale,.7))),ambient:Math.max(0,Ae(e.ambient,1.7)),lights:r,occluders:o,zones:l,marks:h,chalk:d,marksOnly:e.marksOnly===!0,footlights:e.footlights===!0,focus:As(e.focus)?[e.focus[0],e.focus[1]]:null,board:e.board===!0,reach:{snap:Math.max(40,Ae(e.reach?.snap,170)),show:Math.max(200,Ae(e.reach?.show,700))}},x=!!(i.src&&i.size&&s.horizon!==null&&s.floorFront!==null&&s.depth!==null);return{ok:t.length===0,usable:x,scene:f,problems:t}}var nt="stagecraft",$r=n=>n?.flags?.[nt]?.stage??null,Rs=n=>!!$r(n)&&typeof $r(n)=="object",Qn=n=>Array.isArray(n?.flags?.[nt]?.published?.cards)?n.flags[nt].published.cards:[];function Ps(n){let t=_a($r(n));return t.usable&&t.scene.painting.src&&globalThis.foundry?.utils?.getRoute&&(t.scene.painting.src=foundry.utils.getRoute(t.scene.painting.src)),t}function qr(n){let t=globalThis.foundry?.utils?.getRoute??(e=>e);return Qn(n).filter(e=>e&&typeof e.id=="string").map(e=>({...e,portrait:e.portrait?t(e.portrait):e.portrait}))}function Sn(){if(!game.user?.isGM)return!1;let n=game.users?.activeGM;return n?n.id===game.user.id:!0}var Is=n=>n?.flags?.[nt]?.live?.handsOff===!0;function Mf(n,t,{handsOff:e=!1}={}){return t?.isGM?!0:e?!1:!Array.isArray(n?.owners)||n.owners.length===0?!0:n.owners.includes(t?.id)}var wn=Object.freeze({ignore:30,take:90,least:30,fineMs:20,slowRatio:1.4,veryRatio:2.2,display:16.666666666666668,patience:12e3,settle:4e3,again:45e3,keepHours:12}),Ls=Object.freeze(["high","low","flat"]),J0=n=>Ls[Ls.indexOf(n)+1]??null,bf=(n,t)=>Ls.indexOf(n)>=Ls.indexOf(t)?n:t,K0=n=>n.length?n[Math.floor(n.length/2)]:0,Q0=Object.freeze([30,60,72,75,90,100,120,144,165,240]);function Sf(n,t=wn){let e=(n??[]).filter(r=>Number.isFinite(r)&&r>0).sort((r,o)=>r-o);if(e.length<8)return t.display;let i=e[Math.floor(e.length*.2)];if(i<1e3/244||i>1e3/28)return t.display;let s=Q0.find(r=>1e3/r<=i*1.05);return s?1e3/s:t.display}function wf(n,t=Date.now(),e=wn){return Number.isFinite(n)&&t-n>=0&&t-n<e.keepHours*3600*1e3}var va=class{constructor(t=wn){this.limits=t,this.seen=0,this.gaps=[],this.began=null,this.previous=null}push(t){this.began??=t,this.elapsed=t-this.began;let e=this.previous===null?null:t-this.previous;this.previous=t,!(e===null||++this.seen<=this.limits.ignore)&&Number.isFinite(e)&&e>=0&&this.gaps.length<this.limits.take&&this.gaps.push(e)}get done(){return this.gaps.length>=this.limits.take||(this.elapsed??0)>=this.limits.patience}result(){let t=[...this.gaps].sort((e,i)=>e-i);return{n:t.length,median:K0(t),p90:t.length?t[Math.min(t.length-1,Math.floor(t.length*.9))]:0}}};function Tf(n,{limits:t=wn,display:e=null,cap:i=60,patient:s=!1}={}){if(n.n<t.least)return s&&n.n>=8?"very-slow":"unknown";if(n.median<=t.fineMs)return"ok";let r=Number.isFinite(i)&&i>0?Math.min(i,60):60,o=Math.max(1e3/r,e??t.display),a=n.median/o;return a>t.veryRatio?"very-slow":a>t.slowRatio?"slow":"ok"}function Ef({tier:n,verdict:t,strikes:e=0,hard:i=0}){if(n==="flat"||n==null)return{to:null,strikes:0,hard:0};if(t==="ok")return{to:null,strikes:0,hard:0};if(t!=="slow"&&t!=="very-slow")return{to:null,strikes:e,hard:i};let s=e+1,r=i+(t==="very-slow"?1:0);return s<2?{to:null,strikes:s,hard:r}:{to:r>=2?"flat":J0(n),strikes:0,hard:0}}var ts=Object.freeze({cap:60,idle:30,wake:1500,walking:.5,still:.02,early:1.5});function Af({fps:n,mode:t=null,max:e=null}={}){let i=Number.isFinite(Number(n))&&Number(n)>0?Number(n):ts.cap;return e!==null&&t===e&&i>=60?1/0:Math.max(10,Math.min(60,i))}var Ma=class{constructor({cap:t=ts.cap,idle:e=ts.idle,wake:i=ts.wake,easing:s=!0}={}){this.cap=t,this.idle=e,this.wake=i,this.easing=s,this.awakeUntil=-1/0,this.next=-1/0}poke(t){this.awakeUntil=Math.max(this.awakeUntil,t+this.wake)}active(t){return!this.easing||t<this.awakeUntil}gap(t){let e=this.active(t)?this.cap:Math.min(this.cap,this.idle);return e===1/0?0:1e3/e}due(t){return t>=this.next-ts.early}drew(t){let e=this.gap(t);if(!e){this.next=t;return}this.next=this.next+e<t-e?t:this.next+e}scale(t){let e=this.cap===1/0?0:1e3/this.cap,i=this.gap(t);return e&&i?e/i:1}};function Cf(n){let t=new Float32Array(n.length*4),e=0;for(let i of n)t[e++]=i.x??0,t[e++]=i.z??0,t[e++]=i.grip??0,t[e++]=i.down??0;return t}function Rf(n,t,{walking:e=ts.walking,still:i=ts.still}={}){if(!n||n.length!==t.length)return n!=null;for(let s=0;s<t.length;s++){let r=s&2?i:e;if(Math.abs(t[s]-n[s])>r)return!0}return!1}function Pf({tier:n,webgl:t,failed:e=!1,software:i=!1}){return n==="flat"||!t||e||i?"flat":"three"}var tx=/swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i,ex=n=>tx.test(String(n??"")),Gh=null;function Tn(n=globalThis.document){if(Gh!==null)return Gh;let t={ok:!1,renderer:""};try{let e=n.createElement("canvas"),i=e.getContext("webgl2")??e.getContext("webgl");if(i){let s=i.getExtension?.("WEBGL_debug_renderer_info");t={ok:!0,renderer:String((s?i.getParameter?.(s.UNMASKED_RENDERER_WEBGL):i.getParameter?.(i.RENDERER))??"")},i.getExtension?.("WEBGL_lose_context")?.loseContext()}}catch{t={ok:!1,renderer:""}}return Gh=t,t}var If=n=>Tn(n).ok,Lf=n=>{let t=Tn(n);return t.ok&&ex(t.renderer)};var Vh="stagecraft.speed",kf=()=>Tn().renderer||"unknown";function Wh({now:n=Date.now(),limits:t={...wn,...globalThis.__stagecraftSpeed??{}}}={}){try{let e=JSON.parse(globalThis.localStorage?.getItem(Vh)??"null");return!e||e.gpu!==kf()||e.tier&&!Ls.includes(e.tier)||e.tier&&!wf(e.at,n,t)?null:{ok:e.ok===!0,tier:e.tier??null,at:e.at??null}}catch{return null}}function Xh({ok:n=!1,tier:t=null}){try{globalThis.localStorage?.setItem(Vh,JSON.stringify({gpu:kf(),ok:n,tier:t,at:Date.now()}))}catch{}}function Df(){try{globalThis.localStorage?.removeItem(Vh)}catch{}}var Nf=()=>Wh()?.tier??null;function Of(){let n=foundry.data.fields;game.settings.register(nt,"tier",{name:"STAGECRAFT.Settings.Tier.Name",hint:"STAGECRAFT.Settings.Tier.Hint",scope:"client",config:!0,requiresReload:!1,type:new n.StringField({required:!0,blank:!1,initial:"auto",choices:{auto:"STAGECRAFT.Settings.Tier.Auto",high:"STAGECRAFT.Settings.Tier.High",low:"STAGECRAFT.Settings.Tier.Low",flat:"STAGECRAFT.Settings.Tier.Flat"}}),onChange:()=>{Df(),Hooks.callAll("stagecraft.settingsChanged","tier")}}),game.settings.register(nt,"zones",{name:"STAGECRAFT.Settings.Zones.Name",hint:"STAGECRAFT.Settings.Zones.Hint",scope:"client",config:!0,type:new n.StringField({required:!0,blank:!1,initial:"off",choices:{off:"STAGECRAFT.Settings.Zones.Off",faint:"STAGECRAFT.Settings.Zones.Faint",full:"STAGECRAFT.Settings.Zones.Full"}}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","zones")}),game.settings.register(nt,"power",{name:"STAGECRAFT.Settings.Power.Name",hint:"STAGECRAFT.Settings.Power.Hint",scope:"client",config:!0,type:new n.BooleanField({initial:!0}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","power")}),game.settings.register(nt,"calm",{name:"STAGECRAFT.Settings.Calm.Name",hint:"STAGECRAFT.Settings.Calm.Hint",scope:"client",config:!0,type:new n.BooleanField({initial:!1}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","calm")})}var ba=()=>game.settings.get(nt,"tier");function es(){let n=game.settings.get(nt,"tier");if(n==="high"||n==="low"||n==="flat")return n;let t=game.settings.get("core","performanceMode"),e=t!==null&&t<=CONST.CANVAS_PERFORMANCE_MODES.LOW?"low":"high";return bf(e,Nf()??"high")}function Sa(){return game.settings.get(nt,"calm")||game.settings.get("core","photosensitiveMode")?!0:!!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches}var wa=()=>game.settings.get(nt,"zones"),Zh=()=>game.settings.get(nt,"power")!==!1,Ff=()=>Af({fps:game.settings.get("core","maxFPS"),mode:game.settings.get("core","performanceMode")??null,max:globalThis.CONST?.CANVAS_PERFORMANCE_MODES?.MAX??null});var Bf=(n,t,e)=>Math.max(t,Math.min(e,n)),ix=(n,t,e)=>n+(t-n)*e,nx=Math.PI/180;function zf(n){let t=n>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function Yr(n,t=0){let e=Math.floor(n),i=n-e,s=o=>{let a=Math.imul(o+t*7919|0,668265261);return a^=a>>>15,a=Math.imul(a,2246822507),a^=a>>>13,(a>>>0)/4294967296*2-1},r=i*i*(3-2*i);return ix(s(e),s(e+1),r)}function Hf(n,t,e,i,s=.5,r=0,o=.5){let a=Math.max(e/n,i/t),l=(e-n*a)*o,c=(i-t*a)*s-r;return{s:a,ox:l,oy:c,lift:r,x:h=>l+h*n*a,y:h=>c+h*t*a}}function Gf(n,t,e){return{f:n.depth*e,cx:t.x(n.vanish??.5),cy:t.y(n.horizon),floorY:t.y(n.floorFront),map:t}}function $h(n,t,e,i){let s=n.f/(n.f-i);return{sx:n.cx+(t-n.cx)*s,sy:n.cy+(e-n.cy)*s,k:s}}function sx(n,t,e){let i=(e-n.cy)/(n.floorY-n.cy);if(i<=0)return null;let s=n.f-n.f/i;return{x:n.cx+(t-n.cx)/i,z:s}}function Vf(n,t,e){return sx(n,n.map.x(t),n.map.y(e))}function gi(n,t,e,i){return Math.atan2(e-n,i-t)/nx}function xi(n,{share:t=.62,max:e=52}={}){let i=(n+540)%360-180;return Math.abs(i)>90&&(i=Math.sign(i)*(180-Math.abs(i))*.5+Math.sign(i)*35),Bf(i*t,-e,e)}function Wf(n,t,e,{gap:i=380,spread:s=150,depthStep:r=60}={}){let o=[];return t.forEach((a,l)=>{let c=n.x-i/2-l*s*.7,h=n.z-l*r;o.push({x:c,z:h,yaw:xi(gi(c,h,n.x+i/2,n.z),{share:.75,max:48}),lean:0,pitch:-3})}),e.forEach((a,l)=>{let c=n.x+i/2+l*s*.7,h=n.z-l*r;o.push({x:c,z:h,yaw:xi(gi(c,h,n.x-i/2,n.z),{share:.75,max:48}),lean:0,pitch:-3})}),o}var Uf=Object.freeze({calm:{breathe:.006,breatheHz:.22,sway:.5,swayHz:.09,fidget:0,pitch:0,lean:0,glance:.7},nervous:{breathe:.01,breatheHz:.45,sway:1.1,swayHz:.6,fidget:.25,pitch:2,lean:0,glance:1.2,jitter:.6},proud:{breathe:.007,breatheHz:.18,sway:.3,swayHz:.07,fidget:0,pitch:-4,lean:0,glance:.4},slouch:{breathe:.008,breatheHz:.15,sway:.9,swayHz:.06,fidget:.05,pitch:3,lean:4,glance:.3},bouncy:{breathe:.009,breatheHz:.5,sway:.8,swayHz:.35,fidget:.4,pitch:0,lean:0,glance:1,hop:6},sly:{breathe:.006,breatheHz:.2,sway:.6,swayHz:.12,fidget:.1,pitch:4,lean:-3,glance:1.4}});function Xf(n,t,e="calm",{speakerYaw:i=null}={}){let s=Uf[e]??Uf.calm,r=t%1e3/1e3,o=1+s.breathe*Math.sin(2*Math.PI*(n*s.breatheHz+r)),a=s.lean+s.sway*Yr(n*s.swayHz*4+r*10,t),l=0;if(s.jitter&&(a+=s.jitter*Yr(n*9+r*31,t+3)*.6),s.fidget){let h=Math.floor(n*s.fidget+r*7),u=n*s.fidget+r*7-h,d=Math.abs(Yr(h*1.7,t+11));if(d>.55&&u<.18){let f=Math.sin(u/.18*Math.PI);l+=(s.hop??3)*f,a+=2.5*f*(d>.8?1:-1)}}let c=i===null?0:Bf(i,-1,1)*6*s.glance;return{breathe:o,lean:a,pitch:s.pitch,lift:l,yaw:c}}var k1=Object.freeze({dust:{rate:26,life:[5,9],size:[1.2,2.8],vy:[-6,6],vx:[-8,8],vz:[-6,6],gravity:0,drag:.4,glow:!0},smoke:{rate:5,life:[5,8],size:[26,46],vy:[-26,-14],vx:[-6,6],vz:[-4,4],gravity:0,drag:.2,grow:9,soft:!0},steam:{rate:9,life:[3.5,6],size:[30,56],vy:[-34,-18],vx:[-8,8],vz:[-6,6],gravity:0,drag:.2,grow:14,soft:!0},sparks:{rate:60,life:[.5,1.1],size:[1.6,3],vy:[-260,-90],vx:[-140,140],vz:[-60,60],gravity:520,drag:.1,glow:!0,bounce:.35,streak:!0},petals:{rate:3,life:[9,14],size:[5,8],vy:[10,22],vx:[-22,4],vz:[-6,6],gravity:0,drag:.1,settle:!0,spin:!0},snow:{rate:30,life:[18,26],size:[1.6,3.6],vy:[50,80],vx:[-10,10],vz:[-10,10],gravity:0,drag:.1,settle:!0},rain:{rate:240,life:[.9,1.3],size:[1,1.6],vy:[900,1200],vx:[-90,-60],vz:[0,0],gravity:0,drag:0,streak:!0,splash:!0}});var Zf=(n,t,e)=>Math.max(t,Math.min(e,n)),qh=Object.freeze({follow:42,stiffness:150,damping:9,lag:.5,maxLean:15,jostleK:110,jostleC:11,bumpSpin:.009,bonkSpeed:120,shove:.35,maxJolt:70,growK:220,growC:22,parked:.5,held:1,hopTime:.42,hopHeight:74,nodTime:.34,bowTime:.95,shakeTime:.62});function $f({id:n,x:t,y:e,scale:i=1,home:s="stage",owner:r=null,rod:o=112,w:a=230,h:l=393}){return{id:n,owner:r,home:s,rod:o,w:a,h:l,x:t,y:e,vx:0,vy:0,ax:0,restX:t,restY:e,lean:0,leanV:0,jx:0,jv:0,scale:i,scaleV:0,scaleTo:i,turn:0,turnV:0,turnTo:0,heldBy:null,target:null,verbs:[]}}var rx=Object.freeze(["hop","nod","bow","shake","turn"]);function Yh(n,t){return t==="turn"?(n.turnTo=n.turnTo?0:180,n):(rx.includes(t)&&n.verbs.push({verb:t,t:0}),n)}function qf(n,t,e=qh){let i=n.target?n.target.x:n.restX,s=n.target?n.target.y:n.restY,r=e.follow,o=r*r*(i-n.x)-2*r*n.vx,a=r*r*(s-n.y)-2*r*n.vy;n.vx+=o*t,n.vy+=a*t,n.x+=n.vx*t,n.y+=n.vy*t,n.ax=o;let l=-e.stiffness*n.lean-e.damping*n.leanV-e.lag*e.stiffness/1e3*o;n.leanV+=l*t,n.lean+=n.leanV*t,n.lean=Zf(n.lean,-e.maxLean*1.6,e.maxLean*1.6);let c=-e.jostleK*n.jx-e.jostleC*n.jv;n.jv+=c*t,n.jx+=n.jv*t;let h=e.growK*(n.scaleTo-n.scale)-e.growC*n.scaleV;n.scaleV+=h*t,n.scale+=n.scaleV*t;let u=160*(n.turnTo-n.turn)-18*n.turnV;n.turnV+=u*t,n.turn+=n.turnV*t;for(let d of n.verbs)d.t+=t;return n.verbs=n.verbs.filter(d=>d.t<Yf(d.verb,e)),n}function Yf(n,t){return n==="hop"?t.hopTime:n==="nod"?t.nodTime:n==="bow"?t.bowTime:t.shakeTime}function jf(n,t=qh){let e=0,i=1,s=0,r=0,o=0;for(let a of n.verbs){let l=a.t/Yf(a.verb,t);a.verb==="hop"?(e+=4*t.hopHeight*l*(1-l),l<.12&&(i*=1-.1*Math.sin(l/.12*Math.PI)),l>.86&&(i*=1-.12*Math.sin((l-.86)/.14*Math.PI))):a.verb==="nod"?(o+=12*Math.sin(l*Math.PI),i*=1-.04*Math.sin(l*Math.PI)):a.verb==="bow"?s+=34*Math.sin(Math.min(1,l*1.6)*Math.PI*.5)*(l<.62?1:Math.max(0,(1-l)/.38)):a.verb==="shake"&&(r+=18*Math.exp(-3.2*l)*Math.sin(l*4*2*Math.PI))}return{lift:e,squash:i,tipX:s,shakeY:r,dip:o}}function jr(n){let t=n.scale,e=n.x+n.jx-n.w*t/2,i=n.y-n.rod*t;return{left:e,right:e+n.w*t,top:i-n.h*t,bottom:i}}function Jf(n,t=new Set,e=qh){let i=[],s=new Set,r=o=>Zf(o,-e.maxJolt,e.maxJolt);for(let o=0;o<n.length;o++)for(let a=o+1;a<n.length;a++){let l=n[o],c=n[a];if(!l.heldBy&&!c.heldBy||l.home==="wings"||c.home==="wings")continue;let h=jr(l),u=jr(c),d=Math.min(h.right,u.right)-Math.max(h.left,u.left),f=Math.min(h.bottom,u.bottom)-Math.max(h.top,u.top);if(d<=0||f<=0)continue;let x=(h.left+h.right)/2<(u.left+u.right)/2?1:-1,g=l.heldBy&&!c.heldBy?.15:!l.heldBy&&c.heldBy?.85:.5,p=1-g,m=`${l.id}|${c.id}`;if(s.add(m),l.heldBy&&c.heldBy&&(l.jx=r(l.jx-x*d*e.shove),c.jx=r(c.jx+x*d*e.shove)),t.has(m))continue;let v=Math.abs(l.vx-c.vx);v<e.bonkSpeed||(l.jv-=x*v*.3*g,c.jv+=x*v*.3*p,l.leanV-=x*v*e.bumpSpin*6,c.leanV+=x*v*e.bumpSpin*14*p,i.push({a:l.id,b:c.id,x:x>0?h.right-d/2:h.left+d/2,y:Math.max(h.top,u.top)+f*.3,speed:v}))}for(let o of n)o.jx=r(o.jx);t.clear();for(let o of s)t.add(o);return i}function Kf(n,t,e,i,s=33){return n?i-n.t<s?!1:Math.abs(t-n.x)+Math.abs(e-n.y)>.75:!0}var Ta=class{constructor({delay:t=100,max:e=32}={}){this.delay=t,this.max=e,this.samples=[]}push(t){this.samples.push(t),this.samples.sort((e,i)=>e.t-i.t),this.samples.length>this.max&&this.samples.shift()}at(t){let e=this.samples;if(!e.length)return null;let i=t-this.delay;if(i<=e[0].t)return{x:e[0].x,y:e[0].y};for(let l=1;l<e.length;l++)if(e[l].t>=i){let c=e[l-1],h=e[l],u=(i-c.t)/Math.max(1,h.t-c.t);return{x:c.x+(h.x-c.x)*u,y:c.y+(h.y-c.y)*u}}let s=e[e.length-1],r=e[e.length-2]??s,o=Math.min(i-s.t,80),a=Math.max(1,s.t-r.t);return{x:s.x+(s.x-r.x)/a*o,y:s.y+(s.y-r.y)/a*o}}};function Qf(n,t){return n?t?n.t!==t.t?n.t<t.t?n:t:n.user<t.user?n:t:n:t}var Ea=Object.freeze({W:2560,H:1440}),Ti=12e3,Jr=-(Ti-1500);function ks(n,t,e=Ea){let[i,s]=n.size,r=Hf(i,s,e.W,e.H,.5,t.lift??0,.5),o=Gf(t,r,e.W),a=(c,h)=>[(c-r.ox)/(i*r.s),(h-r.oy)/(s*r.s)],l=c=>{let h=Vf(o,c[0],c[1]);return h?{X:h.x-o.cx,Z:h.z}:null};return{ref:e,map:r,cam:o,size:[i,s],standing:l,place(c){let h=l(c);return!h||h.Z>=Jr?h:{X:h.X*(o.f-Jr)/(o.f-h.Z),Z:Jr}},fractionOf(c,h){let u=$h(o,c+o.cx,o.floorY,h);return a(u.sx,u.sy)},screenOf(c,h,u){let d=$h(o,c+o.cx,o.floorY-h,u);return{x:d.sx,y:d.sy,k:d.k}},fractionOfScreen:a}}var ox=.5;function Aa(n,t,{ease:e=ox,most:i=2.2}={}){if(!(t<0))return 1;let s=n.f/(n.f-t);return Math.min(i,Math.max(1,s**-e))}function Kr(n,t,e=Ea){let i=Math.max(n/e.W,t/e.H),s=n/i,r=t/i;return{vw:n,vh:t,s:i,ox:(e.W-s)/2,oy:(e.H-r)/2,visW:s,visH:r}}var Qr=Object.freeze({rest:"rest",near:"near",target:"target"}),tp=Object.freeze({faint:.2,off:0,full:1});function on(n,t,e){let i=!1;for(let s=0,r=n.length-1;s<n.length;r=s++){let[o,a]=n[s],[l,c]=n[r];a>e!=c>e&&t<(l-o)*(e-a)/(c-a)+o&&(i=!i)}return i}function jh(n,t,e){let i=1/0;for(let s=0,r=n.length-1;s<n.length;r=s++){let[o,a]=n[r],[l,c]=n[s],h=l-o,u=c-a,d=h*h+u*u,f=d===0?0:Math.max(0,Math.min(1,((t-o)*h+(e-a)*u)/d));i=Math.min(i,Math.hypot(t-(o+f*h),e-(a+f*u)))}return i}function Jh(n){let t=0,e=0;for(let[i,s]of n)t+=i,e+=s;return[t/n.length,e/n.length]}var to=n=>n.floor&&n.floor.length>=3?n.floor:n.shape;function Ds(n,t,e){return n.filter(i=>on(to(i),t,e))}function ep(n,t,e=.1){let i={};for(let s of n){let r=Qr.rest,o=to(s);for(let a of t){if(on(o,a.x,a.y)){r=Qr.target;break}jh(o,a.x,a.y)<=e&&(r=Qr.near)}i[s.id]=r}return i}function Kh(n,t,e="faint"){return t===Qr.target?1:t===Qr.near?.85:n.quiet||n.kind==="chalk"?0:tp[e]??tp.faint}function ax(n,t){let e=to(n),i=to(t);if(e.some(([r,o])=>on(i,r,o))||i.some(([r,o])=>on(e,r,o)))return 0;let s=1/0;for(let[r,o]of e)s=Math.min(s,jh(i,r,o));for(let[r,o]of i)s=Math.min(s,jh(e,r,o));return s}function ip(n,{touch:t=.035}={}){let e=n.filter(a=>a.kind==="area"),i=new Set(e.map(a=>a.id)),s=new Map,r=(a,l)=>{if(a===l||!i.has(a)||!i.has(l))return;let[c,h]=a<l?[a,l]:[l,a];s.set(`${c}|${h}`,{a:c,b:h})};if(e.some(a=>Array.isArray(a.near)&&a.near.length))for(let a of e)for(let l of a.near??[])r(a.id,l);else for(let a=0;a<e.length;a++)for(let l=a+1;l<e.length;l++)ax(e[a],e[l])<=t&&r(e[a].id,e[l].id);return[...s.values()].sort((a,l)=>a.a+a.b<l.a+l.b?-1:1)}function Qh(n,t,{w:e=180,deep:i=160,most:s=24}={}){let r=to(n),o=r.map(g=>t.standing(g)).filter(Boolean);if(o.length<3)return[];let a=o.map(g=>g.X),l=o.map(g=>g.Z),[c,h,u,d]=[Math.min(...a),Math.max(...a),Math.max(Jr,Math.min(...l)),Math.max(...l)],f=t.standing(Jh(r))??{X:(c+h)/2,Z:(u+d)/2},x=[];for(let g=d-i/2;g>=u;g-=i)for(let p=c+e/2;p<=h;p+=e){let m=t.fractionOf(p,g);on(r,m[0],m[1])&&x.push({X:p,Z:g})}return x.sort((g,p)=>Math.hypot(g.X-f.X,(g.Z-f.Z)*.8)-Math.hypot(p.X-f.X,(p.Z-f.Z)*.8)),x.slice(0,s)}function np(n,t){let e=[];for(let[i,s]of t){let r=n.get(i)??new Set;for(let o of s)r.has(o)||e.push({type:"zone",card:i,zone:o,entered:!0})}for(let[i,s]of n){let r=t.get(i)??new Set;for(let o of s)r.has(o)||e.push({type:"zone",card:i,zone:o,entered:!1})}return e}function sp(n,t){let e=[],i=[];for(let s of n){let r=(t.place??t.standing)(s.at);if(!r){i.push(s.id);continue}e.push({...s,X:r.X,Z:r.Z})}return{marks:e,dropped:i}}function rp(n,t){return n.filter(e=>(t.get(e.id)?.size??0)<e.capacity)}function tu(n,t,e){return Math.hypot(n-e.X,(t-e.Z)*.75)}function eu(n,t,e,i,s){let r=null,o=1/0;for(let a of rp(n,t)){let l=tu(e,i,a);l<o&&l<=s&&(r=a,o=l)}return r}function op(n,t,e,i,{show:s=700,snap:r=170,max:o=5}={}){let a=rp(n,t).map(c=>({mark:c,d:tu(e,i,c)})).filter(c=>c.d<=s).sort((c,h)=>c.d-h.d).slice(0,o),l=a.length&&a[0].d<=r?a[0].mark.id:null;return a.map(c=>{let h=1-Math.min(1,Math.max(0,(c.d-r)/(s-r))),u=c.mark.id===l?1:.18+.5*h*h;return{id:c.mark.id,mark:c.mark,distance:c.d,alpha:u,target:c.mark.id===l}})}function Ca(n,t={}){let e=n.yaw,i=n.faces;if(i){let s=null;if(i.point&&t.pointOnFloor)s=t.pointOnFloor(i.point);else if(i.zone&&t.zones&&t.pointOnFloor){let r=t.zones.find(o=>o.id===i.zone);r&&(s=t.pointOnFloor(Jh(r.shape)))}else i.card&&t.cardAt&&(s=t.cardAt(i.card));s&&(e=xi(gi(n.X,n.Z,s.X,s.Z)))}return{yaw:e,lean:n.lean,pitch:n.pitch,lift:n.lift}}function Ra(n,t){let e=new Map,i=[],s=new Set(t.map(o=>o.id)),r=new Map(t.map(o=>[o.id,o]));for(;;){let o=null;for(let a of s){let l=r.get(a);for(let c of n){if((e.get(c.id)??0)>=c.capacity)continue;let h=tu(l.X,l.Z,c);(!o||h<o.d)&&(o={d:h,c:l,m:c})}}if(!o)break;e.set(o.m.id,(e.get(o.m.id)??0)+1),s.delete(o.c.id),i.push({card:o.c.id,mark:o.m.id})}return i}var ap=(n,t,e)=>Math.max(t,Math.min(e,n)),is=Object.freeze({walk:{speed:520,stride:110,height:12,rock:3.5,turn:.7},stroll:{speed:300,stride:90,height:8,rock:2.6,turn:.6},hurry:{speed:880,stride:135,height:15,rock:5,turn:.8},march:{speed:600,stride:120,height:10,rock:1.2,turn:.5},sneak:{speed:230,stride:70,height:4,rock:1.5,turn:.75},scurry:{speed:1150,stride:42,height:5,rock:7,turn:.9},hop:{speed:640,stride:170,height:48,rock:2,turn:.6},glide:{speed:380,stride:0,height:0,rock:0,turn:.4}}),lp=Object.freeze(Object.keys(is)),eo=(n,t)=>Math.hypot(t.X-n.X,(t.Z-n.Z)*.8);function ns(n,t,{t0:e=0,gait:i="walk",yaw:s=null,pace:r=1,minDur:o=.3,maxDur:a=6}={}){let l=is[i]?i:"walk",c=is[l],h=eo(n,t),u=ap(h/(c.speed*Math.max(.1,r)),o,a),d=c.stride>0&&h>c.stride*.6?Math.max(1,Math.round(h/c.stride)):0;return{from:{X:n.X,Z:n.Z},to:{X:t.X,Z:t.Z},t0:e,dur:u,gait:l,steps:d,yaw:s??null,dist:h}}function lx(n){if(n<=0)return 0;if(n>=1)return 1;let e=1/(1-.18);return n<.18?e*n*n/(2*.18):n>1-.18?1-e*(1-n)*(1-n)/(2*.18):e*(n-.18/2)}function io(n,t){let e=n.dur>0?ap((t-n.t0)/n.dur,0,1):1,i=lx(e),s=n.from.X+(n.to.X-n.from.X)*i,r=n.from.Z+(n.to.Z-n.from.Z)*i,o=is[n.gait]??is.walk,a=0,l=0;if(n.steps>0&&e>0&&e<1){let d=i*n.steps%1,f=Math.min(1,e*6,(1-e)*6);a=o.height*Math.sin(d*Math.PI)*f,l=o.rock*Math.sin(d*Math.PI*2)*f*Math.sign(n.to.X-n.from.X||1)}let c=e>0&&e<.86&&n.dist>30,h=xi(gi(n.from.X,n.from.Z,n.to.X,n.to.Z),{share:o.turn,max:40}),u=e<=0?null:c||n.yaw===null?h:n.yaw;return{X:s,Z:r,lift:a,rock:l,yaw:u,u:e,moving:e>0&&e<1,done:e>=1}}function cp(n,t,e){return n==="left"?{X:e.x[0]-160,Z:t.Z}:n==="right"?{X:e.x[1]+160,Z:t.Z}:n==="back"?{X:t.X*.6,Z:e.z[0]}:{X:t.X,Z:t.Z}}var nu=Object.freeze(["still","wander","visit","patrol","pace","swarm"]),cx=Object.freeze({wander:{every:11,restless:.55,radius:.05,gait:"stroll"},visit:{every:14,restless:.75,gait:"walk"},patrol:{every:9,restless:1,gait:"march"},pace:{every:5,restless:.85,width:.05,gait:"walk"},swarm:{every:2.6,restless:.8,radius:.035,gait:"scurry"}}),En=n=>typeof n=="number"&&Number.isFinite(n),iu=n=>Array.isArray(n)&&n.length===2&&En(n[0])&&En(n[1]);function su(n){if(!n||typeof n!="object"||!nu.includes(n.kind)||n.kind==="still")return null;let t=cx[n.kind],e={kind:n.kind,every:Math.max(1.5,En(n.every)?n.every:t.every),restless:Math.max(0,Math.min(1,En(n.restless)?n.restless:t.restless)),gait:is[n.gait]?n.gait:t.gait,radius:Math.max(.005,Math.min(.3,En(n.radius)?n.radius:t.radius??.05)),width:Math.max(.01,Math.min(.4,En(n.width)?n.width:t.width??.05)),spots:Array.isArray(n.spots)?n.spots.filter(iu).map(i=>[i[0],i[1]]):[],marks:Array.isArray(n.marks)?n.marks.filter(i=>typeof i=="string"):[],path:Array.isArray(n.path)?n.path.filter(iu).map(i=>[i[0],i[1]]):[],loop:n.loop===!0,faces:iu(n.faces)?[n.faces[0],n.faces[1]]:null,facesCard:typeof n.faces=="string"&&n.faces?n.faces:null,gestures:Array.isArray(n.gestures)?n.gestures.filter(i=>["hop","nod","bow","shake"].includes(i)):[],gestureChance:Math.max(0,Math.min(1,En(n.gestureChance)?n.gestureChance:.35)),yaw:En(n.yaw)?n.yaw:null};return e.kind==="visit"&&e.spots.length+e.marks.length===0||e.kind==="patrol"&&e.path.length<2?null:e}function ru(n,{home:t,rig:e,marks:i=[],seed:s=1}){if(!n)return null;let r=h=>(e.place??e.standing)(h),o=e.fractionOf(t.X,t.Z),a=h=>{let u=e.standing([o[0]-h/2,o[1]]),d=e.standing([o[0]+h/2,o[1]]);return u&&d?Math.abs(d.X-u.X):120},l=n.faces?r(n.faces):null,c={...n,home:{X:t.X,Z:t.Z},seed:s,places:[],faceAt:l};if(n.kind==="visit"){let h=n.marks.map(d=>i.find(f=>f.id===d)).filter(Boolean).map(d=>({X:d.X,Z:d.Z,yaw:d.yaw??null})),u=n.spots.map(r).filter(Boolean).map(d=>({X:d.X,Z:d.Z,yaw:null}));if(c.places=[{X:t.X,Z:t.Z,yaw:null},...h,...u],c.places.length<2)return null}else if(n.kind==="patrol"){if(c.places=n.path.map(r).filter(Boolean).map(h=>({X:h.X,Z:h.Z,yaw:null})),c.places.length<2)return null}else n.kind==="pace"?c.reach=a(n.width):c.reach=a(n.radius);return c}function Ei(n,t,e=0){return zf((n*2654435761^t*97+e*7919)>>>0)()}var hx=16;function hp(n,t){if(t<=0)return{X:n.home.X,Z:n.home.Z,yaw:n.yaw};if(n.kind==="patrol"){let r=n.places.length,o=n.loop?t%r:ux(t,r);return{...n.places[o],yaw:n.places[o].yaw??null}}let e=t;for(let r=0;e>0&&Ei(n.seed,e,1)>=n.restless;r++){if(r>=hx)return{X:n.home.X,Z:n.home.Z,yaw:n.yaw};e--}if(e<=0)return{X:n.home.X,Z:n.home.Z,yaw:n.yaw};if(n.kind==="visit"){let r=Math.floor(Ei(n.seed,e,2)*n.places.length);return{...n.places[r],yaw:n.places[r].yaw??null}}if(n.kind==="pace"){let r=(e%2===0?-1:1)*(.35+.15*Ei(n.seed,e,3));return{X:n.home.X+r*n.reach,Z:n.home.Z+(Ei(n.seed,e,4)-.5)*n.reach*.2,yaw:null}}let i=Ei(n.seed,e,5)*Math.PI*2,s=Math.sqrt(Ei(n.seed,e,6))*n.reach/2;return{X:n.home.X+Math.cos(i)*s,Z:n.home.Z+Math.sin(i)*s*.7,yaw:null}}function ux(n,t){let e=2*(t-1),i=n%e;return i<t?i:e-i}function dx(n,t){return n.every*(.1+.4*Ei(n.seed,t,8))}function up(n,t){if(!n.gestures?.length)return null;let e=Ei(n.seed,0,9)*n.every,i=Math.floor((t+e)/n.every);if(Ei(n.seed,i,12)>=n.gestureChance)return null;let s=n.gestures[Math.floor(Ei(n.seed,i,13)*n.gestures.length)],r=i*n.every-e+n.every*(.93+.05*Ei(n.seed,i,14));return{beat:i,at:r,verb:s}}function Pa(n,t){let e=Ei(n.seed,0,9)*n.every,i=t+e,s=Math.floor(i/n.every),r=i-s*n.every,o=hp(n,s-1),a=hp(n,s),l=d=>n.faceAt?xi(gi(d.X,d.Z,n.faceAt.X,n.faceAt.Z),{share:.7,max:50}):d.yaw??null;if(Math.abs(a.X-o.X)+Math.abs(a.Z-o.Z)<.5)return{X:a.X,Z:a.Z,yaw:l(a),lift:0,rock:0,moving:!1};let c=dx(n,s),h=ns(o,a,{t0:c,gait:n.gait,yaw:l(a),maxDur:Math.max(.4,(n.every-c)*.92)}),u=io(h,r);return u.moving?{X:u.X,Z:u.Z,yaw:u.yaw,lift:u.lift,rock:u.rock,moving:!0}:{X:u.X,Z:u.Z,yaw:r<c?l(o):l(a),lift:0,rock:0,moving:!1}}var Ia=Object.freeze(["line","huddle","talk","gangup","panel","standoff","circle","queue","scatter","audience","position"]),Y1=Math.PI/180,dp=(n,t,e)=>Math.max(t,Math.min(e,n)),Ns=n=>Math.round(n*10)/10,fx=(n,t=180)=>Math.max(t*.5,...n.map(e=>e.w??t)),Xi=(n,t,e,i,s=.7,r=52)=>xi(gi(n,t,e,i),{share:s,max:r});function fp(n,{cards:t=[],focus:e={X:0,Z:-400},target:i=null,speakers:s=[],party:r=!1,limits:o=null,seed:a=1,dir:l="back",radius:c=null}={}){let h=t.filter(f=>r||!f.pc||f.id===i||s.includes(f.id));if(!h.length)return[];let u=fx(h),d;switch(n){case"huddle":d=xx(h,e,u,c);break;case"talk":d=yx(h,e,u,s);break;case"gangup":d=_x(h,e,u,i);break;case"panel":d=vx(h,e,u);break;case"standoff":d=Mx(h,e,u);break;case"circle":d=bx(h,e,u,c);break;case"queue":d=Sx(h,e,u,a,l);break;case"scatter":d=wx(h,e,u,o,a);break;case"audience":d=mx(h,e,u,o);break;default:d=px(h,e,u)}return d.map(f=>({id:f.id,X:Ns(o?dp(f.X,o.x[0],o.x[1]):f.X),Z:Ns(o?dp(f.Z,o.z[0],o.z[1]):f.Z),yaw:Ns(f.yaw??0),lean:Ns(f.lean??0),pitch:Ns(f.pitch??0)}))}var ki=n=>[...n].sort((t,e)=>t.X-e.X||(t.id<e.id?-1:1));function px(n,t,e){let i=[],s=[n.filter(o=>!o.pc),n.filter(o=>o.pc)],r=s[0].length?220:0;return s.forEach((o,a)=>{let l=ki(o),c=e*1.12;l.forEach((h,u)=>i.push({id:h.id,X:t.X+(u-(l.length-1)/2)*c,Z:t.Z+a*r,yaw:0}))}),i}function mx(n,t,e,i){let s=ki(n),r=i?i.z[1]:t.Z+600,o=Math.max(t.Z+280,r-Math.max(150,(r-t.Z)*.2)),a=Math.ceil(s.length/2),l=[s.slice(0,a).reverse(),s.slice(a)],c=[];return l.forEach((h,u)=>{let d=u===0?-1:1;h.forEach((f,x)=>{let g=t.X+d*(e*.95+x*e*1.15),p=o-x*45;c.push({id:f.id,X:g,Z:p,yaw:Xi(g,p,t.X,t.Z,.6,40),pitch:-2})})}),c}var gx=.86;function xx(n,t,e,i=null){let s=ki(n),r=s.length,o=Math.max(e*gx*(r-1),(i??0)*2),a=Math.min(260,90+32*r);return s.map((l,c)=>{let h=r>1?(c-(r-1)/2)/((r-1)/2):0,u=t.X+h*o/2,d=t.Z-a*(1-h*h)*.9-40,f=Xi(u,d,t.X,t.Z+140,.8,50);return{id:l.id,X:u,Z:d,yaw:f,lean:-h*9,pitch:6}})}function yx(n,t,e,i){let s=i.filter(d=>n.some(f=>f.id===d)),r=ki(n.filter(d=>!s.includes(d.id)));for(;s.length<2&&r.length;)s.push(r.shift().id);let[o,a]=s,l=e*.78,c=[],h={X:t.X-l,Z:t.Z},u={X:t.X+l,Z:t.Z};return o&&c.push({id:o,X:h.X,Z:h.Z,yaw:Xi(h.X,h.Z,u.X,u.Z,.85,58),lean:2}),a&&c.push({id:a,X:u.X,Z:u.Z,yaw:Xi(u.X,u.Z,h.X,h.Z,.85,58),lean:-2}),r.forEach((d,f)=>{let x=f%2===0?-1:1,g=Math.floor(f/2)+1,p=t.X+x*(l+e*(.55+g*.95)),m=t.Z-120-g*60;c.push({id:d.id,X:p,Z:m,yaw:Xi(p,m,t.X,t.Z,.6,40)})}),c}function _x(n,t,e,i){let s=n.find(l=>l.id===i)??null,r=ki(n.filter(l=>l!==s)),o=[];s&&o.push({id:s.id,X:t.X,Z:t.Z+60,yaw:0,pitch:3});let a=Math.ceil(r.length/2);return[r.slice(0,a).reverse(),r.slice(a)].forEach((l,c)=>{let h=c===0?-1:1;l.forEach((u,d)=>{let f=t.X+h*e*(.95+d*.95),x=t.Z-90+d*55;o.push({id:u.id,X:f,Z:x,yaw:Xi(f,x,t.X,t.Z+60,.8,55),lean:-h*7,pitch:5})})}),o}function vx(n,t,e){let i=ki(n.filter(o=>!o.pc)),s=i.length,r=i.map((o,a)=>{let l=s>1?(a-(s-1)/2)/((s-1)/2):0,c=t.X+l*((s-1)/2)*e*1.1,h=t.Z-160+90*l*l;return{id:o.id,X:c,Z:h,yaw:Ns(-l*14),pitch:-2}});return ki(n.filter(o=>o.pc)).forEach((o,a,l)=>{let c=t.X+(a-(l.length-1)/2)*e*1.1;r.push({id:o.id,X:c,Z:t.Z+260,yaw:0})}),r}function Mx(n,t,e){let i=ki(n.filter(o=>!o.pc)),s=ki(n.filter(o=>o.pc));if(!s.length){let o=Math.ceil(i.length/2);s=i.slice(o),i=i.slice(0,o)}if(!i.length){let o=Math.ceil(s.length/2);i=s.slice(0,o),s=s.slice(o)}let r=Wf({x:t.X,z:t.Z},i,s,{gap:e*2.2,spread:e*1.35,depthStep:70});return[...i,...s].map((o,a)=>({id:o.id,X:r[a].x,Z:r[a].z,yaw:r[a].yaw,lean:r[a].lean,pitch:r[a].pitch}))}function bx(n,t,e,i=null){let s=ki(n),r=s.length,o=Math.max(i??0,e*.75,e*1.02*(r-1)/2);return s.map((a,l)=>{let c=r>1?(l-(r-1)/2)/((r-1)/2):0,h=t.X+c*o,u=t.Z-Math.sqrt(Math.max(0,1-c*c))*o*.7;return{id:a.id,X:h,Z:u,yaw:Xi(h,u,t.X,t.Z,.75,55)}})}function Sx(n,t,e,i,s="back"){let r=s==="left"||s==="right",o=s==="left"?-1:1,a=c=>r?-Math.abs(c.X-t.X):s==="front"?-c.Z:c.Z;return[...n].sort((c,h)=>a(h)-a(c)||(c.id<h.id?-1:1)).map((c,h)=>{let u=Math.sin((h+1)*2.399+i),d,f;r?(d=t.X+o*h*e*1.08,f=t.Z+u*26-h*8):(d=t.X+u*e*.12+h*e*.42,f=t.Z+(s==="front"?1:-1)*h*175);let x=h===0?Xi(d,f,t.X,t.Z-300,.55,38):Xi(d,f,t.X,t.Z,.55,38);return{id:c.id,X:d,Z:f,yaw:x,pitch:h===0?0:2}})}function wx(n,t,e,i,s){let r=ki(n),o=r.length,a=i?[i.x[0]*.7,i.x[1]*.7]:[t.X-e*o*.8,t.X+e*o*.8];return r.map((l,c)=>{let h=o>1?c/(o-1):.5,u=a[0]+(a[1]-a[0])*h,d=t.Z+Math.sin((c+1)*1.7+s)*260;return{id:l.id,X:u,Z:d,yaw:Xi(u,d,t.X,t.Z,.5,40)}})}function La(n,{X:t,Z:e,w:i,h:s,lift:r=0}){let o=n.screenOf(t-i/2,r,e),a=n.screenOf(t+i/2,r+s,e);return{x0:o.x,x1:a.x,y0:a.y,y1:o.y}}function Tx(n,t,{across:e=12,down:i=20}={}){let s=t.map(o=>({id:o.id,Z:o.Z,...La(n,o)})),r=new Map;for(let o of s){let a=s.filter(h=>h!==o&&(h.Z>o.Z||h.Z===o.Z&&h.id>o.id)&&h.x0<o.x1&&h.x1>o.x0&&h.y0<o.y1&&h.y1>o.y0),l=0,c=new Set;for(let h=0;h<e;h++)for(let u=0;u<i;u++){let d=o.x0+(h+.5)/e*(o.x1-o.x0),f=o.y0+(u+.5)/i*(o.y1-o.y0),x=a.find(g=>d>=g.x0&&d<=g.x1&&f>=g.y0&&f<=g.y1);x&&(l++,c.add(x.id))}r.set(o.id,{hidden:l/(e*i),by:[...c]})}return r}function pp(n,t,{across:e=12,down:i=20}={}){if(!t?.length)return 0;let s=(o,a)=>t.some(l=>l.rect?o>=l.rect[0]&&o<=l.rect[2]&&a>=l.rect[1]&&a<=l.rect[3]:l.circle?(o-l.circle[0])**2+(a-l.circle[1])**2<=l.circle[2]**2:!1),r=0;for(let o=0;o<e;o++)for(let a=0;a<i;a++)s(n.x0+(o+.5)/e*(n.x1-n.x0),n.y0+(a+.5)/i*(n.y1-n.y0))&&r++;return r/(e*i)}var ka=44,Da=.4;function Na(n,t,e,i){let s=new Uint8Array(t*e),r=n.length;for(let l=0;l<e;l++){let c=l+.5,h=[];for(let u=0,d=r-1;u<r;d=u++){let[f,x]=n[u],[g,p]=n[d];x>c!=p>c&&h.push(f+(c-x)/(p-x)*(g-f))}h.sort((u,d)=>u-d);for(let u=0;u+1<h.length;u+=2){let d=Math.max(0,Math.ceil(h[u]-.5)),f=Math.min(t-1,Math.floor(h[u+1]-.5));for(let x=d;x<=f;x++)s[l*t+x]=1}}let o=new Uint8ClampedArray(t*e),a=l=>l*l*(3-2*l);for(let l=0;l<t;l++){let c=-1;for(let h=0;h<e;h++){if(!s[h*t+l])continue;c<0&&(c=h);let u=h-c+.5;o[h*t+l]=Math.round(255*(i>0?a(Math.min(1,u/i)):1))}}return o}function mp(n,t,e,{most:i=.15,iterations:s=80,limits:r=null}={}){let o=t.map(l=>({...l})),a=new Map(o.map(l=>[l.id,l]));for(let l=0;l<s;l++){let c=Tx(n,o),h=!1;for(let u of o){let d=c.get(u.id);if(!(d.hidden<=i-.01))for(let f of d.by){let x=a.get(f),g=e.has(u.id),p=e.has(x.id);if(!g&&!p)continue;let m=u.X!==x.X?Math.sign(u.X-x.X):u.id<x.id?-1:1,v=Math.max(u.w,x.w)*.05;g&&p?(u.X+=m*v/2,x.X-=m*v/2):g?u.X+=m*v:x.X-=m*v,h=!0}}if(r)for(let u of o)e.has(u.id)&&(u.X=Math.max(r[0],Math.min(r[1],u.X)));if(!h)break}return o}var Oa=1/120,gp=2.5,no=Object.freeze({card:{w:280,h:468},holdLift:70,stickLength:134,lane:150,passInFront:85,gripRate:16,limits:{x:[-1800,1800],z:[-2300,260]},zoneEvery:4,look:{reach:900,most:22,linger:2.6},magnet:{overlap:.42,lane:110,rate:9}}),an=(n,t,e)=>Math.max(t,Math.min(e,n));function ss(n,t,e,i,s,r=16,o=.72){let a=r*r*(i-n[t])-2*o*r*n[e];n[e]+=a*s,n[t]+=n[e]*s}function Ex(n){let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return 1e3+(t>>>0)%9e3}var Os=class{constructor(t,e=[],i={}){this.scene=t,this.opts={...no,...i,card:{...no.card,...i.card??{}},limits:{...no.limits,...i.limits??{}},look:{...no.look,...i.look??{}},magnet:{...no.magnet,...i.magnet??{}}},this.clock=typeof i.clock=="function"?i.clock:()=>this.time,this.coverFn=typeof i.cover=="function"?i.cover:null,this.rig=ks(t.painting,t.rig);let s=sp(t.marks,this.rig);this.marks=s.marks,this.problems=s.dropped.map(r=>`mark "${r}" is above the horizon and cannot be stood on`),this.zones=t.zones,this.bands=ip(t.zones),this.focus=this.#e(),this.risers=this.#t(),this.cards=new Map,this.resting=new Map,this.touching=new Map,this.inZones=new Map,this.events=[],this.recentBonks=[],this.time=0,this.acc=0,this.steps=0,this.lifeOn=!0,this.board=!1,this.speaker=null,this.turn=null,this.slots=new Map;for(let r of e)this.addCard(r)}#t(){let{cam:t,map:e}=this.rig,i=t.floorY-t.cy;return(this.scene.occluders??[]).filter(s=>s.riser).flatMap(s=>{let r=this.rig.standing([s.x,s.base]);if(!r)return[];let o=(t.f-r.Z)/t.f,a=Math.min(...s.poly.map(c=>c[1])),l=s.poly.map(c=>(e.x(c[0])-t.cx)*o);return[{Z:r.Z,top:i-(e.y(a)-t.cy)*o,x0:Math.min(...l),x1:Math.max(...l),hideAtMost:s.hideAtMost,camY:i,f:t.f}]})}riserFor(t,e,i,s){let r=0;for(let o of this.risers){if(e>=o.Z-4||t+i/2<o.x0||t-i/2>o.x1)continue;let a=o.camY+(o.top-o.camY)*((o.f-e)/(o.f-o.Z));r=Math.max(r,a-o.hideAtMost*s)}return Math.max(0,Math.min(r,s*gp))}grow(t){return Aa(this.rig.cam,t)}unhidden(t,e,i,s){for(let r of this.risers){if(e>=r.Z-4||t+i/2<r.x0||t-i/2>r.x1)continue;if(r.camY+(r.top-r.camY)*((r.f-e)/(r.f-r.Z))-r.hideAtMost*s>s*gp)return r.Z+60}return e}#e(){let t=this.scene.rig,e=this.scene.focus??[t.vanish??.5,t.horizon+(t.floorFront-t.horizon)*.72];return this.rig.place(e)??{X:0,Z:-400}}addCard(t){if(!t?.id||this.cards.has(t.id))return null;let e=this.opts.card.w,i=this.opts.card.h,s=this.scene.cardScale*(t.size??1),r=0,o=0,a=t.mark?this.marks.find(u=>u.id===t.mark):null;if(a)r=a.X,o=a.Z;else if(t.at){let u=this.rig.place(t.at);u&&(r=u.X,o=u.Z)}else Number.isFinite(t.X)&&Number.isFinite(t.Z)&&(r=t.X,o=t.Z);let l={id:t.id,person:t,s,w:e*s,h:i*s,seed:Ex(t.id),puppet:$f({id:t.id,x:r,y:0,rod:0,w:e*s,h:i*s,scale:1}),Z:o,restZ:o,zOff:0,grip:0,holder:null,hand:null,yaw:t.yaw??0,yawV:0,yawTo:t.yaw??0,lean:t.lean??0,leanV:0,leanTo:t.lean??0,pitch:t.pitch??0,pitchV:0,pitchTo:t.pitch??0,lift:0,liftV:0,liftTo:0,mark:null,walk:null,routine:null,still:t.still===!0,living:!1,packed:t.packed===!0,stepLift:0,stepRock:0,look:0,lookV:0,attention:null,riser:0,riserTo:0,down:t.down===!0?1:0,downV:0,downTo:t.down===!0?1:0,grow:this.grow(o)};l.riser=l.riserTo=this.riserFor(r,o,l.w*l.grow,l.h*l.grow),this.cards.set(l.id,l),a&&this.#s(l,a,!0);let c=su(t.life);if(c&&(l.routine=ru(c,{home:{X:r,Z:o},rig:this.rig,marks:this.marks,seed:l.seed})),l.routine&&!l.still&&this.lifeOn&&!a){let u=Pa(l.routine,this.clock());l.puppet.x=l.puppet.restX=u.X,l.Z=l.restZ=u.Z,u.yaw!==null&&(l.yaw=l.yawTo=u.yaw),l.living=!0}let h=t.enter&&typeof t.enter=="object"&&!xp(t.enter.t0,this.clock())?t.enter:null;if(h&&h.from==="rise"){let u=Number.isFinite(h.t0)?h.t0:this.clock();l.rise={t0:u,dur:Number.isFinite(h.dur)?h.dur:.7}}if(h&&Number.isFinite(h.t0)&&this.clock()-h.t0<3&&this.#i(l),h&&["left","right","back"].includes(h.from)){let u=Number.isFinite(h.t0)?h.t0:this.clock(),d=cp(h.from,{X:r,Z:o},this.opts.limits),f=ns(d,{X:r,Z:o},{t0:u,gait:h.gait??"walk",yaw:l.yawTo,maxDur:8});if(this.clock()<f.t0+f.dur){l.walk=f;let x=io(f,this.clock());l.puppet.x=l.puppet.restX=x.X,l.Z=l.restZ=x.Z}}return l}removeCard(t){let e=this.cards.get(t);if(!e)return!1;e.mark&&this.resting.get(e.mark)?.delete(t),this.cards.delete(t),this.inZones.delete(t);for(let i of[...this.touching.keys()])i.split("|").includes(t)&&this.touching.delete(i);return!0}walkTo(t,e,{t0:i=null,gait:s="walk",yaw:r=null,lean:o=null,pitch:a=null,still:l=null,packed:c=null}={}){let h=this.cards.get(t);if(!h||h.holder!==null)return null;let u=null,d=null;if(e?.mark?(d=this.marks.find(p=>p.id===e.mark)??null,d&&(u={X:d.X,Z:d.Z})):Array.isArray(e?.at)?u=this.rig.place(e.at):Number.isFinite(e?.X)&&Number.isFinite(e?.Z)&&(u={X:e.X,Z:e.Z}),!u)return null;let f=this.opts.limits;if(u={X:an(u.X,f.x[0],f.x[1]),Z:an(u.Z,f.z[0],f.z[1])},h.mark&&(this.resting.get(h.mark)?.delete(t),h.mark=null),d){let p=this.resting.get(d.id);p||this.resting.set(d.id,p=new Set),p.add(t),h.mark=d.id}l!==null&&(h.still=!!l),c!==null&&(h.packed=!!c);let x=d?Ca(d,this.#r()):{yaw:r??h.yawTo,lean:o??0,pitch:a??0,lift:0},g=Number.isFinite(i)&&!xp(i,this.clock())?i:this.clock();return h.walk=ns({X:h.puppet.x,Z:h.Z},u,{t0:g,gait:s,yaw:x.yaw}),h.walk.pose=x,h.walk.mark=d?.id??null,h.living=!1,this.events.push({type:"walk",card:t,to:{X:u.X,Z:u.Z},mark:d?.id??null,t:this.time}),h.walk}setRoutine(t,e,i=null){let s=this.cards.get(t);if(!s)return;let r=Array.isArray(i)?this.rig.place(i):null;i=r?{X:r.X,Z:r.Z}:s.routine?.home??{X:s.puppet.restX,Z:s.restZ};let o=su(e);s.routine=o?ru(o,{home:i,rig:this.rig,marks:this.marks,seed:s.seed}):null,s.living=!1}setStill(t,e){let i=this.cards.get(t);i&&(i.still=!!e)}setLife(t){this.lifeOn=!!t}setBoard(t){this.board=!!t}setDown(t,e){let i=this.cards.get(t);if(!i)return!1;let s=e?1:0;return i.downTo===s?!1:(i.downTo=s,e&&i.walk&&this.#n(i),this.events.push({type:"fall",card:t,down:!!e,t:this.time}),e&&this.#i(i),!0)}#i(t){let e=this.clock()+this.opts.look.linger;for(let i of this.cards.values())i===t||i.holder!==null||i.downTo||eo({X:i.puppet.x,Z:i.Z},{X:t.puppet.x,Z:t.Z})<=this.opts.look.reach*1.4&&(i.attention={id:t.id,until:e})}setSpeaker(t){this.speaker=t&&this.cards.has(t)?t:null}setTurn(t){this.turn=t&&this.cards.has(t)?t:null}dockFor(t,e,i){if(!this.board)return null;let s=this.rig.fractionOf(e,i),r=this.zones.find(h=>h.kind==="area"&&Ds([h],s[0],s[1]).length);if(!r)return null;let a=(this.cards.get(t)?.w??180)*this.grow(i);this.slots.has(r.id)||this.slots.set(r.id,Qh(r,this.rig,{w:a*1.05}));let l=[...this.cards.values()].filter(h=>h.id!==t&&h.holder===null).map(h=>({X:h.walk?h.walk.to.X:h.puppet.restX,Z:h.walk?h.walk.to.Z:h.restZ})),c=this.slots.get(r.id).filter(h=>!l.some(u=>Math.abs(u.X-h.X)<a*.6&&Math.abs(u.Z-h.Z)<90));return c.length?(c.sort((h,u)=>Math.hypot(h.X-e,(h.Z-i)*.8)-Math.hypot(u.X-e,(u.Z-i)*.8)),{X:c[0].X,Z:c[0].Z,zone:r.id}):null}hold(t,e){let i=this.cards.get(t);return!i||i.holder!==null&&i.holder!==e?!1:(i.holder===e||(i.mark&&(this.resting.get(i.mark)?.delete(t),i.mark=null),this.#n(i),i.routine&&(i.still=!0),i.holder=e,i.hand={x:i.puppet.x,z:i.Z},i.puppet.heldBy=e,this.events.push({type:"grab",card:t,by:e,t:this.time})),!0)}setHand(t,{x:e,z:i}){let s=this.cards.get(t);if(!s||s.holder===null)return;let r=this.opts.limits;s.hand.x=an(e,r.x[0],r.x[1]),s.hand.z=an(i,r.z[0],r.z[1])}release(t,e=null){let i=this.cards.get(t);if(!i||i.holder===null)return null;let s=i.holder,r=e??this.landingFor(t);i.holder=null,i.hand=null,i.puppet.heldBy=null;let o=r.mark?this.marks.find(h=>h.id===r.mark)??null:null;o?this.#s(i,o,!1):(i.puppet.restX=r.X,i.restZ=an(r.Z,this.opts.limits.z[0],this.opts.limits.z[1]),i.mark=null);let a={type:"drop",card:t,by:s,t:this.time,mark:o?.id??null,X:i.puppet.restX,Z:i.restZ};this.events.push(a);let l=this.rig.fractionOf(i.puppet.restX,i.restZ),c=Ds(this.zones.filter(h=>h.kind==="door"||h.kind==="spot"),l[0],l[1])[0];return c&&this.events.push({type:"visit",card:t,by:s,zone:c.id,name:c.name,hint:c.hint,t:this.time}),a}landingFor(t){let e=this.cards.get(t);if(!e||e.holder===null)return null;let i=e.puppet.x,s=e.hand?.z??e.Z,r=eu(this.marks,this.resting,i,s,this.scene.reach.snap);!r&&this.scene.marksOnly&&(r=eu(this.marks,this.resting,i,s,1/0));let o=r?null:this.dockFor(t,i,s);if(o)return{X:o.X,Z:o.Z,mark:null};let a={X:i,Z:an(s,this.opts.limits.z[0],this.opts.limits.z[1])},l=r?a:this.clearOfCover(a,e);return{X:l.X,Z:l.Z,mark:r?.id??null}}handOver(t,e){let i=this.cards.get(t);return i?(i.mark&&(this.resting.get(i.mark)?.delete(t),i.mark=null),this.#n(i),i.routine&&(i.still=!0),i.hand??={x:i.puppet.x,z:i.Z},i.holder=e,i.puppet.heldBy=e,!0):!1}#n(t){t.walk&&(t.walk=null,t.puppet.restX=t.puppet.x,t.restZ=t.Z,t.stepLift=0,t.stepRock=0)}perform(t,e){let i=this.cards.get(t);i&&Yh(i.puppet,e)}#s(t,e,i){let s=this.resting.get(e.id);s||this.resting.set(e.id,s=new Set),s.add(t.id),t.mark=e.id;let r=Ca(e,this.#r());t.puppet.restX=e.X,t.restZ=e.Z,t.yawTo=r.yaw,t.leanTo=r.lean,t.pitchTo=r.pitch,t.liftTo=r.lift,i&&(t.puppet.x=e.X,t.Z=e.Z,t.yaw=r.yaw,t.lean=r.lean,t.pitch=r.pitch,t.lift=r.lift),this.events.push({type:"mark",card:t.id,mark:e.id,t:this.time})}#r(){return{zones:this.zones,pointOnFloor:t=>this.rig.standing(t),cardAt:t=>{let e=this.cards.get(t);return e?{X:e.puppet.x,Z:e.Z}:null}}}tidy({t0:t=null}={}){let e=this.marks.map(r=>({...r,capacity:r.capacity-(this.resting.get(r.id)?.size??0)})).filter(r=>r.capacity>0),i=[...this.cards.values()].filter(r=>!r.mark&&r.holder===null&&!r.walk).map(r=>({id:r.id,X:r.puppet.x,Z:r.Z})),s=Ra(e,i);for(let{card:r,mark:o}of s)this.walkTo(r,{mark:o},{t0:t,gait:"hurry",still:!0});return s}advance(t){this.acc+=Math.min(Math.max(t,0),.05);let e=0;for(;this.acc>=Oa-1e-9;)this.step(Oa),this.acc-=Oa,e++;return e}step(t=Oa){this.time+=t,this.steps++;let e=this.opts,i=this.clock(),s=[...this.cards.values()].filter(r=>r.holder!==null);for(let r of this.cards.values()){let o=r.puppet,a=r.holder!==null;a||this.#o(r,i),o.heldBy=a?r.holder:null,o.target=a?{x:r.hand.x,y:0}:null,qf(o,t),r.Z+=((a?r.hand.z:r.restZ)-r.Z)*Math.min(1,t*(a?24:12)),r.grip+=((a?1:0)-r.grip)*Math.min(1,t*e.gripRate),ss(r,"yaw","yawV",r.yawTo,t,16,.72),ss(r,"lean","leanV",r.leanTo,t,18,.8),ss(r,"pitch","pitchV",r.pitchTo,t,18,.8),ss(r,"lift","liftV",r.liftTo,t,18,.62),ss(r,"look","lookV",a||r.downTo?0:this.#a(r,s,i),t,7,.9),r.riser+=(r.riserTo-r.riser)*Math.min(1,t*9),r.grow=this.grow(r.Z),r.downTo?ss(r,"down","downV",1,t,9,.45):ss(r,"down","downV",0,t,6,.8),r.down>1.08&&(r.down=1.08,r.downV=-Math.abs(r.downV)*.35)}if(this.#l(t),this.steps%e.zoneEvery===0&&(this.#u(),this.#h(t*e.zoneEvery),this.risers.length))for(let r of this.cards.values())r.riserTo=this.riserFor(r.puppet.x,r.Z,r.w*r.grow,r.h*r.grow)}#o(t,e){let i=t.puppet;if(t.walk){let r=io(t.walk,e);i.restX=r.X,t.restZ=r.Z,t.stepLift=r.lift,t.stepRock=r.rock,r.yaw!==null&&(t.yawTo=r.yaw),r.done&&this.#c(t);return}if(!!t.routine&&this.lifeOn&&!t.still&&!t.downTo){let r=Pa(t.routine,e);if(!t.living&&eo({X:i.restX,Z:t.restZ},r)>12){let a=ns({X:i.x,Z:t.Z},r,{t0:e,gait:t.routine.gait}),l=Pa(t.routine,e+a.dur);t.walk=ns({X:i.x,Z:t.Z},l,{t0:e,gait:t.routine.gait,yaw:l.yaw??t.yawTo}),t.walk.pose={yaw:l.yaw??t.yawTo,lean:0,pitch:0,lift:0},t.walk.mark=null,t.walk.back=!0;return}if(t.living=!0,i.restX=r.X,t.restZ=r.Z,t.stepLift=r.lift,t.stepRock=r.rock,!r.moving&&t.routine.facesCard){let a=this.cards.get(t.routine.facesCard);a&&(t.yawTo=xi(gi(r.X,r.Z,a.puppet.x,a.Z),{share:.8,max:55}))}else r.yaw!==null&&(t.yawTo=r.yaw);let o=up(t.routine,e);o&&!r.moving&&e>=o.at&&e<o.at+.5&&t.gestured!==o.beat&&(t.gestured=o.beat,Yh(i,o.verb));return}t.living=!1,t.stepLift*=.8,t.stepRock*=.8}#c(t){let e=t.walk;t.walk=null,t.puppet.restX=e.to.X,t.restZ=e.to.Z,t.stepLift=0,t.stepRock=0;let i=e.pose??{yaw:e.yaw??t.yawTo,lean:0,pitch:0,lift:0};t.yawTo=i.yaw??t.yawTo,t.leanTo=i.lean??0,t.pitchTo=i.pitch??0,t.liftTo=i.lift??0,t.living=!1,e.mark&&this.events.push({type:"mark",card:t.id,mark:e.mark,t:this.time}),e.back||this.events.push({type:"arrive",card:t.id,mark:e.mark??null,t:this.time})}#a(t,e,i){let s=this.opts.look,r=null;if(t.attention&&t.attention.until>i?r=this.cards.get(t.attention.id)??null:t.attention=null,!r){let a=s.reach;for(let l of e){if(l===t)continue;let c=eo({X:l.puppet.x,Z:l.Z},{X:t.puppet.x,Z:t.Z});c<a&&(a=c,r=l)}}if(!r&&this.speaker&&this.speaker!==t.id&&(r=this.cards.get(this.speaker)??null),!r)return 0;let o=xi(gi(t.puppet.x,t.Z,r.puppet.x,r.Z),{share:.8,max:60});return an(o-t.yaw,-s.most,s.most)}#h(t){let e=this.opts.magnet,i=[...this.cards.values()].filter(s=>s.holder===null&&!s.walk&&!s.packed&&!(s.routine&&this.lifeOn&&!s.still));for(let s=0;s<i.length;s++)for(let r=s+1;r<i.length;r++){let o=i[s],a=i[r];if(Math.abs(o.restZ-a.restZ)>=e.lane)continue;let l=a.puppet.restX-o.puppet.restX,c=o.w*o.grow,h=a.w*a.grow,d=(c+h)/2-Math.min(c,h)*e.overlap-Math.abs(l);if(d<=.5)continue;let f=l!==0?Math.sign(l):o.id<a.id?1:-1,x=Math.min(d/2,d*e.rate*t),g=this.opts.limits.x;o.puppet.restX=an(o.puppet.restX-f*x,g[0],g[1]),a.puppet.restX=an(a.puppet.restX+f*x,g[0],g[1])}}#l(t){let e=this.opts,i=new Set;for(let s of this.cards.values()){if(s.holder===null){s.zOff+=(0-s.zOff)*Math.min(1,t*11);continue}let r=!1;for(let o of this.cards.values()){if(o===s||Math.abs(o.Z-s.Z)>=e.lane)continue;let a=s.id<o.id?`${s.id}|${o.id}`:`${o.id}|${s.id}`,l=jr(s.puppet),c=jr(o.puppet);if(Math.min(l.right,c.right)-Math.max(l.left,c.left)>0&&(r=!0),i.has(a))continue;i.add(a);let h=this.touching.get(a);h||this.touching.set(a,h=new Set);let u=s.id<o.id?[s,o]:[o,s];for(let d of Jf(u.map(f=>f.puppet),h)){let f={type:"bonk",t:this.time,a:d.a,b:d.b,x:d.x,speed:d.speed,Z:s.Z};this.events.push(f),this.recentBonks.push(f);let x=this.clock()+this.opts.look.linger,g=this.cards.get(d.a),p=this.cards.get(d.b);g&&p&&(g.attention={id:p.id,until:x},p.attention={id:g.id,until:x})}}s.zOff+=((r?e.passInFront:0)-s.zOff)*Math.min(1,t*11)}for(let[s,r]of this.touching)r.size===0&&this.touching.delete(s);this.recentBonks=this.recentBonks.filter(s=>this.time-s.t<.9)}#u(){if(!this.zones.length)return;let t=new Map;for(let e of this.cards.values()){let i=this.rig.fractionOf(e.puppet.x,e.Z);t.set(e.id,new Set(Ds(this.zones,i[0],i[1]).map(s=>s.id)))}for(let e of np(this.inZones,t))this.events.push({...e,t:this.time});this.inZones=t}drain(){let t=this.events;return this.events=[],t}marksFor(t){let e=this.cards.get(t);if(!e||e.holder===null)return[];let i=this.scene.reach;return op(this.marks,this.resting,e.hand.x,e.hand.z,{show:i.show,snap:i.snap,max:5}).map(s=>({id:s.id,for:t,X:s.mark.X,Z:s.mark.Z,label:s.mark.label,alpha:s.alpha,target:s.target,pose:Ca(s.mark,this.#r())}))}zoneStates(){let t=[...this.cards.values()].filter(e=>e.holder!==null).map(e=>{let i=this.rig.fractionOf(e.hand.x,e.hand.z);return{x:i[0],y:i[1]}});return ep(this.zones,t)}snapshot({viewer:t=null,selected:e=null}={}){let i=this.time,s=this.clock(),r=[],o=[];for(let a of this.cards.values()){let l=a.puppet,c=Xf(i,a.seed,a.person.demeanour??"calm",{speakerYaw:null}),h=jf(l),u=a.grip,d=a.rise?Cx(a.rise,s):1;a.rise&&s>a.rise.t0+a.rise.dur&&(a.rise=null),r.push({id:a.id,name:a.person.name??a.id,colour:a.person.colour??null,x:l.x+l.jx,z:a.Z+a.zOff,lift:(c.lift*(1-u)+a.lift+a.stepLift+a.riser)*(1-Math.min(1,a.down))+this.opts.holdLift*u+h.lift,lean:l.lean+(a.lean+c.lean)*(1-.85*u)*(1-Math.min(1,a.down))+a.stepRock,yaw:a.yaw+l.turn+h.shakeY+c.yaw+a.look,pitch:(a.pitch+c.pitch+h.tipX+h.dip*.4)*(1-Math.min(1,a.down))-78*a.down,down:Math.max(0,Math.min(1,a.down)),grip:u,breathe:c.breathe,squash:h.squash*d,scale:a.s*a.grow,grow:a.grow,held:a.holder!==null,holder:a.holder,mark:a.mark,walking:!!a.walk||a.living&&Math.abs(a.stepLift)>.2,selected:!!e?.has?.(a.id),speaking:this.speaker===a.id||this.turn===a.id,emote:this.#d(a,i)}),t!==null&&a.holder===t&&o.push(...this.marksFor(a.id))}return{t:i,cards:r,bonks:this.recentBonks.map(a=>({...a})),marks:o,zones:this.zoneStates(),board:this.board?this.boardState():null}}boardState(){let t={},e={};for(let i of this.zones)t[i.id]=0,e[i.id]=0;for(let[i,s]of this.inZones){let r=this.cards.get(i)?.downTo===1;for(let o of s)o in t&&(r?e:t)[o]++}return{counts:t,downs:e,bands:this.bands}}bandBetween(t,e){return!t||!e?null:t===e?"engaged":this.bands.some(i=>i.a===t&&i.b===e||i.a===e&&i.b===t)?"near":"far"}#d(t,e){let i=t.person.emote;if(!i?.id)return null;let s=(e-(i.t0??0))%6,r=s<0?0:s<.2?s/.2:s>4.4?Math.max(0,1-(s-4.4)/.6):1,o=s<.3?.6+.4*Math.sin(s/.3*Math.PI*.5)+.12*Math.sin(s/.3*Math.PI):1;return{id:i.id,age:s,opacity:r,pop:o}}placeOf(t){let e=this.cards.get(t);if(!e)return null;let i=e.walk?e.walk.to.X:e.puppet.restX,s=e.walk?e.walk.to.Z:e.restZ,r=e.walk?e.walk.pose?.yaw??e.yawTo:e.yawTo;return{id:e.id,at:this.rig.fractionOf(i,s).map(o=>Math.round(o*1e4)/1e4),mark:e.mark,yaw:Math.round(r*10)/10}}formationMoves(t,{ids:e=null,focus:i=null,target:s=null,speakers:r=[],party:o=!1,gait:a="walk",dir:l="back",away:c=!1,size:h=null}={}){let u=this.standing(),d=e?u.filter(S=>e.includes(S.id)):u,f=this.focus;if(Array.isArray(i))f=this.rig.place(i)??this.focus;else if(typeof i=="string"&&this.cards.has(i)){let S=this.cards.get(i);f={X:S.puppet.restX,Z:S.restZ}}let x=this.grow(f.Z),g=d.map(S=>({...S,w:S.w*x}));if(t==="position")return this.#f(g,f,{party:o,gait:a});let p=["huddle","gangup","queue"].includes(t),m=null;if(Number.isFinite(h)&&h>0){let S=this.rig.fractionOf(f.X,f.Z),R=this.rig.standing([S[0]-h/2,S[1]]),P=this.rig.standing([S[0]+h/2,S[1]]);R&&P&&(m=Math.abs(P.X-R.X)/2)}let v=this.cover(),E=fp(t,{cards:g,focus:f,target:s,speakers:r,party:o,dir:l,radius:m,limits:{x:this.opts.limits.x,z:[this.opts.limits.z[0],200]},seed:this.steps%7}).filter(S=>this.cards.has(S.id)).map(S=>{let R=this.cards.get(S.id),P=this.grow(S.Z);return this.clearOfCover({...S,Z:this.unhidden(S.X,S.Z,R.w*P,R.h*P)},R,v)}),M=new Set(E.map(S=>S.id)),T=(S,R,P)=>{let L=this.cards.get(S),B=this.grow(P);return{id:S,X:R,Z:P,w:L.w*B,h:L.h*B,lift:this.riserFor(R,P,L.w*B,L.h*B)}},w=[...E.map(S=>T(S.id,S.X,S.Z)),...u.filter(S=>!M.has(S.id)).map(S=>T(S.id,S.X,S.Z))],C=new Map(mp(this.rig,w,M,{limits:this.opts.limits.x}).map(S=>[S.id,S.X]));return E.map(S=>{let R=this.cards.get(S.id),P=C.get(S.id)??S.X,L=this.grow(S.Z);return this.clearOfCover({...S,X:P,Z:this.unhidden(P,S.Z,R.w*L,R.h*L)},R,v)}).map(S=>({id:S.id,at:this.rig.fractionOf(S.X,S.Z).map(R=>Math.round(R*1e4)/1e4),yaw:c?180:S.yaw,lean:c?0:S.lean,pitch:c?0:S.pitch,gait:a,still:!0,packed:p}))}#f(t,e,{party:i,gait:s}){let r=this.rig.fractionOf(e.X,e.Z),o=Ds(this.zones.filter(p=>p.kind==="area"),r[0],r[1])[0]??Ds(this.zones,r[0],r[1])[0]??null,a=t.filter(p=>i||!p.pc);if(!o)return this.formationMoves("line",{ids:a.map(p=>p.id),focus:r,party:!0,gait:s});let l=Math.max(...a.map(p=>p.w),120),c=new Set(a.map(p=>p.id)),h=[...this.cards.values()].filter(p=>!c.has(p.id)&&p.holder===null).map(p=>({X:p.walk?p.walk.to.X:p.puppet.restX,Z:p.walk?p.walk.to.Z:p.restZ})),u=this.cover(),d=a[0]?this.cards.get(a[0].id):null,f=Qh(o,this.rig,{w:l*1.05,most:40}).filter(p=>!h.some(m=>Math.abs(m.X-p.X)<l*.6&&Math.abs(m.Z-p.Z)<90)).filter(p=>!d||this.coveredAt(p.X,p.Z,d,u)<=.15),x=[...a].sort((p,m)=>Math.hypot(p.X-e.X,p.Z-e.Z)-Math.hypot(m.X-e.X,m.Z-e.Z)),g=[];for(let p of x){if(!f.length)break;f.sort((v,E)=>Math.hypot(v.X-p.X,(v.Z-p.Z)*.8)-Math.hypot(E.X-p.X,(E.Z-p.Z)*.8));let m=f.shift();g.push({id:p.id,at:this.rig.fractionOf(m.X,m.Z).map(v=>Math.round(v*1e4)/1e4),yaw:0,lean:0,pitch:0,gait:s,still:!0,packed:!1})}return g}cover(){try{return this.coverFn?.()??[]}catch{return[]}}cardShapes(){let t=[];for(let e of this.cards.values()){let i=e.puppet.x,s=e.Z,r=this.grow(s),o=e.w*r,a=e.h*r,l=La(this.rig,{X:i,Z:s,w:o,h:a,lift:this.riserFor(i,s,o,a)});[l.x0,l.y0,l.x1,l.y1].every(Number.isFinite)&&t.push({rect:[l.x0,l.y0,l.x1,l.y1]})}return t}coveredAt(t,e,i,s=this.cover()){if(!s.length)return 0;let r=this.grow(e),o=i.w*r,a=i.h*r;return pp(La(this.rig,{X:t,Z:e,w:o,h:a,lift:this.riserFor(t,e,o,a)}),s)}clearOfCover(t,e,i=this.cover()){if(!i.length||this.coveredAt(t.X,t.Z,e,i)<=.15)return t;let s=this.rig.fractionOf(t.X,t.Z);for(let r=.0025;r<=.2;r+=.0025){let o=this.rig.place([s[0],s[1]-r]);if(o&&this.coveredAt(o.X,o.Z,e,i)<=.15-.01)return{...t,X:o.X,Z:o.Z}}return t}standing(){return[...this.cards.values()].filter(t=>t.holder===null).map(t=>({id:t.id,X:t.walk?t.walk.to.X:t.puppet.restX,Z:t.walk?t.walk.to.Z:t.restZ,w:t.w,pc:t.person.pc===!0}))}exportPlaces(){return[...this.cards.keys()].map(t=>this.placeOf(t))}},Ax=60,xp=(n,t)=>Number.isFinite(n)&&Number.isFinite(t)&&n>t+Ax;function Cx(n,t){let e=Math.max(0,Math.min(1,(t-n.t0)/n.dur));if(e<=0)return .02;let i=1.9,s=i+1;return Math.max(.02,1+s*(e-1)**3+i*(e-1)**2)}var Fa=class{constructor({limit:t=600,report:e=()=>{},onFatal:i=()=>{}}={}){this.limit=t,this.report=e,this.onFatal=i,this.failures=0,this.total=0}run(t){try{return t(),this.failures=0,!0}catch(e){return this.failures++,this.total++,(this.failures<=3||this.failures%300===0)&&this.report(e,this.failures),this.failures>=this.limit?(this.onFatal(e),!1):!0}}};var so=Object.freeze({every:33,heartbeat:1e3,delay:100,silent:2e3}),ro=n=>Math.round(n),An=n=>Math.round(n*10)/10,Ua=class{constructor({stage:t,scene:e,me:i,now:s,clock:r=s,send:o,mayHold:a=()=>!0,onLost:l=()=>{},onDrop:c=()=>{}}){Object.assign(this,{stage:t,scene:e,me:i,now:s,clock:r,mayHold:a,onLost:l,onDrop:c}),this.wire=o,this.mine=new Map,this.remote=new Map,this.sent=0}send(t){this.sent++,this.wire({scene:this.scene,...t})}holderOf(t){return this.mine.has(t)?this.me:this.remote.get(t)?.by??null}grab(t){let e=this.stage.cards.get(t);if(!e||!this.mayHold(t,this.me)||!this.stage.hold(t,this.me))return!1;let i=this.now();return this.mine.set(t,{stamp:{t:ro(i),user:this.me},last:{t:i,x:e.hand.x,y:e.hand.z}}),this.send({type:"grab",id:t,t:ro(i),x:An(e.hand.x),z:An(e.hand.z)}),!0}move(t,e,i){let s=this.mine.get(t);if(!s)return;this.stage.setHand(t,{x:e,z:i});let r=this.stage.cards.get(t).hand;this.#t(t,s,r,this.now())}#t(t,e,i,s){return Kf(e.last,i.x,i.z,s,so.every)?(e.last={t:s,x:i.x,y:i.z},e.moving=!0,this.send({type:"move",id:t,t:ro(s),x:An(i.x),z:An(i.z)}),!0):!1}verb(t,e){this.mine.has(t)&&(this.stage.perform(t,e),this.send({type:"verb",id:t,verb:e}))}release(t){if(!this.mine.has(t))return null;this.mine.delete(t);let e=this.stage.landingFor(t);if(!e)return null;let i={X:An(e.X),Z:An(e.Z),mark:e.mark},s=this.stage.release(t,i);return s&&(this.send({type:"release",id:t,t:ro(this.now()),X:i.X,Z:i.Z,mark:i.mark}),this.onDrop(s)),s}receive(t,e){!t||t.scene!==this.scene||e===this.me||this.stage.cards.has(t.id)&&(t.type==="grab"?this.#e(t,e):t.type==="move"?this.#i(t,e):t.type==="verb"?this.remote.get(t.id)?.by===e&&this.stage.perform(t.id,t.verb):t.type==="release"&&this.#s(t,e))}#e(t,e){if(!this.mayHold(t.id,e))return;let i={t:t.t,user:e},s=this.mine.get(t.id),r=this.remote.get(t.id),o=s?.stamp??r?.stamp??null;o&&r?.by!==e&&Qf(o,i)===o||(s&&(this.mine.delete(t.id),this.onLost(t.id)),this.#n(t,e,i))}#i(t,e){let i=this.remote.get(t.id);if(!i){if(this.mine.has(t.id)||!this.mayHold(t.id,e))return;this.#n(t,e,{t:t.t,user:e});return}i.by===e&&(i.buffer.push({t:t.t,x:t.x,y:t.z}),i.heard=this.clock())}#n(t,e,i){this.stage.hold(t.id,e)||this.stage.handOver(t.id,e);let s=new Ta({delay:so.delay});s.push({t:t.t,x:t.x,y:t.z}),this.remote.set(t.id,{by:e,stamp:i,buffer:s,heard:this.clock()})}#s(t,e){let i=this.remote.get(t.id);if(!i||i.by!==e)return;this.remote.delete(t.id);let s=this.stage.release(t.id,{X:t.X,Z:t.Z,mark:t.mark??null});s&&this.onDrop(s)}forget(t){this.mine.delete(t),this.remote.delete(t)}userGone(t){for(let[e,i]of[...this.remote])i.by===t&&this.#r(e)}#r(t){this.remote.delete(t);let e=this.stage.release(t);e&&this.onDrop(e)}tick(){let t=this.now(),e=this.clock();for(let[i,s]of[...this.remote]){if(e-s.heard>so.silent){this.#r(i);continue}let r=s.buffer.at(t);r&&this.stage.setHand(i,{x:r.x,z:r.y})}for(let[i,s]of this.mine){let r=this.stage.cards.get(i)?.hand;if(!r||this.#t(i,s,r,t))continue;let o=t-s.last.t;(s.moving&&o>=so.every||o>=so.heartbeat)&&(s.moving=!1,s.last={t,x:r.x,y:r.z},this.send({type:"move",id:i,t:ro(t),x:An(r.x),z:An(r.z)}))}}close(){for(let t of[...this.mine.keys()])this.release(t);this.remote.clear()}};function yp(n,t,e){let i=new Map(t.filter(r=>r&&typeof r.id=="string").map(r=>[r.id,r])),s=Math.round(e*1e3)/1e3;return n.map(r=>{let o=i.get(r.id);if(!o)return r;let a={...r};if(delete a.X,delete a.Z,delete a.enter,o.mark)a.mark=o.mark,delete a.at;else if(Array.isArray(o.at))a.at=[o.at[0],o.at[1]],delete a.mark;else return r;for(let l of["yaw","lean","pitch"])Number.isFinite(o[l])?a[l]=Math.round(o[l]*10)/10:l!=="yaw"&&delete a[l];return typeof o.still=="boolean"&&(a.still=o.still),typeof o.packed=="boolean"&&(a.packed=o.packed),a.move={t0:s,gait:o.gait??"walk"},a})}function _p(n,{gait:t="walk"}={}){let e=[];for(let i of n)!Array.isArray(i.home)||Array.isArray(i.at)&&Math.abs(i.at[0]-i.home[0])<1e-4&&Math.abs(i.at[1]-i.home[1])<1e-4&&!i.mark&&!i.still&&!i.packed||e.push({id:i.id,at:[i.home[0],i.home[1]],yaw:i.homeYaw??0,lean:0,pitch:0,gait:t,still:!1,packed:!1});return e}function vp(n,t){return n.map(e=>{if(e.id!==t.id)return e;let i={...e,at:t.at,yaw:t.yaw};return delete i.X,delete i.Z,delete i.enter,delete i.packed,i.life&&(i.still=!0),t.mark?i.mark=t.mark:delete i.mark,i})}function Mp(n,t,e=null){let i=new Map(t.filter(Boolean).map(s=>[s.id,s]));return n.map(s=>{let r=i.get(s.id);if(!r||e&&!e.includes(s.id)||!Array.isArray(r.at))return s;let o=Number.isFinite(r.yaw)?r.yaw:0;return Array.isArray(s.home)&&Math.abs(s.home[0]-r.at[0])<1e-4&&Math.abs(s.home[1]-r.at[1])<1e-4&&(s.homeYaw??0)===o?s:{...s,home:[r.at[0],r.at[1]],homeYaw:o}})}var Yp=0,Hu=1,jp=2;var fs=1,Jp=2,gr=3,zn=0,oi=1,hi=2,Ci=0,Hn=1,Mi=2,Gu=3,Vu=4,Kp=5;var ps=100,Qp=101,tm=102,em=103,im=104,nm=200,sm=201,rm=202,om=203,Wu=204,Xu=205,am=206,lm=207,cm=208,hm=209,um=210,dm=211,fm=212,pm=213,mm=214,ul=0,dl=1,fl=2,er=3,pl=4,ml=5,gl=6,xl=7,Zu=0,gm=1,xm=2,bi=0,Uo=1,Bo=2,zo=3,Ho=4,Go=5,Vo=6,Wo=7;var $u=300,Gn=301,ms=302,xr=303,Hl=304,Xo=306,yl=1e3,qi=1001,_l=1002,Ze=1003,ym=1004;var Zo=1005;var Ne=1006,Gl=1007;var tn=1008;var di=1009,qu=1010,Yu=1011,yr=1012,Vl=1013,zi=1014,Hi=1015,ze=1016,Wl=1017,Xl=1018,_r=1020,ju=35902,Ju=35899,Ku=1021,Qu=1022,fi=1023,Yi=1026,Vn=1027,td=1028,Zl=1029,Wn=1030,$l=1031;var ql=1033,$o=33776,qo=33777,Yo=33778,jo=33779,Yl=35840,jl=35841,Jl=35842,Kl=35843,Ql=36196,tc=37492,ec=37496,ic=37488,nc=37489,Jo=37490,sc=37491,rc=37808,oc=37809,ac=37810,lc=37811,cc=37812,hc=37813,uc=37814,dc=37815,fc=37816,pc=37817,mc=37818,gc=37819,xc=37820,yc=37821,_c=36492,vc=36494,Mc=36495,bc=36283,Sc=36284,Ko=36285,wc=36286;var po=2300,vl=2301,cl=2302,Iu=2303,Lu=2400,ku=2401,Du=2402;var _m=3200;var Tc=0,vm=1,gn="",Se="srgb",mo="srgb-linear",go="linear",Qt="srgb";var hl=7680;var Mm=519,bm=512,Sm=513,wm=514,Ec=515,Tm=516,Em=517,Ac=518,Am=519,ed=35044;var id="300 es",Fi=2e3,ir=2001;function Rx(n){for(let t=n.length-1;t>=0;--t)if(n[t]>=65535)return!0;return!1}function Px(n){return ArrayBuffer.isView(n)&&!(n instanceof DataView)}function xo(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function Cm(){let n=xo("canvas");return n.style.display="block",n}var bp={},nr=null;function yo(...n){let t="THREE."+n.shift();nr?nr("log",t,...n):console.log(t,...n)}function Rm(n){let t=n[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=n[1];e&&e.isStackTrace?n[0]+=" "+e.getLocation():n[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return n}function Nt(...n){n=Rm(n);let t="THREE."+n.shift();if(nr)nr("warn",t,...n);else{let e=n[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...n)}}function Dt(...n){n=Rm(n);let t="THREE."+n.shift();if(nr)nr("error",t,...n);else{let e=n[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...n)}}function cs(...n){let t=n.join(" ");t in bp||(bp[t]=!0,Nt(...n))}function Pm(n,t,e){return new Promise(function(i,s){function r(){switch(n.clientWaitSync(t,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:i()}}setTimeout(r,e)})}var Im={[ul]:dl,[fl]:gl,[pl]:xl,[er]:ml,[dl]:ul,[gl]:fl,[xl]:pl,[ml]:er},ji=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(e)===-1&&i[t].push(e)}hasEventListener(t,e){let i=this._listeners;return i===void 0?!1:i[t]!==void 0&&i[t].indexOf(e)!==-1}removeEventListener(t,e){let i=this._listeners;if(i===void 0)return;let s=i[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let i=e[t.type];if(i!==void 0){t.target=this;let s=i.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}},ti=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];var au=Math.PI/180,_o=180/Math.PI;function kn(){let n=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(ti[n&255]+ti[n>>8&255]+ti[n>>16&255]+ti[n>>24&255]+"-"+ti[t&255]+ti[t>>8&255]+"-"+ti[t>>16&15|64]+ti[t>>24&255]+"-"+ti[e&63|128]+ti[e>>8&255]+"-"+ti[e>>16&255]+ti[e>>24&255]+ti[i&255]+ti[i>>8&255]+ti[i>>16&255]+ti[i>>24&255]).toLowerCase()}function qt(n,t,e){return Math.max(t,Math.min(e,n))}function Ix(n,t){return(n%t+t)%t}function lu(n,t,e){return(1-e)*n+e*t}function $i(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:case Uint8ClampedArray:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function oe(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var Mt=class n{static{n.prototype.isVector2=!0}constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,i=this.y,s=t.elements;return this.x=s[0]*e+s[3]*i+s[6],this.y=s[1]*e+s[4]*i+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=qt(this.x,t.x,e.x),this.y=qt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=qt(this.x,t,e),this.y=qt(this.y,t,e),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(qt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let i=this.dot(t)/e;return Math.acos(qt(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,i=this.y-t.y;return e*e+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let i=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*i-o*s+t.x,this.y=r*s+o*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Ji=class{constructor(t=0,e=0,i=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=i,this._w=s}static slerpFlat(t,e,i,s,r,o,a){let l=i[s+0],c=i[s+1],h=i[s+2],u=i[s+3],d=r[o+0],f=r[o+1],x=r[o+2],g=r[o+3];if(u!==g||l!==d||c!==f||h!==x){let p=l*d+c*f+h*x+u*g;p<0&&(d=-d,f=-f,x=-x,g=-g,p=-p);let m=1-a;if(p<.9995){let v=Math.acos(p),E=Math.sin(v);m=Math.sin(m*v)/E,a=Math.sin(a*v)/E,l=l*m+d*a,c=c*m+f*a,h=h*m+x*a,u=u*m+g*a}else{l=l*m+d*a,c=c*m+f*a,h=h*m+x*a,u=u*m+g*a;let v=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=v,c*=v,h*=v,u*=v}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=u}static multiplyQuaternionsFlat(t,e,i,s,r,o){let a=i[s],l=i[s+1],c=i[s+2],h=i[s+3],u=r[o],d=r[o+1],f=r[o+2],x=r[o+3];return t[e]=a*x+h*u+l*f-c*d,t[e+1]=l*x+h*d+c*u-a*f,t[e+2]=c*x+h*f+a*d-l*u,t[e+3]=h*x-a*u-l*d-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,i,s){return this._x=t,this._y=e,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let i=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(i/2),h=a(s/2),u=a(r/2),d=l(i/2),f=l(s/2),x=l(r/2);switch(o){case"XYZ":this._x=d*h*u+c*f*x,this._y=c*f*u-d*h*x,this._z=c*h*x+d*f*u,this._w=c*h*u-d*f*x;break;case"YXZ":this._x=d*h*u+c*f*x,this._y=c*f*u-d*h*x,this._z=c*h*x-d*f*u,this._w=c*h*u+d*f*x;break;case"ZXY":this._x=d*h*u-c*f*x,this._y=c*f*u+d*h*x,this._z=c*h*x+d*f*u,this._w=c*h*u-d*f*x;break;case"ZYX":this._x=d*h*u-c*f*x,this._y=c*f*u+d*h*x,this._z=c*h*x-d*f*u,this._w=c*h*u+d*f*x;break;case"YZX":this._x=d*h*u+c*f*x,this._y=c*f*u+d*h*x,this._z=c*h*x-d*f*u,this._w=c*h*u-d*f*x;break;case"XZY":this._x=d*h*u-c*f*x,this._y=c*f*u-d*h*x,this._z=c*h*x+d*f*u,this._w=c*h*u+d*f*x;break;default:Nt("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let i=e/2,s=Math.sin(i);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,i=e[0],s=e[4],r=e[8],o=e[1],a=e[5],l=e[9],c=e[2],h=e[6],u=e[10],d=i+a+u;if(d>0){let f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(o-s)*f}else if(i>a&&i>u){let f=2*Math.sqrt(1+i-a-u);this._w=(h-l)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+c)/f}else if(a>u){let f=2*Math.sqrt(1+a-i-u);this._w=(r-c)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(l+h)/f}else{let f=2*Math.sqrt(1+u-i-a);this._w=(o-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let i=t.dot(e)+1;return i<1e-8?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(qt(this.dot(t),-1,1)))}rotateTowards(t,e){let i=this.angleTo(t);if(i===0)return this;let s=Math.min(1,e/i);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let i=t._x,s=t._y,r=t._z,o=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=i*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-i*c,this._z=r*h+o*c+i*l-s*a,this._w=o*h-i*a-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let i=t._x,s=t._y,r=t._z,o=t._w,a=this.dot(t);a<0&&(i=-i,s=-s,r=-r,o=-o,a=-a);let l=1-e;if(a<.9995){let c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+i*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this._onChangeCallback()}else this._x=this._x*l+i*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this.normalize();return this}slerpQuaternions(t,e,i){return this.copy(t).slerp(e,i)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},D=class n{static{n.prototype.isVector3=!0}constructor(t=0,e=0,i=0){this.x=t,this.y=e,this.z=i}set(t,e,i){return i===void 0&&(i=this.z),this.x=t,this.y=e,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Sp.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Sp.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,i=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*i+r[6]*s,this.y=r[1]*e+r[4]*i+r[7]*s,this.z=r[2]*e+r[5]*i+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,i=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*i+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*i+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*i+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*i+r[10]*s+r[14])*o,this}applyQuaternion(t){let e=this.x,i=this.y,s=this.z,r=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*s-a*i),h=2*(a*e-r*s),u=2*(r*i-o*e);return this.x=e+l*c+o*u-a*h,this.y=i+l*h+a*c-r*u,this.z=s+l*u+r*h-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,i=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*i+r[8]*s,this.y=r[1]*e+r[5]*i+r[9]*s,this.z=r[2]*e+r[6]*i+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=qt(this.x,t.x,e.x),this.y=qt(this.y,t.y,e.y),this.z=qt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=qt(this.x,t,e),this.y=qt(this.y,t,e),this.z=qt(this.z,t,e),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(qt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let i=t.x,s=t.y,r=t.z,o=e.x,a=e.y,l=e.z;return this.x=s*l-r*a,this.y=r*o-i*l,this.z=i*a-s*o,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let i=t.dot(this)/e;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return cu.copy(this).projectOnVector(t),this.sub(cu)}reflect(t){return this.sub(cu.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let i=this.dot(t)/e;return Math.acos(qt(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,i=this.y-t.y,s=this.z-t.z;return e*e+i*i+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,i){let s=Math.sin(e)*t;return this.x=s*Math.sin(i),this.y=Math.cos(e)*t,this.z=s*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,i){return this.x=t*Math.sin(e),this.y=i,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=i,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,i=Math.sqrt(1-e*e);return this.x=i*Math.cos(t),this.y=e,this.z=i*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},cu=new D,Sp=new Ji,Bt=class n{static{n.prototype.isMatrix3=!0}constructor(t,e,i,s,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,i,s,r,o,a,l,c)}set(t,e,i,s,r,o,a,l,c){let h=this.elements;return h[0]=t,h[1]=s,h[2]=a,h[3]=e,h[4]=r,h[5]=l,h[6]=i,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],this}extractBasis(t,e,i){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let i=t.elements,s=e.elements,r=this.elements,o=i[0],a=i[3],l=i[6],c=i[1],h=i[4],u=i[7],d=i[2],f=i[5],x=i[8],g=s[0],p=s[3],m=s[6],v=s[1],E=s[4],M=s[7],T=s[2],w=s[5],C=s[8];return r[0]=o*g+a*v+l*T,r[3]=o*p+a*E+l*w,r[6]=o*m+a*M+l*C,r[1]=c*g+h*v+u*T,r[4]=c*p+h*E+u*w,r[7]=c*m+h*M+u*C,r[2]=d*g+f*v+x*T,r[5]=d*p+f*E+x*w,r[8]=d*m+f*M+x*C,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*o*h-e*a*c-i*r*h+i*a*l+s*r*c-s*o*l}invert(){let t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=h*o-a*c,d=a*l-h*r,f=c*r-o*l,x=e*u+i*d+s*f;if(x===0)return this.set(0,0,0,0,0,0,0,0,0);let g=1/x;return t[0]=u*g,t[1]=(s*c-h*i)*g,t[2]=(a*i-s*o)*g,t[3]=d*g,t[4]=(h*e-s*l)*g,t[5]=(s*r-a*e)*g,t[6]=f*g,t[7]=(i*l-c*e)*g,t[8]=(o*e-i*r)*g,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,i,s,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(i*l,i*c,-i*(l*o+c*a)+o+t,-s*c,s*l,-s*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return cs("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(hu.makeScale(t,e)),this}rotate(t){return cs("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(hu.makeRotation(-t)),this}translate(t,e){return cs("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(hu.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,i,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,i=t.elements;for(let s=0;s<9;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<9;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){let i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}},hu=new Bt,wp=new Bt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Tp=new Bt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Lx(){let n={enabled:!0,workingColorSpace:mo,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===Qt&&(s.r=pn(s.r),s.g=pn(s.g),s.b=pn(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===Qt&&(s.r=tr(s.r),s.g=tr(s.g),s.b=tr(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===gn?go:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return cs("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return cs("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[mo]:{primaries:t,whitePoint:i,transfer:go,toXYZ:wp,fromXYZ:Tp,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:Se},outputColorSpaceConfig:{drawingBufferColorSpace:Se}},[Se]:{primaries:t,whitePoint:i,transfer:Qt,toXYZ:wp,fromXYZ:Tp,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:Se}}}),n}var Wt=Lx();function pn(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function tr(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}var Fs,Ml=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let i;if(t instanceof HTMLCanvasElement)i=t;else{Fs===void 0&&(Fs=xo("canvas")),Fs.width=t.width,Fs.height=t.height;let s=Fs.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),i=Fs}return i.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=xo("canvas");e.width=t.width,e.height=t.height;let i=e.getContext("2d");i.drawImage(t,0,0,t.width,t.height);let s=i.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=pn(r[o]/255)*255;return i.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let i=0;i<e.length;i++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[i]=Math.floor(pn(e[i]/255)*255):e[i]=pn(e[i]);return{data:e,width:t.width,height:t.height}}else return Nt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},kx=0,sr=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:kx++}),this.uuid=kn(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(uu(s[o].image)):r.push(uu(s[o]))}else r=uu(s);i.url=r}return e||(t.images[this.uuid]=i),i}};function uu(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Ml.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(Nt("Texture: Unable to serialize Texture."),{})}var Dx=0,du=new D,Be=class n extends ji{constructor(t=n.DEFAULT_IMAGE,e=n.DEFAULT_MAPPING,i=qi,s=qi,r=Ne,o=tn,a=fi,l=di,c=n.DEFAULT_ANISOTROPY,h=gn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Dx++}),this.uuid=kn(),this.name="",this.source=new sr(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Mt(0,0),this.repeat=new Mt(1,1),this.center=new Mt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Bt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(du).x}get height(){return this.source.getSize(du).y}get depth(){return this.source.getSize(du).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let i=t[e];if(i===void 0){Nt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Nt(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&i&&s.isVector2&&i.isVector2||s&&i&&s.isVector3&&i.isVector3||s&&i&&s.isMatrix3&&i.isMatrix3?s.copy(i):this[e]=i}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),e||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==$u)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case yl:t.x=t.x-Math.floor(t.x);break;case qi:t.x=t.x<0?0:1;break;case _l:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case yl:t.y=t.y-Math.floor(t.y);break;case qi:t.y=t.y<0?0:1;break;case _l:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};Be.DEFAULT_IMAGE=null;Be.DEFAULT_MAPPING=$u;Be.DEFAULT_ANISOTROPY=1;var ye=class n{static{n.prototype.isVector4=!0}constructor(t=0,e=0,i=0,s=1){this.x=t,this.y=e,this.z=i,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,i,s){return this.x=t,this.y=e,this.z=i,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,i=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*i+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*i+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*i+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*i+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,i,s,r,l=t.elements,c=l[0],h=l[4],u=l[8],d=l[1],f=l[5],x=l[9],g=l[2],p=l[6],m=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-g)<.01&&Math.abs(x-p)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+g)<.1&&Math.abs(x+p)<.1&&Math.abs(c+f+m-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let E=(c+1)/2,M=(f+1)/2,T=(m+1)/2,w=(h+d)/4,C=(u+g)/4,_=(x+p)/4;return E>M&&E>T?E<.01?(i=0,s=.707106781,r=.707106781):(i=Math.sqrt(E),s=w/i,r=C/i):M>T?M<.01?(i=.707106781,s=0,r=.707106781):(s=Math.sqrt(M),i=w/s,r=_/s):T<.01?(i=.707106781,s=.707106781,r=0):(r=Math.sqrt(T),i=C/r,s=_/r),this.set(i,s,r,e),this}let v=Math.sqrt((p-x)*(p-x)+(u-g)*(u-g)+(d-h)*(d-h));return Math.abs(v)<.001&&(v=1),this.x=(p-x)/v,this.y=(u-g)/v,this.z=(d-h)/v,this.w=Math.acos((c+f+m-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=qt(this.x,t.x,e.x),this.y=qt(this.y,t.y,e.y),this.z=qt(this.z,t.z,e.z),this.w=qt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=qt(this.x,t,e),this.y=qt(this.y,t,e),this.z=qt(this.z,t,e),this.w=qt(this.w,t,e),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(qt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this.w=t.w+(e.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},bl=class extends ji{constructor(t=1,e=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ne,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},i),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=i.depth,this.scissor=new ye(0,0,t,e),this.scissorTest=!1,this.viewport=new ye(0,0,t,e),this.textures=[];let s={width:t,height:e,depth:i.depth},r=new Be(s),o=i.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveColorBuffer=i.resolveColorBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.storeMultisampledColorBuffer=i.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=i.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=i.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview,this.useArrayDepthTexture=i.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:Ne,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,i=1){if(this.width!==t||this.height!==e||this.depth!==i){this.width=t,this.height=e,this.depth=i;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=i,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,i=t.textures.length;e<i;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new sr(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},we=class extends bl{constructor(t=1,e=1,i={}){super(t,e,i),this.isWebGLRenderTarget=!0}},vo=class extends Be{constructor(t=null,e=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=Ze,this.minFilter=Ze,this.wrapR=qi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var Sl=class extends Be{constructor(t=null,e=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=Ze,this.minFilter=Ze,this.wrapR=qi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var de=class n{static{n.prototype.isMatrix4=!0}constructor(t,e,i,s,r,o,a,l,c,h,u,d,f,x,g,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,i,s,r,o,a,l,c,h,u,d,f,x,g,p)}set(t,e,i,s,r,o,a,l,c,h,u,d,f,x,g,p){let m=this.elements;return m[0]=t,m[4]=e,m[8]=i,m[12]=s,m[1]=r,m[5]=o,m[9]=a,m[13]=l,m[2]=c,m[6]=h,m[10]=u,m[14]=d,m[3]=f,m[7]=x,m[11]=g,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new n().fromArray(this.elements)}copy(t){let e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],e[9]=i[9],e[10]=i[10],e[11]=i[11],e[12]=i[12],e[13]=i[13],e[14]=i[14],e[15]=i[15],this}copyPosition(t){let e=this.elements,i=t.elements;return e[12]=i[12],e[13]=i[13],e[14]=i[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,i){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),i.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(t,e,i){return this.set(t.x,e.x,i.x,0,t.y,e.y,i.y,0,t.z,e.z,i.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,i=t.elements,s=1/Us.setFromMatrixColumn(t,0).length(),r=1/Us.setFromMatrixColumn(t,1).length(),o=1/Us.setFromMatrixColumn(t,2).length();return e[0]=i[0]*s,e[1]=i[1]*s,e[2]=i[2]*s,e[3]=0,e[4]=i[4]*r,e[5]=i[5]*r,e[6]=i[6]*r,e[7]=0,e[8]=i[8]*o,e[9]=i[9]*o,e[10]=i[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,i=t.x,s=t.y,r=t.z,o=Math.cos(i),a=Math.sin(i),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(t.order==="XYZ"){let d=o*h,f=o*u,x=a*h,g=a*u;e[0]=l*h,e[4]=-l*u,e[8]=c,e[1]=f+x*c,e[5]=d-g*c,e[9]=-a*l,e[2]=g-d*c,e[6]=x+f*c,e[10]=o*l}else if(t.order==="YXZ"){let d=l*h,f=l*u,x=c*h,g=c*u;e[0]=d+g*a,e[4]=x*a-f,e[8]=o*c,e[1]=o*u,e[5]=o*h,e[9]=-a,e[2]=f*a-x,e[6]=g+d*a,e[10]=o*l}else if(t.order==="ZXY"){let d=l*h,f=l*u,x=c*h,g=c*u;e[0]=d-g*a,e[4]=-o*u,e[8]=x+f*a,e[1]=f+x*a,e[5]=o*h,e[9]=g-d*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){let d=o*h,f=o*u,x=a*h,g=a*u;e[0]=l*h,e[4]=x*c-f,e[8]=d*c+g,e[1]=l*u,e[5]=g*c+d,e[9]=f*c-x,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){let d=o*l,f=o*c,x=a*l,g=a*c;e[0]=l*h,e[4]=g-d*u,e[8]=x*u+f,e[1]=u,e[5]=o*h,e[9]=-a*h,e[2]=-c*h,e[6]=f*u+x,e[10]=d-g*u}else if(t.order==="XZY"){let d=o*l,f=o*c,x=a*l,g=a*c;e[0]=l*h,e[4]=-u,e[8]=c*h,e[1]=d*u+g,e[5]=o*h,e[9]=f*u-x,e[2]=x*u-f,e[6]=a*h,e[10]=g*u+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Nx,t,Ox)}lookAt(t,e,i){let s=this.elements;return yi.subVectors(t,e),yi.lengthSq()===0&&(yi.z=1),yi.normalize(),Cn.crossVectors(i,yi),Cn.lengthSq()===0&&(Math.abs(i.z)===1?yi.x+=1e-4:yi.z+=1e-4,yi.normalize(),Cn.crossVectors(i,yi)),Cn.normalize(),Ba.crossVectors(yi,Cn),s[0]=Cn.x,s[4]=Ba.x,s[8]=yi.x,s[1]=Cn.y,s[5]=Ba.y,s[9]=yi.y,s[2]=Cn.z,s[6]=Ba.z,s[10]=yi.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let i=t.elements,s=e.elements,r=this.elements,o=i[0],a=i[4],l=i[8],c=i[12],h=i[1],u=i[5],d=i[9],f=i[13],x=i[2],g=i[6],p=i[10],m=i[14],v=i[3],E=i[7],M=i[11],T=i[15],w=s[0],C=s[4],_=s[8],S=s[12],R=s[1],P=s[5],L=s[9],B=s[13],I=s[2],U=s[6],V=s[10],$=s[14],et=s[3],Z=s[7],J=s[11],tt=s[15];return r[0]=o*w+a*R+l*I+c*et,r[4]=o*C+a*P+l*U+c*Z,r[8]=o*_+a*L+l*V+c*J,r[12]=o*S+a*B+l*$+c*tt,r[1]=h*w+u*R+d*I+f*et,r[5]=h*C+u*P+d*U+f*Z,r[9]=h*_+u*L+d*V+f*J,r[13]=h*S+u*B+d*$+f*tt,r[2]=x*w+g*R+p*I+m*et,r[6]=x*C+g*P+p*U+m*Z,r[10]=x*_+g*L+p*V+m*J,r[14]=x*S+g*B+p*$+m*tt,r[3]=v*w+E*R+M*I+T*et,r[7]=v*C+E*P+M*U+T*Z,r[11]=v*_+E*L+M*V+T*J,r[15]=v*S+E*B+M*$+T*tt,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],i=t[4],s=t[8],r=t[12],o=t[1],a=t[5],l=t[9],c=t[13],h=t[2],u=t[6],d=t[10],f=t[14],x=t[3],g=t[7],p=t[11],m=t[15],v=l*f-c*d,E=a*f-c*u,M=a*d-l*u,T=o*f-c*h,w=o*d-l*h,C=o*u-a*h;return e*(g*v-p*E+m*M)-i*(x*v-p*T+m*w)+s*(x*E-g*T+m*C)-r*(x*M-g*w+p*C)}determinantAffine(){let t=this.elements,e=t[0],i=t[4],s=t[8],r=t[1],o=t[5],a=t[9],l=t[2],c=t[6],h=t[10];return e*(o*h-a*c)-i*(r*h-a*l)+s*(r*c-o*l)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,i){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=i),this}invert(){let t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=t[9],d=t[10],f=t[11],x=t[12],g=t[13],p=t[14],m=t[15],v=e*a-i*o,E=e*l-s*o,M=e*c-r*o,T=i*l-s*a,w=i*c-r*a,C=s*c-r*l,_=h*g-u*x,S=h*p-d*x,R=h*m-f*x,P=u*p-d*g,L=u*m-f*g,B=d*m-f*p,I=v*B-E*L+M*P+T*R-w*S+C*_;if(I===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let U=1/I;return t[0]=(a*B-l*L+c*P)*U,t[1]=(s*L-i*B-r*P)*U,t[2]=(g*C-p*w+m*T)*U,t[3]=(d*w-u*C-f*T)*U,t[4]=(l*R-o*B-c*S)*U,t[5]=(e*B-s*R+r*S)*U,t[6]=(p*M-x*C-m*E)*U,t[7]=(h*C-d*M+f*E)*U,t[8]=(o*L-a*R+c*_)*U,t[9]=(i*R-e*L-r*_)*U,t[10]=(x*w-g*M+m*v)*U,t[11]=(u*M-h*w-f*v)*U,t[12]=(a*S-o*P-l*_)*U,t[13]=(e*P-i*S+s*_)*U,t[14]=(g*E-x*T-p*v)*U,t[15]=(h*T-u*E+d*v)*U,this}scale(t){let e=this.elements,i=t.x,s=t.y,r=t.z;return e[0]*=i,e[4]*=s,e[8]*=r,e[1]*=i,e[5]*=s,e[9]*=r,e[2]*=i,e[6]*=s,e[10]*=r,e[3]*=i,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,i,s))}makeTranslation(t,e,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,i,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,e,-i,0,0,i,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,0,i,0,0,1,0,0,-i,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,0,i,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let i=Math.cos(e),s=Math.sin(e),r=1-i,o=t.x,a=t.y,l=t.z,c=r*o,h=r*a;return this.set(c*o+i,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+i,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+i,0,0,0,0,1),this}makeScale(t,e,i){return this.set(t,0,0,0,0,e,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,e,i,s,r,o){return this.set(1,i,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,i){let s=this.elements,r=e._x,o=e._y,a=e._z,l=e._w,c=r+r,h=o+o,u=a+a,d=r*c,f=r*h,x=r*u,g=o*h,p=o*u,m=a*u,v=l*c,E=l*h,M=l*u,T=i.x,w=i.y,C=i.z;return s[0]=(1-(g+m))*T,s[1]=(f+M)*T,s[2]=(x-E)*T,s[3]=0,s[4]=(f-M)*w,s[5]=(1-(d+m))*w,s[6]=(p+v)*w,s[7]=0,s[8]=(x+E)*C,s[9]=(p-v)*C,s[10]=(1-(d+g))*C,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,i){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return i.set(1,1,1),e.identity(),this;let o=Us.set(s[0],s[1],s[2]).length(),a=Us.set(s[4],s[5],s[6]).length(),l=Us.set(s[8],s[9],s[10]).length();r<0&&(o=-o),Di.copy(this);let c=1/o,h=1/a,u=1/l;return Di.elements[0]*=c,Di.elements[1]*=c,Di.elements[2]*=c,Di.elements[4]*=h,Di.elements[5]*=h,Di.elements[6]*=h,Di.elements[8]*=u,Di.elements[9]*=u,Di.elements[10]*=u,e.setFromRotationMatrix(Di),i.x=o,i.y=a,i.z=l,this}makePerspective(t,e,i,s,r,o,a=Fi,l=!1){let c=this.elements,h=2*r/(e-t),u=2*r/(i-s),d=(e+t)/(e-t),f=(i+s)/(i-s),x,g;if(l)x=r/(o-r),g=o*r/(o-r);else if(a===Fi)x=-(o+r)/(o-r),g=-2*o*r/(o-r);else if(a===ir)x=-o/(o-r),g=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=x,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,i,s,r,o,a=Fi,l=!1){let c=this.elements,h=2/(e-t),u=2/(i-s),d=-(e+t)/(e-t),f=-(i+s)/(i-s),x,g;if(l)x=1/(o-r),g=o/(o-r);else if(a===Fi)x=-2/(o-r),g=-(o+r)/(o-r);else if(a===ir)x=-1/(o-r),g=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=x,c[14]=g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){let e=this.elements,i=t.elements;for(let s=0;s<16;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<16;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){let i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t[e+9]=i[9],t[e+10]=i[10],t[e+11]=i[11],t[e+12]=i[12],t[e+13]=i[13],t[e+14]=i[14],t[e+15]=i[15],t}},Us=new D,Di=new de,Nx=new D(0,0,0),Ox=new D(1,1,1),Cn=new D,Ba=new D,yi=new D,Ep=new de,Ap=new Ji,mn=class n{constructor(t=0,e=0,i=0,s=n.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=i,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,i,s=this._order){return this._x=t,this._y=e,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,i=!0){let s=t.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],u=s[2],d=s[6],f=s[10];switch(e){case"XYZ":this._y=Math.asin(qt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-qt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(qt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-qt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(qt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-qt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Nt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,i){return Ep.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Ep,e,i)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Ap.setFromEuler(this),this.setFromQuaternion(Ap,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};mn.DEFAULT_ORDER="XYZ";var rr=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},Fx=0,Cp=new D,Bs=new Ji,ln=new de,za=new D,oo=new D,Ux=new D,Bx=new Ji,Rp=new D(1,0,0),Pp=new D(0,1,0),Ip=new D(0,0,1),Lp={type:"added"},zx={type:"removed"},zs={type:"childadded",child:null},fu={type:"childremoved",child:null},Ye=class n extends ji{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Fx++}),this.uuid=kn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=n.DEFAULT_UP.clone();let t=new D,e=new mn,i=new Ji,s=new D(1,1,1);function r(){i.setFromEuler(e,!1)}function o(){e.setFromQuaternion(i,void 0,!1)}e._onChange(r),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new de},normalMatrix:{value:new Bt}}),this.matrix=new de,this.matrixWorld=new de,this.matrixAutoUpdate=n.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=n.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new rr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Bs.setFromAxisAngle(t,e),this.quaternion.multiply(Bs),this}rotateOnWorldAxis(t,e){return Bs.setFromAxisAngle(t,e),this.quaternion.premultiply(Bs),this}rotateX(t){return this.rotateOnAxis(Rp,t)}rotateY(t){return this.rotateOnAxis(Pp,t)}rotateZ(t){return this.rotateOnAxis(Ip,t)}translateOnAxis(t,e){return Cp.copy(t).applyQuaternion(this.quaternion),this.position.add(Cp.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Rp,t)}translateY(t){return this.translateOnAxis(Pp,t)}translateZ(t){return this.translateOnAxis(Ip,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(ln.copy(this.matrixWorld).invert())}lookAt(t,e,i){t.isVector3?za.copy(t):za.set(t,e,i);let s=this.parent;this.updateWorldMatrix(!0,!1),oo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ln.lookAt(oo,za,this.up):ln.lookAt(za,oo,this.up),this.quaternion.setFromRotationMatrix(ln),s&&(ln.extractRotation(s.matrixWorld),Bs.setFromRotationMatrix(ln),this.quaternion.premultiply(Bs.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(Dt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Lp),zs.child=t,this.dispatchEvent(zs),zs.child=null):Dt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(zx),fu.child=t,this.dispatchEvent(fu),fu.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),ln.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),ln.multiply(t.parent.matrixWorld)),t.applyMatrix4(ln),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Lp),zs.child=t,this.dispatchEvent(zs),zs.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let i=0,s=this.children.length;i<s;i++){let o=this.children[i].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,i=[]){this[t]===e&&i.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(oo,t,Ux),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(oo,Bx,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,i=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*i-r[8]*s,r[13]+=i-r[1]*e-r[5]*i-r[9]*s,r[14]+=s-r[2]*e-r[6]*i-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].updateMatrixWorld(t)}updateWorldMatrix(t,e,i=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||i)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,i=!0),e===!0){let r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,i)}}toJSON(t){let e=t===void 0||typeof t=="string",i={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let u=l[c];r(t.shapes,u)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(t.materials,this.material[l]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];s.animations.push(r(t.animations,l))}}if(e){let a=o(t.geometries),l=o(t.materials),c=o(t.textures),h=o(t.images),u=o(t.shapes),d=o(t.skeletons),f=o(t.animations),x=o(t.nodes);a.length>0&&(i.geometries=a),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),h.length>0&&(i.images=h),u.length>0&&(i.shapes=u),d.length>0&&(i.skeletons=d),f.length>0&&(i.animations=f),x.length>0&&(i.nodes=x)}return i.object=s,i;function o(a){let l=[];for(let c in a){let h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let i=0;i<t.children.length;i++){let s=t.children[i];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};Ye.DEFAULT_UP=new D(0,1,0);Ye.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ye.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Ue=class extends Ye{constructor(){super(),this.isGroup=!0,this.type="Group"}},Hx={type:"move"},or=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ue,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ue,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new D,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new D),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ue,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new D,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new D,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let i of t.hand.values())this._getHandJoint(e,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,i){let s=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(let g of t.hand.values()){let p=e.getJointPose(g,i),m=this._getHandJoint(c,g);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}let h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,x=.005;c.inputState.pinching&&d>f+x?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&d<=f-x&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,i),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));a!==null&&(s=e.getPose(t.targetRaySpace,i),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Hx)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let i=new Ue;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[e.jointName]=i,t.add(i)}return t.joints[e.jointName]}},Lm={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Rn={h:0,s:0,l:0},Ha={h:0,s:0,l:0};function pu(n,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?n+(t-n)*6*e:e<1/2?t:e<2/3?n+(t-n)*6*(2/3-e):n}var At=class{constructor(t,e,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,i)}set(t,e,i){if(e===void 0&&i===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Se){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Wt.colorSpaceToWorking(this,e),this}setRGB(t,e,i,s=Wt.workingColorSpace){return this.r=t,this.g=e,this.b=i,Wt.colorSpaceToWorking(this,s),this}setHSL(t,e,i,s=Wt.workingColorSpace){if(t=Ix(t,1),e=qt(e,0,1),i=qt(i,0,1),e===0)this.r=this.g=this.b=i;else{let r=i<=.5?i*(1+e):i+e-i*e,o=2*i-r;this.r=pu(o,r,t+1/3),this.g=pu(o,r,t),this.b=pu(o,r,t-1/3)}return Wt.colorSpaceToWorking(this,s),this}setStyle(t,e=Se){function i(r){r!==void 0&&parseFloat(r)<1&&Nt("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Nt("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);Nt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Se){let i=Lm[t.toLowerCase()];return i!==void 0?this.setHex(i,e):Nt("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=pn(t.r),this.g=pn(t.g),this.b=pn(t.b),this}copyLinearToSRGB(t){return this.r=tr(t.r),this.g=tr(t.g),this.b=tr(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Se){return Wt.workingToColorSpace(ei.copy(this),t),Math.round(qt(ei.r*255,0,255))*65536+Math.round(qt(ei.g*255,0,255))*256+Math.round(qt(ei.b*255,0,255))}getHexString(t=Se){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Wt.workingColorSpace){Wt.workingToColorSpace(ei.copy(this),e);let i=ei.r,s=ei.g,r=ei.b,o=Math.max(i,s,r),a=Math.min(i,s,r),l,c,h=(a+o)/2;if(a===o)l=0,c=0;else{let u=o-a;switch(c=h<=.5?u/(o+a):u/(2-o-a),o){case i:l=(s-r)/u+(s<r?6:0);break;case s:l=(r-i)/u+2;break;case r:l=(i-s)/u+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=Wt.workingColorSpace){return Wt.workingToColorSpace(ei.copy(this),e),t.r=ei.r,t.g=ei.g,t.b=ei.b,t}getStyle(t=Se){Wt.workingToColorSpace(ei.copy(this),t);let e=ei.r,i=ei.g,s=ei.b;return t!==Se?`color(${t} ${e.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(t,e,i){return this.getHSL(Rn),this.setHSL(Rn.h+t,Rn.s+e,Rn.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,i){return this.r=t.r+(e.r-t.r)*i,this.g=t.g+(e.g-t.g)*i,this.b=t.b+(e.b-t.b)*i,this}lerpHSL(t,e){this.getHSL(Rn),t.getHSL(Ha);let i=lu(Rn.h,Ha.h,e),s=lu(Rn.s,Ha.s,e),r=lu(Rn.l,Ha.l,e);return this.setHSL(i,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,i=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*i+r[6]*s,this.g=r[1]*e+r[4]*i+r[7]*s,this.b=r[2]*e+r[5]*i+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},ei=new At;At.NAMES=Lm;var Mo=class extends Ye{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new mn,this.environmentIntensity=1,this.environmentRotation=new mn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},Ni=new D,cn=new D,mu=new D,hn=new D,Hs=new D,Gs=new D,kp=new D,gu=new D,xu=new D,yu=new D,_u=new ye,vu=new ye,Mu=new ye,fn=class n{constructor(t=new D,e=new D,i=new D){this.a=t,this.b=e,this.c=i}static getNormal(t,e,i,s){s.subVectors(i,e),Ni.subVectors(t,e),s.cross(Ni);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,i,s,r){Ni.subVectors(s,e),cn.subVectors(i,e),mu.subVectors(t,e);let o=Ni.dot(Ni),a=Ni.dot(cn),l=Ni.dot(mu),c=cn.dot(cn),h=cn.dot(mu),u=o*c-a*a;if(u===0)return r.set(0,0,0),null;let d=1/u,f=(c*l-a*h)*d,x=(o*h-a*l)*d;return r.set(1-f-x,x,f)}static containsPoint(t,e,i,s){return this.getBarycoord(t,e,i,s,hn)===null?!1:hn.x>=0&&hn.y>=0&&hn.x+hn.y<=1}static getInterpolation(t,e,i,s,r,o,a,l){return this.getBarycoord(t,e,i,s,hn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,hn.x),l.addScaledVector(o,hn.y),l.addScaledVector(a,hn.z),l)}static getInterpolatedAttribute(t,e,i,s,r,o){return _u.setScalar(0),vu.setScalar(0),Mu.setScalar(0),_u.fromBufferAttribute(t,e),vu.fromBufferAttribute(t,i),Mu.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(_u,r.x),o.addScaledVector(vu,r.y),o.addScaledVector(Mu,r.z),o}static isFrontFacing(t,e,i,s){return Ni.subVectors(i,e),cn.subVectors(t,e),Ni.cross(cn).dot(s)<0}set(t,e,i){return this.a.copy(t),this.b.copy(e),this.c.copy(i),this}setFromPointsAndIndices(t,e,i,s){return this.a.copy(t[e]),this.b.copy(t[i]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,i,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Ni.subVectors(this.c,this.b),cn.subVectors(this.a,this.b),Ni.cross(cn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return n.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return n.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,i,s,r){return n.getInterpolation(t,this.a,this.b,this.c,e,i,s,r)}containsPoint(t){return n.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return n.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let i=this.a,s=this.b,r=this.c,o,a;Hs.subVectors(s,i),Gs.subVectors(r,i),gu.subVectors(t,i);let l=Hs.dot(gu),c=Gs.dot(gu);if(l<=0&&c<=0)return e.copy(i);xu.subVectors(t,s);let h=Hs.dot(xu),u=Gs.dot(xu);if(h>=0&&u<=h)return e.copy(s);let d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return o=l/(l-h),e.copy(i).addScaledVector(Hs,o);yu.subVectors(t,r);let f=Hs.dot(yu),x=Gs.dot(yu);if(x>=0&&f<=x)return e.copy(r);let g=f*c-l*x;if(g<=0&&c>=0&&x<=0)return a=c/(c-x),e.copy(i).addScaledVector(Gs,a);let p=h*x-f*u;if(p<=0&&u-h>=0&&f-x>=0)return kp.subVectors(r,s),a=(u-h)/(u-h+(f-x)),e.copy(s).addScaledVector(kp,a);let m=1/(p+g+d);return o=g*m,a=d*m,e.copy(i).addScaledVector(Hs,o).addScaledVector(Gs,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},Dn=class{constructor(t=new D(1/0,1/0,1/0),e=new D(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e+=3)this.expandByPoint(Oi.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,i=t.count;e<i;e++)this.expandByPoint(Oi.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let i=Oi.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let i=t.geometry;if(i!==void 0){let r=i.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,Oi):Oi.fromBufferAttribute(r,o),Oi.applyMatrix4(t.matrixWorld),this.expandByPoint(Oi);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Ga.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Ga.copy(i.boundingBox)),Ga.applyMatrix4(t.matrixWorld),this.union(Ga)}let s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Oi),Oi.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,i;return t.normal.x>0?(e=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),e<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(ao),Va.subVectors(this.max,ao),Vs.subVectors(t.a,ao),Ws.subVectors(t.b,ao),Xs.subVectors(t.c,ao),Pn.subVectors(Ws,Vs),In.subVectors(Xs,Ws),rs.subVectors(Vs,Xs);let e=[0,-Pn.z,Pn.y,0,-In.z,In.y,0,-rs.z,rs.y,Pn.z,0,-Pn.x,In.z,0,-In.x,rs.z,0,-rs.x,-Pn.y,Pn.x,0,-In.y,In.x,0,-rs.y,rs.x,0];return!bu(e,Vs,Ws,Xs,Va)||(e=[1,0,0,0,1,0,0,0,1],!bu(e,Vs,Ws,Xs,Va))?!1:(Wa.crossVectors(Pn,In),e=[Wa.x,Wa.y,Wa.z],bu(e,Vs,Ws,Xs,Va))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Oi).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Oi).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(un[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),un[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),un[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),un[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),un[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),un[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),un[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),un[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(un),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},un=[new D,new D,new D,new D,new D,new D,new D,new D],Oi=new D,Ga=new Dn,Vs=new D,Ws=new D,Xs=new D,Pn=new D,In=new D,rs=new D,ao=new D,Va=new D,Wa=new D,os=new D;function bu(n,t,e,i,s){for(let r=0,o=n.length-3;r<=o;r+=3){os.fromArray(n,r);let a=s.x*Math.abs(os.x)+s.y*Math.abs(os.y)+s.z*Math.abs(os.z),l=t.dot(os),c=e.dot(os),h=i.dot(os);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}var ke=new D,Xa=new Mt,Gx=0,De=class extends ji{constructor(t,e,i=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Gx++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=i,this.usage=ed,this.updateRanges=[],this.gpuType=Hi,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,i){t*=this.itemSize,i*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[i+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,i=this.count;e<i;e++)Xa.fromBufferAttribute(this,e),Xa.applyMatrix3(t),this.setXY(e,Xa.x,Xa.y);else if(this.itemSize===3)for(let e=0,i=this.count;e<i;e++)ke.fromBufferAttribute(this,e),ke.applyMatrix3(t),this.setXYZ(e,ke.x,ke.y,ke.z);return this}applyMatrix4(t){for(let e=0,i=this.count;e<i;e++)ke.fromBufferAttribute(this,e),ke.applyMatrix4(t),this.setXYZ(e,ke.x,ke.y,ke.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)ke.fromBufferAttribute(this,e),ke.applyNormalMatrix(t),this.setXYZ(e,ke.x,ke.y,ke.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)ke.fromBufferAttribute(this,e),ke.transformDirection(t),this.setXYZ(e,ke.x,ke.y,ke.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let i=this.array[t*this.itemSize+e];return this.normalized&&(i=$i(i,this.array)),i}setComponent(t,e,i){return this.normalized&&(i=oe(i,this.array)),this.array[t*this.itemSize+e]=i,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=$i(e,this.array)),e}setX(t,e){return this.normalized&&(e=oe(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=$i(e,this.array)),e}setY(t,e){return this.normalized&&(e=oe(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=$i(e,this.array)),e}setZ(t,e){return this.normalized&&(e=oe(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=$i(e,this.array)),e}setW(t,e){return this.normalized&&(e=oe(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,i){return t*=this.itemSize,this.normalized&&(e=oe(e,this.array),i=oe(i,this.array)),this.array[t+0]=e,this.array[t+1]=i,this}setXYZ(t,e,i,s){return t*=this.itemSize,this.normalized&&(e=oe(e,this.array),i=oe(i,this.array),s=oe(s,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this}setXYZW(t,e,i,s,r){return t*=this.itemSize,this.normalized&&(e=oe(e,this.array),i=oe(i,this.array),s=oe(s,this.array),r=oe(r,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}};var bo=class extends De{constructor(t,e,i){super(new Uint16Array(t),e,i)}};var So=class extends De{constructor(t,e,i){super(new Uint32Array(t),e,i)}};var Yt=class extends De{constructor(t,e,i){super(new Float32Array(t),e,i)}},Vx=new Dn,lo=new D,Su=new D,hs=class{constructor(t=new D,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let i=this.center;e!==void 0?i.copy(e):Vx.setFromPoints(t).getCenter(i);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,i.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let i=this.center.distanceToSquared(t);return e.copy(t),i>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;lo.subVectors(t,this.center);let e=lo.lengthSq();if(e>this.radius*this.radius){let i=Math.sqrt(e),s=(i-this.radius)*.5;this.center.addScaledVector(lo,s/i),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Su.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(lo.copy(t.center).add(Su)),this.expandByPoint(lo.copy(t.center).sub(Su))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},Wx=0,Ai=new de,wu=new Ye,Zs=new D,_i=new Dn,co=new Dn,We=new D,_e=class n extends ji{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Wx++}),this.uuid=kn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Rx(t)?So:bo)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,i=0){this.groups.push({start:t,count:e,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let r=new Bt().getNormalMatrix(t);i.applyNormalMatrix(r),i.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return Ai.makeRotationFromQuaternion(t),this.applyMatrix4(Ai),this}rotateX(t){return Ai.makeRotationX(t),this.applyMatrix4(Ai),this}rotateY(t){return Ai.makeRotationY(t),this.applyMatrix4(Ai),this}rotateZ(t){return Ai.makeRotationZ(t),this.applyMatrix4(Ai),this}translate(t,e,i){return Ai.makeTranslation(t,e,i),this.applyMatrix4(Ai),this}scale(t,e,i){return Ai.makeScale(t,e,i),this.applyMatrix4(Ai),this}lookAt(t){return wu.lookAt(t),wu.updateMatrix(),this.applyMatrix4(wu.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Zs).negate(),this.translate(Zs.x,Zs.y,Zs.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let i=[];for(let s=0,r=t.length;s<r;s++){let o=t[s];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Yt(i,3))}else{let i=Math.min(t.length,e.count);for(let s=0;s<i;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&Nt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Dn);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Dt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new D(-1/0,-1/0,-1/0),new D(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let i=0,s=e.length;i<s;i++){let r=e[i];_i.setFromBufferAttribute(r),this.morphTargetsRelative?(We.addVectors(this.boundingBox.min,_i.min),this.boundingBox.expandByPoint(We),We.addVectors(this.boundingBox.max,_i.max),this.boundingBox.expandByPoint(We)):(this.boundingBox.expandByPoint(_i.min),this.boundingBox.expandByPoint(_i.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Dt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new hs);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Dt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new D,1/0);return}if(t){let i=this.boundingSphere.center;if(_i.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){let a=e[r];co.setFromBufferAttribute(a),this.morphTargetsRelative?(We.addVectors(_i.min,co.min),_i.expandByPoint(We),We.addVectors(_i.max,co.max),_i.expandByPoint(We)):(_i.expandByPoint(co.min),_i.expandByPoint(co.max))}_i.getCenter(i);let s=0;for(let r=0,o=t.count;r<o;r++)We.fromBufferAttribute(t,r),s=Math.max(s,i.distanceToSquared(We));if(e)for(let r=0,o=e.length;r<o;r++){let a=e[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)We.fromBufferAttribute(a,c),l&&(Zs.fromBufferAttribute(t,c),We.add(Zs)),s=Math.max(s,i.distanceToSquared(We))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Dt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Dt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=e.position,s=e.normal,r=e.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==i.count)&&(o=new De(new Float32Array(4*i.count),4),this.setAttribute("tangent",o));let a=[],l=[];for(let _=0;_<i.count;_++)a[_]=new D,l[_]=new D;let c=new D,h=new D,u=new D,d=new Mt,f=new Mt,x=new Mt,g=new D,p=new D;function m(_,S,R){c.fromBufferAttribute(i,_),h.fromBufferAttribute(i,S),u.fromBufferAttribute(i,R),d.fromBufferAttribute(r,_),f.fromBufferAttribute(r,S),x.fromBufferAttribute(r,R),h.sub(c),u.sub(c),f.sub(d),x.sub(d);let P=1/(f.x*x.y-x.x*f.y);isFinite(P)&&(g.copy(h).multiplyScalar(x.y).addScaledVector(u,-f.y).multiplyScalar(P),p.copy(u).multiplyScalar(f.x).addScaledVector(h,-x.x).multiplyScalar(P),a[_].add(g),a[S].add(g),a[R].add(g),l[_].add(p),l[S].add(p),l[R].add(p))}let v=this.groups;v.length===0&&(v=[{start:0,count:t.count}]);for(let _=0,S=v.length;_<S;++_){let R=v[_],P=R.start,L=R.count;for(let B=P,I=P+L;B<I;B+=3)m(t.getX(B+0),t.getX(B+1),t.getX(B+2))}let E=new D,M=new D,T=new D,w=new D;function C(_){T.fromBufferAttribute(s,_),w.copy(T);let S=a[_];E.copy(S),E.sub(T.multiplyScalar(T.dot(S))).normalize(),M.crossVectors(w,S);let P=M.dot(l[_])<0?-1:1;o.setXYZW(_,E.x,E.y,E.z,P)}for(let _=0,S=v.length;_<S;++_){let R=v[_],P=R.start,L=R.count;for(let B=P,I=P+L;B<I;B+=3)C(t.getX(B+0)),C(t.getX(B+1)),C(t.getX(B+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let i=this.getAttribute("normal");if(i===void 0||i.count!==e.count)i=new De(new Float32Array(e.count*3),3),this.setAttribute("normal",i);else for(let d=0,f=i.count;d<f;d++)i.setXYZ(d,0,0,0);let s=new D,r=new D,o=new D,a=new D,l=new D,c=new D,h=new D,u=new D;if(t)for(let d=0,f=t.count;d<f;d+=3){let x=t.getX(d+0),g=t.getX(d+1),p=t.getX(d+2);s.fromBufferAttribute(e,x),r.fromBufferAttribute(e,g),o.fromBufferAttribute(e,p),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),a.fromBufferAttribute(i,x),l.fromBufferAttribute(i,g),c.fromBufferAttribute(i,p),a.add(h),l.add(h),c.add(h),i.setXYZ(x,a.x,a.y,a.z),i.setXYZ(g,l.x,l.y,l.z),i.setXYZ(p,c.x,c.y,c.z)}else for(let d=0,f=e.count;d<f;d+=3)s.fromBufferAttribute(e,d+0),r.fromBufferAttribute(e,d+1),o.fromBufferAttribute(e,d+2),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),i.setXYZ(d+0,h.x,h.y,h.z),i.setXYZ(d+1,h.x,h.y,h.z),i.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,i=t.count;e<i;e++)We.fromBufferAttribute(t,e),We.normalize(),t.setXYZ(e,We.x,We.y,We.z)}toNonIndexed(){function t(a,l){let c=a.array,h=a.itemSize,u=a.normalized,d=new c.constructor(l.length*h),f=0,x=0;for(let g=0,p=l.length;g<p;g++){a.isInterleavedBufferAttribute?f=l[g]*a.data.stride+a.offset:f=l[g]*h;for(let m=0;m<h;m++)d[x++]=c[f++]}return new De(d,h,u)}if(this.index===null)return Nt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new n,i=this.index.array,s=this.attributes;for(let a in s){let l=s[a],c=t(l,i);e.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let h=0,u=c.length;h<u;h++){let d=c[h],f=t(d,i);l.push(f)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let i=this.attributes;for(let l in i){let c=i[l];t.data.attributes[l]=c.toJSON(t.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){let f=c[u];h.push(f.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let i=t.index;i!==null&&this.setIndex(i.clone());let s=t.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(e))}let r=t.morphAttributes;for(let c in r){let h=[],u=r[c];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let o=t.groups;for(let c=0,h=o.length;c<h;c++){let u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}let a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}},wl=class{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=ed,this.updateRanges=[],this.version=0,this.uuid=kn()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,i){t*=this.stride,i*=e.stride;for(let s=0,r=this.stride;s<r;s++)this.array[t+s]=e.array[i+s];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=kn()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let e=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(e,this.stride);return i.setUsage(this.usage),i}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=kn()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer)));let e={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return e.usage=this.usage,e}},ri=new D,wo=class n{constructor(t,e,i,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=i,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,i=this.data.count;e<i;e++)ri.fromBufferAttribute(this,e),ri.applyMatrix4(t),this.setXYZ(e,ri.x,ri.y,ri.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)ri.fromBufferAttribute(this,e),ri.applyNormalMatrix(t),this.setXYZ(e,ri.x,ri.y,ri.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)ri.fromBufferAttribute(this,e),ri.transformDirection(t),this.setXYZ(e,ri.x,ri.y,ri.z);return this}getComponent(t,e){let i=this.array[t*this.data.stride+this.offset+e];return this.normalized&&(i=$i(i,this.array)),i}setComponent(t,e,i){return this.normalized&&(i=oe(i,this.array)),this.data.array[t*this.data.stride+this.offset+e]=i,this}setX(t,e){return this.normalized&&(e=oe(e,this.array)),this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.normalized&&(e=oe(e,this.array)),this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.normalized&&(e=oe(e,this.array)),this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.normalized&&(e=oe(e,this.array)),this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(e=$i(e,this.array)),e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(e=$i(e,this.array)),e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(e=$i(e,this.array)),e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(e=$i(e,this.array)),e}setXY(t,e,i){return t=t*this.data.stride+this.offset,this.normalized&&(e=oe(e,this.array),i=oe(i,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=i,this}setXYZ(t,e,i,s){return t=t*this.data.stride+this.offset,this.normalized&&(e=oe(e,this.array),i=oe(i,this.array),s=oe(s,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=i,this.data.array[t+2]=s,this}setXYZW(t,e,i,s,r){return t=t*this.data.stride+this.offset,this.normalized&&(e=oe(e,this.array),i=oe(i,this.array),s=oe(s,this.array),r=oe(r,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=i,this.data.array[t+2]=s,this.data.array[t+3]=r,this}clone(t){if(t===void 0){yo("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let i=0;i<this.count;i++){let s=i*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return new De(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new n(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){yo("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let i=0;i<this.count;i++){let s=i*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},Tu=new D,Xx=new D,Zx=new Bt,ci=class{constructor(t=new D(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,i,s){return this.normal.set(t,e,i),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,i){let s=Tu.subVectors(i,e).cross(Xx.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,i=!0){let s=t.delta(Tu),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let o=-(t.start.dot(this.normal)+this.constant)/r;return i===!0&&(o<0||o>1)?null:e.copy(t.start).addScaledVector(s,o)}intersectsLine(t){let e=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return e<0&&i>0||i<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let i=e||Zx.getNormalMatrix(t),s=this.coplanarPoint(Tu).applyMatrix4(t),r=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},$x=0,Ui=class extends ji{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:$x++}),this.uuid=kn(),this.name="",this.type="Material",this.blending=Hn,this.side=zn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Wu,this.blendDst=Xu,this.blendEquation=ps,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new At(0,0,0),this.blendAlpha=0,this.depthFunc=er,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Mm,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=hl,this.stencilZFail=hl,this.stencilZPass=hl,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let i=t[e];if(i===void 0){Nt(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Nt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector2&&i&&i.isVector2||s&&s.isEuler&&i&&i.isEuler||s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[e]=i}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,i.blending=this.blending,i.side=this.side,i.shadowSide=this.shadowSide,i.vertexColors=this.vertexColors,i.opacity=this.opacity,i.transparent=this.transparent,i.blendSrc=this.blendSrc,i.blendDst=this.blendDst,i.blendEquation=this.blendEquation,i.blendSrcAlpha=this.blendSrcAlpha,i.blendDstAlpha=this.blendDstAlpha,i.blendEquationAlpha=this.blendEquationAlpha,i.blendColor=this.blendColor.getHex(),i.blendAlpha=this.blendAlpha,i.depthFunc=this.depthFunc,i.depthTest=this.depthTest,i.depthWrite=this.depthWrite,i.colorWrite=this.colorWrite,i.clipIntersection=this.clipIntersection,i.clipShadows=this.clipShadows,i.stencilWriteMask=this.stencilWriteMask,i.stencilFunc=this.stencilFunc,i.stencilRef=this.stencilRef,i.stencilFuncMask=this.stencilFuncMask,i.stencilFail=this.stencilFail,i.stencilZFail=this.stencilZFail,i.stencilZPass=this.stencilZPass,i.stencilWrite=this.stencilWrite,i.polygonOffset=this.polygonOffset,i.polygonOffsetFactor=this.polygonOffsetFactor,i.polygonOffsetUnits=this.polygonOffsetUnits,i.dithering=this.dithering,i.alphaTest=this.alphaTest,i.alphaHash=this.alphaHash,i.alphaToCoverage=this.alphaToCoverage,i.premultipliedAlpha=this.premultipliedAlpha,i.forceSinglePass=this.forceSinglePass,i.allowOverride=this.allowOverride,i.visible=this.visible,i.toneMapped=this.toneMapped,i.name=this.name,this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(i.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(i.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(i.rotation=this.rotation),this.depthPacking!==void 0&&(i.depthPacking=this.depthPacking),this.linewidth!==void 0&&(i.linewidth=this.linewidth),this.linecap!==void 0&&(i.linecap=this.linecap),this.linejoin!==void 0&&(i.linejoin=this.linejoin),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.wireframe!==void 0&&(i.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(i.flatShading=this.flatShading),this.fog!==void 0&&(i.fog=this.fog),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(e){let r=s(t.textures),o=s(t.images);r.length>0&&(i.textures=r),o.length>0&&(i.images=o)}return i}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new At().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(i=>new ci().fromJSON(i))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let i=t.normalScale;Array.isArray(i)===!1&&(i=[i,i]),this.normalScale=new Mt().fromArray(i)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new Mt().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,i=null;if(e!==null){let s=e.length;i=new Array(s);for(let r=0;r!==s;++r)i[r]=e[r].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}},Bi=class extends Ui{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new At(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},$s,ho=new D,qs=new D,Ys=new D,js=new Mt,uo=new Mt,km=new de,Za=new D,fo=new D,$a=new D,Dp=new Mt,Eu=new Mt,Np=new Mt,Ki=class extends Ye{constructor(t=new Bi){if(super(),this.isSprite=!0,this.type="Sprite",$s===void 0){$s=new _e;let e=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),i=new wl(e,5);$s.setIndex([0,1,2,0,2,3]),$s.setAttribute("position",new wo(i,3,0,!1)),$s.setAttribute("uv",new wo(i,2,3,!1))}this.geometry=$s,this.material=t,this.center=new Mt(.5,.5),this.count=1}intersectsFrustum(t){return t.intersectsSprite(this)}raycast(t,e){t.camera===null&&Dt('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),qs.setFromMatrixScale(this.matrixWorld),km.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),Ys.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&qs.multiplyScalar(-Ys.z);let i=this.material.rotation,s,r;i!==0&&(r=Math.cos(i),s=Math.sin(i));let o=this.center;qa(Za.set(-.5,-.5,0),Ys,o,qs,s,r),qa(fo.set(.5,-.5,0),Ys,o,qs,s,r),qa($a.set(.5,.5,0),Ys,o,qs,s,r),Dp.set(0,0),Eu.set(1,0),Np.set(1,1);let a=t.ray.intersectTriangle(Za,fo,$a,!1,ho);if(a===null&&(qa(fo.set(-.5,.5,0),Ys,o,qs,s,r),Eu.set(0,1),a=t.ray.intersectTriangle(Za,$a,fo,!1,ho),a===null))return;let l=t.ray.origin.distanceTo(ho);l<t.near||l>t.far||e.push({distance:l,point:ho.clone(),uv:fn.getInterpolation(ho,Za,fo,$a,Dp,Eu,Np,new Mt),face:null,object:this})}copy(t,e){return super.copy(t,e),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}};function qa(n,t,e,i,s,r){js.subVectors(n,e).addScalar(.5).multiply(i),s!==void 0?(uo.x=r*js.x-s*js.y,uo.y=s*js.x+r*js.y):uo.copy(js),n.copy(t),n.x+=uo.x,n.y+=uo.y,n.applyMatrix4(km)}var dn=new D,Au=new D,Ya=new D,ja=new D,ar=class{constructor(t=new D,e=new D(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,dn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let i=e.dot(this.direction);return i<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=dn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(dn.copy(this.origin).addScaledVector(this.direction,e),dn.distanceToSquared(t))}distanceSqToSegment(t,e,i,s){Au.copy(t).add(e).multiplyScalar(.5),Ya.copy(e).sub(t).normalize(),ja.copy(this.origin).sub(Au);let r=t.distanceTo(e)*.5,o=-this.direction.dot(Ya),a=ja.dot(this.direction),l=-ja.dot(Ya),c=ja.lengthSq(),h=Math.abs(1-o*o),u,d,f,x;if(h>0)if(u=o*l-a,d=o*a-l,x=r*h,u>=0)if(d>=-x)if(d<=x){let g=1/h;u*=g,d*=g,f=u*(u+o*d+2*a)+d*(o*u+d+2*l)+c}else d=r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d=-r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d<=-x?(u=Math.max(0,-(-o*r+a)),d=u>0?-r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c):d<=x?(u=0,d=Math.min(Math.max(-r,-l),r),f=d*(d+2*l)+c):(u=Math.max(0,-(o*r+a)),d=u>0?r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c);else d=o>0?-r:r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(Au).addScaledVector(Ya,d),f}intersectSphere(t,e){if(t.radius<0)return null;dn.subVectors(t.center,this.origin);let i=dn.dot(this.direction),s=dn.dot(dn)-i*i,r=t.radius*t.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=i-o,l=i+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(t.normal)+t.constant)/e;return i>=0?i:null}intersectPlane(t,e){let i=this.distanceToPlane(t);return i===null?null:this.at(i,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let i,s,r,o,a,l,c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(i=(t.min.x-d.x)*c,s=(t.max.x-d.x)*c):(i=(t.max.x-d.x)*c,s=(t.min.x-d.x)*c),h>=0?(r=(t.min.y-d.y)*h,o=(t.max.y-d.y)*h):(r=(t.max.y-d.y)*h,o=(t.min.y-d.y)*h),i>o||r>s||((r>i||isNaN(i))&&(i=r),(o<s||isNaN(s))&&(s=o),u>=0?(a=(t.min.z-d.z)*u,l=(t.max.z-d.z)*u):(a=(t.max.z-d.z)*u,l=(t.min.z-d.z)*u),i>l||a>s)||((a>i||i!==i)&&(i=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(i>=0?i:s,e)}intersectsBox(t){return this.intersectBox(t,dn)!==null}intersectTriangle(t,e,i,s,r){let o=this.origin,a=this.direction,l=a.x,c=a.y,h=a.z,u=t.x-o.x,d=t.y-o.y,f=t.z-o.z,x=e.x-o.x,g=e.y-o.y,p=e.z-o.z,m=i.x-o.x,v=i.y-o.y,E=i.z-o.z,M=Math.abs(l),T=Math.abs(c),w=Math.abs(h),C,_,S,R,P,L,B,I,U,V,$,et;if(M>=T&&M>=w?(S=l,L=u,U=x,et=m,l>=0?(C=c,_=h,R=d,P=f,B=g,I=p,V=v,$=E):(C=h,_=c,R=f,P=d,B=p,I=g,V=E,$=v)):T>=w?(S=c,L=d,U=g,et=v,c>=0?(C=h,_=l,R=f,P=u,B=p,I=x,V=E,$=m):(C=l,_=h,R=u,P=f,B=x,I=p,V=m,$=E)):(S=h,L=f,U=p,et=E,h>=0?(C=l,_=c,R=u,P=d,B=x,I=g,V=m,$=v):(C=c,_=l,R=d,P=u,B=g,I=x,V=v,$=m)),S===0)return null;let Z=C/S,J=_/S,tt=1/S,ot=R-Z*L,st=P-J*L,Ut=B-Z*U,It=I-J*U,Lt=V-Z*et,X=$-J*et,K=Lt*It-X*Ut,xt=ot*X-st*Lt,Ot=Ut*st-It*ot;if(s){if(K<0||xt<0||Ot<0)return null}else if((K<0||xt<0||Ot<0)&&(K>0||xt>0||Ot>0))return null;let _t=K+xt+Ot;if(_t===0)return null;let Vt=tt*(K*L+xt*U+Ot*et);return(_t>0?Vt<0:Vt>0)?null:this.at(Vt/_t,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Te=class extends Ui{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new At(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mn,this.combine=Zu,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},Op=new de,as=new ar,Ja=new hs,Fp=new D,Ka=new D,Qa=new D,tl=new D,Cu=new D,el=new D,Up=new D,il=new D,Ft=class extends Ye{constructor(t=new _e,e=new Te){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){let s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){let i=this.geometry,s=i.attributes.position,r=i.morphAttributes.position,o=i.morphTargetsRelative;e.fromBufferAttribute(s,t);let a=this.morphTargetInfluences;if(r&&a){el.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=a[l],u=r[l];h!==0&&(Cu.fromBufferAttribute(u,t),o?el.addScaledVector(Cu,h):el.addScaledVector(Cu.sub(e),h))}e.add(el)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let i=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Ja.copy(i.boundingSphere),Ja.applyMatrix4(r),as.copy(t.ray).recast(t.near),!(Ja.containsPoint(as.origin)===!1&&(as.intersectSphere(Ja,Fp)===null||as.origin.distanceToSquared(Fp)>(t.far-t.near)**2))&&(Op.copy(r).invert(),as.copy(t.ray).applyMatrix4(Op),!(i.boundingBox!==null&&as.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,e,as)))}_computeIntersections(t,e,i){let s,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let x=0,g=d.length;x<g;x++){let p=d[x],m=o[p.materialIndex],v=Math.max(p.start,f.start),E=Math.min(a.count,Math.min(p.start+p.count,f.start+f.count));for(let M=v,T=E;M<T;M+=3){let w=a.getX(M),C=a.getX(M+1),_=a.getX(M+2);s=nl(this,m,t,i,c,h,u,w,C,_),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=p.materialIndex,e.push(s))}}else{let x=Math.max(0,f.start),g=Math.min(a.count,f.start+f.count);for(let p=x,m=g;p<m;p+=3){let v=a.getX(p),E=a.getX(p+1),M=a.getX(p+2);s=nl(this,o,t,i,c,h,u,v,E,M),s&&(s.faceIndex=Math.floor(p/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let x=0,g=d.length;x<g;x++){let p=d[x],m=o[p.materialIndex],v=Math.max(p.start,f.start),E=Math.min(l.count,Math.min(p.start+p.count,f.start+f.count));for(let M=v,T=E;M<T;M+=3){let w=M,C=M+1,_=M+2;s=nl(this,m,t,i,c,h,u,w,C,_),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=p.materialIndex,e.push(s))}}else{let x=Math.max(0,f.start),g=Math.min(l.count,f.start+f.count);for(let p=x,m=g;p<m;p+=3){let v=p,E=p+1,M=p+2;s=nl(this,o,t,i,c,h,u,v,E,M),s&&(s.faceIndex=Math.floor(p/3),e.push(s))}}}};function qx(n,t,e,i,s,r,o,a){let l;if(t.side===oi?l=i.intersectTriangle(o,r,s,!0,a):l=i.intersectTriangle(s,r,o,t.side===zn,a),l===null)return null;il.copy(a),il.applyMatrix4(n.matrixWorld);let c=e.ray.origin.distanceTo(il);return c<e.near||c>e.far?null:{distance:c,point:il.clone(),object:n}}function nl(n,t,e,i,s,r,o,a,l,c){n.getVertexPosition(a,Ka),n.getVertexPosition(l,Qa),n.getVertexPosition(c,tl);let h=qx(n,t,e,i,Ka,Qa,tl,Up);if(h){let u=new D;fn.getBarycoord(Up,Ka,Qa,tl,u),s&&(h.uv=fn.getInterpolatedAttribute(s,a,l,c,u,new Mt)),r&&(h.uv1=fn.getInterpolatedAttribute(r,a,l,c,u,new Mt)),o&&(h.normal=fn.getInterpolatedAttribute(o,a,l,c,u,new D),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));let d={a,b:l,c,normal:new D,materialIndex:0};fn.getNormal(Ka,Qa,tl,d.normal),h.face=d,h.barycoord=u}return h}var lr=class extends Be{constructor(t=null,e=1,i=1,s,r,o,a,l,c=Ze,h=Ze,u,d){super(null,o,a,l,c,h,s,r,u,d),this.isDataTexture=!0,this.image={data:t,width:e,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var ls=new hs,Yx=new Mt(.5,.5),sl=new D,cr=class{constructor(t=new ci,e=new ci,i=new ci,s=new ci,r=new ci,o=new ci){this.planes=[t,e,i,s,r,o]}set(t,e,i,s,r,o){let a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(i),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){let e=this.planes;for(let i=0;i<6;i++)e[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,e=Fi,i=!1){let s=this.planes,r=t.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],u=r[5],d=r[6],f=r[7],x=r[8],g=r[9],p=r[10],m=r[11],v=r[12],E=r[13],M=r[14],T=r[15];if(s[0].setComponents(c-o,f-h,m-x,T-v).normalize(),s[1].setComponents(c+o,f+h,m+x,T+v).normalize(),s[2].setComponents(c+a,f+u,m+g,T+E).normalize(),s[3].setComponents(c-a,f-u,m-g,T-E).normalize(),i)s[4].setComponents(l,d,p,M).normalize(),s[5].setComponents(c-l,f-d,m-p,T-M).normalize();else if(s[4].setComponents(c-l,f-d,m-p,T-M).normalize(),e===Fi)s[5].setComponents(c+l,f+d,m+p,T+M).normalize();else if(e===ir)s[5].setComponents(l,d,p,M).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),ls.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),ls.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(ls)}intersectsSprite(t){ls.center.set(0,0,0);let e=Yx.distanceTo(t.center);return ls.radius=.7071067811865476+e,ls.applyMatrix4(t.matrixWorld),this.intersectsSphere(ls)}intersectsSphere(t){let e=this.planes,i=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(i)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let i=0;i<6;i++){let s=e[i];if(sl.x=s.normal.x>0?t.max.x:t.min.x,sl.y=s.normal.y>0?t.max.y:t.min.y,sl.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(sl)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let i=0;i<6;i++)if(e[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Nn=class extends Ui{constructor(t){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new At(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},Bp=new de,Nu=new ar,rl=new hs,ol=new D,us=class extends Ye{constructor(t=new _e,e=new Nn){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let i=this.geometry,s=this.matrixWorld,r=t.params.Points.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),rl.copy(i.boundingSphere),rl.applyMatrix4(s),rl.radius+=r,t.ray.intersectsSphere(rl)===!1)return;Bp.copy(s).invert(),Nu.copy(t.ray).applyMatrix4(Bp);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=i.index,u=i.attributes.position;if(c!==null){let d=Math.max(0,o.start),f=Math.min(c.count,o.start+o.count);for(let x=d,g=f;x<g;x++){let p=c.getX(x);ol.fromBufferAttribute(u,p),zp(ol,p,l,s,t,e,this)}}else{let d=Math.max(0,o.start),f=Math.min(u.count,o.start+o.count);for(let x=d,g=f;x<g;x++)ol.fromBufferAttribute(u,x),zp(ol,x,l,s,t,e,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){let s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function zp(n,t,e,i,s,r,o){let a=Nu.distanceSqToPoint(n);if(a<e){let l=new D;Nu.closestPointToPoint(n,l),l.applyMatrix4(i);let c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var To=class extends Be{constructor(t=[],e=Gn,i,s,r,o,a,l,c,h){super(t,e,i,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},Eo=class extends Be{constructor(t,e,i,s,r,o,a,l,c){super(t,e,i,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var On=class extends Be{constructor(t,e,i=zi,s,r,o,a=Ze,l=Ze,c,h=Yi,u=1){if(h!==Yi&&h!==Vn)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let d={width:t,height:e,depth:u};super(d,s,r,o,a,l,h,i,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new sr(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},Tl=class extends On{constructor(t,e=zi,i=Gn,s,r,o=Ze,a=Ze,l,c=Yi){let h={width:t,height:t,depth:1},u=[h,h,h,h,h,h];super(t,t,e,i,s,r,o,a,l,c),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},Ao=class extends Be{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},ii=class n extends _e{constructor(t=1,e=1,i=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:i,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],h=[],u=[],d=0,f=0;x("z","y","x",-1,-1,i,e,t,o,r,0),x("z","y","x",1,-1,i,e,-t,o,r,1),x("x","z","y",1,1,t,i,e,s,o,2),x("x","z","y",1,-1,t,i,-e,s,o,3),x("x","y","z",1,-1,t,e,i,s,r,4),x("x","y","z",-1,-1,t,e,-i,s,r,5),this.setIndex(l),this.setAttribute("position",new Yt(c,3)),this.setAttribute("normal",new Yt(h,3)),this.setAttribute("uv",new Yt(u,2));function x(g,p,m,v,E,M,T,w,C,_,S){let R=M/C,P=T/_,L=M/2,B=T/2,I=w/2,U=C+1,V=_+1,$=0,et=0,Z=new D;for(let J=0;J<V;J++){let tt=J*P-B;for(let ot=0;ot<U;ot++){let st=ot*R-L;Z[g]=st*v,Z[p]=tt*E,Z[m]=I,c.push(Z.x,Z.y,Z.z),Z[g]=0,Z[p]=0,Z[m]=w>0?1:-1,h.push(Z.x,Z.y,Z.z),u.push(ot/C),u.push(1-J/_),$+=1}}for(let J=0;J<_;J++)for(let tt=0;tt<C;tt++){let ot=d+tt+U*J,st=d+tt+U*(J+1),Ut=d+(tt+1)+U*(J+1),It=d+(tt+1)+U*J;l.push(ot,st,It),l.push(st,Ut,It),et+=6}a.addGroup(f,et,S),f+=et,d+=$}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var Co=class n extends _e{constructor(t=1,e=32,i=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:i,thetaLength:s},e=Math.max(3,e);let r=[],o=[],a=[],l=[],c=new D,h=new Mt;o.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let u=0,d=3;u<=e;u++,d+=3){let f=i+u/e*s;c.x=t*Math.cos(f),c.y=t*Math.sin(f),o.push(c.x,c.y,c.z),a.push(0,0,1),h.x=(o[d]/t+1)/2,h.y=(o[d+1]/t+1)/2,l.push(h.x,h.y)}for(let u=1;u<=e;u++)r.push(u,u+1,0);this.setIndex(r),this.setAttribute("position",new Yt(o,3)),this.setAttribute("normal",new Yt(a,3)),this.setAttribute("uv",new Yt(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.radius,t.segments,t.thetaStart,t.thetaLength)}},Qi=class n extends _e{constructor(t=1,e=1,i=1,s=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:i,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let h=[],u=[],d=[],f=[],x=0,g=[],p=i/2,m=0;v(),o===!1&&(t>0&&E(!0),e>0&&E(!1)),this.setIndex(h),this.setAttribute("position",new Yt(u,3)),this.setAttribute("normal",new Yt(d,3)),this.setAttribute("uv",new Yt(f,2));function v(){let M=new D,T=new D,w=0,C=(e-t)/i;for(let _=0;_<=r;_++){let S=[],R=_/r,P=R*(e-t)+t;for(let L=0;L<=s;L++){let B=L/s,I=B*l+a,U=Math.sin(I),V=Math.cos(I);T.x=P*U,T.y=-R*i+p,T.z=P*V,u.push(T.x,T.y,T.z),M.set(U,C,V).normalize(),d.push(M.x,M.y,M.z),f.push(B,1-R),S.push(x++)}g.push(S)}for(let _=0;_<s;_++)for(let S=0;S<r;S++){let R=g[S][_],P=g[S+1][_],L=g[S+1][_+1],B=g[S][_+1];(t>0||S!==0)&&(h.push(R,P,B),w+=3),(e>0||S!==r-1)&&(h.push(P,L,B),w+=3)}c.addGroup(m,w,0),m+=w}function E(M){let T=x,w=new Mt,C=new D,_=0,S=M===!0?t:e,R=M===!0?1:-1;for(let L=1;L<=s;L++)u.push(0,p*R,0),d.push(0,R,0),f.push(.5,.5),x++;let P=x;for(let L=0;L<=s;L++){let I=L/s*l+a,U=Math.cos(I),V=Math.sin(I);C.x=S*V,C.y=p*R,C.z=S*U,u.push(C.x,C.y,C.z),d.push(0,R,0),w.x=U*.5+.5,w.y=V*.5*R+.5,f.push(w.x,w.y),x++}for(let L=0;L<s;L++){let B=T+L,I=P+L;M===!0?h.push(I,I+1,B):h.push(I+1,I,B),_+=3}c.addGroup(m,_,M===!0?1:2),m+=_}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var El=class n extends _e{constructor(t=[],e=[],i=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:i,detail:s};let r=[],o=[];a(s),c(i),h(),this.setAttribute("position",new Yt(r,3)),this.setAttribute("normal",new Yt(r.slice(),3)),this.setAttribute("uv",new Yt(o,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function a(v){let E=new D,M=new D,T=new D;for(let w=0;w<e.length;w+=3)f(e[w+0],E),f(e[w+1],M),f(e[w+2],T),l(E,M,T,v)}function l(v,E,M,T){let w=T+1,C=[];for(let _=0;_<=w;_++){C[_]=[];let S=v.clone().lerp(M,_/w),R=E.clone().lerp(M,_/w),P=w-_;for(let L=0;L<=P;L++)L===0&&_===w?C[_][L]=S:C[_][L]=S.clone().lerp(R,L/P)}for(let _=0;_<w;_++)for(let S=0;S<2*(w-_)-1;S++){let R=Math.floor(S/2);S%2===0?(d(C[_][R+1]),d(C[_+1][R]),d(C[_][R])):(d(C[_][R+1]),d(C[_+1][R+1]),d(C[_+1][R]))}}function c(v){let E=new D;for(let M=0;M<r.length;M+=3)E.x=r[M+0],E.y=r[M+1],E.z=r[M+2],E.normalize().multiplyScalar(v),r[M+0]=E.x,r[M+1]=E.y,r[M+2]=E.z}function h(){let v=new D;for(let E=0;E<r.length;E+=3){v.x=r[E+0],v.y=r[E+1],v.z=r[E+2];let M=p(v)/2/Math.PI+.5,T=m(v)/Math.PI+.5;o.push(M,1-T)}x(),u()}function u(){for(let v=0;v<o.length;v+=6){let E=o[v+0],M=o[v+2],T=o[v+4],w=Math.max(E,M,T),C=Math.min(E,M,T);w>.9&&C<.1&&(E<.2&&(o[v+0]+=1),M<.2&&(o[v+2]+=1),T<.2&&(o[v+4]+=1))}}function d(v){r.push(v.x,v.y,v.z)}function f(v,E){let M=v*3;E.x=t[M+0],E.y=t[M+1],E.z=t[M+2]}function x(){let v=new D,E=new D,M=new D,T=new D,w=new Mt,C=new Mt,_=new Mt;for(let S=0,R=0;S<r.length;S+=9,R+=6){v.set(r[S+0],r[S+1],r[S+2]),E.set(r[S+3],r[S+4],r[S+5]),M.set(r[S+6],r[S+7],r[S+8]),w.set(o[R+0],o[R+1]),C.set(o[R+2],o[R+3]),_.set(o[R+4],o[R+5]),T.copy(v).add(E).add(M).divideScalar(3);let P=p(T);g(w,R+0,v,P),g(C,R+2,E,P),g(_,R+4,M,P)}}function g(v,E,M,T){T<0&&v.x===1&&(o[E]=v.x-1),M.x===0&&M.z===0&&(o[E]=T/2/Math.PI+.5)}function p(v){return Math.atan2(v.z,-v.x)}function m(v){return Math.atan2(-v.y,Math.sqrt(v.x*v.x+v.z*v.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.vertices,t.indices,t.radius,t.detail)}};var Ro=class n extends El{constructor(t=1,e=0){let i=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],s=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(i,s,t,e),this.type="OctahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new n(t.radius,t.detail)}},Ce=class n extends _e{constructor(t=1,e=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:i,heightSegments:s};let r=t/2,o=e/2,a=Math.floor(i),l=Math.floor(s),c=a+1,h=l+1,u=t/a,d=e/l,f=[],x=[],g=[],p=[];for(let m=0;m<h;m++){let v=m*d-o;for(let E=0;E<c;E++){let M=E*u-r;x.push(M,-v,0),g.push(0,0,1),p.push(E/a),p.push(1-m/l)}}for(let m=0;m<l;m++)for(let v=0;v<a;v++){let E=v+c*m,M=v+c*(m+1),T=v+1+c*(m+1),w=v+1+c*m;f.push(E,M,w),f.push(M,T,w)}this.setIndex(f),this.setAttribute("position",new Yt(x,3)),this.setAttribute("normal",new Yt(g,3)),this.setAttribute("uv",new Yt(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.width,t.height,t.widthSegments,t.heightSegments)}};var Po=class n extends _e{constructor(t=1,e=32,i=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:i,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},e=Math.max(3,Math.floor(e)),i=Math.max(2,Math.floor(i));let l=Math.min(o+a,Math.PI),c=0,h=[],u=new D,d=new D,f=[],x=[],g=[],p=[];for(let m=0;m<=i;m++){let v=[],E=m/i,M=o+E*a,T=t*Math.cos(M),w=Math.sqrt(t*t-T*T),C=0;m===0&&o===0?C=.5/e:m===i&&l===Math.PI&&(C=-.5/e);for(let _=0;_<=e;_++){let S=_/e,R=s+S*r;u.x=-w*Math.cos(R),u.y=T,u.z=w*Math.sin(R),x.push(u.x,u.y,u.z),d.copy(u).normalize(),g.push(d.x,d.y,d.z),p.push(S+C,1-E),v.push(c++)}h.push(v)}for(let m=0;m<i;m++)for(let v=0;v<e;v++){let E=h[m][v+1],M=h[m][v],T=h[m+1][v],w=h[m+1][v+1];(m!==0||o>0)&&f.push(E,M,w),(m!==i-1||l<Math.PI)&&f.push(M,T,w)}this.setIndex(f),this.setAttribute("position",new Yt(x,3)),this.setAttribute("normal",new Yt(g,3)),this.setAttribute("uv",new Yt(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};var hr=class n extends _e{constructor(t=1,e=.4,i=12,s=48,r=Math.PI*2,o=0,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:i,tubularSegments:s,arc:r,thetaStart:o,thetaLength:a},i=Math.floor(i),s=Math.floor(s);let l=[],c=[],h=[],u=[],d=new D,f=new D,x=new D;for(let g=0;g<=i;g++){let p=o+g/i*a;for(let m=0;m<=s;m++){let v=m/s*r;f.x=(t+e*Math.cos(p))*Math.cos(v),f.y=(t+e*Math.cos(p))*Math.sin(v),f.z=e*Math.sin(p),c.push(f.x,f.y,f.z),d.x=t*Math.cos(v),d.y=t*Math.sin(v),x.subVectors(f,d).normalize(),h.push(x.x,x.y,x.z),u.push(m/s),u.push(g/i)}}for(let g=1;g<=i;g++)for(let p=1;p<=s;p++){let m=(s+1)*g+p-1,v=(s+1)*(g-1)+p-1,E=(s+1)*(g-1)+p,M=(s+1)*g+p;l.push(m,v,M),l.push(v,E,M)}this.setIndex(l),this.setAttribute("position",new Yt(c,3)),this.setAttribute("normal",new Yt(h,3)),this.setAttribute("uv",new Yt(u,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}};var ur=class extends Ui{constructor(t){super(),this.isShadowMaterial=!0,this.type="ShadowMaterial",this.color=new At(0),this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.fog=t.fog,this}};function gs(n){let t={};for(let e in n){t[e]={};for(let i in n[e]){let s=n[e][i];if(Hp(s))s.isRenderTargetTexture?(Nt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][i]=null):t[e][i]=s.clone();else if(Array.isArray(s))if(Hp(s[0])){let r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();t[e][i]=r}else t[e][i]=s.slice();else t[e][i]=s}}return t}function ni(n){let t={};for(let e=0;e<n.length;e++){let i=gs(n[e]);for(let s in i)t[s]=i[s]}return t}function Hp(n){return n&&(n.isColor||n.isMatrix3||n.isMatrix4||n.isVector2||n.isVector3||n.isVector4||n.isTexture||n.isQuaternion)}function jx(n){let t=[];for(let e=0;e<n.length;e++)t.push(n[e].clone());return t}function nd(n){let t=n.getRenderTarget();return t===null?n.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Wt.workingColorSpace}var xn={clone:gs,merge:ni},Jx=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Kx=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Re=class extends Ui{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Jx,this.fragmentShader=Kx,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=gs(t.uniforms),this.uniformsGroups=jx(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let i={};for(let s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(e.extensions=i),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let i in t.uniforms){let s=t.uniforms[i];switch(this.uniforms[i]={},s.type){case"t":this.uniforms[i].value=e[s.value]||null;break;case"c":this.uniforms[i].value=new At().setHex(s.value);break;case"v2":this.uniforms[i].value=new Mt().fromArray(s.value);break;case"v3":this.uniforms[i].value=new D().fromArray(s.value);break;case"v4":this.uniforms[i].value=new ye().fromArray(s.value);break;case"m3":this.uniforms[i].value=new Bt().fromArray(s.value);break;case"m4":this.uniforms[i].value=new de().fromArray(s.value);break;default:this.uniforms[i].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let i in t.extensions)this.extensions[i]=t.extensions[i];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},dr=class extends Re{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},je=class extends Ui{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new At(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new At(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Tc,this.normalScale=new Mt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},fr=class extends je{constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Mt(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return qt(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new At(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new At(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new At(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(t){this._retroreflectivity>0!=t>0&&this.version++,this._retroreflectivity=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.retroreflectivity=t.retroreflectivity,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}};var Al=class extends Ui{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=_m,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},Cl=class extends Ui{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function Js(n,t){return!n||n.constructor===t?n:typeof t.BYTES_PER_ELEMENT=="number"?new t(n):Array.prototype.slice.call(n)}function Ru(n){return n!==void 0&&n.inTangents!==void 0&&n.outTangents!==void 0}var Fn=class{constructor(t,e,i,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(i),this.sampleValues=e,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,i=this._cachedIndex,s=e[i],r=e[i-1];t:{e:{let o;i:{n:if(!(t<s)){for(let a=i+2;;){if(s===void 0){if(t<r)break n;return i=e.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===a)break;if(r=s,s=e[++i],t<s)break e}o=e.length;break i}if(!(t>=r)){let a=e[1];t<a&&(i=2,r=a);for(let l=i-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===l)break;if(s=r,r=e[--i-1],t>=r)break e}o=i,i=0;break i}break t}for(;i<o;){let a=i+o>>>1;t<e[a]?o=a:i=a+1}if(s=e[i],r=e[i-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return i=e.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,r,s)}return this.interpolate_(i,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,i=this.sampleValues,s=this.valueSize,r=t*s;for(let o=0;o!==s;++o)e[o]=i[r+o];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},Rl=class extends Fn{constructor(t,e,i,s){super(t,e,i,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Lu,endingEnd:Lu}}intervalChanged_(t,e,i){let s=this.parameterPositions,r=t-2,o=t+1,a=s[r],l=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case ku:r=t,a=2*e-i;break;case Du:r=s.length-2,a=e+s[r]-s[r+1];break;default:r=t,a=i}if(l===void 0)switch(this.getSettings_().endingEnd){case ku:o=t,l=2*i-e;break;case Du:o=1,l=i+s[1]-s[0];break;default:o=t-1,l=e}let c=(i-e)*.5,h=this.valueSize;this._weightPrev=c/(e-a),this._weightNext=c/(l-i),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(t,e,i,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,x=(i-e)/(s-e),g=x*x,p=g*x,m=-d*p+2*d*g-d*x,v=(1+d)*p+(-1.5-2*d)*g+(-.5+d)*x+1,E=(-1-f)*p+(1.5+f)*g+.5*x,M=f*p-f*g;for(let T=0;T!==a;++T)r[T]=m*o[h+T]+v*o[c+T]+E*o[l+T]+M*o[u+T];return r}},Pl=class extends Fn{constructor(t,e,i,s){super(t,e,i,s)}interpolate_(t,e,i,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=(i-e)/(s-e),u=1-h;for(let d=0;d!==a;++d)r[d]=o[c+d]*u+o[l+d]*h;return r}},Il=class extends Fn{constructor(t,e,i,s){super(t,e,i,s)}interpolate_(t){return this.copySampleValue_(t-1)}},Ll=class extends Fn{interpolate_(t,e,i,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this.inTangents,u=this.outTangents;if(!h||!u){let x=(i-e)/(s-e),g=1-x;for(let p=0;p!==a;++p)r[p]=o[c+p]*g+o[l+p]*x;return r}let d=a*2,f=t-1;for(let x=0;x!==a;++x){let g=o[c+x],p=o[l+x],m=f*d+x*2,v=u[m],E=u[m+1],M=t*d+x*2,T=h[M],w=h[M+1],C=ty(i,e,v,T,s);r[x]=Dm(C,g,E,w,p)}return r}};function Dm(n,t,e,i,s){let r=1-n;return r*r*r*t+3*r*r*n*e+3*r*n*n*i+n*n*n*s}function Qx(n,t,e,i,s){let r=1-n;return 3*r*r*(e-t)+6*r*n*(i-e)+3*n*n*(s-i)}function ty(n,t,e,i,s){let r=(n-t)/(s-t);for(let o=0;o<8;o++){let a=Dm(r,t,e,i,s)-n;if(Math.abs(a)<1e-10)break;let l=Qx(r,t,e,i,s);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-a/l))}return r}var vi=class{constructor(t,e,i,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=Js(e,this.TimeBufferType),this.values=Js(i,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,i;if(e.toJSON!==this.toJSON)i=e.toJSON(t);else{i={name:t.name,times:Js(t.times,Array),values:Js(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(i.interpolation=s),Ru(t.settings)&&(i.settings={inTangents:Js(t.settings.inTangents,Array),outTangents:Js(t.settings.outTangents,Array)})}return i.type=t.ValueTypeName,i}InterpolantFactoryMethodDiscrete(t){return new Il(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new Pl(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new Rl(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new Ll(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case po:e=this.InterpolantFactoryMethodDiscrete;break;case vl:e=this.InterpolantFactoryMethodLinear;break;case cl:e=this.InterpolantFactoryMethodSmooth;break;case Iu:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return Nt("KeyframeTrack:",i),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return po;case this.InterpolantFactoryMethodLinear:return vl;case this.InterpolantFactoryMethodSmooth:return cl;case this.InterpolantFactoryMethodBezier:return Iu}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let i=0,s=e.length;i!==s;++i)e[i]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let i=0,s=e.length;i!==s;++i)e[i]*=t;Ru(this.settings)&&(Gp(this.settings.inTangents,t),Gp(this.settings.outTangents,t))}return this}trim(t,e){let i=this.times,s=i.length,r=0,o=s-1;for(;r!==s&&i[r]<t;)++r;for(;o!==-1&&i[o]>e;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=i.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(Dt("KeyframeTrack: Invalid value size in track.",this),t=!1);let i=this.times,s=this.values,r=i.length;r===0&&(Dt("KeyframeTrack: Track is empty.",this),t=!1);let o=null;for(let a=0;a!==r;a++){let l=i[a];if(typeof l=="number"&&isNaN(l)){Dt("KeyframeTrack: Time is not a valid number.",this,a,l),t=!1;break}if(o!==null&&o>l){Dt("KeyframeTrack: Out of order keys.",this,a,l,o),t=!1;break}o=l}if(s!==void 0&&Px(s))for(let a=0,l=s.length;a!==l;++a){let c=s[a];if(isNaN(c)){Dt("KeyframeTrack: Value is not a valid number.",this,a,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),i=this.getValueSize(),s=this.getInterpolation()===cl,r=t.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=t[a],h=t[a+1];if(c!==h&&(a!==1||c!==t[0]))if(s)l=!0;else{let u=a*i,d=u-i,f=u+i;for(let x=0;x!==i;++x){let g=e[u+x];if(g!==e[d+x]||g!==e[f+x]){l=!0;break}}}if(l){if(a!==o){t[o]=t[a];let u=a*i,d=o*i;for(let f=0;f!==i;++f)e[d+f]=e[u+f]}++o}}if(r>0){t[o]=t[r];for(let a=r*i,l=o*i,c=0;c!==i;++c)e[l+c]=e[a+c];++o}return o!==t.length?(this.times=t.slice(0,o),this.values=e.slice(0,o*i)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),i=this.constructor,s=new i(this.name,t,e);return s.createInterpolant=this.createInterpolant,Ru(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function Gp(n,t){for(let e=0,i=n.length;e!==i;e+=2)n[e]*=t}vi.prototype.ValueTypeName="";vi.prototype.TimeBufferType=Float32Array;vi.prototype.ValueBufferType=Float32Array;vi.prototype.DefaultInterpolation=vl;var Un=class extends vi{constructor(t,e,i){super(t,e,i)}};Un.prototype.ValueTypeName="bool";Un.prototype.ValueBufferType=Array;Un.prototype.DefaultInterpolation=po;Un.prototype.InterpolantFactoryMethodLinear=void 0;Un.prototype.InterpolantFactoryMethodSmooth=void 0;var kl=class extends vi{constructor(t,e,i,s){super(t,e,i,s)}};kl.prototype.ValueTypeName="color";var Dl=class extends vi{constructor(t,e,i,s){super(t,e,i,s)}};Dl.prototype.ValueTypeName="number";var Nl=class extends Fn{constructor(t,e,i,s){super(t,e,i,s)}interpolate_(t,e,i,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(i-e)/(s-e),c=t*a;for(let h=c+a;c!==h;c+=4)Ji.slerpFlat(r,0,o,c-a,o,c,l);return r}},Io=class extends vi{constructor(t,e,i,s){super(t,e,i,s)}InterpolantFactoryMethodLinear(t){return new Nl(this.times,this.values,this.getValueSize(),t)}};Io.prototype.ValueTypeName="quaternion";Io.prototype.InterpolantFactoryMethodSmooth=void 0;var Bn=class extends vi{constructor(t,e,i){super(t,e,i)}};Bn.prototype.ValueTypeName="string";Bn.prototype.ValueBufferType=Array;Bn.prototype.DefaultInterpolation=po;Bn.prototype.InterpolantFactoryMethodLinear=void 0;Bn.prototype.InterpolantFactoryMethodSmooth=void 0;var Ol=class extends vi{constructor(t,e,i,s){super(t,e,i,s)}};Ol.prototype.ValueTypeName="vector";var Fl=class{constructor(t,e,i){let s=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=i,this._abortController=null,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){let u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){let f=c[u],x=c[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return x}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},Nm=new Fl,Ul=class{constructor(t){this.manager=t!==void 0?t:Nm,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let i=this;return new Promise(function(s,r){i.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};Ul.DEFAULT_MATERIAL_NAME="__DEFAULT";var pr=class extends Ye{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new At(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}};var Pu=new de,Vp=new D,Wp=new D,Lo=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Mt(512,512),this.mapType=di,this.map=null,this.mapPass=null,this.matrix=new de,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new cr,this._frameExtents=new Mt(1,1),this._viewportCount=1,this._viewports=[new ye(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;Vp.setFromMatrixPosition(t.matrixWorld),e.position.copy(Vp),Wp.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Wp),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,i,s){Pu.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),i.setFromProjectionMatrix(Pu,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,o=s?s.z/r.x:1,a=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;t.coordinateSystem===ir||t.reversedDepth?e.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,1,0,0,0,0,1):e.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,.5,.5,0,0,0,1),e.multiply(Pu)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},al=new D,ll=new Ji,Zi=new D,ko=class extends Ye{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new de,this.projectionMatrix=new de,this.projectionMatrixInverse=new de,this.coordinateSystem=Fi,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(al,ll,Zi),Zi.x===1&&Zi.y===1&&Zi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(al,ll,Zi.set(1,1,1)).invert()}updateWorldMatrix(t,e,i=!1){super.updateWorldMatrix(t,e,i),this.matrixWorld.decompose(al,ll,Zi),Zi.x===1&&Zi.y===1&&Zi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(al,ll,Zi.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Ln=new D,Xp=new Mt,Zp=new Mt,Xe=class extends ko{constructor(t=50,e=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=_o*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(au*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return _o*2*Math.atan(Math.tan(au*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,i){Ln.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Ln.x,Ln.y).multiplyScalar(-t/Ln.z),Ln.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Ln.x,Ln.y).multiplyScalar(-t/Ln.z)}getViewSize(t,e){return this.getViewBounds(t,Xp,Zp),e.subVectors(Zp,Xp)}setViewOffset(t,e,i,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(au*.5*this.fov)/this.zoom,i=2*e,s=this.aspect*i,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,e-=o.offsetY*i/c,s*=o.width/l,i*=o.height/c}let a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-i,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}},Ou=class extends Lo{constructor(){super(new Xe(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(t){let e=this.camera,i=_o*2*t.angle*this.focus,s=this.mapSize.width/this.mapSize.height*this.aspect,r=t.distance||e.far;(i!==e.fov||s!==e.aspect||r!==e.far)&&(e.fov=i,e.aspect=s,e.far=r,e.updateProjectionMatrix()),super.updateMatrices(t)}copy(t){return super.copy(t),this.focus=t.focus,this.aspect=t.aspect,this}toJSON(){let t=super.toJSON();return t.focus=this.focus,t.aspect=this.aspect,t}},mr=class extends pr{constructor(t,e,i=0,s=Math.PI/3,r=0,o=2){super(t,e),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(Ye.DEFAULT_UP),this.updateMatrix(),this.target=new Ye,this.distance=i,this.angle=s,this.penumbra=r,this.decay=o,this.map=null,this.shadow=new Ou}get power(){return this.intensity*Math.PI}set power(t){this.intensity=t/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.angle=t.angle,this.penumbra=t.penumbra,this.decay=t.decay,this.target=t.target.clone(),this.map=t.map,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.angle=this.angle,e.object.decay=this.decay,e.object.penumbra=this.penumbra,e.object.target=this.target.uuid,this.map&&this.map.isTexture&&(e.object.map=this.map.toJSON(t).uuid),e.object.shadow=this.shadow.toJSON(),e}},Fu=class extends Lo{constructor(){super(new Xe(90,1,.5,500)),this.isPointLightShadow=!0}},Do=class extends pr{constructor(t,e,i=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=s,this.shadow=new Fu}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}},ds=class extends ko{constructor(t=-1,e=1,i=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=i,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,i,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=i-t,o=i+t,a=s+e,l=s-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}};var No=class extends pr{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}};var Ks=-90,Qs=1,Bl=class extends Ye{constructor(t,e,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new Xe(Ks,Qs,t,e);s.layers=this.layers,this.add(s);let r=new Xe(Ks,Qs,t,e);r.layers=this.layers,this.add(r);let o=new Xe(Ks,Qs,t,e);o.layers=this.layers,this.add(o);let a=new Xe(Ks,Qs,t,e);a.layers=this.layers,this.add(a);let l=new Xe(Ks,Qs,t,e);l.layers=this.layers,this.add(l);let c=new Xe(Ks,Qs,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[i,s,r,o,a,l]=e;for(let c of e)this.remove(c);if(t===Fi)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===ir)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,h]=this.children,u=t.getRenderTarget(),d=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),x=t.xr.enabled;t.xr.enabled=!1;let g=i.texture.generateMipmaps;i.texture.generateMipmaps=!1;let p=!1;t.isWebGLRenderer===!0?p=t.state.buffers.depth.getReversed():p=t.reversedDepthBuffer,t.setRenderTarget(i,0,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(i,1,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(i,2,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(i,3,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(i,4,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),i.texture.generateMipmaps=g,t.setRenderTarget(i,5,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(u,d,f),t.xr.enabled=x,i.texture.needsPMREMUpdate=!0}},zl=class extends Xe{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}},Oo=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(t){this._document=t,t.hidden!==void 0&&(this._pageVisibilityHandler=ey.bind(this),t.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(t){return this._timescale=t,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(t){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(t!==void 0?t:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function ey(){this._document.hidden===!1&&this.reset()}var sd="\\[\\]\\.:\\/",iy=new RegExp("["+sd+"]","g"),rd="[^"+sd+"]",ny="[^"+sd.replace("\\.","")+"]",sy=/((?:WC+[\/:])*)/.source.replace("WC",rd),ry=/(WCOD+)?/.source.replace("WCOD",ny),oy=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",rd),ay=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",rd),ly=new RegExp("^"+sy+ry+oy+ay+"$"),cy=["material","materials","bones","map"],Uu=class{constructor(t,e,i){let s=i||pe.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let i=this._targetGroup.nCachedObjects_,s=this._bindings[i];s!==void 0&&s.getValue(t,e)}setValue(t,e){let i=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=i.length;s!==r;++s)i[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,i=t.length;e!==i;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,i=t.length;e!==i;++e)t[e].unbind()}},pe=class n{constructor(t,e,i){this.path=e,this.parsedPath=i||n.parseTrackName(e),this.node=n.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,i){return t&&t.isAnimationObjectGroup?new n.Composite(t,e,i):new n(t,e,i)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(iy,"")}static parseTrackName(t){let e=ly.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let i={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=i.nodeName&&i.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=i.nodeName.substring(s+1);cy.indexOf(r)!==-1&&(i.nodeName=i.nodeName.substring(0,s),i.objectName=r)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return i}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let i=t.skeleton.getBoneByName(e);if(i!==void 0)return i}if(t.children){let i=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===e||a.uuid===e)return a;let l=i(a.children);if(l)return l}return null},s=i(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)t[e++]=i[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,i=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=n.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){Nt("PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let c=e.objectIndex;switch(i){case"materials":if(!t.material){Dt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){Dt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){Dt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){Dt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){Dt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[i]===void 0){Dt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[i]}if(c!==void 0){if(t[c]===void 0){Dt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let o=t[s];if(o===void 0){let c=e.nodeName;Dt("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",t);return}let a=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?a=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){Dt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){Dt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};pe.Composite=Uu;pe.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};pe.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};pe.prototype.GetterByBindingType=[pe.prototype._getValue_direct,pe.prototype._getValue_array,pe.prototype._getValue_arrayElement,pe.prototype._getValue_toArray];pe.prototype.SetterByBindingTypeAndVersioning=[[pe.prototype._setValue_direct,pe.prototype._setValue_direct_setNeedsUpdate,pe.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[pe.prototype._setValue_array,pe.prototype._setValue_array_setNeedsUpdate,pe.prototype._setValue_array_setMatrixWorldNeedsUpdate],[pe.prototype._setValue_arrayElement,pe.prototype._setValue_arrayElement_setNeedsUpdate,pe.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[pe.prototype._setValue_fromArray,pe.prototype._setValue_fromArray_setNeedsUpdate,pe.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var uw=new Float32Array(1);var $p=new de,Fo=class{constructor(t,e,i=0,s=1/0){this.ray=new ar(t,e),this.near=i,this.far=s,this.camera=null,this.layers=new rr,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):Dt("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return $p.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4($p),this}intersectObject(t,e=!0,i=[]){return Bu(t,this,i,e),i.sort(qp),i}intersectObjects(t,e=!0,i=[]){for(let s=0,r=t.length;s<r;s++)Bu(t[s],this,i,e);return i.sort(qp),i}};function qp(n,t){return n.distance-t.distance}function Bu(n,t,e,i){let s=!0;if(n.layers.test(t.layers)&&n.raycast(t,e)===!1&&(s=!1),s===!0&&i===!0){let r=n.children;for(let o=0,a=r.length;o<a;o++)Bu(r[o],t,e,!0)}}var zu=class n{static{n.prototype.isMatrix2=!0}constructor(t,e,i,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,i,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let i=0;i<4;i++)this.elements[i]=t[i+e];return this}set(t,e,i,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=i,r[3]=s,this}};function od(n,t,e,i){let s=hy(i);switch(e){case Ku:return n*t;case td:return n*t/s.components*s.byteLength;case Zl:return n*t/s.components*s.byteLength;case Wn:return n*t*2/s.components*s.byteLength;case $l:return n*t*2/s.components*s.byteLength;case Qu:return n*t*3/s.components*s.byteLength;case fi:return n*t*4/s.components*s.byteLength;case ql:return n*t*4/s.components*s.byteLength;case $o:case qo:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case Yo:case jo:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case jl:case Kl:return Math.max(n,16)*Math.max(t,8)/4;case Yl:case Jl:return Math.max(n,8)*Math.max(t,8)/2;case Ql:case tc:case ic:case nc:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case ec:case Jo:case sc:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case rc:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case oc:return Math.floor((n+4)/5)*Math.floor((t+3)/4)*16;case ac:return Math.floor((n+4)/5)*Math.floor((t+4)/5)*16;case lc:return Math.floor((n+5)/6)*Math.floor((t+4)/5)*16;case cc:return Math.floor((n+5)/6)*Math.floor((t+5)/6)*16;case hc:return Math.floor((n+7)/8)*Math.floor((t+4)/5)*16;case uc:return Math.floor((n+7)/8)*Math.floor((t+5)/6)*16;case dc:return Math.floor((n+7)/8)*Math.floor((t+7)/8)*16;case fc:return Math.floor((n+9)/10)*Math.floor((t+4)/5)*16;case pc:return Math.floor((n+9)/10)*Math.floor((t+5)/6)*16;case mc:return Math.floor((n+9)/10)*Math.floor((t+7)/8)*16;case gc:return Math.floor((n+9)/10)*Math.floor((t+9)/10)*16;case xc:return Math.floor((n+11)/12)*Math.floor((t+9)/10)*16;case yc:return Math.floor((n+11)/12)*Math.floor((t+11)/12)*16;case _c:case vc:case Mc:return Math.ceil(n/4)*Math.ceil(t/4)*16;case bc:case Sc:return Math.ceil(n/4)*Math.ceil(t/4)*8;case Ko:case wc:return Math.ceil(n/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function hy(n){switch(n){case di:case qu:return{byteLength:1,components:1};case yr:case Yu:case ze:return{byteLength:2,components:1};case Wl:case Xl:return{byteLength:2,components:4};case zi:case Vl:case Hi:return{byteLength:4,components:1};case ju:case Ju:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?Nt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function ng(){let n=null,t=!1,e=null,i=null;function s(r,o){i=n.requestAnimationFrame(s),e(r,o)}return{start:function(){t!==!0&&e!==null&&n!==null&&(i=n.requestAnimationFrame(s),t=!0)},stop:function(){n!==null&&n.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){n=r}}}function dy(n){let t=new WeakMap;function e(a,l){let c=a.array,h=a.usage,u=c.byteLength,d=n.createBuffer();n.bindBuffer(l,d),n.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=n.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=n.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=n.HALF_FLOAT:f=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=n.SHORT;else if(c instanceof Uint32Array)f=n.UNSIGNED_INT;else if(c instanceof Int32Array)f=n.INT;else if(c instanceof Int8Array)f=n.BYTE;else if(c instanceof Uint8Array)f=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:u}}function i(a,l,c){let h=l.array,u=l.updateRanges;if(n.bindBuffer(c,a),u.length===0)n.bufferSubData(c,0,h);else{u.sort((f,x)=>f.start-x.start);let d=0;for(let f=1;f<u.length;f++){let x=u[d],g=u[f];g.start<=x.start+x.count+1?x.count=Math.max(x.count,g.start+g.count-x.start):(++d,u[d]=g)}u.length=d+1;for(let f=0,x=u.length;f<x;f++){let g=u[f];n.bufferSubData(c,g.start*h.BYTES_PER_ELEMENT,h,g.start,g.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=t.get(a);l&&(n.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var fy=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,py=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,my=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,gy=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,xy=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,yy=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,_y=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,vy=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,My=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,by=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Sy=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,wy=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Ty=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Ey=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Ay=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Cy=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Ry=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Py=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Iy=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ly=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,ky=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Dy=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Ny=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Oy=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Fy=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Uy=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,By=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,zy=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Hy=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Gy=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Vy="gl_FragColor = linearToOutputTexel( gl_FragColor );",Wy=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Xy=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,Zy=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,$y=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,qy=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Yy=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,jy=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Jy=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Ky=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Qy=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,t_=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,e_=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,i_=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,n_=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,s_=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,r_=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,o_=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,a_=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,l_=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,c_=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,h_=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,u_=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,d_=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,f_=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,p_=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,m_=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,g_=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,x_=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,y_=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,__=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,v_=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,M_=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,b_=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,S_=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,w_=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,T_=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,E_=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,A_=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,C_=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,R_=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,P_=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,I_=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,L_=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,k_=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,D_=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,N_=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,O_=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,F_=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,U_=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,B_=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,z_=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,H_=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,G_=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,V_=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,W_=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,X_=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Z_=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,$_=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,q_=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Y_=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,j_=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,J_=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,K_=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Q_=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,tv=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,ev=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,iv=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,nv=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,sv=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,rv=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,ov=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,av=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,lv=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,cv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,hv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,dv=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,fv=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,pv=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,mv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,gv=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,xv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,yv=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,_v=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,vv=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Mv=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,bv=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,Sv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,wv=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Tv=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Ev=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Av=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Cv=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Rv=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Pv=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Iv=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Lv=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,kv=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Dv=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Nv=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ov=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Fv=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Uv=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Bv=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,zv=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Hv=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Gv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Vv=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Wv=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Xv=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Zv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Gt={alphahash_fragment:fy,alphahash_pars_fragment:py,alphamap_fragment:my,alphamap_pars_fragment:gy,alphatest_fragment:xy,alphatest_pars_fragment:yy,aomap_fragment:_y,aomap_pars_fragment:vy,batching_pars_vertex:My,batching_vertex:by,begin_vertex:Sy,beginnormal_vertex:wy,bsdfs:Ty,iridescence_fragment:Ey,bumpmap_pars_fragment:Ay,clipping_planes_fragment:Cy,clipping_planes_pars_fragment:Ry,clipping_planes_pars_vertex:Py,clipping_planes_vertex:Iy,color_fragment:Ly,color_pars_fragment:ky,color_pars_vertex:Dy,color_vertex:Ny,common:Oy,cube_uv_reflection_fragment:Fy,defaultnormal_vertex:Uy,displacementmap_pars_vertex:By,displacementmap_vertex:zy,emissivemap_fragment:Hy,emissivemap_pars_fragment:Gy,colorspace_fragment:Vy,colorspace_pars_fragment:Wy,envmap_fragment:Xy,envmap_common_pars_fragment:Zy,envmap_pars_fragment:$y,envmap_pars_vertex:qy,envmap_physical_pars_fragment:r_,envmap_vertex:Yy,fog_vertex:jy,fog_pars_vertex:Jy,fog_fragment:Ky,fog_pars_fragment:Qy,gradientmap_pars_fragment:t_,lightmap_pars_fragment:e_,lights_lambert_fragment:i_,lights_lambert_pars_fragment:n_,lights_pars_begin:s_,lights_toon_fragment:o_,lights_toon_pars_fragment:a_,lights_phong_fragment:l_,lights_phong_pars_fragment:c_,lights_physical_fragment:h_,lights_physical_pars_fragment:u_,lights_fragment_begin:d_,lights_fragment_maps:f_,lights_fragment_end:p_,lightprobes_pars_fragment:m_,logdepthbuf_fragment:g_,logdepthbuf_pars_fragment:x_,logdepthbuf_pars_vertex:y_,logdepthbuf_vertex:__,map_fragment:v_,map_pars_fragment:M_,map_particle_fragment:b_,map_particle_pars_fragment:S_,metalnessmap_fragment:w_,metalnessmap_pars_fragment:T_,morphinstance_vertex:E_,morphcolor_vertex:A_,morphnormal_vertex:C_,morphtarget_pars_vertex:R_,morphtarget_vertex:P_,normal_fragment_begin:I_,normal_fragment_maps:L_,normal_pars_fragment:k_,normal_pars_vertex:D_,normal_vertex:N_,normalmap_pars_fragment:O_,clearcoat_normal_fragment_begin:F_,clearcoat_normal_fragment_maps:U_,clearcoat_pars_fragment:B_,iridescence_pars_fragment:z_,opaque_fragment:H_,packing:G_,premultiplied_alpha_fragment:V_,project_vertex:W_,dithering_fragment:X_,dithering_pars_fragment:Z_,roughnessmap_fragment:$_,roughnessmap_pars_fragment:q_,shadowmap_pars_fragment:Y_,shadowmap_pars_vertex:j_,shadowmap_vertex:J_,shadowmask_pars_fragment:K_,skinbase_vertex:Q_,skinning_pars_vertex:tv,skinning_vertex:ev,skinnormal_vertex:iv,specularmap_fragment:nv,specularmap_pars_fragment:sv,tonemapping_fragment:rv,tonemapping_pars_fragment:ov,transmission_fragment:av,transmission_pars_fragment:lv,uv_pars_fragment:cv,uv_pars_vertex:hv,uv_vertex:uv,worldpos_vertex:dv,background_vert:fv,background_frag:pv,backgroundCube_vert:mv,backgroundCube_frag:gv,cube_vert:xv,cube_frag:yv,depth_vert:_v,depth_frag:vv,distance_vert:Mv,distance_frag:bv,equirect_vert:Sv,equirect_frag:wv,linedashed_vert:Tv,linedashed_frag:Ev,meshbasic_vert:Av,meshbasic_frag:Cv,meshlambert_vert:Rv,meshlambert_frag:Pv,meshmatcap_vert:Iv,meshmatcap_frag:Lv,meshnormal_vert:kv,meshnormal_frag:Dv,meshphong_vert:Nv,meshphong_frag:Ov,meshphysical_vert:Fv,meshphysical_frag:Uv,meshtoon_vert:Bv,meshtoon_frag:zv,points_vert:Hv,points_frag:Gv,shadow_vert:Vv,shadow_frag:Wv,sprite_vert:Xv,sprite_frag:Zv},ft={common:{diffuse:{value:new At(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Bt},alphaMap:{value:null},alphaMapTransform:{value:new Bt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Bt}},envmap:{envMap:{value:null},envMapRotation:{value:new Bt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Bt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Bt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Bt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Bt},normalScale:{value:new Mt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Bt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Bt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Bt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Bt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new At(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new D},probesMax:{value:new D},probesResolution:{value:new D}},points:{diffuse:{value:new At(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Bt},alphaTest:{value:0},uvTransform:{value:new Bt}},sprite:{diffuse:{value:new At(16777215)},opacity:{value:1},center:{value:new Mt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Bt},alphaMap:{value:null},alphaMapTransform:{value:new Bt},alphaTest:{value:0}}},nn={basic:{uniforms:ni([ft.common,ft.specularmap,ft.envmap,ft.aomap,ft.lightmap,ft.fog]),vertexShader:Gt.meshbasic_vert,fragmentShader:Gt.meshbasic_frag},lambert:{uniforms:ni([ft.common,ft.specularmap,ft.envmap,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.fog,ft.lights,{emissive:{value:new At(0)},envMapIntensity:{value:1}}]),vertexShader:Gt.meshlambert_vert,fragmentShader:Gt.meshlambert_frag},phong:{uniforms:ni([ft.common,ft.specularmap,ft.envmap,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.fog,ft.lights,{emissive:{value:new At(0)},specular:{value:new At(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Gt.meshphong_vert,fragmentShader:Gt.meshphong_frag},standard:{uniforms:ni([ft.common,ft.envmap,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.roughnessmap,ft.metalnessmap,ft.fog,ft.lights,{emissive:{value:new At(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Gt.meshphysical_vert,fragmentShader:Gt.meshphysical_frag},toon:{uniforms:ni([ft.common,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.gradientmap,ft.fog,ft.lights,{emissive:{value:new At(0)}}]),vertexShader:Gt.meshtoon_vert,fragmentShader:Gt.meshtoon_frag},matcap:{uniforms:ni([ft.common,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.fog,{matcap:{value:null}}]),vertexShader:Gt.meshmatcap_vert,fragmentShader:Gt.meshmatcap_frag},points:{uniforms:ni([ft.points,ft.fog]),vertexShader:Gt.points_vert,fragmentShader:Gt.points_frag},dashed:{uniforms:ni([ft.common,ft.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Gt.linedashed_vert,fragmentShader:Gt.linedashed_frag},depth:{uniforms:ni([ft.common,ft.displacementmap]),vertexShader:Gt.depth_vert,fragmentShader:Gt.depth_frag},normal:{uniforms:ni([ft.common,ft.bumpmap,ft.normalmap,ft.displacementmap,{opacity:{value:1}}]),vertexShader:Gt.meshnormal_vert,fragmentShader:Gt.meshnormal_frag},sprite:{uniforms:ni([ft.sprite,ft.fog]),vertexShader:Gt.sprite_vert,fragmentShader:Gt.sprite_frag},background:{uniforms:{uvTransform:{value:new Bt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Gt.background_vert,fragmentShader:Gt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Bt}},vertexShader:Gt.backgroundCube_vert,fragmentShader:Gt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Gt.cube_vert,fragmentShader:Gt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Gt.equirect_vert,fragmentShader:Gt.equirect_frag},distance:{uniforms:ni([ft.common,ft.displacementmap,{referencePosition:{value:new D},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Gt.distance_vert,fragmentShader:Gt.distance_frag},shadow:{uniforms:ni([ft.lights,ft.fog,{color:{value:new At(0)},opacity:{value:1}}]),vertexShader:Gt.shadow_vert,fragmentShader:Gt.shadow_frag}};nn.physical={uniforms:ni([nn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Bt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Bt},clearcoatNormalScale:{value:new Mt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Bt},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Bt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Bt},sheen:{value:0},sheenColor:{value:new At(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Bt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Bt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Bt},transmissionSamplerSize:{value:new Mt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Bt},attenuationDistance:{value:0},attenuationColor:{value:new At(0)},specularColor:{value:new At(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Bt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Bt},anisotropyVector:{value:new Mt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Bt}}]),vertexShader:Gt.meshphysical_vert,fragmentShader:Gt.meshphysical_frag};var Cc={r:0,b:0,g:0},$v=new de,sg=new Bt;sg.set(-1,0,0,0,1,0,0,0,1);function qv(n,t,e,i,s,r){let o=new At(0),a=s===!0?0:1,l,c,h=null,u=0,d=null;function f(v){let E=v.isScene===!0?v.background:null;if(E&&E.isTexture){let M=v.backgroundBlurriness>0;E=t.get(E,M)}return E}function x(v){let E=!1,M=f(v);M===null?p(o,a):M&&M.isColor&&(p(M,1),E=!0);let T=n.xr.getEnvironmentBlendMode();T==="additive"?e.buffers.color.setClear(0,0,0,1,r):T==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(n.autoClear||E)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function g(v,E){let M=f(E);M&&(M.isCubeTexture||M.mapping===Xo)?(c===void 0&&(c=new Ft(new ii(1,1,1),new Re({name:"BackgroundCubeMaterial",uniforms:gs(nn.backgroundCube.uniforms),vertexShader:nn.backgroundCube.vertexShader,fragmentShader:nn.backgroundCube.fragmentShader,side:oi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(T,w,C){this.matrixWorld.copyPosition(C.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(c)),c.material.uniforms.envMap.value=M,c.material.uniforms.backgroundBlurriness.value=E.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4($v.makeRotationFromEuler(E.backgroundRotation)).transpose(),M.isCubeTexture&&M.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(sg),c.material.toneMapped=Wt.getTransfer(M.colorSpace)!==Qt,(h!==M||u!==M.version||d!==n.toneMapping)&&(c.material.needsUpdate=!0,h=M,u=M.version,d=n.toneMapping),c.layers.enableAll(),v.unshift(c,c.geometry,c.material,0,0,null)):M&&M.isTexture&&(l===void 0&&(l=new Ft(new Ce(2,2),new Re({name:"BackgroundMaterial",uniforms:gs(nn.background.uniforms),vertexShader:nn.background.vertexShader,fragmentShader:nn.background.fragmentShader,side:zn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=M,l.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,l.material.toneMapped=Wt.getTransfer(M.colorSpace)!==Qt,M.matrixAutoUpdate===!0&&M.updateMatrix(),l.material.uniforms.uvTransform.value.copy(M.matrix),(h!==M||u!==M.version||d!==n.toneMapping)&&(l.material.needsUpdate=!0,h=M,u=M.version,d=n.toneMapping),l.layers.enableAll(),v.unshift(l,l.geometry,l.material,0,0,null))}function p(v,E){v.getRGB(Cc,nd(n)),e.buffers.color.setClear(Cc.r,Cc.g,Cc.b,E,r)}function m(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(v,E=1){o.set(v),a=E,p(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(v){a=v,p(o,a)},render:x,addToRenderList:g,dispose:m}}function Yv(n,t){let e=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=d(null),r=s,o=!1;function a(P,L,B,I,U){let V=!1,$=u(P,I,B,L);r!==$&&(r=$,c(r.object)),V=f(P,I,B,U),V&&x(P,I,B,U),U!==null&&t.update(U,n.ELEMENT_ARRAY_BUFFER),(V||o)&&(o=!1,M(P,L,B,I),U!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t.get(U).buffer))}function l(){return n.createVertexArray()}function c(P){return n.bindVertexArray(P)}function h(P){return n.deleteVertexArray(P)}function u(P,L,B,I){let U=I.wireframe===!0,V=i[L.id];V===void 0&&(V={},i[L.id]=V);let $=P.isInstancedMesh===!0?P.id:0,et=V[$];et===void 0&&(et={},V[$]=et);let Z=et[B.id];Z===void 0&&(Z={},et[B.id]=Z);let J=Z[U];return J===void 0&&(J=d(l()),Z[U]=J),J}function d(P){let L=[],B=[],I=[];for(let U=0;U<e;U++)L[U]=0,B[U]=0,I[U]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:L,enabledAttributes:B,attributeDivisors:I,object:P,attributes:{},index:null}}function f(P,L,B,I){let U=r.attributes,V=L.attributes,$=0,et=B.getAttributes();for(let Z in et)if(et[Z].location>=0){let tt=U[Z],ot=V[Z];if(ot===void 0&&(Z==="instanceMatrix"&&P.instanceMatrix&&(ot=P.instanceMatrix),Z==="instanceColor"&&P.instanceColor&&(ot=P.instanceColor)),tt===void 0||tt.attribute!==ot||ot&&tt.data!==ot.data)return!0;$++}return r.attributesNum!==$||r.index!==I}function x(P,L,B,I){let U={},V=L.attributes,$=0,et=B.getAttributes();for(let Z in et)if(et[Z].location>=0){let tt=V[Z];tt===void 0&&(Z==="instanceMatrix"&&P.instanceMatrix&&(tt=P.instanceMatrix),Z==="instanceColor"&&P.instanceColor&&(tt=P.instanceColor));let ot={};ot.attribute=tt,tt&&tt.data&&(ot.data=tt.data),U[Z]=ot,$++}r.attributes=U,r.attributesNum=$,r.index=I}function g(){let P=r.newAttributes;for(let L=0,B=P.length;L<B;L++)P[L]=0}function p(P){m(P,0)}function m(P,L){let B=r.newAttributes,I=r.enabledAttributes,U=r.attributeDivisors;B[P]=1,I[P]===0&&(n.enableVertexAttribArray(P),I[P]=1),U[P]!==L&&(n.vertexAttribDivisor(P,L),U[P]=L)}function v(){let P=r.newAttributes,L=r.enabledAttributes;for(let B=0,I=L.length;B<I;B++)L[B]!==P[B]&&(n.disableVertexAttribArray(B),L[B]=0)}function E(P,L,B,I,U,V,$){$===!0?n.vertexAttribIPointer(P,L,B,U,V):n.vertexAttribPointer(P,L,B,I,U,V)}function M(P,L,B,I){g();let U=I.attributes,V=B.getAttributes(),$=L.defaultAttributeValues;for(let et in V){let Z=V[et];if(Z.location>=0){let J=U[et];if(J===void 0&&(et==="instanceMatrix"&&P.instanceMatrix&&(J=P.instanceMatrix),et==="instanceColor"&&P.instanceColor&&(J=P.instanceColor)),J!==void 0){let tt=J.normalized,ot=J.itemSize,st=t.get(J);if(st===void 0)continue;let Ut=st.buffer,It=st.type,Lt=st.bytesPerElement,X=It===n.INT||It===n.UNSIGNED_INT||J.gpuType===Vl;if(J.isInterleavedBufferAttribute){let K=J.data,xt=K.stride,Ot=J.offset;if(K.isInstancedInterleavedBuffer){for(let _t=0;_t<Z.locationSize;_t++)m(Z.location+_t,K.meshPerAttribute);P.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=K.meshPerAttribute*K.count)}else for(let _t=0;_t<Z.locationSize;_t++)p(Z.location+_t);n.bindBuffer(n.ARRAY_BUFFER,Ut);for(let _t=0;_t<Z.locationSize;_t++)E(Z.location+_t,ot/Z.locationSize,It,tt,xt*Lt,(Ot+ot/Z.locationSize*_t)*Lt,X)}else{if(J.isInstancedBufferAttribute){for(let K=0;K<Z.locationSize;K++)m(Z.location+K,J.meshPerAttribute);P.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let K=0;K<Z.locationSize;K++)p(Z.location+K);n.bindBuffer(n.ARRAY_BUFFER,Ut);for(let K=0;K<Z.locationSize;K++)E(Z.location+K,ot/Z.locationSize,It,tt,ot*Lt,ot/Z.locationSize*K*Lt,X)}}else if($!==void 0){let tt=$[et];if(tt!==void 0)switch(tt.length){case 2:n.vertexAttrib2fv(Z.location,tt);break;case 3:n.vertexAttrib3fv(Z.location,tt);break;case 4:n.vertexAttrib4fv(Z.location,tt);break;default:n.vertexAttrib1fv(Z.location,tt)}}}}v()}function T(){S();for(let P in i){let L=i[P];for(let B in L){let I=L[B];for(let U in I){let V=I[U];for(let $ in V)h(V[$].object),delete V[$];delete I[U]}}delete i[P]}}function w(P){if(i[P.id]===void 0)return;let L=i[P.id];for(let B in L){let I=L[B];for(let U in I){let V=I[U];for(let $ in V)h(V[$].object),delete V[$];delete I[U]}}delete i[P.id]}function C(P){for(let L in i){let B=i[L];for(let I in B){let U=B[I];if(U[P.id]===void 0)continue;let V=U[P.id];for(let $ in V)h(V[$].object),delete V[$];delete U[P.id]}}}function _(P){for(let L in i){let B=i[L],I=P.isInstancedMesh===!0?P.id:0,U=B[I];if(U!==void 0){for(let V in U){let $=U[V];for(let et in $)h($[et].object),delete $[et];delete U[V]}delete B[I],Object.keys(B).length===0&&delete i[L]}}}function S(){R(),o=!0,r!==s&&(r=s,c(r.object))}function R(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:S,resetDefaultState:R,dispose:T,releaseStatesOfGeometry:w,releaseStatesOfObject:_,releaseStatesOfProgram:C,initAttributes:g,enableAttribute:p,disableUnusedAttributes:v}}function jv(n,t,e){let i;function s(l){i=l}function r(l,c){n.drawArrays(i,l,c),e.update(c,i,1)}function o(l,c,h){h!==0&&(n.drawArraysInstanced(i,l,c,h),e.update(c,i,h))}function a(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,c,0,h);let d=0;for(let f=0;f<h;f++)d+=c[f];e.update(d,i,1)}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function Jv(n,t,e,i){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let C=t.get("EXT_texture_filter_anisotropic");s=n.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(C){return!(C!==fi&&i.convert(C)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(C){let _=C===ze&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(C!==di&&C!==Hi&&!_&&i.convert(C)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE))}function l(C){if(C==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";C="mediump"}return C==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",h=l(c);h!==c&&(Nt("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let u=e.logarithmicDepthBuffer===!0,d=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&d===!1&&Nt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),x=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_TEXTURE_SIZE),p=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),m=n.getParameter(n.MAX_VERTEX_ATTRIBS),v=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),E=n.getParameter(n.MAX_VARYING_VECTORS),M=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),T=n.getParameter(n.MAX_SAMPLES),w=n.getParameter(n.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:x,maxTextureSize:g,maxCubemapSize:p,maxAttributes:m,maxVertexUniforms:v,maxVaryings:E,maxFragmentUniforms:M,maxSamples:T,samples:w}}function Kv(n){let t=this,e=null,i=0,s=!1,r=!1,o=new ci,a=new Bt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){let f=u.length!==0||d||i!==0||s;return s=d,i=u.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){e=h(u,d,0)},this.setState=function(u,d,f){let x=u.clippingPlanes,g=u.clipIntersection,p=u.clipShadows,m=n.get(u);if(!s||x===null||x.length===0||r&&!p)r?h(null):c();else{let v=r?0:i,E=v*4,M=m.clippingState||null;l.value=M,M=h(x,d,E,f);for(let T=0;T!==E;++T)M[T]=e[T];m.clippingState=M,this.numIntersection=g?this.numPlanes:0,this.numPlanes+=v}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function h(u,d,f,x){let g=u!==null?u.length:0,p=null;if(g!==0){if(p=l.value,x!==!0||p===null){let m=f+g*4,v=d.matrixWorldInverse;a.getNormalMatrix(v),(p===null||p.length<m)&&(p=new Float32Array(m));for(let E=0,M=f;E!==g;++E,M+=4)o.copy(u[E]).applyMatrix4(v,a),o.normal.toArray(p,M),p[M+3]=o.constant}l.value=p,l.needsUpdate=!0}return t.numPlanes=g,t.numIntersection=0,p}}var Mr=4,Qv=6,tM=20,eM=256,Qo=new ds,Om=new At,ad=null,ld=0,cd=0,hd=!1,iM=new D,xs=new D,Sr=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,i=.1,s=100,r={}){let{size:o=256,position:a=iM}=r;ad=this._renderer.getRenderTarget(),ld=this._renderer.getActiveCubeFace(),cd=this._renderer.getActiveMipmapLevel(),hd=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,i,s,l,a),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Bm(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Um(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(ad,ld,cd),this._renderer.xr.enabled=hd,t.scissorTest=!1,vr(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Gn||t.mapping===ms?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),ad=this._renderer.getRenderTarget(),ld=this._renderer.getActiveCubeFace(),cd=this._renderer.getActiveMipmapLevel(),hd=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let i=e||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,i={magFilter:Ne,minFilter:Ne,generateMipmaps:!1,type:ze,format:fi,colorSpace:mo,depthBuffer:!1},s=Fm(t,e,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Fm(t,e,i);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=nM(r)),this._blurMaterial=rM(r,t,e),this._ggxMaterial=sM(r,t,e)}return s}_compileMaterial(t){let e=new Ft(new _e,t);this._renderer.compile(e,Qo)}_sceneToCubeUV(t,e,i,s,r){let l=new Xe(90,1,e,i),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,f=u.toneMapping;u.getClearColor(Om),u.toneMapping=bi,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(s),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Ft(new ii,new Te({name:"PMREM.Background",side:oi,depthWrite:!1,depthTest:!1})));let g=this._backgroundBox,p=g.material,m=!1,v=t.background;v?v.isColor&&(p.color.copy(v),t.background=null,m=!0):(p.color.copy(Om),m=!0);for(let E=0;E<6;E++){let M=E%3;M===0?(l.up.set(0,c[E],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[E],r.y,r.z)):M===1?(l.up.set(0,0,c[E]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[E],r.z)):(l.up.set(0,c[E],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[E]));let T=this._cubeSize;vr(s,M*T,E>2?T:0,T,T),u.setRenderTarget(s),m&&u.render(g,l),u.render(t,l)}u.toneMapping=f,u.autoClear=d,t.background=v}_textureToCubeUV(t,e){let i=this._renderer,s=t.mapping===Gn||t.mapping===ms;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Bm()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Um());let r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;let a=r.uniforms;a.envMap.value=t;let l=this._cubeSize;vr(e,0,0,3*l,2*l),i.setRenderTarget(e),i.render(o,Qo)}_applyPMREM(t){let e=this._renderer,i=e.autoClear;e.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=i}_applyGGXFilter(t,e,i){let s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[i];a.material=o;let l=o.uniforms,c=i/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),u=Math.sqrt(c*c-h*h),d=c*1.25,f=u*d,{_lodMax:x}=this,g=this._sizeLods[i],p=3*g*(i>x-Mr?i-x+Mr:0),m=4*(this._cubeSize-g);l.envMap.value=t.texture,l.roughness.value=f,l.mipInt.value=x-e,vr(r,p,m,3*g,2*g),s.setRenderTarget(r),s.render(a,Qo),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=x-i,vr(t,p,m,3*g,2*g),s.setRenderTarget(t),s.render(a,Qo)}_blur(t,e,i,s){let r=this._pingPongRenderTarget,o=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,i,o),this._blurPass(r,t,i,i,o)}_blurPass(t,e,i,s,r){let o=this._renderer,a=this._blurMaterial,l=this._lodMeshes[s];l.material=a;let c=a.uniforms;c.envMap.value=t.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-i;let h=this._sizeLods[s],u=3*h*(s>this._lodMax-Mr?s-this._lodMax+Mr:0),d=4*(this._cubeSize-h);vr(e,u,d,3*h,2*h),o.setRenderTarget(e),o.render(l,Qo)}};function nM(n){let t=[],e=[],i=n,s=n-Mr+1+Qv;for(let r=0;r<s;r++){let o=Math.pow(2,i);t.push(o);let a=1/(o-2),l=-a,c=1+a,h=[l,l,c,l,c,c,l,l,c,c,l,c],u=6,d=6,f=3,x=new Float32Array(f*d*u),g=new Float32Array(f*d*u);for(let m=0;m<u;m++){let v=m%3*2/3-1,E=m>2?0:-1,M=[v,E,0,v+2/3,E,0,v+2/3,E+1,0,v,E,0,v+2/3,E+1,0,v,E+1,0];x.set(M,f*d*m);for(let T=0;T<d;T++){let w=h[T*2]*2-1,C=h[T*2+1]*2-1;m===0?xs.set(1,C,w):m===1?xs.set(-w,1,-C):m===2?xs.set(-w,C,1):m===3?xs.set(-1,C,-w):m===4?xs.set(-w,-1,C):xs.set(w,C,-1),xs.toArray(g,(m*d+T)*f)}}let p=new _e;p.setAttribute("position",new De(x,f)),p.setAttribute("outputDirection",new De(g,f)),e.push(new Ft(p,null)),i>Mr&&i--}return{lodMeshes:e,sizeLods:t}}function Fm(n,t,e){let i=new we(n,t,e);return i.texture.mapping=Xo,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function vr(n,t,e,i,s){n.viewport.set(t,e,i,s),n.scissor.set(t,e,i,s)}function sM(n,t,e){return new Re({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:eM,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Lc(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Ci,depthTest:!1,depthWrite:!1})}function rM(n,t,e){return new Re({name:"SphericalGaussianBlur",defines:{SAMPLES:tM,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:Lc(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:Ci,depthTest:!1,depthWrite:!1})}function Um(){return new Re({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Lc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Ci,depthTest:!1,depthWrite:!1})}function Bm(){return new Re({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Lc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Ci,depthTest:!1,depthWrite:!1})}function Lc(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var Pc=class extends we{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let i={width:t,height:t,depth:1},s=[i,i,i,i,i,i];this.texture=new To(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new ii(5,5,5),r=new Re({name:"CubemapFromEquirect",uniforms:gs(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:oi,blending:Ci});r.uniforms.tEquirect.value=e;let o=new Ft(s,r),a=e.minFilter;return e.minFilter===tn&&(e.minFilter=Ne),new Bl(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,i=!0,s=!0){let r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,i,s);t.setRenderTarget(r)}};function oM(n){let t=new WeakMap,e=new WeakMap,i=null;function s(d,f=!1){return d==null?null:f?o(d):r(d)}function r(d){if(d&&d.isTexture){let f=d.mapping;if(f===xr||f===Hl)if(t.has(d)){let x=t.get(d).texture;return a(x,d.mapping)}else{let x=d.image;if(x&&x.height>0){let g=new Pc(x.height);return g.fromEquirectangularTexture(n,d),t.set(d,g),d.addEventListener("dispose",c),a(g.texture,d.mapping)}else return null}}return d}function o(d){if(d&&d.isTexture){let f=d.mapping,x=f===xr||f===Hl,g=f===Gn||f===ms;if(x||g){let p=e.get(d),m=p!==void 0?p.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==m)return i===null&&(i=new Sr(n)),p=x?i.fromEquirectangular(d,p):i.fromCubemap(d,p),p.texture.pmremVersion=d.pmremVersion,e.set(d,p),p.texture;if(p!==void 0)return p.texture;{let v=d.image;return x&&v&&v.height>0||g&&v&&l(v)?(i===null&&(i=new Sr(n)),p=x?i.fromEquirectangular(d):i.fromCubemap(d),p.texture.pmremVersion=d.pmremVersion,e.set(d,p),d.addEventListener("dispose",h),p.texture):null}}}return d}function a(d,f){return f===xr?d.mapping=Gn:f===Hl&&(d.mapping=ms),d}function l(d){let f=0,x=6;for(let g=0;g<x;g++)d[g]!==void 0&&f++;return f===x}function c(d){let f=d.target;f.removeEventListener("dispose",c);let x=t.get(f);x!==void 0&&(t.delete(f),x.dispose())}function h(d){let f=d.target;f.removeEventListener("dispose",h);let x=e.get(f);x!==void 0&&(e.delete(f),x.dispose())}function u(){t=new WeakMap,e=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:s,dispose:u}}function aM(n){let t={};function e(i){if(t[i]!==void 0)return t[i];let s=n.getExtension(i);return t[i]=s,s}return{has:function(i){return e(i)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(i){let s=e(i);return s===null&&cs("WebGLRenderer: "+i+" extension not supported."),s}}}function lM(n,t,e,i){let s={},r=new WeakMap;function o(u){let d=u.target;d.index!==null&&t.remove(d.index);for(let x in d.attributes)t.remove(d.attributes[x]);d.removeEventListener("dispose",o),delete s[d.id];let f=r.get(d);f&&(t.remove(f),r.delete(d)),i.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,e.memory.geometries--}function a(u,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,e.memory.geometries++),d}function l(u){let d=u.attributes;for(let f in d)t.update(d[f],n.ARRAY_BUFFER)}function c(u){let d=[],f=u.index,x=u.attributes.position,g=0;if(x===void 0)return;if(f!==null){let v=f.array;g=f.version;for(let E=0,M=v.length;E<M;E+=3){let T=v[E+0],w=v[E+1],C=v[E+2];d.push(T,w,w,C,C,T)}}else{let v=x.array;g=x.version;for(let E=0,M=v.length/3-1;E<M;E+=3){let T=E+0,w=E+1,C=E+2;d.push(T,w,w,C,C,T)}}let p=new(x.count>=65535?So:bo)(d,1);p.version=g;let m=r.get(u);m&&t.remove(m),r.set(u,p)}function h(u){let d=r.get(u);if(d){let f=u.index;f!==null&&d.version<f.version&&c(u)}else c(u);return r.get(u)}return{get:a,update:l,getWireframeAttribute:h}}function cM(n,t,e){let i;function s(u){i=u}let r,o;function a(u){r=u.type,o=u.bytesPerElement}function l(u,d){n.drawElements(i,d,r,u*o),e.update(d,i,1)}function c(u,d,f){f!==0&&(n.drawElementsInstanced(i,d,r,u*o,f),e.update(d,i,f))}function h(u,d,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,d,0,r,u,0,f);let g=0;for(let p=0;p<f;p++)g+=d[p];e.update(g,i,1)}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function hM(n){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,o,a){switch(e.calls++,o){case n.TRIANGLES:e.triangles+=a*(r/3);break;case n.LINES:e.lines+=a*(r/2);break;case n.LINE_STRIP:e.lines+=a*(r-1);break;case n.LINE_LOOP:e.lines+=a*r;break;case n.POINTS:e.points+=a*r;break;default:Dt("WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:i}}function uM(n,t,e){let i=new WeakMap,s=new ye;function r(o,a,l){let c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0,d=i.get(a);if(d===void 0||d.count!==u){let S=function(){C.dispose(),i.delete(a),a.removeEventListener("dispose",S)};d!==void 0&&d.texture.dispose();let f=a.morphAttributes.position!==void 0,x=a.morphAttributes.normal!==void 0,g=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],m=a.morphAttributes.normal||[],v=a.morphAttributes.color||[],E=0;f===!0&&(E=1),x===!0&&(E=2),g===!0&&(E=3);let M=a.attributes.position.count*E,T=1;M>t.maxTextureSize&&(T=Math.ceil(M/t.maxTextureSize),M=t.maxTextureSize);let w=new Float32Array(M*T*4*u),C=new vo(w,M,T,u);C.type=Hi,C.needsUpdate=!0;let _=E*4;for(let R=0;R<u;R++){let P=p[R],L=m[R],B=v[R],I=M*T*4*R;for(let U=0;U<P.count;U++){let V=U*_;f===!0&&(s.fromBufferAttribute(P,U),w[I+V+0]=s.x,w[I+V+1]=s.y,w[I+V+2]=s.z,w[I+V+3]=0),x===!0&&(s.fromBufferAttribute(L,U),w[I+V+4]=s.x,w[I+V+5]=s.y,w[I+V+6]=s.z,w[I+V+7]=0),g===!0&&(s.fromBufferAttribute(B,U),w[I+V+8]=s.x,w[I+V+9]=s.y,w[I+V+10]=s.z,w[I+V+11]=B.itemSize===4?s.w:1)}}d={count:u,texture:C,size:new Mt(M,T)},i.set(a,d),a.addEventListener("dispose",S)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",o.morphTexture,e);else{let f=0;for(let g=0;g<c.length;g++)f+=c[g];let x=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(n,"morphTargetBaseInfluence",x),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",d.texture,e),l.getUniforms().setValue(n,"morphTargetsTextureSize",d.size)}return{update:r}}function dM(n,t,e,i,s){let r=new WeakMap;function o(c){let h=s.render.frame,u=c.geometry,d=t.get(c,u);if(r.get(d)!==h&&(t.update(d),r.set(d,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,n.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,n.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let f=c.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return d}function a(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),i.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:o,dispose:a}}var fM={[Uo]:"LINEAR_TONE_MAPPING",[Bo]:"REINHARD_TONE_MAPPING",[zo]:"CINEON_TONE_MAPPING",[Ho]:"ACES_FILMIC_TONE_MAPPING",[Vo]:"AGX_TONE_MAPPING",[Wo]:"NEUTRAL_TONE_MAPPING",[Go]:"CUSTOM_TONE_MAPPING"};function pM(n,t,e,i,s,r){let o=new we(t,e,{type:n,depthBuffer:s,stencilBuffer:r,samples:i?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),a=null,l=null,c=new _e;c.setAttribute("position",new Yt([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new Yt([0,2,0,0,2,0],2));let h=new dr({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),u=new Ft(c,h),d=new ds(-1,1,1,-1,0,1),f=null,x=null,g=!1,p,m=null,v=[],E=!1;this.setSize=function(M,T){o.setSize(M,T),a!==null&&a.setSize(M,T),l!==null&&l.setSize(M,T);for(let w=0;w<v.length;w++){let C=v[w];C.setSize&&C.setSize(M,T)}},this.setEffects=function(M){v=M,E=v.length>0&&v[0].isRenderPass===!0;let T=o.width,w=o.height;v.length>0&&a===null&&(a=new we(T,w,{type:ze,depthBuffer:!1,stencilBuffer:!1}),l=new we(T,w,{type:ze,depthBuffer:!1,stencilBuffer:!1}));for(let C=0;C<v.length;C++){let _=v[C];_.setSize&&_.setSize(T,w)}},this.begin=function(M,T){if(g||M.toneMapping===bi&&v.length===0)return!1;if(m=T,T!==null){let w=T.width,C=T.height;(o.width!==w||o.height!==C)&&this.setSize(w,C)}return E===!1&&M.setRenderTarget(o),p=M.toneMapping,M.toneMapping=bi,!0},this.hasRenderPass=function(){return E},this.end=function(M,T){M.toneMapping=p,g=!0;let w=o,C=a;for(let _=0;_<v.length;_++){let S=v[_];S.enabled!==!1&&(S.render(M,C,w,T),S.needsSwap!==!1&&(w=C,C=C===a?l:a))}if(f!==M.outputColorSpace||x!==M.toneMapping){f=M.outputColorSpace,x=M.toneMapping,h.defines={},Wt.getTransfer(f)===Qt&&(h.defines.SRGB_TRANSFER="");let _=fM[x];_&&(h.defines[_]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=w.texture,M.setRenderTarget(m),M.render(u,d),m=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){o.dispose(),a!==null&&a.dispose(),l!==null&&l.dispose(),c.dispose(),h.dispose()}}var rg=new Be,fd=new On(1,1),og=new vo,ag=new Sl,lg=new To,zm=[],Hm=[],Gm=new Float32Array(16),Vm=new Float32Array(9),Wm=new Float32Array(4);function wr(n,t,e){let i=n[0];if(i<=0||i>0)return n;let s=t*e,r=zm[s];if(r===void 0&&(r=new Float32Array(s),zm[s]=r),t!==0){i.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,n[o].toArray(r,a)}return r}function He(n,t){if(n.length!==t.length)return!1;for(let e=0,i=n.length;e<i;e++)if(n[e]!==t[e])return!1;return!0}function Ge(n,t){for(let e=0,i=t.length;e<i;e++)n[e]=t[e]}function kc(n,t){let e=Hm[t];e===void 0&&(e=new Int32Array(t),Hm[t]=e);for(let i=0;i!==t;++i)e[i]=n.allocateTextureUnit();return e}function mM(n,t){let e=this.cache;e[0]!==t&&(n.uniform1f(this.addr,t),e[0]=t)}function gM(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(He(e,t))return;n.uniform2fv(this.addr,t),Ge(e,t)}}function xM(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(n.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(He(e,t))return;n.uniform3fv(this.addr,t),Ge(e,t)}}function yM(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(He(e,t))return;n.uniform4fv(this.addr,t),Ge(e,t)}}function _M(n,t){let e=this.cache,i=t.elements;if(i===void 0){if(He(e,t))return;n.uniformMatrix2fv(this.addr,!1,t),Ge(e,t)}else{if(He(e,i))return;Wm.set(i),n.uniformMatrix2fv(this.addr,!1,Wm),Ge(e,i)}}function vM(n,t){let e=this.cache,i=t.elements;if(i===void 0){if(He(e,t))return;n.uniformMatrix3fv(this.addr,!1,t),Ge(e,t)}else{if(He(e,i))return;Vm.set(i),n.uniformMatrix3fv(this.addr,!1,Vm),Ge(e,i)}}function MM(n,t){let e=this.cache,i=t.elements;if(i===void 0){if(He(e,t))return;n.uniformMatrix4fv(this.addr,!1,t),Ge(e,t)}else{if(He(e,i))return;Gm.set(i),n.uniformMatrix4fv(this.addr,!1,Gm),Ge(e,i)}}function bM(n,t){let e=this.cache;e[0]!==t&&(n.uniform1i(this.addr,t),e[0]=t)}function SM(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(He(e,t))return;n.uniform2iv(this.addr,t),Ge(e,t)}}function wM(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(He(e,t))return;n.uniform3iv(this.addr,t),Ge(e,t)}}function TM(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(He(e,t))return;n.uniform4iv(this.addr,t),Ge(e,t)}}function EM(n,t){let e=this.cache;e[0]!==t&&(n.uniform1ui(this.addr,t),e[0]=t)}function AM(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(He(e,t))return;n.uniform2uiv(this.addr,t),Ge(e,t)}}function CM(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(He(e,t))return;n.uniform3uiv(this.addr,t),Ge(e,t)}}function RM(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(He(e,t))return;n.uniform4uiv(this.addr,t),Ge(e,t)}}function PM(n,t,e){let i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let r;this.type===n.SAMPLER_2D_SHADOW?(fd.compareFunction=e.isReversedDepthBuffer()?Ac:Ec,r=fd):r=rg,e.setTexture2D(t||r,s)}function IM(n,t,e){let i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture3D(t||ag,s)}function LM(n,t,e){let i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTextureCube(t||lg,s)}function kM(n,t,e){let i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture2DArray(t||og,s)}function DM(n){switch(n){case 5126:return mM;case 35664:return gM;case 35665:return xM;case 35666:return yM;case 35674:return _M;case 35675:return vM;case 35676:return MM;case 5124:case 35670:return bM;case 35667:case 35671:return SM;case 35668:case 35672:return wM;case 35669:case 35673:return TM;case 5125:return EM;case 36294:return AM;case 36295:return CM;case 36296:return RM;case 35678:case 36198:case 36298:case 36306:case 35682:return PM;case 35679:case 36299:case 36307:return IM;case 35680:case 36300:case 36308:case 36293:return LM;case 36289:case 36303:case 36311:case 36292:return kM}}function NM(n,t){n.uniform1fv(this.addr,t)}function OM(n,t){let e=wr(t,this.size,2);n.uniform2fv(this.addr,e)}function FM(n,t){let e=wr(t,this.size,3);n.uniform3fv(this.addr,e)}function UM(n,t){let e=wr(t,this.size,4);n.uniform4fv(this.addr,e)}function BM(n,t){let e=wr(t,this.size,4);n.uniformMatrix2fv(this.addr,!1,e)}function zM(n,t){let e=wr(t,this.size,9);n.uniformMatrix3fv(this.addr,!1,e)}function HM(n,t){let e=wr(t,this.size,16);n.uniformMatrix4fv(this.addr,!1,e)}function GM(n,t){n.uniform1iv(this.addr,t)}function VM(n,t){n.uniform2iv(this.addr,t)}function WM(n,t){n.uniform3iv(this.addr,t)}function XM(n,t){n.uniform4iv(this.addr,t)}function ZM(n,t){n.uniform1uiv(this.addr,t)}function $M(n,t){n.uniform2uiv(this.addr,t)}function qM(n,t){n.uniform3uiv(this.addr,t)}function YM(n,t){n.uniform4uiv(this.addr,t)}function jM(n,t,e){let i=this.cache,s=t.length,r=kc(e,s);He(i,r)||(n.uniform1iv(this.addr,r),Ge(i,r));let o;this.type===n.SAMPLER_2D_SHADOW?o=fd:o=rg;for(let a=0;a!==s;++a)e.setTexture2D(t[a]||o,r[a])}function JM(n,t,e){let i=this.cache,s=t.length,r=kc(e,s);He(i,r)||(n.uniform1iv(this.addr,r),Ge(i,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||ag,r[o])}function KM(n,t,e){let i=this.cache,s=t.length,r=kc(e,s);He(i,r)||(n.uniform1iv(this.addr,r),Ge(i,r));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||lg,r[o])}function QM(n,t,e){let i=this.cache,s=t.length,r=kc(e,s);He(i,r)||(n.uniform1iv(this.addr,r),Ge(i,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||og,r[o])}function tb(n){switch(n){case 5126:return NM;case 35664:return OM;case 35665:return FM;case 35666:return UM;case 35674:return BM;case 35675:return zM;case 35676:return HM;case 5124:case 35670:return GM;case 35667:case 35671:return VM;case 35668:case 35672:return WM;case 35669:case 35673:return XM;case 5125:return ZM;case 36294:return $M;case 36295:return qM;case 36296:return YM;case 35678:case 36198:case 36298:case 36306:case 35682:return jM;case 35679:case 36299:case 36307:return JM;case 35680:case 36300:case 36308:case 36293:return KM;case 36289:case 36303:case 36311:case 36292:return QM}}var pd=class{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.setValue=DM(e.type)}},md=class{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=tb(e.type)}},gd=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,i){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(t,e[a.id],i)}}},ud=/(\w+)(\])?(\[|\.)?/g;function Xm(n,t){n.seq.push(t),n.map[t.id]=t}function eb(n,t,e){let i=n.name,s=i.length;for(ud.lastIndex=0;;){let r=ud.exec(i),o=ud.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){Xm(e,c===void 0?new pd(a,n,t):new md(a,n,t));break}else{let u=e.map[a];u===void 0&&(u=new gd(a),Xm(e,u)),e=u}}}var br=class{constructor(t,e){this.seq=[],this.map={};let i=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let o=0;o<i;++o){let a=t.getActiveUniform(e,o),l=t.getUniformLocation(e,a.name);eb(a,l,this)}let s=[],r=[];for(let o of this.seq)o.type===t.SAMPLER_2D_SHADOW||o.type===t.SAMPLER_CUBE_SHADOW||o.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,i,s){let r=this.map[e];r!==void 0&&r.setValue(t,i,s)}setOptional(t,e,i){let s=e[i];s!==void 0&&this.setValue(t,i,s)}static upload(t,e,i,s){for(let r=0,o=e.length;r!==o;++r){let a=e[r],l=i[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,s)}}static seqWithValue(t,e){let i=[];for(let s=0,r=t.length;s!==r;++s){let o=t[s];o.id in e&&i.push(o)}return i}};function Zm(n,t,e){let i=n.createShader(t);return n.shaderSource(i,e),n.compileShader(i),i}var ib=37297,nb=0;function sb(n,t){let e=n.split(`
`),i=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){let a=o+1;i.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return i.join(`
`)}var $m=new Bt;function rb(n){Wt._getMatrix($m,Wt.workingColorSpace,n);let t=`mat3( ${$m.elements.map(e=>e.toFixed(4))} )`;switch(Wt.getTransfer(n)){case go:return[t,"LinearTransferOETF"];case Qt:return[t,"sRGBTransferOETF"];default:return Nt("WebGLProgram: Unsupported color space: ",n),[t,"LinearTransferOETF"]}}function qm(n,t,e){let i=n.getShaderParameter(t,n.COMPILE_STATUS),r=(n.getShaderInfoLog(t)||"").trim();if(i&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return e.toUpperCase()+`

`+r+`

`+sb(n.getShaderSource(t),a)}else return r}function ob(n,t){let e=rb(t);return[`vec4 ${n}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var ab={[Uo]:"Linear",[Bo]:"Reinhard",[zo]:"Cineon",[Ho]:"ACESFilmic",[Vo]:"AgX",[Wo]:"Neutral",[Go]:"Custom"};function lb(n,t){let e=ab[t];return e===void 0?(Nt("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+n+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+n+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var Rc=new D;function cb(){Wt.getLuminanceCoefficients(Rc);let n=Rc.x.toFixed(4),t=Rc.y.toFixed(4),e=Rc.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function hb(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(ea).join(`
`)}function ub(n){let t=[];for(let e in n){let i=n[e];i!==!1&&t.push("#define "+e+" "+i)}return t.join(`
`)}function db(n,t){let e={},i=n.getProgramParameter(t,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){let r=n.getActiveAttrib(t,s),o=r.name,a=1;r.type===n.FLOAT_MAT2&&(a=2),r.type===n.FLOAT_MAT3&&(a=3),r.type===n.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:n.getAttribLocation(t,o),locationSize:a}}return e}function ea(n){return n!==""}function Ym(n,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return n.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function jm(n,t){return n.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var fb=/^[ \t]*#include +<([\w\d./]+)>/gm;function xd(n){return n.replace(fb,mb)}var pb=new Map;function mb(n,t){let e=Gt[t];if(e===void 0){let i=pb.get(t);if(i!==void 0)e=Gt[i],Nt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return xd(e)}var gb=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Jm(n){return n.replace(gb,xb)}function xb(n,t,e,i){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Km(n){let t=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?t+=`
#define HIGH_PRECISION`:n.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}var yb={[fs]:"SHADOWMAP_TYPE_PCF",[gr]:"SHADOWMAP_TYPE_VSM"};function _b(n){return yb[n.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var vb={[Gn]:"ENVMAP_TYPE_CUBE",[ms]:"ENVMAP_TYPE_CUBE",[Xo]:"ENVMAP_TYPE_CUBE_UV"};function Mb(n){return n.envMap===!1?"ENVMAP_TYPE_CUBE":vb[n.envMapMode]||"ENVMAP_TYPE_CUBE"}var bb={[ms]:"ENVMAP_MODE_REFRACTION"};function Sb(n){return n.envMap===!1?"ENVMAP_MODE_REFLECTION":bb[n.envMapMode]||"ENVMAP_MODE_REFLECTION"}var wb={[Zu]:"ENVMAP_BLENDING_MULTIPLY",[gm]:"ENVMAP_BLENDING_MIX",[xm]:"ENVMAP_BLENDING_ADD"};function Tb(n){return n.envMap===!1?"ENVMAP_BLENDING_NONE":wb[n.combine]||"ENVMAP_BLENDING_NONE"}function Eb(n){let t=n.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:i,maxMip:e}}function Ab(n,t,e,i){let s=n.getContext(),r=e.defines,o=e.vertexShader,a=e.fragmentShader,l=_b(e),c=Mb(e),h=Sb(e),u=Tb(e),d=Eb(e),f=hb(e),x=ub(r),g=s.createProgram(),p,m,v=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x].filter(ea).join(`
`),p.length>0&&(p+=`
`),m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x].filter(ea).join(`
`),m.length>0&&(m+=`
`)):(p=[Km(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ea).join(`
`),m=[Km(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==bi?"#define TONE_MAPPING":"",e.toneMapping!==bi?Gt.tonemapping_pars_fragment:"",e.toneMapping!==bi?lb("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Gt.colorspace_pars_fragment,ob("linearToOutputTexel",e.outputColorSpace),cb(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(ea).join(`
`)),o=xd(o),o=Ym(o,e),o=jm(o,e),a=xd(a),a=Ym(a,e),a=jm(a,e),o=Jm(o),a=Jm(a),e.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,p=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,m=["#define varying in",e.glslVersion===id?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===id?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);let E=v+p+o,M=v+m+a,T=Zm(s,s.VERTEX_SHADER,E),w=Zm(s,s.FRAGMENT_SHADER,M);s.attachShader(g,T),s.attachShader(g,w),e.index0AttributeName!==void 0?s.bindAttribLocation(g,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(g,0,"position"),s.linkProgram(g);function C(P){if(n.debug.checkShaderErrors){let L=s.getProgramInfoLog(g)||"",B=s.getShaderInfoLog(T)||"",I=s.getShaderInfoLog(w)||"",U=L.trim(),V=B.trim(),$=I.trim(),et=!0,Z=!0;if(s.getProgramParameter(g,s.LINK_STATUS)===!1)if(et=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,g,T,w);else{let J=qm(s,T,"vertex"),tt=qm(s,w,"fragment");Dt("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(g,s.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+U+`
`+J+`
`+tt)}else U!==""?Nt("WebGLProgram: Program Info Log:",U):(V===""||$==="")&&(Z=!1);Z&&(P.diagnostics={runnable:et,programLog:U,vertexShader:{log:V,prefix:p},fragmentShader:{log:$,prefix:m}})}s.deleteShader(T),s.deleteShader(w),_=new br(s,g),S=db(s,g)}let _;this.getUniforms=function(){return _===void 0&&C(this),_};let S;this.getAttributes=function(){return S===void 0&&C(this),S};let R=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return R===!1&&(R=s.getProgramParameter(g,ib)),R},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(g),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=nb++,this.cacheKey=t,this.usedTimes=1,this.program=g,this.vertexShader=T,this.fragmentShader=w,this}var Cb=0,yd=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,i){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(i)===!1&&(s.add(i),i.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let i of e)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,i=e.get(t);return i===void 0&&(i=new Set,e.set(t,i)),i}_getShaderStage(t){let e=this.shaderCache,i=e.get(t);return i===void 0&&(i=new _d(t),e.set(t,i)),i}},_d=class{constructor(t){this.id=Cb++,this.code=t,this.usedTimes=0}};function Rb(n){return n===Wn||n===Jo||n===Ko}function Pb(n,t,e,i,s,r){let o=new rr,a=new yd,l=new Set,c=[],h=new Map,u=i.logarithmicDepthBuffer,d=i.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(_){return l.add(_),_===0?"uv":`uv${_}`}function g(_,S,R,P,L,B){let I=P.fog,U=L.geometry,V=_.isMeshStandardMaterial||_.isMeshLambertMaterial||_.isMeshPhongMaterial?P.environment:null,$=_.isMeshStandardMaterial||_.isMeshLambertMaterial&&!_.envMap||_.isMeshPhongMaterial&&!_.envMap,et=t.get(_.envMap||V,$),Z=et&&et.mapping===Xo?et.image.height:null,J=f[_.type];_.precision!==null&&(d=i.getMaxPrecision(_.precision),d!==_.precision&&Nt("WebGLProgram.getParameters:",_.precision,"not supported, using",d,"instead."));let tt=U.morphAttributes.position||U.morphAttributes.normal||U.morphAttributes.color,ot=tt!==void 0?tt.length:0,st=0;U.morphAttributes.position!==void 0&&(st=1),U.morphAttributes.normal!==void 0&&(st=2),U.morphAttributes.color!==void 0&&(st=3);let Ut,It,Lt,X;if(J){let he=nn[J];Ut=he.vertexShader,It=he.fragmentShader}else{Ut=_.vertexShader,It=_.fragmentShader;let he=a.getVertexShaderStage(_),ie=a.getFragmentShaderStage(_);a.update(_,he,ie),Lt=he.id,X=ie.id}let K=n.getRenderTarget(),xt=n.state.buffers.depth.getReversed(),Ot=L.isInstancedMesh===!0,_t=L.isBatchedMesh===!0,Vt=!!_.map,Fe=!!_.matcap,Xt=!!et,Kt=!!_.aoMap,ce=!!_.lightMap,$t=!!_.bumpMap&&_.wireframe===!1,xe=!!_.normalMap,Ve=!!_.displacementMap,li=!!_.emissiveMap,be=!!_.metalnessMap,Ie=!!_.roughnessMap,O=_.anisotropy>0,Ke=_.clearcoat>0,se=_.dispersion>0,A=_.retroreflectivity>0,y=_.iridescence>0,F=_.sheen>0,G=_.transmission>0,q=O&&!!_.anisotropyMap,rt=Ke&&!!_.clearcoatMap,at=Ke&&!!_.clearcoatNormalMap,Y=Ke&&!!_.clearcoatRoughnessMap,Q=y&&!!_.iridescenceMap,lt=y&&!!_.iridescenceThicknessMap,Ct=F&&!!_.sheenColorMap,dt=F&&!!_.sheenRoughnessMap,ct=!!_.specularMap,Rt=!!_.specularColorMap,kt=!!_.specularIntensityMap,zt=G&&!!_.transmissionMap,N=G&&!!_.thicknessMap,ht=!!_.gradientMap,j=!!_.alphaMap,ut=_.alphaTest>0,gt=!!_.alphaHash,it=!!_.extensions,Pt=bi;_.toneMapped&&(K===null||K.isXRRenderTarget===!0)&&(Pt=n.toneMapping);let Tt={shaderID:J,shaderType:_.type,shaderName:_.name,vertexShader:Ut,fragmentShader:It,defines:_.defines,customVertexShaderID:Lt,customFragmentShaderID:X,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:d,batching:_t,batchingColor:_t&&L._colorsTexture!==null,instancing:Ot,instancingColor:Ot&&L.instanceColor!==null,instancingMorph:Ot&&L.morphTexture!==null,outputColorSpace:K===null?n.outputColorSpace:K.isXRRenderTarget===!0?K.texture.colorSpace:Wt.workingColorSpace,alphaToCoverage:!!_.alphaToCoverage,map:Vt,matcap:Fe,envMap:Xt,envMapMode:Xt&&et.mapping,envMapCubeUVHeight:Z,aoMap:Kt,lightMap:ce,bumpMap:$t,normalMap:xe,displacementMap:Ve,emissiveMap:li,normalMapObjectSpace:xe&&_.normalMapType===vm,normalMapTangentSpace:xe&&_.normalMapType===Tc,packedNormalMap:xe&&_.normalMapType===Tc&&Rb(_.normalMap.format),metalnessMap:be,roughnessMap:Ie,anisotropy:O,anisotropyMap:q,clearcoat:Ke,clearcoatMap:rt,clearcoatNormalMap:at,clearcoatRoughnessMap:Y,dispersion:se,retroreflection:A,iridescence:y,iridescenceMap:Q,iridescenceThicknessMap:lt,sheen:F,sheenColorMap:Ct,sheenRoughnessMap:dt,specularMap:ct,specularColorMap:Rt,specularIntensityMap:kt,transmission:G,transmissionMap:zt,thicknessMap:N,gradientMap:ht,opaque:_.transparent===!1&&_.blending===Hn&&_.alphaToCoverage===!1,alphaMap:j,alphaTest:ut,alphaHash:gt,combine:_.combine,mapUv:Vt&&x(_.map.channel),aoMapUv:Kt&&x(_.aoMap.channel),lightMapUv:ce&&x(_.lightMap.channel),bumpMapUv:$t&&x(_.bumpMap.channel),normalMapUv:xe&&x(_.normalMap.channel),displacementMapUv:Ve&&x(_.displacementMap.channel),emissiveMapUv:li&&x(_.emissiveMap.channel),metalnessMapUv:be&&x(_.metalnessMap.channel),roughnessMapUv:Ie&&x(_.roughnessMap.channel),anisotropyMapUv:q&&x(_.anisotropyMap.channel),clearcoatMapUv:rt&&x(_.clearcoatMap.channel),clearcoatNormalMapUv:at&&x(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Y&&x(_.clearcoatRoughnessMap.channel),iridescenceMapUv:Q&&x(_.iridescenceMap.channel),iridescenceThicknessMapUv:lt&&x(_.iridescenceThicknessMap.channel),sheenColorMapUv:Ct&&x(_.sheenColorMap.channel),sheenRoughnessMapUv:dt&&x(_.sheenRoughnessMap.channel),specularMapUv:ct&&x(_.specularMap.channel),specularColorMapUv:Rt&&x(_.specularColorMap.channel),specularIntensityMapUv:kt&&x(_.specularIntensityMap.channel),transmissionMapUv:zt&&x(_.transmissionMap.channel),thicknessMapUv:N&&x(_.thicknessMap.channel),alphaMapUv:j&&x(_.alphaMap.channel),vertexTangents:!!U.attributes.tangent&&(xe||O),vertexNormals:!!U.attributes.normal,vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!U.attributes.color&&U.attributes.color.itemSize===4,pointsUvs:L.isPoints===!0&&!!U.attributes.uv&&(Vt||j),fog:!!I,useFog:_.fog===!0,fogExp2:!!I&&I.isFogExp2,flatShading:_.wireframe===!1&&(_.flatShading===!0||U.attributes.normal===void 0&&xe===!1&&(_.isMeshLambertMaterial||_.isMeshPhongMaterial||_.isMeshStandardMaterial||_.isMeshPhysicalMaterial)),sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:xt,skinning:L.isSkinnedMesh===!0,hasPositionAttribute:U.attributes.position!==void 0,morphTargets:U.morphAttributes.position!==void 0,morphNormals:U.morphAttributes.normal!==void 0,morphColors:U.morphAttributes.color!==void 0,morphTargetsCount:ot,morphTextureStride:st,numSunLights:S.sun.length,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numSunLightShadows:S.sunShadowMap.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numLightProbeGrids:B.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:_.dithering,shadowMapEnabled:n.shadowMap.enabled&&R.length>0,shadowMapType:n.shadowMap.type,toneMapping:Pt,decodeVideoTexture:Vt&&_.map.isVideoTexture===!0&&Wt.getTransfer(_.map.colorSpace)===Qt,decodeVideoTextureEmissive:li&&_.emissiveMap.isVideoTexture===!0&&Wt.getTransfer(_.emissiveMap.colorSpace)===Qt,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===hi,flipSided:_.side===oi,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:it&&_.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(it&&_.extensions.multiDraw===!0||_t)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return Tt.vertexUv1s=l.has(1),Tt.vertexUv2s=l.has(2),Tt.vertexUv3s=l.has(3),l.clear(),Tt}function p(_){let S=[];if(_.shaderID?S.push(_.shaderID):(S.push(_.customVertexShaderID),S.push(_.customFragmentShaderID)),_.defines!==void 0)for(let R in _.defines)S.push(R),S.push(_.defines[R]);return _.isRawShaderMaterial===!1&&(m(S,_),v(S,_),S.push(n.outputColorSpace)),S.push(_.customProgramCacheKey),S.join()}function m(_,S){_.push(S.precision),_.push(S.outputColorSpace),_.push(S.envMapMode),_.push(S.envMapCubeUVHeight),_.push(S.mapUv),_.push(S.alphaMapUv),_.push(S.lightMapUv),_.push(S.aoMapUv),_.push(S.bumpMapUv),_.push(S.normalMapUv),_.push(S.displacementMapUv),_.push(S.emissiveMapUv),_.push(S.metalnessMapUv),_.push(S.roughnessMapUv),_.push(S.anisotropyMapUv),_.push(S.clearcoatMapUv),_.push(S.clearcoatNormalMapUv),_.push(S.clearcoatRoughnessMapUv),_.push(S.iridescenceMapUv),_.push(S.iridescenceThicknessMapUv),_.push(S.sheenColorMapUv),_.push(S.sheenRoughnessMapUv),_.push(S.specularMapUv),_.push(S.specularColorMapUv),_.push(S.specularIntensityMapUv),_.push(S.transmissionMapUv),_.push(S.thicknessMapUv),_.push(S.combine),_.push(S.fogExp2),_.push(S.sizeAttenuation),_.push(S.morphTargetsCount),_.push(S.morphAttributeCount),_.push(S.numSunLights),_.push(S.numDirLights),_.push(S.numPointLights),_.push(S.numSpotLights),_.push(S.numSpotLightMaps),_.push(S.numHemiLights),_.push(S.numRectAreaLights),_.push(S.numSunLightShadows),_.push(S.numDirLightShadows),_.push(S.numPointLightShadows),_.push(S.numSpotLightShadows),_.push(S.numSpotLightShadowsWithMaps),_.push(S.numLightProbes),_.push(S.shadowMapType),_.push(S.toneMapping),_.push(S.numClippingPlanes),_.push(S.numClipIntersection),_.push(S.depthPacking)}function v(_,S){o.disableAll(),S.instancing&&o.enable(0),S.instancingColor&&o.enable(1),S.instancingMorph&&o.enable(2),S.matcap&&o.enable(3),S.envMap&&o.enable(4),S.normalMapObjectSpace&&o.enable(5),S.normalMapTangentSpace&&o.enable(6),S.clearcoat&&o.enable(7),S.iridescence&&o.enable(8),S.alphaTest&&o.enable(9),S.vertexColors&&o.enable(10),S.vertexAlphas&&o.enable(11),S.vertexUv1s&&o.enable(12),S.vertexUv2s&&o.enable(13),S.vertexUv3s&&o.enable(14),S.vertexTangents&&o.enable(15),S.anisotropy&&o.enable(16),S.alphaHash&&o.enable(17),S.batching&&o.enable(18),S.dispersion&&o.enable(19),S.retroreflection&&o.enable(24),S.batchingColor&&o.enable(20),S.gradientMap&&o.enable(21),S.packedNormalMap&&o.enable(22),S.vertexNormals&&o.enable(23),_.push(o.mask),o.disableAll(),S.fog&&o.enable(0),S.useFog&&o.enable(1),S.flatShading&&o.enable(2),S.logarithmicDepthBuffer&&o.enable(3),S.reversedDepthBuffer&&o.enable(4),S.skinning&&o.enable(5),S.morphTargets&&o.enable(6),S.morphNormals&&o.enable(7),S.morphColors&&o.enable(8),S.premultipliedAlpha&&o.enable(9),S.shadowMapEnabled&&o.enable(10),S.doubleSided&&o.enable(11),S.flipSided&&o.enable(12),S.useDepthPacking&&o.enable(13),S.dithering&&o.enable(14),S.transmission&&o.enable(15),S.sheen&&o.enable(16),S.opaque&&o.enable(17),S.pointsUvs&&o.enable(18),S.decodeVideoTexture&&o.enable(19),S.decodeVideoTextureEmissive&&o.enable(20),S.alphaToCoverage&&o.enable(21),S.numLightProbeGrids>0&&o.enable(22),S.hasPositionAttribute&&o.enable(23),_.push(o.mask)}function E(_){let S=f[_.type],R;if(S){let P=nn[S];R=xn.clone(P.uniforms)}else R=_.uniforms;return R}function M(_,S){let R=h.get(S);return R!==void 0?++R.usedTimes:(R=new Ab(n,S,_,s),c.push(R),h.set(S,R)),R}function T(_){if(--_.usedTimes===0){let S=c.indexOf(_);c[S]=c[c.length-1],c.pop(),h.delete(_.cacheKey),_.destroy()}}function w(_){a.remove(_)}function C(){a.dispose()}return{getParameters:g,getProgramCacheKey:p,getUniforms:E,acquireProgram:M,releaseProgram:T,releaseShaderCache:w,programs:c,dispose:C}}function Ib(){let n=new WeakMap;function t(o){return n.has(o)}function e(o){let a=n.get(o);return a===void 0&&(a={},n.set(o,a)),a}function i(o){n.delete(o)}function s(o,a,l){n.get(o)[a]=l}function r(){n=new WeakMap}return{has:t,get:e,remove:i,update:s,dispose:r}}function Lb(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.material.id!==t.material.id?n.material.id-t.material.id:n.materialVariant!==t.materialVariant?n.materialVariant-t.materialVariant:n.z!==t.z?n.z-t.z:n.id-t.id}function Qm(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.z!==t.z?t.z-n.z:n.id-t.id}function tg(){let n=[],t=0,e=[],i=[],s=[];function r(){t=0,e.length=0,i.length=0,s.length=0}function o(d){let f=0;return d.isInstancedMesh&&(f+=2),d.isSkinnedMesh&&(f+=1),f}function a(d,f,x,g,p,m){let v=n[t];return v===void 0?(v={id:d.id,object:d,geometry:f,material:x,materialVariant:o(d),groupOrder:g,renderOrder:d.renderOrder,z:p,group:m},n[t]=v):(v.id=d.id,v.object=d,v.geometry=f,v.material=x,v.materialVariant=o(d),v.groupOrder=g,v.renderOrder=d.renderOrder,v.z=p,v.group=m),t++,v}function l(d,f,x,g,p,m,v){v.reversedDepth===!0&&(p=-p);let E=a(d,f,x,g,p,m);x.transmission>0?i.push(E):x.transparent===!0?s.push(E):e.push(E)}function c(d,f,x,g,p,m){let v=a(d,f,x,g,p,m);x.transmission>0?i.unshift(v):x.transparent===!0?s.unshift(v):e.unshift(v)}function h(d,f){e.length>1&&e.sort(d||Lb),i.length>1&&i.sort(f||Qm),s.length>1&&s.sort(f||Qm)}function u(){for(let d=t,f=n.length;d<f;d++){let x=n[d];if(x.id===null)break;x.id=null,x.object=null,x.geometry=null,x.material=null,x.group=null}}return{opaque:e,transmissive:i,transparent:s,init:r,push:l,unshift:c,finish:u,sort:h}}function kb(){let n=new WeakMap;function t(i,s){let r=n.get(i),o;return r===void 0?(o=new tg,n.set(i,[o])):s>=r.length?(o=new tg,r.push(o)):o=r[s],o}function e(){n=new WeakMap}return{get:t,dispose:e}}function Db(){let n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new D,color:new At};break;case"SpotLight":e={position:new D,direction:new D,color:new At,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new D,color:new At,distance:0,decay:0};break;case"HemisphereLight":e={direction:new D,skyColor:new At,groundColor:new At};break;case"RectAreaLight":e={color:new At,position:new D,halfWidth:new D,halfHeight:new D};break}return n[t.id]=e,e}}}function Nb(){let n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Mt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Mt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Mt,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[t.id]=e,e}}}var Ob=0;function Fb(n,t){return(t.castShadow?2:0)-(n.castShadow?2:0)+(t.map?1:0)-(n.map?1:0)}function Ub(n){let t=new Db,e=Nb(),i={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new D);let s=new D,r=new de,o=new de;function a(c){let h=0,u=0,d=0;for(let L=0;L<9;L++)i.probe[L].set(0,0,0);let f=0,x=0,g=0,p=0,m=0,v=0,E=0,M=0,T=0,w=0,C=0,_=0,S=0,R=0;c.sort(Fb);for(let L=0,B=c.length;L<B;L++){let I=c[L],U=I.color,V=I.intensity,$=I.distance,et=null;if(I.shadow&&I.shadow.map&&(I.shadow.map.texture.format===Wn?et=I.shadow.map.texture:et=I.shadow.map.depthTexture||I.shadow.map.texture),I.isAmbientLight)h+=U.r*V,u+=U.g*V,d+=U.b*V;else if(I.isLightProbe){for(let Z=0;Z<9;Z++)i.probe[Z].addScaledVector(I.sh.coefficients[Z],V);R++}else if(I.isSunLight){let Z=t.get(I);if(Z.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let J=I.shadow,tt=e.get(I);tt.shadowIntensity=J.intensity,tt.shadowBias=J.bias,tt.shadowNormalBias=J.normalBias,tt.shadowRadius=J.radius,tt.shadowMapSize.copy(J.mapSize).multiply(J.getFrameExtents()),i.sunShadow[x]=tt,i.sunShadowMap[x]=et;let ot=J.getViewportCount();for(let st=0;st<ot;st++)i.sunShadowMatrix[g+st]=J.getMatrix(st),i.sunShadowCascade[g+st]=J._cascadeData[st];g+=ot,x++}i.sun[f]=Z,f++}else if(I.isDirectionalLight){let Z=t.get(I);if(Z.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let J=I.shadow,tt=e.get(I);tt.shadowIntensity=J.intensity,tt.shadowBias=J.bias,tt.shadowNormalBias=J.normalBias,tt.shadowRadius=J.radius,tt.shadowMapSize=J.mapSize,i.directionalShadow[p]=tt,i.directionalShadowMap[p]=et,i.directionalShadowMatrix[p]=I.shadow.matrix,T++}i.directional[p]=Z,p++}else if(I.isSpotLight){let Z=t.get(I);Z.position.setFromMatrixPosition(I.matrixWorld),Z.color.copy(U).multiplyScalar(V),Z.distance=$,Z.coneCos=Math.cos(I.angle),Z.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),Z.decay=I.decay,i.spot[v]=Z;let J=I.shadow;if(I.map&&(i.spotLightMap[_]=I.map,_++,J.updateMatrices(I),I.castShadow&&S++),i.spotLightMatrix[v]=J.matrix,I.castShadow){let tt=e.get(I);tt.shadowIntensity=J.intensity,tt.shadowBias=J.bias,tt.shadowNormalBias=J.normalBias,tt.shadowRadius=J.radius,tt.shadowMapSize=J.mapSize,i.spotShadow[v]=tt,i.spotShadowMap[v]=et,C++}v++}else if(I.isRectAreaLight){let Z=t.get(I);Z.color.copy(U).multiplyScalar(V),Z.halfWidth.set(I.width*.5,0,0),Z.halfHeight.set(0,I.height*.5,0),i.rectArea[E]=Z,E++}else if(I.isPointLight){let Z=t.get(I);if(Z.color.copy(I.color).multiplyScalar(I.intensity),Z.distance=I.distance,Z.decay=I.decay,I.castShadow){let J=I.shadow,tt=e.get(I);tt.shadowIntensity=J.intensity,tt.shadowBias=J.bias,tt.shadowNormalBias=J.normalBias,tt.shadowRadius=J.radius,tt.shadowMapSize=J.mapSize,tt.shadowCameraNear=J.camera.near,tt.shadowCameraFar=J.camera.far,i.pointShadow[m]=tt,i.pointShadowMap[m]=et,i.pointShadowMatrix[m]=I.shadow.matrix,w++}i.point[m]=Z,m++}else if(I.isHemisphereLight){let Z=t.get(I);Z.skyColor.copy(I.color).multiplyScalar(V),Z.groundColor.copy(I.groundColor).multiplyScalar(V),i.hemi[M]=Z,M++}}E>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ft.LTC_FLOAT_1,i.rectAreaLTC2=ft.LTC_FLOAT_2):(i.rectAreaLTC1=ft.LTC_HALF_1,i.rectAreaLTC2=ft.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=u,i.ambient[2]=d;let P=i.hash;(P.sunLength!==f||P.directionalLength!==p||P.pointLength!==m||P.spotLength!==v||P.rectAreaLength!==E||P.hemiLength!==M||P.numSunShadows!==x||P.numDirectionalShadows!==T||P.numPointShadows!==w||P.numSpotShadows!==C||P.numSpotMaps!==_||P.numLightProbes!==R)&&(i.sun.length=f,i.directional.length=p,i.spot.length=v,i.rectArea.length=E,i.point.length=m,i.hemi.length=M,i.sunShadow.length=x,i.sunShadowMap.length=x,i.sunShadowMatrix.length=g,i.sunShadowCascade.length=g,i.directionalShadow.length=T,i.directionalShadowMap.length=T,i.directionalShadowMatrix.length=T,i.pointShadow.length=w,i.pointShadowMap.length=w,i.pointShadowMatrix.length=w,i.spotShadow.length=C,i.spotShadowMap.length=C,i.spotLightMatrix.length=C+_-S,i.spotLightMap.length=_,i.numSpotLightShadowsWithMaps=S,i.numLightProbes=R,P.sunLength=f,P.directionalLength=p,P.pointLength=m,P.spotLength=v,P.rectAreaLength=E,P.hemiLength=M,P.numSunShadows=x,P.numDirectionalShadows=T,P.numPointShadows=w,P.numSpotShadows=C,P.numSpotMaps=_,P.numLightProbes=R,i.version=Ob++)}function l(c,h){let u=0,d=0,f=0,x=0,g=0,p=0,m=h.matrixWorldInverse;for(let v=0,E=c.length;v<E;v++){let M=c[v];if(M.isSunLight){let T=i.sun[u];T.direction.setFromMatrixPosition(M.matrixWorld),T.direction.transformDirection(m),u++}else if(M.isDirectionalLight){let T=i.directional[d];T.direction.setFromMatrixPosition(M.matrixWorld),s.setFromMatrixPosition(M.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(m),d++}else if(M.isSpotLight){let T=i.spot[x];T.position.setFromMatrixPosition(M.matrixWorld),T.position.applyMatrix4(m),T.direction.setFromMatrixPosition(M.matrixWorld),s.setFromMatrixPosition(M.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(m),x++}else if(M.isRectAreaLight){let T=i.rectArea[g];T.position.setFromMatrixPosition(M.matrixWorld),T.position.applyMatrix4(m),o.identity(),r.copy(M.matrixWorld),r.premultiply(m),o.extractRotation(r),T.halfWidth.set(M.width*.5,0,0),T.halfHeight.set(0,M.height*.5,0),T.halfWidth.applyMatrix4(o),T.halfHeight.applyMatrix4(o),g++}else if(M.isPointLight){let T=i.point[f];T.position.setFromMatrixPosition(M.matrixWorld),T.position.applyMatrix4(m),f++}else if(M.isHemisphereLight){let T=i.hemi[p];T.direction.setFromMatrixPosition(M.matrixWorld),T.direction.transformDirection(m),p++}}}return{setup:a,setupView:l,state:i}}function eg(n){let t=new Ub(n),e=[],i=[],s=[];function r(d){u.camera=d,e.length=0,i.length=0,s.length=0}function o(d){e.push(d)}function a(d){i.push(d)}function l(d){s.push(d)}function c(){t.setup(e)}function h(d){t.setupView(e,d)}let u={lightsArray:e,shadowsArray:i,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:u,setupLights:c,setupLightsView:h,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}function Bb(n){let t=new WeakMap;function e(s,r=0){let o=t.get(s),a;return o===void 0?(a=new eg(n),t.set(s,[a])):r>=o.length?(a=new eg(n),o.push(a)):a=o[r],a}function i(){t=new WeakMap}return{get:e,dispose:i}}var zb=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Hb=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Gb=[new D(1,0,0),new D(-1,0,0),new D(0,1,0),new D(0,-1,0),new D(0,0,1),new D(0,0,-1)],Vb=[new D(0,-1,0),new D(0,-1,0),new D(0,0,1),new D(0,0,-1),new D(0,-1,0),new D(0,-1,0)],ig=new de,ta=new D,dd=new D;function Wb(n,t,e){let i=new cr,s=new Mt,r=new Mt,o=new ye,a=new Al,l=new Cl,c={},h=e.maxTextureSize,u={[zn]:oi,[oi]:zn,[hi]:hi},d=new Re({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Mt},radius:{value:4}},vertexShader:zb,fragmentShader:Hb}),f=d.clone();f.defines.HORIZONTAL_PASS=1;let x=new _e;x.setAttribute("position",new De(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let g=new Ft(x,d),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=fs;let m=this.type;this.render=function(w,C,_){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||w.length===0)return;this.type===Jp&&(Nt("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=fs);let S=n.getRenderTarget(),R=n.getActiveCubeFace(),P=n.getActiveMipmapLevel(),L=n.state;L.setBlending(Ci),L.buffers.depth.getReversed()===!0?L.buffers.color.setClear(0,0,0,0):L.buffers.color.setClear(1,1,1,1),L.buffers.depth.setTest(!0),L.setScissorTest(!1);let B=m!==this.type;B&&C.traverse(function(I){I.material&&(Array.isArray(I.material)?I.material.forEach(U=>U.needsUpdate=!0):I.material.needsUpdate=!0)});for(let I=0,U=w.length;I<U;I++){let V=w[I],$=V.shadow;if($===void 0){Nt("WebGLShadowMap:",V,"has no shadow.");continue}if($.autoUpdate===!1&&$.needsUpdate===!1)continue;s.copy($.mapSize);let et=$.getFrameExtents();s.multiply(et),r.copy($.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/et.x),s.x=r.x*et.x,$.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/et.y),s.y=r.y*et.y,$.mapSize.y=r.y));let Z=n.state.buffers.depth.getReversed();if($.camera._reversedDepth=Z,$.map===null||B===!0){if($.map!==null&&($.map.depthTexture!==null&&($.map.depthTexture.dispose(),$.map.depthTexture=null),$.map.dispose()),this.type===gr){if(V.isPointLight){Nt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}$.map=new we(s.x,s.y,{format:Wn,type:ze,minFilter:Ne,magFilter:Ne,generateMipmaps:!1}),$.map.texture.name=V.name+".shadowMap",$.map.depthTexture=new On(s.x,s.y,Hi),$.map.depthTexture.name=V.name+".shadowMapDepth",$.map.depthTexture.format=Yi,$.map.depthTexture.compareFunction=null,$.map.depthTexture.minFilter=Ze,$.map.depthTexture.magFilter=Ze}else V.isPointLight?($.map=new Pc(s.x),$.map.depthTexture=new Tl(s.x,zi)):($.map=new we(s.x,s.y),$.map.depthTexture=new On(s.x,s.y,zi)),$.map.depthTexture.name=V.name+".shadowMap",$.map.depthTexture.format=Yi,this.type===fs?($.map.depthTexture.compareFunction=Z?Ac:Ec,$.map.depthTexture.minFilter=Ne,$.map.depthTexture.magFilter=Ne):($.map.depthTexture.compareFunction=null,$.map.depthTexture.minFilter=Ze,$.map.depthTexture.magFilter=Ze);$.camera.updateProjectionMatrix()}$.map.isWebGLCubeRenderTarget!==!0&&($.map.width!==s.x||$.map.height!==s.y)&&$.map.setSize(s.x,s.y);let J=$.map.isWebGLCubeRenderTarget?6:$.getViewportCount();V.isPointLight!==!0&&$.updateMatrices(V,_);for(let tt=0;tt<J;tt++){let ot=$.getCamera(tt);if(V.isPointLight){let st=$.camera,Ut=$.matrix,It=V.distance||st.far;It!==st.far&&(st.far=It,st.updateProjectionMatrix()),ta.setFromMatrixPosition(V.matrixWorld),st.position.copy(ta),dd.copy(st.position),dd.add(Gb[tt]),st.up.copy(Vb[tt]),st.lookAt(dd),st.updateMatrixWorld(),Ut.makeTranslation(-ta.x,-ta.y,-ta.z),ig.multiplyMatrices(st.projectionMatrix,st.matrixWorldInverse),$._frustum.setFromProjectionMatrix(ig,st.coordinateSystem,st.reversedDepth)}if($.map.isWebGLCubeRenderTarget)n.setRenderTarget($.map,tt),n.clear();else{tt===0&&(n.setRenderTarget($.map),n.clear());let st=$.getViewport(tt);o.set(r.x*st.x,r.y*st.y,r.x*st.z,r.y*st.w),L.viewport(o)}i=$.getFrustum(tt),M(C,_,ot,V,this.type)}$.isPointLightShadow!==!0&&this.type===gr&&v($,_),$.needsUpdate=!1}m=this.type,p.needsUpdate=!1,n.setRenderTarget(S,R,P)};function v(w,C){let _=t.update(g);d.defines.VSM_SAMPLES!==w.blurSamples&&(d.defines.VSM_SAMPLES=w.blurSamples,f.defines.VSM_SAMPLES=w.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),w.mapPass===null?w.mapPass=new we(s.x,s.y,{format:Wn,type:ze}):(w.mapPass.width!==w.map.width||w.mapPass.height!==w.map.height)&&w.mapPass.setSize(w.map.width,w.map.height),d.uniforms.shadow_pass.value=w.map.depthTexture,d.uniforms.resolution.value.set(w.map.width,w.map.height),d.uniforms.radius.value=w.radius,n.setRenderTarget(w.mapPass),n.clear(),n.renderBufferDirect(C,null,_,d,g,null),f.uniforms.shadow_pass.value=w.mapPass.texture,f.uniforms.resolution.value.set(w.map.width,w.map.height),f.uniforms.radius.value=w.radius,n.setRenderTarget(w.map),n.clear(),n.renderBufferDirect(C,null,_,f,g,null)}function E(w,C,_,S){let R=null,P=_.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(P!==void 0)R=P;else if(R=_.isPointLight===!0?l:a,n.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0||C.alphaToCoverage===!0){let L=R.uuid,B=C.uuid,I=c[L];I===void 0&&(I={},c[L]=I);let U=I[B];U===void 0&&(U=R.clone(),I[B]=U,C.addEventListener("dispose",T)),R=U}if(R.visible=C.visible,R.wireframe=C.wireframe,S===gr?R.side=C.shadowSide!==null?C.shadowSide:C.side:R.side=C.shadowSide!==null?C.shadowSide:u[C.side],R.alphaMap=C.alphaMap,R.alphaTest=C.alphaToCoverage===!0?.5:C.alphaTest,R.map=C.map,R.clipShadows=C.clipShadows,R.clippingPlanes=C.clippingPlanes,R.clipIntersection=C.clipIntersection,R.displacementMap=C.displacementMap,R.displacementScale=C.displacementScale,R.displacementBias=C.displacementBias,R.wireframeLinewidth=C.wireframeLinewidth,R.linewidth=C.linewidth,_.isPointLight===!0&&R.isMeshDistanceMaterial===!0){let L=n.properties.get(R);L.light=_}return R}function M(w,C,_,S,R){if(w.visible===!1)return;if(w.layers.test(C.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&R===gr)&&(!w.frustumCulled||w.intersectsFrustum(i))){w.modelViewMatrix.multiplyMatrices(_.matrixWorldInverse,w.matrixWorld);let B=t.update(w),I=w.material;if(Array.isArray(I)){let U=B.groups;for(let V=0,$=U.length;V<$;V++){let et=U[V],Z=I[et.materialIndex];if(Z&&Z.visible){let J=E(w,Z,S,R);w.onBeforeShadow(n,w,C,_,B,J,et),n.renderBufferDirect(_,null,B,J,w,et),w.onAfterShadow(n,w,C,_,B,J,et)}}}else if(I.visible){let U=E(w,I,S,R);w.onBeforeShadow(n,w,C,_,B,U,null),n.renderBufferDirect(_,null,B,U,w,null),w.onAfterShadow(n,w,C,_,B,U,null)}}let L=w.children;for(let B=0,I=L.length;B<I;B++)M(L[B],C,_,S,R)}function T(w){w.target.removeEventListener("dispose",T);for(let _ in c){let S=c[_],R=w.target.uuid;R in S&&(S[R].dispose(),delete S[R])}}}function Xb(n,t){function e(){let N=!1,ht=new ye,j=null,ut=new ye(0,0,0,0);return{setMask:function(gt){j!==gt&&!N&&(n.colorMask(gt,gt,gt,gt),j=gt)},setLocked:function(gt){N=gt},setClear:function(gt,it,Pt,Tt,he){he===!0&&(gt*=Tt,it*=Tt,Pt*=Tt),ht.set(gt,it,Pt,Tt),ut.equals(ht)===!1&&(n.clearColor(gt,it,Pt,Tt),ut.copy(ht))},reset:function(){N=!1,j=null,ut.set(-1,0,0,0)}}}function i(){let N=!1,ht=!1,j=null,ut=null,gt=null;return{setReversed:function(it){if(ht!==it){let Pt=t.get("EXT_clip_control");it?Pt.clipControlEXT(Pt.LOWER_LEFT_EXT,Pt.ZERO_TO_ONE_EXT):Pt.clipControlEXT(Pt.LOWER_LEFT_EXT,Pt.NEGATIVE_ONE_TO_ONE_EXT),ht=it;let Tt=gt;gt=null,this.setClear(Tt)}},getReversed:function(){return ht},setTest:function(it){it?K(n.DEPTH_TEST):xt(n.DEPTH_TEST)},setMask:function(it){j!==it&&!N&&(n.depthMask(it),j=it)},setFunc:function(it){if(ht&&(it=Im[it]),ut!==it){switch(it){case ul:n.depthFunc(n.NEVER);break;case dl:n.depthFunc(n.ALWAYS);break;case fl:n.depthFunc(n.LESS);break;case er:n.depthFunc(n.LEQUAL);break;case pl:n.depthFunc(n.EQUAL);break;case ml:n.depthFunc(n.GEQUAL);break;case gl:n.depthFunc(n.GREATER);break;case xl:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}ut=it}},setLocked:function(it){N=it},setClear:function(it){gt!==it&&(gt=it,ht&&(it=1-it),n.clearDepth(it))},reset:function(){N=!1,j=null,ut=null,gt=null,ht=!1}}}function s(){let N=!1,ht=null,j=null,ut=null,gt=null,it=null,Pt=null,Tt=null,he=null;return{setTest:function(ie){N||(ie?K(n.STENCIL_TEST):xt(n.STENCIL_TEST))},setMask:function(ie){ht!==ie&&!N&&(n.stencilMask(ie),ht=ie)},setFunc:function(ie,Li,Vi){(j!==ie||ut!==Li||gt!==Vi)&&(n.stencilFunc(ie,Li,Vi),j=ie,ut=Li,gt=Vi)},setOp:function(ie,Li,Vi){(it!==ie||Pt!==Li||Tt!==Vi)&&(n.stencilOp(ie,Li,Vi),it=ie,Pt=Li,Tt=Vi)},setLocked:function(ie){N=ie},setClear:function(ie){he!==ie&&(n.clearStencil(ie),he=ie)},reset:function(){N=!1,ht=null,j=null,ut=null,gt=null,it=null,Pt=null,Tt=null,he=null}}}let r=new e,o=new i,a=new s,l=new WeakMap,c=new WeakMap,h={},u={},d={},f=new WeakMap,x=[],g=null,p=!1,m=null,v=null,E=null,M=null,T=null,w=null,C=null,_=new At(0,0,0),S=0,R=!1,P=null,L=null,B=null,I=null,U=null,V=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS),$=!1,et=0,Z=n.getParameter(n.VERSION);Z.indexOf("WebGL")!==-1?(et=parseFloat(/^WebGL (\d)/.exec(Z)[1]),$=et>=1):Z.indexOf("OpenGL ES")!==-1&&(et=parseFloat(/^OpenGL ES (\d)/.exec(Z)[1]),$=et>=2);let J=null,tt={},ot=n.getParameter(n.SCISSOR_BOX),st=n.getParameter(n.VIEWPORT),Ut=new ye().fromArray(ot),It=new ye().fromArray(st);function Lt(N,ht,j,ut){let gt=new Uint8Array(4),it=n.createTexture();n.bindTexture(N,it),n.texParameteri(N,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(N,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let Pt=0;Pt<j;Pt++)N===n.TEXTURE_3D||N===n.TEXTURE_2D_ARRAY?n.texImage3D(ht,0,n.RGBA,1,1,ut,0,n.RGBA,n.UNSIGNED_BYTE,gt):n.texImage2D(ht+Pt,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,gt);return it}let X={};X[n.TEXTURE_2D]=Lt(n.TEXTURE_2D,n.TEXTURE_2D,1),X[n.TEXTURE_CUBE_MAP]=Lt(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),X[n.TEXTURE_2D_ARRAY]=Lt(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),X[n.TEXTURE_3D]=Lt(n.TEXTURE_3D,n.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),K(n.DEPTH_TEST),o.setFunc(er),$t(!1),xe(Hu),K(n.CULL_FACE),Kt(Ci);function K(N){h[N]!==!0&&(n.enable(N),h[N]=!0)}function xt(N){h[N]!==!1&&(n.disable(N),h[N]=!1)}function Ot(N,ht){return d[N]!==ht?(n.bindFramebuffer(N,ht),d[N]=ht,N===n.DRAW_FRAMEBUFFER&&(d[n.FRAMEBUFFER]=ht),N===n.FRAMEBUFFER&&(d[n.DRAW_FRAMEBUFFER]=ht),!0):!1}function _t(N,ht){let j=x,ut=!1;if(N){j=f.get(ht),j===void 0&&(j=[],f.set(ht,j));let gt=N.textures;if(j.length!==gt.length||j[0]!==n.COLOR_ATTACHMENT0){for(let it=0,Pt=gt.length;it<Pt;it++)j[it]=n.COLOR_ATTACHMENT0+it;j.length=gt.length,ut=!0}}else j[0]!==n.BACK&&(j[0]=n.BACK,ut=!0);ut&&n.drawBuffers(j)}function Vt(N){return g!==N?(n.useProgram(N),g=N,!0):!1}let Fe={[ps]:n.FUNC_ADD,[Qp]:n.FUNC_SUBTRACT,[tm]:n.FUNC_REVERSE_SUBTRACT};Fe[em]=n.MIN,Fe[im]=n.MAX;let Xt={[nm]:n.ZERO,[sm]:n.ONE,[rm]:n.SRC_COLOR,[Wu]:n.SRC_ALPHA,[um]:n.SRC_ALPHA_SATURATE,[cm]:n.DST_COLOR,[am]:n.DST_ALPHA,[om]:n.ONE_MINUS_SRC_COLOR,[Xu]:n.ONE_MINUS_SRC_ALPHA,[hm]:n.ONE_MINUS_DST_COLOR,[lm]:n.ONE_MINUS_DST_ALPHA,[dm]:n.CONSTANT_COLOR,[fm]:n.ONE_MINUS_CONSTANT_COLOR,[pm]:n.CONSTANT_ALPHA,[mm]:n.ONE_MINUS_CONSTANT_ALPHA};function Kt(N,ht,j,ut,gt,it,Pt,Tt,he,ie){if(N===Ci){p===!0&&(xt(n.BLEND),p=!1);return}if(p===!1&&(K(n.BLEND),p=!0),N!==Kp){if(N!==m||ie!==R){if((v!==ps||T!==ps)&&(n.blendEquation(n.FUNC_ADD),v=ps,T=ps),ie)switch(N){case Hn:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Mi:n.blendFunc(n.ONE,n.ONE);break;case Gu:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Vu:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:Dt("WebGLState: Invalid blending: ",N);break}else switch(N){case Hn:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Mi:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case Gu:Dt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Vu:Dt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Dt("WebGLState: Invalid blending: ",N);break}E=null,M=null,w=null,C=null,_.set(0,0,0),S=0,m=N,R=ie}return}gt=gt||ht,it=it||j,Pt=Pt||ut,(ht!==v||gt!==T)&&(n.blendEquationSeparate(Fe[ht],Fe[gt]),v=ht,T=gt),(j!==E||ut!==M||it!==w||Pt!==C)&&(n.blendFuncSeparate(Xt[j],Xt[ut],Xt[it],Xt[Pt]),E=j,M=ut,w=it,C=Pt),(Tt.equals(_)===!1||he!==S)&&(n.blendColor(Tt.r,Tt.g,Tt.b,he),_.copy(Tt),S=he),m=N,R=!1}function ce(N,ht){N.side===hi?xt(n.CULL_FACE):K(n.CULL_FACE);let j=N.side===oi;ht&&(j=!j),$t(j),N.blending===Hn&&N.transparent===!1?Kt(Ci):Kt(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),o.setFunc(N.depthFunc),o.setTest(N.depthTest),o.setMask(N.depthWrite),r.setMask(N.colorWrite);let ut=N.stencilWrite;a.setTest(ut),ut&&(a.setMask(N.stencilWriteMask),a.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),a.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),li(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?K(n.SAMPLE_ALPHA_TO_COVERAGE):xt(n.SAMPLE_ALPHA_TO_COVERAGE)}function $t(N){P!==N&&(N?n.frontFace(n.CW):n.frontFace(n.CCW),P=N)}function xe(N){N!==Yp?(K(n.CULL_FACE),N!==L&&(N===Hu?n.cullFace(n.BACK):N===jp?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):xt(n.CULL_FACE),L=N}function Ve(N){N!==B&&($&&n.lineWidth(N),B=N)}function li(N,ht,j){N?(K(n.POLYGON_OFFSET_FILL),(I!==ht||U!==j)&&(I=ht,U=j,o.getReversed()&&(ht=-ht),n.polygonOffset(ht,j))):xt(n.POLYGON_OFFSET_FILL)}function be(N){N?K(n.SCISSOR_TEST):xt(n.SCISSOR_TEST)}function Ie(N){N===void 0&&(N=n.TEXTURE0+V-1),J!==N&&(n.activeTexture(N),J=N)}function O(N,ht,j){j===void 0&&(J===null?j=n.TEXTURE0+V-1:j=J);let ut=tt[j];ut===void 0&&(ut={type:void 0,texture:void 0},tt[j]=ut),(ut.type!==N||ut.texture!==ht)&&(J!==j&&(n.activeTexture(j),J=j),n.bindTexture(N,ht||X[N]),ut.type=N,ut.texture=ht)}function Ke(){let N=tt[J];N!==void 0&&N.type!==void 0&&(n.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function se(){try{n.compressedTexImage2D(...arguments)}catch(N){Dt("WebGLState:",N)}}function A(){try{n.compressedTexImage3D(...arguments)}catch(N){Dt("WebGLState:",N)}}function y(){try{n.texSubImage2D(...arguments)}catch(N){Dt("WebGLState:",N)}}function F(){try{n.texSubImage3D(...arguments)}catch(N){Dt("WebGLState:",N)}}function G(){try{n.compressedTexSubImage2D(...arguments)}catch(N){Dt("WebGLState:",N)}}function q(){try{n.compressedTexSubImage3D(...arguments)}catch(N){Dt("WebGLState:",N)}}function rt(){try{n.texStorage2D(...arguments)}catch(N){Dt("WebGLState:",N)}}function at(){try{n.texStorage3D(...arguments)}catch(N){Dt("WebGLState:",N)}}function Y(){try{n.texImage2D(...arguments)}catch(N){Dt("WebGLState:",N)}}function Q(){try{n.texImage3D(...arguments)}catch(N){Dt("WebGLState:",N)}}function lt(N){return u[N]!==void 0?u[N]:n.getParameter(N)}function Ct(N,ht){u[N]!==ht&&(n.pixelStorei(N,ht),u[N]=ht)}function dt(N){Ut.equals(N)===!1&&(n.scissor(N.x,N.y,N.z,N.w),Ut.copy(N))}function ct(N){It.equals(N)===!1&&(n.viewport(N.x,N.y,N.z,N.w),It.copy(N))}function Rt(N,ht){let j=c.get(ht);j===void 0&&(j=new WeakMap,c.set(ht,j));let ut=j.get(N);ut===void 0&&(ut=n.getUniformBlockIndex(ht,N.name),j.set(N,ut))}function kt(N,ht){let ut=c.get(ht).get(N);l.get(ht)!==ut&&(n.uniformBlockBinding(ht,ut,N.__bindingPointIndex),l.set(ht,ut))}function zt(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),o.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),n.pixelStorei(n.PACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,n.BROWSER_DEFAULT_WEBGL),n.pixelStorei(n.PACK_ROW_LENGTH,0),n.pixelStorei(n.PACK_SKIP_PIXELS,0),n.pixelStorei(n.PACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_ROW_LENGTH,0),n.pixelStorei(n.UNPACK_IMAGE_HEIGHT,0),n.pixelStorei(n.UNPACK_SKIP_PIXELS,0),n.pixelStorei(n.UNPACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_SKIP_IMAGES,0),h={},u={},J=null,tt={},d={},f=new WeakMap,x=[],g=null,p=!1,m=null,v=null,E=null,M=null,T=null,w=null,C=null,_=new At(0,0,0),S=0,R=!1,P=null,L=null,B=null,I=null,U=null,Ut.set(0,0,n.canvas.width,n.canvas.height),It.set(0,0,n.canvas.width,n.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:K,disable:xt,bindFramebuffer:Ot,drawBuffers:_t,useProgram:Vt,setBlending:Kt,setMaterial:ce,setFlipSided:$t,setCullFace:xe,setLineWidth:Ve,setPolygonOffset:li,setScissorTest:be,activeTexture:Ie,bindTexture:O,unbindTexture:Ke,compressedTexImage2D:se,compressedTexImage3D:A,texImage2D:Y,texImage3D:Q,pixelStorei:Ct,getParameter:lt,updateUBOMapping:Rt,uniformBlockBinding:kt,texStorage2D:rt,texStorage3D:at,texSubImage2D:y,texSubImage3D:F,compressedTexSubImage2D:G,compressedTexSubImage3D:q,scissor:dt,viewport:ct,reset:zt}}function Zb(n,t,e,i,s,r,o){let a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Mt,h=new WeakMap,u=new Set,d,f=new WeakMap,x=!1;try{x=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(A,y){return x?new OffscreenCanvas(A,y):xo("canvas")}function p(A,y,F){let G=1,q=se(A);if((q.width>F||q.height>F)&&(G=F/Math.max(q.width,q.height)),G<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){let rt=Math.floor(G*q.width),at=Math.floor(G*q.height);d===void 0&&(d=g(rt,at));let Y=y?g(rt,at):d;return Y.width=rt,Y.height=at,Y.getContext("2d").drawImage(A,0,0,rt,at),Nt("WebGLRenderer: Texture has been resized from ("+q.width+"x"+q.height+") to ("+rt+"x"+at+")."),Y}else return"data"in A&&Nt("WebGLRenderer: Image in DataTexture is too big ("+q.width+"x"+q.height+")."),A;return A}function m(A){return A.generateMipmaps}function v(A){n.generateMipmap(A)}function E(A){return A.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?n.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function M(A,y,F,G,q,rt=!1){if(A!==null){if(n[A]!==void 0)return n[A];Nt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let at;G&&(at=t.get("EXT_texture_norm16"),at||Nt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let Y=y;if(y===n.RED&&(F===n.FLOAT&&(Y=n.R32F),F===n.HALF_FLOAT&&(Y=n.R16F),F===n.UNSIGNED_BYTE&&(Y=n.R8),F===n.UNSIGNED_SHORT&&at&&(Y=at.R16_EXT),F===n.SHORT&&at&&(Y=at.R16_SNORM_EXT)),y===n.RED_INTEGER&&(F===n.UNSIGNED_BYTE&&(Y=n.R8UI),F===n.UNSIGNED_SHORT&&(Y=n.R16UI),F===n.UNSIGNED_INT&&(Y=n.R32UI),F===n.BYTE&&(Y=n.R8I),F===n.SHORT&&(Y=n.R16I),F===n.INT&&(Y=n.R32I)),y===n.RG&&(F===n.FLOAT&&(Y=n.RG32F),F===n.HALF_FLOAT&&(Y=n.RG16F),F===n.UNSIGNED_BYTE&&(Y=n.RG8),F===n.UNSIGNED_SHORT&&at&&(Y=at.RG16_EXT),F===n.SHORT&&at&&(Y=at.RG16_SNORM_EXT)),y===n.RG_INTEGER&&(F===n.UNSIGNED_BYTE&&(Y=n.RG8UI),F===n.UNSIGNED_SHORT&&(Y=n.RG16UI),F===n.UNSIGNED_INT&&(Y=n.RG32UI),F===n.BYTE&&(Y=n.RG8I),F===n.SHORT&&(Y=n.RG16I),F===n.INT&&(Y=n.RG32I)),y===n.RGB_INTEGER&&(F===n.UNSIGNED_BYTE&&(Y=n.RGB8UI),F===n.UNSIGNED_SHORT&&(Y=n.RGB16UI),F===n.UNSIGNED_INT&&(Y=n.RGB32UI),F===n.BYTE&&(Y=n.RGB8I),F===n.SHORT&&(Y=n.RGB16I),F===n.INT&&(Y=n.RGB32I)),y===n.RGBA_INTEGER&&(F===n.UNSIGNED_BYTE&&(Y=n.RGBA8UI),F===n.UNSIGNED_SHORT&&(Y=n.RGBA16UI),F===n.UNSIGNED_INT&&(Y=n.RGBA32UI),F===n.BYTE&&(Y=n.RGBA8I),F===n.SHORT&&(Y=n.RGBA16I),F===n.INT&&(Y=n.RGBA32I)),y===n.RGB&&(F===n.UNSIGNED_SHORT&&at&&(Y=at.RGB16_EXT),F===n.SHORT&&at&&(Y=at.RGB16_SNORM_EXT),F===n.UNSIGNED_INT_5_9_9_9_REV&&(Y=n.RGB9_E5),F===n.UNSIGNED_INT_10F_11F_11F_REV&&(Y=n.R11F_G11F_B10F)),y===n.RGBA){let Q=rt?go:Wt.getTransfer(q);F===n.FLOAT&&(Y=n.RGBA32F),F===n.HALF_FLOAT&&(Y=n.RGBA16F),F===n.UNSIGNED_BYTE&&(Y=Q===Qt?n.SRGB8_ALPHA8:n.RGBA8),F===n.UNSIGNED_SHORT&&at&&(Y=at.RGBA16_EXT),F===n.SHORT&&at&&(Y=at.RGBA16_SNORM_EXT),F===n.UNSIGNED_SHORT_4_4_4_4&&(Y=n.RGBA4),F===n.UNSIGNED_SHORT_5_5_5_1&&(Y=n.RGB5_A1)}return(Y===n.R16F||Y===n.R32F||Y===n.RG16F||Y===n.RG32F||Y===n.RGBA16F||Y===n.RGBA32F)&&t.get("EXT_color_buffer_float"),Y}function T(A,y){let F;return A?y===null||y===zi||y===_r?F=n.DEPTH24_STENCIL8:y===Hi?F=n.DEPTH32F_STENCIL8:y===yr&&(F=n.DEPTH24_STENCIL8,Nt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):y===null||y===zi||y===_r?F=n.DEPTH_COMPONENT24:y===Hi?F=n.DEPTH_COMPONENT32F:y===yr&&(F=n.DEPTH_COMPONENT16),F}function w(A,y){return m(A)===!0||A.isFramebufferTexture&&A.minFilter!==Ze&&A.minFilter!==Ne?Math.log2(Math.max(y.width,y.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?y.mipmaps.length:1}function C(A){let y=A.target;y.removeEventListener("dispose",C),S(y),y.isVideoTexture&&h.delete(y),y.isHTMLTexture&&u.delete(y)}function _(A){let y=A.target;y.removeEventListener("dispose",_),P(y)}function S(A){let y=i.get(A);if(y.__webglInit===void 0)return;let F=A.source,G=f.get(F);if(G){let q=G[y.__cacheKey];q.usedTimes--,q.usedTimes===0&&R(A),Object.keys(G).length===0&&f.delete(F)}i.remove(A)}function R(A){let y=i.get(A);n.deleteTexture(y.__webglTexture);let F=A.source,G=f.get(F);delete G[y.__cacheKey],o.memory.textures--}function P(A){let y=i.get(A);if(A.depthTexture&&(A.depthTexture.dispose(),i.remove(A.depthTexture)),A.isWebGLCubeRenderTarget)for(let G=0;G<6;G++){if(Array.isArray(y.__webglFramebuffer[G]))for(let q=0;q<y.__webglFramebuffer[G].length;q++)n.deleteFramebuffer(y.__webglFramebuffer[G][q]);else n.deleteFramebuffer(y.__webglFramebuffer[G]);y.__webglDepthbuffer&&n.deleteRenderbuffer(y.__webglDepthbuffer[G])}else{if(Array.isArray(y.__webglFramebuffer))for(let G=0;G<y.__webglFramebuffer.length;G++)n.deleteFramebuffer(y.__webglFramebuffer[G]);else n.deleteFramebuffer(y.__webglFramebuffer);if(y.__webglDepthbuffer&&n.deleteRenderbuffer(y.__webglDepthbuffer),y.__webglMultisampledFramebuffer&&n.deleteFramebuffer(y.__webglMultisampledFramebuffer),y.__webglColorRenderbuffer)for(let G=0;G<y.__webglColorRenderbuffer.length;G++)y.__webglColorRenderbuffer[G]&&n.deleteRenderbuffer(y.__webglColorRenderbuffer[G]);y.__webglDepthRenderbuffer&&n.deleteRenderbuffer(y.__webglDepthRenderbuffer)}let F=A.textures;for(let G=0,q=F.length;G<q;G++){let rt=i.get(F[G]);rt.__webglTexture&&(n.deleteTexture(rt.__webglTexture),o.memory.textures--),i.remove(F[G])}i.remove(A)}let L=0;function B(){L=0}function I(){return L}function U(A){L=A}function V(){let A=L;return A>=s.maxTextures&&Nt("WebGLTextures: Trying to use "+(A+1)+" texture units while this GPU supports only "+s.maxTextures),L+=1,A}function $(A){let y=[];return y.push(A.wrapS),y.push(A.wrapT),y.push(A.wrapR||0),y.push(A.magFilter),y.push(A.minFilter),y.push(A.anisotropy),y.push(A.internalFormat),y.push(A.format),y.push(A.type),y.push(A.generateMipmaps),y.push(A.premultiplyAlpha),y.push(A.flipY),y.push(A.unpackAlignment),y.push(A.colorSpace),y.join()}function et(A,y){let F=i.get(A);if(A.isVideoTexture&&O(A),A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&F.__version!==A.version){let G=A.image;if(G===null)Nt("WebGLRenderer: Texture marked for update but no image data found.");else if(G.complete===!1)Nt("WebGLRenderer: Texture marked for update but image is incomplete");else{xt(F,A,y);return}}else A.isExternalTexture&&(F.__webglTexture=A.sourceTexture?A.sourceTexture:null);e.bindTexture(n.TEXTURE_2D,F.__webglTexture,n.TEXTURE0+y)}function Z(A,y){let F=i.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&F.__version!==A.version){xt(F,A,y);return}else A.isExternalTexture&&(F.__webglTexture=A.sourceTexture?A.sourceTexture:null);e.bindTexture(n.TEXTURE_2D_ARRAY,F.__webglTexture,n.TEXTURE0+y)}function J(A,y){let F=i.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&F.__version!==A.version){xt(F,A,y);return}e.bindTexture(n.TEXTURE_3D,F.__webglTexture,n.TEXTURE0+y)}function tt(A,y){let F=i.get(A);if(A.isCubeDepthTexture!==!0&&A.version>0&&F.__version!==A.version){Ot(F,A,y);return}e.bindTexture(n.TEXTURE_CUBE_MAP,F.__webglTexture,n.TEXTURE0+y)}let ot={[yl]:n.REPEAT,[qi]:n.CLAMP_TO_EDGE,[_l]:n.MIRRORED_REPEAT},st={[Ze]:n.NEAREST,[ym]:n.NEAREST_MIPMAP_NEAREST,[Zo]:n.NEAREST_MIPMAP_LINEAR,[Ne]:n.LINEAR,[Gl]:n.LINEAR_MIPMAP_NEAREST,[tn]:n.LINEAR_MIPMAP_LINEAR},Ut={[bm]:n.NEVER,[Am]:n.ALWAYS,[Sm]:n.LESS,[Ec]:n.LEQUAL,[wm]:n.EQUAL,[Ac]:n.GEQUAL,[Tm]:n.GREATER,[Em]:n.NOTEQUAL};function It(A,y){if(y.type===Hi&&t.has("OES_texture_float_linear")===!1&&(y.magFilter===Ne||y.magFilter===Gl||y.magFilter===Zo||y.magFilter===tn||y.minFilter===Ne||y.minFilter===Gl||y.minFilter===Zo||y.minFilter===tn)&&Nt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(A,n.TEXTURE_WRAP_S,ot[y.wrapS]),n.texParameteri(A,n.TEXTURE_WRAP_T,ot[y.wrapT]),(A===n.TEXTURE_3D||A===n.TEXTURE_2D_ARRAY)&&n.texParameteri(A,n.TEXTURE_WRAP_R,ot[y.wrapR]),n.texParameteri(A,n.TEXTURE_MAG_FILTER,st[y.magFilter]),n.texParameteri(A,n.TEXTURE_MIN_FILTER,st[y.minFilter]),y.compareFunction&&(n.texParameteri(A,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(A,n.TEXTURE_COMPARE_FUNC,Ut[y.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(y.magFilter===Ze||y.minFilter!==Zo&&y.minFilter!==tn||y.type===Hi&&t.has("OES_texture_float_linear")===!1)return;if(y.anisotropy>1||i.get(y).__currentAnisotropy){let F=t.get("EXT_texture_filter_anisotropic");n.texParameterf(A,F.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(y.anisotropy,s.getMaxAnisotropy())),i.get(y).__currentAnisotropy=y.anisotropy}}}function Lt(A,y){let F=!1;A.__webglInit===void 0&&(A.__webglInit=!0,y.addEventListener("dispose",C));let G=y.source,q=f.get(G);q===void 0&&(q={},f.set(G,q));let rt=$(y);if(rt!==A.__cacheKey){q[rt]===void 0&&(q[rt]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,F=!0),q[rt].usedTimes++;let at=q[A.__cacheKey];at!==void 0&&(q[A.__cacheKey].usedTimes--,at.usedTimes===0&&R(y)),A.__cacheKey=rt,A.__webglTexture=q[rt].texture}return F}function X(A,y,F){return Math.floor(Math.floor(A/F)/y)}function K(A,y,F,G){let rt=A.updateRanges;if(rt.length===0)e.texSubImage2D(n.TEXTURE_2D,0,0,0,y.width,y.height,F,G,y.data);else{rt.sort((Ct,dt)=>Ct.start-dt.start);let at=0;for(let Ct=1;Ct<rt.length;Ct++){let dt=rt[at],ct=rt[Ct],Rt=dt.start+dt.count,kt=X(ct.start,y.width,4),zt=X(dt.start,y.width,4);ct.start<=Rt+1&&kt===zt&&X(ct.start+ct.count-1,y.width,4)===kt?dt.count=Math.max(dt.count,ct.start+ct.count-dt.start):(++at,rt[at]=ct)}rt.length=at+1;let Y=e.getParameter(n.UNPACK_ROW_LENGTH),Q=e.getParameter(n.UNPACK_SKIP_PIXELS),lt=e.getParameter(n.UNPACK_SKIP_ROWS);e.pixelStorei(n.UNPACK_ROW_LENGTH,y.width);for(let Ct=0,dt=rt.length;Ct<dt;Ct++){let ct=rt[Ct],Rt=Math.floor(ct.start/4),kt=Math.ceil(ct.count/4),zt=Rt%y.width,N=Math.floor(Rt/y.width),ht=kt,j=1;e.pixelStorei(n.UNPACK_SKIP_PIXELS,zt),e.pixelStorei(n.UNPACK_SKIP_ROWS,N),e.texSubImage2D(n.TEXTURE_2D,0,zt,N,ht,j,F,G,y.data)}A.clearUpdateRanges(),e.pixelStorei(n.UNPACK_ROW_LENGTH,Y),e.pixelStorei(n.UNPACK_SKIP_PIXELS,Q),e.pixelStorei(n.UNPACK_SKIP_ROWS,lt)}}function xt(A,y,F){let G=n.TEXTURE_2D;(y.isDataArrayTexture||y.isCompressedArrayTexture)&&(G=n.TEXTURE_2D_ARRAY),y.isData3DTexture&&(G=n.TEXTURE_3D);let q=Lt(A,y),rt=y.source;e.bindTexture(G,A.__webglTexture,n.TEXTURE0+F);let at=i.get(rt);if(rt.version!==at.__version||q===!0){if(e.activeTexture(n.TEXTURE0+F),(typeof ImageBitmap<"u"&&y.image instanceof ImageBitmap)===!1){let j=Wt.getPrimaries(Wt.workingColorSpace),ut=y.colorSpace===gn?null:Wt.getPrimaries(y.colorSpace),gt=y.colorSpace===gn||j===ut?n.NONE:n.BROWSER_DEFAULT_WEBGL;e.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,y.flipY),e.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),e.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,gt)}e.pixelStorei(n.UNPACK_ALIGNMENT,y.unpackAlignment);let Q=p(y.image,!1,s.maxTextureSize);Q=Ke(y,Q);let lt=r.convert(y.format,y.colorSpace),Ct=r.convert(y.type),dt=M(y.internalFormat,lt,Ct,y.normalized,y.colorSpace,y.isVideoTexture);It(G,y);let ct,Rt=y.mipmaps,kt=y.isVideoTexture!==!0,zt=at.__version===void 0||q===!0,N=rt.dataReady,ht=w(y,Q);if(y.isDepthTexture)dt=T(y.format===Vn,y.type),zt&&(kt?e.texStorage2D(n.TEXTURE_2D,1,dt,Q.width,Q.height):e.texImage2D(n.TEXTURE_2D,0,dt,Q.width,Q.height,0,lt,Ct,null));else if(y.isDataTexture)if(Rt.length>0){kt&&zt&&e.texStorage2D(n.TEXTURE_2D,ht,dt,Rt[0].width,Rt[0].height);for(let j=0,ut=Rt.length;j<ut;j++)ct=Rt[j],kt?N&&e.texSubImage2D(n.TEXTURE_2D,j,0,0,ct.width,ct.height,lt,Ct,ct.data):e.texImage2D(n.TEXTURE_2D,j,dt,ct.width,ct.height,0,lt,Ct,ct.data);y.generateMipmaps=!1}else kt?(zt&&e.texStorage2D(n.TEXTURE_2D,ht,dt,Q.width,Q.height),N&&K(y,Q,lt,Ct)):e.texImage2D(n.TEXTURE_2D,0,dt,Q.width,Q.height,0,lt,Ct,Q.data);else if(y.isCompressedTexture)if(y.isCompressedArrayTexture){kt&&zt&&e.texStorage3D(n.TEXTURE_2D_ARRAY,ht,dt,Rt[0].width,Rt[0].height,Q.depth);for(let j=0,ut=Rt.length;j<ut;j++)if(ct=Rt[j],y.format!==fi)if(lt!==null)if(kt){if(N)if(y.layerUpdates.size>0){let gt=od(ct.width,ct.height,y.format,y.type);for(let it of y.layerUpdates){let Pt=ct.data.subarray(it*gt/ct.data.BYTES_PER_ELEMENT,(it+1)*gt/ct.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,j,0,0,it,ct.width,ct.height,1,lt,Pt)}}else e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,j,0,0,0,ct.width,ct.height,Q.depth,lt,ct.data)}else e.compressedTexImage3D(n.TEXTURE_2D_ARRAY,j,dt,ct.width,ct.height,Q.depth,0,ct.data,0,0);else Nt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else kt?N&&e.texSubImage3D(n.TEXTURE_2D_ARRAY,j,0,0,0,ct.width,ct.height,Q.depth,lt,Ct,ct.data):e.texImage3D(n.TEXTURE_2D_ARRAY,j,dt,ct.width,ct.height,Q.depth,0,lt,Ct,ct.data);y.layerUpdates.size>0&&y.clearLayerUpdates()}else{kt&&zt&&e.texStorage2D(n.TEXTURE_2D,ht,dt,Rt[0].width,Rt[0].height);for(let j=0,ut=Rt.length;j<ut;j++)ct=Rt[j],y.format!==fi?lt!==null?kt?N&&e.compressedTexSubImage2D(n.TEXTURE_2D,j,0,0,ct.width,ct.height,lt,ct.data):e.compressedTexImage2D(n.TEXTURE_2D,j,dt,ct.width,ct.height,0,ct.data):Nt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):kt?N&&e.texSubImage2D(n.TEXTURE_2D,j,0,0,ct.width,ct.height,lt,Ct,ct.data):e.texImage2D(n.TEXTURE_2D,j,dt,ct.width,ct.height,0,lt,Ct,ct.data)}else if(y.isDataArrayTexture)if(kt){if(zt&&e.texStorage3D(n.TEXTURE_2D_ARRAY,ht,dt,Q.width,Q.height,Q.depth),N)if(y.layerUpdates.size>0){let j=od(Q.width,Q.height,y.format,y.type);for(let ut of y.layerUpdates){let gt=Q.data.subarray(ut*j/Q.data.BYTES_PER_ELEMENT,(ut+1)*j/Q.data.BYTES_PER_ELEMENT);e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,ut,Q.width,Q.height,1,lt,Ct,gt)}y.clearLayerUpdates()}else e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,Q.width,Q.height,Q.depth,lt,Ct,Q.data)}else e.texImage3D(n.TEXTURE_2D_ARRAY,0,dt,Q.width,Q.height,Q.depth,0,lt,Ct,Q.data);else if(y.isData3DTexture)kt?(zt&&e.texStorage3D(n.TEXTURE_3D,ht,dt,Q.width,Q.height,Q.depth),N&&e.texSubImage3D(n.TEXTURE_3D,0,0,0,0,Q.width,Q.height,Q.depth,lt,Ct,Q.data)):e.texImage3D(n.TEXTURE_3D,0,dt,Q.width,Q.height,Q.depth,0,lt,Ct,Q.data);else if(y.isFramebufferTexture){if(zt)if(kt)e.texStorage2D(n.TEXTURE_2D,ht,dt,Q.width,Q.height);else{let j=Q.width,ut=Q.height;for(let gt=0;gt<ht;gt++)e.texImage2D(n.TEXTURE_2D,gt,dt,j,ut,0,lt,Ct,null),j>>=1,ut>>=1}}else if(y.isHTMLTexture){if("texElementImage2D"in n){let j=n.canvas;if(j.hasAttribute("layoutsubtree")||j.setAttribute("layoutsubtree","true"),Q.parentNode!==j){j.appendChild(Q),u.add(y),j.onpaint=ut=>{let gt=ut.changedElements;for(let it of u)gt.includes(it.image)&&(it.needsUpdate=!0)},j.requestPaint();return}if(n.texElementImage2D.length===3)n.texElementImage2D(n.TEXTURE_2D,n.RGBA8,Q);else{let gt=n.RGBA,it=n.RGBA,Pt=n.UNSIGNED_BYTE;n.texElementImage2D(n.TEXTURE_2D,0,gt,it,Pt,Q)}n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)}}else if(Rt.length>0){if(kt&&zt){let j=se(Rt[0]);e.texStorage2D(n.TEXTURE_2D,ht,dt,j.width,j.height)}for(let j=0,ut=Rt.length;j<ut;j++)ct=Rt[j],kt?N&&e.texSubImage2D(n.TEXTURE_2D,j,0,0,lt,Ct,ct):e.texImage2D(n.TEXTURE_2D,j,dt,lt,Ct,ct);y.generateMipmaps=!1}else if(kt){if(zt){let j=se(Q);e.texStorage2D(n.TEXTURE_2D,ht,dt,j.width,j.height)}N&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,lt,Ct,Q)}else e.texImage2D(n.TEXTURE_2D,0,dt,lt,Ct,Q);m(y)&&v(G),at.__version=rt.version,y.onUpdate&&y.onUpdate(y)}A.__version=y.version}function Ot(A,y,F){if(y.image.length!==6)return;let G=Lt(A,y),q=y.source;e.bindTexture(n.TEXTURE_CUBE_MAP,A.__webglTexture,n.TEXTURE0+F);let rt=i.get(q);if(q.version!==rt.__version||G===!0){e.activeTexture(n.TEXTURE0+F);let at=Wt.getPrimaries(Wt.workingColorSpace),Y=y.colorSpace===gn?null:Wt.getPrimaries(y.colorSpace),Q=y.colorSpace===gn||at===Y?n.NONE:n.BROWSER_DEFAULT_WEBGL;e.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,y.flipY),e.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),e.pixelStorei(n.UNPACK_ALIGNMENT,y.unpackAlignment),e.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Q);let lt=y.isCompressedTexture||y.image[0].isCompressedTexture,Ct=y.image[0]&&y.image[0].isDataTexture,dt=[];for(let it=0;it<6;it++)!lt&&!Ct?dt[it]=p(y.image[it],!0,s.maxCubemapSize):dt[it]=Ct?y.image[it].image:y.image[it],dt[it]=Ke(y,dt[it]);let ct=dt[0],Rt=r.convert(y.format,y.colorSpace),kt=r.convert(y.type),zt=M(y.internalFormat,Rt,kt,y.normalized,y.colorSpace),N=y.isVideoTexture!==!0,ht=rt.__version===void 0||G===!0,j=q.dataReady,ut=w(y,ct);It(n.TEXTURE_CUBE_MAP,y);let gt;if(lt){N&&ht&&e.texStorage2D(n.TEXTURE_CUBE_MAP,ut,zt,ct.width,ct.height);for(let it=0;it<6;it++){gt=dt[it].mipmaps;for(let Pt=0;Pt<gt.length;Pt++){let Tt=gt[Pt];y.format!==fi?Rt!==null?N?j&&e.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+it,Pt,0,0,Tt.width,Tt.height,Rt,Tt.data):e.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+it,Pt,zt,Tt.width,Tt.height,0,Tt.data):Nt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):N?j&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+it,Pt,0,0,Tt.width,Tt.height,Rt,kt,Tt.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+it,Pt,zt,Tt.width,Tt.height,0,Rt,kt,Tt.data)}}}else{if(gt=y.mipmaps,N&&ht){gt.length>0&&ut++;let it=se(dt[0]);e.texStorage2D(n.TEXTURE_CUBE_MAP,ut,zt,it.width,it.height)}for(let it=0;it<6;it++)if(Ct){N?j&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,0,0,dt[it].width,dt[it].height,Rt,kt,dt[it].data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,zt,dt[it].width,dt[it].height,0,Rt,kt,dt[it].data);for(let Pt=0;Pt<gt.length;Pt++){let he=gt[Pt].image[it].image;N?j&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+it,Pt+1,0,0,he.width,he.height,Rt,kt,he.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+it,Pt+1,zt,he.width,he.height,0,Rt,kt,he.data)}}else{N?j&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,0,0,Rt,kt,dt[it]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,zt,Rt,kt,dt[it]);for(let Pt=0;Pt<gt.length;Pt++){let Tt=gt[Pt];N?j&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+it,Pt+1,0,0,Rt,kt,Tt.image[it]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+it,Pt+1,zt,Rt,kt,Tt.image[it])}}}m(y)&&v(n.TEXTURE_CUBE_MAP),rt.__version=q.version,y.onUpdate&&y.onUpdate(y)}A.__version=y.version}function _t(A,y,F,G,q,rt){let at=r.convert(F.format,F.colorSpace),Y=r.convert(F.type),Q=M(F.internalFormat,at,Y,F.normalized,F.colorSpace),lt=i.get(y),Ct=i.get(F);if(Ct.__renderTarget=y,!lt.__hasExternalTextures){let dt=Math.max(1,y.width>>rt),ct=Math.max(1,y.height>>rt);q===n.TEXTURE_3D||q===n.TEXTURE_2D_ARRAY?e.texImage3D(q,rt,Q,dt,ct,y.depth,0,at,Y,null):e.texImage2D(q,rt,Q,dt,ct,0,at,Y,null)}e.bindFramebuffer(n.FRAMEBUFFER,A),Ie(y)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,G,q,Ct.__webglTexture,0,be(y)):(q===n.TEXTURE_2D||q>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&q<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,G,q,Ct.__webglTexture,rt),e.bindFramebuffer(n.FRAMEBUFFER,null)}function Vt(A,y,F){if(n.bindRenderbuffer(n.RENDERBUFFER,A),y.depthBuffer){let G=y.depthTexture,q=G&&G.isDepthTexture?G.type:null,rt=T(y.stencilBuffer,q),at=y.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;Ie(y)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,be(y),rt,y.width,y.height):F?n.renderbufferStorageMultisample(n.RENDERBUFFER,be(y),rt,y.width,y.height):n.renderbufferStorage(n.RENDERBUFFER,rt,y.width,y.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,at,n.RENDERBUFFER,A)}else{let G=y.textures;for(let q=0;q<G.length;q++){let rt=G[q],at=r.convert(rt.format,rt.colorSpace),Y=r.convert(rt.type),Q=M(rt.internalFormat,at,Y,rt.normalized,rt.colorSpace);Ie(y)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,be(y),Q,y.width,y.height):F?n.renderbufferStorageMultisample(n.RENDERBUFFER,be(y),Q,y.width,y.height):n.renderbufferStorage(n.RENDERBUFFER,Q,y.width,y.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Fe(A,y,F){let G=y.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(n.FRAMEBUFFER,A),!(y.depthTexture&&y.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let q=i.get(y.depthTexture);if(q.__renderTarget=y,(!q.__webglTexture||y.depthTexture.image.width!==y.width||y.depthTexture.image.height!==y.height)&&(y.depthTexture.image.width=y.width,y.depthTexture.image.height=y.height,y.depthTexture.needsUpdate=!0),G){if(q.__webglInit===void 0&&(q.__webglInit=!0,y.depthTexture.addEventListener("dispose",C)),q.__webglTexture===void 0){q.__webglTexture=n.createTexture(),e.bindTexture(n.TEXTURE_CUBE_MAP,q.__webglTexture),It(n.TEXTURE_CUBE_MAP,y.depthTexture);let lt=r.convert(y.depthTexture.format),Ct=r.convert(y.depthTexture.type),dt;y.depthTexture.format===Yi?dt=n.DEPTH_COMPONENT24:y.depthTexture.format===Vn&&(dt=n.DEPTH24_STENCIL8);for(let ct=0;ct<6;ct++)n.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ct,0,dt,y.width,y.height,0,lt,Ct,null)}}else et(y.depthTexture,0);let rt=q.__webglTexture,at=be(y),Y=G?n.TEXTURE_CUBE_MAP_POSITIVE_X+F:n.TEXTURE_2D,Q=y.depthTexture.format===Vn?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;if(y.depthTexture.format===Yi)Ie(y)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,Q,Y,rt,0,at):n.framebufferTexture2D(n.FRAMEBUFFER,Q,Y,rt,0);else if(y.depthTexture.format===Vn)Ie(y)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,Q,Y,rt,0,at):n.framebufferTexture2D(n.FRAMEBUFFER,Q,Y,rt,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Xt(A){let y=i.get(A),F=A.isWebGLCubeRenderTarget===!0;if(y.__boundDepthTexture!==A.depthTexture){let G=A.depthTexture;if(y.__depthDisposeCallback&&y.__depthDisposeCallback(),G){let q=()=>{delete y.__boundDepthTexture,delete y.__depthDisposeCallback,G.removeEventListener("dispose",q)};G.addEventListener("dispose",q),y.__depthDisposeCallback=q}y.__boundDepthTexture=G}if(A.depthTexture&&!y.__autoAllocateDepthBuffer)if(F)for(let G=0;G<6;G++)Fe(y.__webglFramebuffer[G],A,G);else{let G=A.texture.mipmaps;G&&G.length>0?Fe(y.__webglFramebuffer[0],A,0):Fe(y.__webglFramebuffer,A,0)}else if(F){y.__webglDepthbuffer=[];for(let G=0;G<6;G++)if(e.bindFramebuffer(n.FRAMEBUFFER,y.__webglFramebuffer[G]),y.__webglDepthbuffer[G]===void 0)y.__webglDepthbuffer[G]=n.createRenderbuffer(),Vt(y.__webglDepthbuffer[G],A,!1);else{let q=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,rt=y.__webglDepthbuffer[G];n.bindRenderbuffer(n.RENDERBUFFER,rt),n.framebufferRenderbuffer(n.FRAMEBUFFER,q,n.RENDERBUFFER,rt)}}else{let G=A.texture.mipmaps;if(G&&G.length>0?e.bindFramebuffer(n.FRAMEBUFFER,y.__webglFramebuffer[0]):e.bindFramebuffer(n.FRAMEBUFFER,y.__webglFramebuffer),y.__webglDepthbuffer===void 0)y.__webglDepthbuffer=n.createRenderbuffer(),Vt(y.__webglDepthbuffer,A,!1);else{let q=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,rt=y.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,rt),n.framebufferRenderbuffer(n.FRAMEBUFFER,q,n.RENDERBUFFER,rt)}}e.bindFramebuffer(n.FRAMEBUFFER,null)}function Kt(A,y,F){let G=i.get(A);y!==void 0&&_t(G.__webglFramebuffer,A,A.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),F!==void 0&&Xt(A)}function ce(A){let y=A.texture,F=i.get(A),G=i.get(y);A.addEventListener("dispose",_);let q=A.textures,rt=A.isWebGLCubeRenderTarget===!0,at=q.length>1;if(at||(G.__webglTexture===void 0&&(G.__webglTexture=n.createTexture()),G.__version=y.version,o.memory.textures++),rt){F.__webglFramebuffer=[];for(let Y=0;Y<6;Y++)if(y.mipmaps&&y.mipmaps.length>0){F.__webglFramebuffer[Y]=[];for(let Q=0;Q<y.mipmaps.length;Q++)F.__webglFramebuffer[Y][Q]=n.createFramebuffer()}else F.__webglFramebuffer[Y]=n.createFramebuffer()}else{if(y.mipmaps&&y.mipmaps.length>0){F.__webglFramebuffer=[];for(let Y=0;Y<y.mipmaps.length;Y++)F.__webglFramebuffer[Y]=n.createFramebuffer()}else F.__webglFramebuffer=n.createFramebuffer();if(at)for(let Y=0,Q=q.length;Y<Q;Y++){let lt=i.get(q[Y]);lt.__webglTexture===void 0&&(lt.__webglTexture=n.createTexture(),o.memory.textures++)}if(A.samples>0&&Ie(A)===!1){F.__webglMultisampledFramebuffer=n.createFramebuffer(),F.__webglColorRenderbuffer=[],e.bindFramebuffer(n.FRAMEBUFFER,F.__webglMultisampledFramebuffer);for(let Y=0;Y<q.length;Y++){let Q=q[Y];F.__webglColorRenderbuffer[Y]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,F.__webglColorRenderbuffer[Y]);let lt=r.convert(Q.format,Q.colorSpace),Ct=r.convert(Q.type),dt=M(Q.internalFormat,lt,Ct,Q.normalized,Q.colorSpace,A.isXRRenderTarget===!0),ct=be(A);n.renderbufferStorageMultisample(n.RENDERBUFFER,ct,dt,A.width,A.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Y,n.RENDERBUFFER,F.__webglColorRenderbuffer[Y])}n.bindRenderbuffer(n.RENDERBUFFER,null),A.depthBuffer&&(F.__webglDepthRenderbuffer=n.createRenderbuffer(),Vt(F.__webglDepthRenderbuffer,A,!0)),e.bindFramebuffer(n.FRAMEBUFFER,null)}}if(rt){e.bindTexture(n.TEXTURE_CUBE_MAP,G.__webglTexture),It(n.TEXTURE_CUBE_MAP,y);for(let Y=0;Y<6;Y++)if(y.mipmaps&&y.mipmaps.length>0)for(let Q=0;Q<y.mipmaps.length;Q++)_t(F.__webglFramebuffer[Y][Q],A,y,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,Q);else _t(F.__webglFramebuffer[Y],A,y,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0);m(y)&&v(n.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(at){for(let Y=0,Q=q.length;Y<Q;Y++){let lt=q[Y],Ct=i.get(lt),dt=n.TEXTURE_2D;(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(dt=A.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),e.bindTexture(dt,Ct.__webglTexture),It(dt,lt),_t(F.__webglFramebuffer,A,lt,n.COLOR_ATTACHMENT0+Y,dt,0),m(lt)&&v(dt)}e.unbindTexture()}else{let Y=n.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(Y=A.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),e.bindTexture(Y,G.__webglTexture),It(Y,y),y.mipmaps&&y.mipmaps.length>0)for(let Q=0;Q<y.mipmaps.length;Q++)_t(F.__webglFramebuffer[Q],A,y,n.COLOR_ATTACHMENT0,Y,Q);else _t(F.__webglFramebuffer,A,y,n.COLOR_ATTACHMENT0,Y,0);m(y)&&v(Y),e.unbindTexture()}A.depthBuffer&&Xt(A)}function $t(A){let y=A.textures;for(let F=0,G=y.length;F<G;F++){let q=y[F];if(m(q)){let rt=E(A),at=i.get(q).__webglTexture;e.bindTexture(rt,at),v(rt),e.unbindTexture()}}}let xe=[],Ve=[];function li(A){if(A.samples>0){if(Ie(A)===!1){let y=A.textures,F=A.width,G=A.height,q=n.COLOR_BUFFER_BIT,rt=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,at=i.get(A),Y=y.length>1;if(Y)for(let lt=0;lt<y.length;lt++)e.bindFramebuffer(n.FRAMEBUFFER,at.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+lt,n.RENDERBUFFER,null),e.bindFramebuffer(n.FRAMEBUFFER,at.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+lt,n.TEXTURE_2D,null,0);e.bindFramebuffer(n.READ_FRAMEBUFFER,at.__webglMultisampledFramebuffer);let Q=A.texture.mipmaps;Q&&Q.length>0?e.bindFramebuffer(n.DRAW_FRAMEBUFFER,at.__webglFramebuffer[0]):e.bindFramebuffer(n.DRAW_FRAMEBUFFER,at.__webglFramebuffer);for(let lt=0;lt<y.length;lt++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(q|=n.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(q|=n.STENCIL_BUFFER_BIT)),Y){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,at.__webglColorRenderbuffer[lt]);let Ct=i.get(y[lt]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Ct,0)}n.blitFramebuffer(0,0,F,G,0,0,F,G,q,n.NEAREST),l===!0&&(xe.length=0,Ve.length=0,xe.push(n.COLOR_ATTACHMENT0+lt),A.depthBuffer&&A.storeMultisampledDepthBuffer===!1&&(xe.push(rt),Ve.push(rt),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,Ve)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,xe))}if(e.bindFramebuffer(n.READ_FRAMEBUFFER,null),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),Y)for(let lt=0;lt<y.length;lt++){e.bindFramebuffer(n.FRAMEBUFFER,at.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+lt,n.RENDERBUFFER,at.__webglColorRenderbuffer[lt]);let Ct=i.get(y[lt]).__webglTexture;e.bindFramebuffer(n.FRAMEBUFFER,at.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+lt,n.TEXTURE_2D,Ct,0)}e.bindFramebuffer(n.DRAW_FRAMEBUFFER,at.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.storeMultisampledDepthBuffer===!1&&l){let y=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[y])}}}function be(A){return Math.min(s.maxSamples,A.samples)}function Ie(A){let y=i.get(A);return A.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&y.__useRenderToTexture!==!1}function O(A){let y=o.render.frame;h.get(A)!==y&&(h.set(A,y),A.update())}function Ke(A,y){let F=A.colorSpace,G=A.format,q=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||F!==mo&&F!==gn&&(Wt.getTransfer(F)===Qt?(G!==fi||q!==di)&&Nt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Dt("WebGLTextures: Unsupported texture color space:",F)),y}function se(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(c.width=A.naturalWidth||A.width,c.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(c.width=A.displayWidth,c.height=A.displayHeight):(c.width=A.width,c.height=A.height),c}this.allocateTextureUnit=V,this.resetTextureUnits=B,this.getTextureUnits=I,this.setTextureUnits=U,this.setTexture2D=et,this.setTexture2DArray=Z,this.setTexture3D=J,this.setTextureCube=tt,this.rebindTextures=Kt,this.setupRenderTarget=ce,this.updateRenderTargetMipmap=$t,this.updateMultisampleRenderTarget=li,this.setupDepthRenderbuffer=Xt,this.setupFrameBufferTexture=_t,this.useMultisampledRTT=Ie,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function $b(n,t){function e(i,s=gn){let r,o=Wt.getTransfer(s);if(i===di)return n.UNSIGNED_BYTE;if(i===Wl)return n.UNSIGNED_SHORT_4_4_4_4;if(i===Xl)return n.UNSIGNED_SHORT_5_5_5_1;if(i===ju)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===Ju)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===qu)return n.BYTE;if(i===Yu)return n.SHORT;if(i===yr)return n.UNSIGNED_SHORT;if(i===Vl)return n.INT;if(i===zi)return n.UNSIGNED_INT;if(i===Hi)return n.FLOAT;if(i===ze)return n.HALF_FLOAT;if(i===Ku)return n.ALPHA;if(i===Qu)return n.RGB;if(i===fi)return n.RGBA;if(i===Yi)return n.DEPTH_COMPONENT;if(i===Vn)return n.DEPTH_STENCIL;if(i===td)return n.RED;if(i===Zl)return n.RED_INTEGER;if(i===Wn)return n.RG;if(i===$l)return n.RG_INTEGER;if(i===ql)return n.RGBA_INTEGER;if(i===$o||i===qo||i===Yo||i===jo)if(o===Qt)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===$o)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===qo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Yo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===jo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===$o)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===qo)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Yo)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===jo)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Yl||i===jl||i===Jl||i===Kl)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===Yl)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===jl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Jl)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Kl)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Ql||i===tc||i===ec||i===ic||i===nc||i===Jo||i===sc)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(i===Ql||i===tc)return o===Qt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===ec)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(i===ic)return r.COMPRESSED_R11_EAC;if(i===nc)return r.COMPRESSED_SIGNED_R11_EAC;if(i===Jo)return r.COMPRESSED_RG11_EAC;if(i===sc)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===rc||i===oc||i===ac||i===lc||i===cc||i===hc||i===uc||i===dc||i===fc||i===pc||i===mc||i===gc||i===xc||i===yc)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(i===rc)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===oc)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===ac)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===lc)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===cc)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===hc)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===uc)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===dc)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===fc)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===pc)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===mc)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===gc)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===xc)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===yc)return o===Qt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===_c||i===vc||i===Mc)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(i===_c)return o===Qt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===vc)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Mc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===bc||i===Sc||i===Ko||i===wc)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(i===bc)return r.COMPRESSED_RED_RGTC1_EXT;if(i===Sc)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Ko)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===wc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===_r?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:e}}var qb=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Yb=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,vd=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let i=new Ao(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=i}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,i=new Re({vertexShader:qb,fragmentShader:Yb,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new Ft(new Ce(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Md=class extends ji{constructor(t,e){super();let i=this,s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,u=null,d=null,f=null,x=null,g=typeof XRWebGLBinding<"u",p=new vd,m={},v=e.getContextAttributes(),E=null,M=null,T=[],w=[],C=new Mt,_=null,S=null,R=new Xe;R.viewport=new ye;let P=new Xe;P.viewport=new ye;let L=[R,P],B=new zl,I=null,U=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(X){let K=T[X];return K===void 0&&(K=new or,T[X]=K),K.getTargetRaySpace()},this.getControllerGrip=function(X){let K=T[X];return K===void 0&&(K=new or,T[X]=K),K.getGripSpace()},this.getHand=function(X){let K=T[X];return K===void 0&&(K=new or,T[X]=K),K.getHandSpace()};function V(X){let K=w.indexOf(X.inputSource);if(K===-1)return;let xt=T[K];xt!==void 0&&(xt.update(X.inputSource,X.frame,c||o),xt.dispatchEvent({type:X.type,data:X.inputSource}))}function $(){s.removeEventListener("select",V),s.removeEventListener("selectstart",V),s.removeEventListener("selectend",V),s.removeEventListener("squeeze",V),s.removeEventListener("squeezestart",V),s.removeEventListener("squeezeend",V),s.removeEventListener("end",$),s.removeEventListener("inputsourceschange",et);for(let X=0;X<T.length;X++){let K=w[X];K!==null&&(w[X]=null,T[X].disconnect(K))}I=null,U=null,p.reset();for(let X in m)delete m[X];if(t.setRenderTarget(E),f=null,d=null,u=null,s=null,M=null,Lt.stop(),i.isPresenting=!1,t.setPixelRatio(_),t.setSize(C.width,C.height,!1),S!==null){let X=S.camera;X.fov=S.fov,X.zoom=S.zoom,X.updateProjectionMatrix(),S=null}i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(X){r=X,i.isPresenting===!0&&Nt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(X){a=X,i.isPresenting===!0&&Nt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(X){c=X},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u===null&&g&&(u=new XRWebGLBinding(s,e)),u},this.getFrame=function(){return x},this.getSession=function(){return s},this.setSession=async function(X){if(s=X,s!==null){if(E=t.getRenderTarget(),s.addEventListener("select",V),s.addEventListener("selectstart",V),s.addEventListener("selectend",V),s.addEventListener("squeeze",V),s.addEventListener("squeezestart",V),s.addEventListener("squeezeend",V),s.addEventListener("end",$),s.addEventListener("inputsourceschange",et),v.xrCompatible!==!0&&await e.makeXRCompatible(),_=t.getPixelRatio(),t.getSize(C),g&&"createProjectionLayer"in XRWebGLBinding.prototype){let xt=null,Ot=null,_t=null;v.depth&&(_t=v.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,xt=v.stencil?Vn:Yi,Ot=v.stencil?_r:zi);let Vt={colorFormat:e.RGBA8,depthFormat:_t,scaleFactor:r};u=this.getBinding(),d=u.createProjectionLayer(Vt),s.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),M=new we(d.textureWidth,d.textureHeight,{format:fi,type:di,depthTexture:new On(d.textureWidth,d.textureHeight,Ot,void 0,void 0,void 0,void 0,void 0,void 0,xt),stencilBuffer:v.stencil,colorSpace:t.outputColorSpace,samples:v.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{let xt={antialias:v.antialias,alpha:!0,depth:v.depth,stencil:v.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,e,xt),s.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),M=new we(f.framebufferWidth,f.framebufferHeight,{format:fi,type:di,colorSpace:t.outputColorSpace,stencilBuffer:v.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}M.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),Lt.setContext(s),Lt.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function et(X){for(let K=0;K<X.removed.length;K++){let xt=X.removed[K],Ot=w.indexOf(xt);Ot>=0&&(w[Ot]=null,T[Ot].disconnect(xt))}for(let K=0;K<X.added.length;K++){let xt=X.added[K],Ot=w.indexOf(xt);if(Ot===-1){for(let Vt=0;Vt<T.length;Vt++)if(Vt>=w.length){w.push(xt),Ot=Vt;break}else if(w[Vt]===null){w[Vt]=xt,Ot=Vt;break}if(Ot===-1)break}let _t=T[Ot];_t&&_t.connect(xt)}}let Z=new D,J=new D;function tt(X,K,xt){Z.setFromMatrixPosition(K.matrixWorld),J.setFromMatrixPosition(xt.matrixWorld);let Ot=Z.distanceTo(J),_t=K.projectionMatrix.elements,Vt=xt.projectionMatrix.elements,Fe=_t[14]/(_t[10]-1),Xt=_t[14]/(_t[10]+1),Kt=(_t[9]+1)/_t[5],ce=(_t[9]-1)/_t[5],$t=(_t[8]-1)/_t[0],xe=(Vt[8]+1)/Vt[0],Ve=Fe*$t,li=Fe*xe,be=Ot/(-$t+xe),Ie=be*-$t;if(K.matrixWorld.decompose(X.position,X.quaternion,X.scale),X.translateX(Ie),X.translateZ(be),X.matrixWorld.compose(X.position,X.quaternion,X.scale),X.matrixWorldInverse.copy(X.matrixWorld).invert(),_t[10]===-1)X.projectionMatrix.copy(K.projectionMatrix),X.projectionMatrixInverse.copy(K.projectionMatrixInverse);else{let O=Fe+be,Ke=Xt+be,se=Ve-Ie,A=li+(Ot-Ie),y=Kt*Xt/Ke*O,F=ce*Xt/Ke*O;X.projectionMatrix.makePerspective(se,A,y,F,O,Ke),X.projectionMatrixInverse.copy(X.projectionMatrix).invert()}}function ot(X,K){K===null?X.matrixWorld.copy(X.matrix):X.matrixWorld.multiplyMatrices(K.matrixWorld,X.matrix),X.matrixWorldInverse.copy(X.matrixWorld).invert()}this.updateCamera=function(X){if(s===null)return;let K=X.near,xt=X.far;p.texture!==null&&(p.depthNear>0&&(K=p.depthNear),p.depthFar>0&&(xt=p.depthFar)),B.near=P.near=R.near=K,B.far=P.far=R.far=xt,(I!==B.near||U!==B.far)&&(s.updateRenderState({depthNear:B.near,depthFar:B.far}),I=B.near,U=B.far),B.layers.mask=X.layers.mask|6,R.layers.mask=B.layers.mask&-5,P.layers.mask=B.layers.mask&-3;let Ot=X.parent,_t=B.cameras;ot(B,Ot);for(let Vt=0;Vt<_t.length;Vt++)ot(_t[Vt],Ot);_t.length===2?tt(B,R,P):B.projectionMatrix.copy(R.projectionMatrix),S===null&&X.isPerspectiveCamera&&(S={camera:X,fov:X.fov,zoom:X.zoom}),st(X,B,Ot)};function st(X,K,xt){xt===null?X.matrix.copy(K.matrixWorld):(X.matrix.copy(xt.matrixWorld),X.matrix.invert(),X.matrix.multiply(K.matrixWorld)),X.matrix.decompose(X.position,X.quaternion,X.scale),X.updateMatrixWorld(!0),X.projectionMatrix.copy(K.projectionMatrix),X.projectionMatrixInverse.copy(K.projectionMatrixInverse),X.isPerspectiveCamera&&(X.fov=_o*2*Math.atan(1/X.projectionMatrix.elements[5]),X.zoom=1)}this.getCamera=function(){return B},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(X){l=X,d!==null&&(d.fixedFoveation=X),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=X)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(B)},this.getCameraTexture=function(X){return m[X]};let Ut=null;function It(X,K){if(h=K.getViewerPose(c||o),x=K,h!==null){let xt=h.views;f!==null&&(t.setRenderTargetFramebuffer(M,f.framebuffer),t.setRenderTarget(M));let Ot=!1;xt.length!==B.cameras.length&&(B.cameras.length=0,Ot=!0);for(let Xt=0;Xt<xt.length;Xt++){let Kt=xt[Xt],ce=null;if(f!==null)ce=f.getViewport(Kt);else{let xe=u.getViewSubImage(d,Kt);ce=xe.viewport,Xt===0&&(t.setRenderTargetTextures(M,xe.colorTexture,xe.depthStencilTexture),t.setRenderTarget(M))}let $t=L[Xt];$t===void 0&&($t=new Xe,$t.layers.enable(Xt),$t.viewport=new ye,L[Xt]=$t),$t.matrix.fromArray(Kt.transform.matrix),$t.matrix.decompose($t.position,$t.quaternion,$t.scale),$t.projectionMatrix.fromArray(Kt.projectionMatrix),$t.projectionMatrixInverse.copy($t.projectionMatrix).invert(),$t.viewport.set(ce.x,ce.y,ce.width,ce.height),Xt===0&&(B.matrix.copy($t.matrix),B.matrix.decompose(B.position,B.quaternion,B.scale)),Ot===!0&&B.cameras.push($t)}let _t=s.enabledFeatures;if(_t&&_t.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&g){u=i.getBinding();let Xt=u.getDepthInformation(xt[0]);Xt&&Xt.isValid&&Xt.texture&&p.init(Xt,s.renderState)}if(_t&&_t.includes("camera-access")&&g){t.state.unbindTexture(),u=i.getBinding();for(let Xt=0;Xt<xt.length;Xt++){let Kt=xt[Xt].camera;if(Kt){let ce=m[Kt];ce||(ce=new Ao,m[Kt]=ce);let $t=u.getCameraImage(Kt);ce.sourceTexture=$t}}}}for(let xt=0;xt<T.length;xt++){let Ot=w[xt],_t=T[xt];Ot!==null&&_t!==void 0&&_t.update(Ot,K,c||o)}Ut&&Ut(X,K),K.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:K}),x=null}let Lt=new ng;Lt.setAnimationLoop(It),this.setAnimationLoop=function(X){Ut=X},this.dispose=function(){}}},jb=new de,cg=new Bt;cg.set(-1,0,0,0,1,0,0,0,1);function Jb(n,t){function e(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function i(p,m){m.color.getRGB(p.fogColor.value,nd(n)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function s(p,m,v,E,M){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?r(p,m):m.isMeshLambertMaterial?(r(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(r(p,m),u(p,m)):m.isMeshPhongMaterial?(r(p,m),h(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(r(p,m),d(p,m),m.isMeshPhysicalMaterial&&f(p,m,M)):m.isMeshMatcapMaterial?(r(p,m),x(p,m)):m.isMeshDepthMaterial?r(p,m):m.isMeshDistanceMaterial?(r(p,m),g(p,m)):m.isMeshNormalMaterial?r(p,m):m.isLineBasicMaterial?(o(p,m),m.isLineDashedMaterial&&a(p,m)):m.isPointsMaterial?l(p,m,v,E):m.isSpriteMaterial?c(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,e(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,e(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===oi&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,e(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===oi&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,e(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,e(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,e(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);let v=t.get(m),E=v.envMap,M=v.envMapRotation;E&&(p.envMap.value=E,p.envMapRotation.value.setFromMatrix4(jb.makeRotationFromEuler(M)).transpose(),E.isCubeTexture&&E.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(cg),p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,e(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,e(m.aoMap,p.aoMapTransform))}function o(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,e(m.map,p.mapTransform))}function a(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function l(p,m,v,E){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*v,p.scale.value=E*.5,m.map&&(p.map.value=m.map,e(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function c(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,e(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function h(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function u(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function d(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,e(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,e(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function f(p,m,v){p.ior.value=m.ior,m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,e(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,e(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,e(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,e(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,e(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===oi&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.retroreflectivity>0&&(p.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,e(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,e(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=v.texture,p.transmissionSamplerSize.value.set(v.width,v.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,e(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,e(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,e(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,e(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,e(m.specularIntensityMap,p.specularIntensityMapTransform))}function x(p,m){m.matcap&&(p.matcap.value=m.matcap)}function g(p,m){let v=t.get(m).light;p.referencePosition.value.setFromMatrixPosition(v.matrixWorld),p.nearDistance.value=v.shadow.camera.near,p.farDistance.value=v.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function Kb(n,t,e,i){let s={},r={},o=[],a=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(M,T){let w=T.program;i.uniformBlockBinding(M,w)}function c(M,T){let w=s[M.id];w===void 0&&(p(M),w=h(M),s[M.id]=w,M.addEventListener("dispose",v));let C=T.program;i.updateUBOMapping(M,C);let _=t.render.frame;r[M.id]!==_&&(d(M),r[M.id]=_)}function h(M){let T=u();M.__bindingPointIndex=T;let w=n.createBuffer(),C=M.__size,_=M.usage;return n.bindBuffer(n.UNIFORM_BUFFER,w),n.bufferData(n.UNIFORM_BUFFER,C,_),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,T,w),w}function u(){for(let M=0;M<a;M++)if(o.indexOf(M)===-1)return o.push(M),M;return Dt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(M){let T=s[M.id],w=M.uniforms,C=M.__cache;n.bindBuffer(n.UNIFORM_BUFFER,T);for(let _=0,S=w.length;_<S;_++){let R=w[_];if(Array.isArray(R))for(let P=0,L=R.length;P<L;P++)f(R[P],_,P,C);else f(R,_,0,C)}n.bindBuffer(n.UNIFORM_BUFFER,null)}function f(M,T,w,C){if(g(M,T,w,C)===!0){let _=M.__offset,S=M.value;if(Array.isArray(S)){let R=0;for(let P=0;P<S.length;P++){let L=S[P],B=m(L);x(L,M.__data,R),typeof L!="number"&&typeof L!="boolean"&&!L.isMatrix3&&!ArrayBuffer.isView(L)&&(R+=B.storage/Float32Array.BYTES_PER_ELEMENT)}}else x(S,M.__data,0);n.bufferSubData(n.UNIFORM_BUFFER,_,M.__data)}}function x(M,T,w){typeof M=="number"||typeof M=="boolean"?T[0]=M:M.isMatrix3?(T[0]=M.elements[0],T[1]=M.elements[1],T[2]=M.elements[2],T[3]=0,T[4]=M.elements[3],T[5]=M.elements[4],T[6]=M.elements[5],T[7]=0,T[8]=M.elements[6],T[9]=M.elements[7],T[10]=M.elements[8],T[11]=0):ArrayBuffer.isView(M)?T.set(new M.constructor(M.buffer,M.byteOffset,T.length)):M.toArray(T,w)}function g(M,T,w,C){let _=M.value,S=T+"_"+w;if(C[S]===void 0)return typeof _=="number"||typeof _=="boolean"?C[S]=_:ArrayBuffer.isView(_)?C[S]=_.slice():C[S]=_.clone(),!0;{let R=C[S];if(typeof _=="number"||typeof _=="boolean"){if(R!==_)return C[S]=_,!0}else{if(ArrayBuffer.isView(_))return!0;if(R.equals(_)===!1)return R.copy(_),!0}}return!1}function p(M){let T=M.uniforms,w=0,C=16;for(let S=0,R=T.length;S<R;S++){let P=Array.isArray(T[S])?T[S]:[T[S]];for(let L=0,B=P.length;L<B;L++){let I=P[L],U=Array.isArray(I.value)?I.value:[I.value];for(let V=0,$=U.length;V<$;V++){let et=U[V],Z=m(et),J=w%C,tt=J%Z.boundary,ot=J+tt;w+=tt,ot!==0&&C-ot<Z.storage&&(w+=C-ot),I.__data=new Float32Array(Z.storage/Float32Array.BYTES_PER_ELEMENT),I.__offset=w,w+=Z.storage}}}let _=w%C;return _>0&&(w+=C-_),M.__size=w,M.__cache={},this}function m(M){let T={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(T.boundary=4,T.storage=4):M.isVector2?(T.boundary=8,T.storage=8):M.isVector3||M.isColor?(T.boundary=16,T.storage=12):M.isVector4?(T.boundary=16,T.storage=16):M.isMatrix3?(T.boundary=48,T.storage=48):M.isMatrix4?(T.boundary=64,T.storage=64):M.isTexture?Nt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(M)?(T.boundary=16,T.storage=M.byteLength):Nt("WebGLRenderer: Unsupported uniform value type.",M),T}function v(M){let T=M.target;T.removeEventListener("dispose",v);let w=o.indexOf(T.__bindingPointIndex);o.splice(w,1),n.deleteBuffer(s[T.id]),delete s[T.id],delete r[T.id]}function E(){for(let M in s)n.deleteBuffer(s[M]);o=[],s={},r={}}return{bind:l,update:c,dispose:E}}var Qb=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),en=null;function tS(){return en===null&&(en=new lr(Qb,16,16,Wn,ze),en.name="DFG_LUT",en.minFilter=Ne,en.magFilter=Ne,en.wrapS=qi,en.wrapT=qi,en.generateMipmaps=!1,en.needsUpdate=!0),en}var Ic=class{constructor(t={}){let{canvas:e=Cm(),context:i=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=di}=t;this.isWebGLRenderer=!0;let x;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");x=i.getContextAttributes().alpha}else x=o;let g=f,p=new Set([ql,$l,Zl]),m=new Set([di,zi,yr,_r,Wl,Xl]),v=new Uint32Array(4),E=new Int32Array(4),M=new D,T=null,w=null,C=[],_=[],S=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=bi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let R=this,P=!1,L=null,B=null,I=null,U=null;this._outputColorSpace=Se;let V=0,$=0,et=null,Z=-1,J=null,tt=new ye,ot=new ye,st=null,Ut=new At(0),It=0,Lt=e.width,X=e.height,K=1,xt=null,Ot=null,_t=new ye(0,0,Lt,X),Vt=new ye(0,0,Lt,X),Fe=!1,Xt=new cr,Kt=!1,ce=!1,$t=new de,xe=new D,Ve=new ye,li={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},be=!1;function Ie(){return et===null?K:1}let O=i;function Ke(b,k){return e.getContext(b,k)}let se,A,y,F,G,q,rt,at,Y,Q,lt,Ct,dt,ct,Rt,kt,zt,N,ht,j,ut,gt,it;try{let b={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"186"}`),e.addEventListener("webglcontextlost",he,!1),e.addEventListener("webglcontextrestored",ie,!1),e.addEventListener("webglcontextcreationerror",Li,!1),O===null){let k="webgl2";if(O=Ke(k,b),O===null)throw Ke(k)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Pt()}catch(b){throw e.removeEventListener("webglcontextlost",he,!1),e.removeEventListener("webglcontextrestored",ie,!1),e.removeEventListener("webglcontextcreationerror",Li,!1),Dt("WebGLRenderer: "+b.message),b}function Pt(){se=new aM(O),se.init(),ut=new $b(O,se),A=new Jv(O,se,t,ut),y=new Xb(O,se),A.reversedDepthBuffer&&d&&y.buffers.depth.setReversed(!0),B=O.createFramebuffer(),I=O.createFramebuffer(),U=O.createFramebuffer(),F=new hM(O),G=new Ib,q=new Zb(O,se,y,G,A,ut,F),rt=new oM(R),at=new dy(O),gt=new Yv(O,at),Y=new lM(O,at,F,gt),Q=new dM(O,Y,at,gt,F),N=new uM(O,A,q),Rt=new Kv(G),lt=new Pb(R,rt,se,A,gt,Rt),Ct=new Jb(R,G),dt=new kb,ct=new Bb(se),zt=new qv(R,rt,y,Q,x,l),kt=new Wb(R,Q,A),it=new Kb(O,F,A,y),ht=new jv(O,se,F),j=new cM(O,se,F),F.programs=lt.programs,R.capabilities=A,R.extensions=se,R.properties=G,R.renderLists=dt,R.shadowMap=kt,R.state=y,R.info=F}g!==di&&(S=new pM(g,e.width,e.height,a,s,r));let Tt=new Md(R,O);this.xr=Tt,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){let b=se.get("WEBGL_lose_context");b&&b.loseContext()},this.forceContextRestore=function(){let b=se.get("WEBGL_lose_context");b&&b.restoreContext()},this.getPixelRatio=function(){return K},this.setPixelRatio=function(b){b!==void 0&&(K=b,this.setSize(Lt,X,!1))},this.getSize=function(b){return b.set(Lt,X)},this.setSize=function(b,k,W=!0){if(Tt.isPresenting){Nt("WebGLRenderer: Can't change size while VR device is presenting.");return}Lt=b,X=k,e.width=Math.floor(b*K),e.height=Math.floor(k*K),W===!0&&(e.style.width=b+"px",e.style.height=k+"px"),S!==null&&S.setSize(e.width,e.height),this.setViewport(0,0,b,k)},this.getDrawingBufferSize=function(b){return b.set(Lt*K,X*K).floor()},this.setDrawingBufferSize=function(b,k,W){Lt=b,X=k,K=W,e.width=Math.floor(b*W),e.height=Math.floor(k*W),this.setViewport(0,0,b,k)},this.setEffects=function(b){if(g===di){Dt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(b){for(let k=0;k<b.length;k++)if(b[k].isOutputPass===!0){Nt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}S.setEffects(b||[])},this.getCurrentViewport=function(b){return b.copy(tt)},this.getViewport=function(b){return b.copy(_t)},this.setViewport=function(b,k,W,z){b.isVector4?_t.set(b.x,b.y,b.z,b.w):_t.set(b,k,W,z),y.viewport(tt.copy(_t).multiplyScalar(K).round())},this.getScissor=function(b){return b.copy(Vt)},this.setScissor=function(b,k,W,z){b.isVector4?Vt.set(b.x,b.y,b.z,b.w):Vt.set(b,k,W,z),y.scissor(ot.copy(Vt).multiplyScalar(K).round())},this.getScissorTest=function(){return Fe},this.setScissorTest=function(b){y.setScissorTest(Fe=b)},this.setOpaqueSort=function(b){xt=b},this.setTransparentSort=function(b){Ot=b},this.getClearColor=function(b){return b.copy(zt.getClearColor())},this.setClearColor=function(){zt.setClearColor(...arguments)},this.getClearAlpha=function(){return zt.getClearAlpha()},this.setClearAlpha=function(){zt.setClearAlpha(...arguments)},this.clear=function(b=!0,k=!0,W=!0){let z=0;if(b){let H=!1;if(et!==null){let mt=et.texture.format;H=p.has(mt)}if(H){let mt=et.texture.type,vt=m.has(mt),pt=zt.getClearColor(),St=zt.getClearAlpha(),Et=pt.r,Ht=pt.g,Zt=pt.b;vt?(v[0]=Et,v[1]=Ht,v[2]=Zt,v[3]=St,O.clearBufferuiv(O.COLOR,0,v)):(E[0]=Et,E[1]=Ht,E[2]=Zt,E[3]=St,O.clearBufferiv(O.COLOR,0,E))}else z|=O.COLOR_BUFFER_BIT}k&&(z|=O.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),W&&(z|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),z!==0&&O.clear(z)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(b){b.setRenderer(this),L=b},this.dispose=function(){e.removeEventListener("webglcontextlost",he,!1),e.removeEventListener("webglcontextrestored",ie,!1),e.removeEventListener("webglcontextcreationerror",Li,!1),zt.dispose(),dt.dispose(),ct.dispose(),G.dispose(),rt.dispose(),Q.dispose(),gt.dispose(),it.dispose(),lt.dispose(),Tt.dispose(),Tt.removeEventListener("sessionstart",rf),Tt.removeEventListener("sessionend",of),Kn.stop()};function he(b){b.preventDefault(),yo("WebGLRenderer: Context Lost."),P=!0}function ie(){yo("WebGLRenderer: Context Restored."),P=!1;let b=F.autoReset,k=kt.enabled,W=kt.autoUpdate,z=kt.needsUpdate,H=kt.type;Pt(),F.autoReset=b,kt.enabled=k,kt.autoUpdate=W,kt.needsUpdate=z,kt.type=H}function Li(b){Dt("WebGLRenderer: A WebGL context could not be created. Reason: ",b.statusMessage)}function Vi(b){let k=b.target;k.removeEventListener("dispose",Vi),z0(k)}function z0(b){H0(b),G.remove(b)}function H0(b){let k=G.get(b).programs;k!==void 0&&(k.forEach(function(W){lt.releaseProgram(W)}),b.isShaderMaterial&&lt.releaseShaderCache(b))}this.renderBufferDirect=function(b,k,W,z,H,mt){k===null&&(k=li);let vt=H.isMesh&&H.matrixWorld.determinantAffine()<0,pt=W0(b,k,W,z,H);y.setMaterial(z,vt);let St=W.index,Et=1;if(z.wireframe===!0){if(St=Y.getWireframeAttribute(W),St===void 0)return;Et=2}let Ht=W.drawRange,Zt=W.attributes.position,wt=Ht.start*Et,ne=(Ht.start+Ht.count)*Et;mt!==null&&(wt=Math.max(wt,mt.start*Et),ne=Math.min(ne,(mt.start+mt.count)*Et)),St!==null?(wt=Math.max(wt,0),ne=Math.min(ne,St.count)):Zt!=null&&(wt=Math.max(wt,0),ne=Math.min(ne,Zt.count));let Le=ne-wt;if(Le<0||Le===1/0)return;gt.setup(H,z,pt,W,St);let fe,ae=ht;if(St!==null&&(fe=at.get(St),ae=j,ae.setIndex(fe)),H.isMesh)z.wireframe===!0?(y.setLineWidth(z.wireframeLinewidth*Ie()),ae.setMode(O.LINES)):ae.setMode(O.TRIANGLES);else if(H.isLine){let Qe=z.linewidth;Qe===void 0&&(Qe=1),y.setLineWidth(Qe*Ie()),H.isLineSegments?ae.setMode(O.LINES):H.isLineLoop?ae.setMode(O.LINE_LOOP):ae.setMode(O.LINE_STRIP)}else H.isPoints?ae.setMode(O.POINTS):H.isSprite&&ae.setMode(O.TRIANGLES);if(H.isBatchedMesh)if(se.get("WEBGL_multi_draw"))ae.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{let Qe=H._multiDrawStarts,yt=H._multiDrawCounts,si=H._multiDrawCount,Jt=St?at.get(St).bytesPerElement:1,wi=G.get(z).currentProgram.getUniforms();for(let Wi=0;Wi<si;Wi++)wi.setValue(O,"_gl_DrawID",Wi),ae.render(Qe[Wi]/Jt,yt[Wi])}else if(H.isInstancedMesh)ae.renderInstances(wt,Le,H.count);else if(W.isInstancedBufferGeometry){let Qe=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,yt=Math.min(W.instanceCount,Qe);ae.renderInstances(wt,Le,yt)}else ae.render(wt,Le)};function sf(b,k,W,z){L!==null&&b.isNodeMaterial&&L.setObject(z,b),Kt===!0&&Rt.setState(b,W,!1),b.transparent===!0&&b.side===hi&&b.forceSinglePass===!1?(b.side=oi,b.needsUpdate=!0,xa(b,k,z),b.side=zn,b.needsUpdate=!0,xa(b,k,z),b.side=hi):xa(b,k,z)}this.compile=function(b,k,W=null){W===null&&(W=b),L!==null&&L.renderStart(b,k,W),w=ct.get(W),w.init(k),_.push(w),W.traverseVisible(function(H){H.isLight&&H.layers.test(k.layers)&&(w.pushLight(H),H.castShadow&&w.pushShadow(H))}),b!==W&&b.traverseVisible(function(H){H.isLight&&H.layers.test(k.layers)&&(w.pushLight(H),H.castShadow&&w.pushShadow(H))}),w.setupLights(),L!==null&&L.updateLights(w.state.lightsArray),ce=this.localClippingEnabled,Kt=Rt.init(this.clippingPlanes,ce),Kt===!0&&Rt.setGlobalState(this.clippingPlanes,k),L!==null&&kt.render(w.state.shadowsArray,W,k);let z=new Set;return b.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;let mt=H.material;if(mt)if(Array.isArray(mt))for(let vt=0;vt<mt.length;vt++){let pt=mt[vt];sf(pt,W,k,H),z.add(pt)}else sf(mt,W,k,H),z.add(mt)}),w=_.pop(),L!==null&&L.renderEnd(),z},this.compileAsync=function(b,k,W=null){let z=this.compile(b,k,W);return new Promise(H=>{function mt(){if(z.forEach(function(vt){let St=G.get(vt).currentProgram;(St===void 0||St.isReady())&&z.delete(vt)}),z.size===0){H(b);return}setTimeout(mt,10)}se.get("KHR_parallel_shader_compile")!==null?mt():setTimeout(mt,10)})};let Bh=null;function G0(b){Bh&&Bh(b)}function rf(){Kn.stop()}function of(){Kn.start()}let Kn=new ng;Kn.setAnimationLoop(G0),typeof self<"u"&&Kn.setContext(self),this.setAnimationLoop=function(b){Bh=b,Tt.setAnimationLoop(b),b===null?Kn.stop():Kn.start()},Tt.addEventListener("sessionstart",rf),Tt.addEventListener("sessionend",of),this.render=function(b,k){if(k!==void 0&&k.isCamera!==!0){Dt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(P===!0)return;L!==null&&L.renderStart(b,k);let W=Tt.enabled===!0&&Tt.isPresenting===!0,z=S!==null&&(et===null||W)&&S.begin(R,et);if(b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),k.parent===null&&k.matrixWorldAutoUpdate===!0&&k.updateMatrixWorld(),Tt.enabled===!0&&Tt.isPresenting===!0&&(S===null||S.isCompositing()===!1)&&(Tt.cameraAutoUpdate===!0&&Tt.updateCamera(k),k=Tt.getCamera()),b.isScene===!0&&b.onBeforeRender(R,b,k,et),w=ct.get(b,_.length),w.init(k),w.state.textureUnits=q.getTextureUnits(),_.push(w),$t.multiplyMatrices(k.projectionMatrix,k.matrixWorldInverse),Xt.setFromProjectionMatrix($t,Fi,k.reversedDepth),ce=this.localClippingEnabled,Kt=Rt.init(this.clippingPlanes,ce),T=dt.get(b,C.length),T.init(),C.push(T),Tt.enabled===!0&&Tt.isPresenting===!0){let vt=R.xr.getDepthSensingMesh();vt!==null&&zh(vt,k,-1/0,R.sortObjects)}zh(b,k,0,R.sortObjects),T.finish(),L!==null&&L.updateLights(w.state.lightsArray),R.sortObjects===!0&&T.sort(xt,Ot),be=Tt.enabled===!1||Tt.isPresenting===!1||Tt.hasDepthSensing()===!1,be&&zt.addToRenderList(T,b),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Kt===!0&&Rt.beginShadows();let H=w.state.shadowsArray;if(kt.render(H,b,k),Kt===!0&&Rt.endShadows(),(z&&S.hasRenderPass())===!1){let vt=T.opaque,pt=T.transmissive;if(w.setupLights(),k.isArrayCamera){let St=k.cameras;if(pt.length>0)for(let Et=0,Ht=St.length;Et<Ht;Et++){let Zt=St[Et];lf(vt,pt,b,Zt)}be&&zt.render(b);for(let Et=0,Ht=St.length;Et<Ht;Et++){let Zt=St[Et];af(T,b,Zt,Zt.viewport)}}else pt.length>0&&lf(vt,pt,b,k),be&&zt.render(b),af(T,b,k)}et!==null&&$===0&&(q.updateMultisampleRenderTarget(et),q.updateRenderTargetMipmap(et)),z&&S.end(R),b.isScene===!0&&b.onAfterRender(R,b,k),gt.resetDefaultState(),Z=-1,J=null,_.pop(),_.length>0?(w=_[_.length-1],q.setTextureUnits(w.state.textureUnits),Kt===!0&&Rt.setGlobalState(R.clippingPlanes,w.state.camera)):w=null,C.pop(),C.length>0?T=C[C.length-1]:T=null,L!==null&&L.renderEnd()};function zh(b,k,W,z){if(b.visible===!1)return;if(b.layers.test(k.layers)){if(b.isGroup)W=b.renderOrder;else if(b.isLOD)b.autoUpdate===!0&&b.update(k);else if(b.isLightProbeGrid)w.pushLightProbeGrid(b);else if(b.isLight)w.pushLight(b),b.castShadow&&w.pushShadow(b);else if(b.isSprite){if(!b.frustumCulled||b.intersectsFrustum(Xt)){z&&Ve.setFromMatrixPosition(b.matrixWorld).applyMatrix4($t);let vt=Q.update(b),pt=b.material;pt.visible&&T.push(b,vt,pt,W,Ve.z,null,k)}}else if((b.isMesh||b.isLine||b.isPoints)&&(!b.frustumCulled||b.intersectsFrustum(Xt))){let vt=Q.update(b),pt=b.material;if(z&&(b.boundingSphere!==void 0?(b.boundingSphere===null&&b.computeBoundingSphere(),Ve.copy(b.boundingSphere.center)):(vt.boundingSphere===null&&vt.computeBoundingSphere(),Ve.copy(vt.boundingSphere.center)),Ve.applyMatrix4(b.matrixWorld).applyMatrix4($t)),Array.isArray(pt)){let St=vt.groups;for(let Et=0,Ht=St.length;Et<Ht;Et++){let Zt=St[Et],wt=pt[Zt.materialIndex];wt&&wt.visible&&T.push(b,vt,wt,W,Ve.z,Zt,k)}}else pt.visible&&T.push(b,vt,pt,W,Ve.z,null,k)}}let mt=b.children;for(let vt=0,pt=mt.length;vt<pt;vt++)zh(mt[vt],k,W,z)}function af(b,k,W,z){let{opaque:H,transmissive:mt,transparent:vt}=b;w.setupLightsView(W),Kt===!0&&Rt.setGlobalState(R.clippingPlanes,W),z&&y.viewport(tt.copy(z)),H.length>0&&ga(H,k,W),mt.length>0&&ga(mt,k,W),vt.length>0&&ga(vt,k,W),y.buffers.depth.setTest(!0),y.buffers.depth.setMask(!0),y.buffers.color.setMask(!0),y.setPolygonOffset(!1)}function lf(b,k,W,z){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;if(w.state.transmissionRenderTarget[z.id]===void 0){let wt=se.has("EXT_color_buffer_half_float")||se.has("EXT_color_buffer_float");w.state.transmissionRenderTarget[z.id]=new we(1,1,{generateMipmaps:!0,type:wt?ze:di,minFilter:tn,samples:Math.max(4,A.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Wt.workingColorSpace})}let mt=w.state.transmissionRenderTarget[z.id],vt=z.viewport||tt;mt.setSize(vt.z*R.transmissionResolutionScale,vt.w*R.transmissionResolutionScale);let pt=R.getRenderTarget(),St=R.getActiveCubeFace(),Et=R.getActiveMipmapLevel();R.setRenderTarget(mt),R.getClearColor(Ut),It=R.getClearAlpha(),It<1&&R.setClearColor(16777215,.5),R.clear(),be&&zt.render(W);let Ht=R.toneMapping;R.toneMapping=bi;let Zt=z.viewport;if(z.viewport!==void 0&&(z.viewport=void 0),w.setupLightsView(z),Kt===!0&&Rt.setGlobalState(R.clippingPlanes,z),ga(b,W,z),q.updateMultisampleRenderTarget(mt),q.updateRenderTargetMipmap(mt),se.has("WEBGL_multisampled_render_to_texture")===!1){let wt=!1;for(let ne=0,Le=k.length;ne<Le;ne++){let fe=k[ne],{object:ae,geometry:Qe,material:yt,group:si}=fe;if(yt.side===hi&&ae.layers.test(z.layers)){let Jt=yt.side;yt.side=oi,yt.needsUpdate=!0,cf(ae,W,z,Qe,yt,si),yt.side=Jt,yt.needsUpdate=!0,wt=!0}}wt===!0&&(q.updateMultisampleRenderTarget(mt),q.updateRenderTargetMipmap(mt))}R.setRenderTarget(pt,St,Et),R.setClearColor(Ut,It),Zt!==void 0&&(z.viewport=Zt),R.toneMapping=Ht}function ga(b,k,W){let z=k.isScene===!0?k.overrideMaterial:null;for(let H=0,mt=b.length;H<mt;H++){let vt=b[H],{object:pt,geometry:St,group:Et}=vt,Ht=vt.material;Ht.allowOverride===!0&&z!==null&&(Ht=z),pt.layers.test(W.layers)&&cf(pt,k,W,St,Ht,Et)}}function cf(b,k,W,z,H,mt){L!==null&&H.isNodeMaterial&&L.setObject(b,H),b.onBeforeRender(R,k,W,z,H,mt),b.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,b.matrixWorld),b.normalMatrix.getNormalMatrix(b.modelViewMatrix),H.onBeforeRender(R,k,W,z,b,mt),H.transparent===!0&&H.side===hi&&H.forceSinglePass===!1?(H.side=oi,H.needsUpdate=!0,R.renderBufferDirect(W,k,z,H,b,mt),H.side=zn,H.needsUpdate=!0,R.renderBufferDirect(W,k,z,H,b,mt),H.side=hi):R.renderBufferDirect(W,k,z,H,b,mt),b.onAfterRender(R,k,W,z,H,mt)}function xa(b,k,W){k.isScene!==!0&&(k=li);let z=G.get(b),H=w.state.lights,mt=w.state.shadowsArray,vt=H.state.version,pt=lt.getParameters(b,H.state,mt,k,W,w.state.lightProbeGridArray),St=lt.getProgramCacheKey(pt),Et=z.programs;z.environment=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?k.environment:null,z.fog=k.fog;let Ht=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap;z.envMap=rt.get(b.envMap||z.environment,Ht),z.envMapRotation=z.environment!==null&&b.envMap===null?k.environmentRotation:b.envMapRotation,Et===void 0&&(b.addEventListener("dispose",Vi),Et=new Map,z.programs=Et);let Zt=Et.get(St);if(Zt!==void 0){if(z.currentProgram===Zt&&z.lightsStateVersion===vt)return uf(b,pt),Zt}else pt.uniforms=lt.getUniforms(b),L!==null&&b.isNodeMaterial&&L.build(b,W,pt),b.onBeforeCompile(pt,R),Zt=lt.acquireProgram(pt,St),Et.set(St,Zt),z.uniforms=pt.uniforms;let wt=z.uniforms;return(!b.isShaderMaterial&&!b.isRawShaderMaterial||b.clipping===!0)&&(wt.clippingPlanes=Rt.uniform),uf(b,pt),z.needsLights=Z0(b),z.lightsStateVersion=vt,z.needsLights&&(wt.ambientLightColor.value=H.state.ambient,wt.lightProbe.value=H.state.probe,wt.sunLights.value=H.state.sun,wt.sunLightShadows.value=H.state.sunShadow,wt.directionalLights.value=H.state.directional,wt.directionalLightShadows.value=H.state.directionalShadow,wt.spotLights.value=H.state.spot,wt.spotLightShadows.value=H.state.spotShadow,wt.rectAreaLights.value=H.state.rectArea,wt.ltc_1.value=H.state.rectAreaLTC1,wt.ltc_2.value=H.state.rectAreaLTC2,wt.pointLights.value=H.state.point,wt.pointLightShadows.value=H.state.pointShadow,wt.hemisphereLights.value=H.state.hemi,wt.sunShadowMatrix.value=H.state.sunShadowMatrix,wt.sunShadowCascade.value=H.state.sunShadowCascade,wt.directionalShadowMatrix.value=H.state.directionalShadowMatrix,wt.spotLightMatrix.value=H.state.spotLightMatrix,wt.spotLightMap.value=H.state.spotLightMap,wt.pointShadowMatrix.value=H.state.pointShadowMatrix),z.lightProbeGrid=w.state.lightProbeGridArray.length>0,z.currentProgram=Zt,z.uniformsList=null,Zt}function hf(b){if(b.uniformsList===null){let k=b.currentProgram.getUniforms();b.uniformsList=br.seqWithValue(k.seq,b.uniforms)}return b.uniformsList}function uf(b,k){let W=G.get(b);W.outputColorSpace=k.outputColorSpace,W.batching=k.batching,W.batchingColor=k.batchingColor,W.instancing=k.instancing,W.instancingColor=k.instancingColor,W.instancingMorph=k.instancingMorph,W.skinning=k.skinning,W.morphTargets=k.morphTargets,W.morphNormals=k.morphNormals,W.morphColors=k.morphColors,W.morphTargetsCount=k.morphTargetsCount,W.numClippingPlanes=k.numClippingPlanes,W.numIntersection=k.numClipIntersection,W.vertexAlphas=k.vertexAlphas,W.vertexTangents=k.vertexTangents,W.toneMapping=k.toneMapping}function V0(b,k){if(b.length===0)return null;if(b.length===1)return b[0].texture!==null?b[0]:null;M.setFromMatrixPosition(k.matrixWorld);for(let W=0,z=b.length;W<z;W++){let H=b[W];if(H.texture!==null&&H.boundingBox.containsPoint(M))return H}return null}function W0(b,k,W,z,H){k.isScene!==!0&&(k=li),q.resetTextureUnits();let mt=k.fog,vt=z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial?k.environment:null,pt=et===null?R.outputColorSpace:et.isXRRenderTarget===!0?et.texture.colorSpace:Wt.workingColorSpace,St=z.isMeshStandardMaterial||z.isMeshLambertMaterial&&!z.envMap||z.isMeshPhongMaterial&&!z.envMap,Et=rt.get(z.envMap||vt,St),Ht=z.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Zt=!!W.attributes.tangent&&(!!z.normalMap||z.anisotropy>0),wt=!!W.morphAttributes.position,ne=!!W.morphAttributes.normal,Le=!!W.morphAttributes.color,fe=bi;z.toneMapped&&(et===null||et.isXRRenderTarget===!0)&&(fe=R.toneMapping);let ae=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,Qe=ae!==void 0?ae.length:0,yt=G.get(z),si=w.state.lights;if(Kt===!0&&(ce===!0||b!==J)){let ue=b===J&&z.id===Z;Rt.setState(z,b,ue)}let Jt=!1;z.version===yt.__version?(yt.needsLights&&yt.lightsStateVersion!==si.state.version||yt.outputColorSpace!==pt||H.isBatchedMesh&&yt.batching===!1||!H.isBatchedMesh&&yt.batching===!0||H.isBatchedMesh&&yt.batchingColor===!0&&H._colorsTexture===null||H.isBatchedMesh&&yt.batchingColor===!1&&H._colorsTexture!==null||H.isInstancedMesh&&yt.instancing===!1||!H.isInstancedMesh&&yt.instancing===!0||H.isSkinnedMesh&&yt.skinning===!1||!H.isSkinnedMesh&&yt.skinning===!0||H.isInstancedMesh&&yt.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&yt.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&yt.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&yt.instancingMorph===!1&&H.morphTexture!==null||yt.envMap!==Et||z.fog===!0&&yt.fog!==mt||yt.numClippingPlanes!==void 0&&(yt.numClippingPlanes!==Rt.numPlanes||yt.numIntersection!==Rt.numIntersection)||yt.vertexAlphas!==Ht||yt.vertexTangents!==Zt||yt.morphTargets!==wt||yt.morphNormals!==ne||yt.morphColors!==Le||yt.toneMapping!==fe||yt.morphTargetsCount!==Qe||!!yt.lightProbeGrid!=w.state.lightProbeGridArray.length>0)&&(Jt=!0):(Jt=!0,yt.__version=z.version);let wi=yt.currentProgram;Jt===!0&&(wi=xa(z,k,H),L&&z.isNodeMaterial&&L.onUpdateProgram(z,wi,yt));let Wi=!1,vn=!1,Ts=!1,re=wi.getUniforms(),Ee=yt.uniforms;if(y.useProgram(wi.program)&&(Wi=!0,vn=!0,Ts=!0),z.id!==Z&&(Z=z.id,vn=!0),yt.needsLights){let ue=V0(w.state.lightProbeGridArray,H);yt.lightProbeGrid!==ue&&(yt.lightProbeGrid=ue,vn=!0)}if(Wi||J!==b){y.buffers.depth.getReversed()&&b.reversedDepth!==!0&&(b._reversedDepth=!0,b.updateProjectionMatrix()),re.setValue(O,"projectionMatrix",b.projectionMatrix),re.setValue(O,"viewMatrix",b.matrixWorldInverse);let bn=re.map.cameraPosition;bn!==void 0&&bn.setValue(O,xe.setFromMatrixPosition(b.matrixWorld)),A.logarithmicDepthBuffer&&re.setValue(O,"logDepthBufFC",2/(Math.log(b.far+1)/Math.LN2)),(z.isMeshPhongMaterial||z.isMeshToonMaterial||z.isMeshLambertMaterial||z.isMeshBasicMaterial||z.isMeshStandardMaterial||z.isShaderMaterial)&&re.setValue(O,"isOrthographic",b.isOrthographicCamera===!0),J!==b&&(J=b,vn=!0,Ts=!0)}if(yt.needsLights&&(si.state.sunShadowMap.length>0&&re.setValue(O,"sunShadowMap",si.state.sunShadowMap,q),si.state.directionalShadowMap.length>0&&re.setValue(O,"directionalShadowMap",si.state.directionalShadowMap,q),si.state.spotShadowMap.length>0&&re.setValue(O,"spotShadowMap",si.state.spotShadowMap,q),si.state.pointShadowMap.length>0&&re.setValue(O,"pointShadowMap",si.state.pointShadowMap,q)),H.isSkinnedMesh){re.setOptional(O,H,"bindMatrix"),re.setOptional(O,H,"bindMatrixInverse");let ue=H.skeleton;ue&&(ue.boneTexture===null&&ue.computeBoneTexture(),re.setValue(O,"boneTexture",ue.boneTexture,q))}H.isBatchedMesh&&(re.setOptional(O,H,"batchingTexture"),re.setValue(O,"batchingTexture",H._matricesTexture,q),re.setOptional(O,H,"batchingIdTexture"),re.setValue(O,"batchingIdTexture",H._indirectTexture,q),re.setOptional(O,H,"batchingColorTexture"),H._colorsTexture!==null&&re.setValue(O,"batchingColorTexture",H._colorsTexture,q));let Mn=W.morphAttributes;if((Mn.position!==void 0||Mn.normal!==void 0||Mn.color!==void 0)&&N.update(H,W,wi),(vn||yt.receiveShadow!==H.receiveShadow)&&(yt.receiveShadow=H.receiveShadow,re.setValue(O,"receiveShadow",H.receiveShadow)),(z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial)&&z.envMap===null&&k.environment!==null&&(Ee.envMapIntensity.value=k.environmentIntensity),Ee.dfgLUT!==void 0&&(Ee.dfgLUT.value=tS()),vn){if(re.setValue(O,"toneMappingExposure",R.toneMappingExposure),yt.needsLights&&X0(Ee,Ts),mt&&z.fog===!0&&Ct.refreshFogUniforms(Ee,mt),Ct.refreshMaterialUniforms(Ee,z,K,X,w.state.transmissionRenderTarget[b.id]),yt.needsLights&&yt.lightProbeGrid){let ue=yt.lightProbeGrid;Ee.probesSH.value=ue.texture,Ee.probesMin.value.copy(ue.boundingBox.min),Ee.probesMax.value.copy(ue.boundingBox.max),Ee.probesResolution.value.copy(ue.resolution)}br.upload(O,hf(yt),Ee,q)}if(z.isShaderMaterial&&z.uniformsNeedUpdate===!0&&(br.upload(O,hf(yt),Ee,q),z.uniformsNeedUpdate=!1),z.isSpriteMaterial&&re.setValue(O,"center",H.center),re.setValue(O,"modelViewMatrix",H.modelViewMatrix),re.setValue(O,"normalMatrix",H.normalMatrix),re.setValue(O,"modelMatrix",H.matrixWorld),z.uniformsGroups!==void 0){let ue=z.uniformsGroups;for(let bn=0,Es=ue.length;bn<Es;bn++){let ff=ue[bn];it.update(ff,wi),it.bind(ff,wi)}}return wi}function X0(b,k){b.ambientLightColor.needsUpdate=k,b.lightProbe.needsUpdate=k,b.sunLights.needsUpdate=k,b.sunLightShadows.needsUpdate=k,b.directionalLights.needsUpdate=k,b.directionalLightShadows.needsUpdate=k,b.pointLights.needsUpdate=k,b.pointLightShadows.needsUpdate=k,b.spotLights.needsUpdate=k,b.spotLightShadows.needsUpdate=k,b.rectAreaLights.needsUpdate=k,b.hemisphereLights.needsUpdate=k}function Z0(b){return b.isMeshLambertMaterial||b.isMeshToonMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isShadowMaterial||b.isShaderMaterial&&b.lights===!0}this.getActiveCubeFace=function(){return V},this.getActiveMipmapLevel=function(){return $},this.getRenderTarget=function(){return et},this.setRenderTargetTextures=function(b,k,W){let z=G.get(b);z.__autoAllocateDepthBuffer=b.resolveDepthBuffer===!1,z.__autoAllocateDepthBuffer===!1&&(z.__useRenderToTexture=!1),G.get(b.texture).__webglTexture=k,G.get(b.depthTexture).__webglTexture=z.__autoAllocateDepthBuffer?void 0:W,z.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(b,k){let W=G.get(b);W.__webglFramebuffer=k,W.__useDefaultFramebuffer=k===void 0},this.setRenderTarget=function(b,k=0,W=0){et=b,V=k,$=W;let z=null,H=!1,mt=!1;if(b){let pt=G.get(b);if(pt.__useDefaultFramebuffer!==void 0){y.bindFramebuffer(O.FRAMEBUFFER,pt.__webglFramebuffer),tt.copy(b.viewport),ot.copy(b.scissor),st=b.scissorTest,y.viewport(tt),y.scissor(ot),y.setScissorTest(st),Z=-1;return}else if(pt.__webglFramebuffer===void 0)q.setupRenderTarget(b);else if(pt.__hasExternalTextures)q.rebindTextures(b,G.get(b.texture).__webglTexture,G.get(b.depthTexture).__webglTexture);else if(b.depthBuffer){let Ht=b.depthTexture;if(pt.__boundDepthTexture!==Ht){if(Ht!==null&&G.has(Ht)&&(b.width!==Ht.image.width||b.height!==Ht.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");q.setupDepthRenderbuffer(b)}}let St=b.texture;(St.isData3DTexture||St.isDataArrayTexture||St.isCompressedArrayTexture)&&(mt=!0);let Et=G.get(b).__webglFramebuffer;b.isWebGLCubeRenderTarget?(Array.isArray(Et[k])?z=Et[k][W]:z=Et[k],H=!0):b.samples>0&&q.useMultisampledRTT(b)===!1?z=G.get(b).__webglMultisampledFramebuffer:Array.isArray(Et)?z=Et[W]:z=Et,tt.copy(b.viewport),ot.copy(b.scissor),st=b.scissorTest}else tt.copy(_t).multiplyScalar(K).floor(),ot.copy(Vt).multiplyScalar(K).floor(),st=Fe;if(W!==0&&(z=B),y.bindFramebuffer(O.FRAMEBUFFER,z)&&y.drawBuffers(b,z),y.viewport(tt),y.scissor(ot),y.setScissorTest(st),H){let pt=G.get(b.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+k,pt.__webglTexture,W)}else if(mt){let pt=k;for(let St=0;St<b.textures.length;St++){let Et=G.get(b.textures[St]);O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0+St,Et.__webglTexture,W,pt)}}else if(b!==null&&W!==0){let pt=G.get(b.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,pt.__webglTexture,W)}Z=-1};function df(b){let k=G.get(b);return(k.__readFormat!==b.format||k.__readType!==b.type)&&(k.__readFormat=b.format,k.__readType=b.type,k.__formatReadable=A.textureFormatReadable(b.format),k.__typeReadable=A.textureTypeReadable(b.type)),k}this.readRenderTargetPixels=function(b,k,W,z,H,mt,vt,pt=0){if(!(b&&b.isWebGLRenderTarget)){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let St=G.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&vt!==void 0&&(St=St[vt]),St){y.bindFramebuffer(O.FRAMEBUFFER,St);try{let Et=b.textures[pt],Ht=Et.format,Zt=Et.type;b.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+pt);let wt=df(Et);if(wt.__formatReadable===!1){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(wt.__typeReadable===!1){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}k>=0&&k<=b.width-z&&W>=0&&W<=b.height-H&&O.readPixels(k,W,z,H,ut.convert(Ht),ut.convert(Zt),mt)}finally{let Et=et!==null?G.get(et).__webglFramebuffer:null;y.bindFramebuffer(O.FRAMEBUFFER,Et)}}},this.readRenderTargetPixelsAsync=async function(b,k,W,z,H,mt,vt,pt=0){if(!(b&&b.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let St=G.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&vt!==void 0&&(St=St[vt]),St)if(k>=0&&k<=b.width-z&&W>=0&&W<=b.height-H){y.bindFramebuffer(O.FRAMEBUFFER,St);let Et=b.textures[pt],Ht=Et.format,Zt=Et.type;b.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+pt);let wt=df(Et);if(wt.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(wt.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let ne=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,ne),O.bufferData(O.PIXEL_PACK_BUFFER,mt.byteLength,O.STREAM_READ),O.readPixels(k,W,z,H,ut.convert(Ht),ut.convert(Zt),0),O.bindBuffer(O.PIXEL_PACK_BUFFER,null);let Le=et!==null?G.get(et).__webglFramebuffer:null;y.bindFramebuffer(O.FRAMEBUFFER,Le);let fe=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await Pm(O,fe,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,ne),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,mt),O.bindBuffer(O.PIXEL_PACK_BUFFER,null),O.deleteBuffer(ne),O.deleteSync(fe),mt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(b,k=null,W=0){let z=Math.pow(2,-W),H=Math.floor(b.image.width*z),mt=Math.floor(b.image.height*z),vt=k!==null?k.x:0,pt=k!==null?k.y:0;q.setTexture2D(b,0),O.copyTexSubImage2D(O.TEXTURE_2D,W,0,0,vt,pt,H,mt),y.unbindTexture()},this.copyTextureToTexture=function(b,k,W=null,z=null,H=0,mt=0){let vt,pt,St,Et,Ht,Zt,wt,ne,Le,fe=b.isCompressedTexture?b.mipmaps[mt]:b.image;if(W!==null)vt=W.max.x-W.min.x,pt=W.max.y-W.min.y,St=W.isBox3?W.max.z-W.min.z:1,Et=W.min.x,Ht=W.min.y,Zt=W.isBox3?W.min.z:0;else{let Ee=Math.pow(2,-H);vt=Math.floor(fe.width*Ee),pt=Math.floor(fe.height*Ee),b.isDataArrayTexture?St=fe.depth:b.isData3DTexture?St=Math.floor(fe.depth*Ee):St=1,Et=0,Ht=0,Zt=0}z!==null?(wt=z.x,ne=z.y,Le=z.z):(wt=0,ne=0,Le=0);let ae=ut.convert(k.format),Qe=ut.convert(k.type),yt;k.isData3DTexture?(q.setTexture3D(k,0),yt=O.TEXTURE_3D):k.isDataArrayTexture||k.isCompressedArrayTexture?(q.setTexture2DArray(k,0),yt=O.TEXTURE_2D_ARRAY):(q.setTexture2D(k,0),yt=O.TEXTURE_2D),y.activeTexture(O.TEXTURE0),y.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,k.flipY),y.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,k.premultiplyAlpha),y.pixelStorei(O.UNPACK_ALIGNMENT,k.unpackAlignment);let si=y.getParameter(O.UNPACK_ROW_LENGTH),Jt=y.getParameter(O.UNPACK_IMAGE_HEIGHT),wi=y.getParameter(O.UNPACK_SKIP_PIXELS),Wi=y.getParameter(O.UNPACK_SKIP_ROWS),vn=y.getParameter(O.UNPACK_SKIP_IMAGES);y.pixelStorei(O.UNPACK_ROW_LENGTH,fe.width),y.pixelStorei(O.UNPACK_IMAGE_HEIGHT,fe.height),y.pixelStorei(O.UNPACK_SKIP_PIXELS,Et),y.pixelStorei(O.UNPACK_SKIP_ROWS,Ht),y.pixelStorei(O.UNPACK_SKIP_IMAGES,Zt);let Ts=b.isDataArrayTexture||b.isData3DTexture,re=k.isDataArrayTexture||k.isData3DTexture;if(b.isDepthTexture){let Ee=G.get(b),Mn=G.get(k),ue=G.get(Ee.__renderTarget),bn=G.get(Mn.__renderTarget);y.bindFramebuffer(O.READ_FRAMEBUFFER,ue.__webglFramebuffer),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,bn.__webglFramebuffer);for(let Es=0;Es<St;Es++)Ts&&(O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,G.get(b).__webglTexture,H,Zt+Es),O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,G.get(k).__webglTexture,mt,Le+Es)),O.blitFramebuffer(Et,Ht,vt,pt,wt,ne,vt,pt,O.DEPTH_BUFFER_BIT,O.NEAREST);y.bindFramebuffer(O.READ_FRAMEBUFFER,null),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else if(H!==0||b.isRenderTargetTexture||G.has(b)){let Ee=G.get(b),Mn=G.get(k);y.bindFramebuffer(O.READ_FRAMEBUFFER,I),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,U);for(let ue=0;ue<St;ue++)Ts?O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Ee.__webglTexture,H,Zt+ue):O.framebufferTexture2D(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Ee.__webglTexture,H),re?O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Mn.__webglTexture,mt,Le+ue):O.framebufferTexture2D(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Mn.__webglTexture,mt),H!==0?O.blitFramebuffer(Et,Ht,vt,pt,wt,ne,vt,pt,O.COLOR_BUFFER_BIT,O.NEAREST):re?O.copyTexSubImage3D(yt,mt,wt,ne,Le+ue,Et,Ht,vt,pt):O.copyTexSubImage2D(yt,mt,wt,ne,Et,Ht,vt,pt);y.bindFramebuffer(O.READ_FRAMEBUFFER,null),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else re?b.isDataTexture||b.isData3DTexture?O.texSubImage3D(yt,mt,wt,ne,Le,vt,pt,St,ae,Qe,fe.data):k.isCompressedArrayTexture?O.compressedTexSubImage3D(yt,mt,wt,ne,Le,vt,pt,St,ae,fe.data):O.texSubImage3D(yt,mt,wt,ne,Le,vt,pt,St,ae,Qe,fe):b.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,mt,wt,ne,vt,pt,ae,Qe,fe.data):b.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,mt,wt,ne,fe.width,fe.height,ae,fe.data):O.texSubImage2D(O.TEXTURE_2D,mt,wt,ne,vt,pt,ae,Qe,fe);y.pixelStorei(O.UNPACK_ROW_LENGTH,si),y.pixelStorei(O.UNPACK_IMAGE_HEIGHT,Jt),y.pixelStorei(O.UNPACK_SKIP_PIXELS,wi),y.pixelStorei(O.UNPACK_SKIP_ROWS,Wi),y.pixelStorei(O.UNPACK_SKIP_IMAGES,vn),mt===0&&k.generateMipmaps&&O.generateMipmap(yt),y.unbindTexture()},this.initRenderTarget=function(b){G.get(b).__webglFramebuffer===void 0&&q.setupRenderTarget(b)},this.initTexture=function(b){b.isCubeTexture?q.setTextureCube(b,0):b.isData3DTexture?q.setTexture3D(b,0):b.isDataArrayTexture||b.isCompressedArrayTexture?q.setTexture2DArray(b,0):q.setTexture2D(b,0),y.unbindTexture()},this.resetState=function(){V=0,$=0,et=null,y.reset(),gt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Fi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=Wt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Wt._getUnpackColorSpace()}};var le="#1b140c",Tr="#fbf5e6",bt={vermilion:"#d8462a",orange:"#ec8a3c",amber:"#f2b53f",bone:"#f6efdc",cream:"#efe3c4",cyan:"#9fd9e4",sky:"#7cc0d6",teal:"#6e8a8f",slate:"#4f5f63",brass:"#b8924f",blush:"#f2a08c",ink:le};function ve(n,{shine:t=""}={}){let e=[],i=[],s=[];for(let r of n)if(r.t==="fill")e.push(`<path d="${r.d}" fill="${Tr}" stroke="${Tr}" stroke-width="13" stroke-linejoin="round"/>`),i.push(`<path d="${r.d}" fill="${le}" opacity=".32" transform="translate(2.6 3.6)"/>`),s.push(`<path d="${r.d}" fill="${r.c}" stroke="${le}" stroke-width="${r.w??4.6}" stroke-linejoin="round"/>`);else if(r.t==="dot")e.push(`<circle cx="${r.x}" cy="${r.y}" r="${r.r+6}" fill="${Tr}"/>`),i.push(`<circle cx="${r.x+2.6}" cy="${r.y+3.6}" r="${r.r}" fill="${le}" opacity=".32"/>`),s.push(`<circle cx="${r.x}" cy="${r.y}" r="${r.r}" fill="${r.c}" stroke="${le}" stroke-width="${r.c===le?0:4.2}"/>`);else if(r.t==="line"){let o=r.w??7;e.push(`<path d="${r.d}" fill="none" stroke="${Tr}" stroke-width="${o+13}" stroke-linecap="round" stroke-linejoin="round"/>`),i.push(`<path d="${r.d}" fill="none" stroke="${le}" opacity=".32" stroke-width="${o+4.6}" stroke-linecap="round" stroke-linejoin="round" transform="translate(2.6 3.6)"/>`),s.push(`<path d="${r.d}" fill="none" stroke="${le}" stroke-width="${o+4.6}" stroke-linecap="round" stroke-linejoin="round"/>`),r.c!==le&&s.push(`<path d="${r.d}" fill="none" stroke="${r.c}" stroke-width="${o}" stroke-linecap="round" stroke-linejoin="round"/>`)}else r.t==="text"&&(e.push(`<text x="${r.x}" y="${r.y}" font-family="${r.font}" font-size="${r.size}" text-anchor="middle" fill="${Tr}" stroke="${Tr}" stroke-width="10" stroke-linejoin="round">${r.s}</text>`),s.push(`<text x="${r.x}" y="${r.y}" font-family="${r.font}" font-size="${r.size}" text-anchor="middle" fill="${r.c}" stroke="${le}" stroke-width="${r.c===le?0:2}" paint-order="stroke">${r.s}</text>`));return`<svg viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">${e.join("")}${i.join("")}${s.join("")}${t}</svg>`}var te=(n,t,e)=>({t:"fill",d:n,c:t,w:e}),pi=(n,t,e,i)=>({t:"dot",x:n,y:t,r:e,c:i}),jt=(n,t,e)=>({t:"line",d:n,c:t,w:e}),hg=(n,t,e,i,s,r="Yuji Syuku, serif")=>({t:"text",s:n,x:t,y:e,size:i,c:s,font:r}),Er=(n,t=4)=>`<path d="${n}" fill="none" stroke="#fff" stroke-width="${t}" stroke-linecap="round" opacity=".85"/>`;function Sd(n,t,e,i,s,r=-90){let o=[];for(let a=0;a<s*2;a++){let l=(r+a*180/s)*Math.PI/180,c=a%2?i:e;o.push(`${(n+Math.cos(l)*c).toFixed(1)} ${(t+Math.sin(l)*c).toFixed(1)}`)}return`M${o.join(" L")} Z`}function bd(n,t,e){return`M${n} ${t-e} Q${n} ${t} ${n+e} ${t} Q${n} ${t} ${n} ${t+e} Q${n} ${t} ${n-e} ${t} Q${n} ${t} ${n} ${t-e} Z`}function eS(n,t,e,i){return Sd(n,t,e,i,5,-90)}var Dc=(n,t,e)=>`M${n} ${t} q${-12*e} 0 ${-12*e} ${-11*e} q0 ${-12*e} ${13*e} ${-12*e} q${3*e} ${-12*e} ${17*e} ${-11*e} q${12*e} ${-6*e} ${21*e} ${4*e} q${13*e} ${-1*e} ${14*e} ${11*e} q${9*e} ${3*e} ${6*e} ${13*e} q${-2*e} ${6*e} ${-10*e} ${6*e} Z`,iS="M12 30 Q12 14 30 14 L74 14 Q90 14 90 30 L90 50 Q90 66 74 66 L48 66 L28 86 L33 66 L30 66 Q12 66 12 50 Z",Nc=Object.freeze({surprise:{label:"Surprise",motion:"shake",svg:ve([te(Sd(50,50,48,30,11),bt.vermilion),te("M43 18 L57 18 L54.5 58 L45.5 58 Z",bt.bone),pi(50,72,7,bt.bone)])},question:{label:"Question",motion:"tilt",svg:ve([jt("M33 34 C33 17 47 11 56 12 C69 14 73 26 69 35 C65 44 53 46 51 56 L51 61",bt.bone,11),pi(51,80,7.5,bt.bone)])},shock:{label:"What?!",motion:"shake",svg:ve([te("M24 16 L37 16 L34.5 58 L26.5 58 Z",bt.vermilion),pi(30.5,74,6.5,bt.vermilion),jt("M52 34 C52 20 63 15 70 16 C81 18 84 27 81 35 C78 42 69 44 67 52 L67 57",bt.vermilion,10),pi(67,74,6.5,bt.vermilion)])},sweat:{label:"Sweat",motion:"drip",svg:ve([te("M60 6 C60 6 30 44 30 62 A23 23 0 0 0 76 64 C76 45 60 6 60 6 Z",bt.cyan)],{shine:Er("M43 58 Q41 67 48 74",5)})},anger:{label:"Anger",motion:"pulse",svg:ve([jt("M18 42 Q38 40 41 18",bt.vermilion,10),jt("M59 18 Q62 40 82 42",bt.vermilion,10),jt("M82 58 Q62 60 59 82",bt.vermilion,10),jt("M41 82 Q38 60 18 58",bt.vermilion,10)])},sparkle:{label:"Sparkle",motion:"twinkle",svg:ve([te(bd(48,50,36),bt.amber),te(bd(82,18,13),bt.bone),te(bd(20,82,11),bt.bone)])},heart:{label:"Fond",motion:"float",svg:ve([te("M50 86 C20 63 10 45 21 30 C32 15 47 21 50 34 C53 21 68 15 79 30 C90 45 80 63 50 86 Z",bt.vermilion)],{shine:Er("M28 36 Q30 28 37 27",5)})},music:{label:"Humming",motion:"float",svg:ve([te("M38 22 L80 12 L80 24 L38 34 Z",le),jt("M40 28 L40 70",le,5),jt("M78 18 L78 60",le,5),te("M20 74 C20 66 30 62 38 64 C46 66 47 74 40 79 C33 84 20 82 20 74 Z",le),te("M58 66 C58 58 68 54 76 56 C84 58 85 66 78 71 C71 76 58 74 58 66 Z",le)])},sleep:{label:"Asleep",motion:"float",svg:ve([jt("M54 14 L84 14 L54 44 L84 44",bt.bone,7),jt("M32 50 L52 50 L32 70 L52 70",bt.bone,6),jt("M16 76 L30 76 L16 90 L30 90",bt.bone,5)])},gloom:{label:"Gloom",motion:"fall",svg:ve([jt("M24 40 L24 86",bt.teal,5),jt("M38 44 L38 92",bt.teal,5),jt("M52 40 L52 80",bt.teal,5),jt("M66 44 L66 90",bt.teal,5),jt("M80 40 L80 82",bt.teal,5),te(Dc(30,34,1.5),bt.slate)])},idea:{label:"Idea",motion:"flicker",svg:ve([jt("M50 2 L50 10",bt.amber,5),jt("M18 14 L24 20",bt.amber,5),jt("M82 14 L76 20",bt.amber,5),jt("M8 44 L16 44",bt.amber,5),jt("M92 44 L84 44",bt.amber,5),te("M50 16 A25 25 0 0 1 67 58 L63 68 L37 68 L33 58 A25 25 0 0 1 50 16 Z",bt.amber),te("M37 72 L63 72 L60 86 L40 86 Z",bt.brass)],{shine:Er("M38 34 Q40 26 48 24",5)})},fume:{label:"Fuming",motion:"rise",svg:ve([te(Dc(26,92,1.1),bt.bone),te(Dc(52,62,1.3),bt.bone),te(Dc(30,34,1.05),bt.bone)])},dizzy:{label:"Dizzy",motion:"spin",svg:ve([jt("M50 50 m0 -5 a5 5 0 1 1 -5 5 a10 10 0 1 1 10 10 a15 15 0 1 1 -15 -15 a20 20 0 1 1 20 20 a25 25 0 1 1 -25 -25 a30 30 0 1 1 30 30",bt.orange,6)])},ellipsis:{label:"\u2026",motion:"bob",svg:ve([te(iS,bt.bone),pi(32,40,6,le),pi(51,40,6,le),pi(70,40,6,le)])},laugh:{label:"Laughing",motion:"shake",svg:ve([te(Sd(50,44,46,36,14,0),bt.amber),hg("ha!",50,58,38,le)])},shiver:{label:"Shiver",motion:"shake",svg:ve([jt("M14 22 L24 32 L14 42 L24 52 L14 62 L24 72",bt.cyan,5),jt("M86 22 L76 32 L86 42 L76 52 L86 62 L76 72",bt.cyan,5),jt("M50 8 L58 16 L50 24 L58 32",bt.cyan,4)])},tear:{label:"Tears",motion:"drip",svg:ve([te("M40 14 C40 14 18 42 18 56 A20 20 0 0 0 58 58 C58 42 40 14 40 14 Z",bt.sky),te("M74 46 C74 46 62 62 62 70 A12 12 0 0 0 86 71 C86 62 74 46 74 46 Z",bt.sky)],{shine:Er("M28 52 Q27 60 32 65",4)})},blush:{label:"Blush",motion:"pulse",svg:ve([te("M8 54 C8 44 34 42 38 52 C42 62 12 66 8 54 Z",bt.blush),te("M62 52 C66 42 92 44 92 54 C88 66 58 62 62 52 Z",bt.blush),jt("M14 56 L22 46",bt.vermilion,3),jt("M22 58 L30 48",bt.vermilion,3),jt("M70 58 L78 48",bt.vermilion,3),jt("M78 58 L86 48",bt.vermilion,3)])},whisper:{label:"Psst",motion:"bob",svg:ve([te("M10 20 Q10 8 24 8 L76 8 Q90 8 90 20 L90 46 Q90 58 76 58 L30 58 Q10 58 10 46 Z",bt.cream),hg("psst",50,42,26,le,"Special Elite, monospace"),pi(30,70,4,bt.cream),pi(22,82,3,bt.cream),pi(16,92,2.4,bt.cream)])},think:{label:"Thinking",motion:"bob",svg:ve([te("M30 64 C14 64 10 50 18 42 C12 30 24 18 36 22 C42 8 64 8 70 20 C84 18 94 32 86 44 C94 56 82 68 70 64 C62 74 40 74 30 64 Z",bt.bone),pi(24,80,6,bt.bone),pi(14,92,4,bt.bone)])},skull:{label:"Doomed",motion:"tilt",svg:ve([te("M50 10 C26 10 14 26 16 46 C17 58 26 62 30 64 L30 80 L70 80 L70 64 C74 62 83 58 84 46 C86 26 74 10 50 10 Z",bt.bone),pi(37,44,9,le),pi(63,44,9,le),te("M46 58 L50 50 L54 58 Z",le),jt("M40 70 L40 80",le,3),jt("M50 70 L50 80",le,3),jt("M60 70 L60 80",le,3)])},star:{label:"Well done",motion:"twinkle",svg:ve([te(eS(50,52,44,19),bt.amber)],{shine:Er("M42 30 Q46 22 50 20",4)})},hand:{label:"Hand up",motion:"wave",svg:ve([te("M30 92 L30 46 Q30 38 37 38 Q44 38 44 46 L44 24 Q44 16 51 16 Q58 16 58 24 L58 30 Q58 22 65 22 Q72 22 72 30 L72 40 Q72 33 79 33 Q86 33 86 40 L86 70 Q86 92 64 94 L44 94 Q32 94 30 92 Z",bt.orange)])},bowl:{label:"Hungry",motion:"bob",svg:ve([jt("M36 8 Q30 16 36 24 Q42 32 36 40",bt.bone,4),jt("M54 4 Q48 14 54 22 Q60 30 54 38",bt.bone,4),te("M10 48 L90 48 Q88 80 58 86 L42 86 Q12 80 10 48 Z",bt.vermilion),te("M34 86 L66 86 L62 94 L38 94 Z",bt.brass)],{shine:Er("M20 56 Q24 70 34 76",4)})}}),kA=Object.freeze(["surprise","question","shock","sweat","anger","sparkle","heart","music","sleep","gloom","idea","fume","dizzy","ellipsis","laugh","shiver","tear","blush","whisper","think","skull","star","hand","bowl"]),DA=Object.freeze(["surprise","laugh","sweat","heart","anger","idea","ellipsis","whisper"]);var OA=Object.freeze(["high","low","flat"]),FA=Object.freeze(["lights","shadows","post","particles","marks","zoneOutlines","chalk","camera","capture","footlights"]);function ug(n){return n==="low"?{post:!1,shadows:!1,msaa:0,pixelRatioCap:1,dust:120,sparks:24,footlights:!1}:{post:!0,shadows:!0,msaa:4,pixelRatioCap:2,dust:420,sparks:48,footlights:!0}}function Oc(n,t,e,i,s=null){let r=[],o=!1;for(let a of n){let l=t[a.id]??"rest";l==="target"&&(o=!0),r.push(`${a.id}:${l}:${Kh(a,l,e).toFixed(2)}`)}return s&&r.push(`B${Object.entries(s.counts??{}).map(([a,l])=>`${a}=${l}/${s.downs?.[a]??0}`).join(",")}`),r.join("|")+(o?`|t${Math.floor(i*20)}`:"")}var dg=Object.freeze([[240,186,92],[112,196,222],[226,118,104],[146,208,126],[196,150,232],[242,150,72],[230,220,140]]);function fg(n){let t=n.reduce((s,r)=>s+r[0],0)/n.length,e=Math.min(...n.map(s=>s[1])),i=Math.max(...n.map(s=>s[1]));return[t,e+(i-e)*.32]}function pg(n){return fg(n.floor??n.shape)}function nS(n,t,e,i,s,r,o,{labels:a=!0}={}){let l=i.filter(h=>h.kind==="area"),c=new Map;l.forEach((h,u)=>{let d=(h.floor??h.shape).map(([v,E])=>[v*t,E*e]),[f,x,g]=h.colour??dg[u%dg.length],p=r?.[h.id]==="target",m=()=>{n.beginPath(),d.forEach(([v,E],M)=>M?n.lineTo(v,E):n.moveTo(v,E)),n.closePath()};n.save(),m(),n.fillStyle=`rgba(${f},${x},${g},${p?.3:.17})`,n.fill(),n.lineJoin="round",n.setLineDash([18,9]),n.lineDashOffset=p?-o*60:0,m(),n.strokeStyle="rgba(16,10,5,0.6)",n.lineWidth=7,n.stroke(),m(),n.strokeStyle=`rgba(${f},${x},${g},0.95)`,n.lineWidth=p?4.5:3.2,n.stroke(),n.restore(),c.set(h.id,fg(d))}),n.save(),n.setLineDash([10,10]),n.lineCap="round";for(let{a:h,b:u}of s.bands??[]){let d=c.get(h),f=c.get(u);!d||!f||(n.beginPath(),n.moveTo(d[0],d[1]+30),n.lineTo(f[0],f[1]+30),n.strokeStyle="rgba(16,10,5,0.45)",n.lineWidth=6,n.stroke(),n.strokeStyle="rgba(255,236,200,0.7)",n.lineWidth=2.6,n.stroke())}n.restore(),a&&l.forEach(h=>{let[u,d]=c.get(h.id);n.save(),n.textAlign="center",n.font='600 30px "Shippori Mincho", "Hiragino Mincho ProN", serif',n.lineWidth=7,n.strokeStyle="rgba(16,10,5,0.78)",n.strokeText(h.name||h.id,u,d),n.fillStyle="rgba(255,240,212,1)",n.fillText(h.name||h.id,u,d);let f=s.counts?.[h.id]??0,x=s.downs?.[h.id]??0,g=[...(h.tags??[]).map(p=>p.toUpperCase()),f?`${f} HERE`:null,x?`${x} DOWN`:null].filter(Boolean);if(g.length){n.font="700 15px system-ui, sans-serif";let p=g.map(v=>n.measureText(v).width+18),m=u-(p.reduce((v,E)=>v+E,0)+6*(g.length-1))/2;g.forEach((v,E)=>{let M=v.endsWith(" HERE");gg(n,m+p[E]/2,d+24,v,15,M?"rgba(20,12,6,0.95)":"rgba(255,236,200,0.95)",M?"rgba(255,190,110,0.95)":"rgba(16,10,5,0.72)"),m+=p[E]+6})}n.restore()})}function mg(n,t=0,e=0){let i=n.name||n.id,s=[...(n.tags??[]).map(x=>x.toUpperCase()),t?`${t} HERE`:null,e?`${e} DOWN`:null].filter(Boolean),r=Ar(8,8).getContext("2d");r.font='600 34px "Shippori Mincho", "Hiragino Mincho ProN", serif';let o=r.measureText(i).width;r.font="700 17px system-ui, sans-serif";let a=s.map(x=>r.measureText(x).width+20),l=a.reduce((x,g)=>x+g,0)+7*Math.max(0,s.length-1),c=Math.ceil(Math.max(o+24,l+12)),h=s.length?84:50,u=Ar(c*2,h*2),d=u.getContext("2d");d.scale(2,2),d.textAlign="center",d.font='600 34px "Shippori Mincho", "Hiragino Mincho ProN", serif',d.lineJoin="round",d.lineWidth=7,d.strokeStyle="rgba(16,10,5,0.82)",d.strokeText(i,c/2,36),d.fillStyle="rgba(255,240,212,1)",d.fillText(i,c/2,36);let f=c/2-l/2;return s.forEach((x,g)=>{let p=x.endsWith(" HERE"),m=x.endsWith(" DOWN");gg(d,f+a[g]/2,64,x,17,p||m?"rgba(20,12,6,0.95)":"rgba(255,236,200,0.95)",p?"rgba(255,190,110,0.95)":m?"rgba(170,160,150,0.9)":"rgba(16,10,5,0.75)"),f+=a[g]+7}),{canvas:u,w:c,h}}function gg(n,t,e,i,s,r,o){n.save(),n.font=`700 ${s}px system-ui, sans-serif`,n.textAlign="center",n.textBaseline="middle";let a=n.measureText(i).width+16,l=s+10;n.setLineDash([]),n.beginPath(),n.roundRect(t-a/2,e-l/2,a,l,l/2),n.fillStyle=o,n.fill(),n.fillStyle=r,n.fillText(i,t,e+1),n.restore()}function Fc(n,t,e,i,s,r,o,a=null,{boardLabels:l=!0}={}){n.clearRect(0,0,t,e),a&&nS(n,t,e,i,a,s,o,{labels:l});for(let c of i){if(a&&c.kind==="area")continue;let h=s[c.id]??"rest",u=Kh(c,h,r);if(u<=.01)continue;let d=c.shape.map(([g,p])=>[g*t,p*e]),f=()=>{n.beginPath(),d.forEach(([g,p],m)=>m?n.lineTo(g,p):n.moveTo(g,p)),n.closePath()},x=h==="target";if(n.lineJoin="round",n.setLineDash([14,11]),n.lineDashOffset=x?-o*60:0,f(),n.strokeStyle=`rgba(20,12,6,${.55*u})`,n.lineWidth=6,n.stroke(),f(),n.strokeStyle=x?`rgba(255,150,70,${u})`:`rgba(255,222,170,${.9*u})`,n.lineWidth=x?4:2.4,n.stroke(),n.setLineDash([]),u>=.8&&c.name){let g=d.reduce((m,v)=>m+v[0],0)/d.length,p=Math.min(...d.map(m=>m[1]))-10;n.font='600 30px "Shippori Mincho", "Hiragino Mincho ProN", serif',n.textAlign="center",n.lineWidth=7,n.strokeStyle=`rgba(20,12,6,${.7*u})`,n.strokeText(c.name,g,p),n.fillStyle=`rgba(255,236,200,${u})`,n.fillText(c.name,g,p),c.hint&&(n.font="600 20px sans-serif",n.lineWidth=5,n.strokeStyle=`rgba(20,12,6,${.7*u})`,n.strokeText(c.hint.toUpperCase(),g,p+26),n.fillStyle=`rgba(255,222,170,${.85*u})`,n.fillText(c.hint.toUpperCase(),g,p+26))}}}var Ar=(n,t)=>{let e=document.createElement("canvas");return e.width=n,e.height=t,e};function xg(){let n=Ar(64,64),t=n.getContext("2d"),e=t.createRadialGradient(32,32,0,32,32,32);return e.addColorStop(0,"rgba(255,255,255,1)"),e.addColorStop(.35,"rgba(255,255,255,0.5)"),e.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=e,t.fillRect(0,0,64,64),n}function Uc(){let n=Ar(256,256),t=n.getContext("2d");t.translate(128,128),t.lineCap="round";let e=9;for(let[i,s]of[[20,"#1b140c"],[10,"#e6c98d"]]){t.strokeStyle=s,t.lineWidth=i;for(let r=0;r<e;r++){let o=r/e*Math.PI*2+.3,a=120*(.72+.28*(r*7%3/2));t.beginPath(),t.moveTo(Math.cos(o)*46,Math.sin(o)*46),t.lineTo(Math.cos(o)*a,Math.sin(o)*a),t.stroke()}}t.fillStyle="#fff7d6",t.strokeStyle="#1b140c",t.lineWidth=6,t.beginPath();for(let i=0;i<16;i++){let s=i/16*Math.PI*2,r=i%2?18:40;t[i?"lineTo":"moveTo"](Math.cos(s)*r,Math.sin(s)*r)}return t.closePath(),t.fill(),t.stroke(),n}function Bc(){let n=Ar(256,160),t=n.getContext("2d");t.lineCap="round";let e=(i,s)=>{t.strokeStyle=s,t.lineWidth=i;for(let[r,o]of[[-1,-1],[1,-1],[-1,1],[1,1]]){let a=128+r*100,l=80+o*56;t.beginPath(),t.moveTo(a-r*34,l),t.lineTo(a,l),t.lineTo(a,l-o*30),t.stroke()}};return e(13,"rgba(20,12,6,0.7)"),e(7,"#e6c98d"),t.setLineDash([2,12]),t.strokeStyle="rgba(255,226,170,0.75)",t.lineWidth=5,t.beginPath(),t.ellipse(128,80,66,36,0,0,Math.PI*2),t.stroke(),n}function zc(n){let t=Ar(512,96),e=t.getContext("2d");return e.font='700 40px "Helvetica Neue", Arial, sans-serif',e.textAlign="center",e.textBaseline="middle",e.lineWidth=9,e.strokeStyle="rgba(20,12,6,0.8)",e.strokeText(n.toUpperCase(),256,48),e.fillStyle="#ffe9c4",e.fillText(n.toUpperCase(),256,48),t}var ys=class{constructor(){this.byUrl=new Map}loadImage=t=>t?(this.byUrl.has(t)||this.byUrl.set(t,new Promise(e=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>e(i),i.onerror=()=>e(null),i.src=t})),this.byUrl.get(t)):Promise.resolve(null)};var _s=Math.PI/180,Hc=class{constructor(){this.items=new Set}add(t){return t&&this.items.add(t),t}mesh(t){this.add(t.geometry);for(let e of[].concat(t.material)){this.add(e);for(let i of Object.values(e))i?.isTexture&&this.add(i)}return t}disposeAll(){for(let t of this.items)t.dispose?.();this.items.clear()}get size(){return this.items.size}};function ai(n,{anisotropy:t=8,srgb:e=!0}={}){let i=new Eo(n);return e&&(i.colorSpace=Se),i.anisotropy=t,i}var yg=()=>ai(xg(),{anisotropy:1}),_g=()=>ai(Uc());function wd(n,t,e){let{f:i,cx:s,cy:r,floorY:o}=t.cam,a=20,l=3e4;n.position.set(0,o-r,i),n.projectionMatrix.makePerspective(-a*(s-e.ox)/i,a*(e.ox+e.visW-s)/i,a*(r-e.oy)/i,-a*(e.oy+e.visH-r)/i,a,l),n.projectionMatrixInverse.copy(n.projectionMatrix).invert(),n.updateProjectionMatrix=()=>{},n.updateMatrixWorld(!0)}function ia(n,t,e,i){let{f:s,cx:r,cy:o,floorY:a}=n.cam;return new D((t-r)*(s-i)/s,a-o-(e-o)*(s-i)/s,i)}var Gc=n=>n.cam.f/(Ea.H/2);function na(n,t,e=0,i=null,s=null){let[r,o]=n.size,a=r*n.map.s,l=o*n.map.s,{x0:c,y0:h,x1:u,y1:d}=i??{x0:0,y0:0,x1:1,y1:1},f=-Ti+e,x=(n.cam.f-f)/n.cam.f,g=new Ft(s??new Ce(1,1),t);return g.position.copy(ia(n,n.map.ox+a*(c+u)/2,n.map.oy+l*(h+d)/2,f)),g.scale.set(a*(u-c)*x,l*(d-h)*x,1),g}var sS=32e5,Vc=class{constructor({scene:t,rig:e,tracker:i,softDot:s,settings:r}){this.description=t,this.rig=e,this.T=i,this.softDot=s,this.settings=r,this.group=new Ue,this.lights=[],this.lanterns=[],this.foot=[],this.dust=null}async build(t){let{rig:e,description:i,T:s}=this,r=s.add(new Be(t));r.colorSpace=Se,r.anisotropy=8,r.generateMipmaps=!0,r.minFilter=tn,r.needsUpdate=!0,this.paintTex=r;let[o,a]=e.size,l=o*e.map.s,c=a*e.map.s,h=s.mesh(new Ft(new Ce(1,1),new Te({map:r,color:14474460})));h.position.copy(ia(e,e.map.ox+l/2,e.map.oy+c/2,-Ti)),h.scale.set(l*(e.cam.f+Ti)/e.cam.f,c*(e.cam.f+Ti)/e.cam.f,1),this.group.add(h),this.backdrop=h,this.#e(r,l,c);for(let d of i.occluders){let f=e.standing([d.x,d.base]);if(!f)continue;let x=d.poly.map(C=>C[0]),g=d.poly.map(C=>C[1]),p=[Math.min(...x),Math.min(...g),Math.max(...x),Math.max(...g)],m=[],v=[],E=[];for(let[C,_]of d.poly){let S=ia(e,e.map.x(C),e.map.y(_),f.Z);m.push(S.x,S.y,S.z),v.push(C,1-_),E.push((C-p[0])/(p[2]-p[0]||1),1-(_-p[1])/(p[3]-p[1]||1))}let M=new _e;M.setAttribute("position",new Yt(m,3)),M.setAttribute("uv",new Yt(v,2)),M.setAttribute("uv1",new Yt(E,2)),M.setIndex(d.poly.length===4?[0,2,1,0,3,2]:rS(d.poly.length));let T=this.#t(d.poly,p),w=s.mesh(new Ft(M,new Te({map:r,color:14474460,side:hi,...T?{alphaMap:T,transparent:!0}:{}})));w.renderOrder=3,this.group.add(w)}let u=s.mesh(new Ft(new Ce(24e3,24e3),new ur({opacity:.62,depthWrite:!1})));return u.rotation.x=-Math.PI/2,u.receiveShadow=!0,u.renderOrder=2,this.group.add(u),this.floor=u,this.ambient=new No(16765600,i.ambient),this.group.add(this.ambient),i.lights.forEach((d,f)=>this.#i(d,f)),this.#n(),this.#s(),this}#t(t,[e,i,s,r]){let{rig:o,T:a}=this,[l,c]=o.size,h=(s-e)*l*o.map.s,u=(r-i)*c*o.map.s;if(!(h>0&&u>0))return null;let d=256,f=Math.max(32,Math.min(512,Math.round(d*u/h))),x=Math.min(ka,u*Da)/u*f,g=Na(t.map(([v,E])=>[(v-e)/(s-e)*d,(E-i)/(r-i)*f]),d,f,x),p=new Uint8Array(d*f*4);for(let v=0;v<f;v++)for(let E=0;E<d;E++){let M=g[v*d+E],T=((f-1-v)*d+E)*4;p[T]=p[T+1]=p[T+2]=p[T+3]=M}let m=a.add(new lr(p,d,f,fi));return m.magFilter=Ne,m.minFilter=Ne,m.channel=1,m.needsUpdate=!0,m}#e(t,e,i){let{rig:s,T:r}=this,o=s.map.oy+i,a=s.ref.H-o+600;if(a<=0)return;let l=Math.min(a,i*.6),c=s.cam.f+Ti,h=new Ce(1,1),u=h.attributes.uv;for(let f=0;f<u.count;f++)u.setY(f,u.getY(f)===1?0:l/i);let d=r.mesh(new Ft(h,new Te({map:t,color:9079434})));d.position.copy(ia(s,s.map.ox+e/2,o+l/2,-Ti)),d.scale.set(e*c/s.cam.f,l*c/s.cam.f,1),this.group.add(d)}#i(t,e){let{rig:i,T:s}=this,r=i.standing([t.at[0],t.below]);if(!r)return;let{cx:o,cy:a,f:l,floorY:c}=i.cam,h=l/(l-r.Z),u=o+(i.map.x(t.at[0])-o)/h,d=a+(i.map.y(t.at[1])-a)/h,f=new D(u-o,c-d,r.Z),x=new At(t.colour[0]/255,t.colour[1]/255,t.colour[2]/255),g=new mr(x,0,0,1.2,.9,2);if(g.position.copy(f),g.target.position.set(f.x,0,f.z),g.userData={base:t.intensity*sS,flicker:t.flicker,hz:t.flickerHz,seed:e+1},t.shadow&&this.settings.shadows&&(g.castShadow=!0,g.shadow.mapSize.set(1024,1024),g.shadow.bias=-4e-4,g.shadow.radius=5,g.shadow.camera.near=30,g.shadow.camera.far=3e3),this.group.add(g,g.target),this.lights.push(g),this.lanterns.push({pos:f,colour:x}),t.pool){let p=s.mesh(new Ft(new Co(t.pool*.62,48),new Te({map:this.softDot,color:x,transparent:!0,opacity:.38,blending:Mi,depthWrite:!1})));p.rotation.x=-Math.PI/2,p.position.set(f.x,1,f.z),p.renderOrder=1,this.group.add(p)}}#n(){let{T:t}=this;for(let e of[-1,1]){let i=new mr(16761466,0,0,.66,.75,2);i.position.set(e*640,26,360),i.target.position.set(e*140,340,-420),i.userData={base:23e5},i.visible=!1,this.settings.shadows&&(i.castShadow=!0,i.shadow.mapSize.set(1024,1024),i.shadow.bias=-5e-4,i.shadow.radius=4,i.shadow.camera.near=40,i.shadow.camera.far=2800),this.group.add(i,i.target),this.foot.push(i)}this.wall=t.mesh(new Ft(new Ce(7e3,2600),new ur({opacity:.72,depthWrite:!1}))),this.wall.position.set(0,1300,-2300),this.wall.receiveShadow=!0,this.wall.renderOrder=2,this.wall.visible=!1,this.group.add(this.wall)}setFootlights(t){t=!!t&&this.settings.footlights;for(let e of this.foot)e.visible=t,e.intensity=t?e.userData.base:0;this.wall.visible=t,this.ambient.intensity=t?this.description.ambient*.75:this.description.ambient,this.footlightsOn=t}#s(){let t=this.settings.dust;if(!t)return;let e=new Float32Array(t*3),i=7,s=()=>(i=i*16807%2147483647,i/2147483647);for(let a=0;a<t;a++)e[a*3]=(s()-.5)*2600,e[a*3+1]=40+s()*820,e[a*3+2]=-520+s()*760;let r=this.T.add(new _e);r.setAttribute("position",new De(e.slice(),3)),r.setAttribute("color",new De(new Float32Array(t*3),3));let o=this.T.add(new Nn({size:8*Gc(this.rig),map:this.softDot,vertexColors:!0,transparent:!0,opacity:.9,blending:Mi,depthWrite:!1,sizeAttenuation:!0}));this.dust=new us(r,o),this.dust.frustumCulled=!1,this.dustBase=e,this.group.add(this.dust)}update(t){for(let r of this.lights){let o=r.userData;r.intensity=o.base*(1+o.flicker*Yr(t*o.hz,o.seed))}if(!this.dust)return;let e=this.dust.geometry.attributes.position,i=this.dust.geometry.attributes.color,s=this.dustBase;for(let r=0;r<e.count;r++){let o=s[r*3]+Math.sin(t*.21+r)*22,a=s[r*3+1]+t*(4+r%7)%120,l=s[r*3+2];e.array[r*3]=o,e.array[r*3+1]=a,e.array[r*3+2]=l;let c=0,h=0,u=0;for(let d of this.lanterns){let f=(o-d.pos.x)**2+(a-d.pos.y)**2+(l-d.pos.z)**2,x=Math.max(0,1-Math.sqrt(f)/900);c+=d.colour.r*x*x,h+=d.colour.g*x*x,u+=d.colour.b*x*x}i.array[r*3]=Math.min(1,c),i.array[r*3+1]=Math.min(1,h),i.array[r*3+2]=Math.min(1,u)}e.needsUpdate=!0,i.needsUpdate=!0}};function rS(n){let t=[];for(let e=1;e<n-1;e++)t.push(0,e+1,e);return t}var sa=new D;function Ri(n,t,e,i,s,r){let o=2*Math.PI*s/4,a=Math.max(r-2*s,0),l=Math.PI/4;sa.copy(t),sa[i]=0,sa.normalize();let c=.5*o/(o+a),h=1-sa.angleTo(n)/l;return Math.sign(sa[e])===1?h*c:a/(o+a)+c+c*(1-h)}var Wc=class n extends ii{constructor(t=1,e=1,i=1,s=2,r=.1){let o=s*2+1;if(r=Math.min(t/2,e/2,i/2,r),super(1,1,1,o,o,o),this.type="RoundedBoxGeometry",this.parameters={width:t,height:e,depth:i,segments:s,radius:r},o===1)return;let a=this.toNonIndexed();this.index=null,this.attributes.position=a.attributes.position,this.attributes.normal=a.attributes.normal,this.attributes.uv=a.attributes.uv;let l=new D,c=new D,h=new D(t,e,i).divideScalar(2).subScalar(r),u=this.attributes.position.array,d=this.attributes.normal.array,f=this.attributes.uv.array,x=u.length/6,g=new D,p=.5/o;for(let m=0,v=0;m<u.length;m+=3,v+=2)switch(l.fromArray(u,m),c.copy(l),c.x-=Math.sign(c.x)*p,c.y-=Math.sign(c.y)*p,c.z-=Math.sign(c.z)*p,c.normalize(),u[m+0]=h.x*Math.sign(l.x)+c.x*r,u[m+1]=h.y*Math.sign(l.y)+c.y*r,u[m+2]=h.z*Math.sign(l.z)+c.z*r,d[m+0]=c.x,d[m+1]=c.y,d[m+2]=c.z,Math.floor(m/x)){case 0:g.set(1,0,0),f[v+0]=Ri(g,c,"z","y",r,i),f[v+1]=1-Ri(g,c,"y","z",r,e);break;case 1:g.set(-1,0,0),f[v+0]=1-Ri(g,c,"z","y",r,i),f[v+1]=1-Ri(g,c,"y","z",r,e);break;case 2:g.set(0,1,0),f[v+0]=1-Ri(g,c,"x","z",r,t),f[v+1]=Ri(g,c,"z","x",r,i);break;case 3:g.set(0,-1,0),f[v+0]=1-Ri(g,c,"x","z",r,t),f[v+1]=1-Ri(g,c,"z","x",r,i);break;case 4:g.set(0,0,1),f[v+0]=1-Ri(g,c,"x","y",r,t),f[v+1]=1-Ri(g,c,"y","x",r,e);break;case 5:g.set(0,0,-1),f[v+0]=Ri(g,c,"x","y",r,t),f[v+1]=1-Ri(g,c,"y","x",r,e);break}}static fromJSON(t){return new n(t.width,t.height,t.depth,t.segments,t.radius)}};var vg=typeof Intl<"u"&&Intl.Segmenter?new Intl.Segmenter(void 0,{granularity:"grapheme"}):null,oS=n=>vg?[...vg.segment(n)].map(t=>t.segment):[...n];function aS(n){let t=String(n??"").replace(/\s+/g," ").trim(),e=oS(t);return e.length<=16?t:`${e.slice(0,15).join("")}\u2026`}function Zn(n){if(!Array.isArray(n))return[];let t=[];for(let e of n){let i=aS(typeof e=="string"||typeof e=="number"?e:e?.label);if(i&&!t.includes(i)&&t.push(i),t.length===4)break}return t}var Mg=(n,t)=>JSON.stringify(Zn(n))===JSON.stringify(Zn(t));var lS=360;function cS(n,t){let e=Zn(t?.badges);if(!e.length||!n?.getContext)return n;let i=n.getContext("2d"),s=n.width/lS,r=21*s,o=9*s,a=6*s,l=14*s;i.save(),i.font=`700 ${r}px sans-serif`,i.textBaseline="middle";let c=l;for(let h of e){let u=Math.min(n.width*.6,i.measureText(h).width+o*2),d=r+o;i.fillStyle="rgba(24,16,8,0.88)",hS(i,l,c,u,d,d/2),i.fill(),i.strokeStyle="rgba(255,226,160,0.85)",i.lineWidth=Math.max(1,1.5*s),i.stroke(),i.fillStyle="#fff4d6",i.fillText(h,l+o,c+d/2+s,u-o*2),c+=d+a}return i.restore(),n}function hS(n,t,e,i,s,r){n.beginPath(),n.moveTo(t+r,e),n.arcTo(t+i,e,t+i,e+s,r),n.arcTo(t+i,e+s,t,e+s,r),n.arcTo(t,e+s,t,e,r),n.arcTo(t,e,t+i,e,r),n.closePath()}async function Cr(n,t,e){return cS(await n.face(t,e),t)}var Xc=class{constructor(t,e,i,s){this.id=t.id,this.person=t,this.skin=e,this.ctx=i,this.s=s,this.w=e.size.w,this.h=e.size.h,this.stickLen=(e.stick?.length??134)*s,this.root=new Ue,this.root.userData.cardId=t.id,this.emote=null,this.ghostTexture=null}async build(){let{skin:t,ctx:e,person:i}=this,s=e.tracker,r=t.materials??{},o=s.add(new je({color:r.body?.color??15196109,metalness:r.body?.metalness??0,roughness:r.body?.roughness??.9})),a=this.#t(),[l,c]=await Promise.all([Cr(t,i,a),t.back(i,a)]);this.leanG=new Ue,this.hinge=new Ue,this.yawG=new Ue,this.yawG.rotation.order="YXZ",this.root.add(this.leanG),this.leanG.add(this.hinge),this.hinge.add(this.yawG);let h=this.w,u=this.h,d=s.mesh(new Ft(new Wc(h-3,u-3,t.thickness,3,6),o));d.position.y=u/2,d.castShadow=!0;let f=s.add(ai(l));this.faceTex=f,this.ghostTexture=f;let x=s.mesh(new Ft(new Ce(h,u),new fr({map:f,roughness:r.face?.roughness??.5,metalness:r.face?.metalness??.1,clearcoat:r.face?.clearcoat??.6,clearcoatRoughness:.22,transparent:!0,alphaTest:.5,envMapIntensity:.7})));x.position.set(0,u/2,t.thickness/2+.2),x.receiveShadow=!0,this.faceMaterial=x.material,this.backTex=s.add(ai(c));let g=s.mesh(new Ft(new Ce(h,u),new je({map:this.backTex,roughness:r.back?.roughness??.62,metalness:r.back?.metalness??.35,transparent:!0,alphaTest:.5})));g.position.set(0,u/2,-(t.thickness/2+.2)),g.rotation.y=Math.PI;let p=s.mesh(new Ft(new ii(h*.5,12,54),o));if(p.position.set(0,-6,0),p.castShadow=!0,this.card=new Ue,this.card.add(d,x,g,p),i.colour){let m=s.mesh(new Ft(new ii(h*.5-8,3,8),new je({color:new At(i.colour),roughness:.35,metalness:.1})));m.position.set(0,-2.5,24),this.card.add(m)}return this.card.scale.setScalar(this.s),this.yawG.add(this.card),this.#e(o),this.blob=s.mesh(new Ft(new Ce(1,1),new Te({map:e.softDot,color:0,transparent:!0,opacity:.55,depthWrite:!1}))),this.blob.rotation.x=-Math.PI/2,this.blob.renderOrder=2,this.root.traverse(m=>{m.userData.cardId=i.id}),this.pickables=[d,x,g,p],this}#t(){return{loadImage:this.ctx.images.loadImage,titleBlock:this.ctx.titleBlock}}async refresh(t){this.person={...this.person,...t};let e=this.#t(),[i,s]=await Promise.all([Cr(this.skin,this.person,e),this.skin.back(this.person,e)]);!this.faceTex||!this.backTex||(this.faceTex.image=i,this.faceTex.needsUpdate=!0,this.backTex.image=s,this.backTex.needsUpdate=!0)}#e(t){let{skin:e,ctx:i}=this,s=i.tracker,r=this.s,o=this.stickLen,a=18*r,l=new At(this.person.colour??"#e8e0c8"),c=e.stick?.wood??8409389,h=s.add(new fr({color:c,roughness:.3,clearcoat:1,clearcoatRoughness:.12,emissive:new At(c).multiplyScalar(.45),emissiveIntensity:.9})),u=s.add(new je({color:e.stick?.collar??12096079,metalness:1,roughness:.34}));this.rod=new Ue;let d=s.mesh(new Ft(new Qi(8.5*r,6.4*r,o-a,24),h));d.position.y=(o-a)/2;let f=s.mesh(new Ft(new Po(6.4*r,18,12),h)),x=s.mesh(new Ft(new Qi(12.5*r,10*r,a,28),u));x.position.y=o-a/2;let g=s.mesh(new Ft(new hr(12*r,2.2*r,8,28),u));g.rotation.x=Math.PI/2,g.position.y=o-a;let p=s.mesh(new Ft(new hr(21,3.6,10,36),new je({color:l,emissive:l,emissiveIntensity:1.6,roughness:.4})));p.rotation.x=Math.PI/2,p.position.y=8;for(let m of[d,f,x,g])m.castShadow=!0;this.rod.add(d,f,x,g,p),this.rod.visible=!1,this.leanG.add(this.rod)}pose(t){let e=t.grip,i=t.grow??1,s=this.s*i;this.root.position.set(t.x,t.lift,t.z);let r=1-.45*e;this.leanG.rotation.z=-t.lean*r*_s,this.hinge.position.y=this.stickLen*e,this.hinge.rotation.z=-t.lean*(1-r)*_s,this.rod.visible=e>.02,this.rod.scale.set(1,Math.max(e,.001),1),this.yawG.rotation.set(t.pitch*_s,t.yaw*_s,0),this.card.scale.set(s,s*(t.down?1:t.breathe)*t.squash,s),this.grown=i;let o=1-.45*(t.down??0);if(this.faceMaterial&&this.lastDim!==o&&(this.faceMaterial.color.setScalar(o),this.lastDim=o),this.blob.position.set(t.x,.6,t.z),t.selected)this.blob.material.color.setHex(16751174),this.blob.material.blending=Mi,this.blob.scale.set(this.w*s*1.5,120*i,1),this.blob.material.opacity=.95;else if(t.speaking){let a=1+.06*Math.sin((t.breathe-1)*400);this.blob.material.color.setHex(16773320),this.blob.material.blending=Mi,this.blob.scale.set(this.w*s*1.9*a,170*i*a,1),this.blob.material.opacity=.8}else this.blob.material.color.setHex(0),this.blob.material.blending=Hn,this.blob.scale.set(this.w*s*(.95+.5*e),(74+46*e)*i,1),this.blob.material.opacity=.62-.26*e;this.#i(t)}async setEmote(t){if(this.emote&&(this.emote.sprite.parent?.remove(this.emote.sprite),this.emote=null),!t)return;let e=await this.ctx.emoteTexture(t);if(!e)return;let i=new Ki(this.ctx.tracker.add(new Bi({map:e,depthTest:!1,transparent:!0})));i.renderOrder=50,this.emote={id:t,sprite:i},this.ctx.scene.add(i)}#i(t){if(!this.emote)return;let e=t.emote,i=this.emote.sprite;if(!e||e.id!==this.emote.id){i.visible=!1;return}i.visible=e.opacity>.01,i.material.opacity=e.opacity;let s=t.grow??1;i.position.set(t.x+74*this.s*s,t.lift+this.stickLen*t.grip+this.h*this.s*s*t.breathe+36*s,t.z+30),i.scale.set(96*e.pop*s,96*e.pop*s,1)}dispose(){this.root.parent?.remove(this.root),this.blob.parent?.remove(this.blob),this.emote&&this.emote.sprite.parent?.remove(this.emote.sprite)}};var bg=.2,Sg=.42,wg=.8,uS=3,Zc=class{constructor({scene:t,rig:e,tracker:i,softDot:s,settings:r,cardHeight:o}){this.T=i,this.cardHeight=o;let a=i.add(_g());this.impacts=[];for(let c=0;c<3;c++){let h=new Ki(i.add(new Bi({map:a,depthTest:!1,transparent:!0,opacity:0})));h.renderOrder=60,h.scale.set(180,180,1),t.add(h),this.impacts.push(h)}this.flash=new Do(16769704,0,1100,2),t.add(this.flash);let l=r.sparks;if(this.sparkCount=l,l){let c=i.add(new _e);c.setAttribute("position",new De(new Float32Array(l*3),3)),this.sparks=new us(c,i.add(new Nn({size:12*Gc(e),map:s,color:16767370,transparent:!0,opacity:0,blending:Mi,depthWrite:!1}))),this.sparks.frustumCulled=!1,this.dir=Array.from({length:l},(h,u)=>{let d=u/l*Math.PI*2+u%5*.37,f=260+u*53%340;return[Math.cos(d)*f,Math.sin(d)*f*.8+120,u*31%100-50]}),t.add(this.sparks)}this.flashTimes=[],this.calm=!1}update(t,e){for(let r of this.impacts)r.material.opacity=0;this.flash.intensity=0,this.sparks&&(this.sparks.material.opacity=0);let i=0,s=this.cardHeight*.5+60;for(let r of t){let o=e-r.t;if(!(o<0||o>wg)){if(o<Sg&&i<this.impacts.length){let a=this.impacts[i++],l=o/Sg;a.position.set(r.x,s+10,r.Z+90),a.scale.setScalar(120+150*Math.sqrt(l)),a.material.opacity=1-l*l,a.material.rotation=.2*l}if(o<bg&&!this.calm&&this.#t(r.t)&&(this.flash.position.set(r.x,s,r.Z+300),this.flash.intensity=55e4*(1-o/bg)**2),this.sparks&&!this.calm&&r===t[t.length-1]){let a=this.sparks.geometry.attributes.position;this.dir.forEach((l,c)=>{a.array[c*3]=r.x+l[0]*o,a.array[c*3+1]=Math.max(2,s+l[1]*o-900*o*o),a.array[c*3+2]=r.Z+90+l[2]*o}),a.needsUpdate=!0,this.sparks.material.opacity=Math.max(0,1-o/wg)}}}}#t(t){return this.flashTimes.includes(t)?!0:(this.flashTimes=this.flashTimes.filter(e=>t-e<1),this.flashTimes.length>=uS?!1:(this.flashTimes.push(t),!0))}};var $c=class{constructor({scene:t,rig:e,zones:i,tracker:s}){this.zones=i,this.rig=e;let[r,o]=e.size;this.cw=Math.min(2048,r),this.ch=Math.round(this.cw*o/r),this.canvas=document.createElement("canvas"),this.canvas.width=this.cw,this.canvas.height=this.ch,this.ctx=this.canvas.getContext("2d"),this.tex=s.add(ai(this.canvas,{anisotropy:4}));let a=s.mesh(na(e,new Te({map:this.tex,transparent:!0,depthWrite:!1}),20));a.renderOrder=3,t.add(a),this.mesh=a,this.key="",a.visible=i.length>0}update(t,e,i,s=null){if(!this.zones.length)return;let r=Oc(this.zones,t,e,i,s);r!==this.key&&(this.key=r,Fc(this.ctx,this.cw,this.ch,this.zones,t,e,i,s,{boardLabels:!1}),this.tex.needsUpdate=!0)}},qc=class{constructor({scene:t,rig:e,zones:i,tracker:s,cardHeight:r=300}){this.T=s,this.scene=t,this.rig=e,this.cardHeight=r,this.areas=i.filter(o=>o.kind==="area"),this.labels=new Map}update(t){for(let e of this.areas){let i=this.labels.get(e.id);if(!t){i&&(i.sprite.visible=!1);continue}let s=t.counts?.[e.id]??0,r=t.downs?.[e.id]??0;(!i||i.n!==s||i.d!==r)&&(i=this.#t(e,s,r,i)),i.sprite.visible=!!i.at}}#t(t,e,i,s){let{canvas:r,w:o,h:a}=mg(t,e,i),l=this.T.add(ai(r,{anisotropy:4}));if(s)s.sprite.material.map?.dispose(),s.sprite.material.map=l,s.sprite.material.needsUpdate=!0;else{let c=new Ki(this.T.add(new Bi({map:l,depthTest:!1,transparent:!0})));c.renderOrder=45,this.scene.add(c),s={sprite:c,at:this.rig.standing(pg(t))},this.labels.set(t.id,s)}if(s.n=e,s.d=i,s.at){let{f:c}=this.rig.cam,h=c/(c-s.at.Z),u=1.45/Math.sqrt(Math.max(.15,h));s.sprite.scale.set(o*u,a*u,1),s.sprite.position.set(s.at.X,this.cardHeight*Aa(this.rig.cam,s.at.Z)*1.08+a*u/2,s.at.Z)}return s}},Yc=class{constructor({scene:t,tracker:e,softDot:i}){this.T=e,this.scene=t,this.pool=[];let s=e.add(dS());for(let r=0;r<6;r++){let o=e.mesh(new Ft(new Ce(1,1),new Te({map:s,transparent:!0,opacity:0,depthWrite:!1})));o.rotation.x=-Math.PI/2,o.renderOrder=4,o.visible=!1,t.add(o),this.pool.push(o)}this.ghost=e.mesh(new Ft(new Ce(1,1),new Te({transparent:!0,opacity:0,depthWrite:!1,side:hi}))),this.ghost.visible=!1,this.ghost.renderOrder=5,t.add(this.ghost),this.label=null,this.softDot=i,this.labelText=""}update(t,e,i){this.pool.forEach(s=>{s.visible=!1}),this.ghost.visible=!1,this.label&&(this.label.visible=!1),t.slice(0,this.pool.length).forEach((s,r)=>{let o=this.pool[r],a=s.target?1+.06*Math.sin(i*7):1;o.visible=!0,o.position.set(s.X,1.2,s.Z),o.scale.set((s.target?190:150)*a,(s.target?120:96)*a,1),o.material.opacity=Math.min(1,s.alpha)*(s.target?1:.8),s.target&&this.#t(s,e,i)})}#t(t,e,i){let s=e.get(t.for);if(!s)return;let r=this.ghost;r.material.map!==s.ghostTexture&&(r.material.map=s.ghostTexture,r.material.needsUpdate=!0);let o=t.pose;r.visible=!0,r.material.opacity=.32+.06*Math.sin(i*6),r.scale.set(s.w*s.s,s.h*s.s,1),r.position.set(t.X,o.lift+s.h*s.s/2,t.Z+4),r.rotation.set(0,0,0),r.rotateY(o.yaw*Math.PI/180),r.rotateX(o.pitch*Math.PI/180),r.rotateZ(-o.lean*Math.PI/180),t.label&&this.#e(t.label,t.X,o.lift+s.h*s.s+40,t.Z+10)}#e(t,e,i,s){if(!this.label||this.labelText!==t){this.label?.parent?.remove(this.label);let r=this.T.add(new Bi({map:this.T.add(ai(zc(t))),depthTest:!1,transparent:!0}));this.label=new Ki(r),this.label.renderOrder=55,this.label.scale.set(260,49,1),this.scene.add(this.label),this.labelText=t}this.label.visible=!0,this.label.position.set(e,i,s)}},dS=()=>ai(Bc(),{anisotropy:4});var Rr={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};var Si=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},fS=new ds(-1,1,1,-1,0,1),Td=class extends _e{constructor(){super(),this.setAttribute("position",new Yt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Yt([0,2,0,0,2,0],2))}},pS=new Td,$n=class{constructor(t){this._mesh=new Ft(pS,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,fS)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}};var Pr=class extends Si{constructor(t,e="tDiffuse"){super(),this.textureID=e,this.uniforms=null,this.material=null,t instanceof Re?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=xn.clone(t.uniforms),this.material=new Re({name:t.name!==void 0?t.name:"unspecified",defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this._fsQuad=new $n(this.material)}render(t,e,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this._fsQuad.material=this.material,this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var ra=class extends Si{constructor(t,e){super(),this.scene=t,this.camera=e,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(t,e,i){let s=t.getContext(),r=t.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,o,4294967295),r.buffers.stencil.setClear(a),r.buffers.stencil.setLocked(!0),t.setRenderTarget(i),this.clear&&t.clear(),t.render(this.scene,this.camera),t.setRenderTarget(e),this.clear&&t.clear(),t.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}},jc=class extends Si{constructor(){super(),this.needsSwap=!1}render(t){t.state.buffers.stencil.setLocked(!1),t.state.buffers.stencil.setTest(!1)}};var Jc=class{constructor(t,e){if(this.renderer=t,this._pixelRatio=t.getPixelRatio(),e===void 0){let i=t.getSize(new Mt);this._width=i.width,this._height=i.height,e=new we(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:ze}),e.texture.name="EffectComposer.rt1"}else this._width=e.width,this._height=e.height;this.renderTarget1=e,this.renderTarget2=e.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Pr(Rr),this.copyPass.material.blending=Ci,this.timer=new Oo}swapBuffers(){let t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,e){this.passes.splice(e,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){let e=this.passes.indexOf(t);e!==-1&&this.passes.splice(e,1)}isLastEnabledPass(t){for(let e=t+1;e<this.passes.length;e++)if(this.passes[e].enabled)return!1;return!0}render(t){this.timer.update(),t===void 0&&(t=this.timer.getDelta());let e=this.renderer.getRenderTarget(),i=!1;for(let s=0,r=this.passes.length;s<r;s++){let o=this.passes[s];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),o.render(this.renderer,this.writeBuffer,this.readBuffer,t,i),o.needsSwap){if(i){let a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}ra!==void 0&&(o instanceof ra?i=!0:o instanceof jc&&(i=!1))}}this.renderer.setRenderTarget(e)}reset(t){if(t===void 0){let e=this.renderer.getSize(new Mt);this._pixelRatio=this.renderer.getPixelRatio(),this._width=e.width,this._height=e.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,e){this._width=t,this._height=e;let i=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(i,s),this.renderTarget2.setSize(i,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(i,s)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var Kc=class extends Si{constructor(t,e,i=null,s=null,r=null){super(),this.scene=t,this.camera=e,this.overrideMaterial=i,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new At}render(t,e,i){let s=t.autoClear;t.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(t.getClearColor(this._oldClearColor),t.setClearColor(this.clearColor,t.getClearAlpha())),this.clearAlpha!==null&&(r=t.getClearAlpha(),t.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&t.clearDepth(),t.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),t.render(this.scene,this.camera),this.clearColor!==null&&t.setClearColor(this._oldClearColor),this.clearAlpha!==null&&t.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),t.autoClear=s}};var Tg={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new At(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};var Ir=class n extends Si{constructor(t,e=1,i,s){super(),this.strength=e,this.radius=i,this.threshold=s,this.resolution=t!==void 0?new Mt(t.x,t.y):new Mt(256,256),this.clearColor=new At(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new we(r,o,{type:ze,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){let u=new we(r,o,{type:ze,depthBuffer:!1});u.texture.name="UnrealBloomPass.h"+h,u.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(u);let d=new we(r,o,{type:ze,depthBuffer:!1});d.texture.name="UnrealBloomPass.v"+h,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),r=Math.round(r/2),o=Math.round(o/2)}let a=Tg;this.highPassUniforms=xn.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Re({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];let l=[6,10,14,18,22];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new Mt(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=e,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=xn.clone(Rr.uniforms),this.blendMaterial=new Re({uniforms:this.copyUniforms,vertexShader:Rr.vertexShader,fragmentShader:Rr.fragmentShader,premultipliedAlpha:!0,blending:Mi,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new At,this._oldClearAlpha=1,this._basic=new Te,this._fsQuad=new $n(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(t,e){let i=Math.round(t/2),s=Math.round(e/2);this.renderTargetBright.setSize(i,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(i,s),this.renderTargetsVertical[r].setSize(i,s),this.separableBlurMaterials[r].uniforms.invSize.value=new Mt(1/i,1/s),i=Math.round(i/2),s=Math.round(s/2)}render(t,e,i,s,r){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),r&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=i.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=n.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[l]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=n.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[l]),t.clear(),this._fsQuad.render(t),a=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(i),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(t){let e=[],i=t/3;for(let o=0;o<t;o++)e.push(.39894*Math.exp(-.5*o*o/(i*i))/i);let s=[],r=[];for(let o=1;o<t;o+=2){let a=e[o],l=o+1<t?e[o+1]:0,c=a+l;s.push((o*a+(o+1)*l)/c),r.push(c)}return new Re({defines:{KERNEL_PAIRS:s.length},uniforms:{colorTexture:{value:null},invSize:{value:new Mt(.5,.5)},direction:{value:new Mt(.5,.5)},centerWeight:{value:e[0]},gaussianOffsets:{value:s},gaussianWeights:{value:r}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(t){return new Re({defines:{NUM_MIPS:t},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};Ir.BlurDirectionX=new Mt(1,0);Ir.BlurDirectionY=new Mt(0,1);var oa={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};var Qc=class extends Si{constructor(){super(),this.isOutputPass=!0,this.uniforms=xn.clone(oa.uniforms),this.material=new dr({name:oa.name,uniforms:this.uniforms,vertexShader:oa.vertexShader,fragmentShader:oa.fragmentShader}),this._fsQuad=new $n(this.material),this._outputColorSpace=null,this._toneMapping=null}render(t,e,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=t.toneMappingExposure,(this._outputColorSpace!==t.outputColorSpace||this._toneMapping!==t.toneMapping)&&(this._outputColorSpace=t.outputColorSpace,this._toneMapping=t.toneMapping,this.material.defines={},Wt.getTransfer(this._outputColorSpace)===Qt&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===Uo?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===Bo?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===zo?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===Ho?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===Vo?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===Wo?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===Go&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var mS={uniforms:{tDiffuse:{value:null},uTime:{value:0},uAmount:{value:.022},uVig:{value:.42},uRes:{value:new Mt(2560,1440)}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:`
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uAmount; uniform float uVig; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; float v = smoothstep(0.95, 0.35, length(d * vec2(1.05, 1.0)));
      c.rgb *= mix(1.0 - uVig, 1.0, v);
      c.rgb += (hash(vUv * uRes) - 0.5) * uAmount;
      gl_FragColor = c;
    }`},th=class{constructor(t,e,i,{width:s,height:r,samples:o}){this.target=new we(s,r,{type:ze,samples:o}),this.composer=new Jc(t,this.target),this.composer.setPixelRatio(1),this.composer.setSize(s,r),this.composer.addPass(new Kc(e,i)),this.bloom=new Ir(new Mt(s,r),.32,.55,.82),this.composer.addPass(this.bloom),this.grain=new Pr(mS),this.grain.uniforms.uRes.value.set(s,r),this.composer.addPass(this.grain),this.composer.addPass(new Qc)}setSize(t,e){this.composer.setSize(t,e),this.bloom.resolution.set(t,e),this.grain.uniforms.uRes.value.set(t,e)}setCalm(t){this.grain.uniforms.uAmount.value=t?0:.022}render(t){this.grain.uniforms.uTime.value=Math.floor(t*24)%97*.37,this.composer.render()}dispose(){this.composer.dispose?.(),this.target.dispose();for(let t of this.composer.passes)t.dispose?.()}};var gS=Object.freeze(["off","zones","anywhere"]),Pi=Object.freeze({white:"#f2ecdc",yellow:"#eed46c",pink:"#eba0b8",blue:"#8fc0e0",green:"#97d09c",orange:"#eea060"}),Cg=Object.freeze(Object.keys(Pi)),kr=Object.freeze([.82,.84]),Gi=Object.freeze({width:300,depth:58,wall:22,stick:Object.freeze({radius:8,height:62,spacing:27,first:-122}),hit:Object.freeze({radius:13,height:96}),magic:Object.freeze({x:58,radius:9,height:70}),eraser:Object.freeze({x:112})}),Eg=-10*Math.PI/180,xS=4+Gi.hit.height-14,eh=8;function yS(n,t){let e=n.standing(t);if(!e)return null;let i=Math.cos(Eg),s=Math.sin(Eg),r=1/0,o=1/0,a=-1/0,l=-1/0;for(let c of[-Gi.width/2,Gi.width/2])for(let h of[0,xS])for(let u of[-Gi.depth/2,Gi.depth/2]){let d=n.screenOf(e.X+c*i+u*s,h,e.Z-c*s+u*i);r=Math.min(r,d.x),o=Math.min(o,d.y),a=Math.max(a,d.x),l=Math.max(l,d.y)}return{x0:r,y0:o,x1:a,y1:l}}function _S(n,t){if(n.rect){let[e,i,s,r]=n.rect;return!(s<t.x0||e>t.x1||r<t.y0||i>t.y1)}if(n.circle){let[e,i,s]=n.circle,r=Math.max(t.x0,Math.min(e,t.x1)),o=Math.max(t.y0,Math.min(i,t.y1));return(r-e)**2+(o-i)**2<=s**2}return!1}function aa(n,t,e=[],i=null){let s=yS(n,t);if(!s)return!1;let r={x0:s.x0-eh,y0:s.y0-eh,x1:s.x1+eh,y1:s.y1+eh};return i&&(r.x0<i.x0||r.x1>i.x1||r.y0<i.y0||r.y1>i.y1)?!1:!e.some(o=>_S(o,r))}function Rg(n,t,e=[],i=null,s=[]){if(aa(n,t,e,i))return[t[0],t[1]];let r=[];for(let a=0;a<=30;a++)for(let l=-10;l<=10;l++)r.push([a/100,l/50]);r.sort((a,l)=>a[0]*1.2+Math.abs(a[1])-(l[0]*1.2+Math.abs(l[1])));let o=a=>{for(let[l,c]of r){let h=[Math.round((t[0]+c)*1e3)/1e3,Math.round((t[1]-l)*1e3)/1e3];if(!(h[0]<.03||h[0]>.97)&&aa(n,h,a,i))return h}return null};return(s.length?o([...e,...s]):null)??o(e)??[t[0],t[1]]}var Lr=Object.freeze({height:1440,tile:240,maxWidth:4320});function Ad(n){let[t,e]=n?.size??[2,1],i=Lr.height,s=Math.min(Lr.maxWidth,Math.max(Lr.tile,Math.round(i*t/e)));return{w:s,h:i,tile:Lr.tile,cols:Math.ceil(s/Lr.tile),rows:Math.ceil(i/Lr.tile)}}var vS=(n,t)=>`c${n}r${t}`;function Pg(n){let t=/^c(\d{1,3})r(\d{1,3})$/.exec(String(n));return t?{c:Number(t[1]),r:Number(t[2])}:null}function Ig(n,t){let e=Pg(t);return!!e&&e.c<n.cols&&e.r<n.rows}function Pe(n,t){let e=Pg(t);if(!e)return null;let i=e.c*n.tile,s=e.r*n.tile;return{x:i,y:s,w:Math.min(n.tile,n.w-i),h:Math.min(n.tile,n.h-s)}}function Ii(n,{x0:t,y0:e,x1:i,y1:s}){let r=Math.max(0,Math.floor(t/n.tile)),o=Math.max(0,Math.floor(e/n.tile)),a=Math.min(n.cols-1,Math.floor(i/n.tile)),l=Math.min(n.rows-1,Math.floor(s/n.tile)),c=[];for(let h=o;h<=l;h++)for(let u=r;u<=a;u++)c.push(vS(u,h));return c}var Cd=(n,t,e)=>({x:t*n.w,y:e*n.h});var MS=8,Rd=(n,t="")=>`${String(Math.floor(n)).padStart(14,"0")}-${t}`;function Lg(n){return[...n].sort((t,e)=>(t.since??0)-(e.since??0)||String(t.by).localeCompare(String(e.by)))}function kg(n,{by:t=null}={}){let e=null;for(let i of n)if(!(t&&i.by!==t))for(let[s,r]of Object.entries(i.history??{}))!r||typeof r!="object"||(!e||(r.at??0)>(e.step.at??0)||(r.at??0)===(e.step.at??0)&&s>e.id)&&(e={layer:i,id:s,step:r});return e}var bS=320*1024,Dg=12,Ag=n=>64+Object.values(n?.tiles??{}).reduce((t,e)=>t+(typeof e=="string"?e.length:0),0);function Pd(n,{keep:t=MS,bytes:e=bS,before:i=null,protect:s=null}={}){let r=Object.entries(n??{}).filter(([,l])=>l&&typeof l=="object").sort(([l,c],[h,u])=>(c.at??0)-(u.at??0)||(l<h?-1:l>h?1:0)),o=[];if(i!==null){let l=r.filter(([c,h])=>c!==s&&(h.at??0)<i);o.push(...l.map(([c])=>c)),r=r.filter(c=>!l.includes(c))}let a=r.reduce((l,[,c])=>l+Ag(c),0);for(;r.length>1&&(r.length>t||a>e);){let l=r.findIndex(([c],h)=>c!==s&&h<r.length-1);if(l<0)break;a-=Ag(r[l][1]),o.push(r[l][0]),r.splice(l,1)}return o}function ih(n,t=null){let e=t?.mode&&gS.includes(t.mode)?t.mode:n?.mode??"off",i=t?.locked===!0||t?.locked===void 0&&n?.lock===!0;return{mode:e,locked:i}}var Ed=Object.freeze([null,"off","zones","anywhere"]),Ng=n=>Ed[(Ed.indexOf(n??null)+1)%Ed.length];function Id(n,t,e,i){return n.locked||n.mode==="off"?!1:n.mode==="anywhere"?!0:t.some(s=>s.kind==="chalk"&&on(s.shape,e,i))}function Og(n,t){return n.mode==="off"||n.locked?!1:n.mode==="anywhere"||t.some(e=>e.kind==="chalk")}function Fg(n,t){return n.mode!=="zones"?null:t.filter(e=>e.kind==="chalk").map(e=>e.shape)}var Ug=10,Bg=2.5;function SS(n,t){let e=new Qi(n,n,t,24,8),i=e.getAttribute("position"),s=new Float32Array(i.count*3),r=new At;for(let o=0;o<i.count;o++){let a=(Math.atan2(i.getZ(o),i.getX(o))/(Math.PI*2)+1)%1,l=i.getY(o)/t+.5;r.setHSL((a+l*.75)%1,.7,.68,Se),s.set([r.r,r.g,r.b],o*3)}return e.setAttribute("color",new De(s,3)),e}var nh=class{constructor({scene:t,rig:e}){this.rig=e,this.group=new Ue,t.add(this.group),this.geometry=new Ce(1,1),this.tiles=new Map,this.#t()}#t(){let t=document.createElement("canvas");t.width=t.height=4;let e=ai(t,{anisotropy:4}),i=new Te({map:e,transparent:!0,depthWrite:!1,color:15658734}),s=na(this.rig,i,Ug,{x0:0,y0:0,x1:.001,y1:.001},this.geometry);s.renderOrder=Bg,this.group.add(s),this.primer={mesh:s,texture:e,material:i}}update(t,e,i=!1){let s=t.grid,r=i?new Set([...e,...this.tiles.keys(),...t.composite.keys()]):e;for(let o of r){let a=t.composite.get(o)??null,l=this.tiles.get(o);if(l&&l.canvas===a){l.texture.needsUpdate=!0;continue}if(l&&this.#e(o),!a)continue;let c=Pe(s,o),h=ai(a,{anisotropy:4}),u=new Te({map:h,transparent:!0,depthWrite:!1,color:15658734}),d=na(this.rig,u,Ug,{x0:c.x/s.w,y0:c.y/s.h,x1:(c.x+c.w)/s.w,y1:(c.y+c.h)/s.h},this.geometry);d.renderOrder=Bg,this.group.add(d),this.tiles.set(o,{mesh:d,texture:h,material:u,canvas:a})}}#e(t){let e=this.tiles.get(t);e&&(this.group.remove(e.mesh),e.texture.dispose(),e.material.dispose(),this.tiles.delete(t))}setHidden(t){this.group.visible=!t}dispose(){for(let t of[...this.tiles.keys()])this.#e(t);this.primer?.texture.dispose(),this.primer?.material.dispose(),this.geometry.dispose(),this.group.removeFromParent()}};var sh=class{constructor({scene:t,rig:e,at:i,tracker:s}){this.group=new Ue,this.sticks=[];let r=e.standing(i);if(!r){this.group.visible=!1,t.add(this.group),this.hidden=!0;return}this.group.position.set(r.X,0,r.Z),this.group.rotation.y=-10*_s;let{width:o,depth:a,wall:l,stick:c,hit:h,magic:u,eraser:d}=Gi,f=s.add(new je({color:8016432,roughness:.6})),x=s.add(new je({color:3810322,roughness:.8})),g=s.mesh(new Ft(new ii(o,8,a),x));g.position.y=4,this.group.add(g);for(let[R,P,L,B]of[[o,8,0,a/2-4],[o,8,0,-a/2+4],[8,a,o/2-4,0],[8,a,-o/2+4,0]]){let I=s.mesh(new Ft(new ii(R,l,P),f));I.position.set(L,l/2+4,B),I.castShadow=!0,this.group.add(I)}let p=s.add(new Te({visible:!1})),m=s.add(new Qi(h.radius,h.radius,h.height,8)),v=(R,P)=>{let L=s.mesh(new Ft(m,p));L.position.set(R,4+h.height/2-14,0),Object.assign(L.userData,P),this.group.add(L),this.sticks.push(L)};Object.entries(Pi).forEach(([R,P],L)=>{let B=c.first+L*c.spacing,I=new At(P),U=s.add(new je({color:I,roughness:.95,emissive:I.clone().multiplyScalar(.18)})),V=s.mesh(new Ft(new Qi(c.radius,c.radius,c.height,14),U));V.position.set(B,4+c.height/2-6,(L%2-.5)*6),V.rotation.z=(L%3-1)*.07,V.rotation.x=((L+1)%3-1)*.05,V.castShadow=!0,this.group.add(V),v(B,{chalk:R})});let E=s.add(new je({vertexColors:!0,roughness:.55,emissive:2763306})),M=s.mesh(new Ft(SS(u.radius,u.height),E));M.position.set(u.x,4+u.height/2-6,2),M.rotation.z=.06,M.castShadow=!0,this.group.add(M);let T=s.add(new je({color:16765802,roughness:.3,metalness:.6,emissive:16758832,emissiveIntensity:.55})),w=s.mesh(new Ft(new Ro(u.radius*1.15,0),T));w.position.set(u.x-Math.sin(.06)*(u.height/2),4+u.height-2,2),w.scale.set(1,1.3,.55),this.group.add(w),v(u.x,{magic:!0});let C=s.add(new je({color:599e4,roughness:1})),_=s.mesh(new Ft(new ii(50,32,30),C));_.position.set(d.x,20,4),_.rotation.y=.12,_.castShadow=!0,this.group.add(_);let S=s.mesh(new Ft(s.add(new ii(58,60,50)),p));S.position.set(d.x,30,4),S.userData.eraser=!0,this.group.add(S),this.sticks.push(S),t.add(this.group)}setVisible(t){this.hidden||(this.group.visible=t)}get pickables(){return this.sticks}moveTo(t,e){if(this.hidden)return;let i=t.standing(e);i&&this.group.position.set(i.X,0,i.Z)}};var Me=Object.freeze({chalk:Object.freeze({kind:"paint",tip:"chalk",size:Object.freeze({min:2,max:48,initial:7}),spacing:.1,flow:.8,opacity:1,grain:.7,scatter:.05,jitter:Object.freeze({size:.12,angle:1}),pressure:Object.freeze({size:.5,flow:.4}),taper:0}),magic:Object.freeze({kind:"paint",tip:"chalk",magic:!0,size:Object.freeze({min:2,max:64,initial:10}),spacing:.09,flow:.85,opacity:1,grain:.45,scatter:.04,jitter:Object.freeze({size:.1,angle:1}),pressure:Object.freeze({size:.5,flow:.4}),taper:0}),pencil:Object.freeze({kind:"paint",tip:"pencil",size:Object.freeze({min:1,max:14,initial:2.5}),spacing:.12,flow:.9,opacity:1,grain:.2,scatter:0,jitter:Object.freeze({size:.04,angle:0}),pressure:Object.freeze({size:.45,flow:.55}),taper:1.5}),brush:Object.freeze({kind:"paint",tip:"soft",size:Object.freeze({min:3,max:140,initial:24}),spacing:.06,flow:.45,opacity:.88,grain:0,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.7,flow:.25}),taper:1}),spray:Object.freeze({kind:"spray",tip:"speck",size:Object.freeze({min:10,max:180,initial:48}),spacing:.05,flow:.55,opacity:1,grain:0,scatter:0,particles:34,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.25,flow:.6}),taper:0}),smudge:Object.freeze({kind:"smudge",tip:"soft",size:Object.freeze({min:6,max:140,initial:32}),spacing:.08,flow:.6,opacity:1,grain:0,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.35,flow:.5}),taper:0}),eraser:Object.freeze({kind:"erase",tip:"round",size:Object.freeze({min:3,max:180,initial:28}),spacing:.07,flow:1,opacity:1,grain:0,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.35,flow:0}),taper:0}),fill:Object.freeze({kind:"fill",tip:null,size:Object.freeze({min:0,max:0,initial:0}),spacing:1,flow:1,opacity:.95,grain:.3,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:0,flow:0}),taper:0})}),ah=Object.freeze(Object.keys(Me)),rh=Object.freeze({chalk:.62,pencil:.82,round:.78});function zg(n,t,e=.5){if(t>=1)return 0;let i=(s,r,o)=>{let a=Math.max(0,Math.min(1,(o-s)/(r-s)));return a*a*(3-2*a)};if(n==="chalk"){let s=rh.chalk;if(t<=s)return .96;let r=(t-s)/(1-s),o=.96*(1-i(0,1,r));return e<r*.85?o*.2:o}if(n==="pencil"){let s=rh.pencil;return(t<=s?.95:.95*(1-i(s,1,t)))*(.88+.12*e)}return n==="round"?t<=rh.round?1:1-i(rh.round,1,t):n==="speck"?Math.exp(-6*t*t):Math.exp(-3.2*t*t)*(1-i(.85,1,t))}var Nr=Object.freeze([0,5,12,26]);function Or(n){let t=n>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function kd(n){let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return t>>>0}var Ld=class{constructor(t=0){this.r=Math.max(0,t),this.at=null,this.pointer=null}push({x:t,y:e,p:i=.5}){if(this.pointer={x:t,y:e,p:i},!this.at)return this.at={x:t,y:e,p:i},[{...this.at}];let s=t-this.at.x,r=e-this.at.y,o=Math.hypot(s,r);if(o<=this.r)return this.at.p+=(i-this.at.p)*.35,[];let a=this.r?(o-this.r)/o:1;return this.at={x:this.at.x+s*a,y:this.at.y+r*a,p:i},[{...this.at}]}finish(){if(!this.pointer||!this.at)return[];let t=this.pointer.x-this.at.x,e=this.pointer.y-this.at.y,i=Math.hypot(t,e);if(i<.5)return[];let s=Math.max(1,Math.ceil(i/Math.max(2,this.r/2))),r=[];for(let o=1;o<=s;o++)r.push({x:this.at.x+t*o/s,y:this.at.y+e*o/s,p:this.pointer.p});return this.at={...this.pointer},r}},oh=class{constructor(){this.last=null,this.p=.75}pressure({x:t,y:e,t:i,pressure:s=.5,pointerType:r="mouse"}){if(r==="pen"&&s>0)return this.last={x:t,y:e,t:i},Math.max(.08,Math.min(1,s));if(!this.last)return this.last={x:t,y:e,t:i},this.p;let o=Math.max(1,i-this.last.t),a=Math.hypot(t-this.last.x,e-this.last.y)/o;this.last={x:t,y:e,t:i};let l=Math.max(.45,Math.min(1,1.05-a*.22));return this.p+=(l-this.p)*.25,this.p}};function wS(n,t,e,i,s){let r=Math.max(1e-4,Math.hypot(t.x-n.x,t.y-n.y)**.5),o=Math.max(1e-4,Math.hypot(e.x-t.x,e.y-t.y)**.5),a=Math.max(1e-4,Math.hypot(i.x-e.x,i.y-e.y)**.5),l=u=>e[u]-t[u]+o*((t[u]-n[u])/r-(e[u]-n[u])/(r+o)),c=u=>e[u]-t[u]+o*((i[u]-e[u])/a-(i[u]-t[u])/(o+a)),h=u=>{let d=2*t[u]-2*e[u]+l(u)+c(u),f=-3*t[u]+3*e[u]-2*l(u)-c(u);return((d*s+f)*s+l(u))*s+t[u]};return{x:h("x"),y:h("y"),p:t.p+(e.p-t.p)*s}}var Dr=class{constructor({tool:t="chalk",size:e=null,flow:i=1,steady:s=0,seed:r=1}={}){this.def=Me[t]??Me.chalk,this.tool=t,this.size=Math.max(this.def.size.min,Math.min(this.def.size.max,e??this.def.size.initial)),this.flowScale=Math.max(0,Math.min(1,i)),this.steady=new Ld(s),this.seed=r>>>0,this.points=[],this.prev=null,this.carry=0,this.dist=0,this.count=0,this.dabs=0}add(t){let e=[];for(let i of this.steady.push(t))this.#t(i,e);return e}finish(){let t=[];for(let i of this.steady.finish())this.#t(i,t);let e=this.points;if(e.length>=2){let i=e.length;this.#e(e[i-3]??e[i-2],e[i-2],e[i-1],e[i-1],t)}else e.length===1&&this.count===0&&this.#s(e[0],0,t);return t}#t(t,e){let i=this.points[this.points.length-1];if(i&&Math.hypot(t.x-i.x,t.y-i.y)<.35){i.p=t.p;return}this.points.push(t),this.points.length>4&&this.points.shift();let s=this.points,r=s.length;if(r===1){this.prev={...t},this.#s(t,0,e);return}r>=3&&this.#e(s[r-4]??s[r-3],s[r-3],s[r-2],s[r-1],e)}#e(t,e,i,s,r){let o=Math.hypot(i.x-e.x,i.y-e.y),a=Math.max(1,Math.ceil(o/.75)),l=this.prev??e;for(let c=1;c<=a;c++){let h=wS(t,e,i,s,c/a),u=Math.hypot(h.x-l.x,h.y-l.y);this.carry+=u,this.dist+=u;let d=this.#n(h.p);for(;this.carry>=d;){this.carry-=d;let f=this.carry,x=u>0?Math.max(0,Math.min(1,1-f/u)):1,g={x:l.x+(h.x-l.x)*x,y:l.y+(h.y-l.y)*x,p:h.p};this.#s(g,Math.atan2(h.y-l.y,h.x-l.x),r)}l=h}this.prev=l}#i(t){let e=this.def.pressure;return{size:1-e.size+e.size*t,flow:1-e.flow+e.flow*t}}#n(t){return Math.max(.4,this.def.spacing*this.size*this.#i(t).size)}#s(t,e,i){let s=Or(this.seed+this.count*7919);this.count++;let r=this.def,o=this.#i(t.p),a=r.taper>0?Math.min(1,.35+.65*this.dist/(r.taper*this.size)):1,l=Math.max(.6,this.size*o.size*a*(1+r.jitter.size*(s()*2-1))),c=r.scatter*this.size,h=r.jitter.angle?s()*Math.PI*2:e;i.push({x:t.x+(s()*2-1)*c,y:t.y+(s()*2-1)*c,size:l,flow:Math.max(0,Math.min(1,r.flow*this.flowScale*o.flow)),angle:h,seed:(this.seed^Math.imul(this.count,2654435761))>>>0,dist:this.dist})}};function Hg(n,t,e={}){let i=new Dr({...e,steady:0}),s=Math.max(2,Math.ceil(Math.hypot(t.x-n.x,t.y-n.y)/3)),r=[];for(let o=0;o<=s;o++)r.push(...i.add({x:n.x+(t.x-n.x)*o/s,y:n.y+(t.y-n.y)*o/s,p:n.p??.75}));return r.push(...i.finish()),r}function la(n){let t=1/0,e=1/0,i=-1/0,s=-1/0;for(let r of n){let o=r.size/2+2;t=Math.min(t,r.x-o),e=Math.min(e,r.y-o),i=Math.max(i,r.x+o),s=Math.max(s,r.y+o)}return Number.isFinite(t)?{x0:t,y0:e,x1:i,y1:s}:null}function qn(n){let t=parseInt(String(n).replace("#",""),16),e=(t>>16&255)/255,i=(t>>8&255)/255,s=(t&255)/255,r=Math.max(e,i,s),o=r-Math.min(e,i,s),a=0;return o&&(a=r===e?(i-s)/o%6:r===i?(s-e)/o+2:(e-i)/o+4),{h:(a*60+360)%360,s:r?o/r:0,v:r}}function ca({h:n,s:t,v:e}){let i=r=>{let o=(r+n/60)%6;return e-e*t*Math.max(0,Math.min(o,4-o,1))},s=r=>Math.round(Math.max(0,Math.min(1,r))*255).toString(16).padStart(2,"0");return`#${s(i(5))}${s(i(3))}${s(i(1))}`}function Gg(n,t,{every:e=900}={}){let i=qn(n);return ca({h:(i.h+t/e*360)%360,s:Math.max(.55,i.s),v:Math.max(.85,i.v)})}function vs(n){let t=/^#?([0-9a-f]{6})$/i.exec(String(n??"").trim());return t?`#${t[1].toLowerCase()}`:null}var mi=96,Fr=256,Vg=4,TS=48,ES=.3,Wg=15,AS=320,CS=4,me=(n,t)=>{let e=document.createElement("canvas");return e.width=Math.max(1,Math.round(n)),e.height=Math.max(1,Math.round(t)),e},ee=n=>n.getContext("2d",globalThis.__chalkSoftware?{willReadFrequently:!0}:void 0);function Xg(n,t,e){if(!n)return{x:0,y:0,w:t,h:e};let i=Math.max(0,Math.floor(n.x0)),s=Math.max(0,Math.floor(n.y0)),r=Math.min(t,Math.ceil(n.x1)),o=Math.min(e,Math.ceil(n.y1));return{x:i,y:s,w:Math.max(0,r-i),h:Math.max(0,o-s)}}var Zg=(n,t)=>!n||!t?null:{x0:Math.min(n.x0,t.x0),y0:Math.min(n.y0,t.y0),x1:Math.max(n.x1,t.x1),y1:Math.max(n.y1,t.y1)};function ch(n,t,e,i=!1){let s=t+1,r=new Float32Array(s*s);for(let l=0;l<r.length;l++)r[l]=e();if(i)for(let l=0;l<s;l++)r[l*s+t]=r[l*s],r[t*s+l]=r[l];let o=new Float32Array(n*n),a=l=>l*l*(3-2*l);for(let l=0;l<n;l++){let c=l/n*t,h=Math.floor(c),u=a(c-h);for(let d=0;d<n;d++){let f=d/n*t,x=Math.floor(f),g=a(f-x),p=r[h*s+x],m=r[h*s+x+1],v=r[(h+1)*s+x],E=r[(h+1)*s+x+1];o[l*n+d]=p+(m-p)*g+(v-p)*u+(p-m-v+E)*g*u}}return o}var Dd=class{constructor(){this.shapes=new Map,this.tinted=new Map}shape(t,e=0){let i=`${t}:${e}`,s=this.shapes.get(i);if(s)return s;s=me(mi,mi);let r=ee(s),o=r.createImageData(mi,mi),a=Or(9001+e*131+t.charCodeAt(0)),l=ch(mi,7,a),c=ch(mi,30,a),h=mi/2;for(let u=0;u<mi;u++)for(let d=0;d<mi;d++){let f=u*mi+d,x=zg(t,Math.hypot(d+.5-h,u+.5-h)/h,l[f]*.7+c[f]*.3),g=f*4;o.data[g]=o.data[g+1]=o.data[g+2]=255,o.data[g+3]=Math.round(x*255)}return r.putImageData(o,0,0),this.shapes.set(i,s),s}coloured(t,e,i){let s=`${t}:${e}:${i}`,r=this.tinted.get(s);if(r)return r;this.tinted.size>AS&&this.tinted.delete(this.tinted.keys().next().value),r=me(mi,mi);let o=ee(r);return o.drawImage(this.shape(t,e),0,0),o.globalCompositeOperation="source-in",o.fillStyle=i,o.fillRect(0,0,mi,mi),this.tinted.set(s,r),r}},Nd=class{constructor(){this.noise=null,this.by=new Map,this.patterns=new Map}canvas(t){let e=Math.round(Math.max(0,Math.min(1,t))*20)/20,i=this.by.get(e);if(i)return i;if(!this.noise){let o=Or(77),a=ch(Fr,16,o,!0),l=ch(Fr,64,o,!0);this.noise=a.map((c,h)=>Math.max(0,Math.min(1,c*.45+l[h]*.55+(o()-.5)*.25)))}i=me(Fr,Fr);let s=ee(i),r=s.createImageData(Fr,Fr);for(let o=0;o<this.noise.length;o++){let a=o*4;r.data[a]=r.data[a+1]=r.data[a+2]=255,r.data[a+3]=Math.round((1-e*this.noise[o]**1.4)*255)}return s.putImageData(r,0,0),this.by.set(e,i),i}pattern(t,e,i,s){let r=`${e}|${i}|${s}`,o=this.patterns.get(r);return o||(o=t.createPattern(this.canvas(e),"repeat"),o?.setTransform?.(new DOMMatrix().translate(-i,-s)),o&&this.patterns.set(r,o),o)}},hh=class{constructor({grid:t,onChange:e=()=>{}}){this.grid=t,this.onChange=e,this.layers=new Map,this.order=[],this.composite=new Map,this.strokes=new Map,this.tips=new Dd,this.grain=new Nd,this.mask=null,this.maskTiles=new Map,this.dirty=new Map,this.loads=new Map,this.scratch=null,this.pending=!1}warmUp(){let t=[];for(let s=0;s<Vg;s++)t.push(()=>this.tips.shape("chalk",s));for(let s of["pencil","round","soft","speck"])t.push(()=>this.tips.shape(s,0));for(let s of Object.values(Me))s.grain>0&&t.push(()=>this.grain.canvas(s.grain));let e=globalThis.requestIdleCallback??(s=>setTimeout(s,30)),i=()=>{let s=t.shift();if(s){try{s()}catch{}e(i)}};e(i)}#t(t,e=null){let i=this.dirty.get(t);this.dirty.set(t,i===void 0?e:Zg(i,e)),this.#e()}#e(){if(this.pending)return;this.pending=!0,(globalThis.requestAnimationFrame??(e=>setTimeout(e,16)))(()=>this.flush())}flush(){if(this.pending=!1,!this.dirty.size)return;let t=[...this.dirty];this.dirty.clear();for(let[e,i]of t)this.#g(e,i);this.onChange(new Set(t.map(([e])=>e)))}setLayers(t){let e=new Set(t.map(s=>s.by));for(let s of this.strokes.values())e.add(s.by);for(let[s,r]of this.layers)if(!e.has(s)){for(let o of r.tiles.keys())this.#t(o);this.layers.delete(s)}for(let s of t){let r=this.layers.get(s.by);if(r){Number.isFinite(s.since)&&s.since!==r.since&&(r.since=s.since,this.#i(r));continue}this.layers.set(s.by,{by:s.by,since:s.since??Date.now(),tiles:new Map,sources:new Map})}let i=this.order.join("|");if(this.order=Lg([...this.layers.values()]).map(s=>s.by),i!==this.order.join("|"))for(let s of this.layers.values())this.#i(s)}ensureLayer(t,e=Date.now()){return this.layers.has(t)||this.setLayers([...[...this.layers.values()].map(i=>({by:i.by,since:i.since})),{by:t,since:e}]),this.layers.get(t)}#i(t){for(let e of t.tiles.keys())this.#t(e)}sourceOf(t,e){return this.layers.get(t)?.sources.get(e)??null}noteSource(t,e,i){let s=this.layers.get(t);s&&(s.sources.set(e,i??null),i||(s.tiles.delete(e),this.#t(e)))}liveStrokes(){return[...this.strokes.values()].filter(t=>t.live)}async setTile(t,e,i){if((this.ensureLayer(t).sources.get(e)??null)===(i??null))return!1;let r=`${t}|${e}`;this.loads.set(r,i??null);let o=null;if(i){o=new Image,o.src=i;try{await o.decode()}catch{return!1}}if(this.loads.get(r)!==(i??null))return!1;this.loads.delete(r);let a=this.layers.get(t);if(!a)return!1;if(a.sources.set(e,i??null),!i)a.tiles.delete(e);else{let l=Pe(this.grid,e),c=a.tiles.get(e);c||(c=me(l.w,l.h),a.tiles.set(e,c));let h=ee(c);h.clearRect(0,0,c.width,c.height),h.drawImage(o,0,0)}return this.#t(e),!0}async revert(t,e){let i=this.layers.get(t);i&&await Promise.all([...e].map(async s=>{let r=i.sources.get(s)??null;i.sources.delete(s),i.tiles.delete(s),this.#t(s),r&&await this.setTile(t,s,r)}))}setMask(t){let e=t?.length?t.map(i=>i.map(([s,r])=>[s*this.grid.w,r*this.grid.h])):null;JSON.stringify(e)!==JSON.stringify(this.mask)&&(this.mask=e,this.maskTiles.clear(),this.maskBoxes=e?.map(i=>{let s=i.map(o=>o[0]),r=i.map(o=>o[1]);return{poly:i,x0:Math.min(...s),y0:Math.min(...r),x1:Math.max(...s),y1:Math.max(...r)}})??null)}#n(t,e,i){if(!this.maskBoxes)return!0;for(let s of this.maskBoxes){if(t+i<s.x0||t-i>s.x1||e+i<s.y0||e-i>s.y1)continue;let r=s.poly,o=!1;for(let a=0,l=r.length-1;a<r.length;l=a++){let[c,h]=r[a],[u,d]=r[l];h>e!=d>e&&t<(u-c)*(e-h)/(d-h)+c&&(o=!o);let f=u-c,x=d-h,g=Math.max(0,Math.min(1,((t-c)*f+(e-h)*x)/(f*f+x*x||1)));if(Math.hypot(c+g*f-t,h+g*x-e)<=i)return!0}if(o)return!0}return!1}#s(t){if(!this.mask)return null;let e=this.maskTiles.get(t);if(e)return e;let i=Pe(this.grid,t);e=me(i.w,i.h);let s=ee(e);s.fillStyle="#fff",s.translate(-i.x,-i.y);for(let r of this.mask)s.beginPath(),r.forEach(([o,a],l)=>l?s.lineTo(o,a):s.moveTo(o,a)),s.closePath(),s.fill();return this.maskTiles.set(t,e),e}begin({id:t,by:e,tool:i="chalk",colour:s="#f2ecdc",opacity:r=null,magic:o=null,everyone:a=!1,live:l=!1}){let c=Me[i]??Me.chalk;this.ensureLayer(e);let h={id:t,by:e,tool:i,def:c,colour:s,magic:c.magic?{rainbow:!1,glow:!1,sparkle:!1,...o??{}}:null,opacity:r??c.opacity,everyone:c.kind==="erase"&&a,live:l,buffer:new Map,processed:new Map,stale:new Map,touched:new Set,dabs:[],carried:null};return this.strokes.set(t,h),h}paint(t,e){let i=this.strokes.get(t);if(!(!i||!e.length))for(let s of e)i.dabs.push(s),i.def.kind==="smudge"?this.#h(i,s):this.#c(i,s)}#r(t,e,i){let s=t.buffer.get(e);return s||(s=me(i.w,i.h),t.buffer.set(e,s)),s}#o(t,e,i){t.touched.add(e);let s=t.stale.get(e);t.stale.set(e,s===void 0?i:Zg(s,i)),this.#t(e,i)}#c(t,e){let i=e.size/2;if(t.def.kind!=="erase"&&!this.#n(e.x,e.y,i+1))return;let s=Ii(this.grid,{x0:e.x-i-2,y0:e.y-i-2,x1:e.x+i+2,y1:e.y+i+2}),r=t.def.kind==="erase"?"#ffffff":t.magic?.rainbow?Gg(t.colour,Math.round(e.dist/Wg)*Wg):t.colour;if(t.def.kind==="spray"){let u=Or(e.seed),d=Math.max(1,Math.round((t.def.particles??30)*e.flow)),f=[];for(let g=0;g<d;g++){let p=u()*Math.PI*2,m=i*Math.pow(u(),.75);f.push({x:e.x+Math.cos(p)*m,y:e.y+Math.sin(p)*m,size:1.2+u()*2.4,alpha:.3+u()*.6})}let x=this.tips.coloured("speck",0,r);for(let g of s){let p=Pe(this.grid,g),m=ee(this.#r(t,g,p));for(let v of f)v.x<p.x-4||v.y<p.y-4||v.x>p.x+p.w+4||v.y>p.y+p.h+4||(m.globalAlpha=v.alpha,m.drawImage(x,v.x-p.x-v.size/2,v.y-p.y-v.size/2,v.size,v.size));m.globalAlpha=1,this.#o(t,g,{x0:e.x-i-4-p.x,y0:e.y-i-4-p.y,x1:e.x+i+4-p.x,y1:e.y+i+4-p.y})}return}let o=t.def.tip??"round",a=o==="chalk"?e.seed%Vg:0,l=this.tips.coloured(o,a,r),c=e.angle?Math.cos(e.angle):1,h=e.angle?Math.sin(e.angle):0;for(let u of s){let d=Pe(this.grid,u),f=ee(this.#r(t,u,d)),x=e.x-d.x,g=e.y-d.y;f.setTransform(c,h,-h,c,x,g),f.globalAlpha=e.flow,f.drawImage(l,-i,-i,i*2,i*2),f.setTransform(1,0,0,1,0,0),f.globalAlpha=1,this.#o(t,u,{x0:x-i-2,y0:g-i-2,x1:x+i+2,y1:g+i+2})}}#a(t,e){let i=t.buffer.get(e);if(!i)return null;let s=t.processed.get(e),r=t.stale.get(e);if(s&&r===void 0)return s;let o=Pe(this.grid,e),a=r??null;s||(s=me(o.w,o.h),t.processed.set(e,s),a=null),t.stale.delete(e);let l=Xg(a,o.w,o.h);if(!l.w||!l.h)return s;let c=ee(s);if(c.save(),c.beginPath(),c.rect(l.x,l.y,l.w,l.h),c.clip(),c.clearRect(l.x,l.y,l.w,l.h),c.drawImage(i,0,0),t.def.grain>0&&t.def.kind!=="erase"){let u=this.grain.pattern(c,Math.round(Math.max(0,Math.min(1,t.def.grain))*20)/20,o.x,o.y);u&&(c.globalCompositeOperation="destination-in",c.fillStyle=u,c.fillRect(l.x,l.y,l.w,l.h))}let h=t.def.kind==="erase"?null:this.#s(e);return h&&(c.globalCompositeOperation="destination-in",c.drawImage(h,0,0)),c.restore(),s}#h(t,e){let i=Math.max(4,Math.ceil(e.size)),s=Math.round(e.x-i/2),r=Math.round(e.y-i/2);t.here?.width!==i&&(t.here=me(i,i),t.put=me(i,i));let o=this.#u(t.here,s,r);if(!t.carried){t.carried=me(i,i),ee(t.carried).drawImage(o,0,0);return}if(t.carried.width!==i){let u=me(i,i);ee(u).drawImage(t.carried,0,0,i,i),t.carried=u}let a=t.put,l=ee(a);l.globalCompositeOperation="copy",l.drawImage(t.carried,0,0),l.globalCompositeOperation="destination-in",l.drawImage(this.tips.shape("soft",0),0,0,i,i),l.globalCompositeOperation="source-over";let c=this.layers.get(t.by);for(let u of Ii(this.grid,{x0:s,y0:r,x1:s+i,y1:r+i})){let d=Pe(this.grid,u),f=c.tiles.get(u);f||(f=me(d.w,d.h),c.tiles.set(u,f));let x=ee(f);x.globalAlpha=Math.max(.05,Math.min(1,t.def.flow*e.flow*1.4)),x.drawImage(a,s-d.x,r-d.y),x.globalAlpha=1,t.touched.add(u),this.#t(u,{x0:s-d.x-1,y0:r-d.y-1,x1:s-d.x+i+1,y1:r-d.y+i+1})}let h=ee(t.carried);h.globalAlpha=.28,h.drawImage(o,0,0),h.globalAlpha=1}#l(t,e,i,s){return Ii(this.grid,{x0:t,y0:e,x1:t+i,y1:e+s}).some(o=>this.dirty.has(o))&&this.flush(),this.#u(me(i,s),t,e)}#u(t,e,i){let s=ee(t);s.clearRect(0,0,t.width,t.height);for(let r of Ii(this.grid,{x0:e,y0:i,x1:e+t.width,y1:i+t.height})){let o=this.composite.get(r);if(!o)continue;let a=Pe(this.grid,r);s.drawImage(o,a.x-e,a.y-i)}return t}commit(t){let e=this.strokes.get(t);if(!e)return new Map;this.strokes.delete(t);let i=new Map,s=(r,o,a)=>{i.has(r)||i.set(r,new Map),i.get(r).set(o,a)};if(e.def.kind==="smudge"){let r=this.layers.get(e.by);for(let o of e.touched)s(e.by,o,r?.tiles.get(o)??null)}else if(e.def.kind==="erase"){let r=e.everyone?[...this.layers.values()]:[this.layers.get(e.by)].filter(Boolean);for(let o of e.touched){let a=this.#a(e,o);for(let l of r){let c=l.tiles.get(o);if(!c||!a)continue;let h=ee(c);h.globalCompositeOperation="destination-out",h.globalAlpha=e.opacity,h.drawImage(a,0,0),h.globalCompositeOperation="source-over",h.globalAlpha=1,s(l.by,o,c)}}}else{let r=this.layers.get(e.by),o=new Set(e.touched);if(e.magic?.glow)for(let a of this.#d(e,r))o.add(a);for(let a of e.touched){let l=this.#a(e,a);if(!l)continue;let c=Pe(this.grid,a),h=r.tiles.get(a);h||(h=me(c.w,c.h),r.tiles.set(a,h));let u=ee(h);u.globalAlpha=e.opacity,u.drawImage(l,0,0),u.globalAlpha=1}if(e.magic?.sparkle)for(let a of this.#f(e,r))o.add(a);for(let a of o)s(e.by,a,r.tiles.get(a)??null);i.painted=!0}for(let r of e.touched)this.#t(r);for(let r of i.values())for(let o of r.keys())this.#t(o);return i}drop(t){let e=this.strokes.get(t);if(e){this.strokes.delete(t);for(let i of e.touched)this.#t(i)}}#d(t,e){let i=la(t.dabs);if(!i)return[];let s=Math.max(6,Math.min(40,(t.dabs[0]?.size??8)*1.6)),r=Math.floor(i.x0-s*2),o=Math.floor(i.y0-s*2),a=Math.ceil(i.x1-i.x0+s*4),l=Math.ceil(i.y1-i.y0+s*4),c=CS,h=Math.max(1,Math.ceil(a/c)),u=Math.max(1,Math.ceil(l/c)),d=me(h,u),f=ee(d);f.imageSmoothingQuality="medium";for(let m of t.touched){let v=this.#a(t,m);if(!v)continue;let E=Pe(this.grid,m);f.drawImage(v,(E.x-r)/c,(E.y-o)/c,E.w/c,E.h/c)}let x=me(h,u),g=ee(x);g.filter=`blur(${s/c}px)`,g.drawImage(d,0,0),g.filter="none";let p=Ii(this.grid,{x0:r,y0:o,x1:r+a,y1:o+l});for(let m of p){let v=Pe(this.grid,m),E=e.tiles.get(m);E||(E=me(v.w,v.h),e.tiles.set(m,E));let M=ee(E);M.globalAlpha=.85,M.imageSmoothingQuality="medium",M.drawImage(x,r-v.x,o-v.y,h*c,u*c),M.globalAlpha=1}return p}#f(t,e){let i=Or(t.dabs[0]?.seed??5),s=new Set,r=20+i()*40;for(let o of t.dabs){if(o.dist<r)continue;r=o.dist+45+i()*70;let a=Math.max(6,o.size*(1.2+i()*1.2)),l=o.x+(i()-.5)*o.size*1.5,c=o.y+(i()-.5)*o.size*1.5,h=i()*.6;for(let u of Ii(this.grid,{x0:l-a,y0:c-a,x1:l+a,y1:c+a})){let d=Pe(this.grid,u),f=e.tiles.get(u);f||(f=me(d.w,d.h),e.tiles.set(u,f));let x=ee(f);x.save(),x.translate(l-d.x,c-d.y),x.rotate(h),x.fillStyle="rgba(255,252,240,0.95)",x.beginPath();for(let g=0;g<8;g++){let p=g/8*Math.PI*2,m=g%2?a*.16:a;x.lineTo(Math.cos(p)*m,Math.sin(p)*m)}x.closePath(),x.fill(),x.restore(),s.add(u)}}return s}fill({x:t,y:e,by:i,colour:s,opacity:r=Me.fill.opacity,grain:o=Me.fill.grain}){let{w:a,h:l}=this.grid,c=Math.floor(t),h=Math.floor(e);if(c<0||h<0||c>=a||h>=l)return{ok:!1,reason:"outside",changed:new Map};this.flush();let u=this.#l(0,0,a,l),d=ee(u).getImageData(0,0,a,l).data,f=ot=>d[ot*4+3]>=TS;if(f(h*a+c))return{ok:!1,reason:"on-paint",changed:new Map};let x=new Uint8Array(a*l),g=[[c,h]],p=0,m=c,v=c,E=h,M=h,T=a*l*ES;for(;g.length;){let[ot,st]=g.pop(),Ut=ot;for(;Ut>0&&!f(st*a+Ut-1)&&!x[st*a+Ut-1];)Ut--;let It=ot;for(;It<a-1&&!f(st*a+It+1)&&!x[st*a+It+1];)It++;for(let Lt=Ut;Lt<=It;Lt++){let X=st*a+Lt;x[X]||f(X)||(x[X]=1,p++)}if(p>T)return{ok:!1,reason:"open",changed:new Map};m=Math.min(m,Ut),v=Math.max(v,It),E=Math.min(E,st),M=Math.max(M,st);for(let Lt of[st-1,st+1]){if(Lt<0||Lt>=l)continue;let X=!1;for(let K=Ut;K<=It;K++){let xt=Lt*a+K,Ot=!x[xt]&&!f(xt);Ot&&!X?(g.push([K,Lt]),X=!0):Ot||(X=!1)}}}let w=2;m=Math.max(0,m-w),E=Math.max(0,E-w),v=Math.min(a-1,v+w),M=Math.min(l-1,M+w);let C=v-m+1,_=M-E+1,S=new Uint8Array(C*_);for(let ot=0;ot<_;ot++){let st=(E+ot)*a;for(let Ut=0;Ut<C;Ut++){let It=m+Ut;for(let Lt=-w;Lt<=w;Lt++){let X=It+Lt;if(X>=0&&X<a&&x[st+X]){S[ot*C+Ut]=1;break}}}}let R=parseInt(s.slice(1),16),[P,L,B]=[R>>16&255,R>>8&255,R&255],I=me(C,_),U=ee(I),V=U.createImageData(C,_),$=Math.round(255*r);for(let ot=0;ot<_;ot++)for(let st=0;st<C;st++){let Ut=0;for(let Lt=-w;Lt<=w;Lt++){let X=ot+Lt;if(X>=0&&X<_&&S[X*C+st]){Ut=1;break}}if(!Ut)continue;let It=(ot*C+st)*4;V.data[It]=P,V.data[It+1]=L,V.data[It+2]=B,V.data[It+3]=$}if(U.putImageData(V,0,0),o>0){let ot=this.grain.pattern(U,Math.round(Math.max(0,Math.min(1,o))*20)/20,m,E);ot&&(U.globalCompositeOperation="destination-in",U.fillStyle=ot,U.fillRect(0,0,C,_),U.globalCompositeOperation="source-over")}let et=this.ensureLayer(i),Z=new Map,J=me(this.grid.tile,this.grid.tile),tt=ee(J);for(let ot of Ii(this.grid,{x0:m,y0:E,x1:v,y1:M})){let st=Pe(this.grid,ot);tt.clearRect(0,0,J.width,J.height),tt.drawImage(I,m-st.x,E-st.y);let Ut=this.#s(ot);Ut&&(tt.globalCompositeOperation="destination-in",tt.drawImage(Ut,0,0),tt.globalCompositeOperation="source-over");let It=et.tiles.get(ot);It||(It=me(st.w,st.h),et.tiles.set(ot,It));let Lt=ee(It);Lt.globalCompositeOperation="destination-over",Lt.drawImage(J,0,0,st.w,st.h,0,0,st.w,st.h),Lt.globalCompositeOperation="source-over",Z.set(ot,It),this.#t(ot)}return{ok:!0,changed:Z,area:p}}pick(t,e){this.flush();let i=Ii(this.grid,{x0:t,y0:e,x1:t,y1:e})[0],s=i?this.composite.get(i):null;if(!s)return null;let r=Pe(this.grid,i),o=ee(s).getImageData(Math.floor(t-r.x),Math.floor(e-r.y),1,1).data;return o[3]<60?null:`#${[o[0],o[1],o[2]].map(a=>a.toString(16).padStart(2,"0")).join("")}`}whoAt(t,e){this.flush();let i=Ii(this.grid,{x0:t,y0:e,x1:t,y1:e})[0];if(!i)return null;let s=Pe(this.grid,i);for(let r of[...this.order].reverse()){let o=this.layers.get(r)?.tiles.get(i);if(!o)continue;if(ee(o).getImageData(Math.floor(t-s.x),Math.floor(e-s.y),1,1).data[3]>=60)return r}return null}#m(){return this.scratch??=me(this.grid.tile,this.grid.tile),this.scratch}#g(t,e=null){let i=Pe(this.grid,t),s=[...this.strokes.values()].filter(l=>l.touched.has(t));if(!s.length&&!this.order.some(l=>this.layers.get(l)?.tiles.has(t))){this.composite.delete(t);return}let r=this.composite.get(t);r||(r=me(i.w,i.h),this.composite.set(t,r),e=null);let o=Xg(e,i.w,i.h);if(!o.w||!o.h)return;let a=ee(r);a.save(),a.beginPath(),a.rect(o.x,o.y,o.w,o.h),a.clip(),a.clearRect(o.x,o.y,o.w,o.h);for(let l of this.order){let h=this.layers.get(l).tiles.get(t),u=s.filter(d=>d.def.kind==="erase"&&(d.by===l||d.everyone));if(h)if(u.length){let d=this.#m(),f=ee(d);f.save(),f.beginPath(),f.rect(o.x,o.y,o.w,o.h),f.clip(),f.clearRect(o.x,o.y,o.w,o.h),f.drawImage(h,0,0),f.globalCompositeOperation="destination-out";for(let x of u){let g=this.#a(x,t);g&&(f.globalAlpha=x.opacity,f.drawImage(g,0,0))}f.restore(),a.drawImage(d,o.x,o.y,o.w,o.h,o.x,o.y,o.w,o.h)}else a.drawImage(h,0,0);for(let d of s){if(d.by!==l||d.def.kind==="erase"||d.def.kind==="smudge")continue;let f=this.#a(d,t);f&&(a.globalAlpha=d.opacity*(d.live?.9:1),a.drawImage(f,0,0),a.globalAlpha=1)}}a.restore()}keys(){return this.flush(),[...this.composite.keys()]}clear(){let t=new Set([...this.composite.keys()]);this.layers.clear(),this.order=[],this.composite.clear(),this.strokes.clear(),this.dirty.clear(),this.onChange(t)}},$g=new WeakMap;function uh(n,t,e){if(!n||!(t>=0&&t<=1&&e>=0&&e<=1))return null;let i=$g.get(n);if(!i){let s=n.naturalWidth||n.width,r=n.naturalHeight||n.height;if(!s||!r)return null;let o=Math.min(1024,s),a=Math.max(1,Math.round(o*r/s)),l=me(o,a),c=ee(l);c.drawImage(n,0,0,o,a),i={x:c,w:o,h:a},$g.set(n,i)}try{let s=i.x.getImageData(Math.min(i.w-1,Math.floor(t*i.w)),Math.min(i.h-1,Math.floor(e*i.h)),1,1).data;return`#${[s[0],s[1],s[2]].map(r=>r.toString(16).padStart(2,"0")).join("")}`}catch{return null}}function RS(n){let t=ee(n).getImageData(0,0,n.width,n.height).data;for(let e=3;e<t.length;e+=4)if(t[e]>3)return!0;return!1}var Od=.85,Yg=64;function jg(n,t=64){let e=255/(t-1);for(let i=3;i<n.length;i+=4)n[i]=Math.round(Math.round(n[i]/e)*e);return n}var PS=`
const roundAlpha = ${jg.toString()};
self.onmessage = async (e) => {
  const { id, bitmap, sure, quality, levels } = e.data;
  try {
    const c = new OffscreenCanvas(bitmap.width, bitmap.height);
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(bitmap, 0, 0);
    bitmap.close();
    const img = x.getImageData(0, 0, c.width, c.height);
    if (!sure) {
      let any = false;
      for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > 3) { any = true; break; }
      if (!any) { self.postMessage({ id, url: null }); return; }
    }
    roundAlpha(img.data, levels);
    x.putImageData(img, 0, 0);
    let blob = await c.convertToBlob({ type: "image/webp", quality });
    if (blob.type !== "image/webp") blob = await c.convertToBlob({ type: "image/png" });
    self.postMessage({ id, url: new FileReaderSync().readAsDataURL(blob) });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};`,Yn,IS=0,Ur=new Map;function LS(){if(Yn!==void 0)return Yn;try{if(typeof Worker>"u"||typeof OffscreenCanvas>"u"||typeof createImageBitmap>"u")throw new Error("no workers here");Yn=new Worker(URL.createObjectURL(new Blob([PS],{type:"text/javascript"}))),Yn.onmessage=({data:n})=>{let t=Ur.get(n.id);t&&(Ur.delete(n.id),n.error?t.fail(new Error(n.error)):t.done(n.url))},Yn.onerror=()=>{Yn=!1;for(let n of Ur.values())n.fail(new Error("the encoder stopped"));Ur.clear()}}catch{Yn=!1}return Yn}function Jg(n,t=!1){if(!n)return Promise.resolve(null);let e=LS();if(!e)return qg(n,t);let i=++IS,s=createImageBitmap(n);return new Promise(r=>{Ur.set(i,{done:r,fail:()=>r(lh(n))}),s.then(o=>e.postMessage({id:i,bitmap:o,sure:t,quality:Od,levels:Yg},[o])).catch(()=>{Ur.delete(i),r(qg(n,t))})})}function kS(n){let t=me(n.width,n.height),e=ee(t);e.drawImage(n,0,0);let i=e.getImageData(0,0,t.width,t.height);return jg(i.data,Yg),e.putImageData(i,0,0),t}function qg(n,t){if(!t&&!RS(n))return Promise.resolve(null);let e=kS(n);return typeof e.toBlob!="function"||typeof FileReader>"u"?Promise.resolve(lh(e)):new Promise(i=>{e.toBlob(s=>{if(!s){i(lh(e));return}let r=new FileReader;r.onload=()=>i(r.result),r.onerror=()=>i(lh(e)),r.readAsDataURL(s)},"image/webp",Od)})}function lh(n){let t=n.toDataURL("image/webp",Od);return t.startsWith("data:image/webp")?t:n.toDataURL("image/png")}var sn=Object.freeze({nameChars:160,textChars:360,ellipsis:"\u2026",step:.06}),yn=.01,Kg=typeof Intl<"u"&&typeof Intl.Segmenter=="function"?new Intl.Segmenter(void 0,{granularity:"grapheme"}):null,Ms=n=>Kg?Array.from(Kg.segment(n),t=>t.segment):Array.from(n);function dh(n,t){let e=Ms(n);return e.length>t?`${e.slice(0,Math.max(0,t-1)).join("").trimEnd()}${sn.ellipsis}`:n}function _n(n,t=1/0){let e=String(n??"");try{e=e.normalize("NFC")}catch{}return e=e.replace(/<br\s*\/?>/gi,`
`).replace(/\\n/g,`
`),e=e.replace(/\r\n?|[\u{b}\u{c}\u{85}\u{2028}\u{2029}]/gu,`
`),e=e.replace(/[\u{0}-\u{8}\u{e}-\u{1f}\u{7f}-\u{9f}\u{200b}\u{feff}\u{2060}]/gu,""),e=e.replace(/[\t\u{a0}\u{1680}\u{2000}-\u{200a}\u{202f}\u{205f}\u{3000}]/gu," "),e=e.split(`
`).map(i=>i.replace(/ {2,}/g," ").trim()).filter(Boolean).join(`
`),dh(e,t)}function fh(n){let t=_n(n?.name??n?.id??""),e=_n(n?.title??"",sn.textChars);if(e)return{name:dh(t,sn.nameChars),text:e};let[i="",...s]=t.split(`
`);return{name:dh(i,sn.nameChars),text:dh(s.join(`
`),sn.textChars)}}function n0(n,{long:t=18}={}){let{name:e,text:i}=fh(n);return!e&&!i||!i&&Ms(e).length<=t?null:{name:e,text:i}}var Bd=n=>JSON.stringify([n?.name??null,n?.title??null,Zn(n?.badges)]),DS=/[\u{1100}-\u{11ff}\u{2e80}-\u{303e}\u{3041}-\u{33ff}\u{3400}-\u{4dbf}\u{4e00}-\u{9fff}\u{a960}-\u{a97f}\u{ac00}-\u{d7af}\u{f900}-\u{faff}\u{fe30}-\u{fe4f}\u{ff00}-\u{ffef}\u{20000}-\u{3134f}]/u,NS=new Set([..."\u3001\u3002\uFF0C\uFF0E\u30FB\uFF1A\uFF1B\uFF01\uFF1F\uFF09\uFF3D\uFF5D\u3015\u3009\u300B\u300D\u300F\u3011\u3019\u3017\u301F\u2019\u201D\u203C\u2047\u2048\u2049\u309D\u309E\u30FD\u30FE\u3005\u30FC\u301C\uFF5E\u2026\u2025\u3041\u3043\u3045\u3047\u3049\u3063\u3083\u3085\u3087\u308E\u3095\u3096\u30A1\u30A3\u30A5\u30A7\u30A9\u30C3\u30E3\u30E5\u30E7\u30EE\u30F5\u30F6"]),OS=new Set([..."\uFF08\uFF3B\uFF5B\u3014\u3008\u300A\u300C\u300E\u3010\u3018\u3016\u301D\u2018\u201C"]),FS=new Set(["-","\u2010","\u2011","\u2013","\u2014","/"]),Qg=(()=>{try{return typeof Intl<"u"&&typeof Intl.Segmenter=="function"?new Intl.Segmenter("ja",{granularity:"word"}):null}catch{return null}})(),Ud=n=>{let t=Ms(n);return{text:n,kind:"cjk",noBefore:NS.has(t[0]),noAfter:OS.has(t.at(-1))}};function US(n){return Qg?Array.from(Qg.segment(n),t=>Ud(t.segment)):Ms(n).map(Ud)}function BS(n){let t=Ms(n),e=[],i="",s="",r=(o=!1)=>{i&&(e.push({text:i,kind:"word",hyphen:o}),i=""),s&&(e.push(...US(s)),s="")};for(let o=0;o<t.length;o++){let a=t[o];if(/^\s+$/u.test(a))r(),e.at(-1)?.kind!=="space"&&e.push({text:" ",kind:"space"});else if(DS.test(a))i&&r(),s+=a;else{s&&r(),i+=a;let l=t[o+1];FS.has(a)&&i.length>1&&l!==void 0&&/[\p{L}\p{N}]/u.test(l)&&r(!0)}}return r(),e}function zd(n,t){return n.kind==="space"||t.kind==="space"?!0:n.noAfter||t.noBefore?!1:n.kind==="cjk"||t.kind==="cjk"||n.hyphen===!0}function zS(n,t,e){let i=[],s=0;for(;s<n.length;){let r=s;for(;r+1<n.length&&!zd(n[r],n[r+1]);)r++;let o=n.slice(s,r+1),a=o.reduce((l,c)=>l+(c.kind==="space"?0:t(c.text)),0)>e+yn;for(let l of o){let c=l.kind==="space"?[]:Ms(l.text);if(a&&c.length>1)for(let h of c)i.push(l.kind==="word"?{text:h,kind:"cjk"}:Ud(h));else i.push(l)}s=r+1}return i}function t0(n,t,e){let i=[],s=n.length,r=0;for(;r<s;){for(;r<s&&n[r].kind==="space";)r++;if(r>=s)break;let o=r,a=0,l=-1,c=r;for(;c<s&&!(n[c].kind!=="space"&&c>o&&a+t[c]>e+yn);c++)a+=t[c],c+1<s&&zd(n[c],n[c+1])&&(l=c+1);let h=c>=s?s:l>o?l:c;i.push([o,h]),r=h}return i}var HS=(n,t,[e,i])=>{let s=i;for(;s>e&&n[s-1].kind==="space";)s--;let r=0;for(let o=e;o<s;o++)r+=t[o];return r};function GS(n,t,e){let i=t0(n,t,e);if(i.length<2)return i;let s=0;for(let a=0;a<n.length;){let l=a,c=n[a].kind==="space"?0:t[a];for(;l+1<n.length&&!zd(n[l],n[l+1]);)l++,c+=t[l];s=Math.max(s,c),a=l+1}let r=e,o=i;for(let a=0;a<14&&r-s>.5;a++){let l=(s+r)/2,c=t0(n,t,l);c.length<=i.length&&c.every(h=>HS(n,t,h)<=l+yn)?(o=c,r=l):s=l}return o}function e0(n,t,e){let i=[];return _n(n).split(`
`).filter(Boolean).forEach((s,r)=>{let o=zS(BS(s),t,e);if(!o.length)return;let a=o.map(l=>t(l.text));for(let[l,c]of GS(o,a,e)){let h=c;for(;h>l&&o[h-1].kind==="space";)h--;let u=o.slice(l,h).map(d=>d.text).join("");i.push({text:u,width:t(u),atoms:o,from:l,paragraph:r})}}),i}function VS(n,t,e){if(t(n)<=e+yn)return n;let i=Ms(n),s=i.length;for(;s>0&&t(i.slice(0,s).join("").trimEnd()+sn.ellipsis)>e+yn;)s--;let r=i.slice(0,s).join(""),o=r.lastIndexOf(" ");return o>r.length*.45&&/\S$/.test(r)&&i[s]!==void 0&&i[s]!==" "&&(r=r.slice(0,o)),r.trimEnd().replace(/[,;:\-\u{2010}\u{2013}\u{2014}/\u{3001}\u{ff0c}]+$/u,"")+sn.ellipsis}function Fd(n,{measureAt:t,width:e,sizes:i,maxLines:s,lineHeight:r=1.15}){let o=(g,p,m)=>({size:g,lineHeight:r,lines:p.map(({text:v,width:E})=>({text:v,width:E})),height:p.length*g*r,truncated:m});if(!_n(n))return o(i.at(-1),[],!1);for(let g of i){let p=e0(n,t(g),e);if(p.length<=s&&p.every(m=>m.width<=e+.5))return o(g,p,!1)}let a=i.at(-1),l=t(a),c=e0(n,l,e),h=c.slice(0,s),u=h.at(-1),d=u.atoms.slice(u.from).map(g=>g.text).join("").trim(),f=c.length>s,x=f&&l(d+sn.ellipsis)<=e+yn?d+sn.ellipsis:VS(d,l,e);return h[h.length-1]={text:x,width:l(x)},o(a,h,f||x!==d)}function i0(n,t,e=sn.step){let i=[];for(let s=n;s>t;s=Math.min(s-1,Math.round(s*(1-e))))i.push(s);return i.push(t),[...new Set(i)]}function s0({name:n,text:t},e){let{width:i,maxHeight:s,gap:r=12}=e,o={name:_n(n),text:_n(t)},a=i0(e.name.max,e.name.min),l=i0(e.text.max,e.text.min),c=e.name.comfort??.7,h=(m,v=e.name.maxLines)=>Fd(o.name,{measureAt:e.measureName,width:i,sizes:m,maxLines:v,lineHeight:e.name.lineHeight}),u=m=>{for(let M=1;M<=e.text.maxLines;M++)for(let T of l){let w=Fd(o.text,{measureAt:e.measureText,width:i,sizes:[T],maxLines:M,lineHeight:e.text.lineHeight});if(!w.truncated&&w.height<=m+yn)return w}let v=l.at(-1),E=Math.min(e.text.maxLines,Math.floor((m+yn)/(v*e.text.lineHeight)));return E<1?null:Fd(o.text,{measureAt:e.measureText,width:i,sizes:[v],maxLines:E,lineHeight:e.text.lineHeight})},d=(m,v)=>({name:m,text:v,gap:v?r:0,height:m.height+(v?r+v.height:0),truncated:{name:m.truncated,text:v?.truncated??!1},full:o}),f=e.name.max*(e.name.floor??.62),x=null;t:for(let m=1;m<=e.name.maxLines;m++){let v=m<e.name.maxLines?a.filter(E=>E>=e.name.max*c):a;for(let E of v){if(x&&E<f)break t;let M=h([E],m);if(M.truncated||M.height>s+yn)continue;if(!o.text)return d(M,null);let T=u(s-M.height-r);if(T){if(!T.truncated)return d(M,T);x??=d(M,T)}}}if(x)return x;let g=h([e.name.min]),p=o.text?u(s-g.height-r):null;return d(g,p)}var Hd=Object.freeze({gap:14,name:Object.freeze({family:"sans-serif",weight:800,max:58,min:32,maxLines:2,lineHeight:1.06,tracking:.03,upper:!0}),text:Object.freeze({family:"sans-serif",weight:700,max:34,min:24,maxLines:3,lineHeight:1.18,tracking:0,upper:!1})}),r0=(n,t)=>`${n.weight} ${t}px ${n.family}`;function ph({canvas:n=()=>document.createElement("canvas")}={}){let t=null,e=()=>t??=n().getContext("2d"),i=r=>o=>{let a=e();return a.font=r0(r,o),"letterSpacing"in a&&(a.letterSpacing=`${(r.tracking??0)*o}px`),l=>{let c=a.measureText(l);return Number.isFinite(c?.width)?c.width:[...l].length*o*.55}},s=(r,o)=>({...r,...o??{}});return{textOf:fh,fit(r,o={}){let a=s(Hd.name,o.name),l=s(Hd.text,o.text),{name:c,text:h}=fh(r),u=s0({name:a.upper?c.toLocaleUpperCase("en"):c,text:l.upper?h.toLocaleUpperCase("en"):h},{width:o.width,maxHeight:o.maxHeight,gap:o.gap??Hd.gap,name:a,text:l,measureName:i(a),measureText:i(l)});return u.full={name:_n(c),text:_n(h)},u.style={name:a,text:l},u},draw(r,o,a,l={}){let c={ink:"#231c10",textInk:"rgba(35,28,16,0.86)",rule:"rgba(35,28,16,0.38)",embolden:.04,emboss:null,...l},{x:h,y:u,w:d,h:f}=a,x=u+(f-o.height)/2;r.save(),r.textAlign="center",r.textBaseline="middle",r.lineJoin="round";let g=(p,m,v,E)=>{let M=p.size;r.font=r0(m,M);let T=(m.tracking??0)*M;"letterSpacing"in r&&(r.letterSpacing=`${T}px`),p.lines.forEach((w,C)=>{let _=x+(C+.5)*M*p.lineHeight+M*.04,S=h+d/2+(T?T/2:0);c.emboss&&(r.fillStyle=c.emboss,r.fillText(w.text,S,_+Math.max(1,M*.035))),r.fillStyle=v,E>0&&(r.strokeStyle=v,r.lineWidth=M*E,r.strokeText(w.text,S,_)),r.fillText(w.text,S,_)}),x+=p.height};if(g(o.name,o.style.name,c.ink,c.embolden),o.text){if(c.rule){r.fillStyle=c.rule;let p=Math.min(d*.32,150);r.fillRect(h+(d-p)/2,x+o.gap/2-1,p,2)}x+=o.gap,g(o.text,o.style.text,c.textInk,0)}"letterSpacing"in r&&(r.letterSpacing="0px"),r.restore()}}}var WS=4e3,mh=class{constructor({images:t=new ys,onContextLost:e=null}={}){this.images=t,this.onContextLost=e,this.name="three",this.capabilities={lights:!0,shadows:!0,post:!0,particles:!0,marks:!0,zoneOutlines:!0,chalk:!0,camera:!1,capture:!0,footlights:!0},this.views=new Map,this.adding=new Set,this.tier="high",this.needsRebuild=!1,this.zoneSetting="off",this.calm=!1,this.disposed=!1,this.ready=!1}mount(t,{quality:e="high",pixelRatio:i=1,width:s=1280,height:r=720}={}){this.tier=e,this.settings=ug(e),this.element=t,this.tracker=new Hc,this.canvas=document.createElement("canvas"),this.canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;",t.append(this.canvas),this.renderer=new Ic({canvas:this.canvas,antialias:!this.settings.post,powerPreference:"high-performance"}),this.renderer.info.autoReset=!1,this.renderer.shadowMap.enabled=this.settings.shadows,this.renderer.shadowMap.type=fs,this.renderer.outputColorSpace=Se,this.renderer.toneMapping=bi,this.scene=new Mo,this.camera=new Xe,this.softDot=this.tracker.add(yg()),this.canvas.addEventListener("webglcontextlost",o=>{o.preventDefault(),!this.disposed&&(this.contextLost=!0,this.onContextLost?.())}),this.#t(s,r,i)}#t(t,e,i){this.width=t,this.height=e,this.ratio=Math.min(i||1,this.settings.pixelRatioCap),this.view=Kr(t,e),this.renderer.setPixelRatio(this.ratio),this.renderer.setSize(t,e,!1),this.rig&&wd(this.camera,this.rig,this.view),this.post?.setSize(Math.round(t*this.ratio),Math.round(e*this.ratio))}resize(t,e,i=1){this.disposed||this.#t(t,e,i)}setQuality(t){t!==this.tier&&(this.tier=t,this.needsRebuild=!0)}setCalm(t){this.calm=!!t,this.fx&&(this.fx.calm=this.calm),this.post?.setCalm(this.calm)}setZoneSetting(t){this.zoneSetting=t}setFootlights(t){this.world?.setFootlights(t)}async load(t,e,i=[]){this.description=t,this.skin=e,this.rig=ks(t.painting,t.rig),this.fx=null,await Promise.all((e.fonts??[]).map(r=>document.fonts?.load(r).catch(()=>null)));let s=await this.images.loadImage(t.painting.src);if(!s)throw new Error(`the painting "${t.painting.src}" could not be loaded`);this.disposed||(this.paintingImage=s,wd(this.camera,this.rig,this.view),this.#i(s),this.world=await new Vc({scene:t,rig:this.rig,tracker:this.tracker,softDot:this.softDot,settings:this.settings}).build(s),this.scene.add(this.world.group),this.zones=new $c({scene:this.scene,rig:this.rig,zones:t.zones,tracker:this.tracker}),this.boardLabels=new qc({scene:this.scene,rig:this.rig,zones:t.zones,tracker:this.tracker,cardHeight:e.size.h*t.cardScale}),this.marks=new Yc({scene:this.scene,tracker:this.tracker,softDot:this.softDot}),this.fx=new Zc({scene:this.scene,rig:this.rig,tracker:this.tracker,softDot:this.softDot,settings:this.settings,cardHeight:e.size.h*t.cardScale}),this.fx.calm=this.calm,this.chalkTiles=new nh({scene:this.scene,rig:this.rig}),this.chalkBox=new sh({scene:this.scene,rig:this.rig,at:t.chalk.box??kr,tracker:this.tracker}),this.chalkBox.setVisible(!1),await Promise.all(i.map(r=>this.addCard(r))),this.settings.post&&(this.post=new th(this.renderer,this.scene,this.camera,{width:Math.round(this.width*this.ratio),height:Math.round(this.height*this.ratio),samples:this.settings.msaa}),this.post.setCalm(this.calm)),await this.#e(this.scene),this.world.setFootlights(t.footlights),this.ready=!0)}async#e(t){let e=0;try{let i=this.renderer.getRenderTarget();this.renderer.setRenderTarget(this.post?.target??null);let s=null;try{this.renderer.compileAsync?s=this.renderer.compileAsync(t,this.camera,this.scene):this.renderer.compile(t,this.camera,this.scene)}finally{this.renderer.setRenderTarget(i)}await Promise.race([s,new Promise(r=>{e=setTimeout(r,WS)})])}catch(i){console.warn("stagecraft | a shader could not be built ahead; it will be at the first draw",i)}finally{clearTimeout(e)}}#i(t){let e=new Sr(this.renderer),i=new Be(t);i.mapping=xr,i.colorSpace=Se,i.needsUpdate=!0;let s=e.fromEquirectangular(i);this.tracker.add(s),this.scene.environment=s.texture,this.scene.environmentIntensity=.6,i.dispose(),e.dispose()}async addCard(t){if(!(this.views.has(t.id)||this.adding.has(t.id)||this.disposed)){this.adding.add(t.id);try{this.titleBlock??=ph();let e={tracker:this.tracker,images:this.images,titleBlock:this.titleBlock,softDot:this.softDot,scene:this.scene,emoteTexture:s=>this.#n(s)},i=new Xc(t,this.skin,e,this.description.cardScale*(t.size??1));if(await i.build(),this.disposed){i.dispose();return}if(this.ready&&await this.#e(i.root),this.disposed){i.dispose();return}this.views.set(t.id,i),this.scene.add(i.root,i.blob),t.emote?.id&&await i.setEmote(t.emote.id)}finally{this.adding.delete(t.id)}}}removeCard(t){let e=this.views.get(t);e&&(e.dispose(),this.views.delete(t))}async refreshCard(t){let e=this.views.get(t.id);!e||this.disposed||await e.refresh(t)}#n(t){if(this.emoteCache??=new Map,!this.emoteCache.has(t)){let e=Nc[t]?.svg;this.emoteCache.set(t,e?new Promise(i=>{let s=new Image;s.onload=()=>{let r=document.createElement("canvas");r.width=r.height=256,r.getContext("2d").drawImage(s,0,0,256,256),i(this.tracker.add(ai(r)))},s.onerror=()=>i(null),s.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(e.replace("<svg ",'<svg width="256" height="256" '))}`}):Promise.resolve(null))}return this.emoteCache.get(t)}draw(t){if(!this.ready||this.disposed||this.contextLost)return;let e=t.t;this.world.update(e);for(let i of t.cards)this.views.get(i.id)?.pose(i);this.zones.update(t.zones,this.zoneSetting,e,t.board??null),this.boardLabels.update(t.board??null),this.marks.update(t.marks,this.views,e),this.fx.update(t.bonks,e),this.renderer.info.reset(),this.post?this.post.render(e):this.renderer.render(this.scene,this.camera)}#s(t,e){return this.raycaster??=new Fo,this.ndc??=new Mt,this.ndc.set(t/this.width*2-1,-(e/this.height*2-1)),this.raycaster.setFromCamera(this.ndc,this.camera),this.raycaster}pick(t,e){if(!this.ready)return null;let i=[];for(let o of this.views.values())i.push(...o.pickables);if(this.chalkBox?.group.visible&&i.push(...this.chalkBox.pickables),!i.length)return null;let s=this.#s(t,e).intersectObjects(i,!1)[0];if(!s)return null;let r={x:s.point.x,y:s.point.y,z:s.point.z};return s.object.userData.chalk?{kind:"chalk",colour:s.object.userData.chalk,point:r}:s.object.userData.magic?{kind:"magic",point:r}:s.object.userData.eraser?{kind:"eraser",point:r}:{kind:"card",id:s.object.userData.cardId,point:r}}paintingAt(t,e){this.backPlane??=new ci(new D(0,0,1),Ti),this.hit??=new D;let i=this.hit;if(!this.#s(t,e).ray.intersectPlane(this.backPlane,i))return null;let{cx:s,cy:r,f:o,floorY:a}=this.rig.cam,l=o/(o+Ti),c=s+i.x*l,h=r+(a-r-i.y)*l,[u,d]=this.rig.fractionOfScreen(c,h);return u>=0&&u<=1&&d>=0&&d<=1?{x:u,y:d}:null}floorAt(t,e,i=0){return this.floorPlane??=new ci(new D(0,1,0),0),this.floorPlane.constant=-i,this.hit??=new D,this.#s(t,e).ray.intersectPlane(this.floorPlane,this.hit)?{x:this.hit.x,z:this.hit.z}:null}project({X:t,Y:e,Z:i}){let s=this.rig.screenOf(t,e,i);return{x:(s.x-this.view.ox)*this.view.s,y:(s.y-this.view.oy)*this.view.s,k:s.k}}setChalkTiles(t,e,i=!1){this.chalkTiles?.update(t,e,i)}setChalkHidden(t){this.chalkTiles?.setHidden(t)}setChalkBox(t){this.chalkBox?.setVisible(t)}setChalkBoxAt(t){this.rig&&this.chalkBox?.moveTo(this.rig,t)}paintingColour(t,e){return uh(this.paintingImage,t,e)}async capture(){return this.post?this.post.render(0):this.renderer.render(this.scene,this.camera),new Promise(t=>this.canvas.toBlob(t,"image/png"))}stats(){let t=this.renderer?.info;return t?{calls:t.render.calls,triangles:t.render.triangles,textures:t.memory.textures,geometries:t.memory.geometries,tracked:this.tracker.size}:null}unmount(){this.canvas?.remove()}dispose(){if(!this.disposed){this.disposed=!0;for(let t of this.views.values())t.dispose();this.views.clear(),this.chalkTiles?.dispose(),this.post?.dispose(),this.tracker?.disposeAll(),this.scene?.environment?.dispose?.(),this.renderer?.dispose(),this.contextLost||this.renderer?.forceContextLoss(),this.unmount()}}};var ua=Math.PI/180,yC=Object.freeze([1,0,0,1,0,0]),ha=(n,t)=>[n[0]*t[0]+n[2]*t[1],n[1]*t[0]+n[3]*t[1],n[0]*t[2]+n[2]*t[3],n[1]*t[2]+n[3]*t[3],n[0]*t[4]+n[2]*t[5]+n[4],n[1]*t[4]+n[3]*t[5]+n[5]],o0=(n,t)=>[1,0,0,1,n,t],a0=(n,t=n)=>[n,0,0,t,0,0],l0=n=>[Math.cos(n),Math.sin(n),-Math.sin(n),Math.cos(n),0,0],XS=(n,t,e)=>({x:n[0]*t+n[2]*e+n[4],y:n[1]*t+n[3]*e+n[5]});function ZS(n){let t=n[0]*n[3]-n[1]*n[2];return Math.abs(t)<1e-12?null:[n[3]/t,-n[1]/t,-n[2]/t,n[0]/t,(n[2]*n[5]-n[3]*n[4])/t,(n[1]*n[4]-n[0]*n[5])/t]}var gh=(n,t,e)=>({x:(t-n.ox)*n.s,y:(e-n.oy)*n.s}),c0=(n,t,e)=>({x:t/n.s+n.ox,y:e/n.s+n.oy});function jn(n,t,{X:e,Y:i,Z:s}){let r=n.screenOf(e,i,s);return{...gh(t,r.x,r.y),k:r.k}}function h0(n,t,e,i,s=0){let{cam:r}=n,o=c0(t,e,i),a=r.floorY-s-r.cy;if(a===0)return null;let l=(o.y-r.cy)/a;return l>0?{x:(o.x-r.cx)/l,z:r.f-r.f/l}:null}function u0(n,t,e,i){let s=c0(t,e,i),[r,o]=n.fractionOfScreen(s.x,s.y);return r>=0&&r<=1&&o>=0&&o<=1?{x:r,y:o}:null}function Gd(n,t,e,{stickLen:i=134}={}){let s=n.grip??0,r=n.scale??1,o=t.screenOf(n.x,n.lift??0,n.z),a=gh(e,o.x,o.y),l=o.k*e.s,c=1-.45*s,h=(n.lean??0)*ua,u=i*r*s,d=(n.yaw??0)*ua,f=Math.cos(d),x=Math.max(.55-.35*(n.down??0),Math.cos((n.pitch??0)*ua)),g=ha(o0(a.x,a.y),ha(a0(l),l0(h*c))),p=ha(g,ha(o0(0,-u),l0(h*(1-c)))),m=r*Math.max(.03,Math.abs(f)),v=r*(n.breathe??1)*(n.squash??1)*x;return{m:ha(p,a0(m,v)),stick:g,at:a,k:o.k,px:l,back:f<0,side:Math.abs(Math.sin(d)),hinge:u,share:c}}function d0(n,t,e,i,s){let r=ZS(n.m);if(!r)return null;let o=XS(r,i,s),{w:a,h:l}=e;if(o.x<-a/2||o.x>a/2||o.y<-l||o.y>bs.depth)return null;let c=Math.max(0,-o.y)*(t.scale??1)*(t.breathe??1)*(t.squash??1);return(t.lift??0)+n.hinge+c}var bs=Object.freeze({width:.5,depth:12}),f0=(n,t)=>n.z-t.z;var p0=-10*ua,da=Object.freeze({at:[Gi.eraser.x,20,4],size:[50,32,30],hit:{y0:0,y1:60,half:29}});function m0(n,t,e){let i=n.standing(e);if(!i)return null;let s=Math.cos(p0),r=Math.sin(p0),o=(I,U,V)=>jn(n,t,{X:i.X+I*s+V*r,Y:U,Z:i.Z-I*r+V*s}),a=I=>I.map(([U,V,$])=>{let et=o(U,V,$);return[et.x,et.y]}),{width:l,depth:c,wall:h,stick:u,hit:d}=Gi,f=4+h,x=Cg.map((I,U)=>{let V=u.first+U*u.spacing,$=(U%2-.5)*6,et=(U%3-1)*.07,Z=o(V,-2,$),J=o(V-Math.sin(et)*u.height,-2+Math.cos(et)*u.height,$),tt=o(V,4+d.height/2-14-d.height/2,0),ot=o(V,4+d.height/2-14+d.height/2,0),st=d.radius*tt.k*t.s;return{colour:I,base:{x:Z.x,y:Z.y},top:{x:J.x,y:J.y},width:2*u.radius*Z.k*t.s,hit:{x0:tt.x-st,x1:tt.x+st,y0:ot.y,y1:tt.y}}}),g=Gi.magic,p=o(g.x,-2,2),m=o(g.x-Math.sin(.06)*g.height,-2+Math.cos(.06)*g.height,2),v=o(g.x,4+d.height/2-14-d.height/2,0),E=o(g.x,4+d.height/2-14+d.height/2,0),M=d.radius*v.k*t.s,[T,w,C]=da.at,[_,S,R]=da.size,P=o(T,da.hit.y0,C),L=o(T,da.hit.y1,C),B=da.hit.half*P.k*t.s;return{z:i.Z,floor:a([[-l/2,4,-c/2],[l/2,4,-c/2],[l/2,4,c/2],[-l/2,4,c/2]]),back:a([[-l/2,4,-c/2],[l/2,4,-c/2],[l/2,f,-c/2],[-l/2,f,-c/2]]),left:a([[-l/2,4,-c/2],[-l/2,4,c/2],[-l/2,f,c/2],[-l/2,f,-c/2]]),right:a([[l/2,4,-c/2],[l/2,4,c/2],[l/2,f,c/2],[l/2,f,-c/2]]),front:a([[-l/2,4,c/2],[l/2,4,c/2],[l/2,f,c/2],[-l/2,f,c/2]]),sticks:x,magic:{base:{x:p.x,y:p.y},top:{x:m.x,y:m.y},width:2*g.radius*p.k*t.s,hit:{x0:v.x-M,x1:v.x+M,y0:E.y,y1:v.y}},eraser:{front:a([[T-_/2,w-S/2,C+R/2],[T+_/2,w-S/2,C+R/2],[T+_/2,w+S/2,C+R/2],[T-_/2,w+S/2,C+R/2]]),top:a([[T-_/2,w+S/2,C-R/2],[T+_/2,w+S/2,C-R/2],[T+_/2,w+S/2,C+R/2],[T-_/2,w+S/2,C+R/2]]),hit:{x0:P.x-B,x1:P.x+B,y0:L.y,y1:P.y}}}}var Vd=(n,t,e)=>t>=n.x0&&t<=n.x1&&e>=n.y0&&e<=n.y1;function g0(n,t,e){if(!n)return null;if(Vd(n.eraser.hit,t,e))return{kind:"eraser"};if(Vd(n.magic.hit,t,e))return{kind:"magic"};for(let i of n.sticks)if(Vd(i.hit,t,e))return{kind:"chalk",colour:i.colour};return null}var x0=.42,y0=.2,_0=.8,v0=22,$S=3,qS=1,Wd=(n,t="#80512d")=>typeof n=="number"?`#${n.toString(16).padStart(6,"0")}`:t;function YS(n,t){let e=Math.min(2048,n),i=Math.round(e*t/n),s=document.createElement("canvas");return s.width=e,s.height=i,{canvas:s,ctx:s.getContext("2d"),cw:e,ch:i}}var xh=class{constructor({images:t,onContextLost:e=null}={}){this.images=t,this.onContextLost=e,this.name="flat",this.capabilities={lights:!1,shadows:!1,post:!1,particles:!1,marks:!0,zoneOutlines:!0,chalk:!0,camera:!1,capture:!0,footlights:!1},this.tier="flat",this.views=new Map,this.adding=new Set,this.emotes=new Map,this.calm=!1,this.zoneSetting="off",this.disposed=!1,this.ready=!1,this.order=[],this.flashes=[],this.zoneKey="",this.revision=0,this.chalkWall=null,this.chalkDirty=new Set,this.hidden=!1,this.boxShown=!1,this.draws=0}mount(t,{pixelRatio:e=1,width:i=1280,height:s=720}={}){if(this.element=t,this.canvas=document.createElement("canvas"),this.canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;",t.append(this.canvas),this.ctx=this.canvas.getContext("2d",{alpha:!1}),!this.ctx)throw new Error("this browser cannot draw on a 2D canvas");this.#t(i,s,e)}#t(t,e,i){this.width=t,this.height=e,this.ratio=Math.min(i||1,qS),this.view=Kr(t,e),this.canvas.width=Math.max(1,Math.round(t*this.ratio)),this.canvas.height=Math.max(1,Math.round(e*this.ratio)),this.backdrop=null,this.backdropKey="",this.occluderBitmaps=null,this.boxCache=null}resize(t,e,i=1){this.disposed||this.#t(t,e,i)}setQuality(){}setCalm(t){this.calm=!!t}setZoneSetting(t){this.zoneSetting=t,this.zoneKey=""}setFootlights(){}async load(t,e,i=[]){this.description=t,this.skin=e,this.rig=ks(t.painting,t.rig),await Promise.all((e.fonts??[]).map(a=>document.fonts?.load(a).catch(()=>null)));let s=await this.images.loadImage(t.painting.src);if(!s)throw new Error(`the painting "${t.painting.src}" could not be loaded`);if(this.disposed)return;this.painting=s;let[r,o]=this.rig.size;this.zoneLayer=YS(r,o),this.impact=Uc(),this.markImage=Bc(),this.labelImages=new Map,this.occluders=t.occluders.map(a=>{let l=this.rig.standing([a.x,a.base]);return l?{poly:a.poly.map(([c,h])=>[this.rig.map.x(c),this.rig.map.y(h)]),z:l.Z}:null}).filter(Boolean),await Promise.all(i.map(a=>this.addCard(a))),this.ready=!0}async addCard(t){if(!(this.views.has(t.id)||this.adding.has(t.id)||this.disposed)){this.adding.add(t.id);try{let e=this.#e(),[i,s]=await Promise.all([Cr(this.skin,t,e),this.skin.back(t,e)]);if(this.disposed)return;this.views.set(t.id,{id:t.id,person:t,face:this.#i(i),back:this.#i(s),w:this.skin.size.w,h:this.skin.size.h}),t.emote?.id&&this.#n(t.emote.id)}finally{this.adding.delete(t.id)}}}removeCard(t){this.views.delete(t)}#e(){return this.titleBlock??=ph(),{loadImage:this.images.loadImage,titleBlock:this.titleBlock}}async refreshCard(t){let e=this.views.get(t.id);if(!e||this.disposed)return;let i={...e.person,...t},s=this.#e(),[r,o]=await Promise.all([Cr(this.skin,i,s),this.skin.back(i,s)]);this.disposed||this.views.get(t.id)!==e||(e.person=i,e.face=this.#i(r),e.back=this.#i(o))}#i(t){let{w:e,h:i}=this.skin.size;if(!(t.width>e*1.3))return t;let s=document.createElement("canvas");s.width=e,s.height=i;let r=s.getContext("2d");return r.imageSmoothingQuality="high",r.drawImage(t,0,0,e,i),s}#n(t){if(this.emotes.has(t))return this.emotes.get(t);this.emotes.set(t,null);let e=Nc[t]?.svg;if(e){let i=new Image;i.onload=()=>this.emotes.set(t,i),i.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(e.replace("<svg ",'<svg width="256" height="256" '))}`}return null}#s(){let{view:t,ratio:e}=this;this.#r([t.s,0,0,t.s,-t.ox*t.s,-t.oy*t.s],e)}#r(t,e=this.ratio){this.ctx.setTransform(t[0]*e,t[1]*e,t[2]*e,t[3]*e,t[4]*e,t[5]*e)}#o(){return this.boxShown?(this.boxCache??={layout:m0(this.rig,this.view,this.boxAt??this.description.chalk?.box??kr)},this.boxCache.layout):null}#c(t,e){let{rig:i,view:s,ratio:r}=this,o=t.board??null,a=this.description.zones.length?Oc(this.description.zones,t.zones,this.zoneSetting,e,o):"",l=`${this.canvas.width}x${this.canvas.height}|${a}|${this.revision}|${this.hidden?1:0}`;if(this.backdrop&&l===this.backdropKey){this.chalkDirty.size&&this.#h();return}if(this.backdropKey=l,this.chalkDirty.clear(),!this.backdrop){let m=document.createElement("canvas");m.width=this.canvas.width,m.height=this.canvas.height,this.backdrop={canvas:m,ctx:m.getContext("2d",{alpha:!1})}}let c=this.backdrop.ctx,h=i.map,[u,d]=i.size;c.setTransform(1,0,0,1,0,0),c.globalAlpha=1,c.fillStyle="#0c0a08",c.fillRect(0,0,this.canvas.width,this.canvas.height),c.setTransform(s.s*r,0,0,s.s*r,-s.ox*s.s*r,-s.oy*s.s*r),c.imageSmoothingQuality="high";let f=u*h.s,x=d*h.s;c.drawImage(this.painting,h.ox,h.oy,f,x);let g=h.oy+x,p=s.oy+s.visH-g;if(p>0){let m=Math.min(p+8,x*.6);c.save(),c.globalAlpha=.55,c.translate(0,g),c.scale(1,-1),c.drawImage(this.painting,0,d-m/h.s,u,m/h.s,h.ox,-m,f,m),c.restore()}if(this.zoneLayer&&this.description.zones.length&&(a!==this.zoneKey&&(this.zoneKey=a,Fc(this.zoneLayer.ctx,this.zoneLayer.cw,this.zoneLayer.ch,this.description.zones,t.zones,this.zoneSetting,e,o)),c.drawImage(this.zoneLayer.canvas,h.ox,h.oy,f,x)),!this.hidden&&this.chalkWall)for(let m of this.chalkWall.composite.keys())this.#a(c,m)}#a(t,e){let i=this.chalkWall.composite.get(e);if(!i)return;let s=this.chalkWall.grid,r=Pe(s,e),o=this.rig.map,[a,l]=this.rig.size,c=a*o.s,h=l*o.s;t.drawImage(i,o.ox+r.x/s.w*c,o.oy+r.y/s.h*h,r.w/s.w*c,r.h/s.h*h)}#h(){let{rig:t,view:e,ratio:i}=this,s=this.backdrop.ctx,r=this.chalkWall?.grid,o=t.map,[a,l]=t.size,c=a*o.s,h=l*o.s,u=1.5/(e.s*i);s.setTransform(e.s*i,0,0,e.s*i,-e.ox*e.s*i,-e.oy*e.s*i),s.globalAlpha=1,s.imageSmoothingQuality="high";for(let d of this.chalkDirty){let f=r?Pe(r,d):null;if(!f)continue;let x=Math.max(o.ox,o.ox+f.x/r.w*c-u),g=Math.max(o.oy,o.oy+f.y/r.h*h-u),p=Math.min(o.ox+c,o.ox+(f.x+f.w)/r.w*c+u),m=Math.min(o.oy+h,o.oy+(f.y+f.h)/r.h*h+u);if(s.save(),s.beginPath(),s.rect(x,g,p-x,m-g),s.clip(),s.fillStyle="#0c0a08",s.fillRect(x,g,p-x,m-g),s.drawImage(this.painting,o.ox,o.oy,c,h),this.zoneLayer&&this.description.zones.length&&s.drawImage(this.zoneLayer.canvas,o.ox,o.oy,c,h),!this.hidden)for(let v of Ii(r,{x0:f.x-2,y0:f.y-2,x1:f.x+f.w+2,y1:f.y+f.h+2}))this.#a(s,v);s.restore()}this.chalkDirty.clear()}draw(t){if(!this.ready||this.disposed)return;let{ctx:e,rig:i,view:s}=this,r=t.t;this.draws++,e.imageSmoothingQuality="medium",this.#c(t,r),e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="source-over",e.drawImage(this.backdrop.canvas,0,0),this.#u(t,r),this.#l(t);let o=[];for(let l of t.cards){let c=this.views.get(l.id);c&&o.push({kind:"card",z:l.z,c:l,v:c,pl:Gd(l,i,s,{stickLen:this.skin.stick?.length??134})})}for(let l of this.occluders)o.push({kind:"occluder",z:l.z,o:l});let a=this.#o();a&&o.push({kind:"box",z:a.z,layout:a}),o.sort(f0);for(let l of o)l.kind==="card"?this.#m(l.c,l.v,l.pl):l.kind==="occluder"?this.#d(l.o):this.#g(l.layout);this.order=o,this.#p(t),this.#x(t,r)}#l(t){let{ctx:e,rig:i}=this;this.#s();for(let s of t.cards){let r=this.views.get(s.id);if(!r)continue;let o=s.grip??0,a=s.scale??1,l=i.screenOf(s.x,.6,s.z),c=r.w*a*(.95+.5*o)/2*l.k,h=(74+46*o)/2,u=i.screenOf(s.x,.6,s.z+h),d=i.screenOf(s.x,.6,s.z-h),f=Math.max(2,Math.abs(u.y-d.y)/2);if(s.selected||s.speaking){e.globalAlpha=s.selected?.85:.6,e.fillStyle=s.selected?"#ff9a46":"#fff0c8",e.beginPath(),e.ellipse(l.x,l.y,c*1.45,f*1.6,0,0,Math.PI*2),e.fill();continue}e.globalAlpha=.62-.26*o,e.fillStyle="#000",e.beginPath(),e.ellipse(l.x,l.y,c,f,0,0,Math.PI*2),e.fill()}e.globalAlpha=1}#u(t,e){let{ctx:i,rig:s}=this;this.#s();for(let r of t.marks.slice(0,6)){let o=r.target?1+.06*Math.sin(e*7):1,a=s.screenOf(r.X,1.2,r.Z),l=(r.target?190:150)*o*a.k,c=(r.target?120:96)*o/2,h=Math.abs(s.screenOf(r.X,1.2,r.Z+c).y-s.screenOf(r.X,1.2,r.Z-c).y);i.globalAlpha=Math.min(1,r.alpha)*(r.target?1:.8),i.drawImage(this.markImage,a.x-l/2,a.y-h/2,l,Math.max(h,4))}i.globalAlpha=1}#d(t){this.occluderBitmaps??=new Map;let e=this.occluderBitmaps.get(t);e===void 0&&(e=this.#f(t),this.occluderBitmaps.set(t,e)),e&&(this.ctx.setTransform(1,0,0,1,0,0),this.ctx.drawImage(e.canvas,e.x,e.y))}#f(t){let{view:e,ratio:i,rig:s}=this,r=t.poly.map(([M,T])=>gh(e,M,T)),o=Math.max(0,Math.floor(Math.min(...r.map(M=>M.x))*i)),a=Math.max(0,Math.floor(Math.min(...r.map(M=>M.y))*i)),l=Math.min(this.canvas.width,Math.ceil(Math.max(...r.map(M=>M.x))*i)),c=Math.min(this.canvas.height,Math.ceil(Math.max(...r.map(M=>M.y))*i));if(l<=o||c<=a)return null;let h=document.createElement("canvas");h.width=l-o,h.height=c-a;let u=h.getContext("2d");u.imageSmoothingQuality="high",u.save(),u.setTransform(e.s*i,0,0,e.s*i,-e.ox*e.s*i-o,-e.oy*e.s*i-a),u.beginPath(),t.poly.forEach(([M,T],w)=>w?u.lineTo(M,T):u.moveTo(M,T)),u.closePath(),u.clip();let[d,f]=s.size;u.drawImage(this.painting,s.map.ox,s.map.oy,d*s.map.s,f*s.map.s),u.restore();let x=t.poly.map(M=>M[1]),g=Math.min(ka,(Math.max(...x)-Math.min(...x))*Da)*e.s*i,p=Na(r.map(M=>[M.x*i-o,M.y*i-a]),h.width,h.height,g),m=document.createElement("canvas");m.width=h.width,m.height=h.height;let v=m.getContext("2d"),E=v?.createImageData?.(m.width,m.height);if(E?.data){for(let M=0;M<p.length;M++)E.data[M*4+3]=p[M];v.putImageData(E,0,0),u.globalCompositeOperation="destination-in",u.drawImage(m,0,0),u.globalCompositeOperation="source-over"}return{canvas:h,x:o,y:a}}#m(t,e,i,{ghost:s=!1}={}){let{ctx:r,skin:o}=this,a=e.w,l=e.h,c=t.scale??1,h=t.grip??0;if(!s&&h>.02){this.#r(i.stick);let f=i.hinge,x=Wd(o.stick?.wood),g=Wd(o.stick?.collar,"#b8924f"),p=Math.min(18*c,f);r.fillStyle=x,r.beginPath(),r.moveTo(-6.4*c,0),r.lineTo(-8.5*c,-f+p),r.lineTo(8.5*c,-f+p),r.lineTo(6.4*c,0),r.arc(0,0,6.4*c,0,Math.PI),r.closePath(),r.fill(),r.fillStyle="rgba(255,255,255,0.16)",r.fillRect(-4*c,-f+p,2.4*c,f-p),r.fillStyle=g,r.fillRect(-12.5*c,-f,25*c,p),r.fillStyle="rgba(0,0,0,0.25)",r.fillRect(-12.5*c,-f+p-3*c,25*c,3*c),r.strokeStyle=e.person.colour??"#e8e0c8",r.lineWidth=3.6,r.globalAlpha=Math.min(1,h*2),r.beginPath(),r.ellipse(0,0,21,9,0,0,Math.PI*2),r.stroke(),r.globalAlpha=1}this.#r(i.m),s&&(r.globalAlpha=.35);let u=Wd(o.materials?.body?.color,"#e7dfcd"),d=(o.thickness??9)*i.side/2;r.fillStyle=u,r.fillRect(-a*bs.width/2,0,a*bs.width,bs.depth),e.person.colour&&(r.fillStyle=e.person.colour,r.fillRect(-a*bs.width/2+4,1,a*bs.width-8,3)),r.fillStyle=u,r.fillRect(-a/2-d,-l+2,a+d*2,l-2),r.drawImage(i.back?e.back:e.face,-a/2,-l,a,l),!s&&t.down>.02&&(r.fillStyle=`rgba(0,0,0,${(.45*t.down).toFixed(3)})`,r.fillRect(-a/2,-l,a,l)),s&&(r.globalAlpha=1)}#g(t){let{ctx:e}=this,i=(a,l)=>{e.fillStyle=l,e.beginPath(),a.forEach(([c,h],u)=>u?e.lineTo(c,h):e.moveTo(c,h)),e.closePath(),e.fill(),e.strokeStyle="rgba(0,0,0,0.35)",e.lineWidth=1,e.stroke()};this.#r([1,0,0,1,0,0]),i(t.floor,"#3a2412"),i(t.back,"#6a4628"),e.lineCap="round";for(let a of t.sticks)e.strokeStyle=Pi[a.colour]??Pi.white,e.lineWidth=a.width,e.beginPath(),e.moveTo(a.base.x,a.base.y),e.lineTo(a.top.x,a.top.y),e.stroke();let s=t.magic,r=e.createLinearGradient(s.base.x,s.base.y,s.top.x,s.top.y);for(let a=0;a<=6;a++)r.addColorStop(a/6,`hsl(${a*60},70%,72%)`);e.strokeStyle=r,e.lineWidth=s.width,e.beginPath(),e.moveTo(s.base.x,s.base.y),e.lineTo(s.top.x,s.top.y),e.stroke();let o=s.width*1.1;e.fillStyle="#ffd36a",e.beginPath();for(let a=0;a<8;a++){let l=a/8*Math.PI*2-Math.PI/2,c=a%2?o*.42:o;e.lineTo(s.top.x+Math.cos(l)*c,s.top.y+Math.sin(l)*c)}e.closePath(),e.fill(),i(t.left,"#7a5230"),i(t.right,"#7a5230"),i(t.front,"#8a5e38"),i(t.eraser.front,"#5b6670"),i(t.eraser.top,"#6c7882")}#p(t){let{ctx:e,rig:i,view:s}=this;for(let r of t.marks.slice(0,6)){if(!r.target)continue;let o=this.views.get(r.for);if(!o)continue;let a=this.description.cardScale*(o.person.size??1),l={x:r.X,z:r.Z,lift:r.pose.lift,lean:r.pose.lean,yaw:r.pose.yaw,pitch:r.pose.pitch,grip:0,scale:a,breathe:1,squash:1};if(this.#m(l,o,Gd(l,i,s,{stickLen:0}),{ghost:!0}),r.label){let c=jn(i,s,{X:r.X,Y:r.pose.lift+o.h*a+40,Z:r.Z}),h=this.#y(r.label),u=260*c.k*s.s;this.#r([1,0,0,1,0,0]),e.drawImage(h,c.x-u/2,c.y-u*96/512/2,u,u*96/512)}}for(let r of t.cards){let o=r.emote;if(!o||o.opacity<=.01)continue;let a=this.#n(o.id),l=this.views.get(r.id);if(!a||!l)continue;let c=r.scale??1,h=jn(i,s,{X:r.x+74*c,Y:(r.lift??0)+(this.skin.stick?.length??134)*c*(r.grip??0)+l.h*c*(r.breathe??1)+36,Z:r.z+30}),u=96*o.pop*h.k*s.s;this.#r([1,0,0,1,0,0]),e.globalAlpha=o.opacity,e.drawImage(a,h.x-u/2,h.y-u/2,u,u),e.globalAlpha=1}}#y(t){return this.labelImages.has(t)||this.labelImages.set(t,zc(t)),this.labelImages.get(t)}#x(t){let{ctx:e,rig:i,view:s}=this,r=t.t,o=this.skin.size.h*this.description.cardScale*.5+60;this.#r([1,0,0,1,0,0]);let a=0;for(let l of t.bonks){let c=r-l.t;if(c<0||c>_0)continue;let h=jn(i,s,{X:l.x,Y:o+10,Z:l.Z+90});if(c<x0&&a++<3){let u=c/x0,d=(120+150*Math.sqrt(u))*h.k*s.s;e.save(),e.translate(h.x,h.y),e.rotate(.2*u),e.globalAlpha=1-u*u,e.drawImage(this.impact,-d/2,-d/2,d,d),e.restore()}if(!this.calm){if(c<y0&&this.#_(l.t)){let u=260*h.k*s.s,d=.4*(1-c/y0)**2,f=e.createRadialGradient(h.x,h.y,0,h.x,h.y,u);f.addColorStop(0,`rgba(255,226,168,${d})`),f.addColorStop(1,"rgba(255,226,168,0)"),e.globalCompositeOperation="lighter",e.fillStyle=f,e.fillRect(h.x-u,h.y-u,u*2,u*2),e.globalCompositeOperation="source-over"}if(l===t.bonks[t.bonks.length-1]){e.globalCompositeOperation="lighter",e.fillStyle="#ffd98a",e.globalAlpha=Math.max(0,1-c/_0);for(let u=0;u<v0;u++){let d=u/v0*Math.PI*2+u%5*.37,f=260+u*53%340,x=jn(i,s,{X:l.x+Math.cos(d)*f*c,Y:Math.max(2,o+Math.sin(d)*f*.8*c+120*c-900*c*c),Z:l.Z+90});e.beginPath(),e.arc(x.x,x.y,Math.max(1.2,3*x.k*s.s),0,Math.PI*2),e.fill()}e.globalCompositeOperation="source-over"}e.globalAlpha=1}}e.globalAlpha=1}#_(t){return this.flashes.includes(t)?!0:(this.flashes=this.flashes.filter(e=>t-e<1),this.flashes.length>=$S?!1:(this.flashes.push(t),!0))}pick(t,e){if(!this.ready)return null;for(let i=this.order.length-1;i>=0;i--){let s=this.order[i];if(s.kind==="card"){let r=d0(s.pl,s.c,s.v,t,e);if(r!==null)return{kind:"card",id:s.c.id,point:{x:0,y:r,z:s.c.z}}}else if(s.kind==="box"){let r=g0(s.layout,t,e);if(r)return{...r,point:{x:0,y:0,z:s.z}}}}return null}paintingAt(t,e){return this.rig?u0(this.rig,this.view,t,e):null}floorAt(t,e,i=0){return this.rig?h0(this.rig,this.view,t,e,i):null}project(t){return jn(this.rig,this.view,t)}setChalkTiles(t,e,i=!1){let s=t!==this.chalkWall;if(this.chalkWall=t,i||s){this.revision++;return}for(let r of e)this.chalkDirty.add(r)}setChalkHidden(t){this.hidden=!!t}setChalkBox(t){this.boxShown=!!t}setChalkBoxAt(t){this.boxAt=[t[0],t[1]],this.boxCache=null}paintingColour(t,e){return uh(this.painting,t,e)}async capture(){return new Promise(t=>this.canvas.toBlob(t,"image/png"))}stats(){return{calls:this.draws,triangles:0,textures:0,geometries:0,tracked:this.views.size}}unmount(){this.canvas?.remove()}dispose(){this.disposed||(this.disposed=!0,this.views.clear(),this.order=[],this.unmount())}};var Xd="module.stagecraft";function M0(n){let t=(e,i)=>n(e,i);return game.socket.on(Xd,t),{send:e=>game.socket.emit(Xd,e),close:()=>game.socket.off(Xd,t)}}var jS=45,JS=5e3,b0="stagecraft.chalk.prefs",yh=()=>`${(game.user?.id??"x").slice(0,6)}${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;function KS(){try{return JSON.parse(globalThis.localStorage?.getItem(b0)??"null")??{}}catch{return{}}}function QS(n){try{globalThis.localStorage?.setItem(b0,JSON.stringify(n))}catch{}}var _h=class{constructor({host:t,store:e,makeWall:i=o=>new hh(o),encode:s=Jg,send:r=()=>{}}){this.host=t,this.store=e,this.sceneId=t.scene.id,this.send=r,this.encode=s,this.pointerListeners=new Set,this.grid=Ad(t.description.painting),this.wall=i({grid:this.grid,onChange:a=>this.host.backend?.setChalkTiles?.(this.wall,a)}),this.wall.warmUp?.();let o=KS();this.colour=vs(o.colour)??Pi.white,this.recent=(o.recent??[]).map(vs).filter(Boolean).slice(0,10),this.sizes={...Object.fromEntries(Object.entries(Me).map(([a,l])=>[a,l.size.initial])),...o.sizes??{}},this.steady=Number.isInteger(o.steady)?Math.max(0,Math.min(Nr.length-1,o.steady)):1,this.magic={rainbow:!1,glow:!0,sparkle:!1,...o.magic??{}},this.tool=null,this.drawing=null,this.lastEnd=null,this.redoSteps=[],this.keeping=Promise.resolve(),this.remote=new Map,this.loading=new Map,this.listeners=new Set,this.unsubscribe=e.onChange((a,l)=>{a===null?(this.refresh(),this.sync()):a===this.sceneId&&this.#s(l)})}stop(){this.unsubscribe?.(),this.putAway();for(let t of this.remote.values())clearTimeout(t.timer);this.remote.clear(),this.listeners.clear(),this.pointerListeners.clear(),clearTimeout(this.flashTimer)}onPointer(t){return this.pointerListeners.add(t),()=>this.pointerListeners.delete(t)}#t(t){for(let e of this.pointerListeners)e(t)}reset(){this.putAway(),this.host.backend?.setChalkTiles?.(this.wall,new Set(this.wall.keys()),!0)}onHand(t){return this.listeners.add(t),()=>this.listeners.delete(t)}#e(){for(let t of this.listeners)t()}policy(){let t=this.host.scene.flags?.[nt]?.live?.chalk??null;return ih(this.host.description.chalk,t)}get usable(){return this.store.ready&&Og(this.policy(),this.host.description.zones)}refresh(){let t=this.policy(),e=this.usable;return this.host.backend.setChalkBox(e),(!e||t.locked)&&this.putAway(),this.host.backend.setChalkHidden(this.host.scene.flags?.[nt]?.live?.chalkHidden===!0),this.wall.setMask(Fg(t,this.host.description.zones)),t}chalkZones(){return this.policy().mode==="zones"?this.host.description.zones.filter(t=>t.kind==="chalk"):[]}sync(){let t=this.store.layers(this.sceneId);this.#i(t);for(let e of t)this.#n(e)}#i(t){let e=t.map(s=>({by:s.by,since:s.since})),i=this.wall.layers.get(game.user.id);i&&!e.some(s=>s.by===game.user.id)&&e.push({by:i.by,since:i.since}),this.wall.setLayers(e)}#n(t){let e=this.wall.layers.get(t.by),i=new Set([...Object.keys(t.tiles),...e?[...e.sources.keys()]:[]]),s=[];for(let o of i){let a=t.tiles[o]??null;this.wall.sourceOf(t.by,o)!==a&&s.push(this.wall.setTile(t.by,o,a).catch(l=>console.warn(`${nt} | a tile of chalk could not be shown`,l)))}let r=Promise.all(s);return this.loading.set(t.by,r),r.then(()=>{this.loading.get(t.by)===r&&this.loading.delete(t.by),this.#r()}),r}#s(t){let e=this.store.layers(this.sceneId),i=e.find(s=>s.by===t);if(!i){this.sync();return}(!this.wall.layers.has(t)||this.wall.layers.get(t).since!==i.since)&&this.#i(e),this.#n(i)}#r(){if(!this.remote.size)return;let t=new Map(this.store.layers(this.sceneId).map(e=>[e.by,e]));for(let[e,i]of this.remote){if(!i.ended)continue;i.layers.every(r=>!this.loading.has(r)&&Object.keys(t.get(r)?.history??{}).some(o=>o.endsWith(`-${e}`)))&&this.#p(e)}}get inHand(){return this.tool}take(t){if(!this.usable)return;if(t==="rub")return this.choose(this.tool==="eraser"?null:"eraser");if(t==="magic")return this.choose(this.tool==="magic"?null:"magic");let e=Pi[t];if(e){if(this.tool==="chalk"&&this.colour===e)return this.putAway();this.setColour(e),this.choose("chalk")}}choose(t){if(!t)return this.putAway();!Me[t]||!this.usable||(this.drawing&&this.cancel(),this.tool=t,this.host.root?.classList.add("stagecraft-chalk"),this.#e())}putAway(){this.drawing&&this.cancel(),this.tool=null,this.cursorZone=null,this.blocked=!1,this.pointer=null,this.host?.root?.classList.remove("stagecraft-chalk"),this.#c(null),this.#t(null),this.#e()}setColour(t,{remember:e=!0}={}){let i=vs(t);i&&(this.colour=i,e&&(this.recent=[i,...this.recent.filter(s=>s!==i)].slice(0,10)),this.#o(),this.#e())}setSize(t,e=this.tool){let i=Me[e];!i||i.kind==="fill"||(this.sizes[e]=Math.round(Math.max(i.size.min,Math.min(i.size.max,t))*10)/10,this.#o(),this.#e())}nudgeSize(t){let e=this.sizes[this.tool];Number.isFinite(e)&&this.setSize(e+t*Math.max(1,e*.15))}setSteady(t){this.steady=Math.max(0,Math.min(Nr.length-1,t)),this.#o(),this.#e()}setMagic(t){this.magic={...this.magic,...t},this.#o(),this.#e()}#o(){QS({colour:this.colour,recent:this.recent,sizes:this.sizes,steady:this.steady,magic:this.magic})}scale(t){let e=this.host.backend.paintingAt(t.x,t.y),i=this.host.backend.paintingAt(t.x+40,t.y);if(!e||!i)return null;let s=Math.hypot((i.x-e.x)*this.grid.w,(i.y-e.y)*this.grid.h);return s>0?40/s:null}hover(t){if(!this.tool)return;if(this.pointer=t,!t){this.#c(null),this.#t(null);return}let e=this.host.backend.paintingAt(t.x,t.y);this.cursorZone=e?this.chalkZones().find(i=>on(i.shape,e.x,e.y))?.id??null:null,this.blocked=Me[this.tool].kind!=="erase"&&!(e&&Id(this.policy(),this.host.description.zones,e.x,e.y)),this.flashTimer||this.#c(this.blocked&&!this.drawing?t:null),this.#t(t)}#c(t,e=null){let i=this.host?.root;if(typeof i?.querySelector!="function"||typeof document>"u")return;let s=i.querySelector(".stagecraft-chalk-hint");if(!t){s&&(s.hidden=!0);return}s||(s=document.createElement("div"),s.className="stagecraft-chalk-hint",i.append(s));let r=this.chalkZones().map(o=>o.name).filter(Boolean);s.textContent=e??(r.length?game.i18n.format("STAGECRAFT.Chalk.OnlyOn",{where:r.join(", ")}):game.i18n.localize("STAGECRAFT.Chalk.NotHere")),s.style.left=`${Math.round(t.x+22)}px`,s.style.top=`${Math.round(t.y+18)}px`,s.hidden=!1}flash(t,e){this.#c(t,e),clearTimeout(this.flashTimer),this.flashTimer=setTimeout(()=>{this.flashTimer=null,this.#c(null)},1800)}#a(t){let e=this.host.backend.paintingAt(t.x,t.y);return e?Cd(this.grid,e.x,e.y):null}painterAt(t){let e=this.#a(t),i=e?this.wall.whoAt(e.x,e.y):null;return i?game.users.get(i)?.name??i:null}painters(){return this.store.layers(this.sceneId).map(t=>({by:t.by,name:game.users.get(t.by)?.name??t.by,tiles:Object.keys(t.tiles).length})).filter(t=>t.tiles>0).sort((t,e)=>e.tiles-t.tiles)}begin(t){if(!this.tool||!this.usable||this.policy().locked||this.drawing)return!1;let e=this.#a(t);if(!e)return!1;if(t.alt)return this.pickColour(t),!1;let i=t.flip?"eraser":this.tool,s=Me[i];if(s.kind==="fill")return this.#g(e,t),!1;if(t.shift&&this.lastEnd)return this.#m(this.lastEnd,e,i),!1;let r=yh(),o=kd(r),a=this.sizes[i],l={tool:i,size:a,steady:Nr[this.steady],seed:o},c=s.kind==="erase"&&game.user.isGM===!0,h=s.magic?{...this.magic}:null;return this.wall.begin({id:r,by:game.user.id,tool:i,colour:this.colour,magic:h,everyone:c}),this.drawing={id:r,stroke:new Dr(l),feel:new oh,opts:l,everyone:c,unsent:[],timer:null,at:e},this.send({type:"chalk",op:"begin",scene:this.sceneId,id:r,tool:i,colour:this.colour,magic:h,everyone:c,size:a,steady:l.steady,seed:o}),this.extend(t),!0}extend(t){let e=this.drawing;if(!e)return;let i=this.#a(t);if(!i)return;let s=e.feel.pressure({x:i.x,y:i.y,t:t.t??performance.now(),pressure:t.pressure,pointerType:t.pointerType}),r={x:Math.round(i.x*10)/10,y:Math.round(i.y*10)/10,p:Math.round(s*100)/100};e.at=i,this.wall.paint(e.id,e.stroke.add(r)),e.unsent.push(r),e.timer??=setTimeout(()=>this.#h(),jS)}#h(){let t=this.drawing;t&&(t.timer=null,t.unsent.length&&(this.send({type:"chalk",op:"more",scene:this.sceneId,id:t.id,s:t.unsent.flatMap(e=>[e.x,e.y,e.p])}),t.unsent=[]))}end(){let t=this.drawing;if(!t)return Promise.resolve();this.wall.paint(t.id,t.stroke.finish()),clearTimeout(t.timer),this.#h(),this.drawing=null,this.lastEnd=t.at;let e=la(this.wall.strokes.get(t.id)?.dabs??[]);return this.#u(this.#l(this.wall.commit(t.id)),t.id,e,t.opts.tool,{live:!0})}cancel(){let t=this.drawing;if(!t)return;clearTimeout(t.timer),this.drawing=null,this.send({type:"chalk",op:"cancel",scene:this.sceneId,id:t.id});let e=this.wall.strokes.get(t.id)?.touched??new Set;this.wall.drop(t.id),Me[t.opts.tool].kind==="smudge"&&this.wall.revert(game.user.id,e).catch(()=>{})}#l(t){let e=t.painted===!0;return[...t].map(([i,s])=>[i,[...s].map(([r,o])=>[r,Promise.resolve(this.encode(o,e))])])}#u(t,e,i,s,{live:r=!1}={}){let o=this.keeping.then(async()=>{let a=await this.#d(t);r&&this.send({type:"chalk",op:"end",scene:this.sceneId,id:e,layers:a.map(([l])=>l)}),await this.#f(a,e,i,s)});return this.keeping=o.catch(a=>console.warn(`${nt} | chalk could not be kept`,a)),o}async#d(t){let e=[];for(let[i,s]of t){let r=await Promise.all(s.map(async([l,c])=>[l,await c])),o={},a={};for(let[l,c]of r){let h=this.wall.sourceOf(i,l);c!==h&&(a[l]=h,o[l]=c)}Object.keys(o).length&&e.push([i,o,a])}return e}async#f(t,e,i=null,s=this.tool){if(!t.length)return;let r=Date.now(),o={id:Rd(r,e),at:r};this.redoSteps=[];for(let[c,h,u]of t){for(let[d,f]of Object.entries(h))this.wall.noteSource(c,d,f);try{await this.store.save(this.sceneId,{by:c,tiles:h,step:o,grid:this.grid})}catch(d){console.warn(`${nt} | chalk could not be kept`,d);for(let[f,x]of Object.entries(u))this.wall.noteSource(c,f,x);await this.wall.revert(c,Object.keys(u))}}let a=this.grid,l=i?{x0:Math.max(0,i.x0/a.w),y0:Math.max(0,i.y0/a.h),x1:Math.min(1,i.x1/a.w),y1:Math.min(1,i.y1/a.h)}:null;Hooks.callAll("stagecraft.chalk",{type:"chalk",scene:this.sceneId,by:game.user.id,tool:s,colour:this.colour,bounds:l})}#m(t,e,i=this.tool){let s=Me[i];if(s.kind==="smudge")return null;let r=yh(),o={tool:i,size:this.sizes[i],seed:kd(r)},a=Hg({...t,p:.8},{...e,p:.8},o);this.wall.begin({id:r,by:game.user.id,tool:i,colour:this.colour,magic:s.magic?{...this.magic}:null,everyone:s.kind==="erase"&&game.user.isGM===!0}),this.wall.paint(r,a),this.lastEnd=e;let l=la(a);return this.#u(this.#l(this.wall.commit(r)),r,l,i).catch(()=>{}),l}#g(t,e){let i=this.wall.fill({x:t.x,y:t.y,by:game.user.id,colour:this.colour});if(!i.ok){this.flash(e,game.i18n.localize(i.reason==="open"?"STAGECRAFT.Chalk.FillOpen":"STAGECRAFT.Chalk.FillOnPaint"));return}this.#u(this.#l(new Map([[game.user.id,i.changed]])),yh(),{x0:t.x-1,y0:t.y-1,x1:t.x+1,y1:t.y+1}).catch(()=>{})}pickColour(t){let e=this.host.backend.paintingAt(t.x,t.y);if(!e)return null;let i=Cd(this.grid,e.x,e.y),s=this.wall.pick(i.x,i.y)??this.host.backend.paintingColour?.(e.x,e.y)??null;return s&&(this.setColour(s),this.flash(t,game.i18n.format("STAGECRAFT.Chalk.Picked",{colour:s}))),s}async undo(){this.drawing&&this.cancel(),await this.keeping;let t=await this.store.undo(this.sceneId,{by:game.user.id});return t?(this.redoSteps.push(t.layers),!0):!1}async redo(){await this.keeping;let t=this.redoSteps.pop();if(!t)return!1;let e=Date.now(),i={id:Rd(e,yh()),at:e};for(let[s,r]of Object.entries(t))await this.store.save(this.sceneId,{by:s,tiles:r,step:i,grid:this.grid});return!0}receive(t,e){if(!(!t||t.scene!==this.sceneId||e===game.user.id))if(t.op==="begin"){if(!Me[t.tool]||Me[t.tool].kind==="smudge"||Me[t.tool].kind==="fill"||this.remote.has(t.id)||typeof t.id!="string")return;let i=e,s=t.everyone===!0&&game.users?.get(e)?.isGM===!0;this.wall.begin({id:t.id,by:i,tool:t.tool,colour:vs(t.colour)??Pi.white,magic:t.magic??null,everyone:s,live:!0});let r=new Dr({tool:t.tool,size:Number(t.size)||void 0,steady:Number(t.steady)||0,seed:Number(t.seed)>>>0});this.remote.set(t.id,{by:i,stroke:r,ended:!1,layers:[],timer:setTimeout(()=>this.#p(t.id),6e4)})}else if(t.op==="more"){let i=this.remote.get(t.id);if(!i||i.ended||!Array.isArray(t.s))return;let s=[];for(let r=0;r+2<t.s.length;r+=3)s.push(...i.stroke.add({x:Number(t.s[r]),y:Number(t.s[r+1]),p:Number(t.s[r+2])}));this.wall.paint(t.id,s)}else if(t.op==="end"){let i=this.remote.get(t.id);if(!i||i.ended)return;this.wall.paint(t.id,i.stroke.finish()),i.ended=!0,i.layers=(Array.isArray(t.layers)?t.layers:[i.by]).filter(s=>typeof s=="string"),clearTimeout(i.timer),i.timer=setTimeout(()=>this.#p(t.id),JS),this.#r()}else t.op==="cancel"&&this.#p(t.id)}#p(t){let e=this.remote.get(t);e&&(clearTimeout(e.timer),this.remote.delete(t),this.wall.drop(t))}allowedAt(t){return Id(this.policy(),this.host.description.zones,t.x,t.y)}};var S0="stagecraft.chalk.kit",$e=(n,t)=>t?game.i18n.format(n,t):game.i18n.localize(n),Je=n=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${n}</svg>`,rn=Object.freeze({chalk:Je('<path d="M6.5 17.5 16 8" stroke-width="4.2"/><circle cx="4.2" cy="20.2" r=".8" fill="currentColor" stroke="none"/><circle cx="3.2" cy="17.6" r=".6" fill="currentColor" stroke="none"/><circle cx="6.4" cy="21.4" r=".6" fill="currentColor" stroke="none"/>'),magic:Je('<path d="M4.5 19.5 14 10" stroke-width="2.6"/><path d="M17.5 2.8l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" fill="currentColor" stroke="none"/><circle cx="20" cy="12.5" r=".9" fill="currentColor" stroke="none"/><circle cx="11.5" cy="4.5" r=".8" fill="currentColor" stroke="none"/>'),pencil:Je('<path d="M4 20l1.4-4.6L15.6 5.2a1.6 1.6 0 0 1 2.3 0l.9.9a1.6 1.6 0 0 1 0 2.3L8.6 18.6z"/><path d="M13.8 7l3.2 3.2M4 20l3.1-.9"/>'),brush:Je('<path d="M20.5 3.5 11.8 12.2"/><path d="M11 13l-1.6-1.6"/><path d="M9.4 11.4c-2.6-.4-4.6 1.6-4.6 4 0 1.3-.9 2.6-2.3 2.9 3 1.6 8 .6 8.6-3.6.2-1.4-.4-2.6-1.7-3.3z" fill="currentColor" fill-opacity=".3"/>'),spray:Je('<rect x="5.5" y="9" width="8" height="12" rx="2"/><path d="M8 9V6.5h3V9M9.5 6.5V4.5"/><circle cx="16.5" cy="5" r=".8" fill="currentColor" stroke="none"/><circle cx="19" cy="7.5" r=".8" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10" r=".8" fill="currentColor" stroke="none"/><circle cx="20" cy="4" r=".7" fill="currentColor" stroke="none"/>'),smudge:Je('<path d="M3 16c2.6-3.4 4.4 1.6 7-1.6s4.4 1.6 7-1.6" stroke-width="2.4" opacity=".55"/><path d="M14 13.5V6a1.6 1.6 0 0 1 3.2 0v5"/><path d="M17.2 9.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.4"/>'),fill:Je('<path d="M4.5 11.5 11 5l6.6 6.6-6.5 6.5a1.6 1.6 0 0 1-2.2 0l-4.4-4.4a1.6 1.6 0 0 1 0-2.2z"/><path d="M4.6 12.2h12.6"/><path d="M20 14.5c.9 1.4 1.4 2.3 1.4 3a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.6 1.4-3z" fill="currentColor"/>'),eraser:Je('<path d="M8 20h12"/><path d="M5.2 15.6 13.6 7.2a1.8 1.8 0 0 1 2.5 0l3.3 3.3a1.8 1.8 0 0 1 0 2.5L12.5 20H9.6z"/><path d="M9.2 11.6l5.6 5.6"/>'),pick:Je('<path d="M14.5 4.5l5 5-2.2 2.2-5-5z" fill="currentColor" fill-opacity=".35"/><path d="M13.4 8.6 5.5 16.5 4 20l3.5-1.5 7.9-7.9"/>'),undo:Je('<path d="M9 6 4.5 10.5 9 15"/><path d="M4.5 10.5H15a5 5 0 0 1 0 10h-2"/>'),redo:Je('<path d="M15 6l4.5 4.5L15 15"/><path d="M19.5 10.5H9a5 5 0 0 0 0 10h2"/>'),steady:Je('<circle cx="6" cy="18" r="2.2" fill="currentColor" stroke="none"/><path d="M8 16 14.8 9.2" stroke-dasharray="1.6 2.2"/><circle cx="17" cy="7" r="3"/>'),rainbow:Je('<path d="M3 17a9 9 0 0 1 18 0" stroke="#e86a6a"/><path d="M6 17a6 6 0 0 1 12 0" stroke="#e8c96a"/><path d="M9 17a3 3 0 0 1 6 0" stroke="#7ac0e0"/>'),glow:Je('<circle cx="12" cy="12" r="3.5" fill="currentColor"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>'),sparkle:Je('<path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" fill="currentColor" fill-opacity=".35"/><path d="M19 16l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" fill="currentColor" stroke="none"/>'),close:Je('<path d="M6 6l12 12M18 6 6 18"/>'),grip:Je('<circle cx="9" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="17" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="1.2" fill="currentColor" stroke="none"/>')}),t1=(n,t)=>Math.round(100*Math.log(n/t.size.min)/Math.log(t.size.max/t.size.min)),e1=(n,t)=>Math.round(t.size.min*(t.size.max/t.size.min)**(n/100)*10)/10,vh=class{constructor(t,e){this.host=t,this.chalk=e,this.open=null,this.alt=!1,this.#t(),this.offHand=e.onHand(()=>this.refresh()),this.offPointer=e.onPointer(i=>this.#l(i)),this.refresh()}dispose(){this.offHand?.(),this.offPointer?.(),window.removeEventListener("keydown",this.#a,!0),window.removeEventListener("keyup",this.#h,!0),this.el?.remove(),this.ring?.remove(),this.el=this.ring=null}#t(){let t=document.createElement("div");t.className="stagecraft-kit",t.setAttribute("role","toolbar"),t.setAttribute("aria-label",$e("STAGECRAFT.Kit.Label"));let e=r=>`<button type="button" class="kit-tool" data-tool="${r}" title="${$e(`STAGECRAFT.Kit.Tool.${r}`)}">${rn[r]}</button>`;t.innerHTML=`
      <div class="kit-grip" title="${$e("STAGECRAFT.Kit.Move")}">${rn.grip}</div>
      <div class="kit-group">${ah.map(e).join("")}</div>
      <div class="kit-group">
        <button type="button" class="kit-well" data-act="colour" title="${$e("STAGECRAFT.Kit.Colour")}"><span></span></button>
        <button type="button" class="kit-size" data-act="size" title="${$e("STAGECRAFT.Kit.Size")}"><span></span></button>
        <button type="button" data-act="steady" title="">${rn.steady}<b></b></button>
        <button type="button" data-act="pick" title="${$e("STAGECRAFT.Kit.Pick")}">${rn.pick}</button>
      </div>
      <div class="kit-group kit-magic">
        <button type="button" data-magic="rainbow" title="${$e("STAGECRAFT.Kit.Rainbow")}">${rn.rainbow}</button>
        <button type="button" data-magic="glow" title="${$e("STAGECRAFT.Kit.Glow")}">${rn.glow}</button>
        <button type="button" data-magic="sparkle" title="${$e("STAGECRAFT.Kit.Sparkle")}">${rn.sparkle}</button>
      </div>
      <div class="kit-group">
        <button type="button" data-act="undo" title="${$e("STAGECRAFT.Kit.Undo")}">${rn.undo}</button>
        <button type="button" data-act="redo" title="${$e("STAGECRAFT.Kit.Redo")}">${rn.redo}</button>
        <button type="button" data-act="close" title="${$e("STAGECRAFT.Kit.Close")}">${rn.close}</button>
      </div>
      <div class="kit-pop kit-pop-colour" hidden>
        <canvas class="kit-sv" width="176" height="120"></canvas>
        <canvas class="kit-hue" width="176" height="14"></canvas>
        <div class="kit-row"><input class="kit-hex" type="text" maxlength="7" spellcheck="false" aria-label="${$e("STAGECRAFT.Kit.Hex")}"><span class="kit-now"></span></div>
        <div class="kit-swatches"></div>
        <div class="kit-recent"></div>
      </div>
      <div class="kit-pop kit-pop-size" hidden>
        <input class="kit-range" type="range" min="0" max="100" step="1" aria-label="${$e("STAGECRAFT.Kit.Size")}">
        <span class="kit-size-n"></span>
      </div>`,this.host.root.append(t),this.el=t,t.addEventListener("click",this.#o),t.addEventListener("wheel",this.#c,{passive:!1}),t.addEventListener("pointerdown",r=>r.stopPropagation()),this.#n(),this.#s();let i=t.querySelector(".kit-range");i.addEventListener("input",()=>this.chalk.setSize(e1(Number(i.value),Me[this.chalk.tool])));let s=t.querySelector(".kit-swatches");s.innerHTML=Object.entries(Pi).map(([r,o])=>`<button type="button" class="kit-swatch" data-colour="${o}" title="${$e(`STAGECRAFT.Kit.Colours.${r}`)}" style="--c:${o}"></button>`).join("")+["#1c1a17","#e2483c","#3f7fe0","#8a4fd8"].map(r=>`<button type="button" class="kit-swatch" data-colour="${r}" style="--c:${r}" title="${r}"></button>`).join(""),this.ring=document.createElement("div"),this.ring.className="stagecraft-chalk-cursor",this.ring.hidden=!0,this.ring.innerHTML='<i class="ring"></i><i class="tick across"></i><i class="tick down"></i><i class="cross"></i><i class="dot"></i><i class="strike"></i>',this.host.root.append(this.ring),window.addEventListener("keydown",this.#a,!0),window.addEventListener("keyup",this.#h,!0),this.#i(this.#e())}#e(){try{return JSON.parse(globalThis.localStorage?.getItem(S0)??"null")}catch{return null}}#i(t){let e=this.host.root.getBoundingClientRect(),i=this.el.offsetWidth||86,s=this.el.offsetHeight||440,r=Math.max(4,Math.min(e.width-i-4,t?.x??96)),o=Math.max(4,Math.min(e.height-s-4,t?.y??Math.min(96,(e.height-s)*.4)));this.el.style.left=`${r}px`,this.el.style.top=`${o}px`,this.el.classList.toggle("kit-right",r+i/2>e.width/2),this.at={x:r,y:o,set:t?.x!==void 0}}#n(){let t=this.el.querySelector(".kit-grip"),e=null;t.addEventListener("pointerdown",s=>{e={x:s.clientX,y:s.clientY,at:{...this.at}},t.setPointerCapture(s.pointerId),s.preventDefault()}),t.addEventListener("pointermove",s=>{e&&this.#i({x:e.at.x+s.clientX-e.x,y:e.at.y+s.clientY-e.y})});let i=()=>{if(e){e=null;try{globalThis.localStorage?.setItem(S0,JSON.stringify(this.at))}catch{}}};t.addEventListener("pointerup",i),t.addEventListener("pointercancel",i)}#s(){let t=this.el.querySelector(".kit-sv"),e=this.el.querySelector(".kit-hue"),i=this.el.querySelector(".kit-hex"),s=(r,o)=>{let a=!1,l=h=>{let u=r.getBoundingClientRect();o(Math.max(0,Math.min(1,(h.clientX-u.left)/u.width)),Math.max(0,Math.min(1,(h.clientY-u.top)/u.height)))};r.addEventListener("pointerdown",h=>{a=!0,r.setPointerCapture(h.pointerId),l(h),h.preventDefault()}),r.addEventListener("pointermove",h=>{a&&l(h)});let c=()=>{a&&(a=!1,this.chalk.setColour(this.chalk.colour))};r.addEventListener("pointerup",c),r.addEventListener("pointercancel",c)};s(t,(r,o)=>{let a=this.hsv??qn(this.chalk.colour);this.hsv={h:a.h,s:r,v:1-o},this.chalk.setColour(ca(this.hsv),{remember:!1})}),s(e,r=>{let o=this.hsv??qn(this.chalk.colour);this.hsv={h:r*359.9,s:Math.max(.15,o.s),v:Math.max(.2,o.v)},this.chalk.setColour(ca(this.hsv),{remember:!1})}),i.addEventListener("change",()=>{let r=vs(i.value);r&&(this.hsv=qn(r),this.chalk.setColour(r))}),i.addEventListener("keydown",r=>{r.stopPropagation(),r.key==="Enter"&&i.blur()})}#r(){let t=this.el.querySelector(".kit-sv"),e=this.hsv??qn(this.chalk.colour),i=this.el.querySelector(".kit-hue"),s=i.getContext("2d"),r=s.createLinearGradient(0,0,i.width,0);for(let u=0;u<=6;u++)r.addColorStop(u/6,`hsl(${u*60},100%,50%)`);s.fillStyle=r,s.fillRect(0,0,i.width,i.height),s.lineWidth=2,s.strokeStyle="#111",s.strokeRect(e.h/360*i.width-2,1,4,i.height-2),s.strokeStyle="#fff",s.lineWidth=1,s.strokeRect(e.h/360*i.width-2,1,4,i.height-2);let o=t.getContext("2d"),{width:a,height:l}=t;o.fillStyle=ca({h:e.h,s:1,v:1}),o.fillRect(0,0,a,l);let c=o.createLinearGradient(0,0,a,0);c.addColorStop(0,"#fff"),c.addColorStop(1,"rgba(255,255,255,0)"),o.fillStyle=c,o.fillRect(0,0,a,l);let h=o.createLinearGradient(0,0,0,l);h.addColorStop(0,"rgba(0,0,0,0)"),h.addColorStop(1,"#000"),o.fillStyle=h,o.fillRect(0,0,a,l),o.lineWidth=2,o.strokeStyle=e.v>.55?"#111":"#fff",o.beginPath(),o.arc(e.s*a,(1-e.v)*l,5,0,Math.PI*2),o.stroke()}refresh(){if(!this.el)return;let t=this.chalk,e=t.tool,i=this.el.hidden;this.el.hidden=!e,e?i&&this.#i(this.at?.set?this.at:null):(this.open=null,this.picking=!1,this.#l(null));for(let d of this.el.querySelectorAll(".kit-tool"))d.classList.toggle("on",d.dataset.tool===e);let s=Me[e]??null,r=s&&!["erase","smudge"].includes(s.kind);this.el.querySelector(".kit-well").style.setProperty("--c",t.colour),this.el.querySelector(".kit-well").disabled=!r;let o=s&&s.kind!=="fill",a=t.sizes[e]??0;this.el.querySelector(".kit-size span").style.setProperty("--d",`${Math.max(3,Math.min(26,3+Math.sqrt(a)*3.2))}px`),this.el.querySelector(".kit-size").disabled=!o;let c=this.el.querySelector('[data-act="steady"]');c.title=$e("STAGECRAFT.Kit.Steady",{level:$e(`STAGECRAFT.Kit.SteadyLevel.${t.steady}`)}),c.querySelector("b").textContent=t.steady?String(t.steady):"",c.classList.toggle("on",t.steady>0);let h=this.el.querySelector(".kit-magic");h.hidden=e!=="magic";for(let d of h.querySelectorAll("[data-magic]"))d.classList.toggle("on",!!t.magic[d.dataset.magic]);this.el.querySelector('[data-act="pick"]').classList.toggle("on",this.picking===!0);for(let d of this.el.querySelectorAll(".kit-pop"))d.hidden=!0;let u=(d,f)=>{d.hidden=!1,d.style.top=`${Math.max(0,f.offsetTop-10)}px`};if(this.open==="colour"&&r){u(this.el.querySelector(".kit-pop-colour"),this.el.querySelector(".kit-well"));let d=this.el.querySelector(".kit-hex");document.activeElement!==d&&(d.value=t.colour),this.el.querySelector(".kit-now").style.setProperty("--c",t.colour),this.el.querySelector(".kit-recent").innerHTML=t.recent.map(f=>`<button type="button" class="kit-swatch" data-colour="${f}" style="--c:${f}" title="${f}"></button>`).join(""),this.#r()}else this.open==="size"&&o&&(u(this.el.querySelector(".kit-pop-size"),this.el.querySelector(".kit-size")),this.el.querySelector(".kit-range").value=String(t1(a,s)),this.el.querySelector(".kit-size-n").textContent=$e("STAGECRAFT.Kit.SizePx",{n:a}));t.pointer&&this.#l(t.pointer)}#o=t=>{let e=t.target.closest("button");if(!e||e.disabled)return;let i=this.chalk;if(e.dataset.tool){this.picking=!1,i.choose(e.dataset.tool);return}if(e.dataset.colour){this.hsv=qn(e.dataset.colour),i.setColour(e.dataset.colour);return}if(e.dataset.magic){i.setMagic({[e.dataset.magic]:!i.magic[e.dataset.magic]});return}let s=e.dataset.act;s==="colour"||s==="size"?(this.open=this.open===s?null:s,this.hsv=qn(i.colour),this.refresh()):s==="steady"?i.setSteady((i.steady+1)%Nr.length):s==="pick"?(this.picking=!this.picking,this.refresh()):s==="undo"?i.undo().catch(()=>{}):s==="redo"?i.redo().catch(()=>{}):s==="close"&&i.putAway()};#c=t=>{t.target.closest(".kit-size, .kit-pop-size")&&(t.preventDefault(),this.chalk.nudgeSize(t.deltaY<0?1:-1))};#a=t=>{let e=this.chalk;if(!e.tool||t.target?.closest?.("input, textarea, [contenteditable]"))return;if(t.key==="Alt"){this.alt=!0,e.pointer&&this.#l(e.pointer);return}let i=!0;t.key==="["?e.nudgeSize(-1):t.key==="]"?e.nudgeSize(1):(t.ctrlKey||t.metaKey)&&t.code==="KeyZ"?(t.shiftKey?e.redo():e.undo()).catch(()=>{}):(t.ctrlKey||t.metaKey)&&t.code==="KeyY"?e.redo().catch(()=>{}):i=!1,i&&(t.preventDefault(),t.stopPropagation())};#h=t=>{t.key==="Alt"&&(this.alt=!1,this.chalk.pointer&&this.#l(this.chalk.pointer))};takesPick(){let t=this.picking||this.alt;return this.picking&&(this.picking=!1,this.refresh()),t}#l(t){let e=this.ring;if(!e)return;let i=this.chalk;if(!t||!i.tool){e.hidden||(e.hidden=!0);return}let s=Me[i.tool],r=this.picking||this.alt||s.kind==="fill",o=r?0:Math.round(Math.max(1.5,(i.sizes[i.tool]??8)/2*(i.scale(t)??1))*2)/2,a=`${r}|${o}|${s.kind}|${i.blocked===!0}|${i.colour}`;if(a!==this.look){this.look=a;let l=["stagecraft-chalk-cursor"];r&&l.push("exact"),s.kind==="erase"&&l.push("erase"),i.blocked&&l.push("blocked"),!r&&["erase","smudge"].includes(s.kind)&&l.push("nodot"),!r&&o<6&&l.push("small"),e.className=l.join(" "),e.style.setProperty("--r",`${o}px`),e.style.setProperty("--c",i.colour)}e.hidden&&(e.hidden=!1),e.style.transform=`translate3d(${t.x}px, ${t.y}px, 0)`}};var Ss=Object.freeze({every:2e4,stale:75e3,fine:40,poor:24,window:300,gap:400}),i1=Object.freeze(["lit","low","plain"]);function T0(n,{gap:t=Ss.gap,least:e=10}={}){let i=(n??[]).filter(r=>Number.isFinite(r)&&r>0&&r<=t);if(i.length<e)return{fps:null,worst:null,n:i.length};let s=[...i].sort((r,o)=>r-o);return{fps:Math.round(1e3/s[Math.floor(s.length/2)]),worst:Math.round(s[s.length-1]),n:i.length}}var n1=(n,t)=>n==="flat"||t==="flat"?"plain":t==="low"?"low":"lit";function s1(n){let t=typeof n=="string"?n.trim():"",e=/^ANGLE \((.*)\)$/i.exec(t);if(e){let i=e[1].split(",").map(s=>s.trim());t=i.length>1?i[1]:i[0]}return t=t.replace(/\s*(Direct3D\d*|OpenGL|Metal|vs_\d_\d|ps_\d_\d|\(0x[0-9a-f]+\)).*$/i,"").replace(/\s{2,}/g," ").trim(),t.length>34?`${t.slice(0,33)}\u2026`:t}var Br=(n,t,e)=>(typeof n=="number"||typeof n=="string"&&n.trim()!=="")&&Number.isFinite(Number(n))?Math.max(t,Math.min(e,Math.round(Number(n)))):null,r1=(n,t)=>typeof n=="string"?n.slice(0,t):"";function $d(n){return{v:1,picture:n1(n.backend,n.tier),fps:Br(n.stats?.fps,0,1e3),worst:Br(n.stats?.worst,0,6e4),probe:n.probe==null?null:Math.round(Number(n.probe)*10)/10,gpu:s1(n.gpu),dpr:Math.round((Number(n.dpr)||1)*100)/100,size:[Br(n.size?.[0],0,2e4)??0,Br(n.size?.[1],0,2e4)??0],losses:Br(n.losses,0,99)??0,failures:Br(n.failures,0,9999)??0,hidden:n.hidden===!0,scene:r1(n.scene,60)}}function E0(n){return!n||n.type!=="health"||n.op==="ask"||n.v!==1||!i1.includes(n.picture)?null:$d({backend:n.picture==="plain"?"flat":"three",tier:n.picture==="low"?"low":n.picture==="plain"?"flat":"high",stats:{fps:n.fps,worst:n.worst},probe:n.probe,gpu:n.gpu,dpr:n.dpr,size:n.size,losses:n.losses,failures:n.failures,hidden:n.hidden,scene:n.scene})}function o1(n,t,e){return!n||e-t>Ss.stale?"stale":n.hidden?"idle":n.losses>=2||n.failures>0||n.fps!=null&&n.fps<Ss.poor?"bad":n.fps!=null&&n.fps<Ss.fine?"warn":n.picture==="plain"?"plain":"ok"}var Zd=Object.freeze({lit:"lit",low:"low",plain:"plain"});function a1({id:n,name:t},e,i){let s=o1(e?.report,e?.at??0,i),r=e?.report;if(!r||s==="stale")return{id:n,name:t,level:"stale",text:"no stage",tip:`${t}: not on a stage, or not heard from for a while`};let o=r.fps==null?"\u2026":`${r.fps} fps`,a=[`${t}: the ${Zd[r.picture]} stage${r.fps==null?", not measured yet":` at ${o}`}${r.worst!=null?`, longest frame ${r.worst} ms`:""}`,r.gpu?`Graphics: ${r.gpu}`:"Graphics: not known",`Window: ${r.size[0]} \xD7 ${r.size[1]} at ${r.dpr}x`,r.probe!=null?`Start-up test: a picture every ${r.probe} ms`:null,r.losses?`Lost its graphics context ${r.losses} time${r.losses===1?"":"s"}`:null,r.failures?`${r.failures} frame${r.failures===1?"":"s"} failed`:null,r.hidden?"The tab is in the background":null].filter(Boolean).join(`
`);return{id:n,name:t,level:s,text:s==="idle"?`${Zd[r.picture]} \xB7 away`:`${Zd[r.picture]} \xB7 ${o}`,tip:a}}var w0=Object.freeze({bad:4,warn:3,plain:2,ok:1,idle:0,stale:0});function A0(n,t,e){let i=n.map(l=>a1(l,t.get(l.id),e)).sort((l,c)=>w0[c.level]-w0[l.level]||l.name.localeCompare(c.name)),s={ok:0,plain:0,warn:0,bad:0,idle:0,stale:0};for(let l of i)s[l.level]++;let r=s.bad?"bad":s.warn?"warn":s.plain?"plain":s.ok?"ok":"stale",a=[`${i.length-s.stale} of ${i.length} on a stage`];return s.bad&&a.push(`${s.bad} struggling`),s.warn&&a.push(`${s.warn} slow`),s.plain&&a.push(`${s.plain} on the plain stage`),{chips:i,level:r,counts:s,line:a.join(" \xB7 ")}}var l1=(n,t)=>t?game.i18n.format(`STAGECRAFT.Health.${n}`,t):game.i18n.localize(`STAGECRAFT.Health.${n}`),Mh=class{constructor(t){this.host=t,this.intervals=[],this.lastAt=null,this.timer=setInterval(()=>this.send(),Ss.every),this.first=setTimeout(()=>this.send(),4e3),this.later=null}stop(){clearInterval(this.timer),clearTimeout(this.first),clearTimeout(this.later)}frame(t,e=1){this.lastAt!==null&&(this.intervals.push((t-this.lastAt)*e),this.intervals.length>Ss.window&&this.intervals.shift()),this.lastAt=t}report(){let t=this.host;return $d({backend:t.backend?.name,tier:t.backend?.name==="flat"?"flat":es(),stats:T0(this.intervals),probe:t.speed?.last?.median??null,gpu:Tn().renderer,dpr:window.devicePixelRatio,size:[t.root?.clientWidth??0,t.root?.clientHeight??0],losses:t.losses,failures:t.guard?.total??0,hidden:document.hidden===!0,scene:t.scene?.name})}send(){let t=this.host;if(!t.running||!t.channel)return;let e=this.report();t.healthBoard?.take(game.user.id,e),t.channel.send({type:"health",...e})}changed(){clearTimeout(this.later),this.later=setTimeout(()=>this.send(),1200)}receive(t){t?.op==="ask"&&(clearTimeout(this.later),this.later=setTimeout(()=>this.send(),100+Math.random()*1200))}},bh=class{constructor(t){this.host=t,this.table=new Map,this.el=document.createElement("div"),this.el.className="stagecraft-health",this.el.innerHTML='<button type="button" class="pill" aria-expanded="false"><i class="dot"></i><span></span></button><div class="panel" hidden><p class="line"></p><ul></ul></div>',t.root.append(this.el),this.pill=this.el.querySelector(".pill"),this.panel=this.el.querySelector(".panel"),this.pill.addEventListener("click",this.#t),this.timer=setInterval(()=>this.render(),5e3),this.render()}dispose(){clearInterval(this.timer),this.pill?.removeEventListener("click",this.#t),this.el?.remove(),this.el=null}take(t,e){this.table.set(t,{report:e,at:Date.now()}),this.render()}receive(t,e){let i=E0(t);i&&this.take(e,i)}#t=()=>{let t=this.panel.hidden;this.panel.hidden=!t,this.pill.setAttribute("aria-expanded",t?"true":"false"),t&&(this.host.channel?.send({type:"health",op:"ask"}),this.host.health?.send()),this.render()};close(){return!this.el||this.panel.hidden?!1:(this.panel.hidden=!0,this.pill.setAttribute("aria-expanded","false"),!0)}render(){if(!this.el)return;let t=game.users.filter(s=>s.active).map(s=>({id:s.id,name:s.name})),e=A0(t,this.table,Date.now());if(this.pill.dataset.level=e.level,this.pill.title=e.line,this.pill.querySelector("span").textContent=l1("Label",{n:e.chips.length-e.counts.stale,of:e.chips.length}),this.panel.hidden)return;this.panel.querySelector(".line").textContent=e.line,this.panel.querySelector("ul").replaceChildren(...e.chips.map(s=>{let r=document.createElement("li");r.dataset.level=s.level,r.title=s.tip;let o=document.createElement("b");o.textContent=s.name;let a=document.createElement("span");return a.textContent=s.text,r.append(o,a),r}))}};var Sh=()=>({...wn,...globalThis.__stagecraftSpeed??{}}),C0=n=>Math.round(n*10)/10,wh=class{constructor(t){this.host=t,this.probe=null,this.strikes=0,this.hard=0,this.last=null,this.timer=null,this.starting=null,this.gaps=[],this.watch=null,this.away=()=>this.#i(),document.addEventListener("visibilitychange",this.away),this.#t()}get wanted(){if(ba()!=="auto"||this.host.backend?.name!=="three")return!1;let t=Wh();return!(t&&t.ok)}#t(){let t=null,e=i=>{this.watch=null,t!==null&&this.gaps.push(i-t),t=i,this.gaps.length<40&&!this.host.running&&(this.watch=requestAnimationFrame(e))};this.watch=requestAnimationFrame(e)}start(){if(this.cancel(),!this.wanted)return;let t=this.starting={},e=()=>{this.starting===t&&(this.timer=setTimeout(()=>this.#e(),Sh().settle))};game.ready?e():Hooks.once("ready",e)}cancel(){clearTimeout(this.timer),this.timer=null,this.probe=null,this.starting=null}stop(){this.cancel(),this.watch!==null&&cancelAnimationFrame(this.watch),this.watch=null,document.removeEventListener("visibilitychange",this.away)}#e(){if(this.timer=null,!(!this.host.running||!this.wanted)){if(document.hidden){this.timer=setTimeout(()=>this.#e(),2e3);return}this.probe=new va(Sh())}}#i(){!document.hidden||!this.probe||(this.probe=null,this.timer=setTimeout(()=>this.#e(),Sh().settle))}feed(t){let e=this.probe;e&&(e.push(t),e.done&&this.#n(e))}#n(t){this.probe=null;let e=Sh(),i=t.result(),s=Sf(this.gaps,e),r=Tf(i,{limits:e,display:s,cap:this.host.pace?.cap??60,patient:t.elapsed>=e.patience}),o=es();this.last={verdict:r,median:C0(i.median),display:C0(s),at:Date.now()},console.info(`${nt} | speed test: a picture every ${this.last.median} ms at the median (${i.n} gaps; the display allows ${this.last.display} ms, ${Tn().renderer||"unknown graphics"}): ${r}`),this.host.health?.changed();let a=Ef({tier:o,verdict:r,strikes:this.strikes,hard:this.hard});if(this.strikes=a.strikes,this.hard=a.hard,a.to){this.#s(a.to,r);return}if(r==="ok"){Xh({ok:!0});return}(r==="slow"||r==="very-slow")&&(this.timer=setTimeout(()=>this.#e(),e.again))}#s(t,e){Xh({tier:t}),ui.notifications?.info(game.i18n.localize(t==="flat"?"STAGECRAFT.Notify.SpeedFlat":"STAGECRAFT.Notify.SpeedLow")),console.info(`${nt} | speed test: this computer is moved down to the ${t} stage (${e}, twice)`),this.host.rebuild().catch(i=>console.warn(`${nt} | could not draw the lighter stage`,i))}};var c1=450,Th=16,Eh=class{constructor(t){this.host=t,this.el=null,this.key=null,this.say=null,this.timer=null}hover(t,e,i){this.#t(t,e,i,()=>n0(this.host.stage?.cards.get(t)?.person))}hoverWall(t,e,i){if(!game.user.isGM||!this.host.chalk)return this.#t(null,e,i);this.#t(`wall:${Math.round(t.x/24)}:${Math.round(t.y/24)}`,e,i,()=>{let s=this.host.chalk.painterAt(t);return s?{name:game.i18n.format("STAGECRAFT.Chalk.PaintedBy",{name:s}),text:""}:null})}#t(t,e,i,s=null){if(this.at={x:e,y:i},t!==this.key){this.hide(),this.key=t,this.say=s,t&&(this.timer=setTimeout(()=>this.#e(),c1));return}this.el?.classList.contains("shown")&&this.#i(e,i)}hide(){clearTimeout(this.timer),this.timer=null,this.key=null,this.el?.classList.remove("shown")}dispose(){this.hide(),this.el?.remove(),this.el=null}#e(){this.timer=null;let t=this.host;if(!this.key||!t.running||t.dragging||t.chalk?.inHand)return;let e=this.say?.();if(!e)return;this.el||(this.el=document.createElement("div"),this.el.className="stagecraft-tip",this.el.setAttribute("role","tooltip"),t.root.append(this.el)),this.el.replaceChildren();let i=document.createElement("div");if(i.className="tip-name",i.textContent=e.name,this.el.append(i),e.text){let s=document.createElement("div");s.className="tip-text",s.textContent=e.text,this.el.append(s)}this.el.classList.add("shown"),this.#i(this.at.x,this.at.y)}#i(t,e){let i=this.el,s=i.offsetWidth,r=i.offsetHeight,o=Math.max(8,Math.min(t+Th,window.innerWidth-s-8)),a=e+Th+r>window.innerHeight-8?Math.max(8,e-Th-r):e+Th;i.style.left=`${Math.round(o)}px`,i.style.top=`${Math.round(a)}px`}};var ge=(n,t)=>t?game.i18n.format(`STAGECRAFT.Bar.${n}`,t):game.i18n.localize(`STAGECRAFT.Bar.${n}`),h1=["hands","mode","freeze","undo","wipe","wipeone","hide"],Ah=class{constructor(t){this.host=t,this.el=document.createElement("div"),this.el.className="stagecraft-bar",this.el.setAttribute("role","toolbar"),this.el.setAttribute("aria-label",ge("Label")),this.el.innerHTML=h1.map(e=>`<button type="button" data-act="${e}"></button>`).join(""),t.root.append(this.el),this.el.addEventListener("click",this.#i),this.refresh()}dispose(){this.el?.removeEventListener("click",this.#i),this.el?.remove(),this.el=null}get#t(){return this.host.scene}get#e(){return this.#t.flags?.[nt]?.live??{}}refresh(){if(!this.el)return;let t=this.host.chalk;if(!t){this.el.hidden=!0;return}this.el.hidden=!1;let e=t.policy(),i=this.#e.chalk?.mode??null,s=(r,o,{on:a=!1,tip:l="",disabled:c=!1}={})=>{let h=this.el.querySelector(`[data-act="${r}"]`);h.textContent=o,h.title=l,h.setAttribute("aria-pressed",a?"true":"false"),h.classList.toggle("on",a),h.disabled=c};s("hands",ge("Hands.Label"),{on:Is(this.#t),tip:ge("Hands.Tip")}),s("mode",i?ge("Mode.Set",{mode:ge(`Mode.${i}`)}):ge("Mode.Scene",{mode:ge(`Mode.${e.mode}`)}),{on:!!i,tip:ge("Mode.Tip")}),s("freeze",ge("Freeze.Label"),{on:e.locked,tip:ge("Freeze.Tip")}),s("undo",ge("Undo.Label"),{tip:ge("Undo.Tip"),disabled:!t.store.ready}),s("wipe",ge("Wipe.Label"),{tip:ge("Wipe.Tip"),disabled:!t.store.ready}),s("wipeone",ge("WipeOne.Label"),{tip:ge("WipeOne.Tip"),disabled:!t.store.ready}),s("hide",ge("Hide.Label"),{on:this.#e.chalkHidden===!0,tip:ge("Hide.Tip")})}#i=t=>{let e=t.target.closest("button[data-act]");!e||e.disabled||this.#n(e.dataset.act).catch(i=>console.warn(`${nt} | the stage bar could not do "${e.dataset.act}"`,i))};async#n(t){let e=this.#t,i=this.host.chalk,s=i?.store;if(t==="hands")await e.update({[`flags.${nt}.live.handsOff`]:!Is(e)});else if(t==="mode")await e.update({[`flags.${nt}.live.chalk.mode`]:Ng(this.#e.chalk?.mode)});else if(t==="freeze")await e.update({[`flags.${nt}.live.chalk.locked`]:!i.policy().locked});else if(t==="hide")await e.update({[`flags.${nt}.live.chalkHidden`]:this.#e.chalkHidden!==!0});else if(t==="undo")await s.undo(e.id);else if(t==="wipe")await foundry.applications.api.DialogV2.confirm({window:{title:ge("Wipe.Title")},content:`<p>${ge("Wipe.Ask")}</p>`,yes:{default:!1}})&&await s.wipe(e.id);else if(t==="wipeone"){let r=i.painters();if(!r.length){ui.notifications?.info(ge("WipeOne.None"));return}let o=await foundry.applications.api.DialogV2.wait({window:{title:ge("WipeOne.Title")},content:`<p>${ge("WipeOne.Ask")}</p>`,buttons:[...r.map(a=>({action:a.by,label:ge("WipeOne.Who",{name:a.name,tiles:a.tiles}),icon:"fa-solid fa-eraser"})),{action:"",label:ge("WipeOne.Cancel"),default:!0}],rejectClose:!1});o&&await s.wipe(e.id,{by:o})}this.refresh()}};var u1=.45,Ch=()=>(globalThis.game?.time?.serverTime??Date.now())/1e3,R0=Promise.resolve();function zr(n){let t=R0.then(n,n);return R0=t.catch(e=>console.warn(`${nt} | a write to the stage failed`,e)),t}function jd(n,t=null){if(t?.scene?.id===n.id&&t.stage)return t.stage;let{usable:e,scene:i}=Ps(n);return e?new Os(i,qr(n),{clock:Ch}):null}function fa(n,t){return!game.user?.isGM||!t?.length?Promise.resolve(!1):zr(async()=>{let e=Qn(n),i=yp(e,t,Ch()+u1);return await n.update({[`flags.${nt}.published.cards`]:i}),!0})}async function pa(n,t,e={},i=null){let s=jd(n,i);if(!s)return[];let r=s.formationMoves(t,e);return await fa(n,r),r}async function Rh(n,{gait:t="walk"}={}){let e=_p(Qn(n),{gait:t});return await fa(n,e),e}function Ph(n,t=null,e=null){if(!game.user?.isGM)return Promise.resolve(0);let i=jd(n,t);if(!i)return Promise.resolve(0);let s=i.exportPlaces();return zr(async()=>{let r=Qn(n),o=Mp(r,s,e),a=o.filter((l,c)=>l!==r[c]).length;return a&&await n.update({[`flags.${nt}.published.cards`]:o}),a})}async function Ih(n,t=null){let e=jd(n,t);if(!e)return[];let i=e.marks.map(o=>({...o,capacity:o.capacity-(e.resting.get(o.id)?.size??0)})).filter(o=>o.capacity>0),s=[...e.cards.values()].filter(o=>!o.mark&&o.holder===null).map(o=>({id:o.id,X:o.walk?o.walk.to.X:o.puppet.x,Z:o.walk?o.walk.to.Z:o.Z})),r=Ra(i,s).map(({card:o,mark:a})=>({id:o,mark:a,gait:"hurry",still:!0,packed:!1}));return await fa(n,r),r}var Hr=n=>n?.flags?.[nt]?.live?.life!==!1;function Gr(n){let t=n?.flags?.[nt]?.live?.board;return typeof t=="boolean"?t:n?.flags?.[nt]?.stage?.board===!0}var Lh=(n,t)=>n.update({[`flags.${nt}.live.life`]:!!t}),kh=(n,t)=>n.update({[`flags.${nt}.live.board`]:!!t});function Dh(n,t,e){return game.user?.isGM?zr(async()=>{let i=Qn(n);if(!i.some(r=>r.id===t))return!1;let s=i.map(r=>{if(r.id!==t)return r;let o={...r};return e?o.down=!0:delete o.down,o});return await n.update({[`flags.${nt}.published.cards`]:s}),!0}):Promise.resolve(!1)}var Jd=n=>n?.flags?.[nt]?.live?.speaker??null,Nh=(n,t)=>n.update({[`flags.${nt}.live.speaker`]:typeof t=="string"?t:null}),Oh=n=>n?.flags?.[nt]?.live?.turn??null;function P0(n,t){if(!game.user?.isGM)return Promise.resolve(!1);let e=typeof t=="string"?t:null;return Oh(n)===e?Promise.resolve(!1):n.update({[`flags.${nt}.live.turn`]:e}).then(()=>!0)}function I0(n,t,e){if(!game.user?.isGM)return Promise.resolve(!1);let i=Zn(e);return zr(async()=>{let s=Qn(n),r=s.find(a=>a.id===t);if(!r||Mg(r.badges,i))return!1;let o=s.map(a=>{if(a.id!==t)return a;let l={...a};return i.length?l.badges=i:delete l.badges,l});return await n.update({[`flags.${nt}.published.cards`]:o}),!0})}var qd=new Set;function L0(n){if(typeof n!="function")throw new TypeError("a moments provider must be a function of the scene");return qd.add(n),()=>qd.delete(n)}var Yd=new Set;function k0(n){if(typeof n!="function")throw new TypeError("a cover provider must be a function");return Yd.add(n),()=>Yd.delete(n)}function Kd(){let n=[];for(let t of Yd)try{let e=t();Array.isArray(e)&&n.push(...e.filter(i=>Array.isArray(i?.rect)||Array.isArray(i?.circle)))}catch(e){console.warn(`${nt} | a cover provider failed`,e)}return n}function Qd(n,t,e){let i=r=>e.ox+(r-t.left)/e.s,s=r=>e.oy+(r-t.top)/e.s;return n.map(r=>r.rect?{rect:[i(r.rect[0]),s(r.rect[1]),i(r.rect[2]),s(r.rect[3])]}:{circle:[i(r.circle[0]),s(r.circle[1]),r.circle[2]/e.s]})}function D0(n){let t=[];for(let e of qd)try{let i=e(n);Array.isArray(i)&&t.push(...i.filter(s=>s&&typeof s.label=="string"&&typeof s.run=="function"))}catch(i){console.warn(`${nt} | a moments provider failed`,i)}return t}var Oe=(n,t)=>t?game.i18n.format(`STAGECRAFT.Blocking.${n}`,t):game.i18n.localize(`STAGECRAFT.Blocking.${n}`),tf={line:"Line",huddle:"Huddle",talk:"Talk",gangup:"Gangup",panel:"Panel",standoff:"Standoff",circle:"Circle",queue:"Queue",scatter:"Scatter",audience:"Audience",position:"Position"},Fh=class{constructor(t){this.host=t,this.armed=null,this.el=document.createElement("div"),this.el.className="stagecraft-bar stagecraft-blocking",this.el.setAttribute("role","toolbar"),this.el.setAttribute("aria-label",Oe("Label")),this.el.innerHTML=`
      <div class="row">
        <button type="button" data-act="life"></button>
        <button type="button" data-act="board"></button>
        <span class="sep"></span>
        ${Ia.map(e=>`<button type="button" data-act="form" data-kind="${e}"></button>`).join("")}
        <span class="sep"></span>
        <button type="button" data-act="tidy"></button>
        <button type="button" data-act="places"></button>
        <button type="button" data-act="keep"></button>
      </div>
      <div class="row moments" hidden></div>
      <div class="hint" hidden></div>`,t.root.append(this.el),this.el.addEventListener("click",this.#i),this.el.addEventListener("dblclick",this.#n),this.refresh()}dispose(){this.el?.removeEventListener("click",this.#i),this.el?.removeEventListener("dblclick",this.#n),this.el?.remove(),this.el=null}get#t(){return this.host.scene}refresh(){if(!this.el)return;let t=this.#t,e=(r,o,{on:a=!1,tip:l=""}={})=>{r.textContent=o,r.title=l,r.setAttribute("aria-pressed",a?"true":"false"),r.classList.toggle("on",a)};e(this.el.querySelector('[data-act="life"]'),Oe("Life.Label"),{on:Hr(t),tip:Oe("Life.Tip")}),e(this.el.querySelector('[data-act="board"]'),Oe("Board.Label"),{on:Gr(t),tip:Oe("Board.Tip")});for(let r of this.el.querySelectorAll('[data-act="form"]')){let o=r.dataset.kind;e(r,Oe(`Form.${tf[o]}.Label`),{on:this.armed===o,tip:`${Oe(`Form.${tf[o]}.Tip`)} ${Oe("Form.How")}`})}e(this.el.querySelector('[data-act="tidy"]'),Oe("Tidy.Label"),{tip:Oe("Tidy.Tip")}),e(this.el.querySelector('[data-act="places"]'),Oe("Places.Label"),{tip:Oe("Places.Tip")}),e(this.el.querySelector('[data-act="keep"]'),Oe("Keep.Label"),{tip:Oe("Keep.Tip")});let i=D0(t),s=this.el.querySelector(".moments");s.hidden=!i.length,s.innerHTML=i.map((r,o)=>`<button type="button" data-act="moment" data-i="${o}" title="${N0(r.tip??"")}">${N0(r.label)}</button>`).join(""),this.moments=i,this.#e()}#e(){let t=this.el.querySelector(".hint"),e=this.host.selected?.size??0,i=[];this.armed&&i.push(Oe("Armed",{name:Oe(`Form.${tf[this.armed]}.Label`)})),e&&i.push(Oe("Selected",{n:e})),t.hidden=!i.length,t.textContent=i.join(" \xB7 ")}selectionChanged(){this.el&&this.#e()}disarm(){return this.armed?(this.armed=null,this.refresh(),!0):!1}async placeArmed({card:t=null,at:e=null}){let i=this.armed;if(!i)return!1;this.disarm();let s=this.host.selected?.size?[...this.host.selected]:null,r={ids:s,focus:t??e??null};return t&&i==="gangup"&&(r.target=t),t&&i==="talk"&&(r.speakers=[t,...(s??[]).filter(o=>o!==t)]),s&&i==="talk"&&!t&&(r.speakers=s.slice(0,2)),(t||s)&&(r.party=!0),t&&s&&!s.includes(t)&&(r.ids=[...s,t]),await pa(this.#t,i,r,this.host),!0}#i=t=>{let e=t.target.closest("button[data-act]");!e||e.disabled||this.#s(e).catch(i=>console.warn(`${nt} | the blocking strip could not do "${e.dataset.act}"`,i))};#n=t=>{let e=t.target.closest('button[data-act="form"]');if(!e)return;this.armed=null;let i=this.host.selected?.size?[...this.host.selected]:null;pa(this.#t,e.dataset.kind,{ids:i,party:!!i},this.host).then(()=>this.refresh()).catch(s=>console.warn(`${nt} | the formation could not be made`,s))};async#s(t){let e=this.#t,i=t.dataset.act;if(i==="life")await Lh(e,!Hr(e));else if(i==="board")await kh(e,!Gr(e));else if(i==="form")this.armed=this.armed===t.dataset.kind?null:t.dataset.kind;else if(i==="tidy")await Ih(e,this.host);else if(i==="places")await Rh(e);else if(i==="keep"){let s=this.host.selected?.size?[...this.host.selected]:null;if(await foundry.applications.api.DialogV2.confirm({window:{title:Oe("Keep.Title")},content:`<p>${Oe(s?"Keep.AskSome":"Keep.AskAll",{n:s?.length??0})}</p>`,yes:{default:!1}})){let o=await Ph(e,this.host,s);ui.notifications?.info(Oe("Keep.Done",{n:o}))}}else i==="moment"&&await this.moments?.[Number(t.dataset.i)]?.run?.(e);this.refresh()}};function N0(n){return String(n).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}var Uh=class{constructor({scene:t,skins:e,anchor:i,services:s={},onFatal:r=null}){this.scene=t,this.onFatal=r,this.guard=new Fa({limit:600,report:(o,a)=>console.error(`${nt} | a frame failed (${a} in a row)`,o),onFatal:o=>this.#e(o)}),this.threeFailed=!1,this.losses=0,this.rebuilding=!1,this.saving=Promise.resolve(),this.skins=e,this.anchor=i,this.services=s,this.userId=game.user.id,this.dragging=null,this.selected=new Set,this.running=!1,this.frames=0,this.speed=null,this.health=null,this.healthBoard=null,this.tip=null,this.pace=new Ma({cap:Ff(),easing:Zh()}),this.pose=null,this.listeners=[],this.hooks=[]}async start(){let{usable:t,scene:e,problems:i}=Ps(this.scene);if(!t)return console.warn(`${nt} | "${this.scene.name}" has a stage description that cannot be drawn:`,i),ui.notifications?.warn(game.i18n.format("STAGECRAFT.Notify.Unusable",{scene:this.scene.name})),!1;i.length&&console.warn(`${nt} | "${this.scene.name}" has notes:`,i),this.description=e,this.described=JSON.stringify(this.scene.flags?.[nt]?.stage??null),this.people=qr(this.scene);let s=()=>this.root&&this.backend?.view?Qd(Kd(),this.root.getBoundingClientRect(),this.backend.view):[];this.stage=new Os(e,this.people,{card:this.skins.get(e.skin).size,clock:Ch,cover:s}),this.stage.setLife(Hr(this.scene)),this.stage.setBoard(Gr(this.scene)),this.stage.setSpeaker(Jd(this.scene)),this.stage.setTurn(Oh(this.scene));for(let r of this.people){let o=this.stage.cards.get(r.id);o&&(o.appliedMove=r.move?.t0??null)}for(let r of this.stage.problems)console.warn(`${nt} | ${r}`);return this.sync=new Ua({stage:this.stage,scene:this.scene.id,me:this.userId,now:()=>game.time.serverTime,clock:()=>performance.now(),send:r=>this.channel?.send(r),mayHold:(r,o)=>this.#l(r,o),onLost:r=>this.#u(r),onDrop:r=>this.#d(r)}),this.channel=M0((r,o)=>{r?.type==="chalk"?this.chalk?.receive(r,o):r?.type==="health"?(this.health?.receive(r),this.healthBoard?.receive(r,o)):this.sync.receive(r,o)}),this.root=document.createElement("div"),this.root.id="stagecraft-stage",this.root.dataset.scene=this.scene.id,this.anchor.after(this.root),this.speed=new wh(this),await this.#t(),this.services.chalkStore&&(this.chalk=new _h({host:this,store:this.services.chalkStore,send:r=>this.channel?.send(r)}),this.kit=new vh(this,this.chalk),this.chalk.sync(),this.chalk.refresh(),this.#x()),game.user.isGM&&(this.bar=new Ah(this),this.blocking=new Fh(this),this.healthBoard=new bh(this),this.#g()),this.#p(),this.health=new Mh(this),this.tip=new Eh(this),this.#M(),this.#a(),this.#b(),this.#S(),this.running=!0,this.last=performance.now(),this.pace.poke(this.last),this.raf=requestAnimationFrame(this.#i),this.speed.start(),setTimeout(()=>{this.running&&this.#v()},0),Hooks.callAll("stagecraft.stageReady",this),!0}async#t(){let t=new ys,e=this.root.clientWidth||window.innerWidth,i=this.root.clientHeight||window.innerHeight,s=this.skins.get(this.description.skin),r=ba()==="auto"&&Lf(),o=Pf({tier:es(),webgl:If(),failed:this.threeFailed,software:r});if(o==="flat"&&r&&!this.toldFlat&&(this.toldFlat=!0,ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.FlatSoftware"))),o==="three"){let l=new mh({images:t,onContextLost:()=>this.#w()});try{l.mount(this.root,{quality:es(),pixelRatio:window.devicePixelRatio,width:e,height:i}),l.setCalm(Sa()),l.setZoneSetting(wa()),await l.load(this.description,s,this.people),this.backend=l;return}catch(c){console.warn(`${nt} | the 3D picture could not start here; drawing the plain one`,c),l.dispose(),this.threeFailed=!0}this.toldFlat||(this.toldFlat=!0,ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.Flat")))}let a=new xh({images:t});a.mount(this.root,{pixelRatio:window.devicePixelRatio,width:e,height:i}),a.setCalm(Sa()),a.setZoneSetting(wa()),await a.load(this.description,s,this.people),this.backend=a}#e(t){if(this.backend?.name!=="flat"&&!this.threeFailed&&this.running){console.warn(`${nt} | the 3D picture keeps failing; trying the plain one`,t),this.threeFailed=!0,this.guard.failures=0,this.rebuild().then(()=>{this.running&&(this.last=performance.now(),this.raf=requestAnimationFrame(this.#i))}).catch(e=>{this.running=!1,this.onFatal?.(e)});return}this.running=!1,this.onFatal?.(t)}async stop(){this.running=!1,cancelAnimationFrame(this.raf);for(let[t,e,i,s]of this.listeners)t.removeEventListener(e,i,s);this.listeners=[];for(let[t,e]of this.hooks)Hooks.off(t,e);this.hooks=[],this.resizeObserver?.disconnect(),this.sync?.close(),this.channel?.close(),this.channel=null,this.chalk?.stop(),this.kit?.dispose(),this.chalk?.wall?.clear(),this.speed?.stop(),this.health?.stop(),this.healthBoard?.dispose(),this.tip?.dispose(),this.bar?.dispose(),this.blocking?.dispose(),this.backend?.dispose(),this.root?.remove(),this.chalk=this.kit=this.speed=this.health=this.healthBoard=this.tip=this.bar=this.blocking=this.backend=this.root=null}#i=t=>{if(!this.running)return;if(!this.pace.due(t)){this.raf=requestAnimationFrame(this.#i);return}let e=this.guard.run(()=>{let i=(t-this.last)/1e3;this.last=t,this.sync.tick(),this.stage.advance(i);let s=this.stage.snapshot({viewer:this.userId,selected:this.selected});if(this.#n(s,t),this.chalk?.inHand)for(let r of this.chalk.chalkZones())s.zones[r.id]=this.chalk.cursorZone===r.id?"target":"near";this.chalk?.wall?.flush?.(),this.health?.frame(t,this.pace.scale(t)),this.backend.draw(s),this.speed?.feed(t),this.frames++,this.frames%60===0&&this.#x();for(let r of this.stage.drain())r.type==="visit"&&this.#s(r),Hooks.callAll(`stagecraft.${r.type}`,r,this)});this.pace.drew(t),e&&(this.raf=requestAnimationFrame(this.#i))};#n(t,e){let i=Cf(t.cards);Rf(this.pose,i)&&this.pace.poke(e),this.pose=i,(t.bonks?.length||this.dragging||this.chalk?.drawing||this.chalk?.wall?.strokes?.size||this.speed?.probe||this.blocking?.armed)&&this.pace.poke(e)}#s(t){let e=this.description.zones.find(u=>u.id===t.zone),i=this.stage.cards.get(t.card);if(!e||!i||!this.root||!this.backend?.project)return;let s=e.floor??e.shape,r=s.reduce((u,d)=>u+d[0],0)/s.length,o=Math.max(...s.map(u=>u[1])),a=this.stage.rig.standing([r,o])??{X:i.puppet.restX,Z:i.restZ},l=this.backend.project({X:a.X,Y:i.h*i.grow*1.12,Z:a.Z});if(!l||!Number.isFinite(l.x))return;let c=document.createElement("div");c.className="stagecraft-visit";let h=document.createElement("b");if(h.textContent=game.i18n.format("STAGECRAFT.Visit.At",{name:i.person.name??i.id,zone:e.name||e.id}),c.append(h),e.hint){let u=document.createElement("span");u.textContent=e.hint,c.append(u)}c.style.left=`${Math.round(l.x)}px`,c.style.top=`${Math.round(l.y)}px`,this.root.append(c),setTimeout(()=>c.remove(),4200)}#r(t,e,i,s){t.addEventListener(e,i,s),this.listeners.push([t,e,i,s])}#o(t){let e=this.root.getBoundingClientRect();return{x:t.clientX-e.left,y:t.clientY-e.top}}#c(t,e=this.root.getBoundingClientRect()){let i=t.pointerType==="pen"&&(t.button===5||(t.buttons&32)!==0);return{x:t.clientX-e.left,y:t.clientY-e.top,pressure:t.pressure,pointerType:t.pointerType,t:t.timeStamp,shift:t.shiftKey,alt:t.altKey,flip:i}}#a(){let t=this.backend.canvas;this.#r(t,"pointerdown",i=>{if(this.pace.poke(performance.now()),this.tip?.hide(),i.button===2&&this.chalk?.inHand){this.chalk.putAway();return}if(i.button===2&&this.blocking?.disarm()||i.button!==0&&!(i.button===5&&i.pointerType==="pen"&&this.chalk?.inHand))return;let s=this.#o(i),r=this.backend.pick(s.x,s.y);if(this.blocking&&!this.chalk?.inHand){if(this.blocking.armed){let l=r?.kind==="card"?null:this.#h(s);if(r?.kind==="card"||l){this.blocking.placeArmed({card:r?.kind==="card"?r.id:null,at:l}).catch(c=>console.warn(`${nt} | the formation could not be made`,c)),i.preventDefault();return}}if(i.shiftKey&&r?.kind==="card"){this.selected.has(r.id)?this.selected.delete(r.id):this.selected.add(r.id),this.blocking.selectionChanged(),i.preventDefault();return}if((i.ctrlKey||i.metaKey)&&r?.kind==="card"){let l=this.stage.cards.get(r.id);Dh(this.scene,r.id,!l?.downTo).catch(c=>console.warn(`${nt} | could not knock down ${r.id}`,c)),i.preventDefault();return}if(i.altKey&&r?.kind==="card"){Nh(this.scene,this.stage.speaker===r.id?null:r.id).catch(l=>console.warn(`${nt} | could not give the floor`,l)),i.preventDefault();return}}if(r?.kind==="chalk"||r?.kind==="magic"||r?.kind==="eraser"){this.chalk?.take(r.kind==="eraser"?"rub":r.kind==="magic"?"magic":r.colour),this.chalk?.hover(s),i.preventDefault();return}if(this.chalk?.inHand){i.preventDefault();let l=this.#c(i);if(this.kit?.takesPick()){this.chalk.pickColour(l);return}this.chalk.begin(l)&&(t.setPointerCapture(i.pointerId),this.chalk.hover(s));return}if(r?.kind!=="card"||!this.sync.grab(r.id))return;let o=this.backend.floorAt(s.x,s.y,r.point.y),a=this.stage.cards.get(r.id);this.dragging={id:r.id,height:r.point.y,offX:(o?.x??a.puppet.x)-a.puppet.x,offZ:(o?.z??a.Z)-a.Z},t.setPointerCapture(i.pointerId),t.style.cursor="grabbing",i.preventDefault()}),this.#r(t,"pointermove",i=>{let s=this.#o(i);if((this.dragging||this.chalk?.inHand||i.buttons)&&this.pace.poke(performance.now()),this.chalk?.drawing){let o=this.root.getBoundingClientRect(),a=i.getCoalescedEvents?.()??[];for(let l of a.length?a:[i])this.chalk.extend(this.#c(l,o))}if(this.chalk?.inHand){this.tip?.hide(),this.chalk.hover(s),t.style.cursor="none";return}if(!this.dragging){let o=this.backend.pick(s.x,s.y);t.style.cursor=o?"grab":"default",o?.kind==="card"||!this.chalk?this.tip?.hover(o?.kind==="card"?o.id:null,i.clientX,i.clientY):this.tip?.hoverWall(s,i.clientX,i.clientY);return}this.tip?.hide();let r=this.backend.floorAt(s.x,s.y,this.dragging.height);r&&this.sync.move(this.dragging.id,r.x-this.dragging.offX,r.z-this.dragging.offZ)});let e=i=>{if(this.pace.poke(performance.now()),this.chalk?.drawing){i.type==="pointercancel"?this.chalk.cancel():this.chalk.end().catch(s=>console.warn(`${nt} | chalk stroke failed`,s)),this.chalk.hover(this.#o(i));return}this.dragging&&(this.sync.release(this.dragging.id),this.dragging=null,t.style.cursor="default")};this.#r(t,"pointerup",e),this.#r(t,"pointercancel",e),this.#r(t,"pointerleave",()=>{this.tip?.hide(),this.chalk?.inHand&&!this.chalk.drawing&&this.chalk.hover(null)}),this.#r(window,"keydown",i=>{if(i.code==="Escape"){if(this.chalk?.drawing)this.chalk.cancel();else if(this.chalk?.inHand)this.chalk.putAway();else if(!this.healthBoard?.close()){if(!this.blocking?.disarm())if(this.selected.size)this.selected.clear(),this.blocking?.selectionChanged();else return}i.preventDefault(),i.stopPropagation()}},!0)}#h(t){let e=this.backend.floorAt(t.x,t.y,0);if(!e)return null;let i=this.stage.rig.fractionOf(e.x,e.z);return Number.isFinite(i[0])&&Number.isFinite(i[1])?[Math.round(i[0]*1e4)/1e4,Math.round(i[1]*1e4)/1e4]:null}perform(t){this.pace.poke(performance.now()),this.dragging&&this.sync.verb(this.dragging.id,t)}#l(t,e){let i=this.stage.cards.get(t)?.person,s=game.users.get(e);return!!i&&!!s&&Mf(i,s,{handsOff:Is(this.scene)})}#u(t){this.dragging?.id===t&&(this.dragging=null,this.backend?.canvas&&(this.backend.canvas.style.cursor="default"))}#d(t){if(!Sn())return;let e=this.stage.placeOf(t.card);e&&(this.saving=zr(()=>this.#f(e)).catch(i=>console.warn(`${nt} | could not save where a card was put down`,i)))}async#f(t){let e=this.scene.flags?.[nt]?.published?.cards;!Array.isArray(e)||!e.some(i=>i.id===t.id)||await this.scene.update({[`flags.${nt}.published.cards`]:vp(e,t)})}#m(){let t=qr(this.scene),e=new Set(t.map(i=>i.id));this.stage.setLife(Hr(this.scene)),this.stage.setBoard(Gr(this.scene)),this.#p();for(let i of t){let s=this.stage.cards.get(i.id);if(s){this.#y(s,i);continue}let r=this.stage.addCard(i);r&&(r.appliedMove=i.move?.t0??null),this.people.push(i),this.backend.addCard(i).catch(o=>console.warn(`${nt} | could not draw ${i.id}`,o))}for(let i of[...this.stage.cards.keys()])e.has(i)||(this.sync.forget(i),this.dragging?.id===i&&this.#u(i),this.stage.removeCard(i),this.backend.removeCard(i),this.people=this.people.filter(s=>s.id!==i));this.stage.setSpeaker(Jd(this.scene)),this.stage.setTurn(Oh(this.scene))}#g(){let t="stagecraft.gmOpen",e=!1;try{e=globalThis.localStorage?.getItem(t)==="1"}catch{}let i=document.createElement("button");i.type="button",i.className="stagecraft-gm-toggle";let s=()=>{this.root?.classList.toggle("stagecraft-gm-open",e),i.textContent=game.i18n.localize(e?"STAGECRAFT.Gm.Hide":"STAGECRAFT.Gm.Show"),i.setAttribute("aria-expanded",e?"true":"false")};i.addEventListener("click",()=>{e=!e;try{globalThis.localStorage?.setItem(t,e?"1":"0")}catch{}s()}),this.root.append(i),s()}#p(){if(!this.root)return;if(!(this.stage.board&&this.stage.zones.some(i=>i.kind==="area"))){this.keyEl?.remove(),this.keyEl=null;return}if(this.keyEl)return;let e=i=>game.i18n.localize(`STAGECRAFT.Board.${i}`);this.keyEl=document.createElement("div"),this.keyEl.className="stagecraft-board-key",this.keyEl.innerHTML=`<b>${e("Title")}</b><span><i class="engaged"></i>${e("Engaged")}</span><span><i class="near"></i>${e("Near")}</span><span><i class="far"></i>${e("Far")}</span>`,this.root.append(this.keyEl)}#y(t,e){let i=JSON.stringify(e.home??null)!==JSON.stringify(t.person.home??null);(i||JSON.stringify(e.life??null)!==JSON.stringify(t.person.life??null))&&this.stage.setRoutine(e.id,e.life,i&&Array.isArray(e.home)?e.home:null),this.stage.setDown(e.id,e.down===!0);let s=Bd(e)!==Bd(t.person);t.person={...t.person,...e,portrait:t.person.portrait},s&&this.backend?.refreshCard?.({...t.person})?.catch(o=>console.warn(`${nt} | could not redraw ${e.id}`,o));let r=e.move;if(r&&Number.isFinite(r.t0)&&r.t0!==t.appliedMove){t.appliedMove=r.t0,this.stage.walkTo(e.id,e.mark?{mark:e.mark}:{at:e.at},{t0:r.t0,gait:r.gait??"walk",yaw:Number.isFinite(e.yaw)?e.yaw:null,lean:e.lean??0,pitch:e.pitch??0,still:e.still===!0,packed:e.packed===!0});return}t.holder===null&&(t.still=e.still===!0,t.packed=e.packed===!0)}#x(){let t=this.backend;if(!this.chalk||!this.root||!t?.setChalkBoxAt||!t.view||!this.stage?.rig)return;let e=this.stage.rig,i=this.root.getBoundingClientRect(),s=t.view,r=Qd([...Kd(),...this.#_()],i,s),o={x0:s.ox,y0:s.oy,x1:s.ox+s.visW,y1:s.oy+s.visH},a=this.description.chalk?.box??kr,l;aa(e,a,r,o)?l=[a[0],a[1]]:this.boxAt&&aa(e,this.boxAt,r,o)?l=this.boxAt:l=Rg(e,a,r,o,this.stage.cardShapes()),!(this.boxAt&&l[0]===this.boxAt[0]&&l[1]===this.boxAt[1])&&(this.boxAt=l,t.setChalkBoxAt(l))}#_(){let t=[];for(let e of["hotbar"]){let s=document.getElementById(e)?.getBoundingClientRect?.();s&&s.width>0&&s.height>0&&t.push({rect:[s.left,s.top,s.right,s.bottom]})}return t}#M(){let t=()=>{!this.backend||!this.root||(this.backend.resize(this.root.clientWidth,this.root.clientHeight,window.devicePixelRatio),this.#x())};this.resizeObserver=new ResizeObserver(t),this.resizeObserver.observe(this.root),t()}#b(){this.hooks.push(["stagecraft.settingsChanged",Hooks.on("stagecraft.settingsChanged",t=>{t==="calm"&&this.backend?.setCalm(Sa()),t==="power"&&(this.pace.easing=Zh()),t==="zones"&&this.backend?.setZoneSetting(wa()),t==="tier"&&ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.TierNextScene"))})])}#S(){this.hooks.push(["userConnected",Hooks.on("userConnected",(t,e)=>{e||this.sync?.userGone(t.id)})]),this.hooks.push(["updateScene",Hooks.on("updateScene",t=>{t.id===this.scene.id&&this.#v()})])}#v(){if(!this.running&&!this.root)return;this.pace.poke(performance.now());let t=JSON.stringify(this.scene.flags?.[nt]?.stage??null);if(t!==this.described){this.described=t,globalThis.canvas?.scene?.id===this.scene.id&&globalThis.canvas.draw();return}this.chalk?.refresh(),this.bar?.refresh(),this.blocking?.refresh(),this.#m(),Is(this.scene)&&!game.user.isGM&&this.dragging&&(this.sync.release(this.dragging.id),this.dragging=null)}#w(){console.warn(`${nt} | the graphics context was lost; the stage will be rebuilt`),++this.losses>=2&&(this.threeFailed=!0),this.rebuild().catch(t=>{console.error(`${nt} | the stage could not be rebuilt`,t),this.onFatal?.(t)})}async rebuild(){if(!(!this.running||this.rebuilding)){this.rebuilding=!0;try{await this.#T()}finally{this.rebuilding=!1}}}async#T(){for(let[t,e,i,s]of this.listeners)t.removeEventListener(e,i,s);this.listeners=[],this.backend.dispose(),await this.#t(),!(!this.running||!this.backend)&&(this.chalk?.reset(),this.chalk?.sync(),this.chalk?.refresh(),this.boxAt=null,this.#x(),this.#a(),this.pace.poke(performance.now()),this.health?.changed(),this.speed?.start())}};var Jn={host:null};function O0(n,{makeHost:t=i=>new Uh(i),services:e={}}={}){let i=foundry.canvas.SceneManager;class s extends i{#t=null;#e=null;async _onDraw(){let a=canvas.app.view;this.#t=t({scene:this.scene,skins:n,anchor:a,services:e,onFatal:()=>this.#i()});let l=!1;try{this.#e={display:a.style.display},a.style.display="none",canvas.app.stop(),l=await this.#t.start()}catch(c){console.error(`${nt} | could not take over "${this.scene.name}"`,c),ui.notifications?.error(game.i18n.format("STAGECRAFT.Notify.Failed",{scene:this.scene.name}))}if(l){Jn.host=this.#t;return}try{await this.#t?.stop()}catch(c){console.error(`${nt} | the stage did not stop cleanly`,c)}this.#t=null,this.#n()}async _onTearDown(){Jn.host===this.#t&&(Jn.host=null),await this.#t?.stop(),this.#t=null,this.#n()}async#i(){if(!this.#t)return;let a=this.#t;this.#t=null,Jn.host===a&&(Jn.host=null),ui.notifications?.error(game.i18n.format("STAGECRAFT.Notify.Failed",{scene:this.scene.name}));try{await a.stop()}catch(l){console.error(`${nt} | the stage did not stop cleanly`,l)}this.#n()}#n(){this.#e&&(canvas.app.view.style.display=this.#e.display||"block",canvas.app.start(),this.#e=null)}}let r=CONFIG.Canvas.managedScenes;return CONFIG.Canvas.managedScenes=new Proxy(r,{get(o,a,l){if(typeof a!="string")return Reflect.get(o,a,l);if(Object.hasOwn(o,a))return o[a];let c=game.scenes?.get(a);return c&&Rs(c)?s:void 0}}),s}var d1="0.8.0";function F0({skins:n,current:t}){return{version:d1,skins:{register:e=>n.register(e),use:e=>n.use(e),list:()=>n.list()},scenes:{isStage:e=>Rs(e),describe:e=>Ps(e),validate:e=>_a(e)},blocking:{formations:[...Ia],gaits:[...lp],routines:[...nu],move:(e,i)=>fa(e,i),arrange:(e,i,s={})=>pa(e,i,s,t.host),backToPlaces:e=>Rh(e),keepPlaces:(e,i=null)=>Ph(e,t.host,i),tidy:e=>Ih(e,t.host),setLife:(e,i)=>Lh(e,i),setBoard:(e,i)=>kh(e,i),setSpeaker:(e,i)=>Nh(e,i),setTurn:(e,i)=>P0(e,i),setBadges:(e,i,s)=>I0(e,i,s),setDown:(e,i,s)=>Dh(e,i,s),registerMoments:e=>L0(e),setCover:e=>k0(e)},stage:()=>t.host?{stage:t.host.stage,backend:t.host.backend}:null,zoneKinds:[...vf],chalkModes:[...Zr],chalkTools:[...ah]}}var f1=[{action:"hop",verb:"hop",key:"Space"},{action:"nod",verb:"nod",key:"KeyN"},{action:"bow",verb:"bow",key:"KeyB"},{action:"shake",verb:"shake",key:"KeyX"},{action:"turn",verb:"turn",key:"KeyT"}];function U0(n){for(let{action:t,verb:e,key:i}of f1)game.keybindings.register(nt,t,{name:`STAGECRAFT.Keys.${t}`,editable:[{key:i}],onDown:()=>{let s=n();return s?.dragging?(s.perform(e),!0):!1},restricted:!1,precedence:CONST.KEYBINDING_PRECEDENCE.PRIORITY})}var p1="Stagecraft chalk",ma=2,Vr=()=>({render:!1});function ws(n,t,e){globalThis._del!==void 0?n[`${t}.${e}`]=globalThis._del:n[`${t}.-=${e}`]=null}var Wr=class n{#t=Promise.resolve();constructor(){this.listeners=new Set,this.hooks=[];for(let t of["createJournalEntryPage","updateJournalEntryPage","deleteJournalEntryPage"])this.hooks.push([t,Hooks.on(t,e=>this.#a(e))]);for(let t of["createJournalEntry","updateJournalEntry","deleteJournalEntry"])this.hooks.push([t,Hooks.on(t,e=>this.#h(e))]);this.hooks.push(["deleteScene",Hooks.on("deleteScene",t=>this.#u(t))]);for(let t of["createScene","updateScene"])this.hooks.push([t,Hooks.on(t,()=>this.#n())]);this.#l()}dispose(){for(let[t,e]of this.hooks)Hooks.off(t,e);this.hooks=[],this.listeners.clear()}get entry(){return game.journal?.find(t=>t.getFlag(nt,"chalk")===!0)??null}get ready(){return!!this.entry}static wanted(){return!!game.scenes?.some(t=>Rs(t)&&ih($r(t).chalk,t.flags?.[nt]?.live?.chalk).mode!=="off")}static#e=null;static ensure(){return Sn()?n.#e??=n.#i().finally(()=>{n.#e=null}):Promise.resolve(null)}static async#i(){let t=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,e=game.journal.find(i=>i.getFlag(nt,"chalk")===!0);return e?(e.ownership?.default??0)<t&&await e.update({"ownership.default":t}):e=await JournalEntry.create({name:p1,flags:{[nt]:{chalk:!0}},ownership:{default:t}}),e}#n(){!Sn()||this.ready||!n.wanted()||n.ensure().catch(t=>console.warn(`${nt} | could not make the chalk journal`,t))}#s(t){return(this.entry?.pages??[]).filter(e=>{let i=e.getFlag(nt,"chalk");return i?.scene===t&&i?.v===ma})}#r(t,e){return this.#s(t).find(i=>i.getFlag(nt,"chalk")?.by===e)??null}layers(t){return this.#s(t).map(e=>{let i=e.getFlag(nt,"chalk");return{by:i.by,since:i.since??0,tiles:{...i.tiles??{}},history:{...i.history??{}}}})}#o(t){let e=this.#t.then(t);return this.#t=e.catch(()=>{}),e}save(t,{by:e=game.user.id,tiles:i,step:s=null,grid:r=null}){return this.#o(async()=>{let o=this.entry;if(!o)return!1;let a=Object.keys(i??{}).filter(d=>!r||Ig(r,d));if(!a.length)return!1;let l=this.#r(t,e);if(!l){if(e!==game.user.id&&!game.user.isGM)return!1;let d=Object.fromEntries(a.filter(x=>i[x]).map(x=>[x,i[x]])),f=s?{[s.id]:{at:s.at,who:game.user.id,tiles:Object.fromEntries(a.map(x=>[x,null]))}}:{};return await o.createEmbeddedDocuments("JournalEntryPage",[{name:`chalk ${t} ${e}`,type:"text",text:{content:""},flags:{[nt]:{chalk:{v:ma,scene:t,by:e,since:s?.at??Date.now(),tiles:d,history:f}}}}],Vr()),!0}let c=l.getFlag(nt,"chalk"),h={},u=`flags.${nt}.chalk`;for(let d of a)i[d]?h[`${u}.tiles.${d}`]=i[d]:c.tiles?.[d]!==void 0&&ws(h,`${u}.tiles`,d);if(s){let d={at:s.at,who:game.user.id,tiles:Object.fromEntries(a.map(f=>[f,c.tiles?.[f]??null]))};h[`${u}.history.${s.id}`]=d;for(let f of Pd({...c.history??{},[s.id]:d},{protect:s.id}))ws(h,`${u}.history`,f)}return await l.update(h,Vr()),!0})}tidy({now:t=Date.now(),hours:e=Dg}={}){return!Sn()||!this.entry?Promise.resolve({steps:0,pages:0}):this.#o(async()=>{let i=this.entry,s=t-e*3600*1e3,r=c=>{let h=game.scenes;return h?typeof h.get=="function"?!!h.get(c):[...h].some(u=>u.id===c):!0},o=`flags.${nt}.chalk`,a=0,l=[];for(let c of[...i.pages??[]]){let h=c.getFlag(nt,"chalk");if(!h)continue;if(h.v!==ma||h.scene&&!r(h.scene)){l.push(c.id);continue}let u=Pd(h.history,{before:s}),d=Object.keys(h.history??{}).length-u.length;if(!Object.keys(h.tiles??{}).length&&d<=0){l.push(c.id);continue}if(!u.length)continue;let f={};for(let x of u)ws(f,`${o}.history`,x);await c.update(f,Vr()),a+=u.length}return l.length&&await i.deleteEmbeddedDocuments("JournalEntryPage",l,Vr()),{steps:a,pages:l.length}})}undo(t,{by:e=null}={}){return this.#o(async()=>{let s=this.#s(t).map(a=>{let l=a.getFlag(nt,"chalk"),c=e?Object.fromEntries(Object.entries(l.history??{}).filter(([,h])=>h?.who===e)):l.history;return{by:l.by,history:c,page:a}}),r=kg(s);if(!r)return null;let o={};for(let a of s){let l=a.history?.[r.id];if(!l||!a.page.isOwner)continue;let c=`flags.${nt}.chalk`,h=a.page.getFlag(nt,"chalk"),u={};ws(u,`${c}.history`,r.id);let d={};for(let[f,x]of Object.entries(l.tiles??{}))d[f]=h.tiles?.[f]??null,x?u[`${c}.tiles.${f}`]=x:h.tiles?.[f]!==void 0&&ws(u,`${c}.tiles`,f);await a.page.update(u,Vr()),o[a.by]=d}return{id:r.id,layers:o}})}wipe(t,{by:e=null}={}){return game.user.isGM?this.#o(async()=>{for(let i of this.#s(t)){let s=i.getFlag(nt,"chalk");if(e&&s?.by!==e)continue;let r=`flags.${nt}.chalk`,o={};for(let a of Object.keys(s?.tiles??{}))ws(o,`${r}.tiles`,a);for(let a of Object.keys(s?.history??{}))ws(o,`${r}.history`,a);Object.keys(o).length&&await i.update(o,Vr())}}):Promise.resolve()}painters(t){return this.layers(t).filter(e=>Object.keys(e.tiles).length).map(e=>e.by)}onChange(t){return this.listeners.add(t),()=>this.listeners.delete(t)}#c(t,e=null){for(let i of this.listeners)i(t,e)}#a(t){if(t.parent?.id!==this.entry?.id)return;let e=t.getFlag(nt,"chalk");if(e?.v!==ma){this.#l();return}e?.scene&&this.#c(e.scene,e.by)}#h(t){t.getFlag(nt,"chalk")===!0&&(this.#c(null),this.#l())}#l(){if(!Sn()||!this.entry)return;let t=(this.entry.pages??[]).filter(e=>{let i=e.getFlag(nt,"chalk");return i&&i.v!==ma}).map(e=>e.id);t.length&&this.#o(()=>this.entry.deleteEmbeddedDocuments("JournalEntryPage",t)).catch(e=>{/does not exist/.test(e?.message??"")||console.warn(`${nt} | could not remove old chalk pages`,e)})}#u(t){!Sn()||!t?.id||this.#o(async()=>{let e=(this.entry?.pages??[]).filter(i=>i.getFlag(nt,"chalk")?.scene===t.id).map(i=>i.id);e.length&&await this.entry.deleteEmbeddedDocuments("JournalEntryPage",e)}).catch(e=>{/does not exist/.test(e?.message??"")||console.warn(`${nt} | could not clear the chalk of a deleted scene`,e)})}};function m1(n,t,{user:e=game.user,journal:i=game.journal}={}){if(e?.isGM||!t?.querySelectorAll)return 0;let s=i?.find(o=>o.getFlag(nt,"chalk")===!0);if(!s)return 0;let r=[...t.querySelectorAll(`[data-entry-id="${s.id}"]`)];for(let o of r)o.remove();return r.length}function B0(){Hooks.on("renderJournalDirectory",(n,t)=>m1(n,t))}var ef=new ya,nf={chalkStore:null};Hooks.once("init",()=>{Of(),U0(()=>Jn.host),nf.chalkStore=new Wr,B0(),O0(ef,{services:nf}),Hooks.callAll("stagecraft.init",{registerSkin:n=>ef.register(n)})});Hooks.once("ready",async()=>{let n=game.modules.get("stagecraft");n.api=F0({skins:ef,current:Jn});try{Wr.wanted()&&await Wr.ensure()}catch(t){console.warn("stagecraft | could not make the chalk journal",t)}Hooks.callAll("stagecraft.ready",n.api),setTimeout(()=>nf.chalkStore?.tidy().catch(t=>console.warn("stagecraft | could not tidy the chalk journal",t)),8e3)});
/*! Bundled license information:

three/build/three.core.js:
three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2026 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
