var Tp={family:'"Modesto Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif',weight:700,max:66,min:34,maxLines:3,lineHeight:1.04,tracking:.04,upper:!0},Ep={family:'Signika, "Helvetica Neue", Arial, sans-serif',weight:700,max:32,min:28,maxLines:3,lineHeight:1.16,tracking:.01,upper:!1},Gy={...Tp,max:48,min:26,maxLines:3},Vy={...Ep,max:28,min:22,maxLines:2},wp='600 34px "Helvetica Neue", Arial, sans-serif';function yo(n,t,e,i,s,r){n.beginPath(),n.roundRect(t,e,i,s,r)}var Ap={id:"paper",name:"Paper",size:{w:280,h:468},thickness:9,fonts:["700 40px 'Modesto Condensed'","700 28px Signika"],stick:{length:134,collar:12170148,wood:13081186},materials:{body:{color:15196109,metalness:0,roughness:.9},face:{metalness:0,roughness:.85,clearcoat:.15},back:{metalness:0,roughness:.9}},async face(n,{loadImage:t,titleBlock:e}={}){let r=document.createElement("canvas");r.width=560,r.height=936;let o=r.getContext("2d");yo(o,0,0,560,936,28),o.fillStyle="#f3ecdc",o.fill(),o.lineWidth=6,o.strokeStyle="#3b3226",yo(o,6,6,548,924,24),o.stroke();let a=36,l=36,c=488,h=e?.fit(n,{width:c-56,maxHeight:236,gap:14,name:Tp,text:Ep})??null,u=h?Math.min(300,Math.max(104,Math.ceil(h.height)+44)):98,d=936-l-36-34-u;o.save(),yo(o,a,l,c,d,14),o.clip(),o.fillStyle="#cfc6b0",o.fillRect(a,l,c,d);let f=n.portrait&&t?await t(n.portrait):null;if(f){let g=Math.max(c/f.width,d/f.height);o.drawImage(f,a+(c-f.width*g)/2,l+(d-f.height*g)*.15,f.width*g,f.height*g)}else o.fillStyle="#3b3226",o.font=`700 ${Math.round(Math.min(c,d)*.5)}px sans-serif`,o.textAlign="center",o.textBaseline="middle",o.fillText((n.name??"?").slice(0,1).toUpperCase(),a+c/2,l+d/2);o.restore(),n.colour&&(o.fillStyle=n.colour,o.fillRect(a,l+d+14,c,8));let x=l+d+34;return h?e.draw(o,h,{x:a,y:x,w:c,h:u},{ink:"#2b241a",textInk:"#4a3f2f",rule:"rgba(59,50,38,0.4)"}):(o.fillStyle="#3b3226",o.font=wp,o.textAlign="center",o.textBaseline="middle",o.fillText((n.name??n.id).toUpperCase(),560/2,x+(936-x-36)/2)),r},async back(n,{titleBlock:t}={}){let s=document.createElement("canvas");s.width=560,s.height=936;let r=s.getContext("2d");yo(r,0,0,560,936,28),r.fillStyle="#b9966a",r.fill();let o=t?.fit(n,{width:372,maxHeight:200,gap:12,name:Gy,text:Vy})??null,a=o?Math.min(250,Math.max(88,Math.ceil(o.height)+40)):88;return r.fillStyle="#f3ecdc",yo(r,560/2-206,936/2-a/2,412,a,6),r.fill(),o?t.draw(r,o,{x:560/2-206,y:936/2-a/2,w:412,h:a},{ink:"#2b241a",textInk:"#4a3f2f",rule:"rgba(59,50,38,0.4)"}):(r.fillStyle="#3b3226",r.font=wp,r.textAlign="center",r.textBaseline="middle",r.fillText(n.name??n.id,560/2,936/2+2)),s}};var Wy=["id","size","face","back"],qa=class{constructor(){this.skins=new Map,this.register(Ap),this.current="paper"}register(t){for(let e of Wy)if(!t?.[e])throw new Error(`a skin needs "${e}"`);if(typeof t.face!="function"||typeof t.back!="function")throw new Error("a skin's face and back are functions");if(!(t.size?.w>0&&t.size?.h>0))throw new Error("a skin's size is { w, h } in pixels");return this.skins.set(t.id,{thickness:9,fonts:[],stick:{length:134,collar:12170148,wood:13081186},materials:{},...t}),t.id}get(t){return this.skins.get(t)??this.skins.get(this.current)??this.skins.get("paper")}use(t){if(!this.skins.has(t))throw new Error(`no skin "${t}" is registered`);this.current=t}list(){return[...this.skins.keys()]}};var vo=Object.freeze(["off","zones","anywhere"]),Xy=.15,Pp=Object.freeze(["door","spot","area","exit","track","chalk","podium","photo","quiet","music","shelter","shot","trigger"]),qs=n=>typeof n=="number"&&Number.isFinite(n),Cp=(n,t=-.25,e=1.25)=>qs(n)&&n>=t&&n<=e,Zs=n=>Array.isArray(n)&&n.length===2&&Cp(n[0])&&Cp(n[1]),Se=(n,t)=>qs(n)?n:t,Je=(n,t="")=>typeof n=="string"?n:t;function Iu(n,t,e,i=0){if(!Array.isArray(n))return e.push(`${t}: expected a list of [x, y] points`),[];let s=[];return n.forEach((r,o)=>Zs(r)?s.push([r[0],r[1]]):e.push(`${t}[${o}]: not a point on the painting`)),s.length<i&&e.push(`${t}: needs at least ${i} points`),s}function Rp(n,t,e){let i=new Set;return n.filter(s=>s.id?i.has(s.id)?(e.push(`${t}: id "${s.id}" is used twice`),!1):(i.add(s.id),!0):(e.push(`${t}: an entry has no id`),!1))}function Ys(n){let t=[],e=n&&typeof n=="object"?n:{};(!n||typeof n!="object")&&t.push("the scene carries no stage description");let i={src:Je(e.painting?.src),size:Array.isArray(e.painting?.size)&&e.painting.size.length===2&&e.painting.size.every(g=>qs(g)&&g>0)?[e.painting.size[0],e.painting.size[1]]:null};i.src||t.push("painting.src: the stage needs a painting"),i.size||t.push("painting.size: give the painting's size in pixels, [width, height]");let s={horizon:Se(e.rig?.horizon,null),floorFront:Se(e.rig?.floorFront,null),depth:Se(e.rig?.depth,null),vanish:Se(e.rig?.vanish,.5),lift:Se(e.rig?.lift,0)};for(let g of["horizon","floorFront","depth"])s[g]===null&&t.push(`rig.${g}: the rig needs a number here`);s.horizon!==null&&s.floorFront!==null&&s.floorFront<=s.horizon&&t.push("rig: the floor must meet the front of the picture below the horizon"),s.depth!==null&&s.depth<=0&&t.push("rig.depth: must be above zero");let r=(Array.isArray(e.lights)?e.lights:[]).flatMap((g,p)=>{if(!Zs(g?.at))return t.push(`lights[${p}].at: not a point on the painting`),[];let m=Array.isArray(g.colour)&&g.colour.length===3&&g.colour.every(qs)?g.colour.map(M=>Math.max(0,Math.min(255,M))):[255,172,96];return[{id:Je(g.id,`light-${p+1}`),at:[g.at[0],g.at[1]],below:Se(g.below,.9),colour:m,intensity:Math.max(0,Se(g.intensity,1)),flicker:Math.max(0,Math.min(.5,Se(g.flicker,.05))),flickerHz:Math.max(.5,Se(g.flickerHz,7)),pool:qs(g.pool)&&g.pool>0?g.pool:0,shadow:g.shadow===!0}]}),o=(Array.isArray(e.occluders)?e.occluders:[]).flatMap((g,p)=>{let m=Iu(g?.poly,`occluders[${p}].poly`,t,3);return m.length<3?[]:[{id:Je(g.id,`occluder-${p+1}`),poly:m,base:Se(g.base,.86),x:Se(g.x,.5),riser:g.riser!==!1,hideAtMost:Math.max(.05,Math.min(1,Se(g.hideAtMost,Xy)))}]}),a=(Array.isArray(e.zones)?e.zones:[]).flatMap((g,p)=>{let m=Iu(g?.shape,`zones[${p}].shape`,t,3);if(m.length<3)return[];let M=g.floor===void 0?null:Iu(g.floor,`zones[${p}].floor`,t,3),E=Array.isArray(g.tags)?g.tags.filter(w=>typeof w=="string"&&w.trim()).map(w=>w.trim()):[],_=Array.isArray(g.near)?g.near.filter(w=>typeof w=="string"):[],T=Array.isArray(g.colour)&&g.colour.length===3&&g.colour.every(qs)?g.colour.map(w=>Math.max(0,Math.min(255,w))):null;return[{id:Je(g.id),kind:Je(g.kind,"trigger")||"trigger",name:Je(g.name),hint:Je(g.hint),shape:m,floor:M&&M.length>=3?M:null,quiet:g.quiet===!0,gate:["open","ask","locked","hidden"].includes(g.gate)?g.gate:"open",to:Je(g.to),tags:E,near:_,colour:T}]}),l=Rp(a,"zones",t);for(let g of l)for(let p of g.near)l.some(m=>m.id===p)||t.push(`zones: "${g.id}" is near "${p}", which is not in this scene`);let c=(Array.isArray(e.marks)?e.marks:[]).flatMap((g,p)=>{if(!Zs(g?.at))return t.push(`marks[${p}].at: not a point on the painting`),[];let m=g.faces&&typeof g.faces=="object"?Zs(g.faces.point)?{point:[g.faces.point[0],g.faces.point[1]]}:Je(g.faces.zone)?{zone:Je(g.faces.zone)}:Je(g.faces.card)?{card:Je(g.faces.card)}:null:null;return[{id:Je(g.id),at:[g.at[0],g.at[1]],yaw:Se(g.yaw,0),lean:Se(g.lean,0),pitch:Se(g.pitch,0),lift:Math.max(0,Se(g.lift,0)),capacity:Math.max(1,Math.round(Se(g.capacity,1))),label:Je(g.label),group:Je(g.group),zone:Je(g.zone),faces:m}]}),h=Rp(c,"marks",t);for(let g of h)g.zone&&!l.some(p=>p.id===g.zone)&&t.push(`marks: "${g.id}" belongs to zone "${g.zone}", which is not in this scene`);for(let g of h)g.faces?.zone&&!l.some(p=>p.id===g.faces.zone)&&t.push(`marks: "${g.id}" faces zone "${g.faces.zone}", which is not in this scene`);let u=vo.includes(e.chalk?.mode)?e.chalk.mode:"off";e.chalk?.mode!==void 0&&!vo.includes(e.chalk.mode)&&t.push(`chalk.mode: "${e.chalk.mode}" is not one of ${vo.join(", ")}`);let d={mode:u,lock:e.chalk?.lock===!0,weather:e.chalk?.weather===!0,box:Zs(e.chalk?.box)?[e.chalk.box[0],e.chalk.box[1]]:null};d.mode==="zones"&&!l.some(g=>g.kind==="chalk")&&t.push("chalk: the mode is zones but the scene has no zone of kind chalk");let f={version:1,painting:i,rig:s,skin:Je(e.skin),cardScale:Math.max(.2,Math.min(2,Se(e.cardScale,.7))),ambient:Math.max(0,Se(e.ambient,1.7)),lights:r,occluders:o,zones:l,marks:h,chalk:d,marksOnly:e.marksOnly===!0,grade:Math.max(0,Math.min(1.5,Se(e.grade,1))),footlights:e.footlights===!0,focus:Zs(e.focus)?[e.focus[0],e.focus[1]]:null,board:e.board===!0,reach:{snap:Math.max(40,Se(e.reach?.snap,170)),show:Math.max(200,Se(e.reach?.show,700))}},x=!!(i.src&&i.size&&s.horizon!==null&&s.floorFront!==null&&s.depth!==null);return{ok:t.length===0,usable:x,scene:f,problems:t}}var j="stagecraft",_o=n=>n?.flags?.[j]?.stage??null,js=n=>!!_o(n)&&typeof _o(n)=="object",Un=n=>Array.isArray(n?.flags?.[j]?.published?.cards)?n.flags[j].published.cards:[];function Ks(n){let t=Ys(_o(n));return t.usable&&t.scene.painting.src&&globalThis.foundry?.utils?.getRoute&&(t.scene.painting.src=foundry.utils.getRoute(t.scene.painting.src)),t}function Mo(n){let t=globalThis.foundry?.utils?.getRoute??(e=>e);return Un(n).filter(e=>e&&typeof e.id=="string").map(e=>({...e,portrait:e.portrait?t(e.portrait):e.portrait}))}function tn(){if(!game.user?.isGM)return!1;let n=game.users?.activeGM;return n?n.id===game.user.id:!0}var Js=n=>n?.flags?.[j]?.live?.handsOff===!0;function Ya(n,t,{handsOff:e=!1}={}){return t?.isGM?!0:e?!1:!Array.isArray(n?.owners)||n.owners.length===0?!0:n.owners.includes(t?.id)}var Bn=Object.freeze({ignore:30,take:90,least:30,fineMs:20,slowRatio:1.4,veryRatio:2.2,display:16.666666666666668,patience:12e3,settle:4e3,again:45e3,keepHours:12}),Qs=Object.freeze(["high","low","flat"]),$y=n=>Qs[Qs.indexOf(n)+1]??null,Ip=(n,t)=>Qs.indexOf(n)>=Qs.indexOf(t)?n:t,Zy=n=>n.length?n[Math.floor(n.length/2)]:0,qy=Object.freeze([30,60,72,75,90,100,120,144,165,240]);function kp(n,t=Bn){let e=(n??[]).filter(r=>Number.isFinite(r)&&r>0).sort((r,o)=>r-o);if(e.length<8)return t.display;let i=e[Math.floor(e.length*.2)];if(i<1e3/244||i>1e3/28)return t.display;let s=qy.find(r=>1e3/r<=i*1.05);return s?1e3/s:t.display}function Lp(n,t=Date.now(),e=Bn){return Number.isFinite(n)&&t-n>=0&&t-n<e.keepHours*3600*1e3}var ja=class{constructor(t=Bn){this.limits=t,this.seen=0,this.gaps=[],this.began=null,this.previous=null}push(t){this.began??=t,this.elapsed=t-this.began;let e=this.previous===null?null:t-this.previous;this.previous=t,!(e===null||++this.seen<=this.limits.ignore)&&Number.isFinite(e)&&e>=0&&this.gaps.length<this.limits.take&&this.gaps.push(e)}get done(){return this.gaps.length>=this.limits.take||(this.elapsed??0)>=this.limits.patience}result(){let t=[...this.gaps].sort((e,i)=>e-i);return{n:t.length,median:Zy(t),p90:t.length?t[Math.min(t.length-1,Math.floor(t.length*.9))]:0}}};function Dp(n,{limits:t=Bn,display:e=null,cap:i=60,patient:s=!1}={}){if(n.n<t.least)return s&&n.n>=8?"very-slow":"unknown";if(n.median<=t.fineMs)return"ok";let r=Number.isFinite(i)&&i>0?Math.min(i,60):60,o=Math.max(1e3/r,e??t.display),a=n.median/o;return a>t.veryRatio?"very-slow":a>t.slowRatio?"slow":"ok"}function Np({tier:n,verdict:t,strikes:e=0,hard:i=0}){if(n==="flat"||n==null)return{to:null,strikes:0,hard:0};if(t==="ok")return{to:null,strikes:0,hard:0};if(t!=="slow"&&t!=="very-slow")return{to:null,strikes:e,hard:i};let s=e+1,r=i+(t==="very-slow"?1:0);return s<2?{to:null,strikes:s,hard:r}:{to:r>=2?"flat":$y(n),strikes:0,hard:0}}var xs=Object.freeze({cap:60,idle:30,wake:1500,walking:.5,still:.02,early:1.5});function Op({fps:n,mode:t=null,max:e=null}={}){let i=Number.isFinite(Number(n))&&Number(n)>0?Number(n):xs.cap;return e!==null&&t===e&&i>=60?1/0:Math.max(10,Math.min(60,i))}var Ka=class{constructor({cap:t=xs.cap,idle:e=xs.idle,wake:i=xs.wake,easing:s=!0}={}){this.cap=t,this.idle=e,this.wake=i,this.easing=s,this.awakeUntil=-1/0,this.next=-1/0}poke(t){this.awakeUntil=Math.max(this.awakeUntil,t+this.wake)}active(t){return!this.easing||t<this.awakeUntil}gap(t){let e=this.active(t)?this.cap:Math.min(this.cap,this.idle);return e===1/0?0:1e3/e}due(t){return t>=this.next-xs.early}drew(t){let e=this.gap(t);if(!e){this.next=t;return}this.next=this.next+e<t-e?t:this.next+e}scale(t){let e=this.cap===1/0?0:1e3/this.cap,i=this.gap(t);return e&&i?e/i:1}};function Fp(n){let t=new Float32Array(n.length*4),e=0;for(let i of n)t[e++]=i.x??0,t[e++]=i.z??0,t[e++]=i.grip??0,t[e++]=i.down??0;return t}function Up(n,t,{walking:e=xs.walking,still:i=xs.still}={}){if(!n||n.length!==t.length)return n!=null;for(let s=0;s<t.length;s++){let r=s&2?i:e;if(Math.abs(t[s]-n[s])>r)return!0}return!1}function Bp({tier:n,webgl:t,failed:e=!1,software:i=!1}){return n==="flat"||!t||e||i?"flat":"three"}var Yy=/swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i,jy=n=>Yy.test(String(n??"")),ku=null;function zn(n=globalThis.document){if(ku!==null)return ku;let t={ok:!1,renderer:""};try{let e=n.createElement("canvas"),i=e.getContext("webgl2")??e.getContext("webgl");if(i){let s=i.getExtension?.("WEBGL_debug_renderer_info");t={ok:!0,renderer:String((s?i.getParameter?.(s.UNMASKED_RENDERER_WEBGL):i.getParameter?.(i.RENDERER))??"")},i.getExtension?.("WEBGL_lose_context")?.loseContext()}}catch{t={ok:!1,renderer:""}}return ku=t,t}var zp=n=>zn(n).ok,Hp=n=>{let t=zn(n);return t.ok&&jy(t.renderer)};var Lu="stagecraft.speed",Gp=()=>zn().renderer||"unknown";function Du({now:n=Date.now(),limits:t={...Bn,...globalThis.__stagecraftSpeed??{}}}={}){try{let e=JSON.parse(globalThis.localStorage?.getItem(Lu)??"null");return!e||e.gpu!==Gp()||e.tier&&!Qs.includes(e.tier)||e.tier&&!Lp(e.at,n,t)?null:{ok:e.ok===!0,tier:e.tier??null,at:e.at??null}}catch{return null}}function Nu({ok:n=!1,tier:t=null}){try{globalThis.localStorage?.setItem(Lu,JSON.stringify({gpu:Gp(),ok:n,tier:t,at:Date.now()}))}catch{}}function Vp(){try{globalThis.localStorage?.removeItem(Lu)}catch{}}var Wp=()=>Du()?.tier??null;function Xp(){let n=foundry.data.fields;game.settings.register(j,"tier",{name:"STAGECRAFT.Settings.Tier.Name",hint:"STAGECRAFT.Settings.Tier.Hint",scope:"client",config:!0,requiresReload:!1,type:new n.StringField({required:!0,blank:!1,initial:"auto",choices:{auto:"STAGECRAFT.Settings.Tier.Auto",high:"STAGECRAFT.Settings.Tier.High",low:"STAGECRAFT.Settings.Tier.Low",flat:"STAGECRAFT.Settings.Tier.Flat"}}),onChange:()=>{Vp(),Hooks.callAll("stagecraft.settingsChanged","tier")}}),game.settings.register(j,"zones",{name:"STAGECRAFT.Settings.Zones.Name",hint:"STAGECRAFT.Settings.Zones.Hint",scope:"client",config:!0,type:new n.StringField({required:!0,blank:!1,initial:"off",choices:{off:"STAGECRAFT.Settings.Zones.Off",faint:"STAGECRAFT.Settings.Zones.Faint",full:"STAGECRAFT.Settings.Zones.Full"}}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","zones")}),game.settings.register(j,"power",{name:"STAGECRAFT.Settings.Power.Name",hint:"STAGECRAFT.Settings.Power.Hint",scope:"client",config:!0,type:new n.BooleanField({initial:!0}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","power")}),game.settings.register(j,"calm",{name:"STAGECRAFT.Settings.Calm.Name",hint:"STAGECRAFT.Settings.Calm.Hint",scope:"client",config:!0,type:new n.BooleanField({initial:!1}),onChange:()=>Hooks.callAll("stagecraft.settingsChanged","calm")})}var Ja=()=>game.settings.get(j,"tier");function ys(){let n=game.settings.get(j,"tier");if(n==="high"||n==="low"||n==="flat")return n;let t=game.settings.get("core","performanceMode"),e=t!==null&&t<=CONST.CANVAS_PERFORMANCE_MODES.LOW?"low":"high";return Ip(e,Wp()??"high")}function tr(){return game.settings.get(j,"calm")||game.settings.get("core","photosensitiveMode")?!0:!!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches}var Qa=()=>game.settings.get(j,"zones"),Ou=()=>game.settings.get(j,"power")!==!1,$p=()=>Op({fps:game.settings.get("core","maxFPS"),mode:game.settings.get("core","performanceMode")??null,max:globalThis.CONST?.CANVAS_PERFORMANCE_MODES?.MAX??null});var qp=(n,t,e)=>Math.max(t,Math.min(e,n)),Ky=(n,t,e)=>n+(t-n)*e,Jy=Math.PI/180;function Yp(n){let t=n>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function bo(n,t=0){let e=Math.floor(n),i=n-e,s=o=>{let a=Math.imul(o+t*7919|0,668265261);return a^=a>>>15,a=Math.imul(a,2246822507),a^=a>>>13,(a>>>0)/4294967296*2-1},r=i*i*(3-2*i);return Ky(s(e),s(e+1),r)}function jp(n,t,e,i,s=.5,r=0,o=.5){let a=Math.max(e/n,i/t),l=(e-n*a)*o,c=(i-t*a)*s-r;return{s:a,ox:l,oy:c,lift:r,x:h=>l+h*n*a,y:h=>c+h*t*a}}function Kp(n,t,e){return{f:n.depth*e,cx:t.x(n.vanish??.5),cy:t.y(n.horizon),floorY:t.y(n.floorFront),map:t}}function Fu(n,t,e,i){let s=n.f/(n.f-i);return{sx:n.cx+(t-n.cx)*s,sy:n.cy+(e-n.cy)*s,k:s}}function Qy(n,t,e){let i=(e-n.cy)/(n.floorY-n.cy);if(i<=0)return null;let s=n.f-n.f/i;return{x:n.cx+(t-n.cx)/i,z:s}}function Jp(n,t,e){return Qy(n,n.map.x(t),n.map.y(e))}function bi(n,t,e,i){return Math.atan2(e-n,i-t)/Jy}function Si(n,{share:t=.62,max:e=52}={}){let i=(n+540)%360-180;return Math.abs(i)>90&&(i=Math.sign(i)*(180-Math.abs(i))*.5+Math.sign(i)*35),qp(i*t,-e,e)}function Qp(n,t,e,{gap:i=380,spread:s=150,depthStep:r=60}={}){let o=[];return t.forEach((a,l)=>{let c=n.x-i/2-l*s*.7,h=n.z-l*r;o.push({x:c,z:h,yaw:Si(bi(c,h,n.x+i/2,n.z),{share:.75,max:48}),lean:0,pitch:-3})}),e.forEach((a,l)=>{let c=n.x+i/2+l*s*.7,h=n.z-l*r;o.push({x:c,z:h,yaw:Si(bi(c,h,n.x-i/2,n.z),{share:.75,max:48}),lean:0,pitch:-3})}),o}var Zp=Object.freeze({calm:{breathe:.006,breatheHz:.22,sway:.5,swayHz:.09,fidget:0,pitch:0,lean:0,glance:.7},nervous:{breathe:.01,breatheHz:.45,sway:1.1,swayHz:.6,fidget:.25,pitch:2,lean:0,glance:1.2,jitter:.6},proud:{breathe:.007,breatheHz:.18,sway:.3,swayHz:.07,fidget:0,pitch:-4,lean:0,glance:.4},slouch:{breathe:.008,breatheHz:.15,sway:.9,swayHz:.06,fidget:.05,pitch:3,lean:4,glance:.3},bouncy:{breathe:.009,breatheHz:.5,sway:.8,swayHz:.35,fidget:.4,pitch:0,lean:0,glance:1,hop:6},sly:{breathe:.006,breatheHz:.2,sway:.6,swayHz:.12,fidget:.1,pitch:4,lean:-3,glance:1.4}});function tm(n,t,e="calm",{speakerYaw:i=null}={}){let s=Zp[e]??Zp.calm,r=t%1e3/1e3,o=1+s.breathe*Math.sin(2*Math.PI*(n*s.breatheHz+r)),a=s.lean+s.sway*bo(n*s.swayHz*4+r*10,t),l=0;if(s.jitter&&(a+=s.jitter*bo(n*9+r*31,t+3)*.6),s.fidget){let h=Math.floor(n*s.fidget+r*7),u=n*s.fidget+r*7-h,d=Math.abs(bo(h*1.7,t+11));if(d>.55&&u<.18){let f=Math.sin(u/.18*Math.PI);l+=(s.hop??3)*f,a+=2.5*f*(d>.8?1:-1)}}let c=i===null?0:qp(i,-1,1)*6*s.glance;return{breathe:o,lean:a,pitch:s.pitch,lift:l,yaw:c}}var ZT=Object.freeze({dust:{rate:26,life:[5,9],size:[1.2,2.8],vy:[-6,6],vx:[-8,8],vz:[-6,6],gravity:0,drag:.4,glow:!0},smoke:{rate:5,life:[5,8],size:[26,46],vy:[-26,-14],vx:[-6,6],vz:[-4,4],gravity:0,drag:.2,grow:9,soft:!0},steam:{rate:9,life:[3.5,6],size:[30,56],vy:[-34,-18],vx:[-8,8],vz:[-6,6],gravity:0,drag:.2,grow:14,soft:!0},sparks:{rate:60,life:[.5,1.1],size:[1.6,3],vy:[-260,-90],vx:[-140,140],vz:[-60,60],gravity:520,drag:.1,glow:!0,bounce:.35,streak:!0},petals:{rate:3,life:[9,14],size:[5,8],vy:[10,22],vx:[-22,4],vz:[-6,6],gravity:0,drag:.1,settle:!0,spin:!0},snow:{rate:30,life:[18,26],size:[1.6,3.6],vy:[50,80],vx:[-10,10],vz:[-10,10],gravity:0,drag:.1,settle:!0},rain:{rate:240,life:[.9,1.3],size:[1,1.6],vy:[900,1200],vx:[-90,-60],vz:[0,0],gravity:0,drag:0,streak:!0,splash:!0}});var em=(n,t,e)=>Math.max(t,Math.min(e,n)),Uu=Object.freeze({follow:42,stiffness:150,damping:9,lag:.5,maxLean:15,jostleK:110,jostleC:11,bumpSpin:.009,bonkSpeed:120,shove:.35,maxJolt:70,growK:220,growC:22,parked:.5,held:1,hopTime:.42,hopHeight:74,nodTime:.34,bowTime:.95,shakeTime:.62});function im({id:n,x:t,y:e,scale:i=1,home:s="stage",owner:r=null,rod:o=112,w:a=230,h:l=393}){return{id:n,owner:r,home:s,rod:o,w:a,h:l,x:t,y:e,vx:0,vy:0,ax:0,restX:t,restY:e,lean:0,leanV:0,jx:0,jv:0,scale:i,scaleV:0,scaleTo:i,turn:0,turnV:0,turnTo:0,heldBy:null,target:null,verbs:[]}}var tv=Object.freeze(["hop","nod","bow","shake","turn"]);function Bu(n,t){return t==="turn"?(n.turnTo=n.turnTo?0:180,n):(tv.includes(t)&&n.verbs.push({verb:t,t:0}),n)}function nm(n,t,e=Uu){let i=n.target?n.target.x:n.restX,s=n.target?n.target.y:n.restY,r=e.follow,o=r*r*(i-n.x)-2*r*n.vx,a=r*r*(s-n.y)-2*r*n.vy;n.vx+=o*t,n.vy+=a*t,n.x+=n.vx*t,n.y+=n.vy*t,n.ax=o;let l=-e.stiffness*n.lean-e.damping*n.leanV-e.lag*e.stiffness/1e3*o;n.leanV+=l*t,n.lean+=n.leanV*t,n.lean=em(n.lean,-e.maxLean*1.6,e.maxLean*1.6);let c=-e.jostleK*n.jx-e.jostleC*n.jv;n.jv+=c*t,n.jx+=n.jv*t;let h=e.growK*(n.scaleTo-n.scale)-e.growC*n.scaleV;n.scaleV+=h*t,n.scale+=n.scaleV*t;let u=160*(n.turnTo-n.turn)-18*n.turnV;n.turnV+=u*t,n.turn+=n.turnV*t;for(let d of n.verbs)d.t+=t;return n.verbs=n.verbs.filter(d=>d.t<sm(d.verb,e)),n}function sm(n,t){return n==="hop"?t.hopTime:n==="nod"?t.nodTime:n==="bow"?t.bowTime:t.shakeTime}function rm(n,t=Uu){let e=0,i=1,s=0,r=0,o=0;for(let a of n.verbs){let l=a.t/sm(a.verb,t);a.verb==="hop"?(e+=4*t.hopHeight*l*(1-l),l<.12&&(i*=1-.1*Math.sin(l/.12*Math.PI)),l>.86&&(i*=1-.12*Math.sin((l-.86)/.14*Math.PI))):a.verb==="nod"?(o+=12*Math.sin(l*Math.PI),i*=1-.04*Math.sin(l*Math.PI)):a.verb==="bow"?s+=34*Math.sin(Math.min(1,l*1.6)*Math.PI*.5)*(l<.62?1:Math.max(0,(1-l)/.38)):a.verb==="shake"&&(r+=18*Math.exp(-3.2*l)*Math.sin(l*4*2*Math.PI))}return{lift:e,squash:i,tipX:s,shakeY:r,dip:o}}function So(n){let t=n.scale,e=n.x+n.jx-n.w*t/2,i=n.y-n.rod*t;return{left:e,right:e+n.w*t,top:i-n.h*t,bottom:i}}function om(n,t=new Set,e=Uu){let i=[],s=new Set,r=o=>em(o,-e.maxJolt,e.maxJolt);for(let o=0;o<n.length;o++)for(let a=o+1;a<n.length;a++){let l=n[o],c=n[a];if(!l.heldBy&&!c.heldBy||l.home==="wings"||c.home==="wings")continue;let h=So(l),u=So(c),d=Math.min(h.right,u.right)-Math.max(h.left,u.left),f=Math.min(h.bottom,u.bottom)-Math.max(h.top,u.top);if(d<=0||f<=0)continue;let x=(h.left+h.right)/2<(u.left+u.right)/2?1:-1,g=l.heldBy&&!c.heldBy?.15:!l.heldBy&&c.heldBy?.85:.5,p=1-g,m=`${l.id}|${c.id}`;if(s.add(m),l.heldBy&&c.heldBy&&(l.jx=r(l.jx-x*d*e.shove),c.jx=r(c.jx+x*d*e.shove)),t.has(m))continue;let M=Math.abs(l.vx-c.vx);M<e.bonkSpeed||(l.jv-=x*M*.3*g,c.jv+=x*M*.3*p,l.leanV-=x*M*e.bumpSpin*6,c.leanV+=x*M*e.bumpSpin*14*p,i.push({a:l.id,b:c.id,x:x>0?h.right-d/2:h.left+d/2,y:Math.max(h.top,u.top)+f*.3,speed:M}))}for(let o of n)o.jx=r(o.jx);t.clear();for(let o of s)t.add(o);return i}function am(n,t,e,i,s=33){return n?i-n.t<s?!1:Math.abs(t-n.x)+Math.abs(e-n.y)>.75:!0}var tl=class{constructor({delay:t=100,max:e=32}={}){this.delay=t,this.max=e,this.samples=[]}push(t){this.samples.push(t),this.samples.sort((e,i)=>e.t-i.t),this.samples.length>this.max&&this.samples.shift()}at(t){let e=this.samples;if(!e.length)return null;let i=t-this.delay;if(i<=e[0].t)return{x:e[0].x,y:e[0].y};for(let l=1;l<e.length;l++)if(e[l].t>=i){let c=e[l-1],h=e[l],u=(i-c.t)/Math.max(1,h.t-c.t);return{x:c.x+(h.x-c.x)*u,y:c.y+(h.y-c.y)*u}}let s=e[e.length-1],r=e[e.length-2]??s,o=Math.min(i-s.t,80),a=Math.max(1,s.t-r.t);return{x:s.x+(s.x-r.x)/a*o,y:s.y+(s.y-r.y)/a*o}}};function lm(n,t){return n?t?n.t!==t.t?n.t<t.t?n:t:n.user<t.user?n:t:n:t}var Bi=Object.freeze({W:2560,H:1440}),Pi=12e3,wo=-(Pi-1500);function er(n,t,e=Bi){let[i,s]=n.size,r=jp(i,s,e.W,e.H,.5,t.lift??0,.5),o=Kp(t,r,e.W),a=(c,h)=>[(c-r.ox)/(i*r.s),(h-r.oy)/(s*r.s)],l=c=>{let h=Jp(o,c[0],c[1]);return h?{X:h.x-o.cx,Z:h.z}:null};return{ref:e,map:r,cam:o,size:[i,s],standing:l,place(c){let h=l(c);return!h||h.Z>=wo?h:{X:h.X*(o.f-wo)/(o.f-h.Z),Z:wo}},fractionOf(c,h){let u=Fu(o,c+o.cx,o.floorY,h);return a(u.sx,u.sy)},screenOf(c,h,u){let d=Fu(o,c+o.cx,o.floorY-h,u);return{x:d.sx,y:d.sy,k:d.k}},fractionOfScreen:a}}var ev=.5;function el(n,t,{ease:e=ev,most:i=2.2}={}){if(!(t<0))return 1;let s=n.f/(n.f-t);return Math.min(i,Math.max(1,s**-e))}function To(n,t,e=Bi){let i=Math.max(n/e.W,t/e.H),s=n/i,r=t/i;return{vw:n,vh:t,s:i,ox:(e.W-s)/2,oy:(e.H-r)/2,visW:s,visH:r}}var Eo=Object.freeze({rest:"rest",near:"near",target:"target"}),cm=Object.freeze({faint:.2,off:0,full:1});function xn(n,t,e){let i=!1;for(let s=0,r=n.length-1;s<n.length;r=s++){let[o,a]=n[s],[l,c]=n[r];a>e!=c>e&&t<(l-o)*(e-a)/(c-a)+o&&(i=!i)}return i}function zu(n,t,e){let i=1/0;for(let s=0,r=n.length-1;s<n.length;r=s++){let[o,a]=n[r],[l,c]=n[s],h=l-o,u=c-a,d=h*h+u*u,f=d===0?0:Math.max(0,Math.min(1,((t-o)*h+(e-a)*u)/d));i=Math.min(i,Math.hypot(t-(o+f*h),e-(a+f*u)))}return i}function Hu(n){let t=0,e=0;for(let[i,s]of n)t+=i,e+=s;return[t/n.length,e/n.length]}var Ao=n=>n.floor&&n.floor.length>=3?n.floor:n.shape;function ir(n,t,e){return n.filter(i=>xn(Ao(i),t,e))}function hm(n,t,e=.1){let i={};for(let s of n){let r=Eo.rest,o=Ao(s);for(let a of t){if(xn(o,a.x,a.y)){r=Eo.target;break}zu(o,a.x,a.y)<=e&&(r=Eo.near)}i[s.id]=r}return i}function Gu(n,t,e="faint"){return t===Eo.target?1:t===Eo.near?.85:n.quiet||n.kind==="chalk"?0:cm[e]??cm.faint}function iv(n,t){let e=Ao(n),i=Ao(t);if(e.some(([r,o])=>xn(i,r,o))||i.some(([r,o])=>xn(e,r,o)))return 0;let s=1/0;for(let[r,o]of e)s=Math.min(s,zu(i,r,o));for(let[r,o]of i)s=Math.min(s,zu(e,r,o));return s}function um(n,{touch:t=.035}={}){let e=n.filter(a=>a.kind==="area"),i=new Set(e.map(a=>a.id)),s=new Map,r=(a,l)=>{if(a===l||!i.has(a)||!i.has(l))return;let[c,h]=a<l?[a,l]:[l,a];s.set(`${c}|${h}`,{a:c,b:h})};if(e.some(a=>Array.isArray(a.near)&&a.near.length))for(let a of e)for(let l of a.near??[])r(a.id,l);else for(let a=0;a<e.length;a++)for(let l=a+1;l<e.length;l++)iv(e[a],e[l])<=t&&r(e[a].id,e[l].id);return[...s.values()].sort((a,l)=>a.a+a.b<l.a+l.b?-1:1)}function Vu(n,t,{w:e=180,deep:i=160,most:s=24}={}){let r=Ao(n),o=r.map(g=>t.standing(g)).filter(Boolean);if(o.length<3)return[];let a=o.map(g=>g.X),l=o.map(g=>g.Z),[c,h,u,d]=[Math.min(...a),Math.max(...a),Math.max(wo,Math.min(...l)),Math.max(...l)],f=t.standing(Hu(r))??{X:(c+h)/2,Z:(u+d)/2},x=[];for(let g=d-i/2;g>=u;g-=i)for(let p=c+e/2;p<=h;p+=e){let m=t.fractionOf(p,g);xn(r,m[0],m[1])&&x.push({X:p,Z:g})}return x.sort((g,p)=>Math.hypot(g.X-f.X,(g.Z-f.Z)*.8)-Math.hypot(p.X-f.X,(p.Z-f.Z)*.8)),x.slice(0,s)}function dm(n,t){let e=[];for(let[i,s]of t){let r=n.get(i)??new Set;for(let o of s)r.has(o)||e.push({type:"zone",card:i,zone:o,entered:!0})}for(let[i,s]of n){let r=t.get(i)??new Set;for(let o of s)r.has(o)||e.push({type:"zone",card:i,zone:o,entered:!1})}return e}function fm(n,t){let e=[],i=[];for(let s of n){let r=(t.place??t.standing)(s.at);if(!r){i.push(s.id);continue}e.push({...s,X:r.X,Z:r.Z})}return{marks:e,dropped:i}}function pm(n,t){return n.filter(e=>(t.get(e.id)?.size??0)<e.capacity)}function Wu(n,t,e){return Math.hypot(n-e.X,(t-e.Z)*.75)}function Xu(n,t,e,i,s){let r=null,o=1/0;for(let a of pm(n,t)){let l=Wu(e,i,a);l<o&&l<=s&&(r=a,o=l)}return r}function mm(n,t,e,i,{show:s=700,snap:r=170,max:o=5}={}){let a=pm(n,t).map(c=>({mark:c,d:Wu(e,i,c)})).filter(c=>c.d<=s).sort((c,h)=>c.d-h.d).slice(0,o),l=a.length&&a[0].d<=r?a[0].mark.id:null;return a.map(c=>{let h=1-Math.min(1,Math.max(0,(c.d-r)/(s-r))),u=c.mark.id===l?1:.18+.5*h*h;return{id:c.mark.id,mark:c.mark,distance:c.d,alpha:u,target:c.mark.id===l}})}function il(n,t={}){let e=n.yaw,i=n.faces;if(i){let s=null;if(i.point&&t.pointOnFloor)s=t.pointOnFloor(i.point);else if(i.zone&&t.zones&&t.pointOnFloor){let r=t.zones.find(o=>o.id===i.zone);r&&(s=t.pointOnFloor(Hu(r.shape)))}else i.card&&t.cardAt&&(s=t.cardAt(i.card));s&&(e=Si(bi(n.X,n.Z,s.X,s.Z)))}return{yaw:e,lean:n.lean,pitch:n.pitch,lift:n.lift}}function nl(n,t){let e=new Map,i=[],s=new Set(t.map(o=>o.id)),r=new Map(t.map(o=>[o.id,o]));for(;;){let o=null;for(let a of s){let l=r.get(a);for(let c of n){if((e.get(c.id)??0)>=c.capacity)continue;let h=Wu(l.X,l.Z,c);(!o||h<o.d)&&(o={d:h,c:l,m:c})}}if(!o)break;e.set(o.m.id,(e.get(o.m.id)??0)+1),s.delete(o.c.id),i.push({card:o.c.id,mark:o.m.id})}return i}var gm=(n,t,e)=>Math.max(t,Math.min(e,n)),vs=Object.freeze({walk:{speed:520,stride:110,height:12,rock:3.5,turn:.7},stroll:{speed:300,stride:90,height:8,rock:2.6,turn:.6},hurry:{speed:880,stride:135,height:15,rock:5,turn:.8},march:{speed:600,stride:120,height:10,rock:1.2,turn:.5},sneak:{speed:230,stride:70,height:4,rock:1.5,turn:.75},scurry:{speed:1150,stride:42,height:5,rock:7,turn:.9},hop:{speed:640,stride:170,height:48,rock:2,turn:.6},glide:{speed:380,stride:0,height:0,rock:0,turn:.4}}),xm=Object.freeze(Object.keys(vs)),Co=(n,t)=>Math.hypot(t.X-n.X,(t.Z-n.Z)*.8);function _s(n,t,{t0:e=0,gait:i="walk",yaw:s=null,pace:r=1,minDur:o=.3,maxDur:a=6}={}){let l=vs[i]?i:"walk",c=vs[l],h=Co(n,t),u=gm(h/(c.speed*Math.max(.1,r)),o,a),d=c.stride>0&&h>c.stride*.6?Math.max(1,Math.round(h/c.stride)):0;return{from:{X:n.X,Z:n.Z},to:{X:t.X,Z:t.Z},t0:e,dur:u,gait:l,steps:d,yaw:s??null,dist:h}}function nv(n){if(n<=0)return 0;if(n>=1)return 1;let e=1/(1-.18);return n<.18?e*n*n/(2*.18):n>1-.18?1-e*(1-n)*(1-n)/(2*.18):e*(n-.18/2)}function Ro(n,t){let e=n.dur>0?gm((t-n.t0)/n.dur,0,1):1,i=nv(e),s=n.from.X+(n.to.X-n.from.X)*i,r=n.from.Z+(n.to.Z-n.from.Z)*i,o=vs[n.gait]??vs.walk,a=0,l=0;if(n.steps>0&&e>0&&e<1){let d=i*n.steps%1,f=Math.min(1,e*6,(1-e)*6);a=o.height*Math.sin(d*Math.PI)*f,l=o.rock*Math.sin(d*Math.PI*2)*f*Math.sign(n.to.X-n.from.X||1)}let c=e>0&&e<.86&&n.dist>30,h=Si(bi(n.from.X,n.from.Z,n.to.X,n.to.Z),{share:o.turn,max:40}),u=e<=0?null:c||n.yaw===null?h:n.yaw;return{X:s,Z:r,lift:a,rock:l,yaw:u,u:e,moving:e>0&&e<1,done:e>=1}}function ym(n,t,e){return n==="left"?{X:e.x[0]-160,Z:t.Z}:n==="right"?{X:e.x[1]+160,Z:t.Z}:n==="back"?{X:t.X*.6,Z:e.z[0]}:{X:t.X,Z:t.Z}}var Zu=Object.freeze(["still","wander","visit","patrol","pace","swarm"]),sv=Object.freeze({wander:{every:11,restless:.55,radius:.05,gait:"stroll"},visit:{every:14,restless:.75,gait:"walk"},patrol:{every:9,restless:1,gait:"march"},pace:{every:5,restless:.85,width:.05,gait:"walk"},swarm:{every:2.6,restless:.8,radius:.035,gait:"scurry"}}),Hn=n=>typeof n=="number"&&Number.isFinite(n),$u=n=>Array.isArray(n)&&n.length===2&&Hn(n[0])&&Hn(n[1]);function qu(n){if(!n||typeof n!="object"||!Zu.includes(n.kind)||n.kind==="still")return null;let t=sv[n.kind],e={kind:n.kind,every:Math.max(1.5,Hn(n.every)?n.every:t.every),restless:Math.max(0,Math.min(1,Hn(n.restless)?n.restless:t.restless)),gait:vs[n.gait]?n.gait:t.gait,radius:Math.max(.005,Math.min(.3,Hn(n.radius)?n.radius:t.radius??.05)),width:Math.max(.01,Math.min(.4,Hn(n.width)?n.width:t.width??.05)),spots:Array.isArray(n.spots)?n.spots.filter($u).map(i=>[i[0],i[1]]):[],marks:Array.isArray(n.marks)?n.marks.filter(i=>typeof i=="string"):[],path:Array.isArray(n.path)?n.path.filter($u).map(i=>[i[0],i[1]]):[],loop:n.loop===!0,faces:$u(n.faces)?[n.faces[0],n.faces[1]]:null,facesCard:typeof n.faces=="string"&&n.faces?n.faces:null,gestures:Array.isArray(n.gestures)?n.gestures.filter(i=>["hop","nod","bow","shake"].includes(i)):[],gestureChance:Math.max(0,Math.min(1,Hn(n.gestureChance)?n.gestureChance:.35)),yaw:Hn(n.yaw)?n.yaw:null};return e.kind==="visit"&&e.spots.length+e.marks.length===0||e.kind==="patrol"&&e.path.length<2?null:e}function Yu(n,{home:t,rig:e,marks:i=[],seed:s=1}){if(!n)return null;let r=h=>(e.place??e.standing)(h),o=e.fractionOf(t.X,t.Z),a=h=>{let u=e.standing([o[0]-h/2,o[1]]),d=e.standing([o[0]+h/2,o[1]]);return u&&d?Math.abs(d.X-u.X):120},l=n.faces?r(n.faces):null,c={...n,home:{X:t.X,Z:t.Z},seed:s,places:[],faceAt:l};if(n.kind==="visit"){let h=n.marks.map(d=>i.find(f=>f.id===d)).filter(Boolean).map(d=>({X:d.X,Z:d.Z,yaw:d.yaw??null})),u=n.spots.map(r).filter(Boolean).map(d=>({X:d.X,Z:d.Z,yaw:null}));if(c.places=[{X:t.X,Z:t.Z,yaw:null},...h,...u],c.places.length<2)return null}else if(n.kind==="patrol"){if(c.places=n.path.map(r).filter(Boolean).map(h=>({X:h.X,Z:h.Z,yaw:null})),c.places.length<2)return null}else n.kind==="pace"?c.reach=a(n.width):c.reach=a(n.radius);return c}function Ii(n,t,e=0){return Yp((n*2654435761^t*97+e*7919)>>>0)()}var rv=16;function vm(n,t){if(t<=0)return{X:n.home.X,Z:n.home.Z,yaw:n.yaw};if(n.kind==="patrol"){let r=n.places.length,o=n.loop?t%r:ov(t,r);return{...n.places[o],yaw:n.places[o].yaw??null}}let e=t;for(let r=0;e>0&&Ii(n.seed,e,1)>=n.restless;r++){if(r>=rv)return{X:n.home.X,Z:n.home.Z,yaw:n.yaw};e--}if(e<=0)return{X:n.home.X,Z:n.home.Z,yaw:n.yaw};if(n.kind==="visit"){let r=Math.floor(Ii(n.seed,e,2)*n.places.length);return{...n.places[r],yaw:n.places[r].yaw??null}}if(n.kind==="pace"){let r=(e%2===0?-1:1)*(.35+.15*Ii(n.seed,e,3));return{X:n.home.X+r*n.reach,Z:n.home.Z+(Ii(n.seed,e,4)-.5)*n.reach*.2,yaw:null}}let i=Ii(n.seed,e,5)*Math.PI*2,s=Math.sqrt(Ii(n.seed,e,6))*n.reach/2;return{X:n.home.X+Math.cos(i)*s,Z:n.home.Z+Math.sin(i)*s*.7,yaw:null}}function ov(n,t){let e=2*(t-1),i=n%e;return i<t?i:e-i}function av(n,t){return n.every*(.1+.4*Ii(n.seed,t,8))}function _m(n,t){if(!n.gestures?.length)return null;let e=Ii(n.seed,0,9)*n.every,i=Math.floor((t+e)/n.every);if(Ii(n.seed,i,12)>=n.gestureChance)return null;let s=n.gestures[Math.floor(Ii(n.seed,i,13)*n.gestures.length)],r=i*n.every-e+n.every*(.93+.05*Ii(n.seed,i,14));return{beat:i,at:r,verb:s}}function sl(n,t){let e=Ii(n.seed,0,9)*n.every,i=t+e,s=Math.floor(i/n.every),r=i-s*n.every,o=vm(n,s-1),a=vm(n,s),l=d=>n.faceAt?Si(bi(d.X,d.Z,n.faceAt.X,n.faceAt.Z),{share:.7,max:50}):d.yaw??null;if(Math.abs(a.X-o.X)+Math.abs(a.Z-o.Z)<.5)return{X:a.X,Z:a.Z,yaw:l(a),lift:0,rock:0,moving:!1};let c=av(n,s),h=_s(o,a,{t0:c,gait:n.gait,yaw:l(a),maxDur:Math.max(.4,(n.every-c)*.92)}),u=Ro(h,r);return u.moving?{X:u.X,Z:u.Z,yaw:u.yaw,lift:u.lift,rock:u.rock,moving:!0}:{X:u.X,Z:u.Z,yaw:r<c?l(o):l(a),lift:0,rock:0,moving:!1}}var rl=Object.freeze(["line","huddle","talk","gangup","panel","standoff","circle","queue","scatter","audience","position"]),cE=Math.PI/180,Mm=(n,t,e)=>Math.max(t,Math.min(e,n)),nr=n=>Math.round(n*10)/10,lv=(n,t=180)=>Math.max(t*.5,...n.map(e=>e.w??t)),en=(n,t,e,i,s=.7,r=52)=>Si(bi(n,t,e,i),{share:s,max:r});function bm(n,{cards:t=[],focus:e={X:0,Z:-400},target:i=null,speakers:s=[],party:r=!1,limits:o=null,seed:a=1,dir:l="back",radius:c=null}={}){let h=t.filter(f=>r||!f.pc||f.id===i||s.includes(f.id));if(!h.length)return[];let u=lv(h),d;switch(n){case"huddle":d=dv(h,e,u,c);break;case"talk":d=fv(h,e,u,s);break;case"gangup":d=pv(h,e,u,i);break;case"panel":d=mv(h,e,u);break;case"standoff":d=gv(h,e,u);break;case"circle":d=xv(h,e,u,c);break;case"queue":d=yv(h,e,u,a,l);break;case"scatter":d=vv(h,e,u,o,a);break;case"audience":d=hv(h,e,u,o);break;default:d=cv(h,e,u)}return d.map(f=>({id:f.id,X:nr(o?Mm(f.X,o.x[0],o.x[1]):f.X),Z:nr(o?Mm(f.Z,o.z[0],o.z[1]):f.Z),yaw:nr(f.yaw??0),lean:nr(f.lean??0),pitch:nr(f.pitch??0)}))}var zi=n=>[...n].sort((t,e)=>t.X-e.X||(t.id<e.id?-1:1));function cv(n,t,e){let i=[],s=[n.filter(o=>!o.pc),n.filter(o=>o.pc)],r=s[0].length?220:0;return s.forEach((o,a)=>{let l=zi(o),c=e*1.12;l.forEach((h,u)=>i.push({id:h.id,X:t.X+(u-(l.length-1)/2)*c,Z:t.Z+a*r,yaw:0}))}),i}function hv(n,t,e,i){let s=zi(n),r=i?i.z[1]:t.Z+600,o=Math.max(t.Z+280,r-Math.max(150,(r-t.Z)*.2)),a=Math.ceil(s.length/2),l=[s.slice(0,a).reverse(),s.slice(a)],c=[];return l.forEach((h,u)=>{let d=u===0?-1:1;h.forEach((f,x)=>{let g=t.X+d*(e*.95+x*e*1.15),p=o-x*45;c.push({id:f.id,X:g,Z:p,yaw:en(g,p,t.X,t.Z,.6,40),pitch:-2})})}),c}var uv=.86;function dv(n,t,e,i=null){let s=zi(n),r=s.length,o=Math.max(e*uv*(r-1),(i??0)*2),a=Math.min(260,90+32*r);return s.map((l,c)=>{let h=r>1?(c-(r-1)/2)/((r-1)/2):0,u=t.X+h*o/2,d=t.Z-a*(1-h*h)*.9-40,f=en(u,d,t.X,t.Z+140,.8,50);return{id:l.id,X:u,Z:d,yaw:f,lean:-h*9,pitch:6}})}function fv(n,t,e,i){let s=i.filter(d=>n.some(f=>f.id===d)),r=zi(n.filter(d=>!s.includes(d.id)));for(;s.length<2&&r.length;)s.push(r.shift().id);let[o,a]=s,l=e*.78,c=[],h={X:t.X-l,Z:t.Z},u={X:t.X+l,Z:t.Z};return o&&c.push({id:o,X:h.X,Z:h.Z,yaw:en(h.X,h.Z,u.X,u.Z,.85,58),lean:2}),a&&c.push({id:a,X:u.X,Z:u.Z,yaw:en(u.X,u.Z,h.X,h.Z,.85,58),lean:-2}),r.forEach((d,f)=>{let x=f%2===0?-1:1,g=Math.floor(f/2)+1,p=t.X+x*(l+e*(.55+g*.95)),m=t.Z-120-g*60;c.push({id:d.id,X:p,Z:m,yaw:en(p,m,t.X,t.Z,.6,40)})}),c}function pv(n,t,e,i){let s=n.find(l=>l.id===i)??null,r=zi(n.filter(l=>l!==s)),o=[];s&&o.push({id:s.id,X:t.X,Z:t.Z+60,yaw:0,pitch:3});let a=Math.ceil(r.length/2);return[r.slice(0,a).reverse(),r.slice(a)].forEach((l,c)=>{let h=c===0?-1:1;l.forEach((u,d)=>{let f=t.X+h*e*(.95+d*.95),x=t.Z-90+d*55;o.push({id:u.id,X:f,Z:x,yaw:en(f,x,t.X,t.Z+60,.8,55),lean:-h*7,pitch:5})})}),o}function mv(n,t,e){let i=zi(n.filter(o=>!o.pc)),s=i.length,r=i.map((o,a)=>{let l=s>1?(a-(s-1)/2)/((s-1)/2):0,c=t.X+l*((s-1)/2)*e*1.1,h=t.Z-160+90*l*l;return{id:o.id,X:c,Z:h,yaw:nr(-l*14),pitch:-2}});return zi(n.filter(o=>o.pc)).forEach((o,a,l)=>{let c=t.X+(a-(l.length-1)/2)*e*1.1;r.push({id:o.id,X:c,Z:t.Z+260,yaw:0})}),r}function gv(n,t,e){let i=zi(n.filter(o=>!o.pc)),s=zi(n.filter(o=>o.pc));if(!s.length){let o=Math.ceil(i.length/2);s=i.slice(o),i=i.slice(0,o)}if(!i.length){let o=Math.ceil(s.length/2);i=s.slice(0,o),s=s.slice(o)}let r=Qp({x:t.X,z:t.Z},i,s,{gap:e*2.2,spread:e*1.35,depthStep:70});return[...i,...s].map((o,a)=>({id:o.id,X:r[a].x,Z:r[a].z,yaw:r[a].yaw,lean:r[a].lean,pitch:r[a].pitch}))}function xv(n,t,e,i=null){let s=zi(n),r=s.length,o=Math.max(i??0,e*.75,e*1.02*(r-1)/2);return s.map((a,l)=>{let c=r>1?(l-(r-1)/2)/((r-1)/2):0,h=t.X+c*o,u=t.Z-Math.sqrt(Math.max(0,1-c*c))*o*.7;return{id:a.id,X:h,Z:u,yaw:en(h,u,t.X,t.Z,.75,55)}})}function yv(n,t,e,i,s="back"){let r=s==="left"||s==="right",o=s==="left"?-1:1,a=c=>r?-Math.abs(c.X-t.X):s==="front"?-c.Z:c.Z;return[...n].sort((c,h)=>a(h)-a(c)||(c.id<h.id?-1:1)).map((c,h)=>{let u=Math.sin((h+1)*2.399+i),d,f;r?(d=t.X+o*h*e*1.08,f=t.Z+u*26-h*8):(d=t.X+u*e*.12+h*e*.42,f=t.Z+(s==="front"?1:-1)*h*175);let x=h===0?en(d,f,t.X,t.Z-300,.55,38):en(d,f,t.X,t.Z,.55,38);return{id:c.id,X:d,Z:f,yaw:x,pitch:h===0?0:2}})}function vv(n,t,e,i,s){let r=zi(n),o=r.length,a=i?[i.x[0]*.7,i.x[1]*.7]:[t.X-e*o*.8,t.X+e*o*.8];return r.map((l,c)=>{let h=o>1?c/(o-1):.5,u=a[0]+(a[1]-a[0])*h,d=t.Z+Math.sin((c+1)*1.7+s)*260;return{id:l.id,X:u,Z:d,yaw:en(u,d,t.X,t.Z,.5,40)}})}function ol(n,{X:t,Z:e,w:i,h:s,lift:r=0}){let o=n.screenOf(t-i/2,r,e),a=n.screenOf(t+i/2,r+s,e);return{x0:o.x,x1:a.x,y0:a.y,y1:o.y}}function _v(n,t,{across:e=12,down:i=20}={}){let s=t.map(o=>({id:o.id,Z:o.Z,...ol(n,o)})),r=new Map;for(let o of s){let a=s.filter(h=>h!==o&&(h.Z>o.Z||h.Z===o.Z&&h.id>o.id)&&h.x0<o.x1&&h.x1>o.x0&&h.y0<o.y1&&h.y1>o.y0),l=0,c=new Set;for(let h=0;h<e;h++)for(let u=0;u<i;u++){let d=o.x0+(h+.5)/e*(o.x1-o.x0),f=o.y0+(u+.5)/i*(o.y1-o.y0),x=a.find(g=>d>=g.x0&&d<=g.x1&&f>=g.y0&&f<=g.y1);x&&(l++,c.add(x.id))}r.set(o.id,{hidden:l/(e*i),by:[...c]})}return r}function Sm(n,t,{across:e=12,down:i=20}={}){if(!t?.length)return 0;let s=(o,a)=>t.some(l=>l.rect?o>=l.rect[0]&&o<=l.rect[2]&&a>=l.rect[1]&&a<=l.rect[3]:l.circle?(o-l.circle[0])**2+(a-l.circle[1])**2<=l.circle[2]**2:!1),r=0;for(let o=0;o<e;o++)for(let a=0;a<i;a++)s(n.x0+(o+.5)/e*(n.x1-n.x0),n.y0+(a+.5)/i*(n.y1-n.y0))&&r++;return r/(e*i)}var al=44,ll=.4;function cl(n,t,e,i){let s=new Uint8Array(t*e),r=n.length;for(let l=0;l<e;l++){let c=l+.5,h=[];for(let u=0,d=r-1;u<r;d=u++){let[f,x]=n[u],[g,p]=n[d];x>c!=p>c&&h.push(f+(c-x)/(p-x)*(g-f))}h.sort((u,d)=>u-d);for(let u=0;u+1<h.length;u+=2){let d=Math.max(0,Math.ceil(h[u]-.5)),f=Math.min(t-1,Math.floor(h[u+1]-.5));for(let x=d;x<=f;x++)s[l*t+x]=1}}let o=new Uint8ClampedArray(t*e),a=l=>l*l*(3-2*l);for(let l=0;l<t;l++){let c=-1;for(let h=0;h<e;h++){if(!s[h*t+l])continue;c<0&&(c=h);let u=h-c+.5;o[h*t+l]=Math.round(255*(i>0?a(Math.min(1,u/i)):1))}}return o}function wm(n,t,e,{most:i=.15,iterations:s=80,limits:r=null}={}){let o=t.map(l=>({...l})),a=new Map(o.map(l=>[l.id,l]));for(let l=0;l<s;l++){let c=_v(n,o),h=!1;for(let u of o){let d=c.get(u.id);if(!(d.hidden<=i-.01))for(let f of d.by){let x=a.get(f),g=e.has(u.id),p=e.has(x.id);if(!g&&!p)continue;let m=u.X!==x.X?Math.sign(u.X-x.X):u.id<x.id?-1:1,M=Math.max(u.w,x.w)*.05;g&&p?(u.X+=m*M/2,x.X-=m*M/2):g?u.X+=m*M:x.X-=m*M,h=!0}}if(r)for(let u of o)e.has(u.id)&&(u.X=Math.max(r[0],Math.min(r[1],u.X)));if(!h)break}return o}var bn="#241a0f",Qe="#f2e8cc",ul="#dbcca2",sr="#fffaee",yn="#c39a4e",Ms="#ead08e",_n="#b04a32",dl="#dd977f",nn="#9cc8c2",Qu="#5f8e8b",rr="#677a7c",dE=Object.freeze({INK:bn,PAPER:Qe,SHADE:ul,GLINT:sr,BRASS:yn,GILT:Ms,LACQUER:_n,ROSE:dl,SEA:nn,DEEP:Qu,SLATE:rr}),Mv=2.2,bv="1.4 2.4",Sv="1.7 1.3",wv="2.6 2.1",mi=Math.PI/180,st=n=>String(Math.round(n*10)/10),Ee=([n,t])=>`${st(n)} ${st(t)}`;function bs({s:n=1,r:t=0,dx:e=0,dy:i=0}={}){let s=Math.cos(t*mi),r=Math.sin(t*mi),o=([a,l])=>{let c=(a-50)*n,h=(l-50)*n;return[50+e+c*s-h*r,50+i+c*r+h*s]};return o.s=n,o}var Dm=bs();function Tv(n,t){let e=[],i=t.match(/[MLQCZ]|-?\d*\.?\d+/g);for(let s=0;s<i.length;s++)/[MLQCZ]/.test(i[s])?e.push(i[s]):(e.push(Ee(n([Number(i[s]),Number(i[s+1])]))),s++);return e.join(" ").replace(/([MLQC]) /g,"$1")}function Lo(n,t,e,i,s,r=s,o=r,a=16){let l=[],c=[];for(let h=0;h<=a;h++){let u=h/a,d=1-u,f=d*d*d*n[0]+3*d*d*u*t[0]+3*d*u*u*e[0]+u*u*u*i[0],x=d*d*d*n[1]+3*d*d*u*t[1]+3*d*u*u*e[1]+u*u*u*i[1],g=3*d*d*(t[0]-n[0])+6*d*u*(e[0]-t[0])+3*u*u*(i[0]-e[0]),p=3*d*d*(t[1]-n[1])+6*d*u*(e[1]-t[1])+3*u*u*(i[1]-e[1]);Math.hypot(g,p)<1e-6&&(g=i[0]-n[0],p=i[1]-n[1]);let m=Math.hypot(g,p)||1,M=(s*d+o*u+(r-(s+o)/2)*4*u*d)/2;l.push([f-p/m*M,x+g/m*M]),c.push([f+p/m*M,x-g/m*M])}return`M${Ee(l[0])} L${l.slice(1).map(Ee).join(" L")} A${st(o/2)} ${st(o/2)} 0 0 0 ${Ee(c[a])} L${c.slice(0,a).reverse().map(Ee).join(" L")} A${st(s/2)} ${st(s/2)} 0 0 0 ${Ee(l[0])} Z`}var fl=(n,t,e)=>[n[0]+(t[0]-n[0])*e,n[1]+(t[1]-n[1])*e],Ie=(n,t,e,i,s)=>Lo(n,fl(n,t,1/3),fl(n,t,2/3),t,e,i,s),Io=(n,t,e,i,s,r)=>Lo(n,fl(n,t,2/3),fl(e,t,2/3),e,i,s,r);function we([n,t],e){return`M${st(n-e)} ${st(t)} A${st(e)} ${st(e)} 0 1 0 ${st(n+e)} ${st(t)} A${st(e)} ${st(e)} 0 1 0 ${st(n-e)} ${st(t)} Z`}function vn([n,t],e,i,s=0){let r=Math.cos(s*mi),o=Math.sin(s*mi),a=[n+e*r,t+e*o],l=[n-e*r,t-e*o];return`M${Ee(a)} A${st(e)} ${st(i)} ${st(s)} 1 0 ${Ee(l)} A${st(e)} ${st(i)} ${st(s)} 1 0 ${Ee(a)} Z`}var Ev=n=>`M${Ee(n[0])} L${n.slice(1).map(Ee).join(" L")}`;function Po([n,t],e,i,s,r=-90){let o=[],a=Math.ceil(s*28);for(let l=0;l<=a;l++){let c=l/a,h=(r+c*s*360)*mi,u=e+(i-e)*c;o.push([n+u*Math.cos(h),t+u*Math.sin(h)])}return Ev(o)}function Gn([n,t],e,i=.14){let s=e*i;return`M${st(n)} ${st(t-e)} Q${st(n+s)} ${st(t-s)} ${st(n+e)} ${st(t)} Q${st(n+s)} ${st(t+s)} ${st(n)} ${st(t+e)} Q${st(n-s)} ${st(t+s)} ${st(n-e)} ${st(t)} Q${st(n-s)} ${st(t-s)} ${st(n)} ${st(t-e)} Z`}var Ft=n=>({d:n,fill:bn}),At=(n,t=4,e=bn)=>({d:n,stroke:e,w:t}),Kt=(n,t,e=3)=>({d:n,fill:t,stroke:bn,w:e}),Mn=(n,t,e)=>({d:n,fill:t,opacity:e}),Te=n=>({...n,inner:!0}),Tm=n=>[`d="${n.d}"`,`fill="${n.fill??"none"}"`,n.stroke?`stroke="${n.stroke}" stroke-width="${st(n.w)}" stroke-linecap="round" stroke-linejoin="round"`:"",n.dash?`stroke-dasharray="${n.dash}"`:"",n.opacity!=null?`opacity="${n.opacity}"`:""].filter(Boolean).join(" ");function ju(n,t,e){let i=(n.stroke?n.w:0)+e*2,s=n.fill?t:"none",r=i>0?` stroke="${t}" stroke-width="${st(i)}" stroke-linecap="round" stroke-linejoin="round"`:"";return`<path d="${n.d}" fill="${s}"${r}/>`}function Oe(n,{echo:t=null,shadow:e=!0,key:i=Mv}={}){let s=n.filter(h=>!h.inner),r=s.filter(h=>!h.bare).map(h=>ju(h,Qe,i)).join(""),o=e?`<g opacity=".26" transform="translate(${bv})">${s.map(h=>ju(h,bn,0)).join("")}</g>`:"",a=s.filter(h=>h.fill===bn||!h.fill&&h.stroke===bn),l=t?`<g transform="translate(${wv})">${a.map(h=>ju(h,t,0)).join("")}</g>`:"",c=n.map(h=>h.fill&&h.fill!==bn&&h.fill!==Qe&&h.stroke===bn?`<path d="${h.d}" fill="${h.fill}" transform="translate(${Sv})"/><path ${Tm({...h,fill:void 0})}/>`:`<path ${Tm(h)}/>`).join("");return`<svg viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">${r}${o}${l}${c}</svg>`}var Em=(n=Dm)=>[Ft(Lo(n([53,12]),n([53.5,28]),n([51.5,44]),n([50,59]),15*n.s,11.5*n.s,4.6*n.s)),Ft(we(n([49.6,75.5]),7.2*n.s))],Am=(n=Dm)=>[Ft(Lo(n([31,32]),n([29,8]),n([71,4]),n([69,28]),5.4*n.s,11.5*n.s,11*n.s)),Ft(Lo(n([69,28]),n([67.5,42]),n([53,43]),n([52,59]),11*n.s,9.6*n.s,4.6*n.s)),Ft(we(n([51.6,75.5]),7.2*n.s))],Ku=([n,t],e)=>{let i=e*.24;return[Ft(Ie([n,t],[n+e,t-e*.06],i*.7,i*.9,i)),Ft(Ie([n+e,t-e*.06],[n+e*.04,t+e],i,i*.8,i*.9)),Ft(Ie([n+e*.04,t+e],[n+e*1.08,t+e*.96],i*.9,i,i*.6))]},ki={cx:52,cy:44,rx:40,ry:33},ko=(n,t=0)=>[ki.cx+(ki.rx-t)*Math.cos(n*mi),ki.cy+(ki.ry-t)*Math.sin(n*mi)];function Av(){let n=ko(114),t=ko(146);return`M${Ee(n)} A${ki.rx} ${ki.ry} 0 1 0 ${Ee(t)} Q20 76 9 93 Q30 84 ${Ee(n)} Z`}function Cv(){let n=ko(24,1.8),t=ko(108,1.8);return`M${Ee(n)} A${st(ki.rx-1.8)} ${st(ki.ry-1.8)} 0 0 1 ${Ee(t)} Q${Ee(ko(66,10))} ${Ee(n)} Z`}var Cm=(n,t=3)=>ki.cy-(ki.ry-t)*Math.sqrt(Math.max(0,1-((n-ki.cx)/(ki.rx-t))**2)),td=(n={})=>[{...Kt(Av(),Qe,3.2),bare:!0,...n},Te(Mn(Cv(),ul,.75))],Hi=(n,t=[])=>Oe([...td(),...n.map(Te),...t]),Rm=(n=10)=>[At(`M31 ${st(40+n/4)} Q37.5 ${st(40-n*.85)} 44 ${st(40+n/4)}`,4.4),At(`M60 ${st(40+n/4)} Q66.5 ${st(40-n*.85)} 73 ${st(40+n/4)}`,4.4)],Rv=(n=38,t=0)=>[At(`M29 ${st(n-t)} L46 ${st(n+t)}`,4.2),At(`M58 ${st(n+t)} L75 ${st(n-t)}`,4.2)],Pm=(n=38,t=0)=>[Ft(`M${st(33+t)} ${n} A4.6 4.6 0 0 0 ${st(42.2+t)} ${n} Z`),Ft(`M${st(62+t)} ${n} A4.6 4.6 0 0 0 ${st(71.2+t)} ${n} Z`)],Im=(n=.85)=>[Mn(vn([29,52],7,4),dl,n),Mn(vn([75,52],7,4),dl,n)],km=n=>[-5,0,5].map(t=>At(`M${st(n+t-2.4)} 55.5 L${st(n+t+2.4)} 48.5`,1.8,_n)),Pv=(n,t,e)=>`M${n} ${t} Q${st(n-12*e)} ${st(t)} ${st(n-12*e)} ${st(t-10*e)} Q${st(n-12*e)} ${st(t-21*e)} ${st(n+1*e)} ${st(t-21*e)} Q${st(n+4*e)} ${st(t-32*e)} ${st(n+18*e)} ${st(t-30*e)} Q${st(n+30*e)} ${st(t-36*e)} ${st(n+38*e)} ${st(t-24*e)} Q${st(n+50*e)} ${st(t-24*e)} ${st(n+50*e)} ${st(t-12*e)} Q${st(n+50*e)} ${st(t)} ${st(n+38*e)} ${st(t)} Z`;function Ju([n,t],e,i,s=9){let r=Array.from({length:s},(a,l)=>{let c=(-100+l*360/s)*mi;return[n+e*Math.cos(c),t+i*Math.sin(c)]}),o=`M${Ee(r[0])}`;for(let a=0;a<s;a++){let l=r[(a+1)%s],c=Math.hypot(l[0]-r[a][0],l[1]-r[a][1])*.6;o+=` A${st(c)} ${st(c)} 0 0 1 ${Ee(l)}`}return`${o} Z`}function Iv([n,t],e,i,s=1.12){let r=c=>[n+e*Math.cos(c*mi),t+e*Math.sin(c*mi)],a=e*Math.sin(Math.PI/i)*s,l=`M${Ee(r(-70))}`;for(let c=1;c<=i;c++)l+=` A${st(a)} ${st(a)} 0 1 1 ${Ee(r(-70+c*360/i))}`;return l}var kv=Tv(bs({r:-10}),"M50 84 C24 66 12 48 22 32 C31 18 46 21 50 34 C54 21 69 18 78 32 C88 48 76 66 50 84 Z"),Lv="M60 8 C56 24 29 44 29 62 C29 74 39 83 50 83 C61 83 71 74 71 62 C71 46 64 24 60 8 Z",Lm="M86 30 C84 36 78 41 78 46 C78 51 82 54 86 54 C90 54 94 51 94 46 C94 41 88 36 86 30 Z",hl=(n,t,e,i)=>Kt(Io(n(t),n(e),n(i),3.4,12,3.4),_n,2.4),gi=Object.freeze({laugh:{kind:"face",label:"Laughing",motion:"shake",svg:Hi([...Rm(12),Ft("M40 50 L64 50 C64 60 58.5 67 52 67 C45.5 67 40 60 40 50 Z"),Mn("M45 62 C48 58.5 56 58.5 59 62 C56 65.5 48 65.5 45 62 Z",dl)],[Ft(Io([88,12],[93,6],[99,4],2,4.4,1.6)),Ft(Io([92,24],[98,22],[104,24],2,4.4,1.6))])},pleased:{kind:"face",label:"Pleased",motion:"bob",svg:Hi([...Rm(8),At("M43 54 Q52 62 61 54",3.8),...Im(.7)])},smug:{kind:"face",label:"Smug",motion:"tilt",svg:Hi([At("M29 38.5 Q37.5 35.5 46 38.5",4),At("M58 38.5 Q66.5 35.5 75 38.5",4),...Pm(38.5,3),At("M60 27 Q67 23 74 26",3.2),At("M41 55 Q46.5 61 52 55 Q57.5 61 63 55",3.6)],[Kt(Gn([92,10],9),Ms,2)])},blush:{kind:"face",label:"Flustered",motion:"pulse",svg:Hi([...Im(.95),...km(29),...km(75),At("M31 30 Q36.5 27 42 30",3),At("M62 30 Q67.5 27 73 30",3),Ft(we([37.5,40],3.6)),Ft(we([66.5,40],3.6)),At("M45 58 Q48.5 54.5 52 58 Q55.5 61.5 59 58",3.4)])},determined:{kind:"face",label:"Fired up",motion:"pulse",svg:Hi([Ft(Ie([27,27],[45,34.5],3.2,6.4,5.4)),Ft(Ie([77,27],[59,34.5],3.2,6.4,5.4)),Ft(vn([37.5,43],4.4,6.2)),Ft(vn([66.5,43],4.4,6.2)),Mn(we([39,40.6],1.6),sr),Mn(we([68,40.6],1.6),sr),At("M42 59 Q52 55 62 59",3.8)],[Kt(Gn([92,11],10.5),Ms,2.2),Kt(Gn([98.5,30],5),Qe,1.8)])},deadpan:{kind:"face",label:"Unimpressed",motion:"still",svg:Hi([...Rv(38),...Pm(38),At("M45 58 L59 58",3.6)])},wince:{kind:"face",label:"Argh!",motion:"shake",svg:Hi([At("M30 33 L43 40 L30 47",4.4),At("M74 33 L61 40 L74 47",4.4),Kt("M41 52 L63 52 Q66 52 66 55 L66 61 Q66 64 63 64 L41 64 Q38 64 38 61 L38 55 Q38 52 41 52 Z",Qe,3),At("M39 58 L65 58",1.8),At("M45.5 52.5 L45.5 63.5",1.6),At("M52 52.5 L52 63.5",1.6),At("M58.5 52.5 L58.5 63.5",1.6)],[Kt(Lm,nn,2.4)])},tear:{kind:"face",label:"Tears",motion:"bob",svg:Hi([Ft("M45.5 55 Q52 51 58.5 55 Q59 61 52 61.5 Q45 61 45.5 55 Z")],[Kt("M34.6 39 L40.4 39 C41 50 39.6 60 41.6 70 C43 77 43.6 82 41.6 85.5 Q37.4 89 33.2 85.5 C31.2 82 32.8 77 33.6 70 C34.8 60 34 50 34.6 39 Z",nn,2.2),Kt("M63.6 39 L69.4 39 C70 50 68.6 60 70.6 70 C72 77 72.6 82 70.6 85.5 Q66.4 89 62.2 85.5 C60.2 82 61.8 77 62.6 70 C63.8 60 63 50 63.6 39 Z",nn,2.2),Kt(we([27,94],2.6),nn,1.8),Kt(we([77,95],2.6),nn,1.8),At("M30 36.5 L45 36.5",4.4),At("M59 36.5 L74 36.5",4.4)])},shiver:{kind:"face",label:"Shiver",motion:"shake",svg:Hi([...[32,42,52,62,72].map(n=>At(`M${n} ${st(Cm(n)+1)} L${n} ${st(Cm(n)+13-Math.abs(n-52)/6)}`,2.2,Qu)),At(we([37.5,42],5.4),2.8),At(we([66.5,42],5.4),2.8),Ft(we([37.5,42.5],2.1)),Ft(we([66.5,42.5],2.1)),At("M40 59 L44 55.5 L48 59 L52 55.5 L56 59 L60 55.5 L64 59",3)],[Ft(Io([95,30],[99.5,38],[95,46],1.6,3.6,1.6)),Ft(Io([100.5,27],[105.5,38],[100.5,49],1.6,3.4,1.6))])},dizzy:{kind:"face",label:"Dizzy",motion:"tilt",svg:Hi([At(Po([37.5,40],1,8.4,2.1),3),At(Po([66.5,40],1,8.4,2.1,90),3),At("M40 59 Q44 55 48 59 Q52 63 56 59 Q60 55 64 59",3.4)],[Kt(Gn([86,5],8),Ms,2),Kt(Gn([98,19],5.5),Ms,1.8),Ft(we([97,4],2))])},ko:{kind:"face",label:"Out cold",motion:"tilt",svg:Hi([At("M31 34 L43 46 M43 34 L31 46",4.2),At("M61 34 L73 46 M73 34 L61 46",4.2),At(vn([52,58],4.6,3.6),3.2)])},ellipsis:{kind:"balloon",label:"\u2026",motion:"bob",svg:Oe([...td(),...[36,52,68].map(n=>Te(Ft(we([n,45],4.4))))])},whisper:{kind:"balloon",label:"Psst",motion:"bob",svg:Oe([...td({dash:"6.5 4.5",w:2.8}),...[At("M26 39 L26 62",3.6),At(vn([31.5,45],5.4,6.2),3.6),At("M48 39.5 C45 36.5 39 37.5 39 41.5 C39 46.5 48 44.5 48 49.5 C48 53.5 41 54.5 38 51.5",3.6),At("M62 39.5 C59 36.5 53 37.5 53 41.5 C53 46.5 62 44.5 62 49.5 C62 53.5 55 54.5 52 51.5",3.6),At("M70 31 L70 48 C70 52.5 73.5 53 77 50.5",3.6),At("M65 39 L77 39",3.6)].map(Te)])},think:{kind:"balloon",label:"Thinking",motion:"bob",svg:Oe([{...Kt(Ju([54,38],37,27),Qe,3),bare:!0},...[40,54,68].map(n=>Te(Mn(we([n,40],3.4),rr))),{...Kt(we([23,77],6.4),Qe,2.6),bare:!0},{...Kt(we([12,91],4),Qe,2.2),bare:!0}])},surprise:{kind:"mark",label:"Surprise",motion:"shake",svg:Oe([...Em(bs({dx:-6})),Ft(Ie([68,26],[84,13],2,5,1.6)),Ft(Ie([72,44],[92,42],2,5,1.6)),Ft(Ie([68,62],[84,72],2,5,1.6))],{echo:_n,shadow:!1})},question:{kind:"mark",label:"Question",motion:"tilt",svg:Oe(Am(bs({r:8})),{echo:yn,shadow:!1})},shock:{kind:"mark",label:"What?!",motion:"shake",svg:Oe([...Em(bs({s:.84,dx:-18,r:-8})),...Am(bs({s:.84,dx:16,r:10}))],{echo:_n,shadow:!1})},sweat:{kind:"mark",label:"Sweat",motion:"drip",svg:Oe([Kt(Lv,nn,3.2),Te(At("M38 58 C37 66 40 72 46 75",4,sr)),Kt(Lm,nn,2.4)])},anger:{kind:"mark",label:"Anger",motion:"pulse",svg:(()=>{let n=bs({s:.92,r:-10});return Oe([hl(n,[16,43],[40,41],[42,17]),hl(n,[58,17],[60,41],[84,43]),hl(n,[84,57],[60,59],[58,83]),hl(n,[42,83],[40,59],[16,57])])})()},sparkle:{kind:"mark",label:"Sparkle",motion:"twinkle",svg:Oe([Kt(Gn([45,55],36),Ms,2.6),Kt(Gn([81,19],14),Qe,2.2),Kt(Gn([18,20],8),Qe,2),Ft(we([84,64],2.6)),Ft(we([70,86],1.8))])},heart:{kind:"mark",label:"Fond",motion:"float",svg:Oe([Kt(kv,_n,3.2),Te(At("M29 37 Q30 29 37 27",4,sr)),Ft(Ie([80,20],[90,10],1.6,4.2,1.4)),Ft(Ie([86,34],[99,31],1.6,4.2,1.4)),Ft(Ie([70,12],[73,0],1.6,4,1.4))])},music:{kind:"mark",label:"Humming",motion:"float",svg:Oe([Ft(vn([30,75],9.6,7,-22)),Ft(vn([68,64],9.6,7,-22)),Ft(Ie([38.4,72],[38.4,30],3.6,3.6,3.6)),Ft(Ie([76.4,61],[76.4,19],3.6,3.6,3.6)),Ft("M36.6 24 L78.2 13 L78.2 23 L36.6 34 Z")],{echo:yn,shadow:!1})},sleep:{kind:"mark",label:"Asleep",motion:"float",svg:Oe([...Ku([14,74],13),...Ku([32,46],19),...Ku([56,8],28)],{echo:rr,shadow:!1})},gloom:{kind:"mark",label:"Gloom",motion:"fall",svg:Oe([Kt(Pv(28,42,1.24),rr,3),Te(At("M22 32 Q28 28 34 32",2.4,ul)),...[[26,50,66],[38,52,80],[50,50,70],[62,52,84],[74,50,64],[44,76,92],[68,74,90]].map(([n,t,e])=>Te(At(`M${n} ${t} L${n-1.5} ${e}`,2.4,Qu)))])},idea:{kind:"mark",label:"Idea",motion:"flicker",svg:(()=>{let n=[200,240,270,300,340].map(t=>Ft(Ie([50+34*Math.cos(t*mi),42+34*Math.sin(t*mi)],[50+46*Math.cos(t*mi),42+46*Math.sin(t*mi)],4.4,3.2,1.4)));return Oe([...n,Kt("M50 16 C35 16 26 27 26 40 C26 50 31.5 55.5 36 61 L38 70 L62 70 L64 61 C68.5 55.5 74 50 74 40 C74 27 65 16 50 16 Z",Ms,3.2),Te(At("M35 37 Q36 28 44 24",4,sr)),Te(At("M45 64 L45 54 C45 46 55 46 55 54 L55 64",2.2,yn)),Kt("M38 72 L62 72 L60.5 84 L39.5 84 Z",yn,3),Te(At("M39 78 L61 78",2.2)),Ft(we([50,89],3.8))])})()},fume:{kind:"mark",label:"Fuming",motion:"rise",svg:Oe([Ft(Ie([4,100],[16,84],1,2.6,3.4)),Ft(Ie([14,103],[24,91],1,2.2,2.8)),Kt(Ju([31,70],19,15.5,6),Qe,3),Te(At(Po([31,71],1.2,8.4,1.3,180),3)),Ft(Ie([42,46],[52,35],1,2.6,3.4)),Kt(Ju([70,27],26,21,7),Qe,3.2),Te(At(Po([70,28],1.4,11.8,1.35,180),3.2))])},soul:{kind:"mark",label:"Done for",motion:"rise",svg:Oe([Kt("M47 27 C47 14 59 8 69 11 C80 14 83 29 77 39 C71 49 59 52 51 60 C43 68 41 77 30 86 C31 77 34 71 32 65 C30 57 36 51 42 45 C46 39 47 34 47 27 Z",Qe,2.8),Te(At("M56 27 Q59 29.5 62 27",2.6)),Te(At("M67 25 Q70 27.5 73 25",2.6)),Te(At(vn([65.5,35],2.8,2.2),2.4)),Te(Mn("M33 82 C38 76 40 70 44 64 C41 72 38 78 33 82 Z",nn,.9)),Ft(we([22,94],2.2)),Ft(we([14,101],1.5))],{echo:nn})},star:{kind:"mark",label:"Well done",motion:"pulse",svg:Oe([At(Po([50,50],2,17,1.9),3.8,_n),At(Iv([50,50],27,6),3.8,_n)],{shadow:!1,key:1.3})},hand:{kind:"mark",label:"Hand up",motion:"wave",svg:Oe([Kt("M37 92 L37 61 C33 57 26 51 24 45 C22 39 27 35 31 38 L38 45 L38 22 C38 15 44 12 49.5 12.5 C55 12 59 14 60.5 18 C64.5 16 71 18.5 71 25 L71 63 C71 77 66 86 61 92 Z",Qe,3.2),Te(At("M49.5 14 L49.5 43",2.2)),Te(At("M60.5 19 L60.5 45",2.2)),Te(Mn("M60 72 C66 66 70 60 70 50 L70 63 C70 72 66 80 62 86 Z",ul)),Kt("M34 88 L64 88 L64 98 L34 98 Z",yn,3),Ft(Ie([78,16],[88,8],1.6,4,1.4)),Ft(Ie([80,32],[93,30],1.6,4,1.4))])},bowl:{kind:"mark",label:"Hungry",motion:"bob",svg:Oe([At("M34 34 Q28 25 34 17 Q40 9 34 1",3,rr),At("M50 31 Q44 22 50 14 Q56 6 50 -2",3,rr),Kt("M18 52 C22 40 38 33 50 35 C62 33 78 40 82 52 Z",Qe,2.6),Kt(Ie([64,44],[95,14],4,4,3.2),yn,2),Kt(Ie([70,46],[99,22],4,4,3.2),yn,2),Kt("M12 51 L88 51 C88 71 74 85 56 87 L44 87 C26 85 12 71 12 51 Z",_n,3.2),Te(At("M19 60 C36 67 64 67 81 60",2.6,Qe)),Kt("M38 87 L62 87 L60 95 L40 95 Z",yn,2.8)])}}),pl=Object.freeze(["laugh","pleased","smug","blush","determined","deadpan","wince","tear","shiver","dizzy","ko","ellipsis","whisper","think","surprise","question","shock","sweat","anger","sparkle","heart","music","sleep","gloom","idea","fume","soul","star","hand","bowl"]),fE=Object.freeze(["surprise","laugh","sweat","heart","anger","idea","ellipsis","whisper"]);function Nm(n,t,e=0){let i=e%97/97,s=0,r=0,o=0,a=1,l=1;switch(n){case"drip":r=Math.min(14,t*6);break;case"pulse":a=1+.1*Math.max(0,Math.sin(t*13+i*6));break;case"float":r=-(14*Math.min(t,1.5)+5*Math.max(0,t-1.5)),s=4*Math.sin(t*3+i*6);break;case"twinkle":a=1+.08*Math.sin(t*9+i*6),o=6*Math.sin(t*4+i);break;case"fall":r=Math.min(10,t*5);break;case"flicker":l=t<.6?Math.sin(t*60)>-.3?1:.35:1;break;case"rise":r=-(10*Math.min(t,2)+4*Math.max(0,t-2)),a=1+.05*Math.min(t,2);break;case"spin":o=t*140;break;case"bob":r=3*Math.sin(t*4+i*6);break;case"shake":s=t<.9?3*Math.sin(t*46)*(1-t/.9):0;break;case"tilt":o=12*Math.sin(t*3+i);break;case"wave":o=14*Math.sin(t*9)*Math.exp(-t*.8);break;default:break}return{x:s,y:r,r:o,s:a,o:l}}var or=.7,ml=5,Om=6;function Fm(n,{keep:t=!1,t0:e=0}={}){if(n===null)return{id:null,chosen:!0};if(typeof n!="string"||!gi[n])return null;let i={id:n,t0:Math.round(e*1e3)/1e3,chosen:!0};return t||(i.once=!0),i}var gl=1/120,Um=2.5,Do=Object.freeze({card:{w:280,h:468},holdLift:70,stickLength:134,lane:150,passInFront:85,gripRate:16,limits:{x:[-1800,1800],z:[-2300,260]},zoneEvery:4,look:{reach:900,most:22,linger:2.6},magnet:{overlap:.42,lane:110,rate:9}}),Sn=(n,t,e)=>Math.max(t,Math.min(e,n));function Ss(n,t,e,i,s,r=16,o=.72){let a=r*r*(i-n[t])-2*o*r*n[e];n[e]+=a*s,n[t]+=n[e]*s}function Bm(n){let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return 1e3+(t>>>0)%9e3}var ar=class{constructor(t,e=[],i={}){this.scene=t,this.opts={...Do,...i,card:{...Do.card,...i.card??{}},limits:{...Do.limits,...i.limits??{}},look:{...Do.look,...i.look??{}},magnet:{...Do.magnet,...i.magnet??{}}},this.clock=typeof i.clock=="function"?i.clock:()=>this.time,this.coverFn=typeof i.cover=="function"?i.cover:null,this.rig=er(t.painting,t.rig);let s=fm(t.marks,this.rig);this.marks=s.marks,this.problems=s.dropped.map(r=>`mark "${r}" is above the horizon and cannot be stood on`),this.zones=t.zones,this.bands=um(t.zones),this.focus=this.#i(),this.risers=this.#t(),this.cards=new Map,this.resting=new Map,this.touching=new Map,this.inZones=new Map,this.events=[],this.recentBonks=[],this.time=0,this.acc=0,this.steps=0,this.lifeOn=!0,this.board=!1,this.speaker=null,this.turn=null,this.calm=!1,this.slots=new Map;for(let r of e)this.addCard(r)}#t(){let{cam:t,map:e}=this.rig,i=t.floorY-t.cy;return(this.scene.occluders??[]).filter(s=>s.riser).flatMap(s=>{let r=this.rig.standing([s.x,s.base]);if(!r)return[];let o=(t.f-r.Z)/t.f,a=Math.min(...s.poly.map(c=>c[1])),l=s.poly.map(c=>(e.x(c[0])-t.cx)*o);return[{Z:r.Z,top:i-(e.y(a)-t.cy)*o,x0:Math.min(...l),x1:Math.max(...l),hideAtMost:s.hideAtMost,camY:i,f:t.f}]})}riserFor(t,e,i,s){let r=0;for(let o of this.risers){if(e>=o.Z-4||t+i/2<o.x0||t-i/2>o.x1)continue;let a=o.camY+(o.top-o.camY)*((o.f-e)/(o.f-o.Z));r=Math.max(r,a-o.hideAtMost*s)}return Math.max(0,Math.min(r,s*Um))}grow(t){return el(this.rig.cam,t)}unhidden(t,e,i,s){for(let r of this.risers){if(e>=r.Z-4||t+i/2<r.x0||t-i/2>r.x1)continue;if(r.camY+(r.top-r.camY)*((r.f-e)/(r.f-r.Z))-r.hideAtMost*s>s*Um)return r.Z+60}return e}#i(){let t=this.scene.rig,e=this.scene.focus??[t.vanish??.5,t.horizon+(t.floorFront-t.horizon)*.72];return this.rig.place(e)??{X:0,Z:-400}}addCard(t){if(!t?.id||this.cards.has(t.id))return null;let e=this.opts.card.w,i=this.opts.card.h,s=this.scene.cardScale*(t.size??1),r=0,o=0,a=t.mark?this.marks.find(u=>u.id===t.mark):null;if(a)r=a.X,o=a.Z;else if(t.at){let u=this.rig.place(t.at);u&&(r=u.X,o=u.Z)}else Number.isFinite(t.X)&&Number.isFinite(t.Z)&&(r=t.X,o=t.Z);let l={id:t.id,person:t,s,w:e*s,h:i*s,seed:Bm(t.id),puppet:im({id:t.id,x:r,y:0,rod:0,w:e*s,h:i*s,scale:1}),Z:o,restZ:o,zOff:0,grip:0,holder:null,hand:null,yaw:t.yaw??0,yawV:0,yawTo:t.yaw??0,lean:t.lean??0,leanV:0,leanTo:t.lean??0,pitch:t.pitch??0,pitchV:0,pitchTo:t.pitch??0,lift:0,liftV:0,liftTo:0,mark:null,walk:null,routine:null,still:t.still===!0,living:!1,packed:t.packed===!0,stepLift:0,stepRock:0,look:0,lookV:0,attention:null,riser:0,riserTo:0,down:t.down===!0?1:0,downV:0,downTo:t.down===!0?1:0,grow:this.grow(o)};l.riser=l.riserTo=this.riserFor(r,o,l.w*l.grow,l.h*l.grow),this.cards.set(l.id,l),a&&this.#s(l,a,!0);let c=qu(t.life);if(c&&(l.routine=Yu(c,{home:{X:r,Z:o},rig:this.rig,marks:this.marks,seed:l.seed})),l.routine&&!l.still&&this.lifeOn&&!a){let u=sl(l.routine,this.clock());l.puppet.x=l.puppet.restX=u.X,l.Z=l.restZ=u.Z,u.yaw!==null&&(l.yaw=l.yawTo=u.yaw),l.living=!0}let h=t.enter&&typeof t.enter=="object"&&!zm(t.enter.t0,this.clock())?t.enter:null;if(h&&h.from==="rise"){let u=Number.isFinite(h.t0)?h.t0:this.clock();l.rise={t0:u,dur:Number.isFinite(h.dur)?h.dur:.7}}if(h&&Number.isFinite(h.t0)&&this.clock()-h.t0<3&&this.#e(l),h&&["left","right","back"].includes(h.from)){let u=Number.isFinite(h.t0)?h.t0:this.clock(),d=ym(h.from,{X:r,Z:o},this.opts.limits),f=_s(d,{X:r,Z:o},{t0:u,gait:h.gait??"walk",yaw:l.yawTo,maxDur:8});if(this.clock()<f.t0+f.dur){l.walk=f;let x=Ro(f,this.clock());l.puppet.x=l.puppet.restX=x.X,l.Z=l.restZ=x.Z}}return l}removeCard(t){let e=this.cards.get(t);if(!e)return!1;e.mark&&this.resting.get(e.mark)?.delete(t),this.cards.delete(t),this.inZones.delete(t);for(let i of[...this.touching.keys()])i.split("|").includes(t)&&this.touching.delete(i);return!0}walkTo(t,e,{t0:i=null,gait:s="walk",yaw:r=null,lean:o=null,pitch:a=null,still:l=null,packed:c=null}={}){let h=this.cards.get(t);if(!h||h.holder!==null)return null;let u=null,d=null;if(e?.mark?(d=this.marks.find(p=>p.id===e.mark)??null,d&&(u={X:d.X,Z:d.Z})):Array.isArray(e?.at)?u=this.rig.place(e.at):Number.isFinite(e?.X)&&Number.isFinite(e?.Z)&&(u={X:e.X,Z:e.Z}),!u)return null;let f=this.opts.limits;if(u={X:Sn(u.X,f.x[0],f.x[1]),Z:Sn(u.Z,f.z[0],f.z[1])},h.mark&&(this.resting.get(h.mark)?.delete(t),h.mark=null),d){let p=this.resting.get(d.id);p||this.resting.set(d.id,p=new Set),p.add(t),h.mark=d.id}l!==null&&(h.still=!!l),c!==null&&(h.packed=!!c);let x=d?il(d,this.#r()):{yaw:r??h.yawTo,lean:o??0,pitch:a??0,lift:0},g=Number.isFinite(i)&&!zm(i,this.clock())?i:this.clock();return h.walk=_s({X:h.puppet.x,Z:h.Z},u,{t0:g,gait:s,yaw:x.yaw}),h.walk.pose=x,h.walk.mark=d?.id??null,h.living=!1,this.events.push({type:"walk",card:t,to:{X:u.X,Z:u.Z},mark:d?.id??null,t:this.time}),h.walk}setRoutine(t,e,i=null){let s=this.cards.get(t);if(!s)return;let r=Array.isArray(i)?this.rig.place(i):null;i=r?{X:r.X,Z:r.Z}:s.routine?.home??{X:s.puppet.restX,Z:s.restZ};let o=qu(e);s.routine=o?Yu(o,{home:i,rig:this.rig,marks:this.marks,seed:s.seed}):null,s.living=!1}setStill(t,e){let i=this.cards.get(t);i&&(i.still=!!e)}setLife(t){this.lifeOn=!!t}setBoard(t){this.board=!!t}setDown(t,e){let i=this.cards.get(t);if(!i)return!1;let s=e?1:0;return i.downTo===s?!1:(i.downTo=s,e&&i.walk&&this.#n(i),this.events.push({type:"fall",card:t,down:!!e,t:this.time}),e&&this.#e(i),!0)}#e(t){let e=this.clock()+this.opts.look.linger;for(let i of this.cards.values())i===t||i.holder!==null||i.downTo||Co({X:i.puppet.x,Z:i.Z},{X:t.puppet.x,Z:t.Z})<=this.opts.look.reach*1.4&&(i.attention={id:t.id,until:e})}setSpeaker(t){this.speaker=t&&this.cards.has(t)?t:null}setTurn(t){this.turn=t&&this.cards.has(t)?t:null}setCalm(t){this.calm=!!t}dockFor(t,e,i){if(!this.board)return null;let s=this.rig.fractionOf(e,i),r=this.zones.find(h=>h.kind==="area"&&ir([h],s[0],s[1]).length);if(!r)return null;let a=(this.cards.get(t)?.w??180)*this.grow(i);this.slots.has(r.id)||this.slots.set(r.id,Vu(r,this.rig,{w:a*1.05}));let l=[...this.cards.values()].filter(h=>h.id!==t&&h.holder===null).map(h=>({X:h.walk?h.walk.to.X:h.puppet.restX,Z:h.walk?h.walk.to.Z:h.restZ})),c=this.slots.get(r.id).filter(h=>!l.some(u=>Math.abs(u.X-h.X)<a*.6&&Math.abs(u.Z-h.Z)<90));return c.length?(c.sort((h,u)=>Math.hypot(h.X-e,(h.Z-i)*.8)-Math.hypot(u.X-e,(u.Z-i)*.8)),{X:c[0].X,Z:c[0].Z,zone:r.id}):null}hold(t,e){let i=this.cards.get(t);return!i||i.holder!==null&&i.holder!==e?!1:(i.holder===e||(i.mark&&(this.resting.get(i.mark)?.delete(t),i.mark=null),this.#n(i),i.routine&&(i.still=!0),i.holder=e,i.hand={x:i.puppet.x,z:i.Z},i.puppet.heldBy=e,this.events.push({type:"grab",card:t,by:e,t:this.time})),!0)}setHand(t,{x:e,z:i}){let s=this.cards.get(t);if(!s||s.holder===null)return;let r=this.opts.limits;s.hand.x=Sn(e,r.x[0],r.x[1]),s.hand.z=Sn(i,r.z[0],r.z[1])}release(t,e=null){let i=this.cards.get(t);if(!i||i.holder===null)return null;let s=i.holder,r=e??this.landingFor(t);i.holder=null,i.hand=null,i.puppet.heldBy=null;let o=r.mark?this.marks.find(h=>h.id===r.mark)??null:null;o?this.#s(i,o,!1):(i.puppet.restX=r.X,i.restZ=Sn(r.Z,this.opts.limits.z[0],this.opts.limits.z[1]),i.mark=null);let a={type:"drop",card:t,by:s,t:this.time,mark:o?.id??null,X:i.puppet.restX,Z:i.restZ};this.events.push(a);let l=this.rig.fractionOf(i.puppet.restX,i.restZ),c=ir(this.zones.filter(h=>h.kind==="door"||h.kind==="spot"),l[0],l[1])[0];return c&&this.events.push({type:"visit",card:t,by:s,zone:c.id,name:c.name,hint:c.hint,t:this.time}),a}landingFor(t){let e=this.cards.get(t);if(!e||e.holder===null)return null;let i=e.puppet.x,s=e.hand?.z??e.Z,r=Xu(this.marks,this.resting,i,s,this.scene.reach.snap);!r&&this.scene.marksOnly&&(r=Xu(this.marks,this.resting,i,s,1/0));let o=r?null:this.dockFor(t,i,s);if(o)return{X:o.X,Z:o.Z,mark:null};let a={X:i,Z:Sn(s,this.opts.limits.z[0],this.opts.limits.z[1])},l=r?a:this.clearOfCover(a,e);return{X:l.X,Z:l.Z,mark:r?.id??null}}handOver(t,e){let i=this.cards.get(t);return i?(i.mark&&(this.resting.get(i.mark)?.delete(t),i.mark=null),this.#n(i),i.routine&&(i.still=!0),i.hand??={x:i.puppet.x,z:i.Z},i.holder=e,i.puppet.heldBy=e,!0):!1}#n(t){t.walk&&(t.walk=null,t.puppet.restX=t.puppet.x,t.restZ=t.Z,t.stepLift=0,t.stepRock=0)}perform(t,e){let i=this.cards.get(t);i&&Bu(i.puppet,e)}#s(t,e,i){let s=this.resting.get(e.id);s||this.resting.set(e.id,s=new Set),s.add(t.id),t.mark=e.id;let r=il(e,this.#r());t.puppet.restX=e.X,t.restZ=e.Z,t.yawTo=r.yaw,t.leanTo=r.lean,t.pitchTo=r.pitch,t.liftTo=r.lift,i&&(t.puppet.x=e.X,t.Z=e.Z,t.yaw=r.yaw,t.lean=r.lean,t.pitch=r.pitch,t.lift=r.lift),this.events.push({type:"mark",card:t.id,mark:e.id,t:this.time})}#r(){return{zones:this.zones,pointOnFloor:t=>this.rig.standing(t),cardAt:t=>{let e=this.cards.get(t);return e?{X:e.puppet.x,Z:e.Z}:null}}}tidy({t0:t=null}={}){let e=this.marks.map(r=>({...r,capacity:r.capacity-(this.resting.get(r.id)?.size??0)})).filter(r=>r.capacity>0),i=[...this.cards.values()].filter(r=>!r.mark&&r.holder===null&&!r.walk).map(r=>({id:r.id,X:r.puppet.x,Z:r.Z})),s=nl(e,i);for(let{card:r,mark:o}of s)this.walkTo(r,{mark:o},{t0:t,gait:"hurry",still:!0});return s}advance(t){this.acc+=Math.min(Math.max(t,0),.05);let e=0;for(;this.acc>=gl-1e-9;)this.step(gl),this.acc-=gl,e++;return e}step(t=gl){this.time+=t,this.steps++;let e=this.opts,i=this.clock(),s=[...this.cards.values()].filter(r=>r.holder!==null);for(let r of this.cards.values()){let o=r.puppet,a=r.holder!==null;a||this.#a(r,i),o.heldBy=a?r.holder:null,o.target=a?{x:r.hand.x,y:0}:null,nm(o,t),r.Z+=((a?r.hand.z:r.restZ)-r.Z)*Math.min(1,t*(a?24:12)),r.grip+=((a?1:0)-r.grip)*Math.min(1,t*e.gripRate),Ss(r,"yaw","yawV",r.yawTo,t,16,.72),Ss(r,"lean","leanV",r.leanTo,t,18,.8),Ss(r,"pitch","pitchV",r.pitchTo,t,18,.8),Ss(r,"lift","liftV",r.liftTo,t,18,.62),Ss(r,"look","lookV",a||r.downTo?0:this.#c(r,s,i),t,7,.9),r.riser+=(r.riserTo-r.riser)*Math.min(1,t*9),r.grow=this.grow(r.Z),r.downTo?Ss(r,"down","downV",1,t,9,.45):Ss(r,"down","downV",0,t,6,.8),r.down>1.08&&(r.down=1.08,r.downV=-Math.abs(r.downV)*.35)}if(this.#o(t),this.steps%e.zoneEvery===0&&(this.#u(),this.#h(t*e.zoneEvery),this.risers.length))for(let r of this.cards.values())r.riserTo=this.riserFor(r.puppet.x,r.Z,r.w*r.grow,r.h*r.grow)}#a(t,e){let i=t.puppet;if(t.walk){let r=Ro(t.walk,e);i.restX=r.X,t.restZ=r.Z,t.stepLift=r.lift,t.stepRock=r.rock,r.yaw!==null&&(t.yawTo=r.yaw),r.done&&this.#l(t);return}if(!!t.routine&&this.lifeOn&&!t.still&&!t.downTo){let r=sl(t.routine,e);if(!t.living&&Co({X:i.restX,Z:t.restZ},r)>12){let a=_s({X:i.x,Z:t.Z},r,{t0:e,gait:t.routine.gait}),l=sl(t.routine,e+a.dur);t.walk=_s({X:i.x,Z:t.Z},l,{t0:e,gait:t.routine.gait,yaw:l.yaw??t.yawTo}),t.walk.pose={yaw:l.yaw??t.yawTo,lean:0,pitch:0,lift:0},t.walk.mark=null,t.walk.back=!0;return}if(t.living=!0,i.restX=r.X,t.restZ=r.Z,t.stepLift=r.lift,t.stepRock=r.rock,!r.moving&&t.routine.facesCard){let a=this.cards.get(t.routine.facesCard);a&&(t.yawTo=Si(bi(r.X,r.Z,a.puppet.x,a.Z),{share:.8,max:55}))}else r.yaw!==null&&(t.yawTo=r.yaw);let o=_m(t.routine,e);o&&!r.moving&&e>=o.at&&e<o.at+.5&&t.gestured!==o.beat&&(t.gestured=o.beat,Bu(i,o.verb));return}t.living=!1,t.stepLift*=.8,t.stepRock*=.8}#l(t){let e=t.walk;t.walk=null,t.puppet.restX=e.to.X,t.restZ=e.to.Z,t.stepLift=0,t.stepRock=0;let i=e.pose??{yaw:e.yaw??t.yawTo,lean:0,pitch:0,lift:0};t.yawTo=i.yaw??t.yawTo,t.leanTo=i.lean??0,t.pitchTo=i.pitch??0,t.liftTo=i.lift??0,t.living=!1,e.mark&&this.events.push({type:"mark",card:t.id,mark:e.mark,t:this.time}),e.back||this.events.push({type:"arrive",card:t.id,mark:e.mark??null,t:this.time})}#c(t,e,i){let s=this.opts.look,r=null;if(t.attention&&t.attention.until>i?r=this.cards.get(t.attention.id)??null:t.attention=null,!r){let a=s.reach;for(let l of e){if(l===t)continue;let c=Co({X:l.puppet.x,Z:l.Z},{X:t.puppet.x,Z:t.Z});c<a&&(a=c,r=l)}}if(!r&&this.speaker&&this.speaker!==t.id&&(r=this.cards.get(this.speaker)??null),!r)return 0;let o=Si(bi(t.puppet.x,t.Z,r.puppet.x,r.Z),{share:.8,max:60});return Sn(o-t.yaw,-s.most,s.most)}#h(t){let e=this.opts.magnet,i=[...this.cards.values()].filter(s=>s.holder===null&&!s.walk&&!s.packed&&!(s.routine&&this.lifeOn&&!s.still));for(let s=0;s<i.length;s++)for(let r=s+1;r<i.length;r++){let o=i[s],a=i[r];if(Math.abs(o.restZ-a.restZ)>=e.lane)continue;let l=a.puppet.restX-o.puppet.restX,c=o.w*o.grow,h=a.w*a.grow,d=(c+h)/2-Math.min(c,h)*e.overlap-Math.abs(l);if(d<=.5)continue;let f=l!==0?Math.sign(l):o.id<a.id?1:-1,x=Math.min(d/2,d*e.rate*t),g=this.opts.limits.x;o.puppet.restX=Sn(o.puppet.restX-f*x,g[0],g[1]),a.puppet.restX=Sn(a.puppet.restX+f*x,g[0],g[1])}}#o(t){let e=this.opts,i=new Set;for(let s of this.cards.values()){if(s.holder===null){s.zOff+=(0-s.zOff)*Math.min(1,t*11);continue}let r=!1;for(let o of this.cards.values()){if(o===s||Math.abs(o.Z-s.Z)>=e.lane)continue;let a=s.id<o.id?`${s.id}|${o.id}`:`${o.id}|${s.id}`,l=So(s.puppet),c=So(o.puppet);if(Math.min(l.right,c.right)-Math.max(l.left,c.left)>0&&(r=!0),i.has(a))continue;i.add(a);let h=this.touching.get(a);h||this.touching.set(a,h=new Set);let u=s.id<o.id?[s,o]:[o,s];for(let d of om(u.map(f=>f.puppet),h)){let f={type:"bonk",t:this.time,a:d.a,b:d.b,x:d.x,speed:d.speed,Z:s.Z};this.events.push(f),this.recentBonks.push(f);let x=this.clock()+this.opts.look.linger,g=this.cards.get(d.a),p=this.cards.get(d.b);g&&p&&(g.attention={id:p.id,until:x},p.attention={id:g.id,until:x})}}s.zOff+=((r?e.passInFront:0)-s.zOff)*Math.min(1,t*11)}for(let[s,r]of this.touching)r.size===0&&this.touching.delete(s);this.recentBonks=this.recentBonks.filter(s=>this.time-s.t<.9)}#u(){if(!this.zones.length)return;let t=new Map;for(let e of this.cards.values()){let i=this.rig.fractionOf(e.puppet.x,e.Z);t.set(e.id,new Set(ir(this.zones,i[0],i[1]).map(s=>s.id)))}for(let e of dm(this.inZones,t))this.events.push({...e,t:this.time});this.inZones=t}drain(){let t=this.events;return this.events=[],t}marksFor(t){let e=this.cards.get(t);if(!e||e.holder===null)return[];let i=this.scene.reach;return mm(this.marks,this.resting,e.hand.x,e.hand.z,{show:i.show,snap:i.snap,max:5}).map(s=>({id:s.id,for:t,X:s.mark.X,Z:s.mark.Z,label:s.mark.label,alpha:s.alpha,target:s.target,pose:il(s.mark,this.#r())}))}zoneStates(){let t=[...this.cards.values()].filter(e=>e.holder!==null).map(e=>{let i=this.rig.fractionOf(e.hand.x,e.hand.z);return{x:i[0],y:i[1]}});return hm(this.zones,t)}snapshot({viewer:t=null,selected:e=null}={}){let i=this.time,s=this.clock(),r=[],o=[];for(let a of this.cards.values()){let l=a.puppet,c=tm(i,a.seed,a.person.demeanour??"calm",{speakerYaw:null}),h=rm(l),u=a.grip,d=a.rise?Nv(a.rise,s):1;a.rise&&s>a.rise.t0+a.rise.dur&&(a.rise=null),r.push({id:a.id,name:a.person.name??a.id,colour:a.person.colour??null,x:l.x+l.jx,z:a.Z+a.zOff,lift:(c.lift*(1-u)+a.lift+a.stepLift+a.riser)*(1-Math.min(1,a.down))+this.opts.holdLift*u+h.lift,lean:l.lean+(a.lean+c.lean)*(1-.85*u)*(1-Math.min(1,a.down))+a.stepRock,yaw:a.yaw+l.turn+h.shakeY+c.yaw+a.look,pitch:(a.pitch+c.pitch+h.tipX+h.dip*.4)*(1-Math.min(1,a.down))-78*a.down,down:Math.max(0,Math.min(1,a.down)),grip:u,breathe:c.breathe,squash:h.squash*d,scale:a.s*a.grow,grow:a.grow,held:a.holder!==null,holder:a.holder,mark:a.mark,walking:!!a.walk||a.living&&Math.abs(a.stepLift)>.2,selected:!!e?.has?.(a.id),speaking:this.speaker===a.id||this.turn===a.id,emote:this.#d(a,s)}),t!==null&&a.holder===t&&o.push(...this.marksFor(a.id))}return{t:i,cards:r,bonks:this.recentBonks.map(a=>({...a})),marks:o,zones:this.zoneStates(),board:this.board?this.boardState():null}}boardState(){let t={},e={};for(let i of this.zones)t[i.id]=0,e[i.id]=0;for(let[i,s]of this.inZones){let r=this.cards.get(i)?.downTo===1;for(let o of s)o in t&&(r?e:t)[o]++}return{counts:t,downs:e,bands:this.bands}}bandBetween(t,e){return!t||!e?null:t===e?"engaged":this.bands.some(i=>i.a===t&&i.b===e||i.a===e&&i.b===t)?"near":"far"}#d(t,e){let i=t.person.emote;if(!i?.id)return null;let s=e-(i.t0??0);if(i.once&&(s<0||s>ml))return null;let r=i.once?s:s%Om,o=r<0?0:r<.2?r/.2:r>ml-.6?Math.max(0,1-(r-(ml-.6))/.6):1,a=r<.3?.6+.4*Math.sin(r/.3*Math.PI*.5)+.12*Math.sin(r/.3*Math.PI):1,l=this.calm||r<0?null:Nm(gi[i.id]?.motion,r,Bm(t.id));return l?{id:i.id,age:r,opacity:o*l.o,pop:a*l.s,x:l.x,y:l.y,r:l.r}:{id:i.id,age:r,opacity:o,pop:a,x:0,y:0,r:0}}placeOf(t){let e=this.cards.get(t);if(!e)return null;let i=e.walk?e.walk.to.X:e.puppet.restX,s=e.walk?e.walk.to.Z:e.restZ,r=e.walk?e.walk.pose?.yaw??e.yawTo:e.yawTo;return{id:e.id,at:this.rig.fractionOf(i,s).map(o=>Math.round(o*1e4)/1e4),mark:e.mark,yaw:Math.round(r*10)/10}}formationMoves(t,{ids:e=null,focus:i=null,target:s=null,speakers:r=[],party:o=!1,gait:a="walk",dir:l="back",away:c=!1,size:h=null}={}){let u=this.standing(),d=e?u.filter(b=>e.includes(b.id)):u,f=this.focus;if(Array.isArray(i))f=this.rig.place(i)??this.focus;else if(typeof i=="string"&&this.cards.has(i)){let b=this.cards.get(i);f={X:b.puppet.restX,Z:b.restZ}}let x=this.grow(f.Z),g=d.map(b=>({...b,w:b.w*x}));if(t==="position")return this.#f(g,f,{party:o,gait:a});let p=["huddle","gangup","queue"].includes(t),m=null;if(Number.isFinite(h)&&h>0){let b=this.rig.fractionOf(f.X,f.Z),R=this.rig.standing([b[0]-h/2,b[1]]),P=this.rig.standing([b[0]+h/2,b[1]]);R&&P&&(m=Math.abs(P.X-R.X)/2)}let M=this.cover(),E=bm(t,{cards:g,focus:f,target:s,speakers:r,party:o,dir:l,radius:m,limits:{x:this.opts.limits.x,z:[this.opts.limits.z[0],200]},seed:this.steps%7}).filter(b=>this.cards.has(b.id)).map(b=>{let R=this.cards.get(b.id),P=this.grow(b.Z);return this.clearOfCover({...b,Z:this.unhidden(b.X,b.Z,R.w*P,R.h*P)},R,M)}),_=new Set(E.map(b=>b.id)),T=(b,R,P)=>{let k=this.cards.get(b),B=this.grow(P);return{id:b,X:R,Z:P,w:k.w*B,h:k.h*B,lift:this.riserFor(R,P,k.w*B,k.h*B)}},w=[...E.map(b=>T(b.id,b.X,b.Z)),...u.filter(b=>!_.has(b.id)).map(b=>T(b.id,b.X,b.Z))],A=new Map(wm(this.rig,w,_,{limits:this.opts.limits.x}).map(b=>[b.id,b.X]));return E.map(b=>{let R=this.cards.get(b.id),P=A.get(b.id)??b.X,k=this.grow(b.Z);return this.clearOfCover({...b,X:P,Z:this.unhidden(P,b.Z,R.w*k,R.h*k)},R,M)}).map(b=>({id:b.id,at:this.rig.fractionOf(b.X,b.Z).map(R=>Math.round(R*1e4)/1e4),yaw:c?180:b.yaw,lean:c?0:b.lean,pitch:c?0:b.pitch,gait:a,still:!0,packed:p}))}#f(t,e,{party:i,gait:s}){let r=this.rig.fractionOf(e.X,e.Z),o=ir(this.zones.filter(p=>p.kind==="area"),r[0],r[1])[0]??ir(this.zones,r[0],r[1])[0]??null,a=t.filter(p=>i||!p.pc);if(!o)return this.formationMoves("line",{ids:a.map(p=>p.id),focus:r,party:!0,gait:s});let l=Math.max(...a.map(p=>p.w),120),c=new Set(a.map(p=>p.id)),h=[...this.cards.values()].filter(p=>!c.has(p.id)&&p.holder===null).map(p=>({X:p.walk?p.walk.to.X:p.puppet.restX,Z:p.walk?p.walk.to.Z:p.restZ})),u=this.cover(),d=a[0]?this.cards.get(a[0].id):null,f=Vu(o,this.rig,{w:l*1.05,most:40}).filter(p=>!h.some(m=>Math.abs(m.X-p.X)<l*.6&&Math.abs(m.Z-p.Z)<90)).filter(p=>!d||this.coveredAt(p.X,p.Z,d,u)<=.15),x=[...a].sort((p,m)=>Math.hypot(p.X-e.X,p.Z-e.Z)-Math.hypot(m.X-e.X,m.Z-e.Z)),g=[];for(let p of x){if(!f.length)break;f.sort((M,E)=>Math.hypot(M.X-p.X,(M.Z-p.Z)*.8)-Math.hypot(E.X-p.X,(E.Z-p.Z)*.8));let m=f.shift();g.push({id:p.id,at:this.rig.fractionOf(m.X,m.Z).map(M=>Math.round(M*1e4)/1e4),yaw:0,lean:0,pitch:0,gait:s,still:!0,packed:!1})}return g}cover(){try{return this.coverFn?.()??[]}catch{return[]}}cardShapes(){let t=[];for(let e of this.cards.values()){let i=e.puppet.x,s=e.Z,r=this.grow(s),o=e.w*r,a=e.h*r,l=ol(this.rig,{X:i,Z:s,w:o,h:a,lift:this.riserFor(i,s,o,a)});[l.x0,l.y0,l.x1,l.y1].every(Number.isFinite)&&t.push({rect:[l.x0,l.y0,l.x1,l.y1]})}return t}coveredAt(t,e,i,s=this.cover()){if(!s.length)return 0;let r=this.grow(e),o=i.w*r,a=i.h*r;return Sm(ol(this.rig,{X:t,Z:e,w:o,h:a,lift:this.riserFor(t,e,o,a)}),s)}clearOfCover(t,e,i=this.cover()){if(!i.length||this.coveredAt(t.X,t.Z,e,i)<=.15)return t;let s=this.rig.fractionOf(t.X,t.Z);for(let r=.0025;r<=.2;r+=.0025){let o=this.rig.place([s[0],s[1]-r]);if(o&&this.coveredAt(o.X,o.Z,e,i)<=.15-.01)return{...t,X:o.X,Z:o.Z}}return t}standing(){return[...this.cards.values()].filter(t=>t.holder===null).map(t=>({id:t.id,X:t.walk?t.walk.to.X:t.puppet.restX,Z:t.walk?t.walk.to.Z:t.restZ,w:t.w,pc:t.person.pc===!0}))}exportPlaces(){return[...this.cards.keys()].map(t=>this.placeOf(t))}},Dv=60,zm=(n,t)=>Number.isFinite(n)&&Number.isFinite(t)&&n>t+Dv;function Nv(n,t){let e=Math.max(0,Math.min(1,(t-n.t0)/n.dur));if(e<=0)return .02;let i=1.9,s=i+1;return Math.max(.02,1+s*(e-1)**3+i*(e-1)**2)}var xl=class{constructor({limit:t=600,report:e=()=>{},onFatal:i=()=>{}}={}){this.limit=t,this.report=e,this.onFatal=i,this.failures=0,this.total=0}run(t){try{return t(),this.failures=0,!0}catch(e){return this.failures++,this.total++,(this.failures<=3||this.failures%300===0)&&this.report(e,this.failures),this.failures>=this.limit?(this.onFatal(e),!1):!0}}};var No=Object.freeze({every:33,heartbeat:1e3,delay:100,silent:2e3}),Oo=n=>Math.round(n),Vn=n=>Math.round(n*10)/10,yl=class{constructor({stage:t,scene:e,me:i,now:s,clock:r=s,send:o,mayHold:a=()=>!0,onLost:l=()=>{},onDrop:c=()=>{}}){Object.assign(this,{stage:t,scene:e,me:i,now:s,clock:r,mayHold:a,onLost:l,onDrop:c}),this.wire=o,this.mine=new Map,this.remote=new Map,this.sent=0}send(t){this.sent++,this.wire({scene:this.scene,...t})}holderOf(t){return this.mine.has(t)?this.me:this.remote.get(t)?.by??null}grab(t){let e=this.stage.cards.get(t);if(!e||!this.mayHold(t,this.me)||!this.stage.hold(t,this.me))return!1;let i=this.now();return this.mine.set(t,{stamp:{t:Oo(i),user:this.me},last:{t:i,x:e.hand.x,y:e.hand.z}}),this.send({type:"grab",id:t,t:Oo(i),x:Vn(e.hand.x),z:Vn(e.hand.z)}),!0}move(t,e,i){let s=this.mine.get(t);if(!s)return;this.stage.setHand(t,{x:e,z:i});let r=this.stage.cards.get(t).hand;this.#t(t,s,r,this.now())}#t(t,e,i,s){return am(e.last,i.x,i.z,s,No.every)?(e.last={t:s,x:i.x,y:i.z},e.moving=!0,this.send({type:"move",id:t,t:Oo(s),x:Vn(i.x),z:Vn(i.z)}),!0):!1}verb(t,e){this.mine.has(t)&&(this.stage.perform(t,e),this.send({type:"verb",id:t,verb:e}))}release(t){if(!this.mine.has(t))return null;this.mine.delete(t);let e=this.stage.landingFor(t);if(!e)return null;let i={X:Vn(e.X),Z:Vn(e.Z),mark:e.mark},s=this.stage.release(t,i);return s&&(this.send({type:"release",id:t,t:Oo(this.now()),X:i.X,Z:i.Z,mark:i.mark}),this.onDrop(s)),s}receive(t,e){!t||t.scene!==this.scene||e===this.me||this.stage.cards.has(t.id)&&(t.type==="grab"?this.#i(t,e):t.type==="move"?this.#e(t,e):t.type==="verb"?this.remote.get(t.id)?.by===e&&this.stage.perform(t.id,t.verb):t.type==="release"&&this.#s(t,e))}#i(t,e){if(!this.mayHold(t.id,e))return;let i={t:t.t,user:e},s=this.mine.get(t.id),r=this.remote.get(t.id),o=s?.stamp??r?.stamp??null;o&&r?.by!==e&&lm(o,i)===o||(s&&(this.mine.delete(t.id),this.onLost(t.id)),this.#n(t,e,i))}#e(t,e){let i=this.remote.get(t.id);if(!i){if(this.mine.has(t.id)||!this.mayHold(t.id,e))return;this.#n(t,e,{t:t.t,user:e});return}i.by===e&&(i.buffer.push({t:t.t,x:t.x,y:t.z}),i.heard=this.clock())}#n(t,e,i){this.stage.hold(t.id,e)||this.stage.handOver(t.id,e);let s=new tl({delay:No.delay});s.push({t:t.t,x:t.x,y:t.z}),this.remote.set(t.id,{by:e,stamp:i,buffer:s,heard:this.clock()})}#s(t,e){let i=this.remote.get(t.id);if(!i||i.by!==e)return;this.remote.delete(t.id);let s=this.stage.release(t.id,{X:t.X,Z:t.Z,mark:t.mark??null});s&&this.onDrop(s)}forget(t){this.mine.delete(t),this.remote.delete(t)}userGone(t){for(let[e,i]of[...this.remote])i.by===t&&this.#r(e)}#r(t){this.remote.delete(t);let e=this.stage.release(t);e&&this.onDrop(e)}tick(){let t=this.now(),e=this.clock();for(let[i,s]of[...this.remote]){if(e-s.heard>No.silent){this.#r(i);continue}let r=s.buffer.at(t);r&&this.stage.setHand(i,{x:r.x,z:r.y})}for(let[i,s]of this.mine){let r=this.stage.cards.get(i)?.hand;if(!r||this.#t(i,s,r,t))continue;let o=t-s.last.t;(s.moving&&o>=No.every||o>=No.heartbeat)&&(s.moving=!1,s.last={t,x:r.x,y:r.z},this.send({type:"move",id:i,t:Oo(t),x:Vn(r.x),z:Vn(r.z)}))}}close(){for(let t of[...this.mine.keys()])this.release(t);this.remote.clear()}};function Hm(n,t,e){let i=new Map(t.filter(r=>r&&typeof r.id=="string").map(r=>[r.id,r])),s=Math.round(e*1e3)/1e3;return n.map(r=>{let o=i.get(r.id);if(!o)return r;let a={...r};if(delete a.X,delete a.Z,delete a.enter,o.mark)a.mark=o.mark,delete a.at;else if(Array.isArray(o.at))a.at=[o.at[0],o.at[1]],delete a.mark;else return r;for(let l of["yaw","lean","pitch"])Number.isFinite(o[l])?a[l]=Math.round(o[l]*10)/10:l!=="yaw"&&delete a[l];return typeof o.still=="boolean"&&(a.still=o.still),typeof o.packed=="boolean"&&(a.packed=o.packed),a.move={t0:s,gait:o.gait??"walk"},a})}function Gm(n,{gait:t="walk"}={}){let e=[];for(let i of n)!Array.isArray(i.home)||Array.isArray(i.at)&&Math.abs(i.at[0]-i.home[0])<1e-4&&Math.abs(i.at[1]-i.home[1])<1e-4&&!i.mark&&!i.still&&!i.packed||e.push({id:i.id,at:[i.home[0],i.home[1]],yaw:i.homeYaw??0,lean:0,pitch:0,gait:t,still:!1,packed:!1});return e}function Vm(n,t){return n.map(e=>{if(e.id!==t.id)return e;let i={...e,at:t.at,yaw:t.yaw};return delete i.X,delete i.Z,delete i.enter,delete i.packed,i.life&&(i.still=!0),t.mark?i.mark=t.mark:delete i.mark,i})}function Wm(n,t,e=null){let i=new Map(t.filter(Boolean).map(s=>[s.id,s]));return n.map(s=>{let r=i.get(s.id);if(!r||e&&!e.includes(s.id)||!Array.isArray(r.at))return s;let o=Number.isFinite(r.yaw)?r.yaw:0;return Array.isArray(s.home)&&Math.abs(s.home[0]-r.at[0])<1e-4&&Math.abs(s.home[1]-r.at[1])<1e-4&&(s.homeYaw??0)===o?s:{...s,home:[r.at[0],r.at[1]],homeYaw:o}})}var yg=0,Od=1,vg=2;var ks=1,_g=2,zr=3,is=0,di=1,yi=2,Di=0,ns=1,Ai=2,Fd=3,Ud=4,Mg=5;var Ls=100,bg=101,Sg=102,wg=103,Tg=104,Eg=200,Ag=201,Cg=202,Rg=203,Bd=204,zd=205,Pg=206,Ig=207,kg=208,Lg=209,Dg=210,Ng=211,Og=212,Fg=213,Ug=214,Xl=0,$l=1,Zl=2,Er=3,ql=4,Yl=5,jl=6,Kl=7,Hd=0,Bg=1,zg=2,Ci=0,Gd=1,Vd=2,Wd=3,Xd=4,$d=5,Zd=6,qd=7;var Yd=300,ss=301,Ds=302,Hr=303,bc=304,pa=306,Jl=1e3,on=1001,Ql=1002,je=1003,Hg=1004;var ma=1005;var Be=1006,Sc=1007;var dn=1008;var vi=1009,jd=1010,Kd=1011,Gr=1012,wc=1013,qi=1014,Yi=1015,We=1016,Tc=1017,Ec=1018,Vr=1020,Jd=35902,Qd=35899,tf=1021,ef=1022,_i=1023,an=1026,rs=1027,nf=1028,Ac=1029,os=1030,Cc=1031;var Rc=1033,ga=33776,xa=33777,ya=33778,va=33779,Pc=35840,Ic=35841,kc=35842,Lc=35843,Dc=36196,Nc=37492,Oc=37496,Fc=37488,Uc=37489,_a=37490,Bc=37491,zc=37808,Hc=37809,Gc=37810,Vc=37811,Wc=37812,Xc=37813,$c=37814,Zc=37815,qc=37816,Yc=37817,jc=37818,Kc=37819,Jc=37820,Qc=37821,th=36492,eh=36494,ih=36495,nh=36283,sh=36284,Ma=36285,rh=36286;var Wo=2300,tc=2301,Vl=2302,Ed=2303,Ad=2400,Cd=2401,Rd=2402;var Gg=3200;var oh=0,Vg=1,kn="",Ae="srgb",Xo="srgb-linear",$o="linear",ne="srgb";var Wl=7680;var Wg=519,Xg=512,$g=513,Zg=514,ah=515,qg=516,Yg=517,lh=518,jg=519,sf=35044;var rf="300 es",Xi=2e3,Ar=2001;function Ov(n){for(let t=n.length-1;t>=0;--t)if(n[t]>=65535)return!0;return!1}function Fv(n){return ArrayBuffer.isView(n)&&!(n instanceof DataView)}function Zo(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function Kg(){let n=Zo("canvas");return n.style.display="block",n}var Xm={},Cr=null;function qo(...n){let t="THREE."+n.shift();Cr?Cr("log",t,...n):console.log(t,...n)}function Jg(n){let t=n[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=n[1];e&&e.isStackTrace?n[0]+=" "+e.getLocation():n[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return n}function Ot(...n){n=Jg(n);let t="THREE."+n.shift();if(Cr)Cr("warn",t,...n);else{let e=n[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...n)}}function Nt(...n){n=Jg(n);let t="THREE."+n.shift();if(Cr)Cr("error",t,...n);else{let e=n[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...n)}}function Cs(...n){let t=n.join(" ");t in Xm||(Xm[t]=!0,Ot(...n))}function Qg(n,t,e){return new Promise(function(i,s){function r(){switch(n.clientWaitSync(t,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:i()}}setTimeout(r,e)})}var t0={[Xl]:$l,[Zl]:jl,[ql]:Kl,[Er]:Yl,[$l]:Xl,[jl]:Zl,[Kl]:ql,[Yl]:Er},ln=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(e)===-1&&i[t].push(e)}hasEventListener(t,e){let i=this._listeners;return i===void 0?!1:i[t]!==void 0&&i[t].indexOf(e)!==-1}removeEventListener(t,e){let i=this._listeners;if(i===void 0)return;let s=i[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let i=e[t.type];if(i!==void 0){t.target=this;let s=i.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}},ri=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];var id=Math.PI/180,Yo=180/Math.PI;function Yn(){let n=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(ri[n&255]+ri[n>>8&255]+ri[n>>16&255]+ri[n>>24&255]+"-"+ri[t&255]+ri[t>>8&255]+"-"+ri[t>>16&15|64]+ri[t>>24&255]+"-"+ri[e&63|128]+ri[e>>8&255]+"-"+ri[e>>16&255]+ri[e>>24&255]+ri[i&255]+ri[i>>8&255]+ri[i>>16&255]+ri[i>>24&255]).toLowerCase()}function jt(n,t,e){return Math.max(t,Math.min(e,n))}function Uv(n,t){return(n%t+t)%t}function nd(n,t,e){return(1-e)*n+e*t}function rn(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:case Uint8ClampedArray:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function le(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var bt=class n{static{n.prototype.isVector2=!0}constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,i=this.y,s=t.elements;return this.x=s[0]*e+s[3]*i+s[6],this.y=s[1]*e+s[4]*i+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=jt(this.x,t.x,e.x),this.y=jt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=jt(this.x,t,e),this.y=jt(this.y,t,e),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(jt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let i=this.dot(t)/e;return Math.acos(jt(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,i=this.y-t.y;return e*e+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let i=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*i-o*s+t.x,this.y=r*s+o*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},cn=class{constructor(t=0,e=0,i=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=i,this._w=s}static slerpFlat(t,e,i,s,r,o,a){let l=i[s+0],c=i[s+1],h=i[s+2],u=i[s+3],d=r[o+0],f=r[o+1],x=r[o+2],g=r[o+3];if(u!==g||l!==d||c!==f||h!==x){let p=l*d+c*f+h*x+u*g;p<0&&(d=-d,f=-f,x=-x,g=-g,p=-p);let m=1-a;if(p<.9995){let M=Math.acos(p),E=Math.sin(M);m=Math.sin(m*M)/E,a=Math.sin(a*M)/E,l=l*m+d*a,c=c*m+f*a,h=h*m+x*a,u=u*m+g*a}else{l=l*m+d*a,c=c*m+f*a,h=h*m+x*a,u=u*m+g*a;let M=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=M,c*=M,h*=M,u*=M}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=u}static multiplyQuaternionsFlat(t,e,i,s,r,o){let a=i[s],l=i[s+1],c=i[s+2],h=i[s+3],u=r[o],d=r[o+1],f=r[o+2],x=r[o+3];return t[e]=a*x+h*u+l*f-c*d,t[e+1]=l*x+h*d+c*u-a*f,t[e+2]=c*x+h*f+a*d-l*u,t[e+3]=h*x-a*u-l*d-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,i,s){return this._x=t,this._y=e,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let i=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(i/2),h=a(s/2),u=a(r/2),d=l(i/2),f=l(s/2),x=l(r/2);switch(o){case"XYZ":this._x=d*h*u+c*f*x,this._y=c*f*u-d*h*x,this._z=c*h*x+d*f*u,this._w=c*h*u-d*f*x;break;case"YXZ":this._x=d*h*u+c*f*x,this._y=c*f*u-d*h*x,this._z=c*h*x-d*f*u,this._w=c*h*u+d*f*x;break;case"ZXY":this._x=d*h*u-c*f*x,this._y=c*f*u+d*h*x,this._z=c*h*x+d*f*u,this._w=c*h*u-d*f*x;break;case"ZYX":this._x=d*h*u-c*f*x,this._y=c*f*u+d*h*x,this._z=c*h*x-d*f*u,this._w=c*h*u+d*f*x;break;case"YZX":this._x=d*h*u+c*f*x,this._y=c*f*u+d*h*x,this._z=c*h*x-d*f*u,this._w=c*h*u-d*f*x;break;case"XZY":this._x=d*h*u-c*f*x,this._y=c*f*u-d*h*x,this._z=c*h*x+d*f*u,this._w=c*h*u+d*f*x;break;default:Ot("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let i=e/2,s=Math.sin(i);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,i=e[0],s=e[4],r=e[8],o=e[1],a=e[5],l=e[9],c=e[2],h=e[6],u=e[10],d=i+a+u;if(d>0){let f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(o-s)*f}else if(i>a&&i>u){let f=2*Math.sqrt(1+i-a-u);this._w=(h-l)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+c)/f}else if(a>u){let f=2*Math.sqrt(1+a-i-u);this._w=(r-c)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(l+h)/f}else{let f=2*Math.sqrt(1+u-i-a);this._w=(o-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let i=t.dot(e)+1;return i<1e-8?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(jt(this.dot(t),-1,1)))}rotateTowards(t,e){let i=this.angleTo(t);if(i===0)return this;let s=Math.min(1,e/i);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let i=t._x,s=t._y,r=t._z,o=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=i*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-i*c,this._z=r*h+o*c+i*l-s*a,this._w=o*h-i*a-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let i=t._x,s=t._y,r=t._z,o=t._w,a=this.dot(t);a<0&&(i=-i,s=-s,r=-r,o=-o,a=-a);let l=1-e;if(a<.9995){let c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+i*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this._onChangeCallback()}else this._x=this._x*l+i*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this.normalize();return this}slerpQuaternions(t,e,i){return this.copy(t).slerp(e,i)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},D=class n{static{n.prototype.isVector3=!0}constructor(t=0,e=0,i=0){this.x=t,this.y=e,this.z=i}set(t,e,i){return i===void 0&&(i=this.z),this.x=t,this.y=e,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion($m.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion($m.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,i=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*i+r[6]*s,this.y=r[1]*e+r[4]*i+r[7]*s,this.z=r[2]*e+r[5]*i+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,i=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*i+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*i+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*i+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*i+r[10]*s+r[14])*o,this}applyQuaternion(t){let e=this.x,i=this.y,s=this.z,r=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*s-a*i),h=2*(a*e-r*s),u=2*(r*i-o*e);return this.x=e+l*c+o*u-a*h,this.y=i+l*h+a*c-r*u,this.z=s+l*u+r*h-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,i=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*i+r[8]*s,this.y=r[1]*e+r[5]*i+r[9]*s,this.z=r[2]*e+r[6]*i+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=jt(this.x,t.x,e.x),this.y=jt(this.y,t.y,e.y),this.z=jt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=jt(this.x,t,e),this.y=jt(this.y,t,e),this.z=jt(this.z,t,e),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(jt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let i=t.x,s=t.y,r=t.z,o=e.x,a=e.y,l=e.z;return this.x=s*l-r*a,this.y=r*o-i*l,this.z=i*a-s*o,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let i=t.dot(this)/e;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return sd.copy(this).projectOnVector(t),this.sub(sd)}reflect(t){return this.sub(sd.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let i=this.dot(t)/e;return Math.acos(jt(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,i=this.y-t.y,s=this.z-t.z;return e*e+i*i+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,i){let s=Math.sin(e)*t;return this.x=s*Math.sin(i),this.y=Math.cos(e)*t,this.z=s*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,i){return this.x=t*Math.sin(e),this.y=i,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=i,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,i=Math.sqrt(1-e*e);return this.x=i*Math.cos(t),this.y=e,this.z=i*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},sd=new D,$m=new cn,Ht=class n{static{n.prototype.isMatrix3=!0}constructor(t,e,i,s,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,i,s,r,o,a,l,c)}set(t,e,i,s,r,o,a,l,c){let h=this.elements;return h[0]=t,h[1]=s,h[2]=a,h[3]=e,h[4]=r,h[5]=l,h[6]=i,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],this}extractBasis(t,e,i){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let i=t.elements,s=e.elements,r=this.elements,o=i[0],a=i[3],l=i[6],c=i[1],h=i[4],u=i[7],d=i[2],f=i[5],x=i[8],g=s[0],p=s[3],m=s[6],M=s[1],E=s[4],_=s[7],T=s[2],w=s[5],A=s[8];return r[0]=o*g+a*M+l*T,r[3]=o*p+a*E+l*w,r[6]=o*m+a*_+l*A,r[1]=c*g+h*M+u*T,r[4]=c*p+h*E+u*w,r[7]=c*m+h*_+u*A,r[2]=d*g+f*M+x*T,r[5]=d*p+f*E+x*w,r[8]=d*m+f*_+x*A,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*o*h-e*a*c-i*r*h+i*a*l+s*r*c-s*o*l}invert(){let t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=h*o-a*c,d=a*l-h*r,f=c*r-o*l,x=e*u+i*d+s*f;if(x===0)return this.set(0,0,0,0,0,0,0,0,0);let g=1/x;return t[0]=u*g,t[1]=(s*c-h*i)*g,t[2]=(a*i-s*o)*g,t[3]=d*g,t[4]=(h*e-s*l)*g,t[5]=(s*r-a*e)*g,t[6]=f*g,t[7]=(i*l-c*e)*g,t[8]=(o*e-i*r)*g,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,i,s,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(i*l,i*c,-i*(l*o+c*a)+o+t,-s*c,s*l,-s*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return Cs("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(rd.makeScale(t,e)),this}rotate(t){return Cs("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(rd.makeRotation(-t)),this}translate(t,e){return Cs("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(rd.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,i,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,i=t.elements;for(let s=0;s<9;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<9;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){let i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}},rd=new Ht,Zm=new Ht().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),qm=new Ht().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Bv(){let n={enabled:!0,workingColorSpace:Xo,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===ne&&(s.r=Pn(s.r),s.g=Pn(s.g),s.b=Pn(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===ne&&(s.r=Tr(s.r),s.g=Tr(s.g),s.b=Tr(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===kn?$o:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Cs("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Cs("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[Xo]:{primaries:t,whitePoint:i,transfer:$o,toXYZ:Zm,fromXYZ:qm,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:Ae},outputColorSpaceConfig:{drawingBufferColorSpace:Ae}},[Ae]:{primaries:t,whitePoint:i,transfer:ne,toXYZ:Zm,fromXYZ:qm,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:Ae}}}),n}var Yt=Bv();function Pn(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function Tr(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}var lr,ec=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let i;if(t instanceof HTMLCanvasElement)i=t;else{lr===void 0&&(lr=Zo("canvas")),lr.width=t.width,lr.height=t.height;let s=lr.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),i=lr}return i.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=Zo("canvas");e.width=t.width,e.height=t.height;let i=e.getContext("2d");i.drawImage(t,0,0,t.width,t.height);let s=i.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Pn(r[o]/255)*255;return i.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let i=0;i<e.length;i++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[i]=Math.floor(Pn(e[i]/255)*255):e[i]=Pn(e[i]);return{data:e,width:t.width,height:t.height}}else return Ot("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},zv=0,Rr=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:zv++}),this.uuid=Yn(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(od(s[o].image)):r.push(od(s[o]))}else r=od(s);i.url=r}return e||(t.images[this.uuid]=i),i}};function od(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?ec.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(Ot("Texture: Unable to serialize Texture."),{})}var Hv=0,ad=new D,Ve=class n extends ln{constructor(t=n.DEFAULT_IMAGE,e=n.DEFAULT_MAPPING,i=on,s=on,r=Be,o=dn,a=_i,l=vi,c=n.DEFAULT_ANISOTROPY,h=kn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Hv++}),this.uuid=Yn(),this.name="",this.source=new Rr(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new bt(0,0),this.repeat=new bt(1,1),this.center=new bt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ht,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(ad).x}get height(){return this.source.getSize(ad).y}get depth(){return this.source.getSize(ad).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let i=t[e];if(i===void 0){Ot(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Ot(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&i&&s.isVector2&&i.isVector2||s&&i&&s.isVector3&&i.isVector3||s&&i&&s.isMatrix3&&i.isMatrix3?s.copy(i):this[e]=i}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),e||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Yd)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Jl:t.x=t.x-Math.floor(t.x);break;case on:t.x=t.x<0?0:1;break;case Ql:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Jl:t.y=t.y-Math.floor(t.y);break;case on:t.y=t.y<0?0:1;break;case Ql:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};Ve.DEFAULT_IMAGE=null;Ve.DEFAULT_MAPPING=Yd;Ve.DEFAULT_ANISOTROPY=1;var _e=class n{static{n.prototype.isVector4=!0}constructor(t=0,e=0,i=0,s=1){this.x=t,this.y=e,this.z=i,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,i,s){return this.x=t,this.y=e,this.z=i,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,i=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*i+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*i+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*i+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*i+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,i,s,r,l=t.elements,c=l[0],h=l[4],u=l[8],d=l[1],f=l[5],x=l[9],g=l[2],p=l[6],m=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-g)<.01&&Math.abs(x-p)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+g)<.1&&Math.abs(x+p)<.1&&Math.abs(c+f+m-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let E=(c+1)/2,_=(f+1)/2,T=(m+1)/2,w=(h+d)/4,A=(u+g)/4,v=(x+p)/4;return E>_&&E>T?E<.01?(i=0,s=.707106781,r=.707106781):(i=Math.sqrt(E),s=w/i,r=A/i):_>T?_<.01?(i=.707106781,s=0,r=.707106781):(s=Math.sqrt(_),i=w/s,r=v/s):T<.01?(i=.707106781,s=.707106781,r=0):(r=Math.sqrt(T),i=A/r,s=v/r),this.set(i,s,r,e),this}let M=Math.sqrt((p-x)*(p-x)+(u-g)*(u-g)+(d-h)*(d-h));return Math.abs(M)<.001&&(M=1),this.x=(p-x)/M,this.y=(u-g)/M,this.z=(d-h)/M,this.w=Math.acos((c+f+m-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=jt(this.x,t.x,e.x),this.y=jt(this.y,t.y,e.y),this.z=jt(this.z,t.z,e.z),this.w=jt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=jt(this.x,t,e),this.y=jt(this.y,t,e),this.z=jt(this.z,t,e),this.w=jt(this.w,t,e),this}clampLength(t,e){let i=this.length();return this.divideScalar(i||1).multiplyScalar(jt(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this.w=t.w+(e.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},ic=class extends ln{constructor(t=1,e=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Be,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},i),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=i.depth,this.scissor=new _e(0,0,t,e),this.scissorTest=!1,this.viewport=new _e(0,0,t,e),this.textures=[];let s={width:t,height:e,depth:i.depth},r=new Ve(s),o=i.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveColorBuffer=i.resolveColorBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.storeMultisampledColorBuffer=i.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=i.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=i.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview,this.useArrayDepthTexture=i.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:Be,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,i=1){if(this.width!==t||this.height!==e||this.depth!==i){this.width=t,this.height=e,this.depth=i;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=i,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,i=t.textures.length;e<i;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new Rr(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Ce=class extends ic{constructor(t=1,e=1,i={}){super(t,e,i),this.isWebGLRenderTarget=!0}},jo=class extends Ve{constructor(t=null,e=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=je,this.minFilter=je,this.wrapR=on,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var nc=class extends Ve{constructor(t=null,e=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=je,this.minFilter=je,this.wrapR=on,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var fe=class n{static{n.prototype.isMatrix4=!0}constructor(t,e,i,s,r,o,a,l,c,h,u,d,f,x,g,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,i,s,r,o,a,l,c,h,u,d,f,x,g,p)}set(t,e,i,s,r,o,a,l,c,h,u,d,f,x,g,p){let m=this.elements;return m[0]=t,m[4]=e,m[8]=i,m[12]=s,m[1]=r,m[5]=o,m[9]=a,m[13]=l,m[2]=c,m[6]=h,m[10]=u,m[14]=d,m[3]=f,m[7]=x,m[11]=g,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new n().fromArray(this.elements)}copy(t){let e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],e[9]=i[9],e[10]=i[10],e[11]=i[11],e[12]=i[12],e[13]=i[13],e[14]=i[14],e[15]=i[15],this}copyPosition(t){let e=this.elements,i=t.elements;return e[12]=i[12],e[13]=i[13],e[14]=i[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,i){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),i.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(t,e,i){return this.set(t.x,e.x,i.x,0,t.y,e.y,i.y,0,t.z,e.z,i.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,i=t.elements,s=1/cr.setFromMatrixColumn(t,0).length(),r=1/cr.setFromMatrixColumn(t,1).length(),o=1/cr.setFromMatrixColumn(t,2).length();return e[0]=i[0]*s,e[1]=i[1]*s,e[2]=i[2]*s,e[3]=0,e[4]=i[4]*r,e[5]=i[5]*r,e[6]=i[6]*r,e[7]=0,e[8]=i[8]*o,e[9]=i[9]*o,e[10]=i[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,i=t.x,s=t.y,r=t.z,o=Math.cos(i),a=Math.sin(i),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(t.order==="XYZ"){let d=o*h,f=o*u,x=a*h,g=a*u;e[0]=l*h,e[4]=-l*u,e[8]=c,e[1]=f+x*c,e[5]=d-g*c,e[9]=-a*l,e[2]=g-d*c,e[6]=x+f*c,e[10]=o*l}else if(t.order==="YXZ"){let d=l*h,f=l*u,x=c*h,g=c*u;e[0]=d+g*a,e[4]=x*a-f,e[8]=o*c,e[1]=o*u,e[5]=o*h,e[9]=-a,e[2]=f*a-x,e[6]=g+d*a,e[10]=o*l}else if(t.order==="ZXY"){let d=l*h,f=l*u,x=c*h,g=c*u;e[0]=d-g*a,e[4]=-o*u,e[8]=x+f*a,e[1]=f+x*a,e[5]=o*h,e[9]=g-d*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){let d=o*h,f=o*u,x=a*h,g=a*u;e[0]=l*h,e[4]=x*c-f,e[8]=d*c+g,e[1]=l*u,e[5]=g*c+d,e[9]=f*c-x,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){let d=o*l,f=o*c,x=a*l,g=a*c;e[0]=l*h,e[4]=g-d*u,e[8]=x*u+f,e[1]=u,e[5]=o*h,e[9]=-a*h,e[2]=-c*h,e[6]=f*u+x,e[10]=d-g*u}else if(t.order==="XZY"){let d=o*l,f=o*c,x=a*l,g=a*c;e[0]=l*h,e[4]=-u,e[8]=c*h,e[1]=d*u+g,e[5]=o*h,e[9]=f*u-x,e[2]=x*u-f,e[6]=a*h,e[10]=g*u+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Gv,t,Vv)}lookAt(t,e,i){let s=this.elements;return wi.subVectors(t,e),wi.lengthSq()===0&&(wi.z=1),wi.normalize(),Wn.crossVectors(i,wi),Wn.lengthSq()===0&&(Math.abs(i.z)===1?wi.x+=1e-4:wi.z+=1e-4,wi.normalize(),Wn.crossVectors(i,wi)),Wn.normalize(),vl.crossVectors(wi,Wn),s[0]=Wn.x,s[4]=vl.x,s[8]=wi.x,s[1]=Wn.y,s[5]=vl.y,s[9]=wi.y,s[2]=Wn.z,s[6]=vl.z,s[10]=wi.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let i=t.elements,s=e.elements,r=this.elements,o=i[0],a=i[4],l=i[8],c=i[12],h=i[1],u=i[5],d=i[9],f=i[13],x=i[2],g=i[6],p=i[10],m=i[14],M=i[3],E=i[7],_=i[11],T=i[15],w=s[0],A=s[4],v=s[8],b=s[12],R=s[1],P=s[5],k=s[9],B=s[13],I=s[2],U=s[6],V=s[10],Z=s[14],it=s[3],$=s[7],J=s[11],et=s[15];return r[0]=o*w+a*R+l*I+c*it,r[4]=o*A+a*P+l*U+c*$,r[8]=o*v+a*k+l*V+c*J,r[12]=o*b+a*B+l*Z+c*et,r[1]=h*w+u*R+d*I+f*it,r[5]=h*A+u*P+d*U+f*$,r[9]=h*v+u*k+d*V+f*J,r[13]=h*b+u*B+d*Z+f*et,r[2]=x*w+g*R+p*I+m*it,r[6]=x*A+g*P+p*U+m*$,r[10]=x*v+g*k+p*V+m*J,r[14]=x*b+g*B+p*Z+m*et,r[3]=M*w+E*R+_*I+T*it,r[7]=M*A+E*P+_*U+T*$,r[11]=M*v+E*k+_*V+T*J,r[15]=M*b+E*B+_*Z+T*et,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],i=t[4],s=t[8],r=t[12],o=t[1],a=t[5],l=t[9],c=t[13],h=t[2],u=t[6],d=t[10],f=t[14],x=t[3],g=t[7],p=t[11],m=t[15],M=l*f-c*d,E=a*f-c*u,_=a*d-l*u,T=o*f-c*h,w=o*d-l*h,A=o*u-a*h;return e*(g*M-p*E+m*_)-i*(x*M-p*T+m*w)+s*(x*E-g*T+m*A)-r*(x*_-g*w+p*A)}determinantAffine(){let t=this.elements,e=t[0],i=t[4],s=t[8],r=t[1],o=t[5],a=t[9],l=t[2],c=t[6],h=t[10];return e*(o*h-a*c)-i*(r*h-a*l)+s*(r*c-o*l)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,i){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=i),this}invert(){let t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=t[9],d=t[10],f=t[11],x=t[12],g=t[13],p=t[14],m=t[15],M=e*a-i*o,E=e*l-s*o,_=e*c-r*o,T=i*l-s*a,w=i*c-r*a,A=s*c-r*l,v=h*g-u*x,b=h*p-d*x,R=h*m-f*x,P=u*p-d*g,k=u*m-f*g,B=d*m-f*p,I=M*B-E*k+_*P+T*R-w*b+A*v;if(I===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let U=1/I;return t[0]=(a*B-l*k+c*P)*U,t[1]=(s*k-i*B-r*P)*U,t[2]=(g*A-p*w+m*T)*U,t[3]=(d*w-u*A-f*T)*U,t[4]=(l*R-o*B-c*b)*U,t[5]=(e*B-s*R+r*b)*U,t[6]=(p*_-x*A-m*E)*U,t[7]=(h*A-d*_+f*E)*U,t[8]=(o*k-a*R+c*v)*U,t[9]=(i*R-e*k-r*v)*U,t[10]=(x*w-g*_+m*M)*U,t[11]=(u*_-h*w-f*M)*U,t[12]=(a*b-o*P-l*v)*U,t[13]=(e*P-i*b+s*v)*U,t[14]=(g*E-x*T-p*M)*U,t[15]=(h*T-u*E+d*M)*U,this}scale(t){let e=this.elements,i=t.x,s=t.y,r=t.z;return e[0]*=i,e[4]*=s,e[8]*=r,e[1]*=i,e[5]*=s,e[9]*=r,e[2]*=i,e[6]*=s,e[10]*=r,e[3]*=i,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,i,s))}makeTranslation(t,e,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,i,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,e,-i,0,0,i,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,0,i,0,0,1,0,0,-i,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,0,i,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let i=Math.cos(e),s=Math.sin(e),r=1-i,o=t.x,a=t.y,l=t.z,c=r*o,h=r*a;return this.set(c*o+i,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+i,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+i,0,0,0,0,1),this}makeScale(t,e,i){return this.set(t,0,0,0,0,e,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,e,i,s,r,o){return this.set(1,i,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,i){let s=this.elements,r=e._x,o=e._y,a=e._z,l=e._w,c=r+r,h=o+o,u=a+a,d=r*c,f=r*h,x=r*u,g=o*h,p=o*u,m=a*u,M=l*c,E=l*h,_=l*u,T=i.x,w=i.y,A=i.z;return s[0]=(1-(g+m))*T,s[1]=(f+_)*T,s[2]=(x-E)*T,s[3]=0,s[4]=(f-_)*w,s[5]=(1-(d+m))*w,s[6]=(p+M)*w,s[7]=0,s[8]=(x+E)*A,s[9]=(p-M)*A,s[10]=(1-(d+g))*A,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,i){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return i.set(1,1,1),e.identity(),this;let o=cr.set(s[0],s[1],s[2]).length(),a=cr.set(s[4],s[5],s[6]).length(),l=cr.set(s[8],s[9],s[10]).length();r<0&&(o=-o),Gi.copy(this);let c=1/o,h=1/a,u=1/l;return Gi.elements[0]*=c,Gi.elements[1]*=c,Gi.elements[2]*=c,Gi.elements[4]*=h,Gi.elements[5]*=h,Gi.elements[6]*=h,Gi.elements[8]*=u,Gi.elements[9]*=u,Gi.elements[10]*=u,e.setFromRotationMatrix(Gi),i.x=o,i.y=a,i.z=l,this}makePerspective(t,e,i,s,r,o,a=Xi,l=!1){let c=this.elements,h=2*r/(e-t),u=2*r/(i-s),d=(e+t)/(e-t),f=(i+s)/(i-s),x,g;if(l)x=r/(o-r),g=o*r/(o-r);else if(a===Xi)x=-(o+r)/(o-r),g=-2*o*r/(o-r);else if(a===Ar)x=-o/(o-r),g=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=x,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,i,s,r,o,a=Xi,l=!1){let c=this.elements,h=2/(e-t),u=2/(i-s),d=-(e+t)/(e-t),f=-(i+s)/(i-s),x,g;if(l)x=1/(o-r),g=o/(o-r);else if(a===Xi)x=-2/(o-r),g=-(o+r)/(o-r);else if(a===Ar)x=-1/(o-r),g=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=x,c[14]=g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){let e=this.elements,i=t.elements;for(let s=0;s<16;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<16;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){let i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t[e+9]=i[9],t[e+10]=i[10],t[e+11]=i[11],t[e+12]=i[12],t[e+13]=i[13],t[e+14]=i[14],t[e+15]=i[15],t}},cr=new D,Gi=new fe,Gv=new D(0,0,0),Vv=new D(1,1,1),Wn=new D,vl=new D,wi=new D,Ym=new fe,jm=new cn,In=class n{constructor(t=0,e=0,i=0,s=n.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=i,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,i,s=this._order){return this._x=t,this._y=e,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,i=!0){let s=t.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],u=s[2],d=s[6],f=s[10];switch(e){case"XYZ":this._y=Math.asin(jt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-jt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(jt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-jt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(jt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-jt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Ot("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,i){return Ym.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Ym,e,i)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return jm.setFromEuler(this),this.setFromQuaternion(jm,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};In.DEFAULT_ORDER="XYZ";var Pr=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},Wv=0,Km=new D,hr=new cn,wn=new fe,_l=new D,Fo=new D,Xv=new D,$v=new cn,Jm=new D(1,0,0),Qm=new D(0,1,0),tg=new D(0,0,1),eg={type:"added"},Zv={type:"removed"},ur={type:"childadded",child:null},ld={type:"childremoved",child:null},ti=class n extends ln{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Wv++}),this.uuid=Yn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=n.DEFAULT_UP.clone();let t=new D,e=new In,i=new cn,s=new D(1,1,1);function r(){i.setFromEuler(e,!1)}function o(){e.setFromQuaternion(i,void 0,!1)}e._onChange(r),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new fe},normalMatrix:{value:new Ht}}),this.matrix=new fe,this.matrixWorld=new fe,this.matrixAutoUpdate=n.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=n.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Pr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return hr.setFromAxisAngle(t,e),this.quaternion.multiply(hr),this}rotateOnWorldAxis(t,e){return hr.setFromAxisAngle(t,e),this.quaternion.premultiply(hr),this}rotateX(t){return this.rotateOnAxis(Jm,t)}rotateY(t){return this.rotateOnAxis(Qm,t)}rotateZ(t){return this.rotateOnAxis(tg,t)}translateOnAxis(t,e){return Km.copy(t).applyQuaternion(this.quaternion),this.position.add(Km.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Jm,t)}translateY(t){return this.translateOnAxis(Qm,t)}translateZ(t){return this.translateOnAxis(tg,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(wn.copy(this.matrixWorld).invert())}lookAt(t,e,i){t.isVector3?_l.copy(t):_l.set(t,e,i);let s=this.parent;this.updateWorldMatrix(!0,!1),Fo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?wn.lookAt(Fo,_l,this.up):wn.lookAt(_l,Fo,this.up),this.quaternion.setFromRotationMatrix(wn),s&&(wn.extractRotation(s.matrixWorld),hr.setFromRotationMatrix(wn),this.quaternion.premultiply(hr.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(Nt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(eg),ur.child=t,this.dispatchEvent(ur),ur.child=null):Nt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Zv),ld.child=t,this.dispatchEvent(ld),ld.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),wn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),wn.multiply(t.parent.matrixWorld)),t.applyMatrix4(wn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(eg),ur.child=t,this.dispatchEvent(ur),ur.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let i=0,s=this.children.length;i<s;i++){let o=this.children[i].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,i=[]){this[t]===e&&i.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Fo,t,Xv),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Fo,$v,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,i=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*i-r[8]*s,r[13]+=i-r[1]*e-r[5]*i-r[9]*s,r[14]+=s-r[2]*e-r[6]*i-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].updateMatrixWorld(t)}updateWorldMatrix(t,e,i=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||i)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,i=!0),e===!0){let r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,i)}}toJSON(t){let e=t===void 0||typeof t=="string",i={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let u=l[c];r(t.shapes,u)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(t.materials,this.material[l]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];s.animations.push(r(t.animations,l))}}if(e){let a=o(t.geometries),l=o(t.materials),c=o(t.textures),h=o(t.images),u=o(t.shapes),d=o(t.skeletons),f=o(t.animations),x=o(t.nodes);a.length>0&&(i.geometries=a),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),h.length>0&&(i.images=h),u.length>0&&(i.shapes=u),d.length>0&&(i.skeletons=d),f.length>0&&(i.animations=f),x.length>0&&(i.nodes=x)}return i.object=s,i;function o(a){let l=[];for(let c in a){let h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let i=0;i<t.children.length;i++){let s=t.children[i];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};ti.DEFAULT_UP=new D(0,1,0);ti.DEFAULT_MATRIX_AUTO_UPDATE=!0;ti.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Ge=class extends ti{constructor(){super(),this.isGroup=!0,this.type="Group"}},qv={type:"move"},Ir=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ge,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ge,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new D,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new D),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ge,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new D,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new D,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let i of t.hand.values())this._getHandJoint(e,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,i){let s=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(let g of t.hand.values()){let p=e.getJointPose(g,i),m=this._getHandJoint(c,g);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}let h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,x=.005;c.inputState.pinching&&d>f+x?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&d<=f-x&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,i),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));a!==null&&(s=e.getPose(t.targetRaySpace,i),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(qv)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let i=new Ge;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[e.jointName]=i,t.add(i)}return t.joints[e.jointName]}},e0={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Xn={h:0,s:0,l:0},Ml={h:0,s:0,l:0};function cd(n,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?n+(t-n)*6*e:e<1/2?t:e<2/3?n+(t-n)*6*(2/3-e):n}var Ct=class{constructor(t,e,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,i)}set(t,e,i){if(e===void 0&&i===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Ae){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Yt.colorSpaceToWorking(this,e),this}setRGB(t,e,i,s=Yt.workingColorSpace){return this.r=t,this.g=e,this.b=i,Yt.colorSpaceToWorking(this,s),this}setHSL(t,e,i,s=Yt.workingColorSpace){if(t=Uv(t,1),e=jt(e,0,1),i=jt(i,0,1),e===0)this.r=this.g=this.b=i;else{let r=i<=.5?i*(1+e):i+e-i*e,o=2*i-r;this.r=cd(o,r,t+1/3),this.g=cd(o,r,t),this.b=cd(o,r,t-1/3)}return Yt.colorSpaceToWorking(this,s),this}setStyle(t,e=Ae){function i(r){r!==void 0&&parseFloat(r)<1&&Ot("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Ot("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);Ot("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Ae){let i=e0[t.toLowerCase()];return i!==void 0?this.setHex(i,e):Ot("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Pn(t.r),this.g=Pn(t.g),this.b=Pn(t.b),this}copyLinearToSRGB(t){return this.r=Tr(t.r),this.g=Tr(t.g),this.b=Tr(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Ae){return Yt.workingToColorSpace(oi.copy(this),t),Math.round(jt(oi.r*255,0,255))*65536+Math.round(jt(oi.g*255,0,255))*256+Math.round(jt(oi.b*255,0,255))}getHexString(t=Ae){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Yt.workingColorSpace){Yt.workingToColorSpace(oi.copy(this),e);let i=oi.r,s=oi.g,r=oi.b,o=Math.max(i,s,r),a=Math.min(i,s,r),l,c,h=(a+o)/2;if(a===o)l=0,c=0;else{let u=o-a;switch(c=h<=.5?u/(o+a):u/(2-o-a),o){case i:l=(s-r)/u+(s<r?6:0);break;case s:l=(r-i)/u+2;break;case r:l=(i-s)/u+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=Yt.workingColorSpace){return Yt.workingToColorSpace(oi.copy(this),e),t.r=oi.r,t.g=oi.g,t.b=oi.b,t}getStyle(t=Ae){Yt.workingToColorSpace(oi.copy(this),t);let e=oi.r,i=oi.g,s=oi.b;return t!==Ae?`color(${t} ${e.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(t,e,i){return this.getHSL(Xn),this.setHSL(Xn.h+t,Xn.s+e,Xn.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,i){return this.r=t.r+(e.r-t.r)*i,this.g=t.g+(e.g-t.g)*i,this.b=t.b+(e.b-t.b)*i,this}lerpHSL(t,e){this.getHSL(Xn),t.getHSL(Ml);let i=nd(Xn.h,Ml.h,e),s=nd(Xn.s,Ml.s,e),r=nd(Xn.l,Ml.l,e);return this.setHSL(i,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,i=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*i+r[6]*s,this.g=r[1]*e+r[4]*i+r[7]*s,this.b=r[2]*e+r[5]*i+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},oi=new Ct;Ct.NAMES=e0;var Ko=class extends ti{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new In,this.environmentIntensity=1,this.environmentRotation=new In,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},Vi=new D,Tn=new D,hd=new D,En=new D,dr=new D,fr=new D,ig=new D,ud=new D,dd=new D,fd=new D,pd=new _e,md=new _e,gd=new _e,Rn=class n{constructor(t=new D,e=new D,i=new D){this.a=t,this.b=e,this.c=i}static getNormal(t,e,i,s){s.subVectors(i,e),Vi.subVectors(t,e),s.cross(Vi);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,i,s,r){Vi.subVectors(s,e),Tn.subVectors(i,e),hd.subVectors(t,e);let o=Vi.dot(Vi),a=Vi.dot(Tn),l=Vi.dot(hd),c=Tn.dot(Tn),h=Tn.dot(hd),u=o*c-a*a;if(u===0)return r.set(0,0,0),null;let d=1/u,f=(c*l-a*h)*d,x=(o*h-a*l)*d;return r.set(1-f-x,x,f)}static containsPoint(t,e,i,s){return this.getBarycoord(t,e,i,s,En)===null?!1:En.x>=0&&En.y>=0&&En.x+En.y<=1}static getInterpolation(t,e,i,s,r,o,a,l){return this.getBarycoord(t,e,i,s,En)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,En.x),l.addScaledVector(o,En.y),l.addScaledVector(a,En.z),l)}static getInterpolatedAttribute(t,e,i,s,r,o){return pd.setScalar(0),md.setScalar(0),gd.setScalar(0),pd.fromBufferAttribute(t,e),md.fromBufferAttribute(t,i),gd.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(pd,r.x),o.addScaledVector(md,r.y),o.addScaledVector(gd,r.z),o}static isFrontFacing(t,e,i,s){return Vi.subVectors(i,e),Tn.subVectors(t,e),Vi.cross(Tn).dot(s)<0}set(t,e,i){return this.a.copy(t),this.b.copy(e),this.c.copy(i),this}setFromPointsAndIndices(t,e,i,s){return this.a.copy(t[e]),this.b.copy(t[i]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,i,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Vi.subVectors(this.c,this.b),Tn.subVectors(this.a,this.b),Vi.cross(Tn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return n.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return n.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,i,s,r){return n.getInterpolation(t,this.a,this.b,this.c,e,i,s,r)}containsPoint(t){return n.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return n.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let i=this.a,s=this.b,r=this.c,o,a;dr.subVectors(s,i),fr.subVectors(r,i),ud.subVectors(t,i);let l=dr.dot(ud),c=fr.dot(ud);if(l<=0&&c<=0)return e.copy(i);dd.subVectors(t,s);let h=dr.dot(dd),u=fr.dot(dd);if(h>=0&&u<=h)return e.copy(s);let d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return o=l/(l-h),e.copy(i).addScaledVector(dr,o);fd.subVectors(t,r);let f=dr.dot(fd),x=fr.dot(fd);if(x>=0&&f<=x)return e.copy(r);let g=f*c-l*x;if(g<=0&&c>=0&&x<=0)return a=c/(c-x),e.copy(i).addScaledVector(fr,a);let p=h*x-f*u;if(p<=0&&u-h>=0&&f-x>=0)return ig.subVectors(r,s),a=(u-h)/(u-h+(f-x)),e.copy(s).addScaledVector(ig,a);let m=1/(p+g+d);return o=g*m,a=d*m,e.copy(i).addScaledVector(dr,o).addScaledVector(fr,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},jn=class{constructor(t=new D(1/0,1/0,1/0),e=new D(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e+=3)this.expandByPoint(Wi.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,i=t.count;e<i;e++)this.expandByPoint(Wi.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let i=Wi.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let i=t.geometry;if(i!==void 0){let r=i.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,Wi):Wi.fromBufferAttribute(r,o),Wi.applyMatrix4(t.matrixWorld),this.expandByPoint(Wi);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),bl.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),bl.copy(i.boundingBox)),bl.applyMatrix4(t.matrixWorld),this.union(bl)}let s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Wi),Wi.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,i;return t.normal.x>0?(e=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),e<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Uo),Sl.subVectors(this.max,Uo),pr.subVectors(t.a,Uo),mr.subVectors(t.b,Uo),gr.subVectors(t.c,Uo),$n.subVectors(mr,pr),Zn.subVectors(gr,mr),ws.subVectors(pr,gr);let e=[0,-$n.z,$n.y,0,-Zn.z,Zn.y,0,-ws.z,ws.y,$n.z,0,-$n.x,Zn.z,0,-Zn.x,ws.z,0,-ws.x,-$n.y,$n.x,0,-Zn.y,Zn.x,0,-ws.y,ws.x,0];return!xd(e,pr,mr,gr,Sl)||(e=[1,0,0,0,1,0,0,0,1],!xd(e,pr,mr,gr,Sl))?!1:(wl.crossVectors($n,Zn),e=[wl.x,wl.y,wl.z],xd(e,pr,mr,gr,Sl))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Wi).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Wi).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(An[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),An[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),An[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),An[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),An[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),An[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),An[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),An[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(An),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},An=[new D,new D,new D,new D,new D,new D,new D,new D],Wi=new D,bl=new jn,pr=new D,mr=new D,gr=new D,$n=new D,Zn=new D,ws=new D,Uo=new D,Sl=new D,wl=new D,Ts=new D;function xd(n,t,e,i,s){for(let r=0,o=n.length-3;r<=o;r+=3){Ts.fromArray(n,r);let a=s.x*Math.abs(Ts.x)+s.y*Math.abs(Ts.y)+s.z*Math.abs(Ts.z),l=t.dot(Ts),c=e.dot(Ts),h=i.dot(Ts);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}var Fe=new D,Tl=new bt,Yv=0,Ue=class extends ln{constructor(t,e,i=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Yv++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=i,this.usage=sf,this.updateRanges=[],this.gpuType=Yi,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,i){t*=this.itemSize,i*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[i+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,i=this.count;e<i;e++)Tl.fromBufferAttribute(this,e),Tl.applyMatrix3(t),this.setXY(e,Tl.x,Tl.y);else if(this.itemSize===3)for(let e=0,i=this.count;e<i;e++)Fe.fromBufferAttribute(this,e),Fe.applyMatrix3(t),this.setXYZ(e,Fe.x,Fe.y,Fe.z);return this}applyMatrix4(t){for(let e=0,i=this.count;e<i;e++)Fe.fromBufferAttribute(this,e),Fe.applyMatrix4(t),this.setXYZ(e,Fe.x,Fe.y,Fe.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)Fe.fromBufferAttribute(this,e),Fe.applyNormalMatrix(t),this.setXYZ(e,Fe.x,Fe.y,Fe.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)Fe.fromBufferAttribute(this,e),Fe.transformDirection(t),this.setXYZ(e,Fe.x,Fe.y,Fe.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let i=this.array[t*this.itemSize+e];return this.normalized&&(i=rn(i,this.array)),i}setComponent(t,e,i){return this.normalized&&(i=le(i,this.array)),this.array[t*this.itemSize+e]=i,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=rn(e,this.array)),e}setX(t,e){return this.normalized&&(e=le(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=rn(e,this.array)),e}setY(t,e){return this.normalized&&(e=le(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=rn(e,this.array)),e}setZ(t,e){return this.normalized&&(e=le(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=rn(e,this.array)),e}setW(t,e){return this.normalized&&(e=le(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,i){return t*=this.itemSize,this.normalized&&(e=le(e,this.array),i=le(i,this.array)),this.array[t+0]=e,this.array[t+1]=i,this}setXYZ(t,e,i,s){return t*=this.itemSize,this.normalized&&(e=le(e,this.array),i=le(i,this.array),s=le(s,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this}setXYZW(t,e,i,s,r){return t*=this.itemSize,this.normalized&&(e=le(e,this.array),i=le(i,this.array),s=le(s,this.array),r=le(r,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}};var Jo=class extends Ue{constructor(t,e,i){super(new Uint16Array(t),e,i)}};var Qo=class extends Ue{constructor(t,e,i){super(new Uint32Array(t),e,i)}};var Jt=class extends Ue{constructor(t,e,i){super(new Float32Array(t),e,i)}},jv=new jn,Bo=new D,yd=new D,Rs=class{constructor(t=new D,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let i=this.center;e!==void 0?i.copy(e):jv.setFromPoints(t).getCenter(i);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,i.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let i=this.center.distanceToSquared(t);return e.copy(t),i>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Bo.subVectors(t,this.center);let e=Bo.lengthSq();if(e>this.radius*this.radius){let i=Math.sqrt(e),s=(i-this.radius)*.5;this.center.addScaledVector(Bo,s/i),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(yd.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Bo.copy(t.center).add(yd)),this.expandByPoint(Bo.copy(t.center).sub(yd))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},Kv=0,Li=new fe,vd=new ti,xr=new D,Ti=new jn,zo=new jn,qe=new D,Me=class n extends ln{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Kv++}),this.uuid=Yn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Ov(t)?Qo:Jo)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,i=0){this.groups.push({start:t,count:e,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let r=new Ht().getNormalMatrix(t);i.applyNormalMatrix(r),i.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return Li.makeRotationFromQuaternion(t),this.applyMatrix4(Li),this}rotateX(t){return Li.makeRotationX(t),this.applyMatrix4(Li),this}rotateY(t){return Li.makeRotationY(t),this.applyMatrix4(Li),this}rotateZ(t){return Li.makeRotationZ(t),this.applyMatrix4(Li),this}translate(t,e,i){return Li.makeTranslation(t,e,i),this.applyMatrix4(Li),this}scale(t,e,i){return Li.makeScale(t,e,i),this.applyMatrix4(Li),this}lookAt(t){return vd.lookAt(t),vd.updateMatrix(),this.applyMatrix4(vd.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(xr).negate(),this.translate(xr.x,xr.y,xr.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let i=[];for(let s=0,r=t.length;s<r;s++){let o=t[s];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Jt(i,3))}else{let i=Math.min(t.length,e.count);for(let s=0;s<i;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&Ot("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new jn);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new D(-1/0,-1/0,-1/0),new D(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let i=0,s=e.length;i<s;i++){let r=e[i];Ti.setFromBufferAttribute(r),this.morphTargetsRelative?(qe.addVectors(this.boundingBox.min,Ti.min),this.boundingBox.expandByPoint(qe),qe.addVectors(this.boundingBox.max,Ti.max),this.boundingBox.expandByPoint(qe)):(this.boundingBox.expandByPoint(Ti.min),this.boundingBox.expandByPoint(Ti.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Nt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Rs);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new D,1/0);return}if(t){let i=this.boundingSphere.center;if(Ti.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){let a=e[r];zo.setFromBufferAttribute(a),this.morphTargetsRelative?(qe.addVectors(Ti.min,zo.min),Ti.expandByPoint(qe),qe.addVectors(Ti.max,zo.max),Ti.expandByPoint(qe)):(Ti.expandByPoint(zo.min),Ti.expandByPoint(zo.max))}Ti.getCenter(i);let s=0;for(let r=0,o=t.count;r<o;r++)qe.fromBufferAttribute(t,r),s=Math.max(s,i.distanceToSquared(qe));if(e)for(let r=0,o=e.length;r<o;r++){let a=e[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)qe.fromBufferAttribute(a,c),l&&(xr.fromBufferAttribute(t,c),qe.add(xr)),s=Math.max(s,i.distanceToSquared(qe))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Nt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Nt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=e.position,s=e.normal,r=e.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==i.count)&&(o=new Ue(new Float32Array(4*i.count),4),this.setAttribute("tangent",o));let a=[],l=[];for(let v=0;v<i.count;v++)a[v]=new D,l[v]=new D;let c=new D,h=new D,u=new D,d=new bt,f=new bt,x=new bt,g=new D,p=new D;function m(v,b,R){c.fromBufferAttribute(i,v),h.fromBufferAttribute(i,b),u.fromBufferAttribute(i,R),d.fromBufferAttribute(r,v),f.fromBufferAttribute(r,b),x.fromBufferAttribute(r,R),h.sub(c),u.sub(c),f.sub(d),x.sub(d);let P=1/(f.x*x.y-x.x*f.y);isFinite(P)&&(g.copy(h).multiplyScalar(x.y).addScaledVector(u,-f.y).multiplyScalar(P),p.copy(u).multiplyScalar(f.x).addScaledVector(h,-x.x).multiplyScalar(P),a[v].add(g),a[b].add(g),a[R].add(g),l[v].add(p),l[b].add(p),l[R].add(p))}let M=this.groups;M.length===0&&(M=[{start:0,count:t.count}]);for(let v=0,b=M.length;v<b;++v){let R=M[v],P=R.start,k=R.count;for(let B=P,I=P+k;B<I;B+=3)m(t.getX(B+0),t.getX(B+1),t.getX(B+2))}let E=new D,_=new D,T=new D,w=new D;function A(v){T.fromBufferAttribute(s,v),w.copy(T);let b=a[v];E.copy(b),E.sub(T.multiplyScalar(T.dot(b))).normalize(),_.crossVectors(w,b);let P=_.dot(l[v])<0?-1:1;o.setXYZW(v,E.x,E.y,E.z,P)}for(let v=0,b=M.length;v<b;++v){let R=M[v],P=R.start,k=R.count;for(let B=P,I=P+k;B<I;B+=3)A(t.getX(B+0)),A(t.getX(B+1)),A(t.getX(B+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let i=this.getAttribute("normal");if(i===void 0||i.count!==e.count)i=new Ue(new Float32Array(e.count*3),3),this.setAttribute("normal",i);else for(let d=0,f=i.count;d<f;d++)i.setXYZ(d,0,0,0);let s=new D,r=new D,o=new D,a=new D,l=new D,c=new D,h=new D,u=new D;if(t)for(let d=0,f=t.count;d<f;d+=3){let x=t.getX(d+0),g=t.getX(d+1),p=t.getX(d+2);s.fromBufferAttribute(e,x),r.fromBufferAttribute(e,g),o.fromBufferAttribute(e,p),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),a.fromBufferAttribute(i,x),l.fromBufferAttribute(i,g),c.fromBufferAttribute(i,p),a.add(h),l.add(h),c.add(h),i.setXYZ(x,a.x,a.y,a.z),i.setXYZ(g,l.x,l.y,l.z),i.setXYZ(p,c.x,c.y,c.z)}else for(let d=0,f=e.count;d<f;d+=3)s.fromBufferAttribute(e,d+0),r.fromBufferAttribute(e,d+1),o.fromBufferAttribute(e,d+2),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),i.setXYZ(d+0,h.x,h.y,h.z),i.setXYZ(d+1,h.x,h.y,h.z),i.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,i=t.count;e<i;e++)qe.fromBufferAttribute(t,e),qe.normalize(),t.setXYZ(e,qe.x,qe.y,qe.z)}toNonIndexed(){function t(a,l){let c=a.array,h=a.itemSize,u=a.normalized,d=new c.constructor(l.length*h),f=0,x=0;for(let g=0,p=l.length;g<p;g++){a.isInterleavedBufferAttribute?f=l[g]*a.data.stride+a.offset:f=l[g]*h;for(let m=0;m<h;m++)d[x++]=c[f++]}return new Ue(d,h,u)}if(this.index===null)return Ot("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new n,i=this.index.array,s=this.attributes;for(let a in s){let l=s[a],c=t(l,i);e.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let h=0,u=c.length;h<u;h++){let d=c[h],f=t(d,i);l.push(f)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let i=this.attributes;for(let l in i){let c=i[l];t.data.attributes[l]=c.toJSON(t.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){let f=c[u];h.push(f.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let i=t.index;i!==null&&this.setIndex(i.clone());let s=t.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(e))}let r=t.morphAttributes;for(let c in r){let h=[],u=r[c];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let o=t.groups;for(let c=0,h=o.length;c<h;c++){let u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}let a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}},sc=class{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=sf,this.updateRanges=[],this.version=0,this.uuid=Yn()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,i){t*=this.stride,i*=e.stride;for(let s=0,r=this.stride;s<r;s++)this.array[t+s]=e.array[i+s];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Yn()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let e=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(e,this.stride);return i.setUsage(this.usage),i}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Yn()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer)));let e={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return e.usage=this.usage,e}},hi=new D,ta=class n{constructor(t,e,i,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=i,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,i=this.data.count;e<i;e++)hi.fromBufferAttribute(this,e),hi.applyMatrix4(t),this.setXYZ(e,hi.x,hi.y,hi.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)hi.fromBufferAttribute(this,e),hi.applyNormalMatrix(t),this.setXYZ(e,hi.x,hi.y,hi.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)hi.fromBufferAttribute(this,e),hi.transformDirection(t),this.setXYZ(e,hi.x,hi.y,hi.z);return this}getComponent(t,e){let i=this.array[t*this.data.stride+this.offset+e];return this.normalized&&(i=rn(i,this.array)),i}setComponent(t,e,i){return this.normalized&&(i=le(i,this.array)),this.data.array[t*this.data.stride+this.offset+e]=i,this}setX(t,e){return this.normalized&&(e=le(e,this.array)),this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.normalized&&(e=le(e,this.array)),this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.normalized&&(e=le(e,this.array)),this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.normalized&&(e=le(e,this.array)),this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(e=rn(e,this.array)),e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(e=rn(e,this.array)),e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(e=rn(e,this.array)),e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(e=rn(e,this.array)),e}setXY(t,e,i){return t=t*this.data.stride+this.offset,this.normalized&&(e=le(e,this.array),i=le(i,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=i,this}setXYZ(t,e,i,s){return t=t*this.data.stride+this.offset,this.normalized&&(e=le(e,this.array),i=le(i,this.array),s=le(s,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=i,this.data.array[t+2]=s,this}setXYZW(t,e,i,s,r){return t=t*this.data.stride+this.offset,this.normalized&&(e=le(e,this.array),i=le(i,this.array),s=le(s,this.array),r=le(r,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=i,this.data.array[t+2]=s,this.data.array[t+3]=r,this}clone(t){if(t===void 0){qo("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let i=0;i<this.count;i++){let s=i*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return new Ue(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new n(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){qo("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let i=0;i<this.count;i++){let s=i*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},_d=new D,Jv=new D,Qv=new Ht,xi=class{constructor(t=new D(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,i,s){return this.normal.set(t,e,i),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,i){let s=_d.subVectors(i,e).cross(Jv.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,i=!0){let s=t.delta(_d),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let o=-(t.start.dot(this.normal)+this.constant)/r;return i===!0&&(o<0||o>1)?null:e.copy(t.start).addScaledVector(s,o)}intersectsLine(t){let e=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return e<0&&i>0||i<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let i=e||Qv.getNormalMatrix(t),s=this.coplanarPoint(_d).applyMatrix4(t),r=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},t_=0,$i=class extends ln{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:t_++}),this.uuid=Yn(),this.name="",this.type="Material",this.blending=ns,this.side=is,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Bd,this.blendDst=zd,this.blendEquation=Ls,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ct(0,0,0),this.blendAlpha=0,this.depthFunc=Er,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Wg,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Wl,this.stencilZFail=Wl,this.stencilZPass=Wl,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let i=t[e];if(i===void 0){Ot(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Ot(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector2&&i&&i.isVector2||s&&s.isEuler&&i&&i.isEuler||s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[e]=i}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,i.blending=this.blending,i.side=this.side,i.shadowSide=this.shadowSide,i.vertexColors=this.vertexColors,i.opacity=this.opacity,i.transparent=this.transparent,i.blendSrc=this.blendSrc,i.blendDst=this.blendDst,i.blendEquation=this.blendEquation,i.blendSrcAlpha=this.blendSrcAlpha,i.blendDstAlpha=this.blendDstAlpha,i.blendEquationAlpha=this.blendEquationAlpha,i.blendColor=this.blendColor.getHex(),i.blendAlpha=this.blendAlpha,i.depthFunc=this.depthFunc,i.depthTest=this.depthTest,i.depthWrite=this.depthWrite,i.colorWrite=this.colorWrite,i.clipIntersection=this.clipIntersection,i.clipShadows=this.clipShadows,i.stencilWriteMask=this.stencilWriteMask,i.stencilFunc=this.stencilFunc,i.stencilRef=this.stencilRef,i.stencilFuncMask=this.stencilFuncMask,i.stencilFail=this.stencilFail,i.stencilZFail=this.stencilZFail,i.stencilZPass=this.stencilZPass,i.stencilWrite=this.stencilWrite,i.polygonOffset=this.polygonOffset,i.polygonOffsetFactor=this.polygonOffsetFactor,i.polygonOffsetUnits=this.polygonOffsetUnits,i.dithering=this.dithering,i.alphaTest=this.alphaTest,i.alphaHash=this.alphaHash,i.alphaToCoverage=this.alphaToCoverage,i.premultipliedAlpha=this.premultipliedAlpha,i.forceSinglePass=this.forceSinglePass,i.allowOverride=this.allowOverride,i.visible=this.visible,i.toneMapped=this.toneMapped,i.name=this.name,this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(i.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(i.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(i.rotation=this.rotation),this.depthPacking!==void 0&&(i.depthPacking=this.depthPacking),this.linewidth!==void 0&&(i.linewidth=this.linewidth),this.linecap!==void 0&&(i.linecap=this.linecap),this.linejoin!==void 0&&(i.linejoin=this.linejoin),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.wireframe!==void 0&&(i.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(i.flatShading=this.flatShading),this.fog!==void 0&&(i.fog=this.fog),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(e){let r=s(t.textures),o=s(t.images);r.length>0&&(i.textures=r),o.length>0&&(i.images=o)}return i}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new Ct().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(i=>new xi().fromJSON(i))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let i=t.normalScale;Array.isArray(i)===!1&&(i=[i,i]),this.normalScale=new bt().fromArray(i)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new bt().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,i=null;if(e!==null){let s=e.length;i=new Array(s);for(let r=0;r!==s;++r)i[r]=e[r].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}},Zi=class extends $i{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Ct(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},yr,Ho=new D,vr=new D,_r=new D,Mr=new bt,Go=new bt,i0=new fe,El=new D,Vo=new D,Al=new D,ng=new bt,Md=new bt,sg=new bt,hn=class extends ti{constructor(t=new Zi){if(super(),this.isSprite=!0,this.type="Sprite",yr===void 0){yr=new Me;let e=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),i=new sc(e,5);yr.setIndex([0,1,2,0,2,3]),yr.setAttribute("position",new ta(i,3,0,!1)),yr.setAttribute("uv",new ta(i,2,3,!1))}this.geometry=yr,this.material=t,this.center=new bt(.5,.5),this.count=1}intersectsFrustum(t){return t.intersectsSprite(this)}raycast(t,e){t.camera===null&&Nt('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),vr.setFromMatrixScale(this.matrixWorld),i0.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),_r.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&vr.multiplyScalar(-_r.z);let i=this.material.rotation,s,r;i!==0&&(r=Math.cos(i),s=Math.sin(i));let o=this.center;Cl(El.set(-.5,-.5,0),_r,o,vr,s,r),Cl(Vo.set(.5,-.5,0),_r,o,vr,s,r),Cl(Al.set(.5,.5,0),_r,o,vr,s,r),ng.set(0,0),Md.set(1,0),sg.set(1,1);let a=t.ray.intersectTriangle(El,Vo,Al,!1,Ho);if(a===null&&(Cl(Vo.set(-.5,.5,0),_r,o,vr,s,r),Md.set(0,1),a=t.ray.intersectTriangle(El,Al,Vo,!1,Ho),a===null))return;let l=t.ray.origin.distanceTo(Ho);l<t.near||l>t.far||e.push({distance:l,point:Ho.clone(),uv:Rn.getInterpolation(Ho,El,Vo,Al,ng,Md,sg,new bt),face:null,object:this})}copy(t,e){return super.copy(t,e),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}};function Cl(n,t,e,i,s,r){Mr.subVectors(n,e).addScalar(.5).multiply(i),s!==void 0?(Go.x=r*Mr.x-s*Mr.y,Go.y=s*Mr.x+r*Mr.y):Go.copy(Mr),n.copy(t),n.x+=Go.x,n.y+=Go.y,n.applyMatrix4(i0)}var Cn=new D,bd=new D,Rl=new D,Pl=new D,kr=class{constructor(t=new D,e=new D(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Cn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let i=e.dot(this.direction);return i<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=Cn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Cn.copy(this.origin).addScaledVector(this.direction,e),Cn.distanceToSquared(t))}distanceSqToSegment(t,e,i,s){bd.copy(t).add(e).multiplyScalar(.5),Rl.copy(e).sub(t).normalize(),Pl.copy(this.origin).sub(bd);let r=t.distanceTo(e)*.5,o=-this.direction.dot(Rl),a=Pl.dot(this.direction),l=-Pl.dot(Rl),c=Pl.lengthSq(),h=Math.abs(1-o*o),u,d,f,x;if(h>0)if(u=o*l-a,d=o*a-l,x=r*h,u>=0)if(d>=-x)if(d<=x){let g=1/h;u*=g,d*=g,f=u*(u+o*d+2*a)+d*(o*u+d+2*l)+c}else d=r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d=-r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d<=-x?(u=Math.max(0,-(-o*r+a)),d=u>0?-r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c):d<=x?(u=0,d=Math.min(Math.max(-r,-l),r),f=d*(d+2*l)+c):(u=Math.max(0,-(o*r+a)),d=u>0?r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c);else d=o>0?-r:r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(bd).addScaledVector(Rl,d),f}intersectSphere(t,e){if(t.radius<0)return null;Cn.subVectors(t.center,this.origin);let i=Cn.dot(this.direction),s=Cn.dot(Cn)-i*i,r=t.radius*t.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=i-o,l=i+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(t.normal)+t.constant)/e;return i>=0?i:null}intersectPlane(t,e){let i=this.distanceToPlane(t);return i===null?null:this.at(i,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let i,s,r,o,a,l,c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(i=(t.min.x-d.x)*c,s=(t.max.x-d.x)*c):(i=(t.max.x-d.x)*c,s=(t.min.x-d.x)*c),h>=0?(r=(t.min.y-d.y)*h,o=(t.max.y-d.y)*h):(r=(t.max.y-d.y)*h,o=(t.min.y-d.y)*h),i>o||r>s||((r>i||isNaN(i))&&(i=r),(o<s||isNaN(s))&&(s=o),u>=0?(a=(t.min.z-d.z)*u,l=(t.max.z-d.z)*u):(a=(t.max.z-d.z)*u,l=(t.min.z-d.z)*u),i>l||a>s)||((a>i||i!==i)&&(i=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(i>=0?i:s,e)}intersectsBox(t){return this.intersectBox(t,Cn)!==null}intersectTriangle(t,e,i,s,r){let o=this.origin,a=this.direction,l=a.x,c=a.y,h=a.z,u=t.x-o.x,d=t.y-o.y,f=t.z-o.z,x=e.x-o.x,g=e.y-o.y,p=e.z-o.z,m=i.x-o.x,M=i.y-o.y,E=i.z-o.z,_=Math.abs(l),T=Math.abs(c),w=Math.abs(h),A,v,b,R,P,k,B,I,U,V,Z,it;if(_>=T&&_>=w?(b=l,k=u,U=x,it=m,l>=0?(A=c,v=h,R=d,P=f,B=g,I=p,V=M,Z=E):(A=h,v=c,R=f,P=d,B=p,I=g,V=E,Z=M)):T>=w?(b=c,k=d,U=g,it=M,c>=0?(A=h,v=l,R=f,P=u,B=p,I=x,V=E,Z=m):(A=l,v=h,R=u,P=f,B=x,I=p,V=m,Z=E)):(b=h,k=f,U=p,it=E,h>=0?(A=l,v=c,R=u,P=d,B=x,I=g,V=m,Z=M):(A=c,v=l,R=d,P=u,B=g,I=x,V=M,Z=m)),b===0)return null;let $=A/b,J=v/b,et=1/b,at=R-$*k,rt=P-J*k,zt=B-$*U,kt=I-J*U,Lt=V-$*it,X=Z-J*it,Q=Lt*kt-X*zt,yt=at*X-rt*Lt,Ut=zt*rt-kt*at;if(s){if(Q<0||yt<0||Ut<0)return null}else if((Q<0||yt<0||Ut<0)&&(Q>0||yt>0||Ut>0))return null;let _t=Q+yt+Ut;if(_t===0)return null;let Xt=et*(Q*k+yt*U+Ut*it);return(_t>0?Xt<0:Xt>0)?null:this.at(Xt/_t,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Re=class extends $i{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ct(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new In,this.combine=Hd,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},rg=new fe,Es=new kr,Il=new Rs,og=new D,kl=new D,Ll=new D,Dl=new D,Sd=new D,Nl=new D,ag=new D,Ol=new D,Bt=class extends ti{constructor(t=new Me,e=new Re){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){let s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){let i=this.geometry,s=i.attributes.position,r=i.morphAttributes.position,o=i.morphTargetsRelative;e.fromBufferAttribute(s,t);let a=this.morphTargetInfluences;if(r&&a){Nl.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=a[l],u=r[l];h!==0&&(Sd.fromBufferAttribute(u,t),o?Nl.addScaledVector(Sd,h):Nl.addScaledVector(Sd.sub(e),h))}e.add(Nl)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let i=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Il.copy(i.boundingSphere),Il.applyMatrix4(r),Es.copy(t.ray).recast(t.near),!(Il.containsPoint(Es.origin)===!1&&(Es.intersectSphere(Il,og)===null||Es.origin.distanceToSquared(og)>(t.far-t.near)**2))&&(rg.copy(r).invert(),Es.copy(t.ray).applyMatrix4(rg),!(i.boundingBox!==null&&Es.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,e,Es)))}_computeIntersections(t,e,i){let s,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let x=0,g=d.length;x<g;x++){let p=d[x],m=o[p.materialIndex],M=Math.max(p.start,f.start),E=Math.min(a.count,Math.min(p.start+p.count,f.start+f.count));for(let _=M,T=E;_<T;_+=3){let w=a.getX(_),A=a.getX(_+1),v=a.getX(_+2);s=Fl(this,m,t,i,c,h,u,w,A,v),s&&(s.faceIndex=Math.floor(_/3),s.face.materialIndex=p.materialIndex,e.push(s))}}else{let x=Math.max(0,f.start),g=Math.min(a.count,f.start+f.count);for(let p=x,m=g;p<m;p+=3){let M=a.getX(p),E=a.getX(p+1),_=a.getX(p+2);s=Fl(this,o,t,i,c,h,u,M,E,_),s&&(s.faceIndex=Math.floor(p/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let x=0,g=d.length;x<g;x++){let p=d[x],m=o[p.materialIndex],M=Math.max(p.start,f.start),E=Math.min(l.count,Math.min(p.start+p.count,f.start+f.count));for(let _=M,T=E;_<T;_+=3){let w=_,A=_+1,v=_+2;s=Fl(this,m,t,i,c,h,u,w,A,v),s&&(s.faceIndex=Math.floor(_/3),s.face.materialIndex=p.materialIndex,e.push(s))}}else{let x=Math.max(0,f.start),g=Math.min(l.count,f.start+f.count);for(let p=x,m=g;p<m;p+=3){let M=p,E=p+1,_=p+2;s=Fl(this,o,t,i,c,h,u,M,E,_),s&&(s.faceIndex=Math.floor(p/3),e.push(s))}}}};function e_(n,t,e,i,s,r,o,a){let l;if(t.side===di?l=i.intersectTriangle(o,r,s,!0,a):l=i.intersectTriangle(s,r,o,t.side===is,a),l===null)return null;Ol.copy(a),Ol.applyMatrix4(n.matrixWorld);let c=e.ray.origin.distanceTo(Ol);return c<e.near||c>e.far?null:{distance:c,point:Ol.clone(),object:n}}function Fl(n,t,e,i,s,r,o,a,l,c){n.getVertexPosition(a,kl),n.getVertexPosition(l,Ll),n.getVertexPosition(c,Dl);let h=e_(n,t,e,i,kl,Ll,Dl,ag);if(h){let u=new D;Rn.getBarycoord(ag,kl,Ll,Dl,u),s&&(h.uv=Rn.getInterpolatedAttribute(s,a,l,c,u,new bt)),r&&(h.uv1=Rn.getInterpolatedAttribute(r,a,l,c,u,new bt)),o&&(h.normal=Rn.getInterpolatedAttribute(o,a,l,c,u,new D),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));let d={a,b:l,c,normal:new D,materialIndex:0};Rn.getNormal(kl,Ll,Dl,d.normal),h.face=d,h.barycoord=u}return h}var Lr=class extends Ve{constructor(t=null,e=1,i=1,s,r,o,a,l,c=je,h=je,u,d){super(null,o,a,l,c,h,s,r,u,d),this.isDataTexture=!0,this.image={data:t,width:e,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var As=new Rs,i_=new bt(.5,.5),Ul=new D,Dr=class{constructor(t=new xi,e=new xi,i=new xi,s=new xi,r=new xi,o=new xi){this.planes=[t,e,i,s,r,o]}set(t,e,i,s,r,o){let a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(i),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){let e=this.planes;for(let i=0;i<6;i++)e[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,e=Xi,i=!1){let s=this.planes,r=t.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],u=r[5],d=r[6],f=r[7],x=r[8],g=r[9],p=r[10],m=r[11],M=r[12],E=r[13],_=r[14],T=r[15];if(s[0].setComponents(c-o,f-h,m-x,T-M).normalize(),s[1].setComponents(c+o,f+h,m+x,T+M).normalize(),s[2].setComponents(c+a,f+u,m+g,T+E).normalize(),s[3].setComponents(c-a,f-u,m-g,T-E).normalize(),i)s[4].setComponents(l,d,p,_).normalize(),s[5].setComponents(c-l,f-d,m-p,T-_).normalize();else if(s[4].setComponents(c-l,f-d,m-p,T-_).normalize(),e===Xi)s[5].setComponents(c+l,f+d,m+p,T+_).normalize();else if(e===Ar)s[5].setComponents(l,d,p,_).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),As.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),As.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(As)}intersectsSprite(t){As.center.set(0,0,0);let e=i_.distanceTo(t.center);return As.radius=.7071067811865476+e,As.applyMatrix4(t.matrixWorld),this.intersectsSphere(As)}intersectsSphere(t){let e=this.planes,i=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(i)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let i=0;i<6;i++){let s=e[i];if(Ul.x=s.normal.x>0?t.max.x:t.min.x,Ul.y=s.normal.y>0?t.max.y:t.min.y,Ul.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(Ul)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let i=0;i<6;i++)if(e[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Kn=class extends $i{constructor(t){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Ct(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}},lg=new fe,Pd=new kr,Bl=new Rs,zl=new D,Ps=class extends ti{constructor(t=new Me,e=new Kn){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let i=this.geometry,s=this.matrixWorld,r=t.params.Points.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Bl.copy(i.boundingSphere),Bl.applyMatrix4(s),Bl.radius+=r,t.ray.intersectsSphere(Bl)===!1)return;lg.copy(s).invert(),Pd.copy(t.ray).applyMatrix4(lg);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=i.index,u=i.attributes.position;if(c!==null){let d=Math.max(0,o.start),f=Math.min(c.count,o.start+o.count);for(let x=d,g=f;x<g;x++){let p=c.getX(x);zl.fromBufferAttribute(u,p),cg(zl,p,l,s,t,e,this)}}else{let d=Math.max(0,o.start),f=Math.min(u.count,o.start+o.count);for(let x=d,g=f;x<g;x++)zl.fromBufferAttribute(u,x),cg(zl,x,l,s,t,e,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){let s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function cg(n,t,e,i,s,r,o){let a=Pd.distanceSqToPoint(n);if(a<e){let l=new D;Pd.closestPointToPoint(n,l),l.applyMatrix4(i);let c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var ea=class extends Ve{constructor(t=[],e=ss,i,s,r,o,a,l,c,h){super(t,e,i,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},ia=class extends Ve{constructor(t,e,i,s,r,o,a,l,c){super(t,e,i,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var Jn=class extends Ve{constructor(t,e,i=qi,s,r,o,a=je,l=je,c,h=an,u=1){if(h!==an&&h!==rs)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let d={width:t,height:e,depth:u};super(d,s,r,o,a,l,h,i,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Rr(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},rc=class extends Jn{constructor(t,e=qi,i=ss,s,r,o=je,a=je,l,c=an){let h={width:t,height:t,depth:1},u=[h,h,h,h,h,h];super(t,t,e,i,s,r,o,a,l,c),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},na=class extends Ve{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},ai=class n extends Me{constructor(t=1,e=1,i=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:i,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],h=[],u=[],d=0,f=0;x("z","y","x",-1,-1,i,e,t,o,r,0),x("z","y","x",1,-1,i,e,-t,o,r,1),x("x","z","y",1,1,t,i,e,s,o,2),x("x","z","y",1,-1,t,i,-e,s,o,3),x("x","y","z",1,-1,t,e,i,s,r,4),x("x","y","z",-1,-1,t,e,-i,s,r,5),this.setIndex(l),this.setAttribute("position",new Jt(c,3)),this.setAttribute("normal",new Jt(h,3)),this.setAttribute("uv",new Jt(u,2));function x(g,p,m,M,E,_,T,w,A,v,b){let R=_/A,P=T/v,k=_/2,B=T/2,I=w/2,U=A+1,V=v+1,Z=0,it=0,$=new D;for(let J=0;J<V;J++){let et=J*P-B;for(let at=0;at<U;at++){let rt=at*R-k;$[g]=rt*M,$[p]=et*E,$[m]=I,c.push($.x,$.y,$.z),$[g]=0,$[p]=0,$[m]=w>0?1:-1,h.push($.x,$.y,$.z),u.push(at/A),u.push(1-J/v),Z+=1}}for(let J=0;J<v;J++)for(let et=0;et<A;et++){let at=d+et+U*J,rt=d+et+U*(J+1),zt=d+(et+1)+U*(J+1),kt=d+(et+1)+U*J;l.push(at,rt,kt),l.push(rt,zt,kt),it+=6}a.addGroup(f,it,b),f+=it,d+=Z}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var sa=class n extends Me{constructor(t=1,e=32,i=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:i,thetaLength:s},e=Math.max(3,e);let r=[],o=[],a=[],l=[],c=new D,h=new bt;o.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let u=0,d=3;u<=e;u++,d+=3){let f=i+u/e*s;c.x=t*Math.cos(f),c.y=t*Math.sin(f),o.push(c.x,c.y,c.z),a.push(0,0,1),h.x=(o[d]/t+1)/2,h.y=(o[d+1]/t+1)/2,l.push(h.x,h.y)}for(let u=1;u<=e;u++)r.push(u,u+1,0);this.setIndex(r),this.setAttribute("position",new Jt(o,3)),this.setAttribute("normal",new Jt(a,3)),this.setAttribute("uv",new Jt(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.radius,t.segments,t.thetaStart,t.thetaLength)}},un=class n extends Me{constructor(t=1,e=1,i=1,s=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:i,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let h=[],u=[],d=[],f=[],x=0,g=[],p=i/2,m=0;M(),o===!1&&(t>0&&E(!0),e>0&&E(!1)),this.setIndex(h),this.setAttribute("position",new Jt(u,3)),this.setAttribute("normal",new Jt(d,3)),this.setAttribute("uv",new Jt(f,2));function M(){let _=new D,T=new D,w=0,A=(e-t)/i;for(let v=0;v<=r;v++){let b=[],R=v/r,P=R*(e-t)+t;for(let k=0;k<=s;k++){let B=k/s,I=B*l+a,U=Math.sin(I),V=Math.cos(I);T.x=P*U,T.y=-R*i+p,T.z=P*V,u.push(T.x,T.y,T.z),_.set(U,A,V).normalize(),d.push(_.x,_.y,_.z),f.push(B,1-R),b.push(x++)}g.push(b)}for(let v=0;v<s;v++)for(let b=0;b<r;b++){let R=g[b][v],P=g[b+1][v],k=g[b+1][v+1],B=g[b][v+1];(t>0||b!==0)&&(h.push(R,P,B),w+=3),(e>0||b!==r-1)&&(h.push(P,k,B),w+=3)}c.addGroup(m,w,0),m+=w}function E(_){let T=x,w=new bt,A=new D,v=0,b=_===!0?t:e,R=_===!0?1:-1;for(let k=1;k<=s;k++)u.push(0,p*R,0),d.push(0,R,0),f.push(.5,.5),x++;let P=x;for(let k=0;k<=s;k++){let I=k/s*l+a,U=Math.cos(I),V=Math.sin(I);A.x=b*V,A.y=p*R,A.z=b*U,u.push(A.x,A.y,A.z),d.push(0,R,0),w.x=U*.5+.5,w.y=V*.5*R+.5,f.push(w.x,w.y),x++}for(let k=0;k<s;k++){let B=T+k,I=P+k;_===!0?h.push(I,I+1,B):h.push(I+1,I,B),v+=3}c.addGroup(m,v,_===!0?1:2),m+=v}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var oc=class n extends Me{constructor(t=[],e=[],i=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:i,detail:s};let r=[],o=[];a(s),c(i),h(),this.setAttribute("position",new Jt(r,3)),this.setAttribute("normal",new Jt(r.slice(),3)),this.setAttribute("uv",new Jt(o,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function a(M){let E=new D,_=new D,T=new D;for(let w=0;w<e.length;w+=3)f(e[w+0],E),f(e[w+1],_),f(e[w+2],T),l(E,_,T,M)}function l(M,E,_,T){let w=T+1,A=[];for(let v=0;v<=w;v++){A[v]=[];let b=M.clone().lerp(_,v/w),R=E.clone().lerp(_,v/w),P=w-v;for(let k=0;k<=P;k++)k===0&&v===w?A[v][k]=b:A[v][k]=b.clone().lerp(R,k/P)}for(let v=0;v<w;v++)for(let b=0;b<2*(w-v)-1;b++){let R=Math.floor(b/2);b%2===0?(d(A[v][R+1]),d(A[v+1][R]),d(A[v][R])):(d(A[v][R+1]),d(A[v+1][R+1]),d(A[v+1][R]))}}function c(M){let E=new D;for(let _=0;_<r.length;_+=3)E.x=r[_+0],E.y=r[_+1],E.z=r[_+2],E.normalize().multiplyScalar(M),r[_+0]=E.x,r[_+1]=E.y,r[_+2]=E.z}function h(){let M=new D;for(let E=0;E<r.length;E+=3){M.x=r[E+0],M.y=r[E+1],M.z=r[E+2];let _=p(M)/2/Math.PI+.5,T=m(M)/Math.PI+.5;o.push(_,1-T)}x(),u()}function u(){for(let M=0;M<o.length;M+=6){let E=o[M+0],_=o[M+2],T=o[M+4],w=Math.max(E,_,T),A=Math.min(E,_,T);w>.9&&A<.1&&(E<.2&&(o[M+0]+=1),_<.2&&(o[M+2]+=1),T<.2&&(o[M+4]+=1))}}function d(M){r.push(M.x,M.y,M.z)}function f(M,E){let _=M*3;E.x=t[_+0],E.y=t[_+1],E.z=t[_+2]}function x(){let M=new D,E=new D,_=new D,T=new D,w=new bt,A=new bt,v=new bt;for(let b=0,R=0;b<r.length;b+=9,R+=6){M.set(r[b+0],r[b+1],r[b+2]),E.set(r[b+3],r[b+4],r[b+5]),_.set(r[b+6],r[b+7],r[b+8]),w.set(o[R+0],o[R+1]),A.set(o[R+2],o[R+3]),v.set(o[R+4],o[R+5]),T.copy(M).add(E).add(_).divideScalar(3);let P=p(T);g(w,R+0,M,P),g(A,R+2,E,P),g(v,R+4,_,P)}}function g(M,E,_,T){T<0&&M.x===1&&(o[E]=M.x-1),_.x===0&&_.z===0&&(o[E]=T/2/Math.PI+.5)}function p(M){return Math.atan2(M.z,-M.x)}function m(M){return Math.atan2(-M.y,Math.sqrt(M.x*M.x+M.z*M.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.vertices,t.indices,t.radius,t.detail)}};var ra=class n extends oc{constructor(t=1,e=0){let i=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],s=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(i,s,t,e),this.type="OctahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new n(t.radius,t.detail)}},ke=class n extends Me{constructor(t=1,e=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:i,heightSegments:s};let r=t/2,o=e/2,a=Math.floor(i),l=Math.floor(s),c=a+1,h=l+1,u=t/a,d=e/l,f=[],x=[],g=[],p=[];for(let m=0;m<h;m++){let M=m*d-o;for(let E=0;E<c;E++){let _=E*u-r;x.push(_,-M,0),g.push(0,0,1),p.push(E/a),p.push(1-m/l)}}for(let m=0;m<l;m++)for(let M=0;M<a;M++){let E=M+c*m,_=M+c*(m+1),T=M+1+c*(m+1),w=M+1+c*m;f.push(E,_,w),f.push(_,T,w)}this.setIndex(f),this.setAttribute("position",new Jt(x,3)),this.setAttribute("normal",new Jt(g,3)),this.setAttribute("uv",new Jt(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.width,t.height,t.widthSegments,t.heightSegments)}};var oa=class n extends Me{constructor(t=1,e=32,i=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:i,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},e=Math.max(3,Math.floor(e)),i=Math.max(2,Math.floor(i));let l=Math.min(o+a,Math.PI),c=0,h=[],u=new D,d=new D,f=[],x=[],g=[],p=[];for(let m=0;m<=i;m++){let M=[],E=m/i,_=o+E*a,T=t*Math.cos(_),w=Math.sqrt(t*t-T*T),A=0;m===0&&o===0?A=.5/e:m===i&&l===Math.PI&&(A=-.5/e);for(let v=0;v<=e;v++){let b=v/e,R=s+b*r;u.x=-w*Math.cos(R),u.y=T,u.z=w*Math.sin(R),x.push(u.x,u.y,u.z),d.copy(u).normalize(),g.push(d.x,d.y,d.z),p.push(b+A,1-E),M.push(c++)}h.push(M)}for(let m=0;m<i;m++)for(let M=0;M<e;M++){let E=h[m][M+1],_=h[m][M],T=h[m+1][M],w=h[m+1][M+1];(m!==0||o>0)&&f.push(E,_,w),(m!==i-1||l<Math.PI)&&f.push(_,T,w)}this.setIndex(f),this.setAttribute("position",new Jt(x,3)),this.setAttribute("normal",new Jt(g,3)),this.setAttribute("uv",new Jt(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};var Nr=class n extends Me{constructor(t=1,e=.4,i=12,s=48,r=Math.PI*2,o=0,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:i,tubularSegments:s,arc:r,thetaStart:o,thetaLength:a},i=Math.floor(i),s=Math.floor(s);let l=[],c=[],h=[],u=[],d=new D,f=new D,x=new D;for(let g=0;g<=i;g++){let p=o+g/i*a;for(let m=0;m<=s;m++){let M=m/s*r;f.x=(t+e*Math.cos(p))*Math.cos(M),f.y=(t+e*Math.cos(p))*Math.sin(M),f.z=e*Math.sin(p),c.push(f.x,f.y,f.z),d.x=t*Math.cos(M),d.y=t*Math.sin(M),x.subVectors(f,d).normalize(),h.push(x.x,x.y,x.z),u.push(m/s),u.push(g/i)}}for(let g=1;g<=i;g++)for(let p=1;p<=s;p++){let m=(s+1)*g+p-1,M=(s+1)*(g-1)+p-1,E=(s+1)*(g-1)+p,_=(s+1)*g+p;l.push(m,M,_),l.push(M,E,_)}this.setIndex(l),this.setAttribute("position",new Jt(c,3)),this.setAttribute("normal",new Jt(h,3)),this.setAttribute("uv",new Jt(u,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new n(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}};var Or=class extends $i{constructor(t){super(),this.isShadowMaterial=!0,this.type="ShadowMaterial",this.color=new Ct(0),this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.fog=t.fog,this}};function Ns(n){let t={};for(let e in n){t[e]={};for(let i in n[e]){let s=n[e][i];if(hg(s))s.isRenderTargetTexture?(Ot("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][i]=null):t[e][i]=s.clone();else if(Array.isArray(s))if(hg(s[0])){let r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();t[e][i]=r}else t[e][i]=s.slice();else t[e][i]=s}}return t}function li(n){let t={};for(let e=0;e<n.length;e++){let i=Ns(n[e]);for(let s in i)t[s]=i[s]}return t}function hg(n){return n&&(n.isColor||n.isMatrix3||n.isMatrix4||n.isVector2||n.isVector3||n.isVector4||n.isTexture||n.isQuaternion)}function n_(n){let t=[];for(let e=0;e<n.length;e++)t.push(n[e].clone());return t}function of(n){let t=n.getRenderTarget();return t===null?n.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Yt.workingColorSpace}var Os={clone:Ns,merge:li},s_=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,r_=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Le=class extends $i{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=s_,this.fragmentShader=r_,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Ns(t.uniforms),this.uniformsGroups=n_(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let i={};for(let s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(e.extensions=i),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let i in t.uniforms){let s=t.uniforms[i];switch(this.uniforms[i]={},s.type){case"t":this.uniforms[i].value=e[s.value]||null;break;case"c":this.uniforms[i].value=new Ct().setHex(s.value);break;case"v2":this.uniforms[i].value=new bt().fromArray(s.value);break;case"v3":this.uniforms[i].value=new D().fromArray(s.value);break;case"v4":this.uniforms[i].value=new _e().fromArray(s.value);break;case"m3":this.uniforms[i].value=new Ht().fromArray(s.value);break;case"m4":this.uniforms[i].value=new fe().fromArray(s.value);break;default:this.uniforms[i].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let i in t.extensions)this.extensions[i]=t.extensions[i];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},ac=class extends Le{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},ei=class extends $i{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ct(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ct(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=oh,this.normalScale=new bt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new In,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}},Fr=class extends ei{constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new bt(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return jt(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Ct(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Ct(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Ct(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(t){this._retroreflectivity>0!=t>0&&this.version++,this._retroreflectivity=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.retroreflectivity=t.retroreflectivity,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}};var lc=class extends $i{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Gg,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},cc=class extends $i{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function br(n,t){return!n||n.constructor===t?n:typeof t.BYTES_PER_ELEMENT=="number"?new t(n):Array.prototype.slice.call(n)}function wd(n){return n!==void 0&&n.inTangents!==void 0&&n.outTangents!==void 0}var Qn=class{constructor(t,e,i,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(i),this.sampleValues=e,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,i=this._cachedIndex,s=e[i],r=e[i-1];t:{e:{let o;i:{n:if(!(t<s)){for(let a=i+2;;){if(s===void 0){if(t<r)break n;return i=e.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===a)break;if(r=s,s=e[++i],t<s)break e}o=e.length;break i}if(!(t>=r)){let a=e[1];t<a&&(i=2,r=a);for(let l=i-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===l)break;if(s=r,r=e[--i-1],t>=r)break e}o=i,i=0;break i}break t}for(;i<o;){let a=i+o>>>1;t<e[a]?o=a:i=a+1}if(s=e[i],r=e[i-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return i=e.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,r,s)}return this.interpolate_(i,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,i=this.sampleValues,s=this.valueSize,r=t*s;for(let o=0;o!==s;++o)e[o]=i[r+o];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},hc=class extends Qn{constructor(t,e,i,s){super(t,e,i,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Ad,endingEnd:Ad}}intervalChanged_(t,e,i){let s=this.parameterPositions,r=t-2,o=t+1,a=s[r],l=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case Cd:r=t,a=2*e-i;break;case Rd:r=s.length-2,a=e+s[r]-s[r+1];break;default:r=t,a=i}if(l===void 0)switch(this.getSettings_().endingEnd){case Cd:o=t,l=2*i-e;break;case Rd:o=1,l=i+s[1]-s[0];break;default:o=t-1,l=e}let c=(i-e)*.5,h=this.valueSize;this._weightPrev=c/(e-a),this._weightNext=c/(l-i),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(t,e,i,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,x=(i-e)/(s-e),g=x*x,p=g*x,m=-d*p+2*d*g-d*x,M=(1+d)*p+(-1.5-2*d)*g+(-.5+d)*x+1,E=(-1-f)*p+(1.5+f)*g+.5*x,_=f*p-f*g;for(let T=0;T!==a;++T)r[T]=m*o[h+T]+M*o[c+T]+E*o[l+T]+_*o[u+T];return r}},uc=class extends Qn{constructor(t,e,i,s){super(t,e,i,s)}interpolate_(t,e,i,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=(i-e)/(s-e),u=1-h;for(let d=0;d!==a;++d)r[d]=o[c+d]*u+o[l+d]*h;return r}},dc=class extends Qn{constructor(t,e,i,s){super(t,e,i,s)}interpolate_(t){return this.copySampleValue_(t-1)}},fc=class extends Qn{interpolate_(t,e,i,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this.inTangents,u=this.outTangents;if(!h||!u){let x=(i-e)/(s-e),g=1-x;for(let p=0;p!==a;++p)r[p]=o[c+p]*g+o[l+p]*x;return r}let d=a*2,f=t-1;for(let x=0;x!==a;++x){let g=o[c+x],p=o[l+x],m=f*d+x*2,M=u[m],E=u[m+1],_=t*d+x*2,T=h[_],w=h[_+1],A=a_(i,e,M,T,s);r[x]=n0(A,g,E,w,p)}return r}};function n0(n,t,e,i,s){let r=1-n;return r*r*r*t+3*r*r*n*e+3*r*n*n*i+n*n*n*s}function o_(n,t,e,i,s){let r=1-n;return 3*r*r*(e-t)+6*r*n*(i-e)+3*n*n*(s-i)}function a_(n,t,e,i,s){let r=(n-t)/(s-t);for(let o=0;o<8;o++){let a=n0(r,t,e,i,s)-n;if(Math.abs(a)<1e-10)break;let l=o_(r,t,e,i,s);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-a/l))}return r}var Ei=class{constructor(t,e,i,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=br(e,this.TimeBufferType),this.values=br(i,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,i;if(e.toJSON!==this.toJSON)i=e.toJSON(t);else{i={name:t.name,times:br(t.times,Array),values:br(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(i.interpolation=s),wd(t.settings)&&(i.settings={inTangents:br(t.settings.inTangents,Array),outTangents:br(t.settings.outTangents,Array)})}return i.type=t.ValueTypeName,i}InterpolantFactoryMethodDiscrete(t){return new dc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new uc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new hc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new fc(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case Wo:e=this.InterpolantFactoryMethodDiscrete;break;case tc:e=this.InterpolantFactoryMethodLinear;break;case Vl:e=this.InterpolantFactoryMethodSmooth;break;case Ed:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return Ot("KeyframeTrack:",i),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Wo;case this.InterpolantFactoryMethodLinear:return tc;case this.InterpolantFactoryMethodSmooth:return Vl;case this.InterpolantFactoryMethodBezier:return Ed}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let i=0,s=e.length;i!==s;++i)e[i]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let i=0,s=e.length;i!==s;++i)e[i]*=t;wd(this.settings)&&(ug(this.settings.inTangents,t),ug(this.settings.outTangents,t))}return this}trim(t,e){let i=this.times,s=i.length,r=0,o=s-1;for(;r!==s&&i[r]<t;)++r;for(;o!==-1&&i[o]>e;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=i.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(Nt("KeyframeTrack: Invalid value size in track.",this),t=!1);let i=this.times,s=this.values,r=i.length;r===0&&(Nt("KeyframeTrack: Track is empty.",this),t=!1);let o=null;for(let a=0;a!==r;a++){let l=i[a];if(typeof l=="number"&&isNaN(l)){Nt("KeyframeTrack: Time is not a valid number.",this,a,l),t=!1;break}if(o!==null&&o>l){Nt("KeyframeTrack: Out of order keys.",this,a,l,o),t=!1;break}o=l}if(s!==void 0&&Fv(s))for(let a=0,l=s.length;a!==l;++a){let c=s[a];if(isNaN(c)){Nt("KeyframeTrack: Value is not a valid number.",this,a,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),i=this.getValueSize(),s=this.getInterpolation()===Vl,r=t.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=t[a],h=t[a+1];if(c!==h&&(a!==1||c!==t[0]))if(s)l=!0;else{let u=a*i,d=u-i,f=u+i;for(let x=0;x!==i;++x){let g=e[u+x];if(g!==e[d+x]||g!==e[f+x]){l=!0;break}}}if(l){if(a!==o){t[o]=t[a];let u=a*i,d=o*i;for(let f=0;f!==i;++f)e[d+f]=e[u+f]}++o}}if(r>0){t[o]=t[r];for(let a=r*i,l=o*i,c=0;c!==i;++c)e[l+c]=e[a+c];++o}return o!==t.length?(this.times=t.slice(0,o),this.values=e.slice(0,o*i)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),i=this.constructor,s=new i(this.name,t,e);return s.createInterpolant=this.createInterpolant,wd(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function ug(n,t){for(let e=0,i=n.length;e!==i;e+=2)n[e]*=t}Ei.prototype.ValueTypeName="";Ei.prototype.TimeBufferType=Float32Array;Ei.prototype.ValueBufferType=Float32Array;Ei.prototype.DefaultInterpolation=tc;var ts=class extends Ei{constructor(t,e,i){super(t,e,i)}};ts.prototype.ValueTypeName="bool";ts.prototype.ValueBufferType=Array;ts.prototype.DefaultInterpolation=Wo;ts.prototype.InterpolantFactoryMethodLinear=void 0;ts.prototype.InterpolantFactoryMethodSmooth=void 0;var pc=class extends Ei{constructor(t,e,i,s){super(t,e,i,s)}};pc.prototype.ValueTypeName="color";var mc=class extends Ei{constructor(t,e,i,s){super(t,e,i,s)}};mc.prototype.ValueTypeName="number";var gc=class extends Qn{constructor(t,e,i,s){super(t,e,i,s)}interpolate_(t,e,i,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(i-e)/(s-e),c=t*a;for(let h=c+a;c!==h;c+=4)cn.slerpFlat(r,0,o,c-a,o,c,l);return r}},aa=class extends Ei{constructor(t,e,i,s){super(t,e,i,s)}InterpolantFactoryMethodLinear(t){return new gc(this.times,this.values,this.getValueSize(),t)}};aa.prototype.ValueTypeName="quaternion";aa.prototype.InterpolantFactoryMethodSmooth=void 0;var es=class extends Ei{constructor(t,e,i){super(t,e,i)}};es.prototype.ValueTypeName="string";es.prototype.ValueBufferType=Array;es.prototype.DefaultInterpolation=Wo;es.prototype.InterpolantFactoryMethodLinear=void 0;es.prototype.InterpolantFactoryMethodSmooth=void 0;var xc=class extends Ei{constructor(t,e,i,s){super(t,e,i,s)}};xc.prototype.ValueTypeName="vector";var yc=class{constructor(t,e,i){let s=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=i,this._abortController=null,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){let u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){let f=c[u],x=c[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return x}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},s0=new yc,vc=class{constructor(t){this.manager=t!==void 0?t:s0,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let i=this;return new Promise(function(s,r){i.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};vc.DEFAULT_MATERIAL_NAME="__DEFAULT";var Ur=class extends ti{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Ct(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}};var Td=new fe,dg=new D,fg=new D,la=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new bt(512,512),this.mapType=vi,this.map=null,this.mapPass=null,this.matrix=new fe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Dr,this._frameExtents=new bt(1,1),this._viewportCount=1,this._viewports=[new _e(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;dg.setFromMatrixPosition(t.matrixWorld),e.position.copy(dg),fg.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(fg),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,i,s){Td.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),i.setFromProjectionMatrix(Td,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,o=s?s.z/r.x:1,a=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;t.coordinateSystem===Ar||t.reversedDepth?e.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,1,0,0,0,0,1):e.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,.5,.5,0,0,0,1),e.multiply(Td)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},Hl=new D,Gl=new cn,sn=new D,ca=class extends ti{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new fe,this.projectionMatrix=new fe,this.projectionMatrixInverse=new fe,this.coordinateSystem=Xi,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(Hl,Gl,sn),sn.x===1&&sn.y===1&&sn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Hl,Gl,sn.set(1,1,1)).invert()}updateWorldMatrix(t,e,i=!1){super.updateWorldMatrix(t,e,i),this.matrixWorld.decompose(Hl,Gl,sn),sn.x===1&&sn.y===1&&sn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Hl,Gl,sn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},qn=new D,pg=new bt,mg=new bt,Ye=class extends ca{constructor(t=50,e=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=Yo*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(id*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Yo*2*Math.atan(Math.tan(id*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,i){qn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(qn.x,qn.y).multiplyScalar(-t/qn.z),qn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(qn.x,qn.y).multiplyScalar(-t/qn.z)}getViewSize(t,e){return this.getViewBounds(t,pg,mg),e.subVectors(mg,pg)}setViewOffset(t,e,i,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(id*.5*this.fov)/this.zoom,i=2*e,s=this.aspect*i,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,e-=o.offsetY*i/c,s*=o.width/l,i*=o.height/c}let a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-i,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}},Id=class extends la{constructor(){super(new Ye(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(t){let e=this.camera,i=Yo*2*t.angle*this.focus,s=this.mapSize.width/this.mapSize.height*this.aspect,r=t.distance||e.far;(i!==e.fov||s!==e.aspect||r!==e.far)&&(e.fov=i,e.aspect=s,e.far=r,e.updateProjectionMatrix()),super.updateMatrices(t)}copy(t){return super.copy(t),this.focus=t.focus,this.aspect=t.aspect,this}toJSON(){let t=super.toJSON();return t.focus=this.focus,t.aspect=this.aspect,t}},Br=class extends Ur{constructor(t,e,i=0,s=Math.PI/3,r=0,o=2){super(t,e),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(ti.DEFAULT_UP),this.updateMatrix(),this.target=new ti,this.distance=i,this.angle=s,this.penumbra=r,this.decay=o,this.map=null,this.shadow=new Id}get power(){return this.intensity*Math.PI}set power(t){this.intensity=t/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.angle=t.angle,this.penumbra=t.penumbra,this.decay=t.decay,this.target=t.target.clone(),this.map=t.map,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.angle=this.angle,e.object.decay=this.decay,e.object.penumbra=this.penumbra,e.object.target=this.target.uuid,this.map&&this.map.isTexture&&(e.object.map=this.map.toJSON(t).uuid),e.object.shadow=this.shadow.toJSON(),e}},kd=class extends la{constructor(){super(new Ye(90,1,.5,500)),this.isPointLightShadow=!0}},ha=class extends Ur{constructor(t,e,i=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=s,this.shadow=new kd}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}},Is=class extends ca{constructor(t=-1,e=1,i=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=i,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,i,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=i-t,o=i+t,a=s+e,l=s-e;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}};var ua=class extends Ur{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}};var Sr=-90,wr=1,_c=class extends ti{constructor(t,e,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new Ye(Sr,wr,t,e);s.layers=this.layers,this.add(s);let r=new Ye(Sr,wr,t,e);r.layers=this.layers,this.add(r);let o=new Ye(Sr,wr,t,e);o.layers=this.layers,this.add(o);let a=new Ye(Sr,wr,t,e);a.layers=this.layers,this.add(a);let l=new Ye(Sr,wr,t,e);l.layers=this.layers,this.add(l);let c=new Ye(Sr,wr,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[i,s,r,o,a,l]=e;for(let c of e)this.remove(c);if(t===Xi)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Ar)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,h]=this.children,u=t.getRenderTarget(),d=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),x=t.xr.enabled;t.xr.enabled=!1;let g=i.texture.generateMipmaps;i.texture.generateMipmaps=!1;let p=!1;t.isWebGLRenderer===!0?p=t.state.buffers.depth.getReversed():p=t.reversedDepthBuffer,t.setRenderTarget(i,0,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(i,1,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(i,2,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(i,3,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(i,4,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),i.texture.generateMipmaps=g,t.setRenderTarget(i,5,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(u,d,f),t.xr.enabled=x,i.texture.needsPMREMUpdate=!0}},Mc=class extends Ye{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}},da=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(t){this._document=t,t.hidden!==void 0&&(this._pageVisibilityHandler=l_.bind(this),t.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(t){return this._timescale=t,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(t){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(t!==void 0?t:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function l_(){this._document.hidden===!1&&this.reset()}var af="\\[\\]\\.:\\/",c_=new RegExp("["+af+"]","g"),lf="[^"+af+"]",h_="[^"+af.replace("\\.","")+"]",u_=/((?:WC+[\/:])*)/.source.replace("WC",lf),d_=/(WCOD+)?/.source.replace("WCOD",h_),f_=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",lf),p_=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",lf),m_=new RegExp("^"+u_+d_+f_+p_+"$"),g_=["material","materials","bones","map"],Ld=class{constructor(t,e,i){let s=i||me.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let i=this._targetGroup.nCachedObjects_,s=this._bindings[i];s!==void 0&&s.getValue(t,e)}setValue(t,e){let i=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=i.length;s!==r;++s)i[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,i=t.length;e!==i;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,i=t.length;e!==i;++e)t[e].unbind()}},me=class n{constructor(t,e,i){this.path=e,this.parsedPath=i||n.parseTrackName(e),this.node=n.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,i){return t&&t.isAnimationObjectGroup?new n.Composite(t,e,i):new n(t,e,i)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(c_,"")}static parseTrackName(t){let e=m_.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let i={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=i.nodeName&&i.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=i.nodeName.substring(s+1);g_.indexOf(r)!==-1&&(i.nodeName=i.nodeName.substring(0,s),i.objectName=r)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return i}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let i=t.skeleton.getBoneByName(e);if(i!==void 0)return i}if(t.children){let i=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===e||a.uuid===e)return a;let l=i(a.children);if(l)return l}return null},s=i(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)t[e++]=i[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,i=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=n.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){Ot("PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let c=e.objectIndex;switch(i){case"materials":if(!t.material){Nt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){Nt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){Nt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){Nt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){Nt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[i]===void 0){Nt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[i]}if(c!==void 0){if(t[c]===void 0){Nt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let o=t[s];if(o===void 0){let c=e.nodeName;Nt("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",t);return}let a=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?a=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){Nt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){Nt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};me.Composite=Ld;me.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};me.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};me.prototype.GetterByBindingType=[me.prototype._getValue_direct,me.prototype._getValue_array,me.prototype._getValue_arrayElement,me.prototype._getValue_toArray];me.prototype.SetterByBindingTypeAndVersioning=[[me.prototype._setValue_direct,me.prototype._setValue_direct_setNeedsUpdate,me.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[me.prototype._setValue_array,me.prototype._setValue_array_setNeedsUpdate,me.prototype._setValue_array_setMatrixWorldNeedsUpdate],[me.prototype._setValue_arrayElement,me.prototype._setValue_arrayElement_setNeedsUpdate,me.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[me.prototype._setValue_fromArray,me.prototype._setValue_fromArray_setNeedsUpdate,me.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var RE=new Float32Array(1);var gg=new fe,fa=class{constructor(t,e,i=0,s=1/0){this.ray=new kr(t,e),this.near=i,this.far=s,this.camera=null,this.layers=new Pr,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):Nt("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return gg.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(gg),this}intersectObject(t,e=!0,i=[]){return Dd(t,this,i,e),i.sort(xg),i}intersectObjects(t,e=!0,i=[]){for(let s=0,r=t.length;s<r;s++)Dd(t[s],this,i,e);return i.sort(xg),i}};function xg(n,t){return n.distance-t.distance}function Dd(n,t,e,i){let s=!0;if(n.layers.test(t.layers)&&n.raycast(t,e)===!1&&(s=!1),s===!0&&i===!0){let r=n.children;for(let o=0,a=r.length;o<a;o++)Dd(r[o],t,e,!0)}}var Nd=class n{static{n.prototype.isMatrix2=!0}constructor(t,e,i,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,i,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let i=0;i<4;i++)this.elements[i]=t[i+e];return this}set(t,e,i,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=i,r[3]=s,this}};function cf(n,t,e,i){let s=x_(i);switch(e){case tf:return n*t;case nf:return n*t/s.components*s.byteLength;case Ac:return n*t/s.components*s.byteLength;case os:return n*t*2/s.components*s.byteLength;case Cc:return n*t*2/s.components*s.byteLength;case ef:return n*t*3/s.components*s.byteLength;case _i:return n*t*4/s.components*s.byteLength;case Rc:return n*t*4/s.components*s.byteLength;case ga:case xa:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case ya:case va:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case Ic:case Lc:return Math.max(n,16)*Math.max(t,8)/4;case Pc:case kc:return Math.max(n,8)*Math.max(t,8)/2;case Dc:case Nc:case Fc:case Uc:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case Oc:case _a:case Bc:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case zc:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case Hc:return Math.floor((n+4)/5)*Math.floor((t+3)/4)*16;case Gc:return Math.floor((n+4)/5)*Math.floor((t+4)/5)*16;case Vc:return Math.floor((n+5)/6)*Math.floor((t+4)/5)*16;case Wc:return Math.floor((n+5)/6)*Math.floor((t+5)/6)*16;case Xc:return Math.floor((n+7)/8)*Math.floor((t+4)/5)*16;case $c:return Math.floor((n+7)/8)*Math.floor((t+5)/6)*16;case Zc:return Math.floor((n+7)/8)*Math.floor((t+7)/8)*16;case qc:return Math.floor((n+9)/10)*Math.floor((t+4)/5)*16;case Yc:return Math.floor((n+9)/10)*Math.floor((t+5)/6)*16;case jc:return Math.floor((n+9)/10)*Math.floor((t+7)/8)*16;case Kc:return Math.floor((n+9)/10)*Math.floor((t+9)/10)*16;case Jc:return Math.floor((n+11)/12)*Math.floor((t+9)/10)*16;case Qc:return Math.floor((n+11)/12)*Math.floor((t+11)/12)*16;case th:case eh:case ih:return Math.ceil(n/4)*Math.ceil(t/4)*16;case nh:case sh:return Math.ceil(n/4)*Math.ceil(t/4)*8;case Ma:case rh:return Math.ceil(n/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function x_(n){switch(n){case vi:case jd:return{byteLength:1,components:1};case Gr:case Kd:case We:return{byteLength:2,components:1};case Tc:case Ec:return{byteLength:2,components:4};case qi:case wc:case Yi:return{byteLength:4,components:1};case Jd:case Qd:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?Ot("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function E0(){let n=null,t=!1,e=null,i=null;function s(r,o){i=n.requestAnimationFrame(s),e(r,o)}return{start:function(){t!==!0&&e!==null&&n!==null&&(i=n.requestAnimationFrame(s),t=!0)},stop:function(){n!==null&&n.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){n=r}}}function v_(n){let t=new WeakMap;function e(a,l){let c=a.array,h=a.usage,u=c.byteLength,d=n.createBuffer();n.bindBuffer(l,d),n.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=n.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=n.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=n.HALF_FLOAT:f=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=n.SHORT;else if(c instanceof Uint32Array)f=n.UNSIGNED_INT;else if(c instanceof Int32Array)f=n.INT;else if(c instanceof Int8Array)f=n.BYTE;else if(c instanceof Uint8Array)f=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:u}}function i(a,l,c){let h=l.array,u=l.updateRanges;if(n.bindBuffer(c,a),u.length===0)n.bufferSubData(c,0,h);else{u.sort((f,x)=>f.start-x.start);let d=0;for(let f=1;f<u.length;f++){let x=u[d],g=u[f];g.start<=x.start+x.count+1?x.count=Math.max(x.count,g.start+g.count-x.start):(++d,u[d]=g)}u.length=d+1;for(let f=0,x=u.length;f<x;f++){let g=u[f];n.bufferSubData(c,g.start*h.BYTES_PER_ELEMENT,h,g.start,g.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=t.get(a);l&&(n.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var __=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,M_=`#ifdef USE_ALPHAHASH
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
#endif`,b_=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,S_=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,w_=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,T_=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,E_=`#ifdef USE_AOMAP
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
#endif`,A_=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,C_=`#ifdef USE_BATCHING
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
#endif`,R_=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,P_=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,I_=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,k_=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,L_=`#ifdef USE_IRIDESCENCE
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
#endif`,D_=`#ifdef USE_BUMPMAP
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
#endif`,N_=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,O_=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,F_=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,U_=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,B_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,z_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,H_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,G_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,V_=`#define PI 3.141592653589793
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
} // validated`,W_=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,X_=`vec3 transformedNormal = objectNormal;
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
#endif`,$_=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Z_=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,q_=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Y_=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,j_="gl_FragColor = linearToOutputTexel( gl_FragColor );",K_=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,J_=`#ifdef USE_ENVMAP
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
#endif`,Q_=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,tM=`#ifdef USE_ENVMAP
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
#endif`,eM=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,iM=`#ifdef USE_ENVMAP
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
#endif`,nM=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,sM=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,rM=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,oM=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,aM=`#ifdef USE_GRADIENTMAP
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
}`,lM=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,cM=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,hM=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,uM=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,dM=`#ifdef USE_ENVMAP
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
#endif`,fM=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,pM=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,mM=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,gM=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,xM=`PhysicalMaterial material;
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
#endif`,yM=`uniform sampler2D dfgLUT;
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
}`,vM=`
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
#endif`,_M=`#if defined( RE_IndirectDiffuse )
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
#endif`,MM=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,bM=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,SM=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,wM=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,TM=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,EM=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,AM=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,CM=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,RM=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,PM=`#if defined( USE_POINTS_UV )
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
#endif`,IM=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,kM=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,LM=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,DM=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,NM=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,OM=`#ifdef USE_MORPHTARGETS
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
#endif`,FM=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,UM=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,BM=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,zM=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,HM=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,GM=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,VM=`#ifdef USE_NORMALMAP
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
#endif`,WM=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,XM=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,$M=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,ZM=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,qM=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,YM=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,jM=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,KM=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,JM=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,QM=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,tb=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,eb=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,ib=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,nb=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,sb=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,rb=`float getShadowMask() {
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
}`,ob=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,ab=`#ifdef USE_SKINNING
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
#endif`,lb=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,cb=`#ifdef USE_SKINNING
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
#endif`,hb=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,ub=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,db=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,fb=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,pb=`#ifdef USE_TRANSMISSION
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
#endif`,mb=`#ifdef USE_TRANSMISSION
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
#endif`,gb=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,xb=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,yb=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,vb=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,_b=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Mb=`uniform sampler2D t2D;
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
}`,bb=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Sb=`#ifdef ENVMAP_TYPE_CUBE
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
}`,wb=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Tb=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Eb=`#include <common>
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
}`,Ab=`#if DEPTH_PACKING == 3200
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
}`,Cb=`#define DISTANCE
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
}`,Rb=`#define DISTANCE
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
}`,Pb=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Ib=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,kb=`uniform float scale;
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
}`,Lb=`uniform vec3 diffuse;
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
}`,Db=`#include <common>
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
}`,Nb=`uniform vec3 diffuse;
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
}`,Ob=`#define LAMBERT
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
}`,Fb=`#define LAMBERT
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
}`,Ub=`#define MATCAP
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
}`,Bb=`#define MATCAP
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
}`,zb=`#define NORMAL
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
}`,Hb=`#define NORMAL
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
}`,Gb=`#define PHONG
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
}`,Vb=`#define PHONG
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
}`,Wb=`#define STANDARD
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
}`,Xb=`#define STANDARD
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
}`,$b=`#define TOON
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
}`,Zb=`#define TOON
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
}`,qb=`uniform float size;
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
}`,Yb=`uniform vec3 diffuse;
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
}`,jb=`#include <common>
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
}`,Kb=`uniform vec3 color;
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
}`,Jb=`uniform float rotation;
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
}`,Qb=`uniform vec3 diffuse;
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
}`,Wt={alphahash_fragment:__,alphahash_pars_fragment:M_,alphamap_fragment:b_,alphamap_pars_fragment:S_,alphatest_fragment:w_,alphatest_pars_fragment:T_,aomap_fragment:E_,aomap_pars_fragment:A_,batching_pars_vertex:C_,batching_vertex:R_,begin_vertex:P_,beginnormal_vertex:I_,bsdfs:k_,iridescence_fragment:L_,bumpmap_pars_fragment:D_,clipping_planes_fragment:N_,clipping_planes_pars_fragment:O_,clipping_planes_pars_vertex:F_,clipping_planes_vertex:U_,color_fragment:B_,color_pars_fragment:z_,color_pars_vertex:H_,color_vertex:G_,common:V_,cube_uv_reflection_fragment:W_,defaultnormal_vertex:X_,displacementmap_pars_vertex:$_,displacementmap_vertex:Z_,emissivemap_fragment:q_,emissivemap_pars_fragment:Y_,colorspace_fragment:j_,colorspace_pars_fragment:K_,envmap_fragment:J_,envmap_common_pars_fragment:Q_,envmap_pars_fragment:tM,envmap_pars_vertex:eM,envmap_physical_pars_fragment:dM,envmap_vertex:iM,fog_vertex:nM,fog_pars_vertex:sM,fog_fragment:rM,fog_pars_fragment:oM,gradientmap_pars_fragment:aM,lightmap_pars_fragment:lM,lights_lambert_fragment:cM,lights_lambert_pars_fragment:hM,lights_pars_begin:uM,lights_toon_fragment:fM,lights_toon_pars_fragment:pM,lights_phong_fragment:mM,lights_phong_pars_fragment:gM,lights_physical_fragment:xM,lights_physical_pars_fragment:yM,lights_fragment_begin:vM,lights_fragment_maps:_M,lights_fragment_end:MM,lightprobes_pars_fragment:bM,logdepthbuf_fragment:SM,logdepthbuf_pars_fragment:wM,logdepthbuf_pars_vertex:TM,logdepthbuf_vertex:EM,map_fragment:AM,map_pars_fragment:CM,map_particle_fragment:RM,map_particle_pars_fragment:PM,metalnessmap_fragment:IM,metalnessmap_pars_fragment:kM,morphinstance_vertex:LM,morphcolor_vertex:DM,morphnormal_vertex:NM,morphtarget_pars_vertex:OM,morphtarget_vertex:FM,normal_fragment_begin:UM,normal_fragment_maps:BM,normal_pars_fragment:zM,normal_pars_vertex:HM,normal_vertex:GM,normalmap_pars_fragment:VM,clearcoat_normal_fragment_begin:WM,clearcoat_normal_fragment_maps:XM,clearcoat_pars_fragment:$M,iridescence_pars_fragment:ZM,opaque_fragment:qM,packing:YM,premultiplied_alpha_fragment:jM,project_vertex:KM,dithering_fragment:JM,dithering_pars_fragment:QM,roughnessmap_fragment:tb,roughnessmap_pars_fragment:eb,shadowmap_pars_fragment:ib,shadowmap_pars_vertex:nb,shadowmap_vertex:sb,shadowmask_pars_fragment:rb,skinbase_vertex:ob,skinning_pars_vertex:ab,skinning_vertex:lb,skinnormal_vertex:cb,specularmap_fragment:hb,specularmap_pars_fragment:ub,tonemapping_fragment:db,tonemapping_pars_fragment:fb,transmission_fragment:pb,transmission_pars_fragment:mb,uv_pars_fragment:gb,uv_pars_vertex:xb,uv_vertex:yb,worldpos_vertex:vb,background_vert:_b,background_frag:Mb,backgroundCube_vert:bb,backgroundCube_frag:Sb,cube_vert:wb,cube_frag:Tb,depth_vert:Eb,depth_frag:Ab,distance_vert:Cb,distance_frag:Rb,equirect_vert:Pb,equirect_frag:Ib,linedashed_vert:kb,linedashed_frag:Lb,meshbasic_vert:Db,meshbasic_frag:Nb,meshlambert_vert:Ob,meshlambert_frag:Fb,meshmatcap_vert:Ub,meshmatcap_frag:Bb,meshnormal_vert:zb,meshnormal_frag:Hb,meshphong_vert:Gb,meshphong_frag:Vb,meshphysical_vert:Wb,meshphysical_frag:Xb,meshtoon_vert:$b,meshtoon_frag:Zb,points_vert:qb,points_frag:Yb,shadow_vert:jb,shadow_frag:Kb,sprite_vert:Jb,sprite_frag:Qb},pt={common:{diffuse:{value:new Ct(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ht},alphaMap:{value:null},alphaMapTransform:{value:new Ht},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ht}},envmap:{envMap:{value:null},envMapRotation:{value:new Ht},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ht}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ht}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ht},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ht},normalScale:{value:new bt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ht},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ht}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ht}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ht}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ct(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new D},probesMax:{value:new D},probesResolution:{value:new D}},points:{diffuse:{value:new Ct(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ht},alphaTest:{value:0},uvTransform:{value:new Ht}},sprite:{diffuse:{value:new Ct(16777215)},opacity:{value:1},center:{value:new bt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ht},alphaMap:{value:null},alphaMapTransform:{value:new Ht},alphaTest:{value:0}}},pn={basic:{uniforms:li([pt.common,pt.specularmap,pt.envmap,pt.aomap,pt.lightmap,pt.fog]),vertexShader:Wt.meshbasic_vert,fragmentShader:Wt.meshbasic_frag},lambert:{uniforms:li([pt.common,pt.specularmap,pt.envmap,pt.aomap,pt.lightmap,pt.emissivemap,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.fog,pt.lights,{emissive:{value:new Ct(0)},envMapIntensity:{value:1}}]),vertexShader:Wt.meshlambert_vert,fragmentShader:Wt.meshlambert_frag},phong:{uniforms:li([pt.common,pt.specularmap,pt.envmap,pt.aomap,pt.lightmap,pt.emissivemap,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.fog,pt.lights,{emissive:{value:new Ct(0)},specular:{value:new Ct(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Wt.meshphong_vert,fragmentShader:Wt.meshphong_frag},standard:{uniforms:li([pt.common,pt.envmap,pt.aomap,pt.lightmap,pt.emissivemap,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.roughnessmap,pt.metalnessmap,pt.fog,pt.lights,{emissive:{value:new Ct(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Wt.meshphysical_vert,fragmentShader:Wt.meshphysical_frag},toon:{uniforms:li([pt.common,pt.aomap,pt.lightmap,pt.emissivemap,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.gradientmap,pt.fog,pt.lights,{emissive:{value:new Ct(0)}}]),vertexShader:Wt.meshtoon_vert,fragmentShader:Wt.meshtoon_frag},matcap:{uniforms:li([pt.common,pt.bumpmap,pt.normalmap,pt.displacementmap,pt.fog,{matcap:{value:null}}]),vertexShader:Wt.meshmatcap_vert,fragmentShader:Wt.meshmatcap_frag},points:{uniforms:li([pt.points,pt.fog]),vertexShader:Wt.points_vert,fragmentShader:Wt.points_frag},dashed:{uniforms:li([pt.common,pt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Wt.linedashed_vert,fragmentShader:Wt.linedashed_frag},depth:{uniforms:li([pt.common,pt.displacementmap]),vertexShader:Wt.depth_vert,fragmentShader:Wt.depth_frag},normal:{uniforms:li([pt.common,pt.bumpmap,pt.normalmap,pt.displacementmap,{opacity:{value:1}}]),vertexShader:Wt.meshnormal_vert,fragmentShader:Wt.meshnormal_frag},sprite:{uniforms:li([pt.sprite,pt.fog]),vertexShader:Wt.sprite_vert,fragmentShader:Wt.sprite_frag},background:{uniforms:{uvTransform:{value:new Ht},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Wt.background_vert,fragmentShader:Wt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ht}},vertexShader:Wt.backgroundCube_vert,fragmentShader:Wt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Wt.cube_vert,fragmentShader:Wt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Wt.equirect_vert,fragmentShader:Wt.equirect_frag},distance:{uniforms:li([pt.common,pt.displacementmap,{referencePosition:{value:new D},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Wt.distance_vert,fragmentShader:Wt.distance_frag},shadow:{uniforms:li([pt.lights,pt.fog,{color:{value:new Ct(0)},opacity:{value:1}}]),vertexShader:Wt.shadow_vert,fragmentShader:Wt.shadow_frag}};pn.physical={uniforms:li([pn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ht},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ht},clearcoatNormalScale:{value:new bt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ht},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ht},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ht},sheen:{value:0},sheenColor:{value:new Ct(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ht},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ht},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ht},transmissionSamplerSize:{value:new bt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ht},attenuationDistance:{value:0},attenuationColor:{value:new Ct(0)},specularColor:{value:new Ct(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ht},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ht},anisotropyVector:{value:new bt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ht}}]),vertexShader:Wt.meshphysical_vert,fragmentShader:Wt.meshphysical_frag};var ch={r:0,b:0,g:0},tS=new fe,A0=new Ht;A0.set(-1,0,0,0,1,0,0,0,1);function eS(n,t,e,i,s,r){let o=new Ct(0),a=s===!0?0:1,l,c,h=null,u=0,d=null;function f(M){let E=M.isScene===!0?M.background:null;if(E&&E.isTexture){let _=M.backgroundBlurriness>0;E=t.get(E,_)}return E}function x(M){let E=!1,_=f(M);_===null?p(o,a):_&&_.isColor&&(p(_,1),E=!0);let T=n.xr.getEnvironmentBlendMode();T==="additive"?e.buffers.color.setClear(0,0,0,1,r):T==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(n.autoClear||E)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function g(M,E){let _=f(E);_&&(_.isCubeTexture||_.mapping===pa)?(c===void 0&&(c=new Bt(new ai(1,1,1),new Le({name:"BackgroundCubeMaterial",uniforms:Ns(pn.backgroundCube.uniforms),vertexShader:pn.backgroundCube.vertexShader,fragmentShader:pn.backgroundCube.fragmentShader,side:di,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(T,w,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(c)),c.material.uniforms.envMap.value=_,c.material.uniforms.backgroundBlurriness.value=E.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(tS.makeRotationFromEuler(E.backgroundRotation)).transpose(),_.isCubeTexture&&_.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(A0),c.material.toneMapped=Yt.getTransfer(_.colorSpace)!==ne,(h!==_||u!==_.version||d!==n.toneMapping)&&(c.material.needsUpdate=!0,h=_,u=_.version,d=n.toneMapping),c.layers.enableAll(),M.unshift(c,c.geometry,c.material,0,0,null)):_&&_.isTexture&&(l===void 0&&(l=new Bt(new ke(2,2),new Le({name:"BackgroundMaterial",uniforms:Ns(pn.background.uniforms),vertexShader:pn.background.vertexShader,fragmentShader:pn.background.fragmentShader,side:is,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=_,l.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,l.material.toneMapped=Yt.getTransfer(_.colorSpace)!==ne,_.matrixAutoUpdate===!0&&_.updateMatrix(),l.material.uniforms.uvTransform.value.copy(_.matrix),(h!==_||u!==_.version||d!==n.toneMapping)&&(l.material.needsUpdate=!0,h=_,u=_.version,d=n.toneMapping),l.layers.enableAll(),M.unshift(l,l.geometry,l.material,0,0,null))}function p(M,E){M.getRGB(ch,of(n)),e.buffers.color.setClear(ch.r,ch.g,ch.b,E,r)}function m(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(M,E=1){o.set(M),a=E,p(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(M){a=M,p(o,a)},render:x,addToRenderList:g,dispose:m}}function iS(n,t){let e=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=d(null),r=s,o=!1;function a(P,k,B,I,U){let V=!1,Z=u(P,I,B,k);r!==Z&&(r=Z,c(r.object)),V=f(P,I,B,U),V&&x(P,I,B,U),U!==null&&t.update(U,n.ELEMENT_ARRAY_BUFFER),(V||o)&&(o=!1,_(P,k,B,I),U!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t.get(U).buffer))}function l(){return n.createVertexArray()}function c(P){return n.bindVertexArray(P)}function h(P){return n.deleteVertexArray(P)}function u(P,k,B,I){let U=I.wireframe===!0,V=i[k.id];V===void 0&&(V={},i[k.id]=V);let Z=P.isInstancedMesh===!0?P.id:0,it=V[Z];it===void 0&&(it={},V[Z]=it);let $=it[B.id];$===void 0&&($={},it[B.id]=$);let J=$[U];return J===void 0&&(J=d(l()),$[U]=J),J}function d(P){let k=[],B=[],I=[];for(let U=0;U<e;U++)k[U]=0,B[U]=0,I[U]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:k,enabledAttributes:B,attributeDivisors:I,object:P,attributes:{},index:null}}function f(P,k,B,I){let U=r.attributes,V=k.attributes,Z=0,it=B.getAttributes();for(let $ in it)if(it[$].location>=0){let et=U[$],at=V[$];if(at===void 0&&($==="instanceMatrix"&&P.instanceMatrix&&(at=P.instanceMatrix),$==="instanceColor"&&P.instanceColor&&(at=P.instanceColor)),et===void 0||et.attribute!==at||at&&et.data!==at.data)return!0;Z++}return r.attributesNum!==Z||r.index!==I}function x(P,k,B,I){let U={},V=k.attributes,Z=0,it=B.getAttributes();for(let $ in it)if(it[$].location>=0){let et=V[$];et===void 0&&($==="instanceMatrix"&&P.instanceMatrix&&(et=P.instanceMatrix),$==="instanceColor"&&P.instanceColor&&(et=P.instanceColor));let at={};at.attribute=et,et&&et.data&&(at.data=et.data),U[$]=at,Z++}r.attributes=U,r.attributesNum=Z,r.index=I}function g(){let P=r.newAttributes;for(let k=0,B=P.length;k<B;k++)P[k]=0}function p(P){m(P,0)}function m(P,k){let B=r.newAttributes,I=r.enabledAttributes,U=r.attributeDivisors;B[P]=1,I[P]===0&&(n.enableVertexAttribArray(P),I[P]=1),U[P]!==k&&(n.vertexAttribDivisor(P,k),U[P]=k)}function M(){let P=r.newAttributes,k=r.enabledAttributes;for(let B=0,I=k.length;B<I;B++)k[B]!==P[B]&&(n.disableVertexAttribArray(B),k[B]=0)}function E(P,k,B,I,U,V,Z){Z===!0?n.vertexAttribIPointer(P,k,B,U,V):n.vertexAttribPointer(P,k,B,I,U,V)}function _(P,k,B,I){g();let U=I.attributes,V=B.getAttributes(),Z=k.defaultAttributeValues;for(let it in V){let $=V[it];if($.location>=0){let J=U[it];if(J===void 0&&(it==="instanceMatrix"&&P.instanceMatrix&&(J=P.instanceMatrix),it==="instanceColor"&&P.instanceColor&&(J=P.instanceColor)),J!==void 0){let et=J.normalized,at=J.itemSize,rt=t.get(J);if(rt===void 0)continue;let zt=rt.buffer,kt=rt.type,Lt=rt.bytesPerElement,X=kt===n.INT||kt===n.UNSIGNED_INT||J.gpuType===wc;if(J.isInterleavedBufferAttribute){let Q=J.data,yt=Q.stride,Ut=J.offset;if(Q.isInstancedInterleavedBuffer){for(let _t=0;_t<$.locationSize;_t++)m($.location+_t,Q.meshPerAttribute);P.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let _t=0;_t<$.locationSize;_t++)p($.location+_t);n.bindBuffer(n.ARRAY_BUFFER,zt);for(let _t=0;_t<$.locationSize;_t++)E($.location+_t,at/$.locationSize,kt,et,yt*Lt,(Ut+at/$.locationSize*_t)*Lt,X)}else{if(J.isInstancedBufferAttribute){for(let Q=0;Q<$.locationSize;Q++)m($.location+Q,J.meshPerAttribute);P.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let Q=0;Q<$.locationSize;Q++)p($.location+Q);n.bindBuffer(n.ARRAY_BUFFER,zt);for(let Q=0;Q<$.locationSize;Q++)E($.location+Q,at/$.locationSize,kt,et,at*Lt,at/$.locationSize*Q*Lt,X)}}else if(Z!==void 0){let et=Z[it];if(et!==void 0)switch(et.length){case 2:n.vertexAttrib2fv($.location,et);break;case 3:n.vertexAttrib3fv($.location,et);break;case 4:n.vertexAttrib4fv($.location,et);break;default:n.vertexAttrib1fv($.location,et)}}}}M()}function T(){b();for(let P in i){let k=i[P];for(let B in k){let I=k[B];for(let U in I){let V=I[U];for(let Z in V)h(V[Z].object),delete V[Z];delete I[U]}}delete i[P]}}function w(P){if(i[P.id]===void 0)return;let k=i[P.id];for(let B in k){let I=k[B];for(let U in I){let V=I[U];for(let Z in V)h(V[Z].object),delete V[Z];delete I[U]}}delete i[P.id]}function A(P){for(let k in i){let B=i[k];for(let I in B){let U=B[I];if(U[P.id]===void 0)continue;let V=U[P.id];for(let Z in V)h(V[Z].object),delete V[Z];delete U[P.id]}}}function v(P){for(let k in i){let B=i[k],I=P.isInstancedMesh===!0?P.id:0,U=B[I];if(U!==void 0){for(let V in U){let Z=U[V];for(let it in Z)h(Z[it].object),delete Z[it];delete U[V]}delete B[I],Object.keys(B).length===0&&delete i[k]}}}function b(){R(),o=!0,r!==s&&(r=s,c(r.object))}function R(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:b,resetDefaultState:R,dispose:T,releaseStatesOfGeometry:w,releaseStatesOfObject:v,releaseStatesOfProgram:A,initAttributes:g,enableAttribute:p,disableUnusedAttributes:M}}function nS(n,t,e){let i;function s(l){i=l}function r(l,c){n.drawArrays(i,l,c),e.update(c,i,1)}function o(l,c,h){h!==0&&(n.drawArraysInstanced(i,l,c,h),e.update(c,i,h))}function a(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,c,0,h);let d=0;for(let f=0;f<h;f++)d+=c[f];e.update(d,i,1)}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function sS(n,t,e,i){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let A=t.get("EXT_texture_filter_anisotropic");s=n.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(A){return!(A!==_i&&i.convert(A)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(A){let v=A===We&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(A!==vi&&A!==Yi&&!v&&i.convert(A)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE))}function l(A){if(A==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp",h=l(c);h!==c&&(Ot("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let u=e.logarithmicDepthBuffer===!0,d=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&d===!1&&Ot("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),x=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_TEXTURE_SIZE),p=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),m=n.getParameter(n.MAX_VERTEX_ATTRIBS),M=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),E=n.getParameter(n.MAX_VARYING_VECTORS),_=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),T=n.getParameter(n.MAX_SAMPLES),w=n.getParameter(n.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:x,maxTextureSize:g,maxCubemapSize:p,maxAttributes:m,maxVertexUniforms:M,maxVaryings:E,maxFragmentUniforms:_,maxSamples:T,samples:w}}function rS(n){let t=this,e=null,i=0,s=!1,r=!1,o=new xi,a=new Ht,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){let f=u.length!==0||d||i!==0||s;return s=d,i=u.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){e=h(u,d,0)},this.setState=function(u,d,f){let x=u.clippingPlanes,g=u.clipIntersection,p=u.clipShadows,m=n.get(u);if(!s||x===null||x.length===0||r&&!p)r?h(null):c();else{let M=r?0:i,E=M*4,_=m.clippingState||null;l.value=_,_=h(x,d,E,f);for(let T=0;T!==E;++T)_[T]=e[T];m.clippingState=_,this.numIntersection=g?this.numPlanes:0,this.numPlanes+=M}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function h(u,d,f,x){let g=u!==null?u.length:0,p=null;if(g!==0){if(p=l.value,x!==!0||p===null){let m=f+g*4,M=d.matrixWorldInverse;a.getNormalMatrix(M),(p===null||p.length<m)&&(p=new Float32Array(m));for(let E=0,_=f;E!==g;++E,_+=4)o.copy(u[E]).applyMatrix4(M,a),o.normal.toArray(p,_),p[_+3]=o.constant}l.value=p,l.needsUpdate=!0}return t.numPlanes=g,t.numIntersection=0,p}}var Xr=4,oS=6,aS=20,lS=256,ba=new Is,r0=new Ct,hf=null,uf=0,df=0,ff=!1,cS=new D,Fs=new D,Zr=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,i=.1,s=100,r={}){let{size:o=256,position:a=cS}=r;hf=this._renderer.getRenderTarget(),uf=this._renderer.getActiveCubeFace(),df=this._renderer.getActiveMipmapLevel(),ff=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,i,s,l,a),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=l0(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=a0(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(hf,uf,df),this._renderer.xr.enabled=ff,t.scissorTest=!1,Wr(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===ss||t.mapping===Ds?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),hf=this._renderer.getRenderTarget(),uf=this._renderer.getActiveCubeFace(),df=this._renderer.getActiveMipmapLevel(),ff=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let i=e||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,i={magFilter:Be,minFilter:Be,generateMipmaps:!1,type:We,format:_i,colorSpace:Xo,depthBuffer:!1},s=o0(t,e,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=o0(t,e,i);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=hS(r)),this._blurMaterial=dS(r,t,e),this._ggxMaterial=uS(r,t,e)}return s}_compileMaterial(t){let e=new Bt(new Me,t);this._renderer.compile(e,ba)}_sceneToCubeUV(t,e,i,s,r){let l=new Ye(90,1,e,i),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,f=u.toneMapping;u.getClearColor(r0),u.toneMapping=Ci,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(s),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Bt(new ai,new Re({name:"PMREM.Background",side:di,depthWrite:!1,depthTest:!1})));let g=this._backgroundBox,p=g.material,m=!1,M=t.background;M?M.isColor&&(p.color.copy(M),t.background=null,m=!0):(p.color.copy(r0),m=!0);for(let E=0;E<6;E++){let _=E%3;_===0?(l.up.set(0,c[E],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[E],r.y,r.z)):_===1?(l.up.set(0,0,c[E]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[E],r.z)):(l.up.set(0,c[E],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[E]));let T=this._cubeSize;Wr(s,_*T,E>2?T:0,T,T),u.setRenderTarget(s),m&&u.render(g,l),u.render(t,l)}u.toneMapping=f,u.autoClear=d,t.background=M}_textureToCubeUV(t,e){let i=this._renderer,s=t.mapping===ss||t.mapping===Ds;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=l0()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=a0());let r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;let a=r.uniforms;a.envMap.value=t;let l=this._cubeSize;Wr(e,0,0,3*l,2*l),i.setRenderTarget(e),i.render(o,ba)}_applyPMREM(t){let e=this._renderer,i=e.autoClear;e.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=i}_applyGGXFilter(t,e,i){let s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[i];a.material=o;let l=o.uniforms,c=i/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),u=Math.sqrt(c*c-h*h),d=c*1.25,f=u*d,{_lodMax:x}=this,g=this._sizeLods[i],p=3*g*(i>x-Xr?i-x+Xr:0),m=4*(this._cubeSize-g);l.envMap.value=t.texture,l.roughness.value=f,l.mipInt.value=x-e,Wr(r,p,m,3*g,2*g),s.setRenderTarget(r),s.render(a,ba),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=x-i,Wr(t,p,m,3*g,2*g),s.setRenderTarget(t),s.render(a,ba)}_blur(t,e,i,s){let r=this._pingPongRenderTarget,o=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,i,o),this._blurPass(r,t,i,i,o)}_blurPass(t,e,i,s,r){let o=this._renderer,a=this._blurMaterial,l=this._lodMeshes[s];l.material=a;let c=a.uniforms;c.envMap.value=t.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-i;let h=this._sizeLods[s],u=3*h*(s>this._lodMax-Xr?s-this._lodMax+Xr:0),d=4*(this._cubeSize-h);Wr(e,u,d,3*h,2*h),o.setRenderTarget(e),o.render(l,ba)}};function hS(n){let t=[],e=[],i=n,s=n-Xr+1+oS;for(let r=0;r<s;r++){let o=Math.pow(2,i);t.push(o);let a=1/(o-2),l=-a,c=1+a,h=[l,l,c,l,c,c,l,l,c,c,l,c],u=6,d=6,f=3,x=new Float32Array(f*d*u),g=new Float32Array(f*d*u);for(let m=0;m<u;m++){let M=m%3*2/3-1,E=m>2?0:-1,_=[M,E,0,M+2/3,E,0,M+2/3,E+1,0,M,E,0,M+2/3,E+1,0,M,E+1,0];x.set(_,f*d*m);for(let T=0;T<d;T++){let w=h[T*2]*2-1,A=h[T*2+1]*2-1;m===0?Fs.set(1,A,w):m===1?Fs.set(-w,1,-A):m===2?Fs.set(-w,A,1):m===3?Fs.set(-1,A,-w):m===4?Fs.set(-w,-1,A):Fs.set(w,A,-1),Fs.toArray(g,(m*d+T)*f)}}let p=new Me;p.setAttribute("position",new Ue(x,f)),p.setAttribute("outputDirection",new Ue(g,f)),e.push(new Bt(p,null)),i>Xr&&i--}return{lodMeshes:e,sizeLods:t}}function o0(n,t,e){let i=new Ce(n,t,e);return i.texture.mapping=pa,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Wr(n,t,e,i,s){n.viewport.set(t,e,i,s),n.scissor.set(t,e,i,s)}function uS(n,t,e){return new Le({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:lS,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:fh(),fragmentShader:`

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
		`,blending:Di,depthTest:!1,depthWrite:!1})}function dS(n,t,e){return new Le({name:"SphericalGaussianBlur",defines:{SAMPLES:aS,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:fh(),fragmentShader:`

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
		`,blending:Di,depthTest:!1,depthWrite:!1})}function a0(){return new Le({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:fh(),fragmentShader:`

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
		`,blending:Di,depthTest:!1,depthWrite:!1})}function l0(){return new Le({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:fh(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Di,depthTest:!1,depthWrite:!1})}function fh(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var uh=class extends Ce{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let i={width:t,height:t,depth:1},s=[i,i,i,i,i,i];this.texture=new ea(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new ai(5,5,5),r=new Le({name:"CubemapFromEquirect",uniforms:Ns(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:di,blending:Di});r.uniforms.tEquirect.value=e;let o=new Bt(s,r),a=e.minFilter;return e.minFilter===dn&&(e.minFilter=Be),new _c(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,i=!0,s=!0){let r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,i,s);t.setRenderTarget(r)}};function fS(n){let t=new WeakMap,e=new WeakMap,i=null;function s(d,f=!1){return d==null?null:f?o(d):r(d)}function r(d){if(d&&d.isTexture){let f=d.mapping;if(f===Hr||f===bc)if(t.has(d)){let x=t.get(d).texture;return a(x,d.mapping)}else{let x=d.image;if(x&&x.height>0){let g=new uh(x.height);return g.fromEquirectangularTexture(n,d),t.set(d,g),d.addEventListener("dispose",c),a(g.texture,d.mapping)}else return null}}return d}function o(d){if(d&&d.isTexture){let f=d.mapping,x=f===Hr||f===bc,g=f===ss||f===Ds;if(x||g){let p=e.get(d),m=p!==void 0?p.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==m)return i===null&&(i=new Zr(n)),p=x?i.fromEquirectangular(d,p):i.fromCubemap(d,p),p.texture.pmremVersion=d.pmremVersion,e.set(d,p),p.texture;if(p!==void 0)return p.texture;{let M=d.image;return x&&M&&M.height>0||g&&M&&l(M)?(i===null&&(i=new Zr(n)),p=x?i.fromEquirectangular(d):i.fromCubemap(d),p.texture.pmremVersion=d.pmremVersion,e.set(d,p),d.addEventListener("dispose",h),p.texture):null}}}return d}function a(d,f){return f===Hr?d.mapping=ss:f===bc&&(d.mapping=Ds),d}function l(d){let f=0,x=6;for(let g=0;g<x;g++)d[g]!==void 0&&f++;return f===x}function c(d){let f=d.target;f.removeEventListener("dispose",c);let x=t.get(f);x!==void 0&&(t.delete(f),x.dispose())}function h(d){let f=d.target;f.removeEventListener("dispose",h);let x=e.get(f);x!==void 0&&(e.delete(f),x.dispose())}function u(){t=new WeakMap,e=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:s,dispose:u}}function pS(n){let t={};function e(i){if(t[i]!==void 0)return t[i];let s=n.getExtension(i);return t[i]=s,s}return{has:function(i){return e(i)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(i){let s=e(i);return s===null&&Cs("WebGLRenderer: "+i+" extension not supported."),s}}}function mS(n,t,e,i){let s={},r=new WeakMap;function o(u){let d=u.target;d.index!==null&&t.remove(d.index);for(let x in d.attributes)t.remove(d.attributes[x]);d.removeEventListener("dispose",o),delete s[d.id];let f=r.get(d);f&&(t.remove(f),r.delete(d)),i.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,e.memory.geometries--}function a(u,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,e.memory.geometries++),d}function l(u){let d=u.attributes;for(let f in d)t.update(d[f],n.ARRAY_BUFFER)}function c(u){let d=[],f=u.index,x=u.attributes.position,g=0;if(x===void 0)return;if(f!==null){let M=f.array;g=f.version;for(let E=0,_=M.length;E<_;E+=3){let T=M[E+0],w=M[E+1],A=M[E+2];d.push(T,w,w,A,A,T)}}else{let M=x.array;g=x.version;for(let E=0,_=M.length/3-1;E<_;E+=3){let T=E+0,w=E+1,A=E+2;d.push(T,w,w,A,A,T)}}let p=new(x.count>=65535?Qo:Jo)(d,1);p.version=g;let m=r.get(u);m&&t.remove(m),r.set(u,p)}function h(u){let d=r.get(u);if(d){let f=u.index;f!==null&&d.version<f.version&&c(u)}else c(u);return r.get(u)}return{get:a,update:l,getWireframeAttribute:h}}function gS(n,t,e){let i;function s(u){i=u}let r,o;function a(u){r=u.type,o=u.bytesPerElement}function l(u,d){n.drawElements(i,d,r,u*o),e.update(d,i,1)}function c(u,d,f){f!==0&&(n.drawElementsInstanced(i,d,r,u*o,f),e.update(d,i,f))}function h(u,d,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,d,0,r,u,0,f);let g=0;for(let p=0;p<f;p++)g+=d[p];e.update(g,i,1)}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function xS(n){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,o,a){switch(e.calls++,o){case n.TRIANGLES:e.triangles+=a*(r/3);break;case n.LINES:e.lines+=a*(r/2);break;case n.LINE_STRIP:e.lines+=a*(r-1);break;case n.LINE_LOOP:e.lines+=a*r;break;case n.POINTS:e.points+=a*r;break;default:Nt("WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:i}}function yS(n,t,e){let i=new WeakMap,s=new _e;function r(o,a,l){let c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0,d=i.get(a);if(d===void 0||d.count!==u){let b=function(){A.dispose(),i.delete(a),a.removeEventListener("dispose",b)};d!==void 0&&d.texture.dispose();let f=a.morphAttributes.position!==void 0,x=a.morphAttributes.normal!==void 0,g=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],m=a.morphAttributes.normal||[],M=a.morphAttributes.color||[],E=0;f===!0&&(E=1),x===!0&&(E=2),g===!0&&(E=3);let _=a.attributes.position.count*E,T=1;_>t.maxTextureSize&&(T=Math.ceil(_/t.maxTextureSize),_=t.maxTextureSize);let w=new Float32Array(_*T*4*u),A=new jo(w,_,T,u);A.type=Yi,A.needsUpdate=!0;let v=E*4;for(let R=0;R<u;R++){let P=p[R],k=m[R],B=M[R],I=_*T*4*R;for(let U=0;U<P.count;U++){let V=U*v;f===!0&&(s.fromBufferAttribute(P,U),w[I+V+0]=s.x,w[I+V+1]=s.y,w[I+V+2]=s.z,w[I+V+3]=0),x===!0&&(s.fromBufferAttribute(k,U),w[I+V+4]=s.x,w[I+V+5]=s.y,w[I+V+6]=s.z,w[I+V+7]=0),g===!0&&(s.fromBufferAttribute(B,U),w[I+V+8]=s.x,w[I+V+9]=s.y,w[I+V+10]=s.z,w[I+V+11]=B.itemSize===4?s.w:1)}}d={count:u,texture:A,size:new bt(_,T)},i.set(a,d),a.addEventListener("dispose",b)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",o.morphTexture,e);else{let f=0;for(let g=0;g<c.length;g++)f+=c[g];let x=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(n,"morphTargetBaseInfluence",x),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",d.texture,e),l.getUniforms().setValue(n,"morphTargetsTextureSize",d.size)}return{update:r}}function vS(n,t,e,i,s){let r=new WeakMap;function o(c){let h=s.render.frame,u=c.geometry,d=t.get(c,u);if(r.get(d)!==h&&(t.update(d),r.set(d,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,n.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,n.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let f=c.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return d}function a(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),i.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:o,dispose:a}}var _S={[Gd]:"LINEAR_TONE_MAPPING",[Vd]:"REINHARD_TONE_MAPPING",[Wd]:"CINEON_TONE_MAPPING",[Xd]:"ACES_FILMIC_TONE_MAPPING",[Zd]:"AGX_TONE_MAPPING",[qd]:"NEUTRAL_TONE_MAPPING",[$d]:"CUSTOM_TONE_MAPPING"};function MS(n,t,e,i,s,r){let o=new Ce(t,e,{type:n,depthBuffer:s,stencilBuffer:r,samples:i?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),a=null,l=null,c=new Me;c.setAttribute("position",new Jt([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new Jt([0,2,0,0,2,0],2));let h=new ac({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),u=new Bt(c,h),d=new Is(-1,1,1,-1,0,1),f=null,x=null,g=!1,p,m=null,M=[],E=!1;this.setSize=function(_,T){o.setSize(_,T),a!==null&&a.setSize(_,T),l!==null&&l.setSize(_,T);for(let w=0;w<M.length;w++){let A=M[w];A.setSize&&A.setSize(_,T)}},this.setEffects=function(_){M=_,E=M.length>0&&M[0].isRenderPass===!0;let T=o.width,w=o.height;M.length>0&&a===null&&(a=new Ce(T,w,{type:We,depthBuffer:!1,stencilBuffer:!1}),l=new Ce(T,w,{type:We,depthBuffer:!1,stencilBuffer:!1}));for(let A=0;A<M.length;A++){let v=M[A];v.setSize&&v.setSize(T,w)}},this.begin=function(_,T){if(g||_.toneMapping===Ci&&M.length===0)return!1;if(m=T,T!==null){let w=T.width,A=T.height;(o.width!==w||o.height!==A)&&this.setSize(w,A)}return E===!1&&_.setRenderTarget(o),p=_.toneMapping,_.toneMapping=Ci,!0},this.hasRenderPass=function(){return E},this.end=function(_,T){_.toneMapping=p,g=!0;let w=o,A=a;for(let v=0;v<M.length;v++){let b=M[v];b.enabled!==!1&&(b.render(_,A,w,T),b.needsSwap!==!1&&(w=A,A=A===a?l:a))}if(f!==_.outputColorSpace||x!==_.toneMapping){f=_.outputColorSpace,x=_.toneMapping,h.defines={},Yt.getTransfer(f)===ne&&(h.defines.SRGB_TRANSFER="");let v=_S[x];v&&(h.defines[v]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=w.texture,_.setRenderTarget(m),_.render(u,d),m=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){o.dispose(),a!==null&&a.dispose(),l!==null&&l.dispose(),c.dispose(),h.dispose()}}var C0=new Ve,gf=new Jn(1,1),R0=new jo,P0=new nc,I0=new ea,c0=[],h0=[],u0=new Float32Array(16),d0=new Float32Array(9),f0=new Float32Array(4);function qr(n,t,e){let i=n[0];if(i<=0||i>0)return n;let s=t*e,r=c0[s];if(r===void 0&&(r=new Float32Array(s),c0[s]=r),t!==0){i.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,n[o].toArray(r,a)}return r}function Xe(n,t){if(n.length!==t.length)return!1;for(let e=0,i=n.length;e<i;e++)if(n[e]!==t[e])return!1;return!0}function $e(n,t){for(let e=0,i=t.length;e<i;e++)n[e]=t[e]}function ph(n,t){let e=h0[t];e===void 0&&(e=new Int32Array(t),h0[t]=e);for(let i=0;i!==t;++i)e[i]=n.allocateTextureUnit();return e}function bS(n,t){let e=this.cache;e[0]!==t&&(n.uniform1f(this.addr,t),e[0]=t)}function SS(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Xe(e,t))return;n.uniform2fv(this.addr,t),$e(e,t)}}function wS(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(n.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Xe(e,t))return;n.uniform3fv(this.addr,t),$e(e,t)}}function TS(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Xe(e,t))return;n.uniform4fv(this.addr,t),$e(e,t)}}function ES(n,t){let e=this.cache,i=t.elements;if(i===void 0){if(Xe(e,t))return;n.uniformMatrix2fv(this.addr,!1,t),$e(e,t)}else{if(Xe(e,i))return;f0.set(i),n.uniformMatrix2fv(this.addr,!1,f0),$e(e,i)}}function AS(n,t){let e=this.cache,i=t.elements;if(i===void 0){if(Xe(e,t))return;n.uniformMatrix3fv(this.addr,!1,t),$e(e,t)}else{if(Xe(e,i))return;d0.set(i),n.uniformMatrix3fv(this.addr,!1,d0),$e(e,i)}}function CS(n,t){let e=this.cache,i=t.elements;if(i===void 0){if(Xe(e,t))return;n.uniformMatrix4fv(this.addr,!1,t),$e(e,t)}else{if(Xe(e,i))return;u0.set(i),n.uniformMatrix4fv(this.addr,!1,u0),$e(e,i)}}function RS(n,t){let e=this.cache;e[0]!==t&&(n.uniform1i(this.addr,t),e[0]=t)}function PS(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Xe(e,t))return;n.uniform2iv(this.addr,t),$e(e,t)}}function IS(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Xe(e,t))return;n.uniform3iv(this.addr,t),$e(e,t)}}function kS(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Xe(e,t))return;n.uniform4iv(this.addr,t),$e(e,t)}}function LS(n,t){let e=this.cache;e[0]!==t&&(n.uniform1ui(this.addr,t),e[0]=t)}function DS(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Xe(e,t))return;n.uniform2uiv(this.addr,t),$e(e,t)}}function NS(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Xe(e,t))return;n.uniform3uiv(this.addr,t),$e(e,t)}}function OS(n,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Xe(e,t))return;n.uniform4uiv(this.addr,t),$e(e,t)}}function FS(n,t,e){let i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let r;this.type===n.SAMPLER_2D_SHADOW?(gf.compareFunction=e.isReversedDepthBuffer()?lh:ah,r=gf):r=C0,e.setTexture2D(t||r,s)}function US(n,t,e){let i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture3D(t||P0,s)}function BS(n,t,e){let i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTextureCube(t||I0,s)}function zS(n,t,e){let i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture2DArray(t||R0,s)}function HS(n){switch(n){case 5126:return bS;case 35664:return SS;case 35665:return wS;case 35666:return TS;case 35674:return ES;case 35675:return AS;case 35676:return CS;case 5124:case 35670:return RS;case 35667:case 35671:return PS;case 35668:case 35672:return IS;case 35669:case 35673:return kS;case 5125:return LS;case 36294:return DS;case 36295:return NS;case 36296:return OS;case 35678:case 36198:case 36298:case 36306:case 35682:return FS;case 35679:case 36299:case 36307:return US;case 35680:case 36300:case 36308:case 36293:return BS;case 36289:case 36303:case 36311:case 36292:return zS}}function GS(n,t){n.uniform1fv(this.addr,t)}function VS(n,t){let e=qr(t,this.size,2);n.uniform2fv(this.addr,e)}function WS(n,t){let e=qr(t,this.size,3);n.uniform3fv(this.addr,e)}function XS(n,t){let e=qr(t,this.size,4);n.uniform4fv(this.addr,e)}function $S(n,t){let e=qr(t,this.size,4);n.uniformMatrix2fv(this.addr,!1,e)}function ZS(n,t){let e=qr(t,this.size,9);n.uniformMatrix3fv(this.addr,!1,e)}function qS(n,t){let e=qr(t,this.size,16);n.uniformMatrix4fv(this.addr,!1,e)}function YS(n,t){n.uniform1iv(this.addr,t)}function jS(n,t){n.uniform2iv(this.addr,t)}function KS(n,t){n.uniform3iv(this.addr,t)}function JS(n,t){n.uniform4iv(this.addr,t)}function QS(n,t){n.uniform1uiv(this.addr,t)}function t1(n,t){n.uniform2uiv(this.addr,t)}function e1(n,t){n.uniform3uiv(this.addr,t)}function i1(n,t){n.uniform4uiv(this.addr,t)}function n1(n,t,e){let i=this.cache,s=t.length,r=ph(e,s);Xe(i,r)||(n.uniform1iv(this.addr,r),$e(i,r));let o;this.type===n.SAMPLER_2D_SHADOW?o=gf:o=C0;for(let a=0;a!==s;++a)e.setTexture2D(t[a]||o,r[a])}function s1(n,t,e){let i=this.cache,s=t.length,r=ph(e,s);Xe(i,r)||(n.uniform1iv(this.addr,r),$e(i,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||P0,r[o])}function r1(n,t,e){let i=this.cache,s=t.length,r=ph(e,s);Xe(i,r)||(n.uniform1iv(this.addr,r),$e(i,r));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||I0,r[o])}function o1(n,t,e){let i=this.cache,s=t.length,r=ph(e,s);Xe(i,r)||(n.uniform1iv(this.addr,r),$e(i,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||R0,r[o])}function a1(n){switch(n){case 5126:return GS;case 35664:return VS;case 35665:return WS;case 35666:return XS;case 35674:return $S;case 35675:return ZS;case 35676:return qS;case 5124:case 35670:return YS;case 35667:case 35671:return jS;case 35668:case 35672:return KS;case 35669:case 35673:return JS;case 5125:return QS;case 36294:return t1;case 36295:return e1;case 36296:return i1;case 35678:case 36198:case 36298:case 36306:case 35682:return n1;case 35679:case 36299:case 36307:return s1;case 35680:case 36300:case 36308:case 36293:return r1;case 36289:case 36303:case 36311:case 36292:return o1}}var xf=class{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.setValue=HS(e.type)}},yf=class{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=a1(e.type)}},vf=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,i){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(t,e[a.id],i)}}},pf=/(\w+)(\])?(\[|\.)?/g;function p0(n,t){n.seq.push(t),n.map[t.id]=t}function l1(n,t,e){let i=n.name,s=i.length;for(pf.lastIndex=0;;){let r=pf.exec(i),o=pf.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){p0(e,c===void 0?new xf(a,n,t):new yf(a,n,t));break}else{let u=e.map[a];u===void 0&&(u=new vf(a),p0(e,u)),e=u}}}var $r=class{constructor(t,e){this.seq=[],this.map={};let i=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let o=0;o<i;++o){let a=t.getActiveUniform(e,o),l=t.getUniformLocation(e,a.name);l1(a,l,this)}let s=[],r=[];for(let o of this.seq)o.type===t.SAMPLER_2D_SHADOW||o.type===t.SAMPLER_CUBE_SHADOW||o.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,i,s){let r=this.map[e];r!==void 0&&r.setValue(t,i,s)}setOptional(t,e,i){let s=e[i];s!==void 0&&this.setValue(t,i,s)}static upload(t,e,i,s){for(let r=0,o=e.length;r!==o;++r){let a=e[r],l=i[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,s)}}static seqWithValue(t,e){let i=[];for(let s=0,r=t.length;s!==r;++s){let o=t[s];o.id in e&&i.push(o)}return i}};function m0(n,t,e){let i=n.createShader(t);return n.shaderSource(i,e),n.compileShader(i),i}var c1=37297,h1=0;function u1(n,t){let e=n.split(`
`),i=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){let a=o+1;i.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return i.join(`
`)}var g0=new Ht;function d1(n){Yt._getMatrix(g0,Yt.workingColorSpace,n);let t=`mat3( ${g0.elements.map(e=>e.toFixed(4))} )`;switch(Yt.getTransfer(n)){case $o:return[t,"LinearTransferOETF"];case ne:return[t,"sRGBTransferOETF"];default:return Ot("WebGLProgram: Unsupported color space: ",n),[t,"LinearTransferOETF"]}}function x0(n,t,e){let i=n.getShaderParameter(t,n.COMPILE_STATUS),r=(n.getShaderInfoLog(t)||"").trim();if(i&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return e.toUpperCase()+`

`+r+`

`+u1(n.getShaderSource(t),a)}else return r}function f1(n,t){let e=d1(t);return[`vec4 ${n}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var p1={[Gd]:"Linear",[Vd]:"Reinhard",[Wd]:"Cineon",[Xd]:"ACESFilmic",[Zd]:"AgX",[qd]:"Neutral",[$d]:"Custom"};function m1(n,t){let e=p1[t];return e===void 0?(Ot("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+n+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+n+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var hh=new D;function g1(){Yt.getLuminanceCoefficients(hh);let n=hh.x.toFixed(4),t=hh.y.toFixed(4),e=hh.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function x1(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(wa).join(`
`)}function y1(n){let t=[];for(let e in n){let i=n[e];i!==!1&&t.push("#define "+e+" "+i)}return t.join(`
`)}function v1(n,t){let e={},i=n.getProgramParameter(t,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){let r=n.getActiveAttrib(t,s),o=r.name,a=1;r.type===n.FLOAT_MAT2&&(a=2),r.type===n.FLOAT_MAT3&&(a=3),r.type===n.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:n.getAttribLocation(t,o),locationSize:a}}return e}function wa(n){return n!==""}function y0(n,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return n.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function v0(n,t){return n.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var _1=/^[ \t]*#include +<([\w\d./]+)>/gm;function _f(n){return n.replace(_1,b1)}var M1=new Map;function b1(n,t){let e=Wt[t];if(e===void 0){let i=M1.get(t);if(i!==void 0)e=Wt[i],Ot('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return _f(e)}var S1=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function _0(n){return n.replace(S1,w1)}function w1(n,t,e,i){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function M0(n){let t=`precision ${n.precision} float;
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
#define LOW_PRECISION`),t}var T1={[ks]:"SHADOWMAP_TYPE_PCF",[zr]:"SHADOWMAP_TYPE_VSM"};function E1(n){return T1[n.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var A1={[ss]:"ENVMAP_TYPE_CUBE",[Ds]:"ENVMAP_TYPE_CUBE",[pa]:"ENVMAP_TYPE_CUBE_UV"};function C1(n){return n.envMap===!1?"ENVMAP_TYPE_CUBE":A1[n.envMapMode]||"ENVMAP_TYPE_CUBE"}var R1={[Ds]:"ENVMAP_MODE_REFRACTION"};function P1(n){return n.envMap===!1?"ENVMAP_MODE_REFLECTION":R1[n.envMapMode]||"ENVMAP_MODE_REFLECTION"}var I1={[Hd]:"ENVMAP_BLENDING_MULTIPLY",[Bg]:"ENVMAP_BLENDING_MIX",[zg]:"ENVMAP_BLENDING_ADD"};function k1(n){return n.envMap===!1?"ENVMAP_BLENDING_NONE":I1[n.combine]||"ENVMAP_BLENDING_NONE"}function L1(n){let t=n.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:i,maxMip:e}}function D1(n,t,e,i){let s=n.getContext(),r=e.defines,o=e.vertexShader,a=e.fragmentShader,l=E1(e),c=C1(e),h=P1(e),u=k1(e),d=L1(e),f=x1(e),x=y1(r),g=s.createProgram(),p,m,M=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x].filter(wa).join(`
`),p.length>0&&(p+=`
`),m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x].filter(wa).join(`
`),m.length>0&&(m+=`
`)):(p=[M0(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(wa).join(`
`),m=[M0(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,x,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Ci?"#define TONE_MAPPING":"",e.toneMapping!==Ci?Wt.tonemapping_pars_fragment:"",e.toneMapping!==Ci?m1("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Wt.colorspace_pars_fragment,f1("linearToOutputTexel",e.outputColorSpace),g1(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(wa).join(`
`)),o=_f(o),o=y0(o,e),o=v0(o,e),a=_f(a),a=y0(a,e),a=v0(a,e),o=_0(o),a=_0(a),e.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,p=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,m=["#define varying in",e.glslVersion===rf?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===rf?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);let E=M+p+o,_=M+m+a,T=m0(s,s.VERTEX_SHADER,E),w=m0(s,s.FRAGMENT_SHADER,_);s.attachShader(g,T),s.attachShader(g,w),e.index0AttributeName!==void 0?s.bindAttribLocation(g,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(g,0,"position"),s.linkProgram(g);function A(P){if(n.debug.checkShaderErrors){let k=s.getProgramInfoLog(g)||"",B=s.getShaderInfoLog(T)||"",I=s.getShaderInfoLog(w)||"",U=k.trim(),V=B.trim(),Z=I.trim(),it=!0,$=!0;if(s.getProgramParameter(g,s.LINK_STATUS)===!1)if(it=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,g,T,w);else{let J=x0(s,T,"vertex"),et=x0(s,w,"fragment");Nt("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(g,s.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+U+`
`+J+`
`+et)}else U!==""?Ot("WebGLProgram: Program Info Log:",U):(V===""||Z==="")&&($=!1);$&&(P.diagnostics={runnable:it,programLog:U,vertexShader:{log:V,prefix:p},fragmentShader:{log:Z,prefix:m}})}s.deleteShader(T),s.deleteShader(w),v=new $r(s,g),b=v1(s,g)}let v;this.getUniforms=function(){return v===void 0&&A(this),v};let b;this.getAttributes=function(){return b===void 0&&A(this),b};let R=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return R===!1&&(R=s.getProgramParameter(g,c1)),R},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(g),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=h1++,this.cacheKey=t,this.usedTimes=1,this.program=g,this.vertexShader=T,this.fragmentShader=w,this}var N1=0,Mf=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,i){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(i)===!1&&(s.add(i),i.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let i of e)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,i=e.get(t);return i===void 0&&(i=new Set,e.set(t,i)),i}_getShaderStage(t){let e=this.shaderCache,i=e.get(t);return i===void 0&&(i=new bf(t),e.set(t,i)),i}},bf=class{constructor(t){this.id=N1++,this.code=t,this.usedTimes=0}};function O1(n){return n===os||n===_a||n===Ma}function F1(n,t,e,i,s,r){let o=new Pr,a=new Mf,l=new Set,c=[],h=new Map,u=i.logarithmicDepthBuffer,d=i.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(v){return l.add(v),v===0?"uv":`uv${v}`}function g(v,b,R,P,k,B){let I=P.fog,U=k.geometry,V=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?P.environment:null,Z=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,it=t.get(v.envMap||V,Z),$=it&&it.mapping===pa?it.image.height:null,J=f[v.type];v.precision!==null&&(d=i.getMaxPrecision(v.precision),d!==v.precision&&Ot("WebGLProgram.getParameters:",v.precision,"not supported, using",d,"instead."));let et=U.morphAttributes.position||U.morphAttributes.normal||U.morphAttributes.color,at=et!==void 0?et.length:0,rt=0;U.morphAttributes.position!==void 0&&(rt=1),U.morphAttributes.normal!==void 0&&(rt=2),U.morphAttributes.color!==void 0&&(rt=3);let zt,kt,Lt,X;if(J){let ue=pn[J];zt=ue.vertexShader,kt=ue.fragmentShader}else{zt=v.vertexShader,kt=v.fragmentShader;let ue=a.getVertexShaderStage(v),ee=a.getFragmentShaderStage(v);a.update(v,ue,ee),Lt=ue.id,X=ee.id}let Q=n.getRenderTarget(),yt=n.state.buffers.depth.getReversed(),Ut=k.isInstancedMesh===!0,_t=k.isBatchedMesh===!0,Xt=!!v.map,He=!!v.matcap,$t=!!it,te=!!v.aoMap,he=!!v.lightMap,qt=!!v.bumpMap&&v.wireframe===!1,ve=!!v.normalMap,Ze=!!v.displacementMap,pi=!!v.emissiveMap,be=!!v.metalnessMap,De=!!v.roughnessMap,O=v.anisotropy>0,ni=v.clearcoat>0,re=v.dispersion>0,C=v.retroreflectivity>0,y=v.iridescence>0,F=v.sheen>0,G=v.transmission>0,q=O&&!!v.anisotropyMap,ot=ni&&!!v.clearcoatMap,lt=ni&&!!v.clearcoatNormalMap,Y=ni&&!!v.clearcoatRoughnessMap,tt=y&&!!v.iridescenceMap,ct=y&&!!v.iridescenceThicknessMap,Rt=F&&!!v.sheenColorMap,ft=F&&!!v.sheenRoughnessMap,ht=!!v.specularMap,Pt=!!v.specularColorMap,Dt=!!v.specularIntensityMap,Gt=G&&!!v.transmissionMap,N=G&&!!v.thicknessMap,ut=!!v.gradientMap,K=!!v.alphaMap,dt=v.alphaTest>0,xt=!!v.alphaHash,nt=!!v.extensions,It=Ci;v.toneMapped&&(Q===null||Q.isXRRenderTarget===!0)&&(It=n.toneMapping);let Tt={shaderID:J,shaderType:v.type,shaderName:v.name,vertexShader:zt,fragmentShader:kt,defines:v.defines,customVertexShaderID:Lt,customFragmentShaderID:X,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:d,batching:_t,batchingColor:_t&&k._colorsTexture!==null,instancing:Ut,instancingColor:Ut&&k.instanceColor!==null,instancingMorph:Ut&&k.morphTexture!==null,outputColorSpace:Q===null?n.outputColorSpace:Q.isXRRenderTarget===!0?Q.texture.colorSpace:Yt.workingColorSpace,alphaToCoverage:!!v.alphaToCoverage,map:Xt,matcap:He,envMap:$t,envMapMode:$t&&it.mapping,envMapCubeUVHeight:$,aoMap:te,lightMap:he,bumpMap:qt,normalMap:ve,displacementMap:Ze,emissiveMap:pi,normalMapObjectSpace:ve&&v.normalMapType===Vg,normalMapTangentSpace:ve&&v.normalMapType===oh,packedNormalMap:ve&&v.normalMapType===oh&&O1(v.normalMap.format),metalnessMap:be,roughnessMap:De,anisotropy:O,anisotropyMap:q,clearcoat:ni,clearcoatMap:ot,clearcoatNormalMap:lt,clearcoatRoughnessMap:Y,dispersion:re,retroreflection:C,iridescence:y,iridescenceMap:tt,iridescenceThicknessMap:ct,sheen:F,sheenColorMap:Rt,sheenRoughnessMap:ft,specularMap:ht,specularColorMap:Pt,specularIntensityMap:Dt,transmission:G,transmissionMap:Gt,thicknessMap:N,gradientMap:ut,opaque:v.transparent===!1&&v.blending===ns&&v.alphaToCoverage===!1,alphaMap:K,alphaTest:dt,alphaHash:xt,combine:v.combine,mapUv:Xt&&x(v.map.channel),aoMapUv:te&&x(v.aoMap.channel),lightMapUv:he&&x(v.lightMap.channel),bumpMapUv:qt&&x(v.bumpMap.channel),normalMapUv:ve&&x(v.normalMap.channel),displacementMapUv:Ze&&x(v.displacementMap.channel),emissiveMapUv:pi&&x(v.emissiveMap.channel),metalnessMapUv:be&&x(v.metalnessMap.channel),roughnessMapUv:De&&x(v.roughnessMap.channel),anisotropyMapUv:q&&x(v.anisotropyMap.channel),clearcoatMapUv:ot&&x(v.clearcoatMap.channel),clearcoatNormalMapUv:lt&&x(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Y&&x(v.clearcoatRoughnessMap.channel),iridescenceMapUv:tt&&x(v.iridescenceMap.channel),iridescenceThicknessMapUv:ct&&x(v.iridescenceThicknessMap.channel),sheenColorMapUv:Rt&&x(v.sheenColorMap.channel),sheenRoughnessMapUv:ft&&x(v.sheenRoughnessMap.channel),specularMapUv:ht&&x(v.specularMap.channel),specularColorMapUv:Pt&&x(v.specularColorMap.channel),specularIntensityMapUv:Dt&&x(v.specularIntensityMap.channel),transmissionMapUv:Gt&&x(v.transmissionMap.channel),thicknessMapUv:N&&x(v.thicknessMap.channel),alphaMapUv:K&&x(v.alphaMap.channel),vertexTangents:!!U.attributes.tangent&&(ve||O),vertexNormals:!!U.attributes.normal,vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!U.attributes.color&&U.attributes.color.itemSize===4,pointsUvs:k.isPoints===!0&&!!U.attributes.uv&&(Xt||K),fog:!!I,useFog:v.fog===!0,fogExp2:!!I&&I.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||U.attributes.normal===void 0&&ve===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:yt,skinning:k.isSkinnedMesh===!0,hasPositionAttribute:U.attributes.position!==void 0,morphTargets:U.morphAttributes.position!==void 0,morphNormals:U.morphAttributes.normal!==void 0,morphColors:U.morphAttributes.color!==void 0,morphTargetsCount:at,morphTextureStride:rt,numSunLights:b.sun.length,numDirLights:b.directional.length,numPointLights:b.point.length,numSpotLights:b.spot.length,numSpotLightMaps:b.spotLightMap.length,numRectAreaLights:b.rectArea.length,numHemiLights:b.hemi.length,numSunLightShadows:b.sunShadowMap.length,numDirLightShadows:b.directionalShadowMap.length,numPointLightShadows:b.pointShadowMap.length,numSpotLightShadows:b.spotShadowMap.length,numSpotLightShadowsWithMaps:b.numSpotLightShadowsWithMaps,numLightProbes:b.numLightProbes,numLightProbeGrids:B.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:v.dithering,shadowMapEnabled:n.shadowMap.enabled&&R.length>0,shadowMapType:n.shadowMap.type,toneMapping:It,decodeVideoTexture:Xt&&v.map.isVideoTexture===!0&&Yt.getTransfer(v.map.colorSpace)===ne,decodeVideoTextureEmissive:pi&&v.emissiveMap.isVideoTexture===!0&&Yt.getTransfer(v.emissiveMap.colorSpace)===ne,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===yi,flipSided:v.side===di,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:nt&&v.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(nt&&v.extensions.multiDraw===!0||_t)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return Tt.vertexUv1s=l.has(1),Tt.vertexUv2s=l.has(2),Tt.vertexUv3s=l.has(3),l.clear(),Tt}function p(v){let b=[];if(v.shaderID?b.push(v.shaderID):(b.push(v.customVertexShaderID),b.push(v.customFragmentShaderID)),v.defines!==void 0)for(let R in v.defines)b.push(R),b.push(v.defines[R]);return v.isRawShaderMaterial===!1&&(m(b,v),M(b,v),b.push(n.outputColorSpace)),b.push(v.customProgramCacheKey),b.join()}function m(v,b){v.push(b.precision),v.push(b.outputColorSpace),v.push(b.envMapMode),v.push(b.envMapCubeUVHeight),v.push(b.mapUv),v.push(b.alphaMapUv),v.push(b.lightMapUv),v.push(b.aoMapUv),v.push(b.bumpMapUv),v.push(b.normalMapUv),v.push(b.displacementMapUv),v.push(b.emissiveMapUv),v.push(b.metalnessMapUv),v.push(b.roughnessMapUv),v.push(b.anisotropyMapUv),v.push(b.clearcoatMapUv),v.push(b.clearcoatNormalMapUv),v.push(b.clearcoatRoughnessMapUv),v.push(b.iridescenceMapUv),v.push(b.iridescenceThicknessMapUv),v.push(b.sheenColorMapUv),v.push(b.sheenRoughnessMapUv),v.push(b.specularMapUv),v.push(b.specularColorMapUv),v.push(b.specularIntensityMapUv),v.push(b.transmissionMapUv),v.push(b.thicknessMapUv),v.push(b.combine),v.push(b.fogExp2),v.push(b.sizeAttenuation),v.push(b.morphTargetsCount),v.push(b.morphAttributeCount),v.push(b.numSunLights),v.push(b.numDirLights),v.push(b.numPointLights),v.push(b.numSpotLights),v.push(b.numSpotLightMaps),v.push(b.numHemiLights),v.push(b.numRectAreaLights),v.push(b.numSunLightShadows),v.push(b.numDirLightShadows),v.push(b.numPointLightShadows),v.push(b.numSpotLightShadows),v.push(b.numSpotLightShadowsWithMaps),v.push(b.numLightProbes),v.push(b.shadowMapType),v.push(b.toneMapping),v.push(b.numClippingPlanes),v.push(b.numClipIntersection),v.push(b.depthPacking)}function M(v,b){o.disableAll(),b.instancing&&o.enable(0),b.instancingColor&&o.enable(1),b.instancingMorph&&o.enable(2),b.matcap&&o.enable(3),b.envMap&&o.enable(4),b.normalMapObjectSpace&&o.enable(5),b.normalMapTangentSpace&&o.enable(6),b.clearcoat&&o.enable(7),b.iridescence&&o.enable(8),b.alphaTest&&o.enable(9),b.vertexColors&&o.enable(10),b.vertexAlphas&&o.enable(11),b.vertexUv1s&&o.enable(12),b.vertexUv2s&&o.enable(13),b.vertexUv3s&&o.enable(14),b.vertexTangents&&o.enable(15),b.anisotropy&&o.enable(16),b.alphaHash&&o.enable(17),b.batching&&o.enable(18),b.dispersion&&o.enable(19),b.retroreflection&&o.enable(24),b.batchingColor&&o.enable(20),b.gradientMap&&o.enable(21),b.packedNormalMap&&o.enable(22),b.vertexNormals&&o.enable(23),v.push(o.mask),o.disableAll(),b.fog&&o.enable(0),b.useFog&&o.enable(1),b.flatShading&&o.enable(2),b.logarithmicDepthBuffer&&o.enable(3),b.reversedDepthBuffer&&o.enable(4),b.skinning&&o.enable(5),b.morphTargets&&o.enable(6),b.morphNormals&&o.enable(7),b.morphColors&&o.enable(8),b.premultipliedAlpha&&o.enable(9),b.shadowMapEnabled&&o.enable(10),b.doubleSided&&o.enable(11),b.flipSided&&o.enable(12),b.useDepthPacking&&o.enable(13),b.dithering&&o.enable(14),b.transmission&&o.enable(15),b.sheen&&o.enable(16),b.opaque&&o.enable(17),b.pointsUvs&&o.enable(18),b.decodeVideoTexture&&o.enable(19),b.decodeVideoTextureEmissive&&o.enable(20),b.alphaToCoverage&&o.enable(21),b.numLightProbeGrids>0&&o.enable(22),b.hasPositionAttribute&&o.enable(23),v.push(o.mask)}function E(v){let b=f[v.type],R;if(b){let P=pn[b];R=Os.clone(P.uniforms)}else R=v.uniforms;return R}function _(v,b){let R=h.get(b);return R!==void 0?++R.usedTimes:(R=new D1(n,b,v,s),c.push(R),h.set(b,R)),R}function T(v){if(--v.usedTimes===0){let b=c.indexOf(v);c[b]=c[c.length-1],c.pop(),h.delete(v.cacheKey),v.destroy()}}function w(v){a.remove(v)}function A(){a.dispose()}return{getParameters:g,getProgramCacheKey:p,getUniforms:E,acquireProgram:_,releaseProgram:T,releaseShaderCache:w,programs:c,dispose:A}}function U1(){let n=new WeakMap;function t(o){return n.has(o)}function e(o){let a=n.get(o);return a===void 0&&(a={},n.set(o,a)),a}function i(o){n.delete(o)}function s(o,a,l){n.get(o)[a]=l}function r(){n=new WeakMap}return{has:t,get:e,remove:i,update:s,dispose:r}}function B1(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.material.id!==t.material.id?n.material.id-t.material.id:n.materialVariant!==t.materialVariant?n.materialVariant-t.materialVariant:n.z!==t.z?n.z-t.z:n.id-t.id}function b0(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.z!==t.z?t.z-n.z:n.id-t.id}function S0(){let n=[],t=0,e=[],i=[],s=[];function r(){t=0,e.length=0,i.length=0,s.length=0}function o(d){let f=0;return d.isInstancedMesh&&(f+=2),d.isSkinnedMesh&&(f+=1),f}function a(d,f,x,g,p,m){let M=n[t];return M===void 0?(M={id:d.id,object:d,geometry:f,material:x,materialVariant:o(d),groupOrder:g,renderOrder:d.renderOrder,z:p,group:m},n[t]=M):(M.id=d.id,M.object=d,M.geometry=f,M.material=x,M.materialVariant=o(d),M.groupOrder=g,M.renderOrder=d.renderOrder,M.z=p,M.group=m),t++,M}function l(d,f,x,g,p,m,M){M.reversedDepth===!0&&(p=-p);let E=a(d,f,x,g,p,m);x.transmission>0?i.push(E):x.transparent===!0?s.push(E):e.push(E)}function c(d,f,x,g,p,m){let M=a(d,f,x,g,p,m);x.transmission>0?i.unshift(M):x.transparent===!0?s.unshift(M):e.unshift(M)}function h(d,f){e.length>1&&e.sort(d||B1),i.length>1&&i.sort(f||b0),s.length>1&&s.sort(f||b0)}function u(){for(let d=t,f=n.length;d<f;d++){let x=n[d];if(x.id===null)break;x.id=null,x.object=null,x.geometry=null,x.material=null,x.group=null}}return{opaque:e,transmissive:i,transparent:s,init:r,push:l,unshift:c,finish:u,sort:h}}function z1(){let n=new WeakMap;function t(i,s){let r=n.get(i),o;return r===void 0?(o=new S0,n.set(i,[o])):s>=r.length?(o=new S0,r.push(o)):o=r[s],o}function e(){n=new WeakMap}return{get:t,dispose:e}}function H1(){let n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new D,color:new Ct};break;case"SpotLight":e={position:new D,direction:new D,color:new Ct,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new D,color:new Ct,distance:0,decay:0};break;case"HemisphereLight":e={direction:new D,skyColor:new Ct,groundColor:new Ct};break;case"RectAreaLight":e={color:new Ct,position:new D,halfWidth:new D,halfHeight:new D};break}return n[t.id]=e,e}}}function G1(){let n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bt,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[t.id]=e,e}}}var V1=0;function W1(n,t){return(t.castShadow?2:0)-(n.castShadow?2:0)+(t.map?1:0)-(n.map?1:0)}function X1(n){let t=new H1,e=G1(),i={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new D);let s=new D,r=new fe,o=new fe;function a(c){let h=0,u=0,d=0;for(let k=0;k<9;k++)i.probe[k].set(0,0,0);let f=0,x=0,g=0,p=0,m=0,M=0,E=0,_=0,T=0,w=0,A=0,v=0,b=0,R=0;c.sort(W1);for(let k=0,B=c.length;k<B;k++){let I=c[k],U=I.color,V=I.intensity,Z=I.distance,it=null;if(I.shadow&&I.shadow.map&&(I.shadow.map.texture.format===os?it=I.shadow.map.texture:it=I.shadow.map.depthTexture||I.shadow.map.texture),I.isAmbientLight)h+=U.r*V,u+=U.g*V,d+=U.b*V;else if(I.isLightProbe){for(let $=0;$<9;$++)i.probe[$].addScaledVector(I.sh.coefficients[$],V);R++}else if(I.isSunLight){let $=t.get(I);if($.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let J=I.shadow,et=e.get(I);et.shadowIntensity=J.intensity,et.shadowBias=J.bias,et.shadowNormalBias=J.normalBias,et.shadowRadius=J.radius,et.shadowMapSize.copy(J.mapSize).multiply(J.getFrameExtents()),i.sunShadow[x]=et,i.sunShadowMap[x]=it;let at=J.getViewportCount();for(let rt=0;rt<at;rt++)i.sunShadowMatrix[g+rt]=J.getMatrix(rt),i.sunShadowCascade[g+rt]=J._cascadeData[rt];g+=at,x++}i.sun[f]=$,f++}else if(I.isDirectionalLight){let $=t.get(I);if($.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let J=I.shadow,et=e.get(I);et.shadowIntensity=J.intensity,et.shadowBias=J.bias,et.shadowNormalBias=J.normalBias,et.shadowRadius=J.radius,et.shadowMapSize=J.mapSize,i.directionalShadow[p]=et,i.directionalShadowMap[p]=it,i.directionalShadowMatrix[p]=I.shadow.matrix,T++}i.directional[p]=$,p++}else if(I.isSpotLight){let $=t.get(I);$.position.setFromMatrixPosition(I.matrixWorld),$.color.copy(U).multiplyScalar(V),$.distance=Z,$.coneCos=Math.cos(I.angle),$.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),$.decay=I.decay,i.spot[M]=$;let J=I.shadow;if(I.map&&(i.spotLightMap[v]=I.map,v++,J.updateMatrices(I),I.castShadow&&b++),i.spotLightMatrix[M]=J.matrix,I.castShadow){let et=e.get(I);et.shadowIntensity=J.intensity,et.shadowBias=J.bias,et.shadowNormalBias=J.normalBias,et.shadowRadius=J.radius,et.shadowMapSize=J.mapSize,i.spotShadow[M]=et,i.spotShadowMap[M]=it,A++}M++}else if(I.isRectAreaLight){let $=t.get(I);$.color.copy(U).multiplyScalar(V),$.halfWidth.set(I.width*.5,0,0),$.halfHeight.set(0,I.height*.5,0),i.rectArea[E]=$,E++}else if(I.isPointLight){let $=t.get(I);if($.color.copy(I.color).multiplyScalar(I.intensity),$.distance=I.distance,$.decay=I.decay,I.castShadow){let J=I.shadow,et=e.get(I);et.shadowIntensity=J.intensity,et.shadowBias=J.bias,et.shadowNormalBias=J.normalBias,et.shadowRadius=J.radius,et.shadowMapSize=J.mapSize,et.shadowCameraNear=J.camera.near,et.shadowCameraFar=J.camera.far,i.pointShadow[m]=et,i.pointShadowMap[m]=it,i.pointShadowMatrix[m]=I.shadow.matrix,w++}i.point[m]=$,m++}else if(I.isHemisphereLight){let $=t.get(I);$.skyColor.copy(I.color).multiplyScalar(V),$.groundColor.copy(I.groundColor).multiplyScalar(V),i.hemi[_]=$,_++}}E>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=pt.LTC_FLOAT_1,i.rectAreaLTC2=pt.LTC_FLOAT_2):(i.rectAreaLTC1=pt.LTC_HALF_1,i.rectAreaLTC2=pt.LTC_HALF_2)),i.ambient[0]=h,i.ambient[1]=u,i.ambient[2]=d;let P=i.hash;(P.sunLength!==f||P.directionalLength!==p||P.pointLength!==m||P.spotLength!==M||P.rectAreaLength!==E||P.hemiLength!==_||P.numSunShadows!==x||P.numDirectionalShadows!==T||P.numPointShadows!==w||P.numSpotShadows!==A||P.numSpotMaps!==v||P.numLightProbes!==R)&&(i.sun.length=f,i.directional.length=p,i.spot.length=M,i.rectArea.length=E,i.point.length=m,i.hemi.length=_,i.sunShadow.length=x,i.sunShadowMap.length=x,i.sunShadowMatrix.length=g,i.sunShadowCascade.length=g,i.directionalShadow.length=T,i.directionalShadowMap.length=T,i.directionalShadowMatrix.length=T,i.pointShadow.length=w,i.pointShadowMap.length=w,i.pointShadowMatrix.length=w,i.spotShadow.length=A,i.spotShadowMap.length=A,i.spotLightMatrix.length=A+v-b,i.spotLightMap.length=v,i.numSpotLightShadowsWithMaps=b,i.numLightProbes=R,P.sunLength=f,P.directionalLength=p,P.pointLength=m,P.spotLength=M,P.rectAreaLength=E,P.hemiLength=_,P.numSunShadows=x,P.numDirectionalShadows=T,P.numPointShadows=w,P.numSpotShadows=A,P.numSpotMaps=v,P.numLightProbes=R,i.version=V1++)}function l(c,h){let u=0,d=0,f=0,x=0,g=0,p=0,m=h.matrixWorldInverse;for(let M=0,E=c.length;M<E;M++){let _=c[M];if(_.isSunLight){let T=i.sun[u];T.direction.setFromMatrixPosition(_.matrixWorld),T.direction.transformDirection(m),u++}else if(_.isDirectionalLight){let T=i.directional[d];T.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(m),d++}else if(_.isSpotLight){let T=i.spot[x];T.position.setFromMatrixPosition(_.matrixWorld),T.position.applyMatrix4(m),T.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(m),x++}else if(_.isRectAreaLight){let T=i.rectArea[g];T.position.setFromMatrixPosition(_.matrixWorld),T.position.applyMatrix4(m),o.identity(),r.copy(_.matrixWorld),r.premultiply(m),o.extractRotation(r),T.halfWidth.set(_.width*.5,0,0),T.halfHeight.set(0,_.height*.5,0),T.halfWidth.applyMatrix4(o),T.halfHeight.applyMatrix4(o),g++}else if(_.isPointLight){let T=i.point[f];T.position.setFromMatrixPosition(_.matrixWorld),T.position.applyMatrix4(m),f++}else if(_.isHemisphereLight){let T=i.hemi[p];T.direction.setFromMatrixPosition(_.matrixWorld),T.direction.transformDirection(m),p++}}}return{setup:a,setupView:l,state:i}}function w0(n){let t=new X1(n),e=[],i=[],s=[];function r(d){u.camera=d,e.length=0,i.length=0,s.length=0}function o(d){e.push(d)}function a(d){i.push(d)}function l(d){s.push(d)}function c(){t.setup(e)}function h(d){t.setupView(e,d)}let u={lightsArray:e,shadowsArray:i,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:u,setupLights:c,setupLightsView:h,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}function $1(n){let t=new WeakMap;function e(s,r=0){let o=t.get(s),a;return o===void 0?(a=new w0(n),t.set(s,[a])):r>=o.length?(a=new w0(n),o.push(a)):a=o[r],a}function i(){t=new WeakMap}return{get:e,dispose:i}}var Z1=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,q1=`uniform sampler2D shadow_pass;
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
}`,Y1=[new D(1,0,0),new D(-1,0,0),new D(0,1,0),new D(0,-1,0),new D(0,0,1),new D(0,0,-1)],j1=[new D(0,-1,0),new D(0,-1,0),new D(0,0,1),new D(0,0,-1),new D(0,-1,0),new D(0,-1,0)],T0=new fe,Sa=new D,mf=new D;function K1(n,t,e){let i=new Dr,s=new bt,r=new bt,o=new _e,a=new lc,l=new cc,c={},h=e.maxTextureSize,u={[is]:di,[di]:is,[yi]:yi},d=new Le({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new bt},radius:{value:4}},vertexShader:Z1,fragmentShader:q1}),f=d.clone();f.defines.HORIZONTAL_PASS=1;let x=new Me;x.setAttribute("position",new Ue(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let g=new Bt(x,d),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=ks;let m=this.type;this.render=function(w,A,v){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||w.length===0)return;this.type===_g&&(Ot("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=ks);let b=n.getRenderTarget(),R=n.getActiveCubeFace(),P=n.getActiveMipmapLevel(),k=n.state;k.setBlending(Di),k.buffers.depth.getReversed()===!0?k.buffers.color.setClear(0,0,0,0):k.buffers.color.setClear(1,1,1,1),k.buffers.depth.setTest(!0),k.setScissorTest(!1);let B=m!==this.type;B&&A.traverse(function(I){I.material&&(Array.isArray(I.material)?I.material.forEach(U=>U.needsUpdate=!0):I.material.needsUpdate=!0)});for(let I=0,U=w.length;I<U;I++){let V=w[I],Z=V.shadow;if(Z===void 0){Ot("WebGLShadowMap:",V,"has no shadow.");continue}if(Z.autoUpdate===!1&&Z.needsUpdate===!1)continue;s.copy(Z.mapSize);let it=Z.getFrameExtents();s.multiply(it),r.copy(Z.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/it.x),s.x=r.x*it.x,Z.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/it.y),s.y=r.y*it.y,Z.mapSize.y=r.y));let $=n.state.buffers.depth.getReversed();if(Z.camera._reversedDepth=$,Z.map===null||B===!0){if(Z.map!==null&&(Z.map.depthTexture!==null&&(Z.map.depthTexture.dispose(),Z.map.depthTexture=null),Z.map.dispose()),this.type===zr){if(V.isPointLight){Ot("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}Z.map=new Ce(s.x,s.y,{format:os,type:We,minFilter:Be,magFilter:Be,generateMipmaps:!1}),Z.map.texture.name=V.name+".shadowMap",Z.map.depthTexture=new Jn(s.x,s.y,Yi),Z.map.depthTexture.name=V.name+".shadowMapDepth",Z.map.depthTexture.format=an,Z.map.depthTexture.compareFunction=null,Z.map.depthTexture.minFilter=je,Z.map.depthTexture.magFilter=je}else V.isPointLight?(Z.map=new uh(s.x),Z.map.depthTexture=new rc(s.x,qi)):(Z.map=new Ce(s.x,s.y),Z.map.depthTexture=new Jn(s.x,s.y,qi)),Z.map.depthTexture.name=V.name+".shadowMap",Z.map.depthTexture.format=an,this.type===ks?(Z.map.depthTexture.compareFunction=$?lh:ah,Z.map.depthTexture.minFilter=Be,Z.map.depthTexture.magFilter=Be):(Z.map.depthTexture.compareFunction=null,Z.map.depthTexture.minFilter=je,Z.map.depthTexture.magFilter=je);Z.camera.updateProjectionMatrix()}Z.map.isWebGLCubeRenderTarget!==!0&&(Z.map.width!==s.x||Z.map.height!==s.y)&&Z.map.setSize(s.x,s.y);let J=Z.map.isWebGLCubeRenderTarget?6:Z.getViewportCount();V.isPointLight!==!0&&Z.updateMatrices(V,v);for(let et=0;et<J;et++){let at=Z.getCamera(et);if(V.isPointLight){let rt=Z.camera,zt=Z.matrix,kt=V.distance||rt.far;kt!==rt.far&&(rt.far=kt,rt.updateProjectionMatrix()),Sa.setFromMatrixPosition(V.matrixWorld),rt.position.copy(Sa),mf.copy(rt.position),mf.add(Y1[et]),rt.up.copy(j1[et]),rt.lookAt(mf),rt.updateMatrixWorld(),zt.makeTranslation(-Sa.x,-Sa.y,-Sa.z),T0.multiplyMatrices(rt.projectionMatrix,rt.matrixWorldInverse),Z._frustum.setFromProjectionMatrix(T0,rt.coordinateSystem,rt.reversedDepth)}if(Z.map.isWebGLCubeRenderTarget)n.setRenderTarget(Z.map,et),n.clear();else{et===0&&(n.setRenderTarget(Z.map),n.clear());let rt=Z.getViewport(et);o.set(r.x*rt.x,r.y*rt.y,r.x*rt.z,r.y*rt.w),k.viewport(o)}i=Z.getFrustum(et),_(A,v,at,V,this.type)}Z.isPointLightShadow!==!0&&this.type===zr&&M(Z,v),Z.needsUpdate=!1}m=this.type,p.needsUpdate=!1,n.setRenderTarget(b,R,P)};function M(w,A){let v=t.update(g);d.defines.VSM_SAMPLES!==w.blurSamples&&(d.defines.VSM_SAMPLES=w.blurSamples,f.defines.VSM_SAMPLES=w.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),w.mapPass===null?w.mapPass=new Ce(s.x,s.y,{format:os,type:We}):(w.mapPass.width!==w.map.width||w.mapPass.height!==w.map.height)&&w.mapPass.setSize(w.map.width,w.map.height),d.uniforms.shadow_pass.value=w.map.depthTexture,d.uniforms.resolution.value.set(w.map.width,w.map.height),d.uniforms.radius.value=w.radius,n.setRenderTarget(w.mapPass),n.clear(),n.renderBufferDirect(A,null,v,d,g,null),f.uniforms.shadow_pass.value=w.mapPass.texture,f.uniforms.resolution.value.set(w.map.width,w.map.height),f.uniforms.radius.value=w.radius,n.setRenderTarget(w.map),n.clear(),n.renderBufferDirect(A,null,v,f,g,null)}function E(w,A,v,b){let R=null,P=v.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(P!==void 0)R=P;else if(R=v.isPointLight===!0?l:a,n.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0||A.alphaToCoverage===!0){let k=R.uuid,B=A.uuid,I=c[k];I===void 0&&(I={},c[k]=I);let U=I[B];U===void 0&&(U=R.clone(),I[B]=U,A.addEventListener("dispose",T)),R=U}if(R.visible=A.visible,R.wireframe=A.wireframe,b===zr?R.side=A.shadowSide!==null?A.shadowSide:A.side:R.side=A.shadowSide!==null?A.shadowSide:u[A.side],R.alphaMap=A.alphaMap,R.alphaTest=A.alphaToCoverage===!0?.5:A.alphaTest,R.map=A.map,R.clipShadows=A.clipShadows,R.clippingPlanes=A.clippingPlanes,R.clipIntersection=A.clipIntersection,R.displacementMap=A.displacementMap,R.displacementScale=A.displacementScale,R.displacementBias=A.displacementBias,R.wireframeLinewidth=A.wireframeLinewidth,R.linewidth=A.linewidth,v.isPointLight===!0&&R.isMeshDistanceMaterial===!0){let k=n.properties.get(R);k.light=v}return R}function _(w,A,v,b,R){if(w.visible===!1)return;if(w.layers.test(A.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&R===zr)&&(!w.frustumCulled||w.intersectsFrustum(i))){w.modelViewMatrix.multiplyMatrices(v.matrixWorldInverse,w.matrixWorld);let B=t.update(w),I=w.material;if(Array.isArray(I)){let U=B.groups;for(let V=0,Z=U.length;V<Z;V++){let it=U[V],$=I[it.materialIndex];if($&&$.visible){let J=E(w,$,b,R);w.onBeforeShadow(n,w,A,v,B,J,it),n.renderBufferDirect(v,null,B,J,w,it),w.onAfterShadow(n,w,A,v,B,J,it)}}}else if(I.visible){let U=E(w,I,b,R);w.onBeforeShadow(n,w,A,v,B,U,null),n.renderBufferDirect(v,null,B,U,w,null),w.onAfterShadow(n,w,A,v,B,U,null)}}let k=w.children;for(let B=0,I=k.length;B<I;B++)_(k[B],A,v,b,R)}function T(w){w.target.removeEventListener("dispose",T);for(let v in c){let b=c[v],R=w.target.uuid;R in b&&(b[R].dispose(),delete b[R])}}}function J1(n,t){function e(){let N=!1,ut=new _e,K=null,dt=new _e(0,0,0,0);return{setMask:function(xt){K!==xt&&!N&&(n.colorMask(xt,xt,xt,xt),K=xt)},setLocked:function(xt){N=xt},setClear:function(xt,nt,It,Tt,ue){ue===!0&&(xt*=Tt,nt*=Tt,It*=Tt),ut.set(xt,nt,It,Tt),dt.equals(ut)===!1&&(n.clearColor(xt,nt,It,Tt),dt.copy(ut))},reset:function(){N=!1,K=null,dt.set(-1,0,0,0)}}}function i(){let N=!1,ut=!1,K=null,dt=null,xt=null;return{setReversed:function(nt){if(ut!==nt){let It=t.get("EXT_clip_control");nt?It.clipControlEXT(It.LOWER_LEFT_EXT,It.ZERO_TO_ONE_EXT):It.clipControlEXT(It.LOWER_LEFT_EXT,It.NEGATIVE_ONE_TO_ONE_EXT),ut=nt;let Tt=xt;xt=null,this.setClear(Tt)}},getReversed:function(){return ut},setTest:function(nt){nt?Q(n.DEPTH_TEST):yt(n.DEPTH_TEST)},setMask:function(nt){K!==nt&&!N&&(n.depthMask(nt),K=nt)},setFunc:function(nt){if(ut&&(nt=t0[nt]),dt!==nt){switch(nt){case Xl:n.depthFunc(n.NEVER);break;case $l:n.depthFunc(n.ALWAYS);break;case Zl:n.depthFunc(n.LESS);break;case Er:n.depthFunc(n.LEQUAL);break;case ql:n.depthFunc(n.EQUAL);break;case Yl:n.depthFunc(n.GEQUAL);break;case jl:n.depthFunc(n.GREATER);break;case Kl:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}dt=nt}},setLocked:function(nt){N=nt},setClear:function(nt){xt!==nt&&(xt=nt,ut&&(nt=1-nt),n.clearDepth(nt))},reset:function(){N=!1,K=null,dt=null,xt=null,ut=!1}}}function s(){let N=!1,ut=null,K=null,dt=null,xt=null,nt=null,It=null,Tt=null,ue=null;return{setTest:function(ee){N||(ee?Q(n.STENCIL_TEST):yt(n.STENCIL_TEST))},setMask:function(ee){ut!==ee&&!N&&(n.stencilMask(ee),ut=ee)},setFunc:function(ee,Ui,Ji){(K!==ee||dt!==Ui||xt!==Ji)&&(n.stencilFunc(ee,Ui,Ji),K=ee,dt=Ui,xt=Ji)},setOp:function(ee,Ui,Ji){(nt!==ee||It!==Ui||Tt!==Ji)&&(n.stencilOp(ee,Ui,Ji),nt=ee,It=Ui,Tt=Ji)},setLocked:function(ee){N=ee},setClear:function(ee){ue!==ee&&(n.clearStencil(ee),ue=ee)},reset:function(){N=!1,ut=null,K=null,dt=null,xt=null,nt=null,It=null,Tt=null,ue=null}}}let r=new e,o=new i,a=new s,l=new WeakMap,c=new WeakMap,h={},u={},d={},f=new WeakMap,x=[],g=null,p=!1,m=null,M=null,E=null,_=null,T=null,w=null,A=null,v=new Ct(0,0,0),b=0,R=!1,P=null,k=null,B=null,I=null,U=null,V=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS),Z=!1,it=0,$=n.getParameter(n.VERSION);$.indexOf("WebGL")!==-1?(it=parseFloat(/^WebGL (\d)/.exec($)[1]),Z=it>=1):$.indexOf("OpenGL ES")!==-1&&(it=parseFloat(/^OpenGL ES (\d)/.exec($)[1]),Z=it>=2);let J=null,et={},at=n.getParameter(n.SCISSOR_BOX),rt=n.getParameter(n.VIEWPORT),zt=new _e().fromArray(at),kt=new _e().fromArray(rt);function Lt(N,ut,K,dt){let xt=new Uint8Array(4),nt=n.createTexture();n.bindTexture(N,nt),n.texParameteri(N,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(N,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let It=0;It<K;It++)N===n.TEXTURE_3D||N===n.TEXTURE_2D_ARRAY?n.texImage3D(ut,0,n.RGBA,1,1,dt,0,n.RGBA,n.UNSIGNED_BYTE,xt):n.texImage2D(ut+It,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,xt);return nt}let X={};X[n.TEXTURE_2D]=Lt(n.TEXTURE_2D,n.TEXTURE_2D,1),X[n.TEXTURE_CUBE_MAP]=Lt(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),X[n.TEXTURE_2D_ARRAY]=Lt(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),X[n.TEXTURE_3D]=Lt(n.TEXTURE_3D,n.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),Q(n.DEPTH_TEST),o.setFunc(Er),qt(!1),ve(Od),Q(n.CULL_FACE),te(Di);function Q(N){h[N]!==!0&&(n.enable(N),h[N]=!0)}function yt(N){h[N]!==!1&&(n.disable(N),h[N]=!1)}function Ut(N,ut){return d[N]!==ut?(n.bindFramebuffer(N,ut),d[N]=ut,N===n.DRAW_FRAMEBUFFER&&(d[n.FRAMEBUFFER]=ut),N===n.FRAMEBUFFER&&(d[n.DRAW_FRAMEBUFFER]=ut),!0):!1}function _t(N,ut){let K=x,dt=!1;if(N){K=f.get(ut),K===void 0&&(K=[],f.set(ut,K));let xt=N.textures;if(K.length!==xt.length||K[0]!==n.COLOR_ATTACHMENT0){for(let nt=0,It=xt.length;nt<It;nt++)K[nt]=n.COLOR_ATTACHMENT0+nt;K.length=xt.length,dt=!0}}else K[0]!==n.BACK&&(K[0]=n.BACK,dt=!0);dt&&n.drawBuffers(K)}function Xt(N){return g!==N?(n.useProgram(N),g=N,!0):!1}let He={[Ls]:n.FUNC_ADD,[bg]:n.FUNC_SUBTRACT,[Sg]:n.FUNC_REVERSE_SUBTRACT};He[wg]=n.MIN,He[Tg]=n.MAX;let $t={[Eg]:n.ZERO,[Ag]:n.ONE,[Cg]:n.SRC_COLOR,[Bd]:n.SRC_ALPHA,[Dg]:n.SRC_ALPHA_SATURATE,[kg]:n.DST_COLOR,[Pg]:n.DST_ALPHA,[Rg]:n.ONE_MINUS_SRC_COLOR,[zd]:n.ONE_MINUS_SRC_ALPHA,[Lg]:n.ONE_MINUS_DST_COLOR,[Ig]:n.ONE_MINUS_DST_ALPHA,[Ng]:n.CONSTANT_COLOR,[Og]:n.ONE_MINUS_CONSTANT_COLOR,[Fg]:n.CONSTANT_ALPHA,[Ug]:n.ONE_MINUS_CONSTANT_ALPHA};function te(N,ut,K,dt,xt,nt,It,Tt,ue,ee){if(N===Di){p===!0&&(yt(n.BLEND),p=!1);return}if(p===!1&&(Q(n.BLEND),p=!0),N!==Mg){if(N!==m||ee!==R){if((M!==Ls||T!==Ls)&&(n.blendEquation(n.FUNC_ADD),M=Ls,T=Ls),ee)switch(N){case ns:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Ai:n.blendFunc(n.ONE,n.ONE);break;case Fd:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Ud:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:Nt("WebGLState: Invalid blending: ",N);break}else switch(N){case ns:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Ai:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case Fd:Nt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Ud:Nt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Nt("WebGLState: Invalid blending: ",N);break}E=null,_=null,w=null,A=null,v.set(0,0,0),b=0,m=N,R=ee}return}xt=xt||ut,nt=nt||K,It=It||dt,(ut!==M||xt!==T)&&(n.blendEquationSeparate(He[ut],He[xt]),M=ut,T=xt),(K!==E||dt!==_||nt!==w||It!==A)&&(n.blendFuncSeparate($t[K],$t[dt],$t[nt],$t[It]),E=K,_=dt,w=nt,A=It),(Tt.equals(v)===!1||ue!==b)&&(n.blendColor(Tt.r,Tt.g,Tt.b,ue),v.copy(Tt),b=ue),m=N,R=!1}function he(N,ut){N.side===yi?yt(n.CULL_FACE):Q(n.CULL_FACE);let K=N.side===di;ut&&(K=!K),qt(K),N.blending===ns&&N.transparent===!1?te(Di):te(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),o.setFunc(N.depthFunc),o.setTest(N.depthTest),o.setMask(N.depthWrite),r.setMask(N.colorWrite);let dt=N.stencilWrite;a.setTest(dt),dt&&(a.setMask(N.stencilWriteMask),a.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),a.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),pi(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?Q(n.SAMPLE_ALPHA_TO_COVERAGE):yt(n.SAMPLE_ALPHA_TO_COVERAGE)}function qt(N){P!==N&&(N?n.frontFace(n.CW):n.frontFace(n.CCW),P=N)}function ve(N){N!==yg?(Q(n.CULL_FACE),N!==k&&(N===Od?n.cullFace(n.BACK):N===vg?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):yt(n.CULL_FACE),k=N}function Ze(N){N!==B&&(Z&&n.lineWidth(N),B=N)}function pi(N,ut,K){N?(Q(n.POLYGON_OFFSET_FILL),(I!==ut||U!==K)&&(I=ut,U=K,o.getReversed()&&(ut=-ut),n.polygonOffset(ut,K))):yt(n.POLYGON_OFFSET_FILL)}function be(N){N?Q(n.SCISSOR_TEST):yt(n.SCISSOR_TEST)}function De(N){N===void 0&&(N=n.TEXTURE0+V-1),J!==N&&(n.activeTexture(N),J=N)}function O(N,ut,K){K===void 0&&(J===null?K=n.TEXTURE0+V-1:K=J);let dt=et[K];dt===void 0&&(dt={type:void 0,texture:void 0},et[K]=dt),(dt.type!==N||dt.texture!==ut)&&(J!==K&&(n.activeTexture(K),J=K),n.bindTexture(N,ut||X[N]),dt.type=N,dt.texture=ut)}function ni(){let N=et[J];N!==void 0&&N.type!==void 0&&(n.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function re(){try{n.compressedTexImage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function C(){try{n.compressedTexImage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function y(){try{n.texSubImage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function F(){try{n.texSubImage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function G(){try{n.compressedTexSubImage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function q(){try{n.compressedTexSubImage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function ot(){try{n.texStorage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function lt(){try{n.texStorage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function Y(){try{n.texImage2D(...arguments)}catch(N){Nt("WebGLState:",N)}}function tt(){try{n.texImage3D(...arguments)}catch(N){Nt("WebGLState:",N)}}function ct(N){return u[N]!==void 0?u[N]:n.getParameter(N)}function Rt(N,ut){u[N]!==ut&&(n.pixelStorei(N,ut),u[N]=ut)}function ft(N){zt.equals(N)===!1&&(n.scissor(N.x,N.y,N.z,N.w),zt.copy(N))}function ht(N){kt.equals(N)===!1&&(n.viewport(N.x,N.y,N.z,N.w),kt.copy(N))}function Pt(N,ut){let K=c.get(ut);K===void 0&&(K=new WeakMap,c.set(ut,K));let dt=K.get(N);dt===void 0&&(dt=n.getUniformBlockIndex(ut,N.name),K.set(N,dt))}function Dt(N,ut){let dt=c.get(ut).get(N);l.get(ut)!==dt&&(n.uniformBlockBinding(ut,dt,N.__bindingPointIndex),l.set(ut,dt))}function Gt(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),o.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),n.pixelStorei(n.PACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,n.BROWSER_DEFAULT_WEBGL),n.pixelStorei(n.PACK_ROW_LENGTH,0),n.pixelStorei(n.PACK_SKIP_PIXELS,0),n.pixelStorei(n.PACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_ROW_LENGTH,0),n.pixelStorei(n.UNPACK_IMAGE_HEIGHT,0),n.pixelStorei(n.UNPACK_SKIP_PIXELS,0),n.pixelStorei(n.UNPACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_SKIP_IMAGES,0),h={},u={},J=null,et={},d={},f=new WeakMap,x=[],g=null,p=!1,m=null,M=null,E=null,_=null,T=null,w=null,A=null,v=new Ct(0,0,0),b=0,R=!1,P=null,k=null,B=null,I=null,U=null,zt.set(0,0,n.canvas.width,n.canvas.height),kt.set(0,0,n.canvas.width,n.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:Q,disable:yt,bindFramebuffer:Ut,drawBuffers:_t,useProgram:Xt,setBlending:te,setMaterial:he,setFlipSided:qt,setCullFace:ve,setLineWidth:Ze,setPolygonOffset:pi,setScissorTest:be,activeTexture:De,bindTexture:O,unbindTexture:ni,compressedTexImage2D:re,compressedTexImage3D:C,texImage2D:Y,texImage3D:tt,pixelStorei:Rt,getParameter:ct,updateUBOMapping:Pt,uniformBlockBinding:Dt,texStorage2D:ot,texStorage3D:lt,texSubImage2D:y,texSubImage3D:F,compressedTexSubImage2D:G,compressedTexSubImage3D:q,scissor:ft,viewport:ht,reset:Gt}}function Q1(n,t,e,i,s,r,o){let a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new bt,h=new WeakMap,u=new Set,d,f=new WeakMap,x=!1;try{x=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(C,y){return x?new OffscreenCanvas(C,y):Zo("canvas")}function p(C,y,F){let G=1,q=re(C);if((q.width>F||q.height>F)&&(G=F/Math.max(q.width,q.height)),G<1)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap||typeof VideoFrame<"u"&&C instanceof VideoFrame){let ot=Math.floor(G*q.width),lt=Math.floor(G*q.height);d===void 0&&(d=g(ot,lt));let Y=y?g(ot,lt):d;return Y.width=ot,Y.height=lt,Y.getContext("2d").drawImage(C,0,0,ot,lt),Ot("WebGLRenderer: Texture has been resized from ("+q.width+"x"+q.height+") to ("+ot+"x"+lt+")."),Y}else return"data"in C&&Ot("WebGLRenderer: Image in DataTexture is too big ("+q.width+"x"+q.height+")."),C;return C}function m(C){return C.generateMipmaps}function M(C){n.generateMipmap(C)}function E(C){return C.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:C.isWebGL3DRenderTarget?n.TEXTURE_3D:C.isWebGLArrayRenderTarget||C.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function _(C,y,F,G,q,ot=!1){if(C!==null){if(n[C]!==void 0)return n[C];Ot("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let lt;G&&(lt=t.get("EXT_texture_norm16"),lt||Ot("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let Y=y;if(y===n.RED&&(F===n.FLOAT&&(Y=n.R32F),F===n.HALF_FLOAT&&(Y=n.R16F),F===n.UNSIGNED_BYTE&&(Y=n.R8),F===n.UNSIGNED_SHORT&&lt&&(Y=lt.R16_EXT),F===n.SHORT&&lt&&(Y=lt.R16_SNORM_EXT)),y===n.RED_INTEGER&&(F===n.UNSIGNED_BYTE&&(Y=n.R8UI),F===n.UNSIGNED_SHORT&&(Y=n.R16UI),F===n.UNSIGNED_INT&&(Y=n.R32UI),F===n.BYTE&&(Y=n.R8I),F===n.SHORT&&(Y=n.R16I),F===n.INT&&(Y=n.R32I)),y===n.RG&&(F===n.FLOAT&&(Y=n.RG32F),F===n.HALF_FLOAT&&(Y=n.RG16F),F===n.UNSIGNED_BYTE&&(Y=n.RG8),F===n.UNSIGNED_SHORT&&lt&&(Y=lt.RG16_EXT),F===n.SHORT&&lt&&(Y=lt.RG16_SNORM_EXT)),y===n.RG_INTEGER&&(F===n.UNSIGNED_BYTE&&(Y=n.RG8UI),F===n.UNSIGNED_SHORT&&(Y=n.RG16UI),F===n.UNSIGNED_INT&&(Y=n.RG32UI),F===n.BYTE&&(Y=n.RG8I),F===n.SHORT&&(Y=n.RG16I),F===n.INT&&(Y=n.RG32I)),y===n.RGB_INTEGER&&(F===n.UNSIGNED_BYTE&&(Y=n.RGB8UI),F===n.UNSIGNED_SHORT&&(Y=n.RGB16UI),F===n.UNSIGNED_INT&&(Y=n.RGB32UI),F===n.BYTE&&(Y=n.RGB8I),F===n.SHORT&&(Y=n.RGB16I),F===n.INT&&(Y=n.RGB32I)),y===n.RGBA_INTEGER&&(F===n.UNSIGNED_BYTE&&(Y=n.RGBA8UI),F===n.UNSIGNED_SHORT&&(Y=n.RGBA16UI),F===n.UNSIGNED_INT&&(Y=n.RGBA32UI),F===n.BYTE&&(Y=n.RGBA8I),F===n.SHORT&&(Y=n.RGBA16I),F===n.INT&&(Y=n.RGBA32I)),y===n.RGB&&(F===n.UNSIGNED_SHORT&&lt&&(Y=lt.RGB16_EXT),F===n.SHORT&&lt&&(Y=lt.RGB16_SNORM_EXT),F===n.UNSIGNED_INT_5_9_9_9_REV&&(Y=n.RGB9_E5),F===n.UNSIGNED_INT_10F_11F_11F_REV&&(Y=n.R11F_G11F_B10F)),y===n.RGBA){let tt=ot?$o:Yt.getTransfer(q);F===n.FLOAT&&(Y=n.RGBA32F),F===n.HALF_FLOAT&&(Y=n.RGBA16F),F===n.UNSIGNED_BYTE&&(Y=tt===ne?n.SRGB8_ALPHA8:n.RGBA8),F===n.UNSIGNED_SHORT&&lt&&(Y=lt.RGBA16_EXT),F===n.SHORT&&lt&&(Y=lt.RGBA16_SNORM_EXT),F===n.UNSIGNED_SHORT_4_4_4_4&&(Y=n.RGBA4),F===n.UNSIGNED_SHORT_5_5_5_1&&(Y=n.RGB5_A1)}return(Y===n.R16F||Y===n.R32F||Y===n.RG16F||Y===n.RG32F||Y===n.RGBA16F||Y===n.RGBA32F)&&t.get("EXT_color_buffer_float"),Y}function T(C,y){let F;return C?y===null||y===qi||y===Vr?F=n.DEPTH24_STENCIL8:y===Yi?F=n.DEPTH32F_STENCIL8:y===Gr&&(F=n.DEPTH24_STENCIL8,Ot("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):y===null||y===qi||y===Vr?F=n.DEPTH_COMPONENT24:y===Yi?F=n.DEPTH_COMPONENT32F:y===Gr&&(F=n.DEPTH_COMPONENT16),F}function w(C,y){return m(C)===!0||C.isFramebufferTexture&&C.minFilter!==je&&C.minFilter!==Be?Math.log2(Math.max(y.width,y.height))+1:C.mipmaps!==void 0&&C.mipmaps.length>0?C.mipmaps.length:C.isCompressedTexture&&Array.isArray(C.image)?y.mipmaps.length:1}function A(C){let y=C.target;y.removeEventListener("dispose",A),b(y),y.isVideoTexture&&h.delete(y),y.isHTMLTexture&&u.delete(y)}function v(C){let y=C.target;y.removeEventListener("dispose",v),P(y)}function b(C){let y=i.get(C);if(y.__webglInit===void 0)return;let F=C.source,G=f.get(F);if(G){let q=G[y.__cacheKey];q.usedTimes--,q.usedTimes===0&&R(C),Object.keys(G).length===0&&f.delete(F)}i.remove(C)}function R(C){let y=i.get(C);n.deleteTexture(y.__webglTexture);let F=C.source,G=f.get(F);delete G[y.__cacheKey],o.memory.textures--}function P(C){let y=i.get(C);if(C.depthTexture&&(C.depthTexture.dispose(),i.remove(C.depthTexture)),C.isWebGLCubeRenderTarget)for(let G=0;G<6;G++){if(Array.isArray(y.__webglFramebuffer[G]))for(let q=0;q<y.__webglFramebuffer[G].length;q++)n.deleteFramebuffer(y.__webglFramebuffer[G][q]);else n.deleteFramebuffer(y.__webglFramebuffer[G]);y.__webglDepthbuffer&&n.deleteRenderbuffer(y.__webglDepthbuffer[G])}else{if(Array.isArray(y.__webglFramebuffer))for(let G=0;G<y.__webglFramebuffer.length;G++)n.deleteFramebuffer(y.__webglFramebuffer[G]);else n.deleteFramebuffer(y.__webglFramebuffer);if(y.__webglDepthbuffer&&n.deleteRenderbuffer(y.__webglDepthbuffer),y.__webglMultisampledFramebuffer&&n.deleteFramebuffer(y.__webglMultisampledFramebuffer),y.__webglColorRenderbuffer)for(let G=0;G<y.__webglColorRenderbuffer.length;G++)y.__webglColorRenderbuffer[G]&&n.deleteRenderbuffer(y.__webglColorRenderbuffer[G]);y.__webglDepthRenderbuffer&&n.deleteRenderbuffer(y.__webglDepthRenderbuffer)}let F=C.textures;for(let G=0,q=F.length;G<q;G++){let ot=i.get(F[G]);ot.__webglTexture&&(n.deleteTexture(ot.__webglTexture),o.memory.textures--),i.remove(F[G])}i.remove(C)}let k=0;function B(){k=0}function I(){return k}function U(C){k=C}function V(){let C=k;return C>=s.maxTextures&&Ot("WebGLTextures: Trying to use "+(C+1)+" texture units while this GPU supports only "+s.maxTextures),k+=1,C}function Z(C){let y=[];return y.push(C.wrapS),y.push(C.wrapT),y.push(C.wrapR||0),y.push(C.magFilter),y.push(C.minFilter),y.push(C.anisotropy),y.push(C.internalFormat),y.push(C.format),y.push(C.type),y.push(C.generateMipmaps),y.push(C.premultiplyAlpha),y.push(C.flipY),y.push(C.unpackAlignment),y.push(C.colorSpace),y.join()}function it(C,y){let F=i.get(C);if(C.isVideoTexture&&O(C),C.isRenderTargetTexture===!1&&C.isExternalTexture!==!0&&C.version>0&&F.__version!==C.version){let G=C.image;if(G===null)Ot("WebGLRenderer: Texture marked for update but no image data found.");else if(G.complete===!1)Ot("WebGLRenderer: Texture marked for update but image is incomplete");else{yt(F,C,y);return}}else C.isExternalTexture&&(F.__webglTexture=C.sourceTexture?C.sourceTexture:null);e.bindTexture(n.TEXTURE_2D,F.__webglTexture,n.TEXTURE0+y)}function $(C,y){let F=i.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&F.__version!==C.version){yt(F,C,y);return}else C.isExternalTexture&&(F.__webglTexture=C.sourceTexture?C.sourceTexture:null);e.bindTexture(n.TEXTURE_2D_ARRAY,F.__webglTexture,n.TEXTURE0+y)}function J(C,y){let F=i.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&F.__version!==C.version){yt(F,C,y);return}e.bindTexture(n.TEXTURE_3D,F.__webglTexture,n.TEXTURE0+y)}function et(C,y){let F=i.get(C);if(C.isCubeDepthTexture!==!0&&C.version>0&&F.__version!==C.version){Ut(F,C,y);return}e.bindTexture(n.TEXTURE_CUBE_MAP,F.__webglTexture,n.TEXTURE0+y)}let at={[Jl]:n.REPEAT,[on]:n.CLAMP_TO_EDGE,[Ql]:n.MIRRORED_REPEAT},rt={[je]:n.NEAREST,[Hg]:n.NEAREST_MIPMAP_NEAREST,[ma]:n.NEAREST_MIPMAP_LINEAR,[Be]:n.LINEAR,[Sc]:n.LINEAR_MIPMAP_NEAREST,[dn]:n.LINEAR_MIPMAP_LINEAR},zt={[Xg]:n.NEVER,[jg]:n.ALWAYS,[$g]:n.LESS,[ah]:n.LEQUAL,[Zg]:n.EQUAL,[lh]:n.GEQUAL,[qg]:n.GREATER,[Yg]:n.NOTEQUAL};function kt(C,y){if(y.type===Yi&&t.has("OES_texture_float_linear")===!1&&(y.magFilter===Be||y.magFilter===Sc||y.magFilter===ma||y.magFilter===dn||y.minFilter===Be||y.minFilter===Sc||y.minFilter===ma||y.minFilter===dn)&&Ot("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(C,n.TEXTURE_WRAP_S,at[y.wrapS]),n.texParameteri(C,n.TEXTURE_WRAP_T,at[y.wrapT]),(C===n.TEXTURE_3D||C===n.TEXTURE_2D_ARRAY)&&n.texParameteri(C,n.TEXTURE_WRAP_R,at[y.wrapR]),n.texParameteri(C,n.TEXTURE_MAG_FILTER,rt[y.magFilter]),n.texParameteri(C,n.TEXTURE_MIN_FILTER,rt[y.minFilter]),y.compareFunction&&(n.texParameteri(C,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(C,n.TEXTURE_COMPARE_FUNC,zt[y.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(y.magFilter===je||y.minFilter!==ma&&y.minFilter!==dn||y.type===Yi&&t.has("OES_texture_float_linear")===!1)return;if(y.anisotropy>1||i.get(y).__currentAnisotropy){let F=t.get("EXT_texture_filter_anisotropic");n.texParameterf(C,F.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(y.anisotropy,s.getMaxAnisotropy())),i.get(y).__currentAnisotropy=y.anisotropy}}}function Lt(C,y){let F=!1;C.__webglInit===void 0&&(C.__webglInit=!0,y.addEventListener("dispose",A));let G=y.source,q=f.get(G);q===void 0&&(q={},f.set(G,q));let ot=Z(y);if(ot!==C.__cacheKey){q[ot]===void 0&&(q[ot]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,F=!0),q[ot].usedTimes++;let lt=q[C.__cacheKey];lt!==void 0&&(q[C.__cacheKey].usedTimes--,lt.usedTimes===0&&R(y)),C.__cacheKey=ot,C.__webglTexture=q[ot].texture}return F}function X(C,y,F){return Math.floor(Math.floor(C/F)/y)}function Q(C,y,F,G){let ot=C.updateRanges;if(ot.length===0)e.texSubImage2D(n.TEXTURE_2D,0,0,0,y.width,y.height,F,G,y.data);else{ot.sort((Rt,ft)=>Rt.start-ft.start);let lt=0;for(let Rt=1;Rt<ot.length;Rt++){let ft=ot[lt],ht=ot[Rt],Pt=ft.start+ft.count,Dt=X(ht.start,y.width,4),Gt=X(ft.start,y.width,4);ht.start<=Pt+1&&Dt===Gt&&X(ht.start+ht.count-1,y.width,4)===Dt?ft.count=Math.max(ft.count,ht.start+ht.count-ft.start):(++lt,ot[lt]=ht)}ot.length=lt+1;let Y=e.getParameter(n.UNPACK_ROW_LENGTH),tt=e.getParameter(n.UNPACK_SKIP_PIXELS),ct=e.getParameter(n.UNPACK_SKIP_ROWS);e.pixelStorei(n.UNPACK_ROW_LENGTH,y.width);for(let Rt=0,ft=ot.length;Rt<ft;Rt++){let ht=ot[Rt],Pt=Math.floor(ht.start/4),Dt=Math.ceil(ht.count/4),Gt=Pt%y.width,N=Math.floor(Pt/y.width),ut=Dt,K=1;e.pixelStorei(n.UNPACK_SKIP_PIXELS,Gt),e.pixelStorei(n.UNPACK_SKIP_ROWS,N),e.texSubImage2D(n.TEXTURE_2D,0,Gt,N,ut,K,F,G,y.data)}C.clearUpdateRanges(),e.pixelStorei(n.UNPACK_ROW_LENGTH,Y),e.pixelStorei(n.UNPACK_SKIP_PIXELS,tt),e.pixelStorei(n.UNPACK_SKIP_ROWS,ct)}}function yt(C,y,F){let G=n.TEXTURE_2D;(y.isDataArrayTexture||y.isCompressedArrayTexture)&&(G=n.TEXTURE_2D_ARRAY),y.isData3DTexture&&(G=n.TEXTURE_3D);let q=Lt(C,y),ot=y.source;e.bindTexture(G,C.__webglTexture,n.TEXTURE0+F);let lt=i.get(ot);if(ot.version!==lt.__version||q===!0){if(e.activeTexture(n.TEXTURE0+F),(typeof ImageBitmap<"u"&&y.image instanceof ImageBitmap)===!1){let K=Yt.getPrimaries(Yt.workingColorSpace),dt=y.colorSpace===kn?null:Yt.getPrimaries(y.colorSpace),xt=y.colorSpace===kn||K===dt?n.NONE:n.BROWSER_DEFAULT_WEBGL;e.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,y.flipY),e.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),e.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,xt)}e.pixelStorei(n.UNPACK_ALIGNMENT,y.unpackAlignment);let tt=p(y.image,!1,s.maxTextureSize);tt=ni(y,tt);let ct=r.convert(y.format,y.colorSpace),Rt=r.convert(y.type),ft=_(y.internalFormat,ct,Rt,y.normalized,y.colorSpace,y.isVideoTexture);kt(G,y);let ht,Pt=y.mipmaps,Dt=y.isVideoTexture!==!0,Gt=lt.__version===void 0||q===!0,N=ot.dataReady,ut=w(y,tt);if(y.isDepthTexture)ft=T(y.format===rs,y.type),Gt&&(Dt?e.texStorage2D(n.TEXTURE_2D,1,ft,tt.width,tt.height):e.texImage2D(n.TEXTURE_2D,0,ft,tt.width,tt.height,0,ct,Rt,null));else if(y.isDataTexture)if(Pt.length>0){Dt&&Gt&&e.texStorage2D(n.TEXTURE_2D,ut,ft,Pt[0].width,Pt[0].height);for(let K=0,dt=Pt.length;K<dt;K++)ht=Pt[K],Dt?N&&e.texSubImage2D(n.TEXTURE_2D,K,0,0,ht.width,ht.height,ct,Rt,ht.data):e.texImage2D(n.TEXTURE_2D,K,ft,ht.width,ht.height,0,ct,Rt,ht.data);y.generateMipmaps=!1}else Dt?(Gt&&e.texStorage2D(n.TEXTURE_2D,ut,ft,tt.width,tt.height),N&&Q(y,tt,ct,Rt)):e.texImage2D(n.TEXTURE_2D,0,ft,tt.width,tt.height,0,ct,Rt,tt.data);else if(y.isCompressedTexture)if(y.isCompressedArrayTexture){Dt&&Gt&&e.texStorage3D(n.TEXTURE_2D_ARRAY,ut,ft,Pt[0].width,Pt[0].height,tt.depth);for(let K=0,dt=Pt.length;K<dt;K++)if(ht=Pt[K],y.format!==_i)if(ct!==null)if(Dt){if(N)if(y.layerUpdates.size>0){let xt=cf(ht.width,ht.height,y.format,y.type);for(let nt of y.layerUpdates){let It=ht.data.subarray(nt*xt/ht.data.BYTES_PER_ELEMENT,(nt+1)*xt/ht.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,K,0,0,nt,ht.width,ht.height,1,ct,It)}}else e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,K,0,0,0,ht.width,ht.height,tt.depth,ct,ht.data)}else e.compressedTexImage3D(n.TEXTURE_2D_ARRAY,K,ft,ht.width,ht.height,tt.depth,0,ht.data,0,0);else Ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Dt?N&&e.texSubImage3D(n.TEXTURE_2D_ARRAY,K,0,0,0,ht.width,ht.height,tt.depth,ct,Rt,ht.data):e.texImage3D(n.TEXTURE_2D_ARRAY,K,ft,ht.width,ht.height,tt.depth,0,ct,Rt,ht.data);y.layerUpdates.size>0&&y.clearLayerUpdates()}else{Dt&&Gt&&e.texStorage2D(n.TEXTURE_2D,ut,ft,Pt[0].width,Pt[0].height);for(let K=0,dt=Pt.length;K<dt;K++)ht=Pt[K],y.format!==_i?ct!==null?Dt?N&&e.compressedTexSubImage2D(n.TEXTURE_2D,K,0,0,ht.width,ht.height,ct,ht.data):e.compressedTexImage2D(n.TEXTURE_2D,K,ft,ht.width,ht.height,0,ht.data):Ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Dt?N&&e.texSubImage2D(n.TEXTURE_2D,K,0,0,ht.width,ht.height,ct,Rt,ht.data):e.texImage2D(n.TEXTURE_2D,K,ft,ht.width,ht.height,0,ct,Rt,ht.data)}else if(y.isDataArrayTexture)if(Dt){if(Gt&&e.texStorage3D(n.TEXTURE_2D_ARRAY,ut,ft,tt.width,tt.height,tt.depth),N)if(y.layerUpdates.size>0){let K=cf(tt.width,tt.height,y.format,y.type);for(let dt of y.layerUpdates){let xt=tt.data.subarray(dt*K/tt.data.BYTES_PER_ELEMENT,(dt+1)*K/tt.data.BYTES_PER_ELEMENT);e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,dt,tt.width,tt.height,1,ct,Rt,xt)}y.clearLayerUpdates()}else e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,tt.width,tt.height,tt.depth,ct,Rt,tt.data)}else e.texImage3D(n.TEXTURE_2D_ARRAY,0,ft,tt.width,tt.height,tt.depth,0,ct,Rt,tt.data);else if(y.isData3DTexture)Dt?(Gt&&e.texStorage3D(n.TEXTURE_3D,ut,ft,tt.width,tt.height,tt.depth),N&&e.texSubImage3D(n.TEXTURE_3D,0,0,0,0,tt.width,tt.height,tt.depth,ct,Rt,tt.data)):e.texImage3D(n.TEXTURE_3D,0,ft,tt.width,tt.height,tt.depth,0,ct,Rt,tt.data);else if(y.isFramebufferTexture){if(Gt)if(Dt)e.texStorage2D(n.TEXTURE_2D,ut,ft,tt.width,tt.height);else{let K=tt.width,dt=tt.height;for(let xt=0;xt<ut;xt++)e.texImage2D(n.TEXTURE_2D,xt,ft,K,dt,0,ct,Rt,null),K>>=1,dt>>=1}}else if(y.isHTMLTexture){if("texElementImage2D"in n){let K=n.canvas;if(K.hasAttribute("layoutsubtree")||K.setAttribute("layoutsubtree","true"),tt.parentNode!==K){K.appendChild(tt),u.add(y),K.onpaint=dt=>{let xt=dt.changedElements;for(let nt of u)xt.includes(nt.image)&&(nt.needsUpdate=!0)},K.requestPaint();return}if(n.texElementImage2D.length===3)n.texElementImage2D(n.TEXTURE_2D,n.RGBA8,tt);else{let xt=n.RGBA,nt=n.RGBA,It=n.UNSIGNED_BYTE;n.texElementImage2D(n.TEXTURE_2D,0,xt,nt,It,tt)}n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)}}else if(Pt.length>0){if(Dt&&Gt){let K=re(Pt[0]);e.texStorage2D(n.TEXTURE_2D,ut,ft,K.width,K.height)}for(let K=0,dt=Pt.length;K<dt;K++)ht=Pt[K],Dt?N&&e.texSubImage2D(n.TEXTURE_2D,K,0,0,ct,Rt,ht):e.texImage2D(n.TEXTURE_2D,K,ft,ct,Rt,ht);y.generateMipmaps=!1}else if(Dt){if(Gt){let K=re(tt);e.texStorage2D(n.TEXTURE_2D,ut,ft,K.width,K.height)}N&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,ct,Rt,tt)}else e.texImage2D(n.TEXTURE_2D,0,ft,ct,Rt,tt);m(y)&&M(G),lt.__version=ot.version,y.onUpdate&&y.onUpdate(y)}C.__version=y.version}function Ut(C,y,F){if(y.image.length!==6)return;let G=Lt(C,y),q=y.source;e.bindTexture(n.TEXTURE_CUBE_MAP,C.__webglTexture,n.TEXTURE0+F);let ot=i.get(q);if(q.version!==ot.__version||G===!0){e.activeTexture(n.TEXTURE0+F);let lt=Yt.getPrimaries(Yt.workingColorSpace),Y=y.colorSpace===kn?null:Yt.getPrimaries(y.colorSpace),tt=y.colorSpace===kn||lt===Y?n.NONE:n.BROWSER_DEFAULT_WEBGL;e.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,y.flipY),e.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),e.pixelStorei(n.UNPACK_ALIGNMENT,y.unpackAlignment),e.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,tt);let ct=y.isCompressedTexture||y.image[0].isCompressedTexture,Rt=y.image[0]&&y.image[0].isDataTexture,ft=[];for(let nt=0;nt<6;nt++)!ct&&!Rt?ft[nt]=p(y.image[nt],!0,s.maxCubemapSize):ft[nt]=Rt?y.image[nt].image:y.image[nt],ft[nt]=ni(y,ft[nt]);let ht=ft[0],Pt=r.convert(y.format,y.colorSpace),Dt=r.convert(y.type),Gt=_(y.internalFormat,Pt,Dt,y.normalized,y.colorSpace),N=y.isVideoTexture!==!0,ut=ot.__version===void 0||G===!0,K=q.dataReady,dt=w(y,ht);kt(n.TEXTURE_CUBE_MAP,y);let xt;if(ct){N&&ut&&e.texStorage2D(n.TEXTURE_CUBE_MAP,dt,Gt,ht.width,ht.height);for(let nt=0;nt<6;nt++){xt=ft[nt].mipmaps;for(let It=0;It<xt.length;It++){let Tt=xt[It];y.format!==_i?Pt!==null?N?K&&e.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+nt,It,0,0,Tt.width,Tt.height,Pt,Tt.data):e.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+nt,It,Gt,Tt.width,Tt.height,0,Tt.data):Ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):N?K&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+nt,It,0,0,Tt.width,Tt.height,Pt,Dt,Tt.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+nt,It,Gt,Tt.width,Tt.height,0,Pt,Dt,Tt.data)}}}else{if(xt=y.mipmaps,N&&ut){xt.length>0&&dt++;let nt=re(ft[0]);e.texStorage2D(n.TEXTURE_CUBE_MAP,dt,Gt,nt.width,nt.height)}for(let nt=0;nt<6;nt++)if(Rt){N?K&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,0,0,ft[nt].width,ft[nt].height,Pt,Dt,ft[nt].data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,Gt,ft[nt].width,ft[nt].height,0,Pt,Dt,ft[nt].data);for(let It=0;It<xt.length;It++){let ue=xt[It].image[nt].image;N?K&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+nt,It+1,0,0,ue.width,ue.height,Pt,Dt,ue.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+nt,It+1,Gt,ue.width,ue.height,0,Pt,Dt,ue.data)}}else{N?K&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,0,0,Pt,Dt,ft[nt]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,Gt,Pt,Dt,ft[nt]);for(let It=0;It<xt.length;It++){let Tt=xt[It];N?K&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+nt,It+1,0,0,Pt,Dt,Tt.image[nt]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+nt,It+1,Gt,Pt,Dt,Tt.image[nt])}}}m(y)&&M(n.TEXTURE_CUBE_MAP),ot.__version=q.version,y.onUpdate&&y.onUpdate(y)}C.__version=y.version}function _t(C,y,F,G,q,ot){let lt=r.convert(F.format,F.colorSpace),Y=r.convert(F.type),tt=_(F.internalFormat,lt,Y,F.normalized,F.colorSpace),ct=i.get(y),Rt=i.get(F);if(Rt.__renderTarget=y,!ct.__hasExternalTextures){let ft=Math.max(1,y.width>>ot),ht=Math.max(1,y.height>>ot);q===n.TEXTURE_3D||q===n.TEXTURE_2D_ARRAY?e.texImage3D(q,ot,tt,ft,ht,y.depth,0,lt,Y,null):e.texImage2D(q,ot,tt,ft,ht,0,lt,Y,null)}e.bindFramebuffer(n.FRAMEBUFFER,C),De(y)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,G,q,Rt.__webglTexture,0,be(y)):(q===n.TEXTURE_2D||q>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&q<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,G,q,Rt.__webglTexture,ot),e.bindFramebuffer(n.FRAMEBUFFER,null)}function Xt(C,y,F){if(n.bindRenderbuffer(n.RENDERBUFFER,C),y.depthBuffer){let G=y.depthTexture,q=G&&G.isDepthTexture?G.type:null,ot=T(y.stencilBuffer,q),lt=y.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;De(y)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,be(y),ot,y.width,y.height):F?n.renderbufferStorageMultisample(n.RENDERBUFFER,be(y),ot,y.width,y.height):n.renderbufferStorage(n.RENDERBUFFER,ot,y.width,y.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,lt,n.RENDERBUFFER,C)}else{let G=y.textures;for(let q=0;q<G.length;q++){let ot=G[q],lt=r.convert(ot.format,ot.colorSpace),Y=r.convert(ot.type),tt=_(ot.internalFormat,lt,Y,ot.normalized,ot.colorSpace);De(y)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,be(y),tt,y.width,y.height):F?n.renderbufferStorageMultisample(n.RENDERBUFFER,be(y),tt,y.width,y.height):n.renderbufferStorage(n.RENDERBUFFER,tt,y.width,y.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function He(C,y,F){let G=y.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(n.FRAMEBUFFER,C),!(y.depthTexture&&y.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let q=i.get(y.depthTexture);if(q.__renderTarget=y,(!q.__webglTexture||y.depthTexture.image.width!==y.width||y.depthTexture.image.height!==y.height)&&(y.depthTexture.image.width=y.width,y.depthTexture.image.height=y.height,y.depthTexture.needsUpdate=!0),G){if(q.__webglInit===void 0&&(q.__webglInit=!0,y.depthTexture.addEventListener("dispose",A)),q.__webglTexture===void 0){q.__webglTexture=n.createTexture(),e.bindTexture(n.TEXTURE_CUBE_MAP,q.__webglTexture),kt(n.TEXTURE_CUBE_MAP,y.depthTexture);let ct=r.convert(y.depthTexture.format),Rt=r.convert(y.depthTexture.type),ft;y.depthTexture.format===an?ft=n.DEPTH_COMPONENT24:y.depthTexture.format===rs&&(ft=n.DEPTH24_STENCIL8);for(let ht=0;ht<6;ht++)n.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ht,0,ft,y.width,y.height,0,ct,Rt,null)}}else it(y.depthTexture,0);let ot=q.__webglTexture,lt=be(y),Y=G?n.TEXTURE_CUBE_MAP_POSITIVE_X+F:n.TEXTURE_2D,tt=y.depthTexture.format===rs?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;if(y.depthTexture.format===an)De(y)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,tt,Y,ot,0,lt):n.framebufferTexture2D(n.FRAMEBUFFER,tt,Y,ot,0);else if(y.depthTexture.format===rs)De(y)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,tt,Y,ot,0,lt):n.framebufferTexture2D(n.FRAMEBUFFER,tt,Y,ot,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function $t(C){let y=i.get(C),F=C.isWebGLCubeRenderTarget===!0;if(y.__boundDepthTexture!==C.depthTexture){let G=C.depthTexture;if(y.__depthDisposeCallback&&y.__depthDisposeCallback(),G){let q=()=>{delete y.__boundDepthTexture,delete y.__depthDisposeCallback,G.removeEventListener("dispose",q)};G.addEventListener("dispose",q),y.__depthDisposeCallback=q}y.__boundDepthTexture=G}if(C.depthTexture&&!y.__autoAllocateDepthBuffer)if(F)for(let G=0;G<6;G++)He(y.__webglFramebuffer[G],C,G);else{let G=C.texture.mipmaps;G&&G.length>0?He(y.__webglFramebuffer[0],C,0):He(y.__webglFramebuffer,C,0)}else if(F){y.__webglDepthbuffer=[];for(let G=0;G<6;G++)if(e.bindFramebuffer(n.FRAMEBUFFER,y.__webglFramebuffer[G]),y.__webglDepthbuffer[G]===void 0)y.__webglDepthbuffer[G]=n.createRenderbuffer(),Xt(y.__webglDepthbuffer[G],C,!1);else{let q=C.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ot=y.__webglDepthbuffer[G];n.bindRenderbuffer(n.RENDERBUFFER,ot),n.framebufferRenderbuffer(n.FRAMEBUFFER,q,n.RENDERBUFFER,ot)}}else{let G=C.texture.mipmaps;if(G&&G.length>0?e.bindFramebuffer(n.FRAMEBUFFER,y.__webglFramebuffer[0]):e.bindFramebuffer(n.FRAMEBUFFER,y.__webglFramebuffer),y.__webglDepthbuffer===void 0)y.__webglDepthbuffer=n.createRenderbuffer(),Xt(y.__webglDepthbuffer,C,!1);else{let q=C.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ot=y.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,ot),n.framebufferRenderbuffer(n.FRAMEBUFFER,q,n.RENDERBUFFER,ot)}}e.bindFramebuffer(n.FRAMEBUFFER,null)}function te(C,y,F){let G=i.get(C);y!==void 0&&_t(G.__webglFramebuffer,C,C.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),F!==void 0&&$t(C)}function he(C){let y=C.texture,F=i.get(C),G=i.get(y);C.addEventListener("dispose",v);let q=C.textures,ot=C.isWebGLCubeRenderTarget===!0,lt=q.length>1;if(lt||(G.__webglTexture===void 0&&(G.__webglTexture=n.createTexture()),G.__version=y.version,o.memory.textures++),ot){F.__webglFramebuffer=[];for(let Y=0;Y<6;Y++)if(y.mipmaps&&y.mipmaps.length>0){F.__webglFramebuffer[Y]=[];for(let tt=0;tt<y.mipmaps.length;tt++)F.__webglFramebuffer[Y][tt]=n.createFramebuffer()}else F.__webglFramebuffer[Y]=n.createFramebuffer()}else{if(y.mipmaps&&y.mipmaps.length>0){F.__webglFramebuffer=[];for(let Y=0;Y<y.mipmaps.length;Y++)F.__webglFramebuffer[Y]=n.createFramebuffer()}else F.__webglFramebuffer=n.createFramebuffer();if(lt)for(let Y=0,tt=q.length;Y<tt;Y++){let ct=i.get(q[Y]);ct.__webglTexture===void 0&&(ct.__webglTexture=n.createTexture(),o.memory.textures++)}if(C.samples>0&&De(C)===!1){F.__webglMultisampledFramebuffer=n.createFramebuffer(),F.__webglColorRenderbuffer=[],e.bindFramebuffer(n.FRAMEBUFFER,F.__webglMultisampledFramebuffer);for(let Y=0;Y<q.length;Y++){let tt=q[Y];F.__webglColorRenderbuffer[Y]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,F.__webglColorRenderbuffer[Y]);let ct=r.convert(tt.format,tt.colorSpace),Rt=r.convert(tt.type),ft=_(tt.internalFormat,ct,Rt,tt.normalized,tt.colorSpace,C.isXRRenderTarget===!0),ht=be(C);n.renderbufferStorageMultisample(n.RENDERBUFFER,ht,ft,C.width,C.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Y,n.RENDERBUFFER,F.__webglColorRenderbuffer[Y])}n.bindRenderbuffer(n.RENDERBUFFER,null),C.depthBuffer&&(F.__webglDepthRenderbuffer=n.createRenderbuffer(),Xt(F.__webglDepthRenderbuffer,C,!0)),e.bindFramebuffer(n.FRAMEBUFFER,null)}}if(ot){e.bindTexture(n.TEXTURE_CUBE_MAP,G.__webglTexture),kt(n.TEXTURE_CUBE_MAP,y);for(let Y=0;Y<6;Y++)if(y.mipmaps&&y.mipmaps.length>0)for(let tt=0;tt<y.mipmaps.length;tt++)_t(F.__webglFramebuffer[Y][tt],C,y,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,tt);else _t(F.__webglFramebuffer[Y],C,y,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0);m(y)&&M(n.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(lt){for(let Y=0,tt=q.length;Y<tt;Y++){let ct=q[Y],Rt=i.get(ct),ft=n.TEXTURE_2D;(C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(ft=C.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),e.bindTexture(ft,Rt.__webglTexture),kt(ft,ct),_t(F.__webglFramebuffer,C,ct,n.COLOR_ATTACHMENT0+Y,ft,0),m(ct)&&M(ft)}e.unbindTexture()}else{let Y=n.TEXTURE_2D;if((C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(Y=C.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),e.bindTexture(Y,G.__webglTexture),kt(Y,y),y.mipmaps&&y.mipmaps.length>0)for(let tt=0;tt<y.mipmaps.length;tt++)_t(F.__webglFramebuffer[tt],C,y,n.COLOR_ATTACHMENT0,Y,tt);else _t(F.__webglFramebuffer,C,y,n.COLOR_ATTACHMENT0,Y,0);m(y)&&M(Y),e.unbindTexture()}C.depthBuffer&&$t(C)}function qt(C){let y=C.textures;for(let F=0,G=y.length;F<G;F++){let q=y[F];if(m(q)){let ot=E(C),lt=i.get(q).__webglTexture;e.bindTexture(ot,lt),M(ot),e.unbindTexture()}}}let ve=[],Ze=[];function pi(C){if(C.samples>0){if(De(C)===!1){let y=C.textures,F=C.width,G=C.height,q=n.COLOR_BUFFER_BIT,ot=C.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,lt=i.get(C),Y=y.length>1;if(Y)for(let ct=0;ct<y.length;ct++)e.bindFramebuffer(n.FRAMEBUFFER,lt.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ct,n.RENDERBUFFER,null),e.bindFramebuffer(n.FRAMEBUFFER,lt.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+ct,n.TEXTURE_2D,null,0);e.bindFramebuffer(n.READ_FRAMEBUFFER,lt.__webglMultisampledFramebuffer);let tt=C.texture.mipmaps;tt&&tt.length>0?e.bindFramebuffer(n.DRAW_FRAMEBUFFER,lt.__webglFramebuffer[0]):e.bindFramebuffer(n.DRAW_FRAMEBUFFER,lt.__webglFramebuffer);for(let ct=0;ct<y.length;ct++){if(C.resolveDepthBuffer&&(C.depthBuffer&&(q|=n.DEPTH_BUFFER_BIT),C.stencilBuffer&&C.resolveStencilBuffer&&(q|=n.STENCIL_BUFFER_BIT)),Y){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,lt.__webglColorRenderbuffer[ct]);let Rt=i.get(y[ct]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Rt,0)}n.blitFramebuffer(0,0,F,G,0,0,F,G,q,n.NEAREST),l===!0&&(ve.length=0,Ze.length=0,ve.push(n.COLOR_ATTACHMENT0+ct),C.depthBuffer&&C.storeMultisampledDepthBuffer===!1&&(ve.push(ot),Ze.push(ot),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,Ze)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,ve))}if(e.bindFramebuffer(n.READ_FRAMEBUFFER,null),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),Y)for(let ct=0;ct<y.length;ct++){e.bindFramebuffer(n.FRAMEBUFFER,lt.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ct,n.RENDERBUFFER,lt.__webglColorRenderbuffer[ct]);let Rt=i.get(y[ct]).__webglTexture;e.bindFramebuffer(n.FRAMEBUFFER,lt.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+ct,n.TEXTURE_2D,Rt,0)}e.bindFramebuffer(n.DRAW_FRAMEBUFFER,lt.__webglMultisampledFramebuffer)}else if(C.depthBuffer&&C.storeMultisampledDepthBuffer===!1&&l){let y=C.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[y])}}}function be(C){return Math.min(s.maxSamples,C.samples)}function De(C){let y=i.get(C);return C.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&y.__useRenderToTexture!==!1}function O(C){let y=o.render.frame;h.get(C)!==y&&(h.set(C,y),C.update())}function ni(C,y){let F=C.colorSpace,G=C.format,q=C.type;return C.isCompressedTexture===!0||C.isVideoTexture===!0||F!==Xo&&F!==kn&&(Yt.getTransfer(F)===ne?(G!==_i||q!==vi)&&Ot("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Nt("WebGLTextures: Unsupported texture color space:",F)),y}function re(C){return typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement?(c.width=C.naturalWidth||C.width,c.height=C.naturalHeight||C.height):typeof VideoFrame<"u"&&C instanceof VideoFrame?(c.width=C.displayWidth,c.height=C.displayHeight):(c.width=C.width,c.height=C.height),c}this.allocateTextureUnit=V,this.resetTextureUnits=B,this.getTextureUnits=I,this.setTextureUnits=U,this.setTexture2D=it,this.setTexture2DArray=$,this.setTexture3D=J,this.setTextureCube=et,this.rebindTextures=te,this.setupRenderTarget=he,this.updateRenderTargetMipmap=qt,this.updateMultisampleRenderTarget=pi,this.setupDepthRenderbuffer=$t,this.setupFrameBufferTexture=_t,this.useMultisampledRTT=De,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function tw(n,t){function e(i,s=kn){let r,o=Yt.getTransfer(s);if(i===vi)return n.UNSIGNED_BYTE;if(i===Tc)return n.UNSIGNED_SHORT_4_4_4_4;if(i===Ec)return n.UNSIGNED_SHORT_5_5_5_1;if(i===Jd)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===Qd)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===jd)return n.BYTE;if(i===Kd)return n.SHORT;if(i===Gr)return n.UNSIGNED_SHORT;if(i===wc)return n.INT;if(i===qi)return n.UNSIGNED_INT;if(i===Yi)return n.FLOAT;if(i===We)return n.HALF_FLOAT;if(i===tf)return n.ALPHA;if(i===ef)return n.RGB;if(i===_i)return n.RGBA;if(i===an)return n.DEPTH_COMPONENT;if(i===rs)return n.DEPTH_STENCIL;if(i===nf)return n.RED;if(i===Ac)return n.RED_INTEGER;if(i===os)return n.RG;if(i===Cc)return n.RG_INTEGER;if(i===Rc)return n.RGBA_INTEGER;if(i===ga||i===xa||i===ya||i===va)if(o===ne)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===ga)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===xa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===ya)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===va)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===ga)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===xa)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===ya)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===va)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Pc||i===Ic||i===kc||i===Lc)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===Pc)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Ic)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===kc)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Lc)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Dc||i===Nc||i===Oc||i===Fc||i===Uc||i===_a||i===Bc)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(i===Dc||i===Nc)return o===ne?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===Oc)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(i===Fc)return r.COMPRESSED_R11_EAC;if(i===Uc)return r.COMPRESSED_SIGNED_R11_EAC;if(i===_a)return r.COMPRESSED_RG11_EAC;if(i===Bc)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===zc||i===Hc||i===Gc||i===Vc||i===Wc||i===Xc||i===$c||i===Zc||i===qc||i===Yc||i===jc||i===Kc||i===Jc||i===Qc)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(i===zc)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Hc)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Gc)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Vc)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Wc)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Xc)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===$c)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Zc)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===qc)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Yc)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===jc)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Kc)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Jc)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Qc)return o===ne?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===th||i===eh||i===ih)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(i===th)return o===ne?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===eh)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===ih)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===nh||i===sh||i===Ma||i===rh)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(i===nh)return r.COMPRESSED_RED_RGTC1_EXT;if(i===sh)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Ma)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===rh)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Vr?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:e}}var ew=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,iw=`
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

}`,Sf=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let i=new na(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=i}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,i=new Le({vertexShader:ew,fragmentShader:iw,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new Bt(new ke(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},wf=class extends ln{constructor(t,e){super();let i=this,s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,u=null,d=null,f=null,x=null,g=typeof XRWebGLBinding<"u",p=new Sf,m={},M=e.getContextAttributes(),E=null,_=null,T=[],w=[],A=new bt,v=null,b=null,R=new Ye;R.viewport=new _e;let P=new Ye;P.viewport=new _e;let k=[R,P],B=new Mc,I=null,U=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(X){let Q=T[X];return Q===void 0&&(Q=new Ir,T[X]=Q),Q.getTargetRaySpace()},this.getControllerGrip=function(X){let Q=T[X];return Q===void 0&&(Q=new Ir,T[X]=Q),Q.getGripSpace()},this.getHand=function(X){let Q=T[X];return Q===void 0&&(Q=new Ir,T[X]=Q),Q.getHandSpace()};function V(X){let Q=w.indexOf(X.inputSource);if(Q===-1)return;let yt=T[Q];yt!==void 0&&(yt.update(X.inputSource,X.frame,c||o),yt.dispatchEvent({type:X.type,data:X.inputSource}))}function Z(){s.removeEventListener("select",V),s.removeEventListener("selectstart",V),s.removeEventListener("selectend",V),s.removeEventListener("squeeze",V),s.removeEventListener("squeezestart",V),s.removeEventListener("squeezeend",V),s.removeEventListener("end",Z),s.removeEventListener("inputsourceschange",it);for(let X=0;X<T.length;X++){let Q=w[X];Q!==null&&(w[X]=null,T[X].disconnect(Q))}I=null,U=null,p.reset();for(let X in m)delete m[X];if(t.setRenderTarget(E),f=null,d=null,u=null,s=null,_=null,Lt.stop(),i.isPresenting=!1,t.setPixelRatio(v),t.setSize(A.width,A.height,!1),b!==null){let X=b.camera;X.fov=b.fov,X.zoom=b.zoom,X.updateProjectionMatrix(),b=null}i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(X){r=X,i.isPresenting===!0&&Ot("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(X){a=X,i.isPresenting===!0&&Ot("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(X){c=X},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u===null&&g&&(u=new XRWebGLBinding(s,e)),u},this.getFrame=function(){return x},this.getSession=function(){return s},this.setSession=async function(X){if(s=X,s!==null){if(E=t.getRenderTarget(),s.addEventListener("select",V),s.addEventListener("selectstart",V),s.addEventListener("selectend",V),s.addEventListener("squeeze",V),s.addEventListener("squeezestart",V),s.addEventListener("squeezeend",V),s.addEventListener("end",Z),s.addEventListener("inputsourceschange",it),M.xrCompatible!==!0&&await e.makeXRCompatible(),v=t.getPixelRatio(),t.getSize(A),g&&"createProjectionLayer"in XRWebGLBinding.prototype){let yt=null,Ut=null,_t=null;M.depth&&(_t=M.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,yt=M.stencil?rs:an,Ut=M.stencil?Vr:qi);let Xt={colorFormat:e.RGBA8,depthFormat:_t,scaleFactor:r};u=this.getBinding(),d=u.createProjectionLayer(Xt),s.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),_=new Ce(d.textureWidth,d.textureHeight,{format:_i,type:vi,depthTexture:new Jn(d.textureWidth,d.textureHeight,Ut,void 0,void 0,void 0,void 0,void 0,void 0,yt),stencilBuffer:M.stencil,colorSpace:t.outputColorSpace,samples:M.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{let yt={antialias:M.antialias,alpha:!0,depth:M.depth,stencil:M.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,e,yt),s.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),_=new Ce(f.framebufferWidth,f.framebufferHeight,{format:_i,type:vi,colorSpace:t.outputColorSpace,stencilBuffer:M.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}_.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),Lt.setContext(s),Lt.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function it(X){for(let Q=0;Q<X.removed.length;Q++){let yt=X.removed[Q],Ut=w.indexOf(yt);Ut>=0&&(w[Ut]=null,T[Ut].disconnect(yt))}for(let Q=0;Q<X.added.length;Q++){let yt=X.added[Q],Ut=w.indexOf(yt);if(Ut===-1){for(let Xt=0;Xt<T.length;Xt++)if(Xt>=w.length){w.push(yt),Ut=Xt;break}else if(w[Xt]===null){w[Xt]=yt,Ut=Xt;break}if(Ut===-1)break}let _t=T[Ut];_t&&_t.connect(yt)}}let $=new D,J=new D;function et(X,Q,yt){$.setFromMatrixPosition(Q.matrixWorld),J.setFromMatrixPosition(yt.matrixWorld);let Ut=$.distanceTo(J),_t=Q.projectionMatrix.elements,Xt=yt.projectionMatrix.elements,He=_t[14]/(_t[10]-1),$t=_t[14]/(_t[10]+1),te=(_t[9]+1)/_t[5],he=(_t[9]-1)/_t[5],qt=(_t[8]-1)/_t[0],ve=(Xt[8]+1)/Xt[0],Ze=He*qt,pi=He*ve,be=Ut/(-qt+ve),De=be*-qt;if(Q.matrixWorld.decompose(X.position,X.quaternion,X.scale),X.translateX(De),X.translateZ(be),X.matrixWorld.compose(X.position,X.quaternion,X.scale),X.matrixWorldInverse.copy(X.matrixWorld).invert(),_t[10]===-1)X.projectionMatrix.copy(Q.projectionMatrix),X.projectionMatrixInverse.copy(Q.projectionMatrixInverse);else{let O=He+be,ni=$t+be,re=Ze-De,C=pi+(Ut-De),y=te*$t/ni*O,F=he*$t/ni*O;X.projectionMatrix.makePerspective(re,C,y,F,O,ni),X.projectionMatrixInverse.copy(X.projectionMatrix).invert()}}function at(X,Q){Q===null?X.matrixWorld.copy(X.matrix):X.matrixWorld.multiplyMatrices(Q.matrixWorld,X.matrix),X.matrixWorldInverse.copy(X.matrixWorld).invert()}this.updateCamera=function(X){if(s===null)return;let Q=X.near,yt=X.far;p.texture!==null&&(p.depthNear>0&&(Q=p.depthNear),p.depthFar>0&&(yt=p.depthFar)),B.near=P.near=R.near=Q,B.far=P.far=R.far=yt,(I!==B.near||U!==B.far)&&(s.updateRenderState({depthNear:B.near,depthFar:B.far}),I=B.near,U=B.far),B.layers.mask=X.layers.mask|6,R.layers.mask=B.layers.mask&-5,P.layers.mask=B.layers.mask&-3;let Ut=X.parent,_t=B.cameras;at(B,Ut);for(let Xt=0;Xt<_t.length;Xt++)at(_t[Xt],Ut);_t.length===2?et(B,R,P):B.projectionMatrix.copy(R.projectionMatrix),b===null&&X.isPerspectiveCamera&&(b={camera:X,fov:X.fov,zoom:X.zoom}),rt(X,B,Ut)};function rt(X,Q,yt){yt===null?X.matrix.copy(Q.matrixWorld):(X.matrix.copy(yt.matrixWorld),X.matrix.invert(),X.matrix.multiply(Q.matrixWorld)),X.matrix.decompose(X.position,X.quaternion,X.scale),X.updateMatrixWorld(!0),X.projectionMatrix.copy(Q.projectionMatrix),X.projectionMatrixInverse.copy(Q.projectionMatrixInverse),X.isPerspectiveCamera&&(X.fov=Yo*2*Math.atan(1/X.projectionMatrix.elements[5]),X.zoom=1)}this.getCamera=function(){return B},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(X){l=X,d!==null&&(d.fixedFoveation=X),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=X)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(B)},this.getCameraTexture=function(X){return m[X]};let zt=null;function kt(X,Q){if(h=Q.getViewerPose(c||o),x=Q,h!==null){let yt=h.views;f!==null&&(t.setRenderTargetFramebuffer(_,f.framebuffer),t.setRenderTarget(_));let Ut=!1;yt.length!==B.cameras.length&&(B.cameras.length=0,Ut=!0);for(let $t=0;$t<yt.length;$t++){let te=yt[$t],he=null;if(f!==null)he=f.getViewport(te);else{let ve=u.getViewSubImage(d,te);he=ve.viewport,$t===0&&(t.setRenderTargetTextures(_,ve.colorTexture,ve.depthStencilTexture),t.setRenderTarget(_))}let qt=k[$t];qt===void 0&&(qt=new Ye,qt.layers.enable($t),qt.viewport=new _e,k[$t]=qt),qt.matrix.fromArray(te.transform.matrix),qt.matrix.decompose(qt.position,qt.quaternion,qt.scale),qt.projectionMatrix.fromArray(te.projectionMatrix),qt.projectionMatrixInverse.copy(qt.projectionMatrix).invert(),qt.viewport.set(he.x,he.y,he.width,he.height),$t===0&&(B.matrix.copy(qt.matrix),B.matrix.decompose(B.position,B.quaternion,B.scale)),Ut===!0&&B.cameras.push(qt)}let _t=s.enabledFeatures;if(_t&&_t.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&g){u=i.getBinding();let $t=u.getDepthInformation(yt[0]);$t&&$t.isValid&&$t.texture&&p.init($t,s.renderState)}if(_t&&_t.includes("camera-access")&&g){t.state.unbindTexture(),u=i.getBinding();for(let $t=0;$t<yt.length;$t++){let te=yt[$t].camera;if(te){let he=m[te];he||(he=new na,m[te]=he);let qt=u.getCameraImage(te);he.sourceTexture=qt}}}}for(let yt=0;yt<T.length;yt++){let Ut=w[yt],_t=T[yt];Ut!==null&&_t!==void 0&&_t.update(Ut,Q,c||o)}zt&&zt(X,Q),Q.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:Q}),x=null}let Lt=new E0;Lt.setAnimationLoop(kt),this.setAnimationLoop=function(X){zt=X},this.dispose=function(){}}},nw=new fe,k0=new Ht;k0.set(-1,0,0,0,1,0,0,0,1);function sw(n,t){function e(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function i(p,m){m.color.getRGB(p.fogColor.value,of(n)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function s(p,m,M,E,_){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?r(p,m):m.isMeshLambertMaterial?(r(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(r(p,m),u(p,m)):m.isMeshPhongMaterial?(r(p,m),h(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(r(p,m),d(p,m),m.isMeshPhysicalMaterial&&f(p,m,_)):m.isMeshMatcapMaterial?(r(p,m),x(p,m)):m.isMeshDepthMaterial?r(p,m):m.isMeshDistanceMaterial?(r(p,m),g(p,m)):m.isMeshNormalMaterial?r(p,m):m.isLineBasicMaterial?(o(p,m),m.isLineDashedMaterial&&a(p,m)):m.isPointsMaterial?l(p,m,M,E):m.isSpriteMaterial?c(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,e(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,e(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===di&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,e(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===di&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,e(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,e(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,e(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);let M=t.get(m),E=M.envMap,_=M.envMapRotation;E&&(p.envMap.value=E,p.envMapRotation.value.setFromMatrix4(nw.makeRotationFromEuler(_)).transpose(),E.isCubeTexture&&E.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(k0),p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,e(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,e(m.aoMap,p.aoMapTransform))}function o(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,e(m.map,p.mapTransform))}function a(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function l(p,m,M,E){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*M,p.scale.value=E*.5,m.map&&(p.map.value=m.map,e(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function c(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,e(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function h(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function u(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function d(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,e(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,e(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function f(p,m,M){p.ior.value=m.ior,m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,e(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,e(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,e(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,e(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,e(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===di&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.retroreflectivity>0&&(p.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,e(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,e(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=M.texture,p.transmissionSamplerSize.value.set(M.width,M.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,e(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,e(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,e(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,e(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,e(m.specularIntensityMap,p.specularIntensityMapTransform))}function x(p,m){m.matcap&&(p.matcap.value=m.matcap)}function g(p,m){let M=t.get(m).light;p.referencePosition.value.setFromMatrixPosition(M.matrixWorld),p.nearDistance.value=M.shadow.camera.near,p.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function rw(n,t,e,i){let s={},r={},o=[],a=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(_,T){let w=T.program;i.uniformBlockBinding(_,w)}function c(_,T){let w=s[_.id];w===void 0&&(p(_),w=h(_),s[_.id]=w,_.addEventListener("dispose",M));let A=T.program;i.updateUBOMapping(_,A);let v=t.render.frame;r[_.id]!==v&&(d(_),r[_.id]=v)}function h(_){let T=u();_.__bindingPointIndex=T;let w=n.createBuffer(),A=_.__size,v=_.usage;return n.bindBuffer(n.UNIFORM_BUFFER,w),n.bufferData(n.UNIFORM_BUFFER,A,v),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,T,w),w}function u(){for(let _=0;_<a;_++)if(o.indexOf(_)===-1)return o.push(_),_;return Nt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(_){let T=s[_.id],w=_.uniforms,A=_.__cache;n.bindBuffer(n.UNIFORM_BUFFER,T);for(let v=0,b=w.length;v<b;v++){let R=w[v];if(Array.isArray(R))for(let P=0,k=R.length;P<k;P++)f(R[P],v,P,A);else f(R,v,0,A)}n.bindBuffer(n.UNIFORM_BUFFER,null)}function f(_,T,w,A){if(g(_,T,w,A)===!0){let v=_.__offset,b=_.value;if(Array.isArray(b)){let R=0;for(let P=0;P<b.length;P++){let k=b[P],B=m(k);x(k,_.__data,R),typeof k!="number"&&typeof k!="boolean"&&!k.isMatrix3&&!ArrayBuffer.isView(k)&&(R+=B.storage/Float32Array.BYTES_PER_ELEMENT)}}else x(b,_.__data,0);n.bufferSubData(n.UNIFORM_BUFFER,v,_.__data)}}function x(_,T,w){typeof _=="number"||typeof _=="boolean"?T[0]=_:_.isMatrix3?(T[0]=_.elements[0],T[1]=_.elements[1],T[2]=_.elements[2],T[3]=0,T[4]=_.elements[3],T[5]=_.elements[4],T[6]=_.elements[5],T[7]=0,T[8]=_.elements[6],T[9]=_.elements[7],T[10]=_.elements[8],T[11]=0):ArrayBuffer.isView(_)?T.set(new _.constructor(_.buffer,_.byteOffset,T.length)):_.toArray(T,w)}function g(_,T,w,A){let v=_.value,b=T+"_"+w;if(A[b]===void 0)return typeof v=="number"||typeof v=="boolean"?A[b]=v:ArrayBuffer.isView(v)?A[b]=v.slice():A[b]=v.clone(),!0;{let R=A[b];if(typeof v=="number"||typeof v=="boolean"){if(R!==v)return A[b]=v,!0}else{if(ArrayBuffer.isView(v))return!0;if(R.equals(v)===!1)return R.copy(v),!0}}return!1}function p(_){let T=_.uniforms,w=0,A=16;for(let b=0,R=T.length;b<R;b++){let P=Array.isArray(T[b])?T[b]:[T[b]];for(let k=0,B=P.length;k<B;k++){let I=P[k],U=Array.isArray(I.value)?I.value:[I.value];for(let V=0,Z=U.length;V<Z;V++){let it=U[V],$=m(it),J=w%A,et=J%$.boundary,at=J+et;w+=et,at!==0&&A-at<$.storage&&(w+=A-at),I.__data=new Float32Array($.storage/Float32Array.BYTES_PER_ELEMENT),I.__offset=w,w+=$.storage}}}let v=w%A;return v>0&&(w+=A-v),_.__size=w,_.__cache={},this}function m(_){let T={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(T.boundary=4,T.storage=4):_.isVector2?(T.boundary=8,T.storage=8):_.isVector3||_.isColor?(T.boundary=16,T.storage=12):_.isVector4?(T.boundary=16,T.storage=16):_.isMatrix3?(T.boundary=48,T.storage=48):_.isMatrix4?(T.boundary=64,T.storage=64):_.isTexture?Ot("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(_)?(T.boundary=16,T.storage=_.byteLength):Ot("WebGLRenderer: Unsupported uniform value type.",_),T}function M(_){let T=_.target;T.removeEventListener("dispose",M);let w=o.indexOf(T.__bindingPointIndex);o.splice(w,1),n.deleteBuffer(s[T.id]),delete s[T.id],delete r[T.id]}function E(){for(let _ in s)n.deleteBuffer(s[_]);o=[],s={},r={}}return{bind:l,update:c,dispose:E}}var ow=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),fn=null;function aw(){return fn===null&&(fn=new Lr(ow,16,16,os,We),fn.name="DFG_LUT",fn.minFilter=Be,fn.magFilter=Be,fn.wrapS=on,fn.wrapT=on,fn.generateMipmaps=!1,fn.needsUpdate=!0),fn}var dh=class{constructor(t={}){let{canvas:e=Kg(),context:i=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=vi}=t;this.isWebGLRenderer=!0;let x;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");x=i.getContextAttributes().alpha}else x=o;let g=f,p=new Set([Rc,Cc,Ac]),m=new Set([vi,qi,Gr,Vr,Tc,Ec]),M=new Uint32Array(4),E=new Int32Array(4),_=new D,T=null,w=null,A=[],v=[],b=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Ci,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let R=this,P=!1,k=null,B=null,I=null,U=null;this._outputColorSpace=Ae;let V=0,Z=0,it=null,$=-1,J=null,et=new _e,at=new _e,rt=null,zt=new Ct(0),kt=0,Lt=e.width,X=e.height,Q=1,yt=null,Ut=null,_t=new _e(0,0,Lt,X),Xt=new _e(0,0,Lt,X),He=!1,$t=new Dr,te=!1,he=!1,qt=new fe,ve=new D,Ze=new _e,pi={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},be=!1;function De(){return it===null?Q:1}let O=i;function ni(S,L){return e.getContext(S,L)}let re,C,y,F,G,q,ot,lt,Y,tt,ct,Rt,ft,ht,Pt,Dt,Gt,N,ut,K,dt,xt,nt;try{let S={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"186"}`),e.addEventListener("webglcontextlost",ue,!1),e.addEventListener("webglcontextrestored",ee,!1),e.addEventListener("webglcontextcreationerror",Ui,!1),O===null){let L="webgl2";if(O=ni(L,S),O===null)throw ni(L)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}It()}catch(S){throw e.removeEventListener("webglcontextlost",ue,!1),e.removeEventListener("webglcontextrestored",ee,!1),e.removeEventListener("webglcontextcreationerror",Ui,!1),Nt("WebGLRenderer: "+S.message),S}function It(){re=new pS(O),re.init(),dt=new tw(O,re),C=new sS(O,re,t,dt),y=new J1(O,re),C.reversedDepthBuffer&&d&&y.buffers.depth.setReversed(!0),B=O.createFramebuffer(),I=O.createFramebuffer(),U=O.createFramebuffer(),F=new xS(O),G=new U1,q=new Q1(O,re,y,G,C,dt,F),ot=new fS(R),lt=new v_(O),xt=new iS(O,lt),Y=new mS(O,lt,F,xt),tt=new vS(O,Y,lt,xt,F),N=new yS(O,C,q),Pt=new rS(G),ct=new F1(R,ot,re,C,xt,Pt),Rt=new sw(R,G),ft=new z1,ht=new $1(re),Gt=new eS(R,ot,y,tt,x,l),Dt=new K1(R,tt,C),nt=new rw(O,F,C,y),ut=new nS(O,re,F),K=new gS(O,re,F),F.programs=ct.programs,R.capabilities=C,R.extensions=re,R.properties=G,R.renderLists=ft,R.shadowMap=Dt,R.state=y,R.info=F}g!==vi&&(b=new MS(g,e.width,e.height,a,s,r));let Tt=new wf(R,O);this.xr=Tt,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){let S=re.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){let S=re.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return Q},this.setPixelRatio=function(S){S!==void 0&&(Q=S,this.setSize(Lt,X,!1))},this.getSize=function(S){return S.set(Lt,X)},this.setSize=function(S,L,W=!0){if(Tt.isPresenting){Ot("WebGLRenderer: Can't change size while VR device is presenting.");return}Lt=S,X=L,e.width=Math.floor(S*Q),e.height=Math.floor(L*Q),W===!0&&(e.style.width=S+"px",e.style.height=L+"px"),b!==null&&b.setSize(e.width,e.height),this.setViewport(0,0,S,L)},this.getDrawingBufferSize=function(S){return S.set(Lt*Q,X*Q).floor()},this.setDrawingBufferSize=function(S,L,W){Lt=S,X=L,Q=W,e.width=Math.floor(S*W),e.height=Math.floor(L*W),this.setViewport(0,0,S,L)},this.setEffects=function(S){if(g===vi){Nt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(S){for(let L=0;L<S.length;L++)if(S[L].isOutputPass===!0){Ot("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}b.setEffects(S||[])},this.getCurrentViewport=function(S){return S.copy(et)},this.getViewport=function(S){return S.copy(_t)},this.setViewport=function(S,L,W,z){S.isVector4?_t.set(S.x,S.y,S.z,S.w):_t.set(S,L,W,z),y.viewport(et.copy(_t).multiplyScalar(Q).round())},this.getScissor=function(S){return S.copy(Xt)},this.setScissor=function(S,L,W,z){S.isVector4?Xt.set(S.x,S.y,S.z,S.w):Xt.set(S,L,W,z),y.scissor(at.copy(Xt).multiplyScalar(Q).round())},this.getScissorTest=function(){return He},this.setScissorTest=function(S){y.setScissorTest(He=S)},this.setOpaqueSort=function(S){yt=S},this.setTransparentSort=function(S){Ut=S},this.getClearColor=function(S){return S.copy(Gt.getClearColor())},this.setClearColor=function(){Gt.setClearColor(...arguments)},this.getClearAlpha=function(){return Gt.getClearAlpha()},this.setClearAlpha=function(){Gt.setClearAlpha(...arguments)},this.clear=function(S=!0,L=!0,W=!0){let z=0;if(S){let H=!1;if(it!==null){let gt=it.texture.format;H=p.has(gt)}if(H){let gt=it.texture.type,Mt=m.has(gt),mt=Gt.getClearColor(),St=Gt.getClearAlpha(),Et=mt.r,Vt=mt.g,Zt=mt.b;Mt?(M[0]=Et,M[1]=Vt,M[2]=Zt,M[3]=St,O.clearBufferuiv(O.COLOR,0,M)):(E[0]=Et,E[1]=Vt,E[2]=Zt,E[3]=St,O.clearBufferiv(O.COLOR,0,E))}else z|=O.COLOR_BUFFER_BIT}L&&(z|=O.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),W&&(z|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),z!==0&&O.clear(z)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(S){S.setRenderer(this),k=S},this.dispose=function(){e.removeEventListener("webglcontextlost",ue,!1),e.removeEventListener("webglcontextrestored",ee,!1),e.removeEventListener("webglcontextcreationerror",Ui,!1),Gt.dispose(),ft.dispose(),ht.dispose(),G.dispose(),ot.dispose(),tt.dispose(),xt.dispose(),nt.dispose(),ct.dispose(),Tt.dispose(),Tt.removeEventListener("sessionstart",mp),Tt.removeEventListener("sessionend",gp),gs.stop()};function ue(S){S.preventDefault(),qo("WebGLRenderer: Context Lost."),P=!0}function ee(){qo("WebGLRenderer: Context Restored."),P=!1;let S=F.autoReset,L=Dt.enabled,W=Dt.autoUpdate,z=Dt.needsUpdate,H=Dt.type;It(),F.autoReset=S,Dt.enabled=L,Dt.autoUpdate=W,Dt.needsUpdate=z,Dt.type=H}function Ui(S){Nt("WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function Ji(S){let L=S.target;L.removeEventListener("dispose",Ji),Ny(L)}function Ny(S){Oy(S),G.remove(S)}function Oy(S){let L=G.get(S).programs;L!==void 0&&(L.forEach(function(W){ct.releaseProgram(W)}),S.isShaderMaterial&&ct.releaseShaderCache(S))}this.renderBufferDirect=function(S,L,W,z,H,gt){L===null&&(L=pi);let Mt=H.isMesh&&H.matrixWorld.determinantAffine()<0,mt=By(S,L,W,z,H);y.setMaterial(z,Mt);let St=W.index,Et=1;if(z.wireframe===!0){if(St=Y.getWireframeAttribute(W),St===void 0)return;Et=2}let Vt=W.drawRange,Zt=W.attributes.position,wt=Vt.start*Et,ie=(Vt.start+Vt.count)*Et;gt!==null&&(wt=Math.max(wt,gt.start*Et),ie=Math.min(ie,(gt.start+gt.count)*Et)),St!==null?(wt=Math.max(wt,0),ie=Math.min(ie,St.count)):Zt!=null&&(wt=Math.max(wt,0),ie=Math.min(ie,Zt.count));let Ne=ie-wt;if(Ne<0||Ne===1/0)return;xt.setup(H,z,mt,W,St);let pe,ce=ut;if(St!==null&&(pe=lt.get(St),ce=K,ce.setIndex(pe)),H.isMesh)z.wireframe===!0?(y.setLineWidth(z.wireframeLinewidth*De()),ce.setMode(O.LINES)):ce.setMode(O.TRIANGLES);else if(H.isLine){let si=z.linewidth;si===void 0&&(si=1),y.setLineWidth(si*De()),H.isLineSegments?ce.setMode(O.LINES):H.isLineLoop?ce.setMode(O.LINE_LOOP):ce.setMode(O.LINE_STRIP)}else H.isPoints?ce.setMode(O.POINTS):H.isSprite&&ce.setMode(O.TRIANGLES);if(H.isBatchedMesh)if(re.get("WEBGL_multi_draw"))ce.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{let si=H._multiDrawStarts,vt=H._multiDrawCounts,ci=H._multiDrawCount,Qt=St?lt.get(St).bytesPerElement:1,Ri=G.get(z).currentProgram.getUniforms();for(let Qi=0;Qi<ci;Qi++)Ri.setValue(O,"_gl_DrawID",Qi),ce.render(si[Qi]/Qt,vt[Qi])}else if(H.isInstancedMesh)ce.renderInstances(wt,Ne,H.count);else if(W.isInstancedBufferGeometry){let si=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,vt=Math.min(W.instanceCount,si);ce.renderInstances(wt,Ne,vt)}else ce.render(wt,Ne)};function pp(S,L,W,z){k!==null&&S.isNodeMaterial&&k.setObject(z,S),te===!0&&Pt.setState(S,W,!1),S.transparent===!0&&S.side===yi&&S.forceSinglePass===!1?(S.side=di,S.needsUpdate=!0,Za(S,L,z),S.side=is,S.needsUpdate=!0,Za(S,L,z),S.side=yi):Za(S,L,z)}this.compile=function(S,L,W=null){W===null&&(W=S),k!==null&&k.renderStart(S,L,W),w=ht.get(W),w.init(L),v.push(w),W.traverseVisible(function(H){H.isLight&&H.layers.test(L.layers)&&(w.pushLight(H),H.castShadow&&w.pushShadow(H))}),S!==W&&S.traverseVisible(function(H){H.isLight&&H.layers.test(L.layers)&&(w.pushLight(H),H.castShadow&&w.pushShadow(H))}),w.setupLights(),k!==null&&k.updateLights(w.state.lightsArray),he=this.localClippingEnabled,te=Pt.init(this.clippingPlanes,he),te===!0&&Pt.setGlobalState(this.clippingPlanes,L),k!==null&&Dt.render(w.state.shadowsArray,W,L);let z=new Set;return S.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;let gt=H.material;if(gt)if(Array.isArray(gt))for(let Mt=0;Mt<gt.length;Mt++){let mt=gt[Mt];pp(mt,W,L,H),z.add(mt)}else pp(gt,W,L,H),z.add(gt)}),w=v.pop(),k!==null&&k.renderEnd(),z},this.compileAsync=function(S,L,W=null){let z=this.compile(S,L,W);return new Promise(H=>{function gt(){if(z.forEach(function(Mt){let St=G.get(Mt).currentProgram;(St===void 0||St.isReady())&&z.delete(Mt)}),z.size===0){H(S);return}setTimeout(gt,10)}re.get("KHR_parallel_shader_compile")!==null?gt():setTimeout(gt,10)})};let Ru=null;function Fy(S){Ru&&Ru(S)}function mp(){gs.stop()}function gp(){gs.start()}let gs=new E0;gs.setAnimationLoop(Fy),typeof self<"u"&&gs.setContext(self),this.setAnimationLoop=function(S){Ru=S,Tt.setAnimationLoop(S),S===null?gs.stop():gs.start()},Tt.addEventListener("sessionstart",mp),Tt.addEventListener("sessionend",gp),this.render=function(S,L){if(L!==void 0&&L.isCamera!==!0){Nt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(P===!0)return;k!==null&&k.renderStart(S,L);let W=Tt.enabled===!0&&Tt.isPresenting===!0,z=b!==null&&(it===null||W)&&b.begin(R,it);if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),L.parent===null&&L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),Tt.enabled===!0&&Tt.isPresenting===!0&&(b===null||b.isCompositing()===!1)&&(Tt.cameraAutoUpdate===!0&&Tt.updateCamera(L),L=Tt.getCamera()),S.isScene===!0&&S.onBeforeRender(R,S,L,it),w=ht.get(S,v.length),w.init(L),w.state.textureUnits=q.getTextureUnits(),v.push(w),qt.multiplyMatrices(L.projectionMatrix,L.matrixWorldInverse),$t.setFromProjectionMatrix(qt,Xi,L.reversedDepth),he=this.localClippingEnabled,te=Pt.init(this.clippingPlanes,he),T=ft.get(S,A.length),T.init(),A.push(T),Tt.enabled===!0&&Tt.isPresenting===!0){let Mt=R.xr.getDepthSensingMesh();Mt!==null&&Pu(Mt,L,-1/0,R.sortObjects)}Pu(S,L,0,R.sortObjects),T.finish(),k!==null&&k.updateLights(w.state.lightsArray),R.sortObjects===!0&&T.sort(yt,Ut),be=Tt.enabled===!1||Tt.isPresenting===!1||Tt.hasDepthSensing()===!1,be&&Gt.addToRenderList(T,S),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),te===!0&&Pt.beginShadows();let H=w.state.shadowsArray;if(Dt.render(H,S,L),te===!0&&Pt.endShadows(),(z&&b.hasRenderPass())===!1){let Mt=T.opaque,mt=T.transmissive;if(w.setupLights(),L.isArrayCamera){let St=L.cameras;if(mt.length>0)for(let Et=0,Vt=St.length;Et<Vt;Et++){let Zt=St[Et];yp(Mt,mt,S,Zt)}be&&Gt.render(S);for(let Et=0,Vt=St.length;Et<Vt;Et++){let Zt=St[Et];xp(T,S,Zt,Zt.viewport)}}else mt.length>0&&yp(Mt,mt,S,L),be&&Gt.render(S),xp(T,S,L)}it!==null&&Z===0&&(q.updateMultisampleRenderTarget(it),q.updateRenderTargetMipmap(it)),z&&b.end(R),S.isScene===!0&&S.onAfterRender(R,S,L),xt.resetDefaultState(),$=-1,J=null,v.pop(),v.length>0?(w=v[v.length-1],q.setTextureUnits(w.state.textureUnits),te===!0&&Pt.setGlobalState(R.clippingPlanes,w.state.camera)):w=null,A.pop(),A.length>0?T=A[A.length-1]:T=null,k!==null&&k.renderEnd()};function Pu(S,L,W,z){if(S.visible===!1)return;if(S.layers.test(L.layers)){if(S.isGroup)W=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(L);else if(S.isLightProbeGrid)w.pushLightProbeGrid(S);else if(S.isLight)w.pushLight(S),S.castShadow&&w.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||S.intersectsFrustum($t)){z&&Ze.setFromMatrixPosition(S.matrixWorld).applyMatrix4(qt);let Mt=tt.update(S),mt=S.material;mt.visible&&T.push(S,Mt,mt,W,Ze.z,null,L)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||S.intersectsFrustum($t))){let Mt=tt.update(S),mt=S.material;if(z&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),Ze.copy(S.boundingSphere.center)):(Mt.boundingSphere===null&&Mt.computeBoundingSphere(),Ze.copy(Mt.boundingSphere.center)),Ze.applyMatrix4(S.matrixWorld).applyMatrix4(qt)),Array.isArray(mt)){let St=Mt.groups;for(let Et=0,Vt=St.length;Et<Vt;Et++){let Zt=St[Et],wt=mt[Zt.materialIndex];wt&&wt.visible&&T.push(S,Mt,wt,W,Ze.z,Zt,L)}}else mt.visible&&T.push(S,Mt,mt,W,Ze.z,null,L)}}let gt=S.children;for(let Mt=0,mt=gt.length;Mt<mt;Mt++)Pu(gt[Mt],L,W,z)}function xp(S,L,W,z){let{opaque:H,transmissive:gt,transparent:Mt}=S;w.setupLightsView(W),te===!0&&Pt.setGlobalState(R.clippingPlanes,W),z&&y.viewport(et.copy(z)),H.length>0&&$a(H,L,W),gt.length>0&&$a(gt,L,W),Mt.length>0&&$a(Mt,L,W),y.buffers.depth.setTest(!0),y.buffers.depth.setMask(!0),y.buffers.color.setMask(!0),y.setPolygonOffset(!1)}function yp(S,L,W,z){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;if(w.state.transmissionRenderTarget[z.id]===void 0){let wt=re.has("EXT_color_buffer_half_float")||re.has("EXT_color_buffer_float");w.state.transmissionRenderTarget[z.id]=new Ce(1,1,{generateMipmaps:!0,type:wt?We:vi,minFilter:dn,samples:Math.max(4,C.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Yt.workingColorSpace})}let gt=w.state.transmissionRenderTarget[z.id],Mt=z.viewport||et;gt.setSize(Mt.z*R.transmissionResolutionScale,Mt.w*R.transmissionResolutionScale);let mt=R.getRenderTarget(),St=R.getActiveCubeFace(),Et=R.getActiveMipmapLevel();R.setRenderTarget(gt),R.getClearColor(zt),kt=R.getClearAlpha(),kt<1&&R.setClearColor(16777215,.5),R.clear(),be&&Gt.render(W);let Vt=R.toneMapping;R.toneMapping=Ci;let Zt=z.viewport;if(z.viewport!==void 0&&(z.viewport=void 0),w.setupLightsView(z),te===!0&&Pt.setGlobalState(R.clippingPlanes,z),$a(S,W,z),q.updateMultisampleRenderTarget(gt),q.updateRenderTargetMipmap(gt),re.has("WEBGL_multisampled_render_to_texture")===!1){let wt=!1;for(let ie=0,Ne=L.length;ie<Ne;ie++){let pe=L[ie],{object:ce,geometry:si,material:vt,group:ci}=pe;if(vt.side===yi&&ce.layers.test(z.layers)){let Qt=vt.side;vt.side=di,vt.needsUpdate=!0,vp(ce,W,z,si,vt,ci),vt.side=Qt,vt.needsUpdate=!0,wt=!0}}wt===!0&&(q.updateMultisampleRenderTarget(gt),q.updateRenderTargetMipmap(gt))}R.setRenderTarget(mt,St,Et),R.setClearColor(zt,kt),Zt!==void 0&&(z.viewport=Zt),R.toneMapping=Vt}function $a(S,L,W){let z=L.isScene===!0?L.overrideMaterial:null;for(let H=0,gt=S.length;H<gt;H++){let Mt=S[H],{object:mt,geometry:St,group:Et}=Mt,Vt=Mt.material;Vt.allowOverride===!0&&z!==null&&(Vt=z),mt.layers.test(W.layers)&&vp(mt,L,W,St,Vt,Et)}}function vp(S,L,W,z,H,gt){k!==null&&H.isNodeMaterial&&k.setObject(S,H),S.onBeforeRender(R,L,W,z,H,gt),S.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),H.onBeforeRender(R,L,W,z,S,gt),H.transparent===!0&&H.side===yi&&H.forceSinglePass===!1?(H.side=di,H.needsUpdate=!0,R.renderBufferDirect(W,L,z,H,S,gt),H.side=is,H.needsUpdate=!0,R.renderBufferDirect(W,L,z,H,S,gt),H.side=yi):R.renderBufferDirect(W,L,z,H,S,gt),S.onAfterRender(R,L,W,z,H,gt)}function Za(S,L,W){L.isScene!==!0&&(L=pi);let z=G.get(S),H=w.state.lights,gt=w.state.shadowsArray,Mt=H.state.version,mt=ct.getParameters(S,H.state,gt,L,W,w.state.lightProbeGridArray),St=ct.getProgramCacheKey(mt),Et=z.programs;z.environment=S.isMeshStandardMaterial||S.isMeshLambertMaterial||S.isMeshPhongMaterial?L.environment:null,z.fog=L.fog;let Vt=S.isMeshStandardMaterial||S.isMeshLambertMaterial&&!S.envMap||S.isMeshPhongMaterial&&!S.envMap;z.envMap=ot.get(S.envMap||z.environment,Vt),z.envMapRotation=z.environment!==null&&S.envMap===null?L.environmentRotation:S.envMapRotation,Et===void 0&&(S.addEventListener("dispose",Ji),Et=new Map,z.programs=Et);let Zt=Et.get(St);if(Zt!==void 0){if(z.currentProgram===Zt&&z.lightsStateVersion===Mt)return Mp(S,mt),Zt}else mt.uniforms=ct.getUniforms(S),k!==null&&S.isNodeMaterial&&k.build(S,W,mt),S.onBeforeCompile(mt,R),Zt=ct.acquireProgram(mt,St),Et.set(St,Zt),z.uniforms=mt.uniforms;let wt=z.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(wt.clippingPlanes=Pt.uniform),Mp(S,mt),z.needsLights=Hy(S),z.lightsStateVersion=Mt,z.needsLights&&(wt.ambientLightColor.value=H.state.ambient,wt.lightProbe.value=H.state.probe,wt.sunLights.value=H.state.sun,wt.sunLightShadows.value=H.state.sunShadow,wt.directionalLights.value=H.state.directional,wt.directionalLightShadows.value=H.state.directionalShadow,wt.spotLights.value=H.state.spot,wt.spotLightShadows.value=H.state.spotShadow,wt.rectAreaLights.value=H.state.rectArea,wt.ltc_1.value=H.state.rectAreaLTC1,wt.ltc_2.value=H.state.rectAreaLTC2,wt.pointLights.value=H.state.point,wt.pointLightShadows.value=H.state.pointShadow,wt.hemisphereLights.value=H.state.hemi,wt.sunShadowMatrix.value=H.state.sunShadowMatrix,wt.sunShadowCascade.value=H.state.sunShadowCascade,wt.directionalShadowMatrix.value=H.state.directionalShadowMatrix,wt.spotLightMatrix.value=H.state.spotLightMatrix,wt.spotLightMap.value=H.state.spotLightMap,wt.pointShadowMatrix.value=H.state.pointShadowMatrix),z.lightProbeGrid=w.state.lightProbeGridArray.length>0,z.currentProgram=Zt,z.uniformsList=null,Zt}function _p(S){if(S.uniformsList===null){let L=S.currentProgram.getUniforms();S.uniformsList=$r.seqWithValue(L.seq,S.uniforms)}return S.uniformsList}function Mp(S,L){let W=G.get(S);W.outputColorSpace=L.outputColorSpace,W.batching=L.batching,W.batchingColor=L.batchingColor,W.instancing=L.instancing,W.instancingColor=L.instancingColor,W.instancingMorph=L.instancingMorph,W.skinning=L.skinning,W.morphTargets=L.morphTargets,W.morphNormals=L.morphNormals,W.morphColors=L.morphColors,W.morphTargetsCount=L.morphTargetsCount,W.numClippingPlanes=L.numClippingPlanes,W.numIntersection=L.numClipIntersection,W.vertexAlphas=L.vertexAlphas,W.vertexTangents=L.vertexTangents,W.toneMapping=L.toneMapping}function Uy(S,L){if(S.length===0)return null;if(S.length===1)return S[0].texture!==null?S[0]:null;_.setFromMatrixPosition(L.matrixWorld);for(let W=0,z=S.length;W<z;W++){let H=S[W];if(H.texture!==null&&H.boundingBox.containsPoint(_))return H}return null}function By(S,L,W,z,H){L.isScene!==!0&&(L=pi),q.resetTextureUnits();let gt=L.fog,Mt=z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial?L.environment:null,mt=it===null?R.outputColorSpace:it.isXRRenderTarget===!0?it.texture.colorSpace:Yt.workingColorSpace,St=z.isMeshStandardMaterial||z.isMeshLambertMaterial&&!z.envMap||z.isMeshPhongMaterial&&!z.envMap,Et=ot.get(z.envMap||Mt,St),Vt=z.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Zt=!!W.attributes.tangent&&(!!z.normalMap||z.anisotropy>0),wt=!!W.morphAttributes.position,ie=!!W.morphAttributes.normal,Ne=!!W.morphAttributes.color,pe=Ci;z.toneMapped&&(it===null||it.isXRRenderTarget===!0)&&(pe=R.toneMapping);let ce=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,si=ce!==void 0?ce.length:0,vt=G.get(z),ci=w.state.lights;if(te===!0&&(he===!0||S!==J)){let de=S===J&&z.id===$;Pt.setState(z,S,de)}let Qt=!1;z.version===vt.__version?(vt.needsLights&&vt.lightsStateVersion!==ci.state.version||vt.outputColorSpace!==mt||H.isBatchedMesh&&vt.batching===!1||!H.isBatchedMesh&&vt.batching===!0||H.isBatchedMesh&&vt.batchingColor===!0&&H._colorsTexture===null||H.isBatchedMesh&&vt.batchingColor===!1&&H._colorsTexture!==null||H.isInstancedMesh&&vt.instancing===!1||!H.isInstancedMesh&&vt.instancing===!0||H.isSkinnedMesh&&vt.skinning===!1||!H.isSkinnedMesh&&vt.skinning===!0||H.isInstancedMesh&&vt.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&vt.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&vt.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&vt.instancingMorph===!1&&H.morphTexture!==null||vt.envMap!==Et||z.fog===!0&&vt.fog!==gt||vt.numClippingPlanes!==void 0&&(vt.numClippingPlanes!==Pt.numPlanes||vt.numIntersection!==Pt.numIntersection)||vt.vertexAlphas!==Vt||vt.vertexTangents!==Zt||vt.morphTargets!==wt||vt.morphNormals!==ie||vt.morphColors!==Ne||vt.toneMapping!==pe||vt.morphTargetsCount!==si||!!vt.lightProbeGrid!=w.state.lightProbeGridArray.length>0)&&(Qt=!0):(Qt=!0,vt.__version=z.version);let Ri=vt.currentProgram;Qt===!0&&(Ri=Za(z,L,H),k&&z.isNodeMaterial&&k.onUpdateProgram(z,Ri,vt));let Qi=!1,Nn=!1,Xs=!1,ae=Ri.getUniforms(),Pe=vt.uniforms;if(y.useProgram(Ri.program)&&(Qi=!0,Nn=!0,Xs=!0),z.id!==$&&($=z.id,Nn=!0),vt.needsLights){let de=Uy(w.state.lightProbeGridArray,H);vt.lightProbeGrid!==de&&(vt.lightProbeGrid=de,Nn=!0)}if(Qi||J!==S){y.buffers.depth.getReversed()&&S.reversedDepth!==!0&&(S._reversedDepth=!0,S.updateProjectionMatrix()),ae.setValue(O,"projectionMatrix",S.projectionMatrix),ae.setValue(O,"viewMatrix",S.matrixWorldInverse);let Fn=ae.map.cameraPosition;Fn!==void 0&&Fn.setValue(O,ve.setFromMatrixPosition(S.matrixWorld)),C.logarithmicDepthBuffer&&ae.setValue(O,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(z.isMeshPhongMaterial||z.isMeshToonMaterial||z.isMeshLambertMaterial||z.isMeshBasicMaterial||z.isMeshStandardMaterial||z.isShaderMaterial)&&ae.setValue(O,"isOrthographic",S.isOrthographicCamera===!0),J!==S&&(J=S,Nn=!0,Xs=!0)}if(vt.needsLights&&(ci.state.sunShadowMap.length>0&&ae.setValue(O,"sunShadowMap",ci.state.sunShadowMap,q),ci.state.directionalShadowMap.length>0&&ae.setValue(O,"directionalShadowMap",ci.state.directionalShadowMap,q),ci.state.spotShadowMap.length>0&&ae.setValue(O,"spotShadowMap",ci.state.spotShadowMap,q),ci.state.pointShadowMap.length>0&&ae.setValue(O,"pointShadowMap",ci.state.pointShadowMap,q)),H.isSkinnedMesh){ae.setOptional(O,H,"bindMatrix"),ae.setOptional(O,H,"bindMatrixInverse");let de=H.skeleton;de&&(de.boneTexture===null&&de.computeBoneTexture(),ae.setValue(O,"boneTexture",de.boneTexture,q))}H.isBatchedMesh&&(ae.setOptional(O,H,"batchingTexture"),ae.setValue(O,"batchingTexture",H._matricesTexture,q),ae.setOptional(O,H,"batchingIdTexture"),ae.setValue(O,"batchingIdTexture",H._indirectTexture,q),ae.setOptional(O,H,"batchingColorTexture"),H._colorsTexture!==null&&ae.setValue(O,"batchingColorTexture",H._colorsTexture,q));let On=W.morphAttributes;if((On.position!==void 0||On.normal!==void 0||On.color!==void 0)&&N.update(H,W,Ri),(Nn||vt.receiveShadow!==H.receiveShadow)&&(vt.receiveShadow=H.receiveShadow,ae.setValue(O,"receiveShadow",H.receiveShadow)),(z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial)&&z.envMap===null&&L.environment!==null&&(Pe.envMapIntensity.value=L.environmentIntensity),Pe.dfgLUT!==void 0&&(Pe.dfgLUT.value=aw()),Nn){if(ae.setValue(O,"toneMappingExposure",R.toneMappingExposure),vt.needsLights&&zy(Pe,Xs),gt&&z.fog===!0&&Rt.refreshFogUniforms(Pe,gt),Rt.refreshMaterialUniforms(Pe,z,Q,X,w.state.transmissionRenderTarget[S.id]),vt.needsLights&&vt.lightProbeGrid){let de=vt.lightProbeGrid;Pe.probesSH.value=de.texture,Pe.probesMin.value.copy(de.boundingBox.min),Pe.probesMax.value.copy(de.boundingBox.max),Pe.probesResolution.value.copy(de.resolution)}$r.upload(O,_p(vt),Pe,q)}if(z.isShaderMaterial&&z.uniformsNeedUpdate===!0&&($r.upload(O,_p(vt),Pe,q),z.uniformsNeedUpdate=!1),z.isSpriteMaterial&&ae.setValue(O,"center",H.center),ae.setValue(O,"modelViewMatrix",H.modelViewMatrix),ae.setValue(O,"normalMatrix",H.normalMatrix),ae.setValue(O,"modelMatrix",H.matrixWorld),z.uniformsGroups!==void 0){let de=z.uniformsGroups;for(let Fn=0,$s=de.length;Fn<$s;Fn++){let Sp=de[Fn];nt.update(Sp,Ri),nt.bind(Sp,Ri)}}return Ri}function zy(S,L){S.ambientLightColor.needsUpdate=L,S.lightProbe.needsUpdate=L,S.sunLights.needsUpdate=L,S.sunLightShadows.needsUpdate=L,S.directionalLights.needsUpdate=L,S.directionalLightShadows.needsUpdate=L,S.pointLights.needsUpdate=L,S.pointLightShadows.needsUpdate=L,S.spotLights.needsUpdate=L,S.spotLightShadows.needsUpdate=L,S.rectAreaLights.needsUpdate=L,S.hemisphereLights.needsUpdate=L}function Hy(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return V},this.getActiveMipmapLevel=function(){return Z},this.getRenderTarget=function(){return it},this.setRenderTargetTextures=function(S,L,W){let z=G.get(S);z.__autoAllocateDepthBuffer=S.resolveDepthBuffer===!1,z.__autoAllocateDepthBuffer===!1&&(z.__useRenderToTexture=!1),G.get(S.texture).__webglTexture=L,G.get(S.depthTexture).__webglTexture=z.__autoAllocateDepthBuffer?void 0:W,z.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(S,L){let W=G.get(S);W.__webglFramebuffer=L,W.__useDefaultFramebuffer=L===void 0},this.setRenderTarget=function(S,L=0,W=0){it=S,V=L,Z=W;let z=null,H=!1,gt=!1;if(S){let mt=G.get(S);if(mt.__useDefaultFramebuffer!==void 0){y.bindFramebuffer(O.FRAMEBUFFER,mt.__webglFramebuffer),et.copy(S.viewport),at.copy(S.scissor),rt=S.scissorTest,y.viewport(et),y.scissor(at),y.setScissorTest(rt),$=-1;return}else if(mt.__webglFramebuffer===void 0)q.setupRenderTarget(S);else if(mt.__hasExternalTextures)q.rebindTextures(S,G.get(S.texture).__webglTexture,G.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){let Vt=S.depthTexture;if(mt.__boundDepthTexture!==Vt){if(Vt!==null&&G.has(Vt)&&(S.width!==Vt.image.width||S.height!==Vt.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");q.setupDepthRenderbuffer(S)}}let St=S.texture;(St.isData3DTexture||St.isDataArrayTexture||St.isCompressedArrayTexture)&&(gt=!0);let Et=G.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(Et[L])?z=Et[L][W]:z=Et[L],H=!0):S.samples>0&&q.useMultisampledRTT(S)===!1?z=G.get(S).__webglMultisampledFramebuffer:Array.isArray(Et)?z=Et[W]:z=Et,et.copy(S.viewport),at.copy(S.scissor),rt=S.scissorTest}else et.copy(_t).multiplyScalar(Q).floor(),at.copy(Xt).multiplyScalar(Q).floor(),rt=He;if(W!==0&&(z=B),y.bindFramebuffer(O.FRAMEBUFFER,z)&&y.drawBuffers(S,z),y.viewport(et),y.scissor(at),y.setScissorTest(rt),H){let mt=G.get(S.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+L,mt.__webglTexture,W)}else if(gt){let mt=L;for(let St=0;St<S.textures.length;St++){let Et=G.get(S.textures[St]);O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0+St,Et.__webglTexture,W,mt)}}else if(S!==null&&W!==0){let mt=G.get(S.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,mt.__webglTexture,W)}$=-1};function bp(S){let L=G.get(S);return(L.__readFormat!==S.format||L.__readType!==S.type)&&(L.__readFormat=S.format,L.__readType=S.type,L.__formatReadable=C.textureFormatReadable(S.format),L.__typeReadable=C.textureTypeReadable(S.type)),L}this.readRenderTargetPixels=function(S,L,W,z,H,gt,Mt,mt=0){if(!(S&&S.isWebGLRenderTarget)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let St=G.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&Mt!==void 0&&(St=St[Mt]),St){y.bindFramebuffer(O.FRAMEBUFFER,St);try{let Et=S.textures[mt],Vt=Et.format,Zt=Et.type;S.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+mt);let wt=bp(Et);if(wt.__formatReadable===!1){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(wt.__typeReadable===!1){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}L>=0&&L<=S.width-z&&W>=0&&W<=S.height-H&&O.readPixels(L,W,z,H,dt.convert(Vt),dt.convert(Zt),gt)}finally{let Et=it!==null?G.get(it).__webglFramebuffer:null;y.bindFramebuffer(O.FRAMEBUFFER,Et)}}},this.readRenderTargetPixelsAsync=async function(S,L,W,z,H,gt,Mt,mt=0){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let St=G.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&Mt!==void 0&&(St=St[Mt]),St)if(L>=0&&L<=S.width-z&&W>=0&&W<=S.height-H){y.bindFramebuffer(O.FRAMEBUFFER,St);let Et=S.textures[mt],Vt=Et.format,Zt=Et.type;S.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+mt);let wt=bp(Et);if(wt.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(wt.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let ie=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,ie),O.bufferData(O.PIXEL_PACK_BUFFER,gt.byteLength,O.STREAM_READ),O.readPixels(L,W,z,H,dt.convert(Vt),dt.convert(Zt),0),O.bindBuffer(O.PIXEL_PACK_BUFFER,null);let Ne=it!==null?G.get(it).__webglFramebuffer:null;y.bindFramebuffer(O.FRAMEBUFFER,Ne);let pe=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await Qg(O,pe,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,ie),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,gt),O.bindBuffer(O.PIXEL_PACK_BUFFER,null),O.deleteBuffer(ie),O.deleteSync(pe),gt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(S,L=null,W=0){let z=Math.pow(2,-W),H=Math.floor(S.image.width*z),gt=Math.floor(S.image.height*z),Mt=L!==null?L.x:0,mt=L!==null?L.y:0;q.setTexture2D(S,0),O.copyTexSubImage2D(O.TEXTURE_2D,W,0,0,Mt,mt,H,gt),y.unbindTexture()},this.copyTextureToTexture=function(S,L,W=null,z=null,H=0,gt=0){let Mt,mt,St,Et,Vt,Zt,wt,ie,Ne,pe=S.isCompressedTexture?S.mipmaps[gt]:S.image;if(W!==null)Mt=W.max.x-W.min.x,mt=W.max.y-W.min.y,St=W.isBox3?W.max.z-W.min.z:1,Et=W.min.x,Vt=W.min.y,Zt=W.isBox3?W.min.z:0;else{let Pe=Math.pow(2,-H);Mt=Math.floor(pe.width*Pe),mt=Math.floor(pe.height*Pe),S.isDataArrayTexture?St=pe.depth:S.isData3DTexture?St=Math.floor(pe.depth*Pe):St=1,Et=0,Vt=0,Zt=0}z!==null?(wt=z.x,ie=z.y,Ne=z.z):(wt=0,ie=0,Ne=0);let ce=dt.convert(L.format),si=dt.convert(L.type),vt;L.isData3DTexture?(q.setTexture3D(L,0),vt=O.TEXTURE_3D):L.isDataArrayTexture||L.isCompressedArrayTexture?(q.setTexture2DArray(L,0),vt=O.TEXTURE_2D_ARRAY):(q.setTexture2D(L,0),vt=O.TEXTURE_2D),y.activeTexture(O.TEXTURE0),y.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,L.flipY),y.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,L.premultiplyAlpha),y.pixelStorei(O.UNPACK_ALIGNMENT,L.unpackAlignment);let ci=y.getParameter(O.UNPACK_ROW_LENGTH),Qt=y.getParameter(O.UNPACK_IMAGE_HEIGHT),Ri=y.getParameter(O.UNPACK_SKIP_PIXELS),Qi=y.getParameter(O.UNPACK_SKIP_ROWS),Nn=y.getParameter(O.UNPACK_SKIP_IMAGES);y.pixelStorei(O.UNPACK_ROW_LENGTH,pe.width),y.pixelStorei(O.UNPACK_IMAGE_HEIGHT,pe.height),y.pixelStorei(O.UNPACK_SKIP_PIXELS,Et),y.pixelStorei(O.UNPACK_SKIP_ROWS,Vt),y.pixelStorei(O.UNPACK_SKIP_IMAGES,Zt);let Xs=S.isDataArrayTexture||S.isData3DTexture,ae=L.isDataArrayTexture||L.isData3DTexture;if(S.isDepthTexture){let Pe=G.get(S),On=G.get(L),de=G.get(Pe.__renderTarget),Fn=G.get(On.__renderTarget);y.bindFramebuffer(O.READ_FRAMEBUFFER,de.__webglFramebuffer),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,Fn.__webglFramebuffer);for(let $s=0;$s<St;$s++)Xs&&(O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,G.get(S).__webglTexture,H,Zt+$s),O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,G.get(L).__webglTexture,gt,Ne+$s)),O.blitFramebuffer(Et,Vt,Mt,mt,wt,ie,Mt,mt,O.DEPTH_BUFFER_BIT,O.NEAREST);y.bindFramebuffer(O.READ_FRAMEBUFFER,null),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else if(H!==0||S.isRenderTargetTexture||G.has(S)){let Pe=G.get(S),On=G.get(L);y.bindFramebuffer(O.READ_FRAMEBUFFER,I),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,U);for(let de=0;de<St;de++)Xs?O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Pe.__webglTexture,H,Zt+de):O.framebufferTexture2D(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Pe.__webglTexture,H),ae?O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,On.__webglTexture,gt,Ne+de):O.framebufferTexture2D(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,On.__webglTexture,gt),H!==0?O.blitFramebuffer(Et,Vt,Mt,mt,wt,ie,Mt,mt,O.COLOR_BUFFER_BIT,O.NEAREST):ae?O.copyTexSubImage3D(vt,gt,wt,ie,Ne+de,Et,Vt,Mt,mt):O.copyTexSubImage2D(vt,gt,wt,ie,Et,Vt,Mt,mt);y.bindFramebuffer(O.READ_FRAMEBUFFER,null),y.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else ae?S.isDataTexture||S.isData3DTexture?O.texSubImage3D(vt,gt,wt,ie,Ne,Mt,mt,St,ce,si,pe.data):L.isCompressedArrayTexture?O.compressedTexSubImage3D(vt,gt,wt,ie,Ne,Mt,mt,St,ce,pe.data):O.texSubImage3D(vt,gt,wt,ie,Ne,Mt,mt,St,ce,si,pe):S.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,gt,wt,ie,Mt,mt,ce,si,pe.data):S.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,gt,wt,ie,pe.width,pe.height,ce,pe.data):O.texSubImage2D(O.TEXTURE_2D,gt,wt,ie,Mt,mt,ce,si,pe);y.pixelStorei(O.UNPACK_ROW_LENGTH,ci),y.pixelStorei(O.UNPACK_IMAGE_HEIGHT,Qt),y.pixelStorei(O.UNPACK_SKIP_PIXELS,Ri),y.pixelStorei(O.UNPACK_SKIP_ROWS,Qi),y.pixelStorei(O.UNPACK_SKIP_IMAGES,Nn),gt===0&&L.generateMipmaps&&O.generateMipmap(vt),y.unbindTexture()},this.initRenderTarget=function(S){G.get(S).__webglFramebuffer===void 0&&q.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?q.setTextureCube(S,0):S.isData3DTexture?q.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?q.setTexture2DArray(S,0):q.setTexture2D(S,0),y.unbindTexture()},this.resetState=function(){V=0,Z=0,it=null,y.reset(),xt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Xi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=Yt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Yt._getUnpackColorSpace()}};var KC=Object.freeze(["high","low","flat"]),JC=Object.freeze(["lights","shadows","post","particles","marks","zoneOutlines","chalk","camera","capture","footlights"]);function L0(n){return n==="low"?{post:!1,shadows:!1,msaa:0,pixelRatioCap:1,dust:120,sparks:24,footlights:!1}:{post:!0,shadows:!0,msaa:4,pixelRatioCap:2,dust:420,sparks:48,footlights:!0}}function mh(n,t,e,i,s=null){let r=[],o=!1;for(let a of n){let l=t[a.id]??"rest";l==="target"&&(o=!0),r.push(`${a.id}:${l}:${Gu(a,l,e).toFixed(2)}`)}return s&&r.push(`B${Object.entries(s.counts??{}).map(([a,l])=>`${a}=${l}/${s.downs?.[a]??0}`).join(",")}`),r.join("|")+(o?`|t${Math.floor(i*20)}`:"")}var D0=Object.freeze([[240,186,92],[112,196,222],[226,118,104],[146,208,126],[196,150,232],[242,150,72],[230,220,140]]);function N0(n){let t=n.reduce((s,r)=>s+r[0],0)/n.length,e=Math.min(...n.map(s=>s[1])),i=Math.max(...n.map(s=>s[1]));return[t,e+(i-e)*.32]}function O0(n){return N0(n.floor??n.shape)}function lw(n,t,e,i,s,r,o,{labels:a=!0}={}){let l=i.filter(h=>h.kind==="area"),c=new Map;l.forEach((h,u)=>{let d=(h.floor??h.shape).map(([M,E])=>[M*t,E*e]),[f,x,g]=h.colour??D0[u%D0.length],p=r?.[h.id]==="target",m=()=>{n.beginPath(),d.forEach(([M,E],_)=>_?n.lineTo(M,E):n.moveTo(M,E)),n.closePath()};n.save(),m(),n.fillStyle=`rgba(${f},${x},${g},${p?.3:.17})`,n.fill(),n.lineJoin="round",n.setLineDash([18,9]),n.lineDashOffset=p?-o*60:0,m(),n.strokeStyle="rgba(16,10,5,0.6)",n.lineWidth=7,n.stroke(),m(),n.strokeStyle=`rgba(${f},${x},${g},0.95)`,n.lineWidth=p?4.5:3.2,n.stroke(),n.restore(),c.set(h.id,N0(d))}),n.save(),n.setLineDash([10,10]),n.lineCap="round";for(let{a:h,b:u}of s.bands??[]){let d=c.get(h),f=c.get(u);!d||!f||(n.beginPath(),n.moveTo(d[0],d[1]+30),n.lineTo(f[0],f[1]+30),n.strokeStyle="rgba(16,10,5,0.45)",n.lineWidth=6,n.stroke(),n.strokeStyle="rgba(255,236,200,0.7)",n.lineWidth=2.6,n.stroke())}n.restore(),a&&l.forEach(h=>{let[u,d]=c.get(h.id);n.save(),n.textAlign="center",n.font='600 30px "Shippori Mincho", "Hiragino Mincho ProN", serif',n.lineWidth=7,n.strokeStyle="rgba(16,10,5,0.78)",n.strokeText(h.name||h.id,u,d),n.fillStyle="rgba(255,240,212,1)",n.fillText(h.name||h.id,u,d);let f=s.counts?.[h.id]??0,x=s.downs?.[h.id]??0,g=[...(h.tags??[]).map(p=>p.toUpperCase()),f?`${f} HERE`:null,x?`${x} DOWN`:null].filter(Boolean);if(g.length){n.font="700 15px system-ui, sans-serif";let p=g.map(M=>n.measureText(M).width+18),m=u-(p.reduce((M,E)=>M+E,0)+6*(g.length-1))/2;g.forEach((M,E)=>{let _=M.endsWith(" HERE");U0(n,m+p[E]/2,d+24,M,15,_?"rgba(20,12,6,0.95)":"rgba(255,236,200,0.95)",_?"rgba(255,190,110,0.95)":"rgba(16,10,5,0.72)"),m+=p[E]+6})}n.restore()})}function F0(n,t=0,e=0){let i=n.name||n.id,s=[...(n.tags??[]).map(x=>x.toUpperCase()),t?`${t} HERE`:null,e?`${e} DOWN`:null].filter(Boolean),r=Yr(8,8).getContext("2d");r.font='600 34px "Shippori Mincho", "Hiragino Mincho ProN", serif';let o=r.measureText(i).width;r.font="700 17px system-ui, sans-serif";let a=s.map(x=>r.measureText(x).width+20),l=a.reduce((x,g)=>x+g,0)+7*Math.max(0,s.length-1),c=Math.ceil(Math.max(o+24,l+12)),h=s.length?84:50,u=Yr(c*2,h*2),d=u.getContext("2d");d.scale(2,2),d.textAlign="center",d.font='600 34px "Shippori Mincho", "Hiragino Mincho ProN", serif',d.lineJoin="round",d.lineWidth=7,d.strokeStyle="rgba(16,10,5,0.82)",d.strokeText(i,c/2,36),d.fillStyle="rgba(255,240,212,1)",d.fillText(i,c/2,36);let f=c/2-l/2;return s.forEach((x,g)=>{let p=x.endsWith(" HERE"),m=x.endsWith(" DOWN");U0(d,f+a[g]/2,64,x,17,p||m?"rgba(20,12,6,0.95)":"rgba(255,236,200,0.95)",p?"rgba(255,190,110,0.95)":m?"rgba(170,160,150,0.9)":"rgba(16,10,5,0.75)"),f+=a[g]+7}),{canvas:u,w:c,h}}function U0(n,t,e,i,s,r,o){n.save(),n.font=`700 ${s}px system-ui, sans-serif`,n.textAlign="center",n.textBaseline="middle";let a=n.measureText(i).width+16,l=s+10;n.setLineDash([]),n.beginPath(),n.roundRect(t-a/2,e-l/2,a,l,l/2),n.fillStyle=o,n.fill(),n.fillStyle=r,n.fillText(i,t,e+1),n.restore()}function gh(n,t,e,i,s,r,o,a=null,{boardLabels:l=!0}={}){n.clearRect(0,0,t,e),a&&lw(n,t,e,i,a,s,o,{labels:l});for(let c of i){if(a&&c.kind==="area")continue;let h=s[c.id]??"rest",u=Gu(c,h,r);if(u<=.01)continue;let d=c.shape.map(([g,p])=>[g*t,p*e]),f=()=>{n.beginPath(),d.forEach(([g,p],m)=>m?n.lineTo(g,p):n.moveTo(g,p)),n.closePath()},x=h==="target";if(n.lineJoin="round",n.setLineDash([14,11]),n.lineDashOffset=x?-o*60:0,f(),n.strokeStyle=`rgba(20,12,6,${.55*u})`,n.lineWidth=6,n.stroke(),f(),n.strokeStyle=x?`rgba(255,150,70,${u})`:`rgba(255,222,170,${.9*u})`,n.lineWidth=x?4:2.4,n.stroke(),n.setLineDash([]),u>=.8&&c.name){let g=d.reduce((m,M)=>m+M[0],0)/d.length,p=Math.min(...d.map(m=>m[1]))-10;n.font='600 30px "Shippori Mincho", "Hiragino Mincho ProN", serif',n.textAlign="center",n.lineWidth=7,n.strokeStyle=`rgba(20,12,6,${.7*u})`,n.strokeText(c.name,g,p),n.fillStyle=`rgba(255,236,200,${u})`,n.fillText(c.name,g,p),c.hint&&(n.font="600 20px sans-serif",n.lineWidth=5,n.strokeStyle=`rgba(20,12,6,${.7*u})`,n.strokeText(c.hint.toUpperCase(),g,p+26),n.fillStyle=`rgba(255,222,170,${.85*u})`,n.fillText(c.hint.toUpperCase(),g,p+26))}}}var Yr=(n,t)=>{let e=document.createElement("canvas");return e.width=n,e.height=t,e};function B0(){let n=Yr(64,64),t=n.getContext("2d"),e=t.createRadialGradient(32,32,0,32,32,32);return e.addColorStop(0,"rgba(255,255,255,1)"),e.addColorStop(.35,"rgba(255,255,255,0.5)"),e.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=e,t.fillRect(0,0,64,64),n}function xh(){let n=Yr(256,256),t=n.getContext("2d");t.translate(128,128),t.lineCap="round";let e=9;for(let[i,s]of[[20,"#1b140c"],[10,"#e6c98d"]]){t.strokeStyle=s,t.lineWidth=i;for(let r=0;r<e;r++){let o=r/e*Math.PI*2+.3,a=120*(.72+.28*(r*7%3/2));t.beginPath(),t.moveTo(Math.cos(o)*46,Math.sin(o)*46),t.lineTo(Math.cos(o)*a,Math.sin(o)*a),t.stroke()}}t.fillStyle="#fff7d6",t.strokeStyle="#1b140c",t.lineWidth=6,t.beginPath();for(let i=0;i<16;i++){let s=i/16*Math.PI*2,r=i%2?18:40;t[i?"lineTo":"moveTo"](Math.cos(s)*r,Math.sin(s)*r)}return t.closePath(),t.fill(),t.stroke(),n}function yh(){let n=Yr(256,160),t=n.getContext("2d");t.lineCap="round";let e=(i,s)=>{t.strokeStyle=s,t.lineWidth=i;for(let[r,o]of[[-1,-1],[1,-1],[-1,1],[1,1]]){let a=128+r*100,l=80+o*56;t.beginPath(),t.moveTo(a-r*34,l),t.lineTo(a,l),t.lineTo(a,l-o*30),t.stroke()}};return e(13,"rgba(20,12,6,0.7)"),e(7,"#e6c98d"),t.setLineDash([2,12]),t.strokeStyle="rgba(255,226,170,0.75)",t.lineWidth=5,t.beginPath(),t.ellipse(128,80,66,36,0,0,Math.PI*2),t.stroke(),n}function vh(n){let t=Yr(512,96),e=t.getContext("2d");return e.font='700 40px "Helvetica Neue", Arial, sans-serif',e.textAlign="center",e.textBaseline="middle",e.lineWidth=9,e.strokeStyle="rgba(20,12,6,0.8)",e.strokeText(n.toUpperCase(),256,48),e.fillStyle="#ffe9c4",e.fillText(n.toUpperCase(),256,48),t}var Us=class{constructor(){this.byUrl=new Map}loadImage=t=>t?(this.byUrl.has(t)||this.byUrl.set(t,new Promise(e=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>e(i),i.onerror=()=>e(null),i.src=t})),this.byUrl.get(t)):Promise.resolve(null)};var ls=Math.PI/180,_h=class{constructor(){this.items=new Set}add(t){return t&&this.items.add(t),t}mesh(t){this.add(t.geometry);for(let e of[].concat(t.material)){this.add(e);for(let i of Object.values(e))i?.isTexture&&this.add(i)}return t}disposeAll(){for(let t of this.items)t.dispose?.();this.items.clear()}get size(){return this.items.size}};function fi(n,{anisotropy:t=8,srgb:e=!0}={}){let i=new ia(n);return e&&(i.colorSpace=Ae),i.anisotropy=t,i}var z0=()=>fi(B0(),{anisotropy:1}),H0=()=>fi(xh());function Mh(n,t,e){let{f:i,cx:s,cy:r,floorY:o}=t.cam,a=20,l=3e4;n.position.set(0,o-r,i),n.projectionMatrix.makePerspective(-a*(s-e.ox)/i,a*(e.ox+e.visW-s)/i,a*(r-e.oy)/i,-a*(e.oy+e.visH-r)/i,a,l),n.projectionMatrixInverse.copy(n.projectionMatrix).invert(),n.updateProjectionMatrix=()=>{},n.updateMatrixWorld(!0)}function Ta(n,t,e,i){let{f:s,cx:r,cy:o,floorY:a}=n.cam;return new D((t-r)*(s-i)/s,a-o-(e-o)*(s-i)/s,i)}var bh=n=>n.cam.f/(Bi.H/2);function Ea(n,t,e=0,i=null,s=null){let[r,o]=n.size,a=r*n.map.s,l=o*n.map.s,{x0:c,y0:h,x1:u,y1:d}=i??{x0:0,y0:0,x1:1,y1:1},f=-Pi+e,x=(n.cam.f-f)/n.cam.f,g=new Bt(s??new ke(1,1),t);return g.position.copy(Ta(n,n.map.ox+a*(c+u)/2,n.map.oy+l*(h+d)/2,f)),g.scale.set(a*(u-c)*x,l*(d-h)*x,1),g}var cw=32e5,Sh=class{constructor({scene:t,rig:e,tracker:i,softDot:s,settings:r}){this.description=t,this.rig=e,this.T=i,this.softDot=s,this.settings=r,this.group=new Ge,this.lights=[],this.lanterns=[],this.foot=[],this.dust=null}async build(t){let{rig:e,description:i,T:s}=this,r=s.add(new Ve(t));r.colorSpace=Ae,r.anisotropy=8,r.generateMipmaps=!0,r.minFilter=dn,r.needsUpdate=!0,this.paintTex=r;let[o,a]=e.size,l=o*e.map.s,c=a*e.map.s,h=s.mesh(new Bt(new ke(1,1),new Re({map:r,color:14474460})));h.position.copy(Ta(e,e.map.ox+l/2,e.map.oy+c/2,-Pi)),h.scale.set(l*(e.cam.f+Pi)/e.cam.f,c*(e.cam.f+Pi)/e.cam.f,1),this.group.add(h),this.backdrop=h,this.#i(r,l,c);for(let d of i.occluders){let f=e.standing([d.x,d.base]);if(!f)continue;let x=d.poly.map(A=>A[0]),g=d.poly.map(A=>A[1]),p=[Math.min(...x),Math.min(...g),Math.max(...x),Math.max(...g)],m=[],M=[],E=[];for(let[A,v]of d.poly){let b=Ta(e,e.map.x(A),e.map.y(v),f.Z);m.push(b.x,b.y,b.z),M.push(A,1-v),E.push((A-p[0])/(p[2]-p[0]||1),1-(v-p[1])/(p[3]-p[1]||1))}let _=new Me;_.setAttribute("position",new Jt(m,3)),_.setAttribute("uv",new Jt(M,2)),_.setAttribute("uv1",new Jt(E,2)),_.setIndex(d.poly.length===4?[0,2,1,0,3,2]:hw(d.poly.length));let T=this.#t(d.poly,p),w=s.mesh(new Bt(_,new Re({map:r,color:14474460,side:yi,...T?{alphaMap:T,transparent:!0}:{}})));w.renderOrder=3,this.group.add(w)}let u=s.mesh(new Bt(new ke(24e3,24e3),new Or({opacity:.62,depthWrite:!1})));return u.rotation.x=-Math.PI/2,u.receiveShadow=!0,u.renderOrder=2,this.group.add(u),this.floor=u,this.ambient=new ua(16765600,i.ambient),this.group.add(this.ambient),i.lights.forEach((d,f)=>this.#e(d,f)),this.#n(),this.#s(),this}#t(t,[e,i,s,r]){let{rig:o,T:a}=this,[l,c]=o.size,h=(s-e)*l*o.map.s,u=(r-i)*c*o.map.s;if(!(h>0&&u>0))return null;let d=256,f=Math.max(32,Math.min(512,Math.round(d*u/h))),x=Math.min(al,u*ll)/u*f,g=cl(t.map(([M,E])=>[(M-e)/(s-e)*d,(E-i)/(r-i)*f]),d,f,x),p=new Uint8Array(d*f*4);for(let M=0;M<f;M++)for(let E=0;E<d;E++){let _=g[M*d+E],T=((f-1-M)*d+E)*4;p[T]=p[T+1]=p[T+2]=p[T+3]=_}let m=a.add(new Lr(p,d,f,_i));return m.magFilter=Be,m.minFilter=Be,m.channel=1,m.needsUpdate=!0,m}#i(t,e,i){let{rig:s,T:r}=this,o=s.map.oy+i,a=s.ref.H-o+600;if(a<=0)return;let l=Math.min(a,i*.6),c=s.cam.f+Pi,h=new ke(1,1),u=h.attributes.uv;for(let f=0;f<u.count;f++)u.setY(f,u.getY(f)===1?0:l/i);let d=r.mesh(new Bt(h,new Re({map:t,color:9079434})));d.position.copy(Ta(s,s.map.ox+e/2,o+l/2,-Pi)),d.scale.set(e*c/s.cam.f,l*c/s.cam.f,1),this.group.add(d)}#e(t,e){let{rig:i,T:s}=this,r=i.standing([t.at[0],t.below]);if(!r)return;let{cx:o,cy:a,f:l,floorY:c}=i.cam,h=l/(l-r.Z),u=o+(i.map.x(t.at[0])-o)/h,d=a+(i.map.y(t.at[1])-a)/h,f=new D(u-o,c-d,r.Z),x=new Ct(t.colour[0]/255,t.colour[1]/255,t.colour[2]/255),g=new Br(x,0,0,1.2,.9,2);if(g.position.copy(f),g.target.position.set(f.x,0,f.z),g.userData={base:t.intensity*cw,flicker:t.flicker,hz:t.flickerHz,seed:e+1},t.shadow&&this.settings.shadows&&(g.castShadow=!0,g.shadow.mapSize.set(1024,1024),g.shadow.bias=-4e-4,g.shadow.radius=5,g.shadow.camera.near=30,g.shadow.camera.far=3e3),this.group.add(g,g.target),this.lights.push(g),this.lanterns.push({pos:f,colour:x}),t.pool){let p=s.mesh(new Bt(new sa(t.pool*.62,48),new Re({map:this.softDot,color:x,transparent:!0,opacity:.38,blending:Ai,depthWrite:!1})));p.rotation.x=-Math.PI/2,p.position.set(f.x,1,f.z),p.renderOrder=1,this.group.add(p)}}#n(){let{T:t}=this;for(let e of[-1,1]){let i=new Br(16761466,0,0,.66,.75,2);i.position.set(e*640,26,360),i.target.position.set(e*140,340,-420),i.userData={base:23e5},i.visible=!1,this.settings.shadows&&(i.castShadow=!0,i.shadow.mapSize.set(1024,1024),i.shadow.bias=-5e-4,i.shadow.radius=4,i.shadow.camera.near=40,i.shadow.camera.far=2800),this.group.add(i,i.target),this.foot.push(i)}this.wall=t.mesh(new Bt(new ke(7e3,2600),new Or({opacity:.72,depthWrite:!1}))),this.wall.position.set(0,1300,-2300),this.wall.receiveShadow=!0,this.wall.renderOrder=2,this.wall.visible=!1,this.group.add(this.wall)}setFootlights(t){t=!!t&&this.settings.footlights;for(let e of this.foot)e.visible=t,e.intensity=t?e.userData.base:0;this.wall.visible=t,this.ambient.intensity=t?this.description.ambient*.75:this.description.ambient,this.footlightsOn=t}#s(){let t=this.settings.dust;if(!t)return;let e=new Float32Array(t*3),i=7,s=()=>(i=i*16807%2147483647,i/2147483647);for(let a=0;a<t;a++)e[a*3]=(s()-.5)*2600,e[a*3+1]=40+s()*820,e[a*3+2]=-520+s()*760;let r=this.T.add(new Me);r.setAttribute("position",new Ue(e.slice(),3)),r.setAttribute("color",new Ue(new Float32Array(t*3),3));let o=this.T.add(new Kn({size:8*bh(this.rig),map:this.softDot,vertexColors:!0,transparent:!0,opacity:.9,blending:Ai,depthWrite:!1,sizeAttenuation:!0}));this.dust=new Ps(r,o),this.dust.frustumCulled=!1,this.dustBase=e,this.group.add(this.dust)}update(t){for(let r of this.lights){let o=r.userData;r.intensity=o.base*(1+o.flicker*bo(t*o.hz,o.seed))}if(!this.dust)return;let e=this.dust.geometry.attributes.position,i=this.dust.geometry.attributes.color,s=this.dustBase;for(let r=0;r<e.count;r++){let o=s[r*3]+Math.sin(t*.21+r)*22,a=s[r*3+1]+t*(4+r%7)%120,l=s[r*3+2];e.array[r*3]=o,e.array[r*3+1]=a,e.array[r*3+2]=l;let c=0,h=0,u=0;for(let d of this.lanterns){let f=(o-d.pos.x)**2+(a-d.pos.y)**2+(l-d.pos.z)**2,x=Math.max(0,1-Math.sqrt(f)/900);c+=d.colour.r*x*x,h+=d.colour.g*x*x,u+=d.colour.b*x*x}i.array[r*3]=Math.min(1,c),i.array[r*3+1]=Math.min(1,h),i.array[r*3+2]=Math.min(1,u)}e.needsUpdate=!0,i.needsUpdate=!0}};function hw(n){let t=[];for(let e=1;e<n-1;e++)t.push(0,e+1,e);return t}var Aa=new D;function Ni(n,t,e,i,s,r){let o=2*Math.PI*s/4,a=Math.max(r-2*s,0),l=Math.PI/4;Aa.copy(t),Aa[i]=0,Aa.normalize();let c=.5*o/(o+a),h=1-Aa.angleTo(n)/l;return Math.sign(Aa[e])===1?h*c:a/(o+a)+c+c*(1-h)}var wh=class n extends ai{constructor(t=1,e=1,i=1,s=2,r=.1){let o=s*2+1;if(r=Math.min(t/2,e/2,i/2,r),super(1,1,1,o,o,o),this.type="RoundedBoxGeometry",this.parameters={width:t,height:e,depth:i,segments:s,radius:r},o===1)return;let a=this.toNonIndexed();this.index=null,this.attributes.position=a.attributes.position,this.attributes.normal=a.attributes.normal,this.attributes.uv=a.attributes.uv;let l=new D,c=new D,h=new D(t,e,i).divideScalar(2).subScalar(r),u=this.attributes.position.array,d=this.attributes.normal.array,f=this.attributes.uv.array,x=u.length/6,g=new D,p=.5/o;for(let m=0,M=0;m<u.length;m+=3,M+=2)switch(l.fromArray(u,m),c.copy(l),c.x-=Math.sign(c.x)*p,c.y-=Math.sign(c.y)*p,c.z-=Math.sign(c.z)*p,c.normalize(),u[m+0]=h.x*Math.sign(l.x)+c.x*r,u[m+1]=h.y*Math.sign(l.y)+c.y*r,u[m+2]=h.z*Math.sign(l.z)+c.z*r,d[m+0]=c.x,d[m+1]=c.y,d[m+2]=c.z,Math.floor(m/x)){case 0:g.set(1,0,0),f[M+0]=Ni(g,c,"z","y",r,i),f[M+1]=1-Ni(g,c,"y","z",r,e);break;case 1:g.set(-1,0,0),f[M+0]=1-Ni(g,c,"z","y",r,i),f[M+1]=1-Ni(g,c,"y","z",r,e);break;case 2:g.set(0,1,0),f[M+0]=1-Ni(g,c,"x","z",r,t),f[M+1]=Ni(g,c,"z","x",r,i);break;case 3:g.set(0,-1,0),f[M+0]=1-Ni(g,c,"x","z",r,t),f[M+1]=1-Ni(g,c,"z","x",r,i);break;case 4:g.set(0,0,1),f[M+0]=1-Ni(g,c,"x","y",r,t),f[M+1]=1-Ni(g,c,"y","x",r,e);break;case 5:g.set(0,0,-1),f[M+0]=Ni(g,c,"x","y",r,t),f[M+1]=1-Ni(g,c,"y","x",r,e);break}}static fromJSON(t){return new n(t.width,t.height,t.depth,t.segments,t.radius)}};var G0=typeof Intl<"u"&&Intl.Segmenter?new Intl.Segmenter(void 0,{granularity:"grapheme"}):null,uw=n=>G0?[...G0.segment(n)].map(t=>t.segment):[...n];function dw(n){let t=String(n??"").replace(/\s+/g," ").trim(),e=uw(t);return e.length<=16?t:`${e.slice(0,15).join("")}\u2026`}function cs(n){if(!Array.isArray(n))return[];let t=[];for(let e of n){let i=dw(typeof e=="string"||typeof e=="number"?e:e?.label);if(i&&!t.includes(i)&&t.push(i),t.length===4)break}return t}var V0=(n,t)=>JSON.stringify(cs(n))===JSON.stringify(cs(t));var fw=360;function pw(n,t){let e=cs(t?.badges);if(!e.length||!n?.getContext)return n;let i=n.getContext("2d"),s=n.width/fw,r=21*s,o=9*s,a=6*s,l=14*s;i.save(),i.font=`700 ${r}px sans-serif`,i.textBaseline="middle";let c=l;for(let h of e){let u=Math.min(n.width*.6,i.measureText(h).width+o*2),d=r+o;i.fillStyle="rgba(24,16,8,0.88)",mw(i,l,c,u,d,d/2),i.fill(),i.strokeStyle="rgba(255,226,160,0.85)",i.lineWidth=Math.max(1,1.5*s),i.stroke(),i.fillStyle="#fff4d6",i.fillText(h,l+o,c+d/2+s,u-o*2),c+=d+a}return i.restore(),n}function mw(n,t,e,i,s,r){n.beginPath(),n.moveTo(t+r,e),n.arcTo(t+i,e,t+i,e+s,r),n.arcTo(t+i,e+s,t,e+s,r),n.arcTo(t,e+s,t,e,r),n.arcTo(t,e,t+i,e,r),n.closePath()}async function jr(n,t,e){return pw(await n.face(t,e),t)}var Ra=(n,t,e)=>Math.max(t,Math.min(e,n)),Ca=Object.freeze({floor:.4,gain:1.25,tint:.5,lift:0});function X0(n,t,e){let i=new Float32Array(t*e*3);for(let s=0;s<t*e;s++)i[s*3]=n[s*4]/255,i[s*3+1]=n[s*4+1]/255,i[s*3+2]=n[s*4+2]/255;return{w:t,h:e,cells:i}}function W0(n,t,e){let i=Ra(t,0,1)*(n.w-1),s=Ra(e,0,1)*(n.h-1),r=Math.floor(i),o=Math.floor(s),a=Math.min(n.w-1,r+1),l=Math.min(n.h-1,o+1),c=i-r,h=s-o,u=[0,0,0];for(let d=0;d<3;d++){let f=(p,m)=>n.cells[(m*n.w+p)*3+d],x=f(r,o)*(1-c)+f(a,o)*c,g=f(r,l)*(1-c)+f(a,l)*c;u[d]=x*(1-h)+g*h}return u}function Th(n,t,e,{strength:i=1}={}){if(!n||!(i>0))return[1,1,1];let s=W0(n,t,e),r=W0(n,t,e-.09),o=[0,1,2].map(d=>(s[d]+r[d])/2),a=.2126*o[0]+.7152*o[1]+.0722*o[2],l=Ra(Ca.floor+Ca.gain*a+Ca.lift,Ca.floor,1),c=Math.max(o[0],o[1],o[2],.001),h=Ca.tint*Ra(c/.12,0,1);return o.map(d=>l*(1-h*(1-d/c))).map(d=>Ra(1+i*(d-1),.3,1))}function Eh(n,t,e=.14){return n?n.map((i,s)=>i+(t[s]-i)*e):t.slice()}var Tf=1.5,Ah=class{constructor(t,e,i,s){this.id=t.id,this.person=t,this.skin=e,this.ctx=i,this.s=s,this.w=e.size.w,this.h=e.size.h,this.stickLen=(e.stick?.length??134)*s,this.root=new Ge,this.root.userData.cardId=t.id,this.emote=null,this.ghostTexture=null}async build(){let{skin:t,ctx:e,person:i}=this,s=e.tracker,r=t.materials??{},o=s.add(new ei({color:r.body?.color??15196109,metalness:r.body?.metalness??0,roughness:r.body?.roughness??.9})),a=this.#t(),[l,c]=await Promise.all([jr(t,i,a),t.back(i,a)]);this.leanG=new Ge,this.hinge=new Ge,this.yawG=new Ge,this.yawG.rotation.order="YXZ",this.root.add(this.leanG),this.leanG.add(this.hinge),this.hinge.add(this.yawG);let h=this.w,u=this.h,d=s.mesh(new Bt(new wh(h-3,u-3,t.thickness,3,6),o));d.position.y=u/2,d.castShadow=!0;let f=s.add(fi(l));this.faceTex=f,this.ghostTexture=f;let x=s.mesh(new Bt(new ke(h,u),new Fr({map:f,roughness:r.face?.roughness??.5,metalness:r.face?.metalness??.1,clearcoat:r.face?.clearcoat??.6,clearcoatRoughness:.22,transparent:!0,alphaTest:.5,envMapIntensity:.7})));x.position.set(0,u/2,t.thickness/2+.2),x.receiveShadow=!0,this.faceMaterial=x.material,this.backTex=s.add(fi(c));let g=s.mesh(new Bt(new ke(h,u),new ei({map:this.backTex,roughness:r.back?.roughness??.62,metalness:r.back?.metalness??.35,transparent:!0,alphaTest:.5})));g.position.set(0,u/2,-(t.thickness/2+.2)),g.rotation.y=Math.PI;let p=s.mesh(new Bt(new ai(h*.5,12,54),o));if(p.position.set(0,-6,0),p.castShadow=!0,this.card=new Ge,this.card.add(d,x,g,p),i.colour){let m=s.mesh(new Bt(new ai(h*.5-8,3,8),new ei({color:new Ct(i.colour),roughness:.35,metalness:.1})));m.position.set(0,-2.5,24),this.card.add(m)}return this.card.scale.setScalar(this.s),this.yawG.add(this.card),this.#i(o),this.blob=s.mesh(new Bt(new ke(1,1),new Re({map:e.softDot,color:0,transparent:!0,opacity:.55,depthWrite:!1}))),this.blob.rotation.x=-Math.PI/2,this.blob.renderOrder=2,this.root.traverse(m=>{m.userData.cardId=i.id}),this.pickables=[d,x,g,p],this}#t(){return{loadImage:this.ctx.images.loadImage,titleBlock:this.ctx.titleBlock}}async refresh(t){this.person={...this.person,...t};let e=this.#t(),[i,s]=await Promise.all([jr(this.skin,this.person,e),this.skin.back(this.person,e)]);!this.faceTex||!this.backTex||(this.faceTex.image=i,this.faceTex.needsUpdate=!0,this.backTex.image=s,this.backTex.needsUpdate=!0)}#i(t){let{skin:e,ctx:i}=this,s=i.tracker,r=this.s,o=this.stickLen,a=18*r,l=new Ct(this.person.colour??"#e8e0c8"),c=e.stick?.wood??8409389,h=s.add(new Fr({color:c,roughness:.3,clearcoat:1,clearcoatRoughness:.12,emissive:new Ct(c).multiplyScalar(.45),emissiveIntensity:.9})),u=s.add(new ei({color:e.stick?.collar??12096079,metalness:1,roughness:.34}));this.rod=new Ge;let d=s.mesh(new Bt(new un(8.5*r,6.4*r,o-a,24),h));d.position.y=(o-a)/2;let f=s.mesh(new Bt(new oa(6.4*r,18,12),h)),x=s.mesh(new Bt(new un(12.5*r,10*r,a,28),u));x.position.y=o-a/2;let g=s.mesh(new Bt(new Nr(12*r,2.2*r,8,28),u));g.rotation.x=Math.PI/2,g.position.y=o-a;let p=s.mesh(new Bt(new Nr(21,3.6,10,36),new ei({color:l,emissive:l,emissiveIntensity:1.6,roughness:.4})));p.rotation.x=Math.PI/2,p.position.y=8;for(let m of[d,f,x,g])m.castShadow=!0;this.rod.add(d,f,x,g,p),this.rod.visible=!1,this.leanG.add(this.rod)}pose(t){let e=t.grip,i=t.grow??1,s=this.s*i;this.root.position.set(t.x,t.lift,t.z);let r=1-.45*e;this.leanG.rotation.z=-t.lean*r*ls,this.hinge.position.y=this.stickLen*e,this.hinge.rotation.z=-t.lean*(1-r)*ls,this.rod.visible=e>.02,this.rod.scale.set(1,Math.max(e,.001),1),this.yawG.rotation.set(t.pitch*ls,t.yaw*ls,0),this.card.scale.set(s,s*(t.down?1:t.breathe)*t.squash,s),this.grown=i;let o=1-.45*(t.down??0),a=this.ctx.lightAt?.(t.x,t.z);if(a&&(this.light=Eh(this.light,a)),this.faceMaterial){let l=this.light??[1,1,1];this.faceMaterial.color.setRGB(o*l[0]**Tf,o*l[1]**Tf,o*l[2]**Tf)}if(this.blob.position.set(t.x,.6,t.z),t.selected)this.blob.material.color.setHex(16751174),this.blob.material.blending=Ai,this.blob.scale.set(this.w*s*1.5,120*i,1),this.blob.material.opacity=.95;else if(t.speaking){let l=1+.06*Math.sin((t.breathe-1)*400);this.blob.material.color.setHex(16773320),this.blob.material.blending=Ai,this.blob.scale.set(this.w*s*1.9*l,170*i*l,1),this.blob.material.opacity=.8}else this.blob.material.color.setHex(0),this.blob.material.blending=ns,this.blob.scale.set(this.w*s*(.95+.5*e),(74+46*e)*i,1),this.blob.material.opacity=.62-.26*e;this.#e(t)}async setEmote(t){if(this.emote&&(this.emote.sprite.parent?.remove(this.emote.sprite),this.emote=null),this.wanted=t??null,!t)return;let e=await this.ctx.emoteTexture(t);if(!e||this.wanted!==t||this.emote||this.gone)return;let i=new hn(this.ctx.tracker.add(new Zi({map:e,depthTest:!1,transparent:!0})));i.renderOrder=50,i.center.set(.5,1-or),this.emote={id:t,sprite:i},this.ctx.scene.add(i)}#e(t){let e=t.emote?.id??null;if(e&&e!==(this.wanted??null)&&this.setEmote(e).catch(()=>{}),!this.emote)return;let i=t.emote,s=this.emote.sprite;if(!i||i.id!==this.emote.id){s.visible=!1;return}s.visible=i.opacity>.01,s.material.opacity=i.opacity;let r=t.grow??1,o=96*i.pop*r,a=.96*r;s.position.set(t.x+74*this.s*r+(i.x??0)*a,t.lift+this.stickLen*t.grip+this.h*this.s*r*t.breathe+36*r-(i.y??0)*a-(or-.5)*o,t.z+30),s.scale.set(o,o,1),s.material.rotation=-(i.r??0)*ls}dispose(){this.gone=!0,this.root.parent?.remove(this.root),this.blob.parent?.remove(this.blob),this.emote&&this.emote.sprite.parent?.remove(this.emote.sprite)}};var $0=.2,Z0=.42,q0=.8,gw=3,Ch=class{constructor({scene:t,rig:e,tracker:i,softDot:s,settings:r,cardHeight:o}){this.T=i,this.cardHeight=o;let a=i.add(H0());this.impacts=[];for(let c=0;c<3;c++){let h=new hn(i.add(new Zi({map:a,depthTest:!1,transparent:!0,opacity:0})));h.renderOrder=60,h.scale.set(180,180,1),t.add(h),this.impacts.push(h)}this.flash=new ha(16769704,0,1100,2),t.add(this.flash);let l=r.sparks;if(this.sparkCount=l,l){let c=i.add(new Me);c.setAttribute("position",new Ue(new Float32Array(l*3),3)),this.sparks=new Ps(c,i.add(new Kn({size:12*bh(e),map:s,color:16767370,transparent:!0,opacity:0,blending:Ai,depthWrite:!1}))),this.sparks.frustumCulled=!1,this.dir=Array.from({length:l},(h,u)=>{let d=u/l*Math.PI*2+u%5*.37,f=260+u*53%340;return[Math.cos(d)*f,Math.sin(d)*f*.8+120,u*31%100-50]}),t.add(this.sparks)}this.flashTimes=[],this.calm=!1}update(t,e){for(let r of this.impacts)r.material.opacity=0;this.flash.intensity=0,this.sparks&&(this.sparks.material.opacity=0);let i=0,s=this.cardHeight*.5+60;for(let r of t){let o=e-r.t;if(!(o<0||o>q0)){if(o<Z0&&i<this.impacts.length){let a=this.impacts[i++],l=o/Z0;a.position.set(r.x,s+10,r.Z+90),a.scale.setScalar(120+150*Math.sqrt(l)),a.material.opacity=1-l*l,a.material.rotation=.2*l}if(o<$0&&!this.calm&&this.#t(r.t)&&(this.flash.position.set(r.x,s,r.Z+300),this.flash.intensity=55e4*(1-o/$0)**2),this.sparks&&!this.calm&&r===t[t.length-1]){let a=this.sparks.geometry.attributes.position;this.dir.forEach((l,c)=>{a.array[c*3]=r.x+l[0]*o,a.array[c*3+1]=Math.max(2,s+l[1]*o-900*o*o),a.array[c*3+2]=r.Z+90+l[2]*o}),a.needsUpdate=!0,this.sparks.material.opacity=Math.max(0,1-o/q0)}}}}#t(t){return this.flashTimes.includes(t)?!0:(this.flashTimes=this.flashTimes.filter(e=>t-e<1),this.flashTimes.length>=gw?!1:(this.flashTimes.push(t),!0))}};var Rh=class{constructor({scene:t,rig:e,zones:i,tracker:s}){this.zones=i,this.rig=e;let[r,o]=e.size;this.cw=Math.min(2048,r),this.ch=Math.round(this.cw*o/r),this.canvas=document.createElement("canvas"),this.canvas.width=this.cw,this.canvas.height=this.ch,this.ctx=this.canvas.getContext("2d"),this.tex=s.add(fi(this.canvas,{anisotropy:4}));let a=s.mesh(Ea(e,new Re({map:this.tex,transparent:!0,depthWrite:!1}),20));a.renderOrder=3,t.add(a),this.mesh=a,this.key="",a.visible=i.length>0}update(t,e,i,s=null){if(!this.zones.length)return;let r=mh(this.zones,t,e,i,s);r!==this.key&&(this.key=r,gh(this.ctx,this.cw,this.ch,this.zones,t,e,i,s,{boardLabels:!1}),this.tex.needsUpdate=!0)}},Ph=class{constructor({scene:t,rig:e,zones:i,tracker:s,cardHeight:r=300}){this.T=s,this.scene=t,this.rig=e,this.cardHeight=r,this.areas=i.filter(o=>o.kind==="area"),this.labels=new Map}update(t){for(let e of this.areas){let i=this.labels.get(e.id);if(!t){i&&(i.sprite.visible=!1);continue}let s=t.counts?.[e.id]??0,r=t.downs?.[e.id]??0;(!i||i.n!==s||i.d!==r)&&(i=this.#t(e,s,r,i)),i.sprite.visible=!!i.at}}#t(t,e,i,s){let{canvas:r,w:o,h:a}=F0(t,e,i),l=this.T.add(fi(r,{anisotropy:4}));if(s)s.sprite.material.map?.dispose(),s.sprite.material.map=l,s.sprite.material.needsUpdate=!0;else{let c=new hn(this.T.add(new Zi({map:l,depthTest:!1,transparent:!0})));c.renderOrder=45,this.scene.add(c),s={sprite:c,at:this.rig.standing(O0(t))},this.labels.set(t.id,s)}if(s.n=e,s.d=i,s.at){let{f:c}=this.rig.cam,h=c/(c-s.at.Z),u=1.45/Math.sqrt(Math.max(.15,h));s.sprite.scale.set(o*u,a*u,1),s.sprite.position.set(s.at.X,this.cardHeight*el(this.rig.cam,s.at.Z)*1.08+a*u/2,s.at.Z)}return s}},Ih=class{constructor({scene:t,tracker:e,softDot:i}){this.T=e,this.scene=t,this.pool=[];let s=e.add(xw());for(let r=0;r<6;r++){let o=e.mesh(new Bt(new ke(1,1),new Re({map:s,transparent:!0,opacity:0,depthWrite:!1})));o.rotation.x=-Math.PI/2,o.renderOrder=4,o.visible=!1,t.add(o),this.pool.push(o)}this.ghost=e.mesh(new Bt(new ke(1,1),new Re({transparent:!0,opacity:0,depthWrite:!1,side:yi}))),this.ghost.visible=!1,this.ghost.renderOrder=5,t.add(this.ghost),this.label=null,this.softDot=i,this.labelText=""}update(t,e,i){this.pool.forEach(s=>{s.visible=!1}),this.ghost.visible=!1,this.label&&(this.label.visible=!1),t.slice(0,this.pool.length).forEach((s,r)=>{let o=this.pool[r],a=s.target?1+.06*Math.sin(i*7):1;o.visible=!0,o.position.set(s.X,1.2,s.Z),o.scale.set((s.target?190:150)*a,(s.target?120:96)*a,1),o.material.opacity=Math.min(1,s.alpha)*(s.target?1:.8),s.target&&this.#t(s,e,i)})}#t(t,e,i){let s=e.get(t.for);if(!s)return;let r=this.ghost;r.material.map!==s.ghostTexture&&(r.material.map=s.ghostTexture,r.material.needsUpdate=!0);let o=t.pose;r.visible=!0,r.material.opacity=.32+.06*Math.sin(i*6),r.scale.set(s.w*s.s,s.h*s.s,1),r.position.set(t.X,o.lift+s.h*s.s/2,t.Z+4),r.rotation.set(0,0,0),r.rotateY(o.yaw*Math.PI/180),r.rotateX(o.pitch*Math.PI/180),r.rotateZ(-o.lean*Math.PI/180),t.label&&this.#i(t.label,t.X,o.lift+s.h*s.s+40,t.Z+10)}#i(t,e,i,s){if(!this.label||this.labelText!==t){this.label?.parent?.remove(this.label);let r=this.T.add(new Zi({map:this.T.add(fi(vh(t))),depthTest:!1,transparent:!0}));this.label=new hn(r),this.label.renderOrder=55,this.label.scale.set(260,49,1),this.scene.add(this.label),this.labelText=t}this.label.visible=!0,this.label.position.set(e,i,s)}},xw=()=>fi(yh(),{anisotropy:4});var Kr={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};var ji=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},yw=new Is(-1,1,1,-1,0,1),Ef=class extends Me{constructor(){super(),this.setAttribute("position",new Jt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Jt([0,2,0,0,2,0],2))}},vw=new Ef,Jr=class{constructor(t){this._mesh=new Bt(vw,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,yw)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}};var Qr=class extends ji{constructor(t,e="tDiffuse"){super(),this.textureID=e,this.uniforms=null,this.material=null,t instanceof Le?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=Os.clone(t.uniforms),this.material=new Le({name:t.name!==void 0?t.name:"unspecified",defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this._fsQuad=new Jr(this.material)}render(t,e,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this._fsQuad.material=this.material,this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var Pa=class extends ji{constructor(t,e){super(),this.scene=t,this.camera=e,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(t,e,i){let s=t.getContext(),r=t.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,o,4294967295),r.buffers.stencil.setClear(a),r.buffers.stencil.setLocked(!0),t.setRenderTarget(i),this.clear&&t.clear(),t.render(this.scene,this.camera),t.setRenderTarget(e),this.clear&&t.clear(),t.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}},kh=class extends ji{constructor(){super(),this.needsSwap=!1}render(t){t.state.buffers.stencil.setLocked(!1),t.state.buffers.stencil.setTest(!1)}};var Lh=class{constructor(t,e){if(this.renderer=t,this._pixelRatio=t.getPixelRatio(),e===void 0){let i=t.getSize(new bt);this._width=i.width,this._height=i.height,e=new Ce(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:We}),e.texture.name="EffectComposer.rt1"}else this._width=e.width,this._height=e.height;this.renderTarget1=e,this.renderTarget2=e.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Qr(Kr),this.copyPass.material.blending=Di,this.timer=new da}swapBuffers(){let t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,e){this.passes.splice(e,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){let e=this.passes.indexOf(t);e!==-1&&this.passes.splice(e,1)}isLastEnabledPass(t){for(let e=t+1;e<this.passes.length;e++)if(this.passes[e].enabled)return!1;return!0}render(t){this.timer.update(),t===void 0&&(t=this.timer.getDelta());let e=this.renderer.getRenderTarget(),i=!1;for(let s=0,r=this.passes.length;s<r;s++){let o=this.passes[s];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),o.render(this.renderer,this.writeBuffer,this.readBuffer,t,i),o.needsSwap){if(i){let a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}Pa!==void 0&&(o instanceof Pa?i=!0:o instanceof kh&&(i=!1))}}this.renderer.setRenderTarget(e)}reset(t){if(t===void 0){let e=this.renderer.getSize(new bt);this._pixelRatio=this.renderer.getPixelRatio(),this._width=e.width,this._height=e.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,e){this._width=t,this._height=e;let i=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(i,s),this.renderTarget2.setSize(i,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(i,s)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var Dh=class extends ji{constructor(t,e,i=null,s=null,r=null){super(),this.scene=t,this.camera=e,this.overrideMaterial=i,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new Ct}render(t,e,i){let s=t.autoClear;t.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(t.getClearColor(this._oldClearColor),t.setClearColor(this.clearColor,t.getClearAlpha())),this.clearAlpha!==null&&(r=t.getClearAlpha(),t.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&t.clearDepth(),t.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),t.render(this.scene,this.camera),this.clearColor!==null&&t.setClearColor(this._oldClearColor),this.clearAlpha!==null&&t.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),t.autoClear=s}};var Y0={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ct(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};var to=class n extends ji{constructor(t,e=1,i,s){super(),this.strength=e,this.radius=i,this.threshold=s,this.resolution=t!==void 0?new bt(t.x,t.y):new bt(256,256),this.clearColor=new Ct(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new Ce(r,o,{type:We,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){let u=new Ce(r,o,{type:We,depthBuffer:!1});u.texture.name="UnrealBloomPass.h"+h,u.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(u);let d=new Ce(r,o,{type:We,depthBuffer:!1});d.texture.name="UnrealBloomPass.v"+h,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),r=Math.round(r/2),o=Math.round(o/2)}let a=Y0;this.highPassUniforms=Os.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Le({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];let l=[6,10,14,18,22];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new bt(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=e,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Os.clone(Kr.uniforms),this.blendMaterial=new Le({uniforms:this.copyUniforms,vertexShader:Kr.vertexShader,fragmentShader:Kr.fragmentShader,premultipliedAlpha:!0,blending:Ai,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Ct,this._oldClearAlpha=1,this._basic=new Re,this._fsQuad=new Jr(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(t,e){let i=Math.round(t/2),s=Math.round(e/2);this.renderTargetBright.setSize(i,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(i,s),this.renderTargetsVertical[r].setSize(i,s),this.separableBlurMaterials[r].uniforms.invSize.value=new bt(1/i,1/s),i=Math.round(i/2),s=Math.round(s/2)}render(t,e,i,s,r){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),r&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=i.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=n.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[l]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=n.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[l]),t.clear(),this._fsQuad.render(t),a=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(i),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(t){let e=[],i=t/3;for(let o=0;o<t;o++)e.push(.39894*Math.exp(-.5*o*o/(i*i))/i);let s=[],r=[];for(let o=1;o<t;o+=2){let a=e[o],l=o+1<t?e[o+1]:0,c=a+l;s.push((o*a+(o+1)*l)/c),r.push(c)}return new Le({defines:{KERNEL_PAIRS:s.length},uniforms:{colorTexture:{value:null},invSize:{value:new bt(.5,.5)},direction:{value:new bt(.5,.5)},centerWeight:{value:e[0]},gaussianOffsets:{value:s},gaussianWeights:{value:r}},vertexShader:`

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

				}`})}};to.BlurDirectionX=new bt(1,0);to.BlurDirectionY=new bt(0,1);var _w={uniforms:{tDiffuse:{value:null},uTime:{value:0},uAmount:{value:.022},uVig:{value:.42},uRes:{value:new bt(2560,1440)}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:`
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
    }`},eo=2,Af=Object.freeze({strength:.17,radius:.45,threshold:.9}),Nh=class{constructor(t,e,i,{width:s,height:r,samples:o}){this.target=new Ce(s,r,{type:We,samples:o}),this.composer=new Lh(t,this.target),this.composer.setPixelRatio(1),this.composer.setSize(s,r),this.composer.addPass(new Dh(e,i)),this.bloom=new to(new bt(Math.ceil(s/eo),Math.ceil(r/eo)),Af.strength,Af.radius,Af.threshold);let a=this.bloom.setSize.bind(this.bloom);this.bloom.setSize=(l,c)=>a(Math.ceil(l/eo),Math.ceil(c/eo)),this.composer.addPass(this.bloom),this.grain=new Qr(_w),this.grain.uniforms.uRes.value.set(s,r),this.composer.addPass(this.grain)}setSize(t,e){this.composer.setSize(t,e),this.bloom.resolution.set(Math.ceil(t/eo),Math.ceil(e/eo)),this.grain.uniforms.uRes.value.set(t,e)}setCalm(t){this.grain.uniforms.uAmount.value=t?0:.022}render(t){this.grain.uniforms.uTime.value=Math.floor(t*24)%97*.37,this.composer.render()}dispose(){this.composer.dispose?.(),this.target.dispose();for(let t of this.composer.passes)t.dispose?.()}};var Mw=Object.freeze(["off","zones","anywhere"]),Oi=Object.freeze({white:"#f2ecdc",yellow:"#eed46c",pink:"#eba0b8",blue:"#8fc0e0",green:"#97d09c",orange:"#eea060"}),J0=Object.freeze(Object.keys(Oi)),no=Object.freeze([.82,.84]),Ki=Object.freeze({width:300,depth:58,wall:22,stick:Object.freeze({radius:8,height:62,spacing:27,first:-122}),hit:Object.freeze({radius:13,height:96}),magic:Object.freeze({x:58,radius:9,height:70}),eraser:Object.freeze({x:112})}),j0=-10*Math.PI/180,bw=4+Ki.hit.height-14,Oh=8;function Sw(n,t){let e=n.standing(t);if(!e)return null;let i=Math.cos(j0),s=Math.sin(j0),r=1/0,o=1/0,a=-1/0,l=-1/0;for(let c of[-Ki.width/2,Ki.width/2])for(let h of[0,bw])for(let u of[-Ki.depth/2,Ki.depth/2]){let d=n.screenOf(e.X+c*i+u*s,h,e.Z-c*s+u*i);r=Math.min(r,d.x),o=Math.min(o,d.y),a=Math.max(a,d.x),l=Math.max(l,d.y)}return{x0:r,y0:o,x1:a,y1:l}}function ww(n,t){if(n.rect){let[e,i,s,r]=n.rect;return!(s<t.x0||e>t.x1||r<t.y0||i>t.y1)}if(n.circle){let[e,i,s]=n.circle,r=Math.max(t.x0,Math.min(e,t.x1)),o=Math.max(t.y0,Math.min(i,t.y1));return(r-e)**2+(o-i)**2<=s**2}return!1}function Ia(n,t,e=[],i=null){let s=Sw(n,t);if(!s)return!1;let r={x0:s.x0-Oh,y0:s.y0-Oh,x1:s.x1+Oh,y1:s.y1+Oh};return i&&(r.x0<i.x0||r.x1>i.x1||r.y0<i.y0||r.y1>i.y1)?!1:!e.some(o=>ww(o,r))}function Q0(n,t,e=[],i=null,s=[]){if(Ia(n,t,e,i))return[t[0],t[1]];let r=[];for(let a=0;a<=30;a++)for(let l=-10;l<=10;l++)r.push([a/100,l/50]);r.sort((a,l)=>a[0]*1.2+Math.abs(a[1])-(l[0]*1.2+Math.abs(l[1])));let o=a=>{for(let[l,c]of r){let h=[Math.round((t[0]+c)*1e3)/1e3,Math.round((t[1]-l)*1e3)/1e3];if(!(h[0]<.03||h[0]>.97)&&Ia(n,h,a,i))return h}return null};return(s.length?o([...e,...s]):null)??o(e)??[t[0],t[1]]}var io=Object.freeze({height:1440,tile:240,maxWidth:4320});function Rf(n){let[t,e]=n?.size??[2,1],i=io.height,s=Math.min(io.maxWidth,Math.max(io.tile,Math.round(i*t/e)));return{w:s,h:i,tile:io.tile,cols:Math.ceil(s/io.tile),rows:Math.ceil(i/io.tile)}}var Tw=(n,t)=>`c${n}r${t}`;function tx(n){let t=/^c(\d{1,3})r(\d{1,3})$/.exec(String(n));return t?{c:Number(t[1]),r:Number(t[2])}:null}function ex(n,t){let e=tx(t);return!!e&&e.c<n.cols&&e.r<n.rows}function ze(n,t){let e=tx(t);if(!e)return null;let i=e.c*n.tile,s=e.r*n.tile;return{x:i,y:s,w:Math.min(n.tile,n.w-i),h:Math.min(n.tile,n.h-s)}}function Fi(n,{x0:t,y0:e,x1:i,y1:s}){let r=Math.max(0,Math.floor(t/n.tile)),o=Math.max(0,Math.floor(e/n.tile)),a=Math.min(n.cols-1,Math.floor(i/n.tile)),l=Math.min(n.rows-1,Math.floor(s/n.tile)),c=[];for(let h=o;h<=l;h++)for(let u=r;u<=a;u++)c.push(Tw(u,h));return c}var Pf=(n,t,e)=>({x:t*n.w,y:e*n.h});var Ew=8,If=(n,t="")=>`${String(Math.floor(n)).padStart(14,"0")}-${t}`;function ix(n){return[...n].sort((t,e)=>(t.since??0)-(e.since??0)||String(t.by).localeCompare(String(e.by)))}function nx(n,{by:t=null}={}){let e=null;for(let i of n)if(!(t&&i.by!==t))for(let[s,r]of Object.entries(i.history??{}))!r||typeof r!="object"||(!e||(r.at??0)>(e.step.at??0)||(r.at??0)===(e.step.at??0)&&s>e.id)&&(e={layer:i,id:s,step:r});return e}var Aw=320*1024,sx=12,K0=n=>64+Object.values(n?.tiles??{}).reduce((t,e)=>t+(typeof e=="string"?e.length:0),0);function kf(n,{keep:t=Ew,bytes:e=Aw,before:i=null,protect:s=null}={}){let r=Object.entries(n??{}).filter(([,l])=>l&&typeof l=="object").sort(([l,c],[h,u])=>(c.at??0)-(u.at??0)||(l<h?-1:l>h?1:0)),o=[];if(i!==null){let l=r.filter(([c,h])=>c!==s&&(h.at??0)<i);o.push(...l.map(([c])=>c)),r=r.filter(c=>!l.includes(c))}let a=r.reduce((l,[,c])=>l+K0(c),0);for(;r.length>1&&(r.length>t||a>e);){let l=r.findIndex(([c],h)=>c!==s&&h<r.length-1);if(l<0)break;a-=K0(r[l][1]),o.push(r[l][0]),r.splice(l,1)}return o}function Fh(n,t=null){let e=t?.mode&&Mw.includes(t.mode)?t.mode:n?.mode??"off",i=t?.locked===!0||t?.locked===void 0&&n?.lock===!0;return{mode:e,locked:i}}var Cf=Object.freeze([null,"off","zones","anywhere"]),rx=n=>Cf[(Cf.indexOf(n??null)+1)%Cf.length];function Lf(n,t,e,i){return n.locked||n.mode==="off"?!1:n.mode==="anywhere"?!0:t.some(s=>s.kind==="chalk"&&xn(s.shape,e,i))}function ox(n,t){return n.mode==="off"||n.locked?!1:n.mode==="anywhere"||t.some(e=>e.kind==="chalk")}function ax(n,t){return n.mode!=="zones"?null:t.filter(e=>e.kind==="chalk").map(e=>e.shape)}var lx=10,cx=2.5;function Cw(n,t){let e=new un(n,n,t,24,8),i=e.getAttribute("position"),s=new Float32Array(i.count*3),r=new Ct;for(let o=0;o<i.count;o++){let a=(Math.atan2(i.getZ(o),i.getX(o))/(Math.PI*2)+1)%1,l=i.getY(o)/t+.5;r.setHSL((a+l*.75)%1,.7,.68,Ae),s.set([r.r,r.g,r.b],o*3)}return e.setAttribute("color",new Ue(s,3)),e}var Uh=class{constructor({scene:t,rig:e}){this.rig=e,this.group=new Ge,t.add(this.group),this.geometry=new ke(1,1),this.tiles=new Map,this.#t()}#t(){let t=document.createElement("canvas");t.width=t.height=4;let e=fi(t,{anisotropy:4}),i=new Re({map:e,transparent:!0,depthWrite:!1,color:15658734}),s=Ea(this.rig,i,lx,{x0:0,y0:0,x1:.001,y1:.001},this.geometry);s.renderOrder=cx,this.group.add(s),this.primer={mesh:s,texture:e,material:i}}update(t,e,i=!1){let s=t.grid,r=i?new Set([...e,...this.tiles.keys(),...t.composite.keys()]):e;for(let o of r){let a=t.composite.get(o)??null,l=this.tiles.get(o);if(l&&l.canvas===a){l.texture.needsUpdate=!0;continue}if(l&&this.#i(o),!a)continue;let c=ze(s,o),h=fi(a,{anisotropy:4}),u=new Re({map:h,transparent:!0,depthWrite:!1,color:15658734}),d=Ea(this.rig,u,lx,{x0:c.x/s.w,y0:c.y/s.h,x1:(c.x+c.w)/s.w,y1:(c.y+c.h)/s.h},this.geometry);d.renderOrder=cx,this.group.add(d),this.tiles.set(o,{mesh:d,texture:h,material:u,canvas:a})}}#i(t){let e=this.tiles.get(t);e&&(this.group.remove(e.mesh),e.texture.dispose(),e.material.dispose(),this.tiles.delete(t))}setHidden(t){this.group.visible=!t}dispose(){for(let t of[...this.tiles.keys()])this.#i(t);this.primer?.texture.dispose(),this.primer?.material.dispose(),this.geometry.dispose(),this.group.removeFromParent()}};var Bh=class{constructor({scene:t,rig:e,at:i,tracker:s}){this.group=new Ge,this.sticks=[];let r=e.standing(i);if(!r){this.group.visible=!1,t.add(this.group),this.hidden=!0;return}this.group.position.set(r.X,0,r.Z),this.group.rotation.y=-10*ls;let{width:o,depth:a,wall:l,stick:c,hit:h,magic:u,eraser:d}=Ki,f=s.add(new ei({color:8016432,roughness:.6})),x=s.add(new ei({color:3810322,roughness:.8})),g=s.mesh(new Bt(new ai(o,8,a),x));g.position.y=4,this.group.add(g);for(let[R,P,k,B]of[[o,8,0,a/2-4],[o,8,0,-a/2+4],[8,a,o/2-4,0],[8,a,-o/2+4,0]]){let I=s.mesh(new Bt(new ai(R,l,P),f));I.position.set(k,l/2+4,B),I.castShadow=!0,this.group.add(I)}let p=s.add(new Re({visible:!1})),m=s.add(new un(h.radius,h.radius,h.height,8)),M=(R,P)=>{let k=s.mesh(new Bt(m,p));k.position.set(R,4+h.height/2-14,0),Object.assign(k.userData,P),this.group.add(k),this.sticks.push(k)};Object.entries(Oi).forEach(([R,P],k)=>{let B=c.first+k*c.spacing,I=new Ct(P),U=s.add(new ei({color:I,roughness:.95,emissive:I.clone().multiplyScalar(.18)})),V=s.mesh(new Bt(new un(c.radius,c.radius,c.height,14),U));V.position.set(B,4+c.height/2-6,(k%2-.5)*6),V.rotation.z=(k%3-1)*.07,V.rotation.x=((k+1)%3-1)*.05,V.castShadow=!0,this.group.add(V),M(B,{chalk:R})});let E=s.add(new ei({vertexColors:!0,roughness:.55,emissive:2763306})),_=s.mesh(new Bt(Cw(u.radius,u.height),E));_.position.set(u.x,4+u.height/2-6,2),_.rotation.z=.06,_.castShadow=!0,this.group.add(_);let T=s.add(new ei({color:16765802,roughness:.3,metalness:.6,emissive:16758832,emissiveIntensity:.55})),w=s.mesh(new Bt(new ra(u.radius*1.15,0),T));w.position.set(u.x-Math.sin(.06)*(u.height/2),4+u.height-2,2),w.scale.set(1,1.3,.55),this.group.add(w),M(u.x,{magic:!0});let A=s.add(new ei({color:599e4,roughness:1})),v=s.mesh(new Bt(new ai(50,32,30),A));v.position.set(d.x,20,4),v.rotation.y=.12,v.castShadow=!0,this.group.add(v);let b=s.mesh(new Bt(s.add(new ai(58,60,50)),p));b.position.set(d.x,30,4),b.userData.eraser=!0,this.group.add(b),this.sticks.push(b),t.add(this.group)}setVisible(t){this.hidden||(this.group.visible=t)}get pickables(){return this.sticks}moveTo(t,e){if(this.hidden)return;let i=t.standing(e);i&&this.group.position.set(i.X,0,i.Z)}};var oe=Object.freeze({chalk:Object.freeze({kind:"paint",tip:"chalk",size:Object.freeze({min:2,max:48,initial:7}),spacing:.1,flow:.8,opacity:1,grain:.7,scatter:.05,jitter:Object.freeze({size:.12,angle:1}),pressure:Object.freeze({size:.5,flow:.4}),taper:0}),magic:Object.freeze({kind:"paint",tip:"chalk",magic:!0,size:Object.freeze({min:2,max:64,initial:10}),spacing:.09,flow:.85,opacity:1,grain:.45,scatter:.04,jitter:Object.freeze({size:.1,angle:1}),pressure:Object.freeze({size:.5,flow:.4}),taper:0}),pencil:Object.freeze({kind:"paint",tip:"pencil",size:Object.freeze({min:1,max:14,initial:2.5}),spacing:.12,flow:.9,opacity:1,grain:.2,scatter:0,jitter:Object.freeze({size:.04,angle:0}),pressure:Object.freeze({size:.45,flow:.55}),taper:1.5}),brush:Object.freeze({kind:"paint",tip:"soft",size:Object.freeze({min:3,max:140,initial:24}),spacing:.06,flow:.45,opacity:.88,grain:0,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.7,flow:.25}),taper:1}),spray:Object.freeze({kind:"spray",tip:"speck",size:Object.freeze({min:10,max:180,initial:48}),spacing:.05,flow:.55,opacity:1,grain:0,scatter:0,particles:34,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.25,flow:.6}),taper:0}),smudge:Object.freeze({kind:"smudge",tip:"soft",size:Object.freeze({min:6,max:140,initial:32}),spacing:.08,flow:.6,opacity:1,grain:0,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.35,flow:.5}),taper:0}),eraser:Object.freeze({kind:"erase",tip:"round",size:Object.freeze({min:3,max:180,initial:28}),spacing:.07,flow:1,opacity:1,grain:0,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:.35,flow:0}),taper:0}),fill:Object.freeze({kind:"fill",tip:null,size:Object.freeze({min:0,max:0,initial:0}),spacing:1,flow:1,opacity:.95,grain:.3,scatter:0,jitter:Object.freeze({size:0,angle:0}),pressure:Object.freeze({size:0,flow:0}),taper:0})}),Gh=Object.freeze(Object.keys(oe)),zh=Object.freeze({chalk:.62,pencil:.82,round:.78});function hx(n,t,e=.5){if(t>=1)return 0;let i=(s,r,o)=>{let a=Math.max(0,Math.min(1,(o-s)/(r-s)));return a*a*(3-2*a)};if(n==="chalk"){let s=zh.chalk;if(t<=s)return .96;let r=(t-s)/(1-s),o=.96*(1-i(0,1,r));return e<r*.85?o*.2:o}if(n==="pencil"){let s=zh.pencil;return(t<=s?.95:.95*(1-i(s,1,t)))*(.88+.12*e)}return n==="round"?t<=zh.round?1:1-i(zh.round,1,t):n==="speck"?Math.exp(-6*t*t):Math.exp(-3.2*t*t)*(1-i(.85,1,t))}var ro=Object.freeze([0,5,12,26]);function Bs(n){let t=n>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function Nf(n){let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return t>>>0}var Df=class{constructor(t=0){this.r=Math.max(0,t),this.at=null,this.pointer=null}push({x:t,y:e,p:i=.5}){if(this.pointer={x:t,y:e,p:i},!this.at)return this.at={x:t,y:e,p:i},[{...this.at}];let s=t-this.at.x,r=e-this.at.y,o=Math.hypot(s,r);if(o<=this.r)return this.at.p+=(i-this.at.p)*.35,[];let a=this.r?(o-this.r)/o:1;return this.at={x:this.at.x+s*a,y:this.at.y+r*a,p:i},[{...this.at}]}finish(){if(!this.pointer||!this.at)return[];let t=this.pointer.x-this.at.x,e=this.pointer.y-this.at.y,i=Math.hypot(t,e);if(i<.5)return[];let s=Math.max(1,Math.ceil(i/Math.max(2,this.r/2))),r=[];for(let o=1;o<=s;o++)r.push({x:this.at.x+t*o/s,y:this.at.y+e*o/s,p:this.pointer.p});return this.at={...this.pointer},r}},Hh=class{constructor(){this.last=null,this.p=.75}pressure({x:t,y:e,t:i,pressure:s=.5,pointerType:r="mouse"}){if(r==="pen"&&s>0)return this.last={x:t,y:e,t:i},Math.max(.08,Math.min(1,s));if(!this.last)return this.last={x:t,y:e,t:i},this.p;let o=Math.max(1,i-this.last.t),a=Math.hypot(t-this.last.x,e-this.last.y)/o;this.last={x:t,y:e,t:i};let l=Math.max(.45,Math.min(1,1.05-a*.22));return this.p+=(l-this.p)*.25,this.p}};function Rw(n,t,e,i,s){let r=Math.max(1e-4,Math.hypot(t.x-n.x,t.y-n.y)**.5),o=Math.max(1e-4,Math.hypot(e.x-t.x,e.y-t.y)**.5),a=Math.max(1e-4,Math.hypot(i.x-e.x,i.y-e.y)**.5),l=u=>e[u]-t[u]+o*((t[u]-n[u])/r-(e[u]-n[u])/(r+o)),c=u=>e[u]-t[u]+o*((i[u]-e[u])/a-(i[u]-t[u])/(o+a)),h=u=>{let d=2*t[u]-2*e[u]+l(u)+c(u),f=-3*t[u]+3*e[u]-2*l(u)-c(u);return((d*s+f)*s+l(u))*s+t[u]};return{x:h("x"),y:h("y"),p:t.p+(e.p-t.p)*s}}var so=class{constructor({tool:t="chalk",size:e=null,flow:i=1,steady:s=0,seed:r=1}={}){this.def=oe[t]??oe.chalk,this.tool=t,this.size=Math.max(this.def.size.min,Math.min(this.def.size.max,e??this.def.size.initial)),this.flowScale=Math.max(0,Math.min(1,i)),this.steady=new Df(s),this.seed=r>>>0,this.points=[],this.prev=null,this.carry=0,this.dist=0,this.count=0,this.dabs=0}add(t){let e=[];for(let i of this.steady.push(t))this.#t(i,e);return e}finish(){let t=[];for(let i of this.steady.finish())this.#t(i,t);let e=this.points;if(e.length>=2){let i=e.length;this.#i(e[i-3]??e[i-2],e[i-2],e[i-1],e[i-1],t)}else e.length===1&&this.count===0&&this.#s(e[0],0,t);return t}#t(t,e){let i=this.points[this.points.length-1];if(i&&Math.hypot(t.x-i.x,t.y-i.y)<.35){i.p=t.p;return}this.points.push(t),this.points.length>4&&this.points.shift();let s=this.points,r=s.length;if(r===1){this.prev={...t},this.#s(t,0,e);return}r>=3&&this.#i(s[r-4]??s[r-3],s[r-3],s[r-2],s[r-1],e)}#i(t,e,i,s,r){let o=Math.hypot(i.x-e.x,i.y-e.y),a=Math.max(1,Math.ceil(o/.75)),l=this.prev??e;for(let c=1;c<=a;c++){let h=Rw(t,e,i,s,c/a),u=Math.hypot(h.x-l.x,h.y-l.y);this.carry+=u,this.dist+=u;let d=this.#n(h.p);for(;this.carry>=d;){this.carry-=d;let f=this.carry,x=u>0?Math.max(0,Math.min(1,1-f/u)):1,g={x:l.x+(h.x-l.x)*x,y:l.y+(h.y-l.y)*x,p:h.p};this.#s(g,Math.atan2(h.y-l.y,h.x-l.x),r)}l=h}this.prev=l}#e(t){let e=this.def.pressure;return{size:1-e.size+e.size*t,flow:1-e.flow+e.flow*t}}#n(t){return Math.max(.4,this.def.spacing*this.size*this.#e(t).size)}#s(t,e,i){let s=Bs(this.seed+this.count*7919);this.count++;let r=this.def,o=this.#e(t.p),a=r.taper>0?Math.min(1,.35+.65*this.dist/(r.taper*this.size)):1,l=Math.max(.6,this.size*o.size*a*(1+r.jitter.size*(s()*2-1))),c=r.scatter*this.size,h=r.jitter.angle?s()*Math.PI*2:e;i.push({x:t.x+(s()*2-1)*c,y:t.y+(s()*2-1)*c,size:l,flow:Math.max(0,Math.min(1,r.flow*this.flowScale*o.flow)),angle:h,seed:(this.seed^Math.imul(this.count,2654435761))>>>0,dist:this.dist})}};function Vh(n,t,e={}){let i=new so({...e,steady:0}),s=Math.max(2,Math.ceil(Math.hypot(t.x-n.x,t.y-n.y)/3)),r=[];for(let o=0;o<=s;o++)r.push(...i.add({x:n.x+(t.x-n.x)*o/s,y:n.y+(t.y-n.y)*o/s,p:n.p??.75}));return r.push(...i.finish()),r}function ka(n){let t=1/0,e=1/0,i=-1/0,s=-1/0;for(let r of n){let o=r.size/2+2;t=Math.min(t,r.x-o),e=Math.min(e,r.y-o),i=Math.max(i,r.x+o),s=Math.max(s,r.y+o)}return Number.isFinite(t)?{x0:t,y0:e,x1:i,y1:s}:null}function hs(n){let t=parseInt(String(n).replace("#",""),16),e=(t>>16&255)/255,i=(t>>8&255)/255,s=(t&255)/255,r=Math.max(e,i,s),o=r-Math.min(e,i,s),a=0;return o&&(a=r===e?(i-s)/o%6:r===i?(s-e)/o+2:(e-i)/o+4),{h:(a*60+360)%360,s:r?o/r:0,v:r}}function La({h:n,s:t,v:e}){let i=r=>{let o=(r+n/60)%6;return e-e*t*Math.max(0,Math.min(o,4-o,1))},s=r=>Math.round(Math.max(0,Math.min(1,r))*255).toString(16).padStart(2,"0");return`#${s(i(5))}${s(i(3))}${s(i(1))}`}function ux(n,t,{every:e=900}={}){let i=hs(n);return La({h:(i.h+t/e*360)%360,s:Math.max(.55,i.s),v:Math.max(.85,i.v)})}function zs(n){let t=/^#?([0-9a-f]{6})$/i.exec(String(n??"").trim());return t?`#${t[1].toLowerCase()}`:null}function dx({size:n,map:t,view:e},i){let[s,r]=n,o=s*t.s*e.s/i.w,a=r*t.s*e.s/i.h;return{k:(o+a)/2,kx:o,ky:a,bx:(t.ox-e.ox)*e.s,by:(t.oy-e.oy)*e.s}}function fx(n,t){return{k:n.k*t,bx:n.bx*t,by:n.by*t}}function px(n,t){let e=parseInt(String(n).replace("#",""),16),i=a=>Math.max(0,Math.min(255,Math.round(a*t))),s=i(e>>16&255),r=i(e>>8&255),o=i(e&255);return`#${[s,r,o].map(a=>a.toString(16).padStart(2,"0")).join("")}`}function mx(n,t,e,i=60){if(!n||!t)return[];let s=t.x-n.x,r=t.y-n.y,o=Math.hypot(s,r);if(o<.75)return[];let a=Math.max(.4,e,o/i),l=Math.floor(o/a),c=Math.atan2(r,s),h=[];for(let u=1;u<=l;u++){let d=u*a/o;h.push({x:n.x+s*d,y:n.y+r*d,size:n.size,flow:n.flow,angle:n.angle?n.angle:c,seed:n.seed+u*40503>>>0,dist:(n.dist??0)+u*a})}return h.push({x:t.x,y:t.y,size:n.size,flow:n.flow,angle:n.angle?n.angle:c,seed:n.seed+99991>>>0,dist:(n.dist??0)+o}),h}function Of(n,t,e,i,s=3){let r=1/0,o=1/0,a=-1/0,l=-1/0;for(let h of n){let u=h.size*t.k/2+s,d=h.x*t.k+t.bx,f=h.y*t.k+t.by;r=Math.min(r,d-u),o=Math.min(o,f-u),a=Math.max(a,d+u),l=Math.max(l,f+u)}if(!Number.isFinite(r))return null;let c={x:Math.max(0,Math.floor(r)),y:Math.max(0,Math.floor(o))};return c.w=Math.min(e,Math.ceil(a))-c.x,c.h=Math.min(i,Math.ceil(l))-c.y,c.w>0&&c.h>0?c:null}function Ff(n,t){if(!n)return t;if(!t)return n;let e=Math.min(n.x,t.x),i=Math.min(n.y,t.y);return{x:e,y:i,w:Math.max(n.x+n.w,t.x+t.w)-e,h:Math.max(n.y+n.h,t.y+t.h)-i}}var Uf=4,gx=15;function Pw(n,t){return n.def.kind==="erase"?"#ffffff":n.magic?.rainbow?ux(n.colour,Math.round(t.dist/gx)*gx):n.colour}function Da(n,t,e,i,s,{clip:r=null,dim:o=null}={}){let a=s.k,l=i.size*a/2,c=i.x*a+s.ox,h=i.y*a+s.oy,u=Pw(e,i);if(o!==null&&o!==1&&(u=px(u,o)),e.def.kind==="spray"){let m=Bs(i.seed),M=Math.max(1,Math.round((e.def.particles??30)*i.flow)),E=t.coloured("speck",0,u);for(let _=0;_<M;_++){let T=m()*Math.PI*2,w=l*Math.pow(m(),.75),A=c+Math.cos(T)*w,v=h+Math.sin(T)*w,b=(1.2+m()*2.4)*a,R=.3+m()*.6;r&&(A<-4||v<-4||A>r.w+4||v>r.h+4)||(n.globalAlpha=R,n.drawImage(E,A-b/2,v-b/2,b,b))}return n.globalAlpha=1,{x0:c-l-4,y0:h-l-4,x1:c+l+4,y1:h+l+4}}let d=e.def.tip??"round",f=d==="chalk"?i.seed%Uf:0,x=t.coloured(d,f,u),g=i.angle?Math.cos(i.angle):1,p=i.angle?Math.sin(i.angle):0;return n.setTransform(g,p,-p,g,c,h),n.globalAlpha=i.flow,n.drawImage(x,-l,-l,l*2,l*2),n.setTransform(1,0,0,1,0,0),n.globalAlpha=1,{x0:c-l-2,y0:h-l-2,x1:c+l+2,y1:h+l+2}}var Mi=96,oo=256,Iw=48,kw=.3,Lw=320,Dw=4,ge=(n,t)=>{let e=document.createElement("canvas");return e.width=Math.max(1,Math.round(n)),e.height=Math.max(1,Math.round(t)),e},se=n=>n.getContext("2d",globalThis.__chalkSoftware?{willReadFrequently:!0}:void 0);function xx(n,t,e){if(!n)return{x:0,y:0,w:t,h:e};let i=Math.max(0,Math.floor(n.x0)),s=Math.max(0,Math.floor(n.y0)),r=Math.min(t,Math.ceil(n.x1)),o=Math.min(e,Math.ceil(n.y1));return{x:i,y:s,w:Math.max(0,r-i),h:Math.max(0,o-s)}}var yx=(n,t)=>!n||!t?null:{x0:Math.min(n.x0,t.x0),y0:Math.min(n.y0,t.y0),x1:Math.max(n.x1,t.x1),y1:Math.max(n.y1,t.y1)};function Xh(n,t,e,i=!1){let s=t+1,r=new Float32Array(s*s);for(let l=0;l<r.length;l++)r[l]=e();if(i)for(let l=0;l<s;l++)r[l*s+t]=r[l*s],r[t*s+l]=r[l];let o=new Float32Array(n*n),a=l=>l*l*(3-2*l);for(let l=0;l<n;l++){let c=l/n*t,h=Math.floor(c),u=a(c-h);for(let d=0;d<n;d++){let f=d/n*t,x=Math.floor(f),g=a(f-x),p=r[h*s+x],m=r[h*s+x+1],M=r[(h+1)*s+x],E=r[(h+1)*s+x+1];o[l*n+d]=p+(m-p)*g+(M-p)*u+(p-m-M+E)*g*u}}return o}var Bf=class{constructor(){this.shapes=new Map,this.tinted=new Map}shape(t,e=0){let i=`${t}:${e}`,s=this.shapes.get(i);if(s)return s;s=ge(Mi,Mi);let r=se(s),o=r.createImageData(Mi,Mi),a=Bs(9001+e*131+t.charCodeAt(0)),l=Xh(Mi,7,a),c=Xh(Mi,30,a),h=Mi/2;for(let u=0;u<Mi;u++)for(let d=0;d<Mi;d++){let f=u*Mi+d,x=hx(t,Math.hypot(d+.5-h,u+.5-h)/h,l[f]*.7+c[f]*.3),g=f*4;o.data[g]=o.data[g+1]=o.data[g+2]=255,o.data[g+3]=Math.round(x*255)}return r.putImageData(o,0,0),this.shapes.set(i,s),s}coloured(t,e,i){let s=`${t}:${e}:${i}`,r=this.tinted.get(s);if(r)return r;this.tinted.size>Lw&&this.tinted.delete(this.tinted.keys().next().value),r=ge(Mi,Mi);let o=se(r);return o.drawImage(this.shape(t,e),0,0),o.globalCompositeOperation="source-in",o.fillStyle=i,o.fillRect(0,0,Mi,Mi),this.tinted.set(s,r),r}},zf=class{constructor(){this.noise=null,this.by=new Map,this.patterns=new Map}canvas(t){let e=Math.round(Math.max(0,Math.min(1,t))*20)/20,i=this.by.get(e);if(i)return i;if(!this.noise){let o=Bs(77),a=Xh(oo,16,o,!0),l=Xh(oo,64,o,!0);this.noise=a.map((c,h)=>Math.max(0,Math.min(1,c*.45+l[h]*.55+(o()-.5)*.25)))}i=ge(oo,oo);let s=se(i),r=s.createImageData(oo,oo);for(let o=0;o<this.noise.length;o++){let a=o*4;r.data[a]=r.data[a+1]=r.data[a+2]=255,r.data[a+3]=Math.round((1-e*this.noise[o]**1.4)*255)}return s.putImageData(r,0,0),this.by.set(e,i),i}pattern(t,e,i,s){let r=`${e}|${i}|${s}`,o=this.patterns.get(r);return o||(o=t.createPattern(this.canvas(e),"repeat"),o?.setTransform?.(new DOMMatrix().translate(-i,-s)),o&&this.patterns.set(r,o),o)}},$h=class n{constructor({grid:t,onChange:e=()=>{}}){this.grid=t,this.onChange=e,this.layers=new Map,this.order=[],this.composite=new Map,this.strokes=new Map,this.tips=new Bf,this.grain=new zf,this.mask=null,this.maskTiles=new Map,this.dirty=new Map,this.loads=new Map,this.scratch=null,this.pending=!1}warmUp(){let t=[];for(let s=0;s<Uf;s++)t.push(()=>this.tips.shape("chalk",s));for(let s of["pencil","round","soft","speck"])t.push(()=>this.tips.shape(s,0));for(let s of Object.values(oe))s.grain>0&&t.push(()=>this.grain.canvas(s.grain));for(let s of["chalk","magic","pencil","brush","spray","smudge","eraser"])t.push(()=>this.#t(s));t.push(()=>this.#i());let e=globalThis.requestIdleCallback??(s=>setTimeout(s,30)),i=()=>{let s=t.shift();if(s){try{s()}catch{}e(i)}};e(i)}#t(t){this.warm||(this.warm=new n({grid:this.grid}),this.warm.tips=this.tips,this.warm.grain=this.grain,this.warm.setMask([[[0,0],[1,0],[1,1],[0,1]]]));let e=this.warm,i=oe[t],s=`warm-${t}`;e.begin({id:s,by:"warm",tool:t,colour:"#ffffff",magic:i.magic?{glow:!0,sparkle:!0,rainbow:t==="magic"}:null}),e.paint(s,Vh({x:80,y:90,p:.8},{x:330,y:150,p:.8},{tool:t,size:Math.max(6,i.size.initial),seed:3})),e.flush(),e.commit(s),e.flush()}#i(){let t=this.warm?.layers.get("warm")?.tiles.values().next().value;t&&Gf(t,!0).catch(()=>{}),this.warm?.clear(),this.warm=null}#e(t,e=null){let i=this.dirty.get(t);this.dirty.set(t,i===void 0?e:yx(i,e)),this.#n()}#n(){if(this.pending)return;this.pending=!0,(globalThis.requestAnimationFrame??(e=>setTimeout(e,16)))(()=>this.flush())}flush(){if(this.pending=!1,!this.dirty.size)return;let t=[...this.dirty];this.dirty.clear();for(let[e,i]of t)this.#y(e,i);this.onChange(new Set(t.map(([e])=>e)))}setLayers(t){let e=new Set(t.map(s=>s.by));for(let s of this.strokes.values())e.add(s.by);for(let[s,r]of this.layers)if(!e.has(s)){for(let o of r.tiles.keys())this.#e(o);this.layers.delete(s)}for(let s of t){let r=this.layers.get(s.by);if(r){Number.isFinite(s.since)&&s.since!==r.since&&(r.since=s.since,this.#s(r));continue}this.layers.set(s.by,{by:s.by,since:s.since??Date.now(),tiles:new Map,sources:new Map})}let i=this.order.join("|");if(this.order=ix([...this.layers.values()]).map(s=>s.by),i!==this.order.join("|"))for(let s of this.layers.values())this.#s(s)}ensureLayer(t,e=Date.now()){return this.layers.has(t)||this.setLayers([...[...this.layers.values()].map(i=>({by:i.by,since:i.since})),{by:t,since:e}]),this.layers.get(t)}#s(t){for(let e of t.tiles.keys())this.#e(e)}sourceOf(t,e){return this.layers.get(t)?.sources.get(e)??null}noteSource(t,e,i){let s=this.layers.get(t);s&&(s.sources.set(e,i??null),i||(s.tiles.delete(e),this.#e(e)))}liveStrokes(){return[...this.strokes.values()].filter(t=>t.live)}async setTile(t,e,i){if((this.ensureLayer(t).sources.get(e)??null)===(i??null))return!1;let r=`${t}|${e}`;this.loads.set(r,i??null);let o=null;if(i){o=new Image,o.src=i;try{await o.decode()}catch{return!1}}if(this.loads.get(r)!==(i??null))return!1;this.loads.delete(r);let a=this.layers.get(t);if(!a)return!1;if(a.sources.set(e,i??null),!i)a.tiles.delete(e);else{let l=ze(this.grid,e),c=a.tiles.get(e);c||(c=ge(l.w,l.h),a.tiles.set(e,c));let h=se(c);h.clearRect(0,0,c.width,c.height),h.drawImage(o,0,0)}return this.#e(e),!0}async revert(t,e){let i=this.layers.get(t);i&&await Promise.all([...e].map(async s=>{let r=i.sources.get(s)??null;i.sources.delete(s),i.tiles.delete(s),this.#e(s),r&&await this.setTile(t,s,r)}))}setMask(t){let e=t?.length?t.map(i=>i.map(([s,r])=>[s*this.grid.w,r*this.grid.h])):null;JSON.stringify(e)!==JSON.stringify(this.mask)&&(this.mask=e,this.maskTiles.clear(),this.maskBoxes=e?.map(i=>{let s=i.map(o=>o[0]),r=i.map(o=>o[1]);return{poly:i,x0:Math.min(...s),y0:Math.min(...r),x1:Math.max(...s),y1:Math.max(...r)}})??null)}#r(t,e,i){if(!this.maskBoxes)return!0;for(let s of this.maskBoxes){if(t+i<s.x0||t-i>s.x1||e+i<s.y0||e-i>s.y1)continue;let r=s.poly,o=!1;for(let a=0,l=r.length-1;a<r.length;l=a++){let[c,h]=r[a],[u,d]=r[l];h>e!=d>e&&t<(u-c)*(e-h)/(d-h)+c&&(o=!o);let f=u-c,x=d-h,g=Math.max(0,Math.min(1,((t-c)*f+(e-h)*x)/(f*f+x*x||1)));if(Math.hypot(c+g*f-t,h+g*x-e)<=i)return!0}if(o)return!0}return!1}#a(t){if(!this.mask)return null;let e=this.maskTiles.get(t);if(e)return e;let i=ze(this.grid,t);e=ge(i.w,i.h);let s=se(e);s.fillStyle="#fff",s.translate(-i.x,-i.y);for(let r of this.mask)s.beginPath(),r.forEach(([o,a],l)=>l?s.lineTo(o,a):s.moveTo(o,a)),s.closePath(),s.fill();return this.maskTiles.set(t,e),e}begin({id:t,by:e,tool:i="chalk",colour:s="#f2ecdc",opacity:r=null,magic:o=null,everyone:a=!1,live:l=!1,wet:c=!1}){let h=oe[i]??oe.chalk;this.ensureLayer(e);let u={id:t,by:e,tool:i,def:h,colour:s,magic:h.magic?{rainbow:!1,glow:!1,sparkle:!1,...o??{}}:null,opacity:r??h.opacity,everyone:h.kind==="erase"&&a,live:l,wet:c,buffer:new Map,processed:new Map,stale:new Map,touched:new Set,dabs:[],carried:null};return this.strokes.set(t,u),u}paint(t,e){let i=this.strokes.get(t);if(!(!i||!e.length))for(let s of e)i.dabs.push(s),i.def.kind==="smudge"?this.#u(i,s):this.#h(i,s)}#l(t,e,i){let s=t.buffer.get(e);return s||(s=ge(i.w,i.h),t.buffer.set(e,s)),s}#c(t,e,i){t.touched.add(e);let s=t.stale.get(e);t.stale.set(e,s===void 0?i:yx(s,i)),t.wet||this.#e(e,i)}#h(t,e){let i=e.size/2;if(t.def.kind!=="erase"&&!this.#r(e.x,e.y,i+1))return;let s=Fi(this.grid,{x0:e.x-i-2,y0:e.y-i-2,x1:e.x+i+2,y1:e.y+i+2});for(let r of s){let o=ze(this.grid,r),a=se(this.#l(t,r,o)),l=Da(a,this.tips,t,e,{k:1,ox:-o.x,oy:-o.y},{clip:{w:o.w,h:o.h}});this.#c(t,r,l)}}#o(t,e){let i=t.buffer.get(e);if(!i)return null;let s=t.processed.get(e),r=t.stale.get(e);if(s&&r===void 0)return s;let o=ze(this.grid,e),a=r??null;s||(s=ge(o.w,o.h),t.processed.set(e,s),a=null),t.stale.delete(e);let l=xx(a,o.w,o.h);if(!l.w||!l.h)return s;let c=se(s);if(c.save(),c.beginPath(),c.rect(l.x,l.y,l.w,l.h),c.clip(),c.clearRect(l.x,l.y,l.w,l.h),c.drawImage(i,0,0),t.def.grain>0&&t.def.kind!=="erase"){let u=this.grain.pattern(c,Math.round(Math.max(0,Math.min(1,t.def.grain))*20)/20,o.x,o.y);u&&(c.globalCompositeOperation="destination-in",c.fillStyle=u,c.fillRect(l.x,l.y,l.w,l.h))}let h=t.def.kind==="erase"?null:this.#a(e);return h&&(c.globalCompositeOperation="destination-in",c.drawImage(h,0,0)),c.restore(),s}#u(t,e){let i=Math.max(4,Math.ceil(e.size)),s=Math.round(e.x-i/2),r=Math.round(e.y-i/2);t.here?.width!==i&&(t.here=ge(i,i),t.put=ge(i,i));let o=this.#f(t.here,s,r);if(!t.carried){t.carried=ge(i,i),se(t.carried).drawImage(o,0,0);return}if(t.carried.width!==i){let u=ge(i,i);se(u).drawImage(t.carried,0,0,i,i),t.carried=u}let a=t.put,l=se(a);l.globalCompositeOperation="copy",l.drawImage(t.carried,0,0),l.globalCompositeOperation="destination-in",l.drawImage(this.tips.shape("soft",0),0,0,i,i),l.globalCompositeOperation="source-over";let c=this.layers.get(t.by);for(let u of Fi(this.grid,{x0:s,y0:r,x1:s+i,y1:r+i})){let d=ze(this.grid,u),f=c.tiles.get(u);f||(f=ge(d.w,d.h),c.tiles.set(u,f));let x=se(f);x.globalAlpha=Math.max(.05,Math.min(1,t.def.flow*e.flow*1.4)),x.drawImage(a,s-d.x,r-d.y),x.globalAlpha=1,t.touched.add(u),this.#e(u,{x0:s-d.x-1,y0:r-d.y-1,x1:s-d.x+i+1,y1:r-d.y+i+1})}let h=se(t.carried);h.globalAlpha=.28,h.drawImage(o,0,0),h.globalAlpha=1}#d(t,e,i,s){return Fi(this.grid,{x0:t,y0:e,x1:t+i,y1:e+s}).some(o=>this.dirty.has(o))&&this.flush(),this.#f(ge(i,s),t,e)}#f(t,e,i){let s=se(t);s.clearRect(0,0,t.width,t.height);for(let r of Fi(this.grid,{x0:e,y0:i,x1:e+t.width,y1:i+t.height})){let o=this.composite.get(r);if(!o)continue;let a=ze(this.grid,r);s.drawImage(o,a.x-e,a.y-i)}return t}commit(t){let e=this.strokes.get(t);if(!e)return new Map;this.strokes.delete(t);let i=new Map,s=(r,o,a)=>{i.has(r)||i.set(r,new Map),i.get(r).set(o,a)};if(e.def.kind==="smudge"){let r=this.layers.get(e.by);for(let o of e.touched)s(e.by,o,r?.tiles.get(o)??null)}else if(e.def.kind==="erase"){let r=e.everyone?[...this.layers.values()]:[this.layers.get(e.by)].filter(Boolean);for(let o of e.touched){let a=this.#o(e,o);for(let l of r){let c=l.tiles.get(o);if(!c||!a)continue;let h=se(c);h.globalCompositeOperation="destination-out",h.globalAlpha=e.opacity,h.drawImage(a,0,0),h.globalCompositeOperation="source-over",h.globalAlpha=1,s(l.by,o,c)}}}else{let r=this.layers.get(e.by),o=new Set(e.touched);if(e.magic?.glow)for(let a of this.#p(e,r))o.add(a);for(let a of e.touched){let l=this.#o(e,a);if(!l)continue;let c=ze(this.grid,a),h=r.tiles.get(a);h||(h=ge(c.w,c.h),r.tiles.set(a,h));let u=se(h);u.globalAlpha=e.opacity,u.drawImage(l,0,0),u.globalAlpha=1}if(e.magic?.sparkle)for(let a of this.#m(e,r))o.add(a);for(let a of o)s(e.by,a,r.tiles.get(a)??null);i.painted=!0}for(let r of e.touched)this.#e(r);for(let r of i.values())for(let o of r.keys())this.#e(o);return i}drop(t){let e=this.strokes.get(t);if(e){this.strokes.delete(t);for(let i of e.touched)this.#e(i)}}#p(t,e){let i=ka(t.dabs);if(!i)return[];let s=Math.max(6,Math.min(40,(t.dabs[0]?.size??8)*1.6)),r=Math.floor(i.x0-s*2),o=Math.floor(i.y0-s*2),a=Math.ceil(i.x1-i.x0+s*4),l=Math.ceil(i.y1-i.y0+s*4),c=Dw,h=Math.max(1,Math.ceil(a/c)),u=Math.max(1,Math.ceil(l/c)),d=ge(h,u),f=se(d);f.imageSmoothingQuality="medium";for(let m of t.touched){let M=this.#o(t,m);if(!M)continue;let E=ze(this.grid,m);f.drawImage(M,(E.x-r)/c,(E.y-o)/c,E.w/c,E.h/c)}let x=ge(h,u),g=se(x);g.filter=`blur(${s/c}px)`,g.drawImage(d,0,0),g.filter="none";let p=Fi(this.grid,{x0:r,y0:o,x1:r+a,y1:o+l});for(let m of p){let M=ze(this.grid,m),E=e.tiles.get(m);E||(E=ge(M.w,M.h),e.tiles.set(m,E));let _=se(E);_.globalAlpha=.85,_.imageSmoothingQuality="medium",_.drawImage(x,r-M.x,o-M.y,h*c,u*c),_.globalAlpha=1}return p}#m(t,e){let i=Bs(t.dabs[0]?.seed??5),s=new Set,r=20+i()*40;for(let o of t.dabs){if(o.dist<r)continue;r=o.dist+45+i()*70;let a=Math.max(6,o.size*(1.2+i()*1.2)),l=o.x+(i()-.5)*o.size*1.5,c=o.y+(i()-.5)*o.size*1.5,h=i()*.6;for(let u of Fi(this.grid,{x0:l-a,y0:c-a,x1:l+a,y1:c+a})){let d=ze(this.grid,u),f=e.tiles.get(u);f||(f=ge(d.w,d.h),e.tiles.set(u,f));let x=se(f);x.save(),x.translate(l-d.x,c-d.y),x.rotate(h),x.fillStyle="rgba(255,252,240,0.95)",x.beginPath();for(let g=0;g<8;g++){let p=g/8*Math.PI*2,m=g%2?a*.16:a;x.lineTo(Math.cos(p)*m,Math.sin(p)*m)}x.closePath(),x.fill(),x.restore(),s.add(u)}}return s}fill({x:t,y:e,by:i,colour:s,opacity:r=oe.fill.opacity,grain:o=oe.fill.grain}){let{w:a,h:l}=this.grid,c=Math.floor(t),h=Math.floor(e);if(c<0||h<0||c>=a||h>=l)return{ok:!1,reason:"outside",changed:new Map};this.flush();let u=this.#d(0,0,a,l),d=se(u).getImageData(0,0,a,l).data,f=at=>d[at*4+3]>=Iw;if(f(h*a+c))return{ok:!1,reason:"on-paint",changed:new Map};let x=new Uint8Array(a*l),g=[[c,h]],p=0,m=c,M=c,E=h,_=h,T=a*l*kw;for(;g.length;){let[at,rt]=g.pop(),zt=at;for(;zt>0&&!f(rt*a+zt-1)&&!x[rt*a+zt-1];)zt--;let kt=at;for(;kt<a-1&&!f(rt*a+kt+1)&&!x[rt*a+kt+1];)kt++;for(let Lt=zt;Lt<=kt;Lt++){let X=rt*a+Lt;x[X]||f(X)||(x[X]=1,p++)}if(p>T)return{ok:!1,reason:"open",changed:new Map};m=Math.min(m,zt),M=Math.max(M,kt),E=Math.min(E,rt),_=Math.max(_,rt);for(let Lt of[rt-1,rt+1]){if(Lt<0||Lt>=l)continue;let X=!1;for(let Q=zt;Q<=kt;Q++){let yt=Lt*a+Q,Ut=!x[yt]&&!f(yt);Ut&&!X?(g.push([Q,Lt]),X=!0):Ut||(X=!1)}}}let w=2;m=Math.max(0,m-w),E=Math.max(0,E-w),M=Math.min(a-1,M+w),_=Math.min(l-1,_+w);let A=M-m+1,v=_-E+1,b=new Uint8Array(A*v);for(let at=0;at<v;at++){let rt=(E+at)*a;for(let zt=0;zt<A;zt++){let kt=m+zt;for(let Lt=-w;Lt<=w;Lt++){let X=kt+Lt;if(X>=0&&X<a&&x[rt+X]){b[at*A+zt]=1;break}}}}let R=parseInt(s.slice(1),16),[P,k,B]=[R>>16&255,R>>8&255,R&255],I=ge(A,v),U=se(I),V=U.createImageData(A,v),Z=Math.round(255*r);for(let at=0;at<v;at++)for(let rt=0;rt<A;rt++){let zt=0;for(let Lt=-w;Lt<=w;Lt++){let X=at+Lt;if(X>=0&&X<v&&b[X*A+rt]){zt=1;break}}if(!zt)continue;let kt=(at*A+rt)*4;V.data[kt]=P,V.data[kt+1]=k,V.data[kt+2]=B,V.data[kt+3]=Z}if(U.putImageData(V,0,0),o>0){let at=this.grain.pattern(U,Math.round(Math.max(0,Math.min(1,o))*20)/20,m,E);at&&(U.globalCompositeOperation="destination-in",U.fillStyle=at,U.fillRect(0,0,A,v),U.globalCompositeOperation="source-over")}let it=this.ensureLayer(i),$=new Map,J=ge(this.grid.tile,this.grid.tile),et=se(J);for(let at of Fi(this.grid,{x0:m,y0:E,x1:M,y1:_})){let rt=ze(this.grid,at);et.clearRect(0,0,J.width,J.height),et.drawImage(I,m-rt.x,E-rt.y);let zt=this.#a(at);zt&&(et.globalCompositeOperation="destination-in",et.drawImage(zt,0,0),et.globalCompositeOperation="source-over");let kt=it.tiles.get(at);kt||(kt=ge(rt.w,rt.h),it.tiles.set(at,kt));let Lt=se(kt);Lt.globalCompositeOperation="destination-over",Lt.drawImage(J,0,0,rt.w,rt.h,0,0,rt.w,rt.h),Lt.globalCompositeOperation="source-over",$.set(at,kt),this.#e(at)}return{ok:!0,changed:$,area:p}}pick(t,e){this.flush();let i=Fi(this.grid,{x0:t,y0:e,x1:t,y1:e})[0],s=i?this.composite.get(i):null;if(!s)return null;let r=ze(this.grid,i),o=se(s).getImageData(Math.floor(t-r.x),Math.floor(e-r.y),1,1).data;return o[3]<60?null:`#${[o[0],o[1],o[2]].map(a=>a.toString(16).padStart(2,"0")).join("")}`}whoAt(t,e){this.flush();let i=Fi(this.grid,{x0:t,y0:e,x1:t,y1:e})[0];if(!i)return null;let s=ze(this.grid,i);for(let r of[...this.order].reverse()){let o=this.layers.get(r)?.tiles.get(i);if(!o)continue;if(se(o).getImageData(Math.floor(t-s.x),Math.floor(e-s.y),1,1).data[3]>=60)return r}return null}#x(){return this.scratch??=ge(this.grid.tile,this.grid.tile),this.scratch}#y(t,e=null){let i=ze(this.grid,t),s=[...this.strokes.values()].filter(l=>l.touched.has(t)&&!l.wet);if(!s.length&&!this.order.some(l=>this.layers.get(l)?.tiles.has(t))){this.composite.delete(t);return}let r=this.composite.get(t);r||(r=ge(i.w,i.h),this.composite.set(t,r),e=null);let o=xx(e,i.w,i.h);if(!o.w||!o.h)return;let a=se(r);a.save(),a.beginPath(),a.rect(o.x,o.y,o.w,o.h),a.clip(),a.clearRect(o.x,o.y,o.w,o.h);for(let l of this.order){let h=this.layers.get(l).tiles.get(t),u=s.filter(d=>d.def.kind==="erase"&&(d.by===l||d.everyone));if(h)if(u.length){let d=this.#x(),f=se(d);f.save(),f.beginPath(),f.rect(o.x,o.y,o.w,o.h),f.clip(),f.clearRect(o.x,o.y,o.w,o.h),f.drawImage(h,0,0),f.globalCompositeOperation="destination-out";for(let x of u){let g=this.#o(x,t);g&&(f.globalAlpha=x.opacity,f.drawImage(g,0,0))}f.restore(),a.drawImage(d,o.x,o.y,o.w,o.h,o.x,o.y,o.w,o.h)}else a.drawImage(h,0,0);for(let d of s){if(d.by!==l||d.def.kind==="erase"||d.def.kind==="smudge")continue;let f=this.#o(d,t);f&&(a.globalAlpha=d.opacity*(d.live?.9:1),a.drawImage(f,0,0),a.globalAlpha=1)}}a.restore()}keys(){return this.flush(),[...this.composite.keys()]}clear(){let t=new Set([...this.composite.keys()]);this.layers.clear(),this.order=[],this.composite.clear(),this.strokes.clear(),this.dirty.clear(),this.onChange(t)}},vx=new WeakMap;function Zh(n,t,e){if(!n||!(t>=0&&t<=1&&e>=0&&e<=1))return null;let i=vx.get(n);if(!i){let s=n.naturalWidth||n.width,r=n.naturalHeight||n.height;if(!s||!r)return null;let o=Math.min(1024,s),a=Math.max(1,Math.round(o*r/s)),l=ge(o,a),c=se(l);c.drawImage(n,0,0,o,a),i={x:c,w:o,h:a},vx.set(n,i)}try{let s=i.x.getImageData(Math.min(i.w-1,Math.floor(t*i.w)),Math.min(i.h-1,Math.floor(e*i.h)),1,1).data;return`#${[s[0],s[1],s[2]].map(r=>r.toString(16).padStart(2,"0")).join("")}`}catch{return null}}function Nw(n){let t=se(n).getImageData(0,0,n.width,n.height).data;for(let e=3;e<t.length;e+=4)if(t[e]>3)return!0;return!1}var Hf=.85,Mx=64;function bx(n,t=64){let e=255/(t-1);for(let i=3;i<n.length;i+=4)n[i]=Math.round(Math.round(n[i]/e)*e);return n}var Ow=`
const roundAlpha = ${bx.toString()};
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
};`,us,Fw=0,ao=new Map;function Uw(){if(us!==void 0)return us;try{if(typeof Worker>"u"||typeof OffscreenCanvas>"u"||typeof createImageBitmap>"u")throw new Error("no workers here");us=new Worker(URL.createObjectURL(new Blob([Ow],{type:"text/javascript"}))),us.onmessage=({data:n})=>{let t=ao.get(n.id);t&&(ao.delete(n.id),n.error?t.fail(new Error(n.error)):t.done(n.url))},us.onerror=()=>{us=!1;for(let n of ao.values())n.fail(new Error("the encoder stopped"));ao.clear()}}catch{us=!1}return us}function Gf(n,t=!1,e=null){if(!n)return Promise.resolve(null);let i=Uw();if(!i)return _x(n,t,e);let s=++Fw,r=createImageBitmap(n);return new Promise(o=>{ao.set(s,{done:o,fail:()=>o(Wh(n))}),Promise.all([r,e]).then(([a])=>i.postMessage({id:s,bitmap:a,sure:t,quality:Hf,levels:Mx},[a])).catch(()=>{ao.delete(s),o(_x(n,t,null))})})}function Bw(n){let t=ge(n.width,n.height),e=se(t);e.drawImage(n,0,0);let i=e.getImageData(0,0,t.width,t.height);return bx(i.data,Mx),e.putImageData(i,0,0),t}function _x(n,t,e=null){if(!t&&!Nw(n))return Promise.resolve(null);let i=Bw(n);return typeof i.toBlob!="function"||typeof FileReader>"u"?Promise.resolve(Wh(i)):Promise.resolve(e).then(()=>new Promise(s=>{i.toBlob(r=>{if(!r){s(Wh(i));return}let o=new FileReader;o.onload=()=>s(o.result),o.onerror=()=>s(Wh(i)),o.readAsDataURL(r)},"image/webp",Hf)}))}function Wh(n){let t=n.toDataURL("image/webp",Hf);return t.startsWith("data:image/webp")?t:n.toDataURL("image/png")}var Sx=48;function qh(n,t=()=>document.createElement("canvas")){let e=n?.naturalWidth||n?.width,i=n?.naturalHeight||n?.height;if(!e||!i)return null;let s=Sx,r=Math.max(2,Math.round(Sx*i/e));try{let o=t();o.width=s,o.height=r;let a=o.getContext("2d",{willReadFrequently:!0});return a.imageSmoothingQuality="high",a.drawImage(n,0,0,s,r),X0(a.getImageData(0,0,s,r).data,s,r)}catch{return null}}var mn=Object.freeze({nameChars:160,textChars:360,ellipsis:"\u2026",step:.06}),Ln=.01,wx=typeof Intl<"u"&&typeof Intl.Segmenter=="function"?new Intl.Segmenter(void 0,{granularity:"grapheme"}):null,Hs=n=>wx?Array.from(wx.segment(n),t=>t.segment):Array.from(n);function Yh(n,t){let e=Hs(n);return e.length>t?`${e.slice(0,Math.max(0,t-1)).join("").trimEnd()}${mn.ellipsis}`:n}function Dn(n,t=1/0){let e=String(n??"");try{e=e.normalize("NFC")}catch{}return e=e.replace(/<br\s*\/?>/gi,`
`).replace(/\\n/g,`
`),e=e.replace(/\r\n?|[\u{b}\u{c}\u{85}\u{2028}\u{2029}]/gu,`
`),e=e.replace(/[\u{0}-\u{8}\u{e}-\u{1f}\u{7f}-\u{9f}\u{200b}\u{feff}\u{2060}]/gu,""),e=e.replace(/[\t\u{a0}\u{1680}\u{2000}-\u{200a}\u{202f}\u{205f}\u{3000}]/gu," "),e=e.split(`
`).map(i=>i.replace(/ {2,}/g," ").trim()).filter(Boolean).join(`
`),Yh(e,t)}function jh(n){let t=Dn(n?.name??n?.id??""),e=Dn(n?.title??"",mn.textChars);if(e)return{name:Yh(t,mn.nameChars),text:e};let[i="",...s]=t.split(`
`);return{name:Yh(i,mn.nameChars),text:Yh(s.join(`
`),mn.textChars)}}function Rx(n,{long:t=18}={}){let{name:e,text:i}=jh(n);return!e&&!i||!i&&Hs(e).length<=t?null:{name:e,text:i}}var Xf=n=>JSON.stringify([n?.name??null,n?.title??null,cs(n?.badges)]),zw=/[\u{1100}-\u{11ff}\u{2e80}-\u{303e}\u{3041}-\u{33ff}\u{3400}-\u{4dbf}\u{4e00}-\u{9fff}\u{a960}-\u{a97f}\u{ac00}-\u{d7af}\u{f900}-\u{faff}\u{fe30}-\u{fe4f}\u{ff00}-\u{ffef}\u{20000}-\u{3134f}]/u,Hw=new Set([..."\u3001\u3002\uFF0C\uFF0E\u30FB\uFF1A\uFF1B\uFF01\uFF1F\uFF09\uFF3D\uFF5D\u3015\u3009\u300B\u300D\u300F\u3011\u3019\u3017\u301F\u2019\u201D\u203C\u2047\u2048\u2049\u309D\u309E\u30FD\u30FE\u3005\u30FC\u301C\uFF5E\u2026\u2025\u3041\u3043\u3045\u3047\u3049\u3063\u3083\u3085\u3087\u308E\u3095\u3096\u30A1\u30A3\u30A5\u30A7\u30A9\u30C3\u30E3\u30E5\u30E7\u30EE\u30F5\u30F6"]),Gw=new Set([..."\uFF08\uFF3B\uFF5B\u3014\u3008\u300A\u300C\u300E\u3010\u3018\u3016\u301D\u2018\u201C"]),Vw=new Set(["-","\u2010","\u2011","\u2013","\u2014","/"]),Tx=(()=>{try{return typeof Intl<"u"&&typeof Intl.Segmenter=="function"?new Intl.Segmenter("ja",{granularity:"word"}):null}catch{return null}})(),Wf=n=>{let t=Hs(n);return{text:n,kind:"cjk",noBefore:Hw.has(t[0]),noAfter:Gw.has(t.at(-1))}};function Ww(n){return Tx?Array.from(Tx.segment(n),t=>Wf(t.segment)):Hs(n).map(Wf)}function Xw(n){let t=Hs(n),e=[],i="",s="",r=(o=!1)=>{i&&(e.push({text:i,kind:"word",hyphen:o}),i=""),s&&(e.push(...Ww(s)),s="")};for(let o=0;o<t.length;o++){let a=t[o];if(/^\s+$/u.test(a))r(),e.at(-1)?.kind!=="space"&&e.push({text:" ",kind:"space"});else if(zw.test(a))i&&r(),s+=a;else{s&&r(),i+=a;let l=t[o+1];Vw.has(a)&&i.length>1&&l!==void 0&&/[\p{L}\p{N}]/u.test(l)&&r(!0)}}return r(),e}function $f(n,t){return n.kind==="space"||t.kind==="space"?!0:n.noAfter||t.noBefore?!1:n.kind==="cjk"||t.kind==="cjk"||n.hyphen===!0}function $w(n,t,e){let i=[],s=0;for(;s<n.length;){let r=s;for(;r+1<n.length&&!$f(n[r],n[r+1]);)r++;let o=n.slice(s,r+1),a=o.reduce((l,c)=>l+(c.kind==="space"?0:t(c.text)),0)>e+Ln;for(let l of o){let c=l.kind==="space"?[]:Hs(l.text);if(a&&c.length>1)for(let h of c)i.push(l.kind==="word"?{text:h,kind:"cjk"}:Wf(h));else i.push(l)}s=r+1}return i}function Ex(n,t,e){let i=[],s=n.length,r=0;for(;r<s;){for(;r<s&&n[r].kind==="space";)r++;if(r>=s)break;let o=r,a=0,l=-1,c=r;for(;c<s&&!(n[c].kind!=="space"&&c>o&&a+t[c]>e+Ln);c++)a+=t[c],c+1<s&&$f(n[c],n[c+1])&&(l=c+1);let h=c>=s?s:l>o?l:c;i.push([o,h]),r=h}return i}var Zw=(n,t,[e,i])=>{let s=i;for(;s>e&&n[s-1].kind==="space";)s--;let r=0;for(let o=e;o<s;o++)r+=t[o];return r};function qw(n,t,e){let i=Ex(n,t,e);if(i.length<2)return i;let s=0;for(let a=0;a<n.length;){let l=a,c=n[a].kind==="space"?0:t[a];for(;l+1<n.length&&!$f(n[l],n[l+1]);)l++,c+=t[l];s=Math.max(s,c),a=l+1}let r=e,o=i;for(let a=0;a<14&&r-s>.5;a++){let l=(s+r)/2,c=Ex(n,t,l);c.length<=i.length&&c.every(h=>Zw(n,t,h)<=l+Ln)?(o=c,r=l):s=l}return o}function Ax(n,t,e){let i=[];return Dn(n).split(`
`).filter(Boolean).forEach((s,r)=>{let o=$w(Xw(s),t,e);if(!o.length)return;let a=o.map(l=>t(l.text));for(let[l,c]of qw(o,a,e)){let h=c;for(;h>l&&o[h-1].kind==="space";)h--;let u=o.slice(l,h).map(d=>d.text).join("");i.push({text:u,width:t(u),atoms:o,from:l,paragraph:r})}}),i}function Yw(n,t,e){if(t(n)<=e+Ln)return n;let i=Hs(n),s=i.length;for(;s>0&&t(i.slice(0,s).join("").trimEnd()+mn.ellipsis)>e+Ln;)s--;let r=i.slice(0,s).join(""),o=r.lastIndexOf(" ");return o>r.length*.45&&/\S$/.test(r)&&i[s]!==void 0&&i[s]!==" "&&(r=r.slice(0,o)),r.trimEnd().replace(/[,;:\-\u{2010}\u{2013}\u{2014}/\u{3001}\u{ff0c}]+$/u,"")+mn.ellipsis}function Vf(n,{measureAt:t,width:e,sizes:i,maxLines:s,lineHeight:r=1.15}){let o=(g,p,m)=>({size:g,lineHeight:r,lines:p.map(({text:M,width:E})=>({text:M,width:E})),height:p.length*g*r,truncated:m});if(!Dn(n))return o(i.at(-1),[],!1);for(let g of i){let p=Ax(n,t(g),e);if(p.length<=s&&p.every(m=>m.width<=e+.5))return o(g,p,!1)}let a=i.at(-1),l=t(a),c=Ax(n,l,e),h=c.slice(0,s),u=h.at(-1),d=u.atoms.slice(u.from).map(g=>g.text).join("").trim(),f=c.length>s,x=f&&l(d+mn.ellipsis)<=e+Ln?d+mn.ellipsis:Yw(d,l,e);return h[h.length-1]={text:x,width:l(x)},o(a,h,f||x!==d)}function Cx(n,t,e=mn.step){let i=[];for(let s=n;s>t;s=Math.min(s-1,Math.round(s*(1-e))))i.push(s);return i.push(t),[...new Set(i)]}function Px({name:n,text:t},e){let{width:i,maxHeight:s,gap:r=12}=e,o={name:Dn(n),text:Dn(t)},a=Cx(e.name.max,e.name.min),l=Cx(e.text.max,e.text.min),c=e.name.comfort??.7,h=(m,M=e.name.maxLines)=>Vf(o.name,{measureAt:e.measureName,width:i,sizes:m,maxLines:M,lineHeight:e.name.lineHeight}),u=m=>{for(let _=1;_<=e.text.maxLines;_++)for(let T of l){let w=Vf(o.text,{measureAt:e.measureText,width:i,sizes:[T],maxLines:_,lineHeight:e.text.lineHeight});if(!w.truncated&&w.height<=m+Ln)return w}let M=l.at(-1),E=Math.min(e.text.maxLines,Math.floor((m+Ln)/(M*e.text.lineHeight)));return E<1?null:Vf(o.text,{measureAt:e.measureText,width:i,sizes:[M],maxLines:E,lineHeight:e.text.lineHeight})},d=(m,M)=>({name:m,text:M,gap:M?r:0,height:m.height+(M?r+M.height:0),truncated:{name:m.truncated,text:M?.truncated??!1},full:o}),f=e.name.max*(e.name.floor??.62),x=null;t:for(let m=1;m<=e.name.maxLines;m++){let M=m<e.name.maxLines?a.filter(E=>E>=e.name.max*c):a;for(let E of M){if(x&&E<f)break t;let _=h([E],m);if(_.truncated||_.height>s+Ln)continue;if(!o.text)return d(_,null);let T=u(s-_.height-r);if(T){if(!T.truncated)return d(_,T);x??=d(_,T)}}}if(x)return x;let g=h([e.name.min]),p=o.text?u(s-g.height-r):null;return d(g,p)}var Zf=Object.freeze({gap:14,name:Object.freeze({family:"sans-serif",weight:800,max:58,min:32,maxLines:2,lineHeight:1.06,tracking:.03,upper:!0}),text:Object.freeze({family:"sans-serif",weight:700,max:34,min:24,maxLines:3,lineHeight:1.18,tracking:0,upper:!1})}),Ix=(n,t)=>`${n.weight} ${t}px ${n.family}`;function Kh({canvas:n=()=>document.createElement("canvas")}={}){let t=null,e=()=>t??=n().getContext("2d"),i=r=>o=>{let a=e();return a.font=Ix(r,o),"letterSpacing"in a&&(a.letterSpacing=`${(r.tracking??0)*o}px`),l=>{let c=a.measureText(l);return Number.isFinite(c?.width)?c.width:[...l].length*o*.55}},s=(r,o)=>({...r,...o??{}});return{textOf:jh,fit(r,o={}){let a=s(Zf.name,o.name),l=s(Zf.text,o.text),{name:c,text:h}=jh(r),u=Px({name:a.upper?c.toLocaleUpperCase("en"):c,text:l.upper?h.toLocaleUpperCase("en"):h},{width:o.width,maxHeight:o.maxHeight,gap:o.gap??Zf.gap,name:a,text:l,measureName:i(a),measureText:i(l)});return u.full={name:Dn(c),text:Dn(h)},u.style={name:a,text:l},u},draw(r,o,a,l={}){let c={ink:"#231c10",textInk:"rgba(35,28,16,0.86)",rule:"rgba(35,28,16,0.38)",embolden:.04,emboss:null,...l},{x:h,y:u,w:d,h:f}=a,x=u+(f-o.height)/2;r.save(),r.textAlign="center",r.textBaseline="middle",r.lineJoin="round";let g=(p,m,M,E)=>{let _=p.size;r.font=Ix(m,_);let T=(m.tracking??0)*_;"letterSpacing"in r&&(r.letterSpacing=`${T}px`),p.lines.forEach((w,A)=>{let v=x+(A+.5)*_*p.lineHeight+_*.04,b=h+d/2+(T?T/2:0);c.emboss&&(r.fillStyle=c.emboss,r.fillText(w.text,b,v+Math.max(1,_*.035))),r.fillStyle=M,E>0&&(r.strokeStyle=M,r.lineWidth=_*E,r.strokeText(w.text,b,v)),r.fillText(w.text,b,v)}),x+=p.height};if(g(o.name,o.style.name,c.ink,c.embolden),o.text){if(c.rule){r.fillStyle=c.rule;let p=Math.min(d*.32,150);r.fillRect(h+(d-p)/2,x+o.gap/2-1,p,2)}x+=o.gap,g(o.text,o.style.text,c.textInk,0)}"letterSpacing"in r&&(r.letterSpacing="0px"),r.restore()}}}var jw=4e3,Jh=class{constructor({images:t=new Us,onContextLost:e=null}={}){this.images=t,this.onContextLost=e,this.name="three",this.capabilities={lights:!0,shadows:!0,post:!0,particles:!0,marks:!0,zoneOutlines:!0,chalk:!0,camera:!1,capture:!0,footlights:!0},this.views=new Map,this.adding=new Set,this.tier="high",this.needsRebuild=!1,this.zoneSetting="off",this.calm=!1,this.disposed=!1,this.ready=!1}mount(t,{quality:e="high",pixelRatio:i=1,width:s=1280,height:r=720}={}){this.tier=e,this.settings=L0(e),this.element=t,this.tracker=new _h,this.canvas=document.createElement("canvas"),this.canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;",t.append(this.canvas),this.renderer=new dh({canvas:this.canvas,antialias:!this.settings.post,powerPreference:"high-performance"}),this.renderer.info.autoReset=!1,this.renderer.shadowMap.enabled=this.settings.shadows,this.renderer.shadowMap.type=ks,this.renderer.outputColorSpace=Ae,this.renderer.toneMapping=Ci,this.scene=new Ko,this.camera=new Ye,this.softDot=this.tracker.add(z0()),this.canvas.addEventListener("webglcontextlost",o=>{o.preventDefault(),!this.disposed&&(this.contextLost=!0,this.onContextLost?.())}),this.#t(s,r,i)}#t(t,e,i){this.width=t,this.height=e,this.ratio=Math.min(i||1,this.settings.pixelRatioCap),this.view=To(t,e),this.renderer.setPixelRatio(this.ratio),this.renderer.setSize(t,e,!1),this.rig&&Mh(this.camera,this.rig,this.view),this.post?.setSize(Math.round(t*this.ratio),Math.round(e*this.ratio))}resize(t,e,i=1){this.disposed||this.#t(t,e,i)}setView(t){this.disposed||!t||(this.view=t,this.rig&&Mh(this.camera,this.rig,this.view))}setQuality(t){t!==this.tier&&(this.tier=t,this.needsRebuild=!0)}setCalm(t){this.calm=!!t,this.fx&&(this.fx.calm=this.calm),this.post?.setCalm(this.calm)}setZoneSetting(t){this.zoneSetting=t}setFootlights(t){this.world?.setFootlights(t)}async load(t,e,i=[]){this.description=t,this.skin=e,this.rig=er(t.painting,t.rig),this.fx=null,await Promise.all((e.fonts??[]).map(r=>document.fonts?.load(r).catch(()=>null)));let s=await this.images.loadImage(t.painting.src);if(!s)throw new Error(`the painting "${t.painting.src}" could not be loaded`);this.disposed||(this.paintingImage=s,this.grade=qh(s),Mh(this.camera,this.rig,this.view),this.#e(s),this.world=await new Sh({scene:t,rig:this.rig,tracker:this.tracker,softDot:this.softDot,settings:this.settings}).build(s),this.scene.add(this.world.group),this.zones=new Rh({scene:this.scene,rig:this.rig,zones:t.zones,tracker:this.tracker}),this.boardLabels=new Ph({scene:this.scene,rig:this.rig,zones:t.zones,tracker:this.tracker,cardHeight:e.size.h*t.cardScale}),this.marks=new Ih({scene:this.scene,tracker:this.tracker,softDot:this.softDot}),this.fx=new Ch({scene:this.scene,rig:this.rig,tracker:this.tracker,softDot:this.softDot,settings:this.settings,cardHeight:e.size.h*t.cardScale}),this.fx.calm=this.calm,this.chalkTiles=new Uh({scene:this.scene,rig:this.rig}),this.chalkBox=new Bh({scene:this.scene,rig:this.rig,at:t.chalk.box??no,tracker:this.tracker}),this.chalkBox.setVisible(!1),await Promise.all(i.map(r=>this.addCard(r))),this.settings.post&&(this.post=new Nh(this.renderer,this.scene,this.camera,{width:Math.round(this.width*this.ratio),height:Math.round(this.height*this.ratio),samples:this.settings.msaa}),this.post.setCalm(this.calm)),await this.#i(this.scene),this.world.setFootlights(t.footlights),this.ready=!0)}async#i(t){let e=0;try{let i=this.renderer.getRenderTarget();this.renderer.setRenderTarget(this.post?.target??null);let s=null;try{this.renderer.compileAsync?s=this.renderer.compileAsync(t,this.camera,this.scene):this.renderer.compile(t,this.camera,this.scene)}finally{this.renderer.setRenderTarget(i)}await Promise.race([s,new Promise(r=>{e=setTimeout(r,jw)})])}catch(i){console.warn("stagecraft | a shader could not be built ahead; it will be at the first draw",i)}finally{clearTimeout(e)}}#e(t){let e=new Zr(this.renderer),i=new Ve(t);i.mapping=Hr,i.colorSpace=Ae,i.needsUpdate=!0;let s=e.fromEquirectangular(i);this.tracker.add(s),this.scene.environment=s.texture,this.scene.environmentIntensity=.6,i.dispose(),e.dispose()}async addCard(t){if(!(this.views.has(t.id)||this.adding.has(t.id)||this.disposed)){this.adding.add(t.id);try{this.titleBlock??=Kh();let e={tracker:this.tracker,images:this.images,titleBlock:this.titleBlock,softDot:this.softDot,scene:this.scene,emoteTexture:s=>this.#n(s),lightAt:(s,r)=>this.#r(s,r)},i=new Ah(t,this.skin,e,this.description.cardScale*(t.size??1));if(await i.build(),this.disposed){i.dispose();return}if(this.ready&&await this.#i(i.root),this.disposed){i.dispose();return}this.views.set(t.id,i),this.scene.add(i.root,i.blob),t.emote?.id&&await i.setEmote(t.emote.id)}finally{this.adding.delete(t.id)}}}removeCard(t){let e=this.views.get(t);e&&(e.dispose(),this.views.delete(t))}async refreshCard(t){let e=this.views.get(t.id);!e||this.disposed||await e.refresh(t)}#n(t){if(this.emoteCache??=new Map,!this.emoteCache.has(t)){let e=gi[t]?.svg;this.emoteCache.set(t,e?new Promise(i=>{let s=new Image;s.onload=()=>{let r=document.createElement("canvas");r.width=r.height=256,r.getContext("2d").drawImage(s,0,0,256,256),i(this.tracker.add(fi(r)))},s.onerror=()=>i(null),s.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(e.replace("<svg ",'<svg width="256" height="256" '))}`}):Promise.resolve(null))}return this.emoteCache.get(t)}draw(t){if(!this.ready||this.disposed||this.contextLost)return;let e=t.t;this.world.update(e);for(let i of t.cards)this.views.get(i.id)?.pose(i);this.zones.update(t.zones,this.zoneSetting,e,t.board??null),this.boardLabels.update(t.board??null),this.marks.update(t.marks,this.views,e),this.fx.update(t.bonks,e),this.renderer.info.reset(),this.post?this.post.render(e):this.renderer.render(this.scene,this.camera)}#s(t,e){return this.raycaster??=new fa,this.ndc??=new bt,this.ndc.set(t/this.width*2-1,-(e/this.height*2-1)),this.raycaster.setFromCamera(this.ndc,this.camera),this.raycaster}pick(t,e){if(!this.ready)return null;let i=[];for(let o of this.views.values())i.push(...o.pickables);if(this.chalkBox?.group.visible&&i.push(...this.chalkBox.pickables),!i.length)return null;let s=this.#s(t,e).intersectObjects(i,!1)[0];if(!s)return null;let r={x:s.point.x,y:s.point.y,z:s.point.z};return s.object.userData.chalk?{kind:"chalk",colour:s.object.userData.chalk,point:r}:s.object.userData.magic?{kind:"magic",point:r}:s.object.userData.eraser?{kind:"eraser",point:r}:{kind:"card",id:s.object.userData.cardId,point:r}}paintingAt(t,e){this.backPlane??=new xi(new D(0,0,1),Pi),this.hit??=new D;let i=this.hit;if(!this.#s(t,e).ray.intersectPlane(this.backPlane,i))return null;let{cx:s,cy:r,f:o,floorY:a}=this.rig.cam,l=o/(o+Pi),c=s+i.x*l,h=r+(a-r-i.y)*l,[u,d]=this.rig.fractionOfScreen(c,h);return u>=0&&u<=1&&d>=0&&d<=1?{x:u,y:d}:null}floorAt(t,e,i=0){return this.floorPlane??=new xi(new D(0,1,0),0),this.floorPlane.constant=-i,this.hit??=new D,this.#s(t,e).ray.intersectPlane(this.floorPlane,this.hit)?{x:this.hit.x,z:this.hit.z}:null}project({X:t,Y:e,Z:i}){let s=this.rig.screenOf(t,e,i);return{x:(s.x-this.view.ox)*this.view.s,y:(s.y-this.view.oy)*this.view.s,k:s.k}}setChalkTiles(t,e,i=!1){this.chalkTiles?.update(t,e,i)}setChalkHidden(t){this.chalkTiles?.setHidden(t)}setChalkBox(t){this.chalkBox?.setVisible(t)}setChalkBoxAt(t){this.rig&&this.chalkBox?.moveTo(this.rig,t)}wetMap(t){return this.rig&&this.view?dx({size:this.rig.size,map:this.rig.map,view:this.view},t):null}paintingColour(t,e){return Zh(this.paintingImage,t,e)}#r(t,e){if(!this.grade||!this.rig)return null;let[i,s]=this.rig.fractionOf(t,e);return Th(this.grade,i,s,{strength:this.description.grade??1})}async capture(){return this.post?this.post.render(0):this.renderer.render(this.scene,this.camera),new Promise(t=>this.canvas.toBlob(t,"image/png"))}stats(){let t=this.renderer?.info;return t?{calls:t.render.calls,triangles:t.render.triangles,textures:t.memory.textures,geometries:t.memory.geometries,tracked:this.tracker.size}:null}unmount(){this.canvas?.remove()}dispose(){if(!this.disposed){this.disposed=!0;for(let t of this.views.values())t.dispose();this.views.clear(),this.chalkTiles?.dispose(),this.post?.dispose(),this.tracker?.disposeAll(),this.scene?.environment?.dispose?.(),this.renderer?.dispose(),this.contextLost||this.renderer?.forceContextLoss(),this.unmount()}}};var Oa=Math.PI/180,z3=Object.freeze([1,0,0,1,0,0]),Na=(n,t)=>[n[0]*t[0]+n[2]*t[1],n[1]*t[0]+n[3]*t[1],n[0]*t[2]+n[2]*t[3],n[1]*t[2]+n[3]*t[3],n[0]*t[4]+n[2]*t[5]+n[4],n[1]*t[4]+n[3]*t[5]+n[5]],kx=(n,t)=>[1,0,0,1,n,t],Lx=(n,t=n)=>[n,0,0,t,0,0],Dx=n=>[Math.cos(n),Math.sin(n),-Math.sin(n),Math.cos(n),0,0],Kw=(n,t,e)=>({x:n[0]*t+n[2]*e+n[4],y:n[1]*t+n[3]*e+n[5]});function Jw(n){let t=n[0]*n[3]-n[1]*n[2];return Math.abs(t)<1e-12?null:[n[3]/t,-n[1]/t,-n[2]/t,n[0]/t,(n[2]*n[5]-n[3]*n[4])/t,(n[1]*n[4]-n[0]*n[5])/t]}var Qh=(n,t,e)=>({x:(t-n.ox)*n.s,y:(e-n.oy)*n.s}),Nx=(n,t,e)=>({x:t/n.s+n.ox,y:e/n.s+n.oy});function ds(n,t,{X:e,Y:i,Z:s}){let r=n.screenOf(e,i,s);return{...Qh(t,r.x,r.y),k:r.k}}function Ox(n,t,e,i,s=0){let{cam:r}=n,o=Nx(t,e,i),a=r.floorY-s-r.cy;if(a===0)return null;let l=(o.y-r.cy)/a;return l>0?{x:(o.x-r.cx)/l,z:r.f-r.f/l}:null}function Fx(n,t,e,i){let s=Nx(t,e,i),[r,o]=n.fractionOfScreen(s.x,s.y);return r>=0&&r<=1&&o>=0&&o<=1?{x:r,y:o}:null}function qf(n,t,e,{stickLen:i=134}={}){let s=n.grip??0,r=n.scale??1,o=t.screenOf(n.x,n.lift??0,n.z),a=Qh(e,o.x,o.y),l=o.k*e.s,c=1-.45*s,h=(n.lean??0)*Oa,u=i*r*s,d=(n.yaw??0)*Oa,f=Math.cos(d),x=Math.max(.55-.35*(n.down??0),Math.cos((n.pitch??0)*Oa)),g=Na(kx(a.x,a.y),Na(Lx(l),Dx(h*c))),p=Na(g,Na(kx(0,-u),Dx(h*(1-c)))),m=r*Math.max(.03,Math.abs(f)),M=r*(n.breathe??1)*(n.squash??1)*x;return{m:Na(p,Lx(m,M)),stick:g,at:a,k:o.k,px:l,back:f<0,side:Math.abs(Math.sin(d)),hinge:u,share:c}}function Ux(n,t,e,i,s){let r=Jw(n.m);if(!r)return null;let o=Kw(r,i,s),{w:a,h:l}=e;if(o.x<-a/2||o.x>a/2||o.y<-l||o.y>Gs.depth)return null;let c=Math.max(0,-o.y)*(t.scale??1)*(t.breathe??1)*(t.squash??1);return(t.lift??0)+n.hinge+c}var Gs=Object.freeze({width:.5,depth:12}),Bx=(n,t)=>n.z-t.z;var zx=-10*Oa,Fa=Object.freeze({at:[Ki.eraser.x,20,4],size:[50,32,30],hit:{y0:0,y1:60,half:29}});function Hx(n,t,e){let i=n.standing(e);if(!i)return null;let s=Math.cos(zx),r=Math.sin(zx),o=(I,U,V)=>ds(n,t,{X:i.X+I*s+V*r,Y:U,Z:i.Z-I*r+V*s}),a=I=>I.map(([U,V,Z])=>{let it=o(U,V,Z);return[it.x,it.y]}),{width:l,depth:c,wall:h,stick:u,hit:d}=Ki,f=4+h,x=J0.map((I,U)=>{let V=u.first+U*u.spacing,Z=(U%2-.5)*6,it=(U%3-1)*.07,$=o(V,-2,Z),J=o(V-Math.sin(it)*u.height,-2+Math.cos(it)*u.height,Z),et=o(V,4+d.height/2-14-d.height/2,0),at=o(V,4+d.height/2-14+d.height/2,0),rt=d.radius*et.k*t.s;return{colour:I,base:{x:$.x,y:$.y},top:{x:J.x,y:J.y},width:2*u.radius*$.k*t.s,hit:{x0:et.x-rt,x1:et.x+rt,y0:at.y,y1:et.y}}}),g=Ki.magic,p=o(g.x,-2,2),m=o(g.x-Math.sin(.06)*g.height,-2+Math.cos(.06)*g.height,2),M=o(g.x,4+d.height/2-14-d.height/2,0),E=o(g.x,4+d.height/2-14+d.height/2,0),_=d.radius*M.k*t.s,[T,w,A]=Fa.at,[v,b,R]=Fa.size,P=o(T,Fa.hit.y0,A),k=o(T,Fa.hit.y1,A),B=Fa.hit.half*P.k*t.s;return{z:i.Z,floor:a([[-l/2,4,-c/2],[l/2,4,-c/2],[l/2,4,c/2],[-l/2,4,c/2]]),back:a([[-l/2,4,-c/2],[l/2,4,-c/2],[l/2,f,-c/2],[-l/2,f,-c/2]]),left:a([[-l/2,4,-c/2],[-l/2,4,c/2],[-l/2,f,c/2],[-l/2,f,-c/2]]),right:a([[l/2,4,-c/2],[l/2,4,c/2],[l/2,f,c/2],[l/2,f,-c/2]]),front:a([[-l/2,4,c/2],[l/2,4,c/2],[l/2,f,c/2],[-l/2,f,c/2]]),sticks:x,magic:{base:{x:p.x,y:p.y},top:{x:m.x,y:m.y},width:2*g.radius*p.k*t.s,hit:{x0:M.x-_,x1:M.x+_,y0:E.y,y1:M.y}},eraser:{front:a([[T-v/2,w-b/2,A+R/2],[T+v/2,w-b/2,A+R/2],[T+v/2,w+b/2,A+R/2],[T-v/2,w+b/2,A+R/2]]),top:a([[T-v/2,w+b/2,A-R/2],[T+v/2,w+b/2,A-R/2],[T+v/2,w+b/2,A+R/2],[T-v/2,w+b/2,A+R/2]]),hit:{x0:P.x-B,x1:P.x+B,y0:k.y,y1:P.y}}}}var Yf=(n,t,e)=>t>=n.x0&&t<=n.x1&&e>=n.y0&&e<=n.y1;function Gx(n,t,e){if(!n)return null;if(Yf(n.eraser.hit,t,e))return{kind:"eraser"};if(Yf(n.magic.hit,t,e))return{kind:"magic"};for(let i of n.sticks)if(Yf(i.hit,t,e))return{kind:"chalk",colour:i.colour};return null}var Vx=.42,Wx=.2,Xx=.8,$x=22,Qw=3,tT=1,jf=(n,t="#80512d")=>typeof n=="number"?`#${n.toString(16).padStart(6,"0")}`:t;function eT(n,t){let e=Math.min(2048,n),i=Math.round(e*t/n),s=document.createElement("canvas");return s.width=e,s.height=i,{canvas:s,ctx:s.getContext("2d"),cw:e,ch:i}}var tu=class{constructor({images:t,onContextLost:e=null}={}){this.images=t,this.onContextLost=e,this.name="flat",this.capabilities={lights:!1,shadows:!1,post:!1,particles:!1,marks:!0,zoneOutlines:!0,chalk:!0,camera:!1,capture:!0,footlights:!1},this.tier="flat",this.views=new Map,this.adding=new Set,this.emotes=new Map,this.calm=!1,this.zoneSetting="off",this.disposed=!1,this.ready=!1,this.order=[],this.flashes=[],this.zoneKey="",this.revision=0,this.chalkWall=null,this.chalkDirty=new Set,this.hidden=!1,this.boxShown=!1,this.draws=0}mount(t,{pixelRatio:e=1,width:i=1280,height:s=720}={}){if(this.element=t,this.canvas=document.createElement("canvas"),this.canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;",t.append(this.canvas),this.ctx=this.canvas.getContext("2d",{alpha:!1}),!this.ctx)throw new Error("this browser cannot draw on a 2D canvas");this.#t(i,s,e)}#t(t,e,i){this.width=t,this.height=e,this.ratio=Math.min(i||1,tT),this.view=To(t,e),this.canvas.width=Math.max(1,Math.round(t*this.ratio)),this.canvas.height=Math.max(1,Math.round(e*this.ratio)),this.backdrop=null,this.backdropKey="",this.occluderBitmaps=null,this.boxCache=null}resize(t,e,i=1){this.disposed||this.#t(t,e,i)}setView(t){this.disposed||!t||(this.view=t,this.occluderBitmaps=null,this.boxCache=null)}setQuality(){}setCalm(t){this.calm=!!t}setZoneSetting(t){this.zoneSetting=t,this.zoneKey=""}setFootlights(){}async load(t,e,i=[]){this.description=t,this.skin=e,this.rig=er(t.painting,t.rig),await Promise.all((e.fonts??[]).map(a=>document.fonts?.load(a).catch(()=>null)));let s=await this.images.loadImage(t.painting.src);if(!s)throw new Error(`the painting "${t.painting.src}" could not be loaded`);if(this.disposed)return;this.painting=s,this.grade=qh(s);let[r,o]=this.rig.size;this.zoneLayer=eT(r,o),this.impact=xh(),this.markImage=yh(),this.labelImages=new Map,this.occluders=t.occluders.map(a=>{let l=this.rig.standing([a.x,a.base]);return l?{poly:a.poly.map(([c,h])=>[this.rig.map.x(c),this.rig.map.y(h)]),z:l.Z}:null}).filter(Boolean),await Promise.all(i.map(a=>this.addCard(a))),this.ready=!0}async addCard(t){if(!(this.views.has(t.id)||this.adding.has(t.id)||this.disposed)){this.adding.add(t.id);try{let e=this.#i(),[i,s]=await Promise.all([jr(this.skin,t,e),this.skin.back(t,e)]);if(this.disposed)return;this.views.set(t.id,{id:t.id,person:t,face:this.#e(i),back:this.#e(s),w:this.skin.size.w,h:this.skin.size.h}),t.emote?.id&&this.#n(t.emote.id)}finally{this.adding.delete(t.id)}}}removeCard(t){this.views.delete(t)}#i(){return this.titleBlock??=Kh(),{loadImage:this.images.loadImage,titleBlock:this.titleBlock}}async refreshCard(t){let e=this.views.get(t.id);if(!e||this.disposed)return;let i={...e.person,...t},s=this.#i(),[r,o]=await Promise.all([jr(this.skin,i,s),this.skin.back(i,s)]);this.disposed||this.views.get(t.id)!==e||(e.person=i,e.face=this.#e(r),e.back=this.#e(o))}#e(t){let{w:e,h:i}=this.skin.size;if(!(t.width>e*1.3))return t;let s=document.createElement("canvas");s.width=e,s.height=i;let r=s.getContext("2d");return r.imageSmoothingQuality="high",r.drawImage(t,0,0,e,i),s}#n(t){if(this.emotes.has(t))return this.emotes.get(t);this.emotes.set(t,null);let e=gi[t]?.svg;if(e){let i=new Image;i.onload=()=>this.emotes.set(t,i),i.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(e.replace("<svg ",'<svg width="256" height="256" '))}`}return null}#s(){let{view:t,ratio:e}=this;this.#r([t.s,0,0,t.s,-t.ox*t.s,-t.oy*t.s],e)}#r(t,e=this.ratio){this.ctx.setTransform(t[0]*e,t[1]*e,t[2]*e,t[3]*e,t[4]*e,t[5]*e)}#a(){return this.boxShown?(this.boxCache??={layout:Hx(this.rig,this.view,this.boxAt??this.description.chalk?.box??no)},this.boxCache.layout):null}#l(t,e){let{rig:i,view:s,ratio:r}=this,o=t.board??null,a=this.description.zones.length?mh(this.description.zones,t.zones,this.zoneSetting,e,o):"",l=`${this.canvas.width}x${this.canvas.height}|${s.s},${s.ox},${s.oy}|${a}|${this.revision}|${this.hidden?1:0}`;if(this.backdrop&&l===this.backdropKey){this.chalkDirty.size&&this.#h();return}if(this.backdropKey=l,this.chalkDirty.clear(),!this.backdrop){let m=document.createElement("canvas");m.width=this.canvas.width,m.height=this.canvas.height,this.backdrop={canvas:m,ctx:m.getContext("2d",{alpha:!1})}}let c=this.backdrop.ctx,h=i.map,[u,d]=i.size;c.setTransform(1,0,0,1,0,0),c.globalAlpha=1,c.fillStyle="#0c0a08",c.fillRect(0,0,this.canvas.width,this.canvas.height),c.setTransform(s.s*r,0,0,s.s*r,-s.ox*s.s*r,-s.oy*s.s*r),c.imageSmoothingQuality="high";let f=u*h.s,x=d*h.s;c.drawImage(this.painting,h.ox,h.oy,f,x);let g=h.oy+x,p=s.oy+s.visH-g;if(p>0){let m=Math.min(p+8,x*.6);c.save(),c.globalAlpha=.55,c.translate(0,g),c.scale(1,-1),c.drawImage(this.painting,0,d-m/h.s,u,m/h.s,h.ox,-m,f,m),c.restore()}if(this.zoneLayer&&this.description.zones.length&&(a!==this.zoneKey&&(this.zoneKey=a,gh(this.zoneLayer.ctx,this.zoneLayer.cw,this.zoneLayer.ch,this.description.zones,t.zones,this.zoneSetting,e,o)),c.drawImage(this.zoneLayer.canvas,h.ox,h.oy,f,x)),!this.hidden&&this.chalkWall)for(let m of this.chalkWall.composite.keys())this.#c(c,m)}#c(t,e){let i=this.chalkWall.composite.get(e);if(!i)return;let s=this.chalkWall.grid,r=ze(s,e),o=this.rig.map,[a,l]=this.rig.size,c=a*o.s,h=l*o.s;t.drawImage(i,o.ox+r.x/s.w*c,o.oy+r.y/s.h*h,r.w/s.w*c,r.h/s.h*h)}#h(){let{rig:t,view:e,ratio:i}=this,s=this.backdrop.ctx,r=this.chalkWall?.grid,o=t.map,[a,l]=t.size,c=a*o.s,h=l*o.s,u=1.5/(e.s*i);s.setTransform(e.s*i,0,0,e.s*i,-e.ox*e.s*i,-e.oy*e.s*i),s.globalAlpha=1,s.imageSmoothingQuality="high";for(let d of this.chalkDirty){let f=r?ze(r,d):null;if(!f)continue;let x=Math.max(o.ox,o.ox+f.x/r.w*c-u),g=Math.max(o.oy,o.oy+f.y/r.h*h-u),p=Math.min(o.ox+c,o.ox+(f.x+f.w)/r.w*c+u),m=Math.min(o.oy+h,o.oy+(f.y+f.h)/r.h*h+u);if(s.save(),s.beginPath(),s.rect(x,g,p-x,m-g),s.clip(),s.fillStyle="#0c0a08",s.fillRect(x,g,p-x,m-g),s.drawImage(this.painting,o.ox,o.oy,c,h),this.zoneLayer&&this.description.zones.length&&s.drawImage(this.zoneLayer.canvas,o.ox,o.oy,c,h),!this.hidden)for(let M of Fi(r,{x0:f.x-2,y0:f.y-2,x1:f.x+f.w+2,y1:f.y+f.h+2}))this.#c(s,M);s.restore()}this.chalkDirty.clear()}draw(t){if(!this.ready||this.disposed)return;let{ctx:e,rig:i,view:s}=this,r=t.t;this.draws++,e.imageSmoothingQuality="medium",this.#l(t,r),e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="source-over",e.drawImage(this.backdrop.canvas,0,0),this.#u(t,r),this.#o(t);let o=[];for(let l of t.cards){let c=this.views.get(l.id);c&&o.push({kind:"card",z:l.z,c:l,v:c,pl:qf(l,i,s,{stickLen:this.skin.stick?.length??134})})}for(let l of this.occluders)o.push({kind:"occluder",z:l.z,o:l});let a=this.#a();a&&o.push({kind:"box",z:a.z,layout:a}),o.sort(Bx);for(let l of o)l.kind==="card"?this.#p(l.c,l.v,l.pl):l.kind==="occluder"?this.#d(l.o):this.#x(l.layout);this.order=o,this.#y(t),this.#v(t,r)}#o(t){let{ctx:e,rig:i}=this;this.#s();for(let s of t.cards){let r=this.views.get(s.id);if(!r)continue;let o=s.grip??0,a=s.scale??1,l=i.screenOf(s.x,.6,s.z),c=r.w*a*(.95+.5*o)/2*l.k,h=(74+46*o)/2,u=i.screenOf(s.x,.6,s.z+h),d=i.screenOf(s.x,.6,s.z-h),f=Math.max(2,Math.abs(u.y-d.y)/2);if(s.selected||s.speaking){e.globalAlpha=s.selected?.85:.6,e.fillStyle=s.selected?"#ff9a46":"#fff0c8",e.beginPath(),e.ellipse(l.x,l.y,c*1.45,f*1.6,0,0,Math.PI*2),e.fill();continue}e.globalAlpha=.62-.26*o,e.fillStyle="#000",e.beginPath(),e.ellipse(l.x,l.y,c,f,0,0,Math.PI*2),e.fill()}e.globalAlpha=1}#u(t,e){let{ctx:i,rig:s}=this;this.#s();for(let r of t.marks.slice(0,6)){let o=r.target?1+.06*Math.sin(e*7):1,a=s.screenOf(r.X,1.2,r.Z),l=(r.target?190:150)*o*a.k,c=(r.target?120:96)*o/2,h=Math.abs(s.screenOf(r.X,1.2,r.Z+c).y-s.screenOf(r.X,1.2,r.Z-c).y);i.globalAlpha=Math.min(1,r.alpha)*(r.target?1:.8),i.drawImage(this.markImage,a.x-l/2,a.y-h/2,l,Math.max(h,4))}i.globalAlpha=1}#d(t){this.occluderBitmaps??=new Map;let e=this.occluderBitmaps.get(t);e===void 0&&(e=this.#f(t),this.occluderBitmaps.set(t,e)),e&&(this.ctx.setTransform(1,0,0,1,0,0),this.ctx.drawImage(e.canvas,e.x,e.y))}#f(t){let{view:e,ratio:i,rig:s}=this,r=t.poly.map(([_,T])=>Qh(e,_,T)),o=Math.max(0,Math.floor(Math.min(...r.map(_=>_.x))*i)),a=Math.max(0,Math.floor(Math.min(...r.map(_=>_.y))*i)),l=Math.min(this.canvas.width,Math.ceil(Math.max(...r.map(_=>_.x))*i)),c=Math.min(this.canvas.height,Math.ceil(Math.max(...r.map(_=>_.y))*i));if(l<=o||c<=a)return null;let h=document.createElement("canvas");h.width=l-o,h.height=c-a;let u=h.getContext("2d");u.imageSmoothingQuality="high",u.save(),u.setTransform(e.s*i,0,0,e.s*i,-e.ox*e.s*i-o,-e.oy*e.s*i-a),u.beginPath(),t.poly.forEach(([_,T],w)=>w?u.lineTo(_,T):u.moveTo(_,T)),u.closePath(),u.clip();let[d,f]=s.size;u.drawImage(this.painting,s.map.ox,s.map.oy,d*s.map.s,f*s.map.s),u.restore();let x=t.poly.map(_=>_[1]),g=Math.min(al,(Math.max(...x)-Math.min(...x))*ll)*e.s*i,p=cl(r.map(_=>[_.x*i-o,_.y*i-a]),h.width,h.height,g),m=document.createElement("canvas");m.width=h.width,m.height=h.height;let M=m.getContext("2d"),E=M?.createImageData?.(m.width,m.height);if(E?.data){for(let _=0;_<p.length;_++)E.data[_*4+3]=p[_];M.putImageData(E,0,0),u.globalCompositeOperation="destination-in",u.drawImage(m,0,0),u.globalCompositeOperation="source-over"}return{canvas:h,x:o,y:a}}#p(t,e,i,{ghost:s=!1}={}){let{ctx:r,skin:o}=this,a=e.w,l=e.h,c=t.scale??1,h=t.grip??0;if(!s&&h>.02){this.#r(i.stick);let f=i.hinge,x=jf(o.stick?.wood),g=jf(o.stick?.collar,"#b8924f"),p=Math.min(18*c,f);r.fillStyle=x,r.beginPath(),r.moveTo(-6.4*c,0),r.lineTo(-8.5*c,-f+p),r.lineTo(8.5*c,-f+p),r.lineTo(6.4*c,0),r.arc(0,0,6.4*c,0,Math.PI),r.closePath(),r.fill(),r.fillStyle="rgba(255,255,255,0.16)",r.fillRect(-4*c,-f+p,2.4*c,f-p),r.fillStyle=g,r.fillRect(-12.5*c,-f,25*c,p),r.fillStyle="rgba(0,0,0,0.25)",r.fillRect(-12.5*c,-f+p-3*c,25*c,3*c),r.strokeStyle=e.person.colour??"#e8e0c8",r.lineWidth=3.6,r.globalAlpha=Math.min(1,h*2),r.beginPath(),r.ellipse(0,0,21,9,0,0,Math.PI*2),r.stroke(),r.globalAlpha=1}this.#r(i.m),s&&(r.globalAlpha=.35);let u=jf(o.materials?.body?.color,"#e7dfcd"),d=(o.thickness??9)*i.side/2;r.fillStyle=u,r.fillRect(-a*Gs.width/2,0,a*Gs.width,Gs.depth),e.person.colour&&(r.fillStyle=e.person.colour,r.fillRect(-a*Gs.width/2+4,1,a*Gs.width-8,3)),r.fillStyle=u,r.fillRect(-a/2-d,-l+2,a+d*2,l-2),r.drawImage(i.back?e.back:e.face,-a/2,-l,a,l),!s&&t.down>.02&&(r.fillStyle=`rgba(0,0,0,${(.45*t.down).toFixed(3)})`,r.fillRect(-a/2,-l,a,l)),s||this.#m(e,t,a,l),s&&(r.globalAlpha=1)}#m(t,e,i,s){if(!this.grade)return;let[r,o]=this.rig.fractionOf(e.x,e.z);t.light=Eh(t.light,Th(this.grade,r,o,{strength:this.description?.grade??1}));let[a,l,c]=t.light.map(u=>Math.round(Math.max(0,Math.min(1,u))*255));if(a>250&&l>250&&c>250)return;let{ctx:h}=this;h.save(),h.globalCompositeOperation="multiply",h.fillStyle=`rgb(${a},${l},${c})`,h.fillRect(-i/2,-s,i,s),h.restore()}#x(t){let{ctx:e}=this,i=(a,l)=>{e.fillStyle=l,e.beginPath(),a.forEach(([c,h],u)=>u?e.lineTo(c,h):e.moveTo(c,h)),e.closePath(),e.fill(),e.strokeStyle="rgba(0,0,0,0.35)",e.lineWidth=1,e.stroke()};this.#r([1,0,0,1,0,0]),i(t.floor,"#3a2412"),i(t.back,"#6a4628"),e.lineCap="round";for(let a of t.sticks)e.strokeStyle=Oi[a.colour]??Oi.white,e.lineWidth=a.width,e.beginPath(),e.moveTo(a.base.x,a.base.y),e.lineTo(a.top.x,a.top.y),e.stroke();let s=t.magic,r=e.createLinearGradient(s.base.x,s.base.y,s.top.x,s.top.y);for(let a=0;a<=6;a++)r.addColorStop(a/6,`hsl(${a*60},70%,72%)`);e.strokeStyle=r,e.lineWidth=s.width,e.beginPath(),e.moveTo(s.base.x,s.base.y),e.lineTo(s.top.x,s.top.y),e.stroke();let o=s.width*1.1;e.fillStyle="#ffd36a",e.beginPath();for(let a=0;a<8;a++){let l=a/8*Math.PI*2-Math.PI/2,c=a%2?o*.42:o;e.lineTo(s.top.x+Math.cos(l)*c,s.top.y+Math.sin(l)*c)}e.closePath(),e.fill(),i(t.left,"#7a5230"),i(t.right,"#7a5230"),i(t.front,"#8a5e38"),i(t.eraser.front,"#5b6670"),i(t.eraser.top,"#6c7882")}#y(t){let{ctx:e,rig:i,view:s}=this;for(let r of t.marks.slice(0,6)){if(!r.target)continue;let o=this.views.get(r.for);if(!o)continue;let a=this.description.cardScale*(o.person.size??1),l={x:r.X,z:r.Z,lift:r.pose.lift,lean:r.pose.lean,yaw:r.pose.yaw,pitch:r.pose.pitch,grip:0,scale:a,breathe:1,squash:1};if(this.#p(l,o,qf(l,i,s,{stickLen:0}),{ghost:!0}),r.label){let c=ds(i,s,{X:r.X,Y:r.pose.lift+o.h*a+40,Z:r.Z}),h=this.#g(r.label),u=260*c.k*s.s;this.#r([1,0,0,1,0,0]),e.drawImage(h,c.x-u/2,c.y-u*96/512/2,u,u*96/512)}}for(let r of t.cards){let o=r.emote;if(!o||o.opacity<=.01)continue;let a=this.#n(o.id),l=this.views.get(r.id);if(!a||!l)continue;let c=r.scale??1,h=ds(i,s,{X:r.x+74*c,Y:(r.lift??0)+(this.skin.stick?.length??134)*c*(r.grip??0)+l.h*c*(r.breathe??1)+36,Z:r.z+30}),u=96*o.pop*h.k*s.s,d=.96*h.k*s.s,f=(o.r??0)*Math.PI/180,x=h.x+(o.x??0)*d,g=h.y+(o.y??0)*d+(or-.5)*u;this.#r([Math.cos(f),Math.sin(f),-Math.sin(f),Math.cos(f),x,g]),e.globalAlpha=o.opacity,e.drawImage(a,-u/2,-or*u,u,u),e.globalAlpha=1}}#g(t){return this.labelImages.has(t)||this.labelImages.set(t,vh(t)),this.labelImages.get(t)}#v(t){let{ctx:e,rig:i,view:s}=this,r=t.t,o=this.skin.size.h*this.description.cardScale*.5+60;this.#r([1,0,0,1,0,0]);let a=0;for(let l of t.bonks){let c=r-l.t;if(c<0||c>Xx)continue;let h=ds(i,s,{X:l.x,Y:o+10,Z:l.Z+90});if(c<Vx&&a++<3){let u=c/Vx,d=(120+150*Math.sqrt(u))*h.k*s.s;e.save(),e.translate(h.x,h.y),e.rotate(.2*u),e.globalAlpha=1-u*u,e.drawImage(this.impact,-d/2,-d/2,d,d),e.restore()}if(!this.calm){if(c<Wx&&this.#M(l.t)){let u=260*h.k*s.s,d=.4*(1-c/Wx)**2,f=e.createRadialGradient(h.x,h.y,0,h.x,h.y,u);f.addColorStop(0,`rgba(255,226,168,${d})`),f.addColorStop(1,"rgba(255,226,168,0)"),e.globalCompositeOperation="lighter",e.fillStyle=f,e.fillRect(h.x-u,h.y-u,u*2,u*2),e.globalCompositeOperation="source-over"}if(l===t.bonks[t.bonks.length-1]){e.globalCompositeOperation="lighter",e.fillStyle="#ffd98a",e.globalAlpha=Math.max(0,1-c/Xx);for(let u=0;u<$x;u++){let d=u/$x*Math.PI*2+u%5*.37,f=260+u*53%340,x=ds(i,s,{X:l.x+Math.cos(d)*f*c,Y:Math.max(2,o+Math.sin(d)*f*.8*c+120*c-900*c*c),Z:l.Z+90});e.beginPath(),e.arc(x.x,x.y,Math.max(1.2,3*x.k*s.s),0,Math.PI*2),e.fill()}e.globalCompositeOperation="source-over"}e.globalAlpha=1}}e.globalAlpha=1}#M(t){return this.flashes.includes(t)?!0:(this.flashes=this.flashes.filter(e=>t-e<1),this.flashes.length>=Qw?!1:(this.flashes.push(t),!0))}pick(t,e){if(!this.ready)return null;for(let i=this.order.length-1;i>=0;i--){let s=this.order[i];if(s.kind==="card"){let r=Ux(s.pl,s.c,s.v,t,e);if(r!==null)return{kind:"card",id:s.c.id,point:{x:0,y:r,z:s.c.z}}}else if(s.kind==="box"){let r=Gx(s.layout,t,e);if(r)return{...r,point:{x:0,y:0,z:s.z}}}}return null}paintingAt(t,e){return this.rig?Fx(this.rig,this.view,t,e):null}floorAt(t,e,i=0){return this.rig?Ox(this.rig,this.view,t,e,i):null}project(t){return ds(this.rig,this.view,t)}setChalkTiles(t,e,i=!1){let s=t!==this.chalkWall;if(this.chalkWall=t,i||s){this.revision++;return}for(let r of e)this.chalkDirty.add(r)}setChalkHidden(t){this.hidden=!!t}setChalkBox(t){this.boxShown=!!t}setChalkBoxAt(t){this.boxAt=[t[0],t[1]],this.boxCache=null}paintingColour(t,e){return Zh(this.painting,t,e)}async capture(){return new Promise(t=>this.canvas.toBlob(t,"image/png"))}stats(){return{calls:this.draws,triangles:0,textures:0,geometries:0,tracked:this.views.size}}unmount(){this.canvas?.remove()}dispose(){this.disposed||(this.disposed=!0,this.views.clear(),this.order=[],this.unmount())}};var Kf="module.stagecraft";function Zx(n){let t=(e,i)=>n(e,i);return game.socket.on(Kf,t),{send:e=>game.socket.emit(Kf,e),close:()=>game.socket.off(Kf,t)}}var qx=238/255,iT=1.5,Yx=(n,t,e)=>Math.max(t,Math.min(e,n)),eu=class{constructor({root:t,wall:e,mapOf:i}){this.root=t,this.wall=e,this.mapOf=i,this.raw=document.createElement("canvas"),this.show=this.#t("stagecraft-wet"),this.tailEl=this.#t("stagecraft-wet stagecraft-wet-tail"),this.rawX=this.raw.getContext("2d"),this.showX=this.show.getContext("2d"),this.tailX=this.tailEl.getContext("2d"),this.w=0,this.h=0,this.ratio=1,this.stroke=null,this.area=null,this.tailArea=null,this.last=null,this.on=!1,this.fit()}#t(t){let e=document.createElement("canvas");return e.className=t,e.setAttribute("aria-hidden","true"),this.root.append(e),e}fit(){let t=Yx(globalThis.devicePixelRatio||1,1,iT),e=Math.max(1,Math.round((this.root.clientWidth||1)*t)),i=Math.max(1,Math.round((this.root.clientHeight||1)*t));if(e===this.w&&i===this.h&&t===this.ratio)return!1;this.w=e,this.h=i,this.ratio=t;for(let s of[this.raw,this.show,this.tailEl])s.width=e,s.height=i;return!0}warm(){let t={def:oe.chalk,colour:"#ffffff",magic:null,opacity:1},e={x:40,y:40};this.begin(t,[[[e.x-30,e.y-30],[e.x+120,e.y-30],[e.x+120,e.y+80],[e.x-30,e.y+80]]])&&(this.add([{x:e.x,y:e.y,size:12,flow:.8,angle:.4,seed:1,dist:0},{x:e.x+5,y:e.y+3,size:12,flow:.8,angle:.4,seed:2,dist:5}]),this.tail({x:e.x+30,y:e.y+8}),this.release())}begin(t,e=this.wall.mask){this.release(),this.fit();let i=this.mapOf();if(!i||!(i.k>0))return this.on=!1,!1;this.m=fx(i,this.ratio),this.stroke=t,this.last=null,this.area=null,this.polys=e?.length?e.map(r=>r.map(([o,a])=>[o*this.m.k+this.m.bx,a*this.m.k+this.m.by])):null,this.pattern=null;let s=t.def.grain;if(s>0&&typeof DOMMatrix<"u"){let r=this.showX.createPattern(this.wall.grain.canvas(Math.round(Yx(s,0,1)*20)/20),"repeat");r?.setTransform(new DOMMatrix([this.m.k,0,0,this.m.k,this.m.bx,this.m.by])),this.pattern=r}return this.on=!0,!0}add(t){if(!this.on||!t.length)return;let e=this.m,i={k:e.k,ox:e.bx,oy:e.by};for(let r of t)Da(this.rawX,this.wall.tips,this.stroke,r,i,{dim:qx,clip:{w:this.w,h:this.h}});this.last=t[t.length-1];let s=Of(t,e,this.w,this.h);s&&(this.area=Ff(this.area,s),this.#i(s))}#i(t){let e=this.showX;if(e.save(),e.beginPath(),e.rect(t.x,t.y,t.w,t.h),e.clip(),e.clearRect(t.x,t.y,t.w,t.h),e.globalAlpha=this.stroke.opacity??1,this.polys)for(let i of this.polys)e.save(),e.beginPath(),i.forEach(([s,r],o)=>o?e.lineTo(s,r):e.moveTo(s,r)),e.closePath(),e.clip(),e.drawImage(this.raw,t.x,t.y,t.w,t.h,t.x,t.y,t.w,t.h),e.restore();else e.drawImage(this.raw,t.x,t.y,t.w,t.h,t.x,t.y,t.w,t.h);e.globalAlpha=1,this.pattern&&(e.globalCompositeOperation="destination-in",e.fillStyle=this.pattern,e.fillRect(t.x,t.y,t.w,t.h)),e.restore()}tail(t){if(!this.on)return;let e=this.tailX;if(this.tailArea&&(e.clearRect(this.tailArea.x,this.tailArea.y,this.tailArea.w,this.tailArea.h),this.tailArea=null),!this.last)return;let i=this.stroke.def,s=mx(this.last,t,Math.max(.4,i.spacing*this.last.size));if(!s.length)return;let r=this.m,o=Of(s,r,this.w,this.h);if(!o)return;if(e.save(),e.beginPath(),e.rect(o.x,o.y,o.w,o.h),e.clip(),this.polys){e.beginPath();for(let l of this.polys)l.forEach(([c,h],u)=>u?e.lineTo(c,h):e.moveTo(c,h)),e.closePath();e.clip()}let a={k:r.k,ox:r.bx,oy:r.by};for(let l of s)Da(e,this.wall.tips,this.stroke,l,a,{dim:qx,clip:{w:this.w,h:this.h}});this.pattern&&(e.globalCompositeOperation="destination-in",e.fillStyle=this.pattern,e.fillRect(o.x,o.y,o.w,o.h)),e.restore(),this.tailArea=o}end(){this.tailArea&&(this.tailX.clearRect(this.tailArea.x,this.tailArea.y,this.tailArea.w,this.tailArea.h),this.tailArea=null),this.on=!1}get wet(){return this.area!==null||this.tailArea!==null}release(){let t=Ff(this.area,this.tailArea);if(t)for(let e of[this.rawX,this.showX,this.tailX])e.clearRect(t.x,t.y,t.w,t.h);this.area=null,this.tailArea=null,this.last=null,this.stroke=null,this.on=!1}dispose(){this.release(),this.show.remove(),this.tailEl.remove(),this.raw.width=this.raw.height=0}};var iu=class{constructor({rest:t=450,most:e=2500,now:i=()=>performance.now(),later:s=(o,a)=>setTimeout(o,a),cancel:r=o=>clearTimeout(o)}={}){this.rest=t,this.most=e,this.now=i,this.later=s,this.cancel=r,this.last=-1/0,this.waiting=[],this.timer=null}note(){this.last=this.now(),this.waiting.length&&this.#i()}whenQuiet(){return new Promise(t=>{this.waiting.push({resolve:t,deadline:this.now()+this.most}),this.#i()})}release(){let t=this.waiting;this.waiting=[],this.#t();for(let e of t)e.resolve()}get pending(){return this.waiting.length}#t(){this.timer!==null&&(this.cancel(this.timer),this.timer=null)}#i(){if(this.#t(),!this.waiting.length)return;let t=this.now(),e=this.last+this.rest,i=Math.min(...this.waiting.map(r=>r.deadline)),s=Math.min(e,i);this.timer=this.later(()=>this.#e(),Math.max(0,s-t))}#e(){this.timer=null;let t=this.now(),e=t-this.last>=this.rest,i=[];this.waiting=this.waiting.filter(s=>e||t>=s.deadline?(i.push(s),!1):!0);for(let s of i)s.resolve();this.#i()}};var nT=45,sT=8e3,jx="stagecraft.chalk.prefs",nu=()=>`${(game.user?.id??"x").slice(0,6)}${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;function rT(){try{return JSON.parse(globalThis.localStorage?.getItem(jx)??"null")??{}}catch{return{}}}function oT(n){try{globalThis.localStorage?.setItem(jx,JSON.stringify(n))}catch{}}function aT(n){let t=n.host;return typeof t.backend?.wetMap!="function"||typeof t.root?.append!="function"||typeof document>"u"?null:new eu({root:t.root,wall:n.wall,mapOf:()=>t.backend?.wetMap?.(n.grid)??null})}var su=class{constructor({host:t,store:e,makeWall:i=l=>new $h(l),encode:s=Gf,send:r=()=>{},makeWet:o=aT,quiet:a=new iu}){this.host=t,this.store=e,this.sceneId=t.scene.id,this.send=r,this.encode=s,this.makeWet=o,this.quiet=a,this.wet=void 0,this.wetPending=null,this.pointerListeners=new Set,this.grid=Rf(t.description.painting),this.wall=i({grid:this.grid,onChange:c=>this.host.backend?.setChalkTiles?.(this.wall,c)}),this.wall.warmUp?.();let l=rT();this.colour=zs(l.colour)??Oi.white,this.recent=(l.recent??[]).map(zs).filter(Boolean).slice(0,10),this.sizes={...Object.fromEntries(Object.entries(oe).map(([c,h])=>[c,h.size.initial])),...l.sizes??{}},this.steady=Number.isInteger(l.steady)?Math.max(0,Math.min(ro.length-1,l.steady)):1,this.magic={rainbow:!1,glow:!0,sparkle:!1,...l.magic??{}},this.tool=null,this.drawing=null,this.lastEnd=null,this.redoSteps=[],this.keeping=Promise.resolve(),this.remote=new Map,this.loading=new Map,this.listeners=new Set,this.unsubscribe=e.onChange((c,h)=>{c===null?(this.refresh(),this.sync()):c===this.sceneId&&this.#s(h)}),this.onHide=()=>this.quiet.release(),globalThis.addEventListener?.("pagehide",this.onHide)}stop(){this.unsubscribe?.(),globalThis.removeEventListener?.("pagehide",this.onHide),this.putAway(),this.wet?.dispose(),this.wet=void 0,this.wetPending=null;for(let t of this.remote.values())clearTimeout(t.timer);this.remote.clear(),this.listeners.clear(),this.pointerListeners.clear(),clearTimeout(this.flashTimer)}onPointer(t){return this.pointerListeners.add(t),()=>this.pointerListeners.delete(t)}#t(t){for(let e of this.pointerListeners)e(t)}reset(){this.putAway(),this.wetPending?.release(),this.wetPending=null,this.host.backend?.setChalkTiles?.(this.wall,new Set(this.wall.keys()),!0)}onHand(t){return this.listeners.add(t),()=>this.listeners.delete(t)}#i(){for(let t of this.listeners)t()}policy(){let t=this.host.scene.flags?.[j]?.live?.chalk??null;return Fh(this.host.description.chalk,t)}get usable(){return this.store.ready&&ox(this.policy(),this.host.description.zones)}refresh(){let t=this.policy(),e=this.usable;return this.host.backend.setChalkBox(e),(!e||t.locked)&&this.putAway(),this.host.backend.setChalkHidden(this.host.scene.flags?.[j]?.live?.chalkHidden===!0),this.wall.setMask(ax(t,this.host.description.zones)),t}chalkZones(){return this.policy().mode==="zones"?this.host.description.zones.filter(t=>t.kind==="chalk"):[]}sync(){let t=this.store.layers(this.sceneId);this.#e(t);for(let e of t)this.#n(e)}#e(t){let e=t.map(s=>({by:s.by,since:s.since})),i=this.wall.layers.get(game.user.id);i&&!e.some(s=>s.by===game.user.id)&&e.push({by:i.by,since:i.since}),this.wall.setLayers(e)}#n(t){let e=this.wall.layers.get(t.by),i=new Set([...Object.keys(t.tiles),...e?[...e.sources.keys()]:[]]),s=[];for(let o of i){let a=t.tiles[o]??null;this.wall.sourceOf(t.by,o)!==a&&s.push(this.wall.setTile(t.by,o,a).catch(l=>console.warn(`${j} | a tile of chalk could not be shown`,l)))}let r=Promise.all(s);return this.loading.set(t.by,r),r.then(()=>{this.loading.get(t.by)===r&&this.loading.delete(t.by),this.#r()}),r}#s(t){let e=this.store.layers(this.sceneId),i=e.find(s=>s.by===t);if(!i){this.sync();return}(!this.wall.layers.has(t)||this.wall.layers.get(t).since!==i.since)&&this.#e(e),this.#n(i)}#r(){if(!this.remote.size)return;let t=new Map(this.store.layers(this.sceneId).map(e=>[e.by,e]));for(let[e,i]of this.remote){if(!i.ended)continue;i.layers.every(r=>!this.loading.has(r)&&Object.keys(t.get(r)?.history??{}).some(o=>o.endsWith(`-${e}`)))&&this.#g(e)}}get inHand(){return this.tool}take(t){if(!this.usable)return;if(t==="rub")return this.choose(this.tool==="eraser"?null:"eraser");if(t==="magic")return this.choose(this.tool==="magic"?null:"magic");let e=Oi[t];if(e){if(this.tool==="chalk"&&this.colour===e)return this.putAway();this.setColour(e),this.choose("chalk")}}choose(t){if(!t)return this.putAway();!oe[t]||!this.usable||(this.drawing&&this.cancel(),this.tool=t,this.host.root?.classList.add("stagecraft-chalk"),(oe[t].kind==="paint"||oe[t].kind==="spray")&&this.#a(),this.#i())}#a(){return this.wet===void 0&&(this.wet=this.makeWet(this)??null,this.wet&&setTimeout(()=>{try{this.wet?.warm?.()}catch{}},0)),this.wet}putAway(){this.quiet.release(),this.drawing&&this.cancel(),this.tool=null,this.cursorZone=null,this.blocked=!1,this.pointer=null,this.host?.root?.classList.remove("stagecraft-chalk"),this.#c(null),this.#t(null),this.#i()}setColour(t,{remember:e=!0}={}){let i=zs(t);i&&(this.colour=i,e&&(this.recent=[i,...this.recent.filter(s=>s!==i)].slice(0,10)),this.#l(),this.#i())}setSize(t,e=this.tool){let i=oe[e];!i||i.kind==="fill"||(this.sizes[e]=Math.round(Math.max(i.size.min,Math.min(i.size.max,t))*10)/10,this.#l(),this.#i())}nudgeSize(t){let e=this.sizes[this.tool];Number.isFinite(e)&&this.setSize(e+t*Math.max(1,e*.15))}setSteady(t){this.steady=Math.max(0,Math.min(ro.length-1,t)),this.#l(),this.#i()}setMagic(t){this.magic={...this.magic,...t},this.#l(),this.#i()}#l(){oT({colour:this.colour,recent:this.recent,sizes:this.sizes,steady:this.steady,magic:this.magic})}scale(t){let e=this.host.backend.paintingAt(t.x,t.y),i=this.host.backend.paintingAt(t.x+40,t.y);if(!e||!i)return null;let s=Math.hypot((i.x-e.x)*this.grid.w,(i.y-e.y)*this.grid.h);return s>0?40/s:null}hover(t){if(!this.tool)return;if(this.pointer=t,!t){this.#c(null),this.#t(null);return}let e=this.host.backend.paintingAt(t.x,t.y);this.cursorZone=e?this.chalkZones().find(i=>xn(i.shape,e.x,e.y))?.id??null:null,this.blocked=oe[this.tool].kind!=="erase"&&!(e&&Lf(this.policy(),this.host.description.zones,e.x,e.y)),this.flashTimer||this.#c(this.blocked&&!this.drawing?t:null),this.#t(t)}#c(t,e=null){let i=this.host?.root;if(typeof i?.querySelector!="function"||typeof document>"u")return;let s=i.querySelector(".stagecraft-chalk-hint");if(!t){s&&(s.hidden=!0);return}s||(s=document.createElement("div"),s.className="stagecraft-chalk-hint",i.append(s));let r=this.chalkZones().map(o=>o.name).filter(Boolean);s.textContent=e??(r.length?game.i18n.format("STAGECRAFT.Chalk.OnlyOn",{where:r.join(", ")}):game.i18n.localize("STAGECRAFT.Chalk.NotHere")),s.style.left=`${Math.round(t.x+22)}px`,s.style.top=`${Math.round(t.y+18)}px`,s.hidden=!1}flash(t,e){this.#c(t,e),clearTimeout(this.flashTimer),this.flashTimer=setTimeout(()=>{this.flashTimer=null,this.#c(null)},1800)}#h(t){let e=this.host.backend.paintingAt(t.x,t.y);return e?Pf(this.grid,e.x,e.y):null}painterAt(t){let e=this.#h(t),i=e?this.wall.whoAt(e.x,e.y):null;return i?game.users.get(i)?.name??i:null}painters(){return this.store.layers(this.sceneId).map(t=>({by:t.by,name:game.users.get(t.by)?.name??t.by,tiles:Object.keys(t.tiles).length})).filter(t=>t.tiles>0).sort((t,e)=>e.tiles-t.tiles)}begin(t){if(!this.tool||!this.usable||this.policy().locked||this.drawing)return!1;let e=this.#h(t);if(!e)return!1;if(t.alt)return this.pickColour(t),!1;let i=t.flip?"eraser":this.tool,s=oe[i];if(s.kind==="fill")return this.#y(e,t),!1;if(t.shift&&this.lastEnd)return this.#x(this.lastEnd,e,i),!1;let r=nu(),o=Nf(r),a=this.sizes[i],l={tool:i,size:a,steady:ro[this.steady],seed:o},c=s.kind==="erase"&&game.user.isGM===!0,h=s.magic?{...this.magic}:null;this.#o();let u=s.kind==="paint"||s.kind==="spray"?this.#a():null,d=this.wall.begin({id:r,by:game.user.id,tool:i,colour:this.colour,magic:h,everyone:c,wet:!!u});return u&&!u.begin(d)&&(d.wet=!1,u=null),this.quiet.note(),this.drawing={id:r,stroke:new so(l),feel:new Hh,opts:l,everyone:c,unsent:[],timer:null,at:e,wet:u},this.send({type:"chalk",op:"begin",scene:this.sceneId,id:r,tool:i,colour:this.colour,magic:h,everyone:c,size:a,steady:l.steady,seed:o}),this.extend(t),!0}extend(t){let e=this.drawing;if(!e)return;let i=this.#h(t);if(!i)return;let s=e.feel.pressure({x:i.x,y:i.y,t:t.t??performance.now(),pressure:t.pressure,pointerType:t.pointerType}),r={x:Math.round(i.x*10)/10,y:Math.round(i.y*10)/10,p:Math.round(s*100)/100};e.at=i;let o=e.stroke.add(r);this.wall.paint(e.id,o),e.wet?.add(o),this.quiet.note(),e.unsent.push(r),e.timer??=setTimeout(()=>this.#u(),nT)}finishMove(){let t=this.drawing;t?.wet&&t.at&&t.wet.tail(t.at)}afterDraw(){this.#o()}#o(){this.wetPending&&(this.wetPending.release(),this.wetPending=null)}#u(){let t=this.drawing;t&&(t.timer=null,t.unsent.length&&(this.send({type:"chalk",op:"more",scene:this.sceneId,id:t.id,s:t.unsent.flatMap(e=>[e.x,e.y,e.p])}),t.unsent=[]))}end(){let t=this.drawing;if(!t)return Promise.resolve();let e=t.stroke.finish();this.wall.paint(t.id,e),clearTimeout(t.timer),this.#u(),this.drawing=null,this.lastEnd=t.at,this.quiet.note();let i=ka(this.wall.strokes.get(t.id)?.dabs??[]);t.wet&&(t.wet.add(e),t.wet.end(),this.wetPending=t.wet);let s=this.wall.commit(t.id),r=[...s.keys()];return this.send({type:"chalk",op:"end",scene:this.sceneId,id:t.id,layers:r}),this.#f(this.#d(s),t.id,i,t.opts.tool,r)}cancel(){let t=this.drawing;if(!t)return;clearTimeout(t.timer),this.drawing=null,t.wet?.release(),this.send({type:"chalk",op:"cancel",scene:this.sceneId,id:t.id});let e=this.wall.strokes.get(t.id)?.touched??new Set;this.wall.drop(t.id),oe[t.opts.tool].kind==="smudge"&&this.wall.revert(game.user.id,e).catch(()=>{})}#d(t){let e=t.painted===!0,i=t.size?this.quiet.whenQuiet():null;return[...t].map(([s,r])=>[s,[...r].map(([o,a])=>[o,Promise.resolve(this.encode(a,e,i))])])}#f(t,e,i,s,r=null){let o=this.keeping.then(async()=>{let a=await this.#p(t);if(r){let l=a.map(([c])=>c);l.length!==r.length&&this.send({type:"chalk",op:"end",scene:this.sceneId,id:e,layers:l})}await this.#m(a,e,i,s)});return this.keeping=o.catch(a=>console.warn(`${j} | chalk could not be kept`,a)),o}async#p(t){let e=[];for(let[i,s]of t){let r=await Promise.all(s.map(async([l,c])=>[l,await c])),o={},a={};for(let[l,c]of r){let h=this.wall.sourceOf(i,l);c!==h&&(a[l]=h,o[l]=c)}Object.keys(o).length&&e.push([i,o,a])}return e}async#m(t,e,i=null,s=this.tool){if(!t.length)return;let r=Date.now(),o={id:If(r,e),at:r};this.redoSteps=[];for(let[c,h,u]of t){for(let[d,f]of Object.entries(h))this.wall.noteSource(c,d,f);try{await this.store.save(this.sceneId,{by:c,tiles:h,step:o,grid:this.grid})}catch(d){console.warn(`${j} | chalk could not be kept`,d);for(let[f,x]of Object.entries(u))this.wall.noteSource(c,f,x);await this.wall.revert(c,Object.keys(u))}}let a=this.grid,l=i?{x0:Math.max(0,i.x0/a.w),y0:Math.max(0,i.y0/a.h),x1:Math.min(1,i.x1/a.w),y1:Math.min(1,i.y1/a.h)}:null;Hooks.callAll("stagecraft.chalk",{type:"chalk",scene:this.sceneId,by:game.user.id,tool:s,colour:this.colour,bounds:l})}#x(t,e,i=this.tool){let s=oe[i];if(s.kind==="smudge")return null;let r=nu(),o={tool:i,size:this.sizes[i],seed:Nf(r)},a=Vh({...t,p:.8},{...e,p:.8},o);this.wall.begin({id:r,by:game.user.id,tool:i,colour:this.colour,magic:s.magic?{...this.magic}:null,everyone:s.kind==="erase"&&game.user.isGM===!0}),this.wall.paint(r,a),this.lastEnd=e;let l=ka(a);return this.#f(this.#d(this.wall.commit(r)),r,l,i).catch(()=>{}),l}#y(t,e){let i=this.wall.fill({x:t.x,y:t.y,by:game.user.id,colour:this.colour});if(!i.ok){this.flash(e,game.i18n.localize(i.reason==="open"?"STAGECRAFT.Chalk.FillOpen":"STAGECRAFT.Chalk.FillOnPaint"));return}this.#f(this.#d(new Map([[game.user.id,i.changed]])),nu(),{x0:t.x-1,y0:t.y-1,x1:t.x+1,y1:t.y+1}).catch(()=>{})}pickColour(t){let e=this.host.backend.paintingAt(t.x,t.y);if(!e)return null;let i=Pf(this.grid,e.x,e.y),s=this.wall.pick(i.x,i.y)??this.host.backend.paintingColour?.(e.x,e.y)??null;return s&&(this.setColour(s),this.flash(t,game.i18n.format("STAGECRAFT.Chalk.Picked",{colour:s}))),s}async undo(){this.drawing&&this.cancel(),this.quiet.release(),await this.keeping;let t=await this.store.undo(this.sceneId,{by:game.user.id});return t?(this.redoSteps.push(t.layers),!0):!1}async redo(){this.quiet.release(),await this.keeping;let t=this.redoSteps.pop();if(!t)return!1;let e=Date.now(),i={id:If(e,nu()),at:e};for(let[s,r]of Object.entries(t))await this.store.save(this.sceneId,{by:s,tiles:r,step:i,grid:this.grid});return!0}receive(t,e){if(!(!t||t.scene!==this.sceneId||e===game.user.id))if(t.op==="begin"){if(!oe[t.tool]||oe[t.tool].kind==="smudge"||oe[t.tool].kind==="fill"||this.remote.has(t.id)||typeof t.id!="string")return;let i=e,s=t.everyone===!0&&game.users?.get(e)?.isGM===!0;this.wall.begin({id:t.id,by:i,tool:t.tool,colour:zs(t.colour)??Oi.white,magic:t.magic??null,everyone:s,live:!0});let r=new so({tool:t.tool,size:Number(t.size)||void 0,steady:Number(t.steady)||0,seed:Number(t.seed)>>>0});this.remote.set(t.id,{by:i,stroke:r,ended:!1,layers:[],timer:setTimeout(()=>this.#g(t.id),6e4)})}else if(t.op==="more"){let i=this.remote.get(t.id);if(!i||i.ended||!Array.isArray(t.s))return;let s=[];for(let r=0;r+2<t.s.length;r+=3)s.push(...i.stroke.add({x:Number(t.s[r]),y:Number(t.s[r+1]),p:Number(t.s[r+2])}));this.wall.paint(t.id,s)}else if(t.op==="end"){let i=this.remote.get(t.id);if(i?.ended){Array.isArray(t.layers)&&(i.layers=t.layers.filter(s=>typeof s=="string"),this.#r());return}if(!i)return;this.wall.paint(t.id,i.stroke.finish()),i.ended=!0,i.layers=(Array.isArray(t.layers)?t.layers:[i.by]).filter(s=>typeof s=="string"),clearTimeout(i.timer),i.timer=setTimeout(()=>this.#g(t.id),sT),this.#r()}else t.op==="cancel"&&this.#g(t.id)}#g(t){let e=this.remote.get(t);e&&(clearTimeout(e.timer),this.remote.delete(t),this.wall.drop(t))}allowedAt(t){return Lf(this.policy(),this.host.description.zones,t.x,t.y)}};var Kx="stagecraft.chalk.kit",Ke=(n,t)=>t?game.i18n.format(n,t):game.i18n.localize(n),ii=n=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${n}</svg>`,gn=Object.freeze({chalk:ii('<path d="M6.5 17.5 16 8" stroke-width="4.2"/><circle cx="4.2" cy="20.2" r=".8" fill="currentColor" stroke="none"/><circle cx="3.2" cy="17.6" r=".6" fill="currentColor" stroke="none"/><circle cx="6.4" cy="21.4" r=".6" fill="currentColor" stroke="none"/>'),magic:ii('<path d="M4.5 19.5 14 10" stroke-width="2.6"/><path d="M17.5 2.8l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" fill="currentColor" stroke="none"/><circle cx="20" cy="12.5" r=".9" fill="currentColor" stroke="none"/><circle cx="11.5" cy="4.5" r=".8" fill="currentColor" stroke="none"/>'),pencil:ii('<path d="M4 20l1.4-4.6L15.6 5.2a1.6 1.6 0 0 1 2.3 0l.9.9a1.6 1.6 0 0 1 0 2.3L8.6 18.6z"/><path d="M13.8 7l3.2 3.2M4 20l3.1-.9"/>'),brush:ii('<path d="M20.5 3.5 11.8 12.2"/><path d="M11 13l-1.6-1.6"/><path d="M9.4 11.4c-2.6-.4-4.6 1.6-4.6 4 0 1.3-.9 2.6-2.3 2.9 3 1.6 8 .6 8.6-3.6.2-1.4-.4-2.6-1.7-3.3z" fill="currentColor" fill-opacity=".3"/>'),spray:ii('<rect x="5.5" y="9" width="8" height="12" rx="2"/><path d="M8 9V6.5h3V9M9.5 6.5V4.5"/><circle cx="16.5" cy="5" r=".8" fill="currentColor" stroke="none"/><circle cx="19" cy="7.5" r=".8" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10" r=".8" fill="currentColor" stroke="none"/><circle cx="20" cy="4" r=".7" fill="currentColor" stroke="none"/>'),smudge:ii('<path d="M3 16c2.6-3.4 4.4 1.6 7-1.6s4.4 1.6 7-1.6" stroke-width="2.4" opacity=".55"/><path d="M14 13.5V6a1.6 1.6 0 0 1 3.2 0v5"/><path d="M17.2 9.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.4"/>'),fill:ii('<path d="M4.5 11.5 11 5l6.6 6.6-6.5 6.5a1.6 1.6 0 0 1-2.2 0l-4.4-4.4a1.6 1.6 0 0 1 0-2.2z"/><path d="M4.6 12.2h12.6"/><path d="M20 14.5c.9 1.4 1.4 2.3 1.4 3a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.6 1.4-3z" fill="currentColor"/>'),eraser:ii('<path d="M8 20h12"/><path d="M5.2 15.6 13.6 7.2a1.8 1.8 0 0 1 2.5 0l3.3 3.3a1.8 1.8 0 0 1 0 2.5L12.5 20H9.6z"/><path d="M9.2 11.6l5.6 5.6"/>'),pick:ii('<path d="M14.5 4.5l5 5-2.2 2.2-5-5z" fill="currentColor" fill-opacity=".35"/><path d="M13.4 8.6 5.5 16.5 4 20l3.5-1.5 7.9-7.9"/>'),undo:ii('<path d="M9 6 4.5 10.5 9 15"/><path d="M4.5 10.5H15a5 5 0 0 1 0 10h-2"/>'),redo:ii('<path d="M15 6l4.5 4.5L15 15"/><path d="M19.5 10.5H9a5 5 0 0 0 0 10h2"/>'),steady:ii('<circle cx="6" cy="18" r="2.2" fill="currentColor" stroke="none"/><path d="M8 16 14.8 9.2" stroke-dasharray="1.6 2.2"/><circle cx="17" cy="7" r="3"/>'),rainbow:ii('<path d="M3 17a9 9 0 0 1 18 0" stroke="#e86a6a"/><path d="M6 17a6 6 0 0 1 12 0" stroke="#e8c96a"/><path d="M9 17a3 3 0 0 1 6 0" stroke="#7ac0e0"/>'),glow:ii('<circle cx="12" cy="12" r="3.5" fill="currentColor"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>'),sparkle:ii('<path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" fill="currentColor" fill-opacity=".35"/><path d="M19 16l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" fill="currentColor" stroke="none"/>'),close:ii('<path d="M6 6l12 12M18 6 6 18"/>'),grip:ii('<circle cx="9" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="17" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="1.2" fill="currentColor" stroke="none"/>')}),lT=(n,t)=>Math.round(100*Math.log(n/t.size.min)/Math.log(t.size.max/t.size.min)),cT=(n,t)=>Math.round(t.size.min*(t.size.max/t.size.min)**(n/100)*10)/10,ru=class{constructor(t,e){this.host=t,this.chalk=e,this.open=null,this.alt=!1,this.#t(),this.offHand=e.onHand(()=>this.refresh()),this.offPointer=e.onPointer(i=>this.#o(i)),this.refresh()}dispose(){this.offHand?.(),this.offPointer?.(),window.removeEventListener("keydown",this.#c,!0),window.removeEventListener("keyup",this.#h,!0),this.el?.remove(),this.ring?.remove(),this.el=this.ring=null}#t(){let t=document.createElement("div");t.className="stagecraft-kit",t.setAttribute("role","toolbar"),t.setAttribute("aria-label",Ke("STAGECRAFT.Kit.Label"));let e=r=>`<button type="button" class="kit-tool" data-tool="${r}" title="${Ke(`STAGECRAFT.Kit.Tool.${r}`)}">${gn[r]}</button>`;t.innerHTML=`
      <div class="kit-grip" title="${Ke("STAGECRAFT.Kit.Move")}">${gn.grip}</div>
      <div class="kit-group">${Gh.map(e).join("")}</div>
      <div class="kit-group">
        <button type="button" class="kit-well" data-act="colour" title="${Ke("STAGECRAFT.Kit.Colour")}"><span></span></button>
        <button type="button" class="kit-size" data-act="size" title="${Ke("STAGECRAFT.Kit.Size")}"><span></span></button>
        <button type="button" data-act="steady" title="">${gn.steady}<b></b></button>
        <button type="button" data-act="pick" title="${Ke("STAGECRAFT.Kit.Pick")}">${gn.pick}</button>
      </div>
      <div class="kit-group kit-magic">
        <button type="button" data-magic="rainbow" title="${Ke("STAGECRAFT.Kit.Rainbow")}">${gn.rainbow}</button>
        <button type="button" data-magic="glow" title="${Ke("STAGECRAFT.Kit.Glow")}">${gn.glow}</button>
        <button type="button" data-magic="sparkle" title="${Ke("STAGECRAFT.Kit.Sparkle")}">${gn.sparkle}</button>
      </div>
      <div class="kit-group">
        <button type="button" data-act="undo" title="${Ke("STAGECRAFT.Kit.Undo")}">${gn.undo}</button>
        <button type="button" data-act="redo" title="${Ke("STAGECRAFT.Kit.Redo")}">${gn.redo}</button>
        <button type="button" data-act="close" title="${Ke("STAGECRAFT.Kit.Close")}">${gn.close}</button>
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
      </div>`,this.host.root.append(t),this.el=t,t.addEventListener("click",this.#a),t.addEventListener("wheel",this.#l,{passive:!1}),t.addEventListener("pointerdown",r=>r.stopPropagation()),this.#n(),this.#s();let i=t.querySelector(".kit-range");i.addEventListener("input",()=>this.chalk.setSize(cT(Number(i.value),oe[this.chalk.tool])));let s=t.querySelector(".kit-swatches");s.innerHTML=Object.entries(Oi).map(([r,o])=>`<button type="button" class="kit-swatch" data-colour="${o}" title="${Ke(`STAGECRAFT.Kit.Colours.${r}`)}" style="--c:${o}"></button>`).join("")+["#1c1a17","#e2483c","#3f7fe0","#8a4fd8"].map(r=>`<button type="button" class="kit-swatch" data-colour="${r}" style="--c:${r}" title="${r}"></button>`).join(""),this.ring=document.createElement("div"),this.ring.className="stagecraft-chalk-cursor",this.ring.hidden=!0,this.ring.innerHTML='<i class="ring"></i><i class="tick across"></i><i class="tick down"></i><i class="cross"></i><i class="dot"></i><i class="strike"></i>',this.host.root.append(this.ring),window.addEventListener("keydown",this.#c,!0),window.addEventListener("keyup",this.#h,!0),this.#e(this.#i())}#i(){try{return JSON.parse(globalThis.localStorage?.getItem(Kx)??"null")}catch{return null}}#e(t){let e=this.host.root.getBoundingClientRect(),i=this.el.offsetWidth||86,s=this.el.offsetHeight||440,r=Math.max(4,Math.min(e.width-i-4,t?.x??96)),o=Math.max(4,Math.min(e.height-s-4,t?.y??Math.min(96,(e.height-s)*.4)));this.el.style.left=`${r}px`,this.el.style.top=`${o}px`,this.el.classList.toggle("kit-right",r+i/2>e.width/2),this.at={x:r,y:o,set:t?.x!==void 0}}#n(){let t=this.el.querySelector(".kit-grip"),e=null;t.addEventListener("pointerdown",s=>{e={x:s.clientX,y:s.clientY,at:{...this.at}},t.setPointerCapture(s.pointerId),s.preventDefault()}),t.addEventListener("pointermove",s=>{e&&this.#e({x:e.at.x+s.clientX-e.x,y:e.at.y+s.clientY-e.y})});let i=()=>{if(e){e=null;try{globalThis.localStorage?.setItem(Kx,JSON.stringify(this.at))}catch{}}};t.addEventListener("pointerup",i),t.addEventListener("pointercancel",i)}#s(){let t=this.el.querySelector(".kit-sv"),e=this.el.querySelector(".kit-hue"),i=this.el.querySelector(".kit-hex"),s=(r,o)=>{let a=!1,l=h=>{let u=r.getBoundingClientRect();o(Math.max(0,Math.min(1,(h.clientX-u.left)/u.width)),Math.max(0,Math.min(1,(h.clientY-u.top)/u.height)))};r.addEventListener("pointerdown",h=>{a=!0,r.setPointerCapture(h.pointerId),l(h),h.preventDefault()}),r.addEventListener("pointermove",h=>{a&&l(h)});let c=()=>{a&&(a=!1,this.chalk.setColour(this.chalk.colour))};r.addEventListener("pointerup",c),r.addEventListener("pointercancel",c)};s(t,(r,o)=>{let a=this.hsv??hs(this.chalk.colour);this.hsv={h:a.h,s:r,v:1-o},this.chalk.setColour(La(this.hsv),{remember:!1})}),s(e,r=>{let o=this.hsv??hs(this.chalk.colour);this.hsv={h:r*359.9,s:Math.max(.15,o.s),v:Math.max(.2,o.v)},this.chalk.setColour(La(this.hsv),{remember:!1})}),i.addEventListener("change",()=>{let r=zs(i.value);r&&(this.hsv=hs(r),this.chalk.setColour(r))}),i.addEventListener("keydown",r=>{r.stopPropagation(),r.key==="Enter"&&i.blur()})}#r(){let t=this.el.querySelector(".kit-sv"),e=this.hsv??hs(this.chalk.colour),i=this.el.querySelector(".kit-hue"),s=i.getContext("2d"),r=s.createLinearGradient(0,0,i.width,0);for(let u=0;u<=6;u++)r.addColorStop(u/6,`hsl(${u*60},100%,50%)`);s.fillStyle=r,s.fillRect(0,0,i.width,i.height),s.lineWidth=2,s.strokeStyle="#111",s.strokeRect(e.h/360*i.width-2,1,4,i.height-2),s.strokeStyle="#fff",s.lineWidth=1,s.strokeRect(e.h/360*i.width-2,1,4,i.height-2);let o=t.getContext("2d"),{width:a,height:l}=t;o.fillStyle=La({h:e.h,s:1,v:1}),o.fillRect(0,0,a,l);let c=o.createLinearGradient(0,0,a,0);c.addColorStop(0,"#fff"),c.addColorStop(1,"rgba(255,255,255,0)"),o.fillStyle=c,o.fillRect(0,0,a,l);let h=o.createLinearGradient(0,0,0,l);h.addColorStop(0,"rgba(0,0,0,0)"),h.addColorStop(1,"#000"),o.fillStyle=h,o.fillRect(0,0,a,l),o.lineWidth=2,o.strokeStyle=e.v>.55?"#111":"#fff",o.beginPath(),o.arc(e.s*a,(1-e.v)*l,5,0,Math.PI*2),o.stroke()}refresh(){if(!this.el)return;let t=this.chalk,e=t.tool,i=this.el.hidden;this.el.hidden=!e,e?i&&this.#e(this.at?.set?this.at:null):(this.open=null,this.picking=!1,this.#o(null));for(let d of this.el.querySelectorAll(".kit-tool"))d.classList.toggle("on",d.dataset.tool===e);let s=oe[e]??null,r=s&&!["erase","smudge"].includes(s.kind);this.el.querySelector(".kit-well").style.setProperty("--c",t.colour),this.el.querySelector(".kit-well").disabled=!r;let o=s&&s.kind!=="fill",a=t.sizes[e]??0;this.el.querySelector(".kit-size span").style.setProperty("--d",`${Math.max(3,Math.min(26,3+Math.sqrt(a)*3.2))}px`),this.el.querySelector(".kit-size").disabled=!o;let c=this.el.querySelector('[data-act="steady"]');c.title=Ke("STAGECRAFT.Kit.Steady",{level:Ke(`STAGECRAFT.Kit.SteadyLevel.${t.steady}`)}),c.querySelector("b").textContent=t.steady?String(t.steady):"",c.classList.toggle("on",t.steady>0);let h=this.el.querySelector(".kit-magic");h.hidden=e!=="magic";for(let d of h.querySelectorAll("[data-magic]"))d.classList.toggle("on",!!t.magic[d.dataset.magic]);this.el.querySelector('[data-act="pick"]').classList.toggle("on",this.picking===!0);for(let d of this.el.querySelectorAll(".kit-pop"))d.hidden=!0;let u=(d,f)=>{d.hidden=!1,d.style.top=`${Math.max(0,f.offsetTop-10)}px`};if(this.open==="colour"&&r){u(this.el.querySelector(".kit-pop-colour"),this.el.querySelector(".kit-well"));let d=this.el.querySelector(".kit-hex");document.activeElement!==d&&(d.value=t.colour),this.el.querySelector(".kit-now").style.setProperty("--c",t.colour),this.el.querySelector(".kit-recent").innerHTML=t.recent.map(f=>`<button type="button" class="kit-swatch" data-colour="${f}" style="--c:${f}" title="${f}"></button>`).join(""),this.#r()}else this.open==="size"&&o&&(u(this.el.querySelector(".kit-pop-size"),this.el.querySelector(".kit-size")),this.el.querySelector(".kit-range").value=String(lT(a,s)),this.el.querySelector(".kit-size-n").textContent=Ke("STAGECRAFT.Kit.SizePx",{n:a}));t.pointer&&this.#o(t.pointer)}#a=t=>{let e=t.target.closest("button");if(!e||e.disabled)return;let i=this.chalk;if(e.dataset.tool){this.picking=!1,i.choose(e.dataset.tool);return}if(e.dataset.colour){this.hsv=hs(e.dataset.colour),i.setColour(e.dataset.colour);return}if(e.dataset.magic){i.setMagic({[e.dataset.magic]:!i.magic[e.dataset.magic]});return}let s=e.dataset.act;s==="colour"||s==="size"?(this.open=this.open===s?null:s,this.hsv=hs(i.colour),this.refresh()):s==="steady"?i.setSteady((i.steady+1)%ro.length):s==="pick"?(this.picking=!this.picking,this.refresh()):s==="undo"?i.undo().catch(()=>{}):s==="redo"?i.redo().catch(()=>{}):s==="close"&&i.putAway()};#l=t=>{t.target.closest(".kit-size, .kit-pop-size")&&(t.preventDefault(),this.chalk.nudgeSize(t.deltaY<0?1:-1))};#c=t=>{let e=this.chalk;if(!e.tool||t.target?.closest?.("input, textarea, [contenteditable]"))return;if(t.key==="Alt"){this.alt=!0,e.pointer&&this.#o(e.pointer);return}let i=!0;t.key==="["?e.nudgeSize(-1):t.key==="]"?e.nudgeSize(1):(t.ctrlKey||t.metaKey)&&t.code==="KeyZ"?(t.shiftKey?e.redo():e.undo()).catch(()=>{}):(t.ctrlKey||t.metaKey)&&t.code==="KeyY"?e.redo().catch(()=>{}):i=!1,i&&(t.preventDefault(),t.stopPropagation())};#h=t=>{t.key==="Alt"&&(this.alt=!1,this.chalk.pointer&&this.#o(this.chalk.pointer))};takesPick(){let t=this.picking||this.alt;return this.picking&&(this.picking=!1,this.refresh()),t}#o(t){let e=this.ring;if(!e)return;let i=this.chalk;if(!t||!i.tool){e.hidden||(e.hidden=!0);return}let s=oe[i.tool],r=this.picking||this.alt||s.kind==="fill",o=r?0:Math.round(Math.max(1.5,(i.sizes[i.tool]??8)/2*(i.scale(t)??1))*2)/2,a=`${r}|${o}|${s.kind}|${i.blocked===!0}|${i.colour}`;if(a!==this.look){this.look=a;let l=["stagecraft-chalk-cursor"];r&&l.push("exact"),s.kind==="erase"&&l.push("erase"),i.blocked&&l.push("blocked"),!r&&["erase","smudge"].includes(s.kind)&&l.push("nodot"),!r&&o<6&&l.push("small"),e.className=l.join(" "),e.style.setProperty("--r",`${o}px`),e.style.setProperty("--c",i.colour)}e.hidden&&(e.hidden=!1),e.style.transform=`translate3d(${t.x}px, ${t.y}px, 0)`}};var Vs=Object.freeze({every:2e4,stale:75e3,fine:40,poor:24,window:300,gap:400}),hT=Object.freeze(["lit","low","plain"]);function Qx(n,{gap:t=Vs.gap,least:e=10}={}){let i=(n??[]).filter(r=>Number.isFinite(r)&&r>0&&r<=t);if(i.length<e)return{fps:null,worst:null,n:i.length};let s=[...i].sort((r,o)=>r-o);return{fps:Math.round(1e3/s[Math.floor(s.length/2)]),worst:Math.round(s[s.length-1]),n:i.length}}var uT=(n,t)=>n==="flat"||t==="flat"?"plain":t==="low"?"low":"lit";function dT(n){let t=typeof n=="string"?n.trim():"",e=/^ANGLE \((.*)\)$/i.exec(t);if(e){let i=e[1].split(",").map(s=>s.trim());t=i.length>1?i[1]:i[0]}return t=t.replace(/\s*(Direct3D\d*|OpenGL|Metal|vs_\d_\d|ps_\d_\d|\(0x[0-9a-f]+\)).*$/i,"").replace(/\s{2,}/g," ").trim(),t.length>34?`${t.slice(0,33)}\u2026`:t}var lo=(n,t,e)=>(typeof n=="number"||typeof n=="string"&&n.trim()!=="")&&Number.isFinite(Number(n))?Math.max(t,Math.min(e,Math.round(Number(n)))):null,fT=(n,t)=>typeof n=="string"?n.slice(0,t):"";function Qf(n){return{v:1,picture:uT(n.backend,n.tier),fps:lo(n.stats?.fps,0,1e3),worst:lo(n.stats?.worst,0,6e4),probe:n.probe==null?null:Math.round(Number(n.probe)*10)/10,gpu:dT(n.gpu),dpr:Math.round((Number(n.dpr)||1)*100)/100,size:[lo(n.size?.[0],0,2e4)??0,lo(n.size?.[1],0,2e4)??0],losses:lo(n.losses,0,99)??0,failures:lo(n.failures,0,9999)??0,hidden:n.hidden===!0,scene:fT(n.scene,60)}}function ty(n){return!n||n.type!=="health"||n.op==="ask"||n.v!==1||!hT.includes(n.picture)?null:Qf({backend:n.picture==="plain"?"flat":"three",tier:n.picture==="low"?"low":n.picture==="plain"?"flat":"high",stats:{fps:n.fps,worst:n.worst},probe:n.probe,gpu:n.gpu,dpr:n.dpr,size:n.size,losses:n.losses,failures:n.failures,hidden:n.hidden,scene:n.scene})}function pT(n,t,e){return!n||e-t>Vs.stale?"stale":n.hidden?"idle":n.losses>=2||n.failures>0||n.fps!=null&&n.fps<Vs.poor?"bad":n.fps!=null&&n.fps<Vs.fine?"warn":n.picture==="plain"?"plain":"ok"}var Jf=Object.freeze({lit:"lit",low:"low",plain:"plain"});function mT({id:n,name:t},e,i){let s=pT(e?.report,e?.at??0,i),r=e?.report;if(!r||s==="stale")return{id:n,name:t,level:"stale",text:"no stage",tip:`${t}: not on a stage, or not heard from for a while`};let o=r.fps==null?"\u2026":`${r.fps} fps`,a=[`${t}: the ${Jf[r.picture]} stage${r.fps==null?", not measured yet":` at ${o}`}${r.worst!=null?`, longest frame ${r.worst} ms`:""}`,r.gpu?`Graphics: ${r.gpu}`:"Graphics: not known",`Window: ${r.size[0]} \xD7 ${r.size[1]} at ${r.dpr}x`,r.probe!=null?`Start-up test: a picture every ${r.probe} ms`:null,r.losses?`Lost its graphics context ${r.losses} time${r.losses===1?"":"s"}`:null,r.failures?`${r.failures} frame${r.failures===1?"":"s"} failed`:null,r.hidden?"The tab is in the background":null].filter(Boolean).join(`
`);return{id:n,name:t,level:s,text:s==="idle"?`${Jf[r.picture]} \xB7 away`:`${Jf[r.picture]} \xB7 ${o}`,tip:a}}var Jx=Object.freeze({bad:4,warn:3,plain:2,ok:1,idle:0,stale:0});function ey(n,t,e){let i=n.map(l=>mT(l,t.get(l.id),e)).sort((l,c)=>Jx[c.level]-Jx[l.level]||l.name.localeCompare(c.name)),s={ok:0,plain:0,warn:0,bad:0,idle:0,stale:0};for(let l of i)s[l.level]++;let r=s.bad?"bad":s.warn?"warn":s.plain?"plain":s.ok?"ok":"stale",a=[`${i.length-s.stale} of ${i.length} on a stage`];return s.bad&&a.push(`${s.bad} struggling`),s.warn&&a.push(`${s.warn} slow`),s.plain&&a.push(`${s.plain} on the plain stage`),{chips:i,level:r,counts:s,line:a.join(" \xB7 ")}}var gT=(n,t)=>t?game.i18n.format(`STAGECRAFT.Health.${n}`,t):game.i18n.localize(`STAGECRAFT.Health.${n}`),ou=class{constructor(t){this.host=t,this.intervals=[],this.lastAt=null,this.timer=setInterval(()=>this.send(),Vs.every),this.first=setTimeout(()=>this.send(),4e3),this.later=null}stop(){clearInterval(this.timer),clearTimeout(this.first),clearTimeout(this.later)}frame(t,e=1){this.lastAt!==null&&(this.intervals.push((t-this.lastAt)*e),this.intervals.length>Vs.window&&this.intervals.shift()),this.lastAt=t}report(){let t=this.host;return Qf({backend:t.backend?.name,tier:t.backend?.name==="flat"?"flat":ys(),stats:Qx(this.intervals),probe:t.speed?.last?.median??null,gpu:zn().renderer,dpr:window.devicePixelRatio,size:[t.root?.clientWidth??0,t.root?.clientHeight??0],losses:t.losses,failures:t.guard?.total??0,hidden:document.hidden===!0,scene:t.scene?.name})}send(){let t=this.host;if(!t.running||!t.channel)return;let e=this.report();t.healthBoard?.take(game.user.id,e),t.channel.send({type:"health",...e})}changed(){clearTimeout(this.later),this.later=setTimeout(()=>this.send(),1200)}receive(t){t?.op==="ask"&&(clearTimeout(this.later),this.later=setTimeout(()=>this.send(),100+Math.random()*1200))}},au=class{constructor(t){this.host=t,this.table=new Map,this.el=document.createElement("div"),this.el.className="stagecraft-health",this.el.innerHTML='<button type="button" class="pill" aria-expanded="false"><i class="dot"></i><span></span></button><div class="panel" hidden><p class="line"></p><ul></ul></div>',t.root.append(this.el),this.pill=this.el.querySelector(".pill"),this.panel=this.el.querySelector(".panel"),this.pill.addEventListener("click",this.#t),this.timer=setInterval(()=>this.render(),5e3),this.render()}dispose(){clearInterval(this.timer),this.pill?.removeEventListener("click",this.#t),this.el?.remove(),this.el=null}take(t,e){this.table.set(t,{report:e,at:Date.now()}),this.render()}receive(t,e){let i=ty(t);i&&this.take(e,i)}#t=()=>{let t=this.panel.hidden;this.panel.hidden=!t,this.pill.setAttribute("aria-expanded",t?"true":"false"),t&&(this.host.channel?.send({type:"health",op:"ask"}),this.host.health?.send()),this.render()};close(){return!this.el||this.panel.hidden?!1:(this.panel.hidden=!0,this.pill.setAttribute("aria-expanded","false"),!0)}render(){if(!this.el)return;let t=game.users.filter(s=>s.active).map(s=>({id:s.id,name:s.name})),e=ey(t,this.table,Date.now());if(this.pill.dataset.level=e.level,this.pill.title=e.line,this.pill.querySelector("span").textContent=gT("Label",{n:e.chips.length-e.counts.stale,of:e.chips.length}),this.panel.hidden)return;this.panel.querySelector(".line").textContent=e.line,this.panel.querySelector("ul").replaceChildren(...e.chips.map(s=>{let r=document.createElement("li");r.dataset.level=s.level,r.title=s.tip;let o=document.createElement("b");o.textContent=s.name;let a=document.createElement("span");return a.textContent=s.text,r.append(o,a),r}))}};var lu=()=>({...Bn,...globalThis.__stagecraftSpeed??{}}),iy=n=>Math.round(n*10)/10,cu=class{constructor(t){this.host=t,this.probe=null,this.strikes=0,this.hard=0,this.last=null,this.timer=null,this.starting=null,this.gaps=[],this.watch=null,this.away=()=>this.#e(),document.addEventListener("visibilitychange",this.away),this.#t()}get wanted(){if(Ja()!=="auto"||this.host.backend?.name!=="three")return!1;let t=Du();return!(t&&t.ok)}#t(){let t=null,e=i=>{this.watch=null,t!==null&&this.gaps.push(i-t),t=i,this.gaps.length<40&&!this.host.running&&(this.watch=requestAnimationFrame(e))};this.watch=requestAnimationFrame(e)}start(){if(this.cancel(),!this.wanted)return;let t=this.starting={},e=()=>{this.starting===t&&(this.timer=setTimeout(()=>this.#i(),lu().settle))};game.ready?e():Hooks.once("ready",e)}cancel(){clearTimeout(this.timer),this.timer=null,this.probe=null,this.starting=null}stop(){this.cancel(),this.watch!==null&&cancelAnimationFrame(this.watch),this.watch=null,document.removeEventListener("visibilitychange",this.away)}#i(){if(this.timer=null,!(!this.host.running||!this.wanted)){if(document.hidden){this.timer=setTimeout(()=>this.#i(),2e3);return}this.probe=new ja(lu())}}#e(){!document.hidden||!this.probe||(this.probe=null,this.timer=setTimeout(()=>this.#i(),lu().settle))}feed(t){let e=this.probe;e&&(e.push(t),e.done&&this.#n(e))}#n(t){this.probe=null;let e=lu(),i=t.result(),s=kp(this.gaps,e),r=Dp(i,{limits:e,display:s,cap:this.host.pace?.cap??60,patient:t.elapsed>=e.patience}),o=ys();this.last={verdict:r,median:iy(i.median),display:iy(s),at:Date.now()},console.info(`${j} | speed test: a picture every ${this.last.median} ms at the median (${i.n} gaps; the display allows ${this.last.display} ms, ${zn().renderer||"unknown graphics"}): ${r}`),this.host.health?.changed();let a=Np({tier:o,verdict:r,strikes:this.strikes,hard:this.hard});if(this.strikes=a.strikes,this.hard=a.hard,a.to){this.#s(a.to,r);return}if(r==="ok"){Nu({ok:!0});return}(r==="slow"||r==="very-slow")&&(this.timer=setTimeout(()=>this.#i(),e.again))}#s(t,e){Nu({tier:t}),ui.notifications?.info(game.i18n.localize(t==="flat"?"STAGECRAFT.Notify.SpeedFlat":"STAGECRAFT.Notify.SpeedLow")),console.info(`${j} | speed test: this computer is moved down to the ${t} stage (${e}, twice)`),this.host.rebuild().catch(i=>console.warn(`${j} | could not draw the lighter stage`,i))}};var xT=450,hu=16,uu=class{constructor(t){this.host=t,this.el=null,this.key=null,this.say=null,this.timer=null}hover(t,e,i){this.#t(t,e,i,()=>Rx(this.host.stage?.cards.get(t)?.person))}hoverWall(t,e,i){if(!game.user.isGM||!this.host.chalk)return this.#t(null,e,i);this.#t(`wall:${Math.round(t.x/24)}:${Math.round(t.y/24)}`,e,i,()=>{let s=this.host.chalk.painterAt(t);return s?{name:game.i18n.format("STAGECRAFT.Chalk.PaintedBy",{name:s}),text:""}:null})}#t(t,e,i,s=null){if(this.at={x:e,y:i},t!==this.key){this.hide(),this.key=t,this.say=s,t&&(this.timer=setTimeout(()=>this.#i(),xT));return}this.el?.classList.contains("shown")&&this.#e(e,i)}hide(){clearTimeout(this.timer),this.timer=null,this.key=null,this.el?.classList.remove("shown")}dispose(){this.hide(),this.el?.remove(),this.el=null}#i(){this.timer=null;let t=this.host;if(!this.key||!t.running||t.dragging||t.chalk?.inHand)return;let e=this.say?.();if(!e)return;this.el||(this.el=document.createElement("div"),this.el.className="stagecraft-tip",this.el.setAttribute("role","tooltip"),t.root.append(this.el)),this.el.replaceChildren();let i=document.createElement("div");if(i.className="tip-name",i.textContent=e.name,this.el.append(i),e.text){let s=document.createElement("div");s.className="tip-text",s.textContent=e.text,this.el.append(s)}this.el.classList.add("shown"),this.#e(this.at.x,this.at.y)}#e(t,e){let i=this.el,s=i.offsetWidth,r=i.offsetHeight,o=Math.max(8,Math.min(t+hu,window.innerWidth-s-8)),a=e+hu+r>window.innerHeight-8?Math.max(8,e-hu-r):e+hu;i.style.left=`${Math.round(o)}px`,i.style.top=`${Math.round(a)}px`}};var ny=Object.freeze(["face","balloon","mark"].map(n=>Object.freeze({kind:n,ids:Object.freeze(pl.filter(t=>gi[t].kind===n))}))),NP=Object.freeze(["floor","down","choose","sheet"]);function sy({isGM:n=!1,mayEmote:t=!1,person:e=null,speaker:i=!1,down:s=!1,chosen:r=!1,sheet:o=!1}={}){let a=[];if(n&&(a.push({id:"floor",on:!!i}),a.push({id:"down",on:!!s}),a.push({id:"choose",on:!!r})),o&&a.push({id:"sheet",on:!1}),!t&&!a.length)return null;let l=e?.emote;return{emotes:!!t,kept:l?.id&&!l.once&&gi[l.id]?l.id:null,actions:a}}function ry(n,t,e,i,s,r,o=8){let a=n+6,l=t+6;return a+e>s-o&&(a=Math.max(o,n-6-e)),l+i>r-o&&(l=Math.max(o,r-o-i)),{left:Math.round(a),top:Math.round(l)}}var du=(n,t,e)=>Math.max(t,Math.min(e,n)),fu=n=>Math.round(n*1e3)/1e3;function pu(n){return!Array.isArray(n)||n.length<2||!Number.isFinite(n[0])||!Number.isFinite(n[1])?null:[fu(du(n[0],0,1)),fu(du(n[1],0,1))]}var oy=(n,t)=>Array.isArray(n)&&n[0]===t[0]&&n[1]===t[1],fs=(n,t,e)=>typeof n?.id=="string"&&n.id?n.id:`${e}-${t+1}`;function ay(n,t,e){let i=pu(e);if(!i||!Array.isArray(n))return n;let s=n.findIndex((r,o)=>fs(r,o,"mark")===t);return s<0||oy(n[s].at,i)?n:n.map((r,o)=>o===s?{...r,at:i}:r)}function ly(n,t,e,i){let s=pu(i);if(!s||!Array.isArray(n))return n;let r=n.findIndex((a,l)=>fs(a,l,"zone")===t),o=n[r]?.shape;return r<0||!Array.isArray(o)||!(e>=0&&e<o.length)||oy(o[e],s)?n:n.map((a,l)=>l===r?{...a,shape:o.map((c,h)=>h===e?s:c)}:a)}function cy(n,t,e,i){if(!Array.isArray(n)||!Number.isFinite(e)||!Number.isFinite(i))return n;let s=n.findIndex((d,f)=>fs(d,f,"zone")===t),r=n[s];if(s<0||!Array.isArray(r?.shape))return n;let o=[...r.shape,...Array.isArray(r.floor)?r.floor:[]].filter(d=>Array.isArray(d)),a=[Math.min(...o.map(d=>d[0])),Math.min(...o.map(d=>d[1]))],l=[Math.max(...o.map(d=>d[0])),Math.max(...o.map(d=>d[1]))],c=du(e,-a[0],1-l[0]),h=du(i,-a[1],1-l[1]);if(Math.abs(c)<5e-4&&Math.abs(h)<5e-4)return n;let u=d=>d.map(f=>[fu(f[0]+c),fu(f[1]+h)]);return n.map((d,f)=>f===s?{...d,shape:u(d.shape),...Array.isArray(d.floor)?{floor:u(d.floor)}:{}}:d)}function hy(n,t,e,i=null){if(!Array.isArray(n))return n;let s=n.findIndex((c,h)=>fs(c,h,"zone")===t),r=n[s]?.shape;if(s<0||!Array.isArray(r)||!(e>=0&&e<r.length))return n;let o=r[e],a=r[(e+1)%r.length],l=pu(i)??pu([(o[0]+a[0])/2,(o[1]+a[1])/2]);return n.map((c,h)=>h===s?{...c,shape:[...r.slice(0,e+1),l,...r.slice(e+1)]}:c)}function uy(n,t,e){if(!Array.isArray(n))return n;let i=n.findIndex((r,o)=>fs(r,o,"zone")===t),s=n[i]?.shape;return i<0||!Array.isArray(s)||s.length<=3||!(e>=0&&e<s.length)?n:n.map((r,o)=>o===i?{...r,shape:s.filter((a,l)=>l!==e)}:r)}function tp(n){let t=(n??[]).filter(e=>Array.isArray(e));return t.length?[t.reduce((e,i)=>e+i[0],0)/t.length,t.reduce((e,i)=>e+i[1],0)/t.length]:null}function dy(n){let t=[];for(let e of n?.marks??[])t.push({kind:"mark",id:e.id,at:e.at,label:e.label??e.id});for(let e of n?.zones??[]){(e.shape??[]).forEach((s,r)=>t.push({kind:"vertex",id:e.id,index:r,at:s,label:e.name??e.id}));let i=tp(e.shape);i&&t.push({kind:"zone",id:e.id,at:i,label:e.name??e.id})}return t}var yT=.45,Ua=()=>(globalThis.game?.time?.serverTime??Date.now())/1e3,fy=Promise.resolve();function ps(n){let t=fy.then(n,n);return fy=t.catch(e=>console.warn(`${j} | a write to the stage failed`,e)),t}function np(n,t=null){if(t?.scene?.id===n.id&&t.stage)return t.stage;let{usable:e,scene:i}=Ks(n);return e?new ar(i,Mo(n),{clock:Ua}):null}function Ba(n,t){return!game.user?.isGM||!t?.length?Promise.resolve(!1):ps(async()=>{let e=Un(n),i=Hm(e,t,Ua()+yT);return await n.update({[`flags.${j}.published.cards`]:i}),!0})}async function za(n,t,e={},i=null){let s=np(n,i);if(!s)return[];let r=s.formationMoves(t,e);return await Ba(n,r),r}async function mu(n,{gait:t="walk"}={}){let e=Gm(Un(n),{gait:t});return await Ba(n,e),e}function gu(n,t=null,e=null){if(!game.user?.isGM)return Promise.resolve(0);let i=np(n,t);if(!i)return Promise.resolve(0);let s=i.exportPlaces();return ps(async()=>{let r=Un(n),o=Wm(r,s,e),a=o.filter((l,c)=>l!==r[c]).length;return a&&(await n.update({[`flags.${j}.published.cards`]:o}),Hooks.callAll("stagecraft.keep",{scene:n.id,changed:a,homes:o.filter(l=>Array.isArray(l.home)).map(l=>({id:l.id,home:l.home,homeYaw:l.homeYaw??0}))})),a})}async function xu(n,t){if(!game.user?.isGM||!Array.isArray(t)||t.length!==2||!t.every(s=>Number.isFinite(s)&&s>=0&&s<=1))return!1;let e=[Math.round(t[0]*1e3)/1e3,Math.round(t[1]*1e3)/1e3],i=n?.flags?.[j]?.stage?.chalk?.box;return Array.isArray(i)&&i[0]===e[0]&&i[1]===e[1]?!1:(await n.update({[`flags.${j}.stage.chalk.box`]:e}),Hooks.callAll("stagecraft.keepBox",{scene:n.id,at:e}),!0)}function Ha(n,t){return!game.user?.isGM||!t?Promise.resolve(!1):ps(async()=>{let e=n?.flags?.[j]?.stage;if(!e)return!1;let i=Array.isArray(e.marks)?e.marks:[],s=Array.isArray(e.zones)?e.zones:[],r=i,o=s;t.mark?r=ay(i,t.mark.id,t.mark.at):t.vertex?o=ly(s,t.vertex.id,t.vertex.index,t.vertex.at):t.zone?o=cy(s,t.zone.id,t.zone.dx,t.zone.dy):t.addVertex?o=hy(s,t.addVertex.id,t.addVertex.after,t.addVertex.at??null):t.removeVertex&&(o=uy(s,t.removeVertex.id,t.removeVertex.index));let a={};return r!==i&&(a[`flags.${j}.stage.marks`]=r),o!==s&&(a[`flags.${j}.stage.zones`]=o),Object.keys(a).length?(await n.update(a),Hooks.callAll("stagecraft.keepStage",{scene:n.id,marks:r.map((l,c)=>({id:fs(l,c,"mark"),at:l.at})),zones:o.map((l,c)=>({id:fs(l,c,"zone"),shape:l.shape,...Array.isArray(l.floor)?{floor:l.floor}:{}}))}),!0):!1})}async function yu(n,t=null){let e=np(n,t);if(!e)return[];let i=e.marks.map(o=>({...o,capacity:o.capacity-(e.resting.get(o.id)?.size??0)})).filter(o=>o.capacity>0),s=[...e.cards.values()].filter(o=>!o.mark&&o.holder===null).map(o=>({id:o.id,X:o.walk?o.walk.to.X:o.puppet.x,Z:o.walk?o.walk.to.Z:o.Z})),r=nl(i,s).map(({card:o,mark:a})=>({id:o,mark:a,gait:"hurry",still:!0,packed:!1}));return await Ba(n,r),r}var co=n=>n?.flags?.[j]?.live?.life!==!1;function ho(n){let t=n?.flags?.[j]?.live?.board;return typeof t=="boolean"?t:n?.flags?.[j]?.stage?.board===!0}var vu=(n,t)=>n.update({[`flags.${j}.live.life`]:!!t}),_u=(n,t)=>n.update({[`flags.${j}.live.board`]:!!t});function uo(n,t,e){return game.user?.isGM?ps(async()=>{let i=Un(n);if(!i.some(r=>r.id===t))return!1;let s=i.map(r=>{if(r.id!==t)return r;let o={...r};return e?o.down=!0:delete o.down,o});return await n.update({[`flags.${j}.published.cards`]:s}),!0}):Promise.resolve(!1)}var sp=n=>n?.flags?.[j]?.live?.speaker??null,fo=(n,t)=>n.update({[`flags.${j}.live.speaker`]:typeof t=="string"?t:null}),Mu=n=>n?.flags?.[j]?.live?.turn??null;function py(n,t){if(!game.user?.isGM)return Promise.resolve(!1);let e=typeof t=="string"?t:null;return Mu(n)===e?Promise.resolve(!1):n.update({[`flags.${j}.live.turn`]:e}).then(()=>!0)}function my(n,t,e){if(!game.user?.isGM)return Promise.resolve(!1);let i=cs(e);return ps(async()=>{let s=Un(n),r=s.find(a=>a.id===t);if(!r||V0(r.badges,i))return!1;let o=s.map(a=>{if(a.id!==t)return a;let l={...a};return i.length?l.badges=i:delete l.badges,l});return await n.update({[`flags.${j}.published.cards`]:o}),!0})}function Ga(n,t,e,{keep:i=!1}={}){if(!game.user?.isGM)return Promise.resolve(!1);let s=Fm(e,{keep:i,t0:Ua()+vT});return s?ps(async()=>{let r=Un(n);return r.some(o=>o.id===t)?(await n.update({[`flags.${j}.published.cards`]:r.map(o=>o.id===t?{...o,emote:s}:o)}),!0):!1}):Promise.resolve(!1)}var vT=.25,ep=new Set;function gy(n){if(typeof n!="function")throw new TypeError("a moments provider must be a function of the scene");return ep.add(n),()=>ep.delete(n)}var ip=new Set;function xy(n){if(typeof n!="function")throw new TypeError("a cover provider must be a function");return ip.add(n),()=>ip.delete(n)}function rp(){let n=[];for(let t of ip)try{let e=t();Array.isArray(e)&&n.push(...e.filter(i=>Array.isArray(i?.rect)||Array.isArray(i?.circle)))}catch(e){console.warn(`${j} | a cover provider failed`,e)}return n}function op(n,t,e){let i=r=>e.ox+(r-t.left)/e.s,s=r=>e.oy+(r-t.top)/e.s;return n.map(r=>r.rect?{rect:[i(r.rect[0]),s(r.rect[1]),i(r.rect[2]),s(r.rect[3])]}:{circle:[i(r.circle[0]),s(r.circle[1]),r.circle[2]/e.s]})}function yy(n){let t=[];for(let e of ep)try{let i=e(n);Array.isArray(i)&&t.push(...i.filter(s=>s&&typeof s.label=="string"&&typeof s.run=="function"))}catch(i){console.warn(`${j} | a moments provider failed`,i)}return t}var vy="stagecraft.emoteKeep",po=n=>game.i18n.localize(`STAGECRAFT.Menu.${n}`),_y=(n,t)=>!!n&&!!t&&Ya(n,t,{handsOff:!1});function My(n,t){let e=n?.actor?globalThis.game?.actors?.get?.(n.actor):null;return e?.sheet&&(t?.isGM||e.testUserPermission?.(t,"OBSERVER"))?e:null}var ap=new Map,_T=n=>(ap.has(n)||ap.set(n,`data:image/svg+xml;charset=utf-8,${encodeURIComponent(gi[n].svg)}`),ap.get(n)),bu=class{constructor(t){this.host=t,this.el=null,this.card=null,this.keep=!1;try{this.keep=globalThis.localStorage?.getItem(vy)==="1"}catch{}this.onDown=e=>{this.el&&!this.el.contains(e.target)&&this.close()},this.onKey=e=>{this.el&&e.key==="Escape"&&(e.preventDefault(),e.stopPropagation(),this.close())}}get isOpen(){return!!this.el}open(t,e,i){this.close();let s=this.host,r=s.stage?.cards.get(t);if(!r||s.dragging||s.chalk?.inHand)return!1;let o=game.user,a=sy({isGM:!!o?.isGM,mayEmote:_y(r.person,o),person:r.person,speaker:s.stage.speaker===t,down:!!r.downTo,chosen:!!s.selected?.has(t),sheet:!!My(r.person,o)});if(!a)return!1;this.card=t,this.el=this.#t(r.person,a),document.body.append(this.el);try{this.el.showPopover?.()}catch{}let l=ry(e,i,this.el.offsetWidth,this.el.offsetHeight,window.innerWidth,window.innerHeight);return this.el.style.left=`${l.left}px`,this.el.style.top=`${l.top}px`,document.addEventListener("pointerdown",this.onDown,!0),window.addEventListener("keydown",this.onKey,!0),this.el.focus({preventScroll:!0}),!0}close(){document.removeEventListener("pointerdown",this.onDown,!0),window.removeEventListener("keydown",this.onKey,!0),this.el?.remove(),this.el=null,this.card=null}dispose(){this.close()}async emote(t,e,i=this.keep){let s=this.host;return game.user?.isGM?Ga(s.scene,t,e,{keep:i}):game.users?.activeGM?(s.channel?.send({type:"emote",scene:s.scene.id,card:t,emote:e,keep:!!i}),!0):(globalThis.ui?.notifications?.warn(po("NoGM")),!1)}receive(t,e){let i=this.host;if(!tn()||t?.scene!==i.scene?.id||typeof t.card!="string")return;let s=i.stage?.cards.get(t.card)?.person;_y(s,game.users.get(e))&&Ga(i.scene,t.card,typeof t.emote=="string"?t.emote:null,{keep:!!t.keep}).catch(r=>console.warn(`${j} | could not put an emote on ${t.card}`,r))}#t(t,e){let i=document.createElement("div");i.id="stagecraft-card-menu",i.className="stagecraft-card-menu",i.setAttribute("popover","manual"),i.setAttribute("role","menu"),i.tabIndex=-1,i.addEventListener("contextmenu",r=>r.preventDefault());let s=document.createElement("div");if(s.className="menu-name",s.textContent=String(t.name??t.id).split(/\n|<br\s*\/?>|\\n/i)[0],i.append(s),e.emotes){for(let a of ny){let l=document.createElement("div");l.className="menu-label",l.textContent=po(a.kind==="face"?"Faces":a.kind==="balloon"?"Balloons":"Marks");let c=document.createElement("div");c.className="menu-emotes";for(let h of a.ids){let u=this.#e("menu-emote",()=>this.#n(h));u.dataset.emote=h,u.title=gi[h].label,u.setAttribute("aria-label",gi[h].label),e.kept===h&&u.classList.add("on");let d=document.createElement("img");d.src=_T(h),d.alt="",d.draggable=!1,u.append(d),c.append(u)}i.append(l,c)}let r=document.createElement("div");r.className="menu-row";let o=this.#e("menu-keep",()=>{this.keep=!this.keep,o.classList.toggle("on",this.keep),o.setAttribute("aria-checked",String(this.keep));try{globalThis.localStorage?.setItem(vy,this.keep?"1":"0")}catch{}});if(o.setAttribute("role","menuitemcheckbox"),o.setAttribute("aria-checked",String(this.keep)),o.classList.toggle("on",this.keep),o.textContent=po("Keep"),o.title=po("KeepTip"),r.append(o),e.kept){let a=this.#e("menu-clear",()=>this.#n(null));a.dataset.emote="",a.textContent=po("Clear"),r.append(a)}i.append(r)}if(e.actions.length){let r=document.createElement("div");r.className="menu-actions";for(let o of e.actions){let a=this.#e("menu-action",()=>this.#s(o.id));a.dataset.action=o.id,a.textContent=po(this.#i(o)),r.append(a)}i.append(r)}return i}#i({id:t,on:e}){return t==="floor"?e?"FloorTake":"FloorGive":t==="down"?e?"DownStand":"DownKnock":t==="choose"?e?"Unchoose":"Choose":"Sheet"}#e(t,e){let i=document.createElement("button");return i.type="button",i.className=t,i.setAttribute("role","menuitem"),i.addEventListener("click",s=>{s.preventDefault(),e()}),i}#n(t){let e=this.card;this.close(),!(!e||!this.host.stage?.cards.has(e))&&this.emote(e,t).catch(i=>console.warn(`${j} | could not put an emote on ${e}`,i))}#s(t){let e=this.host,i=this.card;this.close();let s=i?e.stage?.cards.get(i):null;if(!s)return;let r=o=>console.warn(`${j} | ${t} on ${i} failed`,o);t==="floor"?fo(e.scene,e.stage.speaker===i?null:i).catch(r):t==="down"?uo(e.scene,i,!s.downTo).catch(r):t==="choose"?(e.selected.has(i)?e.selected.delete(i):e.selected.add(i),e.blocking?.selectionChanged()):t==="sheet"&&My(s.person,game.user)?.sheet.render(!0)}};var MT="http://www.w3.org/2000/svg",Va=n=>game.i18n.localize(`STAGECRAFT.Editor.${n}`),lp={on:!1},Su=class{constructor(t){this.host=t,this.on=!1,this.el=null,this.drag=null,this.frame=0}toggle(t=!this.on){return this.on=!!t&&!!this.host.backend?.rig,lp.on=this.on,this.on?this.#t():this.#i(),this.on}refresh(){this.on&&!this.drag&&this.#s()}dispose(){this.#i()}#t(){if(this.el)return;this.el=document.createElement("div"),this.el.className="stagecraft-editor",this.el.innerHTML='<svg class="outlines" aria-hidden="true"></svg><div class="handles"></div><div class="note" role="status"></div>',this.el.querySelector(".note").textContent=Va("Note"),this.host.root.append(this.el),this.el.addEventListener("pointerdown",this.#a),this.el.addEventListener("dblclick",this.#d),this.#s();let t=()=>{this.on&&(this.#r(),this.frame=requestAnimationFrame(t))};this.frame=requestAnimationFrame(t)}#i(){cancelAnimationFrame(this.frame),this.el?.removeEventListener("pointerdown",this.#a),this.el?.removeEventListener("dblclick",this.#d),this.el?.remove(),this.el=null,this.drag=null,this.on=!1}#e([t,e]){let i=this.host.backend;return{x:(i.rig.map.x(t)-i.view.ox)*i.view.s,y:(i.rig.map.y(e)-i.view.oy)*i.view.s}}#n(){let t=Ys(this.host.scene.flags?.[j]?.stage??{}).scene;return{marks:t.marks??[],zones:(t.zones??[]).map(e=>this.drag?.live?.id===e.id?{...e,shape:this.drag.live.shape}:e)}}#s(){if(!this.el)return;let t=this.el.querySelector(".handles");t.replaceChildren();let{marks:e,zones:i}=this.#n();for(let s of dy({marks:e,zones:i})){let r=document.createElement("div");r.className=`handle ${s.kind}`,r.dataset.kind=s.kind,r.dataset.id=s.id,s.index!==void 0&&(r.dataset.index=String(s.index)),r.title=s.kind==="mark"?`${Va("Mark")}: ${s.label}`:s.kind==="vertex"?`${Va("Corner")}: ${s.label}`:`${Va("Zone")}: ${s.label}`,r.setAttribute("role","button"),r.setAttribute("aria-label",r.title),t.append(r)}for(let s of i)(s.shape??[]).forEach((r,o)=>{let a=document.createElement("div");a.className="handle edge",a.dataset.kind="edge",a.dataset.id=s.id,a.dataset.index=String(o),a.title=Va("EdgeTip"),t.append(a)});this.#r()}#r(){if(!this.el||!this.host.backend?.rig)return;let{marks:t,zones:e}=this.#n(),i=new Map;for(let r of t)i.set(`mark:${r.id}`,r.at);for(let r of e)r.shape.forEach((o,a)=>i.set(`vertex:${r.id}:${a}`,o)),i.set(`zone:${r.id}`,tp(r.shape)),r.shape.forEach((o,a)=>{let l=r.shape[(a+1)%r.shape.length];i.set(`edge:${r.id}:${a}`,[(o[0]+l[0])/2,(o[1]+l[1])/2])});for(let r of this.el.querySelectorAll(".handle")){let o=r.dataset.kind==="mark"||r.dataset.kind==="zone"?`${r.dataset.kind}:${r.dataset.id}`:`${r.dataset.kind}:${r.dataset.id}:${r.dataset.index}`,a=i.get(o);if(!a){r.hidden=!0;continue}r.hidden=!1;let l=this.#e(a);r.style.left=`${l.x}px`,r.style.top=`${l.y}px`}this.el.querySelector(".outlines").replaceChildren(...e.map(r=>{let o=document.createElementNS(MT,"polygon");return o.setAttribute("points",r.shape.map(a=>{let l=this.#e(a);return`${l.x},${l.y}`}).join(" ")),o.setAttribute("class",`outline ${r.kind??""}`),o}))}#a=t=>{let e=t.target.closest?.(".handle");if(!e||t.button!==0||!this.host.backend)return;t.preventDefault(),t.stopPropagation();let i=e.dataset.kind;if(i==="edge")return;let s=e.dataset.id,r=e.dataset.index===void 0?null:Number(e.dataset.index),o=this.host.scene.flags?.[j]?.stage??{},a=this.#n().zones.find(l=>l.id===s);this.drag={kind:i,id:s,index:r,el:e,start:this.#l(t),shape:a?a.shape.map(l=>[...l]):null,floor:null,live:null,moved:!1,raw:o},e.setPointerCapture?.(t.pointerId),e.classList.add("held"),e.addEventListener("pointermove",this.#c),e.addEventListener("pointerup",this.#h),e.addEventListener("pointercancel",this.#o)};#l(t){let e=this.host.root.getBoundingClientRect(),i=this.host.backend.paintingAt?.(t.clientX-e.left,t.clientY-e.top);return i?[i.x,i.y]:null}#c=t=>{let e=this.drag;if(!e)return;let i=this.#l(t);if(i){if(e.moved=!0,e.at=i,e.kind==="mark")e.el.style.left=`${this.#e(i).x}px`,e.el.style.top=`${this.#e(i).y}px`;else if(e.kind==="vertex")e.live={id:e.id,shape:e.shape.map((s,r)=>r===e.index?i:s)},this.#r();else if(e.kind==="zone"&&e.start){let s=i[0]-e.start[0],r=i[1]-e.start[1];e.live={id:e.id,shape:e.shape.map(o=>[Math.max(0,Math.min(1,o[0]+s)),Math.max(0,Math.min(1,o[1]+r))])},e.delta=[s,r],this.#r()}}};#h=t=>{let e=this.drag;if(!e||(this.#u(t),!e.moved||!e.at))return;let i=e.kind==="mark"?{mark:{id:e.id,at:e.at}}:e.kind==="vertex"?{vertex:{id:e.id,index:e.index,at:e.at}}:{zone:{id:e.id,dx:e.delta?.[0]??0,dy:e.delta?.[1]??0}};Ha(this.host.scene,i).catch(s=>console.warn(`${j} | could not move that`,s)).finally(()=>this.#s())};#o=t=>{this.#u(t),this.#s()};#u(t){let e=this.drag;this.drag=null,e&&(e.el.classList.remove("held"),e.el.releasePointerCapture?.(t.pointerId),e.el.removeEventListener("pointermove",this.#c),e.el.removeEventListener("pointerup",this.#h),e.el.removeEventListener("pointercancel",this.#o))}#d=t=>{let e=t.target.closest?.(".handle");if(!e)return;let i=e.dataset.id,s=Number(e.dataset.index);t.preventDefault(),t.stopPropagation();let r=e.dataset.kind==="vertex"?{removeVertex:{id:i,index:s}}:e.dataset.kind==="edge"?{addVertex:{id:i,after:s}}:null;r&&Ha(this.host.scene,r).catch(o=>console.warn(`${j} | could not change that zone`,o)).finally(()=>this.#s())}};var xe=(n,t)=>t?game.i18n.format(`STAGECRAFT.Bar.${n}`,t):game.i18n.localize(`STAGECRAFT.Bar.${n}`),bT=["hands","mode","freeze","undo","wipe","wipeone","hide"],wu=class{constructor(t){this.host=t,this.el=document.createElement("div"),this.el.className="stagecraft-bar",this.el.setAttribute("role","toolbar"),this.el.setAttribute("aria-label",xe("Label")),this.el.innerHTML=bT.map(e=>`<button type="button" data-act="${e}"></button>`).join(""),t.root.append(this.el),this.el.addEventListener("click",this.#e),this.refresh()}dispose(){this.el?.removeEventListener("click",this.#e),this.el?.remove(),this.el=null}get#t(){return this.host.scene}get#i(){return this.#t.flags?.[j]?.live??{}}refresh(){if(!this.el)return;let t=this.host.chalk;if(!t){this.el.hidden=!0;return}this.el.hidden=!1;let e=t.policy(),i=this.#i.chalk?.mode??null,s=(r,o,{on:a=!1,tip:l="",disabled:c=!1}={})=>{let h=this.el.querySelector(`[data-act="${r}"]`);h.textContent=o,h.title=l,h.setAttribute("aria-pressed",a?"true":"false"),h.classList.toggle("on",a),h.disabled=c};s("hands",xe("Hands.Label"),{on:Js(this.#t),tip:xe("Hands.Tip")}),s("mode",i?xe("Mode.Set",{mode:xe(`Mode.${i}`)}):xe("Mode.Scene",{mode:xe(`Mode.${e.mode}`)}),{on:!!i,tip:xe("Mode.Tip")}),s("freeze",xe("Freeze.Label"),{on:e.locked,tip:xe("Freeze.Tip")}),s("undo",xe("Undo.Label"),{tip:xe("Undo.Tip"),disabled:!t.store.ready}),s("wipe",xe("Wipe.Label"),{tip:xe("Wipe.Tip"),disabled:!t.store.ready}),s("wipeone",xe("WipeOne.Label"),{tip:xe("WipeOne.Tip"),disabled:!t.store.ready}),s("hide",xe("Hide.Label"),{on:this.#i.chalkHidden===!0,tip:xe("Hide.Tip")})}#e=t=>{let e=t.target.closest("button[data-act]");!e||e.disabled||this.#n(e.dataset.act).catch(i=>console.warn(`${j} | the stage bar could not do "${e.dataset.act}"`,i))};async#n(t){let e=this.#t,i=this.host.chalk,s=i?.store;if(t==="hands")await e.update({[`flags.${j}.live.handsOff`]:!Js(e)});else if(t==="mode")await e.update({[`flags.${j}.live.chalk.mode`]:rx(this.#i.chalk?.mode)});else if(t==="freeze")await e.update({[`flags.${j}.live.chalk.locked`]:!i.policy().locked});else if(t==="hide")await e.update({[`flags.${j}.live.chalkHidden`]:this.#i.chalkHidden!==!0});else if(t==="undo")await s.undo(e.id);else if(t==="wipe")await foundry.applications.api.DialogV2.confirm({window:{title:xe("Wipe.Title")},content:`<p>${xe("Wipe.Ask")}</p>`,yes:{default:!1}})&&await s.wipe(e.id);else if(t==="wipeone"){let r=i.painters();if(!r.length){ui.notifications?.info(xe("WipeOne.None"));return}let o=await foundry.applications.api.DialogV2.wait({window:{title:xe("WipeOne.Title")},content:`<p>${xe("WipeOne.Ask")}</p>`,buttons:[...r.map(a=>({action:a.by,label:xe("WipeOne.Who",{name:a.name,tiles:a.tiles}),icon:"fa-solid fa-eraser"})),{action:"",label:xe("WipeOne.Cancel"),default:!0}],rejectClose:!1});o&&await s.wipe(e.id,{by:o})}this.refresh()}};var ye=(n,t)=>t?game.i18n.format(`STAGECRAFT.Blocking.${n}`,t):game.i18n.localize(`STAGECRAFT.Blocking.${n}`),cp={line:"Line",huddle:"Huddle",talk:"Talk",gangup:"Gangup",panel:"Panel",standoff:"Standoff",circle:"Circle",queue:"Queue",scatter:"Scatter",audience:"Audience",position:"Position"},Tu=class{constructor(t){this.host=t,this.armed=null,this.el=document.createElement("div"),this.el.className="stagecraft-bar stagecraft-blocking",this.el.setAttribute("role","toolbar"),this.el.setAttribute("aria-label",ye("Label")),this.el.innerHTML=`
      <div class="row">
        <button type="button" data-act="life"></button>
        <button type="button" data-act="board"></button>
        <span class="sep"></span>
        ${rl.map(e=>`<button type="button" data-act="form" data-kind="${e}"></button>`).join("")}
        <span class="sep"></span>
        <button type="button" data-act="tidy"></button>
        <button type="button" data-act="places"></button>
        <button type="button" data-act="keep"></button>
        <button type="button" data-act="boxhere"></button>
        <button type="button" data-act="edit"></button>
      </div>
      <div class="row moments" hidden></div>
      <div class="hint" hidden></div>`,t.root.append(this.el),this.el.addEventListener("click",this.#e),this.el.addEventListener("dblclick",this.#n),this.refresh()}dispose(){this.el?.removeEventListener("click",this.#e),this.el?.removeEventListener("dblclick",this.#n),this.el?.remove(),this.el=null}get#t(){return this.host.scene}refresh(){if(!this.el)return;let t=this.#t,e=(r,o,{on:a=!1,tip:l=""}={})=>{r.textContent=o,r.title=l,r.setAttribute("aria-pressed",a?"true":"false"),r.classList.toggle("on",a)};e(this.el.querySelector('[data-act="life"]'),ye("Life.Label"),{on:co(t),tip:ye("Life.Tip")}),e(this.el.querySelector('[data-act="board"]'),ye("Board.Label"),{on:ho(t),tip:ye("Board.Tip")});for(let r of this.el.querySelectorAll('[data-act="form"]')){let o=r.dataset.kind;e(r,ye(`Form.${cp[o]}.Label`),{on:this.armed===o,tip:`${ye(`Form.${cp[o]}.Tip`)} ${ye("Form.How")}`})}e(this.el.querySelector('[data-act="tidy"]'),ye("Tidy.Label"),{tip:ye("Tidy.Tip")}),e(this.el.querySelector('[data-act="places"]'),ye("Places.Label"),{tip:ye("Places.Tip")}),e(this.el.querySelector('[data-act="keep"]'),ye("Keep.Label"),{tip:ye("Keep.Tip")}),e(this.el.querySelector('[data-act="boxhere"]'),ye("Box.Label"),{on:this.armed==="box",tip:ye("Box.Tip")}),e(this.el.querySelector('[data-act="edit"]'),ye("Edit.Label"),{on:!!this.host.editor?.on,tip:ye("Edit.Tip")});let i=yy(t),s=this.el.querySelector(".moments");s.hidden=!i.length,s.innerHTML=i.map((r,o)=>`<button type="button" data-act="moment" data-i="${o}" title="${by(r.tip??"")}">${by(r.label)}</button>`).join(""),this.moments=i,this.#i()}#i(){let t=this.el.querySelector(".hint"),e=this.host.selected?.size??0,i=[];this.armed&&i.push(this.armed==="box"?ye("Box.Armed"):ye("Armed",{name:ye(`Form.${cp[this.armed]}.Label`)})),e&&i.push(ye("Selected",{n:e})),t.hidden=!i.length,t.textContent=i.join(" \xB7 ")}selectionChanged(){this.el&&this.#i()}disarm(){return this.armed?(this.armed=null,this.refresh(),!0):!1}async placeArmed({card:t=null,at:e=null}){let i=this.armed;if(!i)return!1;if(this.disarm(),i==="box")return e&&await xu(this.#t,e),!0;let s=this.host.selected?.size?[...this.host.selected]:null,r={ids:s,focus:t??e??null};return t&&i==="gangup"&&(r.target=t),t&&i==="talk"&&(r.speakers=[t,...(s??[]).filter(o=>o!==t)]),s&&i==="talk"&&!t&&(r.speakers=s.slice(0,2)),(t||s)&&(r.party=!0),t&&s&&!s.includes(t)&&(r.ids=[...s,t]),await za(this.#t,i,r,this.host),!0}#e=t=>{let e=t.target.closest("button[data-act]");!e||e.disabled||this.#s(e).catch(i=>console.warn(`${j} | the blocking strip could not do "${e.dataset.act}"`,i))};#n=t=>{let e=t.target.closest('button[data-act="form"]');if(!e)return;this.armed=null;let i=this.host.selected?.size?[...this.host.selected]:null;za(this.#t,e.dataset.kind,{ids:i,party:!!i},this.host).then(()=>this.refresh()).catch(s=>console.warn(`${j} | the formation could not be made`,s))};async#s(t){let e=this.#t,i=t.dataset.act;if(i==="life")await vu(e,!co(e));else if(i==="board")await _u(e,!ho(e));else if(i==="form")this.armed=this.armed===t.dataset.kind?null:t.dataset.kind;else if(i==="tidy")await yu(e,this.host);else if(i==="places")await mu(e);else if(i==="edit")this.host.editor?.toggle();else if(i==="boxhere")this.armed=this.armed==="box"?null:"box";else if(i==="keep"){let s=this.host.selected?.size?[...this.host.selected]:null;if(await foundry.applications.api.DialogV2.confirm({window:{title:ye("Keep.Title")},content:`<p>${ye(s?"Keep.AskSome":"Keep.AskAll",{n:s?.length??0})}</p>`,yes:{default:!1}})){let o=await gu(e,this.host,s);ui.notifications?.info(ye("Keep.Done",{n:o}))}}else i==="moment"&&await this.moments?.[Number(t.dataset.i)]?.run?.(e);this.refresh()}};function by(n){return String(n).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}var mo=(n,t,e)=>Math.max(t,Math.min(e,n)),ST=.5,wT=4,Sy=.2;function TT(n,t,e){let i=l=>Number.isFinite(l)&&l>0?l:0,s=Math.min(i(n?.left),t*.9),r=Math.min(i(n?.right),t*.9-s),o=Math.min(i(n?.top),e*.9),a=Math.min(i(n?.bottom),e*.9-o);return{left:s,right:r,top:o,bottom:a}}function Eu(n,t,e=null,i=Bi){let s=TT(e,n,t),r=n-s.left-s.right,o=t-s.top-s.bottom,l=s.left+s.right+s.top+s.bottom>0?r/i.W:Math.max(n/i.W,t/i.H),c=s.left+r/2,h=s.top+o/2;return{s:l,cx:i.W/2+(n/2-c)/l,cy:i.H/2+(t/2-h)/l}}function hp(n,t,e,i=Bi){let s=e??Eu(n,t,null,i),r=n/s.s,o=t/s.s;return{vw:n,vh:t,s:s.s,ox:s.cx-r/2,oy:s.cy-o/2,visW:r,visH:o}}function wy(n,t,e=null,i=Bi){let s=Math.min(n/i.W,t/i.H),r=Math.max(n/i.W,t/i.H),o=Eu(n,t,e,i).s;return{min:Math.min(s*ST,o),max:Math.max(r*wT,o)}}function Au(n,t,e,i=null,s=Bi){let{min:r,max:o}=wy(t,e,i,s),a=mo(n.s,r,o),l=t/a,c=e/a,h=Sy*Math.min(l,s.W),u=Sy*Math.min(c,s.H);return{s:a,cx:mo(n.cx,h-l/2,s.W-h+l/2),cy:mo(n.cy,u-c/2,s.H-u+c/2)}}function Ty(n,t,e,i,s,r,o=null,a=Bi){let{min:l,max:c}=wy(t,e,o,a),h=mo(n.s*r,l,c),u=n.cx+(i-t/2)/n.s,d=n.cy+(s-e/2)/n.s;return Au({s:h,cx:u-(i-t/2)/h,cy:d-(s-e/2)/h},t,e,o,a)}function Ey(n,t,e,i,s,r=null,o=Bi){return Au({s:n.s,cx:n.cx-t/n.s,cy:n.cy-e/n.s},i,s,r,o)}function Ay(n,t=0){let e=t===1?n*16:t===2?n*400:n;return Math.exp(-mo(e,-300,300)*.0012)}function Cy(n,t,e){let i=mo(e,0,1),s=i*i*(3-2*i);return{s:n.s*Math.pow(t.s/n.s,s),cx:n.cx+(t.cx-n.cx)*s,cy:n.cy+(t.cy-n.cy)*s}}function Ry(n,t){return!n||!t?n===t:Math.abs(n.s-t.s)<1e-4*Math.max(n.s,t.s)&&Math.abs(n.cx-t.cx)<.01&&Math.abs(n.cy-t.cy)<.01}var up=new Set;function Py(n){if(typeof n!="function")throw new TypeError("a margins provider must be a function");return up.add(n),()=>up.delete(n)}function Wa(){let n={left:0,right:0,top:0,bottom:0};for(let t of up)try{let e=t();for(let i of Object.keys(n))Number.isFinite(e?.[i])&&e[i]>n[i]&&(n[i]=e[i])}catch(e){console.warn(`${j} | a margins provider failed`,e)}return n}var Cu=class{constructor({scene:t,skins:e,anchor:i,services:s={},onFatal:r=null}){this.scene=t,this.onFatal=r,this.guard=new xl({limit:600,report:(o,a)=>console.error(`${j} | a frame failed (${a} in a row)`,o),onFatal:o=>this.#i(o)}),this.threeFailed=!1,this.losses=0,this.rebuilding=!1,this.saving=Promise.resolve(),this.skins=e,this.anchor=i,this.services=s,this.userId=game.user.id,this.dragging=null,this.look=null,this.tween=null,this.panning=null,this.selected=new Set,this.running=!1,this.frames=0,this.speed=null,this.health=null,this.healthBoard=null,this.tip=null,this.pace=new Ka({cap:$p(),easing:Ou()}),this.pose=null,this.listeners=[],this.hooks=[]}async start(){let{usable:t,scene:e,problems:i}=Ks(this.scene);if(!t)return console.warn(`${j} | "${this.scene.name}" has a stage description that cannot be drawn:`,i),ui.notifications?.warn(game.i18n.format("STAGECRAFT.Notify.Unusable",{scene:this.scene.name})),!1;i.length&&console.warn(`${j} | "${this.scene.name}" has notes:`,i),this.description=e,this.described=JSON.stringify(this.scene.flags?.[j]?.stage??null),this.people=Mo(this.scene);let s=()=>this.root&&this.backend?.view?op(rp(),this.root.getBoundingClientRect(),this.homeView()):[];this.stage=new ar(e,this.people,{card:this.skins.get(e.skin).size,clock:Ua,cover:s}),this.stage.setLife(co(this.scene)),this.stage.setBoard(ho(this.scene)),this.stage.setSpeaker(sp(this.scene)),this.stage.setTurn(Mu(this.scene)),this.stage.setCalm(tr());for(let r of this.people){let o=this.stage.cards.get(r.id);o&&(o.appliedMove=r.move?.t0??null)}for(let r of this.stage.problems)console.warn(`${j} | ${r}`);return this.sync=new yl({stage:this.stage,scene:this.scene.id,me:this.userId,now:()=>game.time.serverTime,clock:()=>performance.now(),send:r=>this.channel?.send(r),mayHold:(r,o)=>this.#g(r,o),onLost:r=>this.#v(r),onDrop:r=>this.#M(r)}),this.channel=Zx((r,o)=>{r?.type==="chalk"?this.chalk?.receive(r,o):r?.type==="health"?(this.health?.receive(r),this.healthBoard?.receive(r,o)):r?.type==="emote"?this.menu?.receive(r,o):this.sync.receive(r,o)}),this.root=document.createElement("div"),this.root.id="stagecraft-stage",this.root.dataset.scene=this.scene.id,this.anchor.after(this.root),this.speed=new cu(this),await this.#t(),this.services.chalkStore&&(this.chalk=new su({host:this,store:this.services.chalkStore,send:r=>this.channel?.send(r)}),this.kit=new ru(this,this.chalk),this.chalk.sync(),this.chalk.refresh(),this.#_()),game.user.isGM&&(this.bar=new wu(this),this.blocking=new Tu(this),this.healthBoard=new au(this),this.editor=new Su(this),lp.on&&this.editor.toggle(!0),this.#E()),this.#b(),this.health=new ou(this),this.tip=new uu(this),this.menu=new bu(this),this.#R(),this.#h(),this.#P(),this.#I(),this.running=!0,this.last=performance.now(),this.pace.poke(this.last),this.raf=requestAnimationFrame(this.#e),this.speed.start(),setTimeout(()=>{this.running&&this.#S()},0),Hooks.callAll("stagecraft.stageReady",this),!0}async#t(){let t=new Us,e=this.root.clientWidth||window.innerWidth,i=this.root.clientHeight||window.innerHeight,s=this.skins.get(this.description.skin),r=Ja()==="auto"&&Hp(),o=Bp({tier:ys(),webgl:zp(),failed:this.threeFailed,software:r});if(o==="flat"&&r&&!this.toldFlat&&(this.toldFlat=!0,ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.FlatSoftware"))),o==="three"){let l=new Jh({images:t,onContextLost:()=>this.#k()});try{l.mount(this.root,{quality:ys(),pixelRatio:window.devicePixelRatio,width:e,height:i}),l.setCalm(tr()),l.setZoneSetting(Qa()),await l.load(this.description,s,this.people),this.backend=l;return}catch(c){console.warn(`${j} | the 3D picture could not start here; drawing the plain one`,c),l.dispose(),this.threeFailed=!0}this.toldFlat||(this.toldFlat=!0,ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.Flat")))}let a=new tu({images:t});a.mount(this.root,{pixelRatio:window.devicePixelRatio,width:e,height:i}),a.setCalm(tr()),a.setZoneSetting(Qa()),await a.load(this.description,s,this.people),this.backend=a}#i(t){if(this.backend?.name!=="flat"&&!this.threeFailed&&this.running){console.warn(`${j} | the 3D picture keeps failing; trying the plain one`,t),this.threeFailed=!0,this.guard.failures=0,this.rebuild().then(()=>{this.running&&(this.last=performance.now(),this.raf=requestAnimationFrame(this.#e))}).catch(e=>{this.running=!1,this.onFatal?.(e)});return}this.running=!1,this.onFatal?.(t)}async stop(){this.running=!1,cancelAnimationFrame(this.raf);for(let[t,e,i,s]of this.listeners)t.removeEventListener(e,i,s);this.listeners=[];for(let[t,e]of this.hooks)Hooks.off(t,e);this.hooks=[],this.resizeObserver?.disconnect(),this.sync?.close(),this.channel?.close(),this.channel=null,this.chalk?.stop(),this.kit?.dispose(),this.chalk?.wall?.clear(),this.speed?.stop(),this.health?.stop(),this.healthBoard?.dispose(),this.editor?.dispose(),this.tip?.dispose(),this.menu?.dispose(),this.bar?.dispose(),this.blocking?.dispose(),this.backend?.dispose(),this.root?.remove(),this.chalk=this.kit=this.speed=this.health=this.healthBoard=this.tip=this.bar=this.blocking=this.editor=this.backend=this.root=null}#e=t=>{if(!this.running)return;if(!this.pace.due(t)){this.raf=requestAnimationFrame(this.#e);return}let e=this.guard.run(()=>{this.tween&&this.#y(t);let i=(t-this.last)/1e3;this.last=t,this.sync.tick(),this.stage.advance(i);let s=this.stage.snapshot({viewer:this.userId,selected:this.selected});if(this.#n(s,t),this.chalk?.inHand)for(let r of this.chalk.chalkZones())s.zones[r.id]=this.chalk.cursorZone===r.id?"target":"near";this.chalk?.wall?.flush?.(),this.health?.frame(t,this.pace.scale(t)),this.backend.draw(s),this.chalk?.afterDraw?.(),this.speed?.feed(t),this.frames++,this.frames%60===0&&this.#_();for(let r of this.stage.drain())r.type==="visit"&&this.#s(r),Hooks.callAll(`stagecraft.${r.type}`,r,this)});this.pace.drew(t),e&&(this.raf=requestAnimationFrame(this.#e))};#n(t,e){let i=Fp(t.cards);Up(this.pose,i)&&this.pace.poke(e),this.pose=i,(t.bonks?.length||this.dragging||this.chalk?.drawing||this.chalk?.wall?.strokes?.size||this.speed?.probe||this.blocking?.armed)&&this.pace.poke(e)}#s(t){let e=this.description.zones.find(u=>u.id===t.zone),i=this.stage.cards.get(t.card);if(!e||!i||!this.root||!this.backend?.project)return;let s=e.floor??e.shape,r=s.reduce((u,d)=>u+d[0],0)/s.length,o=Math.max(...s.map(u=>u[1])),a=this.stage.rig.standing([r,o])??{X:i.puppet.restX,Z:i.restZ},l=this.backend.project({X:a.X,Y:i.h*i.grow*1.12,Z:a.Z});if(!l||!Number.isFinite(l.x))return;let c=document.createElement("div");c.className="stagecraft-visit";let h=document.createElement("b");if(h.textContent=game.i18n.format("STAGECRAFT.Visit.At",{name:i.person.name??i.id,zone:e.name||e.id}),c.append(h),e.hint){let u=document.createElement("span");u.textContent=e.hint,c.append(u)}c.style.left=`${Math.round(l.x)}px`,c.style.top=`${Math.round(l.y)}px`,this.root.append(c),setTimeout(()=>c.remove(),4200)}#r(t,e,i,s){t.addEventListener(e,i,s),this.listeners.push([t,e,i,s])}#a(){return this.rect??=this.root.getBoundingClientRect()}#l(t){let e=this.#a();return{x:t.clientX-e.left,y:t.clientY-e.top}}#c(t,e=this.#a()){let i=t.pointerType==="pen"&&(t.button===5||(t.buttons&32)!==0);return{x:t.clientX-e.left,y:t.clientY-e.top,pressure:t.pressure,pointerType:t.pointerType,t:t.timeStamp,shift:t.shiftKey,alt:t.altKey,flip:i}}#h(){let t=this.backend.canvas;this.#r(t,"contextmenu",i=>i.preventDefault()),this.#r(t,"pointerdown",i=>{if(this.rect=null,this.pace.poke(performance.now()),this.tip?.hide(),i.button===2&&this.chalk?.inHand){this.chalk.putAway();return}if(i.button===2&&this.blocking?.disarm())return;if(i.button===2){let l=this.#l(i),c=this.backend.pick(l.x,l.y);if(c?.kind==="card"){this.menu?.open(c.id,i.clientX,i.clientY)&&i.preventDefault();return}this.#m(i);return}if(i.button===1){this.#m(i);return}if(i.button!==0&&!(i.button===5&&i.pointerType==="pen"&&this.chalk?.inHand))return;let s=this.#l(i),r=this.backend.pick(s.x,s.y);if(this.blocking&&!this.chalk?.inHand){if(this.blocking.armed){let l=r?.kind==="card"?null:this.#o(s);if(r?.kind==="card"||l){this.blocking.placeArmed({card:r?.kind==="card"?r.id:null,at:l}).catch(c=>console.warn(`${j} | the formation could not be made`,c)),i.preventDefault();return}}if(i.shiftKey&&r?.kind==="card"){this.selected.has(r.id)?this.selected.delete(r.id):this.selected.add(r.id),this.blocking.selectionChanged(),i.preventDefault();return}if((i.ctrlKey||i.metaKey)&&r?.kind==="card"){let l=this.stage.cards.get(r.id);uo(this.scene,r.id,!l?.downTo).catch(c=>console.warn(`${j} | could not knock down ${r.id}`,c)),i.preventDefault();return}if(i.altKey&&r?.kind==="card"){fo(this.scene,this.stage.speaker===r.id?null:r.id).catch(l=>console.warn(`${j} | could not give the floor`,l)),i.preventDefault();return}}if(r?.kind==="chalk"||r?.kind==="magic"||r?.kind==="eraser"){this.chalk?.take(r.kind==="eraser"?"rub":r.kind==="magic"?"magic":r.colour),this.chalk?.hover(s),i.preventDefault();return}if(this.chalk?.inHand){i.preventDefault();let l=this.#c(i);if(this.kit?.takesPick()){this.chalk.pickColour(l);return}this.chalk.begin(l)&&(t.setPointerCapture(i.pointerId),this.chalk.hover(s));return}if(!r){this.#m(i);return}if(r?.kind!=="card"||!this.sync.grab(r.id))return;let o=this.backend.floorAt(s.x,s.y,r.point.y),a=this.stage.cards.get(r.id);this.dragging={id:r.id,height:r.point.y,offX:(o?.x??a.puppet.x)-a.puppet.x,offZ:(o?.z??a.Z)-a.Z},t.setPointerCapture(i.pointerId),t.style.cursor="grabbing",i.preventDefault()}),this.#r(t,"pointermove",i=>{if(this.panning?.id===i.pointerId){this.#x(i);return}let s=this.#l(i);if((this.dragging||this.chalk?.inHand||i.buttons)&&this.pace.poke(performance.now()),this.chalk?.drawing){let o=this.#a(),a=i.getCoalescedEvents?.()??[];for(let l of a.length?a:[i])this.chalk.extend(this.#c(l,o));this.chalk.finishMove()}if(this.chalk?.inHand){this.tip?.hide(),this.chalk.hover(s),t.style.cursor="none";return}if(!this.dragging){let o=this.backend.pick(s.x,s.y);t.style.cursor=o?"grab":"default",o?.kind==="card"||!this.chalk?this.tip?.hover(o?.kind==="card"?o.id:null,i.clientX,i.clientY):this.tip?.hoverWall(s,i.clientX,i.clientY);return}this.tip?.hide();let r=this.backend.floorAt(s.x,s.y,this.dragging.height);r&&this.sync.move(this.dragging.id,r.x-this.dragging.offX,r.z-this.dragging.offZ)});let e=i=>{if(this.pace.poke(performance.now()),this.panning?.id===i.pointerId){this.panning=null,t.style.cursor="default";return}if(this.chalk?.drawing){i.type==="pointercancel"?this.chalk.cancel():this.chalk.end().catch(s=>console.warn(`${j} | chalk stroke failed`,s)),this.chalk.hover(this.#l(i));return}this.dragging&&(this.sync.release(this.dragging.id),this.dragging=null,t.style.cursor="default")};this.#r(t,"pointerup",e),this.#r(t,"pointercancel",e),this.#r(t,"wheel",i=>{i.preventDefault(),this.tip?.hide();let s=this.#l(i),{w:r,h:o}=this.#u();this.#p(Ty(this.lookNow(),r,o,s.x,s.y,Ay(i.deltaY,i.deltaMode),Wa()))},{passive:!1}),this.#r(t,"dblclick",i=>{if(this.chalk?.inHand||this.blocking?.armed)return;let s=this.#l(i);this.backend.pick(s.x,s.y)||(i.preventDefault(),this.home())}),this.#r(t,"pointerleave",()=>{this.tip?.hide(),this.chalk?.inHand&&!this.chalk.drawing&&this.chalk.hover(null)}),this.#r(window,"keydown",i=>{if(i.code==="Escape"){if(this.chalk?.drawing)this.chalk.cancel();else if(this.chalk?.inHand)this.chalk.putAway();else if(!this.healthBoard?.close()){if(!this.blocking?.disarm())if(this.selected.size)this.selected.clear(),this.blocking?.selectionChanged();else return}i.preventDefault(),i.stopPropagation()}},!0)}#o(t){let e=this.backend.floorAt(t.x,t.y,0);if(!e)return null;let i=this.stage.rig.fractionOf(e.x,e.z);return Number.isFinite(i[0])&&Number.isFinite(i[1])?[Math.round(i[0]*1e4)/1e4,Math.round(i[1]*1e4)/1e4]:null}perform(t){this.pace.poke(performance.now()),this.dragging&&this.sync.verb(this.dragging.id,t)}#u(){return{w:this.root?.clientWidth||window.innerWidth,h:this.root?.clientHeight||window.innerHeight}}#d(){let{w:t,h:e}=this.#u();return Eu(t,e,Wa())}lookNow(){return this.look??this.#d()}homeView(){let{w:t,h:e}=this.#u();return hp(t,e,this.#d())}#f(){if(!this.backend)return;let{w:t,h:e}=this.#u();this.backend.setView(hp(t,e,this.lookNow())),this.pace.poke(performance.now())}#p(t){this.tween=null,this.look=t,this.#f()}#m(t){this.tween=null,this.panning={id:t.pointerId,x:t.clientX,y:t.clientY,look:this.lookNow(),moved:!1},this.backend.canvas.setPointerCapture?.(t.pointerId),t.preventDefault()}#x(t){let e=this.panning,i=t.clientX-e.x,s=t.clientY-e.y;if(!e.moved&&Math.hypot(i,s)<4)return;e.moved||(e.moved=!0,this.tip?.hide(),this.backend.canvas.style.cursor="grabbing");let{w:r,h:o}=this.#u();this.#p(Ey(e.look,i,s,r,o,Wa()))}home({animate:t=!0}={}){if(!this.backend||!this.root)return!1;let e=this.lookNow(),i=this.#d();return this.panning=null,!t||Ry(e,i)?(this.tween=null,this.look=null,this.#f(),!0):(this.tween={from:e,to:i,t0:performance.now(),ms:420},this.look=e,this.pace.poke(performance.now()),!0)}#y(t){let{from:e,to:i,t0:s,ms:r}=this.tween,o=(t-s)/r;o>=1?(this.tween=null,this.look=null):this.look=Cy(e,i,Math.max(0,o)),this.#f()}#g(t,e){let i=this.stage.cards.get(t)?.person,s=game.users.get(e);return!!i&&!!s&&Ya(i,s,{handsOff:Js(this.scene)})}#v(t){this.dragging?.id===t&&(this.dragging=null,this.backend?.canvas&&(this.backend.canvas.style.cursor="default"))}#M(t){if(!tn())return;let e=this.stage.placeOf(t.card);e&&(this.saving=ps(()=>this.#w(e)).catch(i=>console.warn(`${j} | could not save where a card was put down`,i)))}async#w(t){let e=this.scene.flags?.[j]?.published?.cards;!Array.isArray(e)||!e.some(i=>i.id===t.id)||await this.scene.update({[`flags.${j}.published.cards`]:Vm(e,t)})}#T(){let t=Mo(this.scene),e=new Set(t.map(i=>i.id));this.stage.setLife(co(this.scene)),this.stage.setBoard(ho(this.scene)),this.#b();for(let i of t){let s=this.stage.cards.get(i.id);if(s){this.#A(s,i);continue}let r=this.stage.addCard(i);r&&(r.appliedMove=i.move?.t0??null),this.people.push(i),this.backend.addCard(i).catch(o=>console.warn(`${j} | could not draw ${i.id}`,o))}for(let i of[...this.stage.cards.keys()])e.has(i)||(this.sync.forget(i),this.dragging?.id===i&&this.#v(i),this.stage.removeCard(i),this.backend.removeCard(i),this.people=this.people.filter(s=>s.id!==i));this.stage.setSpeaker(sp(this.scene)),this.stage.setTurn(Mu(this.scene))}#E(){let t="stagecraft.gmOpen",e=!1;try{e=globalThis.localStorage?.getItem(t)==="1"}catch{}let i=document.createElement("button");i.type="button",i.className="stagecraft-gm-toggle";let s=()=>{this.root?.classList.toggle("stagecraft-gm-open",e),i.textContent=game.i18n.localize(e?"STAGECRAFT.Gm.Hide":"STAGECRAFT.Gm.Show"),i.setAttribute("aria-expanded",e?"true":"false")};i.addEventListener("click",()=>{e=!e;try{globalThis.localStorage?.setItem(t,e?"1":"0")}catch{}s()}),this.root.append(i),s()}#b(){if(!this.root)return;if(!(this.stage.board&&this.stage.zones.some(i=>i.kind==="area"))){this.keyEl?.remove(),this.keyEl=null;return}if(this.keyEl)return;let e=i=>game.i18n.localize(`STAGECRAFT.Board.${i}`);this.keyEl=document.createElement("div"),this.keyEl.className="stagecraft-board-key",this.keyEl.innerHTML=`<b>${e("Title")}</b><span><i class="engaged"></i>${e("Engaged")}</span><span><i class="near"></i>${e("Near")}</span><span><i class="far"></i>${e("Far")}</span>`,this.root.append(this.keyEl)}#A(t,e){let i=JSON.stringify(e.home??null)!==JSON.stringify(t.person.home??null);(i||JSON.stringify(e.life??null)!==JSON.stringify(t.person.life??null))&&this.stage.setRoutine(e.id,e.life,i&&Array.isArray(e.home)?e.home:null),this.stage.setDown(e.id,e.down===!0);let s=Xf(e)!==Xf(t.person);t.person={...t.person,...e,portrait:t.person.portrait},s&&this.backend?.refreshCard?.({...t.person})?.catch(o=>console.warn(`${j} | could not redraw ${e.id}`,o));let r=e.move;if(r&&Number.isFinite(r.t0)&&r.t0!==t.appliedMove){t.appliedMove=r.t0,this.stage.walkTo(e.id,e.mark?{mark:e.mark}:{at:e.at},{t0:r.t0,gait:r.gait??"walk",yaw:Number.isFinite(e.yaw)?e.yaw:null,lean:e.lean??0,pitch:e.pitch??0,still:e.still===!0,packed:e.packed===!0});return}t.holder===null&&(t.still=e.still===!0,t.packed=e.packed===!0)}#_(){let t=this.backend;if(!this.chalk||!this.root||!t?.setChalkBoxAt||!t.view||!this.stage?.rig)return;let e=this.stage.rig,i=this.root.getBoundingClientRect(),s=this.homeView(),r=op([...rp(),...this.#C()],i,s),o={x0:s.ox,y0:s.oy,x1:s.ox+s.visW,y1:s.oy+s.visH},a=this.description.chalk?.box??no,l;Ia(e,a,r,o)?l=[a[0],a[1]]:this.boxAt&&Ia(e,this.boxAt,r,o)?l=this.boxAt:l=Q0(e,a,r,o,this.stage.cardShapes()),!(this.boxAt&&l[0]===this.boxAt[0]&&l[1]===this.boxAt[1])&&(this.boxAt=l,t.setChalkBoxAt(l))}#C(){let t=[];for(let e of["hotbar"]){let s=document.getElementById(e)?.getBoundingClientRect?.();s&&s.width>0&&s.height>0&&t.push({rect:[s.left,s.top,s.right,s.bottom]})}return t}#R(){let t=()=>{if(!(!this.backend||!this.root)){if(this.rect=null,this.backend.resize(this.root.clientWidth,this.root.clientHeight,window.devicePixelRatio),this.look&&!this.tween){let{w:e,h:i}=this.#u();this.look=Au(this.look,e,i,Wa())}this.#f(),this.#_()}};this.resizeObserver=new ResizeObserver(t),this.resizeObserver.observe(this.root),t()}#P(){this.hooks.push(["stagecraft.settingsChanged",Hooks.on("stagecraft.settingsChanged",t=>{t==="calm"&&(this.backend?.setCalm(tr()),this.stage?.setCalm(tr())),t==="power"&&(this.pace.easing=Ou()),t==="zones"&&this.backend?.setZoneSetting(Qa()),t==="tier"&&ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.TierNextScene"))})])}#I(){this.hooks.push(["userConnected",Hooks.on("userConnected",(t,e)=>{e||this.sync?.userGone(t.id)})]),this.hooks.push(["updateScene",Hooks.on("updateScene",t=>{t.id===this.scene.id&&this.#S()})])}#S(){if(!this.running&&!this.root)return;this.pace.poke(performance.now());let t=JSON.stringify(this.scene.flags?.[j]?.stage??null);if(t!==this.described){this.described=t,globalThis.canvas?.scene?.id===this.scene.id&&globalThis.canvas.draw();return}this.chalk?.refresh(),this.bar?.refresh(),this.blocking?.refresh(),this.editor?.refresh(),this.#T(),Js(this.scene)&&!game.user.isGM&&this.dragging&&(this.sync.release(this.dragging.id),this.dragging=null)}#k(){console.warn(`${j} | the graphics context was lost; the stage will be rebuilt`),++this.losses>=2&&(this.threeFailed=!0),this.rebuild().catch(t=>{console.error(`${j} | the stage could not be rebuilt`,t),this.onFatal?.(t)})}async rebuild(){if(!(!this.running||this.rebuilding)){this.rebuilding=!0;try{await this.#L()}finally{this.rebuilding=!1}}}async#L(){for(let[t,e,i,s]of this.listeners)t.removeEventListener(e,i,s);this.listeners=[],this.backend.dispose(),await this.#t(),!(!this.running||!this.backend)&&(this.#f(),this.chalk?.reset(),this.chalk?.sync(),this.chalk?.refresh(),this.boxAt=null,this.#_(),this.#h(),this.pace.poke(performance.now()),this.health?.changed(),this.speed?.start())}};var ms={host:null};function Iy(n,{makeHost:t=i=>new Cu(i),services:e={}}={}){let i=foundry.canvas.SceneManager;class s extends i{#t=null;#i=null;async _onDraw(){let a=canvas.app.view;this.#t=t({scene:this.scene,skins:n,anchor:a,services:e,onFatal:()=>this.#e()});let l=!1;try{this.#i={display:a.style.display},a.style.display="none",canvas.app.stop(),l=await this.#t.start()}catch(c){console.error(`${j} | could not take over "${this.scene.name}"`,c),ui.notifications?.error(game.i18n.format("STAGECRAFT.Notify.Failed",{scene:this.scene.name}))}if(l){ms.host=this.#t;return}try{await this.#t?.stop()}catch(c){console.error(`${j} | the stage did not stop cleanly`,c)}this.#t=null,this.#n()}async _onTearDown(){ms.host===this.#t&&(ms.host=null),await this.#t?.stop(),this.#t=null,this.#n()}async#e(){if(!this.#t)return;let a=this.#t;this.#t=null,ms.host===a&&(ms.host=null),ui.notifications?.error(game.i18n.format("STAGECRAFT.Notify.Failed",{scene:this.scene.name}));try{await a.stop()}catch(l){console.error(`${j} | the stage did not stop cleanly`,l)}this.#n()}#n(){this.#i&&(canvas.app.view.style.display=this.#i.display||"block",canvas.app.start(),this.#i=null)}}let r=CONFIG.Canvas.managedScenes;return CONFIG.Canvas.managedScenes=new Proxy(r,{get(o,a,l){if(typeof a!="string")return Reflect.get(o,a,l);if(Object.hasOwn(o,a))return o[a];let c=game.scenes?.get(a);return c&&js(c)?s:void 0}}),s}var ET="0.12.0";function ky({skins:n,current:t}){return{version:ET,skins:{register:e=>n.register(e),use:e=>n.use(e),list:()=>n.list()},scenes:{isStage:e=>js(e),describe:e=>Ks(e),validate:e=>Ys(e)},blocking:{formations:[...rl],gaits:[...xm],routines:[...Zu],move:(e,i)=>Ba(e,i),arrange:(e,i,s={})=>za(e,i,s,t.host),backToPlaces:e=>mu(e),keepPlaces:(e,i=null)=>gu(e,t.host,i),setChalkBox:(e,i)=>xu(e,i),editStage:(e,i)=>Ha(e,i),tidy:e=>yu(e,t.host),setLife:(e,i)=>vu(e,i),setBoard:(e,i)=>_u(e,i),setSpeaker:(e,i)=>fo(e,i),setTurn:(e,i)=>py(e,i),setBadges:(e,i,s)=>my(e,i,s),setDown:(e,i,s)=>uo(e,i,s),setEmote:(e,i,s,r={})=>Ga(e,i,s,r),registerMoments:e=>gy(e),setCover:e=>xy(e)},view:{setMargins:e=>Py(e),home:(e={})=>t.host?.home(e)===!0},stage:()=>t.host?{stage:t.host.stage,backend:t.host.backend}:null,zoneKinds:[...Pp],chalkModes:[...vo],emotes:[...pl],chalkTools:[...Gh]}}var AT=[{action:"hop",verb:"hop",key:"Space"},{action:"nod",verb:"nod",key:"KeyN"},{action:"bow",verb:"bow",key:"KeyB"},{action:"shake",verb:"shake",key:"KeyX"},{action:"turn",verb:"turn",key:"KeyT"}];function Ly(n){for(let{action:t,verb:e,key:i}of AT)game.keybindings.register(j,t,{name:`STAGECRAFT.Keys.${t}`,editable:[{key:i}],onDown:()=>{let s=n();return s?.dragging?(s.perform(e),!0):!1},restricted:!1,precedence:CONST.KEYBINDING_PRECEDENCE.PRIORITY});game.keybindings.register(j,"home",{name:"STAGECRAFT.Keys.home",editable:[{key:"Home"}],onDown:()=>n()?.home()===!0,restricted:!1})}var CT="Stagecraft chalk",Xa=2,go=()=>({render:!1});function Ws(n,t,e){globalThis._del!==void 0?n[`${t}.${e}`]=globalThis._del:n[`${t}.-=${e}`]=null}var xo=class n{#t=Promise.resolve();constructor(){this.listeners=new Set,this.hooks=[];for(let t of["createJournalEntryPage","updateJournalEntryPage","deleteJournalEntryPage"])this.hooks.push([t,Hooks.on(t,e=>this.#c(e))]);for(let t of["createJournalEntry","updateJournalEntry","deleteJournalEntry"])this.hooks.push([t,Hooks.on(t,e=>this.#h(e))]);this.hooks.push(["deleteScene",Hooks.on("deleteScene",t=>this.#u(t))]);for(let t of["createScene","updateScene"])this.hooks.push([t,Hooks.on(t,()=>this.#n())]);this.#o()}dispose(){for(let[t,e]of this.hooks)Hooks.off(t,e);this.hooks=[],this.listeners.clear()}get entry(){return game.journal?.find(t=>t.getFlag(j,"chalk")===!0)??null}get ready(){return!!this.entry}static wanted(){return!!game.scenes?.some(t=>js(t)&&Fh(_o(t).chalk,t.flags?.[j]?.live?.chalk).mode!=="off")}static#i=null;static ensure(){return tn()?n.#i??=n.#e().finally(()=>{n.#i=null}):Promise.resolve(null)}static async#e(){let t=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,e=game.journal.find(i=>i.getFlag(j,"chalk")===!0);return e?(e.ownership?.default??0)<t&&await e.update({"ownership.default":t}):e=await JournalEntry.create({name:CT,flags:{[j]:{chalk:!0}},ownership:{default:t}}),e}#n(){!tn()||this.ready||!n.wanted()||n.ensure().catch(t=>console.warn(`${j} | could not make the chalk journal`,t))}#s(t){return(this.entry?.pages??[]).filter(e=>{let i=e.getFlag(j,"chalk");return i?.scene===t&&i?.v===Xa})}#r(t,e){return this.#s(t).find(i=>i.getFlag(j,"chalk")?.by===e)??null}layers(t){return this.#s(t).map(e=>{let i=e.getFlag(j,"chalk");return{by:i.by,since:i.since??0,tiles:{...i.tiles??{}},history:{...i.history??{}}}})}#a(t){let e=this.#t.then(t);return this.#t=e.catch(()=>{}),e}save(t,{by:e=game.user.id,tiles:i,step:s=null,grid:r=null}){return this.#a(async()=>{let o=this.entry;if(!o)return!1;let a=Object.keys(i??{}).filter(d=>!r||ex(r,d));if(!a.length)return!1;let l=this.#r(t,e);if(!l){if(e!==game.user.id&&!game.user.isGM)return!1;let d=Object.fromEntries(a.filter(x=>i[x]).map(x=>[x,i[x]])),f=s?{[s.id]:{at:s.at,who:game.user.id,tiles:Object.fromEntries(a.map(x=>[x,null]))}}:{};return await o.createEmbeddedDocuments("JournalEntryPage",[{name:`chalk ${t} ${e}`,type:"text",text:{content:""},flags:{[j]:{chalk:{v:Xa,scene:t,by:e,since:s?.at??Date.now(),tiles:d,history:f}}}}],go()),!0}let c=l.getFlag(j,"chalk"),h={},u=`flags.${j}.chalk`;for(let d of a)i[d]?h[`${u}.tiles.${d}`]=i[d]:c.tiles?.[d]!==void 0&&Ws(h,`${u}.tiles`,d);if(s){let d={at:s.at,who:game.user.id,tiles:Object.fromEntries(a.map(f=>[f,c.tiles?.[f]??null]))};h[`${u}.history.${s.id}`]=d;for(let f of kf({...c.history??{},[s.id]:d},{protect:s.id}))Ws(h,`${u}.history`,f)}return await l.update(h,go()),!0})}tidy({now:t=Date.now(),hours:e=sx}={}){return!tn()||!this.entry?Promise.resolve({steps:0,pages:0}):this.#a(async()=>{let i=this.entry,s=t-e*3600*1e3,r=c=>{let h=game.scenes;return h?typeof h.get=="function"?!!h.get(c):[...h].some(u=>u.id===c):!0},o=`flags.${j}.chalk`,a=0,l=[];for(let c of[...i.pages??[]]){let h=c.getFlag(j,"chalk");if(!h)continue;if(h.v!==Xa||h.scene&&!r(h.scene)){l.push(c.id);continue}let u=kf(h.history,{before:s}),d=Object.keys(h.history??{}).length-u.length;if(!Object.keys(h.tiles??{}).length&&d<=0){l.push(c.id);continue}if(!u.length)continue;let f={};for(let x of u)Ws(f,`${o}.history`,x);await c.update(f,go()),a+=u.length}return l.length&&await i.deleteEmbeddedDocuments("JournalEntryPage",l,go()),{steps:a,pages:l.length}})}undo(t,{by:e=null}={}){return this.#a(async()=>{let s=this.#s(t).map(a=>{let l=a.getFlag(j,"chalk"),c=e?Object.fromEntries(Object.entries(l.history??{}).filter(([,h])=>h?.who===e)):l.history;return{by:l.by,history:c,page:a}}),r=nx(s);if(!r)return null;let o={};for(let a of s){let l=a.history?.[r.id];if(!l||!a.page.isOwner)continue;let c=`flags.${j}.chalk`,h=a.page.getFlag(j,"chalk"),u={};Ws(u,`${c}.history`,r.id);let d={};for(let[f,x]of Object.entries(l.tiles??{}))d[f]=h.tiles?.[f]??null,x?u[`${c}.tiles.${f}`]=x:h.tiles?.[f]!==void 0&&Ws(u,`${c}.tiles`,f);await a.page.update(u,go()),o[a.by]=d}return{id:r.id,layers:o}})}wipe(t,{by:e=null}={}){return game.user.isGM?this.#a(async()=>{for(let i of this.#s(t)){let s=i.getFlag(j,"chalk");if(e&&s?.by!==e)continue;let r=`flags.${j}.chalk`,o={};for(let a of Object.keys(s?.tiles??{}))Ws(o,`${r}.tiles`,a);for(let a of Object.keys(s?.history??{}))Ws(o,`${r}.history`,a);Object.keys(o).length&&await i.update(o,go())}}):Promise.resolve()}painters(t){return this.layers(t).filter(e=>Object.keys(e.tiles).length).map(e=>e.by)}onChange(t){return this.listeners.add(t),()=>this.listeners.delete(t)}#l(t,e=null){for(let i of this.listeners)i(t,e)}#c(t){if(t.parent?.id!==this.entry?.id)return;let e=t.getFlag(j,"chalk");if(e?.v!==Xa){this.#o();return}e?.scene&&this.#l(e.scene,e.by)}#h(t){t.getFlag(j,"chalk")===!0&&(this.#l(null),this.#o())}#o(){if(!tn()||!this.entry)return;let t=(this.entry.pages??[]).filter(e=>{let i=e.getFlag(j,"chalk");return i&&i.v!==Xa}).map(e=>e.id);t.length&&this.#a(()=>this.entry.deleteEmbeddedDocuments("JournalEntryPage",t)).catch(e=>{/does not exist/.test(e?.message??"")||console.warn(`${j} | could not remove old chalk pages`,e)})}#u(t){!tn()||!t?.id||this.#a(async()=>{let e=(this.entry?.pages??[]).filter(i=>i.getFlag(j,"chalk")?.scene===t.id).map(i=>i.id);e.length&&await this.entry.deleteEmbeddedDocuments("JournalEntryPage",e)}).catch(e=>{/does not exist/.test(e?.message??"")||console.warn(`${j} | could not clear the chalk of a deleted scene`,e)})}};function RT(n,t,{user:e=game.user,journal:i=game.journal}={}){if(e?.isGM||!t?.querySelectorAll)return 0;let s=i?.find(o=>o.getFlag(j,"chalk")===!0);if(!s)return 0;let r=[...t.querySelectorAll(`[data-entry-id="${s.id}"]`)];for(let o of r)o.remove();return r.length}function Dy(){Hooks.on("renderJournalDirectory",(n,t)=>RT(n,t))}var dp=new qa,fp={chalkStore:null};Hooks.once("init",()=>{Xp(),Ly(()=>ms.host),fp.chalkStore=new xo,Dy(),Iy(dp,{services:fp}),Hooks.callAll("stagecraft.init",{registerSkin:n=>dp.register(n)})});Hooks.once("ready",async()=>{let n=game.modules.get("stagecraft");n.api=ky({skins:dp,current:ms});try{xo.wanted()&&await xo.ensure()}catch(t){console.warn("stagecraft | could not make the chalk journal",t)}Hooks.callAll("stagecraft.ready",n.api),setTimeout(()=>fp.chalkStore?.tidy().catch(t=>console.warn("stagecraft | could not tidy the chalk journal",t)),8e3)});
/*! Bundled license information:

three/build/three.core.js:
three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2026 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
