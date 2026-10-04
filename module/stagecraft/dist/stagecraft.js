var up={family:'"Modesto Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif',weight:700,max:66,min:34,maxLines:3,lineHeight:1.04,tracking:.04,upper:!0},dp={family:'Signika, "Helvetica Neue", Arial, sans-serif',weight:700,max:32,min:28,maxLines:3,lineHeight:1.16,tracking:.01,upper:!1},xy={...up,max:48,min:26,maxLines:3},yy={...dp,max:28,min:22,maxLines:2},hp='600 34px "Helvetica Neue", Arial, sans-serif';function go(i,t,e,n,s,r){i.beginPath(),i.roundRect(t,e,n,s,r)}var fp={id:"paper",name:"Paper",size:{w:280,h:468},thickness:9,fonts:["700 40px 'Modesto Condensed'","700 28px Signika"],stick:{length:134,collar:12170148,wood:13081186},materials:{body:{color:15196109,metalness:0,roughness:.9},face:{metalness:0,roughness:.85,clearcoat:.15},back:{metalness:0,roughness:.9}},async face(i,{loadImage:t,titleBlock:e}={}){let r=document.createElement("canvas");r.width=560,r.height=936;let o=r.getContext("2d");go(o,0,0,560,936,28),o.fillStyle="#f3ecdc",o.fill(),o.lineWidth=6,o.strokeStyle="#3b3226",go(o,6,6,548,924,24),o.stroke();let a=36,l=36,c=488,h=e?.fit(i,{width:c-56,maxHeight:236,gap:14,name:up,text:dp})??null,d=h?Math.min(300,Math.max(104,Math.ceil(h.height)+44)):98,u=936-l-36-34-d;o.save(),go(o,a,l,c,u,14),o.clip(),o.fillStyle="#cfc6b0",o.fillRect(a,l,c,u);let f=i.portrait&&t?await t(i.portrait):null;if(f){let g=Math.max(c/f.width,u/f.height);o.drawImage(f,a+(c-f.width*g)/2,l+(u-f.height*g)*.15,f.width*g,f.height*g)}else o.fillStyle="#3b3226",o.font=`700 ${Math.round(Math.min(c,u)*.5)}px sans-serif`,o.textAlign="center",o.textBaseline="middle",o.fillText((i.name??"?").slice(0,1).toUpperCase(),a+c/2,l+u/2);o.restore(),i.colour&&(o.fillStyle=i.colour,o.fillRect(a,l+u+14,c,8));let x=l+u+34;return h?e.draw(o,h,{x:a,y:x,w:c,h:d},{ink:"#2b241a",textInk:"#4a3f2f",rule:"rgba(59,50,38,0.4)"}):(o.fillStyle="#3b3226",o.font=hp,o.textAlign="center",o.textBaseline="middle",o.fillText((i.name??i.id).toUpperCase(),560/2,x+(936-x-36)/2)),r},async back(i,{titleBlock:t}={}){let s=document.createElement("canvas");s.width=560,s.height=936;let r=s.getContext("2d");go(r,0,0,560,936,28),r.fillStyle="#b9966a",r.fill();let o=t?.fit(i,{width:372,maxHeight:200,gap:12,name:xy,text:yy})??null,a=o?Math.min(250,Math.max(88,Math.ceil(o.height)+40)):88;return r.fillStyle="#f3ecdc",go(r,560/2-206,936/2-a/2,412,a,6),r.fill(),o?t.draw(r,o,{x:560/2-206,y:936/2-a/2,w:412,h:a},{ink:"#2b241a",textInk:"#4a3f2f",rule:"rgba(59,50,38,0.4)"}):(r.fillStyle="#3b3226",r.font=hp,r.textAlign="center",r.textBaseline="middle",r.fillText(i.name??i.id,560/2,936/2+2)),s}};var _y=["id","size","face","back"],Wa=class{constructor(){this.skins=new Map,this.register(fp),this.current="paper"}register(t){for(let e of _y)if(!t?.[e])throw new Error(`a skin needs "${e}"`);if(typeof t.face!="function"||typeof t.back!="function")throw new Error("a skin's face and back are functions");if(!(t.size?.w>0&&t.size?.h>0))throw new Error("a skin's size is { w, h } in pixels");return this.skins.set(t.id,{thickness:9,fonts:[],stick:{length:134,collar:12170148,wood:13081186},materials:{},...t}),t.id}get(t){return this.skins.get(t)??this.skins.get(this.current)??this.skins.get("paper")}use(t){if(!this.skins.has(t))throw new Error(`no skin "${t}" is registered`);this.current=t}list(){return[...this.skins.keys()]}};var xo=Object.freeze(["off","zones","anywhere"]),vy=.15,gp=Object.freeze(["door","spot","area","exit","track","chalk","podium","photo","quiet","music","shelter","shot","trigger"]),$s=i=>typeof i=="number"&&Number.isFinite(i),pp=(i,t=-.25,e=1.25)=>$s(i)&&i>=t&&i<=e,Xs=i=>Array.isArray(i)&&i.length===2&&pp(i[0])&&pp(i[1]),Se=(i,t)=>$s(i)?i:t,Je=(i,t="")=>typeof i=="string"?i:t;function bu(i,t,e,n=0){if(!Array.isArray(i))return e.push(`${t}: expected a list of [x, y] points`),[];let s=[];return i.forEach((r,o)=>Xs(r)?s.push([r[0],r[1]]):e.push(`${t}[${o}]: not a point on the painting`)),s.length<n&&e.push(`${t}: needs at least ${n} points`),s}function mp(i,t,e){let n=new Set;return i.filter(s=>s.id?n.has(s.id)?(e.push(`${t}: id "${s.id}" is used twice`),!1):(n.add(s.id),!0):(e.push(`${t}: an entry has no id`),!1))}function Zs(i){let t=[],e=i&&typeof i=="object"?i:{};(!i||typeof i!="object")&&t.push("the scene carries no stage description");let n={src:Je(e.painting?.src),size:Array.isArray(e.painting?.size)&&e.painting.size.length===2&&e.painting.size.every(g=>$s(g)&&g>0)?[e.painting.size[0],e.painting.size[1]]:null};n.src||t.push("painting.src: the stage needs a painting"),n.size||t.push("painting.size: give the painting's size in pixels, [width, height]");let s={horizon:Se(e.rig?.horizon,null),floorFront:Se(e.rig?.floorFront,null),depth:Se(e.rig?.depth,null),vanish:Se(e.rig?.vanish,.5),lift:Se(e.rig?.lift,0)};for(let g of["horizon","floorFront","depth"])s[g]===null&&t.push(`rig.${g}: the rig needs a number here`);s.horizon!==null&&s.floorFront!==null&&s.floorFront<=s.horizon&&t.push("rig: the floor must meet the front of the picture below the horizon"),s.depth!==null&&s.depth<=0&&t.push("rig.depth: must be above zero");let r=(Array.isArray(e.lights)?e.lights:[]).flatMap((g,p)=>{if(!Xs(g?.at))return t.push(`lights[${p}].at: not a point on the painting`),[];let m=Array.isArray(g.colour)&&g.colour.length===3&&g.colour.every($s)?g.colour.map(v=>Math.max(0,Math.min(255,v))):[255,172,96];return[{id:Je(g.id,`light-${p+1}`),at:[g.at[0],g.at[1]],below:Se(g.below,.9),colour:m,intensity:Math.max(0,Se(g.intensity,1)),flicker:Math.max(0,Math.min(.5,Se(g.flicker,.05))),flickerHz:Math.max(.5,Se(g.flickerHz,7)),pool:$s(g.pool)&&g.pool>0?g.pool:0,shadow:g.shadow===!0}]}),o=(Array.isArray(e.occluders)?e.occluders:[]).flatMap((g,p)=>{let m=bu(g?.poly,`occluders[${p}].poly`,t,3);return m.length<3?[]:[{id:Je(g.id,`occluder-${p+1}`),poly:m,base:Se(g.base,.86),x:Se(g.x,.5),riser:g.riser!==!1,hideAtMost:Math.max(.05,Math.min(1,Se(g.hideAtMost,vy)))}]}),a=(Array.isArray(e.zones)?e.zones:[]).flatMap((g,p)=>{let m=bu(g?.shape,`zones[${p}].shape`,t,3);if(m.length<3)return[];let v=g.floor===void 0?null:bu(g.floor,`zones[${p}].floor`,t,3),E=Array.isArray(g.tags)?g.tags.filter(w=>typeof w=="string"&&w.trim()).map(w=>w.trim()):[],M=Array.isArray(g.near)?g.near.filter(w=>typeof w=="string"):[],T=Array.isArray(g.colour)&&g.colour.length===3&&g.colour.every($s)?g.colour.map(w=>Math.max(0,Math.min(255,w))):null;return[{id:Je(g.id),kind:Je(g.kind,"trigger")||"trigger",name:Je(g.name),hint:Je(g.hint),shape:m,floor:v&&v.length>=3?v:null,quiet:g.quiet===!0,gate:["open","ask","locked","hidden"].includes(g.gate)?g.gate:"open",to:Je(g.to),tags:E,near:M,colour:T}]}),l=mp(a,"zones",t);for(let g of l)for(let p of g.near)l.some(m=>m.id===p)||t.push(`zones: "${g.id}" is near "${p}", which is not in this scene`);let c=(Array.isArray(e.marks)?e.marks:[]).flatMap((g,p)=>{if(!Xs(g?.at))return t.push(`marks[${p}].at: not a point on the painting`),[];let m=g.faces&&typeof g.faces=="object"?Xs(g.faces.point)?{point:[g.faces.point[0],g.faces.point[1]]}:Je(g.faces.zone)?{zone:Je(g.faces.zone)}:Je(g.faces.card)?{card:Je(g.faces.card)}:null:null;return[{id:Je(g.id),at:[g.at[0],g.at[1]],yaw:Se(g.yaw,0),lean:Se(g.lean,0),pitch:Se(g.pitch,0),lift:Math.max(0,Se(g.lift,0)),capacity:Math.max(1,Math.round(Se(g.capacity,1))),label:Je(g.label),group:Je(g.group),zone:Je(g.zone),faces:m}]}),h=mp(c,"marks",t);for(let g of h)g.zone&&!l.some(p=>p.id===g.zone)&&t.push(`marks: "${g.id}" belongs to zone "${g.zone}", which is not in this scene`);for(let g of h)g.faces?.zone&&!l.some(p=>p.id===g.faces.zone)&&t.push(`marks: "${g.id}" faces zone "${g.faces.zone}", which is not in this scene`);let d=xo.includes(e.chalk?.mode)?e.chalk.mode:"off";e.chalk?.mode!==void 0&&!xo.includes(e.chalk.mode)&&t.push(`chalk.mode: "${e.chalk.mode}" is not one of ${xo.join(", ")}`);let u={mode:d,lock:e.chalk?.lock===!0,weather:e.chalk?.weather===!0,box:Xs(e.chalk?.box)?[e.chalk.box[0],e.chalk.box[1]]:null};u.mode==="zones"&&!l.some(g=>g.kind==="chalk")&&t.push("chalk: the mode is zones but the scene has no zone of kind chalk");let f={version:1,painting:n,rig:s,skin:Je(e.skin),cardScale:Math.max(.2,Math.min(2,Se(e.cardScale,.7))),ambient:Math.max(0,Se(e.ambient,1.7)),lights:r,occluders:o,zones:l,marks:h,chalk:u,marksOnly:e.marksOnly===!0,grade:Math.max(0,Math.min(1.5,Se(e.grade,1))),footlights:e.footlights===!0,focus:Xs(e.focus)?[e.focus[0],e.focus[1]]:null,board:e.board===!0,reach:{snap:Math.max(40,Se(e.reach?.snap,170)),show:Math.max(200,Se(e.reach?.show,700))}},x=!!(n.src&&n.size&&s.horizon!==null&&s.floorFront!==null&&s.depth!==null);return{ok:t.length===0,usable:x,scene:f,problems:t}}var J="stagecraft",yo=i=>i?.flags?.[J]?.stage??null,qs=i=>!!yo(i)&&typeof yo(i)=="object",Ui=i=>Array.isArray(i?.flags?.[J]?.published?.cards)?i.flags[J].published.cards:[];function Ys(i){let t=Zs(yo(i));return t.usable&&t.scene.painting.src&&globalThis.foundry?.utils?.getRoute&&(t.scene.painting.src=foundry.utils.getRoute(t.scene.painting.src)),t}function _o(i){let t=globalThis.foundry?.utils?.getRoute??(e=>e);return Ui(i).filter(e=>e&&typeof e.id=="string").map(e=>({...e,portrait:e.portrait?t(e.portrait):e.portrait}))}function Qn(){if(!game.user?.isGM)return!1;let i=game.users?.activeGM;return i?i.id===game.user.id:!0}var js=i=>i?.flags?.[J]?.live?.handsOff===!0;function Xa(i,t,{handsOff:e=!1}={}){return t?.isGM?!0:e?!1:!Array.isArray(i?.owners)||i.owners.length===0?!0:i.owners.includes(t?.id)}var Fi=Object.freeze({ignore:30,take:90,least:30,fineMs:20,slowRatio:1.4,veryRatio:2.2,display:16.666666666666668,patience:12e3,settle:4e3,again:45e3,keepHours:12}),Ks=Object.freeze(["high","low","flat"]),My=i=>Ks[Ks.indexOf(i)+1]??null,xp=(i,t)=>Ks.indexOf(i)>=Ks.indexOf(t)?i:t,by=i=>i.length?i[Math.floor(i.length/2)]:0,Sy=Object.freeze([30,60,72,75,90,100,120,144,165,240]);function yp(i,t=Fi){let e=(i??[]).filter(r=>Number.isFinite(r)&&r>0).sort((r,o)=>r-o);if(e.length<8)return t.display;let n=e[Math.floor(e.length*.2)];if(n<1e3/244||n>1e3/28)return t.display;let s=Sy.find(r=>1e3/r<=n*1.05);return s?1e3/s:t.display}function _p(i,t=Date.now(),e=Fi){return Number.isFinite(i)&&t-i>=0&&t-i<e.keepHours*3600*1e3}var $a=class{constructor(t=Fi){this.limits=t,this.seen=0,this.gaps=[],this.began=null,this.previous=null}push(t){this.began??=t,this.elapsed=t-this.began;let e=this.previous===null?null:t-this.previous;this.previous=t,!(e===null||++this.seen<=this.limits.ignore)&&Number.isFinite(e)&&e>=0&&this.gaps.length<this.limits.take&&this.gaps.push(e)}get done(){return this.gaps.length>=this.limits.take||(this.elapsed??0)>=this.limits.patience}result(){let t=[...this.gaps].sort((e,n)=>e-n);return{n:t.length,median:by(t),p90:t.length?t[Math.min(t.length-1,Math.floor(t.length*.9))]:0}}};function vp(i,{limits:t=Fi,display:e=null,cap:n=60,patient:s=!1}={}){if(i.n<t.least)return s&&i.n>=8?"very-slow":"unknown";if(i.median<=t.fineMs)return"ok";let r=Number.isFinite(n)&&n>0?Math.min(n,60):60,o=Math.max(1e3/r,e??t.display),a=i.median/o;return a>t.veryRatio?"very-slow":a>t.slowRatio?"slow":"ok"}function Mp({tier:i,verdict:t,strikes:e=0,hard:n=0}){if(i==="flat"||i==null)return{to:null,strikes:0,hard:0};if(t==="ok")return{to:null,strikes:0,hard:0};if(t!=="slow"&&t!=="very-slow")return{to:null,strikes:e,hard:n};let s=e+1,r=n+(t==="very-slow"?1:0);return s<2?{to:null,strikes:s,hard:r}:{to:r>=2?"flat":My(i),strikes:0,hard:0}}var gs=Object.freeze({cap:60,idle:30,wake:1500,walking:.5,still:.02,early:1.5});function bp({fps:i,mode:t=null,max:e=null}={}){let n=Number.isFinite(Number(i))&&Number(i)>0?Number(i):gs.cap;return e!==null&&t===e&&n>=60?1/0:Math.max(10,Math.min(60,n))}var Za=class{constructor({cap:t=gs.cap,idle:e=gs.idle,wake:n=gs.wake,easing:s=!0}={}){this.cap=t,this.idle=e,this.wake=n,this.easing=s,this.awakeUntil=-1/0,this.next=-1/0}poke(t){this.awakeUntil=Math.max(this.awakeUntil,t+this.wake)}active(t){return!this.easing||t<this.awakeUntil}gap(t){let e=this.active(t)?this.cap:Math.min(this.cap,this.idle);return e===1/0?0:1e3/e}due(t){return t>=this.next-gs.early}drew(t){let e=this.gap(t);if(!e){this.next=t;return}this.next=this.next+e<t-e?t:this.next+e}scale(t){let e=this.cap===1/0?0:1e3/this.cap,n=this.gap(t);return e&&n?e/n:1}};function Sp(i){let t=new Float32Array(i.length*4),e=0;for(let n of i)t[e++]=n.x??0,t[e++]=n.z??0,t[e++]=n.grip??0,t[e++]=n.down??0;return t}function wp(i,t,{walking:e=gs.walking,still:n=gs.still}={}){if(!i||i.length!==t.length)return i!=null;for(let s=0;s<t.length;s++){let r=s&2?n:e;if(Math.abs(t[s]-i[s])>r)return!0}return!1}function Tp({tier:i,webgl:t,failed:e=!1,software:n=!1}){return i==="flat"||!t||e||n?"flat":"three"}var wy=/swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i,Ty=i=>wy.test(String(i??"")),Su=null;function Bi(i=globalThis.document){if(Su!==null)return Su;let t={ok:!1,renderer:""};try{let e=i.createElement("canvas"),n=e.getContext("webgl2")??e.getContext("webgl");if(n){let s=n.getExtension?.("WEBGL_debug_renderer_info");t={ok:!0,renderer:String((s?n.getParameter?.(s.UNMASKED_RENDERER_WEBGL):n.getParameter?.(n.RENDERER))??"")},n.getExtension?.("WEBGL_lose_context")?.loseContext()}}catch{t={ok:!1,renderer:""}}return Su=t,t}var Ep=i=>Bi(i).ok,Ap=i=>{let t=Bi(i);return t.ok&&Ty(t.renderer)};var wu="stagecraft.speed",Cp=()=>Bi().renderer||"unknown";function Tu({now:i=Date.now(),limits:t={...Fi,...globalThis.__stagecraftSpeed??{}}}={}){try{let e=JSON.parse(globalThis.localStorage?.getItem(wu)??"null");return!e||e.gpu!==Cp()||e.tier&&!Ks.includes(e.tier)||e.tier&&!_p(e.at,i,t)?null:{ok:e.ok===!0,tier:e.tier??null,at:e.at??null}}catch{return null}}function Eu({ok:i=!1,tier:t=null}){try{globalThis.localStorage?.setItem(wu,JSON.stringify({gpu:Cp(),ok:i,tier:t,at:Date.now()}))}catch{}}function Rp(){try{globalThis.localStorage?.removeItem(wu)}catch{}}var Pp=()=>Tu()?.tier??null;function Ip(){let i=foundry.data.fields;game.settings.register(J,"tier",{name:"STAGECRAFT.Settings.Tier.Name",hint:"STAGECRAFT.Settings.Tier.Hint",scope:"client",config:!0,requiresReload:!1,type:new i.StringField({required:!0,blank:!1,initial:"auto",choices:{auto:"STAGECRAFT.Settings.Tier.Auto",high:"STAGECRAFT.Settings.Tier.High",low:"STAGECRAFT.Settings.Tier.Low",flat:"STAGECRAFT.Settings.Tier.Flat"}}),onChange:()=>{Rp(),Hooks.callAll("stagecraft.settingsChanged","tier")}}),game.settings.register(J,"zones",{name:"STAGECRAFT.Settings.Zones.Name",hint:"STAGECRAFT.Settings.Zones.Hint",scope:"client",config:!0,type:new i.StringField({required:!0,blank:!1,initial:"off",choices:{off:"STAGECRAFT.Settings.Zones.Off",faint:"STAGECRAFT.Settings.Zones.Faint",full:"STAGECRAFT.Settings.Zones.Full"}}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","zones")}),game.settings.register(J,"power",{name:"STAGECRAFT.Settings.Power.Name",hint:"STAGECRAFT.Settings.Power.Hint",scope:"client",config:!0,type:new i.BooleanField({initial:!0}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","power")}),game.settings.register(J,"calm",{name:"STAGECRAFT.Settings.Calm.Name",hint:"STAGECRAFT.Settings.Calm.Hint",scope:"client",config:!0,type:new i.BooleanField({initial:!1}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","calm")})}var qa=()=>game.settings.get(J,"tier");function xs(){let i=game.settings.get(J,"tier");if(i==="high"||i==="low"||i==="flat")return i;let t=game.settings.get("core","performanceMode"),e=t!==null&&t<=CONST.CANVAS_PERFORMANCE_MODES.LOW?"low":"high";return xp(e,Pp()??"high")}function Js(){return game.settings.get(J,"calm")||game.settings.get("core","photosensitiveMode")?!0:!!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches}var Ya=()=>game.settings.get(J,"zones"),Au=()=>game.settings.get(J,"power")!==!1,kp=()=>bp({fps:game.settings.get("core","maxFPS"),mode:game.settings.get("core","performanceMode")??null,max:globalThis.CONST?.CANVAS_PERFORMANCE_MODES?.MAX??null});var Dp=(i,t,e)=>Math.max(t,Math.min(e,i)),Ey=(i,t,e)=>i+(t-i)*e,Ay=Math.PI/180;function Np(i){let t=i>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function vo(i,t=0){let e=Math.floor(i),n=i-e,s=o=>{let a=Math.imul(o+t*7919|0,668265261);return a^=a>>>15,a=Math.imul(a,2246822507),a^=a>>>13,(a>>>0)/4294967296*2-1},r=n*n*(3-2*n);return Ey(s(e),s(e+1),r)}function Op(i,t,e,n,s=.5,r=0,o=.5){let a=Math.max(e/i,n/t),l=(e-i*a)*o,c=(n-t*a)*s-r;return{s:a,ox:l,oy:c,lift:r,x:h=>l+h*i*a,y:h=>c+h*t*a}}function Up(i,t,e){return{f:i.depth*e,cx:t.x(i.vanish??.5),cy:t.y(i.horizon),floorY:t.y(i.floorFront),map:t}}function Cu(i,t,e,n){let s=i.f/(i.f-n);return{sx:i.cx+(t-i.cx)*s,sy:i.cy+(e-i.cy)*s,k:s}}function Cy(i,t,e){let n=(e-i.cy)/(i.floorY-i.cy);if(n<=0)return null;let s=i.f-i.f/n;return{x:i.cx+(t-i.cx)/n,z:s}}function Fp(i,t,e){return Cy(i,i.map.x(t),i.map.y(e))}function bn(i,t,e,n){return Math.atan2(e-i,n-t)/Ay}function Sn(i,{share:t=.62,max:e=52}={}){let n=(i+540)%360-180;return Math.abs(n)>90&&(n=Math.sign(n)*(180-Math.abs(n))*.5+Math.sign(n)*35),Dp(n*t,-e,e)}function Bp(i,t,e,{gap:n=380,spread:s=150,depthStep:r=60}={}){let o=[];return t.forEach((a,l)=>{let c=i.x-n/2-l*s*.7,h=i.z-l*r;o.push({x:c,z:h,yaw:Sn(bn(c,h,i.x+n/2,i.z),{share:.75,max:48}),lean:0,pitch:-3})}),e.forEach((a,l)=>{let c=i.x+n/2+l*s*.7,h=i.z-l*r;o.push({x:c,z:h,yaw:Sn(bn(c,h,i.x-n/2,i.z),{share:.75,max:48}),lean:0,pitch:-3})}),o}var Lp=Object.freeze({calm:{breathe:.006,breatheHz:.22,sway:.5,swayHz:.09,fidget:0,pitch:0,lean:0,glance:.7},nervous:{breathe:.01,breatheHz:.45,sway:1.1,swayHz:.6,fidget:.25,pitch:2,lean:0,glance:1.2,jitter:.6},proud:{breathe:.007,breatheHz:.18,sway:.3,swayHz:.07,fidget:0,pitch:-4,lean:0,glance:.4},slouch:{breathe:.008,breatheHz:.15,sway:.9,swayHz:.06,fidget:.05,pitch:3,lean:4,glance:.3},bouncy:{breathe:.009,breatheHz:.5,sway:.8,swayHz:.35,fidget:.4,pitch:0,lean:0,glance:1,hop:6},sly:{breathe:.006,breatheHz:.2,sway:.6,swayHz:.12,fidget:.1,pitch:4,lean:-3,glance:1.4}});function zp(i,t,e="calm",{speakerYaw:n=null}={}){let s=Lp[e]??Lp.calm,r=t%1e3/1e3,o=1+s.breathe*Math.sin(2*Math.PI*(i*s.breatheHz+r)),a=s.lean+s.sway*vo(i*s.swayHz*4+r*10,t),l=0;if(s.jitter&&(a+=s.jitter*vo(i*9+r*31,t+3)*.6),s.fidget){let h=Math.floor(i*s.fidget+r*7),d=i*s.fidget+r*7-h,u=Math.abs(vo(h*1.7,t+11));if(u>.55&&d<.18){let f=Math.sin(d/.18*Math.PI);l+=(s.hop??3)*f,a+=2.5*f*(u>.8?1:-1)}}let c=n===null?0:Dp(n,-1,1)*6*s.glance;return{breathe:o,lean:a,pitch:s.pitch,lift:l,yaw:c}}var gT=Object.freeze({dust:{rate:26,life:[5,9],size:[1.2,2.8],vy:[-6,6],vx:[-8,8],vz:[-6,6],gravity:0,drag:.4,glow:!0},smoke:{rate:5,life:[5,8],size:[26,46],vy:[-26,-14],vx:[-6,6],vz:[-4,4],gravity:0,drag:.2,grow:9,soft:!0},steam:{rate:9,life:[3.5,6],size:[30,56],vy:[-34,-18],vx:[-8,8],vz:[-6,6],gravity:0,drag:.2,grow:14,soft:!0},sparks:{rate:60,life:[.5,1.1],size:[1.6,3],vy:[-260,-90],vx:[-140,140],vz:[-60,60],gravity:520,drag:.1,glow:!0,bounce:.35,streak:!0},petals:{rate:3,life:[9,14],size:[5,8],vy:[10,22],vx:[-22,4],vz:[-6,6],gravity:0,drag:.1,settle:!0,spin:!0},snow:{rate:30,life:[18,26],size:[1.6,3.6],vy:[50,80],vx:[-10,10],vz:[-10,10],gravity:0,drag:.1,settle:!0},rain:{rate:240,life:[.9,1.3],size:[1,1.6],vy:[900,1200],vx:[-90,-60],vz:[0,0],gravity:0,drag:0,streak:!0,splash:!0}});var Hp=(i,t,e)=>Math.max(t,Math.min(e,i)),Ru=Object.freeze({follow:42,stiffness:150,damping:9,lag:.5,maxLean:15,jostleK:110,jostleC:11,bumpSpin:.009,bonkSpeed:120,shove:.35,maxJolt:70,growK:220,growC:22,parked:.5,held:1,hopTime:.42,hopHeight:74,nodTime:.34,bowTime:.95,shakeTime:.62});function Gp({id:i,x:t,y:e,scale:n=1,home:s="stage",owner:r=null,rod:o=112,w:a=230,h:l=393}){return{id:i,owner:r,home:s,rod:o,w:a,h:l,x:t,y:e,vx:0,vy:0,ax:0,restX:t,restY:e,lean:0,leanV:0,jx:0,jv:0,scale:n,scaleV:0,scaleTo:n,turn:0,turnV:0,turnTo:0,heldBy:null,target:null,verbs:[]}}var Ry=Object.freeze(["hop","nod","bow","shake","turn"]);function Pu(i,t){return t==="turn"?(i.turnTo=i.turnTo?0:180,i):(Ry.includes(t)&&i.verbs.push({verb:t,t:0}),i)}function Vp(i,t,e=Ru){let n=i.target?i.target.x:i.restX,s=i.target?i.target.y:i.restY,r=e.follow,o=r*r*(n-i.x)-2*r*i.vx,a=r*r*(s-i.y)-2*r*i.vy;i.vx+=o*t,i.vy+=a*t,i.x+=i.vx*t,i.y+=i.vy*t,i.ax=o;let l=-e.stiffness*i.lean-e.damping*i.leanV-e.lag*e.stiffness/1e3*o;i.leanV+=l*t,i.lean+=i.leanV*t,i.lean=Hp(i.lean,-e.maxLean*1.6,e.maxLean*1.6);let c=-e.jostleK*i.jx-e.jostleC*i.jv;i.jv+=c*t,i.jx+=i.jv*t;let h=e.growK*(i.scaleTo-i.scale)-e.growC*i.scaleV;i.scaleV+=h*t,i.scale+=i.scaleV*t;let d=160*(i.turnTo-i.turn)-18*i.turnV;i.turnV+=d*t,i.turn+=i.turnV*t;for(let u of i.verbs)u.t+=t;return i.verbs=i.verbs.filter(u=>u.t<Wp(u.verb,e)),i}function Wp(i,t){return i==="hop"?t.hopTime:i==="nod"?t.nodTime:i==="bow"?t.bowTime:t.shakeTime}function Xp(i,t=Ru){let e=0,n=1,s=0,r=0,o=0;for(let a of i.verbs){let l=a.t/Wp(a.verb,t);a.verb==="hop"?(e+=4*t.hopHeight*l*(1-l),l<.12&&(n*=1-.1*Math.sin(l/.12*Math.PI)),l>.86&&(n*=1-.12*Math.sin((l-.86)/.14*Math.PI))):a.verb==="nod"?(o+=12*Math.sin(l*Math.PI),n*=1-.04*Math.sin(l*Math.PI)):a.verb==="bow"?s+=34*Math.sin(Math.min(1,l*1.6)*Math.PI*.5)*(l<.62?1:Math.max(0,(1-l)/.38)):a.verb==="shake"&&(r+=18*Math.exp(-3.2*l)*Math.sin(l*4*2*Math.PI))}return{lift:e,squash:n,tipX:s,shakeY:r,dip:o}}function Mo(i){let t=i.scale,e=i.x+i.jx-i.w*t/2,n=i.y-i.rod*t;return{left:e,right:e+i.w*t,top:n-i.h*t,bottom:n}}function $p(i,t=new Set,e=Ru){let n=[],s=new Set,r=o=>Hp(o,-e.maxJolt,e.maxJolt);for(let o=0;o<i.length;o++)for(let a=o+1;a<i.length;a++){let l=i[o],c=i[a];if(!l.heldBy&&!c.heldBy||l.home==="wings"||c.home==="wings")continue;let h=Mo(l),d=Mo(c),u=Math.min(h.right,d.right)-Math.max(h.left,d.left),f=Math.min(h.bottom,d.bottom)-Math.max(h.top,d.top);if(u<=0||f<=0)continue;let x=(h.left+h.right)/2<(d.left+d.right)/2?1:-1,g=l.heldBy&&!c.heldBy?.15:!l.heldBy&&c.heldBy?.85:.5,p=1-g,m=`${l.id}|${c.id}`;if(s.add(m),l.heldBy&&c.heldBy&&(l.jx=r(l.jx-x*u*e.shove),c.jx=r(c.jx+x*u*e.shove)),t.has(m))continue;let v=Math.abs(l.vx-c.vx);v<e.bonkSpeed||(l.jv-=x*v*.3*g,c.jv+=x*v*.3*p,l.leanV-=x*v*e.bumpSpin*6,c.leanV+=x*v*e.bumpSpin*14*p,n.push({a:l.id,b:c.id,x:x>0?h.right-u/2:h.left+u/2,y:Math.max(h.top,d.top)+f*.3,speed:v}))}for(let o of i)o.jx=r(o.jx);t.clear();for(let o of s)t.add(o);return n}function Zp(i,t,e,n,s=33){return i?n-i.t<s?!1:Math.abs(t-i.x)+Math.abs(e-i.y)>.75:!0}var ja=class{constructor({delay:t=100,max:e=32}={}){this.delay=t,this.max=e,this.samples=[]}push(t){this.samples.push(t),this.samples.sort((e,n)=>e.t-n.t),this.samples.length>this.max&&this.samples.shift()}at(t){let e=this.samples;if(!e.length)return null;let n=t-this.delay;if(n<=e[0].t)return{x:e[0].x,y:e[0].y};for(let l=1;l<e.length;l++)if(e[l].t>=n){let c=e[l-1],h=e[l],d=(n-c.t)/Math.max(1,h.t-c.t);return{x:c.x+(h.x-c.x)*d,y:c.y+(h.y-c.y)*d}}let s=e[e.length-1],r=e[e.length-2]??s,o=Math.min(n-s.t,80),a=Math.max(1,s.t-r.t);return{x:s.x+(s.x-r.x)/a*o,y:s.y+(s.y-r.y)/a*o}}};function qp(i,t){return i?t?i.t!==t.t?i.t<t.t?i:t:i.user<t.user?i:t:i:t}var Ka=Object.freeze({W:2560,H:1440}),Pn=12e3,bo=-(Pn-1500);function Qs(i,t,e=Ka){let[n,s]=i.size,r=Op(n,s,e.W,e.H,.5,t.lift??0,.5),o=Up(t,r,e.W),a=(c,h)=>[(c-r.ox)/(n*r.s),(h-r.oy)/(s*r.s)],l=c=>{let h=Fp(o,c[0],c[1]);return h?{X:h.x-o.cx,Z:h.z}:null};return{ref:e,map:r,cam:o,size:[n,s],standing:l,place(c){let h=l(c);return!h||h.Z>=bo?h:{X:h.X*(o.f-bo)/(o.f-h.Z),Z:bo}},fractionOf(c,h){let d=Cu(o,c+o.cx,o.floorY,h);return a(d.sx,d.sy)},screenOf(c,h,d){let u=Cu(o,c+o.cx,o.floorY-h,d);return{x:u.sx,y:u.sy,k:u.k}},fractionOfScreen:a}}var Py=.5;function Ja(i,t,{ease:e=Py,most:n=2.2}={}){if(!(t<0))return 1;let s=i.f/(i.f-t);return Math.min(n,Math.max(1,s**-e))}function So(i,t,e=Ka){let n=Math.max(i/e.W,t/e.H),s=i/n,r=t/n;return{vw:i,vh:t,s:n,ox:(e.W-s)/2,oy:(e.H-r)/2,visW:s,visH:r}}var wo=Object.freeze({rest:"rest",near:"near",target:"target"}),Yp=Object.freeze({faint:.2,off:0,full:1});function gi(i,t,e){let n=!1;for(let s=0,r=i.length-1;s<i.length;r=s++){let[o,a]=i[s],[l,c]=i[r];a>e!=c>e&&t<(l-o)*(e-a)/(c-a)+o&&(n=!n)}return n}function Iu(i,t,e){let n=1/0;for(let s=0,r=i.length-1;s<i.length;r=s++){let[o,a]=i[r],[l,c]=i[s],h=l-o,d=c-a,u=h*h+d*d,f=u===0?0:Math.max(0,Math.min(1,((t-o)*h+(e-a)*d)/u));n=Math.min(n,Math.hypot(t-(o+f*h),e-(a+f*d)))}return n}function ku(i){let t=0,e=0;for(let[n,s]of i)t+=n,e+=s;return[t/i.length,e/i.length]}var To=i=>i.floor&&i.floor.length>=3?i.floor:i.shape;function tr(i,t,e){return i.filter(n=>gi(To(n),t,e))}function jp(i,t,e=.1){let n={};for(let s of i){let r=wo.rest,o=To(s);for(let a of t){if(gi(o,a.x,a.y)){r=wo.target;break}Iu(o,a.x,a.y)<=e&&(r=wo.near)}n[s.id]=r}return n}function Lu(i,t,e="faint"){return t===wo.target?1:t===wo.near?.85:i.quiet||i.kind==="chalk"?0:Yp[e]??Yp.faint}function Iy(i,t){let e=To(i),n=To(t);if(e.some(([r,o])=>gi(n,r,o))||n.some(([r,o])=>gi(e,r,o)))return 0;let s=1/0;for(let[r,o]of e)s=Math.min(s,Iu(n,r,o));for(let[r,o]of n)s=Math.min(s,Iu(e,r,o));return s}function Kp(i,{touch:t=.035}={}){let e=i.filter(a=>a.kind==="area"),n=new Set(e.map(a=>a.id)),s=new Map,r=(a,l)=>{if(a===l||!n.has(a)||!n.has(l))return;let[c,h]=a<l?[a,l]:[l,a];s.set(`${c}|${h}`,{a:c,b:h})};if(e.some(a=>Array.isArray(a.near)&&a.near.length))for(let a of e)for(let l of a.near??[])r(a.id,l);else for(let a=0;a<e.length;a++)for(let l=a+1;l<e.length;l++)Iy(e[a],e[l])<=t&&r(e[a].id,e[l].id);return[...s.values()].sort((a,l)=>a.a+a.b<l.a+l.b?-1:1)}function Du(i,t,{w:e=180,deep:n=160,most:s=24}={}){let r=To(i),o=r.map(g=>t.standing(g)).filter(Boolean);if(o.length<3)return[];let a=o.map(g=>g.X),l=o.map(g=>g.Z),[c,h,d,u]=[Math.min(...a),Math.max(...a),Math.max(bo,Math.min(...l)),Math.max(...l)],f=t.standing(ku(r))??{X:(c+h)/2,Z:(d+u)/2},x=[];for(let g=u-n/2;g>=d;g-=n)for(let p=c+e/2;p<=h;p+=e){let m=t.fractionOf(p,g);gi(r,m[0],m[1])&&x.push({X:p,Z:g})}return x.sort((g,p)=>Math.hypot(g.X-f.X,(g.Z-f.Z)*.8)-Math.hypot(p.X-f.X,(p.Z-f.Z)*.8)),x.slice(0,s)}function Jp(i,t){let e=[];for(let[n,s]of t){let r=i.get(n)??new Set;for(let o of s)r.has(o)||e.push({type:"zone",card:n,zone:o,entered:!0})}for(let[n,s]of i){let r=t.get(n)??new Set;for(let o of s)r.has(o)||e.push({type:"zone",card:n,zone:o,entered:!1})}return e}function Qp(i,t){let e=[],n=[];for(let s of i){let r=(t.place??t.standing)(s.at);if(!r){n.push(s.id);continue}e.push({...s,X:r.X,Z:r.Z})}return{marks:e,dropped:n}}function tm(i,t){return i.filter(e=>(t.get(e.id)?.size??0)<e.capacity)}function Nu(i,t,e){return Math.hypot(i-e.X,(t-e.Z)*.75)}function Ou(i,t,e,n,s){let r=null,o=1/0;for(let a of tm(i,t)){let l=Nu(e,n,a);l<o&&l<=s&&(r=a,o=l)}return r}function em(i,t,e,n,{show:s=700,snap:r=170,max:o=5}={}){let a=tm(i,t).map(c=>({mark:c,d:Nu(e,n,c)})).filter(c=>c.d<=s).sort((c,h)=>c.d-h.d).slice(0,o),l=a.length&&a[0].d<=r?a[0].mark.id:null;return a.map(c=>{let h=1-Math.min(1,Math.max(0,(c.d-r)/(s-r))),d=c.mark.id===l?1:.18+.5*h*h;return{id:c.mark.id,mark:c.mark,distance:c.d,alpha:d,target:c.mark.id===l}})}function Qa(i,t={}){let e=i.yaw,n=i.faces;if(n){let s=null;if(n.point&&t.pointOnFloor)s=t.pointOnFloor(n.point);else if(n.zone&&t.zones&&t.pointOnFloor){let r=t.zones.find(o=>o.id===n.zone);r&&(s=t.pointOnFloor(ku(r.shape)))}else n.card&&t.cardAt&&(s=t.cardAt(n.card));s&&(e=Sn(bn(i.X,i.Z,s.X,s.Z)))}return{yaw:e,lean:i.lean,pitch:i.pitch,lift:i.lift}}function tl(i,t){let e=new Map,n=[],s=new Set(t.map(o=>o.id)),r=new Map(t.map(o=>[o.id,o]));for(;;){let o=null;for(let a of s){let l=r.get(a);for(let c of i){if((e.get(c.id)??0)>=c.capacity)continue;let h=Nu(l.X,l.Z,c);(!o||h<o.d)&&(o={d:h,c:l,m:c})}}if(!o)break;e.set(o.m.id,(e.get(o.m.id)??0)+1),s.delete(o.c.id),n.push({card:o.c.id,mark:o.m.id})}return n}var nm=(i,t,e)=>Math.max(t,Math.min(e,i)),ys=Object.freeze({walk:{speed:520,stride:110,height:12,rock:3.5,turn:.7},stroll:{speed:300,stride:90,height:8,rock:2.6,turn:.6},hurry:{speed:880,stride:135,height:15,rock:5,turn:.8},march:{speed:600,stride:120,height:10,rock:1.2,turn:.5},sneak:{speed:230,stride:70,height:4,rock:1.5,turn:.75},scurry:{speed:1150,stride:42,height:5,rock:7,turn:.9},hop:{speed:640,stride:170,height:48,rock:2,turn:.6},glide:{speed:380,stride:0,height:0,rock:0,turn:.4}}),im=Object.freeze(Object.keys(ys)),Eo=(i,t)=>Math.hypot(t.X-i.X,(t.Z-i.Z)*.8);function _s(i,t,{t0:e=0,gait:n="walk",yaw:s=null,pace:r=1,minDur:o=.3,maxDur:a=6}={}){let l=ys[n]?n:"walk",c=ys[l],h=Eo(i,t),d=nm(h/(c.speed*Math.max(.1,r)),o,a),u=c.stride>0&&h>c.stride*.6?Math.max(1,Math.round(h/c.stride)):0;return{from:{X:i.X,Z:i.Z},to:{X:t.X,Z:t.Z},t0:e,dur:d,gait:l,steps:u,yaw:s??null,dist:h}}function ky(i){if(i<=0)return 0;if(i>=1)return 1;let e=1/(1-.18);return i<.18?e*i*i/(2*.18):i>1-.18?1-e*(1-i)*(1-i)/(2*.18):e*(i-.18/2)}function Ao(i,t){let e=i.dur>0?nm((t-i.t0)/i.dur,0,1):1,n=ky(e),s=i.from.X+(i.to.X-i.from.X)*n,r=i.from.Z+(i.to.Z-i.from.Z)*n,o=ys[i.gait]??ys.walk,a=0,l=0;if(i.steps>0&&e>0&&e<1){let u=n*i.steps%1,f=Math.min(1,e*6,(1-e)*6);a=o.height*Math.sin(u*Math.PI)*f,l=o.rock*Math.sin(u*Math.PI*2)*f*Math.sign(i.to.X-i.from.X||1)}let c=e>0&&e<.86&&i.dist>30,h=Sn(bn(i.from.X,i.from.Z,i.to.X,i.to.Z),{share:o.turn,max:40}),d=e<=0?null:c||i.yaw===null?h:i.yaw;return{X:s,Z:r,lift:a,rock:l,yaw:d,u:e,moving:e>0&&e<1,done:e>=1}}function sm(i,t,e){return i==="left"?{X:e.x[0]-160,Z:t.Z}:i==="right"?{X:e.x[1]+160,Z:t.Z}:i==="back"?{X:t.X*.6,Z:e.z[0]}:{X:t.X,Z:t.Z}}var Fu=Object.freeze(["still","wander","visit","patrol","pace","swarm"]),Ly=Object.freeze({wander:{every:11,restless:.55,radius:.05,gait:"stroll"},visit:{every:14,restless:.75,gait:"walk"},patrol:{every:9,restless:1,gait:"march"},pace:{every:5,restless:.85,width:.05,gait:"walk"},swarm:{every:2.6,restless:.8,radius:.035,gait:"scurry"}}),zi=i=>typeof i=="number"&&Number.isFinite(i),Uu=i=>Array.isArray(i)&&i.length===2&&zi(i[0])&&zi(i[1]);function Bu(i){if(!i||typeof i!="object"||!Fu.includes(i.kind)||i.kind==="still")return null;let t=Ly[i.kind],e={kind:i.kind,every:Math.max(1.5,zi(i.every)?i.every:t.every),restless:Math.max(0,Math.min(1,zi(i.restless)?i.restless:t.restless)),gait:ys[i.gait]?i.gait:t.gait,radius:Math.max(.005,Math.min(.3,zi(i.radius)?i.radius:t.radius??.05)),width:Math.max(.01,Math.min(.4,zi(i.width)?i.width:t.width??.05)),spots:Array.isArray(i.spots)?i.spots.filter(Uu).map(n=>[n[0],n[1]]):[],marks:Array.isArray(i.marks)?i.marks.filter(n=>typeof n=="string"):[],path:Array.isArray(i.path)?i.path.filter(Uu).map(n=>[n[0],n[1]]):[],loop:i.loop===!0,faces:Uu(i.faces)?[i.faces[0],i.faces[1]]:null,facesCard:typeof i.faces=="string"&&i.faces?i.faces:null,gestures:Array.isArray(i.gestures)?i.gestures.filter(n=>["hop","nod","bow","shake"].includes(n)):[],gestureChance:Math.max(0,Math.min(1,zi(i.gestureChance)?i.gestureChance:.35)),yaw:zi(i.yaw)?i.yaw:null};return e.kind==="visit"&&e.spots.length+e.marks.length===0||e.kind==="patrol"&&e.path.length<2?null:e}function zu(i,{home:t,rig:e,marks:n=[],seed:s=1}){if(!i)return null;let r=h=>(e.place??e.standing)(h),o=e.fractionOf(t.X,t.Z),a=h=>{let d=e.standing([o[0]-h/2,o[1]]),u=e.standing([o[0]+h/2,o[1]]);return d&&u?Math.abs(u.X-d.X):120},l=i.faces?r(i.faces):null,c={...i,home:{X:t.X,Z:t.Z},seed:s,places:[],faceAt:l};if(i.kind==="visit"){let h=i.marks.map(u=>n.find(f=>f.id===u)).filter(Boolean).map(u=>({X:u.X,Z:u.Z,yaw:u.yaw??null})),d=i.spots.map(r).filter(Boolean).map(u=>({X:u.X,Z:u.Z,yaw:null}));if(c.places=[{X:t.X,Z:t.Z,yaw:null},...h,...d],c.places.length<2)return null}else if(i.kind==="patrol"){if(c.places=i.path.map(r).filter(Boolean).map(h=>({X:h.X,Z:h.Z,yaw:null})),c.places.length<2)return null}else i.kind==="pace"?c.reach=a(i.width):c.reach=a(i.radius);return c}function In(i,t,e=0){return Np((i*2654435761^t*97+e*7919)>>>0)()}var Dy=16;function rm(i,t){if(t<=0)return{X:i.home.X,Z:i.home.Z,yaw:i.yaw};if(i.kind==="patrol"){let r=i.places.length,o=i.loop?t%r:Ny(t,r);return{...i.places[o],yaw:i.places[o].yaw??null}}let e=t;for(let r=0;e>0&&In(i.seed,e,1)>=i.restless;r++){if(r>=Dy)return{X:i.home.X,Z:i.home.Z,yaw:i.yaw};e--}if(e<=0)return{X:i.home.X,Z:i.home.Z,yaw:i.yaw};if(i.kind==="visit"){let r=Math.floor(In(i.seed,e,2)*i.places.length);return{...i.places[r],yaw:i.places[r].yaw??null}}if(i.kind==="pace"){let r=(e%2===0?-1:1)*(.35+.15*In(i.seed,e,3));return{X:i.home.X+r*i.reach,Z:i.home.Z+(In(i.seed,e,4)-.5)*i.reach*.2,yaw:null}}let n=In(i.seed,e,5)*Math.PI*2,s=Math.sqrt(In(i.seed,e,6))*i.reach/2;return{X:i.home.X+Math.cos(n)*s,Z:i.home.Z+Math.sin(n)*s*.7,yaw:null}}function Ny(i,t){let e=2*(t-1),n=i%e;return n<t?n:e-n}function Oy(i,t){return i.every*(.1+.4*In(i.seed,t,8))}function om(i,t){if(!i.gestures?.length)return null;let e=In(i.seed,0,9)*i.every,n=Math.floor((t+e)/i.every);if(In(i.seed,n,12)>=i.gestureChance)return null;let s=i.gestures[Math.floor(In(i.seed,n,13)*i.gestures.length)],r=n*i.every-e+i.every*(.93+.05*In(i.seed,n,14));return{beat:n,at:r,verb:s}}function el(i,t){let e=In(i.seed,0,9)*i.every,n=t+e,s=Math.floor(n/i.every),r=n-s*i.every,o=rm(i,s-1),a=rm(i,s),l=u=>i.faceAt?Sn(bn(u.X,u.Z,i.faceAt.X,i.faceAt.Z),{share:.7,max:50}):u.yaw??null;if(Math.abs(a.X-o.X)+Math.abs(a.Z-o.Z)<.5)return{X:a.X,Z:a.Z,yaw:l(a),lift:0,rock:0,moving:!1};let c=Oy(i,s),h=_s(o,a,{t0:c,gait:i.gait,yaw:l(a),maxDur:Math.max(.4,(i.every-c)*.92)}),d=Ao(h,r);return d.moving?{X:d.X,Z:d.Z,yaw:d.yaw,lift:d.lift,rock:d.rock,moving:!0}:{X:d.X,Z:d.Z,yaw:r<c?l(o):l(a),lift:0,rock:0,moving:!1}}var nl=Object.freeze(["line","huddle","talk","gangup","panel","standoff","circle","queue","scatter","audience","position"]),kT=Math.PI/180,am=(i,t,e)=>Math.max(t,Math.min(e,i)),er=i=>Math.round(i*10)/10,Uy=(i,t=180)=>Math.max(t*.5,...i.map(e=>e.w??t)),ti=(i,t,e,n,s=.7,r=52)=>Sn(bn(i,t,e,n),{share:s,max:r});function lm(i,{cards:t=[],focus:e={X:0,Z:-400},target:n=null,speakers:s=[],party:r=!1,limits:o=null,seed:a=1,dir:l="back",radius:c=null}={}){let h=t.filter(f=>r||!f.pc||f.id===n||s.includes(f.id));if(!h.length)return[];let d=Uy(h),u;switch(i){case"huddle":u=Hy(h,e,d,c);break;case"talk":u=Gy(h,e,d,s);break;case"gangup":u=Vy(h,e,d,n);break;case"panel":u=Wy(h,e,d);break;case"standoff":u=Xy(h,e,d);break;case"circle":u=$y(h,e,d,c);break;case"queue":u=Zy(h,e,d,a,l);break;case"scatter":u=qy(h,e,d,o,a);break;case"audience":u=By(h,e,d,o);break;default:u=Fy(h,e,d)}return u.map(f=>({id:f.id,X:er(o?am(f.X,o.x[0],o.x[1]):f.X),Z:er(o?am(f.Z,o.z[0],o.z[1]):f.Z),yaw:er(f.yaw??0),lean:er(f.lean??0),pitch:er(f.pitch??0)}))}var Bn=i=>[...i].sort((t,e)=>t.X-e.X||(t.id<e.id?-1:1));function Fy(i,t,e){let n=[],s=[i.filter(o=>!o.pc),i.filter(o=>o.pc)],r=s[0].length?220:0;return s.forEach((o,a)=>{let l=Bn(o),c=e*1.12;l.forEach((h,d)=>n.push({id:h.id,X:t.X+(d-(l.length-1)/2)*c,Z:t.Z+a*r,yaw:0}))}),n}function By(i,t,e,n){let s=Bn(i),r=n?n.z[1]:t.Z+600,o=Math.max(t.Z+280,r-Math.max(150,(r-t.Z)*.2)),a=Math.ceil(s.length/2),l=[s.slice(0,a).reverse(),s.slice(a)],c=[];return l.forEach((h,d)=>{let u=d===0?-1:1;h.forEach((f,x)=>{let g=t.X+u*(e*.95+x*e*1.15),p=o-x*45;c.push({id:f.id,X:g,Z:p,yaw:ti(g,p,t.X,t.Z,.6,40),pitch:-2})})}),c}var zy=.86;function Hy(i,t,e,n=null){let s=Bn(i),r=s.length,o=Math.max(e*zy*(r-1),(n??0)*2),a=Math.min(260,90+32*r);return s.map((l,c)=>{let h=r>1?(c-(r-1)/2)/((r-1)/2):0,d=t.X+h*o/2,u=t.Z-a*(1-h*h)*.9-40,f=ti(d,u,t.X,t.Z+140,.8,50);return{id:l.id,X:d,Z:u,yaw:f,lean:-h*9,pitch:6}})}function Gy(i,t,e,n){let s=n.filter(u=>i.some(f=>f.id===u)),r=Bn(i.filter(u=>!s.includes(u.id)));for(;s.length<2&&r.length;)s.push(r.shift().id);let[o,a]=s,l=e*.78,c=[],h={X:t.X-l,Z:t.Z},d={X:t.X+l,Z:t.Z};return o&&c.push({id:o,X:h.X,Z:h.Z,yaw:ti(h.X,h.Z,d.X,d.Z,.85,58),lean:2}),a&&c.push({id:a,X:d.X,Z:d.Z,yaw:ti(d.X,d.Z,h.X,h.Z,.85,58),lean:-2}),r.forEach((u,f)=>{let x=f%2===0?-1:1,g=Math.floor(f/2)+1,p=t.X+x*(l+e*(.55+g*.95)),m=t.Z-120-g*60;c.push({id:u.id,X:p,Z:m,yaw:ti(p,m,t.X,t.Z,.6,40)})}),c}function Vy(i,t,e,n){let s=i.find(l=>l.id===n)??null,r=Bn(i.filter(l=>l!==s)),o=[];s&&o.push({id:s.id,X:t.X,Z:t.Z+60,yaw:0,pitch:3});let a=Math.ceil(r.length/2);return[r.slice(0,a).reverse(),r.slice(a)].forEach((l,c)=>{let h=c===0?-1:1;l.forEach((d,u)=>{let f=t.X+h*e*(.95+u*.95),x=t.Z-90+u*55;o.push({id:d.id,X:f,Z:x,yaw:ti(f,x,t.X,t.Z+60,.8,55),lean:-h*7,pitch:5})})}),o}function Wy(i,t,e){let n=Bn(i.filter(o=>!o.pc)),s=n.length,r=n.map((o,a)=>{let l=s>1?(a-(s-1)/2)/((s-1)/2):0,c=t.X+l*((s-1)/2)*e*1.1,h=t.Z-160+90*l*l;return{id:o.id,X:c,Z:h,yaw:er(-l*14),pitch:-2}});return Bn(i.filter(o=>o.pc)).forEach((o,a,l)=>{let c=t.X+(a-(l.length-1)/2)*e*1.1;r.push({id:o.id,X:c,Z:t.Z+260,yaw:0})}),r}function Xy(i,t,e){let n=Bn(i.filter(o=>!o.pc)),s=Bn(i.filter(o=>o.pc));if(!s.length){let o=Math.ceil(n.length/2);s=n.slice(o),n=n.slice(0,o)}if(!n.length){let o=Math.ceil(s.length/2);n=s.slice(0,o),s=s.slice(o)}let r=Bp({x:t.X,z:t.Z},n,s,{gap:e*2.2,spread:e*1.35,depthStep:70});return[...n,...s].map((o,a)=>({id:o.id,X:r[a].x,Z:r[a].z,yaw:r[a].yaw,lean:r[a].lean,pitch:r[a].pitch}))}function $y(i,t,e,n=null){let s=Bn(i),r=s.length,o=Math.max(n??0,e*.75,e*1.02*(r-1)/2);return s.map((a,l)=>{let c=r>1?(l-(r-1)/2)/((r-1)/2):0,h=t.X+c*o,d=t.Z-Math.sqrt(Math.max(0,1-c*c))*o*.7;return{id:a.id,X:h,Z:d,yaw:ti(h,d,t.X,t.Z,.75,55)}})}function Zy(i,t,e,n,s="back"){let r=s==="left"||s==="right",o=s==="left"?-1:1,a=c=>r?-Math.abs(c.X-t.X):s==="front"?-c.Z:c.Z;return[...i].sort((c,h)=>a(h)-a(c)||(c.id<h.id?-1:1)).map((c,h)=>{let d=Math.sin((h+1)*2.399+n),u,f;r?(u=t.X+o*h*e*1.08,f=t.Z+d*26-h*8):(u=t.X+d*e*.12+h*e*.42,f=t.Z+(s==="front"?1:-1)*h*175);let x=h===0?ti(u,f,t.X,t.Z-300,.55,38):ti(u,f,t.X,t.Z,.55,38);return{id:c.id,X:u,Z:f,yaw:x,pitch:h===0?0:2}})}function qy(i,t,e,n,s){let r=Bn(i),o=r.length,a=n?[n.x[0]*.7,n.x[1]*.7]:[t.X-e*o*.8,t.X+e*o*.8];return r.map((l,c)=>{let h=o>1?c/(o-1):.5,d=a[0]+(a[1]-a[0])*h,u=t.Z+Math.sin((c+1)*1.7+s)*260;return{id:l.id,X:d,Z:u,yaw:ti(d,u,t.X,t.Z,.5,40)}})}function il(i,{X:t,Z:e,w:n,h:s,lift:r=0}){let o=i.screenOf(t-n/2,r,e),a=i.screenOf(t+n/2,r+s,e);return{x0:o.x,x1:a.x,y0:a.y,y1:o.y}}function Yy(i,t,{across:e=12,down:n=20}={}){let s=t.map(o=>({id:o.id,Z:o.Z,...il(i,o)})),r=new Map;for(let o of s){let a=s.filter(h=>h!==o&&(h.Z>o.Z||h.Z===o.Z&&h.id>o.id)&&h.x0<o.x1&&h.x1>o.x0&&h.y0<o.y1&&h.y1>o.y0),l=0,c=new Set;for(let h=0;h<e;h++)for(let d=0;d<n;d++){let u=o.x0+(h+.5)/e*(o.x1-o.x0),f=o.y0+(d+.5)/n*(o.y1-o.y0),x=a.find(g=>u>=g.x0&&u<=g.x1&&f>=g.y0&&f<=g.y1);x&&(l++,c.add(x.id))}r.set(o.id,{hidden:l/(e*n),by:[...c]})}return r}function cm(i,t,{across:e=12,down:n=20}={}){if(!t?.length)return 0;let s=(o,a)=>t.some(l=>l.rect?o>=l.rect[0]&&o<=l.rect[2]&&a>=l.rect[1]&&a<=l.rect[3]:l.circle?(o-l.circle[0])**2+(a-l.circle[1])**2<=l.circle[2]**2:!1),r=0;for(let o=0;o<e;o++)for(let a=0;a<n;a++)s(i.x0+(o+.5)/e*(i.x1-i.x0),i.y0+(a+.5)/n*(i.y1-i.y0))&&r++;return r/(e*n)}var sl=44,rl=.4;function ol(i,t,e,n){let s=new Uint8Array(t*e),r=i.length;for(let l=0;l<e;l++){let c=l+.5,h=[];for(let d=0,u=r-1;d<r;u=d++){let[f,x]=i[d],[g,p]=i[u];x>c!=p>c&&h.push(f+(c-x)/(p-x)*(g-f))}h.sort((d,u)=>d-u);for(let d=0;d+1<h.length;d+=2){let u=Math.max(0,Math.ceil(h[d]-.5)),f=Math.min(t-1,Math.floor(h[d+1]-.5));for(let x=u;x<=f;x++)s[l*t+x]=1}}let o=new Uint8ClampedArray(t*e),a=l=>l*l*(3-2*l);for(let l=0;l<t;l++){let c=-1;for(let h=0;h<e;h++){if(!s[h*t+l])continue;c<0&&(c=h);let d=h-c+.5;o[h*t+l]=Math.round(255*(n>0?a(Math.min(1,d/n)):1))}}return o}function hm(i,t,e,{most:n=.15,iterations:s=80,limits:r=null}={}){let o=t.map(l=>({...l})),a=new Map(o.map(l=>[l.id,l]));for(let l=0;l<s;l++){let c=Yy(i,o),h=!1;for(let d of o){let u=c.get(d.id);if(!(u.hidden<=n-.01))for(let f of u.by){let x=a.get(f),g=e.has(d.id),p=e.has(x.id);if(!g&&!p)continue;let m=d.X!==x.X?Math.sign(d.X-x.X):d.id<x.id?-1:1,v=Math.max(d.w,x.w)*.05;g&&p?(d.X+=m*v/2,x.X-=m*v/2):g?d.X+=m*v:x.X-=m*v,h=!0}}if(r)for(let d of o)e.has(d.id)&&(d.X=Math.max(r[0],Math.min(r[1],d.X)));if(!h)break}return o}var Mi="#241a0f",Qe="#f2e8cc",ll="#dbcca2",nr="#fffaee",xi="#c39a4e",vs="#ead08e",_i="#b04a32",cl="#dd977f",ei="#9cc8c2",Wu="#5f8e8b",ir="#677a7c",NT=Object.freeze({INK:Mi,PAPER:Qe,SHADE:ll,GLINT:nr,BRASS:xi,GILT:vs,LACQUER:_i,ROSE:cl,SEA:ei,DEEP:Wu,SLATE:ir}),jy=2.2,Ky="1.4 2.4",Jy="1.7 1.3",Qy="2.6 2.1",mn=Math.PI/180,st=i=>String(Math.round(i*10)/10),Ee=([i,t])=>`${st(i)} ${st(t)}`;function Ms({s:i=1,r:t=0,dx:e=0,dy:n=0}={}){let s=Math.cos(t*mn),r=Math.sin(t*mn),o=([a,l])=>{let c=(a-50)*i,h=(l-50)*i;return[50+e+c*s-h*r,50+n+c*r+h*s]};return o.s=i,o}var vm=Ms();function t_(i,t){let e=[],n=t.match(/[MLQCZ]|-?\d*\.?\d+/g);for(let s=0;s<n.length;s++)/[MLQCZ]/.test(n[s])?e.push(n[s]):(e.push(Ee(i([Number(n[s]),Number(n[s+1])]))),s++);return e.join(" ").replace(/([MLQC]) /g,"$1")}function Io(i,t,e,n,s,r=s,o=r,a=16){let l=[],c=[];for(let h=0;h<=a;h++){let d=h/a,u=1-d,f=u*u*u*i[0]+3*u*u*d*t[0]+3*u*d*d*e[0]+d*d*d*n[0],x=u*u*u*i[1]+3*u*u*d*t[1]+3*u*d*d*e[1]+d*d*d*n[1],g=3*u*u*(t[0]-i[0])+6*u*d*(e[0]-t[0])+3*d*d*(n[0]-e[0]),p=3*u*u*(t[1]-i[1])+6*u*d*(e[1]-t[1])+3*d*d*(n[1]-e[1]);Math.hypot(g,p)<1e-6&&(g=n[0]-i[0],p=n[1]-i[1]);let m=Math.hypot(g,p)||1,v=(s*u+o*d+(r-(s+o)/2)*4*d*u)/2;l.push([f-p/m*v,x+g/m*v]),c.push([f+p/m*v,x-g/m*v])}return`M${Ee(l[0])} L${l.slice(1).map(Ee).join(" L")} A${st(o/2)} ${st(o/2)} 0 0 0 ${Ee(c[a])} L${c.slice(0,a).reverse().map(Ee).join(" L")} A${st(s/2)} ${st(s/2)} 0 0 0 ${Ee(l[0])} Z`}var hl=(i,t,e)=>[i[0]+(t[0]-i[0])*e,i[1]+(t[1]-i[1])*e],Ie=(i,t,e,n,s)=>Io(i,hl(i,t,1/3),hl(i,t,2/3),t,e,n,s),Ro=(i,t,e,n,s,r)=>Io(i,hl(i,t,2/3),hl(e,t,2/3),e,n,s,r);function we([i,t],e){return`M${st(i-e)} ${st(t)} A${st(e)} ${st(e)} 0 1 0 ${st(i+e)} ${st(t)} A${st(e)} ${st(e)} 0 1 0 ${st(i-e)} ${st(t)} Z`}function yi([i,t],e,n,s=0){let r=Math.cos(s*mn),o=Math.sin(s*mn),a=[i+e*r,t+e*o],l=[i-e*r,t-e*o];return`M${Ee(a)} A${st(e)} ${st(n)} ${st(s)} 1 0 ${Ee(l)} A${st(e)} ${st(n)} ${st(s)} 1 0 ${Ee(a)} Z`}var e_=i=>`M${Ee(i[0])} L${i.slice(1).map(Ee).join(" L")}`;function Co([i,t],e,n,s,r=-90){let o=[],a=Math.ceil(s*28);for(let l=0;l<=a;l++){let c=l/a,h=(r+c*s*360)*mn,d=e+(n-e)*c;o.push([i+d*Math.cos(h),t+d*Math.sin(h)])}return e_(o)}function Hi([i,t],e,n=.14){let s=e*n;return`M${st(i)} ${st(t-e)} Q${st(i+s)} ${st(t-s)} ${st(i+e)} ${st(t)} Q${st(i+s)} ${st(t+s)} ${st(i)} ${st(t+e)} Q${st(i-s)} ${st(t+s)} ${st(i-e)} ${st(t)} Q${st(i-s)} ${st(t-s)} ${st(i)} ${st(t-e)} Z`}var Ut=i=>({d:i,fill:Mi}),At=(i,t=4,e=Mi)=>({d:i,stroke:e,w:t}),Kt=(i,t,e=3)=>({d:i,fill:t,stroke:Mi,w:e}),vi=(i,t,e)=>({d:i,fill:t,opacity:e}),Te=i=>({...i,inner:!0}),um=i=>[`d="${i.d}"`,`fill="${i.fill??"none"}"`,i.stroke?`stroke="${i.stroke}" stroke-width="${st(i.w)}" stroke-linecap="round" stroke-linejoin="round"`:"",i.dash?`stroke-dasharray="${i.dash}"`:"",i.opacity!=null?`opacity="${i.opacity}"`:""].filter(Boolean).join(" ");function Hu(i,t,e){let n=(i.stroke?i.w:0)+e*2,s=i.fill?t:"none",r=n>0?` stroke="${t}" stroke-width="${st(n)}" stroke-linecap="round" stroke-linejoin="round"`:"";return`<path d="${i.d}" fill="${s}"${r}/>`}function Ue(i,{echo:t=null,shadow:e=!0,key:n=jy}={}){let s=i.filter(h=>!h.inner),r=s.filter(h=>!h.bare).map(h=>Hu(h,Qe,n)).join(""),o=e?`<g opacity=".26" transform="translate(${Ky})">${s.map(h=>Hu(h,Mi,0)).join("")}</g>`:"",a=s.filter(h=>h.fill===Mi||!h.fill&&h.stroke===Mi),l=t?`<g transform="translate(${Qy})">${a.map(h=>Hu(h,t,0)).join("")}</g>`:"",c=i.map(h=>h.fill&&h.fill!==Mi&&h.fill!==Qe&&h.stroke===Mi?`<path d="${h.d}" fill="${h.fill}" transform="translate(${Jy})"/><path ${um({...h,fill:void 0})}/>`:`<path ${um(h)}/>`).join("");return`<svg viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">${r}${o}${l}${c}</svg>`}var dm=(i=vm)=>[Ut(Io(i([53,12]),i([53.5,28]),i([51.5,44]),i([50,59]),15*i.s,11.5*i.s,4.6*i.s)),Ut(we(i([49.6,75.5]),7.2*i.s))],fm=(i=vm)=>[Ut(Io(i([31,32]),i([29,8]),i([71,4]),i([69,28]),5.4*i.s,11.5*i.s,11*i.s)),Ut(Io(i([69,28]),i([67.5,42]),i([53,43]),i([52,59]),11*i.s,9.6*i.s,4.6*i.s)),Ut(we(i([51.6,75.5]),7.2*i.s))],Gu=([i,t],e)=>{let n=e*.24;return[Ut(Ie([i,t],[i+e,t-e*.06],n*.7,n*.9,n)),Ut(Ie([i+e,t-e*.06],[i+e*.04,t+e],n,n*.8,n*.9)),Ut(Ie([i+e*.04,t+e],[i+e*1.08,t+e*.96],n*.9,n,n*.6))]},kn={cx:52,cy:44,rx:40,ry:33},Po=(i,t=0)=>[kn.cx+(kn.rx-t)*Math.cos(i*mn),kn.cy+(kn.ry-t)*Math.sin(i*mn)];function n_(){let i=Po(114),t=Po(146);return`M${Ee(i)} A${kn.rx} ${kn.ry} 0 1 0 ${Ee(t)} Q20 76 9 93 Q30 84 ${Ee(i)} Z`}function i_(){let i=Po(24,1.8),t=Po(108,1.8);return`M${Ee(i)} A${st(kn.rx-1.8)} ${st(kn.ry-1.8)} 0 0 1 ${Ee(t)} Q${Ee(Po(66,10))} ${Ee(i)} Z`}var pm=(i,t=3)=>kn.cy-(kn.ry-t)*Math.sqrt(Math.max(0,1-((i-kn.cx)/(kn.rx-t))**2)),Xu=(i={})=>[{...Kt(n_(),Qe,3.2),bare:!0,...i},Te(vi(i_(),ll,.75))],zn=(i,t=[])=>Ue([...Xu(),...i.map(Te),...t]),mm=(i=10)=>[At(`M31 ${st(40+i/4)} Q37.5 ${st(40-i*.85)} 44 ${st(40+i/4)}`,4.4),At(`M60 ${st(40+i/4)} Q66.5 ${st(40-i*.85)} 73 ${st(40+i/4)}`,4.4)],s_=(i=38,t=0)=>[At(`M29 ${st(i-t)} L46 ${st(i+t)}`,4.2),At(`M58 ${st(i+t)} L75 ${st(i-t)}`,4.2)],gm=(i=38,t=0)=>[Ut(`M${st(33+t)} ${i} A4.6 4.6 0 0 0 ${st(42.2+t)} ${i} Z`),Ut(`M${st(62+t)} ${i} A4.6 4.6 0 0 0 ${st(71.2+t)} ${i} Z`)],xm=(i=.85)=>[vi(yi([29,52],7,4),cl,i),vi(yi([75,52],7,4),cl,i)],ym=i=>[-5,0,5].map(t=>At(`M${st(i+t-2.4)} 55.5 L${st(i+t+2.4)} 48.5`,1.8,_i)),r_=(i,t,e)=>`M${i} ${t} Q${st(i-12*e)} ${st(t)} ${st(i-12*e)} ${st(t-10*e)} Q${st(i-12*e)} ${st(t-21*e)} ${st(i+1*e)} ${st(t-21*e)} Q${st(i+4*e)} ${st(t-32*e)} ${st(i+18*e)} ${st(t-30*e)} Q${st(i+30*e)} ${st(t-36*e)} ${st(i+38*e)} ${st(t-24*e)} Q${st(i+50*e)} ${st(t-24*e)} ${st(i+50*e)} ${st(t-12*e)} Q${st(i+50*e)} ${st(t)} ${st(i+38*e)} ${st(t)} Z`;function Vu([i,t],e,n,s=9){let r=Array.from({length:s},(a,l)=>{let c=(-100+l*360/s)*mn;return[i+e*Math.cos(c),t+n*Math.sin(c)]}),o=`M${Ee(r[0])}`;for(let a=0;a<s;a++){let l=r[(a+1)%s],c=Math.hypot(l[0]-r[a][0],l[1]-r[a][1])*.6;o+=` A${st(c)} ${st(c)} 0 0 1 ${Ee(l)}`}return`${o} Z`}function o_([i,t],e,n,s=1.12){let r=c=>[i+e*Math.cos(c*mn),t+e*Math.sin(c*mn)],a=e*Math.sin(Math.PI/n)*s,l=`M${Ee(r(-70))}`;for(let c=1;c<=n;c++)l+=` A${st(a)} ${st(a)} 0 1 1 ${Ee(r(-70+c*360/n))}`;return l}var a_=t_(Ms({r:-10}),"M50 84 C24 66 12 48 22 32 C31 18 46 21 50 34 C54 21 69 18 78 32 C88 48 76 66 50 84 Z"),l_="M60 8 C56 24 29 44 29 62 C29 74 39 83 50 83 C61 83 71 74 71 62 C71 46 64 24 60 8 Z",_m="M86 30 C84 36 78 41 78 46 C78 51 82 54 86 54 C90 54 94 51 94 46 C94 41 88 36 86 30 Z",al=(i,t,e,n)=>Kt(Ro(i(t),i(e),i(n),3.4,12,3.4),_i,2.4),gn=Object.freeze({laugh:{kind:"face",label:"Laughing",motion:"shake",svg:zn([...mm(12),Ut("M40 50 L64 50 C64 60 58.5 67 52 67 C45.5 67 40 60 40 50 Z"),vi("M45 62 C48 58.5 56 58.5 59 62 C56 65.5 48 65.5 45 62 Z",cl)],[Ut(Ro([88,12],[93,6],[99,4],2,4.4,1.6)),Ut(Ro([92,24],[98,22],[104,24],2,4.4,1.6))])},pleased:{kind:"face",label:"Pleased",motion:"bob",svg:zn([...mm(8),At("M43 54 Q52 62 61 54",3.8),...xm(.7)])},smug:{kind:"face",label:"Smug",motion:"tilt",svg:zn([At("M29 38.5 Q37.5 35.5 46 38.5",4),At("M58 38.5 Q66.5 35.5 75 38.5",4),...gm(38.5,3),At("M60 27 Q67 23 74 26",3.2),At("M41 55 Q46.5 61 52 55 Q57.5 61 63 55",3.6)],[Kt(Hi([92,10],9),vs,2)])},blush:{kind:"face",label:"Flustered",motion:"pulse",svg:zn([...xm(.95),...ym(29),...ym(75),At("M31 30 Q36.5 27 42 30",3),At("M62 30 Q67.5 27 73 30",3),Ut(we([37.5,40],3.6)),Ut(we([66.5,40],3.6)),At("M45 58 Q48.5 54.5 52 58 Q55.5 61.5 59 58",3.4)])},determined:{kind:"face",label:"Fired up",motion:"pulse",svg:zn([Ut(Ie([27,27],[45,34.5],3.2,6.4,5.4)),Ut(Ie([77,27],[59,34.5],3.2,6.4,5.4)),Ut(yi([37.5,43],4.4,6.2)),Ut(yi([66.5,43],4.4,6.2)),vi(we([39,40.6],1.6),nr),vi(we([68,40.6],1.6),nr),At("M42 59 Q52 55 62 59",3.8)],[Kt(Hi([92,11],10.5),vs,2.2),Kt(Hi([98.5,30],5),Qe,1.8)])},deadpan:{kind:"face",label:"Unimpressed",motion:"still",svg:zn([...s_(38),...gm(38),At("M45 58 L59 58",3.6)])},wince:{kind:"face",label:"Argh!",motion:"shake",svg:zn([At("M30 33 L43 40 L30 47",4.4),At("M74 33 L61 40 L74 47",4.4),Kt("M41 52 L63 52 Q66 52 66 55 L66 61 Q66 64 63 64 L41 64 Q38 64 38 61 L38 55 Q38 52 41 52 Z",Qe,3),At("M39 58 L65 58",1.8),At("M45.5 52.5 L45.5 63.5",1.6),At("M52 52.5 L52 63.5",1.6),At("M58.5 52.5 L58.5 63.5",1.6)],[Kt(_m,ei,2.4)])},tear:{kind:"face",label:"Tears",motion:"bob",svg:zn([Ut("M45.5 55 Q52 51 58.5 55 Q59 61 52 61.5 Q45 61 45.5 55 Z")],[Kt("M34.6 39 L40.4 39 C41 50 39.6 60 41.6 70 C43 77 43.6 82 41.6 85.5 Q37.4 89 33.2 85.5 C31.2 82 32.8 77 33.6 70 C34.8 60 34 50 34.6 39 Z",ei,2.2),Kt("M63.6 39 L69.4 39 C70 50 68.6 60 70.6 70 C72 77 72.6 82 70.6 85.5 Q66.4 89 62.2 85.5 C60.2 82 61.8 77 62.6 70 C63.8 60 63 50 63.6 39 Z",ei,2.2),Kt(we([27,94],2.6),ei,1.8),Kt(we([77,95],2.6),ei,1.8),At("M30 36.5 L45 36.5",4.4),At("M59 36.5 L74 36.5",4.4)])},shiver:{kind:"face",label:"Shiver",motion:"shake",svg:zn([...[32,42,52,62,72].map(i=>At(`M${i} ${st(pm(i)+1)} L${i} ${st(pm(i)+13-Math.abs(i-52)/6)}`,2.2,Wu)),At(we([37.5,42],5.4),2.8),At(we([66.5,42],5.4),2.8),Ut(we([37.5,42.5],2.1)),Ut(we([66.5,42.5],2.1)),At("M40 59 L44 55.5 L48 59 L52 55.5 L56 59 L60 55.5 L64 59",3)],[Ut(Ro([95,30],[99.5,38],[95,46],1.6,3.6,1.6)),Ut(Ro([100.5,27],[105.5,38],[100.5,49],1.6,3.4,1.6))])},dizzy:{kind:"face",label:"Dizzy",motion:"tilt",svg:zn([At(Co([37.5,40],1,8.4,2.1),3),At(Co([66.5,40],1,8.4,2.1,90),3),At("M40 59 Q44 55 48 59 Q52 63 56 59 Q60 55 64 59",3.4)],[Kt(Hi([86,5],8),vs,2),Kt(Hi([98,19],5.5),vs,1.8),Ut(we([97,4],2))])},ko:{kind:"face",label:"Out cold",motion:"tilt",svg:zn([At("M31 34 L43 46 M43 34 L31 46",4.2),At("M61 34 L73 46 M73 34 L61 46",4.2),At(yi([52,58],4.6,3.6),3.2)])},ellipsis:{kind:"balloon",label:"\u2026",motion:"bob",svg:Ue([...Xu(),...[36,52,68].map(i=>Te(Ut(we([i,45],4.4))))])},whisper:{kind:"balloon",label:"Psst",motion:"bob",svg:Ue([...Xu({dash:"6.5 4.5",w:2.8}),...[At("M26 39 L26 62",3.6),At(yi([31.5,45],5.4,6.2),3.6),At("M48 39.5 C45 36.5 39 37.5 39 41.5 C39 46.5 48 44.5 48 49.5 C48 53.5 41 54.5 38 51.5",3.6),At("M62 39.5 C59 36.5 53 37.5 53 41.5 C53 46.5 62 44.5 62 49.5 C62 53.5 55 54.5 52 51.5",3.6),At("M70 31 L70 48 C70 52.5 73.5 53 77 50.5",3.6),At("M65 39 L77 39",3.6)].map(Te)])},think:{kind:"balloon",label:"Thinking",motion:"bob",svg:Ue([{...Kt(Vu([54,38],37,27),Qe,3),bare:!0},...[40,54,68].map(i=>Te(vi(we([i,40],3.4),ir))),{...Kt(we([23,77],6.4),Qe,2.6),bare:!0},{...Kt(we([12,91],4),Qe,2.2),bare:!0}])},surprise:{kind:"mark",label:"Surprise",motion:"shake",svg:Ue([...dm(Ms({dx:-6})),Ut(Ie([68,26],[84,13],2,5,1.6)),Ut(Ie([72,44],[92,42],2,5,1.6)),Ut(Ie([68,62],[84,72],2,5,1.6))],{echo:_i,shadow:!1})},question:{kind:"mark",label:"Question",motion:"tilt",svg:Ue(fm(Ms({r:8})),{echo:xi,shadow:!1})},shock:{kind:"mark",label:"What?!",motion:"shake",svg:Ue([...dm(Ms({s:.84,dx:-18,r:-8})),...fm(Ms({s:.84,dx:16,r:10}))],{echo:_i,shadow:!1})},sweat:{kind:"mark",label:"Sweat",motion:"drip",svg:Ue([Kt(l_,ei,3.2),Te(At("M38 58 C37 66 40 72 46 75",4,nr)),Kt(_m,ei,2.4)])},anger:{kind:"mark",label:"Anger",motion:"pulse",svg:(()=>{let i=Ms({s:.92,r:-10});return Ue([al(i,[16,43],[40,41],[42,17]),al(i,[58,17],[60,41],[84,43]),al(i,[84,57],[60,59],[58,83]),al(i,[42,83],[40,59],[16,57])])})()},sparkle:{kind:"mark",label:"Sparkle",motion:"twinkle",svg:Ue([Kt(Hi([45,55],36),vs,2.6),Kt(Hi([81,19],14),Qe,2.2),Kt(Hi([18,20],8),Qe,2),Ut(we([84,64],2.6)),Ut(we([70,86],1.8))])},heart:{kind:"mark",label:"Fond",motion:"float",svg:Ue([Kt(a_,_i,3.2),Te(At("M29 37 Q30 29 37 27",4,nr)),Ut(Ie([80,20],[90,10],1.6,4.2,1.4)),Ut(Ie([86,34],[99,31],1.6,4.2,1.4)),Ut(Ie([70,12],[73,0],1.6,4,1.4))])},music:{kind:"mark",label:"Humming",motion:"float",svg:Ue([Ut(yi([30,75],9.6,7,-22)),Ut(yi([68,64],9.6,7,-22)),Ut(Ie([38.4,72],[38.4,30],3.6,3.6,3.6)),Ut(Ie([76.4,61],[76.4,19],3.6,3.6,3.6)),Ut("M36.6 24 L78.2 13 L78.2 23 L36.6 34 Z")],{echo:xi,shadow:!1})},sleep:{kind:"mark",label:"Asleep",motion:"float",svg:Ue([...Gu([14,74],13),...Gu([32,46],19),...Gu([56,8],28)],{echo:ir,shadow:!1})},gloom:{kind:"mark",label:"Gloom",motion:"fall",svg:Ue([Kt(r_(28,42,1.24),ir,3),Te(At("M22 32 Q28 28 34 32",2.4,ll)),...[[26,50,66],[38,52,80],[50,50,70],[62,52,84],[74,50,64],[44,76,92],[68,74,90]].map(([i,t,e])=>Te(At(`M${i} ${t} L${i-1.5} ${e}`,2.4,Wu)))])},idea:{kind:"mark",label:"Idea",motion:"flicker",svg:(()=>{let i=[200,240,270,300,340].map(t=>Ut(Ie([50+34*Math.cos(t*mn),42+34*Math.sin(t*mn)],[50+46*Math.cos(t*mn),42+46*Math.sin(t*mn)],4.4,3.2,1.4)));return Ue([...i,Kt("M50 16 C35 16 26 27 26 40 C26 50 31.5 55.5 36 61 L38 70 L62 70 L64 61 C68.5 55.5 74 50 74 40 C74 27 65 16 50 16 Z",vs,3.2),Te(At("M35 37 Q36 28 44 24",4,nr)),Te(At("M45 64 L45 54 C45 46 55 46 55 54 L55 64",2.2,xi)),Kt("M38 72 L62 72 L60.5 84 L39.5 84 Z",xi,3),Te(At("M39 78 L61 78",2.2)),Ut(we([50,89],3.8))])})()},fume:{kind:"mark",label:"Fuming",motion:"rise",svg:Ue([Ut(Ie([4,100],[16,84],1,2.6,3.4)),Ut(Ie([14,103],[24,91],1,2.2,2.8)),Kt(Vu([31,70],19,15.5,6),Qe,3),Te(At(Co([31,71],1.2,8.4,1.3,180),3)),Ut(Ie([42,46],[52,35],1,2.6,3.4)),Kt(Vu([70,27],26,21,7),Qe,3.2),Te(At(Co([70,28],1.4,11.8,1.35,180),3.2))])},soul:{kind:"mark",label:"Done for",motion:"rise",svg:Ue([Kt("M47 27 C47 14 59 8 69 11 C80 14 83 29 77 39 C71 49 59 52 51 60 C43 68 41 77 30 86 C31 77 34 71 32 65 C30 57 36 51 42 45 C46 39 47 34 47 27 Z",Qe,2.8),Te(At("M56 27 Q59 29.5 62 27",2.6)),Te(At("M67 25 Q70 27.5 73 25",2.6)),Te(At(yi([65.5,35],2.8,2.2),2.4)),Te(vi("M33 82 C38 76 40 70 44 64 C41 72 38 78 33 82 Z",ei,.9)),Ut(we([22,94],2.2)),Ut(we([14,101],1.5))],{echo:ei})},star:{kind:"mark",label:"Well done",motion:"pulse",svg:Ue([At(Co([50,50],2,17,1.9),3.8,_i),At(o_([50,50],27,6),3.8,_i)],{shadow:!1,key:1.3})},hand:{kind:"mark",label:"Hand up",motion:"wave",svg:Ue([Kt("M37 92 L37 61 C33 57 26 51 24 45 C22 39 27 35 31 38 L38 45 L38 22 C38 15 44 12 49.5 12.5 C55 12 59 14 60.5 18 C64.5 16 71 18.5 71 25 L71 63 C71 77 66 86 61 92 Z",Qe,3.2),Te(At("M49.5 14 L49.5 43",2.2)),Te(At("M60.5 19 L60.5 45",2.2)),Te(vi("M60 72 C66 66 70 60 70 50 L70 63 C70 72 66 80 62 86 Z",ll)),Kt("M34 88 L64 88 L64 98 L34 98 Z",xi,3),Ut(Ie([78,16],[88,8],1.6,4,1.4)),Ut(Ie([80,32],[93,30],1.6,4,1.4))])},bowl:{kind:"mark",label:"Hungry",motion:"bob",svg:Ue([At("M34 34 Q28 25 34 17 Q40 9 34 1",3,ir),At("M50 31 Q44 22 50 14 Q56 6 50 -2",3,ir),Kt("M18 52 C22 40 38 33 50 35 C62 33 78 40 82 52 Z",Qe,2.6),Kt(Ie([64,44],[95,14],4,4,3.2),xi,2),Kt(Ie([70,46],[99,22],4,4,3.2),xi,2),Kt("M12 51 L88 51 C88 71 74 85 56 87 L44 87 C26 85 12 71 12 51 Z",_i,3.2),Te(At("M19 60 C36 67 64 67 81 60",2.6,Qe)),Kt("M38 87 L62 87 L60 95 L40 95 Z",xi,2.8)])}}),ul=Object.freeze(["laugh","pleased","smug","blush","determined","deadpan","wince","tear","shiver","dizzy","ko","ellipsis","whisper","think","surprise","question","shock","sweat","anger","sparkle","heart","music","sleep","gloom","idea","fume","soul","star","hand","bowl"]),OT=Object.freeze(["surprise","laugh","sweat","heart","anger","idea","ellipsis","whisper"]);function Mm(i,t,e=0){let n=e%97/97,s=0,r=0,o=0,a=1,l=1;switch(i){case"drip":r=Math.min(14,t*6);break;case"pulse":a=1+.1*Math.max(0,Math.sin(t*13+n*6));break;case"float":r=-(14*Math.min(t,1.5)+5*Math.max(0,t-1.5)),s=4*Math.sin(t*3+n*6);break;case"twinkle":a=1+.08*Math.sin(t*9+n*6),o=6*Math.sin(t*4+n);break;case"fall":r=Math.min(10,t*5);break;case"flicker":l=t<.6?Math.sin(t*60)>-.3?1:.35:1;break;case"rise":r=-(10*Math.min(t,2)+4*Math.max(0,t-2)),a=1+.05*Math.min(t,2);break;case"spin":o=t*140;break;case"bob":r=3*Math.sin(t*4+n*6);break;case"shake":s=t<.9?3*Math.sin(t*46)*(1-t/.9):0;break;case"tilt":o=12*Math.sin(t*3+n);break;case"wave":o=14*Math.sin(t*9)*Math.exp(-t*.8);break;default:break}return{x:s,y:r,r:o,s:a,o:l}}var sr=.7,dl=5,bm=6;function Sm(i,{keep:t=!1,t0:e=0}={}){if(i===null)return{id:null,chosen:!0};if(typeof i!="string"||!gn[i])return null;let n={id:i,t0:Math.round(e*1e3)/1e3,chosen:!0};return t||(n.once=!0),n}var fl=1/120,wm=2.5,ko=Object.freeze({card:{w:280,h:468},holdLift:70,stickLength:134,lane:150,passInFront:85,gripRate:16,limits:{x:[-1800,1800],z:[-2300,260]},zoneEvery:4,look:{reach:900,most:22,linger:2.6},magnet:{overlap:.42,lane:110,rate:9}}),bi=(i,t,e)=>Math.max(t,Math.min(e,i));function bs(i,t,e,n,s,r=16,o=.72){let a=r*r*(n-i[t])-2*o*r*i[e];i[e]+=a*s,i[t]+=i[e]*s}function Tm(i){let t=2166136261;for(let e=0;e<i.length;e++)t^=i.charCodeAt(e),t=Math.imul(t,16777619);return 1e3+(t>>>0)%9e3}var rr=class{constructor(t,e=[],n={}){this.scene=t,this.opts={...ko,...n,card:{...ko.card,...n.card??{}},limits:{...ko.limits,...n.limits??{}},look:{...ko.look,...n.look??{}},magnet:{...ko.magnet,...n.magnet??{}}},this.clock=typeof n.clock=="function"?n.clock:()=>this.time,this.coverFn=typeof n.cover=="function"?n.cover:null,this.rig=Qs(t.painting,t.rig);let s=Qp(t.marks,this.rig);this.marks=s.marks,this.problems=s.dropped.map(r=>`mark "${r}" is above the horizon and cannot be stood on`),this.zones=t.zones,this.bands=Kp(t.zones),this.focus=this.#e(),this.risers=this.#t(),this.cards=new Map,this.resting=new Map,this.touching=new Map,this.inZones=new Map,this.events=[],this.recentBonks=[],this.time=0,this.acc=0,this.steps=0,this.lifeOn=!0,this.board=!1,this.speaker=null,this.turn=null,this.calm=!1,this.slots=new Map;for(let r of e)this.addCard(r)}#t(){let{cam:t,map:e}=this.rig,n=t.floorY-t.cy;return(this.scene.occluders??[]).filter(s=>s.riser).flatMap(s=>{let r=this.rig.standing([s.x,s.base]);if(!r)return[];let o=(t.f-r.Z)/t.f,a=Math.min(...s.poly.map(c=>c[1])),l=s.poly.map(c=>(e.x(c[0])-t.cx)*o);return[{Z:r.Z,top:n-(e.y(a)-t.cy)*o,x0:Math.min(...l),x1:Math.max(...l),hideAtMost:s.hideAtMost,camY:n,f:t.f}]})}riserFor(t,e,n,s){let r=0;for(let o of this.risers){if(e>=o.Z-4||t+n/2<o.x0||t-n/2>o.x1)continue;let a=o.camY+(o.top-o.camY)*((o.f-e)/(o.f-o.Z));r=Math.max(r,a-o.hideAtMost*s)}return Math.max(0,Math.min(r,s*wm))}grow(t){return Ja(this.rig.cam,t)}unhidden(t,e,n,s){for(let r of this.risers){if(e>=r.Z-4||t+n/2<r.x0||t-n/2>r.x1)continue;if(r.camY+(r.top-r.camY)*((r.f-e)/(r.f-r.Z))-r.hideAtMost*s>s*wm)return r.Z+60}return e}#e(){let t=this.scene.rig,e=this.scene.focus??[t.vanish??.5,t.horizon+(t.floorFront-t.horizon)*.72];return this.rig.place(e)??{X:0,Z:-400}}addCard(t){if(!t?.id||this.cards.has(t.id))return null;let e=this.opts.card.w,n=this.opts.card.h,s=this.scene.cardScale*(t.size??1),r=0,o=0,a=t.mark?this.marks.find(d=>d.id===t.mark):null;if(a)r=a.X,o=a.Z;else if(t.at){let d=this.rig.place(t.at);d&&(r=d.X,o=d.Z)}else Number.isFinite(t.X)&&Number.isFinite(t.Z)&&(r=t.X,o=t.Z);let l={id:t.id,person:t,s,w:e*s,h:n*s,seed:Tm(t.id),puppet:Gp({id:t.id,x:r,y:0,rod:0,w:e*s,h:n*s,scale:1}),Z:o,restZ:o,zOff:0,grip:0,holder:null,hand:null,yaw:t.yaw??0,yawV:0,yawTo:t.yaw??0,lean:t.lean??0,leanV:0,leanTo:t.lean??0,pitch:t.pitch??0,pitchV:0,pitchTo:t.pitch??0,lift:0,liftV:0,liftTo:0,mark:null,walk:null,routine:null,still:t.still===!0,living:!1,packed:t.packed===!0,stepLift:0,stepRock:0,look:0,lookV:0,attention:null,riser:0,riserTo:0,down:t.down===!0?1:0,downV:0,downTo:t.down===!0?1:0,grow:this.grow(o)};l.riser=l.riserTo=this.riserFor(r,o,l.w*l.grow,l.h*l.grow),this.cards.set(l.id,l),a&&this.#s(l,a,!0);let c=Bu(t.life);if(c&&(l.routine=zu(c,{home:{X:r,Z:o},rig:this.rig,marks:this.marks,seed:l.seed})),l.routine&&!l.still&&this.lifeOn&&!a){let d=el(l.routine,this.clock());l.puppet.x=l.puppet.restX=d.X,l.Z=l.restZ=d.Z,d.yaw!==null&&(l.yaw=l.yawTo=d.yaw),l.living=!0}let h=t.enter&&typeof t.enter=="object"&&!Em(t.enter.t0,this.clock())?t.enter:null;if(h&&h.from==="rise"){let d=Number.isFinite(h.t0)?h.t0:this.clock();l.rise={t0:d,dur:Number.isFinite(h.dur)?h.dur:.7}}if(h&&Number.isFinite(h.t0)&&this.clock()-h.t0<3&&this.#n(l),h&&["left","right","back"].includes(h.from)){let d=Number.isFinite(h.t0)?h.t0:this.clock(),u=sm(h.from,{X:r,Z:o},this.opts.limits),f=_s(u,{X:r,Z:o},{t0:d,gait:h.gait??"walk",yaw:l.yawTo,maxDur:8});if(this.clock()<f.t0+f.dur){l.walk=f;let x=Ao(f,this.clock());l.puppet.x=l.puppet.restX=x.X,l.Z=l.restZ=x.Z}}return l}removeCard(t){let e=this.cards.get(t);if(!e)return!1;e.mark&&this.resting.get(e.mark)?.delete(t),this.cards.delete(t),this.inZones.delete(t);for(let n of[...this.touching.keys()])n.split("|").includes(t)&&this.touching.delete(n);return!0}walkTo(t,e,{t0:n=null,gait:s="walk",yaw:r=null,lean:o=null,pitch:a=null,still:l=null,packed:c=null}={}){let h=this.cards.get(t);if(!h||h.holder!==null)return null;let d=null,u=null;if(e?.mark?(u=this.marks.find(p=>p.id===e.mark)??null,u&&(d={X:u.X,Z:u.Z})):Array.isArray(e?.at)?d=this.rig.place(e.at):Number.isFinite(e?.X)&&Number.isFinite(e?.Z)&&(d={X:e.X,Z:e.Z}),!d)return null;let f=this.opts.limits;if(d={X:bi(d.X,f.x[0],f.x[1]),Z:bi(d.Z,f.z[0],f.z[1])},h.mark&&(this.resting.get(h.mark)?.delete(t),h.mark=null),u){let p=this.resting.get(u.id);p||this.resting.set(u.id,p=new Set),p.add(t),h.mark=u.id}l!==null&&(h.still=!!l),c!==null&&(h.packed=!!c);let x=u?Qa(u,this.#r()):{yaw:r??h.yawTo,lean:o??0,pitch:a??0,lift:0},g=Number.isFinite(n)&&!Em(n,this.clock())?n:this.clock();return h.walk=_s({X:h.puppet.x,Z:h.Z},d,{t0:g,gait:s,yaw:x.yaw}),h.walk.pose=x,h.walk.mark=u?.id??null,h.living=!1,this.events.push({type:"walk",card:t,to:{X:d.X,Z:d.Z},mark:u?.id??null,t:this.time}),h.walk}setRoutine(t,e,n=null){let s=this.cards.get(t);if(!s)return;let r=Array.isArray(n)?this.rig.place(n):null;n=r?{X:r.X,Z:r.Z}:s.routine?.home??{X:s.puppet.restX,Z:s.restZ};let o=Bu(e);s.routine=o?zu(o,{home:n,rig:this.rig,marks:this.marks,seed:s.seed}):null,s.living=!1}setStill(t,e){let n=this.cards.get(t);n&&(n.still=!!e)}setLife(t){this.lifeOn=!!t}setBoard(t){this.board=!!t}setDown(t,e){let n=this.cards.get(t);if(!n)return!1;let s=e?1:0;return n.downTo===s?!1:(n.downTo=s,e&&n.walk&&this.#i(n),this.events.push({type:"fall",card:t,down:!!e,t:this.time}),e&&this.#n(n),!0)}#n(t){let e=this.clock()+this.opts.look.linger;for(let n of this.cards.values())n===t||n.holder!==null||n.downTo||Eo({X:n.puppet.x,Z:n.Z},{X:t.puppet.x,Z:t.Z})<=this.opts.look.reach*1.4&&(n.attention={id:t.id,until:e})}setSpeaker(t){this.speaker=t&&this.cards.has(t)?t:null}setTurn(t){this.turn=t&&this.cards.has(t)?t:null}setCalm(t){this.calm=!!t}dockFor(t,e,n){if(!this.board)return null;let s=this.rig.fractionOf(e,n),r=this.zones.find(h=>h.kind==="area"&&tr([h],s[0],s[1]).length);if(!r)return null;let a=(this.cards.get(t)?.w??180)*this.grow(n);this.slots.has(r.id)||this.slots.set(r.id,Du(r,this.rig,{w:a*1.05}));let l=[...this.cards.values()].filter(h=>h.id!==t&&h.holder===null).map(h=>({X:h.walk?h.walk.to.X:h.puppet.restX,Z:h.walk?h.walk.to.Z:h.restZ})),c=this.slots.get(r.id).filter(h=>!l.some(d=>Math.abs(d.X-h.X)<a*.6&&Math.abs(d.Z-h.Z)<90));return c.length?(c.sort((h,d)=>Math.hypot(h.X-e,(h.Z-n)*.8)-Math.hypot(d.X-e,(d.Z-n)*.8)),{X:c[0].X,Z:c[0].Z,zone:r.id}):null}hold(t,e){let n=this.cards.get(t);return!n||n.holder!==null&&n.holder!==e?!1:(n.holder===e||(n.mark&&(this.resting.get(n.mark)?.delete(t),n.mark=null),this.#i(n),n.routine&&(n.still=!0),n.holder=e,n.hand={x:n.puppet.x,z:n.Z},n.puppet.heldBy=e,this.events.push({type:"grab",card:t,by:e,t:this.time})),!0)}setHand(t,{x:e,z:n}){let s=this.cards.get(t);if(!s||s.holder===null)return;let r=this.opts.limits;s.hand.x=bi(e,r.x[0],r.x[1]),s.hand.z=bi(n,r.z[0],r.z[1])}release(t,e=null){let n=this.cards.get(t);if(!n||n.holder===null)return null;let s=n.holder,r=e??this.landingFor(t);n.holder=null,n.hand=null,n.puppet.heldBy=null;let o=r.mark?this.marks.find(h=>h.id===r.mark)??null:null;o?this.#s(n,o,!1):(n.puppet.restX=r.X,n.restZ=bi(r.Z,this.opts.limits.z[0],this.opts.limits.z[1]),n.mark=null);let a={type:"drop",card:t,by:s,t:this.time,mark:o?.id??null,X:n.puppet.restX,Z:n.restZ};this.events.push(a);let l=this.rig.fractionOf(n.puppet.restX,n.restZ),c=tr(this.zones.filter(h=>h.kind==="door"||h.kind==="spot"),l[0],l[1])[0];return c&&this.events.push({type:"visit",card:t,by:s,zone:c.id,name:c.name,hint:c.hint,t:this.time}),a}landingFor(t){let e=this.cards.get(t);if(!e||e.holder===null)return null;let n=e.puppet.x,s=e.hand?.z??e.Z,r=Ou(this.marks,this.resting,n,s,this.scene.reach.snap);!r&&this.scene.marksOnly&&(r=Ou(this.marks,this.resting,n,s,1/0));let o=r?null:this.dockFor(t,n,s);if(o)return{X:o.X,Z:o.Z,mark:null};let a={X:n,Z:bi(s,this.opts.limits.z[0],this.opts.limits.z[1])},l=r?a:this.clearOfCover(a,e);return{X:l.X,Z:l.Z,mark:r?.id??null}}handOver(t,e){let n=this.cards.get(t);return n?(n.mark&&(this.resting.get(n.mark)?.delete(t),n.mark=null),this.#i(n),n.routine&&(n.still=!0),n.hand??={x:n.puppet.x,z:n.Z},n.holder=e,n.puppet.heldBy=e,!0):!1}#i(t){t.walk&&(t.walk=null,t.puppet.restX=t.puppet.x,t.restZ=t.Z,t.stepLift=0,t.stepRock=0)}perform(t,e){let n=this.cards.get(t);n&&Pu(n.puppet,e)}#s(t,e,n){let s=this.resting.get(e.id);s||this.resting.set(e.id,s=new Set),s.add(t.id),t.mark=e.id;let r=Qa(e,this.#r());t.puppet.restX=e.X,t.restZ=e.Z,t.yawTo=r.yaw,t.leanTo=r.lean,t.pitchTo=r.pitch,t.liftTo=r.lift,n&&(t.puppet.x=e.X,t.Z=e.Z,t.yaw=r.yaw,t.lean=r.lean,t.pitch=r.pitch,t.lift=r.lift),this.events.push({type:"mark",card:t.id,mark:e.id,t:this.time})}#r(){return{zones:this.zones,pointOnFloor:t=>this.rig.standing(t),cardAt:t=>{let e=this.cards.get(t);return e?{X:e.puppet.x,Z:e.Z}:null}}}tidy({t0:t=null}={}){let e=this.marks.map(r=>({...r,capacity:r.capacity-(this.resting.get(r.id)?.size??0)})).filter(r=>r.capacity>0),n=[...this.cards.values()].filter(r=>!r.mark&&r.holder===null&&!r.walk).map(r=>({id:r.id,X:r.puppet.x,Z:r.Z})),s=tl(e,n);for(let{card:r,mark:o}of s)this.walkTo(r,{mark:o},{t0:t,gait:"hurry",still:!0});return s}advance(t){this.acc+=Math.min(Math.max(t,0),.05);let e=0;for(;this.acc>=fl-1e-9;)this.step(fl),this.acc-=fl,e++;return e}step(t=fl){this.time+=t,this.steps++;let e=this.opts,n=this.clock(),s=[...this.cards.values()].filter(r=>r.holder!==null);for(let r of this.cards.values()){let o=r.puppet,a=r.holder!==null;a||this.#o(r,n),o.heldBy=a?r.holder:null,o.target=a?{x:r.hand.x,y:0}:null,Vp(o,t),r.Z+=((a?r.hand.z:r.restZ)-r.Z)*Math.min(1,t*(a?24:12)),r.grip+=((a?1:0)-r.grip)*Math.min(1,t*e.gripRate),bs(r,"yaw","yawV",r.yawTo,t,16,.72),bs(r,"lean","leanV",r.leanTo,t,18,.8),bs(r,"pitch","pitchV",r.pitchTo,t,18,.8),bs(r,"lift","liftV",r.liftTo,t,18,.62),bs(r,"look","lookV",a||r.downTo?0:this.#a(r,s,n),t,7,.9),r.riser+=(r.riserTo-r.riser)*Math.min(1,t*9),r.grow=this.grow(r.Z),r.downTo?bs(r,"down","downV",1,t,9,.45):bs(r,"down","downV",0,t,6,.8),r.down>1.08&&(r.down=1.08,r.downV=-Math.abs(r.downV)*.35)}if(this.#l(t),this.steps%e.zoneEvery===0&&(this.#u(),this.#h(t*e.zoneEvery),this.risers.length))for(let r of this.cards.values())r.riserTo=this.riserFor(r.puppet.x,r.Z,r.w*r.grow,r.h*r.grow)}#o(t,e){let n=t.puppet;if(t.walk){let r=Ao(t.walk,e);n.restX=r.X,t.restZ=r.Z,t.stepLift=r.lift,t.stepRock=r.rock,r.yaw!==null&&(t.yawTo=r.yaw),r.done&&this.#c(t);return}if(!!t.routine&&this.lifeOn&&!t.still&&!t.downTo){let r=el(t.routine,e);if(!t.living&&Eo({X:n.restX,Z:t.restZ},r)>12){let a=_s({X:n.x,Z:t.Z},r,{t0:e,gait:t.routine.gait}),l=el(t.routine,e+a.dur);t.walk=_s({X:n.x,Z:t.Z},l,{t0:e,gait:t.routine.gait,yaw:l.yaw??t.yawTo}),t.walk.pose={yaw:l.yaw??t.yawTo,lean:0,pitch:0,lift:0},t.walk.mark=null,t.walk.back=!0;return}if(t.living=!0,n.restX=r.X,t.restZ=r.Z,t.stepLift=r.lift,t.stepRock=r.rock,!r.moving&&t.routine.facesCard){let a=this.cards.get(t.routine.facesCard);a&&(t.yawTo=Sn(bn(r.X,r.Z,a.puppet.x,a.Z),{share:.8,max:55}))}else r.yaw!==null&&(t.yawTo=r.yaw);let o=om(t.routine,e);o&&!r.moving&&e>=o.at&&e<o.at+.5&&t.gestured!==o.beat&&(t.gestured=o.beat,Pu(n,o.verb));return}t.living=!1,t.stepLift*=.8,t.stepRock*=.8}#c(t){let e=t.walk;t.walk=null,t.puppet.restX=e.to.X,t.restZ=e.to.Z,t.stepLift=0,t.stepRock=0;let n=e.pose??{yaw:e.yaw??t.yawTo,lean:0,pitch:0,lift:0};t.yawTo=n.yaw??t.yawTo,t.leanTo=n.lean??0,t.pitchTo=n.pitch??0,t.liftTo=n.lift??0,t.living=!1,e.mark&&this.events.push({type:"mark",card:t.id,mark:e.mark,t:this.time}),e.back||this.events.push({type:"arrive",card:t.id,mark:e.mark??null,t:this.time})}#a(t,e,n){let s=this.opts.look,r=null;if(t.attention&&t.attention.until>n?r=this.cards.get(t.attention.id)??null:t.attention=null,!r){let a=s.reach;for(let l of e){if(l===t)continue;let c=Eo({X:l.puppet.x,Z:l.Z},{X:t.puppet.x,Z:t.Z});c<a&&(a=c,r=l)}}if(!r&&this.speaker&&this.speaker!==t.id&&(r=this.cards.get(this.speaker)??null),!r)return 0;let o=Sn(bn(t.puppet.x,t.Z,r.puppet.x,r.Z),{share:.8,max:60});return bi(o-t.yaw,-s.most,s.most)}#h(t){let e=this.opts.magnet,n=[...this.cards.values()].filter(s=>s.holder===null&&!s.walk&&!s.packed&&!(s.routine&&this.lifeOn&&!s.still));for(let s=0;s<n.length;s++)for(let r=s+1;r<n.length;r++){let o=n[s],a=n[r];if(Math.abs(o.restZ-a.restZ)>=e.lane)continue;let l=a.puppet.restX-o.puppet.restX,c=o.w*o.grow,h=a.w*a.grow,u=(c+h)/2-Math.min(c,h)*e.overlap-Math.abs(l);if(u<=.5)continue;let f=l!==0?Math.sign(l):o.id<a.id?1:-1,x=Math.min(u/2,u*e.rate*t),g=this.opts.limits.x;o.puppet.restX=bi(o.puppet.restX-f*x,g[0],g[1]),a.puppet.restX=bi(a.puppet.restX+f*x,g[0],g[1])}}#l(t){let e=this.opts,n=new Set;for(let s of this.cards.values()){if(s.holder===null){s.zOff+=(0-s.zOff)*Math.min(1,t*11);continue}let r=!1;for(let o of this.cards.values()){if(o===s||Math.abs(o.Z-s.Z)>=e.lane)continue;let a=s.id<o.id?`${s.id}|${o.id}`:`${o.id}|${s.id}`,l=Mo(s.puppet),c=Mo(o.puppet);if(Math.min(l.right,c.right)-Math.max(l.left,c.left)>0&&(r=!0),n.has(a))continue;n.add(a);let h=this.touching.get(a);h||this.touching.set(a,h=new Set);let d=s.id<o.id?[s,o]:[o,s];for(let u of $p(d.map(f=>f.puppet),h)){let f={type:"bonk",t:this.time,a:u.a,b:u.b,x:u.x,speed:u.speed,Z:s.Z};this.events.push(f),this.recentBonks.push(f);let x=this.clock()+this.opts.look.linger,g=this.cards.get(u.a),p=this.cards.get(u.b);g&&p&&(g.attention={id:p.id,until:x},p.attention={id:g.id,until:x})}}s.zOff+=((r?e.passInFront:0)-s.zOff)*Math.min(1,t*11)}for(let[s,r]of this.touching)r.size===0&&this.touching.delete(s);this.recentBonks=this.recentBonks.filter(s=>this.time-s.t<.9)}#u(){if(!this.zones.length)return;let t=new Map;for(let e of this.cards.values()){let n=this.rig.fractionOf(e.puppet.x,e.Z);t.set(e.id,new Set(tr(this.zones,n[0],n[1]).map(s=>s.id)))}for(let e of Jp(this.inZones,t))this.events.push({...e,t:this.time});this.inZones=t}drain(){let t=this.events;return this.events=[],t}marksFor(t){let e=this.cards.get(t);if(!e||e.holder===null)return[];let n=this.scene.reach;return em(this.marks,this.resting,e.hand.x,e.hand.z,{show:n.show,snap:n.snap,max:5}).map(s=>({id:s.id,for:t,X:s.mark.X,Z:s.mark.Z,label:s.mark.label,alpha:s.alpha,target:s.target,pose:Qa(s.mark,this.#r())}))}zoneStates(){let t=[...this.cards.values()].filter(e=>e.holder!==null).map(e=>{let n=this.rig.fractionOf(e.hand.x,e.hand.z);return{x:n[0],y:n[1]}});return jp(this.zones,t)}snapshot({viewer:t=null,selected:e=null}={}){let n=this.time,s=this.clock(),r=[],o=[];for(let a of this.cards.values()){let l=a.puppet,c=zp(n,a.seed,a.person.demeanour??"calm",{speakerYaw:null}),h=Xp(l),d=a.grip,u=a.rise?h_(a.rise,s):1;a.rise&&s>a.rise.t0+a.rise.dur&&(a.rise=null),r.push({id:a.id,name:a.person.name??a.id,colour:a.person.colour??null,x:l.x+l.jx,z:a.Z+a.zOff,lift:(c.lift*(1-d)+a.lift+a.stepLift+a.riser)*(1-Math.min(1,a.down))+this.opts.holdLift*d+h.lift,lean:l.lean+(a.lean+c.lean)*(1-.85*d)*(1-Math.min(1,a.down))+a.stepRock,yaw:a.yaw+l.turn+h.shakeY+c.yaw+a.look,pitch:(a.pitch+c.pitch+h.tipX+h.dip*.4)*(1-Math.min(1,a.down))-78*a.down,down:Math.max(0,Math.min(1,a.down)),grip:d,breathe:c.breathe,squash:h.squash*u,scale:a.s*a.grow,grow:a.grow,held:a.holder!==null,holder:a.holder,mark:a.mark,walking:!!a.walk||a.living&&Math.abs(a.stepLift)>.2,selected:!!e?.has?.(a.id),speaking:this.speaker===a.id||this.turn===a.id,emote:this.#d(a,s)}),t!==null&&a.holder===t&&o.push(...this.marksFor(a.id))}return{t:n,cards:r,bonks:this.recentBonks.map(a=>({...a})),marks:o,zones:this.zoneStates(),board:this.board?this.boardState():null}}boardState(){let t={},e={};for(let n of this.zones)t[n.id]=0,e[n.id]=0;for(let[n,s]of this.inZones){let r=this.cards.get(n)?.downTo===1;for(let o of s)o in t&&(r?e:t)[o]++}return{counts:t,downs:e,bands:this.bands}}bandBetween(t,e){return!t||!e?null:t===e?"engaged":this.bands.some(n=>n.a===t&&n.b===e||n.a===e&&n.b===t)?"near":"far"}#d(t,e){let n=t.person.emote;if(!n?.id)return null;let s=e-(n.t0??0);if(n.once&&(s<0||s>dl))return null;let r=n.once?s:s%bm,o=r<0?0:r<.2?r/.2:r>dl-.6?Math.max(0,1-(r-(dl-.6))/.6):1,a=r<.3?.6+.4*Math.sin(r/.3*Math.PI*.5)+.12*Math.sin(r/.3*Math.PI):1,l=this.calm||r<0?null:Mm(gn[n.id]?.motion,r,Tm(t.id));return l?{id:n.id,age:r,opacity:o*l.o,pop:a*l.s,x:l.x,y:l.y,r:l.r}:{id:n.id,age:r,opacity:o,pop:a,x:0,y:0,r:0}}placeOf(t){let e=this.cards.get(t);if(!e)return null;let n=e.walk?e.walk.to.X:e.puppet.restX,s=e.walk?e.walk.to.Z:e.restZ,r=e.walk?e.walk.pose?.yaw??e.yawTo:e.yawTo;return{id:e.id,at:this.rig.fractionOf(n,s).map(o=>Math.round(o*1e4)/1e4),mark:e.mark,yaw:Math.round(r*10)/10}}formationMoves(t,{ids:e=null,focus:n=null,target:s=null,speakers:r=[],party:o=!1,gait:a="walk",dir:l="back",away:c=!1,size:h=null}={}){let d=this.standing(),u=e?d.filter(S=>e.includes(S.id)):d,f=this.focus;if(Array.isArray(n))f=this.rig.place(n)??this.focus;else if(typeof n=="string"&&this.cards.has(n)){let S=this.cards.get(n);f={X:S.puppet.restX,Z:S.restZ}}let x=this.grow(f.Z),g=u.map(S=>({...S,w:S.w*x}));if(t==="position")return this.#f(g,f,{party:o,gait:a});let p=["huddle","gangup","queue"].includes(t),m=null;if(Number.isFinite(h)&&h>0){let S=this.rig.fractionOf(f.X,f.Z),R=this.rig.standing([S[0]-h/2,S[1]]),P=this.rig.standing([S[0]+h/2,S[1]]);R&&P&&(m=Math.abs(P.X-R.X)/2)}let v=this.cover(),E=lm(t,{cards:g,focus:f,target:s,speakers:r,party:o,dir:l,radius:m,limits:{x:this.opts.limits.x,z:[this.opts.limits.z[0],200]},seed:this.steps%7}).filter(S=>this.cards.has(S.id)).map(S=>{let R=this.cards.get(S.id),P=this.grow(S.Z);return this.clearOfCover({...S,Z:this.unhidden(S.X,S.Z,R.w*P,R.h*P)},R,v)}),M=new Set(E.map(S=>S.id)),T=(S,R,P)=>{let k=this.cards.get(S),B=this.grow(P);return{id:S,X:R,Z:P,w:k.w*B,h:k.h*B,lift:this.riserFor(R,P,k.w*B,k.h*B)}},w=[...E.map(S=>T(S.id,S.X,S.Z)),...d.filter(S=>!M.has(S.id)).map(S=>T(S.id,S.X,S.Z))],C=new Map(hm(this.rig,w,M,{limits:this.opts.limits.x}).map(S=>[S.id,S.X]));return E.map(S=>{let R=this.cards.get(S.id),P=C.get(S.id)??S.X,k=this.grow(S.Z);return this.clearOfCover({...S,X:P,Z:this.unhidden(P,S.Z,R.w*k,R.h*k)},R,v)}).map(S=>({id:S.id,at:this.rig.fractionOf(S.X,S.Z).map(R=>Math.round(R*1e4)/1e4),yaw:c?180:S.yaw,lean:c?0:S.lean,pitch:c?0:S.pitch,gait:a,still:!0,packed:p}))}#f(t,e,{party:n,gait:s}){let r=this.rig.fractionOf(e.X,e.Z),o=tr(this.zones.filter(p=>p.kind==="area"),r[0],r[1])[0]??tr(this.zones,r[0],r[1])[0]??null,a=t.filter(p=>n||!p.pc);if(!o)return this.formationMoves("line",{ids:a.map(p=>p.id),focus:r,party:!0,gait:s});let l=Math.max(...a.map(p=>p.w),120),c=new Set(a.map(p=>p.id)),h=[...this.cards.values()].filter(p=>!c.has(p.id)&&p.holder===null).map(p=>({X:p.walk?p.walk.to.X:p.puppet.restX,Z:p.walk?p.walk.to.Z:p.restZ})),d=this.cover(),u=a[0]?this.cards.get(a[0].id):null,f=Du(o,this.rig,{w:l*1.05,most:40}).filter(p=>!h.some(m=>Math.abs(m.X-p.X)<l*.6&&Math.abs(m.Z-p.Z)<90)).filter(p=>!u||this.coveredAt(p.X,p.Z,u,d)<=.15),x=[...a].sort((p,m)=>Math.hypot(p.X-e.X,p.Z-e.Z)-Math.hypot(m.X-e.X,m.Z-e.Z)),g=[];for(let p of x){if(!f.length)break;f.sort((v,E)=>Math.hypot(v.X-p.X,(v.Z-p.Z)*.8)-Math.hypot(E.X-p.X,(E.Z-p.Z)*.8));let m=f.shift();g.push({id:p.id,at:this.rig.fractionOf(m.X,m.Z).map(v=>Math.round(v*1e4)/1e4),yaw:0,lean:0,pitch:0,gait:s,still:!0,packed:!1})}return g}cover(){try{return this.coverFn?.()??[]}catch{return[]}}cardShapes(){let t=[];for(let e of this.cards.values()){let n=e.puppet.x,s=e.Z,r=this.grow(s),o=e.w*r,a=e.h*r,l=il(this.rig,{X:n,Z:s,w:o,h:a,lift:this.riserFor(n,s,o,a)});[l.x0,l.y0,l.x1,l.y1].every(Number.isFinite)&&t.push({rect:[l.x0,l.y0,l.x1,l.y1]})}return t}coveredAt(t,e,n,s=this.cover()){if(!s.length)return 0;let r=this.grow(e),o=n.w*r,a=n.h*r;return cm(il(this.rig,{X:t,Z:e,w:o,h:a,lift:this.riserFor(t,e,o,a)}),s)}clearOfCover(t,e,n=this.cover()){if(!n.length||this.coveredAt(t.X,t.Z,e,n)<=.15)return t;let s=this.rig.fractionOf(t.X,t.Z);for(let r=.0025;r<=.2;r+=.0025){let o=this.rig.place([s[0],s[1]-r]);if(o&&this.coveredAt(o.X,o.Z,e,n)<=.15-.01)return{...t,X:o.X,Z:o.Z}}return t}standing(){return[...this.cards.values()].filter(t=>t.holder===null).map(t=>({id:t.id,X:t.walk?t.walk.to.X:t.puppet.restX,Z:t.walk?t.walk.to.Z:t.restZ,w:t.w,pc:t.person.pc===!0}))}exportPlaces(){return[...this.cards.keys()].map(t=>this.placeOf(t))}},c_=60,Em=(i,t)=>Number.isFinite(i)&&Number.isFinite(t)&&i>t+c_;function h_(i,t){let e=Math.max(0,Math.min(1,(t-i.t0)/i.dur));if(e<=0)return .02;let n=1.9,s=n+1;return Math.max(.02,1+s*(e-1)**3+n*(e-1)**2)}var pl=class{constructor({limit:t=600,report:e=()=>{},onFatal:n=()=>{}}={}){this.limit=t,this.report=e,this.onFatal=n,this.failures=0,this.total=0}run(t){try{return t(),this.failures=0,!0}catch(e){return this.failures++,this.total++,(this.failures<=3||this.failures%300===0)&&this.report(e,this.failures),this.failures>=this.limit?(this.onFatal(e),!1):!0}}};var Lo=Object.freeze({every:33,heartbeat:1e3,delay:100,silent:2e3}),Do=i=>Math.round(i),Gi=i=>Math.round(i*10)/10,ml=class{constructor({stage:t,scene:e,me:n,now:s,clock:r=s,send:o,mayHold:a=()=>!0,onLost:l=()=>{},onDrop:c=()=>{}}){Object.assign(this,{stage:t,scene:e,me:n,now:s,clock:r,mayHold:a,onLost:l,onDrop:c}),this.wire=o,this.mine=new Map,this.remote=new Map,this.sent=0}send(t){this.sent++,this.wire({scene:this.scene,...t})}holderOf(t){return this.mine.has(t)?this.me:this.remote.get(t)?.by??null}grab(t){let e=this.stage.cards.get(t);if(!e||!this.mayHold(t,this.me)||!this.stage.hold(t,this.me))return!1;let n=this.now();return this.mine.set(t,{stamp:{t:Do(n),user:this.me},last:{t:n,x:e.hand.x,y:e.hand.z}}),this.send({type:"grab",id:t,t:Do(n),x:Gi(e.hand.x),z:Gi(e.hand.z)}),!0}move(t,e,n){let s=this.mine.get(t);if(!s)return;this.stage.setHand(t,{x:e,z:n});let r=this.stage.cards.get(t).hand;this.#t(t,s,r,this.now())}#t(t,e,n,s){return Zp(e.last,n.x,n.z,s,Lo.every)?(e.last={t:s,x:n.x,y:n.z},e.moving=!0,this.send({type:"move",id:t,t:Do(s),x:Gi(n.x),z:Gi(n.z)}),!0):!1}verb(t,e){this.mine.has(t)&&(this.stage.perform(t,e),this.send({type:"verb",id:t,verb:e}))}release(t){if(!this.mine.has(t))return null;this.mine.delete(t);let e=this.stage.landingFor(t);if(!e)return null;let n={X:Gi(e.X),Z:Gi(e.Z),mark:e.mark},s=this.stage.release(t,n);return s&&(this.send({type:"release",id:t,t:Do(this.now()),X:n.X,Z:n.Z,mark:n.mark}),this.onDrop(s)),s}receive(t,e){!t||t.scene!==this.scene||e===this.me||this.stage.cards.has(t.id)&&(t.type==="grab"?this.#e(t,e):t.type==="move"?this.#n(t,e):t.type==="verb"?this.remote.get(t.id)?.by===e&&this.stage.perform(t.id,t.verb):t.type==="release"&&this.#s(t,e))}#e(t,e){if(!this.mayHold(t.id,e))return;let n={t:t.t,user:e},s=this.mine.get(t.id),r=this.remote.get(t.id),o=s?.stamp??r?.stamp??null;o&&r?.by!==e&&qp(o,n)===o||(s&&(this.mine.delete(t.id),this.onLost(t.id)),this.#i(t,e,n))}#n(t,e){let n=this.remote.get(t.id);if(!n){if(this.mine.has(t.id)||!this.mayHold(t.id,e))return;this.#i(t,e,{t:t.t,user:e});return}n.by===e&&(n.buffer.push({t:t.t,x:t.x,y:t.z}),n.heard=this.clock())}#i(t,e,n){this.stage.hold(t.id,e)||this.stage.handOver(t.id,e);let s=new ja({delay:Lo.delay});s.push({t:t.t,x:t.x,y:t.z}),this.remote.set(t.id,{by:e,stamp:n,buffer:s,heard:this.clock()})}#s(t,e){let n=this.remote.get(t.id);if(!n||n.by!==e)return;this.remote.delete(t.id);let s=this.stage.release(t.id,{X:t.X,Z:t.Z,mark:t.mark??null});s&&this.onDrop(s)}forget(t){this.mine.delete(t),this.remote.delete(t)}userGone(t){for(let[e,n]of[...this.remote])n.by===t&&this.#r(e)}#r(t){this.remote.delete(t);let e=this.stage.release(t);e&&this.onDrop(e)}tick(){let t=this.now(),e=this.clock();for(let[n,s]of[...this.remote]){if(e-s.heard>Lo.silent){this.#r(n);continue}let r=s.buffer.at(t);r&&this.stage.setHand(n,{x:r.x,z:r.y})}for(let[n,s]of this.mine){let r=this.stage.cards.get(n)?.hand;if(!r||this.#t(n,s,r,t))continue;let o=t-s.last.t;(s.moving&&o>=Lo.every||o>=Lo.heartbeat)&&(s.moving=!1,s.last={t,x:r.x,y:r.z},this.send({type:"move",id:n,t:Do(t),x:Gi(r.x),z:Gi(r.z)}))}}close(){for(let t of[...this.mine.keys()])this.release(t);this.remote.clear()}};function Am(i,t,e){let n=new Map(t.filter(r=>r&&typeof r.id=="string").map(r=>[r.id,r])),s=Math.round(e*1e3)/1e3;return i.map(r=>{let o=n.get(r.id);if(!o)return r;let a={...r};if(delete a.X,delete a.Z,delete a.enter,o.mark)a.mark=o.mark,delete a.at;else if(Array.isArray(o.at))a.at=[o.at[0],o.at[1]],delete a.mark;else return r;for(let l of["yaw","lean","pitch"])Number.isFinite(o[l])?a[l]=Math.round(o[l]*10)/10:l!=="yaw"&&delete a[l];return typeof o.still=="boolean"&&(a.still=o.still),typeof o.packed=="boolean"&&(a.packed=o.packed),a.move={t0:s,gait:o.gait??"walk"},a})}function Cm(i,{gait:t="walk"}={}){let e=[];for(let n of i)!Array.isArray(n.home)||Array.isArray(n.at)&&Math.abs(n.at[0]-n.home[0])<1e-4&&Math.abs(n.at[1]-n.home[1])<1e-4&&!n.mark&&!n.still&&!n.packed||e.push({id:n.id,at:[n.home[0],n.home[1]],yaw:n.homeYaw??0,lean:0,pitch:0,gait:t,still:!1,packed:!1});return e}function Rm(i,t){return i.map(e=>{if(e.id!==t.id)return e;let n={...e,at:t.at,yaw:t.yaw};return delete n.X,delete n.Z,delete n.enter,delete n.packed,n.life&&(n.still=!0),t.mark?n.mark=t.mark:delete n.mark,n})}function Pm(i,t,e=null){let n=new Map(t.filter(Boolean).map(s=>[s.id,s]));return i.map(s=>{let r=n.get(s.id);if(!r||e&&!e.includes(s.id)||!Array.isArray(r.at))return s;let o=Number.isFinite(r.yaw)?r.yaw:0;return Array.isArray(s.home)&&Math.abs(s.home[0]-r.at[0])<1e-4&&Math.abs(s.home[1]-r.at[1])<1e-4&&(s.homeYaw??0)===o?s:{...s,home:[r.at[0],r.at[1]],homeYaw:o}})}var sg=0,Ad=1,rg=2;var Is=1,og=2,Fr=3,es=0,dn=1,yn=2,Dn=0,ns=1,An=2,Cd=3,Rd=4,ag=5;var ks=100,lg=101,cg=102,hg=103,ug=104,dg=200,fg=201,pg=202,mg=203,Pd=204,Id=205,gg=206,xg=207,yg=208,_g=209,vg=210,Mg=211,bg=212,Sg=213,wg=214,Gl=0,Vl=1,Wl=2,wr=3,Xl=4,$l=5,Zl=6,ql=7,kd=0,Tg=1,Eg=2,Cn=0,Ld=1,Dd=2,Nd=3,Od=4,Ud=5,Fd=6,Bd=7;var zd=300,is=301,Ls=302,Br=303,_c=304,da=306,Yl=1e3,si=1001,jl=1002,je=1003,Ag=1004;var fa=1005;var ze=1006,vc=1007;var hi=1008;var _n=1009,Hd=1010,Gd=1011,zr=1012,Mc=1013,Zn=1014,qn=1015,We=1016,bc=1017,Sc=1018,Hr=1020,Vd=35902,Wd=35899,Xd=1021,$d=1022,vn=1023,ri=1026,ss=1027,Zd=1028,wc=1029,rs=1030,Tc=1031;var Ec=1033,pa=33776,ma=33777,ga=33778,xa=33779,Ac=35840,Cc=35841,Rc=35842,Pc=35843,Ic=36196,kc=37492,Lc=37496,Dc=37488,Nc=37489,ya=37490,Oc=37491,Uc=37808,Fc=37809,Bc=37810,zc=37811,Hc=37812,Gc=37813,Vc=37814,Wc=37815,Xc=37816,$c=37817,Zc=37818,qc=37819,Yc=37820,jc=37821,Kc=36492,Jc=36494,Qc=36495,th=36283,eh=36284,_a=36285,nh=36286;var Go=2300,Kl=2301,zl=2302,xd=2303,yd=2400,_d=2401,vd=2402;var Cg=3200;var ih=0,Rg=1,Ii="",Ae="srgb",Vo="srgb-linear",Wo="linear",se="srgb";var Hl=7680;var Pg=519,Ig=512,kg=513,Lg=514,sh=515,Dg=516,Ng=517,rh=518,Og=519,qd=35044;var Yd="300 es",Wn=2e3,Tr=2001;function u_(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function d_(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function Xo(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Ug(){let i=Xo("canvas");return i.style.display="block",i}var Im={},Er=null;function $o(...i){let t="THREE."+i.shift();Er?Er("log",t,...i):console.log(t,...i)}function Fg(i){let t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Ot(...i){i=Fg(i);let t="THREE."+i.shift();if(Er)Er("warn",t,...i);else{let e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function Nt(...i){i=Fg(i);let t="THREE."+i.shift();if(Er)Er("error",t,...i);else{let e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function As(...i){let t=i.join(" ");t in Im||(Im[t]=!0,Ot(...i))}function Bg(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}var zg={[Gl]:Vl,[Wl]:Zl,[Xl]:ql,[wr]:$l,[Vl]:Gl,[Zl]:Wl,[ql]:Xl,[$l]:wr},oi=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let s=n[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}},on=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];var Zu=Math.PI/180,Zo=180/Math.PI;function qi(){let i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(on[i&255]+on[i>>8&255]+on[i>>16&255]+on[i>>24&255]+"-"+on[t&255]+on[t>>8&255]+"-"+on[t>>16&15|64]+on[t>>24&255]+"-"+on[e&63|128]+on[e>>8&255]+"-"+on[e>>16&255]+on[e>>24&255]+on[n&255]+on[n>>8&255]+on[n>>16&255]+on[n>>24&255]).toLowerCase()}function jt(i,t,e){return Math.max(t,Math.min(e,i))}function f_(i,t){return(i%t+t)%t}function qu(i,t,e){return(1-e)*i+e*t}function ii(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:case Uint8ClampedArray:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function ae(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var bt=class i{static{i.prototype.isVector2=!0}constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=jt(this.x,t.x,e.x),this.y=jt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=jt(this.x,t,e),this.y=jt(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(jt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(jt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*n-o*s+t.x,this.y=r*s+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},ai=class{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,o,a){let l=n[s+0],c=n[s+1],h=n[s+2],d=n[s+3],u=r[o+0],f=r[o+1],x=r[o+2],g=r[o+3];if(d!==g||l!==u||c!==f||h!==x){let p=l*u+c*f+h*x+d*g;p<0&&(u=-u,f=-f,x=-x,g=-g,p=-p);let m=1-a;if(p<.9995){let v=Math.acos(p),E=Math.sin(v);m=Math.sin(m*v)/E,a=Math.sin(a*v)/E,l=l*m+u*a,c=c*m+f*a,h=h*m+x*a,d=d*m+g*a}else{l=l*m+u*a,c=c*m+f*a,h=h*m+x*a,d=d*m+g*a;let v=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=v,c*=v,h*=v,d*=v}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,s,r,o){let a=n[s],l=n[s+1],c=n[s+2],h=n[s+3],d=r[o],u=r[o+1],f=r[o+2],x=r[o+3];return t[e]=a*x+h*d+l*f-c*u,t[e+1]=l*x+h*u+c*d-a*f,t[e+2]=c*x+h*f+a*u-l*d,t[e+3]=h*x-a*d-l*u-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(s/2),d=a(r/2),u=l(n/2),f=l(s/2),x=l(r/2);switch(o){case"XYZ":this._x=u*h*d+c*f*x,this._y=c*f*d-u*h*x,this._z=c*h*x+u*f*d,this._w=c*h*d-u*f*x;break;case"YXZ":this._x=u*h*d+c*f*x,this._y=c*f*d-u*h*x,this._z=c*h*x-u*f*d,this._w=c*h*d+u*f*x;break;case"ZXY":this._x=u*h*d-c*f*x,this._y=c*f*d+u*h*x,this._z=c*h*x+u*f*d,this._w=c*h*d-u*f*x;break;case"ZYX":this._x=u*h*d-c*f*x,this._y=c*f*d+u*h*x,this._z=c*h*x-u*f*d,this._w=c*h*d+u*f*x;break;case"YZX":this._x=u*h*d+c*f*x,this._y=c*f*d+u*h*x,this._z=c*h*x-u*f*d,this._w=c*h*d-u*f*x;break;case"XZY":this._x=u*h*d-c*f*x,this._y=c*f*d-u*h*x,this._z=c*h*x+u*f*d,this._w=c*h*d+u*f*x;break;default:Ot("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],s=e[4],r=e[8],o=e[1],a=e[5],l=e[9],c=e[2],h=e[6],d=e[10],u=n+a+d;if(u>0){let f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(o-s)*f}else if(n>a&&n>d){let f=2*Math.sqrt(1+n-a-d);this._w=(h-l)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+c)/f}else if(a>d){let f=2*Math.sqrt(1+a-n-d);this._w=(r-c)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(l+h)/f}else{let f=2*Math.sqrt(1+d-n-a);this._w=(o-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(jt(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,s=t._y,r=t._z,o=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-s*a,this._w=o*h-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let n=t._x,s=t._y,r=t._z,o=t._w,a=this.dot(t);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-e;if(a<.9995){let c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},D=class i{static{i.prototype.isVector3=!0}constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(km.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(km.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(t){let e=this.x,n=this.y,s=this.z,r=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*s-a*n),h=2*(a*e-r*s),d=2*(r*n-o*e);return this.x=e+l*c+o*d-a*h,this.y=n+l*h+a*c-r*d,this.z=s+l*d+r*h-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=jt(this.x,t.x,e.x),this.y=jt(this.y,t.y,e.y),this.z=jt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=jt(this.x,t,e),this.y=jt(this.y,t,e),this.z=jt(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(jt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,s=t.y,r=t.z,o=e.x,a=e.y,l=e.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Yu.copy(this).projectOnVector(t),this.sub(Yu)}reflect(t){return this.sub(Yu.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(jt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Yu=new D,km=new ai,Ht=class i{static{i.prototype.isMatrix3=!0}constructor(t,e,n,s,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c)}set(t,e,n,s,r,o,a,l,c){let h=this.elements;return h[0]=t,h[1]=s,h[2]=a,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],d=n[7],u=n[2],f=n[5],x=n[8],g=s[0],p=s[3],m=s[6],v=s[1],E=s[4],M=s[7],T=s[2],w=s[5],C=s[8];return r[0]=o*g+a*v+l*T,r[3]=o*p+a*E+l*w,r[6]=o*m+a*M+l*C,r[1]=c*g+h*v+d*T,r[4]=c*p+h*E+d*w,r[7]=c*m+h*M+d*C,r[2]=u*g+f*v+x*T,r[5]=u*p+f*E+x*w,r[8]=u*m+f*M+x*C,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*o*h-e*a*c-n*r*h+n*a*l+s*r*c-s*o*l}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],d=h*o-a*c,u=a*l-h*r,f=c*r-o*l,x=e*d+n*u+s*f;if(x===0)return this.set(0,0,0,0,0,0,0,0,0);let g=1/x;return t[0]=d*g,t[1]=(s*c-h*n)*g,t[2]=(a*n-s*o)*g,t[3]=u*g,t[4]=(h*e-s*l)*g,t[5]=(s*r-a*e)*g,t[6]=f*g,t[7]=(n*l-c*e)*g,t[8]=(o*e-n*r)*g,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+t,-s*c,s*l,-s*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return As("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(ju.makeScale(t,e)),this}rotate(t){return As("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(ju.makeRotation(-t)),this}translate(t,e){return As("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(ju.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}},ju=new Ht,Lm=new Ht().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Dm=new Ht().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function p_(){let i={enabled:!0,workingColorSpace:Vo,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===se&&(s.r=Ri(s.r),s.g=Ri(s.g),s.b=Ri(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===se&&(s.r=Sr(s.r),s.g=Sr(s.g),s.b=Sr(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Ii?Wo:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return As("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return As("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Vo]:{primaries:t,whitePoint:n,transfer:Wo,toXYZ:Lm,fromXYZ:Dm,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:Ae},outputColorSpaceConfig:{drawingBufferColorSpace:Ae}},[Ae]:{primaries:t,whitePoint:n,transfer:se,toXYZ:Lm,fromXYZ:Dm,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:Ae}}}),i}var Yt=p_();function Ri(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Sr(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var or,Jl=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{or===void 0&&(or=Xo("canvas")),or.width=t.width,or.height=t.height;let s=or.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=or}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=Xo("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Ri(r[o]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Ri(e[n]/255)*255):e[n]=Ri(e[n]);return{data:e,width:t.width,height:t.height}}else return Ot("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},m_=0,Ar=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:m_++}),this.uuid=qi(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(Ku(s[o].image)):r.push(Ku(s[o]))}else r=Ku(s);n.url=r}return e||(t.images[this.uuid]=n),n}};function Ku(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Jl.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Ot("Texture: Unable to serialize Texture."),{})}var g_=0,Ju=new D,Ve=class i extends oi{constructor(t=i.DEFAULT_IMAGE,e=i.DEFAULT_MAPPING,n=si,s=si,r=ze,o=hi,a=vn,l=_n,c=i.DEFAULT_ANISOTROPY,h=Ii){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:g_++}),this.uuid=qi(),this.name="",this.source=new Ar(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new bt(0,0),this.repeat=new bt(1,1),this.center=new bt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ht,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Ju).x}get height(){return this.source.getSize(Ju).y}get depth(){return this.source.getSize(Ju).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){Ot(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Ot(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==zd)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Yl:t.x=t.x-Math.floor(t.x);break;case si:t.x=t.x<0?0:1;break;case jl:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Yl:t.y=t.y-Math.floor(t.y);break;case si:t.y=t.y<0?0:1;break;case jl:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};Ve.DEFAULT_IMAGE=null;Ve.DEFAULT_MAPPING=zd;Ve.DEFAULT_ANISOTROPY=1;var _e=class i{static{i.prototype.isVector4=!0}constructor(t=0,e=0,n=0,s=1){this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*n+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r,l=t.elements,c=l[0],h=l[4],d=l[8],u=l[1],f=l[5],x=l[9],g=l[2],p=l[6],m=l[10];if(Math.abs(h-u)<.01&&Math.abs(d-g)<.01&&Math.abs(x-p)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+g)<.1&&Math.abs(x+p)<.1&&Math.abs(c+f+m-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let E=(c+1)/2,M=(f+1)/2,T=(m+1)/2,w=(h+u)/4,C=(d+g)/4,_=(x+p)/4;return E>M&&E>T?E<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(E),s=w/n,r=C/n):M>T?M<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(M),n=w/s,r=_/s):T<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(T),n=C/r,s=_/r),this.set(n,s,r,e),this}let v=Math.sqrt((p-x)*(p-x)+(d-g)*(d-g)+(u-h)*(u-h));return Math.abs(v)<.001&&(v=1),this.x=(p-x)/v,this.y=(d-g)/v,this.z=(u-h)/v,this.w=Math.acos((c+f+m-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=jt(this.x,t.x,e.x),this.y=jt(this.y,t.y,e.y),this.z=jt(this.z,t.z,e.z),this.w=jt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=jt(this.x,t,e),this.y=jt(this.y,t,e),this.z=jt(this.z,t,e),this.w=jt(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(jt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Ql=class extends oi{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:ze,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new _e(0,0,t,e),this.scissorTest=!1,this.viewport=new _e(0,0,t,e),this.textures=[];let s={width:t,height:e,depth:n.depth},r=new Ve(s),o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:ze,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new Ar(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Ce=class extends Ql{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},qo=class extends Ve{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=je,this.minFilter=je,this.wrapR=si,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var tc=class extends Ve{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=je,this.minFilter=je,this.wrapR=si,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var de=class i{static{i.prototype.isMatrix4=!0}constructor(t,e,n,s,r,o,a,l,c,h,d,u,f,x,g,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c,h,d,u,f,x,g,p)}set(t,e,n,s,r,o,a,l,c,h,d,u,f,x,g,p){let m=this.elements;return m[0]=t,m[4]=e,m[8]=n,m[12]=s,m[1]=r,m[5]=o,m[9]=a,m[13]=l,m[2]=c,m[6]=h,m[10]=d,m[14]=u,m[3]=f,m[7]=x,m[11]=g,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,s=1/ar.setFromMatrixColumn(t,0).length(),r=1/ar.setFromMatrixColumn(t,1).length(),o=1/ar.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,s=t.y,r=t.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),d=Math.sin(r);if(t.order==="XYZ"){let u=o*h,f=o*d,x=a*h,g=a*d;e[0]=l*h,e[4]=-l*d,e[8]=c,e[1]=f+x*c,e[5]=u-g*c,e[9]=-a*l,e[2]=g-u*c,e[6]=x+f*c,e[10]=o*l}else if(t.order==="YXZ"){let u=l*h,f=l*d,x=c*h,g=c*d;e[0]=u+g*a,e[4]=x*a-f,e[8]=o*c,e[1]=o*d,e[5]=o*h,e[9]=-a,e[2]=f*a-x,e[6]=g+u*a,e[10]=o*l}else if(t.order==="ZXY"){let u=l*h,f=l*d,x=c*h,g=c*d;e[0]=u-g*a,e[4]=-o*d,e[8]=x+f*a,e[1]=f+x*a,e[5]=o*h,e[9]=g-u*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){let u=o*h,f=o*d,x=a*h,g=a*d;e[0]=l*h,e[4]=x*c-f,e[8]=u*c+g,e[1]=l*d,e[5]=g*c+u,e[9]=f*c-x,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){let u=o*l,f=o*c,x=a*l,g=a*c;e[0]=l*h,e[4]=g-u*d,e[8]=x*d+f,e[1]=d,e[5]=o*h,e[9]=-a*h,e[2]=-c*h,e[6]=f*d+x,e[10]=u-g*d}else if(t.order==="XZY"){let u=o*l,f=o*c,x=a*l,g=a*c;e[0]=l*h,e[4]=-d,e[8]=c*h,e[1]=u*d+g,e[5]=o*h,e[9]=f*d-x,e[2]=x*d-f,e[6]=a*h,e[10]=g*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(x_,t,y_)}lookAt(t,e,n){let s=this.elements;return wn.subVectors(t,e),wn.lengthSq()===0&&(wn.z=1),wn.normalize(),Vi.crossVectors(n,wn),Vi.lengthSq()===0&&(Math.abs(n.z)===1?wn.x+=1e-4:wn.z+=1e-4,wn.normalize(),Vi.crossVectors(n,wn)),Vi.normalize(),gl.crossVectors(wn,Vi),s[0]=Vi.x,s[4]=gl.x,s[8]=wn.x,s[1]=Vi.y,s[5]=gl.y,s[9]=wn.y,s[2]=Vi.z,s[6]=gl.z,s[10]=wn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],d=n[5],u=n[9],f=n[13],x=n[2],g=n[6],p=n[10],m=n[14],v=n[3],E=n[7],M=n[11],T=n[15],w=s[0],C=s[4],_=s[8],S=s[12],R=s[1],P=s[5],k=s[9],B=s[13],I=s[2],F=s[6],V=s[10],Z=s[14],nt=s[3],$=s[7],K=s[11],et=s[15];return r[0]=o*w+a*R+l*I+c*nt,r[4]=o*C+a*P+l*F+c*$,r[8]=o*_+a*k+l*V+c*K,r[12]=o*S+a*B+l*Z+c*et,r[1]=h*w+d*R+u*I+f*nt,r[5]=h*C+d*P+u*F+f*$,r[9]=h*_+d*k+u*V+f*K,r[13]=h*S+d*B+u*Z+f*et,r[2]=x*w+g*R+p*I+m*nt,r[6]=x*C+g*P+p*F+m*$,r[10]=x*_+g*k+p*V+m*K,r[14]=x*S+g*B+p*Z+m*et,r[3]=v*w+E*R+M*I+T*nt,r[7]=v*C+E*P+M*F+T*$,r[11]=v*_+E*k+M*V+T*K,r[15]=v*S+E*B+M*Z+T*et,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],o=t[1],a=t[5],l=t[9],c=t[13],h=t[2],d=t[6],u=t[10],f=t[14],x=t[3],g=t[7],p=t[11],m=t[15],v=l*f-c*u,E=a*f-c*d,M=a*u-l*d,T=o*f-c*h,w=o*u-l*h,C=o*d-a*h;return e*(g*v-p*E+m*M)-n*(x*v-p*T+m*w)+s*(x*E-g*T+m*C)-r*(x*M-g*w+p*C)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[1],o=t[5],a=t[9],l=t[2],c=t[6],h=t[10];return e*(o*h-a*c)-n*(r*h-a*l)+s*(r*c-o*l)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],d=t[9],u=t[10],f=t[11],x=t[12],g=t[13],p=t[14],m=t[15],v=e*a-n*o,E=e*l-s*o,M=e*c-r*o,T=n*l-s*a,w=n*c-r*a,C=s*c-r*l,_=h*g-d*x,S=h*p-u*x,R=h*m-f*x,P=d*p-u*g,k=d*m-f*g,B=u*m-f*p,I=v*B-E*k+M*P+T*R-w*S+C*_;if(I===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let F=1/I;return t[0]=(a*B-l*k+c*P)*F,t[1]=(s*k-n*B-r*P)*F,t[2]=(g*C-p*w+m*T)*F,t[3]=(u*w-d*C-f*T)*F,t[4]=(l*R-o*B-c*S)*F,t[5]=(e*B-s*R+r*S)*F,t[6]=(p*M-x*C-m*E)*F,t[7]=(h*C-u*M+f*E)*F,t[8]=(o*k-a*R+c*_)*F,t[9]=(n*R-e*k-r*_)*F,t[10]=(x*w-g*M+m*v)*F,t[11]=(d*M-h*w-f*v)*F,t[12]=(a*S-o*P-l*_)*F,t[13]=(e*P-n*S+s*_)*F,t[14]=(g*E-x*T-p*v)*F,t[15]=(h*T-d*E+u*v)*F,this}scale(t){let e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),s=Math.sin(e),r=1-n,o=t.x,a=t.y,l=t.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+n,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,o){return this.set(1,n,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){let s=this.elements,r=e._x,o=e._y,a=e._z,l=e._w,c=r+r,h=o+o,d=a+a,u=r*c,f=r*h,x=r*d,g=o*h,p=o*d,m=a*d,v=l*c,E=l*h,M=l*d,T=n.x,w=n.y,C=n.z;return s[0]=(1-(g+m))*T,s[1]=(f+M)*T,s[2]=(x-E)*T,s[3]=0,s[4]=(f-M)*w,s[5]=(1-(u+m))*w,s[6]=(p+v)*w,s[7]=0,s[8]=(x+E)*C,s[9]=(p-v)*C,s[10]=(1-(u+g))*C,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let o=ar.set(s[0],s[1],s[2]).length(),a=ar.set(s[4],s[5],s[6]).length(),l=ar.set(s[8],s[9],s[10]).length();r<0&&(o=-o),Hn.copy(this);let c=1/o,h=1/a,d=1/l;return Hn.elements[0]*=c,Hn.elements[1]*=c,Hn.elements[2]*=c,Hn.elements[4]*=h,Hn.elements[5]*=h,Hn.elements[6]*=h,Hn.elements[8]*=d,Hn.elements[9]*=d,Hn.elements[10]*=d,e.setFromRotationMatrix(Hn),n.x=o,n.y=a,n.z=l,this}makePerspective(t,e,n,s,r,o,a=Wn,l=!1){let c=this.elements,h=2*r/(e-t),d=2*r/(n-s),u=(e+t)/(e-t),f=(n+s)/(n-s),x,g;if(l)x=r/(o-r),g=o*r/(o-r);else if(a===Wn)x=-(o+r)/(o-r),g=-2*o*r/(o-r);else if(a===Tr)x=-o/(o-r),g=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=d,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=x,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,o,a=Wn,l=!1){let c=this.elements,h=2/(e-t),d=2/(n-s),u=-(e+t)/(e-t),f=-(n+s)/(n-s),x,g;if(l)x=1/(o-r),g=o/(o-r);else if(a===Wn)x=-2/(o-r),g=-(o+r)/(o-r);else if(a===Tr)x=-1/(o-r),g=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=d,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=x,c[14]=g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}},ar=new D,Hn=new de,x_=new D(0,0,0),y_=new D(1,1,1),Vi=new D,gl=new D,wn=new D,Nm=new de,Om=new ai,Pi=class i{constructor(t=0,e=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let s=t.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],d=s[2],u=s[6],f=s[10];switch(e){case"XYZ":this._y=Math.asin(jt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-jt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(jt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-jt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(jt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-jt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Ot("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return Nm.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Nm,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Om.setFromEuler(this),this.setFromQuaternion(Om,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Pi.DEFAULT_ORDER="XYZ";var Cr=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},__=0,Um=new D,lr=new ai,Si=new de,xl=new D,No=new D,v_=new D,M_=new ai,Fm=new D(1,0,0),Bm=new D(0,1,0),zm=new D(0,0,1),Hm={type:"added"},b_={type:"removed"},cr={type:"childadded",child:null},Qu={type:"childremoved",child:null},tn=class i extends oi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:__++}),this.uuid=qi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let t=new D,e=new Pi,n=new ai,s=new D(1,1,1);function r(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new de},normalMatrix:{value:new Ht}}),this.matrix=new de,this.matrixWorld=new de,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Cr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return lr.setFromAxisAngle(t,e),this.quaternion.multiply(lr),this}rotateOnWorldAxis(t,e){return lr.setFromAxisAngle(t,e),this.quaternion.premultiply(lr),this}rotateX(t){return this.rotateOnAxis(Fm,t)}rotateY(t){return this.rotateOnAxis(Bm,t)}rotateZ(t){return this.rotateOnAxis(zm,t)}translateOnAxis(t,e){return Um.copy(t).applyQuaternion(this.quaternion),this.position.add(Um.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Fm,t)}translateY(t){return this.translateOnAxis(Bm,t)}translateZ(t){return this.translateOnAxis(zm,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Si.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?xl.copy(t):xl.set(t,e,n);let s=this.parent;this.updateWorldMatrix(!0,!1),No.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Si.lookAt(No,xl,this.up):Si.lookAt(xl,No,this.up),this.quaternion.setFromRotationMatrix(Si),s&&(Si.extractRotation(s.matrixWorld),lr.setFromRotationMatrix(Si),this.quaternion.premultiply(lr.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(Nt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Hm),cr.child=t,this.dispatchEvent(cr),cr.child=null):Nt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(b_),Qu.child=t,this.dispatchEvent(Qu),Qu.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Si.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Si.multiply(t.parent.matrixWorld)),t.applyMatrix4(Si),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Hm),cr.child=t,this.dispatchEvent(cr),cr.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){let o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(No,t,v_),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(No,M_,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,n=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*s,r[13]+=n-r[1]*e-r[5]*n-r[9]*s,r[14]+=s-r[2]*e-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){let r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let d=l[c];r(t.shapes,d)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(t.materials,this.material[l]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];s.animations.push(r(t.animations,l))}}if(e){let a=o(t.geometries),l=o(t.materials),c=o(t.textures),h=o(t.images),d=o(t.shapes),u=o(t.skeletons),f=o(t.animations),x=o(t.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),x.length>0&&(n.nodes=x)}return n.object=s,n;function o(a){let l=[];for(let c in a){let h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let s=t.children[n];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};tn.DEFAULT_UP=new D(0,1,0);tn.DEFAULT_MATRIX_AUTO_UPDATE=!0;tn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Ge=class extends tn{constructor(){super(),this.isGroup=!0,this.type="Group"}},S_={type:"move"},Rr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ge,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ge,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new D,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new D),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ge,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new D,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new D,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(let g of t.hand.values()){let p=e.getJointPose(g,n),m=this._getHandJoint(c,g);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}let h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,x=.005;c.inputState.pinching&&u>f+x?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&u<=f-x&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));a!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(S_)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new Ge;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}},Hg={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Wi={h:0,s:0,l:0},yl={h:0,s:0,l:0};function td(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}var Ct=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Ae){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Yt.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=Yt.workingColorSpace){return this.r=t,this.g=e,this.b=n,Yt.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=Yt.workingColorSpace){if(t=f_(t,1),e=jt(e,0,1),n=jt(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,o=2*n-r;this.r=td(o,r,t+1/3),this.g=td(o,r,t),this.b=td(o,r,t-1/3)}return Yt.colorSpaceToWorking(this,s),this}setStyle(t,e=Ae){function n(r){r!==void 0&&parseFloat(r)<1&&Ot("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Ot("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);Ot("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Ae){let n=Hg[t.toLowerCase()];return n!==void 0?this.setHex(n,e):Ot("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Ri(t.r),this.g=Ri(t.g),this.b=Ri(t.b),this}copyLinearToSRGB(t){return this.r=Sr(t.r),this.g=Sr(t.g),this.b=Sr(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Ae){return Yt.workingToColorSpace(an.copy(this),t),Math.round(jt(an.r*255,0,255))*65536+Math.round(jt(an.g*255,0,255))*256+Math.round(jt(an.b*255,0,255))}getHexString(t=Ae){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Yt.workingColorSpace){Yt.workingToColorSpace(an.copy(this),e);let n=an.r,s=an.g,r=an.b,o=Math.max(n,s,r),a=Math.min(n,s,r),l,c,h=(a+o)/2;if(a===o)l=0,c=0;else{let d=o-a;switch(c=h<=.5?d/(o+a):d/(2-o-a),o){case n:l=(s-r)/d+(s<r?6:0);break;case s:l=(r-n)/d+2;break;case r:l=(n-s)/d+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=Yt.workingColorSpace){return Yt.workingToColorSpace(an.copy(this),e),t.r=an.r,t.g=an.g,t.b=an.b,t}getStyle(t=Ae){Yt.workingToColorSpace(an.copy(this),t);let e=an.r,n=an.g,s=an.b;return t!==Ae?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(Wi),this.setHSL(Wi.h+t,Wi.s+e,Wi.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Wi),t.getHSL(yl);let n=qu(Wi.h,yl.h,e),s=qu(Wi.s,yl.s,e),r=qu(Wi.l,yl.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},an=new Ct;Ct.NAMES=Hg;var Yo=class extends tn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Pi,this.environmentIntensity=1,this.environmentRotation=new Pi,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},Gn=new D,wi=new D,ed=new D,Ti=new D,hr=new D,ur=new D,Gm=new D,nd=new D,id=new D,sd=new D,rd=new _e,od=new _e,ad=new _e,Ci=class i{constructor(t=new D,e=new D,n=new D){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),Gn.subVectors(t,e),s.cross(Gn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){Gn.subVectors(s,e),wi.subVectors(n,e),ed.subVectors(t,e);let o=Gn.dot(Gn),a=Gn.dot(wi),l=Gn.dot(ed),c=wi.dot(wi),h=wi.dot(ed),d=o*c-a*a;if(d===0)return r.set(0,0,0),null;let u=1/d,f=(c*l-a*h)*u,x=(o*h-a*l)*u;return r.set(1-f-x,x,f)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,Ti)===null?!1:Ti.x>=0&&Ti.y>=0&&Ti.x+Ti.y<=1}static getInterpolation(t,e,n,s,r,o,a,l){return this.getBarycoord(t,e,n,s,Ti)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Ti.x),l.addScaledVector(o,Ti.y),l.addScaledVector(a,Ti.z),l)}static getInterpolatedAttribute(t,e,n,s,r,o){return rd.setScalar(0),od.setScalar(0),ad.setScalar(0),rd.fromBufferAttribute(t,e),od.fromBufferAttribute(t,n),ad.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(rd,r.x),o.addScaledVector(od,r.y),o.addScaledVector(ad,r.z),o}static isFrontFacing(t,e,n,s){return Gn.subVectors(n,e),wi.subVectors(t,e),Gn.cross(wi).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Gn.subVectors(this.c,this.b),wi.subVectors(this.a,this.b),Gn.cross(wi).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return i.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,s=this.b,r=this.c,o,a;hr.subVectors(s,n),ur.subVectors(r,n),nd.subVectors(t,n);let l=hr.dot(nd),c=ur.dot(nd);if(l<=0&&c<=0)return e.copy(n);id.subVectors(t,s);let h=hr.dot(id),d=ur.dot(id);if(h>=0&&d<=h)return e.copy(s);let u=l*d-h*c;if(u<=0&&l>=0&&h<=0)return o=l/(l-h),e.copy(n).addScaledVector(hr,o);sd.subVectors(t,r);let f=hr.dot(sd),x=ur.dot(sd);if(x>=0&&f<=x)return e.copy(r);let g=f*c-l*x;if(g<=0&&c>=0&&x<=0)return a=c/(c-x),e.copy(n).addScaledVector(ur,a);let p=h*x-f*d;if(p<=0&&d-h>=0&&f-x>=0)return Gm.subVectors(r,s),a=(d-h)/(d-h+(f-x)),e.copy(s).addScaledVector(Gm,a);let m=1/(p+g+u);return o=g*m,a=u*m,e.copy(n).addScaledVector(hr,o).addScaledVector(ur,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},Yi=class{constructor(t=new D(1/0,1/0,1/0),e=new D(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(Vn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(Vn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=Vn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,Vn):Vn.fromBufferAttribute(r,o),Vn.applyMatrix4(t.matrixWorld),this.expandByPoint(Vn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),_l.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),_l.copy(n.boundingBox)),_l.applyMatrix4(t.matrixWorld),this.union(_l)}let s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Vn),Vn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Oo),vl.subVectors(this.max,Oo),dr.subVectors(t.a,Oo),fr.subVectors(t.b,Oo),pr.subVectors(t.c,Oo),Xi.subVectors(fr,dr),$i.subVectors(pr,fr),Ss.subVectors(dr,pr);let e=[0,-Xi.z,Xi.y,0,-$i.z,$i.y,0,-Ss.z,Ss.y,Xi.z,0,-Xi.x,$i.z,0,-$i.x,Ss.z,0,-Ss.x,-Xi.y,Xi.x,0,-$i.y,$i.x,0,-Ss.y,Ss.x,0];return!ld(e,dr,fr,pr,vl)||(e=[1,0,0,0,1,0,0,0,1],!ld(e,dr,fr,pr,vl))?!1:(Ml.crossVectors(Xi,$i),e=[Ml.x,Ml.y,Ml.z],ld(e,dr,fr,pr,vl))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Vn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Vn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Ei[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Ei[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Ei[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Ei[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Ei[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Ei[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Ei[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Ei[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Ei),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},Ei=[new D,new D,new D,new D,new D,new D,new D,new D],Vn=new D,_l=new Yi,dr=new D,fr=new D,pr=new D,Xi=new D,$i=new D,Ss=new D,Oo=new D,vl=new D,Ml=new D,ws=new D;function ld(i,t,e,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){ws.fromArray(i,r);let a=s.x*Math.abs(ws.x)+s.y*Math.abs(ws.y)+s.z*Math.abs(ws.z),l=t.dot(ws),c=e.dot(ws),h=n.dot(ws);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}var Fe=new D,bl=new bt,w_=0,Be=class extends oi{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:w_++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=qd,this.updateRanges=[],this.gpuType=qn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)bl.fromBufferAttribute(this,e),bl.applyMatrix3(t),this.setXY(e,bl.x,bl.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Fe.fromBufferAttribute(this,e),Fe.applyMatrix3(t),this.setXYZ(e,Fe.x,Fe.y,Fe.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Fe.fromBufferAttribute(this,e),Fe.applyMatrix4(t),this.setXYZ(e,Fe.x,Fe.y,Fe.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Fe.fromBufferAttribute(this,e),Fe.applyNormalMatrix(t),this.setXYZ(e,Fe.x,Fe.y,Fe.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Fe.fromBufferAttribute(this,e),Fe.transformDirection(t),this.setXYZ(e,Fe.x,Fe.y,Fe.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=ii(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=ae(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=ii(e,this.array)),e}setX(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=ii(e,this.array)),e}setY(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=ii(e,this.array)),e}setZ(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=ii(e,this.array)),e}setW(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array),s=ae(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array),s=ae(s,this.array),r=ae(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}};var jo=class extends Be{constructor(t,e,n){super(new Uint16Array(t),e,n)}};var Ko=class extends Be{constructor(t,e,n){super(new Uint32Array(t),e,n)}};var Jt=class extends Be{constructor(t,e,n){super(new Float32Array(t),e,n)}},T_=new Yi,Uo=new D,cd=new D,Cs=class{constructor(t=new D,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):T_.setFromPoints(t).getCenter(n);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Uo.subVectors(t,this.center);let e=Uo.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(Uo,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(cd.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Uo.copy(t.center).add(cd)),this.expandByPoint(Uo.copy(t.center).sub(cd))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},E_=0,Ln=new de,hd=new tn,mr=new D,Tn=new Yi,Fo=new Yi,qe=new D,ve=class i extends oi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:E_++}),this.uuid=qi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(u_(t)?Ko:jo)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Ht().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return Ln.makeRotationFromQuaternion(t),this.applyMatrix4(Ln),this}rotateX(t){return Ln.makeRotationX(t),this.applyMatrix4(Ln),this}rotateY(t){return Ln.makeRotationY(t),this.applyMatrix4(Ln),this}rotateZ(t){return Ln.makeRotationZ(t),this.applyMatrix4(Ln),this}translate(t,e,n){return Ln.makeTranslation(t,e,n),this.applyMatrix4(Ln),this}scale(t,e,n){return Ln.makeScale(t,e,n),this.applyMatrix4(Ln),this}lookAt(t){return hd.lookAt(t),hd.updateMatrix(),this.applyMatrix4(hd.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(mr).negate(),this.translate(mr.x,mr.y,mr.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let s=0,r=t.length;s<r;s++){let o=t[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Jt(n,3))}else{let n=Math.min(t.length,e.count);for(let s=0;s<n;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&Ot("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Yi);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new D(-1/0,-1/0,-1/0),new D(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){let r=e[n];Tn.setFromBufferAttribute(r),this.morphTargetsRelative?(qe.addVectors(this.boundingBox.min,Tn.min),this.boundingBox.expandByPoint(qe),qe.addVectors(this.boundingBox.max,Tn.max),this.boundingBox.expandByPoint(qe)):(this.boundingBox.expandByPoint(Tn.min),this.boundingBox.expandByPoint(Tn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Nt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Cs);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new D,1/0);return}if(t){let n=this.boundingSphere.center;if(Tn.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){let a=e[r];Fo.setFromBufferAttribute(a),this.morphTargetsRelative?(qe.addVectors(Tn.min,Fo.min),Tn.expandByPoint(qe),qe.addVectors(Tn.max,Fo.max),Tn.expandByPoint(qe)):(Tn.expandByPoint(Fo.min),Tn.expandByPoint(Fo.max))}Tn.getCenter(n);let s=0;for(let r=0,o=t.count;r<o;r++)qe.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(qe));if(e)for(let r=0,o=e.length;r<o;r++){let a=e[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)qe.fromBufferAttribute(a,c),l&&(mr.fromBufferAttribute(t,c),qe.add(mr)),s=Math.max(s,n.distanceToSquared(qe))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Nt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Nt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,s=e.normal,r=e.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new Be(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));let a=[],l=[];for(let _=0;_<n.count;_++)a[_]=new D,l[_]=new D;let c=new D,h=new D,d=new D,u=new bt,f=new bt,x=new bt,g=new D,p=new D;function m(_,S,R){c.fromBufferAttribute(n,_),h.fromBufferAttribute(n,S),d.fromBufferAttribute(n,R),u.fromBufferAttribute(r,_),f.fromBufferAttribute(r,S),x.fromBufferAttribute(r,R),h.sub(c),d.sub(c),f.sub(u),x.sub(u);let P=1/(f.x*x.y-x.x*f.y);isFinite(P)&&(g.copy(h).multiplyScalar(x.y).addScaledVector(d,-f.y).multiplyScalar(P),p.copy(d).multiplyScalar(f.x).addScaledVector(h,-x.x).multiplyScalar(P),a[_].add(g),a[S].add(g),a[R].add(g),l[_].add(p),l[S].add(p),l[R].add(p))}let v=this.groups;v.length===0&&(v=[{start:0,count:t.count}]);for(let _=0,S=v.length;_<S;++_){let R=v[_],P=R.start,k=R.count;for(let B=P,I=P+k;B<I;B+=3)m(t.getX(B+0),t.getX(B+1),t.getX(B+2))}let E=new D,M=new D,T=new D,w=new D;function C(_){T.fromBufferAttribute(s,_),w.copy(T);let S=a[_];E.copy(S),E.sub(T.multiplyScalar(T.dot(S))).normalize(),M.crossVectors(w,S);let P=M.dot(l[_])<0?-1:1;o.setXYZW(_,E.x,E.y,E.z,P)}for(let _=0,S=v.length;_<S;++_){let R=v[_],P=R.start,k=R.count;for(let B=P,I=P+k;B<I;B+=3)C(t.getX(B+0)),C(t.getX(B+1)),C(t.getX(B+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new Be(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);let s=new D,r=new D,o=new D,a=new D,l=new D,c=new D,h=new D,d=new D;if(t)for(let u=0,f=t.count;u<f;u+=3){let x=t.getX(u+0),g=t.getX(u+1),p=t.getX(u+2);s.fromBufferAttribute(e,x),r.fromBufferAttribute(e,g),o.fromBufferAttribute(e,p),h.subVectors(o,r),d.subVectors(s,r),h.cross(d),a.fromBufferAttribute(n,x),l.fromBufferAttribute(n,g),c.fromBufferAttribute(n,p),a.add(h),l.add(h),c.add(h),n.setXYZ(x,a.x,a.y,a.z),n.setXYZ(g,l.x,l.y,l.z),n.setXYZ(p,c.x,c.y,c.z)}else for(let u=0,f=e.count;u<f;u+=3)s.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),o.fromBufferAttribute(e,u+2),h.subVectors(o,r),d.subVectors(s,r),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)qe.fromBufferAttribute(t,e),qe.normalize(),t.setXYZ(e,qe.x,qe.y,qe.z)}toNonIndexed(){function t(a,l){let c=a.array,h=a.itemSize,d=a.normalized,u=new c.constructor(l.length*h),f=0,x=0;for(let g=0,p=l.length;g<p;g++){a.isInterleavedBufferAttribute?f=l[g]*a.data.stride+a.offset:f=l[g]*h;for(let m=0;m<h;m++)u[x++]=c[f++]}return new Be(u,h,d)}if(this.index===null)return Ot("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new i,n=this.index.array,s=this.attributes;for(let a in s){let l=s[a],c=t(l,n);e.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let h=0,d=c.length;h<d;h++){let u=c[h],f=t(u,n);l.push(f)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let l in n){let c=n[l];t.data.attributes[l]=c.toJSON(t.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let d=0,u=c.length;d<u;d++){let f=c[d];h.push(f.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let s=t.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(e))}let r=t.morphAttributes;for(let c in r){let h=[],d=r[c];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let o=t.groups;for(let c=0,h=o.length;c<h;c++){let d=o[c];this.addGroup(d.start,d.count,d.materialIndex)}let a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}},ec=class{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=qd,this.updateRanges=[],this.version=0,this.uuid=qi()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,n){t*=this.stride,n*=e.stride;for(let s=0,r=this.stride;s<r;s++)this.array[t+s]=e.array[n+s];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=qi()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let e=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(e,this.stride);return n.setUsage(this.usage),n}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=qi()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer)));let e={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return e.usage=this.usage,e}},un=new D,Jo=class i{constructor(t,e,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,n=this.data.count;e<n;e++)un.fromBufferAttribute(this,e),un.applyMatrix4(t),this.setXYZ(e,un.x,un.y,un.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)un.fromBufferAttribute(this,e),un.applyNormalMatrix(t),this.setXYZ(e,un.x,un.y,un.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)un.fromBufferAttribute(this,e),un.transformDirection(t),this.setXYZ(e,un.x,un.y,un.z);return this}getComponent(t,e){let n=this.array[t*this.data.stride+this.offset+e];return this.normalized&&(n=ii(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=ae(n,this.array)),this.data.array[t*this.data.stride+this.offset+e]=n,this}setX(t,e){return this.normalized&&(e=ae(e,this.array)),this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.normalized&&(e=ae(e,this.array)),this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.normalized&&(e=ae(e,this.array)),this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.normalized&&(e=ae(e,this.array)),this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(e=ii(e,this.array)),e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(e=ii(e,this.array)),e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(e=ii(e,this.array)),e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(e=ii(e,this.array)),e}setXY(t,e,n){return t=t*this.data.stride+this.offset,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this}setXYZ(t,e,n,s){return t=t*this.data.stride+this.offset,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array),s=ae(s,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t=t*this.data.stride+this.offset,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array),s=ae(s,this.array),r=ae(r,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=s,this.data.array[t+3]=r,this}clone(t){if(t===void 0){$o("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return new Be(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new i(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){$o("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},ud=new D,A_=new D,C_=new Ht,xn=class{constructor(t=new D(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let s=ud.subVectors(n,e).cross(A_.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let s=t.delta(ud),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let o=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:e.copy(t.start).addScaledVector(s,o)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||C_.getNormalMatrix(t),s=this.coplanarPoint(ud).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},R_=0,Xn=class extends oi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:R_++}),this.uuid=qi(),this.name="",this.type="Material",this.blending=ns,this.side=es,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Pd,this.blendDst=Id,this.blendEquation=ks,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ct(0,0,0),this.blendAlpha=0,this.depthFunc=wr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Pg,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Hl,this.stencilZFail=Hl,this.stencilZPass=Hl,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){Ot(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Ot(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(e){let r=s(t.textures),o=s(t.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new Ct().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new xn().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new bt().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new bt().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}},$n=class extends Xn{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Ct(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},gr,Bo=new D,xr=new D,yr=new D,_r=new bt,zo=new bt,Gg=new de,Sl=new D,Ho=new D,wl=new D,Vm=new bt,dd=new bt,Wm=new bt,li=class extends tn{constructor(t=new $n){if(super(),this.isSprite=!0,this.type="Sprite",gr===void 0){gr=new ve;let e=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new ec(e,5);gr.setIndex([0,1,2,0,2,3]),gr.setAttribute("position",new Jo(n,3,0,!1)),gr.setAttribute("uv",new Jo(n,2,3,!1))}this.geometry=gr,this.material=t,this.center=new bt(.5,.5),this.count=1}intersectsFrustum(t){return t.intersectsSprite(this)}raycast(t,e){t.camera===null&&Nt('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),xr.setFromMatrixScale(this.matrixWorld),Gg.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),yr.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&xr.multiplyScalar(-yr.z);let n=this.material.rotation,s,r;n!==0&&(r=Math.cos(n),s=Math.sin(n));let o=this.center;Tl(Sl.set(-.5,-.5,0),yr,o,xr,s,r),Tl(Ho.set(.5,-.5,0),yr,o,xr,s,r),Tl(wl.set(.5,.5,0),yr,o,xr,s,r),Vm.set(0,0),dd.set(1,0),Wm.set(1,1);let a=t.ray.intersectTriangle(Sl,Ho,wl,!1,Bo);if(a===null&&(Tl(Ho.set(-.5,.5,0),yr,o,xr,s,r),dd.set(0,1),a=t.ray.intersectTriangle(Sl,wl,Ho,!1,Bo),a===null))return;let l=t.ray.origin.distanceTo(Bo);l<t.near||l>t.far||e.push({distance:l,point:Bo.clone(),uv:Ci.getInterpolation(Bo,Sl,Ho,wl,Vm,dd,Wm,new bt),face:null,object:this})}copy(t,e){return super.copy(t,e),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}};function Tl(i,t,e,n,s,r){_r.subVectors(i,e).addScalar(.5).multiply(n),s!==void 0?(zo.x=r*_r.x-s*_r.y,zo.y=s*_r.x+r*_r.y):zo.copy(_r),i.copy(t),i.x+=zo.x,i.y+=zo.y,i.applyMatrix4(Gg)}var Ai=new D,fd=new D,El=new D,Al=new D,Pr=class{constructor(t=new D,e=new D(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Ai)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=Ai.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Ai.copy(this.origin).addScaledVector(this.direction,e),Ai.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){fd.copy(t).add(e).multiplyScalar(.5),El.copy(e).sub(t).normalize(),Al.copy(this.origin).sub(fd);let r=t.distanceTo(e)*.5,o=-this.direction.dot(El),a=Al.dot(this.direction),l=-Al.dot(El),c=Al.lengthSq(),h=Math.abs(1-o*o),d,u,f,x;if(h>0)if(d=o*l-a,u=o*a-l,x=r*h,d>=0)if(u>=-x)if(u<=x){let g=1/h;d*=g,u*=g,f=d*(d+o*u+2*a)+u*(o*d+u+2*l)+c}else u=r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;else u=-r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;else u<=-x?(d=Math.max(0,-(-o*r+a)),u=d>0?-r:Math.min(Math.max(-r,-l),r),f=-d*d+u*(u+2*l)+c):u<=x?(d=0,u=Math.min(Math.max(-r,-l),r),f=u*(u+2*l)+c):(d=Math.max(0,-(o*r+a)),u=d>0?r:Math.min(Math.max(-r,-l),r),f=-d*d+u*(u+2*l)+c);else u=o>0?-r:r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(fd).addScaledVector(El,u),f}intersectSphere(t,e){if(t.radius<0)return null;Ai.subVectors(t.center,this.origin);let n=Ai.dot(this.direction),s=Ai.dot(Ai)-n*n,r=t.radius*t.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,o,a,l,c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return c>=0?(n=(t.min.x-u.x)*c,s=(t.max.x-u.x)*c):(n=(t.max.x-u.x)*c,s=(t.min.x-u.x)*c),h>=0?(r=(t.min.y-u.y)*h,o=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,o=(t.min.y-u.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),d>=0?(a=(t.min.z-u.z)*d,l=(t.max.z-u.z)*d):(a=(t.max.z-u.z)*d,l=(t.min.z-u.z)*d),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,Ai)!==null}intersectTriangle(t,e,n,s,r){let o=this.origin,a=this.direction,l=a.x,c=a.y,h=a.z,d=t.x-o.x,u=t.y-o.y,f=t.z-o.z,x=e.x-o.x,g=e.y-o.y,p=e.z-o.z,m=n.x-o.x,v=n.y-o.y,E=n.z-o.z,M=Math.abs(l),T=Math.abs(c),w=Math.abs(h),C,_,S,R,P,k,B,I,F,V,Z,nt;if(M>=T&&M>=w?(S=l,k=d,F=x,nt=m,l>=0?(C=c,_=h,R=u,P=f,B=g,I=p,V=v,Z=E):(C=h,_=c,R=f,P=u,B=p,I=g,V=E,Z=v)):T>=w?(S=c,k=u,F=g,nt=v,c>=0?(C=h,_=l,R=f,P=d,B=p,I=x,V=E,Z=m):(C=l,_=h,R=d,P=f,B=x,I=p,V=m,Z=E)):(S=h,k=f,F=p,nt=E,h>=0?(C=l,_=c,R=d,P=u,B=x,I=g,V=m,Z=v):(C=c,_=l,R=u,P=d,B=g,I=x,V=v,Z=m)),S===0)return null;let $=C/S,K=_/S,et=1/S,at=R-$*k,rt=P-K*k,zt=B-$*F,kt=I-K*F,Lt=V-$*nt,X=Z-K*nt,Q=Lt*kt-X*zt,yt=at*X-rt*Lt,Ft=zt*rt-kt*at;if(s){if(Q<0||yt<0||Ft<0)return null}else if((Q<0||yt<0||Ft<0)&&(Q>0||yt>0||Ft>0))return null;let vt=Q+yt+Ft;if(vt===0)return null;let Xt=et*(Q*k+yt*F+Ft*nt);return(vt>0?Xt<0:Xt>0)?null:this.at(Xt/vt,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Re=class extends Xn{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ct(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pi,this.combine=kd,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},Xm=new de,Ts=new Pr,Cl=new Cs,$m=new D,Rl=new D,Pl=new D,Il=new D,pd=new D,kl=new D,Zm=new D,Ll=new D,Bt=class extends tn{constructor(t=new ve,e=new Re){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;e.fromBufferAttribute(s,t);let a=this.morphTargetInfluences;if(r&&a){kl.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=a[l],d=r[l];h!==0&&(pd.fromBufferAttribute(d,t),o?kl.addScaledVector(pd,h):kl.addScaledVector(pd.sub(e),h))}e.add(kl)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Cl.copy(n.boundingSphere),Cl.applyMatrix4(r),Ts.copy(t.ray).recast(t.near),!(Cl.containsPoint(Ts.origin)===!1&&(Ts.intersectSphere(Cl,$m)===null||Ts.origin.distanceToSquared($m)>(t.far-t.near)**2))&&(Xm.copy(r).invert(),Ts.copy(t.ray).applyMatrix4(Xm),!(n.boundingBox!==null&&Ts.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,Ts)))}_computeIntersections(t,e,n){let s,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,d=r.attributes.normal,u=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let x=0,g=u.length;x<g;x++){let p=u[x],m=o[p.materialIndex],v=Math.max(p.start,f.start),E=Math.min(a.count,Math.min(p.start+p.count,f.start+f.count));for(let M=v,T=E;M<T;M+=3){let w=a.getX(M),C=a.getX(M+1),_=a.getX(M+2);s=Dl(this,m,t,n,c,h,d,w,C,_),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=p.materialIndex,e.push(s))}}else{let x=Math.max(0,f.start),g=Math.min(a.count,f.start+f.count);for(let p=x,m=g;p<m;p+=3){let v=a.getX(p),E=a.getX(p+1),M=a.getX(p+2);s=Dl(this,o,t,n,c,h,d,v,E,M),s&&(s.faceIndex=Math.floor(p/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let x=0,g=u.length;x<g;x++){let p=u[x],m=o[p.materialIndex],v=Math.max(p.start,f.start),E=Math.min(l.count,Math.min(p.start+p.count,f.start+f.count));for(let M=v,T=E;M<T;M+=3){let w=M,C=M+1,_=M+2;s=Dl(this,m,t,n,c,h,d,w,C,_),s&&(s.faceIndex=Math.floor(M/3),s.face.materialIndex=p.materialIndex,e.push(s))}}else{let x=Math.max(0,f.start),g=Math.min(l.count,f.start+f.count);for(let p=x,m=g;p<m;p+=3){let v=p,E=p+1,M=p+2;s=Dl(this,o,t,n,c,h,d,v,E,M),s&&(s.faceIndex=Math.floor(p/3),e.push(s))}}}};function P_(i,t,e,n,s,r,o,a){let l;if(t.side===dn?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,t.side===es,a),l===null)return null;Ll.copy(a),Ll.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(Ll);return c<e.near||c>e.far?null:{distance:c,point:Ll.clone(),object:i}}function Dl(i,t,e,n,s,r,o,a,l,c){i.getVertexPosition(a,Rl),i.getVertexPosition(l,Pl),i.getVertexPosition(c,Il);let h=P_(i,t,e,n,Rl,Pl,Il,Zm);if(h){let d=new D;Ci.getBarycoord(Zm,Rl,Pl,Il,d),s&&(h.uv=Ci.getInterpolatedAttribute(s,a,l,c,d,new bt)),r&&(h.uv1=Ci.getInterpolatedAttribute(r,a,l,c,d,new bt)),o&&(h.normal=Ci.getInterpolatedAttribute(o,a,l,c,d,new D),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a,b:l,c,normal:new D,materialIndex:0};Ci.getNormal(Rl,Pl,Il,u.normal),h.face=u,h.barycoord=d}return h}var Ir=class extends Ve{constructor(t=null,e=1,n=1,s,r,o,a,l,c=je,h=je,d,u){super(null,o,a,l,c,h,s,r,d,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Es=new Cs,I_=new bt(.5,.5),Nl=new D,kr=class{constructor(t=new xn,e=new xn,n=new xn,s=new xn,r=new xn,o=new xn){this.planes=[t,e,n,s,r,o]}set(t,e,n,s,r,o){let a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Wn,n=!1){let s=this.planes,r=t.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],d=r[5],u=r[6],f=r[7],x=r[8],g=r[9],p=r[10],m=r[11],v=r[12],E=r[13],M=r[14],T=r[15];if(s[0].setComponents(c-o,f-h,m-x,T-v).normalize(),s[1].setComponents(c+o,f+h,m+x,T+v).normalize(),s[2].setComponents(c+a,f+d,m+g,T+E).normalize(),s[3].setComponents(c-a,f-d,m-g,T-E).normalize(),n)s[4].setComponents(l,u,p,M).normalize(),s[5].setComponents(c-l,f-u,m-p,T-M).normalize();else if(s[4].setComponents(c-l,f-u,m-p,T-M).normalize(),e===Wn)s[5].setComponents(c+l,f+u,m+p,T+M).normalize();else if(e===Tr)s[5].setComponents(l,u,p,M).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Es.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Es.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Es)}intersectsSprite(t){Es.center.set(0,0,0);let e=I_.distanceTo(t.center);return Es.radius=.7071067811865476+e,Es.applyMatrix4(t.matrixWorld),this.intersectsSphere(Es)}intersectsSphere(t){let e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let s=e[n];if(Nl.x=s.normal.x>0?t.max.x:t.min.x,Nl.y=s.normal.y>0?t.max.y:t.min.y,Nl.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(Nl)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var ji=class extends Xn{constructor(t){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Ct(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},qm=new de,Md=new Pr,Ol=new Cs,Ul=new D,Rs=class extends tn{constructor(t=new ve,e=new ji){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.matrixWorld,r=t.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ol.copy(n.boundingSphere),Ol.applyMatrix4(s),Ol.radius+=r,t.ray.intersectsSphere(Ol)===!1)return;qm.copy(s).invert(),Md.copy(t.ray).applyMatrix4(qm);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,d=n.attributes.position;if(c!==null){let u=Math.max(0,o.start),f=Math.min(c.count,o.start+o.count);for(let x=u,g=f;x<g;x++){let p=c.getX(x);Ul.fromBufferAttribute(d,p),Ym(Ul,p,l,s,t,e,this)}}else{let u=Math.max(0,o.start),f=Math.min(d.count,o.start+o.count);for(let x=u,g=f;x<g;x++)Ul.fromBufferAttribute(d,x),Ym(Ul,x,l,s,t,e,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function Ym(i,t,e,n,s,r,o){let a=Md.distanceSqToPoint(i);if(a<e){let l=new D;Md.closestPointToPoint(i,l),l.applyMatrix4(n);let c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var Qo=class extends Ve{constructor(t=[],e=is,n,s,r,o,a,l,c,h){super(t,e,n,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},ta=class extends Ve{constructor(t,e,n,s,r,o,a,l,c){super(t,e,n,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var Ki=class extends Ve{constructor(t,e,n=Zn,s,r,o,a=je,l=je,c,h=ri,d=1){if(h!==ri&&h!==ss)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:t,height:e,depth:d};super(u,s,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Ar(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},nc=class extends Ki{constructor(t,e=Zn,n=is,s,r,o=je,a=je,l,c=ri){let h={width:t,height:t,depth:1},d=[h,h,h,h,h,h];super(t,t,e,n,s,r,o,a,l,c),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},ea=class extends Ve{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},ln=class i extends ve{constructor(t=1,e=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],h=[],d=[],u=0,f=0;x("z","y","x",-1,-1,n,e,t,o,r,0),x("z","y","x",1,-1,n,e,-t,o,r,1),x("x","z","y",1,1,t,n,e,s,o,2),x("x","z","y",1,-1,t,n,-e,s,o,3),x("x","y","z",1,-1,t,e,n,s,r,4),x("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new Jt(c,3)),this.setAttribute("normal",new Jt(h,3)),this.setAttribute("uv",new Jt(d,2));function x(g,p,m,v,E,M,T,w,C,_,S){let R=M/C,P=T/_,k=M/2,B=T/2,I=w/2,F=C+1,V=_+1,Z=0,nt=0,$=new D;for(let K=0;K<V;K++){let et=K*P-B;for(let at=0;at<F;at++){let rt=at*R-k;$[g]=rt*v,$[p]=et*E,$[m]=I,c.push($.x,$.y,$.z),$[g]=0,$[p]=0,$[m]=w>0?1:-1,h.push($.x,$.y,$.z),d.push(at/C),d.push(1-K/_),Z+=1}}for(let K=0;K<_;K++)for(let et=0;et<C;et++){let at=u+et+F*K,rt=u+et+F*(K+1),zt=u+(et+1)+F*(K+1),kt=u+(et+1)+F*K;l.push(at,rt,kt),l.push(rt,zt,kt),nt+=6}a.addGroup(f,nt,S),f+=nt,u+=Z}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var na=class i extends ve{constructor(t=1,e=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:s},e=Math.max(3,e);let r=[],o=[],a=[],l=[],c=new D,h=new bt;o.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let d=0,u=3;d<=e;d++,u+=3){let f=n+d/e*s;c.x=t*Math.cos(f),c.y=t*Math.sin(f),o.push(c.x,c.y,c.z),a.push(0,0,1),h.x=(o[u]/t+1)/2,h.y=(o[u+1]/t+1)/2,l.push(h.x,h.y)}for(let d=1;d<=e;d++)r.push(d,d+1,0);this.setIndex(r),this.setAttribute("position",new Jt(o,3)),this.setAttribute("normal",new Jt(a,3)),this.setAttribute("uv",new Jt(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.segments,t.thetaStart,t.thetaLength)}},ci=class i extends ve{constructor(t=1,e=1,n=1,s=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let h=[],d=[],u=[],f=[],x=0,g=[],p=n/2,m=0;v(),o===!1&&(t>0&&E(!0),e>0&&E(!1)),this.setIndex(h),this.setAttribute("position",new Jt(d,3)),this.setAttribute("normal",new Jt(u,3)),this.setAttribute("uv",new Jt(f,2));function v(){let M=new D,T=new D,w=0,C=(e-t)/n;for(let _=0;_<=r;_++){let S=[],R=_/r,P=R*(e-t)+t;for(let k=0;k<=s;k++){let B=k/s,I=B*l+a,F=Math.sin(I),V=Math.cos(I);T.x=P*F,T.y=-R*n+p,T.z=P*V,d.push(T.x,T.y,T.z),M.set(F,C,V).normalize(),u.push(M.x,M.y,M.z),f.push(B,1-R),S.push(x++)}g.push(S)}for(let _=0;_<s;_++)for(let S=0;S<r;S++){let R=g[S][_],P=g[S+1][_],k=g[S+1][_+1],B=g[S][_+1];(t>0||S!==0)&&(h.push(R,P,B),w+=3),(e>0||S!==r-1)&&(h.push(P,k,B),w+=3)}c.addGroup(m,w,0),m+=w}function E(M){let T=x,w=new bt,C=new D,_=0,S=M===!0?t:e,R=M===!0?1:-1;for(let k=1;k<=s;k++)d.push(0,p*R,0),u.push(0,R,0),f.push(.5,.5),x++;let P=x;for(let k=0;k<=s;k++){let I=k/s*l+a,F=Math.cos(I),V=Math.sin(I);C.x=S*V,C.y=p*R,C.z=S*F,d.push(C.x,C.y,C.z),u.push(0,R,0),w.x=F*.5+.5,w.y=V*.5*R+.5,f.push(w.x,w.y),x++}for(let k=0;k<s;k++){let B=T+k,I=P+k;M===!0?h.push(I,I+1,B):h.push(I+1,I,B),_+=3}c.addGroup(m,_,M===!0?1:2),m+=_}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var ic=class i extends ve{constructor(t=[],e=[],n=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:s};let r=[],o=[];a(s),c(n),h(),this.setAttribute("position",new Jt(r,3)),this.setAttribute("normal",new Jt(r.slice(),3)),this.setAttribute("uv",new Jt(o,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function a(v){let E=new D,M=new D,T=new D;for(let w=0;w<e.length;w+=3)f(e[w+0],E),f(e[w+1],M),f(e[w+2],T),l(E,M,T,v)}function l(v,E,M,T){let w=T+1,C=[];for(let _=0;_<=w;_++){C[_]=[];let S=v.clone().lerp(M,_/w),R=E.clone().lerp(M,_/w),P=w-_;for(let k=0;k<=P;k++)k===0&&_===w?C[_][k]=S:C[_][k]=S.clone().lerp(R,k/P)}for(let _=0;_<w;_++)for(let S=0;S<2*(w-_)-1;S++){let R=Math.floor(S/2);S%2===0?(u(C[_][R+1]),u(C[_+1][R]),u(C[_][R])):(u(C[_][R+1]),u(C[_+1][R+1]),u(C[_+1][R]))}}function c(v){let E=new D;for(let M=0;M<r.length;M+=3)E.x=r[M+0],E.y=r[M+1],E.z=r[M+2],E.normalize().multiplyScalar(v),r[M+0]=E.x,r[M+1]=E.y,r[M+2]=E.z}function h(){let v=new D;for(let E=0;E<r.length;E+=3){v.x=r[E+0],v.y=r[E+1],v.z=r[E+2];let M=p(v)/2/Math.PI+.5,T=m(v)/Math.PI+.5;o.push(M,1-T)}x(),d()}function d(){for(let v=0;v<o.length;v+=6){let E=o[v+0],M=o[v+2],T=o[v+4],w=Math.max(E,M,T),C=Math.min(E,M,T);w>.9&&C<.1&&(E<.2&&(o[v+0]+=1),M<.2&&(o[v+2]+=1),T<.2&&(o[v+4]+=1))}}function u(v){r.push(v.x,v.y,v.z)}function f(v,E){let M=v*3;E.x=t[M+0],E.y=t[M+1],E.z=t[M+2]}function x(){let v=new D,E=new D,M=new D,T=new D,w=new bt,C=new bt,_=new bt;for(let S=0,R=0;S<r.length;S+=9,R+=6){v.set(r[S+0],r[S+1],r[S+2]),E.set(r[S+3],r[S+4],r[S+5]),M.set(r[S+6],r[S+7],r[S+8]),w.set(o[R+0],o[R+1]),C.set(o[R+2],o[R+3]),_.set(o[R+4],o[R+5]),T.copy(v).add(E).add(M).divideScalar(3);let P=p(T);g(w,R+0,v,P),g(C,R+2,E,P),g(_,R+4,M,P)}}function g(v,E,M,T){T<0&&v.x===1&&(o[E]=v.x-1),M.x===0&&M.z===0&&(o[E]=T/2/Math.PI+.5)}function p(v){return Math.atan2(v.z,-v.x)}function m(v){return Math.atan2(-v.y,Math.sqrt(v.x*v.x+v.z*v.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.vertices,t.indices,t.radius,t.detail)}};var ia=class i extends ic{constructor(t=1,e=0){let n=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],s=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(n,s,t,e),this.type="OctahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new i(t.radius,t.detail)}},ke=class i extends ve{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};let r=t/2,o=e/2,a=Math.floor(n),l=Math.floor(s),c=a+1,h=l+1,d=t/a,u=e/l,f=[],x=[],g=[],p=[];for(let m=0;m<h;m++){let v=m*u-o;for(let E=0;E<c;E++){let M=E*d-r;x.push(M,-v,0),g.push(0,0,1),p.push(E/a),p.push(1-m/l)}}for(let m=0;m<l;m++)for(let v=0;v<a;v++){let E=v+c*m,M=v+c*(m+1),T=v+1+c*(m+1),w=v+1+c*m;f.push(E,M,w),f.push(M,T,w)}this.setIndex(f),this.setAttribute("position",new Jt(x,3)),this.setAttribute("normal",new Jt(g,3)),this.setAttribute("uv",new Jt(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.widthSegments,t.heightSegments)}};var sa=class i extends ve{constructor(t=1,e=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));let l=Math.min(o+a,Math.PI),c=0,h=[],d=new D,u=new D,f=[],x=[],g=[],p=[];for(let m=0;m<=n;m++){let v=[],E=m/n,M=o+E*a,T=t*Math.cos(M),w=Math.sqrt(t*t-T*T),C=0;m===0&&o===0?C=.5/e:m===n&&l===Math.PI&&(C=-.5/e);for(let _=0;_<=e;_++){let S=_/e,R=s+S*r;d.x=-w*Math.cos(R),d.y=T,d.z=w*Math.sin(R),x.push(d.x,d.y,d.z),u.copy(d).normalize(),g.push(u.x,u.y,u.z),p.push(S+C,1-E),v.push(c++)}h.push(v)}for(let m=0;m<n;m++)for(let v=0;v<e;v++){let E=h[m][v+1],M=h[m][v],T=h[m+1][v],w=h[m+1][v+1];(m!==0||o>0)&&f.push(E,M,w),(m!==n-1||l<Math.PI)&&f.push(M,T,w)}this.setIndex(f),this.setAttribute("position",new Jt(x,3)),this.setAttribute("normal",new Jt(g,3)),this.setAttribute("uv",new Jt(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};var Lr=class i extends ve{constructor(t=1,e=.4,n=12,s=48,r=Math.PI*2,o=0,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:s,arc:r,thetaStart:o,thetaLength:a},n=Math.floor(n),s=Math.floor(s);let l=[],c=[],h=[],d=[],u=new D,f=new D,x=new D;for(let g=0;g<=n;g++){let p=o+g/n*a;for(let m=0;m<=s;m++){let v=m/s*r;f.x=(t+e*Math.cos(p))*Math.cos(v),f.y=(t+e*Math.cos(p))*Math.sin(v),f.z=e*Math.sin(p),c.push(f.x,f.y,f.z),u.x=t*Math.cos(v),u.y=t*Math.sin(v),x.subVectors(f,u).normalize(),h.push(x.x,x.y,x.z),d.push(m/s),d.push(g/n)}}for(let g=1;g<=n;g++)for(let p=1;p<=s;p++){let m=(s+1)*g+p-1,v=(s+1)*(g-1)+p-1,E=(s+1)*(g-1)+p,M=(s+1)*g+p;l.push(m,v,M),l.push(v,E,M)}this.setIndex(l),this.setAttribute("position",new Jt(c,3)),this.setAttribute("normal",new Jt(h,3)),this.setAttribute("uv",new Jt(d,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}};var Dr=class extends Xn{constructor(t){super(),this.isShadowMaterial=!0,this.type="ShadowMaterial",this.color=new Ct(0),this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.fog=t.fog,this}};function Ds(i){let t={};for(let e in i){t[e]={};for(let n in i[e]){let s=i[e][n];if(jm(s))s.isRenderTargetTexture?(Ot("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone();else if(Array.isArray(s))if(jm(s[0])){let r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();t[e][n]=r}else t[e][n]=s.slice();else t[e][n]=s}}return t}function cn(i){let t={};for(let e=0;e<i.length;e++){let n=Ds(i[e]);for(let s in n)t[s]=n[s]}return t}function jm(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function k_(i){let t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function jd(i){let t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Yt.workingColorSpace}var Ns={clone:Ds,merge:cn},L_=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,D_=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Le=class extends Xn{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=L_,this.fragmentShader=D_,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Ds(t.uniforms),this.uniformsGroups=k_(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let s=t.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=e[s.value]||null;break;case"c":this.uniforms[n].value=new Ct().setHex(s.value);break;case"v2":this.uniforms[n].value=new bt().fromArray(s.value);break;case"v3":this.uniforms[n].value=new D().fromArray(s.value);break;case"v4":this.uniforms[n].value=new _e().fromArray(s.value);break;case"m3":this.uniforms[n].value=new Ht().fromArray(s.value);break;case"m4":this.uniforms[n].value=new de().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},sc=class extends Le{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},en=class extends Xn{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ct(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ct(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ih,this.normalScale=new bt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pi,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},Nr=class extends en{constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new bt(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return jt(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Ct(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Ct(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Ct(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(t){this._retroreflectivity>0!=t>0&&this.version++,this._retroreflectivity=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.retroreflectivity=t.retroreflectivity,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}};var rc=class extends Xn{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Cg,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},oc=class extends Xn{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function vr(i,t){return!i||i.constructor===t?i:typeof t.BYTES_PER_ELEMENT=="number"?new t(i):Array.prototype.slice.call(i)}function md(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}var Ji=class{constructor(t,e,n,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,s=e[n],r=e[n-1];t:{e:{let o;n:{i:if(!(t<s)){for(let a=n+2;;){if(s===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=s,s=e[++n],t<s)break e}o=e.length;break n}if(!(t>=r)){let a=e[1];t<a&&(n=2,r=a);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=e[--n-1],t>=r)break e}o=n,n=0;break n}break t}for(;n<o;){let a=n+o>>>1;t<e[a]?o=a:n=a+1}if(s=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=t*s;for(let o=0;o!==s;++o)e[o]=n[r+o];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},ac=class extends Ji{constructor(t,e,n,s){super(t,e,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:yd,endingEnd:yd}}intervalChanged_(t,e,n){let s=this.parameterPositions,r=t-2,o=t+1,a=s[r],l=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case _d:r=t,a=2*e-n;break;case vd:r=s.length-2,a=e+s[r]-s[r+1];break;default:r=t,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case _d:o=t,l=2*n-e;break;case vd:o=1,l=n+s[1]-s[0];break;default:o=t-1,l=e}let c=(n-e)*.5,h=this.valueSize;this._weightPrev=c/(e-a),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this._offsetPrev,d=this._offsetNext,u=this._weightPrev,f=this._weightNext,x=(n-e)/(s-e),g=x*x,p=g*x,m=-u*p+2*u*g-u*x,v=(1+u)*p+(-1.5-2*u)*g+(-.5+u)*x+1,E=(-1-f)*p+(1.5+f)*g+.5*x,M=f*p-f*g;for(let T=0;T!==a;++T)r[T]=m*o[h+T]+v*o[c+T]+E*o[l+T]+M*o[d+T];return r}},lc=class extends Ji{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=(n-e)/(s-e),d=1-h;for(let u=0;u!==a;++u)r[u]=o[c+u]*d+o[l+u]*h;return r}},cc=class extends Ji{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t){return this.copySampleValue_(t-1)}},hc=class extends Ji{interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this.inTangents,d=this.outTangents;if(!h||!d){let x=(n-e)/(s-e),g=1-x;for(let p=0;p!==a;++p)r[p]=o[c+p]*g+o[l+p]*x;return r}let u=a*2,f=t-1;for(let x=0;x!==a;++x){let g=o[c+x],p=o[l+x],m=f*u+x*2,v=d[m],E=d[m+1],M=t*u+x*2,T=h[M],w=h[M+1],C=O_(n,e,v,T,s);r[x]=Vg(C,g,E,w,p)}return r}};function Vg(i,t,e,n,s){let r=1-i;return r*r*r*t+3*r*r*i*e+3*r*i*i*n+i*i*i*s}function N_(i,t,e,n,s){let r=1-i;return 3*r*r*(e-t)+6*r*i*(n-e)+3*i*i*(s-n)}function O_(i,t,e,n,s){let r=(i-t)/(s-t);for(let o=0;o<8;o++){let a=Vg(r,t,e,n,s)-i;if(Math.abs(a)<1e-10)break;let l=N_(r,t,e,n,s);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-a/l))}return r}var En=class{constructor(t,e,n,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=vr(e,this.TimeBufferType),this.values=vr(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:vr(t.times,Array),values:vr(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(n.interpolation=s),md(t.settings)&&(n.settings={inTangents:vr(t.settings.inTangents,Array),outTangents:vr(t.settings.outTangents,Array)})}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new cc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new lc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new ac(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new hc(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case Go:e=this.InterpolantFactoryMethodDiscrete;break;case Kl:e=this.InterpolantFactoryMethodLinear;break;case zl:e=this.InterpolantFactoryMethodSmooth;break;case xd:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Ot("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Go;case this.InterpolantFactoryMethodLinear:return Kl;case this.InterpolantFactoryMethodSmooth:return zl;case this.InterpolantFactoryMethodBezier:return xd}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]*=t;md(this.settings)&&(Km(this.settings.inTangents,t),Km(this.settings.outTangents,t))}return this}trim(t,e){let n=this.times,s=n.length,r=0,o=s-1;for(;r!==s&&n[r]<t;)++r;for(;o!==-1&&n[o]>e;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(Nt("KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,s=this.values,r=n.length;r===0&&(Nt("KeyframeTrack: Track is empty.",this),t=!1);let o=null;for(let a=0;a!==r;a++){let l=n[a];if(typeof l=="number"&&isNaN(l)){Nt("KeyframeTrack: Time is not a valid number.",this,a,l),t=!1;break}if(o!==null&&o>l){Nt("KeyframeTrack: Out of order keys.",this,a,l,o),t=!1;break}o=l}if(s!==void 0&&d_(s))for(let a=0,l=s.length;a!==l;++a){let c=s[a];if(isNaN(c)){Nt("KeyframeTrack: Value is not a valid number.",this,a,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===zl,r=t.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=t[a],h=t[a+1];if(c!==h&&(a!==1||c!==t[0]))if(s)l=!0;else{let d=a*n,u=d-n,f=d+n;for(let x=0;x!==n;++x){let g=e[d+x];if(g!==e[u+x]||g!==e[f+x]){l=!0;break}}}if(l){if(a!==o){t[o]=t[a];let d=a*n,u=o*n;for(let f=0;f!==n;++f)e[u+f]=e[d+f]}++o}}if(r>0){t[o]=t[r];for(let a=r*n,l=o*n,c=0;c!==n;++c)e[l+c]=e[a+c];++o}return o!==t.length?(this.times=t.slice(0,o),this.values=e.slice(0,o*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,s=new n(this.name,t,e);return s.createInterpolant=this.createInterpolant,md(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function Km(i,t){for(let e=0,n=i.length;e!==n;e+=2)i[e]*=t}En.prototype.ValueTypeName="";En.prototype.TimeBufferType=Float32Array;En.prototype.ValueBufferType=Float32Array;En.prototype.DefaultInterpolation=Kl;var Qi=class extends En{constructor(t,e,n){super(t,e,n)}};Qi.prototype.ValueTypeName="bool";Qi.prototype.ValueBufferType=Array;Qi.prototype.DefaultInterpolation=Go;Qi.prototype.InterpolantFactoryMethodLinear=void 0;Qi.prototype.InterpolantFactoryMethodSmooth=void 0;var uc=class extends En{constructor(t,e,n,s){super(t,e,n,s)}};uc.prototype.ValueTypeName="color";var dc=class extends En{constructor(t,e,n,s){super(t,e,n,s)}};dc.prototype.ValueTypeName="number";var fc=class extends Ji{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-e)/(s-e),c=t*a;for(let h=c+a;c!==h;c+=4)ai.slerpFlat(r,0,o,c-a,o,c,l);return r}},ra=class extends En{constructor(t,e,n,s){super(t,e,n,s)}InterpolantFactoryMethodLinear(t){return new fc(this.times,this.values,this.getValueSize(),t)}};ra.prototype.ValueTypeName="quaternion";ra.prototype.InterpolantFactoryMethodSmooth=void 0;var ts=class extends En{constructor(t,e,n){super(t,e,n)}};ts.prototype.ValueTypeName="string";ts.prototype.ValueBufferType=Array;ts.prototype.DefaultInterpolation=Go;ts.prototype.InterpolantFactoryMethodLinear=void 0;ts.prototype.InterpolantFactoryMethodSmooth=void 0;var pc=class extends En{constructor(t,e,n,s){super(t,e,n,s)}};pc.prototype.ValueTypeName="vector";var mc=class{constructor(t,e,n){let s=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,d){return c.push(h,d),this},this.removeHandler=function(h){let d=c.indexOf(h);return d!==-1&&c.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=c.length;d<u;d+=2){let f=c[d],x=c[d+1];if(f.global&&(f.lastIndex=0),f.test(h))return x}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},Wg=new mc,gc=class{constructor(t){this.manager=t!==void 0?t:Wg,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};gc.DEFAULT_MATERIAL_NAME="__DEFAULT";var Or=class extends tn{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Ct(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}};var gd=new de,Jm=new D,Qm=new D,oa=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new bt(512,512),this.mapType=_n,this.map=null,this.mapPass=null,this.matrix=new de,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new kr,this._frameExtents=new bt(1,1),this._viewportCount=1,this._viewports=[new _e(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;Jm.setFromMatrixPosition(t.matrixWorld),e.position.copy(Jm),Qm.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Qm),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,s){gd.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix(gd,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,o=s?s.z/r.x:1,a=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;t.coordinateSystem===Tr||t.reversedDepth?e.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,1,0,0,0,0,1):e.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,.5,.5,0,0,0,1),e.multiply(gd)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},Fl=new D,Bl=new ai,ni=new D,aa=class extends tn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new de,this.projectionMatrix=new de,this.projectionMatrixInverse=new de,this.coordinateSystem=Wn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(Fl,Bl,ni),ni.x===1&&ni.y===1&&ni.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Fl,Bl,ni.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(Fl,Bl,ni),ni.x===1&&ni.y===1&&ni.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Fl,Bl,ni.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Zi=new D,tg=new bt,eg=new bt,Ye=class extends aa{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=Zo*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(Zu*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Zo*2*Math.atan(Math.tan(Zu*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){Zi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Zi.x,Zi.y).multiplyScalar(-t/Zi.z),Zi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Zi.x,Zi.y).multiplyScalar(-t/Zi.z)}getViewSize(t,e){return this.getViewBounds(t,tg,eg),e.subVectors(eg,tg)}setViewOffset(t,e,n,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(Zu*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,e-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}let a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}},bd=class extends oa{constructor(){super(new Ye(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(t){let e=this.camera,n=Zo*2*t.angle*this.focus,s=this.mapSize.width/this.mapSize.height*this.aspect,r=t.distance||e.far;(n!==e.fov||s!==e.aspect||r!==e.far)&&(e.fov=n,e.aspect=s,e.far=r,e.updateProjectionMatrix()),super.updateMatrices(t)}copy(t){return super.copy(t),this.focus=t.focus,this.aspect=t.aspect,this}toJSON(){let t=super.toJSON();return t.focus=this.focus,t.aspect=this.aspect,t}},Ur=class extends Or{constructor(t,e,n=0,s=Math.PI/3,r=0,o=2){super(t,e),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(tn.DEFAULT_UP),this.updateMatrix(),this.target=new tn,this.distance=n,this.angle=s,this.penumbra=r,this.decay=o,this.map=null,this.shadow=new bd}get power(){return this.intensity*Math.PI}set power(t){this.intensity=t/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.angle=t.angle,this.penumbra=t.penumbra,this.decay=t.decay,this.target=t.target.clone(),this.map=t.map,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.angle=this.angle,e.object.decay=this.decay,e.object.penumbra=this.penumbra,e.object.target=this.target.uuid,this.map&&this.map.isTexture&&(e.object.map=this.map.toJSON(t).uuid),e.object.shadow=this.shadow.toJSON(),e}},Sd=class extends oa{constructor(){super(new Ye(90,1,.5,500)),this.isPointLightShadow=!0}},la=class extends Or{constructor(t,e,n=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new Sd}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}},Ps=class extends aa{constructor(t=-1,e=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-t,o=n+t,a=s+e,l=s-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}};var ca=class extends Or{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}};var Mr=-90,br=1,xc=class extends tn{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new Ye(Mr,br,t,e);s.layers=this.layers,this.add(s);let r=new Ye(Mr,br,t,e);r.layers=this.layers,this.add(r);let o=new Ye(Mr,br,t,e);o.layers=this.layers,this.add(o);let a=new Ye(Mr,br,t,e);a.layers=this.layers,this.add(a);let l=new Ye(Mr,br,t,e);l.layers=this.layers,this.add(l);let c=new Ye(Mr,br,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,s,r,o,a,l]=e;for(let c of e)this.remove(c);if(t===Wn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Tr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,h]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),x=t.xr.enabled;t.xr.enabled=!1;let g=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let p=!1;t.isWebGLRenderer===!0?p=t.state.buffers.depth.getReversed():p=t.reversedDepthBuffer,t.setRenderTarget(n,0,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,2,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,3,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(n,4,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),n.texture.generateMipmaps=g,t.setRenderTarget(n,5,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(d,u,f),t.xr.enabled=x,n.texture.needsPMREMUpdate=!0}},yc=class extends Ye{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}},ha=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(t){this._document=t,t.hidden!==void 0&&(this._pageVisibilityHandler=U_.bind(this),t.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(t){return this._timescale=t,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(t){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(t!==void 0?t:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function U_(){this._document.hidden===!1&&this.reset()}var Kd="\\[\\]\\.:\\/",F_=new RegExp("["+Kd+"]","g"),Jd="[^"+Kd+"]",B_="[^"+Kd.replace("\\.","")+"]",z_=/((?:WC+[\/:])*)/.source.replace("WC",Jd),H_=/(WCOD+)?/.source.replace("WCOD",B_),G_=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Jd),V_=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Jd),W_=new RegExp("^"+z_+H_+G_+V_+"$"),X_=["material","materials","bones","map"],wd=class{constructor(t,e,n){let s=n||pe.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},pe=class i{constructor(t,e,n){this.path=e,this.parsedPath=n||i.parseTrackName(e),this.node=i.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new i.Composite(t,e,n):new i(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(F_,"")}static parseTrackName(t){let e=W_.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);X_.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===e||a.uuid===e)return a;let l=n(a.children);if(l)return l}return null},s=n(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)t[e++]=n[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=i.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){Ot("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=e.objectIndex;switch(n){case"materials":if(!t.material){Nt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){Nt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){Nt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){Nt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){Nt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){Nt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(c!==void 0){if(t[c]===void 0){Nt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let o=t[s];if(o===void 0){let c=e.nodeName;Nt("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",t);return}let a=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?a=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){Nt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){Nt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};pe.Composite=wd;pe.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};pe.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};pe.prototype.GetterByBindingType=[pe.prototype._getValue_direct,pe.prototype._getValue_array,pe.prototype._getValue_arrayElement,pe.prototype._getValue_toArray];pe.prototype.SetterByBindingTypeAndVersioning=[[pe.prototype._setValue_direct,pe.prototype._setValue_direct_setNeedsUpdate,pe.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[pe.prototype._setValue_array,pe.prototype._setValue_array_setNeedsUpdate,pe.prototype._setValue_array_setMatrixWorldNeedsUpdate],[pe.prototype._setValue_arrayElement,pe.prototype._setValue_arrayElement_setNeedsUpdate,pe.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[pe.prototype._setValue_fromArray,pe.prototype._setValue_fromArray_setNeedsUpdate,pe.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var JT=new Float32Array(1);var ng=new de,ua=class{constructor(t,e,n=0,s=1/0){this.ray=new Pr(t,e),this.near=n,this.far=s,this.camera=null,this.layers=new Cr,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):Nt("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return ng.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(ng),this}intersectObject(t,e=!0,n=[]){return Td(t,this,n,e),n.sort(ig),n}intersectObjects(t,e=!0,n=[]){for(let s=0,r=t.length;s<r;s++)Td(t[s],this,n,e);return n.sort(ig),n}};function ig(i,t){return i.distance-t.distance}function Td(i,t,e,n){let s=!0;if(i.layers.test(t.layers)&&i.raycast(t,e)===!1&&(s=!1),s===!0&&n===!0){let r=i.children;for(let o=0,a=r.length;o<a;o++)Td(r[o],t,e,!0)}}var Ed=class i{static{i.prototype.isMatrix2=!0}constructor(t,e,n,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=s,this}};function Qd(i,t,e,n){let s=$_(n);switch(e){case Xd:return i*t;case Zd:return i*t/s.components*s.byteLength;case wc:return i*t/s.components*s.byteLength;case rs:return i*t*2/s.components*s.byteLength;case Tc:return i*t*2/s.components*s.byteLength;case $d:return i*t*3/s.components*s.byteLength;case vn:return i*t*4/s.components*s.byteLength;case Ec:return i*t*4/s.components*s.byteLength;case pa:case ma:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case ga:case xa:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Cc:case Pc:return Math.max(i,16)*Math.max(t,8)/4;case Ac:case Rc:return Math.max(i,8)*Math.max(t,8)/2;case Ic:case kc:case Dc:case Nc:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Lc:case ya:case Oc:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Uc:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Fc:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case Bc:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case zc:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case Hc:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case Gc:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case Vc:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case Wc:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case Xc:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case $c:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case Zc:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case qc:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case Yc:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case jc:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case Kc:case Jc:case Qc:return Math.ceil(i/4)*Math.ceil(t/4)*16;case th:case eh:return Math.ceil(i/4)*Math.ceil(t/4)*8;case _a:case nh:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function $_(i){switch(i){case _n:case Hd:return{byteLength:1,components:1};case zr:case Gd:case We:return{byteLength:2,components:1};case bc:case Sc:return{byteLength:2,components:4};case Zn:case Mc:case qn:return{byteLength:4,components:1};case Vd:case Wd:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?Ot("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function d0(){let i=null,t=!1,e=null,n=null;function s(r,o){n=i.requestAnimationFrame(s),e(r,o)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function q_(i){let t=new WeakMap;function e(a,l){let c=a.array,h=a.usage,d=c.byteLength,u=i.createBuffer();i.bindBuffer(l,u),i.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,l,c){let h=l.array,d=l.updateRanges;if(i.bindBuffer(c,a),d.length===0)i.bufferSubData(c,0,h);else{d.sort((f,x)=>f.start-x.start);let u=0;for(let f=1;f<d.length;f++){let x=d[u],g=d[f];g.start<=x.start+x.count+1?x.count=Math.max(x.count,g.start+g.count-x.start):(++u,d[u]=g)}d.length=u+1;for(let f=0,x=d.length;f<x;f++){let g=d[f];i.bufferSubData(c,g.start*h.BYTES_PER_ELEMENT,h,g.start,g.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=t.get(a);l&&(i.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var Y_=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,j_=`#ifdef USE_ALPHAHASH
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
#endif`,K_=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,J_=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Q_=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,tv=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,ev=`#ifdef USE_AOMAP
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
#endif`,nv=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,iv=`#ifdef USE_BATCHING
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
#endif`,sv=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,rv=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,ov=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,av=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,lv=`#ifdef USE_IRIDESCENCE
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
#endif`,cv=`#ifdef USE_BUMPMAP
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
#endif`,hv=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,uv=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,dv=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,fv=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,pv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,mv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,gv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,xv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,yv=`#define PI 3.141592653589793
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
} // validated`,_v=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,vv=`vec3 transformedNormal = objectNormal;
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
#endif`,Mv=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,bv=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Sv=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,wv=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Tv="gl_FragColor = linearToOutputTexel( gl_FragColor );",Ev=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Av=`#ifdef USE_ENVMAP
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
#endif`,Cv=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Rv=`#ifdef USE_ENVMAP
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
#endif`,Pv=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Iv=`#ifdef USE_ENVMAP
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
#endif`,kv=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Lv=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Dv=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Nv=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Ov=`#ifdef USE_GRADIENTMAP
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
}`,Uv=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Fv=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Bv=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,zv=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,Hv=`#ifdef USE_ENVMAP
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
#endif`,Gv=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Vv=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Wv=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Xv=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,$v=`PhysicalMaterial material;
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
#endif`,Zv=`uniform sampler2D dfgLUT;
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
}`,qv=`
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
#endif`,Yv=`#if defined( RE_IndirectDiffuse )
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
#endif`,jv=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Kv=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,Jv=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Qv=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,tM=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,eM=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,nM=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,iM=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,sM=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,rM=`#if defined( USE_POINTS_UV )
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
#endif`,oM=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,aM=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,lM=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,cM=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,hM=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,uM=`#ifdef USE_MORPHTARGETS
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
#endif`,dM=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,fM=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,pM=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,mM=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,gM=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,xM=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,yM=`#ifdef USE_NORMALMAP
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
#endif`,_M=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,vM=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,MM=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,bM=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,SM=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,wM=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,TM=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,EM=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,AM=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,CM=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,RM=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,PM=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,IM=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,kM=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,LM=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,DM=`float getShadowMask() {
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
}`,NM=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,OM=`#ifdef USE_SKINNING
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
#endif`,UM=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,FM=`#ifdef USE_SKINNING
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
#endif`,BM=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,zM=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,HM=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,GM=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,VM=`#ifdef USE_TRANSMISSION
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
#endif`,WM=`#ifdef USE_TRANSMISSION
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
#endif`,XM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,$M=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,ZM=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,qM=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,YM=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,jM=`uniform sampler2D t2D;
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
}`,KM=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,JM=`#ifdef ENVMAP_TYPE_CUBE
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
}`,QM=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,tb=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,eb=`#include <common>
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
}`,nb=`#if DEPTH_PACKING == 3200
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
}`,ib=`#define DISTANCE
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
}`,sb=`#define DISTANCE
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
}`,rb=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,ob=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ab=`uniform float scale;
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
}`,lb=`uniform vec3 diffuse;
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
}`,cb=`#include <common>
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
}`,hb=`uniform vec3 diffuse;
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
}`,ub=`#define LAMBERT
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
}`,db=`#define LAMBERT
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
}`,fb=`#define MATCAP
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
}`,pb=`#define MATCAP
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
}`,mb=`#define NORMAL
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
}`,gb=`#define NORMAL
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
}`,xb=`#define PHONG
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
}`,yb=`#define PHONG
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
}`,_b=`#define STANDARD
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
}`,vb=`#define STANDARD
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
}`,Mb=`#define TOON
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
}`,bb=`#define TOON
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
}`,Sb=`uniform float size;
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
}`,wb=`uniform vec3 diffuse;
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
}`,Tb=`#include <common>
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
}`,Eb=`uniform vec3 color;
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
}`,Ab=`uniform float rotation;
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
}`,Cb=`uniform vec3 diffuse;
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
}`,Wt={alphahash_fragment:Y_,alphahash_pars_fragment:j_,alphamap_fragment:K_,alphamap_pars_fragment:J_,alphatest_fragment:Q_,alphatest_pars_fragment:tv,aomap_fragment:ev,aomap_pars_fragment:nv,batching_pars_vertex:iv,batching_vertex:sv,begin_vertex:rv,beginnormal_vertex:ov,bsdfs:av,iridescence_fragment:lv,bumpmap_pars_fragment:cv,clipping_planes_fragment:hv,clipping_planes_pars_fragment:uv,clipping_planes_pars_vertex:dv,clipping_planes_vertex:fv,color_fragment:pv,color_pars_fragment:mv,color_pars_vertex:gv,color_vertex:xv,common:yv,cube_uv_reflection_fragment:_v,defaultnormal_vertex:vv,displacementmap_pars_vertex:Mv,displacementmap_vertex:bv,emissivemap_fragment:Sv,emissivemap_pars_fragment:wv,colorspace_fragment:Tv,colorspace_pars_fragment:Ev,envmap_fragment:Av,envmap_common_pars_fragment:Cv,envmap_pars_fragment:Rv,envmap_pars_vertex:Pv,envmap_physical_pars_fragment:Hv,envmap_vertex:Iv,fog_vertex:kv,fog_pars_vertex:Lv,fog_fragment:Dv,fog_pars_fragment:Nv,gradientmap_pars_fragment:Ov,lightmap_pars_fragment:Uv,lights_lambert_fragment:Fv,lights_lambert_pars_fragment:Bv,lights_pars_begin:zv,lights_toon_fragment:Gv,lights_toon_pars_fragment:Vv,lights_phong_fragment:Wv,lights_phong_pars_fragment:Xv,lights_physical_fragment:$v,lights_physical_pars_fragment:Zv,lights_fragment_begin:qv,lights_fragment_maps:Yv,lights_fragment_end:jv,lightprobes_pars_fragment:Kv,logdepthbuf_fragment:Jv,logdepthbuf_pars_fragment:Qv,logdepthbuf_pars_vertex:tM,logdepthbuf_vertex:eM,map_fragment:nM,map_pars_fragment:iM,map_particle_fragment:sM,map_particle_pars_fragment:rM,metalnessmap_fragment:oM,metalnessmap_pars_fragment:aM,morphinstance_vertex:lM,morphcolor_vertex:cM,morphnormal_vertex:hM,morphtarget_pars_vertex:uM,morphtarget_vertex:dM,normal_fragment_begin:fM,normal_fragment_maps:pM,normal_pars_fragment:mM,normal_pars_vertex:gM,normal_vertex:xM,normalmap_pars_fragment:yM,clearcoat_normal_fragment_begin:_M,clearcoat_normal_fragment_maps:vM,clearcoat_pars_fragment:MM,iridescence_pars_fragment:bM,opaque_fragment:SM,packing:wM,premultiplied_alpha_fragment:TM,project_vertex:EM,dithering_fragment:AM,dithering_pars_fragment:CM,roughnessmap_fragment:RM,roughnessmap_pars_fragment:PM,shadowmap_pars_fragment:IM,shadowmap_pars_vertex:kM,shadowmap_vertex:LM,shadowmask_pars_fragment:DM,skinbase_vertex:NM,skinning_pars_vertex:OM,skinning_vertex:UM,skinnormal_vertex:FM,specularmap_fragment:BM,specularmap_pars_fragment:zM,tonemapping_fragment:HM,tonemapping_pars_fragment:GM,transmission_fragment:VM,transmission_pars_fragment:WM,uv_pars_fragment:XM,uv_pars_vertex:$M,uv_vertex:ZM,worldpos_vertex:qM,background_vert:YM,background_frag:jM,backgroundCube_vert:KM,backgroundCube_frag:JM,cube_vert:QM,cube_frag:tb,depth_vert:eb,depth_frag:nb,distance_vert:ib,distance_frag:sb,equirect_vert:rb,equirect_frag:ob,linedashed_vert:ab,linedashed_frag:lb,meshbasic_vert:cb,meshbasic_frag:hb,meshlambert_vert:ub,meshlambert_frag:db,meshmatcap_vert:fb,meshmatcap_frag:pb,meshnormal_vert:mb,meshnormal_frag:gb,meshphong_vert:xb,meshphong_frag:yb,meshphysical_vert:_b,meshphysical_frag:vb,meshtoon_vert:Mb,meshtoon_frag:bb,points_vert:Sb,points_frag:wb,shadow_vert:Tb,shadow_frag:Eb,sprite_vert:Ab,sprite_frag:Cb},pt={common:{diffuse:{value:new Ct(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ht},alphaMap:{value:null},alphaMapTransform:{value:new Ht},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ht}},envmap:{envMap:{value:null},envMapRotation:{value:new Ht},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ht}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ht}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ht},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ht},normalScale:{value:new bt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ht},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ht}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ht}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ht}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ct(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new D},probesMax:{value:new D},probesResolution:{value:new D}},points:{diffuse:{value:new Ct(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ht},alphaTest:{value:0},uvTransform:{value:new Ht}},sprite:{diffuse:{value:new Ct(16777215)},opacity:{value:1},center:{value:new bt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ht},alphaMap:{value:null},alphaMapTransform:{value:new Ht},alphaTest:{value:0}}},fi={basic:{uniforms:cn([pt.common,pt.specularmap,pt.envmap,pt.aomap,pt.lightmap,pt.fog]),vertexShader:Wt.meshbasic_vert,fragmentShader:Wt.meshbasic_frag},lambert:{uniforms:cn([pt.common,pt.specularmap,pt.envmap,pt.aomap,pt.lightmap,pt.emissivemap,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.fog,pt.lights,{emissive:{value:new Ct(0)},envMapIntensity:{value:1}}]),vertexShader:Wt.meshlambert_vert,fragmentShader:Wt.meshlambert_frag},phong:{uniforms:cn([pt.common,pt.specularmap,pt.envmap,pt.aomap,pt.lightmap,pt.emissivemap,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.fog,pt.lights,{emissive:{value:new Ct(0)},specular:{value:new Ct(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Wt.meshphong_vert,fragmentShader:Wt.meshphong_frag},standard:{uniforms:cn([pt.common,pt.envmap,pt.aomap,pt.lightmap,pt.emissivemap,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.roughnessmap,pt.metalnessmap,pt.fog,pt.lights,{emissive:{value:new Ct(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Wt.meshphysical_vert,fragmentShader:Wt.meshphysical_frag},toon:{uniforms:cn([pt.common,pt.aomap,pt.lightmap,pt.emissivemap,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.gradientmap,pt.fog,pt.lights,{emissive:{value:new Ct(0)}}]),vertexShader:Wt.meshtoon_vert,fragmentShader:Wt.meshtoon_frag},matcap:{uniforms:cn([pt.common,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.fog,{matcap:{value:null}}]),vertexShader:Wt.meshmatcap_vert,fragmentShader:Wt.meshmatcap_frag},points:{uniforms:cn([pt.points,pt.fog]),vertexShader:Wt.points_vert,fragmentShader:Wt.points_frag},dashed:{uniforms:cn([pt.common,pt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Wt.linedashed_vert,fragmentShader:Wt.linedashed_frag},depth:{uniforms:cn([pt.common,pt.displacementmap]),vertexShader:Wt.depth_vert,fragmentShader:Wt.depth_frag},normal:{uniforms:cn([pt.common,pt.bumpmap,pt.normalmap,pt.displacementmap,{opacity:{value:1}}]),vertexShader:Wt.meshnormal_vert,fragmentShader:Wt.meshnormal_frag},sprite:{uniforms:cn([pt.sprite,pt.fog]),vertexShader:Wt.sprite_vert,fragmentShader:Wt.sprite_frag},background:{uniforms:{uvTransform:{value:new Ht},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Wt.background_vert,fragmentShader:Wt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ht}},vertexShader:Wt.backgroundCube_vert,fragmentShader:Wt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Wt.cube_vert,fragmentShader:Wt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Wt.equirect_vert,fragmentShader:Wt.equirect_frag},distance:{uniforms:cn([pt.common,pt.displacementmap,{referencePosition:{value:new D},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Wt.distance_vert,fragmentShader:Wt.distance_frag},shadow:{uniforms:cn([pt.lights,pt.fog,{color:{value:new Ct(0)},opacity:{value:1}}]),vertexShader:Wt.shadow_vert,fragmentShader:Wt.shadow_frag}};fi.physical={uniforms:cn([fi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ht},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ht},clearcoatNormalScale:{value:new bt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ht},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ht},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ht},sheen:{value:0},sheenColor:{value:new Ct(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ht},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ht},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ht},transmissionSamplerSize:{value:new bt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ht},attenuationDistance:{value:0},attenuationColor:{value:new Ct(0)},specularColor:{value:new Ct(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ht},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ht},anisotropyVector:{value:new bt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ht}}]),vertexShader:Wt.meshphysical_vert,fragmentShader:Wt.meshphysical_frag};var oh={r:0,b:0,g:0},Rb=new de,f0=new Ht;f0.set(-1,0,0,0,1,0,0,0,1);function Pb(i,t,e,n,s,r){let o=new Ct(0),a=s===!0?0:1,l,c,h=null,d=0,u=null;function f(v){let E=v.isScene===!0?v.background:null;if(E&&E.isTexture){let M=v.backgroundBlurriness>0;E=t.get(E,M)}return E}function x(v){let E=!1,M=f(v);M===null?p(o,a):M&&M.isColor&&(p(M,1),E=!0);let T=i.xr.getEnvironmentBlendMode();T==="additive"?e.buffers.color.setClear(0,0,0,1,r):T==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(i.autoClear||E)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function g(v,E){let M=f(E);M&&(M.isCubeTexture||M.mapping===da)?(c===void 0&&(c=new Bt(new ln(1,1,1),new Le({name:"BackgroundCubeMaterial",uniforms:Ds(fi.backgroundCube.uniforms),vertexShader:fi.backgroundCube.vertexShader,fragmentShader:fi.backgroundCube.fragmentShader,side:dn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(T,w,C){this.matrixWorld.copyPosition(C.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=M,c.material.uniforms.backgroundBlurriness.value=E.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Rb.makeRotationFromEuler(E.backgroundRotation)).transpose(),M.isCubeTexture&&M.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(f0),c.material.toneMapped=Yt.getTransfer(M.colorSpace)!==se,(h!==M||d!==M.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=M,d=M.version,u=i.toneMapping),c.layers.enableAll(),v.unshift(c,c.geometry,c.material,0,0,null)):M&&M.isTexture&&(l===void 0&&(l=new Bt(new ke(2,2),new Le({name:"BackgroundMaterial",uniforms:Ds(fi.background.uniforms),vertexShader:fi.background.vertexShader,fragmentShader:fi.background.fragmentShader,side:es,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=M,l.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,l.material.toneMapped=Yt.getTransfer(M.colorSpace)!==se,M.matrixAutoUpdate===!0&&M.updateMatrix(),l.material.uniforms.uvTransform.value.copy(M.matrix),(h!==M||d!==M.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=M,d=M.version,u=i.toneMapping),l.layers.enableAll(),v.unshift(l,l.geometry,l.material,0,0,null))}function p(v,E){v.getRGB(oh,jd(i)),e.buffers.color.setClear(oh.r,oh.g,oh.b,E,r)}function m(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(v,E=1){o.set(v),a=E,p(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(v){a=v,p(o,a)},render:x,addToRenderList:g,dispose:m}}function Ib(i,t){let e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=u(null),r=s,o=!1;function a(P,k,B,I,F){let V=!1,Z=d(P,I,B,k);r!==Z&&(r=Z,c(r.object)),V=f(P,I,B,F),V&&x(P,I,B,F),F!==null&&t.update(F,i.ELEMENT_ARRAY_BUFFER),(V||o)&&(o=!1,M(P,k,B,I),F!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(F).buffer))}function l(){return i.createVertexArray()}function c(P){return i.bindVertexArray(P)}function h(P){return i.deleteVertexArray(P)}function d(P,k,B,I){let F=I.wireframe===!0,V=n[k.id];V===void 0&&(V={},n[k.id]=V);let Z=P.isInstancedMesh===!0?P.id:0,nt=V[Z];nt===void 0&&(nt={},V[Z]=nt);let $=nt[B.id];$===void 0&&($={},nt[B.id]=$);let K=$[F];return K===void 0&&(K=u(l()),$[F]=K),K}function u(P){let k=[],B=[],I=[];for(let F=0;F<e;F++)k[F]=0,B[F]=0,I[F]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:k,enabledAttributes:B,attributeDivisors:I,object:P,attributes:{},index:null}}function f(P,k,B,I){let F=r.attributes,V=k.attributes,Z=0,nt=B.getAttributes();for(let $ in nt)if(nt[$].location>=0){let et=F[$],at=V[$];if(at===void 0&&($==="instanceMatrix"&&P.instanceMatrix&&(at=P.instanceMatrix),$==="instanceColor"&&P.instanceColor&&(at=P.instanceColor)),et===void 0||et.attribute!==at||at&&et.data!==at.data)return!0;Z++}return r.attributesNum!==Z||r.index!==I}function x(P,k,B,I){let F={},V=k.attributes,Z=0,nt=B.getAttributes();for(let $ in nt)if(nt[$].location>=0){let et=V[$];et===void 0&&($==="instanceMatrix"&&P.instanceMatrix&&(et=P.instanceMatrix),$==="instanceColor"&&P.instanceColor&&(et=P.instanceColor));let at={};at.attribute=et,et&&et.data&&(at.data=et.data),F[$]=at,Z++}r.attributes=F,r.attributesNum=Z,r.index=I}function g(){let P=r.newAttributes;for(let k=0,B=P.length;k<B;k++)P[k]=0}function p(P){m(P,0)}function m(P,k){let B=r.newAttributes,I=r.enabledAttributes,F=r.attributeDivisors;B[P]=1,I[P]===0&&(i.enableVertexAttribArray(P),I[P]=1),F[P]!==k&&(i.vertexAttribDivisor(P,k),F[P]=k)}function v(){let P=r.newAttributes,k=r.enabledAttributes;for(let B=0,I=k.length;B<I;B++)k[B]!==P[B]&&(i.disableVertexAttribArray(B),k[B]=0)}function E(P,k,B,I,F,V,Z){Z===!0?i.vertexAttribIPointer(P,k,B,F,V):i.vertexAttribPointer(P,k,B,I,F,V)}function M(P,k,B,I){g();let F=I.attributes,V=B.getAttributes(),Z=k.defaultAttributeValues;for(let nt in V){let $=V[nt];if($.location>=0){let K=F[nt];if(K===void 0&&(nt==="instanceMatrix"&&P.instanceMatrix&&(K=P.instanceMatrix),nt==="instanceColor"&&P.instanceColor&&(K=P.instanceColor)),K!==void 0){let et=K.normalized,at=K.itemSize,rt=t.get(K);if(rt===void 0)continue;let zt=rt.buffer,kt=rt.type,Lt=rt.bytesPerElement,X=kt===i.INT||kt===i.UNSIGNED_INT||K.gpuType===Mc;if(K.isInterleavedBufferAttribute){let Q=K.data,yt=Q.stride,Ft=K.offset;if(Q.isInstancedInterleavedBuffer){for(let vt=0;vt<$.locationSize;vt++)m($.location+vt,Q.meshPerAttribute);P.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let vt=0;vt<$.locationSize;vt++)p($.location+vt);i.bindBuffer(i.ARRAY_BUFFER,zt);for(let vt=0;vt<$.locationSize;vt++)E($.location+vt,at/$.locationSize,kt,et,yt*Lt,(Ft+at/$.locationSize*vt)*Lt,X)}else{if(K.isInstancedBufferAttribute){for(let Q=0;Q<$.locationSize;Q++)m($.location+Q,K.meshPerAttribute);P.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=K.meshPerAttribute*K.count)}else for(let Q=0;Q<$.locationSize;Q++)p($.location+Q);i.bindBuffer(i.ARRAY_BUFFER,zt);for(let Q=0;Q<$.locationSize;Q++)E($.location+Q,at/$.locationSize,kt,et,at*Lt,at/$.locationSize*Q*Lt,X)}}else if(Z!==void 0){let et=Z[nt];if(et!==void 0)switch(et.length){case 2:i.vertexAttrib2fv($.location,et);break;case 3:i.vertexAttrib3fv($.location,et);break;case 4:i.vertexAttrib4fv($.location,et);break;default:i.vertexAttrib1fv($.location,et)}}}}v()}function T(){S();for(let P in n){let k=n[P];for(let B in k){let I=k[B];for(let F in I){let V=I[F];for(let Z in V)h(V[Z].object),delete V[Z];delete I[F]}}delete n[P]}}function w(P){if(n[P.id]===void 0)return;let k=n[P.id];for(let B in k){let I=k[B];for(let F in I){let V=I[F];for(let Z in V)h(V[Z].object),delete V[Z];delete I[F]}}delete n[P.id]}function C(P){for(let k in n){let B=n[k];for(let I in B){let F=B[I];if(F[P.id]===void 0)continue;let V=F[P.id];for(let Z in V)h(V[Z].object),delete V[Z];delete F[P.id]}}}function _(P){for(let k in n){let B=n[k],I=P.isInstancedMesh===!0?P.id:0,F=B[I];if(F!==void 0){for(let V in F){let Z=F[V];for(let nt in Z)h(Z[nt].object),delete Z[nt];delete F[V]}delete B[I],Object.keys(B).length===0&&delete n[k]}}}function S(){R(),o=!0,r!==s&&(r=s,c(r.object))}function R(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:S,resetDefaultState:R,dispose:T,releaseStatesOfGeometry:w,releaseStatesOfObject:_,releaseStatesOfProgram:C,initAttributes:g,enableAttribute:p,disableUnusedAttributes:v}}function kb(i,t,e){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),e.update(c,n,1)}function o(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),e.update(c,n,h))}function a(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let f=0;f<h;f++)u+=c[f];e.update(u,n,1)}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function Lb(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let C=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(C){return!(C!==vn&&n.convert(C)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(C){let _=C===We&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(C!==_n&&C!==qn&&!_&&n.convert(C)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function l(C){if(C==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";C="mediump"}return C==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",h=l(c);h!==c&&(Ot("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let d=e.logarithmicDepthBuffer===!0,u=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&u===!1&&Ot("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),x=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_TEXTURE_SIZE),p=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),m=i.getParameter(i.MAX_VERTEX_ATTRIBS),v=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),E=i.getParameter(i.MAX_VARYING_VECTORS),M=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),T=i.getParameter(i.MAX_SAMPLES),w=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:x,maxTextureSize:g,maxCubemapSize:p,maxAttributes:m,maxVertexUniforms:v,maxVaryings:E,maxFragmentUniforms:M,maxSamples:T,samples:w}}function Db(i){let t=this,e=null,n=0,s=!1,r=!1,o=new xn,a=new Ht,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){let f=d.length!==0||u||n!==0||s;return s=u,n=d.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){e=h(d,u,0)},this.setState=function(d,u,f){let x=d.clippingPlanes,g=d.clipIntersection,p=d.clipShadows,m=i.get(d);if(!s||x===null||x.length===0||r&&!p)r?h(null):c();else{let v=r?0:n,E=v*4,M=m.clippingState||null;l.value=M,M=h(x,u,E,f);for(let T=0;T!==E;++T)M[T]=e[T];m.clippingState=M,this.numIntersection=g?this.numPlanes:0,this.numPlanes+=v}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(d,u,f,x){let g=d!==null?d.length:0,p=null;if(g!==0){if(p=l.value,x!==!0||p===null){let m=f+g*4,v=u.matrixWorldInverse;a.getNormalMatrix(v),(p===null||p.length<m)&&(p=new Float32Array(m));for(let E=0,M=f;E!==g;++E,M+=4)o.copy(d[E]).applyMatrix4(v,a),o.normal.toArray(p,M),p[M+3]=o.constant}l.value=p,l.needsUpdate=!0}return t.numPlanes=g,t.numIntersection=0,p}}var Vr=4,Nb=6,Ob=20,Ub=256,va=new Ps,Xg=new Ct,tf=null,ef=0,nf=0,sf=!1,Fb=new D,Os=new D,Xr=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){let{size:o=256,position:a=Fb}=r;tf=this._renderer.getRenderTarget(),ef=this._renderer.getActiveCubeFace(),nf=this._renderer.getActiveMipmapLevel(),sf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,s,l,a),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=qg(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Zg(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(tf,ef,nf),this._renderer.xr.enabled=sf,t.scissorTest=!1,Gr(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===is||t.mapping===Ls?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),tf=this._renderer.getRenderTarget(),ef=this._renderer.getActiveCubeFace(),nf=this._renderer.getActiveMipmapLevel(),sf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:ze,minFilter:ze,generateMipmaps:!1,type:We,format:vn,colorSpace:Vo,depthBuffer:!1},s=$g(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=$g(t,e,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=Bb(r)),this._blurMaterial=Hb(r,t,e),this._ggxMaterial=zb(r,t,e)}return s}_compileMaterial(t){let e=new Bt(new ve,t);this._renderer.compile(e,va)}_sceneToCubeUV(t,e,n,s,r){let l=new Ye(90,1,e,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],d=this._renderer,u=d.autoClear,f=d.toneMapping;d.getClearColor(Xg),d.toneMapping=Cn,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(s),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Bt(new ln,new Re({name:"PMREM.Background",side:dn,depthWrite:!1,depthTest:!1})));let g=this._backgroundBox,p=g.material,m=!1,v=t.background;v?v.isColor&&(p.color.copy(v),t.background=null,m=!0):(p.color.copy(Xg),m=!0);for(let E=0;E<6;E++){let M=E%3;M===0?(l.up.set(0,c[E],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[E],r.y,r.z)):M===1?(l.up.set(0,0,c[E]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[E],r.z)):(l.up.set(0,c[E],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[E]));let T=this._cubeSize;Gr(s,M*T,E>2?T:0,T,T),d.setRenderTarget(s),m&&d.render(g,l),d.render(t,l)}d.toneMapping=f,d.autoClear=u,t.background=v}_textureToCubeUV(t,e){let n=this._renderer,s=t.mapping===is||t.mapping===Ls;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=qg()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Zg());let r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;let a=r.uniforms;a.envMap.value=t;let l=this._cubeSize;Gr(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(o,va)}_applyPMREM(t){let e=this._renderer,n=e.autoClear;e.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){let s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;let l=o.uniforms,c=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),d=Math.sqrt(c*c-h*h),u=c*1.25,f=d*u,{_lodMax:x}=this,g=this._sizeLods[n],p=3*g*(n>x-Vr?n-x+Vr:0),m=4*(this._cubeSize-g);l.envMap.value=t.texture,l.roughness.value=f,l.mipInt.value=x-e,Gr(r,p,m,3*g,2*g),s.setRenderTarget(r),s.render(a,va),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=x-n,Gr(t,p,m,3*g,2*g),s.setRenderTarget(t),s.render(a,va)}_blur(t,e,n,s){let r=this._pingPongRenderTarget,o=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,n,o),this._blurPass(r,t,n,n,o)}_blurPass(t,e,n,s,r){let o=this._renderer,a=this._blurMaterial,l=this._lodMeshes[s];l.material=a;let c=a.uniforms;c.envMap.value=t.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-n;let h=this._sizeLods[s],d=3*h*(s>this._lodMax-Vr?s-this._lodMax+Vr:0),u=4*(this._cubeSize-h);Gr(e,d,u,3*h,2*h),o.setRenderTarget(e),o.render(l,va)}};function Bb(i){let t=[],e=[],n=i,s=i-Vr+1+Nb;for(let r=0;r<s;r++){let o=Math.pow(2,n);t.push(o);let a=1/(o-2),l=-a,c=1+a,h=[l,l,c,l,c,c,l,l,c,c,l,c],d=6,u=6,f=3,x=new Float32Array(f*u*d),g=new Float32Array(f*u*d);for(let m=0;m<d;m++){let v=m%3*2/3-1,E=m>2?0:-1,M=[v,E,0,v+2/3,E,0,v+2/3,E+1,0,v,E,0,v+2/3,E+1,0,v,E+1,0];x.set(M,f*u*m);for(let T=0;T<u;T++){let w=h[T*2]*2-1,C=h[T*2+1]*2-1;m===0?Os.set(1,C,w):m===1?Os.set(-w,1,-C):m===2?Os.set(-w,C,1):m===3?Os.set(-1,C,-w):m===4?Os.set(-w,-1,C):Os.set(w,C,-1),Os.toArray(g,(m*u+T)*f)}}let p=new ve;p.setAttribute("position",new Be(x,f)),p.setAttribute("outputDirection",new Be(g,f)),e.push(new Bt(p,null)),n>Vr&&n--}return{lodMeshes:e,sizeLods:t}}function $g(i,t,e){let n=new Ce(i,t,e);return n.texture.mapping=da,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Gr(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function zb(i,t,e){return new Le({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Ub,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:hh(),fragmentShader:`

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
		`,blending:Dn,depthTest:!1,depthWrite:!1})}function Hb(i,t,e){return new Le({name:"SphericalGaussianBlur",defines:{SAMPLES:Ob,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:hh(),fragmentShader:`

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
		`,blending:Dn,depthTest:!1,depthWrite:!1})}function Zg(){return new Le({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:hh(),fragmentShader:`

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
		`,blending:Dn,depthTest:!1,depthWrite:!1})}function qg(){return new Le({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:hh(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Dn,depthTest:!1,depthWrite:!1})}function hh(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var lh=class extends Ce{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new Qo(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new ln(5,5,5),r=new Le({name:"CubemapFromEquirect",uniforms:Ds(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:dn,blending:Dn});r.uniforms.tEquirect.value=e;let o=new Bt(s,r),a=e.minFilter;return e.minFilter===hi&&(e.minFilter=ze),new xc(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){let r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,s);t.setRenderTarget(r)}};function Gb(i){let t=new WeakMap,e=new WeakMap,n=null;function s(u,f=!1){return u==null?null:f?o(u):r(u)}function r(u){if(u&&u.isTexture){let f=u.mapping;if(f===Br||f===_c)if(t.has(u)){let x=t.get(u).texture;return a(x,u.mapping)}else{let x=u.image;if(x&&x.height>0){let g=new lh(x.height);return g.fromEquirectangularTexture(i,u),t.set(u,g),u.addEventListener("dispose",c),a(g.texture,u.mapping)}else return null}}return u}function o(u){if(u&&u.isTexture){let f=u.mapping,x=f===Br||f===_c,g=f===is||f===Ls;if(x||g){let p=e.get(u),m=p!==void 0?p.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==m)return n===null&&(n=new Xr(i)),p=x?n.fromEquirectangular(u,p):n.fromCubemap(u,p),p.texture.pmremVersion=u.pmremVersion,e.set(u,p),p.texture;if(p!==void 0)return p.texture;{let v=u.image;return x&&v&&v.height>0||g&&v&&l(v)?(n===null&&(n=new Xr(i)),p=x?n.fromEquirectangular(u):n.fromCubemap(u),p.texture.pmremVersion=u.pmremVersion,e.set(u,p),u.addEventListener("dispose",h),p.texture):null}}}return u}function a(u,f){return f===Br?u.mapping=is:f===_c&&(u.mapping=Ls),u}function l(u){let f=0,x=6;for(let g=0;g<x;g++)u[g]!==void 0&&f++;return f===x}function c(u){let f=u.target;f.removeEventListener("dispose",c);let x=t.get(f);x!==void 0&&(t.delete(f),x.dispose())}function h(u){let f=u.target;f.removeEventListener("dispose",h);let x=e.get(f);x!==void 0&&(e.delete(f),x.dispose())}function d(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:d}}function Vb(i){let t={};function e(n){if(t[n]!==void 0)return t[n];let s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let s=e(n);return s===null&&As("WebGLRenderer: "+n+" extension not supported."),s}}}function Wb(i,t,e,n){let s={},r=new WeakMap;function o(d){let u=d.target;u.index!==null&&t.remove(u.index);for(let x in u.attributes)t.remove(u.attributes[x]);u.removeEventListener("dispose",o),delete s[u.id];let f=r.get(u);f&&(t.remove(f),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function a(d,u){return s[u.id]===!0||(u.addEventListener("dispose",o),s[u.id]=!0,e.memory.geometries++),u}function l(d){let u=d.attributes;for(let f in u)t.update(u[f],i.ARRAY_BUFFER)}function c(d){let u=[],f=d.index,x=d.attributes.position,g=0;if(x===void 0)return;if(f!==null){let v=f.array;g=f.version;for(let E=0,M=v.length;E<M;E+=3){let T=v[E+0],w=v[E+1],C=v[E+2];u.push(T,w,w,C,C,T)}}else{let v=x.array;g=x.version;for(let E=0,M=v.length/3-1;E<M;E+=3){let T=E+0,w=E+1,C=E+2;u.push(T,w,w,C,C,T)}}let p=new(x.count>=65535?Ko:jo)(u,1);p.version=g;let m=r.get(d);m&&t.remove(m),r.set(d,p)}function h(d){let u=r.get(d);if(u){let f=d.index;f!==null&&u.version<f.version&&c(d)}else c(d);return r.get(d)}return{get:a,update:l,getWireframeAttribute:h}}function Xb(i,t,e){let n;function s(d){n=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function l(d,u){i.drawElements(n,u,r,d*o),e.update(u,n,1)}function c(d,u,f){f!==0&&(i.drawElementsInstanced(n,u,r,d*o,f),e.update(u,n,f))}function h(d,u,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,d,0,f);let g=0;for(let p=0;p<f;p++)g+=u[p];e.update(g,n,1)}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function $b(i){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(e.calls++,o){case i.TRIANGLES:e.triangles+=a*(r/3);break;case i.LINES:e.lines+=a*(r/2);break;case i.LINE_STRIP:e.lines+=a*(r-1);break;case i.LINE_LOOP:e.lines+=a*r;break;case i.POINTS:e.points+=a*r;break;default:Nt("WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function Zb(i,t,e){let n=new WeakMap,s=new _e;function r(o,a,l){let c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=h!==void 0?h.length:0,u=n.get(a);if(u===void 0||u.count!==d){let S=function(){C.dispose(),n.delete(a),a.removeEventListener("dispose",S)};u!==void 0&&u.texture.dispose();let f=a.morphAttributes.position!==void 0,x=a.morphAttributes.normal!==void 0,g=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],m=a.morphAttributes.normal||[],v=a.morphAttributes.color||[],E=0;f===!0&&(E=1),x===!0&&(E=2),g===!0&&(E=3);let M=a.attributes.position.count*E,T=1;M>t.maxTextureSize&&(T=Math.ceil(M/t.maxTextureSize),M=t.maxTextureSize);let w=new Float32Array(M*T*4*d),C=new qo(w,M,T,d);C.type=qn,C.needsUpdate=!0;let _=E*4;for(let R=0;R<d;R++){let P=p[R],k=m[R],B=v[R],I=M*T*4*R;for(let F=0;F<P.count;F++){let V=F*_;f===!0&&(s.fromBufferAttribute(P,F),w[I+V+0]=s.x,w[I+V+1]=s.y,w[I+V+2]=s.z,w[I+V+3]=0),x===!0&&(s.fromBufferAttribute(k,F),w[I+V+4]=s.x,w[I+V+5]=s.y,w[I+V+6]=s.z,w[I+V+7]=0),g===!0&&(s.fromBufferAttribute(B,F),w[I+V+8]=s.x,w[I+V+9]=s.y,w[I+V+10]=s.z,w[I+V+11]=B.itemSize===4?s.w:1)}}u={count:d,texture:C,size:new bt(M,T)},n.set(a,u),a.addEventListener("dispose",S)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,e);else{let f=0;for(let g=0;g<c.length;g++)f+=c[g];let x=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(i,"morphTargetBaseInfluence",x),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function qb(i,t,e,n,s){let r=new WeakMap;function o(c){let h=s.render.frame,d=c.geometry,u=t.get(c,d);if(r.get(u)!==h&&(t.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let f=c.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return u}function a(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:o,dispose:a}}var Yb={[Ld]:"LINEAR_TONE_MAPPING",[Dd]:"REINHARD_TONE_MAPPING",[Nd]:"CINEON_TONE_MAPPING",[Od]:"ACES_FILMIC_TONE_MAPPING",[Fd]:"AGX_TONE_MAPPING",[Bd]:"NEUTRAL_TONE_MAPPING",[Ud]:"CUSTOM_TONE_MAPPING"};function jb(i,t,e,n,s,r){let o=new Ce(t,e,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),a=null,l=null,c=new ve;c.setAttribute("position",new Jt([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new Jt([0,2,0,0,2,0],2));let h=new sc({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),d=new Bt(c,h),u=new Ps(-1,1,1,-1,0,1),f=null,x=null,g=!1,p,m=null,v=[],E=!1;this.setSize=function(M,T){o.setSize(M,T),a!==null&&a.setSize(M,T),l!==null&&l.setSize(M,T);for(let w=0;w<v.length;w++){let C=v[w];C.setSize&&C.setSize(M,T)}},this.setEffects=function(M){v=M,E=v.length>0&&v[0].isRenderPass===!0;let T=o.width,w=o.height;v.length>0&&a===null&&(a=new Ce(T,w,{type:We,depthBuffer:!1,stencilBuffer:!1}),l=new Ce(T,w,{type:We,depthBuffer:!1,stencilBuffer:!1}));for(let C=0;C<v.length;C++){let _=v[C];_.setSize&&_.setSize(T,w)}},this.begin=function(M,T){if(g||M.toneMapping===Cn&&v.length===0)return!1;if(m=T,T!==null){let w=T.width,C=T.height;(o.width!==w||o.height!==C)&&this.setSize(w,C)}return E===!1&&M.setRenderTarget(o),p=M.toneMapping,M.toneMapping=Cn,!0},this.hasRenderPass=function(){return E},this.end=function(M,T){M.toneMapping=p,g=!0;let w=o,C=a;for(let _=0;_<v.length;_++){let S=v[_];S.enabled!==!1&&(S.render(M,C,w,T),S.needsSwap!==!1&&(w=C,C=C===a?l:a))}if(f!==M.outputColorSpace||x!==M.toneMapping){f=M.outputColorSpace,x=M.toneMapping,h.defines={},Yt.getTransfer(f)===se&&(h.defines.SRGB_TRANSFER="");let _=Yb[x];_&&(h.defines[_]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=w.texture,M.setRenderTarget(m),M.render(d,u),m=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){o.dispose(),a!==null&&a.dispose(),l!==null&&l.dispose(),c.dispose(),h.dispose()}}var p0=new Ve,af=new Ki(1,1),m0=new qo,g0=new tc,x0=new Qo,Yg=[],jg=[],Kg=new Float32Array(16),Jg=new Float32Array(9),Qg=new Float32Array(4);function $r(i,t,e){let n=i[0];if(n<=0||n>0)return i;let s=t*e,r=Yg[s];if(r===void 0&&(r=new Float32Array(s),Yg[s]=r),t!==0){n.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,i[o].toArray(r,a)}return r}function Xe(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function $e(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function uh(i,t){let e=jg[t];e===void 0&&(e=new Int32Array(t),jg[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function Kb(i,t){let e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function Jb(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Xe(e,t))return;i.uniform2fv(this.addr,t),$e(e,t)}}function Qb(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Xe(e,t))return;i.uniform3fv(this.addr,t),$e(e,t)}}function tS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Xe(e,t))return;i.uniform4fv(this.addr,t),$e(e,t)}}function eS(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(Xe(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),$e(e,t)}else{if(Xe(e,n))return;Qg.set(n),i.uniformMatrix2fv(this.addr,!1,Qg),$e(e,n)}}function nS(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(Xe(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),$e(e,t)}else{if(Xe(e,n))return;Jg.set(n),i.uniformMatrix3fv(this.addr,!1,Jg),$e(e,n)}}function iS(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(Xe(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),$e(e,t)}else{if(Xe(e,n))return;Kg.set(n),i.uniformMatrix4fv(this.addr,!1,Kg),$e(e,n)}}function sS(i,t){let e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function rS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Xe(e,t))return;i.uniform2iv(this.addr,t),$e(e,t)}}function oS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Xe(e,t))return;i.uniform3iv(this.addr,t),$e(e,t)}}function aS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Xe(e,t))return;i.uniform4iv(this.addr,t),$e(e,t)}}function lS(i,t){let e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function cS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Xe(e,t))return;i.uniform2uiv(this.addr,t),$e(e,t)}}function hS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Xe(e,t))return;i.uniform3uiv(this.addr,t),$e(e,t)}}function uS(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Xe(e,t))return;i.uniform4uiv(this.addr,t),$e(e,t)}}function dS(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(af.compareFunction=e.isReversedDepthBuffer()?rh:sh,r=af):r=p0,e.setTexture2D(t||r,s)}function fS(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||g0,s)}function pS(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||x0,s)}function mS(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||m0,s)}function gS(i){switch(i){case 5126:return Kb;case 35664:return Jb;case 35665:return Qb;case 35666:return tS;case 35674:return eS;case 35675:return nS;case 35676:return iS;case 5124:case 35670:return sS;case 35667:case 35671:return rS;case 35668:case 35672:return oS;case 35669:case 35673:return aS;case 5125:return lS;case 36294:return cS;case 36295:return hS;case 36296:return uS;case 35678:case 36198:case 36298:case 36306:case 35682:return dS;case 35679:case 36299:case 36307:return fS;case 35680:case 36300:case 36308:case 36293:return pS;case 36289:case 36303:case 36311:case 36292:return mS}}function xS(i,t){i.uniform1fv(this.addr,t)}function yS(i,t){let e=$r(t,this.size,2);i.uniform2fv(this.addr,e)}function _S(i,t){let e=$r(t,this.size,3);i.uniform3fv(this.addr,e)}function vS(i,t){let e=$r(t,this.size,4);i.uniform4fv(this.addr,e)}function MS(i,t){let e=$r(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function bS(i,t){let e=$r(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function SS(i,t){let e=$r(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function wS(i,t){i.uniform1iv(this.addr,t)}function TS(i,t){i.uniform2iv(this.addr,t)}function ES(i,t){i.uniform3iv(this.addr,t)}function AS(i,t){i.uniform4iv(this.addr,t)}function CS(i,t){i.uniform1uiv(this.addr,t)}function RS(i,t){i.uniform2uiv(this.addr,t)}function PS(i,t){i.uniform3uiv(this.addr,t)}function IS(i,t){i.uniform4uiv(this.addr,t)}function kS(i,t,e){let n=this.cache,s=t.length,r=uh(e,s);Xe(n,r)||(i.uniform1iv(this.addr,r),$e(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=af:o=p0;for(let a=0;a!==s;++a)e.setTexture2D(t[a]||o,r[a])}function LS(i,t,e){let n=this.cache,s=t.length,r=uh(e,s);Xe(n,r)||(i.uniform1iv(this.addr,r),$e(n,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||g0,r[o])}function DS(i,t,e){let n=this.cache,s=t.length,r=uh(e,s);Xe(n,r)||(i.uniform1iv(this.addr,r),$e(n,r));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||x0,r[o])}function NS(i,t,e){let n=this.cache,s=t.length,r=uh(e,s);Xe(n,r)||(i.uniform1iv(this.addr,r),$e(n,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||m0,r[o])}function OS(i){switch(i){case 5126:return xS;case 35664:return yS;case 35665:return _S;case 35666:return vS;case 35674:return MS;case 35675:return bS;case 35676:return SS;case 5124:case 35670:return wS;case 35667:case 35671:return TS;case 35668:case 35672:return ES;case 35669:case 35673:return AS;case 5125:return CS;case 36294:return RS;case 36295:return PS;case 36296:return IS;case 35678:case 36198:case 36298:case 36306:case 35682:return kS;case 35679:case 36299:case 36307:return LS;case 35680:case 36300:case 36308:case 36293:return DS;case 36289:case 36303:case 36311:case 36292:return NS}}var lf=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=gS(e.type)}},cf=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=OS(e.type)}},hf=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(t,e[a.id],n)}}},rf=/(\w+)(\])?(\[|\.)?/g;function t0(i,t){i.seq.push(t),i.map[t.id]=t}function US(i,t,e){let n=i.name,s=n.length;for(rf.lastIndex=0;;){let r=rf.exec(n),o=rf.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){t0(e,c===void 0?new lf(a,i,t):new cf(a,i,t));break}else{let d=e.map[a];d===void 0&&(d=new hf(a),t0(e,d)),e=d}}}var Wr=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){let a=t.getActiveUniform(e,o),l=t.getUniformLocation(e,a.name);US(a,l,this)}let s=[],r=[];for(let o of this.seq)o.type===t.SAMPLER_2D_SHADOW||o.type===t.SAMPLER_CUBE_SHADOW||o.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){let r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){let s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,o=e.length;r!==o;++r){let a=e[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,s)}}static seqWithValue(t,e){let n=[];for(let s=0,r=t.length;s!==r;++s){let o=t[s];o.id in e&&n.push(o)}return n}};function e0(i,t,e){let n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}var FS=37297,BS=0;function zS(i,t){let e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){let a=o+1;n.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return n.join(`
`)}var n0=new Ht;function HS(i){Yt._getMatrix(n0,Yt.workingColorSpace,i);let t=`mat3( ${n0.elements.map(e=>e.toFixed(4))} )`;switch(Yt.getTransfer(i)){case Wo:return[t,"LinearTransferOETF"];case se:return[t,"sRGBTransferOETF"];default:return Ot("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function i0(i,t,e){let n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return e.toUpperCase()+`

`+r+`

`+zS(i.getShaderSource(t),a)}else return r}function GS(i,t){let e=HS(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var VS={[Ld]:"Linear",[Dd]:"Reinhard",[Nd]:"Cineon",[Od]:"ACESFilmic",[Fd]:"AgX",[Bd]:"Neutral",[Ud]:"Custom"};function WS(i,t){let e=VS[t];return e===void 0?(Ot("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var ah=new D;function XS(){Yt.getLuminanceCoefficients(ah);let i=ah.x.toFixed(4),t=ah.y.toFixed(4),e=ah.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function $S(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(ba).join(`
`)}function ZS(i){let t=[];for(let e in i){let n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function qS(i,t){let e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(t,s),o=r.name,a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:i.getAttribLocation(t,o),locationSize:a}}return e}function ba(i){return i!==""}function s0(i,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function r0(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var YS=/^[ \t]*#include +<([\w\d./]+)>/gm;function uf(i){return i.replace(YS,KS)}var jS=new Map;function KS(i,t){let e=Wt[t];if(e===void 0){let n=jS.get(t);if(n!==void 0)e=Wt[n],Ot('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return uf(e)}var JS=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function o0(i){return i.replace(JS,QS)}function QS(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function a0(i){let t=`precision ${i.precision} float;
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
#define LOW_PRECISION`),t}var t1={[Is]:"SHADOWMAP_TYPE_PCF",[Fr]:"SHADOWMAP_TYPE_VSM"};function e1(i){return t1[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var n1={[is]:"ENVMAP_TYPE_CUBE",[Ls]:"ENVMAP_TYPE_CUBE",[da]:"ENVMAP_TYPE_CUBE_UV"};function i1(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":n1[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var s1={[Ls]:"ENVMAP_MODE_REFRACTION"};function r1(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":s1[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var o1={[kd]:"ENVMAP_BLENDING_MULTIPLY",[Tg]:"ENVMAP_BLENDING_MIX",[Eg]:"ENVMAP_BLENDING_ADD"};function a1(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":o1[i.combine]||"ENVMAP_BLENDING_NONE"}function l1(i){let t=i.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function c1(i,t,e,n){let s=i.getContext(),r=e.defines,o=e.vertexShader,a=e.fragmentShader,l=e1(e),c=i1(e),h=r1(e),d=a1(e),u=l1(e),f=$S(e),x=ZS(r),g=s.createProgram(),p,m,v=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x].filter(ba).join(`
`),p.length>0&&(p+=`
`),m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x].filter(ba).join(`
`),m.length>0&&(m+=`
`)):(p=[a0(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ba).join(`
`),m=[a0(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Cn?"#define TONE_MAPPING":"",e.toneMapping!==Cn?Wt.tonemapping_pars_fragment:"",e.toneMapping!==Cn?WS("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Wt.colorspace_pars_fragment,GS("linearToOutputTexel",e.outputColorSpace),XS(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(ba).join(`
`)),o=uf(o),o=s0(o,e),o=r0(o,e),a=uf(a),a=s0(a,e),a=r0(a,e),o=o0(o),a=o0(a),e.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,p=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,m=["#define varying in",e.glslVersion===Yd?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Yd?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);let E=v+p+o,M=v+m+a,T=e0(s,s.VERTEX_SHADER,E),w=e0(s,s.FRAGMENT_SHADER,M);s.attachShader(g,T),s.attachShader(g,w),e.index0AttributeName!==void 0?s.bindAttribLocation(g,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(g,0,"position"),s.linkProgram(g);function C(P){if(i.debug.checkShaderErrors){let k=s.getProgramInfoLog(g)||"",B=s.getShaderInfoLog(T)||"",I=s.getShaderInfoLog(w)||"",F=k.trim(),V=B.trim(),Z=I.trim(),nt=!0,$=!0;if(s.getProgramParameter(g,s.LINK_STATUS)===!1)if(nt=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,g,T,w);else{let K=i0(s,T,"vertex"),et=i0(s,w,"fragment");Nt("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(g,s.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+F+`
`+K+`
`+et)}else F!==""?Ot("WebGLProgram: Program Info Log:",F):(V===""||Z==="")&&($=!1);$&&(P.diagnostics={runnable:nt,programLog:F,vertexShader:{log:V,prefix:p},fragmentShader:{log:Z,prefix:m}})}s.deleteShader(T),s.deleteShader(w),_=new Wr(s,g),S=qS(s,g)}let _;this.getUniforms=function(){return _===void 0&&C(this),_};let S;this.getAttributes=function(){return S===void 0&&C(this),S};let R=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return R===!1&&(R=s.getProgramParameter(g,FS)),R},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(g),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=BS++,this.cacheKey=t,this.usedTimes=1,this.program=g,this.vertexShader=T,this.fragmentShader=w,this}var h1=0,df=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new ff(t),e.set(t,n)),n}},ff=class{constructor(t){this.id=h1++,this.code=t,this.usedTimes=0}};function u1(i){return i===rs||i===ya||i===_a}function d1(i,t,e,n,s,r){let o=new Cr,a=new df,l=new Set,c=[],h=new Map,d=n.logarithmicDepthBuffer,u=n.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(_){return l.add(_),_===0?"uv":`uv${_}`}function g(_,S,R,P,k,B){let I=P.fog,F=k.geometry,V=_.isMeshStandardMaterial||_.isMeshLambertMaterial||_.isMeshPhongMaterial?P.environment:null,Z=_.isMeshStandardMaterial||_.isMeshLambertMaterial&&!_.envMap||_.isMeshPhongMaterial&&!_.envMap,nt=t.get(_.envMap||V,Z),$=nt&&nt.mapping===da?nt.image.height:null,K=f[_.type];_.precision!==null&&(u=n.getMaxPrecision(_.precision),u!==_.precision&&Ot("WebGLProgram.getParameters:",_.precision,"not supported, using",u,"instead."));let et=F.morphAttributes.position||F.morphAttributes.normal||F.morphAttributes.color,at=et!==void 0?et.length:0,rt=0;F.morphAttributes.position!==void 0&&(rt=1),F.morphAttributes.normal!==void 0&&(rt=2),F.morphAttributes.color!==void 0&&(rt=3);let zt,kt,Lt,X;if(K){let he=fi[K];zt=he.vertexShader,kt=he.fragmentShader}else{zt=_.vertexShader,kt=_.fragmentShader;let he=a.getVertexShaderStage(_),ne=a.getFragmentShaderStage(_);a.update(_,he,ne),Lt=he.id,X=ne.id}let Q=i.getRenderTarget(),yt=i.state.buffers.depth.getReversed(),Ft=k.isInstancedMesh===!0,vt=k.isBatchedMesh===!0,Xt=!!_.map,He=!!_.matcap,$t=!!nt,te=!!_.aoMap,ce=!!_.lightMap,qt=!!_.bumpMap&&_.wireframe===!1,ye=!!_.normalMap,Ze=!!_.displacementMap,pn=!!_.emissiveMap,be=!!_.metalnessMap,Ne=!!_.roughnessMap,O=_.anisotropy>0,sn=_.clearcoat>0,re=_.dispersion>0,A=_.retroreflectivity>0,y=_.iridescence>0,U=_.sheen>0,G=_.transmission>0,q=O&&!!_.anisotropyMap,ot=sn&&!!_.clearcoatMap,lt=sn&&!!_.clearcoatNormalMap,Y=sn&&!!_.clearcoatRoughnessMap,tt=y&&!!_.iridescenceMap,ct=y&&!!_.iridescenceThicknessMap,Rt=U&&!!_.sheenColorMap,ft=U&&!!_.sheenRoughnessMap,ht=!!_.specularMap,Pt=!!_.specularColorMap,Dt=!!_.specularIntensityMap,Gt=G&&!!_.transmissionMap,N=G&&!!_.thicknessMap,ut=!!_.gradientMap,j=!!_.alphaMap,dt=_.alphaTest>0,xt=!!_.alphaHash,it=!!_.extensions,It=Cn;_.toneMapped&&(Q===null||Q.isXRRenderTarget===!0)&&(It=i.toneMapping);let Tt={shaderID:K,shaderType:_.type,shaderName:_.name,vertexShader:zt,fragmentShader:kt,defines:_.defines,customVertexShaderID:Lt,customFragmentShaderID:X,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:u,batching:vt,batchingColor:vt&&k._colorsTexture!==null,instancing:Ft,instancingColor:Ft&&k.instanceColor!==null,instancingMorph:Ft&&k.morphTexture!==null,outputColorSpace:Q===null?i.outputColorSpace:Q.isXRRenderTarget===!0?Q.texture.colorSpace:Yt.workingColorSpace,alphaToCoverage:!!_.alphaToCoverage,map:Xt,matcap:He,envMap:$t,envMapMode:$t&&nt.mapping,envMapCubeUVHeight:$,aoMap:te,lightMap:ce,bumpMap:qt,normalMap:ye,displacementMap:Ze,emissiveMap:pn,normalMapObjectSpace:ye&&_.normalMapType===Rg,normalMapTangentSpace:ye&&_.normalMapType===ih,packedNormalMap:ye&&_.normalMapType===ih&&u1(_.normalMap.format),metalnessMap:be,roughnessMap:Ne,anisotropy:O,anisotropyMap:q,clearcoat:sn,clearcoatMap:ot,clearcoatNormalMap:lt,clearcoatRoughnessMap:Y,dispersion:re,retroreflection:A,iridescence:y,iridescenceMap:tt,iridescenceThicknessMap:ct,sheen:U,sheenColorMap:Rt,sheenRoughnessMap:ft,specularMap:ht,specularColorMap:Pt,specularIntensityMap:Dt,transmission:G,transmissionMap:Gt,thicknessMap:N,gradientMap:ut,opaque:_.transparent===!1&&_.blending===ns&&_.alphaToCoverage===!1,alphaMap:j,alphaTest:dt,alphaHash:xt,combine:_.combine,mapUv:Xt&&x(_.map.channel),aoMapUv:te&&x(_.aoMap.channel),lightMapUv:ce&&x(_.lightMap.channel),bumpMapUv:qt&&x(_.bumpMap.channel),normalMapUv:ye&&x(_.normalMap.channel),displacementMapUv:Ze&&x(_.displacementMap.channel),emissiveMapUv:pn&&x(_.emissiveMap.channel),metalnessMapUv:be&&x(_.metalnessMap.channel),roughnessMapUv:Ne&&x(_.roughnessMap.channel),anisotropyMapUv:q&&x(_.anisotropyMap.channel),clearcoatMapUv:ot&&x(_.clearcoatMap.channel),clearcoatNormalMapUv:lt&&x(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Y&&x(_.clearcoatRoughnessMap.channel),iridescenceMapUv:tt&&x(_.iridescenceMap.channel),iridescenceThicknessMapUv:ct&&x(_.iridescenceThicknessMap.channel),sheenColorMapUv:Rt&&x(_.sheenColorMap.channel),sheenRoughnessMapUv:ft&&x(_.sheenRoughnessMap.channel),specularMapUv:ht&&x(_.specularMap.channel),specularColorMapUv:Pt&&x(_.specularColorMap.channel),specularIntensityMapUv:Dt&&x(_.specularIntensityMap.channel),transmissionMapUv:Gt&&x(_.transmissionMap.channel),thicknessMapUv:N&&x(_.thicknessMap.channel),alphaMapUv:j&&x(_.alphaMap.channel),vertexTangents:!!F.attributes.tangent&&(ye||O),vertexNormals:!!F.attributes.normal,vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!F.attributes.color&&F.attributes.color.itemSize===4,pointsUvs:k.isPoints===!0&&!!F.attributes.uv&&(Xt||j),fog:!!I,useFog:_.fog===!0,fogExp2:!!I&&I.isFogExp2,flatShading:_.wireframe===!1&&(_.flatShading===!0||F.attributes.normal===void 0&&ye===!1&&(_.isMeshLambertMaterial||_.isMeshPhongMaterial||_.isMeshStandardMaterial||_.isMeshPhysicalMaterial)),sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:yt,skinning:k.isSkinnedMesh===!0,hasPositionAttribute:F.attributes.position!==void 0,morphTargets:F.morphAttributes.position!==void 0,morphNormals:F.morphAttributes.normal!==void 0,morphColors:F.morphAttributes.color!==void 0,morphTargetsCount:at,morphTextureStride:rt,numSunLights:S.sun.length,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numSunLightShadows:S.sunShadowMap.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numLightProbeGrids:B.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:_.dithering,shadowMapEnabled:i.shadowMap.enabled&&R.length>0,shadowMapType:i.shadowMap.type,toneMapping:It,decodeVideoTexture:Xt&&_.map.isVideoTexture===!0&&Yt.getTransfer(_.map.colorSpace)===se,decodeVideoTextureEmissive:pn&&_.emissiveMap.isVideoTexture===!0&&Yt.getTransfer(_.emissiveMap.colorSpace)===se,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===yn,flipSided:_.side===dn,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:it&&_.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(it&&_.extensions.multiDraw===!0||vt)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return Tt.vertexUv1s=l.has(1),Tt.vertexUv2s=l.has(2),Tt.vertexUv3s=l.has(3),l.clear(),Tt}function p(_){let S=[];if(_.shaderID?S.push(_.shaderID):(S.push(_.customVertexShaderID),S.push(_.customFragmentShaderID)),_.defines!==void 0)for(let R in _.defines)S.push(R),S.push(_.defines[R]);return _.isRawShaderMaterial===!1&&(m(S,_),v(S,_),S.push(i.outputColorSpace)),S.push(_.customProgramCacheKey),S.join()}function m(_,S){_.push(S.precision),_.push(S.outputColorSpace),_.push(S.envMapMode),_.push(S.envMapCubeUVHeight),_.push(S.mapUv),_.push(S.alphaMapUv),_.push(S.lightMapUv),_.push(S.aoMapUv),_.push(S.bumpMapUv),_.push(S.normalMapUv),_.push(S.displacementMapUv),_.push(S.emissiveMapUv),_.push(S.metalnessMapUv),_.push(S.roughnessMapUv),_.push(S.anisotropyMapUv),_.push(S.clearcoatMapUv),_.push(S.clearcoatNormalMapUv),_.push(S.clearcoatRoughnessMapUv),_.push(S.iridescenceMapUv),_.push(S.iridescenceThicknessMapUv),_.push(S.sheenColorMapUv),_.push(S.sheenRoughnessMapUv),_.push(S.specularMapUv),_.push(S.specularColorMapUv),_.push(S.specularIntensityMapUv),_.push(S.transmissionMapUv),_.push(S.thicknessMapUv),_.push(S.combine),_.push(S.fogExp2),_.push(S.sizeAttenuation),_.push(S.morphTargetsCount),_.push(S.morphAttributeCount),_.push(S.numSunLights),_.push(S.numDirLights),_.push(S.numPointLights),_.push(S.numSpotLights),_.push(S.numSpotLightMaps),_.push(S.numHemiLights),_.push(S.numRectAreaLights),_.push(S.numSunLightShadows),_.push(S.numDirLightShadows),_.push(S.numPointLightShadows),_.push(S.numSpotLightShadows),_.push(S.numSpotLightShadowsWithMaps),_.push(S.numLightProbes),_.push(S.shadowMapType),_.push(S.toneMapping),_.push(S.numClippingPlanes),_.push(S.numClipIntersection),_.push(S.depthPacking)}function v(_,S){o.disableAll(),S.instancing&&o.enable(0),S.instancingColor&&o.enable(1),S.instancingMorph&&o.enable(2),S.matcap&&o.enable(3),S.envMap&&o.enable(4),S.normalMapObjectSpace&&o.enable(5),S.normalMapTangentSpace&&o.enable(6),S.clearcoat&&o.enable(7),S.iridescence&&o.enable(8),S.alphaTest&&o.enable(9),S.vertexColors&&o.enable(10),S.vertexAlphas&&o.enable(11),S.vertexUv1s&&o.enable(12),S.vertexUv2s&&o.enable(13),S.vertexUv3s&&o.enable(14),S.vertexTangents&&o.enable(15),S.anisotropy&&o.enable(16),S.alphaHash&&o.enable(17),S.batching&&o.enable(18),S.dispersion&&o.enable(19),S.retroreflection&&o.enable(24),S.batchingColor&&o.enable(20),S.gradientMap&&o.enable(21),S.packedNormalMap&&o.enable(22),S.vertexNormals&&o.enable(23),_.push(o.mask),o.disableAll(),S.fog&&o.enable(0),S.useFog&&o.enable(1),S.flatShading&&o.enable(2),S.logarithmicDepthBuffer&&o.enable(3),S.reversedDepthBuffer&&o.enable(4),S.skinning&&o.enable(5),S.morphTargets&&o.enable(6),S.morphNormals&&o.enable(7),S.morphColors&&o.enable(8),S.premultipliedAlpha&&o.enable(9),S.shadowMapEnabled&&o.enable(10),S.doubleSided&&o.enable(11),S.flipSided&&o.enable(12),S.useDepthPacking&&o.enable(13),S.dithering&&o.enable(14),S.transmission&&o.enable(15),S.sheen&&o.enable(16),S.opaque&&o.enable(17),S.pointsUvs&&o.enable(18),S.decodeVideoTexture&&o.enable(19),S.decodeVideoTextureEmissive&&o.enable(20),S.alphaToCoverage&&o.enable(21),S.numLightProbeGrids>0&&o.enable(22),S.hasPositionAttribute&&o.enable(23),_.push(o.mask)}function E(_){let S=f[_.type],R;if(S){let P=fi[S];R=Ns.clone(P.uniforms)}else R=_.uniforms;return R}function M(_,S){let R=h.get(S);return R!==void 0?++R.usedTimes:(R=new c1(i,S,_,s),c.push(R),h.set(S,R)),R}function T(_){if(--_.usedTimes===0){let S=c.indexOf(_);c[S]=c[c.length-1],c.pop(),h.delete(_.cacheKey),_.destroy()}}function w(_){a.remove(_)}function C(){a.dispose()}return{getParameters:g,getProgramCacheKey:p,getUniforms:E,acquireProgram:M,releaseProgram:T,releaseShaderCache:w,programs:c,dispose:C}}function f1(){let i=new WeakMap;function t(o){return i.has(o)}function e(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function p1(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function l0(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function c0(){let i=[],t=0,e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function o(u){let f=0;return u.isInstancedMesh&&(f+=2),u.isSkinnedMesh&&(f+=1),f}function a(u,f,x,g,p,m){let v=i[t];return v===void 0?(v={id:u.id,object:u,geometry:f,material:x,materialVariant:o(u),groupOrder:g,renderOrder:u.renderOrder,z:p,group:m},i[t]=v):(v.id=u.id,v.object=u,v.geometry=f,v.material=x,v.materialVariant=o(u),v.groupOrder=g,v.renderOrder=u.renderOrder,v.z=p,v.group=m),t++,v}function l(u,f,x,g,p,m,v){v.reversedDepth===!0&&(p=-p);let E=a(u,f,x,g,p,m);x.transmission>0?n.push(E):x.transparent===!0?s.push(E):e.push(E)}function c(u,f,x,g,p,m){let v=a(u,f,x,g,p,m);x.transmission>0?n.unshift(v):x.transparent===!0?s.unshift(v):e.unshift(v)}function h(u,f){e.length>1&&e.sort(u||p1),n.length>1&&n.sort(f||l0),s.length>1&&s.sort(f||l0)}function d(){for(let u=t,f=i.length;u<f;u++){let x=i[u];if(x.id===null)break;x.id=null,x.object=null,x.geometry=null,x.material=null,x.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:d,sort:h}}function m1(){let i=new WeakMap;function t(n,s){let r=i.get(n),o;return r===void 0?(o=new c0,i.set(n,[o])):s>=r.length?(o=new c0,r.push(o)):o=r[s],o}function e(){i=new WeakMap}return{get:t,dispose:e}}function g1(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new D,color:new Ct};break;case"SpotLight":e={position:new D,direction:new D,color:new Ct,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new D,color:new Ct,distance:0,decay:0};break;case"HemisphereLight":e={direction:new D,skyColor:new Ct,groundColor:new Ct};break;case"RectAreaLight":e={color:new Ct,position:new D,halfWidth:new D,halfHeight:new D};break}return i[t.id]=e,e}}}function x1(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}var y1=0;function _1(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function v1(i){let t=new g1,e=x1(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new D);let s=new D,r=new de,o=new de;function a(c){let h=0,d=0,u=0;for(let k=0;k<9;k++)n.probe[k].set(0,0,0);let f=0,x=0,g=0,p=0,m=0,v=0,E=0,M=0,T=0,w=0,C=0,_=0,S=0,R=0;c.sort(_1);for(let k=0,B=c.length;k<B;k++){let I=c[k],F=I.color,V=I.intensity,Z=I.distance,nt=null;if(I.shadow&&I.shadow.map&&(I.shadow.map.texture.format===rs?nt=I.shadow.map.texture:nt=I.shadow.map.depthTexture||I.shadow.map.texture),I.isAmbientLight)h+=F.r*V,d+=F.g*V,u+=F.b*V;else if(I.isLightProbe){for(let $=0;$<9;$++)n.probe[$].addScaledVector(I.sh.coefficients[$],V);R++}else if(I.isSunLight){let $=t.get(I);if($.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let K=I.shadow,et=e.get(I);et.shadowIntensity=K.intensity,et.shadowBias=K.bias,et.shadowNormalBias=K.normalBias,et.shadowRadius=K.radius,et.shadowMapSize.copy(K.mapSize).multiply(K.getFrameExtents()),n.sunShadow[x]=et,n.sunShadowMap[x]=nt;let at=K.getViewportCount();for(let rt=0;rt<at;rt++)n.sunShadowMatrix[g+rt]=K.getMatrix(rt),n.sunShadowCascade[g+rt]=K._cascadeData[rt];g+=at,x++}n.sun[f]=$,f++}else if(I.isDirectionalLight){let $=t.get(I);if($.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let K=I.shadow,et=e.get(I);et.shadowIntensity=K.intensity,et.shadowBias=K.bias,et.shadowNormalBias=K.normalBias,et.shadowRadius=K.radius,et.shadowMapSize=K.mapSize,n.directionalShadow[p]=et,n.directionalShadowMap[p]=nt,n.directionalShadowMatrix[p]=I.shadow.matrix,T++}n.directional[p]=$,p++}else if(I.isSpotLight){let $=t.get(I);$.position.setFromMatrixPosition(I.matrixWorld),$.color.copy(F).multiplyScalar(V),$.distance=Z,$.coneCos=Math.cos(I.angle),$.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),$.decay=I.decay,n.spot[v]=$;let K=I.shadow;if(I.map&&(n.spotLightMap[_]=I.map,_++,K.updateMatrices(I),I.castShadow&&S++),n.spotLightMatrix[v]=K.matrix,I.castShadow){let et=e.get(I);et.shadowIntensity=K.intensity,et.shadowBias=K.bias,et.shadowNormalBias=K.normalBias,et.shadowRadius=K.radius,et.shadowMapSize=K.mapSize,n.spotShadow[v]=et,n.spotShadowMap[v]=nt,C++}v++}else if(I.isRectAreaLight){let $=t.get(I);$.color.copy(F).multiplyScalar(V),$.halfWidth.set(I.width*.5,0,0),$.halfHeight.set(0,I.height*.5,0),n.rectArea[E]=$,E++}else if(I.isPointLight){let $=t.get(I);if($.color.copy(I.color).multiplyScalar(I.intensity),$.distance=I.distance,$.decay=I.decay,I.castShadow){let K=I.shadow,et=e.get(I);et.shadowIntensity=K.intensity,et.shadowBias=K.bias,et.shadowNormalBias=K.normalBias,et.shadowRadius=K.radius,et.shadowMapSize=K.mapSize,et.shadowCameraNear=K.camera.near,et.shadowCameraFar=K.camera.far,n.pointShadow[m]=et,n.pointShadowMap[m]=nt,n.pointShadowMatrix[m]=I.shadow.matrix,w++}n.point[m]=$,m++}else if(I.isHemisphereLight){let $=t.get(I);$.skyColor.copy(I.color).multiplyScalar(V),$.groundColor.copy(I.groundColor).multiplyScalar(V),n.hemi[M]=$,M++}}E>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=pt.LTC_FLOAT_1,n.rectAreaLTC2=pt.LTC_FLOAT_2):(n.rectAreaLTC1=pt.LTC_HALF_1,n.rectAreaLTC2=pt.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;let P=n.hash;(P.sunLength!==f||P.directionalLength!==p||P.pointLength!==m||P.spotLength!==v||P.rectAreaLength!==E||P.hemiLength!==M||P.numSunShadows!==x||P.numDirectionalShadows!==T||P.numPointShadows!==w||P.numSpotShadows!==C||P.numSpotMaps!==_||P.numLightProbes!==R)&&(n.sun.length=f,n.directional.length=p,n.spot.length=v,n.rectArea.length=E,n.point.length=m,n.hemi.length=M,n.sunShadow.length=x,n.sunShadowMap.length=x,n.sunShadowMatrix.length=g,n.sunShadowCascade.length=g,n.directionalShadow.length=T,n.directionalShadowMap.length=T,n.directionalShadowMatrix.length=T,n.pointShadow.length=w,n.pointShadowMap.length=w,n.pointShadowMatrix.length=w,n.spotShadow.length=C,n.spotShadowMap.length=C,n.spotLightMatrix.length=C+_-S,n.spotLightMap.length=_,n.numSpotLightShadowsWithMaps=S,n.numLightProbes=R,P.sunLength=f,P.directionalLength=p,P.pointLength=m,P.spotLength=v,P.rectAreaLength=E,P.hemiLength=M,P.numSunShadows=x,P.numDirectionalShadows=T,P.numPointShadows=w,P.numSpotShadows=C,P.numSpotMaps=_,P.numLightProbes=R,n.version=y1++)}function l(c,h){let d=0,u=0,f=0,x=0,g=0,p=0,m=h.matrixWorldInverse;for(let v=0,E=c.length;v<E;v++){let M=c[v];if(M.isSunLight){let T=n.sun[d];T.direction.setFromMatrixPosition(M.matrixWorld),T.direction.transformDirection(m),d++}else if(M.isDirectionalLight){let T=n.directional[u];T.direction.setFromMatrixPosition(M.matrixWorld),s.setFromMatrixPosition(M.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(m),u++}else if(M.isSpotLight){let T=n.spot[x];T.position.setFromMatrixPosition(M.matrixWorld),T.position.applyMatrix4(m),T.direction.setFromMatrixPosition(M.matrixWorld),s.setFromMatrixPosition(M.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(m),x++}else if(M.isRectAreaLight){let T=n.rectArea[g];T.position.setFromMatrixPosition(M.matrixWorld),T.position.applyMatrix4(m),o.identity(),r.copy(M.matrixWorld),r.premultiply(m),o.extractRotation(r),T.halfWidth.set(M.width*.5,0,0),T.halfHeight.set(0,M.height*.5,0),T.halfWidth.applyMatrix4(o),T.halfHeight.applyMatrix4(o),g++}else if(M.isPointLight){let T=n.point[f];T.position.setFromMatrixPosition(M.matrixWorld),T.position.applyMatrix4(m),f++}else if(M.isHemisphereLight){let T=n.hemi[p];T.direction.setFromMatrixPosition(M.matrixWorld),T.direction.transformDirection(m),p++}}}return{setup:a,setupView:l,state:n}}function h0(i){let t=new v1(i),e=[],n=[],s=[];function r(u){d.camera=u,e.length=0,n.length=0,s.length=0}function o(u){e.push(u)}function a(u){n.push(u)}function l(u){s.push(u)}function c(){t.setup(e)}function h(u){t.setupView(e,u)}let d={lightsArray:e,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:d,setupLights:c,setupLightsView:h,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}function M1(i){let t=new WeakMap;function e(s,r=0){let o=t.get(s),a;return o===void 0?(a=new h0(i),t.set(s,[a])):r>=o.length?(a=new h0(i),o.push(a)):a=o[r],a}function n(){t=new WeakMap}return{get:e,dispose:n}}var b1=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,S1=`uniform sampler2D shadow_pass;
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
}`,w1=[new D(1,0,0),new D(-1,0,0),new D(0,1,0),new D(0,-1,0),new D(0,0,1),new D(0,0,-1)],T1=[new D(0,-1,0),new D(0,-1,0),new D(0,0,1),new D(0,0,-1),new D(0,-1,0),new D(0,-1,0)],u0=new de,Ma=new D,of=new D;function E1(i,t,e){let n=new kr,s=new bt,r=new bt,o=new _e,a=new rc,l=new oc,c={},h=e.maxTextureSize,d={[es]:dn,[dn]:es,[yn]:yn},u=new Le({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new bt},radius:{value:4}},vertexShader:b1,fragmentShader:S1}),f=u.clone();f.defines.HORIZONTAL_PASS=1;let x=new ve;x.setAttribute("position",new Be(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let g=new Bt(x,u),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Is;let m=this.type;this.render=function(w,C,_){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||w.length===0)return;this.type===og&&(Ot("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Is);let S=i.getRenderTarget(),R=i.getActiveCubeFace(),P=i.getActiveMipmapLevel(),k=i.state;k.setBlending(Dn),k.buffers.depth.getReversed()===!0?k.buffers.color.setClear(0,0,0,0):k.buffers.color.setClear(1,1,1,1),k.buffers.depth.setTest(!0),k.setScissorTest(!1);let B=m!==this.type;B&&C.traverse(function(I){I.material&&(Array.isArray(I.material)?I.material.forEach(F=>F.needsUpdate=!0):I.material.needsUpdate=!0)});for(let I=0,F=w.length;I<F;I++){let V=w[I],Z=V.shadow;if(Z===void 0){Ot("WebGLShadowMap:",V,"has no shadow.");continue}if(Z.autoUpdate===!1&&Z.needsUpdate===!1)continue;s.copy(Z.mapSize);let nt=Z.getFrameExtents();s.multiply(nt),r.copy(Z.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/nt.x),s.x=r.x*nt.x,Z.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/nt.y),s.y=r.y*nt.y,Z.mapSize.y=r.y));let $=i.state.buffers.depth.getReversed();if(Z.camera._reversedDepth=$,Z.map===null||B===!0){if(Z.map!==null&&(Z.map.depthTexture!==null&&(Z.map.depthTexture.dispose(),Z.map.depthTexture=null),Z.map.dispose()),this.type===Fr){if(V.isPointLight){Ot("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}Z.map=new Ce(s.x,s.y,{format:rs,type:We,minFilter:ze,magFilter:ze,generateMipmaps:!1}),Z.map.texture.name=V.name+".shadowMap",Z.map.depthTexture=new Ki(s.x,s.y,qn),Z.map.depthTexture.name=V.name+".shadowMapDepth",Z.map.depthTexture.format=ri,Z.map.depthTexture.compareFunction=null,Z.map.depthTexture.minFilter=je,Z.map.depthTexture.magFilter=je}else V.isPointLight?(Z.map=new lh(s.x),Z.map.depthTexture=new nc(s.x,Zn)):(Z.map=new Ce(s.x,s.y),Z.map.depthTexture=new Ki(s.x,s.y,Zn)),Z.map.depthTexture.name=V.name+".shadowMap",Z.map.depthTexture.format=ri,this.type===Is?(Z.map.depthTexture.compareFunction=$?rh:sh,Z.map.depthTexture.minFilter=ze,Z.map.depthTexture.magFilter=ze):(Z.map.depthTexture.compareFunction=null,Z.map.depthTexture.minFilter=je,Z.map.depthTexture.magFilter=je);Z.camera.updateProjectionMatrix()}Z.map.isWebGLCubeRenderTarget!==!0&&(Z.map.width!==s.x||Z.map.height!==s.y)&&Z.map.setSize(s.x,s.y);let K=Z.map.isWebGLCubeRenderTarget?6:Z.getViewportCount();V.isPointLight!==!0&&Z.updateMatrices(V,_);for(let et=0;et<K;et++){let at=Z.getCamera(et);if(V.isPointLight){let rt=Z.camera,zt=Z.matrix,kt=V.distance||rt.far;kt!==rt.far&&(rt.far=kt,rt.updateProjectionMatrix()),Ma.setFromMatrixPosition(V.matrixWorld),rt.position.copy(Ma),of.copy(rt.position),of.add(w1[et]),rt.up.copy(T1[et]),rt.lookAt(of),rt.updateMatrixWorld(),zt.makeTranslation(-Ma.x,-Ma.y,-Ma.z),u0.multiplyMatrices(rt.projectionMatrix,rt.matrixWorldInverse),Z._frustum.setFromProjectionMatrix(u0,rt.coordinateSystem,rt.reversedDepth)}if(Z.map.isWebGLCubeRenderTarget)i.setRenderTarget(Z.map,et),i.clear();else{et===0&&(i.setRenderTarget(Z.map),i.clear());let rt=Z.getViewport(et);o.set(r.x*rt.x,r.y*rt.y,r.x*rt.z,r.y*rt.w),k.viewport(o)}n=Z.getFrustum(et),M(C,_,at,V,this.type)}Z.isPointLightShadow!==!0&&this.type===Fr&&v(Z,_),Z.needsUpdate=!1}m=this.type,p.needsUpdate=!1,i.setRenderTarget(S,R,P)};function v(w,C){let _=t.update(g);u.defines.VSM_SAMPLES!==w.blurSamples&&(u.defines.VSM_SAMPLES=w.blurSamples,f.defines.VSM_SAMPLES=w.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),w.mapPass===null?w.mapPass=new Ce(s.x,s.y,{format:rs,type:We}):(w.mapPass.width!==w.map.width||w.mapPass.height!==w.map.height)&&w.mapPass.setSize(w.map.width,w.map.height),u.uniforms.shadow_pass.value=w.map.depthTexture,u.uniforms.resolution.value.set(w.map.width,w.map.height),u.uniforms.radius.value=w.radius,i.setRenderTarget(w.mapPass),i.clear(),i.renderBufferDirect(C,null,_,u,g,null),f.uniforms.shadow_pass.value=w.mapPass.texture,f.uniforms.resolution.value.set(w.map.width,w.map.height),f.uniforms.radius.value=w.radius,i.setRenderTarget(w.map),i.clear(),i.renderBufferDirect(C,null,_,f,g,null)}function E(w,C,_,S){let R=null,P=_.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(P!==void 0)R=P;else if(R=_.isPointLight===!0?l:a,i.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0||C.alphaToCoverage===!0){let k=R.uuid,B=C.uuid,I=c[k];I===void 0&&(I={},c[k]=I);let F=I[B];F===void 0&&(F=R.clone(),I[B]=F,C.addEventListener("dispose",T)),R=F}if(R.visible=C.visible,R.wireframe=C.wireframe,S===Fr?R.side=C.shadowSide!==null?C.shadowSide:C.side:R.side=C.shadowSide!==null?C.shadowSide:d[C.side],R.alphaMap=C.alphaMap,R.alphaTest=C.alphaToCoverage===!0?.5:C.alphaTest,R.map=C.map,R.clipShadows=C.clipShadows,R.clippingPlanes=C.clippingPlanes,R.clipIntersection=C.clipIntersection,R.displacementMap=C.displacementMap,R.displacementScale=C.displacementScale,R.displacementBias=C.displacementBias,R.wireframeLinewidth=C.wireframeLinewidth,R.linewidth=C.linewidth,_.isPointLight===!0&&R.isMeshDistanceMaterial===!0){let k=i.properties.get(R);k.light=_}return R}function M(w,C,_,S,R){if(w.visible===!1)return;if(w.layers.test(C.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&R===Fr)&&(!w.frustumCulled||w.intersectsFrustum(n))){w.modelViewMatrix.multiplyMatrices(_.matrixWorldInverse,w.matrixWorld);let B=t.update(w),I=w.material;if(Array.isArray(I)){let F=B.groups;for(let V=0,Z=F.length;V<Z;V++){let nt=F[V],$=I[nt.materialIndex];if($&&$.visible){let K=E(w,$,S,R);w.onBeforeShadow(i,w,C,_,B,K,nt),i.renderBufferDirect(_,null,B,K,w,nt),w.onAfterShadow(i,w,C,_,B,K,nt)}}}else if(I.visible){let F=E(w,I,S,R);w.onBeforeShadow(i,w,C,_,B,F,null),i.renderBufferDirect(_,null,B,F,w,null),w.onAfterShadow(i,w,C,_,B,F,null)}}let k=w.children;for(let B=0,I=k.length;B<I;B++)M(k[B],C,_,S,R)}function T(w){w.target.removeEventListener("dispose",T);for(let _ in c){let S=c[_],R=w.target.uuid;R in S&&(S[R].dispose(),delete S[R])}}}function A1(i,t){function e(){let N=!1,ut=new _e,j=null,dt=new _e(0,0,0,0);return{setMask:function(xt){j!==xt&&!N&&(i.colorMask(xt,xt,xt,xt),j=xt)},setLocked:function(xt){N=xt},setClear:function(xt,it,It,Tt,he){he===!0&&(xt*=Tt,it*=Tt,It*=Tt),ut.set(xt,it,It,Tt),dt.equals(ut)===!1&&(i.clearColor(xt,it,It,Tt),dt.copy(ut))},reset:function(){N=!1,j=null,dt.set(-1,0,0,0)}}}function n(){let N=!1,ut=!1,j=null,dt=null,xt=null;return{setReversed:function(it){if(ut!==it){let It=t.get("EXT_clip_control");it?It.clipControlEXT(It.LOWER_LEFT_EXT,It.ZERO_TO_ONE_EXT):It.clipControlEXT(It.LOWER_LEFT_EXT,It.NEGATIVE_ONE_TO_ONE_EXT),ut=it;let Tt=xt;xt=null,this.setClear(Tt)}},getReversed:function(){return ut},setTest:function(it){it?Q(i.DEPTH_TEST):yt(i.DEPTH_TEST)},setMask:function(it){j!==it&&!N&&(i.depthMask(it),j=it)},setFunc:function(it){if(ut&&(it=zg[it]),dt!==it){switch(it){case Gl:i.depthFunc(i.NEVER);break;case Vl:i.depthFunc(i.ALWAYS);break;case Wl:i.depthFunc(i.LESS);break;case wr:i.depthFunc(i.LEQUAL);break;case Xl:i.depthFunc(i.EQUAL);break;case $l:i.depthFunc(i.GEQUAL);break;case Zl:i.depthFunc(i.GREATER);break;case ql:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}dt=it}},setLocked:function(it){N=it},setClear:function(it){xt!==it&&(xt=it,ut&&(it=1-it),i.clearDepth(it))},reset:function(){N=!1,j=null,dt=null,xt=null,ut=!1}}}function s(){let N=!1,ut=null,j=null,dt=null,xt=null,it=null,It=null,Tt=null,he=null;return{setTest:function(ne){N||(ne?Q(i.STENCIL_TEST):yt(i.STENCIL_TEST))},setMask:function(ne){ut!==ne&&!N&&(i.stencilMask(ne),ut=ne)},setFunc:function(ne,Fn,Kn){(j!==ne||dt!==Fn||xt!==Kn)&&(i.stencilFunc(ne,Fn,Kn),j=ne,dt=Fn,xt=Kn)},setOp:function(ne,Fn,Kn){(it!==ne||It!==Fn||Tt!==Kn)&&(i.stencilOp(ne,Fn,Kn),it=ne,It=Fn,Tt=Kn)},setLocked:function(ne){N=ne},setClear:function(ne){he!==ne&&(i.clearStencil(ne),he=ne)},reset:function(){N=!1,ut=null,j=null,dt=null,xt=null,it=null,It=null,Tt=null,he=null}}}let r=new e,o=new n,a=new s,l=new WeakMap,c=new WeakMap,h={},d={},u={},f=new WeakMap,x=[],g=null,p=!1,m=null,v=null,E=null,M=null,T=null,w=null,C=null,_=new Ct(0,0,0),S=0,R=!1,P=null,k=null,B=null,I=null,F=null,V=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),Z=!1,nt=0,$=i.getParameter(i.VERSION);$.indexOf("WebGL")!==-1?(nt=parseFloat(/^WebGL (\d)/.exec($)[1]),Z=nt>=1):$.indexOf("OpenGL ES")!==-1&&(nt=parseFloat(/^OpenGL ES (\d)/.exec($)[1]),Z=nt>=2);let K=null,et={},at=i.getParameter(i.SCISSOR_BOX),rt=i.getParameter(i.VIEWPORT),zt=new _e().fromArray(at),kt=new _e().fromArray(rt);function Lt(N,ut,j,dt){let xt=new Uint8Array(4),it=i.createTexture();i.bindTexture(N,it),i.texParameteri(N,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(N,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let It=0;It<j;It++)N===i.TEXTURE_3D||N===i.TEXTURE_2D_ARRAY?i.texImage3D(ut,0,i.RGBA,1,1,dt,0,i.RGBA,i.UNSIGNED_BYTE,xt):i.texImage2D(ut+It,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,xt);return it}let X={};X[i.TEXTURE_2D]=Lt(i.TEXTURE_2D,i.TEXTURE_2D,1),X[i.TEXTURE_CUBE_MAP]=Lt(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),X[i.TEXTURE_2D_ARRAY]=Lt(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),X[i.TEXTURE_3D]=Lt(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),Q(i.DEPTH_TEST),o.setFunc(wr),qt(!1),ye(Ad),Q(i.CULL_FACE),te(Dn);function Q(N){h[N]!==!0&&(i.enable(N),h[N]=!0)}function yt(N){h[N]!==!1&&(i.disable(N),h[N]=!1)}function Ft(N,ut){return u[N]!==ut?(i.bindFramebuffer(N,ut),u[N]=ut,N===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=ut),N===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=ut),!0):!1}function vt(N,ut){let j=x,dt=!1;if(N){j=f.get(ut),j===void 0&&(j=[],f.set(ut,j));let xt=N.textures;if(j.length!==xt.length||j[0]!==i.COLOR_ATTACHMENT0){for(let it=0,It=xt.length;it<It;it++)j[it]=i.COLOR_ATTACHMENT0+it;j.length=xt.length,dt=!0}}else j[0]!==i.BACK&&(j[0]=i.BACK,dt=!0);dt&&i.drawBuffers(j)}function Xt(N){return g!==N?(i.useProgram(N),g=N,!0):!1}let He={[ks]:i.FUNC_ADD,[lg]:i.FUNC_SUBTRACT,[cg]:i.FUNC_REVERSE_SUBTRACT};He[hg]=i.MIN,He[ug]=i.MAX;let $t={[dg]:i.ZERO,[fg]:i.ONE,[pg]:i.SRC_COLOR,[Pd]:i.SRC_ALPHA,[vg]:i.SRC_ALPHA_SATURATE,[yg]:i.DST_COLOR,[gg]:i.DST_ALPHA,[mg]:i.ONE_MINUS_SRC_COLOR,[Id]:i.ONE_MINUS_SRC_ALPHA,[_g]:i.ONE_MINUS_DST_COLOR,[xg]:i.ONE_MINUS_DST_ALPHA,[Mg]:i.CONSTANT_COLOR,[bg]:i.ONE_MINUS_CONSTANT_COLOR,[Sg]:i.CONSTANT_ALPHA,[wg]:i.ONE_MINUS_CONSTANT_ALPHA};function te(N,ut,j,dt,xt,it,It,Tt,he,ne){if(N===Dn){p===!0&&(yt(i.BLEND),p=!1);return}if(p===!1&&(Q(i.BLEND),p=!0),N!==ag){if(N!==m||ne!==R){if((v!==ks||T!==ks)&&(i.blendEquation(i.FUNC_ADD),v=ks,T=ks),ne)switch(N){case ns:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case An:i.blendFunc(i.ONE,i.ONE);break;case Cd:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Rd:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Nt("WebGLState: Invalid blending: ",N);break}else switch(N){case ns:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case An:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Cd:Nt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Rd:Nt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Nt("WebGLState: Invalid blending: ",N);break}E=null,M=null,w=null,C=null,_.set(0,0,0),S=0,m=N,R=ne}return}xt=xt||ut,it=it||j,It=It||dt,(ut!==v||xt!==T)&&(i.blendEquationSeparate(He[ut],He[xt]),v=ut,T=xt),(j!==E||dt!==M||it!==w||It!==C)&&(i.blendFuncSeparate($t[j],$t[dt],$t[it],$t[It]),E=j,M=dt,w=it,C=It),(Tt.equals(_)===!1||he!==S)&&(i.blendColor(Tt.r,Tt.g,Tt.b,he),_.copy(Tt),S=he),m=N,R=!1}function ce(N,ut){N.side===yn?yt(i.CULL_FACE):Q(i.CULL_FACE);let j=N.side===dn;ut&&(j=!j),qt(j),N.blending===ns&&N.transparent===!1?te(Dn):te(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),o.setFunc(N.depthFunc),o.setTest(N.depthTest),o.setMask(N.depthWrite),r.setMask(N.colorWrite);let dt=N.stencilWrite;a.setTest(dt),dt&&(a.setMask(N.stencilWriteMask),a.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),a.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),pn(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?Q(i.SAMPLE_ALPHA_TO_COVERAGE):yt(i.SAMPLE_ALPHA_TO_COVERAGE)}function qt(N){P!==N&&(N?i.frontFace(i.CW):i.frontFace(i.CCW),P=N)}function ye(N){N!==sg?(Q(i.CULL_FACE),N!==k&&(N===Ad?i.cullFace(i.BACK):N===rg?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):yt(i.CULL_FACE),k=N}function Ze(N){N!==B&&(Z&&i.lineWidth(N),B=N)}function pn(N,ut,j){N?(Q(i.POLYGON_OFFSET_FILL),(I!==ut||F!==j)&&(I=ut,F=j,o.getReversed()&&(ut=-ut),i.polygonOffset(ut,j))):yt(i.POLYGON_OFFSET_FILL)}function be(N){N?Q(i.SCISSOR_TEST):yt(i.SCISSOR_TEST)}function Ne(N){N===void 0&&(N=i.TEXTURE0+V-1),K!==N&&(i.activeTexture(N),K=N)}function O(N,ut,j){j===void 0&&(K===null?j=i.TEXTURE0+V-1:j=K);let dt=et[j];dt===void 0&&(dt={type:void 0,texture:void 0},et[j]=dt),(dt.type!==N||dt.texture!==ut)&&(K!==j&&(i.activeTexture(j),K=j),i.bindTexture(N,ut||X[N]),dt.type=N,dt.texture=ut)}function sn(){let N=et[K];N!==void 0&&N.type!==void 0&&(i.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function re(){try{i.compressedTexImage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function A(){try{i.compressedTexImage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function y(){try{i.texSubImage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function U(){try{i.texSubImage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function G(){try{i.compressedTexSubImage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function q(){try{i.compressedTexSubImage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function ot(){try{i.texStorage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function lt(){try{i.texStorage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function Y(){try{i.texImage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function tt(){try{i.texImage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function ct(N){return d[N]!==void 0?d[N]:i.getParameter(N)}function Rt(N,ut){d[N]!==ut&&(i.pixelStorei(N,ut),d[N]=ut)}function ft(N){zt.equals(N)===!1&&(i.scissor(N.x,N.y,N.z,N.w),zt.copy(N))}function ht(N){kt.equals(N)===!1&&(i.viewport(N.x,N.y,N.z,N.w),kt.copy(N))}function Pt(N,ut){let j=c.get(ut);j===void 0&&(j=new WeakMap,c.set(ut,j));let dt=j.get(N);dt===void 0&&(dt=i.getUniformBlockIndex(ut,N.name),j.set(N,dt))}function Dt(N,ut){let dt=c.get(ut).get(N);l.get(ut)!==dt&&(i.uniformBlockBinding(ut,dt,N.__bindingPointIndex),l.set(ut,dt))}function Gt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},d={},K=null,et={},u={},f=new WeakMap,x=[],g=null,p=!1,m=null,v=null,E=null,M=null,T=null,w=null,C=null,_=new Ct(0,0,0),S=0,R=!1,P=null,k=null,B=null,I=null,F=null,zt.set(0,0,i.canvas.width,i.canvas.height),kt.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:Q,disable:yt,bindFramebuffer:Ft,drawBuffers:vt,useProgram:Xt,setBlending:te,setMaterial:ce,setFlipSided:qt,setCullFace:ye,setLineWidth:Ze,setPolygonOffset:pn,setScissorTest:be,activeTexture:Ne,bindTexture:O,unbindTexture:sn,compressedTexImage2D:re,compressedTexImage3D:A,texImage2D:Y,texImage3D:tt,pixelStorei:Rt,getParameter:ct,updateUBOMapping:Pt,uniformBlockBinding:Dt,texStorage2D:ot,texStorage3D:lt,texSubImage2D:y,texSubImage3D:U,compressedTexSubImage2D:G,compressedTexSubImage3D:q,scissor:ft,viewport:ht,reset:Gt}}function C1(i,t,e,n,s,r,o){let a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new bt,h=new WeakMap,d=new Set,u,f=new WeakMap,x=!1;try{x=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(A,y){return x?new OffscreenCanvas(A,y):Xo("canvas")}function p(A,y,U){let G=1,q=re(A);if((q.width>U||q.height>U)&&(G=U/Math.max(q.width,q.height)),G<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){let ot=Math.floor(G*q.width),lt=Math.floor(G*q.height);u===void 0&&(u=g(ot,lt));let Y=y?g(ot,lt):u;return Y.width=ot,Y.height=lt,Y.getContext("2d").drawImage(A,0,0,ot,lt),Ot("WebGLRenderer: Texture has been resized from ("+q.width+"x"+q.height+") to ("+ot+"x"+lt+")."),Y}else return"data"in A&&Ot("WebGLRenderer: Image in DataTexture is too big ("+q.width+"x"+q.height+")."),A;return A}function m(A){return A.generateMipmaps}function v(A){i.generateMipmap(A)}function E(A){return A.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?i.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function M(A,y,U,G,q,ot=!1){if(A!==null){if(i[A]!==void 0)return i[A];Ot("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let lt;G&&(lt=t.get("EXT_texture_norm16"),lt||Ot("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let Y=y;if(y===i.RED&&(U===i.FLOAT&&(Y=i.R32F),U===i.HALF_FLOAT&&(Y=i.R16F),U===i.UNSIGNED_BYTE&&(Y=i.R8),U===i.UNSIGNED_SHORT&&lt&&(Y=lt.R16_EXT),U===i.SHORT&&lt&&(Y=lt.R16_SNORM_EXT)),y===i.RED_INTEGER&&(U===i.UNSIGNED_BYTE&&(Y=i.R8UI),U===i.UNSIGNED_SHORT&&(Y=i.R16UI),U===i.UNSIGNED_INT&&(Y=i.R32UI),U===i.BYTE&&(Y=i.R8I),U===i.SHORT&&(Y=i.R16I),U===i.INT&&(Y=i.R32I)),y===i.RG&&(U===i.FLOAT&&(Y=i.RG32F),U===i.HALF_FLOAT&&(Y=i.RG16F),U===i.UNSIGNED_BYTE&&(Y=i.RG8),U===i.UNSIGNED_SHORT&&lt&&(Y=lt.RG16_EXT),U===i.SHORT&&lt&&(Y=lt.RG16_SNORM_EXT)),y===i.RG_INTEGER&&(U===i.UNSIGNED_BYTE&&(Y=i.RG8UI),U===i.UNSIGNED_SHORT&&(Y=i.RG16UI),U===i.UNSIGNED_INT&&(Y=i.RG32UI),U===i.BYTE&&(Y=i.RG8I),U===i.SHORT&&(Y=i.RG16I),U===i.INT&&(Y=i.RG32I)),y===i.RGB_INTEGER&&(U===i.UNSIGNED_BYTE&&(Y=i.RGB8UI),U===i.UNSIGNED_SHORT&&(Y=i.RGB16UI),U===i.UNSIGNED_INT&&(Y=i.RGB32UI),U===i.BYTE&&(Y=i.RGB8I),U===i.SHORT&&(Y=i.RGB16I),U===i.INT&&(Y=i.RGB32I)),y===i.RGBA_INTEGER&&(U===i.UNSIGNED_BYTE&&(Y=i.RGBA8UI),U===i.UNSIGNED_SHORT&&(Y=i.RGBA16UI),U===i.UNSIGNED_INT&&(Y=i.RGBA32UI),U===i.BYTE&&(Y=i.RGBA8I),U===i.SHORT&&(Y=i.RGBA16I),U===i.INT&&(Y=i.RGBA32I)),y===i.RGB&&(U===i.UNSIGNED_SHORT&&lt&&(Y=lt.RGB16_EXT),U===i.SHORT&&lt&&(Y=lt.RGB16_SNORM_EXT),U===i.UNSIGNED_INT_5_9_9_9_REV&&(Y=i.RGB9_E5),U===i.UNSIGNED_INT_10F_11F_11F_REV&&(Y=i.R11F_G11F_B10F)),y===i.RGBA){let tt=ot?Wo:Yt.getTransfer(q);U===i.FLOAT&&(Y=i.RGBA32F),U===i.HALF_FLOAT&&(Y=i.RGBA16F),U===i.UNSIGNED_BYTE&&(Y=tt===se?i.SRGB8_ALPHA8:i.RGBA8),U===i.UNSIGNED_SHORT&&lt&&(Y=lt.RGBA16_EXT),U===i.SHORT&&lt&&(Y=lt.RGBA16_SNORM_EXT),U===i.UNSIGNED_SHORT_4_4_4_4&&(Y=i.RGBA4),U===i.UNSIGNED_SHORT_5_5_5_1&&(Y=i.RGB5_A1)}return(Y===i.R16F||Y===i.R32F||Y===i.RG16F||Y===i.RG32F||Y===i.RGBA16F||Y===i.RGBA32F)&&t.get("EXT_color_buffer_float"),Y}function T(A,y){let U;return A?y===null||y===Zn||y===Hr?U=i.DEPTH24_STENCIL8:y===qn?U=i.DEPTH32F_STENCIL8:y===zr&&(U=i.DEPTH24_STENCIL8,Ot("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):y===null||y===Zn||y===Hr?U=i.DEPTH_COMPONENT24:y===qn?U=i.DEPTH_COMPONENT32F:y===zr&&(U=i.DEPTH_COMPONENT16),U}function w(A,y){return m(A)===!0||A.isFramebufferTexture&&A.minFilter!==je&&A.minFilter!==ze?Math.log2(Math.max(y.width,y.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?y.mipmaps.length:1}function C(A){let y=A.target;y.removeEventListener("dispose",C),S(y),y.isVideoTexture&&h.delete(y),y.isHTMLTexture&&d.delete(y)}function _(A){let y=A.target;y.removeEventListener("dispose",_),P(y)}function S(A){let y=n.get(A);if(y.__webglInit===void 0)return;let U=A.source,G=f.get(U);if(G){let q=G[y.__cacheKey];q.usedTimes--,q.usedTimes===0&&R(A),Object.keys(G).length===0&&f.delete(U)}n.remove(A)}function R(A){let y=n.get(A);i.deleteTexture(y.__webglTexture);let U=A.source,G=f.get(U);delete G[y.__cacheKey],o.memory.textures--}function P(A){let y=n.get(A);if(A.depthTexture&&(A.depthTexture.dispose(),n.remove(A.depthTexture)),A.isWebGLCubeRenderTarget)for(let G=0;G<6;G++){if(Array.isArray(y.__webglFramebuffer[G]))for(let q=0;q<y.__webglFramebuffer[G].length;q++)i.deleteFramebuffer(y.__webglFramebuffer[G][q]);else i.deleteFramebuffer(y.__webglFramebuffer[G]);y.__webglDepthbuffer&&i.deleteRenderbuffer(y.__webglDepthbuffer[G])}else{if(Array.isArray(y.__webglFramebuffer))for(let G=0;G<y.__webglFramebuffer.length;G++)i.deleteFramebuffer(y.__webglFramebuffer[G]);else i.deleteFramebuffer(y.__webglFramebuffer);if(y.__webglDepthbuffer&&i.deleteRenderbuffer(y.__webglDepthbuffer),y.__webglMultisampledFramebuffer&&i.deleteFramebuffer(y.__webglMultisampledFramebuffer),y.__webglColorRenderbuffer)for(let G=0;G<y.__webglColorRenderbuffer.length;G++)y.__webglColorRenderbuffer[G]&&i.deleteRenderbuffer(y.__webglColorRenderbuffer[G]);y.__webglDepthRenderbuffer&&i.deleteRenderbuffer(y.__webglDepthRenderbuffer)}let U=A.textures;for(let G=0,q=U.length;G<q;G++){let ot=n.get(U[G]);ot.__webglTexture&&(i.deleteTexture(ot.__webglTexture),o.memory.textures--),n.remove(U[G])}n.remove(A)}let k=0;function B(){k=0}function I(){return k}function F(A){k=A}function V(){let A=k;return A>=s.maxTextures&&Ot("WebGLTextures: Trying to use "+(A+1)+" texture units while this GPU supports only "+s.maxTextures),k+=1,A}function Z(A){let y=[];return y.push(A.wrapS),y.push(A.wrapT),y.push(A.wrapR||0),y.push(A.magFilter),y.push(A.minFilter),y.push(A.anisotropy),y.push(A.internalFormat),y.push(A.format),y.push(A.type),y.push(A.generateMipmaps),y.push(A.premultiplyAlpha),y.push(A.flipY),y.push(A.unpackAlignment),y.push(A.colorSpace),y.join()}function nt(A,y){let U=n.get(A);if(A.isVideoTexture&&O(A),A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&U.__version!==A.version){let G=A.image;if(G===null)Ot("WebGLRenderer: Texture marked for update but no image data found.");else if(G.complete===!1)Ot("WebGLRenderer: Texture marked for update but image is incomplete");else{yt(U,A,y);return}}else A.isExternalTexture&&(U.__webglTexture=A.sourceTexture?A.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,U.__webglTexture,i.TEXTURE0+y)}function $(A,y){let U=n.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&U.__version!==A.version){yt(U,A,y);return}else A.isExternalTexture&&(U.__webglTexture=A.sourceTexture?A.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,U.__webglTexture,i.TEXTURE0+y)}function K(A,y){let U=n.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&U.__version!==A.version){yt(U,A,y);return}e.bindTexture(i.TEXTURE_3D,U.__webglTexture,i.TEXTURE0+y)}function et(A,y){let U=n.get(A);if(A.isCubeDepthTexture!==!0&&A.version>0&&U.__version!==A.version){Ft(U,A,y);return}e.bindTexture(i.TEXTURE_CUBE_MAP,U.__webglTexture,i.TEXTURE0+y)}let at={[Yl]:i.REPEAT,[si]:i.CLAMP_TO_EDGE,[jl]:i.MIRRORED_REPEAT},rt={[je]:i.NEAREST,[Ag]:i.NEAREST_MIPMAP_NEAREST,[fa]:i.NEAREST_MIPMAP_LINEAR,[ze]:i.LINEAR,[vc]:i.LINEAR_MIPMAP_NEAREST,[hi]:i.LINEAR_MIPMAP_LINEAR},zt={[Ig]:i.NEVER,[Og]:i.ALWAYS,[kg]:i.LESS,[sh]:i.LEQUAL,[Lg]:i.EQUAL,[rh]:i.GEQUAL,[Dg]:i.GREATER,[Ng]:i.NOTEQUAL};function kt(A,y){if(y.type===qn&&t.has("OES_texture_float_linear")===!1&&(y.magFilter===ze||y.magFilter===vc||y.magFilter===fa||y.magFilter===hi||y.minFilter===ze||y.minFilter===vc||y.minFilter===fa||y.minFilter===hi)&&Ot("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(A,i.TEXTURE_WRAP_S,at[y.wrapS]),i.texParameteri(A,i.TEXTURE_WRAP_T,at[y.wrapT]),(A===i.TEXTURE_3D||A===i.TEXTURE_2D_ARRAY)&&i.texParameteri(A,i.TEXTURE_WRAP_R,at[y.wrapR]),i.texParameteri(A,i.TEXTURE_MAG_FILTER,rt[y.magFilter]),i.texParameteri(A,i.TEXTURE_MIN_FILTER,rt[y.minFilter]),y.compareFunction&&(i.texParameteri(A,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(A,i.TEXTURE_COMPARE_FUNC,zt[y.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(y.magFilter===je||y.minFilter!==fa&&y.minFilter!==hi||y.type===qn&&t.has("OES_texture_float_linear")===!1)return;if(y.anisotropy>1||n.get(y).__currentAnisotropy){let U=t.get("EXT_texture_filter_anisotropic");i.texParameterf(A,U.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(y.anisotropy,s.getMaxAnisotropy())),n.get(y).__currentAnisotropy=y.anisotropy}}}function Lt(A,y){let U=!1;A.__webglInit===void 0&&(A.__webglInit=!0,y.addEventListener("dispose",C));let G=y.source,q=f.get(G);q===void 0&&(q={},f.set(G,q));let ot=Z(y);if(ot!==A.__cacheKey){q[ot]===void 0&&(q[ot]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,U=!0),q[ot].usedTimes++;let lt=q[A.__cacheKey];lt!==void 0&&(q[A.__cacheKey].usedTimes--,lt.usedTimes===0&&R(y)),A.__cacheKey=ot,A.__webglTexture=q[ot].texture}return U}function X(A,y,U){return Math.floor(Math.floor(A/U)/y)}function Q(A,y,U,G){let ot=A.updateRanges;if(ot.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,y.width,y.height,U,G,y.data);else{ot.sort((Rt,ft)=>Rt.start-ft.start);let lt=0;for(let Rt=1;Rt<ot.length;Rt++){let ft=ot[lt],ht=ot[Rt],Pt=ft.start+ft.count,Dt=X(ht.start,y.width,4),Gt=X(ft.start,y.width,4);ht.start<=Pt+1&&Dt===Gt&&X(ht.start+ht.count-1,y.width,4)===Dt?ft.count=Math.max(ft.count,ht.start+ht.count-ft.start):(++lt,ot[lt]=ht)}ot.length=lt+1;let Y=e.getParameter(i.UNPACK_ROW_LENGTH),tt=e.getParameter(i.UNPACK_SKIP_PIXELS),ct=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,y.width);for(let Rt=0,ft=ot.length;Rt<ft;Rt++){let ht=ot[Rt],Pt=Math.floor(ht.start/4),Dt=Math.ceil(ht.count/4),Gt=Pt%y.width,N=Math.floor(Pt/y.width),ut=Dt,j=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,Gt),e.pixelStorei(i.UNPACK_SKIP_ROWS,N),e.texSubImage2D(i.TEXTURE_2D,0,Gt,N,ut,j,U,G,y.data)}A.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,Y),e.pixelStorei(i.UNPACK_SKIP_PIXELS,tt),e.pixelStorei(i.UNPACK_SKIP_ROWS,ct)}}function yt(A,y,U){let G=i.TEXTURE_2D;(y.isDataArrayTexture||y.isCompressedArrayTexture)&&(G=i.TEXTURE_2D_ARRAY),y.isData3DTexture&&(G=i.TEXTURE_3D);let q=Lt(A,y),ot=y.source;e.bindTexture(G,A.__webglTexture,i.TEXTURE0+U);let lt=n.get(ot);if(ot.version!==lt.__version||q===!0){if(e.activeTexture(i.TEXTURE0+U),(typeof ImageBitmap<"u"&&y.image instanceof ImageBitmap)===!1){let j=Yt.getPrimaries(Yt.workingColorSpace),dt=y.colorSpace===Ii?null:Yt.getPrimaries(y.colorSpace),xt=y.colorSpace===Ii||j===dt?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,y.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,xt)}e.pixelStorei(i.UNPACK_ALIGNMENT,y.unpackAlignment);let tt=p(y.image,!1,s.maxTextureSize);tt=sn(y,tt);let ct=r.convert(y.format,y.colorSpace),Rt=r.convert(y.type),ft=M(y.internalFormat,ct,Rt,y.normalized,y.colorSpace,y.isVideoTexture);kt(G,y);let ht,Pt=y.mipmaps,Dt=y.isVideoTexture!==!0,Gt=lt.__version===void 0||q===!0,N=ot.dataReady,ut=w(y,tt);if(y.isDepthTexture)ft=T(y.format===ss,y.type),Gt&&(Dt?e.texStorage2D(i.TEXTURE_2D,1,ft,tt.width,tt.height):e.texImage2D(i.TEXTURE_2D,0,ft,tt.width,tt.height,0,ct,Rt,null));else if(y.isDataTexture)if(Pt.length>0){Dt&&Gt&&e.texStorage2D(i.TEXTURE_2D,ut,ft,Pt[0].width,Pt[0].height);for(let j=0,dt=Pt.length;j<dt;j++)ht=Pt[j],Dt?N&&e.texSubImage2D(i.TEXTURE_2D,j,0,0,ht.width,ht.height,ct,Rt,ht.data):e.texImage2D(i.TEXTURE_2D,j,ft,ht.width,ht.height,0,ct,Rt,ht.data);y.generateMipmaps=!1}else Dt?(Gt&&e.texStorage2D(i.TEXTURE_2D,ut,ft,tt.width,tt.height),N&&Q(y,tt,ct,Rt)):e.texImage2D(i.TEXTURE_2D,0,ft,tt.width,tt.height,0,ct,Rt,tt.data);else if(y.isCompressedTexture)if(y.isCompressedArrayTexture){Dt&&Gt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,ut,ft,Pt[0].width,Pt[0].height,tt.depth);for(let j=0,dt=Pt.length;j<dt;j++)if(ht=Pt[j],y.format!==vn)if(ct!==null)if(Dt){if(N)if(y.layerUpdates.size>0){let xt=Qd(ht.width,ht.height,y.format,y.type);for(let it of y.layerUpdates){let It=ht.data.subarray(it*xt/ht.data.BYTES_PER_ELEMENT,(it+1)*xt/ht.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,j,0,0,it,ht.width,ht.height,1,ct,It)}}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,j,0,0,0,ht.width,ht.height,tt.depth,ct,ht.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,j,ft,ht.width,ht.height,tt.depth,0,ht.data,0,0);else Ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Dt?N&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,j,0,0,0,ht.width,ht.height,tt.depth,ct,Rt,ht.data):e.texImage3D(i.TEXTURE_2D_ARRAY,j,ft,ht.width,ht.height,tt.depth,0,ct,Rt,ht.data);y.layerUpdates.size>0&&y.clearLayerUpdates()}else{Dt&&Gt&&e.texStorage2D(i.TEXTURE_2D,ut,ft,Pt[0].width,Pt[0].height);for(let j=0,dt=Pt.length;j<dt;j++)ht=Pt[j],y.format!==vn?ct!==null?Dt?N&&e.compressedTexSubImage2D(i.TEXTURE_2D,j,0,0,ht.width,ht.height,ct,ht.data):e.compressedTexImage2D(i.TEXTURE_2D,j,ft,ht.width,ht.height,0,ht.data):Ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Dt?N&&e.texSubImage2D(i.TEXTURE_2D,j,0,0,ht.width,ht.height,ct,Rt,ht.data):e.texImage2D(i.TEXTURE_2D,j,ft,ht.width,ht.height,0,ct,Rt,ht.data)}else if(y.isDataArrayTexture)if(Dt){if(Gt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,ut,ft,tt.width,tt.height,tt.depth),N)if(y.layerUpdates.size>0){let j=Qd(tt.width,tt.height,y.format,y.type);for(let dt of y.layerUpdates){let xt=tt.data.subarray(dt*j/tt.data.BYTES_PER_ELEMENT,(dt+1)*j/tt.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,dt,tt.width,tt.height,1,ct,Rt,xt)}y.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,tt.width,tt.height,tt.depth,ct,Rt,tt.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,ft,tt.width,tt.height,tt.depth,0,ct,Rt,tt.data);else if(y.isData3DTexture)Dt?(Gt&&e.texStorage3D(i.TEXTURE_3D,ut,ft,tt.width,tt.height,tt.depth),N&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,tt.width,tt.height,tt.depth,ct,Rt,tt.data)):e.texImage3D(i.TEXTURE_3D,0,ft,tt.width,tt.height,tt.depth,0,ct,Rt,tt.data);else if(y.isFramebufferTexture){if(Gt)if(Dt)e.texStorage2D(i.TEXTURE_2D,ut,ft,tt.width,tt.height);else{let j=tt.width,dt=tt.height;for(let xt=0;xt<ut;xt++)e.texImage2D(i.TEXTURE_2D,xt,ft,j,dt,0,ct,Rt,null),j>>=1,dt>>=1}}else if(y.isHTMLTexture){if("texElementImage2D"in i){let j=i.canvas;if(j.hasAttribute("layoutsubtree")||j.setAttribute("layoutsubtree","true"),tt.parentNode!==j){j.appendChild(tt),d.add(y),j.onpaint=dt=>{let xt=dt.changedElements;for(let it of d)xt.includes(it.image)&&(it.needsUpdate=!0)},j.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,tt);else{let xt=i.RGBA,it=i.RGBA,It=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,xt,it,It,tt)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Pt.length>0){if(Dt&&Gt){let j=re(Pt[0]);e.texStorage2D(i.TEXTURE_2D,ut,ft,j.width,j.height)}for(let j=0,dt=Pt.length;j<dt;j++)ht=Pt[j],Dt?N&&e.texSubImage2D(i.TEXTURE_2D,j,0,0,ct,Rt,ht):e.texImage2D(i.TEXTURE_2D,j,ft,ct,Rt,ht);y.generateMipmaps=!1}else if(Dt){if(Gt){let j=re(tt);e.texStorage2D(i.TEXTURE_2D,ut,ft,j.width,j.height)}N&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,ct,Rt,tt)}else e.texImage2D(i.TEXTURE_2D,0,ft,ct,Rt,tt);m(y)&&v(G),lt.__version=ot.version,y.onUpdate&&y.onUpdate(y)}A.__version=y.version}function Ft(A,y,U){if(y.image.length!==6)return;let G=Lt(A,y),q=y.source;e.bindTexture(i.TEXTURE_CUBE_MAP,A.__webglTexture,i.TEXTURE0+U);let ot=n.get(q);if(q.version!==ot.__version||G===!0){e.activeTexture(i.TEXTURE0+U);let lt=Yt.getPrimaries(Yt.workingColorSpace),Y=y.colorSpace===Ii?null:Yt.getPrimaries(y.colorSpace),tt=y.colorSpace===Ii||lt===Y?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,y.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,y.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,tt);let ct=y.isCompressedTexture||y.image[0].isCompressedTexture,Rt=y.image[0]&&y.image[0].isDataTexture,ft=[];for(let it=0;it<6;it++)!ct&&!Rt?ft[it]=p(y.image[it],!0,s.maxCubemapSize):ft[it]=Rt?y.image[it].image:y.image[it],ft[it]=sn(y,ft[it]);let ht=ft[0],Pt=r.convert(y.format,y.colorSpace),Dt=r.convert(y.type),Gt=M(y.internalFormat,Pt,Dt,y.normalized,y.colorSpace),N=y.isVideoTexture!==!0,ut=ot.__version===void 0||G===!0,j=q.dataReady,dt=w(y,ht);kt(i.TEXTURE_CUBE_MAP,y);let xt;if(ct){N&&ut&&e.texStorage2D(i.TEXTURE_CUBE_MAP,dt,Gt,ht.width,ht.height);for(let it=0;it<6;it++){xt=ft[it].mipmaps;for(let It=0;It<xt.length;It++){let Tt=xt[It];y.format!==vn?Pt!==null?N?j&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,It,0,0,Tt.width,Tt.height,Pt,Tt.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,It,Gt,Tt.width,Tt.height,0,Tt.data):Ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):N?j&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,It,0,0,Tt.width,Tt.height,Pt,Dt,Tt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,It,Gt,Tt.width,Tt.height,0,Pt,Dt,Tt.data)}}}else{if(xt=y.mipmaps,N&&ut){xt.length>0&&dt++;let it=re(ft[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,dt,Gt,it.width,it.height)}for(let it=0;it<6;it++)if(Rt){N?j&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,0,0,ft[it].width,ft[it].height,Pt,Dt,ft[it].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,Gt,ft[it].width,ft[it].height,0,Pt,Dt,ft[it].data);for(let It=0;It<xt.length;It++){let he=xt[It].image[it].image;N?j&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,It+1,0,0,he.width,he.height,Pt,Dt,he.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,It+1,Gt,he.width,he.height,0,Pt,Dt,he.data)}}else{N?j&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,0,0,Pt,Dt,ft[it]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,0,Gt,Pt,Dt,ft[it]);for(let It=0;It<xt.length;It++){let Tt=xt[It];N?j&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,It+1,0,0,Pt,Dt,Tt.image[it]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+it,It+1,Gt,Pt,Dt,Tt.image[it])}}}m(y)&&v(i.TEXTURE_CUBE_MAP),ot.__version=q.version,y.onUpdate&&y.onUpdate(y)}A.__version=y.version}function vt(A,y,U,G,q,ot){let lt=r.convert(U.format,U.colorSpace),Y=r.convert(U.type),tt=M(U.internalFormat,lt,Y,U.normalized,U.colorSpace),ct=n.get(y),Rt=n.get(U);if(Rt.__renderTarget=y,!ct.__hasExternalTextures){let ft=Math.max(1,y.width>>ot),ht=Math.max(1,y.height>>ot);q===i.TEXTURE_3D||q===i.TEXTURE_2D_ARRAY?e.texImage3D(q,ot,tt,ft,ht,y.depth,0,lt,Y,null):e.texImage2D(q,ot,tt,ft,ht,0,lt,Y,null)}e.bindFramebuffer(i.FRAMEBUFFER,A),Ne(y)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,G,q,Rt.__webglTexture,0,be(y)):(q===i.TEXTURE_2D||q>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&q<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,G,q,Rt.__webglTexture,ot),e.bindFramebuffer(i.FRAMEBUFFER,null)}function Xt(A,y,U){if(i.bindRenderbuffer(i.RENDERBUFFER,A),y.depthBuffer){let G=y.depthTexture,q=G&&G.isDepthTexture?G.type:null,ot=T(y.stencilBuffer,q),lt=y.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Ne(y)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,be(y),ot,y.width,y.height):U?i.renderbufferStorageMultisample(i.RENDERBUFFER,be(y),ot,y.width,y.height):i.renderbufferStorage(i.RENDERBUFFER,ot,y.width,y.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,lt,i.RENDERBUFFER,A)}else{let G=y.textures;for(let q=0;q<G.length;q++){let ot=G[q],lt=r.convert(ot.format,ot.colorSpace),Y=r.convert(ot.type),tt=M(ot.internalFormat,lt,Y,ot.normalized,ot.colorSpace);Ne(y)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,be(y),tt,y.width,y.height):U?i.renderbufferStorageMultisample(i.RENDERBUFFER,be(y),tt,y.width,y.height):i.renderbufferStorage(i.RENDERBUFFER,tt,y.width,y.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function He(A,y,U){let G=y.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,A),!(y.depthTexture&&y.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let q=n.get(y.depthTexture);if(q.__renderTarget=y,(!q.__webglTexture||y.depthTexture.image.width!==y.width||y.depthTexture.image.height!==y.height)&&(y.depthTexture.image.width=y.width,y.depthTexture.image.height=y.height,y.depthTexture.needsUpdate=!0),G){if(q.__webglInit===void 0&&(q.__webglInit=!0,y.depthTexture.addEventListener("dispose",C)),q.__webglTexture===void 0){q.__webglTexture=i.createTexture(),e.bindTexture(i.TEXTURE_CUBE_MAP,q.__webglTexture),kt(i.TEXTURE_CUBE_MAP,y.depthTexture);let ct=r.convert(y.depthTexture.format),Rt=r.convert(y.depthTexture.type),ft;y.depthTexture.format===ri?ft=i.DEPTH_COMPONENT24:y.depthTexture.format===ss&&(ft=i.DEPTH24_STENCIL8);for(let ht=0;ht<6;ht++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,0,ft,y.width,y.height,0,ct,Rt,null)}}else nt(y.depthTexture,0);let ot=q.__webglTexture,lt=be(y),Y=G?i.TEXTURE_CUBE_MAP_POSITIVE_X+U:i.TEXTURE_2D,tt=y.depthTexture.format===ss?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(y.depthTexture.format===ri)Ne(y)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,tt,Y,ot,0,lt):i.framebufferTexture2D(i.FRAMEBUFFER,tt,Y,ot,0);else if(y.depthTexture.format===ss)Ne(y)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,tt,Y,ot,0,lt):i.framebufferTexture2D(i.FRAMEBUFFER,tt,Y,ot,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function $t(A){let y=n.get(A),U=A.isWebGLCubeRenderTarget===!0;if(y.__boundDepthTexture!==A.depthTexture){let G=A.depthTexture;if(y.__depthDisposeCallback&&y.__depthDisposeCallback(),G){let q=()=>{delete y.__boundDepthTexture,delete y.__depthDisposeCallback,G.removeEventListener("dispose",q)};G.addEventListener("dispose",q),y.__depthDisposeCallback=q}y.__boundDepthTexture=G}if(A.depthTexture&&!y.__autoAllocateDepthBuffer)if(U)for(let G=0;G<6;G++)He(y.__webglFramebuffer[G],A,G);else{let G=A.texture.mipmaps;G&&G.length>0?He(y.__webglFramebuffer[0],A,0):He(y.__webglFramebuffer,A,0)}else if(U){y.__webglDepthbuffer=[];for(let G=0;G<6;G++)if(e.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer[G]),y.__webglDepthbuffer[G]===void 0)y.__webglDepthbuffer[G]=i.createRenderbuffer(),Xt(y.__webglDepthbuffer[G],A,!1);else{let q=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ot=y.__webglDepthbuffer[G];i.bindRenderbuffer(i.RENDERBUFFER,ot),i.framebufferRenderbuffer(i.FRAMEBUFFER,q,i.RENDERBUFFER,ot)}}else{let G=A.texture.mipmaps;if(G&&G.length>0?e.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer),y.__webglDepthbuffer===void 0)y.__webglDepthbuffer=i.createRenderbuffer(),Xt(y.__webglDepthbuffer,A,!1);else{let q=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ot=y.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,ot),i.framebufferRenderbuffer(i.FRAMEBUFFER,q,i.RENDERBUFFER,ot)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function te(A,y,U){let G=n.get(A);y!==void 0&&vt(G.__webglFramebuffer,A,A.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),U!==void 0&&$t(A)}function ce(A){let y=A.texture,U=n.get(A),G=n.get(y);A.addEventListener("dispose",_);let q=A.textures,ot=A.isWebGLCubeRenderTarget===!0,lt=q.length>1;if(lt||(G.__webglTexture===void 0&&(G.__webglTexture=i.createTexture()),G.__version=y.version,o.memory.textures++),ot){U.__webglFramebuffer=[];for(let Y=0;Y<6;Y++)if(y.mipmaps&&y.mipmaps.length>0){U.__webglFramebuffer[Y]=[];for(let tt=0;tt<y.mipmaps.length;tt++)U.__webglFramebuffer[Y][tt]=i.createFramebuffer()}else U.__webglFramebuffer[Y]=i.createFramebuffer()}else{if(y.mipmaps&&y.mipmaps.length>0){U.__webglFramebuffer=[];for(let Y=0;Y<y.mipmaps.length;Y++)U.__webglFramebuffer[Y]=i.createFramebuffer()}else U.__webglFramebuffer=i.createFramebuffer();if(lt)for(let Y=0,tt=q.length;Y<tt;Y++){let ct=n.get(q[Y]);ct.__webglTexture===void 0&&(ct.__webglTexture=i.createTexture(),o.memory.textures++)}if(A.samples>0&&Ne(A)===!1){U.__webglMultisampledFramebuffer=i.createFramebuffer(),U.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,U.__webglMultisampledFramebuffer);for(let Y=0;Y<q.length;Y++){let tt=q[Y];U.__webglColorRenderbuffer[Y]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,U.__webglColorRenderbuffer[Y]);let ct=r.convert(tt.format,tt.colorSpace),Rt=r.convert(tt.type),ft=M(tt.internalFormat,ct,Rt,tt.normalized,tt.colorSpace,A.isXRRenderTarget===!0),ht=be(A);i.renderbufferStorageMultisample(i.RENDERBUFFER,ht,ft,A.width,A.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Y,i.RENDERBUFFER,U.__webglColorRenderbuffer[Y])}i.bindRenderbuffer(i.RENDERBUFFER,null),A.depthBuffer&&(U.__webglDepthRenderbuffer=i.createRenderbuffer(),Xt(U.__webglDepthRenderbuffer,A,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(ot){e.bindTexture(i.TEXTURE_CUBE_MAP,G.__webglTexture),kt(i.TEXTURE_CUBE_MAP,y);for(let Y=0;Y<6;Y++)if(y.mipmaps&&y.mipmaps.length>0)for(let tt=0;tt<y.mipmaps.length;tt++)vt(U.__webglFramebuffer[Y][tt],A,y,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,tt);else vt(U.__webglFramebuffer[Y],A,y,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0);m(y)&&v(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(lt){for(let Y=0,tt=q.length;Y<tt;Y++){let ct=q[Y],Rt=n.get(ct),ft=i.TEXTURE_2D;(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(ft=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(ft,Rt.__webglTexture),kt(ft,ct),vt(U.__webglFramebuffer,A,ct,i.COLOR_ATTACHMENT0+Y,ft,0),m(ct)&&v(ft)}e.unbindTexture()}else{let Y=i.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(Y=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(Y,G.__webglTexture),kt(Y,y),y.mipmaps&&y.mipmaps.length>0)for(let tt=0;tt<y.mipmaps.length;tt++)vt(U.__webglFramebuffer[tt],A,y,i.COLOR_ATTACHMENT0,Y,tt);else vt(U.__webglFramebuffer,A,y,i.COLOR_ATTACHMENT0,Y,0);m(y)&&v(Y),e.unbindTexture()}A.depthBuffer&&$t(A)}function qt(A){let y=A.textures;for(let U=0,G=y.length;U<G;U++){let q=y[U];if(m(q)){let ot=E(A),lt=n.get(q).__webglTexture;e.bindTexture(ot,lt),v(ot),e.unbindTexture()}}}let ye=[],Ze=[];function pn(A){if(A.samples>0){if(Ne(A)===!1){let y=A.textures,U=A.width,G=A.height,q=i.COLOR_BUFFER_BIT,ot=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,lt=n.get(A),Y=y.length>1;if(Y)for(let ct=0;ct<y.length;ct++)e.bindFramebuffer(i.FRAMEBUFFER,lt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ct,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,lt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ct,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,lt.__webglMultisampledFramebuffer);let tt=A.texture.mipmaps;tt&&tt.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,lt.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,lt.__webglFramebuffer);for(let ct=0;ct<y.length;ct++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(q|=i.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(q|=i.STENCIL_BUFFER_BIT)),Y){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,lt.__webglColorRenderbuffer[ct]);let Rt=n.get(y[ct]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Rt,0)}i.blitFramebuffer(0,0,U,G,0,0,U,G,q,i.NEAREST),l===!0&&(ye.length=0,Ze.length=0,ye.push(i.COLOR_ATTACHMENT0+ct),A.depthBuffer&&A.storeMultisampledDepthBuffer===!1&&(ye.push(ot),Ze.push(ot),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Ze)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ye))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),Y)for(let ct=0;ct<y.length;ct++){e.bindFramebuffer(i.FRAMEBUFFER,lt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ct,i.RENDERBUFFER,lt.__webglColorRenderbuffer[ct]);let Rt=n.get(y[ct]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,lt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ct,i.TEXTURE_2D,Rt,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,lt.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.storeMultisampledDepthBuffer===!1&&l){let y=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[y])}}}function be(A){return Math.min(s.maxSamples,A.samples)}function Ne(A){let y=n.get(A);return A.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&y.__useRenderToTexture!==!1}function O(A){let y=o.render.frame;h.get(A)!==y&&(h.set(A,y),A.update())}function sn(A,y){let U=A.colorSpace,G=A.format,q=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||U!==Vo&&U!==Ii&&(Yt.getTransfer(U)===se?(G!==vn||q!==_n)&&Ot("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Nt("WebGLTextures: Unsupported texture color space:",U)),y}function re(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(c.width=A.naturalWidth||A.width,c.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(c.width=A.displayWidth,c.height=A.displayHeight):(c.width=A.width,c.height=A.height),c}this.allocateTextureUnit=V,this.resetTextureUnits=B,this.getTextureUnits=I,this.setTextureUnits=F,this.setTexture2D=nt,this.setTexture2DArray=$,this.setTexture3D=K,this.setTextureCube=et,this.rebindTextures=te,this.setupRenderTarget=ce,this.updateRenderTargetMipmap=qt,this.updateMultisampleRenderTarget=pn,this.setupDepthRenderbuffer=$t,this.setupFrameBufferTexture=vt,this.useMultisampledRTT=Ne,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function R1(i,t){function e(n,s=Ii){let r,o=Yt.getTransfer(s);if(n===_n)return i.UNSIGNED_BYTE;if(n===bc)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Sc)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Vd)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Wd)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Hd)return i.BYTE;if(n===Gd)return i.SHORT;if(n===zr)return i.UNSIGNED_SHORT;if(n===Mc)return i.INT;if(n===Zn)return i.UNSIGNED_INT;if(n===qn)return i.FLOAT;if(n===We)return i.HALF_FLOAT;if(n===Xd)return i.ALPHA;if(n===$d)return i.RGB;if(n===vn)return i.RGBA;if(n===ri)return i.DEPTH_COMPONENT;if(n===ss)return i.DEPTH_STENCIL;if(n===Zd)return i.RED;if(n===wc)return i.RED_INTEGER;if(n===rs)return i.RG;if(n===Tc)return i.RG_INTEGER;if(n===Ec)return i.RGBA_INTEGER;if(n===pa||n===ma||n===ga||n===xa)if(o===se)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===pa)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===ma)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===ga)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===xa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===pa)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===ma)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===ga)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===xa)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Ac||n===Cc||n===Rc||n===Pc)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Ac)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Cc)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Rc)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Pc)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Ic||n===kc||n===Lc||n===Dc||n===Nc||n===ya||n===Oc)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Ic||n===kc)return o===se?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Lc)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===Dc)return r.COMPRESSED_R11_EAC;if(n===Nc)return r.COMPRESSED_SIGNED_R11_EAC;if(n===ya)return r.COMPRESSED_RG11_EAC;if(n===Oc)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Uc||n===Fc||n===Bc||n===zc||n===Hc||n===Gc||n===Vc||n===Wc||n===Xc||n===$c||n===Zc||n===qc||n===Yc||n===jc)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Uc)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Fc)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Bc)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===zc)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Hc)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Gc)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Vc)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Wc)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Xc)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===$c)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Zc)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===qc)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Yc)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===jc)return o===se?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Kc||n===Jc||n===Qc)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===Kc)return o===se?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Jc)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Qc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===th||n===eh||n===_a||n===nh)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===th)return r.COMPRESSED_RED_RGTC1_EXT;if(n===eh)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===_a)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===nh)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Hr?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}var P1=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,I1=`
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

}`,pf=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new ea(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new Le({vertexShader:P1,fragmentShader:I1,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new Bt(new ke(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},mf=class extends oi{constructor(t,e){super();let n=this,s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,d=null,u=null,f=null,x=null,g=typeof XRWebGLBinding<"u",p=new pf,m={},v=e.getContextAttributes(),E=null,M=null,T=[],w=[],C=new bt,_=null,S=null,R=new Ye;R.viewport=new _e;let P=new Ye;P.viewport=new _e;let k=[R,P],B=new yc,I=null,F=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(X){let Q=T[X];return Q===void 0&&(Q=new Rr,T[X]=Q),Q.getTargetRaySpace()},this.getControllerGrip=function(X){let Q=T[X];return Q===void 0&&(Q=new Rr,T[X]=Q),Q.getGripSpace()},this.getHand=function(X){let Q=T[X];return Q===void 0&&(Q=new Rr,T[X]=Q),Q.getHandSpace()};function V(X){let Q=w.indexOf(X.inputSource);if(Q===-1)return;let yt=T[Q];yt!==void 0&&(yt.update(X.inputSource,X.frame,c||o),yt.dispatchEvent({type:X.type,data:X.inputSource}))}function Z(){s.removeEventListener("select",V),s.removeEventListener("selectstart",V),s.removeEventListener("selectend",V),s.removeEventListener("squeeze",V),s.removeEventListener("squeezestart",V),s.removeEventListener("squeezeend",V),s.removeEventListener("end",Z),s.removeEventListener("inputsourceschange",nt);for(let X=0;X<T.length;X++){let Q=w[X];Q!==null&&(w[X]=null,T[X].disconnect(Q))}I=null,F=null,p.reset();for(let X in m)delete m[X];if(t.setRenderTarget(E),f=null,u=null,d=null,s=null,M=null,Lt.stop(),n.isPresenting=!1,t.setPixelRatio(_),t.setSize(C.width,C.height,!1),S!==null){let X=S.camera;X.fov=S.fov,X.zoom=S.zoom,X.updateProjectionMatrix(),S=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(X){r=X,n.isPresenting===!0&&Ot("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(X){a=X,n.isPresenting===!0&&Ot("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(X){c=X},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d===null&&g&&(d=new XRWebGLBinding(s,e)),d},this.getFrame=function(){return x},this.getSession=function(){return s},this.setSession=async function(X){if(s=X,s!==null){if(E=t.getRenderTarget(),s.addEventListener("select",V),s.addEventListener("selectstart",V),s.addEventListener("selectend",V),s.addEventListener("squeeze",V),s.addEventListener("squeezestart",V),s.addEventListener("squeezeend",V),s.addEventListener("end",Z),s.addEventListener("inputsourceschange",nt),v.xrCompatible!==!0&&await e.makeXRCompatible(),_=t.getPixelRatio(),t.getSize(C),g&&"createProjectionLayer"in XRWebGLBinding.prototype){let yt=null,Ft=null,vt=null;v.depth&&(vt=v.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,yt=v.stencil?ss:ri,Ft=v.stencil?Hr:Zn);let Xt={colorFormat:e.RGBA8,depthFormat:vt,scaleFactor:r};d=this.getBinding(),u=d.createProjectionLayer(Xt),s.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),M=new Ce(u.textureWidth,u.textureHeight,{format:vn,type:_n,depthTexture:new Ki(u.textureWidth,u.textureHeight,Ft,void 0,void 0,void 0,void 0,void 0,void 0,yt),stencilBuffer:v.stencil,colorSpace:t.outputColorSpace,samples:v.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{let yt={antialias:v.antialias,alpha:!0,depth:v.depth,stencil:v.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,e,yt),s.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),M=new Ce(f.framebufferWidth,f.framebufferHeight,{format:vn,type:_n,colorSpace:t.outputColorSpace,stencilBuffer:v.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}M.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),Lt.setContext(s),Lt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function nt(X){for(let Q=0;Q<X.removed.length;Q++){let yt=X.removed[Q],Ft=w.indexOf(yt);Ft>=0&&(w[Ft]=null,T[Ft].disconnect(yt))}for(let Q=0;Q<X.added.length;Q++){let yt=X.added[Q],Ft=w.indexOf(yt);if(Ft===-1){for(let Xt=0;Xt<T.length;Xt++)if(Xt>=w.length){w.push(yt),Ft=Xt;break}else if(w[Xt]===null){w[Xt]=yt,Ft=Xt;break}if(Ft===-1)break}let vt=T[Ft];vt&&vt.connect(yt)}}let $=new D,K=new D;function et(X,Q,yt){$.setFromMatrixPosition(Q.matrixWorld),K.setFromMatrixPosition(yt.matrixWorld);let Ft=$.distanceTo(K),vt=Q.projectionMatrix.elements,Xt=yt.projectionMatrix.elements,He=vt[14]/(vt[10]-1),$t=vt[14]/(vt[10]+1),te=(vt[9]+1)/vt[5],ce=(vt[9]-1)/vt[5],qt=(vt[8]-1)/vt[0],ye=(Xt[8]+1)/Xt[0],Ze=He*qt,pn=He*ye,be=Ft/(-qt+ye),Ne=be*-qt;if(Q.matrixWorld.decompose(X.position,X.quaternion,X.scale),X.translateX(Ne),X.translateZ(be),X.matrixWorld.compose(X.position,X.quaternion,X.scale),X.matrixWorldInverse.copy(X.matrixWorld).invert(),vt[10]===-1)X.projectionMatrix.copy(Q.projectionMatrix),X.projectionMatrixInverse.copy(Q.projectionMatrixInverse);else{let O=He+be,sn=$t+be,re=Ze-Ne,A=pn+(Ft-Ne),y=te*$t/sn*O,U=ce*$t/sn*O;X.projectionMatrix.makePerspective(re,A,y,U,O,sn),X.projectionMatrixInverse.copy(X.projectionMatrix).invert()}}function at(X,Q){Q===null?X.matrixWorld.copy(X.matrix):X.matrixWorld.multiplyMatrices(Q.matrixWorld,X.matrix),X.matrixWorldInverse.copy(X.matrixWorld).invert()}this.updateCamera=function(X){if(s===null)return;let Q=X.near,yt=X.far;p.texture!==null&&(p.depthNear>0&&(Q=p.depthNear),p.depthFar>0&&(yt=p.depthFar)),B.near=P.near=R.near=Q,B.far=P.far=R.far=yt,(I!==B.near||F!==B.far)&&(s.updateRenderState({depthNear:B.near,depthFar:B.far}),I=B.near,F=B.far),B.layers.mask=X.layers.mask|6,R.layers.mask=B.layers.mask&-5,P.layers.mask=B.layers.mask&-3;let Ft=X.parent,vt=B.cameras;at(B,Ft);for(let Xt=0;Xt<vt.length;Xt++)at(vt[Xt],Ft);vt.length===2?et(B,R,P):B.projectionMatrix.copy(R.projectionMatrix),S===null&&X.isPerspectiveCamera&&(S={camera:X,fov:X.fov,zoom:X.zoom}),rt(X,B,Ft)};function rt(X,Q,yt){yt===null?X.matrix.copy(Q.matrixWorld):(X.matrix.copy(yt.matrixWorld),X.matrix.invert(),X.matrix.multiply(Q.matrixWorld)),X.matrix.decompose(X.position,X.quaternion,X.scale),X.updateMatrixWorld(!0),X.projectionMatrix.copy(Q.projectionMatrix),X.projectionMatrixInverse.copy(Q.projectionMatrixInverse),X.isPerspectiveCamera&&(X.fov=Zo*2*Math.atan(1/X.projectionMatrix.elements[5]),X.zoom=1)}this.getCamera=function(){return B},this.getFoveation=function(){if(!(u===null&&f===null))return l},this.setFoveation=function(X){l=X,u!==null&&(u.fixedFoveation=X),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=X)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(B)},this.getCameraTexture=function(X){return m[X]};let zt=null;function kt(X,Q){if(h=Q.getViewerPose(c||o),x=Q,h!==null){let yt=h.views;f!==null&&(t.setRenderTargetFramebuffer(M,f.framebuffer),t.setRenderTarget(M));let Ft=!1;yt.length!==B.cameras.length&&(B.cameras.length=0,Ft=!0);for(let $t=0;$t<yt.length;$t++){let te=yt[$t],ce=null;if(f!==null)ce=f.getViewport(te);else{let ye=d.getViewSubImage(u,te);ce=ye.viewport,$t===0&&(t.setRenderTargetTextures(M,ye.colorTexture,ye.depthStencilTexture),t.setRenderTarget(M))}let qt=k[$t];qt===void 0&&(qt=new Ye,qt.layers.enable($t),qt.viewport=new _e,k[$t]=qt),qt.matrix.fromArray(te.transform.matrix),qt.matrix.decompose(qt.position,qt.quaternion,qt.scale),qt.projectionMatrix.fromArray(te.projectionMatrix),qt.projectionMatrixInverse.copy(qt.projectionMatrix).invert(),qt.viewport.set(ce.x,ce.y,ce.width,ce.height),$t===0&&(B.matrix.copy(qt.matrix),B.matrix.decompose(B.position,B.quaternion,B.scale)),Ft===!0&&B.cameras.push(qt)}let vt=s.enabledFeatures;if(vt&&vt.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&g){d=n.getBinding();let $t=d.getDepthInformation(yt[0]);$t&&$t.isValid&&$t.texture&&p.init($t,s.renderState)}if(vt&&vt.includes("camera-access")&&g){t.state.unbindTexture(),d=n.getBinding();for(let $t=0;$t<yt.length;$t++){let te=yt[$t].camera;if(te){let ce=m[te];ce||(ce=new ea,m[te]=ce);let qt=d.getCameraImage(te);ce.sourceTexture=qt}}}}for(let yt=0;yt<T.length;yt++){let Ft=w[yt],vt=T[yt];Ft!==null&&vt!==void 0&&vt.update(Ft,Q,c||o)}zt&&zt(X,Q),Q.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:Q}),x=null}let Lt=new d0;Lt.setAnimationLoop(kt),this.setAnimationLoop=function(X){zt=X},this.dispose=function(){}}},k1=new de,y0=new Ht;y0.set(-1,0,0,0,1,0,0,0,1);function L1(i,t){function e(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function n(p,m){m.color.getRGB(p.fogColor.value,jd(i)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function s(p,m,v,E,M){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?r(p,m):m.isMeshLambertMaterial?(r(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(r(p,m),d(p,m)):m.isMeshPhongMaterial?(r(p,m),h(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(r(p,m),u(p,m),m.isMeshPhysicalMaterial&&f(p,m,M)):m.isMeshMatcapMaterial?(r(p,m),x(p,m)):m.isMeshDepthMaterial?r(p,m):m.isMeshDistanceMaterial?(r(p,m),g(p,m)):m.isMeshNormalMaterial?r(p,m):m.isLineBasicMaterial?(o(p,m),m.isLineDashedMaterial&&a(p,m)):m.isPointsMaterial?l(p,m,v,E):m.isSpriteMaterial?c(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,e(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,e(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===dn&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,e(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===dn&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,e(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,e(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,e(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);let v=t.get(m),E=v.envMap,M=v.envMapRotation;E&&(p.envMap.value=E,p.envMapRotation.value.setFromMatrix4(k1.makeRotationFromEuler(M)).transpose(),E.isCubeTexture&&E.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(y0),p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,e(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,e(m.aoMap,p.aoMapTransform))}function o(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,e(m.map,p.mapTransform))}function a(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function l(p,m,v,E){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*v,p.scale.value=E*.5,m.map&&(p.map.value=m.map,e(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function c(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,e(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function h(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function d(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function u(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,e(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,e(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function f(p,m,v){p.ior.value=m.ior,m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,e(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,e(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,e(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,e(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,e(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===dn&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.retroreflectivity>0&&(p.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,e(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,e(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=v.texture,p.transmissionSamplerSize.value.set(v.width,v.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,e(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,e(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,e(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,e(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,e(m.specularIntensityMap,p.specularIntensityMapTransform))}function x(p,m){m.matcap&&(p.matcap.value=m.matcap)}function g(p,m){let v=t.get(m).light;p.referencePosition.value.setFromMatrixPosition(v.matrixWorld),p.nearDistance.value=v.shadow.camera.near,p.farDistance.value=v.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function D1(i,t,e,n){let s={},r={},o=[],a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(M,T){let w=T.program;n.uniformBlockBinding(M,w)}function c(M,T){let w=s[M.id];w===void 0&&(p(M),w=h(M),s[M.id]=w,M.addEventListener("dispose",v));let C=T.program;n.updateUBOMapping(M,C);let _=t.render.frame;r[M.id]!==_&&(u(M),r[M.id]=_)}function h(M){let T=d();M.__bindingPointIndex=T;let w=i.createBuffer(),C=M.__size,_=M.usage;return i.bindBuffer(i.UNIFORM_BUFFER,w),i.bufferData(i.UNIFORM_BUFFER,C,_),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,T,w),w}function d(){for(let M=0;M<a;M++)if(o.indexOf(M)===-1)return o.push(M),M;return Nt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(M){let T=s[M.id],w=M.uniforms,C=M.__cache;i.bindBuffer(i.UNIFORM_BUFFER,T);for(let _=0,S=w.length;_<S;_++){let R=w[_];if(Array.isArray(R))for(let P=0,k=R.length;P<k;P++)f(R[P],_,P,C);else f(R,_,0,C)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(M,T,w,C){if(g(M,T,w,C)===!0){let _=M.__offset,S=M.value;if(Array.isArray(S)){let R=0;for(let P=0;P<S.length;P++){let k=S[P],B=m(k);x(k,M.__data,R),typeof k!="number"&&typeof k!="boolean"&&!k.isMatrix3&&!ArrayBuffer.isView(k)&&(R+=B.storage/Float32Array.BYTES_PER_ELEMENT)}}else x(S,M.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,_,M.__data)}}function x(M,T,w){typeof M=="number"||typeof M=="boolean"?T[0]=M:M.isMatrix3?(T[0]=M.elements[0],T[1]=M.elements[1],T[2]=M.elements[2],T[3]=0,T[4]=M.elements[3],T[5]=M.elements[4],T[6]=M.elements[5],T[7]=0,T[8]=M.elements[6],T[9]=M.elements[7],T[10]=M.elements[8],T[11]=0):ArrayBuffer.isView(M)?T.set(new M.constructor(M.buffer,M.byteOffset,T.length)):M.toArray(T,w)}function g(M,T,w,C){let _=M.value,S=T+"_"+w;if(C[S]===void 0)return typeof _=="number"||typeof _=="boolean"?C[S]=_:ArrayBuffer.isView(_)?C[S]=_.slice():C[S]=_.clone(),!0;{let R=C[S];if(typeof _=="number"||typeof _=="boolean"){if(R!==_)return C[S]=_,!0}else{if(ArrayBuffer.isView(_))return!0;if(R.equals(_)===!1)return R.copy(_),!0}}return!1}function p(M){let T=M.uniforms,w=0,C=16;for(let S=0,R=T.length;S<R;S++){let P=Array.isArray(T[S])?T[S]:[T[S]];for(let k=0,B=P.length;k<B;k++){let I=P[k],F=Array.isArray(I.value)?I.value:[I.value];for(let V=0,Z=F.length;V<Z;V++){let nt=F[V],$=m(nt),K=w%C,et=K%$.boundary,at=K+et;w+=et,at!==0&&C-at<$.storage&&(w+=C-at),I.__data=new Float32Array($.storage/Float32Array.BYTES_PER_ELEMENT),I.__offset=w,w+=$.storage}}}let _=w%C;return _>0&&(w+=C-_),M.__size=w,M.__cache={},this}function m(M){let T={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(T.boundary=4,T.storage=4):M.isVector2?(T.boundary=8,T.storage=8):M.isVector3||M.isColor?(T.boundary=16,T.storage=12):M.isVector4?(T.boundary=16,T.storage=16):M.isMatrix3?(T.boundary=48,T.storage=48):M.isMatrix4?(T.boundary=64,T.storage=64):M.isTexture?Ot("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(M)?(T.boundary=16,T.storage=M.byteLength):Ot("WebGLRenderer: Unsupported uniform value type.",M),T}function v(M){let T=M.target;T.removeEventListener("dispose",v);let w=o.indexOf(T.__bindingPointIndex);o.splice(w,1),i.deleteBuffer(s[T.id]),delete s[T.id],delete r[T.id]}function E(){for(let M in s)i.deleteBuffer(s[M]);o=[],s={},r={}}return{bind:l,update:c,dispose:E}}var N1=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),di=null;function O1(){return di===null&&(di=new Ir(N1,16,16,rs,We),di.name="DFG_LUT",di.minFilter=ze,di.magFilter=ze,di.wrapS=si,di.wrapT=si,di.generateMipmaps=!1,di.needsUpdate=!0),di}var ch=class{constructor(t={}){let{canvas:e=Ug(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1,outputBufferType:f=_n}=t;this.isWebGLRenderer=!0;let x;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");x=n.getContextAttributes().alpha}else x=o;let g=f,p=new Set([Ec,Tc,wc]),m=new Set([_n,Zn,zr,Hr,bc,Sc]),v=new Uint32Array(4),E=new Int32Array(4),M=new D,T=null,w=null,C=[],_=[],S=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Cn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let R=this,P=!1,k=null,B=null,I=null,F=null;this._outputColorSpace=Ae;let V=0,Z=0,nt=null,$=-1,K=null,et=new _e,at=new _e,rt=null,zt=new Ct(0),kt=0,Lt=e.width,X=e.height,Q=1,yt=null,Ft=null,vt=new _e(0,0,Lt,X),Xt=new _e(0,0,Lt,X),He=!1,$t=new kr,te=!1,ce=!1,qt=new de,ye=new D,Ze=new _e,pn={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},be=!1;function Ne(){return nt===null?Q:1}let O=n;function sn(b,L){return e.getContext(b,L)}let re,A,y,U,G,q,ot,lt,Y,tt,ct,Rt,ft,ht,Pt,Dt,Gt,N,ut,j,dt,xt,it;try{let b={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"186"}`),e.addEventListener("webglcontextlost",he,!1),e.addEventListener("webglcontextrestored",ne,!1),e.addEventListener("webglcontextcreationerror",Fn,!1),O===null){let L="webgl2";if(O=sn(L,b),O===null)throw sn(L)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}It()}catch(b){throw e.removeEventListener("webglcontextlost",he,!1),e.removeEventListener("webglcontextrestored",ne,!1),e.removeEventListener("webglcontextcreationerror",Fn,!1),Nt("WebGLRenderer: "+b.message),b}function It(){re=new Vb(O),re.init(),dt=new R1(O,re),A=new Lb(O,re,t,dt),y=new A1(O,re),A.reversedDepthBuffer&&u&&y.buffers.depth.setReversed(!0),B=O.createFramebuffer(),I=O.createFramebuffer(),F=O.createFramebuffer(),U=new $b(O),G=new f1,q=new C1(O,re,y,G,A,dt,U),ot=new Gb(R),lt=new q_(O),xt=new Ib(O,lt),Y=new Wb(O,lt,U,xt),tt=new qb(O,Y,lt,xt,U),N=new Zb(O,A,q),Pt=new Db(G),ct=new d1(R,ot,re,A,xt,Pt),Rt=new L1(R,G),ft=new m1,ht=new M1(re),Gt=new Pb(R,ot,y,tt,x,l),Dt=new E1(R,tt,A),it=new D1(O,U,A,y),ut=new kb(O,re,U),j=new Xb(O,re,U),U.programs=ct.programs,R.capabilities=A,R.extensions=re,R.properties=G,R.renderLists=ft,R.shadowMap=Dt,R.state=y,R.info=U}g!==_n&&(S=new jb(g,e.width,e.height,a,s,r));let Tt=new mf(R,O);this.xr=Tt,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){let b=re.get("WEBGL_lose_context");b&&b.loseContext()},this.forceContextRestore=function(){let b=re.get("WEBGL_lose_context");b&&b.restoreContext()},this.getPixelRatio=function(){return Q},this.setPixelRatio=function(b){b!==void 0&&(Q=b,this.setSize(Lt,X,!1))},this.getSize=function(b){return b.set(Lt,X)},this.setSize=function(b,L,W=!0){if(Tt.isPresenting){Ot("WebGLRenderer: Can't change size while VR device is presenting.");return}Lt=b,X=L,e.width=Math.floor(b*Q),e.height=Math.floor(L*Q),W===!0&&(e.style.width=b+"px",e.style.height=L+"px"),S!==null&&S.setSize(e.width,e.height),this.setViewport(0,0,b,L)},this.getDrawingBufferSize=function(b){return b.set(Lt*Q,X*Q).floor()},this.setDrawingBufferSize=function(b,L,W){Lt=b,X=L,Q=W,e.width=Math.floor(b*W),e.height=Math.floor(L*W),this.setViewport(0,0,b,L)},this.setEffects=function(b){if(g===_n){Nt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(b){for(let L=0;L<b.length;L++)if(b[L].isOutputPass===!0){Ot("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}S.setEffects(b||[])},this.getCurrentViewport=function(b){return b.copy(et)},this.getViewport=function(b){return b.copy(vt)},this.setViewport=function(b,L,W,z){b.isVector4?vt.set(b.x,b.y,b.z,b.w):vt.set(b,L,W,z),y.viewport(et.copy(vt).multiplyScalar(Q).round())},this.getScissor=function(b){return b.copy(Xt)},this.setScissor=function(b,L,W,z){b.isVector4?Xt.set(b.x,b.y,b.z,b.w):Xt.set(b,L,W,z),y.scissor(at.copy(Xt).multiplyScalar(Q).round())},this.getScissorTest=function(){return He},this.setScissorTest=function(b){y.setScissorTest(He=b)},this.setOpaqueSort=function(b){yt=b},this.setTransparentSort=function(b){Ft=b},this.getClearColor=function(b){return b.copy(Gt.getClearColor())},this.setClearColor=function(){Gt.setClearColor(...arguments)},this.getClearAlpha=function(){return Gt.getClearAlpha()},this.setClearAlpha=function(){Gt.setClearAlpha(...arguments)},this.clear=function(b=!0,L=!0,W=!0){let z=0;if(b){let H=!1;if(nt!==null){let gt=nt.texture.format;H=p.has(gt)}if(H){let gt=nt.texture.type,Mt=m.has(gt),mt=Gt.getClearColor(),St=Gt.getClearAlpha(),Et=mt.r,Vt=mt.g,Zt=mt.b;Mt?(v[0]=Et,v[1]=Vt,v[2]=Zt,v[3]=St,O.clearBufferuiv(O.COLOR,0,v)):(E[0]=Et,E[1]=Vt,E[2]=Zt,E[3]=St,O.clearBufferiv(O.COLOR,0,E))}else z|=O.COLOR_BUFFER_BIT}L&&(z|=O.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),W&&(z|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),z!==0&&O.clear(z)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(b){b.setRenderer(this),k=b},this.dispose=function(){e.removeEventListener("webglcontextlost",he,!1),e.removeEventListener("webglcontextrestored",ne,!1),e.removeEventListener("webglcontextcreationerror",Fn,!1),Gt.dispose(),ft.dispose(),ht.dispose(),G.dispose(),ot.dispose(),tt.dispose(),xt.dispose(),it.dispose(),ct.dispose(),Tt.dispose(),Tt.removeEventListener("sessionstart",ep),Tt.removeEventListener("sessionend",np),ms.stop()};function he(b){b.preventDefault(),$o("WebGLRenderer: Context Lost."),P=!0}function ne(){$o("WebGLRenderer: Context Restored."),P=!1;let b=U.autoReset,L=Dt.enabled,W=Dt.autoUpdate,z=Dt.needsUpdate,H=Dt.type;It(),U.autoReset=b,Dt.enabled=L,Dt.autoUpdate=W,Dt.needsUpdate=z,Dt.type=H}function Fn(b){Nt("WebGLRenderer: A WebGL context could not be created. Reason: ",b.statusMessage)}function Kn(b){let L=b.target;L.removeEventListener("dispose",Kn),hy(L)}function hy(b){uy(b),G.remove(b)}function uy(b){let L=G.get(b).programs;L!==void 0&&(L.forEach(function(W){ct.releaseProgram(W)}),b.isShaderMaterial&&ct.releaseShaderCache(b))}this.renderBufferDirect=function(b,L,W,z,H,gt){L===null&&(L=pn);let Mt=H.isMesh&&H.matrixWorld.determinantAffine()<0,mt=py(b,L,W,z,H);y.setMaterial(z,Mt);let St=W.index,Et=1;if(z.wireframe===!0){if(St=Y.getWireframeAttribute(W),St===void 0)return;Et=2}let Vt=W.drawRange,Zt=W.attributes.position,wt=Vt.start*Et,ie=(Vt.start+Vt.count)*Et;gt!==null&&(wt=Math.max(wt,gt.start*Et),ie=Math.min(ie,(gt.start+gt.count)*Et)),St!==null?(wt=Math.max(wt,0),ie=Math.min(ie,St.count)):Zt!=null&&(wt=Math.max(wt,0),ie=Math.min(ie,Zt.count));let Oe=ie-wt;if(Oe<0||Oe===1/0)return;xt.setup(H,z,mt,W,St);let fe,le=ut;if(St!==null&&(fe=lt.get(St),le=j,le.setIndex(fe)),H.isMesh)z.wireframe===!0?(y.setLineWidth(z.wireframeLinewidth*Ne()),le.setMode(O.LINES)):le.setMode(O.TRIANGLES);else if(H.isLine){let rn=z.linewidth;rn===void 0&&(rn=1),y.setLineWidth(rn*Ne()),H.isLineSegments?le.setMode(O.LINES):H.isLineLoop?le.setMode(O.LINE_LOOP):le.setMode(O.LINE_STRIP)}else H.isPoints?le.setMode(O.POINTS):H.isSprite&&le.setMode(O.TRIANGLES);if(H.isBatchedMesh)if(re.get("WEBGL_multi_draw"))le.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{let rn=H._multiDrawStarts,_t=H._multiDrawCounts,hn=H._multiDrawCount,Qt=St?lt.get(St).bytesPerElement:1,Rn=G.get(z).currentProgram.getUniforms();for(let Jn=0;Jn<hn;Jn++)Rn.setValue(O,"_gl_DrawID",Jn),le.render(rn[Jn]/Qt,_t[Jn])}else if(H.isInstancedMesh)le.renderInstances(wt,Oe,H.count);else if(W.isInstancedBufferGeometry){let rn=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,_t=Math.min(W.instanceCount,rn);le.renderInstances(wt,Oe,_t)}else le.render(wt,Oe)};function tp(b,L,W,z){k!==null&&b.isNodeMaterial&&k.setObject(z,b),te===!0&&Pt.setState(b,W,!1),b.transparent===!0&&b.side===yn&&b.forceSinglePass===!1?(b.side=dn,b.needsUpdate=!0,Va(b,L,z),b.side=es,b.needsUpdate=!0,Va(b,L,z),b.side=yn):Va(b,L,z)}this.compile=function(b,L,W=null){W===null&&(W=b),k!==null&&k.renderStart(b,L,W),w=ht.get(W),w.init(L),_.push(w),W.traverseVisible(function(H){H.isLight&&H.layers.test(L.layers)&&(w.pushLight(H),H.castShadow&&w.pushShadow(H))}),b!==W&&b.traverseVisible(function(H){H.isLight&&H.layers.test(L.layers)&&(w.pushLight(H),H.castShadow&&w.pushShadow(H))}),w.setupLights(),k!==null&&k.updateLights(w.state.lightsArray),ce=this.localClippingEnabled,te=Pt.init(this.clippingPlanes,ce),te===!0&&Pt.setGlobalState(this.clippingPlanes,L),k!==null&&Dt.render(w.state.shadowsArray,W,L);let z=new Set;return b.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;let gt=H.material;if(gt)if(Array.isArray(gt))for(let Mt=0;Mt<gt.length;Mt++){let mt=gt[Mt];tp(mt,W,L,H),z.add(mt)}else tp(gt,W,L,H),z.add(gt)}),w=_.pop(),k!==null&&k.renderEnd(),z},this.compileAsync=function(b,L,W=null){let z=this.compile(b,L,W);return new Promise(H=>{function gt(){if(z.forEach(function(Mt){let St=G.get(Mt).currentProgram;(St===void 0||St.isReady())&&z.delete(Mt)}),z.size===0){H(b);return}setTimeout(gt,10)}re.get("KHR_parallel_shader_compile")!==null?gt():setTimeout(gt,10)})};let vu=null;function dy(b){vu&&vu(b)}function ep(){ms.stop()}function np(){ms.start()}let ms=new d0;ms.setAnimationLoop(dy),typeof self<"u"&&ms.setContext(self),this.setAnimationLoop=function(b){vu=b,Tt.setAnimationLoop(b),b===null?ms.stop():ms.start()},Tt.addEventListener("sessionstart",ep),Tt.addEventListener("sessionend",np),this.render=function(b,L){if(L!==void 0&&L.isCamera!==!0){Nt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(P===!0)return;k!==null&&k.renderStart(b,L);let W=Tt.enabled===!0&&Tt.isPresenting===!0,z=S!==null&&(nt===null||W)&&S.begin(R,nt);if(b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),L.parent===null&&L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),Tt.enabled===!0&&Tt.isPresenting===!0&&(S===null||S.isCompositing()===!1)&&(Tt.cameraAutoUpdate===!0&&Tt.updateCamera(L),L=Tt.getCamera()),b.isScene===!0&&b.onBeforeRender(R,b,L,nt),w=ht.get(b,_.length),w.init(L),w.state.textureUnits=q.getTextureUnits(),_.push(w),qt.multiplyMatrices(L.projectionMatrix,L.matrixWorldInverse),$t.setFromProjectionMatrix(qt,Wn,L.reversedDepth),ce=this.localClippingEnabled,te=Pt.init(this.clippingPlanes,ce),T=ft.get(b,C.length),T.init(),C.push(T),Tt.enabled===!0&&Tt.isPresenting===!0){let Mt=R.xr.getDepthSensingMesh();Mt!==null&&Mu(Mt,L,-1/0,R.sortObjects)}Mu(b,L,0,R.sortObjects),T.finish(),k!==null&&k.updateLights(w.state.lightsArray),R.sortObjects===!0&&T.sort(yt,Ft),be=Tt.enabled===!1||Tt.isPresenting===!1||Tt.hasDepthSensing()===!1,be&&Gt.addToRenderList(T,b),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),te===!0&&Pt.beginShadows();let H=w.state.shadowsArray;if(Dt.render(H,b,L),te===!0&&Pt.endShadows(),(z&&S.hasRenderPass())===!1){let Mt=T.opaque,mt=T.transmissive;if(w.setupLights(),L.isArrayCamera){let St=L.cameras;if(mt.length>0)for(let Et=0,Vt=St.length;Et<Vt;Et++){let Zt=St[Et];sp(Mt,mt,b,Zt)}be&&Gt.render(b);for(let Et=0,Vt=St.length;Et<Vt;Et++){let Zt=St[Et];ip(T,b,Zt,Zt.viewport)}}else mt.length>0&&sp(Mt,mt,b,L),be&&Gt.render(b),ip(T,b,L)}nt!==null&&Z===0&&(q.updateMultisampleRenderTarget(nt),q.updateRenderTargetMipmap(nt)),z&&S.end(R),b.isScene===!0&&b.onAfterRender(R,b,L),xt.resetDefaultState(),$=-1,K=null,_.pop(),_.length>0?(w=_[_.length-1],q.setTextureUnits(w.state.textureUnits),te===!0&&Pt.setGlobalState(R.clippingPlanes,w.state.camera)):w=null,C.pop(),C.length>0?T=C[C.length-1]:T=null,k!==null&&k.renderEnd()};function Mu(b,L,W,z){if(b.visible===!1)return;if(b.layers.test(L.layers)){if(b.isGroup)W=b.renderOrder;else if(b.isLOD)b.autoUpdate===!0&&b.update(L);else if(b.isLightProbeGrid)w.pushLightProbeGrid(b);else if(b.isLight)w.pushLight(b),b.castShadow&&w.pushShadow(b);else if(b.isSprite){if(!b.frustumCulled||b.intersectsFrustum($t)){z&&Ze.setFromMatrixPosition(b.matrixWorld).applyMatrix4(qt);let Mt=tt.update(b),mt=b.material;mt.visible&&T.push(b,Mt,mt,W,Ze.z,null,L)}}else if((b.isMesh||b.isLine||b.isPoints)&&(!b.frustumCulled||b.intersectsFrustum($t))){let Mt=tt.update(b),mt=b.material;if(z&&(b.boundingSphere!==void 0?(b.boundingSphere===null&&b.computeBoundingSphere(),Ze.copy(b.boundingSphere.center)):(Mt.boundingSphere===null&&Mt.computeBoundingSphere(),Ze.copy(Mt.boundingSphere.center)),Ze.applyMatrix4(b.matrixWorld).applyMatrix4(qt)),Array.isArray(mt)){let St=Mt.groups;for(let Et=0,Vt=St.length;Et<Vt;Et++){let Zt=St[Et],wt=mt[Zt.materialIndex];wt&&wt.visible&&T.push(b,Mt,wt,W,Ze.z,Zt,L)}}else mt.visible&&T.push(b,Mt,mt,W,Ze.z,null,L)}}let gt=b.children;for(let Mt=0,mt=gt.length;Mt<mt;Mt++)Mu(gt[Mt],L,W,z)}function ip(b,L,W,z){let{opaque:H,transmissive:gt,transparent:Mt}=b;w.setupLightsView(W),te===!0&&Pt.setGlobalState(R.clippingPlanes,W),z&&y.viewport(et.copy(z)),H.length>0&&Ga(H,L,W),gt.length>0&&Ga(gt,L,W),Mt.length>0&&Ga(Mt,L,W),y.buffers.depth.setTest(!0),y.buffers.depth.setMask(!0),y.buffers.color.setMask(!0),y.setPolygonOffset(!1)}function sp(b,L,W,z){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;if(w.state.transmissionRenderTarget[z.id]===void 0){let wt=re.has("EXT_color_buffer_half_float")||re.has("EXT_color_buffer_float");w.state.transmissionRenderTarget[z.id]=new Ce(1,1,{generateMipmaps:!0,type:wt?We:_n,minFilter:hi,samples:Math.max(4,A.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Yt.workingColorSpace})}let gt=w.state.transmissionRenderTarget[z.id],Mt=z.viewport||et;gt.setSize(Mt.z*R.transmissionResolutionScale,Mt.w*R.transmissionResolutionScale);let mt=R.getRenderTarget(),St=R.getActiveCubeFace(),Et=R.getActiveMipmapLevel();R.setRenderTarget(gt),R.getClearColor(zt),kt=R.getClearAlpha(),kt<1&&R.setClearColor(16777215,.5),R.clear(),be&&Gt.render(W);let Vt=R.toneMapping;R.toneMapping=Cn;let Zt=z.viewport;if(z.viewport!==void 0&&(z.viewport=void 0),w.setupLightsView(z),te===!0&&Pt.setGlobalState(R.clippingPlanes,z),Ga(b,W,z),q.updateMultisampleRenderTarget(gt),q.updateRenderTargetMipmap(gt),re.has("WEBGL_multisampled_render_to_texture")===!1){let wt=!1;for(let ie=0,Oe=L.length;ie<Oe;ie++){let fe=L[ie],{object:le,geometry:rn,material:_t,group:hn}=fe;if(_t.side===yn&&le.layers.test(z.layers)){let Qt=_t.side;_t.side=dn,_t.needsUpdate=!0,rp(le,W,z,rn,_t,hn),_t.side=Qt,_t.needsUpdate=!0,wt=!0}}wt===!0&&(q.updateMultisampleRenderTarget(gt),q.updateRenderTargetMipmap(gt))}R.setRenderTarget(mt,St,Et),R.setClearColor(zt,kt),Zt!==void 0&&(z.viewport=Zt),R.toneMapping=Vt}function Ga(b,L,W){let z=L.isScene===!0?L.overrideMaterial:null;for(let H=0,gt=b.length;H<gt;H++){let Mt=b[H],{object:mt,geometry:St,group:Et}=Mt,Vt=Mt.material;Vt.allowOverride===!0&&z!==null&&(Vt=z),mt.layers.test(W.layers)&&rp(mt,L,W,St,Vt,Et)}}function rp(b,L,W,z,H,gt){k!==null&&H.isNodeMaterial&&k.setObject(b,H),b.onBeforeRender(R,L,W,z,H,gt),b.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,b.matrixWorld),b.normalMatrix.getNormalMatrix(b.modelViewMatrix),H.onBeforeRender(R,L,W,z,b,gt),H.transparent===!0&&H.side===yn&&H.forceSinglePass===!1?(H.side=dn,H.needsUpdate=!0,R.renderBufferDirect(W,L,z,H,b,gt),H.side=es,H.needsUpdate=!0,R.renderBufferDirect(W,L,z,H,b,gt),H.side=yn):R.renderBufferDirect(W,L,z,H,b,gt),b.onAfterRender(R,L,W,z,H,gt)}function Va(b,L,W){L.isScene!==!0&&(L=pn);let z=G.get(b),H=w.state.lights,gt=w.state.shadowsArray,Mt=H.state.version,mt=ct.getParameters(b,H.state,gt,L,W,w.state.lightProbeGridArray),St=ct.getProgramCacheKey(mt),Et=z.programs;z.environment=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?L.environment:null,z.fog=L.fog;let Vt=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap;z.envMap=ot.get(b.envMap||z.environment,Vt),z.envMapRotation=z.environment!==null&&b.envMap===null?L.environmentRotation:b.envMapRotation,Et===void 0&&(b.addEventListener("dispose",Kn),Et=new Map,z.programs=Et);let Zt=Et.get(St);if(Zt!==void 0){if(z.currentProgram===Zt&&z.lightsStateVersion===Mt)return ap(b,mt),Zt}else mt.uniforms=ct.getUniforms(b),k!==null&&b.isNodeMaterial&&k.build(b,W,mt),b.onBeforeCompile(mt,R),Zt=ct.acquireProgram(mt,St),Et.set(St,Zt),z.uniforms=mt.uniforms;let wt=z.uniforms;return(!b.isShaderMaterial&&!b.isRawShaderMaterial||b.clipping===!0)&&(wt.clippingPlanes=Pt.uniform),ap(b,mt),z.needsLights=gy(b),z.lightsStateVersion=Mt,z.needsLights&&(wt.ambientLightColor.value=H.state.ambient,wt.lightProbe.value=H.state.probe,wt.sunLights.value=H.state.sun,wt.sunLightShadows.value=H.state.sunShadow,wt.directionalLights.value=H.state.directional,wt.directionalLightShadows.value=H.state.directionalShadow,wt.spotLights.value=H.state.spot,wt.spotLightShadows.value=H.state.spotShadow,wt.rectAreaLights.value=H.state.rectArea,wt.ltc_1.value=H.state.rectAreaLTC1,wt.ltc_2.value=H.state.rectAreaLTC2,wt.pointLights.value=H.state.point,wt.pointLightShadows.value=H.state.pointShadow,wt.hemisphereLights.value=H.state.hemi,wt.sunShadowMatrix.value=H.state.sunShadowMatrix,wt.sunShadowCascade.value=H.state.sunShadowCascade,wt.directionalShadowMatrix.value=H.state.directionalShadowMatrix,wt.spotLightMatrix.value=H.state.spotLightMatrix,wt.spotLightMap.value=H.state.spotLightMap,wt.pointShadowMatrix.value=H.state.pointShadowMatrix),z.lightProbeGrid=w.state.lightProbeGridArray.length>0,z.currentProgram=Zt,z.uniformsList=null,Zt}function op(b){if(b.uniformsList===null){let L=b.currentProgram.getUniforms();b.uniformsList=Wr.seqWithValue(L.seq,b.uniforms)}return b.uniformsList}function ap(b,L){let W=G.get(b);W.outputColorSpace=L.outputColorSpace,W.batching=L.batching,W.batchingColor=L.batchingColor,W.instancing=L.instancing,W.instancingColor=L.instancingColor,W.instancingMorph=L.instancingMorph,W.skinning=L.skinning,W.morphTargets=L.morphTargets,W.morphNormals=L.morphNormals,W.morphColors=L.morphColors,W.morphTargetsCount=L.morphTargetsCount,W.numClippingPlanes=L.numClippingPlanes,W.numIntersection=L.numClipIntersection,W.vertexAlphas=L.vertexAlphas,W.vertexTangents=L.vertexTangents,W.toneMapping=L.toneMapping}function fy(b,L){if(b.length===0)return null;if(b.length===1)return b[0].texture!==null?b[0]:null;M.setFromMatrixPosition(L.matrixWorld);for(let W=0,z=b.length;W<z;W++){let H=b[W];if(H.texture!==null&&H.boundingBox.containsPoint(M))return H}return null}function py(b,L,W,z,H){L.isScene!==!0&&(L=pn),q.resetTextureUnits();let gt=L.fog,Mt=z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial?L.environment:null,mt=nt===null?R.outputColorSpace:nt.isXRRenderTarget===!0?nt.texture.colorSpace:Yt.workingColorSpace,St=z.isMeshStandardMaterial||z.isMeshLambertMaterial&&!z.envMap||z.isMeshPhongMaterial&&!z.envMap,Et=ot.get(z.envMap||Mt,St),Vt=z.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Zt=!!W.attributes.tangent&&(!!z.normalMap||z.anisotropy>0),wt=!!W.morphAttributes.position,ie=!!W.morphAttributes.normal,Oe=!!W.morphAttributes.color,fe=Cn;z.toneMapped&&(nt===null||nt.isXRRenderTarget===!0)&&(fe=R.toneMapping);let le=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,rn=le!==void 0?le.length:0,_t=G.get(z),hn=w.state.lights;if(te===!0&&(ce===!0||b!==K)){let ue=b===K&&z.id===$;Pt.setState(z,b,ue)}let Qt=!1;z.version===_t.__version?(_t.needsLights&&_t.lightsStateVersion!==hn.state.version||_t.outputColorSpace!==mt||H.isBatchedMesh&&_t.batching===!1||!H.isBatchedMesh&&_t.batching===!0||H.isBatchedMesh&&_t.batchingColor===!0&&H._colorsTexture===null||H.isBatchedMesh&&_t.batchingColor===!1&&H._colorsTexture!==null||H.isInstancedMesh&&_t.instancing===!1||!H.isInstancedMesh&&_t.instancing===!0||H.isSkinnedMesh&&_t.skinning===!1||!H.isSkinnedMesh&&_t.skinning===!0||H.isInstancedMesh&&_t.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&_t.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&_t.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&_t.instancingMorph===!1&&H.morphTexture!==null||_t.envMap!==Et||z.fog===!0&&_t.fog!==gt||_t.numClippingPlanes!==void 0&&(_t.numClippingPlanes!==Pt.numPlanes||_t.numIntersection!==Pt.numIntersection)||_t.vertexAlphas!==Vt||_t.vertexTangents!==Zt||_t.morphTargets!==wt||_t.morphNormals!==ie||_t.morphColors!==Oe||_t.toneMapping!==fe||_t.morphTargetsCount!==rn||!!_t.lightProbeGrid!=w.state.lightProbeGridArray.length>0)&&(Qt=!0):(Qt=!0,_t.__version=z.version);let Rn=_t.currentProgram;Qt===!0&&(Rn=Va(z,L,H),k&&z.isNodeMaterial&&k.onUpdateProgram(z,Rn,_t));let Jn=!1,Di=!1,Vs=!1,oe=Rn.getUniforms(),Pe=_t.uniforms;if(y.useProgram(Rn.program)&&(Jn=!0,Di=!0,Vs=!0),z.id!==$&&($=z.id,Di=!0),_t.needsLights){let ue=fy(w.state.lightProbeGridArray,H);_t.lightProbeGrid!==ue&&(_t.lightProbeGrid=ue,Di=!0)}if(Jn||K!==b){y.buffers.depth.getReversed()&&b.reversedDepth!==!0&&(b._reversedDepth=!0,b.updateProjectionMatrix()),oe.setValue(O,"projectionMatrix",b.projectionMatrix),oe.setValue(O,"viewMatrix",b.matrixWorldInverse);let Oi=oe.map.cameraPosition;Oi!==void 0&&Oi.setValue(O,ye.setFromMatrixPosition(b.matrixWorld)),A.logarithmicDepthBuffer&&oe.setValue(O,"logDepthBufFC",2/(Math.log(b.far+1)/Math.LN2)),(z.isMeshPhongMaterial||z.isMeshToonMaterial||z.isMeshLambertMaterial||z.isMeshBasicMaterial||z.isMeshStandardMaterial||z.isShaderMaterial)&&oe.setValue(O,"isOrthographic",b.isOrthographicCamera===!0),K!==b&&(K=b,Di=!0,Vs=!0)}if(_t.needsLights&&(hn.state.sunShadowMap.length>0&&oe.setValue(O,"sunShadowMap",hn.state.sunShadowMap,q),hn.state.directionalShadowMap.length>0&&oe.setValue(O,"directionalShadowMap",hn.state.directionalShadowMap,q),hn.state.spotShadowMap.length>0&&oe.setValue(O,"spotShadowMap",hn.state.spotShadowMap,q),hn.state.pointShadowMap.length>0&&oe.setValue(O,"pointShadowMap",hn.state.pointShadowMap,q)),H.isSkinnedMesh){oe.setOptional(O,H,"bindMatrix"),oe.setOptional(O,H,"bindMatrixInverse");let ue=H.skeleton;ue&&(ue.boneTexture===null&&ue.computeBoneTexture(),oe.setValue(O,"boneTexture",ue.boneTexture,q))}H.isBatchedMesh&&(oe.setOptional(O,H,"batchingTexture"),oe.setValue(O,"batchingTexture",H._matricesTexture,q),oe.setOptional(O,H,"batchingIdTexture"),oe.setValue(O,"batchingIdTexture",H._indirectTexture,q),oe.setOptional(O,H,"batchingColorTexture"),H._colorsTexture!==null&&oe.setValue(O,"batchingColorTexture",H._colorsTexture,q));let Ni=W.morphAttributes;if((Ni.position!==void 0||Ni.normal!==void 0||Ni.color!==void 0)&&N.update(H,W,Rn),(Di||_t.receiveShadow!==H.receiveShadow)&&(_t.receiveShadow=H.receiveShadow,oe.setValue(O,"receiveShadow",H.receiveShadow)),(z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial)&&z.envMap===null&&L.environment!==null&&(Pe.envMapIntensity.value=L.environmentIntensity),Pe.dfgLUT!==void 0&&(Pe.dfgLUT.value=O1()),Di){if(oe.setValue(O,"toneMappingExposure",R.toneMappingExposure),_t.needsLights&&my(Pe,Vs),gt&&z.fog===!0&&Rt.refreshFogUniforms(Pe,gt),Rt.refreshMaterialUniforms(Pe,z,Q,X,w.state.transmissionRenderTarget[b.id]),_t.needsLights&&_t.lightProbeGrid){let ue=_t.lightProbeGrid;Pe.probesSH.value=ue.texture,Pe.probesMin.value.copy(ue.boundingBox.min),Pe.probesMax.value.copy(ue.boundingBox.max),Pe.probesResolution.value.copy(ue.resolution)}Wr.upload(O,op(_t),Pe,q)}if(z.isShaderMaterial&&z.uniformsNeedUpdate===!0&&(Wr.upload(O,op(_t),Pe,q),z.uniformsNeedUpdate=!1),z.isSpriteMaterial&&oe.setValue(O,"center",H.center),oe.setValue(O,"modelViewMatrix",H.modelViewMatrix),oe.setValue(O,"normalMatrix",H.normalMatrix),oe.setValue(O,"modelMatrix",H.matrixWorld),z.uniformsGroups!==void 0){let ue=z.uniformsGroups;for(let Oi=0,Ws=ue.length;Oi<Ws;Oi++){let cp=ue[Oi];it.update(cp,Rn),it.bind(cp,Rn)}}return Rn}function my(b,L){b.ambientLightColor.needsUpdate=L,b.lightProbe.needsUpdate=L,b.sunLights.needsUpdate=L,b.sunLightShadows.needsUpdate=L,b.directionalLights.needsUpdate=L,b.directionalLightShadows.needsUpdate=L,b.pointLights.needsUpdate=L,b.pointLightShadows.needsUpdate=L,b.spotLights.needsUpdate=L,b.spotLightShadows.needsUpdate=L,b.rectAreaLights.needsUpdate=L,b.hemisphereLights.needsUpdate=L}function gy(b){return b.isMeshLambertMaterial||b.isMeshToonMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isShadowMaterial||b.isShaderMaterial&&b.lights===!0}this.getActiveCubeFace=function(){return V},this.getActiveMipmapLevel=function(){return Z},this.getRenderTarget=function(){return nt},this.setRenderTargetTextures=function(b,L,W){let z=G.get(b);z.__autoAllocateDepthBuffer=b.resolveDepthBuffer===!1,z.__autoAllocateDepthBuffer===!1&&(z.__useRenderToTexture=!1),G.get(b.texture).__webglTexture=L,G.get(b.depthTexture).__webglTexture=z.__autoAllocateDepthBuffer?void 0:W,z.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(b,L){let W=G.get(b);W.__webglFramebuffer=L,W.__useDefaultFramebuffer=L===void 0},this.setRenderTarget=function(b,L=0,W=0){nt=b,V=L,Z=W;let z=null,H=!1,gt=!1;if(b){let mt=G.get(b);if(mt.__useDefaultFramebuffer!==void 0){y.bindFramebuffer(O.FRAMEBUFFER,mt.__webglFramebuffer),et.copy(b.viewport),at.copy(b.scissor),rt=b.scissorTest,y.viewport(et),y.scissor(at),y.setScissorTest(rt),$=-1;return}else if(mt.__webglFramebuffer===void 0)q.setupRenderTarget(b);else if(mt.__hasExternalTextures)q.rebindTextures(b,G.get(b.texture).__webglTexture,G.get(b.depthTexture).__webglTexture);else if(b.depthBuffer){let Vt=b.depthTexture;if(mt.__boundDepthTexture!==Vt){if(Vt!==null&&G.has(Vt)&&(b.width!==Vt.image.width||b.height!==Vt.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");q.setupDepthRenderbuffer(b)}}let St=b.texture;(St.isData3DTexture||St.isDataArrayTexture||St.isCompressedArrayTexture)&&(gt=!0);let Et=G.get(b).__webglFramebuffer;b.isWebGLCubeRenderTarget?(Array.isArray(Et[L])?z=Et[L][W]:z=Et[L],H=!0):b.samples>0&&q.useMultisampledRTT(b)===!1?z=G.get(b).__webglMultisampledFramebuffer:Array.isArray(Et)?z=Et[W]:z=Et,et.copy(b.viewport),at.copy(b.scissor),rt=b.scissorTest}else et.copy(vt).multiplyScalar(Q).floor(),at.copy(Xt).multiplyScalar(Q).floor(),rt=He;if(W!==0&&(z=B),y.bindFramebuffer(O.FRAMEBUFFER,z)&&y.drawBuffers(b,z),y.viewport(et),y.scissor(at),y.setScissorTest(rt),H){let mt=G.get(b.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+L,mt.__webglTexture,W)}else if(gt){let mt=L;for(let St=0;St<b.textures.length;St++){let Et=G.get(b.textures[St]);O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0+St,Et.__webglTexture,W,mt)}}else if(b!==null&&W!==0){let mt=G.get(b.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,mt.__webglTexture,W)}$=-1};function lp(b){let L=G.get(b);return(L.__readFormat!==b.format||L.__readType!==b.type)&&(L.__readFormat=b.format,L.__readType=b.type,L.__formatReadable=A.textureFormatReadable(b.format),L.__typeReadable=A.textureTypeReadable(b.type)),L}this.readRenderTargetPixels=function(b,L,W,z,H,gt,Mt,mt=0){if(!(b&&b.isWebGLRenderTarget)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let St=G.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&Mt!==void 0&&(St=St[Mt]),St){y.bindFramebuffer(O.FRAMEBUFFER,St);try{let Et=b.textures[mt],Vt=Et.format,Zt=Et.type;b.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+mt);let wt=lp(Et);if(wt.__formatReadable===!1){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(wt.__typeReadable===!1){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}L>=0&&L<=b.width-z&&W>=0&&W<=b.height-H&&O.readPixels(L,W,z,H,dt.convert(Vt),dt.convert(Zt),gt)}finally{let Et=nt!==null?G.get(nt).__webglFramebuffer:null;y.bindFramebuffer(O.FRAMEBUFFER,Et)}}},this.readRenderTargetPixelsAsync=async function(b,L,W,z,H,gt,Mt,mt=0){if(!(b&&b.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let St=G.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&Mt!==void 0&&(St=St[Mt]),St)if(L>=0&&L<=b.width-z&&W>=0&&W<=b.height-H){y.bindFramebuffer(O.FRAMEBUFFER,St);let Et=b.textures[mt],Vt=Et.format,Zt=Et.type;b.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+mt);let wt=lp(Et);if(wt.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(wt.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let ie=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,ie),O.bufferData(O.PIXEL_PACK_BUFFER,gt.byteLength,O.STREAM_READ),O.readPixels(L,W,z,H,dt.convert(Vt),dt.convert(Zt),0),O.bindBuffer(O.PIXEL_PACK_BUFFER,null);let Oe=nt!==null?G.get(nt).__webglFramebuffer:null;y.bindFramebuffer(O.FRAMEBUFFER,Oe);let fe=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await Bg(O,fe,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,ie),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,gt),O.bindBuffer(O.PIXEL_PACK_BUFFER,null),O.deleteBuffer(ie),O.deleteSync(fe),gt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(b,L=null,W=0){let z=Math.pow(2,-W),H=Math.floor(b.image.width*z),gt=Math.floor(b.image.height*z),Mt=L!==null?L.x:0,mt=L!==null?L.y:0;q.setTexture2D(b,0),O.copyTexSubImage2D(O.TEXTURE_2D,W,0,0,Mt,mt,H,gt),y.unbindTexture()},this.copyTextureToTexture=function(b,L,W=null,z=null,H=0,gt=0){let Mt,mt,St,Et,Vt,Zt,wt,ie,Oe,fe=b.isCompressedTexture?b.mipmaps[gt]:b.image;if(W!==null)Mt=W.max.x-W.min.x,mt=W.max.y-W.min.y,St=W.isBox3?W.max.z-W.min.z:1,Et=W.min.x,Vt=W.min.y,Zt=W.isBox3?W.min.z:0;else{let Pe=Math.pow(2,-H);Mt=Math.floor(fe.width*Pe),mt=Math.floor(fe.height*Pe),b.isDataArrayTexture?St=fe.depth:b.isData3DTexture?St=Math.floor(fe.depth*Pe):St=1,Et=0,Vt=0,Zt=0}z!==null?(wt=z.x,ie=z.y,Oe=z.z):(wt=0,ie=0,Oe=0);let le=dt.convert(L.format),rn=dt.convert(L.type),_t;L.isData3DTexture?(q.setTexture3D(L,0),_t=O.TEXTURE_3D):L.isDataArrayTexture||L.isCompressedArrayTexture?(q.setTexture2DArray(L,0),_t=O.TEXTURE_2D_ARRAY):(q.setTexture2D(L,0),_t=O.TEXTURE_2D),y.activeTexture(O.TEXTURE0),y.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,L.flipY),y.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,L.premultiplyAlpha),y.pixelStorei(O.UNPACK_ALIGNMENT,L.unpackAlignment);let hn=y.getParameter(O.UNPACK_ROW_LENGTH),Qt=y.getParameter(O.UNPACK_IMAGE_HEIGHT),Rn=y.getParameter(O.UNPACK_SKIP_PIXELS),Jn=y.getParameter(O.UNPACK_SKIP_ROWS),Di=y.getParameter(O.UNPACK_SKIP_IMAGES);y.pixelStorei(O.UNPACK_ROW_LENGTH,fe.width),y.pixelStorei(O.UNPACK_IMAGE_HEIGHT,fe.height),y.pixelStorei(O.UNPACK_SKIP_PIXELS,Et),y.pixelStorei(O.UNPACK_SKIP_ROWS,Vt),y.pixelStorei(O.UNPACK_SKIP_IMAGES,Zt);let Vs=b.isDataArrayTexture||b.isData3DTexture,oe=L.isDataArrayTexture||L.isData3DTexture;if(b.isDepthTexture){let Pe=G.get(b),Ni=G.get(L),ue=G.get(Pe.__renderTarget),Oi=G.get(Ni.__renderTarget);y.bindFramebuffer(O.READ_FRAMEBUFFER,ue.__webglFramebuffer),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,Oi.__webglFramebuffer);for(let Ws=0;Ws<St;Ws++)Vs&&(O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,G.get(b).__webglTexture,H,Zt+Ws),O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,G.get(L).__webglTexture,gt,Oe+Ws)),O.blitFramebuffer(Et,Vt,Mt,mt,wt,ie,Mt,mt,O.DEPTH_BUFFER_BIT,O.NEAREST);y.bindFramebuffer(O.READ_FRAMEBUFFER,null),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else if(H!==0||b.isRenderTargetTexture||G.has(b)){let Pe=G.get(b),Ni=G.get(L);y.bindFramebuffer(O.READ_FRAMEBUFFER,I),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,F);for(let ue=0;ue<St;ue++)Vs?O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Pe.__webglTexture,H,Zt+ue):O.framebufferTexture2D(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Pe.__webglTexture,H),oe?O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Ni.__webglTexture,gt,Oe+ue):O.framebufferTexture2D(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Ni.__webglTexture,gt),H!==0?O.blitFramebuffer(Et,Vt,Mt,mt,wt,ie,Mt,mt,O.COLOR_BUFFER_BIT,O.NEAREST):oe?O.copyTexSubImage3D(_t,gt,wt,ie,Oe+ue,Et,Vt,Mt,mt):O.copyTexSubImage2D(_t,gt,wt,ie,Et,Vt,Mt,mt);y.bindFramebuffer(O.READ_FRAMEBUFFER,null),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else oe?b.isDataTexture||b.isData3DTexture?O.texSubImage3D(_t,gt,wt,ie,Oe,Mt,mt,St,le,rn,fe.data):L.isCompressedArrayTexture?O.compressedTexSubImage3D(_t,gt,wt,ie,Oe,Mt,mt,St,le,fe.data):O.texSubImage3D(_t,gt,wt,ie,Oe,Mt,mt,St,le,rn,fe):b.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,gt,wt,ie,Mt,mt,le,rn,fe.data):b.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,gt,wt,ie,fe.width,fe.height,le,fe.data):O.texSubImage2D(O.TEXTURE_2D,gt,wt,ie,Mt,mt,le,rn,fe);y.pixelStorei(O.UNPACK_ROW_LENGTH,hn),y.pixelStorei(O.UNPACK_IMAGE_HEIGHT,Qt),y.pixelStorei(O.UNPACK_SKIP_PIXELS,Rn),y.pixelStorei(O.UNPACK_SKIP_ROWS,Jn),y.pixelStorei(O.UNPACK_SKIP_IMAGES,Di),gt===0&&L.generateMipmaps&&O.generateMipmap(_t),y.unbindTexture()},this.initRenderTarget=function(b){G.get(b).__webglFramebuffer===void 0&&q.setupRenderTarget(b)},this.initTexture=function(b){b.isCubeTexture?q.setTextureCube(b,0):b.isData3DTexture?q.setTexture3D(b,0):b.isDataArrayTexture||b.isCompressedArrayTexture?q.setTexture2DArray(b,0):q.setTexture2D(b,0),y.unbindTexture()},this.resetState=function(){V=0,Z=0,nt=null,y.reset(),xt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Wn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=Yt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Yt._getUnpackColorSpace()}};var vC=Object.freeze(["high","low","flat"]),MC=Object.freeze(["lights","shadows","post","particles","marks","zoneOutlines","chalk","camera","capture","footlights"]);function _0(i){return i==="low"?{post:!1,shadows:!1,msaa:0,pixelRatioCap:1,dust:120,sparks:24,footlights:!1}:{post:!0,shadows:!0,msaa:4,pixelRatioCap:2,dust:420,sparks:48,footlights:!0}}function dh(i,t,e,n,s=null){let r=[],o=!1;for(let a of i){let l=t[a.id]??"rest";l==="target"&&(o=!0),r.push(`${a.id}:${l}:${Lu(a,l,e).toFixed(2)}`)}return s&&r.push(`B${Object.entries(s.counts??{}).map(([a,l])=>`${a}=${l}/${s.downs?.[a]??0}`).join(",")}`),r.join("|")+(o?`|t${Math.floor(n*20)}`:"")}var v0=Object.freeze([[240,186,92],[112,196,222],[226,118,104],[146,208,126],[196,150,232],[242,150,72],[230,220,140]]);function M0(i){let t=i.reduce((s,r)=>s+r[0],0)/i.length,e=Math.min(...i.map(s=>s[1])),n=Math.max(...i.map(s=>s[1]));return[t,e+(n-e)*.32]}function b0(i){return M0(i.floor??i.shape)}function U1(i,t,e,n,s,r,o,{labels:a=!0}={}){let l=n.filter(h=>h.kind==="area"),c=new Map;l.forEach((h,d)=>{let u=(h.floor??h.shape).map(([v,E])=>[v*t,E*e]),[f,x,g]=h.colour??v0[d%v0.length],p=r?.[h.id]==="target",m=()=>{i.beginPath(),u.forEach(([v,E],M)=>M?i.lineTo(v,E):i.moveTo(v,E)),i.closePath()};i.save(),m(),i.fillStyle=`rgba(${f},${x},${g},${p?.3:.17})`,i.fill(),i.lineJoin="round",i.setLineDash([18,9]),i.lineDashOffset=p?-o*60:0,m(),i.strokeStyle="rgba(16,10,5,0.6)",i.lineWidth=7,i.stroke(),m(),i.strokeStyle=`rgba(${f},${x},${g},0.95)`,i.lineWidth=p?4.5:3.2,i.stroke(),i.restore(),c.set(h.id,M0(u))}),i.save(),i.setLineDash([10,10]),i.lineCap="round";for(let{a:h,b:d}of s.bands??[]){let u=c.get(h),f=c.get(d);!u||!f||(i.beginPath(),i.moveTo(u[0],u[1]+30),i.lineTo(f[0],f[1]+30),i.strokeStyle="rgba(16,10,5,0.45)",i.lineWidth=6,i.stroke(),i.strokeStyle="rgba(255,236,200,0.7)",i.lineWidth=2.6,i.stroke())}i.restore(),a&&l.forEach(h=>{let[d,u]=c.get(h.id);i.save(),i.textAlign="center",i.font='600 30px "Shippori Mincho", "Hiragino Mincho ProN", serif',i.lineWidth=7,i.strokeStyle="rgba(16,10,5,0.78)",i.strokeText(h.name||h.id,d,u),i.fillStyle="rgba(255,240,212,1)",i.fillText(h.name||h.id,d,u);let f=s.counts?.[h.id]??0,x=s.downs?.[h.id]??0,g=[...(h.tags??[]).map(p=>p.toUpperCase()),f?`${f} HERE`:null,x?`${x} DOWN`:null].filter(Boolean);if(g.length){i.font="700 15px system-ui, sans-serif";let p=g.map(v=>i.measureText(v).width+18),m=d-(p.reduce((v,E)=>v+E,0)+6*(g.length-1))/2;g.forEach((v,E)=>{let M=v.endsWith(" HERE");w0(i,m+p[E]/2,u+24,v,15,M?"rgba(20,12,6,0.95)":"rgba(255,236,200,0.95)",M?"rgba(255,190,110,0.95)":"rgba(16,10,5,0.72)"),m+=p[E]+6})}i.restore()})}function S0(i,t=0,e=0){let n=i.name||i.id,s=[...(i.tags??[]).map(x=>x.toUpperCase()),t?`${t} HERE`:null,e?`${e} DOWN`:null].filter(Boolean),r=Zr(8,8).getContext("2d");r.font='600 34px "Shippori Mincho", "Hiragino Mincho ProN", serif';let o=r.measureText(n).width;r.font="700 17px system-ui, sans-serif";let a=s.map(x=>r.measureText(x).width+20),l=a.reduce((x,g)=>x+g,0)+7*Math.max(0,s.length-1),c=Math.ceil(Math.max(o+24,l+12)),h=s.length?84:50,d=Zr(c*2,h*2),u=d.getContext("2d");u.scale(2,2),u.textAlign="center",u.font='600 34px "Shippori Mincho", "Hiragino Mincho ProN", serif',u.lineJoin="round",u.lineWidth=7,u.strokeStyle="rgba(16,10,5,0.82)",u.strokeText(n,c/2,36),u.fillStyle="rgba(255,240,212,1)",u.fillText(n,c/2,36);let f=c/2-l/2;return s.forEach((x,g)=>{let p=x.endsWith(" HERE"),m=x.endsWith(" DOWN");w0(u,f+a[g]/2,64,x,17,p||m?"rgba(20,12,6,0.95)":"rgba(255,236,200,0.95)",p?"rgba(255,190,110,0.95)":m?"rgba(170,160,150,0.9)":"rgba(16,10,5,0.75)"),f+=a[g]+7}),{canvas:d,w:c,h}}function w0(i,t,e,n,s,r,o){i.save(),i.font=`700 ${s}px system-ui, sans-serif`,i.textAlign="center",i.textBaseline="middle";let a=i.measureText(n).width+16,l=s+10;i.setLineDash([]),i.beginPath(),i.roundRect(t-a/2,e-l/2,a,l,l/2),i.fillStyle=o,i.fill(),i.fillStyle=r,i.fillText(n,t,e+1),i.restore()}function fh(i,t,e,n,s,r,o,a=null,{boardLabels:l=!0}={}){i.clearRect(0,0,t,e),a&&U1(i,t,e,n,a,s,o,{labels:l});for(let c of n){if(a&&c.kind==="area")continue;let h=s[c.id]??"rest",d=Lu(c,h,r);if(d<=.01)continue;let u=c.shape.map(([g,p])=>[g*t,p*e]),f=()=>{i.beginPath(),u.forEach(([g,p],m)=>m?i.lineTo(g,p):i.moveTo(g,p)),i.closePath()},x=h==="target";if(i.lineJoin="round",i.setLineDash([14,11]),i.lineDashOffset=x?-o*60:0,f(),i.strokeStyle=`rgba(20,12,6,${.55*d})`,i.lineWidth=6,i.stroke(),f(),i.strokeStyle=x?`rgba(255,150,70,${d})`:`rgba(255,222,170,${.9*d})`,i.lineWidth=x?4:2.4,i.stroke(),i.setLineDash([]),d>=.8&&c.name){let g=u.reduce((m,v)=>m+v[0],0)/u.length,p=Math.min(...u.map(m=>m[1]))-10;i.font='600 30px "Shippori Mincho", "Hiragino Mincho ProN", serif',i.textAlign="center",i.lineWidth=7,i.strokeStyle=`rgba(20,12,6,${.7*d})`,i.strokeText(c.name,g,p),i.fillStyle=`rgba(255,236,200,${d})`,i.fillText(c.name,g,p),c.hint&&(i.font="600 20px sans-serif",i.lineWidth=5,i.strokeStyle=`rgba(20,12,6,${.7*d})`,i.strokeText(c.hint.toUpperCase(),g,p+26),i.fillStyle=`rgba(255,222,170,${.85*d})`,i.fillText(c.hint.toUpperCase(),g,p+26))}}}var Zr=(i,t)=>{let e=document.createElement("canvas");return e.width=i,e.height=t,e};function T0(){let i=Zr(64,64),t=i.getContext("2d"),e=t.createRadialGradient(32,32,0,32,32,32);return e.addColorStop(0,"rgba(255,255,255,1)"),e.addColorStop(.35,"rgba(255,255,255,0.5)"),e.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=e,t.fillRect(0,0,64,64),i}function ph(){let i=Zr(256,256),t=i.getContext("2d");t.translate(128,128),t.lineCap="round";let e=9;for(let[n,s]of[[20,"#1b140c"],[10,"#e6c98d"]]){t.strokeStyle=s,t.lineWidth=n;for(let r=0;r<e;r++){let o=r/e*Math.PI*2+.3,a=120*(.72+.28*(r*7%3/2));t.beginPath(),t.moveTo(Math.cos(o)*46,Math.sin(o)*46),t.lineTo(Math.cos(o)*a,Math.sin(o)*a),t.stroke()}}t.fillStyle="#fff7d6",t.strokeStyle="#1b140c",t.lineWidth=6,t.beginPath();for(let n=0;n<16;n++){let s=n/16*Math.PI*2,r=n%2?18:40;t[n?"lineTo":"moveTo"](Math.cos(s)*r,Math.sin(s)*r)}return t.closePath(),t.fill(),t.stroke(),i}function mh(){let i=Zr(256,160),t=i.getContext("2d");t.lineCap="round";let e=(n,s)=>{t.strokeStyle=s,t.lineWidth=n;for(let[r,o]of[[-1,-1],[1,-1],[-1,1],[1,1]]){let a=128+r*100,l=80+o*56;t.beginPath(),t.moveTo(a-r*34,l),t.lineTo(a,l),t.lineTo(a,l-o*30),t.stroke()}};return e(13,"rgba(20,12,6,0.7)"),e(7,"#e6c98d"),t.setLineDash([2,12]),t.strokeStyle="rgba(255,226,170,0.75)",t.lineWidth=5,t.beginPath(),t.ellipse(128,80,66,36,0,0,Math.PI*2),t.stroke(),i}function gh(i){let t=Zr(512,96),e=t.getContext("2d");return e.font='700 40px "Helvetica Neue", Arial, sans-serif',e.textAlign="center",e.textBaseline="middle",e.lineWidth=9,e.strokeStyle="rgba(20,12,6,0.8)",e.strokeText(i.toUpperCase(),256,48),e.fillStyle="#ffe9c4",e.fillText(i.toUpperCase(),256,48),t}var Us=class{constructor(){this.byUrl=new Map}loadImage=t=>t?(this.byUrl.has(t)||this.byUrl.set(t,new Promise(e=>{let n=new Image;n.crossOrigin="anonymous",n.onload=()=>e(n),n.onerror=()=>e(null),n.src=t})),this.byUrl.get(t)):Promise.resolve(null)};var as=Math.PI/180,xh=class{constructor(){this.items=new Set}add(t){return t&&this.items.add(t),t}mesh(t){this.add(t.geometry);for(let e of[].concat(t.material)){this.add(e);for(let n of Object.values(e))n?.isTexture&&this.add(n)}return t}disposeAll(){for(let t of this.items)t.dispose?.();this.items.clear()}get size(){return this.items.size}};function fn(i,{anisotropy:t=8,srgb:e=!0}={}){let n=new ta(i);return e&&(n.colorSpace=Ae),n.anisotropy=t,n}var E0=()=>fn(T0(),{anisotropy:1}),A0=()=>fn(ph());function gf(i,t,e){let{f:n,cx:s,cy:r,floorY:o}=t.cam,a=20,l=3e4;i.position.set(0,o-r,n),i.projectionMatrix.makePerspective(-a*(s-e.ox)/n,a*(e.ox+e.visW-s)/n,a*(r-e.oy)/n,-a*(e.oy+e.visH-r)/n,a,l),i.projectionMatrixInverse.copy(i.projectionMatrix).invert(),i.updateProjectionMatrix=()=>{},i.updateMatrixWorld(!0)}function Sa(i,t,e,n){let{f:s,cx:r,cy:o,floorY:a}=i.cam;return new D((t-r)*(s-n)/s,a-o-(e-o)*(s-n)/s,n)}var yh=i=>i.cam.f/(Ka.H/2);function wa(i,t,e=0,n=null,s=null){let[r,o]=i.size,a=r*i.map.s,l=o*i.map.s,{x0:c,y0:h,x1:d,y1:u}=n??{x0:0,y0:0,x1:1,y1:1},f=-Pn+e,x=(i.cam.f-f)/i.cam.f,g=new Bt(s??new ke(1,1),t);return g.position.copy(Sa(i,i.map.ox+a*(c+d)/2,i.map.oy+l*(h+u)/2,f)),g.scale.set(a*(d-c)*x,l*(u-h)*x,1),g}var F1=32e5,_h=class{constructor({scene:t,rig:e,tracker:n,softDot:s,settings:r}){this.description=t,this.rig=e,this.T=n,this.softDot=s,this.settings=r,this.group=new Ge,this.lights=[],this.lanterns=[],this.foot=[],this.dust=null}async build(t){let{rig:e,description:n,T:s}=this,r=s.add(new Ve(t));r.colorSpace=Ae,r.anisotropy=8,r.generateMipmaps=!0,r.minFilter=hi,r.needsUpdate=!0,this.paintTex=r;let[o,a]=e.size,l=o*e.map.s,c=a*e.map.s,h=s.mesh(new Bt(new ke(1,1),new Re({map:r,color:14474460})));h.position.copy(Sa(e,e.map.ox+l/2,e.map.oy+c/2,-Pn)),h.scale.set(l*(e.cam.f+Pn)/e.cam.f,c*(e.cam.f+Pn)/e.cam.f,1),this.group.add(h),this.backdrop=h,this.#e(r,l,c);for(let u of n.occluders){let f=e.standing([u.x,u.base]);if(!f)continue;let x=u.poly.map(C=>C[0]),g=u.poly.map(C=>C[1]),p=[Math.min(...x),Math.min(...g),Math.max(...x),Math.max(...g)],m=[],v=[],E=[];for(let[C,_]of u.poly){let S=Sa(e,e.map.x(C),e.map.y(_),f.Z);m.push(S.x,S.y,S.z),v.push(C,1-_),E.push((C-p[0])/(p[2]-p[0]||1),1-(_-p[1])/(p[3]-p[1]||1))}let M=new ve;M.setAttribute("position",new Jt(m,3)),M.setAttribute("uv",new Jt(v,2)),M.setAttribute("uv1",new Jt(E,2)),M.setIndex(u.poly.length===4?[0,2,1,0,3,2]:B1(u.poly.length));let T=this.#t(u.poly,p),w=s.mesh(new Bt(M,new Re({map:r,color:14474460,side:yn,...T?{alphaMap:T,transparent:!0}:{}})));w.renderOrder=3,this.group.add(w)}let d=s.mesh(new Bt(new ke(24e3,24e3),new Dr({opacity:.62,depthWrite:!1})));return d.rotation.x=-Math.PI/2,d.receiveShadow=!0,d.renderOrder=2,this.group.add(d),this.floor=d,this.ambient=new ca(16765600,n.ambient),this.group.add(this.ambient),n.lights.forEach((u,f)=>this.#n(u,f)),this.#i(),this.#s(),this}#t(t,[e,n,s,r]){let{rig:o,T:a}=this,[l,c]=o.size,h=(s-e)*l*o.map.s,d=(r-n)*c*o.map.s;if(!(h>0&&d>0))return null;let u=256,f=Math.max(32,Math.min(512,Math.round(u*d/h))),x=Math.min(sl,d*rl)/d*f,g=ol(t.map(([v,E])=>[(v-e)/(s-e)*u,(E-n)/(r-n)*f]),u,f,x),p=new Uint8Array(u*f*4);for(let v=0;v<f;v++)for(let E=0;E<u;E++){let M=g[v*u+E],T=((f-1-v)*u+E)*4;p[T]=p[T+1]=p[T+2]=p[T+3]=M}let m=a.add(new Ir(p,u,f,vn));return m.magFilter=ze,m.minFilter=ze,m.channel=1,m.needsUpdate=!0,m}#e(t,e,n){let{rig:s,T:r}=this,o=s.map.oy+n,a=s.ref.H-o+600;if(a<=0)return;let l=Math.min(a,n*.6),c=s.cam.f+Pn,h=new ke(1,1),d=h.attributes.uv;for(let f=0;f<d.count;f++)d.setY(f,d.getY(f)===1?0:l/n);let u=r.mesh(new Bt(h,new Re({map:t,color:9079434})));u.position.copy(Sa(s,s.map.ox+e/2,o+l/2,-Pn)),u.scale.set(e*c/s.cam.f,l*c/s.cam.f,1),this.group.add(u)}#n(t,e){let{rig:n,T:s}=this,r=n.standing([t.at[0],t.below]);if(!r)return;let{cx:o,cy:a,f:l,floorY:c}=n.cam,h=l/(l-r.Z),d=o+(n.map.x(t.at[0])-o)/h,u=a+(n.map.y(t.at[1])-a)/h,f=new D(d-o,c-u,r.Z),x=new Ct(t.colour[0]/255,t.colour[1]/255,t.colour[2]/255),g=new Ur(x,0,0,1.2,.9,2);if(g.position.copy(f),g.target.position.set(f.x,0,f.z),g.userData={base:t.intensity*F1,flicker:t.flicker,hz:t.flickerHz,seed:e+1},t.shadow&&this.settings.shadows&&(g.castShadow=!0,g.shadow.mapSize.set(1024,1024),g.shadow.bias=-4e-4,g.shadow.radius=5,g.shadow.camera.near=30,g.shadow.camera.far=3e3),this.group.add(g,g.target),this.lights.push(g),this.lanterns.push({pos:f,colour:x}),t.pool){let p=s.mesh(new Bt(new na(t.pool*.62,48),new Re({map:this.softDot,color:x,transparent:!0,opacity:.38,blending:An,depthWrite:!1})));p.rotation.x=-Math.PI/2,p.position.set(f.x,1,f.z),p.renderOrder=1,this.group.add(p)}}#i(){let{T:t}=this;for(let e of[-1,1]){let n=new Ur(16761466,0,0,.66,.75,2);n.position.set(e*640,26,360),n.target.position.set(e*140,340,-420),n.userData={base:23e5},n.visible=!1,this.settings.shadows&&(n.castShadow=!0,n.shadow.mapSize.set(1024,1024),n.shadow.bias=-5e-4,n.shadow.radius=4,n.shadow.camera.near=40,n.shadow.camera.far=2800),this.group.add(n,n.target),this.foot.push(n)}this.wall=t.mesh(new Bt(new ke(7e3,2600),new Dr({opacity:.72,depthWrite:!1}))),this.wall.position.set(0,1300,-2300),this.wall.receiveShadow=!0,this.wall.renderOrder=2,this.wall.visible=!1,this.group.add(this.wall)}setFootlights(t){t=!!t&&this.settings.footlights;for(let e of this.foot)e.visible=t,e.intensity=t?e.userData.base:0;this.wall.visible=t,this.ambient.intensity=t?this.description.ambient*.75:this.description.ambient,this.footlightsOn=t}#s(){let t=this.settings.dust;if(!t)return;let e=new Float32Array(t*3),n=7,s=()=>(n=n*16807%2147483647,n/2147483647);for(let a=0;a<t;a++)e[a*3]=(s()-.5)*2600,e[a*3+1]=40+s()*820,e[a*3+2]=-520+s()*760;let r=this.T.add(new ve);r.setAttribute("position",new Be(e.slice(),3)),r.setAttribute("color",new Be(new Float32Array(t*3),3));let o=this.T.add(new ji({size:8*yh(this.rig),map:this.softDot,vertexColors:!0,transparent:!0,opacity:.9,blending:An,depthWrite:!1,sizeAttenuation:!0}));this.dust=new Rs(r,o),this.dust.frustumCulled=!1,this.dustBase=e,this.group.add(this.dust)}update(t){for(let r of this.lights){let o=r.userData;r.intensity=o.base*(1+o.flicker*vo(t*o.hz,o.seed))}if(!this.dust)return;let e=this.dust.geometry.attributes.position,n=this.dust.geometry.attributes.color,s=this.dustBase;for(let r=0;r<e.count;r++){let o=s[r*3]+Math.sin(t*.21+r)*22,a=s[r*3+1]+t*(4+r%7)%120,l=s[r*3+2];e.array[r*3]=o,e.array[r*3+1]=a,e.array[r*3+2]=l;let c=0,h=0,d=0;for(let u of this.lanterns){let f=(o-u.pos.x)**2+(a-u.pos.y)**2+(l-u.pos.z)**2,x=Math.max(0,1-Math.sqrt(f)/900);c+=u.colour.r*x*x,h+=u.colour.g*x*x,d+=u.colour.b*x*x}n.array[r*3]=Math.min(1,c),n.array[r*3+1]=Math.min(1,h),n.array[r*3+2]=Math.min(1,d)}e.needsUpdate=!0,n.needsUpdate=!0}};function B1(i){let t=[];for(let e=1;e<i-1;e++)t.push(0,e+1,e);return t}var Ta=new D;function Nn(i,t,e,n,s,r){let o=2*Math.PI*s/4,a=Math.max(r-2*s,0),l=Math.PI/4;Ta.copy(t),Ta[n]=0,Ta.normalize();let c=.5*o/(o+a),h=1-Ta.angleTo(i)/l;return Math.sign(Ta[e])===1?h*c:a/(o+a)+c+c*(1-h)}var vh=class i extends ln{constructor(t=1,e=1,n=1,s=2,r=.1){let o=s*2+1;if(r=Math.min(t/2,e/2,n/2,r),super(1,1,1,o,o,o),this.type="RoundedBoxGeometry",this.parameters={width:t,height:e,depth:n,segments:s,radius:r},o===1)return;let a=this.toNonIndexed();this.index=null,this.attributes.position=a.attributes.position,this.attributes.normal=a.attributes.normal,this.attributes.uv=a.attributes.uv;let l=new D,c=new D,h=new D(t,e,n).divideScalar(2).subScalar(r),d=this.attributes.position.array,u=this.attributes.normal.array,f=this.attributes.uv.array,x=d.length/6,g=new D,p=.5/o;for(let m=0,v=0;m<d.length;m+=3,v+=2)switch(l.fromArray(d,m),c.copy(l),c.x-=Math.sign(c.x)*p,c.y-=Math.sign(c.y)*p,c.z-=Math.sign(c.z)*p,c.normalize(),d[m+0]=h.x*Math.sign(l.x)+c.x*r,d[m+1]=h.y*Math.sign(l.y)+c.y*r,d[m+2]=h.z*Math.sign(l.z)+c.z*r,u[m+0]=c.x,u[m+1]=c.y,u[m+2]=c.z,Math.floor(m/x)){case 0:g.set(1,0,0),f[v+0]=Nn(g,c,"z","y",r,n),f[v+1]=1-Nn(g,c,"y","z",r,e);break;case 1:g.set(-1,0,0),f[v+0]=1-Nn(g,c,"z","y",r,n),f[v+1]=1-Nn(g,c,"y","z",r,e);break;case 2:g.set(0,1,0),f[v+0]=1-Nn(g,c,"x","z",r,t),f[v+1]=Nn(g,c,"z","x",r,n);break;case 3:g.set(0,-1,0),f[v+0]=1-Nn(g,c,"x","z",r,t),f[v+1]=1-Nn(g,c,"z","x",r,n);break;case 4:g.set(0,0,1),f[v+0]=1-Nn(g,c,"x","y",r,t),f[v+1]=1-Nn(g,c,"y","x",r,e);break;case 5:g.set(0,0,-1),f[v+0]=Nn(g,c,"x","y",r,t),f[v+1]=1-Nn(g,c,"y","x",r,e);break}}static fromJSON(t){return new i(t.width,t.height,t.depth,t.segments,t.radius)}};var C0=typeof Intl<"u"&&Intl.Segmenter?new Intl.Segmenter(void 0,{granularity:"grapheme"}):null,z1=i=>C0?[...C0.segment(i)].map(t=>t.segment):[...i];function H1(i){let t=String(i??"").replace(/\s+/g," ").trim(),e=z1(t);return e.length<=16?t:`${e.slice(0,15).join("")}\u2026`}function ls(i){if(!Array.isArray(i))return[];let t=[];for(let e of i){let n=H1(typeof e=="string"||typeof e=="number"?e:e?.label);if(n&&!t.includes(n)&&t.push(n),t.length===4)break}return t}var R0=(i,t)=>JSON.stringify(ls(i))===JSON.stringify(ls(t));var G1=360;function V1(i,t){let e=ls(t?.badges);if(!e.length||!i?.getContext)return i;let n=i.getContext("2d"),s=i.width/G1,r=21*s,o=9*s,a=6*s,l=14*s;n.save(),n.font=`700 ${r}px sans-serif`,n.textBaseline="middle";let c=l;for(let h of e){let d=Math.min(i.width*.6,n.measureText(h).width+o*2),u=r+o;n.fillStyle="rgba(24,16,8,0.88)",W1(n,l,c,d,u,u/2),n.fill(),n.strokeStyle="rgba(255,226,160,0.85)",n.lineWidth=Math.max(1,1.5*s),n.stroke(),n.fillStyle="#fff4d6",n.fillText(h,l+o,c+u/2+s,d-o*2),c+=u+a}return n.restore(),i}function W1(i,t,e,n,s,r){i.beginPath(),i.moveTo(t+r,e),i.arcTo(t+n,e,t+n,e+s,r),i.arcTo(t+n,e+s,t,e+s,r),i.arcTo(t,e+s,t,e,r),i.arcTo(t,e,t+n,e,r),i.closePath()}async function qr(i,t,e){return V1(await i.face(t,e),t)}var Aa=(i,t,e)=>Math.max(t,Math.min(e,i)),Ea=Object.freeze({floor:.4,gain:1.25,tint:.5,lift:0});function I0(i,t,e){let n=new Float32Array(t*e*3);for(let s=0;s<t*e;s++)n[s*3]=i[s*4]/255,n[s*3+1]=i[s*4+1]/255,n[s*3+2]=i[s*4+2]/255;return{w:t,h:e,cells:n}}function P0(i,t,e){let n=Aa(t,0,1)*(i.w-1),s=Aa(e,0,1)*(i.h-1),r=Math.floor(n),o=Math.floor(s),a=Math.min(i.w-1,r+1),l=Math.min(i.h-1,o+1),c=n-r,h=s-o,d=[0,0,0];for(let u=0;u<3;u++){let f=(p,m)=>i.cells[(m*i.w+p)*3+u],x=f(r,o)*(1-c)+f(a,o)*c,g=f(r,l)*(1-c)+f(a,l)*c;d[u]=x*(1-h)+g*h}return d}function Mh(i,t,e,{strength:n=1}={}){if(!i||!(n>0))return[1,1,1];let s=P0(i,t,e),r=P0(i,t,e-.09),o=[0,1,2].map(u=>(s[u]+r[u])/2),a=.2126*o[0]+.7152*o[1]+.0722*o[2],l=Aa(Ea.floor+Ea.gain*a+Ea.lift,Ea.floor,1),c=Math.max(o[0],o[1],o[2],.001),h=Ea.tint*Aa(c/.12,0,1);return o.map(u=>l*(1-h*(1-u/c))).map(u=>Aa(1+n*(u-1),.3,1))}function bh(i,t,e=.14){return i?i.map((n,s)=>n+(t[s]-n)*e):t.slice()}var xf=1.5,Sh=class{constructor(t,e,n,s){this.id=t.id,this.person=t,this.skin=e,this.ctx=n,this.s=s,this.w=e.size.w,this.h=e.size.h,this.stickLen=(e.stick?.length??134)*s,this.root=new Ge,this.root.userData.cardId=t.id,this.emote=null,this.ghostTexture=null}async build(){let{skin:t,ctx:e,person:n}=this,s=e.tracker,r=t.materials??{},o=s.add(new en({color:r.body?.color??15196109,metalness:r.body?.metalness??0,roughness:r.body?.roughness??.9})),a=this.#t(),[l,c]=await Promise.all([qr(t,n,a),t.back(n,a)]);this.leanG=new Ge,this.hinge=new Ge,this.yawG=new Ge,this.yawG.rotation.order="YXZ",this.root.add(this.leanG),this.leanG.add(this.hinge),this.hinge.add(this.yawG);let h=this.w,d=this.h,u=s.mesh(new Bt(new vh(h-3,d-3,t.thickness,3,6),o));u.position.y=d/2,u.castShadow=!0;let f=s.add(fn(l));this.faceTex=f,this.ghostTexture=f;let x=s.mesh(new Bt(new ke(h,d),new Nr({map:f,roughness:r.face?.roughness??.5,metalness:r.face?.metalness??.1,clearcoat:r.face?.clearcoat??.6,clearcoatRoughness:.22,transparent:!0,alphaTest:.5,envMapIntensity:.7})));x.position.set(0,d/2,t.thickness/2+.2),x.receiveShadow=!0,this.faceMaterial=x.material,this.backTex=s.add(fn(c));let g=s.mesh(new Bt(new ke(h,d),new en({map:this.backTex,roughness:r.back?.roughness??.62,metalness:r.back?.metalness??.35,transparent:!0,alphaTest:.5})));g.position.set(0,d/2,-(t.thickness/2+.2)),g.rotation.y=Math.PI;let p=s.mesh(new Bt(new ln(h*.5,12,54),o));if(p.position.set(0,-6,0),p.castShadow=!0,this.card=new Ge,this.card.add(u,x,g,p),n.colour){let m=s.mesh(new Bt(new ln(h*.5-8,3,8),new en({color:new Ct(n.colour),roughness:.35,metalness:.1})));m.position.set(0,-2.5,24),this.card.add(m)}return this.card.scale.setScalar(this.s),this.yawG.add(this.card),this.#e(o),this.blob=s.mesh(new Bt(new ke(1,1),new Re({map:e.softDot,color:0,transparent:!0,opacity:.55,depthWrite:!1}))),this.blob.rotation.x=-Math.PI/2,this.blob.renderOrder=2,this.root.traverse(m=>{m.userData.cardId=n.id}),this.pickables=[u,x,g,p],this}#t(){return{loadImage:this.ctx.images.loadImage,titleBlock:this.ctx.titleBlock}}async refresh(t){this.person={...this.person,...t};let e=this.#t(),[n,s]=await Promise.all([qr(this.skin,this.person,e),this.skin.back(this.person,e)]);!this.faceTex||!this.backTex||(this.faceTex.image=n,this.faceTex.needsUpdate=!0,this.backTex.image=s,this.backTex.needsUpdate=!0)}#e(t){let{skin:e,ctx:n}=this,s=n.tracker,r=this.s,o=this.stickLen,a=18*r,l=new Ct(this.person.colour??"#e8e0c8"),c=e.stick?.wood??8409389,h=s.add(new Nr({color:c,roughness:.3,clearcoat:1,clearcoatRoughness:.12,emissive:new Ct(c).multiplyScalar(.45),emissiveIntensity:.9})),d=s.add(new en({color:e.stick?.collar??12096079,metalness:1,roughness:.34}));this.rod=new Ge;let u=s.mesh(new Bt(new ci(8.5*r,6.4*r,o-a,24),h));u.position.y=(o-a)/2;let f=s.mesh(new Bt(new sa(6.4*r,18,12),h)),x=s.mesh(new Bt(new ci(12.5*r,10*r,a,28),d));x.position.y=o-a/2;let g=s.mesh(new Bt(new Lr(12*r,2.2*r,8,28),d));g.rotation.x=Math.PI/2,g.position.y=o-a;let p=s.mesh(new Bt(new Lr(21,3.6,10,36),new en({color:l,emissive:l,emissiveIntensity:1.6,roughness:.4})));p.rotation.x=Math.PI/2,p.position.y=8;for(let m of[u,f,x,g])m.castShadow=!0;this.rod.add(u,f,x,g,p),this.rod.visible=!1,this.leanG.add(this.rod)}pose(t){let e=t.grip,n=t.grow??1,s=this.s*n;this.root.position.set(t.x,t.lift,t.z);let r=1-.45*e;this.leanG.rotation.z=-t.lean*r*as,this.hinge.position.y=this.stickLen*e,this.hinge.rotation.z=-t.lean*(1-r)*as,this.rod.visible=e>.02,this.rod.scale.set(1,Math.max(e,.001),1),this.yawG.rotation.set(t.pitch*as,t.yaw*as,0),this.card.scale.set(s,s*(t.down?1:t.breathe)*t.squash,s),this.grown=n;let o=1-.45*(t.down??0),a=this.ctx.lightAt?.(t.x,t.z);if(a&&(this.light=bh(this.light,a)),this.faceMaterial){let l=this.light??[1,1,1];this.faceMaterial.color.setRGB(o*l[0]**xf,o*l[1]**xf,o*l[2]**xf)}if(this.blob.position.set(t.x,.6,t.z),t.selected)this.blob.material.color.setHex(16751174),this.blob.material.blending=An,this.blob.scale.set(this.w*s*1.5,120*n,1),this.blob.material.opacity=.95;else if(t.speaking){let l=1+.06*Math.sin((t.breathe-1)*400);this.blob.material.color.setHex(16773320),this.blob.material.blending=An,this.blob.scale.set(this.w*s*1.9*l,170*n*l,1),this.blob.material.opacity=.8}else this.blob.material.color.setHex(0),this.blob.material.blending=ns,this.blob.scale.set(this.w*s*(.95+.5*e),(74+46*e)*n,1),this.blob.material.opacity=.62-.26*e;this.#n(t)}async setEmote(t){if(this.emote&&(this.emote.sprite.parent?.remove(this.emote.sprite),this.emote=null),this.wanted=t??null,!t)return;let e=await this.ctx.emoteTexture(t);if(!e||this.wanted!==t||this.emote||this.gone)return;let n=new li(this.ctx.tracker.add(new $n({map:e,depthTest:!1,transparent:!0})));n.renderOrder=50,n.center.set(.5,1-sr),this.emote={id:t,sprite:n},this.ctx.scene.add(n)}#n(t){let e=t.emote?.id??null;if(e&&e!==(this.wanted??null)&&this.setEmote(e).catch(()=>{}),!this.emote)return;let n=t.emote,s=this.emote.sprite;if(!n||n.id!==this.emote.id){s.visible=!1;return}s.visible=n.opacity>.01,s.material.opacity=n.opacity;let r=t.grow??1,o=96*n.pop*r,a=.96*r;s.position.set(t.x+74*this.s*r+(n.x??0)*a,t.lift+this.stickLen*t.grip+this.h*this.s*r*t.breathe+36*r-(n.y??0)*a-(sr-.5)*o,t.z+30),s.scale.set(o,o,1),s.material.rotation=-(n.r??0)*as}dispose(){this.gone=!0,this.root.parent?.remove(this.root),this.blob.parent?.remove(this.blob),this.emote&&this.emote.sprite.parent?.remove(this.emote.sprite)}};var k0=.2,L0=.42,D0=.8,X1=3,wh=class{constructor({scene:t,rig:e,tracker:n,softDot:s,settings:r,cardHeight:o}){this.T=n,this.cardHeight=o;let a=n.add(A0());this.impacts=[];for(let c=0;c<3;c++){let h=new li(n.add(new $n({map:a,depthTest:!1,transparent:!0,opacity:0})));h.renderOrder=60,h.scale.set(180,180,1),t.add(h),this.impacts.push(h)}this.flash=new la(16769704,0,1100,2),t.add(this.flash);let l=r.sparks;if(this.sparkCount=l,l){let c=n.add(new ve);c.setAttribute("position",new Be(new Float32Array(l*3),3)),this.sparks=new Rs(c,n.add(new ji({size:12*yh(e),map:s,color:16767370,transparent:!0,opacity:0,blending:An,depthWrite:!1}))),this.sparks.frustumCulled=!1,this.dir=Array.from({length:l},(h,d)=>{let u=d/l*Math.PI*2+d%5*.37,f=260+d*53%340;return[Math.cos(u)*f,Math.sin(u)*f*.8+120,d*31%100-50]}),t.add(this.sparks)}this.flashTimes=[],this.calm=!1}update(t,e){for(let r of this.impacts)r.material.opacity=0;this.flash.intensity=0,this.sparks&&(this.sparks.material.opacity=0);let n=0,s=this.cardHeight*.5+60;for(let r of t){let o=e-r.t;if(!(o<0||o>D0)){if(o<L0&&n<this.impacts.length){let a=this.impacts[n++],l=o/L0;a.position.set(r.x,s+10,r.Z+90),a.scale.setScalar(120+150*Math.sqrt(l)),a.material.opacity=1-l*l,a.material.rotation=.2*l}if(o<k0&&!this.calm&&this.#t(r.t)&&(this.flash.position.set(r.x,s,r.Z+300),this.flash.intensity=55e4*(1-o/k0)**2),this.sparks&&!this.calm&&r===t[t.length-1]){let a=this.sparks.geometry.attributes.position;this.dir.forEach((l,c)=>{a.array[c*3]=r.x+l[0]*o,a.array[c*3+1]=Math.max(2,s+l[1]*o-900*o*o),a.array[c*3+2]=r.Z+90+l[2]*o}),a.needsUpdate=!0,this.sparks.material.opacity=Math.max(0,1-o/D0)}}}}#t(t){return this.flashTimes.includes(t)?!0:(this.flashTimes=this.flashTimes.filter(e=>t-e<1),this.flashTimes.length>=X1?!1:(this.flashTimes.push(t),!0))}};var Th=class{constructor({scene:t,rig:e,zones:n,tracker:s}){this.zones=n,this.rig=e;let[r,o]=e.size;this.cw=Math.min(2048,r),this.ch=Math.round(this.cw*o/r),this.canvas=document.createElement("canvas"),this.canvas.width=this.cw,this.canvas.height=this.ch,this.ctx=this.canvas.getContext("2d"),this.tex=s.add(fn(this.canvas,{anisotropy:4}));let a=s.mesh(wa(e,new Re({map:this.tex,transparent:!0,depthWrite:!1}),20));a.renderOrder=3,t.add(a),this.mesh=a,this.key="",a.visible=n.length>0}update(t,e,n,s=null){if(!this.zones.length)return;let r=dh(this.zones,t,e,n,s);r!==this.key&&(this.key=r,fh(this.ctx,this.cw,this.ch,this.zones,t,e,n,s,{boardLabels:!1}),this.tex.needsUpdate=!0)}},Eh=class{constructor({scene:t,rig:e,zones:n,tracker:s,cardHeight:r=300}){this.T=s,this.scene=t,this.rig=e,this.cardHeight=r,this.areas=n.filter(o=>o.kind==="area"),this.labels=new Map}update(t){for(let e of this.areas){let n=this.labels.get(e.id);if(!t){n&&(n.sprite.visible=!1);continue}let s=t.counts?.[e.id]??0,r=t.downs?.[e.id]??0;(!n||n.n!==s||n.d!==r)&&(n=this.#t(e,s,r,n)),n.sprite.visible=!!n.at}}#t(t,e,n,s){let{canvas:r,w:o,h:a}=S0(t,e,n),l=this.T.add(fn(r,{anisotropy:4}));if(s)s.sprite.material.map?.dispose(),s.sprite.material.map=l,s.sprite.material.needsUpdate=!0;else{let c=new li(this.T.add(new $n({map:l,depthTest:!1,transparent:!0})));c.renderOrder=45,this.scene.add(c),s={sprite:c,at:this.rig.standing(b0(t))},this.labels.set(t.id,s)}if(s.n=e,s.d=n,s.at){let{f:c}=this.rig.cam,h=c/(c-s.at.Z),d=1.45/Math.sqrt(Math.max(.15,h));s.sprite.scale.set(o*d,a*d,1),s.sprite.position.set(s.at.X,this.cardHeight*Ja(this.rig.cam,s.at.Z)*1.08+a*d/2,s.at.Z)}return s}},Ah=class{constructor({scene:t,tracker:e,softDot:n}){this.T=e,this.scene=t,this.pool=[];let s=e.add($1());for(let r=0;r<6;r++){let o=e.mesh(new Bt(new ke(1,1),new Re({map:s,transparent:!0,opacity:0,depthWrite:!1})));o.rotation.x=-Math.PI/2,o.renderOrder=4,o.visible=!1,t.add(o),this.pool.push(o)}this.ghost=e.mesh(new Bt(new ke(1,1),new Re({transparent:!0,opacity:0,depthWrite:!1,side:yn}))),this.ghost.visible=!1,this.ghost.renderOrder=5,t.add(this.ghost),this.label=null,this.softDot=n,this.labelText=""}update(t,e,n){this.pool.forEach(s=>{s.visible=!1}),this.ghost.visible=!1,this.label&&(this.label.visible=!1),t.slice(0,this.pool.length).forEach((s,r)=>{let o=this.pool[r],a=s.target?1+.06*Math.sin(n*7):1;o.visible=!0,o.position.set(s.X,1.2,s.Z),o.scale.set((s.target?190:150)*a,(s.target?120:96)*a,1),o.material.opacity=Math.min(1,s.alpha)*(s.target?1:.8),s.target&&this.#t(s,e,n)})}#t(t,e,n){let s=e.get(t.for);if(!s)return;let r=this.ghost;r.material.map!==s.ghostTexture&&(r.material.map=s.ghostTexture,r.material.needsUpdate=!0);let o=t.pose;r.visible=!0,r.material.opacity=.32+.06*Math.sin(n*6),r.scale.set(s.w*s.s,s.h*s.s,1),r.position.set(t.X,o.lift+s.h*s.s/2,t.Z+4),r.rotation.set(0,0,0),r.rotateY(o.yaw*Math.PI/180),r.rotateX(o.pitch*Math.PI/180),r.rotateZ(-o.lean*Math.PI/180),t.label&&this.#e(t.label,t.X,o.lift+s.h*s.s+40,t.Z+10)}#e(t,e,n,s){if(!this.label||this.labelText!==t){this.label?.parent?.remove(this.label);let r=this.T.add(new $n({map:this.T.add(fn(gh(t))),depthTest:!1,transparent:!0}));this.label=new li(r),this.label.renderOrder=55,this.label.scale.set(260,49,1),this.scene.add(this.label),this.labelText=t}this.label.visible=!0,this.label.position.set(e,n,s)}},$1=()=>fn(mh(),{anisotropy:4});var Yr={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};var Yn=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},Z1=new Ps(-1,1,1,-1,0,1),yf=class extends ve{constructor(){super(),this.setAttribute("position",new Jt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Jt([0,2,0,0,2,0],2))}},q1=new yf,jr=class{constructor(t){this._mesh=new Bt(q1,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,Z1)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}};var Kr=class extends Yn{constructor(t,e="tDiffuse"){super(),this.textureID=e,this.uniforms=null,this.material=null,t instanceof Le?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=Ns.clone(t.uniforms),this.material=new Le({name:t.name!==void 0?t.name:"unspecified",defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this._fsQuad=new jr(this.material)}render(t,e,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var Ca=class extends Yn{constructor(t,e){super(),this.scene=t,this.camera=e,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(t,e,n){let s=t.getContext(),r=t.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,o,4294967295),r.buffers.stencil.setClear(a),r.buffers.stencil.setLocked(!0),t.setRenderTarget(n),this.clear&&t.clear(),t.render(this.scene,this.camera),t.setRenderTarget(e),this.clear&&t.clear(),t.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}},Ch=class extends Yn{constructor(){super(),this.needsSwap=!1}render(t){t.state.buffers.stencil.setLocked(!1),t.state.buffers.stencil.setTest(!1)}};var Rh=class{constructor(t,e){if(this.renderer=t,this._pixelRatio=t.getPixelRatio(),e===void 0){let n=t.getSize(new bt);this._width=n.width,this._height=n.height,e=new Ce(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:We}),e.texture.name="EffectComposer.rt1"}else this._width=e.width,this._height=e.height;this.renderTarget1=e,this.renderTarget2=e.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Kr(Yr),this.copyPass.material.blending=Dn,this.timer=new ha}swapBuffers(){let t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,e){this.passes.splice(e,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){let e=this.passes.indexOf(t);e!==-1&&this.passes.splice(e,1)}isLastEnabledPass(t){for(let e=t+1;e<this.passes.length;e++)if(this.passes[e].enabled)return!1;return!0}render(t){this.timer.update(),t===void 0&&(t=this.timer.getDelta());let e=this.renderer.getRenderTarget(),n=!1;for(let s=0,r=this.passes.length;s<r;s++){let o=this.passes[s];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),o.render(this.renderer,this.writeBuffer,this.readBuffer,t,n),o.needsSwap){if(n){let a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}Ca!==void 0&&(o instanceof Ca?n=!0:o instanceof Ch&&(n=!1))}}this.renderer.setRenderTarget(e)}reset(t){if(t===void 0){let e=this.renderer.getSize(new bt);this._pixelRatio=this.renderer.getPixelRatio(),this._width=e.width,this._height=e.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,e){this._width=t,this._height=e;let n=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(n,s),this.renderTarget2.setSize(n,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(n,s)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var Ph=class extends Yn{constructor(t,e,n=null,s=null,r=null){super(),this.scene=t,this.camera=e,this.overrideMaterial=n,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new Ct}render(t,e,n){let s=t.autoClear;t.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(t.getClearColor(this._oldClearColor),t.setClearColor(this.clearColor,t.getClearAlpha())),this.clearAlpha!==null&&(r=t.getClearAlpha(),t.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&t.clearDepth(),t.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),t.render(this.scene,this.camera),this.clearColor!==null&&t.setClearColor(this._oldClearColor),this.clearAlpha!==null&&t.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),t.autoClear=s}};var N0={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ct(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};var Jr=class i extends Yn{constructor(t,e=1,n,s){super(),this.strength=e,this.radius=n,this.threshold=s,this.resolution=t!==void 0?new bt(t.x,t.y):new bt(256,256),this.clearColor=new Ct(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new Ce(r,o,{type:We,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){let d=new Ce(r,o,{type:We,depthBuffer:!1});d.texture.name="UnrealBloomPass.h"+h,d.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(d);let u=new Ce(r,o,{type:We,depthBuffer:!1});u.texture.name="UnrealBloomPass.v"+h,u.texture.generateMipmaps=!1,this.renderTargetsVertical.push(u),r=Math.round(r/2),o=Math.round(o/2)}let a=N0;this.highPassUniforms=Ns.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Le({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];let l=[6,10,14,18,22];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new bt(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=e,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Ns.clone(Yr.uniforms),this.blendMaterial=new Le({uniforms:this.copyUniforms,vertexShader:Yr.vertexShader,fragmentShader:Yr.fragmentShader,premultipliedAlpha:!0,blending:An,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Ct,this._oldClearAlpha=1,this._basic=new Re,this._fsQuad=new jr(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(t,e){let n=Math.round(t/2),s=Math.round(e/2);this.renderTargetBright.setSize(n,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(n,s),this.renderTargetsVertical[r].setSize(n,s),this.separableBlurMaterials[r].uniforms.invSize.value=new bt(1/n,1/s),n=Math.round(n/2),s=Math.round(s/2)}render(t,e,n,s,r){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),r&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=i.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[l]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=i.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[l]),t.clear(),this._fsQuad.render(t),a=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(n),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(t){let e=[],n=t/3;for(let o=0;o<t;o++)e.push(.39894*Math.exp(-.5*o*o/(n*n))/n);let s=[],r=[];for(let o=1;o<t;o+=2){let a=e[o],l=o+1<t?e[o+1]:0,c=a+l;s.push((o*a+(o+1)*l)/c),r.push(c)}return new Le({defines:{KERNEL_PAIRS:s.length},uniforms:{colorTexture:{value:null},invSize:{value:new bt(.5,.5)},direction:{value:new bt(.5,.5)},centerWeight:{value:e[0]},gaussianOffsets:{value:s},gaussianWeights:{value:r}},vertexShader:`

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

				}`})}};Jr.BlurDirectionX=new bt(1,0);Jr.BlurDirectionY=new bt(0,1);var Y1={uniforms:{tDiffuse:{value:null},uTime:{value:0},uAmount:{value:.022},uVig:{value:.42},uRes:{value:new bt(2560,1440)}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:`
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
    }`},Qr=2,_f=Object.freeze({strength:.17,radius:.45,threshold:.9}),Ih=class{constructor(t,e,n,{width:s,height:r,samples:o}){this.target=new Ce(s,r,{type:We,samples:o}),this.composer=new Rh(t,this.target),this.composer.setPixelRatio(1),this.composer.setSize(s,r),this.composer.addPass(new Ph(e,n)),this.bloom=new Jr(new bt(Math.ceil(s/Qr),Math.ceil(r/Qr)),_f.strength,_f.radius,_f.threshold);let a=this.bloom.setSize.bind(this.bloom);this.bloom.setSize=(l,c)=>a(Math.ceil(l/Qr),Math.ceil(c/Qr)),this.composer.addPass(this.bloom),this.grain=new Kr(Y1),this.grain.uniforms.uRes.value.set(s,r),this.composer.addPass(this.grain)}setSize(t,e){this.composer.setSize(t,e),this.bloom.resolution.set(Math.ceil(t/Qr),Math.ceil(e/Qr)),this.grain.uniforms.uRes.value.set(t,e)}setCalm(t){this.grain.uniforms.uAmount.value=t?0:.022}render(t){this.grain.uniforms.uTime.value=Math.floor(t*24)%97*.37,this.composer.render()}dispose(){this.composer.dispose?.(),this.target.dispose();for(let t of this.composer.passes)t.dispose?.()}};var j1=Object.freeze(["off","zones","anywhere"]),On=Object.freeze({white:"#f2ecdc",yellow:"#eed46c",pink:"#eba0b8",blue:"#8fc0e0",green:"#97d09c",orange:"#eea060"}),F0=Object.freeze(Object.keys(On)),eo=Object.freeze([.82,.84]),jn=Object.freeze({width:300,depth:58,wall:22,stick:Object.freeze({radius:8,height:62,spacing:27,first:-122}),hit:Object.freeze({radius:13,height:96}),magic:Object.freeze({x:58,radius:9,height:70}),eraser:Object.freeze({x:112})}),O0=-10*Math.PI/180,K1=4+jn.hit.height-14,kh=8;function J1(i,t){let e=i.standing(t);if(!e)return null;let n=Math.cos(O0),s=Math.sin(O0),r=1/0,o=1/0,a=-1/0,l=-1/0;for(let c of[-jn.width/2,jn.width/2])for(let h of[0,K1])for(let d of[-jn.depth/2,jn.depth/2]){let u=i.screenOf(e.X+c*n+d*s,h,e.Z-c*s+d*n);r=Math.min(r,u.x),o=Math.min(o,u.y),a=Math.max(a,u.x),l=Math.max(l,u.y)}return{x0:r,y0:o,x1:a,y1:l}}function Q1(i,t){if(i.rect){let[e,n,s,r]=i.rect;return!(s<t.x0||e>t.x1||r<t.y0||n>t.y1)}if(i.circle){let[e,n,s]=i.circle,r=Math.max(t.x0,Math.min(e,t.x1)),o=Math.max(t.y0,Math.min(n,t.y1));return(r-e)**2+(o-n)**2<=s**2}return!1}function Ra(i,t,e=[],n=null){let s=J1(i,t);if(!s)return!1;let r={x0:s.x0-kh,y0:s.y0-kh,x1:s.x1+kh,y1:s.y1+kh};return n&&(r.x0<n.x0||r.x1>n.x1||r.y0<n.y0||r.y1>n.y1)?!1:!e.some(o=>Q1(o,r))}function B0(i,t,e=[],n=null,s=[]){if(Ra(i,t,e,n))return[t[0],t[1]];let r=[];for(let a=0;a<=30;a++)for(let l=-10;l<=10;l++)r.push([a/100,l/50]);r.sort((a,l)=>a[0]*1.2+Math.abs(a[1])-(l[0]*1.2+Math.abs(l[1])));let o=a=>{for(let[l,c]of r){let h=[Math.round((t[0]+c)*1e3)/1e3,Math.round((t[1]-l)*1e3)/1e3];if(!(h[0]<.03||h[0]>.97)&&Ra(i,h,a,n))return h}return null};return(s.length?o([...e,...s]):null)??o(e)??[t[0],t[1]]}var to=Object.freeze({height:1440,tile:240,maxWidth:4320});function Mf(i){let[t,e]=i?.size??[2,1],n=to.height,s=Math.min(to.maxWidth,Math.max(to.tile,Math.round(n*t/e)));return{w:s,h:n,tile:to.tile,cols:Math.ceil(s/to.tile),rows:Math.ceil(n/to.tile)}}var tw=(i,t)=>`c${i}r${t}`;function z0(i){let t=/^c(\d{1,3})r(\d{1,3})$/.exec(String(i));return t?{c:Number(t[1]),r:Number(t[2])}:null}function H0(i,t){let e=z0(t);return!!e&&e.c<i.cols&&e.r<i.rows}function De(i,t){let e=z0(t);if(!e)return null;let n=e.c*i.tile,s=e.r*i.tile;return{x:n,y:s,w:Math.min(i.tile,i.w-n),h:Math.min(i.tile,i.h-s)}}function Un(i,{x0:t,y0:e,x1:n,y1:s}){let r=Math.max(0,Math.floor(t/i.tile)),o=Math.max(0,Math.floor(e/i.tile)),a=Math.min(i.cols-1,Math.floor(n/i.tile)),l=Math.min(i.rows-1,Math.floor(s/i.tile)),c=[];for(let h=o;h<=l;h++)for(let d=r;d<=a;d++)c.push(tw(d,h));return c}var bf=(i,t,e)=>({x:t*i.w,y:e*i.h});var ew=8,Sf=(i,t="")=>`${String(Math.floor(i)).padStart(14,"0")}-${t}`;function G0(i){return[...i].sort((t,e)=>(t.since??0)-(e.since??0)||String(t.by).localeCompare(String(e.by)))}function V0(i,{by:t=null}={}){let e=null;for(let n of i)if(!(t&&n.by!==t))for(let[s,r]of Object.entries(n.history??{}))!r||typeof r!="object"||(!e||(r.at??0)>(e.step.at??0)||(r.at??0)===(e.step.at??0)&&s>e.id)&&(e={layer:n,id:s,step:r});return e}var nw=320*1024,W0=12,U0=i=>64+Object.values(i?.tiles??{}).reduce((t,e)=>t+(typeof e=="string"?e.length:0),0);function wf(i,{keep:t=ew,bytes:e=nw,before:n=null,protect:s=null}={}){let r=Object.entries(i??{}).filter(([,l])=>l&&typeof l=="object").sort(([l,c],[h,d])=>(c.at??0)-(d.at??0)||(l<h?-1:l>h?1:0)),o=[];if(n!==null){let l=r.filter(([c,h])=>c!==s&&(h.at??0)<n);o.push(...l.map(([c])=>c)),r=r.filter(c=>!l.includes(c))}let a=r.reduce((l,[,c])=>l+U0(c),0);for(;r.length>1&&(r.length>t||a>e);){let l=r.findIndex(([c],h)=>c!==s&&h<r.length-1);if(l<0)break;a-=U0(r[l][1]),o.push(r[l][0]),r.splice(l,1)}return o}function Lh(i,t=null){let e=t?.mode&&j1.includes(t.mode)?t.mode:i?.mode??"off",n=t?.locked===!0||t?.locked===void 0&&i?.lock===!0;return{mode:e,locked:n}}var vf=Object.freeze([null,"off","zones","anywhere"]),X0=i=>vf[(vf.indexOf(i??null)+1)%vf.length];function Tf(i,t,e,n){return i.locked||i.mode==="off"?!1:i.mode==="anywhere"?!0:t.some(s=>s.kind==="chalk"&&gi(s.shape,e,n))}function $0(i,t){return i.mode==="off"||i.locked?!1:i.mode==="anywhere"||t.some(e=>e.kind==="chalk")}function Z0(i,t){return i.mode!=="zones"?null:t.filter(e=>e.kind==="chalk").map(e=>e.shape)}var q0=10,Y0=2.5;function iw(i,t){let e=new ci(i,i,t,24,8),n=e.getAttribute("position"),s=new Float32Array(n.count*3),r=new Ct;for(let o=0;o<n.count;o++){let a=(Math.atan2(n.getZ(o),n.getX(o))/(Math.PI*2)+1)%1,l=n.getY(o)/t+.5;r.setHSL((a+l*.75)%1,.7,.68,Ae),s.set([r.r,r.g,r.b],o*3)}return e.setAttribute("color",new Be(s,3)),e}var Dh=class{constructor({scene:t,rig:e}){this.rig=e,this.group=new Ge,t.add(this.group),this.geometry=new ke(1,1),this.tiles=new Map,this.#t()}#t(){let t=document.createElement("canvas");t.width=t.height=4;let e=fn(t,{anisotropy:4}),n=new Re({map:e,transparent:!0,depthWrite:!1,color:15658734}),s=wa(this.rig,n,q0,{x0:0,y0:0,x1:.001,y1:.001},this.geometry);s.renderOrder=Y0,this.group.add(s),this.primer={mesh:s,texture:e,material:n}}update(t,e,n=!1){let s=t.grid,r=n?new Set([...e,...this.tiles.keys(),...t.composite.keys()]):e;for(let o of r){let a=t.composite.get(o)??null,l=this.tiles.get(o);if(l&&l.canvas===a){l.texture.needsUpdate=!0;continue}if(l&&this.#e(o),!a)continue;let c=De(s,o),h=fn(a,{anisotropy:4}),d=new Re({map:h,transparent:!0,depthWrite:!1,color:15658734}),u=wa(this.rig,d,q0,{x0:c.x/s.w,y0:c.y/s.h,x1:(c.x+c.w)/s.w,y1:(c.y+c.h)/s.h},this.geometry);u.renderOrder=Y0,this.group.add(u),this.tiles.set(o,{mesh:u,texture:h,material:d,canvas:a})}}#e(t){let e=this.tiles.get(t);e&&(this.group.remove(e.mesh),e.texture.dispose(),e.material.dispose(),this.tiles.delete(t))}setHidden(t){this.group.visible=!t}dispose(){for(let t of[...this.tiles.keys()])this.#e(t);this.primer?.texture.dispose(),this.primer?.material.dispose(),this.geometry.dispose(),this.group.removeFromParent()}};var Nh=class{constructor({scene:t,rig:e,at:n,tracker:s}){this.group=new Ge,this.sticks=[];let r=e.standing(n);if(!r){this.group.visible=!1,t.add(this.group),this.hidden=!0;return}this.group.position.set(r.X,0,r.Z),this.group.rotation.y=-10*as;let{width:o,depth:a,wall:l,stick:c,hit:h,magic:d,eraser:u}=jn,f=s.add(new en({color:8016432,roughness:.6})),x=s.add(new en({color:3810322,roughness:.8})),g=s.mesh(new Bt(new ln(o,8,a),x));g.position.y=4,this.group.add(g);for(let[R,P,k,B]of[[o,8,0,a/2-4],[o,8,0,-a/2+4],[8,a,o/2-4,0],[8,a,-o/2+4,0]]){let I=s.mesh(new Bt(new ln(R,l,P),f));I.position.set(k,l/2+4,B),I.castShadow=!0,this.group.add(I)}let p=s.add(new Re({visible:!1})),m=s.add(new ci(h.radius,h.radius,h.height,8)),v=(R,P)=>{let k=s.mesh(new Bt(m,p));k.position.set(R,4+h.height/2-14,0),Object.assign(k.userData,P),this.group.add(k),this.sticks.push(k)};Object.entries(On).forEach(([R,P],k)=>{let B=c.first+k*c.spacing,I=new Ct(P),F=s.add(new en({color:I,roughness:.95,emissive:I.clone().multiplyScalar(.18)})),V=s.mesh(new Bt(new ci(c.radius,c.radius,c.height,14),F));V.position.set(B,4+c.height/2-6,(k%2-.5)*6),V.rotation.z=(k%3-1)*.07,V.rotation.x=((k+1)%3-1)*.05,V.castShadow=!0,this.group.add(V),v(B,{chalk:R})});let E=s.add(new en({vertexColors:!0,roughness:.55,emissive:2763306})),M=s.mesh(new Bt(iw(d.radius,d.height),E));M.position.set(d.x,4+d.height/2-6,2),M.rotation.z=.06,M.castShadow=!0,this.group.add(M);let T=s.add(new en({color:16765802,roughness:.3,metalness:.6,emissive:16758832,emissiveIntensity:.55})),w=s.mesh(new Bt(new ia(d.radius*1.15,0),T));w.position.set(d.x-Math.sin(.06)*(d.height/2),4+d.height-2,2),w.scale.set(1,1.3,.55),this.group.add(w),v(d.x,{magic:!0});let C=s.add(new en({color:599e4,roughness:1})),_=s.mesh(new Bt(new ln(50,32,30),C));_.position.set(u.x,20,4),_.rotation.y=.12,_.castShadow=!0,this.group.add(_);let S=s.mesh(new Bt(s.add(new ln(58,60,50)),p));S.position.set(u.x,30,4),S.userData.eraser=!0,this.group.add(S),this.sticks.push(S),t.add(this.group)}setVisible(t){this.hidden||(this.group.visible=t)}get pickables(){return this.sticks}moveTo(t,e){if(this.hidden)return;let n=t.standing(e);n&&this.group.position.set(n.X,0,n.Z)}};var Me=Object.freeze({chalk:Object.freeze({kind:"paint",tip:"chalk",size:Object.freeze({min:2,max:48,initial:7}),spacing:.1,flow:.8,opacity:1,grain:.7,scatter:.05,jitter:Object.freeze({size:.12,angle:1}),pressure:Object.freeze({size:.5,flow:.4}),taper:0}),magic:Object.freeze({kind:"paint",tip:"chalk",magic:!0,size:Object.freeze({min:2,max:64,initial:10}),spacing:.09,flow:.85,opacity:1,grain:.45,scatter:.04,jitter:Object.freeze({size:.1,angle:1}),pressure:Object.freeze({size:.5,flow:.4}),taper:0}),pencil:Object.freeze({kind:"paint",tip:"pencil",size:Object.freeze({min:1,max:14,initial:2.5}),spacing:.12,flow:.9,opacity:1,grain:.2,scatter:0,jitter:Object.freeze({size:.04,angle:0}),pressure:Object.freeze({size:.45,flow:.55}),taper:1.5}),brush:Object.freeze({kind:"paint",tip:"soft",size:Object.freeze({min:3,max:140,initial:24}),spacing:.06,flow:.45,opacity:.88,grain:0,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.7,flow:.25}),taper:1}),spray:Object.freeze({kind:"spray",tip:"speck",size:Object.freeze({min:10,max:180,initial:48}),spacing:.05,flow:.55,opacity:1,grain:0,scatter:0,particles:34,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.25,flow:.6}),taper:0}),smudge:Object.freeze({kind:"smudge",tip:"soft",size:Object.freeze({min:6,max:140,initial:32}),spacing:.08,flow:.6,opacity:1,grain:0,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.35,flow:.5}),taper:0}),eraser:Object.freeze({kind:"erase",tip:"round",size:Object.freeze({min:3,max:180,initial:28}),spacing:.07,flow:1,opacity:1,grain:0,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.35,flow:0}),taper:0}),fill:Object.freeze({kind:"fill",tip:null,size:Object.freeze({min:0,max:0,initial:0}),spacing:1,flow:1,opacity:.95,grain:.3,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:0,flow:0}),taper:0})}),Fh=Object.freeze(Object.keys(Me)),Oh=Object.freeze({chalk:.62,pencil:.82,round:.78});function j0(i,t,e=.5){if(t>=1)return 0;let n=(s,r,o)=>{let a=Math.max(0,Math.min(1,(o-s)/(r-s)));return a*a*(3-2*a)};if(i==="chalk"){let s=Oh.chalk;if(t<=s)return .96;let r=(t-s)/(1-s),o=.96*(1-n(0,1,r));return e<r*.85?o*.2:o}if(i==="pencil"){let s=Oh.pencil;return(t<=s?.95:.95*(1-n(s,1,t)))*(.88+.12*e)}return i==="round"?t<=Oh.round?1:1-n(Oh.round,1,t):i==="speck"?Math.exp(-6*t*t):Math.exp(-3.2*t*t)*(1-n(.85,1,t))}var io=Object.freeze([0,5,12,26]);function so(i){let t=i>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function Af(i){let t=2166136261;for(let e=0;e<i.length;e++)t^=i.charCodeAt(e),t=Math.imul(t,16777619);return t>>>0}var Ef=class{constructor(t=0){this.r=Math.max(0,t),this.at=null,this.pointer=null}push({x:t,y:e,p:n=.5}){if(this.pointer={x:t,y:e,p:n},!this.at)return this.at={x:t,y:e,p:n},[{...this.at}];let s=t-this.at.x,r=e-this.at.y,o=Math.hypot(s,r);if(o<=this.r)return this.at.p+=(n-this.at.p)*.35,[];let a=this.r?(o-this.r)/o:1;return this.at={x:this.at.x+s*a,y:this.at.y+r*a,p:n},[{...this.at}]}finish(){if(!this.pointer||!this.at)return[];let t=this.pointer.x-this.at.x,e=this.pointer.y-this.at.y,n=Math.hypot(t,e);if(n<.5)return[];let s=Math.max(1,Math.ceil(n/Math.max(2,this.r/2))),r=[];for(let o=1;o<=s;o++)r.push({x:this.at.x+t*o/s,y:this.at.y+e*o/s,p:this.pointer.p});return this.at={...this.pointer},r}},Uh=class{constructor(){this.last=null,this.p=.75}pressure({x:t,y:e,t:n,pressure:s=.5,pointerType:r="mouse"}){if(r==="pen"&&s>0)return this.last={x:t,y:e,t:n},Math.max(.08,Math.min(1,s));if(!this.last)return this.last={x:t,y:e,t:n},this.p;let o=Math.max(1,n-this.last.t),a=Math.hypot(t-this.last.x,e-this.last.y)/o;this.last={x:t,y:e,t:n};let l=Math.max(.45,Math.min(1,1.05-a*.22));return this.p+=(l-this.p)*.25,this.p}};function sw(i,t,e,n,s){let r=Math.max(1e-4,Math.hypot(t.x-i.x,t.y-i.y)**.5),o=Math.max(1e-4,Math.hypot(e.x-t.x,e.y-t.y)**.5),a=Math.max(1e-4,Math.hypot(n.x-e.x,n.y-e.y)**.5),l=d=>e[d]-t[d]+o*((t[d]-i[d])/r-(e[d]-i[d])/(r+o)),c=d=>e[d]-t[d]+o*((n[d]-e[d])/a-(n[d]-t[d])/(o+a)),h=d=>{let u=2*t[d]-2*e[d]+l(d)+c(d),f=-3*t[d]+3*e[d]-2*l(d)-c(d);return((u*s+f)*s+l(d))*s+t[d]};return{x:h("x"),y:h("y"),p:t.p+(e.p-t.p)*s}}var no=class{constructor({tool:t="chalk",size:e=null,flow:n=1,steady:s=0,seed:r=1}={}){this.def=Me[t]??Me.chalk,this.tool=t,this.size=Math.max(this.def.size.min,Math.min(this.def.size.max,e??this.def.size.initial)),this.flowScale=Math.max(0,Math.min(1,n)),this.steady=new Ef(s),this.seed=r>>>0,this.points=[],this.prev=null,this.carry=0,this.dist=0,this.count=0,this.dabs=0}add(t){let e=[];for(let n of this.steady.push(t))this.#t(n,e);return e}finish(){let t=[];for(let n of this.steady.finish())this.#t(n,t);let e=this.points;if(e.length>=2){let n=e.length;this.#e(e[n-3]??e[n-2],e[n-2],e[n-1],e[n-1],t)}else e.length===1&&this.count===0&&this.#s(e[0],0,t);return t}#t(t,e){let n=this.points[this.points.length-1];if(n&&Math.hypot(t.x-n.x,t.y-n.y)<.35){n.p=t.p;return}this.points.push(t),this.points.length>4&&this.points.shift();let s=this.points,r=s.length;if(r===1){this.prev={...t},this.#s(t,0,e);return}r>=3&&this.#e(s[r-4]??s[r-3],s[r-3],s[r-2],s[r-1],e)}#e(t,e,n,s,r){let o=Math.hypot(n.x-e.x,n.y-e.y),a=Math.max(1,Math.ceil(o/.75)),l=this.prev??e;for(let c=1;c<=a;c++){let h=sw(t,e,n,s,c/a),d=Math.hypot(h.x-l.x,h.y-l.y);this.carry+=d,this.dist+=d;let u=this.#i(h.p);for(;this.carry>=u;){this.carry-=u;let f=this.carry,x=d>0?Math.max(0,Math.min(1,1-f/d)):1,g={x:l.x+(h.x-l.x)*x,y:l.y+(h.y-l.y)*x,p:h.p};this.#s(g,Math.atan2(h.y-l.y,h.x-l.x),r)}l=h}this.prev=l}#n(t){let e=this.def.pressure;return{size:1-e.size+e.size*t,flow:1-e.flow+e.flow*t}}#i(t){return Math.max(.4,this.def.spacing*this.size*this.#n(t).size)}#s(t,e,n){let s=so(this.seed+this.count*7919);this.count++;let r=this.def,o=this.#n(t.p),a=r.taper>0?Math.min(1,.35+.65*this.dist/(r.taper*this.size)):1,l=Math.max(.6,this.size*o.size*a*(1+r.jitter.size*(s()*2-1))),c=r.scatter*this.size,h=r.jitter.angle?s()*Math.PI*2:e;n.push({x:t.x+(s()*2-1)*c,y:t.y+(s()*2-1)*c,size:l,flow:Math.max(0,Math.min(1,r.flow*this.flowScale*o.flow)),angle:h,seed:(this.seed^Math.imul(this.count,2654435761))>>>0,dist:this.dist})}};function K0(i,t,e={}){let n=new no({...e,steady:0}),s=Math.max(2,Math.ceil(Math.hypot(t.x-i.x,t.y-i.y)/3)),r=[];for(let o=0;o<=s;o++)r.push(...n.add({x:i.x+(t.x-i.x)*o/s,y:i.y+(t.y-i.y)*o/s,p:i.p??.75}));return r.push(...n.finish()),r}function Pa(i){let t=1/0,e=1/0,n=-1/0,s=-1/0;for(let r of i){let o=r.size/2+2;t=Math.min(t,r.x-o),e=Math.min(e,r.y-o),n=Math.max(n,r.x+o),s=Math.max(s,r.y+o)}return Number.isFinite(t)?{x0:t,y0:e,x1:n,y1:s}:null}function cs(i){let t=parseInt(String(i).replace("#",""),16),e=(t>>16&255)/255,n=(t>>8&255)/255,s=(t&255)/255,r=Math.max(e,n,s),o=r-Math.min(e,n,s),a=0;return o&&(a=r===e?(n-s)/o%6:r===n?(s-e)/o+2:(e-n)/o+4),{h:(a*60+360)%360,s:r?o/r:0,v:r}}function Ia({h:i,s:t,v:e}){let n=r=>{let o=(r+i/60)%6;return e-e*t*Math.max(0,Math.min(o,4-o,1))},s=r=>Math.round(Math.max(0,Math.min(1,r))*255).toString(16).padStart(2,"0");return`#${s(n(5))}${s(n(3))}${s(n(1))}`}function J0(i,t,{every:e=900}={}){let n=cs(i);return Ia({h:(n.h+t/e*360)%360,s:Math.max(.55,n.s),v:Math.max(.85,n.v)})}function Fs(i){let t=/^#?([0-9a-f]{6})$/i.exec(String(i??"").trim());return t?`#${t[1].toLowerCase()}`:null}var Mn=96,ro=256,Q0=4,rw=48,ow=.3,tx=15,aw=320,lw=4,me=(i,t)=>{let e=document.createElement("canvas");return e.width=Math.max(1,Math.round(i)),e.height=Math.max(1,Math.round(t)),e},ee=i=>i.getContext("2d",globalThis.__chalkSoftware?{willReadFrequently:!0}:void 0);function ex(i,t,e){if(!i)return{x:0,y:0,w:t,h:e};let n=Math.max(0,Math.floor(i.x0)),s=Math.max(0,Math.floor(i.y0)),r=Math.min(t,Math.ceil(i.x1)),o=Math.min(e,Math.ceil(i.y1));return{x:n,y:s,w:Math.max(0,r-n),h:Math.max(0,o-s)}}var nx=(i,t)=>!i||!t?null:{x0:Math.min(i.x0,t.x0),y0:Math.min(i.y0,t.y0),x1:Math.max(i.x1,t.x1),y1:Math.max(i.y1,t.y1)};function zh(i,t,e,n=!1){let s=t+1,r=new Float32Array(s*s);for(let l=0;l<r.length;l++)r[l]=e();if(n)for(let l=0;l<s;l++)r[l*s+t]=r[l*s],r[t*s+l]=r[l];let o=new Float32Array(i*i),a=l=>l*l*(3-2*l);for(let l=0;l<i;l++){let c=l/i*t,h=Math.floor(c),d=a(c-h);for(let u=0;u<i;u++){let f=u/i*t,x=Math.floor(f),g=a(f-x),p=r[h*s+x],m=r[h*s+x+1],v=r[(h+1)*s+x],E=r[(h+1)*s+x+1];o[l*i+u]=p+(m-p)*g+(v-p)*d+(p-m-v+E)*g*d}}return o}var Cf=class{constructor(){this.shapes=new Map,this.tinted=new Map}shape(t,e=0){let n=`${t}:${e}`,s=this.shapes.get(n);if(s)return s;s=me(Mn,Mn);let r=ee(s),o=r.createImageData(Mn,Mn),a=so(9001+e*131+t.charCodeAt(0)),l=zh(Mn,7,a),c=zh(Mn,30,a),h=Mn/2;for(let d=0;d<Mn;d++)for(let u=0;u<Mn;u++){let f=d*Mn+u,x=j0(t,Math.hypot(u+.5-h,d+.5-h)/h,l[f]*.7+c[f]*.3),g=f*4;o.data[g]=o.data[g+1]=o.data[g+2]=255,o.data[g+3]=Math.round(x*255)}return r.putImageData(o,0,0),this.shapes.set(n,s),s}coloured(t,e,n){let s=`${t}:${e}:${n}`,r=this.tinted.get(s);if(r)return r;this.tinted.size>aw&&this.tinted.delete(this.tinted.keys().next().value),r=me(Mn,Mn);let o=ee(r);return o.drawImage(this.shape(t,e),0,0),o.globalCompositeOperation="source-in",o.fillStyle=n,o.fillRect(0,0,Mn,Mn),this.tinted.set(s,r),r}},Rf=class{constructor(){this.noise=null,this.by=new Map,this.patterns=new Map}canvas(t){let e=Math.round(Math.max(0,Math.min(1,t))*20)/20,n=this.by.get(e);if(n)return n;if(!this.noise){let o=so(77),a=zh(ro,16,o,!0),l=zh(ro,64,o,!0);this.noise=a.map((c,h)=>Math.max(0,Math.min(1,c*.45+l[h]*.55+(o()-.5)*.25)))}n=me(ro,ro);let s=ee(n),r=s.createImageData(ro,ro);for(let o=0;o<this.noise.length;o++){let a=o*4;r.data[a]=r.data[a+1]=r.data[a+2]=255,r.data[a+3]=Math.round((1-e*this.noise[o]**1.4)*255)}return s.putImageData(r,0,0),this.by.set(e,n),n}pattern(t,e,n,s){let r=`${e}|${n}|${s}`,o=this.patterns.get(r);return o||(o=t.createPattern(this.canvas(e),"repeat"),o?.setTransform?.(new DOMMatrix().translate(-n,-s)),o&&this.patterns.set(r,o),o)}},Hh=class{constructor({grid:t,onChange:e=()=>{}}){this.grid=t,this.onChange=e,this.layers=new Map,this.order=[],this.composite=new Map,this.strokes=new Map,this.tips=new Cf,this.grain=new Rf,this.mask=null,this.maskTiles=new Map,this.dirty=new Map,this.loads=new Map,this.scratch=null,this.pending=!1}warmUp(){let t=[];for(let s=0;s<Q0;s++)t.push(()=>this.tips.shape("chalk",s));for(let s of["pencil","round","soft","speck"])t.push(()=>this.tips.shape(s,0));for(let s of Object.values(Me))s.grain>0&&t.push(()=>this.grain.canvas(s.grain));let e=globalThis.requestIdleCallback??(s=>setTimeout(s,30)),n=()=>{let s=t.shift();if(s){try{s()}catch{}e(n)}};e(n)}#t(t,e=null){let n=this.dirty.get(t);this.dirty.set(t,n===void 0?e:nx(n,e)),this.#e()}#e(){if(this.pending)return;this.pending=!0,(globalThis.requestAnimationFrame??(e=>setTimeout(e,16)))(()=>this.flush())}flush(){if(this.pending=!1,!this.dirty.size)return;let t=[...this.dirty];this.dirty.clear();for(let[e,n]of t)this.#g(e,n);this.onChange(new Set(t.map(([e])=>e)))}setLayers(t){let e=new Set(t.map(s=>s.by));for(let s of this.strokes.values())e.add(s.by);for(let[s,r]of this.layers)if(!e.has(s)){for(let o of r.tiles.keys())this.#t(o);this.layers.delete(s)}for(let s of t){let r=this.layers.get(s.by);if(r){Number.isFinite(s.since)&&s.since!==r.since&&(r.since=s.since,this.#n(r));continue}this.layers.set(s.by,{by:s.by,since:s.since??Date.now(),tiles:new Map,sources:new Map})}let n=this.order.join("|");if(this.order=G0([...this.layers.values()]).map(s=>s.by),n!==this.order.join("|"))for(let s of this.layers.values())this.#n(s)}ensureLayer(t,e=Date.now()){return this.layers.has(t)||this.setLayers([...[...this.layers.values()].map(n=>({by:n.by,since:n.since})),{by:t,since:e}]),this.layers.get(t)}#n(t){for(let e of t.tiles.keys())this.#t(e)}sourceOf(t,e){return this.layers.get(t)?.sources.get(e)??null}noteSource(t,e,n){let s=this.layers.get(t);s&&(s.sources.set(e,n??null),n||(s.tiles.delete(e),this.#t(e)))}liveStrokes(){return[...this.strokes.values()].filter(t=>t.live)}async setTile(t,e,n){if((this.ensureLayer(t).sources.get(e)??null)===(n??null))return!1;let r=`${t}|${e}`;this.loads.set(r,n??null);let o=null;if(n){o=new Image,o.src=n;try{await o.decode()}catch{return!1}}if(this.loads.get(r)!==(n??null))return!1;this.loads.delete(r);let a=this.layers.get(t);if(!a)return!1;if(a.sources.set(e,n??null),!n)a.tiles.delete(e);else{let l=De(this.grid,e),c=a.tiles.get(e);c||(c=me(l.w,l.h),a.tiles.set(e,c));let h=ee(c);h.clearRect(0,0,c.width,c.height),h.drawImage(o,0,0)}return this.#t(e),!0}async revert(t,e){let n=this.layers.get(t);n&&await Promise.all([...e].map(async s=>{let r=n.sources.get(s)??null;n.sources.delete(s),n.tiles.delete(s),this.#t(s),r&&await this.setTile(t,s,r)}))}setMask(t){let e=t?.length?t.map(n=>n.map(([s,r])=>[s*this.grid.w,r*this.grid.h])):null;JSON.stringify(e)!==JSON.stringify(this.mask)&&(this.mask=e,this.maskTiles.clear(),this.maskBoxes=e?.map(n=>{let s=n.map(o=>o[0]),r=n.map(o=>o[1]);return{poly:n,x0:Math.min(...s),y0:Math.min(...r),x1:Math.max(...s),y1:Math.max(...r)}})??null)}#i(t,e,n){if(!this.maskBoxes)return!0;for(let s of this.maskBoxes){if(t+n<s.x0||t-n>s.x1||e+n<s.y0||e-n>s.y1)continue;let r=s.poly,o=!1;for(let a=0,l=r.length-1;a<r.length;l=a++){let[c,h]=r[a],[d,u]=r[l];h>e!=u>e&&t<(d-c)*(e-h)/(u-h)+c&&(o=!o);let f=d-c,x=u-h,g=Math.max(0,Math.min(1,((t-c)*f+(e-h)*x)/(f*f+x*x||1)));if(Math.hypot(c+g*f-t,h+g*x-e)<=n)return!0}if(o)return!0}return!1}#s(t){if(!this.mask)return null;let e=this.maskTiles.get(t);if(e)return e;let n=De(this.grid,t);e=me(n.w,n.h);let s=ee(e);s.fillStyle="#fff",s.translate(-n.x,-n.y);for(let r of this.mask)s.beginPath(),r.forEach(([o,a],l)=>l?s.lineTo(o,a):s.moveTo(o,a)),s.closePath(),s.fill();return this.maskTiles.set(t,e),e}begin({id:t,by:e,tool:n="chalk",colour:s="#f2ecdc",opacity:r=null,magic:o=null,everyone:a=!1,live:l=!1}){let c=Me[n]??Me.chalk;this.ensureLayer(e);let h={id:t,by:e,tool:n,def:c,colour:s,magic:c.magic?{rainbow:!1,glow:!1,sparkle:!1,...o??{}}:null,opacity:r??c.opacity,everyone:c.kind==="erase"&&a,live:l,buffer:new Map,processed:new Map,stale:new Map,touched:new Set,dabs:[],carried:null};return this.strokes.set(t,h),h}paint(t,e){let n=this.strokes.get(t);if(!(!n||!e.length))for(let s of e)n.dabs.push(s),n.def.kind==="smudge"?this.#h(n,s):this.#c(n,s)}#r(t,e,n){let s=t.buffer.get(e);return s||(s=me(n.w,n.h),t.buffer.set(e,s)),s}#o(t,e,n){t.touched.add(e);let s=t.stale.get(e);t.stale.set(e,s===void 0?n:nx(s,n)),this.#t(e,n)}#c(t,e){let n=e.size/2;if(t.def.kind!=="erase"&&!this.#i(e.x,e.y,n+1))return;let s=Un(this.grid,{x0:e.x-n-2,y0:e.y-n-2,x1:e.x+n+2,y1:e.y+n+2}),r=t.def.kind==="erase"?"#ffffff":t.magic?.rainbow?J0(t.colour,Math.round(e.dist/tx)*tx):t.colour;if(t.def.kind==="spray"){let d=so(e.seed),u=Math.max(1,Math.round((t.def.particles??30)*e.flow)),f=[];for(let g=0;g<u;g++){let p=d()*Math.PI*2,m=n*Math.pow(d(),.75);f.push({x:e.x+Math.cos(p)*m,y:e.y+Math.sin(p)*m,size:1.2+d()*2.4,alpha:.3+d()*.6})}let x=this.tips.coloured("speck",0,r);for(let g of s){let p=De(this.grid,g),m=ee(this.#r(t,g,p));for(let v of f)v.x<p.x-4||v.y<p.y-4||v.x>p.x+p.w+4||v.y>p.y+p.h+4||(m.globalAlpha=v.alpha,m.drawImage(x,v.x-p.x-v.size/2,v.y-p.y-v.size/2,v.size,v.size));m.globalAlpha=1,this.#o(t,g,{x0:e.x-n-4-p.x,y0:e.y-n-4-p.y,x1:e.x+n+4-p.x,y1:e.y+n+4-p.y})}return}let o=t.def.tip??"round",a=o==="chalk"?e.seed%Q0:0,l=this.tips.coloured(o,a,r),c=e.angle?Math.cos(e.angle):1,h=e.angle?Math.sin(e.angle):0;for(let d of s){let u=De(this.grid,d),f=ee(this.#r(t,d,u)),x=e.x-u.x,g=e.y-u.y;f.setTransform(c,h,-h,c,x,g),f.globalAlpha=e.flow,f.drawImage(l,-n,-n,n*2,n*2),f.setTransform(1,0,0,1,0,0),f.globalAlpha=1,this.#o(t,d,{x0:x-n-2,y0:g-n-2,x1:x+n+2,y1:g+n+2})}}#a(t,e){let n=t.buffer.get(e);if(!n)return null;let s=t.processed.get(e),r=t.stale.get(e);if(s&&r===void 0)return s;let o=De(this.grid,e),a=r??null;s||(s=me(o.w,o.h),t.processed.set(e,s),a=null),t.stale.delete(e);let l=ex(a,o.w,o.h);if(!l.w||!l.h)return s;let c=ee(s);if(c.save(),c.beginPath(),c.rect(l.x,l.y,l.w,l.h),c.clip(),c.clearRect(l.x,l.y,l.w,l.h),c.drawImage(n,0,0),t.def.grain>0&&t.def.kind!=="erase"){let d=this.grain.pattern(c,Math.round(Math.max(0,Math.min(1,t.def.grain))*20)/20,o.x,o.y);d&&(c.globalCompositeOperation="destination-in",c.fillStyle=d,c.fillRect(l.x,l.y,l.w,l.h))}let h=t.def.kind==="erase"?null:this.#s(e);return h&&(c.globalCompositeOperation="destination-in",c.drawImage(h,0,0)),c.restore(),s}#h(t,e){let n=Math.max(4,Math.ceil(e.size)),s=Math.round(e.x-n/2),r=Math.round(e.y-n/2);t.here?.width!==n&&(t.here=me(n,n),t.put=me(n,n));let o=this.#u(t.here,s,r);if(!t.carried){t.carried=me(n,n),ee(t.carried).drawImage(o,0,0);return}if(t.carried.width!==n){let d=me(n,n);ee(d).drawImage(t.carried,0,0,n,n),t.carried=d}let a=t.put,l=ee(a);l.globalCompositeOperation="copy",l.drawImage(t.carried,0,0),l.globalCompositeOperation="destination-in",l.drawImage(this.tips.shape("soft",0),0,0,n,n),l.globalCompositeOperation="source-over";let c=this.layers.get(t.by);for(let d of Un(this.grid,{x0:s,y0:r,x1:s+n,y1:r+n})){let u=De(this.grid,d),f=c.tiles.get(d);f||(f=me(u.w,u.h),c.tiles.set(d,f));let x=ee(f);x.globalAlpha=Math.max(.05,Math.min(1,t.def.flow*e.flow*1.4)),x.drawImage(a,s-u.x,r-u.y),x.globalAlpha=1,t.touched.add(d),this.#t(d,{x0:s-u.x-1,y0:r-u.y-1,x1:s-u.x+n+1,y1:r-u.y+n+1})}let h=ee(t.carried);h.globalAlpha=.28,h.drawImage(o,0,0),h.globalAlpha=1}#l(t,e,n,s){return Un(this.grid,{x0:t,y0:e,x1:t+n,y1:e+s}).some(o=>this.dirty.has(o))&&this.flush(),this.#u(me(n,s),t,e)}#u(t,e,n){let s=ee(t);s.clearRect(0,0,t.width,t.height);for(let r of Un(this.grid,{x0:e,y0:n,x1:e+t.width,y1:n+t.height})){let o=this.composite.get(r);if(!o)continue;let a=De(this.grid,r);s.drawImage(o,a.x-e,a.y-n)}return t}commit(t){let e=this.strokes.get(t);if(!e)return new Map;this.strokes.delete(t);let n=new Map,s=(r,o,a)=>{n.has(r)||n.set(r,new Map),n.get(r).set(o,a)};if(e.def.kind==="smudge"){let r=this.layers.get(e.by);for(let o of e.touched)s(e.by,o,r?.tiles.get(o)??null)}else if(e.def.kind==="erase"){let r=e.everyone?[...this.layers.values()]:[this.layers.get(e.by)].filter(Boolean);for(let o of e.touched){let a=this.#a(e,o);for(let l of r){let c=l.tiles.get(o);if(!c||!a)continue;let h=ee(c);h.globalCompositeOperation="destination-out",h.globalAlpha=e.opacity,h.drawImage(a,0,0),h.globalCompositeOperation="source-over",h.globalAlpha=1,s(l.by,o,c)}}}else{let r=this.layers.get(e.by),o=new Set(e.touched);if(e.magic?.glow)for(let a of this.#d(e,r))o.add(a);for(let a of e.touched){let l=this.#a(e,a);if(!l)continue;let c=De(this.grid,a),h=r.tiles.get(a);h||(h=me(c.w,c.h),r.tiles.set(a,h));let d=ee(h);d.globalAlpha=e.opacity,d.drawImage(l,0,0),d.globalAlpha=1}if(e.magic?.sparkle)for(let a of this.#f(e,r))o.add(a);for(let a of o)s(e.by,a,r.tiles.get(a)??null);n.painted=!0}for(let r of e.touched)this.#t(r);for(let r of n.values())for(let o of r.keys())this.#t(o);return n}drop(t){let e=this.strokes.get(t);if(e){this.strokes.delete(t);for(let n of e.touched)this.#t(n)}}#d(t,e){let n=Pa(t.dabs);if(!n)return[];let s=Math.max(6,Math.min(40,(t.dabs[0]?.size??8)*1.6)),r=Math.floor(n.x0-s*2),o=Math.floor(n.y0-s*2),a=Math.ceil(n.x1-n.x0+s*4),l=Math.ceil(n.y1-n.y0+s*4),c=lw,h=Math.max(1,Math.ceil(a/c)),d=Math.max(1,Math.ceil(l/c)),u=me(h,d),f=ee(u);f.imageSmoothingQuality="medium";for(let m of t.touched){let v=this.#a(t,m);if(!v)continue;let E=De(this.grid,m);f.drawImage(v,(E.x-r)/c,(E.y-o)/c,E.w/c,E.h/c)}let x=me(h,d),g=ee(x);g.filter=`blur(${s/c}px)`,g.drawImage(u,0,0),g.filter="none";let p=Un(this.grid,{x0:r,y0:o,x1:r+a,y1:o+l});for(let m of p){let v=De(this.grid,m),E=e.tiles.get(m);E||(E=me(v.w,v.h),e.tiles.set(m,E));let M=ee(E);M.globalAlpha=.85,M.imageSmoothingQuality="medium",M.drawImage(x,r-v.x,o-v.y,h*c,d*c),M.globalAlpha=1}return p}#f(t,e){let n=so(t.dabs[0]?.seed??5),s=new Set,r=20+n()*40;for(let o of t.dabs){if(o.dist<r)continue;r=o.dist+45+n()*70;let a=Math.max(6,o.size*(1.2+n()*1.2)),l=o.x+(n()-.5)*o.size*1.5,c=o.y+(n()-.5)*o.size*1.5,h=n()*.6;for(let d of Un(this.grid,{x0:l-a,y0:c-a,x1:l+a,y1:c+a})){let u=De(this.grid,d),f=e.tiles.get(d);f||(f=me(u.w,u.h),e.tiles.set(d,f));let x=ee(f);x.save(),x.translate(l-u.x,c-u.y),x.rotate(h),x.fillStyle="rgba(255,252,240,0.95)",x.beginPath();for(let g=0;g<8;g++){let p=g/8*Math.PI*2,m=g%2?a*.16:a;x.lineTo(Math.cos(p)*m,Math.sin(p)*m)}x.closePath(),x.fill(),x.restore(),s.add(d)}}return s}fill({x:t,y:e,by:n,colour:s,opacity:r=Me.fill.opacity,grain:o=Me.fill.grain}){let{w:a,h:l}=this.grid,c=Math.floor(t),h=Math.floor(e);if(c<0||h<0||c>=a||h>=l)return{ok:!1,reason:"outside",changed:new Map};this.flush();let d=this.#l(0,0,a,l),u=ee(d).getImageData(0,0,a,l).data,f=at=>u[at*4+3]>=rw;if(f(h*a+c))return{ok:!1,reason:"on-paint",changed:new Map};let x=new Uint8Array(a*l),g=[[c,h]],p=0,m=c,v=c,E=h,M=h,T=a*l*ow;for(;g.length;){let[at,rt]=g.pop(),zt=at;for(;zt>0&&!f(rt*a+zt-1)&&!x[rt*a+zt-1];)zt--;let kt=at;for(;kt<a-1&&!f(rt*a+kt+1)&&!x[rt*a+kt+1];)kt++;for(let Lt=zt;Lt<=kt;Lt++){let X=rt*a+Lt;x[X]||f(X)||(x[X]=1,p++)}if(p>T)return{ok:!1,reason:"open",changed:new Map};m=Math.min(m,zt),v=Math.max(v,kt),E=Math.min(E,rt),M=Math.max(M,rt);for(let Lt of[rt-1,rt+1]){if(Lt<0||Lt>=l)continue;let X=!1;for(let Q=zt;Q<=kt;Q++){let yt=Lt*a+Q,Ft=!x[yt]&&!f(yt);Ft&&!X?(g.push([Q,Lt]),X=!0):Ft||(X=!1)}}}let w=2;m=Math.max(0,m-w),E=Math.max(0,E-w),v=Math.min(a-1,v+w),M=Math.min(l-1,M+w);let C=v-m+1,_=M-E+1,S=new Uint8Array(C*_);for(let at=0;at<_;at++){let rt=(E+at)*a;for(let zt=0;zt<C;zt++){let kt=m+zt;for(let Lt=-w;Lt<=w;Lt++){let X=kt+Lt;if(X>=0&&X<a&&x[rt+X]){S[at*C+zt]=1;break}}}}let R=parseInt(s.slice(1),16),[P,k,B]=[R>>16&255,R>>8&255,R&255],I=me(C,_),F=ee(I),V=F.createImageData(C,_),Z=Math.round(255*r);for(let at=0;at<_;at++)for(let rt=0;rt<C;rt++){let zt=0;for(let Lt=-w;Lt<=w;Lt++){let X=at+Lt;if(X>=0&&X<_&&S[X*C+rt]){zt=1;break}}if(!zt)continue;let kt=(at*C+rt)*4;V.data[kt]=P,V.data[kt+1]=k,V.data[kt+2]=B,V.data[kt+3]=Z}if(F.putImageData(V,0,0),o>0){let at=this.grain.pattern(F,Math.round(Math.max(0,Math.min(1,o))*20)/20,m,E);at&&(F.globalCompositeOperation="destination-in",F.fillStyle=at,F.fillRect(0,0,C,_),F.globalCompositeOperation="source-over")}let nt=this.ensureLayer(n),$=new Map,K=me(this.grid.tile,this.grid.tile),et=ee(K);for(let at of Un(this.grid,{x0:m,y0:E,x1:v,y1:M})){let rt=De(this.grid,at);et.clearRect(0,0,K.width,K.height),et.drawImage(I,m-rt.x,E-rt.y);let zt=this.#s(at);zt&&(et.globalCompositeOperation="destination-in",et.drawImage(zt,0,0),et.globalCompositeOperation="source-over");let kt=nt.tiles.get(at);kt||(kt=me(rt.w,rt.h),nt.tiles.set(at,kt));let Lt=ee(kt);Lt.globalCompositeOperation="destination-over",Lt.drawImage(K,0,0,rt.w,rt.h,0,0,rt.w,rt.h),Lt.globalCompositeOperation="source-over",$.set(at,kt),this.#t(at)}return{ok:!0,changed:$,area:p}}pick(t,e){this.flush();let n=Un(this.grid,{x0:t,y0:e,x1:t,y1:e})[0],s=n?this.composite.get(n):null;if(!s)return null;let r=De(this.grid,n),o=ee(s).getImageData(Math.floor(t-r.x),Math.floor(e-r.y),1,1).data;return o[3]<60?null:`#${[o[0],o[1],o[2]].map(a=>a.toString(16).padStart(2,"0")).join("")}`}whoAt(t,e){this.flush();let n=Un(this.grid,{x0:t,y0:e,x1:t,y1:e})[0];if(!n)return null;let s=De(this.grid,n);for(let r of[...this.order].reverse()){let o=this.layers.get(r)?.tiles.get(n);if(!o)continue;if(ee(o).getImageData(Math.floor(t-s.x),Math.floor(e-s.y),1,1).data[3]>=60)return r}return null}#m(){return this.scratch??=me(this.grid.tile,this.grid.tile),this.scratch}#g(t,e=null){let n=De(this.grid,t),s=[...this.strokes.values()].filter(l=>l.touched.has(t));if(!s.length&&!this.order.some(l=>this.layers.get(l)?.tiles.has(t))){this.composite.delete(t);return}let r=this.composite.get(t);r||(r=me(n.w,n.h),this.composite.set(t,r),e=null);let o=ex(e,n.w,n.h);if(!o.w||!o.h)return;let a=ee(r);a.save(),a.beginPath(),a.rect(o.x,o.y,o.w,o.h),a.clip(),a.clearRect(o.x,o.y,o.w,o.h);for(let l of this.order){let h=this.layers.get(l).tiles.get(t),d=s.filter(u=>u.def.kind==="erase"&&(u.by===l||u.everyone));if(h)if(d.length){let u=this.#m(),f=ee(u);f.save(),f.beginPath(),f.rect(o.x,o.y,o.w,o.h),f.clip(),f.clearRect(o.x,o.y,o.w,o.h),f.drawImage(h,0,0),f.globalCompositeOperation="destination-out";for(let x of d){let g=this.#a(x,t);g&&(f.globalAlpha=x.opacity,f.drawImage(g,0,0))}f.restore(),a.drawImage(u,o.x,o.y,o.w,o.h,o.x,o.y,o.w,o.h)}else a.drawImage(h,0,0);for(let u of s){if(u.by!==l||u.def.kind==="erase"||u.def.kind==="smudge")continue;let f=this.#a(u,t);f&&(a.globalAlpha=u.opacity*(u.live?.9:1),a.drawImage(f,0,0),a.globalAlpha=1)}}a.restore()}keys(){return this.flush(),[...this.composite.keys()]}clear(){let t=new Set([...this.composite.keys()]);this.layers.clear(),this.order=[],this.composite.clear(),this.strokes.clear(),this.dirty.clear(),this.onChange(t)}},ix=new WeakMap;function Gh(i,t,e){if(!i||!(t>=0&&t<=1&&e>=0&&e<=1))return null;let n=ix.get(i);if(!n){let s=i.naturalWidth||i.width,r=i.naturalHeight||i.height;if(!s||!r)return null;let o=Math.min(1024,s),a=Math.max(1,Math.round(o*r/s)),l=me(o,a),c=ee(l);c.drawImage(i,0,0,o,a),n={x:c,w:o,h:a},ix.set(i,n)}try{let s=n.x.getImageData(Math.min(n.w-1,Math.floor(t*n.w)),Math.min(n.h-1,Math.floor(e*n.h)),1,1).data;return`#${[s[0],s[1],s[2]].map(r=>r.toString(16).padStart(2,"0")).join("")}`}catch{return null}}function cw(i){let t=ee(i).getImageData(0,0,i.width,i.height).data;for(let e=3;e<t.length;e+=4)if(t[e]>3)return!0;return!1}var Pf=.85,rx=64;function ox(i,t=64){let e=255/(t-1);for(let n=3;n<i.length;n+=4)i[n]=Math.round(Math.round(i[n]/e)*e);return i}var hw=`
const roundAlpha = ${ox.toString()};
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
};`,hs,uw=0,oo=new Map;function dw(){if(hs!==void 0)return hs;try{if(typeof Worker>"u"||typeof OffscreenCanvas>"u"||typeof createImageBitmap>"u")throw new Error("no workers here");hs=new Worker(URL.createObjectURL(new Blob([hw],{type:"text/javascript"}))),hs.onmessage=({data:i})=>{let t=oo.get(i.id);t&&(oo.delete(i.id),i.error?t.fail(new Error(i.error)):t.done(i.url))},hs.onerror=()=>{hs=!1;for(let i of oo.values())i.fail(new Error("the encoder stopped"));oo.clear()}}catch{hs=!1}return hs}function ax(i,t=!1){if(!i)return Promise.resolve(null);let e=dw();if(!e)return sx(i,t);let n=++uw,s=createImageBitmap(i);return new Promise(r=>{oo.set(n,{done:r,fail:()=>r(Bh(i))}),s.then(o=>e.postMessage({id:n,bitmap:o,sure:t,quality:Pf,levels:rx},[o])).catch(()=>{oo.delete(n),r(sx(i,t))})})}function fw(i){let t=me(i.width,i.height),e=ee(t);e.drawImage(i,0,0);let n=e.getImageData(0,0,t.width,t.height);return ox(n.data,rx),e.putImageData(n,0,0),t}function sx(i,t){if(!t&&!cw(i))return Promise.resolve(null);let e=fw(i);return typeof e.toBlob!="function"||typeof FileReader>"u"?Promise.resolve(Bh(e)):new Promise(n=>{e.toBlob(s=>{if(!s){n(Bh(e));return}let r=new FileReader;r.onload=()=>n(r.result),r.onerror=()=>n(Bh(e)),r.readAsDataURL(s)},"image/webp",Pf)})}function Bh(i){let t=i.toDataURL("image/webp",Pf);return t.startsWith("data:image/webp")?t:i.toDataURL("image/png")}var lx=48;function Vh(i,t=()=>document.createElement("canvas")){let e=i?.naturalWidth||i?.width,n=i?.naturalHeight||i?.height;if(!e||!n)return null;let s=lx,r=Math.max(2,Math.round(lx*n/e));try{let o=t();o.width=s,o.height=r;let a=o.getContext("2d",{willReadFrequently:!0});return a.imageSmoothingQuality="high",a.drawImage(i,0,0,s,r),I0(a.getImageData(0,0,s,r).data,s,r)}catch{return null}}var pi=Object.freeze({nameChars:160,textChars:360,ellipsis:"\u2026",step:.06}),ki=.01,cx=typeof Intl<"u"&&typeof Intl.Segmenter=="function"?new Intl.Segmenter(void 0,{granularity:"grapheme"}):null,Bs=i=>cx?Array.from(cx.segment(i),t=>t.segment):Array.from(i);function Wh(i,t){let e=Bs(i);return e.length>t?`${e.slice(0,Math.max(0,t-1)).join("").trimEnd()}${pi.ellipsis}`:i}function Li(i,t=1/0){let e=String(i??"");try{e=e.normalize("NFC")}catch{}return e=e.replace(/<br\s*\/?>/gi,`
`).replace(/\\n/g,`
`),e=e.replace(/\r\n?|[\u{b}\u{c}\u{85}\u{2028}\u{2029}]/gu,`
`),e=e.replace(/[\u{0}-\u{8}\u{e}-\u{1f}\u{7f}-\u{9f}\u{200b}\u{feff}\u{2060}]/gu,""),e=e.replace(/[\t\u{a0}\u{1680}\u{2000}-\u{200a}\u{202f}\u{205f}\u{3000}]/gu," "),e=e.split(`
`).map(n=>n.replace(/ {2,}/g," ").trim()).filter(Boolean).join(`
`),Wh(e,t)}function Xh(i){let t=Li(i?.name??i?.id??""),e=Li(i?.title??"",pi.textChars);if(e)return{name:Wh(t,pi.nameChars),text:e};let[n="",...s]=t.split(`
`);return{name:Wh(n,pi.nameChars),text:Wh(s.join(`
`),pi.textChars)}}function px(i,{long:t=18}={}){let{name:e,text:n}=Xh(i);return!e&&!n||!n&&Bs(e).length<=t?null:{name:e,text:n}}var Lf=i=>JSON.stringify([i?.name??null,i?.title??null,ls(i?.badges)]),pw=/[\u{1100}-\u{11ff}\u{2e80}-\u{303e}\u{3041}-\u{33ff}\u{3400}-\u{4dbf}\u{4e00}-\u{9fff}\u{a960}-\u{a97f}\u{ac00}-\u{d7af}\u{f900}-\u{faff}\u{fe30}-\u{fe4f}\u{ff00}-\u{ffef}\u{20000}-\u{3134f}]/u,mw=new Set([..."\u3001\u3002\uFF0C\uFF0E\u30FB\uFF1A\uFF1B\uFF01\uFF1F\uFF09\uFF3D\uFF5D\u3015\u3009\u300B\u300D\u300F\u3011\u3019\u3017\u301F\u2019\u201D\u203C\u2047\u2048\u2049\u309D\u309E\u30FD\u30FE\u3005\u30FC\u301C\uFF5E\u2026\u2025\u3041\u3043\u3045\u3047\u3049\u3063\u3083\u3085\u3087\u308E\u3095\u3096\u30A1\u30A3\u30A5\u30A7\u30A9\u30C3\u30E3\u30E5\u30E7\u30EE\u30F5\u30F6"]),gw=new Set([..."\uFF08\uFF3B\uFF5B\u3014\u3008\u300A\u300C\u300E\u3010\u3018\u3016\u301D\u2018\u201C"]),xw=new Set(["-","\u2010","\u2011","\u2013","\u2014","/"]),hx=(()=>{try{return typeof Intl<"u"&&typeof Intl.Segmenter=="function"?new Intl.Segmenter("ja",{granularity:"word"}):null}catch{return null}})(),kf=i=>{let t=Bs(i);return{text:i,kind:"cjk",noBefore:mw.has(t[0]),noAfter:gw.has(t.at(-1))}};function yw(i){return hx?Array.from(hx.segment(i),t=>kf(t.segment)):Bs(i).map(kf)}function _w(i){let t=Bs(i),e=[],n="",s="",r=(o=!1)=>{n&&(e.push({text:n,kind:"word",hyphen:o}),n=""),s&&(e.push(...yw(s)),s="")};for(let o=0;o<t.length;o++){let a=t[o];if(/^\s+$/u.test(a))r(),e.at(-1)?.kind!=="space"&&e.push({text:" ",kind:"space"});else if(pw.test(a))n&&r(),s+=a;else{s&&r(),n+=a;let l=t[o+1];xw.has(a)&&n.length>1&&l!==void 0&&/[\p{L}\p{N}]/u.test(l)&&r(!0)}}return r(),e}function Df(i,t){return i.kind==="space"||t.kind==="space"?!0:i.noAfter||t.noBefore?!1:i.kind==="cjk"||t.kind==="cjk"||i.hyphen===!0}function vw(i,t,e){let n=[],s=0;for(;s<i.length;){let r=s;for(;r+1<i.length&&!Df(i[r],i[r+1]);)r++;let o=i.slice(s,r+1),a=o.reduce((l,c)=>l+(c.kind==="space"?0:t(c.text)),0)>e+ki;for(let l of o){let c=l.kind==="space"?[]:Bs(l.text);if(a&&c.length>1)for(let h of c)n.push(l.kind==="word"?{text:h,kind:"cjk"}:kf(h));else n.push(l)}s=r+1}return n}function ux(i,t,e){let n=[],s=i.length,r=0;for(;r<s;){for(;r<s&&i[r].kind==="space";)r++;if(r>=s)break;let o=r,a=0,l=-1,c=r;for(;c<s&&!(i[c].kind!=="space"&&c>o&&a+t[c]>e+ki);c++)a+=t[c],c+1<s&&Df(i[c],i[c+1])&&(l=c+1);let h=c>=s?s:l>o?l:c;n.push([o,h]),r=h}return n}var Mw=(i,t,[e,n])=>{let s=n;for(;s>e&&i[s-1].kind==="space";)s--;let r=0;for(let o=e;o<s;o++)r+=t[o];return r};function bw(i,t,e){let n=ux(i,t,e);if(n.length<2)return n;let s=0;for(let a=0;a<i.length;){let l=a,c=i[a].kind==="space"?0:t[a];for(;l+1<i.length&&!Df(i[l],i[l+1]);)l++,c+=t[l];s=Math.max(s,c),a=l+1}let r=e,o=n;for(let a=0;a<14&&r-s>.5;a++){let l=(s+r)/2,c=ux(i,t,l);c.length<=n.length&&c.every(h=>Mw(i,t,h)<=l+ki)?(o=c,r=l):s=l}return o}function dx(i,t,e){let n=[];return Li(i).split(`
`).filter(Boolean).forEach((s,r)=>{let o=vw(_w(s),t,e);if(!o.length)return;let a=o.map(l=>t(l.text));for(let[l,c]of bw(o,a,e)){let h=c;for(;h>l&&o[h-1].kind==="space";)h--;let d=o.slice(l,h).map(u=>u.text).join("");n.push({text:d,width:t(d),atoms:o,from:l,paragraph:r})}}),n}function Sw(i,t,e){if(t(i)<=e+ki)return i;let n=Bs(i),s=n.length;for(;s>0&&t(n.slice(0,s).join("").trimEnd()+pi.ellipsis)>e+ki;)s--;let r=n.slice(0,s).join(""),o=r.lastIndexOf(" ");return o>r.length*.45&&/\S$/.test(r)&&n[s]!==void 0&&n[s]!==" "&&(r=r.slice(0,o)),r.trimEnd().replace(/[,;:\-\u{2010}\u{2013}\u{2014}/\u{3001}\u{ff0c}]+$/u,"")+pi.ellipsis}function If(i,{measureAt:t,width:e,sizes:n,maxLines:s,lineHeight:r=1.15}){let o=(g,p,m)=>({size:g,lineHeight:r,lines:p.map(({text:v,width:E})=>({text:v,width:E})),height:p.length*g*r,truncated:m});if(!Li(i))return o(n.at(-1),[],!1);for(let g of n){let p=dx(i,t(g),e);if(p.length<=s&&p.every(m=>m.width<=e+.5))return o(g,p,!1)}let a=n.at(-1),l=t(a),c=dx(i,l,e),h=c.slice(0,s),d=h.at(-1),u=d.atoms.slice(d.from).map(g=>g.text).join("").trim(),f=c.length>s,x=f&&l(u+pi.ellipsis)<=e+ki?u+pi.ellipsis:Sw(u,l,e);return h[h.length-1]={text:x,width:l(x)},o(a,h,f||x!==u)}function fx(i,t,e=pi.step){let n=[];for(let s=i;s>t;s=Math.min(s-1,Math.round(s*(1-e))))n.push(s);return n.push(t),[...new Set(n)]}function mx({name:i,text:t},e){let{width:n,maxHeight:s,gap:r=12}=e,o={name:Li(i),text:Li(t)},a=fx(e.name.max,e.name.min),l=fx(e.text.max,e.text.min),c=e.name.comfort??.7,h=(m,v=e.name.maxLines)=>If(o.name,{measureAt:e.measureName,width:n,sizes:m,maxLines:v,lineHeight:e.name.lineHeight}),d=m=>{for(let M=1;M<=e.text.maxLines;M++)for(let T of l){let w=If(o.text,{measureAt:e.measureText,width:n,sizes:[T],maxLines:M,lineHeight:e.text.lineHeight});if(!w.truncated&&w.height<=m+ki)return w}let v=l.at(-1),E=Math.min(e.text.maxLines,Math.floor((m+ki)/(v*e.text.lineHeight)));return E<1?null:If(o.text,{measureAt:e.measureText,width:n,sizes:[v],maxLines:E,lineHeight:e.text.lineHeight})},u=(m,v)=>({name:m,text:v,gap:v?r:0,height:m.height+(v?r+v.height:0),truncated:{name:m.truncated,text:v?.truncated??!1},full:o}),f=e.name.max*(e.name.floor??.62),x=null;t:for(let m=1;m<=e.name.maxLines;m++){let v=m<e.name.maxLines?a.filter(E=>E>=e.name.max*c):a;for(let E of v){if(x&&E<f)break t;let M=h([E],m);if(M.truncated||M.height>s+ki)continue;if(!o.text)return u(M,null);let T=d(s-M.height-r);if(T){if(!T.truncated)return u(M,T);x??=u(M,T)}}}if(x)return x;let g=h([e.name.min]),p=o.text?d(s-g.height-r):null;return u(g,p)}var Nf=Object.freeze({gap:14,name:Object.freeze({family:"sans-serif",weight:800,max:58,min:32,maxLines:2,lineHeight:1.06,tracking:.03,upper:!0}),text:Object.freeze({family:"sans-serif",weight:700,max:34,min:24,maxLines:3,lineHeight:1.18,tracking:0,upper:!1})}),gx=(i,t)=>`${i.weight} ${t}px ${i.family}`;function $h({canvas:i=()=>document.createElement("canvas")}={}){let t=null,e=()=>t??=i().getContext("2d"),n=r=>o=>{let a=e();return a.font=gx(r,o),"letterSpacing"in a&&(a.letterSpacing=`${(r.tracking??0)*o}px`),l=>{let c=a.measureText(l);return Number.isFinite(c?.width)?c.width:[...l].length*o*.55}},s=(r,o)=>({...r,...o??{}});return{textOf:Xh,fit(r,o={}){let a=s(Nf.name,o.name),l=s(Nf.text,o.text),{name:c,text:h}=Xh(r),d=mx({name:a.upper?c.toLocaleUpperCase("en"):c,text:l.upper?h.toLocaleUpperCase("en"):h},{width:o.width,maxHeight:o.maxHeight,gap:o.gap??Nf.gap,name:a,text:l,measureName:n(a),measureText:n(l)});return d.full={name:Li(c),text:Li(h)},d.style={name:a,text:l},d},draw(r,o,a,l={}){let c={ink:"#231c10",textInk:"rgba(35,28,16,0.86)",rule:"rgba(35,28,16,0.38)",embolden:.04,emboss:null,...l},{x:h,y:d,w:u,h:f}=a,x=d+(f-o.height)/2;r.save(),r.textAlign="center",r.textBaseline="middle",r.lineJoin="round";let g=(p,m,v,E)=>{let M=p.size;r.font=gx(m,M);let T=(m.tracking??0)*M;"letterSpacing"in r&&(r.letterSpacing=`${T}px`),p.lines.forEach((w,C)=>{let _=x+(C+.5)*M*p.lineHeight+M*.04,S=h+u/2+(T?T/2:0);c.emboss&&(r.fillStyle=c.emboss,r.fillText(w.text,S,_+Math.max(1,M*.035))),r.fillStyle=v,E>0&&(r.strokeStyle=v,r.lineWidth=M*E,r.strokeText(w.text,S,_)),r.fillText(w.text,S,_)}),x+=p.height};if(g(o.name,o.style.name,c.ink,c.embolden),o.text){if(c.rule){r.fillStyle=c.rule;let p=Math.min(u*.32,150);r.fillRect(h+(u-p)/2,x+o.gap/2-1,p,2)}x+=o.gap,g(o.text,o.style.text,c.textInk,0)}"letterSpacing"in r&&(r.letterSpacing="0px"),r.restore()}}}var ww=4e3,Zh=class{constructor({images:t=new Us,onContextLost:e=null}={}){this.images=t,this.onContextLost=e,this.name="three",this.capabilities={lights:!0,shadows:!0,post:!0,particles:!0,marks:!0,zoneOutlines:!0,chalk:!0,camera:!1,capture:!0,footlights:!0},this.views=new Map,this.adding=new Set,this.tier="high",this.needsRebuild=!1,this.zoneSetting="off",this.calm=!1,this.disposed=!1,this.ready=!1}mount(t,{quality:e="high",pixelRatio:n=1,width:s=1280,height:r=720}={}){this.tier=e,this.settings=_0(e),this.element=t,this.tracker=new xh,this.canvas=document.createElement("canvas"),this.canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;",t.append(this.canvas),this.renderer=new ch({canvas:this.canvas,antialias:!this.settings.post,powerPreference:"high-performance"}),this.renderer.info.autoReset=!1,this.renderer.shadowMap.enabled=this.settings.shadows,this.renderer.shadowMap.type=Is,this.renderer.outputColorSpace=Ae,this.renderer.toneMapping=Cn,this.scene=new Yo,this.camera=new Ye,this.softDot=this.tracker.add(E0()),this.canvas.addEventListener("webglcontextlost",o=>{o.preventDefault(),!this.disposed&&(this.contextLost=!0,this.onContextLost?.())}),this.#t(s,r,n)}#t(t,e,n){this.width=t,this.height=e,this.ratio=Math.min(n||1,this.settings.pixelRatioCap),this.view=So(t,e),this.renderer.setPixelRatio(this.ratio),this.renderer.setSize(t,e,!1),this.rig&&gf(this.camera,this.rig,this.view),this.post?.setSize(Math.round(t*this.ratio),Math.round(e*this.ratio))}resize(t,e,n=1){this.disposed||this.#t(t,e,n)}setQuality(t){t!==this.tier&&(this.tier=t,this.needsRebuild=!0)}setCalm(t){this.calm=!!t,this.fx&&(this.fx.calm=this.calm),this.post?.setCalm(this.calm)}setZoneSetting(t){this.zoneSetting=t}setFootlights(t){this.world?.setFootlights(t)}async load(t,e,n=[]){this.description=t,this.skin=e,this.rig=Qs(t.painting,t.rig),this.fx=null,await Promise.all((e.fonts??[]).map(r=>document.fonts?.load(r).catch(()=>null)));let s=await this.images.loadImage(t.painting.src);if(!s)throw new Error(`the painting "${t.painting.src}" could not be loaded`);this.disposed||(this.paintingImage=s,this.grade=Vh(s),gf(this.camera,this.rig,this.view),this.#n(s),this.world=await new _h({scene:t,rig:this.rig,tracker:this.tracker,softDot:this.softDot,settings:this.settings}).build(s),this.scene.add(this.world.group),this.zones=new Th({scene:this.scene,rig:this.rig,zones:t.zones,tracker:this.tracker}),this.boardLabels=new Eh({scene:this.scene,rig:this.rig,zones:t.zones,tracker:this.tracker,cardHeight:e.size.h*t.cardScale}),this.marks=new Ah({scene:this.scene,tracker:this.tracker,softDot:this.softDot}),this.fx=new wh({scene:this.scene,rig:this.rig,tracker:this.tracker,softDot:this.softDot,settings:this.settings,cardHeight:e.size.h*t.cardScale}),this.fx.calm=this.calm,this.chalkTiles=new Dh({scene:this.scene,rig:this.rig}),this.chalkBox=new Nh({scene:this.scene,rig:this.rig,at:t.chalk.box??eo,tracker:this.tracker}),this.chalkBox.setVisible(!1),await Promise.all(n.map(r=>this.addCard(r))),this.settings.post&&(this.post=new Ih(this.renderer,this.scene,this.camera,{width:Math.round(this.width*this.ratio),height:Math.round(this.height*this.ratio),samples:this.settings.msaa}),this.post.setCalm(this.calm)),await this.#e(this.scene),this.world.setFootlights(t.footlights),this.ready=!0)}async#e(t){let e=0;try{let n=this.renderer.getRenderTarget();this.renderer.setRenderTarget(this.post?.target??null);let s=null;try{this.renderer.compileAsync?s=this.renderer.compileAsync(t,this.camera,this.scene):this.renderer.compile(t,this.camera,this.scene)}finally{this.renderer.setRenderTarget(n)}await Promise.race([s,new Promise(r=>{e=setTimeout(r,ww)})])}catch(n){console.warn("stagecraft | a shader could not be built ahead; it will be at the first draw",n)}finally{clearTimeout(e)}}#n(t){let e=new Xr(this.renderer),n=new Ve(t);n.mapping=Br,n.colorSpace=Ae,n.needsUpdate=!0;let s=e.fromEquirectangular(n);this.tracker.add(s),this.scene.environment=s.texture,this.scene.environmentIntensity=.6,n.dispose(),e.dispose()}async addCard(t){if(!(this.views.has(t.id)||this.adding.has(t.id)||this.disposed)){this.adding.add(t.id);try{this.titleBlock??=$h();let e={tracker:this.tracker,images:this.images,titleBlock:this.titleBlock,softDot:this.softDot,scene:this.scene,emoteTexture:s=>this.#i(s),lightAt:(s,r)=>this.#r(s,r)},n=new Sh(t,this.skin,e,this.description.cardScale*(t.size??1));if(await n.build(),this.disposed){n.dispose();return}if(this.ready&&await this.#e(n.root),this.disposed){n.dispose();return}this.views.set(t.id,n),this.scene.add(n.root,n.blob),t.emote?.id&&await n.setEmote(t.emote.id)}finally{this.adding.delete(t.id)}}}removeCard(t){let e=this.views.get(t);e&&(e.dispose(),this.views.delete(t))}async refreshCard(t){let e=this.views.get(t.id);!e||this.disposed||await e.refresh(t)}#i(t){if(this.emoteCache??=new Map,!this.emoteCache.has(t)){let e=gn[t]?.svg;this.emoteCache.set(t,e?new Promise(n=>{let s=new Image;s.onload=()=>{let r=document.createElement("canvas");r.width=r.height=256,r.getContext("2d").drawImage(s,0,0,256,256),n(this.tracker.add(fn(r)))},s.onerror=()=>n(null),s.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(e.replace("<svg ",'<svg width="256" height="256" '))}`}):Promise.resolve(null))}return this.emoteCache.get(t)}draw(t){if(!this.ready||this.disposed||this.contextLost)return;let e=t.t;this.world.update(e);for(let n of t.cards)this.views.get(n.id)?.pose(n);this.zones.update(t.zones,this.zoneSetting,e,t.board??null),this.boardLabels.update(t.board??null),this.marks.update(t.marks,this.views,e),this.fx.update(t.bonks,e),this.renderer.info.reset(),this.post?this.post.render(e):this.renderer.render(this.scene,this.camera)}#s(t,e){return this.raycaster??=new ua,this.ndc??=new bt,this.ndc.set(t/this.width*2-1,-(e/this.height*2-1)),this.raycaster.setFromCamera(this.ndc,this.camera),this.raycaster}pick(t,e){if(!this.ready)return null;let n=[];for(let o of this.views.values())n.push(...o.pickables);if(this.chalkBox?.group.visible&&n.push(...this.chalkBox.pickables),!n.length)return null;let s=this.#s(t,e).intersectObjects(n,!1)[0];if(!s)return null;let r={x:s.point.x,y:s.point.y,z:s.point.z};return s.object.userData.chalk?{kind:"chalk",colour:s.object.userData.chalk,point:r}:s.object.userData.magic?{kind:"magic",point:r}:s.object.userData.eraser?{kind:"eraser",point:r}:{kind:"card",id:s.object.userData.cardId,point:r}}paintingAt(t,e){this.backPlane??=new xn(new D(0,0,1),Pn),this.hit??=new D;let n=this.hit;if(!this.#s(t,e).ray.intersectPlane(this.backPlane,n))return null;let{cx:s,cy:r,f:o,floorY:a}=this.rig.cam,l=o/(o+Pn),c=s+n.x*l,h=r+(a-r-n.y)*l,[d,u]=this.rig.fractionOfScreen(c,h);return d>=0&&d<=1&&u>=0&&u<=1?{x:d,y:u}:null}floorAt(t,e,n=0){return this.floorPlane??=new xn(new D(0,1,0),0),this.floorPlane.constant=-n,this.hit??=new D,this.#s(t,e).ray.intersectPlane(this.floorPlane,this.hit)?{x:this.hit.x,z:this.hit.z}:null}project({X:t,Y:e,Z:n}){let s=this.rig.screenOf(t,e,n);return{x:(s.x-this.view.ox)*this.view.s,y:(s.y-this.view.oy)*this.view.s,k:s.k}}setChalkTiles(t,e,n=!1){this.chalkTiles?.update(t,e,n)}setChalkHidden(t){this.chalkTiles?.setHidden(t)}setChalkBox(t){this.chalkBox?.setVisible(t)}setChalkBoxAt(t){this.rig&&this.chalkBox?.moveTo(this.rig,t)}paintingColour(t,e){return Gh(this.paintingImage,t,e)}#r(t,e){if(!this.grade||!this.rig)return null;let[n,s]=this.rig.fractionOf(t,e);return Mh(this.grade,n,s,{strength:this.description.grade??1})}async capture(){return this.post?this.post.render(0):this.renderer.render(this.scene,this.camera),new Promise(t=>this.canvas.toBlob(t,"image/png"))}stats(){let t=this.renderer?.info;return t?{calls:t.render.calls,triangles:t.render.triangles,textures:t.memory.textures,geometries:t.memory.geometries,tracked:this.tracker.size}:null}unmount(){this.canvas?.remove()}dispose(){if(!this.disposed){this.disposed=!0;for(let t of this.views.values())t.dispose();this.views.clear(),this.chalkTiles?.dispose(),this.post?.dispose(),this.tracker?.disposeAll(),this.scene?.environment?.dispose?.(),this.renderer?.dispose(),this.contextLost||this.renderer?.forceContextLoss(),this.unmount()}}};var La=Math.PI/180,i3=Object.freeze([1,0,0,1,0,0]),ka=(i,t)=>[i[0]*t[0]+i[2]*t[1],i[1]*t[0]+i[3]*t[1],i[0]*t[2]+i[2]*t[3],i[1]*t[2]+i[3]*t[3],i[0]*t[4]+i[2]*t[5]+i[4],i[1]*t[4]+i[3]*t[5]+i[5]],xx=(i,t)=>[1,0,0,1,i,t],yx=(i,t=i)=>[i,0,0,t,0,0],_x=i=>[Math.cos(i),Math.sin(i),-Math.sin(i),Math.cos(i),0,0],Tw=(i,t,e)=>({x:i[0]*t+i[2]*e+i[4],y:i[1]*t+i[3]*e+i[5]});function Ew(i){let t=i[0]*i[3]-i[1]*i[2];return Math.abs(t)<1e-12?null:[i[3]/t,-i[1]/t,-i[2]/t,i[0]/t,(i[2]*i[5]-i[3]*i[4])/t,(i[1]*i[4]-i[0]*i[5])/t]}var qh=(i,t,e)=>({x:(t-i.ox)*i.s,y:(e-i.oy)*i.s}),vx=(i,t,e)=>({x:t/i.s+i.ox,y:e/i.s+i.oy});function us(i,t,{X:e,Y:n,Z:s}){let r=i.screenOf(e,n,s);return{...qh(t,r.x,r.y),k:r.k}}function Mx(i,t,e,n,s=0){let{cam:r}=i,o=vx(t,e,n),a=r.floorY-s-r.cy;if(a===0)return null;let l=(o.y-r.cy)/a;return l>0?{x:(o.x-r.cx)/l,z:r.f-r.f/l}:null}function bx(i,t,e,n){let s=vx(t,e,n),[r,o]=i.fractionOfScreen(s.x,s.y);return r>=0&&r<=1&&o>=0&&o<=1?{x:r,y:o}:null}function Of(i,t,e,{stickLen:n=134}={}){let s=i.grip??0,r=i.scale??1,o=t.screenOf(i.x,i.lift??0,i.z),a=qh(e,o.x,o.y),l=o.k*e.s,c=1-.45*s,h=(i.lean??0)*La,d=n*r*s,u=(i.yaw??0)*La,f=Math.cos(u),x=Math.max(.55-.35*(i.down??0),Math.cos((i.pitch??0)*La)),g=ka(xx(a.x,a.y),ka(yx(l),_x(h*c))),p=ka(g,ka(xx(0,-d),_x(h*(1-c)))),m=r*Math.max(.03,Math.abs(f)),v=r*(i.breathe??1)*(i.squash??1)*x;return{m:ka(p,yx(m,v)),stick:g,at:a,k:o.k,px:l,back:f<0,side:Math.abs(Math.sin(u)),hinge:d,share:c}}function Sx(i,t,e,n,s){let r=Ew(i.m);if(!r)return null;let o=Tw(r,n,s),{w:a,h:l}=e;if(o.x<-a/2||o.x>a/2||o.y<-l||o.y>zs.depth)return null;let c=Math.max(0,-o.y)*(t.scale??1)*(t.breathe??1)*(t.squash??1);return(t.lift??0)+i.hinge+c}var zs=Object.freeze({width:.5,depth:12}),wx=(i,t)=>i.z-t.z;var Tx=-10*La,Da=Object.freeze({at:[jn.eraser.x,20,4],size:[50,32,30],hit:{y0:0,y1:60,half:29}});function Ex(i,t,e){let n=i.standing(e);if(!n)return null;let s=Math.cos(Tx),r=Math.sin(Tx),o=(I,F,V)=>us(i,t,{X:n.X+I*s+V*r,Y:F,Z:n.Z-I*r+V*s}),a=I=>I.map(([F,V,Z])=>{let nt=o(F,V,Z);return[nt.x,nt.y]}),{width:l,depth:c,wall:h,stick:d,hit:u}=jn,f=4+h,x=F0.map((I,F)=>{let V=d.first+F*d.spacing,Z=(F%2-.5)*6,nt=(F%3-1)*.07,$=o(V,-2,Z),K=o(V-Math.sin(nt)*d.height,-2+Math.cos(nt)*d.height,Z),et=o(V,4+u.height/2-14-u.height/2,0),at=o(V,4+u.height/2-14+u.height/2,0),rt=u.radius*et.k*t.s;return{colour:I,base:{x:$.x,y:$.y},top:{x:K.x,y:K.y},width:2*d.radius*$.k*t.s,hit:{x0:et.x-rt,x1:et.x+rt,y0:at.y,y1:et.y}}}),g=jn.magic,p=o(g.x,-2,2),m=o(g.x-Math.sin(.06)*g.height,-2+Math.cos(.06)*g.height,2),v=o(g.x,4+u.height/2-14-u.height/2,0),E=o(g.x,4+u.height/2-14+u.height/2,0),M=u.radius*v.k*t.s,[T,w,C]=Da.at,[_,S,R]=Da.size,P=o(T,Da.hit.y0,C),k=o(T,Da.hit.y1,C),B=Da.hit.half*P.k*t.s;return{z:n.Z,floor:a([[-l/2,4,-c/2],[l/2,4,-c/2],[l/2,4,c/2],[-l/2,4,c/2]]),back:a([[-l/2,4,-c/2],[l/2,4,-c/2],[l/2,f,-c/2],[-l/2,f,-c/2]]),left:a([[-l/2,4,-c/2],[-l/2,4,c/2],[-l/2,f,c/2],[-l/2,f,-c/2]]),right:a([[l/2,4,-c/2],[l/2,4,c/2],[l/2,f,c/2],[l/2,f,-c/2]]),front:a([[-l/2,4,c/2],[l/2,4,c/2],[l/2,f,c/2],[-l/2,f,c/2]]),sticks:x,magic:{base:{x:p.x,y:p.y},top:{x:m.x,y:m.y},width:2*g.radius*p.k*t.s,hit:{x0:v.x-M,x1:v.x+M,y0:E.y,y1:v.y}},eraser:{front:a([[T-_/2,w-S/2,C+R/2],[T+_/2,w-S/2,C+R/2],[T+_/2,w+S/2,C+R/2],[T-_/2,w+S/2,C+R/2]]),top:a([[T-_/2,w+S/2,C-R/2],[T+_/2,w+S/2,C-R/2],[T+_/2,w+S/2,C+R/2],[T-_/2,w+S/2,C+R/2]]),hit:{x0:P.x-B,x1:P.x+B,y0:k.y,y1:P.y}}}}var Uf=(i,t,e)=>t>=i.x0&&t<=i.x1&&e>=i.y0&&e<=i.y1;function Ax(i,t,e){if(!i)return null;if(Uf(i.eraser.hit,t,e))return{kind:"eraser"};if(Uf(i.magic.hit,t,e))return{kind:"magic"};for(let n of i.sticks)if(Uf(n.hit,t,e))return{kind:"chalk",colour:n.colour};return null}var Cx=.42,Rx=.2,Px=.8,Ix=22,Aw=3,Cw=1,Ff=(i,t="#80512d")=>typeof i=="number"?`#${i.toString(16).padStart(6,"0")}`:t;function Rw(i,t){let e=Math.min(2048,i),n=Math.round(e*t/i),s=document.createElement("canvas");return s.width=e,s.height=n,{canvas:s,ctx:s.getContext("2d"),cw:e,ch:n}}var Yh=class{constructor({images:t,onContextLost:e=null}={}){this.images=t,this.onContextLost=e,this.name="flat",this.capabilities={lights:!1,shadows:!1,post:!1,particles:!1,marks:!0,zoneOutlines:!0,chalk:!0,camera:!1,capture:!0,footlights:!1},this.tier="flat",this.views=new Map,this.adding=new Set,this.emotes=new Map,this.calm=!1,this.zoneSetting="off",this.disposed=!1,this.ready=!1,this.order=[],this.flashes=[],this.zoneKey="",this.revision=0,this.chalkWall=null,this.chalkDirty=new Set,this.hidden=!1,this.boxShown=!1,this.draws=0}mount(t,{pixelRatio:e=1,width:n=1280,height:s=720}={}){if(this.element=t,this.canvas=document.createElement("canvas"),this.canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;",t.append(this.canvas),this.ctx=this.canvas.getContext("2d",{alpha:!1}),!this.ctx)throw new Error("this browser cannot draw on a 2D canvas");this.#t(n,s,e)}#t(t,e,n){this.width=t,this.height=e,this.ratio=Math.min(n||1,Cw),this.view=So(t,e),this.canvas.width=Math.max(1,Math.round(t*this.ratio)),this.canvas.height=Math.max(1,Math.round(e*this.ratio)),this.backdrop=null,this.backdropKey="",this.occluderBitmaps=null,this.boxCache=null}resize(t,e,n=1){this.disposed||this.#t(t,e,n)}setQuality(){}setCalm(t){this.calm=!!t}setZoneSetting(t){this.zoneSetting=t,this.zoneKey=""}setFootlights(){}async load(t,e,n=[]){this.description=t,this.skin=e,this.rig=Qs(t.painting,t.rig),await Promise.all((e.fonts??[]).map(a=>document.fonts?.load(a).catch(()=>null)));let s=await this.images.loadImage(t.painting.src);if(!s)throw new Error(`the painting "${t.painting.src}" could not be loaded`);if(this.disposed)return;this.painting=s,this.grade=Vh(s);let[r,o]=this.rig.size;this.zoneLayer=Rw(r,o),this.impact=ph(),this.markImage=mh(),this.labelImages=new Map,this.occluders=t.occluders.map(a=>{let l=this.rig.standing([a.x,a.base]);return l?{poly:a.poly.map(([c,h])=>[this.rig.map.x(c),this.rig.map.y(h)]),z:l.Z}:null}).filter(Boolean),await Promise.all(n.map(a=>this.addCard(a))),this.ready=!0}async addCard(t){if(!(this.views.has(t.id)||this.adding.has(t.id)||this.disposed)){this.adding.add(t.id);try{let e=this.#e(),[n,s]=await Promise.all([qr(this.skin,t,e),this.skin.back(t,e)]);if(this.disposed)return;this.views.set(t.id,{id:t.id,person:t,face:this.#n(n),back:this.#n(s),w:this.skin.size.w,h:this.skin.size.h}),t.emote?.id&&this.#i(t.emote.id)}finally{this.adding.delete(t.id)}}}removeCard(t){this.views.delete(t)}#e(){return this.titleBlock??=$h(),{loadImage:this.images.loadImage,titleBlock:this.titleBlock}}async refreshCard(t){let e=this.views.get(t.id);if(!e||this.disposed)return;let n={...e.person,...t},s=this.#e(),[r,o]=await Promise.all([qr(this.skin,n,s),this.skin.back(n,s)]);this.disposed||this.views.get(t.id)!==e||(e.person=n,e.face=this.#n(r),e.back=this.#n(o))}#n(t){let{w:e,h:n}=this.skin.size;if(!(t.width>e*1.3))return t;let s=document.createElement("canvas");s.width=e,s.height=n;let r=s.getContext("2d");return r.imageSmoothingQuality="high",r.drawImage(t,0,0,e,n),s}#i(t){if(this.emotes.has(t))return this.emotes.get(t);this.emotes.set(t,null);let e=gn[t]?.svg;if(e){let n=new Image;n.onload=()=>this.emotes.set(t,n),n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(e.replace("<svg ",'<svg width="256" height="256" '))}`}return null}#s(){let{view:t,ratio:e}=this;this.#r([t.s,0,0,t.s,-t.ox*t.s,-t.oy*t.s],e)}#r(t,e=this.ratio){this.ctx.setTransform(t[0]*e,t[1]*e,t[2]*e,t[3]*e,t[4]*e,t[5]*e)}#o(){return this.boxShown?(this.boxCache??={layout:Ex(this.rig,this.view,this.boxAt??this.description.chalk?.box??eo)},this.boxCache.layout):null}#c(t,e){let{rig:n,view:s,ratio:r}=this,o=t.board??null,a=this.description.zones.length?dh(this.description.zones,t.zones,this.zoneSetting,e,o):"",l=`${this.canvas.width}x${this.canvas.height}|${a}|${this.revision}|${this.hidden?1:0}`;if(this.backdrop&&l===this.backdropKey){this.chalkDirty.size&&this.#h();return}if(this.backdropKey=l,this.chalkDirty.clear(),!this.backdrop){let m=document.createElement("canvas");m.width=this.canvas.width,m.height=this.canvas.height,this.backdrop={canvas:m,ctx:m.getContext("2d",{alpha:!1})}}let c=this.backdrop.ctx,h=n.map,[d,u]=n.size;c.setTransform(1,0,0,1,0,0),c.globalAlpha=1,c.fillStyle="#0c0a08",c.fillRect(0,0,this.canvas.width,this.canvas.height),c.setTransform(s.s*r,0,0,s.s*r,-s.ox*s.s*r,-s.oy*s.s*r),c.imageSmoothingQuality="high";let f=d*h.s,x=u*h.s;c.drawImage(this.painting,h.ox,h.oy,f,x);let g=h.oy+x,p=s.oy+s.visH-g;if(p>0){let m=Math.min(p+8,x*.6);c.save(),c.globalAlpha=.55,c.translate(0,g),c.scale(1,-1),c.drawImage(this.painting,0,u-m/h.s,d,m/h.s,h.ox,-m,f,m),c.restore()}if(this.zoneLayer&&this.description.zones.length&&(a!==this.zoneKey&&(this.zoneKey=a,fh(this.zoneLayer.ctx,this.zoneLayer.cw,this.zoneLayer.ch,this.description.zones,t.zones,this.zoneSetting,e,o)),c.drawImage(this.zoneLayer.canvas,h.ox,h.oy,f,x)),!this.hidden&&this.chalkWall)for(let m of this.chalkWall.composite.keys())this.#a(c,m)}#a(t,e){let n=this.chalkWall.composite.get(e);if(!n)return;let s=this.chalkWall.grid,r=De(s,e),o=this.rig.map,[a,l]=this.rig.size,c=a*o.s,h=l*o.s;t.drawImage(n,o.ox+r.x/s.w*c,o.oy+r.y/s.h*h,r.w/s.w*c,r.h/s.h*h)}#h(){let{rig:t,view:e,ratio:n}=this,s=this.backdrop.ctx,r=this.chalkWall?.grid,o=t.map,[a,l]=t.size,c=a*o.s,h=l*o.s,d=1.5/(e.s*n);s.setTransform(e.s*n,0,0,e.s*n,-e.ox*e.s*n,-e.oy*e.s*n),s.globalAlpha=1,s.imageSmoothingQuality="high";for(let u of this.chalkDirty){let f=r?De(r,u):null;if(!f)continue;let x=Math.max(o.ox,o.ox+f.x/r.w*c-d),g=Math.max(o.oy,o.oy+f.y/r.h*h-d),p=Math.min(o.ox+c,o.ox+(f.x+f.w)/r.w*c+d),m=Math.min(o.oy+h,o.oy+(f.y+f.h)/r.h*h+d);if(s.save(),s.beginPath(),s.rect(x,g,p-x,m-g),s.clip(),s.fillStyle="#0c0a08",s.fillRect(x,g,p-x,m-g),s.drawImage(this.painting,o.ox,o.oy,c,h),this.zoneLayer&&this.description.zones.length&&s.drawImage(this.zoneLayer.canvas,o.ox,o.oy,c,h),!this.hidden)for(let v of Un(r,{x0:f.x-2,y0:f.y-2,x1:f.x+f.w+2,y1:f.y+f.h+2}))this.#a(s,v);s.restore()}this.chalkDirty.clear()}draw(t){if(!this.ready||this.disposed)return;let{ctx:e,rig:n,view:s}=this,r=t.t;this.draws++,e.imageSmoothingQuality="medium",this.#c(t,r),e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="source-over",e.drawImage(this.backdrop.canvas,0,0),this.#u(t,r),this.#l(t);let o=[];for(let l of t.cards){let c=this.views.get(l.id);c&&o.push({kind:"card",z:l.z,c:l,v:c,pl:Of(l,n,s,{stickLen:this.skin.stick?.length??134})})}for(let l of this.occluders)o.push({kind:"occluder",z:l.z,o:l});let a=this.#o();a&&o.push({kind:"box",z:a.z,layout:a}),o.sort(wx);for(let l of o)l.kind==="card"?this.#m(l.c,l.v,l.pl):l.kind==="occluder"?this.#d(l.o):this.#p(l.layout);this.order=o,this.#y(t),this.#_(t,r)}#l(t){let{ctx:e,rig:n}=this;this.#s();for(let s of t.cards){let r=this.views.get(s.id);if(!r)continue;let o=s.grip??0,a=s.scale??1,l=n.screenOf(s.x,.6,s.z),c=r.w*a*(.95+.5*o)/2*l.k,h=(74+46*o)/2,d=n.screenOf(s.x,.6,s.z+h),u=n.screenOf(s.x,.6,s.z-h),f=Math.max(2,Math.abs(d.y-u.y)/2);if(s.selected||s.speaking){e.globalAlpha=s.selected?.85:.6,e.fillStyle=s.selected?"#ff9a46":"#fff0c8",e.beginPath(),e.ellipse(l.x,l.y,c*1.45,f*1.6,0,0,Math.PI*2),e.fill();continue}e.globalAlpha=.62-.26*o,e.fillStyle="#000",e.beginPath(),e.ellipse(l.x,l.y,c,f,0,0,Math.PI*2),e.fill()}e.globalAlpha=1}#u(t,e){let{ctx:n,rig:s}=this;this.#s();for(let r of t.marks.slice(0,6)){let o=r.target?1+.06*Math.sin(e*7):1,a=s.screenOf(r.X,1.2,r.Z),l=(r.target?190:150)*o*a.k,c=(r.target?120:96)*o/2,h=Math.abs(s.screenOf(r.X,1.2,r.Z+c).y-s.screenOf(r.X,1.2,r.Z-c).y);n.globalAlpha=Math.min(1,r.alpha)*(r.target?1:.8),n.drawImage(this.markImage,a.x-l/2,a.y-h/2,l,Math.max(h,4))}n.globalAlpha=1}#d(t){this.occluderBitmaps??=new Map;let e=this.occluderBitmaps.get(t);e===void 0&&(e=this.#f(t),this.occluderBitmaps.set(t,e)),e&&(this.ctx.setTransform(1,0,0,1,0,0),this.ctx.drawImage(e.canvas,e.x,e.y))}#f(t){let{view:e,ratio:n,rig:s}=this,r=t.poly.map(([M,T])=>qh(e,M,T)),o=Math.max(0,Math.floor(Math.min(...r.map(M=>M.x))*n)),a=Math.max(0,Math.floor(Math.min(...r.map(M=>M.y))*n)),l=Math.min(this.canvas.width,Math.ceil(Math.max(...r.map(M=>M.x))*n)),c=Math.min(this.canvas.height,Math.ceil(Math.max(...r.map(M=>M.y))*n));if(l<=o||c<=a)return null;let h=document.createElement("canvas");h.width=l-o,h.height=c-a;let d=h.getContext("2d");d.imageSmoothingQuality="high",d.save(),d.setTransform(e.s*n,0,0,e.s*n,-e.ox*e.s*n-o,-e.oy*e.s*n-a),d.beginPath(),t.poly.forEach(([M,T],w)=>w?d.lineTo(M,T):d.moveTo(M,T)),d.closePath(),d.clip();let[u,f]=s.size;d.drawImage(this.painting,s.map.ox,s.map.oy,u*s.map.s,f*s.map.s),d.restore();let x=t.poly.map(M=>M[1]),g=Math.min(sl,(Math.max(...x)-Math.min(...x))*rl)*e.s*n,p=ol(r.map(M=>[M.x*n-o,M.y*n-a]),h.width,h.height,g),m=document.createElement("canvas");m.width=h.width,m.height=h.height;let v=m.getContext("2d"),E=v?.createImageData?.(m.width,m.height);if(E?.data){for(let M=0;M<p.length;M++)E.data[M*4+3]=p[M];v.putImageData(E,0,0),d.globalCompositeOperation="destination-in",d.drawImage(m,0,0),d.globalCompositeOperation="source-over"}return{canvas:h,x:o,y:a}}#m(t,e,n,{ghost:s=!1}={}){let{ctx:r,skin:o}=this,a=e.w,l=e.h,c=t.scale??1,h=t.grip??0;if(!s&&h>.02){this.#r(n.stick);let f=n.hinge,x=Ff(o.stick?.wood),g=Ff(o.stick?.collar,"#b8924f"),p=Math.min(18*c,f);r.fillStyle=x,r.beginPath(),r.moveTo(-6.4*c,0),r.lineTo(-8.5*c,-f+p),r.lineTo(8.5*c,-f+p),r.lineTo(6.4*c,0),r.arc(0,0,6.4*c,0,Math.PI),r.closePath(),r.fill(),r.fillStyle="rgba(255,255,255,0.16)",r.fillRect(-4*c,-f+p,2.4*c,f-p),r.fillStyle=g,r.fillRect(-12.5*c,-f,25*c,p),r.fillStyle="rgba(0,0,0,0.25)",r.fillRect(-12.5*c,-f+p-3*c,25*c,3*c),r.strokeStyle=e.person.colour??"#e8e0c8",r.lineWidth=3.6,r.globalAlpha=Math.min(1,h*2),r.beginPath(),r.ellipse(0,0,21,9,0,0,Math.PI*2),r.stroke(),r.globalAlpha=1}this.#r(n.m),s&&(r.globalAlpha=.35);let d=Ff(o.materials?.body?.color,"#e7dfcd"),u=(o.thickness??9)*n.side/2;r.fillStyle=d,r.fillRect(-a*zs.width/2,0,a*zs.width,zs.depth),e.person.colour&&(r.fillStyle=e.person.colour,r.fillRect(-a*zs.width/2+4,1,a*zs.width-8,3)),r.fillStyle=d,r.fillRect(-a/2-u,-l+2,a+u*2,l-2),r.drawImage(n.back?e.back:e.face,-a/2,-l,a,l),!s&&t.down>.02&&(r.fillStyle=`rgba(0,0,0,${(.45*t.down).toFixed(3)})`,r.fillRect(-a/2,-l,a,l)),s||this.#g(e,t,a,l),s&&(r.globalAlpha=1)}#g(t,e,n,s){if(!this.grade)return;let[r,o]=this.rig.fractionOf(e.x,e.z);t.light=bh(t.light,Mh(this.grade,r,o,{strength:this.description?.grade??1}));let[a,l,c]=t.light.map(d=>Math.round(Math.max(0,Math.min(1,d))*255));if(a>250&&l>250&&c>250)return;let{ctx:h}=this;h.save(),h.globalCompositeOperation="multiply",h.fillStyle=`rgb(${a},${l},${c})`,h.fillRect(-n/2,-s,n,s),h.restore()}#p(t){let{ctx:e}=this,n=(a,l)=>{e.fillStyle=l,e.beginPath(),a.forEach(([c,h],d)=>d?e.lineTo(c,h):e.moveTo(c,h)),e.closePath(),e.fill(),e.strokeStyle="rgba(0,0,0,0.35)",e.lineWidth=1,e.stroke()};this.#r([1,0,0,1,0,0]),n(t.floor,"#3a2412"),n(t.back,"#6a4628"),e.lineCap="round";for(let a of t.sticks)e.strokeStyle=On[a.colour]??On.white,e.lineWidth=a.width,e.beginPath(),e.moveTo(a.base.x,a.base.y),e.lineTo(a.top.x,a.top.y),e.stroke();let s=t.magic,r=e.createLinearGradient(s.base.x,s.base.y,s.top.x,s.top.y);for(let a=0;a<=6;a++)r.addColorStop(a/6,`hsl(${a*60},70%,72%)`);e.strokeStyle=r,e.lineWidth=s.width,e.beginPath(),e.moveTo(s.base.x,s.base.y),e.lineTo(s.top.x,s.top.y),e.stroke();let o=s.width*1.1;e.fillStyle="#ffd36a",e.beginPath();for(let a=0;a<8;a++){let l=a/8*Math.PI*2-Math.PI/2,c=a%2?o*.42:o;e.lineTo(s.top.x+Math.cos(l)*c,s.top.y+Math.sin(l)*c)}e.closePath(),e.fill(),n(t.left,"#7a5230"),n(t.right,"#7a5230"),n(t.front,"#8a5e38"),n(t.eraser.front,"#5b6670"),n(t.eraser.top,"#6c7882")}#y(t){let{ctx:e,rig:n,view:s}=this;for(let r of t.marks.slice(0,6)){if(!r.target)continue;let o=this.views.get(r.for);if(!o)continue;let a=this.description.cardScale*(o.person.size??1),l={x:r.X,z:r.Z,lift:r.pose.lift,lean:r.pose.lean,yaw:r.pose.yaw,pitch:r.pose.pitch,grip:0,scale:a,breathe:1,squash:1};if(this.#m(l,o,Of(l,n,s,{stickLen:0}),{ghost:!0}),r.label){let c=us(n,s,{X:r.X,Y:r.pose.lift+o.h*a+40,Z:r.Z}),h=this.#x(r.label),d=260*c.k*s.s;this.#r([1,0,0,1,0,0]),e.drawImage(h,c.x-d/2,c.y-d*96/512/2,d,d*96/512)}}for(let r of t.cards){let o=r.emote;if(!o||o.opacity<=.01)continue;let a=this.#i(o.id),l=this.views.get(r.id);if(!a||!l)continue;let c=r.scale??1,h=us(n,s,{X:r.x+74*c,Y:(r.lift??0)+(this.skin.stick?.length??134)*c*(r.grip??0)+l.h*c*(r.breathe??1)+36,Z:r.z+30}),d=96*o.pop*h.k*s.s,u=.96*h.k*s.s,f=(o.r??0)*Math.PI/180,x=h.x+(o.x??0)*u,g=h.y+(o.y??0)*u+(sr-.5)*d;this.#r([Math.cos(f),Math.sin(f),-Math.sin(f),Math.cos(f),x,g]),e.globalAlpha=o.opacity,e.drawImage(a,-d/2,-sr*d,d,d),e.globalAlpha=1}}#x(t){return this.labelImages.has(t)||this.labelImages.set(t,gh(t)),this.labelImages.get(t)}#_(t){let{ctx:e,rig:n,view:s}=this,r=t.t,o=this.skin.size.h*this.description.cardScale*.5+60;this.#r([1,0,0,1,0,0]);let a=0;for(let l of t.bonks){let c=r-l.t;if(c<0||c>Px)continue;let h=us(n,s,{X:l.x,Y:o+10,Z:l.Z+90});if(c<Cx&&a++<3){let d=c/Cx,u=(120+150*Math.sqrt(d))*h.k*s.s;e.save(),e.translate(h.x,h.y),e.rotate(.2*d),e.globalAlpha=1-d*d,e.drawImage(this.impact,-u/2,-u/2,u,u),e.restore()}if(!this.calm){if(c<Rx&&this.#v(l.t)){let d=260*h.k*s.s,u=.4*(1-c/Rx)**2,f=e.createRadialGradient(h.x,h.y,0,h.x,h.y,d);f.addColorStop(0,`rgba(255,226,168,${u})`),f.addColorStop(1,"rgba(255,226,168,0)"),e.globalCompositeOperation="lighter",e.fillStyle=f,e.fillRect(h.x-d,h.y-d,d*2,d*2),e.globalCompositeOperation="source-over"}if(l===t.bonks[t.bonks.length-1]){e.globalCompositeOperation="lighter",e.fillStyle="#ffd98a",e.globalAlpha=Math.max(0,1-c/Px);for(let d=0;d<Ix;d++){let u=d/Ix*Math.PI*2+d%5*.37,f=260+d*53%340,x=us(n,s,{X:l.x+Math.cos(u)*f*c,Y:Math.max(2,o+Math.sin(u)*f*.8*c+120*c-900*c*c),Z:l.Z+90});e.beginPath(),e.arc(x.x,x.y,Math.max(1.2,3*x.k*s.s),0,Math.PI*2),e.fill()}e.globalCompositeOperation="source-over"}e.globalAlpha=1}}e.globalAlpha=1}#v(t){return this.flashes.includes(t)?!0:(this.flashes=this.flashes.filter(e=>t-e<1),this.flashes.length>=Aw?!1:(this.flashes.push(t),!0))}pick(t,e){if(!this.ready)return null;for(let n=this.order.length-1;n>=0;n--){let s=this.order[n];if(s.kind==="card"){let r=Sx(s.pl,s.c,s.v,t,e);if(r!==null)return{kind:"card",id:s.c.id,point:{x:0,y:r,z:s.c.z}}}else if(s.kind==="box"){let r=Ax(s.layout,t,e);if(r)return{...r,point:{x:0,y:0,z:s.z}}}}return null}paintingAt(t,e){return this.rig?bx(this.rig,this.view,t,e):null}floorAt(t,e,n=0){return this.rig?Mx(this.rig,this.view,t,e,n):null}project(t){return us(this.rig,this.view,t)}setChalkTiles(t,e,n=!1){let s=t!==this.chalkWall;if(this.chalkWall=t,n||s){this.revision++;return}for(let r of e)this.chalkDirty.add(r)}setChalkHidden(t){this.hidden=!!t}setChalkBox(t){this.boxShown=!!t}setChalkBoxAt(t){this.boxAt=[t[0],t[1]],this.boxCache=null}paintingColour(t,e){return Gh(this.painting,t,e)}async capture(){return new Promise(t=>this.canvas.toBlob(t,"image/png"))}stats(){return{calls:this.draws,triangles:0,textures:0,geometries:0,tracked:this.views.size}}unmount(){this.canvas?.remove()}dispose(){this.disposed||(this.disposed=!0,this.views.clear(),this.order=[],this.unmount())}};var Bf="module.stagecraft";function kx(i){let t=(e,n)=>i(e,n);return game.socket.on(Bf,t),{send:e=>game.socket.emit(Bf,e),close:()=>game.socket.off(Bf,t)}}var Pw=45,Iw=5e3,Lx="stagecraft.chalk.prefs",jh=()=>`${(game.user?.id??"x").slice(0,6)}${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;function kw(){try{return JSON.parse(globalThis.localStorage?.getItem(Lx)??"null")??{}}catch{return{}}}function Lw(i){try{globalThis.localStorage?.setItem(Lx,JSON.stringify(i))}catch{}}var Kh=class{constructor({host:t,store:e,makeWall:n=o=>new Hh(o),encode:s=ax,send:r=()=>{}}){this.host=t,this.store=e,this.sceneId=t.scene.id,this.send=r,this.encode=s,this.pointerListeners=new Set,this.grid=Mf(t.description.painting),this.wall=n({grid:this.grid,onChange:a=>this.host.backend?.setChalkTiles?.(this.wall,a)}),this.wall.warmUp?.();let o=kw();this.colour=Fs(o.colour)??On.white,this.recent=(o.recent??[]).map(Fs).filter(Boolean).slice(0,10),this.sizes={...Object.fromEntries(Object.entries(Me).map(([a,l])=>[a,l.size.initial])),...o.sizes??{}},this.steady=Number.isInteger(o.steady)?Math.max(0,Math.min(io.length-1,o.steady)):1,this.magic={rainbow:!1,glow:!0,sparkle:!1,...o.magic??{}},this.tool=null,this.drawing=null,this.lastEnd=null,this.redoSteps=[],this.keeping=Promise.resolve(),this.remote=new Map,this.loading=new Map,this.listeners=new Set,this.unsubscribe=e.onChange((a,l)=>{a===null?(this.refresh(),this.sync()):a===this.sceneId&&this.#s(l)})}stop(){this.unsubscribe?.(),this.putAway();for(let t of this.remote.values())clearTimeout(t.timer);this.remote.clear(),this.listeners.clear(),this.pointerListeners.clear(),clearTimeout(this.flashTimer)}onPointer(t){return this.pointerListeners.add(t),()=>this.pointerListeners.delete(t)}#t(t){for(let e of this.pointerListeners)e(t)}reset(){this.putAway(),this.host.backend?.setChalkTiles?.(this.wall,new Set(this.wall.keys()),!0)}onHand(t){return this.listeners.add(t),()=>this.listeners.delete(t)}#e(){for(let t of this.listeners)t()}policy(){let t=this.host.scene.flags?.[J]?.live?.chalk??null;return Lh(this.host.description.chalk,t)}get usable(){return this.store.ready&&$0(this.policy(),this.host.description.zones)}refresh(){let t=this.policy(),e=this.usable;return this.host.backend.setChalkBox(e),(!e||t.locked)&&this.putAway(),this.host.backend.setChalkHidden(this.host.scene.flags?.[J]?.live?.chalkHidden===!0),this.wall.setMask(Z0(t,this.host.description.zones)),t}chalkZones(){return this.policy().mode==="zones"?this.host.description.zones.filter(t=>t.kind==="chalk"):[]}sync(){let t=this.store.layers(this.sceneId);this.#n(t);for(let e of t)this.#i(e)}#n(t){let e=t.map(s=>({by:s.by,since:s.since})),n=this.wall.layers.get(game.user.id);n&&!e.some(s=>s.by===game.user.id)&&e.push({by:n.by,since:n.since}),this.wall.setLayers(e)}#i(t){let e=this.wall.layers.get(t.by),n=new Set([...Object.keys(t.tiles),...e?[...e.sources.keys()]:[]]),s=[];for(let o of n){let a=t.tiles[o]??null;this.wall.sourceOf(t.by,o)!==a&&s.push(this.wall.setTile(t.by,o,a).catch(l=>console.warn(`${J} | a tile of chalk could not be shown`,l)))}let r=Promise.all(s);return this.loading.set(t.by,r),r.then(()=>{this.loading.get(t.by)===r&&this.loading.delete(t.by),this.#r()}),r}#s(t){let e=this.store.layers(this.sceneId),n=e.find(s=>s.by===t);if(!n){this.sync();return}(!this.wall.layers.has(t)||this.wall.layers.get(t).since!==n.since)&&this.#n(e),this.#i(n)}#r(){if(!this.remote.size)return;let t=new Map(this.store.layers(this.sceneId).map(e=>[e.by,e]));for(let[e,n]of this.remote){if(!n.ended)continue;n.layers.every(r=>!this.loading.has(r)&&Object.keys(t.get(r)?.history??{}).some(o=>o.endsWith(`-${e}`)))&&this.#p(e)}}get inHand(){return this.tool}take(t){if(!this.usable)return;if(t==="rub")return this.choose(this.tool==="eraser"?null:"eraser");if(t==="magic")return this.choose(this.tool==="magic"?null:"magic");let e=On[t];if(e){if(this.tool==="chalk"&&this.colour===e)return this.putAway();this.setColour(e),this.choose("chalk")}}choose(t){if(!t)return this.putAway();!Me[t]||!this.usable||(this.drawing&&this.cancel(),this.tool=t,this.host.root?.classList.add("stagecraft-chalk"),this.#e())}putAway(){this.drawing&&this.cancel(),this.tool=null,this.cursorZone=null,this.blocked=!1,this.pointer=null,this.host?.root?.classList.remove("stagecraft-chalk"),this.#c(null),this.#t(null),this.#e()}setColour(t,{remember:e=!0}={}){let n=Fs(t);n&&(this.colour=n,e&&(this.recent=[n,...this.recent.filter(s=>s!==n)].slice(0,10)),this.#o(),this.#e())}setSize(t,e=this.tool){let n=Me[e];!n||n.kind==="fill"||(this.sizes[e]=Math.round(Math.max(n.size.min,Math.min(n.size.max,t))*10)/10,this.#o(),this.#e())}nudgeSize(t){let e=this.sizes[this.tool];Number.isFinite(e)&&this.setSize(e+t*Math.max(1,e*.15))}setSteady(t){this.steady=Math.max(0,Math.min(io.length-1,t)),this.#o(),this.#e()}setMagic(t){this.magic={...this.magic,...t},this.#o(),this.#e()}#o(){Lw({colour:this.colour,recent:this.recent,sizes:this.sizes,steady:this.steady,magic:this.magic})}scale(t){let e=this.host.backend.paintingAt(t.x,t.y),n=this.host.backend.paintingAt(t.x+40,t.y);if(!e||!n)return null;let s=Math.hypot((n.x-e.x)*this.grid.w,(n.y-e.y)*this.grid.h);return s>0?40/s:null}hover(t){if(!this.tool)return;if(this.pointer=t,!t){this.#c(null),this.#t(null);return}let e=this.host.backend.paintingAt(t.x,t.y);this.cursorZone=e?this.chalkZones().find(n=>gi(n.shape,e.x,e.y))?.id??null:null,this.blocked=Me[this.tool].kind!=="erase"&&!(e&&Tf(this.policy(),this.host.description.zones,e.x,e.y)),this.flashTimer||this.#c(this.blocked&&!this.drawing?t:null),this.#t(t)}#c(t,e=null){let n=this.host?.root;if(typeof n?.querySelector!="function"||typeof document>"u")return;let s=n.querySelector(".stagecraft-chalk-hint");if(!t){s&&(s.hidden=!0);return}s||(s=document.createElement("div"),s.className="stagecraft-chalk-hint",n.append(s));let r=this.chalkZones().map(o=>o.name).filter(Boolean);s.textContent=e??(r.length?game.i18n.format("STAGECRAFT.Chalk.OnlyOn",{where:r.join(", ")}):game.i18n.localize("STAGECRAFT.Chalk.NotHere")),s.style.left=`${Math.round(t.x+22)}px`,s.style.top=`${Math.round(t.y+18)}px`,s.hidden=!1}flash(t,e){this.#c(t,e),clearTimeout(this.flashTimer),this.flashTimer=setTimeout(()=>{this.flashTimer=null,this.#c(null)},1800)}#a(t){let e=this.host.backend.paintingAt(t.x,t.y);return e?bf(this.grid,e.x,e.y):null}painterAt(t){let e=this.#a(t),n=e?this.wall.whoAt(e.x,e.y):null;return n?game.users.get(n)?.name??n:null}painters(){return this.store.layers(this.sceneId).map(t=>({by:t.by,name:game.users.get(t.by)?.name??t.by,tiles:Object.keys(t.tiles).length})).filter(t=>t.tiles>0).sort((t,e)=>e.tiles-t.tiles)}begin(t){if(!this.tool||!this.usable||this.policy().locked||this.drawing)return!1;let e=this.#a(t);if(!e)return!1;if(t.alt)return this.pickColour(t),!1;let n=t.flip?"eraser":this.tool,s=Me[n];if(s.kind==="fill")return this.#g(e,t),!1;if(t.shift&&this.lastEnd)return this.#m(this.lastEnd,e,n),!1;let r=jh(),o=Af(r),a=this.sizes[n],l={tool:n,size:a,steady:io[this.steady],seed:o},c=s.kind==="erase"&&game.user.isGM===!0,h=s.magic?{...this.magic}:null;return this.wall.begin({id:r,by:game.user.id,tool:n,colour:this.colour,magic:h,everyone:c}),this.drawing={id:r,stroke:new no(l),feel:new Uh,opts:l,everyone:c,unsent:[],timer:null,at:e},this.send({type:"chalk",op:"begin",scene:this.sceneId,id:r,tool:n,colour:this.colour,magic:h,everyone:c,size:a,steady:l.steady,seed:o}),this.extend(t),!0}extend(t){let e=this.drawing;if(!e)return;let n=this.#a(t);if(!n)return;let s=e.feel.pressure({x:n.x,y:n.y,t:t.t??performance.now(),pressure:t.pressure,pointerType:t.pointerType}),r={x:Math.round(n.x*10)/10,y:Math.round(n.y*10)/10,p:Math.round(s*100)/100};e.at=n,this.wall.paint(e.id,e.stroke.add(r)),e.unsent.push(r),e.timer??=setTimeout(()=>this.#h(),Pw)}#h(){let t=this.drawing;t&&(t.timer=null,t.unsent.length&&(this.send({type:"chalk",op:"more",scene:this.sceneId,id:t.id,s:t.unsent.flatMap(e=>[e.x,e.y,e.p])}),t.unsent=[]))}end(){let t=this.drawing;if(!t)return Promise.resolve();this.wall.paint(t.id,t.stroke.finish()),clearTimeout(t.timer),this.#h(),this.drawing=null,this.lastEnd=t.at;let e=Pa(this.wall.strokes.get(t.id)?.dabs??[]);return this.#u(this.#l(this.wall.commit(t.id)),t.id,e,t.opts.tool,{live:!0})}cancel(){let t=this.drawing;if(!t)return;clearTimeout(t.timer),this.drawing=null,this.send({type:"chalk",op:"cancel",scene:this.sceneId,id:t.id});let e=this.wall.strokes.get(t.id)?.touched??new Set;this.wall.drop(t.id),Me[t.opts.tool].kind==="smudge"&&this.wall.revert(game.user.id,e).catch(()=>{})}#l(t){let e=t.painted===!0;return[...t].map(([n,s])=>[n,[...s].map(([r,o])=>[r,Promise.resolve(this.encode(o,e))])])}#u(t,e,n,s,{live:r=!1}={}){let o=this.keeping.then(async()=>{let a=await this.#d(t);r&&this.send({type:"chalk",op:"end",scene:this.sceneId,id:e,layers:a.map(([l])=>l)}),await this.#f(a,e,n,s)});return this.keeping=o.catch(a=>console.warn(`${J} | chalk could not be kept`,a)),o}async#d(t){let e=[];for(let[n,s]of t){let r=await Promise.all(s.map(async([l,c])=>[l,await c])),o={},a={};for(let[l,c]of r){let h=this.wall.sourceOf(n,l);c!==h&&(a[l]=h,o[l]=c)}Object.keys(o).length&&e.push([n,o,a])}return e}async#f(t,e,n=null,s=this.tool){if(!t.length)return;let r=Date.now(),o={id:Sf(r,e),at:r};this.redoSteps=[];for(let[c,h,d]of t){for(let[u,f]of Object.entries(h))this.wall.noteSource(c,u,f);try{await this.store.save(this.sceneId,{by:c,tiles:h,step:o,grid:this.grid})}catch(u){console.warn(`${J} | chalk could not be kept`,u);for(let[f,x]of Object.entries(d))this.wall.noteSource(c,f,x);await this.wall.revert(c,Object.keys(d))}}let a=this.grid,l=n?{x0:Math.max(0,n.x0/a.w),y0:Math.max(0,n.y0/a.h),x1:Math.min(1,n.x1/a.w),y1:Math.min(1,n.y1/a.h)}:null;Hooks.callAll("stagecraft.chalk",{type:"chalk",scene:this.sceneId,by:game.user.id,tool:s,colour:this.colour,bounds:l})}#m(t,e,n=this.tool){let s=Me[n];if(s.kind==="smudge")return null;let r=jh(),o={tool:n,size:this.sizes[n],seed:Af(r)},a=K0({...t,p:.8},{...e,p:.8},o);this.wall.begin({id:r,by:game.user.id,tool:n,colour:this.colour,magic:s.magic?{...this.magic}:null,everyone:s.kind==="erase"&&game.user.isGM===!0}),this.wall.paint(r,a),this.lastEnd=e;let l=Pa(a);return this.#u(this.#l(this.wall.commit(r)),r,l,n).catch(()=>{}),l}#g(t,e){let n=this.wall.fill({x:t.x,y:t.y,by:game.user.id,colour:this.colour});if(!n.ok){this.flash(e,game.i18n.localize(n.reason==="open"?"STAGECRAFT.Chalk.FillOpen":"STAGECRAFT.Chalk.FillOnPaint"));return}this.#u(this.#l(new Map([[game.user.id,n.changed]])),jh(),{x0:t.x-1,y0:t.y-1,x1:t.x+1,y1:t.y+1}).catch(()=>{})}pickColour(t){let e=this.host.backend.paintingAt(t.x,t.y);if(!e)return null;let n=bf(this.grid,e.x,e.y),s=this.wall.pick(n.x,n.y)??this.host.backend.paintingColour?.(e.x,e.y)??null;return s&&(this.setColour(s),this.flash(t,game.i18n.format("STAGECRAFT.Chalk.Picked",{colour:s}))),s}async undo(){this.drawing&&this.cancel(),await this.keeping;let t=await this.store.undo(this.sceneId,{by:game.user.id});return t?(this.redoSteps.push(t.layers),!0):!1}async redo(){await this.keeping;let t=this.redoSteps.pop();if(!t)return!1;let e=Date.now(),n={id:Sf(e,jh()),at:e};for(let[s,r]of Object.entries(t))await this.store.save(this.sceneId,{by:s,tiles:r,step:n,grid:this.grid});return!0}receive(t,e){if(!(!t||t.scene!==this.sceneId||e===game.user.id))if(t.op==="begin"){if(!Me[t.tool]||Me[t.tool].kind==="smudge"||Me[t.tool].kind==="fill"||this.remote.has(t.id)||typeof t.id!="string")return;let n=e,s=t.everyone===!0&&game.users?.get(e)?.isGM===!0;this.wall.begin({id:t.id,by:n,tool:t.tool,colour:Fs(t.colour)??On.white,magic:t.magic??null,everyone:s,live:!0});let r=new no({tool:t.tool,size:Number(t.size)||void 0,steady:Number(t.steady)||0,seed:Number(t.seed)>>>0});this.remote.set(t.id,{by:n,stroke:r,ended:!1,layers:[],timer:setTimeout(()=>this.#p(t.id),6e4)})}else if(t.op==="more"){let n=this.remote.get(t.id);if(!n||n.ended||!Array.isArray(t.s))return;let s=[];for(let r=0;r+2<t.s.length;r+=3)s.push(...n.stroke.add({x:Number(t.s[r]),y:Number(t.s[r+1]),p:Number(t.s[r+2])}));this.wall.paint(t.id,s)}else if(t.op==="end"){let n=this.remote.get(t.id);if(!n||n.ended)return;this.wall.paint(t.id,n.stroke.finish()),n.ended=!0,n.layers=(Array.isArray(t.layers)?t.layers:[n.by]).filter(s=>typeof s=="string"),clearTimeout(n.timer),n.timer=setTimeout(()=>this.#p(t.id),Iw),this.#r()}else t.op==="cancel"&&this.#p(t.id)}#p(t){let e=this.remote.get(t);e&&(clearTimeout(e.timer),this.remote.delete(t),this.wall.drop(t))}allowedAt(t){return Tf(this.policy(),this.host.description.zones,t.x,t.y)}};var Dx="stagecraft.chalk.kit",Ke=(i,t)=>t?game.i18n.format(i,t):game.i18n.localize(i),nn=i=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${i}</svg>`,mi=Object.freeze({chalk:nn('<path d="M6.5 17.5 16 8" stroke-width="4.2"/><circle cx="4.2" cy="20.2" r=".8" fill="currentColor" stroke="none"/><circle cx="3.2" cy="17.6" r=".6" fill="currentColor" stroke="none"/><circle cx="6.4" cy="21.4" r=".6" fill="currentColor" stroke="none"/>'),magic:nn('<path d="M4.5 19.5 14 10" stroke-width="2.6"/><path d="M17.5 2.8l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" fill="currentColor" stroke="none"/><circle cx="20" cy="12.5" r=".9" fill="currentColor" stroke="none"/><circle cx="11.5" cy="4.5" r=".8" fill="currentColor" stroke="none"/>'),pencil:nn('<path d="M4 20l1.4-4.6L15.6 5.2a1.6 1.6 0 0 1 2.3 0l.9.9a1.6 1.6 0 0 1 0 2.3L8.6 18.6z"/><path d="M13.8 7l3.2 3.2M4 20l3.1-.9"/>'),brush:nn('<path d="M20.5 3.5 11.8 12.2"/><path d="M11 13l-1.6-1.6"/><path d="M9.4 11.4c-2.6-.4-4.6 1.6-4.6 4 0 1.3-.9 2.6-2.3 2.9 3 1.6 8 .6 8.6-3.6.2-1.4-.4-2.6-1.7-3.3z" fill="currentColor" fill-opacity=".3"/>'),spray:nn('<rect x="5.5" y="9" width="8" height="12" rx="2"/><path d="M8 9V6.5h3V9M9.5 6.5V4.5"/><circle cx="16.5" cy="5" r=".8" fill="currentColor" stroke="none"/><circle cx="19" cy="7.5" r=".8" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10" r=".8" fill="currentColor" stroke="none"/><circle cx="20" cy="4" r=".7" fill="currentColor" stroke="none"/>'),smudge:nn('<path d="M3 16c2.6-3.4 4.4 1.6 7-1.6s4.4 1.6 7-1.6" stroke-width="2.4" opacity=".55"/><path d="M14 13.5V6a1.6 1.6 0 0 1 3.2 0v5"/><path d="M17.2 9.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.4"/>'),fill:nn('<path d="M4.5 11.5 11 5l6.6 6.6-6.5 6.5a1.6 1.6 0 0 1-2.2 0l-4.4-4.4a1.6 1.6 0 0 1 0-2.2z"/><path d="M4.6 12.2h12.6"/><path d="M20 14.5c.9 1.4 1.4 2.3 1.4 3a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.6 1.4-3z" fill="currentColor"/>'),eraser:nn('<path d="M8 20h12"/><path d="M5.2 15.6 13.6 7.2a1.8 1.8 0 0 1 2.5 0l3.3 3.3a1.8 1.8 0 0 1 0 2.5L12.5 20H9.6z"/><path d="M9.2 11.6l5.6 5.6"/>'),pick:nn('<path d="M14.5 4.5l5 5-2.2 2.2-5-5z" fill="currentColor" fill-opacity=".35"/><path d="M13.4 8.6 5.5 16.5 4 20l3.5-1.5 7.9-7.9"/>'),undo:nn('<path d="M9 6 4.5 10.5 9 15"/><path d="M4.5 10.5H15a5 5 0 0 1 0 10h-2"/>'),redo:nn('<path d="M15 6l4.5 4.5L15 15"/><path d="M19.5 10.5H9a5 5 0 0 0 0 10h2"/>'),steady:nn('<circle cx="6" cy="18" r="2.2" fill="currentColor" stroke="none"/><path d="M8 16 14.8 9.2" stroke-dasharray="1.6 2.2"/><circle cx="17" cy="7" r="3"/>'),rainbow:nn('<path d="M3 17a9 9 0 0 1 18 0" stroke="#e86a6a"/><path d="M6 17a6 6 0 0 1 12 0" stroke="#e8c96a"/><path d="M9 17a3 3 0 0 1 6 0" stroke="#7ac0e0"/>'),glow:nn('<circle cx="12" cy="12" r="3.5" fill="currentColor"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>'),sparkle:nn('<path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" fill="currentColor" fill-opacity=".35"/><path d="M19 16l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" fill="currentColor" stroke="none"/>'),close:nn('<path d="M6 6l12 12M18 6 6 18"/>'),grip:nn('<circle cx="9" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="17" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="1.2" fill="currentColor" stroke="none"/>')}),Dw=(i,t)=>Math.round(100*Math.log(i/t.size.min)/Math.log(t.size.max/t.size.min)),Nw=(i,t)=>Math.round(t.size.min*(t.size.max/t.size.min)**(i/100)*10)/10,Jh=class{constructor(t,e){this.host=t,this.chalk=e,this.open=null,this.alt=!1,this.#t(),this.offHand=e.onHand(()=>this.refresh()),this.offPointer=e.onPointer(n=>this.#l(n)),this.refresh()}dispose(){this.offHand?.(),this.offPointer?.(),window.removeEventListener("keydown",this.#a,!0),window.removeEventListener("keyup",this.#h,!0),this.el?.remove(),this.ring?.remove(),this.el=this.ring=null}#t(){let t=document.createElement("div");t.className="stagecraft-kit",t.setAttribute("role","toolbar"),t.setAttribute("aria-label",Ke("STAGECRAFT.Kit.Label"));let e=r=>`<button type="button" class="kit-tool" data-tool="${r}" title="${Ke(`STAGECRAFT.Kit.Tool.${r}`)}">${mi[r]}</button>`;t.innerHTML=`
      <div class="kit-grip" title="${Ke("STAGECRAFT.Kit.Move")}">${mi.grip}</div>
      <div class="kit-group">${Fh.map(e).join("")}</div>
      <div class="kit-group">
        <button type="button" class="kit-well" data-act="colour" title="${Ke("STAGECRAFT.Kit.Colour")}"><span></span></button>
        <button type="button" class="kit-size" data-act="size" title="${Ke("STAGECRAFT.Kit.Size")}"><span></span></button>
        <button type="button" data-act="steady" title="">${mi.steady}<b></b></button>
        <button type="button" data-act="pick" title="${Ke("STAGECRAFT.Kit.Pick")}">${mi.pick}</button>
      </div>
      <div class="kit-group kit-magic">
        <button type="button" data-magic="rainbow" title="${Ke("STAGECRAFT.Kit.Rainbow")}">${mi.rainbow}</button>
        <button type="button" data-magic="glow" title="${Ke("STAGECRAFT.Kit.Glow")}">${mi.glow}</button>
        <button type="button" data-magic="sparkle" title="${Ke("STAGECRAFT.Kit.Sparkle")}">${mi.sparkle}</button>
      </div>
      <div class="kit-group">
        <button type="button" data-act="undo" title="${Ke("STAGECRAFT.Kit.Undo")}">${mi.undo}</button>
        <button type="button" data-act="redo" title="${Ke("STAGECRAFT.Kit.Redo")}">${mi.redo}</button>
        <button type="button" data-act="close" title="${Ke("STAGECRAFT.Kit.Close")}">${mi.close}</button>
      </div>
      <div class="kit-pop kit-pop-colour" hidden>
        <canvas class="kit-sv" width="176" height="120"></canvas>
        <canvas class="kit-hue" width="176" height="14"></canvas>
        <div class="kit-row"><input class="kit-hex" type="text" maxlength="7" spellcheck="false" aria-label="${Ke("STAGECRAFT.Kit.Hex")}"><span class="kit-now"></span></div>
        <div class="kit-swatches"></div>
        <div class="kit-recent"></div>
      </div>
      <div class="kit-pop kit-pop-size" hidden>
        <input class="kit-range" type="range" min="0" max="100" step="1" aria-label="${Ke("STAGECRAFT.Kit.Size")}">
        <span class="kit-size-n"></span>
      </div>`,this.host.root.append(t),this.el=t,t.addEventListener("click",this.#o),t.addEventListener("wheel",this.#c,{passive:!1}),t.addEventListener("pointerdown",r=>r.stopPropagation()),this.#i(),this.#s();let n=t.querySelector(".kit-range");n.addEventListener("input",()=>this.chalk.setSize(Nw(Number(n.value),Me[this.chalk.tool])));let s=t.querySelector(".kit-swatches");s.innerHTML=Object.entries(On).map(([r,o])=>`<button type="button" class="kit-swatch" data-colour="${o}" title="${Ke(`STAGECRAFT.Kit.Colours.${r}`)}" style="--c:${o}"></button>`).join("")+["#1c1a17","#e2483c","#3f7fe0","#8a4fd8"].map(r=>`<button type="button" class="kit-swatch" data-colour="${r}" style="--c:${r}" title="${r}"></button>`).join(""),this.ring=document.createElement("div"),this.ring.className="stagecraft-chalk-cursor",this.ring.hidden=!0,this.ring.innerHTML='<i class="ring"></i><i class="tick across"></i><i class="tick down"></i><i class="cross"></i><i class="dot"></i><i class="strike"></i>',this.host.root.append(this.ring),window.addEventListener("keydown",this.#a,!0),window.addEventListener("keyup",this.#h,!0),this.#n(this.#e())}#e(){try{return JSON.parse(globalThis.localStorage?.getItem(Dx)??"null")}catch{return null}}#n(t){let e=this.host.root.getBoundingClientRect(),n=this.el.offsetWidth||86,s=this.el.offsetHeight||440,r=Math.max(4,Math.min(e.width-n-4,t?.x??96)),o=Math.max(4,Math.min(e.height-s-4,t?.y??Math.min(96,(e.height-s)*.4)));this.el.style.left=`${r}px`,this.el.style.top=`${o}px`,this.el.classList.toggle("kit-right",r+n/2>e.width/2),this.at={x:r,y:o,set:t?.x!==void 0}}#i(){let t=this.el.querySelector(".kit-grip"),e=null;t.addEventListener("pointerdown",s=>{e={x:s.clientX,y:s.clientY,at:{...this.at}},t.setPointerCapture(s.pointerId),s.preventDefault()}),t.addEventListener("pointermove",s=>{e&&this.#n({x:e.at.x+s.clientX-e.x,y:e.at.y+s.clientY-e.y})});let n=()=>{if(e){e=null;try{globalThis.localStorage?.setItem(Dx,JSON.stringify(this.at))}catch{}}};t.addEventListener("pointerup",n),t.addEventListener("pointercancel",n)}#s(){let t=this.el.querySelector(".kit-sv"),e=this.el.querySelector(".kit-hue"),n=this.el.querySelector(".kit-hex"),s=(r,o)=>{let a=!1,l=h=>{let d=r.getBoundingClientRect();o(Math.max(0,Math.min(1,(h.clientX-d.left)/d.width)),Math.max(0,Math.min(1,(h.clientY-d.top)/d.height)))};r.addEventListener("pointerdown",h=>{a=!0,r.setPointerCapture(h.pointerId),l(h),h.preventDefault()}),r.addEventListener("pointermove",h=>{a&&l(h)});let c=()=>{a&&(a=!1,this.chalk.setColour(this.chalk.colour))};r.addEventListener("pointerup",c),r.addEventListener("pointercancel",c)};s(t,(r,o)=>{let a=this.hsv??cs(this.chalk.colour);this.hsv={h:a.h,s:r,v:1-o},this.chalk.setColour(Ia(this.hsv),{remember:!1})}),s(e,r=>{let o=this.hsv??cs(this.chalk.colour);this.hsv={h:r*359.9,s:Math.max(.15,o.s),v:Math.max(.2,o.v)},this.chalk.setColour(Ia(this.hsv),{remember:!1})}),n.addEventListener("change",()=>{let r=Fs(n.value);r&&(this.hsv=cs(r),this.chalk.setColour(r))}),n.addEventListener("keydown",r=>{r.stopPropagation(),r.key==="Enter"&&n.blur()})}#r(){let t=this.el.querySelector(".kit-sv"),e=this.hsv??cs(this.chalk.colour),n=this.el.querySelector(".kit-hue"),s=n.getContext("2d"),r=s.createLinearGradient(0,0,n.width,0);for(let d=0;d<=6;d++)r.addColorStop(d/6,`hsl(${d*60},100%,50%)`);s.fillStyle=r,s.fillRect(0,0,n.width,n.height),s.lineWidth=2,s.strokeStyle="#111",s.strokeRect(e.h/360*n.width-2,1,4,n.height-2),s.strokeStyle="#fff",s.lineWidth=1,s.strokeRect(e.h/360*n.width-2,1,4,n.height-2);let o=t.getContext("2d"),{width:a,height:l}=t;o.fillStyle=Ia({h:e.h,s:1,v:1}),o.fillRect(0,0,a,l);let c=o.createLinearGradient(0,0,a,0);c.addColorStop(0,"#fff"),c.addColorStop(1,"rgba(255,255,255,0)"),o.fillStyle=c,o.fillRect(0,0,a,l);let h=o.createLinearGradient(0,0,0,l);h.addColorStop(0,"rgba(0,0,0,0)"),h.addColorStop(1,"#000"),o.fillStyle=h,o.fillRect(0,0,a,l),o.lineWidth=2,o.strokeStyle=e.v>.55?"#111":"#fff",o.beginPath(),o.arc(e.s*a,(1-e.v)*l,5,0,Math.PI*2),o.stroke()}refresh(){if(!this.el)return;let t=this.chalk,e=t.tool,n=this.el.hidden;this.el.hidden=!e,e?n&&this.#n(this.at?.set?this.at:null):(this.open=null,this.picking=!1,this.#l(null));for(let u of this.el.querySelectorAll(".kit-tool"))u.classList.toggle("on",u.dataset.tool===e);let s=Me[e]??null,r=s&&!["erase","smudge"].includes(s.kind);this.el.querySelector(".kit-well").style.setProperty("--c",t.colour),this.el.querySelector(".kit-well").disabled=!r;let o=s&&s.kind!=="fill",a=t.sizes[e]??0;this.el.querySelector(".kit-size span").style.setProperty("--d",`${Math.max(3,Math.min(26,3+Math.sqrt(a)*3.2))}px`),this.el.querySelector(".kit-size").disabled=!o;let c=this.el.querySelector('[data-act="steady"]');c.title=Ke("STAGECRAFT.Kit.Steady",{level:Ke(`STAGECRAFT.Kit.SteadyLevel.${t.steady}`)}),c.querySelector("b").textContent=t.steady?String(t.steady):"",c.classList.toggle("on",t.steady>0);let h=this.el.querySelector(".kit-magic");h.hidden=e!=="magic";for(let u of h.querySelectorAll("[data-magic]"))u.classList.toggle("on",!!t.magic[u.dataset.magic]);this.el.querySelector('[data-act="pick"]').classList.toggle("on",this.picking===!0);for(let u of this.el.querySelectorAll(".kit-pop"))u.hidden=!0;let d=(u,f)=>{u.hidden=!1,u.style.top=`${Math.max(0,f.offsetTop-10)}px`};if(this.open==="colour"&&r){d(this.el.querySelector(".kit-pop-colour"),this.el.querySelector(".kit-well"));let u=this.el.querySelector(".kit-hex");document.activeElement!==u&&(u.value=t.colour),this.el.querySelector(".kit-now").style.setProperty("--c",t.colour),this.el.querySelector(".kit-recent").innerHTML=t.recent.map(f=>`<button type="button" class="kit-swatch" data-colour="${f}" style="--c:${f}" title="${f}"></button>`).join(""),this.#r()}else this.open==="size"&&o&&(d(this.el.querySelector(".kit-pop-size"),this.el.querySelector(".kit-size")),this.el.querySelector(".kit-range").value=String(Dw(a,s)),this.el.querySelector(".kit-size-n").textContent=Ke("STAGECRAFT.Kit.SizePx",{n:a}));t.pointer&&this.#l(t.pointer)}#o=t=>{let e=t.target.closest("button");if(!e||e.disabled)return;let n=this.chalk;if(e.dataset.tool){this.picking=!1,n.choose(e.dataset.tool);return}if(e.dataset.colour){this.hsv=cs(e.dataset.colour),n.setColour(e.dataset.colour);return}if(e.dataset.magic){n.setMagic({[e.dataset.magic]:!n.magic[e.dataset.magic]});return}let s=e.dataset.act;s==="colour"||s==="size"?(this.open=this.open===s?null:s,this.hsv=cs(n.colour),this.refresh()):s==="steady"?n.setSteady((n.steady+1)%io.length):s==="pick"?(this.picking=!this.picking,this.refresh()):s==="undo"?n.undo().catch(()=>{}):s==="redo"?n.redo().catch(()=>{}):s==="close"&&n.putAway()};#c=t=>{t.target.closest(".kit-size, .kit-pop-size")&&(t.preventDefault(),this.chalk.nudgeSize(t.deltaY<0?1:-1))};#a=t=>{let e=this.chalk;if(!e.tool||t.target?.closest?.("input, textarea, [contenteditable]"))return;if(t.key==="Alt"){this.alt=!0,e.pointer&&this.#l(e.pointer);return}let n=!0;t.key==="["?e.nudgeSize(-1):t.key==="]"?e.nudgeSize(1):(t.ctrlKey||t.metaKey)&&t.code==="KeyZ"?(t.shiftKey?e.redo():e.undo()).catch(()=>{}):(t.ctrlKey||t.metaKey)&&t.code==="KeyY"?e.redo().catch(()=>{}):n=!1,n&&(t.preventDefault(),t.stopPropagation())};#h=t=>{t.key==="Alt"&&(this.alt=!1,this.chalk.pointer&&this.#l(this.chalk.pointer))};takesPick(){let t=this.picking||this.alt;return this.picking&&(this.picking=!1,this.refresh()),t}#l(t){let e=this.ring;if(!e)return;let n=this.chalk;if(!t||!n.tool){e.hidden||(e.hidden=!0);return}let s=Me[n.tool],r=this.picking||this.alt||s.kind==="fill",o=r?0:Math.round(Math.max(1.5,(n.sizes[n.tool]??8)/2*(n.scale(t)??1))*2)/2,a=`${r}|${o}|${s.kind}|${n.blocked===!0}|${n.colour}`;if(a!==this.look){this.look=a;let l=["stagecraft-chalk-cursor"];r&&l.push("exact"),s.kind==="erase"&&l.push("erase"),n.blocked&&l.push("blocked"),!r&&["erase","smudge"].includes(s.kind)&&l.push("nodot"),!r&&o<6&&l.push("small"),e.className=l.join(" "),e.style.setProperty("--r",`${o}px`),e.style.setProperty("--c",n.colour)}e.hidden&&(e.hidden=!1),e.style.transform=`translate3d(${t.x}px, ${t.y}px, 0)`}};var Hs=Object.freeze({every:2e4,stale:75e3,fine:40,poor:24,window:300,gap:400}),Ow=Object.freeze(["lit","low","plain"]);function Ox(i,{gap:t=Hs.gap,least:e=10}={}){let n=(i??[]).filter(r=>Number.isFinite(r)&&r>0&&r<=t);if(n.length<e)return{fps:null,worst:null,n:n.length};let s=[...n].sort((r,o)=>r-o);return{fps:Math.round(1e3/s[Math.floor(s.length/2)]),worst:Math.round(s[s.length-1]),n:n.length}}var Uw=(i,t)=>i==="flat"||t==="flat"?"plain":t==="low"?"low":"lit";function Fw(i){let t=typeof i=="string"?i.trim():"",e=/^ANGLE \((.*)\)$/i.exec(t);if(e){let n=e[1].split(",").map(s=>s.trim());t=n.length>1?n[1]:n[0]}return t=t.replace(/\s*(Direct3D\d*|OpenGL|Metal|vs_\d_\d|ps_\d_\d|\(0x[0-9a-f]+\)).*$/i,"").replace(/\s{2,}/g," ").trim(),t.length>34?`${t.slice(0,33)}\u2026`:t}var ao=(i,t,e)=>(typeof i=="number"||typeof i=="string"&&i.trim()!=="")&&Number.isFinite(Number(i))?Math.max(t,Math.min(e,Math.round(Number(i)))):null,Bw=(i,t)=>typeof i=="string"?i.slice(0,t):"";function Hf(i){return{v:1,picture:Uw(i.backend,i.tier),fps:ao(i.stats?.fps,0,1e3),worst:ao(i.stats?.worst,0,6e4),probe:i.probe==null?null:Math.round(Number(i.probe)*10)/10,gpu:Fw(i.gpu),dpr:Math.round((Number(i.dpr)||1)*100)/100,size:[ao(i.size?.[0],0,2e4)??0,ao(i.size?.[1],0,2e4)??0],losses:ao(i.losses,0,99)??0,failures:ao(i.failures,0,9999)??0,hidden:i.hidden===!0,scene:Bw(i.scene,60)}}function Ux(i){return!i||i.type!=="health"||i.op==="ask"||i.v!==1||!Ow.includes(i.picture)?null:Hf({backend:i.picture==="plain"?"flat":"three",tier:i.picture==="low"?"low":i.picture==="plain"?"flat":"high",stats:{fps:i.fps,worst:i.worst},probe:i.probe,gpu:i.gpu,dpr:i.dpr,size:i.size,losses:i.losses,failures:i.failures,hidden:i.hidden,scene:i.scene})}function zw(i,t,e){return!i||e-t>Hs.stale?"stale":i.hidden?"idle":i.losses>=2||i.failures>0||i.fps!=null&&i.fps<Hs.poor?"bad":i.fps!=null&&i.fps<Hs.fine?"warn":i.picture==="plain"?"plain":"ok"}var zf=Object.freeze({lit:"lit",low:"low",plain:"plain"});function Hw({id:i,name:t},e,n){let s=zw(e?.report,e?.at??0,n),r=e?.report;if(!r||s==="stale")return{id:i,name:t,level:"stale",text:"no stage",tip:`${t}: not on a stage, or not heard from for a while`};let o=r.fps==null?"\u2026":`${r.fps} fps`,a=[`${t}: the ${zf[r.picture]} stage${r.fps==null?", not measured yet":` at ${o}`}${r.worst!=null?`, longest frame ${r.worst} ms`:""}`,r.gpu?`Graphics: ${r.gpu}`:"Graphics: not known",`Window: ${r.size[0]} \xD7 ${r.size[1]} at ${r.dpr}x`,r.probe!=null?`Start-up test: a picture every ${r.probe} ms`:null,r.losses?`Lost its graphics context ${r.losses} time${r.losses===1?"":"s"}`:null,r.failures?`${r.failures} frame${r.failures===1?"":"s"} failed`:null,r.hidden?"The tab is in the background":null].filter(Boolean).join(`
`);return{id:i,name:t,level:s,text:s==="idle"?`${zf[r.picture]} \xB7 away`:`${zf[r.picture]} \xB7 ${o}`,tip:a}}var Nx=Object.freeze({bad:4,warn:3,plain:2,ok:1,idle:0,stale:0});function Fx(i,t,e){let n=i.map(l=>Hw(l,t.get(l.id),e)).sort((l,c)=>Nx[c.level]-Nx[l.level]||l.name.localeCompare(c.name)),s={ok:0,plain:0,warn:0,bad:0,idle:0,stale:0};for(let l of n)s[l.level]++;let r=s.bad?"bad":s.warn?"warn":s.plain?"plain":s.ok?"ok":"stale",a=[`${n.length-s.stale} of ${n.length} on a stage`];return s.bad&&a.push(`${s.bad} struggling`),s.warn&&a.push(`${s.warn} slow`),s.plain&&a.push(`${s.plain} on the plain stage`),{chips:n,level:r,counts:s,line:a.join(" \xB7 ")}}var Gw=(i,t)=>t?game.i18n.format(`STAGECRAFT.Health.${i}`,t):game.i18n.localize(`STAGECRAFT.Health.${i}`),Qh=class{constructor(t){this.host=t,this.intervals=[],this.lastAt=null,this.timer=setInterval(()=>this.send(),Hs.every),this.first=setTimeout(()=>this.send(),4e3),this.later=null}stop(){clearInterval(this.timer),clearTimeout(this.first),clearTimeout(this.later)}frame(t,e=1){this.lastAt!==null&&(this.intervals.push((t-this.lastAt)*e),this.intervals.length>Hs.window&&this.intervals.shift()),this.lastAt=t}report(){let t=this.host;return Hf({backend:t.backend?.name,tier:t.backend?.name==="flat"?"flat":xs(),stats:Ox(this.intervals),probe:t.speed?.last?.median??null,gpu:Bi().renderer,dpr:window.devicePixelRatio,size:[t.root?.clientWidth??0,t.root?.clientHeight??0],losses:t.losses,failures:t.guard?.total??0,hidden:document.hidden===!0,scene:t.scene?.name})}send(){let t=this.host;if(!t.running||!t.channel)return;let e=this.report();t.healthBoard?.take(game.user.id,e),t.channel.send({type:"health",...e})}changed(){clearTimeout(this.later),this.later=setTimeout(()=>this.send(),1200)}receive(t){t?.op==="ask"&&(clearTimeout(this.later),this.later=setTimeout(()=>this.send(),100+Math.random()*1200))}},tu=class{constructor(t){this.host=t,this.table=new Map,this.el=document.createElement("div"),this.el.className="stagecraft-health",this.el.innerHTML='<button type="button" class="pill" aria-expanded="false"><i class="dot"></i><span></span></button><div class="panel" hidden><p class="line"></p><ul></ul></div>',t.root.append(this.el),this.pill=this.el.querySelector(".pill"),this.panel=this.el.querySelector(".panel"),this.pill.addEventListener("click",this.#t),this.timer=setInterval(()=>this.render(),5e3),this.render()}dispose(){clearInterval(this.timer),this.pill?.removeEventListener("click",this.#t),this.el?.remove(),this.el=null}take(t,e){this.table.set(t,{report:e,at:Date.now()}),this.render()}receive(t,e){let n=Ux(t);n&&this.take(e,n)}#t=()=>{let t=this.panel.hidden;this.panel.hidden=!t,this.pill.setAttribute("aria-expanded",t?"true":"false"),t&&(this.host.channel?.send({type:"health",op:"ask"}),this.host.health?.send()),this.render()};close(){return!this.el||this.panel.hidden?!1:(this.panel.hidden=!0,this.pill.setAttribute("aria-expanded","false"),!0)}render(){if(!this.el)return;let t=game.users.filter(s=>s.active).map(s=>({id:s.id,name:s.name})),e=Fx(t,this.table,Date.now());if(this.pill.dataset.level=e.level,this.pill.title=e.line,this.pill.querySelector("span").textContent=Gw("Label",{n:e.chips.length-e.counts.stale,of:e.chips.length}),this.panel.hidden)return;this.panel.querySelector(".line").textContent=e.line,this.panel.querySelector("ul").replaceChildren(...e.chips.map(s=>{let r=document.createElement("li");r.dataset.level=s.level,r.title=s.tip;let o=document.createElement("b");o.textContent=s.name;let a=document.createElement("span");return a.textContent=s.text,r.append(o,a),r}))}};var eu=()=>({...Fi,...globalThis.__stagecraftSpeed??{}}),Bx=i=>Math.round(i*10)/10,nu=class{constructor(t){this.host=t,this.probe=null,this.strikes=0,this.hard=0,this.last=null,this.timer=null,this.starting=null,this.gaps=[],this.watch=null,this.away=()=>this.#n(),document.addEventListener("visibilitychange",this.away),this.#t()}get wanted(){if(qa()!=="auto"||this.host.backend?.name!=="three")return!1;let t=Tu();return!(t&&t.ok)}#t(){let t=null,e=n=>{this.watch=null,t!==null&&this.gaps.push(n-t),t=n,this.gaps.length<40&&!this.host.running&&(this.watch=requestAnimationFrame(e))};this.watch=requestAnimationFrame(e)}start(){if(this.cancel(),!this.wanted)return;let t=this.starting={},e=()=>{this.starting===t&&(this.timer=setTimeout(()=>this.#e(),eu().settle))};game.ready?e():Hooks.once("ready",e)}cancel(){clearTimeout(this.timer),this.timer=null,this.probe=null,this.starting=null}stop(){this.cancel(),this.watch!==null&&cancelAnimationFrame(this.watch),this.watch=null,document.removeEventListener("visibilitychange",this.away)}#e(){if(this.timer=null,!(!this.host.running||!this.wanted)){if(document.hidden){this.timer=setTimeout(()=>this.#e(),2e3);return}this.probe=new $a(eu())}}#n(){!document.hidden||!this.probe||(this.probe=null,this.timer=setTimeout(()=>this.#e(),eu().settle))}feed(t){let e=this.probe;e&&(e.push(t),e.done&&this.#i(e))}#i(t){this.probe=null;let e=eu(),n=t.result(),s=yp(this.gaps,e),r=vp(n,{limits:e,display:s,cap:this.host.pace?.cap??60,patient:t.elapsed>=e.patience}),o=xs();this.last={verdict:r,median:Bx(n.median),display:Bx(s),at:Date.now()},console.info(`${J} | speed test: a picture every ${this.last.median} ms at the median (${n.n} gaps; the display allows ${this.last.display} ms, ${Bi().renderer||"unknown graphics"}): ${r}`),this.host.health?.changed();let a=Mp({tier:o,verdict:r,strikes:this.strikes,hard:this.hard});if(this.strikes=a.strikes,this.hard=a.hard,a.to){this.#s(a.to,r);return}if(r==="ok"){Eu({ok:!0});return}(r==="slow"||r==="very-slow")&&(this.timer=setTimeout(()=>this.#e(),e.again))}#s(t,e){Eu({tier:t}),ui.notifications?.info(game.i18n.localize(t==="flat"?"STAGECRAFT.Notify.SpeedFlat":"STAGECRAFT.Notify.SpeedLow")),console.info(`${J} | speed test: this computer is moved down to the ${t} stage (${e}, twice)`),this.host.rebuild().catch(n=>console.warn(`${J} | could not draw the lighter stage`,n))}};var Vw=450,iu=16,su=class{constructor(t){this.host=t,this.el=null,this.key=null,this.say=null,this.timer=null}hover(t,e,n){this.#t(t,e,n,()=>px(this.host.stage?.cards.get(t)?.person))}hoverWall(t,e,n){if(!game.user.isGM||!this.host.chalk)return this.#t(null,e,n);this.#t(`wall:${Math.round(t.x/24)}:${Math.round(t.y/24)}`,e,n,()=>{let s=this.host.chalk.painterAt(t);return s?{name:game.i18n.format("STAGECRAFT.Chalk.PaintedBy",{name:s}),text:""}:null})}#t(t,e,n,s=null){if(this.at={x:e,y:n},t!==this.key){this.hide(),this.key=t,this.say=s,t&&(this.timer=setTimeout(()=>this.#e(),Vw));return}this.el?.classList.contains("shown")&&this.#n(e,n)}hide(){clearTimeout(this.timer),this.timer=null,this.key=null,this.el?.classList.remove("shown")}dispose(){this.hide(),this.el?.remove(),this.el=null}#e(){this.timer=null;let t=this.host;if(!this.key||!t.running||t.dragging||t.chalk?.inHand)return;let e=this.say?.();if(!e)return;this.el||(this.el=document.createElement("div"),this.el.className="stagecraft-tip",this.el.setAttribute("role","tooltip"),t.root.append(this.el)),this.el.replaceChildren();let n=document.createElement("div");if(n.className="tip-name",n.textContent=e.name,this.el.append(n),e.text){let s=document.createElement("div");s.className="tip-text",s.textContent=e.text,this.el.append(s)}this.el.classList.add("shown"),this.#n(this.at.x,this.at.y)}#n(t,e){let n=this.el,s=n.offsetWidth,r=n.offsetHeight,o=Math.max(8,Math.min(t+iu,window.innerWidth-s-8)),a=e+iu+r>window.innerHeight-8?Math.max(8,e-iu-r):e+iu;n.style.left=`${Math.round(o)}px`,n.style.top=`${Math.round(a)}px`}};var zx=Object.freeze(["face","balloon","mark"].map(i=>Object.freeze({kind:i,ids:Object.freeze(ul.filter(t=>gn[t].kind===i))}))),X3=Object.freeze(["floor","down","choose","sheet"]);function Hx({isGM:i=!1,mayEmote:t=!1,person:e=null,speaker:n=!1,down:s=!1,chosen:r=!1,sheet:o=!1}={}){let a=[];if(i&&(a.push({id:"floor",on:!!n}),a.push({id:"down",on:!!s}),a.push({id:"choose",on:!!r})),o&&a.push({id:"sheet",on:!1}),!t&&!a.length)return null;let l=e?.emote;return{emotes:!!t,kept:l?.id&&!l.once&&gn[l.id]?l.id:null,actions:a}}function Gx(i,t,e,n,s,r,o=8){let a=i+6,l=t+6;return a+e>s-o&&(a=Math.max(o,i-6-e)),l+n>r-o&&(l=Math.max(o,r-o-n)),{left:Math.round(a),top:Math.round(l)}}var ru=(i,t,e)=>Math.max(t,Math.min(e,i)),ou=i=>Math.round(i*1e3)/1e3;function au(i){return!Array.isArray(i)||i.length<2||!Number.isFinite(i[0])||!Number.isFinite(i[1])?null:[ou(ru(i[0],0,1)),ou(ru(i[1],0,1))]}var Vx=(i,t)=>Array.isArray(i)&&i[0]===t[0]&&i[1]===t[1],ds=(i,t,e)=>typeof i?.id=="string"&&i.id?i.id:`${e}-${t+1}`;function Wx(i,t,e){let n=au(e);if(!n||!Array.isArray(i))return i;let s=i.findIndex((r,o)=>ds(r,o,"mark")===t);return s<0||Vx(i[s].at,n)?i:i.map((r,o)=>o===s?{...r,at:n}:r)}function Xx(i,t,e,n){let s=au(n);if(!s||!Array.isArray(i))return i;let r=i.findIndex((a,l)=>ds(a,l,"zone")===t),o=i[r]?.shape;return r<0||!Array.isArray(o)||!(e>=0&&e<o.length)||Vx(o[e],s)?i:i.map((a,l)=>l===r?{...a,shape:o.map((c,h)=>h===e?s:c)}:a)}function $x(i,t,e,n){if(!Array.isArray(i)||!Number.isFinite(e)||!Number.isFinite(n))return i;let s=i.findIndex((u,f)=>ds(u,f,"zone")===t),r=i[s];if(s<0||!Array.isArray(r?.shape))return i;let o=[...r.shape,...Array.isArray(r.floor)?r.floor:[]].filter(u=>Array.isArray(u)),a=[Math.min(...o.map(u=>u[0])),Math.min(...o.map(u=>u[1]))],l=[Math.max(...o.map(u=>u[0])),Math.max(...o.map(u=>u[1]))],c=ru(e,-a[0],1-l[0]),h=ru(n,-a[1],1-l[1]);if(Math.abs(c)<5e-4&&Math.abs(h)<5e-4)return i;let d=u=>u.map(f=>[ou(f[0]+c),ou(f[1]+h)]);return i.map((u,f)=>f===s?{...u,shape:d(u.shape),...Array.isArray(u.floor)?{floor:d(u.floor)}:{}}:u)}function Zx(i,t,e,n=null){if(!Array.isArray(i))return i;let s=i.findIndex((c,h)=>ds(c,h,"zone")===t),r=i[s]?.shape;if(s<0||!Array.isArray(r)||!(e>=0&&e<r.length))return i;let o=r[e],a=r[(e+1)%r.length],l=au(n)??au([(o[0]+a[0])/2,(o[1]+a[1])/2]);return i.map((c,h)=>h===s?{...c,shape:[...r.slice(0,e+1),l,...r.slice(e+1)]}:c)}function qx(i,t,e){if(!Array.isArray(i))return i;let n=i.findIndex((r,o)=>ds(r,o,"zone")===t),s=i[n]?.shape;return n<0||!Array.isArray(s)||s.length<=3||!(e>=0&&e<s.length)?i:i.map((r,o)=>o===n?{...r,shape:s.filter((a,l)=>l!==e)}:r)}function Gf(i){let t=(i??[]).filter(e=>Array.isArray(e));return t.length?[t.reduce((e,n)=>e+n[0],0)/t.length,t.reduce((e,n)=>e+n[1],0)/t.length]:null}function Yx(i){let t=[];for(let e of i?.marks??[])t.push({kind:"mark",id:e.id,at:e.at,label:e.label??e.id});for(let e of i?.zones??[]){(e.shape??[]).forEach((s,r)=>t.push({kind:"vertex",id:e.id,index:r,at:s,label:e.name??e.id}));let n=Gf(e.shape);n&&t.push({kind:"zone",id:e.id,at:n,label:e.name??e.id})}return t}var Ww=.45,Na=()=>(globalThis.game?.time?.serverTime??Date.now())/1e3,jx=Promise.resolve();function fs(i){let t=jx.then(i,i);return jx=t.catch(e=>console.warn(`${J} | a write to the stage failed`,e)),t}function Xf(i,t=null){if(t?.scene?.id===i.id&&t.stage)return t.stage;let{usable:e,scene:n}=Ys(i);return e?new rr(n,_o(i),{clock:Na}):null}function Oa(i,t){return!game.user?.isGM||!t?.length?Promise.resolve(!1):fs(async()=>{let e=Ui(i),n=Am(e,t,Na()+Ww);return await i.update({[`flags.${J}.published.cards`]:n}),!0})}async function Ua(i,t,e={},n=null){let s=Xf(i,n);if(!s)return[];let r=s.formationMoves(t,e);return await Oa(i,r),r}async function lu(i,{gait:t="walk"}={}){let e=Cm(Ui(i),{gait:t});return await Oa(i,e),e}function cu(i,t=null,e=null){if(!game.user?.isGM)return Promise.resolve(0);let n=Xf(i,t);if(!n)return Promise.resolve(0);let s=n.exportPlaces();return fs(async()=>{let r=Ui(i),o=Pm(r,s,e),a=o.filter((l,c)=>l!==r[c]).length;return a&&(await i.update({[`flags.${J}.published.cards`]:o}),Hooks.callAll("stagecraft.keep",{scene:i.id,changed:a,homes:o.filter(l=>Array.isArray(l.home)).map(l=>({id:l.id,home:l.home,homeYaw:l.homeYaw??0}))})),a})}async function hu(i,t){if(!game.user?.isGM||!Array.isArray(t)||t.length!==2||!t.every(s=>Number.isFinite(s)&&s>=0&&s<=1))return!1;let e=[Math.round(t[0]*1e3)/1e3,Math.round(t[1]*1e3)/1e3],n=i?.flags?.[J]?.stage?.chalk?.box;return Array.isArray(n)&&n[0]===e[0]&&n[1]===e[1]?!1:(await i.update({[`flags.${J}.stage.chalk.box`]:e}),Hooks.callAll("stagecraft.keepBox",{scene:i.id,at:e}),!0)}function Fa(i,t){return!game.user?.isGM||!t?Promise.resolve(!1):fs(async()=>{let e=i?.flags?.[J]?.stage;if(!e)return!1;let n=Array.isArray(e.marks)?e.marks:[],s=Array.isArray(e.zones)?e.zones:[],r=n,o=s;t.mark?r=Wx(n,t.mark.id,t.mark.at):t.vertex?o=Xx(s,t.vertex.id,t.vertex.index,t.vertex.at):t.zone?o=$x(s,t.zone.id,t.zone.dx,t.zone.dy):t.addVertex?o=Zx(s,t.addVertex.id,t.addVertex.after,t.addVertex.at??null):t.removeVertex&&(o=qx(s,t.removeVertex.id,t.removeVertex.index));let a={};return r!==n&&(a[`flags.${J}.stage.marks`]=r),o!==s&&(a[`flags.${J}.stage.zones`]=o),Object.keys(a).length?(await i.update(a),Hooks.callAll("stagecraft.keepStage",{scene:i.id,marks:r.map((l,c)=>({id:ds(l,c,"mark"),at:l.at})),zones:o.map((l,c)=>({id:ds(l,c,"zone"),shape:l.shape,...Array.isArray(l.floor)?{floor:l.floor}:{}}))}),!0):!1})}async function uu(i,t=null){let e=Xf(i,t);if(!e)return[];let n=e.marks.map(o=>({...o,capacity:o.capacity-(e.resting.get(o.id)?.size??0)})).filter(o=>o.capacity>0),s=[...e.cards.values()].filter(o=>!o.mark&&o.holder===null).map(o=>({id:o.id,X:o.walk?o.walk.to.X:o.puppet.x,Z:o.walk?o.walk.to.Z:o.Z})),r=tl(n,s).map(({card:o,mark:a})=>({id:o,mark:a,gait:"hurry",still:!0,packed:!1}));return await Oa(i,r),r}var lo=i=>i?.flags?.[J]?.live?.life!==!1;function co(i){let t=i?.flags?.[J]?.live?.board;return typeof t=="boolean"?t:i?.flags?.[J]?.stage?.board===!0}var du=(i,t)=>i.update({[`flags.${J}.live.life`]:!!t}),fu=(i,t)=>i.update({[`flags.${J}.live.board`]:!!t});function ho(i,t,e){return game.user?.isGM?fs(async()=>{let n=Ui(i);if(!n.some(r=>r.id===t))return!1;let s=n.map(r=>{if(r.id!==t)return r;let o={...r};return e?o.down=!0:delete o.down,o});return await i.update({[`flags.${J}.published.cards`]:s}),!0}):Promise.resolve(!1)}var $f=i=>i?.flags?.[J]?.live?.speaker??null,uo=(i,t)=>i.update({[`flags.${J}.live.speaker`]:typeof t=="string"?t:null}),pu=i=>i?.flags?.[J]?.live?.turn??null;function Kx(i,t){if(!game.user?.isGM)return Promise.resolve(!1);let e=typeof t=="string"?t:null;return pu(i)===e?Promise.resolve(!1):i.update({[`flags.${J}.live.turn`]:e}).then(()=>!0)}function Jx(i,t,e){if(!game.user?.isGM)return Promise.resolve(!1);let n=ls(e);return fs(async()=>{let s=Ui(i),r=s.find(a=>a.id===t);if(!r||R0(r.badges,n))return!1;let o=s.map(a=>{if(a.id!==t)return a;let l={...a};return n.length?l.badges=n:delete l.badges,l});return await i.update({[`flags.${J}.published.cards`]:o}),!0})}function Ba(i,t,e,{keep:n=!1}={}){if(!game.user?.isGM)return Promise.resolve(!1);let s=Sm(e,{keep:n,t0:Na()+Xw});return s?fs(async()=>{let r=Ui(i);return r.some(o=>o.id===t)?(await i.update({[`flags.${J}.published.cards`]:r.map(o=>o.id===t?{...o,emote:s}:o)}),!0):!1}):Promise.resolve(!1)}var Xw=.25,Vf=new Set;function Qx(i){if(typeof i!="function")throw new TypeError("a moments provider must be a function of the scene");return Vf.add(i),()=>Vf.delete(i)}var Wf=new Set;function ty(i){if(typeof i!="function")throw new TypeError("a cover provider must be a function");return Wf.add(i),()=>Wf.delete(i)}function Zf(){let i=[];for(let t of Wf)try{let e=t();Array.isArray(e)&&i.push(...e.filter(n=>Array.isArray(n?.rect)||Array.isArray(n?.circle)))}catch(e){console.warn(`${J} | a cover provider failed`,e)}return i}function qf(i,t,e){let n=r=>e.ox+(r-t.left)/e.s,s=r=>e.oy+(r-t.top)/e.s;return i.map(r=>r.rect?{rect:[n(r.rect[0]),s(r.rect[1]),n(r.rect[2]),s(r.rect[3])]}:{circle:[n(r.circle[0]),s(r.circle[1]),r.circle[2]/e.s]})}function ey(i){let t=[];for(let e of Vf)try{let n=e(i);Array.isArray(n)&&t.push(...n.filter(s=>s&&typeof s.label=="string"&&typeof s.run=="function"))}catch(n){console.warn(`${J} | a moments provider failed`,n)}return t}var ny="stagecraft.emoteKeep",fo=i=>game.i18n.localize(`STAGECRAFT.Menu.${i}`),iy=(i,t)=>!!i&&!!t&&Xa(i,t,{handsOff:!1});function sy(i,t){let e=i?.actor?globalThis.game?.actors?.get?.(i.actor):null;return e?.sheet&&(t?.isGM||e.testUserPermission?.(t,"OBSERVER"))?e:null}var Yf=new Map,$w=i=>(Yf.has(i)||Yf.set(i,`data:image/svg+xml;charset=utf-8,${encodeURIComponent(gn[i].svg)}`),Yf.get(i)),mu=class{constructor(t){this.host=t,this.el=null,this.card=null,this.keep=!1;try{this.keep=globalThis.localStorage?.getItem(ny)==="1"}catch{}this.onDown=e=>{this.el&&!this.el.contains(e.target)&&this.close()},this.onKey=e=>{this.el&&e.key==="Escape"&&(e.preventDefault(),e.stopPropagation(),this.close())}}get isOpen(){return!!this.el}open(t,e,n){this.close();let s=this.host,r=s.stage?.cards.get(t);if(!r||s.dragging||s.chalk?.inHand)return!1;let o=game.user,a=Hx({isGM:!!o?.isGM,mayEmote:iy(r.person,o),person:r.person,speaker:s.stage.speaker===t,down:!!r.downTo,chosen:!!s.selected?.has(t),sheet:!!sy(r.person,o)});if(!a)return!1;this.card=t,this.el=this.#t(r.person,a),s.root.append(this.el);let l=Gx(e,n,this.el.offsetWidth,this.el.offsetHeight,window.innerWidth,window.innerHeight);return this.el.style.left=`${l.left}px`,this.el.style.top=`${l.top}px`,document.addEventListener("pointerdown",this.onDown,!0),window.addEventListener("keydown",this.onKey,!0),this.el.focus({preventScroll:!0}),!0}close(){document.removeEventListener("pointerdown",this.onDown,!0),window.removeEventListener("keydown",this.onKey,!0),this.el?.remove(),this.el=null,this.card=null}dispose(){this.close()}async emote(t,e,n=this.keep){let s=this.host;return game.user?.isGM?Ba(s.scene,t,e,{keep:n}):game.users?.activeGM?(s.channel?.send({type:"emote",scene:s.scene.id,card:t,emote:e,keep:!!n}),!0):(globalThis.ui?.notifications?.warn(fo("NoGM")),!1)}receive(t,e){let n=this.host;if(!Qn()||t?.scene!==n.scene?.id||typeof t.card!="string")return;let s=n.stage?.cards.get(t.card)?.person;iy(s,game.users.get(e))&&Ba(n.scene,t.card,typeof t.emote=="string"?t.emote:null,{keep:!!t.keep}).catch(r=>console.warn(`${J} | could not put an emote on ${t.card}`,r))}#t(t,e){let n=document.createElement("div");n.className="stagecraft-card-menu",n.setAttribute("role","menu"),n.tabIndex=-1,n.addEventListener("contextmenu",r=>r.preventDefault());let s=document.createElement("div");if(s.className="menu-name",s.textContent=String(t.name??t.id).split(/\n|<br\s*\/?>|\\n/i)[0],n.append(s),e.emotes){for(let a of zx){let l=document.createElement("div");l.className="menu-label",l.textContent=fo(a.kind==="face"?"Faces":a.kind==="balloon"?"Balloons":"Marks");let c=document.createElement("div");c.className="menu-emotes";for(let h of a.ids){let d=this.#n("menu-emote",()=>this.#i(h));d.dataset.emote=h,d.title=gn[h].label,d.setAttribute("aria-label",gn[h].label),e.kept===h&&d.classList.add("on");let u=document.createElement("img");u.src=$w(h),u.alt="",u.draggable=!1,d.append(u),c.append(d)}n.append(l,c)}let r=document.createElement("div");r.className="menu-row";let o=this.#n("menu-keep",()=>{this.keep=!this.keep,o.classList.toggle("on",this.keep),o.setAttribute("aria-checked",String(this.keep));try{globalThis.localStorage?.setItem(ny,this.keep?"1":"0")}catch{}});if(o.setAttribute("role","menuitemcheckbox"),o.setAttribute("aria-checked",String(this.keep)),o.classList.toggle("on",this.keep),o.textContent=fo("Keep"),o.title=fo("KeepTip"),r.append(o),e.kept){let a=this.#n("menu-clear",()=>this.#i(null));a.dataset.emote="",a.textContent=fo("Clear"),r.append(a)}n.append(r)}if(e.actions.length){let r=document.createElement("div");r.className="menu-actions";for(let o of e.actions){let a=this.#n("menu-action",()=>this.#s(o.id));a.dataset.action=o.id,a.textContent=fo(this.#e(o)),r.append(a)}n.append(r)}return n}#e({id:t,on:e}){return t==="floor"?e?"FloorTake":"FloorGive":t==="down"?e?"DownStand":"DownKnock":t==="choose"?e?"Unchoose":"Choose":"Sheet"}#n(t,e){let n=document.createElement("button");return n.type="button",n.className=t,n.setAttribute("role","menuitem"),n.addEventListener("click",s=>{s.preventDefault(),e()}),n}#i(t){let e=this.card;this.close(),!(!e||!this.host.stage?.cards.has(e))&&this.emote(e,t).catch(n=>console.warn(`${J} | could not put an emote on ${e}`,n))}#s(t){let e=this.host,n=this.card;this.close();let s=n?e.stage?.cards.get(n):null;if(!s)return;let r=o=>console.warn(`${J} | ${t} on ${n} failed`,o);t==="floor"?uo(e.scene,e.stage.speaker===n?null:n).catch(r):t==="down"?ho(e.scene,n,!s.downTo).catch(r):t==="choose"?(e.selected.has(n)?e.selected.delete(n):e.selected.add(n),e.blocking?.selectionChanged()):t==="sheet"&&sy(s.person,game.user)?.sheet.render(!0)}};var Zw="http://www.w3.org/2000/svg",za=i=>game.i18n.localize(`STAGECRAFT.Editor.${i}`),jf={on:!1},gu=class{constructor(t){this.host=t,this.on=!1,this.el=null,this.drag=null,this.frame=0}toggle(t=!this.on){return this.on=!!t&&!!this.host.backend?.rig,jf.on=this.on,this.on?this.#t():this.#e(),this.on}refresh(){this.on&&!this.drag&&this.#s()}dispose(){this.#e()}#t(){if(this.el)return;this.el=document.createElement("div"),this.el.className="stagecraft-editor",this.el.innerHTML='<svg class="outlines" aria-hidden="true"></svg><div class="handles"></div><div class="note" role="status"></div>',this.el.querySelector(".note").textContent=za("Note"),this.host.root.append(this.el),this.el.addEventListener("pointerdown",this.#o),this.el.addEventListener("dblclick",this.#d),this.#s();let t=()=>{this.on&&(this.#r(),this.frame=requestAnimationFrame(t))};this.frame=requestAnimationFrame(t)}#e(){cancelAnimationFrame(this.frame),this.el?.removeEventListener("pointerdown",this.#o),this.el?.removeEventListener("dblclick",this.#d),this.el?.remove(),this.el=null,this.drag=null,this.on=!1}#n([t,e]){let n=this.host.backend;return{x:(n.rig.map.x(t)-n.view.ox)*n.view.s,y:(n.rig.map.y(e)-n.view.oy)*n.view.s}}#i(){let t=Zs(this.host.scene.flags?.[J]?.stage??{}).scene;return{marks:t.marks??[],zones:(t.zones??[]).map(e=>this.drag?.live?.id===e.id?{...e,shape:this.drag.live.shape}:e)}}#s(){if(!this.el)return;let t=this.el.querySelector(".handles");t.replaceChildren();let{marks:e,zones:n}=this.#i();for(let s of Yx({marks:e,zones:n})){let r=document.createElement("div");r.className=`handle ${s.kind}`,r.dataset.kind=s.kind,r.dataset.id=s.id,s.index!==void 0&&(r.dataset.index=String(s.index)),r.title=s.kind==="mark"?`${za("Mark")}: ${s.label}`:s.kind==="vertex"?`${za("Corner")}: ${s.label}`:`${za("Zone")}: ${s.label}`,r.setAttribute("role","button"),r.setAttribute("aria-label",r.title),t.append(r)}for(let s of n)(s.shape??[]).forEach((r,o)=>{let a=document.createElement("div");a.className="handle edge",a.dataset.kind="edge",a.dataset.id=s.id,a.dataset.index=String(o),a.title=za("EdgeTip"),t.append(a)});this.#r()}#r(){if(!this.el||!this.host.backend?.rig)return;let{marks:t,zones:e}=this.#i(),n=new Map;for(let r of t)n.set(`mark:${r.id}`,r.at);for(let r of e)r.shape.forEach((o,a)=>n.set(`vertex:${r.id}:${a}`,o)),n.set(`zone:${r.id}`,Gf(r.shape)),r.shape.forEach((o,a)=>{let l=r.shape[(a+1)%r.shape.length];n.set(`edge:${r.id}:${a}`,[(o[0]+l[0])/2,(o[1]+l[1])/2])});for(let r of this.el.querySelectorAll(".handle")){let o=r.dataset.kind==="mark"||r.dataset.kind==="zone"?`${r.dataset.kind}:${r.dataset.id}`:`${r.dataset.kind}:${r.dataset.id}:${r.dataset.index}`,a=n.get(o);if(!a){r.hidden=!0;continue}r.hidden=!1;let l=this.#n(a);r.style.left=`${l.x}px`,r.style.top=`${l.y}px`}this.el.querySelector(".outlines").replaceChildren(...e.map(r=>{let o=document.createElementNS(Zw,"polygon");return o.setAttribute("points",r.shape.map(a=>{let l=this.#n(a);return`${l.x},${l.y}`}).join(" ")),o.setAttribute("class",`outline ${r.kind??""}`),o}))}#o=t=>{let e=t.target.closest?.(".handle");if(!e||t.button!==0||!this.host.backend)return;t.preventDefault(),t.stopPropagation();let n=e.dataset.kind;if(n==="edge")return;let s=e.dataset.id,r=e.dataset.index===void 0?null:Number(e.dataset.index),o=this.host.scene.flags?.[J]?.stage??{},a=this.#i().zones.find(l=>l.id===s);this.drag={kind:n,id:s,index:r,el:e,start:this.#c(t),shape:a?a.shape.map(l=>[...l]):null,floor:null,live:null,moved:!1,raw:o},e.setPointerCapture?.(t.pointerId),e.classList.add("held"),e.addEventListener("pointermove",this.#a),e.addEventListener("pointerup",this.#h),e.addEventListener("pointercancel",this.#l)};#c(t){let e=this.host.root.getBoundingClientRect(),n=this.host.backend.paintingAt?.(t.clientX-e.left,t.clientY-e.top);return n?[n.x,n.y]:null}#a=t=>{let e=this.drag;if(!e)return;let n=this.#c(t);if(n){if(e.moved=!0,e.at=n,e.kind==="mark")e.el.style.left=`${this.#n(n).x}px`,e.el.style.top=`${this.#n(n).y}px`;else if(e.kind==="vertex")e.live={id:e.id,shape:e.shape.map((s,r)=>r===e.index?n:s)},this.#r();else if(e.kind==="zone"&&e.start){let s=n[0]-e.start[0],r=n[1]-e.start[1];e.live={id:e.id,shape:e.shape.map(o=>[Math.max(0,Math.min(1,o[0]+s)),Math.max(0,Math.min(1,o[1]+r))])},e.delta=[s,r],this.#r()}}};#h=t=>{let e=this.drag;if(!e||(this.#u(t),!e.moved||!e.at))return;let n=e.kind==="mark"?{mark:{id:e.id,at:e.at}}:e.kind==="vertex"?{vertex:{id:e.id,index:e.index,at:e.at}}:{zone:{id:e.id,dx:e.delta?.[0]??0,dy:e.delta?.[1]??0}};Fa(this.host.scene,n).catch(s=>console.warn(`${J} | could not move that`,s)).finally(()=>this.#s())};#l=t=>{this.#u(t),this.#s()};#u(t){let e=this.drag;this.drag=null,e&&(e.el.classList.remove("held"),e.el.releasePointerCapture?.(t.pointerId),e.el.removeEventListener("pointermove",this.#a),e.el.removeEventListener("pointerup",this.#h),e.el.removeEventListener("pointercancel",this.#l))}#d=t=>{let e=t.target.closest?.(".handle");if(!e)return;let n=e.dataset.id,s=Number(e.dataset.index);t.preventDefault(),t.stopPropagation();let r=e.dataset.kind==="vertex"?{removeVertex:{id:n,index:s}}:e.dataset.kind==="edge"?{addVertex:{id:n,after:s}}:null;r&&Fa(this.host.scene,r).catch(o=>console.warn(`${J} | could not change that zone`,o)).finally(()=>this.#s())}};var ge=(i,t)=>t?game.i18n.format(`STAGECRAFT.Bar.${i}`,t):game.i18n.localize(`STAGECRAFT.Bar.${i}`),qw=["hands","mode","freeze","undo","wipe","wipeone","hide"],xu=class{constructor(t){this.host=t,this.el=document.createElement("div"),this.el.className="stagecraft-bar",this.el.setAttribute("role","toolbar"),this.el.setAttribute("aria-label",ge("Label")),this.el.innerHTML=qw.map(e=>`<button type="button" data-act="${e}"></button>`).join(""),t.root.append(this.el),this.el.addEventListener("click",this.#n),this.refresh()}dispose(){this.el?.removeEventListener("click",this.#n),this.el?.remove(),this.el=null}get#t(){return this.host.scene}get#e(){return this.#t.flags?.[J]?.live??{}}refresh(){if(!this.el)return;let t=this.host.chalk;if(!t){this.el.hidden=!0;return}this.el.hidden=!1;let e=t.policy(),n=this.#e.chalk?.mode??null,s=(r,o,{on:a=!1,tip:l="",disabled:c=!1}={})=>{let h=this.el.querySelector(`[data-act="${r}"]`);h.textContent=o,h.title=l,h.setAttribute("aria-pressed",a?"true":"false"),h.classList.toggle("on",a),h.disabled=c};s("hands",ge("Hands.Label"),{on:js(this.#t),tip:ge("Hands.Tip")}),s("mode",n?ge("Mode.Set",{mode:ge(`Mode.${n}`)}):ge("Mode.Scene",{mode:ge(`Mode.${e.mode}`)}),{on:!!n,tip:ge("Mode.Tip")}),s("freeze",ge("Freeze.Label"),{on:e.locked,tip:ge("Freeze.Tip")}),s("undo",ge("Undo.Label"),{tip:ge("Undo.Tip"),disabled:!t.store.ready}),s("wipe",ge("Wipe.Label"),{tip:ge("Wipe.Tip"),disabled:!t.store.ready}),s("wipeone",ge("WipeOne.Label"),{tip:ge("WipeOne.Tip"),disabled:!t.store.ready}),s("hide",ge("Hide.Label"),{on:this.#e.chalkHidden===!0,tip:ge("Hide.Tip")})}#n=t=>{let e=t.target.closest("button[data-act]");!e||e.disabled||this.#i(e.dataset.act).catch(n=>console.warn(`${J} | the stage bar could not do "${e.dataset.act}"`,n))};async#i(t){let e=this.#t,n=this.host.chalk,s=n?.store;if(t==="hands")await e.update({[`flags.${J}.live.handsOff`]:!js(e)});else if(t==="mode")await e.update({[`flags.${J}.live.chalk.mode`]:X0(this.#e.chalk?.mode)});else if(t==="freeze")await e.update({[`flags.${J}.live.chalk.locked`]:!n.policy().locked});else if(t==="hide")await e.update({[`flags.${J}.live.chalkHidden`]:this.#e.chalkHidden!==!0});else if(t==="undo")await s.undo(e.id);else if(t==="wipe")await foundry.applications.api.DialogV2.confirm({window:{title:ge("Wipe.Title")},content:`<p>${ge("Wipe.Ask")}</p>`,yes:{default:!1}})&&await s.wipe(e.id);else if(t==="wipeone"){let r=n.painters();if(!r.length){ui.notifications?.info(ge("WipeOne.None"));return}let o=await foundry.applications.api.DialogV2.wait({window:{title:ge("WipeOne.Title")},content:`<p>${ge("WipeOne.Ask")}</p>`,buttons:[...r.map(a=>({action:a.by,label:ge("WipeOne.Who",{name:a.name,tiles:a.tiles}),icon:"fa-solid fa-eraser"})),{action:"",label:ge("WipeOne.Cancel"),default:!0}],rejectClose:!1});o&&await s.wipe(e.id,{by:o})}this.refresh()}};var xe=(i,t)=>t?game.i18n.format(`STAGECRAFT.Blocking.${i}`,t):game.i18n.localize(`STAGECRAFT.Blocking.${i}`),Kf={line:"Line",huddle:"Huddle",talk:"Talk",gangup:"Gangup",panel:"Panel",standoff:"Standoff",circle:"Circle",queue:"Queue",scatter:"Scatter",audience:"Audience",position:"Position"},yu=class{constructor(t){this.host=t,this.armed=null,this.el=document.createElement("div"),this.el.className="stagecraft-bar stagecraft-blocking",this.el.setAttribute("role","toolbar"),this.el.setAttribute("aria-label",xe("Label")),this.el.innerHTML=`
      <div class="row">
        <button type="button" data-act="life"></button>
        <button type="button" data-act="board"></button>
        <span class="sep"></span>
        ${nl.map(e=>`<button type="button" data-act="form" data-kind="${e}"></button>`).join("")}
        <span class="sep"></span>
        <button type="button" data-act="tidy"></button>
        <button type="button" data-act="places"></button>
        <button type="button" data-act="keep"></button>
        <button type="button" data-act="boxhere"></button>
        <button type="button" data-act="edit"></button>
      </div>
      <div class="row moments" hidden></div>
      <div class="hint" hidden></div>`,t.root.append(this.el),this.el.addEventListener("click",this.#n),this.el.addEventListener("dblclick",this.#i),this.refresh()}dispose(){this.el?.removeEventListener("click",this.#n),this.el?.removeEventListener("dblclick",this.#i),this.el?.remove(),this.el=null}get#t(){return this.host.scene}refresh(){if(!this.el)return;let t=this.#t,e=(r,o,{on:a=!1,tip:l=""}={})=>{r.textContent=o,r.title=l,r.setAttribute("aria-pressed",a?"true":"false"),r.classList.toggle("on",a)};e(this.el.querySelector('[data-act="life"]'),xe("Life.Label"),{on:lo(t),tip:xe("Life.Tip")}),e(this.el.querySelector('[data-act="board"]'),xe("Board.Label"),{on:co(t),tip:xe("Board.Tip")});for(let r of this.el.querySelectorAll('[data-act="form"]')){let o=r.dataset.kind;e(r,xe(`Form.${Kf[o]}.Label`),{on:this.armed===o,tip:`${xe(`Form.${Kf[o]}.Tip`)} ${xe("Form.How")}`})}e(this.el.querySelector('[data-act="tidy"]'),xe("Tidy.Label"),{tip:xe("Tidy.Tip")}),e(this.el.querySelector('[data-act="places"]'),xe("Places.Label"),{tip:xe("Places.Tip")}),e(this.el.querySelector('[data-act="keep"]'),xe("Keep.Label"),{tip:xe("Keep.Tip")}),e(this.el.querySelector('[data-act="boxhere"]'),xe("Box.Label"),{on:this.armed==="box",tip:xe("Box.Tip")}),e(this.el.querySelector('[data-act="edit"]'),xe("Edit.Label"),{on:!!this.host.editor?.on,tip:xe("Edit.Tip")});let n=ey(t),s=this.el.querySelector(".moments");s.hidden=!n.length,s.innerHTML=n.map((r,o)=>`<button type="button" data-act="moment" data-i="${o}" title="${ry(r.tip??"")}">${ry(r.label)}</button>`).join(""),this.moments=n,this.#e()}#e(){let t=this.el.querySelector(".hint"),e=this.host.selected?.size??0,n=[];this.armed&&n.push(this.armed==="box"?xe("Box.Armed"):xe("Armed",{name:xe(`Form.${Kf[this.armed]}.Label`)})),e&&n.push(xe("Selected",{n:e})),t.hidden=!n.length,t.textContent=n.join(" \xB7 ")}selectionChanged(){this.el&&this.#e()}disarm(){return this.armed?(this.armed=null,this.refresh(),!0):!1}async placeArmed({card:t=null,at:e=null}){let n=this.armed;if(!n)return!1;if(this.disarm(),n==="box")return e&&await hu(this.#t,e),!0;let s=this.host.selected?.size?[...this.host.selected]:null,r={ids:s,focus:t??e??null};return t&&n==="gangup"&&(r.target=t),t&&n==="talk"&&(r.speakers=[t,...(s??[]).filter(o=>o!==t)]),s&&n==="talk"&&!t&&(r.speakers=s.slice(0,2)),(t||s)&&(r.party=!0),t&&s&&!s.includes(t)&&(r.ids=[...s,t]),await Ua(this.#t,n,r,this.host),!0}#n=t=>{let e=t.target.closest("button[data-act]");!e||e.disabled||this.#s(e).catch(n=>console.warn(`${J} | the blocking strip could not do "${e.dataset.act}"`,n))};#i=t=>{let e=t.target.closest('button[data-act="form"]');if(!e)return;this.armed=null;let n=this.host.selected?.size?[...this.host.selected]:null;Ua(this.#t,e.dataset.kind,{ids:n,party:!!n},this.host).then(()=>this.refresh()).catch(s=>console.warn(`${J} | the formation could not be made`,s))};async#s(t){let e=this.#t,n=t.dataset.act;if(n==="life")await du(e,!lo(e));else if(n==="board")await fu(e,!co(e));else if(n==="form")this.armed=this.armed===t.dataset.kind?null:t.dataset.kind;else if(n==="tidy")await uu(e,this.host);else if(n==="places")await lu(e);else if(n==="edit")this.host.editor?.toggle();else if(n==="boxhere")this.armed=this.armed==="box"?null:"box";else if(n==="keep"){let s=this.host.selected?.size?[...this.host.selected]:null;if(await foundry.applications.api.DialogV2.confirm({window:{title:xe("Keep.Title")},content:`<p>${xe(s?"Keep.AskSome":"Keep.AskAll",{n:s?.length??0})}</p>`,yes:{default:!1}})){let o=await cu(e,this.host,s);ui.notifications?.info(xe("Keep.Done",{n:o}))}}else n==="moment"&&await this.moments?.[Number(t.dataset.i)]?.run?.(e);this.refresh()}};function ry(i){return String(i).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}var _u=class{constructor({scene:t,skins:e,anchor:n,services:s={},onFatal:r=null}){this.scene=t,this.onFatal=r,this.guard=new pl({limit:600,report:(o,a)=>console.error(`${J} | a frame failed (${a} in a row)`,o),onFatal:o=>this.#e(o)}),this.threeFailed=!1,this.losses=0,this.rebuilding=!1,this.saving=Promise.resolve(),this.skins=e,this.anchor=n,this.services=s,this.userId=game.user.id,this.dragging=null,this.selected=new Set,this.running=!1,this.frames=0,this.speed=null,this.health=null,this.healthBoard=null,this.tip=null,this.pace=new Za({cap:kp(),easing:Au()}),this.pose=null,this.listeners=[],this.hooks=[]}async start(){let{usable:t,scene:e,problems:n}=Ys(this.scene);if(!t)return console.warn(`${J} | "${this.scene.name}" has a stage description that cannot be drawn:`,n),ui.notifications?.warn(game.i18n.format("STAGECRAFT.Notify.Unusable",{scene:this.scene.name})),!1;n.length&&console.warn(`${J} | "${this.scene.name}" has notes:`,n),this.description=e,this.described=JSON.stringify(this.scene.flags?.[J]?.stage??null),this.people=_o(this.scene);let s=()=>this.root&&this.backend?.view?qf(Zf(),this.root.getBoundingClientRect(),this.backend.view):[];this.stage=new rr(e,this.people,{card:this.skins.get(e.skin).size,clock:Na,cover:s}),this.stage.setLife(lo(this.scene)),this.stage.setBoard(co(this.scene)),this.stage.setSpeaker($f(this.scene)),this.stage.setTurn(pu(this.scene)),this.stage.setCalm(Js());for(let r of this.people){let o=this.stage.cards.get(r.id);o&&(o.appliedMove=r.move?.t0??null)}for(let r of this.stage.problems)console.warn(`${J} | ${r}`);return this.sync=new ml({stage:this.stage,scene:this.scene.id,me:this.userId,now:()=>game.time.serverTime,clock:()=>performance.now(),send:r=>this.channel?.send(r),mayHold:(r,o)=>this.#l(r,o),onLost:r=>this.#u(r),onDrop:r=>this.#d(r)}),this.channel=kx((r,o)=>{r?.type==="chalk"?this.chalk?.receive(r,o):r?.type==="health"?(this.health?.receive(r),this.healthBoard?.receive(r,o)):r?.type==="emote"?this.menu?.receive(r,o):this.sync.receive(r,o)}),this.root=document.createElement("div"),this.root.id="stagecraft-stage",this.root.dataset.scene=this.scene.id,this.anchor.after(this.root),this.speed=new nu(this),await this.#t(),this.services.chalkStore&&(this.chalk=new Kh({host:this,store:this.services.chalkStore,send:r=>this.channel?.send(r)}),this.kit=new Jh(this,this.chalk),this.chalk.sync(),this.chalk.refresh(),this.#x()),game.user.isGM&&(this.bar=new xu(this),this.blocking=new yu(this),this.healthBoard=new tu(this),this.editor=new gu(this),jf.on&&this.editor.toggle(!0),this.#g()),this.#p(),this.health=new Qh(this),this.tip=new su(this),this.menu=new mu(this),this.#v(),this.#a(),this.#b(),this.#S(),this.running=!0,this.last=performance.now(),this.pace.poke(this.last),this.raf=requestAnimationFrame(this.#n),this.speed.start(),setTimeout(()=>{this.running&&this.#M()},0),Hooks.callAll("stagecraft.stageReady",this),!0}async#t(){let t=new Us,e=this.root.clientWidth||window.innerWidth,n=this.root.clientHeight||window.innerHeight,s=this.skins.get(this.description.skin),r=qa()==="auto"&&Ap(),o=Tp({tier:xs(),webgl:Ep(),failed:this.threeFailed,software:r});if(o==="flat"&&r&&!this.toldFlat&&(this.toldFlat=!0,ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.FlatSoftware"))),o==="three"){let l=new Zh({images:t,onContextLost:()=>this.#w()});try{l.mount(this.root,{quality:xs(),pixelRatio:window.devicePixelRatio,width:e,height:n}),l.setCalm(Js()),l.setZoneSetting(Ya()),await l.load(this.description,s,this.people),this.backend=l;return}catch(c){console.warn(`${J} | the 3D picture could not start here; drawing the plain one`,c),l.dispose(),this.threeFailed=!0}this.toldFlat||(this.toldFlat=!0,ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.Flat")))}let a=new Yh({images:t});a.mount(this.root,{pixelRatio:window.devicePixelRatio,width:e,height:n}),a.setCalm(Js()),a.setZoneSetting(Ya()),await a.load(this.description,s,this.people),this.backend=a}#e(t){if(this.backend?.name!=="flat"&&!this.threeFailed&&this.running){console.warn(`${J} | the 3D picture keeps failing; trying the plain one`,t),this.threeFailed=!0,this.guard.failures=0,this.rebuild().then(()=>{this.running&&(this.last=performance.now(),this.raf=requestAnimationFrame(this.#n))}).catch(e=>{this.running=!1,this.onFatal?.(e)});return}this.running=!1,this.onFatal?.(t)}async stop(){this.running=!1,cancelAnimationFrame(this.raf);for(let[t,e,n,s]of this.listeners)t.removeEventListener(e,n,s);this.listeners=[];for(let[t,e]of this.hooks)Hooks.off(t,e);this.hooks=[],this.resizeObserver?.disconnect(),this.sync?.close(),this.channel?.close(),this.channel=null,this.chalk?.stop(),this.kit?.dispose(),this.chalk?.wall?.clear(),this.speed?.stop(),this.health?.stop(),this.healthBoard?.dispose(),this.editor?.dispose(),this.tip?.dispose(),this.menu?.dispose(),this.bar?.dispose(),this.blocking?.dispose(),this.backend?.dispose(),this.root?.remove(),this.chalk=this.kit=this.speed=this.health=this.healthBoard=this.tip=this.bar=this.blocking=this.editor=this.backend=this.root=null}#n=t=>{if(!this.running)return;if(!this.pace.due(t)){this.raf=requestAnimationFrame(this.#n);return}let e=this.guard.run(()=>{let n=(t-this.last)/1e3;this.last=t,this.sync.tick(),this.stage.advance(n);let s=this.stage.snapshot({viewer:this.userId,selected:this.selected});if(this.#i(s,t),this.chalk?.inHand)for(let r of this.chalk.chalkZones())s.zones[r.id]=this.chalk.cursorZone===r.id?"target":"near";this.chalk?.wall?.flush?.(),this.health?.frame(t,this.pace.scale(t)),this.backend.draw(s),this.speed?.feed(t),this.frames++,this.frames%60===0&&this.#x();for(let r of this.stage.drain())r.type==="visit"&&this.#s(r),Hooks.callAll(`stagecraft.${r.type}`,r,this)});this.pace.drew(t),e&&(this.raf=requestAnimationFrame(this.#n))};#i(t,e){let n=Sp(t.cards);wp(this.pose,n)&&this.pace.poke(e),this.pose=n,(t.bonks?.length||this.dragging||this.chalk?.drawing||this.chalk?.wall?.strokes?.size||this.speed?.probe||this.blocking?.armed)&&this.pace.poke(e)}#s(t){let e=this.description.zones.find(d=>d.id===t.zone),n=this.stage.cards.get(t.card);if(!e||!n||!this.root||!this.backend?.project)return;let s=e.floor??e.shape,r=s.reduce((d,u)=>d+u[0],0)/s.length,o=Math.max(...s.map(d=>d[1])),a=this.stage.rig.standing([r,o])??{X:n.puppet.restX,Z:n.restZ},l=this.backend.project({X:a.X,Y:n.h*n.grow*1.12,Z:a.Z});if(!l||!Number.isFinite(l.x))return;let c=document.createElement("div");c.className="stagecraft-visit";let h=document.createElement("b");if(h.textContent=game.i18n.format("STAGECRAFT.Visit.At",{name:n.person.name??n.id,zone:e.name||e.id}),c.append(h),e.hint){let d=document.createElement("span");d.textContent=e.hint,c.append(d)}c.style.left=`${Math.round(l.x)}px`,c.style.top=`${Math.round(l.y)}px`,this.root.append(c),setTimeout(()=>c.remove(),4200)}#r(t,e,n,s){t.addEventListener(e,n,s),this.listeners.push([t,e,n,s])}#o(t){let e=this.root.getBoundingClientRect();return{x:t.clientX-e.left,y:t.clientY-e.top}}#c(t,e=this.root.getBoundingClientRect()){let n=t.pointerType==="pen"&&(t.button===5||(t.buttons&32)!==0);return{x:t.clientX-e.left,y:t.clientY-e.top,pressure:t.pressure,pointerType:t.pointerType,t:t.timeStamp,shift:t.shiftKey,alt:t.altKey,flip:n}}#a(){let t=this.backend.canvas;this.#r(t,"contextmenu",n=>n.preventDefault()),this.#r(t,"pointerdown",n=>{if(this.pace.poke(performance.now()),this.tip?.hide(),n.button===2&&this.chalk?.inHand){this.chalk.putAway();return}if(n.button===2&&this.blocking?.disarm())return;if(n.button===2){let l=this.#o(n),c=this.backend.pick(l.x,l.y);c?.kind==="card"&&this.menu?.open(c.id,n.clientX,n.clientY)&&n.preventDefault();return}if(n.button!==0&&!(n.button===5&&n.pointerType==="pen"&&this.chalk?.inHand))return;let s=this.#o(n),r=this.backend.pick(s.x,s.y);if(this.blocking&&!this.chalk?.inHand){if(this.blocking.armed){let l=r?.kind==="card"?null:this.#h(s);if(r?.kind==="card"||l){this.blocking.placeArmed({card:r?.kind==="card"?r.id:null,at:l}).catch(c=>console.warn(`${J} | the formation could not be made`,c)),n.preventDefault();return}}if(n.shiftKey&&r?.kind==="card"){this.selected.has(r.id)?this.selected.delete(r.id):this.selected.add(r.id),this.blocking.selectionChanged(),n.preventDefault();return}if((n.ctrlKey||n.metaKey)&&r?.kind==="card"){let l=this.stage.cards.get(r.id);ho(this.scene,r.id,!l?.downTo).catch(c=>console.warn(`${J} | could not knock down ${r.id}`,c)),n.preventDefault();return}if(n.altKey&&r?.kind==="card"){uo(this.scene,this.stage.speaker===r.id?null:r.id).catch(l=>console.warn(`${J} | could not give the floor`,l)),n.preventDefault();return}}if(r?.kind==="chalk"||r?.kind==="magic"||r?.kind==="eraser"){this.chalk?.take(r.kind==="eraser"?"rub":r.kind==="magic"?"magic":r.colour),this.chalk?.hover(s),n.preventDefault();return}if(this.chalk?.inHand){n.preventDefault();let l=this.#c(n);if(this.kit?.takesPick()){this.chalk.pickColour(l);return}this.chalk.begin(l)&&(t.setPointerCapture(n.pointerId),this.chalk.hover(s));return}if(r?.kind!=="card"||!this.sync.grab(r.id))return;let o=this.backend.floorAt(s.x,s.y,r.point.y),a=this.stage.cards.get(r.id);this.dragging={id:r.id,height:r.point.y,offX:(o?.x??a.puppet.x)-a.puppet.x,offZ:(o?.z??a.Z)-a.Z},t.setPointerCapture(n.pointerId),t.style.cursor="grabbing",n.preventDefault()}),this.#r(t,"pointermove",n=>{let s=this.#o(n);if((this.dragging||this.chalk?.inHand||n.buttons)&&this.pace.poke(performance.now()),this.chalk?.drawing){let o=this.root.getBoundingClientRect(),a=n.getCoalescedEvents?.()??[];for(let l of a.length?a:[n])this.chalk.extend(this.#c(l,o))}if(this.chalk?.inHand){this.tip?.hide(),this.chalk.hover(s),t.style.cursor="none";return}if(!this.dragging){let o=this.backend.pick(s.x,s.y);t.style.cursor=o?"grab":"default",o?.kind==="card"||!this.chalk?this.tip?.hover(o?.kind==="card"?o.id:null,n.clientX,n.clientY):this.tip?.hoverWall(s,n.clientX,n.clientY);return}this.tip?.hide();let r=this.backend.floorAt(s.x,s.y,this.dragging.height);r&&this.sync.move(this.dragging.id,r.x-this.dragging.offX,r.z-this.dragging.offZ)});let e=n=>{if(this.pace.poke(performance.now()),this.chalk?.drawing){n.type==="pointercancel"?this.chalk.cancel():this.chalk.end().catch(s=>console.warn(`${J} | chalk stroke failed`,s)),this.chalk.hover(this.#o(n));return}this.dragging&&(this.sync.release(this.dragging.id),this.dragging=null,t.style.cursor="default")};this.#r(t,"pointerup",e),this.#r(t,"pointercancel",e),this.#r(t,"pointerleave",()=>{this.tip?.hide(),this.chalk?.inHand&&!this.chalk.drawing&&this.chalk.hover(null)}),this.#r(window,"keydown",n=>{if(n.code==="Escape"){if(this.chalk?.drawing)this.chalk.cancel();else if(this.chalk?.inHand)this.chalk.putAway();else if(!this.healthBoard?.close()){if(!this.blocking?.disarm())if(this.selected.size)this.selected.clear(),this.blocking?.selectionChanged();else return}n.preventDefault(),n.stopPropagation()}},!0)}#h(t){let e=this.backend.floorAt(t.x,t.y,0);if(!e)return null;let n=this.stage.rig.fractionOf(e.x,e.z);return Number.isFinite(n[0])&&Number.isFinite(n[1])?[Math.round(n[0]*1e4)/1e4,Math.round(n[1]*1e4)/1e4]:null}perform(t){this.pace.poke(performance.now()),this.dragging&&this.sync.verb(this.dragging.id,t)}#l(t,e){let n=this.stage.cards.get(t)?.person,s=game.users.get(e);return!!n&&!!s&&Xa(n,s,{handsOff:js(this.scene)})}#u(t){this.dragging?.id===t&&(this.dragging=null,this.backend?.canvas&&(this.backend.canvas.style.cursor="default"))}#d(t){if(!Qn())return;let e=this.stage.placeOf(t.card);e&&(this.saving=fs(()=>this.#f(e)).catch(n=>console.warn(`${J} | could not save where a card was put down`,n)))}async#f(t){let e=this.scene.flags?.[J]?.published?.cards;!Array.isArray(e)||!e.some(n=>n.id===t.id)||await this.scene.update({[`flags.${J}.published.cards`]:Rm(e,t)})}#m(){let t=_o(this.scene),e=new Set(t.map(n=>n.id));this.stage.setLife(lo(this.scene)),this.stage.setBoard(co(this.scene)),this.#p();for(let n of t){let s=this.stage.cards.get(n.id);if(s){this.#y(s,n);continue}let r=this.stage.addCard(n);r&&(r.appliedMove=n.move?.t0??null),this.people.push(n),this.backend.addCard(n).catch(o=>console.warn(`${J} | could not draw ${n.id}`,o))}for(let n of[...this.stage.cards.keys()])e.has(n)||(this.sync.forget(n),this.dragging?.id===n&&this.#u(n),this.stage.removeCard(n),this.backend.removeCard(n),this.people=this.people.filter(s=>s.id!==n));this.stage.setSpeaker($f(this.scene)),this.stage.setTurn(pu(this.scene))}#g(){let t="stagecraft.gmOpen",e=!1;try{e=globalThis.localStorage?.getItem(t)==="1"}catch{}let n=document.createElement("button");n.type="button",n.className="stagecraft-gm-toggle";let s=()=>{this.root?.classList.toggle("stagecraft-gm-open",e),n.textContent=game.i18n.localize(e?"STAGECRAFT.Gm.Hide":"STAGECRAFT.Gm.Show"),n.setAttribute("aria-expanded",e?"true":"false")};n.addEventListener("click",()=>{e=!e;try{globalThis.localStorage?.setItem(t,e?"1":"0")}catch{}s()}),this.root.append(n),s()}#p(){if(!this.root)return;if(!(this.stage.board&&this.stage.zones.some(n=>n.kind==="area"))){this.keyEl?.remove(),this.keyEl=null;return}if(this.keyEl)return;let e=n=>game.i18n.localize(`STAGECRAFT.Board.${n}`);this.keyEl=document.createElement("div"),this.keyEl.className="stagecraft-board-key",this.keyEl.innerHTML=`<b>${e("Title")}</b><span><i class="engaged"></i>${e("Engaged")}</span><span><i class="near"></i>${e("Near")}</span><span><i class="far"></i>${e("Far")}</span>`,this.root.append(this.keyEl)}#y(t,e){let n=JSON.stringify(e.home??null)!==JSON.stringify(t.person.home??null);(n||JSON.stringify(e.life??null)!==JSON.stringify(t.person.life??null))&&this.stage.setRoutine(e.id,e.life,n&&Array.isArray(e.home)?e.home:null),this.stage.setDown(e.id,e.down===!0);let s=Lf(e)!==Lf(t.person);t.person={...t.person,...e,portrait:t.person.portrait},s&&this.backend?.refreshCard?.({...t.person})?.catch(o=>console.warn(`${J} | could not redraw ${e.id}`,o));let r=e.move;if(r&&Number.isFinite(r.t0)&&r.t0!==t.appliedMove){t.appliedMove=r.t0,this.stage.walkTo(e.id,e.mark?{mark:e.mark}:{at:e.at},{t0:r.t0,gait:r.gait??"walk",yaw:Number.isFinite(e.yaw)?e.yaw:null,lean:e.lean??0,pitch:e.pitch??0,still:e.still===!0,packed:e.packed===!0});return}t.holder===null&&(t.still=e.still===!0,t.packed=e.packed===!0)}#x(){let t=this.backend;if(!this.chalk||!this.root||!t?.setChalkBoxAt||!t.view||!this.stage?.rig)return;let e=this.stage.rig,n=this.root.getBoundingClientRect(),s=t.view,r=qf([...Zf(),...this.#_()],n,s),o={x0:s.ox,y0:s.oy,x1:s.ox+s.visW,y1:s.oy+s.visH},a=this.description.chalk?.box??eo,l;Ra(e,a,r,o)?l=[a[0],a[1]]:this.boxAt&&Ra(e,this.boxAt,r,o)?l=this.boxAt:l=B0(e,a,r,o,this.stage.cardShapes()),!(this.boxAt&&l[0]===this.boxAt[0]&&l[1]===this.boxAt[1])&&(this.boxAt=l,t.setChalkBoxAt(l))}#_(){let t=[];for(let e of["hotbar"]){let s=document.getElementById(e)?.getBoundingClientRect?.();s&&s.width>0&&s.height>0&&t.push({rect:[s.left,s.top,s.right,s.bottom]})}return t}#v(){let t=()=>{!this.backend||!this.root||(this.backend.resize(this.root.clientWidth,this.root.clientHeight,window.devicePixelRatio),this.#x())};this.resizeObserver=new ResizeObserver(t),this.resizeObserver.observe(this.root),t()}#b(){this.hooks.push(["stagecraft.settingsChanged",Hooks.on("stagecraft.settingsChanged",t=>{t==="calm"&&(this.backend?.setCalm(Js()),this.stage?.setCalm(Js())),t==="power"&&(this.pace.easing=Au()),t==="zones"&&this.backend?.setZoneSetting(Ya()),t==="tier"&&ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.TierNextScene"))})])}#S(){this.hooks.push(["userConnected",Hooks.on("userConnected",(t,e)=>{e||this.sync?.userGone(t.id)})]),this.hooks.push(["updateScene",Hooks.on("updateScene",t=>{t.id===this.scene.id&&this.#M()})])}#M(){if(!this.running&&!this.root)return;this.pace.poke(performance.now());let t=JSON.stringify(this.scene.flags?.[J]?.stage??null);if(t!==this.described){this.described=t,globalThis.canvas?.scene?.id===this.scene.id&&globalThis.canvas.draw();return}this.chalk?.refresh(),this.bar?.refresh(),this.blocking?.refresh(),this.editor?.refresh(),this.#m(),js(this.scene)&&!game.user.isGM&&this.dragging&&(this.sync.release(this.dragging.id),this.dragging=null)}#w(){console.warn(`${J} | the graphics context was lost; the stage will be rebuilt`),++this.losses>=2&&(this.threeFailed=!0),this.rebuild().catch(t=>{console.error(`${J} | the stage could not be rebuilt`,t),this.onFatal?.(t)})}async rebuild(){if(!(!this.running||this.rebuilding)){this.rebuilding=!0;try{await this.#T()}finally{this.rebuilding=!1}}}async#T(){for(let[t,e,n,s]of this.listeners)t.removeEventListener(e,n,s);this.listeners=[],this.backend.dispose(),await this.#t(),!(!this.running||!this.backend)&&(this.chalk?.reset(),this.chalk?.sync(),this.chalk?.refresh(),this.boxAt=null,this.#x(),this.#a(),this.pace.poke(performance.now()),this.health?.changed(),this.speed?.start())}};var ps={host:null};function oy(i,{makeHost:t=n=>new _u(n),services:e={}}={}){let n=foundry.canvas.SceneManager;class s extends n{#t=null;#e=null;async _onDraw(){let a=canvas.app.view;this.#t=t({scene:this.scene,skins:i,anchor:a,services:e,onFatal:()=>this.#n()});let l=!1;try{this.#e={display:a.style.display},a.style.display="none",canvas.app.stop(),l=await this.#t.start()}catch(c){console.error(`${J} | could not take over "${this.scene.name}"`,c),ui.notifications?.error(game.i18n.format("STAGECRAFT.Notify.Failed",{scene:this.scene.name}))}if(l){ps.host=this.#t;return}try{await this.#t?.stop()}catch(c){console.error(`${J} | the stage did not stop cleanly`,c)}this.#t=null,this.#i()}async _onTearDown(){ps.host===this.#t&&(ps.host=null),await this.#t?.stop(),this.#t=null,this.#i()}async#n(){if(!this.#t)return;let a=this.#t;this.#t=null,ps.host===a&&(ps.host=null),ui.notifications?.error(game.i18n.format("STAGECRAFT.Notify.Failed",{scene:this.scene.name}));try{await a.stop()}catch(l){console.error(`${J} | the stage did not stop cleanly`,l)}this.#i()}#i(){this.#e&&(canvas.app.view.style.display=this.#e.display||"block",canvas.app.start(),this.#e=null)}}let r=CONFIG.Canvas.managedScenes;return CONFIG.Canvas.managedScenes=new Proxy(r,{get(o,a,l){if(typeof a!="string")return Reflect.get(o,a,l);if(Object.hasOwn(o,a))return o[a];let c=game.scenes?.get(a);return c&&qs(c)?s:void 0}}),s}var Yw="0.11.0";function ay({skins:i,current:t}){return{version:Yw,skins:{register:e=>i.register(e),use:e=>i.use(e),list:()=>i.list()},scenes:{isStage:e=>qs(e),describe:e=>Ys(e),validate:e=>Zs(e)},blocking:{formations:[...nl],gaits:[...im],routines:[...Fu],move:(e,n)=>Oa(e,n),arrange:(e,n,s={})=>Ua(e,n,s,t.host),backToPlaces:e=>lu(e),keepPlaces:(e,n=null)=>cu(e,t.host,n),setChalkBox:(e,n)=>hu(e,n),editStage:(e,n)=>Fa(e,n),tidy:e=>uu(e,t.host),setLife:(e,n)=>du(e,n),setBoard:(e,n)=>fu(e,n),setSpeaker:(e,n)=>uo(e,n),setTurn:(e,n)=>Kx(e,n),setBadges:(e,n,s)=>Jx(e,n,s),setDown:(e,n,s)=>ho(e,n,s),setEmote:(e,n,s,r={})=>Ba(e,n,s,r),registerMoments:e=>Qx(e),setCover:e=>ty(e)},stage:()=>t.host?{stage:t.host.stage,backend:t.host.backend}:null,zoneKinds:[...gp],chalkModes:[...xo],emotes:[...ul],chalkTools:[...Fh]}}var jw=[{action:"hop",verb:"hop",key:"Space"},{action:"nod",verb:"nod",key:"KeyN"},{action:"bow",verb:"bow",key:"KeyB"},{action:"shake",verb:"shake",key:"KeyX"},{action:"turn",verb:"turn",key:"KeyT"}];function ly(i){for(let{action:t,verb:e,key:n}of jw)game.keybindings.register(J,t,{name:`STAGECRAFT.Keys.${t}`,editable:[{key:n}],onDown:()=>{let s=i();return s?.dragging?(s.perform(e),!0):!1},restricted:!1,precedence:CONST.KEYBINDING_PRECEDENCE.PRIORITY})}var Kw="Stagecraft chalk",Ha=2,po=()=>({render:!1});function Gs(i,t,e){globalThis._del!==void 0?i[`${t}.${e}`]=globalThis._del:i[`${t}.-=${e}`]=null}var mo=class i{#t=Promise.resolve();constructor(){this.listeners=new Set,this.hooks=[];for(let t of["createJournalEntryPage","updateJournalEntryPage","deleteJournalEntryPage"])this.hooks.push([t,Hooks.on(t,e=>this.#a(e))]);for(let t of["createJournalEntry","updateJournalEntry","deleteJournalEntry"])this.hooks.push([t,Hooks.on(t,e=>this.#h(e))]);this.hooks.push(["deleteScene",Hooks.on("deleteScene",t=>this.#u(t))]);for(let t of["createScene","updateScene"])this.hooks.push([t,Hooks.on(t,()=>this.#i())]);this.#l()}dispose(){for(let[t,e]of this.hooks)Hooks.off(t,e);this.hooks=[],this.listeners.clear()}get entry(){return game.journal?.find(t=>t.getFlag(J,"chalk")===!0)??null}get ready(){return!!this.entry}static wanted(){return!!game.scenes?.some(t=>qs(t)&&Lh(yo(t).chalk,t.flags?.[J]?.live?.chalk).mode!=="off")}static#e=null;static ensure(){return Qn()?i.#e??=i.#n().finally(()=>{i.#e=null}):Promise.resolve(null)}static async#n(){let t=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,e=game.journal.find(n=>n.getFlag(J,"chalk")===!0);return e?(e.ownership?.default??0)<t&&await e.update({"ownership.default":t}):e=await JournalEntry.create({name:Kw,flags:{[J]:{chalk:!0}},ownership:{default:t}}),e}#i(){!Qn()||this.ready||!i.wanted()||i.ensure().catch(t=>console.warn(`${J} | could not make the chalk journal`,t))}#s(t){return(this.entry?.pages??[]).filter(e=>{let n=e.getFlag(J,"chalk");return n?.scene===t&&n?.v===Ha})}#r(t,e){return this.#s(t).find(n=>n.getFlag(J,"chalk")?.by===e)??null}layers(t){return this.#s(t).map(e=>{let n=e.getFlag(J,"chalk");return{by:n.by,since:n.since??0,tiles:{...n.tiles??{}},history:{...n.history??{}}}})}#o(t){let e=this.#t.then(t);return this.#t=e.catch(()=>{}),e}save(t,{by:e=game.user.id,tiles:n,step:s=null,grid:r=null}){return this.#o(async()=>{let o=this.entry;if(!o)return!1;let a=Object.keys(n??{}).filter(u=>!r||H0(r,u));if(!a.length)return!1;let l=this.#r(t,e);if(!l){if(e!==game.user.id&&!game.user.isGM)return!1;let u=Object.fromEntries(a.filter(x=>n[x]).map(x=>[x,n[x]])),f=s?{[s.id]:{at:s.at,who:game.user.id,tiles:Object.fromEntries(a.map(x=>[x,null]))}}:{};return await o.createEmbeddedDocuments("JournalEntryPage",[{name:`chalk ${t} ${e}`,type:"text",text:{content:""},flags:{[J]:{chalk:{v:Ha,scene:t,by:e,since:s?.at??Date.now(),tiles:u,history:f}}}}],po()),!0}let c=l.getFlag(J,"chalk"),h={},d=`flags.${J}.chalk`;for(let u of a)n[u]?h[`${d}.tiles.${u}`]=n[u]:c.tiles?.[u]!==void 0&&Gs(h,`${d}.tiles`,u);if(s){let u={at:s.at,who:game.user.id,tiles:Object.fromEntries(a.map(f=>[f,c.tiles?.[f]??null]))};h[`${d}.history.${s.id}`]=u;for(let f of wf({...c.history??{},[s.id]:u},{protect:s.id}))Gs(h,`${d}.history`,f)}return await l.update(h,po()),!0})}tidy({now:t=Date.now(),hours:e=W0}={}){return!Qn()||!this.entry?Promise.resolve({steps:0,pages:0}):this.#o(async()=>{let n=this.entry,s=t-e*3600*1e3,r=c=>{let h=game.scenes;return h?typeof h.get=="function"?!!h.get(c):[...h].some(d=>d.id===c):!0},o=`flags.${J}.chalk`,a=0,l=[];for(let c of[...n.pages??[]]){let h=c.getFlag(J,"chalk");if(!h)continue;if(h.v!==Ha||h.scene&&!r(h.scene)){l.push(c.id);continue}let d=wf(h.history,{before:s}),u=Object.keys(h.history??{}).length-d.length;if(!Object.keys(h.tiles??{}).length&&u<=0){l.push(c.id);continue}if(!d.length)continue;let f={};for(let x of d)Gs(f,`${o}.history`,x);await c.update(f,po()),a+=d.length}return l.length&&await n.deleteEmbeddedDocuments("JournalEntryPage",l,po()),{steps:a,pages:l.length}})}undo(t,{by:e=null}={}){return this.#o(async()=>{let s=this.#s(t).map(a=>{let l=a.getFlag(J,"chalk"),c=e?Object.fromEntries(Object.entries(l.history??{}).filter(([,h])=>h?.who===e)):l.history;return{by:l.by,history:c,page:a}}),r=V0(s);if(!r)return null;let o={};for(let a of s){let l=a.history?.[r.id];if(!l||!a.page.isOwner)continue;let c=`flags.${J}.chalk`,h=a.page.getFlag(J,"chalk"),d={};Gs(d,`${c}.history`,r.id);let u={};for(let[f,x]of Object.entries(l.tiles??{}))u[f]=h.tiles?.[f]??null,x?d[`${c}.tiles.${f}`]=x:h.tiles?.[f]!==void 0&&Gs(d,`${c}.tiles`,f);await a.page.update(d,po()),o[a.by]=u}return{id:r.id,layers:o}})}wipe(t,{by:e=null}={}){return game.user.isGM?this.#o(async()=>{for(let n of this.#s(t)){let s=n.getFlag(J,"chalk");if(e&&s?.by!==e)continue;let r=`flags.${J}.chalk`,o={};for(let a of Object.keys(s?.tiles??{}))Gs(o,`${r}.tiles`,a);for(let a of Object.keys(s?.history??{}))Gs(o,`${r}.history`,a);Object.keys(o).length&&await n.update(o,po())}}):Promise.resolve()}painters(t){return this.layers(t).filter(e=>Object.keys(e.tiles).length).map(e=>e.by)}onChange(t){return this.listeners.add(t),()=>this.listeners.delete(t)}#c(t,e=null){for(let n of this.listeners)n(t,e)}#a(t){if(t.parent?.id!==this.entry?.id)return;let e=t.getFlag(J,"chalk");if(e?.v!==Ha){this.#l();return}e?.scene&&this.#c(e.scene,e.by)}#h(t){t.getFlag(J,"chalk")===!0&&(this.#c(null),this.#l())}#l(){if(!Qn()||!this.entry)return;let t=(this.entry.pages??[]).filter(e=>{let n=e.getFlag(J,"chalk");return n&&n.v!==Ha}).map(e=>e.id);t.length&&this.#o(()=>this.entry.deleteEmbeddedDocuments("JournalEntryPage",t)).catch(e=>{/does not exist/.test(e?.message??"")||console.warn(`${J} | could not remove old chalk pages`,e)})}#u(t){!Qn()||!t?.id||this.#o(async()=>{let e=(this.entry?.pages??[]).filter(n=>n.getFlag(J,"chalk")?.scene===t.id).map(n=>n.id);e.length&&await this.entry.deleteEmbeddedDocuments("JournalEntryPage",e)}).catch(e=>{/does not exist/.test(e?.message??"")||console.warn(`${J} | could not clear the chalk of a deleted scene`,e)})}};function Jw(i,t,{user:e=game.user,journal:n=game.journal}={}){if(e?.isGM||!t?.querySelectorAll)return 0;let s=n?.find(o=>o.getFlag(J,"chalk")===!0);if(!s)return 0;let r=[...t.querySelectorAll(`[data-entry-id="${s.id}"]`)];for(let o of r)o.remove();return r.length}function cy(){Hooks.on("renderJournalDirectory",(i,t)=>Jw(i,t))}var Jf=new Wa,Qf={chalkStore:null};Hooks.once("init",()=>{Ip(),ly(()=>ps.host),Qf.chalkStore=new mo,cy(),oy(Jf,{services:Qf}),Hooks.callAll("stagecraft.init",{registerSkin:i=>Jf.register(i)})});Hooks.once("ready",async()=>{let i=game.modules.get("stagecraft");i.api=ay({skins:Jf,current:ps});try{mo.wanted()&&await mo.ensure()}catch(t){console.warn("stagecraft | could not make the chalk journal",t)}Hooks.callAll("stagecraft.ready",i.api),setTimeout(()=>Qf.chalkStore?.tidy().catch(t=>console.warn("stagecraft | could not tidy the chalk journal",t)),8e3)});
/*! Bundled license information:

three/build/three.core.js:
three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2026 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
