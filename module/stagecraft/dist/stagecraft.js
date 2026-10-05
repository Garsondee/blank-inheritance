var Gp={family:'"Modesto Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif',weight:700,max:66,min:34,maxLines:3,lineHeight:1.04,tracking:.04,upper:!0},Vp={family:'Signika, "Helvetica Neue", Arial, sans-serif',weight:700,max:32,min:28,maxLines:3,lineHeight:1.16,tracking:.01,upper:!1},Tv={...Gp,max:48,min:26,maxLines:3},Ev={...Vp,max:28,min:22,maxLines:2},Hp='600 34px "Helvetica Neue", Arial, sans-serif';function Eo(i,t,e,n,s,r){i.beginPath(),i.roundRect(t,e,n,s,r)}var Wp={id:"paper",name:"Paper",size:{w:280,h:468},thickness:9,fonts:["700 40px 'Modesto Condensed'","700 28px Signika"],stick:{length:134,collar:12170148,wood:13081186},materials:{body:{color:15196109,metalness:0,roughness:.9},face:{metalness:0,roughness:.85,clearcoat:.15},back:{metalness:0,roughness:.9}},async face(i,{loadImage:t,titleBlock:e}={}){let r=document.createElement("canvas");r.width=560,r.height=936;let o=r.getContext("2d");Eo(o,0,0,560,936,28),o.fillStyle="#f3ecdc",o.fill(),o.lineWidth=6,o.strokeStyle="#3b3226",Eo(o,6,6,548,924,24),o.stroke();let a=36,l=36,c=488,h=e?.fit(i,{width:c-56,maxHeight:236,gap:14,name:Gp,text:Vp})??null,u=h?Math.min(300,Math.max(104,Math.ceil(h.height)+44)):98,d=936-l-36-34-u;o.save(),Eo(o,a,l,c,d,14),o.clip(),o.fillStyle="#cfc6b0",o.fillRect(a,l,c,d);let f=i.portrait&&t?await t(i.portrait):null;if(f){let x=Math.max(c/f.width,d/f.height);o.drawImage(f,a+(c-f.width*x)/2,l+(d-f.height*x)*.15,f.width*x,f.height*x)}else o.fillStyle="#3b3226",o.font=`700 ${Math.round(Math.min(c,d)*.5)}px sans-serif`,o.textAlign="center",o.textBaseline="middle",o.fillText((i.name??"?").slice(0,1).toUpperCase(),a+c/2,l+d/2);o.restore(),i.colour&&(o.fillStyle=i.colour,o.fillRect(a,l+d+14,c,8));let g=l+d+34;return h?e.draw(o,h,{x:a,y:g,w:c,h:u},{ink:"#2b241a",textInk:"#4a3f2f",rule:"rgba(59,50,38,0.4)"}):(o.fillStyle="#3b3226",o.font=Hp,o.textAlign="center",o.textBaseline="middle",o.fillText((i.name??i.id).toUpperCase(),560/2,g+(936-g-36)/2)),r},async back(i,{titleBlock:t}={}){let s=document.createElement("canvas");s.width=560,s.height=936;let r=s.getContext("2d");Eo(r,0,0,560,936,28),r.fillStyle="#b9966a",r.fill();let o=t?.fit(i,{width:372,maxHeight:200,gap:12,name:Tv,text:Ev})??null,a=o?Math.min(250,Math.max(88,Math.ceil(o.height)+40)):88;return r.fillStyle="#f3ecdc",Eo(r,560/2-206,936/2-a/2,412,a,6),r.fill(),o?t.draw(r,o,{x:560/2-206,y:936/2-a/2,w:412,h:a},{ink:"#2b241a",textInk:"#4a3f2f",rule:"rgba(59,50,38,0.4)"}):(r.fillStyle="#3b3226",r.font=Hp,r.textAlign="center",r.textBaseline="middle",r.fillText(i.name??i.id,560/2,936/2+2)),s}};var Av=["id","size","face","back"],el=class{constructor(){this.skins=new Map,this.register(Wp),this.current="paper"}register(t){for(let e of Av)if(!t?.[e])throw new Error(`a skin needs "${e}"`);if(typeof t.face!="function"||typeof t.back!="function")throw new Error("a skin's face and back are functions");if(!(t.size?.w>0&&t.size?.h>0))throw new Error("a skin's size is { w, h } in pixels");return this.skins.set(t.id,{thickness:9,fonts:[],stick:{length:134,collar:12170148,wood:13081186},materials:{},...t}),t.id}get(t){return this.skins.get(t)??this.skins.get(this.current)??this.skins.get("paper")}use(t){if(!this.skins.has(t))throw new Error(`no skin "${t}" is registered`);this.current=t}list(){return[...this.skins.keys()]}};var Ao=Object.freeze(["off","zones","anywhere"]),Cv=.15,Zp=Object.freeze(["door","spot","area","exit","track","chalk","podium","photo","quiet","music","shelter","shot","trigger"]),Qs=i=>typeof i=="number"&&Number.isFinite(i),Xp=(i,t=-.25,e=1.25)=>Qs(i)&&i>=t&&i<=e,Js=i=>Array.isArray(i)&&i.length===2&&Xp(i[0])&&Xp(i[1]),Se=(i,t)=>Qs(i)?i:t,Qe=(i,t="")=>typeof i=="string"?i:t;function Wu(i,t,e,n=0){if(!Array.isArray(i))return e.push(`${t}: expected a list of [x, y] points`),[];let s=[];return i.forEach((r,o)=>Js(r)?s.push([r[0],r[1]]):e.push(`${t}[${o}]: not a point on the painting`)),s.length<n&&e.push(`${t}: needs at least ${n} points`),s}function $p(i,t,e){let n=new Set;return i.filter(s=>s.id?n.has(s.id)?(e.push(`${t}: id "${s.id}" is used twice`),!1):(n.add(s.id),!0):(e.push(`${t}: an entry has no id`),!1))}function tr(i){let t=[],e=i&&typeof i=="object"?i:{};(!i||typeof i!="object")&&t.push("the scene carries no stage description");let n={src:Qe(e.painting?.src),size:Array.isArray(e.painting?.size)&&e.painting.size.length===2&&e.painting.size.every(x=>Qs(x)&&x>0)?[e.painting.size[0],e.painting.size[1]]:null};n.src||t.push("painting.src: the stage needs a painting"),n.size||t.push("painting.size: give the painting's size in pixels, [width, height]");let s={horizon:Se(e.rig?.horizon,null),floorFront:Se(e.rig?.floorFront,null),depth:Se(e.rig?.depth,null),vanish:Se(e.rig?.vanish,.5),lift:Se(e.rig?.lift,0)};for(let x of["horizon","floorFront","depth"])s[x]===null&&t.push(`rig.${x}: the rig needs a number here`);s.horizon!==null&&s.floorFront!==null&&s.floorFront<=s.horizon&&t.push("rig: the floor must meet the front of the picture below the horizon"),s.depth!==null&&s.depth<=0&&t.push("rig.depth: must be above zero");let r=(Array.isArray(e.lights)?e.lights:[]).flatMap((x,p)=>{if(!Js(x?.at))return t.push(`lights[${p}].at: not a point on the painting`),[];let m=Array.isArray(x.colour)&&x.colour.length===3&&x.colour.every(Qs)?x.colour.map(_=>Math.max(0,Math.min(255,_))):[255,172,96];return[{id:Qe(x.id,`light-${p+1}`),at:[x.at[0],x.at[1]],below:Se(x.below,.9),colour:m,intensity:Math.max(0,Se(x.intensity,1)),flicker:Math.max(0,Math.min(.5,Se(x.flicker,.05))),flickerHz:Math.max(.5,Se(x.flickerHz,7)),pool:Qs(x.pool)&&x.pool>0?x.pool:0,shadow:x.shadow===!0}]}),o=(Array.isArray(e.occluders)?e.occluders:[]).flatMap((x,p)=>{let m=Wu(x?.poly,`occluders[${p}].poly`,t,3);return m.length<3?[]:[{id:Qe(x.id,`occluder-${p+1}`),poly:m,base:Se(x.base,.86),x:Se(x.x,.5),riser:x.riser!==!1,hideAtMost:Math.max(.05,Math.min(1,Se(x.hideAtMost,Cv)))}]}),a=(Array.isArray(e.zones)?e.zones:[]).flatMap((x,p)=>{let m=Wu(x?.shape,`zones[${p}].shape`,t,3);if(m.length<3)return[];let _=x.floor===void 0?null:Wu(x.floor,`zones[${p}].floor`,t,3),E=Array.isArray(x.tags)?x.tags.filter(S=>typeof S=="string"&&S.trim()).map(S=>S.trim()):[],b=Array.isArray(x.near)?x.near.filter(S=>typeof S=="string"):[],T=Array.isArray(x.colour)&&x.colour.length===3&&x.colour.every(Qs)?x.colour.map(S=>Math.max(0,Math.min(255,S))):null;return[{id:Qe(x.id),kind:Qe(x.kind,"trigger")||"trigger",name:Qe(x.name),hint:Qe(x.hint),shape:m,floor:_&&_.length>=3?_:null,quiet:x.quiet===!0,gate:["open","ask","locked","hidden"].includes(x.gate)?x.gate:"open",to:Qe(x.to),tags:E,near:b,colour:T}]}),l=$p(a,"zones",t);for(let x of l)for(let p of x.near)l.some(m=>m.id===p)||t.push(`zones: "${x.id}" is near "${p}", which is not in this scene`);let c=(Array.isArray(e.marks)?e.marks:[]).flatMap((x,p)=>{if(!Js(x?.at))return t.push(`marks[${p}].at: not a point on the painting`),[];let m=x.faces&&typeof x.faces=="object"?Js(x.faces.point)?{point:[x.faces.point[0],x.faces.point[1]]}:Qe(x.faces.zone)?{zone:Qe(x.faces.zone)}:Qe(x.faces.card)?{card:Qe(x.faces.card)}:null:null;return[{id:Qe(x.id),at:[x.at[0],x.at[1]],yaw:Se(x.yaw,0),lean:Se(x.lean,0),pitch:Se(x.pitch,0),lift:Math.max(0,Se(x.lift,0)),capacity:Math.max(1,Math.round(Se(x.capacity,1))),label:Qe(x.label),group:Qe(x.group),zone:Qe(x.zone),faces:m}]}),h=$p(c,"marks",t);for(let x of h)x.zone&&!l.some(p=>p.id===x.zone)&&t.push(`marks: "${x.id}" belongs to zone "${x.zone}", which is not in this scene`);for(let x of h)x.faces?.zone&&!l.some(p=>p.id===x.faces.zone)&&t.push(`marks: "${x.id}" faces zone "${x.faces.zone}", which is not in this scene`);let u=Ao.includes(e.chalk?.mode)?e.chalk.mode:"off";e.chalk?.mode!==void 0&&!Ao.includes(e.chalk.mode)&&t.push(`chalk.mode: "${e.chalk.mode}" is not one of ${Ao.join(", ")}`);let d={mode:u,lock:e.chalk?.lock===!0,weather:e.chalk?.weather===!0,box:Js(e.chalk?.box)?[e.chalk.box[0],e.chalk.box[1]]:null};d.mode==="zones"&&!l.some(x=>x.kind==="chalk")&&t.push("chalk: the mode is zones but the scene has no zone of kind chalk");let f={version:1,painting:n,rig:s,skin:Qe(e.skin),cardScale:Math.max(.2,Math.min(2,Se(e.cardScale,.7))),ambient:Math.max(0,Se(e.ambient,1.7)),lights:r,occluders:o,zones:l,marks:h,chalk:d,marksOnly:e.marksOnly===!0,grade:Math.max(0,Math.min(1.5,Se(e.grade,1))),footlights:e.footlights===!0,focus:Js(e.focus)?[e.focus[0],e.focus[1]]:null,board:e.board===!0,reach:{snap:Math.max(40,Se(e.reach?.snap,170)),show:Math.max(200,Se(e.reach?.show,700))}},g=!!(n.src&&n.size&&s.horizon!==null&&s.floorFront!==null&&s.depth!==null);return{ok:t.length===0,usable:g,scene:f,problems:t}}var Z="stagecraft",Co=i=>i?.flags?.[Z]?.stage??null,er=i=>!!Co(i)&&typeof Co(i)=="object",ni=i=>Array.isArray(i?.flags?.[Z]?.published?.cards)?i.flags[Z].published.cards:[];function nr(i){let t=tr(Co(i));return t.usable&&t.scene.painting.src&&globalThis.foundry?.utils?.getRoute&&(t.scene.painting.src=foundry.utils.getRoute(t.scene.painting.src)),t}function Ro(i){let t=globalThis.foundry?.utils?.getRoute??(e=>e);return ni(i).filter(e=>e&&typeof e.id=="string").map(e=>({...e,portrait:e.portrait?t(e.portrait):e.portrait}))}function kn(){if(!game.user?.isGM)return!1;let i=game.users?.activeGM;return i?i.id===game.user.id:!0}var ir=i=>i?.flags?.[Z]?.live?.handsOff===!0;function sr(i,t,{handsOff:e=!1}={}){return t?.isGM?!0:e?!1:!Array.isArray(i?.owners)||i.owners.length===0?!0:i.owners.includes(t?.id)}var Gi=Object.freeze({ignore:30,take:90,least:30,fineMs:20,slowRatio:1.4,veryRatio:2.2,display:16.666666666666668,patience:12e3,settle:4e3,again:45e3,keepHours:12}),rr=Object.freeze(["high","low","flat"]),Rv=i=>rr[rr.indexOf(i)+1]??null,qp=(i,t)=>rr.indexOf(i)>=rr.indexOf(t)?i:t,Pv=i=>i.length?i[Math.floor(i.length/2)]:0,kv=Object.freeze([30,60,72,75,90,100,120,144,165,240]);function Yp(i,t=Gi){let e=(i??[]).filter(r=>Number.isFinite(r)&&r>0).sort((r,o)=>r-o);if(e.length<8)return t.display;let n=e[Math.floor(e.length*.2)];if(n<1e3/244||n>1e3/28)return t.display;let s=kv.find(r=>1e3/r<=n*1.05);return s?1e3/s:t.display}function jp(i,t=Date.now(),e=Gi){return Number.isFinite(i)&&t-i>=0&&t-i<e.keepHours*3600*1e3}var nl=class{constructor(t=Gi){this.limits=t,this.seen=0,this.gaps=[],this.began=null,this.previous=null}push(t){this.began??=t,this.elapsed=t-this.began;let e=this.previous===null?null:t-this.previous;this.previous=t,!(e===null||++this.seen<=this.limits.ignore)&&Number.isFinite(e)&&e>=0&&this.gaps.length<this.limits.take&&this.gaps.push(e)}get done(){return this.gaps.length>=this.limits.take||(this.elapsed??0)>=this.limits.patience}result(){let t=[...this.gaps].sort((e,n)=>e-n);return{n:t.length,median:Pv(t),p90:t.length?t[Math.min(t.length-1,Math.floor(t.length*.9))]:0}}};function Kp(i,{limits:t=Gi,display:e=null,cap:n=60,patient:s=!1}={}){if(i.n<t.least)return s&&i.n>=8?"very-slow":"unknown";if(i.median<=t.fineMs)return"ok";let r=Number.isFinite(n)&&n>0?Math.min(n,60):60,o=Math.max(1e3/r,e??t.display),a=i.median/o;return a>t.veryRatio?"very-slow":a>t.slowRatio?"slow":"ok"}function Jp({tier:i,verdict:t,strikes:e=0,hard:n=0}){if(i==="flat"||i==null)return{to:null,strikes:0,hard:0};if(t==="ok")return{to:null,strikes:0,hard:0};if(t!=="slow"&&t!=="very-slow")return{to:null,strikes:e,hard:n};let s=e+1,r=n+(t==="very-slow"?1:0);return s<2?{to:null,strikes:s,hard:r}:{to:r>=2?"flat":Rv(i),strikes:0,hard:0}}var _s=Object.freeze({cap:60,idle:30,wake:1500,walking:.5,still:.02,early:1.5});function Qp({fps:i,mode:t=null,max:e=null}={}){let n=Number.isFinite(Number(i))&&Number(i)>0?Number(i):_s.cap;return e!==null&&t===e&&n>=60?1/0:Math.max(10,Math.min(60,n))}var il=class{constructor({cap:t=_s.cap,idle:e=_s.idle,wake:n=_s.wake,easing:s=!0}={}){this.cap=t,this.idle=e,this.wake=n,this.easing=s,this.awakeUntil=-1/0,this.next=-1/0}poke(t){this.awakeUntil=Math.max(this.awakeUntil,t+this.wake)}active(t){return!this.easing||t<this.awakeUntil}gap(t){let e=this.active(t)?this.cap:Math.min(this.cap,this.idle);return e===1/0?0:1e3/e}due(t){return t>=this.next-_s.early}drew(t){let e=this.gap(t);if(!e){this.next=t;return}this.next=this.next+e<t-e?t:this.next+e}scale(t){let e=this.cap===1/0?0:1e3/this.cap,n=this.gap(t);return e&&n?e/n:1}};function tm(i){let t=new Float32Array(i.length*4),e=0;for(let n of i)t[e++]=n.x??0,t[e++]=n.z??0,t[e++]=n.grip??0,t[e++]=n.down??0;return t}function em(i,t,{walking:e=_s.walking,still:n=_s.still}={}){if(!i||i.length!==t.length)return i!=null;for(let s=0;s<t.length;s++){let r=s&2?n:e;if(Math.abs(t[s]-i[s])>r)return!0}return!1}function nm({tier:i,webgl:t,failed:e=!1,software:n=!1}){return i==="flat"||!t||e||n?"flat":"three"}var Iv=/swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i,Lv=i=>Iv.test(String(i??"")),Xu=null;function Vi(i=globalThis.document){if(Xu!==null)return Xu;let t={ok:!1,renderer:""};try{let e=i.createElement("canvas"),n=e.getContext("webgl2")??e.getContext("webgl");if(n){let s=n.getExtension?.("WEBGL_debug_renderer_info");t={ok:!0,renderer:String((s?n.getParameter?.(s.UNMASKED_RENDERER_WEBGL):n.getParameter?.(n.RENDERER))??"")},n.getExtension?.("WEBGL_lose_context")?.loseContext()}}catch{t={ok:!1,renderer:""}}return Xu=t,t}var im=i=>Vi(i).ok,sm=i=>{let t=Vi(i);return t.ok&&Lv(t.renderer)};var $u="stagecraft.speed",rm=()=>Vi().renderer||"unknown";function Zu({now:i=Date.now(),limits:t={...Gi,...globalThis.__stagecraftSpeed??{}}}={}){try{let e=JSON.parse(globalThis.localStorage?.getItem($u)??"null");return!e||e.gpu!==rm()||e.tier&&!rr.includes(e.tier)||e.tier&&!jp(e.at,i,t)?null:{ok:e.ok===!0,tier:e.tier??null,at:e.at??null}}catch{return null}}function qu({ok:i=!1,tier:t=null}){try{globalThis.localStorage?.setItem($u,JSON.stringify({gpu:rm(),ok:i,tier:t,at:Date.now()}))}catch{}}function om(){try{globalThis.localStorage?.removeItem($u)}catch{}}var am=()=>Zu()?.tier??null;function lm(){let i=foundry.data.fields;game.settings.register(Z,"tier",{name:"STAGECRAFT.Settings.Tier.Name",hint:"STAGECRAFT.Settings.Tier.Hint",scope:"client",config:!0,requiresReload:!1,type:new i.StringField({required:!0,blank:!1,initial:"auto",choices:{auto:"STAGECRAFT.Settings.Tier.Auto",high:"STAGECRAFT.Settings.Tier.High",low:"STAGECRAFT.Settings.Tier.Low",flat:"STAGECRAFT.Settings.Tier.Flat"}}),onChange:()=>{om(),Hooks.callAll("stagecraft.settingsChanged","tier")}}),game.settings.register(Z,"zones",{name:"STAGECRAFT.Settings.Zones.Name",hint:"STAGECRAFT.Settings.Zones.Hint",scope:"client",config:!0,type:new i.StringField({required:!0,blank:!1,initial:"off",choices:{off:"STAGECRAFT.Settings.Zones.Off",faint:"STAGECRAFT.Settings.Zones.Faint",full:"STAGECRAFT.Settings.Zones.Full"}}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","zones")}),game.settings.register(Z,"power",{name:"STAGECRAFT.Settings.Power.Name",hint:"STAGECRAFT.Settings.Power.Hint",scope:"client",config:!0,type:new i.BooleanField({initial:!0}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","power")}),game.settings.register(Z,"calm",{name:"STAGECRAFT.Settings.Calm.Name",hint:"STAGECRAFT.Settings.Calm.Hint",scope:"client",config:!0,type:new i.BooleanField({initial:!1}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","calm")})}var sl=()=>game.settings.get(Z,"tier");function bs(){let i=game.settings.get(Z,"tier");if(i==="high"||i==="low"||i==="flat")return i;let t=game.settings.get("core","performanceMode"),e=t!==null&&t<=CONST.CANVAS_PERFORMANCE_MODES.LOW?"low":"high";return qp(e,am()??"high")}function or(){return game.settings.get(Z,"calm")||game.settings.get("core","photosensitiveMode")?!0:!!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches}var rl=()=>game.settings.get(Z,"zones"),Yu=()=>game.settings.get(Z,"power")!==!1,cm=()=>Qp({fps:game.settings.get("core","maxFPS"),mode:game.settings.get("core","performanceMode")??null,max:globalThis.CONST?.CANVAS_PERFORMANCE_MODES?.MAX??null});var um=(i,t,e)=>Math.max(t,Math.min(e,i)),Dv=(i,t,e)=>i+(t-i)*e,Nv=Math.PI/180;function dm(i){let t=i>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function Po(i,t=0){let e=Math.floor(i),n=i-e,s=o=>{let a=Math.imul(o+t*7919|0,668265261);return a^=a>>>15,a=Math.imul(a,2246822507),a^=a>>>13,(a>>>0)/4294967296*2-1},r=n*n*(3-2*n);return Dv(s(e),s(e+1),r)}function fm(i,t,e,n,s=.5,r=0,o=.5){let a=Math.max(e/i,n/t),l=(e-i*a)*o,c=(n-t*a)*s-r;return{s:a,ox:l,oy:c,lift:r,x:h=>l+h*i*a,y:h=>c+h*t*a}}function pm(i,t,e){return{f:i.depth*e,cx:t.x(i.vanish??.5),cy:t.y(i.horizon),floorY:t.y(i.floorFront),map:t}}function ju(i,t,e,n){let s=i.f/(i.f-n);return{sx:i.cx+(t-i.cx)*s,sy:i.cy+(e-i.cy)*s,k:s}}function Ov(i,t,e){let n=(e-i.cy)/(i.floorY-i.cy);if(n<=0)return null;let s=i.f-i.f/n;return{x:i.cx+(t-i.cx)/n,z:s}}function mm(i,t,e){return Ov(i,i.map.x(t),i.map.y(e))}function wn(i,t,e,n){return Math.atan2(e-i,n-t)/Nv}function Sn(i,{share:t=.62,max:e=52}={}){let n=(i+540)%360-180;return Math.abs(n)>90&&(n=Math.sign(n)*(180-Math.abs(n))*.5+Math.sign(n)*35),um(n*t,-e,e)}function gm(i,t,e,{gap:n=380,spread:s=150,depthStep:r=60}={}){let o=[];return t.forEach((a,l)=>{let c=i.x-n/2-l*s*.7,h=i.z-l*r;o.push({x:c,z:h,yaw:Sn(wn(c,h,i.x+n/2,i.z),{share:.75,max:48}),lean:0,pitch:-3})}),e.forEach((a,l)=>{let c=i.x+n/2+l*s*.7,h=i.z-l*r;o.push({x:c,z:h,yaw:Sn(wn(c,h,i.x-n/2,i.z),{share:.75,max:48}),lean:0,pitch:-3})}),o}var hm=Object.freeze({calm:{breathe:.006,breatheHz:.22,sway:.5,swayHz:.09,fidget:0,pitch:0,lean:0,glance:.7},nervous:{breathe:.01,breatheHz:.45,sway:1.1,swayHz:.6,fidget:.25,pitch:2,lean:0,glance:1.2,jitter:.6},proud:{breathe:.007,breatheHz:.18,sway:.3,swayHz:.07,fidget:0,pitch:-4,lean:0,glance:.4},slouch:{breathe:.008,breatheHz:.15,sway:.9,swayHz:.06,fidget:.05,pitch:3,lean:4,glance:.3},bouncy:{breathe:.009,breatheHz:.5,sway:.8,swayHz:.35,fidget:.4,pitch:0,lean:0,glance:1,hop:6},sly:{breathe:.006,breatheHz:.2,sway:.6,swayHz:.12,fidget:.1,pitch:4,lean:-3,glance:1.4}});function xm(i,t,e="calm",{speakerYaw:n=null}={}){let s=hm[e]??hm.calm,r=t%1e3/1e3,o=1+s.breathe*Math.sin(2*Math.PI*(i*s.breatheHz+r)),a=s.lean+s.sway*Po(i*s.swayHz*4+r*10,t),l=0;if(s.jitter&&(a+=s.jitter*Po(i*9+r*31,t+3)*.6),s.fidget){let h=Math.floor(i*s.fidget+r*7),u=i*s.fidget+r*7-h,d=Math.abs(Po(h*1.7,t+11));if(d>.55&&u<.18){let f=Math.sin(u/.18*Math.PI);l+=(s.hop??3)*f,a+=2.5*f*(d>.8?1:-1)}}let c=n===null?0:um(n,-1,1)*6*s.glance;return{breathe:o,lean:a,pitch:s.pitch,lift:l,yaw:c}}var OE=Object.freeze({dust:{rate:26,life:[5,9],size:[1.2,2.8],vy:[-6,6],vx:[-8,8],vz:[-6,6],gravity:0,drag:.4,glow:!0},smoke:{rate:5,life:[5,8],size:[26,46],vy:[-26,-14],vx:[-6,6],vz:[-4,4],gravity:0,drag:.2,grow:9,soft:!0},steam:{rate:9,life:[3.5,6],size:[30,56],vy:[-34,-18],vx:[-8,8],vz:[-6,6],gravity:0,drag:.2,grow:14,soft:!0},sparks:{rate:60,life:[.5,1.1],size:[1.6,3],vy:[-260,-90],vx:[-140,140],vz:[-60,60],gravity:520,drag:.1,glow:!0,bounce:.35,streak:!0},petals:{rate:3,life:[9,14],size:[5,8],vy:[10,22],vx:[-22,4],vz:[-6,6],gravity:0,drag:.1,settle:!0,spin:!0},snow:{rate:30,life:[18,26],size:[1.6,3.6],vy:[50,80],vx:[-10,10],vz:[-10,10],gravity:0,drag:.1,settle:!0},rain:{rate:240,life:[.9,1.3],size:[1,1.6],vy:[900,1200],vx:[-90,-60],vz:[0,0],gravity:0,drag:0,streak:!0,splash:!0}});var ym=(i,t,e)=>Math.max(t,Math.min(e,i)),Ku=Object.freeze({follow:42,stiffness:150,damping:9,lag:.5,maxLean:15,jostleK:110,jostleC:11,bumpSpin:.009,bonkSpeed:120,shove:.35,maxJolt:70,growK:220,growC:22,parked:.5,held:1,hopTime:.42,hopHeight:74,nodTime:.34,bowTime:.95,shakeTime:.62});function vm({id:i,x:t,y:e,scale:n=1,home:s="stage",owner:r=null,rod:o=112,w:a=230,h:l=393}){return{id:i,owner:r,home:s,rod:o,w:a,h:l,x:t,y:e,vx:0,vy:0,ax:0,restX:t,restY:e,lean:0,leanV:0,jx:0,jv:0,scale:n,scaleV:0,scaleTo:n,turn:0,turnV:0,turnTo:0,heldBy:null,target:null,verbs:[]}}var Fv=Object.freeze(["hop","nod","bow","shake","turn"]);function Ju(i,t){return t==="turn"?(i.turnTo=i.turnTo?0:180,i):(Fv.includes(t)&&i.verbs.push({verb:t,t:0}),i)}function _m(i,t,e=Ku){let n=i.target?i.target.x:i.restX,s=i.target?i.target.y:i.restY,r=e.follow,o=r*r*(n-i.x)-2*r*i.vx,a=r*r*(s-i.y)-2*r*i.vy;i.vx+=o*t,i.vy+=a*t,i.x+=i.vx*t,i.y+=i.vy*t,i.ax=o;let l=-e.stiffness*i.lean-e.damping*i.leanV-e.lag*e.stiffness/1e3*o;i.leanV+=l*t,i.lean+=i.leanV*t,i.lean=ym(i.lean,-e.maxLean*1.6,e.maxLean*1.6);let c=-e.jostleK*i.jx-e.jostleC*i.jv;i.jv+=c*t,i.jx+=i.jv*t;let h=e.growK*(i.scaleTo-i.scale)-e.growC*i.scaleV;i.scaleV+=h*t,i.scale+=i.scaleV*t;let u=160*(i.turnTo-i.turn)-18*i.turnV;i.turnV+=u*t,i.turn+=i.turnV*t;for(let d of i.verbs)d.t+=t;return i.verbs=i.verbs.filter(d=>d.t<bm(d.verb,e)),i}function bm(i,t){return i==="hop"?t.hopTime:i==="nod"?t.nodTime:i==="bow"?t.bowTime:t.shakeTime}function Mm(i,t=Ku){let e=0,n=1,s=0,r=0,o=0;for(let a of i.verbs){let l=a.t/bm(a.verb,t);a.verb==="hop"?(e+=4*t.hopHeight*l*(1-l),l<.12&&(n*=1-.1*Math.sin(l/.12*Math.PI)),l>.86&&(n*=1-.12*Math.sin((l-.86)/.14*Math.PI))):a.verb==="nod"?(o+=12*Math.sin(l*Math.PI),n*=1-.04*Math.sin(l*Math.PI)):a.verb==="bow"?s+=34*Math.sin(Math.min(1,l*1.6)*Math.PI*.5)*(l<.62?1:Math.max(0,(1-l)/.38)):a.verb==="shake"&&(r+=18*Math.exp(-3.2*l)*Math.sin(l*4*2*Math.PI))}return{lift:e,squash:n,tipX:s,shakeY:r,dip:o}}function ko(i){let t=i.scale,e=i.x+i.jx-i.w*t/2,n=i.y-i.rod*t;return{left:e,right:e+i.w*t,top:n-i.h*t,bottom:n}}function wm(i,t=new Set,e=Ku){let n=[],s=new Set,r=o=>ym(o,-e.maxJolt,e.maxJolt);for(let o=0;o<i.length;o++)for(let a=o+1;a<i.length;a++){let l=i[o],c=i[a];if(!l.heldBy&&!c.heldBy||l.home==="wings"||c.home==="wings")continue;let h=ko(l),u=ko(c),d=Math.min(h.right,u.right)-Math.max(h.left,u.left),f=Math.min(h.bottom,u.bottom)-Math.max(h.top,u.top);if(d<=0||f<=0)continue;let g=(h.left+h.right)/2<(u.left+u.right)/2?1:-1,x=l.heldBy&&!c.heldBy?.15:!l.heldBy&&c.heldBy?.85:.5,p=1-x,m=`${l.id}|${c.id}`;if(s.add(m),l.heldBy&&c.heldBy&&(l.jx=r(l.jx-g*d*e.shove),c.jx=r(c.jx+g*d*e.shove)),t.has(m))continue;let _=Math.abs(l.vx-c.vx);_<e.bonkSpeed||(l.jv-=g*_*.3*x,c.jv+=g*_*.3*p,l.leanV-=g*_*e.bumpSpin*6,c.leanV+=g*_*e.bumpSpin*14*p,n.push({a:l.id,b:c.id,x:g>0?h.right-d/2:h.left+d/2,y:Math.max(h.top,u.top)+f*.3,speed:_}))}for(let o of i)o.jx=r(o.jx);t.clear();for(let o of s)t.add(o);return n}function Sm(i,t,e,n,s=33){return i?n-i.t<s?!1:Math.abs(t-i.x)+Math.abs(e-i.y)>.75:!0}var ol=class{constructor({delay:t=100,max:e=32}={}){this.delay=t,this.max=e,this.samples=[]}push(t){this.samples.push(t),this.samples.sort((e,n)=>e.t-n.t),this.samples.length>this.max&&this.samples.shift()}at(t){let e=this.samples;if(!e.length)return null;let n=t-this.delay;if(n<=e[0].t)return{x:e[0].x,y:e[0].y};for(let l=1;l<e.length;l++)if(e[l].t>=n){let c=e[l-1],h=e[l],u=(n-c.t)/Math.max(1,h.t-c.t);return{x:c.x+(h.x-c.x)*u,y:c.y+(h.y-c.y)*u}}let s=e[e.length-1],r=e[e.length-2]??s,o=Math.min(n-s.t,80),a=Math.max(1,s.t-r.t);return{x:s.x+(s.x-r.x)/a*o,y:s.y+(s.y-r.y)/a*o}}};function Tm(i,t){return i?t?i.t!==t.t?i.t<t.t?i:t:i.user<t.user?i:t:i:t}var Hn=Object.freeze({W:2560,H:1440}),ii=12e3,Io=-(ii-1500);function ar(i,t,e=Hn){let[n,s]=i.size,r=fm(n,s,e.W,e.H,.5,t.lift??0,.5),o=pm(t,r,e.W),a=(c,h)=>[(c-r.ox)/(n*r.s),(h-r.oy)/(s*r.s)],l=c=>{let h=mm(o,c[0],c[1]);return h?{X:h.x-o.cx,Z:h.z}:null};return{ref:e,map:r,cam:o,size:[n,s],standing:l,place(c){let h=l(c);return!h||h.Z>=Io?h:{X:h.X*(o.f-Io)/(o.f-h.Z),Z:Io}},fractionOf(c,h){let u=ju(o,c+o.cx,o.floorY,h);return a(u.sx,u.sy)},screenOf(c,h,u){let d=ju(o,c+o.cx,o.floorY-h,u);return{x:d.sx,y:d.sy,k:d.k}},fractionOfScreen:a}}var Uv=.5;function al(i,t,{ease:e=Uv,most:n=2.2}={}){if(!(t<0))return 1;let s=i.f/(i.f-t);return Math.min(n,Math.max(1,s**-e))}function Lo(i,t,e=Hn){let n=Math.max(i/e.W,t/e.H),s=i/n,r=t/n;return{vw:i,vh:t,s:n,ox:(e.W-s)/2,oy:(e.H-r)/2,visW:s,visH:r}}var Do=Object.freeze({rest:"rest",near:"near",target:"target"}),Em=Object.freeze({faint:.2,off:0,full:1});function vi(i,t,e){let n=!1;for(let s=0,r=i.length-1;s<i.length;r=s++){let[o,a]=i[s],[l,c]=i[r];a>e!=c>e&&t<(l-o)*(e-a)/(c-a)+o&&(n=!n)}return n}function Qu(i,t,e){let n=1/0;for(let s=0,r=i.length-1;s<i.length;r=s++){let[o,a]=i[r],[l,c]=i[s],h=l-o,u=c-a,d=h*h+u*u,f=d===0?0:Math.max(0,Math.min(1,((t-o)*h+(e-a)*u)/d));n=Math.min(n,Math.hypot(t-(o+f*h),e-(a+f*u)))}return n}function td(i){let t=0,e=0;for(let[n,s]of i)t+=n,e+=s;return[t/i.length,e/i.length]}var No=i=>i.floor&&i.floor.length>=3?i.floor:i.shape;function lr(i,t,e){return i.filter(n=>vi(No(n),t,e))}function Am(i,t,e=.1){let n={};for(let s of i){let r=Do.rest,o=No(s);for(let a of t){if(vi(o,a.x,a.y)){r=Do.target;break}Qu(o,a.x,a.y)<=e&&(r=Do.near)}n[s.id]=r}return n}function ed(i,t,e="faint"){return t===Do.target?1:t===Do.near?.85:i.quiet||i.kind==="chalk"?0:Em[e]??Em.faint}function Bv(i,t){let e=No(i),n=No(t);if(e.some(([r,o])=>vi(n,r,o))||n.some(([r,o])=>vi(e,r,o)))return 0;let s=1/0;for(let[r,o]of e)s=Math.min(s,Qu(n,r,o));for(let[r,o]of n)s=Math.min(s,Qu(e,r,o));return s}function Cm(i,{touch:t=.035}={}){let e=i.filter(a=>a.kind==="area"),n=new Set(e.map(a=>a.id)),s=new Map,r=(a,l)=>{if(a===l||!n.has(a)||!n.has(l))return;let[c,h]=a<l?[a,l]:[l,a];s.set(`${c}|${h}`,{a:c,b:h})};if(e.some(a=>Array.isArray(a.near)&&a.near.length))for(let a of e)for(let l of a.near??[])r(a.id,l);else for(let a=0;a<e.length;a++)for(let l=a+1;l<e.length;l++)Bv(e[a],e[l])<=t&&r(e[a].id,e[l].id);return[...s.values()].sort((a,l)=>a.a+a.b<l.a+l.b?-1:1)}function nd(i,t,{w:e=180,deep:n=160,most:s=24}={}){let r=No(i),o=r.map(x=>t.standing(x)).filter(Boolean);if(o.length<3)return[];let a=o.map(x=>x.X),l=o.map(x=>x.Z),[c,h,u,d]=[Math.min(...a),Math.max(...a),Math.max(Io,Math.min(...l)),Math.max(...l)],f=t.standing(td(r))??{X:(c+h)/2,Z:(u+d)/2},g=[];for(let x=d-n/2;x>=u;x-=n)for(let p=c+e/2;p<=h;p+=e){let m=t.fractionOf(p,x);vi(r,m[0],m[1])&&g.push({X:p,Z:x})}return g.sort((x,p)=>Math.hypot(x.X-f.X,(x.Z-f.Z)*.8)-Math.hypot(p.X-f.X,(p.Z-f.Z)*.8)),g.slice(0,s)}function Rm(i,t){let e=[];for(let[n,s]of t){let r=i.get(n)??new Set;for(let o of s)r.has(o)||e.push({type:"zone",card:n,zone:o,entered:!0})}for(let[n,s]of i){let r=t.get(n)??new Set;for(let o of s)r.has(o)||e.push({type:"zone",card:n,zone:o,entered:!1})}return e}function Pm(i,t){let e=[],n=[];for(let s of i){let r=(t.place??t.standing)(s.at);if(!r){n.push(s.id);continue}e.push({...s,X:r.X,Z:r.Z})}return{marks:e,dropped:n}}function km(i,t){return i.filter(e=>(t.get(e.id)?.size??0)<e.capacity)}function id(i,t,e){return Math.hypot(i-e.X,(t-e.Z)*.75)}function sd(i,t,e,n,s){let r=null,o=1/0;for(let a of km(i,t)){let l=id(e,n,a);l<o&&l<=s&&(r=a,o=l)}return r}function Im(i,t,e,n,{show:s=700,snap:r=170,max:o=5}={}){let a=km(i,t).map(c=>({mark:c,d:id(e,n,c)})).filter(c=>c.d<=s).sort((c,h)=>c.d-h.d).slice(0,o),l=a.length&&a[0].d<=r?a[0].mark.id:null;return a.map(c=>{let h=1-Math.min(1,Math.max(0,(c.d-r)/(s-r))),u=c.mark.id===l?1:.18+.5*h*h;return{id:c.mark.id,mark:c.mark,distance:c.d,alpha:u,target:c.mark.id===l}})}function ll(i,t={}){let e=i.yaw,n=i.faces;if(n){let s=null;if(n.point&&t.pointOnFloor)s=t.pointOnFloor(n.point);else if(n.zone&&t.zones&&t.pointOnFloor){let r=t.zones.find(o=>o.id===n.zone);r&&(s=t.pointOnFloor(td(r.shape)))}else n.card&&t.cardAt&&(s=t.cardAt(n.card));s&&(e=Sn(wn(i.X,i.Z,s.X,s.Z)))}return{yaw:e,lean:i.lean,pitch:i.pitch,lift:i.lift}}function cl(i,t){let e=new Map,n=[],s=new Set(t.map(o=>o.id)),r=new Map(t.map(o=>[o.id,o]));for(;;){let o=null;for(let a of s){let l=r.get(a);for(let c of i){if((e.get(c.id)??0)>=c.capacity)continue;let h=id(l.X,l.Z,c);(!o||h<o.d)&&(o={d:h,c:l,m:c})}}if(!o)break;e.set(o.m.id,(e.get(o.m.id)??0)+1),s.delete(o.c.id),n.push({card:o.c.id,mark:o.m.id})}return n}var Lm=(i,t,e)=>Math.max(t,Math.min(e,i)),Ms=Object.freeze({walk:{speed:520,stride:110,height:12,rock:3.5,turn:.7},stroll:{speed:300,stride:90,height:8,rock:2.6,turn:.6},hurry:{speed:880,stride:135,height:15,rock:5,turn:.8},march:{speed:600,stride:120,height:10,rock:1.2,turn:.5},sneak:{speed:230,stride:70,height:4,rock:1.5,turn:.75},scurry:{speed:1150,stride:42,height:5,rock:7,turn:.9},hop:{speed:640,stride:170,height:48,rock:2,turn:.6},glide:{speed:380,stride:0,height:0,rock:0,turn:.4}}),Dm=Object.freeze(Object.keys(Ms)),Oo=(i,t)=>Math.hypot(t.X-i.X,(t.Z-i.Z)*.8);function ws(i,t,{t0:e=0,gait:n="walk",yaw:s=null,pace:r=1,minDur:o=.3,maxDur:a=6}={}){let l=Ms[n]?n:"walk",c=Ms[l],h=Oo(i,t),u=Lm(h/(c.speed*Math.max(.1,r)),o,a),d=c.stride>0&&h>c.stride*.6?Math.max(1,Math.round(h/c.stride)):0;return{from:{X:i.X,Z:i.Z},to:{X:t.X,Z:t.Z},t0:e,dur:u,gait:l,steps:d,yaw:s??null,dist:h}}function zv(i){if(i<=0)return 0;if(i>=1)return 1;let e=1/(1-.18);return i<.18?e*i*i/(2*.18):i>1-.18?1-e*(1-i)*(1-i)/(2*.18):e*(i-.18/2)}function Fo(i,t){let e=i.dur>0?Lm((t-i.t0)/i.dur,0,1):1,n=zv(e),s=i.from.X+(i.to.X-i.from.X)*n,r=i.from.Z+(i.to.Z-i.from.Z)*n,o=Ms[i.gait]??Ms.walk,a=0,l=0;if(i.steps>0&&e>0&&e<1){let d=n*i.steps%1,f=Math.min(1,e*6,(1-e)*6);a=o.height*Math.sin(d*Math.PI)*f,l=o.rock*Math.sin(d*Math.PI*2)*f*Math.sign(i.to.X-i.from.X||1)}let c=e>0&&e<.86&&i.dist>30,h=Sn(wn(i.from.X,i.from.Z,i.to.X,i.to.Z),{share:o.turn,max:40}),u=e<=0?null:c||i.yaw===null?h:i.yaw;return{X:s,Z:r,lift:a,rock:l,yaw:u,u:e,moving:e>0&&e<1,done:e>=1}}function Nm(i,t,e){return i==="left"?{X:e.x[0]-160,Z:t.Z}:i==="right"?{X:e.x[1]+160,Z:t.Z}:i==="back"?{X:t.X*.6,Z:e.z[0]}:{X:t.X,Z:t.Z}}var od=Object.freeze(["still","wander","visit","patrol","pace","swarm"]),Hv=Object.freeze({wander:{every:11,restless:.55,radius:.05,gait:"stroll"},visit:{every:14,restless:.75,gait:"walk"},patrol:{every:9,restless:1,gait:"march"},pace:{every:5,restless:.85,width:.05,gait:"walk"},swarm:{every:2.6,restless:.8,radius:.035,gait:"scurry"}}),Wi=i=>typeof i=="number"&&Number.isFinite(i),rd=i=>Array.isArray(i)&&i.length===2&&Wi(i[0])&&Wi(i[1]);function ad(i){if(!i||typeof i!="object"||!od.includes(i.kind)||i.kind==="still")return null;let t=Hv[i.kind],e={kind:i.kind,every:Math.max(1.5,Wi(i.every)?i.every:t.every),restless:Math.max(0,Math.min(1,Wi(i.restless)?i.restless:t.restless)),gait:Ms[i.gait]?i.gait:t.gait,radius:Math.max(.005,Math.min(.3,Wi(i.radius)?i.radius:t.radius??.05)),width:Math.max(.01,Math.min(.4,Wi(i.width)?i.width:t.width??.05)),spots:Array.isArray(i.spots)?i.spots.filter(rd).map(n=>[n[0],n[1]]):[],marks:Array.isArray(i.marks)?i.marks.filter(n=>typeof n=="string"):[],path:Array.isArray(i.path)?i.path.filter(rd).map(n=>[n[0],n[1]]):[],loop:i.loop===!0,faces:rd(i.faces)?[i.faces[0],i.faces[1]]:null,facesCard:typeof i.faces=="string"&&i.faces?i.faces:null,gestures:Array.isArray(i.gestures)?i.gestures.filter(n=>["hop","nod","bow","shake"].includes(n)):[],gestureChance:Math.max(0,Math.min(1,Wi(i.gestureChance)?i.gestureChance:.35)),yaw:Wi(i.yaw)?i.yaw:null};return e.kind==="visit"&&e.spots.length+e.marks.length===0||e.kind==="patrol"&&e.path.length<2?null:e}function ld(i,{home:t,rig:e,marks:n=[],seed:s=1}){if(!i)return null;let r=h=>(e.place??e.standing)(h),o=e.fractionOf(t.X,t.Z),a=h=>{let u=e.standing([o[0]-h/2,o[1]]),d=e.standing([o[0]+h/2,o[1]]);return u&&d?Math.abs(d.X-u.X):120},l=i.faces?r(i.faces):null,c={...i,home:{X:t.X,Z:t.Z},seed:s,places:[],faceAt:l};if(i.kind==="visit"){let h=i.marks.map(d=>n.find(f=>f.id===d)).filter(Boolean).map(d=>({X:d.X,Z:d.Z,yaw:d.yaw??null})),u=i.spots.map(r).filter(Boolean).map(d=>({X:d.X,Z:d.Z,yaw:null}));if(c.places=[{X:t.X,Z:t.Z,yaw:null},...h,...u],c.places.length<2)return null}else if(i.kind==="patrol"){if(c.places=i.path.map(r).filter(Boolean).map(h=>({X:h.X,Z:h.Z,yaw:null})),c.places.length<2)return null}else i.kind==="pace"?c.reach=a(i.width):c.reach=a(i.radius);return c}function In(i,t,e=0){return dm((i*2654435761^t*97+e*7919)>>>0)()}var Gv=16;function Om(i,t){if(t<=0)return{X:i.home.X,Z:i.home.Z,yaw:i.yaw};if(i.kind==="patrol"){let r=i.places.length,o=i.loop?t%r:Vv(t,r);return{...i.places[o],yaw:i.places[o].yaw??null}}let e=t;for(let r=0;e>0&&In(i.seed,e,1)>=i.restless;r++){if(r>=Gv)return{X:i.home.X,Z:i.home.Z,yaw:i.yaw};e--}if(e<=0)return{X:i.home.X,Z:i.home.Z,yaw:i.yaw};if(i.kind==="visit"){let r=Math.floor(In(i.seed,e,2)*i.places.length);return{...i.places[r],yaw:i.places[r].yaw??null}}if(i.kind==="pace"){let r=(e%2===0?-1:1)*(.35+.15*In(i.seed,e,3));return{X:i.home.X+r*i.reach,Z:i.home.Z+(In(i.seed,e,4)-.5)*i.reach*.2,yaw:null}}let n=In(i.seed,e,5)*Math.PI*2,s=Math.sqrt(In(i.seed,e,6))*i.reach/2;return{X:i.home.X+Math.cos(n)*s,Z:i.home.Z+Math.sin(n)*s*.7,yaw:null}}function Vv(i,t){let e=2*(t-1),n=i%e;return n<t?n:e-n}function Wv(i,t){return i.every*(.1+.4*In(i.seed,t,8))}function Fm(i,t){if(!i.gestures?.length)return null;let e=In(i.seed,0,9)*i.every,n=Math.floor((t+e)/i.every);if(In(i.seed,n,12)>=i.gestureChance)return null;let s=i.gestures[Math.floor(In(i.seed,n,13)*i.gestures.length)],r=n*i.every-e+i.every*(.93+.05*In(i.seed,n,14));return{beat:n,at:r,verb:s}}function hl(i,t){let e=In(i.seed,0,9)*i.every,n=t+e,s=Math.floor(n/i.every),r=n-s*i.every,o=Om(i,s-1),a=Om(i,s),l=d=>i.faceAt?Sn(wn(d.X,d.Z,i.faceAt.X,i.faceAt.Z),{share:.7,max:50}):d.yaw??null;if(Math.abs(a.X-o.X)+Math.abs(a.Z-o.Z)<.5)return{X:a.X,Z:a.Z,yaw:l(a),lift:0,rock:0,moving:!1};let c=Wv(i,s),h=ws(o,a,{t0:c,gait:i.gait,yaw:l(a),maxDur:Math.max(.4,(i.every-c)*.92)}),u=Fo(h,r);return u.moving?{X:u.X,Z:u.Z,yaw:u.yaw,lift:u.lift,rock:u.rock,moving:!0}:{X:u.X,Z:u.Z,yaw:r<c?l(o):l(a),lift:0,rock:0,moving:!1}}var ul=Object.freeze(["line","huddle","talk","gangup","panel","standoff","circle","queue","scatter","audience","position"]),JE=Math.PI/180,Um=(i,t,e)=>Math.max(t,Math.min(e,i)),cr=i=>Math.round(i*10)/10,Xv=(i,t=180)=>Math.max(t*.5,...i.map(e=>e.w??t)),si=(i,t,e,n,s=.7,r=52)=>Sn(wn(i,t,e,n),{share:s,max:r});function Bm(i,{cards:t=[],focus:e={X:0,Z:-400},target:n=null,speakers:s=[],party:r=!1,limits:o=null,seed:a=1,dir:l="back",radius:c=null}={}){let h=t.filter(f=>r||!f.pc||f.id===n||s.includes(f.id));if(!h.length)return[];let u=Xv(h),d;switch(i){case"huddle":d=Yv(h,e,u,c);break;case"talk":d=jv(h,e,u,s);break;case"gangup":d=Kv(h,e,u,n);break;case"panel":d=Jv(h,e,u);break;case"standoff":d=Qv(h,e,u);break;case"circle":d=t_(h,e,u,c);break;case"queue":d=e_(h,e,u,a,l);break;case"scatter":d=n_(h,e,u,o,a);break;case"audience":d=Zv(h,e,u,o);break;default:d=$v(h,e,u)}return d.map(f=>({id:f.id,X:cr(o?Um(f.X,o.x[0],o.x[1]):f.X),Z:cr(o?Um(f.Z,o.z[0],o.z[1]):f.Z),yaw:cr(f.yaw??0),lean:cr(f.lean??0),pitch:cr(f.pitch??0)}))}var Gn=i=>[...i].sort((t,e)=>t.X-e.X||(t.id<e.id?-1:1));function $v(i,t,e){let n=[],s=[i.filter(o=>!o.pc),i.filter(o=>o.pc)],r=s[0].length?220:0;return s.forEach((o,a)=>{let l=Gn(o),c=e*1.12;l.forEach((h,u)=>n.push({id:h.id,X:t.X+(u-(l.length-1)/2)*c,Z:t.Z+a*r,yaw:0}))}),n}function Zv(i,t,e,n){let s=Gn(i),r=n?n.z[1]:t.Z+600,o=Math.max(t.Z+280,r-Math.max(150,(r-t.Z)*.2)),a=Math.ceil(s.length/2),l=[s.slice(0,a).reverse(),s.slice(a)],c=[];return l.forEach((h,u)=>{let d=u===0?-1:1;h.forEach((f,g)=>{let x=t.X+d*(e*.95+g*e*1.15),p=o-g*45;c.push({id:f.id,X:x,Z:p,yaw:si(x,p,t.X,t.Z,.6,40),pitch:-2})})}),c}var qv=.86;function Yv(i,t,e,n=null){let s=Gn(i),r=s.length,o=Math.max(e*qv*(r-1),(n??0)*2),a=Math.min(260,90+32*r);return s.map((l,c)=>{let h=r>1?(c-(r-1)/2)/((r-1)/2):0,u=t.X+h*o/2,d=t.Z-a*(1-h*h)*.9-40,f=si(u,d,t.X,t.Z+140,.8,50);return{id:l.id,X:u,Z:d,yaw:f,lean:-h*9,pitch:6}})}function jv(i,t,e,n){let s=n.filter(d=>i.some(f=>f.id===d)),r=Gn(i.filter(d=>!s.includes(d.id)));for(;s.length<2&&r.length;)s.push(r.shift().id);let[o,a]=s,l=e*.78,c=[],h={X:t.X-l,Z:t.Z},u={X:t.X+l,Z:t.Z};return o&&c.push({id:o,X:h.X,Z:h.Z,yaw:si(h.X,h.Z,u.X,u.Z,.85,58),lean:2}),a&&c.push({id:a,X:u.X,Z:u.Z,yaw:si(u.X,u.Z,h.X,h.Z,.85,58),lean:-2}),r.forEach((d,f)=>{let g=f%2===0?-1:1,x=Math.floor(f/2)+1,p=t.X+g*(l+e*(.55+x*.95)),m=t.Z-120-x*60;c.push({id:d.id,X:p,Z:m,yaw:si(p,m,t.X,t.Z,.6,40)})}),c}function Kv(i,t,e,n){let s=i.find(l=>l.id===n)??null,r=Gn(i.filter(l=>l!==s)),o=[];s&&o.push({id:s.id,X:t.X,Z:t.Z+60,yaw:0,pitch:3});let a=Math.ceil(r.length/2);return[r.slice(0,a).reverse(),r.slice(a)].forEach((l,c)=>{let h=c===0?-1:1;l.forEach((u,d)=>{let f=t.X+h*e*(.95+d*.95),g=t.Z-90+d*55;o.push({id:u.id,X:f,Z:g,yaw:si(f,g,t.X,t.Z+60,.8,55),lean:-h*7,pitch:5})})}),o}function Jv(i,t,e){let n=Gn(i.filter(o=>!o.pc)),s=n.length,r=n.map((o,a)=>{let l=s>1?(a-(s-1)/2)/((s-1)/2):0,c=t.X+l*((s-1)/2)*e*1.1,h=t.Z-160+90*l*l;return{id:o.id,X:c,Z:h,yaw:cr(-l*14),pitch:-2}});return Gn(i.filter(o=>o.pc)).forEach((o,a,l)=>{let c=t.X+(a-(l.length-1)/2)*e*1.1;r.push({id:o.id,X:c,Z:t.Z+260,yaw:0})}),r}function Qv(i,t,e){let n=Gn(i.filter(o=>!o.pc)),s=Gn(i.filter(o=>o.pc));if(!s.length){let o=Math.ceil(n.length/2);s=n.slice(o),n=n.slice(0,o)}if(!n.length){let o=Math.ceil(s.length/2);n=s.slice(0,o),s=s.slice(o)}let r=gm({x:t.X,z:t.Z},n,s,{gap:e*2.2,spread:e*1.35,depthStep:70});return[...n,...s].map((o,a)=>({id:o.id,X:r[a].x,Z:r[a].z,yaw:r[a].yaw,lean:r[a].lean,pitch:r[a].pitch}))}function t_(i,t,e,n=null){let s=Gn(i),r=s.length,o=Math.max(n??0,e*.75,e*1.02*(r-1)/2);return s.map((a,l)=>{let c=r>1?(l-(r-1)/2)/((r-1)/2):0,h=t.X+c*o,u=t.Z-Math.sqrt(Math.max(0,1-c*c))*o*.7;return{id:a.id,X:h,Z:u,yaw:si(h,u,t.X,t.Z,.75,55)}})}function e_(i,t,e,n,s="back"){let r=s==="left"||s==="right",o=s==="left"?-1:1,a=c=>r?-Math.abs(c.X-t.X):s==="front"?-c.Z:c.Z;return[...i].sort((c,h)=>a(h)-a(c)||(c.id<h.id?-1:1)).map((c,h)=>{let u=Math.sin((h+1)*2.399+n),d,f;r?(d=t.X+o*h*e*1.08,f=t.Z+u*26-h*8):(d=t.X+u*e*.12+h*e*.42,f=t.Z+(s==="front"?1:-1)*h*175);let g=h===0?si(d,f,t.X,t.Z-300,.55,38):si(d,f,t.X,t.Z,.55,38);return{id:c.id,X:d,Z:f,yaw:g,pitch:h===0?0:2}})}function n_(i,t,e,n,s){let r=Gn(i),o=r.length,a=n?[n.x[0]*.7,n.x[1]*.7]:[t.X-e*o*.8,t.X+e*o*.8];return r.map((l,c)=>{let h=o>1?c/(o-1):.5,u=a[0]+(a[1]-a[0])*h,d=t.Z+Math.sin((c+1)*1.7+s)*260;return{id:l.id,X:u,Z:d,yaw:si(u,d,t.X,t.Z,.5,40)}})}function dl(i,{X:t,Z:e,w:n,h:s,lift:r=0}){let o=i.screenOf(t-n/2,r,e),a=i.screenOf(t+n/2,r+s,e);return{x0:o.x,x1:a.x,y0:a.y,y1:o.y}}function i_(i,t,{across:e=12,down:n=20}={}){let s=t.map(o=>({id:o.id,Z:o.Z,...dl(i,o)})),r=new Map;for(let o of s){let a=s.filter(h=>h!==o&&(h.Z>o.Z||h.Z===o.Z&&h.id>o.id)&&h.x0<o.x1&&h.x1>o.x0&&h.y0<o.y1&&h.y1>o.y0),l=0,c=new Set;for(let h=0;h<e;h++)for(let u=0;u<n;u++){let d=o.x0+(h+.5)/e*(o.x1-o.x0),f=o.y0+(u+.5)/n*(o.y1-o.y0),g=a.find(x=>d>=x.x0&&d<=x.x1&&f>=x.y0&&f<=x.y1);g&&(l++,c.add(g.id))}r.set(o.id,{hidden:l/(e*n),by:[...c]})}return r}function zm(i,t,{across:e=12,down:n=20}={}){if(!t?.length)return 0;let s=(o,a)=>t.some(l=>l.rect?o>=l.rect[0]&&o<=l.rect[2]&&a>=l.rect[1]&&a<=l.rect[3]:l.circle?(o-l.circle[0])**2+(a-l.circle[1])**2<=l.circle[2]**2:!1),r=0;for(let o=0;o<e;o++)for(let a=0;a<n;a++)s(i.x0+(o+.5)/e*(i.x1-i.x0),i.y0+(a+.5)/n*(i.y1-i.y0))&&r++;return r/(e*n)}var fl=44,pl=.4;function ml(i,t,e,n){let s=new Uint8Array(t*e),r=i.length;for(let l=0;l<e;l++){let c=l+.5,h=[];for(let u=0,d=r-1;u<r;d=u++){let[f,g]=i[u],[x,p]=i[d];g>c!=p>c&&h.push(f+(c-g)/(p-g)*(x-f))}h.sort((u,d)=>u-d);for(let u=0;u+1<h.length;u+=2){let d=Math.max(0,Math.ceil(h[u]-.5)),f=Math.min(t-1,Math.floor(h[u+1]-.5));for(let g=d;g<=f;g++)s[l*t+g]=1}}let o=new Uint8ClampedArray(t*e),a=l=>l*l*(3-2*l);for(let l=0;l<t;l++){let c=-1;for(let h=0;h<e;h++){if(!s[h*t+l])continue;c<0&&(c=h);let u=h-c+.5;o[h*t+l]=Math.round(255*(n>0?a(Math.min(1,u/n)):1))}}return o}function Hm(i,t,e,{most:n=.15,iterations:s=80,limits:r=null}={}){let o=t.map(l=>({...l})),a=new Map(o.map(l=>[l.id,l]));for(let l=0;l<s;l++){let c=i_(i,o),h=!1;for(let u of o){let d=c.get(u.id);if(!(d.hidden<=n-.01))for(let f of d.by){let g=a.get(f),x=e.has(u.id),p=e.has(g.id);if(!x&&!p)continue;let m=u.X!==g.X?Math.sign(u.X-g.X):u.id<g.id?-1:1,_=Math.max(u.w,g.w)*.05;x&&p?(u.X+=m*_/2,g.X-=m*_/2):x?u.X+=m*_:g.X-=m*_,h=!0}}if(r)for(let u of o)e.has(u.id)&&(u.X=Math.max(r[0],Math.min(r[1],u.X)));if(!h)break}return o}var Si="#241a0f",tn="#f2e8cc",xl="#dbcca2",hr="#fffaee",_i="#c39a4e",Ss="#ead08e",Mi="#b04a32",yl="#dd977f",ri="#9cc8c2",dd="#5f8e8b",ur="#677a7c",eA=Object.freeze({INK:Si,PAPER:tn,SHADE:xl,GLINT:hr,BRASS:_i,GILT:Ss,LACQUER:Mi,ROSE:yl,SEA:ri,DEEP:dd,SLATE:ur}),s_=2.2,r_="1.4 2.4",o_="1.7 1.3",a_="2.6 2.1",gn=Math.PI/180,st=i=>String(Math.round(i*10)/10),Ae=([i,t])=>`${st(i)} ${st(t)}`;function Ts({s:i=1,r:t=0,dx:e=0,dy:n=0}={}){let s=Math.cos(t*gn),r=Math.sin(t*gn),o=([a,l])=>{let c=(a-50)*i,h=(l-50)*i;return[50+e+c*s-h*r,50+n+c*r+h*s]};return o.s=i,o}var Km=Ts();function l_(i,t){let e=[],n=t.match(/[MLQCZ]|-?\d*\.?\d+/g);for(let s=0;s<n.length;s++)/[MLQCZ]/.test(n[s])?e.push(n[s]):(e.push(Ae(i([Number(n[s]),Number(n[s+1])]))),s++);return e.join(" ").replace(/([MLQC]) /g,"$1")}function Ho(i,t,e,n,s,r=s,o=r,a=16){let l=[],c=[];for(let h=0;h<=a;h++){let u=h/a,d=1-u,f=d*d*d*i[0]+3*d*d*u*t[0]+3*d*u*u*e[0]+u*u*u*n[0],g=d*d*d*i[1]+3*d*d*u*t[1]+3*d*u*u*e[1]+u*u*u*n[1],x=3*d*d*(t[0]-i[0])+6*d*u*(e[0]-t[0])+3*u*u*(n[0]-e[0]),p=3*d*d*(t[1]-i[1])+6*d*u*(e[1]-t[1])+3*u*u*(n[1]-e[1]);Math.hypot(x,p)<1e-6&&(x=n[0]-i[0],p=n[1]-i[1]);let m=Math.hypot(x,p)||1,_=(s*d+o*u+(r-(s+o)/2)*4*u*d)/2;l.push([f-p/m*_,g+x/m*_]),c.push([f+p/m*_,g-x/m*_])}return`M${Ae(l[0])} L${l.slice(1).map(Ae).join(" L")} A${st(o/2)} ${st(o/2)} 0 0 0 ${Ae(c[a])} L${c.slice(0,a).reverse().map(Ae).join(" L")} A${st(s/2)} ${st(s/2)} 0 0 0 ${Ae(l[0])} Z`}var vl=(i,t,e)=>[i[0]+(t[0]-i[0])*e,i[1]+(t[1]-i[1])*e],ke=(i,t,e,n,s)=>Ho(i,vl(i,t,1/3),vl(i,t,2/3),t,e,n,s),Bo=(i,t,e,n,s,r)=>Ho(i,vl(i,t,2/3),vl(e,t,2/3),e,n,s,r);function Te([i,t],e){return`M${st(i-e)} ${st(t)} A${st(e)} ${st(e)} 0 1 0 ${st(i+e)} ${st(t)} A${st(e)} ${st(e)} 0 1 0 ${st(i-e)} ${st(t)} Z`}function bi([i,t],e,n,s=0){let r=Math.cos(s*gn),o=Math.sin(s*gn),a=[i+e*r,t+e*o],l=[i-e*r,t-e*o];return`M${Ae(a)} A${st(e)} ${st(n)} ${st(s)} 1 0 ${Ae(l)} A${st(e)} ${st(n)} ${st(s)} 1 0 ${Ae(a)} Z`}var c_=i=>`M${Ae(i[0])} L${i.slice(1).map(Ae).join(" L")}`;function Uo([i,t],e,n,s,r=-90){let o=[],a=Math.ceil(s*28);for(let l=0;l<=a;l++){let c=l/a,h=(r+c*s*360)*gn,u=e+(n-e)*c;o.push([i+u*Math.cos(h),t+u*Math.sin(h)])}return c_(o)}function Xi([i,t],e,n=.14){let s=e*n;return`M${st(i)} ${st(t-e)} Q${st(i+s)} ${st(t-s)} ${st(i+e)} ${st(t)} Q${st(i+s)} ${st(t+s)} ${st(i)} ${st(t+e)} Q${st(i-s)} ${st(t+s)} ${st(i-e)} ${st(t)} Q${st(i-s)} ${st(t-s)} ${st(i)} ${st(t-e)} Z`}var Ft=i=>({d:i,fill:Si}),At=(i,t=4,e=Si)=>({d:i,stroke:e,w:t}),Kt=(i,t,e=3)=>({d:i,fill:t,stroke:Si,w:e}),wi=(i,t,e)=>({d:i,fill:t,opacity:e}),Ee=i=>({...i,inner:!0}),Gm=i=>[`d="${i.d}"`,`fill="${i.fill??"none"}"`,i.stroke?`stroke="${i.stroke}" stroke-width="${st(i.w)}" stroke-linecap="round" stroke-linejoin="round"`:"",i.dash?`stroke-dasharray="${i.dash}"`:"",i.opacity!=null?`opacity="${i.opacity}"`:""].filter(Boolean).join(" ");function cd(i,t,e){let n=(i.stroke?i.w:0)+e*2,s=i.fill?t:"none",r=n>0?` stroke="${t}" stroke-width="${st(n)}" stroke-linecap="round" stroke-linejoin="round"`:"";return`<path d="${i.d}" fill="${s}"${r}/>`}function Oe(i,{echo:t=null,shadow:e=!0,key:n=s_}={}){let s=i.filter(h=>!h.inner),r=s.filter(h=>!h.bare).map(h=>cd(h,tn,n)).join(""),o=e?`<g opacity=".26" transform="translate(${r_})">${s.map(h=>cd(h,Si,0)).join("")}</g>`:"",a=s.filter(h=>h.fill===Si||!h.fill&&h.stroke===Si),l=t?`<g transform="translate(${a_})">${a.map(h=>cd(h,t,0)).join("")}</g>`:"",c=i.map(h=>h.fill&&h.fill!==Si&&h.fill!==tn&&h.stroke===Si?`<path d="${h.d}" fill="${h.fill}" transform="translate(${o_})"/><path ${Gm({...h,fill:void 0})}/>`:`<path ${Gm(h)}/>`).join("");return`<svg viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">${r}${o}${l}${c}</svg>`}var Vm=(i=Km)=>[Ft(Ho(i([53,12]),i([53.5,28]),i([51.5,44]),i([50,59]),15*i.s,11.5*i.s,4.6*i.s)),Ft(Te(i([49.6,75.5]),7.2*i.s))],Wm=(i=Km)=>[Ft(Ho(i([31,32]),i([29,8]),i([71,4]),i([69,28]),5.4*i.s,11.5*i.s,11*i.s)),Ft(Ho(i([69,28]),i([67.5,42]),i([53,43]),i([52,59]),11*i.s,9.6*i.s,4.6*i.s)),Ft(Te(i([51.6,75.5]),7.2*i.s))],hd=([i,t],e)=>{let n=e*.24;return[Ft(ke([i,t],[i+e,t-e*.06],n*.7,n*.9,n)),Ft(ke([i+e,t-e*.06],[i+e*.04,t+e],n,n*.8,n*.9)),Ft(ke([i+e*.04,t+e],[i+e*1.08,t+e*.96],n*.9,n,n*.6))]},Ln={cx:52,cy:44,rx:40,ry:33},zo=(i,t=0)=>[Ln.cx+(Ln.rx-t)*Math.cos(i*gn),Ln.cy+(Ln.ry-t)*Math.sin(i*gn)];function h_(){let i=zo(114),t=zo(146);return`M${Ae(i)} A${Ln.rx} ${Ln.ry} 0 1 0 ${Ae(t)} Q20 76 9 93 Q30 84 ${Ae(i)} Z`}function u_(){let i=zo(24,1.8),t=zo(108,1.8);return`M${Ae(i)} A${st(Ln.rx-1.8)} ${st(Ln.ry-1.8)} 0 0 1 ${Ae(t)} Q${Ae(zo(66,10))} ${Ae(i)} Z`}var Xm=(i,t=3)=>Ln.cy-(Ln.ry-t)*Math.sqrt(Math.max(0,1-((i-Ln.cx)/(Ln.rx-t))**2)),fd=(i={})=>[{...Kt(h_(),tn,3.2),bare:!0,...i},Ee(wi(u_(),xl,.75))],Vn=(i,t=[])=>Oe([...fd(),...i.map(Ee),...t]),$m=(i=10)=>[At(`M31 ${st(40+i/4)} Q37.5 ${st(40-i*.85)} 44 ${st(40+i/4)}`,4.4),At(`M60 ${st(40+i/4)} Q66.5 ${st(40-i*.85)} 73 ${st(40+i/4)}`,4.4)],d_=(i=38,t=0)=>[At(`M29 ${st(i-t)} L46 ${st(i+t)}`,4.2),At(`M58 ${st(i+t)} L75 ${st(i-t)}`,4.2)],Zm=(i=38,t=0)=>[Ft(`M${st(33+t)} ${i} A4.6 4.6 0 0 0 ${st(42.2+t)} ${i} Z`),Ft(`M${st(62+t)} ${i} A4.6 4.6 0 0 0 ${st(71.2+t)} ${i} Z`)],qm=(i=.85)=>[wi(bi([29,52],7,4),yl,i),wi(bi([75,52],7,4),yl,i)],Ym=i=>[-5,0,5].map(t=>At(`M${st(i+t-2.4)} 55.5 L${st(i+t+2.4)} 48.5`,1.8,Mi)),f_=(i,t,e)=>`M${i} ${t} Q${st(i-12*e)} ${st(t)} ${st(i-12*e)} ${st(t-10*e)} Q${st(i-12*e)} ${st(t-21*e)} ${st(i+1*e)} ${st(t-21*e)} Q${st(i+4*e)} ${st(t-32*e)} ${st(i+18*e)} ${st(t-30*e)} Q${st(i+30*e)} ${st(t-36*e)} ${st(i+38*e)} ${st(t-24*e)} Q${st(i+50*e)} ${st(t-24*e)} ${st(i+50*e)} ${st(t-12*e)} Q${st(i+50*e)} ${st(t)} ${st(i+38*e)} ${st(t)} Z`;function ud([i,t],e,n,s=9){let r=Array.from({length:s},(a,l)=>{let c=(-100+l*360/s)*gn;return[i+e*Math.cos(c),t+n*Math.sin(c)]}),o=`M${Ae(r[0])}`;for(let a=0;a<s;a++){let l=r[(a+1)%s],c=Math.hypot(l[0]-r[a][0],l[1]-r[a][1])*.6;o+=` A${st(c)} ${st(c)} 0 0 1 ${Ae(l)}`}return`${o} Z`}function p_([i,t],e,n,s=1.12){let r=c=>[i+e*Math.cos(c*gn),t+e*Math.sin(c*gn)],a=e*Math.sin(Math.PI/n)*s,l=`M${Ae(r(-70))}`;for(let c=1;c<=n;c++)l+=` A${st(a)} ${st(a)} 0 1 1 ${Ae(r(-70+c*360/n))}`;return l}var m_=l_(Ts({r:-10}),"M50 84 C24 66 12 48 22 32 C31 18 46 21 50 34 C54 21 69 18 78 32 C88 48 76 66 50 84 Z"),g_="M60 8 C56 24 29 44 29 62 C29 74 39 83 50 83 C61 83 71 74 71 62 C71 46 64 24 60 8 Z",jm="M86 30 C84 36 78 41 78 46 C78 51 82 54 86 54 C90 54 94 51 94 46 C94 41 88 36 86 30 Z",gl=(i,t,e,n)=>Kt(Bo(i(t),i(e),i(n),3.4,12,3.4),Mi,2.4),xn=Object.freeze({laugh:{kind:"face",label:"Laughing",motion:"shake",svg:Vn([...$m(12),Ft("M40 50 L64 50 C64 60 58.5 67 52 67 C45.5 67 40 60 40 50 Z"),wi("M45 62 C48 58.5 56 58.5 59 62 C56 65.5 48 65.5 45 62 Z",yl)],[Ft(Bo([88,12],[93,6],[99,4],2,4.4,1.6)),Ft(Bo([92,24],[98,22],[104,24],2,4.4,1.6))])},pleased:{kind:"face",label:"Pleased",motion:"bob",svg:Vn([...$m(8),At("M43 54 Q52 62 61 54",3.8),...qm(.7)])},smug:{kind:"face",label:"Smug",motion:"tilt",svg:Vn([At("M29 38.5 Q37.5 35.5 46 38.5",4),At("M58 38.5 Q66.5 35.5 75 38.5",4),...Zm(38.5,3),At("M60 27 Q67 23 74 26",3.2),At("M41 55 Q46.5 61 52 55 Q57.5 61 63 55",3.6)],[Kt(Xi([92,10],9),Ss,2)])},blush:{kind:"face",label:"Flustered",motion:"pulse",svg:Vn([...qm(.95),...Ym(29),...Ym(75),At("M31 30 Q36.5 27 42 30",3),At("M62 30 Q67.5 27 73 30",3),Ft(Te([37.5,40],3.6)),Ft(Te([66.5,40],3.6)),At("M45 58 Q48.5 54.5 52 58 Q55.5 61.5 59 58",3.4)])},determined:{kind:"face",label:"Fired up",motion:"pulse",svg:Vn([Ft(ke([27,27],[45,34.5],3.2,6.4,5.4)),Ft(ke([77,27],[59,34.5],3.2,6.4,5.4)),Ft(bi([37.5,43],4.4,6.2)),Ft(bi([66.5,43],4.4,6.2)),wi(Te([39,40.6],1.6),hr),wi(Te([68,40.6],1.6),hr),At("M42 59 Q52 55 62 59",3.8)],[Kt(Xi([92,11],10.5),Ss,2.2),Kt(Xi([98.5,30],5),tn,1.8)])},deadpan:{kind:"face",label:"Unimpressed",motion:"still",svg:Vn([...d_(38),...Zm(38),At("M45 58 L59 58",3.6)])},wince:{kind:"face",label:"Argh!",motion:"shake",svg:Vn([At("M30 33 L43 40 L30 47",4.4),At("M74 33 L61 40 L74 47",4.4),Kt("M41 52 L63 52 Q66 52 66 55 L66 61 Q66 64 63 64 L41 64 Q38 64 38 61 L38 55 Q38 52 41 52 Z",tn,3),At("M39 58 L65 58",1.8),At("M45.5 52.5 L45.5 63.5",1.6),At("M52 52.5 L52 63.5",1.6),At("M58.5 52.5 L58.5 63.5",1.6)],[Kt(jm,ri,2.4)])},tear:{kind:"face",label:"Tears",motion:"bob",svg:Vn([Ft("M45.5 55 Q52 51 58.5 55 Q59 61 52 61.5 Q45 61 45.5 55 Z")],[Kt("M34.6 39 L40.4 39 C41 50 39.6 60 41.6 70 C43 77 43.6 82 41.6 85.5 Q37.4 89 33.2 85.5 C31.2 82 32.8 77 33.6 70 C34.8 60 34 50 34.6 39 Z",ri,2.2),Kt("M63.6 39 L69.4 39 C70 50 68.6 60 70.6 70 C72 77 72.6 82 70.6 85.5 Q66.4 89 62.2 85.5 C60.2 82 61.8 77 62.6 70 C63.8 60 63 50 63.6 39 Z",ri,2.2),Kt(Te([27,94],2.6),ri,1.8),Kt(Te([77,95],2.6),ri,1.8),At("M30 36.5 L45 36.5",4.4),At("M59 36.5 L74 36.5",4.4)])},shiver:{kind:"face",label:"Shiver",motion:"shake",svg:Vn([...[32,42,52,62,72].map(i=>At(`M${i} ${st(Xm(i)+1)} L${i} ${st(Xm(i)+13-Math.abs(i-52)/6)}`,2.2,dd)),At(Te([37.5,42],5.4),2.8),At(Te([66.5,42],5.4),2.8),Ft(Te([37.5,42.5],2.1)),Ft(Te([66.5,42.5],2.1)),At("M40 59 L44 55.5 L48 59 L52 55.5 L56 59 L60 55.5 L64 59",3)],[Ft(Bo([95,30],[99.5,38],[95,46],1.6,3.6,1.6)),Ft(Bo([100.5,27],[105.5,38],[100.5,49],1.6,3.4,1.6))])},dizzy:{kind:"face",label:"Dizzy",motion:"tilt",svg:Vn([At(Uo([37.5,40],1,8.4,2.1),3),At(Uo([66.5,40],1,8.4,2.1,90),3),At("M40 59 Q44 55 48 59 Q52 63 56 59 Q60 55 64 59",3.4)],[Kt(Xi([86,5],8),Ss,2),Kt(Xi([98,19],5.5),Ss,1.8),Ft(Te([97,4],2))])},ko:{kind:"face",label:"Out cold",motion:"tilt",svg:Vn([At("M31 34 L43 46 M43 34 L31 46",4.2),At("M61 34 L73 46 M73 34 L61 46",4.2),At(bi([52,58],4.6,3.6),3.2)])},ellipsis:{kind:"balloon",label:"\u2026",motion:"bob",svg:Oe([...fd(),...[36,52,68].map(i=>Ee(Ft(Te([i,45],4.4))))])},whisper:{kind:"balloon",label:"Psst",motion:"bob",svg:Oe([...fd({dash:"6.5 4.5",w:2.8}),...[At("M26 39 L26 62",3.6),At(bi([31.5,45],5.4,6.2),3.6),At("M48 39.5 C45 36.5 39 37.5 39 41.5 C39 46.5 48 44.5 48 49.5 C48 53.5 41 54.5 38 51.5",3.6),At("M62 39.5 C59 36.5 53 37.5 53 41.5 C53 46.5 62 44.5 62 49.5 C62 53.5 55 54.5 52 51.5",3.6),At("M70 31 L70 48 C70 52.5 73.5 53 77 50.5",3.6),At("M65 39 L77 39",3.6)].map(Ee)])},think:{kind:"balloon",label:"Thinking",motion:"bob",svg:Oe([{...Kt(ud([54,38],37,27),tn,3),bare:!0},...[40,54,68].map(i=>Ee(wi(Te([i,40],3.4),ur))),{...Kt(Te([23,77],6.4),tn,2.6),bare:!0},{...Kt(Te([12,91],4),tn,2.2),bare:!0}])},surprise:{kind:"mark",label:"Surprise",motion:"shake",svg:Oe([...Vm(Ts({dx:-6})),Ft(ke([68,26],[84,13],2,5,1.6)),Ft(ke([72,44],[92,42],2,5,1.6)),Ft(ke([68,62],[84,72],2,5,1.6))],{echo:Mi,shadow:!1})},question:{kind:"mark",label:"Question",motion:"tilt",svg:Oe(Wm(Ts({r:8})),{echo:_i,shadow:!1})},shock:{kind:"mark",label:"What?!",motion:"shake",svg:Oe([...Vm(Ts({s:.84,dx:-18,r:-8})),...Wm(Ts({s:.84,dx:16,r:10}))],{echo:Mi,shadow:!1})},sweat:{kind:"mark",label:"Sweat",motion:"drip",svg:Oe([Kt(g_,ri,3.2),Ee(At("M38 58 C37 66 40 72 46 75",4,hr)),Kt(jm,ri,2.4)])},anger:{kind:"mark",label:"Anger",motion:"pulse",svg:(()=>{let i=Ts({s:.92,r:-10});return Oe([gl(i,[16,43],[40,41],[42,17]),gl(i,[58,17],[60,41],[84,43]),gl(i,[84,57],[60,59],[58,83]),gl(i,[42,83],[40,59],[16,57])])})()},sparkle:{kind:"mark",label:"Sparkle",motion:"twinkle",svg:Oe([Kt(Xi([45,55],36),Ss,2.6),Kt(Xi([81,19],14),tn,2.2),Kt(Xi([18,20],8),tn,2),Ft(Te([84,64],2.6)),Ft(Te([70,86],1.8))])},heart:{kind:"mark",label:"Fond",motion:"float",svg:Oe([Kt(m_,Mi,3.2),Ee(At("M29 37 Q30 29 37 27",4,hr)),Ft(ke([80,20],[90,10],1.6,4.2,1.4)),Ft(ke([86,34],[99,31],1.6,4.2,1.4)),Ft(ke([70,12],[73,0],1.6,4,1.4))])},music:{kind:"mark",label:"Humming",motion:"float",svg:Oe([Ft(bi([30,75],9.6,7,-22)),Ft(bi([68,64],9.6,7,-22)),Ft(ke([38.4,72],[38.4,30],3.6,3.6,3.6)),Ft(ke([76.4,61],[76.4,19],3.6,3.6,3.6)),Ft("M36.6 24 L78.2 13 L78.2 23 L36.6 34 Z")],{echo:_i,shadow:!1})},sleep:{kind:"mark",label:"Asleep",motion:"float",svg:Oe([...hd([14,74],13),...hd([32,46],19),...hd([56,8],28)],{echo:ur,shadow:!1})},gloom:{kind:"mark",label:"Gloom",motion:"fall",svg:Oe([Kt(f_(28,42,1.24),ur,3),Ee(At("M22 32 Q28 28 34 32",2.4,xl)),...[[26,50,66],[38,52,80],[50,50,70],[62,52,84],[74,50,64],[44,76,92],[68,74,90]].map(([i,t,e])=>Ee(At(`M${i} ${t} L${i-1.5} ${e}`,2.4,dd)))])},idea:{kind:"mark",label:"Idea",motion:"flicker",svg:(()=>{let i=[200,240,270,300,340].map(t=>Ft(ke([50+34*Math.cos(t*gn),42+34*Math.sin(t*gn)],[50+46*Math.cos(t*gn),42+46*Math.sin(t*gn)],4.4,3.2,1.4)));return Oe([...i,Kt("M50 16 C35 16 26 27 26 40 C26 50 31.5 55.5 36 61 L38 70 L62 70 L64 61 C68.5 55.5 74 50 74 40 C74 27 65 16 50 16 Z",Ss,3.2),Ee(At("M35 37 Q36 28 44 24",4,hr)),Ee(At("M45 64 L45 54 C45 46 55 46 55 54 L55 64",2.2,_i)),Kt("M38 72 L62 72 L60.5 84 L39.5 84 Z",_i,3),Ee(At("M39 78 L61 78",2.2)),Ft(Te([50,89],3.8))])})()},fume:{kind:"mark",label:"Fuming",motion:"rise",svg:Oe([Ft(ke([4,100],[16,84],1,2.6,3.4)),Ft(ke([14,103],[24,91],1,2.2,2.8)),Kt(ud([31,70],19,15.5,6),tn,3),Ee(At(Uo([31,71],1.2,8.4,1.3,180),3)),Ft(ke([42,46],[52,35],1,2.6,3.4)),Kt(ud([70,27],26,21,7),tn,3.2),Ee(At(Uo([70,28],1.4,11.8,1.35,180),3.2))])},soul:{kind:"mark",label:"Done for",motion:"rise",svg:Oe([Kt("M47 27 C47 14 59 8 69 11 C80 14 83 29 77 39 C71 49 59 52 51 60 C43 68 41 77 30 86 C31 77 34 71 32 65 C30 57 36 51 42 45 C46 39 47 34 47 27 Z",tn,2.8),Ee(At("M56 27 Q59 29.5 62 27",2.6)),Ee(At("M67 25 Q70 27.5 73 25",2.6)),Ee(At(bi([65.5,35],2.8,2.2),2.4)),Ee(wi("M33 82 C38 76 40 70 44 64 C41 72 38 78 33 82 Z",ri,.9)),Ft(Te([22,94],2.2)),Ft(Te([14,101],1.5))],{echo:ri})},star:{kind:"mark",label:"Well done",motion:"pulse",svg:Oe([At(Uo([50,50],2,17,1.9),3.8,Mi),At(p_([50,50],27,6),3.8,Mi)],{shadow:!1,key:1.3})},hand:{kind:"mark",label:"Hand up",motion:"wave",svg:Oe([Kt("M37 92 L37 61 C33 57 26 51 24 45 C22 39 27 35 31 38 L38 45 L38 22 C38 15 44 12 49.5 12.5 C55 12 59 14 60.5 18 C64.5 16 71 18.5 71 25 L71 63 C71 77 66 86 61 92 Z",tn,3.2),Ee(At("M49.5 14 L49.5 43",2.2)),Ee(At("M60.5 19 L60.5 45",2.2)),Ee(wi("M60 72 C66 66 70 60 70 50 L70 63 C70 72 66 80 62 86 Z",xl)),Kt("M34 88 L64 88 L64 98 L34 98 Z",_i,3),Ft(ke([78,16],[88,8],1.6,4,1.4)),Ft(ke([80,32],[93,30],1.6,4,1.4))])},bowl:{kind:"mark",label:"Hungry",motion:"bob",svg:Oe([At("M34 34 Q28 25 34 17 Q40 9 34 1",3,ur),At("M50 31 Q44 22 50 14 Q56 6 50 -2",3,ur),Kt("M18 52 C22 40 38 33 50 35 C62 33 78 40 82 52 Z",tn,2.6),Kt(ke([64,44],[95,14],4,4,3.2),_i,2),Kt(ke([70,46],[99,22],4,4,3.2),_i,2),Kt("M12 51 L88 51 C88 71 74 85 56 87 L44 87 C26 85 12 71 12 51 Z",Mi,3.2),Ee(At("M19 60 C36 67 64 67 81 60",2.6,tn)),Kt("M38 87 L62 87 L60 95 L40 95 Z",_i,2.8)])}}),_l=Object.freeze(["laugh","pleased","smug","blush","determined","deadpan","wince","tear","shiver","dizzy","ko","ellipsis","whisper","think","surprise","question","shock","sweat","anger","sparkle","heart","music","sleep","gloom","idea","fume","soul","star","hand","bowl"]),nA=Object.freeze(["surprise","laugh","sweat","heart","anger","idea","ellipsis","whisper"]);function Jm(i,t,e=0){let n=e%97/97,s=0,r=0,o=0,a=1,l=1;switch(i){case"drip":r=Math.min(14,t*6);break;case"pulse":a=1+.1*Math.max(0,Math.sin(t*13+n*6));break;case"float":r=-(14*Math.min(t,1.5)+5*Math.max(0,t-1.5)),s=4*Math.sin(t*3+n*6);break;case"twinkle":a=1+.08*Math.sin(t*9+n*6),o=6*Math.sin(t*4+n);break;case"fall":r=Math.min(10,t*5);break;case"flicker":l=t<.6?Math.sin(t*60)>-.3?1:.35:1;break;case"rise":r=-(10*Math.min(t,2)+4*Math.max(0,t-2)),a=1+.05*Math.min(t,2);break;case"spin":o=t*140;break;case"bob":r=3*Math.sin(t*4+n*6);break;case"shake":s=t<.9?3*Math.sin(t*46)*(1-t/.9):0;break;case"tilt":o=12*Math.sin(t*3+n);break;case"wave":o=14*Math.sin(t*9)*Math.exp(-t*.8);break;default:break}return{x:s,y:r,r:o,s:a,o:l}}var dr=.7,bl=5,Qm=6;function tg(i,{keep:t=!1,t0:e=0}={}){if(i===null)return{id:null,chosen:!0};if(typeof i!="string"||!xn[i])return null;let n={id:i,t0:Math.round(e*1e3)/1e3,chosen:!0};return t||(n.once=!0),n}var Ml=1/120,eg=2.5,Go=Object.freeze({card:{w:280,h:468},holdLift:70,stickLength:134,lane:150,passInFront:85,gripRate:16,limits:{x:[-1800,1800],z:[-2300,260]},zoneEvery:4,look:{reach:900,most:22,linger:2.6},magnet:{overlap:.42,lane:110,rate:9}}),Ti=(i,t,e)=>Math.max(t,Math.min(e,i));function Es(i,t,e,n,s,r=16,o=.72){let a=r*r*(n-i[t])-2*o*r*i[e];i[e]+=a*s,i[t]+=i[e]*s}function ng(i){let t=2166136261;for(let e=0;e<i.length;e++)t^=i.charCodeAt(e),t=Math.imul(t,16777619);return 1e3+(t>>>0)%9e3}var fr=class{constructor(t,e=[],n={}){this.scene=t,this.opts={...Go,...n,card:{...Go.card,...n.card??{}},limits:{...Go.limits,...n.limits??{}},look:{...Go.look,...n.look??{}},magnet:{...Go.magnet,...n.magnet??{}}},this.clock=typeof n.clock=="function"?n.clock:()=>this.time,this.coverFn=typeof n.cover=="function"?n.cover:null,this.rig=ar(t.painting,t.rig);let s=Pm(t.marks,this.rig);this.marks=s.marks,this.problems=s.dropped.map(r=>`mark "${r}" is above the horizon and cannot be stood on`),this.zones=t.zones,this.bands=Cm(t.zones),this.focus=this.#e(),this.risers=this.#t(),this.cards=new Map,this.resting=new Map,this.touching=new Map,this.inZones=new Map,this.events=[],this.recentBonks=[],this.time=0,this.acc=0,this.steps=0,this.lifeOn=!0,this.board=!1,this.speaker=null,this.turn=null,this.calm=!1,this.slots=new Map;for(let r of e)this.addCard(r)}#t(){let{cam:t,map:e}=this.rig,n=t.floorY-t.cy;return(this.scene.occluders??[]).filter(s=>s.riser).flatMap(s=>{let r=this.rig.standing([s.x,s.base]);if(!r)return[];let o=(t.f-r.Z)/t.f,a=Math.min(...s.poly.map(c=>c[1])),l=s.poly.map(c=>(e.x(c[0])-t.cx)*o);return[{Z:r.Z,top:n-(e.y(a)-t.cy)*o,x0:Math.min(...l),x1:Math.max(...l),hideAtMost:s.hideAtMost,camY:n,f:t.f}]})}riserFor(t,e,n,s){let r=0;for(let o of this.risers){if(e>=o.Z-4||t+n/2<o.x0||t-n/2>o.x1)continue;let a=o.camY+(o.top-o.camY)*((o.f-e)/(o.f-o.Z));r=Math.max(r,a-o.hideAtMost*s)}return Math.max(0,Math.min(r,s*eg))}grow(t){return al(this.rig.cam,t)}unhidden(t,e,n,s){for(let r of this.risers){if(e>=r.Z-4||t+n/2<r.x0||t-n/2>r.x1)continue;if(r.camY+(r.top-r.camY)*((r.f-e)/(r.f-r.Z))-r.hideAtMost*s>s*eg)return r.Z+60}return e}#e(){let t=this.scene.rig,e=this.scene.focus??[t.vanish??.5,t.horizon+(t.floorFront-t.horizon)*.72];return this.rig.place(e)??{X:0,Z:-400}}addCard(t){if(!t?.id||this.cards.has(t.id))return null;let e=this.opts.card.w,n=this.opts.card.h,s=this.scene.cardScale*(t.size??1),r=0,o=0,a=t.mark?this.marks.find(u=>u.id===t.mark):null;if(a)r=a.X,o=a.Z;else if(t.at){let u=this.rig.place(t.at);u&&(r=u.X,o=u.Z)}else Number.isFinite(t.X)&&Number.isFinite(t.Z)&&(r=t.X,o=t.Z);let l={id:t.id,person:t,s,w:e*s,h:n*s,seed:ng(t.id),puppet:vm({id:t.id,x:r,y:0,rod:0,w:e*s,h:n*s,scale:1}),Z:o,restZ:o,zOff:0,grip:0,holder:null,hand:null,yaw:t.yaw??0,yawV:0,yawTo:t.yaw??0,lean:t.lean??0,leanV:0,leanTo:t.lean??0,pitch:t.pitch??0,pitchV:0,pitchTo:t.pitch??0,lift:0,liftV:0,liftTo:0,mark:null,walk:null,routine:null,still:t.still===!0,living:!1,packed:t.packed===!0,stepLift:0,stepRock:0,look:0,lookV:0,attention:null,riser:0,riserTo:0,down:t.down===!0?1:0,downV:0,downTo:t.down===!0?1:0,grow:this.grow(o)};l.riser=l.riserTo=this.riserFor(r,o,l.w*l.grow,l.h*l.grow),this.cards.set(l.id,l),a&&this.#r(l,a,!0);let c=ad(t.life);if(c&&(l.routine=ld(c,{home:{X:r,Z:o},rig:this.rig,marks:this.marks,seed:l.seed})),l.routine&&!l.still&&this.lifeOn&&!a){let u=hl(l.routine,this.clock());l.puppet.x=l.puppet.restX=u.X,l.Z=l.restZ=u.Z,u.yaw!==null&&(l.yaw=l.yawTo=u.yaw),l.living=!0}let h=t.enter&&typeof t.enter=="object"&&!ig(t.enter.t0,this.clock())?t.enter:null;if(h&&h.from==="rise"){let u=Number.isFinite(h.t0)?h.t0:this.clock();l.rise={t0:u,dur:Number.isFinite(h.dur)?h.dur:.7}}if(h&&Number.isFinite(h.t0)&&this.clock()-h.t0<3&&this.#n(l),h&&["left","right","back"].includes(h.from)){let u=Number.isFinite(h.t0)?h.t0:this.clock(),d=Nm(h.from,{X:r,Z:o},this.opts.limits),f=ws(d,{X:r,Z:o},{t0:u,gait:h.gait??"walk",yaw:l.yawTo,maxDur:8});if(this.clock()<f.t0+f.dur){l.walk=f;let g=Fo(f,this.clock());l.puppet.x=l.puppet.restX=g.X,l.Z=l.restZ=g.Z}}return l}removeCard(t){let e=this.cards.get(t);if(!e)return!1;e.mark&&this.resting.get(e.mark)?.delete(t),this.cards.delete(t),this.inZones.delete(t);for(let n of[...this.touching.keys()])n.split("|").includes(t)&&this.touching.delete(n);return!0}walkTo(t,e,{t0:n=null,gait:s="walk",yaw:r=null,lean:o=null,pitch:a=null,still:l=null,packed:c=null}={}){let h=this.cards.get(t);if(!h||h.holder!==null)return null;let u=null,d=null;if(e?.mark?(d=this.marks.find(p=>p.id===e.mark)??null,d&&(u={X:d.X,Z:d.Z})):Array.isArray(e?.at)?u=this.rig.place(e.at):Number.isFinite(e?.X)&&Number.isFinite(e?.Z)&&(u={X:e.X,Z:e.Z}),!u)return null;let f=this.opts.limits;if(u={X:Ti(u.X,f.x[0],f.x[1]),Z:Ti(u.Z,f.z[0],f.z[1])},h.mark&&(this.resting.get(h.mark)?.delete(t),h.mark=null),d){let p=this.resting.get(d.id);p||this.resting.set(d.id,p=new Set),p.add(t),h.mark=d.id}l!==null&&(h.still=!!l),c!==null&&(h.packed=!!c);let g=d?ll(d,this.#s()):{yaw:r??h.yawTo,lean:o??0,pitch:a??0,lift:0},x=Number.isFinite(n)&&!ig(n,this.clock())?n:this.clock();return h.walk=ws({X:h.puppet.x,Z:h.Z},u,{t0:x,gait:s,yaw:g.yaw}),h.walk.pose=g,h.walk.mark=d?.id??null,h.living=!1,this.events.push({type:"walk",card:t,to:{X:u.X,Z:u.Z},mark:d?.id??null,t:this.time}),h.walk}setRoutine(t,e,n=null){let s=this.cards.get(t);if(!s)return;let r=Array.isArray(n)?this.rig.place(n):null;n=r?{X:r.X,Z:r.Z}:s.routine?.home??{X:s.puppet.restX,Z:s.restZ};let o=ad(e);s.routine=o?ld(o,{home:n,rig:this.rig,marks:this.marks,seed:s.seed}):null,s.living=!1}setStill(t,e){let n=this.cards.get(t);n&&(n.still=!!e)}setLife(t){this.lifeOn=!!t}setBoard(t){this.board=!!t}setDown(t,e){let n=this.cards.get(t);if(!n)return!1;let s=e?1:0;return n.downTo===s?!1:(n.downTo=s,e&&n.walk&&this.#i(n),this.events.push({type:"fall",card:t,down:!!e,t:this.time}),e&&this.#n(n),!0)}#n(t){let e=this.clock()+this.opts.look.linger;for(let n of this.cards.values())n===t||n.holder!==null||n.downTo||Oo({X:n.puppet.x,Z:n.Z},{X:t.puppet.x,Z:t.Z})<=this.opts.look.reach*1.4&&(n.attention={id:t.id,until:e})}setSpeaker(t){this.speaker=t&&this.cards.has(t)?t:null}setTurn(t){this.turn=t&&this.cards.has(t)?t:null}setCalm(t){this.calm=!!t}dockFor(t,e,n){if(!this.board)return null;let s=this.rig.fractionOf(e,n),r=this.zones.find(h=>h.kind==="area"&&lr([h],s[0],s[1]).length);if(!r)return null;let a=(this.cards.get(t)?.w??180)*this.grow(n);this.slots.has(r.id)||this.slots.set(r.id,nd(r,this.rig,{w:a*1.05}));let l=[...this.cards.values()].filter(h=>h.id!==t&&h.holder===null).map(h=>({X:h.walk?h.walk.to.X:h.puppet.restX,Z:h.walk?h.walk.to.Z:h.restZ})),c=this.slots.get(r.id).filter(h=>!l.some(u=>Math.abs(u.X-h.X)<a*.6&&Math.abs(u.Z-h.Z)<90));return c.length?(c.sort((h,u)=>Math.hypot(h.X-e,(h.Z-n)*.8)-Math.hypot(u.X-e,(u.Z-n)*.8)),{X:c[0].X,Z:c[0].Z,zone:r.id}):null}hold(t,e){let n=this.cards.get(t);return!n||n.holder!==null&&n.holder!==e?!1:(n.holder===e||(n.mark&&(this.resting.get(n.mark)?.delete(t),n.mark=null),this.#i(n),n.routine&&(n.still=!0),n.holder=e,n.hand={x:n.puppet.x,z:n.Z},n.puppet.heldBy=e,this.events.push({type:"grab",card:t,by:e,t:this.time})),!0)}setHand(t,{x:e,z:n}){let s=this.cards.get(t);if(!s||s.holder===null)return;let r=this.opts.limits;s.hand.x=Ti(e,r.x[0],r.x[1]),s.hand.z=Ti(n,r.z[0],r.z[1])}release(t,e=null){let n=this.cards.get(t);if(!n||n.holder===null)return null;let s=n.holder,r=e??this.landingFor(t);n.holder=null,n.hand=null,n.puppet.heldBy=null;let o=r.mark?this.marks.find(h=>h.id===r.mark)??null:null;o?this.#r(n,o,!1):(n.puppet.restX=r.X,n.restZ=Ti(r.Z,this.opts.limits.z[0],this.opts.limits.z[1]),n.mark=null);let a={type:"drop",card:t,by:s,t:this.time,mark:o?.id??null,X:n.puppet.restX,Z:n.restZ};this.events.push(a);let l=this.rig.fractionOf(n.puppet.restX,n.restZ),c=lr(this.zones.filter(h=>h.kind==="door"||h.kind==="spot"),l[0],l[1])[0];return c&&this.events.push({type:"visit",card:t,by:s,zone:c.id,name:c.name,hint:c.hint,t:this.time}),a}landingFor(t){let e=this.cards.get(t);if(!e||e.holder===null)return null;let n=e.puppet.x,s=e.hand?.z??e.Z,r=sd(this.marks,this.resting,n,s,this.scene.reach.snap);!r&&this.scene.marksOnly&&(r=sd(this.marks,this.resting,n,s,1/0));let o=r?null:this.dockFor(t,n,s);if(o)return{X:o.X,Z:o.Z,mark:null};let a={X:n,Z:Ti(s,this.opts.limits.z[0],this.opts.limits.z[1])},l=r?a:this.clearOfCover(a,e);return{X:l.X,Z:l.Z,mark:r?.id??null}}handOver(t,e){let n=this.cards.get(t);return n?(n.mark&&(this.resting.get(n.mark)?.delete(t),n.mark=null),this.#i(n),n.routine&&(n.still=!0),n.hand??={x:n.puppet.x,z:n.Z},n.holder=e,n.puppet.heldBy=e,!0):!1}#i(t){t.walk&&(t.walk=null,t.puppet.restX=t.puppet.x,t.restZ=t.Z,t.stepLift=0,t.stepRock=0)}perform(t,e){let n=this.cards.get(t);n&&Ju(n.puppet,e)}#r(t,e,n){let s=this.resting.get(e.id);s||this.resting.set(e.id,s=new Set),s.add(t.id),t.mark=e.id;let r=ll(e,this.#s());t.puppet.restX=e.X,t.restZ=e.Z,t.yawTo=r.yaw,t.leanTo=r.lean,t.pitchTo=r.pitch,t.liftTo=r.lift,n&&(t.puppet.x=e.X,t.Z=e.Z,t.yaw=r.yaw,t.lean=r.lean,t.pitch=r.pitch,t.lift=r.lift),this.events.push({type:"mark",card:t.id,mark:e.id,t:this.time})}#s(){return{zones:this.zones,pointOnFloor:t=>this.rig.standing(t),cardAt:t=>{let e=this.cards.get(t);return e?{X:e.puppet.x,Z:e.Z}:null}}}tidy({t0:t=null}={}){let e=this.marks.map(r=>({...r,capacity:r.capacity-(this.resting.get(r.id)?.size??0)})).filter(r=>r.capacity>0),n=[...this.cards.values()].filter(r=>!r.mark&&r.holder===null&&!r.walk).map(r=>({id:r.id,X:r.puppet.x,Z:r.Z})),s=cl(e,n);for(let{card:r,mark:o}of s)this.walkTo(r,{mark:o},{t0:t,gait:"hurry",still:!0});return s}advance(t){this.acc+=Math.min(Math.max(t,0),.05);let e=0;for(;this.acc>=Ml-1e-9;)this.step(Ml),this.acc-=Ml,e++;return e}step(t=Ml){this.time+=t,this.steps++;let e=this.opts,n=this.clock(),s=this.heldNow??=[];s.length=0;for(let r of this.cards.values())r.holder!==null&&s.push(r);for(let r of this.cards.values()){let o=r.puppet,a=r.holder!==null;a||this.#o(r,n),o.heldBy=a?r.holder:null,o.target=a?{x:r.hand.x,y:0}:null,_m(o,t),r.Z+=((a?r.hand.z:r.restZ)-r.Z)*Math.min(1,t*(a?24:12)),r.grip+=((a?1:0)-r.grip)*Math.min(1,t*e.gripRate),Es(r,"yaw","yawV",r.yawTo,t,16,.72),Es(r,"lean","leanV",r.leanTo,t,18,.8),Es(r,"pitch","pitchV",r.pitchTo,t,18,.8),Es(r,"lift","liftV",r.liftTo,t,18,.62),Es(r,"look","lookV",a||r.downTo?0:this.#c(r,s,n),t,7,.9),r.riser+=(r.riserTo-r.riser)*Math.min(1,t*9),r.grow=this.grow(r.Z),r.downTo?Es(r,"down","downV",1,t,9,.45):Es(r,"down","downV",0,t,6,.8),r.down>1.08&&(r.down=1.08,r.downV=-Math.abs(r.downV)*.35)}if(this.#l(t),this.steps%e.zoneEvery===0&&(this.#d(),this.#h(t*e.zoneEvery),this.risers.length))for(let r of this.cards.values())r.riserTo=this.riserFor(r.puppet.x,r.Z,r.w*r.grow,r.h*r.grow)}#o(t,e){let n=t.puppet;if(t.walk){let r=Fo(t.walk,e);n.restX=r.X,t.restZ=r.Z,t.stepLift=r.lift,t.stepRock=r.rock,r.yaw!==null&&(t.yawTo=r.yaw),r.done&&this.#a(t);return}if(!!t.routine&&this.lifeOn&&!t.still&&!t.downTo){let r=hl(t.routine,e);if(!t.living&&Oo({X:n.restX,Z:t.restZ},r)>12){let a=ws({X:n.x,Z:t.Z},r,{t0:e,gait:t.routine.gait}),l=hl(t.routine,e+a.dur);t.walk=ws({X:n.x,Z:t.Z},l,{t0:e,gait:t.routine.gait,yaw:l.yaw??t.yawTo}),t.walk.pose={yaw:l.yaw??t.yawTo,lean:0,pitch:0,lift:0},t.walk.mark=null,t.walk.back=!0;return}if(t.living=!0,n.restX=r.X,t.restZ=r.Z,t.stepLift=r.lift,t.stepRock=r.rock,!r.moving&&t.routine.facesCard){let a=this.cards.get(t.routine.facesCard);a&&(t.yawTo=Sn(wn(r.X,r.Z,a.puppet.x,a.Z),{share:.8,max:55}))}else r.yaw!==null&&(t.yawTo=r.yaw);let o=Fm(t.routine,e);o&&!r.moving&&e>=o.at&&e<o.at+.5&&t.gestured!==o.beat&&(t.gestured=o.beat,Ju(n,o.verb));return}t.living=!1,t.stepLift*=.8,t.stepRock*=.8}#a(t){let e=t.walk;t.walk=null,t.puppet.restX=e.to.X,t.restZ=e.to.Z,t.stepLift=0,t.stepRock=0;let n=e.pose??{yaw:e.yaw??t.yawTo,lean:0,pitch:0,lift:0};t.yawTo=n.yaw??t.yawTo,t.leanTo=n.lean??0,t.pitchTo=n.pitch??0,t.liftTo=n.lift??0,t.living=!1,e.mark&&this.events.push({type:"mark",card:t.id,mark:e.mark,t:this.time}),e.back||this.events.push({type:"arrive",card:t.id,mark:e.mark??null,t:this.time})}#c(t,e,n){let s=this.opts.look,r=null;if(t.attention&&t.attention.until>n?r=this.cards.get(t.attention.id)??null:t.attention=null,!r){let a=s.reach;for(let l of e){if(l===t)continue;let c=Oo({X:l.puppet.x,Z:l.Z},{X:t.puppet.x,Z:t.Z});c<a&&(a=c,r=l)}}if(!r&&this.speaker&&this.speaker!==t.id&&(r=this.cards.get(this.speaker)??null),!r)return 0;let o=Sn(wn(t.puppet.x,t.Z,r.puppet.x,r.Z),{share:.8,max:60});return Ti(o-t.yaw,-s.most,s.most)}#h(t){let e=this.opts.magnet,n=[...this.cards.values()].filter(s=>s.holder===null&&!s.walk&&!s.packed&&!(s.routine&&this.lifeOn&&!s.still));for(let s=0;s<n.length;s++)for(let r=s+1;r<n.length;r++){let o=n[s],a=n[r];if(Math.abs(o.restZ-a.restZ)>=e.lane)continue;let l=a.puppet.restX-o.puppet.restX,c=o.w*o.grow,h=a.w*a.grow,d=(c+h)/2-Math.min(c,h)*e.overlap-Math.abs(l);if(d<=.5)continue;let f=l!==0?Math.sign(l):o.id<a.id?1:-1,g=Math.min(d/2,d*e.rate*t),x=this.opts.limits.x;o.puppet.restX=Ti(o.puppet.restX-f*g,x[0],x[1]),a.puppet.restX=Ti(a.puppet.restX+f*g,x[0],x[1])}}#l(t){let e=this.opts,n=null;for(let s of this.cards.values()){if(s.holder===null){s.zOff+=(0-s.zOff)*Math.min(1,t*11);continue}let r=!1;for(let o of this.cards.values()){if(o===s||Math.abs(o.Z-s.Z)>=e.lane)continue;let a=s.id<o.id?`${s.id}|${o.id}`:`${o.id}|${s.id}`,l=ko(s.puppet),c=ko(o.puppet);if(Math.min(l.right,c.right)-Math.max(l.left,c.left)>0&&(r=!0),n?.has(a))continue;(n??=new Set).add(a);let h=this.touching.get(a);h||this.touching.set(a,h=new Set);let u=s.id<o.id?[s,o]:[o,s];for(let d of wm(u.map(f=>f.puppet),h)){let f={type:"bonk",t:this.time,a:d.a,b:d.b,x:d.x,speed:d.speed,Z:s.Z};this.events.push(f),this.recentBonks.push(f);let g=this.clock()+this.opts.look.linger,x=this.cards.get(d.a),p=this.cards.get(d.b);x&&p&&(x.attention={id:p.id,until:g},p.attention={id:x.id,until:g})}}s.zOff+=((r?e.passInFront:0)-s.zOff)*Math.min(1,t*11)}if(this.touching.size)for(let[s,r]of this.touching)r.size===0&&this.touching.delete(s);this.recentBonks.length&&(this.recentBonks=this.recentBonks.filter(s=>this.time-s.t<.9))}#d(){if(!this.zones.length)return;let t=new Map;for(let e of this.cards.values()){let n=this.rig.fractionOf(e.puppet.x,e.Z);t.set(e.id,new Set(lr(this.zones,n[0],n[1]).map(s=>s.id)))}for(let e of Rm(this.inZones,t))this.events.push({...e,t:this.time});this.inZones=t}drain(){let t=this.events;return this.events=[],t}marksFor(t){let e=this.cards.get(t);if(!e||e.holder===null)return[];let n=this.scene.reach;return Im(this.marks,this.resting,e.hand.x,e.hand.z,{show:n.show,snap:n.snap,max:5}).map(s=>({id:s.id,for:t,X:s.mark.X,Z:s.mark.Z,label:s.mark.label,alpha:s.alpha,target:s.target,pose:ll(s.mark,this.#s())}))}zoneStates(){let t=[...this.cards.values()].filter(e=>e.holder!==null).map(e=>{let n=this.rig.fractionOf(e.hand.x,e.hand.z);return{x:n[0],y:n[1]}});return Am(this.zones,t)}snapshot({viewer:t=null,selected:e=null,controlled:n=null,targets:s=null}={}){let r=this.time,o=this.clock(),a=[],l=[];for(let c of this.cards.values()){let h=c.puppet,u=xm(r,c.seed,c.person.demeanour??"calm",{speakerYaw:null}),d=Mm(h),f=c.grip,g=c.rise?y_(c.rise,o):1;c.rise&&o>c.rise.t0+c.rise.dur&&(c.rise=null),a.push({id:c.id,name:c.person.name??c.id,colour:c.person.colour??null,x:h.x+h.jx,z:c.Z+c.zOff,lift:(u.lift*(1-f)+c.lift+c.stepLift+c.riser)*(1-Math.min(1,c.down))+this.opts.holdLift*f+d.lift,lean:h.lean+(c.lean+u.lean)*(1-.85*f)*(1-Math.min(1,c.down))+c.stepRock,yaw:c.yaw+h.turn+d.shakeY+u.yaw+c.look,pitch:(c.pitch+u.pitch+d.tipX+d.dip*.4)*(1-Math.min(1,c.down))-78*c.down,down:Math.max(0,Math.min(1,c.down)),grip:f,breathe:u.breathe,squash:d.squash*g,scale:c.s*c.grow,grow:c.grow,held:c.holder!==null,holder:c.holder,mark:c.mark,walking:!!c.walk||c.living&&Math.abs(c.stepLift)>.2,selected:!!e?.has?.(c.id),controlled:!!n?.has?.(c.id),targeted:s?.get?.(c.id)??null,speaking:this.speaker===c.id||this.turn===c.id,emote:this.#u(c,o)}),t!==null&&c.holder===t&&l.push(...this.marksFor(c.id))}return{t:r,cards:a,bonks:this.recentBonks.map(c=>({...c})),marks:l,zones:this.zoneStates(),board:this.board?this.boardState():null}}boardState(){let t={},e={};for(let n of this.zones)t[n.id]=0,e[n.id]=0;for(let[n,s]of this.inZones){let r=this.cards.get(n)?.downTo===1;for(let o of s)o in t&&(r?e:t)[o]++}return{counts:t,downs:e,bands:this.bands}}bandBetween(t,e){return!t||!e?null:t===e?"engaged":this.bands.some(n=>n.a===t&&n.b===e||n.a===e&&n.b===t)?"near":"far"}#u(t,e){let n=t.person.emote;if(!n?.id)return null;let s=e-(n.t0??0);if(n.once&&(s<0||s>bl))return null;let r=n.once?s:s%Qm,o=r<0?0:r<.2?r/.2:r>bl-.6?Math.max(0,1-(r-(bl-.6))/.6):1,a=r<.3?.6+.4*Math.sin(r/.3*Math.PI*.5)+.12*Math.sin(r/.3*Math.PI):1,l=this.calm||r<0?null:Jm(xn[n.id]?.motion,r,ng(t.id));return l?{id:n.id,age:r,opacity:o*l.o,pop:a*l.s,x:l.x,y:l.y,r:l.r}:{id:n.id,age:r,opacity:o,pop:a,x:0,y:0,r:0}}placeOf(t){let e=this.cards.get(t);if(!e)return null;let n=e.walk?e.walk.to.X:e.puppet.restX,s=e.walk?e.walk.to.Z:e.restZ,r=e.walk?e.walk.pose?.yaw??e.yawTo:e.yawTo;return{id:e.id,at:this.rig.fractionOf(n,s).map(o=>Math.round(o*1e4)/1e4),mark:e.mark,yaw:Math.round(r*10)/10}}formationMoves(t,{ids:e=null,focus:n=null,target:s=null,speakers:r=[],party:o=!1,gait:a="walk",dir:l="back",away:c=!1,size:h=null}={}){let u=this.standing(),d=e?u.filter(M=>e.includes(M.id)):u,f=this.focus;if(Array.isArray(n))f=this.rig.place(n)??this.focus;else if(typeof n=="string"&&this.cards.has(n)){let M=this.cards.get(n);f={X:M.puppet.restX,Z:M.restZ}}let g=this.grow(f.Z),x=d.map(M=>({...M,w:M.w*g}));if(t==="position")return this.#f(x,f,{party:o,gait:a});let p=["huddle","gangup","queue"].includes(t),m=null;if(Number.isFinite(h)&&h>0){let M=this.rig.fractionOf(f.X,f.Z),R=this.rig.standing([M[0]-h/2,M[1]]),P=this.rig.standing([M[0]+h/2,M[1]]);R&&P&&(m=Math.abs(P.X-R.X)/2)}let _=this.cover(),E=Bm(t,{cards:x,focus:f,target:s,speakers:r,party:o,dir:l,radius:m,limits:{x:this.opts.limits.x,z:[this.opts.limits.z[0],200]},seed:this.steps%7}).filter(M=>this.cards.has(M.id)).map(M=>{let R=this.cards.get(M.id),P=this.grow(M.Z);return this.clearOfCover({...M,Z:this.unhidden(M.X,M.Z,R.w*P,R.h*P)},R,_)}),b=new Set(E.map(M=>M.id)),T=(M,R,P)=>{let I=this.cards.get(M),B=this.grow(P);return{id:M,X:R,Z:P,w:I.w*B,h:I.h*B,lift:this.riserFor(R,P,I.w*B,I.h*B)}},S=[...E.map(M=>T(M.id,M.X,M.Z)),...u.filter(M=>!b.has(M.id)).map(M=>T(M.id,M.X,M.Z))],A=new Map(Hm(this.rig,S,b,{limits:this.opts.limits.x}).map(M=>[M.id,M.X]));return E.map(M=>{let R=this.cards.get(M.id),P=A.get(M.id)??M.X,I=this.grow(M.Z);return this.clearOfCover({...M,X:P,Z:this.unhidden(P,M.Z,R.w*I,R.h*I)},R,_)}).map(M=>({id:M.id,at:this.rig.fractionOf(M.X,M.Z).map(R=>Math.round(R*1e4)/1e4),yaw:c?180:M.yaw,lean:c?0:M.lean,pitch:c?0:M.pitch,gait:a,still:!0,packed:p}))}#f(t,e,{party:n,gait:s}){let r=this.rig.fractionOf(e.X,e.Z),o=lr(this.zones.filter(p=>p.kind==="area"),r[0],r[1])[0]??lr(this.zones,r[0],r[1])[0]??null,a=t.filter(p=>n||!p.pc);if(!o)return this.formationMoves("line",{ids:a.map(p=>p.id),focus:r,party:!0,gait:s});let l=Math.max(...a.map(p=>p.w),120),c=new Set(a.map(p=>p.id)),h=[...this.cards.values()].filter(p=>!c.has(p.id)&&p.holder===null).map(p=>({X:p.walk?p.walk.to.X:p.puppet.restX,Z:p.walk?p.walk.to.Z:p.restZ})),u=this.cover(),d=a[0]?this.cards.get(a[0].id):null,f=nd(o,this.rig,{w:l*1.05,most:40}).filter(p=>!h.some(m=>Math.abs(m.X-p.X)<l*.6&&Math.abs(m.Z-p.Z)<90)).filter(p=>!d||this.coveredAt(p.X,p.Z,d,u)<=.15),g=[...a].sort((p,m)=>Math.hypot(p.X-e.X,p.Z-e.Z)-Math.hypot(m.X-e.X,m.Z-e.Z)),x=[];for(let p of g){if(!f.length)break;f.sort((_,E)=>Math.hypot(_.X-p.X,(_.Z-p.Z)*.8)-Math.hypot(E.X-p.X,(E.Z-p.Z)*.8));let m=f.shift();x.push({id:p.id,at:this.rig.fractionOf(m.X,m.Z).map(_=>Math.round(_*1e4)/1e4),yaw:0,lean:0,pitch:0,gait:s,still:!0,packed:!1})}return x}cover(){try{return this.coverFn?.()??[]}catch{return[]}}cardShapes(){let t=[];for(let e of this.cards.values()){let n=e.puppet.x,s=e.Z,r=this.grow(s),o=e.w*r,a=e.h*r,l=dl(this.rig,{X:n,Z:s,w:o,h:a,lift:this.riserFor(n,s,o,a)});[l.x0,l.y0,l.x1,l.y1].every(Number.isFinite)&&t.push({rect:[l.x0,l.y0,l.x1,l.y1]})}return t}coveredAt(t,e,n,s=this.cover()){if(!s.length)return 0;let r=this.grow(e),o=n.w*r,a=n.h*r;return zm(dl(this.rig,{X:t,Z:e,w:o,h:a,lift:this.riserFor(t,e,o,a)}),s)}clearOfCover(t,e,n=this.cover()){if(!n.length||this.coveredAt(t.X,t.Z,e,n)<=.15)return t;let s=this.rig.fractionOf(t.X,t.Z);for(let r=.0025;r<=.2;r+=.0025){let o=this.rig.place([s[0],s[1]-r]);if(o&&this.coveredAt(o.X,o.Z,e,n)<=.15-.01)return{...t,X:o.X,Z:o.Z}}return t}standing(){return[...this.cards.values()].filter(t=>t.holder===null).map(t=>({id:t.id,X:t.walk?t.walk.to.X:t.puppet.restX,Z:t.walk?t.walk.to.Z:t.restZ,w:t.w,pc:t.person.pc===!0}))}exportPlaces(){return[...this.cards.keys()].map(t=>this.placeOf(t))}},x_=60,ig=(i,t)=>Number.isFinite(i)&&Number.isFinite(t)&&i>t+x_;function y_(i,t){let e=Math.max(0,Math.min(1,(t-i.t0)/i.dur));if(e<=0)return .02;let n=1.9,s=n+1;return Math.max(.02,1+s*(e-1)**3+n*(e-1)**2)}var wl=class{constructor({limit:t=600,report:e=()=>{},onFatal:n=()=>{}}={}){this.limit=t,this.report=e,this.onFatal=n,this.failures=0,this.total=0}run(t){try{return t(),this.failures=0,!0}catch(e){return this.failures++,this.total++,(this.failures<=3||this.failures%300===0)&&this.report(e,this.failures),this.failures>=this.limit?(this.onFatal(e),!1):!0}}};var Vo=Object.freeze({every:33,heartbeat:1e3,delay:100,silent:2e3}),Wo=i=>Math.round(i),$i=i=>Math.round(i*10)/10,Sl=class{constructor({stage:t,scene:e,me:n,now:s,clock:r=s,send:o,mayHold:a=()=>!0,onLost:l=()=>{},onDrop:c=()=>{}}){Object.assign(this,{stage:t,scene:e,me:n,now:s,clock:r,mayHold:a,onLost:l,onDrop:c}),this.wire=o,this.mine=new Map,this.remote=new Map,this.sent=0}send(t){this.sent++,this.wire({scene:this.scene,...t})}holderOf(t){return this.mine.has(t)?this.me:this.remote.get(t)?.by??null}grab(t){let e=this.stage.cards.get(t);if(!e||!this.mayHold(t,this.me)||!this.stage.hold(t,this.me))return!1;let n=this.now();return this.mine.set(t,{stamp:{t:Wo(n),user:this.me},last:{t:n,x:e.hand.x,y:e.hand.z}}),this.send({type:"grab",id:t,t:Wo(n),x:$i(e.hand.x),z:$i(e.hand.z)}),!0}move(t,e,n){let s=this.mine.get(t);if(!s)return;this.stage.setHand(t,{x:e,z:n});let r=this.stage.cards.get(t).hand;this.#t(t,s,r,this.now())}#t(t,e,n,s){return Sm(e.last,n.x,n.z,s,Vo.every)?(e.last={t:s,x:n.x,y:n.z},e.moving=!0,this.send({type:"move",id:t,t:Wo(s),x:$i(n.x),z:$i(n.z)}),!0):!1}verb(t,e){this.mine.has(t)&&(this.stage.perform(t,e),this.send({type:"verb",id:t,verb:e}))}release(t){if(!this.mine.has(t))return null;this.mine.delete(t);let e=this.stage.landingFor(t);if(!e)return null;let n={X:$i(e.X),Z:$i(e.Z),mark:e.mark},s=this.stage.release(t,n);return s&&(this.send({type:"release",id:t,t:Wo(this.now()),X:n.X,Z:n.Z,mark:n.mark}),this.onDrop(s)),s}receive(t,e){!t||t.scene!==this.scene||e===this.me||this.stage.cards.has(t.id)&&(t.type==="grab"?this.#e(t,e):t.type==="move"?this.#n(t,e):t.type==="verb"?this.remote.get(t.id)?.by===e&&this.stage.perform(t.id,t.verb):t.type==="release"&&this.#r(t,e))}#e(t,e){if(!this.mayHold(t.id,e))return;let n={t:t.t,user:e},s=this.mine.get(t.id),r=this.remote.get(t.id),o=s?.stamp??r?.stamp??null;o&&r?.by!==e&&Tm(o,n)===o||(s&&(this.mine.delete(t.id),this.onLost(t.id)),this.#i(t,e,n))}#n(t,e){let n=this.remote.get(t.id);if(!n){if(this.mine.has(t.id)||!this.mayHold(t.id,e))return;this.#i(t,e,{t:t.t,user:e});return}n.by===e&&(n.buffer.push({t:t.t,x:t.x,y:t.z}),n.heard=this.clock())}#i(t,e,n){this.stage.hold(t.id,e)||this.stage.handOver(t.id,e);let s=new ol({delay:Vo.delay});s.push({t:t.t,x:t.x,y:t.z}),this.remote.set(t.id,{by:e,stamp:n,buffer:s,heard:this.clock()})}#r(t,e){let n=this.remote.get(t.id);if(!n||n.by!==e)return;this.remote.delete(t.id);let s=this.stage.release(t.id,{X:t.X,Z:t.Z,mark:t.mark??null});s&&this.onDrop(s)}forget(t){this.mine.delete(t),this.remote.delete(t)}userGone(t){for(let[e,n]of[...this.remote])n.by===t&&this.#s(e)}#s(t){this.remote.delete(t);let e=this.stage.release(t);e&&this.onDrop(e)}tick(){let t=this.now(),e=this.clock();for(let[n,s]of[...this.remote]){if(e-s.heard>Vo.silent){this.#s(n);continue}let r=s.buffer.at(t);r&&this.stage.setHand(n,{x:r.x,z:r.y})}for(let[n,s]of this.mine){let r=this.stage.cards.get(n)?.hand;if(!r||this.#t(n,s,r,t))continue;let o=t-s.last.t;(s.moving&&o>=Vo.every||o>=Vo.heartbeat)&&(s.moving=!1,s.last={t,x:r.x,y:r.z},this.send({type:"move",id:n,t:Wo(t),x:$i(r.x),z:$i(r.z)}))}}close(){for(let t of[...this.mine.keys()])this.release(t);this.remote.clear()}};function sg(i,t,e){let n=new Map(t.filter(r=>r&&typeof r.id=="string").map(r=>[r.id,r])),s=Math.round(e*1e3)/1e3;return i.map(r=>{let o=n.get(r.id);if(!o)return r;let a={...r};if(delete a.X,delete a.Z,delete a.enter,o.mark)a.mark=o.mark,delete a.at;else if(Array.isArray(o.at))a.at=[o.at[0],o.at[1]],delete a.mark;else return r;for(let l of["yaw","lean","pitch"])Number.isFinite(o[l])?a[l]=Math.round(o[l]*10)/10:l!=="yaw"&&delete a[l];return typeof o.still=="boolean"&&(a.still=o.still),typeof o.packed=="boolean"&&(a.packed=o.packed),a.move={t0:s,gait:o.gait??"walk"},a})}function rg(i,{gait:t="walk"}={}){let e=[];for(let n of i)!Array.isArray(n.home)||Array.isArray(n.at)&&Math.abs(n.at[0]-n.home[0])<1e-4&&Math.abs(n.at[1]-n.home[1])<1e-4&&!n.mark&&!n.still&&!n.packed||e.push({id:n.id,at:[n.home[0],n.home[1]],yaw:n.homeYaw??0,lean:0,pitch:0,gait:t,still:!1,packed:!1});return e}function og(i,t){return i.map(e=>{if(e.id!==t.id)return e;let n={...e,at:t.at,yaw:t.yaw};return delete n.X,delete n.Z,delete n.enter,delete n.packed,n.life&&(n.still=!0),t.mark?n.mark=t.mark:delete n.mark,n})}function ag(i,t,e=null){let n=new Map(t.filter(Boolean).map(s=>[s.id,s]));return i.map(s=>{let r=n.get(s.id);if(!r||e&&!e.includes(s.id)||!Array.isArray(r.at))return s;let o=Number.isFinite(r.yaw)?r.yaw:0;return Array.isArray(s.home)&&Math.abs(s.home[0]-r.at[0])<1e-4&&Math.abs(s.home[1]-r.at[1])<1e-4&&(s.homeYaw??0)===o?s:{...s,home:[r.at[0],r.at[1]],homeYaw:o}})}var Ng=0,Yd=1,Og=2;var Ns=1,Fg=2,$r=3,rs=0,fn=1,vn=2,On=0,os=1,pn=2,jd=3,Kd=4,Ug=5;var Os=100,Bg=101,zg=102,Hg=103,Gg=104,Vg=200,Wg=201,Xg=202,$g=203,Jd=204,Qd=205,Zg=206,qg=207,Yg=208,jg=209,Kg=210,Jg=211,Qg=212,t0=213,e0=214,Kl=0,Jl=1,Ql=2,Ir=3,tc=4,ec=5,nc=6,ic=7,tf=0,n0=1,i0=2,Cn=0,ef=1,nf=2,sf=3,rf=4,of=5,af=6,lf=7;var cf=300,as=301,Fs=302,Zr=303,Cc=304,Ma=306,sc=1e3,li=1001,rc=1002,je=1003,s0=1004;var wa=1005;var Be=1006,Rc=1007;var pi=1008;var _n=1009,hf=1010,uf=1011,qr=1012,Pc=1013,jn=1014,Kn=1015,We=1016,kc=1017,Ic=1018,Yr=1020,df=35902,ff=35899,pf=1021,mf=1022,bn=1023,ci=1026,ls=1027,gf=1028,Lc=1029,cs=1030,Dc=1031;var Nc=1033,Sa=33776,Ta=33777,Ea=33778,Aa=33779,Oc=35840,Fc=35841,Uc=35842,Bc=35843,zc=36196,Hc=37492,Gc=37496,Vc=37488,Wc=37489,Ca=37490,Xc=37491,$c=37808,Zc=37809,qc=37810,Yc=37811,jc=37812,Kc=37813,Jc=37814,Qc=37815,th=37816,eh=37817,nh=37818,ih=37819,sh=37820,rh=37821,oh=36492,ah=36494,lh=36495,ch=36283,hh=36284,Ra=36285,uh=36286;var Jo=2300,oc=2301,Yl=2302,Bd=2303,zd=2400,Hd=2401,Gd=2402;var r0=3200;var dh=0,o0=1,Di="",Ce="srgb",Qo="srgb-linear",ta="linear",ie="srgb";var jl=7680;var a0=519,l0=512,c0=513,h0=514,fh=515,u0=516,d0=517,ph=518,f0=519,xf=35044;var yf="300 es",Zn=2e3,Lr=2001;function v_(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function __(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function ea(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function p0(){let i=ea("canvas");return i.style.display="block",i}var lg={},Dr=null;function na(...i){let t="THREE."+i.shift();Dr?Dr("log",t,...i):console.log(t,...i)}function m0(i){let t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Ot(...i){i=m0(i);let t="THREE."+i.shift();if(Dr)Dr("warn",t,...i);else{let e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function Nt(...i){i=m0(i);let t="THREE."+i.shift();if(Dr)Dr("error",t,...i);else{let e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function ks(...i){let t=i.join(" ");t in lg||(lg[t]=!0,Ot(...i))}function g0(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}var x0={[Kl]:Jl,[Ql]:nc,[tc]:ic,[Ir]:ec,[Jl]:Kl,[nc]:Ql,[ic]:tc,[ec]:Ir},hi=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let s=n[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}},an=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];var md=Math.PI/180,ia=180/Math.PI;function Ji(){let i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(an[i&255]+an[i>>8&255]+an[i>>16&255]+an[i>>24&255]+"-"+an[t&255]+an[t>>8&255]+"-"+an[t>>16&15|64]+an[t>>24&255]+"-"+an[e&63|128]+an[e>>8&255]+"-"+an[e>>16&255]+an[e>>24&255]+an[n&255]+an[n>>8&255]+an[n>>16&255]+an[n>>24&255]).toLowerCase()}function jt(i,t,e){return Math.max(t,Math.min(e,i))}function b_(i,t){return(i%t+t)%t}function gd(i,t,e){return(1-e)*i+e*t}function ai(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:case Uint8ClampedArray:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function le(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var Mt=class i{static{i.prototype.isVector2=!0}constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=jt(this.x,t.x,e.x),this.y=jt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=jt(this.x,t,e),this.y=jt(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(jt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(jt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*n-o*s+t.x,this.y=r*s+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},di=class{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,o,a){let l=n[s+0],c=n[s+1],h=n[s+2],u=n[s+3],d=r[o+0],f=r[o+1],g=r[o+2],x=r[o+3];if(u!==x||l!==d||c!==f||h!==g){let p=l*d+c*f+h*g+u*x;p<0&&(d=-d,f=-f,g=-g,x=-x,p=-p);let m=1-a;if(p<.9995){let _=Math.acos(p),E=Math.sin(_);m=Math.sin(m*_)/E,a=Math.sin(a*_)/E,l=l*m+d*a,c=c*m+f*a,h=h*m+g*a,u=u*m+x*a}else{l=l*m+d*a,c=c*m+f*a,h=h*m+g*a,u=u*m+x*a;let _=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=_,c*=_,h*=_,u*=_}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=u}static multiplyQuaternionsFlat(t,e,n,s,r,o){let a=n[s],l=n[s+1],c=n[s+2],h=n[s+3],u=r[o],d=r[o+1],f=r[o+2],g=r[o+3];return t[e]=a*g+h*u+l*f-c*d,t[e+1]=l*g+h*d+c*u-a*f,t[e+2]=c*g+h*f+a*d-l*u,t[e+3]=h*g-a*u-l*d-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(s/2),u=a(r/2),d=l(n/2),f=l(s/2),g=l(r/2);switch(o){case"XYZ":this._x=d*h*u+c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u-d*f*g;break;case"YXZ":this._x=d*h*u+c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u+d*f*g;break;case"ZXY":this._x=d*h*u-c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u-d*f*g;break;case"ZYX":this._x=d*h*u-c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u+d*f*g;break;case"YZX":this._x=d*h*u+c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u-d*f*g;break;case"XZY":this._x=d*h*u-c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u+d*f*g;break;default:Ot("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],s=e[4],r=e[8],o=e[1],a=e[5],l=e[9],c=e[2],h=e[6],u=e[10],d=n+a+u;if(d>0){let f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(o-s)*f}else if(n>a&&n>u){let f=2*Math.sqrt(1+n-a-u);this._w=(h-l)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+c)/f}else if(a>u){let f=2*Math.sqrt(1+a-n-u);this._w=(r-c)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(l+h)/f}else{let f=2*Math.sqrt(1+u-n-a);this._w=(o-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(jt(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,s=t._y,r=t._z,o=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-s*a,this._w=o*h-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let n=t._x,s=t._y,r=t._z,o=t._w,a=this.dot(t);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-e;if(a<.9995){let c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},D=class i{static{i.prototype.isVector3=!0}constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(cg.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(cg.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(t){let e=this.x,n=this.y,s=this.z,r=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*s-a*n),h=2*(a*e-r*s),u=2*(r*n-o*e);return this.x=e+l*c+o*u-a*h,this.y=n+l*h+a*c-r*u,this.z=s+l*u+r*h-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=jt(this.x,t.x,e.x),this.y=jt(this.y,t.y,e.y),this.z=jt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=jt(this.x,t,e),this.y=jt(this.y,t,e),this.z=jt(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(jt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,s=t.y,r=t.z,o=e.x,a=e.y,l=e.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return xd.copy(this).projectOnVector(t),this.sub(xd)}reflect(t){return this.sub(xd.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(jt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},xd=new D,cg=new di,Ht=class i{static{i.prototype.isMatrix3=!0}constructor(t,e,n,s,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c)}set(t,e,n,s,r,o,a,l,c){let h=this.elements;return h[0]=t,h[1]=s,h[2]=a,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],u=n[7],d=n[2],f=n[5],g=n[8],x=s[0],p=s[3],m=s[6],_=s[1],E=s[4],b=s[7],T=s[2],S=s[5],A=s[8];return r[0]=o*x+a*_+l*T,r[3]=o*p+a*E+l*S,r[6]=o*m+a*b+l*A,r[1]=c*x+h*_+u*T,r[4]=c*p+h*E+u*S,r[7]=c*m+h*b+u*A,r[2]=d*x+f*_+g*T,r[5]=d*p+f*E+g*S,r[8]=d*m+f*b+g*A,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*o*h-e*a*c-n*r*h+n*a*l+s*r*c-s*o*l}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=h*o-a*c,d=a*l-h*r,f=c*r-o*l,g=e*u+n*d+s*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let x=1/g;return t[0]=u*x,t[1]=(s*c-h*n)*x,t[2]=(a*n-s*o)*x,t[3]=d*x,t[4]=(h*e-s*l)*x,t[5]=(s*r-a*e)*x,t[6]=f*x,t[7]=(n*l-c*e)*x,t[8]=(o*e-n*r)*x,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+t,-s*c,s*l,-s*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return ks("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(yd.makeScale(t,e)),this}rotate(t){return ks("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(yd.makeRotation(-t)),this}translate(t,e){return ks("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(yd.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}},yd=new Ht,hg=new Ht().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),ug=new Ht().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function M_(){let i={enabled:!0,workingColorSpace:Qo,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===ie&&(s.r=Ii(s.r),s.g=Ii(s.g),s.b=Ii(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===ie&&(s.r=kr(s.r),s.g=kr(s.g),s.b=kr(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Di?ta:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return ks("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return ks("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Qo]:{primaries:t,whitePoint:n,transfer:ta,toXYZ:hg,fromXYZ:ug,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:Ce},outputColorSpaceConfig:{drawingBufferColorSpace:Ce}},[Ce]:{primaries:t,whitePoint:n,transfer:ie,toXYZ:hg,fromXYZ:ug,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:Ce}}}),i}var Yt=M_();function Ii(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function kr(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var pr,ac=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{pr===void 0&&(pr=ea("canvas")),pr.width=t.width,pr.height=t.height;let s=pr.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=pr}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=ea("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Ii(r[o]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Ii(e[n]/255)*255):e[n]=Ii(e[n]);return{data:e,width:t.width,height:t.height}}else return Ot("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},w_=0,Nr=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:w_++}),this.uuid=Ji(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(vd(s[o].image)):r.push(vd(s[o]))}else r=vd(s);n.url=r}return e||(t.images[this.uuid]=n),n}};function vd(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?ac.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Ot("Texture: Unable to serialize Texture."),{})}var S_=0,_d=new D,Ve=class i extends hi{constructor(t=i.DEFAULT_IMAGE,e=i.DEFAULT_MAPPING,n=li,s=li,r=Be,o=pi,a=bn,l=_n,c=i.DEFAULT_ANISOTROPY,h=Di){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:S_++}),this.uuid=Ji(),this.name="",this.source=new Nr(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Mt(0,0),this.repeat=new Mt(1,1),this.center=new Mt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ht,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(_d).x}get height(){return this.source.getSize(_d).y}get depth(){return this.source.getSize(_d).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){Ot(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Ot(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==cf)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case sc:t.x=t.x-Math.floor(t.x);break;case li:t.x=t.x<0?0:1;break;case rc:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case sc:t.y=t.y-Math.floor(t.y);break;case li:t.y=t.y<0?0:1;break;case rc:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};Ve.DEFAULT_IMAGE=null;Ve.DEFAULT_MAPPING=cf;Ve.DEFAULT_ANISOTROPY=1;var _e=class i{static{i.prototype.isVector4=!0}constructor(t=0,e=0,n=0,s=1){this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*n+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r,l=t.elements,c=l[0],h=l[4],u=l[8],d=l[1],f=l[5],g=l[9],x=l[2],p=l[6],m=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-x)<.01&&Math.abs(g-p)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+x)<.1&&Math.abs(g+p)<.1&&Math.abs(c+f+m-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let E=(c+1)/2,b=(f+1)/2,T=(m+1)/2,S=(h+d)/4,A=(u+x)/4,v=(g+p)/4;return E>b&&E>T?E<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(E),s=S/n,r=A/n):b>T?b<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(b),n=S/s,r=v/s):T<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(T),n=A/r,s=v/r),this.set(n,s,r,e),this}let _=Math.sqrt((p-g)*(p-g)+(u-x)*(u-x)+(d-h)*(d-h));return Math.abs(_)<.001&&(_=1),this.x=(p-g)/_,this.y=(u-x)/_,this.z=(d-h)/_,this.w=Math.acos((c+f+m-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=jt(this.x,t.x,e.x),this.y=jt(this.y,t.y,e.y),this.z=jt(this.z,t.z,e.z),this.w=jt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=jt(this.x,t,e),this.y=jt(this.y,t,e),this.z=jt(this.z,t,e),this.w=jt(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(jt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},lc=class extends hi{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Be,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new _e(0,0,t,e),this.scissorTest=!1,this.viewport=new _e(0,0,t,e),this.textures=[];let s={width:t,height:e,depth:n.depth},r=new Ve(s),o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:Be,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new Nr(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Re=class extends lc{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},sa=class extends Ve{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=je,this.minFilter=je,this.wrapR=li,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var cc=class extends Ve{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=je,this.minFilter=je,this.wrapR=li,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var fe=class i{static{i.prototype.isMatrix4=!0}constructor(t,e,n,s,r,o,a,l,c,h,u,d,f,g,x,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c,h,u,d,f,g,x,p)}set(t,e,n,s,r,o,a,l,c,h,u,d,f,g,x,p){let m=this.elements;return m[0]=t,m[4]=e,m[8]=n,m[12]=s,m[1]=r,m[5]=o,m[9]=a,m[13]=l,m[2]=c,m[6]=h,m[10]=u,m[14]=d,m[3]=f,m[7]=g,m[11]=x,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,s=1/mr.setFromMatrixColumn(t,0).length(),r=1/mr.setFromMatrixColumn(t,1).length(),o=1/mr.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,s=t.y,r=t.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(t.order==="XYZ"){let d=o*h,f=o*u,g=a*h,x=a*u;e[0]=l*h,e[4]=-l*u,e[8]=c,e[1]=f+g*c,e[5]=d-x*c,e[9]=-a*l,e[2]=x-d*c,e[6]=g+f*c,e[10]=o*l}else if(t.order==="YXZ"){let d=l*h,f=l*u,g=c*h,x=c*u;e[0]=d+x*a,e[4]=g*a-f,e[8]=o*c,e[1]=o*u,e[5]=o*h,e[9]=-a,e[2]=f*a-g,e[6]=x+d*a,e[10]=o*l}else if(t.order==="ZXY"){let d=l*h,f=l*u,g=c*h,x=c*u;e[0]=d-x*a,e[4]=-o*u,e[8]=g+f*a,e[1]=f+g*a,e[5]=o*h,e[9]=x-d*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){let d=o*h,f=o*u,g=a*h,x=a*u;e[0]=l*h,e[4]=g*c-f,e[8]=d*c+x,e[1]=l*u,e[5]=x*c+d,e[9]=f*c-g,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){let d=o*l,f=o*c,g=a*l,x=a*c;e[0]=l*h,e[4]=x-d*u,e[8]=g*u+f,e[1]=u,e[5]=o*h,e[9]=-a*h,e[2]=-c*h,e[6]=f*u+g,e[10]=d-x*u}else if(t.order==="XZY"){let d=o*l,f=o*c,g=a*l,x=a*c;e[0]=l*h,e[4]=-u,e[8]=c*h,e[1]=d*u+x,e[5]=o*h,e[9]=f*u-g,e[2]=g*u-f,e[6]=a*h,e[10]=x*u+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(T_,t,E_)}lookAt(t,e,n){let s=this.elements;return Tn.subVectors(t,e),Tn.lengthSq()===0&&(Tn.z=1),Tn.normalize(),Zi.crossVectors(n,Tn),Zi.lengthSq()===0&&(Math.abs(n.z)===1?Tn.x+=1e-4:Tn.z+=1e-4,Tn.normalize(),Zi.crossVectors(n,Tn)),Zi.normalize(),Tl.crossVectors(Tn,Zi),s[0]=Zi.x,s[4]=Tl.x,s[8]=Tn.x,s[1]=Zi.y,s[5]=Tl.y,s[9]=Tn.y,s[2]=Zi.z,s[6]=Tl.z,s[10]=Tn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],u=n[5],d=n[9],f=n[13],g=n[2],x=n[6],p=n[10],m=n[14],_=n[3],E=n[7],b=n[11],T=n[15],S=s[0],A=s[4],v=s[8],M=s[12],R=s[1],P=s[5],I=s[9],B=s[13],k=s[2],U=s[6],V=s[10],q=s[14],nt=s[3],$=s[7],J=s[11],et=s[15];return r[0]=o*S+a*R+l*k+c*nt,r[4]=o*A+a*P+l*U+c*$,r[8]=o*v+a*I+l*V+c*J,r[12]=o*M+a*B+l*q+c*et,r[1]=h*S+u*R+d*k+f*nt,r[5]=h*A+u*P+d*U+f*$,r[9]=h*v+u*I+d*V+f*J,r[13]=h*M+u*B+d*q+f*et,r[2]=g*S+x*R+p*k+m*nt,r[6]=g*A+x*P+p*U+m*$,r[10]=g*v+x*I+p*V+m*J,r[14]=g*M+x*B+p*q+m*et,r[3]=_*S+E*R+b*k+T*nt,r[7]=_*A+E*P+b*U+T*$,r[11]=_*v+E*I+b*V+T*J,r[15]=_*M+E*B+b*q+T*et,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],o=t[1],a=t[5],l=t[9],c=t[13],h=t[2],u=t[6],d=t[10],f=t[14],g=t[3],x=t[7],p=t[11],m=t[15],_=l*f-c*d,E=a*f-c*u,b=a*d-l*u,T=o*f-c*h,S=o*d-l*h,A=o*u-a*h;return e*(x*_-p*E+m*b)-n*(g*_-p*T+m*S)+s*(g*E-x*T+m*A)-r*(g*b-x*S+p*A)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[1],o=t[5],a=t[9],l=t[2],c=t[6],h=t[10];return e*(o*h-a*c)-n*(r*h-a*l)+s*(r*c-o*l)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=t[9],d=t[10],f=t[11],g=t[12],x=t[13],p=t[14],m=t[15],_=e*a-n*o,E=e*l-s*o,b=e*c-r*o,T=n*l-s*a,S=n*c-r*a,A=s*c-r*l,v=h*x-u*g,M=h*p-d*g,R=h*m-f*g,P=u*p-d*x,I=u*m-f*x,B=d*m-f*p,k=_*B-E*I+b*P+T*R-S*M+A*v;if(k===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let U=1/k;return t[0]=(a*B-l*I+c*P)*U,t[1]=(s*I-n*B-r*P)*U,t[2]=(x*A-p*S+m*T)*U,t[3]=(d*S-u*A-f*T)*U,t[4]=(l*R-o*B-c*M)*U,t[5]=(e*B-s*R+r*M)*U,t[6]=(p*b-g*A-m*E)*U,t[7]=(h*A-d*b+f*E)*U,t[8]=(o*I-a*R+c*v)*U,t[9]=(n*R-e*I-r*v)*U,t[10]=(g*S-x*b+m*_)*U,t[11]=(u*b-h*S-f*_)*U,t[12]=(a*M-o*P-l*v)*U,t[13]=(e*P-n*M+s*v)*U,t[14]=(x*E-g*T-p*_)*U,t[15]=(h*T-u*E+d*_)*U,this}scale(t){let e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),s=Math.sin(e),r=1-n,o=t.x,a=t.y,l=t.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+n,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,o){return this.set(1,n,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){let s=this.elements,r=e._x,o=e._y,a=e._z,l=e._w,c=r+r,h=o+o,u=a+a,d=r*c,f=r*h,g=r*u,x=o*h,p=o*u,m=a*u,_=l*c,E=l*h,b=l*u,T=n.x,S=n.y,A=n.z;return s[0]=(1-(x+m))*T,s[1]=(f+b)*T,s[2]=(g-E)*T,s[3]=0,s[4]=(f-b)*S,s[5]=(1-(d+m))*S,s[6]=(p+_)*S,s[7]=0,s[8]=(g+E)*A,s[9]=(p-_)*A,s[10]=(1-(d+x))*A,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let o=mr.set(s[0],s[1],s[2]).length(),a=mr.set(s[4],s[5],s[6]).length(),l=mr.set(s[8],s[9],s[10]).length();r<0&&(o=-o),Wn.copy(this);let c=1/o,h=1/a,u=1/l;return Wn.elements[0]*=c,Wn.elements[1]*=c,Wn.elements[2]*=c,Wn.elements[4]*=h,Wn.elements[5]*=h,Wn.elements[6]*=h,Wn.elements[8]*=u,Wn.elements[9]*=u,Wn.elements[10]*=u,e.setFromRotationMatrix(Wn),n.x=o,n.y=a,n.z=l,this}makePerspective(t,e,n,s,r,o,a=Zn,l=!1){let c=this.elements,h=2*r/(e-t),u=2*r/(n-s),d=(e+t)/(e-t),f=(n+s)/(n-s),g,x;if(l)g=r/(o-r),x=o*r/(o-r);else if(a===Zn)g=-(o+r)/(o-r),x=-2*o*r/(o-r);else if(a===Lr)g=-o/(o-r),x=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,o,a=Zn,l=!1){let c=this.elements,h=2/(e-t),u=2/(n-s),d=-(e+t)/(e-t),f=-(n+s)/(n-s),g,x;if(l)g=1/(o-r),x=o/(o-r);else if(a===Zn)g=-2/(o-r),x=-(o+r)/(o-r);else if(a===Lr)g=-1/(o-r),x=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}},mr=new D,Wn=new fe,T_=new D(0,0,0),E_=new D(1,1,1),Zi=new D,Tl=new D,Tn=new D,dg=new fe,fg=new di,Li=class i{constructor(t=0,e=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let s=t.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],u=s[2],d=s[6],f=s[10];switch(e){case"XYZ":this._y=Math.asin(jt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-jt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(jt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-jt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(jt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-jt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Ot("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return dg.makeRotationFromQuaternion(t),this.setFromRotationMatrix(dg,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return fg.setFromEuler(this),this.setFromQuaternion(fg,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Li.DEFAULT_ORDER="XYZ";var Or=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},A_=0,pg=new D,gr=new di,Ei=new fe,El=new D,Xo=new D,C_=new D,R_=new di,mg=new D(1,0,0),gg=new D(0,1,0),xg=new D(0,0,1),yg={type:"added"},P_={type:"removed"},xr={type:"childadded",child:null},bd={type:"childremoved",child:null},en=class i extends hi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:A_++}),this.uuid=Ji(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let t=new D,e=new Li,n=new di,s=new D(1,1,1);function r(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new fe},normalMatrix:{value:new Ht}}),this.matrix=new fe,this.matrixWorld=new fe,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Or,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return gr.setFromAxisAngle(t,e),this.quaternion.multiply(gr),this}rotateOnWorldAxis(t,e){return gr.setFromAxisAngle(t,e),this.quaternion.premultiply(gr),this}rotateX(t){return this.rotateOnAxis(mg,t)}rotateY(t){return this.rotateOnAxis(gg,t)}rotateZ(t){return this.rotateOnAxis(xg,t)}translateOnAxis(t,e){return pg.copy(t).applyQuaternion(this.quaternion),this.position.add(pg.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(mg,t)}translateY(t){return this.translateOnAxis(gg,t)}translateZ(t){return this.translateOnAxis(xg,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Ei.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?El.copy(t):El.set(t,e,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Xo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Ei.lookAt(Xo,El,this.up):Ei.lookAt(El,Xo,this.up),this.quaternion.setFromRotationMatrix(Ei),s&&(Ei.extractRotation(s.matrixWorld),gr.setFromRotationMatrix(Ei),this.quaternion.premultiply(gr.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(Nt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(yg),xr.child=t,this.dispatchEvent(xr),xr.child=null):Nt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(P_),bd.child=t,this.dispatchEvent(bd),bd.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Ei.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Ei.multiply(t.parent.matrixWorld)),t.applyMatrix4(Ei),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(yg),xr.child=t,this.dispatchEvent(xr),xr.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){let o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Xo,t,C_),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Xo,R_,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,n=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*s,r[13]+=n-r[1]*e-r[5]*n-r[9]*s,r[14]+=s-r[2]*e-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){let r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let u=l[c];r(t.shapes,u)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(t.materials,this.material[l]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];s.animations.push(r(t.animations,l))}}if(e){let a=o(t.geometries),l=o(t.materials),c=o(t.textures),h=o(t.images),u=o(t.shapes),d=o(t.skeletons),f=o(t.animations),g=o(t.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=s,n;function o(a){let l=[];for(let c in a){let h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let s=t.children[n];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};en.DEFAULT_UP=new D(0,1,0);en.DEFAULT_MATRIX_AUTO_UPDATE=!0;en.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Ge=class extends en{constructor(){super(),this.isGroup=!0,this.type="Group"}},k_={type:"move"},Fr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ge,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ge,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new D,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new D),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ge,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new D,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new D,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(let x of t.hand.values()){let p=e.getJointPose(x,n),m=this._getHandJoint(c,x);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}let h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,g=.005;c.inputState.pinching&&d>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&d<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));a!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(k_)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new Ge;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}},y0={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},qi={h:0,s:0,l:0},Al={h:0,s:0,l:0};function Md(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}var Ct=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Ce){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Yt.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=Yt.workingColorSpace){return this.r=t,this.g=e,this.b=n,Yt.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=Yt.workingColorSpace){if(t=b_(t,1),e=jt(e,0,1),n=jt(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,o=2*n-r;this.r=Md(o,r,t+1/3),this.g=Md(o,r,t),this.b=Md(o,r,t-1/3)}return Yt.colorSpaceToWorking(this,s),this}setStyle(t,e=Ce){function n(r){r!==void 0&&parseFloat(r)<1&&Ot("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Ot("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);Ot("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Ce){let n=y0[t.toLowerCase()];return n!==void 0?this.setHex(n,e):Ot("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Ii(t.r),this.g=Ii(t.g),this.b=Ii(t.b),this}copyLinearToSRGB(t){return this.r=kr(t.r),this.g=kr(t.g),this.b=kr(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Ce){return Yt.workingToColorSpace(ln.copy(this),t),Math.round(jt(ln.r*255,0,255))*65536+Math.round(jt(ln.g*255,0,255))*256+Math.round(jt(ln.b*255,0,255))}getHexString(t=Ce){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Yt.workingColorSpace){Yt.workingToColorSpace(ln.copy(this),e);let n=ln.r,s=ln.g,r=ln.b,o=Math.max(n,s,r),a=Math.min(n,s,r),l,c,h=(a+o)/2;if(a===o)l=0,c=0;else{let u=o-a;switch(c=h<=.5?u/(o+a):u/(2-o-a),o){case n:l=(s-r)/u+(s<r?6:0);break;case s:l=(r-n)/u+2;break;case r:l=(n-s)/u+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=Yt.workingColorSpace){return Yt.workingToColorSpace(ln.copy(this),e),t.r=ln.r,t.g=ln.g,t.b=ln.b,t}getStyle(t=Ce){Yt.workingToColorSpace(ln.copy(this),t);let e=ln.r,n=ln.g,s=ln.b;return t!==Ce?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(qi),this.setHSL(qi.h+t,qi.s+e,qi.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(qi),t.getHSL(Al);let n=gd(qi.h,Al.h,e),s=gd(qi.s,Al.s,e),r=gd(qi.l,Al.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},ln=new Ct;Ct.NAMES=y0;var ra=class extends en{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Li,this.environmentIntensity=1,this.environmentRotation=new Li,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},Xn=new D,Ai=new D,wd=new D,Ci=new D,yr=new D,vr=new D,vg=new D,Sd=new D,Td=new D,Ed=new D,Ad=new _e,Cd=new _e,Rd=new _e,ki=class i{constructor(t=new D,e=new D,n=new D){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),Xn.subVectors(t,e),s.cross(Xn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){Xn.subVectors(s,e),Ai.subVectors(n,e),wd.subVectors(t,e);let o=Xn.dot(Xn),a=Xn.dot(Ai),l=Xn.dot(wd),c=Ai.dot(Ai),h=Ai.dot(wd),u=o*c-a*a;if(u===0)return r.set(0,0,0),null;let d=1/u,f=(c*l-a*h)*d,g=(o*h-a*l)*d;return r.set(1-f-g,g,f)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,Ci)===null?!1:Ci.x>=0&&Ci.y>=0&&Ci.x+Ci.y<=1}static getInterpolation(t,e,n,s,r,o,a,l){return this.getBarycoord(t,e,n,s,Ci)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Ci.x),l.addScaledVector(o,Ci.y),l.addScaledVector(a,Ci.z),l)}static getInterpolatedAttribute(t,e,n,s,r,o){return Ad.setScalar(0),Cd.setScalar(0),Rd.setScalar(0),Ad.fromBufferAttribute(t,e),Cd.fromBufferAttribute(t,n),Rd.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(Ad,r.x),o.addScaledVector(Cd,r.y),o.addScaledVector(Rd,r.z),o}static isFrontFacing(t,e,n,s){return Xn.subVectors(n,e),Ai.subVectors(t,e),Xn.cross(Ai).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Xn.subVectors(this.c,this.b),Ai.subVectors(this.a,this.b),Xn.cross(Ai).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return i.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,s=this.b,r=this.c,o,a;yr.subVectors(s,n),vr.subVectors(r,n),Sd.subVectors(t,n);let l=yr.dot(Sd),c=vr.dot(Sd);if(l<=0&&c<=0)return e.copy(n);Td.subVectors(t,s);let h=yr.dot(Td),u=vr.dot(Td);if(h>=0&&u<=h)return e.copy(s);let d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return o=l/(l-h),e.copy(n).addScaledVector(yr,o);Ed.subVectors(t,r);let f=yr.dot(Ed),g=vr.dot(Ed);if(g>=0&&f<=g)return e.copy(r);let x=f*c-l*g;if(x<=0&&c>=0&&g<=0)return a=c/(c-g),e.copy(n).addScaledVector(vr,a);let p=h*g-f*u;if(p<=0&&u-h>=0&&f-g>=0)return vg.subVectors(r,s),a=(u-h)/(u-h+(f-g)),e.copy(s).addScaledVector(vg,a);let m=1/(p+x+d);return o=x*m,a=d*m,e.copy(n).addScaledVector(yr,o).addScaledVector(vr,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},Qi=class{constructor(t=new D(1/0,1/0,1/0),e=new D(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint($n.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint($n.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=$n.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,$n):$n.fromBufferAttribute(r,o),$n.applyMatrix4(t.matrixWorld),this.expandByPoint($n);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Cl.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Cl.copy(n.boundingBox)),Cl.applyMatrix4(t.matrixWorld),this.union(Cl)}let s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,$n),$n.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter($o),Rl.subVectors(this.max,$o),_r.subVectors(t.a,$o),br.subVectors(t.b,$o),Mr.subVectors(t.c,$o),Yi.subVectors(br,_r),ji.subVectors(Mr,br),As.subVectors(_r,Mr);let e=[0,-Yi.z,Yi.y,0,-ji.z,ji.y,0,-As.z,As.y,Yi.z,0,-Yi.x,ji.z,0,-ji.x,As.z,0,-As.x,-Yi.y,Yi.x,0,-ji.y,ji.x,0,-As.y,As.x,0];return!Pd(e,_r,br,Mr,Rl)||(e=[1,0,0,0,1,0,0,0,1],!Pd(e,_r,br,Mr,Rl))?!1:(Pl.crossVectors(Yi,ji),e=[Pl.x,Pl.y,Pl.z],Pd(e,_r,br,Mr,Rl))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,$n).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize($n).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Ri[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Ri[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Ri[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Ri[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Ri[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Ri[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Ri[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Ri[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Ri),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},Ri=[new D,new D,new D,new D,new D,new D,new D,new D],$n=new D,Cl=new Qi,_r=new D,br=new D,Mr=new D,Yi=new D,ji=new D,As=new D,$o=new D,Rl=new D,Pl=new D,Cs=new D;function Pd(i,t,e,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){Cs.fromArray(i,r);let a=s.x*Math.abs(Cs.x)+s.y*Math.abs(Cs.y)+s.z*Math.abs(Cs.z),l=t.dot(Cs),c=e.dot(Cs),h=n.dot(Cs);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}var Fe=new D,kl=new Mt,I_=0,Ue=class extends hi{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:I_++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=xf,this.updateRanges=[],this.gpuType=Kn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)kl.fromBufferAttribute(this,e),kl.applyMatrix3(t),this.setXY(e,kl.x,kl.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Fe.fromBufferAttribute(this,e),Fe.applyMatrix3(t),this.setXYZ(e,Fe.x,Fe.y,Fe.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Fe.fromBufferAttribute(this,e),Fe.applyMatrix4(t),this.setXYZ(e,Fe.x,Fe.y,Fe.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Fe.fromBufferAttribute(this,e),Fe.applyNormalMatrix(t),this.setXYZ(e,Fe.x,Fe.y,Fe.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Fe.fromBufferAttribute(this,e),Fe.transformDirection(t),this.setXYZ(e,Fe.x,Fe.y,Fe.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=ai(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=le(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=ai(e,this.array)),e}setX(t,e){return this.normalized&&(e=le(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=ai(e,this.array)),e}setY(t,e){return this.normalized&&(e=le(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=ai(e,this.array)),e}setZ(t,e){return this.normalized&&(e=le(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=ai(e,this.array)),e}setW(t,e){return this.normalized&&(e=le(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=le(e,this.array),n=le(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=le(e,this.array),n=le(n,this.array),s=le(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=le(e,this.array),n=le(n,this.array),s=le(s,this.array),r=le(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}};var oa=class extends Ue{constructor(t,e,n){super(new Uint16Array(t),e,n)}};var aa=class extends Ue{constructor(t,e,n){super(new Uint32Array(t),e,n)}};var Jt=class extends Ue{constructor(t,e,n){super(new Float32Array(t),e,n)}},L_=new Qi,Zo=new D,kd=new D,Is=class{constructor(t=new D,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):L_.setFromPoints(t).getCenter(n);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Zo.subVectors(t,this.center);let e=Zo.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(Zo,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(kd.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Zo.copy(t.center).add(kd)),this.expandByPoint(Zo.copy(t.center).sub(kd))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},D_=0,Dn=new fe,Id=new en,wr=new D,En=new Qi,qo=new Qi,qe=new D,be=class i extends hi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:D_++}),this.uuid=Ji(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(v_(t)?aa:oa)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Ht().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return Dn.makeRotationFromQuaternion(t),this.applyMatrix4(Dn),this}rotateX(t){return Dn.makeRotationX(t),this.applyMatrix4(Dn),this}rotateY(t){return Dn.makeRotationY(t),this.applyMatrix4(Dn),this}rotateZ(t){return Dn.makeRotationZ(t),this.applyMatrix4(Dn),this}translate(t,e,n){return Dn.makeTranslation(t,e,n),this.applyMatrix4(Dn),this}scale(t,e,n){return Dn.makeScale(t,e,n),this.applyMatrix4(Dn),this}lookAt(t){return Id.lookAt(t),Id.updateMatrix(),this.applyMatrix4(Id.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(wr).negate(),this.translate(wr.x,wr.y,wr.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let s=0,r=t.length;s<r;s++){let o=t[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Jt(n,3))}else{let n=Math.min(t.length,e.count);for(let s=0;s<n;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&Ot("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Qi);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new D(-1/0,-1/0,-1/0),new D(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){let r=e[n];En.setFromBufferAttribute(r),this.morphTargetsRelative?(qe.addVectors(this.boundingBox.min,En.min),this.boundingBox.expandByPoint(qe),qe.addVectors(this.boundingBox.max,En.max),this.boundingBox.expandByPoint(qe)):(this.boundingBox.expandByPoint(En.min),this.boundingBox.expandByPoint(En.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Nt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Is);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new D,1/0);return}if(t){let n=this.boundingSphere.center;if(En.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){let a=e[r];qo.setFromBufferAttribute(a),this.morphTargetsRelative?(qe.addVectors(En.min,qo.min),En.expandByPoint(qe),qe.addVectors(En.max,qo.max),En.expandByPoint(qe)):(En.expandByPoint(qo.min),En.expandByPoint(qo.max))}En.getCenter(n);let s=0;for(let r=0,o=t.count;r<o;r++)qe.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(qe));if(e)for(let r=0,o=e.length;r<o;r++){let a=e[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)qe.fromBufferAttribute(a,c),l&&(wr.fromBufferAttribute(t,c),qe.add(wr)),s=Math.max(s,n.distanceToSquared(qe))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Nt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Nt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,s=e.normal,r=e.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new Ue(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));let a=[],l=[];for(let v=0;v<n.count;v++)a[v]=new D,l[v]=new D;let c=new D,h=new D,u=new D,d=new Mt,f=new Mt,g=new Mt,x=new D,p=new D;function m(v,M,R){c.fromBufferAttribute(n,v),h.fromBufferAttribute(n,M),u.fromBufferAttribute(n,R),d.fromBufferAttribute(r,v),f.fromBufferAttribute(r,M),g.fromBufferAttribute(r,R),h.sub(c),u.sub(c),f.sub(d),g.sub(d);let P=1/(f.x*g.y-g.x*f.y);isFinite(P)&&(x.copy(h).multiplyScalar(g.y).addScaledVector(u,-f.y).multiplyScalar(P),p.copy(u).multiplyScalar(f.x).addScaledVector(h,-g.x).multiplyScalar(P),a[v].add(x),a[M].add(x),a[R].add(x),l[v].add(p),l[M].add(p),l[R].add(p))}let _=this.groups;_.length===0&&(_=[{start:0,count:t.count}]);for(let v=0,M=_.length;v<M;++v){let R=_[v],P=R.start,I=R.count;for(let B=P,k=P+I;B<k;B+=3)m(t.getX(B+0),t.getX(B+1),t.getX(B+2))}let E=new D,b=new D,T=new D,S=new D;function A(v){T.fromBufferAttribute(s,v),S.copy(T);let M=a[v];E.copy(M),E.sub(T.multiplyScalar(T.dot(M))).normalize(),b.crossVectors(S,M);let P=b.dot(l[v])<0?-1:1;o.setXYZW(v,E.x,E.y,E.z,P)}for(let v=0,M=_.length;v<M;++v){let R=_[v],P=R.start,I=R.count;for(let B=P,k=P+I;B<k;B+=3)A(t.getX(B+0)),A(t.getX(B+1)),A(t.getX(B+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new Ue(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);let s=new D,r=new D,o=new D,a=new D,l=new D,c=new D,h=new D,u=new D;if(t)for(let d=0,f=t.count;d<f;d+=3){let g=t.getX(d+0),x=t.getX(d+1),p=t.getX(d+2);s.fromBufferAttribute(e,g),r.fromBufferAttribute(e,x),o.fromBufferAttribute(e,p),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,x),c.fromBufferAttribute(n,p),a.add(h),l.add(h),c.add(h),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(x,l.x,l.y,l.z),n.setXYZ(p,c.x,c.y,c.z)}else for(let d=0,f=e.count;d<f;d+=3)s.fromBufferAttribute(e,d+0),r.fromBufferAttribute(e,d+1),o.fromBufferAttribute(e,d+2),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)qe.fromBufferAttribute(t,e),qe.normalize(),t.setXYZ(e,qe.x,qe.y,qe.z)}toNonIndexed(){function t(a,l){let c=a.array,h=a.itemSize,u=a.normalized,d=new c.constructor(l.length*h),f=0,g=0;for(let x=0,p=l.length;x<p;x++){a.isInterleavedBufferAttribute?f=l[x]*a.data.stride+a.offset:f=l[x]*h;for(let m=0;m<h;m++)d[g++]=c[f++]}return new Ue(d,h,u)}if(this.index===null)return Ot("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new i,n=this.index.array,s=this.attributes;for(let a in s){let l=s[a],c=t(l,n);e.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let h=0,u=c.length;h<u;h++){let d=c[h],f=t(d,n);l.push(f)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let l in n){let c=n[l];t.data.attributes[l]=c.toJSON(t.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){let f=c[u];h.push(f.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let s=t.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(e))}let r=t.morphAttributes;for(let c in r){let h=[],u=r[c];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let o=t.groups;for(let c=0,h=o.length;c<h;c++){let u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}let a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}},hc=class{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=xf,this.updateRanges=[],this.version=0,this.uuid=Ji()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,n){t*=this.stride,n*=e.stride;for(let s=0,r=this.stride;s<r;s++)this.array[t+s]=e.array[n+s];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ji()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let e=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(e,this.stride);return n.setUsage(this.usage),n}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ji()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer)));let e={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return e.usage=this.usage,e}},dn=new D,la=class i{constructor(t,e,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,n=this.data.count;e<n;e++)dn.fromBufferAttribute(this,e),dn.applyMatrix4(t),this.setXYZ(e,dn.x,dn.y,dn.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)dn.fromBufferAttribute(this,e),dn.applyNormalMatrix(t),this.setXYZ(e,dn.x,dn.y,dn.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)dn.fromBufferAttribute(this,e),dn.transformDirection(t),this.setXYZ(e,dn.x,dn.y,dn.z);return this}getComponent(t,e){let n=this.array[t*this.data.stride+this.offset+e];return this.normalized&&(n=ai(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=le(n,this.array)),this.data.array[t*this.data.stride+this.offset+e]=n,this}setX(t,e){return this.normalized&&(e=le(e,this.array)),this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.normalized&&(e=le(e,this.array)),this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.normalized&&(e=le(e,this.array)),this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.normalized&&(e=le(e,this.array)),this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(e=ai(e,this.array)),e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(e=ai(e,this.array)),e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(e=ai(e,this.array)),e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(e=ai(e,this.array)),e}setXY(t,e,n){return t=t*this.data.stride+this.offset,this.normalized&&(e=le(e,this.array),n=le(n,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this}setXYZ(t,e,n,s){return t=t*this.data.stride+this.offset,this.normalized&&(e=le(e,this.array),n=le(n,this.array),s=le(s,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t=t*this.data.stride+this.offset,this.normalized&&(e=le(e,this.array),n=le(n,this.array),s=le(s,this.array),r=le(r,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=s,this.data.array[t+3]=r,this}clone(t){if(t===void 0){na("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return new Ue(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new i(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){na("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},Ld=new D,N_=new D,O_=new Ht,yn=class{constructor(t=new D(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let s=Ld.subVectors(n,e).cross(N_.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let s=t.delta(Ld),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let o=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:e.copy(t.start).addScaledVector(s,o)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||O_.getNormalMatrix(t),s=this.coplanarPoint(Ld).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},F_=0,qn=class extends hi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:F_++}),this.uuid=Ji(),this.name="",this.type="Material",this.blending=os,this.side=rs,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Jd,this.blendDst=Qd,this.blendEquation=Os,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ct(0,0,0),this.blendAlpha=0,this.depthFunc=Ir,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=a0,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=jl,this.stencilZFail=jl,this.stencilZPass=jl,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){Ot(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Ot(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(e){let r=s(t.textures),o=s(t.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new Ct().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new yn().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new Mt().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new Mt().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}},Nn=class extends qn{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Ct(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},Sr,Yo=new D,Tr=new D,Er=new D,Ar=new Mt,jo=new Mt,v0=new fe,Il=new D,Ko=new D,Ll=new D,_g=new Mt,Dd=new Mt,bg=new Mt,Yn=class extends en{constructor(t=new Nn){if(super(),this.isSprite=!0,this.type="Sprite",Sr===void 0){Sr=new be;let e=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new hc(e,5);Sr.setIndex([0,1,2,0,2,3]),Sr.setAttribute("position",new la(n,3,0,!1)),Sr.setAttribute("uv",new la(n,2,3,!1))}this.geometry=Sr,this.material=t,this.center=new Mt(.5,.5),this.count=1}intersectsFrustum(t){return t.intersectsSprite(this)}raycast(t,e){t.camera===null&&Nt('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),Tr.setFromMatrixScale(this.matrixWorld),v0.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),Er.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Tr.multiplyScalar(-Er.z);let n=this.material.rotation,s,r;n!==0&&(r=Math.cos(n),s=Math.sin(n));let o=this.center;Dl(Il.set(-.5,-.5,0),Er,o,Tr,s,r),Dl(Ko.set(.5,-.5,0),Er,o,Tr,s,r),Dl(Ll.set(.5,.5,0),Er,o,Tr,s,r),_g.set(0,0),Dd.set(1,0),bg.set(1,1);let a=t.ray.intersectTriangle(Il,Ko,Ll,!1,Yo);if(a===null&&(Dl(Ko.set(-.5,.5,0),Er,o,Tr,s,r),Dd.set(0,1),a=t.ray.intersectTriangle(Il,Ll,Ko,!1,Yo),a===null))return;let l=t.ray.origin.distanceTo(Yo);l<t.near||l>t.far||e.push({distance:l,point:Yo.clone(),uv:ki.getInterpolation(Yo,Il,Ko,Ll,_g,Dd,bg,new Mt),face:null,object:this})}copy(t,e){return super.copy(t,e),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}};function Dl(i,t,e,n,s,r){Ar.subVectors(i,e).addScalar(.5).multiply(n),s!==void 0?(jo.x=r*Ar.x-s*Ar.y,jo.y=s*Ar.x+r*Ar.y):jo.copy(Ar),i.copy(t),i.x+=jo.x,i.y+=jo.y,i.applyMatrix4(v0)}var Pi=new D,Nd=new D,Nl=new D,Ol=new D,Ur=class{constructor(t=new D,e=new D(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Pi)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=Pi.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Pi.copy(this.origin).addScaledVector(this.direction,e),Pi.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){Nd.copy(t).add(e).multiplyScalar(.5),Nl.copy(e).sub(t).normalize(),Ol.copy(this.origin).sub(Nd);let r=t.distanceTo(e)*.5,o=-this.direction.dot(Nl),a=Ol.dot(this.direction),l=-Ol.dot(Nl),c=Ol.lengthSq(),h=Math.abs(1-o*o),u,d,f,g;if(h>0)if(u=o*l-a,d=o*a-l,g=r*h,u>=0)if(d>=-g)if(d<=g){let x=1/h;u*=x,d*=x,f=u*(u+o*d+2*a)+d*(o*u+d+2*l)+c}else d=r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d=-r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d<=-g?(u=Math.max(0,-(-o*r+a)),d=u>0?-r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c):d<=g?(u=0,d=Math.min(Math.max(-r,-l),r),f=d*(d+2*l)+c):(u=Math.max(0,-(o*r+a)),d=u>0?r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c);else d=o>0?-r:r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(Nd).addScaledVector(Nl,d),f}intersectSphere(t,e){if(t.radius<0)return null;Pi.subVectors(t.center,this.origin);let n=Pi.dot(this.direction),s=Pi.dot(Pi)-n*n,r=t.radius*t.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,o,a,l,c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(t.min.x-d.x)*c,s=(t.max.x-d.x)*c):(n=(t.max.x-d.x)*c,s=(t.min.x-d.x)*c),h>=0?(r=(t.min.y-d.y)*h,o=(t.max.y-d.y)*h):(r=(t.max.y-d.y)*h,o=(t.min.y-d.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),u>=0?(a=(t.min.z-d.z)*u,l=(t.max.z-d.z)*u):(a=(t.max.z-d.z)*u,l=(t.min.z-d.z)*u),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,Pi)!==null}intersectTriangle(t,e,n,s,r){let o=this.origin,a=this.direction,l=a.x,c=a.y,h=a.z,u=t.x-o.x,d=t.y-o.y,f=t.z-o.z,g=e.x-o.x,x=e.y-o.y,p=e.z-o.z,m=n.x-o.x,_=n.y-o.y,E=n.z-o.z,b=Math.abs(l),T=Math.abs(c),S=Math.abs(h),A,v,M,R,P,I,B,k,U,V,q,nt;if(b>=T&&b>=S?(M=l,I=u,U=g,nt=m,l>=0?(A=c,v=h,R=d,P=f,B=x,k=p,V=_,q=E):(A=h,v=c,R=f,P=d,B=p,k=x,V=E,q=_)):T>=S?(M=c,I=d,U=x,nt=_,c>=0?(A=h,v=l,R=f,P=u,B=p,k=g,V=E,q=m):(A=l,v=h,R=u,P=f,B=g,k=p,V=m,q=E)):(M=h,I=f,U=p,nt=E,h>=0?(A=l,v=c,R=u,P=d,B=g,k=x,V=m,q=_):(A=c,v=l,R=d,P=u,B=x,k=g,V=_,q=m)),M===0)return null;let $=A/M,J=v/M,et=1/M,at=R-$*I,rt=P-J*I,zt=B-$*U,It=k-J*U,Lt=V-$*nt,X=q-J*nt,Q=Lt*It-X*zt,yt=at*X-rt*Lt,Bt=zt*rt-It*at;if(s){if(Q<0||yt<0||Bt<0)return null}else if((Q<0||yt<0||Bt<0)&&(Q>0||yt>0||Bt>0))return null;let _t=Q+yt+Bt;if(_t===0)return null;let Xt=et*(Q*I+yt*U+Bt*nt);return(_t>0?Xt<0:Xt>0)?null:this.at(Xt/_t,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},we=class extends qn{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ct(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Li,this.combine=tf,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},Mg=new fe,Rs=new Ur,Fl=new Is,wg=new D,Ul=new D,Bl=new D,zl=new D,Od=new D,Hl=new D,Sg=new D,Gl=new D,Ut=class extends en{constructor(t=new be,e=new we){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;e.fromBufferAttribute(s,t);let a=this.morphTargetInfluences;if(r&&a){Hl.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=a[l],u=r[l];h!==0&&(Od.fromBufferAttribute(u,t),o?Hl.addScaledVector(Od,h):Hl.addScaledVector(Od.sub(e),h))}e.add(Hl)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Fl.copy(n.boundingSphere),Fl.applyMatrix4(r),Rs.copy(t.ray).recast(t.near),!(Fl.containsPoint(Rs.origin)===!1&&(Rs.intersectSphere(Fl,wg)===null||Rs.origin.distanceToSquared(wg)>(t.far-t.near)**2))&&(Mg.copy(r).invert(),Rs.copy(t.ray).applyMatrix4(Mg),!(n.boundingBox!==null&&Rs.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,Rs)))}_computeIntersections(t,e,n){let s,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,x=d.length;g<x;g++){let p=d[g],m=o[p.materialIndex],_=Math.max(p.start,f.start),E=Math.min(a.count,Math.min(p.start+p.count,f.start+f.count));for(let b=_,T=E;b<T;b+=3){let S=a.getX(b),A=a.getX(b+1),v=a.getX(b+2);s=Vl(this,m,t,n,c,h,u,S,A,v),s&&(s.faceIndex=Math.floor(b/3),s.face.materialIndex=p.materialIndex,e.push(s))}}else{let g=Math.max(0,f.start),x=Math.min(a.count,f.start+f.count);for(let p=g,m=x;p<m;p+=3){let _=a.getX(p),E=a.getX(p+1),b=a.getX(p+2);s=Vl(this,o,t,n,c,h,u,_,E,b),s&&(s.faceIndex=Math.floor(p/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,x=d.length;g<x;g++){let p=d[g],m=o[p.materialIndex],_=Math.max(p.start,f.start),E=Math.min(l.count,Math.min(p.start+p.count,f.start+f.count));for(let b=_,T=E;b<T;b+=3){let S=b,A=b+1,v=b+2;s=Vl(this,m,t,n,c,h,u,S,A,v),s&&(s.faceIndex=Math.floor(b/3),s.face.materialIndex=p.materialIndex,e.push(s))}}else{let g=Math.max(0,f.start),x=Math.min(l.count,f.start+f.count);for(let p=g,m=x;p<m;p+=3){let _=p,E=p+1,b=p+2;s=Vl(this,o,t,n,c,h,u,_,E,b),s&&(s.faceIndex=Math.floor(p/3),e.push(s))}}}};function U_(i,t,e,n,s,r,o,a){let l;if(t.side===fn?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,t.side===rs,a),l===null)return null;Gl.copy(a),Gl.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(Gl);return c<e.near||c>e.far?null:{distance:c,point:Gl.clone(),object:i}}function Vl(i,t,e,n,s,r,o,a,l,c){i.getVertexPosition(a,Ul),i.getVertexPosition(l,Bl),i.getVertexPosition(c,zl);let h=U_(i,t,e,n,Ul,Bl,zl,Sg);if(h){let u=new D;ki.getBarycoord(Sg,Ul,Bl,zl,u),s&&(h.uv=ki.getInterpolatedAttribute(s,a,l,c,u,new Mt)),r&&(h.uv1=ki.getInterpolatedAttribute(r,a,l,c,u,new Mt)),o&&(h.normal=ki.getInterpolatedAttribute(o,a,l,c,u,new D),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let d={a,b:l,c,normal:new D,materialIndex:0};ki.getNormal(Ul,Bl,zl,d.normal),h.face=d,h.barycoord=u}return h}var Br=class extends Ve{constructor(t=null,e=1,n=1,s,r,o,a,l,c=je,h=je,u,d){super(null,o,a,l,c,h,s,r,u,d),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Ps=new Is,B_=new Mt(.5,.5),Wl=new D,zr=class{constructor(t=new yn,e=new yn,n=new yn,s=new yn,r=new yn,o=new yn){this.planes=[t,e,n,s,r,o]}set(t,e,n,s,r,o){let a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Zn,n=!1){let s=this.planes,r=t.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],u=r[5],d=r[6],f=r[7],g=r[8],x=r[9],p=r[10],m=r[11],_=r[12],E=r[13],b=r[14],T=r[15];if(s[0].setComponents(c-o,f-h,m-g,T-_).normalize(),s[1].setComponents(c+o,f+h,m+g,T+_).normalize(),s[2].setComponents(c+a,f+u,m+x,T+E).normalize(),s[3].setComponents(c-a,f-u,m-x,T-E).normalize(),n)s[4].setComponents(l,d,p,b).normalize(),s[5].setComponents(c-l,f-d,m-p,T-b).normalize();else if(s[4].setComponents(c-l,f-d,m-p,T-b).normalize(),e===Zn)s[5].setComponents(c+l,f+d,m+p,T+b).normalize();else if(e===Lr)s[5].setComponents(l,d,p,b).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Ps.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Ps.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Ps)}intersectsSprite(t){Ps.center.set(0,0,0);let e=B_.distanceTo(t.center);return Ps.radius=.7071067811865476+e,Ps.applyMatrix4(t.matrixWorld),this.intersectsSphere(Ps)}intersectsSphere(t){let e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let s=e[n];if(Wl.x=s.normal.x>0?t.max.x:t.min.x,Wl.y=s.normal.y>0?t.max.y:t.min.y,Wl.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(Wl)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var ts=class extends qn{constructor(t){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Ct(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},Tg=new fe,Vd=new Ur,Xl=new Is,$l=new D,Ls=class extends en{constructor(t=new be,e=new ts){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.matrixWorld,r=t.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Xl.copy(n.boundingSphere),Xl.applyMatrix4(s),Xl.radius+=r,t.ray.intersectsSphere(Xl)===!1)return;Tg.copy(s).invert(),Vd.copy(t.ray).applyMatrix4(Tg);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,u=n.attributes.position;if(c!==null){let d=Math.max(0,o.start),f=Math.min(c.count,o.start+o.count);for(let g=d,x=f;g<x;g++){let p=c.getX(g);$l.fromBufferAttribute(u,p),Eg($l,p,l,s,t,e,this)}}else{let d=Math.max(0,o.start),f=Math.min(u.count,o.start+o.count);for(let g=d,x=f;g<x;g++)$l.fromBufferAttribute(u,g),Eg($l,g,l,s,t,e,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function Eg(i,t,e,n,s,r,o){let a=Vd.distanceSqToPoint(i);if(a<e){let l=new D;Vd.closestPointToPoint(i,l),l.applyMatrix4(n);let c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var ca=class extends Ve{constructor(t=[],e=as,n,s,r,o,a,l,c,h){super(t,e,n,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},ha=class extends Ve{constructor(t,e,n,s,r,o,a,l,c){super(t,e,n,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var es=class extends Ve{constructor(t,e,n=jn,s,r,o,a=je,l=je,c,h=ci,u=1){if(h!==ci&&h!==ls)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let d={width:t,height:e,depth:u};super(d,s,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Nr(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},uc=class extends es{constructor(t,e=jn,n=as,s,r,o=je,a=je,l,c=ci){let h={width:t,height:t,depth:1},u=[h,h,h,h,h,h];super(t,t,e,n,s,r,o,a,l,c),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},ua=class extends Ve{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},cn=class i extends be{constructor(t=1,e=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],h=[],u=[],d=0,f=0;g("z","y","x",-1,-1,n,e,t,o,r,0),g("z","y","x",1,-1,n,e,-t,o,r,1),g("x","z","y",1,1,t,n,e,s,o,2),g("x","z","y",1,-1,t,n,-e,s,o,3),g("x","y","z",1,-1,t,e,n,s,r,4),g("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new Jt(c,3)),this.setAttribute("normal",new Jt(h,3)),this.setAttribute("uv",new Jt(u,2));function g(x,p,m,_,E,b,T,S,A,v,M){let R=b/A,P=T/v,I=b/2,B=T/2,k=S/2,U=A+1,V=v+1,q=0,nt=0,$=new D;for(let J=0;J<V;J++){let et=J*P-B;for(let at=0;at<U;at++){let rt=at*R-I;$[x]=rt*_,$[p]=et*E,$[m]=k,c.push($.x,$.y,$.z),$[x]=0,$[p]=0,$[m]=S>0?1:-1,h.push($.x,$.y,$.z),u.push(at/A),u.push(1-J/v),q+=1}}for(let J=0;J<v;J++)for(let et=0;et<A;et++){let at=d+et+U*J,rt=d+et+U*(J+1),zt=d+(et+1)+U*(J+1),It=d+(et+1)+U*J;l.push(at,rt,It),l.push(rt,zt,It),nt+=6}a.addGroup(f,nt,M),f+=nt,d+=q}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var da=class i extends be{constructor(t=1,e=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:s},e=Math.max(3,e);let r=[],o=[],a=[],l=[],c=new D,h=new Mt;o.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let u=0,d=3;u<=e;u++,d+=3){let f=n+u/e*s;c.x=t*Math.cos(f),c.y=t*Math.sin(f),o.push(c.x,c.y,c.z),a.push(0,0,1),h.x=(o[d]/t+1)/2,h.y=(o[d+1]/t+1)/2,l.push(h.x,h.y)}for(let u=1;u<=e;u++)r.push(u,u+1,0);this.setIndex(r),this.setAttribute("position",new Jt(o,3)),this.setAttribute("normal",new Jt(a,3)),this.setAttribute("uv",new Jt(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.segments,t.thetaStart,t.thetaLength)}},fi=class i extends be{constructor(t=1,e=1,n=1,s=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let h=[],u=[],d=[],f=[],g=0,x=[],p=n/2,m=0;_(),o===!1&&(t>0&&E(!0),e>0&&E(!1)),this.setIndex(h),this.setAttribute("position",new Jt(u,3)),this.setAttribute("normal",new Jt(d,3)),this.setAttribute("uv",new Jt(f,2));function _(){let b=new D,T=new D,S=0,A=(e-t)/n;for(let v=0;v<=r;v++){let M=[],R=v/r,P=R*(e-t)+t;for(let I=0;I<=s;I++){let B=I/s,k=B*l+a,U=Math.sin(k),V=Math.cos(k);T.x=P*U,T.y=-R*n+p,T.z=P*V,u.push(T.x,T.y,T.z),b.set(U,A,V).normalize(),d.push(b.x,b.y,b.z),f.push(B,1-R),M.push(g++)}x.push(M)}for(let v=0;v<s;v++)for(let M=0;M<r;M++){let R=x[M][v],P=x[M+1][v],I=x[M+1][v+1],B=x[M][v+1];(t>0||M!==0)&&(h.push(R,P,B),S+=3),(e>0||M!==r-1)&&(h.push(P,I,B),S+=3)}c.addGroup(m,S,0),m+=S}function E(b){let T=g,S=new Mt,A=new D,v=0,M=b===!0?t:e,R=b===!0?1:-1;for(let I=1;I<=s;I++)u.push(0,p*R,0),d.push(0,R,0),f.push(.5,.5),g++;let P=g;for(let I=0;I<=s;I++){let k=I/s*l+a,U=Math.cos(k),V=Math.sin(k);A.x=M*V,A.y=p*R,A.z=M*U,u.push(A.x,A.y,A.z),d.push(0,R,0),S.x=U*.5+.5,S.y=V*.5*R+.5,f.push(S.x,S.y),g++}for(let I=0;I<s;I++){let B=T+I,k=P+I;b===!0?h.push(k,k+1,B):h.push(k+1,k,B),v+=3}c.addGroup(m,v,b===!0?1:2),m+=v}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var dc=class i extends be{constructor(t=[],e=[],n=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:s};let r=[],o=[];a(s),c(n),h(),this.setAttribute("position",new Jt(r,3)),this.setAttribute("normal",new Jt(r.slice(),3)),this.setAttribute("uv",new Jt(o,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function a(_){let E=new D,b=new D,T=new D;for(let S=0;S<e.length;S+=3)f(e[S+0],E),f(e[S+1],b),f(e[S+2],T),l(E,b,T,_)}function l(_,E,b,T){let S=T+1,A=[];for(let v=0;v<=S;v++){A[v]=[];let M=_.clone().lerp(b,v/S),R=E.clone().lerp(b,v/S),P=S-v;for(let I=0;I<=P;I++)I===0&&v===S?A[v][I]=M:A[v][I]=M.clone().lerp(R,I/P)}for(let v=0;v<S;v++)for(let M=0;M<2*(S-v)-1;M++){let R=Math.floor(M/2);M%2===0?(d(A[v][R+1]),d(A[v+1][R]),d(A[v][R])):(d(A[v][R+1]),d(A[v+1][R+1]),d(A[v+1][R]))}}function c(_){let E=new D;for(let b=0;b<r.length;b+=3)E.x=r[b+0],E.y=r[b+1],E.z=r[b+2],E.normalize().multiplyScalar(_),r[b+0]=E.x,r[b+1]=E.y,r[b+2]=E.z}function h(){let _=new D;for(let E=0;E<r.length;E+=3){_.x=r[E+0],_.y=r[E+1],_.z=r[E+2];let b=p(_)/2/Math.PI+.5,T=m(_)/Math.PI+.5;o.push(b,1-T)}g(),u()}function u(){for(let _=0;_<o.length;_+=6){let E=o[_+0],b=o[_+2],T=o[_+4],S=Math.max(E,b,T),A=Math.min(E,b,T);S>.9&&A<.1&&(E<.2&&(o[_+0]+=1),b<.2&&(o[_+2]+=1),T<.2&&(o[_+4]+=1))}}function d(_){r.push(_.x,_.y,_.z)}function f(_,E){let b=_*3;E.x=t[b+0],E.y=t[b+1],E.z=t[b+2]}function g(){let _=new D,E=new D,b=new D,T=new D,S=new Mt,A=new Mt,v=new Mt;for(let M=0,R=0;M<r.length;M+=9,R+=6){_.set(r[M+0],r[M+1],r[M+2]),E.set(r[M+3],r[M+4],r[M+5]),b.set(r[M+6],r[M+7],r[M+8]),S.set(o[R+0],o[R+1]),A.set(o[R+2],o[R+3]),v.set(o[R+4],o[R+5]),T.copy(_).add(E).add(b).divideScalar(3);let P=p(T);x(S,R+0,_,P),x(A,R+2,E,P),x(v,R+4,b,P)}}function x(_,E,b,T){T<0&&_.x===1&&(o[E]=_.x-1),b.x===0&&b.z===0&&(o[E]=T/2/Math.PI+.5)}function p(_){return Math.atan2(_.z,-_.x)}function m(_){return Math.atan2(-_.y,Math.sqrt(_.x*_.x+_.z*_.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.vertices,t.indices,t.radius,t.detail)}};var fa=class i extends dc{constructor(t=1,e=0){let n=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],s=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(n,s,t,e),this.type="OctahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new i(t.radius,t.detail)}},Ie=class i extends be{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};let r=t/2,o=e/2,a=Math.floor(n),l=Math.floor(s),c=a+1,h=l+1,u=t/a,d=e/l,f=[],g=[],x=[],p=[];for(let m=0;m<h;m++){let _=m*d-o;for(let E=0;E<c;E++){let b=E*u-r;g.push(b,-_,0),x.push(0,0,1),p.push(E/a),p.push(1-m/l)}}for(let m=0;m<l;m++)for(let _=0;_<a;_++){let E=_+c*m,b=_+c*(m+1),T=_+1+c*(m+1),S=_+1+c*m;f.push(E,b,S),f.push(b,T,S)}this.setIndex(f),this.setAttribute("position",new Jt(g,3)),this.setAttribute("normal",new Jt(x,3)),this.setAttribute("uv",new Jt(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.widthSegments,t.heightSegments)}};var pa=class i extends be{constructor(t=1,e=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));let l=Math.min(o+a,Math.PI),c=0,h=[],u=new D,d=new D,f=[],g=[],x=[],p=[];for(let m=0;m<=n;m++){let _=[],E=m/n,b=o+E*a,T=t*Math.cos(b),S=Math.sqrt(t*t-T*T),A=0;m===0&&o===0?A=.5/e:m===n&&l===Math.PI&&(A=-.5/e);for(let v=0;v<=e;v++){let M=v/e,R=s+M*r;u.x=-S*Math.cos(R),u.y=T,u.z=S*Math.sin(R),g.push(u.x,u.y,u.z),d.copy(u).normalize(),x.push(d.x,d.y,d.z),p.push(M+A,1-E),_.push(c++)}h.push(_)}for(let m=0;m<n;m++)for(let _=0;_<e;_++){let E=h[m][_+1],b=h[m][_],T=h[m+1][_],S=h[m+1][_+1];(m!==0||o>0)&&f.push(E,b,S),(m!==n-1||l<Math.PI)&&f.push(b,T,S)}this.setIndex(f),this.setAttribute("position",new Jt(g,3)),this.setAttribute("normal",new Jt(x,3)),this.setAttribute("uv",new Jt(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};var Hr=class i extends be{constructor(t=1,e=.4,n=12,s=48,r=Math.PI*2,o=0,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:s,arc:r,thetaStart:o,thetaLength:a},n=Math.floor(n),s=Math.floor(s);let l=[],c=[],h=[],u=[],d=new D,f=new D,g=new D;for(let x=0;x<=n;x++){let p=o+x/n*a;for(let m=0;m<=s;m++){let _=m/s*r;f.x=(t+e*Math.cos(p))*Math.cos(_),f.y=(t+e*Math.cos(p))*Math.sin(_),f.z=e*Math.sin(p),c.push(f.x,f.y,f.z),d.x=t*Math.cos(_),d.y=t*Math.sin(_),g.subVectors(f,d).normalize(),h.push(g.x,g.y,g.z),u.push(m/s),u.push(x/n)}}for(let x=1;x<=n;x++)for(let p=1;p<=s;p++){let m=(s+1)*x+p-1,_=(s+1)*(x-1)+p-1,E=(s+1)*(x-1)+p,b=(s+1)*x+p;l.push(m,_,b),l.push(_,E,b)}this.setIndex(l),this.setAttribute("position",new Jt(c,3)),this.setAttribute("normal",new Jt(h,3)),this.setAttribute("uv",new Jt(u,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}};var Gr=class extends qn{constructor(t){super(),this.isShadowMaterial=!0,this.type="ShadowMaterial",this.color=new Ct(0),this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.fog=t.fog,this}};function Us(i){let t={};for(let e in i){t[e]={};for(let n in i[e]){let s=i[e][n];if(Ag(s))s.isRenderTargetTexture?(Ot("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone();else if(Array.isArray(s))if(Ag(s[0])){let r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();t[e][n]=r}else t[e][n]=s.slice();else t[e][n]=s}}return t}function hn(i){let t={};for(let e=0;e<i.length;e++){let n=Us(i[e]);for(let s in n)t[s]=n[s]}return t}function Ag(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function z_(i){let t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function vf(i){let t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Yt.workingColorSpace}var Bs={clone:Us,merge:hn},H_=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,G_=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Le=class extends qn{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=H_,this.fragmentShader=G_,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Us(t.uniforms),this.uniformsGroups=z_(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let s=t.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=e[s.value]||null;break;case"c":this.uniforms[n].value=new Ct().setHex(s.value);break;case"v2":this.uniforms[n].value=new Mt().fromArray(s.value);break;case"v3":this.uniforms[n].value=new D().fromArray(s.value);break;case"v4":this.uniforms[n].value=new _e().fromArray(s.value);break;case"m3":this.uniforms[n].value=new Ht().fromArray(s.value);break;case"m4":this.uniforms[n].value=new fe().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},fc=class extends Le{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},nn=class extends qn{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ct(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ct(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=dh,this.normalScale=new Mt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Li,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},Vr=class extends nn{constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Mt(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return jt(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Ct(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Ct(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Ct(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(t){this._retroreflectivity>0!=t>0&&this.version++,this._retroreflectivity=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.retroreflectivity=t.retroreflectivity,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}};var pc=class extends qn{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=r0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},mc=class extends qn{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function Cr(i,t){return!i||i.constructor===t?i:typeof t.BYTES_PER_ELEMENT=="number"?new t(i):Array.prototype.slice.call(i)}function Fd(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}var ns=class{constructor(t,e,n,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,s=e[n],r=e[n-1];t:{e:{let o;n:{i:if(!(t<s)){for(let a=n+2;;){if(s===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=s,s=e[++n],t<s)break e}o=e.length;break n}if(!(t>=r)){let a=e[1];t<a&&(n=2,r=a);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=e[--n-1],t>=r)break e}o=n,n=0;break n}break t}for(;n<o;){let a=n+o>>>1;t<e[a]?o=a:n=a+1}if(s=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=t*s;for(let o=0;o!==s;++o)e[o]=n[r+o];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},gc=class extends ns{constructor(t,e,n,s){super(t,e,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:zd,endingEnd:zd}}intervalChanged_(t,e,n){let s=this.parameterPositions,r=t-2,o=t+1,a=s[r],l=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case Hd:r=t,a=2*e-n;break;case Gd:r=s.length-2,a=e+s[r]-s[r+1];break;default:r=t,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case Hd:o=t,l=2*n-e;break;case Gd:o=1,l=n+s[1]-s[0];break;default:o=t-1,l=e}let c=(n-e)*.5,h=this.valueSize;this._weightPrev=c/(e-a),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,g=(n-e)/(s-e),x=g*g,p=x*g,m=-d*p+2*d*x-d*g,_=(1+d)*p+(-1.5-2*d)*x+(-.5+d)*g+1,E=(-1-f)*p+(1.5+f)*x+.5*g,b=f*p-f*x;for(let T=0;T!==a;++T)r[T]=m*o[h+T]+_*o[c+T]+E*o[l+T]+b*o[u+T];return r}},xc=class extends ns{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=(n-e)/(s-e),u=1-h;for(let d=0;d!==a;++d)r[d]=o[c+d]*u+o[l+d]*h;return r}},yc=class extends ns{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t){return this.copySampleValue_(t-1)}},vc=class extends ns{interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this.inTangents,u=this.outTangents;if(!h||!u){let g=(n-e)/(s-e),x=1-g;for(let p=0;p!==a;++p)r[p]=o[c+p]*x+o[l+p]*g;return r}let d=a*2,f=t-1;for(let g=0;g!==a;++g){let x=o[c+g],p=o[l+g],m=f*d+g*2,_=u[m],E=u[m+1],b=t*d+g*2,T=h[b],S=h[b+1],A=W_(n,e,_,T,s);r[g]=_0(A,x,E,S,p)}return r}};function _0(i,t,e,n,s){let r=1-i;return r*r*r*t+3*r*r*i*e+3*r*i*i*n+i*i*i*s}function V_(i,t,e,n,s){let r=1-i;return 3*r*r*(e-t)+6*r*i*(n-e)+3*i*i*(s-n)}function W_(i,t,e,n,s){let r=(i-t)/(s-t);for(let o=0;o<8;o++){let a=_0(r,t,e,n,s)-i;if(Math.abs(a)<1e-10)break;let l=V_(r,t,e,n,s);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-a/l))}return r}var An=class{constructor(t,e,n,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=Cr(e,this.TimeBufferType),this.values=Cr(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:Cr(t.times,Array),values:Cr(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(n.interpolation=s),Fd(t.settings)&&(n.settings={inTangents:Cr(t.settings.inTangents,Array),outTangents:Cr(t.settings.outTangents,Array)})}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new yc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new xc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new gc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new vc(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case Jo:e=this.InterpolantFactoryMethodDiscrete;break;case oc:e=this.InterpolantFactoryMethodLinear;break;case Yl:e=this.InterpolantFactoryMethodSmooth;break;case Bd:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Ot("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Jo;case this.InterpolantFactoryMethodLinear:return oc;case this.InterpolantFactoryMethodSmooth:return Yl;case this.InterpolantFactoryMethodBezier:return Bd}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]*=t;Fd(this.settings)&&(Cg(this.settings.inTangents,t),Cg(this.settings.outTangents,t))}return this}trim(t,e){let n=this.times,s=n.length,r=0,o=s-1;for(;r!==s&&n[r]<t;)++r;for(;o!==-1&&n[o]>e;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(Nt("KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,s=this.values,r=n.length;r===0&&(Nt("KeyframeTrack: Track is empty.",this),t=!1);let o=null;for(let a=0;a!==r;a++){let l=n[a];if(typeof l=="number"&&isNaN(l)){Nt("KeyframeTrack: Time is not a valid number.",this,a,l),t=!1;break}if(o!==null&&o>l){Nt("KeyframeTrack: Out of order keys.",this,a,l,o),t=!1;break}o=l}if(s!==void 0&&__(s))for(let a=0,l=s.length;a!==l;++a){let c=s[a];if(isNaN(c)){Nt("KeyframeTrack: Value is not a valid number.",this,a,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===Yl,r=t.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=t[a],h=t[a+1];if(c!==h&&(a!==1||c!==t[0]))if(s)l=!0;else{let u=a*n,d=u-n,f=u+n;for(let g=0;g!==n;++g){let x=e[u+g];if(x!==e[d+g]||x!==e[f+g]){l=!0;break}}}if(l){if(a!==o){t[o]=t[a];let u=a*n,d=o*n;for(let f=0;f!==n;++f)e[d+f]=e[u+f]}++o}}if(r>0){t[o]=t[r];for(let a=r*n,l=o*n,c=0;c!==n;++c)e[l+c]=e[a+c];++o}return o!==t.length?(this.times=t.slice(0,o),this.values=e.slice(0,o*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,s=new n(this.name,t,e);return s.createInterpolant=this.createInterpolant,Fd(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function Cg(i,t){for(let e=0,n=i.length;e!==n;e+=2)i[e]*=t}An.prototype.ValueTypeName="";An.prototype.TimeBufferType=Float32Array;An.prototype.ValueBufferType=Float32Array;An.prototype.DefaultInterpolation=oc;var is=class extends An{constructor(t,e,n){super(t,e,n)}};is.prototype.ValueTypeName="bool";is.prototype.ValueBufferType=Array;is.prototype.DefaultInterpolation=Jo;is.prototype.InterpolantFactoryMethodLinear=void 0;is.prototype.InterpolantFactoryMethodSmooth=void 0;var _c=class extends An{constructor(t,e,n,s){super(t,e,n,s)}};_c.prototype.ValueTypeName="color";var bc=class extends An{constructor(t,e,n,s){super(t,e,n,s)}};bc.prototype.ValueTypeName="number";var Mc=class extends ns{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-e)/(s-e),c=t*a;for(let h=c+a;c!==h;c+=4)di.slerpFlat(r,0,o,c-a,o,c,l);return r}},ma=class extends An{constructor(t,e,n,s){super(t,e,n,s)}InterpolantFactoryMethodLinear(t){return new Mc(this.times,this.values,this.getValueSize(),t)}};ma.prototype.ValueTypeName="quaternion";ma.prototype.InterpolantFactoryMethodSmooth=void 0;var ss=class extends An{constructor(t,e,n){super(t,e,n)}};ss.prototype.ValueTypeName="string";ss.prototype.ValueBufferType=Array;ss.prototype.DefaultInterpolation=Jo;ss.prototype.InterpolantFactoryMethodLinear=void 0;ss.prototype.InterpolantFactoryMethodSmooth=void 0;var wc=class extends An{constructor(t,e,n,s){super(t,e,n,s)}};wc.prototype.ValueTypeName="vector";var Sc=class{constructor(t,e,n){let s=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){let u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){let f=c[u],g=c[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},b0=new Sc,Tc=class{constructor(t){this.manager=t!==void 0?t:b0,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};Tc.DEFAULT_MATERIAL_NAME="__DEFAULT";var Wr=class extends en{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Ct(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}};var Ud=new fe,Rg=new D,Pg=new D,ga=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Mt(512,512),this.mapType=_n,this.map=null,this.mapPass=null,this.matrix=new fe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new zr,this._frameExtents=new Mt(1,1),this._viewportCount=1,this._viewports=[new _e(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;Rg.setFromMatrixPosition(t.matrixWorld),e.position.copy(Rg),Pg.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Pg),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,s){Ud.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix(Ud,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,o=s?s.z/r.x:1,a=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;t.coordinateSystem===Lr||t.reversedDepth?e.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,1,0,0,0,0,1):e.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,.5,.5,0,0,0,1),e.multiply(Ud)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},Zl=new D,ql=new di,oi=new D,xa=class extends en{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new fe,this.projectionMatrix=new fe,this.projectionMatrixInverse=new fe,this.coordinateSystem=Zn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(Zl,ql,oi),oi.x===1&&oi.y===1&&oi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Zl,ql,oi.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(Zl,ql,oi),oi.x===1&&oi.y===1&&oi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Zl,ql,oi.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Ki=new D,kg=new Mt,Ig=new Mt,Ye=class extends xa{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=ia*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(md*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return ia*2*Math.atan(Math.tan(md*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){Ki.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Ki.x,Ki.y).multiplyScalar(-t/Ki.z),Ki.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Ki.x,Ki.y).multiplyScalar(-t/Ki.z)}getViewSize(t,e){return this.getViewBounds(t,kg,Ig),e.subVectors(Ig,kg)}setViewOffset(t,e,n,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(md*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,e-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}let a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}},Wd=class extends ga{constructor(){super(new Ye(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(t){let e=this.camera,n=ia*2*t.angle*this.focus,s=this.mapSize.width/this.mapSize.height*this.aspect,r=t.distance||e.far;(n!==e.fov||s!==e.aspect||r!==e.far)&&(e.fov=n,e.aspect=s,e.far=r,e.updateProjectionMatrix()),super.updateMatrices(t)}copy(t){return super.copy(t),this.focus=t.focus,this.aspect=t.aspect,this}toJSON(){let t=super.toJSON();return t.focus=this.focus,t.aspect=this.aspect,t}},Xr=class extends Wr{constructor(t,e,n=0,s=Math.PI/3,r=0,o=2){super(t,e),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(en.DEFAULT_UP),this.updateMatrix(),this.target=new en,this.distance=n,this.angle=s,this.penumbra=r,this.decay=o,this.map=null,this.shadow=new Wd}get power(){return this.intensity*Math.PI}set power(t){this.intensity=t/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.angle=t.angle,this.penumbra=t.penumbra,this.decay=t.decay,this.target=t.target.clone(),this.map=t.map,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.angle=this.angle,e.object.decay=this.decay,e.object.penumbra=this.penumbra,e.object.target=this.target.uuid,this.map&&this.map.isTexture&&(e.object.map=this.map.toJSON(t).uuid),e.object.shadow=this.shadow.toJSON(),e}},Xd=class extends ga{constructor(){super(new Ye(90,1,.5,500)),this.isPointLightShadow=!0}},ya=class extends Wr{constructor(t,e,n=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new Xd}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}},Ds=class extends xa{constructor(t=-1,e=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-t,o=n+t,a=s+e,l=s-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}};var va=class extends Wr{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}};var Rr=-90,Pr=1,Ec=class extends en{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new Ye(Rr,Pr,t,e);s.layers=this.layers,this.add(s);let r=new Ye(Rr,Pr,t,e);r.layers=this.layers,this.add(r);let o=new Ye(Rr,Pr,t,e);o.layers=this.layers,this.add(o);let a=new Ye(Rr,Pr,t,e);a.layers=this.layers,this.add(a);let l=new Ye(Rr,Pr,t,e);l.layers=this.layers,this.add(l);let c=new Ye(Rr,Pr,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,s,r,o,a,l]=e;for(let c of e)this.remove(c);if(t===Zn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Lr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,h]=this.children,u=t.getRenderTarget(),d=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;let x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let p=!1;t.isWebGLRenderer===!0?p=t.state.buffers.depth.getReversed():p=t.reversedDepthBuffer,t.setRenderTarget(n,0,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,2,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,3,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(n,4,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),n.texture.generateMipmaps=x,t.setRenderTarget(n,5,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(u,d,f),t.xr.enabled=g,n.texture.needsPMREMUpdate=!0}},Ac=class extends Ye{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}},_a=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(t){this._document=t,t.hidden!==void 0&&(this._pageVisibilityHandler=X_.bind(this),t.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(t){return this._timescale=t,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(t){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(t!==void 0?t:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function X_(){this._document.hidden===!1&&this.reset()}var _f="\\[\\]\\.:\\/",$_=new RegExp("["+_f+"]","g"),bf="[^"+_f+"]",Z_="[^"+_f.replace("\\.","")+"]",q_=/((?:WC+[\/:])*)/.source.replace("WC",bf),Y_=/(WCOD+)?/.source.replace("WCOD",Z_),j_=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",bf),K_=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",bf),J_=new RegExp("^"+q_+Y_+j_+K_+"$"),Q_=["material","materials","bones","map"],$d=class{constructor(t,e,n){let s=n||me.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},me=class i{constructor(t,e,n){this.path=e,this.parsedPath=n||i.parseTrackName(e),this.node=i.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new i.Composite(t,e,n):new i(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace($_,"")}static parseTrackName(t){let e=J_.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);Q_.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===e||a.uuid===e)return a;let l=n(a.children);if(l)return l}return null},s=n(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)t[e++]=n[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=i.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){Ot("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=e.objectIndex;switch(n){case"materials":if(!t.material){Nt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){Nt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){Nt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){Nt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){Nt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){Nt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(c!==void 0){if(t[c]===void 0){Nt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let o=t[s];if(o===void 0){let c=e.nodeName;Nt("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",t);return}let a=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?a=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){Nt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){Nt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};me.Composite=$d;me.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};me.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};me.prototype.GetterByBindingType=[me.prototype._getValue_direct,me.prototype._getValue_array,me.prototype._getValue_arrayElement,me.prototype._getValue_toArray];me.prototype.SetterByBindingTypeAndVersioning=[[me.prototype._setValue_direct,me.prototype._setValue_direct_setNeedsUpdate,me.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[me.prototype._setValue_array,me.prototype._setValue_array_setNeedsUpdate,me.prototype._setValue_array_setMatrixWorldNeedsUpdate],[me.prototype._setValue_arrayElement,me.prototype._setValue_arrayElement_setNeedsUpdate,me.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[me.prototype._setValue_fromArray,me.prototype._setValue_fromArray_setNeedsUpdate,me.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var yA=new Float32Array(1);var Lg=new fe,ba=class{constructor(t,e,n=0,s=1/0){this.ray=new Ur(t,e),this.near=n,this.far=s,this.camera=null,this.layers=new Or,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):Nt("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return Lg.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Lg),this}intersectObject(t,e=!0,n=[]){return Zd(t,this,n,e),n.sort(Dg),n}intersectObjects(t,e=!0,n=[]){for(let s=0,r=t.length;s<r;s++)Zd(t[s],this,n,e);return n.sort(Dg),n}};function Dg(i,t){return i.distance-t.distance}function Zd(i,t,e,n){let s=!0;if(i.layers.test(t.layers)&&i.raycast(t,e)===!1&&(s=!1),s===!0&&n===!0){let r=i.children;for(let o=0,a=r.length;o<a;o++)Zd(r[o],t,e,!0)}}var qd=class i{static{i.prototype.isMatrix2=!0}constructor(t,e,n,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=s,this}};function Mf(i,t,e,n){let s=tb(n);switch(e){case pf:return i*t;case gf:return i*t/s.components*s.byteLength;case Lc:return i*t/s.components*s.byteLength;case cs:return i*t*2/s.components*s.byteLength;case Dc:return i*t*2/s.components*s.byteLength;case mf:return i*t*3/s.components*s.byteLength;case bn:return i*t*4/s.components*s.byteLength;case Nc:return i*t*4/s.components*s.byteLength;case Sa:case Ta:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Ea:case Aa:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Fc:case Bc:return Math.max(i,16)*Math.max(t,8)/4;case Oc:case Uc:return Math.max(i,8)*Math.max(t,8)/2;case zc:case Hc:case Vc:case Wc:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Gc:case Ca:case Xc:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case $c:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Zc:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case qc:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case Yc:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case jc:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case Kc:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case Jc:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case Qc:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case th:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case eh:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case nh:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case ih:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case sh:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case rh:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case oh:case ah:case lh:return Math.ceil(i/4)*Math.ceil(t/4)*16;case ch:case hh:return Math.ceil(i/4)*Math.ceil(t/4)*8;case Ra:case uh:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function tb(i){switch(i){case _n:case hf:return{byteLength:1,components:1};case qr:case uf:case We:return{byteLength:2,components:1};case kc:case Ic:return{byteLength:2,components:4};case jn:case Pc:case Kn:return{byteLength:4,components:1};case df:case ff:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?Ot("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function V0(){let i=null,t=!1,e=null,n=null;function s(r,o){n=i.requestAnimationFrame(s),e(r,o)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function nb(i){let t=new WeakMap;function e(a,l){let c=a.array,h=a.usage,u=c.byteLength,d=i.createBuffer();i.bindBuffer(l,d),i.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:u}}function n(a,l,c){let h=l.array,u=l.updateRanges;if(i.bindBuffer(c,a),u.length===0)i.bufferSubData(c,0,h);else{u.sort((f,g)=>f.start-g.start);let d=0;for(let f=1;f<u.length;f++){let g=u[d],x=u[f];x.start<=g.start+g.count+1?g.count=Math.max(g.count,x.start+x.count-g.start):(++d,u[d]=x)}u.length=d+1;for(let f=0,g=u.length;f<g;f++){let x=u[f];i.bufferSubData(c,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=t.get(a);l&&(i.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var ib=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,sb=`#ifdef USE_ALPHAHASH
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
#endif`,rb=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,ob=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,ab=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,lb=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,cb=`#ifdef USE_AOMAP
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
#endif`,hb=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,ub=`#ifdef USE_BATCHING
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
#endif`,db=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,fb=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,pb=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,mb=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,gb=`#ifdef USE_IRIDESCENCE
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
#endif`,xb=`#ifdef USE_BUMPMAP
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
#endif`,yb=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,vb=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,_b=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,bb=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Mb=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,wb=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Sb=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Tb=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,Eb=`#define PI 3.141592653589793
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
} // validated`,Ab=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Cb=`vec3 transformedNormal = objectNormal;
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
#endif`,Rb=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Pb=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,kb=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Ib=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Lb="gl_FragColor = linearToOutputTexel( gl_FragColor );",Db=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Nb=`#ifdef USE_ENVMAP
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
#endif`,Ob=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Fb=`#ifdef USE_ENVMAP
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
#endif`,Ub=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Bb=`#ifdef USE_ENVMAP
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
#endif`,zb=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Hb=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Gb=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Vb=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Wb=`#ifdef USE_GRADIENTMAP
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
}`,Xb=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,$b=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Zb=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,qb=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,Yb=`#ifdef USE_ENVMAP
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
#endif`,jb=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Kb=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Jb=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Qb=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,tM=`PhysicalMaterial material;
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
#endif`,eM=`uniform sampler2D dfgLUT;
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
}`,nM=`
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
#endif`,iM=`#if defined( RE_IndirectDiffuse )
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
#endif`,sM=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,rM=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,oM=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,aM=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,lM=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,cM=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,hM=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,uM=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,dM=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,fM=`#if defined( USE_POINTS_UV )
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
#endif`,pM=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,mM=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,gM=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,xM=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,yM=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,vM=`#ifdef USE_MORPHTARGETS
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
#endif`,_M=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,bM=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,MM=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,wM=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,SM=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,TM=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,EM=`#ifdef USE_NORMALMAP
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
#endif`,AM=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,CM=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,RM=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,PM=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,kM=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,IM=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,LM=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,DM=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,NM=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,OM=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,FM=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,UM=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,BM=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,zM=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,HM=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,GM=`float getShadowMask() {
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
}`,VM=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,WM=`#ifdef USE_SKINNING
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
#endif`,XM=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,$M=`#ifdef USE_SKINNING
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
#endif`,ZM=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,qM=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,YM=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,jM=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,KM=`#ifdef USE_TRANSMISSION
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
#endif`,JM=`#ifdef USE_TRANSMISSION
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
#endif`,QM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,tw=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,ew=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,nw=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,iw=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,sw=`uniform sampler2D t2D;
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
}`,rw=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ow=`#ifdef ENVMAP_TYPE_CUBE
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
}`,aw=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,lw=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cw=`#include <common>
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
}`,hw=`#if DEPTH_PACKING == 3200
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
}`,uw=`#define DISTANCE
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
}`,dw=`#define DISTANCE
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
}`,fw=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,pw=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,mw=`uniform float scale;
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
}`,gw=`uniform vec3 diffuse;
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
}`,xw=`#include <common>
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
}`,yw=`uniform vec3 diffuse;
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
}`,vw=`#define LAMBERT
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
}`,_w=`#define LAMBERT
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
}`,bw=`#define MATCAP
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
}`,Mw=`#define MATCAP
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
}`,ww=`#define NORMAL
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
}`,Sw=`#define NORMAL
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
}`,Tw=`#define PHONG
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
}`,Ew=`#define PHONG
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
}`,Aw=`#define STANDARD
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
}`,Cw=`#define STANDARD
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
}`,Rw=`#define TOON
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
}`,Pw=`#define TOON
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
}`,kw=`uniform float size;
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
}`,Iw=`uniform vec3 diffuse;
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
}`,Lw=`#include <common>
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
}`,Dw=`uniform vec3 color;
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
}`,Nw=`uniform float rotation;
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
}`,Ow=`uniform vec3 diffuse;
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
}`,Wt={alphahash_fragment:ib,alphahash_pars_fragment:sb,alphamap_fragment:rb,alphamap_pars_fragment:ob,alphatest_fragment:ab,alphatest_pars_fragment:lb,aomap_fragment:cb,aomap_pars_fragment:hb,batching_pars_vertex:ub,batching_vertex:db,begin_vertex:fb,beginnormal_vertex:pb,bsdfs:mb,iridescence_fragment:gb,bumpmap_pars_fragment:xb,clipping_planes_fragment:yb,clipping_planes_pars_fragment:vb,clipping_planes_pars_vertex:_b,clipping_planes_vertex:bb,color_fragment:Mb,color_pars_fragment:wb,color_pars_vertex:Sb,color_vertex:Tb,common:Eb,cube_uv_reflection_fragment:Ab,defaultnormal_vertex:Cb,displacementmap_pars_vertex:Rb,displacementmap_vertex:Pb,emissivemap_fragment:kb,emissivemap_pars_fragment:Ib,colorspace_fragment:Lb,colorspace_pars_fragment:Db,envmap_fragment:Nb,envmap_common_pars_fragment:Ob,envmap_pars_fragment:Fb,envmap_pars_vertex:Ub,envmap_physical_pars_fragment:Yb,envmap_vertex:Bb,fog_vertex:zb,fog_pars_vertex:Hb,fog_fragment:Gb,fog_pars_fragment:Vb,gradientmap_pars_fragment:Wb,lightmap_pars_fragment:Xb,lights_lambert_fragment:$b,lights_lambert_pars_fragment:Zb,lights_pars_begin:qb,lights_toon_fragment:jb,lights_toon_pars_fragment:Kb,lights_phong_fragment:Jb,lights_phong_pars_fragment:Qb,lights_physical_fragment:tM,lights_physical_pars_fragment:eM,lights_fragment_begin:nM,lights_fragment_maps:iM,lights_fragment_end:sM,lightprobes_pars_fragment:rM,logdepthbuf_fragment:oM,logdepthbuf_pars_fragment:aM,logdepthbuf_pars_vertex:lM,logdepthbuf_vertex:cM,map_fragment:hM,map_pars_fragment:uM,map_particle_fragment:dM,map_particle_pars_fragment:fM,metalnessmap_fragment:pM,metalnessmap_pars_fragment:mM,morphinstance_vertex:gM,morphcolor_vertex:xM,morphnormal_vertex:yM,morphtarget_pars_vertex:vM,morphtarget_vertex:_M,normal_fragment_begin:bM,normal_fragment_maps:MM,normal_pars_fragment:wM,normal_pars_vertex:SM,normal_vertex:TM,normalmap_pars_fragment:EM,clearcoat_normal_fragment_begin:AM,clearcoat_normal_fragment_maps:CM,clearcoat_pars_fragment:RM,iridescence_pars_fragment:PM,opaque_fragment:kM,packing:IM,premultiplied_alpha_fragment:LM,project_vertex:DM,dithering_fragment:NM,dithering_pars_fragment:OM,roughnessmap_fragment:FM,roughnessmap_pars_fragment:UM,shadowmap_pars_fragment:BM,shadowmap_pars_vertex:zM,shadowmap_vertex:HM,shadowmask_pars_fragment:GM,skinbase_vertex:VM,skinning_pars_vertex:WM,skinning_vertex:XM,skinnormal_vertex:$M,specularmap_fragment:ZM,specularmap_pars_fragment:qM,tonemapping_fragment:YM,tonemapping_pars_fragment:jM,transmission_fragment:KM,transmission_pars_fragment:JM,uv_pars_fragment:QM,uv_pars_vertex:tw,uv_vertex:ew,worldpos_vertex:nw,background_vert:iw,background_frag:sw,backgroundCube_vert:rw,backgroundCube_frag:ow,cube_vert:aw,cube_frag:lw,depth_vert:cw,depth_frag:hw,distance_vert:uw,distance_frag:dw,equirect_vert:fw,equirect_frag:pw,linedashed_vert:mw,linedashed_frag:gw,meshbasic_vert:xw,meshbasic_frag:yw,meshlambert_vert:vw,meshlambert_frag:_w,meshmatcap_vert:bw,meshmatcap_frag:Mw,meshnormal_vert:ww,meshnormal_frag:Sw,meshphong_vert:Tw,meshphong_frag:Ew,meshphysical_vert:Aw,meshphysical_frag:Cw,meshtoon_vert:Rw,meshtoon_frag:Pw,points_vert:kw,points_frag:Iw,shadow_vert:Lw,shadow_frag:Dw,sprite_vert:Nw,sprite_frag:Ow},pt={common:{diffuse:{value:new Ct(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ht},alphaMap:{value:null},alphaMapTransform:{value:new Ht},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ht}},envmap:{envMap:{value:null},envMapRotation:{value:new Ht},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ht}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ht}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ht},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ht},normalScale:{value:new Mt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ht},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ht}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ht}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ht}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ct(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new D},probesMax:{value:new D},probesResolution:{value:new D}},points:{diffuse:{value:new Ct(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ht},alphaTest:{value:0},uvTransform:{value:new Ht}},sprite:{diffuse:{value:new Ct(16777215)},opacity:{value:1},center:{value:new Mt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ht},alphaMap:{value:null},alphaMapTransform:{value:new Ht},alphaTest:{value:0}}},gi={basic:{uniforms:hn([pt.common,pt.specularmap,pt.envmap,pt.aomap,pt.lightmap,pt.fog]),vertexShader:Wt.meshbasic_vert,fragmentShader:Wt.meshbasic_frag},lambert:{uniforms:hn([pt.common,pt.specularmap,pt.envmap,pt.aomap,pt.lightmap,pt.emissivemap,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.fog,pt.lights,{emissive:{value:new Ct(0)},envMapIntensity:{value:1}}]),vertexShader:Wt.meshlambert_vert,fragmentShader:Wt.meshlambert_frag},phong:{uniforms:hn([pt.common,pt.specularmap,pt.envmap,pt.aomap,pt.lightmap,pt.emissivemap,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.fog,pt.lights,{emissive:{value:new Ct(0)},specular:{value:new Ct(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Wt.meshphong_vert,fragmentShader:Wt.meshphong_frag},standard:{uniforms:hn([pt.common,pt.envmap,pt.aomap,pt.lightmap,pt.emissivemap,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.roughnessmap,pt.metalnessmap,pt.fog,pt.lights,{emissive:{value:new Ct(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Wt.meshphysical_vert,fragmentShader:Wt.meshphysical_frag},toon:{uniforms:hn([pt.common,pt.aomap,pt.lightmap,pt.emissivemap,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.gradientmap,pt.fog,pt.lights,{emissive:{value:new Ct(0)}}]),vertexShader:Wt.meshtoon_vert,fragmentShader:Wt.meshtoon_frag},matcap:{uniforms:hn([pt.common,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.fog,{matcap:{value:null}}]),vertexShader:Wt.meshmatcap_vert,fragmentShader:Wt.meshmatcap_frag},points:{uniforms:hn([pt.points,pt.fog]),vertexShader:Wt.points_vert,fragmentShader:Wt.points_frag},dashed:{uniforms:hn([pt.common,pt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Wt.linedashed_vert,fragmentShader:Wt.linedashed_frag},depth:{uniforms:hn([pt.common,pt.displacementmap]),vertexShader:Wt.depth_vert,fragmentShader:Wt.depth_frag},normal:{uniforms:hn([pt.common,pt.bumpmap,pt.normalmap,pt.displacementmap,{opacity:{value:1}}]),vertexShader:Wt.meshnormal_vert,fragmentShader:Wt.meshnormal_frag},sprite:{uniforms:hn([pt.sprite,pt.fog]),vertexShader:Wt.sprite_vert,fragmentShader:Wt.sprite_frag},background:{uniforms:{uvTransform:{value:new Ht},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Wt.background_vert,fragmentShader:Wt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ht}},vertexShader:Wt.backgroundCube_vert,fragmentShader:Wt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Wt.cube_vert,fragmentShader:Wt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Wt.equirect_vert,fragmentShader:Wt.equirect_frag},distance:{uniforms:hn([pt.common,pt.displacementmap,{referencePosition:{value:new D},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Wt.distance_vert,fragmentShader:Wt.distance_frag},shadow:{uniforms:hn([pt.lights,pt.fog,{color:{value:new Ct(0)},opacity:{value:1}}]),vertexShader:Wt.shadow_vert,fragmentShader:Wt.shadow_frag}};gi.physical={uniforms:hn([gi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ht},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ht},clearcoatNormalScale:{value:new Mt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ht},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ht},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ht},sheen:{value:0},sheenColor:{value:new Ct(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ht},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ht},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ht},transmissionSamplerSize:{value:new Mt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ht},attenuationDistance:{value:0},attenuationColor:{value:new Ct(0)},specularColor:{value:new Ct(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ht},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ht},anisotropyVector:{value:new Mt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ht}}]),vertexShader:Wt.meshphysical_vert,fragmentShader:Wt.meshphysical_frag};var mh={r:0,b:0,g:0},Fw=new fe,W0=new Ht;W0.set(-1,0,0,0,1,0,0,0,1);function Uw(i,t,e,n,s,r){let o=new Ct(0),a=s===!0?0:1,l,c,h=null,u=0,d=null;function f(_){let E=_.isScene===!0?_.background:null;if(E&&E.isTexture){let b=_.backgroundBlurriness>0;E=t.get(E,b)}return E}function g(_){let E=!1,b=f(_);b===null?p(o,a):b&&b.isColor&&(p(b,1),E=!0);let T=i.xr.getEnvironmentBlendMode();T==="additive"?e.buffers.color.setClear(0,0,0,1,r):T==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(i.autoClear||E)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function x(_,E){let b=f(E);b&&(b.isCubeTexture||b.mapping===Ma)?(c===void 0&&(c=new Ut(new cn(1,1,1),new Le({name:"BackgroundCubeMaterial",uniforms:Us(gi.backgroundCube.uniforms),vertexShader:gi.backgroundCube.vertexShader,fragmentShader:gi.backgroundCube.fragmentShader,side:fn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(T,S,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=b,c.material.uniforms.backgroundBlurriness.value=E.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Fw.makeRotationFromEuler(E.backgroundRotation)).transpose(),b.isCubeTexture&&b.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(W0),c.material.toneMapped=Yt.getTransfer(b.colorSpace)!==ie,(h!==b||u!==b.version||d!==i.toneMapping)&&(c.material.needsUpdate=!0,h=b,u=b.version,d=i.toneMapping),c.layers.enableAll(),_.unshift(c,c.geometry,c.material,0,0,null)):b&&b.isTexture&&(l===void 0&&(l=new Ut(new Ie(2,2),new Le({name:"BackgroundMaterial",uniforms:Us(gi.background.uniforms),vertexShader:gi.background.vertexShader,fragmentShader:gi.background.fragmentShader,side:rs,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=b,l.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,l.material.toneMapped=Yt.getTransfer(b.colorSpace)!==ie,b.matrixAutoUpdate===!0&&b.updateMatrix(),l.material.uniforms.uvTransform.value.copy(b.matrix),(h!==b||u!==b.version||d!==i.toneMapping)&&(l.material.needsUpdate=!0,h=b,u=b.version,d=i.toneMapping),l.layers.enableAll(),_.unshift(l,l.geometry,l.material,0,0,null))}function p(_,E){_.getRGB(mh,vf(i)),e.buffers.color.setClear(mh.r,mh.g,mh.b,E,r)}function m(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(_,E=1){o.set(_),a=E,p(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(_){a=_,p(o,a)},render:g,addToRenderList:x,dispose:m}}function Bw(i,t){let e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null),r=s,o=!1;function a(P,I,B,k,U){let V=!1,q=u(P,k,B,I);r!==q&&(r=q,c(r.object)),V=f(P,k,B,U),V&&g(P,k,B,U),U!==null&&t.update(U,i.ELEMENT_ARRAY_BUFFER),(V||o)&&(o=!1,b(P,I,B,k),U!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(U).buffer))}function l(){return i.createVertexArray()}function c(P){return i.bindVertexArray(P)}function h(P){return i.deleteVertexArray(P)}function u(P,I,B,k){let U=k.wireframe===!0,V=n[I.id];V===void 0&&(V={},n[I.id]=V);let q=P.isInstancedMesh===!0?P.id:0,nt=V[q];nt===void 0&&(nt={},V[q]=nt);let $=nt[B.id];$===void 0&&($={},nt[B.id]=$);let J=$[U];return J===void 0&&(J=d(l()),$[U]=J),J}function d(P){let I=[],B=[],k=[];for(let U=0;U<e;U++)I[U]=0,B[U]=0,k[U]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:I,enabledAttributes:B,attributeDivisors:k,object:P,attributes:{},index:null}}function f(P,I,B,k){let U=r.attributes,V=I.attributes,q=0,nt=B.getAttributes();for(let $ in nt)if(nt[$].location>=0){let et=U[$],at=V[$];if(at===void 0&&($==="instanceMatrix"&&P.instanceMatrix&&(at=P.instanceMatrix),$==="instanceColor"&&P.instanceColor&&(at=P.instanceColor)),et===void 0||et.attribute!==at||at&&et.data!==at.data)return!0;q++}return r.attributesNum!==q||r.index!==k}function g(P,I,B,k){let U={},V=I.attributes,q=0,nt=B.getAttributes();for(let $ in nt)if(nt[$].location>=0){let et=V[$];et===void 0&&($==="instanceMatrix"&&P.instanceMatrix&&(et=P.instanceMatrix),$==="instanceColor"&&P.instanceColor&&(et=P.instanceColor));let at={};at.attribute=et,et&&et.data&&(at.data=et.data),U[$]=at,q++}r.attributes=U,r.attributesNum=q,r.index=k}function x(){let P=r.newAttributes;for(let I=0,B=P.length;I<B;I++)P[I]=0}function p(P){m(P,0)}function m(P,I){let B=r.newAttributes,k=r.enabledAttributes,U=r.attributeDivisors;B[P]=1,k[P]===0&&(i.enableVertexAttribArray(P),k[P]=1),U[P]!==I&&(i.vertexAttribDivisor(P,I),U[P]=I)}function _(){let P=r.newAttributes,I=r.enabledAttributes;for(let B=0,k=I.length;B<k;B++)I[B]!==P[B]&&(i.disableVertexAttribArray(B),I[B]=0)}function E(P,I,B,k,U,V,q){q===!0?i.vertexAttribIPointer(P,I,B,U,V):i.vertexAttribPointer(P,I,B,k,U,V)}function b(P,I,B,k){x();let U=k.attributes,V=B.getAttributes(),q=I.defaultAttributeValues;for(let nt in V){let $=V[nt];if($.location>=0){let J=U[nt];if(J===void 0&&(nt==="instanceMatrix"&&P.instanceMatrix&&(J=P.instanceMatrix),nt==="instanceColor"&&P.instanceColor&&(J=P.instanceColor)),J!==void 0){let et=J.normalized,at=J.itemSize,rt=t.get(J);if(rt===void 0)continue;let zt=rt.buffer,It=rt.type,Lt=rt.bytesPerElement,X=It===i.INT||It===i.UNSIGNED_INT||J.gpuType===Pc;if(J.isInterleavedBufferAttribute){let Q=J.data,yt=Q.stride,Bt=J.offset;if(Q.isInstancedInterleavedBuffer){for(let _t=0;_t<$.locationSize;_t++)m($.location+_t,Q.meshPerAttribute);P.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let _t=0;_t<$.locationSize;_t++)p($.location+_t);i.bindBuffer(i.ARRAY_BUFFER,zt);for(let _t=0;_t<$.locationSize;_t++)E($.location+_t,at/$.locationSize,It,et,yt*Lt,(Bt+at/$.locationSize*_t)*Lt,X)}else{if(J.isInstancedBufferAttribute){for(let Q=0;Q<$.locationSize;Q++)m($.location+Q,J.meshPerAttribute);P.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let Q=0;Q<$.locationSize;Q++)p($.location+Q);i.bindBuffer(i.ARRAY_BUFFER,zt);for(let Q=0;Q<$.locationSize;Q++)E($.location+Q,at/$.locationSize,It,et,at*Lt,at/$.locationSize*Q*Lt,X)}}else if(q!==void 0){let et=q[nt];if(et!==void 0)switch(et.length){case 2:i.vertexAttrib2fv($.location,et);break;case 3:i.vertexAttrib3fv($.location,et);break;case 4:i.vertexAttrib4fv($.location,et);break;default:i.vertexAttrib1fv($.location,et)}}}}_()}function T(){M();for(let P in n){let I=n[P];for(let B in I){let k=I[B];for(let U in k){let V=k[U];for(let q in V)h(V[q].object),delete V[q];delete k[U]}}delete n[P]}}function S(P){if(n[P.id]===void 0)return;let I=n[P.id];for(let B in I){let k=I[B];for(let U in k){let V=k[U];for(let q in V)h(V[q].object),delete V[q];delete k[U]}}delete n[P.id]}function A(P){for(let I in n){let B=n[I];for(let k in B){let U=B[k];if(U[P.id]===void 0)continue;let V=U[P.id];for(let q in V)h(V[q].object),delete V[q];delete U[P.id]}}}function v(P){for(let I in n){let B=n[I],k=P.isInstancedMesh===!0?P.id:0,U=B[k];if(U!==void 0){for(let V in U){let q=U[V];for(let nt in q)h(q[nt].object),delete q[nt];delete U[V]}delete B[k],Object.keys(B).length===0&&delete n[I]}}}function M(){R(),o=!0,r!==s&&(r=s,c(r.object))}function R(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:M,resetDefaultState:R,dispose:T,releaseStatesOfGeometry:S,releaseStatesOfObject:v,releaseStatesOfProgram:A,initAttributes:x,enableAttribute:p,disableUnusedAttributes:_}}function zw(i,t,e){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),e.update(c,n,1)}function o(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),e.update(c,n,h))}function a(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let d=0;for(let f=0;f<h;f++)d+=c[f];e.update(d,n,1)}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function Hw(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let A=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(A){return!(A!==bn&&n.convert(A)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(A){let v=A===We&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(A!==_n&&A!==Kn&&!v&&n.convert(A)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function l(A){if(A==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",h=l(c);h!==c&&(Ot("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let u=e.logarithmicDepthBuffer===!0,d=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&d===!1&&Ot("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=i.getParameter(i.MAX_TEXTURE_SIZE),p=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),m=i.getParameter(i.MAX_VERTEX_ATTRIBS),_=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),E=i.getParameter(i.MAX_VARYING_VECTORS),b=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),T=i.getParameter(i.MAX_SAMPLES),S=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:g,maxTextureSize:x,maxCubemapSize:p,maxAttributes:m,maxVertexUniforms:_,maxVaryings:E,maxFragmentUniforms:b,maxSamples:T,samples:S}}function Gw(i){let t=this,e=null,n=0,s=!1,r=!1,o=new yn,a=new Ht,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){let f=u.length!==0||d||n!==0||s;return s=d,n=u.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){e=h(u,d,0)},this.setState=function(u,d,f){let g=u.clippingPlanes,x=u.clipIntersection,p=u.clipShadows,m=i.get(u);if(!s||g===null||g.length===0||r&&!p)r?h(null):c();else{let _=r?0:n,E=_*4,b=m.clippingState||null;l.value=b,b=h(g,d,E,f);for(let T=0;T!==E;++T)b[T]=e[T];m.clippingState=b,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=_}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(u,d,f,g){let x=u!==null?u.length:0,p=null;if(x!==0){if(p=l.value,g!==!0||p===null){let m=f+x*4,_=d.matrixWorldInverse;a.getNormalMatrix(_),(p===null||p.length<m)&&(p=new Float32Array(m));for(let E=0,b=f;E!==x;++E,b+=4)o.copy(u[E]).applyMatrix4(_,a),o.normal.toArray(p,b),p[b+3]=o.constant}l.value=p,l.needsUpdate=!0}return t.numPlanes=x,t.numIntersection=0,p}}var Kr=4,Vw=6,Ww=20,Xw=256,Pa=new Ds,M0=new Ct,wf=null,Sf=0,Tf=0,Ef=!1,$w=new D,zs=new D,Qr=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){let{size:o=256,position:a=$w}=r;wf=this._renderer.getRenderTarget(),Sf=this._renderer.getActiveCubeFace(),Tf=this._renderer.getActiveMipmapLevel(),Ef=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,s,l,a),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=T0(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=S0(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(wf,Sf,Tf),this._renderer.xr.enabled=Ef,t.scissorTest=!1,jr(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===as||t.mapping===Fs?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),wf=this._renderer.getRenderTarget(),Sf=this._renderer.getActiveCubeFace(),Tf=this._renderer.getActiveMipmapLevel(),Ef=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:Be,minFilter:Be,generateMipmaps:!1,type:We,format:bn,colorSpace:Qo,depthBuffer:!1},s=w0(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=w0(t,e,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=Zw(r)),this._blurMaterial=Yw(r,t,e),this._ggxMaterial=qw(r,t,e)}return s}_compileMaterial(t){let e=new Ut(new be,t);this._renderer.compile(e,Pa)}_sceneToCubeUV(t,e,n,s,r){let l=new Ye(90,1,e,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,f=u.toneMapping;u.getClearColor(M0),u.toneMapping=Cn,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(s),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Ut(new cn,new we({name:"PMREM.Background",side:fn,depthWrite:!1,depthTest:!1})));let x=this._backgroundBox,p=x.material,m=!1,_=t.background;_?_.isColor&&(p.color.copy(_),t.background=null,m=!0):(p.color.copy(M0),m=!0);for(let E=0;E<6;E++){let b=E%3;b===0?(l.up.set(0,c[E],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[E],r.y,r.z)):b===1?(l.up.set(0,0,c[E]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[E],r.z)):(l.up.set(0,c[E],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[E]));let T=this._cubeSize;jr(s,b*T,E>2?T:0,T,T),u.setRenderTarget(s),m&&u.render(x,l),u.render(t,l)}u.toneMapping=f,u.autoClear=d,t.background=_}_textureToCubeUV(t,e){let n=this._renderer,s=t.mapping===as||t.mapping===Fs;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=T0()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=S0());let r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;let a=r.uniforms;a.envMap.value=t;let l=this._cubeSize;jr(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(o,Pa)}_applyPMREM(t){let e=this._renderer,n=e.autoClear;e.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){let s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;let l=o.uniforms,c=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),u=Math.sqrt(c*c-h*h),d=c*1.25,f=u*d,{_lodMax:g}=this,x=this._sizeLods[n],p=3*x*(n>g-Kr?n-g+Kr:0),m=4*(this._cubeSize-x);l.envMap.value=t.texture,l.roughness.value=f,l.mipInt.value=g-e,jr(r,p,m,3*x,2*x),s.setRenderTarget(r),s.render(a,Pa),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=g-n,jr(t,p,m,3*x,2*x),s.setRenderTarget(t),s.render(a,Pa)}_blur(t,e,n,s){let r=this._pingPongRenderTarget,o=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,n,o),this._blurPass(r,t,n,n,o)}_blurPass(t,e,n,s,r){let o=this._renderer,a=this._blurMaterial,l=this._lodMeshes[s];l.material=a;let c=a.uniforms;c.envMap.value=t.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-n;let h=this._sizeLods[s],u=3*h*(s>this._lodMax-Kr?s-this._lodMax+Kr:0),d=4*(this._cubeSize-h);jr(e,u,d,3*h,2*h),o.setRenderTarget(e),o.render(l,Pa)}};function Zw(i){let t=[],e=[],n=i,s=i-Kr+1+Vw;for(let r=0;r<s;r++){let o=Math.pow(2,n);t.push(o);let a=1/(o-2),l=-a,c=1+a,h=[l,l,c,l,c,c,l,l,c,c,l,c],u=6,d=6,f=3,g=new Float32Array(f*d*u),x=new Float32Array(f*d*u);for(let m=0;m<u;m++){let _=m%3*2/3-1,E=m>2?0:-1,b=[_,E,0,_+2/3,E,0,_+2/3,E+1,0,_,E,0,_+2/3,E+1,0,_,E+1,0];g.set(b,f*d*m);for(let T=0;T<d;T++){let S=h[T*2]*2-1,A=h[T*2+1]*2-1;m===0?zs.set(1,A,S):m===1?zs.set(-S,1,-A):m===2?zs.set(-S,A,1):m===3?zs.set(-1,A,-S):m===4?zs.set(-S,-1,A):zs.set(S,A,-1),zs.toArray(x,(m*d+T)*f)}}let p=new be;p.setAttribute("position",new Ue(g,f)),p.setAttribute("outputDirection",new Ue(x,f)),e.push(new Ut(p,null)),n>Kr&&n--}return{lodMeshes:e,sizeLods:t}}function w0(i,t,e){let n=new Re(i,t,e);return n.texture.mapping=Ma,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function jr(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function qw(i,t,e){return new Le({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Xw,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:vh(),fragmentShader:`

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
		`,blending:On,depthTest:!1,depthWrite:!1})}function Yw(i,t,e){return new Le({name:"SphericalGaussianBlur",defines:{SAMPLES:Ww,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:vh(),fragmentShader:`

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
		`,blending:On,depthTest:!1,depthWrite:!1})}function S0(){return new Le({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:vh(),fragmentShader:`

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
		`,blending:On,depthTest:!1,depthWrite:!1})}function T0(){return new Le({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:vh(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:On,depthTest:!1,depthWrite:!1})}function vh(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var xh=class extends Re{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new ca(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new cn(5,5,5),r=new Le({name:"CubemapFromEquirect",uniforms:Us(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:fn,blending:On});r.uniforms.tEquirect.value=e;let o=new Ut(s,r),a=e.minFilter;return e.minFilter===pi&&(e.minFilter=Be),new Ec(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){let r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,s);t.setRenderTarget(r)}};function jw(i){let t=new WeakMap,e=new WeakMap,n=null;function s(d,f=!1){return d==null?null:f?o(d):r(d)}function r(d){if(d&&d.isTexture){let f=d.mapping;if(f===Zr||f===Cc)if(t.has(d)){let g=t.get(d).texture;return a(g,d.mapping)}else{let g=d.image;if(g&&g.height>0){let x=new xh(g.height);return x.fromEquirectangularTexture(i,d),t.set(d,x),d.addEventListener("dispose",c),a(x.texture,d.mapping)}else return null}}return d}function o(d){if(d&&d.isTexture){let f=d.mapping,g=f===Zr||f===Cc,x=f===as||f===Fs;if(g||x){let p=e.get(d),m=p!==void 0?p.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==m)return n===null&&(n=new Qr(i)),p=g?n.fromEquirectangular(d,p):n.fromCubemap(d,p),p.texture.pmremVersion=d.pmremVersion,e.set(d,p),p.texture;if(p!==void 0)return p.texture;{let _=d.image;return g&&_&&_.height>0||x&&_&&l(_)?(n===null&&(n=new Qr(i)),p=g?n.fromEquirectangular(d):n.fromCubemap(d),p.texture.pmremVersion=d.pmremVersion,e.set(d,p),d.addEventListener("dispose",h),p.texture):null}}}return d}function a(d,f){return f===Zr?d.mapping=as:f===Cc&&(d.mapping=Fs),d}function l(d){let f=0,g=6;for(let x=0;x<g;x++)d[x]!==void 0&&f++;return f===g}function c(d){let f=d.target;f.removeEventListener("dispose",c);let g=t.get(f);g!==void 0&&(t.delete(f),g.dispose())}function h(d){let f=d.target;f.removeEventListener("dispose",h);let g=e.get(f);g!==void 0&&(e.delete(f),g.dispose())}function u(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:u}}function Kw(i){let t={};function e(n){if(t[n]!==void 0)return t[n];let s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let s=e(n);return s===null&&ks("WebGLRenderer: "+n+" extension not supported."),s}}}function Jw(i,t,e,n){let s={},r=new WeakMap;function o(u){let d=u.target;d.index!==null&&t.remove(d.index);for(let g in d.attributes)t.remove(d.attributes[g]);d.removeEventListener("dispose",o),delete s[d.id];let f=r.get(d);f&&(t.remove(f),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,e.memory.geometries--}function a(u,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,e.memory.geometries++),d}function l(u){let d=u.attributes;for(let f in d)t.update(d[f],i.ARRAY_BUFFER)}function c(u){let d=[],f=u.index,g=u.attributes.position,x=0;if(g===void 0)return;if(f!==null){let _=f.array;x=f.version;for(let E=0,b=_.length;E<b;E+=3){let T=_[E+0],S=_[E+1],A=_[E+2];d.push(T,S,S,A,A,T)}}else{let _=g.array;x=g.version;for(let E=0,b=_.length/3-1;E<b;E+=3){let T=E+0,S=E+1,A=E+2;d.push(T,S,S,A,A,T)}}let p=new(g.count>=65535?aa:oa)(d,1);p.version=x;let m=r.get(u);m&&t.remove(m),r.set(u,p)}function h(u){let d=r.get(u);if(d){let f=u.index;f!==null&&d.version<f.version&&c(u)}else c(u);return r.get(u)}return{get:a,update:l,getWireframeAttribute:h}}function Qw(i,t,e){let n;function s(u){n=u}let r,o;function a(u){r=u.type,o=u.bytesPerElement}function l(u,d){i.drawElements(n,d,r,u*o),e.update(d,n,1)}function c(u,d,f){f!==0&&(i.drawElementsInstanced(n,d,r,u*o,f),e.update(d,n,f))}function h(u,d,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,d,0,r,u,0,f);let x=0;for(let p=0;p<f;p++)x+=d[p];e.update(x,n,1)}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function tS(i){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(e.calls++,o){case i.TRIANGLES:e.triangles+=a*(r/3);break;case i.LINES:e.lines+=a*(r/2);break;case i.LINE_STRIP:e.lines+=a*(r-1);break;case i.LINE_LOOP:e.lines+=a*r;break;case i.POINTS:e.points+=a*r;break;default:Nt("WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function eS(i,t,e){let n=new WeakMap,s=new _e;function r(o,a,l){let c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0,d=n.get(a);if(d===void 0||d.count!==u){let M=function(){A.dispose(),n.delete(a),a.removeEventListener("dispose",M)};d!==void 0&&d.texture.dispose();let f=a.morphAttributes.position!==void 0,g=a.morphAttributes.normal!==void 0,x=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],m=a.morphAttributes.normal||[],_=a.morphAttributes.color||[],E=0;f===!0&&(E=1),g===!0&&(E=2),x===!0&&(E=3);let b=a.attributes.position.count*E,T=1;b>t.maxTextureSize&&(T=Math.ceil(b/t.maxTextureSize),b=t.maxTextureSize);let S=new Float32Array(b*T*4*u),A=new sa(S,b,T,u);A.type=Kn,A.needsUpdate=!0;let v=E*4;for(let R=0;R<u;R++){let P=p[R],I=m[R],B=_[R],k=b*T*4*R;for(let U=0;U<P.count;U++){let V=U*v;f===!0&&(s.fromBufferAttribute(P,U),S[k+V+0]=s.x,S[k+V+1]=s.y,S[k+V+2]=s.z,S[k+V+3]=0),g===!0&&(s.fromBufferAttribute(I,U),S[k+V+4]=s.x,S[k+V+5]=s.y,S[k+V+6]=s.z,S[k+V+7]=0),x===!0&&(s.fromBufferAttribute(B,U),S[k+V+8]=s.x,S[k+V+9]=s.y,S[k+V+10]=s.z,S[k+V+11]=B.itemSize===4?s.w:1)}}d={count:u,texture:A,size:new Mt(b,T)},n.set(a,d),a.addEventListener("dispose",M)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,e);else{let f=0;for(let x=0;x<c.length;x++)f+=c[x];let g=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(i,"morphTargetBaseInfluence",g),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",d.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function nS(i,t,e,n,s){let r=new WeakMap;function o(c){let h=s.render.frame,u=c.geometry,d=t.get(c,u);if(r.get(d)!==h&&(t.update(d),r.set(d,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let f=c.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return d}function a(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:o,dispose:a}}var iS={[ef]:"LINEAR_TONE_MAPPING",[nf]:"REINHARD_TONE_MAPPING",[sf]:"CINEON_TONE_MAPPING",[rf]:"ACES_FILMIC_TONE_MAPPING",[af]:"AGX_TONE_MAPPING",[lf]:"NEUTRAL_TONE_MAPPING",[of]:"CUSTOM_TONE_MAPPING"};function sS(i,t,e,n,s,r){let o=new Re(t,e,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),a=null,l=null,c=new be;c.setAttribute("position",new Jt([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new Jt([0,2,0,0,2,0],2));let h=new fc({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),u=new Ut(c,h),d=new Ds(-1,1,1,-1,0,1),f=null,g=null,x=!1,p,m=null,_=[],E=!1;this.setSize=function(b,T){o.setSize(b,T),a!==null&&a.setSize(b,T),l!==null&&l.setSize(b,T);for(let S=0;S<_.length;S++){let A=_[S];A.setSize&&A.setSize(b,T)}},this.setEffects=function(b){_=b,E=_.length>0&&_[0].isRenderPass===!0;let T=o.width,S=o.height;_.length>0&&a===null&&(a=new Re(T,S,{type:We,depthBuffer:!1,stencilBuffer:!1}),l=new Re(T,S,{type:We,depthBuffer:!1,stencilBuffer:!1}));for(let A=0;A<_.length;A++){let v=_[A];v.setSize&&v.setSize(T,S)}},this.begin=function(b,T){if(x||b.toneMapping===Cn&&_.length===0)return!1;if(m=T,T!==null){let S=T.width,A=T.height;(o.width!==S||o.height!==A)&&this.setSize(S,A)}return E===!1&&b.setRenderTarget(o),p=b.toneMapping,b.toneMapping=Cn,!0},this.hasRenderPass=function(){return E},this.end=function(b,T){b.toneMapping=p,x=!0;let S=o,A=a;for(let v=0;v<_.length;v++){let M=_[v];M.enabled!==!1&&(M.render(b,A,S,T),M.needsSwap!==!1&&(S=A,A=A===a?l:a))}if(f!==b.outputColorSpace||g!==b.toneMapping){f=b.outputColorSpace,g=b.toneMapping,h.defines={},Yt.getTransfer(f)===ie&&(h.defines.SRGB_TRANSFER="");let v=iS[g];v&&(h.defines[v]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=S.texture,b.setRenderTarget(m),b.render(u,d),m=null,x=!1},this.isCompositing=function(){return x},this.dispose=function(){o.dispose(),a!==null&&a.dispose(),l!==null&&l.dispose(),c.dispose(),h.dispose()}}var X0=new Ve,Rf=new es(1,1),$0=new sa,Z0=new cc,q0=new ca,E0=[],A0=[],C0=new Float32Array(16),R0=new Float32Array(9),P0=new Float32Array(4);function to(i,t,e){let n=i[0];if(n<=0||n>0)return i;let s=t*e,r=E0[s];if(r===void 0&&(r=new Float32Array(s),E0[s]=r),t!==0){n.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,i[o].toArray(r,a)}return r}function Xe(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function $e(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function _h(i,t){let e=A0[t];e===void 0&&(e=new Int32Array(t),A0[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function rS(i,t){let e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function oS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Xe(e,t))return;i.uniform2fv(this.addr,t),$e(e,t)}}function aS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Xe(e,t))return;i.uniform3fv(this.addr,t),$e(e,t)}}function lS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Xe(e,t))return;i.uniform4fv(this.addr,t),$e(e,t)}}function cS(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(Xe(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),$e(e,t)}else{if(Xe(e,n))return;P0.set(n),i.uniformMatrix2fv(this.addr,!1,P0),$e(e,n)}}function hS(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(Xe(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),$e(e,t)}else{if(Xe(e,n))return;R0.set(n),i.uniformMatrix3fv(this.addr,!1,R0),$e(e,n)}}function uS(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(Xe(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),$e(e,t)}else{if(Xe(e,n))return;C0.set(n),i.uniformMatrix4fv(this.addr,!1,C0),$e(e,n)}}function dS(i,t){let e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function fS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Xe(e,t))return;i.uniform2iv(this.addr,t),$e(e,t)}}function pS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Xe(e,t))return;i.uniform3iv(this.addr,t),$e(e,t)}}function mS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Xe(e,t))return;i.uniform4iv(this.addr,t),$e(e,t)}}function gS(i,t){let e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function xS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Xe(e,t))return;i.uniform2uiv(this.addr,t),$e(e,t)}}function yS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Xe(e,t))return;i.uniform3uiv(this.addr,t),$e(e,t)}}function vS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Xe(e,t))return;i.uniform4uiv(this.addr,t),$e(e,t)}}function _S(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Rf.compareFunction=e.isReversedDepthBuffer()?ph:fh,r=Rf):r=X0,e.setTexture2D(t||r,s)}function bS(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||Z0,s)}function MS(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||q0,s)}function wS(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||$0,s)}function SS(i){switch(i){case 5126:return rS;case 35664:return oS;case 35665:return aS;case 35666:return lS;case 35674:return cS;case 35675:return hS;case 35676:return uS;case 5124:case 35670:return dS;case 35667:case 35671:return fS;case 35668:case 35672:return pS;case 35669:case 35673:return mS;case 5125:return gS;case 36294:return xS;case 36295:return yS;case 36296:return vS;case 35678:case 36198:case 36298:case 36306:case 35682:return _S;case 35679:case 36299:case 36307:return bS;case 35680:case 36300:case 36308:case 36293:return MS;case 36289:case 36303:case 36311:case 36292:return wS}}function TS(i,t){i.uniform1fv(this.addr,t)}function ES(i,t){let e=to(t,this.size,2);i.uniform2fv(this.addr,e)}function AS(i,t){let e=to(t,this.size,3);i.uniform3fv(this.addr,e)}function CS(i,t){let e=to(t,this.size,4);i.uniform4fv(this.addr,e)}function RS(i,t){let e=to(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function PS(i,t){let e=to(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function kS(i,t){let e=to(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function IS(i,t){i.uniform1iv(this.addr,t)}function LS(i,t){i.uniform2iv(this.addr,t)}function DS(i,t){i.uniform3iv(this.addr,t)}function NS(i,t){i.uniform4iv(this.addr,t)}function OS(i,t){i.uniform1uiv(this.addr,t)}function FS(i,t){i.uniform2uiv(this.addr,t)}function US(i,t){i.uniform3uiv(this.addr,t)}function BS(i,t){i.uniform4uiv(this.addr,t)}function zS(i,t,e){let n=this.cache,s=t.length,r=_h(e,s);Xe(n,r)||(i.uniform1iv(this.addr,r),$e(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=Rf:o=X0;for(let a=0;a!==s;++a)e.setTexture2D(t[a]||o,r[a])}function HS(i,t,e){let n=this.cache,s=t.length,r=_h(e,s);Xe(n,r)||(i.uniform1iv(this.addr,r),$e(n,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||Z0,r[o])}function GS(i,t,e){let n=this.cache,s=t.length,r=_h(e,s);Xe(n,r)||(i.uniform1iv(this.addr,r),$e(n,r));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||q0,r[o])}function VS(i,t,e){let n=this.cache,s=t.length,r=_h(e,s);Xe(n,r)||(i.uniform1iv(this.addr,r),$e(n,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||$0,r[o])}function WS(i){switch(i){case 5126:return TS;case 35664:return ES;case 35665:return AS;case 35666:return CS;case 35674:return RS;case 35675:return PS;case 35676:return kS;case 5124:case 35670:return IS;case 35667:case 35671:return LS;case 35668:case 35672:return DS;case 35669:case 35673:return NS;case 5125:return OS;case 36294:return FS;case 36295:return US;case 36296:return BS;case 35678:case 36198:case 36298:case 36306:case 35682:return zS;case 35679:case 36299:case 36307:return HS;case 35680:case 36300:case 36308:case 36293:return GS;case 36289:case 36303:case 36311:case 36292:return VS}}var Pf=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=SS(e.type)}},kf=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=WS(e.type)}},If=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(t,e[a.id],n)}}},Af=/(\w+)(\])?(\[|\.)?/g;function k0(i,t){i.seq.push(t),i.map[t.id]=t}function XS(i,t,e){let n=i.name,s=n.length;for(Af.lastIndex=0;;){let r=Af.exec(n),o=Af.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){k0(e,c===void 0?new Pf(a,i,t):new kf(a,i,t));break}else{let u=e.map[a];u===void 0&&(u=new If(a),k0(e,u)),e=u}}}var Jr=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){let a=t.getActiveUniform(e,o),l=t.getUniformLocation(e,a.name);XS(a,l,this)}let s=[],r=[];for(let o of this.seq)o.type===t.SAMPLER_2D_SHADOW||o.type===t.SAMPLER_CUBE_SHADOW||o.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){let r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){let s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,o=e.length;r!==o;++r){let a=e[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,s)}}static seqWithValue(t,e){let n=[];for(let s=0,r=t.length;s!==r;++s){let o=t[s];o.id in e&&n.push(o)}return n}};function I0(i,t,e){let n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}var $S=37297,ZS=0;function qS(i,t){let e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){let a=o+1;n.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return n.join(`
`)}var L0=new Ht;function YS(i){Yt._getMatrix(L0,Yt.workingColorSpace,i);let t=`mat3( ${L0.elements.map(e=>e.toFixed(4))} )`;switch(Yt.getTransfer(i)){case ta:return[t,"LinearTransferOETF"];case ie:return[t,"sRGBTransferOETF"];default:return Ot("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function D0(i,t,e){let n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return e.toUpperCase()+`

`+r+`

`+qS(i.getShaderSource(t),a)}else return r}function jS(i,t){let e=YS(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var KS={[ef]:"Linear",[nf]:"Reinhard",[sf]:"Cineon",[rf]:"ACESFilmic",[af]:"AgX",[lf]:"Neutral",[of]:"Custom"};function JS(i,t){let e=KS[t];return e===void 0?(Ot("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var gh=new D;function QS(){Yt.getLuminanceCoefficients(gh);let i=gh.x.toFixed(4),t=gh.y.toFixed(4),e=gh.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function t1(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ia).join(`
`)}function e1(i){let t=[];for(let e in i){let n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function n1(i,t){let e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(t,s),o=r.name,a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:i.getAttribLocation(t,o),locationSize:a}}return e}function Ia(i){return i!==""}function N0(i,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function O0(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var i1=/^[ \t]*#include +<([\w\d./]+)>/gm;function Lf(i){return i.replace(i1,r1)}var s1=new Map;function r1(i,t){let e=Wt[t];if(e===void 0){let n=s1.get(t);if(n!==void 0)e=Wt[n],Ot('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return Lf(e)}var o1=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function F0(i){return i.replace(o1,a1)}function a1(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function U0(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}var l1={[Ns]:"SHADOWMAP_TYPE_PCF",[$r]:"SHADOWMAP_TYPE_VSM"};function c1(i){return l1[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var h1={[as]:"ENVMAP_TYPE_CUBE",[Fs]:"ENVMAP_TYPE_CUBE",[Ma]:"ENVMAP_TYPE_CUBE_UV"};function u1(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":h1[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var d1={[Fs]:"ENVMAP_MODE_REFRACTION"};function f1(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":d1[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var p1={[tf]:"ENVMAP_BLENDING_MULTIPLY",[n0]:"ENVMAP_BLENDING_MIX",[i0]:"ENVMAP_BLENDING_ADD"};function m1(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":p1[i.combine]||"ENVMAP_BLENDING_NONE"}function g1(i){let t=i.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function x1(i,t,e,n){let s=i.getContext(),r=e.defines,o=e.vertexShader,a=e.fragmentShader,l=c1(e),c=u1(e),h=f1(e),u=m1(e),d=g1(e),f=t1(e),g=e1(r),x=s.createProgram(),p,m,_=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(Ia).join(`
`),p.length>0&&(p+=`
`),m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(Ia).join(`
`),m.length>0&&(m+=`
`)):(p=[U0(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ia).join(`
`),m=[U0(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Cn?"#define TONE_MAPPING":"",e.toneMapping!==Cn?Wt.tonemapping_pars_fragment:"",e.toneMapping!==Cn?JS("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Wt.colorspace_pars_fragment,jS("linearToOutputTexel",e.outputColorSpace),QS(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Ia).join(`
`)),o=Lf(o),o=N0(o,e),o=O0(o,e),a=Lf(a),a=N0(a,e),a=O0(a,e),o=F0(o),a=F0(a),e.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,p=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,m=["#define varying in",e.glslVersion===yf?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===yf?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);let E=_+p+o,b=_+m+a,T=I0(s,s.VERTEX_SHADER,E),S=I0(s,s.FRAGMENT_SHADER,b);s.attachShader(x,T),s.attachShader(x,S),e.index0AttributeName!==void 0?s.bindAttribLocation(x,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(x,0,"position"),s.linkProgram(x);function A(P){if(i.debug.checkShaderErrors){let I=s.getProgramInfoLog(x)||"",B=s.getShaderInfoLog(T)||"",k=s.getShaderInfoLog(S)||"",U=I.trim(),V=B.trim(),q=k.trim(),nt=!0,$=!0;if(s.getProgramParameter(x,s.LINK_STATUS)===!1)if(nt=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,x,T,S);else{let J=D0(s,T,"vertex"),et=D0(s,S,"fragment");Nt("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(x,s.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+U+`
`+J+`
`+et)}else U!==""?Ot("WebGLProgram: Program Info Log:",U):(V===""||q==="")&&($=!1);$&&(P.diagnostics={runnable:nt,programLog:U,vertexShader:{log:V,prefix:p},fragmentShader:{log:q,prefix:m}})}s.deleteShader(T),s.deleteShader(S),v=new Jr(s,x),M=n1(s,x)}let v;this.getUniforms=function(){return v===void 0&&A(this),v};let M;this.getAttributes=function(){return M===void 0&&A(this),M};let R=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return R===!1&&(R=s.getProgramParameter(x,$S)),R},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(x),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=ZS++,this.cacheKey=t,this.usedTimes=1,this.program=x,this.vertexShader=T,this.fragmentShader=S,this}var y1=0,Df=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new Nf(t),e.set(t,n)),n}},Nf=class{constructor(t){this.id=y1++,this.code=t,this.usedTimes=0}};function v1(i){return i===cs||i===Ca||i===Ra}function _1(i,t,e,n,s,r){let o=new Or,a=new Df,l=new Set,c=[],h=new Map,u=n.logarithmicDepthBuffer,d=n.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(v){return l.add(v),v===0?"uv":`uv${v}`}function x(v,M,R,P,I,B){let k=P.fog,U=I.geometry,V=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?P.environment:null,q=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,nt=t.get(v.envMap||V,q),$=nt&&nt.mapping===Ma?nt.image.height:null,J=f[v.type];v.precision!==null&&(d=n.getMaxPrecision(v.precision),d!==v.precision&&Ot("WebGLProgram.getParameters:",v.precision,"not supported, using",d,"instead."));let et=U.morphAttributes.position||U.morphAttributes.normal||U.morphAttributes.color,at=et!==void 0?et.length:0,rt=0;U.morphAttributes.position!==void 0&&(rt=1),U.morphAttributes.normal!==void 0&&(rt=2),U.morphAttributes.color!==void 0&&(rt=3);let zt,It,Lt,X;if(J){let ue=gi[J];zt=ue.vertexShader,It=ue.fragmentShader}else{zt=v.vertexShader,It=v.fragmentShader;let ue=a.getVertexShaderStage(v),ee=a.getFragmentShaderStage(v);a.update(v,ue,ee),Lt=ue.id,X=ee.id}let Q=i.getRenderTarget(),yt=i.state.buffers.depth.getReversed(),Bt=I.isInstancedMesh===!0,_t=I.isBatchedMesh===!0,Xt=!!v.map,He=!!v.matcap,$t=!!nt,te=!!v.aoMap,he=!!v.lightMap,qt=!!v.bumpMap&&v.wireframe===!1,ve=!!v.normalMap,Ze=!!v.displacementMap,mn=!!v.emissiveMap,Me=!!v.metalnessMap,De=!!v.roughnessMap,O=v.anisotropy>0,rn=v.clearcoat>0,re=v.dispersion>0,C=v.retroreflectivity>0,y=v.iridescence>0,F=v.sheen>0,G=v.transmission>0,Y=O&&!!v.anisotropyMap,ot=rn&&!!v.clearcoatMap,lt=rn&&!!v.clearcoatNormalMap,j=rn&&!!v.clearcoatRoughnessMap,tt=y&&!!v.iridescenceMap,ct=y&&!!v.iridescenceThicknessMap,Rt=F&&!!v.sheenColorMap,ft=F&&!!v.sheenRoughnessMap,ht=!!v.specularMap,Pt=!!v.specularColorMap,Dt=!!v.specularIntensityMap,Gt=G&&!!v.transmissionMap,N=G&&!!v.thicknessMap,ut=!!v.gradientMap,K=!!v.alphaMap,dt=v.alphaTest>0,xt=!!v.alphaHash,it=!!v.extensions,kt=Cn;v.toneMapped&&(Q===null||Q.isXRRenderTarget===!0)&&(kt=i.toneMapping);let Tt={shaderID:J,shaderType:v.type,shaderName:v.name,vertexShader:zt,fragmentShader:It,defines:v.defines,customVertexShaderID:Lt,customFragmentShaderID:X,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:d,batching:_t,batchingColor:_t&&I._colorsTexture!==null,instancing:Bt,instancingColor:Bt&&I.instanceColor!==null,instancingMorph:Bt&&I.morphTexture!==null,outputColorSpace:Q===null?i.outputColorSpace:Q.isXRRenderTarget===!0?Q.texture.colorSpace:Yt.workingColorSpace,alphaToCoverage:!!v.alphaToCoverage,map:Xt,matcap:He,envMap:$t,envMapMode:$t&&nt.mapping,envMapCubeUVHeight:$,aoMap:te,lightMap:he,bumpMap:qt,normalMap:ve,displacementMap:Ze,emissiveMap:mn,normalMapObjectSpace:ve&&v.normalMapType===o0,normalMapTangentSpace:ve&&v.normalMapType===dh,packedNormalMap:ve&&v.normalMapType===dh&&v1(v.normalMap.format),metalnessMap:Me,roughnessMap:De,anisotropy:O,anisotropyMap:Y,clearcoat:rn,clearcoatMap:ot,clearcoatNormalMap:lt,clearcoatRoughnessMap:j,dispersion:re,retroreflection:C,iridescence:y,iridescenceMap:tt,iridescenceThicknessMap:ct,sheen:F,sheenColorMap:Rt,sheenRoughnessMap:ft,specularMap:ht,specularColorMap:Pt,specularIntensityMap:Dt,transmission:G,transmissionMap:Gt,thicknessMap:N,gradientMap:ut,opaque:v.transparent===!1&&v.blending===os&&v.alphaToCoverage===!1,alphaMap:K,alphaTest:dt,alphaHash:xt,combine:v.combine,mapUv:Xt&&g(v.map.channel),aoMapUv:te&&g(v.aoMap.channel),lightMapUv:he&&g(v.lightMap.channel),bumpMapUv:qt&&g(v.bumpMap.channel),normalMapUv:ve&&g(v.normalMap.channel),displacementMapUv:Ze&&g(v.displacementMap.channel),emissiveMapUv:mn&&g(v.emissiveMap.channel),metalnessMapUv:Me&&g(v.metalnessMap.channel),roughnessMapUv:De&&g(v.roughnessMap.channel),anisotropyMapUv:Y&&g(v.anisotropyMap.channel),clearcoatMapUv:ot&&g(v.clearcoatMap.channel),clearcoatNormalMapUv:lt&&g(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:j&&g(v.clearcoatRoughnessMap.channel),iridescenceMapUv:tt&&g(v.iridescenceMap.channel),iridescenceThicknessMapUv:ct&&g(v.iridescenceThicknessMap.channel),sheenColorMapUv:Rt&&g(v.sheenColorMap.channel),sheenRoughnessMapUv:ft&&g(v.sheenRoughnessMap.channel),specularMapUv:ht&&g(v.specularMap.channel),specularColorMapUv:Pt&&g(v.specularColorMap.channel),specularIntensityMapUv:Dt&&g(v.specularIntensityMap.channel),transmissionMapUv:Gt&&g(v.transmissionMap.channel),thicknessMapUv:N&&g(v.thicknessMap.channel),alphaMapUv:K&&g(v.alphaMap.channel),vertexTangents:!!U.attributes.tangent&&(ve||O),vertexNormals:!!U.attributes.normal,vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!U.attributes.color&&U.attributes.color.itemSize===4,pointsUvs:I.isPoints===!0&&!!U.attributes.uv&&(Xt||K),fog:!!k,useFog:v.fog===!0,fogExp2:!!k&&k.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||U.attributes.normal===void 0&&ve===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:yt,skinning:I.isSkinnedMesh===!0,hasPositionAttribute:U.attributes.position!==void 0,morphTargets:U.morphAttributes.position!==void 0,morphNormals:U.morphAttributes.normal!==void 0,morphColors:U.morphAttributes.color!==void 0,morphTargetsCount:at,morphTextureStride:rt,numSunLights:M.sun.length,numDirLights:M.directional.length,numPointLights:M.point.length,numSpotLights:M.spot.length,numSpotLightMaps:M.spotLightMap.length,numRectAreaLights:M.rectArea.length,numHemiLights:M.hemi.length,numSunLightShadows:M.sunShadowMap.length,numDirLightShadows:M.directionalShadowMap.length,numPointLightShadows:M.pointShadowMap.length,numSpotLightShadows:M.spotShadowMap.length,numSpotLightShadowsWithMaps:M.numSpotLightShadowsWithMaps,numLightProbes:M.numLightProbes,numLightProbeGrids:B.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:v.dithering,shadowMapEnabled:i.shadowMap.enabled&&R.length>0,shadowMapType:i.shadowMap.type,toneMapping:kt,decodeVideoTexture:Xt&&v.map.isVideoTexture===!0&&Yt.getTransfer(v.map.colorSpace)===ie,decodeVideoTextureEmissive:mn&&v.emissiveMap.isVideoTexture===!0&&Yt.getTransfer(v.emissiveMap.colorSpace)===ie,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===vn,flipSided:v.side===fn,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:it&&v.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(it&&v.extensions.multiDraw===!0||_t)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return Tt.vertexUv1s=l.has(1),Tt.vertexUv2s=l.has(2),Tt.vertexUv3s=l.has(3),l.clear(),Tt}function p(v){let M=[];if(v.shaderID?M.push(v.shaderID):(M.push(v.customVertexShaderID),M.push(v.customFragmentShaderID)),v.defines!==void 0)for(let R in v.defines)M.push(R),M.push(v.defines[R]);return v.isRawShaderMaterial===!1&&(m(M,v),_(M,v),M.push(i.outputColorSpace)),M.push(v.customProgramCacheKey),M.join()}function m(v,M){v.push(M.precision),v.push(M.outputColorSpace),v.push(M.envMapMode),v.push(M.envMapCubeUVHeight),v.push(M.mapUv),v.push(M.alphaMapUv),v.push(M.lightMapUv),v.push(M.aoMapUv),v.push(M.bumpMapUv),v.push(M.normalMapUv),v.push(M.displacementMapUv),v.push(M.emissiveMapUv),v.push(M.metalnessMapUv),v.push(M.roughnessMapUv),v.push(M.anisotropyMapUv),v.push(M.clearcoatMapUv),v.push(M.clearcoatNormalMapUv),v.push(M.clearcoatRoughnessMapUv),v.push(M.iridescenceMapUv),v.push(M.iridescenceThicknessMapUv),v.push(M.sheenColorMapUv),v.push(M.sheenRoughnessMapUv),v.push(M.specularMapUv),v.push(M.specularColorMapUv),v.push(M.specularIntensityMapUv),v.push(M.transmissionMapUv),v.push(M.thicknessMapUv),v.push(M.combine),v.push(M.fogExp2),v.push(M.sizeAttenuation),v.push(M.morphTargetsCount),v.push(M.morphAttributeCount),v.push(M.numSunLights),v.push(M.numDirLights),v.push(M.numPointLights),v.push(M.numSpotLights),v.push(M.numSpotLightMaps),v.push(M.numHemiLights),v.push(M.numRectAreaLights),v.push(M.numSunLightShadows),v.push(M.numDirLightShadows),v.push(M.numPointLightShadows),v.push(M.numSpotLightShadows),v.push(M.numSpotLightShadowsWithMaps),v.push(M.numLightProbes),v.push(M.shadowMapType),v.push(M.toneMapping),v.push(M.numClippingPlanes),v.push(M.numClipIntersection),v.push(M.depthPacking)}function _(v,M){o.disableAll(),M.instancing&&o.enable(0),M.instancingColor&&o.enable(1),M.instancingMorph&&o.enable(2),M.matcap&&o.enable(3),M.envMap&&o.enable(4),M.normalMapObjectSpace&&o.enable(5),M.normalMapTangentSpace&&o.enable(6),M.clearcoat&&o.enable(7),M.iridescence&&o.enable(8),M.alphaTest&&o.enable(9),M.vertexColors&&o.enable(10),M.vertexAlphas&&o.enable(11),M.vertexUv1s&&o.enable(12),M.vertexUv2s&&o.enable(13),M.vertexUv3s&&o.enable(14),M.vertexTangents&&o.enable(15),M.anisotropy&&o.enable(16),M.alphaHash&&o.enable(17),M.batching&&o.enable(18),M.dispersion&&o.enable(19),M.retroreflection&&o.enable(24),M.batchingColor&&o.enable(20),M.gradientMap&&o.enable(21),M.packedNormalMap&&o.enable(22),M.vertexNormals&&o.enable(23),v.push(o.mask),o.disableAll(),M.fog&&o.enable(0),M.useFog&&o.enable(1),M.flatShading&&o.enable(2),M.logarithmicDepthBuffer&&o.enable(3),M.reversedDepthBuffer&&o.enable(4),M.skinning&&o.enable(5),M.morphTargets&&o.enable(6),M.morphNormals&&o.enable(7),M.morphColors&&o.enable(8),M.premultipliedAlpha&&o.enable(9),M.shadowMapEnabled&&o.enable(10),M.doubleSided&&o.enable(11),M.flipSided&&o.enable(12),M.useDepthPacking&&o.enable(13),M.dithering&&o.enable(14),M.transmission&&o.enable(15),M.sheen&&o.enable(16),M.opaque&&o.enable(17),M.pointsUvs&&o.enable(18),M.decodeVideoTexture&&o.enable(19),M.decodeVideoTextureEmissive&&o.enable(20),M.alphaToCoverage&&o.enable(21),M.numLightProbeGrids>0&&o.enable(22),M.hasPositionAttribute&&o.enable(23),v.push(o.mask)}function E(v){let M=f[v.type],R;if(M){let P=gi[M];R=Bs.clone(P.uniforms)}else R=v.uniforms;return R}function b(v,M){let R=h.get(M);return R!==void 0?++R.usedTimes:(R=new x1(i,M,v,s),c.push(R),h.set(M,R)),R}function T(v){if(--v.usedTimes===0){let M=c.indexOf(v);c[M]=c[c.length-1],c.pop(),h.delete(v.cacheKey),v.destroy()}}function S(v){a.remove(v)}function A(){a.dispose()}return{getParameters:x,getProgramCacheKey:p,getUniforms:E,acquireProgram:b,releaseProgram:T,releaseShaderCache:S,programs:c,dispose:A}}function b1(){let i=new WeakMap;function t(o){return i.has(o)}function e(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function M1(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function B0(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function z0(){let i=[],t=0,e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function o(d){let f=0;return d.isInstancedMesh&&(f+=2),d.isSkinnedMesh&&(f+=1),f}function a(d,f,g,x,p,m){let _=i[t];return _===void 0?(_={id:d.id,object:d,geometry:f,material:g,materialVariant:o(d),groupOrder:x,renderOrder:d.renderOrder,z:p,group:m},i[t]=_):(_.id=d.id,_.object=d,_.geometry=f,_.material=g,_.materialVariant=o(d),_.groupOrder=x,_.renderOrder=d.renderOrder,_.z=p,_.group=m),t++,_}function l(d,f,g,x,p,m,_){_.reversedDepth===!0&&(p=-p);let E=a(d,f,g,x,p,m);g.transmission>0?n.push(E):g.transparent===!0?s.push(E):e.push(E)}function c(d,f,g,x,p,m){let _=a(d,f,g,x,p,m);g.transmission>0?n.unshift(_):g.transparent===!0?s.unshift(_):e.unshift(_)}function h(d,f){e.length>1&&e.sort(d||M1),n.length>1&&n.sort(f||B0),s.length>1&&s.sort(f||B0)}function u(){for(let d=t,f=i.length;d<f;d++){let g=i[d];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:u,sort:h}}function w1(){let i=new WeakMap;function t(n,s){let r=i.get(n),o;return r===void 0?(o=new z0,i.set(n,[o])):s>=r.length?(o=new z0,r.push(o)):o=r[s],o}function e(){i=new WeakMap}return{get:t,dispose:e}}function S1(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new D,color:new Ct};break;case"SpotLight":e={position:new D,direction:new D,color:new Ct,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new D,color:new Ct,distance:0,decay:0};break;case"HemisphereLight":e={direction:new D,skyColor:new Ct,groundColor:new Ct};break;case"RectAreaLight":e={color:new Ct,position:new D,halfWidth:new D,halfHeight:new D};break}return i[t.id]=e,e}}}function T1(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Mt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Mt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Mt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}var E1=0;function A1(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function C1(i){let t=new S1,e=T1(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new D);let s=new D,r=new fe,o=new fe;function a(c){let h=0,u=0,d=0;for(let I=0;I<9;I++)n.probe[I].set(0,0,0);let f=0,g=0,x=0,p=0,m=0,_=0,E=0,b=0,T=0,S=0,A=0,v=0,M=0,R=0;c.sort(A1);for(let I=0,B=c.length;I<B;I++){let k=c[I],U=k.color,V=k.intensity,q=k.distance,nt=null;if(k.shadow&&k.shadow.map&&(k.shadow.map.texture.format===cs?nt=k.shadow.map.texture:nt=k.shadow.map.depthTexture||k.shadow.map.texture),k.isAmbientLight)h+=U.r*V,u+=U.g*V,d+=U.b*V;else if(k.isLightProbe){for(let $=0;$<9;$++)n.probe[$].addScaledVector(k.sh.coefficients[$],V);R++}else if(k.isSunLight){let $=t.get(k);if($.color.copy(k.color).multiplyScalar(k.intensity),k.castShadow){let J=k.shadow,et=e.get(k);et.shadowIntensity=J.intensity,et.shadowBias=J.bias,et.shadowNormalBias=J.normalBias,et.shadowRadius=J.radius,et.shadowMapSize.copy(J.mapSize).multiply(J.getFrameExtents()),n.sunShadow[g]=et,n.sunShadowMap[g]=nt;let at=J.getViewportCount();for(let rt=0;rt<at;rt++)n.sunShadowMatrix[x+rt]=J.getMatrix(rt),n.sunShadowCascade[x+rt]=J._cascadeData[rt];x+=at,g++}n.sun[f]=$,f++}else if(k.isDirectionalLight){let $=t.get(k);if($.color.copy(k.color).multiplyScalar(k.intensity),k.castShadow){let J=k.shadow,et=e.get(k);et.shadowIntensity=J.intensity,et.shadowBias=J.bias,et.shadowNormalBias=J.normalBias,et.shadowRadius=J.radius,et.shadowMapSize=J.mapSize,n.directionalShadow[p]=et,n.directionalShadowMap[p]=nt,n.directionalShadowMatrix[p]=k.shadow.matrix,T++}n.directional[p]=$,p++}else if(k.isSpotLight){let $=t.get(k);$.position.setFromMatrixPosition(k.matrixWorld),$.color.copy(U).multiplyScalar(V),$.distance=q,$.coneCos=Math.cos(k.angle),$.penumbraCos=Math.cos(k.angle*(1-k.penumbra)),$.decay=k.decay,n.spot[_]=$;let J=k.shadow;if(k.map&&(n.spotLightMap[v]=k.map,v++,J.updateMatrices(k),k.castShadow&&M++),n.spotLightMatrix[_]=J.matrix,k.castShadow){let et=e.get(k);et.shadowIntensity=J.intensity,et.shadowBias=J.bias,et.shadowNormalBias=J.normalBias,et.shadowRadius=J.radius,et.shadowMapSize=J.mapSize,n.spotShadow[_]=et,n.spotShadowMap[_]=nt,A++}_++}else if(k.isRectAreaLight){let $=t.get(k);$.color.copy(U).multiplyScalar(V),$.halfWidth.set(k.width*.5,0,0),$.halfHeight.set(0,k.height*.5,0),n.rectArea[E]=$,E++}else if(k.isPointLight){let $=t.get(k);if($.color.copy(k.color).multiplyScalar(k.intensity),$.distance=k.distance,$.decay=k.decay,k.castShadow){let J=k.shadow,et=e.get(k);et.shadowIntensity=J.intensity,et.shadowBias=J.bias,et.shadowNormalBias=J.normalBias,et.shadowRadius=J.radius,et.shadowMapSize=J.mapSize,et.shadowCameraNear=J.camera.near,et.shadowCameraFar=J.camera.far,n.pointShadow[m]=et,n.pointShadowMap[m]=nt,n.pointShadowMatrix[m]=k.shadow.matrix,S++}n.point[m]=$,m++}else if(k.isHemisphereLight){let $=t.get(k);$.skyColor.copy(k.color).multiplyScalar(V),$.groundColor.copy(k.groundColor).multiplyScalar(V),n.hemi[b]=$,b++}}E>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=pt.LTC_FLOAT_1,n.rectAreaLTC2=pt.LTC_FLOAT_2):(n.rectAreaLTC1=pt.LTC_HALF_1,n.rectAreaLTC2=pt.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;let P=n.hash;(P.sunLength!==f||P.directionalLength!==p||P.pointLength!==m||P.spotLength!==_||P.rectAreaLength!==E||P.hemiLength!==b||P.numSunShadows!==g||P.numDirectionalShadows!==T||P.numPointShadows!==S||P.numSpotShadows!==A||P.numSpotMaps!==v||P.numLightProbes!==R)&&(n.sun.length=f,n.directional.length=p,n.spot.length=_,n.rectArea.length=E,n.point.length=m,n.hemi.length=b,n.sunShadow.length=g,n.sunShadowMap.length=g,n.sunShadowMatrix.length=x,n.sunShadowCascade.length=x,n.directionalShadow.length=T,n.directionalShadowMap.length=T,n.directionalShadowMatrix.length=T,n.pointShadow.length=S,n.pointShadowMap.length=S,n.pointShadowMatrix.length=S,n.spotShadow.length=A,n.spotShadowMap.length=A,n.spotLightMatrix.length=A+v-M,n.spotLightMap.length=v,n.numSpotLightShadowsWithMaps=M,n.numLightProbes=R,P.sunLength=f,P.directionalLength=p,P.pointLength=m,P.spotLength=_,P.rectAreaLength=E,P.hemiLength=b,P.numSunShadows=g,P.numDirectionalShadows=T,P.numPointShadows=S,P.numSpotShadows=A,P.numSpotMaps=v,P.numLightProbes=R,n.version=E1++)}function l(c,h){let u=0,d=0,f=0,g=0,x=0,p=0,m=h.matrixWorldInverse;for(let _=0,E=c.length;_<E;_++){let b=c[_];if(b.isSunLight){let T=n.sun[u];T.direction.setFromMatrixPosition(b.matrixWorld),T.direction.transformDirection(m),u++}else if(b.isDirectionalLight){let T=n.directional[d];T.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(m),d++}else if(b.isSpotLight){let T=n.spot[g];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(m),T.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(m),g++}else if(b.isRectAreaLight){let T=n.rectArea[x];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(m),o.identity(),r.copy(b.matrixWorld),r.premultiply(m),o.extractRotation(r),T.halfWidth.set(b.width*.5,0,0),T.halfHeight.set(0,b.height*.5,0),T.halfWidth.applyMatrix4(o),T.halfHeight.applyMatrix4(o),x++}else if(b.isPointLight){let T=n.point[f];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(m),f++}else if(b.isHemisphereLight){let T=n.hemi[p];T.direction.setFromMatrixPosition(b.matrixWorld),T.direction.transformDirection(m),p++}}}return{setup:a,setupView:l,state:n}}function H0(i){let t=new C1(i),e=[],n=[],s=[];function r(d){u.camera=d,e.length=0,n.length=0,s.length=0}function o(d){e.push(d)}function a(d){n.push(d)}function l(d){s.push(d)}function c(){t.setup(e)}function h(d){t.setupView(e,d)}let u={lightsArray:e,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:u,setupLights:c,setupLightsView:h,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}function R1(i){let t=new WeakMap;function e(s,r=0){let o=t.get(s),a;return o===void 0?(a=new H0(i),t.set(s,[a])):r>=o.length?(a=new H0(i),o.push(a)):a=o[r],a}function n(){t=new WeakMap}return{get:e,dispose:n}}var P1=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,k1=`uniform sampler2D shadow_pass;
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
}`,I1=[new D(1,0,0),new D(-1,0,0),new D(0,1,0),new D(0,-1,0),new D(0,0,1),new D(0,0,-1)],L1=[new D(0,-1,0),new D(0,-1,0),new D(0,0,1),new D(0,0,-1),new D(0,-1,0),new D(0,-1,0)],G0=new fe,ka=new D,Cf=new D;function D1(i,t,e){let n=new zr,s=new Mt,r=new Mt,o=new _e,a=new pc,l=new mc,c={},h=e.maxTextureSize,u={[rs]:fn,[fn]:rs,[vn]:vn},d=new Le({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Mt},radius:{value:4}},vertexShader:P1,fragmentShader:k1}),f=d.clone();f.defines.HORIZONTAL_PASS=1;let g=new be;g.setAttribute("position",new Ue(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let x=new Ut(g,d),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Ns;let m=this.type;this.render=function(S,A,v){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||S.length===0)return;this.type===Fg&&(Ot("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Ns);let M=i.getRenderTarget(),R=i.getActiveCubeFace(),P=i.getActiveMipmapLevel(),I=i.state;I.setBlending(On),I.buffers.depth.getReversed()===!0?I.buffers.color.setClear(0,0,0,0):I.buffers.color.setClear(1,1,1,1),I.buffers.depth.setTest(!0),I.setScissorTest(!1);let B=m!==this.type;B&&A.traverse(function(k){k.material&&(Array.isArray(k.material)?k.material.forEach(U=>U.needsUpdate=!0):k.material.needsUpdate=!0)});for(let k=0,U=S.length;k<U;k++){let V=S[k],q=V.shadow;if(q===void 0){Ot("WebGLShadowMap:",V,"has no shadow.");continue}if(q.autoUpdate===!1&&q.needsUpdate===!1)continue;s.copy(q.mapSize);let nt=q.getFrameExtents();s.multiply(nt),r.copy(q.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/nt.x),s.x=r.x*nt.x,q.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/nt.y),s.y=r.y*nt.y,q.mapSize.y=r.y));let $=i.state.buffers.depth.getReversed();if(q.camera._reversedDepth=$,q.map===null||B===!0){if(q.map!==null&&(q.map.depthTexture!==null&&(q.map.depthTexture.dispose(),q.map.depthTexture=null),q.map.dispose()),this.type===$r){if(V.isPointLight){Ot("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}q.map=new Re(s.x,s.y,{format:cs,type:We,minFilter:Be,magFilter:Be,generateMipmaps:!1}),q.map.texture.name=V.name+".shadowMap",q.map.depthTexture=new es(s.x,s.y,Kn),q.map.depthTexture.name=V.name+".shadowMapDepth",q.map.depthTexture.format=ci,q.map.depthTexture.compareFunction=null,q.map.depthTexture.minFilter=je,q.map.depthTexture.magFilter=je}else V.isPointLight?(q.map=new xh(s.x),q.map.depthTexture=new uc(s.x,jn)):(q.map=new Re(s.x,s.y),q.map.depthTexture=new es(s.x,s.y,jn)),q.map.depthTexture.name=V.name+".shadowMap",q.map.depthTexture.format=ci,this.type===Ns?(q.map.depthTexture.compareFunction=$?ph:fh,q.map.depthTexture.minFilter=Be,q.map.depthTexture.magFilter=Be):(q.map.depthTexture.compareFunction=null,q.map.depthTexture.minFilter=je,q.map.depthTexture.magFilter=je);q.camera.updateProjectionMatrix()}q.map.isWebGLCubeRenderTarget!==!0&&(q.map.width!==s.x||q.map.height!==s.y)&&q.map.setSize(s.x,s.y);let J=q.map.isWebGLCubeRenderTarget?6:q.getViewportCount();V.isPointLight!==!0&&q.updateMatrices(V,v);for(let et=0;et<J;et++){let at=q.getCamera(et);if(V.isPointLight){let rt=q.camera,zt=q.matrix,It=V.distance||rt.far;It!==rt.far&&(rt.far=It,rt.updateProjectionMatrix()),ka.setFromMatrixPosition(V.matrixWorld),rt.position.copy(ka),Cf.copy(rt.position),Cf.add(I1[et]),rt.up.copy(L1[et]),rt.lookAt(Cf),rt.updateMatrixWorld(),zt.makeTranslation(-ka.x,-ka.y,-ka.z),G0.multiplyMatrices(rt.projectionMatrix,rt.matrixWorldInverse),q._frustum.setFromProjectionMatrix(G0,rt.coordinateSystem,rt.reversedDepth)}if(q.map.isWebGLCubeRenderTarget)i.setRenderTarget(q.map,et),i.clear();else{et===0&&(i.setRenderTarget(q.map),i.clear());let rt=q.getViewport(et);o.set(r.x*rt.x,r.y*rt.y,r.x*rt.z,r.y*rt.w),I.viewport(o)}n=q.getFrustum(et),b(A,v,at,V,this.type)}q.isPointLightShadow!==!0&&this.type===$r&&_(q,v),q.needsUpdate=!1}m=this.type,p.needsUpdate=!1,i.setRenderTarget(M,R,P)};function _(S,A){let v=t.update(x);d.defines.VSM_SAMPLES!==S.blurSamples&&(d.defines.VSM_SAMPLES=S.blurSamples,f.defines.VSM_SAMPLES=S.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),S.mapPass===null?S.mapPass=new Re(s.x,s.y,{format:cs,type:We}):(S.mapPass.width!==S.map.width||S.mapPass.height!==S.map.height)&&S.mapPass.setSize(S.map.width,S.map.height),d.uniforms.shadow_pass.value=S.map.depthTexture,d.uniforms.resolution.value.set(S.map.width,S.map.height),d.uniforms.radius.value=S.radius,i.setRenderTarget(S.mapPass),i.clear(),i.renderBufferDirect(A,null,v,d,x,null),f.uniforms.shadow_pass.value=S.mapPass.texture,f.uniforms.resolution.value.set(S.map.width,S.map.height),f.uniforms.radius.value=S.radius,i.setRenderTarget(S.map),i.clear(),i.renderBufferDirect(A,null,v,f,x,null)}function E(S,A,v,M){let R=null,P=v.isPointLight===!0?S.customDistanceMaterial:S.customDepthMaterial;if(P!==void 0)R=P;else if(R=v.isPointLight===!0?l:a,i.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0||A.alphaToCoverage===!0){let I=R.uuid,B=A.uuid,k=c[I];k===void 0&&(k={},c[I]=k);let U=k[B];U===void 0&&(U=R.clone(),k[B]=U,A.addEventListener("dispose",T)),R=U}if(R.visible=A.visible,R.wireframe=A.wireframe,M===$r?R.side=A.shadowSide!==null?A.shadowSide:A.side:R.side=A.shadowSide!==null?A.shadowSide:u[A.side],R.alphaMap=A.alphaMap,R.alphaTest=A.alphaToCoverage===!0?.5:A.alphaTest,R.map=A.map,R.clipShadows=A.clipShadows,R.clippingPlanes=A.clippingPlanes,R.clipIntersection=A.clipIntersection,R.displacementMap=A.displacementMap,R.displacementScale=A.displacementScale,R.displacementBias=A.displacementBias,R.wireframeLinewidth=A.wireframeLinewidth,R.linewidth=A.linewidth,v.isPointLight===!0&&R.isMeshDistanceMaterial===!0){let I=i.properties.get(R);I.light=v}return R}function b(S,A,v,M,R){if(S.visible===!1)return;if(S.layers.test(A.layers)&&(S.isMesh||S.isLine||S.isPoints)&&(S.castShadow||S.receiveShadow&&R===$r)&&(!S.frustumCulled||S.intersectsFrustum(n))){S.modelViewMatrix.multiplyMatrices(v.matrixWorldInverse,S.matrixWorld);let B=t.update(S),k=S.material;if(Array.isArray(k)){let U=B.groups;for(let V=0,q=U.length;V<q;V++){let nt=U[V],$=k[nt.materialIndex];if($&&$.visible){let J=E(S,$,M,R);S.onBeforeShadow(i,S,A,v,B,J,nt),i.renderBufferDirect(v,null,B,J,S,nt),S.onAfterShadow(i,S,A,v,B,J,nt)}}}else if(k.visible){let U=E(S,k,M,R);S.onBeforeShadow(i,S,A,v,B,U,null),i.renderBufferDirect(v,null,B,U,S,null),S.onAfterShadow(i,S,A,v,B,U,null)}}let I=S.children;for(let B=0,k=I.length;B<k;B++)b(I[B],A,v,M,R)}function T(S){S.target.removeEventListener("dispose",T);for(let v in c){let M=c[v],R=S.target.uuid;R in M&&(M[R].dispose(),delete M[R])}}}function N1(i,t){function e(){let N=!1,ut=new _e,K=null,dt=new _e(0,0,0,0);return{setMask:function(xt){K!==xt&&!N&&(i.colorMask(xt,xt,xt,xt),K=xt)},setLocked:function(xt){N=xt},setClear:function(xt,it,kt,Tt,ue){ue===!0&&(xt*=Tt,it*=Tt,kt*=Tt),ut.set(xt,it,kt,Tt),dt.equals(ut)===!1&&(i.clearColor(xt,it,kt,Tt),dt.copy(ut))},reset:function(){N=!1,K=null,dt.set(-1,0,0,0)}}}function n(){let N=!1,ut=!1,K=null,dt=null,xt=null;return{setReversed:function(it){if(ut!==it){let kt=t.get("EXT_clip_control");it?kt.clipControlEXT(kt.LOWER_LEFT_EXT,kt.ZERO_TO_ONE_EXT):kt.clipControlEXT(kt.LOWER_LEFT_EXT,kt.NEGATIVE_ONE_TO_ONE_EXT),ut=it;let Tt=xt;xt=null,this.setClear(Tt)}},getReversed:function(){return ut},setTest:function(it){it?Q(i.DEPTH_TEST):yt(i.DEPTH_TEST)},setMask:function(it){K!==it&&!N&&(i.depthMask(it),K=it)},setFunc:function(it){if(ut&&(it=x0[it]),dt!==it){switch(it){case Kl:i.depthFunc(i.NEVER);break;case Jl:i.depthFunc(i.ALWAYS);break;case Ql:i.depthFunc(i.LESS);break;case Ir:i.depthFunc(i.LEQUAL);break;case tc:i.depthFunc(i.EQUAL);break;case ec:i.depthFunc(i.GEQUAL);break;case nc:i.depthFunc(i.GREATER);break;case ic:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}dt=it}},setLocked:function(it){N=it},setClear:function(it){xt!==it&&(xt=it,ut&&(it=1-it),i.clearDepth(it))},reset:function(){N=!1,K=null,dt=null,xt=null,ut=!1}}}function s(){let N=!1,ut=null,K=null,dt=null,xt=null,it=null,kt=null,Tt=null,ue=null;return{setTest:function(ee){N||(ee?Q(i.STENCIL_TEST):yt(i.STENCIL_TEST))},setMask:function(ee){ut!==ee&&!N&&(i.stencilMask(ee),ut=ee)},setFunc:function(ee,zn,ti){(K!==ee||dt!==zn||xt!==ti)&&(i.stencilFunc(ee,zn,ti),K=ee,dt=zn,xt=ti)},setOp:function(ee,zn,ti){(it!==ee||kt!==zn||Tt!==ti)&&(i.stencilOp(ee,zn,ti),it=ee,kt=zn,Tt=ti)},setLocked:function(ee){N=ee},setClear:function(ee){ue!==ee&&(i.clearStencil(ee),ue=ee)},reset:function(){N=!1,ut=null,K=null,dt=null,xt=null,it=null,kt=null,Tt=null,ue=null}}}let r=new e,o=new n,a=new s,l=new WeakMap,c=new WeakMap,h={},u={},d={},f=new WeakMap,g=[],x=null,p=!1,m=null,_=null,E=null,b=null,T=null,S=null,A=null,v=new Ct(0,0,0),M=0,R=!1,P=null,I=null,B=null,k=null,U=null,V=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),q=!1,nt=0,$=i.getParameter(i.VERSION);$.indexOf("WebGL")!==-1?(nt=parseFloat(/^WebGL (\d)/.exec($)[1]),q=nt>=1):$.indexOf("OpenGL ES")!==-1&&(nt=parseFloat(/^OpenGL ES (\d)/.exec($)[1]),q=nt>=2);let J=null,et={},at=i.getParameter(i.SCISSOR_BOX),rt=i.getParameter(i.VIEWPORT),zt=new _e().fromArray(at),It=new _e().fromArray(rt);function Lt(N,ut,K,dt){let xt=new Uint8Array(4),it=i.createTexture();i.bindTexture(N,it),i.texParameteri(N,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(N,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let kt=0;kt<K;kt++)N===i.TEXTURE_3D||N===i.TEXTURE_2D_ARRAY?i.texImage3D(ut,0,i.RGBA,1,1,dt,0,i.RGBA,i.UNSIGNED_BYTE,xt):i.texImage2D(ut+kt,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,xt);return it}let X={};X[i.TEXTURE_2D]=Lt(i.TEXTURE_2D,i.TEXTURE_2D,1),X[i.TEXTURE_CUBE_MAP]=Lt(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),X[i.TEXTURE_2D_ARRAY]=Lt(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),X[i.TEXTURE_3D]=Lt(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),Q(i.DEPTH_TEST),o.setFunc(Ir),qt(!1),ve(Yd),Q(i.CULL_FACE),te(On);function Q(N){h[N]!==!0&&(i.enable(N),h[N]=!0)}function yt(N){h[N]!==!1&&(i.disable(N),h[N]=!1)}function Bt(N,ut){return d[N]!==ut?(i.bindFramebuffer(N,ut),d[N]=ut,N===i.DRAW_FRAMEBUFFER&&(d[i.FRAMEBUFFER]=ut),N===i.FRAMEBUFFER&&(d[i.DRAW_FRAMEBUFFER]=ut),!0):!1}function _t(N,ut){let K=g,dt=!1;if(N){K=f.get(ut),K===void 0&&(K=[],f.set(ut,K));let xt=N.textures;if(K.length!==xt.length||K[0]!==i.COLOR_ATTACHMENT0){for(let it=0,kt=xt.length;it<kt;it++)K[it]=i.COLOR_ATTACHMENT0+it;K.length=xt.length,dt=!0}}else K[0]!==i.BACK&&(K[0]=i.BACK,dt=!0);dt&&i.drawBuffers(K)}function Xt(N){return x!==N?(i.useProgram(N),x=N,!0):!1}let He={[Os]:i.FUNC_ADD,[Bg]:i.FUNC_SUBTRACT,[zg]:i.FUNC_REVERSE_SUBTRACT};He[Hg]=i.MIN,He[Gg]=i.MAX;let $t={[Vg]:i.ZERO,[Wg]:i.ONE,[Xg]:i.SRC_COLOR,[Jd]:i.SRC_ALPHA,[Kg]:i.SRC_ALPHA_SATURATE,[Yg]:i.DST_COLOR,[Zg]:i.DST_ALPHA,[$g]:i.ONE_MINUS_SRC_COLOR,[Qd]:i.ONE_MINUS_SRC_ALPHA,[jg]:i.ONE_MINUS_DST_COLOR,[qg]:i.ONE_MINUS_DST_ALPHA,[Jg]:i.CONSTANT_COLOR,[Qg]:i.ONE_MINUS_CONSTANT_COLOR,[t0]:i.CONSTANT_ALPHA,[e0]:i.ONE_MINUS_CONSTANT_ALPHA};function te(N,ut,K,dt,xt,it,kt,Tt,ue,ee){if(N===On){p===!0&&(yt(i.BLEND),p=!1);return}if(p===!1&&(Q(i.BLEND),p=!0),N!==Ug){if(N!==m||ee!==R){if((_!==Os||T!==Os)&&(i.blendEquation(i.FUNC_ADD),_=Os,T=Os),ee)switch(N){case os:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case pn:i.blendFunc(i.ONE,i.ONE);break;case jd:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Kd:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Nt("WebGLState: Invalid blending: ",N);break}else switch(N){case os:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case pn:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case jd:Nt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Kd:Nt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Nt("WebGLState: Invalid blending: ",N);break}E=null,b=null,S=null,A=null,v.set(0,0,0),M=0,m=N,R=ee}return}xt=xt||ut,it=it||K,kt=kt||dt,(ut!==_||xt!==T)&&(i.blendEquationSeparate(He[ut],He[xt]),_=ut,T=xt),(K!==E||dt!==b||it!==S||kt!==A)&&(i.blendFuncSeparate($t[K],$t[dt],$t[it],$t[kt]),E=K,b=dt,S=it,A=kt),(Tt.equals(v)===!1||ue!==M)&&(i.blendColor(Tt.r,Tt.g,Tt.b,ue),v.copy(Tt),M=ue),m=N,R=!1}function he(N,ut){N.side===vn?yt(i.CULL_FACE):Q(i.CULL_FACE);let K=N.side===fn;ut&&(K=!K),qt(K),N.blending===os&&N.transparent===!1?te(On):te(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),o.setFunc(N.depthFunc),o.setTest(N.depthTest),o.setMask(N.depthWrite),r.setMask(N.colorWrite);let dt=N.stencilWrite;a.setTest(dt),dt&&(a.setMask(N.stencilWriteMask),a.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),a.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),mn(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?Q(i.SAMPLE_ALPHA_TO_COVERAGE):yt(i.SAMPLE_ALPHA_TO_COVERAGE)}function qt(N){P!==N&&(N?i.frontFace(i.CW):i.frontFace(i.CCW),P=N)}function ve(N){N!==Ng?(Q(i.CULL_FACE),N!==I&&(N===Yd?i.cullFace(i.BACK):N===Og?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):yt(i.CULL_FACE),I=N}function Ze(N){N!==B&&(q&&i.lineWidth(N),B=N)}function mn(N,ut,K){N?(Q(i.POLYGON_OFFSET_FILL),(k!==ut||U!==K)&&(k=ut,U=K,o.getReversed()&&(ut=-ut),i.polygonOffset(ut,K))):yt(i.POLYGON_OFFSET_FILL)}function Me(N){N?Q(i.SCISSOR_TEST):yt(i.SCISSOR_TEST)}function De(N){N===void 0&&(N=i.TEXTURE0+V-1),J!==N&&(i.activeTexture(N),J=N)}function O(N,ut,K){K===void 0&&(J===null?K=i.TEXTURE0+V-1:K=J);let dt=et[K];dt===void 0&&(dt={type:void 0,texture:void 0},et[K]=dt),(dt.type!==N||dt.texture!==ut)&&(J!==K&&(i.activeTexture(K),J=K),i.bindTexture(N,ut||X[N]),dt.type=N,dt.texture=ut)}function rn(){let N=et[J];N!==void 0&&N.type!==void 0&&(i.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function re(){try{i.compressedTexImage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function C(){try{i.compressedTexImage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function y(){try{i.texSubImage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function F(){try{i.texSubImage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function G(){try{i.compressedTexSubImage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function Y(){try{i.compressedTexSubImage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function ot(){try{i.texStorage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function lt(){try{i.texStorage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function j(){try{i.texImage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function tt(){try{i.texImage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function ct(N){return u[N]!==void 0?u[N]:i.getParameter(N)}function Rt(N,ut){u[N]!==ut&&(i.pixelStorei(N,ut),u[N]=ut)}function ft(N){zt.equals(N)===!1&&(i.scissor(N.x,N.y,N.z,N.w),zt.copy(N))}function ht(N){It.equals(N)===!1&&(i.viewport(N.x,N.y,N.z,N.w),It.copy(N))}function Pt(N,ut){let K=c.get(ut);K===void 0&&(K=new WeakMap,c.set(ut,K));let dt=K.get(N);dt===void 0&&(dt=i.getUniformBlockIndex(ut,N.name),K.set(N,dt))}function Dt(N,ut){let dt=c.get(ut).get(N);l.get(ut)!==dt&&(i.uniformBlockBinding(ut,dt,N.__bindingPointIndex),l.set(ut,dt))}function Gt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},u={},J=null,et={},d={},f=new WeakMap,g=[],x=null,p=!1,m=null,_=null,E=null,b=null,T=null,S=null,A=null,v=new Ct(0,0,0),M=0,R=!1,P=null,I=null,B=null,k=null,U=null,zt.set(0,0,i.canvas.width,i.canvas.height),It.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:Q,disable:yt,bindFramebuffer:Bt,drawBuffers:_t,useProgram:Xt,setBlending:te,setMaterial:he,setFlipSided:qt,setCullFace:ve,setLineWidth:Ze,setPolygonOffset:mn,setScissorTest:Me,activeTexture:De,bindTexture:O,unbindTexture:rn,compressedTexImage2D:re,compressedTexImage3D:C,texImage2D:j,texImage3D:tt,pixelStorei:Rt,getParameter:ct,updateUBOMapping:Pt,uniformBlockBinding:Dt,texStorage2D:ot,texStorage3D:lt,texSubImage2D:y,texSubImage3D:F,compressedTexSubImage2D:G,compressedTexSubImage3D:Y,scissor:ft,viewport:ht,reset:Gt}}function O1(i,t,e,n,s,r,o){let a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Mt,h=new WeakMap,u=new Set,d,f=new WeakMap,g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function x(C,y){return g?new OffscreenCanvas(C,y):ea("canvas")}function p(C,y,F){let G=1,Y=re(C);if((Y.width>F||Y.height>F)&&(G=F/Math.max(Y.width,Y.height)),G<1)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap||typeof VideoFrame<"u"&&C instanceof VideoFrame){let ot=Math.floor(G*Y.width),lt=Math.floor(G*Y.height);d===void 0&&(d=x(ot,lt));let j=y?x(ot,lt):d;return j.width=ot,j.height=lt,j.getContext("2d").drawImage(C,0,0,ot,lt),Ot("WebGLRenderer: Texture has been resized from ("+Y.width+"x"+Y.height+") to ("+ot+"x"+lt+")."),j}else return"data"in C&&Ot("WebGLRenderer: Image in DataTexture is too big ("+Y.width+"x"+Y.height+")."),C;return C}function m(C){return C.generateMipmaps}function _(C){i.generateMipmap(C)}function E(C){return C.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:C.isWebGL3DRenderTarget?i.TEXTURE_3D:C.isWebGLArrayRenderTarget||C.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function b(C,y,F,G,Y,ot=!1){if(C!==null){if(i[C]!==void 0)return i[C];Ot("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let lt;G&&(lt=t.get("EXT_texture_norm16"),lt||Ot("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let j=y;if(y===i.RED&&(F===i.FLOAT&&(j=i.R32F),F===i.HALF_FLOAT&&(j=i.R16F),F===i.UNSIGNED_BYTE&&(j=i.R8),F===i.UNSIGNED_SHORT&&lt&&(j=lt.R16_EXT),F===i.SHORT&&lt&&(j=lt.R16_SNORM_EXT)),y===i.RED_INTEGER&&(F===i.UNSIGNED_BYTE&&(j=i.R8UI),F===i.UNSIGNED_SHORT&&(j=i.R16UI),F===i.UNSIGNED_INT&&(j=i.R32UI),F===i.BYTE&&(j=i.R8I),F===i.SHORT&&(j=i.R16I),F===i.INT&&(j=i.R32I)),y===i.RG&&(F===i.FLOAT&&(j=i.RG32F),F===i.HALF_FLOAT&&(j=i.RG16F),F===i.UNSIGNED_BYTE&&(j=i.RG8),F===i.UNSIGNED_SHORT&&lt&&(j=lt.RG16_EXT),F===i.SHORT&&lt&&(j=lt.RG16_SNORM_EXT)),y===i.RG_INTEGER&&(F===i.UNSIGNED_BYTE&&(j=i.RG8UI),F===i.UNSIGNED_SHORT&&(j=i.RG16UI),F===i.UNSIGNED_INT&&(j=i.RG32UI),F===i.BYTE&&(j=i.RG8I),F===i.SHORT&&(j=i.RG16I),F===i.INT&&(j=i.RG32I)),y===i.RGB_INTEGER&&(F===i.UNSIGNED_BYTE&&(j=i.RGB8UI),F===i.UNSIGNED_SHORT&&(j=i.RGB16UI),F===i.UNSIGNED_INT&&(j=i.RGB32UI),F===i.BYTE&&(j=i.RGB8I),F===i.SHORT&&(j=i.RGB16I),F===i.INT&&(j=i.RGB32I)),y===i.RGBA_INTEGER&&(F===i.UNSIGNED_BYTE&&(j=i.RGBA8UI),F===i.UNSIGNED_SHORT&&(j=i.RGBA16UI),F===i.UNSIGNED_INT&&(j=i.RGBA32UI),F===i.BYTE&&(j=i.RGBA8I),F===i.SHORT&&(j=i.RGBA16I),F===i.INT&&(j=i.RGBA32I)),y===i.RGB&&(F===i.UNSIGNED_SHORT&&lt&&(j=lt.RGB16_EXT),F===i.SHORT&&lt&&(j=lt.RGB16_SNORM_EXT),F===i.UNSIGNED_INT_5_9_9_9_REV&&(j=i.RGB9_E5),F===i.UNSIGNED_INT_10F_11F_11F_REV&&(j=i.R11F_G11F_B10F)),y===i.RGBA){let tt=ot?ta:Yt.getTransfer(Y);F===i.FLOAT&&(j=i.RGBA32F),F===i.HALF_FLOAT&&(j=i.RGBA16F),F===i.UNSIGNED_BYTE&&(j=tt===ie?i.SRGB8_ALPHA8:i.RGBA8),F===i.UNSIGNED_SHORT&&lt&&(j=lt.RGBA16_EXT),F===i.SHORT&&lt&&(j=lt.RGBA16_SNORM_EXT),F===i.UNSIGNED_SHORT_4_4_4_4&&(j=i.RGBA4),F===i.UNSIGNED_SHORT_5_5_5_1&&(j=i.RGB5_A1)}return(j===i.R16F||j===i.R32F||j===i.RG16F||j===i.RG32F||j===i.RGBA16F||j===i.RGBA32F)&&t.get("EXT_color_buffer_float"),j}function T(C,y){let F;return C?y===null||y===jn||y===Yr?F=i.DEPTH24_STENCIL8:y===Kn?F=i.DEPTH32F_STENCIL8:y===qr&&(F=i.DEPTH24_STENCIL8,Ot("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):y===null||y===jn||y===Yr?F=i.DEPTH_COMPONENT24:y===Kn?F=i.DEPTH_COMPONENT32F:y===qr&&(F=i.DEPTH_COMPONENT16),F}function S(C,y){return m(C)===!0||C.isFramebufferTexture&&C.minFilter!==je&&C.minFilter!==Be?Math.log2(Math.max(y.width,y.height))+1:C.mipmaps!==void 0&&C.mipmaps.length>0?C.mipmaps.length:C.isCompressedTexture&&Array.isArray(C.image)?y.mipmaps.length:1}function A(C){let y=C.target;y.removeEventListener("dispose",A),M(y),y.isVideoTexture&&h.delete(y),y.isHTMLTexture&&u.delete(y)}function v(C){let y=C.target;y.removeEventListener("dispose",v),P(y)}function M(C){let y=n.get(C);if(y.__webglInit===void 0)return;let F=C.source,G=f.get(F);if(G){let Y=G[y.__cacheKey];Y.usedTimes--,Y.usedTimes===0&&R(C),Object.keys(G).length===0&&f.delete(F)}n.remove(C)}function R(C){let y=n.get(C);i.deleteTexture(y.__webglTexture);let F=C.source,G=f.get(F);delete G[y.__cacheKey],o.memory.textures--}function P(C){let y=n.get(C);if(C.depthTexture&&(C.depthTexture.dispose(),n.remove(C.depthTexture)),C.isWebGLCubeRenderTarget)for(let G=0;G<6;G++){if(Array.isArray(y.__webglFramebuffer[G]))for(let Y=0;Y<y.__webglFramebuffer[G].length;Y++)i.deleteFramebuffer(y.__webglFramebuffer[G][Y]);else i.deleteFramebuffer(y.__webglFramebuffer[G]);y.__webglDepthbuffer&&i.deleteRenderbuffer(y.__webglDepthbuffer[G])}else{if(Array.isArray(y.__webglFramebuffer))for(let G=0;G<y.__webglFramebuffer.length;G++)i.deleteFramebuffer(y.__webglFramebuffer[G]);else i.deleteFramebuffer(y.__webglFramebuffer);if(y.__webglDepthbuffer&&i.deleteRenderbuffer(y.__webglDepthbuffer),y.__webglMultisampledFramebuffer&&i.deleteFramebuffer(y.__webglMultisampledFramebuffer),y.__webglColorRenderbuffer)for(let G=0;G<y.__webglColorRenderbuffer.length;G++)y.__webglColorRenderbuffer[G]&&i.deleteRenderbuffer(y.__webglColorRenderbuffer[G]);y.__webglDepthRenderbuffer&&i.deleteRenderbuffer(y.__webglDepthRenderbuffer)}let F=C.textures;for(let G=0,Y=F.length;G<Y;G++){let ot=n.get(F[G]);ot.__webglTexture&&(i.deleteTexture(ot.__webglTexture),o.memory.textures--),n.remove(F[G])}n.remove(C)}let I=0;function B(){I=0}function k(){return I}function U(C){I=C}function V(){let C=I;return C>=s.maxTextures&&Ot("WebGLTextures: Trying to use "+(C+1)+" texture units while this GPU supports only "+s.maxTextures),I+=1,C}function q(C){let y=[];return y.push(C.wrapS),y.push(C.wrapT),y.push(C.wrapR||0),y.push(C.magFilter),y.push(C.minFilter),y.push(C.anisotropy),y.push(C.internalFormat),y.push(C.format),y.push(C.type),y.push(C.generateMipmaps),y.push(C.premultiplyAlpha),y.push(C.flipY),y.push(C.unpackAlignment),y.push(C.colorSpace),y.join()}function nt(C,y){let F=n.get(C);if(C.isVideoTexture&&O(C),C.isRenderTargetTexture===!1&&C.isExternalTexture!==!0&&C.version>0&&F.__version!==C.version){let G=C.image;if(G===null)Ot("WebGLRenderer: Texture marked for update but no image data found.");else if(G.complete===!1)Ot("WebGLRenderer: Texture marked for update but image is incomplete");else{yt(F,C,y);return}}else C.isExternalTexture&&(F.__webglTexture=C.sourceTexture?C.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,F.__webglTexture,i.TEXTURE0+y)}function $(C,y){let F=n.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&F.__version!==C.version){yt(F,C,y);return}else C.isExternalTexture&&(F.__webglTexture=C.sourceTexture?C.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,F.__webglTexture,i.TEXTURE0+y)}function J(C,y){let F=n.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&F.__version!==C.version){yt(F,C,y);return}e.bindTexture(i.TEXTURE_3D,F.__webglTexture,i.TEXTURE0+y)}function et(C,y){let F=n.get(C);if(C.isCubeDepthTexture!==!0&&C.version>0&&F.__version!==C.version){Bt(F,C,y);return}e.bindTexture(i.TEXTURE_CUBE_MAP,F.__webglTexture,i.TEXTURE0+y)}let at={[sc]:i.REPEAT,[li]:i.CLAMP_TO_EDGE,[rc]:i.MIRRORED_REPEAT},rt={[je]:i.NEAREST,[s0]:i.NEAREST_MIPMAP_NEAREST,[wa]:i.NEAREST_MIPMAP_LINEAR,[Be]:i.LINEAR,[Rc]:i.LINEAR_MIPMAP_NEAREST,[pi]:i.LINEAR_MIPMAP_LINEAR},zt={[l0]:i.NEVER,[f0]:i.ALWAYS,[c0]:i.LESS,[fh]:i.LEQUAL,[h0]:i.EQUAL,[ph]:i.GEQUAL,[u0]:i.GREATER,[d0]:i.NOTEQUAL};function It(C,y){if(y.type===Kn&&t.has("OES_texture_float_linear")===!1&&(y.magFilter===Be||y.magFilter===Rc||y.magFilter===wa||y.magFilter===pi||y.minFilter===Be||y.minFilter===Rc||y.minFilter===wa||y.minFilter===pi)&&Ot("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(C,i.TEXTURE_WRAP_S,at[y.wrapS]),i.texParameteri(C,i.TEXTURE_WRAP_T,at[y.wrapT]),(C===i.TEXTURE_3D||C===i.TEXTURE_2D_ARRAY)&&i.texParameteri(C,i.TEXTURE_WRAP_R,at[y.wrapR]),i.texParameteri(C,i.TEXTURE_MAG_FILTER,rt[y.magFilter]),i.texParameteri(C,i.TEXTURE_MIN_FILTER,rt[y.minFilter]),y.compareFunction&&(i.texParameteri(C,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(C,i.TEXTURE_COMPARE_FUNC,zt[y.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(y.magFilter===je||y.minFilter!==wa&&y.minFilter!==pi||y.type===Kn&&t.has("OES_texture_float_linear")===!1)return;if(y.anisotropy>1||n.get(y).__currentAnisotropy){let F=t.get("EXT_texture_filter_anisotropic");i.texParameterf(C,F.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(y.anisotropy,s.getMaxAnisotropy())),n.get(y).__currentAnisotropy=y.anisotropy}}}function Lt(C,y){let F=!1;C.__webglInit===void 0&&(C.__webglInit=!0,y.addEventListener("dispose",A));let G=y.source,Y=f.get(G);Y===void 0&&(Y={},f.set(G,Y));let ot=q(y);if(ot!==C.__cacheKey){Y[ot]===void 0&&(Y[ot]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,F=!0),Y[ot].usedTimes++;let lt=Y[C.__cacheKey];lt!==void 0&&(Y[C.__cacheKey].usedTimes--,lt.usedTimes===0&&R(y)),C.__cacheKey=ot,C.__webglTexture=Y[ot].texture}return F}function X(C,y,F){return Math.floor(Math.floor(C/F)/y)}function Q(C,y,F,G){let ot=C.updateRanges;if(ot.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,y.width,y.height,F,G,y.data);else{ot.sort((Rt,ft)=>Rt.start-ft.start);let lt=0;for(let Rt=1;Rt<ot.length;Rt++){let ft=ot[lt],ht=ot[Rt],Pt=ft.start+ft.count,Dt=X(ht.start,y.width,4),Gt=X(ft.start,y.width,4);ht.start<=Pt+1&&Dt===Gt&&X(ht.start+ht.count-1,y.width,4)===Dt?ft.count=Math.max(ft.count,ht.start+ht.count-ft.start):(++lt,ot[lt]=ht)}ot.length=lt+1;let j=e.getParameter(i.UNPACK_ROW_LENGTH),tt=e.getParameter(i.UNPACK_SKIP_PIXELS),ct=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,y.width);for(let Rt=0,ft=ot.length;Rt<ft;Rt++){let ht=ot[Rt],Pt=Math.floor(ht.start/4),Dt=Math.ceil(ht.count/4),Gt=Pt%y.width,N=Math.floor(Pt/y.width),ut=Dt,K=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,Gt),e.pixelStorei(i.UNPACK_SKIP_ROWS,N),e.texSubImage2D(i.TEXTURE_2D,0,Gt,N,ut,K,F,G,y.data)}C.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,j),e.pixelStorei(i.UNPACK_SKIP_PIXELS,tt),e.pixelStorei(i.UNPACK_SKIP_ROWS,ct)}}function yt(C,y,F){let G=i.TEXTURE_2D;(y.isDataArrayTexture||y.isCompressedArrayTexture)&&(G=i.TEXTURE_2D_ARRAY),y.isData3DTexture&&(G=i.TEXTURE_3D);let Y=Lt(C,y),ot=y.source;e.bindTexture(G,C.__webglTexture,i.TEXTURE0+F);let lt=n.get(ot);if(ot.version!==lt.__version||Y===!0){if(e.activeTexture(i.TEXTURE0+F),(typeof ImageBitmap<"u"&&y.image instanceof ImageBitmap)===!1){let K=Yt.getPrimaries(Yt.workingColorSpace),dt=y.colorSpace===Di?null:Yt.getPrimaries(y.colorSpace),xt=y.colorSpace===Di||K===dt?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,y.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,xt)}e.pixelStorei(i.UNPACK_ALIGNMENT,y.unpackAlignment);let tt=p(y.image,!1,s.maxTextureSize);tt=rn(y,tt);let ct=r.convert(y.format,y.colorSpace),Rt=r.convert(y.type),ft=b(y.internalFormat,ct,Rt,y.normalized,y.colorSpace,y.isVideoTexture);It(G,y);let ht,Pt=y.mipmaps,Dt=y.isVideoTexture!==!0,Gt=lt.__version===void 0||Y===!0,N=ot.dataReady,ut=S(y,tt);if(y.isDepthTexture)ft=T(y.format===ls,y.type),Gt&&(Dt?e.texStorage2D(i.TEXTURE_2D,1,ft,tt.width,tt.height):e.texImage2D(i.TEXTURE_2D,0,ft,tt.width,tt.height,0,ct,Rt,null));else if(y.isDataTexture)if(Pt.length>0){Dt&&Gt&&e.texStorage2D(i.TEXTURE_2D,ut,ft,Pt[0].width,Pt[0].height);for(let K=0,dt=Pt.length;K<dt;K++)ht=Pt[K],Dt?N&&e.texSubImage2D(i.TEXTURE_2D,K,0,0,ht.width,ht.height,ct,Rt,ht.data):e.texImage2D(i.TEXTURE_2D,K,ft,ht.width,ht.height,0,ct,Rt,ht.data);y.generateMipmaps=!1}else Dt?(Gt&&e.texStorage2D(i.TEXTURE_2D,ut,ft,tt.width,tt.height),N&&Q(y,tt,ct,Rt)):e.texImage2D(i.TEXTURE_2D,0,ft,tt.width,tt.height,0,ct,Rt,tt.data);else if(y.isCompressedTexture)if(y.isCompressedArrayTexture){Dt&&Gt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,ut,ft,Pt[0].width,Pt[0].height,tt.depth);for(let K=0,dt=Pt.length;K<dt;K++)if(ht=Pt[K],y.format!==bn)if(ct!==null)if(Dt){if(N)if(y.layerUpdates.size>0){let xt=Mf(ht.width,ht.height,y.format,y.type);for(let it of y.layerUpdates){let kt=ht.data.subarray(it*xt/ht.data.BYTES_PER_ELEMENT,(it+1)*xt/ht.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,K,0,0,it,ht.width,ht.height,1,ct,kt)}}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,K,0,0,0,ht.width,ht.height,tt.depth,ct,ht.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,K,ft,ht.width,ht.height,tt.depth,0,ht.data,0,0);else Ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Dt?N&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,K,0,0,0,ht.width,ht.height,tt.depth,ct,Rt,ht.data):e.texImage3D(i.TEXTURE_2D_ARRAY,K,ft,ht.width,ht.height,tt.depth,0,ct,Rt,ht.data);y.layerUpdates.size>0&&y.clearLayerUpdates()}else{Dt&&Gt&&e.texStorage2D(i.TEXTURE_2D,ut,ft,Pt[0].width,Pt[0].height);for(let K=0,dt=Pt.length;K<dt;K++)ht=Pt[K],y.format!==bn?ct!==null?Dt?N&&e.compressedTexSubImage2D(i.TEXTURE_2D,K,0,0,ht.width,ht.height,ct,ht.data):e.compressedTexImage2D(i.TEXTURE_2D,K,ft,ht.width,ht.height,0,ht.data):Ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Dt?N&&e.texSubImage2D(i.TEXTURE_2D,K,0,0,ht.width,ht.height,ct,Rt,ht.data):e.texImage2D(i.TEXTURE_2D,K,ft,ht.width,ht.height,0,ct,Rt,ht.data)}else if(y.isDataArrayTexture)if(Dt){if(Gt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,ut,ft,tt.width,tt.height,tt.depth),N)if(y.layerUpdates.size>0){let K=Mf(tt.width,tt.height,y.format,y.type);for(let dt of y.layerUpdates){let xt=tt.data.subarray(dt*K/tt.data.BYTES_PER_ELEMENT,(dt+1)*K/tt.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,dt,tt.width,tt.height,1,ct,Rt,xt)}y.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,tt.width,tt.height,tt.depth,ct,Rt,tt.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,ft,tt.width,tt.height,tt.depth,0,ct,Rt,tt.data);else if(y.isData3DTexture)Dt?(Gt&&e.texStorage3D(i.TEXTURE_3D,ut,ft,tt.width,tt.height,tt.depth),N&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,tt.width,tt.height,tt.depth,ct,Rt,tt.data)):e.texImage3D(i.TEXTURE_3D,0,ft,tt.width,tt.height,tt.depth,0,ct,Rt,tt.data);else if(y.isFramebufferTexture){if(Gt)if(Dt)e.texStorage2D(i.TEXTURE_2D,ut,ft,tt.width,tt.height);else{let K=tt.width,dt=tt.height;for(let xt=0;xt<ut;xt++)e.texImage2D(i.TEXTURE_2D,xt,ft,K,dt,0,ct,Rt,null),K>>=1,dt>>=1}}else if(y.isHTMLTexture){if("texElementImage2D"in i){let K=i.canvas;if(K.hasAttribute("layoutsubtree")||K.setAttribute("layoutsubtree","true"),tt.parentNode!==K){K.appendChild(tt),u.add(y),K.onpaint=dt=>{let xt=dt.changedElements;for(let it of u)xt.includes(it.image)&&(it.needsUpdate=!0)},K.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,tt);else{let xt=i.RGBA,it=i.RGBA,kt=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,xt,it,kt,tt)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Pt.length>0){if(Dt&&Gt){let K=re(Pt[0]);e.texStorage2D(i.TEXTURE_2D,ut,ft,K.width,K.height)}for(let K=0,dt=Pt.length;K<dt;K++)ht=Pt[K],Dt?N&&e.texSubImage2D(i.TEXTURE_2D,K,0,0,ct,Rt,ht):e.texImage2D(i.TEXTURE_2D,K,ft,ct,Rt,ht);y.generateMipmaps=!1}else if(Dt){if(Gt){let K=re(tt);e.texStorage2D(i.TEXTURE_2D,ut,ft,K.width,K.height)}N&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,ct,Rt,tt)}else e.texImage2D(i.TEXTURE_2D,0,ft,ct,Rt,tt);m(y)&&_(G),lt.__version=ot.version,y.onUpdate&&y.onUpdate(y)}C.__version=y.version}function Bt(C,y,F){if(y.image.length!==6)return;let G=Lt(C,y),Y=y.source;e.bindTexture(i.TEXTURE_CUBE_MAP,C.__webglTexture,i.TEXTURE0+F);let ot=n.get(Y);if(Y.version!==ot.__version||G===!0){e.activeTexture(i.TEXTURE0+F);let lt=Yt.getPrimaries(Yt.workingColorSpace),j=y.colorSpace===Di?null:Yt.getPrimaries(y.colorSpace),tt=y.colorSpace===Di||lt===j?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,y.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,y.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,tt);let ct=y.isCompressedTexture||y.image[0].isCompressedTexture,Rt=y.image[0]&&y.image[0].isDataTexture,ft=[];for(let it=0;it<6;it++)!ct&&!Rt?ft[it]=p(y.image[it],!0,s.maxCubemapSize):ft[it]=Rt?y.image[it].image:y.image[it],ft[it]=rn(y,ft[it]);let ht=ft[0],Pt=r.convert(y.format,y.colorSpace),Dt=r.convert(y.type),Gt=b(y.internalFormat,Pt,Dt,y.normalized,y.colorSpace),N=y.isVideoTexture!==!0,ut=ot.__version===void 0||G===!0,K=Y.dataReady,dt=S(y,ht);It(i.TEXTURE_CUBE_MAP,y);let xt;if(ct){N&&ut&&e.texStorage2D(i.TEXTURE_CUBE_MAP,dt,Gt,ht.width,ht.height);for(let it=0;it<6;it++){xt=ft[it].mipmaps;for(let kt=0;kt<xt.length;kt++){let Tt=xt[kt];y.format!==bn?Pt!==null?N?K&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,kt,0,0,Tt.width,Tt.height,Pt,Tt.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,kt,Gt,Tt.width,Tt.height,0,Tt.data):Ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):N?K&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,kt,0,0,Tt.width,Tt.height,Pt,Dt,Tt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,kt,Gt,Tt.width,Tt.height,0,Pt,Dt,Tt.data)}}}else{if(xt=y.mipmaps,N&&ut){xt.length>0&&dt++;let it=re(ft[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,dt,Gt,it.width,it.height)}for(let it=0;it<6;it++)if(Rt){N?K&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,0,0,ft[it].width,ft[it].height,Pt,Dt,ft[it].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,Gt,ft[it].width,ft[it].height,0,Pt,Dt,ft[it].data);for(let kt=0;kt<xt.length;kt++){let ue=xt[kt].image[it].image;N?K&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,kt+1,0,0,ue.width,ue.height,Pt,Dt,ue.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,kt+1,Gt,ue.width,ue.height,0,Pt,Dt,ue.data)}}else{N?K&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,0,0,Pt,Dt,ft[it]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,Gt,Pt,Dt,ft[it]);for(let kt=0;kt<xt.length;kt++){let Tt=xt[kt];N?K&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,kt+1,0,0,Pt,Dt,Tt.image[it]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,kt+1,Gt,Pt,Dt,Tt.image[it])}}}m(y)&&_(i.TEXTURE_CUBE_MAP),ot.__version=Y.version,y.onUpdate&&y.onUpdate(y)}C.__version=y.version}function _t(C,y,F,G,Y,ot){let lt=r.convert(F.format,F.colorSpace),j=r.convert(F.type),tt=b(F.internalFormat,lt,j,F.normalized,F.colorSpace),ct=n.get(y),Rt=n.get(F);if(Rt.__renderTarget=y,!ct.__hasExternalTextures){let ft=Math.max(1,y.width>>ot),ht=Math.max(1,y.height>>ot);Y===i.TEXTURE_3D||Y===i.TEXTURE_2D_ARRAY?e.texImage3D(Y,ot,tt,ft,ht,y.depth,0,lt,j,null):e.texImage2D(Y,ot,tt,ft,ht,0,lt,j,null)}e.bindFramebuffer(i.FRAMEBUFFER,C),De(y)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,G,Y,Rt.__webglTexture,0,Me(y)):(Y===i.TEXTURE_2D||Y>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&Y<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,G,Y,Rt.__webglTexture,ot),e.bindFramebuffer(i.FRAMEBUFFER,null)}function Xt(C,y,F){if(i.bindRenderbuffer(i.RENDERBUFFER,C),y.depthBuffer){let G=y.depthTexture,Y=G&&G.isDepthTexture?G.type:null,ot=T(y.stencilBuffer,Y),lt=y.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;De(y)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Me(y),ot,y.width,y.height):F?i.renderbufferStorageMultisample(i.RENDERBUFFER,Me(y),ot,y.width,y.height):i.renderbufferStorage(i.RENDERBUFFER,ot,y.width,y.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,lt,i.RENDERBUFFER,C)}else{let G=y.textures;for(let Y=0;Y<G.length;Y++){let ot=G[Y],lt=r.convert(ot.format,ot.colorSpace),j=r.convert(ot.type),tt=b(ot.internalFormat,lt,j,ot.normalized,ot.colorSpace);De(y)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Me(y),tt,y.width,y.height):F?i.renderbufferStorageMultisample(i.RENDERBUFFER,Me(y),tt,y.width,y.height):i.renderbufferStorage(i.RENDERBUFFER,tt,y.width,y.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function He(C,y,F){let G=y.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,C),!(y.depthTexture&&y.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let Y=n.get(y.depthTexture);if(Y.__renderTarget=y,(!Y.__webglTexture||y.depthTexture.image.width!==y.width||y.depthTexture.image.height!==y.height)&&(y.depthTexture.image.width=y.width,y.depthTexture.image.height=y.height,y.depthTexture.needsUpdate=!0),G){if(Y.__webglInit===void 0&&(Y.__webglInit=!0,y.depthTexture.addEventListener("dispose",A)),Y.__webglTexture===void 0){Y.__webglTexture=i.createTexture(),e.bindTexture(i.TEXTURE_CUBE_MAP,Y.__webglTexture),It(i.TEXTURE_CUBE_MAP,y.depthTexture);let ct=r.convert(y.depthTexture.format),Rt=r.convert(y.depthTexture.type),ft;y.depthTexture.format===ci?ft=i.DEPTH_COMPONENT24:y.depthTexture.format===ls&&(ft=i.DEPTH24_STENCIL8);for(let ht=0;ht<6;ht++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,0,ft,y.width,y.height,0,ct,Rt,null)}}else nt(y.depthTexture,0);let ot=Y.__webglTexture,lt=Me(y),j=G?i.TEXTURE_CUBE_MAP_POSITIVE_X+F:i.TEXTURE_2D,tt=y.depthTexture.format===ls?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(y.depthTexture.format===ci)De(y)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,tt,j,ot,0,lt):i.framebufferTexture2D(i.FRAMEBUFFER,tt,j,ot,0);else if(y.depthTexture.format===ls)De(y)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,tt,j,ot,0,lt):i.framebufferTexture2D(i.FRAMEBUFFER,tt,j,ot,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function $t(C){let y=n.get(C),F=C.isWebGLCubeRenderTarget===!0;if(y.__boundDepthTexture!==C.depthTexture){let G=C.depthTexture;if(y.__depthDisposeCallback&&y.__depthDisposeCallback(),G){let Y=()=>{delete y.__boundDepthTexture,delete y.__depthDisposeCallback,G.removeEventListener("dispose",Y)};G.addEventListener("dispose",Y),y.__depthDisposeCallback=Y}y.__boundDepthTexture=G}if(C.depthTexture&&!y.__autoAllocateDepthBuffer)if(F)for(let G=0;G<6;G++)He(y.__webglFramebuffer[G],C,G);else{let G=C.texture.mipmaps;G&&G.length>0?He(y.__webglFramebuffer[0],C,0):He(y.__webglFramebuffer,C,0)}else if(F){y.__webglDepthbuffer=[];for(let G=0;G<6;G++)if(e.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer[G]),y.__webglDepthbuffer[G]===void 0)y.__webglDepthbuffer[G]=i.createRenderbuffer(),Xt(y.__webglDepthbuffer[G],C,!1);else{let Y=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ot=y.__webglDepthbuffer[G];i.bindRenderbuffer(i.RENDERBUFFER,ot),i.framebufferRenderbuffer(i.FRAMEBUFFER,Y,i.RENDERBUFFER,ot)}}else{let G=C.texture.mipmaps;if(G&&G.length>0?e.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer),y.__webglDepthbuffer===void 0)y.__webglDepthbuffer=i.createRenderbuffer(),Xt(y.__webglDepthbuffer,C,!1);else{let Y=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ot=y.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,ot),i.framebufferRenderbuffer(i.FRAMEBUFFER,Y,i.RENDERBUFFER,ot)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function te(C,y,F){let G=n.get(C);y!==void 0&&_t(G.__webglFramebuffer,C,C.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),F!==void 0&&$t(C)}function he(C){let y=C.texture,F=n.get(C),G=n.get(y);C.addEventListener("dispose",v);let Y=C.textures,ot=C.isWebGLCubeRenderTarget===!0,lt=Y.length>1;if(lt||(G.__webglTexture===void 0&&(G.__webglTexture=i.createTexture()),G.__version=y.version,o.memory.textures++),ot){F.__webglFramebuffer=[];for(let j=0;j<6;j++)if(y.mipmaps&&y.mipmaps.length>0){F.__webglFramebuffer[j]=[];for(let tt=0;tt<y.mipmaps.length;tt++)F.__webglFramebuffer[j][tt]=i.createFramebuffer()}else F.__webglFramebuffer[j]=i.createFramebuffer()}else{if(y.mipmaps&&y.mipmaps.length>0){F.__webglFramebuffer=[];for(let j=0;j<y.mipmaps.length;j++)F.__webglFramebuffer[j]=i.createFramebuffer()}else F.__webglFramebuffer=i.createFramebuffer();if(lt)for(let j=0,tt=Y.length;j<tt;j++){let ct=n.get(Y[j]);ct.__webglTexture===void 0&&(ct.__webglTexture=i.createTexture(),o.memory.textures++)}if(C.samples>0&&De(C)===!1){F.__webglMultisampledFramebuffer=i.createFramebuffer(),F.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,F.__webglMultisampledFramebuffer);for(let j=0;j<Y.length;j++){let tt=Y[j];F.__webglColorRenderbuffer[j]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,F.__webglColorRenderbuffer[j]);let ct=r.convert(tt.format,tt.colorSpace),Rt=r.convert(tt.type),ft=b(tt.internalFormat,ct,Rt,tt.normalized,tt.colorSpace,C.isXRRenderTarget===!0),ht=Me(C);i.renderbufferStorageMultisample(i.RENDERBUFFER,ht,ft,C.width,C.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+j,i.RENDERBUFFER,F.__webglColorRenderbuffer[j])}i.bindRenderbuffer(i.RENDERBUFFER,null),C.depthBuffer&&(F.__webglDepthRenderbuffer=i.createRenderbuffer(),Xt(F.__webglDepthRenderbuffer,C,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(ot){e.bindTexture(i.TEXTURE_CUBE_MAP,G.__webglTexture),It(i.TEXTURE_CUBE_MAP,y);for(let j=0;j<6;j++)if(y.mipmaps&&y.mipmaps.length>0)for(let tt=0;tt<y.mipmaps.length;tt++)_t(F.__webglFramebuffer[j][tt],C,y,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+j,tt);else _t(F.__webglFramebuffer[j],C,y,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+j,0);m(y)&&_(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(lt){for(let j=0,tt=Y.length;j<tt;j++){let ct=Y[j],Rt=n.get(ct),ft=i.TEXTURE_2D;(C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(ft=C.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(ft,Rt.__webglTexture),It(ft,ct),_t(F.__webglFramebuffer,C,ct,i.COLOR_ATTACHMENT0+j,ft,0),m(ct)&&_(ft)}e.unbindTexture()}else{let j=i.TEXTURE_2D;if((C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(j=C.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(j,G.__webglTexture),It(j,y),y.mipmaps&&y.mipmaps.length>0)for(let tt=0;tt<y.mipmaps.length;tt++)_t(F.__webglFramebuffer[tt],C,y,i.COLOR_ATTACHMENT0,j,tt);else _t(F.__webglFramebuffer,C,y,i.COLOR_ATTACHMENT0,j,0);m(y)&&_(j),e.unbindTexture()}C.depthBuffer&&$t(C)}function qt(C){let y=C.textures;for(let F=0,G=y.length;F<G;F++){let Y=y[F];if(m(Y)){let ot=E(C),lt=n.get(Y).__webglTexture;e.bindTexture(ot,lt),_(ot),e.unbindTexture()}}}let ve=[],Ze=[];function mn(C){if(C.samples>0){if(De(C)===!1){let y=C.textures,F=C.width,G=C.height,Y=i.COLOR_BUFFER_BIT,ot=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,lt=n.get(C),j=y.length>1;if(j)for(let ct=0;ct<y.length;ct++)e.bindFramebuffer(i.FRAMEBUFFER,lt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ct,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,lt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ct,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,lt.__webglMultisampledFramebuffer);let tt=C.texture.mipmaps;tt&&tt.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,lt.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,lt.__webglFramebuffer);for(let ct=0;ct<y.length;ct++){if(C.resolveDepthBuffer&&(C.depthBuffer&&(Y|=i.DEPTH_BUFFER_BIT),C.stencilBuffer&&C.resolveStencilBuffer&&(Y|=i.STENCIL_BUFFER_BIT)),j){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,lt.__webglColorRenderbuffer[ct]);let Rt=n.get(y[ct]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Rt,0)}i.blitFramebuffer(0,0,F,G,0,0,F,G,Y,i.NEAREST),l===!0&&(ve.length=0,Ze.length=0,ve.push(i.COLOR_ATTACHMENT0+ct),C.depthBuffer&&C.storeMultisampledDepthBuffer===!1&&(ve.push(ot),Ze.push(ot),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Ze)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ve))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),j)for(let ct=0;ct<y.length;ct++){e.bindFramebuffer(i.FRAMEBUFFER,lt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ct,i.RENDERBUFFER,lt.__webglColorRenderbuffer[ct]);let Rt=n.get(y[ct]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,lt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ct,i.TEXTURE_2D,Rt,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,lt.__webglMultisampledFramebuffer)}else if(C.depthBuffer&&C.storeMultisampledDepthBuffer===!1&&l){let y=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[y])}}}function Me(C){return Math.min(s.maxSamples,C.samples)}function De(C){let y=n.get(C);return C.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&y.__useRenderToTexture!==!1}function O(C){let y=o.render.frame;h.get(C)!==y&&(h.set(C,y),C.update())}function rn(C,y){let F=C.colorSpace,G=C.format,Y=C.type;return C.isCompressedTexture===!0||C.isVideoTexture===!0||F!==Qo&&F!==Di&&(Yt.getTransfer(F)===ie?(G!==bn||Y!==_n)&&Ot("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Nt("WebGLTextures: Unsupported texture color space:",F)),y}function re(C){return typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement?(c.width=C.naturalWidth||C.width,c.height=C.naturalHeight||C.height):typeof VideoFrame<"u"&&C instanceof VideoFrame?(c.width=C.displayWidth,c.height=C.displayHeight):(c.width=C.width,c.height=C.height),c}this.allocateTextureUnit=V,this.resetTextureUnits=B,this.getTextureUnits=k,this.setTextureUnits=U,this.setTexture2D=nt,this.setTexture2DArray=$,this.setTexture3D=J,this.setTextureCube=et,this.rebindTextures=te,this.setupRenderTarget=he,this.updateRenderTargetMipmap=qt,this.updateMultisampleRenderTarget=mn,this.setupDepthRenderbuffer=$t,this.setupFrameBufferTexture=_t,this.useMultisampledRTT=De,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function F1(i,t){function e(n,s=Di){let r,o=Yt.getTransfer(s);if(n===_n)return i.UNSIGNED_BYTE;if(n===kc)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Ic)return i.UNSIGNED_SHORT_5_5_5_1;if(n===df)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===ff)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===hf)return i.BYTE;if(n===uf)return i.SHORT;if(n===qr)return i.UNSIGNED_SHORT;if(n===Pc)return i.INT;if(n===jn)return i.UNSIGNED_INT;if(n===Kn)return i.FLOAT;if(n===We)return i.HALF_FLOAT;if(n===pf)return i.ALPHA;if(n===mf)return i.RGB;if(n===bn)return i.RGBA;if(n===ci)return i.DEPTH_COMPONENT;if(n===ls)return i.DEPTH_STENCIL;if(n===gf)return i.RED;if(n===Lc)return i.RED_INTEGER;if(n===cs)return i.RG;if(n===Dc)return i.RG_INTEGER;if(n===Nc)return i.RGBA_INTEGER;if(n===Sa||n===Ta||n===Ea||n===Aa)if(o===ie)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Sa)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Ta)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Ea)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Aa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Sa)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Ta)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Ea)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Aa)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Oc||n===Fc||n===Uc||n===Bc)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Oc)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Fc)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Uc)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Bc)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===zc||n===Hc||n===Gc||n===Vc||n===Wc||n===Ca||n===Xc)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===zc||n===Hc)return o===ie?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Gc)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===Vc)return r.COMPRESSED_R11_EAC;if(n===Wc)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Ca)return r.COMPRESSED_RG11_EAC;if(n===Xc)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===$c||n===Zc||n===qc||n===Yc||n===jc||n===Kc||n===Jc||n===Qc||n===th||n===eh||n===nh||n===ih||n===sh||n===rh)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===$c)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Zc)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===qc)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Yc)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===jc)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Kc)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Jc)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Qc)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===th)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===eh)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===nh)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===ih)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===sh)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===rh)return o===ie?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===oh||n===ah||n===lh)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===oh)return o===ie?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===ah)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===lh)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===ch||n===hh||n===Ra||n===uh)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===ch)return r.COMPRESSED_RED_RGTC1_EXT;if(n===hh)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Ra)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===uh)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Yr?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}var U1=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,B1=`
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

}`,Of=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new ua(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new Le({vertexShader:U1,fragmentShader:B1,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new Ut(new Ie(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Ff=class extends hi{constructor(t,e){super();let n=this,s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,u=null,d=null,f=null,g=null,x=typeof XRWebGLBinding<"u",p=new Of,m={},_=e.getContextAttributes(),E=null,b=null,T=[],S=[],A=new Mt,v=null,M=null,R=new Ye;R.viewport=new _e;let P=new Ye;P.viewport=new _e;let I=[R,P],B=new Ac,k=null,U=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(X){let Q=T[X];return Q===void 0&&(Q=new Fr,T[X]=Q),Q.getTargetRaySpace()},this.getControllerGrip=function(X){let Q=T[X];return Q===void 0&&(Q=new Fr,T[X]=Q),Q.getGripSpace()},this.getHand=function(X){let Q=T[X];return Q===void 0&&(Q=new Fr,T[X]=Q),Q.getHandSpace()};function V(X){let Q=S.indexOf(X.inputSource);if(Q===-1)return;let yt=T[Q];yt!==void 0&&(yt.update(X.inputSource,X.frame,c||o),yt.dispatchEvent({type:X.type,data:X.inputSource}))}function q(){s.removeEventListener("select",V),s.removeEventListener("selectstart",V),s.removeEventListener("selectend",V),s.removeEventListener("squeeze",V),s.removeEventListener("squeezestart",V),s.removeEventListener("squeezeend",V),s.removeEventListener("end",q),s.removeEventListener("inputsourceschange",nt);for(let X=0;X<T.length;X++){let Q=S[X];Q!==null&&(S[X]=null,T[X].disconnect(Q))}k=null,U=null,p.reset();for(let X in m)delete m[X];if(t.setRenderTarget(E),f=null,d=null,u=null,s=null,b=null,Lt.stop(),n.isPresenting=!1,t.setPixelRatio(v),t.setSize(A.width,A.height,!1),M!==null){let X=M.camera;X.fov=M.fov,X.zoom=M.zoom,X.updateProjectionMatrix(),M=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(X){r=X,n.isPresenting===!0&&Ot("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(X){a=X,n.isPresenting===!0&&Ot("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(X){c=X},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u===null&&x&&(u=new XRWebGLBinding(s,e)),u},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(X){if(s=X,s!==null){if(E=t.getRenderTarget(),s.addEventListener("select",V),s.addEventListener("selectstart",V),s.addEventListener("selectend",V),s.addEventListener("squeeze",V),s.addEventListener("squeezestart",V),s.addEventListener("squeezeend",V),s.addEventListener("end",q),s.addEventListener("inputsourceschange",nt),_.xrCompatible!==!0&&await e.makeXRCompatible(),v=t.getPixelRatio(),t.getSize(A),x&&"createProjectionLayer"in XRWebGLBinding.prototype){let yt=null,Bt=null,_t=null;_.depth&&(_t=_.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,yt=_.stencil?ls:ci,Bt=_.stencil?Yr:jn);let Xt={colorFormat:e.RGBA8,depthFormat:_t,scaleFactor:r};u=this.getBinding(),d=u.createProjectionLayer(Xt),s.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),b=new Re(d.textureWidth,d.textureHeight,{format:bn,type:_n,depthTexture:new es(d.textureWidth,d.textureHeight,Bt,void 0,void 0,void 0,void 0,void 0,void 0,yt),stencilBuffer:_.stencil,colorSpace:t.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{let yt={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,e,yt),s.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),b=new Re(f.framebufferWidth,f.framebufferHeight,{format:bn,type:_n,colorSpace:t.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}b.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),Lt.setContext(s),Lt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function nt(X){for(let Q=0;Q<X.removed.length;Q++){let yt=X.removed[Q],Bt=S.indexOf(yt);Bt>=0&&(S[Bt]=null,T[Bt].disconnect(yt))}for(let Q=0;Q<X.added.length;Q++){let yt=X.added[Q],Bt=S.indexOf(yt);if(Bt===-1){for(let Xt=0;Xt<T.length;Xt++)if(Xt>=S.length){S.push(yt),Bt=Xt;break}else if(S[Xt]===null){S[Xt]=yt,Bt=Xt;break}if(Bt===-1)break}let _t=T[Bt];_t&&_t.connect(yt)}}let $=new D,J=new D;function et(X,Q,yt){$.setFromMatrixPosition(Q.matrixWorld),J.setFromMatrixPosition(yt.matrixWorld);let Bt=$.distanceTo(J),_t=Q.projectionMatrix.elements,Xt=yt.projectionMatrix.elements,He=_t[14]/(_t[10]-1),$t=_t[14]/(_t[10]+1),te=(_t[9]+1)/_t[5],he=(_t[9]-1)/_t[5],qt=(_t[8]-1)/_t[0],ve=(Xt[8]+1)/Xt[0],Ze=He*qt,mn=He*ve,Me=Bt/(-qt+ve),De=Me*-qt;if(Q.matrixWorld.decompose(X.position,X.quaternion,X.scale),X.translateX(De),X.translateZ(Me),X.matrixWorld.compose(X.position,X.quaternion,X.scale),X.matrixWorldInverse.copy(X.matrixWorld).invert(),_t[10]===-1)X.projectionMatrix.copy(Q.projectionMatrix),X.projectionMatrixInverse.copy(Q.projectionMatrixInverse);else{let O=He+Me,rn=$t+Me,re=Ze-De,C=mn+(Bt-De),y=te*$t/rn*O,F=he*$t/rn*O;X.projectionMatrix.makePerspective(re,C,y,F,O,rn),X.projectionMatrixInverse.copy(X.projectionMatrix).invert()}}function at(X,Q){Q===null?X.matrixWorld.copy(X.matrix):X.matrixWorld.multiplyMatrices(Q.matrixWorld,X.matrix),X.matrixWorldInverse.copy(X.matrixWorld).invert()}this.updateCamera=function(X){if(s===null)return;let Q=X.near,yt=X.far;p.texture!==null&&(p.depthNear>0&&(Q=p.depthNear),p.depthFar>0&&(yt=p.depthFar)),B.near=P.near=R.near=Q,B.far=P.far=R.far=yt,(k!==B.near||U!==B.far)&&(s.updateRenderState({depthNear:B.near,depthFar:B.far}),k=B.near,U=B.far),B.layers.mask=X.layers.mask|6,R.layers.mask=B.layers.mask&-5,P.layers.mask=B.layers.mask&-3;let Bt=X.parent,_t=B.cameras;at(B,Bt);for(let Xt=0;Xt<_t.length;Xt++)at(_t[Xt],Bt);_t.length===2?et(B,R,P):B.projectionMatrix.copy(R.projectionMatrix),M===null&&X.isPerspectiveCamera&&(M={camera:X,fov:X.fov,zoom:X.zoom}),rt(X,B,Bt)};function rt(X,Q,yt){yt===null?X.matrix.copy(Q.matrixWorld):(X.matrix.copy(yt.matrixWorld),X.matrix.invert(),X.matrix.multiply(Q.matrixWorld)),X.matrix.decompose(X.position,X.quaternion,X.scale),X.updateMatrixWorld(!0),X.projectionMatrix.copy(Q.projectionMatrix),X.projectionMatrixInverse.copy(Q.projectionMatrixInverse),X.isPerspectiveCamera&&(X.fov=ia*2*Math.atan(1/X.projectionMatrix.elements[5]),X.zoom=1)}this.getCamera=function(){return B},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(X){l=X,d!==null&&(d.fixedFoveation=X),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=X)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(B)},this.getCameraTexture=function(X){return m[X]};let zt=null;function It(X,Q){if(h=Q.getViewerPose(c||o),g=Q,h!==null){let yt=h.views;f!==null&&(t.setRenderTargetFramebuffer(b,f.framebuffer),t.setRenderTarget(b));let Bt=!1;yt.length!==B.cameras.length&&(B.cameras.length=0,Bt=!0);for(let $t=0;$t<yt.length;$t++){let te=yt[$t],he=null;if(f!==null)he=f.getViewport(te);else{let ve=u.getViewSubImage(d,te);he=ve.viewport,$t===0&&(t.setRenderTargetTextures(b,ve.colorTexture,ve.depthStencilTexture),t.setRenderTarget(b))}let qt=I[$t];qt===void 0&&(qt=new Ye,qt.layers.enable($t),qt.viewport=new _e,I[$t]=qt),qt.matrix.fromArray(te.transform.matrix),qt.matrix.decompose(qt.position,qt.quaternion,qt.scale),qt.projectionMatrix.fromArray(te.projectionMatrix),qt.projectionMatrixInverse.copy(qt.projectionMatrix).invert(),qt.viewport.set(he.x,he.y,he.width,he.height),$t===0&&(B.matrix.copy(qt.matrix),B.matrix.decompose(B.position,B.quaternion,B.scale)),Bt===!0&&B.cameras.push(qt)}let _t=s.enabledFeatures;if(_t&&_t.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&x){u=n.getBinding();let $t=u.getDepthInformation(yt[0]);$t&&$t.isValid&&$t.texture&&p.init($t,s.renderState)}if(_t&&_t.includes("camera-access")&&x){t.state.unbindTexture(),u=n.getBinding();for(let $t=0;$t<yt.length;$t++){let te=yt[$t].camera;if(te){let he=m[te];he||(he=new ua,m[te]=he);let qt=u.getCameraImage(te);he.sourceTexture=qt}}}}for(let yt=0;yt<T.length;yt++){let Bt=S[yt],_t=T[yt];Bt!==null&&_t!==void 0&&_t.update(Bt,Q,c||o)}zt&&zt(X,Q),Q.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:Q}),g=null}let Lt=new V0;Lt.setAnimationLoop(It),this.setAnimationLoop=function(X){zt=X},this.dispose=function(){}}},z1=new fe,Y0=new Ht;Y0.set(-1,0,0,0,1,0,0,0,1);function H1(i,t){function e(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function n(p,m){m.color.getRGB(p.fogColor.value,vf(i)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function s(p,m,_,E,b){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?r(p,m):m.isMeshLambertMaterial?(r(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(r(p,m),u(p,m)):m.isMeshPhongMaterial?(r(p,m),h(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(r(p,m),d(p,m),m.isMeshPhysicalMaterial&&f(p,m,b)):m.isMeshMatcapMaterial?(r(p,m),g(p,m)):m.isMeshDepthMaterial?r(p,m):m.isMeshDistanceMaterial?(r(p,m),x(p,m)):m.isMeshNormalMaterial?r(p,m):m.isLineBasicMaterial?(o(p,m),m.isLineDashedMaterial&&a(p,m)):m.isPointsMaterial?l(p,m,_,E):m.isSpriteMaterial?c(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,e(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,e(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===fn&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,e(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===fn&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,e(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,e(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,e(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);let _=t.get(m),E=_.envMap,b=_.envMapRotation;E&&(p.envMap.value=E,p.envMapRotation.value.setFromMatrix4(z1.makeRotationFromEuler(b)).transpose(),E.isCubeTexture&&E.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(Y0),p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,e(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,e(m.aoMap,p.aoMapTransform))}function o(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,e(m.map,p.mapTransform))}function a(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function l(p,m,_,E){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*_,p.scale.value=E*.5,m.map&&(p.map.value=m.map,e(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function c(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,e(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function h(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function u(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function d(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,e(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,e(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function f(p,m,_){p.ior.value=m.ior,m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,e(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,e(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,e(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,e(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,e(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===fn&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.retroreflectivity>0&&(p.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,e(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,e(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=_.texture,p.transmissionSamplerSize.value.set(_.width,_.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,e(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,e(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,e(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,e(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,e(m.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,m){m.matcap&&(p.matcap.value=m.matcap)}function x(p,m){let _=t.get(m).light;p.referencePosition.value.setFromMatrixPosition(_.matrixWorld),p.nearDistance.value=_.shadow.camera.near,p.farDistance.value=_.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function G1(i,t,e,n){let s={},r={},o=[],a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(b,T){let S=T.program;n.uniformBlockBinding(b,S)}function c(b,T){let S=s[b.id];S===void 0&&(p(b),S=h(b),s[b.id]=S,b.addEventListener("dispose",_));let A=T.program;n.updateUBOMapping(b,A);let v=t.render.frame;r[b.id]!==v&&(d(b),r[b.id]=v)}function h(b){let T=u();b.__bindingPointIndex=T;let S=i.createBuffer(),A=b.__size,v=b.usage;return i.bindBuffer(i.UNIFORM_BUFFER,S),i.bufferData(i.UNIFORM_BUFFER,A,v),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,T,S),S}function u(){for(let b=0;b<a;b++)if(o.indexOf(b)===-1)return o.push(b),b;return Nt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(b){let T=s[b.id],S=b.uniforms,A=b.__cache;i.bindBuffer(i.UNIFORM_BUFFER,T);for(let v=0,M=S.length;v<M;v++){let R=S[v];if(Array.isArray(R))for(let P=0,I=R.length;P<I;P++)f(R[P],v,P,A);else f(R,v,0,A)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(b,T,S,A){if(x(b,T,S,A)===!0){let v=b.__offset,M=b.value;if(Array.isArray(M)){let R=0;for(let P=0;P<M.length;P++){let I=M[P],B=m(I);g(I,b.__data,R),typeof I!="number"&&typeof I!="boolean"&&!I.isMatrix3&&!ArrayBuffer.isView(I)&&(R+=B.storage/Float32Array.BYTES_PER_ELEMENT)}}else g(M,b.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,v,b.__data)}}function g(b,T,S){typeof b=="number"||typeof b=="boolean"?T[0]=b:b.isMatrix3?(T[0]=b.elements[0],T[1]=b.elements[1],T[2]=b.elements[2],T[3]=0,T[4]=b.elements[3],T[5]=b.elements[4],T[6]=b.elements[5],T[7]=0,T[8]=b.elements[6],T[9]=b.elements[7],T[10]=b.elements[8],T[11]=0):ArrayBuffer.isView(b)?T.set(new b.constructor(b.buffer,b.byteOffset,T.length)):b.toArray(T,S)}function x(b,T,S,A){let v=b.value,M=T+"_"+S;if(A[M]===void 0)return typeof v=="number"||typeof v=="boolean"?A[M]=v:ArrayBuffer.isView(v)?A[M]=v.slice():A[M]=v.clone(),!0;{let R=A[M];if(typeof v=="number"||typeof v=="boolean"){if(R!==v)return A[M]=v,!0}else{if(ArrayBuffer.isView(v))return!0;if(R.equals(v)===!1)return R.copy(v),!0}}return!1}function p(b){let T=b.uniforms,S=0,A=16;for(let M=0,R=T.length;M<R;M++){let P=Array.isArray(T[M])?T[M]:[T[M]];for(let I=0,B=P.length;I<B;I++){let k=P[I],U=Array.isArray(k.value)?k.value:[k.value];for(let V=0,q=U.length;V<q;V++){let nt=U[V],$=m(nt),J=S%A,et=J%$.boundary,at=J+et;S+=et,at!==0&&A-at<$.storage&&(S+=A-at),k.__data=new Float32Array($.storage/Float32Array.BYTES_PER_ELEMENT),k.__offset=S,S+=$.storage}}}let v=S%A;return v>0&&(S+=A-v),b.__size=S,b.__cache={},this}function m(b){let T={boundary:0,storage:0};return typeof b=="number"||typeof b=="boolean"?(T.boundary=4,T.storage=4):b.isVector2?(T.boundary=8,T.storage=8):b.isVector3||b.isColor?(T.boundary=16,T.storage=12):b.isVector4?(T.boundary=16,T.storage=16):b.isMatrix3?(T.boundary=48,T.storage=48):b.isMatrix4?(T.boundary=64,T.storage=64):b.isTexture?Ot("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(b)?(T.boundary=16,T.storage=b.byteLength):Ot("WebGLRenderer: Unsupported uniform value type.",b),T}function _(b){let T=b.target;T.removeEventListener("dispose",_);let S=o.indexOf(T.__bindingPointIndex);o.splice(S,1),i.deleteBuffer(s[T.id]),delete s[T.id],delete r[T.id]}function E(){for(let b in s)i.deleteBuffer(s[b]);o=[],s={},r={}}return{bind:l,update:c,dispose:E}}var V1=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),mi=null;function W1(){return mi===null&&(mi=new Br(V1,16,16,cs,We),mi.name="DFG_LUT",mi.minFilter=Be,mi.magFilter=Be,mi.wrapS=li,mi.wrapT=li,mi.generateMipmaps=!1,mi.needsUpdate=!0),mi}var yh=class{constructor(t={}){let{canvas:e=p0(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=_n}=t;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=o;let x=f,p=new Set([Nc,Dc,Lc]),m=new Set([_n,jn,qr,Yr,kc,Ic]),_=new Uint32Array(4),E=new Int32Array(4),b=new D,T=null,S=null,A=[],v=[],M=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Cn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let R=this,P=!1,I=null,B=null,k=null,U=null;this._outputColorSpace=Ce;let V=0,q=0,nt=null,$=-1,J=null,et=new _e,at=new _e,rt=null,zt=new Ct(0),It=0,Lt=e.width,X=e.height,Q=1,yt=null,Bt=null,_t=new _e(0,0,Lt,X),Xt=new _e(0,0,Lt,X),He=!1,$t=new zr,te=!1,he=!1,qt=new fe,ve=new D,Ze=new _e,mn={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Me=!1;function De(){return nt===null?Q:1}let O=n;function rn(w,L){return e.getContext(w,L)}let re,C,y,F,G,Y,ot,lt,j,tt,ct,Rt,ft,ht,Pt,Dt,Gt,N,ut,K,dt,xt,it;try{let w={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"186"}`),e.addEventListener("webglcontextlost",ue,!1),e.addEventListener("webglcontextrestored",ee,!1),e.addEventListener("webglcontextcreationerror",zn,!1),O===null){let L="webgl2";if(O=rn(L,w),O===null)throw rn(L)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}kt()}catch(w){throw e.removeEventListener("webglcontextlost",ue,!1),e.removeEventListener("webglcontextrestored",ee,!1),e.removeEventListener("webglcontextcreationerror",zn,!1),Nt("WebGLRenderer: "+w.message),w}function kt(){re=new Kw(O),re.init(),dt=new F1(O,re),C=new Hw(O,re,t,dt),y=new N1(O,re),C.reversedDepthBuffer&&d&&y.buffers.depth.setReversed(!0),B=O.createFramebuffer(),k=O.createFramebuffer(),U=O.createFramebuffer(),F=new tS(O),G=new b1,Y=new O1(O,re,y,G,C,dt,F),ot=new jw(R),lt=new nb(O),xt=new Bw(O,lt),j=new Jw(O,lt,F,xt),tt=new nS(O,j,lt,xt,F),N=new eS(O,C,Y),Pt=new Gw(G),ct=new _1(R,ot,re,C,xt,Pt),Rt=new H1(R,G),ft=new w1,ht=new R1(re),Gt=new Uw(R,ot,y,tt,g,l),Dt=new D1(R,tt,C),it=new G1(O,F,C,y),ut=new zw(O,re,F),K=new Qw(O,re,F),F.programs=ct.programs,R.capabilities=C,R.extensions=re,R.properties=G,R.renderLists=ft,R.shadowMap=Dt,R.state=y,R.info=F}x!==_n&&(M=new sS(x,e.width,e.height,a,s,r));let Tt=new Ff(R,O);this.xr=Tt,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){let w=re.get("WEBGL_lose_context");w&&w.loseContext()},this.forceContextRestore=function(){let w=re.get("WEBGL_lose_context");w&&w.restoreContext()},this.getPixelRatio=function(){return Q},this.setPixelRatio=function(w){w!==void 0&&(Q=w,this.setSize(Lt,X,!1))},this.getSize=function(w){return w.set(Lt,X)},this.setSize=function(w,L,W=!0){if(Tt.isPresenting){Ot("WebGLRenderer: Can't change size while VR device is presenting.");return}Lt=w,X=L,e.width=Math.floor(w*Q),e.height=Math.floor(L*Q),W===!0&&(e.style.width=w+"px",e.style.height=L+"px"),M!==null&&M.setSize(e.width,e.height),this.setViewport(0,0,w,L)},this.getDrawingBufferSize=function(w){return w.set(Lt*Q,X*Q).floor()},this.setDrawingBufferSize=function(w,L,W){Lt=w,X=L,Q=W,e.width=Math.floor(w*W),e.height=Math.floor(L*W),this.setViewport(0,0,w,L)},this.setEffects=function(w){if(x===_n){Nt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(w){for(let L=0;L<w.length;L++)if(w[L].isOutputPass===!0){Ot("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}M.setEffects(w||[])},this.getCurrentViewport=function(w){return w.copy(et)},this.getViewport=function(w){return w.copy(_t)},this.setViewport=function(w,L,W,z){w.isVector4?_t.set(w.x,w.y,w.z,w.w):_t.set(w,L,W,z),y.viewport(et.copy(_t).multiplyScalar(Q).round())},this.getScissor=function(w){return w.copy(Xt)},this.setScissor=function(w,L,W,z){w.isVector4?Xt.set(w.x,w.y,w.z,w.w):Xt.set(w,L,W,z),y.scissor(at.copy(Xt).multiplyScalar(Q).round())},this.getScissorTest=function(){return He},this.setScissorTest=function(w){y.setScissorTest(He=w)},this.setOpaqueSort=function(w){yt=w},this.setTransparentSort=function(w){Bt=w},this.getClearColor=function(w){return w.copy(Gt.getClearColor())},this.setClearColor=function(){Gt.setClearColor(...arguments)},this.getClearAlpha=function(){return Gt.getClearAlpha()},this.setClearAlpha=function(){Gt.setClearAlpha(...arguments)},this.clear=function(w=!0,L=!0,W=!0){let z=0;if(w){let H=!1;if(nt!==null){let gt=nt.texture.format;H=p.has(gt)}if(H){let gt=nt.texture.type,bt=m.has(gt),mt=Gt.getClearColor(),wt=Gt.getClearAlpha(),Et=mt.r,Vt=mt.g,Zt=mt.b;bt?(_[0]=Et,_[1]=Vt,_[2]=Zt,_[3]=wt,O.clearBufferuiv(O.COLOR,0,_)):(E[0]=Et,E[1]=Vt,E[2]=Zt,E[3]=wt,O.clearBufferiv(O.COLOR,0,E))}else z|=O.COLOR_BUFFER_BIT}L&&(z|=O.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),W&&(z|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),z!==0&&O.clear(z)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(w){w.setRenderer(this),I=w},this.dispose=function(){e.removeEventListener("webglcontextlost",ue,!1),e.removeEventListener("webglcontextrestored",ee,!1),e.removeEventListener("webglcontextcreationerror",zn,!1),Gt.dispose(),ft.dispose(),ht.dispose(),G.dispose(),ot.dispose(),tt.dispose(),xt.dispose(),it.dispose(),ct.dispose(),Tt.dispose(),Tt.removeEventListener("sessionstart",Ip),Tt.removeEventListener("sessionend",Lp),vs.stop()};function ue(w){w.preventDefault(),na("WebGLRenderer: Context Lost."),P=!0}function ee(){na("WebGLRenderer: Context Restored."),P=!1;let w=F.autoReset,L=Dt.enabled,W=Dt.autoUpdate,z=Dt.needsUpdate,H=Dt.type;kt(),F.autoReset=w,Dt.enabled=L,Dt.autoUpdate=W,Dt.needsUpdate=z,Dt.type=H}function zn(w){Nt("WebGLRenderer: A WebGL context could not be created. Reason: ",w.statusMessage)}function ti(w){let L=w.target;L.removeEventListener("dispose",ti),yv(L)}function yv(w){vv(w),G.remove(w)}function vv(w){let L=G.get(w).programs;L!==void 0&&(L.forEach(function(W){ct.releaseProgram(W)}),w.isShaderMaterial&&ct.releaseShaderCache(w))}this.renderBufferDirect=function(w,L,W,z,H,gt){L===null&&(L=mn);let bt=H.isMesh&&H.matrixWorld.determinantAffine()<0,mt=Mv(w,L,W,z,H);y.setMaterial(z,bt);let wt=W.index,Et=1;if(z.wireframe===!0){if(wt=j.getWireframeAttribute(W),wt===void 0)return;Et=2}let Vt=W.drawRange,Zt=W.attributes.position,St=Vt.start*Et,ne=(Vt.start+Vt.count)*Et;gt!==null&&(St=Math.max(St,gt.start*Et),ne=Math.min(ne,(gt.start+gt.count)*Et)),wt!==null?(St=Math.max(St,0),ne=Math.min(ne,wt.count)):Zt!=null&&(St=Math.max(St,0),ne=Math.min(ne,Zt.count));let Ne=ne-St;if(Ne<0||Ne===1/0)return;xt.setup(H,z,mt,W,wt);let pe,ce=ut;if(wt!==null&&(pe=lt.get(wt),ce=K,ce.setIndex(pe)),H.isMesh)z.wireframe===!0?(y.setLineWidth(z.wireframeLinewidth*De()),ce.setMode(O.LINES)):ce.setMode(O.TRIANGLES);else if(H.isLine){let on=z.linewidth;on===void 0&&(on=1),y.setLineWidth(on*De()),H.isLineSegments?ce.setMode(O.LINES):H.isLineLoop?ce.setMode(O.LINE_LOOP):ce.setMode(O.LINE_STRIP)}else H.isPoints?ce.setMode(O.POINTS):H.isSprite&&ce.setMode(O.TRIANGLES);if(H.isBatchedMesh)if(re.get("WEBGL_multi_draw"))ce.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{let on=H._multiDrawStarts,vt=H._multiDrawCounts,un=H._multiDrawCount,Qt=wt?lt.get(wt).bytesPerElement:1,Pn=G.get(z).currentProgram.getUniforms();for(let ei=0;ei<un;ei++)Pn.setValue(O,"_gl_DrawID",ei),ce.render(on[ei]/Qt,vt[ei])}else if(H.isInstancedMesh)ce.renderInstances(St,Ne,H.count);else if(W.isInstancedBufferGeometry){let on=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,vt=Math.min(W.instanceCount,on);ce.renderInstances(St,Ne,vt)}else ce.render(St,Ne)};function kp(w,L,W,z){I!==null&&w.isNodeMaterial&&I.setObject(z,w),te===!0&&Pt.setState(w,W,!1),w.transparent===!0&&w.side===vn&&w.forceSinglePass===!1?(w.side=fn,w.needsUpdate=!0,tl(w,L,z),w.side=rs,w.needsUpdate=!0,tl(w,L,z),w.side=vn):tl(w,L,z)}this.compile=function(w,L,W=null){W===null&&(W=w),I!==null&&I.renderStart(w,L,W),S=ht.get(W),S.init(L),v.push(S),W.traverseVisible(function(H){H.isLight&&H.layers.test(L.layers)&&(S.pushLight(H),H.castShadow&&S.pushShadow(H))}),w!==W&&w.traverseVisible(function(H){H.isLight&&H.layers.test(L.layers)&&(S.pushLight(H),H.castShadow&&S.pushShadow(H))}),S.setupLights(),I!==null&&I.updateLights(S.state.lightsArray),he=this.localClippingEnabled,te=Pt.init(this.clippingPlanes,he),te===!0&&Pt.setGlobalState(this.clippingPlanes,L),I!==null&&Dt.render(S.state.shadowsArray,W,L);let z=new Set;return w.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;let gt=H.material;if(gt)if(Array.isArray(gt))for(let bt=0;bt<gt.length;bt++){let mt=gt[bt];kp(mt,W,L,H),z.add(mt)}else kp(gt,W,L,H),z.add(gt)}),S=v.pop(),I!==null&&I.renderEnd(),z},this.compileAsync=function(w,L,W=null){let z=this.compile(w,L,W);return new Promise(H=>{function gt(){if(z.forEach(function(bt){let wt=G.get(bt).currentProgram;(wt===void 0||wt.isReady())&&z.delete(bt)}),z.size===0){H(w);return}setTimeout(gt,10)}re.get("KHR_parallel_shader_compile")!==null?gt():setTimeout(gt,10)})};let Gu=null;function _v(w){Gu&&Gu(w)}function Ip(){vs.stop()}function Lp(){vs.start()}let vs=new V0;vs.setAnimationLoop(_v),typeof self<"u"&&vs.setContext(self),this.setAnimationLoop=function(w){Gu=w,Tt.setAnimationLoop(w),w===null?vs.stop():vs.start()},Tt.addEventListener("sessionstart",Ip),Tt.addEventListener("sessionend",Lp),this.render=function(w,L){if(L!==void 0&&L.isCamera!==!0){Nt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(P===!0)return;I!==null&&I.renderStart(w,L);let W=Tt.enabled===!0&&Tt.isPresenting===!0,z=M!==null&&(nt===null||W)&&M.begin(R,nt);if(w.matrixWorldAutoUpdate===!0&&w.updateMatrixWorld(),L.parent===null&&L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),Tt.enabled===!0&&Tt.isPresenting===!0&&(M===null||M.isCompositing()===!1)&&(Tt.cameraAutoUpdate===!0&&Tt.updateCamera(L),L=Tt.getCamera()),w.isScene===!0&&w.onBeforeRender(R,w,L,nt),S=ht.get(w,v.length),S.init(L),S.state.textureUnits=Y.getTextureUnits(),v.push(S),qt.multiplyMatrices(L.projectionMatrix,L.matrixWorldInverse),$t.setFromProjectionMatrix(qt,Zn,L.reversedDepth),he=this.localClippingEnabled,te=Pt.init(this.clippingPlanes,he),T=ft.get(w,A.length),T.init(),A.push(T),Tt.enabled===!0&&Tt.isPresenting===!0){let bt=R.xr.getDepthSensingMesh();bt!==null&&Vu(bt,L,-1/0,R.sortObjects)}Vu(w,L,0,R.sortObjects),T.finish(),I!==null&&I.updateLights(S.state.lightsArray),R.sortObjects===!0&&T.sort(yt,Bt),Me=Tt.enabled===!1||Tt.isPresenting===!1||Tt.hasDepthSensing()===!1,Me&&Gt.addToRenderList(T,w),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),te===!0&&Pt.beginShadows();let H=S.state.shadowsArray;if(Dt.render(H,w,L),te===!0&&Pt.endShadows(),(z&&M.hasRenderPass())===!1){let bt=T.opaque,mt=T.transmissive;if(S.setupLights(),L.isArrayCamera){let wt=L.cameras;if(mt.length>0)for(let Et=0,Vt=wt.length;Et<Vt;Et++){let Zt=wt[Et];Np(bt,mt,w,Zt)}Me&&Gt.render(w);for(let Et=0,Vt=wt.length;Et<Vt;Et++){let Zt=wt[Et];Dp(T,w,Zt,Zt.viewport)}}else mt.length>0&&Np(bt,mt,w,L),Me&&Gt.render(w),Dp(T,w,L)}nt!==null&&q===0&&(Y.updateMultisampleRenderTarget(nt),Y.updateRenderTargetMipmap(nt)),z&&M.end(R),w.isScene===!0&&w.onAfterRender(R,w,L),xt.resetDefaultState(),$=-1,J=null,v.pop(),v.length>0?(S=v[v.length-1],Y.setTextureUnits(S.state.textureUnits),te===!0&&Pt.setGlobalState(R.clippingPlanes,S.state.camera)):S=null,A.pop(),A.length>0?T=A[A.length-1]:T=null,I!==null&&I.renderEnd()};function Vu(w,L,W,z){if(w.visible===!1)return;if(w.layers.test(L.layers)){if(w.isGroup)W=w.renderOrder;else if(w.isLOD)w.autoUpdate===!0&&w.update(L);else if(w.isLightProbeGrid)S.pushLightProbeGrid(w);else if(w.isLight)S.pushLight(w),w.castShadow&&S.pushShadow(w);else if(w.isSprite){if(!w.frustumCulled||w.intersectsFrustum($t)){z&&Ze.setFromMatrixPosition(w.matrixWorld).applyMatrix4(qt);let bt=tt.update(w),mt=w.material;mt.visible&&T.push(w,bt,mt,W,Ze.z,null,L)}}else if((w.isMesh||w.isLine||w.isPoints)&&(!w.frustumCulled||w.intersectsFrustum($t))){let bt=tt.update(w),mt=w.material;if(z&&(w.boundingSphere!==void 0?(w.boundingSphere===null&&w.computeBoundingSphere(),Ze.copy(w.boundingSphere.center)):(bt.boundingSphere===null&&bt.computeBoundingSphere(),Ze.copy(bt.boundingSphere.center)),Ze.applyMatrix4(w.matrixWorld).applyMatrix4(qt)),Array.isArray(mt)){let wt=bt.groups;for(let Et=0,Vt=wt.length;Et<Vt;Et++){let Zt=wt[Et],St=mt[Zt.materialIndex];St&&St.visible&&T.push(w,bt,St,W,Ze.z,Zt,L)}}else mt.visible&&T.push(w,bt,mt,W,Ze.z,null,L)}}let gt=w.children;for(let bt=0,mt=gt.length;bt<mt;bt++)Vu(gt[bt],L,W,z)}function Dp(w,L,W,z){let{opaque:H,transmissive:gt,transparent:bt}=w;S.setupLightsView(W),te===!0&&Pt.setGlobalState(R.clippingPlanes,W),z&&y.viewport(et.copy(z)),H.length>0&&Qa(H,L,W),gt.length>0&&Qa(gt,L,W),bt.length>0&&Qa(bt,L,W),y.buffers.depth.setTest(!0),y.buffers.depth.setMask(!0),y.buffers.color.setMask(!0),y.setPolygonOffset(!1)}function Np(w,L,W,z){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;if(S.state.transmissionRenderTarget[z.id]===void 0){let St=re.has("EXT_color_buffer_half_float")||re.has("EXT_color_buffer_float");S.state.transmissionRenderTarget[z.id]=new Re(1,1,{generateMipmaps:!0,type:St?We:_n,minFilter:pi,samples:Math.max(4,C.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Yt.workingColorSpace})}let gt=S.state.transmissionRenderTarget[z.id],bt=z.viewport||et;gt.setSize(bt.z*R.transmissionResolutionScale,bt.w*R.transmissionResolutionScale);let mt=R.getRenderTarget(),wt=R.getActiveCubeFace(),Et=R.getActiveMipmapLevel();R.setRenderTarget(gt),R.getClearColor(zt),It=R.getClearAlpha(),It<1&&R.setClearColor(16777215,.5),R.clear(),Me&&Gt.render(W);let Vt=R.toneMapping;R.toneMapping=Cn;let Zt=z.viewport;if(z.viewport!==void 0&&(z.viewport=void 0),S.setupLightsView(z),te===!0&&Pt.setGlobalState(R.clippingPlanes,z),Qa(w,W,z),Y.updateMultisampleRenderTarget(gt),Y.updateRenderTargetMipmap(gt),re.has("WEBGL_multisampled_render_to_texture")===!1){let St=!1;for(let ne=0,Ne=L.length;ne<Ne;ne++){let pe=L[ne],{object:ce,geometry:on,material:vt,group:un}=pe;if(vt.side===vn&&ce.layers.test(z.layers)){let Qt=vt.side;vt.side=fn,vt.needsUpdate=!0,Op(ce,W,z,on,vt,un),vt.side=Qt,vt.needsUpdate=!0,St=!0}}St===!0&&(Y.updateMultisampleRenderTarget(gt),Y.updateRenderTargetMipmap(gt))}R.setRenderTarget(mt,wt,Et),R.setClearColor(zt,It),Zt!==void 0&&(z.viewport=Zt),R.toneMapping=Vt}function Qa(w,L,W){let z=L.isScene===!0?L.overrideMaterial:null;for(let H=0,gt=w.length;H<gt;H++){let bt=w[H],{object:mt,geometry:wt,group:Et}=bt,Vt=bt.material;Vt.allowOverride===!0&&z!==null&&(Vt=z),mt.layers.test(W.layers)&&Op(mt,L,W,wt,Vt,Et)}}function Op(w,L,W,z,H,gt){I!==null&&H.isNodeMaterial&&I.setObject(w,H),w.onBeforeRender(R,L,W,z,H,gt),w.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,w.matrixWorld),w.normalMatrix.getNormalMatrix(w.modelViewMatrix),H.onBeforeRender(R,L,W,z,w,gt),H.transparent===!0&&H.side===vn&&H.forceSinglePass===!1?(H.side=fn,H.needsUpdate=!0,R.renderBufferDirect(W,L,z,H,w,gt),H.side=rs,H.needsUpdate=!0,R.renderBufferDirect(W,L,z,H,w,gt),H.side=vn):R.renderBufferDirect(W,L,z,H,w,gt),w.onAfterRender(R,L,W,z,H,gt)}function tl(w,L,W){L.isScene!==!0&&(L=mn);let z=G.get(w),H=S.state.lights,gt=S.state.shadowsArray,bt=H.state.version,mt=ct.getParameters(w,H.state,gt,L,W,S.state.lightProbeGridArray),wt=ct.getProgramCacheKey(mt),Et=z.programs;z.environment=w.isMeshStandardMaterial||w.isMeshLambertMaterial||w.isMeshPhongMaterial?L.environment:null,z.fog=L.fog;let Vt=w.isMeshStandardMaterial||w.isMeshLambertMaterial&&!w.envMap||w.isMeshPhongMaterial&&!w.envMap;z.envMap=ot.get(w.envMap||z.environment,Vt),z.envMapRotation=z.environment!==null&&w.envMap===null?L.environmentRotation:w.envMapRotation,Et===void 0&&(w.addEventListener("dispose",ti),Et=new Map,z.programs=Et);let Zt=Et.get(wt);if(Zt!==void 0){if(z.currentProgram===Zt&&z.lightsStateVersion===bt)return Up(w,mt),Zt}else mt.uniforms=ct.getUniforms(w),I!==null&&w.isNodeMaterial&&I.build(w,W,mt),w.onBeforeCompile(mt,R),Zt=ct.acquireProgram(mt,wt),Et.set(wt,Zt),z.uniforms=mt.uniforms;let St=z.uniforms;return(!w.isShaderMaterial&&!w.isRawShaderMaterial||w.clipping===!0)&&(St.clippingPlanes=Pt.uniform),Up(w,mt),z.needsLights=Sv(w),z.lightsStateVersion=bt,z.needsLights&&(St.ambientLightColor.value=H.state.ambient,St.lightProbe.value=H.state.probe,St.sunLights.value=H.state.sun,St.sunLightShadows.value=H.state.sunShadow,St.directionalLights.value=H.state.directional,St.directionalLightShadows.value=H.state.directionalShadow,St.spotLights.value=H.state.spot,St.spotLightShadows.value=H.state.spotShadow,St.rectAreaLights.value=H.state.rectArea,St.ltc_1.value=H.state.rectAreaLTC1,St.ltc_2.value=H.state.rectAreaLTC2,St.pointLights.value=H.state.point,St.pointLightShadows.value=H.state.pointShadow,St.hemisphereLights.value=H.state.hemi,St.sunShadowMatrix.value=H.state.sunShadowMatrix,St.sunShadowCascade.value=H.state.sunShadowCascade,St.directionalShadowMatrix.value=H.state.directionalShadowMatrix,St.spotLightMatrix.value=H.state.spotLightMatrix,St.spotLightMap.value=H.state.spotLightMap,St.pointShadowMatrix.value=H.state.pointShadowMatrix),z.lightProbeGrid=S.state.lightProbeGridArray.length>0,z.currentProgram=Zt,z.uniformsList=null,Zt}function Fp(w){if(w.uniformsList===null){let L=w.currentProgram.getUniforms();w.uniformsList=Jr.seqWithValue(L.seq,w.uniforms)}return w.uniformsList}function Up(w,L){let W=G.get(w);W.outputColorSpace=L.outputColorSpace,W.batching=L.batching,W.batchingColor=L.batchingColor,W.instancing=L.instancing,W.instancingColor=L.instancingColor,W.instancingMorph=L.instancingMorph,W.skinning=L.skinning,W.morphTargets=L.morphTargets,W.morphNormals=L.morphNormals,W.morphColors=L.morphColors,W.morphTargetsCount=L.morphTargetsCount,W.numClippingPlanes=L.numClippingPlanes,W.numIntersection=L.numClipIntersection,W.vertexAlphas=L.vertexAlphas,W.vertexTangents=L.vertexTangents,W.toneMapping=L.toneMapping}function bv(w,L){if(w.length===0)return null;if(w.length===1)return w[0].texture!==null?w[0]:null;b.setFromMatrixPosition(L.matrixWorld);for(let W=0,z=w.length;W<z;W++){let H=w[W];if(H.texture!==null&&H.boundingBox.containsPoint(b))return H}return null}function Mv(w,L,W,z,H){L.isScene!==!0&&(L=mn),Y.resetTextureUnits();let gt=L.fog,bt=z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial?L.environment:null,mt=nt===null?R.outputColorSpace:nt.isXRRenderTarget===!0?nt.texture.colorSpace:Yt.workingColorSpace,wt=z.isMeshStandardMaterial||z.isMeshLambertMaterial&&!z.envMap||z.isMeshPhongMaterial&&!z.envMap,Et=ot.get(z.envMap||bt,wt),Vt=z.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Zt=!!W.attributes.tangent&&(!!z.normalMap||z.anisotropy>0),St=!!W.morphAttributes.position,ne=!!W.morphAttributes.normal,Ne=!!W.morphAttributes.color,pe=Cn;z.toneMapped&&(nt===null||nt.isXRRenderTarget===!0)&&(pe=R.toneMapping);let ce=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,on=ce!==void 0?ce.length:0,vt=G.get(z),un=S.state.lights;if(te===!0&&(he===!0||w!==J)){let de=w===J&&z.id===$;Pt.setState(z,w,de)}let Qt=!1;z.version===vt.__version?(vt.needsLights&&vt.lightsStateVersion!==un.state.version||vt.outputColorSpace!==mt||H.isBatchedMesh&&vt.batching===!1||!H.isBatchedMesh&&vt.batching===!0||H.isBatchedMesh&&vt.batchingColor===!0&&H._colorsTexture===null||H.isBatchedMesh&&vt.batchingColor===!1&&H._colorsTexture!==null||H.isInstancedMesh&&vt.instancing===!1||!H.isInstancedMesh&&vt.instancing===!0||H.isSkinnedMesh&&vt.skinning===!1||!H.isSkinnedMesh&&vt.skinning===!0||H.isInstancedMesh&&vt.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&vt.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&vt.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&vt.instancingMorph===!1&&H.morphTexture!==null||vt.envMap!==Et||z.fog===!0&&vt.fog!==gt||vt.numClippingPlanes!==void 0&&(vt.numClippingPlanes!==Pt.numPlanes||vt.numIntersection!==Pt.numIntersection)||vt.vertexAlphas!==Vt||vt.vertexTangents!==Zt||vt.morphTargets!==St||vt.morphNormals!==ne||vt.morphColors!==Ne||vt.toneMapping!==pe||vt.morphTargetsCount!==on||!!vt.lightProbeGrid!=S.state.lightProbeGridArray.length>0)&&(Qt=!0):(Qt=!0,vt.__version=z.version);let Pn=vt.currentProgram;Qt===!0&&(Pn=tl(z,L,H),I&&z.isNodeMaterial&&I.onUpdateProgram(z,Pn,vt));let ei=!1,Bi=!1,js=!1,ae=Pn.getUniforms(),Pe=vt.uniforms;if(y.useProgram(Pn.program)&&(ei=!0,Bi=!0,js=!0),z.id!==$&&($=z.id,Bi=!0),vt.needsLights){let de=bv(S.state.lightProbeGridArray,H);vt.lightProbeGrid!==de&&(vt.lightProbeGrid=de,Bi=!0)}if(ei||J!==w){y.buffers.depth.getReversed()&&w.reversedDepth!==!0&&(w._reversedDepth=!0,w.updateProjectionMatrix()),ae.setValue(O,"projectionMatrix",w.projectionMatrix),ae.setValue(O,"viewMatrix",w.matrixWorldInverse);let Hi=ae.map.cameraPosition;Hi!==void 0&&Hi.setValue(O,ve.setFromMatrixPosition(w.matrixWorld)),C.logarithmicDepthBuffer&&ae.setValue(O,"logDepthBufFC",2/(Math.log(w.far+1)/Math.LN2)),(z.isMeshPhongMaterial||z.isMeshToonMaterial||z.isMeshLambertMaterial||z.isMeshBasicMaterial||z.isMeshStandardMaterial||z.isShaderMaterial)&&ae.setValue(O,"isOrthographic",w.isOrthographicCamera===!0),J!==w&&(J=w,Bi=!0,js=!0)}if(vt.needsLights&&(un.state.sunShadowMap.length>0&&ae.setValue(O,"sunShadowMap",un.state.sunShadowMap,Y),un.state.directionalShadowMap.length>0&&ae.setValue(O,"directionalShadowMap",un.state.directionalShadowMap,Y),un.state.spotShadowMap.length>0&&ae.setValue(O,"spotShadowMap",un.state.spotShadowMap,Y),un.state.pointShadowMap.length>0&&ae.setValue(O,"pointShadowMap",un.state.pointShadowMap,Y)),H.isSkinnedMesh){ae.setOptional(O,H,"bindMatrix"),ae.setOptional(O,H,"bindMatrixInverse");let de=H.skeleton;de&&(de.boneTexture===null&&de.computeBoneTexture(),ae.setValue(O,"boneTexture",de.boneTexture,Y))}H.isBatchedMesh&&(ae.setOptional(O,H,"batchingTexture"),ae.setValue(O,"batchingTexture",H._matricesTexture,Y),ae.setOptional(O,H,"batchingIdTexture"),ae.setValue(O,"batchingIdTexture",H._indirectTexture,Y),ae.setOptional(O,H,"batchingColorTexture"),H._colorsTexture!==null&&ae.setValue(O,"batchingColorTexture",H._colorsTexture,Y));let zi=W.morphAttributes;if((zi.position!==void 0||zi.normal!==void 0||zi.color!==void 0)&&N.update(H,W,Pn),(Bi||vt.receiveShadow!==H.receiveShadow)&&(vt.receiveShadow=H.receiveShadow,ae.setValue(O,"receiveShadow",H.receiveShadow)),(z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial)&&z.envMap===null&&L.environment!==null&&(Pe.envMapIntensity.value=L.environmentIntensity),Pe.dfgLUT!==void 0&&(Pe.dfgLUT.value=W1()),Bi){if(ae.setValue(O,"toneMappingExposure",R.toneMappingExposure),vt.needsLights&&wv(Pe,js),gt&&z.fog===!0&&Rt.refreshFogUniforms(Pe,gt),Rt.refreshMaterialUniforms(Pe,z,Q,X,S.state.transmissionRenderTarget[w.id]),vt.needsLights&&vt.lightProbeGrid){let de=vt.lightProbeGrid;Pe.probesSH.value=de.texture,Pe.probesMin.value.copy(de.boundingBox.min),Pe.probesMax.value.copy(de.boundingBox.max),Pe.probesResolution.value.copy(de.resolution)}Jr.upload(O,Fp(vt),Pe,Y)}if(z.isShaderMaterial&&z.uniformsNeedUpdate===!0&&(Jr.upload(O,Fp(vt),Pe,Y),z.uniformsNeedUpdate=!1),z.isSpriteMaterial&&ae.setValue(O,"center",H.center),ae.setValue(O,"modelViewMatrix",H.modelViewMatrix),ae.setValue(O,"normalMatrix",H.normalMatrix),ae.setValue(O,"modelMatrix",H.matrixWorld),z.uniformsGroups!==void 0){let de=z.uniformsGroups;for(let Hi=0,Ks=de.length;Hi<Ks;Hi++){let zp=de[Hi];it.update(zp,Pn),it.bind(zp,Pn)}}return Pn}function wv(w,L){w.ambientLightColor.needsUpdate=L,w.lightProbe.needsUpdate=L,w.sunLights.needsUpdate=L,w.sunLightShadows.needsUpdate=L,w.directionalLights.needsUpdate=L,w.directionalLightShadows.needsUpdate=L,w.pointLights.needsUpdate=L,w.pointLightShadows.needsUpdate=L,w.spotLights.needsUpdate=L,w.spotLightShadows.needsUpdate=L,w.rectAreaLights.needsUpdate=L,w.hemisphereLights.needsUpdate=L}function Sv(w){return w.isMeshLambertMaterial||w.isMeshToonMaterial||w.isMeshPhongMaterial||w.isMeshStandardMaterial||w.isShadowMaterial||w.isShaderMaterial&&w.lights===!0}this.getActiveCubeFace=function(){return V},this.getActiveMipmapLevel=function(){return q},this.getRenderTarget=function(){return nt},this.setRenderTargetTextures=function(w,L,W){let z=G.get(w);z.__autoAllocateDepthBuffer=w.resolveDepthBuffer===!1,z.__autoAllocateDepthBuffer===!1&&(z.__useRenderToTexture=!1),G.get(w.texture).__webglTexture=L,G.get(w.depthTexture).__webglTexture=z.__autoAllocateDepthBuffer?void 0:W,z.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(w,L){let W=G.get(w);W.__webglFramebuffer=L,W.__useDefaultFramebuffer=L===void 0},this.setRenderTarget=function(w,L=0,W=0){nt=w,V=L,q=W;let z=null,H=!1,gt=!1;if(w){let mt=G.get(w);if(mt.__useDefaultFramebuffer!==void 0){y.bindFramebuffer(O.FRAMEBUFFER,mt.__webglFramebuffer),et.copy(w.viewport),at.copy(w.scissor),rt=w.scissorTest,y.viewport(et),y.scissor(at),y.setScissorTest(rt),$=-1;return}else if(mt.__webglFramebuffer===void 0)Y.setupRenderTarget(w);else if(mt.__hasExternalTextures)Y.rebindTextures(w,G.get(w.texture).__webglTexture,G.get(w.depthTexture).__webglTexture);else if(w.depthBuffer){let Vt=w.depthTexture;if(mt.__boundDepthTexture!==Vt){if(Vt!==null&&G.has(Vt)&&(w.width!==Vt.image.width||w.height!==Vt.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");Y.setupDepthRenderbuffer(w)}}let wt=w.texture;(wt.isData3DTexture||wt.isDataArrayTexture||wt.isCompressedArrayTexture)&&(gt=!0);let Et=G.get(w).__webglFramebuffer;w.isWebGLCubeRenderTarget?(Array.isArray(Et[L])?z=Et[L][W]:z=Et[L],H=!0):w.samples>0&&Y.useMultisampledRTT(w)===!1?z=G.get(w).__webglMultisampledFramebuffer:Array.isArray(Et)?z=Et[W]:z=Et,et.copy(w.viewport),at.copy(w.scissor),rt=w.scissorTest}else et.copy(_t).multiplyScalar(Q).floor(),at.copy(Xt).multiplyScalar(Q).floor(),rt=He;if(W!==0&&(z=B),y.bindFramebuffer(O.FRAMEBUFFER,z)&&y.drawBuffers(w,z),y.viewport(et),y.scissor(at),y.setScissorTest(rt),H){let mt=G.get(w.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+L,mt.__webglTexture,W)}else if(gt){let mt=L;for(let wt=0;wt<w.textures.length;wt++){let Et=G.get(w.textures[wt]);O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0+wt,Et.__webglTexture,W,mt)}}else if(w!==null&&W!==0){let mt=G.get(w.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,mt.__webglTexture,W)}$=-1};function Bp(w){let L=G.get(w);return(L.__readFormat!==w.format||L.__readType!==w.type)&&(L.__readFormat=w.format,L.__readType=w.type,L.__formatReadable=C.textureFormatReadable(w.format),L.__typeReadable=C.textureTypeReadable(w.type)),L}this.readRenderTargetPixels=function(w,L,W,z,H,gt,bt,mt=0){if(!(w&&w.isWebGLRenderTarget)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let wt=G.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&bt!==void 0&&(wt=wt[bt]),wt){y.bindFramebuffer(O.FRAMEBUFFER,wt);try{let Et=w.textures[mt],Vt=Et.format,Zt=Et.type;w.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+mt);let St=Bp(Et);if(St.__formatReadable===!1){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(St.__typeReadable===!1){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}L>=0&&L<=w.width-z&&W>=0&&W<=w.height-H&&O.readPixels(L,W,z,H,dt.convert(Vt),dt.convert(Zt),gt)}finally{let Et=nt!==null?G.get(nt).__webglFramebuffer:null;y.bindFramebuffer(O.FRAMEBUFFER,Et)}}},this.readRenderTargetPixelsAsync=async function(w,L,W,z,H,gt,bt,mt=0){if(!(w&&w.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let wt=G.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&bt!==void 0&&(wt=wt[bt]),wt)if(L>=0&&L<=w.width-z&&W>=0&&W<=w.height-H){y.bindFramebuffer(O.FRAMEBUFFER,wt);let Et=w.textures[mt],Vt=Et.format,Zt=Et.type;w.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+mt);let St=Bp(Et);if(St.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(St.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let ne=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,ne),O.bufferData(O.PIXEL_PACK_BUFFER,gt.byteLength,O.STREAM_READ),O.readPixels(L,W,z,H,dt.convert(Vt),dt.convert(Zt),0),O.bindBuffer(O.PIXEL_PACK_BUFFER,null);let Ne=nt!==null?G.get(nt).__webglFramebuffer:null;y.bindFramebuffer(O.FRAMEBUFFER,Ne);let pe=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await g0(O,pe,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,ne),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,gt),O.bindBuffer(O.PIXEL_PACK_BUFFER,null),O.deleteBuffer(ne),O.deleteSync(pe),gt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(w,L=null,W=0){let z=Math.pow(2,-W),H=Math.floor(w.image.width*z),gt=Math.floor(w.image.height*z),bt=L!==null?L.x:0,mt=L!==null?L.y:0;Y.setTexture2D(w,0),O.copyTexSubImage2D(O.TEXTURE_2D,W,0,0,bt,mt,H,gt),y.unbindTexture()},this.copyTextureToTexture=function(w,L,W=null,z=null,H=0,gt=0){let bt,mt,wt,Et,Vt,Zt,St,ne,Ne,pe=w.isCompressedTexture?w.mipmaps[gt]:w.image;if(W!==null)bt=W.max.x-W.min.x,mt=W.max.y-W.min.y,wt=W.isBox3?W.max.z-W.min.z:1,Et=W.min.x,Vt=W.min.y,Zt=W.isBox3?W.min.z:0;else{let Pe=Math.pow(2,-H);bt=Math.floor(pe.width*Pe),mt=Math.floor(pe.height*Pe),w.isDataArrayTexture?wt=pe.depth:w.isData3DTexture?wt=Math.floor(pe.depth*Pe):wt=1,Et=0,Vt=0,Zt=0}z!==null?(St=z.x,ne=z.y,Ne=z.z):(St=0,ne=0,Ne=0);let ce=dt.convert(L.format),on=dt.convert(L.type),vt;L.isData3DTexture?(Y.setTexture3D(L,0),vt=O.TEXTURE_3D):L.isDataArrayTexture||L.isCompressedArrayTexture?(Y.setTexture2DArray(L,0),vt=O.TEXTURE_2D_ARRAY):(Y.setTexture2D(L,0),vt=O.TEXTURE_2D),y.activeTexture(O.TEXTURE0),y.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,L.flipY),y.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,L.premultiplyAlpha),y.pixelStorei(O.UNPACK_ALIGNMENT,L.unpackAlignment);let un=y.getParameter(O.UNPACK_ROW_LENGTH),Qt=y.getParameter(O.UNPACK_IMAGE_HEIGHT),Pn=y.getParameter(O.UNPACK_SKIP_PIXELS),ei=y.getParameter(O.UNPACK_SKIP_ROWS),Bi=y.getParameter(O.UNPACK_SKIP_IMAGES);y.pixelStorei(O.UNPACK_ROW_LENGTH,pe.width),y.pixelStorei(O.UNPACK_IMAGE_HEIGHT,pe.height),y.pixelStorei(O.UNPACK_SKIP_PIXELS,Et),y.pixelStorei(O.UNPACK_SKIP_ROWS,Vt),y.pixelStorei(O.UNPACK_SKIP_IMAGES,Zt);let js=w.isDataArrayTexture||w.isData3DTexture,ae=L.isDataArrayTexture||L.isData3DTexture;if(w.isDepthTexture){let Pe=G.get(w),zi=G.get(L),de=G.get(Pe.__renderTarget),Hi=G.get(zi.__renderTarget);y.bindFramebuffer(O.READ_FRAMEBUFFER,de.__webglFramebuffer),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,Hi.__webglFramebuffer);for(let Ks=0;Ks<wt;Ks++)js&&(O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,G.get(w).__webglTexture,H,Zt+Ks),O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,G.get(L).__webglTexture,gt,Ne+Ks)),O.blitFramebuffer(Et,Vt,bt,mt,St,ne,bt,mt,O.DEPTH_BUFFER_BIT,O.NEAREST);y.bindFramebuffer(O.READ_FRAMEBUFFER,null),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else if(H!==0||w.isRenderTargetTexture||G.has(w)){let Pe=G.get(w),zi=G.get(L);y.bindFramebuffer(O.READ_FRAMEBUFFER,k),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,U);for(let de=0;de<wt;de++)js?O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Pe.__webglTexture,H,Zt+de):O.framebufferTexture2D(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Pe.__webglTexture,H),ae?O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,zi.__webglTexture,gt,Ne+de):O.framebufferTexture2D(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,zi.__webglTexture,gt),H!==0?O.blitFramebuffer(Et,Vt,bt,mt,St,ne,bt,mt,O.COLOR_BUFFER_BIT,O.NEAREST):ae?O.copyTexSubImage3D(vt,gt,St,ne,Ne+de,Et,Vt,bt,mt):O.copyTexSubImage2D(vt,gt,St,ne,Et,Vt,bt,mt);y.bindFramebuffer(O.READ_FRAMEBUFFER,null),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else ae?w.isDataTexture||w.isData3DTexture?O.texSubImage3D(vt,gt,St,ne,Ne,bt,mt,wt,ce,on,pe.data):L.isCompressedArrayTexture?O.compressedTexSubImage3D(vt,gt,St,ne,Ne,bt,mt,wt,ce,pe.data):O.texSubImage3D(vt,gt,St,ne,Ne,bt,mt,wt,ce,on,pe):w.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,gt,St,ne,bt,mt,ce,on,pe.data):w.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,gt,St,ne,pe.width,pe.height,ce,pe.data):O.texSubImage2D(O.TEXTURE_2D,gt,St,ne,bt,mt,ce,on,pe);y.pixelStorei(O.UNPACK_ROW_LENGTH,un),y.pixelStorei(O.UNPACK_IMAGE_HEIGHT,Qt),y.pixelStorei(O.UNPACK_SKIP_PIXELS,Pn),y.pixelStorei(O.UNPACK_SKIP_ROWS,ei),y.pixelStorei(O.UNPACK_SKIP_IMAGES,Bi),gt===0&&L.generateMipmaps&&O.generateMipmap(vt),y.unbindTexture()},this.initRenderTarget=function(w){G.get(w).__webglFramebuffer===void 0&&Y.setupRenderTarget(w)},this.initTexture=function(w){w.isCubeTexture?Y.setTextureCube(w,0):w.isData3DTexture?Y.setTexture3D(w,0):w.isDataArrayTexture||w.isCompressedArrayTexture?Y.setTexture2DArray(w,0):Y.setTexture2D(w,0),y.unbindTexture()},this.resetState=function(){V=0,q=0,nt=null,y.reset(),xt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Zn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=Yt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Yt._getUnpackColorSpace()}};var zR=Object.freeze(["high","low","flat"]),HR=Object.freeze(["lights","shadows","post","particles","marks","zoneOutlines","chalk","camera","capture","footlights"]);function j0(i){return i==="low"?{post:!1,shadows:!1,msaa:0,pixelRatioCap:1,maxPixels:4e6,dust:120,sparks:24,footlights:!1}:{post:!0,shadows:!0,msaa:4,pixelRatioCap:2,maxPixels:85e5,dust:420,sparks:48,footlights:!0}}function K0(i,t,e,{pixelRatioCap:n=2,maxPixels:s=1/0}={}){let r=Math.min(Number(e)>0?Number(e):1,n),o=Math.sqrt(s/Math.max(1,i*t));return Math.max(Math.min(1,r),Math.min(r,o))}function bh(i,t,e,n,s=null){let r=[],o=!1;for(let a of i){let l=t[a.id]??"rest";l==="target"&&(o=!0),r.push(`${a.id}:${l}:${ed(a,l,e).toFixed(2)}`)}return s&&r.push(`B${Object.entries(s.counts??{}).map(([a,l])=>`${a}=${l}/${s.downs?.[a]??0}`).join(",")}`),r.join("|")+(o?`|t${Math.floor(n*20)}`:"")}var J0=Object.freeze([[240,186,92],[112,196,222],[226,118,104],[146,208,126],[196,150,232],[242,150,72],[230,220,140]]);function Q0(i){let t=i.reduce((s,r)=>s+r[0],0)/i.length,e=Math.min(...i.map(s=>s[1])),n=Math.max(...i.map(s=>s[1]));return[t,e+(n-e)*.32]}function tx(i){return Q0(i.floor??i.shape)}function X1(i,t,e,n,s,r,o,{labels:a=!0}={}){let l=n.filter(h=>h.kind==="area"),c=new Map;l.forEach((h,u)=>{let d=(h.floor??h.shape).map(([_,E])=>[_*t,E*e]),[f,g,x]=h.colour??J0[u%J0.length],p=r?.[h.id]==="target",m=()=>{i.beginPath(),d.forEach(([_,E],b)=>b?i.lineTo(_,E):i.moveTo(_,E)),i.closePath()};i.save(),m(),i.fillStyle=`rgba(${f},${g},${x},${p?.3:.17})`,i.fill(),i.lineJoin="round",i.setLineDash([18,9]),i.lineDashOffset=p?-o*60:0,m(),i.strokeStyle="rgba(16,10,5,0.6)",i.lineWidth=7,i.stroke(),m(),i.strokeStyle=`rgba(${f},${g},${x},0.95)`,i.lineWidth=p?4.5:3.2,i.stroke(),i.restore(),c.set(h.id,Q0(d))}),i.save(),i.setLineDash([10,10]),i.lineCap="round";for(let{a:h,b:u}of s.bands??[]){let d=c.get(h),f=c.get(u);!d||!f||(i.beginPath(),i.moveTo(d[0],d[1]+30),i.lineTo(f[0],f[1]+30),i.strokeStyle="rgba(16,10,5,0.45)",i.lineWidth=6,i.stroke(),i.strokeStyle="rgba(255,236,200,0.7)",i.lineWidth=2.6,i.stroke())}i.restore(),a&&l.forEach(h=>{let[u,d]=c.get(h.id);i.save(),i.textAlign="center",i.font='600 30px "Shippori Mincho", "Hiragino Mincho ProN", serif',i.lineWidth=7,i.strokeStyle="rgba(16,10,5,0.78)",i.strokeText(h.name||h.id,u,d),i.fillStyle="rgba(255,240,212,1)",i.fillText(h.name||h.id,u,d);let f=s.counts?.[h.id]??0,g=s.downs?.[h.id]??0,x=[...(h.tags??[]).map(p=>p.toUpperCase()),f?`${f} HERE`:null,g?`${g} DOWN`:null].filter(Boolean);if(x.length){i.font="700 15px system-ui, sans-serif";let p=x.map(_=>i.measureText(_).width+18),m=u-(p.reduce((_,E)=>_+E,0)+6*(x.length-1))/2;x.forEach((_,E)=>{let b=_.endsWith(" HERE");nx(i,m+p[E]/2,d+24,_,15,b?"rgba(20,12,6,0.95)":"rgba(255,236,200,0.95)",b?"rgba(255,190,110,0.95)":"rgba(16,10,5,0.72)"),m+=p[E]+6})}i.restore()})}function ex(i,t=0,e=0){let n=i.name||i.id,s=[...(i.tags??[]).map(g=>g.toUpperCase()),t?`${t} HERE`:null,e?`${e} DOWN`:null].filter(Boolean),r=Ni(8,8).getContext("2d");r.font='600 34px "Shippori Mincho", "Hiragino Mincho ProN", serif';let o=r.measureText(n).width;r.font="700 17px system-ui, sans-serif";let a=s.map(g=>r.measureText(g).width+20),l=a.reduce((g,x)=>g+x,0)+7*Math.max(0,s.length-1),c=Math.ceil(Math.max(o+24,l+12)),h=s.length?84:50,u=Ni(c*2,h*2),d=u.getContext("2d");d.scale(2,2),d.textAlign="center",d.font='600 34px "Shippori Mincho", "Hiragino Mincho ProN", serif',d.lineJoin="round",d.lineWidth=7,d.strokeStyle="rgba(16,10,5,0.82)",d.strokeText(n,c/2,36),d.fillStyle="rgba(255,240,212,1)",d.fillText(n,c/2,36);let f=c/2-l/2;return s.forEach((g,x)=>{let p=g.endsWith(" HERE"),m=g.endsWith(" DOWN");nx(d,f+a[x]/2,64,g,17,p||m?"rgba(20,12,6,0.95)":"rgba(255,236,200,0.95)",p?"rgba(255,190,110,0.95)":m?"rgba(170,160,150,0.9)":"rgba(16,10,5,0.75)"),f+=a[x]+7}),{canvas:u,w:c,h}}function nx(i,t,e,n,s,r,o){i.save(),i.font=`700 ${s}px system-ui, sans-serif`,i.textAlign="center",i.textBaseline="middle";let a=i.measureText(n).width+16,l=s+10;i.setLineDash([]),i.beginPath(),i.roundRect(t-a/2,e-l/2,a,l,l/2),i.fillStyle=o,i.fill(),i.fillStyle=r,i.fillText(n,t,e+1),i.restore()}function Mh(i,t,e,n,s,r,o,a=null,{boardLabels:l=!0}={}){i.clearRect(0,0,t,e),a&&X1(i,t,e,n,a,s,o,{labels:l});for(let c of n){if(a&&c.kind==="area")continue;let h=s[c.id]??"rest",u=ed(c,h,r);if(u<=.01)continue;let d=c.shape.map(([x,p])=>[x*t,p*e]),f=()=>{i.beginPath(),d.forEach(([x,p],m)=>m?i.lineTo(x,p):i.moveTo(x,p)),i.closePath()},g=h==="target";if(i.lineJoin="round",i.setLineDash([14,11]),i.lineDashOffset=g?-o*60:0,f(),i.strokeStyle=`rgba(20,12,6,${.55*u})`,i.lineWidth=6,i.stroke(),f(),i.strokeStyle=g?`rgba(255,150,70,${u})`:`rgba(255,222,170,${.9*u})`,i.lineWidth=g?4:2.4,i.stroke(),i.setLineDash([]),u>=.8&&c.name){let x=d.reduce((m,_)=>m+_[0],0)/d.length,p=Math.min(...d.map(m=>m[1]))-10;i.font='600 30px "Shippori Mincho", "Hiragino Mincho ProN", serif',i.textAlign="center",i.lineWidth=7,i.strokeStyle=`rgba(20,12,6,${.7*u})`,i.strokeText(c.name,x,p),i.fillStyle=`rgba(255,236,200,${u})`,i.fillText(c.name,x,p),c.hint&&(i.font="600 20px sans-serif",i.lineWidth=5,i.strokeStyle=`rgba(20,12,6,${.7*u})`,i.strokeText(c.hint.toUpperCase(),x,p+26),i.fillStyle=`rgba(255,222,170,${.85*u})`,i.fillText(c.hint.toUpperCase(),x,p+26))}}}var Ni=(i,t)=>{let e=document.createElement("canvas");return e.width=i,e.height=t,e};function ix(){let i=Ni(64,64),t=i.getContext("2d"),e=t.createRadialGradient(32,32,0,32,32,32);return e.addColorStop(0,"rgba(255,255,255,1)"),e.addColorStop(.35,"rgba(255,255,255,0.5)"),e.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=e,t.fillRect(0,0,64,64),i}function wh(){let i=Ni(256,256),t=i.getContext("2d");t.translate(128,128),t.lineCap="round";let e=9;for(let[n,s]of[[20,"#1b140c"],[10,"#e6c98d"]]){t.strokeStyle=s,t.lineWidth=n;for(let r=0;r<e;r++){let o=r/e*Math.PI*2+.3,a=120*(.72+.28*(r*7%3/2));t.beginPath(),t.moveTo(Math.cos(o)*46,Math.sin(o)*46),t.lineTo(Math.cos(o)*a,Math.sin(o)*a),t.stroke()}}t.fillStyle="#fff7d6",t.strokeStyle="#1b140c",t.lineWidth=6,t.beginPath();for(let n=0;n<16;n++){let s=n/16*Math.PI*2,r=n%2?18:40;t[n?"lineTo":"moveTo"](Math.cos(s)*r,Math.sin(s)*r)}return t.closePath(),t.fill(),t.stroke(),i}function Sh(){let i=Ni(256,160),t=i.getContext("2d");t.lineCap="round";let e=(n,s)=>{t.strokeStyle=s,t.lineWidth=n;for(let[r,o]of[[-1,-1],[1,-1],[-1,1],[1,1]]){let a=128+r*100,l=80+o*56;t.beginPath(),t.moveTo(a-r*34,l),t.lineTo(a,l),t.lineTo(a,l-o*30),t.stroke()}};return e(13,"rgba(20,12,6,0.7)"),e(7,"#e6c98d"),t.setLineDash([2,12]),t.strokeStyle="rgba(255,226,170,0.75)",t.lineWidth=5,t.beginPath(),t.ellipse(128,80,66,36,0,0,Math.PI*2),t.stroke(),i}function sx(){let i=Ni(512,256),t=i.getContext("2d");return t.strokeStyle="#fff",t.shadowColor="rgba(255,255,255,0.95)",t.shadowBlur=22,t.lineWidth=22,t.beginPath(),t.ellipse(256,128,220,90,0,0,Math.PI*2),t.stroke(),t.shadowBlur=0,t.lineWidth=8,t.beginPath(),t.ellipse(256,128,220,90,0,0,Math.PI*2),t.stroke(),i}function Th(i=["#e8493c"],t=1){let n=Math.max(64,Math.round(256*t)),s=Ni(256,n),r=s.getContext("2d");r.lineJoin="round";let o=h=>{r.beginPath(),h.forEach(([u,d],f)=>f?r.lineTo(u,d):r.moveTo(u,d)),r.closePath(),r.lineWidth=6,r.strokeStyle="rgba(0,0,0,0.85)",r.stroke(),r.fillStyle=i[0]??"#e8493c",r.fill()},a=17,l=24,c=4;return o([[256/2-a,c],[256/2+a,c],[256/2,c+l]]),o([[256/2-a,n-c],[256/2+a,n-c],[256/2,n-c-l]]),o([[c,n/2-a],[c,n/2+a],[c+l,n/2]]),o([[256-c,n/2-a],[256-c,n/2+a],[256-c-l,n/2]]),i.slice(0,6).forEach((h,u)=>{r.beginPath(),r.arc(242-u*22,16,8,0,Math.PI*2),r.fillStyle=h,r.fill(),r.lineWidth=4,r.strokeStyle="rgba(0,0,0,0.85)",r.stroke()}),s}function rx(i,t,e=12){let n=Ni(Math.round(i+e*2),Math.round(t+e*2)),s=n.getContext("2d"),r=10,o=e-3,a=e-3,l=i+6,c=t+6,h=()=>{s.beginPath(),s.moveTo(o+r,a),s.arcTo(o+l,a,o+l,a+c,r),s.arcTo(o+l,a+c,o,a+c,r),s.arcTo(o,a+c,o,a,r),s.arcTo(o,a,o+l,a,r),s.closePath()};return s.shadowColor="rgba(255,255,255,0.95)",s.shadowBlur=e*.9,s.strokeStyle="#fff",s.lineWidth=5,h(),s.stroke(),s.shadowBlur=0,s.lineWidth=3,h(),s.stroke(),n}function Eh(i){let t=Ni(512,96),e=t.getContext("2d");return e.font='700 40px "Helvetica Neue", Arial, sans-serif',e.textAlign="center",e.textBaseline="middle",e.lineWidth=9,e.strokeStyle="rgba(20,12,6,0.8)",e.strokeText(i.toUpperCase(),256,48),e.fillStyle="#ffe9c4",e.fillText(i.toUpperCase(),256,48),t}var Hs=class{constructor(){this.byUrl=new Map}loadImage=t=>t?(this.byUrl.has(t)||this.byUrl.set(t,new Promise(e=>{let n=new Image;n.crossOrigin="anonymous",n.onload=()=>e(n),n.onerror=()=>e(null),n.src=t})),this.byUrl.get(t)):Promise.resolve(null)};var us=Math.PI/180,Ah=class i{constructor(t=null){this.items=new Set,this.parent=t}add(t){return t&&(this.items.add(t),this.parent?.add(t),t)}mesh(t){let e=n=>{n&&!(this.parent&&this.parent.items.has(n)&&!this.items.has(n))&&this.add(n)};e(t.geometry);for(let n of[].concat(t.material)){e(n);for(let s of Object.values(n))s?.isTexture&&e(s)}return t}scoped(){return new i(this)}release(t){t&&(t.dispose?.(),this.#t(t))}#t(t){this.items.delete(t),this.parent?.#t(t)}disposeScope(){for(let t of[...this.items])this.release(t)}disposeAll(){for(let t of this.items)t.dispose?.();this.items.clear()}get size(){return this.items.size}};function Ke(i,{anisotropy:t=8,srgb:e=!0}={}){let n=new ha(i);return e&&(n.colorSpace=Ce),n.anisotropy=t,n}var ox=()=>Ke(ix(),{anisotropy:1}),ax=()=>Ke(wh());function Ch(i,t,e){let{f:n,cx:s,cy:r,floorY:o}=t.cam,a=20,l=3e4;i.position.set(0,o-r,n),i.projectionMatrix.makePerspective(-a*(s-e.ox)/n,a*(e.ox+e.visW-s)/n,a*(r-e.oy)/n,-a*(e.oy+e.visH-r)/n,a,l),i.projectionMatrixInverse.copy(i.projectionMatrix).invert(),i.updateProjectionMatrix=()=>{},i.updateMatrixWorld(!0)}function Rh(i,t,e,n){let{f:s,cx:r,cy:o,floorY:a}=i.cam;return new D((t-r)*(s-n)/s,a-o-(e-o)*(s-n)/s,n)}var Ph=i=>i.cam.f/(Hn.H/2);function La(i,t,e=0,n=null,s=null){let[r,o]=i.size,a=r*i.map.s,l=o*i.map.s,{x0:c,y0:h,x1:u,y1:d}=n??{x0:0,y0:0,x1:1,y1:1},f=-ii+e,g=(i.cam.f-f)/i.cam.f,x=new Ut(s??new Ie(1,1),t);return x.position.copy(Rh(i,i.map.ox+a*(c+u)/2,i.map.oy+l*(h+d)/2,f)),x.scale.set(a*(u-c)*g,l*(d-h)*g,1),x}var $1=32e5,kh=class{constructor({scene:t,rig:e,tracker:n,softDot:s,settings:r}){this.description=t,this.rig=e,this.T=n,this.softDot=s,this.settings=r,this.group=new Ge,this.lights=[],this.lanterns=[],this.foot=[],this.dust=null}async build(t){let{rig:e,description:n,T:s}=this,r=s.add(new Ve(t));r.colorSpace=Ce,r.anisotropy=8,r.generateMipmaps=!0,r.minFilter=pi,r.needsUpdate=!0,this.paintTex=r;let[o,a]=e.size,l=o*e.map.s,c=a*e.map.s,h=s.mesh(new Ut(new Ie(1,1),new we({map:r,color:14474460})));h.position.copy(Rh(e,e.map.ox+l/2,e.map.oy+c/2,-ii)),h.scale.set(l*(e.cam.f+ii)/e.cam.f,c*(e.cam.f+ii)/e.cam.f,1),this.group.add(h),this.backdrop=h;for(let d of n.occluders){let f=e.standing([d.x,d.base]);if(!f)continue;let g=d.poly.map(A=>A[0]),x=d.poly.map(A=>A[1]),p=[Math.min(...g),Math.min(...x),Math.max(...g),Math.max(...x)],m=[],_=[],E=[];for(let[A,v]of d.poly){let M=Rh(e,e.map.x(A),e.map.y(v),f.Z);m.push(M.x,M.y,M.z),_.push(A,1-v),E.push((A-p[0])/(p[2]-p[0]||1),1-(v-p[1])/(p[3]-p[1]||1))}let b=new be;b.setAttribute("position",new Jt(m,3)),b.setAttribute("uv",new Jt(_,2)),b.setAttribute("uv1",new Jt(E,2)),b.setIndex(d.poly.length===4?[0,2,1,0,3,2]:Z1(d.poly.length));let T=this.#t(d.poly,p),S=s.mesh(new Ut(b,new we({map:r,color:14474460,side:vn,...T?{alphaMap:T,transparent:!0}:{}})));S.renderOrder=3,this.group.add(S)}let u=s.mesh(new Ut(new Ie(24e3,24e3),new Gr({opacity:.62,depthWrite:!1})));return u.rotation.x=-Math.PI/2,u.receiveShadow=!0,u.renderOrder=2,this.group.add(u),this.floor=u,this.ambient=new va(16765600,n.ambient),this.group.add(this.ambient),n.lights.forEach((d,f)=>this.#e(d,f)),this.#n(),this.#i(),this}#t(t,[e,n,s,r]){let{rig:o,T:a}=this,[l,c]=o.size,h=(s-e)*l*o.map.s,u=(r-n)*c*o.map.s;if(!(h>0&&u>0))return null;let d=256,f=Math.max(32,Math.min(512,Math.round(d*u/h))),g=Math.min(fl,u*pl)/u*f,x=ml(t.map(([_,E])=>[(_-e)/(s-e)*d,(E-n)/(r-n)*f]),d,f,g),p=new Uint8Array(d*f*4);for(let _=0;_<f;_++)for(let E=0;E<d;E++){let b=x[_*d+E],T=((f-1-_)*d+E)*4;p[T]=p[T+1]=p[T+2]=p[T+3]=b}let m=a.add(new Br(p,d,f,bn));return m.magFilter=Be,m.minFilter=Be,m.channel=1,m.needsUpdate=!0,m}#e(t,e){let{rig:n,T:s}=this,r=n.standing([t.at[0],t.below]);if(!r)return;let{cx:o,cy:a,f:l,floorY:c}=n.cam,h=l/(l-r.Z),u=o+(n.map.x(t.at[0])-o)/h,d=a+(n.map.y(t.at[1])-a)/h,f=new D(u-o,c-d,r.Z),g=new Ct(t.colour[0]/255,t.colour[1]/255,t.colour[2]/255),x=new Xr(g,0,0,1.2,.9,2);if(x.position.copy(f),x.target.position.set(f.x,0,f.z),x.userData={base:t.intensity*$1,flicker:t.flicker,hz:t.flickerHz,seed:e+1},t.shadow&&this.settings.shadows&&(x.castShadow=!0,x.shadow.mapSize.set(1024,1024),x.shadow.bias=-4e-4,x.shadow.radius=5,x.shadow.camera.near=30,x.shadow.camera.far=3e3),this.group.add(x,x.target),this.lights.push(x),this.lanterns.push({pos:f,colour:g}),t.pool){let p=s.mesh(new Ut(new da(t.pool*.62,48),new we({map:this.softDot,color:g,transparent:!0,opacity:.38,blending:pn,depthWrite:!1})));p.rotation.x=-Math.PI/2,p.position.set(f.x,1,f.z),p.renderOrder=1,this.group.add(p)}}#n(){let{T:t}=this;for(let e of[-1,1]){let n=new Xr(16761466,0,0,.66,.75,2);n.position.set(e*640,26,360),n.target.position.set(e*140,340,-420),n.userData={base:23e5},n.visible=!1,this.settings.shadows&&(n.castShadow=!0,n.shadow.mapSize.set(1024,1024),n.shadow.bias=-5e-4,n.shadow.radius=4,n.shadow.camera.near=40,n.shadow.camera.far=2800),this.group.add(n,n.target),this.foot.push(n)}this.wall=t.mesh(new Ut(new Ie(7e3,2600),new Gr({opacity:.72,depthWrite:!1}))),this.wall.position.set(0,1300,-2300),this.wall.receiveShadow=!0,this.wall.renderOrder=2,this.wall.visible=!1,this.group.add(this.wall)}setFootlights(t){t=!!t&&this.settings.footlights;for(let e of this.foot)e.visible=t,e.intensity=t?e.userData.base:0;this.wall.visible=t,this.ambient.intensity=t?this.description.ambient*.75:this.description.ambient,this.footlightsOn=t}#i(){let t=this.settings.dust;if(!t)return;let e=new Float32Array(t*3),n=7,s=()=>(n=n*16807%2147483647,n/2147483647);for(let a=0;a<t;a++)e[a*3]=(s()-.5)*2600,e[a*3+1]=40+s()*820,e[a*3+2]=-520+s()*760;let r=this.T.add(new be);r.setAttribute("position",new Ue(e.slice(),3)),r.setAttribute("color",new Ue(new Float32Array(t*3),3));let o=this.T.add(new ts({size:8*Ph(this.rig),map:this.softDot,vertexColors:!0,transparent:!0,opacity:.9,blending:pn,depthWrite:!1,sizeAttenuation:!0}));this.dust=new Ls(r,o),this.dust.frustumCulled=!1,this.dustBase=e,this.group.add(this.dust)}update(t){for(let r of this.lights){let o=r.userData;r.intensity=o.base*(1+o.flicker*Po(t*o.hz,o.seed))}if(!this.dust)return;let e=this.dust.geometry.attributes.position,n=this.dust.geometry.attributes.color,s=this.dustBase;for(let r=0;r<e.count;r++){let o=s[r*3]+Math.sin(t*.21+r)*22,a=s[r*3+1]+t*(4+r%7)%120,l=s[r*3+2];e.array[r*3]=o,e.array[r*3+1]=a,e.array[r*3+2]=l;let c=0,h=0,u=0;for(let d of this.lanterns){let f=(o-d.pos.x)**2+(a-d.pos.y)**2+(l-d.pos.z)**2,g=Math.max(0,1-Math.sqrt(f)/900);c+=d.colour.r*g*g,h+=d.colour.g*g*g,u+=d.colour.b*g*g}n.array[r*3]=Math.min(1,c),n.array[r*3+1]=Math.min(1,h),n.array[r*3+2]=Math.min(1,u)}e.needsUpdate=!0,n.needsUpdate=!0}};function Z1(i){let t=[];for(let e=1;e<i-1;e++)t.push(0,e+1,e);return t}var Da=new D;function Fn(i,t,e,n,s,r){let o=2*Math.PI*s/4,a=Math.max(r-2*s,0),l=Math.PI/4;Da.copy(t),Da[n]=0,Da.normalize();let c=.5*o/(o+a),h=1-Da.angleTo(i)/l;return Math.sign(Da[e])===1?h*c:a/(o+a)+c+c*(1-h)}var Ih=class i extends cn{constructor(t=1,e=1,n=1,s=2,r=.1){let o=s*2+1;if(r=Math.min(t/2,e/2,n/2,r),super(1,1,1,o,o,o),this.type="RoundedBoxGeometry",this.parameters={width:t,height:e,depth:n,segments:s,radius:r},o===1)return;let a=this.toNonIndexed();this.index=null,this.attributes.position=a.attributes.position,this.attributes.normal=a.attributes.normal,this.attributes.uv=a.attributes.uv;let l=new D,c=new D,h=new D(t,e,n).divideScalar(2).subScalar(r),u=this.attributes.position.array,d=this.attributes.normal.array,f=this.attributes.uv.array,g=u.length/6,x=new D,p=.5/o;for(let m=0,_=0;m<u.length;m+=3,_+=2)switch(l.fromArray(u,m),c.copy(l),c.x-=Math.sign(c.x)*p,c.y-=Math.sign(c.y)*p,c.z-=Math.sign(c.z)*p,c.normalize(),u[m+0]=h.x*Math.sign(l.x)+c.x*r,u[m+1]=h.y*Math.sign(l.y)+c.y*r,u[m+2]=h.z*Math.sign(l.z)+c.z*r,d[m+0]=c.x,d[m+1]=c.y,d[m+2]=c.z,Math.floor(m/g)){case 0:x.set(1,0,0),f[_+0]=Fn(x,c,"z","y",r,n),f[_+1]=1-Fn(x,c,"y","z",r,e);break;case 1:x.set(-1,0,0),f[_+0]=1-Fn(x,c,"z","y",r,n),f[_+1]=1-Fn(x,c,"y","z",r,e);break;case 2:x.set(0,1,0),f[_+0]=1-Fn(x,c,"x","z",r,t),f[_+1]=Fn(x,c,"z","x",r,n);break;case 3:x.set(0,-1,0),f[_+0]=1-Fn(x,c,"x","z",r,t),f[_+1]=1-Fn(x,c,"z","x",r,n);break;case 4:x.set(0,0,1),f[_+0]=1-Fn(x,c,"x","y",r,t),f[_+1]=1-Fn(x,c,"y","x",r,e);break;case 5:x.set(0,0,-1),f[_+0]=Fn(x,c,"x","y",r,t),f[_+1]=1-Fn(x,c,"y","x",r,e);break}}static fromJSON(t){return new i(t.width,t.height,t.depth,t.segments,t.radius)}};var lx=typeof Intl<"u"&&Intl.Segmenter?new Intl.Segmenter(void 0,{granularity:"grapheme"}):null,q1=i=>lx?[...lx.segment(i)].map(t=>t.segment):[...i];function Y1(i){let t=String(i??"").replace(/\s+/g," ").trim(),e=q1(t);return e.length<=16?t:`${e.slice(0,15).join("")}\u2026`}function ds(i){if(!Array.isArray(i))return[];let t=[];for(let e of i){let n=Y1(typeof e=="string"||typeof e=="number"?e:e?.label);if(n&&!t.includes(n)&&t.push(n),t.length===4)break}return t}var cx=(i,t)=>JSON.stringify(ds(i))===JSON.stringify(ds(t));var j1=360;function K1(i,t){let e=ds(t?.badges);if(!e.length||!i?.getContext)return i;let n=i.getContext("2d"),s=i.width/j1,r=21*s,o=9*s,a=6*s,l=14*s;n.save(),n.font=`700 ${r}px sans-serif`,n.textBaseline="middle";let c=l;for(let h of e){let u=Math.min(i.width*.6,n.measureText(h).width+o*2),d=r+o;n.fillStyle="rgba(24,16,8,0.88)",J1(n,l,c,u,d,d/2),n.fill(),n.strokeStyle="rgba(255,226,160,0.85)",n.lineWidth=Math.max(1,1.5*s),n.stroke(),n.fillStyle="#fff4d6",n.fillText(h,l+o,c+d/2+s,u-o*2),c+=d+a}return n.restore(),i}function J1(i,t,e,n,s,r){i.beginPath(),i.moveTo(t+r,e),i.arcTo(t+n,e,t+n,e+s,r),i.arcTo(t+n,e+s,t,e+s,r),i.arcTo(t,e+s,t,e,r),i.arcTo(t,e,t+n,e,r),i.closePath()}async function eo(i,t,e){return K1(await i.face(t,e),t)}var Oa=(i,t,e)=>Math.max(t,Math.min(e,i)),Na=Object.freeze({floor:.4,gain:1.25,tint:.5,lift:0});function ux(i,t,e){let n=new Float32Array(t*e*3);for(let s=0;s<t*e;s++)n[s*3]=i[s*4]/255,n[s*3+1]=i[s*4+1]/255,n[s*3+2]=i[s*4+2]/255;return{w:t,h:e,cells:n}}function hx(i,t,e){let n=Oa(t,0,1)*(i.w-1),s=Oa(e,0,1)*(i.h-1),r=Math.floor(n),o=Math.floor(s),a=Math.min(i.w-1,r+1),l=Math.min(i.h-1,o+1),c=n-r,h=s-o,u=[0,0,0];for(let d=0;d<3;d++){let f=(p,m)=>i.cells[(m*i.w+p)*3+d],g=f(r,o)*(1-c)+f(a,o)*c,x=f(r,l)*(1-c)+f(a,l)*c;u[d]=g*(1-h)+x*h}return u}function Lh(i,t,e,{strength:n=1}={}){if(!i||!(n>0))return[1,1,1];let s=hx(i,t,e),r=hx(i,t,e-.09),o=[0,1,2].map(d=>(s[d]+r[d])/2),a=.2126*o[0]+.7152*o[1]+.0722*o[2],l=Oa(Na.floor+Na.gain*a+Na.lift,Na.floor,1),c=Math.max(o[0],o[1],o[2],.001),h=Na.tint*Oa(c/.12,0,1);return o.map(d=>l*(1-h*(1-d/c))).map(d=>Oa(1+n*(d-1),.3,1))}function Dh(i,t,e=.14){return i?i.map((n,s)=>n+(t[s]-n)*e):t.slice()}var Uf=1.5,Nh=class{constructor(t,e,n,s){this.id=t.id,this.person=t,this.skin=e,this.ctx=n,this.s=s,this.w=e.size.w,this.h=e.size.h,this.stickLen=(e.stick?.length??134)*s,this.root=new Ge,this.root.userData.cardId=t.id,this.emote=null,this.ghostTexture=null,this.scope=n.tracker.scoped?.()??null}get T(){return this.scope??this.ctx.tracker}#t(t,e){return this.ctx.shared?this.ctx.shared(t,e):this.T.add(e())}async build(){let{skin:t,ctx:e,person:n}=this,s=this.T,r=t.materials??{},o=this.#t(`brass:${r.body?.color}:${r.body?.metalness}:${r.body?.roughness}`,()=>new nn({color:r.body?.color??15196109,metalness:r.body?.metalness??0,roughness:r.body?.roughness??.9})),a=this.#e(),[l,c]=await Promise.all([eo(t,n,a),t.back(n,a)]);this.leanG=new Ge,this.hinge=new Ge,this.yawG=new Ge,this.yawG.rotation.order="YXZ",this.root.add(this.leanG),this.leanG.add(this.hinge),this.hinge.add(this.yawG);let h=this.w,u=this.h,d=s.mesh(new Ut(this.#t(`body:${h}:${u}:${t.thickness}`,()=>new Ih(h-3,u-3,t.thickness,3,6)),o));d.position.y=u/2,d.castShadow=!0;let f=s.add(Ke(l));this.faceTex=f,this.ghostTexture=f;let g=()=>this.#t(`plane:${h}:${u}`,()=>new Ie(h,u)),x=s.mesh(new Ut(g(),new Vr({map:f,roughness:r.face?.roughness??.5,metalness:r.face?.metalness??.1,clearcoat:r.face?.clearcoat??.6,clearcoatRoughness:.22,transparent:!0,alphaTest:.5,envMapIntensity:.7})));x.position.set(0,u/2,t.thickness/2+.2),x.receiveShadow=!0,this.faceMaterial=x.material,this.backTex=s.add(Ke(c));let p=s.mesh(new Ut(g(),new nn({map:this.backTex,roughness:r.back?.roughness??.62,metalness:r.back?.metalness??.35,transparent:!0,alphaTest:.5})));p.position.set(0,u/2,-(t.thickness/2+.2)),p.rotation.y=Math.PI;let m=s.mesh(new Ut(this.#t(`foot:${h}`,()=>new cn(h*.5,12,54)),o));if(m.position.set(0,-6,0),m.castShadow=!0,this.card=new Ge,this.card.add(d,x,p,m),n.colour){let _=s.mesh(new Ut(new cn(h*.5-8,3,8),new nn({color:new Ct(n.colour),roughness:.35,metalness:.1})));_.position.set(0,-2.5,24),this.card.add(_)}return this.card.scale.setScalar(this.s),this.yawG.add(this.card),this.#n(o),this.blob=s.mesh(new Ut(this.#t("plane:1:1",()=>new Ie(1,1)),new we({map:e.softDot,color:0,transparent:!0,opacity:.55,depthWrite:!1}))),this.blob.rotation.x=-Math.PI/2,this.blob.renderOrder=2,this.ring=s.mesh(new Ut(this.#t("plane:1:1",()=>new Ie(1,1)),new we({map:e.ringTexture(),color:16766042,transparent:!0,opacity:.9,depthWrite:!1,blending:pn}))),this.ring.rotation.x=-Math.PI/2,this.ring.renderOrder=3,this.ring.visible=!1,this.halo=s.mesh(new Ut(this.#t(`plane:${h+24}:${u+24}`,()=>new Ie(h+24,u+24)),new we({map:e.haloTexture(h,u),color:16766042,transparent:!0,depthWrite:!1,blending:pn}))),this.halo.position.set(0,u/2,-(t.thickness/2+1.5)),this.halo.visible=!1,this.card.add(this.halo),this.reticleKey="",this.reticleAspect=u*1.22/(h*1.3),this.reticle=new Yn(s.add(new Nn({map:e.reticleTexture(["#e8493c"],this.reticleAspect),depthWrite:!1,transparent:!0}))),this.reticle.renderOrder=48,this.reticle.visible=!1,this.root.traverse(_=>{_.userData.cardId=n.id}),this.pickables=[d,x,p,m],this}#e(){return{loadImage:this.ctx.images.loadImage,titleBlock:this.ctx.titleBlock}}async refresh(t){this.person={...this.person,...t};let e=this.#e(),[n,s]=await Promise.all([eo(this.skin,this.person,e),this.skin.back(this.person,e)]);!this.faceTex||!this.backTex||(this.faceTex.image=n,this.faceTex.needsUpdate=!0,this.backTex.image=s,this.backTex.needsUpdate=!0)}#n(t){let{skin:e}=this,n=this.T,s=this.s,r=this.stickLen,o=18*s,a=new Ct(this.person.colour??"#e8e0c8"),l=e.stick?.wood??8409389,c=this.#t(`lacquer:${l}`,()=>new Vr({color:l,roughness:.3,clearcoat:1,clearcoatRoughness:.12,emissive:new Ct(l).multiplyScalar(.45),emissiveIntensity:.9})),h=this.#t(`metal:${e.stick?.collar}`,()=>new nn({color:e.stick?.collar??12096079,metalness:1,roughness:.34})),u=`${s.toFixed(4)}:${r.toFixed(2)}`;this.rod=new Ge;let d=n.mesh(new Ut(this.#t(`grip:${u}`,()=>new fi(8.5*s,6.4*s,r-o,24)),c));d.position.y=(r-o)/2;let f=n.mesh(new Ut(this.#t(`end:${u}`,()=>new pa(6.4*s,18,12)),c)),g=n.mesh(new Ut(this.#t(`collar:${u}`,()=>new fi(12.5*s,10*s,o,28)),h));g.position.y=r-o/2;let x=n.mesh(new Ut(this.#t(`lip:${u}`,()=>new Hr(12*s,2.2*s,8,28)),h));x.rotation.x=Math.PI/2,x.position.y=r-o;let p=n.mesh(new Ut(this.#t("hand",()=>new Hr(21,3.6,10,36)),new nn({color:a,emissive:a,emissiveIntensity:1.6,roughness:.4})));p.rotation.x=Math.PI/2,p.position.y=8;for(let m of[d,f,g,x])m.castShadow=!0;this.rod.add(d,f,g,x,p),this.rod.visible=!1,this.leanG.add(this.rod)}pose(t){let e=t.grip,n=t.grow??1,s=this.s*n;this.root.position.set(t.x,t.lift,t.z);let r=1-.45*e;this.leanG.rotation.z=-t.lean*r*us,this.hinge.position.y=this.stickLen*e,this.hinge.rotation.z=-t.lean*(1-r)*us,this.rod.visible=e>.02,this.rod.scale.set(1,Math.max(e,.001),1),this.yawG.rotation.set(t.pitch*us,t.yaw*us,0),this.card.scale.set(s,s*(t.down?1:t.breathe)*t.squash,s),this.grown=n;let o=1-.45*(t.down??0),a=this.ctx.lightAt?.(t.x,t.z);if(a&&(this.light=Dh(this.light,a)),this.faceMaterial){let l=this.light??[1,1,1];this.faceMaterial.color.setRGB(o*l[0]**Uf,o*l[1]**Uf,o*l[2]**Uf)}if(this.blob.position.set(t.x,.6,t.z),t.selected)this.blob.material.color.setHex(16751174),this.blob.material.blending=pn,this.blob.scale.set(this.w*s*1.5,120*n,1),this.blob.material.opacity=.95;else if(t.speaking){let l=1+.06*Math.sin((t.breathe-1)*400);this.blob.material.color.setHex(16773320),this.blob.material.blending=pn,this.blob.scale.set(this.w*s*1.9*l,170*n*l,1),this.blob.material.opacity=.8}else this.blob.material.color.setHex(0),this.blob.material.blending=os,this.blob.scale.set(this.w*s*(.95+.5*e),(74+46*e)*n,1),this.blob.material.opacity=.62-.26*e;this.#i(t,n,s),this.#r(t)}#i(t,e,n){this.ring.visible=this.halo.visible=t.controlled===!0,this.ring.visible&&(this.ring.position.set(t.x,.9,t.z),this.ring.scale.set(this.w*n*1.75,190*e,1));let s=Array.isArray(t.targeted)&&t.targeted.length?t.targeted:null;if(this.reticle.visible=!!s,!s)return;let r=s.join("|");r!==this.reticleKey&&(this.reticle.material.map=this.ctx.reticleTexture(s,this.reticleAspect),this.reticleKey=r);let o=1+.04*Math.sin((t.breathe-1)*400);this.reticle.position.set(t.x,t.lift+this.stickLen*t.grip+this.h*n/2,t.z+30),this.reticle.scale.set(this.w*n*1.3*o,this.h*n*1.22*o,1)}async setEmote(t){if(this.emote&&this.#s(),this.wanted=t??null,!t)return;let e=await this.ctx.emoteTexture(t);if(!e||this.wanted!==t||this.emote||this.gone)return;let n=new Yn(this.T.add(new Nn({map:e,depthTest:!1,transparent:!0})));n.renderOrder=50,n.center.set(.5,1-dr),this.emote={id:t,sprite:n},this.ctx.scene.add(n)}#r(t){let e=t.emote?.id??null;if(e&&e!==(this.wanted??null)&&this.setEmote(e).catch(()=>{}),!this.emote)return;let n=t.emote,s=this.emote.sprite;if(!n||n.id!==this.emote.id){s.visible=!1;return}s.visible=n.opacity>.01,s.material.opacity=n.opacity;let r=t.grow??1,o=96*n.pop*r,a=.96*r;s.position.set(t.x+74*this.s*r+(n.x??0)*a,t.lift+this.stickLen*t.grip+this.h*this.s*r*t.breathe+36*r-(n.y??0)*a-(dr-.5)*o,t.z+30),s.scale.set(o,o,1),s.material.rotation=-(n.r??0)*us}#s(){let{sprite:t}=this.emote;t.parent?.remove(t),this.T.release(t.material),this.emote=null}dispose(){this.gone=!0,this.root.parent?.remove(this.root),this.blob?.parent?.remove(this.blob),this.ring?.parent?.remove(this.ring),this.reticle?.parent?.remove(this.reticle),this.emote&&this.#s(),this.faceTex=this.backTex=null,this.scope?.disposeScope()}};var dx=.2,fx=.42,px=.8,Q1=3,Oh=class{constructor({scene:t,rig:e,tracker:n,softDot:s,settings:r,cardHeight:o}){this.T=n,this.cardHeight=o;let a=n.add(ax());this.impacts=[];for(let c=0;c<3;c++){let h=new Yn(n.add(new Nn({map:a,depthTest:!1,transparent:!0,opacity:0})));h.renderOrder=60,h.scale.set(180,180,1),t.add(h),this.impacts.push(h)}this.flash=new ya(16769704,0,1100,2),t.add(this.flash);let l=r.sparks;if(this.sparkCount=l,l){let c=n.add(new be);c.setAttribute("position",new Ue(new Float32Array(l*3),3)),this.sparks=new Ls(c,n.add(new ts({size:12*Ph(e),map:s,color:16767370,transparent:!0,opacity:0,blending:pn,depthWrite:!1}))),this.sparks.frustumCulled=!1,this.dir=Array.from({length:l},(h,u)=>{let d=u/l*Math.PI*2+u%5*.37,f=260+u*53%340;return[Math.cos(d)*f,Math.sin(d)*f*.8+120,u*31%100-50]}),t.add(this.sparks)}this.flashTimes=[],this.calm=!1}update(t,e){for(let r of this.impacts)r.material.opacity=0;this.flash.intensity=0,this.sparks&&(this.sparks.material.opacity=0);let n=0,s=this.cardHeight*.5+60;for(let r of t){let o=e-r.t;if(!(o<0||o>px)){if(o<fx&&n<this.impacts.length){let a=this.impacts[n++],l=o/fx;a.position.set(r.x,s+10,r.Z+90),a.scale.setScalar(120+150*Math.sqrt(l)),a.material.opacity=1-l*l,a.material.rotation=.2*l}if(o<dx&&!this.calm&&this.#t(r.t)&&(this.flash.position.set(r.x,s,r.Z+300),this.flash.intensity=55e4*(1-o/dx)**2),this.sparks&&!this.calm&&r===t[t.length-1]){let a=this.sparks.geometry.attributes.position;this.dir.forEach((l,c)=>{a.array[c*3]=r.x+l[0]*o,a.array[c*3+1]=Math.max(2,s+l[1]*o-900*o*o),a.array[c*3+2]=r.Z+90+l[2]*o}),a.needsUpdate=!0,this.sparks.material.opacity=Math.max(0,1-o/px)}}}}#t(t){return this.flashTimes.includes(t)?!0:(this.flashTimes=this.flashTimes.filter(e=>t-e<1),this.flashTimes.length>=Q1?!1:(this.flashTimes.push(t),!0))}};var Fh=class{constructor({scene:t,rig:e,zones:n,tracker:s}){this.zones=n,this.rig=e;let[r,o]=e.size;this.cw=Math.min(2048,r),this.ch=Math.round(this.cw*o/r),this.canvas=document.createElement("canvas"),this.canvas.width=this.cw,this.canvas.height=this.ch,this.ctx=this.canvas.getContext("2d"),this.tex=s.add(Ke(this.canvas,{anisotropy:4}));let a=s.mesh(La(e,new we({map:this.tex,transparent:!0,depthWrite:!1}),20));a.renderOrder=3,t.add(a),this.mesh=a,this.key="",a.visible=n.length>0}update(t,e,n,s=null){if(!this.zones.length)return;let r=bh(this.zones,t,e,n,s);r!==this.key&&(this.key=r,Mh(this.ctx,this.cw,this.ch,this.zones,t,e,n,s,{boardLabels:!1}),this.tex.needsUpdate=!0)}},Uh=class{constructor({scene:t,rig:e,zones:n,tracker:s,cardHeight:r=300}){this.T=s,this.scene=t,this.rig=e,this.cardHeight=r,this.areas=n.filter(o=>o.kind==="area"),this.labels=new Map}update(t){for(let e of this.areas){let n=this.labels.get(e.id);if(!t){n&&(n.sprite.visible=!1);continue}let s=t.counts?.[e.id]??0,r=t.downs?.[e.id]??0;(!n||n.n!==s||n.d!==r)&&(n=this.#t(e,s,r,n)),n.sprite.visible=!!n.at}}#t(t,e,n,s){let{canvas:r,w:o,h:a}=ex(t,e,n),l=this.T.add(Ke(r,{anisotropy:4}));if(s)this.T.release(s.sprite.material.map),s.sprite.material.map=l,s.sprite.material.needsUpdate=!0;else{let c=new Yn(this.T.add(new Nn({map:l,depthTest:!1,transparent:!0})));c.renderOrder=45,this.scene.add(c),s={sprite:c,at:this.rig.standing(tx(t))},this.labels.set(t.id,s)}if(s.n=e,s.d=n,s.at){let{f:c}=this.rig.cam,h=c/(c-s.at.Z),u=1.45/Math.sqrt(Math.max(.15,h));s.sprite.scale.set(o*u,a*u,1),s.sprite.position.set(s.at.X,this.cardHeight*al(this.rig.cam,s.at.Z)*1.08+a*u/2,s.at.Z)}return s}},Bh=class{constructor({scene:t,tracker:e,softDot:n}){this.T=e,this.scene=t,this.pool=[];let s=e.add(tT());for(let r=0;r<6;r++){let o=e.mesh(new Ut(new Ie(1,1),new we({map:s,transparent:!0,opacity:0,depthWrite:!1})));o.rotation.x=-Math.PI/2,o.renderOrder=4,o.visible=!1,t.add(o),this.pool.push(o)}this.ghost=e.mesh(new Ut(new Ie(1,1),new we({transparent:!0,opacity:0,depthWrite:!1,side:vn}))),this.ghost.visible=!1,this.ghost.renderOrder=5,t.add(this.ghost),this.label=null,this.softDot=n,this.labelText=""}update(t,e,n){this.pool.forEach(s=>{s.visible=!1}),this.ghost.visible=!1,this.label&&(this.label.visible=!1),t.slice(0,this.pool.length).forEach((s,r)=>{let o=this.pool[r],a=s.target?1+.06*Math.sin(n*7):1;o.visible=!0,o.position.set(s.X,1.2,s.Z),o.scale.set((s.target?190:150)*a,(s.target?120:96)*a,1),o.material.opacity=Math.min(1,s.alpha)*(s.target?1:.8),s.target&&this.#t(s,e,n)})}#t(t,e,n){let s=e.get(t.for);if(!s)return;let r=this.ghost;r.material.map!==s.ghostTexture&&(r.material.map=s.ghostTexture,r.material.needsUpdate=!0);let o=t.pose;r.visible=!0,r.material.opacity=.32+.06*Math.sin(n*6),r.scale.set(s.w*s.s,s.h*s.s,1),r.position.set(t.X,o.lift+s.h*s.s/2,t.Z+4),r.rotation.set(0,0,0),r.rotateY(o.yaw*Math.PI/180),r.rotateX(o.pitch*Math.PI/180),r.rotateZ(-o.lean*Math.PI/180),t.label&&this.#e(t.label,t.X,o.lift+s.h*s.s+40,t.Z+10)}#e(t,e,n,s){if(!this.label||this.labelText!==t){this.label&&(this.label.parent?.remove(this.label),this.T.release(this.label.material.map),this.T.release(this.label.material));let r=this.T.add(new Nn({map:this.T.add(Ke(Eh(t))),depthTest:!1,transparent:!0}));this.label=new Yn(r),this.label.renderOrder=55,this.label.scale.set(260,49,1),this.scene.add(this.label),this.labelText=t}this.label.visible=!0,this.label.position.set(e,n,s)}},tT=()=>Ke(Sh(),{anisotropy:4});var no={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};var Jn=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},eT=new Ds(-1,1,1,-1,0,1),Bf=class extends be{constructor(){super(),this.setAttribute("position",new Jt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Jt([0,2,0,0,2,0],2))}},nT=new Bf,io=class{constructor(t){this._mesh=new Ut(nT,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,eT)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}};var so=class extends Jn{constructor(t,e="tDiffuse"){super(),this.textureID=e,this.uniforms=null,this.material=null,t instanceof Le?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=Bs.clone(t.uniforms),this.material=new Le({name:t.name!==void 0?t.name:"unspecified",defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this._fsQuad=new io(this.material)}render(t,e,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var Fa=class extends Jn{constructor(t,e){super(),this.scene=t,this.camera=e,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(t,e,n){let s=t.getContext(),r=t.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,o,4294967295),r.buffers.stencil.setClear(a),r.buffers.stencil.setLocked(!0),t.setRenderTarget(n),this.clear&&t.clear(),t.render(this.scene,this.camera),t.setRenderTarget(e),this.clear&&t.clear(),t.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}},zh=class extends Jn{constructor(){super(),this.needsSwap=!1}render(t){t.state.buffers.stencil.setLocked(!1),t.state.buffers.stencil.setTest(!1)}};var Hh=class{constructor(t,e){if(this.renderer=t,this._pixelRatio=t.getPixelRatio(),e===void 0){let n=t.getSize(new Mt);this._width=n.width,this._height=n.height,e=new Re(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:We}),e.texture.name="EffectComposer.rt1"}else this._width=e.width,this._height=e.height;this.renderTarget1=e,this.renderTarget2=e.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new so(no),this.copyPass.material.blending=On,this.timer=new _a}swapBuffers(){let t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,e){this.passes.splice(e,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){let e=this.passes.indexOf(t);e!==-1&&this.passes.splice(e,1)}isLastEnabledPass(t){for(let e=t+1;e<this.passes.length;e++)if(this.passes[e].enabled)return!1;return!0}render(t){this.timer.update(),t===void 0&&(t=this.timer.getDelta());let e=this.renderer.getRenderTarget(),n=!1;for(let s=0,r=this.passes.length;s<r;s++){let o=this.passes[s];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),o.render(this.renderer,this.writeBuffer,this.readBuffer,t,n),o.needsSwap){if(n){let a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}Fa!==void 0&&(o instanceof Fa?n=!0:o instanceof zh&&(n=!1))}}this.renderer.setRenderTarget(e)}reset(t){if(t===void 0){let e=this.renderer.getSize(new Mt);this._pixelRatio=this.renderer.getPixelRatio(),this._width=e.width,this._height=e.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,e){this._width=t,this._height=e;let n=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(n,s),this.renderTarget2.setSize(n,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(n,s)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var Gh=class extends Jn{constructor(t,e,n=null,s=null,r=null){super(),this.scene=t,this.camera=e,this.overrideMaterial=n,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new Ct}render(t,e,n){let s=t.autoClear;t.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(t.getClearColor(this._oldClearColor),t.setClearColor(this.clearColor,t.getClearAlpha())),this.clearAlpha!==null&&(r=t.getClearAlpha(),t.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&t.clearDepth(),t.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),t.render(this.scene,this.camera),this.clearColor!==null&&t.setClearColor(this._oldClearColor),this.clearAlpha!==null&&t.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),t.autoClear=s}};var mx={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ct(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};var ro=class i extends Jn{constructor(t,e=1,n,s){super(),this.strength=e,this.radius=n,this.threshold=s,this.resolution=t!==void 0?new Mt(t.x,t.y):new Mt(256,256),this.clearColor=new Ct(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new Re(r,o,{type:We,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){let u=new Re(r,o,{type:We,depthBuffer:!1});u.texture.name="UnrealBloomPass.h"+h,u.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(u);let d=new Re(r,o,{type:We,depthBuffer:!1});d.texture.name="UnrealBloomPass.v"+h,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),r=Math.round(r/2),o=Math.round(o/2)}let a=mx;this.highPassUniforms=Bs.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Le({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];let l=[6,10,14,18,22];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new Mt(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=e,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Bs.clone(no.uniforms),this.blendMaterial=new Le({uniforms:this.copyUniforms,vertexShader:no.vertexShader,fragmentShader:no.fragmentShader,premultipliedAlpha:!0,blending:pn,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Ct,this._oldClearAlpha=1,this._basic=new we,this._fsQuad=new io(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(t,e){let n=Math.round(t/2),s=Math.round(e/2);this.renderTargetBright.setSize(n,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(n,s),this.renderTargetsVertical[r].setSize(n,s),this.separableBlurMaterials[r].uniforms.invSize.value=new Mt(1/n,1/s),n=Math.round(n/2),s=Math.round(s/2)}render(t,e,n,s,r){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),r&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=i.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[l]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=i.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[l]),t.clear(),this._fsQuad.render(t),a=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(n),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(t){let e=[],n=t/3;for(let o=0;o<t;o++)e.push(.39894*Math.exp(-.5*o*o/(n*n))/n);let s=[],r=[];for(let o=1;o<t;o+=2){let a=e[o],l=o+1<t?e[o+1]:0,c=a+l;s.push((o*a+(o+1)*l)/c),r.push(c)}return new Le({defines:{KERNEL_PAIRS:s.length},uniforms:{colorTexture:{value:null},invSize:{value:new Mt(.5,.5)},direction:{value:new Mt(.5,.5)},centerWeight:{value:e[0]},gaussianOffsets:{value:s},gaussianWeights:{value:r}},vertexShader:`

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

				}`})}_getCompositeMaterial(t){return new Le({defines:{NUM_MIPS:t},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

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

				}`})}};ro.BlurDirectionX=new Mt(1,0);ro.BlurDirectionY=new Mt(0,1);var iT={uniforms:{tDiffuse:{value:null},uTime:{value:0},uAmount:{value:.022},uVig:{value:.42},uRes:{value:new Mt(2560,1440)}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:`
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uAmount; uniform float uVig; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; float v = smoothstep(0.95, 0.35, length(d * vec2(1.05, 1.0)));
      c.rgb *= mix(1.0 - uVig, 1.0, v);
      c.rgb += (hash(vUv * uRes) - 0.5) * uAmount;
      // the output transform (what three's OutputPass did in a pass of its own, a full-screen read and write): linear to sRGB
      vec3 lo = c.rgb * 12.92;
      vec3 hi = 1.055 * pow(max(c.rgb, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
      c.rgb = mix(lo, hi, step(vec3(0.0031308), c.rgb));
      gl_FragColor = c;
    }`},oo=2,zf=Object.freeze({strength:.17,radius:.45,threshold:.9}),Vh=class{constructor(t,e,n,{width:s,height:r,samples:o}){this.target=new Re(s,r,{type:We,samples:o}),this.composer=new Hh(t,this.target),this.composer.setPixelRatio(1),this.composer.setSize(s,r),this.composer.addPass(new Gh(e,n)),this.bloom=new ro(new Mt(Math.ceil(s/oo),Math.ceil(r/oo)),zf.strength,zf.radius,zf.threshold);let a=this.bloom.setSize.bind(this.bloom);this.bloom.setSize=(l,c)=>a(Math.ceil(l/oo),Math.ceil(c/oo)),this.composer.addPass(this.bloom),this.grain=new so(iT),this.grain.uniforms.uRes.value.set(s,r),this.composer.addPass(this.grain)}setSize(t,e){this.composer.setSize(t,e),this.bloom.resolution.set(Math.ceil(t/oo),Math.ceil(e/oo)),this.grain.uniforms.uRes.value.set(t,e)}setCalm(t){this.grain.uniforms.uAmount.value=t?0:.022}render(t){this.grain.uniforms.uTime.value=Math.floor(t*24)%97*.37,this.composer.render()}dispose(){this.composer.dispose?.(),this.target.dispose();for(let t of this.composer.passes)t.dispose?.()}};var Oi=Object.freeze({place:1,angle:1,grip:.05,breath:.012,down:.02}),Ua=9,Wh=class{constructor(){this.pose=null,this.ids=[],this.scratch=new Float64Array(Ua)}update(t){let e=!1;(!this.pose||this.pose.length!==t.length*Ua)&&(this.pose=new Float32Array(t.length*Ua),this.ids=[],e=!0);let n=this.pose,s=this.scratch;for(let r=0;r<t.length;r++){let o=t[r],a=r*Ua;this.ids[r]!==o.id&&(this.ids[r]=o.id,e=!0),s[0]=o.x/Oi.place,s[1]=o.z/Oi.place,s[2]=o.lift/Oi.place,s[3]=o.lean/Oi.angle,s[4]=o.yaw/Oi.angle,s[5]=o.pitch/Oi.angle,s[6]=o.grip/Oi.grip,s[7]=o.breathe*o.squash/Oi.breath,s[8]=o.down/Oi.down;for(let l=0;l<Ua;l++){let c=Math.round(s[l]);n[a+l]!==c&&(n[a+l]=c,e=!0)}}return e}};var sT=Object.freeze(["off","zones","anywhere"]),Un=Object.freeze({white:"#f2ecdc",yellow:"#eed46c",pink:"#eba0b8",blue:"#8fc0e0",green:"#97d09c",orange:"#eea060"}),yx=Object.freeze(Object.keys(Un)),lo=Object.freeze([.82,.84]),Qn=Object.freeze({width:300,depth:58,wall:22,stick:Object.freeze({radius:8,height:62,spacing:27,first:-122}),hit:Object.freeze({radius:13,height:96}),magic:Object.freeze({x:58,radius:9,height:70}),eraser:Object.freeze({x:112})}),gx=-10*Math.PI/180,rT=4+Qn.hit.height-14,Xh=8;function oT(i,t){let e=i.standing(t);if(!e)return null;let n=Math.cos(gx),s=Math.sin(gx),r=1/0,o=1/0,a=-1/0,l=-1/0;for(let c of[-Qn.width/2,Qn.width/2])for(let h of[0,rT])for(let u of[-Qn.depth/2,Qn.depth/2]){let d=i.screenOf(e.X+c*n+u*s,h,e.Z-c*s+u*n);r=Math.min(r,d.x),o=Math.min(o,d.y),a=Math.max(a,d.x),l=Math.max(l,d.y)}return{x0:r,y0:o,x1:a,y1:l}}function aT(i,t){if(i.rect){let[e,n,s,r]=i.rect;return!(s<t.x0||e>t.x1||r<t.y0||n>t.y1)}if(i.circle){let[e,n,s]=i.circle,r=Math.max(t.x0,Math.min(e,t.x1)),o=Math.max(t.y0,Math.min(n,t.y1));return(r-e)**2+(o-n)**2<=s**2}return!1}function Ba(i,t,e=[],n=null){let s=oT(i,t);if(!s)return!1;let r={x0:s.x0-Xh,y0:s.y0-Xh,x1:s.x1+Xh,y1:s.y1+Xh};return n&&(r.x0<n.x0||r.x1>n.x1||r.y0<n.y0||r.y1>n.y1)?!1:!e.some(o=>aT(o,r))}function vx(i,t,e=[],n=null,s=[]){if(Ba(i,t,e,n))return[t[0],t[1]];let r=[];for(let a=0;a<=30;a++)for(let l=-10;l<=10;l++)r.push([a/100,l/50]);r.sort((a,l)=>a[0]*1.2+Math.abs(a[1])-(l[0]*1.2+Math.abs(l[1])));let o=a=>{for(let[l,c]of r){let h=[Math.round((t[0]+c)*1e3)/1e3,Math.round((t[1]-l)*1e3)/1e3];if(!(h[0]<.03||h[0]>.97)&&Ba(i,h,a,n))return h}return null};return(s.length?o([...e,...s]):null)??o(e)??[t[0],t[1]]}var ao=Object.freeze({height:1440,tile:240,maxWidth:4320});function Gf(i){let[t,e]=i?.size??[2,1],n=ao.height,s=Math.min(ao.maxWidth,Math.max(ao.tile,Math.round(n*t/e)));return{w:s,h:n,tile:ao.tile,cols:Math.ceil(s/ao.tile),rows:Math.ceil(n/ao.tile)}}var lT=(i,t)=>`c${i}r${t}`;function _x(i){let t=/^c(\d{1,3})r(\d{1,3})$/.exec(String(i));return t?{c:Number(t[1]),r:Number(t[2])}:null}function bx(i,t){let e=_x(t);return!!e&&e.c<i.cols&&e.r<i.rows}function ze(i,t){let e=_x(t);if(!e)return null;let n=e.c*i.tile,s=e.r*i.tile;return{x:n,y:s,w:Math.min(i.tile,i.w-n),h:Math.min(i.tile,i.h-s)}}function Bn(i,{x0:t,y0:e,x1:n,y1:s}){let r=Math.max(0,Math.floor(t/i.tile)),o=Math.max(0,Math.floor(e/i.tile)),a=Math.min(i.cols-1,Math.floor(n/i.tile)),l=Math.min(i.rows-1,Math.floor(s/i.tile)),c=[];for(let h=o;h<=l;h++)for(let u=r;u<=a;u++)c.push(lT(u,h));return c}var Vf=(i,t,e)=>({x:t*i.w,y:e*i.h});var cT=8,Wf=(i,t="")=>`${String(Math.floor(i)).padStart(14,"0")}-${t}`;function Mx(i){return[...i].sort((t,e)=>(t.since??0)-(e.since??0)||String(t.by).localeCompare(String(e.by)))}function wx(i,{by:t=null}={}){let e=null;for(let n of i)if(!(t&&n.by!==t))for(let[s,r]of Object.entries(n.history??{}))!r||typeof r!="object"||(!e||(r.at??0)>(e.step.at??0)||(r.at??0)===(e.step.at??0)&&s>e.id)&&(e={layer:n,id:s,step:r});return e}var hT=320*1024,Sx=12,xx=i=>64+Object.values(i?.tiles??{}).reduce((t,e)=>t+(typeof e=="string"?e.length:0),0);function Xf(i,{keep:t=cT,bytes:e=hT,before:n=null,protect:s=null}={}){let r=Object.entries(i??{}).filter(([,l])=>l&&typeof l=="object").sort(([l,c],[h,u])=>(c.at??0)-(u.at??0)||(l<h?-1:l>h?1:0)),o=[];if(n!==null){let l=r.filter(([c,h])=>c!==s&&(h.at??0)<n);o.push(...l.map(([c])=>c)),r=r.filter(c=>!l.includes(c))}let a=r.reduce((l,[,c])=>l+xx(c),0);for(;r.length>1&&(r.length>t||a>e);){let l=r.findIndex(([c],h)=>c!==s&&h<r.length-1);if(l<0)break;a-=xx(r[l][1]),o.push(r[l][0]),r.splice(l,1)}return o}function $h(i,t=null){let e=t?.mode&&sT.includes(t.mode)?t.mode:i?.mode??"off",n=t?.locked===!0||t?.locked===void 0&&i?.lock===!0;return{mode:e,locked:n}}var Hf=Object.freeze([null,"off","zones","anywhere"]),Tx=i=>Hf[(Hf.indexOf(i??null)+1)%Hf.length];function $f(i,t,e,n){return i.locked||i.mode==="off"?!1:i.mode==="anywhere"?!0:t.some(s=>s.kind==="chalk"&&vi(s.shape,e,n))}function Ex(i,t){return i.mode==="off"||i.locked?!1:i.mode==="anywhere"||t.some(e=>e.kind==="chalk")}function Ax(i,t){return i.mode!=="zones"?null:t.filter(e=>e.kind==="chalk").map(e=>e.shape)}var Cx=10,Rx=2.5;function uT(i,t){let e=new fi(i,i,t,24,8),n=e.getAttribute("position"),s=new Float32Array(n.count*3),r=new Ct;for(let o=0;o<n.count;o++){let a=(Math.atan2(n.getZ(o),n.getX(o))/(Math.PI*2)+1)%1,l=n.getY(o)/t+.5;r.setHSL((a+l*.75)%1,.7,.68,Ce),s.set([r.r,r.g,r.b],o*3)}return e.setAttribute("color",new Ue(s,3)),e}var Zh=class{constructor({scene:t,rig:e}){this.rig=e,this.group=new Ge,t.add(this.group),this.geometry=new Ie(1,1),this.tiles=new Map,this.#t()}#t(){let t=document.createElement("canvas");t.width=t.height=4;let e=Ke(t,{anisotropy:4}),n=new we({map:e,transparent:!0,depthWrite:!1,color:15658734}),s=La(this.rig,n,Cx,{x0:0,y0:0,x1:.001,y1:.001},this.geometry);s.renderOrder=Rx,this.group.add(s),this.primer={mesh:s,texture:e,material:n}}update(t,e,n=!1){let s=t.grid,r=n?new Set([...e,...this.tiles.keys(),...t.composite.keys()]):e;for(let o of r){let a=t.composite.get(o)??null,l=this.tiles.get(o);if(l&&l.canvas===a){l.texture.needsUpdate=!0;continue}if(l&&this.#e(o),!a)continue;let c=ze(s,o),h=Ke(a,{anisotropy:4}),u=new we({map:h,transparent:!0,depthWrite:!1,color:15658734}),d=La(this.rig,u,Cx,{x0:c.x/s.w,y0:c.y/s.h,x1:(c.x+c.w)/s.w,y1:(c.y+c.h)/s.h},this.geometry);d.renderOrder=Rx,this.group.add(d),this.tiles.set(o,{mesh:d,texture:h,material:u,canvas:a})}}#e(t){let e=this.tiles.get(t);e&&(this.group.remove(e.mesh),e.texture.dispose(),e.material.dispose(),this.tiles.delete(t))}setHidden(t){this.group.visible=!t}dispose(){for(let t of[...this.tiles.keys()])this.#e(t);this.primer?.texture.dispose(),this.primer?.material.dispose(),this.geometry.dispose(),this.group.removeFromParent()}};var qh=class{constructor({scene:t,rig:e,at:n,tracker:s}){this.group=new Ge,this.sticks=[];let r=e.standing(n);if(!r){this.group.visible=!1,t.add(this.group),this.hidden=!0;return}this.group.position.set(r.X,0,r.Z),this.group.rotation.y=-10*us;let{width:o,depth:a,wall:l,stick:c,hit:h,magic:u,eraser:d}=Qn,f=s.add(new nn({color:8016432,roughness:.6})),g=s.add(new nn({color:3810322,roughness:.8})),x=s.mesh(new Ut(new cn(o,8,a),g));x.position.y=4,this.group.add(x);for(let[R,P,I,B]of[[o,8,0,a/2-4],[o,8,0,-a/2+4],[8,a,o/2-4,0],[8,a,-o/2+4,0]]){let k=s.mesh(new Ut(new cn(R,l,P),f));k.position.set(I,l/2+4,B),k.castShadow=!0,this.group.add(k)}let p=s.add(new we({visible:!1})),m=s.add(new fi(h.radius,h.radius,h.height,8)),_=(R,P)=>{let I=s.mesh(new Ut(m,p));I.position.set(R,4+h.height/2-14,0),Object.assign(I.userData,P),this.group.add(I),this.sticks.push(I)};Object.entries(Un).forEach(([R,P],I)=>{let B=c.first+I*c.spacing,k=new Ct(P),U=s.add(new nn({color:k,roughness:.95,emissive:k.clone().multiplyScalar(.18)})),V=s.mesh(new Ut(new fi(c.radius,c.radius,c.height,14),U));V.position.set(B,4+c.height/2-6,(I%2-.5)*6),V.rotation.z=(I%3-1)*.07,V.rotation.x=((I+1)%3-1)*.05,V.castShadow=!0,this.group.add(V),_(B,{chalk:R})});let E=s.add(new nn({vertexColors:!0,roughness:.55,emissive:2763306})),b=s.mesh(new Ut(uT(u.radius,u.height),E));b.position.set(u.x,4+u.height/2-6,2),b.rotation.z=.06,b.castShadow=!0,this.group.add(b);let T=s.add(new nn({color:16765802,roughness:.3,metalness:.6,emissive:16758832,emissiveIntensity:.55})),S=s.mesh(new Ut(new fa(u.radius*1.15,0),T));S.position.set(u.x-Math.sin(.06)*(u.height/2),4+u.height-2,2),S.scale.set(1,1.3,.55),this.group.add(S),_(u.x,{magic:!0});let A=s.add(new nn({color:599e4,roughness:1})),v=s.mesh(new Ut(new cn(50,32,30),A));v.position.set(d.x,20,4),v.rotation.y=.12,v.castShadow=!0,this.group.add(v);let M=s.mesh(new Ut(s.add(new cn(58,60,50)),p));M.position.set(d.x,30,4),M.userData.eraser=!0,this.group.add(M),this.sticks.push(M),t.add(this.group)}setVisible(t){this.hidden||(this.group.visible=t)}get pickables(){return this.sticks}moveTo(t,e){if(this.hidden)return;let n=t.standing(e);n&&this.group.position.set(n.X,0,n.Z)}};var oe=Object.freeze({chalk:Object.freeze({kind:"paint",tip:"chalk",size:Object.freeze({min:2,max:48,initial:7}),spacing:.1,flow:.8,opacity:1,grain:.7,scatter:.05,jitter:Object.freeze({size:.12,angle:1}),pressure:Object.freeze({size:.5,flow:.4}),taper:0}),magic:Object.freeze({kind:"paint",tip:"chalk",magic:!0,size:Object.freeze({min:2,max:64,initial:10}),spacing:.09,flow:.85,opacity:1,grain:.45,scatter:.04,jitter:Object.freeze({size:.1,angle:1}),pressure:Object.freeze({size:.5,flow:.4}),taper:0}),pencil:Object.freeze({kind:"paint",tip:"pencil",size:Object.freeze({min:1,max:14,initial:2.5}),spacing:.12,flow:.9,opacity:1,grain:.2,scatter:0,jitter:Object.freeze({size:.04,angle:0}),pressure:Object.freeze({size:.45,flow:.55}),taper:1.5}),brush:Object.freeze({kind:"paint",tip:"soft",size:Object.freeze({min:3,max:140,initial:24}),spacing:.06,flow:.45,opacity:.88,grain:0,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.7,flow:.25}),taper:1}),spray:Object.freeze({kind:"spray",tip:"speck",size:Object.freeze({min:10,max:180,initial:48}),spacing:.05,flow:.55,opacity:1,grain:0,scatter:0,particles:34,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.25,flow:.6}),taper:0}),smudge:Object.freeze({kind:"smudge",tip:"soft",size:Object.freeze({min:6,max:140,initial:32}),spacing:.08,flow:.6,opacity:1,grain:0,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.35,flow:.5}),taper:0}),eraser:Object.freeze({kind:"erase",tip:"round",size:Object.freeze({min:3,max:180,initial:28}),spacing:.07,flow:1,opacity:1,grain:0,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.35,flow:0}),taper:0}),fill:Object.freeze({kind:"fill",tip:null,size:Object.freeze({min:0,max:0,initial:0}),spacing:1,flow:1,opacity:.95,grain:.3,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:0,flow:0}),taper:0})}),Kh=Object.freeze(Object.keys(oe)),Yh=Object.freeze({chalk:.62,pencil:.82,round:.78});function Px(i,t,e=.5){if(t>=1)return 0;let n=(s,r,o)=>{let a=Math.max(0,Math.min(1,(o-s)/(r-s)));return a*a*(3-2*a)};if(i==="chalk"){let s=Yh.chalk;if(t<=s)return .96;let r=(t-s)/(1-s),o=.96*(1-n(0,1,r));return e<r*.85?o*.2:o}if(i==="pencil"){let s=Yh.pencil;return(t<=s?.95:.95*(1-n(s,1,t)))*(.88+.12*e)}return i==="round"?t<=Yh.round?1:1-n(Yh.round,1,t):i==="speck"?Math.exp(-6*t*t):Math.exp(-3.2*t*t)*(1-n(.85,1,t))}var ho=Object.freeze([0,5,12,26]);function Gs(i){let t=i>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function qf(i){let t=2166136261;for(let e=0;e<i.length;e++)t^=i.charCodeAt(e),t=Math.imul(t,16777619);return t>>>0}var Zf=class{constructor(t=0){this.r=Math.max(0,t),this.at=null,this.pointer=null}push({x:t,y:e,p:n=.5}){if(this.pointer={x:t,y:e,p:n},!this.at)return this.at={x:t,y:e,p:n},[{...this.at}];let s=t-this.at.x,r=e-this.at.y,o=Math.hypot(s,r);if(o<=this.r)return this.at.p+=(n-this.at.p)*.35,[];let a=this.r?(o-this.r)/o:1;return this.at={x:this.at.x+s*a,y:this.at.y+r*a,p:n},[{...this.at}]}finish(){if(!this.pointer||!this.at)return[];let t=this.pointer.x-this.at.x,e=this.pointer.y-this.at.y,n=Math.hypot(t,e);if(n<.5)return[];let s=Math.max(1,Math.ceil(n/Math.max(2,this.r/2))),r=[];for(let o=1;o<=s;o++)r.push({x:this.at.x+t*o/s,y:this.at.y+e*o/s,p:this.pointer.p});return this.at={...this.pointer},r}},jh=class{constructor(){this.last=null,this.p=.75}pressure({x:t,y:e,t:n,pressure:s=.5,pointerType:r="mouse"}){if(r==="pen"&&s>0)return this.last={x:t,y:e,t:n},Math.max(.08,Math.min(1,s));if(!this.last)return this.last={x:t,y:e,t:n},this.p;let o=Math.max(1,n-this.last.t),a=Math.hypot(t-this.last.x,e-this.last.y)/o;this.last={x:t,y:e,t:n};let l=Math.max(.45,Math.min(1,1.05-a*.22));return this.p+=(l-this.p)*.25,this.p}};function dT(i,t,e,n,s){let r=Math.max(1e-4,Math.hypot(t.x-i.x,t.y-i.y)**.5),o=Math.max(1e-4,Math.hypot(e.x-t.x,e.y-t.y)**.5),a=Math.max(1e-4,Math.hypot(n.x-e.x,n.y-e.y)**.5),l=u=>e[u]-t[u]+o*((t[u]-i[u])/r-(e[u]-i[u])/(r+o)),c=u=>e[u]-t[u]+o*((n[u]-e[u])/a-(n[u]-t[u])/(o+a)),h=u=>{let d=2*t[u]-2*e[u]+l(u)+c(u),f=-3*t[u]+3*e[u]-2*l(u)-c(u);return((d*s+f)*s+l(u))*s+t[u]};return{x:h("x"),y:h("y"),p:t.p+(e.p-t.p)*s}}var co=class{constructor({tool:t="chalk",size:e=null,flow:n=1,steady:s=0,seed:r=1}={}){this.def=oe[t]??oe.chalk,this.tool=t,this.size=Math.max(this.def.size.min,Math.min(this.def.size.max,e??this.def.size.initial)),this.flowScale=Math.max(0,Math.min(1,n)),this.steady=new Zf(s),this.seed=r>>>0,this.points=[],this.prev=null,this.carry=0,this.dist=0,this.count=0,this.dabs=0}add(t){let e=[];for(let n of this.steady.push(t))this.#t(n,e);return e}finish(){let t=[];for(let n of this.steady.finish())this.#t(n,t);let e=this.points;if(e.length>=2){let n=e.length;this.#e(e[n-3]??e[n-2],e[n-2],e[n-1],e[n-1],t)}else e.length===1&&this.count===0&&this.#r(e[0],0,t);return t}#t(t,e){let n=this.points[this.points.length-1];if(n&&Math.hypot(t.x-n.x,t.y-n.y)<.35){n.p=t.p;return}this.points.push(t),this.points.length>4&&this.points.shift();let s=this.points,r=s.length;if(r===1){this.prev={...t},this.#r(t,0,e);return}r>=3&&this.#e(s[r-4]??s[r-3],s[r-3],s[r-2],s[r-1],e)}#e(t,e,n,s,r){let o=Math.hypot(n.x-e.x,n.y-e.y),a=Math.max(1,Math.ceil(o/.75)),l=this.prev??e;for(let c=1;c<=a;c++){let h=dT(t,e,n,s,c/a),u=Math.hypot(h.x-l.x,h.y-l.y);this.carry+=u,this.dist+=u;let d=this.#i(h.p);for(;this.carry>=d;){this.carry-=d;let f=this.carry,g=u>0?Math.max(0,Math.min(1,1-f/u)):1,x={x:l.x+(h.x-l.x)*g,y:l.y+(h.y-l.y)*g,p:h.p};this.#r(x,Math.atan2(h.y-l.y,h.x-l.x),r)}l=h}this.prev=l}#n(t){let e=this.def.pressure;return{size:1-e.size+e.size*t,flow:1-e.flow+e.flow*t}}#i(t){return Math.max(.4,this.def.spacing*this.size*this.#n(t).size)}#r(t,e,n){let s=Gs(this.seed+this.count*7919);this.count++;let r=this.def,o=this.#n(t.p),a=r.taper>0?Math.min(1,.35+.65*this.dist/(r.taper*this.size)):1,l=Math.max(.6,this.size*o.size*a*(1+r.jitter.size*(s()*2-1))),c=r.scatter*this.size,h=r.jitter.angle?s()*Math.PI*2:e;n.push({x:t.x+(s()*2-1)*c,y:t.y+(s()*2-1)*c,size:l,flow:Math.max(0,Math.min(1,r.flow*this.flowScale*o.flow)),angle:h,seed:(this.seed^Math.imul(this.count,2654435761))>>>0,dist:this.dist})}};function Jh(i,t,e={}){let n=new co({...e,steady:0}),s=Math.max(2,Math.ceil(Math.hypot(t.x-i.x,t.y-i.y)/3)),r=[];for(let o=0;o<=s;o++)r.push(...n.add({x:i.x+(t.x-i.x)*o/s,y:i.y+(t.y-i.y)*o/s,p:i.p??.75}));return r.push(...n.finish()),r}function za(i){let t=1/0,e=1/0,n=-1/0,s=-1/0;for(let r of i){let o=r.size/2+2;t=Math.min(t,r.x-o),e=Math.min(e,r.y-o),n=Math.max(n,r.x+o),s=Math.max(s,r.y+o)}return Number.isFinite(t)?{x0:t,y0:e,x1:n,y1:s}:null}function fs(i){let t=parseInt(String(i).replace("#",""),16),e=(t>>16&255)/255,n=(t>>8&255)/255,s=(t&255)/255,r=Math.max(e,n,s),o=r-Math.min(e,n,s),a=0;return o&&(a=r===e?(n-s)/o%6:r===n?(s-e)/o+2:(e-n)/o+4),{h:(a*60+360)%360,s:r?o/r:0,v:r}}function Ha({h:i,s:t,v:e}){let n=r=>{let o=(r+i/60)%6;return e-e*t*Math.max(0,Math.min(o,4-o,1))},s=r=>Math.round(Math.max(0,Math.min(1,r))*255).toString(16).padStart(2,"0");return`#${s(n(5))}${s(n(3))}${s(n(1))}`}function kx(i,t,{every:e=900}={}){let n=fs(i);return Ha({h:(n.h+t/e*360)%360,s:Math.max(.55,n.s),v:Math.max(.85,n.v)})}function Vs(i){let t=/^#?([0-9a-f]{6})$/i.exec(String(i??"").trim());return t?`#${t[1].toLowerCase()}`:null}function Ix({size:i,map:t,view:e},n){let[s,r]=i,o=s*t.s*e.s/n.w,a=r*t.s*e.s/n.h;return{k:(o+a)/2,kx:o,ky:a,bx:(t.ox-e.ox)*e.s,by:(t.oy-e.oy)*e.s}}function Lx(i,t){return{k:i.k*t,bx:i.bx*t,by:i.by*t}}function Dx(i,t){let e=parseInt(String(i).replace("#",""),16),n=a=>Math.max(0,Math.min(255,Math.round(a*t))),s=n(e>>16&255),r=n(e>>8&255),o=n(e&255);return`#${[s,r,o].map(a=>a.toString(16).padStart(2,"0")).join("")}`}function Nx(i,t,e,n=60){if(!i||!t)return[];let s=t.x-i.x,r=t.y-i.y,o=Math.hypot(s,r);if(o<.75)return[];let a=Math.max(.4,e,o/n),l=Math.floor(o/a),c=Math.atan2(r,s),h=[];for(let u=1;u<=l;u++){let d=u*a/o;h.push({x:i.x+s*d,y:i.y+r*d,size:i.size,flow:i.flow,angle:i.angle?i.angle:c,seed:i.seed+u*40503>>>0,dist:(i.dist??0)+u*a})}return h.push({x:t.x,y:t.y,size:i.size,flow:i.flow,angle:i.angle?i.angle:c,seed:i.seed+99991>>>0,dist:(i.dist??0)+o}),h}function Yf(i,t,e,n,s=3){let r=1/0,o=1/0,a=-1/0,l=-1/0;for(let h of i){let u=h.size*t.k/2+s,d=h.x*t.k+t.bx,f=h.y*t.k+t.by;r=Math.min(r,d-u),o=Math.min(o,f-u),a=Math.max(a,d+u),l=Math.max(l,f+u)}if(!Number.isFinite(r))return null;let c={x:Math.max(0,Math.floor(r)),y:Math.max(0,Math.floor(o))};return c.w=Math.min(e,Math.ceil(a))-c.x,c.h=Math.min(n,Math.ceil(l))-c.y,c.w>0&&c.h>0?c:null}function jf(i,t){if(!i)return t;if(!t)return i;let e=Math.min(i.x,t.x),n=Math.min(i.y,t.y);return{x:e,y:n,w:Math.max(i.x+i.w,t.x+t.w)-e,h:Math.max(i.y+i.h,t.y+t.h)-n}}var Kf=4,Ox=15;function fT(i,t){return i.def.kind==="erase"?"#ffffff":i.magic?.rainbow?kx(i.colour,Math.round(t.dist/Ox)*Ox):i.colour}function Ga(i,t,e,n,s,{clip:r=null,dim:o=null}={}){let a=s.k,l=n.size*a/2,c=n.x*a+s.ox,h=n.y*a+s.oy,u=fT(e,n);if(o!==null&&o!==1&&(u=Dx(u,o)),e.def.kind==="spray"){let m=Gs(n.seed),_=Math.max(1,Math.round((e.def.particles??30)*n.flow)),E=t.coloured("speck",0,u);for(let b=0;b<_;b++){let T=m()*Math.PI*2,S=l*Math.pow(m(),.75),A=c+Math.cos(T)*S,v=h+Math.sin(T)*S,M=(1.2+m()*2.4)*a,R=.3+m()*.6;r&&(A<-4||v<-4||A>r.w+4||v>r.h+4)||(i.globalAlpha=R,i.drawImage(E,A-M/2,v-M/2,M,M))}return i.globalAlpha=1,{x0:c-l-4,y0:h-l-4,x1:c+l+4,y1:h+l+4}}let d=e.def.tip??"round",f=d==="chalk"?n.seed%Kf:0,g=t.coloured(d,f,u),x=n.angle?Math.cos(n.angle):1,p=n.angle?Math.sin(n.angle):0;return i.setTransform(x,p,-p,x,c,h),i.globalAlpha=n.flow,i.drawImage(g,-l,-l,l*2,l*2),i.setTransform(1,0,0,1,0,0),i.globalAlpha=1,{x0:c-l-2,y0:h-l-2,x1:c+l+2,y1:h+l+2}}var Mn=96,uo=256,pT=48,mT=.3,gT=320,xT=4,ge=(i,t)=>{let e=document.createElement("canvas");return e.width=Math.max(1,Math.round(i)),e.height=Math.max(1,Math.round(t)),e},se=i=>i.getContext("2d",globalThis.__chalkSoftware?{willReadFrequently:!0}:void 0);function Fx(i,t,e){if(!i)return{x:0,y:0,w:t,h:e};let n=Math.max(0,Math.floor(i.x0)),s=Math.max(0,Math.floor(i.y0)),r=Math.min(t,Math.ceil(i.x1)),o=Math.min(e,Math.ceil(i.y1));return{x:n,y:s,w:Math.max(0,r-n),h:Math.max(0,o-s)}}var Ux=(i,t)=>!i||!t?null:{x0:Math.min(i.x0,t.x0),y0:Math.min(i.y0,t.y0),x1:Math.max(i.x1,t.x1),y1:Math.max(i.y1,t.y1)};function tu(i,t,e,n=!1){let s=t+1,r=new Float32Array(s*s);for(let l=0;l<r.length;l++)r[l]=e();if(n)for(let l=0;l<s;l++)r[l*s+t]=r[l*s],r[t*s+l]=r[l];let o=new Float32Array(i*i),a=l=>l*l*(3-2*l);for(let l=0;l<i;l++){let c=l/i*t,h=Math.floor(c),u=a(c-h);for(let d=0;d<i;d++){let f=d/i*t,g=Math.floor(f),x=a(f-g),p=r[h*s+g],m=r[h*s+g+1],_=r[(h+1)*s+g],E=r[(h+1)*s+g+1];o[l*i+d]=p+(m-p)*x+(_-p)*u+(p-m-_+E)*x*u}}return o}var Jf=class{constructor(){this.shapes=new Map,this.tinted=new Map}shape(t,e=0){let n=`${t}:${e}`,s=this.shapes.get(n);if(s)return s;s=ge(Mn,Mn);let r=se(s),o=r.createImageData(Mn,Mn),a=Gs(9001+e*131+t.charCodeAt(0)),l=tu(Mn,7,a),c=tu(Mn,30,a),h=Mn/2;for(let u=0;u<Mn;u++)for(let d=0;d<Mn;d++){let f=u*Mn+d,g=Px(t,Math.hypot(d+.5-h,u+.5-h)/h,l[f]*.7+c[f]*.3),x=f*4;o.data[x]=o.data[x+1]=o.data[x+2]=255,o.data[x+3]=Math.round(g*255)}return r.putImageData(o,0,0),this.shapes.set(n,s),s}coloured(t,e,n){let s=`${t}:${e}:${n}`,r=this.tinted.get(s);if(r)return r;this.tinted.size>gT&&this.tinted.delete(this.tinted.keys().next().value),r=ge(Mn,Mn);let o=se(r);return o.drawImage(this.shape(t,e),0,0),o.globalCompositeOperation="source-in",o.fillStyle=n,o.fillRect(0,0,Mn,Mn),this.tinted.set(s,r),r}},Qf=class{constructor(){this.noise=null,this.by=new Map,this.patterns=new Map}canvas(t){let e=Math.round(Math.max(0,Math.min(1,t))*20)/20,n=this.by.get(e);if(n)return n;if(!this.noise){let o=Gs(77),a=tu(uo,16,o,!0),l=tu(uo,64,o,!0);this.noise=a.map((c,h)=>Math.max(0,Math.min(1,c*.45+l[h]*.55+(o()-.5)*.25)))}n=ge(uo,uo);let s=se(n),r=s.createImageData(uo,uo);for(let o=0;o<this.noise.length;o++){let a=o*4;r.data[a]=r.data[a+1]=r.data[a+2]=255,r.data[a+3]=Math.round((1-e*this.noise[o]**1.4)*255)}return s.putImageData(r,0,0),this.by.set(e,n),n}pattern(t,e,n,s){let r=`${e}|${n}|${s}`,o=this.patterns.get(r);return o||(o=t.createPattern(this.canvas(e),"repeat"),o?.setTransform?.(new DOMMatrix().translate(-n,-s)),o&&this.patterns.set(r,o),o)}},eu=class i{constructor({grid:t,onChange:e=()=>{}}){this.grid=t,this.onChange=e,this.layers=new Map,this.order=[],this.composite=new Map,this.strokes=new Map,this.tips=new Jf,this.grain=new Qf,this.mask=null,this.maskTiles=new Map,this.dirty=new Map,this.loads=new Map,this.scratch=null,this.pending=!1}warmUp(){let t=[];for(let s=0;s<Kf;s++)t.push(()=>this.tips.shape("chalk",s));for(let s of["pencil","round","soft","speck"])t.push(()=>this.tips.shape(s,0));for(let s of Object.values(oe))s.grain>0&&t.push(()=>this.grain.canvas(s.grain));for(let s of["chalk","magic","pencil","brush","spray","smudge","eraser"])t.push(()=>this.#t(s));t.push(()=>this.#e());let e=globalThis.requestIdleCallback??(s=>setTimeout(s,30)),n=()=>{let s=t.shift();if(s){try{s()}catch{}e(n)}};e(n)}#t(t){this.warm||(this.warm=new i({grid:this.grid}),this.warm.tips=this.tips,this.warm.grain=this.grain,this.warm.setMask([[[0,0],[1,0],[1,1],[0,1]]]));let e=this.warm,n=oe[t],s=`warm-${t}`;e.begin({id:s,by:"warm",tool:t,colour:"#ffffff",magic:n.magic?{glow:!0,sparkle:!0,rainbow:t==="magic"}:null}),e.paint(s,Jh({x:80,y:90,p:.8},{x:330,y:150,p:.8},{tool:t,size:Math.max(6,n.size.initial),seed:3})),e.flush(),e.commit(s),e.flush()}#e(){let t=this.warm?.layers.get("warm")?.tiles.values().next().value;t&&ep(t,!0).catch(()=>{}),this.warm?.clear(),this.warm=null}#n(t,e=null){let n=this.dirty.get(t);this.dirty.set(t,n===void 0?e:Ux(n,e)),this.#i()}#i(){if(this.pending)return;this.pending=!0,(globalThis.requestAnimationFrame??(e=>setTimeout(e,16)))(()=>this.flush())}flush(){if(this.pending=!1,!this.dirty.size)return;let t=[...this.dirty];this.dirty.clear();for(let[e,n]of t)this.#y(e,n);this.onChange(new Set(t.map(([e])=>e)))}setLayers(t){let e=new Set(t.map(s=>s.by));for(let s of this.strokes.values())e.add(s.by);for(let[s,r]of this.layers)if(!e.has(s)){for(let o of r.tiles.keys())this.#n(o);this.layers.delete(s)}for(let s of t){let r=this.layers.get(s.by);if(r){Number.isFinite(s.since)&&s.since!==r.since&&(r.since=s.since,this.#r(r));continue}this.layers.set(s.by,{by:s.by,since:s.since??Date.now(),tiles:new Map,sources:new Map})}let n=this.order.join("|");if(this.order=Mx([...this.layers.values()]).map(s=>s.by),n!==this.order.join("|"))for(let s of this.layers.values())this.#r(s)}ensureLayer(t,e=Date.now()){return this.layers.has(t)||this.setLayers([...[...this.layers.values()].map(n=>({by:n.by,since:n.since})),{by:t,since:e}]),this.layers.get(t)}#r(t){for(let e of t.tiles.keys())this.#n(e)}sourceOf(t,e){return this.layers.get(t)?.sources.get(e)??null}noteSource(t,e,n){let s=this.layers.get(t);s&&(s.sources.set(e,n??null),n||(s.tiles.delete(e),this.#n(e)))}liveStrokes(){return[...this.strokes.values()].filter(t=>t.live)}async setTile(t,e,n){if((this.ensureLayer(t).sources.get(e)??null)===(n??null))return!1;let r=`${t}|${e}`;this.loads.set(r,n??null);let o=null;if(n){o=new Image,o.src=n;try{await o.decode()}catch{return!1}}if(this.loads.get(r)!==(n??null))return!1;this.loads.delete(r);let a=this.layers.get(t);if(!a)return!1;if(a.sources.set(e,n??null),!n)a.tiles.delete(e);else{let l=ze(this.grid,e),c=a.tiles.get(e);c||(c=ge(l.w,l.h),a.tiles.set(e,c));let h=se(c);h.clearRect(0,0,c.width,c.height),h.drawImage(o,0,0)}return this.#n(e),!0}async revert(t,e){let n=this.layers.get(t);n&&await Promise.all([...e].map(async s=>{let r=n.sources.get(s)??null;n.sources.delete(s),n.tiles.delete(s),this.#n(s),r&&await this.setTile(t,s,r)}))}setMask(t){let e=t?.length?t.map(n=>n.map(([s,r])=>[s*this.grid.w,r*this.grid.h])):null;JSON.stringify(e)!==JSON.stringify(this.mask)&&(this.mask=e,this.maskTiles.clear(),this.maskBoxes=e?.map(n=>{let s=n.map(o=>o[0]),r=n.map(o=>o[1]);return{poly:n,x0:Math.min(...s),y0:Math.min(...r),x1:Math.max(...s),y1:Math.max(...r)}})??null)}#s(t,e,n){if(!this.maskBoxes)return!0;for(let s of this.maskBoxes){if(t+n<s.x0||t-n>s.x1||e+n<s.y0||e-n>s.y1)continue;let r=s.poly,o=!1;for(let a=0,l=r.length-1;a<r.length;l=a++){let[c,h]=r[a],[u,d]=r[l];h>e!=d>e&&t<(u-c)*(e-h)/(d-h)+c&&(o=!o);let f=u-c,g=d-h,x=Math.max(0,Math.min(1,((t-c)*f+(e-h)*g)/(f*f+g*g||1)));if(Math.hypot(c+x*f-t,h+x*g-e)<=n)return!0}if(o)return!0}return!1}#o(t){if(!this.mask)return null;let e=this.maskTiles.get(t);if(e)return e;let n=ze(this.grid,t);e=ge(n.w,n.h);let s=se(e);s.fillStyle="#fff",s.translate(-n.x,-n.y);for(let r of this.mask)s.beginPath(),r.forEach(([o,a],l)=>l?s.lineTo(o,a):s.moveTo(o,a)),s.closePath(),s.fill();return this.maskTiles.set(t,e),e}begin({id:t,by:e,tool:n="chalk",colour:s="#f2ecdc",opacity:r=null,magic:o=null,everyone:a=!1,live:l=!1,wet:c=!1}){let h=oe[n]??oe.chalk;this.ensureLayer(e);let u={id:t,by:e,tool:n,def:h,colour:s,magic:h.magic?{rainbow:!1,glow:!1,sparkle:!1,...o??{}}:null,opacity:r??h.opacity,everyone:h.kind==="erase"&&a,live:l,wet:c,buffer:new Map,processed:new Map,stale:new Map,touched:new Set,dabs:[],carried:null};return this.strokes.set(t,u),u}paint(t,e){let n=this.strokes.get(t);if(!(!n||!e.length))for(let s of e)n.dabs.push(s),n.def.kind==="smudge"?this.#d(n,s):this.#h(n,s)}#a(t,e,n){let s=t.buffer.get(e);return s||(s=ge(n.w,n.h),t.buffer.set(e,s)),s}#c(t,e,n){t.touched.add(e);let s=t.stale.get(e);t.stale.set(e,s===void 0?n:Ux(s,n)),t.wet||this.#n(e,n)}#h(t,e){let n=e.size/2;if(t.def.kind!=="erase"&&!this.#s(e.x,e.y,n+1))return;let s=Bn(this.grid,{x0:e.x-n-2,y0:e.y-n-2,x1:e.x+n+2,y1:e.y+n+2});for(let r of s){let o=ze(this.grid,r),a=se(this.#a(t,r,o)),l=Ga(a,this.tips,t,e,{k:1,ox:-o.x,oy:-o.y},{clip:{w:o.w,h:o.h}});this.#c(t,r,l)}}#l(t,e){let n=t.buffer.get(e);if(!n)return null;let s=t.processed.get(e),r=t.stale.get(e);if(s&&r===void 0)return s;let o=ze(this.grid,e),a=r??null;s||(s=ge(o.w,o.h),t.processed.set(e,s),a=null),t.stale.delete(e);let l=Fx(a,o.w,o.h);if(!l.w||!l.h)return s;let c=se(s);if(c.save(),c.beginPath(),c.rect(l.x,l.y,l.w,l.h),c.clip(),c.clearRect(l.x,l.y,l.w,l.h),c.drawImage(n,0,0),t.def.grain>0&&t.def.kind!=="erase"){let u=this.grain.pattern(c,Math.round(Math.max(0,Math.min(1,t.def.grain))*20)/20,o.x,o.y);u&&(c.globalCompositeOperation="destination-in",c.fillStyle=u,c.fillRect(l.x,l.y,l.w,l.h))}let h=t.def.kind==="erase"?null:this.#o(e);return h&&(c.globalCompositeOperation="destination-in",c.drawImage(h,0,0)),c.restore(),s}#d(t,e){let n=Math.max(4,Math.ceil(e.size)),s=Math.round(e.x-n/2),r=Math.round(e.y-n/2);t.here?.width!==n&&(t.here=ge(n,n),t.put=ge(n,n));let o=this.#f(t.here,s,r);if(!t.carried){t.carried=ge(n,n),se(t.carried).drawImage(o,0,0);return}if(t.carried.width!==n){let u=ge(n,n);se(u).drawImage(t.carried,0,0,n,n),t.carried=u}let a=t.put,l=se(a);l.globalCompositeOperation="copy",l.drawImage(t.carried,0,0),l.globalCompositeOperation="destination-in",l.drawImage(this.tips.shape("soft",0),0,0,n,n),l.globalCompositeOperation="source-over";let c=this.layers.get(t.by);for(let u of Bn(this.grid,{x0:s,y0:r,x1:s+n,y1:r+n})){let d=ze(this.grid,u),f=c.tiles.get(u);f||(f=ge(d.w,d.h),c.tiles.set(u,f));let g=se(f);g.globalAlpha=Math.max(.05,Math.min(1,t.def.flow*e.flow*1.4)),g.drawImage(a,s-d.x,r-d.y),g.globalAlpha=1,t.touched.add(u),this.#n(u,{x0:s-d.x-1,y0:r-d.y-1,x1:s-d.x+n+1,y1:r-d.y+n+1})}let h=se(t.carried);h.globalAlpha=.28,h.drawImage(o,0,0),h.globalAlpha=1}#u(t,e,n,s){return Bn(this.grid,{x0:t,y0:e,x1:t+n,y1:e+s}).some(o=>this.dirty.has(o))&&this.flush(),this.#f(ge(n,s),t,e)}#f(t,e,n){let s=se(t);s.clearRect(0,0,t.width,t.height);for(let r of Bn(this.grid,{x0:e,y0:n,x1:e+t.width,y1:n+t.height})){let o=this.composite.get(r);if(!o)continue;let a=ze(this.grid,r);s.drawImage(o,a.x-e,a.y-n)}return t}commit(t){let e=this.strokes.get(t);if(!e)return new Map;this.strokes.delete(t);let n=new Map,s=(r,o,a)=>{n.has(r)||n.set(r,new Map),n.get(r).set(o,a)};if(e.def.kind==="smudge"){let r=this.layers.get(e.by);for(let o of e.touched)s(e.by,o,r?.tiles.get(o)??null)}else if(e.def.kind==="erase"){let r=e.everyone?[...this.layers.values()]:[this.layers.get(e.by)].filter(Boolean);for(let o of e.touched){let a=this.#l(e,o);for(let l of r){let c=l.tiles.get(o);if(!c||!a)continue;let h=se(c);h.globalCompositeOperation="destination-out",h.globalAlpha=e.opacity,h.drawImage(a,0,0),h.globalCompositeOperation="source-over",h.globalAlpha=1,s(l.by,o,c)}}}else{let r=this.layers.get(e.by),o=new Set(e.touched);if(e.magic?.glow)for(let a of this.#p(e,r))o.add(a);for(let a of e.touched){let l=this.#l(e,a);if(!l)continue;let c=ze(this.grid,a),h=r.tiles.get(a);h||(h=ge(c.w,c.h),r.tiles.set(a,h));let u=se(h);u.globalAlpha=e.opacity,u.drawImage(l,0,0),u.globalAlpha=1}if(e.magic?.sparkle)for(let a of this.#g(e,r))o.add(a);for(let a of o)s(e.by,a,r.tiles.get(a)??null);n.painted=!0}for(let r of e.touched)this.#n(r);for(let r of n.values())for(let o of r.keys())this.#n(o);return n}drop(t){let e=this.strokes.get(t);if(e){this.strokes.delete(t);for(let n of e.touched)this.#n(n)}}#p(t,e){let n=za(t.dabs);if(!n)return[];let s=Math.max(6,Math.min(40,(t.dabs[0]?.size??8)*1.6)),r=Math.floor(n.x0-s*2),o=Math.floor(n.y0-s*2),a=Math.ceil(n.x1-n.x0+s*4),l=Math.ceil(n.y1-n.y0+s*4),c=xT,h=Math.max(1,Math.ceil(a/c)),u=Math.max(1,Math.ceil(l/c)),d=ge(h,u),f=se(d);f.imageSmoothingQuality="medium";for(let m of t.touched){let _=this.#l(t,m);if(!_)continue;let E=ze(this.grid,m);f.drawImage(_,(E.x-r)/c,(E.y-o)/c,E.w/c,E.h/c)}let g=ge(h,u),x=se(g);x.filter=`blur(${s/c}px)`,x.drawImage(d,0,0),x.filter="none";let p=Bn(this.grid,{x0:r,y0:o,x1:r+a,y1:o+l});for(let m of p){let _=ze(this.grid,m),E=e.tiles.get(m);E||(E=ge(_.w,_.h),e.tiles.set(m,E));let b=se(E);b.globalAlpha=.85,b.imageSmoothingQuality="medium",b.drawImage(g,r-_.x,o-_.y,h*c,u*c),b.globalAlpha=1}return p}#g(t,e){let n=Gs(t.dabs[0]?.seed??5),s=new Set,r=20+n()*40;for(let o of t.dabs){if(o.dist<r)continue;r=o.dist+45+n()*70;let a=Math.max(6,o.size*(1.2+n()*1.2)),l=o.x+(n()-.5)*o.size*1.5,c=o.y+(n()-.5)*o.size*1.5,h=n()*.6;for(let u of Bn(this.grid,{x0:l-a,y0:c-a,x1:l+a,y1:c+a})){let d=ze(this.grid,u),f=e.tiles.get(u);f||(f=ge(d.w,d.h),e.tiles.set(u,f));let g=se(f);g.save(),g.translate(l-d.x,c-d.y),g.rotate(h),g.fillStyle="rgba(255,252,240,0.95)",g.beginPath();for(let x=0;x<8;x++){let p=x/8*Math.PI*2,m=x%2?a*.16:a;g.lineTo(Math.cos(p)*m,Math.sin(p)*m)}g.closePath(),g.fill(),g.restore(),s.add(u)}}return s}fill({x:t,y:e,by:n,colour:s,opacity:r=oe.fill.opacity,grain:o=oe.fill.grain}){let{w:a,h:l}=this.grid,c=Math.floor(t),h=Math.floor(e);if(c<0||h<0||c>=a||h>=l)return{ok:!1,reason:"outside",changed:new Map};this.flush();let u=this.#u(0,0,a,l),d=se(u).getImageData(0,0,a,l).data,f=at=>d[at*4+3]>=pT;if(f(h*a+c))return{ok:!1,reason:"on-paint",changed:new Map};let g=new Uint8Array(a*l),x=[[c,h]],p=0,m=c,_=c,E=h,b=h,T=a*l*mT;for(;x.length;){let[at,rt]=x.pop(),zt=at;for(;zt>0&&!f(rt*a+zt-1)&&!g[rt*a+zt-1];)zt--;let It=at;for(;It<a-1&&!f(rt*a+It+1)&&!g[rt*a+It+1];)It++;for(let Lt=zt;Lt<=It;Lt++){let X=rt*a+Lt;g[X]||f(X)||(g[X]=1,p++)}if(p>T)return{ok:!1,reason:"open",changed:new Map};m=Math.min(m,zt),_=Math.max(_,It),E=Math.min(E,rt),b=Math.max(b,rt);for(let Lt of[rt-1,rt+1]){if(Lt<0||Lt>=l)continue;let X=!1;for(let Q=zt;Q<=It;Q++){let yt=Lt*a+Q,Bt=!g[yt]&&!f(yt);Bt&&!X?(x.push([Q,Lt]),X=!0):Bt||(X=!1)}}}let S=2;m=Math.max(0,m-S),E=Math.max(0,E-S),_=Math.min(a-1,_+S),b=Math.min(l-1,b+S);let A=_-m+1,v=b-E+1,M=new Uint8Array(A*v);for(let at=0;at<v;at++){let rt=(E+at)*a;for(let zt=0;zt<A;zt++){let It=m+zt;for(let Lt=-S;Lt<=S;Lt++){let X=It+Lt;if(X>=0&&X<a&&g[rt+X]){M[at*A+zt]=1;break}}}}let R=parseInt(s.slice(1),16),[P,I,B]=[R>>16&255,R>>8&255,R&255],k=ge(A,v),U=se(k),V=U.createImageData(A,v),q=Math.round(255*r);for(let at=0;at<v;at++)for(let rt=0;rt<A;rt++){let zt=0;for(let Lt=-S;Lt<=S;Lt++){let X=at+Lt;if(X>=0&&X<v&&M[X*A+rt]){zt=1;break}}if(!zt)continue;let It=(at*A+rt)*4;V.data[It]=P,V.data[It+1]=I,V.data[It+2]=B,V.data[It+3]=q}if(U.putImageData(V,0,0),o>0){let at=this.grain.pattern(U,Math.round(Math.max(0,Math.min(1,o))*20)/20,m,E);at&&(U.globalCompositeOperation="destination-in",U.fillStyle=at,U.fillRect(0,0,A,v),U.globalCompositeOperation="source-over")}let nt=this.ensureLayer(n),$=new Map,J=ge(this.grid.tile,this.grid.tile),et=se(J);for(let at of Bn(this.grid,{x0:m,y0:E,x1:_,y1:b})){let rt=ze(this.grid,at);et.clearRect(0,0,J.width,J.height),et.drawImage(k,m-rt.x,E-rt.y);let zt=this.#o(at);zt&&(et.globalCompositeOperation="destination-in",et.drawImage(zt,0,0),et.globalCompositeOperation="source-over");let It=nt.tiles.get(at);It||(It=ge(rt.w,rt.h),nt.tiles.set(at,It));let Lt=se(It);Lt.globalCompositeOperation="destination-over",Lt.drawImage(J,0,0,rt.w,rt.h,0,0,rt.w,rt.h),Lt.globalCompositeOperation="source-over",$.set(at,It),this.#n(at)}return{ok:!0,changed:$,area:p}}pick(t,e){this.flush();let n=Bn(this.grid,{x0:t,y0:e,x1:t,y1:e})[0],s=n?this.composite.get(n):null;if(!s)return null;let r=ze(this.grid,n),o=se(s).getImageData(Math.floor(t-r.x),Math.floor(e-r.y),1,1).data;return o[3]<60?null:`#${[o[0],o[1],o[2]].map(a=>a.toString(16).padStart(2,"0")).join("")}`}whoAt(t,e){this.flush();let n=Bn(this.grid,{x0:t,y0:e,x1:t,y1:e})[0];if(!n)return null;let s=ze(this.grid,n);for(let r of[...this.order].reverse()){let o=this.layers.get(r)?.tiles.get(n);if(!o)continue;if(se(o).getImageData(Math.floor(t-s.x),Math.floor(e-s.y),1,1).data[3]>=60)return r}return null}#m(){return this.scratch??=ge(this.grid.tile,this.grid.tile),this.scratch}#y(t,e=null){let n=ze(this.grid,t),s=[...this.strokes.values()].filter(l=>l.touched.has(t)&&!l.wet);if(!s.length&&!this.order.some(l=>this.layers.get(l)?.tiles.has(t))){this.composite.delete(t);return}let r=this.composite.get(t);r||(r=ge(n.w,n.h),this.composite.set(t,r),e=null);let o=Fx(e,n.w,n.h);if(!o.w||!o.h)return;let a=se(r);a.save(),a.beginPath(),a.rect(o.x,o.y,o.w,o.h),a.clip(),a.clearRect(o.x,o.y,o.w,o.h);for(let l of this.order){let h=this.layers.get(l).tiles.get(t),u=s.filter(d=>d.def.kind==="erase"&&(d.by===l||d.everyone));if(h)if(u.length){let d=this.#m(),f=se(d);f.save(),f.beginPath(),f.rect(o.x,o.y,o.w,o.h),f.clip(),f.clearRect(o.x,o.y,o.w,o.h),f.drawImage(h,0,0),f.globalCompositeOperation="destination-out";for(let g of u){let x=this.#l(g,t);x&&(f.globalAlpha=g.opacity,f.drawImage(x,0,0))}f.restore(),a.drawImage(d,o.x,o.y,o.w,o.h,o.x,o.y,o.w,o.h)}else a.drawImage(h,0,0);for(let d of s){if(d.by!==l||d.def.kind==="erase"||d.def.kind==="smudge")continue;let f=this.#l(d,t);f&&(a.globalAlpha=d.opacity*(d.live?.9:1),a.drawImage(f,0,0),a.globalAlpha=1)}}a.restore()}keys(){return this.flush(),[...this.composite.keys()]}clear(){let t=new Set([...this.composite.keys()]);this.layers.clear(),this.order=[],this.composite.clear(),this.strokes.clear(),this.dirty.clear(),this.onChange(t)}},Bx=new WeakMap;function nu(i,t,e){if(!i||!(t>=0&&t<=1&&e>=0&&e<=1))return null;let n=Bx.get(i);if(!n){let s=i.naturalWidth||i.width,r=i.naturalHeight||i.height;if(!s||!r)return null;let o=Math.min(1024,s),a=Math.max(1,Math.round(o*r/s)),l=ge(o,a),c=se(l);c.drawImage(i,0,0,o,a),n={x:c,w:o,h:a},Bx.set(i,n)}try{let s=n.x.getImageData(Math.min(n.w-1,Math.floor(t*n.w)),Math.min(n.h-1,Math.floor(e*n.h)),1,1).data;return`#${[s[0],s[1],s[2]].map(r=>r.toString(16).padStart(2,"0")).join("")}`}catch{return null}}function yT(i){let t=se(i).getImageData(0,0,i.width,i.height).data;for(let e=3;e<t.length;e+=4)if(t[e]>3)return!0;return!1}var tp=.85,Hx=64;function Gx(i,t=64){let e=255/(t-1);for(let n=3;n<i.length;n+=4)i[n]=Math.round(Math.round(i[n]/e)*e);return i}var vT=`
const roundAlpha = ${Gx.toString()};
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
};`,ps,_T=0,fo=new Map;function bT(){if(ps!==void 0)return ps;try{if(typeof Worker>"u"||typeof OffscreenCanvas>"u"||typeof createImageBitmap>"u")throw new Error("no workers here");ps=new Worker(URL.createObjectURL(new Blob([vT],{type:"text/javascript"}))),ps.onmessage=({data:i})=>{let t=fo.get(i.id);t&&(fo.delete(i.id),i.error?t.fail(new Error(i.error)):t.done(i.url))},ps.onerror=()=>{ps=!1;for(let i of fo.values())i.fail(new Error("the encoder stopped"));fo.clear()}}catch{ps=!1}return ps}function ep(i,t=!1,e=null){if(!i)return Promise.resolve(null);let n=bT();if(!n)return zx(i,t,e);let s=++_T,r=createImageBitmap(i);return new Promise(o=>{fo.set(s,{done:o,fail:()=>o(Qh(i))}),Promise.all([r,e]).then(([a])=>n.postMessage({id:s,bitmap:a,sure:t,quality:tp,levels:Hx},[a])).catch(()=>{fo.delete(s),o(zx(i,t,null))})})}function MT(i){let t=ge(i.width,i.height),e=se(t);e.drawImage(i,0,0);let n=e.getImageData(0,0,t.width,t.height);return Gx(n.data,Hx),e.putImageData(n,0,0),t}function zx(i,t,e=null){if(!t&&!yT(i))return Promise.resolve(null);let n=MT(i);return typeof n.toBlob!="function"||typeof FileReader>"u"?Promise.resolve(Qh(n)):Promise.resolve(e).then(()=>new Promise(s=>{n.toBlob(r=>{if(!r){s(Qh(n));return}let o=new FileReader;o.onload=()=>s(o.result),o.onerror=()=>s(Qh(n)),o.readAsDataURL(r)},"image/webp",tp)}))}function Qh(i){let t=i.toDataURL("image/webp",tp);return t.startsWith("data:image/webp")?t:i.toDataURL("image/png")}var Vx=48;function iu(i,t=()=>document.createElement("canvas")){let e=i?.naturalWidth||i?.width,n=i?.naturalHeight||i?.height;if(!e||!n)return null;let s=Vx,r=Math.max(2,Math.round(Vx*n/e));try{let o=t();o.width=s,o.height=r;let a=o.getContext("2d",{willReadFrequently:!0});return a.imageSmoothingQuality="high",a.drawImage(i,0,0,s,r),ux(a.getImageData(0,0,s,r).data,s,r)}catch{return null}}var xi=Object.freeze({nameChars:160,textChars:360,ellipsis:"\u2026",step:.06}),Fi=.01,Wx=typeof Intl<"u"&&typeof Intl.Segmenter=="function"?new Intl.Segmenter(void 0,{granularity:"grapheme"}):null,Ws=i=>Wx?Array.from(Wx.segment(i),t=>t.segment):Array.from(i);function su(i,t){let e=Ws(i);return e.length>t?`${e.slice(0,Math.max(0,t-1)).join("").trimEnd()}${xi.ellipsis}`:i}function Ui(i,t=1/0){let e=String(i??"");try{e=e.normalize("NFC")}catch{}return e=e.replace(/<br\s*\/?>/gi,`
`).replace(/\\n/g,`
`),e=e.replace(/\r\n?|[\u{b}\u{c}\u{85}\u{2028}\u{2029}]/gu,`
`),e=e.replace(/[\u{0}-\u{8}\u{e}-\u{1f}\u{7f}-\u{9f}\u{200b}\u{feff}\u{2060}]/gu,""),e=e.replace(/[\t\u{a0}\u{1680}\u{2000}-\u{200a}\u{202f}\u{205f}\u{3000}]/gu," "),e=e.split(`
`).map(n=>n.replace(/ {2,}/g," ").trim()).filter(Boolean).join(`
`),su(e,t)}function ru(i){let t=Ui(i?.name??i?.id??""),e=Ui(i?.title??"",xi.textChars);if(e)return{name:su(t,xi.nameChars),text:e};let[n="",...s]=t.split(`
`);return{name:su(n,xi.nameChars),text:su(s.join(`
`),xi.textChars)}}function Yx(i,{long:t=18}={}){let{name:e,text:n}=ru(i);return!e&&!n||!n&&Ws(e).length<=t?null:{name:e,text:n}}var sp=i=>JSON.stringify([i?.name??null,i?.title??null,ds(i?.badges)]),wT=/[\u{1100}-\u{11ff}\u{2e80}-\u{303e}\u{3041}-\u{33ff}\u{3400}-\u{4dbf}\u{4e00}-\u{9fff}\u{a960}-\u{a97f}\u{ac00}-\u{d7af}\u{f900}-\u{faff}\u{fe30}-\u{fe4f}\u{ff00}-\u{ffef}\u{20000}-\u{3134f}]/u,ST=new Set([..."\u3001\u3002\uFF0C\uFF0E\u30FB\uFF1A\uFF1B\uFF01\uFF1F\uFF09\uFF3D\uFF5D\u3015\u3009\u300B\u300D\u300F\u3011\u3019\u3017\u301F\u2019\u201D\u203C\u2047\u2048\u2049\u309D\u309E\u30FD\u30FE\u3005\u30FC\u301C\uFF5E\u2026\u2025\u3041\u3043\u3045\u3047\u3049\u3063\u3083\u3085\u3087\u308E\u3095\u3096\u30A1\u30A3\u30A5\u30A7\u30A9\u30C3\u30E3\u30E5\u30E7\u30EE\u30F5\u30F6"]),TT=new Set([..."\uFF08\uFF3B\uFF5B\u3014\u3008\u300A\u300C\u300E\u3010\u3018\u3016\u301D\u2018\u201C"]),ET=new Set(["-","\u2010","\u2011","\u2013","\u2014","/"]),Xx=(()=>{try{return typeof Intl<"u"&&typeof Intl.Segmenter=="function"?new Intl.Segmenter("ja",{granularity:"word"}):null}catch{return null}})(),ip=i=>{let t=Ws(i);return{text:i,kind:"cjk",noBefore:ST.has(t[0]),noAfter:TT.has(t.at(-1))}};function AT(i){return Xx?Array.from(Xx.segment(i),t=>ip(t.segment)):Ws(i).map(ip)}function CT(i){let t=Ws(i),e=[],n="",s="",r=(o=!1)=>{n&&(e.push({text:n,kind:"word",hyphen:o}),n=""),s&&(e.push(...AT(s)),s="")};for(let o=0;o<t.length;o++){let a=t[o];if(/^\s+$/u.test(a))r(),e.at(-1)?.kind!=="space"&&e.push({text:" ",kind:"space"});else if(wT.test(a))n&&r(),s+=a;else{s&&r(),n+=a;let l=t[o+1];ET.has(a)&&n.length>1&&l!==void 0&&/[\p{L}\p{N}]/u.test(l)&&r(!0)}}return r(),e}function rp(i,t){return i.kind==="space"||t.kind==="space"?!0:i.noAfter||t.noBefore?!1:i.kind==="cjk"||t.kind==="cjk"||i.hyphen===!0}function RT(i,t,e){let n=[],s=0;for(;s<i.length;){let r=s;for(;r+1<i.length&&!rp(i[r],i[r+1]);)r++;let o=i.slice(s,r+1),a=o.reduce((l,c)=>l+(c.kind==="space"?0:t(c.text)),0)>e+Fi;for(let l of o){let c=l.kind==="space"?[]:Ws(l.text);if(a&&c.length>1)for(let h of c)n.push(l.kind==="word"?{text:h,kind:"cjk"}:ip(h));else n.push(l)}s=r+1}return n}function $x(i,t,e){let n=[],s=i.length,r=0;for(;r<s;){for(;r<s&&i[r].kind==="space";)r++;if(r>=s)break;let o=r,a=0,l=-1,c=r;for(;c<s&&!(i[c].kind!=="space"&&c>o&&a+t[c]>e+Fi);c++)a+=t[c],c+1<s&&rp(i[c],i[c+1])&&(l=c+1);let h=c>=s?s:l>o?l:c;n.push([o,h]),r=h}return n}var PT=(i,t,[e,n])=>{let s=n;for(;s>e&&i[s-1].kind==="space";)s--;let r=0;for(let o=e;o<s;o++)r+=t[o];return r};function kT(i,t,e){let n=$x(i,t,e);if(n.length<2)return n;let s=0;for(let a=0;a<i.length;){let l=a,c=i[a].kind==="space"?0:t[a];for(;l+1<i.length&&!rp(i[l],i[l+1]);)l++,c+=t[l];s=Math.max(s,c),a=l+1}let r=e,o=n;for(let a=0;a<14&&r-s>.5;a++){let l=(s+r)/2,c=$x(i,t,l);c.length<=n.length&&c.every(h=>PT(i,t,h)<=l+Fi)?(o=c,r=l):s=l}return o}function Zx(i,t,e){let n=[];return Ui(i).split(`
`).filter(Boolean).forEach((s,r)=>{let o=RT(CT(s),t,e);if(!o.length)return;let a=o.map(l=>t(l.text));for(let[l,c]of kT(o,a,e)){let h=c;for(;h>l&&o[h-1].kind==="space";)h--;let u=o.slice(l,h).map(d=>d.text).join("");n.push({text:u,width:t(u),atoms:o,from:l,paragraph:r})}}),n}function IT(i,t,e){if(t(i)<=e+Fi)return i;let n=Ws(i),s=n.length;for(;s>0&&t(n.slice(0,s).join("").trimEnd()+xi.ellipsis)>e+Fi;)s--;let r=n.slice(0,s).join(""),o=r.lastIndexOf(" ");return o>r.length*.45&&/\S$/.test(r)&&n[s]!==void 0&&n[s]!==" "&&(r=r.slice(0,o)),r.trimEnd().replace(/[,;:\-\u{2010}\u{2013}\u{2014}/\u{3001}\u{ff0c}]+$/u,"")+xi.ellipsis}function np(i,{measureAt:t,width:e,sizes:n,maxLines:s,lineHeight:r=1.15}){let o=(x,p,m)=>({size:x,lineHeight:r,lines:p.map(({text:_,width:E})=>({text:_,width:E})),height:p.length*x*r,truncated:m});if(!Ui(i))return o(n.at(-1),[],!1);for(let x of n){let p=Zx(i,t(x),e);if(p.length<=s&&p.every(m=>m.width<=e+.5))return o(x,p,!1)}let a=n.at(-1),l=t(a),c=Zx(i,l,e),h=c.slice(0,s),u=h.at(-1),d=u.atoms.slice(u.from).map(x=>x.text).join("").trim(),f=c.length>s,g=f&&l(d+xi.ellipsis)<=e+Fi?d+xi.ellipsis:IT(d,l,e);return h[h.length-1]={text:g,width:l(g)},o(a,h,f||g!==d)}function qx(i,t,e=xi.step){let n=[];for(let s=i;s>t;s=Math.min(s-1,Math.round(s*(1-e))))n.push(s);return n.push(t),[...new Set(n)]}function jx({name:i,text:t},e){let{width:n,maxHeight:s,gap:r=12}=e,o={name:Ui(i),text:Ui(t)},a=qx(e.name.max,e.name.min),l=qx(e.text.max,e.text.min),c=e.name.comfort??.7,h=(m,_=e.name.maxLines)=>np(o.name,{measureAt:e.measureName,width:n,sizes:m,maxLines:_,lineHeight:e.name.lineHeight}),u=m=>{for(let b=1;b<=e.text.maxLines;b++)for(let T of l){let S=np(o.text,{measureAt:e.measureText,width:n,sizes:[T],maxLines:b,lineHeight:e.text.lineHeight});if(!S.truncated&&S.height<=m+Fi)return S}let _=l.at(-1),E=Math.min(e.text.maxLines,Math.floor((m+Fi)/(_*e.text.lineHeight)));return E<1?null:np(o.text,{measureAt:e.measureText,width:n,sizes:[_],maxLines:E,lineHeight:e.text.lineHeight})},d=(m,_)=>({name:m,text:_,gap:_?r:0,height:m.height+(_?r+_.height:0),truncated:{name:m.truncated,text:_?.truncated??!1},full:o}),f=e.name.max*(e.name.floor??.62),g=null;t:for(let m=1;m<=e.name.maxLines;m++){let _=m<e.name.maxLines?a.filter(E=>E>=e.name.max*c):a;for(let E of _){if(g&&E<f)break t;let b=h([E],m);if(b.truncated||b.height>s+Fi)continue;if(!o.text)return d(b,null);let T=u(s-b.height-r);if(T){if(!T.truncated)return d(b,T);g??=d(b,T)}}}if(g)return g;let x=h([e.name.min]),p=o.text?u(s-x.height-r):null;return d(x,p)}var op=Object.freeze({gap:14,name:Object.freeze({family:"sans-serif",weight:800,max:58,min:32,maxLines:2,lineHeight:1.06,tracking:.03,upper:!0}),text:Object.freeze({family:"sans-serif",weight:700,max:34,min:24,maxLines:3,lineHeight:1.18,tracking:0,upper:!1})}),Kx=(i,t)=>`${i.weight} ${t}px ${i.family}`;function ou({canvas:i=()=>document.createElement("canvas")}={}){let t=null,e=()=>t??=i().getContext("2d"),n=r=>o=>{let a=e();return a.font=Kx(r,o),"letterSpacing"in a&&(a.letterSpacing=`${(r.tracking??0)*o}px`),l=>{let c=a.measureText(l);return Number.isFinite(c?.width)?c.width:[...l].length*o*.55}},s=(r,o)=>({...r,...o??{}});return{textOf:ru,fit(r,o={}){let a=s(op.name,o.name),l=s(op.text,o.text),{name:c,text:h}=ru(r),u=jx({name:a.upper?c.toLocaleUpperCase("en"):c,text:l.upper?h.toLocaleUpperCase("en"):h},{width:o.width,maxHeight:o.maxHeight,gap:o.gap??op.gap,name:a,text:l,measureName:n(a),measureText:n(l)});return u.full={name:Ui(c),text:Ui(h)},u.style={name:a,text:l},u},draw(r,o,a,l={}){let c={ink:"#231c10",textInk:"rgba(35,28,16,0.86)",rule:"rgba(35,28,16,0.38)",embolden:.04,emboss:null,...l},{x:h,y:u,w:d,h:f}=a,g=u+(f-o.height)/2;r.save(),r.textAlign="center",r.textBaseline="middle",r.lineJoin="round";let x=(p,m,_,E)=>{let b=p.size;r.font=Kx(m,b);let T=(m.tracking??0)*b;"letterSpacing"in r&&(r.letterSpacing=`${T}px`),p.lines.forEach((S,A)=>{let v=g+(A+.5)*b*p.lineHeight+b*.04,M=h+d/2+(T?T/2:0);c.emboss&&(r.fillStyle=c.emboss,r.fillText(S.text,M,v+Math.max(1,b*.035))),r.fillStyle=_,E>0&&(r.strokeStyle=_,r.lineWidth=b*E,r.strokeText(S.text,M,v)),r.fillText(S.text,M,v)}),g+=p.height};if(x(o.name,o.style.name,c.ink,c.embolden),o.text){if(c.rule){r.fillStyle=c.rule;let p=Math.min(d*.32,150);r.fillRect(h+(d-p)/2,g+o.gap/2-1,p,2)}g+=o.gap,x(o.text,o.style.text,c.textInk,0)}"letterSpacing"in r&&(r.letterSpacing="0px"),r.restore()}}}var LT=4e3,au=class{constructor({images:t=new Hs,onContextLost:e=null}={}){this.images=t,this.onContextLost=e,this.name="three",this.capabilities={lights:!0,shadows:!0,post:!0,particles:!0,marks:!0,zoneOutlines:!0,chalk:!0,camera:!1,capture:!0,footlights:!0},this.views=new Map,this.adding=new Set,this.tier="high",this.needsRebuild=!1,this.zoneSetting="off",this.calm=!1,this.disposed=!1,this.ready=!1,this.sharedPool=new Map,this.shadowWatch=new Wh,this.shadowDirty=!0}#t(t,e){let n=this.sharedPool.get(t);return n||(n=this.tracker.add(e()),this.sharedPool.set(t,n)),n}mount(t,{quality:e="high",pixelRatio:n=1,width:s=1280,height:r=720}={}){this.tier=e,this.settings=j0(e),this.element=t,this.tracker=new Ah,this.canvas=document.createElement("canvas"),this.canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;",t.append(this.canvas),this.renderer=new yh({canvas:this.canvas,antialias:!this.settings.post,powerPreference:"high-performance"}),this.renderer.info.autoReset=!1,this.renderer.shadowMap.enabled=this.settings.shadows,this.renderer.shadowMap.autoUpdate=!1,this.renderer.shadowMap.needsUpdate=!0,this.renderer.shadowMap.type=Ns,this.renderer.outputColorSpace=Ce,this.renderer.toneMapping=Cn,this.scene=new ra,this.camera=new Ye,this.softDot=this.tracker.add(ox()),this.canvas.addEventListener("webglcontextlost",o=>{o.preventDefault(),!this.disposed&&(this.contextLost=!0,this.onContextLost?.())}),this.#e(s,r,n)}#e(t,e,n){this.width=t,this.height=e,this.ratio=K0(t,e,n,this.settings),this.view=Lo(t,e),this.renderer.setPixelRatio(this.ratio),this.renderer.setSize(t,e,!1),this.rig&&Ch(this.camera,this.rig,this.view),this.post?.setSize(Math.round(t*this.ratio),Math.round(e*this.ratio))}resize(t,e,n=1){this.disposed||this.#e(t,e,n)}setView(t){this.disposed||!t||(this.view=t,this.rig&&Ch(this.camera,this.rig,this.view))}setQuality(t){t!==this.tier&&(this.tier=t,this.needsRebuild=!0)}setCalm(t){this.calm=!!t,this.fx&&(this.fx.calm=this.calm),this.post?.setCalm(this.calm)}setZoneSetting(t){this.zoneSetting=t}setFootlights(t){this.world?.setFootlights(t),this.shadowDirty=!0}async load(t,e,n=[]){this.description=t,this.skin=e,this.rig=ar(t.painting,t.rig),this.fx=null,await Promise.all((e.fonts??[]).map(r=>document.fonts?.load(r).catch(()=>null)));let s=await this.images.loadImage(t.painting.src);if(!s)throw new Error(`the painting "${t.painting.src}" could not be loaded`);this.disposed||(this.paintingImage=s,this.grade=iu(s),Ch(this.camera,this.rig,this.view),this.#r(s),this.world=await new kh({scene:t,rig:this.rig,tracker:this.tracker,softDot:this.softDot,settings:this.settings}).build(s),this.scene.add(this.world.group),this.zones=new Fh({scene:this.scene,rig:this.rig,zones:t.zones,tracker:this.tracker}),this.boardLabels=new Uh({scene:this.scene,rig:this.rig,zones:t.zones,tracker:this.tracker,cardHeight:e.size.h*t.cardScale}),this.marks=new Bh({scene:this.scene,tracker:this.tracker,softDot:this.softDot}),this.fx=new Oh({scene:this.scene,rig:this.rig,tracker:this.tracker,softDot:this.softDot,settings:this.settings,cardHeight:e.size.h*t.cardScale}),this.fx.calm=this.calm,this.chalkTiles=new Zh({scene:this.scene,rig:this.rig}),this.chalkBox=new qh({scene:this.scene,rig:this.rig,at:t.chalk.box??lo,tracker:this.tracker}),this.chalkBox.setVisible(!1),await Promise.all(n.map(r=>this.addCard(r))),this.settings.post&&(this.post=new Vh(this.renderer,this.scene,this.camera,{width:Math.round(this.width*this.ratio),height:Math.round(this.height*this.ratio),samples:this.settings.msaa}),this.post.setCalm(this.calm)),this.#i(this.tracker),await this.#n(this.scene),this.world.setFootlights(t.footlights),this.ready=!0)}async#n(t){let e=0;try{let n=this.renderer.getRenderTarget();this.renderer.setRenderTarget(this.post?.target??null);let s=null;try{this.renderer.compileAsync?s=this.renderer.compileAsync(t,this.camera,this.scene):this.renderer.compile(t,this.camera,this.scene)}finally{this.renderer.setRenderTarget(n)}await Promise.race([s,new Promise(r=>{e=setTimeout(r,LT)})])}catch(n){console.warn("stagecraft | a shader could not be built ahead; it will be at the first draw",n)}finally{clearTimeout(e)}}#i(t){let e=this.renderer;if(typeof e?.initTexture=="function"){for(let n of t.items)if(!(!n.isTexture||!n.image))try{e.initTexture(n)}catch{}}}#r(t){let e=new Qr(this.renderer),n=new Ve(t);n.mapping=Zr,n.colorSpace=Ce,n.needsUpdate=!0;let s=e.fromEquirectangular(n);this.tracker.add(s),this.scene.environment=s.texture,this.scene.environmentIntensity=.6,n.dispose(),e.dispose()}async addCard(t){if(!(this.views.has(t.id)||this.adding.has(t.id)||this.disposed)){this.adding.add(t.id);try{this.titleBlock??=ou();let e={tracker:this.tracker,shared:(s,r)=>this.#t(s,r),images:this.images,titleBlock:this.titleBlock,softDot:this.softDot,scene:this.scene,emoteTexture:s=>this.#s(s),lightAt:(s,r)=>this.#a(s,r),ringTexture:()=>this.#t("ring",()=>Ke(sx(),{anisotropy:1})),reticleTexture:(s,r)=>this.#t(`reticle:${s.join("|")}:${r.toFixed(3)}`,()=>Ke(Th(s,r),{anisotropy:1})),haloTexture:(s,r)=>this.#t(`halo:${s}:${r}`,()=>Ke(rx(s,r),{anisotropy:1}))},n=new Nh(t,this.skin,e,this.description.cardScale*(t.size??1));if(await n.build(),this.disposed){n.dispose();return}if(this.ready&&(n.scope&&this.#i(n.scope),await this.#n(n.root)),this.disposed){n.dispose();return}this.views.set(t.id,n),this.scene.add(n.root,n.blob,n.ring,n.reticle),this.shadowDirty=!0,t.emote?.id&&await n.setEmote(t.emote.id)}finally{this.adding.delete(t.id)}}}removeCard(t){let e=this.views.get(t);e&&(e.dispose(),this.views.delete(t),this.shadowDirty=!0)}async refreshCard(t){let e=this.views.get(t.id);!e||this.disposed||await e.refresh(t)}#s(t){if(this.emoteCache??=new Map,!this.emoteCache.has(t)){let e=xn[t]?.svg;this.emoteCache.set(t,e?new Promise(n=>{let s=new Image;s.onload=()=>{let r=document.createElement("canvas");r.width=r.height=256,r.getContext("2d").drawImage(s,0,0,256,256),n(this.tracker.add(Ke(r)))},s.onerror=()=>n(null),s.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(e.replace("<svg ",'<svg width="256" height="256" '))}`}):Promise.resolve(null))}return this.emoteCache.get(t)}draw(t){if(!this.ready||this.disposed||this.contextLost)return;let e=t.t;this.world.update(e);for(let n of t.cards)this.views.get(n.id)?.pose(n);this.zones.update(t.zones,this.zoneSetting,e,t.board??null),this.boardLabels.update(t.board??null),this.marks.update(t.marks,this.views,e),this.fx.update(t.bonks,e),this.settings.shadows&&(this.shadowWatch.update(t.cards)||this.shadowDirty)&&(this.renderer.shadowMap.needsUpdate=!0,this.shadowDirty=!1),this.renderer.info.reset(),this.post?this.post.render(e):this.renderer.render(this.scene,this.camera)}#o(t,e){return this.raycaster??=new ba,this.ndc??=new Mt,this.ndc.set(t/this.width*2-1,-(e/this.height*2-1)),this.raycaster.setFromCamera(this.ndc,this.camera),this.raycaster}pick(t,e){if(!this.ready)return null;let n=this.pickList??=[];n.length=0;for(let o of this.views.values())for(let a of o.pickables)n.push(a);if(this.chalkBox?.group.visible)for(let o of this.chalkBox.pickables)n.push(o);if(!n.length)return null;let s=this.#o(t,e).intersectObjects(n,!1)[0];if(!s)return null;let r={x:s.point.x,y:s.point.y,z:s.point.z};return s.object.userData.chalk?{kind:"chalk",colour:s.object.userData.chalk,point:r}:s.object.userData.magic?{kind:"magic",point:r}:s.object.userData.eraser?{kind:"eraser",point:r}:{kind:"card",id:s.object.userData.cardId,point:r}}paintingAt(t,e){this.backPlane??=new yn(new D(0,0,1),ii),this.hit??=new D;let n=this.hit;if(!this.#o(t,e).ray.intersectPlane(this.backPlane,n))return null;let{cx:s,cy:r,f:o,floorY:a}=this.rig.cam,l=o/(o+ii),c=s+n.x*l,h=r+(a-r-n.y)*l,[u,d]=this.rig.fractionOfScreen(c,h);return u>=0&&u<=1&&d>=0&&d<=1?{x:u,y:d}:null}floorAt(t,e,n=0){return this.floorPlane??=new yn(new D(0,1,0),0),this.floorPlane.constant=-n,this.hit??=new D,this.#o(t,e).ray.intersectPlane(this.floorPlane,this.hit)?{x:this.hit.x,z:this.hit.z}:null}project({X:t,Y:e,Z:n}){let s=this.rig.screenOf(t,e,n);return{x:(s.x-this.view.ox)*this.view.s,y:(s.y-this.view.oy)*this.view.s,k:s.k}}setChalkTiles(t,e,n=!1){this.chalkTiles?.update(t,e,n)}setChalkHidden(t){this.chalkTiles?.setHidden(t)}setChalkBox(t){this.chalkBox?.setVisible(t),this.shadowDirty=!0}setChalkBoxAt(t){this.rig&&this.chalkBox?.moveTo(this.rig,t),this.shadowDirty=!0}wetMap(t){return this.rig&&this.view?Ix({size:this.rig.size,map:this.rig.map,view:this.view},t):null}paintingColour(t,e){return nu(this.paintingImage,t,e)}#a(t,e){if(!this.grade||!this.rig)return null;let[n,s]=this.rig.fractionOf(t,e);return Lh(this.grade,n,s,{strength:this.description.grade??1})}async capture(){return this.post?this.post.render(0):this.renderer.render(this.scene,this.camera),new Promise(t=>this.canvas.toBlob(t,"image/png"))}stats(){let t=this.renderer?.info;return t?{calls:t.render.calls,triangles:t.render.triangles,textures:t.memory.textures,geometries:t.memory.geometries,tracked:this.tracker.size}:null}unmount(){this.canvas?.remove()}dispose(){if(!this.disposed){this.disposed=!0;for(let t of this.views.values())t.dispose();this.views.clear(),this.sharedPool.clear(),this.chalkTiles?.dispose(),this.post?.dispose(),this.tracker?.disposeAll(),this.scene?.environment?.dispose?.(),this.renderer?.dispose(),this.contextLost||this.renderer?.forceContextLoss(),this.unmount()}}};var Wa=Math.PI/180,IP=Object.freeze([1,0,0,1,0,0]),Va=(i,t)=>[i[0]*t[0]+i[2]*t[1],i[1]*t[0]+i[3]*t[1],i[0]*t[2]+i[2]*t[3],i[1]*t[2]+i[3]*t[3],i[0]*t[4]+i[2]*t[5]+i[4],i[1]*t[4]+i[3]*t[5]+i[5]],Jx=(i,t)=>[1,0,0,1,i,t],Qx=(i,t=i)=>[i,0,0,t,0,0],ty=i=>[Math.cos(i),Math.sin(i),-Math.sin(i),Math.cos(i),0,0],DT=(i,t,e)=>({x:i[0]*t+i[2]*e+i[4],y:i[1]*t+i[3]*e+i[5]});function NT(i){let t=i[0]*i[3]-i[1]*i[2];return Math.abs(t)<1e-12?null:[i[3]/t,-i[1]/t,-i[2]/t,i[0]/t,(i[2]*i[5]-i[3]*i[4])/t,(i[1]*i[4]-i[0]*i[5])/t]}var lu=(i,t,e)=>({x:(t-i.ox)*i.s,y:(e-i.oy)*i.s}),ey=(i,t,e)=>({x:t/i.s+i.ox,y:e/i.s+i.oy});function ms(i,t,{X:e,Y:n,Z:s}){let r=i.screenOf(e,n,s);return{...lu(t,r.x,r.y),k:r.k}}function ny(i,t,e,n,s=0){let{cam:r}=i,o=ey(t,e,n),a=r.floorY-s-r.cy;if(a===0)return null;let l=(o.y-r.cy)/a;return l>0?{x:(o.x-r.cx)/l,z:r.f-r.f/l}:null}function iy(i,t,e,n){let s=ey(t,e,n),[r,o]=i.fractionOfScreen(s.x,s.y);return r>=0&&r<=1&&o>=0&&o<=1?{x:r,y:o}:null}function ap(i,t,e,{stickLen:n=134}={}){let s=i.grip??0,r=i.scale??1,o=t.screenOf(i.x,i.lift??0,i.z),a=lu(e,o.x,o.y),l=o.k*e.s,c=1-.45*s,h=(i.lean??0)*Wa,u=n*r*s,d=(i.yaw??0)*Wa,f=Math.cos(d),g=Math.max(.55-.35*(i.down??0),Math.cos((i.pitch??0)*Wa)),x=Va(Jx(a.x,a.y),Va(Qx(l),ty(h*c))),p=Va(x,Va(Jx(0,-u),ty(h*(1-c)))),m=r*Math.max(.03,Math.abs(f)),_=r*(i.breathe??1)*(i.squash??1)*g;return{m:Va(p,Qx(m,_)),stick:x,at:a,k:o.k,px:l,back:f<0,side:Math.abs(Math.sin(d)),hinge:u,share:c}}function sy(i,t,e,n,s){let r=NT(i.m);if(!r)return null;let o=DT(r,n,s),{w:a,h:l}=e;if(o.x<-a/2||o.x>a/2||o.y<-l||o.y>Xs.depth)return null;let c=Math.max(0,-o.y)*(t.scale??1)*(t.breathe??1)*(t.squash??1);return(t.lift??0)+i.hinge+c}var Xs=Object.freeze({width:.5,depth:12}),ry=(i,t)=>i.z-t.z;var oy=-10*Wa,Xa=Object.freeze({at:[Qn.eraser.x,20,4],size:[50,32,30],hit:{y0:0,y1:60,half:29}});function ay(i,t,e){let n=i.standing(e);if(!n)return null;let s=Math.cos(oy),r=Math.sin(oy),o=(k,U,V)=>ms(i,t,{X:n.X+k*s+V*r,Y:U,Z:n.Z-k*r+V*s}),a=k=>k.map(([U,V,q])=>{let nt=o(U,V,q);return[nt.x,nt.y]}),{width:l,depth:c,wall:h,stick:u,hit:d}=Qn,f=4+h,g=yx.map((k,U)=>{let V=u.first+U*u.spacing,q=(U%2-.5)*6,nt=(U%3-1)*.07,$=o(V,-2,q),J=o(V-Math.sin(nt)*u.height,-2+Math.cos(nt)*u.height,q),et=o(V,4+d.height/2-14-d.height/2,0),at=o(V,4+d.height/2-14+d.height/2,0),rt=d.radius*et.k*t.s;return{colour:k,base:{x:$.x,y:$.y},top:{x:J.x,y:J.y},width:2*u.radius*$.k*t.s,hit:{x0:et.x-rt,x1:et.x+rt,y0:at.y,y1:et.y}}}),x=Qn.magic,p=o(x.x,-2,2),m=o(x.x-Math.sin(.06)*x.height,-2+Math.cos(.06)*x.height,2),_=o(x.x,4+d.height/2-14-d.height/2,0),E=o(x.x,4+d.height/2-14+d.height/2,0),b=d.radius*_.k*t.s,[T,S,A]=Xa.at,[v,M,R]=Xa.size,P=o(T,Xa.hit.y0,A),I=o(T,Xa.hit.y1,A),B=Xa.hit.half*P.k*t.s;return{z:n.Z,floor:a([[-l/2,4,-c/2],[l/2,4,-c/2],[l/2,4,c/2],[-l/2,4,c/2]]),back:a([[-l/2,4,-c/2],[l/2,4,-c/2],[l/2,f,-c/2],[-l/2,f,-c/2]]),left:a([[-l/2,4,-c/2],[-l/2,4,c/2],[-l/2,f,c/2],[-l/2,f,-c/2]]),right:a([[l/2,4,-c/2],[l/2,4,c/2],[l/2,f,c/2],[l/2,f,-c/2]]),front:a([[-l/2,4,c/2],[l/2,4,c/2],[l/2,f,c/2],[-l/2,f,c/2]]),sticks:g,magic:{base:{x:p.x,y:p.y},top:{x:m.x,y:m.y},width:2*x.radius*p.k*t.s,hit:{x0:_.x-b,x1:_.x+b,y0:E.y,y1:_.y}},eraser:{front:a([[T-v/2,S-M/2,A+R/2],[T+v/2,S-M/2,A+R/2],[T+v/2,S+M/2,A+R/2],[T-v/2,S+M/2,A+R/2]]),top:a([[T-v/2,S+M/2,A-R/2],[T+v/2,S+M/2,A-R/2],[T+v/2,S+M/2,A+R/2],[T-v/2,S+M/2,A+R/2]]),hit:{x0:P.x-B,x1:P.x+B,y0:I.y,y1:P.y}}}}var lp=(i,t,e)=>t>=i.x0&&t<=i.x1&&e>=i.y0&&e<=i.y1;function ly(i,t,e){if(!i)return null;if(lp(i.eraser.hit,t,e))return{kind:"eraser"};if(lp(i.magic.hit,t,e))return{kind:"magic"};for(let n of i.sticks)if(lp(n.hit,t,e))return{kind:"chalk",colour:n.colour};return null}var cy=.42,hy=.2,uy=.8,dy=22,OT=3,FT=1,cp=(i,t="#80512d")=>typeof i=="number"?`#${i.toString(16).padStart(6,"0")}`:t;function UT(i,t){let e=Math.min(2048,i),n=Math.round(e*t/i),s=document.createElement("canvas");return s.width=e,s.height=n,{canvas:s,ctx:s.getContext("2d"),cw:e,ch:n}}var cu=class{constructor({images:t,onContextLost:e=null}={}){this.images=t,this.onContextLost=e,this.name="flat",this.capabilities={lights:!1,shadows:!1,post:!1,particles:!1,marks:!0,zoneOutlines:!0,chalk:!0,camera:!1,capture:!0,footlights:!1},this.tier="flat",this.views=new Map,this.adding=new Set,this.emotes=new Map,this.calm=!1,this.zoneSetting="off",this.disposed=!1,this.ready=!1,this.order=[],this.flashes=[],this.zoneKey="",this.revision=0,this.chalkWall=null,this.chalkDirty=new Set,this.hidden=!1,this.boxShown=!1,this.draws=0}mount(t,{pixelRatio:e=1,width:n=1280,height:s=720}={}){if(this.element=t,this.canvas=document.createElement("canvas"),this.canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;",t.append(this.canvas),this.ctx=this.canvas.getContext("2d",{alpha:!1}),!this.ctx)throw new Error("this browser cannot draw on a 2D canvas");this.#t(n,s,e)}#t(t,e,n){this.width=t,this.height=e,this.ratio=Math.min(n||1,FT),this.view=Lo(t,e),this.canvas.width=Math.max(1,Math.round(t*this.ratio)),this.canvas.height=Math.max(1,Math.round(e*this.ratio)),this.backdrop=null,this.backdropKey="",this.occluderBitmaps=null,this.boxCache=null}resize(t,e,n=1){this.disposed||this.#t(t,e,n)}setView(t){this.disposed||!t||(this.view=t,this.occluderBitmaps=null,this.boxCache=null)}setQuality(){}setCalm(t){this.calm=!!t}setZoneSetting(t){this.zoneSetting=t,this.zoneKey=""}setFootlights(){}async load(t,e,n=[]){this.description=t,this.skin=e,this.rig=ar(t.painting,t.rig),await Promise.all((e.fonts??[]).map(a=>document.fonts?.load(a).catch(()=>null)));let s=await this.images.loadImage(t.painting.src);if(!s)throw new Error(`the painting "${t.painting.src}" could not be loaded`);if(this.disposed)return;this.painting=s,this.grade=iu(s);let[r,o]=this.rig.size;this.zoneLayer=UT(r,o),this.impact=wh(),this.markImage=Sh(),this.labelImages=new Map,this.occluders=t.occluders.map(a=>{let l=this.rig.standing([a.x,a.base]);return l?{poly:a.poly.map(([c,h])=>[this.rig.map.x(c),this.rig.map.y(h)]),z:l.Z}:null}).filter(Boolean),await Promise.all(n.map(a=>this.addCard(a))),this.ready=!0}async addCard(t){if(!(this.views.has(t.id)||this.adding.has(t.id)||this.disposed)){this.adding.add(t.id);try{let e=this.#e(),[n,s]=await Promise.all([eo(this.skin,t,e),this.skin.back(t,e)]);if(this.disposed)return;this.views.set(t.id,{id:t.id,person:t,face:this.#n(n),back:this.#n(s),w:this.skin.size.w,h:this.skin.size.h}),t.emote?.id&&this.#i(t.emote.id)}finally{this.adding.delete(t.id)}}}removeCard(t){this.views.delete(t)}#e(){return this.titleBlock??=ou(),{loadImage:this.images.loadImage,titleBlock:this.titleBlock}}async refreshCard(t){let e=this.views.get(t.id);if(!e||this.disposed)return;let n={...e.person,...t},s=this.#e(),[r,o]=await Promise.all([eo(this.skin,n,s),this.skin.back(n,s)]);this.disposed||this.views.get(t.id)!==e||(e.person=n,e.face=this.#n(r),e.back=this.#n(o))}#n(t){let{w:e,h:n}=this.skin.size;if(!(t.width>e*1.3))return t;let s=document.createElement("canvas");s.width=e,s.height=n;let r=s.getContext("2d");return r.imageSmoothingQuality="high",r.drawImage(t,0,0,e,n),s}#i(t){if(this.emotes.has(t))return this.emotes.get(t);this.emotes.set(t,null);let e=xn[t]?.svg;if(e){let n=new Image;n.onload=()=>this.emotes.set(t,n),n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(e.replace("<svg ",'<svg width="256" height="256" '))}`}return null}#r(){let{view:t,ratio:e}=this;this.#s([t.s,0,0,t.s,-t.ox*t.s,-t.oy*t.s],e)}#s(t,e=this.ratio){this.ctx.setTransform(t[0]*e,t[1]*e,t[2]*e,t[3]*e,t[4]*e,t[5]*e)}#o(){return this.boxShown?(this.boxCache??={layout:ay(this.rig,this.view,this.boxAt??this.description.chalk?.box??lo)},this.boxCache.layout):null}#a(t,e){let{rig:n,view:s,ratio:r}=this,o=t.board??null,a=this.description.zones.length?bh(this.description.zones,t.zones,this.zoneSetting,e,o):"",l=`${this.canvas.width}x${this.canvas.height}|${s.s},${s.ox},${s.oy}|${a}|${this.revision}|${this.hidden?1:0}`;if(this.backdrop&&l===this.backdropKey){this.chalkDirty.size&&this.#h();return}if(this.backdropKey=l,this.chalkDirty.clear(),!this.backdrop){let m=document.createElement("canvas");m.width=this.canvas.width,m.height=this.canvas.height,this.backdrop={canvas:m,ctx:m.getContext("2d",{alpha:!1})}}let c=this.backdrop.ctx,h=n.map,[u,d]=n.size;c.setTransform(1,0,0,1,0,0),c.globalAlpha=1,c.fillStyle="#0c0a08",c.fillRect(0,0,this.canvas.width,this.canvas.height),c.setTransform(s.s*r,0,0,s.s*r,-s.ox*s.s*r,-s.oy*s.s*r),c.imageSmoothingQuality="high";let f=u*h.s,g=d*h.s;c.drawImage(this.painting,h.ox,h.oy,f,g);let x=h.oy+g,p=s.oy+s.visH-x;if(p>0){let m=Math.min(p+8,g*.6);c.save(),c.globalAlpha=.55,c.translate(0,x),c.scale(1,-1),c.drawImage(this.painting,0,d-m/h.s,u,m/h.s,h.ox,-m,f,m),c.restore()}if(this.zoneLayer&&this.description.zones.length&&(a!==this.zoneKey&&(this.zoneKey=a,Mh(this.zoneLayer.ctx,this.zoneLayer.cw,this.zoneLayer.ch,this.description.zones,t.zones,this.zoneSetting,e,o)),c.drawImage(this.zoneLayer.canvas,h.ox,h.oy,f,g)),!this.hidden&&this.chalkWall)for(let m of this.chalkWall.composite.keys())this.#c(c,m)}#c(t,e){let n=this.chalkWall.composite.get(e);if(!n)return;let s=this.chalkWall.grid,r=ze(s,e),o=this.rig.map,[a,l]=this.rig.size,c=a*o.s,h=l*o.s;t.drawImage(n,o.ox+r.x/s.w*c,o.oy+r.y/s.h*h,r.w/s.w*c,r.h/s.h*h)}#h(){let{rig:t,view:e,ratio:n}=this,s=this.backdrop.ctx,r=this.chalkWall?.grid,o=t.map,[a,l]=t.size,c=a*o.s,h=l*o.s,u=1.5/(e.s*n);s.setTransform(e.s*n,0,0,e.s*n,-e.ox*e.s*n,-e.oy*e.s*n),s.globalAlpha=1,s.imageSmoothingQuality="high";for(let d of this.chalkDirty){let f=r?ze(r,d):null;if(!f)continue;let g=Math.max(o.ox,o.ox+f.x/r.w*c-u),x=Math.max(o.oy,o.oy+f.y/r.h*h-u),p=Math.min(o.ox+c,o.ox+(f.x+f.w)/r.w*c+u),m=Math.min(o.oy+h,o.oy+(f.y+f.h)/r.h*h+u);if(s.save(),s.beginPath(),s.rect(g,x,p-g,m-x),s.clip(),s.fillStyle="#0c0a08",s.fillRect(g,x,p-g,m-x),s.drawImage(this.painting,o.ox,o.oy,c,h),this.zoneLayer&&this.description.zones.length&&s.drawImage(this.zoneLayer.canvas,o.ox,o.oy,c,h),!this.hidden)for(let _ of Bn(r,{x0:f.x-2,y0:f.y-2,x1:f.x+f.w+2,y1:f.y+f.h+2}))this.#c(s,_);s.restore()}this.chalkDirty.clear()}draw(t){if(!this.ready||this.disposed)return;let{ctx:e,rig:n,view:s}=this,r=t.t;this.draws++,e.imageSmoothingQuality="medium",this.#a(t,r),e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="source-over",e.drawImage(this.backdrop.canvas,0,0),this.#d(t,r),this.#l(t);let o=[];for(let l of t.cards){let c=this.views.get(l.id);c&&o.push({kind:"card",z:l.z,c:l,v:c,pl:ap(l,n,s,{stickLen:this.skin.stick?.length??134})})}for(let l of this.occluders)o.push({kind:"occluder",z:l.z,o:l});let a=this.#o();a&&o.push({kind:"box",z:a.z,layout:a}),o.sort(ry);for(let l of o)l.kind==="card"?this.#p(l.c,l.v,l.pl):l.kind==="occluder"?this.#u(l.o):this.#y(l.layout);this.order=o,this.#x(t),this.#v(t,r)}#l(t){let{ctx:e,rig:n}=this;this.#r();for(let s of t.cards){let r=this.views.get(s.id);if(!r)continue;let o=s.grip??0,a=s.scale??1,l=n.screenOf(s.x,.6,s.z),c=r.w*a*(.95+.5*o)/2*l.k,h=(74+46*o)/2,u=n.screenOf(s.x,.6,s.z+h),d=n.screenOf(s.x,.6,s.z-h),f=Math.max(2,Math.abs(u.y-d.y)/2);s.selected||s.speaking?(e.globalAlpha=s.selected?.85:.6,e.fillStyle=s.selected?"#ff9a46":"#fff0c8",e.beginPath(),e.ellipse(l.x,l.y,c*1.45,f*1.6,0,0,Math.PI*2),e.fill()):(e.globalAlpha=.62-.26*o,e.fillStyle="#000",e.beginPath(),e.ellipse(l.x,l.y,c,f,0,0,Math.PI*2),e.fill()),s.controlled&&(e.globalAlpha=.95,e.strokeStyle="#ffd45a",e.lineWidth=4,e.beginPath(),e.ellipse(l.x,l.y,c*1.6,f*1.9,0,0,Math.PI*2),e.stroke())}e.globalAlpha=1}#d(t,e){let{ctx:n,rig:s}=this;this.#r();for(let r of t.marks.slice(0,6)){let o=r.target?1+.06*Math.sin(e*7):1,a=s.screenOf(r.X,1.2,r.Z),l=(r.target?190:150)*o*a.k,c=(r.target?120:96)*o/2,h=Math.abs(s.screenOf(r.X,1.2,r.Z+c).y-s.screenOf(r.X,1.2,r.Z-c).y);n.globalAlpha=Math.min(1,r.alpha)*(r.target?1:.8),n.drawImage(this.markImage,a.x-l/2,a.y-h/2,l,Math.max(h,4))}n.globalAlpha=1}#u(t){this.occluderBitmaps??=new Map;let e=this.occluderBitmaps.get(t);e===void 0&&(e=this.#f(t),this.occluderBitmaps.set(t,e)),e&&(this.ctx.setTransform(1,0,0,1,0,0),this.ctx.drawImage(e.canvas,e.x,e.y))}#f(t){let{view:e,ratio:n,rig:s}=this,r=t.poly.map(([b,T])=>lu(e,b,T)),o=Math.max(0,Math.floor(Math.min(...r.map(b=>b.x))*n)),a=Math.max(0,Math.floor(Math.min(...r.map(b=>b.y))*n)),l=Math.min(this.canvas.width,Math.ceil(Math.max(...r.map(b=>b.x))*n)),c=Math.min(this.canvas.height,Math.ceil(Math.max(...r.map(b=>b.y))*n));if(l<=o||c<=a)return null;let h=document.createElement("canvas");h.width=l-o,h.height=c-a;let u=h.getContext("2d");u.imageSmoothingQuality="high",u.save(),u.setTransform(e.s*n,0,0,e.s*n,-e.ox*e.s*n-o,-e.oy*e.s*n-a),u.beginPath(),t.poly.forEach(([b,T],S)=>S?u.lineTo(b,T):u.moveTo(b,T)),u.closePath(),u.clip();let[d,f]=s.size;u.drawImage(this.painting,s.map.ox,s.map.oy,d*s.map.s,f*s.map.s),u.restore();let g=t.poly.map(b=>b[1]),x=Math.min(fl,(Math.max(...g)-Math.min(...g))*pl)*e.s*n,p=ml(r.map(b=>[b.x*n-o,b.y*n-a]),h.width,h.height,x),m=document.createElement("canvas");m.width=h.width,m.height=h.height;let _=m.getContext("2d"),E=_?.createImageData?.(m.width,m.height);if(E?.data){for(let b=0;b<p.length;b++)E.data[b*4+3]=p[b];_.putImageData(E,0,0),u.globalCompositeOperation="destination-in",u.drawImage(m,0,0),u.globalCompositeOperation="source-over"}return{canvas:h,x:o,y:a}}#p(t,e,n,{ghost:s=!1}={}){let{ctx:r,skin:o}=this,a=e.w,l=e.h,c=t.scale??1,h=t.grip??0;if(!s&&h>.02){this.#s(n.stick);let f=n.hinge,g=cp(o.stick?.wood),x=cp(o.stick?.collar,"#b8924f"),p=Math.min(18*c,f);r.fillStyle=g,r.beginPath(),r.moveTo(-6.4*c,0),r.lineTo(-8.5*c,-f+p),r.lineTo(8.5*c,-f+p),r.lineTo(6.4*c,0),r.arc(0,0,6.4*c,0,Math.PI),r.closePath(),r.fill(),r.fillStyle="rgba(255,255,255,0.16)",r.fillRect(-4*c,-f+p,2.4*c,f-p),r.fillStyle=x,r.fillRect(-12.5*c,-f,25*c,p),r.fillStyle="rgba(0,0,0,0.25)",r.fillRect(-12.5*c,-f+p-3*c,25*c,3*c),r.strokeStyle=e.person.colour??"#e8e0c8",r.lineWidth=3.6,r.globalAlpha=Math.min(1,h*2),r.beginPath(),r.ellipse(0,0,21,9,0,0,Math.PI*2),r.stroke(),r.globalAlpha=1}this.#s(n.m),s&&(r.globalAlpha=.35);let u=cp(o.materials?.body?.color,"#e7dfcd"),d=(o.thickness??9)*n.side/2;r.fillStyle=u,r.fillRect(-a*Xs.width/2,0,a*Xs.width,Xs.depth),e.person.colour&&(r.fillStyle=e.person.colour,r.fillRect(-a*Xs.width/2+4,1,a*Xs.width-8,3)),r.fillStyle=u,r.fillRect(-a/2-d,-l+2,a+d*2,l-2),r.drawImage(n.back?e.back:e.face,-a/2,-l,a,l),!s&&t.down>.02&&(r.fillStyle=`rgba(0,0,0,${(.45*t.down).toFixed(3)})`,r.fillRect(-a/2,-l,a,l)),s||this.#m(e,t,a,l),s&&(r.globalAlpha=1),!s&&t.controlled&&(r.strokeStyle="#ffd45a",r.lineWidth=4,r.strokeRect(-a/2-4,-l-4,a+8,l+8)),!s&&Array.isArray(t.targeted)&&t.targeted.length&&this.#g(t.targeted,n.m,a,l)}#g(t,e,n,s){let{ctx:r}=this,o=s*1.22/(n*1.3),a=`${t.join("|")}:${o.toFixed(3)}`;this.reticles??=new Map;let l=this.reticles.get(a);l||(l=Th(t,o),this.reticles.set(a,l));let[c,h,u,d,f,g]=e,x=u*(-s/2)+f,p=d*(-s/2)+g,m=Math.hypot(c,h)*n*1.3,_=Math.hypot(u,d)*s*1.22;this.#s([1,0,0,1,0,0]),r.drawImage(l,x-m/2,p-_/2,m,_),this.#s(e)}#m(t,e,n,s){if(!this.grade)return;let[r,o]=this.rig.fractionOf(e.x,e.z);t.light=Dh(t.light,Lh(this.grade,r,o,{strength:this.description?.grade??1}));let[a,l,c]=t.light.map(u=>Math.round(Math.max(0,Math.min(1,u))*255));if(a>250&&l>250&&c>250)return;let{ctx:h}=this;h.save(),h.globalCompositeOperation="multiply",h.fillStyle=`rgb(${a},${l},${c})`,h.fillRect(-n/2,-s,n,s),h.restore()}#y(t){let{ctx:e}=this,n=(a,l)=>{e.fillStyle=l,e.beginPath(),a.forEach(([c,h],u)=>u?e.lineTo(c,h):e.moveTo(c,h)),e.closePath(),e.fill(),e.strokeStyle="rgba(0,0,0,0.35)",e.lineWidth=1,e.stroke()};this.#s([1,0,0,1,0,0]),n(t.floor,"#3a2412"),n(t.back,"#6a4628"),e.lineCap="round";for(let a of t.sticks)e.strokeStyle=Un[a.colour]??Un.white,e.lineWidth=a.width,e.beginPath(),e.moveTo(a.base.x,a.base.y),e.lineTo(a.top.x,a.top.y),e.stroke();let s=t.magic,r=e.createLinearGradient(s.base.x,s.base.y,s.top.x,s.top.y);for(let a=0;a<=6;a++)r.addColorStop(a/6,`hsl(${a*60},70%,72%)`);e.strokeStyle=r,e.lineWidth=s.width,e.beginPath(),e.moveTo(s.base.x,s.base.y),e.lineTo(s.top.x,s.top.y),e.stroke();let o=s.width*1.1;e.fillStyle="#ffd36a",e.beginPath();for(let a=0;a<8;a++){let l=a/8*Math.PI*2-Math.PI/2,c=a%2?o*.42:o;e.lineTo(s.top.x+Math.cos(l)*c,s.top.y+Math.sin(l)*c)}e.closePath(),e.fill(),n(t.left,"#7a5230"),n(t.right,"#7a5230"),n(t.front,"#8a5e38"),n(t.eraser.front,"#5b6670"),n(t.eraser.top,"#6c7882")}#x(t){let{ctx:e,rig:n,view:s}=this;for(let r of t.marks.slice(0,6)){if(!r.target)continue;let o=this.views.get(r.for);if(!o)continue;let a=this.description.cardScale*(o.person.size??1),l={x:r.X,z:r.Z,lift:r.pose.lift,lean:r.pose.lean,yaw:r.pose.yaw,pitch:r.pose.pitch,grip:0,scale:a,breathe:1,squash:1};if(this.#p(l,o,ap(l,n,s,{stickLen:0}),{ghost:!0}),r.label){let c=ms(n,s,{X:r.X,Y:r.pose.lift+o.h*a+40,Z:r.Z}),h=this.#b(r.label),u=260*c.k*s.s;this.#s([1,0,0,1,0,0]),e.drawImage(h,c.x-u/2,c.y-u*96/512/2,u,u*96/512)}}for(let r of t.cards){let o=r.emote;if(!o||o.opacity<=.01)continue;let a=this.#i(o.id),l=this.views.get(r.id);if(!a||!l)continue;let c=r.scale??1,h=ms(n,s,{X:r.x+74*c,Y:(r.lift??0)+(this.skin.stick?.length??134)*c*(r.grip??0)+l.h*c*(r.breathe??1)+36,Z:r.z+30}),u=96*o.pop*h.k*s.s,d=.96*h.k*s.s,f=(o.r??0)*Math.PI/180,g=h.x+(o.x??0)*d,x=h.y+(o.y??0)*d+(dr-.5)*u;this.#s([Math.cos(f),Math.sin(f),-Math.sin(f),Math.cos(f),g,x]),e.globalAlpha=o.opacity,e.drawImage(a,-u/2,-dr*u,u,u),e.globalAlpha=1}}#b(t){return this.labelImages.has(t)||this.labelImages.set(t,Eh(t)),this.labelImages.get(t)}#v(t){let{ctx:e,rig:n,view:s}=this,r=t.t,o=this.skin.size.h*this.description.cardScale*.5+60;this.#s([1,0,0,1,0,0]);let a=0;for(let l of t.bonks){let c=r-l.t;if(c<0||c>uy)continue;let h=ms(n,s,{X:l.x,Y:o+10,Z:l.Z+90});if(c<cy&&a++<3){let u=c/cy,d=(120+150*Math.sqrt(u))*h.k*s.s;e.save(),e.translate(h.x,h.y),e.rotate(.2*u),e.globalAlpha=1-u*u,e.drawImage(this.impact,-d/2,-d/2,d,d),e.restore()}if(!this.calm){if(c<hy&&this.#M(l.t)){let u=260*h.k*s.s,d=.4*(1-c/hy)**2,f=e.createRadialGradient(h.x,h.y,0,h.x,h.y,u);f.addColorStop(0,`rgba(255,226,168,${d})`),f.addColorStop(1,"rgba(255,226,168,0)"),e.globalCompositeOperation="lighter",e.fillStyle=f,e.fillRect(h.x-u,h.y-u,u*2,u*2),e.globalCompositeOperation="source-over"}if(l===t.bonks[t.bonks.length-1]){e.globalCompositeOperation="lighter",e.fillStyle="#ffd98a",e.globalAlpha=Math.max(0,1-c/uy);for(let u=0;u<dy;u++){let d=u/dy*Math.PI*2+u%5*.37,f=260+u*53%340,g=ms(n,s,{X:l.x+Math.cos(d)*f*c,Y:Math.max(2,o+Math.sin(d)*f*.8*c+120*c-900*c*c),Z:l.Z+90});e.beginPath(),e.arc(g.x,g.y,Math.max(1.2,3*g.k*s.s),0,Math.PI*2),e.fill()}e.globalCompositeOperation="source-over"}e.globalAlpha=1}}e.globalAlpha=1}#M(t){return this.flashes.includes(t)?!0:(this.flashes=this.flashes.filter(e=>t-e<1),this.flashes.length>=OT?!1:(this.flashes.push(t),!0))}pick(t,e){if(!this.ready)return null;for(let n=this.order.length-1;n>=0;n--){let s=this.order[n];if(s.kind==="card"){let r=sy(s.pl,s.c,s.v,t,e);if(r!==null)return{kind:"card",id:s.c.id,point:{x:0,y:r,z:s.c.z}}}else if(s.kind==="box"){let r=ly(s.layout,t,e);if(r)return{...r,point:{x:0,y:0,z:s.z}}}}return null}paintingAt(t,e){return this.rig?iy(this.rig,this.view,t,e):null}floorAt(t,e,n=0){return this.rig?ny(this.rig,this.view,t,e,n):null}project(t){return ms(this.rig,this.view,t)}setChalkTiles(t,e,n=!1){let s=t!==this.chalkWall;if(this.chalkWall=t,n||s){this.revision++;return}for(let r of e)this.chalkDirty.add(r)}setChalkHidden(t){this.hidden=!!t}setChalkBox(t){this.boxShown=!!t}setChalkBoxAt(t){this.boxAt=[t[0],t[1]],this.boxCache=null}paintingColour(t,e){return nu(this.painting,t,e)}async capture(){return new Promise(t=>this.canvas.toBlob(t,"image/png"))}stats(){return{calls:this.draws,triangles:0,textures:0,geometries:0,tracked:this.views.size}}unmount(){this.canvas?.remove()}dispose(){this.disposed||(this.disposed=!0,this.views.clear(),this.order=[],this.unmount())}};var hp="module.stagecraft";function fy(i){let t=(e,n)=>i(e,n);return game.socket.on(hp,t),{send:e=>game.socket.emit(hp,e),close:()=>game.socket.off(hp,t)}}var py=238/255,BT=1.5,my=(i,t,e)=>Math.max(t,Math.min(e,i)),hu=class{constructor({root:t,wall:e,mapOf:n}){this.root=t,this.wall=e,this.mapOf=n,this.raw=document.createElement("canvas"),this.show=this.#t("stagecraft-wet"),this.tailEl=this.#t("stagecraft-wet stagecraft-wet-tail"),this.rawX=this.raw.getContext("2d"),this.showX=this.show.getContext("2d"),this.tailX=this.tailEl.getContext("2d"),this.w=0,this.h=0,this.ratio=1,this.stroke=null,this.area=null,this.tailArea=null,this.last=null,this.on=!1,this.fit()}#t(t){let e=document.createElement("canvas");return e.className=t,e.setAttribute("aria-hidden","true"),this.root.append(e),e}fit(){let t=my(globalThis.devicePixelRatio||1,1,BT),e=Math.max(1,Math.round((this.root.clientWidth||1)*t)),n=Math.max(1,Math.round((this.root.clientHeight||1)*t));if(e===this.w&&n===this.h&&t===this.ratio)return!1;this.w=e,this.h=n,this.ratio=t;for(let s of[this.raw,this.show,this.tailEl])s.width=e,s.height=n;return!0}warm(){let t={def:oe.chalk,colour:"#ffffff",magic:null,opacity:1},e={x:40,y:40};this.begin(t,[[[e.x-30,e.y-30],[e.x+120,e.y-30],[e.x+120,e.y+80],[e.x-30,e.y+80]]])&&(this.add([{x:e.x,y:e.y,size:12,flow:.8,angle:.4,seed:1,dist:0},{x:e.x+5,y:e.y+3,size:12,flow:.8,angle:.4,seed:2,dist:5}]),this.tail({x:e.x+30,y:e.y+8}),this.release())}begin(t,e=this.wall.mask){this.release(),this.fit();let n=this.mapOf();if(!n||!(n.k>0))return this.on=!1,!1;this.m=Lx(n,this.ratio),this.stroke=t,this.last=null,this.area=null,this.polys=e?.length?e.map(r=>r.map(([o,a])=>[o*this.m.k+this.m.bx,a*this.m.k+this.m.by])):null,this.pattern=null;let s=t.def.grain;if(s>0&&typeof DOMMatrix<"u"){let r=this.showX.createPattern(this.wall.grain.canvas(Math.round(my(s,0,1)*20)/20),"repeat");r?.setTransform(new DOMMatrix([this.m.k,0,0,this.m.k,this.m.bx,this.m.by])),this.pattern=r}return this.on=!0,!0}add(t){if(!this.on||!t.length)return;let e=this.m,n={k:e.k,ox:e.bx,oy:e.by};for(let r of t)Ga(this.rawX,this.wall.tips,this.stroke,r,n,{dim:py,clip:{w:this.w,h:this.h}});this.last=t[t.length-1];let s=Yf(t,e,this.w,this.h);s&&(this.area=jf(this.area,s),this.#e(s))}#e(t){let e=this.showX;if(e.save(),e.beginPath(),e.rect(t.x,t.y,t.w,t.h),e.clip(),e.clearRect(t.x,t.y,t.w,t.h),e.globalAlpha=this.stroke.opacity??1,this.polys)for(let n of this.polys)e.save(),e.beginPath(),n.forEach(([s,r],o)=>o?e.lineTo(s,r):e.moveTo(s,r)),e.closePath(),e.clip(),e.drawImage(this.raw,t.x,t.y,t.w,t.h,t.x,t.y,t.w,t.h),e.restore();else e.drawImage(this.raw,t.x,t.y,t.w,t.h,t.x,t.y,t.w,t.h);e.globalAlpha=1,this.pattern&&(e.globalCompositeOperation="destination-in",e.fillStyle=this.pattern,e.fillRect(t.x,t.y,t.w,t.h)),e.restore()}tail(t){if(!this.on)return;let e=this.tailX;if(this.tailArea&&(e.clearRect(this.tailArea.x,this.tailArea.y,this.tailArea.w,this.tailArea.h),this.tailArea=null),!this.last)return;let n=this.stroke.def,s=Nx(this.last,t,Math.max(.4,n.spacing*this.last.size));if(!s.length)return;let r=this.m,o=Yf(s,r,this.w,this.h);if(!o)return;if(e.save(),e.beginPath(),e.rect(o.x,o.y,o.w,o.h),e.clip(),this.polys){e.beginPath();for(let l of this.polys)l.forEach(([c,h],u)=>u?e.lineTo(c,h):e.moveTo(c,h)),e.closePath();e.clip()}let a={k:r.k,ox:r.bx,oy:r.by};for(let l of s)Ga(e,this.wall.tips,this.stroke,l,a,{dim:py,clip:{w:this.w,h:this.h}});this.pattern&&(e.globalCompositeOperation="destination-in",e.fillStyle=this.pattern,e.fillRect(o.x,o.y,o.w,o.h)),e.restore(),this.tailArea=o}end(){this.tailArea&&(this.tailX.clearRect(this.tailArea.x,this.tailArea.y,this.tailArea.w,this.tailArea.h),this.tailArea=null),this.on=!1}get wet(){return this.area!==null||this.tailArea!==null}release(){let t=jf(this.area,this.tailArea);if(t)for(let e of[this.rawX,this.showX,this.tailX])e.clearRect(t.x,t.y,t.w,t.h);this.area=null,this.tailArea=null,this.last=null,this.stroke=null,this.on=!1}dispose(){this.release(),this.show.remove(),this.tailEl.remove(),this.raw.width=this.raw.height=0}};var uu=class{constructor({rest:t=450,most:e=2500,now:n=()=>performance.now(),later:s=(o,a)=>setTimeout(o,a),cancel:r=o=>clearTimeout(o)}={}){this.rest=t,this.most=e,this.now=n,this.later=s,this.cancel=r,this.last=-1/0,this.waiting=[],this.timer=null}note(){this.last=this.now(),this.waiting.length&&this.#e()}whenQuiet(){return new Promise(t=>{this.waiting.push({resolve:t,deadline:this.now()+this.most}),this.#e()})}release(){let t=this.waiting;this.waiting=[],this.#t();for(let e of t)e.resolve()}get pending(){return this.waiting.length}#t(){this.timer!==null&&(this.cancel(this.timer),this.timer=null)}#e(){if(this.#t(),!this.waiting.length)return;let t=this.now(),e=this.last+this.rest,n=Math.min(...this.waiting.map(r=>r.deadline)),s=Math.min(e,n);this.timer=this.later(()=>this.#n(),Math.max(0,s-t))}#n(){this.timer=null;let t=this.now(),e=t-this.last>=this.rest,n=[];this.waiting=this.waiting.filter(s=>e||t>=s.deadline?(n.push(s),!1):!0);for(let s of n)s.resolve();this.#e()}};var zT=45,HT=8e3,gy="stagecraft.chalk.prefs",du=()=>`${(game.user?.id??"x").slice(0,6)}${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;function GT(){try{return JSON.parse(globalThis.localStorage?.getItem(gy)??"null")??{}}catch{return{}}}function VT(i){try{globalThis.localStorage?.setItem(gy,JSON.stringify(i))}catch{}}function WT(i){let t=i.host;return typeof t.backend?.wetMap!="function"||typeof t.root?.append!="function"||typeof document>"u"?null:new hu({root:t.root,wall:i.wall,mapOf:()=>t.backend?.wetMap?.(i.grid)??null})}var fu=class{constructor({host:t,store:e,makeWall:n=l=>new eu(l),encode:s=ep,send:r=()=>{},makeWet:o=WT,quiet:a=new uu}){this.host=t,this.store=e,this.sceneId=t.scene.id,this.send=r,this.encode=s,this.makeWet=o,this.quiet=a,this.wet=void 0,this.wetPending=null,this.pointerListeners=new Set,this.grid=Gf(t.description.painting),this.wall=n({grid:this.grid,onChange:c=>this.host.backend?.setChalkTiles?.(this.wall,c)}),this.wall.warmUp?.();let l=GT();this.colour=Vs(l.colour)??Un.white,this.recent=(l.recent??[]).map(Vs).filter(Boolean).slice(0,10),this.sizes={...Object.fromEntries(Object.entries(oe).map(([c,h])=>[c,h.size.initial])),...l.sizes??{}},this.steady=Number.isInteger(l.steady)?Math.max(0,Math.min(ho.length-1,l.steady)):1,this.magic={rainbow:!1,glow:!0,sparkle:!1,...l.magic??{}},this.tool=null,this.drawing=null,this.lastEnd=null,this.redoSteps=[],this.keeping=Promise.resolve(),this.remote=new Map,this.loading=new Map,this.listeners=new Set,this.unsubscribe=e.onChange((c,h)=>{c===null?(this.refresh(),this.sync()):c===this.sceneId&&this.#r(h)}),this.onHide=()=>this.quiet.release(),globalThis.addEventListener?.("pagehide",this.onHide)}stop(){this.unsubscribe?.(),globalThis.removeEventListener?.("pagehide",this.onHide),this.putAway(),this.wet?.dispose(),this.wet=void 0,this.wetPending=null;for(let t of this.remote.values())clearTimeout(t.timer);this.remote.clear(),this.listeners.clear(),this.pointerListeners.clear(),clearTimeout(this.flashTimer)}onPointer(t){return this.pointerListeners.add(t),()=>this.pointerListeners.delete(t)}#t(t){for(let e of this.pointerListeners)e(t)}reset(){this.putAway(),this.wetPending?.release(),this.wetPending=null,this.host.backend?.setChalkTiles?.(this.wall,new Set(this.wall.keys()),!0)}onHand(t){return this.listeners.add(t),()=>this.listeners.delete(t)}#e(){for(let t of this.listeners)t()}policy(){let t=this.host.scene.flags?.[Z]?.live?.chalk??null;return $h(this.host.description.chalk,t)}get usable(){return this.store.ready&&Ex(this.policy(),this.host.description.zones)}refresh(){let t=this.policy(),e=this.usable;return this.host.backend.setChalkBox(e),(!e||t.locked)&&this.putAway(),this.host.backend.setChalkHidden(this.host.scene.flags?.[Z]?.live?.chalkHidden===!0),this.wall.setMask(Ax(t,this.host.description.zones)),t}chalkZones(){return this.policy().mode==="zones"?this.host.description.zones.filter(t=>t.kind==="chalk"):[]}sync(){let t=this.store.layers(this.sceneId);this.#n(t);for(let e of t)this.#i(e)}#n(t){let e=t.map(s=>({by:s.by,since:s.since})),n=this.wall.layers.get(game.user.id);n&&!e.some(s=>s.by===game.user.id)&&e.push({by:n.by,since:n.since}),this.wall.setLayers(e)}#i(t){let e=this.wall.layers.get(t.by),n=new Set([...Object.keys(t.tiles),...e?[...e.sources.keys()]:[]]),s=[];for(let o of n){let a=t.tiles[o]??null;this.wall.sourceOf(t.by,o)!==a&&s.push(this.wall.setTile(t.by,o,a).catch(l=>console.warn(`${Z} | a tile of chalk could not be shown`,l)))}let r=Promise.all(s);return this.loading.set(t.by,r),r.then(()=>{this.loading.get(t.by)===r&&this.loading.delete(t.by),this.#s()}),r}#r(t){let e=this.store.layers(this.sceneId),n=e.find(s=>s.by===t);if(!n){this.sync();return}(!this.wall.layers.has(t)||this.wall.layers.get(t).since!==n.since)&&this.#n(e),this.#i(n)}#s(){if(!this.remote.size)return;let t=new Map(this.store.layers(this.sceneId).map(e=>[e.by,e]));for(let[e,n]of this.remote){if(!n.ended)continue;n.layers.every(r=>!this.loading.has(r)&&Object.keys(t.get(r)?.history??{}).some(o=>o.endsWith(`-${e}`)))&&this.#x(e)}}get inHand(){return this.tool}take(t){if(!this.usable)return;if(t==="rub")return this.choose(this.tool==="eraser"?null:"eraser");if(t==="magic")return this.choose(this.tool==="magic"?null:"magic");let e=Un[t];if(e){if(this.tool==="chalk"&&this.colour===e)return this.putAway();this.setColour(e),this.choose("chalk")}}choose(t){if(!t)return this.putAway();!oe[t]||!this.usable||(this.drawing&&this.cancel(),this.tool=t,this.host.root?.classList.add("stagecraft-chalk"),(oe[t].kind==="paint"||oe[t].kind==="spray")&&this.#o(),this.#e())}#o(){return this.wet===void 0&&(this.wet=this.makeWet(this)??null,this.wet&&setTimeout(()=>{try{this.wet?.warm?.()}catch{}},0)),this.wet}putAway(){this.quiet.release(),this.drawing&&this.cancel(),this.tool=null,this.cursorZone=null,this.blocked=!1,this.pointer=null,this.host?.root?.classList.remove("stagecraft-chalk"),this.#c(null),this.#t(null),this.#e()}setColour(t,{remember:e=!0}={}){let n=Vs(t);n&&(this.colour=n,e&&(this.recent=[n,...this.recent.filter(s=>s!==n)].slice(0,10)),this.#a(),this.#e())}setSize(t,e=this.tool){let n=oe[e];!n||n.kind==="fill"||(this.sizes[e]=Math.round(Math.max(n.size.min,Math.min(n.size.max,t))*10)/10,this.#a(),this.#e())}nudgeSize(t){let e=this.sizes[this.tool];Number.isFinite(e)&&this.setSize(e+t*Math.max(1,e*.15))}setSteady(t){this.steady=Math.max(0,Math.min(ho.length-1,t)),this.#a(),this.#e()}setMagic(t){this.magic={...this.magic,...t},this.#a(),this.#e()}#a(){VT({colour:this.colour,recent:this.recent,sizes:this.sizes,steady:this.steady,magic:this.magic})}scale(t){let e=this.host.backend.paintingAt(t.x,t.y),n=this.host.backend.paintingAt(t.x+40,t.y);if(!e||!n)return null;let s=Math.hypot((n.x-e.x)*this.grid.w,(n.y-e.y)*this.grid.h);return s>0?40/s:null}hover(t){if(!this.tool)return;if(this.pointer=t,!t){this.#c(null),this.#t(null);return}let e=this.host.backend.paintingAt(t.x,t.y);this.cursorZone=e?this.chalkZones().find(n=>vi(n.shape,e.x,e.y))?.id??null:null,this.blocked=oe[this.tool].kind!=="erase"&&!(e&&$f(this.policy(),this.host.description.zones,e.x,e.y)),this.flashTimer||this.#c(this.blocked&&!this.drawing?t:null),this.#t(t)}#c(t,e=null){let n=this.host?.root;if(typeof n?.querySelector!="function"||typeof document>"u")return;let s=n.querySelector(".stagecraft-chalk-hint");if(!t){s&&(s.hidden=!0);return}s||(s=document.createElement("div"),s.className="stagecraft-chalk-hint",n.append(s));let r=this.chalkZones().map(o=>o.name).filter(Boolean);s.textContent=e??(r.length?game.i18n.format("STAGECRAFT.Chalk.OnlyOn",{where:r.join(", ")}):game.i18n.localize("STAGECRAFT.Chalk.NotHere")),s.style.left=`${Math.round(t.x+22)}px`,s.style.top=`${Math.round(t.y+18)}px`,s.hidden=!1}flash(t,e){this.#c(t,e),clearTimeout(this.flashTimer),this.flashTimer=setTimeout(()=>{this.flashTimer=null,this.#c(null)},1800)}#h(t){let e=this.host.backend.paintingAt(t.x,t.y);return e?Vf(this.grid,e.x,e.y):null}painterAt(t){let e=this.#h(t),n=e?this.wall.whoAt(e.x,e.y):null;return n?game.users.get(n)?.name??n:null}painters(){return this.store.layers(this.sceneId).map(t=>({by:t.by,name:game.users.get(t.by)?.name??t.by,tiles:Object.keys(t.tiles).length})).filter(t=>t.tiles>0).sort((t,e)=>e.tiles-t.tiles)}begin(t){if(!this.tool||!this.usable||this.policy().locked||this.drawing)return!1;let e=this.#h(t);if(!e)return!1;if(t.alt)return this.pickColour(t),!1;let n=t.flip?"eraser":this.tool,s=oe[n];if(s.kind==="fill")return this.#y(e,t),!1;if(t.shift&&this.lastEnd)return this.#m(this.lastEnd,e,n),!1;let r=du(),o=qf(r),a=this.sizes[n],l={tool:n,size:a,steady:ho[this.steady],seed:o},c=s.kind==="erase"&&game.user.isGM===!0,h=s.magic?{...this.magic}:null;this.#l();let u=s.kind==="paint"||s.kind==="spray"?this.#o():null,d=this.wall.begin({id:r,by:game.user.id,tool:n,colour:this.colour,magic:h,everyone:c,wet:!!u});return u&&!u.begin(d)&&(d.wet=!1,u=null),this.quiet.note(),this.drawing={id:r,stroke:new co(l),feel:new jh,opts:l,everyone:c,unsent:[],timer:null,at:e,wet:u},this.send({type:"chalk",op:"begin",scene:this.sceneId,id:r,tool:n,colour:this.colour,magic:h,everyone:c,size:a,steady:l.steady,seed:o}),this.extend(t),!0}extend(t){let e=this.drawing;if(!e)return;let n=this.#h(t);if(!n)return;let s=e.feel.pressure({x:n.x,y:n.y,t:t.t??performance.now(),pressure:t.pressure,pointerType:t.pointerType}),r={x:Math.round(n.x*10)/10,y:Math.round(n.y*10)/10,p:Math.round(s*100)/100};e.at=n;let o=e.stroke.add(r);this.wall.paint(e.id,o),e.wet?.add(o),this.quiet.note(),e.unsent.push(r),e.timer??=setTimeout(()=>this.#d(),zT)}finishMove(){let t=this.drawing;t?.wet&&t.at&&t.wet.tail(t.at)}afterDraw(){this.#l()}#l(){this.wetPending&&(this.wetPending.release(),this.wetPending=null)}#d(){let t=this.drawing;t&&(t.timer=null,t.unsent.length&&(this.send({type:"chalk",op:"more",scene:this.sceneId,id:t.id,s:t.unsent.flatMap(e=>[e.x,e.y,e.p])}),t.unsent=[]))}end(){let t=this.drawing;if(!t)return Promise.resolve();let e=t.stroke.finish();this.wall.paint(t.id,e),clearTimeout(t.timer),this.#d(),this.drawing=null,this.lastEnd=t.at,this.quiet.note();let n=za(this.wall.strokes.get(t.id)?.dabs??[]);t.wet&&(t.wet.add(e),t.wet.end(),this.wetPending=t.wet);let s=this.wall.commit(t.id),r=[...s.keys()];return this.send({type:"chalk",op:"end",scene:this.sceneId,id:t.id,layers:r}),this.#f(this.#u(s),t.id,n,t.opts.tool,r)}cancel(){let t=this.drawing;if(!t)return;clearTimeout(t.timer),this.drawing=null,t.wet?.release(),this.send({type:"chalk",op:"cancel",scene:this.sceneId,id:t.id});let e=this.wall.strokes.get(t.id)?.touched??new Set;this.wall.drop(t.id),oe[t.opts.tool].kind==="smudge"&&this.wall.revert(game.user.id,e).catch(()=>{})}#u(t){let e=t.painted===!0,n=t.size?this.quiet.whenQuiet():null;return[...t].map(([s,r])=>[s,[...r].map(([o,a])=>[o,Promise.resolve(this.encode(a,e,n))])])}#f(t,e,n,s,r=null){let o=this.keeping.then(async()=>{let a=await this.#p(t);if(r){let l=a.map(([c])=>c);l.length!==r.length&&this.send({type:"chalk",op:"end",scene:this.sceneId,id:e,layers:l})}await this.#g(a,e,n,s)});return this.keeping=o.catch(a=>console.warn(`${Z} | chalk could not be kept`,a)),o}async#p(t){let e=[];for(let[n,s]of t){let r=await Promise.all(s.map(async([l,c])=>[l,await c])),o={},a={};for(let[l,c]of r){let h=this.wall.sourceOf(n,l);c!==h&&(a[l]=h,o[l]=c)}Object.keys(o).length&&e.push([n,o,a])}return e}async#g(t,e,n=null,s=this.tool){if(!t.length)return;let r=Date.now(),o={id:Wf(r,e),at:r};this.redoSteps=[];for(let[c,h,u]of t){for(let[d,f]of Object.entries(h))this.wall.noteSource(c,d,f);try{await this.store.save(this.sceneId,{by:c,tiles:h,step:o,grid:this.grid})}catch(d){console.warn(`${Z} | chalk could not be kept`,d);for(let[f,g]of Object.entries(u))this.wall.noteSource(c,f,g);await this.wall.revert(c,Object.keys(u))}}let a=this.grid,l=n?{x0:Math.max(0,n.x0/a.w),y0:Math.max(0,n.y0/a.h),x1:Math.min(1,n.x1/a.w),y1:Math.min(1,n.y1/a.h)}:null;Hooks.callAll("stagecraft.chalk",{type:"chalk",scene:this.sceneId,by:game.user.id,tool:s,colour:this.colour,bounds:l})}#m(t,e,n=this.tool){let s=oe[n];if(s.kind==="smudge")return null;let r=du(),o={tool:n,size:this.sizes[n],seed:qf(r)},a=Jh({...t,p:.8},{...e,p:.8},o);this.wall.begin({id:r,by:game.user.id,tool:n,colour:this.colour,magic:s.magic?{...this.magic}:null,everyone:s.kind==="erase"&&game.user.isGM===!0}),this.wall.paint(r,a),this.lastEnd=e;let l=za(a);return this.#f(this.#u(this.wall.commit(r)),r,l,n).catch(()=>{}),l}#y(t,e){let n=this.wall.fill({x:t.x,y:t.y,by:game.user.id,colour:this.colour});if(!n.ok){this.flash(e,game.i18n.localize(n.reason==="open"?"STAGECRAFT.Chalk.FillOpen":"STAGECRAFT.Chalk.FillOnPaint"));return}this.#f(this.#u(new Map([[game.user.id,n.changed]])),du(),{x0:t.x-1,y0:t.y-1,x1:t.x+1,y1:t.y+1}).catch(()=>{})}pickColour(t){let e=this.host.backend.paintingAt(t.x,t.y);if(!e)return null;let n=Vf(this.grid,e.x,e.y),s=this.wall.pick(n.x,n.y)??this.host.backend.paintingColour?.(e.x,e.y)??null;return s&&(this.setColour(s),this.flash(t,game.i18n.format("STAGECRAFT.Chalk.Picked",{colour:s}))),s}async undo(){this.drawing&&this.cancel(),this.quiet.release(),await this.keeping;let t=await this.store.undo(this.sceneId,{by:game.user.id});return t?(this.redoSteps.push(t.layers),!0):!1}async redo(){this.quiet.release(),await this.keeping;let t=this.redoSteps.pop();if(!t)return!1;let e=Date.now(),n={id:Wf(e,du()),at:e};for(let[s,r]of Object.entries(t))await this.store.save(this.sceneId,{by:s,tiles:r,step:n,grid:this.grid});return!0}receive(t,e){if(!(!t||t.scene!==this.sceneId||e===game.user.id))if(t.op==="begin"){if(!oe[t.tool]||oe[t.tool].kind==="smudge"||oe[t.tool].kind==="fill"||this.remote.has(t.id)||typeof t.id!="string")return;let n=e,s=t.everyone===!0&&game.users?.get(e)?.isGM===!0;this.wall.begin({id:t.id,by:n,tool:t.tool,colour:Vs(t.colour)??Un.white,magic:t.magic??null,everyone:s,live:!0});let r=new co({tool:t.tool,size:Number(t.size)||void 0,steady:Number(t.steady)||0,seed:Number(t.seed)>>>0});this.remote.set(t.id,{by:n,stroke:r,ended:!1,layers:[],timer:setTimeout(()=>this.#x(t.id),6e4)})}else if(t.op==="more"){let n=this.remote.get(t.id);if(!n||n.ended||!Array.isArray(t.s))return;let s=[];for(let r=0;r+2<t.s.length;r+=3)s.push(...n.stroke.add({x:Number(t.s[r]),y:Number(t.s[r+1]),p:Number(t.s[r+2])}));this.wall.paint(t.id,s)}else if(t.op==="end"){let n=this.remote.get(t.id);if(n?.ended){Array.isArray(t.layers)&&(n.layers=t.layers.filter(s=>typeof s=="string"),this.#s());return}if(!n)return;this.wall.paint(t.id,n.stroke.finish()),n.ended=!0,n.layers=(Array.isArray(t.layers)?t.layers:[n.by]).filter(s=>typeof s=="string"),clearTimeout(n.timer),n.timer=setTimeout(()=>this.#x(t.id),HT),this.#s()}else t.op==="cancel"&&this.#x(t.id)}#x(t){let e=this.remote.get(t);e&&(clearTimeout(e.timer),this.remote.delete(t),this.wall.drop(t))}allowedAt(t){return $f(this.policy(),this.host.description.zones,t.x,t.y)}};var xy="stagecraft.chalk.kit",Je=(i,t)=>t?game.i18n.format(i,t):game.i18n.localize(i),sn=i=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${i}</svg>`,yi=Object.freeze({chalk:sn('<path d="M6.5 17.5 16 8" stroke-width="4.2"/><circle cx="4.2" cy="20.2" r=".8" fill="currentColor" stroke="none"/><circle cx="3.2" cy="17.6" r=".6" fill="currentColor" stroke="none"/><circle cx="6.4" cy="21.4" r=".6" fill="currentColor" stroke="none"/>'),magic:sn('<path d="M4.5 19.5 14 10" stroke-width="2.6"/><path d="M17.5 2.8l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" fill="currentColor" stroke="none"/><circle cx="20" cy="12.5" r=".9" fill="currentColor" stroke="none"/><circle cx="11.5" cy="4.5" r=".8" fill="currentColor" stroke="none"/>'),pencil:sn('<path d="M4 20l1.4-4.6L15.6 5.2a1.6 1.6 0 0 1 2.3 0l.9.9a1.6 1.6 0 0 1 0 2.3L8.6 18.6z"/><path d="M13.8 7l3.2 3.2M4 20l3.1-.9"/>'),brush:sn('<path d="M20.5 3.5 11.8 12.2"/><path d="M11 13l-1.6-1.6"/><path d="M9.4 11.4c-2.6-.4-4.6 1.6-4.6 4 0 1.3-.9 2.6-2.3 2.9 3 1.6 8 .6 8.6-3.6.2-1.4-.4-2.6-1.7-3.3z" fill="currentColor" fill-opacity=".3"/>'),spray:sn('<rect x="5.5" y="9" width="8" height="12" rx="2"/><path d="M8 9V6.5h3V9M9.5 6.5V4.5"/><circle cx="16.5" cy="5" r=".8" fill="currentColor" stroke="none"/><circle cx="19" cy="7.5" r=".8" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10" r=".8" fill="currentColor" stroke="none"/><circle cx="20" cy="4" r=".7" fill="currentColor" stroke="none"/>'),smudge:sn('<path d="M3 16c2.6-3.4 4.4 1.6 7-1.6s4.4 1.6 7-1.6" stroke-width="2.4" opacity=".55"/><path d="M14 13.5V6a1.6 1.6 0 0 1 3.2 0v5"/><path d="M17.2 9.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.4"/>'),fill:sn('<path d="M4.5 11.5 11 5l6.6 6.6-6.5 6.5a1.6 1.6 0 0 1-2.2 0l-4.4-4.4a1.6 1.6 0 0 1 0-2.2z"/><path d="M4.6 12.2h12.6"/><path d="M20 14.5c.9 1.4 1.4 2.3 1.4 3a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.6 1.4-3z" fill="currentColor"/>'),eraser:sn('<path d="M8 20h12"/><path d="M5.2 15.6 13.6 7.2a1.8 1.8 0 0 1 2.5 0l3.3 3.3a1.8 1.8 0 0 1 0 2.5L12.5 20H9.6z"/><path d="M9.2 11.6l5.6 5.6"/>'),pick:sn('<path d="M14.5 4.5l5 5-2.2 2.2-5-5z" fill="currentColor" fill-opacity=".35"/><path d="M13.4 8.6 5.5 16.5 4 20l3.5-1.5 7.9-7.9"/>'),undo:sn('<path d="M9 6 4.5 10.5 9 15"/><path d="M4.5 10.5H15a5 5 0 0 1 0 10h-2"/>'),redo:sn('<path d="M15 6l4.5 4.5L15 15"/><path d="M19.5 10.5H9a5 5 0 0 0 0 10h2"/>'),steady:sn('<circle cx="6" cy="18" r="2.2" fill="currentColor" stroke="none"/><path d="M8 16 14.8 9.2" stroke-dasharray="1.6 2.2"/><circle cx="17" cy="7" r="3"/>'),rainbow:sn('<path d="M3 17a9 9 0 0 1 18 0" stroke="#e86a6a"/><path d="M6 17a6 6 0 0 1 12 0" stroke="#e8c96a"/><path d="M9 17a3 3 0 0 1 6 0" stroke="#7ac0e0"/>'),glow:sn('<circle cx="12" cy="12" r="3.5" fill="currentColor"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>'),sparkle:sn('<path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" fill="currentColor" fill-opacity=".35"/><path d="M19 16l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" fill="currentColor" stroke="none"/>'),close:sn('<path d="M6 6l12 12M18 6 6 18"/>'),grip:sn('<circle cx="9" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="17" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="1.2" fill="currentColor" stroke="none"/>')}),XT=(i,t)=>Math.round(100*Math.log(i/t.size.min)/Math.log(t.size.max/t.size.min)),$T=(i,t)=>Math.round(t.size.min*(t.size.max/t.size.min)**(i/100)*10)/10,pu=class{constructor(t,e){this.host=t,this.chalk=e,this.open=null,this.alt=!1,this.#t(),this.offHand=e.onHand(()=>this.refresh()),this.offPointer=e.onPointer(n=>this.#l(n)),this.refresh()}dispose(){this.offHand?.(),this.offPointer?.(),window.removeEventListener("keydown",this.#c,!0),window.removeEventListener("keyup",this.#h,!0),this.el?.remove(),this.ring?.remove(),this.el=this.ring=null}#t(){let t=document.createElement("div");t.className="stagecraft-kit",t.setAttribute("role","toolbar"),t.setAttribute("aria-label",Je("STAGECRAFT.Kit.Label"));let e=r=>`<button type="button" class="kit-tool" data-tool="${r}" title="${Je(`STAGECRAFT.Kit.Tool.${r}`)}">${yi[r]}</button>`;t.innerHTML=`
      <div class="kit-grip" title="${Je("STAGECRAFT.Kit.Move")}">${yi.grip}</div>
      <div class="kit-group">${Kh.map(e).join("")}</div>
      <div class="kit-group">
        <button type="button" class="kit-well" data-act="colour" title="${Je("STAGECRAFT.Kit.Colour")}"><span></span></button>
        <button type="button" class="kit-size" data-act="size" title="${Je("STAGECRAFT.Kit.Size")}"><span></span></button>
        <button type="button" data-act="steady" title="">${yi.steady}<b></b></button>
        <button type="button" data-act="pick" title="${Je("STAGECRAFT.Kit.Pick")}">${yi.pick}</button>
      </div>
      <div class="kit-group kit-magic">
        <button type="button" data-magic="rainbow" title="${Je("STAGECRAFT.Kit.Rainbow")}">${yi.rainbow}</button>
        <button type="button" data-magic="glow" title="${Je("STAGECRAFT.Kit.Glow")}">${yi.glow}</button>
        <button type="button" data-magic="sparkle" title="${Je("STAGECRAFT.Kit.Sparkle")}">${yi.sparkle}</button>
      </div>
      <div class="kit-group">
        <button type="button" data-act="undo" title="${Je("STAGECRAFT.Kit.Undo")}">${yi.undo}</button>
        <button type="button" data-act="redo" title="${Je("STAGECRAFT.Kit.Redo")}">${yi.redo}</button>
        <button type="button" data-act="close" title="${Je("STAGECRAFT.Kit.Close")}">${yi.close}</button>
      </div>
      <div class="kit-pop kit-pop-colour" hidden>
        <canvas class="kit-sv" width="176" height="120"></canvas>
        <canvas class="kit-hue" width="176" height="14"></canvas>
        <div class="kit-row"><input class="kit-hex" type="text" maxlength="7" spellcheck="false" aria-label="${Je("STAGECRAFT.Kit.Hex")}"><span class="kit-now"></span></div>
        <div class="kit-swatches"></div>
        <div class="kit-recent"></div>
      </div>
      <div class="kit-pop kit-pop-size" hidden>
        <input class="kit-range" type="range" min="0" max="100" step="1" aria-label="${Je("STAGECRAFT.Kit.Size")}">
        <span class="kit-size-n"></span>
      </div>`,this.host.root.append(t),this.el=t,t.addEventListener("click",this.#o),t.addEventListener("wheel",this.#a,{passive:!1}),t.addEventListener("pointerdown",r=>r.stopPropagation()),this.#i(),this.#r();let n=t.querySelector(".kit-range");n.addEventListener("input",()=>this.chalk.setSize($T(Number(n.value),oe[this.chalk.tool])));let s=t.querySelector(".kit-swatches");s.innerHTML=Object.entries(Un).map(([r,o])=>`<button type="button" class="kit-swatch" data-colour="${o}" title="${Je(`STAGECRAFT.Kit.Colours.${r}`)}" style="--c:${o}"></button>`).join("")+["#1c1a17","#e2483c","#3f7fe0","#8a4fd8"].map(r=>`<button type="button" class="kit-swatch" data-colour="${r}" style="--c:${r}" title="${r}"></button>`).join(""),this.ring=document.createElement("div"),this.ring.className="stagecraft-chalk-cursor",this.ring.hidden=!0,this.ring.innerHTML='<i class="ring"></i><i class="tick across"></i><i class="tick down"></i><i class="cross"></i><i class="dot"></i><i class="strike"></i>',this.host.root.append(this.ring),window.addEventListener("keydown",this.#c,!0),window.addEventListener("keyup",this.#h,!0),this.#n(this.#e())}#e(){try{return JSON.parse(globalThis.localStorage?.getItem(xy)??"null")}catch{return null}}#n(t){let e=this.host.root.getBoundingClientRect(),n=this.el.offsetWidth||86,s=this.el.offsetHeight||440,r=Math.max(4,Math.min(e.width-n-4,t?.x??96)),o=Math.max(4,Math.min(e.height-s-4,t?.y??Math.min(96,(e.height-s)*.4)));this.el.style.left=`${r}px`,this.el.style.top=`${o}px`,this.el.classList.toggle("kit-right",r+n/2>e.width/2),this.at={x:r,y:o,set:t?.x!==void 0}}#i(){let t=this.el.querySelector(".kit-grip"),e=null;t.addEventListener("pointerdown",s=>{e={x:s.clientX,y:s.clientY,at:{...this.at}},t.setPointerCapture(s.pointerId),s.preventDefault()}),t.addEventListener("pointermove",s=>{e&&this.#n({x:e.at.x+s.clientX-e.x,y:e.at.y+s.clientY-e.y})});let n=()=>{if(e){e=null;try{globalThis.localStorage?.setItem(xy,JSON.stringify(this.at))}catch{}}};t.addEventListener("pointerup",n),t.addEventListener("pointercancel",n)}#r(){let t=this.el.querySelector(".kit-sv"),e=this.el.querySelector(".kit-hue"),n=this.el.querySelector(".kit-hex"),s=(r,o)=>{let a=!1,l=h=>{let u=r.getBoundingClientRect();o(Math.max(0,Math.min(1,(h.clientX-u.left)/u.width)),Math.max(0,Math.min(1,(h.clientY-u.top)/u.height)))};r.addEventListener("pointerdown",h=>{a=!0,r.setPointerCapture(h.pointerId),l(h),h.preventDefault()}),r.addEventListener("pointermove",h=>{a&&l(h)});let c=()=>{a&&(a=!1,this.chalk.setColour(this.chalk.colour))};r.addEventListener("pointerup",c),r.addEventListener("pointercancel",c)};s(t,(r,o)=>{let a=this.hsv??fs(this.chalk.colour);this.hsv={h:a.h,s:r,v:1-o},this.chalk.setColour(Ha(this.hsv),{remember:!1})}),s(e,r=>{let o=this.hsv??fs(this.chalk.colour);this.hsv={h:r*359.9,s:Math.max(.15,o.s),v:Math.max(.2,o.v)},this.chalk.setColour(Ha(this.hsv),{remember:!1})}),n.addEventListener("change",()=>{let r=Vs(n.value);r&&(this.hsv=fs(r),this.chalk.setColour(r))}),n.addEventListener("keydown",r=>{r.stopPropagation(),r.key==="Enter"&&n.blur()})}#s(){let t=this.el.querySelector(".kit-sv"),e=this.hsv??fs(this.chalk.colour),n=this.el.querySelector(".kit-hue"),s=n.getContext("2d"),r=s.createLinearGradient(0,0,n.width,0);for(let u=0;u<=6;u++)r.addColorStop(u/6,`hsl(${u*60},100%,50%)`);s.fillStyle=r,s.fillRect(0,0,n.width,n.height),s.lineWidth=2,s.strokeStyle="#111",s.strokeRect(e.h/360*n.width-2,1,4,n.height-2),s.strokeStyle="#fff",s.lineWidth=1,s.strokeRect(e.h/360*n.width-2,1,4,n.height-2);let o=t.getContext("2d"),{width:a,height:l}=t;o.fillStyle=Ha({h:e.h,s:1,v:1}),o.fillRect(0,0,a,l);let c=o.createLinearGradient(0,0,a,0);c.addColorStop(0,"#fff"),c.addColorStop(1,"rgba(255,255,255,0)"),o.fillStyle=c,o.fillRect(0,0,a,l);let h=o.createLinearGradient(0,0,0,l);h.addColorStop(0,"rgba(0,0,0,0)"),h.addColorStop(1,"#000"),o.fillStyle=h,o.fillRect(0,0,a,l),o.lineWidth=2,o.strokeStyle=e.v>.55?"#111":"#fff",o.beginPath(),o.arc(e.s*a,(1-e.v)*l,5,0,Math.PI*2),o.stroke()}refresh(){if(!this.el)return;let t=this.chalk,e=t.tool,n=this.el.hidden;this.el.hidden=!e,e?n&&this.#n(this.at?.set?this.at:null):(this.open=null,this.picking=!1,this.#l(null));for(let d of this.el.querySelectorAll(".kit-tool"))d.classList.toggle("on",d.dataset.tool===e);let s=oe[e]??null,r=s&&!["erase","smudge"].includes(s.kind);this.el.querySelector(".kit-well").style.setProperty("--c",t.colour),this.el.querySelector(".kit-well").disabled=!r;let o=s&&s.kind!=="fill",a=t.sizes[e]??0;this.el.querySelector(".kit-size span").style.setProperty("--d",`${Math.max(3,Math.min(26,3+Math.sqrt(a)*3.2))}px`),this.el.querySelector(".kit-size").disabled=!o;let c=this.el.querySelector('[data-act="steady"]');c.title=Je("STAGECRAFT.Kit.Steady",{level:Je(`STAGECRAFT.Kit.SteadyLevel.${t.steady}`)}),c.querySelector("b").textContent=t.steady?String(t.steady):"",c.classList.toggle("on",t.steady>0);let h=this.el.querySelector(".kit-magic");h.hidden=e!=="magic";for(let d of h.querySelectorAll("[data-magic]"))d.classList.toggle("on",!!t.magic[d.dataset.magic]);this.el.querySelector('[data-act="pick"]').classList.toggle("on",this.picking===!0);for(let d of this.el.querySelectorAll(".kit-pop"))d.hidden=!0;let u=(d,f)=>{d.hidden=!1,d.style.top=`${Math.max(0,f.offsetTop-10)}px`};if(this.open==="colour"&&r){u(this.el.querySelector(".kit-pop-colour"),this.el.querySelector(".kit-well"));let d=this.el.querySelector(".kit-hex");document.activeElement!==d&&(d.value=t.colour),this.el.querySelector(".kit-now").style.setProperty("--c",t.colour),this.el.querySelector(".kit-recent").innerHTML=t.recent.map(f=>`<button type="button" class="kit-swatch" data-colour="${f}" style="--c:${f}" title="${f}"></button>`).join(""),this.#s()}else this.open==="size"&&o&&(u(this.el.querySelector(".kit-pop-size"),this.el.querySelector(".kit-size")),this.el.querySelector(".kit-range").value=String(XT(a,s)),this.el.querySelector(".kit-size-n").textContent=Je("STAGECRAFT.Kit.SizePx",{n:a}));t.pointer&&this.#l(t.pointer)}#o=t=>{let e=t.target.closest("button");if(!e||e.disabled)return;let n=this.chalk;if(e.dataset.tool){this.picking=!1,n.choose(e.dataset.tool);return}if(e.dataset.colour){this.hsv=fs(e.dataset.colour),n.setColour(e.dataset.colour);return}if(e.dataset.magic){n.setMagic({[e.dataset.magic]:!n.magic[e.dataset.magic]});return}let s=e.dataset.act;s==="colour"||s==="size"?(this.open=this.open===s?null:s,this.hsv=fs(n.colour),this.refresh()):s==="steady"?n.setSteady((n.steady+1)%ho.length):s==="pick"?(this.picking=!this.picking,this.refresh()):s==="undo"?n.undo().catch(()=>{}):s==="redo"?n.redo().catch(()=>{}):s==="close"&&n.putAway()};#a=t=>{t.target.closest(".kit-size, .kit-pop-size")&&(t.preventDefault(),this.chalk.nudgeSize(t.deltaY<0?1:-1))};#c=t=>{let e=this.chalk;if(!e.tool||t.target?.closest?.("input, textarea, [contenteditable]"))return;if(t.key==="Alt"){this.alt=!0,e.pointer&&this.#l(e.pointer);return}let n=!0;t.key==="["?e.nudgeSize(-1):t.key==="]"?e.nudgeSize(1):(t.ctrlKey||t.metaKey)&&t.code==="KeyZ"?(t.shiftKey?e.redo():e.undo()).catch(()=>{}):(t.ctrlKey||t.metaKey)&&t.code==="KeyY"?e.redo().catch(()=>{}):n=!1,n&&(t.preventDefault(),t.stopPropagation())};#h=t=>{t.key==="Alt"&&(this.alt=!1,this.chalk.pointer&&this.#l(this.chalk.pointer))};takesPick(){let t=this.picking||this.alt;return this.picking&&(this.picking=!1,this.refresh()),t}#l(t){let e=this.ring;if(!e)return;let n=this.chalk;if(!t||!n.tool){e.hidden||(e.hidden=!0);return}let s=oe[n.tool],r=this.picking||this.alt||s.kind==="fill",o=r?0:Math.round(Math.max(1.5,(n.sizes[n.tool]??8)/2*(n.scale(t)??1))*2)/2,a=`${r}|${o}|${s.kind}|${n.blocked===!0}|${n.colour}`;if(a!==this.look){this.look=a;let l=["stagecraft-chalk-cursor"];r&&l.push("exact"),s.kind==="erase"&&l.push("erase"),n.blocked&&l.push("blocked"),!r&&["erase","smudge"].includes(s.kind)&&l.push("nodot"),!r&&o<6&&l.push("small"),e.className=l.join(" "),e.style.setProperty("--r",`${o}px`),e.style.setProperty("--c",n.colour)}e.hidden&&(e.hidden=!1),e.style.transform=`translate3d(${t.x}px, ${t.y}px, 0)`}};var $s=Object.freeze({every:2e4,stale:75e3,fine:40,poor:24,window:300,gap:400}),ZT=Object.freeze(["lit","low","plain"]);function vy(i,{gap:t=$s.gap,least:e=10}={}){let n=(i??[]).filter(r=>Number.isFinite(r)&&r>0&&r<=t);if(n.length<e)return{fps:null,worst:null,n:n.length};let s=[...n].sort((r,o)=>r-o);return{fps:Math.round(1e3/s[Math.floor(s.length/2)]),worst:Math.round(s[s.length-1]),n:n.length}}var qT=(i,t)=>i==="flat"||t==="flat"?"plain":t==="low"?"low":"lit";function YT(i){let t=typeof i=="string"?i.trim():"",e=/^ANGLE \((.*)\)$/i.exec(t);if(e){let n=e[1].split(",").map(s=>s.trim());t=n.length>1?n[1]:n[0]}return t=t.replace(/\s*(Direct3D\d*|OpenGL|Metal|vs_\d_\d|ps_\d_\d|\(0x[0-9a-f]+\)).*$/i,"").replace(/\s{2,}/g," ").trim(),t.length>34?`${t.slice(0,33)}\u2026`:t}var po=(i,t,e)=>(typeof i=="number"||typeof i=="string"&&i.trim()!=="")&&Number.isFinite(Number(i))?Math.max(t,Math.min(e,Math.round(Number(i)))):null,jT=(i,t)=>typeof i=="string"?i.slice(0,t):"";function dp(i){return{v:1,picture:qT(i.backend,i.tier),fps:po(i.stats?.fps,0,1e3),worst:po(i.stats?.worst,0,6e4),probe:i.probe==null?null:Math.round(Number(i.probe)*10)/10,gpu:YT(i.gpu),dpr:Math.round((Number(i.dpr)||1)*100)/100,size:[po(i.size?.[0],0,2e4)??0,po(i.size?.[1],0,2e4)??0],losses:po(i.losses,0,99)??0,failures:po(i.failures,0,9999)??0,hidden:i.hidden===!0,scene:jT(i.scene,60)}}function _y(i){return!i||i.type!=="health"||i.op==="ask"||i.v!==1||!ZT.includes(i.picture)?null:dp({backend:i.picture==="plain"?"flat":"three",tier:i.picture==="low"?"low":i.picture==="plain"?"flat":"high",stats:{fps:i.fps,worst:i.worst},probe:i.probe,gpu:i.gpu,dpr:i.dpr,size:i.size,losses:i.losses,failures:i.failures,hidden:i.hidden,scene:i.scene})}function KT(i,t,e){return!i||e-t>$s.stale?"stale":i.hidden?"idle":i.losses>=2||i.failures>0||i.fps!=null&&i.fps<$s.poor?"bad":i.fps!=null&&i.fps<$s.fine?"warn":i.picture==="plain"?"plain":"ok"}var up=Object.freeze({lit:"lit",low:"low",plain:"plain"});function JT({id:i,name:t},e,n){let s=KT(e?.report,e?.at??0,n),r=e?.report;if(!r||s==="stale")return{id:i,name:t,level:"stale",text:"no stage",tip:`${t}: not on a stage, or not heard from for a while`};let o=r.fps==null?"\u2026":`${r.fps} fps`,a=[`${t}: the ${up[r.picture]} stage${r.fps==null?", not measured yet":` at ${o}`}${r.worst!=null?`, longest frame ${r.worst} ms`:""}`,r.gpu?`Graphics: ${r.gpu}`:"Graphics: not known",`Window: ${r.size[0]} \xD7 ${r.size[1]} at ${r.dpr}x`,r.probe!=null?`Start-up test: a picture every ${r.probe} ms`:null,r.losses?`Lost its graphics context ${r.losses} time${r.losses===1?"":"s"}`:null,r.failures?`${r.failures} frame${r.failures===1?"":"s"} failed`:null,r.hidden?"The tab is in the background":null].filter(Boolean).join(`
`);return{id:i,name:t,level:s,text:s==="idle"?`${up[r.picture]} \xB7 away`:`${up[r.picture]} \xB7 ${o}`,tip:a}}var yy=Object.freeze({bad:4,warn:3,plain:2,ok:1,idle:0,stale:0});function by(i,t,e){let n=i.map(l=>JT(l,t.get(l.id),e)).sort((l,c)=>yy[c.level]-yy[l.level]||l.name.localeCompare(c.name)),s={ok:0,plain:0,warn:0,bad:0,idle:0,stale:0};for(let l of n)s[l.level]++;let r=s.bad?"bad":s.warn?"warn":s.plain?"plain":s.ok?"ok":"stale",a=[`${n.length-s.stale} of ${n.length} on a stage`];return s.bad&&a.push(`${s.bad} struggling`),s.warn&&a.push(`${s.warn} slow`),s.plain&&a.push(`${s.plain} on the plain stage`),{chips:n,level:r,counts:s,line:a.join(" \xB7 ")}}var QT=(i,t)=>t?game.i18n.format(`STAGECRAFT.Health.${i}`,t):game.i18n.localize(`STAGECRAFT.Health.${i}`),mu=class{constructor(t){this.host=t,this.intervals=[],this.lastAt=null,this.timer=setInterval(()=>this.send(),$s.every),this.first=setTimeout(()=>this.send(),4e3),this.later=null}stop(){clearInterval(this.timer),clearTimeout(this.first),clearTimeout(this.later)}frame(t,e=1){this.lastAt!==null&&(this.intervals.push((t-this.lastAt)*e),this.intervals.length>$s.window&&this.intervals.shift()),this.lastAt=t}report(){let t=this.host;return dp({backend:t.backend?.name,tier:t.backend?.name==="flat"?"flat":bs(),stats:vy(this.intervals),probe:t.speed?.last?.median??null,gpu:Vi().renderer,dpr:window.devicePixelRatio,size:[t.root?.clientWidth??0,t.root?.clientHeight??0],losses:t.losses,failures:t.guard?.total??0,hidden:document.hidden===!0,scene:t.scene?.name})}send(){let t=this.host;if(!t.running||!t.channel)return;let e=this.report();t.healthBoard?.take(game.user.id,e),t.channel.send({type:"health",...e})}changed(){clearTimeout(this.later),this.later=setTimeout(()=>this.send(),1200)}receive(t){t?.op==="ask"&&(clearTimeout(this.later),this.later=setTimeout(()=>this.send(),100+Math.random()*1200))}},gu=class{constructor(t){this.host=t,this.table=new Map,this.el=document.createElement("div"),this.el.className="stagecraft-health",this.el.innerHTML='<button type="button" class="pill" aria-expanded="false"><i class="dot"></i><span></span></button><div class="panel" hidden><p class="line"></p><ul></ul></div>',t.root.append(this.el),this.pill=this.el.querySelector(".pill"),this.panel=this.el.querySelector(".panel"),this.pill.addEventListener("click",this.#t),this.timer=setInterval(()=>this.render(),5e3),this.render()}dispose(){clearInterval(this.timer),this.pill?.removeEventListener("click",this.#t),this.el?.remove(),this.el=null}take(t,e){this.table.set(t,{report:e,at:Date.now()}),this.render()}receive(t,e){let n=_y(t);n&&this.take(e,n)}#t=()=>{let t=this.panel.hidden;this.panel.hidden=!t,this.pill.setAttribute("aria-expanded",t?"true":"false"),t&&(this.host.channel?.send({type:"health",op:"ask"}),this.host.health?.send()),this.render()};close(){return!this.el||this.panel.hidden?!1:(this.panel.hidden=!0,this.pill.setAttribute("aria-expanded","false"),!0)}render(){if(!this.el)return;let t=game.users.filter(s=>s.active).map(s=>({id:s.id,name:s.name})),e=by(t,this.table,Date.now());if(this.pill.dataset.level=e.level,this.pill.title=e.line,this.pill.querySelector("span").textContent=QT("Label",{n:e.chips.length-e.counts.stale,of:e.chips.length}),this.panel.hidden)return;this.panel.querySelector(".line").textContent=e.line,this.panel.querySelector("ul").replaceChildren(...e.chips.map(s=>{let r=document.createElement("li");r.dataset.level=s.level,r.title=s.tip;let o=document.createElement("b");o.textContent=s.name;let a=document.createElement("span");return a.textContent=s.text,r.append(o,a),r}))}};var xu=()=>({...Gi,...globalThis.__stagecraftSpeed??{}}),My=i=>Math.round(i*10)/10,yu=class{constructor(t){this.host=t,this.probe=null,this.strikes=0,this.hard=0,this.last=null,this.timer=null,this.starting=null,this.gaps=[],this.watch=null,this.away=()=>this.#n(),document.addEventListener("visibilitychange",this.away),this.#t()}get wanted(){if(sl()!=="auto"||this.host.backend?.name!=="three")return!1;let t=Zu();return!(t&&t.ok)}#t(){let t=null,e=n=>{this.watch=null,t!==null&&this.gaps.push(n-t),t=n,this.gaps.length<40&&!this.host.running&&(this.watch=requestAnimationFrame(e))};this.watch=requestAnimationFrame(e)}start(){if(this.cancel(),!this.wanted)return;let t=this.starting={},e=()=>{this.starting===t&&(this.timer=setTimeout(()=>this.#e(),xu().settle))};game.ready?e():Hooks.once("ready",e)}cancel(){clearTimeout(this.timer),this.timer=null,this.probe=null,this.starting=null}stop(){this.cancel(),this.watch!==null&&cancelAnimationFrame(this.watch),this.watch=null,document.removeEventListener("visibilitychange",this.away)}#e(){if(this.timer=null,!(!this.host.running||!this.wanted)){if(document.hidden){this.timer=setTimeout(()=>this.#e(),2e3);return}this.probe=new nl(xu())}}#n(){!document.hidden||!this.probe||(this.probe=null,this.timer=setTimeout(()=>this.#e(),xu().settle))}feed(t){let e=this.probe;e&&(e.push(t),e.done&&this.#i(e))}#i(t){this.probe=null;let e=xu(),n=t.result(),s=Yp(this.gaps,e),r=Kp(n,{limits:e,display:s,cap:this.host.pace?.cap??60,patient:t.elapsed>=e.patience}),o=bs();this.last={verdict:r,median:My(n.median),display:My(s),at:Date.now()},console.info(`${Z} | speed test: a picture every ${this.last.median} ms at the median (${n.n} gaps; the display allows ${this.last.display} ms, ${Vi().renderer||"unknown graphics"}): ${r}`),this.host.health?.changed();let a=Jp({tier:o,verdict:r,strikes:this.strikes,hard:this.hard});if(this.strikes=a.strikes,this.hard=a.hard,a.to){this.#r(a.to,r);return}if(r==="ok"){qu({ok:!0});return}(r==="slow"||r==="very-slow")&&(this.timer=setTimeout(()=>this.#e(),e.again))}#r(t,e){qu({tier:t}),ui.notifications?.info(game.i18n.localize(t==="flat"?"STAGECRAFT.Notify.SpeedFlat":"STAGECRAFT.Notify.SpeedLow")),console.info(`${Z} | speed test: this computer is moved down to the ${t} stage (${e}, twice)`),this.host.rebuild().catch(n=>console.warn(`${Z} | could not draw the lighter stage`,n))}};var tE=450,vu=16,_u=class{constructor(t){this.host=t,this.el=null,this.key=null,this.say=null,this.timer=null}hover(t,e,n){this.#t(t,e,n,()=>Yx(this.host.stage?.cards.get(t)?.person))}hoverWall(t,e,n){if(!game.user.isGM||!this.host.chalk)return this.#t(null,e,n);this.#t(`wall:${Math.round(t.x/24)}:${Math.round(t.y/24)}`,e,n,()=>{let s=this.host.chalk.painterAt(t);return s?{name:game.i18n.format("STAGECRAFT.Chalk.PaintedBy",{name:s}),text:""}:null})}#t(t,e,n,s=null){if(this.at={x:e,y:n},t!==this.key){this.hide(),this.key=t,this.say=s,t&&(this.timer=setTimeout(()=>this.#e(),tE));return}this.el?.classList.contains("shown")&&this.#n(e,n)}hide(){clearTimeout(this.timer),this.timer=null,this.key=null,this.el?.classList.remove("shown")}dispose(){this.hide(),this.el?.remove(),this.el=null}#e(){this.timer=null;let t=this.host;if(!this.key||!t.running||t.dragging||t.chalk?.inHand)return;let e=this.say?.();if(!e)return;this.el||(this.el=document.createElement("div"),this.el.className="stagecraft-tip",this.el.setAttribute("role","tooltip"),t.root.append(this.el)),this.el.replaceChildren();let n=document.createElement("div");if(n.className="tip-name",n.textContent=e.name,this.el.append(n),e.text){let s=document.createElement("div");s.className="tip-text",s.textContent=e.text,this.el.append(s)}this.el.classList.add("shown"),this.#n(this.at.x,this.at.y)}#n(t,e){let n=this.el,s=n.offsetWidth,r=n.offsetHeight,o=Math.max(8,Math.min(t+vu,window.innerWidth-s-8)),a=e+vu+r>window.innerHeight-8?Math.max(8,e-vu-r):e+vu;n.style.left=`${Math.round(o)}px`,n.style.top=`${Math.round(a)}px`}};var wy=Object.freeze(["face","balloon","mark"].map(i=>Object.freeze({kind:i,ids:Object.freeze(_l.filter(t=>xn[t].kind===i))}))),Ak=Object.freeze(["floor","down","choose","sheet"]);function Sy({isGM:i=!1,mayEmote:t=!1,person:e=null,speaker:n=!1,down:s=!1,chosen:r=!1,sheet:o=!1,extra:a=[]}={}){let l=[];if(i&&(l.push({id:"floor",on:!!n}),l.push({id:"down",on:!!s}),l.push({id:"choose",on:!!r})),o&&l.push({id:"sheet",on:!1}),i){let h=new Set;for(let u of Array.isArray(a)?a:[]){let d=typeof u?.label=="string"?u.label.trim():"";typeof u?.id!="string"||!u.id||!d||h.has(u.id)||(h.add(u.id),l.push({id:`extra:${u.id}`,on:!1,label:d}))}}if(!t&&!l.length)return null;let c=e?.emote;return{emotes:!!t,kept:c?.id&&!c.once&&xn[c.id]?c.id:null,actions:l}}function bu(i,t,e,n,s,r,o=8){let a=i+6,l=t+6;return a+e>s-o&&(a=Math.max(o,i-6-e)),l+n>r-o&&(l=Math.max(o,r-o-n)),{left:Math.round(a),top:Math.round(l)}}var Mu=(i,t,e)=>Math.max(t,Math.min(e,i)),wu=i=>Math.round(i*1e3)/1e3;function Su(i){return!Array.isArray(i)||i.length<2||!Number.isFinite(i[0])||!Number.isFinite(i[1])?null:[wu(Mu(i[0],0,1)),wu(Mu(i[1],0,1))]}var Ty=(i,t)=>Array.isArray(i)&&i[0]===t[0]&&i[1]===t[1],gs=(i,t,e)=>typeof i?.id=="string"&&i.id?i.id:`${e}-${t+1}`;function Ey(i,t,e){let n=Su(e);if(!n||!Array.isArray(i))return i;let s=i.findIndex((r,o)=>gs(r,o,"mark")===t);return s<0||Ty(i[s].at,n)?i:i.map((r,o)=>o===s?{...r,at:n}:r)}function Ay(i,t,e,n){let s=Su(n);if(!s||!Array.isArray(i))return i;let r=i.findIndex((a,l)=>gs(a,l,"zone")===t),o=i[r]?.shape;return r<0||!Array.isArray(o)||!(e>=0&&e<o.length)||Ty(o[e],s)?i:i.map((a,l)=>l===r?{...a,shape:o.map((c,h)=>h===e?s:c)}:a)}function Cy(i,t,e,n){if(!Array.isArray(i)||!Number.isFinite(e)||!Number.isFinite(n))return i;let s=i.findIndex((d,f)=>gs(d,f,"zone")===t),r=i[s];if(s<0||!Array.isArray(r?.shape))return i;let o=[...r.shape,...Array.isArray(r.floor)?r.floor:[]].filter(d=>Array.isArray(d)),a=[Math.min(...o.map(d=>d[0])),Math.min(...o.map(d=>d[1]))],l=[Math.max(...o.map(d=>d[0])),Math.max(...o.map(d=>d[1]))],c=Mu(e,-a[0],1-l[0]),h=Mu(n,-a[1],1-l[1]);if(Math.abs(c)<5e-4&&Math.abs(h)<5e-4)return i;let u=d=>d.map(f=>[wu(f[0]+c),wu(f[1]+h)]);return i.map((d,f)=>f===s?{...d,shape:u(d.shape),...Array.isArray(d.floor)?{floor:u(d.floor)}:{}}:d)}function Ry(i,t,e,n=null){if(!Array.isArray(i))return i;let s=i.findIndex((c,h)=>gs(c,h,"zone")===t),r=i[s]?.shape;if(s<0||!Array.isArray(r)||!(e>=0&&e<r.length))return i;let o=r[e],a=r[(e+1)%r.length],l=Su(n)??Su([(o[0]+a[0])/2,(o[1]+a[1])/2]);return i.map((c,h)=>h===s?{...c,shape:[...r.slice(0,e+1),l,...r.slice(e+1)]}:c)}function Py(i,t,e){if(!Array.isArray(i))return i;let n=i.findIndex((r,o)=>gs(r,o,"zone")===t),s=i[n]?.shape;return n<0||!Array.isArray(s)||s.length<=3||!(e>=0&&e<s.length)?i:i.map((r,o)=>o===n?{...r,shape:s.filter((a,l)=>l!==e)}:r)}function fp(i){let t=(i??[]).filter(e=>Array.isArray(e));return t.length?[t.reduce((e,n)=>e+n[0],0)/t.length,t.reduce((e,n)=>e+n[1],0)/t.length]:null}function ky(i){let t=[];for(let e of i?.marks??[])t.push({kind:"mark",id:e.id,at:e.at,label:e.label??e.id});for(let e of i?.zones??[]){(e.shape??[]).forEach((s,r)=>t.push({kind:"vertex",id:e.id,index:r,at:s,label:e.name??e.id}));let n=fp(e.shape);n&&t.push({kind:"zone",id:e.id,at:n,label:e.name??e.id})}return t}var eE=.45,$a=()=>(globalThis.game?.time?.serverTime??Date.now())/1e3,Iy=Promise.resolve();function xs(i){let t=Iy.then(i,i);return Iy=t.catch(e=>console.warn(`${Z} | a write to the stage failed`,e)),t}function gp(i,t=null){if(t?.scene?.id===i.id&&t.stage)return t.stage;let{usable:e,scene:n}=nr(i);return e?new fr(n,Ro(i),{clock:$a}):null}function Za(i,t){return!game.user?.isGM||!t?.length?Promise.resolve(!1):xs(async()=>{let e=ni(i),n=sg(e,t,$a()+eE);return await i.update({[`flags.${Z}.published.cards`]:n}),!0})}async function qa(i,t,e={},n=null){let s=gp(i,n);if(!s)return[];let r=s.formationMoves(t,e);return await Za(i,r),r}async function Tu(i,{gait:t="walk"}={}){let e=rg(ni(i),{gait:t});return await Za(i,e),e}function Eu(i,t=null,e=null){if(!game.user?.isGM)return Promise.resolve(0);let n=gp(i,t);if(!n)return Promise.resolve(0);let s=n.exportPlaces();return xs(async()=>{let r=ni(i),o=ag(r,s,e),a=o.filter((l,c)=>l!==r[c]).length;return a&&(await i.update({[`flags.${Z}.published.cards`]:o}),Hooks.callAll("stagecraft.keep",{scene:i.id,changed:a,homes:o.filter(l=>Array.isArray(l.home)).map(l=>({id:l.id,home:l.home,homeYaw:l.homeYaw??0}))})),a})}async function Au(i,t){if(!game.user?.isGM||!Array.isArray(t)||t.length!==2||!t.every(s=>Number.isFinite(s)&&s>=0&&s<=1))return!1;let e=[Math.round(t[0]*1e3)/1e3,Math.round(t[1]*1e3)/1e3],n=i?.flags?.[Z]?.stage?.chalk?.box;return Array.isArray(n)&&n[0]===e[0]&&n[1]===e[1]?!1:(await i.update({[`flags.${Z}.stage.chalk.box`]:e}),Hooks.callAll("stagecraft.keepBox",{scene:i.id,at:e}),!0)}function Ya(i,t){return!game.user?.isGM||!t?Promise.resolve(!1):xs(async()=>{let e=i?.flags?.[Z]?.stage;if(!e)return!1;let n=Array.isArray(e.marks)?e.marks:[],s=Array.isArray(e.zones)?e.zones:[],r=n,o=s;t.mark?r=Ey(n,t.mark.id,t.mark.at):t.vertex?o=Ay(s,t.vertex.id,t.vertex.index,t.vertex.at):t.zone?o=Cy(s,t.zone.id,t.zone.dx,t.zone.dy):t.addVertex?o=Ry(s,t.addVertex.id,t.addVertex.after,t.addVertex.at??null):t.removeVertex&&(o=Py(s,t.removeVertex.id,t.removeVertex.index));let a={};return r!==n&&(a[`flags.${Z}.stage.marks`]=r),o!==s&&(a[`flags.${Z}.stage.zones`]=o),Object.keys(a).length?(await i.update(a),Hooks.callAll("stagecraft.keepStage",{scene:i.id,marks:r.map((l,c)=>({id:gs(l,c,"mark"),at:l.at})),zones:o.map((l,c)=>({id:gs(l,c,"zone"),shape:l.shape,...Array.isArray(l.floor)?{floor:l.floor}:{}}))}),!0):!1})}async function Cu(i,t=null){let e=gp(i,t);if(!e)return[];let n=e.marks.map(o=>({...o,capacity:o.capacity-(e.resting.get(o.id)?.size??0)})).filter(o=>o.capacity>0),s=[...e.cards.values()].filter(o=>!o.mark&&o.holder===null).map(o=>({id:o.id,X:o.walk?o.walk.to.X:o.puppet.x,Z:o.walk?o.walk.to.Z:o.Z})),r=cl(n,s).map(({card:o,mark:a})=>({id:o,mark:a,gait:"hurry",still:!0,packed:!1}));return await Za(i,r),r}var mo=i=>i?.flags?.[Z]?.live?.life!==!1;function go(i){let t=i?.flags?.[Z]?.live?.board;return typeof t=="boolean"?t:i?.flags?.[Z]?.stage?.board===!0}var Ru=(i,t)=>i.update({[`flags.${Z}.live.life`]:!!t}),Pu=(i,t)=>i.update({[`flags.${Z}.live.board`]:!!t});function xo(i,t,e){return game.user?.isGM?xs(async()=>{let n=ni(i);if(!n.some(r=>r.id===t))return!1;let s=n.map(r=>{if(r.id!==t)return r;let o={...r};return e?o.down=!0:delete o.down,o});return await i.update({[`flags.${Z}.published.cards`]:s}),!0}):Promise.resolve(!1)}var xp=i=>i?.flags?.[Z]?.live?.speaker??null,yo=(i,t)=>i.update({[`flags.${Z}.live.speaker`]:typeof t=="string"?t:null}),ku=i=>i?.flags?.[Z]?.live?.turn??null;function Ly(i,t){if(!game.user?.isGM)return Promise.resolve(!1);let e=typeof t=="string"?t:null;return ku(i)===e?Promise.resolve(!1):i.update({[`flags.${Z}.live.turn`]:e}).then(()=>!0)}function Dy(i,t,e){if(!game.user?.isGM)return Promise.resolve(!1);let n=ds(e);return xs(async()=>{let s=ni(i),r=s.find(a=>a.id===t);if(!r||cx(r.badges,n))return!1;let o=s.map(a=>{if(a.id!==t)return a;let l={...a};return n.length?l.badges=n:delete l.badges,l});return await i.update({[`flags.${Z}.published.cards`]:o}),!0})}function ja(i,t,e,{keep:n=!1}={}){if(!game.user?.isGM)return Promise.resolve(!1);let s=tg(e,{keep:n,t0:$a()+nE});return s?xs(async()=>{let r=ni(i);return r.some(o=>o.id===t)?(await i.update({[`flags.${Z}.published.cards`]:r.map(o=>o.id===t?{...o,emote:s}:o)}),!0):!1}):Promise.resolve(!1)}var nE=.25,pp=new Set;function Ny(i){if(typeof i!="function")throw new TypeError("a moments provider must be a function of the scene");return pp.add(i),()=>pp.delete(i)}var mp=new Set;function Oy(i){if(typeof i!="function")throw new TypeError("a cover provider must be a function");return mp.add(i),()=>mp.delete(i)}function yp(){let i=[];for(let t of mp)try{let e=t();Array.isArray(e)&&i.push(...e.filter(n=>Array.isArray(n?.rect)||Array.isArray(n?.circle)))}catch(e){console.warn(`${Z} | a cover provider failed`,e)}return i}function vp(i,t,e){let n=r=>e.ox+(r-t.left)/e.s,s=r=>e.oy+(r-t.top)/e.s;return i.map(r=>r.rect?{rect:[n(r.rect[0]),s(r.rect[1]),n(r.rect[2]),s(r.rect[3])]}:{circle:[n(r.circle[0]),s(r.circle[1]),r.circle[2]/e.s]})}function Fy(i){let t=[];for(let e of pp)try{let n=e(i);Array.isArray(n)&&t.push(...n.filter(s=>s&&typeof s.label=="string"&&typeof s.run=="function"))}catch(n){console.warn(`${Z} | a moments provider failed`,n)}return t}var Uy="stagecraft.emoteKeep",vo=i=>game.i18n.localize(`STAGECRAFT.Menu.${i}`),bp=new Set;function Hy(i){if(typeof i!="function")throw new TypeError("a card actions provider must be a function of the scene and the card");return bp.add(i),()=>bp.delete(i)}function iE(i,t,e){let n=[];for(let s of bp)try{for(let r of s(i,t,e)??[])r&&typeof r.id=="string"&&typeof r.run=="function"&&!n.some(o=>o.id===r.id)&&n.push(r)}catch(r){console.warn(`${Z} | a card actions provider failed`,r)}return n}var By=(i,t)=>!!i&&!!t&&sr(i,t,{handsOff:!1});function zy(i,t){let e=i?.actor?globalThis.game?.actors?.get?.(i.actor):null;return e?.sheet&&(t?.isGM||e.testUserPermission?.(t,"OBSERVER"))?e:null}var _p=new Map,sE=i=>(_p.has(i)||_p.set(i,`data:image/svg+xml;charset=utf-8,${encodeURIComponent(xn[i].svg)}`),_p.get(i)),Iu=class{constructor(t){this.host=t,this.el=null,this.card=null,this.keep=!1;try{this.keep=globalThis.localStorage?.getItem(Uy)==="1"}catch{}this.onDown=e=>{this.el&&!this.el.contains(e.target)&&this.close()},this.onKey=e=>{this.el&&e.key==="Escape"&&(e.preventDefault(),e.stopPropagation(),this.close())}}get isOpen(){return!!this.el}open(t,e,n){this.close();let s=this.host,r=s.stage?.cards.get(t);if(!r||s.dragging||s.chalk?.inHand)return!1;let o=game.user;this.extra=o?.isGM?iE(s.scene,t,r.person):[];let a=Sy({isGM:!!o?.isGM,mayEmote:By(r.person,o),person:r.person,speaker:s.stage.speaker===t,down:!!r.downTo,chosen:!!s.selected?.has(t),sheet:!!zy(r.person,o),extra:this.extra.map(c=>({id:c.id,label:c.label}))});if(!a)return!1;this.card=t,this.el=this.#t(r.person,a),document.body.append(this.el);try{this.el.showPopover?.()}catch{}let l=bu(e,n,this.el.offsetWidth,this.el.offsetHeight,window.innerWidth,window.innerHeight);return this.el.style.left=`${l.left}px`,this.el.style.top=`${l.top}px`,document.addEventListener("pointerdown",this.onDown,!0),window.addEventListener("keydown",this.onKey,!0),this.el.focus({preventScroll:!0}),!0}close(){document.removeEventListener("pointerdown",this.onDown,!0),window.removeEventListener("keydown",this.onKey,!0),this.el?.remove(),this.el=null,this.card=null}dispose(){this.close()}async emote(t,e,n=this.keep){let s=this.host;return game.user?.isGM?ja(s.scene,t,e,{keep:n}):game.users?.activeGM?(s.channel?.send({type:"emote",scene:s.scene.id,card:t,emote:e,keep:!!n}),!0):(globalThis.ui?.notifications?.warn(vo("NoGM")),!1)}receive(t,e){let n=this.host;if(!kn()||t?.scene!==n.scene?.id||typeof t.card!="string")return;let s=n.stage?.cards.get(t.card)?.person;By(s,game.users.get(e))&&ja(n.scene,t.card,typeof t.emote=="string"?t.emote:null,{keep:!!t.keep}).catch(r=>console.warn(`${Z} | could not put an emote on ${t.card}`,r))}#t(t,e){let n=document.createElement("div");n.id="stagecraft-card-menu",n.className="stagecraft-card-menu",n.setAttribute("popover","manual"),n.setAttribute("role","menu"),n.tabIndex=-1,n.addEventListener("contextmenu",r=>r.preventDefault());let s=document.createElement("div");if(s.className="menu-name",s.textContent=String(t.name??t.id).split(/\n|<br\s*\/?>|\\n/i)[0],n.append(s),e.emotes){for(let a of wy){let l=document.createElement("div");l.className="menu-label",l.textContent=vo(a.kind==="face"?"Faces":a.kind==="balloon"?"Balloons":"Marks");let c=document.createElement("div");c.className="menu-emotes";for(let h of a.ids){let u=this.#n("menu-emote",()=>this.#i(h));u.dataset.emote=h,u.title=xn[h].label,u.setAttribute("aria-label",xn[h].label),e.kept===h&&u.classList.add("on");let d=document.createElement("img");d.src=sE(h),d.alt="",d.draggable=!1,u.append(d),c.append(u)}n.append(l,c)}let r=document.createElement("div");r.className="menu-row";let o=this.#n("menu-keep",()=>{this.keep=!this.keep,o.classList.toggle("on",this.keep),o.setAttribute("aria-checked",String(this.keep));try{globalThis.localStorage?.setItem(Uy,this.keep?"1":"0")}catch{}});if(o.setAttribute("role","menuitemcheckbox"),o.setAttribute("aria-checked",String(this.keep)),o.classList.toggle("on",this.keep),o.textContent=vo("Keep"),o.title=vo("KeepTip"),r.append(o),e.kept){let a=this.#n("menu-clear",()=>this.#i(null));a.dataset.emote="",a.textContent=vo("Clear"),r.append(a)}n.append(r)}if(e.actions.length){let r=document.createElement("div");r.className="menu-actions";for(let o of e.actions){let a=this.#n("menu-action",()=>this.#r(o.id));a.dataset.action=o.id,a.textContent=o.label??vo(this.#e(o)),r.append(a)}n.append(r)}return n}#e({id:t,on:e}){return t==="floor"?e?"FloorTake":"FloorGive":t==="down"?e?"DownStand":"DownKnock":t==="choose"?e?"Unchoose":"Choose":"Sheet"}#n(t,e){let n=document.createElement("button");return n.type="button",n.className=t,n.setAttribute("role","menuitem"),n.addEventListener("click",s=>{s.preventDefault(),e()}),n}#i(t){let e=this.card;this.close(),!(!e||!this.host.stage?.cards.has(e))&&this.emote(e,t).catch(n=>console.warn(`${Z} | could not put an emote on ${e}`,n))}#r(t){let e=this.host,n=this.card;this.close();let s=n?e.stage?.cards.get(n):null;if(!s)return;let r=o=>console.warn(`${Z} | ${t} on ${n} failed`,o);if(t.startsWith("extra:")){let o=this.extra?.find(a=>`extra:${a.id}`===t);o&&Promise.resolve().then(()=>o.run()).catch(r);return}t==="floor"?yo(e.scene,e.stage.speaker===n?null:n).catch(r):t==="down"?xo(e.scene,n,!s.downTo).catch(r):t==="choose"?(e.selected.has(n)?e.selected.delete(n):e.selected.add(n),e.blocking?.selectionChanged()):t==="sheet"&&zy(s.person,game.user)?.sheet.render(!0)}};var _o="card";function rE(i){return String(i?.name??i?.id??"").split(/\n|<br\s*\/?>|\\n/i)[0].trim()||String(i?.id??"")}function oE(i,t,e){let n=Array.isArray(i?.at)&&Number.isFinite(i.at[0])&&Number.isFinite(i.at[1])?i.at:[.5,.5],s=a=>Math.min(1,Math.max(0,a)),r=Math.round(t.x+s(n[0])*t.width-e/2),o=Math.round(t.y+s(n[1])*t.height-e/2);return{x:r,y:o}}function Gy({cards:i=[],tokens:t=[],actors:e=new Map,rect:n,size:s}){let r=[],o=[],a=[],l=new Map(i.filter(h=>h&&typeof h.id=="string").map(h=>[h.id,h])),c=new Map;for(let h of t)!l.has(h.card)||c.has(h.card)?a.push(h.id):c.set(h.card,h);for(let[h,u]of l){let d=e.get(h)??null,f=typeof d=="string"?d:d?.id??null,g=!(typeof d=="object"&&d!==null&&d.link===!1),x=rE(u),p=u.portrait??null,m=c.get(h);if(!m){r.push({name:x,...f?{actorId:f,actorLink:g}:{actorLink:!1},...p?{texture:{src:p}}:{},...oE(u,n,s),width:1,height:1,hidden:!1,flags:{stagecraft:{[_o]:h}}});continue}let _={};m.name!==void 0&&m.name!==x&&(_.name=x),p&&m.img!==void 0&&m.img!==p&&(_["texture.src"]=p),f&&m.actorId!==f&&(_.actorId=f,_.actorLink=g),Object.keys(_).length&&o.push({_id:m.id,..._})}return{create:r,update:o,remove:a}}function Vy(i,t,{shift:e=!1}={}){let n=new Set(i??[]);return n.has(t)?(n.delete(t),{mode:"release",ids:[...n]}):e?(n.add(t),{mode:"acquire",ids:[...n]}):{mode:"replace",ids:[t]}}function Wy({hover:i=null,controlled:t=new Set,targeting:e=!1}={}){return e?{do:"mode",on:!1}:i&&!t.has(i)?{do:"target",id:i}:{do:"mode",on:!0}}function Mp(i,t="#e8493c"){let e=i?.color,n=typeof e=="string"?e:e?.css??(typeof e?.toString=="function"?e.toString():null);return typeof n=="string"&&/^#[0-9a-f]{3,8}$/i.test(n)?n:t}var wp=new Set;function Xy(i){if(typeof i!="function")throw new TypeError("a token actors provider must be a function of the scene and the card");return wp.add(i),()=>wp.delete(i)}var bo=(i,t)=>console.warn(`${Z} | ${i}`,t),Lu=class{constructor(t){this.host=t,this.localControl=new Set,this.localTargets=new Set,this.map=null,this.actors=new Map,this.signature=null,this.work=Promise.resolve(),this.hooks=[];let e=r=>r?.parent?.id===this.host.scene.id,n=r=>{e(r)&&(this.map=null)},s=()=>this.host.pace?.poke(performance.now());for(let r of["createToken","updateToken"])this.hooks.push([r,Hooks.on(r,n)]);this.hooks.push(["deleteToken",Hooks.on("deleteToken",r=>{e(r)&&(this.map=null,r.getFlag?.(Z,_o)&&(this.signature=null,this.ensure()))})]),this.hooks.push(["controlToken",Hooks.on("controlToken",s)])}dispose(){for(let[t,e]of this.hooks)Hooks.off(t,e);this.hooks=[],this.localControl.clear(),this.localTargets.clear()}#t(){if(this.map)return this.map;let t=new Map;for(let e of this.host.scene.tokens??[]){let n=e.flags?.[Z]?.[_o];typeof n=="string"&&!t.has(n)&&t.set(n,e)}return this.map=t}document(t){return this.#t().get(t)??null}#e(t){let e=this.#t().get(t);return!e||globalThis.canvas?.scene?.id!==this.host.scene.id?null:globalThis.canvas.tokens?.get?.(e.id)??null}#n=()=>Mp(game.user);state(){let t=new Set(this.localControl),e=new Map;for(let s of this.localTargets)e.set(s,[this.#n()]);let n=globalThis.canvas?.scene?.id===this.host.scene.id?globalThis.canvas.tokens:null;if(n?.get)for(let[s,r]of this.#t()){let o=n.get(r.id);if(o&&(o.controlled&&t.add(s),o.targeted?.size)){let a=[...o.targeted];a.sort((l,c)=>(c===game.user)-(l===game.user)),e.set(s,a.map(l=>Mp(l)))}}return{controlled:t,targets:e}}isControlled(t){return this.state().controlled.has(t)}isTargeted(t){let e=this.#e(t);return e?e.isTargeted===!0:this.localTargets.has(t)}select(t,{add:e=!1}={}){let n=this.#e(t);if(!n){let r=this.host.stage?.cards?.get?.(t)?.person;return r&&!sr(r,game.user)?!1:(e||this.localControl.clear(),this.localControl.add(t),this.host.pace?.poke(performance.now()),!0)}if(!n.document.isOwner)return!1;let s=globalThis.canvas.tokens;s.active||s.activate();try{return n.control({releaseOthers:!e})===!0}catch(r){return bo(`could not control ${t}'s token`,r),!1}}release(){this.localControl.clear();try{globalThis.canvas?.scene?.id===this.host.scene.id&&globalThis.canvas.tokens?.releaseAll?.()}catch(t){bo("could not release the controlled tokens",t)}this.host.pace?.poke(performance.now())}target(t,{add:e=!1}={}){let n=this.#e(t);if(this.host.pace?.poke(performance.now()),!n){let{ids:s}=Vy(this.localTargets,t,{shift:e});return this.localTargets=new Set(s),this.localTargets.has(t)}try{n.setTarget(!n.isTargeted,{releaseOthers:!e})}catch(s){bo(`could not aim at ${t}'s token`,s)}return n.isTargeted===!0}clearTargets(){this.localTargets.clear();let t=globalThis.canvas?.scene?.id===this.host.scene.id?globalThis.canvas.tokens:null;try{if(t?.setTargets)t.setTargets([],{mode:"replace"});else for(let e of[...game.user?.targets??[]])e.setTarget(!1,{releaseOthers:!1})}catch(e){bo("could not clear the targets",e)}this.host.pace?.poke(performance.now())}hasTargets(){return this.localTargets.size>0||(game.user?.targets?.size??0)>0}hasControlled(){return this.state().controlled.size>0}ensure({force:t=!1}={}){return!kn()||!this.host.scene?.tokens?this.work:(this.work=this.work.then(()=>this.#r(t)).catch(e=>bo("could not keep the tokens",e)),this.work)}async#i(t){if(t.actor&&game.actors?.get?.(t.actor))return t.actor;let e=this.actors.get(t.id),n=t.name??"";if(e&&e.name===n)return e.answer;let s=null;for(let r of wp)try{let o=await r(this.host.scene,t),a=typeof o=="string"?o:o?.id;if(a&&game.actors?.get?.(a)){s=o?.link===!1?{id:a,link:!1}:a;break}}catch(o){bo("a token actors provider failed",o)}return this.actors.set(t.id,{name:n,answer:s}),s}async#r(t){let e=this.host.scene;if(game.scenes?.get&&!game.scenes.get(e.id))return;let n=ni(e).filter(u=>u&&typeof u.id=="string"),s=JSON.stringify(n.map(u=>[u.id,u.name??null,u.portrait??null,u.actor??null]));if(!t&&s===this.signature)return;let r=new Map;for(let u of n){let d=await this.#i(u);d&&r.set(u.id,d)}let o=e.dimensions??{},a=o.sceneRect??{x:0,y:0,width:o.sceneWidth??e.width??4e3,height:o.sceneHeight??e.height??3e3},l=e.grid?.size??o.size??100;this.map=null;let c=[...e.tokens??[]].filter(u=>typeof u.flags?.[Z]?.[_o]=="string").map(u=>({id:u.id,card:u.flags[Z][_o],name:u.name,img:u.texture?.src,actorId:u.actorId??null})),h=Gy({cards:n,tokens:c,actors:r,rect:a,size:l});h.remove.length&&await e.deleteEmbeddedDocuments("Token",h.remove),h.update.length&&await e.updateEmbeddedDocuments("Token",h.update),h.create.length&&await e.createEmbeddedDocuments("Token",h.create),this.map=null,this.signature=s,(h.create.length||h.update.length||h.remove.length)&&this.host.pace?.poke(performance.now())}};var aE="http://www.w3.org/2000/svg",Ka=i=>game.i18n.localize(`STAGECRAFT.Editor.${i}`),Sp={on:!1},Du=class{constructor(t){this.host=t,this.on=!1,this.el=null,this.drag=null,this.frame=0}toggle(t=!this.on){return this.on=!!t&&!!this.host.backend?.rig,Sp.on=this.on,this.on?this.#t():this.#e(),this.on}refresh(){this.on&&!this.drag&&this.#r()}dispose(){this.#e()}#t(){if(this.el)return;this.el=document.createElement("div"),this.el.className="stagecraft-editor",this.el.innerHTML='<svg class="outlines" aria-hidden="true"></svg><div class="handles"></div><div class="note" role="status"></div>',this.el.querySelector(".note").textContent=Ka("Note"),this.host.root.append(this.el),this.el.addEventListener("pointerdown",this.#o),this.el.addEventListener("dblclick",this.#u),this.#r();let t=()=>{this.on&&(this.#s(),this.frame=requestAnimationFrame(t))};this.frame=requestAnimationFrame(t)}#e(){cancelAnimationFrame(this.frame),this.el?.removeEventListener("pointerdown",this.#o),this.el?.removeEventListener("dblclick",this.#u),this.el?.remove(),this.el=null,this.drag=null,this.on=!1}#n([t,e]){let n=this.host.backend;return{x:(n.rig.map.x(t)-n.view.ox)*n.view.s,y:(n.rig.map.y(e)-n.view.oy)*n.view.s}}#i(){let t=tr(this.host.scene.flags?.[Z]?.stage??{}).scene;return{marks:t.marks??[],zones:(t.zones??[]).map(e=>this.drag?.live?.id===e.id?{...e,shape:this.drag.live.shape}:e)}}#r(){if(!this.el)return;let t=this.el.querySelector(".handles");t.replaceChildren();let{marks:e,zones:n}=this.#i();for(let s of ky({marks:e,zones:n})){let r=document.createElement("div");r.className=`handle ${s.kind}`,r.dataset.kind=s.kind,r.dataset.id=s.id,s.index!==void 0&&(r.dataset.index=String(s.index)),r.title=s.kind==="mark"?`${Ka("Mark")}: ${s.label}`:s.kind==="vertex"?`${Ka("Corner")}: ${s.label}`:`${Ka("Zone")}: ${s.label}`,r.setAttribute("role","button"),r.setAttribute("aria-label",r.title),t.append(r)}for(let s of n)(s.shape??[]).forEach((r,o)=>{let a=document.createElement("div");a.className="handle edge",a.dataset.kind="edge",a.dataset.id=s.id,a.dataset.index=String(o),a.title=Ka("EdgeTip"),t.append(a)});this.#s()}#s(){if(!this.el||!this.host.backend?.rig)return;let{marks:t,zones:e}=this.#i(),n=new Map;for(let r of t)n.set(`mark:${r.id}`,r.at);for(let r of e)r.shape.forEach((o,a)=>n.set(`vertex:${r.id}:${a}`,o)),n.set(`zone:${r.id}`,fp(r.shape)),r.shape.forEach((o,a)=>{let l=r.shape[(a+1)%r.shape.length];n.set(`edge:${r.id}:${a}`,[(o[0]+l[0])/2,(o[1]+l[1])/2])});for(let r of this.el.querySelectorAll(".handle")){let o=r.dataset.kind==="mark"||r.dataset.kind==="zone"?`${r.dataset.kind}:${r.dataset.id}`:`${r.dataset.kind}:${r.dataset.id}:${r.dataset.index}`,a=n.get(o);if(!a){r.hidden=!0;continue}r.hidden=!1;let l=this.#n(a);r.style.left=`${l.x}px`,r.style.top=`${l.y}px`}this.el.querySelector(".outlines").replaceChildren(...e.map(r=>{let o=document.createElementNS(aE,"polygon");return o.setAttribute("points",r.shape.map(a=>{let l=this.#n(a);return`${l.x},${l.y}`}).join(" ")),o.setAttribute("class",`outline ${r.kind??""}`),o}))}#o=t=>{let e=t.target.closest?.(".handle");if(!e||t.button!==0||!this.host.backend)return;t.preventDefault(),t.stopPropagation();let n=e.dataset.kind;if(n==="edge")return;let s=e.dataset.id,r=e.dataset.index===void 0?null:Number(e.dataset.index),o=this.host.scene.flags?.[Z]?.stage??{},a=this.#i().zones.find(l=>l.id===s);this.drag={kind:n,id:s,index:r,el:e,start:this.#a(t),shape:a?a.shape.map(l=>[...l]):null,floor:null,live:null,moved:!1,raw:o},e.setPointerCapture?.(t.pointerId),e.classList.add("held"),e.addEventListener("pointermove",this.#c),e.addEventListener("pointerup",this.#h),e.addEventListener("pointercancel",this.#l)};#a(t){let e=this.host.root.getBoundingClientRect(),n=this.host.backend.paintingAt?.(t.clientX-e.left,t.clientY-e.top);return n?[n.x,n.y]:null}#c=t=>{let e=this.drag;if(!e)return;let n=this.#a(t);if(n){if(e.moved=!0,e.at=n,e.kind==="mark")e.el.style.left=`${this.#n(n).x}px`,e.el.style.top=`${this.#n(n).y}px`;else if(e.kind==="vertex")e.live={id:e.id,shape:e.shape.map((s,r)=>r===e.index?n:s)},this.#s();else if(e.kind==="zone"&&e.start){let s=n[0]-e.start[0],r=n[1]-e.start[1];e.live={id:e.id,shape:e.shape.map(o=>[Math.max(0,Math.min(1,o[0]+s)),Math.max(0,Math.min(1,o[1]+r))])},e.delta=[s,r],this.#s()}}};#h=t=>{let e=this.drag;if(!e||(this.#d(t),!e.moved||!e.at))return;let n=e.kind==="mark"?{mark:{id:e.id,at:e.at}}:e.kind==="vertex"?{vertex:{id:e.id,index:e.index,at:e.at}}:{zone:{id:e.id,dx:e.delta?.[0]??0,dy:e.delta?.[1]??0}};Ya(this.host.scene,n).catch(s=>console.warn(`${Z} | could not move that`,s)).finally(()=>this.#r())};#l=t=>{this.#d(t),this.#r()};#d(t){let e=this.drag;this.drag=null,e&&(e.el.classList.remove("held"),e.el.releasePointerCapture?.(t.pointerId),e.el.removeEventListener("pointermove",this.#c),e.el.removeEventListener("pointerup",this.#h),e.el.removeEventListener("pointercancel",this.#l))}#u=t=>{let e=t.target.closest?.(".handle");if(!e)return;let n=e.dataset.id,s=Number(e.dataset.index);t.preventDefault(),t.stopPropagation();let r=e.dataset.kind==="vertex"?{removeVertex:{id:n,index:s}}:e.dataset.kind==="edge"?{addVertex:{id:n,after:s}}:null;r&&Ya(this.host.scene,r).catch(o=>console.warn(`${Z} | could not change that zone`,o)).finally(()=>this.#r())}};var xe=(i,t)=>t?game.i18n.format(`STAGECRAFT.Bar.${i}`,t):game.i18n.localize(`STAGECRAFT.Bar.${i}`),lE=["hands","mode","freeze","undo","wipe","wipeone","hide"],Nu=class{constructor(t){this.host=t,this.el=document.createElement("div"),this.el.className="stagecraft-bar",this.el.setAttribute("role","toolbar"),this.el.setAttribute("aria-label",xe("Label")),this.el.innerHTML=lE.map(e=>`<button type="button" data-act="${e}"></button>`).join(""),t.root.append(this.el),this.el.addEventListener("click",this.#n),this.refresh()}dispose(){this.el?.removeEventListener("click",this.#n),this.el?.remove(),this.el=null}get#t(){return this.host.scene}get#e(){return this.#t.flags?.[Z]?.live??{}}refresh(){if(!this.el)return;let t=this.host.chalk;if(!t){this.el.hidden=!0;return}this.el.hidden=!1;let e=t.policy(),n=this.#e.chalk?.mode??null,s=(r,o,{on:a=!1,tip:l="",disabled:c=!1}={})=>{let h=this.el.querySelector(`[data-act="${r}"]`);h.textContent=o,h.title=l,h.setAttribute("aria-pressed",a?"true":"false"),h.classList.toggle("on",a),h.disabled=c};s("hands",xe("Hands.Label"),{on:ir(this.#t),tip:xe("Hands.Tip")}),s("mode",n?xe("Mode.Set",{mode:xe(`Mode.${n}`)}):xe("Mode.Scene",{mode:xe(`Mode.${e.mode}`)}),{on:!!n,tip:xe("Mode.Tip")}),s("freeze",xe("Freeze.Label"),{on:e.locked,tip:xe("Freeze.Tip")}),s("undo",xe("Undo.Label"),{tip:xe("Undo.Tip"),disabled:!t.store.ready}),s("wipe",xe("Wipe.Label"),{tip:xe("Wipe.Tip"),disabled:!t.store.ready}),s("wipeone",xe("WipeOne.Label"),{tip:xe("WipeOne.Tip"),disabled:!t.store.ready}),s("hide",xe("Hide.Label"),{on:this.#e.chalkHidden===!0,tip:xe("Hide.Tip")})}#n=t=>{let e=t.target.closest("button[data-act]");!e||e.disabled||this.#i(e.dataset.act).catch(n=>console.warn(`${Z} | the stage bar could not do "${e.dataset.act}"`,n))};async#i(t){let e=this.#t,n=this.host.chalk,s=n?.store;if(t==="hands")await e.update({[`flags.${Z}.live.handsOff`]:!ir(e)});else if(t==="mode")await e.update({[`flags.${Z}.live.chalk.mode`]:Tx(this.#e.chalk?.mode)});else if(t==="freeze")await e.update({[`flags.${Z}.live.chalk.locked`]:!n.policy().locked});else if(t==="hide")await e.update({[`flags.${Z}.live.chalkHidden`]:this.#e.chalkHidden!==!0});else if(t==="undo")await s.undo(e.id);else if(t==="wipe")await foundry.applications.api.DialogV2.confirm({window:{title:xe("Wipe.Title")},content:`<p>${xe("Wipe.Ask")}</p>`,yes:{default:!1}})&&await s.wipe(e.id);else if(t==="wipeone"){let r=n.painters();if(!r.length){ui.notifications?.info(xe("WipeOne.None"));return}let o=await foundry.applications.api.DialogV2.wait({window:{title:xe("WipeOne.Title")},content:`<p>${xe("WipeOne.Ask")}</p>`,buttons:[...r.map(a=>({action:a.by,label:xe("WipeOne.Who",{name:a.name,tiles:a.tiles}),icon:"fa-solid fa-eraser"})),{action:"",label:xe("WipeOne.Cancel"),default:!0}],rejectClose:!1});o&&await s.wipe(e.id,{by:o})}this.refresh()}};var ye=(i,t)=>t?game.i18n.format(`STAGECRAFT.Blocking.${i}`,t):game.i18n.localize(`STAGECRAFT.Blocking.${i}`),Tp={line:"Line",huddle:"Huddle",talk:"Talk",gangup:"Gangup",panel:"Panel",standoff:"Standoff",circle:"Circle",queue:"Queue",scatter:"Scatter",audience:"Audience",position:"Position"},Ou=class{constructor(t){this.host=t,this.armed=null,this.el=document.createElement("div"),this.el.className="stagecraft-bar stagecraft-blocking",this.el.setAttribute("role","toolbar"),this.el.setAttribute("aria-label",ye("Label")),this.el.innerHTML=`
      <div class="row">
        <button type="button" data-act="life"></button>
        <button type="button" data-act="board"></button>
        <span class="sep"></span>
        ${ul.map(e=>`<button type="button" data-act="form" data-kind="${e}"></button>`).join("")}
        <span class="sep"></span>
        <button type="button" data-act="tidy"></button>
        <button type="button" data-act="places"></button>
        <button type="button" data-act="keep"></button>
        <button type="button" data-act="boxhere"></button>
        <button type="button" data-act="edit"></button>
      </div>
      <div class="row moments" hidden></div>
      <div class="hint" hidden></div>`,t.root.append(this.el),this.el.addEventListener("click",this.#n),this.el.addEventListener("dblclick",this.#i),this.refresh()}dispose(){this.el?.removeEventListener("click",this.#n),this.el?.removeEventListener("dblclick",this.#i),this.el?.remove(),this.el=null}get#t(){return this.host.scene}refresh(){if(!this.el)return;let t=this.#t,e=(r,o,{on:a=!1,tip:l=""}={})=>{r.textContent=o,r.title=l,r.setAttribute("aria-pressed",a?"true":"false"),r.classList.toggle("on",a)};e(this.el.querySelector('[data-act="life"]'),ye("Life.Label"),{on:mo(t),tip:ye("Life.Tip")}),e(this.el.querySelector('[data-act="board"]'),ye("Board.Label"),{on:go(t),tip:ye("Board.Tip")});for(let r of this.el.querySelectorAll('[data-act="form"]')){let o=r.dataset.kind;e(r,ye(`Form.${Tp[o]}.Label`),{on:this.armed===o,tip:`${ye(`Form.${Tp[o]}.Tip`)} ${ye("Form.How")}`})}e(this.el.querySelector('[data-act="tidy"]'),ye("Tidy.Label"),{tip:ye("Tidy.Tip")}),e(this.el.querySelector('[data-act="places"]'),ye("Places.Label"),{tip:ye("Places.Tip")}),e(this.el.querySelector('[data-act="keep"]'),ye("Keep.Label"),{tip:ye("Keep.Tip")}),e(this.el.querySelector('[data-act="boxhere"]'),ye("Box.Label"),{on:this.armed==="box",tip:ye("Box.Tip")}),e(this.el.querySelector('[data-act="edit"]'),ye("Edit.Label"),{on:!!this.host.editor?.on,tip:ye("Edit.Tip")});let n=Fy(t),s=this.el.querySelector(".moments");s.hidden=!n.length,s.innerHTML=n.map((r,o)=>`<button type="button" data-act="moment" data-i="${o}" title="${$y(r.tip??"")}">${$y(r.label)}</button>`).join(""),this.moments=n,this.#e()}#e(){let t=this.el.querySelector(".hint"),e=this.host.selected?.size??0,n=[];this.armed&&n.push(this.armed==="box"?ye("Box.Armed"):ye("Armed",{name:ye(`Form.${Tp[this.armed]}.Label`)})),e&&n.push(ye("Selected",{n:e})),t.hidden=!n.length,t.textContent=n.join(" \xB7 ")}selectionChanged(){this.el&&this.#e()}disarm(){return this.armed?(this.armed=null,this.refresh(),!0):!1}async placeArmed({card:t=null,at:e=null}){let n=this.armed;if(!n)return!1;if(this.disarm(),n==="box")return e&&await Au(this.#t,e),!0;let s=this.host.selected?.size?[...this.host.selected]:null,r={ids:s,focus:t??e??null};return t&&n==="gangup"&&(r.target=t),t&&n==="talk"&&(r.speakers=[t,...(s??[]).filter(o=>o!==t)]),s&&n==="talk"&&!t&&(r.speakers=s.slice(0,2)),(t||s)&&(r.party=!0),t&&s&&!s.includes(t)&&(r.ids=[...s,t]),await qa(this.#t,n,r,this.host),!0}#n=t=>{let e=t.target.closest("button[data-act]");!e||e.disabled||this.#r(e).catch(n=>console.warn(`${Z} | the blocking strip could not do "${e.dataset.act}"`,n))};#i=t=>{let e=t.target.closest('button[data-act="form"]');if(!e)return;this.armed=null;let n=this.host.selected?.size?[...this.host.selected]:null;qa(this.#t,e.dataset.kind,{ids:n,party:!!n},this.host).then(()=>this.refresh()).catch(s=>console.warn(`${Z} | the formation could not be made`,s))};async#r(t){let e=this.#t,n=t.dataset.act;if(n==="life")await Ru(e,!mo(e));else if(n==="board")await Pu(e,!go(e));else if(n==="form")this.armed=this.armed===t.dataset.kind?null:t.dataset.kind;else if(n==="tidy")await Cu(e,this.host);else if(n==="places")await Tu(e);else if(n==="edit")this.host.editor?.toggle();else if(n==="boxhere")this.armed=this.armed==="box"?null:"box";else if(n==="keep"){let s=this.host.selected?.size?[...this.host.selected]:null;if(await foundry.applications.api.DialogV2.confirm({window:{title:ye("Keep.Title")},content:`<p>${ye(s?"Keep.AskSome":"Keep.AskAll",{n:s?.length??0})}</p>`,yes:{default:!1}})){let o=await Eu(e,this.host,s);ui.notifications?.info(ye("Keep.Done",{n:o}))}}else n==="moment"&&await this.moments?.[Number(t.dataset.i)]?.run?.(e);this.refresh()}};function $y(i){return String(i).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}var Ep=new Set;function Zy(i){if(typeof i!="function")throw new TypeError("a margins provider must be a function");return Ep.add(i),()=>Ep.delete(i)}function Zs(){let i={left:0,right:0,top:0,bottom:0};for(let t of Ep)try{let e=t();for(let n of Object.keys(i))Number.isFinite(e?.[n])&&e[n]>i[n]&&(i[n]=e[n])}catch(e){console.warn(`${Z} | a margins provider failed`,e)}return i}var qy=i=>Math.min(1,Math.max(0,i));function Mo(i,t=80){return typeof i!="string"?"":i.split(/\n|<br\s*\/?>|\\n/i)[0].replace(/\s+/g," ").trim().slice(0,t)}function Yy(i){return Array.isArray(i)&&i.length>=2&&Number.isFinite(i[0])&&Number.isFinite(i[1])?[qy(i[0]),qy(i[1])]:null}function cE(i){let t=[];for(let e of Array.isArray(i)?i:[]){if(!e||typeof e.id!="string"||!e.id.trim()||t.some(s=>s.id===e.id))continue;let n=Mo(e.label,40);n&&t.push({id:e.id,label:n})}return t}function jy(i,t=24){let e=[],n=[],s=new Set;for(let r of Array.isArray(i)?i:[i])if(!(!r||typeof r!="object")){for(let o of cE(r.ways))n.some(a=>a.id===o.id)||n.push(o);for(let o of Array.isArray(r.people)?r.people:[]){if(e.length>=t)break;!o||typeof o.id!="string"||!o.id.trim()||s.has(o.id)||(s.add(o.id),e.push({id:o.id,name:Mo(o.name)||o.id,title:Mo(o.title,120),portrait:typeof o.portrait=="string"&&o.portrait?o.portrait:null,at:Yy(o.at),size:Number.isFinite(o.size)&&o.size>0?Math.min(3,o.size):1,way:typeof o.way=="string"&&o.way?o.way:null,note:Mo(o.note,120)}))}}return{people:e,ways:n}}function Ky(i,t=8){let e=[],n=new Set;for(let s of Array.isArray(i)?i:[]){if(e.length>=t)break;!s||typeof s.id!="string"||!s.id.trim()||n.has(s.id)||(n.add(s.id),e.push({id:s.id,name:Mo(s.name)||s.id,portrait:typeof s.portrait=="string"&&s.portrait?s.portrait:null,note:Mo(s.note,120)}))}return e}function Jy(i,t){let e=new Set(t??[]);return(i??[]).filter(n=>!e.has(n.id))}function Qy({foot:i,head:t,left:e,right:n}){if(![i,t,e,n].every(o=>o&&Number.isFinite(o.x)&&Number.isFinite(o.y)))return null;let s=i.y-t.y,r=Math.abs(n.x-e.x);return!(s>4)||!(r>2)?null:{x:Math.round(i.x-r/2),y:Math.round(t.y),w:Math.round(r),h:Math.round(s)}}var tv=(i,t,e=6)=>Math.hypot(t.x-i.x,t.y-i.y)>=e;function ev(i,t=84,e=8){let n=t;for(let s of i??[])Number.isFinite(s)&&(n=Math.max(n,s+e));return Math.round(n)}function nv({scene:i,id:t,way:e=null,at:n=null,found:s=!1}){return{scene:i,id:t,way:typeof e=="string"&&e?e:null,at:Yy(n),found:s===!0}}var Ap=new Set,Fu=new Set,iv=i=>globalThis.foundry?.utils?.getRoute?foundry.utils.getRoute(i):i,sv="stagecraft.ghosts",Rn=(i,t)=>t?game.i18n.format(`STAGECRAFT.Wings.${i}`,t):game.i18n.localize(`STAGECRAFT.Wings.${i}`);function rv(i){if(typeof i!="function")throw new TypeError("a wings provider must be a function of the scene");return Ap.add(i),qs?.refresh(),()=>{Ap.delete(i),qs?.refresh()}}function ov(i){if(typeof i!="function")throw new TypeError("a finder must be a function of the scene and what was typed");return Fu.add(i),qs?.refresh(),()=>{Fu.delete(i),qs?.refresh()}}async function hE(i){let t=await Promise.all([...Ap].map(e=>Promise.resolve().then(()=>e(i)).catch(n=>(console.warn(`${Z} | a wings provider failed`,n),null))));return jy(t)}async function uE(i,t){let e=await Promise.all([...Fu].map(n=>Promise.resolve().then(()=>n(i,t)).catch(s=>(console.warn(`${Z} | a finder failed`,s),[]))));return Ky(e.flat())}var qs=null,Uu=class{constructor(t){this.host=t,this.people=[],this.ways=[],this.found=[],this.coming=new Map,this.press=null,this.seq=0,this.findSeq=0,this.boxes=new Map,this.showGhosts=!0;try{this.showGhosts=globalThis.localStorage?.getItem(sv)!=="0"}catch{}this.#t(),qs=this,this.refresh()}dispose(){qs===this&&(qs=null),this.#a(),this.closeWays(),clearTimeout(this.findTimer),this.tray?.remove(),this.layer?.remove(),this.tray=this.layer=null}#t(){let t=document.createElement("div");t.className="stagecraft-wings",t.setAttribute("role","toolbar"),t.setAttribute("aria-label",Rn("Label")),t.innerHTML=`
      <span class="wings-label"></span>
      <div class="wings-people"></div>
      <span class="wings-none"></span>
      <button type="button" class="wings-eye"></button>
      <span class="wings-finder">
        <input type="search" class="wings-find" autocomplete="off" spellcheck="false">
        <div class="wings-found" popover="manual" hidden></div>
      </span>`,t.querySelector(".wings-label").textContent=Rn("Title"),t.querySelector(".wings-none").textContent=Rn("Nobody");let e=t.querySelector(".wings-eye");e.textContent=Rn("Ghosts"),e.title=Rn("GhostsTip"),e.addEventListener("click",()=>{this.showGhosts=!this.showGhosts;try{globalThis.localStorage?.setItem(sv,this.showGhosts?"1":"0")}catch{}this.#e(),this.frame(!0)});let n=t.querySelector(".wings-find");n.placeholder=Rn("Find"),n.setAttribute("aria-label",Rn("FindLabel")),n.addEventListener("input",()=>{clearTimeout(this.findTimer),this.findTimer=setTimeout(()=>this.#l(n.value),140)}),n.addEventListener("keydown",r=>{if(r.key==="Escape")r.preventDefault(),r.stopPropagation(),this.#f(),n.blur();else if(r.key==="Enter"){r.preventDefault();let o=this.found[0];o&&this.bring(o.id,{found:!0})}});for(let r of[t.querySelector(".wings-people"),t.querySelector(".wings-found")])r.addEventListener("pointerdown",o=>{let a=o.target.closest("[data-id]");a&&this.#o(o,a,a.dataset.found==="1")}),r.addEventListener("contextmenu",o=>{let a=o.target.closest("[data-id]");a&&(o.preventDefault(),this.openWays(a.dataset.id,o.clientX,o.clientY,a.dataset.found==="1"))}),r.addEventListener("keydown",o=>{let a=o.target.closest("[data-id]");!a||o.key!=="Enter"&&o.key!==" "||(o.preventDefault(),this.bring(a.dataset.id,{found:a.dataset.found==="1"}))});this.tray=t,this.host.root.append(t);let s=document.createElement("div");s.className="stagecraft-ghosts",s.addEventListener("pointerdown",r=>{let o=r.target.closest(".stagecraft-ghost");o&&this.#o(r,o,!1)}),s.addEventListener("contextmenu",r=>{let o=r.target.closest(".stagecraft-ghost");o&&(r.preventDefault(),this.openWays(o.dataset.id,r.clientX,r.clientY,!1))}),s.addEventListener("keydown",r=>{let o=r.target.closest(".stagecraft-ghost");!o||r.key!=="Enter"&&r.key!==" "||(r.preventDefault(),this.bring(o.dataset.id))}),s.addEventListener("wheel",r=>{let o=this.host.backend?.canvas;o&&(r.preventDefault(),o.dispatchEvent(new WheelEvent("wheel",{deltaX:r.deltaX,deltaY:r.deltaY,deltaMode:r.deltaMode,clientX:r.clientX,clientY:r.clientY,bubbles:!0,cancelable:!0})))},{passive:!1}),this.layer=s,this.host.root.append(s),this.#e()}#e(){let t=this.tray?.querySelector(".wings-eye");t&&(t.classList.toggle("on",this.showGhosts),t.setAttribute("aria-pressed",this.showGhosts?"true":"false"))}async refresh(){if(!this.tray)return;let t=++this.seq,{people:e,ways:n}=await hE(this.host.scene);if(t!==this.seq||!this.tray)return;this.people=e,this.ways=n;let s=new Set(e.map(r=>r.id));for(let r of[...this.coming.keys()])(!s.has(r)||Date.now()-this.coming.get(r)>6e3)&&this.coming.delete(r);this.#n(),this.place(),this.frame(!0)}waiting(){return Jy(this.people,this.host.stage?[...this.host.stage.cards.keys()]:[])}#n(){let t=this.tray.querySelector(".wings-people"),e=this.waiting(),n=JSON.stringify(e.map(s=>[s.id,s.name,s.portrait,this.coming.has(s.id)]));this.tray.querySelector(".wings-none").hidden=e.length>0,n!==this.trayKey&&(this.trayKey=n,t.replaceChildren(...e.map(s=>this.#i(s,"wings-person",!1))))}#i(t,e,n){let s=document.createElement("button");if(s.type="button",s.className=e,s.dataset.id=t.id,n&&(s.dataset.found="1"),this.coming.has(t.id)&&s.classList.add("coming"),s.title=[t.title||t.note,Rn("Hands")].filter(Boolean).join(`
`),t.portrait){let o=document.createElement("img");o.src=iv(t.portrait),o.alt="",o.draggable=!1,s.append(o)}else{let o=document.createElement("span");o.className="wings-initial",o.textContent=(t.name||"?").trim().charAt(0).toUpperCase(),s.append(o)}let r=document.createElement("span");if(r.className="wings-name",r.textContent=t.name,s.append(r),n&&t.note){let o=document.createElement("span");o.className="wings-note",o.textContent=t.note,s.append(o)}return s}place(){let t=this.host.root;if(!t||!this.tray)return;let e=t.getBoundingClientRect(),n=[];for(let o of t.querySelectorAll(".stagecraft-bar, .stagecraft-gm-toggle")){let a=o.getBoundingClientRect();a.width>0&&a.height>0&&n.push(a.bottom-e.top)}let s=Zs(),r=s.left+Math.max(0,e.width-s.left-s.right)/2;this.tray.style.top=`${ev(n)}px`,this.tray.style.left=`${Math.round(r)}px`,this.tray.style.maxWidth=`${Math.max(240,Math.round(e.width-s.left-s.right-40))}px`}frame(t=!1){let e=this.layer,n=this.host;if(!e||!n.stage||!n.backend?.project)return;let s=!this.showGhosts||!!n.chalk?.inHand||!!n.blocking?.armed||!!n.editor?.on;if(e.hidden!==s&&(e.hidden=s),s)return;let r=n.stage,o=n.backend.view??null,a=this.framed;if(!t&&a&&a.view===o&&a.people===this.people&&a.cast===r.cards.size)return;this.framed={view:o,people:this.people,cast:r.cards.size},this.ghostEls??=new Map;let l=new Set;for(let c of this.waiting()){if(!c.at)continue;let h=this.#r(r,c);if(!h)continue;l.add(c.id);let u=this.ghostEls.get(c.id);u||(u=this.#s(c),e.append(u),this.ghostEls.set(c.id,u)),u.classList.toggle("coming",this.coming.has(c.id));let d=`${h.x},${h.y},${h.w},${h.h}`;this.boxes.get(c.id)!==d&&(this.boxes.set(c.id,d),Object.assign(u.style,{left:`${h.x}px`,top:`${h.y}px`,width:`${h.w}px`,height:`${h.h}px`}))}for(let[c,h]of this.ghostEls)l.has(c)||(this.boxes.delete(c),this.ghostEls.delete(c),h.remove())}#r(t,e){let n=t.rig?.place?.(e.at);if(!n)return null;let s=(t.scene?.cardScale??1)*(e.size??1),r=(t.opts?.card?.w??280)*s,o=(t.opts?.card?.h??468)*s,a=t.grow?.(n.Z)??1,l=t.riserFor?.(n.X,n.Z,r*a,o*a)??0,c=(h,u)=>this.host.backend.project({X:h,Y:u,Z:n.Z});return Qy({foot:c(n.X,l),head:c(n.X,l+o*a),left:c(n.X-r*a/2,l),right:c(n.X+r*a/2,l)})}#s(t){let e=document.createElement("div");if(e.className="stagecraft-ghost",e.dataset.id=t.id,e.tabIndex=0,e.setAttribute("role","button"),e.setAttribute("aria-label",Rn("BringOn",{name:t.name})),e.title=`${t.name}${t.title?` \xB7 ${t.title}`:""}
${Rn("Hands")}`,t.portrait){let s=document.createElement("img");s.src=iv(t.portrait),s.alt="",s.draggable=!1,e.append(s)}let n=document.createElement("span");return n.className="ghost-name",n.textContent=t.name,e.append(n),e}#o(t,e,n){if(t.button!==0)return;t.preventDefault(),this.closeWays(),this.#a();let s={id:e.dataset.id,found:n,from:{x:t.clientX,y:t.clientY},pointerId:t.pointerId,el:e,carry:null};try{e.setPointerCapture(t.pointerId)}catch{}let r=l=>{l.pointerId===s.pointerId&&(!s.carry&&tv(s.from,{x:l.clientX,y:l.clientY})&&(s.carry=this.#c(e)),s.carry&&Object.assign(s.carry.style,{left:`${l.clientX}px`,top:`${l.clientY}px`}))},o=l=>{if(l.pointerId!==s.pointerId)return;let c=!!s.carry;if(this.#a(),l.type==="pointercancel")return;if(!c){this.bring(s.id,{found:s.found});return}let h=this.#h(l.clientX,l.clientY);h&&this.bring(s.id,{found:s.found,at:h})},a=l=>{l.key==="Escape"&&s.carry&&(l.preventDefault(),l.stopPropagation(),this.#a())};e.addEventListener("pointermove",r),e.addEventListener("pointerup",o),e.addEventListener("pointercancel",o),window.addEventListener("keydown",a,!0),s.off=()=>{e.removeEventListener("pointermove",r),e.removeEventListener("pointerup",o),e.removeEventListener("pointercancel",o),window.removeEventListener("keydown",a,!0)},this.press=s}#a(){let t=this.press;if(t){this.press=null,t.off?.();try{t.el.releasePointerCapture?.(t.pointerId)}catch{}t.carry?.remove(),t.el.classList.remove("carried")}}#c(t){t.classList.add("carried");let e=document.createElement("div");e.className="stagecraft-carry";let n=t.querySelector("img");if(n){let r=document.createElement("img");r.src=n.src,r.alt="",e.append(r)}let s=document.createElement("span");return s.textContent=t.querySelector(".wings-name, .ghost-name")?.textContent??"",e.append(s),document.body.append(e),e}#h(t,e){let n=document.elementFromPoint(t,e),s=this.host.backend?.canvas;return!n||!s||n!==s&&!this.layer?.contains(n)?null:this.host.paintingPointAt?.(t,e)??null}bring(t,{way:e=null,at:n=null,found:s=!1}={}){return!t||!game.user?.isGM?!1:(this.closeWays(),s?this.#f():this.coming.set(t,Date.now()),this.trayKey=null,this.#n(),this.frame(!0),Hooks.callAll("stagecraft.bring",nv({scene:this.host.scene,id:t,way:e,at:n,found:s}),this.host),setTimeout(()=>{this.coming.has(t)&&this.refresh()},6500),!0)}openWays(t,e,n,s=!1){this.closeWays();let r=s?this.found.find(d=>d.id===t):this.people.find(d=>d.id===t);if(!r)return!1;let o=document.createElement("div");o.id="stagecraft-ways-menu",o.className="stagecraft-ways",o.setAttribute("popover","manual"),o.setAttribute("role","menu"),o.tabIndex=-1,o.addEventListener("contextmenu",d=>d.preventDefault());let a=document.createElement("div");a.className="menu-name",a.textContent=r.name,o.append(a);let l=document.createElement("div");l.className="menu-actions";let c=(d,f)=>{let g=document.createElement("button");g.type="button",g.className="menu-action",g.setAttribute("role","menuitem"),g.dataset.way=f??"",g.textContent=d,g.addEventListener("click",x=>{x.preventDefault(),this.bring(t,{way:f,found:s})}),l.append(g)},h=this.ways.find(d=>d.id===r.way);c(h?Rn("TheirWay",{way:h.label}):Rn("BringOnPlain"),null);for(let d of this.ways)d.id!==r.way&&c(d.label,d.id);o.append(l),document.body.append(o);try{o.showPopover?.()}catch{}let u=bu(e,n,o.offsetWidth,o.offsetHeight,window.innerWidth,window.innerHeight);return o.style.left=`${u.left}px`,o.style.top=`${u.top}px`,this.waysEl=o,this.onWaysDown=d=>{this.waysEl&&!this.waysEl.contains(d.target)&&this.closeWays()},this.onWaysKey=d=>{this.waysEl&&d.key==="Escape"&&(d.preventDefault(),d.stopPropagation(),this.closeWays())},document.addEventListener("pointerdown",this.onWaysDown,!0),window.addEventListener("keydown",this.onWaysKey,!0),o.focus({preventScroll:!0}),!0}closeWays(){this.onWaysDown&&document.removeEventListener("pointerdown",this.onWaysDown,!0),this.onWaysKey&&window.removeEventListener("keydown",this.onWaysKey,!0),this.onWaysDown=this.onWaysKey=null,this.waysEl?.remove(),this.waysEl=null}async#l(t){let e=this.tray?.querySelector(".wings-found");if(!e)return;let n=String(t??"").trim(),s=++this.findSeq;if(!n||!Fu.size){this.found=[],this.#u(e),e.replaceChildren();return}let r=await uE(this.host.scene,n);s!==this.findSeq||!this.tray||(this.found=r,e.replaceChildren(...r.length?r.map(o=>this.#i(o,"wings-hit",!0)):[Object.assign(document.createElement("span"),{className:"wings-nohit",textContent:Rn("NoneFound")})]),this.#d(e))}#d(t){let e=this.tray?.querySelector(".wings-find");t.hidden=!1;try{t.matches(":popover-open")||t.showPopover?.()}catch{}let n=e?.getBoundingClientRect();n&&(t.style.top=`${Math.round(n.bottom+6)}px`,t.style.left=`${Math.round(Math.max(8,Math.min(window.innerWidth-t.offsetWidth-8,n.right-t.offsetWidth)))}px`)}#u(t){try{t.matches(":popover-open")&&t.hidePopover?.()}catch{}t.hidden=!0}#f(){let t=this.tray?.querySelector(".wings-find");t&&(t.value=""),this.findSeq++,this.found=[];let e=this.tray?.querySelector(".wings-found");e&&(this.#u(e),e.replaceChildren())}};var wo=(i,t,e)=>Math.max(t,Math.min(e,i)),dE=.5,fE=4,av=.2;function pE(i,t,e){let n=l=>Number.isFinite(l)&&l>0?l:0,s=Math.min(n(i?.left),t*.9),r=Math.min(n(i?.right),t*.9-s),o=Math.min(n(i?.top),e*.9),a=Math.min(n(i?.bottom),e*.9-o);return{left:s,right:r,top:o,bottom:a}}function Bu(i,t,e=null,n=Hn){let s=pE(e,i,t),r=i-s.left-s.right,o=t-s.top-s.bottom,l=s.left+s.right+s.top+s.bottom>0?r/n.W:Math.max(i/n.W,t/n.H),c=s.left+r/2,h=s.top+o/2;return{s:l,cx:n.W/2+(i/2-c)/l,cy:n.H/2+(t/2-h)/l}}function Cp(i,t,e,n=Hn){let s=e??Bu(i,t,null,n),r=i/s.s,o=t/s.s;return{vw:i,vh:t,s:s.s,ox:s.cx-r/2,oy:s.cy-o/2,visW:r,visH:o}}function lv(i,t,e=null,n=Hn){let s=Math.min(i/n.W,t/n.H),r=Math.max(i/n.W,t/n.H),o=Bu(i,t,e,n).s;return{min:Math.min(s*dE,o),max:Math.max(r*fE,o)}}function zu(i,t,e,n=null,s=Hn){let{min:r,max:o}=lv(t,e,n,s),a=wo(i.s,r,o),l=t/a,c=e/a,h=av*Math.min(l,s.W),u=av*Math.min(c,s.H);return{s:a,cx:wo(i.cx,h-l/2,s.W-h+l/2),cy:wo(i.cy,u-c/2,s.H-u+c/2)}}function cv(i,t,e,n,s,r,o=null,a=Hn){let{min:l,max:c}=lv(t,e,o,a),h=wo(i.s*r,l,c),u=i.cx+(n-t/2)/i.s,d=i.cy+(s-e/2)/i.s;return zu({s:h,cx:u-(n-t/2)/h,cy:d-(s-e/2)/h},t,e,o,a)}function hv(i,t,e,n,s,r=null,o=Hn){return zu({s:i.s,cx:i.cx-t/i.s,cy:i.cy-e/i.s},n,s,r,o)}function uv(i,t=0){let e=t===1?i*16:t===2?i*400:i;return Math.exp(-wo(e,-300,300)*.0012)}function dv(i,t,e){let n=wo(e,0,1),s=n*n*(3-2*n);return{s:i.s*Math.pow(t.s/i.s,s),cx:i.cx+(t.cx-i.cx)*s,cy:i.cy+(t.cy-i.cy)*s}}function fv(i,t){return!i||!t?i===t:Math.abs(i.s-t.s)<1e-4*Math.max(i.s,t.s)&&Math.abs(i.cx-t.cx)<.01&&Math.abs(i.cy-t.cy)<.01}var Hu=class{constructor({scene:t,skins:e,anchor:n,services:s={},onFatal:r=null}){this.scene=t,this.onFatal=r,this.guard=new wl({limit:600,report:(o,a)=>console.error(`${Z} | a frame failed (${a} in a row)`,o),onFatal:o=>this.#e(o)}),this.threeFailed=!1,this.losses=0,this.rebuilding=!1,this.saving=Promise.resolve(),this.skins=e,this.anchor=n,this.services=s,this.userId=game.user.id,this.dragging=null,this.look=null,this.tween=null,this.panning=null,this.selected=new Set,this.tokens=null,this.targeting=!1,this.hoverCard=null,this.running=!1,this.frames=0,this.speed=null,this.health=null,this.healthBoard=null,this.tip=null,this.pace=new il({cap:cm(),easing:Yu()}),this.pose=null,this.listeners=[],this.hooks=[]}async start(){let{usable:t,scene:e,problems:n}=nr(this.scene);if(!t)return console.warn(`${Z} | "${this.scene.name}" has a stage description that cannot be drawn:`,n),ui.notifications?.warn(game.i18n.format("STAGECRAFT.Notify.Unusable",{scene:this.scene.name})),!1;n.length&&console.warn(`${Z} | "${this.scene.name}" has notes:`,n),this.description=e,this.described=JSON.stringify(this.scene.flags?.[Z]?.stage??null),this.people=Ro(this.scene);let s=()=>this.root&&this.backend?.view?vp(yp(),this.root.getBoundingClientRect(),this.homeView()):[];this.stage=new fr(e,this.people,{card:this.skins.get(e.skin).size,clock:$a,cover:s}),this.stage.setLife(mo(this.scene)),this.stage.setBoard(go(this.scene)),this.stage.setSpeaker(xp(this.scene)),this.stage.setTurn(ku(this.scene)),this.stage.setCalm(or());for(let r of this.people){let o=this.stage.cards.get(r.id);o&&(o.appliedMove=r.move?.t0??null)}for(let r of this.stage.problems)console.warn(`${Z} | ${r}`);return this.sync=new Sl({stage:this.stage,scene:this.scene.id,me:this.userId,now:()=>game.time.serverTime,clock:()=>performance.now(),send:r=>this.channel?.send(r),mayHold:(r,o)=>this.#b(r,o),onLost:r=>this.#v(r),onDrop:r=>this.#M(r)}),this.channel=fy((r,o)=>{r?.type==="chalk"?this.chalk?.receive(r,o):r?.type==="health"?(this.health?.receive(r),this.healthBoard?.receive(r,o)):r?.type==="emote"?this.menu?.receive(r,o):this.sync.receive(r,o)}),this.root=document.createElement("div"),this.root.id="stagecraft-stage",this.root.dataset.scene=this.scene.id,this.anchor.after(this.root),this.speed=new yu(this),await this.#t(),this.services.chalkStore&&(this.chalk=new fu({host:this,store:this.services.chalkStore,send:r=>this.channel?.send(r)}),this.kit=new pu(this,this.chalk),this.chalk.sync(),this.chalk.refresh(),this.#_()),game.user.isGM&&(this.bar=new Nu(this),this.blocking=new Ou(this),this.healthBoard=new gu(this),this.editor=new Du(this),Sp.on&&this.editor.toggle(!0),this.#A()),game.user.isGM&&(this.wings=new Uu(this)),this.#w(),this.health=new mu(this),this.tip=new _u(this),this.menu=new Iu(this),this.tokens=new Lu(this),this.tokens.ensure(),this.#P(),this.#h(),this.#k(),this.#I(),this.running=!0,this.last=performance.now(),this.pace.poke(this.last),this.raf=requestAnimationFrame(this.#n),this.speed.start(),setTimeout(()=>{this.running&&this.#S()},0),Hooks.callAll("stagecraft.stageReady",this),!0}async#t(){let t=new Hs,e=this.root.clientWidth||window.innerWidth,n=this.root.clientHeight||window.innerHeight,s=this.skins.get(this.description.skin),r=sl()==="auto"&&sm(),o=nm({tier:bs(),webgl:im(),failed:this.threeFailed,software:r});if(o==="flat"&&r&&!this.toldFlat&&(this.toldFlat=!0,ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.FlatSoftware"))),o==="three"){let l=new au({images:t,onContextLost:()=>this.#L()});try{l.mount(this.root,{quality:bs(),pixelRatio:window.devicePixelRatio,width:e,height:n}),l.setCalm(or()),l.setZoneSetting(rl()),await l.load(this.description,s,this.people),this.backend=l;return}catch(c){console.warn(`${Z} | the 3D picture could not start here; drawing the plain one`,c),l.dispose(),this.threeFailed=!0}this.toldFlat||(this.toldFlat=!0,ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.Flat")))}let a=new cu({images:t});a.mount(this.root,{pixelRatio:window.devicePixelRatio,width:e,height:n}),a.setCalm(or()),a.setZoneSetting(rl()),await a.load(this.description,s,this.people),this.backend=a}#e(t){if(this.backend?.name!=="flat"&&!this.threeFailed&&this.running){console.warn(`${Z} | the 3D picture keeps failing; trying the plain one`,t),this.threeFailed=!0,this.guard.failures=0,this.rebuild().then(()=>{this.running&&(this.last=performance.now(),this.raf=requestAnimationFrame(this.#n))}).catch(e=>{this.running=!1,this.onFatal?.(e)});return}this.running=!1,this.onFatal?.(t)}async stop(){this.running=!1,cancelAnimationFrame(this.raf);for(let[t,e,n,s]of this.listeners)t.removeEventListener(e,n,s);this.listeners=[];for(let[t,e]of this.hooks)Hooks.off(t,e);this.hooks=[],this.resizeObserver?.disconnect(),this.sync?.close(),this.channel?.close(),this.channel=null,this.chalk?.stop(),this.kit?.dispose(),this.chalk?.wall?.clear(),this.speed?.stop(),this.health?.stop(),this.healthBoard?.dispose(),this.editor?.dispose(),this.wings?.dispose(),this.tip?.dispose(),this.menu?.dispose(),this.tokens?.dispose(),this.targetPill?.remove(),this.bar?.dispose(),this.blocking?.dispose(),this.backend?.dispose(),this.root?.remove(),this.chalk=this.kit=this.speed=this.health=this.healthBoard=this.tip=this.tokens=this.targetPill=this.bar=this.blocking=this.editor=this.wings=this.backend=this.root=null,this.targeting=!1,this.hoverCard=null}#n=t=>{if(!this.running)return;if(!this.pace.due(t)){this.raf=requestAnimationFrame(this.#n);return}let e=this.guard.run(()=>{this.tween&&this.#x(t);let n=(t-this.last)/1e3;this.last=t,this.sync.tick(),this.stage.advance(n);let s=this.tokens?.state(),r=this.stage.snapshot({viewer:this.userId,selected:this.selected,controlled:s?.controlled,targets:s?.targets});if(this.#i(r,t),this.chalk?.inHand)for(let o of this.chalk.chalkZones())r.zones[o.id]=this.chalk.cursorZone===o.id?"target":"near";this.chalk?.wall?.flush?.(),this.health?.frame(t,this.pace.scale(t)),this.backend.draw(r),this.wings?.frame(),this.chalk?.afterDraw?.(),this.speed?.feed(t),this.frames++,this.frames%60===0&&(this.#_(),this.wings?.place());for(let o of this.stage.drain())o.type==="visit"&&this.#r(o),Hooks.callAll(`stagecraft.${o.type}`,o,this)});this.pace.drew(t),e&&(this.raf=requestAnimationFrame(this.#n))};#i(t,e){let n=tm(t.cards);em(this.pose,n)&&this.pace.poke(e),this.pose=n,(t.bonks?.length||this.dragging||this.targeting||this.chalk?.drawing||this.chalk?.wall?.strokes?.size||this.speed?.probe||this.blocking?.armed)&&this.pace.poke(e)}#r(t){let e=this.description.zones.find(u=>u.id===t.zone),n=this.stage.cards.get(t.card);if(!e||!n||!this.root||!this.backend?.project)return;let s=e.floor??e.shape,r=s.reduce((u,d)=>u+d[0],0)/s.length,o=Math.max(...s.map(u=>u[1])),a=this.stage.rig.standing([r,o])??{X:n.puppet.restX,Z:n.restZ},l=this.backend.project({X:a.X,Y:n.h*n.grow*1.12,Z:a.Z});if(!l||!Number.isFinite(l.x))return;let c=document.createElement("div");c.className="stagecraft-visit";let h=document.createElement("b");if(h.textContent=game.i18n.format("STAGECRAFT.Visit.At",{name:n.person.name??n.id,zone:e.name||e.id}),c.append(h),e.hint){let u=document.createElement("span");u.textContent=e.hint,c.append(u)}c.style.left=`${Math.round(l.x)}px`,c.style.top=`${Math.round(l.y)}px`,this.root.append(c),setTimeout(()=>c.remove(),4200)}#s(t,e,n,s){t.addEventListener(e,n,s),this.listeners.push([t,e,n,s])}#o(){return this.rect??=this.root.getBoundingClientRect()}#a(t){let e=this.#o();return{x:t.clientX-e.left,y:t.clientY-e.top}}#c(t,e=this.#o()){let n=t.pointerType==="pen"&&(t.button===5||(t.buttons&32)!==0);return{x:t.clientX-e.left,y:t.clientY-e.top,pressure:t.pressure,pointerType:t.pointerType,t:t.timeStamp,shift:t.shiftKey,alt:t.altKey,flip:n}}#h(){let t=this.backend.canvas;this.#s(t,"contextmenu",n=>n.preventDefault()),this.#s(t,"pointerdown",n=>{if(this.rect=null,this.pace.poke(performance.now()),this.tip?.hide(),n.button===2&&this.chalk?.inHand){this.chalk.putAway();return}if(n.button===2&&this.blocking?.disarm())return;if(n.button===2){let l=this.#a(n),c=this.backend.pick(l.x,l.y);if(c?.kind==="card"){this.menu?.open(c.id,n.clientX,n.clientY)&&n.preventDefault();return}this.#m(n);return}if(n.button===1){this.#m(n);return}if(n.button!==0&&!(n.button===5&&n.pointerType==="pen"&&this.chalk?.inHand))return;let s=this.#a(n),r=this.backend.pick(s.x,s.y);if(this.targeting&&!this.chalk?.inHand&&!this.blocking?.armed&&r?.kind==="card"){this.tokens?.target(r.id,{add:n.shiftKey}),n.preventDefault();return}if(this.blocking&&!this.chalk?.inHand){if(this.blocking.armed){let l=r?.kind==="card"?null:this.#l(s);if(r?.kind==="card"||l){this.blocking.placeArmed({card:r?.kind==="card"?r.id:null,at:l}).catch(c=>console.warn(`${Z} | the formation could not be made`,c)),n.preventDefault();return}}if(n.shiftKey&&r?.kind==="card"){this.selected.has(r.id)?this.selected.delete(r.id):this.selected.add(r.id),this.blocking.selectionChanged(),n.preventDefault();return}if((n.ctrlKey||n.metaKey)&&r?.kind==="card"){let l=this.stage.cards.get(r.id);xo(this.scene,r.id,!l?.downTo).catch(c=>console.warn(`${Z} | could not knock down ${r.id}`,c)),n.preventDefault();return}if(n.altKey&&r?.kind==="card"){yo(this.scene,this.stage.speaker===r.id?null:r.id).catch(l=>console.warn(`${Z} | could not give the floor`,l)),n.preventDefault();return}}if(r?.kind==="chalk"||r?.kind==="magic"||r?.kind==="eraser"){this.chalk?.take(r.kind==="eraser"?"rub":r.kind==="magic"?"magic":r.colour),this.chalk?.hover(s),n.preventDefault();return}if(this.chalk?.inHand){n.preventDefault();let l=this.#c(n);if(this.kit?.takesPick()){this.chalk.pickColour(l);return}this.chalk.begin(l)&&(t.setPointerCapture(n.pointerId),this.chalk.hover(s));return}if(!r){this.#m(n,{bare:n.button===0});return}if(r?.kind!=="card"||(this.tokens?.select(r.id,{add:n.shiftKey}),!this.sync.grab(r.id)))return;let o=this.backend.floorAt(s.x,s.y,r.point.y),a=this.stage.cards.get(r.id);this.dragging={id:r.id,height:r.point.y,offX:(o?.x??a.puppet.x)-a.puppet.x,offZ:(o?.z??a.Z)-a.Z},t.setPointerCapture(n.pointerId),t.style.cursor="grabbing",n.preventDefault()}),this.#s(t,"pointermove",n=>{if(this.panning?.id===n.pointerId){this.#y(n);return}let s=this.#a(n);if((this.dragging||this.chalk?.inHand||n.buttons)&&this.pace.poke(performance.now()),this.chalk?.drawing){let o=this.#o(),a=n.getCoalescedEvents?.()??[];for(let l of a.length?a:[n])this.chalk.extend(this.#c(l,o));this.chalk.finishMove()}if(this.chalk?.inHand){this.tip?.hide(),this.chalk.hover(s),t.style.cursor="none";return}if(!this.dragging){let o=this.backend.pick(s.x,s.y);this.hoverCard=o?.kind==="card"?o.id:null,t.style.cursor=this.targeting&&this.hoverCard?"crosshair":o?"grab":"default",o?.kind==="card"||!this.chalk?this.tip?.hover(o?.kind==="card"?o.id:null,n.clientX,n.clientY):this.tip?.hoverWall(s,n.clientX,n.clientY);return}this.tip?.hide();let r=this.backend.floorAt(s.x,s.y,this.dragging.height);r&&this.sync.move(this.dragging.id,r.x-this.dragging.offX,r.z-this.dragging.offZ)});let e=n=>{if(this.pace.poke(performance.now()),this.panning?.id===n.pointerId){let s=this.panning.bare===!0&&!this.panning.moved&&n.type==="pointerup";this.panning=null,t.style.cursor="default",s&&(this.targeting?this.tokens?.clearTargets():this.tokens?.release());return}if(this.chalk?.drawing){n.type==="pointercancel"?this.chalk.cancel():this.chalk.end().catch(s=>console.warn(`${Z} | chalk stroke failed`,s)),this.chalk.hover(this.#a(n));return}this.dragging&&(this.sync.release(this.dragging.id),this.dragging=null,t.style.cursor="default")};this.#s(t,"pointerup",e),this.#s(t,"pointercancel",e),this.#s(t,"wheel",n=>{n.preventDefault(),this.tip?.hide();let s=this.#a(n),{w:r,h:o}=this.#u();this.#g(cv(this.lookNow(),r,o,s.x,s.y,uv(n.deltaY,n.deltaMode),Zs()))},{passive:!1}),this.#s(t,"dblclick",n=>{if(this.chalk?.inHand||this.blocking?.armed)return;let s=this.#a(n);this.backend.pick(s.x,s.y)||(n.preventDefault(),this.home())}),this.#s(t,"pointerleave",()=>{this.hoverCard=null,this.tip?.hide(),this.chalk?.inHand&&!this.chalk.drawing&&this.chalk.hover(null)}),this.#s(window,"keydown",n=>{if(n.code==="Escape"){if(this.chalk?.drawing)this.chalk.cancel();else if(this.chalk?.inHand)this.chalk.putAway();else if(!this.healthBoard?.close()){if(!this.blocking?.disarm())if(this.targeting)this.#d(!1);else if(this.tokens?.hasTargets())this.tokens.clearTargets();else if(this.selected.size)this.selected.clear(),this.blocking?.selectionChanged();else return}n.preventDefault(),n.stopPropagation()}},!0)}paintingPointAt(t,e){if(!this.root||!this.backend)return null;let n=this.root.getBoundingClientRect();return this.#l({x:t-n.left,y:e-n.top})}#l(t){let e=this.backend.floorAt(t.x,t.y,0);if(!e)return null;let n=this.stage.rig.fractionOf(e.x,e.z);return Number.isFinite(n[0])&&Number.isFinite(n[1])?[Math.round(n[0]*1e4)/1e4,Math.round(n[1]*1e4)/1e4]:null}targetKey({shift:t=!1}={}){if(!this.running||!this.tokens||this.dragging||this.chalk?.inHand)return!1;this.pace.poke(performance.now());let e=Wy({hover:this.hoverCard,controlled:this.tokens.state().controlled,targeting:this.targeting});return e.do==="target"?this.tokens.target(e.id,{add:t}):this.#d(e.on),!0}#d(t){if(this.targeting===t||!this.root)return;if(this.targeting=t,this.pace.poke(performance.now()),this.backend?.canvas&&(this.backend.canvas.style.cursor=t&&this.hoverCard?"crosshair":"default"),!t){this.targetPill?.remove(),this.targetPill=null;return}let e=document.createElement("div");e.className="stagecraft-targeting",e.setAttribute("role","status"),e.textContent=game.i18n.localize("STAGECRAFT.Target.Mode"),this.root.append(e),this.targetPill=e}perform(t){this.pace.poke(performance.now()),this.dragging&&this.sync.verb(this.dragging.id,t)}#u(){return{w:this.root?.clientWidth||window.innerWidth,h:this.root?.clientHeight||window.innerHeight}}#f(){let{w:t,h:e}=this.#u();return Bu(t,e,Zs())}lookNow(){return this.look??this.#f()}homeView(){let{w:t,h:e}=this.#u();return Cp(t,e,this.#f())}#p(){if(!this.backend)return;let{w:t,h:e}=this.#u();this.backend.setView(Cp(t,e,this.lookNow())),this.pace.poke(performance.now())}#g(t){this.tween=null,this.look=t,this.#p()}#m(t,{bare:e=!1}={}){this.tween=null,this.panning={id:t.pointerId,x:t.clientX,y:t.clientY,look:this.lookNow(),moved:!1,bare:e},this.backend.canvas.setPointerCapture?.(t.pointerId),t.preventDefault()}#y(t){let e=this.panning,n=t.clientX-e.x,s=t.clientY-e.y;if(!e.moved&&Math.hypot(n,s)<4)return;e.moved||(e.moved=!0,this.tip?.hide(),this.backend.canvas.style.cursor="grabbing");let{w:r,h:o}=this.#u();this.#g(hv(e.look,n,s,r,o,Zs()))}home({animate:t=!0}={}){if(!this.backend||!this.root)return!1;let e=this.lookNow(),n=this.#f();return this.panning=null,!t||fv(e,n)?(this.tween=null,this.look=null,this.#p(),!0):(this.tween={from:e,to:n,t0:performance.now(),ms:420},this.look=e,this.pace.poke(performance.now()),!0)}#x(t){let{from:e,to:n,t0:s,ms:r}=this.tween,o=(t-s)/r;o>=1?(this.tween=null,this.look=null):this.look=dv(e,n,Math.max(0,o)),this.#p()}#b(t,e){let n=this.stage.cards.get(t)?.person,s=game.users.get(e);return!!n&&!!s&&sr(n,s,{handsOff:ir(this.scene)})}#v(t){this.dragging?.id===t&&(this.dragging=null,this.backend?.canvas&&(this.backend.canvas.style.cursor="default"))}#M(t){if(!kn())return;let e=this.stage.placeOf(t.card);e&&(this.saving=xs(()=>this.#T(e)).catch(n=>console.warn(`${Z} | could not save where a card was put down`,n)))}async#T(t){let e=this.scene.flags?.[Z]?.published?.cards;!Array.isArray(e)||!e.some(n=>n.id===t.id)||await this.scene.update({[`flags.${Z}.published.cards`]:og(e,t)})}#E(){let t=Ro(this.scene),e=new Set(t.map(n=>n.id));this.stage.setLife(mo(this.scene)),this.stage.setBoard(go(this.scene)),this.#w();for(let n of t){let s=this.stage.cards.get(n.id);if(s){this.#C(s,n);continue}let r=this.stage.addCard(n);r&&(r.appliedMove=n.move?.t0??null),this.people.push(n),this.backend.addCard(n).catch(o=>console.warn(`${Z} | could not draw ${n.id}`,o))}for(let n of[...this.stage.cards.keys()])e.has(n)||(this.sync.forget(n),this.dragging?.id===n&&this.#v(n),this.stage.removeCard(n),this.backend.removeCard(n),this.people=this.people.filter(s=>s.id!==n));this.stage.setSpeaker(xp(this.scene)),this.stage.setTurn(ku(this.scene)),this.tokens?.ensure()}#A(){let t="stagecraft.gmOpen",e=!1;try{e=globalThis.localStorage?.getItem(t)==="1"}catch{}let n=document.createElement("button");n.type="button",n.className="stagecraft-gm-toggle";let s=()=>{this.root?.classList.toggle("stagecraft-gm-open",e),n.textContent=game.i18n.localize(e?"STAGECRAFT.Gm.Hide":"STAGECRAFT.Gm.Show"),n.setAttribute("aria-expanded",e?"true":"false")};n.addEventListener("click",()=>{e=!e;try{globalThis.localStorage?.setItem(t,e?"1":"0")}catch{}s(),this.wings?.place()}),this.root.append(n),s()}#w(){if(!this.root)return;if(!(this.stage.board&&this.stage.zones.some(n=>n.kind==="area"))){this.keyEl?.remove(),this.keyEl=null;return}if(this.keyEl)return;let e=n=>game.i18n.localize(`STAGECRAFT.Board.${n}`);this.keyEl=document.createElement("div"),this.keyEl.className="stagecraft-board-key",this.keyEl.innerHTML=`<b>${e("Title")}</b><span><i class="engaged"></i>${e("Engaged")}</span><span><i class="near"></i>${e("Near")}</span><span><i class="far"></i>${e("Far")}</span>`,this.root.append(this.keyEl)}#C(t,e){let n=JSON.stringify(e.home??null)!==JSON.stringify(t.person.home??null);(n||JSON.stringify(e.life??null)!==JSON.stringify(t.person.life??null))&&this.stage.setRoutine(e.id,e.life,n&&Array.isArray(e.home)?e.home:null),this.stage.setDown(e.id,e.down===!0);let s=sp(e)!==sp(t.person);t.person={...t.person,...e,portrait:t.person.portrait},s&&this.backend?.refreshCard?.({...t.person})?.catch(o=>console.warn(`${Z} | could not redraw ${e.id}`,o));let r=e.move;if(r&&Number.isFinite(r.t0)&&r.t0!==t.appliedMove){t.appliedMove=r.t0,this.stage.walkTo(e.id,e.mark?{mark:e.mark}:{at:e.at},{t0:r.t0,gait:r.gait??"walk",yaw:Number.isFinite(e.yaw)?e.yaw:null,lean:e.lean??0,pitch:e.pitch??0,still:e.still===!0,packed:e.packed===!0});return}t.holder===null&&(t.still=e.still===!0,t.packed=e.packed===!0)}#_(){let t=this.backend;if(!this.chalk||!this.root||!t?.setChalkBoxAt||!t.view||!this.stage?.rig)return;let e=this.stage.rig,n=this.root.getBoundingClientRect(),s=this.homeView(),r=vp([...yp(),...this.#R()],n,s),o={x0:s.ox,y0:s.oy,x1:s.ox+s.visW,y1:s.oy+s.visH},a=this.description.chalk?.box??lo,l;Ba(e,a,r,o)?l=[a[0],a[1]]:this.boxAt&&Ba(e,this.boxAt,r,o)?l=this.boxAt:l=vx(e,a,r,o,this.stage.cardShapes()),!(this.boxAt&&l[0]===this.boxAt[0]&&l[1]===this.boxAt[1])&&(this.boxAt=l,t.setChalkBoxAt(l))}#R(){let t=[];for(let e of["hotbar"]){let s=document.getElementById(e)?.getBoundingClientRect?.();s&&s.width>0&&s.height>0&&t.push({rect:[s.left,s.top,s.right,s.bottom]})}return t}#P(){let t=()=>{if(!(!this.backend||!this.root)){if(this.rect=null,this.backend.resize(this.root.clientWidth,this.root.clientHeight,window.devicePixelRatio),this.look&&!this.tween){let{w:e,h:n}=this.#u();this.look=zu(this.look,e,n,Zs())}this.#p(),this.#_(),this.wings?.place()}};this.resizeObserver=new ResizeObserver(t),this.resizeObserver.observe(this.root),t()}#k(){this.hooks.push(["stagecraft.settingsChanged",Hooks.on("stagecraft.settingsChanged",t=>{t==="calm"&&(this.backend?.setCalm(or()),this.stage?.setCalm(or())),t==="power"&&(this.pace.easing=Yu()),t==="zones"&&this.backend?.setZoneSetting(rl()),t==="tier"&&ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.TierNextScene"))})])}#I(){this.hooks.push(["userConnected",Hooks.on("userConnected",(t,e)=>{e||this.sync?.userGone(t.id)})]),this.hooks.push(["updateScene",Hooks.on("updateScene",t=>{t.id===this.scene.id&&this.#S()})])}#S(){if(!this.running&&!this.root)return;this.pace.poke(performance.now());let t=JSON.stringify(this.scene.flags?.[Z]?.stage??null);if(t!==this.described){this.described=t,globalThis.canvas?.scene?.id===this.scene.id&&globalThis.canvas.draw();return}this.chalk?.refresh(),this.bar?.refresh(),this.blocking?.refresh(),this.editor?.refresh(),this.#E(),this.wings?.refresh(),ir(this.scene)&&!game.user.isGM&&this.dragging&&(this.sync.release(this.dragging.id),this.dragging=null)}#L(){console.warn(`${Z} | the graphics context was lost; the stage will be rebuilt`),++this.losses>=2&&(this.threeFailed=!0),this.rebuild().catch(t=>{console.error(`${Z} | the stage could not be rebuilt`,t),this.onFatal?.(t)})}async rebuild(){if(!(!this.running||this.rebuilding)){this.rebuilding=!0;try{await this.#D()}finally{this.rebuilding=!1}}}async#D(){for(let[t,e,n,s]of this.listeners)t.removeEventListener(e,n,s);this.listeners=[],this.backend.dispose(),await this.#t(),!(!this.running||!this.backend)&&(this.#p(),this.chalk?.reset(),this.chalk?.sync(),this.chalk?.refresh(),this.boxAt=null,this.#_(),this.#h(),this.pace.poke(performance.now()),this.health?.changed(),this.speed?.start())}};var ys={host:null};function pv(i,{makeHost:t=n=>new Hu(n),services:e={}}={}){let n=foundry.canvas.SceneManager;class s extends n{#t=null;#e=null;async _onDraw(){let a=canvas.app.view;this.#t=t({scene:this.scene,skins:i,anchor:a,services:e,onFatal:()=>this.#n()});let l=!1;try{this.#e={display:a.style.display},a.style.display="none",canvas.app.stop(),l=await this.#t.start()}catch(c){console.error(`${Z} | could not take over "${this.scene.name}"`,c),ui.notifications?.error(game.i18n.format("STAGECRAFT.Notify.Failed",{scene:this.scene.name}))}if(l){ys.host=this.#t;return}try{await this.#t?.stop()}catch(c){console.error(`${Z} | the stage did not stop cleanly`,c)}this.#t=null,this.#i()}async _onTearDown(){ys.host===this.#t&&(ys.host=null),await this.#t?.stop(),this.#t=null,this.#i()}async#n(){if(!this.#t)return;let a=this.#t;this.#t=null,ys.host===a&&(ys.host=null),ui.notifications?.error(game.i18n.format("STAGECRAFT.Notify.Failed",{scene:this.scene.name}));try{await a.stop()}catch(l){console.error(`${Z} | the stage did not stop cleanly`,l)}this.#i()}#i(){this.#e&&(canvas.app.view.style.display=this.#e.display||"block",canvas.app.start(),this.#e=null)}}let r=CONFIG.Canvas.managedScenes;return CONFIG.Canvas.managedScenes=new Proxy(r,{get(o,a,l){if(typeof a!="string")return Reflect.get(o,a,l);if(Object.hasOwn(o,a))return o[a];let c=game.scenes?.get(a);return c&&er(c)?s:void 0}}),s}var mE="0.15.0";function mv({skins:i,current:t}){return{version:mE,skins:{register:e=>i.register(e),use:e=>i.use(e),list:()=>i.list()},scenes:{isStage:e=>er(e),describe:e=>nr(e),validate:e=>tr(e)},blocking:{formations:[...ul],gaits:[...Dm],routines:[...od],move:(e,n)=>Za(e,n),arrange:(e,n,s={})=>qa(e,n,s,t.host),backToPlaces:e=>Tu(e),keepPlaces:(e,n=null)=>Eu(e,t.host,n),setChalkBox:(e,n)=>Au(e,n),editStage:(e,n)=>Ya(e,n),tidy:e=>Cu(e,t.host),setLife:(e,n)=>Ru(e,n),setBoard:(e,n)=>Pu(e,n),setSpeaker:(e,n)=>yo(e,n),setTurn:(e,n)=>Ly(e,n),setBadges:(e,n,s)=>Dy(e,n,s),setDown:(e,n,s)=>xo(e,n,s),setEmote:(e,n,s,r={})=>ja(e,n,s,r),registerMoments:e=>Ny(e),setCover:e=>Oy(e),setCardActions:e=>Hy(e)},wings:{setProvider:e=>rv(e),setFinder:e=>ov(e),refresh:()=>t.host?.wings?.refresh()??Promise.resolve()},tokens:{setActorProvider:e=>Xy(e),refresh:()=>t.host?.tokens?.ensure({force:!0})??Promise.resolve()},view:{setMargins:e=>Zy(e),home:(e={})=>t.host?.home(e)===!0},stage:()=>t.host?{stage:t.host.stage,backend:t.host.backend}:null,zoneKinds:[...Zp],chalkModes:[...Ao],emotes:[..._l],chalkTools:[...Kh]}}var gE=[{action:"hop",verb:"hop",key:"Space"},{action:"nod",verb:"nod",key:"KeyN"},{action:"bow",verb:"bow",key:"KeyB"},{action:"shake",verb:"shake",key:"KeyX"},{action:"turn",verb:"turn",key:"KeyT"}];function gv(i){for(let{action:t,verb:e,key:n}of gE)game.keybindings.register(Z,t,{name:`STAGECRAFT.Keys.${t}`,editable:[{key:n}],onDown:()=>{let s=i();return s?.dragging?(s.perform(e),!0):!1},restricted:!1,precedence:CONST.KEYBINDING_PRECEDENCE.PRIORITY});game.keybindings.register(Z,"target",{name:"STAGECRAFT.Keys.target",editable:[{key:"KeyT"}],onDown:t=>i()?.targetKey({shift:t?.isShift===!0})===!0,restricted:!1,reservedModifiers:[CONST.KEYBOARD_MODIFIER_KEYS?.SHIFT??"Shift"],precedence:CONST.KEYBINDING_PRECEDENCE.PRIORITY}),game.keybindings.register(Z,"home",{name:"STAGECRAFT.Keys.home",editable:[{key:"Home"}],onDown:()=>i()?.home()===!0,restricted:!1})}var xE="Stagecraft chalk",Ja=2,So=()=>({render:!1});function Ys(i,t,e){globalThis._del!==void 0?i[`${t}.${e}`]=globalThis._del:i[`${t}.-=${e}`]=null}var To=class i{#t=Promise.resolve();constructor(){this.listeners=new Set,this.hooks=[];for(let t of["createJournalEntryPage","updateJournalEntryPage","deleteJournalEntryPage"])this.hooks.push([t,Hooks.on(t,e=>this.#c(e))]);for(let t of["createJournalEntry","updateJournalEntry","deleteJournalEntry"])this.hooks.push([t,Hooks.on(t,e=>this.#h(e))]);this.hooks.push(["deleteScene",Hooks.on("deleteScene",t=>this.#d(t))]);for(let t of["createScene","updateScene"])this.hooks.push([t,Hooks.on(t,()=>this.#i())]);this.#l()}dispose(){for(let[t,e]of this.hooks)Hooks.off(t,e);this.hooks=[],this.listeners.clear()}get entry(){let t=this.entryId?game.journal?.get?.(this.entryId):null;if(t&&t.getFlag(Z,"chalk")===!0)return t;let e=game.journal?.find(n=>n.getFlag(Z,"chalk")===!0)??null;return this.entryId=e?.id??null,e}get ready(){return!!this.entry}static wanted(){return!!game.scenes?.some(t=>er(t)&&$h(Co(t).chalk,t.flags?.[Z]?.live?.chalk).mode!=="off")}static#e=null;static ensure(){return kn()?i.#e??=i.#n().finally(()=>{i.#e=null}):Promise.resolve(null)}static async#n(){let t=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,e=game.journal.find(n=>n.getFlag(Z,"chalk")===!0);return e?(e.ownership?.default??0)<t&&await e.update({"ownership.default":t}):e=await JournalEntry.create({name:xE,flags:{[Z]:{chalk:!0}},ownership:{default:t}}),e}#i(){!kn()||this.ready||!i.wanted()||i.ensure().catch(t=>console.warn(`${Z} | could not make the chalk journal`,t))}#r(t){return(this.entry?.pages??[]).filter(e=>{let n=e.getFlag(Z,"chalk");return n?.scene===t&&n?.v===Ja})}#s(t,e){return this.#r(t).find(n=>n.getFlag(Z,"chalk")?.by===e)??null}layers(t){return this.#r(t).map(e=>{let n=e.getFlag(Z,"chalk");return{by:n.by,since:n.since??0,tiles:{...n.tiles??{}},history:{...n.history??{}}}})}#o(t){let e=this.#t.then(t);return this.#t=e.catch(()=>{}),e}save(t,{by:e=game.user.id,tiles:n,step:s=null,grid:r=null}){return this.#o(async()=>{let o=this.entry;if(!o)return!1;let a=Object.keys(n??{}).filter(d=>!r||bx(r,d));if(!a.length)return!1;let l=this.#s(t,e);if(!l){if(e!==game.user.id&&!game.user.isGM)return!1;let d=Object.fromEntries(a.filter(g=>n[g]).map(g=>[g,n[g]])),f=s?{[s.id]:{at:s.at,who:game.user.id,tiles:Object.fromEntries(a.map(g=>[g,null]))}}:{};return await o.createEmbeddedDocuments("JournalEntryPage",[{name:`chalk ${t} ${e}`,type:"text",text:{content:""},flags:{[Z]:{chalk:{v:Ja,scene:t,by:e,since:s?.at??Date.now(),tiles:d,history:f}}}}],So()),!0}let c=l.getFlag(Z,"chalk"),h={},u=`flags.${Z}.chalk`;for(let d of a)n[d]?h[`${u}.tiles.${d}`]=n[d]:c.tiles?.[d]!==void 0&&Ys(h,`${u}.tiles`,d);if(s){let d={at:s.at,who:game.user.id,tiles:Object.fromEntries(a.map(f=>[f,c.tiles?.[f]??null]))};h[`${u}.history.${s.id}`]=d;for(let f of Xf({...c.history??{},[s.id]:d},{protect:s.id}))Ys(h,`${u}.history`,f)}return await l.update(h,So()),!0})}tidy({now:t=Date.now(),hours:e=Sx}={}){return!kn()||!this.entry?Promise.resolve({steps:0,pages:0}):this.#o(async()=>{let n=this.entry,s=t-e*3600*1e3,r=c=>{let h=game.scenes;return h?typeof h.get=="function"?!!h.get(c):[...h].some(u=>u.id===c):!0},o=`flags.${Z}.chalk`,a=0,l=[];for(let c of[...n.pages??[]]){let h=c.getFlag(Z,"chalk");if(!h)continue;if(h.v!==Ja||h.scene&&!r(h.scene)){l.push(c.id);continue}let u=Xf(h.history,{before:s}),d=Object.keys(h.history??{}).length-u.length;if(!Object.keys(h.tiles??{}).length&&d<=0){l.push(c.id);continue}if(!u.length)continue;let f={};for(let g of u)Ys(f,`${o}.history`,g);await c.update(f,So()),a+=u.length}return l.length&&await n.deleteEmbeddedDocuments("JournalEntryPage",l,So()),{steps:a,pages:l.length}})}undo(t,{by:e=null}={}){return this.#o(async()=>{let s=this.#r(t).map(a=>{let l=a.getFlag(Z,"chalk"),c=e?Object.fromEntries(Object.entries(l.history??{}).filter(([,h])=>h?.who===e)):l.history;return{by:l.by,history:c,page:a}}),r=wx(s);if(!r)return null;let o={};for(let a of s){let l=a.history?.[r.id];if(!l||!a.page.isOwner)continue;let c=`flags.${Z}.chalk`,h=a.page.getFlag(Z,"chalk"),u={};Ys(u,`${c}.history`,r.id);let d={};for(let[f,g]of Object.entries(l.tiles??{}))d[f]=h.tiles?.[f]??null,g?u[`${c}.tiles.${f}`]=g:h.tiles?.[f]!==void 0&&Ys(u,`${c}.tiles`,f);await a.page.update(u,So()),o[a.by]=d}return{id:r.id,layers:o}})}wipe(t,{by:e=null}={}){return game.user.isGM?this.#o(async()=>{for(let n of this.#r(t)){let s=n.getFlag(Z,"chalk");if(e&&s?.by!==e)continue;let r=`flags.${Z}.chalk`,o={};for(let a of Object.keys(s?.tiles??{}))Ys(o,`${r}.tiles`,a);for(let a of Object.keys(s?.history??{}))Ys(o,`${r}.history`,a);Object.keys(o).length&&await n.update(o,So())}}):Promise.resolve()}painters(t){return this.layers(t).filter(e=>Object.keys(e.tiles).length).map(e=>e.by)}onChange(t){return this.listeners.add(t),()=>this.listeners.delete(t)}#a(t,e=null){for(let n of this.listeners)n(t,e)}#c(t){if(t.parent?.id!==this.entry?.id)return;let e=t.getFlag(Z,"chalk");if(e?.v!==Ja){this.#l();return}e?.scene&&this.#a(e.scene,e.by)}#h(t){t.getFlag(Z,"chalk")===!0&&(this.#a(null),this.#l())}#l(){if(!kn()||!this.entry)return;let t=(this.entry.pages??[]).filter(e=>{let n=e.getFlag(Z,"chalk");return n&&n.v!==Ja}).map(e=>e.id);t.length&&this.#o(()=>this.entry.deleteEmbeddedDocuments("JournalEntryPage",t)).catch(e=>{/does not exist/.test(e?.message??"")||console.warn(`${Z} | could not remove old chalk pages`,e)})}#d(t){!kn()||!t?.id||this.#o(async()=>{let e=(this.entry?.pages??[]).filter(n=>n.getFlag(Z,"chalk")?.scene===t.id).map(n=>n.id);e.length&&await this.entry.deleteEmbeddedDocuments("JournalEntryPage",e)}).catch(e=>{/does not exist/.test(e?.message??"")||console.warn(`${Z} | could not clear the chalk of a deleted scene`,e)})}};function yE(i,t,{user:e=game.user,journal:n=game.journal}={}){if(e?.isGM||!t?.querySelectorAll)return 0;let s=n?.find(o=>o.getFlag(Z,"chalk")===!0);if(!s)return 0;let r=[...t.querySelectorAll(`[data-entry-id="${s.id}"]`)];for(let o of r)o.remove();return r.length}function xv(){Hooks.on("renderJournalDirectory",(i,t)=>yE(i,t))}var Rp=new el,Pp={chalkStore:null};Hooks.once("init",()=>{lm(),gv(()=>ys.host),Pp.chalkStore=new To,xv(),pv(Rp,{services:Pp}),Hooks.callAll("stagecraft.init",{registerSkin:i=>Rp.register(i)})});Hooks.once("ready",async()=>{let i=game.modules.get("stagecraft");i.api=mv({skins:Rp,current:ys});try{To.wanted()&&await To.ensure()}catch(t){console.warn("stagecraft | could not make the chalk journal",t)}Hooks.callAll("stagecraft.ready",i.api),setTimeout(()=>Pp.chalkStore?.tidy().catch(t=>console.warn("stagecraft | could not tidy the chalk journal",t)),8e3)});
/*! Bundled license information:

three/build/three.core.js:
three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2026 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
